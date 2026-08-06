<!-- FICTIONAL EVALUATION MATERIAL — SYNTHETIC DEAL ROOM -->

# Review notes

Internal quality-control record for the Ridgeline register. Not sent to the customer,
but written as though it could be.

*Fictional evaluation material produced during an internal rehearsal.*

---

## QC checklist

| Check | Result |
|---|---|
| Every anchor opened and verified to support the claim as written | 22 of 22 |
| Every number recomputed from source | 10 of 10 calculations, log `C1`–`C10` |
| Every quote checked verbatim against the document | 22 of 22 |
| Every date checked against the document, not memory | Pass |
| Every finding re-read adversarially | Pass — three downgraded, see below |
| Severity re-rated cold | Two changed, see below |
| Both classification dimensions audited | Two corrections, see below |
| Customer and target names spelled correctly | Pass |
| Scope and limits section written before findings | Pass |

## Caught in QC

**Three findings were downgraded from assertion to ambiguity.**

- *Recurring revenue* (R-04) was first drafted as "recurring revenue overstated." The KPI
  definitions file defines management's measure and it is internally consistent. Rewritten
  as **Unresolved**. Drafting it as an overstatement would have been a factual error in a
  High finding — a refundable error under the pilot terms.
- *Fort Wayne margin* (R-16) was first drafted as "margin misreported." No overhead
  allocation policy is supplied, so a different allocation is a live explanation. Rewritten
  to state both figures and the absence of a policy.
- *Capex disagreement* (R-12) was first drafted as "unrecorded assets." Timing between
  order and in-service date explains two of the five. Rewritten as a reconciliation
  difference.

**Two severity changes on cold re-rating.**

- R-05 (Erie lease) raised Medium → **High**. It was initially rated on the lease document
  alone; the branch carries 3.8M of revenue, and the premises are held over at 125% rent
  with no renewal option.
- R-17 (revenue recognition) lowered High → **Medium**. The policy is disclosed in the
  package rather than hidden, and the assessment belongs to the QoE provider. Rating it
  High implied a conclusion about its appropriateness that we are not permitted to reach.

**Two classification corrections.**

- R-15 (Hartwell Exhibit B) was marked *missing*. Corrected to **not found** — it was never
  on the request list, and the request to the seller is worded differently as a result.
- R-22 (tax archive) was marked *missing* in the first draft. Corrected to **unreviewed**.
  This is the error with the highest cost per occurrence: it would have told the buyer to
  re-request a document the seller had already supplied.

## Considered and not raised

Recorded so that a reviewer can see what was examined and rejected, not only what was
reported. Each of these looked like a finding.

| Observation | Why not raised |
|---|---|
| Customer count 142 in the KPI deck vs 143 records in the master | `kpi_definitions.txt` defines active vs all and states both numbers |
| A customer with zero FY25 revenue | Churn log documents the April 2025 plant closure |
| Two identical fuel journal entries, Erie, same date and amount | Distinct journal ids and distinct accounts (6205, 6206) |
| GL and auto certificates both expiring 2026-01-15 | Renewal notice confirms both. Only the umbrella is excluded — that one **is** raised as R-10 |
| Northgate agreement references Exhibit A | Exhibit A is present in the package |
| Erie branch has no branch manager on the roster | Org chart footnotes the shared role with Fort Wayne since 2024 |
| Request item 10.3 marked "Not applicable" | Written rationale and a buyer confirmation date are supplied |
| Date formats differ between the capex and fixed asset registers | All parse unambiguously to the same calendar dates |
| A 0.062-hour line on the legal invoice | Immaterial and internally consistent |
| Toledo lease expiring 2029 | Ten-year term with a renewal option; nothing inconsistent |

**One that was raised** and looks like the fuel entries above: two identical payroll
journal rows in Toledo, same id, same amount, same date, in `trial_balance.csv`. Unlike
the fuel pair these share a journal id, which makes them a genuine duplicate posting.
Reported at Low within R-21 rather than as a standalone finding, because the amount is
immaterial and the register should not be padded.

## Known limits of this pass

- **FY2024 statements absent.** Any trend statement rests on two of three years.
- **One archive unreviewed.** Nothing is asserted about its contents.
- **One scan is low confidence.** The Erie permit was read manually; the recognised text
  was not relied on for any finding.
- **No independent verification.** Every figure comes from the seller's own documents.
  Internal consistency is what was tested; whether the underlying facts are true is not
  something a document review can establish.
- **The register is bounded by the request list.** A category nobody requested and the
  seller did not volunteer would not appear as missing, because nothing in the package
  points to it.

## Open items for the next pass

1. Whether a covenant waiver exists (R-03) — cannot be resolved from the package
2. Whether the Mercer matter is live (R-11) — counsel to confirm
3. Whether Lakeside consent has been sought (R-02) — buyer to confirm
4. Which entity Hartwell contracts with (R-18) — counsel to confirm
