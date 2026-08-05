> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/CONCIERGE_RUNBOOK.md`](../../../validation/CONCIERGE_RUNBOOK.md)
> **Superseded because:** Label taxonomy and QC survive; its procedure was merged with a more explicit operating sequence.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Concierge runbook

How to deliver the pilot by hand, before software exists.

The customer is buying a **findings memo**, not access to a tool. How it is produced is
Reef's problem. Use anything — scripts, the DataGate profiler, models, a legal pad. The
only rules are the evidence discipline and the honesty of the labels.

**Target: under 12 hours of human effort per room by the third delivery.** Log actual
hours every time. If run three is over 25 hours, that is a kill signal (`m0-plan.md`),
not a reason to work harder.

---

## Supported inputs

| Accepted | Notes |
|---|---|
| PDF, native | Primary |
| PDF, scanned | OCR'd. Confidence recorded per document. |
| DOCX, XLSX, CSV | Spreadsheets via the DataGate profiler where useful |
| MSG / EML | Only where the customer flags a thread as relevant |
| Images of documents | OCR'd, always flagged as lower confidence |
| ZIP | Expanded, structure preserved |

**Declined at pilot stage, stated up front:** audio, video, handwriting, CAD, non-English,
and anything password-protected the customer hasn't unlocked. Say this in the offer so
the boundary is agreed before intake rather than negotiated after.

**Hard cap: 2,500 documents.** Larger rooms are quoted separately after a look.

---

## 1 · Intake

Nothing begins until all seven are complete:

- [ ] Pilot agreement signed, deposit received
- [ ] NDA in place, both directions
- [ ] **Written confirmation the customer may share these documents with a service
      provider under their seller NDA.** Ask for the clause. Do not accept "should be
      fine."
- [ ] Transfer method agreed — encrypted drive, or a customer-controlled share
- [ ] Deal context captured (below)
- [ ] Deadline confirmed, and stated back
- [ ] Deletion date agreed in writing

**Deal context — 20 minutes, on a call, and it is the highest-leverage 20 minutes in the
process:**

- Business, sector, approximate size, structure (asset or stock)
- What worries them most about this specific deal
- What they've already read
- What's already outsourced and to whom (avoid duplicating the QoE)
- Which three findings would change their price
- Who reads the memo

The last two shape the memo's ordering. A memo that opens with what they already knew
reads as worthless even when it's thorough.

## 2 · Inventory

Before reading anything.

1. Full recursive listing: filename, path, size, type, page count, hash
2. Deduplicate by hash; note near-duplicates by name
3. Classify each into ~20 categories (financial, contract, lease, employment, insurance,
   tax, corporate, permit, correspondence, other)
4. Flag unreadable, encrypted, empty, or zero-text-layer files
5. **Gap check against the standard room** — what a room this size normally contains and
   this one doesn't

Output: an inventory table and a **missing-documents list**. Send the missing list to the
customer within 24 hours of intake, before the memo. It is immediately actionable — they
can request from the seller while Reef keeps working — and it is the fastest proof that
the engagement is real.

## 3 · Extraction

Per category, extract to a fixed schema. Every extracted value carries its source
location or it is discarded.

| Category | Extract |
|---|---|
| Contracts | Parties, effective date, term, renewal, notice window, assignment, change-of-control, exclusivity, termination, price terms |
| Leases | Premises, term, expiry, renewal options, assignment, rent schedule, personal guarantees |
| Revenue detail | Customer, period, amount → concentration by year |
| Employment | Name, role, comp, start, non-compete, non-solicit, change-of-control |
| Insurance | Carrier, policy, coverage, limits, effective, **expiry** |
| Debt | Lender, balance, rate, maturity, covenants, cross-default, guarantees |
| Corporate | Entity, ownership, authorizations, encumbrances |
| Permits | Type, issuer, number, expiry |

**Every row records: document, page, and either a bounding box or a quoted string.** A
row without a location is deleted, not flagged. Allowing one unsourced row sets the
precedent that ends the discipline.

## 4 · Evidence linking

Non-negotiable, and the whole product.

For each extracted fact and each finding:

1. Source document filename and stable id
2. Page number, or sheet + cell for spreadsheets, or section for structured documents
3. **A verbatim quote of the supporting text**, ≤ 50 words
4. A page image crop with the region highlighted, for anything material
5. A stable link to the file in the customer's own copy

In the delivered memo, every finding carries `[Doc, p.N]` and the appendix contains the
quote and crop. **If a statement cannot be linked, it does not appear in the memo.** Not
softened, not hedged — removed, or moved to "unresolved ambiguities" where its
unsupported status is the point.

## 5 · Cross-document review

Where the value is. Manual, deliberate, one pass per pairing:

| Compare | Looking for |
|---|---|
| CIM claims ↔ financial statements | Overstated revenue, margin, growth |
| CIM concentration ↔ revenue detail | **Understated concentration — the most common material misstatement** |
| Contracts ↔ revenue detail | Revenue from customers with no contract, or expired ones |
| Roster ↔ payroll ↔ agreements | Key people with nothing signed |
| Debt schedule ↔ loan documents | Undisclosed guarantees, cross-defaults |
| QoE addbacks ↔ source documents | Double-counted or unsupported addbacks |
| Management transcript ↔ everything | Verbal claims that documents don't support |
| Documents ↔ their own references | Referenced schedules and exhibits absent from the room |
| Any document ↔ its other versions | Silent revisions |

## 6 · Missing information review

Distinct from the inventory gap check. That one asks what's absent from the room; this
one asks what's absent **given what the room contains**.

- Contract references Schedule 4.2 → is Schedule 4.2 present?
- Debt schedule lists a lender → is the loan agreement present?
- Roster names 40 employees → are there 40 agreements?
- Insurance schedule lists five policies → five certificates?
- Lease references an amendment → is it there?

This produces findings a general-purpose assistant will never produce, because it
requires knowing what *should* exist. It is also the section customers consistently find
most impressive, and worth over-investing in during pilots.

## 7 · Quality control

**Nothing ships without a second pass, and the second pass assumes the first is wrong.**

- [ ] Every claim's link opened and verified to support the claim as written
- [ ] Every number recomputed from source
- [ ] Every quote checked verbatim against the document
- [ ] Every date checked against the document, not against memory
- [ ] Every finding re-read as an adversary: what's the innocent explanation?
- [ ] Severity re-rated cold, without the drafting context
- [ ] Labels audited — is anything marked "extracted" actually inferred?
- [ ] Spell the customer's and target's names correctly

**One wrong finding costs more than ten missing ones.** A memo with a demonstrable error
is not forwarded, and forwarding is the metric the whole project is measured on.

## 8 · Labels

Every statement in the memo carries exactly one. This taxonomy is the honesty contract
and it survives into the product.

| Label | Means | Example |
|---|---|---|
| **Extracted** | Stated in a document. Quote available. | "The lease expires 2027-03-31." |
| **Calculated** | Arithmetic on extracted values. Inputs and method shown. | "Top customer is 31% of FY25 revenue." |
| **Inferred** | Reasoning beyond the text. Basis stated. Always attributed to Reef. | "This suggests concentration risk above the CIM's characterization." |
| **Unresolved** | Sources conflict and the conflict is not settled. Both shown. | "CIM says 18%; revenue detail computes 31%." |
| **Missing** | Expected and absent. | "Schedule 4.2 is referenced in §4 and is not in the room." |

Rules:
- **Inferred** never appears without the extracted facts beneath it.
- **Unresolved** is never silently resolved by picking the likelier value. Present both.
- Nothing is upgraded to Extracted because it is probably true.
- Legal effect, enforceability and valuation are **out of scope** and never appear under
  any label.

## 9 · The memo

```
1  Summary — one page, the five things that matter, severity-ranked
2  Critical findings — each with consequence, evidence, and what to ask next
3  Notable findings
4  Unresolved conflicts
5  Missing documents
6  Inventory — what was reviewed, counts by category
7  Scope and limits — what Reef did not do
8  Evidence appendix — quotes and highlighted crops, indexed
```

Delivered as PDF plus DOCX so they can paste into their IC memo. Every finding is
formatted to be pasted with its citation intact.

**Section 7 is mandatory and is written first**, before any finding tempts you to soften
it. It states plainly: this is not a legal review, not an audit, not a QoE, not
exhaustive; it covers the documents provided as of a stated date; OCR confidence was X%;
these N documents were unreadable.

## 10 · Review meeting

45 minutes, recorded with permission. **The purpose is research, not service.**

Walk the summary, then stop talking. Observe:

- Which finding do they react to first?
- Do they click an evidence link? *Instrument this — it tests the core hypothesis.*
- Which sections do they skip?
- What do they ask that the memo didn't answer?
- Do they say they'll send it to anyone? **Follow up in a week and find out if they did.**

Close with: *"What would have made this worth twice the price?"* — better than "was this
useful," because it forces a specific answer instead of a polite one.

---

## Data handling

Weak security at pilot stage is how a one-person company ends. It is also the first thing
a buyer asks about.

- Full-disk encrypted machine, dedicated per-engagement directory
- Never in a personal cloud drive, never in a shared folder, never emailed
- Redact before any document touches a third-party model where practical; otherwise
  zero-retention endpoints only
- Never used to improve anything. Never shown to another customer. Never in a demo
  without a signed, specific release.
- Access is one person. If that changes, the customer is told first.

**Retention:** working copies deleted **30 days after delivery**, or immediately on
request. Deletion is confirmed in writing with a date and a list of what was destroyed.

**Fixtures:** an anonymized version may be retained *only* under a separate written
permission naming that specific room. Never assumed, never bundled into the pilot
agreement's boilerplate.

**Deletion procedure:**
1. Secure-delete the engagement directory
2. Purge derived artifacts — OCR output, extractions, intermediate files, model caches
3. Clear from backups, or confirm the backup expiry date to the customer
4. Delete the transfer share
5. Written confirmation, dated
6. Retain only the engagement record: dates, hours, scope, findings count. No content.

---

## Effort log

Keep this per engagement. It is the primary output of M0 after the interviews, because
it tells you what to automate first — and whether automation can close the gap at all.

| Stage | Run 1 | Run 2 | Run 3 | Target |
|---|---|---|---|---|
| Intake & context | | | | 1.0 h |
| Inventory | | | | 1.5 h |
| Extraction | | | | 4.0 h |
| Evidence linking | | | | 2.0 h |
| Cross-document | | | | 2.0 h |
| QC | | | | 1.0 h |
| Memo | | | | 1.5 h |
| Review meeting | | | | 1.0 h |
| **Total** | | | | **≤ 12 h** |

Also log: documents processed, OCR failures, findings by label, findings the customer
said mattered, and findings the customer said were wrong. That last column is the most
valuable data the pilot produces.
