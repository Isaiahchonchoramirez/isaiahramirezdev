from __future__ import annotations

import io
from pathlib import Path

import fitz
import pytest
from openpyxl import Workbook

from reef.config import Settings
from reef.extract import ExtractionError, extract_document
from reef.extract.base import SpanKind, TextSource
from reef.extract.pdf import text_layer_is_trustworthy

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx(rows: list[list[object]], sheet_name: str = "Sheet1") -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.title = sheet_name
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


class TestNoTypeCoercion:
    """`000418` becoming `418` is the canonical failure named in DEAL_ROOM_EVAL.md.

    A customer id, a zip code, a GL account and a part number all look like numbers, and
    a parser that converts them destroys the join key the reconciliation depends on.
    """

    def test_csv_preserves_leading_zeros(self, tmp_path: Path) -> None:
        path = tmp_path / "customers.csv"
        path.write_text("customer_id,name\n000418,Lakeside\n000742,Consolidated\n")
        result = extract_document("text/csv", path.read_bytes(), path)

        assert any("000418" in span.text for span in result.spans)
        assert not any(
            "\t418\t" in span.text or span.text.startswith("418") for span in result.spans
        )

    def test_xlsx_preserves_text_cells_that_look_numeric(self) -> None:
        data = _xlsx([["customer_id"], ["000418"], ["0001"]])
        result = extract_document(XLSX_MIME, data)
        text = "\n".join(span.text for span in result.spans)
        assert "000418" in text
        assert "0001" in text

    def test_xlsx_reports_numbers_as_stored(self) -> None:
        """The other half of the same finding: the workbook genuinely holds 418, and
        reporting it as 000418 would be just as wrong in the opposite direction."""
        data = _xlsx([["customer_id"], [418]])
        result = extract_document(XLSX_MIME, data)
        assert any(span.text.strip() == "418" for span in result.spans)

    def test_integral_floats_do_not_gain_a_decimal_point(self) -> None:
        data = _xlsx([["amount"], [3676485.0]])
        result = extract_document(XLSX_MIME, data)
        assert any("3676485" in span.text for span in result.spans)
        assert not any("3676485.0" in span.text for span in result.spans)


class TestAnchors:
    def test_xlsx_locator_matches_the_ground_truth_anchor_format(self) -> None:
        """Ground truth writes anchors as "sheet FY25 row 3". Producing a different shape
        makes an otherwise-correct finding unscoreable."""
        data = _xlsx([["header"], ["a"], ["b"]], sheet_name="FY25")
        result = extract_document(XLSX_MIME, data)
        assert result.spans[0].locator == "sheet FY25 row 1"
        assert result.spans[2].locator == "sheet FY25 row 3"

    def test_csv_rows_are_one_indexed_with_the_header_as_row_one(self, tmp_path: Path) -> None:
        path = tmp_path / "t.csv"
        path.write_text("id,name\nQ-011,first\nQ-012,second\n")
        result = extract_document("text/csv", path.read_bytes(), path)
        assert result.spans[0].locator == "row 1"
        assert "Q-011" in result.spans[1].text
        assert result.spans[1].locator == "row 2"

    def test_every_span_carries_a_location(self, tmp_path: Path) -> None:
        """The contract of the extraction layer: no text without a location."""
        path = tmp_path / "notes.md"
        path.write_text("# Title\n\nA paragraph of prose.\n\n## Section\n\nMore prose.\n")
        result = extract_document("text/markdown", path.read_bytes(), path)
        assert result.spans
        for span in result.spans:
            assert span.locator
            assert span.page_number >= 1
            assert span.char_end >= span.char_start

    def test_markdown_headings_build_breadcrumbs(self, tmp_path: Path) -> None:
        path = tmp_path / "lease.md"
        path.write_text("# Master Lease\n\n## 12 Assignment\n\nTenant shall not assign.\n")
        result = extract_document("text/markdown", path.read_bytes(), path)
        body = [s for s in result.spans if s.text.startswith("Tenant shall not")]
        assert body
        assert body[0].breadcrumb == "Master Lease › 12 Assignment"


