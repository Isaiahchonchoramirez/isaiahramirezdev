# ADR-001: Initial market wedge

- **Status:** Accepted for validation only
- **Decision date:** 2026-08-05
- **Decision owner:** Reef founding team
- **Review date:** after 15 qualified interviews or 60 days, whichever comes first
- **Implementation authority:** none; M1 remains blocked

## Context

Two substantial specifications selected different first markets:

1. `docs/reef/**` proposed small-cap M&A diligence for search funds, independent
   sponsors, boutique advisors, and small corporate-development teams.
2. `docs/vision`, `docs/product`, `docs/architecture`, `docs/design`, and
   `docs/business` proposed technical-package assurance for multidisciplinary
   engineering teams.

Both share a durable principle: material claims must remain connected to exact source
evidence. They differ in buyer, workflow, data, liability, route to market, pricing,
MVP, and recurrence. Leaving both authoritative would let future sessions select the
specification that happens to support the feature they want to build.

This ADR chooses the market to validate first. It does not claim product-market fit and
does not authorize application implementation.

## Decision criteria and method

Scores use 1 (unfavorable) to 5 (favorable). Risk criteria score ease of managing the
risk, so 5 means lower risk. Scores reflect repository evidence and public desk
research as of the decision date. They are directional, not statistical estimates.

No qualified interviews, representative private packages, or paid pilots exist. The
totals therefore compare the cost and speed of obtaining evidence; they do not prove a
market.

## Comparison matrix

| Criterion | M&A diligence | Engineering package assurance | Evidence and interpretation |
| --- | ---: | ---: | --- |
| Problem urgency | 5 | 4 | Live acquisitions have fixed exclusivity and closing pressure. Engineering issue milestones are urgent but often planned. |
| Frequency of use | 2 | 5 | A searcher may diligence few live deals; engineering firms issue packages repeatedly. |
| Willingness to pay | 4 | 4 | Both may avoid expensive professional labor and downside, but no Reef buyer evidence exists. |
| Reachable first customers | 4 | 2 | Searchfunder reports 6,498 active members and a concentrated community. No equivalent founder-access channel to engineering QA leaders is established. |
| Sales-cycle length | 4 | 2 | Individual searchers can buy per deal. Engineering firms are likelier to require management, IT, and project approval. |
| Regulatory/liability manageability | 2 | 2 | M&A touches legal and financial judgments; engineering touches safety, compliance, and professional sign-off. |
| Security manageability | 2 | 2 | Deal rooms contain sensitive company data. Engineering packages may contain proprietary, export-controlled, or CUI material. |
| Representative-data availability | 2 | 1 | Searchers may share governed redacted rooms; real engineering packages are also proprietary and may be harder to de-identify. Neither is proven. |
| Fit with DataGate | 3 | 2 | M&A commonly includes CSV/XLSX operating data. Engineering has BOM and verification matrices, but decisive evidence also lives in drawings and domain formats. |
| Evidence/provenance tractability | 4 | 3 | M&A text, tables, and page citations are difficult but bounded. Engineering adds drawings, units, interfaces, and revision authority. |
| Competitive intensity | 1 | 1 | Datasite now provides cited AI diligence; Procore and Autodesk market document conflict, revision, RFI, and submittal intelligence. |
| Differentiation | 2 | 3 | Self-serve searcher focus may sit below enterprise competitors, but this is unverified. Engineering could differentiate on design-side cross-system assurance, also unverified. |
| Founder credibility | 1 | 1 | The repository demonstrates software, data, and UX ability, not M&A or engineering-domain authority. Both need a credible design partner. |
| Time to paid concierge pilot | 4 | 2 | A bounded inventory, gap, and evidence service can be delivered sooner than credible multidisciplinary technical assurance. |
| Recurring-revenue potential | 2 | 5 | Searcher usage is episodic. Engineering reviews repeat across milestones, revisions, projects, and offices. |
| Expansion potential | 4 | 5 | M&A can expand to advisors and portfolio review. Engineering can expand across lifecycle, suppliers, construction, manufacturing, and utilities. |
| Implementation simplicity | 3 | 1 | Both require extraction; engineering requires more multimodal and domain interpretation earlier. |
| **Total / 85** | **49** | **45** | The four-point lead supports validation sequencing, not an irreversible company direction. |

