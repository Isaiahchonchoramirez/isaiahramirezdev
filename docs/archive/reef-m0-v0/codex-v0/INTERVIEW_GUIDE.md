> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/INTERVIEW_GUIDE.md`](../../../validation/INTERVIEW_GUIDE.md)
> **Superseded because:** Merged; its qualification and concept-test sections survive.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Customer interview guide

## Objective

Reconstruct the participant's most recent real acquisition diligence workflow and test
access, pain, buying authority, and commitment without pitching Reef first.

Do not ask whether AI would be useful. Do not describe the proposed solution until the
participant's workflow, artifacts, time, failures, tools, and decisions are understood.

## Qualification

A qualified participant has personally worked on a small-cap acquisition in the last
24 months and directly handled, supervised, consumed, or approved data-room diligence.
Record role, deal stage, approximate deal-size band, industry, year, team size, and
whether the deal closed. Do not record target identity or confidential facts.

## Opening script

> I am studying how small acquisition teams handle the information between receiving a
> data room and sending issues to advisors or investors. I am not evaluating your
> performance, and I do not need the target's identity or confidential details. Please
> use your most recent real deal. I will ask what actually happened, including tools,
> artifacts, time, and handoffs. May I take notes? May I quote you anonymously?

Do not record audio without separate explicit consent.

## Timeline reconstruction

1. What was the most recent deal where you personally worked with the data room?
2. Where in the transaction were you when the first documents arrived?
3. What exactly did you receive first: a room, folder, index, request list, or something
   else?
4. What happened during the first hour? The first day? The first week?
5. Who created the request list, and how did it change?
6. How were files and folders organized? What naming or version patterns helped or hurt?
7. Which parts did you review personally? Which went to counsel, accountants, tax,
   commercial, technical, insurance, cybersecurity, environmental, or other specialists?
8. Show or describe the tracker, issue list, index, memo, Q&A log, or spreadsheet used
   to coordinate the work.
9. How did you decide that a requested item was missing rather than named differently or
   outside scope?
10. Which facts had to be reconciled across more than one source?
11. Which structured datasets did you inspect? What checks or transformations did you
    perform?
12. How did new room uploads or corrected versions reach you? What did you reread?
13. What evidence had to accompany an issue before an advisor, investor, or seller would
    act on it?
14. Who approved the final issue list, diligence summary, or decision to proceed?

## Time and cost reconstruction

1. Draw the sequence of tasks and estimate elapsed and hands-on time for each.
2. Which task consumed the most senior time?
3. What external services or software were purchased, by whom, and at what approximate
   range?
4. What work was repeated because the room changed, an item was mislabeled, or evidence
   could not be found?
5. Which delay affected exclusivity, negotiation, financing, advisor cost, or management
   attention?
6. How was that consequence measured, if at all?

Ask for ranges when exact numbers are confidential. Do not convert frustration into a
cost claim the participant did not make.

## Failure reconstruction

1. Tell me about the last thing that was missed, found late, or sent to the wrong
   specialist.
2. How was it discovered?
3. What source would have shown it earlier?
4. Was the failure caused by absent information, inconsistent information, poor search,
   version confusion, unclear ownership, or interpretation?
5. What happened next? Who did more work, and what changed?
6. What current control is meant to prevent recurrence? Does it work?
7. What false alarm or low-quality analysis wasted time during the deal?

## Current tools and alternatives

1. Which VDR, storage, spreadsheet, project-management, search, or AI tools were used?
2. What did each tool do well enough that you would not replace it?
3. Did anyone export documents into ChatGPT, Claude, NotebookLM, a VDR AI feature, or a
   specialist platform? Under what policy?
4. What could not be put into those tools, and why?
5. If a tool already compares, summarizes, or cites documents, where does manual work
   remain?
6. What would make you distrust an otherwise correct finding?
7. What is worse: a missed issue or ten false alarms? How does that vary by issue type?

## Data and security

1. Who owned the room and who could authorize an export or outside reviewer?
2. Which categories could not leave the VDR?
3. Did the room include privileged communications, employee data, health data,
   credentials, export-controlled material, or other restricted content?
4. What NDA, data-processing, insurance, audit, retention, or security requirements
   applied to vendors?
5. Would a redacted representative subset be possible? Who must approve it?
6. What deletion evidence would be required after a pilot?

## Role-specific paths

Use only the path matching the participant; do not force every interview through every
role.

### Searcher or acquisition entrepreneur

- Which work did you keep because advisors were too expensive or slow?
- How did you update investors and decide what to escalate?
- What could you buy directly, and what needed investor or lender approval?
- How many deals reached a full room during your search?

### Independent sponsor or small-fund principal

- How many concurrent or annual diligence processes create repeatability?
- Which internal analyst work is standardized across deals?
- Where do portfolio-company or integration reviews reuse diligence evidence?
- Who owns software and service budgets?

### Boutique M&A advisor or broker

- What is buyer-side versus sell-side responsibility?
- Which room-quality and Q&A problems recur across clients?
- Would a review service help or create liability with your client?
- How many qualified buyers could you introduce if the deliverable worked?

### Transaction counsel

- Which proposed findings must never be characterized without legal analysis?
- What source citation and privilege boundary is required?
- What can a non-lawyer evidence service safely prepare for counsel?
- What retention and discoverability concerns apply?

### QoE accountant or financial diligence provider

- Which structured checks are commodity preparation versus professional judgment?
- What source lineage is required for a usable schedule?
- Which DataGate-style findings help, and which create misleading confidence?
- Where would Reef duplicate paid scope?

### Operating or commercial diligence advisor

- Which facts require external research or customer interviews rather than room review?
- Which room preparation could reduce your time without replacing interpretation?
- What issue-register format fits your work product?

### Investor, lender, or investment-committee participant

- What evidence must accompany a claim before it affects a decision?
- Which buyer-prepared materials are trusted or rechecked?
- What missing information changes approval timing?

### VDR administrator or deal operations lead

- How are index, permissions, versions, and Q&A managed?
- Which metadata exists that an exported folder loses?
- What integration or export restrictions would constrain Reef?
- Which native AI functions already cover the proposed workflow?

## Concept test after discovery

Only after the workflow is reconstructed, describe the bounded service neutrally:

> A manual service takes an approved request list and bounded room export, returns an
> inventory and coverage appendix, proposes missing requested items, profiles supported
> structured data, records a small set of defined fact conflicts, and produces a human-
> reviewed issue register with exact source citations. It does not give legal,
> accounting, tax, valuation, QoE, investment, or closing advice.

Ask:

1. Which part, if any, would have changed the most recent deal?
2. Which part is already solved by your VDR, advisors, or own process?
3. What output would you refuse to use?
4. Who would review it, and in what meeting or artifact?
5. What would have to be true before you paid for it?
6. What price would make it too cheap to trust? Expensive enough to require another
   approval? Why?

Do not ask “Would you use this?” Behavior and commitments are stronger evidence.

## Commitment ladder

Progress one step at a time. Record the exact response and blocker.

1. **Redacted sample:** “Would you request approval to share a representative redacted
   request list and package subset under written terms by [date]?”
2. **Concierge test:** “Do you have a qualified active or completed package we can use
   for a bounded manual test within the next 30 days?”
3. **Qualified introduction:** “Will you introduce one person who personally owns this
   workflow?”
4. **Design-partner agreement:** “If the scope and security review pass, will you sign
   the design-partner agreement by [date]?”
5. **Paid pilot:** Present the applicable written offer and ask for the 50% deposit.

Interest without a date, artifact, introduction, signature, or payment is not a
commitment.

## Close and logging

Confirm what may be retained, quoted, or followed up. Log observations and direct
quotes separately from interpretation in [RESEARCH_LOG.md](RESEARCH_LOG.md). Update the
hypothesis evidence, but do not change thresholds during the validation cycle.
