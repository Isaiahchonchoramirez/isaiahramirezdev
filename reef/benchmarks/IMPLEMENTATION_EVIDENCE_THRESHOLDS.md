# Implementation evidence thresholds

What evidence would justify building each candidate abstention mechanism. Written **before**
any of them is built and before the cold review runs, so the bar is fixed in advance rather
than discovered to have been met.

This is the same anti-gaming discipline `SCORECARD.md` applies to market evidence: a
threshold set after seeing the result is not a threshold. No winner is selected here.

Candidates are described in
[`ridgeline-abstention-failure-analysis.md`](ridgeline-abstention-failure-analysis.md) §2.

---

## Thresholds that apply to every candidate

Non-negotiable, and independently sufficient to reject:

| Requirement | Value |
|---|---|
| Fabricated citations | **0** |
| Unlabeled inference | **0** |
| Escalation-worthy false supports | **0** |
| Development and held-out sets disjoint | required |
| Held-out scored **once**, never iterated against | required |
| Mechanism must not encode a document category or deal-domain rule | required — that is class 10 |
| Must be reproducible from a clean checkout by the cold reviewer | required |

**Answerable-query support must not regress.** Any candidate that improves abstention by
refusing more real questions has moved the failure, not fixed it.

---

## Per-candidate table

### 1 · Zero-DF corpus-scope signal

Count query terms with zero corpus occurrences; treat a high count as out-of-scope.

| | |
|---|---|
| Min development set | 60 queries (30 support / 30 abstain) |
| Min held-out set | 40 queries, ≥15 subject-present-fact-absent |
| Max false-support rate | ≤ 10% |
| Max false-abstention rate | ≤ 5% |
| Independent reviewers | 1 |
| Table-specific requirement | Must be measured separately on table-row queries; 724 of 862 chunks are rows and term statistics behave differently there |
| Calibration | The count threshold is a parameter and needs a model-bound record like the similarity floor |
| **Reject if** | It falsely abstains on paraphrase. Already observed: `headcount`, `largest`, `additions`, `over` are zero-DF in answerable questions because the corpus says *roster*, *capex*, *22.4%*. Reject unless a decomposition step separates vocabulary gaps from factual gaps. |

Currently **failing its own reject condition** at n=23. It converts 3 leaks into 1 and costs
one answerable query.

### 2 · Query element coverage

Decompose into required elements (entity, attribute, period, document type, value,
relationship); verify retrieved evidence contains them.

| | |
|---|---|
| Min development set | 80 queries (40/40) |
| Min held-out set | 40, ≥15 subject-present-fact-absent |
| Max false-support rate | ≤ 5% |
| Max false-abstention rate | ≤ 5% |
| Independent reviewers | 2 — element extraction is subjective and one reviewer's decomposition is not evidence |
| Table-specific requirement | Element matching against a row must respect column semantics; matching a value to the wrong column is a false support that looks correct |
| Calibration | Per-element-type coverage thresholds, model-bound if the extractor is a model |
| **Reject if** | The extractor needs a model whose failure modes are not independently calibrated — that reintroduces the uncalibrated-model defect one layer up. Or if extraction agreement between the two reviewers is below 80%, which would mean the elements are not well defined. |

The recommended shape's necessary ingredient. Not implementable today: no extractor exists.

### 3 · Local support / entailment model

Classify (query, evidence) as supports / contradicts / related-but-insufficient / irrelevant.

| | |
|---|---|
| Min development set | 150 labelled (query, evidence) pairs |
| Min held-out set | 80 pairs, ≥30 on table rows |
| Max false-support rate | ≤ 3% |
| Max false-abstention rate | ≤ 8% |
| Independent reviewers | 2, with inter-annotator agreement reported |
| Table-specific requirement | **Blocking.** Entailment models are trained on prose sentence pairs. Must be measured separately on table rows and must not degrade more than 10 points versus prose, or it is unusable on this corpus |
| Calibration | A full model-bound record like the embedding model: identity, version, score distributions, held-out validation. The compatibility contract applies to it too |
| **Reject if** | It is a second uncalibrated model. Or if its output needs its own threshold with the same overlapping distributions — that would relocate the problem, not solve it. |

