# Abstention cold-review protocol

A procedure for a second reviewer who has **not** seen the fixture's answer key to produce
queries, labels and scores independently.

This protocol tests two things at once. The obvious one is whether the engine abstains
correctly. The less obvious one, and the reason it is worth the reviewer's time, is
**whether the evaluation is understandable and reproducible by someone who did not build
it.** If the reviewer cannot follow it, the problem is the evaluation.

Every query set, every label and every threshold in this repository was written by the party
that also wrote the fixture and the engine. `SCORECARD.md` names that conflict for market
evidence. It applies at least as strongly here, and one error has already survived a full
verification pass, two commits and a written report before a routine trace caught it.

---

## Who can do this

Anyone who can read business documents. Diligence experience is **not** required and is
mildly counterproductive for the first pass — a reviewer who knows what a data room usually
contains will unconsciously ask about things they expect rather than things they see.

**Disqualifying:** having read `ground-truth.json`, `GROUND_TRUTH.md`,
`fixtures/reef-deal-room/README.md`, `outputs/`, `SYNTHETIC_DEAL_ROOM_SPEC.md`,
`DEAL_ROOM_EVAL.md`, or either benchmark record. Reading `reef/README.md` is fine.

Budget roughly three hours.

---

## What the reviewer must not see, and when

| Artifact | Before | After |
|---|---|---|
| `fixtures/reef-deal-room/00_`–`12_` document folders | **required** | — |
| `ground-truth.json`, `GROUND_TRUTH.md` | forbidden | permitted |
| `fixtures/reef-deal-room/README.md` | forbidden — states the finding counts | permitted |
| `fixtures/reef-deal-room/outputs/` | forbidden — contains the worked answers | permitted |
| `docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md` | forbidden | permitted |
| `docs/evaluation/DEAL_ROOM_EVAL.md` | forbidden | permitted |
| `benchmarks/*.json`, `ridgeline-abstention-failure-analysis.md` | forbidden | permitted |
| `ABSTENTION_RESULT_CONTRACT.md` | **required** — the reviewer labels in these states | — |
| `reef/README.md` | permitted | — |

Prepare a clean checkout with the forbidden paths removed rather than relying on
self-discipline:

```bash
git worktree add /tmp/reef-cold-review reef/m1-embedding-contract-fix
cd /tmp/reef-cold-review
rm -rf fixtures/reef-deal-room/ground-truth.json \
       fixtures/reef-deal-room/GROUND_TRUTH.md \
       fixtures/reef-deal-room/README.md \
       fixtures/reef-deal-room/outputs \
       docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md \
       docs/evaluation/DEAL_ROOM_EVAL.md \
       reef/benchmarks
```

Deleting `reef/benchmarks` removes this file too. Print it, or keep it open from the
original checkout.

---

## Phase 1 — Inspect the corpus (45 min)

Read the folder tree and open enough documents to know what the package covers. Do not use
the engine yet; searching first anchors the questions to what the retriever surfaces, which
is the thing under test.

Record, in your own words:

- what kinds of documents are here, by folder;
- what subjects appear substantively covered;
- what subjects appear touched but thin;
- anything referenced that you cannot find;
- anything you could not open.

The last two matter most. They are the `EXPLICITLY_ABSENT` and coverage-register cases, and
a reviewer who notices them unprompted is evidence the states are natural rather than
invented to fit the fixture.

---

## Phase 2 — Write queries (60 min)

Write **40 questions minimum**, phrased as a buyer's analyst would type them — not as
document titles. Scoring by title is a known generous proxy and this review is partly meant
to test it.

Target distribution:

| Class | Count | Description |
|---|---|---|
| Answerable | 15 | You have seen the answer in a document. |
| Subject present, fact absent | 10 | The package covers the subject; you could not find this specific attribute. |
| Out of scope | 8 | The package says nothing about this subject at all. |
| Explicitly absent | 3 | A document references something not in the package. |
| Requires comparison or calculation | 4 | Needs two sources, or arithmetic. |

**The 10 subject-present-fact-absent questions are the point of this exercise.** The
original negative set contained none, which is why it failed to detect the defect. Aim for
questions where an obvious document exists and does not answer the question.

