"""The model gateway.

`docs/reef/05-architecture.md` principle 3: "Every model call goes through one router. No
provider SDK is imported anywhere but there. Model quality resets every six months and
Reef must be able to take the upgrade in an afternoon."

That rule is enforced by convention here and by a test that greps the tree for provider
imports outside this module. Under ADR-003 the only registered provider is a local
encoder, because engine work may not send document content anywhere.

Every embedding carries the id of the model that produced it. Vectors from different
models are not comparable, and a corpus that mixes them without recording which is which
cannot be re-embedded safely or audited at all.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from reef.config import Settings, get_settings


@dataclass(frozen=True, slots=True)
class EmbeddingBatch:
    vectors: list[list[float]]
    #: Stored on every row alongside the vector. Not decorative — it is the only thing
    #: that makes a later re-embedding auditable.
    model_id: str
    dimensions: int


class Embedder(Protocol):
    @property
    def model_id(self) -> str: ...

    @property
    def dimensions(self) -> int: ...

    def embed(self, texts: list[str], is_query: bool = False) -> EmbeddingBatch: ...


class LocalEmbedder:
    """Sentence-transformers, running in-process.

    Local by default because ADR-003 §4 confines the engine to fixture data and forbids
    sending document content to a third party. It is also the reproducible choice: a
    hosted embedding endpoint can change its weights without changing its name, which
    would silently invalidate every stored vector.
    """

    def __init__(self, model_name: str, expected_dimensions: int) -> None:
        from sentence_transformers import SentenceTransformer

        self._model_name = model_name
        self._model = SentenceTransformer(model_name)
        actual = int(self._model.get_sentence_embedding_dimension() or 0)
        if actual != expected_dimensions:
            # The vector column has a fixed width. Discovering a mismatch at insert time
            # produces an opaque database error thousands of chunks into a run.
            raise ValueError(
                f"{model_name} produces {actual}-dimensional vectors but the schema "
                f"expects {expected_dimensions}; a migration is required to change it"
            )
        self._dimensions = actual

    @property
    def model_id(self) -> str:
        return self._model_name

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, texts: list[str], is_query: bool = False) -> EmbeddingBatch:
        if not texts:
            return EmbeddingBatch(vectors=[], model_id=self.model_id, dimensions=self._dimensions)

        prepared = texts
        if is_query and "bge" in self._model_name.lower():
            # BGE models are trained with an asymmetric instruction prefix on queries only.
            # Omitting it costs several points of retrieval quality; applying it to stored
            # passages as well costs about as much in the other direction.
            prepared = [
                f"Represent this sentence for searching relevant passages: {t}" for t in texts
            ]

        vectors = self._model.encode(
            prepared,
            batch_size=32,
            show_progress_bar=False,
            # Normalised, so cosine distance and inner product agree and the pgvector
            # index operator can be chosen freely later.
            normalize_embeddings=True,
        )
        return EmbeddingBatch(
            vectors=[[float(v) for v in row] for row in vectors],
            model_id=self.model_id,
            dimensions=self._dimensions,
        )


class NullEmbedder:
    """Used when embedding is disabled. Search falls back to lexical only.

    Explicitly present rather than implied by a None, so the "no vectors" path is a
    supported configuration with a name instead of a series of null checks.
    """

    @property
    def model_id(self) -> str:
        return "none"

    @property
    def dimensions(self) -> int:
        return 0

    def embed(self, texts: list[str], is_query: bool = False) -> EmbeddingBatch:
        return EmbeddingBatch(vectors=[], model_id="none", dimensions=0)


_cache: dict[str, Embedder] = {}


def get_embedder(settings: Settings | None = None) -> Embedder:
    settings = settings or get_settings()
    if settings.embedding_provider == "none":
        return NullEmbedder()

    key = f"{settings.embedding_provider}:{settings.embedding_model}"
    if key not in _cache:
        _cache[key] = LocalEmbedder(settings.embedding_model, settings.embedding_dim)
    return _cache[key]
