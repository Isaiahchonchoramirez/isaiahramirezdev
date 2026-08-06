"""PDF extraction with coordinates, and explicit rejection of bad text layers.

`docs/reef/05-architecture.md` stage 3: "Detect garbage text layers explicitly — a bad
text layer is worse than none because it silently poisons retrieval."

That is the whole difficulty of this file. A scanned page with no text layer is obvious
and handled. A scanned page carrying a text layer produced by a broken OCR pass looks
like a successful extraction: it returns characters, the pipeline accepts them, they get
embedded, and every downstream answer cites a page whose real content nobody read. The
checks below exist to make that case loud.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import fitz  # PyMuPDF

from reef.config import Settings, get_settings
from reef.extract.base import (
    ExtractionError,
    ExtractionResult,
    RawPage,
    RawSpan,
    SpanKind,
    TextSource,
)
from reef.extract.ocr import OcrEngine

#: Unicode replacement char and the private-use range fonts fall back to when a PDF has a
#: broken encoding map. Their presence in quantity means the text layer is decorative.
_SUSPECT_RANGES = ((0xE000, 0xF8FF), (0xFFFD, 0xFFFD))


def _suspect_ratio(text: str) -> float:
    if not text:
        return 0.0
    bad = sum(1 for ch in text if any(lo <= ord(ch) <= hi for lo, hi in _SUSPECT_RANGES))
    return bad / len(text)


def _alpha_ratio(text: str) -> float:
    """Fraction of non-space characters that are letters or digits.

    A text layer of mostly punctuation and box-drawing characters is a failed extraction
    wearing a successful one's clothes.
    """
    meaningful = [ch for ch in text if not ch.isspace()]
    if not meaningful:
        return 0.0
    return sum(1 for ch in meaningful if ch.isalnum()) / len(meaningful)


def text_layer_is_trustworthy(
    text: str, settings: Settings, image_coverage: float = 0.0
) -> tuple[bool, str]:
    """Return whether a page's text layer can be believed, and why not when it cannot.

    `image_coverage` is the fraction of the page covered by raster images, and it is what
    makes the sparseness test safe. A cover page, a section divider and a signature page
    are all legitimately short, and rejecting them for brevity alone would send clean
    documents to OCR and lose their real text. Sparse text becomes evidence of a bad scan
    only when there is a large image sitting under it.
    """
    stripped = text.strip()

    if not stripped:
        return False, "text layer holds only 0 characters"

    suspect = _suspect_ratio(stripped)
    if suspect > 0.05:
        return False, f"{suspect:.0%} of characters are unmapped glyphs"

    alpha = _alpha_ratio(stripped)
    if alpha < 0.5:
        return False, f"only {alpha:.0%} of characters are alphanumeric"

    if len(stripped) < settings.ocr_min_chars_per_page and image_coverage > 0.5:
        return False, (
            f"only {len(stripped)} characters of text over an image covering "
            f"{image_coverage:.0%} of the page"
        )

    return True, ""


def extract(
    path: Path | None,
    data: bytes,
    settings: Settings | None = None,
    ocr: OcrEngine | None = None,
) -> ExtractionResult:
    settings = settings or get_settings()
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # pragma: no cover - malformed input
        raise ExtractionError(f"PDF could not be opened: {exc}") from exc

    if doc.needs_pass:
        raise ExtractionError("PDF is password-protected; supply the password to process")

    result = ExtractionResult()
    native_pages = 0
    ocr_pages = 0
    rejected: list[dict[str, object]] = []
    confidences: list[float] = []

    try:
        for index in range(doc.page_count):
            page = doc.load_page(index)
            number = index + 1
            rect = page.rect
            result.pages.append(RawPage(number=number, width=rect.width, height=rect.height))

            page_text = page.get_text("text")
            trustworthy, reason = text_layer_is_trustworthy(
                page_text, settings, _image_coverage(page)
            )

            if trustworthy:
                native_pages += 1
                result.spans.extend(_spans_from_layout(page, number))
                continue

            rejected.append({"page": number, "reason": reason})
            if ocr is None:
                # No OCR configured. The page contributes nothing, and that absence is
                # recorded rather than papered over with an empty string — a page Reef
                # cannot read must never look like a page containing nothing.
                continue

            ocr_result = ocr.recognize_page(page, number)
            if ocr_result is None:
                continue
            ocr_pages += 1
            confidences.append(ocr_result.confidence)
            result.spans.extend(ocr_result.spans)
    finally:
        doc.close()

    if native_pages and ocr_pages:
        result.text_source = TextSource.MIXED
    elif ocr_pages:
        result.text_source = TextSource.OCR
    elif native_pages:
        result.text_source = TextSource.NATIVE
    else:
        result.text_source = TextSource.NONE

    if confidences:
        result.ocr_confidence = sum(confidences) / len(confidences)

    result.extra = {
        "page_count": len(result.pages),
        "native_pages": native_pages,
        "ocr_pages": ocr_pages,
        "rejected_text_layers": rejected,
    }

    if result.text_source is TextSource.NONE and result.pages:
        raise ExtractionError(
            f"no usable text on any of {len(result.pages)} pages "
            f"({rejected[0]['reason'] if rejected else 'unknown'}); "
            "enable OCR to process scanned documents"
        )

    return result


def _image_coverage(page: fitz.Page) -> float:
    """Fraction of the page area covered by raster image blocks.

    Overlapping images are summed rather than unioned, so the result is capped at 1.0.
    Precision beyond "is there a big image here" is not needed for the decision it feeds.
    """
    page_area = page.rect.width * page.rect.height
    if page_area <= 0:
        return 0.0

    covered = 0.0
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:  # 1 is an image block
            continue
        x0, y0, x1, y1 = block.get("bbox", (0, 0, 0, 0))
        covered += max(0.0, float(x1) - float(x0)) * max(0.0, float(y1) - float(y0))

    return min(1.0, float(covered) / float(page_area))


def _spans_from_layout(page: fitz.Page, number: int) -> list[RawSpan]:
    """One span per layout block, with its bounding box.

    Block granularity is chosen deliberately: character-level spans are unusable for
    highlighting and line-level spans split sentences across anchors, while a block is
    close to what a human means when they point at "that paragraph on page 4".
    """
    spans: list[RawSpan] = []
    cursor = 0
    layout = page.get_text("dict")

    for block in layout.get("blocks", []):
        if block.get("type") != 0:  # 0 is text; images carry no extractable characters
            continue
        lines = block.get("lines", [])
        text = "".join(
            "".join(piece.get("text", "") for piece in line.get("spans", [])) + "\n"
            for line in lines
        ).strip()
        if not text:
            continue

        bbox = [round(float(v), 2) for v in block.get("bbox", (0, 0, 0, 0))]
        spans.append(
            RawSpan(
                page_number=number,
                char_start=cursor,
                char_end=cursor + len(text),
                text=text,
                locator=f"page {number}",
                bbox=bbox,
                kind=_classify(text, lines),
            )
        )
        cursor += len(text) + 1

    return spans


def _classify(text: str, lines: list[dict[str, Any]]) -> SpanKind:
    """Cheap structural classification from font size and shape.

    Headings matter because they become chunk breadcrumbs, and a chunk that knows it sits
    under "§12 Assignment" is interpretable alone while the same text without that path
    is not.
    """
    if len(text) < 120 and len(lines) <= 2:
        sizes = [piece.get("size", 0.0) for line in lines for piece in line.get("spans", [])]
        flags = [piece.get("flags", 0) for line in lines for piece in line.get("spans", [])]
        bold = any(int(f) & 2**4 for f in flags)
        if sizes and (max(sizes) >= 13.0 or bold) and not text.endswith("."):
            return SpanKind.HEADING
    return SpanKind.TEXT


def render_page(data: bytes, page_number: int, dpi: int = 150) -> bytes:
    """Render one page to PNG for the evidence highlight.

    150 DPI is the point where clause-level text stays legible when a reviewer zooms into
    a citation, without making a 300-page document's renders larger than the document.
    """
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        page = doc.load_page(page_number - 1)
        pixmap = page.get_pixmap(dpi=dpi)
        return bytes(pixmap.tobytes("png"))
    finally:
        doc.close()
