# 01 · Strategy

---

## Vision

**Ten years.** Every organization runs on information it cannot see. It sits in
folders nobody opens, contracts nobody reread, recordings nobody transcribed,
spreadsheets whose author left. Reef's end state is that this stops being true: an
organization's entire information history is continuously understood, connected, and
answerable, and the answer always shows its work.

**The bet.** Understanding a corpus is not a chat feature. It is infrastructure, and
it is worth paying for monthly and forever, the way companies pay for storage and
observability without renegotiating whether they need them.

## Mission

Upload anything. Understand everything. Every answer shows where it came from.

That third clause is not a slogan. It is the product's only durable moat — model
quality is rented from labs and resets every six months, but an evidence system that
users trust with a decision is something they don't re-evaluate.

## Long-term company vision

| Horizon | What Reef is | Who pays |
|---|---|---|
| Year 1 | A diligence tool that turns a data room into a findings memo in hours | Individual deal-doers, per project |
| Year 2–3 | A document-intelligence workspace for any deadline-driven, evidence-critical review | Small teams, per seat + per project |
| Year 4–6 | The system of record for what an organization knows, with connectors into where it already lives | Departments, annual |
| Year 7–10 | Infrastructure other products build on — the understanding layer, sold by API | Other companies |

Each row must be paid for by the row above it. Reef does not raise money to skip rows.

---

## Product philosophy

Six principles. Each is written as a refusal, because a principle that never stops you
from doing something isn't one.

### 1. Show the page or say nothing

Every generated sentence is bound to a span in a source document. Hover it, see the
highlight. Click it, land on the page.

*We will refuse to* ship a summary feature that produces fluent prose without
span-level provenance, however good the prose is.

### 2. "Not in this corpus" is an answer

The failure mode that kills a diligence tool is confident invention. Reef's retrieval
returns nothing rather than returning the nearest thing.

*We will refuse to* lower a confidence threshold to improve a demo.

### 3. The deliverable, not the conversation

Chat is an input method, not a product. What leaves Reef is a memo, an issues list, an
export — something a person forwards to someone who has never heard of Reef.

*We will refuse to* make the chat transcript the primary artifact.

### 4. Fast beats immersive when they conflict

The beautiful thing must never be in the path of the urgent thing. Every piece of data
is reachable by keyboard in under a second, with the 3D world not running.

*We will refuse to* put an animation between a user and their document.

### 5. Calm

The ocean breathes. Nothing strobes, nothing demands attention, nothing celebrates
itself. The subject matter is someone's stressful week; the software should lower the
temperature in the room, not raise it.

*We will refuse* neon, confetti, urgency badges, streaks, and any notification that
exists to drive engagement rather than to report a fact.

### 6. Ship the small true thing

DataGate's lesson, kept: a narrow tool that does exactly what it says beats a broad
one that gestures. Every milestone is independently useful to someone.

*We will refuse to* build a capability that has no user until three other capabilities
exist.

## Design principles

1. **Depth means provenance.** In the reef, vertical position encodes abstraction.
   Answers float near the surface; raw source sits on the floor. Swimming down *is*
   drilling into evidence. The metaphor is functional or it gets cut.
2. **Structure is the thing 3D shows.** Use the world where shape, density, cluster
   and gap are the information. Never to display a list.
3. **One primary action per surface.** If a screen has two equally weighted CTAs, the
   screen has not been designed yet.
4. **Empty states teach.** A new workspace is the best teaching moment the product
   gets and the worst-used one in most software.
5. **Every state is designed.** Loading, empty, error, partial, stale, permission-denied,
   too-large, unsupported-format. A surface isn't done until all eight exist.
6. **Keyboard-complete.** Anything doable with a mouse is doable without one. This is
   an accessibility requirement and, independently, what makes power users stay.

---

## The wedge

### The problem being sold against

Someone is handed 2,000–8,000 documents and ten days. A data room for a small
acquisition: contracts, leases, cap table, financials, employee agreements, insurance,
litigation, permits, tax. They must find every fact that changes the price or kills
the deal — change-of-control clauses, auto-renewing obligations, customer
concentration, unassigned IP, related-party transactions, expiring leases, missing
signatures.

Today this is done by reading, with a checklist, at 2am, by one or two people. It is
expensive, deadline-bound, mind-numbing, repetitive, and the cost of missing one thing
is measured in hundreds of thousands of dollars.

Painful, boring, expensive, repetitive, impossible to staff. Every box.

### Beachhead: search funds, independent sponsors, and small-cap M&A

Not enterprise PE. Not law firms. Specifically:

