# Reef cold review

You have a synthetic data room for a fictional company and a search engine built over it.
Your job is to decide whether the engine's answers — and its refusals — can be trusted.

You have not been given the expected answers, and they are not recoverable from anything in
this directory. That is deliberate. If you knew what the room contained before writing your
questions, you would write questions about it, and the result would measure nothing.

Everything you need is here. This directory has no connection to the repository it came
from: no version-control history, no links, no absolute paths back to it. Deleting that
repository would not affect you.

---

## Read in this order

| File | When |
|---|---|
| `BLINDING_PROTOCOL.md` | **First.** What was withheld and how to confirm it. |
| `REVIEWER_INSTRUCTIONS.md` | The task, start to finish. |
| `engine/ENGINE_USAGE.md` | Installing and running the engine. |
| `QUERY_SUBMISSION_TEMPLATE.json` | Where your questions and pre-registered labels go. |
| `EXPECTED_OUTPUT_SCHEMA.json` | The shape of the results file you produce. |
| `SCORING_PROTOCOL.md` | How to score and which statistics to report. |
| `REVIEWER_OBSERVATIONS_TEMPLATE.md` | Free-text findings. |
| `ADJUDICATION_HANDOFF.md` | **Last**, after your results are frozen. |

---

## Quick start

```bash
# 1 · confirm the export is blinded
bash verify_blinding.sh .

# 2 · install the engine (see engine/ENGINE_USAGE.md for prerequisites)
cd engine && bash setup.sh && cd ..

# 3 · load the data room
cd engine && ./run.sh ingest ../deal-room --room cold-review && cd ..

# 4 · read the room, write questions, freeze them
#     — see REVIEWER_INSTRUCTIONS.md
```

---

## What is being measured

Two things, and the second matters as much as the first.

1. Whether the engine finds what it should and declines what it should.
2. **Whether this evaluation is reproducible by someone who did not design it.** If the
   instructions are ambiguous, or the result states do not fit the questions you naturally
   ask, that is a finding — and it is the more valuable one.

The engine's authors also wrote its tests and its evaluation. That is a known conflict, and
you are the control for it. Say what you actually find.

---

## Time

About three hours: 45 minutes reading the room, 60 writing questions, 20 running the engine,
30 scoring, 30 on observations.

---

## What is in this directory

```
.
├── README.md                          this file
├── BLINDING_PROTOCOL.md
├── REVIEWER_INSTRUCTIONS.md
├── SCORING_PROTOCOL.md
├── QUERY_SUBMISSION_TEMPLATE.json
├── EXPECTED_OUTPUT_SCHEMA.json
├── REVIEWER_OBSERVATIONS_TEMPLATE.md
├── ADJUDICATION_HANDOFF.md
├── RESULT_STATES.md                   the vocabulary you label in
├── verify_blinding.sh
├── BLINDED_EXPORT_MANIFEST.json       hashes of everything here
├── engine/                            the Reef engine, as a wheel
│   ├── ENGINE_USAGE.md
│   ├── setup.sh
│   ├── reef-<version>-py3-none-any.whl
│   ├── alembic/  alembic.ini  ops/    database setup
│   └── .env.example
├── DOCUMENT_INDEX.md                  plain listing of the room
└── deal-room/                         the synthetic data room
    └── 00_… 12_…                      the documents, as delivered
```
