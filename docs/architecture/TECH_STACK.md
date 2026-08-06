# Technology Stack

This document records defaults and adoption triggers. A default reduces needless debate; it is not permission to install everything on day one.

## Application defaults

| Layer | Default | Rationale |
| --- | --- | --- |
| Web application | React, TypeScript | Strong component and accessibility ecosystem; shared product skill |
| App framework | Next.js or equivalent only where auth/routing/server rendering helps | Avoid framework ceremony that does not improve the review product |
| Styling | Tailwind plus tokenized CSS variables | Fast iteration with enforceable design tokens |
| Motion | Motion for interface; GSAP only for complex sequenced storytelling | Keep common interaction motion declarative |
| 3D | Three.js / React Three Fiber, separately loaded | Optional corpus map, never core dependency |
| API | Python 3.13+, FastAPI, Pydantic | Fits document/AI ecosystem and typed HTTP contracts |
| Performance services | Go, only after profiling | Strong concurrency and deployment profile when a real hot path exists |
| Primary database | PostgreSQL | Transactions, relational workflow, JSON, full text, extensions, mature operations |
| ORM/migrations | SQLAlchemy 2 + Alembic or a comparably explicit typed stack | Visible SQL behavior and controlled schema evolution |
| Object storage | S3-compatible | Immutable source and artifact storage across cloud/private deployments |
| Queue | Managed durable queue initially; Temporal when workflows require it | Avoid running a workflow platform before retries and long orchestration demand one |
| Cache | Redis when measured | Ephemeral coordination only |
| Vector | pgvector initially | One operational system during discovery |
| Search | PostgreSQL FTS initially; OpenSearch on trigger | Dedicated search only when analyzers, scale, and hybrid retrieval require it |
| Graph | PostgreSQL adjacency/evidence tables initially | Evidence consistency matters more than graph branding |
| Models | Provider-neutral gateway with task registry | Models remain replaceable and evaluated |

## Document processing

Prefer proven parsers and OCR services with reproducible, coordinate-preserving output. Buy commodity extraction before building it. Maintain a normalized document representation containing pages, blocks, tables, coordinates, reading order, style hints, and source hashes.

Parser selection is driven by a fixture suite from design-partner documents. No vendor is selected because its demo looks good on clean PDFs.

## API and event contracts

- JSON/HTTP for synchronous product APIs; OpenAPI is generated and checked.
- Server-sent events for processing progress and streamed results.
- Internal commands/events use versioned schemas and idempotency identifiers.
- gRPC appears only for measured service-to-service needs.
- Public webhooks are signed, replay-safe, documented, and retryable.

## Infrastructure

| Stage | Default |
| --- | --- |
| Local | Docker Compose or equivalent for database, object store, and queue dependencies |
| Pilot | Managed container runtime, managed PostgreSQL, managed object storage, managed secrets |
| Growth | Infrastructure as code, separate API and worker pools, regional environments |
| Private cloud | OCI images and a supported Helm package only after paid demand |

Terraform or OpenTofu is the infrastructure-as-code default once shared environments exist. Kubernetes is adopted for private packaging or operational scale, not as the opening topology.

## Security and identity

- Managed OIDC identity for initial deployment.
- Cloud key management for encryption keys; envelope encryption for sensitive artifacts where required.
- Short-lived workload identity instead of static cloud credentials.
- Sandboxed parsing workers with no default outbound network.
- Dependency lockfiles, automated scanning, signed build artifacts, provenance, and SBOM generation.

## Observability and analytics

- OpenTelemetry APIs and semantic conventions.
- Vendor-neutral traces, metrics, and structured logs exported to a managed backend.
- Error reporting with tenant-safe context and content redaction.
- Product analytics limited to events needed for activation, review outcomes, retention, and billing; no session replay on confidential content surfaces.

## Testing and evaluation

- `pytest` for backend units/integration/property tests.
- Type checking and linting enforced in CI.
- Browser component and accessibility tests plus Playwright for critical user paths.
- Golden document fixtures for extraction coordinates and revision diffs.
- Versioned AI evaluation datasets with positive, negative, adversarial, and abstention cases.
- Load tests for package ingest, decompression limits, queue recovery, and common reads.

## Graduation triggers

| Technology | Adopt when |
| --- | --- |
| Qdrant/dedicated vector store | pgvector misses recall/latency/filtering SLOs at representative scale |
| OpenSearch | lexical highlighting, analyzers, corpus size, or hybrid ranking exceed PostgreSQL’s practical envelope |
| Neo4j | product-critical multi-hop graph queries are proven and relational implementations are the bottleneck |
| Temporal | workflows span many retries/hours/days and hand-built orchestration is causing correctness failures |
| Kafka/event streaming | several independent consumers need replayable high-throughput events |
| Kubernetes | topology, private deployment, or utilization makes it operationally cheaper than managed containers |
| Go service | profiling proves Python cannot meet a specific SLO economically |

Every graduation includes benchmarks, migration/rebuild strategy, operational ownership, and a rollback plan.
