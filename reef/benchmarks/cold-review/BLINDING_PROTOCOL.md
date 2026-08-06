# Blinding protocol

Read this before anything else.

## Why the order matters

If you see the planted findings before writing questions, you will write questions about
them. The result would measure whether the engine finds things it was built alongside, which
is already known and is not the question.

The specific risk being controlled is **post-hoc relabelling**: an author who sees a failure
and then decides the question was unfair. Your labels are committed before you run the
engine, so that move is unavailable to everyone including you.

## Disqualifying material

Do not read any of these before your results are frozen:

| Path | Why |
|---|---|
| `fixtures/reef-deal-room/ground-truth.json` | The answer key. |
| `fixtures/reef-deal-room/GROUND_TRUTH.md` | The answer key in prose. |
| `fixtures/reef-deal-room/README.md` | States finding counts, severities and that negative controls exist. |
| `fixtures/reef-deal-room/outputs/` | Worked answers, issue register, calculation log. |
| `docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md` | Describes what was planted and where. |
| `docs/evaluation/DEAL_ROOM_EVAL.md` | Scoring design and the negative-control rationale. |
| `reef/benchmarks/*.json` | Prior metrics and the author's query labels. |
| `reef/benchmarks/ridgeline-abstention-failure-analysis.md` | The author's classifications. |
| `reef/benchmarks/EVALUATION_CAPABILITY_TAXONOMY.md` | The author's capability mapping. |
| `reef/NEXT-EVALUATIONS.md` | Names specific findings by id. |

## Permitted material

- The deal-room documents themselves: `fixtures/reef-deal-room/00_` through `12_`.
- `reef/README.md` — setup and CLI usage.
- `reef/benchmarks/ABSTENTION_RESULT_CONTRACT.md` — **required.** You label in these states,
  so you need their definitions. It contains no fixture answers.
- This directory.

## Build a blinded checkout

Do not rely on self-discipline. Remove the material:

```bash
git worktree add /tmp/reef-cold-review reef/m1-embedding-contract-fix
cd /tmp/reef-cold-review

cp reef/benchmarks/ABSTENTION_RESULT_CONTRACT.md /tmp/contract.md
cp -r reef/benchmarks/cold-review /tmp/cold-review

rm -rf fixtures/reef-deal-room/ground-truth.json \
       fixtures/reef-deal-room/GROUND_TRUTH.md \
       fixtures/reef-deal-room/README.md \
       fixtures/reef-deal-room/outputs \
       docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md \
       docs/evaluation/DEAL_ROOM_EVAL.md \
       reef/benchmarks \
       reef/NEXT-EVALUATIONS.md

bash /tmp/cold-review/verify_blinding.sh .
```

Work from `/tmp/contract.md` and `/tmp/cold-review/`. The verifier fails loudly if anything
disqualifying survives.

**The engine still runs.** Nothing removed is needed to ingest or query — `reef ingest` reads
the document folders, and the harness that reads ground truth is not used in this review.

## Sealed until frozen

Your results are **frozen** when you have committed `cold-review-results.json` and
`cold-review-observations.md`. Only then may you read the disqualifying material, and only
then does [`ADJUDICATION_PROTOCOL.md`](ADJUDICATION_PROTOCOL.md) apply.

If you read something disqualifying early, say so in your observations. A review with a
disclosed leak is usable with a caveat. An undisclosed one is worse than no review, because
it looks like independent confirmation and is not.
