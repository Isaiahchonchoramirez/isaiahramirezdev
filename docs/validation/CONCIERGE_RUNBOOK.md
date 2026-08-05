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

---

## Two classification dimensions

ADR-002 retained taxonomies from both source packages after establishing they are
orthogonal, not competing. **Every register line carries one value from each.**

### Dimension 1 — document state

What is known about the source material.

| State | Means |
| --- | --- |
| **Reviewed** | Processed and read within agreed scope |
| **Unreviewed** | Present but not processable — encrypted, corrupt, unsupported format |
| **Not found** | Referenced by another document but absent from the package |
| **Missing** | Requested on the approved request list and not supplied |
| **Not applicable** | Confirmed by the customer as not relevant to this deal |

Conflating *unreviewed* with *missing* is the most consequential error available: it
tells a buyer to chase a document the seller already sent.

### Dimension 2 — claim epistemics

What kind of statement Reef is making.

| Label | Means | Example |
| --- | --- | --- |
| **Extracted** | Stated in a document. Quote available. | "The lease expires 2027-03-31." |
| **Calculated** | Arithmetic on extracted values. Inputs and method shown. | "Top customer is 14.2% of FY25 revenue." |
| **Inferred** | Reasoning beyond the text. Basis stated. Attributed to Reef. | "This exceeds the threshold stated in the Q&A response." |
| **Unresolved** | Sources conflict and the conflict is not settled. Both shown. | "Schedule total differs from the statement by $37,500." |
| **Missing** | Expected and absent. | "Schedule B is referenced in §7 and is not in the package." |

Rules: *Inferred* never appears without the extracted facts beneath it. *Unresolved* is
never silently resolved by picking the likelier value. Nothing is upgraded to *Extracted*
because it is probably true. Legal effect, valuation and accounting conclusions are out
of scope under every label.

## Cross-source comparison matrix

Run each pairing as a deliberate pass. This is where the value is and it is the part that
cannot be improvised.

| Compare | Looking for |
| --- | --- |
| CIM claims ↔ financial statements | Overstated revenue, margin, growth |
| CIM concentration ↔ revenue detail | Understated concentration |
| Contracts ↔ revenue detail | Revenue from customers with no contract, or expired ones |
| Roster ↔ payroll ↔ agreements | Named people with nothing signed |
| Debt schedule ↔ loan documents | Undisclosed guarantees, cross-defaults |
| QoE addbacks ↔ source documents | Double-counted or unsupported addbacks |
| Management Q&A ↔ structured data | Verbal claims the data does not support |
| Documents ↔ their own references | Referenced schedules and exhibits absent |
| Baseline ↔ update | Silent revisions and invalidated findings |

## Quality control

Nothing ships without a second pass that assumes the first is wrong.

- [ ] Every anchor opened and verified to support the claim as written
- [ ] Every number recomputed from source
- [ ] Every quote checked verbatim
- [ ] Every date checked against the document, not memory
- [ ] Every finding re-read adversarially: what is the innocent explanation?
- [ ] Severity re-rated cold, without drafting context
- [ ] Both classification dimensions audited — is anything marked *Extracted* actually
      *Inferred*? Is anything marked *Missing* actually *Unreviewed*?
- [ ] Customer and target names spelled correctly

**One wrong finding costs more than ten missing ones.** A register with a demonstrable
error is not forwarded, and forwarding is the outcome gate.

## Effort log

Per engagement. This is the primary operational output of M0: it tells you what to
automate first, and whether automation can close the gap at all.

| Stage | Pilot 1 | Pilot 2 | Pilot 3 | Target |
| --- | --- | --- | --- | --- |
| Intake, authority, scope | | | | 1.5 h |
| Freeze and inventory | | | | 1.5 h |
| Request-list mapping | | | | 2.5 h |
| Bounded fact extraction | | | | 3.5 h |
| Structured profiling | | | | 2.0 h |
| Cross-source checks | | | | 2.5 h |
| Revision comparison | | | | 1.0 h |
| Quality control | | | | 1.5 h |
| Deliverable assembly | | | | 1.5 h |
| Review session | | | | 1.0 h |
| **Total** | | | | **≤ 12 h** |

Also log: documents processed, parse failures, findings by class and severity, findings
the customer called material, and **findings the customer said were wrong**. The last
column is the most valuable data a pilot produces.

Scorecard ceiling: FAIL above 20 hours of non-repeatable work after pilot 2.
