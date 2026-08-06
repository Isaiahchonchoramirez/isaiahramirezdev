> **Historical specification — not implementation authority.** Team charters and
> sequencing below are preserved context, not approved assignments. Start with
> [`../README.md`](../README.md).

# 06 · The executing organization

---

## The reality this is written for

The brief asked for teams as though Reef had a hundred engineers. It has one person and a
set of agents. Writing an org chart for the imaginary version produces a document that
cannot be executed by the person holding it, which is the planning equivalent of shipping
a landing page for a product that doesn't exist.

So: **roles are charters, not headcount.** Each one is a durable context — a scope, a set
of inputs, a definition of done, and a metric — that an agent session is handed and that a
human reviews the output of. Some charters map to a `.claude/agents/*.md` definition. Most
are just a prompt preamble and a document to keep current.

**The binding constraint is not agent throughput. It is review bandwidth.** Agents produce
code faster than one person can read it, and unreviewed agent code is a liability that
compounds. So the organization is a queue with a width of roughly two, not a chart with
twelve parallel tracks.

### Three rules that keep this from degrading

1. **Nothing merges unreviewed by a human.** Not "spot-checked." Read. If output exceeds
   review capacity, the answer is fewer agents, not faster reading.
2. **One charter per session.** Agents given two domains do neither well, and the failure
   is hard to see because the output still looks plausible.
3. **Every charter owns a document in `docs/reef/` and updates it in the same commit as
   the code.** A charter whose document has drifted from the code has stopped being a
   charter and become folklore.

---

## Charters

Each: mission, inputs, outputs, done, metric, anti-goal.

### Architect
Owns coherence across everything. The only charter permitted to change `05-architecture.md`
or a graduation trigger.
**In:** every proposed design change. **Out:** decisions, written down, with the reasoning.
**Done:** the decision is in the doc and the trigger is on the dashboard.
**Metric:** number of times a shipped decision had to be reversed.
**Anti-goal:** writing production code. An architect who implements stops reviewing.

### Ingest
Stages 1–5. Parsing, OCR, structure, chunking. **The single highest-leverage charter in the
project** — everything downstream inherits its quality ceiling.
**In:** real documents, especially bad ones. **Out:** the pipeline, plus a fixture corpus.
**Done:** structure extraction ≥90% on the held-out set, including scans.
**Metric:** structure F1; documents processed per dollar.
**Anti-goal:** touching retrieval. Different problem, different failure modes.

### Retrieval
Stages 6–8 and query time. Embedding, hybrid search, rerank, the threshold gate.
**In:** chunks, the golden question set. **Out:** the retrieval service, the eval harness.
**Done:** recall@12 ≥ 0.9 and refusal correctness = 1.0 on the removed-answer set.
**Metric:** recall@12, refusal correctness, p95 latency.
**Anti-goal:** improving a metric by lowering the threshold. This is the charter most able
to cheat and least likely to be caught.

### Evidence
The claim/support model, citation binding, the verification pass, the database invariant.
**In:** generated text, retrieved spans. **Out:** binding service, constraints, tests.
**Done:** unsupported claims are impossible to persist.
**Metric:** citation accuracy — the release gate. Below 95% nothing ships.
**Anti-goal:** relying on a model to cite itself.

### Analysis
The checklist, findings, severity, consequence prose, gap detection, the memo.
**In:** M0's real checklist, the corpus. **Out:** checklist engine, memo templates.
**Done:** memo quality matches the hand-written M0 memos, judged by the M0 customers.
**Metric:** finding recall against hand-built ground truth; false-positive rate.
**Anti-goal:** more findings. Precision beats recall here — a memo with three wrong items
is not forwarded, and forwarding is the metric that matters.

### Frontend
Application shell, working surfaces, the design system. Owns the performance budgets.
**In:** `03-ux.md`, `04-visual-and-world.md`, API contracts. **Out:** the app.
**Done:** all eight states exist on every surface; keyboard-complete; budgets met.
**Metric:** interactive time, search latency, Lighthouse a11y = 100.
**Anti-goal:** importing Three.js. Physically separate chunk, enforced by a bundle check
in CI.

### World
The reef. Scene, shaders, layout, LOD, the degradation ladder.
**In:** `04-visual-and-world.md`, the aggregated scene payload. **Out:** the lazy chunk.
**Done:** 60fps on a two-year-old MacBook Air, all four degradation tiers working, and
zero measurable effect on the list view.
**Metric:** frame time, bundle size, fallback rate in the wild.
**Anti-goal:** making anything reachable only in 3D.

