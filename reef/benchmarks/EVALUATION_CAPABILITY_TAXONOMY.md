# Evaluation capability taxonomy

Ten classes of evaluation task, and which component owns each. The purpose is one bright
line: **retrieval is scored only on what retrieval can produce.**

The harness previously scored all 19 R1 findings as retrieval recall. Three of them cannot
be produced by retrieval at any threshold, and one is unreachable by construction — its
source document has zero chunks. That made the retrieval baseline look worse than it is and
would have driven a fix into the retriever when the fault was in the scoring.

The fixture already carried the answer. `ground-truth.json` gives every finding a
`classification` field — `deterministic_calculation`, `not_found`, `unreviewed` — and the
harness ignored it. This taxonomy makes that field load-bearing.

---

## Three tiers of metric validity

Before the classes, the distinction that governs them. A finding can be unreachable by
retrieval while its *evidence* is perfectly retrievable, and conflating those is what went
wrong.

| Tier | Meaning | Metric that applies |
|---|---|---|
| **T1 — finding-level retrieval** | A single passage or row states the conclusion. | Retrieval recall. Valid. |
| **T2 — operand retrieval** | Retrieval must surface the source documents; the conclusion needs another component. | Operand recall — a real metric, reported separately, never called finding recall. |
| **T3 — retrieval invalid** | No chunk can satisfy the task, usually because the source was never indexed. | None. Reporting any retrieval number is inventing one. |

T2 is the tier the previous harness lacked, and most findings live there. Retrieval genuinely
has a job on a cross-document contradiction — surface both documents — and it does that job
well. It simply cannot draw the conclusion.

---

## The classes

### 1 · Direct passage retrieval

- **Receives:** a natural-language question.
- **Produces:** ranked chunks with exact span anchors.
- **Success:** a chunk containing the responsive passage appears in the top *k*.
- **Failure:** no responsive chunk in top *k*, or an abstention on an answerable question.
- **Retrieval expected to solve it:** **yes**, entirely.
- **Anchors required:** page + bbox (PDF), or line range (text/markdown).
- **Owner:** the retrieval engine, today.
- **Tier:** T1.

### 2 · Structured row or cell retrieval

- **Receives:** a question whose answer is a table row or cell.
- **Produces:** the row chunk with a sheet/row or row-index locator.
- **Success:** correct row surfaced, cell value preserved exactly — `000418` not `418`.
- **Failure:** wrong row, or a type-coerced value.
- **Retrieval expected to solve it:** **yes** for locating; value fidelity is an extraction
  guarantee already tested.
- **Anchors required:** `sheet <name> row <n>` or `row <n>`, matching ground-truth format.
- **Owner:** the retrieval engine, today.
- **Tier:** T1.

### 3 · Cross-document comparison

- **Receives:** a question whose answer requires two or more sources.
- **Produces:** the conclusion, plus every operand cited.
- **Success:** all operands retrieved **and** the relationship between them stated correctly.
- **Failure (comparison layer):** operands present, conclusion wrong or absent.
- **Failure (retrieval layer):** an operand never surfaced.
- **Retrieval expected to solve it:** **no** — only to supply operands.
- **Anchors required:** one per operand.
- **Owner:** a future comparison component. **Not built, not authorized.**
- **Tier:** T2.

### 4 · Deterministic calculation

- **Receives:** extracted values plus a defined operation.
- **Produces:** a computed figure with every input cited and the operation stated.
- **Success:** figure reproducible from cited inputs; identical on re-run.
- **Failure:** unreproducible, or an input not cited.
- **Retrieval expected to solve it:** **no**.
- **Anchors required:** one per input value.
- **Owner:** a future deterministic calculation component. **Not built.** Must be
  deterministic code, never a model — `05-architecture.md` principle 4.
- **Tier:** T2.

### 5 · Explicit contradiction detection

- **Receives:** two or more statements about the same attribute.
- **Produces:** the contradiction, both sides cited, with the incompatibility named.
- **Success:** contradiction identified and both sides anchored.
- **Failure:** a definitional difference reported as a contradiction — RDG-004 is planted
  precisely to catch that, and its ground truth says to report the ambiguity, not an error.
- **Retrieval expected to solve it:** **no**.
- **Anchors required:** one per contradicting statement.
- **Owner:** a future comparison component.
- **Tier:** T2.

### 6 · Explicit absence detection

- **Receives:** a reference or a request-list entry, plus the package inventory.
- **Produces:** a statement that the item is not present, scoped to the package.
- **Success:** absence correctly established **and** correctly typed — *not found*
  (referenced but never supplied) versus *missing* (requested and not supplied). RDG-015's
  ground truth calls this distinction a scored trap.
