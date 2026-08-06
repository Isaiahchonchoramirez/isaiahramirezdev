"""Hybrid retrieval with an abstention gate.

`docs/reef/05-architecture.md`: "The threshold gate is the most important component in the
system and the one most likely to get quietly weakened to improve a demo. Its threshold is
a tested constant with a named owner, and the eval suite contains questions whose answers
were deliberately removed from the corpus. Those questions must return 'not found.'"

So `NOT_FOUND` is a result type, not an exception and not an empty list. An empty list is
indistinguishable from a bug; a named result is a claim the system is making, and one the
eval can score.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import StrEnum

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from reef.config import Settings, get_settings
from reef.db import room_session
from reef.models_gateway import Embedder, get_embedder

#: Reciprocal rank fusion constant. 60 is the value from the original RRF paper and is
#: deliberately not tuned against the fixture — a fusion constant fitted to 22 planted
#: findings would be overfitting to the answer key rather than measuring retrieval.
RRF_K = 60

#: Minimum cosine similarity for the best semantic match before the corpus is considered
#: to contain an answer.
#:
#: The gate reads absolute similarity, not the fused score, and that distinction is the
#: whole point. Reciprocal rank fusion is rank-based, so it throws away the one number
#: that says whether anything actually matched: a vector search always returns its top-k,
#: and its worst-ever result still ranks first among them. Gating on the fused score
#: therefore scores "best of a bad lot" identically to a real hit — measured, not assumed,
#: after an earlier rank-based gate admitted every nonsense query put to it.
#:
#: Calibration on this corpus: five answerable questions scored 0.4855-0.6675 and five
#: unanswerable ones scored 0.2934-0.3645. 0.42 sits in the middle of that gap.
#:
#: **This number is provisional and under-evidenced.** Ten hand-written queries is not a
#: calibration set. The abstention set required by ADR-003 §6 — questions whose answers
#: were deliberately removed from the corpus — is what should set it, and this constant
#: must be re-derived when that set exists. Owned by the engine owner named in ADR-003 §4.
#: Lowering it raises recall and is the easiest way to make a demo look better and the
#: product worse, so a change needs a recorded reason and a rerun of the abstention set.
SIMILARITY_FLOOR = 0.42


class Outcome(StrEnum):
    FOUND = "found"
    #: A result, not an error. The corpus was searched and does not contain an answer.
    NOT_FOUND = "not_found_in_corpus"


@dataclass(slots=True)
class SearchHit:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    folder_path: str
    breadcrumb: str
    text: str
    score: float
    #: Present when the chunk was retrieved by that arm; None when it was not. Keeping
    #: both makes it possible to see which arm is carrying a query.
    vector_rank: int | None
    lexical_rank: int | None
    span_ids: list[uuid.UUID] = field(default_factory=list)
    locators: list[str] = field(default_factory=list)
    page_numbers: list[int] = field(default_factory=list)


@dataclass(slots=True)
class SearchResult:
    outcome: Outcome
    hits: list[SearchHit]
    query: str
    #: Why the gate abstained, when it did. Shown to the user rather than swallowed —
    #: "nothing scored above the floor" is useful; a blank screen is not.
    detail: str = ""


_VECTOR_SQL = text(
    """
    SELECT c.id, c.document_id, c.breadcrumb, c.text, c.span_ids,
           1 - (c.embedding <=> CAST(:query_vector AS vector)) AS similarity
    FROM chunk c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> CAST(:query_vector AS vector)
    LIMIT :limit
    """
)

_LEXICAL_SQL = text(
    """
    SELECT c.id, c.document_id, c.breadcrumb, c.text, c.span_ids,
           ts_rank_cd(to_tsvector('english', c.text),
                      websearch_to_tsquery('english', :query)) AS rank
    FROM chunk c
    WHERE to_tsvector('english', c.text) @@ websearch_to_tsquery('english', :query)
    ORDER BY rank DESC
    LIMIT :limit
    """
)


def search(
    room_id: uuid.UUID,
    query: str,
    limit: int = 12,
    candidates: int = 50,
    settings: Settings | None = None,
    embedder: Embedder | None = None,
    similarity_floor: float = SIMILARITY_FLOOR,
) -> SearchResult:
    settings = settings or get_settings()
    query = query.strip()
    if not query:
        return SearchResult(outcome=Outcome.NOT_FOUND, hits=[], query=query, detail="empty query")

    embedder = embedder or get_embedder(settings)

    with room_session(room_id) as session:
        vector_rows = _vector_arm(session, query, candidates, embedder)
        lexical_rows = _lexical_arm(session, query, candidates)

        if not vector_rows and not lexical_rows:
            return SearchResult(
                outcome=Outcome.NOT_FOUND,
                hits=[],
                query=query,
                detail="no chunk matched lexically or semantically",
            )

        best_similarity = max((sim for _, sim in vector_rows), default=0.0)
        # A lexical hit means every term in the query appears in one chunk, because
        # `websearch_to_tsquery` ANDs bare terms. On a multi-word question that is strong
        # independent evidence, and it is what keeps exact-phrase lookups working when the
        # encoder is weak on rare identifiers like "OP-2024-11687".
        has_lexical = bool(lexical_rows)

        if best_similarity < similarity_floor and not has_lexical:
            # Checked on the best hit rather than the mean. A query with one weak match
            # and eleven irrelevant ones should abstain, and averaging would let the
            # eleven drag an already-weak best result across the line.
            return SearchResult(
                outcome=Outcome.NOT_FOUND,
                hits=[],
                query=query,
                detail=(
                    f"best semantic similarity {best_similarity:.4f} is below the "
                    f"{similarity_floor:.2f} floor and no chunk contains every query term"
                ),
            )

        fused = _fuse(vector_rows, lexical_rows)
        top = fused[:limit]
        hits = _hydrate(session, top)

    return SearchResult(outcome=Outcome.FOUND, hits=hits, query=query)


def _vector_arm(
    session: Session, query: str, limit: int, embedder: Embedder
) -> list[tuple[uuid.UUID, float]]:
    if embedder.dimensions == 0:
        return []
    batch = embedder.embed([query], is_query=True)
    if not batch.vectors:
        return []
    vector = "[" + ",".join(f"{v:.8f}" for v in batch.vectors[0]) + "]"
    rows = session.execute(_VECTOR_SQL, {"query_vector": vector, "limit": limit}).all()
    return [(row[0], float(row[5])) for row in rows]


def _lexical_arm(session: Session, query: str, limit: int) -> list[tuple[uuid.UUID, float]]:
    # `websearch_to_tsquery` rather than `plainto_tsquery`: it accepts quoted phrases and
    # `or`, which is what a reviewer types, and it never raises on punctuation the way
    # `to_tsquery` does.
    rows = session.execute(_LEXICAL_SQL, {"query": query, "limit": limit}).all()
    return [(row[0], float(row[5])) for row in rows]


def _fuse(
    vector_rows: list[tuple[uuid.UUID, float]],
    lexical_rows: list[tuple[uuid.UUID, float]],
) -> list[tuple[uuid.UUID, float, int | None, int | None]]:
    """Reciprocal rank fusion.

    Rank-based rather than score-based because cosine similarity and `ts_rank_cd` are not
    on comparable scales, and normalising them against each other requires knowing the
    distribution of both — which changes per corpus. RRF needs only the ordering.
    """
    scores: dict[uuid.UUID, float] = {}
    vector_ranks: dict[uuid.UUID, int] = {}
    lexical_ranks: dict[uuid.UUID, int] = {}

    for rank, (chunk_id, _) in enumerate(vector_rows, start=1):
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (RRF_K + rank)
        vector_ranks[chunk_id] = rank

    for rank, (chunk_id, _) in enumerate(lexical_rows, start=1):
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (RRF_K + rank)
        lexical_ranks[chunk_id] = rank

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [
        (chunk_id, score, vector_ranks.get(chunk_id), lexical_ranks.get(chunk_id))
        for chunk_id, score in ordered
    ]


_HYDRATE_SQL = text(
    """
    SELECT c.id, c.document_id, c.breadcrumb, c.text, c.span_ids,
           d.filename, d.folder_path
    FROM chunk c
    JOIN document d ON d.id = c.document_id
    WHERE c.id IN :chunk_ids
    """
).bindparams(bindparam("chunk_ids", expanding=True))

_SPAN_SQL = text(
    """
    SELECT id, locator, page_number FROM span WHERE id IN :span_ids
    """
).bindparams(bindparam("span_ids", expanding=True))


def _hydrate(
    session: Session, ranked: list[tuple[uuid.UUID, float, int | None, int | None]]
) -> list[SearchHit]:
    """Attach document and span detail to ranked ids.

    Every hit carries its locators, because a search result the user cannot trace back to
    a page is the thing Reef exists not to produce.
    """
    ids = [chunk_id for chunk_id, _, _, _ in ranked]
    rows = {row[0]: row for row in session.execute(_HYDRATE_SQL, {"chunk_ids": ids}).all()}

    span_ids = {span_id for row in rows.values() for span_id in (row[4] or [])}
    spans = {}
    if span_ids:
        spans = {
            row[0]: (row[1], row[2])
            for row in session.execute(_SPAN_SQL, {"span_ids": list(span_ids)}).all()
        }

    hits: list[SearchHit] = []
    for chunk_id, score, vector_rank, lexical_rank in ranked:
        row = rows.get(chunk_id)
        if row is None:  # pragma: no cover - deleted between query and hydrate
            continue
        chunk_span_ids = list(row[4] or [])
        locators = [spans[s][0] for s in chunk_span_ids if s in spans]
        pages = sorted({spans[s][1] for s in chunk_span_ids if s in spans})
        hits.append(
            SearchHit(
                chunk_id=chunk_id,
                document_id=row[1],
                filename=row[5],
                folder_path=row[6],
                breadcrumb=row[2],
                text=row[3],
                score=score,
                vector_rank=vector_rank,
                lexical_rank=lexical_rank,
                span_ids=chunk_span_ids,
                locators=locators,
                page_numbers=pages,
            )
        )
    return hits
