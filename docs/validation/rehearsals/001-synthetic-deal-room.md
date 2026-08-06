# Rehearsal 001 — synthetic deal room

- **Date:** 2026-08-05
- **Operator:** Claude (agent session), not a human operator
- **Fixture:** `reef-deal-room` v1.0.0, seed 20260805, R1 baseline + R2 delta
- **Runbook:** [`CONCIERGE_RUNBOOK.md`](../CONCIERGE_RUNBOOK.md) as consolidated by ADR-002
- **Outputs:** [`fixtures/reef-deal-room/outputs/`](../../../fixtures/reef-deal-room/outputs/)

---

## What this rehearsal can and cannot establish

**It cannot measure detection ability.** The operator generated the fixture and therefore
knew every planted finding before starting. Recall of 22/22 is arithmetic, not evidence.
Any recall or precision figure from this run is void and must not be quoted anywhere,
including to the founder, an investor, or a customer.

**It also cannot produce a human time baseline.** The work was done by an agent that reads
faster than a person and never lost its place. The stage timings below are structural —
they show which stages dominate — and the absolute numbers do not transfer.

**What it does establish**, and what it was worth doing for:

- whether the runbook's stages are complete and unambiguous enough to follow
- whether the two-dimension classification is usable in practice or only on paper
- whether the six deliverables can be produced from the specified inputs
- whether anchors at the required granularity are actually obtainable from these formats
- where the runbook is silent and the operator had to invent

It found **eight runbook gaps**, five of them material. That is the return on the exercise.

**It does not validate customer demand.** It validates proposed delivery mechanics and the
evaluation fixture, nothing more.

---

## Stages performed

| # | Stage | Session effort | Notes |
|---|---|---:|---|
| 1 | Intake, authority, scope | — | **Skipped.** No customer, no NDA, no authority gate. Untested. |
| 2 | Freeze and inventory | 8 min | Scripted from the manifest. Would be scripted against a real package too. |
| 3 | Request-list mapping | 12 min | 30 request rows against 121 files |
| 4 | Bounded fact extraction | 46 min | Dominant stage. Contracts and the covenant certificate were the slowest. |
| 5 | Structured profiling | 14 min | CSV/XLSX; the DataGate engine would replace most of this |
| 6 | Cross-source checks | 38 min | Nine pairings from the runbook matrix |
| 7 | Revision comparison (R2) | 9 min | Three changes |
| 8 | Missing-information review | 11 min | Produced the 24-hour deliverable |
| 9 | Quality control | 27 min | Caught 7 defects — see below |
| 10 | Deliverable assembly | 34 min | Six documents |
| | **Total** | **~3.3 h** | Not a human baseline. See caveat above. |

**Structural read:** extraction (4) and cross-source checks (6) are 42% of the effort and
are where automation pays. Inventory (2) and profiling (5) are already mechanical. Quality
control (9) is 14% and should not be automated — it is the stage that caught the errors.

## Findings recovered

22 of 22 planted findings appear in the register, severity agreement 22/22, and both
four-state traps were handled correctly (`RDG-021` reported *unreviewed*, `RDG-015`
reported *not found*).

**These numbers are void as evidence of capability** for the reason stated above. They are
recorded only to confirm the fixture and the scoring harness are wired correctly — that
the ground truth is reachable at all, and that
[`DEAL_ROOM_EVAL.md`](../../evaluation/DEAL_ROOM_EVAL.md) can be run end to end.

**False positives against negative controls: 0**, also void as evidence. Ten of the twelve
controls are recorded in `REVIEW_NOTES.md` under "considered and not raised."

## Defects caught in quality control

Seven, all recorded in `REVIEW_NOTES.md`. Three matter:

1. **`RDG-021` was first classified *missing* rather than *unreviewed*.** This is the
   error with the highest cost per occurrence: it sends the buyer to re-request a document
   the seller already supplied. It was caught only because the QC checklist has an explicit
   line for auditing the state dimension. Without that line it would have shipped.
2. **Three findings were drafted as assertions and downgraded to ambiguities** (recurring
   revenue, branch margin, capex). Each would have been a factual error in a High finding —
   refundable under the pilot's accuracy guarantee.
3. **Two severities were wrong on first pass** and changed on cold re-rating, one up and
   one down.

The adversarial re-read and the cold severity re-rating both earned their place. Neither
is optional.

---

## Runbook gaps

Numbered for tracking. **G1–G5 are material** — the operator had to invent an answer, and
two operators would have invented different ones.

### G1 · No severity rubric *(material)*

The runbook defines finding *classes* and *states* but never defines Critical, High,
Medium, Low or Informational. Severity was assigned by feel, then re-rated by feel. Two
ratings changed on the second pass, which is what happens without a rubric.

