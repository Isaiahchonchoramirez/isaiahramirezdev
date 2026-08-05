> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/WORKFLOW_MAP.md`](../../../validation/WORKFLOW_MAP.md)
> **Superseded because:** Its teaser-to-close context was kept as background; the owned-scope table from the other package was more precise.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Workflow map

Teaser → investment committee. **All time figures and failure rates are `[H]`** — this
map is built from public description of the process, not from interviews. Replace each
figure with `[E]` and a source as interviews land. Rewriting this file is a deliverable
of M0, not preparation for it.

Legend: **Sec** = security sensitivity (1 low → 5 extreme).

---

## Phase 1 · Teaser

| | |
|---|---|
| **Actor** | Buyer |
| **Input** | 2–4 page blind profile from a broker |
| **Task** | Decide whether to sign the NDA |
| **Output** | Signed NDA or a pass |
| **Tool** | Email |
| **Time** | 15 min |
| **Failure** | Passing on a good deal from a bad teaser |
| **Consequence** | Opportunity cost only |
| **Sec** | 1 |
| **Reef** | None. Nothing to read. |

## Phase 2 · CIM review

| | |
|---|---|
| **Actor** | Buyer |
| **Input** | 30–80 page CIM, sometimes summary financials |
| **Task** | Assess fit, size, margins, customer mix, owner dependence |
| **Output** | Pass, or an indication of interest |
| **Tool** | PDF reader, a scratch spreadsheet |
| **Time** | 2–5 h |
| **Failure** | Believing the CIM. It is a marketing document written by the sell-side. |
| **Consequence** | Weeks spent on a deal that dies at diligence |
| **Sec** | 3 |
| **Reef** | **High potential.** Extract the claims a CIM makes so they can be checked later. Cheap, fast, high frequency — a buyer reads 20+ CIMs per deal pursued. |

## Phase 3 · Screening and IOI

| | |
|---|---|
| **Actor** | Buyer, sometimes an investor |
| **Input** | CIM, market comparables, a first model |
| **Task** | Value it, decide a range |
| **Output** | IOI |
| **Tool** | Excel |
| **Time** | 4–10 h |
| **Failure** | Anchoring on adjusted EBITDA that will not survive a QoE |
| **Consequence** | Retrading or a dead deal after real spend |
| **Sec** | 3 |
| **Reef** | Low. This is modeling, not document understanding. |

## Phase 4 · Management meeting

| | |
|---|---|
| **Actor** | Buyer, seller, broker |
| **Input** | Questions from the CIM read |
| **Task** | Test the owner's story |
| **Output** | Notes, sometimes a recording |
| **Time** | 3–6 h including prep |
| **Failure** | Verbal claims never written down, never verified against documents later |
| **Consequence** | The most common source of post-close surprise |
| **Sec** | 4 |
| **Reef** | **High potential, later.** Transcript reconciled against documents — "the owner said X, the documents say Y" — is a genuinely novel finding class and nobody does it. V2, not MVP. |

## Phase 5 · LOI and exclusivity

| | |
|---|---|
| **Actor** | Buyer, attorney |
| **Input** | Valuation, structure |
| **Task** | Negotiate terms, set the exclusivity clock |
| **Output** | Signed LOI, typically 30–90 days |
| **Time** | 5–15 h over 1–2 weeks |
| **Failure** | Too little exclusivity for the diligence actually required |
| **Consequence** | Rushed diligence, or an extension paid for with price |
| **Sec** | 4 |
| **Reef** | None directly. **But this is the moment of purchase intent** — the clock starting is the trigger event Reef sells against. |

## Phase 6 · Data room opens

| | |
|---|---|
| **Actor** | Buyer, analyst |
| **Input** | 500–5,000 files, inconsistently named, often part scanned |
| **Task** | Inventory it. Work out what's there and what's missing. |
| **Output** | A tracking spreadsheet, a request list back to the seller |
| **Tool** | Excel + the VDR's index |
| **Time** | **6–15 h**, pure overhead, produces no insight |
| **Failure** | An incomplete inventory. You cannot notice the absence of a document you never knew to expect. |
| **Consequence** | A missing document surfaces in week three with no time to react |
| **Sec** | 5 |
| **Reef** | **Highest-value single intervention.** Automatic inventory, classification, and gap detection against a standard room. Removes pure overhead, requires no judgment, and delivers on day one instead of day four. |

## Phase 7 · Financial diligence

| | |
|---|---|
| **Actor** | QoE accountant, buyer |
| **Input** | Financials, GL, bank statements, tax returns |
| **Task** | Verify earnings, test addbacks, normalize working capital |
| **Output** | QoE report |
| **Tool** | The accountant's own |
| **Time** | 2–4 weeks external; 5–15 h of buyer time |
| **Failure** | Addbacks that don't survive; working capital peg set wrong |
| **Consequence** | Direct, six figures |
| **Sec** | 5 |
| **Reef** | **Stay out.** This is a licensed, insured, well-served function. Competing here is a mistake. Reef should *read* the QoE report and reconcile it against everything else. |

## Phase 8 · Commercial and customer diligence

| | |
|---|---|
| **Actor** | Buyer |
| **Input** | Customer lists, revenue by customer, contracts, sometimes calls |
| **Task** | Test concentration, retention, pricing, contract durability |
| **Output** | A concentration analysis; a section of the IC memo |
| **Tool** | Excel, manual reading |
| **Time** | **10–25 h** |
| **Failure** | Concentration understated in the CIM; contracts that don't survive a sale |
| **Consequence** | **The single most common deal-killer at this size** |
| **Sec** | 5 |
| **Reef** | **Very high.** Reconcile CIM concentration claims against monthly revenue detail, then against actual contract terms. Cross-document, evidence-linked, and squarely in the gap between QoE and legal. |

## Phase 9 · Legal and contract diligence

| | |
|---|---|
| **Actor** | Attorney, buyer |
| **Input** | Contracts, leases, corporate records, IP, litigation |
| **Task** | Attorney gives a legal opinion. **Buyer still reads for business impact.** |
| **Output** | Issues list; buyer's own notes |
| **Tool** | Reading |
| **Time** | Attorney billed; **15–30 h of buyer time** |
| **Failure** | Change-of-control, auto-renewal, exclusivity, assignment restrictions |
| **Consequence** | Six figures; occasionally kills the deal |
| **Sec** | 5 |
| **Reef** | **Very high, with a firm boundary.** Reef extracts and links; it never opines on legal effect. "This clause requires consent on change of control, here it is on page 14" is extraction. "This is enforceable" is legal advice and is out of scope permanently. |

## Phase 10 · Operational, HR, IT

| | |
|---|---|
| **Actor** | Buyer, operating partner |
| **Input** | Rosters, comp, benefits, systems, licenses |
| **Task** | Assess key-person risk, comp accuracy, transferability |
| **Output** | IC memo sections; retention plan |
| **Time** | 8–15 h |
| **Failure** | Key employees with no retention or non-compete; owner-dependent operations |
| **Consequence** | Value destruction post-close, hard to price |
| **Sec** | 5 |
| **Reef** | **Medium-high.** Roster reconciliation against payroll and agreements; flagging people named as key with nothing signed. |

## Phase 11 · Insurance, environmental, regulatory

| | |
|---|---|
| **Actor** | Buyer, brokers |
| **Input** | Policies, certificates, permits, filings |
| **Task** | Confirm coverage and currency |
| **Output** | Checklist items |
| **Time** | 3–8 h |
| **Failure** | Expired certificates, lapsed permits, uninsured exposure |
| **Consequence** | Usually moderate; occasionally severe |
| **Sec** | 4 |
| **Reef** | **Medium, and disproportionately easy.** Date extraction and expiry checking is near-deterministic and produces visible wins cheaply. Good early demo material. |

## Phase 12 · Supplemental uploads

| | |
|---|---|
| **Actor** | Seller, buyer |
| **Input** | 50–500 more files, often late, often revised versions |
| **Task** | Work out what changed and whether prior conclusions still hold |
| **Output** | Updated notes; new requests |
| **Tool** | Manual re-reading, usually partial |
| **Time** | **5–20 h, and frequently skipped under time pressure** |
| **Failure** | A revised document invalidates an earlier conclusion and nobody notices |
| **Consequence** | **Severe and under-recognized.** The nastiest post-close surprises live here. |
| **Sec** | 5 |
| **Reef** | **Very high, and nearly unserved.** Version diff with finding invalidation. Agony by hand, so it usually doesn't happen. `../03-ux.md` surface 12. |

## Phase 13 · IC / investor / lender approval

| | |
|---|---|
| **Actor** | Buyer → investors, IC, lender credit |
| **Input** | Everything above |
| **Task** | Assemble a defensible recommendation |
| **Output** | **IC memo** |
| **Time** | 10–20 h of writing |
| **Failure** | Assertions the author can't source when questioned |
| **Consequence** | Delay, re-diligence, lost credibility |
| **Sec** | 5 |
| **Reef** | **This is the artifact.** Everything Reef produces should be shaped to drop into this document with citations intact. A finding that can't be pasted into the IC memo is a finding in the wrong format. |

## Phase 14 · Purchase agreement and disclosure schedules

| | |
|---|---|
| **Actor** | Attorneys, buyer |
| **Input** | Diligence findings |
| **Task** | Reps, warranties, indemnities, disclosure schedules |
| **Output** | Executed APA |
| **Time** | 20–40 h across parties |
| **Failure** | Schedules that contradict the data room |
| **Consequence** | Indemnity exposure |
| **Sec** | 5 |
| **Reef** | **Interesting and later.** Reconciling disclosure schedules against the room is a real, hard, checkable job. V2. |

---

## The narrowest useful intervention

Reef's MVP should be **phase 6 plus phases 8 and 9, and nothing else.**

> Inventory the room, then extract and evidence-link the commercial and contractual
> facts that decide the price — concentration, change-of-control, assignment,
> auto-renewal, term and expiry, key-person coverage — reconciled across the CIM, the
> revenue detail, and the contracts.

Why this and not more:

- **It's the buyer's own work.** Phase 7 belongs to the accountant and phase 9's legal
  opinion to the attorney. The buyer's personal reading in 6, 8 and 9 is 30–70 hours
  and nobody is paid to do it for them. That is the gap.
- **It's checkable.** Every output is a fact with a page number. No judgment, no opinion,
  no professional liability.
- **It's where deals die.** Concentration and change-of-control are the two most common
  killers at this size.
- **It fits the clock.** Delivered in 72 hours it changes what happens in the remaining
  exclusivity. Delivered in two weeks it is a post-mortem.

**Deliberately excluded from MVP** — each is defensible later and dilutive now: QoE
work, legal opinions, valuation, market research, phase 4 transcript reconciliation
(V2), phase 12 version diff (M5 — high value, needs a corpus to diff against), phase 14
schedule reconciliation (V2).

**What Reef must never claim:** that it constitutes diligence. It is one pass over the
documents that makes the human pass faster and better sourced. The moment the marketing
implies completeness, a missed finding becomes Reef's liability rather than an
acknowledged limit — and that is an existential difference for a one-person company.
