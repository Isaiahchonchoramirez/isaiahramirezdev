> **Historical specification — not implementation authority.** Positioning, channels,
> launch claims, and prices below require validation under ADR-001. Start with
> [`../README.md`](../README.md).

# 07 · Marketing

---

## The narrative

Three sentences, in this order, and the order is the argument:

> You were handed four thousand documents and ten days.
> Reef reads all of them and tells you what's wrong, with the page it found it on.
> Nothing it says is unsourced, because a claim you can't check is worse than no claim.

Everything public — the site, the film, the launch post, the pitch — is a longer version
of those three sentences. The first is their world, the second is the product, the third
is why it's Reef and not a chatbot.

**What the narrative deliberately does not say:** operating system for knowledge, living
digital brain, transform information into intelligence. Those are true about the ten-year
company and useless to a person with nineteen days of exclusivity left. They are the
*investor* narrative and belong only in that deck. Selling the platform vision to the
first customer is how a credible product starts sounding like vapor.

## Taglines

Primary, on the site:

> **Four thousand documents. Ten days. Every finding linked to the page it came from.**

Secondary, by context:

- Product / app chrome — *Upload the room. Get the memo.*
- Film end card — *Every file you own is one organism. The reef is what they build together.*
- Investor / long-horizon — *The understanding layer for organizational information.*
- Technical audiences — *Nothing it says is unsourced.*

The film's line is deliberately the most abstract of the four, because it appears at the
end of a beautiful thing where a company vision is the correct note. It never appears
above a signup button.

---

## Homepage

Seven sections. The scroll is a descent (`04-visual-and-world.md`). Copy is fixed; the
water moves.

**1 · Hero.** Shot 01 as a silent loop, poster-framed. The primary tagline in display
serif. One button: *Scan a room free.* Under it, small: *50 documents, no card.* Nothing
else above the fold — no logo bar, no nav clutter, no announcement banner.

**2 · The problem.** Three lines of body copy in the searcher's own words, taken verbatim
from the M0 interviews. Do not write this section; transcribe it. A sentence a real buyer
said outperforms anything anyone can compose about them.

**3 · The live demo.** The largest section on the page and the reason anyone converts. A
real pre-loaded room. A question types itself. The answer streams. The citation chip
appears. The page scrolls to the highlighted clause. Then it becomes interactive and the
visitor can ask their own question of the same corpus, with no account.

Let people use the product before they give an email address. Almost nobody in this
category does, because their product isn't good enough to survive it.

**4 · The memo.** The actual artifact, scrollable, real, with the customer name redacted.
The single strongest proof on the page: this is the thing you get.

**5 · Evidence.** How the citation binding works, honestly and technically. Include the
"not found in this corpus" result as a *feature*, with a screenshot. This section converts
the skeptical technical buyer and it is where every competitor waves their hands.

**6 · The reef.** The 3D view, live and interactive, or the launch film if not yet built.
This is the section that gets screenshotted and shared, and it belongs *here* — after the
proof — not at the top. Beauty before evidence reads as a distraction from the absence of
evidence.

**7 · Price and start.** Plain numbers, the ROI arithmetic from `01-strategy.md` stated
in one line, the free tier, and the same button as the hero.

**Not on the page:** a logo bar of fake customers, testimonials before real ones exist,
"trusted by," a countdown, a chatbot widget, an exit-intent modal. The buyer is
sophisticated and every one of those costs more credibility than it earns clicks.

---

## The demo flow

Ninety seconds, and it is the same script for a sales call, the site video, and the launch
post. It has one job: get to the highlighted clause fast.

| | Beat | Seconds |
|---|---|---|
| 1 | Drag a folder of 1,400 files onto the window. Say the number out loud. | 0–10 |
| 2 | Processing pipeline running, real throughput. Say "twenty minutes, but you can start now." | 10–20 |
| 3 | Ask: *"Which contracts have change-of-control provisions?"* | 20–30 |
| 4 | Answer streams. Seven contracts, each with a chip. | 30–45 |
| 5 | **Click a chip. Land on page 14 of the master lease, clause highlighted.** | 45–55 |
| 6 | Ask something the corpus can't answer. Reef says so. Sit in that silence. | 55–70 |
| 7 | Open the memo. Scroll it. Export it. | 70–85 |
| 8 | `Tab`. The reef. Say nothing for five seconds. | 85–90 |

