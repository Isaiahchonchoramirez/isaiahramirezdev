"""Format dispatch.

One entry point, `extract_document`, chosen by detected MIME type — never by extension,
since intake already established that the extension may be lying.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from reef.config import Settings, get_settings
from reef.extract import ocr as ocr_module
from reef.extract import pdf, tabular, textual
from reef.extract.base import (
    ExtractionError,
    ExtractionResult,
    RawPage,
    RawSpan,
    SpanKind,
    TextSource,
)

__all__ = [
    "ExtractionError",
    "ExtractionResult",
    "RawPage",
    "RawSpan",
    "SpanKind",
    "TextSource",
    "extract_document",
    "supported_mimes",
]

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_Handler = Callable[[Path | None, bytes], ExtractionResult]

_HANDLERS: dict[str, _Handler] = {
    XLSX_MIME: tabular.extract_xlsx,
    DOCX_MIME: textual.extract_docx,
    "text/csv": tabular.extract_csv,
    "text/markdown": textual.extract_markdown,
    "text/plain": lambda path, data: textual.extract_text(path, data, markdown=False),
}


def supported_mimes() -> frozenset[str]:
    return frozenset({*_HANDLERS, "application/pdf"})


def extract_document(
    mime: str,
    data: bytes,
    path: Path | None = None,
    settings: Settings | None = None,
) -> ExtractionResult:
    settings = settings or get_settings()

    if mime == "application/pdf":
        # PDF is the only format whose handler needs configuration, because it is the only
        # one where a text layer can exist and be untrustworthy.
        return pdf.extract(path, data, settings=settings, ocr=ocr_module.get_engine(settings))

    handler = _HANDLERS.get(mime)
    if handler is None:
        raise ExtractionError(f"no parser for {mime}")
    return handler(path, data)
