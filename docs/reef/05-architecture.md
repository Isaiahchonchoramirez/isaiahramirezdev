# 05 · Technical architecture

Design, not implementation. The point of this document is that a session writing code
does not have to re-decide any of it.

---

## Principles

### 1. One database until a measurement forces a second

The brief specifies Postgres, Neo4j, Qdrant, Redis, ClickHouse, S3, Kafka, Temporal.
That is eight systems to operate, back up, monitor, upgrade and pay for, run by a team
of one. It is the most reliable way to spend the first year on infrastructure instead of
on the product.

**Postgres does all of it at the scale Reef will actually reach in year one:**

| Need | Postgres does it with | Real ceiling |
|---|---|---|
| Vectors | `pgvector` + HNSW | ~5M chunks per tenant before latency degrades |
| Full text | `tsvector` + GIN | Tens of millions of rows |
| Graph | Adjacency table + recursive CTE | Fine to depth 4–5 at Reef's node counts |
| Queue | `SKIP LOCKED` table + `LISTEN/NOTIFY` | Thousands of jobs/min |
| Cache | Nothing. Query it. | Ordinary |
| Analytics | Ordinary aggregates | Millions of events |

A room is 1,400 documents ≈ 400k chunks. A hundred rooms is 40M chunks across a hundred
isolated tenants, none of which query each other. This is not a scale problem, and
treating it as one is how the product doesn't get built.

Object storage (S3/R2) is the one exception from day one, because binaries do not belong
in a database.

**Graduation triggers.** Move only when the number is hit, not when it feels close:

| Move to | When |
|---|---|
| Qdrant / Turbopuffer | pgvector p95 recall query > 300ms at realistic filters, after HNSW tuning |
| Neo4j / KuzuDB | Recursive CTE p95 > 300ms at depth 4, or a real need for variable-length pattern matching |
| Redis | Postgres connection pressure from cache reads, or a genuine need for pub/sub fan-out |
| Temporal | Workflows exceed ~10 steps with compensation logic, or debugging retries becomes the daily activity |
| ClickHouse | Analytics queries measurably slow the transactional database |
| Kafka | Never, probably. There is one producer. |

Write the trigger into the monitoring dashboard the day the component ships, so the move
is a threshold crossing rather than an opinion.

### 2. The evidence model is the schema

Everything else is replaceable. If provenance is designed as an afterthought and bolted
on, it will be approximate, and approximate provenance is worse than none because it is
trusted.

### 3. Models are rented and swappable

Every model call goes through one router. No provider SDK is imported anywhere but there.
Model quality resets every six months and Reef must be able to take the upgrade in an
afternoon.

### 4. Deterministic where possible, generative where necessary

Parsing, chunking, hashing, diffing, statistics, and citation binding are deterministic
code and are tested against fixtures. Models are used for extraction, classification and
synthesis, and their output is always bound back to deterministic anchors. The existing
DataGate engine is exactly this kind of code and it moves into Reef unchanged.

---

## Shape

```
Browser ── React SPA ── lazy reef chunk (Three.js, own canvas, own loop)
   │
   ├─ REST/JSON for CRUD
   └─ SSE for streaming answers and processing state
   │
API (TypeScript, Fastify or Hono — one language across the stack)
   │
   ├── Postgres (tenant-scoped: documents, chunks, embeddings, graph, findings, jobs, events)
   ├── Object storage (originals, page renders, exports)
   └── Job workers (same codebase, different entrypoint)
          │
          ├─ parse ─ OCR ─ structure ─ chunk ─ embed ─ extract ─ link ─ check
          │
          └── Model router ── Anthropic · OpenAI · a local OCR/vision model
```

One language, one repo, one deploy target. The worker is the API process with a
different entrypoint, so there is no second thing to keep in sync.

---

## Ingest pipeline

Eight stages, each idempotent, each independently retryable, each recording its output so
a failure never re-runs the expensive stages before it.

| Stage | Does | Notes |
|---|---|---|
| **1 Intake** | Hash, dedupe, detect type by magic bytes, expand archives | Never trust extensions. Preserve folder paths as evidence about the seller. |
| **2 Render** | Page images for every document | Needed for the evidence highlight, and for vision fallback |
| **3 Text** | Native extraction; OCR when the text layer is absent or garbage | Detect garbage text layers explicitly — a bad text layer is worse than none because it silently poisons retrieval |
| **4 Structure** | Headings, sections, tables, lists, signature blocks, page and bbox for every element | This is where most competitors are weak and where quality is decided |
| **5 Chunk** | Structure-aware split — never mid-clause; tables stay whole | Every chunk keeps `document_id`, `page`, `bbox`, `char_range` |
| **6 Embed** | Chunk vectors, batched | Store the model id on every vector. Re-embedding is otherwise unauditable. |
| **7 Extract** | Entities, dates, amounts, parties, obligations to schema | Each extraction carries the span that produced it or it is discarded |
| **8 Link** | Cross-references, entity resolution, contradictions | Produces the graph and the vents |

**Progressive availability.** A document is queryable after stage 6. Stages 7 and 8 enrich
it. The user searches while the room is still processing, which makes a 20-minute wait
feel like two.

**Failure is per document, never per batch.** One corrupt PDF in 1,400 must never stop the
other 1,399, and the 1 is reported by name.

### Chunking, specifically

Chunking quality determines answer quality more than model choice does, and it is
entirely in Reef's control.

- Split on structure, then size: target 800 tokens, hard max 1,500
- Never split a clause, a table row, or a signature block
- Prepend breadcrumb context to each chunk (`Master Lease › §12 Assignment ›`) so a
  retrieved chunk is interpretable alone
