# Reef — handoff

Everything needed to pick this up cold. Written 2026-08-07.

**Branch:** `reef/m1-embedding-contract-fix` @ `abbcc5e` — not pushed, not merged.
**Worktree:** `/Users/irmac/Developer/reef-embedding-fix`

---

## 1 · What Reef is, in one paragraph

A headless document ingestion and evidence engine. It takes a directory of business
documents, extracts text with coordinates, chunks it, embeds it, and answers searches with
citations that resolve to an exact page, spreadsheet row or line range. The product claim is
not "it answers questions" — it is **"every fact traces to the precise place it came from."**
That claim now has independent confirmation. Nothing else about it does.

Authority: [`docs/decisions/ADR-003-m1-engine-authorization.md`](docs/decisions/ADR-003-m1-engine-authorization.md).
It authorizes the **engine only**, on synthetic fixture data. Pricing, pilots, live customer
documents, the review UI and export are all still blocked by the nineteen mandatory rows in
[`docs/validation/SCORECARD.md`](docs/validation/SCORECARD.md), none of which has evidence.

---

## 2 · Current blocker

**The P1 protocol defects are fixed. Cold-review protocol is now version 2** — see §6 Step 1
and the 2026-08-07 entry in `docs/validation/DECISION_LOG.md`. Each reviewer gets a dedicated
database and a namespaced room, the verifier reads that database, there is one freeze
mechanism, and installation no longer reveals coverage before questions are frozen.

**Next on code: Step 2, document status at query time.** Nothing blocks it.

**The larger blocker is unchanged and is not technical.** Zero customer conversations have
happened. `L1` (may a buyer lawfully route seller-confidential documents to a third party?)
is binary, answerable in one call with a transaction attorney, and gates everything. ADR-003
§7 sets a tripwire: **if no qualified interview has been conducted by 2026-09-06, engine work
stops until five are booked.** That is 30 days from today.

---

## 3 · What is done

### The engine — built and working

`reef/` — Python 3.13, FastAPI, PostgreSQL 17 + pgvector, 26 source modules, 11 test modules,
**211 tests passing**, ruff clean, strict mypy clean.

```
intake → extract → structure → chunk → embed → index → search API + evidence API + CLI
```

Three invariants live in the database rather than in application code, because application
code has bugs:

- a `claim` with no supporting span is rejected by a constraint trigger;
- row-level security is `FORCE`d on every tenant-scoped table, so even the owner is subject;
- a vector without its producing model id violates a check constraint.

Evidence identifiers are derived, not random — UUIDv5 over a namespace, the pipeline version,
the document SHA-256 and the coordinates. Re-ingesting an unchanged room reuses every id, so
a citation issued before a reprocess still resolves.

### Baseline on the synthetic fixture

`reef/benchmarks/ridgeline-m1-baseline-v2.json`. 117 files → 116 indexed, 862 chunks, ~14s.

| Gate | Value |
|---|---|
| G1 inventory recall, G2 status correctness, G3 parsing | 100% |
| G9 citation presence, G10 anchor accuracy, G11 determinism | 100% |
| G12 fabricated citations | 0 |
| **ABS abstention (held-out)** | **50% — FAILS** |

### The first blinded cold review — complete and adjudicated

A reviewer with no prior exposure worked from a sanitized export, wrote 33 questions, froze
them by hash before running anything, and scored the results.
[`reef/benchmarks/cold-review/COLD_REVIEW_ADJUDICATION_001.md`](reef/benchmarks/cold-review/COLD_REVIEW_ADJUDICATION_001.md)
is the adjudication; the machine-readable record sits beside it.

---

## 4 · Findings that matter

### The one thing that works, confirmed independently

**200 of 200 citations resolved to the correct page, row or line. Zero fabrications. Zero
unlabeled inference.** Checked by someone with no stake in the outcome. The reviewer's
summary: *"Its failures are failures of selection and silence, never of invention."*

### The one thing that does not

**The engine cannot say what it means.** It returns two states — found, not found — where
the reviewer needed eight. Evidence that supports, contradicts, partially bears on, cannot be
read, or has been formally withdrawn all arrive identically labelled. Six of nine false
supports and all twelve wrong-state verdicts reduce to this.

| Capability | Result |
|---|---|
| Direct retrieval | **7 / 9** |
| Outside-scope handling | 3 / 5 |
| Subject present, fact absent | **0 / 6** |
| Contradiction | **0 / 3** |
| Calculation | 0 / 4 |
| Comparison | 0 / 2 |
| Inaccessible-document disposition | **0 / 2** |
| Stale / withdrawn handling | **0 / 1** |

False-support rate 27.3%, of which **four were escalation-worthy against a target of zero**.

### Four defects worth knowing by name

