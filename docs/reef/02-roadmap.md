# 02 · Roadmap

Every milestone below ships to a real user and creates value on its own. None of them
requires the next one to be worth having. If a milestone can only be justified by what
comes after it, it has been specified wrong.

---

## MVP definition

**The MVP is one sentence:** upload a folder of deal documents, and get back a findings
memo where every claim links to the page it came from.

### In

- Ingest: PDF (native and scanned), DOCX, XLSX, CSV, TXT, EML, and ZIPs of them
- OCR for scans, with a visible confidence signal
- A fixed diligence checklist of ~25 findings run over the corpus
- Ask-a-question over the corpus, with span-level citations
- The memo: findings, severity, evidence links, exported as Markdown / PDF / DOCX
- One user, one room, no sharing

### Out — and each of these is a decision, not an omission

| Not in MVP | Why |
|---|---|
| The 3D reef | It sells the product and doesn't do the job. It ships at M4, when there's a corpus worth mapping and a user worth impressing. |
| Accounts and teams | The first ten customers can be onboarded by hand. Auth built before there are users is auth built against a guess. |
| Connectors (Drive, SharePoint, Dropbox) | Deal rooms arrive as a zip or a share link. Solve the actual intake, not the imagined one. |
| Agents, workflows, automations | No user has asked. Three capabilities must exist before a fourth can orchestrate them. |
| Audio and video ingest | Not present in a data room. Real for later wedges. |
| Any dashboard | Nobody buys a chart of their own documents. |
| Custom checklists | Ship one good checklist first. Customization before a working default just exports the hard problem to the user. |

### Definition of done

Given a real 1,000-document room, Reef produces a memo that a searcher sends to their
investors **without editing out anything Reef got wrong.** That is the bar. Not
accuracy in the abstract — zero embarrassing claims in a document that leaves the
building with their name on it.

---

## Milestones

### M0 · Concierge — no product

**Ship:** a finished diligence memo, delivered by email, for three real deals.

Do it manually. Scripts, local models, DataGate's profiler on the spreadsheets, and
your own reading. Charge $500 so it's a transaction rather than a favor — the price is
low because you're buying information, not revenue.

**Value:** they get the memo. It works because a person made it work.

**You get:** what the checklist actually is, which document types dominate, where the
time really goes, what they read first in the memo, and what they ignore. All of this
is currently guesswork and every downstream decision depends on it.

**Exit:** three memos delivered, one written checklist derived from real deals, one
signed sentence from a customer describing the value in their own words.

**Do not skip this.** Every hour here removes a week of building the wrong thing. It
is also the only milestone with zero technical risk and the highest information yield.

---

### M1 · Ingest and evidence — one user, ugly

**Ship:** a local tool that takes a folder, processes it, and answers questions with
span-level citations.

- Parse PDF / DOCX / XLSX / CSV / TXT / EML, OCR the scans
- Chunk with structure preserved (page, section, table, cell)
- Embed, index, hybrid retrieval with a reranker
- Ask a question → answer with clickable spans that open the page at the highlight
- "Not found in this corpus" when support is absent

**Value:** you can do M0's concierge work in a third of the time. The first user is you,
which is the correct first user.

**Exit:** on a held-out set of 50 questions against a real room, ≥90% of answers are
supported by the span they cite, and the tool says "not found" rather than inventing on
every one of the 10 questions whose answers were deliberately removed from the corpus.
That second number is the one to watch.

---

### M2 · The memo

**Ship:** the checklist runs unattended and produces the artifact.