- 15% overlap at section boundaries only, not everywhere — uniform overlap wastes index
  space and creates near-duplicate results
- Tables become both a whole-table chunk and per-row chunks; questions arrive at both
  granularities

---

## The evidence model

The core schema. Everything user-facing derives from it.

```
document   id, room_id, sha256, filename, folder_path, mime, pages,
           ocr_confidence, version_id
page       document_id, number, image_key, width, height
span       id, document_id, page, bbox[], char_start, char_end, text
chunk      id, document_id, span_ids[], breadcrumb, text, embedding, embed_model
claim      id, room_id, text, kind(finding|answer|extraction),
           confidence, model_id, created_at
support    claim_id, span_id, relevance          ← the join that makes Reef trustworthy
entity     id, room_id, kind, canonical_name
mention    entity_id, span_id
edge       from_entity, to_entity, kind, span_ids[], confidence
```

**The invariant, enforced at write time, not at render time:** a `claim` with zero rows
in `support` cannot be persisted. Not hidden in the UI — rejected by the database. A
`CHECK` constraint or a trigger, so no future code path can bypass it.

**Citation binding.** The model does not produce citations; it produces text. Binding is a
deterministic post-pass: for each generated sentence, match against the retrieved chunks
by embedding similarity plus n-gram overlap. Above threshold, bind to the span. Below, the
sentence is dropped and the answer is regenerated with that gap named. Asking a model to
cite itself produces plausible-looking citations that point at the wrong page, which is
the worst possible failure — an audit trail that is wrong.

---

## Retrieval

```
query
 ├── rewrite (expand abbreviations, decompose multi-part questions)
 ├── parallel:
 │     ├── vector search, top 50
 │     ├── BM25 full text, top 50
 │     └── graph expansion from matched entities, top 20
 ├── reciprocal rank fusion
 ├── cross-encoder rerank → top 12
 ├── threshold gate ──── below? → "not found in this corpus"  ← a result, not an error
 └── synthesize → bind citations → verify → stream
```

The threshold gate is the most important component in the system and the one most likely
to get quietly weakened to improve a demo. Its threshold is a tested constant with a
named owner, and the eval suite contains questions whose answers were deliberately
removed from the corpus. Those questions must return "not found." A release that
regresses them does not ship.

## Model routing

One module. Providers behind one interface. Every call records model, tokens, latency,
cost and outcome.

| Job | Class | Why |
|---|---|---|
| Query rewrite | Small, fast | Latency-critical, easy task |
| Rerank | Cross-encoder | Purpose-built, cheap |
| Extraction to schema | Mid, structured output | Volume work, needs consistency |
| Finding synthesis | Frontier | Quality decides the product |
| Memo prose | Frontier | It leaves the building with the customer's name on it |
| OCR / vision | Specialist | Better and cheaper than frontier vision |

Cost control: cache by content hash plus prompt version; batch extraction; never re-embed
without a version bump; per-room cost ceiling with a visible meter, because an unbounded
cost per customer at a fixed price is how the business fails quietly.

### Evals

Not optional, and built at M1 rather than retrofitted.

- A golden set of 200 questions across three real rooms, human-answered
- Metrics: retrieval recall@12, citation accuracy (does the span support the claim),
  refusal correctness on the deliberately-removed set, and end-to-end finding recall
  against a hand-built checklist
- Runs in CI on every prompt or model change; regressions block the merge
- **Citation accuracy is the release gate.** Below 95%, nothing ships.

---

## Security and tenancy

- **Row-level security** on every tenant-scoped table, enforced in Postgres. Application
  code is not the boundary; application code has bugs.
- Every query carries `room_id`. A query without one fails closed.
- AES-256 at rest, TLS 1.3 in transit, per-tenant encryption keys at M6.
- Signed, short-lived, single-use URLs for object storage. Never public buckets.
- **Zero-retention model endpoints only.** Document content is never used for training,
  and this is a contractual term with the providers, not an assumption. It is also the
  first question every buyer asks.
- Full audit log — every access, query, export, share — from M3, because retrofitting an
  audit log is miserable and enterprise buyers ask for one immediately.
- Deletion is real. Documents, chunks, embeddings, page renders, derived claims, cached
  model outputs. A "delete" that leaves vectors behind is a lie with legal consequences.
- Uploads are the attack surface: size caps, magic-byte validation, archive bomb limits,
  malware scan, parse in a sandboxed worker with no network and no credentials.

## Enterprise deployment

Designed now so it isn't a rewrite later; built at M6 on demand.

| Tier | Shape |
|---|---|
| Cloud | Shared multi-tenant, RLS-isolated. Default. |
| Dedicated | Single-tenant database and workers, Reef-operated |
| VPC | Customer's cloud account, Reef-managed via a deployment agent |
| On-prem | Air-gapped, local models only, quality explicitly reduced and stated in writing |

The requirement this places on today's design: **no cross-tenant global state.** No shared
cache keyed without tenant, no global embedding index, no cross-room analytics in the
request path. Hold that line from the first commit and every tier above becomes a
deployment exercise rather than a rewrite.

---

## What the frontend needs from this

- SSE for answer streaming and processing state. Not WebSockets — one direction, and SSE
  reconnects for free.
- Every entity deep-linkable by stable id.
- The reef view loads a single aggregated scene payload, not N queries. Target under
  400KB for a 1,400-document room, which means server-side layout and level-of-detail,
  not shipping the raw graph.
- Optimistic writes on findings and comments; the server reconciles.
