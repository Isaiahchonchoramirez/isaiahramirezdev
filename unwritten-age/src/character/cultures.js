/**
 * Cultural lineages.
 *
 * These are cultures and spiritual inheritances, not biological species and not
 * real-world ethnic groups. Names, symbols, gods and silhouettes are original;
 * the archaeological regions listed under `informedBy` are research anchors for
 * material culture (what people actually built and wore), never a licence to
 * copy a later mythology wholesale.
 *
 * Nothing here carries a statistical modifier. Culture changes what you look
 * like, what your gear is made of, and how your class is *interpreted* — it
 * never changes what your numbers are.
 */

export const CULTURES = {
  aurean: {
    id: "aurean",
    name: "The Aureans",
    informedBy: "Prehistoric Mediterranean, Anatolian and Aegean material culture",
    lore:
      "Sun-counters and stone-cutters of the warm inland seas. They keep the year " +
      "on notched limestone, argue about the shape of the sky, and bury their dead " +
      "facing the sunrise. Their oracles are not priests but arbiters — the ones " +
      "trusted to say what a thing means.",
    mythicFuture:
      "Radiant terraced cities. Champions whose names outlive their bodies. Law " +
      "spoken as though the sky agreed to it. And the pride that will eventually " +
      "make them argue with their own gods.",
    // Palette drives clothing, pigment and adornment materials.
    palette: {
      cloth: ["#c9b79a", "#b8a37e", "#d8c9ae", "#9c886b"],
      pigment: ["#b5502f", "#d9a441", "#8a3a24", "#e6dcc4"],
      accent: "#e0b558",
      metal: "#c08a3e",
    },
    materials: ["hide", "woven fiber", "shell", "ochre", "feather", "carved limestone"],
    rareMaterial: "sky-iron — a stone that fell burning, worked by no one living",
    markingStyle: "sun-rays, counted notches, concentric rings",
    // Skin tones offered first for this lineage. The full range is always
    // available; this only orders the palette so presets feel coherent.
    skinBias: [3, 4, 5, 6, 7],
    hairBias: ["loose-waves", "bound-tail", "shaved-sides", "long-braid"],
    voiceBias: ["resonant", "clear", "low"],
  },

  veyr: {
    id: "veyr",
    name: "The Veyr",
    informedBy: "Prehistoric northern Eurasian and circumpolar material culture",
    lore:
      "Winter-keepers of the cold forests and the ice-edge. They travel with their " +
      "dead — carved into antler, sewn into hems, spoken aloud at every crossing — " +
      "and treat a hard season as a negotiation rather than a punishment. Their " +
      "spirit-walkers go out and are expected to come back changed.",
    mythicFuture:
      "Clans that follow the water to places with no name. Marks cut into wood that " +
      "hold meaning past the death of the carver. Ancestors who fight beside the " +
      "living. And a long, patient readiness for a winter that ends everything.",
    palette: {
      cloth: ["#6b5a48", "#4e4238", "#7d6f5c", "#3b342c"],
      pigment: ["#3f4a52", "#7d8a92", "#5a3a30", "#cfd6da"],
      accent: "#9fb4c4",
      metal: "#8d8579",
    },
    materials: ["layered fur", "hide", "bone", "antler", "carved wood", "bead"],
    rareMaterial: "greenstone — traded up the rivers, older than anyone's grandmother",
    markingStyle: "ancestor-tallies, beast-tracks, branching world-lines",
    skinBias: [0, 1, 2, 3, 4],
    hairBias: ["fur-lined-braids", "matted-locks", "bound-tail", "cropped"],
    voiceBias: ["gravel", "low", "quiet"],
  },

  kemu: {
    id: "kemu",
    name: "The Kemu",
    informedBy: "Prehistoric Rift Valley and Sub-Saharan material culture",
    lore:
      "The oldest continuous line of people anyone can name, and they will tell " +
      "you so. They count descent by who taught whom rather than who bore whom, " +
      "so a family can be assembled as readily as inherited. Their runners carry " +
      "messages nobody trusts to a second mouth.",
    mythicFuture:
      "Cities of packed red earth that outlast the empires which copy them. " +
      "Smiths who are also priests. And a memory so long it becomes a burden " +
      "nobody else is strong enough to carry.",
    palette: {
      cloth: ["#b8703c", "#8f5228", "#d9a05a", "#6d3d1e"],
      pigment: ["#c4442a", "#e8c15c", "#3a2418", "#f0e0c0"],
      accent: "#e8a13c",
      metal: "#b8823a",
    },
    materials: ["hide", "plaited fibre", "shell bead", "red ochre", "hardwood", "quartz"],
    rareMaterial: "sky-glass — obsidian traded down from a mountain that is still angry",
    markingStyle: "descent-lines, runner's tallies, radiating dots",
    skinBias: [0, 1, 2, 3],
    hairBias: ["coiled-crown", "matted-locks", "shaved-sides", "long-braid"],
    voiceBias: ["resonant", "low", "clear"],
  },

  shaan: {
    id: "shaan",
    name: "The Shaan",
    informedBy: "Prehistoric South and Southeast Asian riverine material culture",
    lore:
      "Delta people who measure a year in floods rather than winters. They build " +
      "so that everything can be taken apart and moved upstream in a night, and " +
      "consider permanence a slightly embarrassing failure of planning.",
    mythicFuture:
      "Serpent-thrones on stilts above the water. Debts recorded in knotted cord " +
      "that outlive the debtor. And a flood they will insist, afterwards, was " +
      "always predicted.",
    palette: {
      cloth: ["#6f8a6a", "#4e6b52", "#a8b892", "#2f4436"],
      pigment: ["#3d6b52", "#c9b06a", "#7a3a48", "#e6e0cc"],
      accent: "#8fd0a8",
      metal: "#7f9a72",
    },
    materials: ["woven reed", "river hide", "cane", "shell inlay", "resin", "clay"],
    rareMaterial: "storm-amber — resin with something inside it that should not be",
    markingStyle: "coiling water-lines, flood-marks, scale patterning",
    skinBias: [2, 3, 4, 5, 6],
    hairBias: ["long-braid", "bound-tail", "loose-waves", "cropped"],
    voiceBias: ["quiet", "clear", "high"],
  },

  tuun: {
    id: "tuun",
    name: "The Tuun",
    informedBy: "Prehistoric Beringian and early Pacific-coastal material culture",
    lore:
      "Crossers. Every Tuun child is told which way their family came and is " +
      "expected to be able to go back. They keep no permanent house and treat " +
      "the horizon as a standing invitation rather than a limit.",
    mythicFuture:
      "Peoples who arrive everywhere first and are remembered nowhere as such. " +
      "Masks that hold a face after the wearer is gone. And a long argument " +
      "about whether anyone should have crossed at all.",
    palette: {
      cloth: ["#7d8a94", "#5a666f", "#a8b2b8", "#3d474e"],
      pigment: ["#2f4a5c", "#c46a48", "#e8ecef", "#1f2a30"],
      accent: "#a8d4e6",
      metal: "#8fa0a8",
    },
    materials: ["sealskin", "driftwood", "ivory", "sinew", "slate", "down"],
    rareMaterial: "cold-iron — a fallen star, kept wrapped and rarely shown",
    markingStyle: "crossing-marks, horizon bands, split-face masks",
    skinBias: [1, 2, 3, 4, 5],
    hairBias: ["cropped", "bound-tail", "fur-lined-braids", "long-braid"],
    voiceBias: ["low", "gravel", "quiet"],
  },
};

export const CULTURE_IDS = Object.keys(CULTURES);