The only candidate that natively produces `CONTRADICTED`, which the Delaware case needs.

### 4 · Answerability classifier

Learned over retrieval scores, metadata coverage, evidence features.

| | |
|---|---|
| Min development set | **500 labelled queries** |
| Min held-out set | 200, from ≥2 corpora |
| Max false-support rate | ≤ 3% |
| Max false-abstention rate | ≤ 5% |
| Independent reviewers | 2, plus a corpus not written by the authors |
| Table-specific requirement | Stratified performance by chunk granularity |
| Calibration | Full training provenance: data, features, version, and a held-out set never seen during selection |
| **Reject if** | Trained on a single fixture. Or if its decisions cannot be explained to a reviewer in one sentence — explainability *is* the product here, and "the classifier scored 0.42" is not a citation. |

Requires roughly 20× the labelled data that exists. Blocked behind `D1`.

### 5 · Format-level evidence contracts

Structural requirements that are not domain claims: a numeric answer must cite a table cell;
a period-qualified question must cite a document covering that period.

| | |
|---|---|
| Min development set | 40 queries |
| Min held-out set | 30 |
| Max false-support rate | ≤ 8% |
| Max false-abstention rate | ≤ 5% |
| Independent reviewers | 1 |
| Table-specific requirement | This candidate is *mostly* a table-handling mechanism; ≥20 held-out table queries |
| Calibration | None — the rules are structural, not scored |
| **Reject if** | Any rule names a document category or a deal concept. "Customer concentration must cite a revenue-by-customer schedule" is findings logic in a retrieval costume and belongs to class 10. |

The cheapest candidate and the narrowest. Cannot address subject-present-fact-absent on
prose, which is the actual failure.

### 6 · Staged hybrid

Retrieval → corpus scope → element coverage → structured state.

| | |
|---|---|
| Min development set | 80 queries (40/40) — the union of its stages' needs |
| Min held-out set | 40, ≥15 subject-present-fact-absent, ≥15 table-backed |
| Max false-support rate | ≤ 5% |
| Max false-abstention rate | ≤ 5% |
| Independent reviewers | 2 |
| Table-specific requirement | Each stage measured separately on rows; a stage that only works on prose must say so rather than being averaged into a single number |
| Calibration | Per-stage, each model-bound; the abstention floor stays where it is |
| **Reject if** | Stages cannot be evaluated independently. A pipeline whose stages are only measurable end-to-end cannot be debugged, and the one thing this project has learned twice is that an unmeasurable component fails silently. |

The recommended shape. Its threshold is the union of stages 1 and 2 plus a state-assignment
requirement, which is why it needs the most evidence and is listed last.

---

## Current position against every threshold

| Requirement | Have | Need (cheapest candidate) |
|---|---|---|
| Development set | **0** | 40 |
| Held-out set | 6, **contaminated** | 30 |
| Independent reviewers | **0** | 1 |
| Table-specific evaluation | none | 20 queries |
| Corpora | 1 synthetic | 1 (2 for candidate 4) |

**No candidate is close.** The binding shortage is labelled queries from someone other than
the author, which is exactly what the cold review produces. That is why it is the next step
and why no mechanism should be built before it.

---

## Held-out contamination

The six held-out negatives in `evaluate.ABSTENTION_HELDOUT_QUESTIONS` have now been inspected
repeatedly: scored, traced per-query, decomposed into terms, and used to compare six candidate
rules.

**They are marked diagnostic-only.** They may be reported as a historical measurement and
must not be used to validate any new mechanism. Doing so would report fitted-set performance
as generalisation, which is the precise error
[`ridgeline-abstention-failure-analysis.md`](ridgeline-abstention-failure-analysis.md) §5
names as the blocker.

They were not rewritten and no difficult case was moved out of the set. The set stands as
written; only its status changed. A genuinely blind replacement comes from the cold review,
and the reviewer chooses the split so the authors cannot.
