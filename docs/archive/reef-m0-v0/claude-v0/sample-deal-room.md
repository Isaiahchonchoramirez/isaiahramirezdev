> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md`](../../../validation/SYNTHETIC_DEAL_ROOM_SPEC.md)
> **Superseded because:** Superseded by a larger target company and a 20+ finding set with severity levels.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Sample deal room

A synthetic acquisition package. Built so the concierge process can be rehearsed and
timed before it touches a customer's real documents, and so it can later become the
evaluation fixture that every extraction change is tested against.

**Legal and safety constraints — binding on any agent generating this:**

- Entirely fictional. No real company, person, address, EIN, or contract text.
- No copied text from any real agreement, template library, or filing. Generate prose.
- Names checked against real businesses before use; if a collision exists, change it.
- Every file watermarked `SYNTHETIC — NOT A REAL BUSINESS` in the footer.
- Stored in the repository or a public location only because it contains nothing real.
  The moment a real customer document enters, it lives under `concierge-runbook.md`
  handling rules instead.

---

## The target

> **Meridian Mechanical Services, LLC** — commercial HVAC installation and service,
> Ohio. Founded 2009. 38 employees. FY2025 revenue $8.4M, adjusted EBITDA $1.15M.
> Owner-operator selling to retire. Asking $6.9M. Asset purchase.

Chosen to match the ICP card in `../01-strategy.md`: small, services, fleet-based,
owner-dependent, unglamorous, and exactly the kind of business a searcher buys.

## Contents

Target **~340 files**, roughly 1,100 pages — a quarter the size of a real room, enough
to be representative and small enough to process by hand in a rehearsal.

| # | Folder | Files | Notes |
|---|---|---|---|
| 1 | `01_CIM` | 1 | 46-page confidential information memorandum |
| 2 | `02_Financials` | 12 | FY23–FY25 P&L, balance sheet, cash flow; 3 tax returns; trial balances |
| 3 | `03_Revenue_Detail` | 4 | Monthly revenue by customer, 36 months, XLSX |
| 4 | `04_Customers` | 9 | Concentration table, top-20 list, 6 customer contracts |
| 5 | `05_Contracts` | 31 | Service agreements, one master lease, supplier terms, equipment leases |
| 6 | `06_Employees` | 22 | Roster (2 versions), offer letters, 4 non-competes, benefits summary |
| 7 | `07_Suppliers` | 14 | Distributor agreements, 2 with auto-renewal |
| 8 | `08_Real_Estate` | 6 | Facility lease + 2 amendments, warehouse sublease |
| 9 | `09_Debt` | 8 | Debt schedule, 2 equipment loans, line of credit, UCC filings |
| 10 | `10_Capex` | 5 | Fleet list, 3-year capex history, maintenance logs |
| 11 | `11_Insurance` | 11 | GL, auto, umbrella, workers' comp, certificates |
| 12 | `12_QoE` | 1 | 28-page quality-of-earnings draft with addback schedule |
| 13 | `13_Legal` | 7 | Formation docs, one settled claim, licenses, permits |
| 14 | `14_Management` | 2 | Management meeting transcript (90 min), follow-up email thread |
| 15 | `15_Misc` | 207 | Invoices, POs, photos, scanned receipts — the realistic bulk |

### Realism requirements

The room must be as annoying as a real one, because the process is being tested against
the annoyance as much as the content.

- **~30% scanned**, not native — skewed toward folders 5, 8, 11, 13
- **3 files** are photographs of paper, slightly rotated
- **2 files** are password-protected, password not supplied
- **1 file** is corrupt and will not open
- **Inconsistent naming:** `Lease.pdf`, `lease_FINAL.pdf`, `Lease_final_v2_USE THIS.pdf`
- **4 near-duplicates** differing only by a signature page
- **Folder 15 is 60% of the file count and ~5% of the value**, which is true of real
  rooms and is what makes inventory-first the right first move
- Two documents dated after the stated room-open date, simulating a trickle

---

## Planted findings

Twelve deliberate defects. This list is the answer key: it becomes the ground truth for
finding recall, and it must live in a file the extraction pipeline never sees.

| # | Finding | Where it hides | Requires | Severity |
|---|---|---|---|---|
| 1 | **Customer concentration understated.** CIM claims largest customer is 18% of revenue; monthly detail computes 31% for FY25. | `01_CIM` p.14 vs `03_Revenue_Detail` | Cross-document arithmetic | Critical |
| 2 | **Change-of-control consent** required by the largest customer's service agreement; not disclosed anywhere in the CIM. | `05_Contracts/Northgate_Services_Agreement.pdf` §11.3 (scanned) | OCR + clause extraction | Critical |
| 3 | **Facility lease expires 4 months post-close**, no renewal option. CIM describes the facility as "secured long-term." | `08_Real_Estate` + `01_CIM` p.9 | Date extraction + contradiction | Critical |
| 4 | **Two named key employees have no non-compete.** Roster marks all four as covered; only two agreements exist. | `06_Employees` roster vs file count | Roster reconciliation | High |
| 5 | **Undisclosed personal guarantee and cross-default** on an equipment loan; the debt schedule omits both. | `09_Debt/Equip_Loan_2.pdf` §7 vs `09_Debt/Debt_Schedule.xlsx` | Cross-document | High |
| 6 | **Double-counted addback.** QoE adds back owner compensation and a management fee that are the same $84k. | `12_QoE` addback schedule vs `02_Financials` GL | Arithmetic + tracing | High |
| 7 | **Supplier auto-renewal notice window already passed.** 90-day notice on a 5-year term; the window closed 6 weeks ago. | `07_Suppliers/Coastal_Distribution.pdf` | Date arithmetic against today | High |
| 8 | **Expired insurance certificate.** General liability certificate lapsed two months before the room opened. | `11_Insurance` | Date extraction | Medium |
| 9 | **Deferred capex.** No vehicle replaced in 3 years for a 14-vehicle fleet; maintenance costs rising 40% YoY. | `10_Capex` | Trend detection — DataGate territory | Medium |
| 10 | **Lost customer still in the forecast.** Transcript: "we lost Northside in Q3." Revenue detail and CIM projections still include them. | `14_Management` vs `03_Revenue_Detail` | Transcript ↔ document | High |
| 11 | **Referenced schedule absent.** Draft APA references Schedule 4.2 (Excluded Assets); it is not in the room. | `13_Legal` | Reference resolution | Medium |
| 12 | **Two roster versions, different headcount** (38 vs 41), no revision marks, both undated. | `06_Employees` | Near-duplicate detection | Medium |

**Distractors — plant these too.** A fixture with only real findings trains toward false
positives, which are the expensive error:

- An expired certificate that a later document shows was renewed — findable only by
  reading both
- A concentration figure that looks wrong but reconciles once intercompany revenue is
  excluded, as a footnote explains
- A change-of-control clause in a contract that terminates before close, making it moot
- A missing document that a folder README explains was intentionally withheld pending NDA

Correct behavior on all four is **not raising a finding**, or raising it and resolving it
with the offsetting evidence attached. Score these separately as precision.

---

## Expected output

A successful run finds **10 of 12** including all four Critical, raises **no more than
one** false positive from the distractors, and every finding carries a document, page,
and verbatim quote.

Findings 1, 3, 5, 6 and 10 are the discriminating set — they require joining two
documents and no general-purpose assistant handed the folder will produce them reliably.
Track those five separately as the **cross-document score**, because that number is the
actual product thesis expressed as a metric.

## Generation

Buildable in roughly a day by an agent given this specification.

1. Financial model first, in one spreadsheet, so every derived document is internally
   consistent — then break consistency *only* at the twelve planted points. Documents
   generated independently produce hundreds of accidental contradictions and the fixture
   becomes noise.
2. Generate document text from the model.
3. Render to PDF; print-and-scan or degrade ~30% to simulate scans (rotation ±2°, noise,
   150dpi).
4. Introduce the naming mess, near-duplicates, the corrupt file, and the password-protected
   pair last.
5. Write the answer key to `sample-deal-room-key.md` and **git-ignore it from any path the
   pipeline reads**.

Version the fixture. When extraction improves, the score must be comparable across runs,
which is impossible if the fixture drifts.

---

## What this fixture cannot tell you

Stated plainly, because a synthetic fixture invites over-trust:

- Whether **real** rooms contain these defect classes at these rates. Only real rooms
  answer that, which is why `m0-plan.md` requires shared redacted materials.
- Whether the findings are the ones **customers care about**. The interviews answer that.
- Whether real scans OCR this well. Synthetic degradation is kinder than a decade-old
  fax of a fax.

The fixture proves the process works on a room whose answers are known. It proves nothing
about the market.
