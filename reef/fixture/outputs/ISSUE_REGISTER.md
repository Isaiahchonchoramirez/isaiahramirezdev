<!-- FICTIONAL EVALUATION MATERIAL — SYNTHETIC DEAL ROOM -->

# Issue register

**Ridgeline Industrial Services, LLC** · R1 baseline · prepared 2026-02-17

*Fictional evaluation material produced during an internal rehearsal. Not a customer
deliverable.*

---

## Scope and limits — read first

This register covers **only** the documents supplied in the package as of 2026-02-14, at
the folders and files listed in the document inventory.

**This is not diligence.** It is one organized pass over supplied documents that makes
your own review faster and better sourced. It does not discharge any duty you owe your
investors or your lender.

Specifically, this register contains **no** legal, tax, accounting, audit,
quality-of-earnings, valuation, insurance, investment, or transaction advice, and no
recommendation to proceed, to pay any amount, or to structure the transaction in any way.
Where a document raises a question of legal effect or accounting treatment, the question
is stated and routed; it is never answered here.

One file could not be opened and is **unreviewed**, not missing. Two-thirds of the
trailing financial period could not be independently examined because the FY2024
statements were not supplied.

## How to read a row

Each finding carries **two** classifications.

- **State** — what is known about the source: *reviewed*, *unreviewed*, *not found*,
  *missing*, *not applicable*.
- **Label** — what kind of statement this is: **Extracted** (stated in a document),
  **Calculated** (arithmetic, shown in the calculation log), **Inferred** (reasoning
  beyond the text, attributed to us), **Unresolved** (sources conflict, both shown),
  **Missing** (expected and absent).

Nothing is labelled Extracted because it is probably true. Nothing labelled Inferred
appears without the extracted facts beneath it.

## Summary

| Severity | Count |
|---|---:|
| Critical | 3 |
| High | 6 |
| Medium | 9 |
| Low | 3 |
| Informational | 1 |
| **Total** | **22** |

---

## Critical

### R-01 · Customer concentration materially understated
**Label:** Calculated · **State:** reviewed · **Route:** buyer, counsel

The largest customer is **22.40%** of FY2025 revenue. Seller Q&A Q-011 states no customer
exceeds 11%.

- `03_Customers/Revenue_by_Customer_FY25.xlsx` › sheet `FY25`, row 3 — Lakeside Steel
  Processing Co., 3,676,485
- `02_Financial/Income_Statement_FY2025.pdf` › p.1, "Total revenue" — 16,412,880
- `10_QA/seller_qa_log.csv` › row `Q-011` — *"No single customer exceeds 11% of revenue in
  FY2025."*
- Arithmetic: [C1](CALCULATION_LOG.md)

*Consequence:* the concentration figure relied on in screening is understated by roughly
a factor of two. **Read together with R-02.**

### R-02 · Change of control requires the largest customer's consent
**Label:** Extracted · **State:** reviewed · **Route:** counsel

- `03_Customers/Lakeside_Master_Service_Agreement.pdf` › **p.2, §14.2** —
  *"A change in the direct or indirect beneficial ownership of more than fifty percent
  (50%) of the voting interests of Provider shall be deemed an assignment for purposes of
  Section 14.1 and shall require the prior written consent of Customer, which consent may
  be withheld in Customer's sole discretion."*
- Same document › **p.2, §14.3** — 30-day termination right if consent is not obtained
  before the change of control.

Not disclosed in the Q&A log or elsewhere in the package.

*Consequence:* the customer representing 22.4% of revenue has a discretionary consent
right and a termination right attached to this transaction. **Whether the clause is
enforceable is a legal question and is not addressed here.**

### R-03 · Fixed charge coverage covenant not met on the supplied calculation
**Label:** Calculated · **State:** reviewed · **Route:** buyer, counsel, lender

FCCR computes to **1.18x** against a **1.25x** minimum.

