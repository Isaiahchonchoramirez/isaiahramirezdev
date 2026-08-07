# Reviewer instructions

Read `BLINDING_PROTOCOL.md` first and run the verification script.

Diligence experience is not required. It is mildly counterproductive on the first pass: a
reviewer who knows what a data room usually contains asks about what they expect rather than
what is actually in front of them.

---

## Phase 0 · Verify and install (20 min)

Pick a **reviewer id** first: 2–16 characters, lowercase letters, digits and underscores.
Your initials are fine. It names your database and your room, so that nothing another
review left on this machine can reach yours.

```bash
bash verify_blinding.sh .          # must print PASS
cd engine && bash setup.sh <your-id>   # see ENGINE_USAGE.md if this fails
```

`setup.sh` installs the engine, creates an empty database called `reef_cr_<your-id>`, and
applies the schema. **It does not load the data room.** That happens in Phase 3, after your
questions are frozen — loading it now would show you what the engine covers before you have
committed to what you expect, and that is the thing being measured.

Record the output of `reef config` when `setup.sh` prints it. If the line reporting a
`dotenv` file says anything other than "none present", **stop and report it** — it means the
engine is running on configuration you were not shown. Everything `setup.sh` sets is written
to `engine/reviewer-env.sh`, which you can read.

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

One mechanism, a detached hash file:

```bash
shasum -a 256 cold-review-queries.json > cold-review-queries.sha256
cat cold-review-queries.sha256
```

Record the hash in your results. **This is what makes your labels pre-registered.** Without
it the review demonstrates nothing, because nobody can later tell what you expected before
you saw the answers.

Nothing stops you from also committing to a repository you create here, and
`verify_blinding.sh` accepts one it can tell was created after the export was built. It is
not required, and the hash file is what the adjudicator reads.

---

## Phase 3 · Load the room and run the engine (25 min)

Your questions are frozen. Now — and not before — load the data room.

```bash
bash verify_blinding.sh .          # confirms your database is still empty and still yours
cd engine
./run.sh ingest ../deal-room --room cold-review-<your-id>
./run.sh coverage cold-review-<your-id>
./run.sh query "<your question>" --room cold-review-<your-id>
```

`run.sh` reads your room name from `reviewer-env.sh`; `setup.sh` printed the exact commands
with your id already filled in. See `engine/ENGINE_USAGE.md` for the rest.

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

Fill in `REVIEWER_OBSERVATIONS_TEMPLATE.md`. Then hash both files the same way:

```bash
shasum -a 256 cold-review-results.json REVIEWER_OBSERVATIONS.md > cold-review-results.sha256
```

**Your results are now frozen.** Request the answer key and follow `ADJUDICATION_HANDOFF.md`.

---

## Phase 6 · Tear down

After the adjudicator has your results, remove the database. It is the one part of this
review that lives outside the export directory, and leaving it behind is how the next
reviewer inherits your index.

```bash
cd engine && bash teardown.sh <your-id>
```

Keep the directory and your hash files.

---

## Out of scope

You are not asked to judge market demand, pricing, or whether anyone would buy this. Those
questions are answered by customer conversations and legal advice, not by a corpus.
