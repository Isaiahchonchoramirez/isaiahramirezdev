"""The evidence schema.

`docs/reef/05-architecture.md`: "The evidence model is the schema. Everything else is
replaceable. If provenance is designed as an afterthought and bolted on, it will be
approximate, and approximate provenance is worse than none because it is trusted."

Three invariants are enforced in the database rather than here, because application code
has bugs and these are the ones that make Reef trustworthy (ADR-003 §5):

1. A `claim` with zero rows in `support` cannot be persisted. Enforced by a constraint
   trigger, so it is checked at transaction commit rather than statement time — the claim
   and its support rows are written in one transaction.
2. Row-level security on every tenant-scoped table, FORCE'd so even the owner is subject
   to it. A query without `reef.room_id` set returns nothing.
3. Every vector stores the id of the model that produced it. Re-embedding is otherwise
   unauditable.

See `alembic/versions/` for 1 and 2; SQLAlchemy cannot express either.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, ClassVar

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from reef.config import get_settings


class Base(DeclarativeBase):
    type_annotation_map: ClassVar[dict[object, object]] = {dict[str, Any]: JSONB}


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class Room(Base):
    """The tenant boundary. Everything else hangs off exactly one room.

    ADR-003 §4: "Tenant id is present in every record, object key, job and query from the
    first commit." Holding that line from the start is what makes the dedicated, VPC and
    on-prem deployment tiers a deployment exercise rather than a rewrite.
    """

    __tablename__ = "room"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    documents: Mapped[list[Document]] = relationship(back_populates="room")


class ProcessingState:
    """Every supplied file lands in exactly one of these. No silent drops.

    Eval gates G1 and G2 sit at 100% and are binary: every file has a state, and each
    state is correct. `unsupported` and `failed` are distinct on purpose — "we do not
    handle this format" and "we tried and could not" are different answers to the
    customer, and conflating them hides a bug behind a policy.
    """

    PENDING = "pending"
    EXTRACTED = "extracted"
    CHUNKED = "chunked"
    INDEXED = "indexed"
    UNSUPPORTED = "unsupported"
    FAILED = "failed"
    DUPLICATE = "duplicate"

    ALL = (PENDING, EXTRACTED, CHUNKED, INDEXED, UNSUPPORTED, FAILED, DUPLICATE)
    TERMINAL_OK = (INDEXED,)


class Document(Base):
    __tablename__ = "document"
    __table_args__ = (
        # Content-addressed dedupe within a room. The same bytes arriving twice under
        # different names is a fact about the room worth recording, not an error — see
        # the `duplicate_of_id` self-reference.
        Index("ix_document_room_sha256", "room_id", "sha256"),
        Index("ix_document_room_state", "room_id", "processing_state"),
        CheckConstraint(
            "processing_state IN (" + ", ".join(f"'{s}'" for s in ProcessingState.ALL) + ")",
            name="ck_document_processing_state",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))

    sha256: Mapped[str] = mapped_column(String(64))
    filename: Mapped[str] = mapped_column(Text)
    # The folder layout of a data room is evidence about the seller — what they organised,
    # what they dumped in a misc folder, what they never created. It is preserved verbatim.
    folder_path: Mapped[str] = mapped_column(Text, default="")
    size_bytes: Mapped[int] = mapped_column(BigInteger)

    # Detected by magic bytes, never by extension. `declared_mime` records what the
    # extension claimed so a mismatch is visible rather than silently resolved.
    mime: Mapped[str] = mapped_column(String(255))
    declared_mime: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Set when this document arrived inside an archive, so the provenance chain back to
    # the originally supplied file survives expansion.
    container_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("document.id", ondelete="CASCADE"), nullable=True
    )
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("document.id", ondelete="SET NULL"), nullable=True
    )

    processing_state: Mapped[str] = mapped_column(String(32), default=ProcessingState.PENDING)
    # Why a file is unsupported or failed, in words a human can act on. Never an empty
    # string on a non-OK state — a coverage statement that says "failed" without saying
    # why is not a coverage statement.
    state_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Whether the text came from a text layer, OCR, or a mix. Retrieval quality and
    # anchor tolerance both depend on this, so it is stored rather than inferred.
    text_source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Which pipeline produced this document's spans and chunks. Recorded so a regression
    #: can be traced to a boundary change rather than to the corpus.
    pipeline_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    #: Which parser read it — "pymupdf", "openpyxl", "stdlib-csv". A dependency upgrade
    #: that changes anchors is otherwise invisible.
    extractor: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room: Mapped[Room] = relationship(back_populates="documents")
    pages: Mapped[list[Page]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    spans: Mapped[list[Span]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Page(Base):
    __tablename__ = "page"
    __table_args__ = (UniqueConstraint("document_id", "number", name="uq_page_document_number"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document.id", ondelete="CASCADE"))

    # 1-indexed, matching how every human refers to a page. The eval scores PDF anchors at
    # zero pages of tolerance, so an off-by-one here is a scored failure.
    number: Mapped[int] = mapped_column(Integer)
    width: Mapped[float] = mapped_column(Float)
    height: Mapped[float] = mapped_column(Float)
    # Rendered page image, needed for the evidence highlight and for vision fallback.
    image_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    document: Mapped[Document] = relationship(back_populates="pages")


class Span(Base):
    """A located region of source text. The atom of provenance.

    Everything Reef ever claims resolves to one or more of these. A span always knows its
    page and its character range; `bbox` is populated for formats that have geometry
    (PDF) and null for those that do not (CSV rows, text lines), where `locator` carries
    the format-native address instead — sheet and cell for XLSX, row index for CSV.
    """

    __tablename__ = "span"
    __table_args__ = (
        Index("ix_span_room_document", "room_id", "document_id"),
        Index("ix_span_document_page", "document_id", "page_number"),
        CheckConstraint("char_end >= char_start", name="ck_span_char_range"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document.id", ondelete="CASCADE"))

    page_number: Mapped[int] = mapped_column(Integer)
    # [x0, y0, x1, y1] in the page's coordinate space. Null where the format has no
    # geometry — a CSV row has an address but not a rectangle.
    bbox: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    char_start: Mapped[int] = mapped_column(Integer)
    char_end: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    # Format-native address, rendered for humans and parsed for scoring. Examples:
    # "sheet FY25!B3", "row 41", "page 7". The eval matches anchors against these.
    locator: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(32), default="text")

    document: Mapped[Document] = relationship(back_populates="spans")


class Chunk(Base):
    """A retrievable unit. Carries its own provenance and its own model id."""

    __tablename__ = "chunk"
    __table_args__ = (
        Index("ix_chunk_room_document", "room_id", "document_id"),
        # Explicit regconfig rather than the default, because the default is a session
        # setting and an index built under one config is silently unusable under another.
        Index(
            "ix_chunk_fts",
            text("to_tsvector('english', text)"),
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document.id", ondelete="CASCADE"))

    span_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)))
    # "Master Lease › §12 Assignment ›" — prepended so a chunk retrieved alone is still
    # interpretable. Without it, a clause about "the Agreement" is unusable out of context.
    breadcrumb: Mapped[str] = mapped_column(Text, default="")
    text: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer)

    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(get_settings().embedding_dim), nullable=True
    )
    # Never nullable when `embedding` is set — the DB constraint enforces the pair.
    # A vector whose producing model is unknown cannot be safely compared to any other.
    embed_model: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Whole-table and per-row chunks coexist for the same table, because questions arrive
    # at both granularities. `granularity` keeps them distinguishable at rank time.
    granularity: Mapped[str] = mapped_column(String(32), default="section")
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Claim(Base):
    """A derived statement. Cannot exist without support. See the constraint trigger."""

    __tablename__ = "claim"
    __table_args__ = (Index("ix_claim_room_kind", "room_id", "kind"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))

    text: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Null for deterministic claims. A calculated figure has no model behind it and
    # recording one would misrepresent how it was produced.
    model_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # extracted / calculated / inferred / unresolved / missing — the taxonomy from
    # CONCIERGE_RUNBOOK.md, carried into the product rather than left in the pilot.
    label: Mapped[str] = mapped_column(String(32), default="extracted")
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    support: Mapped[list[Support]] = relationship(
        back_populates="claim", cascade="all, delete-orphan"
    )


class Support(Base):
    """The join that makes Reef trustworthy. A claim points at the spans that produced it."""

    __tablename__ = "support"
    __table_args__ = (UniqueConstraint("claim_id", "span_id", name="uq_support_claim_span"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    claim_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("claim.id", ondelete="CASCADE"))
    span_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("span.id", ondelete="CASCADE"))
    relevance: Mapped[float | None] = mapped_column(Float, nullable=True)

    claim: Mapped[Claim] = relationship(back_populates="support")


class Entity(Base):
    __tablename__ = "entity"
    __table_args__ = (
        UniqueConstraint("room_id", "kind", "canonical_name", name="uq_entity_room_kind_name"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(64))
    canonical_name: Mapped[str] = mapped_column(Text)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class Mention(Base):
    __tablename__ = "mention"
    __table_args__ = (UniqueConstraint("entity_id", "span_id", name="uq_mention_entity_span"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entity.id", ondelete="CASCADE"))
    span_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("span.id", ondelete="CASCADE"))


class Edge(Base):
    """Typed relationship between entities, always carrying the spans that evidence it."""

    __tablename__ = "edge"
    __table_args__ = (Index("ix_edge_room_kind", "room_id", "kind"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    from_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entity.id", ondelete="CASCADE"))
    to_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entity.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(64))
    span_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)))
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)


class IngestRun(Base):
    """One ingest of one source into one room. The unit the coverage statement describes."""

    __tablename__ = "ingest_run"

    id: Mapped[uuid.UUID] = _uuid_pk()
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Counts are derived from `document` at read time rather than incremented here.
    # A cached counter that disagrees with the rows is how silent omissions appear.
    complete: Mapped[bool] = mapped_column(Boolean, default=False)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


#: Tables carrying `room_id`, which is every table except `room` itself. RLS is applied to
#: each in the migration; the list lives here so adding a model without a policy is a
#: visible omission rather than an invisible one.
TENANT_SCOPED_TABLES = (
    "document",
    "page",
    "span",
    "chunk",
    "claim",
    "support",
    "entity",
    "mention",
    "edge",
    "ingest_run",
)
