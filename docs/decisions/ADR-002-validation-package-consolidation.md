# ADR-002: Validation package consolidation

- **Status:** Accepted
- **Decision date:** 2026-08-05
- **Supersedes:** neither ADR-001 nor its wedge selection
- **Amends:** ADR-001 (three narrow amendments, §6)
- **Implementation authority:** none. M1 remains blocked.

## Context

Two independent sessions produced two complete M0 validation packages on the same day:

| Package | Path | Files |
|---|---|---|
| A | `docs/validation/**` | 9, named `HYPOTHESES` … `RESEARCH_LOG` |
| B | `docs/reef/validation/**` | 9, named `m0-plan` … `decision-log` |

Both target the wedge ADR-001 selected. They disagree on price, turnaround, hours
thresholds, pilot counts, the definition of the owned workflow, and the structure of the
finding taxonomy. Two scorecards with different numbers is the exact condition ADR-001
was written to prevent: a future session can satisfy whichever gate is convenient.

Neither package is discardable. A is more rigorous on hypothesis structure, automatic-fail
conditions, negative controls, and commercial terms. B is broader on workflow context,
role coverage, decision history, and the mechanisms that make a finding checkable.

## Decision

**One canonical package at `docs/validation/**`,** merged section by section, containing
exactly eleven files. Both originals are preserved verbatim under
`docs/archive/reef-m0-v0/` with banners. `docs/README.md` becomes the single index.

`docs/validation/**` was chosen over `docs/reef/validation/**` because `docs/reef/**` is
already marked historical by ADR-001, and a live validation process must not live inside
a directory declared non-authoritative.

---

## 1 · Reconciliation matrix

### README

| | |
|---|---|
| **Purpose** | Index and entry point |
| **A strongest** | Authority chain, the "no build because an interview went well" rule, research-handling constraints, the sequence diagram |
| **B strongest** | The `[H]`/`[E]`/`[C]` marking convention; the honest statement that nothing is validated |
| **Conflicts** | A defines the workflow as request-list reconciliation; B as inventory + commercial/contract reconciliation |
| **More rigorous** | A |
| **Retained** | A's structure and authority chain; B's marking convention and status section |
| **Canonical** | `validation/README.md` |
| **Disposition** | Both archived |

### Hypotheses / assumption register

| | |
|---|---|
| **A** | `HYPOTHESES.md` — 16 ID'd rows: confidence, existing evidence, evidence needed, method, pass, fail, consequence |
| **B** | `m0-plan.md` §assumption register — 8 prose categories, ranked by risk |
| **A strongest** | The table format. Every row is independently falsifiable with a named method. Priority order (D1, C1, W1, P1, PAY1, S1 first) is correct. |
| **B strongest** | The frequency analysis. A's `R1` names episodic use as a risk; B identifies it as the single most likely quiet failure and specifies the escape hatch. B also isolates legal permissibility as a binary blocker; A folds it into `S1` security where it gets diluted. |
| **Conflicts** | None material — different formats, compatible content |
| **More rigorous** | A, decisively |
| **Retained** | A's table wholesale, extended with three new rows from B: `N1` frequency, `L1` legal permissibility, `X1` incumbent coverage |
| **Canonical** | `validation/HYPOTHESES.md` |

### Plan and sequence

| | |
|---|---|
| **A** | No standalone plan; sequence lives in `README.md` |
| **B** | `m0-plan.md` — participants by profile with counts, six ranked recruiting channels, outreach script, day-by-day two-week sequence, "what does not count as validation" |
| **Gap in A** | No recruiting method, no participant targets, no calendar. A says what to measure; it does not say how to obtain 15 interviews. |
| **More rigorous** | B, on this alone |
| **Retained** | B nearly intact, reweighted per §5.1 below |
| **Canonical** | `validation/M0_PLAN.md` (new file) |

### Interview guide

| | |
|---|---|
| **A strongest** | Qualification gate, timeline reconstruction, the concept test placed *after* discovery, eight role paths including VDR administrator and IC participant |
| **B strongest** | The banned-phrasings list with replacements, the seven-item same-day debrief, the requirement to log one contradicting datum per interview, the five-rung commitment ladder ending at deposit |
| **Conflicts** | Both have commitment ladders; A's is more commercially precise, B's is better sequenced |
| **More rigorous** | Roughly equal, different axes |
| **Retained** | A's structure and role paths; B's rules, banned phrasings, debrief and ladder sequencing; both ladders merged |
| **Canonical** | `validation/INTERVIEW_GUIDE.md` |

### Workflow map

