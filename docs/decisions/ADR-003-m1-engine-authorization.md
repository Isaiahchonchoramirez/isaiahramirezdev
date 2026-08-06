# ADR-003: M1 ingestion engine authorized on fixture mechanics

- **Status:** Accepted
- **Decision date:** 2026-08-06
- **Supersedes:** neither ADR-001 (wedge) nor ADR-002 (validation package)
- **Amends:** the M1 gate in `docs/README.md` and `docs/validation/SCORECARD.md`
- **Implementation authority:** **yes, and bounded.** Engine only. See §4 and §6.

## Context

`docs/README.md` and `SCORECARD.md` both require the same six conditions before any
application code is written, and condition 1 requires every mandatory scorecard row to be
Pass. **Zero of nineteen rows have evidence.** No interviews have been conducted, `L1` and
`N1` are unanswered, and `RESEARCH_LOG.md` contains desk research at level E1 only. Under
the gate as written, this ADR cannot say build.

The gate was written to prevent one specific failure: building a product nobody buys, then
rationalizing the build after the fact. That failure is real and the gate is a good
instrument against it. But it conflates two things that carry different risk:

| | Risk if wrong | Reversible |
|---|---|---|
| **Building the engine** | Time spent on a pipeline that has other uses | Yes — the pipeline is wedge-independent |
| **Building the product, pricing it, selling it** | The failure the gate exists to prevent | No — commitments are made to customers |

Ingestion, extraction, coordinate-preserving anchors, chunking, hybrid retrieval and the
evidence join are the same regardless of whether the buyer is a searcher, an independent
sponsor, a QoE provider, a sell-side advisor, or — under the deferred wedge in ADR-001 §
engineering alternative — an AEC firm. Every reversal candidate ADR-001 and ADR-002 keep
live consumes the same engine. That is what makes it safe to build before the buyer is
known, and it is the entire argument of this ADR.

`T1` and `T2` are also the two hypotheses in `HYPOTHESES.md` that **cannot** be answered by
interviews. They require a working extractor measured against labeled findings. The
priority order in `HYPOTHESES.md` correctly defers them behind `L1`/`D1`/`N1` for
*sequencing attention*, but deferring them behind *interviews that cannot test them* means
they are never tested until after commitments exist. That is backwards for the two rows
whose failure mode is technical.

## Decision

**Build the M1 ingestion and evidence engine now.** Scope in §4. It is validated against
`fixtures/reef-deal-room` only, scored by `docs/evaluation/DEAL_ROOM_EVAL.md`.

**Customer validation remains fully blocking for everything commercial.** Nothing in this
ADR authorizes pricing, selling, a pilot offer, receiving live customer documents, or
building the review UI described in `MVP.md`. The nineteen scorecard rows still gate that,
and `L1` still gates receiving a single real document.

**The automatic-fail condition survives intact and is restated here because this ADR is
exactly the document that could be misread as weakening it:** counting a fixture result as
customer or payment evidence is an automatic fail. A green eval run proves the mechanics
work. It proves nothing about demand. If a future session cites this ADR or an eval score
as market evidence, that session is doing the thing the scorecard was built to catch.

## 1 · What changed about the gate

The gate is not lowered. It is **split**.

| Gate | Applies to | Status |
|---|---|---|
| **Engine gate** (new) | Ingestion, extraction, anchors, chunking, retrieval, evidence API | Open. This ADR. Exit criteria in §6. |
| **Product gate** (unchanged) | Pricing, offers, pilots, live data, review UI, export, launch | **Closed.** All six conditions in `docs/README.md` still required. |

`docs/README.md` §"What must be true before application development begins" is amended to
scope its prohibition to the product gate. Its six conditions are otherwise unchanged, and
condition 5's four options — build M1, narrow and revalidate, pivot to engineering, stop —
are still the four options for the product.

## 2 · Why this is not rationalization

Recorded because the anti-gaming rules in `SCORECARD.md` name the scorer's conflict of
interest explicitly, and this ADR is written by that scorer.

The honest form of the argument is: *the founder wants to build, and the gate says do not.*
Three things distinguish this from moving a threshold to fit a result:

1. **No threshold moved.** Every number in `SCORECARD.md` is unchanged. Not one row was
   reclassified, softened, or marked Pass. The gate is intact and still closed.
2. **The permission is for work whose value does not depend on the wedge being right.**
   Had the argument been "build the diligence UI, the interviews will come," it would be
   the failure. The engine survives all four of condition 5's outcomes, including *stop*,
   because a coordinate-preserving evidence pipeline is not M&A-specific.
3. **It is written before the work, not after.** The anti-gaming rule that matters is that
   a superseding ADR is written *before the data is seen*. No eval has been run.

**What would make this ADR wrong:** if engine work becomes the reason interviews do not
happen. That is the actual risk here and it is not hypothetical — building is more
enjoyable than cold outreach, and this repository already contains ~5,000 lines of
documentation and zero customer conversations. Tripwire in §7.

## 3 · The platform question, deferred

A recommendation is live that Reef should be positioned as an intelligence platform with
diligence as the first paid vertical, rather than as a diligence application. **This ADR
does not decide that**, and no roadmap document is rewritten on it today.

It does not need deciding to start, because it changes nothing about §4. Ingestion,
anchors, chunking, retrieval and the evidence join are identical under both readings; the
divergence is in connectors, tenancy shape, and go-to-market, none of which is in scope.
Deciding it now would mean rewriting canonical strategy documents on the basis of zero
customer evidence — the same defect ADR-002 recorded about the original $1,500 price.

Revisit when the engine passes §6, in a superseding ADR, with the eval results in hand.

## 4 · Authorized scope

