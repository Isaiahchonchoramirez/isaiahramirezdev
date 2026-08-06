from __future__ import annotations

from itertools import pairwise

import pytest

from reef.config import Settings
from reef.extract.base import RawSpan, SpanKind
from reef.ingest.chunk import Chunk, TokenCounter, chunk_spans


@pytest.fixture
def counter() -> TokenCounter:
    # No model name, so the deterministic heuristic is used. Chunking behaviour must not
    # depend on a model download being available.
    return TokenCounter(None)


@pytest.fixture
def settings() -> Settings:
    return Settings(chunk_target_tokens=60, chunk_max_tokens=100)


def _span(
    text: str,
    kind: SpanKind = SpanKind.TEXT,
    breadcrumb: str = "",
    page: int = 1,
) -> RawSpan:
    return RawSpan(
        page_number=page,
        char_start=0,
        char_end=len(text),
        text=text,
        locator=f"page {page}",
        kind=kind,
        breadcrumb=breadcrumb,
    )


class TestSizeLimits:
    def test_no_chunk_exceeds_the_hard_maximum(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        """A chunk over the encoder's window is truncated at embed time while still
        claiming provenance over the text that never reached the model."""
        spans = [_span(" ".join(f"word{i}" for i in range(400)))]
        chunks = chunk_spans(spans, settings, counter)
        assert chunks
        for chunk in chunks:
            assert chunk.token_count <= settings.chunk_max_tokens

    def test_a_table_without_sentence_boundaries_still_splits(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        """Estimating a fixed word step from average tokens-per-word overshoots badly on
        rows of identifiers, which have no sentences to split on."""
        row = "\t".join(f"00{i:04d}" for i in range(300))
        chunks = chunk_spans([_span(row)], settings, counter)
        for chunk in chunks:
            assert chunk.token_count <= settings.chunk_max_tokens

    def test_short_documents_stay_in_one_chunk(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        chunks = chunk_spans([_span("A short clause about assignment.")], settings, counter)
        assert len(chunks) == 1


class TestStructure:
    def test_table_rows_are_never_merged_into_prose(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        spans = [
            _span("Introductory prose before the schedule."),
            _span("Hartwell\t1200000", kind=SpanKind.TABLE_ROW),
            _span("Ashby\t340000", kind=SpanKind.TABLE_ROW),
        ]
        chunks = chunk_spans(spans, settings, counter)
        rows = [c for c in chunks if c.granularity == "row"]
        assert len(rows) == 2
        assert all("Introductory prose" not in c.text for c in rows)

    def test_tables_produce_row_chunks_and_a_whole_table_chunk(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        """Questions arrive at both granularities: one supplier, or the whole schedule."""
        spans = [_span(f"Supplier{i}\t{i * 1000}", kind=SpanKind.TABLE_ROW) for i in range(5)]
        chunks = chunk_spans(spans, settings, counter)
        granularities = {c.granularity for c in chunks}
        assert granularities == {"row", "table"}
        table = next(c for c in chunks if c.granularity == "table")
        assert table.extra["row_count"] == 5
        assert len([c for c in chunks if c.granularity == "row"]) == 5

    def test_a_chunk_never_spans_two_pages(self, settings: Settings, counter: TokenCounter) -> None:
        """PDF anchor tolerance is zero pages, so a chunk covering pages 4 and 5 can only
        ever be half right."""
        spans = [
            _span("Text that lives on the fourth page.", page=4),
            _span("Text that lives on the fifth page.", page=5),
        ]
        chunks = chunk_spans(spans, settings, counter)
        assert len(chunks) == 2

    def test_breadcrumb_is_prepended_so_a_chunk_reads_alone(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        spans = [
            _span(
                "Tenant shall not assign this Lease without consent.",
                breadcrumb="Master Lease › 12 Assignment",
            )
        ]
        chunks = chunk_spans(spans, settings, counter)
        assert chunks[0].text.startswith("Master Lease › 12 Assignment › ")
        assert chunks[0].breadcrumb == "Master Lease › 12 Assignment"


class TestProvenance:
    def test_every_chunk_records_the_spans_it_came_from(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        spans = [_span(f"Paragraph number {i} with some content in it.") for i in range(6)]
        chunks = chunk_spans(spans, settings, counter)
        for chunk in chunks:
            assert chunk.span_indices
            assert all(0 <= i < len(spans) for i in chunk.span_indices)

    def test_all_spans_are_represented_somewhere(
        self, settings: Settings, counter: TokenCounter
    ) -> None:
        """No silent drops at the chunking stage either."""
        spans = [_span(f"Paragraph {i} with enough words to matter here.") for i in range(20)]
        chunks = chunk_spans(spans, settings, counter)
        covered: set[int] = set()
        for chunk in chunks:
            covered.update(chunk.span_indices)
        assert covered == set(range(len(spans)))


class TestOverlap:
    def test_overlap_carries_context_across_a_size_split(self, counter: TokenCounter) -> None:
        settings = Settings(
            chunk_target_tokens=40, chunk_max_tokens=100, chunk_section_overlap_ratio=0.3
        )
        spans = [_span(f"Sentence number {i} carrying some amount of content.") for i in range(12)]
        chunks = chunk_spans(spans, settings, counter)
        assert len(chunks) > 1
        # A carried tail means consecutive chunks share at least one source span.
        shared = any(set(a.span_indices) & set(b.span_indices) for a, b in pairwise(chunks))
        assert shared

    def test_overlap_can_be_disabled(self, counter: TokenCounter) -> None:
        settings = Settings(
            chunk_target_tokens=40, chunk_max_tokens=100, chunk_section_overlap_ratio=0.0
        )
        spans = [_span(f"Sentence number {i} carrying some amount of content.") for i in range(12)]
        chunks = chunk_spans(spans, settings, counter)
        for a, b in pairwise(chunks):
            assert not (set(a.span_indices) & set(b.span_indices))


class TestAbbreviations:
    def test_a_party_name_is_not_split_mid_clause(self, counter: TokenCounter) -> None:
        """Splitting "Ridgeline Industrial Services, Inc. v. Lakeside" at the abbreviation
        produces two chunks that each misstate the parties."""
        settings = Settings(chunk_target_tokens=1000, chunk_max_tokens=1000)
        text = "Ridgeline Industrial Services, Inc. v. Lakeside Steel Processing Co. filed suit."
        chunks = chunk_spans([_span(text)], settings, counter)
        assert len(chunks) == 1
        assert "Inc. v. Lakeside" in chunks[0].text


def test_chunk_is_a_plain_dataclass() -> None:
    chunk = Chunk(text="t", breadcrumb="", span_indices=[0], token_count=1)
    assert chunk.granularity == "section"
