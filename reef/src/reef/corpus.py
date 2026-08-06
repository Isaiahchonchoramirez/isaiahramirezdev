"""The embedding compatibility contract between a query and a room's stored vectors.

Cosine distance between two vectors is only meaningful if the same model produced both.
Nothing in Postgres enforces that: `pgvector` compares any two vectors of equal width, and
`all-MiniLM-L6-v2` and `bge-small-en-v1.5` are both 384-dimensional. Swapping the model
therefore produced no error anywhere — the query simply started comparing against vectors
from a different space.

Measured consequence on the Ridgeline corpus: querying a MiniLM-indexed room with bge
vectors abstained on **19 of 19** answerable questions. The engine reported "not found in
this corpus" for content that was demonstrably present. It did not fabricate, but a silent
omission is the exact failure gates G1 and G2 exist to prevent, and it is worse than an
error because nothing announces it.

Equal dimension is not compatibility. This module makes that structural: every vector
search resolves the room's stored model first and refuses to proceed unless it matches.
Nothing here re-embeds anything — re-indexing is an explicit operation, never a silent
side effect of a search.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy import text
from sqlalchemy.orm import Session


class CorpusState(StrEnum):
    #: Every embedded chunk uses one model, and it is the model being queried.
    COMPATIBLE = "compatible"
    #: No chunk carries a vector. Lexical search still works; vector search has nothing to
    #: compare against. Not an error.
    UNINDEXED = "unindexed"
    #: One stored model, and it is not the query model.
    MODEL_MISMATCH = "model_mismatch"
    #: More than one stored model. A re-index is in progress or was interrupted; the room
    #: is not internally comparable, let alone comparable to a query.
    MIXED_MODELS = "mixed_models"
    #: A vector exists whose producing model was not recorded. Prevented by a check
    #: constraint since the evidence schema shipped, so this can only appear on rows
    #: predating it. Unusable either way: an unattributed vector cannot be compared.
    UNATTRIBUTED_VECTORS = "unattributed_vectors"


@dataclass(frozen=True, slots=True)
class CorpusEmbedding:
    """What a room actually contains, as opposed to what the configuration claims."""

    state: CorpusState
    #: Every distinct `embed_model` present, sorted. Empty when unindexed.
    stored_models: tuple[str, ...]
    embedded_chunks: int
    total_chunks: int
    unattributed_chunks: int
    query_model: str

    @property
    def stored_model(self) -> str | None:
        """The single stored model, when there is exactly one."""
        return self.stored_models[0] if len(self.stored_models) == 1 else None

    @property
    def is_searchable_by_vector(self) -> bool:
        return self.state is CorpusState.COMPATIBLE

    def to_dict(self) -> dict[str, object]:
        return {
            "state": str(self.state),
            "stored_models": list(self.stored_models),
            "query_model": self.query_model,
            "embedded_chunks": self.embedded_chunks,
            "total_chunks": self.total_chunks,
            "unattributed_chunks": self.unattributed_chunks,
        }

    def remediation(self) -> str:
        """What an operator must actually do. Named explicitly rather than implied."""
        if self.state is CorpusState.COMPATIBLE:
            return ""
        if self.state is CorpusState.UNINDEXED:
            return "Ingest or re-process this room so its chunks carry vectors."
        if self.state is CorpusState.MODEL_MISMATCH:
            return (
                f"Re-index this room with {self.query_model!r}, or query it with "
                f"{self.stored_model!r} by setting REEF_EMBEDDING_MODEL. Vectors are not "
                "re-embedded automatically."
            )
        if self.state is CorpusState.MIXED_MODELS:
            return (
                "Re-index the whole room with one model. It currently holds vectors from "
                f"{len(self.stored_models)} models ({', '.join(self.stored_models)}), which "
                "are not comparable to each other."
            )
        return (
            f"Re-index this room. {self.unattributed_chunks} vectors have no recorded "
            "model and cannot be compared to anything."
        )


class EmbeddingIncompatible(RuntimeError):
    """Raised instead of returning results that would be silently meaningless.

    A hard failure rather than a warning, because the failure it replaces was invisible:
    a mismatched search returns a plausible-looking empty result, and an operator has no
    way to tell that apart from a corpus that genuinely lacks the answer.
    """

    def __init__(self, corpus: CorpusEmbedding) -> None:
        self.corpus = corpus
        self.state = corpus.state
        self.stored_models = corpus.stored_models
        self.query_model = corpus.query_model
        self.remediation_text = corpus.remediation()

        stored = ", ".join(corpus.stored_models) or "none"
        super().__init__(
            f"embedding contract violated ({corpus.state}): this room stores vectors from "
            f"[{stored}] but the query embedder is {corpus.query_model!r}. "
            "Equal vector dimension is not compatibility — cosine distance between vectors "
            f"from different models is meaningless. {self.remediation_text}"
        )


_INSPECT_SQL = text(
    """
    SELECT
        count(*)                                                  AS total,
        count(*) FILTER (WHERE embedding IS NOT NULL)             AS embedded,
        count(*) FILTER (WHERE embedding IS NOT NULL
                           AND embed_model IS NULL)               AS unattributed
    FROM chunk
    """
)

_MODELS_SQL = text(
    "SELECT DISTINCT embed_model FROM chunk "
    "WHERE embedding IS NOT NULL AND embed_model IS NOT NULL ORDER BY 1"
)


def classify(
    *,
    embedded_chunks: int,
    unattributed_chunks: int,
    stored_models: tuple[str, ...],
    query_model: str,
) -> CorpusState:
    """Decide the corpus state from counts alone.

    Pure, and separate from the query that gathers the counts, so every branch — including
    `UNATTRIBUTED_VECTORS`, which a check constraint makes unreachable for new rows — can
    be tested without contriving a database state that the schema forbids.
    """
    if unattributed_chunks:
        return CorpusState.UNATTRIBUTED_VECTORS
    if not embedded_chunks:
        return CorpusState.UNINDEXED
    if len(stored_models) > 1:
        return CorpusState.MIXED_MODELS
    if stored_models[0] != query_model:
        return CorpusState.MODEL_MISMATCH
    return CorpusState.COMPATIBLE


def inspect_corpus(session: Session, query_model: str) -> CorpusEmbedding:
    """Resolve what a room stores and whether it can answer a query from `query_model`.

    Runs inside the caller's room-scoped session, so row-level security confines it to one
    room without the query needing to say so.
    """
    total, embedded, unattributed = session.execute(_INSPECT_SQL).one()
    models = tuple(session.execute(_MODELS_SQL).scalars().all())

    state = classify(
        embedded_chunks=int(embedded),
        unattributed_chunks=int(unattributed),
        stored_models=models,
        query_model=query_model,
    )

    return CorpusEmbedding(
        state=state,
        stored_models=models,
        embedded_chunks=int(embedded),
        total_chunks=int(total),
        unattributed_chunks=int(unattributed),
        query_model=query_model,
    )


def require_compatible(session: Session, query_model: str) -> CorpusEmbedding:
    """Inspect and raise unless the room can be searched by vector with this model.

    `UNINDEXED` is permitted and returned: a room with no vectors is a legitimate state,
    and lexical search over it is honest. Every other non-compatible state raises.
    """
    corpus = inspect_corpus(session, query_model)
    if corpus.state in (CorpusState.COMPATIBLE, CorpusState.UNINDEXED):
        return corpus
    raise EmbeddingIncompatible(corpus)