### Platform
Deploy, monitoring, cost, backups, CI, the job system.
**In:** everything. **Out:** it stays up and the bill is legible.
**Done:** deploy is one command, rollback is one command, cost per room is on a dashboard.
**Metric:** uptime, cost per processed document, deploy frequency.
**Anti-goal:** Kubernetes. At this scale it is a hobby with a bill attached.

### Security
Tenancy, RLS, encryption, audit, upload sandboxing, retention, the trust page.
**In:** the schema, the upload path. **Out:** controls, and the answers to the buyer's
security questionnaire.
**Done:** RLS on every tenant table, deletion verified end to end including caches.
**Metric:** cross-tenant leaks, which is zero or the project is over.
**Anti-goal:** SOC 2 theater before a customer has asked.

### Product
Talks to users. Owns the checklist, the roadmap, and killing things.
**In:** customer conversations, usage data. **Out:** decisions about what not to build.
**Done:** every milestone exits against its stated criterion, not against a feeling.
**Metric:** memo forward rate. The one number that says whether any of this matters.
**Anti-goal:** accepting feature requests as specifications.

### Design
Visual system, motion, the identity, the marketing site.
**In:** `04-visual-and-world.md`. **Out:** components, the film, the site.
**Done:** a stranger can tell Reef apart from every other AI product at a glance.
**Metric:** does the screenshot get forwarded.
**Anti-goal:** decoration on working surfaces.

### Growth
Distribution. Landing, docs, launch, the searcher communities, the broker channel.
**In:** the product, the film. **Out:** customers who arrived without a conversation.
**Done:** M3's exit criterion — three self-serve payments from strangers.
**Metric:** free→paid conversion; referral rate.
**Anti-goal:** paid acquisition before organic works. It buys a number that teaches nothing.

---

## Sprint order

| Sprint | Active | Blocked on | Ships |
|---|---|---|---|
| 0 | Product | — | Three concierge memos, the real checklist |
| 1 | Ingest, Architect | Sprint 0's document sample | Pipeline through chunking |
| 2 | Retrieval, Evidence | Ingest | Cited answers, eval harness |
| 3 | Analysis | Retrieval + Evidence | The memo |
| 4 | Frontend, Platform | Analysis | The web app |
| 5 | Security, Growth | Frontend | Billing, launch, first strangers |
| 6 | World, Design | Sprint 4's data model | The reef, the film |
| 7 | Frontend, Analysis | — | Teams, versioning, diff |

## Critical path

```
checklist(P0) → ingest(1) → retrieval(2) → evidence(2) → analysis(3) → frontend(4) → launch(5)
                                                                          │
                                                            world(6) ─────┘ parallel
```

**Sprint 1 is the risk.** Ingest quality caps everything after it and is the least
predictable — bad scans, broken PDFs, tables that defeat every parser. Budget double. If
it slips, the correct response is to narrow the accepted document types, not to proceed
with 70% extraction and hope retrieval compensates. It cannot.

**Sprints 2 and 3 are where the product is decided.** Everything before is plumbing and
everything after is packaging.

**Sprint 6 is scheduled deliberately late** and will pull hard against that placement the
entire time. That pull is the reason it has a sprint number at all.

---

## The review queue

```
agent produces  →  human reads  →  merge | revise | discard
                        ▲
              width ≈ 2 concurrent
```

When the queue is full, agents stop. An agent working on something that cannot be reviewed
this week is producing merge conflicts, not progress.

Discard is a normal outcome and should happen often. Agent work is cheap to produce and
expensive to maintain, and the asymmetry means the bar for keeping something must be
higher than the bar for writing it, not lower.

## Division of labor across models

Per the brief's suggestion, and it is a good one:

| | Best used for |
|---|---|
| **Claude** | Specification, architecture, long-form reasoning, implementation plans, prose, review of whole diffs |
| **Codex / GPT** | Focused implementation, API design, Three.js and shader work, performance profiling, debugging |

The failure mode to avoid: asking both to solve the same problem and picking the answer
you like. That is not a second opinion, it is a coin flip with extra steps. Split by
domain, keep this document as the shared contract, and let each read it rather than
re-deriving the decisions.
