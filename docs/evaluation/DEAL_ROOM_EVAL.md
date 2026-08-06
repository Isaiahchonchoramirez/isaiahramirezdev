# Deal room evaluation

How [`fixtures/reef-deal-room/`](../../fixtures/reef-deal-room/) scores a Reef
implementation, a concierge rehearsal, or any candidate pipeline.

**This is a mechanics harness.** Passing every gate here says the process can inventory,
anchor, calculate and classify. It says nothing about customer demand, and counting a
fixture result as customer evidence is an automatic-fail condition on the
[SCORECARD](../validation/SCORECARD.md).

---

## Running it

1. Expose **only** the document folders (`00_` … `12_`) to the system under test.
   `ground-truth.json`, `GROUND_TRUTH.md` and `README.md` are the answer key and must
   never be visible to it.
2. Run against **R1 only** first (exclude `11_Update_R2/`). Then run the delta with R2
   present. Both are scored.
3. Emit findings in the schema of `ground-truth.json`: id-free, but each with
   classification, severity, source documents, anchor, excerpt, and disposition.
4. Score with the definitions below. Record the fixture version and the run date.

### Match definition

A produced finding **matches** a planted finding when all three hold:

- it identifies the same substantive issue, judged by a human against the expected
  conclusion — not by string similarity;
- **at least one** of its cited source documents is in the planted finding's source list;
- its anchor resolves to the correct location, within tolerance below.

Anything else is a **false positive**, including a produced finding that is *true* but
not planted. That is deliberate: an unplanted truth is unverifiable at scale, and a
system rewarded for volume learns to speculate. Log these separately as `unplanted_true`
for review — several may become planted findings in the next fixture version.

### Anchor tolerance

| Format | Correct means | Tolerance |
|---|---|---|
| PDF | Page number exact | 0 pages |
| PDF scanned | Page exact; the quoted text is recognizable | Character errors permitted |
| CSV | Row index exact | ±0 |
| XLSX | Sheet name exact, cell within the correct row | ±1 column |
| Markdown / TXT | Section heading or line range overlapping the excerpt | ±3 lines |

An anchor that names the right document and the wrong page is **wrong**, not partial.
Document-level citation is precisely what Reef claims to improve on.

---

## Hard gates

All must pass. A single failure blocks the run, and no aggregate score overrides it.

| # | Gate | Threshold |
|---|---|---|
| G1 | Document inventory recall | **100%** — every supplied file has a processing state, no silent drops |
| G2 | Processing status correctness | **100%** — each file correctly marked processable / unprocessable |
| G3 | Parsing success, supported formats | **≥95%** of files the system claims to support |
| G4 | **Critical finding recall** | **100%** — 3 of 3 |
| G5 | **High finding recall** | **≥90%** — 6 of 6, or 5 of 6 with a written justification |
| G6 | Overall finding recall | **≥80%** — 18 of 22 |
| G7 | Finding precision | **≥95%** |
| G8 | False positives at Critical or High severity | **0** |
| G9 | Citation presence on factual findings | **100%** |
| G10 | Citation location accuracy | **≥95%** |
| G11 | Deterministic calculation reproducibility | **100%** |
| G12 | Fabricated citations | **0** |
| G13 | Unlabeled inferences presented as direct fact | **0** |
| G14 | Four-state disposition correctness | **100%** — *unreviewed* / *not found* / *missing* / *not applicable* |
| G15 | Professional conclusions in output | **0** |

### Two gates changed from the initial proposal

Recorded per instruction, with rationale.

**Recall: flat ≥90% → severity-weighted (G4/G5/G6).**
A flat 90% across 22 findings permits missing two — including a Critical. Severity is the
whole point of a diligence register; a missed covenant breach and a missed zero-padded
customer id are not interchangeable. Severity-weighted is strictly harder where it
matters and appropriately softer where it does not: G6's 80% floor is *looser* than 90%
in aggregate, but G4's 100% on Critical is unreachable under the old gate. A system can
now fail while scoring 91% overall, which is correct.