- ~25 findings, each with severity, plain-language consequence, and evidence
- Cross-document reasoning for the findings that need it (this contract references a
  schedule that isn't in the room)
- Gap detection: what a normal room has that this one doesn't
- Export to Markdown, PDF, DOCX

**Value:** this is the product. Someone would pay for M2 alone with no interface beyond
a file drop.

**Exit:** memo quality matches your hand-written M0 memos as judged by the M0 customers
themselves. Ask them directly and take the answer.

---

### M3 · Product — accounts, rooms, the first self-serve dollar

**Ship:** a real web application.

- Auth, workspaces, rooms, billing
- Upload with live processing state
- The working surface: fast list, search, document viewer, ask panel
- The memo surface, shareable by link
- Free tier at 50 documents

**Value:** a stranger can buy and use Reef without you present. This is the first
milestone that scales past your calendar.

**Exit:** three customers acquired without a conversation. Not three signups — three
payments from people you never spoke to.

---

### M4 · The Reef

**Ship:** the 3D corpus map, as a view.

- Ingested objects become organisms by type (`04-visual-and-world.md`)
- Depth encodes abstraction: answers near the surface, raw source on the floor
- Connections render as filaments; unread and unresolved regions read as dark
- `Tab` toggles list ↔ reef, full parity, no data reachable only in 3D
- Full fallback for no-WebGL, reduced-motion, and low-power devices

**Value:** genuine — "what's in here and what haven't I looked at" is a question a list
answers badly. Also the entire marketing engine: the launch film, the Awwwards
submission, the screenshot that gets forwarded.

**Exit:** a user who has both views chooses the reef for orientation at least once per
session, unprompted. If they never do, it's decoration; keep it for marketing, stop
investing.

**This is the highest-risk milestone for reasons that aren't technical.** It's the most
fun to build and the least necessary. Building it before M3 is the single most likely
way this project dies with a beautiful, unsold artifact.

---

### M5 · Teams and time

**Ship:** collaboration and versioning.

- Multiple users per room, presence, comments anchored to spans
- Assignment and resolution of findings
- Room versioning: the seller uploads 200 more documents on day 12 — Reef diffs the
  room, re-runs only what changed, and reports what moved
- Full history: every question, answer, and export, replayable

**Value:** the re-diligence diff is the sleeper feature. It is agony by hand and nobody
does it well. It may end up more valuable than the initial pass.

**Exit:** rooms average more than one user, and diff runs exceed initial runs in
frequency.

---

### M6 · Enterprise posture — on demand only

**Ship:** SSO/SAML, SCIM, audit logs, retention policy, DPA, SOC 2 Type I in progress,
optional VPC or single-tenant deployment.

**Trigger:** build the specific item when a named customer with a signed intent asks for
it in writing. Not before. Enterprise features built speculatively are the most reliable
way to spend six months producing nothing a user notices.

**Value:** unlocks buyers who are otherwise blocked by their own procurement.

---

## V2 — beyond diligence

Only after M5 retains. V2 is the same engine pointed at the next deadline-driven,
evidence-critical review:

- **Contract portfolio review** — the whole book, not one deal. Continuous rather than
  bursty, which is what makes seat pricing honest.
- **Custom checklists** — now defensible, because there's a working default to modify
  rather than a blank page.
- **Connectors** — Drive, SharePoint, Dropbox, email. The corpus stops being uploaded
  and starts being watched.
- **Audio and video** — meeting recordings joined to the documents they discuss. This
  is the first genuinely new modality and the first jellyfish in the reef.

## V3 — the platform the vision describes

- Continuous ingest across an organization, always current
- Cross-corpus reasoning: this quarter's contracts against last year's
- API: other products call Reef's understanding layer
- Structured extraction to schema, output as queryable tables
- Agents that watch for conditions and report — *report*, not act. Reef is an
  intelligence system; the decision stays human, which is also the liability posture.

## Enterprise horizon

Custom integrations, private cloud, on-prem, industry checklists, training. Real
revenue, real money, and entirely gated behind a sales motion that does not exist yet.
Revisit at Year 2 with ARR, logos, and either a hire or a partner. Nothing in M0–M5 is
allowed to be justified by this section.

---

## Critical path

```
M0 concierge ─┬─► M1 ingest+evidence ──► M2 memo ──► M3 product ──► M5 teams ──► M6 ent
              │                                          │
              └─► checklist definition ──────────────────┘
                                                         │
                                            M4 reef ─────┘  (parallel, marketing-gated)
```

The only true serial chain is **M1 → M2 → M3**. M0 feeds the checklist that M2 needs.
M4 can be built at any time after M3's data model exists and should be scheduled
against launch, not against product need.

**The critical path bottleneck is extraction accuracy in M1.** Everything downstream
inherits it. If M1 exits at 70% instead of 90%, M2's memo is unusable, M3 has nothing
to sell, and no amount of interface work compensates. Spend disproportionate effort
there and resist moving on early.

## Sequencing rules

1. **No milestone starts before the previous one has a real user.** Not a test user.
2. **Beauty is scheduled, not opportunistic.** The reef ships at M4, on a date, because
   it will otherwise consume every unstructured hour.
3. **Every milestone ends with something sent to a person outside the project.**
4. **When M4's pull becomes irresistible, that's the signal to check M3's numbers**, not
   the signal to start M4.
