# Decision log

Append-only. Every entry carries a date, the decision, the evidence behind it, and what
would reverse it. Entries are never edited after the fact — a superseding entry is added
instead, so the reasoning that turned out to be wrong stays visible.

---

## 2026-08-05 · Wedge selected: small-cap M&A diligence

**Decision.** Validate a buyer-side data-room inventory, gap, reconciliation and
evidence-register service for searchers and independent sponsors, at approximately $1,500
per deal.

**Supported by** [ADR-001](../decisions/ADR-001-initial-market-wedge.md), written
independently and reaching the same conclusion by a scored comparison (51/85 vs 45/85
against the engineering alternative). Two separate analyses converging is worth
something, though less than it appears — see the shared-blind-spot note below.

### What supported it

- **Reachable buyer.** Searchfunder reports ~6,500 active members; the ETA community is
  concentrated, public, and referral-dense. A solo founder can reach it without a sales
  team.
- **Acute, deadline-shaped pain.** Exclusivity periods create urgency that removes the
  evaluation cycle entirely.
- **Below the incumbents' floor.** Hebbia and Harvey cannot profitably sell a $1,500
  contract, and building a self-serve motion would cannibalize the enterprise contracts
  justifying their valuations. That is a structural constraint, not an oversight.
- **Deterministic core exists.** DataGate already profiles tabular operating data, which
  small-cap rooms contain in quantity.
- **A bounded, non-professional deliverable is possible** — inventory, gaps, cited issue
  register — without replacing counsel, accountants, or QoE providers.

### What is evidence and what is not

| | |
|---|---|
| **Evidence** | Searchfunder membership figures. Stanford's 2024 Search Fund Study (500+ funds). Census AEC establishment counts. Datasite's and Procore's published capabilities. All desk research. |
| **Not evidence** | Every claim about *this* customer's hours, willingness to pay, document access, tool substitution, or frequency. |

**Zero customer conversations have occurred.** The wedge rests entirely on desk research
and inference. ADR-001 states this plainly and its "Speculative assumptions" section
should be read alongside `M0_PLAN.md`'s assumption register — they overlap and neither is
redundant.

### What would reverse it

Reversal triggers are in ADR-001 and reflected as FAIL conditions in
[`SCORECARD.md`](SCORECARD.md). The three most likely:

1. **Frequency.** A searcher acquires once. If LTV is a single transaction against
   comparable CAC, the business fails regardless of product quality.
2. **Document access.** If seller NDAs prohibit third-party processing with no workable
   consent path, the service cannot be lawfully delivered in this form.
3. **Commoditization.** If customers see the VDR's existing AI as equivalent, there is no
   room.

---

## 2026-08-05 · Two blueprints, one repository

**What happened.** Two Reef specifications were written the same day by different
sessions:

| | Wedge | Location |
|---|---|---|
| This one | Small-cap M&A diligence | `docs/reef/**` |
| The other | AEC technical-package assurance | `docs/vision`, `docs/product`, `docs/business`, `docs/architecture`, `docs/design` |

ADR-001 then compared them, selected M&A, declared `docs/reef/**` historical, and
established `docs/README.md` as the canonical index. Banners were added to all eight
`docs/reef/*.md` files marking them non-authoritative.

**Assessment: the resolution is correct and the process was healthy.** Two independent
analyses of the same problem is a genuine second opinion, and a scored ADR is a better
tie-break than whichever document was written last. The M&A conclusion survived a
comparison it did not author.

**Two things to be careful about.**

*The convergence is weaker than it looks.* Both analyses were produced from the same
repository, the same founder context, and the same original brief, with no customer
contact. Agreement between two models reading the same inputs is correlated error, not
replication. It raises confidence that the *reasoning* is sound; it says nothing about
whether the market is real. Only the interviews do that.

*There are now two validation packages.* `docs/README.md` indexes a package at
`docs/validation/**` (HYPOTHESES, INTERVIEW_GUIDE, WORKFLOW_MAP, CONCIERGE_PILOT,
SYNTHETIC_PACKAGE_SPEC, PILOT_OFFER, SCORECARD, RESEARCH_LOG). This package sits at
`docs/reef/validation/**` and covers the same ground under different filenames. **This
must be resolved before interviews begin** — two scorecards with different thresholds is
exactly the condition that lets a future session pick whichever supports the answer it
wants, which is the failure ADR-001 was written to prevent.

**Recommendation:** one package, at `docs/validation/**`, per the canonical index.
Merge rather than replace — the two were written to different strengths, and the
sections worth carrying over from here are noted in the handoff entry below.

