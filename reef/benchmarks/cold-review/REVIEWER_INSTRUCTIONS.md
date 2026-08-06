# Reviewer instructions

You have a synthetic data room for a fictional company and a search engine built over it.
Your job is to decide whether the engine's answers, and its refusals, can be trusted.

Read [`BLINDING_PROTOCOL.md`](BLINDING_PROTOCOL.md) first and build the blinded checkout.

Diligence experience is not required. It is mildly counterproductive on the first pass: a
reviewer who knows what a data room usually contains asks about what they expect rather than
what is in front of them.

---

## Phase 1 · Read the room (45 min)

Open the folders. Read enough to know what the package covers. **Do not run the engine yet** —
searching first anchors your questions to what the retriever surfaces, which is the thing
under test.

Note as you go:

- what each folder holds;
- subjects covered substantively;
- subjects mentioned but thin;
- anything referenced that you cannot find;
- anything you could not open.

The last two matter most and are the easiest to skip.

---

## Phase 2 · Write questions (60 min)

Write **at least 28 questions**, phrased as an analyst would type them — not as document
titles. Scoring by title is a known generous proxy and this review partly exists to test it.

Required minimum distribution:

| Class | Minimum | Meaning |
|---|---|---|
| Directly answerable | **10** | You saw the answer in a document. |
| Subject present, fact may be absent | **5** | The package covers the subject; you could not find this specific attribute. |
| Outside corpus scope | **5** | The package says nothing about this subject. |
| Requires calculation or comparison | **5** | Needs arithmetic, or two or more sources. |
| Missing, inaccessible, stale or unreviewed material | **3** | Referenced but absent, superseded, or unopenable. |

**The five subject-present questions are the point of this exercise.** The author's original
negative set contained none, which is why it failed to detect a defect. Aim for questions
where an obvious document exists and does not answer the question.

For each, record your **expected disposition** using the states in
`ABSTENTION_RESULT_CONTRACT.md`, and one sentence of reasoning in your own words.

Rules:

- Do not look at engine output while writing.
- Do not adjust a question because the engine handles it badly. That is tuning and it
  destroys the set's value.
- Do not write questions designed to be unfair. Write what you would actually ask.

Fill in `cold-review-queries.json` following
[`QUERY_SUBMISSION_TEMPLATE.json`](QUERY_SUBMISSION_TEMPLATE.json), then **commit it before
running anything**:

```bash
git add cold-review-queries.json
git commit -m "cold review: pre-registered queries and labels"
git rev-parse HEAD    # record this hash in your report
```

This commit is what makes your labels pre-registered. Without it the review proves nothing.

---

## Phase 3 · Run the engine (20 min)

```bash
cd reef
uv sync --frozen --all-extras --all-groups
./ops/bootstrap-local-db.sh
uv run alembic upgrade head
uv run reef config
uv run reef ingest ../fixtures/reef-deal-room --room cold-review
```

**Record the `reef config` output verbatim.** If the `dotenv` line reports anything other
than "none present", stop and report it — a hidden `.env` is exactly the fault that
invalidated the first benchmark, and finding a second would be more valuable than the rest of
this review.

Then, for each question:

```bash
uv run reef query "<your question>" --room cold-review
```

Record outcome, the detail line, and the top three documents with their locators. Do not
change a question after seeing its result.

The engine currently returns only `found` or `not_found_in_corpus`. You will be mapping two
outputs onto nine states. **Where the mapping is impossible, say so** — that is a finding
about the engine's expressiveness, not a mistake on your part.

---

## Phase 4 · Score (30 min)

Follow [`SCORING_PROTOCOL.md`](SCORING_PROTOCOL.md). Produce `cold-review-results.json`
matching [`EXPECTED_OUTPUT_SCHEMA.json`](EXPECTED_OUTPUT_SCHEMA.json).

---

## Phase 5 · Observations (30 min)

Fill in [`REVIEWER_OBSERVATIONS_TEMPLATE.md`](REVIEWER_OBSERVATIONS_TEMPLATE.md).

Then commit both files. **Your results are now frozen** and you may read the previously
disqualified material.

---

## Phase 6 · Adjudication

Follow [`ADJUDICATION_PROTOCOL.md`](ADJUDICATION_PROTOCOL.md). Disagreement is the valuable
output; agreement from a reviewer who read the author's reasoning first is worth very little.

---

## Out of scope

You are not asked to assess market demand, pricing, or whether anyone would buy this. Those
are answered by customer interviews and legal counsel, not by a corpus, and they remain the
binding constraints on the product regardless of how this review turns out.