- **Failure:** reporting absence without checking the inventory, or conflating the two types.
- **Retrieval expected to solve it:** **no.** Nothing in the corpus states an absence;
  the finding is the gap between a reference and an inventory.
- **Anchors required:** the citing reference. The absence itself cannot be cited, which is
  why the claim must be scoped to the package examined.
- **Owner:** a future absence/register component, reading the coverage register the engine
  already produces.
- **Tier:** T2 — retrieval must still surface the *reference*.

### 7 · Corpus coverage or manifest inspection

- **Receives:** the room.
- **Produces:** every supplied file with a processing state and, where not OK, a reason.
- **Success:** 100% of files accounted for, states correct. Gates G1 and G2.
- **Failure:** any silent drop.
- **Retrieval expected to solve it:** **no** — it is a register query, not a search.
- **Anchors required:** none; the file identity is the anchor.
- **Owner:** **built and passing.** `reef coverage` and `/rooms/{id}/coverage`.
- **Tier:** T3 for retrieval purposes.

### 8 · Inaccessible-document disposition

- **Receives:** a file that could not be processed.
- **Produces:** the file, an actionable reason, and a disposition of *unreviewed* — never
  *missing*.
- **Success:** registered, reason actionable, disposition correct.
- **Failure:** reporting it as missing, which sends the buyer to request a document the
  seller already supplied. RDG-021's ground truth calls this binary and a scored trap.
- **Retrieval expected to solve it:** **no, and it is structurally impossible.** The file has
  zero chunks; there is nothing to retrieve at any rank or threshold.
- **Anchors required:** none.
- **Owner:** **built and passing** — intake registers the encrypted archive with "supply the
  password to process".
- **Tier:** **T3. Any retrieval metric on this class is an invalid expectation.**

### 9 · Evidence sufficiency

- **Receives:** a question and its retrieved evidence.
- **Produces:** a structured state — supported, contradicted, subject-present-fact-absent,
  insufficient, out of scope.
- **Success:** state correct against an independent reviewer's label.
- **Failure:** confident support for an unsupported fact; abstention on an answerable one.
- **Retrieval expected to solve it:** **no.** Established in
  [`ridgeline-abstention-failure-analysis.md`](ridgeline-abstention-failure-analysis.md):
  no scalar over a relatedness score separates these.
- **Anchors required:** per the
  [result contract](ABSTENTION_RESULT_CONTRACT.md), which specifies them per state.
- **Owner:** a future evidence-sufficiency component. **Designed, not authorized, not built.**
- **Tier:** T2.

### 10 · Findings or risk interpretation

- **Receives:** everything above.
- **Produces:** a severity-rated register entry with disposition.
- **Success:** matches a qualified reviewer's judgement.
- **Failure:** any professional conclusion — legal, accounting, valuation, investment.
- **Retrieval expected to solve it:** **no.**
- **Anchors required:** full chain to source.
- **Owner:** the findings layer. **Not authorized by ADR-003 §4.** Gates G4–G8 and G13–G15
  score this class and are correctly reported as *not scored* rather than estimated.
- **Tier:** T2.

---

## The bright line

Classes 1 and 2 are retrieval. Classes 3–6 and 9 are downstream components that consume
retrieval output. Classes 7 and 8 are register operations that bypass retrieval entirely.
Class 10 is the findings layer.

**A rule that names a document category — "customer concentration must cite a
revenue-by-customer schedule" — has crossed into class 10** regardless of which module it
lives in. Format-level requirements ("a numeric answer must cite a table cell") stay on the
retrieval side because they describe evidence shape rather than deal semantics.

The line matters because ADR-003 §4 authorizes the engine and not the product. Work that
drifts across it is scope expansion whatever it is called.

---

## Mapping from ground-truth classifications

| `ground-truth.json` classification | Class | Tier | Count (all 22) |
|---|---|---|---|
| `direct_fact` | 1 | T1 | 2 |
| `cross_document_contradiction` | 5 (+3) | T2 | 7 |
| `deterministic_calculation` | 4 | T2 | 6 |
| `missing_document` | 6 | T2 | 2 |
| `not_found` | 6 | T2 | 1 |
| `stale_version` | 3 | T2 | 1 |
| `unresolved_ambiguity` | 9 | T2 | 1 |
| `unusual_revenue_recognition` | 10 | T2 | 1 |
| `unreviewed` | 8 | **T3** | 1 |

**Two of twenty-two findings are finding-level retrieval tasks.** The benchmark previously
scored all of them as such. That is the size of the mislabelling.
