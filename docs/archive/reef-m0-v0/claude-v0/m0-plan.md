> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/M0_PLAN.md`](../../../validation/M0_PLAN.md)
> **Superseded because:** Sequence, participants and recruiting survive; its assumption register was superseded by the ID'd HYPOTHESES table.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# M0 plan

---

## Wedge hypothesis

> **[H]** Buyers of small businesses ($2M–$25M enterprise value) who run diligence
> without a staffed analyst bench spend 60–120 hours per deal reading a disorganized
> data room, fear missing a deal-breaking fact more than they resent the hours, and
> will pay approximately $1,500 per deal for a findings memo in which every claim links
> to the page it came from.

Decomposed, because the sentence hides five separate bets:

| # | Bet | Fails if |
|---|---|---|
| 1 | The work is large | It's really 15 hours, not 100 |
| 2 | The work is painful enough to outsource | They find it valuable to do themselves — reading *is* the diligence |
| 3 | The output is the memo | What they actually need is a conversation, or a QoE, or a lawyer |
| 4 | They buy it often enough | A searcher buys once, ever |
| 5 | They can legally hand over the documents | The seller NDA forbids third-party disclosure |

**Bets 4 and 5 are the ones that kill this quietly**, because interviews will produce
warm feedback on 1, 2 and 3 while 4 and 5 go untested.

---

## Assumption register

Ranked within each category by how badly a failure hurts. `[H]` throughout — nothing is
evidence yet.

### Desirability

| | Assumption | Risk |
|---|---|---|
| D1 | Missing a material fact is a top-three fear during diligence | Medium |
| D2 | They would trust a memo produced partly by software with a human check | High |
| D3 | The memo is read by someone else (investors, lender, IC), which is what makes it worth producing | Medium |
| D4 | They want findings, not a searchable corpus | Medium |

### Willingness to pay

| | Assumption | Risk |
|---|---|---|
| W1 | $1,500 is below the "just decide" threshold and above the "must be junk" floor | High |
| W2 | It comes out of deal budget, not a software budget | Medium |
| W3 | They will pay before seeing output, with a deposit | **Very high** |
| W4 | Price does not need to scale with room size | Medium |

W3 is the real test. Everything up to it is talk.

### Workflow fit

| | Assumption | Risk |
|---|---|---|
| F1 | A data room arrives as a coherent batch, not a two-week trickle | High |
| F2 | 48–72h turnaround is fast enough to be useful mid-exclusivity | High |
| F3 | The memo slots into an artifact they already produce | Medium |
| F4 | They are not already getting this from their QoE accountant or attorney | **Very high** |

F4 is underexamined and could be fatal. The QoE provider may already cover a third of
the checklist, and the attorney another third, leaving Reef a thin middle.

### Technical feasibility

| | Assumption | Risk |
|---|---|---|
| T1 | A meaningful share of documents have usable text or OCR cleanly | High |
| T2 | The findings that matter are findable from documents alone, without tribal knowledge | High |
| T3 | Cross-document contradictions are detectable at acceptable precision | High |
| T4 | A room fits in a workable processing budget | Low |

### Data availability

| | Assumption | Risk |
|---|---|---|
| A1 | Participants will share a real (redacted) room for the pilot | **Very high** |
| A2 | Seller NDAs permit disclosure to a service provider under the buyer's control | **Very high** |
| A3 | Rooms are representative enough that a fixture generalizes | Medium |

A2 is a legal question with a binary answer that nobody has asked. Ask it in interview
one. If the standard NDA in this market forbids third-party processing without seller
consent, the entire wedge has a procedural blocker that no product quality overcomes.

### Security expectations

| | Assumption | Risk |
|---|---|---|
| S1 | A signed NDA and a plain retention policy are enough at pilot stage | Medium |
| S2 | "Zero-retention model endpoints" satisfies the concern rather than raising it | Medium |
| S3 | They will not require SOC 2 to run a pilot | Medium |

### Acquisition cost

| | Assumption | Risk |
|---|---|---|
| C1 | Searcher communities are reachable without paid acquisition | Medium |
| C2 | Brokers, QoE accountants and SBA lenders are a real channel | High — and high upside |
| C3 | CAC lands under ~$300 for a $1,500 sale | High |

### Frequency — the underweighted one

| | Assumption | Risk |
|---|---|---|
| N1 | A searcher runs deep diligence on 3–8 deals before closing one | **Very high** |
| N2 | Independent sponsors and small PE run 2–12 per year | High |
| N3 | LTV exceeds one transaction | **Very high** |

**This is the most likely quiet failure in the whole plan.** A search-fund principal
acquires *one* company and then stops being a buyer forever. If they only pay during the
single deal that closes, LTV is $1,500 against a CAC that may approach it, and the
business does not work regardless of how good the memo is.

Two escape hatches to test explicitly:

- Searchers may run partial diligence on many deals they walk away from — if Reef is
  used at LOI screening rather than only at closing, frequency rises sharply and the
  price per use falls.
- The repeat buyer may not be the searcher at all but the **broker, QoE accountant, or
  SBA lender** who serves twenty of them. Test that channel as a customer, not only as
  a referral source.

`01-strategy.md` names the channel as high-leverage distribution. M0 must test whether
it is actually the customer.

---

## Participants

Target **22 conversations**, minimum **15**, across:

| Profile | Target | Why |
|---|---|---|
| Search-fund principals, in-search | 6 | The stated ICP |
| Search-fund principals, recently closed | 3 | Memory of a completed process, no active urgency to distort it |
| Independent sponsors | 4 | Higher frequency, tests N2 |
| Small PE / corp dev associates | 3 | Adjacent, tests whether pain scales up |
| QoE accountants | 3 | Tests F4 and C2 — do they already do this, or would they buy it |
| SBA / acquisition lenders | 2 | Highest frequency buyer in the ecosystem |
| Transaction attorneys | 1–2 | Tests A2 and the boundary of what software may claim |

Minimum for any conclusion: **10 buyer-side** (the first three rows) plus **3
adjacent**. Fewer than that is anecdote.

Disqualify anyone who has not personally read data-room documents in the last 12 months.
Advisors who describe the process secondhand produce confident, wrong answers.

## Recruiting channels

Ranked by expected yield per hour:

1. **Warm intros**, including from a first participant — the ask is built into the
   interview guide's commitment ladder
2. **Searchfunder.com** — direct messages, specific and short
3. **ETA podcasts** — reach recent guests; they are publicly identified as buyers and are
   used to being contacted
4. **X / LinkedIn ETA community** — post the *research*, not the product
5. **University search programs** — Stanford, HBS, Chicago Booth ETA clubs
6. **QoE firms and SBA lenders** — cold, but they answer, because deal flow is their job

Script for outreach — short, no product mention:

> I'm researching how small-cap acquirers actually run document diligence. Not selling
> anything and there's nothing to demo. 25 minutes, and I'll share the aggregated
> findings across all interviews when I'm done. Are you open to it?

The offer of aggregated findings is the strongest currency available and costs nothing.

---

## Two-week sequence

### Week 1 — learn

| Day | Do |
|---|---|
| 1 | Build the participant list, 40 names. Send 25 outreach messages. |
| 2 | Finalize `interview-guide.md`. Dry-run it once with anyone. |
| 3–4 | Interviews 1–6. Transcribe same day. |
| 5 | **Checkpoint.** If workflow descriptions diverge wildly, the segment is not one segment — split it and re-target before continuing. |
| 6–7 | Interviews 7–14. Build `workflow-map.md` from actual transcripts. |

### Week 2 — test

| Day | Do |
|---|---|
| 8 | Draft the checklist from what interviews said matters. Build the synthetic room from `sample-deal-room.md`. |
| 9 | Run the concierge process against the synthetic room end to end. Time it honestly. |
| 10 | Interviews 15–22, now including the commitment ladder and the pricing experiments. |
| 11–12 | Deliver 1–3 real concierge pilots against real rooms. Charge. |
| 13 | Review meetings. Watch which sections they read first and which they skip. |
| 14 | Score against `validation-scorecard.md`. Write the decision. |

**Day 9 exists to protect against the most embarrassing outcome:** selling a pilot and
then discovering the process takes 30 hours per room. Run it on synthetic data first.

---

## Evidence required to continue

M1 does not begin until all of the following are true. Thresholds and the full scorecard
in [`validation-scorecard.md`](validation-scorecard.md).

1. ≥15 qualified interviews, ≥10 buyer-side
2. ≥8 independently describe the same top-two time sinks, unprompted
3. ≥3 paid pilots delivered, money received before delivery
4. ≥2 customers state, unprompted, that they sent the memo to someone else
5. A written answer on A2 — whether standard NDAs permit third-party processing
6. Concierge delivery under 12 hours of human effort per room by the third run
7. A checklist of ≥15 findings that recurred across ≥3 real rooms

## Pivot thresholds

Distinct from kill criteria: these change the target, not the project.

| Observation | Pivot to |
|---|---|
| Frequency fails (N1/N3) but pain is confirmed | Sell to lenders / QoE firms / brokers as the repeat buyer |
| QoE and attorneys already cover the checklist (F4) | Narrow to the gap between them — usually contracts and obligations, not financials |
| They want it at LOI screening, not confirmatory diligence | Cheaper, faster, shallower product. Better business: higher frequency, lower price |
| Documents cannot be shared (A2) | Local-first desktop processing — which is DataGate's existing architecture, and would make that prototype suddenly load-bearing |
| Pain confirmed but only in AEC-shaped participants | The competing wedge in `decision-log.md` wins |

## Kill criteria

| Observation | Read |
|---|---|
| <5 of 15 describe diligence document review as a top-three pain | The premise is wrong |
| Nobody will pay a deposit after a warm interview | Interest is politeness |
| Concierge exceeds 25h per room at run three | No automation path closes that gap at $1,500 |
| Legal blocker on A2 with no workable consent path | Procedurally dead in this form |
| Zero referrals offered across 15 interviews | Not painful enough to talk about |

---

## What does not count as validation

Written here because these are the failure modes that feel like success.

- **"That sounds really useful."** The most common sentence in customer discovery and
  the least informative. Not evidence.
- **A signup, a waitlist entry, or an enthusiastic call.** Free interest predicts nothing.
- **Feature requests.** Someone designing your product is being generous, not buying.
- **Your own excitement after a good call.** Log the quote, not the feeling.
- **A pilot given away free.** It tests whether they'll accept a gift.
- **Agreement with a leading question.** If the question named the problem, the answer
  is yours, not theirs. See `interview-guide.md`.

The only three things that count: **money before delivery**, **the memo forwarded to a
third party**, and **an unsolicited introduction to another buyer.**
