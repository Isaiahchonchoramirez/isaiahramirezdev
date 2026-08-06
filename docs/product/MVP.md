# Reef MVP

> This defines the product that may follow validation. It is not approved for
> implementation until [SCORECARD.md](../validation/SCORECARD.md) passes and a new ADR
> authorizes M1.

## Product sentence

Reef converts a buyer-approved request list and bounded small-cap data room into a
reviewed evidence register of supplied items, missing requested material, defined fact
conflicts, structured-data quality issues, and unresolved questions.

## Narrowest high-value workflow

Own **request-list-to-room reconciliation and issue-register preparation** first.

The workflow begins after a request list and initial package exist and ends when the
buyer has a reviewed register ready to route to advisors and management. It does not
own legal analysis, quality of earnings, valuation, negotiations, or approval to close.

## In scope for a future M1

- One customer, one deal, one approved request list, and one current package.
- PDF, DOCX, XLSX, CSV, and TXT if validation confirms them; scanned PDF only after
  citation-anchor evaluation.
- ZIP/folder intake that preserves paths and hashes.
- Immutable inventory, duplicate identification, unsupported-file register, and
  coverage statement.
- Human-correctable document classification and request-list mapping.
- Missing-requested-item proposals that require customer confirmation.
- Deterministic tabular profiling with sheet/cell/row provenance.
- A small evaluated set of cross-source reconciliations chosen from paid pilots.
- Finding classes and uncertainty labels defined in the concierge plan.
- Exact evidence anchors and source viewer.
- Human dispositions and evidence-linked report export.
- Basic account/tenant isolation and deletion controls required to operate lawfully.

## Explicitly out

| Not in M1 | Reason |
| --- | --- |
| Deal recommendation or risk score | It implies investment advice and hides heterogeneous uncertainty |
| Legal clause conclusions | Counsel owns legal interpretation |
| Quality-of-earnings opinion | Licensed/experienced accounting specialists own it |
| Valuation, tax, lender, or commercial-market opinion | Separate professional scopes |
| Generic “ask anything” homepage | It encourages unsupported questions and hides the deliverable |
| Email, Slack, audio, video, websites, CAD, or sensors | They do not serve the bounded first workflow |
| Autonomous outreach, negotiation, or VDR action | Human authority and source-system permissions remain primary |
| 3D reef | It cannot prove customer value before the review workflow works |
| Broad connectors | Governed export intake is enough to validate M1 |
| Custom agent/workflow builder | Reef must prove one strong default |
| Neo4j, Kafka, Kubernetes, or microservices | No validated constraint requires them |

## Proposed user flow

1. Create the deal review and confirm package authority and exclusions.
2. Attach the approved request list and current package.
3. Review inventory, unsupported items, and uncertain classifications.
4. Confirm or correct request-list mappings before anything is called missing.
5. Review findings ordered by class and confidence, with source evidence beside each.
6. Accept, reject, annotate, assign, or mark unresolved.
7. Export the approved issue register and coverage appendix.
8. Add one bounded package update and review only changed results.
9. Close the review and execute the retention/deletion choice.

## Definition of done

A future M1 is done only when representative held-out packages demonstrate:

- 100% factual citation coverage;
- at least 95% citation-anchor correctness;
- at least 95% precision for shipped deterministic findings;
- at least 90% precision for customer-confirmed missing-item findings;
- explicit partial and unsupported coverage with no silent omissions;
- at least 30% customer time saved on inventory, request reconciliation, and issue-
  register preparation;
- no shipped statement that a qualified reviewer identifies as professional advice;
- successful deletion and restore tests for the operating data boundary.

## Before M1

The concierge service must deliver the workflow manually. At least two qualified
customers must pay at or above the design-partner price, at least three must share a
governed representative package, and the complete mandatory gate in the scorecard must
pass. A follow-up ADR then records whether to build, narrow, pivot to engineering, or
stop.

## Kill criteria

- Customers will not share governed representative material.
- Existing VDR or general AI functions satisfy the job at acceptable trust and cost.
- The useful deliverable consistently requires non-repeatable legal/accounting judgment.
- Fewer than two of five qualified prospects pay.
- Covered work saves less than 30% of customer time.
- No repeat, referral, or advisor-channel signal appears after paid pilots.
- Security requirements cannot be met without building enterprise infrastructure before
  demand is proven.
