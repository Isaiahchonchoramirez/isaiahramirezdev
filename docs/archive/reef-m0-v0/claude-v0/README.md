> **ARCHIVED — HISTORICAL ONLY.**
> This file is **not** implementation or validation authority and must not be
> cited as the current process.
> **Replaced by:** [`docs/validation/README.md`](../../../validation/README.md)
> **Superseded because:** Index for a package that no longer exists at that path.
> **Consolidated under:** [ADR-002](../../../decisions/ADR-002-validation-package-consolidation.md) on 2026-08-05.

# M0 · Concierge validation

The purpose of M0 is to find out whether the wedge chosen in
[`../01-strategy.md`](../01-strategy.md) is real. It is not to build toward it.

Everything in `docs/reef/` above this directory is a **hypothesis stated with
confidence** — that is the correct way to write a specification, and it is a dangerous
way to read one. This directory is the counterweight.

---

## The one-sentence question

> Do search funds, independent sponsors, and small-cap acquisition teams have a
> diligence workflow painful, frequent, and valuable enough that they will pay roughly
> $1,500 per deal for a concierge-produced findings memo?

Four conditions, all of which must hold. **Frequent** is the one most likely to fail and
the one the strategy document underweighted — see the risk register in
[`m0-plan.md`](m0-plan.md).

## The files

| File | Purpose |
|---|---|
| [`m0-plan.md`](m0-plan.md) | Hypothesis, assumption register, participants, two-week sequence, thresholds |
| [`interview-guide.md`](interview-guide.md) | Non-leading discovery script, seven role paths, five commitment tests |
| [`workflow-map.md`](workflow-map.md) | Teaser → IC decision, phase by phase, with the narrowest intervention identified |
| [`concierge-runbook.md`](concierge-runbook.md) | How to deliver the pilot by hand, including the evidence-labeling taxonomy |
| [`sample-deal-room.md`](sample-deal-room.md) | Synthetic corpus spec with twelve planted findings — becomes the eval fixture |
| [`pilot-offer.md`](pilot-offer.md) | The offer, three pricing experiments, terms |
| [`validation-scorecard.md`](validation-scorecard.md) | Pass / concern / fail thresholds; the M1 gate |
| [`decision-log.md`](decision-log.md) | Why this wedge, what's evidence vs. assumption, competing wedges, pivot triggers |

Filling order: read `m0-plan.md`, run interviews with `interview-guide.md`, populate
`workflow-map.md` from what you hear, then score.

---

## Status

**Nothing here is validated.** Zero interviews conducted. Every number in these
documents is a hypothesis or a threshold, never a finding.

When a real finding arrives, it goes in `decision-log.md` with a date and a source, and
the document it contradicts gets edited in the same commit.

**Marking convention** — use it consistently or the documents lose their value:

| Mark | Means |
|---|---|
| `[H]` | Hypothesis. Nobody has said this. |
| `[E]` | Evidence. A named participant said it on a dated call. |
| `[C]` | Contradicted. Evidence exists against it. |

---

## A note on the parallel blueprint

As of 2026-08-05 the working tree contains a second, independently written Reef
specification under `docs/vision/`, `docs/product/`, `docs/business/`,
`docs/architecture/` and `docs/design/`, produced outside this session. It reaches a
different conclusion: the first wedge is **evidence-linked assurance for
multidisciplinary AEC packages** rather than M&A diligence. The repository `README.md`
currently points at that set as canonical.

That is not a mistake to correct by fiat. AEC is runner-up wedge #1 in
[`../01-strategy.md`](../01-strategy.md), so the two documents agree about the space and
disagree only about order. Two specifications both claiming to be canonical is a real
problem, but it is a *cheap* problem right now and an expensive one after code exists.

**M0 is the right instrument to settle it.** See `decision-log.md`, which treats the AEC
wedge as a live competing hypothesis with its own falsification path rather than as an
error.
