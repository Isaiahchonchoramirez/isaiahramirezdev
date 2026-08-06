"""Runtime configuration.

Every value has a default that works against a local Postgres, so a fresh clone runs
without a `.env`. Secrets are the exception and are never defaulted to a real value.

**This module is the single source of truth for the embedding identity.** `.env.example`
is generated from these defaults and a test asserts the two agree, because they silently
disagreed once and the consequence was a benchmark that documented one model while
measuring another. `configuration_sources()` reports where each resolved value came from
so a run can never be attributed to the wrong configuration again.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

EmbeddingProvider = Literal["local", "none"]
OcrProvider = Literal["tesseract", "none"]
StorageBackend = Literal["filesystem", "s3"]

#: The canonical embedding model. One place, referenced everywhere.
#:
#: Chosen over `sentence-transformers/all-MiniLM-L6-v2` on a criterion that has nothing to
#: do with retrieval scores: **its context window is large enough for the chunks Reef
#: produces.** MiniLM accepts 256 tokens against a 500-token chunk ceiling. Measured on the
#: Ridgeline R1 corpus, that truncates 15 of 862 chunks and silently discards 14.2% of all
#: indexed text — and a truncated chunk still claims provenance over spans whose text never
#: reached the model, which is precisely the failure `ingest/chunk.py` was sized to prevent.
#: bge-small accepts 512 and truncates nothing.
#:
#: Secondary, and deliberately not decisive: it encoded the same batch in 0.16s against
#: MiniLM's 0.37s, at 269 MB on disk against 183 MB. Both are 384-dimensional, which is
#: exactly why swapping them went unnoticed — pgvector accepts either without complaint.
#:
#: Changing this value invalidates every stored vector and every calibration keyed to the
#: old model. Re-index and re-calibrate; the compatibility check in `corpus.py` will refuse
#: to search until you do.
CANONICAL_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
CANONICAL_EMBEDDING_DIM = 384
#: What the encoder actually accepts. Chunk sizes derive from this rather than being chosen
#: independently — see `ingest/chunk.py` for why that ordering matters.
CANONICAL_EMBEDDING_MAX_TOKENS = 512


@dataclass(frozen=True, slots=True)
class SettingSource:
    """Where a resolved setting came from, so a run is attributable to a configuration."""

    field: str
    value: str
    #: "environment", "dotenv", or "default".
    origin: str
    detail: str = ""

    @property
    def is_override(self) -> bool:
        return self.origin != "default"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="REEF_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://reef_app:reef_app@localhost:5432/reef"
    migration_database_url: str = "postgresql+psycopg://reef:reef@localhost:5432/reef"

    # Object storage is an interface with two implementations. `filesystem` is the local
    # default and needs no daemon; `s3` is what deployed environments use. Nothing above
    # the storage module knows which is active — keys are opaque strings either way.
    storage_backend: StorageBackend = "filesystem"
    storage_root: Path = Path(".reef-storage")

    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"
    originals_bucket: str = "reef-originals"
    renders_bucket: str = "reef-renders"

    # Intake limits. A ZIP that expands to 400x its compressed size is not a document
    # package, and finding that out by filling the disk is the expensive way.
    max_file_bytes: int = 500 * 1024 * 1024
    max_archive_entries: int = 20_000
    max_archive_expanded_bytes: int = 5 * 1024 * 1024 * 1024
    max_archive_depth: int = 3

    embedding_provider: EmbeddingProvider = "local"
    embedding_model: str = CANONICAL_EMBEDDING_MODEL
    embedding_dim: int = CANONICAL_EMBEDDING_DIM
    embedding_max_tokens: int = CANONICAL_EMBEDDING_MAX_TOKENS

    #: Whether search may run against an embedding model that has no calibration record.
    #:
    #: Default off. An uncalibrated model has no evidence behind its abstention floor, and
    #: a floor calibrated for one model is meaningless for another — measured: the floor
    #: fitted to MiniLM admitted every negative query under bge-small. Turning this on is a
    #: development convenience; results come back labelled `uncalibrated` and abstention
    #: metrics from such a run must not be reported as passed.
    allow_uncalibrated_search: bool = False

    ocr_provider: OcrProvider = "none"
    # A text layer this sparse relative to page area is treated as absent rather than
    # trusted. See extract/pdf.py for why a bad text layer is worse than none.
    ocr_min_chars_per_page: int = 80

    # Chunking. Sized to the encoder, not to the 800/1500 in
    # docs/reef/05-architecture.md — a chunk larger than the model's window is truncated
    # at embed time while still claiming provenance over the text that never reached it.
    chunk_target_tokens: int = 420
    chunk_max_tokens: int = 500
    chunk_section_overlap_ratio: float = Field(default=0.15, ge=0.0, le=0.5)

    log_level: str = "INFO"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


#: Fields whose value changes what a benchmark or an eval result means. Reported by
#: `reef config` and embedded in every benchmark record, because a number without the
#: configuration that produced it is not reproducible.
IDENTITY_FIELDS = (
    "embedding_provider",
    "embedding_model",
    "embedding_dim",
    "embedding_max_tokens",
    "allow_uncalibrated_search",
    "chunk_target_tokens",
    "chunk_max_tokens",
    "ocr_provider",
    "storage_backend",
)


def dotenv_path() -> Path | None:
    """The `.env` pydantic-settings would read, if it exists.

    Resolved relative to the working directory, which is how pydantic-settings resolves it.
    A `.env` present here silently overrides code defaults; that is the whole reason this
    function exists rather than the fact being left implicit.
    """
    candidate = Path(".env").resolve()
    return candidate if candidate.is_file() else None


def _dotenv_keys() -> set[str]:
    path = dotenv_path()
    if path is None:
        return set()
    keys: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        keys.add(line.split("=", 1)[0].strip().upper())
    return keys


def configuration_sources(settings: Settings | None = None) -> list[SettingSource]:
    """Report where each identity-bearing setting was resolved from.

    Precedence in pydantic-settings is environment, then dotenv, then default — so that is
    the order checked here. An override that nobody can see is how a benchmark ends up
    attributed to a model it never used.
    """
    settings = settings or get_settings()
    dotenv = _dotenv_keys()
    path = dotenv_path()
    sources: list[SettingSource] = []

    for field in IDENTITY_FIELDS:
        env_key = f"REEF_{field.upper()}"
        value = str(getattr(settings, field))
        if env_key in os.environ:
            sources.append(SettingSource(field, value, "environment", env_key))
        elif env_key in dotenv:
            sources.append(SettingSource(field, value, "dotenv", str(path)))
        else:
            sources.append(SettingSource(field, value, "default", "config.py"))

    return sources
