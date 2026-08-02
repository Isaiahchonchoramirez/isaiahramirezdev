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
