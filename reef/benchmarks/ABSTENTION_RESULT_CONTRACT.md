# Abstention result contract

**Design only. Not implemented, and not authorized for implementation** — see
[`ridgeline-abstention-failure-analysis.md`](ridgeline-abstention-failure-analysis.md) §5.
This document exists so that when implementation is justified, the states are already
argued rather than invented under deadline.

Today the engine returns `FOUND` or `NOT_FOUND_IN_CORPUS`. Two states cannot express five
distinctions, and the collapse is not cosmetic: `NOT_FOUND` currently means both "this
corpus does not cover the subject" and "the corpus covers it and the retriever scored below
a floor". A reviewer cannot act on the difference, and the second meaning is frequently
wrong.

---

## 1 · The states

| State | One-line meaning |
|---|---|
| `SUPPORTED` | Cited evidence states the requested fact. |
| `CONTRADICTED` | Cited evidence states something incompatible with the question's premise. |
| `SUBJECT_PRESENT_FACT_ABSENT` | The corpus covers the subject; the records shown do not state this attribute. |
| `EXPLICITLY_ABSENT` | A document references an item that is not present in the package. |
| `INSUFFICIENT_EVIDENCE` | Partial or conflicting coverage; not enough to decide either way. |
| `OUT_OF_SCOPE` | The subject does not appear in this corpus at all. |
| `REQUIRES_COMPARISON` | Answerable only by comparing two or more sources. |
| `REQUIRES_CALCULATION` | Answerable only by computing over extracted values. |
| `UNCALIBRATED` | The configured embedding model has no calibrated basis for any of the above. |

`REQUIRES_COMPARISON` and `REQUIRES_CALCULATION` are **routing states, not answers.** They
say the question is well-formed and the evidence is present but the conclusion needs a step
this engine does not perform. They exist so the engine can hand off honestly instead of
abstaining as though the corpus were silent — which is what it does today for RDG-009.

---

## 2 · Per-state definition

### `SUPPORTED`

- **Meaning.** At least one cited span states the requested attribute of the requested
  entity, for the requested period where one was specified.
- **Minimum evidence.** ≥1 span containing the attribute; every element the query required
  is covered by some cited span.
- **User-facing language.** *"Ridgeline's fixed charge coverage ratio for FY2025 is 1.18x."*
  Declarative, with the citation adjacent.
- **Citations required.** Yes. A `SUPPORTED` result with zero spans must be rejected at
  write time, exactly as the `claim`/`support` trigger already rejects an unsupported claim.
- **May show search results.** Yes.
- **Downstream automation may proceed.** Yes.
- **Uncertainty.** Element coverage fraction and the number of corroborating sources. Never
  a bare confidence score with no decomposition.

### `CONTRADICTED`

- **Meaning.** The corpus states something incompatible with a premise of the question.
  Distinct from absence: the evidence is present and it disagrees.
- **Minimum evidence.** ≥1 span stating the incompatible value, plus the premise it
  contradicts named explicitly.
- **User-facing language.** *"The Articles of Organization state the company is organized in
  Ohio, not Delaware."* The correction is the answer.
- **Citations required.** Yes — and this is the state where a missing citation is most
  damaging, because contradiction is an assertion about the seller's records.
- **May show search results.** Yes.
- **Downstream automation may proceed.** No, not without human disposition. A contradiction
  is a finding-shaped output and ADR-003 §4 does not authorize findings.
- **Uncertainty.** Whether the contradiction is direct (same attribute, different value) or
  inferred (different definitions). Only the direct case may be labelled `CONTRADICTED`;
  the inferred case is `INSUFFICIENT_EVIDENCE`.

The Delaware query is this state. Notably, today's engine returns it as a passing search
result pointing at `request_list.csv` — the worst available outcome, because it is confident,
irrelevant, and silent about the contradiction.

### `SUBJECT_PRESENT_FACT_ABSENT`

- **Meaning.** The corpus covers the subject and the records retrieved do not state the
  requested attribute. **This is a statement about the records examined, not about the
  world.**
- **Minimum evidence.** ≥1 cited span establishing subject coverage, plus an explicit list
  of which query elements were not found in any retrieved span.
- **User-facing language.** *"The debt schedule lists four instruments with fixed rates. None
  of the documents reviewed mentions an interest rate swap. This does not establish that no
  swap exists — only that the supplied package does not describe one."*
- **Citations required.** Yes, for the subject coverage. The absence itself cannot be cited,
  which is precisely why the scope of the claim must be stated in the same sentence.
- **May show search results.** Yes, labelled as subject context rather than as an answer.
- **Downstream automation may proceed.** No. This state routinely becomes a request-list
  item, which is a human decision.
- **Uncertainty.** Which elements were absent, and how much of the corpus was in scope. A
  narrow retrieval window must not be reported as a package-wide absence.

**The load-bearing constraint.** This state must never be rendered as "the company has no
interest rate swap". It licenses "the supplied documents do not describe one". The
difference is the difference between a coverage statement and an assertion about the seller,
and only the first is defensible from retrieval. `MVP.md` already bars deal conclusions;
this is the retrieval-layer form of the same rule.

### `EXPLICITLY_ABSENT`

- **Meaning.** A document references an item — an exhibit, a schedule, an appendix — and
  that item is not in the package inventory.
- **Minimum evidence.** The citing span containing the reference, **and** a register lookup
  showing no matching document. Both halves, or it is `SUBJECT_PRESENT_FACT_ABSENT`.
