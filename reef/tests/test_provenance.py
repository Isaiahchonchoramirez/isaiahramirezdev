"""Evidence identifiers must be derived, not generated.

A citation lands in a memo, a report, or a URL, and then the room is re-ingested. If ids
are random, every one of those references breaks silently. These tests assert the property
directly rather than trusting that the pipeline happens to pass ids around correctly.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from sqlalchemy import select

from reef import db
from reef.config import Settings
from reef.ingest.intake import Intake
from reef.ingest.pipeline import Pipeline
from reef.models import Chunk, Document, Span
from reef.models_gateway import NullEmbedder
from reef.provenance import (
    NAMESPACE,
    PIPELINE_VERSION,
    chunk_id,
    document_id,
    extractor_for,
    span_id,
)
from reef.storage import FilesystemStore


class TestDerivedIdentity:
    def test_the_same_inputs_always_produce_the_same_id(self) -> None:
        room = uuid.uuid4()
        first = document_id(room, "01_Corporate", "charter.pdf", "a" * 64)
        second = document_id(room, "01_Corporate", "charter.pdf", "a" * 64)
        assert first == second

    def test_a_revision_at_the_same_path_is_a_different_document(self) -> None:
        """Distinguishable source identities across revisions — the SHA-256 carries it."""
        room = uuid.uuid4()
        original = document_id(room, "02_Financial", "model.xlsx", "a" * 64)
        revised = document_id(room, "02_Financial", "model.xlsx", "b" * 64)
        assert original != revised

    def test_identical_bytes_at_two_paths_are_two_supplied_files(self) -> None:
        """The coverage statement must account for both copies, so they cannot share an id."""
        room = uuid.uuid4()
        here = document_id(room, "a", "same.txt", "c" * 64)
        there = document_id(room, "b", "same.txt", "c" * 64)
        assert here != there

    def test_rooms_do_not_share_document_ids(self) -> None:
        sha = "d" * 64
        assert document_id(uuid.uuid4(), "f", "x.txt", sha) != document_id(
            uuid.uuid4(), "f", "x.txt", sha
        )

    def test_spans_are_keyed_on_their_coordinates(self) -> None:
        doc = uuid.uuid4()
        assert span_id(doc, 1, 0, 10) == span_id(doc, 1, 0, 10)
        assert span_id(doc, 1, 0, 10) != span_id(doc, 2, 0, 10)
        assert span_id(doc, 1, 0, 10) != span_id(doc, 1, 0, 11)

    def test_a_table_and_its_rows_do_not_collide_at_the_same_ordinal(self) -> None:
        doc = uuid.uuid4()
        assert chunk_id(doc, "table", 3) != chunk_id(doc, "row", 3)

    def test_pipeline_version_is_part_of_the_key(self) -> None:
        """A boundary change must re-key derived ids: the old id referred to different text.

        Asserted by construction — the version string appears in the derivation input — so
        that removing it from the key fails here rather than silently in production.
        """
        doc = uuid.uuid4()
        expected = uuid.uuid5(NAMESPACE, f"span:{PIPELINE_VERSION}:{doc}:1:0:10")
        assert span_id(doc, 1, 0, 10) == expected

    def test_extractor_identity_is_known_for_every_supported_format(self) -> None:
        from reef.extract import supported_mimes

        for mime in supported_mimes():
            assert extractor_for(mime) != "none", f"no extractor recorded for {mime}"


@pytest.mark.integration
class TestReingestionStability:
    def test_reingesting_an_unchanged_room_reuses_every_identifier(
        self, room: uuid.UUID, tmp_path: Path
    ) -> None:
        """The property that matters: a citation issued before a reprocess still resolves.

        Runs the whole pipeline twice over identical bytes and compares the id sets.
        """
        source = tmp_path / "room"
        (source / "03_Customers").mkdir(parents=True)
        (source / "03_Customers" / "customers.csv").write_text(
            "customer_id,name\n000418,Lakeside\n000742,Consolidated\n"
        )
        (source / "notes.md").write_text("# Notes\n\n## Concentration\n\nLargest is 22.4pc.\n")

        settings = Settings(
            storage_backend="filesystem",
            storage_root=tmp_path / "store",
            embedding_provider="none",
        )
        store = FilesystemStore(tmp_path / "store")

        def run() -> tuple[set[uuid.UUID], set[uuid.UUID], set[uuid.UUID]]:
            Intake(settings=settings, store=store).ingest_directory(room, source)
            Pipeline(settings=settings, store=store, embedder=NullEmbedder()).process_room(room)
            with db.room_session(room) as session:
                docs = set(session.execute(select(Document.id)).scalars().all())
                spans = set(session.execute(select(Span.id)).scalars().all())
                chunks = set(session.execute(select(Chunk.id)).scalars().all())
            return docs, spans, chunks

        first = run()
        second = run()

        assert first[0] == second[0], "document ids changed on re-ingestion"
        assert first[1] == second[1], "span ids changed on re-ingestion"
        assert first[2] == second[2], "chunk ids changed on re-ingestion"
        assert first[1], "no spans were produced, so the test proved nothing"

    def test_pipeline_and_extractor_are_recorded_on_every_processed_document(
        self, room: uuid.UUID, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        source.mkdir()
        (source / "a.csv").write_text("id,name\n1,x\n2,y\n")
        (source / "b.md").write_text("# Title\n\nSome prose here.\n")

        settings = Settings(
            storage_backend="filesystem",
            storage_root=tmp_path / "store",
            embedding_provider="none",
        )
        store = FilesystemStore(tmp_path / "store")
        Intake(settings=settings, store=store).ingest_directory(room, source)
        Pipeline(settings=settings, store=store, embedder=NullEmbedder()).process_room(room)

        with db.room_session(room) as session:
            rows = session.execute(
                select(Document.filename, Document.pipeline_version, Document.extractor).where(
                    Document.processing_state == "indexed"
                )
            ).all()

        assert rows
        for filename, version, extractor in rows:
            assert version == PIPELINE_VERSION, f"{filename} has no pipeline version"
            assert extractor is not None, f"{filename} has no extractor recorded"
            assert extractor != "none", f"{filename} recorded an unknown extractor"
