import { getAssetPath } from "../utils/assetPath";

// Add a project by dropping another object in this array.
// image  -> put the screenshot in public/images/projects/
// href   -> getAssetPath("/folder/") for sites living in public/, or a full URL
// external -> true opens in a new tab, false navigates in place
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
    ],
  },
];

export default projects;