| | |
|---|---|
| **A** | 13 steps, tightly scoped to request-list-to-register, 12 columns including evidence required |
| **B** | 15 phases, teaser through close, with financial consequence and security sensitivity per phase |
| **A strongest** | Precision within the owned scope, and the explicit ownership boundary at steps 3–5 + 7–9 |
| **B strongest** | Context. It shows *where* the owned scope sits in the deal, why phases 7 and 9 belong to the accountant and attorney, and what Reef must stay out of. |
| **Conflicts** | Scope definition. A's "request-list reconciliation" is narrower and better defined than B's "inventory + commercial + contractual." |
| **More rigorous** | A for the owned scope; B for the boundary reasoning |
| **Retained** | A's table as canonical; B's full-deal context retained as a background section, explicitly marked lower-confidence |
| **Canonical** | `validation/WORKFLOW_MAP.md` |

### Concierge procedure

| | |
|---|---|
| **A** | `CONCIERGE_PILOT.md` — 9-step operating procedure, pre-intake legal gate, finding classes, contradiction classification, retention |
| **B** | `concierge-runbook.md` — 10 stages, label taxonomy, cross-document comparison matrix, QC checklist, effort log table |
| **A strongest** | The pre-intake legal and security gate as a hard blocker; contradiction classification |
| **B strongest** | The five-label taxonomy (extracted / calculated / inferred / unresolved / missing) with the rule that inferred never appears without its extracted basis; the nine-pair cross-document comparison matrix; the per-stage effort log |
| **Conflicts** | A distinguishes *unreviewed / not found / missing / not applicable*; B distinguishes *extracted / calculated / inferred / unresolved / missing*. **These are orthogonal, not competing** — A classifies document state, B classifies claim epistemics. Both are needed. |
| **More rigorous** | A on gating, B on output discipline |
| **Retained** | Both taxonomies, explicitly as two dimensions |
| **Canonical** | `validation/CONCIERGE_RUNBOOK.md` |

### Synthetic package

| | |
|---|---|
| **A** | `SYNTHETIC_PACKAGE_SPEC.md` — HVAC company, 120–180 docs, R1/R2 versions, 20 planted issues, **20 negative controls**, gold artifacts, dev/held-out splits |
| **B** | `sample-deal-room.md` — HVAC company, ~340 docs, 12 planted findings, 4 distractors, generation method |
| **A strongest** | Negative controls at 20 vs 4. The R1/R2 two-version design. The unreviewed/not-found/missing/N-A gold distinction. Held-out splits. |
| **B strongest** | The five discriminating cross-document findings tracked as a separate score; the model-first generation order (one financial model, break consistency only at planted points); severity levels |
| **Conflicts** | A is severity-neutral by design; B uses severity. The founder's Part 4 instruction requires severity levels, so severity is adopted. |
| **More rigorous** | A |
| **Retained** | A's structure, negative controls, R1/R2 and gold artifacts; B's generation order and discriminating-set scoring; severity added per instruction; target company enlarged per instruction |
| **Canonical** | `validation/SYNTHETIC_DEAL_ROOM_SPEC.md` |

### Pilot offer

| | |
|---|---|
| **A** | $1,500 design partner / $4,500 standard / $8,500 rush; 5 business days; detailed scope caps, customer responsibilities, cancellation |
| **B** | $1,500 standard / $750 design partner / $3,500 rush; 72 hours; accuracy-based refund |
| **A strongest** | **Pricing that survives arithmetic.** Scope caps in files/GB/pages. Revision allowance. Change-request boundary. |
| **B strongest** | The refund condition tied to *factual error in a Critical finding* rather than satisfaction; the outreach script |
| **Conflicts** | **Material.** See §2. |
| **More rigorous** | A |
| **Retained** | A's tiers, caps and terms; B's accuracy-based refund and outreach script |
| **Canonical** | `validation/PILOT_OFFER.md` |

### Scorecard

| | |
|---|---|
| **A** | 19 mandatory rows in three groups, 8 automatic-fail conditions, 6-part M1 condition |
| **B** | 16 rows with 8 marked mandatory, anti-gaming section, sealed-prediction rule |
| **A strongest** | Automatic-fail conditions — particularly *"evidence fabrication, threshold manipulation, or counting synthetic/free activity as customer/payment evidence."* The professional-boundary gate. The time-saved gate with a recorded baseline. |
| **B strongest** | The anti-gaming section and the sealed prediction written before week two; the requirement that a row with no evidence is FAIL and not CONCERN |
| **Conflicts** | Numerous thresholds. See §2. |
| **More rigorous** | A |
| **Retained** | A as the base; B's anti-gaming rules appended as binding |
| **Canonical** | `validation/SCORECARD.md` |

