"""Document status at query time.

Cold review 001 produced four escalation-worthy false supports against a target of zero.
Three of them are one defect: **the engine holds a fact about a document and never
consults it** (`COLD_REVIEW_ADJUDICATION_001` §4).

- CR-031. Asked when the Erie operating permit expires, the engine returned
  `Facility_Lease_Erie.md` — a different document about the same site. The permit is in
  the room, registered `unsupported: no usable text`. The engine knew and did not say.
- CR-032. Asked what the tax workpapers contain, the top hit was the request-list row
  reading `Supplied`. True in form; the archive is password-protected and the engine's own
  coverage register says so.
- CR-033. Two revenue workbooks disagree by 118,000 for the same customer. One was
  formally withdrawn by a notice sitting indexed in the same room. They came back at ranks
  1 and 2, separated by 0.0026, with nothing to tell them apart. The right file ranked
  first by luck.

Two facts fix all three, and the engine already computes one of them.

**Readability** is `Document.processing_state`. Already there, never read at query time.

**Currency** is not there, and building it is the substantive work. It lives in
`document_status`, one row per declaration, each citing the span that made it.

---

## What this module will not do

**Status is never inferred from a filename.** `_v2`, `_final`, `_old`, `draft`, `superseded`
in a name are seller habits, not facts. A room whose current schedule is called `_v1` is
ordinary. Only a declaration in some document's *text*, resolved against the register,
creates a status row — which is why `declared_by_span_id` is NOT NULL and why
`test_document_status` asserts a suggestively-named file stays `CURRENT`.

**Recognition is deliberately conservative, and under-detection is the safe failure.**
Missing a withdrawal leaves today's behaviour, which is the behaviour cold review scored.
Mis-reading a *successor* as withdrawn would mark the current file stale and actively
mislead — strictly worse than doing nothing. So only two unambiguous constructions are
recognised, both patient-first:

1. the reference precedes the verb on the same line — *"…FY25_v2.xlsx has been withdrawn"*;
2. the line opens with the verb as a label — *"Withdrawn: FY25_v2.xlsx"*.

`superseded by X` is excluded from form 2 by the `by`-guard, because there X is the
replacement. Everything else produces no row.

**Ranking is not rescored.** `COLD_REVIEW_ADJUDICATION_001` §9 scopes P0-1 to surfacing
status, and ADR-003 §4 ends the engine at retrieval. The one ordering effect is a
tie-break: at *exactly* equal fused score a superseded document sorts below a current one.
RRF ties were previously broken by dict insertion order, so this replaces an arbitrary
rule with a defensible one and moves no measured number.

**Outcome is not extended.** `FOUND`/`NOT_FOUND` stay as they are. The nine-state contract
in `benchmarks/ABSTENTION_RESULT_CONTRACT.md` is explicitly unauthorized for
implementation, and abstention behaviour must not move under a step that is not measuring
it. Status rides alongside the result; it never causes or suppresses one.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from enum import StrEnum

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from reef.models import Document, DocumentStatus, ProcessingState, Span, StatusKind
from reef.provenance import NAMESPACE


class RetrievalStatus(StrEnum):
    """What a reader needs to know about a hit before believing it.

    The two non-current names are taken verbatim from `COLD_REVIEW_ADJUDICATION_001` §8,
    which argued both to be general rather than fixture-shaped and admitted them to the
    state contract. They are not new classifications invented here.
    """

    #: Readable, and nothing in the room says it has been withdrawn or replaced.
    CURRENT = "current"
    #: Supplied and registered, and its text could not be read. CR-031, CR-032.
    PRESENT_BUT_UNREADABLE = "present_but_unreadable"
    #: Readable, and some document in the room declares it no longer stands. CR-033.
    SUPERSEDED_OR_WITHDRAWN = "superseded_or_withdrawn"


#: `processing_state` values meaning "the file is in the room and we could not read it".
#: `pending` is excluded: it means not yet attempted, which is a run in progress rather
#: than a fact about the document.
UNREADABLE_STATES = (ProcessingState.UNSUPPORTED, ProcessingState.FAILED)


@dataclass(frozen=True, slots=True)
class StatusNote:
    """Why a hit is not current, and where to go and read the reason."""

    status: RetrievalStatus
    #: `unsupported: archive is password-protected`, or the declaring sentence verbatim.
    detail: str
    #: The document that declared it, for a currency status. Empty for unreadability,
    #: which is the engine's own observation and cites no other document.
    declared_by: str = ""
    declared_by_span_id: uuid.UUID | None = None

    @property
    def is_current(self) -> bool:
        return self.status is RetrievalStatus.CURRENT


CURRENT = StatusNote(status=RetrievalStatus.CURRENT, detail="")


@dataclass(frozen=True, slots=True)
class CoverageAdvisory:
    """A document in the room that matches this query and could not be read.

    Not a hit. It has no text, no span and no citation, because there is nothing to cite —
    that is what unreadable means. It is a statement about coverage, and it is the answer
    to CR-031 and CR-032: the reviewer needed to be told the permit was in the room and
    unreadable, not handed the lease next to it.
    """

    document_id: uuid.UUID
    path: str
    processing_state: str
    reason: str
    #: Query tokens that matched this document's folder and name. Reported so the reader
    #: can see why it was surfaced and dismiss it when the overlap is coincidental.
    matched_terms: tuple[str, ...] = ()


# --------------------------------------------------------------------------------------
# Reading status at query time
# --------------------------------------------------------------------------------------


def status_for_documents(
    session: Session, document_ids: list[uuid.UUID]
) -> dict[uuid.UUID, StatusNote]:
    """Resolve the status of each document, from state the room already holds.

    Unreadability is checked first and wins. A document that could not be read cannot
    meaningfully also be reported as withdrawn — the reader's next action is the same
    either way, and the unreadable reason is the more specific fact.
    """
    if not document_ids:
        return {}

    notes: dict[uuid.UUID, StatusNote] = {}

    rows = session.execute(
        select(Document.id, Document.processing_state, Document.state_detail).where(
            Document.id.in_(document_ids)
        )
    ).all()
    for document_id, state, detail in rows:
        if state in UNREADABLE_STATES:
            notes[document_id] = StatusNote(
                status=RetrievalStatus.PRESENT_BUT_UNREADABLE,
                detail=f"{state}: {detail}" if detail else str(state),
            )

    declarations = session.execute(
        select(
            DocumentStatus.document_id,
            DocumentStatus.status,
            DocumentStatus.declaration_text,
            DocumentStatus.declared_by_span_id,
            Document.folder_path,
            Document.filename,
        )
        .join(Document, Document.id == DocumentStatus.declared_by_document_id)
        # Deterministic when a document is declared withdrawn twice, as the fixture's
        # notice and room README both do. The reader sees one label and one citation;
        # the other rows remain queryable.
        .order_by(DocumentStatus.document_id, Document.folder_path, Document.filename)
        .where(DocumentStatus.document_id.in_(document_ids))
    ).all()
    for document_id, _status, text, span_id, folder, filename in declarations:
        if document_id in notes:
            continue
        notes[document_id] = StatusNote(
            status=RetrievalStatus.SUPERSEDED_OR_WITHDRAWN,
            detail=text,
            declared_by=f"{folder}/{filename}" if folder else filename,
            declared_by_span_id=span_id,
        )

    return {document_id: notes.get(document_id, CURRENT) for document_id in document_ids}


# --------------------------------------------------------------------------------------
# The coverage advisory
# --------------------------------------------------------------------------------------

#: Function words carry no subject and would match everything. Kept small on purpose: a
#: long hand-tuned list fitted to the reviewer's 33 questions is the overfitting this step
#: is supposed to avoid.
_STOPWORDS = frozenset(
    """
    a an and any are as at be been by can did do does for from had has have how in into is
    it its of on or that the their there these this to was were what when where which who
    whom why will with
    """.split()
)

#: Two, not one. One shared token matches a topic — every query mentioning tax would flag
#: a locked tax archive. Two distinct tokens identify a document. It is the smallest
#: threshold that distinguishes the two, chosen for that reason rather than fitted.
_MIN_SHARED_TERMS = 2


def _terms(value: str) -> set[str]:
    """Content tokens of a query or of a document's folder-and-name.

    Bare numbers shorter than four digits are dropped: `07_Legal_Insurance` and
    `02_Financial` are ordering prefixes a data room adds, not subject matter. Four-digit
    numbers are kept, because they are years and `2023` is exactly how a reviewer names
    the workpapers they are asking about.
    """
    tokens = {t for t in re.split(r"[^0-9a-z]+", value.lower()) if len(t) >= 2}
    return {
        t
        for t in tokens
        if t not in _STOPWORDS and not (t.isdigit() and len(t) < 4)
    }


def unreadable_matching(session: Session, query: str) -> list[CoverageAdvisory]:
    """Documents in the room that this query is plausibly about and that could not be read.

    The *status* comes from `processing_state`, which the pipeline computed by trying to
    parse the file. Only the *matching* uses the name — the same use every hit already
    makes of `filename` when it is displayed. Nothing here concludes anything about a
    document from what it is called.

    The file extension is stripped before tokenising: `.pdf` and `.zip` are format facts,
    and a query about a PDF should not match every unreadable PDF in the room.
    """
    query_terms = _terms(query)
    if not query_terms:
        return []

    rows = session.execute(
        select(
            Document.id,
            Document.folder_path,
            Document.filename,
            Document.processing_state,
            Document.state_detail,
        )
        .where(Document.processing_state.in_(UNREADABLE_STATES))
        .order_by(Document.folder_path, Document.filename)
    ).all()

    advisories: list[CoverageAdvisory] = []
    for document_id, folder, filename, state, detail in rows:
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        shared = query_terms & _terms(f"{folder} {stem}")
        if len(shared) < _MIN_SHARED_TERMS:
            continue
        advisories.append(
            CoverageAdvisory(
                document_id=document_id,
                path=f"{folder}/{filename}" if folder else filename,
                processing_state=str(state),
                reason=detail or "",
                matched_terms=tuple(sorted(shared)),
            )
        )
    # Most-matched first: the document the query is most likely about leads.
    advisories.sort(key=lambda a: (-len(a.matched_terms), a.path))
    return advisories


# --------------------------------------------------------------------------------------
# Deriving currency from declarations
# --------------------------------------------------------------------------------------

#: Patient-marking verbs only. `replaces` and `replaced` are absent on purpose: their
#: direction flips with voice, and reading one backwards would mark the live document
#: stale — the one outcome worse than the defect being fixed.
_VERBS = ("withdrawn", "withdrawal", "retracted", "superseded")

_VERB_RE = re.compile(r"\b(" + "|".join(_VERBS) + r")\b")
#: A label line: the verb opens the line, optionally followed by a colon or dash.
_LABEL_RE = re.compile(r"^\s*(" + "|".join(_VERBS) + r")\b\s*[:—–-]?\s*")
#: `withdrawn by the seller` names the actor, `superseded by X` names the successor.
#: Either way what follows `by` is not the subject, so form 2 declines the line.
_BY_RE = re.compile(r"^\s*by\b")

_KIND_BY_VERB = {
    "withdrawn": StatusKind.WITHDRAWN,
    "withdrawal": StatusKind.WITHDRAWN,
    "retracted": StatusKind.WITHDRAWN,
    "superseded": StatusKind.SUPERSEDED,
}

#: Characters that may appear inside a path or filename. Used only for boundary checks, so
#: `Revenue_by_Customer_FY25.xlsx` never matches inside `Revenue_by_Customer_FY25_v2.xlsx`.
_PATH_CHARS = re.compile(r"[0-9A-Za-z._/\\-]")


@dataclass(slots=True)
class StatusDerivation:
    """What one pass over the room's declarations produced."""

    declarations: int = 0
    documents: int = 0
    #: (subject path, status, declaring path) — reported by name, never as a bare count,
    #: for the same reason ingest reports its failures by name.
    marked: list[tuple[str, str, str]] = field(default_factory=list)


