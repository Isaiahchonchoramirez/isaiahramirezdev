> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/CONCIERGE_RUNBOOK.md`](../../../validation/CONCIERGE_RUNBOOK.md)
> **Superseded because:** Renamed and merged.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Concierge pilot

## Purpose

Simulate Reef's narrow product manually before production software exists. The service
tests workflow value, data access, evidence requirements, repeatability, security
objections, and willingness to pay.

It is not full diligence and does not provide legal, accounting, tax, valuation,
quality-of-earnings, commercial, investment, or transaction advice. Customer advisors
retain their scopes and all final judgment.

## Accepted customer and package

- Active searcher, independent sponsor, or small acquisition team with written authority.
- Signed LOI or completed transaction suitable for retrospective validation.
- One customer-approved request list.
- One bounded buyer-side package or governed redacted subset.
- Hypothesis: 300–1,500 files, up to 20 GB, up to 15,000 document pages, and up to five
  structured datasets. Begin with the lower half until operations are measured.
- One baseline intake plus one revision/update of at most 20% additional files.

Reject or rescope public-company deals, patient data, cardholder data, credentials,
privileged communications not expressly approved, export-controlled content, regulated
financial-institution data, or material the customer lacks authority to disclose.

## Supported formats

Pilot acceptance is limited to PDF, DOCX, XLSX, CSV, TSV, JSON/JSONL, and TXT. Scanned
PDFs are accepted only when OCR quality can be checked and low-confidence pages are
listed. Email containers, images, audio, video, CAD, database backups, executables,
encrypted archives, and proprietary accounting exports are unsupported unless converted
by the customer.

Support means inventory and best-effort evidence extraction, not complete semantic
understanding. The coverage appendix states what each format received.

## Pre-intake legal and security gate

Before any content transfer:

1. Confirm customer identity, role, entity, and authority to share.
2. Execute counsel-reviewed services, confidentiality, and data-processing terms.
3. Record approved package boundary, prohibited categories, jurisdictions, advisor
   scopes, and named recipients.
4. Agree transfer method, storage boundary, access list, retention period, incident
   contact, and deletion evidence.
5. Confirm Reef is not receiving legal privilege and is not engaged as a professional
   diligence advisor.
6. Stop if the customer requires controls not actually in operation.

## Intake checklist

- Customer-approved request list and version/date.
- Source system/VDR name and export timestamp.
- Expected file and folder counts when available.
- Known latest-version rules and superseded-material handling.
- Deal timezone and relevant reporting periods.
- Approved entity names and identifiers for bounded reconciliation.
- Structured dataset descriptions, row grain, period, currency, and source owner.
- Advisor responsibility map.
- Customer's top five questions stated as routing context, not promises of answers.
- One named customer reviewer authorized to confirm mappings and dispositions.

## Manual operating procedure

### 1. Freeze and inventory

Create a read-only working copy. Record relative path, filename, extension, byte size,
content hash, supplied modified date, apparent document date, apparent revision, duplicate
group, processing status, and exception. Never rename or alter originals.

### 2. Build the document inventory

Classify each supported item into a customer-approved category. Mark classification
confidence and ask the customer to correct uncertain material before gap analysis.
Unsupported, unreadable, encrypted, corrupted, and low-OCR items remain visible.

### 3. Map the request list

For every request, record supplied, partially supplied, absent, unclear, not applicable,
or excluded. Attach mapped sources and rationale. Only the customer can confirm “absent”
or “not applicable”; Reef initially proposes these states.

### 4. Extract bounded facts

Extract only the fields needed for approved checks, preserving exact page, section,
table, sheet, cell, row, or text-span anchors. Record extractor and human verifier. Do
not create a broad hidden knowledge base “just in case.”

### 5. Profile structured data

For approved datasets, document grain, period, identifiers, units, and owner. Run
deterministic checks such as duplicates, missingness, mixed types, constant fields,
date/period coverage, zero-padded identifiers, and customer-approved reconciliation
totals. Do not alter or issue a “cleaned” file unless separately scoped and reviewed.

### 6. Run cross-document consistency checks

Select at intake no more than ten disclosed checks, such as:

- entity legal name and identifier consistency;
- reporting period consistency;
- customer/vendor identifier presence across approved schedules;
- totals that should mathematically reconcile under an agreed definition;
- contract/customer list presence versus approved operating schedules;
- dates or counts repeated in two named sources;
- references to missing appendices or schedules.

A difference is not automatically an error. Definition, period, scope, and rounding may
explain it; otherwise classify unresolved ambiguity.

### 7. Compare one revision

Hash and inventory the update against the baseline. Record added, removed, identical,
renamed, and changed items. Re-run only affected mappings and checks where possible.
Never imply that content-level diff is complete for unsupported formats.

### 8. Detect missing information

Combine customer-confirmed request mapping, broken internal references, unsupported
coverage, and unresolved questions. Distinguish “not supplied,” “not found in reviewed
scope,” “unreadable,” and “not applicable.”

### 9. Human quality control

A second-pass reviewer verifies every deliverable item against source anchors, check
definition, classification, limitation, and appropriate advisor route. No finding ships
because a model or script produced it. Items outside operator competence are classified
as unresolved and routed, not interpreted.

## Finding classes

Every finding uses exactly one class:

| Class | Definition | Required support |
| --- | --- | --- |
| Direct extracted fact | A value or statement copied without interpretation | Exact source anchor and transcription check |
| Deterministic calculation | A reproducible calculation over identified inputs | Input anchors, formula, units, parameters, result |
| Cross-document conflict | Two supported facts cannot both hold under the agreed definition | Both anchors, comparison rule, scope/period |
| Missing evidence | Approved requested support was not found in the reviewed scope | Request item, searched scope, mapping review, customer confirmation |
| Probable inference | Evidence suggests but does not establish a conclusion | Supporting and contrary evidence, confidence, explicit “not established” label |
| Unresolved ambiguity | Sources or definitions do not permit a supported conclusion | Competing interpretations and advisor/customer question |
| Human-reviewed conclusion | A qualified human records a scoped judgment | Reviewer identity/role, evidence, rationale, date, limits |

Every factual finding links to the originating document and exact page, sheet, section,
table, drawing, row, cell, or text span. The concierge pilot does not support drawing-
level findings unless the source is a page-rendered PDF and the region can be anchored.

## Contradiction classification

Classify conflicts by type: identifier, entity, date/period, amount/total, unit/currency,
version, reference, scope/definition, or status/approval. Then record materiality as
customer-prioritized, routine, or unknown. Reef does not assign financial or legal
materiality.

## Final deliverable

1. Executive scope and limitations page.
2. Immutable package inventory.
3. Processing and coverage appendix.
4. Customer-confirmed request coverage matrix.
5. Structured-data diagnostic appendix.
6. Human-reviewed evidence register with class, status, owner, source anchors, and next
   question.
7. Baseline-to-update delta, if the revision allowance is used.
8. Open ambiguity and specialist-routing list.
9. Methods/check definitions and retention/deletion statement.

Deliver as PDF plus CSV/XLSX register and a source-anchor index. Links may open a secure
review workspace or refer to stable customer/VDR coordinates, depending on approved
data handling.

## Turnaround target

- Intake/authority review: one business day after complete materials.
- Inventory and coverage draft: two business days.
- Full bounded deliverable: five business days for standard scope.
- One revision update: two business days after receipt.

The clock pauses for missing authority, passwords, customer mapping decisions, or
material outside scope.

## Customer review session

Conduct a 60-minute session that separates workflow evaluation from deal advice:

- confirm coverage and limitations;
- inspect a sample of accepted and rejected findings;
- record false positives, missing items, time saved, and action taken;
- identify which items went to advisors/investors;
- test price, repeat use, and referral commitment;
- agree corrections and one revision pass.

## Retention and deletion

Default hypothesis: delete customer content and working extracts 14 days after final
acceptance, with a maximum 30-day pilot retention unless contract requires shorter.
Retain only permitted commercial records and de-identified aggregate metrics. Do not
retain synthetic-looking excerpts from live deals as fixtures without separate written
permission.

Deletion procedure:

1. Freeze the object manifest at closure.
2. Revoke operator and service access.
3. Delete originals, extracts, indexes, temporary files, exports, and local caches.
4. Record backup expiry and provider deletion semantics.
5. Verify object absence and issue a deletion confirmation.
6. Record any legally required retained item, basis, access, and expiry.

Do not promise immediate deletion from immutable backups if the actual system cannot
perform it; state the expiry window accurately.

## Limitations

- The service reviews only supplied and processable material within the agreed boundary.
- Absence from the package does not prove nonexistence.
- OCR and extraction may be wrong; exact evidence and human review reduce but do not
  eliminate error.
- Defined checks are not a complete diligence checklist.
- No output certifies accuracy, completeness, compliance, solvency, value, or deal
  readiness.
- The customer and retained professionals remain responsible for decisions.