**Not actioned unilaterally.** Relocating files the founder explicitly asked for at a
specific path, on the basis of a document that appeared mid-task, is the kind of tidying
that loses work. The founder decides.

---

## 2026-08-05 · Competing wedges, kept live

Recorded so they remain available rather than being rediscovered later.

### AEC technical-package assurance — deferred, first reversal candidate

Scored 45/85 in ADR-001. **Better on the two dimensions that matter most long-term:**
frequency (5 vs 2) and recurring revenue (5 vs 2). Engineering firms issue packages
continuously; searchers buy once.

Deferred because: no demonstrated access to representative packages, no domain reviewer,
a much larger format gap (drawings, CAD/BIM, units, tolerances, revision authority),
longer sales cycles, CUI exposure on defense-adjacent work, and Procore and Autodesk
already shipping overlapping functionality.

**Restore if:** three qualified engineering prospects supply packages and paid intent at
materially stronger rates than the M&A cohort, or M&A fails the scorecard. Requires a
superseding ADR.

**Worth noting:** this was runner-up wedge #1 in `docs/reef/01-strategy.md` before ADR-001
existed. Two independent analyses ranked the same two wedges in the same order.

### Also documented in `docs/reef/01-strategy.md`

- **Insurance claim and policy review** — repetitive, clear ROI, regulated, slower
- **Municipal records and public comment** — best press story, least money; viable as a
  free tier that generates credibility rather than revenue

### The repeat-buyer variant — test inside M0, do not defer

Not a separate wedge but a different customer for the same deliverable: **SBA lenders,
QoE accountants, and business brokers** touch every deal in the ecosystem and have the
frequency searchers lack.

`M0_PLAN.md` allocates 5 of 22 interviews to them and `INTERVIEW_GUIDE.md` gives them
dedicated paths. If row 11 of the scorecard fails on searcher frequency, this is the
first pivot to run — and it may turn out to be the primary customer rather than the
fallback.

---

## 2026-08-05 · Belief updated: differentiation is weaker than claimed

**What changed.** `docs/reef/01-strategy.md` asserts that VDR incumbents' AI is "a feature
bolted to storage" and "a decade behind." ADR-001 contradicts this with sourced evidence:
Datasite markets native semantic search, extraction and comparison, summaries,
**exact-source citations**, human review, permission enforcement and audit trails — across
a reported 16,000+ deals per year.

**Consequence.** Evidence-linked diligence is not, on its own, a differentiator. It may
already be table stakes inside the VDR. The differentiation must come from somewhere
else, and the honest candidates are:

1. **Reef works on the room wherever it lives** — Dropbox folders, email attachments,
   shared drives. A large share of sub-$25M deals never touch a professional VDR at all.
2. **Price and access.** Datasite is sold to the sell-side and to buyers running through
   it; a searcher handed a Dropbox link has no Datasite.
3. **The cross-document reconciliation specifically** — CIM claims against revenue detail
   against contracts — which is a harder job than search-with-citations and is what the
   fixture's five discriminating findings measure.

**Action.** Scorecard row 13 is mandatory and carries the direct question: *"Your VDR has
AI search now. Why wouldn't you just use that?"* An unconvincing answer is the most
likely honest reason to stop.

**This entry exists because it weakens my own prior document.** `docs/reef/01-strategy.md` has
not been edited to match — the historical banner covers it, and per this log's
append-only rule the original claim stays visible so the correction is legible.

---

## Decisions that must not silently become permanent

Each was made for a reason that may expire. Listed so they are re-decided deliberately
rather than inherited.

| Decision | Made because | Revisit when | Silent-permanence risk |
|---|---|---|---|
| **$1,500 price** | Plausible against 40–70h of labor | After experiments A/B/C | High. A price that sells once becomes "the price" forever. |
| **Searchers as buyer** | Reachable, urgent, ignored by incumbents | Scorecard row 11 | **Highest.** Frequency is the weakest assumption in the plan. |
| **Concierge, not software** | Learning speed, no build risk | After 3 engagements | Medium. A profitable service quietly becomes a consultancy, which is a fine business and not this one. |
| **72-hour turnaround** | Fits mid-exclusivity | Experiment C | Medium. If urgency prices, time is the pricing axis and the model changes. |
| **No legal/financial opinions** | Liability, and ADR-001 bars it | **Never.** | Low risk, catastrophic if breached. Customers will ask Reef to opine. The answer is always no. |
| **Postgres-only architecture** | Operability for one person | Graduation triggers in `../05-architecture.md` | Low. Triggers are numeric. |
| **The 3D reef at M4** | Marketing value, not product need | Before any hour is spent on it | **High.** It is the most enjoyable work in the project and the least necessary. |
| **`docs/reef/**` as historical** | ADR-001 | If the founder disagrees with the reconciliation | Medium. Useful reasoning becomes invisible once banner-marked. |