1. **Document status is never consulted.** The engine knows the Erie permit is an unreadable
   scan and returned a *lease* for a permit question. It knows the tax archive is locked and
   returned an index row reading "Supplied". It indexed a withdrawal notice and still ranked
   the withdrawn revenue file 0.0026 behind the live one, with a different figure for the
   same customer. All three are preventable from facts the engine already holds.
2. **The abstention floor discards correct answers.** Both false abstentions had their source
   ranked first or second and were thrown away for sitting ~0.015 under the floor. Both score
   *below the entire fitted answerable range* (0.6789–0.7939) — the calibration set never
   spanned the questions a real reviewer asks.
3. **On contradictions the seller's claim ranks first.** All three contradiction questions
   retrieved both sides, put the seller's assertion at rank 1, and the refutation below the
   fold with nothing marking the conflict.
4. **The "relevance score" is a fused rank weight**, `1/(60+rank)`, displayed near zero and
   inviting cross-query comparison it cannot support.

### Two earlier defects, already fixed

Recorded because they shaped the current design and both were invisible to a passing test
suite:

- **An embedding-model mismatch went undetected** because MiniLM and bge-small are both
  384-dimensional, so pgvector compared vectors from different spaces without complaint. A
  benchmark was published naming a model it had never run. Fixed by a compatibility contract
  (`reef/src/reef/corpus.py`) that refuses to search on a mismatch.
- **The abstention floor was a bare global constant** fitted to one model and silently applied
  to another, taking abstention from 100% to 0%. Fixed by model-bound calibration records
  (`reef/src/reef/calibration.py`).

The invalidated benchmark is preserved as `ridgeline-m1-baseline-invalidated.json` rather than
deleted, with a header naming what was wrong.

---

## 5 · Where things live

| Path | What |
|---|---|
| `reef/src/reef/` | the engine — 26 modules |
| `reef/src/reef/corpus.py` | embedding compatibility contract |
| `reef/src/reef/calibration.py` | model-bound abstention floors |
| `reef/src/reef/calibration_data/` | calibration records, shipped in the wheel |
| `reef/tests/` | 211 tests |
| `reef/benchmarks/` | baselines, query manifest, taxonomy, thresholds |
| `reef/benchmarks/cold-review/` | export builder, templates, protocols, adjudication |
| `reef/NEXT-EVALUATIONS.md` | queued evaluations, abstention first |
| `docs/decisions/ADR-003-*.md` | what is and is not authorized |
| `docs/validation/DECISION_LOG.md` | append-only decision history |
| `fixtures/reef-deal-room/` | the synthetic fixture — **contains the answer key** |
| `~/Developer/reef-cold-review-export/` | the blinded export, with frozen reviewer work |

### Design documents worth reading before changing anything

- [`reef/benchmarks/EVALUATION_CAPABILITY_TAXONOMY.md`](reef/benchmarks/EVALUATION_CAPABILITY_TAXONOMY.md) —
  ten capability classes and which are retrieval's job. Two of 22 planted findings are
  finding-level retrieval tasks; the harness once scored all of them as such.
- [`reef/benchmarks/ABSTENTION_RESULT_CONTRACT.md`](reef/benchmarks/ABSTENTION_RESULT_CONTRACT.md) —
  the nine-state contract, designed and unbuilt.
- [`reef/benchmarks/IMPLEMENTATION_EVIDENCE_THRESHOLDS.md`](reef/benchmarks/IMPLEMENTATION_EVIDENCE_THRESHOLDS.md) —
  what evidence would justify building each candidate mechanism, fixed before any was built.

---

## 6 · Exact next steps

### Step 1 — Unblock the next cold review (P1) — **done, 2026-08-07**

Protocol version 2. All three were protocol fixes; no engine code changed.

**1a. Database isolated per reviewer.** `setup.sh <reviewer-id>` creates `reef_cr_<id>`
holding one room, `cold-review-<id>`; `ops/bootstrap-local-db.sh` now takes the database
name as a parameter; `teardown.sh` drops it afterwards. `verify_blinding.sh` gained section
9, which connects to that database and fails on any room that is not the reviewer's — so it
reads true before ingestion and stays true during it. `setup.sh` independently refuses a
database that already holds rooms.

**1b. One freeze mechanism.** The detached SHA-256 file; the git option is gone from
`REVIEWER_INSTRUCTIONS.md`. The verifier now classifies a `.git` rather than rejecting it:
accepted only when git can read it, it is rooted at the export, it has no remotes, and its
earliest commit postdates the manifest's `built_at`. Nested repositories and `.git` files
pointing at external storage are rejected outright.

**1c. Install separated from ingest.** `setup.sh` installs and provisions, and stops.
Ingestion opens Phase 3, after the hash is recorded.

Verified end to end against a real export: build → verify → setup → verify (empty) → ingest
→ query → verify (own room only) → teardown. Contamination, inherited history, remotes,
nested and linked `.git`, shared database and unnamespaced room are each covered by a test —
211 tests pass, up from 188.

