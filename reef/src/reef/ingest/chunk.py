"""Structure-aware chunking.

`docs/reef/05-architecture.md`: "Chunking quality determines answer quality more than
model choice does, and it is entirely in Reef's control."

Rules carried over from that document, and one deliberate deviation from it:

- split on structure, then size;
- never split a clause, a table row, or a signature block;
- prepend a breadcrumb so a retrieved chunk is interpretable alone;
- overlap at section boundaries only, not everywhere;
- tables become both a whole-table chunk and per-row chunks.

**The deviation: target 420 tokens and hard max 500, not 800 and 1500.** The architecture
document set 800/1500 without reference to an encoder. The local embedding model accepts
512 tokens and silently truncates beyond that, so an 800-token chunk would be stored whole
while its vector represented only the first two thirds — and the chunk's span range would
claim provenance over text that never reached the model. A retrieval miss is recoverable;
a citation that points at text the system never encoded is the failure mode this codebase
exists to prevent. The size follows the encoder, and if the encoder is replaced with a
long-context model these numbers should move with it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from reef.config import Settings, get_settings
from reef.extract.base import RawSpan, SpanKind

#: Sentence boundary for the last-resort split of an over-long single span. Deliberately
#: conservative about abbreviations, because splitting "Section 4.1 Inc. v. Ridgeline" in
#: the middle produces two chunks that each misstate the party.
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'(\[])")

_ABBREVIATIONS = frozenset(
    {"inc.", "llc.", "ltd.", "co.", "corp.", "no.", "art.", "sec.", "fig.", "v.", "vs.", "u.s."}
)


@dataclass(slots=True)
class Chunk:
    text: str
    breadcrumb: str
    span_indices: list[int]
    token_count: int
    granularity: str = "section"
    ordinal: int = 0
    #: Populated only for the whole-table chunk, naming the rows it summarises.
    extra: dict[str, object] = field(default_factory=dict)


class TokenCounter:
    """Counts tokens the way the embedding model will.

    A heuristic like `len(text) // 4` is off by 30-40% on tabular text, which is most of a
    data room. Being wrong in that direction means chunks that overflow the encoder and get
    truncated — the exact failure this module is sized to avoid — so the real tokenizer is
    used when it can be loaded.
    """

    def __init__(self, model_name: str | None = None) -> None:
        self._tokenizer = _load_tokenizer(model_name) if model_name else None

    def count(self, text: str) -> int:
        if self._tokenizer is not None:
            return len(self._tokenizer.encode(text, add_special_tokens=False))
        # Fallback: words plus a surcharge for punctuation and subword splits. Tuned to
        # over-estimate slightly, because under-estimating causes silent truncation while
        # over-estimating only makes chunks a little small.
        words = text.split()
        return int(len(words) * 1.35) + text.count("\t") + text.count("\n")


@lru_cache(maxsize=4)
def _load_tokenizer(model_name: str) -> Any | None:
    try:
        from transformers import AutoTokenizer

        return AutoTokenizer.from_pretrained(model_name)
    except Exception:
        # No network, or transformers absent. The heuristic takes over; chunking must not
        # be blocked by a model download.
        return None


def _split_long_text(text: str, counter: TokenCounter, max_tokens: int) -> list[str]:
    """Last resort for a single span that exceeds the hard maximum on its own.

    Splits on sentence boundaries, and only if that still fails, on whitespace. A span
    reaching here is usually a wall-of-text contract paragraph with no internal structure.
    """
    if counter.count(text) <= max_tokens:
        return [text]

    sentences = _SENTENCE_END.split(text)
    merged: list[str] = []
    for sentence in sentences:
        if merged and merged[-1].split()[-1].lower() in _ABBREVIATIONS:
            merged[-1] = f"{merged[-1]} {sentence}"
        else:
            merged.append(sentence)

    parts: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for sentence in merged:
        tokens = counter.count(sentence)
        if tokens > max_tokens:
            # A single sentence over the limit — or a table with no sentence boundaries at
            # all. Nothing structural is left to preserve, so pack words by measured token
            # count. Estimating a fixed step from the average tokens-per-word overshoots,
            # because the ratio is far higher for a row of identifiers than for prose.
            if current:
                parts.append(" ".join(current))
                current, current_tokens = [], 0
            parts.extend(_pack_words(sentence, counter, max_tokens))
            continue

        if current_tokens + tokens > max_tokens:
            parts.append(" ".join(current))
            current, current_tokens = [], 0
        current.append(sentence)
        current_tokens += tokens

    if current:
        parts.append(" ".join(current))
    return [p for p in parts if p.strip()]


def _pack_words(text: str, counter: TokenCounter, max_tokens: int) -> list[str]:
    """Greedily pack words into parts that each measure under the limit.

    Doubling then backing off keeps this near-linear in the number of words rather than
    counting tokens once per word, while still guaranteeing every emitted part is verified
    under the limit rather than estimated to be.
    """
    words = text.split()
    parts: list[str] = []
    start = 0

    while start < len(words):
        size = 1
        # Grow while it still fits.
        while (
            start + size * 2 <= len(words)
            and counter.count(" ".join(words[start : start + size * 2])) <= max_tokens
        ):
            size *= 2
        # Extend one word at a time until the next word would tip it over.
        while (
            start + size < len(words)
            and counter.count(" ".join(words[start : start + size + 1])) <= max_tokens
        ):
            size += 1
        parts.append(" ".join(words[start : start + size]))
        start += size

    return parts


def _pack_by_tokens(
    items: list[tuple[int, RawSpan]],
    counter: TokenCounter,
    max_tokens: int,
    breadcrumb: str,
    joiner: str,
) -> list[list[tuple[int, RawSpan]]]:
    """Group spans into batches that each fit under the limit once joined.

    The breadcrumb is counted as part of the budget, because it is prepended to the final
    text. Leaving it out is how a chunk measured at 498 tokens arrives at the encoder as
    515 and loses its tail.
    """
    overhead = counter.count(f"{breadcrumb} › ") if breadcrumb else 0
    groups: list[list[tuple[int, RawSpan]]] = []
    current: list[tuple[int, RawSpan]] = []
    current_tokens = overhead

    for index, span in items:
        tokens = counter.count(span.text)
        if current and current_tokens + tokens > max_tokens:
            groups.append(current)
            current, current_tokens = [], overhead
        current.append((index, span))
        current_tokens += tokens

    if current:
        groups.append(current)
    return groups


def _section_key(span: RawSpan) -> tuple[int, str]:
    """Group spans by page and section path. A chunk never crosses either boundary.

    Crossing a page would make one chunk cite two pages, and the PDF anchor tolerance is
    zero pages — so a chunk spanning pages 4 and 5 can only ever be half right.
    """
    return span.page_number, span.breadcrumb


def chunk_spans(
    spans: list[RawSpan],
    settings: Settings | None = None,
    counter: TokenCounter | None = None,
) -> list[Chunk]:
    settings = settings or get_settings()
    counter = counter or TokenCounter(settings.embedding_model)

    target = settings.chunk_target_tokens
    hard_max = settings.chunk_max_tokens

    chunks: list[Chunk] = []
    ordinal = 0

    # Table rows are emitted individually and also collected into a whole-table chunk,
    # because questions arrive at both granularities: "what did Hartwell charge" and
    # "summarise the supplier schedule" need different units.
    table_rows: list[tuple[int, RawSpan]] = []

    def flush_table() -> None:
        nonlocal ordinal, table_rows
        if not table_rows:
            return
        breadcrumb = table_rows[0][1].breadcrumb

        # The whole-table chunk is split if the table is large, rather than truncated —
        # a truncated table chunk silently drops rows. Each part carries only the rows it
        # actually contains: a part listing rows whose text is not in it would produce
        # citations pointing at spans that chunk never included.
        for group in _pack_by_tokens(table_rows, counter, hard_max, breadcrumb, "\n"):
            text = _with_breadcrumb(breadcrumb, "\n".join(span.text for _, span in group))
            chunks.append(
                Chunk(
                    text=text,
                    breadcrumb=breadcrumb,
                    span_indices=[i for i, _ in group],
                    token_count=counter.count(text),
                    granularity="table",
                    ordinal=ordinal,
                    extra={"row_count": len(group)},
                )
            )
            ordinal += 1
        table_rows = []

    current: list[int] = []
    current_text: list[str] = []
    current_tokens = 0
    current_key: tuple[int, str] | None = None
    current_breadcrumb = ""

    def flush_section(carry: bool) -> None:
        nonlocal ordinal, current, current_text, current_tokens
        if not current_text:
            return
        body = "\n\n".join(current_text)
        text = _with_breadcrumb(current_breadcrumb, body)
        # Accumulation below never exceeds the hard maximum, so this normally yields one
        # part. It splits only when a single span was itself oversized, and in that case
        # every part belongs to that one span, so the attribution stays exact.
        parts = _split_long_text(text, counter, hard_max)
        for part in parts:
            chunks.append(
                Chunk(
                    text=part,
                    breadcrumb=current_breadcrumb,
                    span_indices=list(current),
                    token_count=counter.count(part),
                    granularity="section",
                    ordinal=ordinal,
                )
            )
            ordinal += 1

        if carry and settings.chunk_section_overlap_ratio > 0:
            # Overlap at section boundaries only. Uniform overlap everywhere wastes index
            # space and fills results with near-duplicates of the same passage.
            tail_budget = int(target * settings.chunk_section_overlap_ratio)
            tail_text: list[str] = []
            tail_indices: list[int] = []
            used = 0
            for index, piece in zip(reversed(current), reversed(current_text), strict=False):
                tokens = counter.count(piece)
                if used + tokens > tail_budget:
                    break
                tail_text.insert(0, piece)
                tail_indices.insert(0, index)
                used += tokens
            current, current_text, current_tokens = tail_indices, tail_text, used
        else:
            current, current_text, current_tokens = [], [], 0

    for index, span in enumerate(spans):
        if span.kind is SpanKind.TABLE_ROW:
            # A table row is atomic and is never merged into prose around it.
            if current_text:
                flush_section(carry=False)
            table_rows.append((index, span))
            chunks.append(
                Chunk(
                    text=_with_breadcrumb(span.breadcrumb, span.text),
                    breadcrumb=span.breadcrumb,
                    span_indices=[index],
                    token_count=counter.count(span.text),
                    granularity="row",
                    ordinal=ordinal,
                )
            )
            ordinal += 1
            continue

        flush_table()
        key = _section_key(span)

        if current_key is not None and key != current_key:
            # A heading opens a new section; carrying tail context across an unrelated
            # section boundary would attribute one clause's context to another.
            flush_section(carry=span.kind is not SpanKind.HEADING)
            current_key = key
            current_breadcrumb = span.breadcrumb
        elif current_key is None:
            current_key = key
            current_breadcrumb = span.breadcrumb

        tokens = counter.count(span.text)
        # Two boundaries, and both are needed. `target` is the soft one that keeps chunks
        # near the preferred size; `hard_max` is the one that guarantees the encoder never
        # truncates. Checking only the target lets one large span push a nearly-full
        # accumulation far past the limit, which is how chunks came out at 900 tokens
        # against a 500 ceiling before this was split in two.
        if current_text and (current_tokens + tokens > hard_max or current_tokens >= target):
            flush_section(carry=True)
            current_breadcrumb = span.breadcrumb

        current.append(index)
        current_text.append(span.text)
        current_tokens += tokens

    flush_table()
    flush_section(carry=False)
    return chunks


def _with_breadcrumb(breadcrumb: str, text: str) -> str:
    """Prepend the section path.

    "Master Lease › §12 Assignment › Tenant shall not assign…" is interpretable on its
    own; the same clause without its path is a sentence about an unnamed agreement, and a
    reviewer cannot check it without opening the source.
    """
    if not breadcrumb:
        return text
    return f"{breadcrumb} › {text}"
