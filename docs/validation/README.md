# Reef validation package

The only validation authority. Consolidated from two competing packages by
[ADR-002](../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

## Purpose

Test whether independent sponsors, active searchers, or a repeat intermediary will share
a governed acquisition package and pay for a manual evidence service — before Reef writes
any application code.

The selected workflow is **buyer-side request-list reconciliation and evidence-register
preparation**. Reef inventories a bounded package, maps supplied documents to a
customer-approved request list, profiles supported structured data, records defined
conflicts and gaps, and attaches exact source anchors. It does not perform complete
diligence and does not provide professional advice.

## Authority

- Market decision: [ADR-001](../decisions/ADR-001-initial-market-wedge.md)
- Package consolidation and threshold reconciliation: [ADR-002](../decisions/ADR-002-validation-package-consolidation.md)
- Canonical index: [docs/README.md](../README.md)
- M1 gate: [SCORECARD.md](SCORECARD.md)

No application implementation begins because an interview went well, a synthetic fixture
passed, or one person offered encouragement. Every mandatory gate must pass and **ADR-003
must explicitly authorize implementation.**

## Documents

| # | File | Purpose |
|---|---|---|
| 1 | [HYPOTHESES.md](HYPOTHESES.md) | Falsifiable assumptions with methods and thresholds. `L1` and `N1` are blocking. |
| 2 | [M0_PLAN.md](M0_PLAN.md) | Participants, recruiting, two-week sequence, counsel brief |
| 3 | [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) | Non-leading reconstruction, role paths, incumbent probes, commitment ladder |
| 4 | [WORKFLOW_MAP.md](WORKFLOW_MAP.md) | The owned scope, and where it sits in the deal |
| 5 | [CONCIERGE_RUNBOOK.md](CONCIERGE_RUNBOOK.md) | Manual delivery procedure and the two classification dimensions |
| 6 | [SYNTHETIC_DEAL_ROOM_SPEC.md](SYNTHETIC_DEAL_ROOM_SPEC.md) | Legally safe fixture specification |
| 7 | [PILOT_OFFER.md](PILOT_OFFER.md) | Three paid pricing experiments and commercial boundaries |
| 8 | [SCORECARD.md](SCORECARD.md) | Pass / concern / fail thresholds, automatic fails, the exact M1 condition |
| 9 | [RESEARCH_LOG.md](RESEARCH_LOG.md) | Evidence ledger. R-001…R-008 are the only sourced evidence Reef has. |
| 10 | [DECISION_LOG.md](DECISION_LOG.md) | Append-only decision history and belief updates |
| 11 | `rehearsals/` | Internal dry runs against the synthetic fixture |

## Sequence

```text
counsel brief (L1)  ──┐
desk evidence         ├─► 15 qualified interviews
                      │      ├─► 3 governed sample packages
                      │      └─► synthetic calibration + rehearsal
                      │              └─► 2+ paid concierge pilots
                      │                      └─► outcome review
                      └──────────────────────────► scorecard
                                                      └─► ADR-003:
                                                          build · narrow · pivot · stop
```

Synthetic work may calibrate process before private data arrives. **It cannot count as
customer evidence, and a free test cannot count as willingness to pay.**

## Marking convention

Used throughout. A document that loses this distinction has stopped being useful.

| Mark | Means |
|---|---|
| `[H]` | Hypothesis. Nobody has said this. |
| `[E]` | Evidence. A named participant, on a dated call, or a cited source. |
| `[C]` | Contradicted. Evidence exists against it. |

## Research handling

- Record facts separately from interpretations and decisions.
- Ask about the most recent completed or active transaction, never an ideal future one.
- Store no live deal content in this repository, ever.
- Obtain written authority before receiving any package.
- Do not request privileged communications, patient data, cardholder data, credentials,
  export-controlled material, or anything the participant cannot lawfully share.
- Counsel reviews pilot confidentiality and data-processing terms before live intake.

## Current state

**Nothing is validated. Zero interviews have been conducted.**

Public research establishes that the market, the workflow and the competitors exist. It
establishes nothing about Reef's buyer, data access, price, useful check set, retention,
or differentiation. Every number in these documents is a threshold or a hypothesis.

Consolidating two packages into one created no evidence. It only removed the ability to
pass by choosing a scorecard.