- `02_Financial/Covenant_Compliance_Certificate_FY2025.pdf` › p.1 —
  *"Fixed charge coverage ratio 1.18x / Required minimum under Section 6.11 1.25x"*
- `02_Financial/debt_schedule.csv` › row 1, `covenants` — *"Fixed charge coverage ratio
  not less than 1.25x, tested annually"*
- Arithmetic: [C3](CALCULATION_LOG.md)

No waiver or amendment is in the package. **Unresolved** whether one exists — added to
the information request.

---

## High

### R-04 · Recurring revenue: 78% reported, 52.0% on contracted maintenance
**Label:** Unresolved · **State:** reviewed · **Route:** buyer

Both figures are arithmetically correct under their own definitions. Management's measure
includes time-and-materials work from contract-holding customers.

- `06_Operations/Branch_KPI_Deck_FY2025.pdf` › p.1, line 7 — *"Recurring contract revenue
  as a share of total 78%"*
- `06_Operations/kpi_definitions.txt` › "Recurring revenue" — the definition
- `10_QA/management_meeting_transcript.md` › *"call it 78 percent"*
- Arithmetic: [C2](CALCULATION_LOG.md)

**This is a definition difference, not a misstatement.** It is recorded because the two
numbers support different valuations and the definition is not stated in the CIM-level
material.

### R-05 · Erie facility lease expired; premises held over
**Label:** Extracted · **State:** reviewed · **Route:** counsel, buyer

- `07_Legal_Insurance/Facility_Lease_Erie.md` › "Expiry: November 30, 2025",
  "Renewal options: none", holdover at 125% of base rent
- `10_QA/seller_qa_log.csv` › row `Q-019` — *"All three facilities are leased through 2028
  or later."*
- `10_QA/management_meeting_transcript.md` › *"All the leases run out past 2028."*

Erie is 3,800,000 of FY2025 revenue (`06_Operations/Branch_KPI_Deck_FY2025.pdf`, p.1).

### R-06 · Aged receivables concentrated in one customer
**Label:** Calculated · **State:** reviewed · **Route:** buyer, QoE provider

**18.0%** of receivables is over 90 days; **55.7%** of that is one customer at 118 days.

- `02_Financial/ar_aging.csv` › rows 1–4; row 1 `INV-24118`, Consolidated Foundry Group,
  341,200, 118 days
- `10_QA/seller_qa_log.csv` › row `Q-014` — *"There are no collection issues; aging is
  normal for the industry."*
- Arithmetic: [C4](CALCULATION_LOG.md)

AR is stated net on the balance sheet; the size of any reserve is not disclosed in the
package. Adequacy of the reserve is a question for the QoE provider.

### R-07 · Thirteen field personnel paid as contractors
**Label:** Extracted · **State:** reviewed · **Route:** counsel, tax adviser

- `05_Employees/contractor_schedule.csv` › 13 rows, form `1099-NEC`; 10 titled
  "Field technician"
- `05_Employees/payroll_summary.txt` › line 3 — 71 W-2 employees
- `10_QA/seller_qa_log.csv` › row `Q-022` — *"All field staff are employees of the
  Company."*
- Reconciliation: [C10](CALCULATION_LOG.md) — 71 + 13 = 84, ties to the roster

**Worker classification is a legal and tax determination and is expressly not addressed
here.** The finding is the inconsistency between the schedule and the Q&A response.

### R-08 · Single supplier is 61.3% of parts cost, terminable on 60 days
**Label:** Calculated · **State:** reviewed · **Route:** buyer

- `04_Suppliers/top_vendor_schedule.txt` › lines 3–4 — 2,562,000 of 4,180,000
- `04_Suppliers/Hartwell_Distribution_Agreement.pdf` › p.1 §11.2 — *"Either party may
  terminate this Agreement for convenience upon sixty (60) days prior written notice"*
- Arithmetic: [C5](CALCULATION_LOG.md)

