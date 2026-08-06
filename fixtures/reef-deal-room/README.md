<!-- SYNTHETIC — FICTIONAL COMPANY — NOT REAL -->

# Reef synthetic deal room

**Every document here is fictional evaluation material.** Ridgeline Industrial Services,
LLC does not exist. No person, customer, supplier, contract, address, or figure
corresponds to any real entity. Nothing here was derived from, or anonymized from, real
confidential material.

Specification: [`docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md`](../../docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md)
Scoring: [`docs/evaluation/DEAL_ROOM_EVAL.md`](../../docs/evaluation/DEAL_ROOM_EVAL.md)

## Regenerating

```
python3 tools/reef-fixture/generate.py
```

Deterministic under seed `20260805`. One financial model is built first so every derived
document ties by construction; consistency is broken **only** at the 22 planted points.
An unplanted inconsistency is a fixture defect, not realism — three were found and fixed
on first generation (revenue detail not tying to the income statement, AR aging off by
$1,000, and a "password-protected" archive that opened).

The generator emits `ground-truth.json` and `GROUND_TRUTH.md` from the same model, so the
answer key cannot drift from the fixture.

## Contents

| | |
|---|---|
| Documents | 121 across 13 folders |
| Formats | Markdown, TXT, CSV, XLSX, PDF, one scanned PDF, one encrypted ZIP |
| Planted findings | 22 — 3 Critical, 6 High, 9 Medium, 3 Low, 1 Informational |
| Cross-document discriminating | 8 |
| Held-out split | 3 (`RDG-016`, `RDG-017`, `RDG-022`) — never used to tune checks |
| Negative controls | 12 |
| Versions | R1 baseline; `11_Update_R2/` is the delta |

## Do not

- **Expose `ground-truth.json` or `GROUND_TRUTH.md` to any pipeline being evaluated.**
  They are the answer key.
- Tune checks against the held-out findings.
- Put real customer material in this directory. Live data is handled under
  [`CONCIERGE_RUNBOOK.md`](../../docs/validation/CONCIERGE_RUNBOOK.md) and never enters
  the repository.

## What passing this proves

Mechanics: that the process can inventory a package, anchor evidence, calculate
correctly, and distinguish *unreviewed* from *not found* from *missing* from *not
applicable*.

It proves nothing about customer demand, willingness to pay, data access, or
differentiation. Counting a fixture result as customer evidence is an automatic-fail
condition on the [scorecard](../../docs/validation/SCORECARD.md).
