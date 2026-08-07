# Running the Reef engine

Reef ingests a directory of documents and lets you search them. Every result points back to
an exact location in a source file — a page, a spreadsheet row, a line range.

This directory contains the engine as a built wheel. There is no source repository and none
is needed.

## Prerequisites

- **Python 3.13**
- **[uv](https://docs.astral.sh/uv/)** — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **PostgreSQL 17 with the `pgvector` extension**

On macOS:

```bash
brew install postgresql@17 pgvector
brew services start postgresql@17
```

On Debian/Ubuntu, install `postgresql-17` and `postgresql-17-pgvector` from PGDG.

Optional: `tesseract` enables reading scanned pages. Without it, a scanned document is
reported as unreadable rather than silently returning nothing — which is the correct
behaviour and worth observing either way.

## Setup

```bash
cd engine
bash setup.sh <your-reviewer-id>
```

Your reviewer id is 2–16 characters of `a-z 0-9 _` — anything that is yours alone on this
machine. Setup creates a database called `reef_cr_<your-id>`, applies the schema, installs
the wheel into a local environment, and prints the resolved configuration.

**It does not load the data room.** Ingestion is a separate step you run later, after your
questions are frozen. See `../REVIEWER_INSTRUCTIONS.md`.

### Why the database is named for you

Postgres runs on this host, not inside the export directory. A review that used a shared
`reef` database once inherited a room ingested before the reviewer's session began, and the
blinding check passed anyway because it only inspects files. A database per reviewer, a room
name per reviewer, and a verifier that refuses any room that is not yours is what replaced
that.

`setup.sh` writes `reviewer-env.sh` with the exact connection settings. Read it — nothing is
configured anywhere else, and there is no `.env`.

**Read the configuration output.** The line reporting a `dotenv` file should say
"none present". If it names a file, the engine is running on settings you were not shown —
stop and report it.

## Commands

All commands run from `engine/`. `run.sh`, written by `setup.sh`, loads `reviewer-env.sh`
and the wheel for you:

```bash
./run.sh config                            # resolved settings and where each came from
./run.sh init                              # check the database is reachable and migrated
./run.sh ingest ../deal-room --room cold-review-<your-id>
./run.sh coverage cold-review-<your-id>    # every file and what the engine did with it
./run.sh query "your question" --room cold-review-<your-id>
./run.sh rooms                             # list rooms
./run.sh drop cold-review-<your-id> --yes  # delete a room and start over
```

The long form, if you would rather see what `run.sh` does:

```bash
. ./reviewer-env.sh
uv run --with "reef[embed] @ file://$PWD/$(ls reef-*.whl)" reef config
```

The `[embed]` extra matters: without it the engine ingests documents but cannot build the
vectors search depends on, and every document fails at that stage. `run.sh` includes it.

### Reading a query result

Each hit shows the file, a location reference, a relevance score, and a snippet:

```
1. 02_Financial/some_document.pdf  page 3  0.0328
   The quick brown fox jumps over the lazy dog and continues for some distance …
```

The location reference is the claim being made: *this text is on page 3 of that file*.
Verifying a sample of those against the actual documents is part of the review.

When the engine declines to answer it says so and explains why, rather than returning an
empty list.

## HTTP API

If you prefer HTTP:

```bash
./run.sh --help   # confirm the CLI works, then:
uv run --with "reef[embed] @ file://$PWD/$(ls reef-*.whl)" uvicorn reef.api:app --port 8000
```

Then `GET /rooms`, `GET /rooms/{room_id}/search?q=...`,
`GET /rooms/{room_id}/coverage`, and `GET /rooms/{room_id}/evidence/chunks/{chunk_id}`.
Interactive docs at `http://localhost:8000/docs`.

## Notes

- Ingesting the room takes roughly 15 seconds. The first run downloads an embedding model
  (about 270 MB) and needs network access once; nothing else contacts the network, and no
  document content is sent anywhere.
- Re-ingesting the same room is safe and produces the same identifiers.
- `./run.sh drop <room> --yes` then re-ingesting gives a clean start.
- `bash teardown.sh <your-id>` drops the whole database. Run it when the review is over —
  the directory is yours to keep, but the database is shared infrastructure on this host.

## If something breaks

`reef init` diagnoses the common cases: database unreachable, `pgvector` missing, schema not
applied. Report anything it cannot explain — an engine that is hard to start is a finding.