Do not look at the engine while writing. Do not adjust a question because the engine handles
it badly — that is tuning, and it destroys the set's value.

Write each as one line in `cold-review-queries.csv`:

```
query,expected_state,why,supporting_document,notes
```

`expected_state` must be one of the states in `ABSTENTION_RESULT_CONTRACT.md`. `why` is one
sentence in your own words. Leave `supporting_document` blank where none exists.

**Commit this file before running the engine**, so the labels are demonstrably pre-registered:

```bash
git add cold-review-queries.csv && git commit -m "cold review: pre-registered queries and labels"
```

---

## Phase 3 — Run the engine (20 min)

```bash
cd reef
uv sync --frozen --all-extras --all-groups
./ops/bootstrap-local-db.sh
uv run alembic upgrade head
uv run reef config                      # record this output verbatim
uv run reef ingest ../fixtures/reef-deal-room --room cold-review
uv run reef query "<each query>" --room cold-review
```

Record the `reef config` output. If `dotenv` reports anything other than "none present",
**stop and report it** — a hidden `.env` is the exact fault that invalidated the first
benchmark, and finding a second one would be a more valuable result than the review.

For each query record: outcome, detail, top three documents with locators, and top score.

The engine currently returns only `found` / `not_found_in_corpus`. Map to the contract's
states yourself when scoring; the collapse from nine states into two is itself a finding, and
noting where the mapping is impossible is useful output.

---

## Phase 4 — Score (30 min)

For each query: **correct**, **false support** (returned evidence for something the corpus
does not support), or **false abstention** (refused something answerable).

Then compute, per class and overall:

- supported-query recall; abstention precision; abstention recall
- false-support rate; false-abstention rate
- **false supports on questions you would have escalated** — the analogue of the
  Critical/High gate, judged by you, not by the fixture's severities

Report **Wilson 95% intervals** on every rate. At n=40 the intervals are wide; at the
original n=6 they spanned 19%–81%. Reporting a bare percentage from a set this size is the
error, not the width of the interval.

---

## Phase 5 — Unseal and reconcile (30 min)

Only now read `ground-truth.json`, both benchmark records, and the failure analysis.

Record:

1. **Where your labels and the ground truth disagree**, and which you think is right. The
   ground truth is not automatically correct — three of four recorded "retrieval misses"
   were mislabelled, and it took an outside trace to notice.
2. **Which planted findings you never thought to ask about**, and whether that is a fixture
   realism problem or a reviewer-attention problem.
3. **Which of your questions the fixture cannot support**, indicating a coverage gap.
4. **Whether the nine states in the contract were sufficient**, and which you wanted and did
   not have.
5. **Anything in this protocol that was ambiguous.** Reproducibility of the evaluation is
   half of what is being tested.

---

## Phase 6 — Report

Write `cold-review-<initials>-<date>.md` containing: your corpus notes; the pre-registered
query file and its commit hash; the `reef config` output; per-query results; the metrics with
intervals; the reconciliation; and a one-paragraph judgement on whether the engine's
abstention behaviour is trustworthy enough to show a customer.

**Disagreement is the valuable output.** Agreement from a reviewer who read the author's
reasoning first is worth very little, which is why the sealed order above is not optional.

---

## How the results get used

- The 40 queries become **development** and **held-out** sets, split by the reviewer and
  disclosed only after the split is fixed. The authors do not choose the split.
- Only the development set may be used to build or tune any mechanism.
- Held-out queries are scored once, reported, and never used to iterate. A mechanism tuned
  against them and reported as held-out is the specific error
  [`ridgeline-abstention-failure-analysis.md`](ridgeline-abstention-failure-analysis.md) §5
  identifies as the blocker on implementation.
- Disagreements from Phase 5 amend the harness before any mechanism work starts.

---

## Explicitly out of scope

The reviewer is not asked to assess market demand, pricing, willingness to pay, or whether
anyone would buy this. Those are `L1`, `D1`, `N1` and `PAY1`, they are answered by
interviews and counsel rather than by a corpus, and they remain the binding constraints on
the product regardless of how this review turns out.
