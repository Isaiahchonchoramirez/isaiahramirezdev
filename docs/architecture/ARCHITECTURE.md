# Reef Architecture

> High-level target architecture. It defines boundaries and graduation triggers, not an implementation mandate. No application architecture work begins until the validation scorecard passes and a follow-up ADR authorizes M1.

## Architectural thesis

Reef is an evidence system with AI-assisted analysis. Its central invariant is not “all content is searchable.” It is:

> Every derived claim is reproducibly connected to tenant, source version, source region, extraction run, check version, model invocation, and human disposition.

The first deployment should be a modular monolith plus isolated workers. This keeps transactions, authorization, and iteration understandable while preserving interfaces that can later become services.

## Logical architecture

```text
Browser / desktop web
        |
        v
API + identity boundary
  | projects | reviews | findings | evidence | exports | billing |
        |
        +-----------------------+
        |                       |
        v                       v
PostgreSQL                 Object storage
metadata, tenancy,         originals, normalized artifacts,
workflow, evidence graph   page images, exports
        |                       |
        +-----------+-----------+
                    |
                    v
              Durable job queue
                    |
      +-------------+-------------+
      |             |             |
      v             v             v
  ingestion      indexing      assurance/eval
  workers        workers       workers
      |             |             |
      +-------------+-------------+
                    |
                    v
        Search + model gateway
    lexical/vector   routed models
```

## Frontend

React and TypeScript provide a desktop-first review application. The frontend owns interaction, local view state, accessible document comparison, optimistic low-risk updates, and streamed progress. It does not own authorization decisions, final workflow transitions, or model prompts.

Use server-rendered application scaffolding only if it reduces authentication and routing work. WebGL is an optional corpus-map view after product-market evidence, loaded separately and never required for a core task.

## Backend

Start with Python and FastAPI because document, ML, and evaluation ecosystems dominate the work. Organize one deployable application into modules with explicit interfaces:

- identity and tenancy;
- projects and packages;
- documents and versions;
- processing runs;
- evidence and derived claims;
- findings and dispositions;
- search and question answering;
- reporting;
- usage and billing;
- audit and administration.

Go is introduced only for a measured hot path or a separately scalable edge service. Node is limited to tooling or capabilities with a strong ecosystem advantage.

## AI orchestration

The model gateway provides provider abstraction, policy routing, prompt and schema versioning, structured output validation, token/cost accounting, retries, redaction policy, and full trace identifiers. Business modules request typed tasks; they do not call model vendors directly.

Deterministic parsing and rules run before generative inference. Model output is treated as an untrusted proposal until schemas, evidence requirements, and confidence rules pass. Material findings require a verifier step or human review.

Model routing optimizes task fitness, latency, privacy, and evaluated quality. It must never switch models based only on price without a passing evaluation for that task version.

## Storage

- **PostgreSQL:** system of record for tenant data, workflow, document metadata, evidence nodes/edges, job state, model traces, and audit records.
- **Object storage:** immutable originals, normalized representations, OCR/layout artifacts, page renders, and generated exports. Objects are content-addressed where practical and encrypted with tenant context.
- **Vector search:** begin with `pgvector` if evaluation and scale permit. Graduate to Qdrant or another dedicated engine when indexing volume, filtering, recall, or operations justify it.
- **Lexical search:** PostgreSQL full-text may serve pilots. Adopt OpenSearch when corpus scale, highlighting, analyzers, or hybrid ranking require it.
- **Cache/coordination:** Redis only for ephemeral cache, rate limits, and queue support. It is never the sole store of workflow truth.

## Knowledge graph

The first graph is a relational evidence graph in PostgreSQL. Nodes include source versions, regions, extracted entities, requirements, references, findings, and decisions. Typed edges capture derivation, reference, contradiction, supersession, and disposition.

Neo4j is not a day-one dependency. Introduce a dedicated graph store only after measured queries are painful in PostgreSQL, multi-hop exploration becomes product-critical, and the team can operate a second source projection. PostgreSQL remains the authority; graph indexes are rebuildable projections.

