# Validation scorecard

The M1 gate. Scored once, at the end of the two weeks, against evidence collected
throughout — never continuously, because a metric watched daily gets rationalized.

Reconciled with [ADR-001](../../decisions/ADR-001-initial-market-wedge.md) reversal
triggers. Where the two differ, **this scorecard takes the stricter number** and the
divergence is noted in the row.

---

## Scoring

| | Meaning |
|---|---|
| **PASS** | Evidence supports continuing |
| **CONCERN** | Ambiguous. Does not block on its own; two or more require a written argument in `decision-log.md` before proceeding. |
| **FAIL** | Blocks M1 regardless of anything else |

**Mandatory rows are marked ●. A single FAIL on a mandatory row blocks M1.** No
aggregate score overrides it — that is the entire purpose of marking them.

---

## The scorecard

### ● 1 · Qualified interviews

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 15 qualified, ≥ 10 buyer-side | 10–14 | < 10 |

Qualified = personally read data-room documents in the last 12 months. ADR-001 uses 15;
same number.

### ● 2 · Repeated workflow pain

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 8 of 15 name the same top-two time sinks, **unprompted** | 5–7 | < 5 |

Matches ADR-001's trigger exactly. *Unprompted* is the whole test — an answer given after
the problem was named in the question is discarded, not counted.

### 3 · Hours currently spent

| PASS | CONCERN | FAIL |
|---|---|---|
| Median ≥ 40h of buyer-personal document reading per deal | 20–39h | < 20h |

Under 20 hours there is no room for a $1,500 service. The economics stop working before
the product does.

### 4 · Monetary consequence

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 5 describe a specific miss (own or secondhand) costing > $50k | 2–4 | < 2 |

Secondhand counts. People describe others' disasters more freely than their own, and the
fear is what's being measured.

### ● 5 · Access to representative documents

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 3 share a governed redacted room | 1–2 | 0 |

Matches ADR-001. **The quiet killer.** Warm interviews with zero document access means a
product that cannot be built, tested, or improved. Ask early, not at the end.

### ● 6 · Legal permissibility

| PASS | CONCERN | FAIL |
|---|---|---|
| Written confirmation from ≥ 1 transaction attorney that standard NDAs permit service-provider processing under buyer direction, plus ≥ 3 customers confirming their own | Mixed answers | Standard NDAs prohibit it with no workable consent path |

Not in ADR-001's trigger list; added because it is binary, cheap to test, and capable of
ending the wedge in its current form on its own. Pivot path exists (local-first
processing) and is recorded in `m0-plan.md`.

### ● 7 · Willingness to run a pilot

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 3 paid pilots delivered | 2 | ≤ 1 |

ADR-001 requires 2. This requires 3, because two is not a pattern and the third
engagement is where the effort figure stabilizes.

### ● 8 · Willingness to pay

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 2 of 5 qualified prospects pay ≥ design-partner price, **deposit received before delivery** | 1 of 5 | 0, or payment only after delivery |

Ratio from ADR-001. The deposit clause is added: money after delivery tests satisfaction,
money before tests belief. Design-partner conversions count at half weight
(`pilot-offer.md`, experiment B).

### 9 · Acceptable turnaround

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 8 of 15 say 72h is useful mid-exclusivity | 4–7 | < 4, or they need same-day |

A same-day requirement is not a failure of the wedge — it reprices it. See experiment C.

### 10 · Security objections

| PASS | CONCERN | FAIL |
|---|---|---|
| Manageable with NDA + written retention policy; ≤ 2 of 15 require more | 3–6 require SOC 2 or equivalent | Majority blocked, or no lawful pilot within 60 days |

FAIL condition matches ADR-001's 60-day trigger.

### ● 11 · Recurring deal volume

| PASS | CONCERN | FAIL |
|---|---|---|
| Median ≥ 3 deep-diligence deals per participant per year, **or** a validated repeat buyer (lender / QoE / broker) with ≥ 10/yr | Median 2 | Median ≤ 1 with no repeat-buyer path |

