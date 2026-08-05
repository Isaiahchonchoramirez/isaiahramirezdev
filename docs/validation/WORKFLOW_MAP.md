# Current diligence workflow map

## Scope

This map covers the narrow sequence from receiving a buyer-approved request list and
data-room package to producing a reviewed issue register for advisor and investor
escalation. It does not describe complete acquisition diligence.

Every row is a hypothesis until observed in qualified interviews or pilots.

## Workflow

| Step | Actor | Input | Action | Decision | Output | Current tool | Time hypothesis | Failure mode | Consequence | Evidence required | Possible Reef intervention |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Define scope | Buyer lead with advisors | LOI, advisor scopes, diligence request list | Set requested categories, owners, priorities, and exclusions | What must be requested and who reviews it? | Approved request list and responsibility map | Spreadsheet, counsel template, email | 1–4 h | Generic list does not match deal; ownership gaps | Duplicate work or missing review | Approved list version, owner, date | None initially; ingest the approved list without inventing scope |
| 2. Authorize access | Buyer, seller/VDR admin, legal | NDA, room permissions, user list | Grant access and define export/use limits | May Reef or another service receive material? | Authorized data boundary | VDR permissions, NDA, email | 0.5–3 h plus waiting | User exports material without authority | Confidentiality breach, pilot stop | Written authorization and prohibited categories | Intake gate; refuse data until authority is documented |
| 3. Receive package | Buyer/analyst | Initial room or governed export | Download or inspect folder/index | Is the package the agreed boundary? | Frozen intake manifest | VDR, Drive, Dropbox, ZIP | 1–3 h | Partial export, lost metadata, duplicate versions | False missing items and rework | Source room, export time, file count, paths, hashes | Create immutable manifest and state lost VDR metadata |
| 4. Inventory | Buyer/analyst | Package manifest and files | Classify documents, identify duplicates, failures, dates, versions | What is present and processable? | Inventory and exception list | VDR index, spreadsheet, manual folders | 2–8 h | Misnamed or unreadable files; latest version unclear | Review omissions, wasted search | File hash, path, title, date, version, processing status | Draft inventory with human correction; no silent drops |
| 5. Map requests | Buyer/analyst with advisors | Approved request list and inventory | Match supplied evidence to each request | Satisfied, partial, absent, unclear, or not applicable? | Request coverage matrix | Spreadsheet/checklist | 3–12 h | Semantic mismatch; item exists under unexpected name | Repeated seller Q&A or false completeness | Request text, mapping rationale, source anchors, human confirmation | Propose mappings and gaps; customer confirms before “missing” status |
| 6. Route specialist work | Buyer lead | Coverage matrix and documents | Assign legal, financial, tax, commercial, technical, insurance, etc. | Who is qualified and accountable? | Advisor work queues | Email, VDR Q&A, PM tool | 1–4 h | Scope falls between advisors | Issue never reviewed | Assignee, scope, due date, source | Export evidence packet; do not interpret specialist domain |
| 7. Inspect structured data | Buyer/analyst/accountant | Customer, sales, payroll, AR/AP, operational exports | Check schema, duplicates, gaps, periods, IDs, totals, and concentration | Is data usable and what needs explanation? | Data-quality log and questions | Excel, Python, accounting tools | 4–20 h | Silent coercion, inconsistent periods, unstable IDs | Wrong analysis or repeated cleaning | Original file/hash, sheet/cell/row, formula/parameter, reviewer | DataGate-derived deterministic profile with provenance; no automatic cleaning |
| 8. Reconcile defined facts | Buyer/analyst | CIM, financials, customer schedules, contracts, organization records | Compare a bounded approved set of identifiers, dates, counts, and totals | Conflict, explainable difference, or unresolved? | Reconciliation findings | Excel, search, manual notes | 3–15 h | Different definitions or periods treated as contradiction | False alarm or missed issue | Both source anchors, comparison rule, period/definition, reviewer | Run disclosed checks; label ambiguity and require review |
| 9. Build issue register | Buyer lead | Advisor notes, gaps, data findings, questions | Normalize issue, status, owner, consequence, and evidence | What needs seller/advisor/investor action? | Working issue register | Spreadsheet, memo, PM tool | 3–10 h | Claims lose citations; duplicates; mixed severity | Slow meetings, low trust, rework | Exact sources, author, date, status, rationale | Produce evidence-linked register with finding class and disposition |
| 10. Ask and resolve | Buyer, seller, advisors | Issue register and evidence | Submit Q&A, receive documents/answers, update status | Resolved, partially resolved, disputed, or open? | Updated register and package | VDR Q&A, email, calls | Repeats over days | Answer not linked to evidence; new file not mapped | Same issue reopens; stale decision | Question/answer, new source version, reviewer disposition | Link response and changed evidence; preserve history |
| 11. Process room update | Buyer/analyst | New or revised room contents | Identify additions, removals, supersessions, and affected items | What requires re-review? | Delta inventory and changed findings | VDR notifications, manual compare | 2–10 h/update | Full reread or missed replacement | Delay or reliance on stale evidence | Baseline/current manifests, hashes, change map | One bounded revision comparison and impacted-register update |
| 12. Review with decision team | Buyer, investors, lenders, advisors | Reviewed issue register | Discuss material items and next actions | Escalate, resolve, price, condition, or accept risk? | Decision/action record | Meeting, memo, IC deck | 1–4 h plus prep | Unsupported claim or missing context | Wrong decision, extra advisor work | Approved register version and linked evidence | Deliver report and coverage appendix; no transaction recommendation |
| 13. Close service data | Buyer and Reef operator | Final deliverable and retention choice | Return/export, delete working data, document exceptions | Retain permitted artifacts or delete? | Deletion/retention record | Storage/admin tools | 0.5–2 h | Copies remain in temp, backup, email, or logs | Contract/security breach | Object inventory, deletion record, backup expiry | Execute documented deletion and send confirmation |

