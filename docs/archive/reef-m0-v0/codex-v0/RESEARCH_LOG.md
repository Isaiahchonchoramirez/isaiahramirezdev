> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/RESEARCH_LOG.md`](../../../validation/RESEARCH_LOG.md)
> **Superseded because:** Adopted largely intact; desk research entries R-001..R-008 are the only sourced evidence Reef has.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Research log

## Purpose

This is the evidence ledger for ADR-001 and the M1 scorecard. Keep observed facts,
participant statements, interpretations, and decisions separate. Never paste customer
documents, confidential deal facts, personal data, credentials, or privileged material
into this repository.

## Evidence levels

| Level | Meaning | Can satisfy customer/payment gates? |
| --- | --- | --- |
| E0 | Founder belief or document hypothesis | No |
| E1 | Public primary/credible source | No; establishes market context only |
| E2 | Qualified interview about a recent real task | Interview and pain gates only |
| E3 | Governed artifact or observed workflow | Workflow/data-access gates |
| E4 | Signed agreement, deposit, completed payment, or observed external use | Payment/commitment/use gates |
| E5 | Repeat purchase, second project, or qualified channel behavior | Recurrence/expansion gates |

## Desk research entries

### R-001 — Search fund ecosystem exists

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Source:** [Stanford GSB 2024 Search Fund Study](https://www.gsb.stanford.edu/faculty-research/case-studies/2024-search-fund-study)
- **Observed fact:** The study reports on North American search funds since 1984 with
  data through 2023; Stanford's highlights say it analyzed more than 500 funds.
- **Interpretation:** Search funds are an established acquisition model.
- **Does not prove:** reachable Reef buyers, live deal frequency, data access, pain,
  willingness to pay, or product fit.
- **Hypotheses informed:** C1, C2, R1.

### R-002 — Concentrated recruiting channel

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Source:** [Searchfunder](https://searchfunder.com/)
- **Observed fact:** Searchfunder publicly reports 6,498 active members, 1,158 acquired
  companies, and $3B+ raised; it describes itself as a community for searchers,
  investors, lenders, brokers, and advisors.
- **Interpretation:** The wedge has a specific channel for interview recruiting.
- **Does not prove:** members will respond, trust Reef, share data, or buy.
- **Hypotheses informed:** C1, C2, PAY1.

### R-003 — Diligence is multi-pronged and bespoke

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Source:** [Searchfunder: nature of due diligence](https://searchfunder.com/post/on-the-nature-of-due-diligence-in-a-search-fund-acquisition)
- **Observed fact:** The source describes diligence as granular, multi-pronged,
  multi-month, and customized to the target, with common core components and specialist
  advisors.
- **Interpretation:** A generic “complete diligence memo” is not a credible first scope.
- **Does not prove:** request-list reconciliation is the correct narrow workflow.
- **Hypotheses informed:** W1, P1, T2.

### R-004 — M&A incumbent capability is strong

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Sources:** [Datasite AI capabilities](https://www.datasite.com/en/resources/faqs/what-ai-capabilities-are-available-within-datasite-diligence), [Datasite AI Q&A](https://www.datasite.com/en/resources/faqs/how-does-datasite-ai-help-with-due-diligence-q-a)
- **Observed fact:** Datasite markets semantic search, extraction/comparison, summaries,
  exact document/section citations, human review, permissions, and related-question
  workflows.
- **Interpretation:** Evidence-linked document Q&A is table stakes, not a moat.
- **Does not prove:** small searchers use or can afford these functions.
- **Hypotheses informed:** W1, A1, competitive displacement.

### R-005 — M&A security bar

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Source:** [Datasite AI security](https://www.datasite.com/en/resources/insights/ai-in-dealmaking-demands-a-new-standard-for-security)
- **Observed fact:** Datasite emphasizes permission inheritance, controlled
  environments, audit trails, redaction, regional processing, and zero-data-retention
  configurations; it says 16,000+ deals/year run on the platform.
- **Interpretation:** Reef cannot treat an NDA and ordinary file upload as sufficient
  security evidence.
- **Does not prove:** the first target buyer requires Datasite-level controls.
- **Hypotheses informed:** S1, D1.

### R-006 — Engineering market and workflow evidence

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Sources:** [U.S. Census NAICS 5413](https://data.census.gov/profile/5413_-_Architectural%2C_engineering%2C_and_related_services?codeset=naics~5413), [NASA systems-engineering handbook](https://www.nasa.gov/reference/system-engineering-handbook-appendix/)
- **Observed fact:** Census reports 117,417 employer establishments in architectural,
  engineering, and related services. NASA guidance defines requirements verification,
  bidirectional traceability, interface documents, revision authority, and verification
  work products.
- **Interpretation:** Engineering package assurance addresses a real repeatable workflow
  and remains a credible fallback.
- **Does not prove:** Reef can access buyers/data or outperform existing tools.
- **Hypotheses informed:** ADR reversal condition.

### R-007 — Engineering incumbent capability is strong

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Sources:** [Procore AI agents](https://www.procore.com/ai/agents), [Autodesk AutoSpecs](https://construction.autodesk.com/tools/autospecs-construction-submittal-log/)
- **Observed fact:** Procore markets cross-document conflict/gap checks, drawing
  analysis, submittal review, cited search, and human approval. Autodesk markets
  specification extraction, missing-submittal suggestions, and version comparison.
- **Interpretation:** The engineering wedge is not an uncontested opening.
- **Does not prove:** design-side cross-system assurance is fully solved.
- **Hypotheses informed:** ADR competitive score and reversal conditions.

### R-008 — Engineering security constraints

- **Date accessed:** 2026-08-05
- **Level:** E1
- **Source:** [NIST CUI guidance](https://csrc.nist.gov/projects/protecting-controlled-unclassified-information)
- **Observed fact:** NIST defines security requirements for CUI; related NIST guidance
  lists engineering drawings, specifications, manuals, reports, and software as possible
  CUI.
- **Interpretation:** Defense-adjacent engineering cannot be an easy early segment.
- **Does not prove:** commercial engineering packages require the same controls.
- **Hypotheses informed:** ADR security and data-access scores.

## Interview entry template

Copy once per participant using a non-identifying ID.

```markdown
### I-XXX — role, qualified/not qualified

