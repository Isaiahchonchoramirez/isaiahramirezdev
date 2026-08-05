# M0 plan

How the evidence in [HYPOTHESES.md](HYPOTHESES.md) actually gets collected. Participants,
recruiting, calendar, and the counsel brief.

---

## Participants

Reweighted by [ADR-002 §3.1](../decisions/ADR-002-validation-package-consolidation.md).
The original ICP led with searchers; a searcher acquires **once** and then permanently
stops being a buyer, so the cohort now leads with the higher-frequency buyer running the
identical workflow.

Target **24 conversations**, minimum **15**, of which **≥8 buyer-side** and **≥4
adjacent**.

| Profile | Target | Tests |
|---|---|---|
| **Independent sponsors** | 6 | Primary ICP. `N1`, `C1`, `W1`, `P1` |
| Active searchers, in-search | 5 | Secondary ICP. `N1` — do they diligence several deals before closing one? |
| Searchers, recently closed | 2 | Same workflow without live-deal urgency distorting recall |
| Small-fund PE / corp dev | 2 | Does the pain scale up, or does an analyst absorb it? |
| **QoE providers** | 3 | `X1` overlap **and** whether they are the repeat buyer or a competitor |
| **Sell-side advisors / brokers** | 3 | Room-readiness inversion — highest frequency, no seller-NDA problem |
| Transaction counsel | 2 | `L1`, and the boundary of what a non-professional service may state |
| VDR administrators / deal ops | 1 | `X1` — what the incumbent AI actually does in practice |

**Disqualify** anyone who has not personally read data-room documents in the last 12
months. Advisors describing the process secondhand produce confident, wrong answers.

Sell-side advisors are a deliberate arm, not a courtesy. "Is my room complete before I
send it out" uses the same inventory-and-gap mechanics, recurs on every listing, and
involves documents the advisor already controls — which sidesteps `L1` entirely. If the
buyer-side frequency gate fails, this is the first place to look.

## Recruiting

Ranked by expected yield per hour.

1. **Warm introductions**, including from participants — built into the commitment ladder
2. **Searchfunder** — direct, short, specific (see R-002 in [RESEARCH_LOG.md](RESEARCH_LOG.md))
3. **ETA podcasts** — recent guests are publicly identified as buyers and expect contact
4. **Independent sponsor networks and conferences** — smaller, denser, higher frequency
5. **QoE firms and business brokers** — cold, but deal flow is their job, so they answer
6. **University search programs**

Outreach, no product mention:

> I'm researching how small-cap acquirers actually run document diligence. Not selling
> anything and there's nothing to demo. 25 minutes, and I'll share the aggregated
> findings across all interviews when I'm done. Open to it?

The offer of aggregated findings is the strongest currency available and costs nothing.

---

## Counsel brief — week one

`L1` is binary, blocking, and answerable before any interview. Engage transaction counsel
in week one. **No legal conclusion appears anywhere in this repository**; these are
questions, and counsel's answers are recorded as `[E]` in `RESEARCH_LOG.md`.

1. In a customary US private-target seller/buyer NDA, does *Representatives* include a
   paid third-party service provider engaged by the buyer, or is it limited to advisors
   of defined categories?
2. If it does, does the obligation to cause Representatives to comply require a joinder
   or written undertaking from that provider?
3. Does routing confidential content through a third-party model API constitute
   disclosure to a subprocessor requiring separate consent? Does a contractual
   zero-retention, no-training posture change that?
4. What consent mechanism is standard — prior written consent, notice, or reliance on the
   Representatives clause — and what would a minimal seller-consent request look like?
5. Do return-or-destroy obligations extend to derived work product such as an issue
   register and its evidence appendix? What is customary on backup expiry?
6. If the provider breaches, is the buyer liable to the seller? What indemnity is
   customary in a $1,500–$8,500 engagement?
7. **Does any of the above change if processing occurs entirely on customer-controlled
   infrastructure, with no content leaving their environment?**

Question 7 matters most. An affirmative answer converts a potentially fatal blocker into
an architecture requirement — and local-first processing is what the DataGate engine
already is.

Separately, ask every buyer-side participant for the Representatives clause from their
last NDA. Counsel gives the general answer; the clauses give the actual distribution.

---

## Two-week sequence

### Week 1 — learn

| Day | Do |
|---|---|
| 1 | Build a 45-name list. Send 30 outreach messages. **Engage counsel with the brief above.** |
| 2 | Dry-run the interview guide once with anyone. |
| 3–4 | Interviews 1–6. Same-day debrief on each. |
| 5 | **Checkpoint.** If workflow descriptions diverge wildly, the cohort is not one segment — split and re-target before continuing. |
| 6–7 | Interviews 7–14. Update `WORKFLOW_MAP.md` from transcripts, not from memory. |

### Week 2 — test

| Day | Do |
|---|---|
| 8 | Draft the check set from what interviews said matters. Generate the synthetic fixture. |
| 9 | **Rehearse the full concierge process against the fixture. Time every stage honestly.** |
| 10 | Interviews 15–24, now including the commitment ladder and pricing experiments. |
| 11–12 | Deliver 1–3 paid pilots against real packages. |
| 13 | Review sessions. Watch which sections they read first and which they skip. |
| 14 | Score. Write the decision. |

**Day 9 protects against the most embarrassing outcome:** selling a pilot and then
discovering delivery takes 30 hours. Rehearse on synthetic data first — that rehearsal is
recorded under `rehearsals/`.

**Write the sealed prediction before day 8.** One predicted result per mandatory scorecard
row, committed to `DECISION_LOG.md`. Where prediction and outcome diverge is the real
finding of M0.

---

## What does not count as validation

These are the failure modes that feel like success.

- **"That sounds really useful."** The most common sentence in discovery and the least
  informative.
- **A signup, a waitlist entry, or an enthusiastic call.** Free interest predicts nothing.
- **Feature requests.** Someone designing your product is being generous, not buying.
- **Your own excitement after a good call.** Log the quote, not the feeling.
- **A free pilot.** It tests whether someone accepts a gift.
- **Agreement with a leading question.** If the question named the problem, the answer is
  yours, not theirs.
- **The synthetic fixture passing.** It validates mechanics. It is not a customer.

The things that count: **money before intake**, **the register used in a real meeting or
escalation**, and **an unsolicited introduction to another qualified buyer.**