- **Searchers / ETA buyers** — an individual or pair acquiring one small business,
  usually $2M–$20M enterprise value. They do their own diligence. They have no
  associates.
- **Independent sponsors** — deal by deal, no committed fund, small team.
- **Boutique M&A advisors and corp dev teams of one to three** at companies that
  acquire occasionally.
- **Small-fund PE**, sub-$500M, where the analyst bench is thin.

Why this buyer and not a bigger one:

| Property | Why it matters for a solo founder |
|---|---|
| Buys self-serve, no procurement | There is no enterprise sales motion and won't be for two years |
| Reachable online | Searchfunder, X, ETA podcasts, r/search_funds, Stanford/HBS search communities — chatty, referral-dense, findable without a sales team |
| Deal-shaped spend | Pays per project out of deal budget, not per seat out of a software line item |
| Life-changing deal size | A $3k tool on a $6M acquisition is a rounding error they will not haggle over |
| Ignored by incumbents | Hebbia and Harvey will not sell a $3k contract. This buyer is beneath their CAC floor and they know it. |
| Deadline creates urgency | Nobody "evaluates" during diligence. They buy Tuesday and use it Wednesday. |

The last two are the whole opportunity. The well-funded competitors cannot profitably
serve this segment, which means the segment is not being fought over.

### Runner-up wedges

Kept documented so the pivot is cheap if the beachhead fails. Same engine, different
checklist and output template.

1. **Construction and engineering bid/submittal review.** Equally acute, equally
   deadline-driven, arguably larger. Harder to reach online, longer trust cycle.
2. **Insurance claim and policy review** for small brokerages. Very repetitive, clear
   ROI, but regulated and slower.
3. **Municipal records and public comment** for journalists and civic groups. Best
   press story, least money. Good as a free tier that generates credibility.

The engine is wedge-agnostic. What changes between them is the extraction schema, the
checklist, and the output template — roughly 15% of the codebase. Do not build
generic; build one and keep the seam.

---

## Competitive analysis

| Who | What they do | Where they beat Reef | Where Reef wins |
|---|---|---|---|
| **Hebbia** | Matrix — document analysis for finance, the closest analogue | Funding, model access, brand in finance, enterprise sales | Won't sell below a large contract. No self-serve. Reef takes the buyer they decline. |
| **Harvey** | Legal AI, enterprise firms | Distribution into AmLaw, trust | Same — enterprise-gated, priced for firms with procurement |
| **Rogo** | AI analyst for banking | Finance-native workflows | Bigger buyer, same gate |
| **Glean** | Enterprise search across SaaS connectors | Connector breadth, in-org distribution | Glean answers "where is it." Reef answers "what does it mean and what's wrong with it." Different job. |
| **Datasite / Ansarada / Intralinks** | VDR incumbents adding AI features | They already host the data room | Their AI is a feature bolted to storage. Interface quality is a decade behind. Reef is the analysis layer regardless of where the room is hosted. |
| **NotebookLM** | Free, upload sources, ask, cite | Free, Google-grade models, excellent at the motion | No tenancy, no team, no export artifact, no schema extraction, no posture for confidential deal data. It is the demo of the category, not the product. |
| **Reducto / LlamaParse / Unstructured** | Document parsing infrastructure | Better at extraction than Reef will be | These are Reef's *suppliers*, not competitors. Use them. |
| **Palantir Foundry** | Ontology over enterprise data | Everything, at 1000× the price | Not addressable and not the same buyer |
| **ChatGPT / Claude with file upload** | The default alternative | Free-ish, already open | Context limits, no persistence across a corpus, no provenance a user can audit, no artifact. This is the real competitor for the beachhead and must be beaten on **evidence and scale**, not on model quality. |

**The honest read.** Reef cannot win on model quality — that is rented. It cannot win
on funding or sales. It wins on a segment nobody is serving, an evidence system nobody
bothers to build properly, and interface craft that in this category is genuinely rare.
Two of those three are durable.

### Positioning statement

> For deal-doers running diligence without an army, Reef turns a data room into a
> findings memo where every claim links to the page it came from. Unlike enterprise
> platforms that won't sell to you and chatbots that can't hold your corpus, Reef is
> priced per deal, works the day you buy it, and never asserts anything it cannot show.

---

## Why companies pay

The arithmetic, which should appear on the pricing page nearly this plainly:

- A small-cap diligence read is 60–120 hours of human document review.
- Loaded cost of that person: $100–$400/hour, or the searcher's own time, which is the
  scarcest thing they have.
- Reef removes 40–70% of it and catches items a tired human misses at hour 50.
- One missed change-of-control clause or auto-renewing contract is a
  $50k–$500k+ error.

