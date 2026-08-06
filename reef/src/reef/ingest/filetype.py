"""Type detection by content, never by extension.

`docs/reef/05-architecture.md` stage 1: "Never trust extensions." A seller who renames a
spreadsheet to `.pdf`, or an export process that writes `.xls` files containing XML, is
ordinary rather than adversarial — and either one silently corrupts a pipeline that
dispatches on the filename.

The mismatch itself is recorded rather than resolved silently: `declared_mime` keeps what
the extension claimed so a human can see the disagreement.
"""

from __future__ import annotations

import csv
import json
import zipfile
from dataclasses import dataclass
from io import BytesIO, StringIO
from pathlib import Path

# Formats the engine claims to support, per ADR-003 §4's input boundary. Eval gate G3
# scores parsing success against exactly this set — claiming a format the engine handles
# badly is worse than declaring it unsupported.
SUPPORTED_MIMES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "text/plain",
        "text/markdown",
    }
)

ARCHIVE_MIMES = frozenset({"application/zip"})

_EXTENSION_MIMES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".zip": "application/zip",
}

# Signatures checked in order. Longest and most specific first, because ZIP-container
# formats (DOCX, XLSX) share the `PK\x03\x04` prefix and must be disambiguated by looking
# inside rather than by the magic bytes alone.
_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"%PDF-", "application/pdf"),
    (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "application/vnd.ms-office"),  # legacy OLE2
    (b"PK\x03\x04", "application/zip"),
    (b"PK\x05\x06", "application/zip"),  # empty archive
    (b"PK\x07\x08", "application/zip"),  # spanned archive
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"%!PS", "application/postscript"),
    (b"\x1f\x8b", "application/gzip"),
    (b"BM", "image/bmp"),
    (b"II*\x00", "image/tiff"),
    (b"MM\x00*", "image/tiff"),
)

_OOXML_MARKERS = (
    (
        "word/document.xml",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    ("xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    (
        "ppt/presentation.xml",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ),
)


@dataclass(frozen=True, slots=True)
class DetectedType:
    mime: str
    declared_mime: str | None
    #: True when the extension disagrees with the content. Not an error — a fact worth
    #: surfacing, since it is occasionally the interesting thing about a document.
    mismatch: bool
    encrypted: bool = False


def _sniff_ooxml(data: bytes, path: Path | None) -> str:
    """A ZIP is only a ZIP until you look inside it.

    Archive members arrive as bytes with no path, so a BytesIO stands in — `zipfile`
    accepts any seekable file object.
    """
    try:
        source: Path | BytesIO = path if path is not None else BytesIO(data)
        with zipfile.ZipFile(source) as zf:
            names = set(zf.namelist())
            for marker, mime in _OOXML_MARKERS:
                if marker in names:
                    return mime
    except (zipfile.BadZipFile, OSError):
        pass
    return "application/zip"


def _looks_like_csv(data: bytes) -> bool:
    """Distinguish CSV from plain prose.

    A CSV that lands in the TXT path loses its per-row anchors and its cell values are
    never profiled, so the fixture's zero-padded customer ids stop being checkable. That
    is the canonical failure the eval calls out, and it starts here rather than in the
    parser.
    """
    try:
        head = data[:8192].decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return False
    lines = [ln for ln in head.splitlines() if ln.strip()]
    if len(lines) < 2:
        return False

    # Prose that happens to contain commas parses as a perfectly consistent table —
    # "We met Acme, Beta, and Gamma." is three fields on every line. Sentence-terminating
    # punctuation at end of line is the signal that separates the two: data rows almost
    # never end in a full stop, and sentences almost always do.
    sentence_endings = sum(1 for ln in lines[:20] if ln.rstrip().endswith((".", "!", "?")))
    if sentence_endings > len(lines[:20]) // 4:
        return False

    try:
        dialect = csv.Sniffer().sniff("\n".join(lines[:20]), delimiters=",;\t|")
    except csv.Error:
        return False
    reader = csv.reader(StringIO("\n".join(lines[:20])), dialect)
    counts = [len(row) for row in reader if row]
    if not counts or counts[0] < 2:
        return False
    # Consistent column count across rows is what separates a table from ragged text.
    return len(set(counts)) == 1


def _is_probably_text(data: bytes) -> bool:
    if b"\x00" in data[:8192]:
        return False
    try:
        data[:8192].decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def _looks_like_json(data: bytes) -> bool:
    head = data[:64].lstrip()
    if not head.startswith((b"{", b"[")):
        return False
    try:
        json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return False
    return True


def _looks_like_markdown(data: bytes) -> bool:
    try:
        head = data[:4096].decode("utf-8")
    except UnicodeDecodeError:
        return False
    markers = ("# ", "## ", "```", "| ---", "- [", "**")
    return any(m in head for m in markers)


def zip_is_encrypted(path: Path) -> bool:
    """An encrypted entry has bit 0 of its general-purpose flags set.

    This is checked before expansion because an encrypted archive must be registered as
    unsupported with a reason a human can act on — "supply the password" — rather than
    silently contributing zero documents to the coverage statement.
    """
    try:
        with zipfile.ZipFile(path) as zf:
            return any(info.flag_bits & 0x1 for info in zf.infolist())
    except (zipfile.BadZipFile, OSError):
        return False


def detect(path: Path | None, data: bytes, filename: str | None = None) -> DetectedType:
    name = filename if filename is not None else (path.name if path else "")
    declared = _EXTENSION_MIMES.get(Path(name).suffix.lower())

    mime: str | None = None
    for signature, candidate in _SIGNATURES:
        if data.startswith(signature):
            mime = candidate
            break

    if mime == "application/zip":
        mime = _sniff_ooxml(data, path)

    if mime is None:
        if _looks_like_json(data):
            mime = "application/json"
        elif _looks_like_csv(data):
            mime = "text/csv"
        elif _is_probably_text(data):
            mime = "text/markdown" if _looks_like_markdown(data) else "text/plain"
        else:
            mime = "application/octet-stream"

    # Plain text and markdown are the one case where the extension is better evidence than
    # the content: both are valid UTF-8 with no signature, and a `.md` file with no heading
    # in its first 4KB is still markdown. Content detection stays authoritative everywhere
    # a real signature exists.
    if declared in {"text/plain", "text/markdown", "text/csv"} and mime in {
        "text/plain",
        "text/markdown",
    }:
        mime = declared if declared != "text/csv" or _looks_like_csv(data) else mime

    encrypted = False
    if mime == "application/zip" and path is not None:
        encrypted = zip_is_encrypted(path)

    mismatch = declared is not None and declared != mime
    return DetectedType(mime=mime, declared_mime=declared, mismatch=mismatch, encrypted=encrypted)


def is_supported(mime: str) -> bool:
    return mime in SUPPORTED_MIMES


def is_archive(mime: str) -> bool:
    return mime in ARCHIVE_MIMES
