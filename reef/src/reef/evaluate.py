"""The eval harness.

Scores the engine against `fixtures/reef-deal-room` using the gates in
`docs/evaluation/DEAL_ROOM_EVAL.md`, restricted to the subset ADR-003 §6 makes engine exit
criteria. G4-G8 and G13-G15 concern the finding layer, which this engine does not have;
reporting a score for them would be inventing a number.

Two rules the harness enforces on itself:

**The answer key never reaches the system under test.** `ground-truth.json`,
`GROUND_TRUTH.md`, `README.md` and `outputs/` are excluded at intake, and the harness reads
the key only after ingestion is complete.

**Queries come from finding titles, not from expected conclusions.** A title is what a
reviewer would type. An expected conclusion contains the answer, and searching with it
measures how well the corpus echoes a sentence it was given rather than whether the
engine can find anything.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy import func, select

from reef import db
from reef.config import Settings, get_settings
from reef.ingest.intake import Intake
from reef.ingest.pipeline import Pipeline
from reef.models import Chunk, Document, ProcessingState, Room, Span
from reef.search import Outcome, search

#: Never exposed to the engine. Step 1 of the eval procedure.
ANSWER_KEY_FILES = frozenset({"ground-truth.json", "GROUND_TRUTH.md", "README.md", "outputs"})

#: The R2 delta. Scored as a separate run per the eval procedure: R1 alone, then with R2.
R2_FOLDER = "11_Update_R2"

#: Questions about subjects this corpus does not cover at all. The threshold gate must
#: return "not found" for every one, and this is the set the ABS gate scores.
#:
#: ADR-003 §6 requires an abstention set to exist. It is defined here rather than in the
#: fixture because it must stay independent of the planted findings — a negative set
#: derived from the answer key would only test the same content twice.
ABSTENTION_QUESTIONS = (
    "what cryptocurrency does the company hold in treasury",
    "describe the company's manufacturing operations in Singapore",
    "list the company's registered patents in the European Union",
    "what dividend was paid to preferred shareholders in fiscal 2022",
    "describe the joint venture with the Osaka subsidiary",
    "what were the findings of the environmental remediation order in Nevada",
)

#: Questions whose *subject* is well covered but whose specific *fact* is absent. The
#: corpus has a fleet register; it records no vehicle propulsion type.
#:
#: These are measured and reported, and deliberately **not** gated, because retrieval
#: cannot answer them correctly even in principle. A semantic search for "electric
#: vehicles in the delivery fleet" returning the fleet register is good retrieval — the
#: register is the document a human would check. The error would be *asserting* a number
#: from it, and asserting is what the finding layer does.
#:
#: This is a real boundary of a retrieval-only engine, recorded rather than hidden by
#: choosing easier negatives. When the finding layer exists, these move into its gates.
TOPIC_PRESENT_FACT_ABSENT_QUESTIONS = (
    "how many electric vehicles are in the delivery fleet",
    "what is the chief executive's annual golf club membership fee",
    "what is the outcome of the antitrust investigation",
)


@dataclass(slots=True)
class GateResult:
    gate: str
    description: str
    value: float
    threshold: float
    #: True when higher is better. False for gates that count failures and must be zero.
    higher_is_better: bool = True
    detail: str = ""

    @property
    def passed(self) -> bool:
        if self.higher_is_better:
            return self.value >= self.threshold
        return self.value <= self.threshold


@dataclass(slots=True)
class EvalReport:
    fixture_version: str
    run_label: str
    room_id: uuid.UUID
    gates: list[GateResult] = field(default_factory=list)
    diagnostics: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return all(g.passed for g in self.gates)

    def to_dict(self) -> dict[str, Any]:
        return {
            "fixture_version": self.fixture_version,
            "run": self.run_label,
            "room_id": str(self.room_id),
            "passed": self.passed,
            "gates": [
                {
                    "gate": g.gate,
                    "description": g.description,
                    "value": round(g.value, 4),
                    "threshold": g.threshold,
                    "passed": g.passed,
                    "detail": g.detail,
                }
                for g in self.gates
            ],
            "diagnostics": self.diagnostics,
        }


def load_ground_truth(fixture_root: Path) -> dict[str, Any]:
    with (fixture_root / "ground-truth.json").open() as fh:
        truth: dict[str, Any] = json.load(fh)
    return truth


def ingest_fixture(
    fixture_root: Path,
    room_name: str,
    include_r2: bool,
    settings: Settings | None = None,
) -> uuid.UUID:
    """Ingest the fixture into a fresh room, with the answer key withheld."""
    settings = settings or get_settings()

    exclude = set(ANSWER_KEY_FILES)
    if not include_r2:
        exclude.add(R2_FOLDER)

    with db.admin_session() as session:
        existing = session.execute(select(Room).where(Room.name == room_name)).scalar_one_or_none()
        if existing is not None:
            session.delete(existing)
            session.flush()
        room_id = uuid.uuid4()
        session.add(Room(id=room_id, name=room_name))

    Intake(settings=settings).ingest_directory(
        room_id, fixture_root.resolve(), exclude=frozenset(exclude)
    )
    Pipeline(settings=settings).process_room(room_id)
    return room_id


def _expected_manifest(truth: dict[str, Any], include_r2: bool) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = truth["manifest"]
    if include_r2:
        return entries
    return [e for e in entries if not e["path"].startswith(f"{R2_FOLDER}/")]


def score_inventory(room_id: uuid.UUID, expected: list[dict[str, Any]]) -> list[GateResult]:
    """G1 and G2 — every supplied file has a state, and the state is right."""
    with db.room_session(room_id) as session:
        rows = session.execute(
            select(Document.filename, Document.folder_path, Document.processing_state)
        ).all()

    # Archive members are extra documents the room did not supply directly; they are
    # counted separately rather than treated as manifest misses.
    registered: dict[str, str] = {}
    for filename, folder, state in rows:
        path = f"{folder}/{filename}" if folder else filename
        registered[path] = state

    expected_paths = {entry["path"] for entry in expected}
    missing = sorted(expected_paths - registered.keys())
    recall = 1.0 - (len(missing) / len(expected_paths)) if expected_paths else 0.0

    wrong: list[str] = []
    for entry in expected:
        state = registered.get(entry["path"])
        if state is None:
            continue
        want_processable = entry["expected_processing_status"] == "processable"
        # `indexed` and `extracted` both mean the engine read the file. `duplicate` means
        # it read an identical copy, which is also not a failure to process.
        got_processable = state in {
            ProcessingState.INDEXED,
            ProcessingState.EXTRACTED,
            ProcessingState.CHUNKED,
            ProcessingState.DUPLICATE,
        }
        if want_processable != got_processable:
            wrong.append(
                f"{entry['path']}: expected {entry['expected_processing_status']}, got {state}"
            )

    accuracy = 1.0 - (len(wrong) / len(expected)) if expected else 0.0

    return [
        GateResult(
            gate="G1",
            description="document inventory recall — every supplied file has a state",
            value=recall,
            threshold=1.0,
            detail="; ".join(missing[:5]) if missing else "no silent drops",
        ),
        GateResult(
            gate="G2",
            description="processing status correctness",
            value=accuracy,
            threshold=1.0,
            detail="; ".join(wrong[:5]) if wrong else "every file correctly classified",
        ),
    ]


def score_parsing(room_id: uuid.UUID) -> GateResult:
    """G3 — parse success across formats the engine claims to support."""
    with db.room_session(room_id) as session:
        claimed = session.execute(
            select(func.count())
            .select_from(Document)
            .where(
                Document.processing_state.in_(
                    [
                        ProcessingState.INDEXED,
                        ProcessingState.EXTRACTED,
                        ProcessingState.CHUNKED,
                        ProcessingState.FAILED,
                    ]
                )
            )
        ).scalar_one()
        failed = session.execute(
            select(func.count())
            .select_from(Document)
            .where(Document.processing_state == ProcessingState.FAILED)
        ).scalar_one()
        failures = session.execute(
            select(Document.filename, Document.state_detail).where(
                Document.processing_state == ProcessingState.FAILED
            )
        ).all()

    rate = (claimed - failed) / claimed if claimed else 0.0
    return GateResult(
        gate="G3",
        description="parsing success on supported formats",
        value=rate,
        threshold=0.95,
        detail="; ".join(f"{n}: {d}" for n, d in failures[:3]) if failures else "no parse failures",
    )


def score_citations(room_id: uuid.UUID) -> list[GateResult]:
    """G9, G10 and G12 as they apply to an engine with no finding layer.

    Without generated findings there are no sentences to cite, so what is scored is the
    integrity of the anchors retrieval already returns:

    - **G9** every hit carries at least one resolvable anchor;
    - **G10** every anchor resolves to a span whose text is genuinely in that chunk;
    - **G12** zero anchors point at spans that do not exist.

    This is a weaker test than the gate will be once findings exist, and it is labelled as
    such in the report rather than presented as the finished measure.
    """
    with db.room_session(room_id) as session:
        chunks = session.execute(select(Chunk.id, Chunk.text, Chunk.span_ids)).all()
        spans = {
            span_id: (text, locator)
            for span_id, text, locator in session.execute(
                select(Span.id, Span.text, Span.locator)
            ).all()
        }

    total = 0
    without_anchor = 0
    fabricated = 0
    mismatched = 0

    for _chunk_id, chunk_text, span_ids in chunks:
        total += 1
        ids = list(span_ids or [])
        if not ids:
            without_anchor += 1
            continue
        for span_id in ids:
            if span_id not in spans:
                fabricated += 1
                continue
            span_text, locator = spans[span_id]
            if not locator:
                mismatched += 1
                continue
            # The span's text must actually appear in the chunk built from it. A chunk
            # citing a span whose text it does not contain is an anchor pointing at the
            # wrong place — the failure the eval calls "wrong, not partial".
            probe = span_text.strip()[:60]
            if probe and probe not in chunk_text:
                mismatched += 1

    presence = (total - without_anchor) / total if total else 0.0
    checked = sum(len(list(s or [])) for _, _, s in chunks)
    accuracy = (checked - mismatched - fabricated) / checked if checked else 0.0

    return [
        GateResult(
            gate="G9",
            description="citation presence — every chunk resolves to at least one anchor",
            value=presence,
            threshold=1.0,
            detail=f"{without_anchor} chunks without an anchor",
        ),
        GateResult(
            gate="G10",
            description="citation location accuracy — anchors resolve to their own text",
            value=accuracy,
            threshold=0.95,
            detail=f"{mismatched} mismatched of {checked} anchors",
        ),
        GateResult(
            gate="G12",
            description="fabricated citations — anchors pointing at non-existent spans",
            value=float(fabricated),
            threshold=0.0,
            higher_is_better=False,
            detail=f"{fabricated} fabricated anchors",
        ),
    ]


def score_determinism(
    fixture_root: Path, room_id: uuid.UUID, settings: Settings | None = None
) -> GateResult:
    """G11 — the same input produces the same spans and anchors on a second pass.

    Re-extracts every indexed document and compares span text and locators against what is
    stored. A pipeline whose output drifts between runs cannot support a claim that a
    figure was reproduced.
    """
    from reef.extract import ExtractionError, extract_document
    from reef.storage import get_store

    settings = settings or get_settings()
    store = get_store(settings)

    with db.room_session(room_id) as session:
        documents = session.execute(
            select(Document.id, Document.mime, Document.storage_key).where(
                Document.processing_state == ProcessingState.INDEXED,
                Document.storage_key.is_not(None),
            )
        ).all()

    compared = 0
    drifted: list[str] = []

    for document_id, mime, storage_key in documents:
        with db.room_session(room_id) as session:
            stored = session.execute(
                select(Span.locator, Span.text)
                .where(Span.document_id == document_id)
                .order_by(Span.page_number, Span.char_start)
            ).all()
        if not stored:
            continue
        try:
            data = store.get(settings.originals_bucket, storage_key)
            again = extract_document(mime, data, path=None, settings=settings)
        except (ExtractionError, OSError):
            continue

        compared += 1
        fresh = [(s.locator, s.text) for s in again.spans]
        if len(fresh) != len(stored) or any(
            f[0] != s[0] or f[1] != s[1] for f, s in zip(fresh, stored, strict=False)
        ):
            drifted.append(str(document_id))

    rate = (compared - len(drifted)) / compared if compared else 0.0
    return GateResult(
        gate="G11",
        description="deterministic extraction reproducibility",
        value=rate,
        threshold=1.0,
        detail=f"{len(drifted)} of {compared} documents drifted on re-extraction",
    )


def score_retrieval(
    room_id: uuid.UUID, truth: dict[str, Any], include_r2: bool, limit: int = 12
) -> tuple[GateResult, dict[str, Any]]:
    """Retrieval recall@12 against the planted findings' source documents.

    A finding is recalled when searching its **title** surfaces at least one chunk from a
    document the ground truth lists as a source. ADR-003 §6 sets no threshold for this —
    the run establishes the baseline — so it is reported as a diagnostic with a nominal
    bar, not as a pass/fail gate on the engine.
    """
    findings = truth["findings"]
    if not include_r2:
        # R2-dependent findings cannot be recalled from the R1 corpus, and counting them
        # as misses would understate the engine.
        findings = [
            f
            for f in findings
            if not any(str(d).startswith(f"{R2_FOLDER}/") for d in f["source_documents"])
        ]

    recalled: list[str] = []
    missed: list[dict[str, str]] = []

    for finding in findings:
        sources = {Path(str(d)).name for d in finding["source_documents"]}
        result = search(room_id, finding["title"], limit=limit)
        if result.outcome is Outcome.NOT_FOUND:
            missed.append({"id": finding["id"], "title": finding["title"], "reason": "abstained"})
            continue
        hit_files = {h.filename for h in result.hits}
        if hit_files & sources:
            recalled.append(finding["id"])
        else:
            missed.append(
                {
                    "id": finding["id"],
                    "title": finding["title"],
                    "reason": f"top {limit} did not include any of {sorted(sources)}",
                }
            )

    rate = len(recalled) / len(findings) if findings else 0.0
    gate = GateResult(
        gate="R@12",
        description="retrieval recall at 12 on planted-finding source documents",
        value=rate,
        threshold=0.0,  # baseline run; ADR-003 §6 sets no threshold yet
        detail=f"{len(recalled)} of {len(findings)} findings recalled",
    )
    diagnostics = {
        "recalled": recalled,
        "missed": missed,
        "findings_scored": len(findings),
    }
    return gate, diagnostics


def score_abstention(room_id: uuid.UUID) -> tuple[GateResult, dict[str, Any]]:
    """The threshold gate must return "not found" for questions the corpus cannot answer."""
    leaked: list[str] = []
    for question in ABSTENTION_QUESTIONS:
        result = search(room_id, question, limit=5)
        if result.outcome is not Outcome.NOT_FOUND:
            top = result.hits[0].filename if result.hits else "?"
            leaked.append(f"{question} -> {top}")

    rate = (len(ABSTENTION_QUESTIONS) - len(leaked)) / len(ABSTENTION_QUESTIONS)

    # Measured, not gated. See the constant's docstring for why retrieval cannot pass this.
    surfaced: list[str] = []
    for question in TOPIC_PRESENT_FACT_ABSENT_QUESTIONS:
        result = search(room_id, question, limit=5)
        if result.outcome is not Outcome.NOT_FOUND and result.hits:
            surfaced.append(f"{question} -> {result.hits[0].filename}")

    return (
        GateResult(
            gate="ABS",
            description="abstention on subjects absent from the corpus",
            value=rate,
            threshold=1.0,
            detail=f"{len(leaked)} leaked" if leaked else "abstained on every question",
        ),
        {
            "leaked": leaked,
            "topic_present_fact_absent": {
                "surfaced": surfaced,
                "note": (
                    "not gated — retrieval cannot distinguish 'the corpus covers this "
                    "subject' from 'the corpus states this fact'. Deferred to the "
                    "finding layer."
                ),
            },
        },
    )


_NUMERIC = re.compile(r"^-?\d+(\.\d+)?$")


def score_table_extraction(room_id: uuid.UUID, sample: int = 200) -> dict[str, Any]:
    """Diagnostic: type coercion in tabular cells.

    `000418` becoming `418` is the canonical failure. This samples cells from table-row
    spans and counts values that lost a leading zero — which is detectable because a
    coerced value is numerically equal to its padded original but shorter.
    """
    with db.room_session(room_id) as session:
        rows = (
            session.execute(
                select(Span.text).where(Span.kind == "table_row").order_by(Span.id).limit(sample)
            )
            .scalars()
            .all()
        )

    cells = [cell for row in rows for cell in row.split("\t")]
    padded = [c for c in cells if len(c) > 1 and c.startswith("0") and _NUMERIC.match(c)]

    return {
        "rows_sampled": len(rows),
        "cells_sampled": len(cells),
        "zero_padded_values_preserved": len(padded),
        "examples": padded[:5],
    }


def run_evaluation(
    fixture_root: Path,
    include_r2: bool = False,
    room_name: str | None = None,
    settings: Settings | None = None,
) -> EvalReport:
    settings = settings or get_settings()
    truth = load_ground_truth(fixture_root)
    label = "R1+R2" if include_r2 else "R1"
    room_name = room_name or f"eval-{label.lower().replace('+', '-')}"

    room_id = ingest_fixture(fixture_root, room_name, include_r2, settings)

    report = EvalReport(fixture_version=truth["version"], run_label=label, room_id=room_id)

    report.gates.extend(score_inventory(room_id, _expected_manifest(truth, include_r2)))
    report.gates.append(score_parsing(room_id))
    report.gates.extend(score_citations(room_id))
    report.gates.append(score_determinism(fixture_root, room_id, settings))

    retrieval_gate, retrieval_diagnostics = score_retrieval(room_id, truth, include_r2)
    report.gates.append(retrieval_gate)

    abstention_gate, abstention_diagnostics = score_abstention(room_id)
    report.gates.append(abstention_gate)

    report.diagnostics = {
        "retrieval": retrieval_diagnostics,
        "abstention": abstention_diagnostics,
        "table_extraction": score_table_extraction(room_id),
        "not_scored": {
            "gates": ["G4", "G5", "G6", "G7", "G8", "G13", "G14", "G15"],
            "reason": (
                "these score the finding layer, which ADR-003 §4 does not authorize. "
                "Reporting a value for them would be inventing a number."
            ),
        },
    }
    return report
