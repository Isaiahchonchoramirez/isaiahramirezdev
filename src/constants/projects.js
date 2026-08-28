import { getAssetPath } from "../utils/assetPath";

// Add a project by dropping another object in this array.
// image  -> put the screenshot in public/images/projects/
// href   -> getAssetPath("/folder/") for sites living in public/, or a full URL
//           omit it entirely for work that has no site to visit
// external -> true opens in a new tab, false navigates in place
// cta    -> optional link label; defaults to "Visit site"
// related -> optional sibling project; renders a "Pairs with" link on the card
// video  -> optional rendered clip; replaces the browser-framed screenshot
// gallery -> optional grouped stills, rendered under the row with a lightbox
const projects = [
  {
    id: "tree-of-life",
    featured: true,
    categories: ["Web", "UX", "Design"],
    role: "Product design · Accessibility · Frontend development",
    problem:
      "Public mental-health websites need to feel welcoming without making clinical promises, hiding urgent-help guidance, or asking motion and imagery to carry essential meaning.",
    outcome:
      "A calm, accessible journey from sky to water that keeps crisis guidance visible, works without animation, and marks organization-specific details for owner approval.",
    title: "Tree of Life",
    year: "2026",
    tagline: "A grounded public mental-health journey",
    image:
      "https://raw.githubusercontent.com/Isaiahchonchoramirez/tree-of-life/feature/tree-journey-visual-consolidation/docs/consolidation/screenshots/stage1-1440.png",
    href:
      "https://github.com/Isaiahchonchoramirez/tree-of-life/tree/feature/tree-journey-visual-consolidation",
    external: true,
    cta: "View the implementation",
    stack: ["Next.js", "React", "TypeScript", "CSS", "WCAG 2.2 AA"],
    description:
      "Tree of Life is a Stage 1 public-site concept organized as an emotional descent through sky, canopy, branches, trunk, soil, roots, and renewing water. I consolidated an existing application and a visual prototype into modular React sections, CSS-native illustration, restrained scroll progression, a complete reduced-motion mode, and safety-first content boundaries. It uses synthetic, nonrepresentative copy; organization-specific details remain provisional and require owner approval.",
    highlights: [
      "Seven connected scenes communicate that visible growth is supported by experience, relationships, identity, care, and renewal",
      "Semantic landmarks, skip navigation, visible focus, keyboard-safe anchors, 44-pixel targets, and contrast-aware scene transitions",
      "Motion is enhancement-only: normal scrolling remains intact and the complete journey stays present when animation is disabled or unavailable",
      "Responsive verification at 320, 390, 768, 834, 1024, and 1440 pixels found no unintended overflow or clipped controls",
      "CSS-native artwork avoids uncertain stock licensing and keeps every major visual straightforward to replace",
      "66 passing tests cover the retained application plus journey navigation, reduced motion, crisis guidance, and primary-content resilience",
      "No clinical records, portals, scheduling, document uploads, AI features, or real organization branding are included",
    ],
  },
  {
    id: "reef",
    featured: true,
    categories: ["AI", "Data", "Web", "UX", "3D"],
    role: "Product design · Ingestion engine · Evaluation harness · Frontend development",
    problem:
      "A document-search tool is easy to fake — an answer written in confident prose looks the same whether it came from the file or from the model. The failure that matters in diligence is not a wrong answer, it is a confident answer with no source behind it.",
    outcome:
      "An ingestion and evidence engine where every returned fact resolves to the exact region of the document it came from — page, bounding box, character range — and an evaluation harness that publishes the gate it currently fails.",
    title: "Reef",
    year: "2026",
    tagline: "Every claim traced back to the page it came from",
    image: getAssetPath("/images/projects/reef.jpg"),
    href: getAssetPath("/reef/index.html#/demo"),
    external: true,
    cta: "Open the deal room",
    stack: ["Python", "FastAPI", "PostgreSQL", "pgvector", "TypeScript", "React", "Vite"],
    description:
      "Reef reads a folder of documents and builds a searchable room where nothing can be asserted without a citation. The pipeline runs intake, extraction, structuring, chunking, embedding and indexing, and the search API abstains instead of guessing when nothing clears the confidence floor. I wrote the engine, the evaluation harness that scores it, and the interface — including Reef View, which draws the room as a bathymetric map with one coral structure per document, lit only where the engine actually returned evidence. The demo linked here runs on Ridgeline Industrial Services, a fictional company built as a test fixture; it is a synthetic evaluation environment, not a customer deployment.",
    highlights: [
      "Span-level provenance — every extracted fact carries document, page, bounding box and character range, so a claim can be opened at the exact region that produced it",
      "Abstention over invention — search returns nothing rather than a plausible sentence when the retrieval floor is not cleared",
      "121-document fixture indexes in about 14 seconds into 869 chunks; the one file left unindexed is a password-protected archive, registered with an actionable reason instead of silently dropped",
      "Scored against twelve gates: parsing success 100% against a 95% bar, citation location accuracy 100% against 95%, and zero fabricated citations",
      "The abstention gate currently fails — 3 of 6 held-out absent subjects leak an answer instead of returning none. It is published in the scorecard rather than omitted, and it blocks the next milestone",
      "Scorer and customer bundles are derived from different source documents, so the answer key cannot reach the interface even if the UI is wrong — a structural separation rather than a client-side filter",
      "Reef View renders the same data as a reef without WebGL, lazy-loaded and respecting reduced-motion, and creates no findings or relationships of its own",
      "337 tests over the engine and 67 over the interface, including invariants that fail the build if an evidence anchor loses its source region",
    ],
    related: {
      id: "datagate",
      title: "DataGate",
      blurb: "the earlier profiler this evidence-first approach grew out of",
      href: getAssetPath("/datagate/index.html"),
    },
  },
  {
    id: "tesseraxis",
    featured: true,
    categories: ["Simulation", "AI", "Data", "Web", "UX", "3D"],
    role: "Simulation architecture · Control systems · Physics · Product design",
    problem:
      "Engineering simulations are often either opaque specialist tools or attractive demos that hide the mathematics driving them.",
    outcome:
      "A browser-native engineering laboratory with deterministic physics, inspectable controllers, replayable runs, and three complete simulation plugins.",
    title: "Tesseraxis",
    year: "2026",
    tagline: "Engineering systems you can see",
    image: getAssetPath("/images/projects/tesseraxis.svg"),
    href: getAssetPath("/tesseraxis/index.html"),
    external: true,
    cta: "Open Tesseraxis",
    stack: ["JavaScript", "Three.js", "WebGL", "ECS", "Control Theory", "Numerical Simulation"],
    description:
      "Tesseraxis is a modular engineering simulation platform built around a deterministic fixed-timestep engine. Its Powered Descent Lab exposes six-degree-of-freedom rocket dynamics and PID guidance; its Swarm Intelligence Lab models distributed coordination across thousands of agents; and its Vehicle Dynamics Lab exposes tire saturation, load transfer, suspension response, braking, weather, collisions, and autonomous path tracking.",
    highlights: [
      "Reusable plugin SDK—the rocket and swarm laboratories use the same engine, inspector, timeline, graphing, replay, sharing, and export contracts",
      "Deterministic 120 Hz simulation loop with seeded disturbances and journaled control inputs",
      "Powered landing with variable mass, fuel consumption, aerodynamic instability, engine gimbal, actuator limits, and live PID tuning",
      "Swarm intelligence with separation, alignment, cohesion, search coverage, packet loss, and approximately O(n) spatial-neighbor discovery",
      "Vehicle dynamics with nonlinear tire saturation, longitudinal load transfer, spring-damper body response, wet-road braking, collision constraints, and curvature-aware autonomous driving",
      "Instanced Three.js rendering, force vectors, flight trails, mission objectives, and scalable telemetry views",
      "Headless regression harnesses verify collective swarm behavior and exact seeded reproduction without requiring a renderer",
      "Research primitives compile deterministic scenario scripts and run seeded parameter sweeps locally, with a FastAPI boundary designed for isolated optimization, RL, and collaboration workers",
    ],
  },
  {
    id: "trade-assistant",
    featured: true,
    categories: ["AI", "Data", "Web", "UX"],
    role: "Product design · Full-stack engineering · Data science",
    problem: "Market tools often produce opaque calls without showing whether the same logic survived historical testing.",
    outcome: "A transparent market dashboard that explains every signal and tests it without lookahead bias.",
    title: "AI Trade Assistant",
    year: "2025 — 2026",
    tagline: "When money goes in, and when it comes out",
    image: getAssetPath("/images/projects/trade-assistant.jpg"),
    href: getAssetPath("/trade-assistant/index.html"),
    external: true,
    cta: "Open the dashboard",
    stack: ["Python", "FastAPI", "React", "pandas", "Technical Analysis"],
    related: {
      id: "trade-assistant-download",
      title: "Free download",
      blurb:
        "run the full app on your own machine with live market data — source and releases on GitHub",
      href: "https://github.com/Isaiahchonchoramirez/ai-trade-assistant/releases/latest",
    },
    description:
      "A market dashboard that scores a stock the way an analyst would, then proves the scoring out on history. Seven technical factors each read the tape independently and combine by weight into one number from −100 to +100, which becomes an action with a real entry, stop and target. The same scoring code is then replayed bar by bar over years of history to show what following it would actually have returned — against simply buying and holding.",
    highlights: [
      "Seven-factor composite signal — trend structure, MACD, moving-average cross, RSI, ADX, volume flow and Bollinger position — each shown with its own contribution and a plain-English reason, so nothing is a black box",
      "Backtest with no lookahead: a signal computed from one bar's close is acted on at the next bar's open, every fill pays commission and slippage, and a gap below the stop fills at the open rather than at a price the market never traded",
      "Reports drawdown and Sharpe beside return, and marks whichever side wins each measure — on most large caps buy-and-hold wins on return while the strategy wins on drawdown, and the app says so",
      "Grades its own evidence: under ten round trips it tells you the sample cannot separate an edge from luck",
      "Colour is never the only signal — the green/red convention fails a colourblind check at ΔE 4.1, so every value also carries a sign, an arrow and a label, and one toggle swaps in a validated blue/orange pair at ΔE 24.7",
      "Charts flip to a log scale automatically once the span demands it, so forty-five years of price history stays readable instead of collapsing onto the baseline",
      "Assistant answers from the computed indicators rather than from memory, so it cannot invent a number — with an optional Claude upgrade for open-ended questions",
      "Free to download and run locally against live market data — one double-click, Python and nothing else, no API keys or account",
    ],
  },
  {
    id: "lyrx",
    featured: true,
    categories: ["AI", "Web", "UX"],
    role: "Product design · Audio engineering · Frontend development",
    problem: "Powerful music tools are often expensive, installation-heavy, and intimidating to new producers.",
    outcome: "A browser-based studio with 26 tools, 85 instruments, local saving, and WAV export.",
    title: "Lyrx",
    year: "2026",
    tagline: "A full music studio in one tab",
    image: getAssetPath("/images/projects/lyrx.jpg"),
    href: getAssetPath("/lyrx/index.html"),
    external: true,
    stack: ["JavaScript", "Web Audio API", "Canvas"],
    description:
      "Lyrx is a complete digital audio workstation that runs entirely in the browser — no install, no account, no plugins. I built the synth engine on the raw Web Audio API, the windowed desktop that holds twenty-six dockable tools, and an AI producer that turns a plain-language description of a beat into a working arrangement. Everything saves locally and exports to WAV.",
    highlights: [
      "Synth engine written from scratch on the Web Audio API — 85 instruments, from 808s and supersaws to tabla, banjo and pedal steel",
      "Twenty-six dockable windows: step sequencer, piano roll, mixer with buses and sends, plugin rack, automation curves, spectrum and LUFS metering, mastering",
      "Fifty built-in presets spanning forty-plus genres — techno, trap, bossa nova, bhangra, gospel, drum & bass and more",
      "Describe a beat in plain words and the AI producer lays it down",
      "Linked to DataCore — each app opens the other, and DataCore's studio screens hand off straight into a Lyrx session",
    ],
    related: {
      id: "datacore",
      title: "DataCore",
      blurb: "the governed pipeline that decides what may be trained on",
      href: getAssetPath("/datacore/index.html"),
    },
  },
  {
    id: "datacore",
    featured: true,
    categories: ["AI", "Data", "Web", "UX"],
    role: "Systems design · Data governance · Frontend development",
    problem: "Training pipelines often hide where data came from and whether its use was actually authorized.",
    outcome: "A seven-stage, rights-aware data pipeline with consent gates and a complete removal audit.",
    title: "DataCore",
    year: "2026",
    tagline: "Governed AI training data",
    image: getAssetPath("/images/projects/datacore.jpg"),
    href: getAssetPath("/datacore/index.html"),
    external: true,
    stack: ["JavaScript", "Design Systems", "Data Pipeline UX"],
    description:
      "DataCore is a control surface for training an AI on data you are actually licensed to use — a governed refinery rather than one giant scraper feeding one giant model. I designed the seven-stage pipeline, the rights-classification model that decides what may be kept, and the audit views that show exactly what got removed and why. The premise: publicly reachable is not the same as authorized to train on.",
    highlights: [
      "Seven-stage pipeline — discover, acquire, classify rights, extract, compress, index, train",
      "Rights classification per source, with consent required before any voice is cloned",
      "Full removal audit — duplicates, unsupported media, low-quality and restricted content, each with a reason",
      "Compresses to a portable, inspectable archive instead of an opaque neural net",
      "Neon-noir interface with a full light theme, built on a shared design system",
      "Voice Studio and Music Studio hand off into Lyrx, the DAW half of the same stack",
      "Backed by a real local crawler — robots-aware, rights-gated, and you choose item by item what gets kept and passed to Lyrx",
    ],
    related: {
      id: "lyrx",
      title: "Lyrx",
      blurb: "the studio this data trains for",
      href: getAssetPath("/lyrx/index.html"),
    },
  },
  {
    id: "unwritten-age",
    featured: true,
    title: "The Unwritten Age",
    year: "2026",
    tagline: "A mythic RPG where memory rewrites the world",
    categories: ["Web", "3D", "Design"],
    role: "Game systems · Procedural 3D · World design · UX",
    problem:
      "Build an explorable prehistoric world without copying familiar fantasy settings—and make history, mythology, character identity, and progression reinforce one another.",
    outcome:
      "A playable Three.js RPG prototype with character creation, combat, classes, cultures, factions, skills, beasts, ancient-site discovery, equipment, and a world-changing god-erasure mechanic.",
    stack: ["JavaScript", "Three.js", "WebGL", "Procedural Generation", "Game Systems"],
    description:
      "The Unwritten Age is a browser RPG set in a compressed mythological interpretation of Earth around 30,000–12,000 BCE. You inhabit a customizable mortal body, develop practical skills and divine Aspects, encounter remembered beasts, and discover locations informed by real archaeology. Its central mechanic is erasure: defeating a god removes their name, gifts, quests, and monuments from history while the player alone remembers what changed.",
    highlights: [
      "Procedural humanoid with visible face, body, hair, clothing, ritual markings, scars, and live character-creation controls",
      "Five cultures and multiple combat callings without race-locked statistics",
      "Twelve 1–99 Practices, faction standing, combat abilities, quests, and persistent character presets",
      "Data-driven ancient sites inspired by Pavlov, Kostenki, Sunghir, and Chauvet, each separating archaeological evidence from fictional myth",
      "Material-aware equipment rewards using ivory, bone, hide, ochre, flint, stone, and wood rather than generic fantasy metal loot",
      "God erasure mutates the live world, interface, abilities, quest history, and the player's private Chronicle",
    ],
    preview: {
      variant: "lead",
      eyebrow: "Playable procedural RPG",
      metric: "Explore in browser",
      values: [92, 68, 81, 56, 74, 88],
      caption: "Cultures · callings · ancient sites · beasts · memory",
      alt: "Abstract landscape bars representing regions and systems in The Unwritten Age",
    },
    href: getAssetPath("/unwritten-age/index.html"),
    external: true,
    cta: "Enter the Unwritten Age",
  },
  {
    id: "datagate",
    categories: ["Data", "Web", "UX"],
    role: "Product design · Statistics engine · Frontend development · Node service",
    problem:
      "A data profiler is easy to fake — charts and percentages look convincing whether or not anything was measured. The version I designed in Figma had exactly that problem: it advertised stock prediction and phone lookups, and its upload zone ran a timer.",
    outcome:
      "A profiler that reads your file in the tab, types every column, measures every distribution, and names each duplicate, gap and outlier with the reason it matters — verified by 55 tests against hand-computed statistics.",
    title: "DataGate",
    year: "2026",
    tagline: "Profiling your data without uploading it",
    image: getAssetPath("/images/projects/datagate.jpg"),
    href: getAssetPath("/datagate/index.html"),
    external: true,
    cta: "Scan a dataset",
    stack: ["TypeScript", "React", "Statistics", "Node", "Vite"],
    description:
      "Drop in a CSV, TSV, JSON or JSONL file and DataGate returns a real profile — no upload, no parsing library, no charting library. I wrote the RFC 4180 parser, the type-inference rules, the distribution statistics and the quality audit; the design started as a Figma Make export and the engine underneath it is new. The premise is that a tool making claims about your data should be checkable, so every number it reports is computed from the file in front of you and the tests assert them against values worked out by hand.",
    highlights: [
      "Dependency-free parser — RFC 4180 quoting, newlines inside quoted fields, delimiter sniffing that a prose column full of commas cannot fool, ragged rows, and one-level JSON flattening",
      "Type inference across seven kinds, with two rules that matter: a zero-padded value like 007 stays text rather than becoming 7, and a near-unique column is an identifier, so it is kept out of the statistics instead of being averaged",
      "Per-column min, quartiles, median, mean, sample standard deviation and a histogram — integer columns spanning 20 values or fewer get one bar per value, so the shape shown is the data's and not the binning rule's",
      "Pearson correlation on pairwise-complete rows, ranked by strength, flagging collinear pairs — and stating plainly that it measures straight-line association only and is not evidence of causation",
      "Quality audit that explains consequences rather than just counting: why a 60%-missing column makes an average describe the rows that happened to be filled in, why a constant column adds noise to a model",
      "Exports the profile as Markdown or JSON, plus a cleaned CSV whose every removal is one the findings list already justified",
      "55 tests over the parser and the maths, including a seeded demo dataset whose planted duplicates and negative shipping-to-satisfaction correlation are asserted rather than assumed",
      "URL scanning runs against a small Node service rather than pretending the browser can read another origin — it refuses private and loopback addresses, and the interface says whether the service is up instead of faking a result",
    ],
  },
  {
    id: "rave-io",
    categories: ["Web", "UX", "Design"],
    role: "Audio engineering · DSP · Interaction design · Frontend development",
    problem:
      "My Figma draft looked like a DAW and was mostly a screenshot: the 56-instrument sound library changed nothing when you clicked it, there were no pitched instruments at all, the generate button wrote one hardcoded pattern regardless of genre, and the master meter was twelve numbers typed into an array.",
    outcome:
      "A working beat machine — 56 synthesised instruments across seven genres, a melody roll locked to the selected scale, per-genre rhythm generation, and a WAV render of the arrangement you actually heard.",
    title: "RAVE.IO",
    year: "2026",
    tagline: "Every sound built from an oscillator up",
    image: getAssetPath("/images/projects/rave-io.jpg"),
    href: getAssetPath("/rave/index.html"),
    external: true,
    cta: "Open the studio",
    stack: ["TypeScript", "Web Audio API", "React", "DSP", "Canvas"],
    description:
      "A step sequencer and melody roll that ships no samples — every instrument is synthesised in the browser from oscillators, filters and envelopes. I built the eight synthesis archetypes and the 56 voices on top of them, the scheduler that runs ahead of the audio clock, the per-genre rhythm generation, and the offline renderer. The interesting constraint was honesty: the sound library had to actually change the sound, and the exported file had to be the arrangement you heard rather than a second implementation of it.",
    highlights: [
      "Eight synthesis archetypes — plucked and bowed string, blown pipe, struck bell, membrane, metal, pad, lead, sub — each an instrument definition rather than a bespoke function, so a new voice costs a line of data",
      "Harmonic instruments run on a single oscillator carrying a PeriodicWave built from their partials; bells and struck metal keep discrete oscillators because their partials sit at non-integer ratios, which is exactly why a bell sounds like a bell",
      "Melody roll whose rows are degrees of the selected genre's scale — natural minor, Phrygian, Raga Bhairav, minor and major pentatonic, Maqam Hijaz, Dorian — so there is no wrong note to click",
      "Per-genre rhythm generation taken from how each style is actually played: half-time trap hats, techno's offbeat open hat, a teentaal-flavoured tabla cycle, a country train beat, a maqsum, a jig grouped in threes",
      "Scheduler runs 120 ms ahead of the audio clock outside React, and the playhead is read back from AudioContext.currentTime — so the highlight lines up with what you hear and a dropped frame is not an audible glitch",
      "Export walks the same voice code against an OfflineAudioContext, so the WAV is the arrangement that played rather than an approximation of it",
      "Two profiling fixes took a sixteen-bar render from over thirty seconds to about seven — one channel strip per track instead of per hit, and noise percussion filtered once per context rather than through a pair of biquads on every hi-hat",
      "Real AnalyserNode metering on log-spaced bands, a working recorder, keyboard and touch on every knob, and a hero canvas that stops animating when it scrolls out of view",
    ],
    related: {
      id: "lyrx",
      title: "Lyrx",
      blurb: "the full 26-tool DAW this shares a lineage with",
      href: getAssetPath("/lyrx/index.html"),
    },
  },
  {
    id: "blom-redesign",
    categories: ["UX", "Web", "Design"],
    role: "UX research · Information architecture · Full-stack development",
    problem:
      "A moderated study of drinkblom.com found all three participants unable to say what the Aperitivo was, and wandering through unrelated sections to finish basic tasks. The redesign I built in Figma restructured the navigation but shipped as a prototype: the cart, the search, and all four forms did nothing.",
    outcome:
      "A working storefront — cart with correct tax and shipping rules, checkout, site search, and four validated forms — served by a small Node service, with every submission surviving an unreachable server.",
    title: "Bløm Redesign",
    year: "2026",
    tagline: "A usability study, carried through to working software",
    image: getAssetPath("/images/projects/blom.jpg"),
    href: getAssetPath("/blom/index.html"),
    external: true,
    cta: "Open the site",
    stack: ["React", "TypeScript", "Node", "Usability Testing", "Tailwind"],
    description:
      "A redesign of an Ann Arbor meadery's website, starting from a ten-task moderated study with three participants. The research named four problems — navigation that did not match how people think, an unexplained flagship product, a missing search, and no way to actually buy anything. This build answers all four. I restructured the information architecture, wrote the commerce layer and the search index, and built the taproom service that receives orders and enquiries.",
    highlights: [
      "Every participant asked for search and the original shipped a dead magnifying glass — there is now a ⌘K dialog indexing products and pages by the words people actually type, so “where to buy”, “hours” and “book a party” each resolve to one page",
      "Cart and checkout with the rules a real order has: Michigan sales tax, free shipping over $75, and growler fills correctly forced to taproom pickup because they are poured to order",
      "Prices, copy and search results all read from one catalogue module — the shop and the products page had been separate hand-written markup that could disagree about what a bottle costs",
      "Every submission is written to the browser before it is posted, so an unreachable service degrades to a queue with a reference number rather than to a silent failure — and the confirmation says which of the two happened",
      "The service validates independently of the browser and recomputes each order's subtotal from its line items, rejecting any total that disagrees",
      "Rewrote the homepage hero, which had been a full-screen autoplaying video carrying no headline, no description and nothing to click — the first thing a visitor saw was a black rectangle loading, which is where the Aperitivo confusion starts",
      "Deliberately takes no payment: the checkout and the club signup both say the taproom confirms the order and handles payment, rather than implying a transaction that never happens",
      "Cut the Figma export's 32 MB of PNGs to 2.1 MB of WebP — one menu photo alone had been 12 MB, more than the rest of the portfolio combined",
    ],
  },
  {
    id: "maya-3d",
    categories: ["3D", "Design"],
    role: "3D modeling · Materials · Lighting · Animation",
    problem: "Build a complete scene that demonstrates the full path from modeled assets through a finished animated render.",
    outcome: "A rendered workstation environment plus a documented progression of character and environment studies.",
    title: "3D Modeling & Animation",
    year: "2024",
    tagline: "Characters, environments, materials, and motion built in Maya",
    image: getAssetPath("/images/projects/maya/workstation-desk-setup.webp"),
    stack: [
      "Autodesk Maya",
      "3D Modeling",
      "UV Mapping",
      "Texturing",
      "Lighting",
      "Animation",
    ],
    description:
      "A collection of character, environment, hard-surface, UV, texturing, lighting and animation work created in Autodesk Maya. The final project combines a custom computer workstation, animated cooling fans, lighting, materials and a complete indoor environment. Earlier studies explore stylized characters and outdoor scene construction.",
    highlights: [
      "Modeled and assembled a complete indoor computer-workstation environment — desk, monitors, tower, mic arm and the room around them",
      "Created custom UV layouts and painted material maps for the desk, monitors, computer tower, cooling system and environmental elements",
      "Animated a turntable and six individual cooling fans",
      "Designed stylized characters and outdoor environments during earlier modeling studies",
      "Developed the work from modeling and materials through lighting, animation and final rendering",
    ],
    video: {
      src: getAssetPath("/video/maya-workstation-animation.mp4"),
      poster: getAssetPath("/images/projects/maya/workstation-animation-poster.webp"),
      width: 514,
      height: 432,
      label: "Rendered camera move through the Maya workstation scene",
      caption:
        "The final render — a camera move through the room that comes to rest on the tower, with the six cooling fans turning throughout. 37 seconds, no audio.",
    },
    gallery: [
      {
        id: "final-environment",
        title: "Final environment",
        blurb: "The workstation build, shot from the finished scene",
        items: [
          {
            src: getAssetPath("/images/projects/maya/workstation-tower-cooling-gpu.webp"),
            title: "Tower, cooling and GPU",
            alt: "Open computer tower showing seven RGB cooling fans, a modeled motherboard I/O panel, a graphics card and an illustrated side panel",
            caption:
              "The hardest surface in the scene: fan blades, the I/O plate, the graphics card shroud and the case panels were each modeled and UV'd separately before the materials went on.",
          },
          {
            src: getAssetPath("/images/projects/maya/workstation-dual-monitors.webp"),
            title: "Dual monitors",
            alt: "Two modeled monitors on a wooden desk against a brick wall, each displaying artwork",
            caption:
              "Two screens on the desk, each with its own display material, mounted over the mic arm and the brick wall behind.",
          },
          {
            src: getAssetPath("/images/projects/maya/workstation-desk-setup.webp"),
            title: "Desk and floor",
            alt: "Modeled standing desk with monitors and a lamp, on a patterned carpet in front of a brick wall",
            caption:
              "The desk from the front, showing the wood-grain map on the surface, the height-adjust legs and the woven carpet material below.",
          },
          {
            src: getAssetPath("/images/projects/maya/workstation-room-wide.webp"),
            title: "The room",
            alt: "Wide view of the indoor scene: brick corner walls, a wooden floor platform and the desk with monitors and tower",
            caption:
              "The full environment the workstation sits in — brick corner walls, a wooden floor platform and the lighting that ties them together.",
          },
        ],
      },
      {
        id: "earlier-studies",
        title: "Earlier 3D studies",
        blurb: "Modeling, character design and environment work from before the final build",
        items: [
          {
            src: getAssetPath("/images/projects/maya/study-outdoor-scene-complete.webp"),
            title: "Outdoor scene",
            alt: "Wide view of a modeled outdoor terrain with a taco truck, two characters and a tree",
            caption:
              "The assembled outdoor scene — sculpted terrain with the truck, the characters and the tree placed into it.",
          },
          {
            src: getAssetPath("/images/projects/maya/study-character-pizza-pete.webp"),
            title: "Pizza Pete",
            alt: "Stylized character modeled as a pepperoni pizza slice with eyes, gloved hands and shoes",
            caption:
              "A stylized character built from a pizza slice, with a hand-painted crust and topping map and separately modeled hands and shoes.",
          },
          {
            src: getAssetPath("/images/projects/maya/study-character-master-moist.webp"),
            title: "Master Moist",
            alt: "Stylized character modeled as a soft-serve cup with a face, thin arms and orange shoes",
            caption:
              "A soft-serve cup character. The swirl was built with a twist deformer and a lattice; the cup pattern is a vector texture drawn to fit the UVs.",
          },
          {
            src: getAssetPath("/images/projects/maya/study-trippy-tree.webp"),
            title: "Trippy Tree",
            alt: "Stylized tree with a slim trunk and a dense speckled spherical canopy",
            caption:
              "A stylized tree — the canopy is a single sphere carrying a speckled material rather than modeled foliage, to keep the scene light.",
          },
          {
            src: getAssetPath("/images/projects/maya/study-taco-truck.webp"),
            title: "Taco truck",
            alt: "Modeled taco truck shown from the side, untextured apart from a ribbed body material",
            caption:
              "The truck that anchors the outdoor scene, shown mid-build — body, window cutouts and separately modeled wheels with tread.",
          },
        ],
      },
    ],
  },
  {
    id: "sports-forecast-engine",
    dataFile: "sports-forecast-engine",
    title: "Sports Forecast Engine",
    year: "2026",
    tagline: "An honest C++ probability model, tested before the final whistle",
    categories: ["C++", "Data"],
    role: "C++ engineering · Statistical modeling · Backtest design",
    problem:
      "A player-stat assignment could rank past performance, but it could not forecast a game or prove whether its predictions generalized.",
    outcome:
      "A dependency-free C++20 engine that generates score probabilities and measures them on 76 unseen matches without future-data leakage.",
    stack: ["C++20", "Poisson Modeling", "Backtesting", "CSV", "StatsBomb Open Data"],
    description:
      "I rebuilt an early C++ sports-statistics project as a reproducible forecasting engine. It learns team attack, defense, and home advantage from match results, produces a complete score-probability grid, and reports home/draw/away probabilities instead of pretending one score is certain. An expanding-window backtest makes every holdout prediction using only information available before kickoff.",
    highlights: [
      "Written with the C++20 standard library only—CSV parsing, model fitting, Poisson probabilities, evaluation, and JSON reporting",
      "Chronological 80/20 split across all 380 Premier League 2015/16 matches, with the model refit after each held-out result",
      "Reports outcome accuracy, multiclass log loss, Brier score, and goal mean absolute error rather than selecting one flattering metric",
      "Five-match prior smooths early and sparse team records toward the league average",
      "Publishes model limitations beside the result: no injuries, lineups, market odds, or claim of betting certainty",
    ],
    preview: {
      variant: "lead",
      eyebrow: "C++20 · chronological backtest",
      metric: "380 matches",
      values: [73, 49, 29, 27, 71],
      caption: "Attack · defense · Poisson score grid · holdout metrics",
      alt: "Abstract probability bars representing the C++ sports forecast backtest",
    },
    href: "https://github.com/Isaiahchonchoramirez/isaiahramirezdev/tree/main/projects/sports-forecast-engine",
    external: true,
    cta: "Read the C++ source",
  },
  {
    id: "michigan-lead-risk",
    dataFile: "michigan-lead-risk",
    title: "Michigan Lead-Risk Analysis",
    year: "2025",
    tagline: "Public-health indicators joined across all 83 counties",
    categories: ["Data"],
    role: "Data cleaning · Statistical analysis · Visualization",
    problem:
      "Housing age, childhood blood-lead surveillance, and public-water measurements live in separate datasets with inconsistent geographic labels.",
    outcome:
      "A reproducible 83-county dataset and six analytical views for comparing environmental and housing risk indicators.",
    stack: ["Python", "pandas", "NumPy", "Matplotlib", "Public Health Data"],
    description:
      "An information-analysis project combining three Michigan datasets: pre-1950 housing counts, elevated blood-lead levels among tested children under six, and public-water-system 90th-percentile lead measurements. I normalized county names, reconciled Detroit and Wayne County records, aggregated each source to a common unit, and used correlations and standardized scores to compare risk signals without implying that correlation proves causation.",
    highlights: [
      "Cleaned and joined all three sources into one row per Michigan county, retaining all 83 counties",
      "Calculated elevated-blood-lead rates from tested-child totals rather than comparing raw counts",
      "Standardized housing, water, and childhood measures with z-scores for cross-indicator comparison",
      "Produced six views covering rankings, pairwise relationships, and the correlation structure",
      "Kept source limitations visible: testing coverage, aggregation, and ecological correlation constrain interpretation",
    ],
    preview: {
      variant: "lead",
      eyebrow: "County-level public health",
      metric: "83 counties",
      values: [38, 55, 29, 68, 46, 81, 60, 42, 73, 51],
      caption: "Housing age · childhood EBLL · public-water lead",
      alt: "Abstract county comparison chart representing three joined Michigan lead-risk indicators",
    },
  },
  {
    id: "occupy-space",
    dataFile: "occupy-space",
    title: "Occupy Space",
    year: "2025",
    tagline: "A normalized NASA asteroid-data pipeline",
    categories: ["Data", "Web"],
    role: "NEO API collector · Database design · Collaborative analysis",
    problem:
      "NASA's near-Earth-object feed is nested, repeated, and time-based, making it difficult to accumulate clean observations without duplicating asteroids or approach dates.",
    outcome:
      "A normalized SQLite pipeline containing 100 asteroids and 100 approaches, paired with four analytical visualizations.",
    stack: ["Python", "NASA APIs", "SQLite", "pandas", "Matplotlib", "Seaborn"],
    description:
      "A collaborative information-analysis project with Sajjad Majeed. I built the near-Earth-object collector and normalized storage path; the final analysis was shared. The database separates asteroids, approach dates, approaches, orbiting bodies, and orbital elements so repeated API runs can add new observations without collecting the same object twice.",
    highlights: [
      "Designed the NEO collector and normalized multi-table SQLite schema",
      "Used unique identifiers and insert-or-ignore logic to prevent duplicate records across incremental runs",
      "Analyzed 100 approaches: 9 were NASA-classified as potentially hazardous",
      "Measured a modest positive velocity-versus-miss-distance correlation of 0.337 in this sample",
      "Built four views spanning approaches over time, velocity and distance, APOD content, and size versus hazard status",
      "Collaborative credit preserved: NEO collection by Isaiah Ramirez; APOD collection by Sajjad Majeed; analysis by both",
    ],
    preview: {
      variant: "space",
      eyebrow: "NASA NEO + APOD",
      metric: "200 records",
      values: [35, 52, 76, 28, 45, 58, 49, 43],
      caption: "100 asteroids · 100 APOD entries · normalized SQLite",
      alt: "Abstract timeline chart representing NASA near-Earth-object approaches",
    },
  },
  {
    id: "crop-yield",
    dataFile: "crop-yield",
    title: "Crop-Yield Efficiency Study",
    year: "2025",
    tagline: "From raw agricultural data to tested findings",
    categories: ["Data"],
    role: "Data exploration · Feature engineering · Visualization · Testing",
    problem:
      "Raw yield alone obscures the effects of rainfall, soil, weather, irrigation, and fertilizer across regions and crops.",
    outcome:
      "A tested analysis pipeline with derived efficiency measures, grouped comparisons, and crop-relative z-scores.",
    stack: ["Python", "pandas", "NumPy", "Seaborn", "pytest"],
    description:
      "An exploratory agricultural analysis that engineers yield-per-millimeter and crop-relative z-score features, then compares performance across regions, soil types, weather conditions, and treatment combinations. The notebook concludes with ten automated tests covering the calculations and exported results.",
    highlights: [
      "Engineered yield-per-millimeter to compare output against rainfall rather than treating volume alone as efficiency",
      "Found the East region led yield per millimeter while North had the highest average rainfall in the dataset",
      "Compared every irrigation and fertilizer combination; using both produced the highest mean yield at roughly 6.0 tons per hectare",
      "Standardized crop performance within each crop before comparing soil types",
      "Exported five cleaned summary datasets and passed ten automated checks",
    ],
    preview: {
      variant: "crop",
      eyebrow: "Agricultural analysis",
      metric: "10 tests passed",
      values: [42, 61, 54, 78, 66, 92],
      caption: "Region · crop · soil · weather · treatment",
      alt: "Abstract bar chart representing crop-yield comparisons",
    },
  },
  {
    id: "network-polarization",
    dataFile: "network-polarization",
    title: "Networks, Homophily & Polarization",
    year: "2026",
    tagline: "Testing how network structure shapes social separation",
    categories: ["Data"],
    role: "Network analysis · Simulation · Statistical interpretation",
    problem:
      "A network can look clustered without establishing whether cross-group ties occur less often than its group proportions predict.",
    outcome:
      "A quantitative homophily test applied to three real networks, followed by 1,000-node simulations of polarization mechanisms.",
    stack: ["Python", "NetworkX", "pandas", "Seaborn", "Simulation"],
    description:
      "A social-information-processing analysis that measures observed cross-type edges against the expected fraction in email, political-Wikipedia, and congressional networks. I then examined how triadic, membership, and focal closure alter political sorting across 750 simulated time steps in a synthetic network of 1,000 people.",
    highlights: [
      "Implemented a NetworkX homophily test using graph structure rather than hard-coded answers",
      "Compared an email network, political Wikipedia links, and congressional interactions",
      "Distinguished inverse homophily from weak and strong homophily using observed-versus-expected cross-group edges",
      "Simulated focal, triadic, and membership closure mechanisms over 750 time steps",
      "Connected quantitative trajectories to network snapshots rather than relying on visual intuition alone",
    ],
    preview: {
      variant: "network",
      eyebrow: "Social network analysis",
      metric: "1,000 nodes",
      values: [24, 29, 35, 42, 53, 66, 79, 88],
      caption: "Three closure mechanisms · 750 simulated steps",
      alt: "Abstract rising line-like chart representing changing network homophily",
    },
  },
  {
    id: "lansing-redlining",
    dataFile: "lansing-redlining",
    title: "Mapping Lansing's HOLC Grades",
    year: "2025",
    tagline: "A careful spatial audit of historical redlining boundaries",
    categories: ["Data"],
    role: "Geospatial analysis · Data validation · Visualization",
    problem:
      "Historical HOLC boundaries are geographic records, so raw polygon counts can misrepresent how much of a city received each grade.",
    outcome:
      "A reproducible area-weighted summary of Lansing's historical grades using a locally appropriate projected coordinate system.",
    stack: ["Python", "GeoPandas", "GIS", "pandas", "Spatial Data"],
    description:
      "A geospatial analysis of Mapping Inequality's historical HOLC polygons for Lansing. I filtered the national layer to the city, projected the boundaries into a metric coordinate system, calculated polygon areas, and summarized the share assigned to grades A through D. The published story deliberately stops at what the source supports instead of treating historical grades as proof of present-day outcomes.",
    highlights: [
      "Filtered 10,000-plus national polygons down to the Lansing survey areas",
      "Reprojected latitude/longitude geometry before measuring area",
      "Compared area share rather than raw polygon counts",
      "Separated the historical classification finding from claims about modern demographics",
      "Documents source, unit, sample, and interpretation limits directly beside the chart",
    ],
    preview: {
      variant: "lead",
      eyebrow: "Historical spatial analysis",
      metric: "HOLC A-D",
      values: [22, 47, 78, 91],
      caption: "Projected polygons · area-weighted grade distribution",
      alt: "Abstract four-bar chart representing historical HOLC grade areas",
    },
  },
];

export default projects;