### Evidence ledger and decision history

| | |
|---|---|
| **A** | `RESEARCH_LOG.md` — evidence levels, eight sourced desk-research entries (R-001…R-008), interview/offer/snapshot templates, integrity rules |
| **B** | `decision-log.md` — append-only decision history, competing wedges, belief updates, "decisions that must not silently become permanent", open questions |
| **Conflicts** | None. Different artifacts serving different purposes; keeping both was a merge error to avoid. |
| **Retained** | Both, as two files |
| **Canonical** | `validation/RESEARCH_LOG.md` and `validation/DECISION_LOG.md` |

**R-001…R-008 are the only sourced evidence Reef possesses.** Everything else in either
package is inference. That fact is now stated in the canonical README.

---

## 2 · Threshold reconciliation

The founder's instruction is to prefer the stricter threshold **unless it is arbitrary or
would create false confidence.** Three thresholds fail that test and the looser number is
adopted, with reasons.

### 2.1 Price — adopt A ($1,500 / $4,500 / $8,500)

| | |
|---|---|
| **Risk controlled** | Building a business whose unit economics are negative at the price it validated |
| **Why this number** | B's $1,500 standard was set by what felt buyable, never checked against cost. At B's own 12-hour target that is $125/hour gross before tooling, insurance or model spend; at a realistic first-run 25 hours it is $60/hour. **B's price validates a service that cannot be delivered profitably by the person delivering it.** A's $4,500 against a ≤20-hour ceiling is $225/hour, which supports the work. |
| **Not "stricter"** | A lower price is not a stricter test. It is an easier one that produces a false pass on willingness to pay. |
| **What changes it** | Three prospects at $4,500 refusing while accepting $1,500-shaped scope, or a measured effort figure under 8 hours by pilot three. |

$1,500 survives as the **design-partner** tier, where its purpose is proving payment
occurs at all — not proving the business works.

### 2.2 Turnaround — adopt A (5 business days)

| | |
|---|---|
| **Risk controlled** | Promising a cycle time that manual delivery cannot hit, then either missing it or degrading quality to hit it |
| **Why this number** | B's 72 hours assumes uninterrupted work. Real intake involves password round-trips, scope questions and classification confirmations, each costing a customer response cycle. Five days absorbs two round-trips. |
| **Not "stricter"** | A faster promise is not a stricter validation gate. It is a delivery commitment that raises failure probability without testing anything additional. |
| **What changes it** | Two consecutive pilots delivered inside 72 hours with effort under 12 hours, or four of five prospects rejecting five days outright. Experiment C tests the two-day rush at a premium, which is the correct way to price urgency. |

### 2.3 Hours-of-pain — adopt A (median ≥12h on owned steps)

| | |
|---|---|
| **Risk controlled** | Measuring the wrong denominator |
| **Why this number** | B's ≥40 hours counts a buyer's entire document reading across the whole deal. Reef owns steps 3–5 and parts of 7–9, not all of it. A 40-hour whole-deal figure with 6 hours in the owned scope is a fail dressed as a pass. A's 12 hours measures what Reef actually removes. |
| **Kept as diagnostic** | Whole-deal hours remain recorded, unscored — useful for the narrative, not for the gate. |
| **What changes it** | Interviews showing the owned steps and the whole read are inseparable in practice. |

### 2.4 Adopted stricter, or merged

