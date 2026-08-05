# Synthetic deal room specification

A legally safe, repeatable acquisition fixture for evaluating process mechanics,
evidence anchoring, parsing, and finding quality **before private customer data is
touched**.

Consolidated by [ADR-002](../decisions/ADR-002-validation-package-consolidation.md).
Generated fixture lives at [`fixtures/reef-deal-room/`](../../fixtures/reef-deal-room/);
the finding set is in `ground-truth.json` and `GROUND_TRUTH.md` there.

---

## Legal and safety constraints

Binding on any agent generating or extending this fixture.

- **Entirely fictional.** No real company, person, address, EIN, phone, or contract text.
- **Not an anonymization.** Never derive it from one real company by find-and-replace.
- No copied text from any real agreement, template library, filing, or data room.
- Names checked against real businesses before use.
- Every generated document carries `SYNTHETIC — FICTIONAL COMPANY — NOT REAL` in a
  header or footer.
- It lives in the repository **only** because it contains nothing real. Live customer
  material never enters this path; it is handled under
  [CONCIERGE_RUNBOOK.md](CONCIERGE_RUNBOOK.md).

## Target company

> **Ridgeline Industrial Services, LLC** — industrial equipment maintenance, repair and
> service across three locations (Toledo OH headquarters, Fort Wayne IN, Erie PA).
> Founded 2011. 84 people on the roster. FY2025 revenue $16.4M, reported adjusted EBITDA
> $1.95M. Recurring maintenance contracts, time-and-materials service, and equipment
> resale. Owner-operator selling to retire. Asking $11.7M, asset purchase.

Chosen to be complex enough to generate genuine multi-source diligence problems —
multiple branches, three revenue models, contractors alongside employees, fleet, leases,
covenanted debt — and simple enough that a solo operator can hold the whole business in
their head while rehearsing.

## Boundaries

- **~150 documents**, ~950 rendered pages, 10 structured files
- **Two versions:** baseline `R1`, update `R2` adding, replacing, renaming and
  withdrawing material
- **Formats:** Markdown and TXT for narrative, CSV for tables, XLSX where spreadsheet
  structure is load-bearing, PDF where page-level citation must be tested, JSON for
  ground truth
- Realistic hierarchy with inconsistent naming
- Every file has a manifest entry: path, hash, format, expected processing status,
  provenance, generator version

**No format duplication for its own sake.** Each format exists to test a distinct
behavior: CSV tests row/cell anchoring, XLSX tests sheet/cell anchoring and type
coercion, PDF tests page and bbox anchoring plus OCR, Markdown tests section anchoring.
A document appears in two formats only where the pair itself is the test.

## Structure

| Folder | Contents | Evaluation purpose |
|---|---|---|
| `00_Request_List` | Buyer request list, responsibility matrix, room index | Request mapping, scope authority |
| `01_Corporate` | Formation, ownership schedule, member consents, good standing | Entity checks, unsigned-approval detection |
| `02_Financial` | 3yr income statements and balance sheets, monthly P&L, trial balance, AR/AP aging, debt schedule, covenant compliance certificate | Period, total, and calculation reconciliation |
| `03_Customers` | Customer master, revenue by customer, contracts, churn log, concentration schedule | Concentration, ID integrity, contract terms |
| `04_Suppliers` | Vendor master, top-vendor schedule, distributor agreement | Dependency, referenced-exhibit detection |
| `05_Employees` | Roster, payroll summary, contractor schedule, org chart | Employee/contractor reconciliation |
| `06_Operations` | Fleet and equipment register, branch KPI deck, WIP schedule, KPI definitions | Units, definitions, margin reconciliation |
| `07_Legal_Insurance` | Litigation summary, insurance certificates, permits, legal invoices | Missing evidence, claim discrepancy |
| `08_Tax` | Filing acknowledgments, encrypted support archive | Unreviewed-vs-missing distinction |
| `09_Capex` | Capex register, fixed asset register, maintenance backlog | Cross-register reconciliation |
| `10_QA` | Seller Q&A log, management meeting transcript, QoE notes | Unsupported management claims |
| `11_Update_R2` | Replacements, additions, a withdrawal notice, revised Q&A | Delta and supersession handling |