Exactly the pipeline below, headless, no review UI.

```
intake → extract → structure → chunk → embed → index → search API + evidence API
```

Per condition 6 of the `docs/README.md` gate, named explicitly:

| Required item | Value |
|---|---|
| **Exact user** | None. The engine has no end user. Its consumers are the eval harness and a CLI. The `MVP.md` user — a buyer with no analyst — is addressed by the product gate, not this one. |
| **Input boundary** | PDF (native and scanned), DOCX, XLSX, CSV, TXT, and ZIP/folder intake preserving paths and hashes. Exactly the `MVP.md` in-scope list and `D2`'s five formats. Nothing else. Unsupported formats are registered, never silently dropped. |
| **First checks (≤5)** | Deferred. This ADR authorizes no checks — the engine ends at retrieval and evidence resolution. The five checks are named in the superseding ADR that authorizes the finding layer. |
| **Deliverable** | Two HTTP APIs — search and evidence — plus a CLI that ingests a directory and reports a coverage statement. No export, no register, no report. |
| **Security boundary** | Local only. Fixture data exclusively. No customer document may enter the system under this ADR; `L1` is unanswered and gates that absolutely. Parsers run sandboxed with no outbound network. Tenant id is present in every record, object key, job and query from the first commit. |
| **Owner** | Isaiah Ramirez. |
| **Evaluation set** | `fixtures/reef-deal-room` at version 1.0.0, scored by `docs/evaluation/DEAL_ROOM_EVAL.md`. `ground-truth.json`, `GROUND_TRUTH.md` and `README.md` are never visible to the system under test. |
| **M1 exit criteria** | §6. |

### Explicitly not authorized

Everything in `MVP.md`'s "Explicitly out" table remains out, plus: the review UI, the
issue register, export, findings synthesis, the model-generated finding layer, pricing,
any pilot offer, any live customer document, and the 3D reef.

## 5 · Architecture authority

`docs/architecture/ARCHITECTURE.md` and `TECH_STACK.md` govern: Python 3.13, FastAPI,
SQLAlchemy 2 with Alembic, PostgreSQL as system of record, `pgvector`, PostgreSQL FTS,
object storage for originals and page renders, a provider-neutral model gateway.

`docs/reef/05-architecture.md` proposes a one-language TypeScript stack and is **not
authority** — ADR-001 marked `docs/reef/**` historical. Its ingest-stage decomposition,
chunking rules, evidence schema and threshold-gate reasoning are nonetheless the most
specific technical thinking in the repository and are adopted here on their merits, not on
their authority. Where the two conflict on stack, `docs/architecture/**` wins.

Three invariants are enforced in the database rather than in application code, because
application code has bugs and these are the ones that make Reef trustworthy:

1. A `claim` with zero rows in `support` cannot be persisted.
2. Row-level security on every tenant-scoped table. A query without a room id fails closed.
3. Every vector stores the id of the model that produced it.

## 6 · Engine exit criteria

The engine is done when, against `fixtures/reef-deal-room`:

- **G1, G2 at 100%** — every supplied file has a processing state, correctly classified
  processable or unprocessable. No silent drops.
- **G3 ≥95%** — parsing success across formats the engine claims to support.
- **G9 at 100%, G10 ≥95%, G12 at zero** — citation presence, location accuracy, and zero
  fabricated citations. G10 is the release gate; below 95% nothing proceeds.
- **G11 at 100%** — deterministic calculation reproducibility.
- Retrieval recall@12 measured and recorded against the 22 planted findings' source
  documents. No threshold set — this run establishes the baseline.
- The threshold gate returns "not found in this corpus" on questions whose answers were
  removed. Deliberately-removed questions are added to the eval set as part of this work.
- Table extraction sampled at 200 cells with type coercion measured. `000418` must not
  become `418`.
- Both runs scored: R1 only, then the R2 delta.

G4–G8, G13–G15 concern the finding layer and are **not** exit criteria here. They gate the
ADR that authorizes findings.

## 7 · Tripwire

The risk in §2 is that engine work displaces customer contact. Therefore:

**If no qualified interview has been conducted by 2026-09-06, engine work stops** until
five are booked. Not paused for a sprint — stopped, recorded in `DECISION_LOG.md`, and the
reason for the displacement written down.

One month is enough to build the pipeline and is short enough that the sunk cost cannot
justify itself. `L1` in particular needs one call with a transaction attorney and can be
answered in a week without any of this work existing.

## 8 · What would reverse this ADR

- The engine misses G10 after one bounded remediation cycle. `T1` fails, and the anchor
  claim that differentiates Reef is not deliverable. This is the finding the ADR exists to
  surface early.
- `L1` returns no workable consent path and no customer-controlled processing option. The
  engine still runs, but on the customer's infrastructure — an architecture requirement,
  not a stop, and one this design already satisfies.
- The tripwire fires and interviews still do not happen. The problem is not the roadmap.
- ADR-001 is superseded and the wedge changes. The engine survives; §4's format boundary
  is renegotiated.

## References

- [ADR-001](ADR-001-initial-market-wedge.md) — wedge selection, unchanged
- [ADR-002](ADR-002-validation-package-consolidation.md) — validation package, unchanged
- [SCORECARD.md](../validation/SCORECARD.md) — product gate, unchanged and closed
- [HYPOTHESES.md](../validation/HYPOTHESES.md) — `T1`, `T2` are what the engine tests
- [MVP.md](../product/MVP.md) — the product this engine will later serve
- [DEAL_ROOM_EVAL.md](../evaluation/DEAL_ROOM_EVAL.md) — the scoring instrument
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md), [TECH_STACK.md](../architecture/TECH_STACK.md) — stack authority