| Measure | A | B | Canonical | Risk controlled · why |
|---|---|---|---|---|
| Qualified interviews | ≥15 across ≥8 buyer + 4 adjacent | ≥15, ≥10 buyer | **≥15, ≥8 buyer-side, ≥4 adjacent** | A's role mix. Concentrating on buyers hides the channel question that §3 says is the biggest open risk. |
| Workflow ownership | ≥10/15 own or manage it | not gated | **A** | Controls the risk of interviewing people who describe someone else's work. |
| Repeated pain | ≥8/15 same narrow pain w/ recent example | ≥8/15 unprompted | **≥8/15, unprompted, with a recent example** | Strictly both. Unprompted controls leading; recent example controls recall bias. |
| Paid pilots | ≥2 of 5 offers convert | ≥3 delivered | **≥2 delivered AND ≥2 of 5 offers convert** | Neither alone is sufficient: a count is reachable by making twenty offers, a ratio by making five offers to friends. Requiring both closes both loopholes. This is stricter than either package. |
| Deposit timing | 50% at signature | before delivery | **50% at signature, before intake begins** | Money after delivery measures satisfaction; money before measures belief. |
| Data access | ≥3 governed packages | ≥3 redacted rooms | **≥3, each with request list + documents + structured data** | A's composition requirement. Three PDFs is not a package. |
| Anchor accuracy | ≥95% over 100 stratified | ≥95% | **≥95% over 100 stratified findings** | A specifies the sample; an unspecified 95% is unmeasurable. |
| Effort ceiling | >30h bespoke = fail | >20h = fail | **Target ≤12h; FAIL >20h bespoke after pilot 2** | ADR-001 already set 20h. Keeping A's 30h would contradict a live ADR. |
| Referral | ≥3 introductions or a 5+/yr channel | ≥5 offered, ≥2 unsolicited | **≥3 qualified introductions from paid pilots, ≥2 unsolicited** | Merged: A's qualification standard, B's unsolicited requirement. |
| Time saved | ≥30% on covered tasks, recorded baseline | not gated | **A** | The only quantitative outcome gate either package had. |
| Professional boundary | counsel-reviewed, no professional conclusions | implicit | **A, mandatory** | Existential for a one-person company. |

### 2.5 Adopted from B without conflict

Anti-gaming rules, now binding: thresholds are not adjusted after collection begins; a
row with no evidence is FAIL rather than CONCERN; design-partner conversions count at
half weight; the scorer writes and seals a prediction for every mandatory row before
week two and compares afterward.

---

## 3 · Red team of ADR-001

Limited scope, per instruction. No general market research was restarted.

**Finding: none of the three issues invalidates the wedge. Two require amendments to how
it is validated. One requires a change of emphasis in who is recruited.**

### 3.1 Customer lifetime value

ADR-001 scored frequency 2/5 for M&A and accepted it. That score is correct and its
consequence was under-processed: a traditional searcher acquires **one** company and
then permanently stops being a buyer. At the design-partner price this is a single
$1,500 lifetime transaction against a comparable acquisition cost.

Candidates assessed:

| Candidate | Deals/yr | Same deliverable? | Verdict |
|---|---|---|---|
| **Independent sponsors** | 2–5 | Yes, unchanged | **Primary.** Same buyer-side job, no repositioning, 3–5× frequency, no procurement. |
| **Lower-middle-market PE** | 4–12 | Mostly | Secondary. Has associates who may already do the work; introduces procurement. |
| **QoE providers** | 50–200 | Adjacent | **Test as channel and as buyer.** Serves many searchers. Risk: sees Reef as competitor and blocks it. Must be asked directly. |
| **Sell-side advisors / brokers** | every listing | **Inverted — room readiness before it goes out** | **Unexpected, worth one arm.** Highest frequency in the ecosystem, same inventory-and-gap mechanics, no seller-NDA problem because it is their own room. |
| **SBA lenders** | 100s | No — credit file completeness, not buyer issue register | Deprioritize. Different deliverable, regulated, slow procurement. |
| **Transaction attorneys** | high | No | **Reject.** Billable-hour economics make time saved revenue lost. Structurally misaligned. |
| **Fractional CFOs** | 5–15 | Partly | Low priority. Budget-constrained. |

**Amendment:** the ICP is reweighted from "searchers and independent sponsors" to
**"independent sponsors first, active searchers second,"** and two recruiting arms are
added — QoE providers tested as buyer *and* channel, and sell-side room-readiness as a
distinct hypothesis. Interview allocation is restated in `M0_PLAN.md`.

This is a change of emphasis inside the selected wedge, not a wedge change. ADR-001 is
amended, not superseded.

### 3.2 Third-party processing rights

Both packages required "written authority." Neither specified the questions. The
validation plan now carries a precise counsel brief, and **no legal conclusion is stated
anywhere in this repository.**

Questions for counsel, added to `M0_PLAN.md` and to be asked in week one:

1. In a customary US private-target seller/buyer NDA, does the defined term
   *Representatives* include a paid third-party service provider engaged by the buyer,
   or is that typically limited to advisors of defined categories?
2. If it does, does the buyer's obligation to cause Representatives to comply require a
   joinder or written undertaking from that provider?
3. Does routing confidential content through a third-party model API constitute
   disclosure to a subprocessor requiring separate consent, and does a contractual
   zero-retention and no-training posture change the analysis?
4. What consent mechanism is standard — prior written consent, notice, or reliance on
   the Representatives clause — and what does a minimal seller-consent request look like?
5. Do return-or-destroy obligations extend to derived work product such as an issue
   register and its evidence appendix, and what is customary on backup expiry?
