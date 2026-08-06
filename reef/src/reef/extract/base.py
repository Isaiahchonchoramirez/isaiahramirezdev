"""Extraction result types shared by every format handler.

The contract every handler honours: text is never returned without a location. A fragment
with no route back to its rendered source is unusable for Reef, so there is deliberately
no way to express one in these types — `RawSpan` requires a page and a character range,
and the extractor that cannot supply them must fail rather than guess.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class TextSource(StrEnum):
    """Where a document's text came from. Retrieval quality and anchor tolerance both
    depend on this, so it is recorded rather than inferred later."""

    NATIVE = "native"
    OCR = "ocr"
    MIXED = "mixed"
    NONE = "none"


class SpanKind(StrEnum):
    TEXT = "text"
    HEADING = "heading"
    TABLE_ROW = "table_row"
    TABLE = "table"
    LIST_ITEM = "list_item"
    CELL = "cell"


@dataclass(slots=True)
class RawSpan:
    """A located fragment of source text, before it reaches the database."""

    page_number: int
    char_start: int
    char_end: int
    text: str
    #: Human-readable, format-native address: "page 7", "sheet FY25 row 3", "row 41".
    #: The eval matches produced anchors against these strings, so their shape is a
    #: scored interface rather than a display detail.
    locator: str
    #: [x0, y0, x1, y1] where the format has geometry. None for CSV rows and text lines,
    #: which have an address but not a rectangle.
    bbox: list[float] | None = None
    kind: SpanKind = SpanKind.TEXT
    #: Section path this span sits under, used to build chunk breadcrumbs.
    breadcrumb: str = ""


@dataclass(slots=True)
class RawPage:
    number: int
    width: float
    height: float


@dataclass(slots=True)
class ExtractionResult:
    spans: list[RawSpan] = field(default_factory=list)
    pages: list[RawPage] = field(default_factory=list)
    text_source: TextSource = TextSource.NATIVE
    ocr_confidence: float | None = None
    #: Format-specific detail worth keeping — sheet names, detected encoding, whether a
    #: PDF's text layer was rejected and why.
    extra: dict[str, object] = field(default_factory=dict)

    @property
    def total_chars(self) -> int:
        return sum(len(s.text) for s in self.spans)


class ExtractionError(Exception):
    """Raised when a document cannot be parsed. The message becomes `state_detail` and is
    read by a human deciding what to do about the file, so it says what went wrong in
    words rather than naming an exception class."""
