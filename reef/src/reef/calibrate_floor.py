"""The calibration procedure: fit an abstention floor to a model and record the evidence.

Kept separate from `calibration.py` — that module reads records at request time and must
stay cheap and dependency-light; this one runs offline against a live room.

The method is deliberately simple and stated in the record it produces, because a floor
whose derivation nobody can reconstruct is a magic number with better documentation.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select

from reef.calibration import Calibration, ScoreRange
from reef.config import Settings, get_settings
from reef.db import admin_session, room_session
from reef.models import Room
from reef.models_gateway import get_embedder
from reef.provenance import PIPELINE_VERSION
from reef.search import _lexical_arm, _vector_arm

#: Questions the corpus can answer. Chosen to span formats and folders rather than to
#: flatter the retriever: a contract clause, a covenant ratio, a CSV aging bucket, an XLSX
#: roster, a Q&A row.
ANSWERABLE_QUERIES = (
    "no single customer exceeds 11% of revenue",
    "change of control consent required by customer",
    "covenant compliance fixed charge coverage ratio",
    "accounts receivable aging over 90 days",
    "employee roster headcount",
    "largest customer share of FY2025 revenue",
    "supplier distribution agreement pricing terms",
    "insurance certificate coverage limits",
    "capital expenditure register additions",
    "owner compensation adjustment",
)

#: Subjects the corpus does not cover at all. Kept disjoint from the planted findings so
#: the negative set tests a different thing from the recall set rather than the same
#: content twice.
NEGATIVE_QUERIES = (
    "what cryptocurrency does the company hold in treasury",
    "describe the company's manufacturing operations in Singapore",
    "list the company's registered patents in the European Union",
    "what dividend was paid to preferred shareholders in fiscal 2022",
    "describe the joint venture with the Osaka subsidiary",
    "what were the findings of the environmental remediation order in Nevada",
)

#: Fraction of the observed gap to sit above the strongest negative.
#:
#: 0.5 puts the floor at the midpoint of the separation band. Not tuned — the midpoint is
#: the choice that makes no assumption about which error is worse, and choosing it by
#: search over the fixture's own recall would be fitting the gate to the answer key.
GAP_POSITION = 0.5


@dataclass(slots=True)
class CalibrationSample:
    query: str
    best_similarity: float
    lexical_hits: int


def _sample(
    room_id: uuid.UUID, queries: tuple[str, ...], settings: Settings
) -> list[CalibrationSample]:
    embedder = get_embedder(settings)
    out: list[CalibrationSample] = []
    for query in queries:
        with room_session(room_id) as session:
            vectors = _vector_arm(session, query, 50, embedder)
            lexical = _lexical_arm(session, query, 50)
        out.append(
            CalibrationSample(
                query=query,
                best_similarity=max((s for _, s in vectors), default=0.0),
                lexical_hits=len(lexical),
            )
        )
    return out


def calibrate(
    heldout_queries: tuple[str, ...],
    room_name: str,
    fixture_name: str,
    fixture_version: str,
    fixture_corpus_sha256: str,
    settings: Settings | None = None,
) -> tuple[Calibration, list[CalibrationSample], list[CalibrationSample], list[CalibrationSample]]:
    """Fit a floor for the configured model against a live room, and record the evidence."""
    settings = settings or get_settings()
    embedder = get_embedder(settings)

    with admin_session() as session:
        room_id = session.execute(select(Room.id).where(Room.name == room_name)).scalar_one()

    answerable = _sample(room_id, ANSWERABLE_QUERIES, settings)
    negative = _sample(room_id, NEGATIVE_QUERIES, settings)
    # Measured after the floor is placed, never used to place it.
    heldout = _sample(room_id, heldout_queries, settings)

    answerable_scores = [s.best_similarity for s in answerable]
    negative_scores = [s.best_similarity for s in negative]

    answerable_range = ScoreRange.of(answerable_scores)
    negative_range = ScoreRange.of(negative_scores)
    separation = answerable_range.minimum - negative_range.maximum

    limitations = [
        f"Fitted on one synthetic fixture ({fixture_name} {fixture_version}) with "
        f"{len(answerable)} answerable and {len(negative)} negative queries. That is a small "
        "sample and a single corpus; it does not establish the floor for real packages.",
        "Queries were written by the same party that built the engine and the fixture. "
        "An independent cold-run reviewer has not yet confirmed the sets are fair.",
        "The floor is valid only for the embedding model named in this record. Applying it "
        "to any other model is the defect this contract exists to prevent.",
    ]

    if separation <= 0:
        # No floor separates the two sets. Say so rather than picking a number that looks
        # decisive; a floor fitted to an overlapping distribution is a coin flip with a
        # confidence interval printed on it.
        floor = negative_range.maximum
        limitations.insert(
            0,
            "NO SEPARATION: the weakest answerable query scored at or below the strongest "
            f"negative ({answerable_range.minimum:.4f} vs {negative_range.maximum:.4f}). "
            "No floor can separate these sets on this data; the recorded value is the "
            "negative maximum and abstention should not be relied upon.",
        )
    else:
        floor = negative_range.maximum + separation * GAP_POSITION

    heldout_range = ScoreRange.of([s.best_similarity for s in heldout])
    heldout_leaks = sum(1 for s in heldout if s.best_similarity >= floor or s.lexical_hits)
    if heldout_leaks:
        limitations.insert(
            0,
            f"DOES NOT GENERALISE: {heldout_leaks} of {len(heldout)} held-out negatives "
            f"score at or above the fitted floor (held-out range "
            f"{heldout_range.minimum:.4f}-{heldout_range.maximum:.4f} against an answerable "
            f"minimum of {answerable_range.minimum:.4f}). The distributions overlap, so no "
            "floor separates them. Raising the floor to reject these would reject real "
            "answerable queries. Retrieval-only abstention cannot distinguish 'the corpus "
            "covers this subject' from 'the corpus states this fact'; that separation "
            "belongs to a findings layer.",
        )

    calibration = Calibration(
        embedding_model=embedder.model_id,
        embedding_dimension=embedder.dimensions,
        similarity_metric="cosine",
        similarity_floor=round(floor, 4),
        pipeline_version=PIPELINE_VERSION,
        fixture_name=fixture_name,
        fixture_version=fixture_version,
        fixture_corpus_sha256=fixture_corpus_sha256,
        calibrated_at=datetime.now(UTC).isoformat(timespec="seconds"),
        answerable=answerable_range,
        negative=negative_range,
        heldout_negative=heldout_range,
        heldout_leaks=heldout_leaks,
        method=(
            "Best cosine similarity of the top vector hit was recorded for each query in "
            "two disjoint sets: questions the corpus answers, and questions about subjects "
            "it does not cover. The floor sits at the midpoint of the gap between the "
            "weakest answerable score and the strongest negative score "
            f"(GAP_POSITION={GAP_POSITION}). The midpoint is chosen because it assumes "
            "nothing about which error is worse; it was not selected by searching for the "
            "value that maximises fixture recall, which would fit the gate to the answer key."
        ),
        limitations=limitations,
    )
    return calibration, answerable, negative, heldout
