# Adjudication handoff

Read only after your results and observations are frozen — hashed or committed, and sent.

## The failure this prevents

Someone sees a result they dislike, decides the question was unfair, relabels it, and reports
an improved score. Every individual step looks reasonable and the outcome is an evaluation
that measures its authors' tolerance for their own errors.

The control is ordering, and it is not negotiable. Your frozen files are the evidence of what
you expected before you knew.

## Freeze

Your results are frozen once `cold-review-results.json` and `cold-review-observations.md` are
hashed or committed and the hash has been shared. **Nothing in either file changes
afterwards.** Corrections go in a separate dated addendum stating what changed and why.

## Roles

| Role | Who | May |
|---|---|---|
| Reviewer | you | Argue that an expected answer is wrong |
| Authors | built the engine and the room | Argue that your label is wrong |
| Adjudicator | neither | Decide |

If no third party is available, **unresolved disagreements are recorded as unresolved and
counted against the engine.** They are not settled by the authors. An evaluation with three
open disputes is more informative than one where the authors closed them.

## Procedure

1. You list disagreements — your label, theirs, one sentence of reasoning — **before** seeing
   their response.
2. They respond in writing, without editing your files.
3. The adjudicator rules, choosing exactly one:
   - **you were right** → the answer key is amended, and the amendment is recorded;
   - **they were right** → your score is corrected, and the reasoning is recorded;
   - **the question was ambiguous** → excluded from scoring, counted separately, and the
     ambiguity recorded as a defect in the evaluation;
   - **unresolved** → stands, counted against the engine.
4. Both scores are published: before adjudication and after. A single post-adjudication
   number hides how much moved.

## Standing rules

- **The answer key is not privileged.** A disagreement is evidence about the key as much as
  about you.
- **A question that failed is not thereby a bad question.** Difficulty is not unfairness.
- **No question moves between development and held-out during adjudication.** Your split is
  fixed at freeze time.
- **Amendments to the room or the key are recorded with reasons**, never made silently.

## What your work is used for

- Your questions become the development and held-out sets, split as you specified.
- Only the development set may be used to build or tune anything.
- The held-out set is scored once, reported, and never used to iterate.

A mechanism tuned against held-out questions and then reported as held-out performance is the
specific error this whole procedure exists to make unavailable.
