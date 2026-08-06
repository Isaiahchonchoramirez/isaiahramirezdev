"""Runtime configuration.

Every value has a default that works against the Compose stack, so a fresh clone runs
without a `.env`. Secrets are the exception and are never defaulted to a real value.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

EmbeddingProvider = Literal["local", "none"]
OcrProvider = Literal["tesseract", "none"]
StorageBackend = Literal["filesystem", "s3"]


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
    # bge-small over MiniLM: same 384 dimensions, but a 512-token window instead of 256,
    # which doubles how much of a clause fits in one vector.
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    #: What the encoder actually accepts. Chunk sizes are derived from this rather than
    #: chosen independently — see ingest/chunk.py for why that ordering matters.
    embedding_max_tokens: int = 512

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
