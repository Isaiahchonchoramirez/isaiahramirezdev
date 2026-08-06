"""Deterministic evidence identity.

An evidence identifier is a permanent reference. A citation lands in a memo, a report, a
URL, an auditor's working papers — and then the room is re-ingested because a parser
improved or a document was added. If identifiers are random, every one of those references
silently breaks, or worse, points at a different span that now happens to hold that id's
old position.

So identifiers are derived, not generated. The same bytes, processed by the same pipeline
version, always produce the same span and chunk ids. A different document version has a
different SHA-256 and therefore different ids, which is what makes revisions
distinguishable rather than confusing.

`PIPELINE_VERSION` is part of every derivation on purpose. When extraction or chunking
changes in a way that moves boundaries, the ids must change too — an id that survived a
boundary change would point at different text than it did before, which is the failure
this module exists to prevent.
"""

from __future__ import annotations

import uuid

#: Fixed namespace for all derived Reef identifiers. Never change this value: it would
#: re-key every identifier in every deployment at once.
NAMESPACE = uuid.UUID("6ee5f5a2-1f4c-5b3e-9d47-3a1c8f2b7e10")

#: Bump when extraction or chunking changes span or chunk boundaries.
#:
#: This is a boundary-compatibility version, not a release version. A bug fix that leaves
#: boundaries identical does not bump it; a change to chunk sizing, span granularity, or
#: locator format does. Bumping re-keys derived identifiers, which is the intended effect —
#: the old ids referred to different text.
PIPELINE_VERSION = "1"

#: Parser identity per MIME type, recorded on each document so a future run can tell which
#: extractor produced a given anchor. `TECH_STACK.md` calls for coordinate-preserving
#: output from proven parsers; knowing which one ran is what makes a regression traceable
#: to a dependency upgrade rather than to the corpus.
EXTRACTORS = {
    "application/pdf": "pymupdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "openpyxl",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "python-docx",
    "text/csv": "stdlib-csv",
    "text/plain": "stdlib-text",
    "text/markdown": "stdlib-text",
}


def extractor_for(mime: str) -> str:
    return EXTRACTORS.get(mime, "none")


def document_id(room_id: uuid.UUID, folder_path: str, filename: str, sha256: str) -> uuid.UUID:
    """Identity of a supplied file within a room.

    Keyed on path as well as content, because the same bytes supplied twice under different
    names are two supplied files and the coverage statement must account for both. Keyed on
    content as well as path, because a revision at the same path is a different document.
    """
    return uuid.uuid5(NAMESPACE, f"doc:{room_id}:{folder_path}/{filename}:{sha256}")


def span_id(document: uuid.UUID, page_number: int, char_start: int, char_end: int) -> uuid.UUID:
    """Identity of a located fragment.

    Page plus character range is unique within a document by construction — the extractors
    advance a single cursor — and it is exactly the coordinate a citation resolves against.
    """
    return uuid.uuid5(
        NAMESPACE,
        f"span:{PIPELINE_VERSION}:{document}:{page_number}:{char_start}:{char_end}",
    )


def chunk_id(document: uuid.UUID, granularity: str, ordinal: int) -> uuid.UUID:
    """Identity of a retrievable unit.

    Granularity is part of the key because a table contributes a whole-table chunk and a
    per-row chunk at the same ordinal, and they are different units of evidence.
    """
    return uuid.uuid5(NAMESPACE, f"chunk:{PIPELINE_VERSION}:{document}:{granularity}:{ordinal}")
