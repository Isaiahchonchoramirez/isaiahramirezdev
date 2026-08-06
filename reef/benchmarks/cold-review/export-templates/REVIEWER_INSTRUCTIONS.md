# Reviewer instructions

Read `BLINDING_PROTOCOL.md` first and run the verification script.

Diligence experience is not required. It is mildly counterproductive on the first pass: a
reviewer who knows what a data room usually contains asks about what they expect rather than
what is actually in front of them.

---

## Phase 0 · Verify and install (20 min)

```bash
bash verify_blinding.sh .          # must print PASS
cd engine && bash setup.sh         # see ENGINE_USAGE.md if this fails
```

Record the output of `reef config` when `setup.sh` prints it. If the line reporting a
`dotenv` file says anything other than "none present", **stop and report it** — it means the
engine is running on configuration you were not shown.

---

## Phase 1 · Read the room (45 min)

Open the folders. Read enough to know what this package covers.

**Do not run the engine yet.** Searching first anchors your questions to whatever the engine
happens to surface, which is the thing under test.

Note as you go:

- what each folder holds;
- subjects covered substantively;
- subjects mentioned but thin;
- anything referred to that you cannot find;
- anything that will not open, or opens badly.

The last two are the easiest to skip and among the most useful.

---

## Phase 2 · Write questions (60 min)

Write **at least 28 questions**, phrased the way an analyst would type them — not as document
titles.

Required minimum distribution:

| Class | Minimum | Meaning |
|---|---|---|
| Directly answerable | **10** | You saw the answer in a document. |
| Subject present, fact may be absent | **5** | The room covers the subject; you could not find this specific attribute. |
| Outside corpus scope | **5** | The room says nothing about this subject. |
| Requires calculation or comparison | **5** | Needs arithmetic, or two or more documents. |
| Missing, inaccessible, stale or unreviewed material | **3** | Referred to but absent, superseded, or unopenable. |

**The five subject-present questions are the hardest and the most important.** Aim for
questions where an obvious document exists and does not actually answer what you asked.

For each question record your expected state from `RESULT_STATES.md`, one sentence of
reasoning in your own words, and your confidence.

Rules:

- Do not look at engine output while writing.
- Do not soften a question because you suspect the engine will fail it. That is tuning, and
  it destroys the value of the set.
- Do not write questions designed to be unfair. Write what you would actually ask.

Fill in `cold-review-queries.json` following `QUERY_SUBMISSION_TEMPLATE.json`.

### Freeze your questions before running anything

Either hash them:

```bash
shasum -a 256 cold-review-queries.json > cold-review-queries.sha256
cat cold-review-queries.sha256
```

or start a fresh repository inside this export — it has none, so anything you create is
yours alone and connects to nothing:

```bash
git init -q . && git add cold-review-queries.json
git commit -q -m "cold review: pre-registered queries and labels"
git rev-parse HEAD
```

Record the hash in your results. **This is what makes your labels pre-registered.** Without
it the review demonstrates nothing, because nobody can later tell what you expected before
you saw the answers.

---

## Phase 3 · Run the engine (20 min)

See `engine/ENGINE_USAGE.md`. In outline:

```bash
cd engine
./run.sh ingest ../deal-room --room cold-review
./run.sh coverage cold-review
./run.sh query "<your question>" --room cold-review
```

Run `reef coverage` early. It reports what the engine did with every file, including any it
could not process — useful context, and worth checking against what you noticed by hand.

For each question record the outcome, the explanatory detail line, and the top three
documents with their location references.

**Do not change a question after seeing its result.**

The engine currently returns only two outcomes: it found something, or it did not. You are
labelling in eight states. You will have to map by hand, and where the mapping is impossible,
say so — how often that happens is itself a measurement.

---

## Phase 4 · Score (30 min)

Follow `SCORING_PROTOCOL.md`. Produce `cold-review-results.json` matching
`EXPECTED_OUTPUT_SCHEMA.json`.

---

## Phase 5 · Observations (30 min)

Fill in `REVIEWER_OBSERVATIONS_TEMPLATE.md`. Then hash or commit both files.

**Your results are now frozen.** Request the answer key and follow `ADJUDICATION_HANDOFF.md`.

---

## Out of scope

You are not asked to judge market demand, pricing, or whether anyone would buy this. Those
questions are answered by customer conversations and legal advice, not by a corpus.