Reef at $2,500 for the deal against $10,000+ of labor and a tail risk in the hundreds
of thousands is not a purchasing decision anyone agonizes over. That is the correct
shape for a first product: the value is arithmetic, not vibes.

## Pricing strategy

**Deviation from the brief, deliberate.** The $49 / $299 / $999 / $10k seat ladder is
wrong for V1. Diligence is project-shaped: intense for three weeks, dormant for four
months. Seat pricing on a bursty workflow either overcharges the idle months or
undercharges the intense one, and it makes users delete data to manage cost — which
destroys the corpus Reef's value compounds on.

**Year one — price the deal.**

| | Price | Includes |
|---|---|---|
| **Single deal** | $1,500 | One data room, up to 5,000 documents, 90 days, 2 collaborators, memo + exports |
| **Deal pack** | $6,000 | Five rooms, 12 months, 5 collaborators. Working out to $1,200/room. |
| **Sponsor** | $2,000/mo | Unlimited rooms, unlimited retention, 10 seats, priority processing |
| **Free** | — | One room, 50 documents, no export, watermarked memo. Real enough to prove it works, small enough that a live deal doesn't fit. |

The free tier's ceiling is set by *document count*, not by feature removal. A crippled
free tier teaches people the product is bad. A small free tier teaches them it works
and that their deal is bigger than 50 documents.

**Year two, once usage is continuous rather than bursty**, seats become defensible and
the ladder can return. Not before.

**Never** price by page, token, or "AI credit." The buyer cannot forecast it, so they
under-upload, and an under-uploaded corpus makes Reef look wrong.

---

## First paying customer

Write this on a card. Every feature argument gets settled by asking what she'd say.

> **A searcher, 14 months into a two-year search**, backed by a small group of
> investors. Ex-consultant or ex-operator, MBA, comfortable with software but not a
> developer. She has one live LOI on a $7M HVAC services business and 19 days of
> exclusivity left. The seller's "data room" is a Dropbox folder with 1,400 files,
> inconsistently named, a third of them scans. She has one part-time analyst and her
> own nights. Her fear is not inefficiency — it is that something is in there that she
> will find out about after closing.

What she needs, in order: **find the landmines**, produce something she can send her
investors, and not have to trust it blindly.

What she does not need and will not pay for: a knowledge graph she has to interpret, an
agent that acts on her behalf, a workflow builder, a dashboard, or a beautiful ocean —
though the ocean is why she remembers Reef and tells the next searcher about it.

**Where she is found:** Searchfunder.com, ETA podcasts (Acquiring Minds, Think Like an
Owner), X's search-fund community, the searcher Slack groups, university search
programs, and the brokers and QoE accountants who serve twenty of her at once. That
last channel is the highest-leverage one and should be pursued by month three.

---

## Market positioning

Reef sits between free general assistants and enterprise platforms, in a band that is
empty because it is too small to interest the funded companies and too demanding to
interest the free ones.

```
           evidence-grade, auditable
                     ▲
     Harvey ·  Hebbia │  Palantir
                      │
      ┌───────────────┼──────────────┐
      │       R E E F │              │  ← empty band:
      └───────────────┼──────────────┘    self-serve + evidence-grade
                      │
    NotebookLM  ·  ChatGPT upload
                      │
                      ▼
              casual, unverifiable
   ◄── self-serve ──────── enterprise-sold ──►
```

Reef's job is to make that band a real place, then move upward and rightward over
years — never by claiming the upper right before it's earned.

---

## Kill criteria

Written now, while it's cheap to be honest. Check at each milestone.

| Signal | Read | Action |
|---|---|---|
| M0's concierge deals take >30h of manual work each and users are lukewarm | The pain is not what we think | Stop. Re-interview before building anything. |
| Users read the memo but don't send it to anyone | The artifact is wrong | Fix the artifact, not the engine. |
| Evidence links get clicked <20% of sessions | Provenance is not the moat; it's hygiene | Keep it, stop marketing on it, find the real differentiator. |
| Free→paid under 3% after 100 rooms | Free tier is either too generous or the value isn't landing | Re-cut the free ceiling once. If it doesn't move, the wedge is wrong. |
| Extraction accuracy plateaus below ~90% on the checklist | The core promise can't be kept | Narrow the checklist to what does hit 90% and sell only that. |
| Six months, no repeat customer | Deal-shaped buying doesn't retain | Move to the runner-up wedge with continuous usage. |

The one that matters most: **if nobody forwards the memo, Reef is a toy.** Instrument
export and share events from the first milestone.
