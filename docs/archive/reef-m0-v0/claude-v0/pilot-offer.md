> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/PILOT_OFFER.md`](../../../validation/PILOT_OFFER.md)
> **Superseded because:** Its pricing was not cost-justified and was replaced; the accuracy-based refund survives.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Pilot offer

The thing actually sold during M0. It is a **service**, delivered by hand, and it is
described that way — no software is implied, promised, or hinted at.

Reconciled with [ADR-001](../../decisions/ADR-001-initial-market-wedge.md), which
authorizes paid manual pilots and explicitly bars professional advice.

---

## The offer

> **Data room inventory and evidence register — $1,500, delivered in 72 hours.**
>
> Send the documents you've been given. Within 24 hours you get an inventory of
> everything in the room, classified, plus a list of what a room like this normally
> contains and yours doesn't — so you can request it from the seller while we keep
> working.
>
> Within 72 hours you get an issue register: contract terms, dates, obligations and
> concentration figures pulled out and reconciled against each other, with every single
> line linked to the document and page it came from. Where sources disagree, both are
> shown. Where something is missing, it's named.
>
> Reviewed by a person before it reaches you. Every claim is checkable in the time it
> takes to click it.

### Exact buyer

A searcher, independent sponsor, or small-team acquirer **with a signed LOI and an
active exclusivity period**, personally reading data-room documents, on a deal between
$2M and $25M enterprise value.

Not qualified: anyone pre-LOI (no room yet), anyone whose analyst does the reading
(different buyer, different sale), or any deal above ~$50M (different process, different
expectations, and Reef is not staffed for it).

### Exact input

A data room of **up to 2,500 documents** in PDF, DOCX, XLSX, CSV, MSG or EML, delivered
as a zip or a share the customer controls. Formats listed in
[`concierge-runbook.md`](concierge-runbook.md). Scans accepted; OCR confidence is
reported rather than hidden.

### Exact deliverable

1. **Inventory** — every file, classified, deduplicated, with unreadable files named
2. **Missing-document list** — delivered at 24h, separately, because it's actionable
   immediately
3. **Issue register** — findings by severity, each labeled *extracted*, *calculated*,
   *inferred*, *unresolved* or *missing*, each with document, page and verbatim quote
4. **Evidence appendix** — quotes and highlighted page crops, indexed
5. **Structured data profile** — for spreadsheets, via the DataGate engine
6. **45-minute review call**

Formats: PDF and DOCX, so findings paste into their IC memo with citations intact.

### Turnaround

Inventory + missing list at **24 hours**. Full register at **72 hours**. Rush available
(below). Turnaround starts when the last document arrives, not when the agreement is
signed — stated in writing, because rooms trickle.

---

## What Reef does and does not do

The most important section in the document. It appears verbatim in the agreement, in the
memo's scope section, and on any page describing the service.

**Reef does:**
- Inventory, classify, and deduplicate the documents provided
- Extract terms, dates, parties, amounts and obligations, with source locations
- Compare documents against each other and report where they disagree
- Identify referenced material absent from the room
- Profile supplied structured data
- Record human-reviewed issues for the customer's professional team

**Reef does not — and will not, at any price:**
- Provide legal, tax, accounting, investment, valuation, or transaction advice
- Perform a quality-of-earnings analysis or opine on any addback
- Interpret whether a clause is enforceable or what it legally means
- Recommend whether to proceed, what to pay, or how to structure
- Replace counsel, accountants, QoE providers, or insurance advisors
- Claim the review is complete, exhaustive, or a substitute for professional diligence

> **The stated limit:** this is one organized pass over the documents you provided,
> ending on a stated date. It makes your own review faster and better sourced. It is not
> diligence and does not discharge any duty you owe your investors or your lender.

That paragraph is not defensive boilerplate — it is what keeps a missed finding an
acknowledged limit rather than a claim against a one-person company.

---

## Confidentiality

**A transaction attorney must review these terms before the first paid pilot.** This
document is a starting point for that review, not a substitute for it. Do not sign
anything derived from it unreviewed.

Terms to be drafted:

- Mutual NDA, executed before any document transfer
- **Customer represents that their seller NDA permits disclosure to a service provider
  under their direction.** Reef requests the clause and reads it. This is the single
  largest legal risk in the pilot and it is on the customer to confirm — but Reef checks
  rather than accepting an assurance.
- Reef is a service provider, not an advisor; no fiduciary relationship
- Working copies destroyed 30 days after delivery, or on request, with written
  confirmation
- Fixture retention requires **separate written permission naming that specific room**.
  Never bundled into this agreement's boilerplate.
- Liability capped at fees paid. Non-negotiable at this stage; walk away rather than
  accept uncapped exposure on a $1,500 engagement.
- No third-party model provider retains content; zero-retention endpoints only

---

## Pricing experiments

`$1,500` is a hypothesis (`m0-plan.md`, W1), not a finding. Run all three concurrently
across different prospects, not sequentially, or market conditions confound the result.

### A · Fixed-price concierge — $1,500

The stated anchor. Full deliverable, 72 hours, up to 2,500 documents.

*Tests:* is the anchor near the ceiling or well below it? *Watch for:* the reaction.
Instant yes suggests underpricing. Hesitation followed by yes is roughly right. "Let me
think about it" that never returns is a no.

### B · Design partner — $750, capped at five

Same deliverable, half price, explicitly framed as early access. In exchange:
a recorded review call, permission to retain an anonymized fixture, and one introduction.

*Tests:* whether price is the actual objection. *The trap to avoid:* if A fails and B
sells, that is **not** validation that the price is wrong — it may mean the value isn't
there and the discount merely bought politeness. Weight B's conversions at roughly half.
Track them separately and never blend them into a headline number.

### C · Rush — $3,500, 24 hours

Full deliverable, one business day, priority. Offer only to prospects with under 10 days
of exclusivity left.

*Tests:* whether urgency prices, which is the most important pricing question of the
three. If C sells at all, the pricing axis is **time**, not scope, and the whole
commercial model should be rebuilt around deadline proximity. This is the experiment
most likely to produce a genuinely surprising result.

**Not offered: free.** A free pilot tests whether someone accepts a gift. It teaches
nothing about willingness to pay, it anchors the relationship at zero, and it makes the
customer a reviewer rather than a buyer. If a specific strategic prospect warrants free
work, price it at $750 and waive it in writing for a stated reason — the number still
gets anchored.

### Structure

| | |
|---|---|
| **Deposit** | 50% to book the slot, non-refundable once work begins |
| **Balance** | On delivery |
| **Why a deposit** | It is the only rung on the commitment ladder that is evidence. Everything below it is conversation. |
| **Refund** | Full refund, including deposit, if the register contains a **factual error in a finding marked Critical**. Not for dissatisfaction — for being wrong. |
| **Cancellation** | Before work begins: deposit refunded. After: retained. |
| **Overage** | Over 2,500 documents quoted separately before starting, never surprised afterward |

The refund condition is deliberately narrow and deliberately hard on Reef. It says the
one thing that matters: we will be wrong about nothing, or you pay nothing. A
satisfaction guarantee invites a haggle; an accuracy guarantee states the product thesis
as a contractual term.

---

## Success criteria

Per engagement, decided before delivery so the result can't be rationalized:

| | Pass |
|---|---|
| Delivered on time | 72h (or 24h for C) |
| Findings | ≥ 8, with ≥ 2 the customer calls material |
| Accuracy | **Zero factual errors in Critical findings.** One is a failure regardless of the rest. |
| Evidence used | Customer opens ≥ 3 evidence links during the review call |
| Effort | ≤ 12h human by the third engagement |
| Forwarded | Customer sends the register to an investor, lender, attorney or accountant within 7 days |
| Repeat intent | Asks about the next deal, or introduces someone, unprompted |

**Forwarded is the criterion that matters.** It is checked by asking a week later, and it
is the difference between a document someone found interesting and a document that
entered their process.

---

## Outreach

Short, specific, no product language. Sent only to prospects with an active LOI.

> You mentioned you're in diligence on [deal]. I'm running three paid pilots this month:
> I take the data room and come back in 72 hours with an inventory, a list of what's
> missing, and an issue register where every line links to the page it came from.
> $1,500. It's me doing the work, not software, and it doesn't replace your attorney or
> your QoE — it's the reading you'd otherwise do yourself at 2am.
>
> Want the slot?

Why this works: it names a real deliverable, states the price immediately, admits it's
manual, and disclaims the two things they'd otherwise worry it's pretending to be. The
2am line is the only piece of persuasion in it, and it should be replaced with a verbatim
quote from an interview as soon as one exists.