**The row most likely to fail, and the one the strategy document underweighted.** A
searcher acquires once. If LTV is one $1,500 transaction against a comparable CAC, the
business does not work at any quality level. The escape hatch — selling to the
high-frequency ecosystem player rather than the buyer — must be tested inside M0, not
assumed.

### 12 · Referral willingness

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 5 offer an introduction, ≥ 2 unsolicited | 2–4 | 0–1 |

Zero referrals across fifteen conversations means the problem is not worth discussing,
which is a stronger negative signal than any stated opinion.

### ● 13 · Competitive displacement

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 8 of 15 say the deliverable is not covered by their VDR, QoE, attorney, or ChatGPT | 4–7 | Customers treat the output as interchangeable with existing VDR or AI features |

FAIL wording taken from ADR-001. **Weight this heavily.** ADR-001 documents that Datasite
markets native AI diligence with exact-source citations across a reported 16,000+ deals
per year — which materially weakens the differentiation claimed in `../01-strategy.md`.
Ask directly: *"Your VDR has AI search now. Why wouldn't you just use that?"* An
unconvincing answer here is the most likely honest reason to stop.

### 14 · Concierge effort

| PASS | CONCERN | FAIL |
|---|---|---|
| ≤ 12h human by the third engagement | 13–20h | > 20h after the second pilot |

FAIL threshold from ADR-001. Above 20 hours there is no automation path to $1,500 — the
gap is too large to close with software that doesn't exist yet.

### 15 · Output usefulness

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 2 customers forward the register to a third party within 7 days, verified by asking | 1 | 0 |

The single most informative row on the scorecard. A memo nobody forwards is a memo nobody
needed.

### 16 · Checklist stability

| PASS | CONCERN | FAIL |
|---|---|---|
| ≥ 15 findings recur across ≥ 3 real rooms | 8–14 | < 8, or every room is idiosyncratic |

If rooms share no structure, there is no product — only bespoke consulting, which is a
fine business and a different one.

---

## The gate

**M1 begins only when:**

1. Every ● mandatory row is PASS
2. No more than **3** CONCERN rows total
3. A superseding ADR is written recording the evidence, per ADR-001's requirement that
   M1 stays blocked until an ADR records the outcome
4. `decision-log.md` records what was learned that contradicted the hypothesis — and if
   nothing did, the research is treated as suspect rather than as confirmation

**If mandatory rows pass but 4+ CONCERNs appear:** do not proceed and do not stop. Run
two more pilots targeting the specific concerns. Ambiguity is a signal to buy more
information, not to pick a mood.

**If any mandatory row FAILs:** consult the pivot table in `m0-plan.md` and ADR-001's
reversal triggers. Most failures redirect the wedge rather than ending the project — the
engineering alternative is preserved in ADR-001 and can be restored by a superseding ADR.

---

## Recording

One row per participant, in `decision-log.md`, filled the same day:

```
ID · date · profile · hours/deal · deals/yr · NDA answer · ladder rung ·
tools named · top-two pain · contradicting evidence · verbatim quote
```

Score only from this table. Scoring from memory reliably produces a pass, because by
week two you will want one.

## Anti-gaming

The scorecard's author will also be the person tempted to move it. Written down in
advance:

- **Thresholds are not adjusted after data collection begins.** A threshold that moves is
  not a threshold.
- **Deposit-before-delivery is not negotiable** as the definition of willingness to pay.
- **Unprompted stays unprompted.** If the question named the problem, the answer is not
  counted, however good it sounded.
- **Design-partner sales count at half.**
- **A row with no evidence is FAIL, not CONCERN.** Absence of data is not ambiguity.
- **The person scoring writes their prediction for each mandatory row before week two
  begins**, seals it, and compares afterward. Where prediction and result diverge is
  where the real learning is.
