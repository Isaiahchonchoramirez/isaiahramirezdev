from __future__ import annotations

import io
import uuid
import zipfile
from pathlib import Path

import pytest
from sqlalchemy import func, select

from reef import db
from reef.config import Settings
from reef.ingest import filetype
from reef.ingest.intake import Intake
from reef.models import Document, ProcessingState
from reef.storage import FilesystemStore


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(storage_backend="filesystem", storage_root=tmp_path / "store")


@pytest.fixture
def intake(settings: Settings, tmp_path: Path) -> Intake:
    return Intake(settings=settings, store=FilesystemStore(tmp_path / "store"))


class TestTypeDetection:
    def test_extension_lies_and_content_wins(self, tmp_path: Path) -> None:
        """A spreadsheet renamed to .pdf is ordinary, not adversarial. Dispatching on the
        name would send it to the PDF parser and produce a confident empty result."""
        path = tmp_path / "financials.pdf"
        path.write_bytes(b"%PDF-1.7\nnot really relevant\n")
        detected = filetype.detect(path, path.read_bytes())
        assert detected.mime == "application/pdf"

        liar = tmp_path / "actually_text.pdf"
        liar.write_bytes(b"Just some prose, no signature at all.\n")
        detected = filetype.detect(liar, liar.read_bytes())
        assert detected.mime == "text/plain"
        assert detected.mismatch is True
        assert detected.declared_mime == "application/pdf"

    def test_docx_and_xlsx_are_disambiguated_inside_the_zip(self, tmp_path: Path) -> None:
        """Both are ZIP containers with identical magic bytes."""
        for marker, expected in (
            (
                "word/document.xml",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
            (
                "xl/workbook.xml",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
        ):
            path = tmp_path / f"{marker.split('/')[0]}.bin"
            with zipfile.ZipFile(path, "w") as zf:
                zf.writestr(marker, "<xml/>")
            assert filetype.detect(path, path.read_bytes()).mime == expected

    def test_csv_is_distinguished_from_prose_with_commas(self, tmp_path: Path) -> None:
        table = tmp_path / "t.csv"
        table.write_text("id,name,amount\n001,Acme,100\n002,Beta,200\n")
        assert filetype.detect(table, table.read_bytes()).mime == "text/csv"

        prose = tmp_path / "p.txt"
        prose.write_text("We met Acme, Beta, and Gamma.\nThey were, on balance, fine.\n")
        assert filetype.detect(prose, prose.read_bytes()).mime == "text/plain"


class TestIntakeCoverage:
    def test_every_file_gets_a_state(self, room: uuid.UUID, intake: Intake, tmp_path: Path) -> None:
        """Eval gate G1 at 100%. A file that is skipped rather than registered is exactly
        the silent drop the gate exists to catch."""
        source = tmp_path / "room"
        (source / "01_Corporate").mkdir(parents=True)
        (source / "01_Corporate" / "charter.txt").write_text("Articles of organization.\n")
        (source / "01_Corporate" / "data.csv").write_text("a,b\n1,2\n3,4\n")
        (source / "notes.md").write_text("# Notes\n\nSome context.\n")
        (source / ".DS_Store").write_bytes(b"\x00\x01garbage")
        (source / "photo.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)

        result = intake.ingest_directory(room, source)

        assert result.total == 5
        with db.room_session(room) as session:
            total = session.execute(select(func.count()).select_from(Document)).scalar_one()
            assert total == 5
            without_state = session.execute(
                select(func.count())
                .select_from(Document)
                .where(Document.processing_state.is_(None))
            ).scalar_one()
            assert without_state == 0

    def test_unsupported_files_carry_an_actionable_reason(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        source.mkdir()
        (source / "photo.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "photo.png")
            ).scalar_one()
            assert doc.processing_state == ProcessingState.UNSUPPORTED
            assert doc.state_detail is not None
            assert "image/png" in doc.state_detail

    def test_folder_paths_are_preserved(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        """Layout is evidence about the seller, not incidental packaging."""
        source = tmp_path / "room"
        (source / "02_Financial" / "backup").mkdir(parents=True)
        (source / "02_Financial" / "backup" / "old.txt").write_text("superseded\n")
        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "old.txt")
            ).scalar_one()
            assert doc.folder_path == "02_Financial/backup"

    def test_duplicates_are_recorded_not_dropped(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        (source / "a").mkdir(parents=True)
        (source / "b").mkdir(parents=True)
        (source / "a" / "same.txt").write_text("identical content\n")
        (source / "b" / "copy.txt").write_text("identical content\n")

        result = intake.ingest_directory(room, source)

        assert result.counts.get(ProcessingState.DUPLICATE) == 1
        with db.room_session(room) as session:
            dup = session.execute(
                select(Document).where(Document.processing_state == ProcessingState.DUPLICATE)
            ).scalar_one()
            assert dup.duplicate_of_id is not None
            assert dup.state_detail


class TestArchives:
    def test_archive_members_become_documents_with_container_provenance(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        source.mkdir()
        archive = source / "support.zip"
        with zipfile.ZipFile(archive, "w") as zf:
            zf.writestr("2023/return.txt", "Form 1065, tax year 2023.\n")
            zf.writestr("2024/return.txt", "Form 1065, tax year 2024.\n")

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            container = session.execute(
                select(Document).where(Document.filename == "support.zip")
            ).scalar_one()
            members = (
                session.execute(select(Document).where(Document.container_id == container.id))
                .scalars()
                .all()
            )
            assert len(members) == 2
            assert {m.filename for m in members} == {"return.txt"}
            assert all(m.folder_path.startswith("support.zip") for m in members)

    def test_encrypted_archive_is_unsupported_with_a_usable_reason(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        """The fixture plants one of these. Reporting "0 documents" would be a silent
        omission; reporting "supply the password" is an action the customer can take."""
        source = tmp_path / "room"
        source.mkdir()
        # Build an encrypted-looking archive by setting the encryption flag bit directly,
        # since stdlib zipfile cannot write encrypted entries.
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, "w") as zf:
            zf.writestr("secret.txt", "confidential\n")
        data = bytearray(raw.getvalue())
        for i in range(len(data) - 3):
            if data[i : i + 4] == b"PK\x03\x04":
                data[i + 6] |= 0x1
            if data[i : i + 4] == b"PK\x01\x02":
                data[i + 8] |= 0x1
        (source / "locked.zip").write_bytes(bytes(data))

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "locked.zip")
            ).scalar_one()
            assert doc.processing_state == ProcessingState.UNSUPPORTED
            assert "password" in (doc.state_detail or "")

    def test_entry_count_limit_refuses_expansion(self, room: uuid.UUID, tmp_path: Path) -> None:
        settings = Settings(
            storage_backend="filesystem",
            storage_root=tmp_path / "store",
            max_archive_entries=3,
        )
        intake = Intake(settings=settings, store=FilesystemStore(tmp_path / "store"))
        source = tmp_path / "room"
        source.mkdir()
        with zipfile.ZipFile(source / "many.zip", "w") as zf:
            for i in range(10):
                zf.writestr(f"f{i}.txt", "x")

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "many.zip")
            ).scalar_one()
            assert doc.processing_state == ProcessingState.UNSUPPORTED
            assert "over the 3 limit" in (doc.state_detail or "")

    def test_expanded_size_limit_refuses_a_bomb(self, room: uuid.UUID, tmp_path: Path) -> None:
        """A 400:1 compression ratio is how a small upload fills a disk."""
        settings = Settings(
            storage_backend="filesystem",
            storage_root=tmp_path / "store",
            max_archive_expanded_bytes=1024,
        )
        intake = Intake(settings=settings, store=FilesystemStore(tmp_path / "store"))
        source = tmp_path / "room"
        source.mkdir()
        with zipfile.ZipFile(source / "bomb.zip", "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("big.txt", "A" * 1_000_000)

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "bomb.zip")
            ).scalar_one()
            assert doc.processing_state == ProcessingState.UNSUPPORTED
            assert "limit" in (doc.state_detail or "")

    def test_zip_slip_members_are_refused(
        self, room: uuid.UUID, intake: Intake, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        source.mkdir()
        with zipfile.ZipFile(source / "slip.zip", "w") as zf:
            zf.writestr("../../escaped.txt", "should not be registered\n")
            zf.writestr("ok.txt", "fine\n")

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            names = session.execute(select(Document.filename)).scalars().all()
            assert "escaped.txt" not in names
            assert "ok.txt" in names

    def test_nesting_depth_is_capped(self, room: uuid.UUID, tmp_path: Path) -> None:
        settings = Settings(
            storage_backend="filesystem",
            storage_root=tmp_path / "store",
            max_archive_depth=1,
        )
        intake = Intake(settings=settings, store=FilesystemStore(tmp_path / "store"))
        source = tmp_path / "room"
        source.mkdir()

        inner = io.BytesIO()
        with zipfile.ZipFile(inner, "w") as zf:
            zf.writestr("deep.txt", "too deep\n")
        with zipfile.ZipFile(source / "outer.zip", "w") as zf:
            zf.writestr("inner.zip", inner.getvalue())

        intake.ingest_directory(room, source)

        with db.room_session(room) as session:
            doc = session.execute(
                select(Document).where(Document.filename == "inner.zip")
            ).scalar_one()
            assert doc.processing_state == ProcessingState.UNSUPPORTED
            assert "depth" in (doc.state_detail or "")


pytestmark = pytest.mark.integration