## Alternatives considered

### A. Select M&A and begin implementation

Rejected. Desk evidence supports faster access, not feasibility, willingness to pay,
or trust. Building before package access and paid intent would turn assumptions into
sunk cost.

### B. Select engineering and begin implementation

Rejected. Engineering has the better recurring model and expansion path, but the first
credible deliverable is harder, representative data is less accessible, incumbents are
shipping overlapping functions, and the founder lacks domain authority.

### C. Validate both wedges in parallel

Rejected for now. It doubles recruiting, artifact design, vocabulary, and learning
loops. With one founder, parallel validation would preserve ambiguity.

### D. Declare evidence insufficient and take no position

Rejected as an operating posture. Evidence is insufficient for an irreversible market
commitment, but sufficient to choose which uncertainty to reduce first.

## Current evidence

### Evidence favoring M&A validation

- Stanford's 2024 Search Fund Study covers more than 500 North American search funds,
  confirming an established acquisition model rather than a hypothetical persona.
- Searchfunder publicly reports 6,498 active members, 1,158 acquired companies, and a
  community organized around sourcing, diligence, financing, and operations. This is a
  concrete recruiting channel.
- Searchfunder describes diligence as a granular, multi-pronged process and contains
  current discussion from small teams that may perform commercial diligence themselves.
- DataGate already performs deterministic profiling on tabular operating data, a more
  direct input fit than engineering drawings.
- A manual inventory, request-list gap report, spreadsheet profile, and cited issue
  register can be delivered without replacing counsel, accountants, or quality-of-
  earnings providers.

### Evidence against M&A

- Datasite now markets native semantic search, extraction/comparison, summaries,
  exact-source citations, human review, permission enforcement, audit trails, and AI
  integrations. Evidence-linked diligence alone is not differentiated.
- Datasite says more than 16,000 deals per year run on its platform. Existing VDRs
  possess distribution and the governed data boundary Reef lacks.
- Searchers are episodic users and may lack budget before a live deal.
- Confidential company, employee, legal, financial, and transaction data creates a
  high security bar even for a concierge service.

### Evidence favoring engineering

- The U.S. Census Bureau reports 117,417 employer establishments in architectural,
  engineering, and related services, indicating a large fragmented base.
- Autodesk/FMI research associates poor project data with rework, delays, and change
  orders. NASA and FAA systems-engineering guidance confirms that requirements,
  interfaces, revisions, approvals, and verification traceability are real work.
- The workflow repeats across milestones and revisions, which better supports annual
  revenue and accumulated project memory.

### Evidence against engineering

- Procore advertises agents that cross-check drawings, specifications, contracts,
  RFIs, and submittals, identify coordination issues, and return citations with human
  approval. Autodesk markets specification version comparison, missing-submittal
  detection, model coordination, and AI search.
- DataGate does not understand drawings, CAD/BIM, requirements semantics, units,
  tolerances, interfaces, or professional approval authority.
- NIST guidance shows that engineering drawings, specifications, reports, and software
  may be Controlled Unclassified Information, excluding important defense-adjacent
  customers until a much stronger security posture exists.

## Speculative assumptions

The following are not established facts:

- Searchers will pay an unknown founder instead of using advisors, VDR features, or
  general AI tools.
- Searchers can and will share a redacted representative data room.
- A bounded non-legal issue register saves at least 30% of review time or catches a
  material issue.
- Small-cap rooms are sufficiently consistent to support a reusable checklist.
- Evidence links and abstention are purchase differentiators rather than expected
  hygiene.
- Per-deal demand can expand into repeatable advisor or sponsor revenue.
- Engineering customers are less reachable than searchers for this founder; one warm
  domain relationship could reverse that assumption.

## Selected decision

**Validate M&A diligence first, specifically a buyer-side data-room inventory, gap,
reconciliation, and evidence-register service for active searchers and independent
sponsors.**

This reversible decision authorizes interviews, synthetic fixtures, and paid manual
pilots within `docs/validation/**`. It does not authorize M1 application implementation.

