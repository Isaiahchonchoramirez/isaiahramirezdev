/**
 * Emerging mythic archetypes.
 *
 * A class is a role that has not become a legend yet. Every culture can take
 * every class — culture changes the *interpretation* (what the Aureans call a
 * Stormcaller and what the Veyr call one are the same role and different
 * offices), so the culture-specific text lives in `readAs`.
 *
 * Abilities are declared as data. `main.js` reads `basic` and `godlike` and
 * resolves them through one effect dispatcher, so adding an archetype means
 * adding an entry here and nothing else.
 */

export const CLASSES = {
  huntmaster: {
    id: "huntmaster",
    name: "Huntmaster",
    tagline: "Tracking, spears, beasts, the long patience",
    description:
      "You read ground the way others read faces. The herd's direction, how long " +
      "ago, whether it was frightened. Nothing in the valley moves without leaving " +
      "you a sentence to read.",
    readAs: {
      aurean: "A reckoner of seasons — the one who says when the herds will cross.",
      veyr: "A track-speaker, owed a share of every kill they walked ahead of.",
    },
    silhouette: { build: "lean", pack: true, spear: true, cloak: "short" },
    passive: {
      name: "Long Patience",
      description: "You see further, and the Silence-touched notice you later.",
    },
    basic: {
      id: "castingSpear",
      name: "Casting Spear",
      glyph: "↑",
      colour: "#d8c9ae",
      cost: 6,
      cooldown: 0.85,
      damage: 26,
      range: 26,
      aspect: "conqueror",
      desc: "A thrown spear, weighted at the shoulder. Reaches further than anything else you own.",
    },
    godlike: {
      id: "theHerdTurns",
      name: "The Herd Turns",
      glyph: "⁂",
      colour: "#c9a86b",
      cost: 60,
      cooldown: 26,
      damage: 120,
      radius: 26,
      range: 40,
      aspect: "wild",
      shape: "stampede",
      desc:
        "You do not summon the great beasts. You remind them of a grievance, and " +
        "step aside as the ground answers.",
    },
  },

  oathblade: {
    id: "oathblade",
    name: "Oathblade",
    tagline: "Melee, leadership, the promise that binds",
    description:
      "You said a thing out loud in front of witnesses and it became load-bearing. " +
      "The blade is almost incidental — what makes you dangerous is that everyone " +
      "watching believes you will not step back.",
    readAs: {
      aurean: "A sworn arbiter, whose word closes an argument permanently.",
      veyr: "A hearth-holder — the one who stands in the door when the cold comes.",
    },
    silhouette: { build: "heavy", shield: true, blade: true, cloak: "long" },
    passive: {
      name: "Witnessed",
      description: "You take less harm while allies or your people can see you.",
    },
    basic: {
      id: "swornCut",
      name: "Sworn Cut",
      glyph: "†",
      colour: "#cfd6de",
      cost: 7,
      cooldown: 0.7,
      damage: 32,
      range: 8,
      aspect: "conqueror",
      desc: "A short committed stroke. No flourish — flourish is for people with something to prove.",
    },
    godlike: {
      id: "theUnbrokenWord",
      name: "The Unbroken Word",
      glyph: "◈",
      colour: "#e0b558",
      cost: 55,
      cooldown: 30,
      shield: 320,
      heal: 140,
      radius: 20,
      aspect: "guardian",
      shape: "bulwark",
      desc:
        "You say the oath again. Reality, having no counter-argument, holds the line " +
        "where you said it would be.",
    },
  },

  spiritwalker: {
    id: "spiritwalker",
    name: "Spiritwalker",
    tagline: "Ancestors, dreams, healing, going out and coming back",
    description:
      "You go where the dead are and return with something useful and something " +
      "wrong. Your people accept this trade. You have stopped counting which parts " +
      "of your memory are actually yours.",
    readAs: {
      aurean: "An oracle who descends — respected, and never entirely trusted.",
      veyr: "A walker who carries the clan's dead out and brings their counsel back.",
    },
    silhouette: { build: "lean", staff: true, mask: true, cloak: "long" },
    passive: {
      name: "Borrowed Breath",
      description: "You recover Remembrance faster near the dead and near fire.",
    },
    basic: {
      id: "ancestorsHand",
      name: "Ancestor's Hand",
      glyph: "⊕",
      colour: "#a6f0c6",
      cost: 12,
      cooldown: 3.5,
      heal: 70,
      range: 14,
      aspect: "guardian",
      desc: "Someone who loved you a long time ago closes the wound. You do not see who.",
    },
    godlike: {
      id: "theProcession",
      name: "The Procession",
      glyph: "❋",
      colour: "#b9e4ff",
      cost: 58,
      cooldown: 32,
      damage: 74,
      heal: 190,
      radius: 24,
      range: 26,
      aspect: "guardian",
      shape: "procession",
      desc:
        "Every ancestor who has a claim on you arrives at once. The living are mended. " +
        "Whatever does not belong here is escorted out.",
    },
  },

  stormcaller: {
    id: "stormcaller",
    name: "Stormcaller",
    tagline: "Weather, lightning, wind, the sky's opinion",
    description:
      "Weather is not something you control. It is something you are on speaking " +
      "terms with, and the conversation is not private — everyone downwind hears " +
      "your side of it.",
    readAs: {
      aurean: "A sky-arbiter, whose anger is assumed to be the sky's anger.",
      veyr: "A storm-lender, who borrows and is expected to repay.",
    },
    silhouette: { build: "medium", staff: true, feathers: true, cloak: "flowing" },
    passive: {
      name: "Downwind",
      description: "Your abilities reach further in open ground and on high places.",
    },
    basic: {
      id: "splitAir",
      name: "Split Air",
      glyph: "≶",
      colour: "#9fd8ff",
      cost: 9,
      cooldown: 1.1,
      damage: 30,
      range: 30,
      aspect: "conqueror",
      desc: "A short hard crack of pressure. Closer to a slap than to lightning.",
    },
    godlike: {
      id: "theSkyAgrees",
      name: "The Sky Agrees",
      glyph: "⌁",
      colour: "#cfe4ff",
      cost: 62,
      cooldown: 28,
      damage: 165,
      radius: 22,
      range: 46,
      aspect: "conqueror",
      shape: "storm",
      desc:
        "You state a grievance loudly enough, in the correct place, and for a few " +
        "seconds the weather takes your side of it.",
    },
  },

  earthshaper: {
    id: "earthshaper",
    name: "Earthshaper",
    tagline: "Stone, root, terrain, the slow defence",
    description:
      "You are on good terms with things that outlast you. Stone is patient and " +
      "will do what you ask if you ask in a way it recognises. Nothing you make " +
      "is fast, and nothing you make comes apart.",
    readAs: {
      aurean: "A stone-cutter whose walls are argued to have opinions.",
      veyr: "A root-listener, who knows which ground will hold a house.",
    },
    silhouette: { build: "heavy", pack: true, maul: true, cloak: "short" },
    passive: {
      name: "Rooted",
      description: "Standing still briefly hardens you against the next blow.",
    },
    basic: {
      id: "risingStone",
      name: "Rising Stone",
      glyph: "⌂",
      colour: "#b0a894",
      cost: 8,
      cooldown: 1.2,
      damage: 28,
      range: 18,
      shield: 30,
      aspect: "guardian",
      desc: "A slab comes up under whatever you pointed at, and a little comes up under you.",
    },
    godlike: {
      id: "theGroundRemembers",
      name: "The Ground Remembers",
      glyph: "⬢",
      colour: "#d3c3a0",
      cost: 56,
      cooldown: 30,
      damage: 130,
      shield: 200,
      radius: 25,
      range: 24,
      aspect: "guardian",
      shape: "upheaval",
      desc:
        "The valley recalls the shape it held before anyone walked here, and takes " +
        "that shape again for as long as you can hold the thought.",
    },
  },

  veilborn: {
    id: "veilborn",
    name: "Veilborn",
    tagline: "Stealth, memory, illusion, forgotten names",
    description:
      "You are difficult to keep in mind. People set down a thought about you and " +
      "cannot find it again. This is extremely useful and it is happening to you " +
      "as well, a little more each year.",
    readAs: {
      aurean: "One who walks beneath — barely spoken of, never formally acknowledged.",
      veyr: "A between-walker, left food at the edge of camp and not invited in.",
    },
    silhouette: { build: "lean", daggers: true, hood: true, cloak: "long" },
    passive: {
      name: "Hard to Recall",
      description: "Enemies lose track of you sooner when you break away.",
    },
    basic: {
      id: "unname",
      name: "Unname",
      glyph: "∅",
      colour: "#b9a7ff",
      cost: 8,
      cooldown: 1.0,
      damage: 34,
      range: 15,
      aspect: "conqueror",
      desc: "You take away what a thing is called. Briefly, it is less sure it exists.",
    },
    godlike: {
      id: "theForgetting",
      name: "The Forgetting",
      glyph: "◇",
      colour: "#cbbcff",
      cost: 64,
      cooldown: 34,
      damage: 145,
      radius: 24,
      range: 26,
      aspect: "wild",
      shape: "forgetting",
      desc:
        "You do to a stretch of ground what the Chronicle does to a god. Nothing there " +
        "is destroyed. It simply stops having been.",
    },
  },
};

export const CLASS_IDS = Object.keys(CLASSES);

/** All abilities a build actually has, flattened for the hotbar. */
export function abilitiesForClass(classId) {
  const archetype = CLASSES[classId];
  if (!archetype) return [];
  return [archetype.basic, archetype.godlike];
}
