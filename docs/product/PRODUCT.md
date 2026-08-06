# Reef Product Strategy

> Decision authority: [ADR-001](../decisions/ADR-001-initial-market-wedge.md). Reef
> validates buyer-side small-cap M&A diligence first. M1 remains blocked.

## The single expensive problem

A searcher or independent sponsor enters exclusivity with a small business and receives
a changing data room assembled by a seller, broker, counsel, and advisors. The buyer
must inventory what arrived, compare it with the request list, inspect operating data,
reconcile facts repeated across documents, track unanswered questions, and escalate
issues before time or leverage runs out.

Reef's first job is narrow:

> Given a bounded buyer-side request list and supplied data room, produce a human-
> reviewed evidence register of contents, gaps, defined inconsistencies, structured-
> data quality issues, and unresolved questions.

The deliverable supports diligence management. It does not replace legal diligence,
quality of earnings, tax review, valuation, commercial diligence, cybersecurity review,
technical diligence, lenders, investors, or final buyer judgment.

## Reconciled wedge decision

The engineering technical-package alternative has stronger frequency, retention, and
expansion potential. M&A has the better current path to obtaining paid evidence because
the first buyers are concentrated and self-directed, sales can occur per deal without
enterprise procurement, a manual service can be delivered sooner, and DataGate's
tabular profiling is more directly relevant.

This advantage is only four points in ADR-001's directional matrix and rests on
unvalidated assumptions. Engineering is deferred, not erased.

## Target customer and trigger

- **Primary user and buyer:** active self-funded or traditional searcher, independent
  sponsor, or two-to-five-person acquisition team.
- **Initial deal:** signed LOI, $2M–$25M enterprise value hypothesis, 300–3,000 supplied
  files, and at least one structured operating dataset.
- **Trigger:** the room opens or receives a material update during exclusivity.
- **Excluded first buyers:** public-company transactions, regulated financial
  institutions, cross-border deals needing jurisdiction-specific review, healthcare
  deals containing patient data, and deals where the service would receive privileged
  communications or data the customer lacks authority to disclose.

The deal-size and package ranges are validation boundaries, not market facts.

## Core workflow

1. Customer and Reef confirm authority, confidentiality terms, exclusions, request
   list, package boundary, and advisor roles.
2. Customer supplies a governed redacted or live package through the approved method.
3. Reef creates an immutable inventory and processing exceptions list.
4. Reef maps supplied items to the customer-approved request list.
5. Reef profiles supported tabular datasets and runs a disclosed set of deterministic
   reconciliation checks.
6. Reef records exact evidence for each factual item and classifies uncertainty.
7. A human quality reviewer verifies every shipped finding.
8. Customer reviews the issue register and routes items to counsel, accountants,
   management, or other advisors.
9. A bounded revision allowance updates the register when new material arrives.
10. Reef deletes or returns data under the agreed retention procedure.

## Why a customer might pay

The service competes with the buyer's own time spent organizing, searching, and
reconciling, not with specialist advice. A customer pays if Reef shortens those covered
tasks, reveals missing requested evidence earlier, makes advisor escalation more
efficient, and creates an auditable record that can be shared with investors.

No ROI claim is canonical until the validation package records actual hours, rates,
delay costs, and paid behavior.

## Product boundaries

Reef is not a VDR, file-sharing authority, project-management suite, document editor,
legal-research service, autonomous deal agent, or investment recommendation engine. It
may ingest authorized exports from existing systems. Source permissions and original
VDR controls remain authoritative.

## Differentiation hypothesis

Evidence-linked answers are now table stakes among strong VDR incumbents. Reef must
test a more specific difference:

- self-serve access and pricing for small acquisition teams;
- one buyer-side register joining request-list gaps, structured-data diagnostics,
  defined cross-document reconciliation, questions, and human dispositions;
- transparent coverage and abstention;
- fast room-update comparison independent of which storage system hosts the files.

If customers view this as a weaker copy of Datasite, ChatGPT, Claude, or advisor work,
the wedge fails.

## DataGate disposition

### Reuse after validation

- Conservative CSV/TSV/JSON/JSONL parsing and value coercion.
- Deterministic missingness, duplicates, type conflicts, distributions, and data-
  quality findings.
- Seeded tests and the habit of reporting only computed behavior.

### Do not carry forward unchanged

- Browser main-thread processing and first-50,000-row sampling.
- Generic correlations without a diligence question and domain context.
- Automatic “cleaned CSV” transformations.
- Generic webpage scanning and the neon portal shell.
- Claims that browser-local processing alone satisfies deal security.

The profiler becomes one bounded evidence tool, not Reef's product architecture.

## Defensibility requirements

Models are replaceable suppliers. Any durable advantage must accumulate in evaluated
check definitions, source/version provenance, buyer-approved request mappings, reviewer
dispositions, room-update history, and trusted acquisition-channel relationships.

## Current evidence sources

See ADR-001 and [RESEARCH_LOG.md](../validation/RESEARCH_LOG.md). Public sources prove
that the search-fund ecosystem and incumbent AI capabilities exist. They do not prove
that Reef's target customer will share data or pay.
