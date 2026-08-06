"""The invariants are claimed to be enforced by the database, so they are tested against
a real database. A test that mocks the constraint proves only that the mock works.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from reef import db
from reef.models import Chunk, Claim, Document, ProcessingState, Span, Support

pytestmark = pytest.mark.integration


def _document(room_id: uuid.UUID) -> Document:
    return Document(
        room_id=room_id,
        sha256="0" * 64,
        filename="test.txt",
        size_bytes=10,
        mime="text/plain",
        processing_state=ProcessingState.PENDING,
    )


def _span(room_id: uuid.UUID, document_id: uuid.UUID) -> Span:
    return Span(
        room_id=room_id,
        document_id=document_id,
        page_number=1,
        char_start=0,
        char_end=5,
        text="hello",
        locator="line 1",
    )


class TestClaimRequiresSupport:
    def test_claim_without_support_is_rejected(self, room: uuid.UUID) -> None:
        with pytest.raises((IntegrityError, DBAPIError)) as exc:
            with db.room_session(room) as session:
                session.add(Claim(room_id=room, text="unsupported assertion", kind="finding"))
        assert "no supporting span" in str(exc.value)

    def test_claim_with_support_persists(self, room: uuid.UUID) -> None:
        with db.room_session(room) as session:
            doc = _document(room)
            session.add(doc)
            session.flush()
            span = _span(room, doc.id)
            session.add(span)
            session.flush()

            claim = Claim(room_id=room, text="supported assertion", kind="finding")
            session.add(claim)
            session.flush()
            session.add(Support(room_id=room, claim_id=claim.id, span_id=span.id))
            claim_id = claim.id

        with db.room_session(room) as session:
            assert session.get(Claim, claim_id) is not None

    def test_removing_the_last_support_row_is_rejected(self, room: uuid.UUID) -> None:
        with db.room_session(room) as session:
            doc = _document(room)
            session.add(doc)
            session.flush()
            span = _span(room, doc.id)
            session.add(span)
            session.flush()
            claim = Claim(room_id=room, text="supported", kind="finding")
            session.add(claim)
            session.flush()
            support = Support(room_id=room, claim_id=claim.id, span_id=span.id)
            session.add(support)
            session.flush()
            support_id = support.id

        with pytest.raises((IntegrityError, DBAPIError)) as exc:
            with db.room_session(room) as session:
                session.execute(text("DELETE FROM support WHERE id = :id"), {"id": str(support_id)})
        assert "unsupported" in str(exc.value)

    def test_deleting_the_claim_cascades_without_tripping_the_guard(self, room: uuid.UUID) -> None:
        """Cascade delete must not be mistaken for evidence removal.

        Dropping a claim legitimately removes its support rows. If the delete guard fired
        here, no claim could ever be deleted — the invariant would have made the data
        immortal rather than trustworthy.
        """
        with db.room_session(room) as session:
            doc = _document(room)
            session.add(doc)
            session.flush()
            span = _span(room, doc.id)
            session.add(span)
            session.flush()
            claim = Claim(room_id=room, text="doomed", kind="finding")
            session.add(claim)
            session.flush()
            session.add(Support(room_id=room, claim_id=claim.id, span_id=span.id))
            claim_id = claim.id

        with db.room_session(room) as session:
            session.execute(text("DELETE FROM claim WHERE id = :id"), {"id": str(claim_id)})

        with db.room_session(room) as session:
            assert session.get(Claim, claim_id) is None


class TestRowLevelSecurity:
    def test_a_room_cannot_see_another_rooms_documents(
        self, room: uuid.UUID, second_room: uuid.UUID
    ) -> None:
        with db.room_session(room) as session:
            doc = _document(room)
            session.add(doc)
            session.flush()
            doc_id = doc.id

        with db.room_session(second_room) as session:
            assert session.get(Document, doc_id) is None
            count = session.execute(text("SELECT count(*) FROM document")).scalar_one()
            assert count == 0

    def test_a_session_without_a_room_sees_nothing(self, room: uuid.UUID) -> None:
        """Fails closed and quietly. Not an error — an empty result.

        An exception here would be indistinguishable from a bug elsewhere in the stack;
        an empty result is unambiguous and safe.
        """
        with db.room_session(room) as session:
            session.add(_document(room))

        with db.admin_session() as session:
            count = session.execute(text("SELECT count(*) FROM document")).scalar_one()
            assert count == 0

    def test_writing_into_another_room_is_rejected(
        self, room: uuid.UUID, second_room: uuid.UUID
    ) -> None:
        """WITH CHECK, not just USING. Read isolation without write isolation would let a
        session insert rows it could never afterwards see."""
        with pytest.raises((IntegrityError, DBAPIError)), db.room_session(room) as session:
            session.add(_document(second_room))


class TestEmbeddingProvenance:
    def test_embedding_without_model_id_is_rejected(self, room: uuid.UUID) -> None:
        with pytest.raises((IntegrityError, DBAPIError)) as exc:  # noqa: PT012
            with db.room_session(room) as session:
                doc = _document(room)
                session.add(doc)
                session.flush()
                session.add(
                    Chunk(
                        room_id=room,
                        document_id=doc.id,
                        span_ids=[],
                        text="hello",
                        token_count=1,
                        embedding=[0.0] * 384,
                        embed_model=None,
                    )
                )
        assert "ck_chunk_embedding_has_model" in str(exc.value)

    def test_model_id_without_embedding_is_rejected(self, room: uuid.UUID) -> None:
        with pytest.raises((IntegrityError, DBAPIError)):  # noqa: PT012
            with db.room_session(room) as session:
                doc = _document(room)
                session.add(doc)
                session.flush()
                session.add(
                    Chunk(
                        room_id=room,
                        document_id=doc.id,
                        span_ids=[],
                        text="hello",
                        token_count=1,
                        embedding=None,
                        embed_model="some-model",
                    )
                )


class TestProcessingStateDetail:
    def test_failed_state_requires_a_reason(self, room: uuid.UUID) -> None:
        with pytest.raises((IntegrityError, DBAPIError)) as exc:  # noqa: PT012
            with db.room_session(room) as session:
                doc = _document(room)
                doc.processing_state = ProcessingState.FAILED
                doc.state_detail = None
                session.add(doc)
        assert "ck_document_state_detail" in str(exc.value)

    def test_unsupported_state_requires_a_reason(self, room: uuid.UUID) -> None:
        with pytest.raises((IntegrityError, DBAPIError)):  # noqa: PT012
            with db.room_session(room) as session:
                doc = _document(room)
                doc.processing_state = ProcessingState.UNSUPPORTED
                doc.state_detail = "   "
                session.add(doc)