Beat 5 is the sale. Beat 6 is the trust. Beat 8 is why they remember it tomorrow. Never
reorder these.

---

## Launch

**Sequence.** Quiet first, loud once.

1. **Months 1–2, private.** The M0 concierge customers, by hand, no announcement. Ten
   real memos before anyone hears the name.
2. **Month 3, the communities.** Searchfunder, the ETA podcasts, the searcher Slacks. Not
   an ad — a post about *what ten real diligence rooms actually contained*, with the
   findings anonymized. Give away the analysis; the tool sells itself underneath it.
3. **Month 4, the brokers and QoE accountants.** Highest-leverage channel available to a
   solo founder: one accountant serves twenty searchers. Offer them a free room per client.
4. **Month 5, the loud launch.** Film, site, Show HN, Product Hunt, X. One day, everything
   at once, with ten customers and real numbers already in hand.

**Do not launch loudly first.** A launch without customers spends the only attention spike
available on an unproven product, and it cannot be repeated.

**Show HN framing** — technical and specific, never promotional: *"Show HN: Reef — I built
a diligence tool where every generated claim links to the span it came from."* Lead with
the citation-binding mechanism and the refusal behavior. That audience will not buy the
product and will absolutely stress-test the honesty claim, which is exactly what it's for.

---

## Awwwards

Worth doing, with a clear head about what it does and doesn't buy.

**What it buys:** credibility that a solo builder can produce work at studio level, a
permanent portfolio artifact, developer and designer attention, and inbound freelance and
job offers.

**What it does not buy:** a single diligence customer. That jury and that audience will
never do an acquisition. Traffic from an SOTD is designers looking at the craft, and the
conversion rate to paying users will be approximately zero, which is fine as long as it's
expected.

**Therefore:** submit the *marketing site*, not the product. Keep them separable. The site
can be a five-viewport scrolljacked descent that wins awards; the app must stay a fast
keyboard tool that never scrolljacks anything. Optimizing the app for a jury would ruin it
for the customer.

Submit after the reef ships at M4. Requirements: the film, the interactive reef section,
sub-2s LCP despite all of it, and full accessibility — which juries increasingly check and
which `03-ux.md` already requires.

## GitHub

Open source the parts that are infrastructure, keep the parts that are the product.

**Open:** the document structure extractor, the structure-aware chunker, the citation
binder, and the eval harness. These are genuinely useful to other people, they are the
hardest and most interesting engineering in the project, and every one of them is a
credibility artifact for the honesty claim — *here is the citation binding, audit it.*

**Closed:** the checklist, the finding logic, the memo templates, the reef. That is the
product and the accumulated domain knowledge.

The strategic point: a well-made open extractor library gets used by people who then
discover Reef, and it proves the technical claim in a way marketing copy cannot. The
checklist is what took ten real deals to learn and is not a gift.

## Investors

Only if scale demands it, not as a milestone. The honest position at each stage:

| Stage | The pitch | What must be true |
|---|---|---|
| Pre-M3 | Don't raise | Nothing yet |
| M3–M5 | *Underserved segment, self-serve, evidence-grade, per-deal pricing that incumbents can't touch* | 10+ paying customers, memo forward rate, retention |
| M5+ | *The understanding layer — diligence was the wedge* | Multi-vertical usage, expansion revenue, a second checklist working |

**What to lead with:** the memo forward rate and the refusal-correctness number. Both are
unusual, both are hard to fake, and both signal a founder who measures the uncomfortable
thing. The reef is the last slide, not the first — it makes an investor remember the
meeting, and if it makes them *decide*, they are the wrong investor.

**What they will push on and the answer to have ready:** "Why won't Hebbia crush you?"
Because Hebbia's CAC floor is higher than this customer's entire lifetime value, and
building a self-serve motion would cannibalize the enterprise contracts that justify their
valuation. That is a structural constraint, not an oversight, and structural constraints
are the only kind of protection a small company gets.
