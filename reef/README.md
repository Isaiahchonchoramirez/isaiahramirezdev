# Reef engine

Headless document ingestion and evidence pipeline. Every extracted fact traces back to the
exact region of the source it came from — document, page, bounding box, character range.

```
intake → extract → structure → chunk → embed → index → search API + evidence API
```

**Scope is bounded by [ADR-003](../docs/decisions/ADR-003-m1-engine-authorization.md).**
Fixture data only. No customer document may be ingested until `L1` (lawful third-party
processing) is answered. There is no review UI, no finding layer, no export, and no
pricing — the product gate in [`docs/README.md`](../docs/README.md) is still closed, and an
eval score is never customer or payment evidence.

## Setup

Requires Python 3.13, [uv](https://docs.astral.sh/uv/), and PostgreSQL 17 with `pgvector`.

```bash
brew install postgresql@17 pgvector tesseract   # tesseract only if you want OCR
brew services start postgresql@17

cd reef
uv sync --extra ocr --extra embed
./ops/bootstrap-local-db.sh
uv run alembic upgrade head
cp .env.example .env
uv run reef init
```

`compose.yaml` runs the same stack under Docker if you prefer it; the local path above
needs no daemon. Object storage defaults to the filesystem (`.reef-storage/`) and switches
to S3 with `REEF_STORAGE_BACKEND=s3`.

## Use

```bash
# Ingest a directory and print a coverage statement
uv run reef ingest ../fixtures/reef-deal-room --room dealroom

# Search. Abstains rather than guessing when nothing clears the floor.
uv run reef query "no single customer exceeds 11% of revenue" --room dealroom

# Score against the fixture
uv run reef evaluate            # R1 baseline
uv run reef evaluate --r2       # with the R2 delta

# HTTP
uv run uvicorn reef.api:app --reload
```

```bash
# Show the resolved configuration and where every value came from
uv run reef config
```

`reef coverage`, `reef rooms` and `reef drop` round out the CLI.

## Current results

Against `fixtures/reef-deal-room` v1.0.0, R1 run, OCR enabled, on an empty database with no
`.env`. Full record: [`benchmarks/ridgeline-m1-baseline-v2.json`](benchmarks/ridgeline-m1-baseline-v2.json).

| Gate | Measure | Value | Bar |
|---|---|---|---|
| G1 | Document inventory recall | 100% | ≥100% |
| G2 | Processing status correctness | 100% | ≥100% |
| G3 | Parsing success on supported formats | 100% | ≥95% |
| G9 | Citation presence | 100% | ≥100% |
| G10 | Citation location accuracy | 100% | ≥95% |
| G11 | Deterministic extraction reproducibility | 100% | ≥100% |
| G12 | Fabricated citations | 0 | 0 |
| **ABS** | **Abstention on held-out absent subjects** | **50% (3 of 6 leak)** | **≥100% — FAILS** |
| R@12 | Retrieval recall on planted findings | 78.9% (15/19) | baseline, no bar yet |

117 files, 116 indexed, 862 chunks, ~14 seconds (R1 subset; the full fixture is 121/120/869).
The one unindexed file is a password-protected archive, correctly registered as unsupported
with an actionable reason rather than silently dropped.

**The abstention gate fails and cannot be fixed by moving the floor.** The answerable and
held-out-negative score distributions overlap: a negative scores 0.7308 inside an answerable
range of 0.6789–0.7939. All three leaks are subjects the corpus covers whose specific fact is
absent. See [`NEXT-EVALUATIONS.md`](NEXT-EVALUATIONS.md) §0.

**G4–G8 and G13–G15 are not scored.** They measure the finding layer, which this engine
does not have. Reporting a number for them would be inventing one.

An earlier record ([`ridgeline-m1-baseline-invalidated.json`](benchmarks/ridgeline-m1-baseline-invalidated.json))
reported 73.7% recall and 100% abstention. Those figures are **invalid**: it documented
bge-small while its corpus was embedded with MiniLM. It is preserved, labelled, rather than
deleted.

## Design notes

The decisions most likely to be undone by someone who doesn't know why they were made.

**Three invariants live in the database, not in application code.** Application code has
bugs. A `claim` with no row in `support` is rejected by a constraint trigger; row-level
security is `FORCE`d on every tenant-scoped table so even the owner is subject to it; and a
vector without its model id violates a check constraint. See
`alembic/versions/0002_evidence_invariants.py` and the tests in
`tests/test_evidence_invariants.py`.

**Type detection reads content, never the extension.** A spreadsheet renamed to `.pdf` is
ordinary. The extension is kept as `declared_mime` so a mismatch is visible rather than
silently resolved.

**Nothing coerces tabular types.** `000418` becoming `418` is the canonical failure named
in the eval spec — it destroys the join key a reconciliation depends on. The CSV path uses
`csv.reader` (always strings) and the XLSX path records `is_text` per cell.

**Chunks are sized to the encoder, not to the architecture document.** `05-architecture.md`
specifies 800/1500 tokens; the local encoder accepts 512. An 800-token chunk would be
stored whole while its vector represented two thirds of it, so the chunk would claim
provenance over text that never reached the model. Target is 420, hard max 500. If the
encoder changes, these move with it.

**The abstention gate reads absolute similarity, not the fused score.** Reciprocal rank
fusion is rank-based and discards the one number that says whether anything matched — a
vector search always returns its top-k, and its worst result still ranks first among them.
An earlier rank-based gate admitted every nonsense query put to it.

**The floor belongs to the model, not to Reef.** It lives in `calibration_data/<model>.json`
with the evidence that produced it: the query sets, the score ranges, the fixture hash, and
a held-out validation. A bare module constant is what let a floor fitted to MiniLM govern
bge-small and take abstention from 100% to 0% with no error. Searching a model with no
calibration record raises rather than falling back to a default.

**Equal vector dimension is not embedding compatibility.** MiniLM and bge-small are both
384-dimensional, so pgvector compares them without complaint and every similarity is
meaningless. `corpus.py` resolves the room's stored model before any vector search and
refuses to proceed on a mismatch, a mixed-model room, or unattributed vectors. Nothing is
re-embedded as a side effect of a query.

**OCR preprocessing order was measured, not reasoned.** Render at the page's native raster
resolution, upscale with LANCZOS, then median filter. Reversing the last two steps turns
readable output into nonsense, and asking the PDF renderer to upscale produces noise that
looks like glyphs. See `extract/ocr.py`.

**No provider SDK is imported outside `models_gateway.py`**, enforced by
`tests/test_architecture_rules.py` rather than by convention.

## Layout

```
src/reef/
  config.py            settings, and the single source of truth for the embedding identity
  calibration.py       model-bound abstention floors, read at request time
  calibrate_floor.py   the offline procedure that fits a floor and records its evidence
  corpus.py            the embedding compatibility contract; equal dimension is not enough
  models.py            the evidence schema — document, page, span, chunk, claim, support
  db.py                room_session() binds the tenant to the transaction; RLS reads it
  storage.py           object storage — filesystem or S3 behind one interface
  models_gateway.py    the only module allowed to import a model provider
  search.py            hybrid retrieval, RRF, abstention gate
  evidence.py          resolve any anchor back to its source region
  api.py               FastAPI: search, evidence, coverage
  cli.py               ingest, query, coverage, evaluate, rooms, drop
  evaluate.py          the eval harness; withholds the answer key from the engine
  ingest/
    filetype.py        magic-byte detection, OOXML disambiguation, encrypted-ZIP check
    intake.py          hash, dedupe, archive expansion with bomb limits
    chunk.py           structure-aware chunking with exact span attribution
    pipeline.py        stages 2-6; failure is per document, never per batch
  extract/
    pdf.py             coordinates, and explicit rejection of bad text layers
    tabular.py         XLSX and CSV without type coercion
    textual.py         TXT, Markdown, DOCX
    ocr.py             Tesseract behind an interface, off by default
```

## Tests

```bash
uv run pytest              # 111 tests, needs the database
uv run ruff check src tests
uv run mypy src
```

Integration tests run against the real database and the real extractors. Mocking either
would test the mocks, and the property under test is that a fact survives the whole journey
from a file on disk to a rectangle on a page.