## Narrowest workflow Reef can own first

Reef can own steps **3 through 5 and the evidence-preparation portions of steps 7
through 9**, ending with a reviewed evidence register. It supports but does not own
specialist routing, interpretation, seller Q&A, negotiation, or the transaction
decision.

The first paid deliverable is:

> An immutable package inventory, processing/coverage appendix, customer-confirmed
> request coverage matrix, deterministic structured-data diagnostics, a bounded set of
> defined cross-source reconciliations, and a human-reviewed evidence register.

## Measurement points

For each pilot record hands-on minutes, wait time, actor, rework, error, and output at
every owned step. Compare the customer's baseline with the concierge process. A claim
of time saved requires a task-level baseline, not a general satisfaction rating.

## Questions validation must answer

- Does the buyer or an advisor actually own each mapped step?
- Does an exported package retain enough metadata to perform the work safely?
- Which request-list categories repeat across deals without requiring professional
  interpretation?
- Which structured checks are valuable preparation rather than misleading analysis?
- Does the evidence register enter a real meeting, advisor escalation, or investor
  update?
- Does room-update work create the strongest recurring behavior?

---

## Background: where the owned scope sits in the deal

Lower confidence than the table above — this is inference from public description, not
from interviews. It is kept because it explains what Reef must stay out of, and why.

| Phase | Owner | Reef |
| --- | --- | --- |
| Teaser, CIM review, screening, IOI | Buyer | None initially. CIM claim extraction is a possible later high-frequency product — a buyer reads 20+ CIMs per deal pursued. |
| Management meeting | Buyer, seller | None in M0. Transcript-to-document reconciliation is a strong later candidate and is out of the first deliverable. |
| LOI and exclusivity | Buyer, counsel | None. **But the clock starting is the purchase trigger** Reef sells against. |
| **Data room opens** | Buyer, analyst | **Owned.** Inventory and gap detection — pure overhead, no judgment, deliverable on day one. |
| Financial diligence / QoE | Accountant | **Stay out.** Licensed, insured, well served. Reef reads the QoE and reconciles it against other sources; it never opines on an addback. |
| **Commercial reconciliation** | Buyer | **Owned in part.** Concentration and contract-term reconciliation against the CIM and the schedules. |
| **Legal / contract review** | Attorney, buyer | **Owned in part, with a firm boundary.** Reef extracts and anchors; it never states legal effect. "This clause requires consent on change of control, here it is" is extraction. "This is enforceable" is advice and is permanently out of scope. |
| Operational, HR, insurance | Buyer | Partly owned — roster and certificate reconciliation is near-deterministic and cheap. |
| **Supplemental uploads** | Seller, buyer | **Owned.** Frequently skipped under time pressure; a revised document silently invalidating an earlier conclusion is the nastiest post-close surprise. |
| IC / lender approval | Buyer | **The artifact.** Everything Reef produces is shaped to paste into this document with anchors intact. |
| Purchase agreement, disclosure schedules | Counsel | Out. Schedule-to-room reconciliation is a real later job. |

**What Reef must never claim:** that it constitutes diligence. It is one organized pass
over supplied documents that makes the human pass faster and better sourced. The moment
marketing implies completeness, a missed finding becomes Reef's liability instead of an
acknowledged limit — an existential difference for a one-person company.
