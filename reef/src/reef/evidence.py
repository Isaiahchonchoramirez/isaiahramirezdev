"""The evidence API: resolve any anchor back to the exact region of the source it came from.

This is the module the product claim rests on. Everything else — parsing, chunking,
retrieval — exists so that this call can answer "show me exactly where that came from" with
a document, a page, a rectangle, and the surrounding text, rather than a filename.

`docs/evaluation/DEAL_ROOM_EVAL.md`: "An anchor that names the right document and the wrong
page is **wrong**, not partial. Document-level citation is precisely what Reef claims to
improve on."
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from reef.config import Settings, get_settings
from reef.db import room_session
from reef.models import Chunk, Claim, Document, Page, Span, Support
from reef.storage import ObjectStore, get_store


class EvidenceNotFound(LookupError):
    """The requested anchor does not exist in this room.

    Distinct from "exists but is empty": a caller must be able to tell a bad id from a
    span with no text, because the first is a bug and the second is data.
    """


@dataclass(slots=True)
class SourceRegion:
    """Where a fragment of text physically lives."""

    document_id: uuid.UUID
    filename: str
    folder_path: str
    mime: str
    page_number: int
    #: [x0, y0, x1, y1] in page coordinates. None for formats without geometry, where
    #: `locator` carries the format-native address instead.
    bbox: list[float] | None
    char_start: int
    char_end: int
    #: "page 7", "sheet FY25 row 3", "row 41" — the string a human checks against.
    locator: str
    text: str
    #: Page dimensions, so a caller can scale the bbox onto a render of any size.
    page_width: float | None = None
    page_height: float | None = None
    page_image_key: str | None = None
    #: How this document's text was obtained. A citation into an OCR'd page deserves to
    #: be weighed differently, and hiding that would misrepresent its reliability.
    text_source: str | None = None
    ocr_confidence: float | None = None


@dataclass(slots=True)
class EvidenceContext:
    """A region plus the text immediately around it, for display."""

    region: SourceRegion
    before: str = ""
    after: str = ""


@dataclass(slots=True)
class ClaimEvidence:
    claim_id: uuid.UUID
    text: str
    kind: str
    label: str
    confidence: float | None
    model_id: str | None
    regions: list[SourceRegion] = field(default_factory=list)


class EvidenceService:
    def __init__(self, settings: Settings | None = None, store: ObjectStore | None = None) -> None:
        self._settings = settings or get_settings()
        self._store = store or get_store(self._settings)

    def resolve_span(self, room_id: uuid.UUID, span_id: uuid.UUID) -> SourceRegion:
        with room_session(room_id) as session:
            row = session.execute(
                select(Span, Document)
                .join(Document, Document.id == Span.document_id)
                .where(Span.id == span_id)
            ).one_or_none()
            if row is None:
                raise EvidenceNotFound(f"span {span_id} is not in room {room_id}")
            span, document = row

            page = session.execute(
                select(Page).where(
                    Page.document_id == span.document_id, Page.number == span.page_number
                )
            ).scalar_one_or_none()

            return _region(span, document, page)

    def resolve_chunk(self, room_id: uuid.UUID, chunk_id: uuid.UUID) -> list[SourceRegion]:
        """Every source region a chunk was built from.

        A chunk can span several paragraphs, so this returns a list. Returning only the
        first would produce a citation that is right about the document and wrong about
        the location for everything after the opening paragraph.
        """
        with room_session(room_id) as session:
            chunk = session.get(Chunk, chunk_id)
            if chunk is None:
                raise EvidenceNotFound(f"chunk {chunk_id} is not in room {room_id}")
            return self._regions_for(session, list(chunk.span_ids or []))

    def resolve_claim(self, room_id: uuid.UUID, claim_id: uuid.UUID) -> ClaimEvidence:
        """A claim with every span that supports it.

        The database rejects a claim with no support, so `regions` is never empty for a
        claim that exists. That is an invariant, not a hope — see the constraint trigger
        in `alembic/versions/0002_evidence_invariants.py`.
        """
        with room_session(room_id) as session:
            claim = session.get(Claim, claim_id)
            if claim is None:
                raise EvidenceNotFound(f"claim {claim_id} is not in room {room_id}")

            span_ids = (
                session.execute(select(Support.span_id).where(Support.claim_id == claim_id))
                .scalars()
                .all()
            )

            return ClaimEvidence(
                claim_id=claim.id,
                text=claim.text,
                kind=claim.kind,
                label=claim.label,
                confidence=claim.confidence,
                model_id=claim.model_id,
                regions=self._regions_for(session, list(span_ids)),
            )

    def context_for_span(
        self, room_id: uuid.UUID, span_id: uuid.UUID, neighbours: int = 1
    ) -> EvidenceContext:
        """The region plus adjacent spans, so an excerpt is readable in situ."""
        with room_session(room_id) as session:
            row = session.execute(
                select(Span, Document)
                .join(Document, Document.id == Span.document_id)
                .where(Span.id == span_id)
            ).one_or_none()
            if row is None:
                raise EvidenceNotFound(f"span {span_id} is not in room {room_id}")
            span, document = row

            page = session.execute(
                select(Page).where(
                    Page.document_id == span.document_id, Page.number == span.page_number
                )
            ).scalar_one_or_none()

            siblings = (
                session.execute(
                    select(Span)
                    .where(
                        Span.document_id == span.document_id,
                        Span.page_number == span.page_number,
                    )
                    .order_by(Span.char_start)
                )
                .scalars()
                .all()
            )

            index = next((i for i, s in enumerate(siblings) if s.id == span.id), None)
            before = after = ""
            if index is not None:
                before = "\n\n".join(s.text for s in siblings[max(0, index - neighbours) : index])
                after = "\n\n".join(s.text for s in siblings[index + 1 : index + 1 + neighbours])

            return EvidenceContext(region=_region(span, document, page), before=before, after=after)

    def page_image(self, room_id: uuid.UUID, document_id: uuid.UUID, page_number: int) -> bytes:
        """The rendered page, for drawing the highlight on."""
        with room_session(room_id) as session:
            page = session.execute(
                select(Page).where(Page.document_id == document_id, Page.number == page_number)
            ).scalar_one_or_none()
            if page is None:
                raise EvidenceNotFound(f"page {page_number} of {document_id} is not in this room")
            if page.image_key is None:
                raise EvidenceNotFound(
                    f"page {page_number} of {document_id} has not been rendered; "
                    "ingest with --render to produce page images"
                )
            return self._store.get(self._settings.renders_bucket, page.image_key)

    def _regions_for(self, session: Session, span_ids: list[uuid.UUID]) -> list[SourceRegion]:
        if not span_ids:
            return []

        rows = session.execute(
            select(Span, Document)
            .join(Document, Document.id == Span.document_id)
            .where(Span.id.in_(span_ids))
        ).all()

        pages = {
            (page.document_id, page.number): page
            for page in session.execute(
                select(Page).where(Page.document_id.in_({r[0].document_id for r in rows}))
            )
            .scalars()
            .all()
        }

        regions = [
            _region(span, document, pages.get((span.document_id, span.page_number)))
            for span, document in rows
        ]
        # Ordered by where they appear in the source, not by the order the ids arrived in.
        # A citation list that jumps around the document reads as unreliable even when
        # every entry is correct.
        regions.sort(key=lambda r: (r.filename, r.page_number, r.char_start))
        return regions


def _region(span: Span, document: Document, page: Page | None) -> SourceRegion:
    return SourceRegion(
        document_id=document.id,
        filename=document.filename,
        folder_path=document.folder_path,
        mime=document.mime,
        page_number=span.page_number,
        bbox=list(span.bbox) if span.bbox else None,
        char_start=span.char_start,
        char_end=span.char_end,
        locator=span.locator,
        text=span.text,
        page_width=page.width if page else None,
        page_height=page.height if page else None,
        page_image_key=page.image_key if page else None,
        text_source=document.text_source,
        ocr_confidence=document.ocr_confidence,
    )