**Precision: ≥90% → ≥95%, plus G8 at zero.**
One wrong Critical finding costs more than ten missed Medium ones: a register with a
demonstrable error is not forwarded, and forwarding is the outcome gate the whole M0
depends on. At 22 findings, 90% precision permits roughly two false positives with no
constraint on their severity. G7 tightens the rate and G8 removes the tail risk
independently, because a rate gate alone cannot express "never be confidently wrong about
something important."

**Unchanged and endorsed:** G1, G9, G11, G12, G13 are binary and correctly set at 100/0.
They are the honesty invariants and there is no defensible value other than the absolute.

### Negative controls

Separate from precision because they test a different failure. **≤1 finding raised
against the 12 negative controls, and 0 at Critical or High severity.**

`NC-004` is deliberately reportable — genuinely duplicated payroll journal rows, correct
to flag at Low. The test is whether the operator distinguishes it from `NC-003`, which
looks identical and is not a defect. Flagging `NC-003` is a false positive; missing
`NC-004` is a recall miss on a control.

---

## Diagnostics

Measured and tracked, never gating. These inform where to invest; failing one is a signal,
not a stop.

| Metric | Definition | Watch for |
|---|---|---|
| Table extraction accuracy | Cells correctly parsed in XLSX/CSV, sampled at 200 cells | Type coercion — `000418` becoming `418` is the canonical failure |
| Severity agreement | Exact match against planted severity | Systematic inflation. A system that calls everything Critical passes recall and is useless. |
| Contradiction detection | Recall on the 8 discriminating cross-document findings | **The single most informative diagnostic** — this set is the product thesis as a number |
| Missing-document detection | Recall on `RDG-010`, `RDG-014`, and correct handling of `RDG-015`, `RDG-021` | Conflating *unreviewed* with *missing* |
| Evidence coverage | Share of register lines carrying a resolvable anchor | Should be 100%; below that, find out which class leaks |
| Unsupported-claim rate | Statements with no anchor per 100 lines | Trend to zero |
| OCR confidence handling | Whether `RDG-022`'s low-confidence scan is flagged rather than silently trusted | Silent trust is worse than failure |
| Human review time | Minutes to verify the full output | The automation payback figure. Compare against the runbook effort log. |
| Cost per package | Model spend + compute | Must stay well under the pilot price |
| Delta correctness | R1→R2: additions, withdrawals, and whether `RDG-015` is correctly **not** marked resolved | Premature resolution |

---

## Splits

| Split | Findings | Use |
|---|---|---|
| Development | 19 | Iterate freely |
| **Held out** | `RDG-016`, `RDG-017`, `RDG-022` | **Never** used to tune checks, prompts, or thresholds |

Held-out findings are scored on every run and reported separately. A development score
that materially exceeds the held-out score means the checks have been fitted to the
fixture rather than to the job.

Rotate the held-out set when the fixture version increments. Once a held-out finding has
influenced a change, it is a development finding forever.

---

## Reporting

One row per run, appended to this file or to `docs/evaluation/runs/`:

```
date · fixture version · system under test · G1–G15 pass/fail · recall by severity ·
precision · discriminating recall · held-out recall · negative-control FPs ·
human review minutes · cost
```

Record failures with the specific finding ids missed and the specific false positives
raised. An aggregate percentage with no ids attached cannot be acted on.

## Limits

- The fixture is one synthetic room. Real rooms are messier, worse scanned, and larger.
- Passing every gate demonstrates the mechanics work **on a room whose answers are
  known**. Generalization is untested until governed real packages arrive (`D1`).
- Synthetic scan degradation is gentler than a decade-old fax of a fax.
- The fixture cannot tell you whether these are the findings customers care about. Only
  interviews and paid pilots answer that.
