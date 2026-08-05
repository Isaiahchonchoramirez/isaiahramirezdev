# Reef documentation authority

> This is the single canonical index for Reef. If another document calls itself
> canonical but is not listed here, it is historical, exploratory, or supporting
> material and cannot authorize implementation.

## Current decision

Reef's initial validation wedge is **evidence-linked small-cap acquisition diligence
for searchers and independent sponsors**. The decision is provisional: it authorizes
customer validation and paid concierge work, not M1 application implementation.

Read [ADR-001](decisions/ADR-001-initial-market-wedge.md) before relying on any market,
customer, workflow, pricing, or MVP statement.

## Required reading order

1. [ADR-001: initial market wedge](decisions/ADR-001-initial-market-wedge.md)
2. [Company](vision/COMPANY.md)
3. [Mission](vision/MISSION.md)
4. [Product strategy](product/PRODUCT.md)
5. [MVP](product/MVP.md)
6. [Validation index and M1 gate](validation/README.md)
7. [System overview](architecture/SYSTEM_OVERVIEW.md)
8. [Architecture](architecture/ARCHITECTURE.md)
9. [Engineering constitution](architecture/ENGINEERING_PRINCIPLES.md)
10. [Technology stack](architecture/TECH_STACK.md)
11. [Design language](design/DESIGN_LANGUAGE.md)
12. [Ocean world](design/OCEAN_WORLD.md)
13. [Motion language](design/MOTION_LANGUAGE.md)
14. [Customer profiles](business/CUSTOMER_PROFILES.md)
15. [Business model](business/BUSINESS_MODEL.md)
16. [Roadmap](business/ROADMAP.md)

Future sessions should load this index, ADR-001, and only the domain documents needed
for the task. When observed customer evidence contradicts a document, update the ADR or
supersede it with a new ADR before changing implementation scope.

## Validation package

**`docs/validation/**` is the only directory governing M0.** Eleven files, consolidated
from two competing packages by
[ADR-002](decisions/ADR-002-validation-package-consolidation.md).

1. [README](validation/README.md) — purpose, authority, sequence, marking convention
2. [Hypotheses](validation/HYPOTHESES.md) — falsifiable assumptions; `L1` and `N1` block
3. [M0 plan](validation/M0_PLAN.md) — participants, recruiting, calendar, counsel brief
4. [Interview guide](validation/INTERVIEW_GUIDE.md) — script, role paths, incumbent probes
5. [Workflow map](validation/WORKFLOW_MAP.md) — the owned scope and its boundaries
6. [Concierge runbook](validation/CONCIERGE_RUNBOOK.md) — manual delivery procedure
7. [Synthetic deal room spec](validation/SYNTHETIC_DEAL_ROOM_SPEC.md) — fixture design
8. [Pilot offer](validation/PILOT_OFFER.md) — three paid pricing experiments
9. [Scorecard](validation/SCORECARD.md) — the M1 gate
10. [Research log](validation/RESEARCH_LOG.md) — evidence ledger
11. [Decision log](validation/DECISION_LOG.md) — append-only decision history

Supporting: [`fixtures/reef-deal-room/`](../fixtures/reef-deal-room/) is the generated
synthetic fixture; [`docs/evaluation/DEAL_ROOM_EVAL.md`](evaluation/DEAL_ROOM_EVAL.md)
defines how it scores a future implementation; `validation/rehearsals/` records internal
dry runs.

## Historical and supporting material

Preserved, never authoritative. Every archived file carries a banner naming its
replacement and the reason it was superseded.

- [`docs/archive/reef-m0-v0/`](archive/reef-m0-v0/) — both pre-consolidation validation
  packages, verbatim. `claude-v0/` and `codex-v0/`.
- [`docs/reef/**`](reef/README.md) — the preserved first M&A blueprint. Useful reasoning;
  its prices, roadmap, MVP and architecture predate the validation gates. Its
  `$1,500 per room` figure is **contradicted** by
  [ADR-002 §2.1](decisions/ADR-002-validation-package-consolidation.md); the canonical
  hypotheses are $1,500 design-partner / $4,500 standard / $8,500 rush.
- [Reef Sora kit](reef-sora-kit.md) — brand-production material only. Defines no customer,
  product, price, roadmap, or architecture.
- The engineering technical-package alternative is preserved in
  [ADR-001](decisions/ADR-001-initial-market-wedge.md) and remains the first reversal
  candidate. Restoring it requires a superseding ADR.

## What must be true before application development begins

M1 is blocked. Permitted work today: interviews, desk research, synthetic fixtures,
manual pilot delivery, legal and security preparation, and documentation.

All six must hold:

1. Every mandatory row in [SCORECARD.md](validation/SCORECARD.md) is Pass — including
   the blocking hypotheses `L1` (lawful third-party processing) and `N1` (the buyer, or
   an intermediary, purchases more than once).
2. No automatic-fail condition is active.
3. Raw evidence and calculations are recorded in [RESEARCH_LOG.md](validation/RESEARCH_LOG.md).
4. A written review of rejected and contradictory evidence exists in
   [DECISION_LOG.md](validation/DECISION_LOG.md), including the sealed prediction
   comparison.
5. **ADR-003** records one of four decisions: build M1, narrow and revalidate, pivot to
   the engineering wedge, or stop.
6. If ADR-003 says build, it names the exact user, input boundary, five or fewer first
   checks, deliverable, security boundary, owner, evaluation set, and M1 exit criteria.

Synthetic-fixture results satisfy none of these. They validate mechanics only, and
counting them as customer or payment evidence is an automatic-fail condition.

## Authority rules

1. ADRs govern disputed or changed strategy decisions.
2. This index defines which documents are canonical.
3. Canonical product and business documents define current scope.
4. Historical documents preserve reasoning but never authorize work.
5. Application code cannot begin until the six conditions above are satisfied.
6. When observed customer evidence contradicts a canonical document, amend or supersede
   the governing ADR **before** changing implementation scope — never edit the document
   quietly to match the evidence.
