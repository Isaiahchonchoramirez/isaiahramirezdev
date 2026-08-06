"""HTTP API — the two endpoints ADR-003 §4 authorizes as the deliverable.

`room_id` is a required path parameter on every data route rather than an optional filter.
A query without a tenant fails closed at the database, but requiring it in the route shape
means it can never be forgotten in the first place.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from reef import db
from reef.config import Settings, get_settings
from reef.evidence import EvidenceNotFound, EvidenceService, SourceRegion
from reef.models import Document, ProcessingState, Room
from reef.search import search

app = FastAPI(
    title="Reef engine",
    version="0.1.0",
    summary="Evidence-linked document ingestion. Fixture data only — see ADR-003.",
)


def get_evidence_service(settings: Annotated[Settings, Depends(get_settings)]) -> EvidenceService:
    return EvidenceService(settings)


class RegionOut(BaseModel):
    document_id: uuid.UUID
    filename: str
    folder_path: str
    mime: str
    page_number: int
    bbox: list[float] | None
    char_start: int
    char_end: int
    locator: str
    text: str
    page_width: float | None = None
    page_height: float | None = None
    text_source: str | None = None
    ocr_confidence: float | None = None

    @classmethod
    def of(cls, region: SourceRegion) -> RegionOut:
        return cls(
            document_id=region.document_id,
            filename=region.filename,
            folder_path=region.folder_path,
            mime=region.mime,
            page_number=region.page_number,
            bbox=region.bbox,
            char_start=region.char_start,
            char_end=region.char_end,
            locator=region.locator,
            text=region.text,
            page_width=region.page_width,
            page_height=region.page_height,
            text_source=region.text_source,
            ocr_confidence=region.ocr_confidence,
        )


class HitOut(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    folder_path: str
    breadcrumb: str
    text: str
    score: float
    vector_rank: int | None
    lexical_rank: int | None
    span_ids: list[uuid.UUID]
    locators: list[str]
    page_numbers: list[int]


class SearchOut(BaseModel):
    #: "found" or "not_found_in_corpus". Abstention is a result the caller must handle,
    #: not an empty list they can mistake for a bug.
    outcome: str
    query: str
    detail: str = ""
    hits: list[HitOut] = Field(default_factory=list)


class CoverageOut(BaseModel):
    """Every supplied file accounted for. Eval gates G1 and G2 read this."""

    room_id: uuid.UUID
    total_files: int
    by_state: dict[str, int]
    unprocessed: list[dict[str, str]]


def _room_or_404(room_id: uuid.UUID) -> uuid.UUID:
    with db.admin_session() as session:
        if session.get(Room, room_id) is None:
            raise HTTPException(status_code=404, detail=f"room {room_id} not found")
    return room_id


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/rooms")
def list_rooms() -> list[dict[str, str]]:
    with db.admin_session() as session:
        rooms = session.execute(select(Room).order_by(Room.created_at)).scalars().all()
    return [{"id": str(r.id), "name": r.name} for r in rooms]


@app.get("/rooms/{room_id}/search", response_model=SearchOut)
def search_room(
    room_id: Annotated[uuid.UUID, Path()],
    q: Annotated[str, Query(min_length=1, description="The question to ask")],
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
) -> SearchOut:
    _room_or_404(room_id)
    result = search(room_id, q, limit=limit)
    return SearchOut(
        outcome=str(result.outcome),
        query=result.query,
        detail=result.detail,
        hits=[
            HitOut(
                chunk_id=h.chunk_id,
                document_id=h.document_id,
                filename=h.filename,
                folder_path=h.folder_path,
                breadcrumb=h.breadcrumb,
                text=h.text,
                score=h.score,
                vector_rank=h.vector_rank,
                lexical_rank=h.lexical_rank,
                span_ids=h.span_ids,
                locators=h.locators,
                page_numbers=h.page_numbers,
            )
            for h in result.hits
        ],
    )


@app.get("/rooms/{room_id}/evidence/spans/{span_id}", response_model=RegionOut)
def get_span(
    room_id: uuid.UUID,
    span_id: uuid.UUID,
    service: Annotated[EvidenceService, Depends(get_evidence_service)],
) -> RegionOut:
    _room_or_404(room_id)
    try:
        return RegionOut.of(service.resolve_span(room_id, span_id))
    except EvidenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/rooms/{room_id}/evidence/spans/{span_id}/context")
def get_span_context(
    room_id: uuid.UUID,
    span_id: uuid.UUID,
    service: Annotated[EvidenceService, Depends(get_evidence_service)],
    neighbours: Annotated[int, Query(ge=0, le=5)] = 1,
) -> dict[str, object]:
    _room_or_404(room_id)
    try:
        context = service.context_for_span(room_id, span_id, neighbours=neighbours)
    except EvidenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "region": RegionOut.of(context.region).model_dump(),
        "before": context.before,
        "after": context.after,
    }


@app.get("/rooms/{room_id}/evidence/chunks/{chunk_id}", response_model=list[RegionOut])
def get_chunk_evidence(
    room_id: uuid.UUID,
    chunk_id: uuid.UUID,
    service: Annotated[EvidenceService, Depends(get_evidence_service)],
) -> list[RegionOut]:
    _room_or_404(room_id)
    try:
        return [RegionOut.of(r) for r in service.resolve_chunk(room_id, chunk_id)]
    except EvidenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/rooms/{room_id}/evidence/claims/{claim_id}")
def get_claim_evidence(
    room_id: uuid.UUID,
    claim_id: uuid.UUID,
    service: Annotated[EvidenceService, Depends(get_evidence_service)],
) -> dict[str, object]:
    _room_or_404(room_id)
    try:
        claim = service.resolve_claim(room_id, claim_id)
    except EvidenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "claim_id": str(claim.claim_id),
        "text": claim.text,
        "kind": claim.kind,
        "label": claim.label,
        "confidence": claim.confidence,
        "model_id": claim.model_id,
        "regions": [RegionOut.of(r).model_dump() for r in claim.regions],
    }


@app.get(
    "/rooms/{room_id}/documents/{document_id}/pages/{page_number}/image",
    response_class=Response,
)
def get_page_image(
    room_id: uuid.UUID,
    document_id: uuid.UUID,
    page_number: int,
    service: Annotated[EvidenceService, Depends(get_evidence_service)],
) -> Response:
    _room_or_404(room_id)
    try:
        return Response(
            content=service.page_image(room_id, document_id, page_number),
            media_type="image/png",
        )
    except EvidenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/rooms/{room_id}/coverage", response_model=CoverageOut)
def get_coverage(room_id: uuid.UUID) -> CoverageOut:
    _room_or_404(room_id)
    with db.room_session(room_id) as session:
        by_state: dict[str, int] = dict(
            session.execute(
                select(Document.processing_state, func.count()).group_by(Document.processing_state)
            )
            .tuples()
            .all()
        )
        total = session.execute(select(func.count()).select_from(Document)).scalar_one()
        unprocessed = [
            {
                "filename": filename,
                "folder_path": folder,
                "state": state,
                "reason": reason or "",
            }
            for filename, folder, state, reason in session.execute(
                select(
                    Document.filename,
                    Document.folder_path,
                    Document.processing_state,
                    Document.state_detail,
                ).where(
                    Document.processing_state.in_(
                        [ProcessingState.UNSUPPORTED, ProcessingState.FAILED]
                    )
                )
            ).all()
        ]

    return CoverageOut(
        room_id=room_id, total_files=total, by_state=by_state, unprocessed=unprocessed
    )
