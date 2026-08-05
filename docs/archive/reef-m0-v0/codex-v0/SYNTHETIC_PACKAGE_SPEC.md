> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md`](../../../validation/SYNTHETIC_DEAL_ROOM_SPEC.md)
> **Superseded because:** Renamed and merged; its negative controls and unreviewed/not-found/missing/N-A distinction were adopted wholesale.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# Synthetic acquisition package specification

## Purpose

Create a legally safe, repeatable small-business acquisition fixture for process,
evidence-anchor, parser, and finding evaluation before private customer data is used.

The fixture represents a fictional regional commercial HVAC maintenance company,
**Meridian Climate Services, LLC**. All people, entities, customers, numbers, contracts,
addresses, and events are invented. Do not derive them from one real company or lightly
anonymize private material.

This document specifies the package; it does not authorize generating the files yet.

## Fixture boundaries

- 120–180 documents, 1,000–1,800 rendered pages, and 6–10 structured files.
- Two versions: baseline room `R1` and update `R2` with additions, replacements,
  renames, and one removal.
- Formats: searchable PDF, scanned PDF, DOCX, XLSX, CSV, TXT, and one unsupported file.
- Realistic folder hierarchy and inconsistent naming without copying a live room.
- Every file has a manifest entry, content hash, provenance note, generator/version,
  expected processing status, and permitted use.

## Package contents

| Folder | Representative materials | Evaluation purpose |
| --- | --- | --- |
| `00_Request_List` | Buyer request list, responsibility matrix, room index | Request mapping and scope authority |
| `01_Corporate` | Formation document, ownership schedule, board/member approvals, good-standing evidence | Entity, approval, and missing-record checks |
| `02_Financial` | Three years statements, monthly trial balance, budget, debt schedule, AR/AP aging | Period, total, and data-quality reconciliation |
| `03_Customers` | Customer master CSV, revenue-by-customer XLSX, sample service agreements, churn notes | IDs, concentration preparation, contract/schedule presence |
| `04_Vendors` | Vendor master, top-vendor schedule, sample supplier agreements | Identifier and amount checks |
| `05_Employees` | Synthetic census with non-sensitive fictional fields, organization chart, policy summaries | Coverage and count reconciliation without real PII |
| `06_Operations` | Fleet/equipment list, branch metrics, maintenance backlog, KPI definitions | Units, dates, definitions, and structured profiling |
| `07_Legal_Insurance` | Litigation summary, insurance certificates, permit list, contract index | Missing evidence and specialist routing only |
| `08_Tax` | Fictional filing acknowledgments and schedule index | Presence/period checks only; no tax analysis |
| `09_IT_Security` | System inventory, backup-policy summary, vendor list | Inventory and scope boundaries |
| `10_QA` | Seller Q&A log, meeting notes, management responses | Source status, unresolved ambiguity, update linkage |
| `11_Update_R2` | Replacement schedules, new contracts, revised Q&A, withdrawal notice | Revision/delta evaluation |

## Structured files

1. `monthly_income_statement.xlsx` with monthly P&L and annual summary.
2. `trial_balance.csv` with account, period, debit, credit, and entity.
3. `customer_master.csv` with stable customer IDs and contract references.
4. `revenue_by_customer.xlsx` with monthly values and total row.
5. `ar_aging.csv` with invoice/customer IDs and aging buckets.
6. `employee_census.xlsx` with fictional employee IDs, roles, dates, and status.
7. `fleet_equipment.csv` with asset IDs, branches, units, and service dates.
8. `room_index.xlsx` mapping folder, filename, apparent date, and request item.

DataGate-derived checks must preserve zero-padded IDs, file/sheet/row/cell evidence,
and original values. The expected output never includes an automatically cleaned file.

## Deliberate planted issues

| ID | Planted issue | Finding class | Expected evidence | Expected result |
| --- | --- | --- | --- | --- |
| SYN-001 | Formation document says `Meridian Climate Services, LLC`; one schedule says `Meridian Climate Service LLC`. | Cross-document conflict | Corporate PDF page/paragraph and XLSX cell | Flag entity-name mismatch; do not infer separate entity. |
| SYN-002 | Request list asks for 2023–2025 statements; 2024 statement is absent. | Missing evidence | Request row and complete reviewed scope | Propose missing; customer-confirmed in gold disposition. |
| SYN-003 | Room contains `Insurance_Certificate_v3.pdf` but certificate itself shows revision 2 and an expired date. | Cross-document conflict | Filename/manifest and PDF fields | Flag version/date inconsistency; route to insurance reviewer. |
| SYN-004 | Customer ID `000742` is coerced to `742` in revenue workbook but preserved in customer master. | Cross-document conflict | CSV value and XLSX cell | Flag identifier mismatch; preserve leading zeros. |
| SYN-005 | Revenue schedule total differs from monthly statement by $37,500 because one source is gross and the other net of pass-through revenue. | Unresolved ambiguity | Both totals and KPI-definition note | Do not call error; record definition ambiguity and question. |
| SYN-006 | Trial balance contains duplicate rows for one journal batch. | Deterministic calculation | Exact duplicated rows and comparison rule | Flag duplicates without deleting them. |
| SYN-007 | AR aging uses `days` while a management note labels the same threshold in `weeks`. | Cross-document conflict | CSV header/values and note span | Flag incompatible unit/label. |
| SYN-008 | Top-customer schedule covers eleven months while its title claims twelve. | Cross-document conflict | Month columns and title cell | Flag incomplete period. |
| SYN-009 | One customer agreement references Schedule B, which is absent. | Missing evidence | Contract reference span and reviewed contract folder scope | Flag referenced attachment not found. |
| SYN-010 | Board/member approval for the transaction is missing a signature. | Missing evidence | Approval PDF signature region | State unsigned evidence; do not conclude legal invalidity. |
| SYN-011 | Employee census has five blank start dates and two duplicate fictional employee IDs. | Deterministic calculation | Workbook cells/rows | Flag exact gaps and duplicates. |
| SYN-012 | Equipment list records refrigerant volume in pounds; branch summary labels the same values kilograms. | Cross-document conflict | CSV unit and PDF table | Flag incompatible units without converting unless rule specifies. |
| SYN-013 | Litigation summary date is newer than the file date in the room index. | Cross-document conflict | PDF effective date and index row | Flag metadata/document-date inconsistency. |
| SYN-014 | Q&A response states no customer above 10%; structured schedule contains one at 14.2% under the agreed period definition. | Cross-document conflict | Q&A span, schedule cells, deterministic formula | Flag conflict and calculation; no investment conclusion. |
| SYN-015 | R2 replaces revenue schedule but leaves R1 copy under a different filename. | Unresolved ambiguity | Both hashes, dates, totals, manifest | Identify likely supersession and require confirmation. |
| SYN-016 | R2 adds the missing Schedule B but it references a different agreement identifier. | Cross-document conflict | Agreement and schedule identifiers | Flag mismatch; do not mark original request resolved. |
| SYN-017 | One scanned permit has OCR confidence below fixture threshold. | Unresolved ambiguity | Page image, OCR confidence, extracted span | Mark unreadable/low-confidence; no factual conclusion. |
| SYN-018 | Unsupported encrypted archive is listed as containing tax support. | Missing evidence | Manifest and processing failure | State unreviewed, not missing; request customer conversion. |
| SYN-019 | Budget and actual use inconsistent date formats causing one apparent future month. | Deterministic calculation | Exact cells and parser rule | Flag date parse ambiguity, not performance variance. |
| SYN-020 | Request list row is marked “N/A” by seller without rationale. | Unresolved ambiguity | Request row/status | Ask for basis; do not count supplied or missing. |

## Negative controls

Include at least 20 tempting non-issues:

- legitimate rounding differences within a stated tolerance;
- entity abbreviation explicitly defined in the document;
- different customer counts caused by disclosed active-versus-all definitions;
- superseded documents clearly marked and indexed;
- zero values that are real, not missing;
- valid duplicate-looking line items with distinct invoice IDs;
- expected date-format differences with unambiguous parsed dates;
- absent categories correctly marked not applicable with customer rationale.

False alarms on negative controls count against precision.

## Gold evaluation artifacts

- Package manifest and expected processing results.
- Request coverage matrix with customer-simulated confirmations.
- Finding ledger with class, severity-neutral priority, exact anchors, rationale, and
  correct disposition.
- Negative-control ledger.
- R1-to-R2 change manifest.
- Expected structured profiles and formulas.
- Known OCR text and region coordinates.
- Evaluation splits: development cases and held-out cases not used to tune checks.

## Acceptance thresholds

- 100% manifest coverage.
- At least 95% exact-anchor correctness.
- At least 95% precision on deterministic and direct-fact findings.
- At least 90% precision on customer-confirmed missing-evidence findings.
- 100% correct distinction between unreviewed, not found, missing, and not applicable
  in the gold set.
- No professional conclusion in expected outputs.

Passing the synthetic fixture validates process mechanics only. It does not satisfy any
customer, data-access, willingness-to-pay, or product-value gate.
