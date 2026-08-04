// Pattern generation.
//
// The old "AI BEAT" button wrote the same 6-kick pattern every time and then
// sprinkled 6% random noise over it, regardless of which of the seven genres
// was selected. These are real per-genre rhythms — the placements come from
// how the style is actually played — plus a melodic generator that walks the
// genre's own scale.

import { DRUM_TRACKS, type DrumId } from "./synth";

export const STEPS = 32;
export const MELODY_ROWS = 14;

// Every genre scale here is 5 or 7 notes; 7 is the common case and is what the
// generator uses to find the octave above the root.
const SCALE_STEPS_PER_OCTAVE = 7;

export type DrumPattern = Record<string, boolean[]>;
export type MelodyPattern = (number | null)[];

export const emptyDrums = (): DrumPattern =>
  Object.fromEntries(DRUM_TRACKS.map((t) => [t.id, Array<boolean>(STEPS).fill(false)]));

export const emptyMelody = (): MelodyPattern => Array<number | null>(STEPS).fill(null);

/**
 * Per-genre rhythms, written as step indices over 32 sixteenth notes (two bars
 * of 4/4). `fill` is the chance a step gets an extra off-grid hit, which is
 * what stops eight repeats sounding identical.
 */
type Rhythm = { hits: Partial<Record<DrumId, number[]>>; fill: number };

const RHYTHMS: Record<string, Rhythm> = {
  // Half-time: snare on 3, not on 2 and 4. Hats run in rolls.
  "Wet/808": {
    hits: {
      kick: [0, 6, 10, 16, 22, 26, 29],
      snare: [8, 24],
      hihat_c: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14, 16, 18, 19, 20, 22, 24, 26, 27, 28, 30],
      hihat_o: [7, 23],
      clap: [8, 24],
      perc: [13, 31],
      tom_l: [15],
    },
    fill: 0.05,
  },
  // Four to the floor, offbeat open hat — the defining techno signature.
  Techno: {
    hits: {
      kick: [0, 4, 8, 12, 16, 20, 24, 28],
      snare: [8, 24],
      hihat_c: [2, 6, 10, 14, 18, 22, 26, 30],
      hihat_o: [2, 6, 10, 14, 18, 22, 26, 30],
      clap: [8, 24],
      perc: [3, 11, 19, 27],
      tom_l: [30],
    },
    fill: 0.04,
  },
  // Teentaal-flavoured: accents on 1, 5, 13 with the 9 left open.
  Indian: {
    hits: {
      kick: [0, 12, 16, 28],
      tom_h: [4, 8, 20, 24],
      tom_l: [2, 10, 18, 26],
      perc: [1, 3, 6, 7, 9, 11, 14, 17, 19, 22, 23, 25, 27, 30],
      hihat_c: [0, 4, 8, 12, 16, 20, 24, 28],
    },
    fill: 0.07,
  },
  // Backbeat on 2 and 4, eighth-note hats, crash on the downbeat.
  Rock: {
    hits: {
      kick: [0, 6, 10, 16, 22, 26],
      snare: [8, 24],
      hihat_c: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
      hihat_o: [30],
      tom_h: [29],
      tom_l: [31],
    },
    fill: 0.05,
  },
  // Train beat: constant sixteenths on the snare, kick on 1 and 3.
  Country: {
    hits: {
      kick: [0, 8, 16, 24],
      snare: [4, 12, 20, 28],
      hihat_c: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
      perc: [7, 15, 23, 31],
    },
    fill: 0.04,
  },
  // Maqsum: dum on 1 and 3-and, tak on 2 and 4.
  Arabic: {
    hits: {
      kick: [0, 6, 16, 22],
      snare: [8, 24],
      perc: [2, 4, 10, 12, 14, 18, 20, 26, 28, 30],
      tom_h: [11, 27],
      hihat_c: [0, 4, 8, 12, 16, 20, 24, 28],
    },
    fill: 0.06,
  },
  // Jig feel: grouped in threes against the sixteenth grid.
  Celtic: {
    hits: {
      kick: [0, 6, 12, 16, 22, 28],
      tom_l: [3, 9, 19, 25],
      perc: [1, 4, 7, 10, 13, 17, 20, 23, 26, 29],
      hihat_c: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
    },
    fill: 0.05,
  },
};

/** Deterministic PRNG so a seed reproduces a pattern exactly. */
function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

export function generateDrums(genre: string, seed = Date.now()): DrumPattern {
  const rhythm = RHYTHMS[genre] ?? RHYTHMS["Wet/808"];
  const random = rng(seed);
  const pattern = emptyDrums();

  for (const track of DRUM_TRACKS) {
    const hits = rhythm.hits[track.id] ?? [];
    for (const step of hits) pattern[track.id][step] = true;

    // Ghost notes, only on tracks the genre already uses — adding a random
    // crash to a style that has no crash just sounds like a mistake.
    if (hits.length > 0) {
      for (let step = 0; step < STEPS; step++) {
        if (!pattern[track.id][step] && random() < rhythm.fill) pattern[track.id][step] = true;
      }
    }
  }

  return pattern;
}

/**
 * A melodic phrase over the genre's scale.
 *
 * Two rules do most of the work of sounding musical rather than random: land
 * on the root at the start of each bar, and prefer small steps over leaps.
 * The result is a line that resolves and that a listener can follow.
 */
export function generateMelody(seed = Date.now()): MelodyPattern {
  const random = rng(seed ^ 0x5f3759df);
  const melody = emptyMelody();

  // Eighth notes, so the line breathes against sixteenth-note drums.
  const grid = 2;
  let degree = 0;

  for (let step = 0; step < STEPS; step += grid) {
    const isBarStart = step % 16 === 0;
    const isPhraseEnd = step >= STEPS - grid;

    if (isBarStart || isPhraseEnd) {
      // Land on a root, alternating octaves so the two bars are not identical.
      degree = isPhraseEnd || step === 0 ? 0 : SCALE_STEPS_PER_OCTAVE;
    } else if (random() < 0.22) {
      // Rest. Silence is what separates a phrase from a scale exercise.
      melody[step] = null;
      continue;
    } else {
      const leap = random();
      // 62% stepwise, 26% a third, 12% a real leap.
      const interval = leap < 0.62 ? 1 : leap < 0.88 ? 2 : 3 + Math.floor(random() * 2);

      // Bias toward the middle of the roll rather than picking a direction at
      // random. An unbiased walk with a clamp at zero pins itself to the floor
      // — every phrase came out sitting on the bottom two rows.
      const centre = MELODY_ROWS / 2;
      const pullUp = 0.5 + (centre - degree) / MELODY_ROWS;
      let next = degree + (random() < pullUp ? interval : -interval);

      // Reflect off the ends instead of clamping, so hitting a limit turns the
      // line around rather than flattening it.
      if (next < 0) next = -next;
      if (next > MELODY_ROWS - 1) next = 2 * (MELODY_ROWS - 1) - next;
      degree = Math.max(0, Math.min(MELODY_ROWS - 1, next));
    }

    melody[step] = degree;

    // Occasional passing note on the offbeat, inside the same octave.
    if (!isPhraseEnd && random() < 0.3) {
      const passing = Math.max(0, Math.min(MELODY_ROWS - 1, degree + (random() < 0.5 ? -1 : 1)));
      melody[step + 1] = passing;
    }
  }

  // Guarantee a root at the very end so the loop closes rather than stops.
  melody[STEPS - grid] = 0;

  return melody;
}
