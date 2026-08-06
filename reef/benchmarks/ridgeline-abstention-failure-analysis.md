# Ridgeline abstention failure analysis

Investigation only. No engine behaviour was changed, no threshold was tuned, and no
prototype was built. Every number below was produced by the shipped retrieval arms against
room `ridgeline-v2` at commit `442eb8e`, embedding model `BAAI/bge-small-en-v1.5`,
calibrated floor **0.6555**.

Authoritative inputs: [`ridgeline-m1-baseline-v2.json`](ridgeline-m1-baseline-v2.json) —
retrieval recall@12 15/19, held-out abstention 50%, no scalar floor separates answerable
questions from subject-covered-but-fact-absent questions.

---

## Summary of findings

1. **The root cause is a category error, not a bad threshold.** Cosine similarity measures
   topical relatedness. Every failing case is topically related and factually unsupported.
   No monotonic function of a relatedness score can separate "this passage is about debt"
   from "this passage states the terms of an interest rate swap", because the first is true
   of both classes and the second is what was asked.

2. **Three of the four recorded "retrieval misses" are mislabelled.** RDG-009 requires a
   calculation, RDG-015 requires absence detection, RDG-021 requires a register lookup. None
   is producible by retrieval at any threshold. Scoring them as retrieval failures made every
   candidate mechanism look worse than it is and pushed the analysis toward the wrong fix.
   Only RDG-008 is a genuine passage-retrievable target.

3. **A corpus-scope signal is real but insufficient alone.** Counting query terms with zero
   corpus occurrences converts 3 leaks into 1, at the cost of 1 false abstention. It is
   genuinely informative and it is not enough.

4. **No single-signal rule tested is defensible.** Every one trades leaks for false
   abstentions on 23 cases. The sample is far too small to choose between them.

5. **The smallest defensible mechanism is a staged decision producing a structured state**,
   not a binary with a better threshold. It requires a query-decomposition step the engine
   does not have.