---

## Open questions

Unanswered. Each blocks something.

1. **Do standard seller NDAs permit third-party processing?** Blocks the pilot. Binary.
   Ask a transaction attorney in week one — forty seconds of a call.
2. **What does a searcher actually do 40 hours of?** The workflow map is inference. Blocks
   knowing which phase to build for.
3. **Is the buyer the searcher or the lender?** Blocks the entire commercial model.
4. **Do the QoE and the attorney already cover the checklist?** Blocks knowing whether
   there is a gap at all. Assumption F4, currently untested and possibly fatal.
5. **Does the memo get forwarded?** Blocks knowing whether any of this matters.

---

## Handoff — 2026-08-05

Written by the session that produced `docs/reef/**` and this validation package, for
whoever reconciles it with `docs/validation/**`.

**Sections here worth carrying into the merged package:**

- `SYNTHETIC_DEAL_ROOM_SPEC.md`'s twelve planted findings and four distractors — the distractors
  are the part usually forgotten, and precision is the expensive metric
- The **five discriminating cross-document findings** (1, 3, 5, 6, 10) as a separate
  score, since they are the product thesis expressed as a number
- The label taxonomy in `CONCIERGE_RUNBOOK.md` — extracted / calculated / inferred /
  unresolved / missing — which should survive into the product, not just the pilot
- The **accuracy-based refund** in `PILOT_OFFER.md` rather than a satisfaction guarantee
- The anti-gaming section in `validation-scorecard.md`, particularly the sealed prediction
- The three pricing experiments run concurrently, and the rule that design-partner
  conversions count at half weight

**What this package does not have** that the other may: ADR-001's sourced desk research,
and whatever `RESEARCH_LOG.md` contains.

**State:** nothing validated. No interviews conducted. Every number is a threshold or a
hypothesis, never a finding.

---

## 2026-08-05 · Validation packages consolidated

**Decision.** One canonical package at `docs/validation/**`, merged section by section
from two competing packages. Both originals preserved verbatim under
`docs/archive/reef-m0-v0/`. Recorded in
[ADR-002](../decisions/ADR-002-validation-package-consolidation.md).

**Supersedes the handoff entry above.** That entry recommended merging and left the
choice to the founder; the founder directed consolidation and it is done.

**Three thresholds were deliberately loosened**, against the default of preferring the
stricter number, because the stricter number would have produced false confidence:

| | Was | Now | Because |
|---|---|---|---|
| Standard price | $1,500 | $4,500 | $1,500 against a 12-hour delivery is $125/hour gross before tooling; at a realistic first-run 25 hours it is $60/hour. The lower price validates a service that cannot be delivered profitably. It survives as the design-partner tier. |
| Turnaround | 72 hours | 5 business days | 72 hours assumes uninterrupted work. Real intake costs two customer response cycles for passwords, scope and classification. |
| Hours of pain | ≥40h whole-deal | ≥12h on owned steps | Wrong denominator. Reef owns part of the workflow; a 40-hour whole-deal figure with 6 hours in the owned scope is a fail dressed as a pass. |

**One threshold is stricter than either original:** paid pilots now require ≥2 delivered
**and** ≥2 of 5 offers converting. A count alone is reachable by making twenty offers; a
ratio alone by making five offers to friends.

**What this changed about my own prior work.** The $1,500 anchor in the archived package
was set by what felt buyable and never checked against cost. That is a methodological
defect, not a preference, and it is recorded here rather than quietly corrected.

---

## 2026-08-05 · ADR-001 red-teamed; wedge holds, three amendments

Limited review of the three issues most likely to invalidate the wedge. **None did.**
Details in ADR-002 §3.

**A1 · Lifetime value.** The frequency risk logged in this file on 2026-08-05 was
confirmed as real and under-processed. A traditional searcher acquires once and then
permanently stops being a buyer. Candidates assessed: independent sponsors (2–5/yr, same
job, no repositioning) become the **primary ICP**; QoE providers are tested as buyer *and*
channel; **sell-side room readiness** emerges as an unexpected high-frequency variant
using identical mechanics on documents the advisor already controls — which sidesteps the
seller-NDA problem entirely. Transaction attorneys are **rejected**: billable-hour
economics make time saved into revenue lost, which is structural misalignment, not an
objection to be handled.

