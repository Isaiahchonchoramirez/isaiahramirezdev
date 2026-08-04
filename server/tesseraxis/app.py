"""Tesseraxis research control-plane scaffold.

Storage is intentionally in-memory until authentication, PostgreSQL, and object
storage are configured. It is an executable API contract, not a production
deployment pretending persistence and isolation already exist.
"""

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field


class ResearchJobCreate(BaseModel):
    plugin: str = Field(min_length=1, max_length=80)
    kind: Literal["run", "sweep", "optimize", "rl-train"]
    seed: int = 1
    params: dict[str, Any] = Field(default_factory=dict)
    script: list[dict[str, Any]] = Field(default_factory=list)
    objective: dict[str, Any] | None = None


class ResearchJob(ResearchJobCreate):
    id: UUID
    status: Literal["queued", "leased", "running", "complete", "failed", "cancelled"]
    created_at: datetime
    result: dict[str, Any] | None = None


app = FastAPI(title="Tesseraxis Research API", version="0.1.0")
jobs: dict[UUID, ResearchJob] = {}
project_sockets: dict[str, set[WebSocket]] = {}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/jobs", response_model=ResearchJob, status_code=202)
def create_job(spec: ResearchJobCreate) -> ResearchJob:
    job = ResearchJob(**spec.model_dump(), id=uuid4(), status="queued", created_at=datetime.now(timezone.utc))
    jobs[job.id] = job
    return job


@app.get("/v1/jobs/{job_id}", response_model=ResearchJob)
def get_job(job_id: UUID) -> ResearchJob:
    if job_id not in jobs:
        raise HTTPException(404, "Research job not found")
    return jobs[job_id]


@app.websocket("/v1/projects/{project_id}/events")
async def project_events(socket: WebSocket, project_id: str) -> None:
    await socket.accept()
    peers = project_sockets.setdefault(project_id, set())
    peers.add(socket)
    try:
        while True:
            event = await socket.receive_json()
            # Production: authorize the mutation, persist it, assign a server
            # sequence, then publish. This scaffold broadcasts presence/comments.
            for peer in tuple(peers):
                if peer is not socket:
                    await peer.send_json(event)
    except WebSocketDisconnect:
        peers.discard(socket)