Pricing sits in Exhibit B, which is **not found** in the package — see R-15.

### R-09 · Unbilled work in process grew 148.8% against 8.5% revenue growth
**Label:** Calculated · **State:** reviewed · **Route:** buyer, QoE provider

- `06_Operations/wip_schedule.txt` › 410,000 → 1,020,000
- `02_Financial/Balance_Sheet_FY2025.pdf` › p.2, notes
- Arithmetic: [C6](CALCULATION_LOG.md)

*Consequence:* 610,000 of additional revenue recognised and not yet billed. Working
capital effect is a question for the QoE provider.

---

## Medium

### R-10 · Umbrella policy expiring, renewal explicitly excluded
**Label:** Missing · **State:** missing · **Route:** insurance broker

- `07_Legal_Insurance/insurance_certificates.csv` › row 3 — UM-40311, expiry 2026-01-15,
  limit 5,000,000
- `07_Legal_Insurance/insurance_renewal_notice.txt` › final line — *"The umbrella policy
  UM-40311 is NOT included in this renewal confirmation."*

General liability and commercial auto **were** renewed — see the review notes; that pair
was checked and is not a finding.

### R-11 · Litigation summary contradicted by counsel's invoice
**Label:** Unresolved · **State:** reviewed · **Route:** counsel

- `07_Legal_Insurance/Litigation_Summary.pdf` › p.1 — *"There are no pending or threatened
  legal proceedings"*
- `07_Legal_Insurance/legal_invoice_2025-11.txt` › lines 4–5 — *"Review of Mercer
  arbitration demand and response strategy 3.4 hrs"*
- `10_QA/management_meeting_transcript.md` › *"We had a supplier disagreement… Mercer…
  that's with the lawyers and it's nothing."*

The matter may have concluded between the November invoice and the February summary. The
package does not say.

### R-12 · Capex and fixed asset registers disagree by 175,000
**Label:** Calculated · **State:** reviewed · **Route:** buyer, QoE provider

Five vehicle additions totalling 487,000 in one register; three totalling 312,000 in the
other. One asset carried at two costs (118,900 vs 188,500).

- `09_Capex/capex_register.csv` › rows 1–5 · `09_Capex/fixed_asset_register.csv` › rows 1–3
- Arithmetic: [C8](CALCULATION_LOG.md)

Timing — ordered in FY2025, placed in service FY2026 — is a plausible explanation for two
of the five and is not evidenced either way.

### R-13 · Two revenue schedules of record
**Label:** Unresolved · **State:** reviewed · **Route:** buyer

Two undated FY25 workbooks differ by 118,000 on one customer, with no revision marks.
Only the original ties to the income statement.

- `03_Customers/Revenue_by_Customer_FY25.xlsx` and `..._v2.xlsx` › sheet `FY25`, row 4
- Arithmetic: [C9](CALCULATION_LOG.md)

*Resolved in R2* — see the delta note at the end.

### R-14 · FY2024 financial statements not supplied
**Label:** Missing · **State:** missing · **Route:** buyer, QoE provider

- `00_Request_List/request_list.csv` › row `2.2`, seller status "Not supplied"
- `10_QA/seller_qa_log.csv` › row `Q-027` — *"Will follow."*

The middle year of the trailing three cannot be independently examined.

### R-15 · Exhibit B to the Hartwell agreement not found
**Label:** Missing · **State:** **not found** · **Route:** buyer, counsel

- `04_Suppliers/Hartwell_Distribution_Agreement.pdf` › p.1 §4 — *"Distributor pricing is
  set out in Exhibit B, attached hereto and incorporated by reference"*

**State is *not found*, not *missing*:** it was never on the request list, because its
existence is only discoverable from the agreement itself. This is why the state matters —
the request to the seller is worded differently.

### R-16 · Fort Wayne gross margin: 34.2% reported, 28.7% computed
**Label:** Calculated · **State:** reviewed · **Route:** buyer, QoE provider