class TestGarbageTextLayers:
    """A bad text layer is worse than none, because it silently poisons retrieval."""

    def test_sparse_text_over_a_full_page_image_is_rejected(self) -> None:
        settings = Settings(ocr_min_chars_per_page=80)
        trustworthy, reason = text_layer_is_trustworthy(
            "a few words only", settings, image_coverage=0.95
        )
        assert trustworthy is False
        assert "image covering" in reason

    def test_sparse_text_without_an_image_is_kept(self) -> None:
        """A cover page or a signature page is legitimately short. Sending it to OCR
        would discard the real text it does have."""
        settings = Settings(ocr_min_chars_per_page=80)
        trustworthy, _ = text_layer_is_trustworthy(
            "Schedule 4.1 — Customer Contracts", settings, image_coverage=0.0
        )
        assert trustworthy is True

    def test_a_page_with_no_text_at_all_is_rejected(self) -> None:
        settings = Settings(ocr_min_chars_per_page=80)
        trustworthy, reason = text_layer_is_trustworthy("   \n  ", settings)
        assert trustworthy is False
        assert "0 characters" in reason

    def test_unmapped_glyphs_are_rejected(self) -> None:
        settings = Settings(ocr_min_chars_per_page=10)
        # Private-use codepoints are what a PDF with a broken encoding map produces.
        garbage = "" * 40 + "some real words here to pad the length out"
        trustworthy, reason = text_layer_is_trustworthy(garbage, settings)
        assert trustworthy is False
        assert "unmapped" in reason

    def test_mostly_punctuation_is_rejected(self) -> None:
        settings = Settings(ocr_min_chars_per_page=10)
        trustworthy, reason = text_layer_is_trustworthy("...---===+++///|||" * 10, settings)
        assert trustworthy is False
        assert "alphanumeric" in reason

    def test_ordinary_prose_is_accepted(self) -> None:
        settings = Settings(ocr_min_chars_per_page=80)
        prose = (
            "This Master Service Agreement is entered into by Ridgeline Industrial "
            "Services LLC and Lakeside Steel Processing Company as of January 1."
        )
        trustworthy, reason = text_layer_is_trustworthy(prose, settings)
        assert trustworthy is True
        assert reason == ""

    def test_scanned_pdf_without_ocr_fails_with_an_actionable_reason(self) -> None:
        """Reporting an empty page as successfully processed is the failure. Reporting
        "enable OCR" is an action the operator can take."""
        document = fitz.open()
        document.new_page(width=612, height=792)
        data = document.tobytes()
        document.close()

        with pytest.raises(ExtractionError) as exc:
            extract_document("application/pdf", data, settings=Settings(ocr_provider="none"))
        assert "OCR" in str(exc.value)


class TestPdfGeometry:
    def test_spans_carry_bounding_boxes_and_page_numbers(self) -> None:
        document = fitz.open()
        page = document.new_page(width=612, height=792)
        page.insert_text((72, 100), "Ridgeline Industrial Services LLC entered into a lease.")
        page.insert_text((72, 130), "The premises are located at 812 Bayfront Industrial Drive.")
        data = document.tobytes()
        document.close()

        result = extract_document("application/pdf", data, settings=Settings())

        assert result.text_source is TextSource.NATIVE
        assert result.pages[0].number == 1
        assert result.spans
        for span in result.spans:
            assert span.bbox is not None
            assert len(span.bbox) == 4
            assert span.locator == "page 1"

    def test_page_numbers_are_one_indexed(self) -> None:
        """PDF anchor tolerance is zero pages. An off-by-one here is a scored failure."""
        document = fitz.open()
        for index in range(3):
            page = document.new_page(width=612, height=792)
            page.insert_text((72, 100), f"This is page number {index + 1} of the document.")
        data = document.tobytes()
        document.close()

        result = extract_document("application/pdf", data, settings=Settings())
        numbers = sorted({span.page_number for span in result.spans})
        assert numbers == [1, 2, 3]
        third = [s for s in result.spans if s.page_number == 3]
        assert "page number 3" in third[0].text


class TestEncoding:
    def test_cp1252_csv_is_decoded_rather_than_mangled(self, tmp_path: Path) -> None:
        path = tmp_path / "eu.csv"
        path.write_bytes("name,fee\nCaf\xe9 Ltd,\xa31000\n".encode("cp1252"))
        result = extract_document("text/csv", path.read_bytes(), path)
        text = "\n".join(s.text for s in result.spans)
        assert "Caf" in text
        assert "�" not in text or "£" in text


class TestTableGranularity:
    def test_markdown_tables_produce_row_spans_as_well_as_the_table(self, tmp_path: Path) -> None:
        """Questions arrive at both granularities — one supplier, or the whole schedule."""
        path = tmp_path / "suppliers.md"
        path.write_text(
            "# Suppliers\n\n"
            "| name | spend |\n| --- | --- |\n| Hartwell | 1200000 |\n| Ashby | 340000 |\n"
        )
        result = extract_document("text/markdown", path.read_bytes(), path)
        kinds = {span.kind for span in result.spans}
        assert SpanKind.TABLE in kinds
        assert SpanKind.TABLE_ROW in kinds
        rows = [s for s in result.spans if s.kind is SpanKind.TABLE_ROW]
        assert any("Hartwell" in r.text for r in rows)
