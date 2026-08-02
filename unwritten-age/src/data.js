/**
 * THE UNWRITTEN AGE — game data.
 *
 * Everything the Chronicle can erase lives here as data, never as hardcoded
 * strings in the UI. That is the whole trick: when a god is erased, we walk
 * these records and unwrite them, and the interface has no memory of its own
 * to contradict us.
 */

/* The four original aspects. You do not pick one — your people's deeds raise
   them, RuneScape-style, and abilities unlock off the levels. */
export const ASPECTS = {
  sovereign: { name: "Sovereign", colour: "#f0c674", blurb: "Law, loyalty, monuments" },
  guardian: { name: "Guardian", colour: "#8ec7ff", blurb: "Protection, sacrifice, survival" },
  conqueror: { name: "Conqueror", colour: "#ff8a6b", blurb: "Courage, conflict, glorious death" },
  wild: { name: "Wild One", colour: "#9ae6a0", blurb: "Beasts, seasons, untamed land" },
};

export const ASPECT_KEYS = Object.keys(ASPECTS);

/* Levels are deliberately grindy: each one costs more, and the curve is tuned
   so the first few come fast and later ones are a project. */
export function xpForLevel(level) {
  return Math.floor(70 * Math.pow(level, 1.72));
}

export function levelFromXp(xp) {
  let level = 1;
  while (level < 99 && xp >= xpForLevel(level)) level += 1;
  return level;
}

/**
 * Abilities. `source` is the crucial field — an ability granted BY a god is
 * only real while that god is remembered. Erase them and the ability was
 * never yours, which is very different from the ability being removed.
 */
export const ABILITIES = {
  kindle: {
    id: "kindle",
    name: "Kindle the First Flame",
    source: "self",
    aspect: "wild",
    unlock: 1,
    cost: 4,
    cooldown: 0.75,
    damage: 12,
    range: 17,
    colour: "#ffb547",
    glyph: "✦",
    desc: "The first miracle. A thrown ember that burns what the dark sends.",
  },
  ward: {
    id: "ward",
    name: "Vashan's Ward",
    source: "vashan", // granted by a rival god — this is the one that vanishes
    aspect: "guardian",
    unlock: 1,
    cost: 12,
    cooldown: 9,
    heal: 45,
    shield: 40,
    colour: "#8ec7ff",
    glyph: "◈",
    desc: "A borrowed mercy. Vashan shields those who still speak his name.",
  },
  sunder: {
    id: "sunder",
    name: "Sunder",
    source: "self",
    aspect: "conqueror",
    unlock: 4,
    cost: 16,
    cooldown: 5,
    damage: 46,
    range: 13,
    radius: 7,
    colour: "#ff8a6b",
    glyph: "✷",
    desc: "Strike the earth. Everything near the wound remembers pain.",
  },
  sanctuary: {
    id: "sanctuary",
    name: "Sanctuary",
    source: "self",
    aspect: "guardian",
    unlock: 6,
    cost: 22,
    cooldown: 16,
    heal: 90,
    colour: "#a6f0c6",
    glyph: "◉",
    desc: "Ground made holy. Nothing hostile crosses it while you stand.",
  },
  decree: {
    id: "decree",
    name: "Decree",
    source: "self",
    aspect: "sovereign",
    unlock: 5,
    cost: 20,
    cooldown: 12,
    damage: 30,
    range: 22,
    colour: "#f0c674",
    glyph: "❖",
    desc: "Speak a law into the world. What disobeys it is unmade.",
  },
};

/* Gods. Each is a Chronicle entry: worshipped, named, and therefore real. */
export const GODS = {
  vashan: {
    id: "vashan",
    name: "Vashan",
    epithet: "the Ward Everlasting",
    temple: "Temple of Vashan",
    ruin: "Weathered Ruin",
    colour: "#8ec7ff",
    grants: "ward",
    hp: 900,
    remembranceIncome: 6,
    // Said by your own people while the god is still in the Chronicle.
    beforeLine: "Vashan has kept our walls since my grandmother's grandmother.",
    // Said afterwards. They are not lying. They simply never knew him.
    afterLine: "These stones? They were always a ruin. Who did you say built it?",
  },
};

export const QUESTS = {
  wardOfStone: {
    id: "wardOfStone",
    god: "vashan",
    title: "The Ward of Stone",
    steps: [
      "Speak with the Keeper at the Temple of Vashan",
      "Vashan demands tribute: 8 Silence-touched destroyed",
      "Confront Vashan within his temple",
    ],
  },
};

/* Enemies — the Silence made local and killable. */
export const ENEMY_TYPES = {
  wisp: {
    id: "wisp",
    name: "Silence-touched Wisp",
    hp: 46,
    damage: 6,
    speed: 3.4,
    xp: 34,
    remembrance: 3,
    aspect: "conqueror",
    colour: "#b9a7ff",
    scale: 0.85,
  },
  husk: {
    id: "husk",
    name: "Forgotten Husk",
    hp: 105,
    damage: 12,
    speed: 2.5,
    xp: 78,
    remembrance: 7,
    aspect: "conqueror",
    colour: "#6f7ba8",
    scale: 1.25,
  },
};

/* The opening narration, beat by beat. */
export const OPENING = [
  "Before history, memory was law.",
  "What mortals remembered, the world preserved.",
  "What they worshipped, the world awakened.",
  "What they named could never truly die.",
  "Then the Veil shattered — and the war for the First Chronicle began.",
  "If something is listening… remember us.",
];

export const WITNESS_LINES = [
  "You believe you have killed a god.",
  "You have done something far worse.",
  "You have made a world in which they never existed.",
];
