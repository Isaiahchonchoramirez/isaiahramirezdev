# System Overview

## Product boundary

Reef's first possible product accepts a buyer-approved request list and bounded acquisition package, transforms supplied documents into stable evidence, runs versioned inventory and reconciliation checks, and presents findings for human disposition. It integrates with source systems but does not replace the VDR or professional advisors. Implementation remains blocked by the validation scorecard.

## Core domain objects

| Object | Meaning |
| --- | --- |
| Organization | Security, billing, retention, and policy boundary |
| Project | Long-lived customer context |
| Review | A bounded buyer-side diligence evidence engagement |
| Package | A baseline or update collection submitted under an approved scope |
| Document | Logical work product across versions |
| Document version | Immutable uploaded source and its metadata |
| Source region | Stable page, bounding box, paragraph, table cell, or drawing callout anchor |
| Extraction | Versioned machine interpretation of a source region |
| Requirement/entity | Normalized concept supported by one or more regions |
| Check run | Execution of one versioned assurance rule against a package |
| Finding | Proposed issue with evidence, confidence, severity, and check provenance |
| Disposition | Human decision and rationale about a finding |
| Report | Immutable rendering of selected findings at a point in time |

## Primary data flow

```text
Upload
  -> malware/type/size gate
  -> immutable original
  -> inventory + version identity
  -> parse/OCR/layout extraction
  -> stable source regions
  -> entities, requirements, references
  -> lexical/vector indexes and evidence edges
  -> deterministic + model-assisted checks
  -> evidence validation
  -> reviewer queue
  -> disposition
  -> signed report snapshot
```

Failure is localized. One unsupported document does not fail the package; Reef marks coverage gaps and continues. Reports state exactly what was and was not processed.

## Evidence contract

A derived claim is valid only when it records:

- organization and project scope;
- source document version and content hash;
- one or more source-region identifiers;
- extraction/parser and check versions;
- model provider/model/prompt/schema versions when applicable;
- confidence and validation result;
- creation time and trace identifier;
- later human disposition without mutating the original proposal.

Deleting a source follows retention policy, but never leaves a surviving report that pretends its evidence is still inspectable. Reports either retain an authorized evidence snapshot or show that evidence expired.

## Control plane and data plane

The control plane manages identity, configuration, projects, check versions, policies, billing, and deployment health. The data plane processes customer documents and search requests. Private deployments may keep the data plane inside a customer boundary while receiving signed software and configuration updates from the control plane.

No private-deployment design may require Reef Labs to read customer content for normal operation.

## Trust boundaries

1. Browser to API: authenticate, authorize, validate, and rate-limit.
2. API to storage: bind all access to tenant/project context.
3. Untrusted document to parser: sandbox, resource-cap, scan, and disable network.
4. Extracted content to model: treat as data, never instructions; apply provider and residency policy.
5. Model output to product: validate schema, evidence, thresholds, and allowed actions.
6. User export: authorize, watermark or classify where policy requires, and audit.

## DataGate assessment

The existing DataGate project is a credible portfolio-grade local profiler, not an enterprise platform.

### Genuinely valuable

- Dependency-light CSV/TSV/JSON/JSONL parsing, including quoting, embedded newlines, delimiter sniffing, sparse JSON, and conservative coercion.
- Deterministic type inference, missingness, duplicates, distributions, IQR outliers, and pairwise Pearson correlation.
- Explicit refusal to coerce zero-padded identifiers or average near-unique IDs.
- Seeded demo data and 55 deterministic checks over important engine behavior.
- Clear local-processing privacy story and a relay with basic SSRF defenses, response caps, timeouts, and honest service identity.
- The product habit of replacing fake capabilities with measurable ones.

### What should be discarded as Reef product scope

- The portal/neon visual shell and generic “upload command center” language.
- Generic webpage SEO/accessibility scanning. It has no relationship to the selected diligence workflow.
- Correlation as a headline intelligence feature. Correlation without domain semantics is often noise.
- Automatic cleaned-CSV export that removes duplicates and constant columns. Enterprise evidence systems propose transformations; they do not silently define “clean.”
- The assumption that browser-only analysis is a complete privacy architecture.

### What becomes Reef v1

- Conservative tabular coercion and profiling as a server-side, versioned spreadsheet extraction stage.
- Deterministic data-quality findings where a validated diligence check needs them.
- JSON/structured report shapes, rewritten around evidence identifiers and review dispositions.
- Tests as the seed of a larger evaluation corpus.

### What becomes Reef v2

- Optional local/edge preprocessing for customers who cannot transmit originals.
- Richer spreadsheet comparison across package revisions.
- Browser-side previews and small-file diagnostics through workers, if customers value instant feedback.

### What never belongs in Reef

- SEO scanning, broken-link analysis, phone lookup, stock prediction, or other disconnected intelligence demos.
- Unreviewed destructive cleaning.
- Main-thread analysis of large files.
- A 50,000-row first-row sample presented as representative without sampling strategy and uncertainty.
- A permissive `Access-Control-Allow-Origin: *` relay as an enterprise production boundary.

### Required hardening before reuse

- Move CPU work to isolated workers and use representative or stratified sampling when full scans are not possible.
- Add formula, sheet, cell-coordinate, locale, unit, and workbook provenance for XLSX.
- Version algorithms and persist content hashes, parameters, and results.
- Add property/fuzz tests and fixtures from the target domain.
- Treat findings as proposals with review state; never directly alter originals.
- Replace the standalone relay with authenticated connector infrastructure and redirect-safe SSRF enforcement.

## Scaling model

Horizontal scale happens by project-partitioned jobs and immutable artifacts. Large documents are page/section partitioned; checks fan out by document or rule and join through durable state. Interactive requests never wait for an entire package pipeline.

Millions of users are a possible horizon, not an MVP capacity target. The first scale objective is predictable processing of a real design-partner package with bounded memory, resumable jobs, and measurable cost.
