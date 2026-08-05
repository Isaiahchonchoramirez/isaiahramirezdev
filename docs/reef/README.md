# Reef — canonical blueprint

The product specification. Written to be implemented one section at a time without
relitigating decisions made in the others.

**Status:** specification. Nothing here is built. `projects/datagate/` still contains
the DataGate profiler, which is real, tested, and becomes Reef's evidence engine
rather than being thrown away.

---

## Read this first

Three decisions are load-bearing. Every other decision in these documents descends
from one of them. Change one of these and the rest needs rereading; change anything
else and it probably doesn't.

### 1. Reef sells a deliverable, not a capability

Nobody buys "understand your information." They buy a specific artifact with a
deadline attached to it. Reef's first artifact is **a diligence findings memo with
every claim linked to the page it came from**, produced from a data room in hours
instead of a week.

The platform vision is real and it is the ten-year destination. It is not the thing
being sold in month one, and the landing page must not claim it. See
[01-strategy.md](01-strategy.md).

### 2. The ocean is a view, not the shell

The immersive reef is the map: the only surface that shows the *shape* of a corpus,
where the gaps are, what connects to what, what nobody has opened. It is genuinely
better than a file tree at that job and it is why people will screenshot the product.

It is not how you work. Working is a fast list, a search box, and a keyboard. A user
on a deadline reaches their document in one keystroke, never by swimming. `Tab`
toggles the two. Neither is a novelty mode and neither is the "real" one.

If this collapses — if the 3D becomes mandatory — Reef becomes a demo that people
admire and don't renew. See [03-ux.md](03-ux.md).

### 3. Every claim carries its evidence or it does not ship

DataGate's whole story was removing assertions the code couldn't back. Reef inherits
that constraint at a much higher stake: it is generating prose about documents that
someone will make a financial decision on.

Rule: no sentence Reef writes reaches a user without a span-level link to the source
that produced it. Not a document-level citation — a highlight on a page. When Reef
can't find support, it says the corpus doesn't contain it. "Not found" is a shipped
feature, not a failure state. See [05-architecture.md](05-architecture.md), evidence
model.

---

## The documents

| File | What it settles | Read when |
|---|---|---|
| [01-strategy.md](01-strategy.md) | Vision, philosophy, the wedge, the buyer, competition, pricing, kill criteria | Before anything. Changes what everything else means. |
| [02-roadmap.md](02-roadmap.md) | MVP boundary, milestones M0–M6, V2/V3, enterprise horizon, critical path | Planning any block of work |
| [03-ux.md](03-ux.md) | Every surface: purpose, goal, CTAs, states, motion, keyboard, a11y | Building any screen |
| [04-visual-and-world.md](04-visual-and-world.md) | Identity, palette, type, the reef taxonomy, depth semantics, motion language, performance budgets | Building anything visual or 3D |
| [05-architecture.md](05-architecture.md) | Ingest, retrieval, evidence model, storage, models, security, graduation triggers | Building anything server-side |
| [06-teams.md](06-teams.md) | Agent charters, dependencies, sprint order, the review queue | Delegating work |
| [07-marketing.md](07-marketing.md) | Narrative, homepage copy, demo flow, launch, Awwwards, GitHub, investors | Writing anything public-facing |

Adjacent, already written:

- [`../reef-sora-kit.md`](../reef-sora-kit.md) — fourteen shot prompts for the launch
  film. The palette in `04-visual-and-world.md` is the same palette. Keep them in sync.

---

## How to use this in a future session

Load the index plus the one document you need. Loading all seven costs a large
fraction of a context window and is almost never necessary.

```
Implementing a screen      → README + 03-ux + 04-visual-and-world
Implementing ingest        → README + 05-architecture
Deciding what's next       → README + 02-roadmap
Writing public copy        → README + 01-strategy + 07-marketing
```

**When the spec and reality disagree, reality wins and the spec gets edited.** A
blueprint that is quietly wrong is worse than no blueprint, because it keeps getting
cited. If a milestone slips, if the buyer turns out to be someone else, if the
architecture hits a wall — change the document in the same commit as the code that
proved it wrong.

---

## What this specification deliberately does not contain

- **Code.** By instruction, and correctly. Interfaces are described in prose and
  tables. The first session that writes code should be reading, not extending, this.
- **A 100-person org chart.** The executing organization is one person and a set of
  agents whose throughput is capped by that person's review bandwidth. `06-teams.md`
  is written for that reality. Roles are charters, not headcount.
- **Enterprise revenue in year one.** $50k custom integrations and $100k private
  cloud appear in `02-roadmap.md` as a horizon with named entry conditions, not as a
  plan. Nothing in the first four milestones assumes an enterprise sale, because
  there is no enterprise sales motion and building for one before then would be
  building against an imaginary customer.
- **A general "upload anything" product.** Reef will become one. It does not start as
  one, and the difference between those two sentences is the whole strategy.
