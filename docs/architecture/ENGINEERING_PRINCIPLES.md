# Engineering Constitution

These rules apply to employees, contractors, and AI agents. Exceptions require a written architecture decision with owner, scope, expiry or review date, and rollback plan.

## 1. Customer truth

1. Build from observed workflows and representative data, not imagined enterprise diagrams.
2. Every feature names its user, trigger, deliverable, and measurable outcome.
3. Favor ruthless focus over breadth. One paid workflow comes before platform generality.
4. Do not preserve a capability merely because it already exists.
5. No dark patterns, fake activity, invented metrics, or simulated production behavior presented as real.

## 2. Evidence and AI

1. Every material generated claim must link to inspectable source evidence.
2. “Not established by the available evidence” is a first-class result.
3. Model output is untrusted input. Validate schemas, permissions, evidence, and action bounds.
4. Prompts, models, retrieval settings, checks, and evaluation datasets are versioned.
5. A model change cannot ship to a consequential task without comparative evaluation.
6. Human approval is required for external publication, destructive transformation, and professional sign-off.
7. Never train on or retain customer content beyond the governing agreement and policy.

## 3. Architecture

1. Start with the simplest deployable architecture that satisfies current reliability and security needs.
2. Every subsystem owns a clear API and authoritative data boundary.
3. Prefer a modular monolith until independent scaling, isolation, ownership, or deployment proves a service boundary.
4. Asynchronous work is idempotent, resumable, cancellable, observable, and bounded.
5. Derived indexes and graph projections are rebuildable.
6. Backward compatibility is the default for public APIs, stored artifacts, and events. Breaking changes require a version and migration plan.
7. No infrastructure dependency without an owner, SLO, threat model, cost model, backup/restore path, and exit strategy.

## 4. Data

1. Originals are immutable. Corrections and transformations create new versions.
2. Provenance follows data through parsing, extraction, inference, review, and export.
3. Tenant context is explicit in schemas, jobs, object paths, indexes, caches, logs, and tests.
4. Migrations are reviewed, reversible where possible, rehearsed on production-like volume, and monitored.
5. Retention, deletion, legal hold, and backup behavior are product requirements, not operational afterthoughts.
6. Data quality rules state their assumptions and never silently destroy information.

## 5. Security and privacy

1. Apply least privilege to people, services, models, and support tooling.
2. Deny cross-tenant access by construction and test it continuously.
3. Treat uploads, archives, URLs, markup, and model context as hostile.
4. Secrets never enter source, logs, analytics, prompts, or client bundles.
5. Security-sensitive events are auditable and tamper-evident.
6. Dependencies, images, and build artifacts are pinned, scanned, and traceable through a software bill of materials.
7. Incident response, restore drills, and access reviews are practiced before compliance claims are made.

## 6. Quality

1. No feature is complete without automated tests proportional to its risk.
2. Every defect fix adds a regression test unless technically impossible and documented.
3. Consequential AI paths require offline evaluations, negative cases, and production feedback metrics.
4. Test behavior at module boundaries; avoid tests that merely reproduce implementation details.
5. Flaky tests are defects. Quarantine is time-boxed and owned.
6. Documentation changes with behavior in the same pull request.
7. Code review checks correctness, threat surface, operability, accessibility, and deletion/migration effects, not only style.

## 7. Performance and reliability

1. Set budgets before optimizing: interaction latency, page weight, processing time, memory, and cost per package.
2. Never optimize prematurely; always profile before and after a performance change.
3. Core review interactions target under 100 ms response to input and under 2 seconds for common server reads at the 95th percentile.
4. Long work shows real progress, supports retry, and never blocks the browser main thread.
5. Services define SLOs and error budgets before promising availability.
6. Degrade explicitly: partial processing and stale states are labeled, not hidden.
7. Capacity tests use representative document sizes and adversarial archives, not toy files.

## 8. Accessibility and design quality

1. WCAG 2.2 AA is the minimum target for product workflows.
2. Every action is keyboard reachable, focus-visible, named, and screen-reader understandable.
3. Reduced-motion, high-contrast, zoom, reflow, and no-WebGL modes are designed paths.
4. Color, depth, motion, and 3D position never carry meaning alone.
5. Animation may orient or explain state; it may not delay work.
6. Loading, empty, error, partial, offline, permission-denied, and unsupported states ship with the feature.

## 9. Operations

1. Structured logs, metrics, and traces connect customer-visible work end to end without recording content by default.
2. Alerts correspond to user impact and include an owner and runbook.
3. Deployments are automated, observable, and reversible.
4. Rollbacks are normal operations, not exceptional events.
5. Production access is time-bound, approved, and audited.
6. Backups do not count until restore is tested.

## 10. Delivery and ownership

1. Small changes with clear acceptance criteria beat long-lived branches.
2. Feature flags have owners and removal dates.
3. Every domain has a directly responsible owner even when one person owns several domains.
4. Decisions with durable consequences are written down; reversible local choices are not bureaucratized.
5. AI agents inspect existing work, preserve unrelated changes, state assumptions, and verify before declaring completion.
6. Engineers may stop a release for evidence, security, accessibility, or data-loss concerns without retaliation.

## Pull-request release gate

- The user outcome and scope are explicit.
- Tests and evaluations pass for changed risk.
- Authorization and tenant isolation were considered.
- Data migration, retention, and rollback effects are understood.
- Accessibility states are covered.
- Performance remains within budget or a tracked exception exists.
- Observability lets support identify failure without reading customer content.
- Documentation and decision records are current.
