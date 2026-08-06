# Adjudication protocol

How disagreements between the reviewer's labels and the fixture's ground truth are settled
**after** the reviewer's results are frozen.

## The failure this prevents

An author sees a failure, decides the question was unfair, relabels it, and reports an
improved score. Every step feels reasonable and the result is a benchmark that measures the
author's tolerance for its own errors.

The control is ordering, and it is not negotiable.

## Freeze

Results are frozen when the reviewer has committed `cold-review-results.json` and
`cold-review-observations.md`. Record the commit hash. **Nothing in either file may change
afterwards.** Corrections are appended as a separate, dated addendum that states what changed
and why.

Only after the freeze may the reviewer read ground truth, prior benchmarks, or the author's
classifications.

## Roles

| Role | Who | May |
|---|---|---|
| Reviewer | wrote and scored the queries | Propose that a ground-truth label is wrong |
| Author | built the engine and fixture | Propose that a reviewer label is wrong |
| Adjudicator | neither | Decide |

If no third party is available, **unresolved disagreements are recorded as unresolved and
counted against the engine.** They are not settled by the author. A benchmark with three
open disputes is more informative than one where the author closed them.

## Procedure

1. **Reviewer lists disagreements** — their label, the ground-truth label, one sentence of
   reasoning, before seeing the author's response.
2. **Author responds in writing** to each, without editing the reviewer's file.
3. **Adjudicator rules**, choosing exactly one:
   - reviewer correct → fixture ground truth amended, amendment recorded
   - author correct → reviewer's score corrected, reasoning recorded
   - **question ambiguous** → excluded from scoring, counted in an `ambiguous` bucket, and
     the ambiguity noted as an evaluation defect
   - unresolved → stands as a disagreement, counted against the engine
4. **Both scores published** — pre-adjudication and post-adjudication. A single
   post-adjudication number hides how much moved.

## Standing rules

- **Ground truth is not privileged.** Three of four recorded retrieval misses were
  mislabelled, and it took an outside trace to notice. A reviewer disagreement is evidence
  about the fixture as much as about the reviewer.
- **A question that failed is not thereby a bad question.** Difficulty is not unfairness.
- **No question moves between development and held-out during adjudication.** The split is
  fixed by the reviewer at freeze time.
- **Amendments to the fixture are commits with reasons**, never silent edits.

## Output

`cold-review-adjudication-<date>.md`:

- every disagreement, all three positions, the ruling
- pre- and post-adjudication metrics
- fixture amendments made, with commit hashes
- questions excluded as ambiguous, with reasons
- unresolved disagreements
- a one-line statement of whether the benchmark should be considered independently validated

## Then, and only then

The reviewer's development set may be used to build a mechanism. The held-out set is scored
once, reported, and never used to iterate.

A mechanism tuned against held-out queries and reported as held-out is the specific error
`ridgeline-abstention-failure-analysis.md` §5 names as the blocker on implementation. This
protocol exists so that error is procedurally unavailable rather than merely discouraged.