A 5.5 point difference, roughly 227,000 of gross profit.

- `06_Operations/Branch_KPI_Deck_FY2025.pdf` › p.1, line 4
- `02_Financial/trial_balance.csv` › `JE-FTW-4000`, `JE-FTW-5000`
- Arithmetic: [C7](CALCULATION_LOG.md)

No overhead allocation policy is supplied. Branch reporting may allocate differently; the
package does not say.

### R-17 · Equipment revenue recognised on order acceptance
**Label:** Extracted · **State:** reviewed · **Route:** QoE provider

- `02_Financial/Balance_Sheet_FY2025.pdf` › p.2, revenue recognition note — *"equipment
  sales are recorded when a customer purchase order is accepted and the order is entered"*

Equipment sales are 3,340,000 of FY2025 revenue. **Whether this policy is appropriate is
an accounting judgment and is expressly not addressed here.** Routed to the QoE provider
as a scope question, since their draft notes state contract terms and revenue policy are
outside their current scope.

### R-18 · R2 Exhibit B names a different contracting entity
**Label:** Extracted · **State:** reviewed · **Route:** counsel

- `11_Update_R2/Hartwell_Exhibit_B_Pricing.txt` › line 3 — *"RIDGELINE INDUSTRIAL SERVICES
  OF OHIO, LLC"*
- `04_Suppliers/Hartwell_Distribution_Agreement.pdf` › p.1 — contracting party is
  *Ridgeline Industrial Services, LLC*
- `01_Corporate/Articles_of_Organization.pdf` › p.1 — no such entity is evidenced

**R-15 is not marked resolved.** The document supplied does not, on its face, attach to
the agreement in the package.

---

## Low

### R-19 · Entity name inconsistent
**Label:** Extracted · **State:** reviewed

*"Ridgeline Industrial Service LLC"* in `01_Corporate/ownership_schedule.csv` (column
`entity_name_as_written`) against *"Ridgeline Industrial Services, LLC"* in the articles.
Clerical variation is the likeliest explanation. **No separate entity is inferred.**

### R-20 · Customer identifier zero-padding lost
**Label:** Extracted · **State:** reviewed

`000418` in `03_Customers/customer_master.csv` against `418` in
`03_Customers/Revenue_by_Customer_FY25.xlsx`. Joining on the raw value will not match.
Affects any analysis that links the two.

### R-21 · Employee roster data quality
**Label:** Calculated · **State:** reviewed

`05_Employees/employee_roster.xlsx` › sheet `Roster`: four rows with blank `hire_date`;
two `employee_id` values duplicated. Also noted: two identical payroll journal rows in
`02_Financial/trial_balance.csv` (`JE-TOL-6100`, same amount, same date).

---

## Informational

### R-22 · Tax support archive unreviewed
**Label:** Extracted · **State:** **unreviewed**

`08_Tax/Tax_Support_2023-2025.zip` is password-protected and was not opened.

**It was supplied. It is not missing.** Ask for the password, not for the workpapers.
Nothing in this register draws on its contents, and no conclusion about tax support is
implied by its absence from the analysis.

---

## R2 delta

Room update received 2026-02-16.

| Change | Effect on this register |
|---|---|
| `Revenue_by_Customer_FY25_v2.xlsx` **withdrawn** | **R-13 resolved.** The original is the schedule of record, and it ties to the income statement. |
| `Hartwell_Exhibit_B_Pricing.txt` **added** | **R-15 remains open.** See R-18 — the exhibit names a different entity. |
| `seller_qa_log_revised.csv` **added** | Q-011 corrected to "approximately 22%", consistent with R-01. Q-027 now states FY2024 statements are not available in final form — **R-14 changes from pending to confirmed unavailable.** |

Nothing else in the package changed. No previously supplied document was replaced or
silently revised.
