# Cold review 001 — adjudication

Adjudication of the first blinded cold review of the Reef engine. No engine behaviour was
changed. No reviewer file was modified. No reviewer verdict was relabelled.

Machine-readable record: [`cold-review-adjudication-001.json`](cold-review-adjudication-001.json).

---

## 1 · Integrity

| Artifact | Supplied hash | Status |
|---|---|---|
| Export manifest | `38a5e11b…f03d4` | **MATCH** |
| Frozen query set | `ff63b8f1…0cf01` | **MATCH** |
| Frozen results | `43aa9b90…2a407` | **MATCH** |
| Reviewer observations | `60f583a2…80491` | **MATCH** |
| Raw-output manifest | `809b8837…c858e` | **MATCH** |

All **33 of 33** transcripts verify against the output manifest (36 entries: 33 transcripts
plus the three artifacts above).

**The query set was not changed after freezing.** The reviewer's own
`cold-review-queries.sha256`, written at 17:05:42, contains the identical digest supplied
here. Results followed at 17:27 and observations at 17:36.

**One weakness in the freeze evidence, recorded rather than glossed.** The export contains a
single commit at 17:36 holding everything, so commit ordering proves nothing on its own. The
pre-registration rests on the standalone hash file and filesystem mtimes. Both are forgeable
by a determined party. This is a protocol defect, not a reviewer failing — the instructions
offered two freeze mechanisms and neither produces an independently timestamped ordering.
See [§6.2](#62-freeze-mechanism-conflicts-with-the-verifier).

### Disclosed protocol deviation

The reviewer disclosed, unprompted, that `setup.sh`, `ingest` and `coverage` ran **before**
Phase 1 reading and question writing, contrary to `REVIEWER_INSTRUCTIONS.md`. No query was
issued and no retrieval result was seen before the query file was hashed.

**Adjudicated impact: material for three questions, immaterial for thirty.** Coverage output
named two unprocessed files, and that knowledge informed CR-031 and CR-032. The reviewer
argues both would have been written anyway from the file listing — a `*_scan.pdf` and a
`.zip` are visible in `DOCUMENT_INDEX.md`. That is plausible and I accept it, but it cannot
be proven from the frozen record, so **CR-031 and CR-032 are marked contaminated-but-scored**
and should not be reused as blind evidence. CR-033 turns on a withdrawal notice found by
reading, not by coverage, and is unaffected.

The reviewer also found a pre-existing `cold-review` room in the shared database from
16:44:40 — before their own session — dropped it and re-ingested. They verified the document
and SHA set was identical. See [§6.1](#61-database-contamination).

---

## 2 · Scope

33 queries adjudicated, CR-001 through CR-033. Every reviewer factual claim about the fixture
was independently checked against canonical sources. **Every one held.** Where the reviewer
said an attribute was absent — Toledo rent, GL deductible, Hartwell payment terms, PTO
policy, union agreement, 401(k), customer survey — the fixture confirms absence. The one
apparent counter-example, `401`, occurs only as the dollar amount `401,600` in vendor files;
the reviewer was right to call it absent.

**I did not relabel a single reviewer verdict.** My contribution is defect ownership, not
re-scoring.

### Independent rediscovery

Without the answer key, the reviewer surfaced **11 planted findings**, including the Critical
covenant breach (RDG-003), both High contradictions (RDG-005, RDG-007) and the Informational
locked-archive trap (RDG-021). That is strong evidence the fixture is realistic and that the
reviewer was competent. It is also the first independent confirmation that the planted set is
discoverable by reading rather than by knowing.

---

## 3 · Metrics, reported separately

Combining these into one number would hide the finding, which is that the engine is excellent
at one thing and unable to express five others.

### 3.1 Citation integrity — PASS

| Measure | Value |
|---|---|
| Citations sampled | 200 (every citation across all 33 queries) |
| Citation resolution | **200 / 200** |
| Anchor accuracy | **200 / 200** |
| Fabricated citations | **0** |
| Unlabeled inference | **0** |

197 matched on a strict substring test; the remaining three differed only by a breadcrumb
prefix the engine prepends and by markdown table pipes, and were confirmed accurate by hand.
Line citations correctly skip blank lines.

This is the first independent confirmation of G9, G10 and G12, and it is the strongest result
in the review. The reviewer's own summary is worth preserving: *"Its failures are failures of
selection and silence, never of invention."*

### 3.2 Direct support

| Measure | Value | Wilson 95% |
|---|---|---|
| Supported-query precision | 7 / 25 = **28.0%** | 14.3 – 47.6% |
| Supported-query recall | 7 / 9 = **77.8%** | 45.3 – 93.7% |
| False-support rate | 9 / 33 = **27.3%** | 15.1 – 44.2% |
| False-abstention rate | 2 / 33 = **6.1%** | 1.7 – 19.6% |
| **Escalation-worthy false supports** | **4** | target 0 — **FAIL** |

Precision is low because the engine returns evidence for almost everything it does not
refuse: 25 of 33 queries returned hits, and only 7 were genuine direct support.

### 3.3 Capability-specific

| Capability | Correct | Verdicts |
|---|---|---|
| Direct retrieval | **7 / 9** | 7 correct, 2 false abstention |
| Outside-scope handling | **3 / 5** | 3 correct, 2 false support |
| Subject present, fact absent | **0 / 6** | 4 false support, 2 wrong state |
| Contradiction | **0 / 3** | 3 wrong state |
| Calculation | **0 / 4** | 4 wrong state |
| Comparison | **0 / 2** | 2 wrong state |
| Absence detection | **0 / 1** | 1 wrong state |
| Inaccessible-document disposition | **0 / 2** | 2 false support |
| Stale/withdrawn handling | **0 / 1** | 1 false support |

Direct retrieval is the only capability that works, and it works well — 7 of 9, with both
failures caused by the abstention gate rather than by ranking.

### 3.4 Result-state usability

| Measure | Value |
|---|---|
| Valid state mapping | 28 / 33 |
| Unmappable | **5** |
| Ambiguous mapping | 12 |
| Understandable user-facing result | 10 / 33 |

The engine returns two states. The reviewer labelled in eight. **Every `wrong_state` verdict
is a case where the engine's behaviour was defensible and its output could not say why.**

---

## 4 · The nine false supports

Each classified. The definition of false support was not weakened: returning evidence for a
question the corpus does not support is a false support even when the evidence is topically
sensible.

| Query | Classification | Severity |
|---|---|---|
| CR-013 Toledo rent | Related-but-insufficient → abstention/evidence sufficiency | Medium |
| CR-015 GL deductible | Related-but-insufficient → abstention/evidence sufficiency | Medium |
| **CR-016 Hartwell payment terms** | Related-but-insufficient, **materially misleading** | **High** |
| CR-018 PTO accrual | Related-but-insufficient → abstention/evidence sufficiency | Medium |
| CR-021 collective bargaining | Genuine false support (out of scope) | Medium |
| CR-023 customer survey | Genuine false support (out of scope) | Medium |
| **CR-031 Erie permit expiry** | **Document-status failure** | **High** |
| **CR-032 tax workpapers** | **Document-status failure** | **High** |
| **CR-033 Bayfield revenue** | **Document-status failure** | **High** |

### CR-016 — AP aging returned for contractual payment terms

The Hartwell agreement contains no payment, credit or invoice term; verified. Rank 1 is the
agreement itself at 0.767. **Rank 2 is `02_Financial/ap_aging.csv` — `Hartwell Supply
Company 704000 38`.** A payables balance and a days-outstanding count, presented as though
responsive to a question about contractual terms. The `38` is days outstanding; a reader
skimming could take it for *net 38*.

Related-but-insufficient evidence, and the most dangerous kind, because the number looks like
an answer. Owner: abstention/evidence sufficiency.

### CR-031 — the lease returned for a permit question

The Erie operating permit **is in the room** and the expiry **is in the document** — as pixels
in a scan the engine registered as `unsupported: no usable text`. Asked when the permit
expires, the engine returned `Facility_Lease_Erie.md` at 0.7176: a different document about
the same site.

The engine already knows the permit is unreadable. It never says so. It silently substitutes
an adjacent document, and a reviewer who trusts the top hit reads a lease expiry as a permit
expiry. Owner: **document-status handling**. This is not an abstention-threshold problem — no
floor setting fixes it, because the returned document is genuinely about Erie.

### CR-032 — a locked archive represented by its index row

The tax workpapers were supplied as a password-protected archive; intake correctly registered
it `unsupported: archive is password-protected`. Asked what the workpapers contain, the top
hit at 0.7402 is `00_Request_List/request_list.csv` row `8.2, Tax support workpapers, 08_Tax,
Supplied`.

**The index says "Supplied". That is true in form and false in substance**, and the engine
presents it as the most relevant evidence. A reviewer could close the diligence item
believing the workpapers were received and read. The engine holds the contradicting fact in
its own coverage register and does not consult it. Owner: **document-status handling**.

### CR-033 — current and withdrawn files tied at the top

Two revenue-by-customer workbooks give different figures for the same customer:
`Revenue_by_Customer_FY25.xlsx` says 1,204,900 and `_v2.xlsx` says 1,086,900.
`11_Update_R2/withdrawal_notice.txt` states plainly that **_v2 was withdrawn and the original
is the schedule of record**.

The engine returned them at ranks 1 and 2, separated by **0.0026** — effectively tied — with
no indication that one was withdrawn. The correct file ranks first by luck, not by
knowledge. A reader taking rank 2 writes a figure that is wrong by 118,000.

Owner: **document-status handling**. The withdrawal notice is indexed; nothing joins it to
the file it withdraws.

### CR-021 and CR-023 — genuine false supports

Neither union material nor survey material exists anywhere in the room; verified. CR-021
returned a Q&A row about contractor classification at 0.6600 — **0.0045 above the floor**.
CR-023 returned Q&A rows about customer concentration at 0.6693. Both are the failure mode
the calibration record already predicts: the answerable and out-of-scope distributions
overlap, so no floor separates them.

---

## 5 · The two false abstentions

Neither is a retrieval failure. In both cases retrieval found the right document and the gate
threw it away.

| | CR-001 | CR-009 |
|---|---|---|
| Question | members and their percentages | unbilled WIP at end of 2025 |
| Top lexical evidence | none — 0 hits | none — 0 hits |
| Top semantic evidence | `request_list.csv` 0.6394 | **`wip_schedule.txt` 0.6406** |
| Fused rank of the source | **2** (`ownership_schedule.csv`, 0.6358) | **1** |
| Best cosine | 0.6394 | 0.6406 |
| Floor | 0.6555 | 0.6555 |
| Margin below floor | **0.0161** | **0.0149** |
| Direct source available | yes | yes |

**CR-009 is the clearer case: the correct document ranked first and was discarded** for being
0.0149 short of a threshold.

### Does this generalise beyond fixture phrasing?

**Yes, and this is the most important finding in the review.**

The shipped calibration records an answerable range of **0.6789 – 0.7939**, fitted on ten
author-written questions. These two naturally-phrased answerable questions score **0.6394 and
0.6406** — below the entire fitted answerable range. The calibration set did not span the
questions a real reviewer asks.

A floor fitted to an unrepresentative sample was always going to fail this way. The cold
review has now demonstrated it on questions nobody on the engine side wrote. Two of nine
directly answerable questions were lost to it.

**The floor was not changed during adjudication**, per the task constraint.

---

## 6 · Protocol defects

These are defects in the evaluation apparatus. None is an engine retrieval failure.

### 6.1 Database contamination

The export ships a wheel and documents; the database lives outside it, on the host. The
reviewer found a `cold-review` room ingested at 16:44:40 — before their session began — in
the shared `reef` database. They dropped and re-ingested, and verified the document and SHA
set matched.

Three distinct problems:

1. **The export's filesystem boundary does not extend to the database.** A blinded export can
   sit beside a fully populated index built from the answer-key branch.
2. **`verify_blinding.sh` cannot see database state.** It verified the directory and passed
   while a foreign room existed.
3. **Room names collide.** `cold-review` is the name the instructions tell every reviewer to
   use, so a second reviewer on the same host silently inherits the first one's index.

Required: reviewer runs must use a dedicated database, created empty and dropped afterwards,
with the room name namespaced per reviewer. The verifier must check the target database is
empty before ingestion — or the instructions must stop implying the export is
self-contained when it is not.

### 6.2 Freeze mechanism conflicts with the verifier

`REVIEWER_INSTRUCTIONS.md` offers two freeze mechanisms: a SHA-256 file, or `git init` inside
the export. **`verify_blinding.sh` fails any directory containing `.git`.** A reviewer who
follows the git path can no longer re-run verification, and the export they hand back trips
its own check.

The reviewer used both — hash first, then a git commit at the end — which is the only
combination that works, and nothing told them to.

Required: **one canonical freeze mechanism.** Recommend the detached SHA-256 file, with the
verifier explicitly permitting a `.git` created after export while continuing to reject one
inherited from the source. The current script cannot distinguish these, and that distinction
is the whole point.

### 6.3 Phase-order conflict

The reviewer was instructed to run setup before Phase 1, contradicting
`REVIEWER_INSTRUCTIONS.md`. Adjudicated at [§1](#disclosed-protocol-deviation): material for
CR-031 and CR-032, immaterial elsewhere.

The deeper problem is that the instructions require `verify_blinding.sh` and setup in Phase 0
and then say "do not run the engine yet" in Phase 1, while `setup.sh` prints coverage-adjacent
output. **Separate installation from ingestion.** Install in Phase 0; ingest at the start of
Phase 3, after questions are frozen.

### 6.4 Ingestion-report ambiguity

The reviewer reported three confusions in normal operation:

- **`processed 0` on idempotent re-ingestion.** Correct behaviour — intake is idempotent by
  design — but it reads as a failure. It should say what it skipped and why.
- **`pending` versus `unsupported` disagreement** between the intake summary and the coverage
  table for the same file.
- **"coverage" versus "intake" terminology** used for overlapping but non-identical counts.

None affects retrieval. All three cost reviewer time and undermine confidence in an
operator-facing surface whose whole purpose is trustworthiness.

---

## 7 · The relevance-score label

**Conclusion: yes, it is materially misleading. It should be renamed.**

The CLI prints a per-hit number under the heading of a relevance score. The value is the
reciprocal-rank-fusion weight, `1/(60 + rank)` summed across arms. Consequences:

- It is bounded in a narrow band near zero — a top hit is `0.0328`, which reads as
  near-zero confidence when it is in fact the best possible score.
- It is a **function of rank, not of similarity**. Two hits with wildly different semantic
  similarity get adjacent scores purely because they are adjacent in the ranking.
- It cannot be compared across queries at all, though its presentation invites exactly that.
- CR-033 is the concrete harm: ranks 1 and 2 differ by 0.0026, which correctly reflects
  adjacent ranks and completely conceals that the two documents state different figures and
  one is withdrawn.

**Recommendation: expose the arms separately** — lexical rank, semantic cosine similarity,
and the fused rank score under a name that says what it is. The cosine value is the number a
user actually wants when judging whether a hit is close, and it is already computed and
already used by the abstention gate. Renaming alone is the minimum; hiding the fused score
would remove the ordering rationale and is worse.

Not implemented during adjudication.

---

## 8 · State-contract correction

Assessed against the requirement that each state carry general semantic meaning, not merely
explain this fixture.

| State | Verdict | Justification |
|---|---|---|
| `PRESENT_BUT_UNREADABLE` | **Add** | General: any corpus contains files that are supplied but unparseable. Distinct from absent and from present-and-searchable. CR-031 and CR-032 are both mis-answered today for want of it, and the engine already computes the underlying fact in its coverage register. |
| `SUPERSEDED_OR_WITHDRAWN` | **Add** | General: document sets acquire revisions and retractions. CR-033 shows the harm — two versions tied at the top with different figures. Requires a document-status relation, which is the substantive work. |
| `REQUIRES_CALCULATION` | **Already specified, not implemented** | Confirmed useful: 4 of 4 calculation queries returned operands with no way to say a computation was needed. |
| `REQUIRES_COMPARISON` | **Already specified, not implemented** | Confirmed useful: 2 of 2, plus all 3 contradiction cases. |
| Found-but-insufficient | **Already specified as `INSUFFICIENT_EVIDENCE` and `SUBJECT_PRESENT_FACT_ABSENT`** | 6 of 6 subject-present queries failed for want of it. No new state needed — the existing design is right and unbuilt. |

**Two genuinely new states, both general.** The rest of the gap is the existing contract
being unimplemented rather than incomplete.

`PRESENT_BUT_UNREADABLE` is the cheapest meaningful improvement available: the engine already
holds the fact, in the same room, and does not consult it.

---

## 9 · Prioritised recommendations

### P0 — correctness

Issues that cause false confidence or materially wrong interpretation.

**P0-1 · Consult document status before answering.**
Scope: at query time, join retrieved documents against their processing state and the room's
withdrawal notices; surface status alongside each hit. Fixes CR-031, CR-032, CR-033 — three
of the four escalation-worthy errors.
Engine behaviour changes: **yes** — output gains a status field; ranking unchanged.
Tests: a query whose subject is an unreadable document must not present a substitute as
responsive; a withdrawn file must be labelled; status must never be inferred from filename.
Overfitting risk: **low** — reads state the engine already computes, no fixture-specific rule.
Blocks another cold review: **no**, but leaving it unfixed makes the next review re-find it.

**P0-2 · Re-derive the abstention floor from a representative answerable set.**
Scope: recalibrate using the cold reviewer's directly-answerable questions, which reach
0.6394 — below the entire fitted range. Do not hand-adjust the constant.
Engine behaviour changes: **yes** — the calibration record changes; code does not.
Tests: the calibration's answerable range must span the observed range; a regression test
that CR-001 and CR-009 are not suppressed.
Overfitting risk: **medium** — mitigated by using only the reviewer's development split and
scoring on their held-out split once.
Blocks another cold review: **no**.

**P0-3 · Do not present related-but-insufficient evidence as an answer.**
Scope: the evidence-sufficiency mechanism already designed and deliberately unbuilt. Fixes
CR-013, CR-015, CR-016, CR-018, CR-021, CR-023 — six of nine false supports.
Engine behaviour changes: **yes**, substantially.
Tests: the full held-out split, scored once.
Overfitting risk: **high** — this is the mechanism the prior analysis judged unbuildable on
23 cases. The cold review adds 33 independently written ones, which is real progress and
still short of the thresholds already fixed in `IMPLEMENTATION_EVIDENCE_THRESHOLDS.md`.
Blocks another cold review: **no**. **Do not start this before P1-1.**

### P1 — protocol

Issues preventing a credible repeat evaluation.

**P1-1 · Isolate the database per reviewer.** Dedicated empty database, namespaced room,
dropped afterwards; verifier checks emptiness before ingestion. **Blocks the next cold
review** — without it, results are not attributable to the export.

**P1-2 · One canonical freeze mechanism.** Detached SHA-256; verifier distinguishes a
post-export `.git` from an inherited one. **Blocks the next cold review.**

**P1-3 · Separate install from ingest across phases**, so the phase order is followable
without contradiction. Blocks the next review's claim to blindness on inaccessible-material
questions.

### P2 — usability

**P2-1 · Rename the relevance score and expose lexical, semantic and fused values
separately.** Engine behaviour changes: display only. Overfitting risk: none.

**P2-2 · Clarify ingestion reporting** — `processed 0` on a no-op re-ingest, `pending` versus
`unsupported`, and coverage-versus-intake terminology.

### Deferred capability

Calculation (4 queries), comparison (2), contradiction detection (3), absence detection (1).
**Nine of 33 queries — 27% — require capabilities ADR-003 §4 does not authorise.** They are
correctly out of scope, and the reviewer's inability to get answers for them is expected
behaviour rather than defect. They are recorded so the next reader does not mistake them for
regressions.

---

## 10 · What this review establishes

The engine's citation layer is **independently confirmed sound**: 200 of 200 citations
resolve, zero fabrications, zero unlabeled inference, checked by someone with no stake in the
result. That is the claim Reef rests on and it survived contact with a blind reviewer.

Everything else the review found is a variant of one sentence: **the engine cannot say what
it means.** It retrieves the right documents and then presents them under a single
undifferentiated "found", whether the evidence supports the question, contradicts it,
partially bears on it, is unreadable, or has been withdrawn. Six of nine false supports and
all twelve wrong-state verdicts reduce to that.

The reviewer's own verdict is the fair summary, and paraphrasing it would weaken it. Quoted
verbatim from `REVIEWER_OBSERVATIONS.md` §5:

> Not as an answering system, and I would be comfortable showing it as a citation-grade
> evidence locator with the limits stated out loud. The distinction is not a hedge. Every one
> of the 200 citations it produced is accurate to the page, row and line, it never invents
> text, and it declines rather than guessing on genuinely off-corpus subjects — that is a real
> and uncommon property, and it is the expensive half to build. But 9 of 33 answers were false
> supports, 4 of those would have changed what I did, and on the three questions where the room
> contradicts the seller the engine put the seller's claim at rank 1 and the refutation below
> the fold. A client who reads the top hit and moves on is worse off than a client who read
> nothing, because they now believe something specific and wrong. I would put it in front of an
> analyst who is going to open every source document anyway and wants to find them faster. I
> would not let its output near a memo without that analyst in between.

The observation about contradictions was reached independently of my [§4](#4--the-nine-false-supports)
analysis and matches it exactly: both sides of all three contradictions are retrieved, the
seller's assertion ranks first, and nothing marks the conflict.

**Scores were not adjusted after unsealing.** Reviewer verdicts stand as frozen; this document
adds ownership, severity and cause.
