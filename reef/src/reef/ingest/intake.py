"""Stage 1 — intake.

Hash, dedupe, detect type by content, expand archives, store the original. Every supplied
file leaves this stage with exactly one processing state and, when that state is not OK, a
reason a human can act on.

Eval gates G1 and G2 sit at 100% and are the reason this stage exists as its own step:
"every supplied file has a processing state, no silent drops" and "each file correctly
marked processable / unprocessable". A file that is skipped rather than registered is the
failure those gates were written to catch, so nothing here is allowed to `continue`
without writing a row.
"""

from __future__ import annotations

import hashlib
import uuid
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

import structlog
from sqlalchemy.orm import Session

from reef.config import Settings, get_settings
from reef.db import room_session
from reef.ingest import filetype
from reef.models import Document, IngestRun, ProcessingState
from reef.provenance import document_id
from reef.storage import ObjectStore, get_store, original_key

log = structlog.get_logger(__name__)

#: Files a data room accumulates that are not documents. Registered as unsupported with a
#: reason rather than skipped, because "we ignored 40 files" and "the room contained 40
#: OS artifacts" are different statements and only the second one is honest.
NOISE_NAMES = frozenset({".DS_Store", "Thumbs.db", "desktop.ini", ".gitkeep"})


@dataclass(slots=True)
class IntakeResult:
    run_id: uuid.UUID
    room_id: uuid.UUID
    document_ids: list[uuid.UUID] = field(default_factory=list)
    #: Counts by processing state. The coverage statement is derived from the database
    #: rather than from these, but they make a CLI run legible without a query.
    counts: dict[str, int] = field(default_factory=dict)

    @property
    def total(self) -> int:
        return sum(self.counts.values())


@dataclass(slots=True)
class _Candidate:
    """One file to register, whether it came from disk or from inside an archive."""

    filename: str
    folder_path: str
    data: bytes
    #: Real path on disk, or None when the bytes came from an archive. Type detection
    #: needs it for the encrypted-ZIP check, which reads the central directory.
    path: Path | None
    container_id: uuid.UUID | None = None
    depth: int = 0


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _walk_directory(root: Path) -> Iterator[tuple[Path, str]]:
    """Yield every file under `root` with its folder path relative to the room.

    Folder layout is preserved verbatim because it is evidence about the seller — what
    they organised, what they dumped in a misc folder, what they never created at all.
    """
    for path in sorted(root.rglob("*")):
        if path.is_file() and not path.is_symlink():
            relative = path.parent.relative_to(root)
            yield path, "" if relative == Path(".") else str(relative)