## Planted findings

**22 findings**, distributed across every class the validation requires, with severity.

Severity distribution and full detail: [`GROUND_TRUTH.md`](../../fixtures/reef-deal-room/GROUND_TRUTH.md).

Design rules:

1. **Not everything is a deal-breaker.** A realistic room contains noise, immaterial
   inconsistencies, and differences with innocent explanations. Severity is skewed toward
   Medium and below.
2. **Five findings are discriminating** — they require joining two or more documents and
   are not reliably producible by a general assistant handed the folder. These are scored
   separately as the cross-document score, because that number *is* the product thesis
   expressed as a metric.
3. **Three findings are traps for over-claiming.** `RDG-021` must be reported as
   *unreviewed*, not *missing*. `RDG-015` must be *not found*, not *missing*. `RDG-004`
   must be *unresolved ambiguity*, not an error.
4. Every finding names its exact anchor — file, and page or sheet/cell or line range —
   plus the verbatim supporting excerpt.

## Negative controls

**12 tempting non-issues.** A fixture containing only real findings trains toward false
positives, and precision is the expensive metric: one wrong Critical finding costs more
than ten missed Medium ones.

Controls include legitimate rounding within tolerance, counts differing because of a
documented active-versus-all definition, a document clearly marked superseded and indexed
as such, real zero values, duplicate-looking invoice lines with distinct IDs, unambiguous
date-format variation, a request item correctly marked not applicable with written
rationale, an expired certificate whose renewal is present, and a referenced exhibit that
is present.

Full list in `GROUND_TRUTH.md`. **A finding raised against a negative control counts
against precision.**

## Generation method

Order matters. Documents generated independently produce hundreds of accidental
contradictions, and the fixture becomes noise instead of a measurement.

1. **One financial model first**, in a single generator, so every derived document is
   internally consistent by construction.
2. Break consistency **only** at the 22 planted points, each recorded as it is introduced.
3. Generate narrative documents from the model.
4. Render the subset that needs page-level citation to PDF; degrade the scanned subset
   (rotation, noise, reduced resolution).
5. Introduce naming inconsistency, near-duplicates, the encrypted archive, and the
   `R1`→`R2` delta last.
6. Emit `ground-truth.json` and `GROUND_TRUTH.md` from the same generator, so the answer
   key cannot drift from the fixture.

**Version the fixture.** When extraction improves, scores must be comparable across runs,
which is impossible if the fixture moves underneath them.

## Gold artifacts

- Package manifest with expected processing status per file
- Request coverage matrix with simulated customer confirmations
- Finding ledger: class, severity, anchors, excerpt, rationale, correct disposition
- Negative-control ledger
- `R1`→`R2` change manifest
- Expected structured profiles and the exact formulas behind every calculated finding
- Development split and a held-out split not used to tune checks

## Acceptance thresholds

Gates and diagnostics are separated in
[`docs/evaluation/DEAL_ROOM_EVAL.md`](../evaluation/DEAL_ROOM_EVAL.md), which is
authoritative. Summary:

- 100% manifest coverage — every supplied file has a processing state, no silent drops
- ≥95% exact-anchor correctness
- ≥90% recall on planted findings; ≥90% precision
- 100% correct distinction between *unreviewed*, *not found*, *missing*, and *not
  applicable*
- Zero fabricated citations; zero unlabeled inferences presented as direct fact
- No professional conclusion anywhere in expected outputs

## What this fixture cannot tell you

Stated because a fixture that behaves invites over-trust.

- Whether real rooms contain these defect classes at these rates
- Whether these findings are the ones customers care about
- Whether real scans OCR this well — synthetic degradation is kinder than a decade-old
  fax of a fax
- Anything at all about willingness to pay, data access, or differentiation

**Passing this fixture validates mechanics only.** It satisfies no customer gate on the
[SCORECARD](SCORECARD.md), and counting it as customer evidence is an automatic-fail
condition there.