## Search and retrieval

Retrieval is hybrid and permission-filtered before ranking:

1. identify tenant, project, package, revision, and document scope;
2. generate lexical and semantic candidates;
3. merge and rerank using task-specific evaluation;
4. preserve structural neighbors such as the full table row, drawing region, or enclosing clause;
5. require evidence coverage for every answer sentence;
6. abstain when evidence falls below the task threshold.

Chunking never discards stable source coordinates. A text fragment without a route back to its rendered source is unusable for Reef.

## Workers and streaming

Long-running work executes through a durable queue with idempotent jobs, leases, retry budgets, dead-letter handling, cancellation, and per-tenant quotas. Job state lives in PostgreSQL or a durable workflow engine, not only in a broker.

The browser receives progress and partial results through server-sent events first. WebSockets are reserved for collaboration features that require bidirectional presence. Kafka or a cloud event bus appears only when independent consumers and throughput justify the operational cost.

## Authentication and authorization

Use a managed OpenID Connect provider initially. The domain model still owns organizations, memberships, roles, project access, and service identities. Authorization is enforced in backend modules and tested at tenant boundaries.

Enterprise progression: SAML/OIDC federation, SCIM, group mapping, just-in-time provisioning, service accounts, and policy-based access. Private links and customer-managed keys are later contract-driven capabilities.

## Security

- Tenant identity is present in every persistent record, object key, cache key, job, log context, and search filter.
- Encryption is mandatory in transit and at rest; secrets use a managed secrets service.
- Uploaded content is untrusted: scan, isolate parsers, cap resources, and block outbound network access from document workers.
- Defend against prompt injection by separating source content from instructions, constraining tools, and requiring evidence validation.
- Keep immutable audit events for access, exports, role changes, findings, and administrative actions.
- Define retention, deletion, legal hold, backup, restore, and model-provider data-use policies before enterprise launch.
- Map controls toward SOC 2; add HIPAA, FedRAMP, or other regimes only for a named market commitment.

See [ENGINEERING_PRINCIPLES.md](ENGINEERING_PRINCIPLES.md) for mandatory engineering rules.

## Billing

Billing is based on review packages and organization plans, with transparent document/processing limits. Usage events are immutable and idempotent. Model tokens are an internal cost metric, not the customer unit. Entitlements are checked in the product domain rather than scattered through UI conditionals.

## Observability

OpenTelemetry-compatible traces connect API requests, jobs, parser versions, retrieval, model calls, findings, and exports. Required signals include:

- ingest throughput, failure class, retry, and age;
- end-to-end time to first finding and review-ready package;
- retrieval recall and evidence-anchor validity on evaluation sets;
- model latency, cost, structured-output failures, and provider errors;
- accepted/rejected finding rates by check version;
- authorization denials, suspicious access, and export volume;
- customer-visible SLOs and error budgets.

Content and extracted values are excluded from logs by default.

## Deployment progression

| Stage | Deployment | Trigger to graduate |
| --- | --- | --- |
| Pilot | Managed containers, PostgreSQL, object storage, one worker pool | Real customers and repeat processing |
| Growth | Separate API/worker scaling, dedicated search, multi-AZ data services | SLO or workload evidence |
| Enterprise | Regional isolation, stronger key/identity controls, tenant placement | Contract and data-residency demand |
| Private | Helm or equivalent deployment into customer VPC/private cloud | Repeatable paid demand and support capacity |
| Government | Dedicated compliant environment and supply-chain controls | Chosen government market and funded authorization path |

Kubernetes is a packaging and operations choice, not a scalability badge. Use it when deployment topology or private-cloud distribution makes it cheaper than managed containers.

## Architecture decision rules

- Prefer reversible decisions until evidence forces a one-way commitment.
- Every extracted or generated artifact is versioned and reproducible.
- Every asynchronous command has an idempotency key.
- Every projection can be rebuilt from authoritative records.
- Every customer-visible claim has evidence or an explicit unsupported state.
- No new infrastructure component without an owner, SLO, threat model, backup story, and exit plan.