class Intake:
    def __init__(
        self,
        settings: Settings | None = None,
        store: ObjectStore | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._store = store or get_store(self._settings)

    def ingest_directory(
        self,
        room_id: uuid.UUID,
        root: Path,
        exclude: frozenset[str] = frozenset(),
    ) -> IntakeResult:
        """Register every file under `root` into `room_id`.

        `exclude` names top-level entries to skip — the eval harness uses it to keep the
        answer key out of the system under test, which is a requirement of
        `docs/evaluation/DEAL_ROOM_EVAL.md` rather than a convenience.
        """
        root = root.resolve()
        result = IntakeResult(run_id=uuid.uuid4(), room_id=room_id)
        counts: dict[str, int] = {}

        with room_session(room_id) as session:
            run = IngestRun(id=result.run_id, room_id=room_id, source=str(root))
            session.add(run)
            session.flush()

            # sha256 -> document id, for dedupe within this room. Seeded from what is
            # already stored so a second ingest into the same room dedupes against the
            # first rather than silently duplicating it.
            seen: dict[str, uuid.UUID] = dict(
                session.query(Document.sha256, Document.id).tuples().all()
            )

            queue: list[_Candidate] = []
            for path, folder in _walk_directory(root):
                top = Path(folder).parts[0] if folder else path.name
                if top in exclude or path.name in exclude:
                    continue
                try:
                    data = path.read_bytes()
                except OSError as exc:
                    self._register_failure(
                        session, room_id, path.name, folder, f"unreadable: {exc}", counts
                    )
                    continue
                queue.append(_Candidate(path.name, folder, data, path))

            while queue:
                candidate = queue.pop(0)
                document, children = self._register(session, room_id, candidate, seen)
                counts[document.processing_state] = counts.get(document.processing_state, 0) + 1
                result.document_ids.append(document.id)
                queue.extend(children)

            run.complete = True
            run.extra = {"counts": counts, "root": str(root)}

        result.counts = counts
        log.info("intake.complete", room_id=str(room_id), total=result.total, counts=counts)
        return result

    def _register(
        self,
        session: Session,
        room_id: uuid.UUID,
        candidate: _Candidate,
        seen: dict[str, uuid.UUID],
    ) -> tuple[Document, list[_Candidate]]:
        settings = self._settings
        digest = sha256_bytes(candidate.data)
        size = len(candidate.data)
        # Derived, so re-ingesting an unchanged room reuses the same identity rather than
        # minting a new one and orphaning every citation into it.
        derived_id = document_id(room_id, candidate.folder_path, candidate.filename, digest)

        # Intake is idempotent. The same bytes at the same path in the same room are the
        # same supplied file, not a new one and not a duplicate of themselves — re-running
        # after a partial failure must not insert a second row. Checked before anything
        # else, because every path below constructs a row with this id.
        already = session.get(Document, derived_id)
        if already is not None:
            # Archive members were expanded on the first pass and carry derived ids too,
            # so they are already present; re-expanding would do nothing but repeat work.
            return already, []

        document = Document(
            id=derived_id,
            room_id=room_id,
            sha256=digest,
            filename=candidate.filename,
            folder_path=candidate.folder_path,
            size_bytes=size,
            mime="application/octet-stream",
            container_id=candidate.container_id,
        )

        if candidate.filename in NOISE_NAMES:
            document.processing_state = ProcessingState.UNSUPPORTED
            document.state_detail = "operating-system artifact, not a supplied document"
            session.add(document)
            session.flush()
            return document, []

        detected = filetype.detect(candidate.path, candidate.data, candidate.filename)
        document.mime = detected.mime
        document.declared_mime = detected.declared_mime
        if detected.mismatch:
            document.extra = {
                "extension_mismatch": {
                    "declared": detected.declared_mime,
                    "detected": detected.mime,
                }
            }

        if size > settings.max_file_bytes:
            document.processing_state = ProcessingState.UNSUPPORTED
            document.state_detail = (
                f"exceeds the {settings.max_file_bytes} byte intake limit at {size} bytes"
            )
            session.add(document)
            session.flush()
            return document, []

        # Dedupe is recorded, never dropped. The same bytes under two names is a fact
        # about how the room was assembled, and the coverage statement must account for
        # both files.
        if digest in seen:
            document.processing_state = ProcessingState.DUPLICATE
            document.duplicate_of_id = seen[digest]
            document.state_detail = "identical content already registered in this room"
            session.add(document)
            session.flush()
            return document, []

        self._store.put(settings.originals_bucket, original_key(room_id, digest), candidate.data)
        document.storage_key = original_key(room_id, digest)
        session.add(document)
        session.flush()
        seen[digest] = document.id

        if filetype.is_archive(detected.mime):
            children = self._expand_archive(document, candidate, detected)
            return document, children

        if not filetype.is_supported(detected.mime):
            document.processing_state = ProcessingState.UNSUPPORTED
            document.state_detail = f"no parser for {detected.mime}"
        else:
            document.processing_state = ProcessingState.PENDING

        return document, []

    def _expand_archive(
        self,
        document: Document,
        candidate: _Candidate,
        detected: filetype.DetectedType,
    ) -> list[_Candidate]:
        """Expand a ZIP under explicit limits.

        Uploads are the attack surface, and an archive is the cheapest way to turn a
        500KB upload into a full disk. Entry count, expanded size and nesting depth are
        each capped separately because they fail differently: many tiny files exhaust
        inodes, one huge file exhausts space, and deep nesting exhausts the expander.
        """
        settings = self._settings

        if detected.encrypted:
            document.processing_state = ProcessingState.UNSUPPORTED
            document.state_detail = "archive is password-protected; supply the password to process"
            return []

        if candidate.depth >= settings.max_archive_depth:
            document.processing_state = ProcessingState.UNSUPPORTED
            document.state_detail = f"archive nesting exceeds depth {settings.max_archive_depth}"
            return []

        children: list[_Candidate] = []
        expanded = 0
        try:
            source = candidate.path if candidate.path is not None else BytesIO(candidate.data)
            with zipfile.ZipFile(source) as zf:
                infos = [i for i in zf.infolist() if not i.is_dir()]

                if len(infos) > settings.max_archive_entries:
                    document.processing_state = ProcessingState.UNSUPPORTED
                    document.state_detail = (
                        f"archive holds {len(infos)} entries, over the "
                        f"{settings.max_archive_entries} limit"
                    )
                    return []

                declared_total = sum(i.file_size for i in infos)
                if declared_total > settings.max_archive_expanded_bytes:
                    document.processing_state = ProcessingState.UNSUPPORTED
                    document.state_detail = (
                        f"archive declares {declared_total} expanded bytes, over the "
                        f"{settings.max_archive_expanded_bytes} limit"
                    )
                    return []

                for info in infos:
                    name = Path(info.filename)
                    # A member path containing `..` or an absolute root is a zip-slip
                    # attempt. Reef never writes archive members to disk by their own
                    # name, so this cannot escape anything — but a member that tries is
                    # worth refusing rather than quietly normalising.
                    if info.filename.startswith("/") or ".." in name.parts:
                        continue
                    with zf.open(info) as fh:
                        # Read one byte past the limit so a lying header is caught by the
                        # actual read rather than trusted from the central directory.
                        data = fh.read(settings.max_archive_expanded_bytes - expanded + 1)
                    expanded += len(data)
                    if expanded > settings.max_archive_expanded_bytes:
                        document.processing_state = ProcessingState.UNSUPPORTED
                        document.state_detail = (
                            "archive expands beyond the "
                            f"{settings.max_archive_expanded_bytes} byte limit"
                        )
                        return []

                    inner_folder = str(
                        Path(candidate.folder_path) / candidate.filename / name.parent
                    )
                    inner_folder = inner_folder.replace("/.", "").rstrip("/")
                    children.append(
                        _Candidate(
                            filename=name.name,
                            folder_path=inner_folder,
                            data=data,
                            path=None,
                            container_id=document.id,
                            depth=candidate.depth + 1,
                        )
                    )
        except (zipfile.BadZipFile, RuntimeError, OSError) as exc:
            document.processing_state = ProcessingState.FAILED
            document.state_detail = f"archive could not be expanded: {exc}"
            return []

        document.processing_state = ProcessingState.INDEXED
        document.state_detail = None
        document.extra = {**(document.extra or {}), "archive_entries": len(children)}
        return children

    def _register_failure(
        self,
        session: Session,
        room_id: uuid.UUID,
        filename: str,
        folder: str,
        detail: str,
        counts: dict[str, int],
    ) -> None:
        # `merge` rather than `add`: a file that was unreadable on the first pass is still
        # unreadable on the second, and the derived id would collide.
        session.merge(
            Document(
                id=document_id(room_id, folder, filename, ""),
                room_id=room_id,
                sha256="",
                filename=filename,
                folder_path=folder,
                size_bytes=0,
                mime="application/octet-stream",
                processing_state=ProcessingState.FAILED,
                state_detail=detail,
            )
        )
        session.flush()
        counts[ProcessingState.FAILED] = counts.get(ProcessingState.FAILED, 0) + 1
