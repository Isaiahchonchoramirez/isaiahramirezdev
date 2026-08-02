/**
 * PRACTICES — the long progression axis.
 *
 * Named "Practices" rather than professions or skills: a practice is something
 * you do repeatedly until the world starts describing you by it. That framing
 * is also the mechanical hook — Remembrance is the game's currency, and what
 * you are remembered *for* is what you practise.
 *
 * Structurally this is the RuneScape shape and not the WoW one: many parallel
 * tracks, each 1–99, each levelled by doing the thing rather than by spending
 * points. There is no cap on total levels and no respec, because nothing is
 * lost by learning something else.
 *
 * Deliberately separate from ASPECTS (Sovereign / Guardian / Conqueror / Wild
 * One). Aspects are divine power and gate abilities; practices are mortal
 * competence and gate recipes, gathering and access. Two axes, no overlap.
 */

export const PRACTICES = {
  tracking:    { name: "Tracking",     group: "Field",  blurb: "Read ground, follow game, know how long ago." },
  foraging:    { name: "Foraging",     group: "Field",  blurb: "Tubers, berries, bark, the things that are quietly food." },
  fishing:     { name: "Fishing",      group: "Field",  blurb: "Weirs, spears, and patience at the meltwater." },
  herbcraft:   { name: "Herbcraft",    group: "Field",  blurb: "What closes a wound, what stops a fever, what kills." },

  knapping:    { name: "Knapping",     group: "Craft",  blurb: "Strike stone so it breaks where you meant it to." },
  hidework:    { name: "Hidework",     group: "Craft",  blurb: "Scrape, tan, cut and sew what the hunt brought back." },
  boneworking: { name: "Boneworking",  group: "Craft",  blurb: "Needles, points, toggles, flutes. Antler is better than it looks." },
  woodcraft:   { name: "Woodcraft",    group: "Craft",  blurb: "Hafts, frames, shelters, and the poles that hold them up." },
  firecraft:   { name: "Firecraft",    group: "Craft",  blurb: "Making it, keeping it, moving it, and knowing when not to." },

  pigments:    { name: "Pigments",     group: "Lore",   blurb: "Ochre, charcoal, ash. Grind, bind, and put it where it will last." },
  stonecarving:{ name: "Stonecarving", group: "Lore",   blurb: "Take a shape out of a rock and let it outlive you." },
  starreading: { name: "Star-reading", group: "Lore",   blurb: "Count nights, name the wanderers, predict the herds." },
};

export const PRACTICE_IDS = Object.keys(PRACTICES);
export const PRACTICE_GROUPS = ["Field", "Craft", "Lore"];

/**
 * RuneScape-shaped curve: cheap early levels, a long grind at the top.
 * Level 2 costs ~83 xp; level 99 lands near 13M total.
 */
export function xpForPracticeLevel(level) {
  let total = 0;
  for (let n = 1; n < level; n += 1) {
    total += Math.floor(n + 300 * Math.pow(2, n / 7));
  }
  return Math.floor(total / 4);
}

export function practiceLevelFromXp(xp) {
  let level = 1;
  while (level < 99 && xp >= xpForPracticeLevel(level + 1)) level += 1;
  return level;
}

export function newPracticeState() {
  return Object.fromEntries(PRACTICE_IDS.map((id) => [id, { xp: 0, level: 1 }]));
}

/** Total level, the number these games teach players to care about. */
export function totalLevel(state) {
  return PRACTICE_IDS.reduce((sum, id) => sum + (state[id]?.level ?? 1), 0);
}

/**
 * Award xp. Returns the new level if it changed, otherwise null, so the caller
 * decides how loudly to announce it.
 */
export function grantPractice(state, id, amount) {
  const rec = state[id];
  if (!rec) return null;
  rec.xp += amount;
  const next = practiceLevelFromXp(rec.xp);
  if (next === rec.level) return null;
  rec.level = next;
  return next;
}