- Date:
- Evidence level: E2 / E3 / E4 / E5
- Role and deal-stage band:
- Qualification basis:
- Consent and quote permission:
- Most recent workflow facts:
- Artifacts observed (description only; no content):
- Hands-on time by covered task:
- Failure/rework event and measured consequence:
- Current tools/alternatives:
- Buying authority and approval path:
- Security/data-access requirement:
- Commitment ladder reached, owner, and date:
- Direct quotes (non-confidential):
- Contradictory/disconfirming evidence:
- Hypotheses updated:
- Researcher interpretation (separate from facts):
```

## Offer and pilot entry template

```markdown
### P-XXX — offer/pilot

- Date and qualified customer ID:
- Offer tier and price:
- Scope and package metrics:
- Security/legal gate result:
- Signed date / deposit / balance:
- Baseline covered-task hours:
- Reef operator hours and turnaround:
- Finding counts by class and accepted/rejected:
- Anchor evaluation sample and result:
- Time saved calculation:
- External workflow use observed:
- Repeat/referral commitment:
- Customer corrections and negative feedback:
- Data deletion confirmation/date:
- Scorecard rows affected:
```

## Scorecard snapshot template

Do not fill this from memory. Link each status to entry IDs.

| Measure | Status | Evidence IDs | Notes |
| --- | --- | --- | --- |
| Qualified interviews | Not started | — | — |
| Repeated pain | Not started | — | — |
| Hours per package | Not started | — | — |
| Rework/delay cost | Not started | — | — |
| Redacted package access | Not started | — | — |
| Willingness to test | Not started | — | — |
| Willingness to pay | Not started | — | — |
| Security objections | Not started | — | — |
| Project frequency | Not started | — | — |
| Referral willingness | Not started | — | — |
| Competitive displacement | Not started | — | — |
| Delivery/technical gates | Not started | — | — |

## Research integrity rules

1. Log negative evidence with the same detail as supportive evidence.
2. Do not count multiple people describing the same deal as independent deal evidence.
3. Do not count hypothetical interest as commitment.
4. Do not count a free pilot as willingness to pay.
5. Do not count synthetic data as customer access or usefulness.
6. Do not paste live deal artifacts or confidential excerpts into Git.
7. Do not revise pass/fail thresholds during the cycle; use ADR-002 to explain any
   justified threshold change after seeing the complete evidence.