def _reference_index(
    documents: list[tuple[uuid.UUID, str, str]],
) -> list[tuple[str, uuid.UUID]]:
    """Lookup keys for resolving a textual reference to a real document in this room.

    Full path first, then bare filename — and a bare filename is a key only when it is
    unique in the room. Two folders holding `summary.csv` make that name ambiguous, and
    marking the wrong one withdrawn is exactly the mis-detection this module refuses.
    """
    by_name: dict[str, list[uuid.UUID]] = {}
    keys: list[tuple[str, uuid.UUID]] = []

    for document_id, folder, filename in documents:
        path = f"{folder}/{filename}" if folder else filename
        keys.append((path.lower(), document_id))
        by_name.setdefault(filename.lower(), []).append(document_id)

    for name, ids in by_name.items():
        if len(ids) == 1:
            keys.append((name, ids[0]))

    # Longest first, so a full path wins over the bare name it contains.
    keys.sort(key=lambda item: len(item[0]), reverse=True)
    return keys


def _references(line: str, keys: list[tuple[str, uuid.UUID]]) -> list[tuple[int, int, uuid.UUID]]:
    """Non-overlapping document references in one line, longest match first."""
    lowered = line.lower()
    found: list[tuple[int, int, uuid.UUID]] = []
    taken: list[tuple[int, int]] = []

    for key, document_id in keys:
        start = lowered.find(key)
        while start != -1:
            end = start + len(key)
            before_ok = start == 0 or not _PATH_CHARS.match(lowered[start - 1])
            after_ok = end == len(lowered) or not _PATH_CHARS.match(lowered[end])
            overlaps = any(start < t_end and t_start < end for t_start, t_end in taken)
            if before_ok and after_ok and not overlaps:
                found.append((start, end, document_id))
                taken.append((start, end))
            start = lowered.find(key, start + 1)

    return sorted(found)


