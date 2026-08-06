"""Stages 2-6: extract, structure, chunk, embed, index.

Two properties matter more than throughput here, and both come from
`docs/reef/05-architecture.md`:

**Failure is per document, never per batch.** "One corrupt PDF in 1,400 must never stop
the other 1,399, and the 1 is reported by name." Every document is processed inside its
own transaction and its own try/except, so a parser crash marks one row `failed` with a
reason and the run continues.

**Each stage is idempotent and records its output**, so re-running after a failure does
not repeat the expensive stages that already succeeded.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

import structlog
from sqlalchemy import delete, select

from reef.config import Settings, get_settings
from reef.db import room_session
from reef.extract import ExtractionError, extract_document
from reef.extract.base import ExtractionResult
from reef.extract.pdf import render_page
from reef.ingest.chunk import TokenCounter, chunk_spans
from reef.models import Chunk, Document, Page, ProcessingState, Span
from reef.models_gateway import Embedder, get_embedder
from reef.provenance import PIPELINE_VERSION, chunk_id, extractor_for, span_id
from reef.storage import ObjectStore, get_store, render_key

log = structlog.get_logger(__name__)


@dataclass(slots=True)
class ProcessResult:
    room_id: uuid.UUID
    processed: int = 0
    failed: int = 0
    spans: int = 0
    chunks: int = 0
    embedded: int = 0
    #: (filename, reason) for each failure, so a run reports its casualties by name
    #: rather than as a count.
    failures: list[tuple[str, str]] = field(default_factory=list)


class Pipeline:
    def __init__(
        self,
        settings: Settings | None = None,
        store: ObjectStore | None = None,
        embedder: Embedder | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._store = store or get_store(self._settings)
        self._embedder = embedder
        self._counter = TokenCounter(self._settings.embedding_model)

    @property
    def embedder(self) -> Embedder:
        # Deferred so that constructing a Pipeline does not load a model, which matters
        # for tests and for CLI subcommands that never embed anything.
        if self._embedder is None:
            self._embedder = get_embedder(self._settings)
        return self._embedder

    def process_room(self, room_id: uuid.UUID, render_pages: bool = False) -> ProcessResult:
        result = ProcessResult(room_id=room_id)

        with room_session(room_id) as session:
            pending = (
                session.execute(
                    select(Document.id).where(Document.processing_state == ProcessingState.PENDING)
                )
                .scalars()
                .all()
            )

        for document_id in pending:
            try:
                counts = self._process_document(room_id, document_id, render_pages)
            except Exception as exc:
                name = self._mark_failed(room_id, document_id, exc)
                result.failed += 1
                result.failures.append((name, str(exc)[:200]))
                log.warning("pipeline.document_failed", document=name, error=str(exc)[:200])
                continue

            result.processed += 1
            result.spans += counts[0]
            result.chunks += counts[1]
            result.embedded += counts[2]

        log.info(
            "pipeline.complete",
            room_id=str(room_id),
            processed=result.processed,
            failed=result.failed,
            chunks=result.chunks,
        )
        return result

    def _process_document(
        self, room_id: uuid.UUID, document_id: uuid.UUID, render_pages: bool
    ) -> tuple[int, int, int]:
        settings = self._settings

        with room_session(room_id) as session:
            document = session.get(Document, document_id)
            if document is None or document.storage_key is None:
                return (0, 0, 0)
            mime = document.mime
            storage_key = document.storage_key

        data = self._store.get(settings.originals_bucket, storage_key)

        try:
            extraction = extract_document(mime, data, path=None, settings=settings)
        except ExtractionError as exc:
            self._mark_unsupported(room_id, document_id, str(exc))
            return (0, 0, 0)

        chunks = chunk_spans(extraction.spans, settings, self._counter)

        texts = [c.text for c in chunks]
        batch = self.embedder.embed(texts) if texts else None
        vectors = batch.vectors if batch and batch.vectors else []
        model_id = batch.model_id if batch and batch.vectors else None

        with room_session(room_id) as session:
            document = session.get(Document, document_id)
            if document is None:  # pragma: no cover - deleted mid-run
                return (0, 0, 0)

            # Re-running a document replaces its derived rows rather than appending to
            # them. Without this, a retry doubles every chunk and quietly inflates recall.
            session.execute(delete(Chunk).where(Chunk.document_id == document_id))
            session.execute(delete(Span).where(Span.document_id == document_id))
            session.execute(delete(Page).where(Page.document_id == document_id))
            session.flush()

            for raw_page in extraction.pages:
                session.add(
                    Page(
                        room_id=room_id,
                        document_id=document_id,
                        number=raw_page.number,
                        width=raw_page.width,
                        height=raw_page.height,
                    )
                )

            span_ids: list[uuid.UUID] = []
            for raw_span in extraction.spans:
                # The id is derived rather than left to the column default, for two
                # reasons. The default is only applied at flush, and the chunks below need
                # these ids while the spans are still pending — reading `span.id` before
                # the flush yields None, and a chunk storing None for its spans has no
                # provenance at all. And a derived id is stable across re-ingestion, so a
                # citation written into a memo still resolves after the room is reprocessed.
                span = Span(
                    id=span_id(
                        document_id,
                        raw_span.page_number,
                        raw_span.char_start,
                        raw_span.char_end,
                    ),
                    room_id=room_id,
                    document_id=document_id,
                    page_number=raw_span.page_number,
                    bbox=raw_span.bbox,
                    char_start=raw_span.char_start,
                    char_end=raw_span.char_end,
                    text=raw_span.text,
                    locator=raw_span.locator,
                    kind=str(raw_span.kind),
                )
                session.add(span)
                span_ids.append(span.id)
            session.flush()

            for index, chunk in enumerate(chunks):
                vector = vectors[index] if index < len(vectors) else None
                session.add(
                    Chunk(
                        id=chunk_id(document_id, chunk.granularity, chunk.ordinal),
                        room_id=room_id,
                        document_id=document_id,
                        span_ids=[span_ids[i] for i in chunk.span_indices if i < len(span_ids)],
                        breadcrumb=chunk.breadcrumb,
                        text=chunk.text,
                        token_count=chunk.token_count,
                        embedding=vector,
                        # The DB constraint rejects one without the other, so the pair is
                        # set together rather than in two places.
                        embed_model=model_id if vector is not None else None,
                        granularity=chunk.granularity,
                        ordinal=chunk.ordinal,
                    )
                )

            document.page_count = len(extraction.pages)
            document.text_source = str(extraction.text_source)
            document.ocr_confidence = extraction.ocr_confidence
            document.processing_state = (
                ProcessingState.INDEXED if chunks else ProcessingState.EXTRACTED
            )
            document.state_detail = None
            document.pipeline_version = PIPELINE_VERSION
            document.extractor = extractor_for(mime)
            document.extra = {**(document.extra or {}), "extraction": extraction.extra}

        if render_pages and mime == "application/pdf":
            self._render(room_id, document_id, data, extraction)

        return (len(extraction.spans), len(chunks), len(vectors))

    def _render(
        self,
        room_id: uuid.UUID,
        document_id: uuid.UUID,
        data: bytes,
        extraction: ExtractionResult,
    ) -> None:
        """Page images for the evidence highlight.

        A render failure is not a document failure — the text and its anchors are already
        stored, and a citation without a picture is still a citation.
        """
        for raw_page in extraction.pages:
            try:
                png = render_page(data, raw_page.number)
            except Exception as exc:
                log.warning("pipeline.render_failed", page=raw_page.number, error=str(exc)[:120])
                continue
            key = render_key(room_id, document_id, raw_page.number)
            self._store.put(self._settings.renders_bucket, key, png)
            with room_session(room_id) as session:
                page = session.execute(
                    select(Page).where(
                        Page.document_id == document_id, Page.number == raw_page.number
                    )
                ).scalar_one_or_none()
                if page is not None:
                    page.image_key = key

    def _mark_unsupported(self, room_id: uuid.UUID, document_id: uuid.UUID, reason: str) -> None:
        with room_session(room_id) as session:
            document = session.get(Document, document_id)
            if document is not None:
                document.processing_state = ProcessingState.UNSUPPORTED
                document.state_detail = reason

    def _mark_failed(self, room_id: uuid.UUID, document_id: uuid.UUID, exc: Exception) -> str:
        with room_session(room_id) as session:
            document = session.get(Document, document_id)
            if document is None:
                return str(document_id)
            document.processing_state = ProcessingState.FAILED
            # Named exception class plus message: the class alone is not actionable, and
            # the message alone sometimes lacks the context to reproduce it.
            document.state_detail = f"{type(exc).__name__}: {exc}"[:1000]
            return document.filename