**A2 · Third-party processing rights.** Both packages required "written authority" without
establishing it is customarily obtainable. Now a blocking hypothesis (`L1`) with a
seven-question counsel brief, moved to week one. No legal conclusion is stated anywhere in
this repository. Question 7 — whether customer-controlled processing changes the analysis —
matters most, because an affirmative answer turns a fatal blocker into an architecture
requirement that DataGate already satisfies.

**A3 · Existing coverage.** The methodological gap was that neither package distinguished
availability from usage. **A participant whose VDR has AI they never opened is neutral
evidence, not favourable** — the incumbent was untested, which is not the same as
inadequate. Five incumbent probes added, each demanding an artifact or a specific
abandonment reason. Only participants who *tried* an incumbent count toward the
competitive-displacement gate.

**What survives.** Reef retains a narrow job: request-list-to-room reconciliation with
exact anchors, for a buyer with no analyst, on a room that frequently is not in a
professional VDR at all. Not the QoE's work, not the attorney's, not reachable by VDR AI
when the room is a Dropbox folder. **Defensibility remains unproven** — that is what M0
tests.

---

## Open questions, revised

1. **Do standard seller NDAs permit third-party processing?** `L1`, blocking, week one.
2. **Is the buyer the sponsor, the searcher, or an intermediary?** `N1`, blocking.
3. **Does the sell-side room-readiness variant have more pull than the buy-side one?**
   Newly opened by ADR-002 §3.1. Three interviews allocated.
4. **Do the QoE and the attorney already cover the check set?** Untested, possibly fatal.
5. **Has anyone actually tried their VDR's AI?** `X1`. If most have not, incumbent
   strength is unknown rather than low.
6. **Does the register get used in a real meeting?** The outcome gate.

---

## 2026-08-06 · M1 gate split; engine authorized, product still blocked

**Decision.** Build the headless ingestion and evidence engine now, validated against
`fixtures/reef-deal-room` only. Recorded in
[ADR-003](../decisions/ADR-003-m1-engine-authorization.md). Everything commercial —
pricing, offers, pilots, live customer documents, the review UI, export — remains blocked
by the nineteen mandatory scorecard rows, none of which has evidence.

**Why the gate could be split.** The engine is wedge-independent. Ingestion, coordinate-
preserving anchors, chunking, hybrid retrieval and the evidence join are identical whether
the buyer is a searcher, an independent sponsor, a QoE provider, a sell-side advisor, or an
AEC firm under the deferred engineering wedge. Every reversal candidate ADR-001 and ADR-002
keep live consumes the same pipeline, so the engine survives all four outcomes of the
build/narrow/pivot/stop decision — including *stop*.

**The second reason, which is the stronger one.** `T1` (anchors reach 95%) and `T2` (checks
reach precision) are the only two hypotheses in `HYPOTHESES.md` that interviews cannot
answer. They need a working extractor measured against labeled findings. Deferring them
behind interviews that structurally cannot test them means they get tested after
commitments exist, which is the wrong order for the two rows whose failure mode is
technical.

**No threshold moved.** Every number in `SCORECARD.md` is unchanged. No row was
reclassified. The anti-gaming rule that matters — a superseding ADR written before the data
is seen — is satisfied: no eval had been run when the decision was taken.

**The honest risk, recorded rather than argued away.** Engine work is more enjoyable than
cold outreach, and this repository holds roughly five thousand lines of documentation and
zero customer conversations. That ratio is the actual finding of the last two days and it is
not a good one. ADR-003 §7 sets a tripwire: if no qualified interview has been conducted by
**2026-09-06**, engine work stops until five are booked, and the reason for the displacement
is written here. `L1` needs one call with a transaction attorney and can be answered in a
week without any of the engine existing.

**Deferred deliberately.** The recommendation to reposition Reef as an intelligence platform
with diligence as the first paid vertical is *not* decided by ADR-003. It changes nothing
about the engine scope, and rewriting canonical strategy on zero customer evidence is the
same defect ADR-002 recorded about the original $1,500 price. Revisit with eval results in
hand.

**What would reverse it.** Anchor accuracy misses 95% after one bounded remediation cycle —
`T1` fails and the differentiating claim is undeliverable. Or the tripwire fires and
interviews still do not happen, in which case the problem was never the roadmap.

**Also recorded:** the `projects/reef-showcase/` work from 2026-08-05 was lost to a terminal
crash before it was ever committed. The directory contained one empty lockfile. Nothing is
being reconstructed — ADR-003 supersedes the showcase approach with the engine.
