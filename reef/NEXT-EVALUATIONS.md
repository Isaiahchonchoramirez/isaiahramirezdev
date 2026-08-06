# Next evaluations

Three technical evaluations, in order. Nothing else is queued, and nothing here authorizes
new engine capability — every item below measures what already exists.

The engine passes its scored gates on one synthetic fixture. That is a statement about
mechanics and nothing else. It is not validation, not production readiness, and not
approval to process customer data.

---

## 0 · Fix the abstention gate, or accept that there is not one

**This is now the first item, ahead of retrieval work.** The gate fails at 50% on held-out
negatives and the calibration record says why: the distributions overlap. A held-out
negative scores 0.7308, inside the answerable range of 0.6789-0.7939. No floor separates
them, so the gate cannot be repaired by moving a number — raising it to reject the leaks
rejects real answerable queries, and RDG-009 is already lost to the current floor at 0.6488.

All three leaks are subjects the corpus covers whose specific fact is absent: an ESOP
schedule, an interest-rate swap, a Delaware subsidiary list. The corpus has a request list,
a debt schedule and corporate records. Retrieval cannot tell "covers this subject" from
"states this fact".

Decide one of: accept a retrieval-only engine with no reliable abstention and say so
wherever results are shown; add a cheap non-generative check that the retrieved passages
actually mention the queried entity; or defer abstention entirely to a findings layer. Do
not tune the floor.

## 1 · Retrieval failure analysis for the four missed fixture targets

R1 recall@12 is 15 of 19 under the corrected configuration. The verified misses are:

| id | title | first read |
|---|---|---|
| RDG-008 | Single-supplier dependency with 60-day termination | not yet classified |
| RDG-009 | Unbilled work in process grew far faster than revenue | abstained at 0.6488, just under the 0.6555 floor — a cost of the gate, not a retrieval failure |
| RDG-015 | Referenced Exhibit B absent from baseline room | abstained at 0.5735; the finding is an absence and no passage states it |
| RDG-021 | Tax support archive cannot be opened | the source is the encrypted archive, which has no chunks by construction and cannot be retrieved at any rank |

**The previous list was wrong.** The invalidated benchmark named RDG-004, RDG-015, RDG-018,
RDG-019 and RDG-021. Three of those — RDG-004, RDG-018, RDG-019 — were artifacts of the
embedding-model mismatch and retrieve their sources at rank 1 to 3 under the corrected
configuration. RDG-008 and RDG-009 were not previously visible as misses. Anyone resuming
this work should read `benchmarks/ridgeline-m1-baseline-v2.json`, not the invalidated record.

**The question to answer is whether these are retrieval defects at all.** RDG-015 and
RDG-021 almost certainly are not: nothing in the corpus says "Exhibit B is missing", because
the finding *is* the gap, and RDG-021's source is a file with no chunks that Reef already
registered correctly as unprocessable. Retrieving it is a register question, not a search
question. RDG-009 is a thresholding cost rather than a retrieval failure. That leaves
RDG-008 as the only candidate for a genuine retrieval defect.

Classify each miss as one of: a genuine retrieval failure, a finding-layer requirement, or
a query-formulation artifact of scoring by finding title. Only the first category is work
for this engine, and inflating recall by moving the other two would be measuring the wrong
thing.

Do not tune the abstention floor or the fusion constant against these five. Both are
already noted as under-evidenced; fitting them to known answers converts a measurement
into a rehearsal.

## 2 · Cold-run evaluation by a reviewer who did not author the fixture or the engine

Every number in `benchmarks/ridgeline-m1-baseline-v2.json` was produced by the same party
that wrote the fixture, wrote the engine, chose the gates, and wrote both the answerable and
the negative query sets used to calibrate and then to score the abstention floor. `SCORECARD.md` already
names this conflict for the market evidence; it applies just as directly here.

A second reviewer should run the eval from a clean checkout against the documented setup,
without assistance, and independently judge: whether the gates measure what they claim,
whether the abstention questions are fair negatives, whether scoring retrieval by finding
title is generous, and whether anything in the harness reads the answer key earlier than it
should.

Disagreement is the useful output. Agreement from a reviewer who read the author's
reasoning first is worth much less.

The v1 benchmark documented a model it never ran, and the error survived a full
verification pass, two commits and a written report before a routine trace caught it. That
is the strongest available argument for this item.

## 3 · Representative real-package testing — only after lawful data access is confirmed

**Blocked, and the block is not procedural.** `L1` is unanswered: it is not established that
a buyer may lawfully route seller-confidential documents to a third-party service. No real
document may enter this engine until that question has an answer, and `D1` must supply
governed packages after it.

This is the evaluation that would actually test `T1`. The fixture's PDFs were generated
rather than scanned, its spreadsheets are well-formed, and its one degraded scan was
degraded programmatically — `SYNTHETIC_DEAL_ROOM_SPEC.md` records that synthetic degradation
is kinder than a decade-old fax. 100% anchor accuracy here predicts very little about a
real room.

When it is unblocked, measure anchor accuracy on a stratified sample of at least 100
factual findings across real formats, and compare against the synthetic baseline. Expect
the number to fall. How far it falls is the finding.

---

## Not queued

Deliberately listed so they are not started by inference from the roadmap: knowledge graph,
multi-agent workflows, production UI, cloud deployment, authentication, billing,
multi-tenancy beyond the row-level-security boundary already present, enterprise SSO,
automated diligence conclusions, platform expansion.

## Not technical, and more urgent than any of the above

Building the engine advanced no customer hypothesis. These remain the actual blockers:

1. **Schedule qualified interviews.** Zero have happened.
2. **Contact transaction counsel** on third-party processing and NDA permissions — this is
   `L1`, it is binary, and it can be answered in one call.
3. **Test willingness to pay.**

[ADR-003](../docs/decisions/ADR-003-m1-engine-authorization.md) §7 sets the tripwire: if no
qualified interview has been conducted by **2026-09-06**, engine work stops until five are
booked.
