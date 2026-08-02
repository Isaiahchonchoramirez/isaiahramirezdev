/**
 * FACTIONS — who owes whom.
 *
 * Distinct from culture: culture is where you are *from* and cannot change;
 * a faction is what you have chosen to be owed by, and standing moves both
 * ways. Any culture can join any faction, and two of them actively dislike
 * each other, so standing is a real choice rather than a checklist.
 *
 * `opposed` is symmetric by convention — gaining with one loses with the
 * other at the rate in `spill`.
 */

export const FACTIONS = {
  emberCircle: {
    id: "emberCircle",
    name: "The Ember Circle",
    kind: "cross-cultural",
    lore:
      "Fire-keepers. They hold that a hearth that has never gone out is the " +
      "oldest thing anyone owns, and they carry coals between camps to prove it.",
    wants: "Firecraft, shared hearths, feeding strangers",
    grants: "Access to every camp's fire, and the recipes kept beside it.",
    practices: ["firecraft", "herbcraft", "foraging"],
    opposed: "theQuiet",
    accent: "#e08a3c",
  },
  longWalk: {
    id: "longWalk",
    name: "The Long Walk",
    kind: "cross-cultural",
    lore:
      "Traders and route-keepers who measure the world in nights, not distance. " +
      "They know which pass is open and what it costs to be told.",
    wants: "Trade, safe passage, keeping routes open",
    grants: "Trade routes, rare material, and news that has not arrived yet.",
    practices: ["tracking", "starreading", "woodcraft"],
    opposed: "antlerCourt",
    accent: "#c9a86b",
  },
  thoseWhoCount: {
    id: "thoseWhoCount",
    name: "Those Who Count",
    kind: "aurean-rooted",
    lore:
      "Keepers of the notched stone. They argue about the length of the year " +
      "and settle disputes because they are trusted to have no side.",
    wants: "Records, measurement, arbitration",
    grants: "Calendars, omens that are actually predictions, and standing in disputes.",
    practices: ["starreading", "stonecarving", "pigments"],
    opposed: "theQuiet",
    accent: "#e0b558",
  },
  antlerCourt: {
    id: "antlerCourt",
    name: "The Antler Court",
    kind: "veyr-rooted",
    lore:
      "Ancestor-speakers who hold that the dead outnumber the living and should " +
      "therefore be consulted first. They distrust anyone in a hurry.",
    wants: "Rites for the dead, ancestral objects, patience",
    grants: "Ancestral counsel, spirit-work, and the right to be buried properly.",
    practices: ["boneworking", "hidework", "herbcraft"],
    opposed: "longWalk",
    accent: "#9fb4c4",
  },
  theQuiet: {
    id: "theQuiet",
    name: "The Quiet",
    kind: "hostile",
    lore:
      "Not a people. The ones who have stopped saying names — willingly. They " +
      "believe the world is lighter without its stories and are helping.",
    wants: "Forgetting",
    grants: "Nothing. It is not that kind of arrangement.",
    practices: [],
    opposed: "emberCircle",
    accent: "#6e6a78",
    hostile: true,
  },
};

export const FACTION_IDS = Object.keys(FACTIONS);

export const RANKS = [
  { at: -600, name: "Hunted" },
  { at: -200, name: "Unwelcome" },
  { at: 0, name: "Unknown" },
  { at: 150, name: "Spoken of" },
  { at: 450, name: "Counted among" },
  { at: 900, name: "Owed" },
  { at: 1600, name: "Named in their stories" },
];

export function rankFor(standing) {
  let rank = RANKS[0];
  RANKS.forEach((r) => { if (standing >= r.at) rank = r; });
  return rank.name;
}

export function newStandingState() {
  return Object.fromEntries(FACTION_IDS.map((id) => [id, id === "theQuiet" ? -100 : 0]));
}

/** Standing is zero-sum against a faction's opposite, at 40%. */
export function adjustStanding(state, id, amount, spill = 0.4) {
  if (!(id in state)) return;
  state[id] += amount;
  const other = FACTIONS[id]?.opposed;
  if (other && other in state) state[other] -= amount * spill;
}
