from __future__ import annotations

import os
import uuid
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import text

from reef import db
from reef.models import Room

FIXTURE_ROOT = Path(__file__).resolve().parents[2] / "fixtures" / "reef-deal-room"


def pytest_configure(config: pytest.Config) -> None:
    # Tests must never touch a real deployment, and a mistyped env var should not be the
    # only thing standing between a test run and someone's data.
    os.environ.setdefault(
        "REEF_DATABASE_URL", "postgresql+psycopg://reef_app:reef_app@localhost:5432/reef"
    )
    os.environ.setdefault(
        "REEF_MIGRATION_DATABASE_URL", "postgresql+psycopg://reef:reef@localhost:5432/reef"
    )


@pytest.fixture(scope="session")
def database_available() -> bool:
    try:
        with db.get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.fixture
def requires_db(database_available: bool) -> None:
    if not database_available:
        pytest.skip("postgres not reachable; run ops/bootstrap-local-db.sh")


@pytest.fixture
def room(requires_db: None) -> Iterator[uuid.UUID]:
    """A throwaway room, removed afterwards so runs do not accumulate state."""
    room_id = uuid.uuid4()
    with db.admin_session() as session:
        session.add(Room(id=room_id, name=f"test-{room_id.hex[:8]}"))
    yield room_id
    with db.admin_session() as session:
        session.execute(text("DELETE FROM room WHERE id = :id"), {"id": str(room_id)})


@pytest.fixture
def second_room(requires_db: None) -> Iterator[uuid.UUID]:
    room_id = uuid.uuid4()
    with db.admin_session() as session:
        session.add(Room(id=room_id, name=f"test-other-{room_id.hex[:8]}"))
    yield room_id
    with db.admin_session() as session:
        session.execute(text("DELETE FROM room WHERE id = :id"), {"id": str(room_id)})


@pytest.fixture(scope="session")
def fixture_root() -> Path:
    if not FIXTURE_ROOT.exists():
        pytest.skip(f"deal room fixture not found at {FIXTURE_ROOT}")
    return FIXTURE_ROOT
