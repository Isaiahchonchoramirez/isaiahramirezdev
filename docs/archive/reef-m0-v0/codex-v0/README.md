> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/README.md`](../../../validation/README.md)
> **Superseded because:** Merged into the canonical index.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Reef validation package

## Purpose

This package tests whether active searchers and independent sponsors will share a
governed acquisition package and pay for a manual evidence service before Reef builds
application code.

The selected workflow is **buyer-side request-list reconciliation and evidence-register
preparation**. Reef inventories a bounded room, maps documents to a customer-approved
request list, profiles supported structured data, records defined conflicts and gaps,
and attaches exact source evidence. It does not perform complete diligence or provide
professional advice.

## Authority

- Market decision: [ADR-001](../decisions/ADR-001-initial-market-wedge.md)
- Canonical documentation: [docs/README.md](../README.md)
- M1 gate: [SCORECARD.md](SCORECARD.md)

No application implementation begins because an interview goes well, a synthetic
fixture works, or one person offers encouragement. Every mandatory M1 gate must pass
and a follow-up ADR must authorize implementation.

## Documents and order

1. [HYPOTHESES.md](HYPOTHESES.md) — falsifiable assumptions and thresholds.
2. [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) — non-leading reconstruction of the most
   recent real deal.
3. [WORKFLOW_MAP.md](WORKFLOW_MAP.md) — current workflow and Reef's narrow ownership
   boundary.
4. [CONCIERGE_PILOT.md](CONCIERGE_PILOT.md) — manual service that simulates the product.
5. [SYNTHETIC_PACKAGE_SPEC.md](SYNTHETIC_PACKAGE_SPEC.md) — legally safe repeatable
   fixture specification.
6. [PILOT_OFFER.md](PILOT_OFFER.md) — three paid pricing experiments and commercial
   boundaries.
7. [SCORECARD.md](SCORECARD.md) — pass, concern, fail thresholds and exact M1 condition.
8. [RESEARCH_LOG.md](RESEARCH_LOG.md) — evidence ledger, interview log, and decision
   history.

## Validation sequence

```text
desk evidence
   -> 15 qualified interviews
   -> 3 governed sample packages
   -> synthetic calibration
   -> 2+ paid concierge pilots
   -> customer outcome review
   -> scorecard
   -> ADR-002: build, narrow, pivot, or stop
```

Synthetic work may calibrate process before private data arrives, but it cannot count as
customer evidence. A free test cannot count as willingness to pay.

## Research handling

- Record facts separately from interpretations and decisions.
- Ask about the participant's most recent completed or active transaction, not an ideal
  future workflow.
- Store no live deal content in this repository.
- Collect only the minimum interview metadata needed for synthesis.
- Obtain written authority before receiving any sample package.
- Do not request privileged communications, patient data, payment-card data, credentials,
  export-controlled data, or information the participant cannot lawfully share.
- Have counsel review pilot confidentiality and data-processing terms before live intake.

## Current state

The wedge is **selected for validation but unvalidated**. Public research establishes
that the market, workflow, and competitors exist. It does not establish Reef's buyer,
data access, price, useful check set, retention, or differentiation.