6. If the provider breaches, is the buyer liable to the seller, and what indemnity is
   customary in a $1,500–$8,500 engagement?
7. Does any of the above change if processing occurs entirely on customer-controlled
   infrastructure with no content leaving their environment?

Question 7 matters most: an affirmative answer converts a potentially fatal blocker into
an architecture requirement, and local-first processing is what DataGate already is.

**Amendment:** `L1` is added to `HYPOTHESES.md` as a binary blocking hypothesis, and
counsel engagement moves to week one — before the first pilot offer, not before the
first delivery.

### 3.3 Existing coverage

ADR-001 documents Datasite's shipped cited-AI diligence and treats commoditization as a
listed risk. The gap was methodological: neither package specified how an interview
distinguishes Reef from five different incumbents.

**The rule now binding:** availability is not usage, and usage is not satisfaction. A
participant whose VDR has AI they never opened is **not** evidence that the incumbent
failed. It is evidence the incumbent was never tested, and it is scored as neutral.

Five separate probes, added to the interview guide, each demanding an artifact or a
reconstructed episode rather than an opinion:

| Incumbent | Probe | Counts as displacement evidence when |
|---|---|---|
| VDR AI | "Did the room have AI search? Show me what you asked it and what came back." | They used it and abandoned it for a stated, specific reason |
| QoE report | "What did the QoE cover, and what did you still check yourself afterward?" | They name owned work that survived the QoE |
| Attorney issues list | "What was on their list, and what was on yours?" | Two distinct lists exist and theirs contains the owned scope |
| Generic assistant | "Did any of these documents go into ChatGPT or Claude? What happened?" | They tried it and hit a specific wall — context, trust, volume, or confidentiality |
| Configured project | "Did you set up a project or custom GPT with the room in it?" | They built one and it failed at a named point |

**Amendment:** `X1` is added to `HYPOTHESES.md`. The scorecard's competitive-displacement
row already requires ≥8 of 15; it is now qualified — only participants who *tried* an
incumbent count toward that number.

### 3.4 Conclusion

The wedge is not changed. **Reef retains a narrow, valuable, plausibly defensible job:**
request-list-to-room reconciliation with exact evidence anchors, for a buyer who has no
analyst, on a room that frequently is not in a professional VDR at all. That job is not
performed by the QoE provider, not performed by the attorney, not reachable by a VDR's
AI when the room is a Dropbox folder, and not reliably performed by a general assistant
at 1,500-document scale.

Defensibility remains unproven. That is what M0 exists to test.

---

## 4 · Historical disposition

| Original | Now at | Status |
|---|---|---|
| `docs/reef/validation/*.md` (9) | `docs/archive/reef-m0-v0/claude-v0/` | Archived, banners applied, removed from `docs/reef/` |
| `docs/validation/*.md` pre-merge (9) | `docs/archive/reef-m0-v0/codex-v0/` | Archived verbatim, banners applied |
| `docs/reef/*.md` (8) | unchanged | Already marked historical by ADR-001 |

Every archived file names its canonical replacement and why it was superseded. No file
was deleted.

## 5 · Consequences

1. `docs/validation/**` is the only validation authority. Eleven files, listed in
   `docs/README.md`.
2. ADR-001's wedge stands, amended per §6.
3. Pricing hypotheses are $1,500 / $4,500 / $8,500. The `$1,500 per room` figure in
   `docs/reef/01-strategy.md` is historical and is contradicted here.
4. M1 remains blocked. ADR-003 must authorize it.
5. Synthetic fixture work may proceed; it validates mechanics only and cannot satisfy any
   customer, payment, access or value gate.

## 6 · Amendments to ADR-001

Narrow, and each traceable to §3.

- **A1.** ICP reweighted to independent sponsors first, searchers second. Two arms added:
  QoE providers as buyer/channel, and sell-side room readiness.
- **A2.** Counsel engagement moves to week one with the seven-question brief in §3.2.
  `L1` becomes a binary blocking hypothesis.
- **A3.** Competitive-displacement evidence counts only from participants who actually
  tried an incumbent. Availability alone is neutral.

ADR-001's decision, scoring, reversal triggers and deferral of the engineering wedge are
otherwise unchanged and remain in force.

## 7 · Risks this consolidation does not remove

1. Both packages were written by models reading the same repository with no customer
   contact. Their agreement is correlated error, not replication.
2. Merging two documents produces a third that neither author would defend in every
   particular. The thresholds in §2 are the seams most likely to be wrong.
3. Consolidation creates an impression of progress. **Nothing has been validated.** Zero
   interviews have occurred.