- **User-facing language.** *"The Hartwell agreement incorporates Exhibit B by reference.
  No Exhibit B appears in the supplied package."*
- **Citations required.** Yes for the reference; the register result is reported alongside,
  not as a citation.
- **May show search results.** Yes.
- **Downstream automation may proceed.** No.
- **Uncertainty.** Distinguish *not found* (referenced but never supplied) from *missing*
  (requested and not supplied). RDG-015's ground truth turns on exactly this distinction and
  calls it a scored trap.

This is RDG-015. It is unreachable by retrieval alone and requires the register the engine
already builds.

### `INSUFFICIENT_EVIDENCE`

- **Meaning.** Something relevant was found, but coverage is partial, sources disagree, or
  the match is definitional rather than factual.
- **Minimum evidence.** ≥1 span, plus a named reason the evidence is insufficient.
- **User-facing language.** *"Two sources report recurring revenue differently — 78% in the
  KPI deck and 52% by contracted maintenance. The definitions differ; the documents reviewed
  do not settle which applies."*
- **Citations required.** Yes.
- **May show search results.** Yes.
- **Downstream automation may proceed.** No.
- **Uncertainty.** This state *is* the uncertainty representation. It must never be
  collapsed into `SUPPORTED` with a low confidence number — a reviewer reads a number as a
  discount on a true statement, not as "this may be the wrong statement".

RDG-004 is this state: both figures are defensible under their stated definitions, and the
ground truth says to report the ambiguity rather than an error.

### `OUT_OF_SCOPE`

- **Meaning.** The subject does not appear in this corpus.
- **Minimum evidence.** None required. Optionally the absent elements, to show the work.
- **User-facing language.** *"This package contains nothing about patents."*
- **Citations required.** No — there is nothing to cite, and fabricating a near-miss citation
  to look responsive is the failure this whole contract guards against.
- **May show search results.** **No.** Showing the nearest neighbours of an out-of-scope
  query is how a reviewer comes to believe the corpus addresses something it does not.
- **Downstream automation may proceed.** No.
- **Uncertainty.** State the scope tested — this room, this revision — never "the company
  has no patents".

### `REQUIRES_COMPARISON` / `REQUIRES_CALCULATION`

- **Meaning.** Well-formed question, operands present, conclusion needs a step this engine
  does not perform.
- **Minimum evidence.** The candidate operand spans, cited.
- **User-facing language.** *"Unbilled WIP appears in the FY2024 and FY2025 balance sheets
  and revenue in the income statements. Comparing their growth requires a calculation this
  engine does not perform."*
- **Citations required.** Yes, for each operand.
- **May show search results.** Yes.
- **Downstream automation may proceed.** No — this is the boundary of the authorized scope,
  and crossing it silently is how a findings layer gets built by accident.
- **Uncertainty.** Whether all operands were located, or only some.

Separating these from abstention matters: today RDG-009 returns `NOT_FOUND`, which tells a
reviewer the corpus is silent when in fact both operands are present and indexed.

### `UNCALIBRATED`

- **Meaning.** The configured model has no calibration record, so no state above can be
  asserted with any basis.
- **Minimum evidence.** None. This is a configuration fault, not a corpus fact.
- **User-facing language.** *"Search is running on an uncalibrated embedding model. Results
  are shown for development only and their sufficiency has not been assessed."*
- **Citations required.** N/A.
- **May show search results.** Only when explicitly permitted, as today's
  `allow_uncalibrated_search` does.
- **Downstream automation may proceed.** **Never.**
- **Uncertainty.** Total. No abstention metric from an uncalibrated run is reportable — the
  rule already enforced in `evaluate.score_abstention`.

---

## 3 · Cross-cutting rules

1. **Absence is scoped to what was examined.** No state may be rendered as a claim about the
   world. `SUBJECT_PRESENT_FACT_ABSENT`, `EXPLICITLY_ABSENT` and `OUT_OF_SCOPE` all license
   statements about the supplied package and nothing else. Whether they license anything
   stronger depends on a coverage argument the engine does not currently make.

2. **Every non-`OUT_OF_SCOPE`, non-`UNCALIBRATED` state carries citations**, and every
   citation resolves to an exact span — the guarantee G9/G10/G12 already hold at 100%.

3. **No state may be inferred from a single scalar.** Every state must name the evidence
   test it passed or failed. A state assigned by threshold alone is the current design with
   more nouns.

4. **`SUPPORTED` is the only state that may feed automation.** Everything else routes to a
   human. This keeps the contract inside ADR-003 §4 regardless of how the states are later
   computed.

5. **Uncertainty is structural, not scalar.** Which elements were covered, which sources
   agreed, what scope was searched. A single confidence number invites exactly the
   misreading `INSUFFICIENT_EVIDENCE` exists to prevent.

---

## 4 · Relationship to the current implementation

| Today | Under this contract |
|---|---|
| `FOUND` | `SUPPORTED`, or `INSUFFICIENT_EVIDENCE`, or `REQUIRES_*` |
| `NOT_FOUND_IN_CORPUS` | `OUT_OF_SCOPE`, or `SUBJECT_PRESENT_FACT_ABSENT`, or a false abstention |
| `calibration_status = uncalibrated` | `UNCALIBRATED` |
| *(no equivalent)* | `CONTRADICTED`, `EXPLICITLY_ABSENT` |

Two states have no current expression at all, and both are cases the fixture plants
deliberately. That is the measure of how much the two-state design is losing.

**Nothing here is authorized for implementation.** The mechanism that would assign these
states does not exist, cannot be validated on six held-out queries, and must wait for the
cold review.
