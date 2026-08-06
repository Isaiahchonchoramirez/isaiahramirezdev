"""Session management, with the tenant boundary attached to the session rather than to
the caller's discipline.

The only supported way to touch tenant-scoped data is `room_session(room_id)`, which sets
the `reef.room_id` GUC on the connection for the life of the transaction. Row-level
security policies read that GUC. A session opened without it sees nothing — not an error,
not a partial result, nothing — because a query that forgets its tenant must fail closed.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from reef.config import get_settings

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_engine(), expire_on_commit=False, future=True)
    return _session_factory


@contextmanager
def room_session(room_id: uuid.UUID) -> Iterator[Session]:
    """A transaction scoped to one room.

    `set_config(..., true)` makes the setting local to the transaction, so a pooled
    connection cannot leak one room's id into the next request's query. That `true` is
    load-bearing: without it, connection reuse becomes a cross-tenant data leak.
    """
    factory = get_session_factory()
    with factory() as session:
        session.execute(
            text("SELECT set_config('reef.room_id', :room_id, true)"),
            {"room_id": str(room_id)},
        )
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


@contextmanager
def admin_session() -> Iterator[Session]:
    """A session for room-table operations only — creating a room, listing rooms.

    It carries no `reef.room_id`, so every tenant-scoped table is empty from its point of
    view. That is the intended behaviour, not a limitation to work around.
    """
    factory = get_session_factory()
    with factory() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


def reset_engine() -> None:
    """Drop cached engine and factory. Tests use this after changing settings."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None