The service must not provide legal, tax, accounting, investment, valuation, quality-of-
earnings, or transaction approval. It organizes evidence, profiles supplied structured
data, identifies defined inconsistencies and missing requested material, and records
human-reviewed issues for the customer's professional team.

## Why engineering was deferred

Engineering was not rejected as a long-term opportunity. It was deferred because the
company has no demonstrated access to representative packages, no engineering domain
reviewer, a larger format and ontology gap, longer likely sales cycles, and strong
incumbent movement directly into the proposed workflow. Its recurrence and expansion
advantages matter only after Reef earns the right to process the data.

Engineering is the first reversal candidate if validation shows stronger buyer access,
package access, and paid intent, or if M&A fails the scorecard.

## Consequences

- Canonical customer, workflow, MVP, pricing hypotheses, and validation documents use
  the M&A wedge.
- `docs/reef/**` remains historical because its conclusions predate this comparison and
  contain unvalidated implementation detail and prices.
- The engineering blueprint is reconciled to M&A; its case remains in this ADR.
- Architecture keeps general evidence primitives, but near-term formats and evaluations
  follow the M&A package.
- The ocean identity remains supporting design, not validation scope.
- M1 is blocked until the scorecard passes and a follow-up ADR records the evidence.

## Risks

1. A reachable online community may not translate into trust or data access.
2. Searchers may use Reef only once, producing poor retention.
3. VDR AI and general assistants may make the deliverable commodity.
4. A founder without transaction credentials may be unable to interpret what matters.
5. Live deal data may require controls that make a fast concierge pilot impractical.
6. The pilot may drift into professional advice despite written limits.

## Validation requirements

Before M1, Reef must meet every mandatory gate in `docs/validation/SCORECARD.md`,
including qualified interviews, repeated measured pain, representative redacted data,
at least two paid pilots, a repeat or referral signal, manageable security objections,
and a narrow check set with evidence-linked output that customers judge useful.

Research must distinguish buyer-side searcher work from legal, financial, tax,
commercial, operational, and technical diligence performed by specialists.

## Reversal triggers

Supersede this ADR or switch validation focus when any occurs:

- fewer than 8 of 15 qualified interviewees report the same narrow repeated pain;
- fewer than 3 share a governed redacted sample package;
- fewer than 2 of 5 qualified prospects pay at least the design-partner price;
- no pilot customer requests a second deal, advisor introduction, or repeat use;
- security requirements prevent a lawful manual pilot within 60 days;
- reports require more than 20 hours of non-repeatable expert work per package after
  the second pilot;
- customers treat the output as interchangeable with existing VDR or AI functions;
- three qualified engineering prospects provide packages and paid intent at materially
  stronger rates than the M&A cohort.

## Sources

- [Stanford GSB: 2024 Search Fund Study](https://www.gsb.stanford.edu/faculty-research/case-studies/2024-search-fund-study)
- [Searchfunder: community and search process](https://searchfunder.com/)
- [Searchfunder: nature of due diligence](https://searchfunder.com/post/on-the-nature-of-due-diligence-in-a-search-fund-acquisition)
- [Datasite: AI capabilities in diligence](https://www.datasite.com/en/resources/faqs/what-ai-capabilities-are-available-within-datasite-diligence)
- [Datasite: AI security and governance](https://www.datasite.com/en/resources/insights/ai-in-dealmaking-demands-a-new-standard-for-security)
- [U.S. Census: NAICS 5413 profile](https://data.census.gov/profile/5413_-_Architectural%2C_engineering%2C_and_related_services?codeset=naics~5413)
- [Autodesk/FMI: data and construction outcomes](https://investors.autodesk.com/news-releases/news-release-details/study-autodesk-and-fmi-finds-better-data-strategies-could-save)
- [Procore: AI agent library](https://www.procore.com/ai/agents)
- [Autodesk AutoSpecs](https://construction.autodesk.com/tools/autospecs-construction-submittal-log/)
- [NASA systems-engineering handbook](https://www.nasa.gov/reference/system-engineering-handbook-appendix/)
- [NIST: protecting CUI](https://csrc.nist.gov/projects/protecting-controlled-unclassified-information)