def _declared_in_line(
    line: str, keys: list[tuple[str, uuid.UUID]]
) -> list[tuple[uuid.UUID, str]]:
    """Documents this line declares non-current, and under which status kind.

    Line-scoped rather than span-scoped, and that is load-bearing. The fixture's room
    README lists additions on one line and withdrawals on the next; scanning the whole
    span would put `Hartwell_Exhibit_B_Pricing.txt` before the word "Withdrawn" and
    retract a file that was in fact added.
    """
    verb_match = _VERB_RE.search(line.lower())
    if verb_match is None:
        return []

    kind = _KIND_BY_VERB[verb_match.group(1)]
    references = _references(line, keys)
    if not references:
        return []

    # Form 1: the reference precedes the verb. "…FY25_v2.xlsx has been withdrawn".
    subjects = [(doc_id, kind) for _, end, doc_id in references if end <= verb_match.start()]
    if subjects:
        return subjects

    # Form 2: the line opens with the verb as a label. "Withdrawn: FY25_v2.xlsx".
    label = _LABEL_RE.match(line)
    if label is None or _BY_RE.match(line[label.end(1) :]):
        return []
    return [(doc_id, kind) for start, _, doc_id in references if start >= label.end()]


def derive_document_status(session: Session, room_id: uuid.UUID) -> StatusDerivation:
    """Read the room's declarations and record what they say about document currency.

    Runs after the pipeline, because it reads the spans the pipeline produced. Idempotent:
    ids are derived from (subject, declaring span) the way every other identifier in Reef
    is derived, so a re-ingest reuses them and a status cited in a memo still resolves.
    """
    result = StatusDerivation()

    documents = [
        (row[0], row[1], row[2])
        for row in session.execute(
            select(Document.id, Document.folder_path, Document.filename)
        ).all()
    ]
    if not documents:
        return result

    paths = {document_id: (folder, name) for document_id, folder, name in documents}
    keys = _reference_index(documents)

    spans = session.execute(
        select(Span.id, Span.document_id, Span.text).order_by(Span.document_id, Span.char_start)
    ).all()

    marked: set[uuid.UUID] = set()
    for span_id, declaring_id, text in spans:
        for line in (text or "").splitlines():
            for subject_id, kind in _declared_in_line(line, keys):
                # The check constraint refuses this too; catching it here keeps the
                # transaction alive when a notice happens to quote its own name.
                if subject_id == declaring_id:
                    continue

                session.execute(
                    pg_insert(DocumentStatus)
                    .values(
                        id=uuid.uuid5(NAMESPACE, f"docstatus:{subject_id}:{span_id}"),
                        room_id=room_id,
                        document_id=subject_id,
                        status=kind,
                        declared_by_document_id=declaring_id,
                        declared_by_span_id=span_id,
                        declaration_text=line.strip(),
                    )
                    # Re-deriving a room must not fail on rows an earlier pass wrote.
                    .on_conflict_do_nothing(constraint="uq_document_status_source")
                )

                result.declarations += 1
                marked.add(subject_id)
                subject_folder, subject_name = paths[subject_id]
                declaring_folder, declaring_name = paths[declaring_id]
                result.marked.append(
                    (
                        f"{subject_folder}/{subject_name}" if subject_folder else subject_name,
                        kind,
                        f"{declaring_folder}/{declaring_name}"
                        if declaring_folder
                        else declaring_name,
                    )
                )

    result.documents = len(marked)
    result.marked.sort()
    return result
