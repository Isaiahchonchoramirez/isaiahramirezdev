"""OCR behind an interface, disabled by default.

Default-off is deliberate. A page Reef cannot read must be reported as unreadable, not
quietly filled with whatever a recogniser guessed at 40% confidence. Turning OCR on is a
decision with a quality cost attached, so it is made in configuration rather than assumed.

The interface exists so the Tesseract implementation can be replaced by a hosted vision
model without anything upstream changing — `TECH_STACK.md` puts OCR in the "buy commodity
extraction before building it" category, and this is the seam that makes that switch cheap.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from reef.config import Settings, get_settings
from reef.extract.base import RawSpan, SpanKind


@dataclass(slots=True)
class OcrPageResult:
    spans: list[RawSpan]
    #: 0.0-1.0. Recorded on the document so a reviewer can weigh a citation that came
    #: from a poor scan differently from one that came from a text layer.
    confidence: float


class OcrEngine(Protocol):
    def recognize_page(self, page: object, page_number: int) -> OcrPageResult | None: ...


class TesseractEngine:
    """Local Tesseract via pytesseract.

    Two details do most of the work here, and both were established by measuring against
    the fixture's deliberately degraded scan rather than by reasoning:

    **Render at the page's native raster resolution, then upscale in PIL.** Asking MuPDF
    to render an 850x1100 scan at 300 DPI resamples a low-resolution image up by 2.7x with
    a fast filter, which amplifies scanner noise into shapes that look like glyphs.
    Rendering at native resolution and upscaling with LANCZOS afterwards preserves stroke
    edges instead.

    **Median filter after upscaling, never before.** A median filter on the noisy
    low-resolution original erases thin strokes along with the noise. Applied after
    upscaling it removes interpolation speckle while the strokes are now several pixels
    wide and survive. Reversing the order turns readable output into nonsense — measured,
    not assumed.

    Word-level boxes are grouped back into lines so the resulting spans are comparable to
    the layout blocks a native PDF produces. Without that grouping, an OCR'd page yields
    hundreds of single-word spans and every citation points at one word.
    """

    #: Effective resolution to present to Tesseract after upscaling. Recognition improves
    #: steeply up to roughly this point and flattens above it while cost keeps rising.
    TARGET_EFFECTIVE_DPI = 440
    #: Guard against a huge page turning into an image that exhausts memory.
    MAX_PIXELS = 40_000_000

    def __init__(self, min_confidence: float = 0.0) -> None:
        #: Below this mean confidence the page is reported as unreadable rather than
        #: contributing text. Default 0 keeps every result, because the fixture expects a
        #: low-confidence page to remain processable; raise it when garbage costs more
        #: than a gap.
        self._min_confidence = min_confidence

    def _native_dpi(self, page: object) -> int:
        """Infer the resolution the page was actually scanned at.

        A scanned page is one large embedded image. Its pixel width against the page's
        width in points gives the real resolution; rendering above that invents detail.
        """
        import fitz

        assert isinstance(page, fitz.Page)
        width_inches = page.rect.width / 72.0
        if width_inches <= 0:
            return 150

        best = 0
        for image in page.get_images(full=True):
            pixel_width = image[2]
            if pixel_width > best:
                best = pixel_width
        if not best:
            return 150
        return int(max(72, min(400, round(best / width_inches))))

    def recognize_page(self, page: object, page_number: int) -> OcrPageResult | None:
        import fitz
        import pytesseract
        from PIL import Image, ImageFilter

        if not isinstance(page, fitz.Page):  # pragma: no cover - defensive
            return None

        dpi = self._native_dpi(page)
        pixmap = page.get_pixmap(dpi=dpi)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples).convert("L")

        upscale = max(1, round(self.TARGET_EFFECTIVE_DPI / dpi))
        while upscale > 1 and (image.width * upscale) * (image.height * upscale) > self.MAX_PIXELS:
            upscale -= 1

        if upscale > 1:
            image = image.resize(
                (image.width * upscale, image.height * upscale), Image.Resampling.LANCZOS
            )
            image = image.filter(ImageFilter.MedianFilter(3))

        try:
            data = pytesseract.image_to_data(
                image,
                # PSM 6 — "assume a single uniform block of text". The default mode runs
                # layout analysis first, and on a noisy scan that analysis fragments the
                # page into spurious columns and recognises each fragment badly.
                config="--psm 6",
                output_type=pytesseract.Output.DICT,
            )
        except Exception:  # pragma: no cover - tesseract missing or failed
            return None

        # Map OCR pixel coordinates back into page points. Derived from the final image
        # rather than the pixmap so the upscale factor is accounted for — a bbox off by
        # 4x points at the wrong quarter of the page, and the eval scores that as wrong,
        # not partial.
        scale = page.rect.width / image.width if image.width else 1.0
        lines: dict[tuple[int, int, int], list[int]] = {}
        for index, text in enumerate(data["text"]):
            if not text.strip():
                continue
            key = (data["block_num"][index], data["par_num"][index], data["line_num"][index])
            lines.setdefault(key, []).append(index)

        spans: list[RawSpan] = []
        confidences: list[float] = []
        cursor = 0

        for key in sorted(lines):
            indices = lines[key]
            words = [data["text"][i] for i in indices]
            word_confidences = [
                float(data["conf"][i]) for i in indices if float(data["conf"][i]) >= 0
            ]
            text = " ".join(words).strip()
            if not text:
                continue

            x0 = min(data["left"][i] for i in indices) * scale
            y0 = min(data["top"][i] for i in indices) * scale
            x1 = max(data["left"][i] + data["width"][i] for i in indices) * scale
            y1 = max(data["top"][i] + data["height"][i] for i in indices) * scale

            spans.append(
                RawSpan(
                    page_number=page_number,
                    char_start=cursor,
                    char_end=cursor + len(text),
                    text=text,
                    locator=f"page {page_number}",
                    bbox=[round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                    kind=SpanKind.TEXT,
                )
            )
            cursor += len(text) + 1
            confidences.extend(word_confidences)

        if not spans:
            return None

        mean_confidence = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
        if mean_confidence < self._min_confidence:
            # Below the floor the page is treated as unread. Reporting a gap is honest;
            # reporting confident nonsense is the failure this whole module guards against.
            return None

        return OcrPageResult(spans=spans, confidence=mean_confidence)


def get_engine(settings: Settings | None = None) -> OcrEngine | None:
    settings = settings or get_settings()
    if settings.ocr_provider == "tesseract":
        return TesseractEngine()
    return None


def tesseract_available() -> bool:
    """Whether the binary is actually installed, as opposed to the wrapper being importable."""
    import shutil

    return shutil.which("tesseract") is not None