**Proposed.** Severity is a function of two axes, assigned by table rather than judgment:

| | Reversible / immaterial | Priced or negotiated | Deal-threatening |
|---|---|---|---|
| **Certain** (extracted or calculated) | Low | High | Critical |
| **Contested** (sources disagree) | Low | Medium | High |
| **Open** (evidence absent) | Informational | Medium | High |

### G2 · No register row template *(material)*

The row structure — label, state, routing, anchor list, excerpt, consequence — was
invented during assembly. It will not be reproduced identically next time, which makes
pilot-to-pilot comparison impossible and the eventual schema a guess.

**Proposed.** Fix the row as a template in the runbook, and make the eventual product
schema match it exactly.

### G3 · Routing is not a field *(material)*

Every finding needs an owner — counsel, QoE provider, insurance broker, buyer — and the
runbook's workflow map says routing is step 6, but the register has nowhere to put it. It
was added ad hoc as "Route:".

**Proposed.** Make routing a required field. A finding with no owner is a finding nobody
will action, and routing is also the clearest demonstration that Reef is not doing the
specialist's job.

### G4 · Negative-control discipline is absent *(material)*

Nothing in the runbook says to record what was examined and rejected. The "considered and
not raised" section in `REVIEW_NOTES.md` was invented, and it is one of the most useful
artifacts produced — it is the visible proof that a clean line means someone looked.

**Proposed.** Add a stage: log every observation that looked like a finding and was
rejected, with the reason. Ship it with the register.

### G5 · The 24-hour deliverable is not a stage *(material)*

The runbook produces the missing-information review at step 8, near the end. The pilot
offer promises an inventory and missing-document list within two business days, ahead of
the register. The runbook's ordering cannot deliver the offer's commitment.

**Proposed.** Split the runbook into a Day-1 deliverable (inventory, exceptions, missing
list) and a Day-5 deliverable (register, memo, calculation log). Reorder stages 2, 3 and 8
ahead of 4.

### G6 · No rule for splitting or merging findings

Concentration (R-01) and the change-of-control clause (R-02) were reported separately.
They could defensibly be one finding. Finding *counts* are on the scorecard, so this is not
cosmetic.

**Proposed.** One finding per document assertion that a buyer would action separately.
State the rule and give this pair as the worked example.

### G7 · The two-dimension classification needs worked examples

The definitions are correct and abstract. Mapping them to real rows took several passes,
and the state dimension was wrong twice on first draft.

**Proposed.** Add the decision path: *was it supplied?* → no → *was it requested?* → yes
→ **missing** / no → **not found**. Supplied but unopenable → **unreviewed**. Confirmed
irrelevant → **not applicable**.

### G8 · No guidance on immaterial findings

Two duplicate payroll rows worth a few hundred dollars: report, or suppress as noise? It
was folded into a Low finding rather than raised separately, which was a judgment call.
Padding a register with immaterial items reduces the credibility of the material ones.

**Proposed.** A stated materiality floor, agreed with the customer at intake, below which
observations go to an appendix rather than the register.

---

## What the deliverables proved

- **Anchors at the required granularity are obtainable** from every format in the fixture:
  PDF page, XLSX sheet/row, CSV row, Markdown section. The scanned PDF required manual
  reading and was not relied on for any finding, which is the correct handling.
- **The calculation log is the strongest artifact.** Ten calculations, each reproducible
  from source without Reef. It is also the cheapest to produce and the easiest to verify —
  the best ratio of trust generated to effort spent of anything produced here.
- **The scope-and-limits section had to be written first.** Written last, it would have
  been shaped by the findings rather than bounding them.
- **Separating the missing-information request from the register works.** It is actionable
  a day earlier and it is the artifact most obviously worth money on its own.

## Actions

| # | Action | Owner | Blocking? |
|---|---|---|---|
| 1 | Apply G1–G5 to `CONCIERGE_RUNBOOK.md` | — | **Yes — before the first paid pilot** |
| 2 | Apply G6–G8 | — | No |
| 3 | Re-run this rehearsal after the revisions, timed by a human | — | Yes, before pilot 1 |
| 4 | Have a second person run the runbook cold against the fixture | — | **Yes.** The only way to get a real recall figure and a real time baseline is an operator who did not build the room. |
| 5 | Record a real human baseline for stages 2–10 | — | Yes |

**Action 4 is the important one.** Until someone who has not seen `GROUND_TRUTH.md` runs
this process, Reef has no evidence that the deliverable can be produced by anyone, at any
speed, at any accuracy. This rehearsal tested the instructions, not the work.
