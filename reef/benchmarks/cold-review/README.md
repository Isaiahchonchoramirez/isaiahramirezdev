# Cold-review package

> **Do not hand this directory to a reviewer.** It lives inside the repository that holds
> the answer key, so anything given from here is recoverable through version-control
> history even after deletion.
>
> Build a sanitized export instead:
>
> ```bash
> uv run python benchmarks/cold-review/build_blinded_export.py
> ```
>
> That assembles `~/Developer/reef-cold-review-export` from an explicit allowlist — a fresh
> directory with no history, no answer key, and no path back here. `export-templates/`
> holds the reviewer-facing documents it ships; the files below are the authors' design
> record and are **not** given to the reviewer.

Everything a second reviewer needs to evaluate Reef's retrieval and abstention without
seeing the expected answers.

Every query set, label and threshold in this repository was written by the same party that
built the fixture and the engine. `SCORECARD.md` names that conflict for market evidence and
it applies at least as strongly here. One benchmark error already survived a full
verification pass, two commits and a written report before a routine trace caught it.

## Read in this order

| File | When |
|---|---|
| [`BLINDING_PROTOCOL.md`](BLINDING_PROTOCOL.md) | Superseded by the export builder, kept as the design rationale. |
| [`REVIEWER_INSTRUCTIONS.md`](REVIEWER_INSTRUCTIONS.md) | The task, start to finish. |
| [`QUERY_SUBMISSION_TEMPLATE.json`](QUERY_SUBMISSION_TEMPLATE.json) | Where your questions and pre-registered labels go. |
| [`EXPECTED_OUTPUT_SCHEMA.json`](EXPECTED_OUTPUT_SCHEMA.json) | The shape of the results file you produce. |
| [`SCORING_PROTOCOL.md`](SCORING_PROTOCOL.md) | How to score, and which statistics to report. |
| [`REVIEWER_OBSERVATIONS_TEMPLATE.md`](REVIEWER_OBSERVATIONS_TEMPLATE.md) | Free-text findings. |
| [`ADJUDICATION_PROTOCOL.md`](ADJUDICATION_PROTOCOL.md) | **After your results are frozen.** How disagreements are settled. |

## What this measures

Two things, and the second matters as much as the first:

1. Whether the engine finds what it should and declines what it should.
2. **Whether the evaluation is reproducible by someone who did not design it.** If the
   instructions are ambiguous or the result states do not fit the questions you naturally
   ask, that is a finding about the evaluation, and it is the more valuable output.

## What you will not be given

Ground-truth findings, planted issue descriptions, expected source anchors, held-out labels,
negative-control identities, scorer notes, and the author's prior classifications. The
blinding protocol lists the exact paths and provides a command that removes them.

## Time

About three hours. Roughly 45 minutes reading the room, 60 writing questions, 20 running the
engine, 30 scoring, 30 on observations.
