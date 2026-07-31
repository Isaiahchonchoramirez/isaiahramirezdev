import { getAssetPath } from "../utils/assetPath";

// Add a project by dropping another object in this array.
// image  -> put the screenshot in public/images/projects/
// href   -> getAssetPath("/folder/") for sites living in public/, or a full URL
// external -> true opens in a new tab, false navigates in place
// related -> optional sibling project; renders a "Pairs with" link on the card
const projects = [
  {
    id: "lyrx",
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
];

export default projects;