**Before handing out an export, rebuild it.** The one at
`~/Developer/reef-cold-review-export` is current as of this commit.

### Step 2 — Consult document status before answering (P0-1) — **next**

The cheapest real correctness win. At query time, join retrieved documents against their
processing state and any withdrawal notices, and surface status with each hit. Fixes three of
the four escalation-worthy errors.

Engine behaviour changes: yes — output gains a status field; ranking unchanged.
Overfitting risk: low — it reads state the engine already computes.
Tests: a query whose subject is an unreadable document must not present a substitute as
responsive; a withdrawn file must be labelled; status must never be inferred from a filename.

### Step 3 — Re-derive the abstention floor (P0-2)

Recalibrate using the cold reviewer's directly-answerable questions, which reach 0.6394 —
below the entire fitted range. Use **only their development split**; score once on their
held-out split. Do not hand-adjust the constant. The split is in
`cold-review-results.json` → `split_proposal`, chosen by the reviewer before unsealing.

### Step 4 — Second cold review

Only after steps 1–3. A second reviewer, fresh export, same protocol. The first review's
33 questions become development and held-out sets per the reviewer's split and must not be
reused as blind evidence.

### Do not start

Evidence-sufficiency implementation (P0-3) before step 1 — it needs the development set a
clean second review produces. Findings layer, calculation, comparison, absence detection —
nine of 33 questions needed these and ADR-003 §4 does not authorize them. Knowledge graph,
agents, UI, cloud, auth, billing, multi-tenancy beyond the row-level security already present.

---

## 7 · Non-code actions, still outstanding

These have not moved since ADR-003 was written, and they gate the product regardless of how
good the engine gets.

1. **Schedule qualified interviews.** Zero have happened.
2. **Contact transaction counsel** on third-party processing and NDA permissions — `L1`,
   binary, one call.
3. **Test willingness to pay.**

**Tripwire: 2026-09-06.** No qualified interview by then and engine work stops until five are
booked, with the reason recorded in `docs/validation/DECISION_LOG.md`.

---

## 8 · How to run it

```bash
cd reef
uv sync --frozen --all-extras --all-groups
./ops/bootstrap-local-db.sh
uv run alembic upgrade head
uv run reef config          # shows resolved settings and where each came from
uv run reef ingest ../fixtures/reef-deal-room --room dev
uv run reef query "covenant compliance fixed charge coverage ratio" --room dev
uv run reef evaluate        # scores against the fixture
uv run pytest               # 211 tests
```

Requires PostgreSQL 17 with `pgvector` (`brew install postgresql@17 pgvector`). Docker Desktop
is **not** installed on this machine — `compose.yaml` is retained for CI only. `tesseract` is
optional and enables reading the one scanned PDF.

To rebuild the blinded reviewer export:

```bash
uv run python benchmarks/cold-review/build_blinded_export.py --force
```

---

## 9 · Standing rules

Learned the hard way on this branch; each one has a scar behind it.

- **A benchmark records the configuration it ran under**, verified against stored state. One
  did not, and its numbers were attributed to a model it never used.
- **A threshold belongs to the thing it was fitted to.** A floor fitted to one embedding model
  is meaningless for another.
- **Held-out data is scored once.** The original six held-out negatives are now marked
  diagnostic-only after repeated inspection; they cannot validate a new mechanism.
- **Reviewer verdicts are never relabelled after unsealing.** The adjudicator adds ownership
  and cause; the frozen scores stand.
- **A blinding boundary that stops at the filesystem is not a boundary.** The index lives in
  Postgres, outlives the export directory, and was invisible to every check for a full
  review. Anything that outlives the artifact has to be named, namespaced and verified.
- **A synthetic result is never customer evidence.** Counting one as such is an automatic-fail
  condition on the scorecard.
- **Do not describe M1 as validated, production-ready, or approved for customer data.** It is
  none of these.

---

## 10 · State of the branch

```
abbcc5e  test(reef): adjudicate first blinded cold review
18faf06  test(reef): add sanitized cold-review export
6d721a7  test(reef): separate retrieval metrics and define cold review
af07009  docs(reef): define evidence-sufficiency abstention design
442eb8e  test(reef): reissue reproducible Ridgeline benchmark
c479535  fix(reef): enforce embedding model compatibility
0041384  feat(reef): add local evidence-preserving ingestion engine
```

Seven commits, none pushed, none merged. `reef/m1-ingestion-engine` @ `0041384` is preserved
unchanged as the pre-fix state. The portfolio checkout at
`/Users/irmac/Developer/isaiahramirezdev` is on `reef/product-foundation` and holds unrelated
work that must not be disturbed.

211 tests, ruff, format and strict mypy all clean at HEAD (src scope; `alembic/versions/` is
generated and has never been lint-clean).
