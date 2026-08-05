# Validation scorecard and M1 gate

## Rule

M1 application implementation may begin only when **every mandatory row is Pass**, no
automatic-fail condition is active, evidence is logged, and ADR-002 explicitly
authorizes implementation. An average score cannot hide a failed data-access,
payment, security, professional-boundary, or usefulness gate.

Use only qualified participants and actual behavior. Synthetic-package results count
only toward mechanics and technical feasibility.

## Market and workflow thresholds

| Measure | Pass | Concern | Fail |
| --- | --- | --- | --- |
| Qualified interviews | At least 15 across at least 8 searchers/sponsors and 4 advisor/investor/VDR roles | 10–14 or role concentration | Fewer than 10 after 60 days |
| Repeated pain | At least 10/15 personally own or manage the workflow; at least 8/15 report the same narrow pain with a recent example | 6–7 report the same pain or examples are vague | Fewer than 6 report it |
| Hours spent per package | Median 12+ hands-on hours on owned steps; at least 5 cases measured from a timeline/artifact | Median 5–11.9 hours | Median under 5 hours |
| Cost of rework or delay | At least 5 participants quantify a real delay, repeated work, advisor cost, or opportunity cost; median covered-task value is 3× standard pilot price | Concrete incidents but weak/unknown economics | Fewer than 3 concrete incidents or economics below pilot price |
| Project frequency | Sponsor/advisor channel or cohort represents at least 12 qualified data-room reviews/year, and at least 5 participants expect another within 12 months | Individual episodic use with plausible referral channel | No repeat cohort/channel and most buyers expect no second use |
| Competitive displacement | At least 8 identify an owned step not acceptably solved by VDR AI, advisors, or general assistants, and both paid pilots prefer the delivered workflow on that step | Product is better only on presentation or price | Existing tool solves the job for most; no switching reason |

## Commitment and access thresholds

| Measure | Pass | Concern | Fail |
| --- | --- | --- | --- |
| Access to redacted documents | At least 3 governed usable packages from distinct qualified sources, each with request list, documents, and structured data | 2 usable packages or heavily synthetic subsets | Fewer than 2, or no written authority |
| Willingness to test | At least 5 qualified prospects agree to a dated scoped test and complete security/scope intake | 3–4 agree or timelines drift | Fewer than 3 |
| Willingness to pay | At least 2 of 5 qualified offers sign and pay at least $1,500 with 50% deposit; at least 1 tests $4,000+ path | One paid pilot plus one signed conditional intent | 0 of 5 pay or only free tests proceed |
| Referral willingness | Paid pilots produce at least 3 introductions to qualified workflow owners, or one advisor/sponsor channel with 5+ annual opportunities | One or two qualified introductions | No qualified introductions after three pilots |
| Security objections | At least 3 prospects approve the real pilot data flow or require only controls available before intake | One major achievable control blocks timing | Two or more require SOC 2, VDR-native/no-export, on-prem, or unavailable controls before any pilot |

## Delivery thresholds

| Measure | Pass | Concern | Fail |
| --- | --- | --- | --- |
| Acceptable turnaround | Standard five-business-day scope accepted by at least 4/5 prospects; actual median delivery at or under five days | Buyers require 2–3 days but will pay rush; delivery slips once | Required turnaround is under 48 hours at standard price or median exceeds 7 days |
| Inventory/coverage completeness | 100% of supplied manifest items have a processing state; no silent omission | One corrected process error | Repeated silent omissions or uncertain package boundary |
| Evidence anchors | At least 95% correct over 100 stratified factual findings, with 100% factual citation coverage | 90–94.9% anchor correctness | Under 90% or any uncited factual deliverable item |
| Finding precision | At least 95% deterministic/direct-fact precision and 90% customer-confirmed missing-item precision | 85–94.9% or one noisy check class that can be removed | Under 85%, or useful output depends on probable inference |
| Time saved | At least 30% on covered tasks in both paid pilots using recorded baseline | 15–29% or only one pilot reaches 30% | Under 15% in both |
| Real workflow use | Both paid-pilot registers are used in an advisor escalation, diligence meeting, investor update, or equivalent | One used, one only reviewed with Reef | Neither leaves the Reef review call |
| Repeatability | By pilot 2, at least 80% of operator steps follow the same documented procedure and non-repeatable work is under 20 hours/package | 20–30 hours bespoke work or check set still moving | More than 30 hours bespoke work/package or expert judgment dominates |
| Professional boundary | Counsel-reviewed offer/terms exist and qualified reviewers find no delivered professional conclusion | Wording corrections required before delivery | Output is relied on as legal/accounting/investment advice or counsel rejects scope |

## Automatic fail conditions

Any one blocks M1 regardless of other scores:

- live data received without written authority and approved handling terms;
- material confidentiality/security incident;
- no paid pilots after five qualified offers;
- inability to delete pilot data as promised;
- deliverable contains uncited factual findings or professional conclusions;
- customer value requires unsupported or prohibited data categories;
- work duplicates an existing tool without a measured advantage;
- evidence fabrication, threshold manipulation, or counting synthetic/free activity as
  customer/payment evidence.

## Exact condition permitting M1

M1 begins only after:

1. all 19 mandatory scorecard rows are Pass;
2. no automatic fail is active;
3. raw evidence and calculations are recorded in [RESEARCH_LOG.md](RESEARCH_LOG.md);
4. the founding team conducts a written review of rejected and contradictory evidence;
5. ADR-002 records one of four decisions: build M1, narrow and revalidate, pivot to the
   engineering wedge, or stop Reef;
6. if ADR-002 says build, it names the exact user, input boundary, five or fewer first
   checks, deliverable, security boundary, owner, evaluation set, and M1 exit criteria.

Until all six are true, permitted work is interviews, research, synthetic fixtures,
manual pilot operations, security/legal preparation, and documentation. Application
implementation is prohibited.

## Decision interpretations

- **Pass:** Evidence supports a narrow paid build, not the broad platform.
- **Concern:** Run a time-boxed targeted test; do not start M1.
- **Fail:** Kill or change the assumption. If the failure is wedge-level, supersede
  ADR-001 and test engineering rather than softening thresholds.

---

## Anti-gaming rules

Adopted by ADR-002 and binding. The person scoring this card is also the person who
wants it to pass; these exist because that is a known and predictable conflict.

- **Thresholds are not adjusted after collection begins.** A threshold that moves is not
  a threshold. Changing one requires a superseding ADR written before the data is seen.
- **A row with no evidence is Fail, not Concern.** Absence of data is not ambiguity.
- **Design-partner conversions count at half weight** toward willingness to pay. A
  discounted sale tests price sensitivity, not value.
- **Unprompted stays unprompted.** If the question named the problem, the answer is not
  counted toward repeated pain, however good it sounded.
- **Deposit before intake is the definition of willingness to pay.** Payment after
  delivery measures satisfaction and is scored separately.
- **Only participants who tried an incumbent count toward competitive displacement.**
- **Sealed prediction.** Before week two begins, the scorer writes a predicted result for
  every mandatory row, commits it to `DECISION_LOG.md`, and compares afterward. Where
  prediction and outcome diverge is the actual finding of M0.

## Threshold provenance

Numbers reconciled by [ADR-002 §2](../decisions/ADR-002-validation-package-consolidation.md).
Three thresholds were deliberately **loosened** from the alternative package because the
stricter number would have created false confidence: price ($4,500 standard, not
$1,500), turnaround (5 business days, not 72 hours), and hours-of-pain (12h on owned
steps, not 40h whole-deal). Each is argued there. Do not "restore" them without reading
the argument.
