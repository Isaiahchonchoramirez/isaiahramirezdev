# Next evaluations

Three technical evaluations, in order. Nothing else is queued, and nothing here authorizes
new engine capability — every item below measures what already exists.

The engine passes its scored gates on one synthetic fixture. That is a statement about
mechanics and nothing else. It is not validation, not production readiness, and not
approval to process customer data.

---

## 1 · Retrieval failure analysis for the five missed fixture targets

R1 recall@12 is 14 of 19. The five misses are:

| id | title |
|---|---|
| RDG-004 | Recurring revenue share unsupported as stated |
| RDG-015 | Referenced Exhibit B absent from baseline room |
| RDG-018 | Entity name inconsistent across records |
| RDG-019 | Customer identifier zero-padding lost |
| RDG-021 | Tax support archive cannot be opened |

**The question to answer is whether these are retrieval defects at all.** At least three
describe an *absence* or a *comparison* rather than a passage of text. Nothing in the
corpus says "Exhibit B is missing" or "these two identifiers do not join" — there is no
passage to retrieve, because the finding is the gap between two passages. RDG-021 is a
file Reef already registered correctly as unprocessable; retrieving it is a register
question, not a search question.

Classify each miss as one of: a genuine retrieval failure, a finding-layer requirement, or
a query-formulation artifact of scoring by finding title. Only the first category is work
for this engine, and inflating recall by moving the other two would be measuring the wrong
thing.

Do not tune the abstention floor or the fusion constant against these five. Both are
already noted as under-evidenced; fitting them to known answers converts a measurement
into a rehearsal.

## 2 · Cold-run evaluation by a reviewer who did not author the fixture or the engine

Every number currently in `benchmarks/ridgeline-m1-baseline.json` was produced by the same
party that wrote the fixture, wrote the engine, and chose the gates. `SCORECARD.md` already
names this conflict for the market evidence; it applies just as directly here.

A second reviewer should run the eval from a clean checkout against the documented setup,
without assistance, and independently judge: whether the gates measure what they claim,
whether the abstention questions are fair negatives, whether scoring retrieval by finding
title is generous, and whether anything in the harness reads the answer key earlier than it
should.

Disagreement is the useful output. Agreement from a reviewer who read the author's
reasoning first is worth much less.

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