6. **Implementation is not justified yet.** See [§5](#5-is-implementation-justified).

---

## 1 · Case-by-case analysis

Columns, for every case: **Sub** = subject present in corpus · **Fact** = requested fact
present · **Abs** = explicit absence evidence exists · **X-doc** = needs cross-document
comparison · **Calc** = needs deterministic calculation · **Passage** = a single directly
responsive passage exists.

`sim` is the best cosine similarity; `lex` is the count of chunks containing every query
term; `zeroDF` is the number of query content terms occurring nowhere in the corpus.

### 1.1 Answerable queries (calibration set, n=10)

| Query | sim | lex | zeroDF | Sub | Fact | Abs | X-doc | Calc | Passage | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| no single customer exceeds 11% of revenue | 0.7550 | 2 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| change of control consent required by customer | 0.7136 | 1 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| covenant compliance fixed charge coverage ratio | 0.7939 | 1 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| accounts receivable aging over 90 days | 0.7440 | 0 | 1 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| employee roster headcount | 0.7838 | 0 | 1 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| largest customer share of FY2025 revenue | 0.7740 | 0 | 1 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| supplier distribution agreement pricing terms | 0.7516 | 0 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| insurance certificate coverage limits | 0.7526 | 0 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| capital expenditure register additions | 0.6789 | 0 | 1 | ✓ | ✓ | – | – | – | ✓ | directly supported |
| owner compensation adjustment | 0.7136 | 2 | 0 | ✓ | ✓ | – | – | – | ✓ | directly supported |

All ten are correctly supported today. **The zero-DF terms here are the important detail**:
`over`, `headcount`, `largest`, `additions` occur nowhere in the corpus, yet all four
questions are answerable. The corpus says "roster" not "headcount", "capex" not "capital
expenditure", and states 22.4% rather than the word "largest". These are *paraphrase gaps*,
not absence. Any mechanism that treats a missing query term as evidence of absence will
falsely abstain on them — which is exactly what the naive rules in §2 do.

### 1.2 Fitted negative queries (used to place the floor, n=6)

Reported for completeness. The floor was placed to separate these, so their passing is
not evidence of anything.

| Query | sim | lex | zeroDF | Sub | Fact | Disposition |
|---|---|---|---|---|---|---|
| what cryptocurrency does the company hold in treasury | 0.6123 | 0 | 2 | ✗ | ✗ | outside corpus scope |
| describe the company's manufacturing operations in Singapore | 0.6080 | 0 | 2 | ✗ | ✗ | outside corpus scope |
| list the company's registered patents in the European Union | 0.6214 | 0 | 3 | ✗ | ✗ | outside corpus scope |
| what dividend was paid to preferred shareholders in fiscal 2022 | 0.6322 | 0 | 3 | ✗ | ✗ | outside corpus scope |
| describe the joint venture with the Osaka subsidiary | 0.6016 | 0 | 4 | ✗ | ✗ | outside corpus scope |
| what were the findings of the environmental remediation order in Nevada | 0.5950 | 0 | 3 | ✗ | ✗ | outside corpus scope |

All six abstain correctly. All six are **outside corpus scope** — the subject itself is
absent. None is a subject-covered case, which is why the fitted set failed to expose the
defect: it never contained the hard class.

### 1.3 Held-out negative queries (never used to fit, n=6)

| Query | sim | lex | zeroDF | Sub | Fact | Abs | Passage | Now | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| employee stock ownership plan vesting schedule | 0.7308 | 0 | 3 | ✓ | ✗ | ✗ | ✗ | **LEAK** | subject covered but fact absent |
| describe the recall of the 2019 product line | 0.6157 | 0 | 2 | ✗ | ✗ | ✗ | ✗ | abstain | outside corpus scope |
| how much did the company spend on television advertising | 0.5810 | 0 | 2 | ✗ | ✗ | ✗ | ✗ | abstain | outside corpus scope |
| what are the terms of the interest rate swap | 0.6650 | 0 | 1 | ✓ | ✗ | ✗ | ✗ | **LEAK** | subject covered but fact absent |
| list the company's subsidiaries incorporated in Delaware | 0.6623 | 0 | 2 | ✓ | ✗ | partial | ✗ | **LEAK** | explicitly contradicted + fact absent |
| what did the pension actuary report for fiscal 2024 | 0.6377 | 0 | 2 | ✗ | ✗ | ✗ | ✗ | abstain | outside corpus scope |

**The three leaks, examined against the corpus:**

- **ESOP vesting schedule** → surfaces `01_Corporate/ownership_schedule.csv`, which is an
  LLC *member* schedule (`member,units,pct`) listing three individuals. Equity ownership is
  covered; an employee stock ownership plan is not. The embedding has no way to represent
  "this is member equity, not an ESOP" — both are ownership.
- **Interest rate swap terms** → surfaces `02_Financial/debt_schedule.csv`, which lists a
  term loan at 7.25% and a revolver at 8.10%, both fixed. Debt instruments and interest
  rates are covered; a swap is not. `swap` is the single decisive absent term, and its
  absence is the entire answer.
- **Delaware subsidiaries** → surfaces `request_list.csv`. The Articles of Organization
  state **"State of Ohio"** and name a single LLC with no subsidiaries. This case is
  *stronger* than absence: the corpus contradicts the jurisdiction premise. A design with
  only SUPPORTED/ABSTAIN cannot express that, which is why the contract in
  [`ABSTENTION_RESULT_CONTRACT.md`](ABSTENTION_RESULT_CONTRACT.md) needs `CONTRADICTED`.

All three leaks share one structure: **a high-frequency subject term retrieves a topically
adjacent document, and the discriminating term is absent.**

### 1.4 The four recorded retrieval misses

| id | Title used as query | sim | zeroDF | Passage | X-doc | Calc | Abs | Correct disposition |
|---|---|---|---|---|---|---|---|---|
| RDG-008 | Single-supplier dependency with 60-day termination | 0.6987 | 2 | ✓ | – | – | – | **directly supported** — genuine retrieval target |
| RDG-009 | Unbilled work in process grew far faster than revenue | 0.6488 | 3 | ✗ | ✓ | ✓ | – | **requires deterministic calculation** |
| RDG-015 | Referenced Exhibit B absent from baseline room | 0.5735 | 4 | ✗ | ✓ | – | ✓ | **explicitly absent** — the finding *is* the gap |
| RDG-021 | Tax support archive cannot be opened | 0.6800 | 3 | ✗ | – | – | ✓ | **invalid evaluation expectation** |

**RDG-021 is unretrievable by construction.** Its source is the encrypted ZIP, which has
zero chunks — intake registered it as `unsupported` with an actionable reason and it was
never extracted. No retrieval mechanism can return it at any rank or any threshold. The
correct answer lives in the coverage register, which the engine already produces correctly.
Scoring it as retrieval recall is a label error in the harness.

**RDG-015 is an absence.** Nothing in the corpus says "Exhibit B is missing"; the Hartwell
agreement incorporates Exhibit B by reference and the exhibit is not present. The finding is
the gap between a reference and an inventory. Retrieval can surface the *reference* — and
does, at 0.5735, below the floor — but the conclusion requires comparing that reference
against the register.

**RDG-009 requires arithmetic** across two documents. Retrieval can supply both operands; it
cannot produce the comparison.

**Only RDG-008 is a genuine miss.** Its title contains coined compounds — `single-supplier`,
`dependency` — that appear nowhere in the corpus and that no reviewer would type. It is
plausibly an artifact of scoring recall by finding title, which the v2 benchmark already
flags as a generous proxy.

### 1.5 Distribution summary

| Set | n | sim range | zeroDF range |
|---|---|---|---|
| Answerable | 10 | 0.6789 – 0.7939 | 0 – 1 |
| Negative (fitted) | 6 | 0.5950 – 0.6322 | 2 – 4 |
| Negative (held-out) | 6 | 0.5810 – 0.7308 | 1 – 3 |

The held-out negatives reach **0.7308**, inside the answerable range. Fitted separation
+0.0467; held-out separation **−0.0520**. No floor exists.

---

## 2 · Comparison of minimal designs

All rules evaluated over the same 23 cases, with corrected labels: **support** = should
return evidence (10 answerable + RDG-008); **abstain** = should refuse (12 negatives).
RDG-009/015/021 are excluded because no retrieval mechanism can satisfy them — including
them measures the label error, not the design.

| Rule | Support | Abstain | Leaks | False abstentions |
|---|---|---|---|---|
| **A** — similarity floor only (current) | 11/11 | 9/12 | **3** | 0 |
| term coverage ≥ 0.5 | 9/11 | 9/12 | 3 | 2 |
| term coverage ≥ 0.3 | 10/11 | 8/12 | 4 | 1 |
| zero-DF ≤ 1 | 10/11 | 11/12 | **1** | 1 |
| zero-DF ≤ 1 **and** sim ≥ floor | 10/11 | 11/12 | **1** | 1 |
| zero-DF ≤ 2 **and** sim ≥ floor | 11/11 | 10/12 | 2 | 0 |

### A · Retrieval-only threshold — **rejected, retained as documented baseline**

Fails because similarity is a relatedness measure and every failure is related-but-
unsupported. The failure is not calibration error: §1.5 shows the distributions overlap, so
no value exists. Retained in the benchmark as the documented baseline and as the reason the
other designs are being considered.

### B · Query decomposition plus evidence-element requirements — **necessary ingredient**

Decompose the query into required elements (entity, attribute, period, document type, value,
relationship), then check the retrieved evidence contains them.

The zero-DF probe is the cheapest possible approximation: it treats every content term as a
required element and checks corpus presence via the existing FTS index. Local, deterministic,
no model, one indexed query.

**It converts 3 leaks into 1** — and that single survivor is instructive. "interest rate
swap" has zero-DF = 1 because only `swap` is absent; `interest` and `rate` are present in
the debt schedule. A count-based rule cannot see that `swap` is the *head* term and the
other two are modifiers.

**The naive form is not viable**, and §1.1 shows why: `headcount`, `largest`, `additions`
and `over` are zero-DF in *answerable* queries. Treating term absence as fact absence
falsely abstains on paraphrase. Distinguishing "the corpus lacks this concept" from "the
corpus words it differently" requires knowing which terms are discriminating — that is the
decomposition step, and a stopword list does not provide it.

**Verdict:** the right shape. Needs a real element extractor (local POS/NER pass, or a
constrained model call). Not implementable today without adding a component.

### C · Entailment / support classification — **rejected for now, revisit after B**

Classify (query, evidence) as supports / contradicts / related-but-insufficient /
irrelevant. This directly names the classes that are being confused, and it is the only
approach that natively produces `CONTRADICTED` — which the Delaware case needs.

Rejected for now on three grounds. A local NLI model is a second model with its own
calibration problem, and this investigation exists because an uncalibrated model swap broke
a gate silently. Entailment models are trained on sentence pairs and degrade on tabular
rows, which are the majority of this corpus (724 of 862 chunks are table rows). And its
output would itself need a threshold, reintroducing the problem one layer up.

Revisit once B provides structured elements, where entailment would operate on a much
narrower question.

### D · Answerability classifier — **rejected**

A learned classifier over retrieval scores, metadata coverage and evidence features.

Rejected on data grounds alone: 23 labelled cases, 6 of them held out. Training any
classifier on this would fit the fixture, and its apparent accuracy would be a restatement
of the labels. It also inverts the evidence relationship — a learned score is harder to
explain to a reviewer than "the corpus does not contain the word *swap*", and explainability
is the product.

Revisit only with hundreds of labelled real queries, which requires `D1` and `L1`.

### E · Rule-based evidence contracts — **rejected as a general mechanism**

Per-query-class structured requirements (matching column, document category, date range,
exact entity, corroborating sources).

Where it generalises: format-level requirements that are not domain claims — "a numeric
answer must cite a table cell", "a period-qualified question must cite a document covering
that period". These are properties of evidence, not of M&A.

Where it stops: the moment a rule names a document category ("customer concentration must
cite a revenue-by-customer schedule"), it is diligence findings logic wearing a retrieval
costume. It would encode the answer key into the retriever, and ADR-003 §4 does not
authorize a findings layer.

**Verdict:** the format-level subset is admissible later as part of F stage 2. The
class-specific subset is out of scope and should be recognised as findings logic when it is
eventually built.

### F · Hybrid staged decision — **recommended shape**

```
1  retrieve            hybrid vector + lexical, unchanged
2  corpus scope        are the query's discriminating elements present in the corpus at all?
3  element coverage    do the retrieved chunks contain the asked-for attribute, not just the subject?
4  structured state    emit a state + reason + citations, never a bare boolean
```

Stage 2 is the zero-DF probe generalised by B. Stage 3 is what separates
`SUBJECT_PRESENT_FACT_ABSENT` from `SUPPORTED`. Stage 4 is the contract in
[`ABSTENTION_RESULT_CONTRACT.md`](ABSTENTION_RESULT_CONTRACT.md).

This is the smallest design that can express all five required distinctions, because the
distinctions are *different questions about evidence*, not different points on one axis:

| Required distinction | Decided at |
|---|---|
| Evidence directly supporting the fact | stage 3 — attribute present in a cited chunk |
| Related to subject, not supporting the fact | stage 3 — subject present, attribute absent |
| Evidence the item is absent | stage 2 + register — referenced but not inventoried |
| Insufficient to decide | stage 3 — partial coverage, low agreement |
| Outside corpus scope | stage 2 — subject absent from the corpus |

**Verdict: recommended, and not yet implementable.** Stage 3 depends on B.

---

## 3 · Root cause

Stated once, plainly:

> The engine answers "is this passage about the same topic as the question?" and the product
> needs "does this passage state the fact the question asked for?". Those are different
> questions, and no threshold over the first can answer the second.

The floor was never the defect. It was a scalar proxy standing in for a missing distinction,
and it worked on the fitted negatives only because every one of them was out-of-scope — the
easy class. The held-out set contained the hard class for the first time, and the proxy
failed immediately.

A secondary root cause is in the evaluation, not the engine: **the retrieval harness scores
findings that retrieval cannot produce.** Three of four misses are calculation, absence and
register cases. That mislabelling made the current design look worse and would have driven a
fix in the wrong direction.

---

## 4 · Evaluation plan

Three disjoint sets, no reuse.

| Set | Purpose | Current n | Required n |
|---|---|---|---|
| Calibration | fit any parameter | 10 answerable + 6 negative | ≥ 40 / ≥ 40 |
| Development | iterate on the mechanism | **0 — does not exist** | ≥ 30 / ≥ 30 |
| Held-out | reported once, never tuned against | 6 negative | ≥ 40, incl. ≥ 15 subject-present-fact-absent |

**The development set does not exist**, which is why any mechanism built today would be
tuned directly against the held-out set and reported as held-out. That is the specific
error this task forbids.

Metrics to report, none of which are meaningful at n=23:

- supported-query recall; abstention precision; abstention recall
- false-support rate; false-abstention rate
- **Critical/High false-support count** — hard gate at zero
- calibration size; development size; held-out size
- Wilson 95% intervals on every rate, or an explicit small-sample warning

At n=6 held-out, the Wilson 95% interval on the current 50% abstention rate is roughly
**19%–81%**. Every rule in §2 sits inside every other rule's interval. **No design comparison
in this document is statistically meaningful**; the ranking is a description of 23 cases, not
evidence about the mechanisms.

Unchanged hard gates: zero fabricated citations, zero unlabeled inference.

---

## 5 · Is implementation justified?

**No. Not yet.** Four blockers, in order:

1. **No development set.** Building against held-out data and reporting it as held-out is
   the failure mode this investigation was told to avoid.
2. **Stage 3 needs a component that does not exist.** The naive zero-DF form falsely
   abstains on paraphrase (§1.1). The viable form needs element extraction, which is a new
   capability, not a correctness repair.
3. **The sample cannot distinguish the candidates.** §4: every interval overlaps.
4. **The evaluation labels are wrong for 3 of 4 misses.** Fixing the harness must precede
   optimising against it, or the next mechanism is tuned to reproduce a label error.

The gate criterion was "materially improves held-out abstention without reducing
answerable-query support and without fixture-specific rules". The best candidate
(zero-DF ≤ 1 ∧ sim ≥ floor) reduces answerable support 11/11 → 10/11 and leaves one leak.
It does not clear the bar.

### Recommended order

1. Correct the harness: reclassify RDG-009, RDG-015, RDG-021 out of retrieval recall.
   Documentation and scoring only.
2. Run the [cold review](ABSTENTION_COLD_REVIEW_PROTOCOL.md) to obtain queries and labels
   from someone who has not seen the answer key.
3. Build development and held-out sets from that review, with the subject-present-fact-absent
   class deliberately represented.
4. Only then implement F stages 2–4 against the development set.

Until then the honest position is the one the v2 benchmark already records: **the engine has
no reliable abstention**, and that must be stated wherever results are shown.

---

## 6 · What was not done

No engine behaviour changed. No threshold tuned. No prototype built. No findings layer, no
LLM answer generation, no agents, no knowledge graph, no cloud calls, no customer-facing
conclusions. The only artifacts are this document, the result contract, and the cold-review
protocol.
