// Instrument synthesis.
//
// The sound library used to be decoration: you could select Tabla or Pedal
// Steel and hear the same square wave either way. Every instrument here is a
// real voice, built from one of eight synthesis archetypes with its own
// spectrum, envelope and articulation.
//
// Eight archetypes rather than fifty-six hand-written synths is deliberate.
// The archetype decides *how* a sound is made — plucked string, bowed string,
// blown pipe, struck bell, struck membrane, struck metal, sustained pad,
// electric lead — and the per-instrument parameters decide what it sounds
// like within that. That is roughly how a real synthesist works, and it means
// a new instrument is a line of data rather than a new function.

export type Archetype = "pluck" | "bow" | "blow" | "bell" | "membrane" | "metal" | "pad" | "lead" | "sub";

export type Voice = {
  archetype: Archetype;
  /** Relative amplitudes of harmonics 1..n. A pipe is odd-heavy, a bell inharmonic. */
  partials: number[];
  /** Seconds. */
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** Low-pass cutoff at full velocity, in Hz. */
  brightness: number;
  /** Cents of detune between stacked oscillators — the width of a supersaw. */
  detune?: number;
  /** Breath/bow/pick noise mixed in at the attack, 0–1. */
  noise?: number;
  /** Vibrato depth in cents and rate in Hz. */
  vibrato?: [depth: number, rate: number];
  /** Semitone offset baked into the instrument, e.g. a bass sounding an octave down. */
  transpose?: number;
};

const V = (
  archetype: Archetype,
  partials: number[],
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  brightness: number,
  extra: Partial<Voice> = {},
): Voice => ({ archetype, partials, attack, decay, sustain, release, brightness, ...extra });

// Harmonic recipes shared by families of instruments.
const SAW = [1, 0.5, 0.33, 0.25, 0.2, 0.166, 0.142, 0.125];
const SQUARE = [1, 0, 0.33, 0, 0.2, 0, 0.142, 0];
const PIPE = [1, 0.02, 0.28, 0.02, 0.14, 0.01, 0.08];
const STRING = [1, 0.62, 0.41, 0.28, 0.19, 0.13, 0.09, 0.06];
// Bell partials are not integer multiples, which is exactly why bells sound
// like bells and not like organs.
const BELL = [1, 2.76, 5.4, 8.93, 13.34];
const METAL = [1, 3.11, 5.87, 9.2, 12.6];

export const INSTRUMENTS: Record<string, Voice> = {
  // ── Wet/808 ──────────────────────────────────────────────────────────────
  "808 Bass": V("sub", [1, 0.14, 0.05], 0.004, 0.9, 0.25, 0.35, 1200, { transpose: -12 }),
  "Trap Hi-Hat": V("metal", METAL, 0.001, 0.04, 0, 0.03, 12000, { noise: 0.85 }),
  "Lean Snare": V("membrane", [1, 1.6, 2.3], 0.001, 0.16, 0, 0.1, 4200, { noise: 0.7 }),
  "Drip Pad": V("pad", SAW, 0.45, 1.2, 0.6, 1.4, 2400, { detune: 14 }),
  "Murk Sub": V("sub", [1, 0.05], 0.01, 1.4, 0.5, 0.5, 700, { transpose: -12 }),
  "Rain Bell": V("bell", BELL, 0.002, 1.1, 0, 0.9, 9000),
  "Syrup Pluck": V("pluck", STRING, 0.003, 0.34, 0.05, 0.28, 3600),
  "Cloud Kick": V("sub", [1, 0.3], 0.002, 0.45, 0, 0.2, 900, { transpose: -12 }),

  // ── Techno ───────────────────────────────────────────────────────────────
  "Industrial Kick": V("sub", [1, 0.5, 0.2], 0.001, 0.32, 0, 0.12, 1600, { transpose: -12 }),
  "Dark Synth": V("lead", SAW, 0.02, 0.3, 0.55, 0.3, 2600, { detune: 9 }),
  "Acid Bass": V("lead", SQUARE, 0.004, 0.22, 0.3, 0.15, 1500, { transpose: -12 }),
  "Clank Perc": V("metal", METAL, 0.001, 0.13, 0, 0.08, 7000, { noise: 0.4 }),
  "Berlin Lead": V("lead", SAW, 0.01, 0.4, 0.5, 0.35, 3400, { detune: 18 }),
  "EBM Bass": V("lead", SQUARE, 0.002, 0.28, 0.45, 0.2, 1100, { transpose: -12 }),
  "Clap Stack": V("membrane", [1, 1.4], 0.001, 0.14, 0, 0.09, 3800, { noise: 0.9 }),
  "Warehouse Stab": V("lead", SAW, 0.005, 0.18, 0.15, 0.22, 4200, { detune: 24 }),

  // ── Indian ───────────────────────────────────────────────────────────────
  Tabla: V("membrane", [1, 2.1, 3.4, 4.2], 0.001, 0.38, 0.02, 0.3, 2600, { noise: 0.12 }),
  Sitar: V("pluck", [1, 0.8, 0.72, 0.5, 0.44, 0.3, 0.26, 0.2], 0.004, 1.5, 0.12, 1.1, 5200, { vibrato: [22, 5.2] }),
  Tanpura: V("pad", [1, 0.85, 0.6, 0.55, 0.4, 0.3, 0.22], 0.35, 2.4, 0.7, 2.2, 3200),
  Bansuri: V("blow", PIPE, 0.06, 0.2, 0.75, 0.24, 3000, { noise: 0.3, vibrato: [16, 5.5] }),
  Dhol: V("membrane", [1, 1.9, 2.8], 0.001, 0.42, 0, 0.24, 1800, { noise: 0.2 }),
  Shehnai: V("blow", [1, 0.7, 0.55, 0.42, 0.3, 0.22], 0.04, 0.18, 0.8, 0.22, 4400, { noise: 0.22, vibrato: [26, 6] }),
  Mridangam: V("membrane", [1, 2.3, 3.1], 0.001, 0.3, 0, 0.2, 2200, { noise: 0.1 }),
  Santoor: V("pluck", BELL, 0.002, 0.9, 0, 0.7, 6800),

  // ── Rock ─────────────────────────────────────────────────────────────────
  "Electric Guitar": V("pluck", SAW, 0.005, 0.8, 0.35, 0.5, 3800),
  "Distorted Bass": V("lead", SAW, 0.005, 0.4, 0.6, 0.24, 1300, { transpose: -12, detune: 6 }),
  "Drum Kit": V("membrane", [1, 1.7, 2.6], 0.001, 0.22, 0, 0.14, 3400, { noise: 0.55 }),
  "Power Chord": V("lead", SAW, 0.008, 0.6, 0.65, 0.4, 2800, { detune: 12 }),
  "Solo Lead": V("lead", SAW, 0.02, 0.5, 0.7, 0.45, 4600, { vibrato: [20, 5.8] }),
  "Crash Cymbal": V("metal", METAL, 0.001, 1.6, 0, 1.2, 13000, { noise: 0.95 }),
  "Amp Drive": V("lead", SQUARE, 0.006, 0.45, 0.55, 0.3, 2200, { detune: 8 }),
  "Wah Pedal": V("lead", SAW, 0.01, 0.4, 0.5, 0.3, 1800, { vibrato: [10, 3.4] }),

  // ── Country ──────────────────────────────────────────────────────────────
  Banjo: V("pluck", [1, 0.9, 0.7, 0.62, 0.4, 0.3, 0.24], 0.002, 0.42, 0.02, 0.3, 6200),
  "Steel Guitar": V("bow", STRING, 0.09, 0.7, 0.6, 0.6, 3600, { vibrato: [14, 4.6] }),
  "Acoustic Guitar": V("pluck", STRING, 0.003, 0.95, 0.08, 0.6, 4200),
  Fiddle: V("bow", SAW, 0.05, 0.3, 0.75, 0.3, 3400, { noise: 0.16, vibrato: [18, 5.6] }),
  Dobro: V("pluck", STRING, 0.003, 0.7, 0.06, 0.5, 5000),
  Mandolin: V("pluck", [1, 0.75, 0.6, 0.42, 0.3, 0.2], 0.002, 0.5, 0.03, 0.34, 6600),
  "Upright Bass": V("pluck", [1, 0.42, 0.2, 0.1], 0.006, 0.7, 0.1, 0.4, 900, { transpose: -12 }),
  "Honky Piano": V("pluck", [1, 0.6, 0.38, 0.24, 0.16, 0.1], 0.002, 1.1, 0.15, 0.6, 4800, { detune: 7 }),

  // ── Arabic ───────────────────────────────────────────────────────────────
  Oud: V("pluck", STRING, 0.003, 0.8, 0.06, 0.5, 3600),
  Darbuka: V("membrane", [1, 2.2, 3.6], 0.001, 0.2, 0, 0.14, 3000, { noise: 0.18 }),
  Riq: V("metal", METAL, 0.001, 0.14, 0, 0.1, 11000, { noise: 0.8 }),
  Qanun: V("pluck", [1, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16], 0.002, 0.85, 0.04, 0.5, 6400),
  "Ney Flute": V("blow", PIPE, 0.08, 0.22, 0.72, 0.3, 2600, { noise: 0.42, vibrato: [14, 4.8] }),
  Buzuq: V("pluck", STRING, 0.003, 0.7, 0.05, 0.42, 5400),
  "Maqam Synth": V("lead", SAW, 0.03, 0.4, 0.6, 0.4, 3000, { detune: 11, vibrato: [16, 5] }),
  Doumbek: V("membrane", [1, 2.4, 3.2], 0.001, 0.18, 0, 0.12, 3400, { noise: 0.22 }),

  // ── Celtic ───────────────────────────────────────────────────────────────
  "Uilleann Pipes": V("blow", [1, 0.55, 0.6, 0.35, 0.4, 0.24, 0.2], 0.05, 0.16, 0.85, 0.22, 3600, { noise: 0.2 }),
  "Celtic Harp": V("pluck", [1, 0.55, 0.35, 0.22, 0.14, 0.09], 0.002, 1.3, 0.04, 0.9, 5600),
  Bodhran: V("membrane", [1, 1.6, 2.4], 0.001, 0.34, 0, 0.22, 1400, { noise: 0.3 }),
  "Tin Whistle": V("blow", PIPE, 0.03, 0.14, 0.8, 0.16, 5200, { noise: 0.35 }),
  "Folk Fiddle": V("bow", SAW, 0.05, 0.28, 0.75, 0.3, 3600, { noise: 0.18, vibrato: [17, 5.4] }),
  "Frame Drum": V("membrane", [1, 1.8, 2.5], 0.001, 0.3, 0, 0.2, 1700, { noise: 0.26 }),
  "Hurdy Gurdy": V("bow", SAW, 0.04, 0.3, 0.8, 0.3, 2800, { noise: 0.3, detune: 9 }),
};

export const GENRES: Record<
  string,
  { color: string; instruments: string[]; scale: number[]; root: number; bpm: number; blurb: string }
> = {
  "Wet/808": {
    color: "#2ff5d8",
    instruments: ["808 Bass", "Trap Hi-Hat", "Lean Snare", "Drip Pad", "Murk Sub", "Rain Bell", "Syrup Pluck", "Cloud Kick"],
    // Natural minor — the default language of trap.
    scale: [0, 2, 3, 5, 7, 8, 10],
    root: 48,
    bpm: 140,
    blurb: "Half-time hats, sub that sits under everything",
  },
  Techno: {
    color: "#ff3d7f",
    instruments: ["Industrial Kick", "Dark Synth", "Acid Bass", "Clank Perc", "Berlin Lead", "EBM Bass", "Clap Stack", "Warehouse Stab"],
    // Phrygian — the flat second is what makes techno sound menacing.
    scale: [0, 1, 3, 5, 7, 8, 10],
    root: 45,
    bpm: 132,
    blurb: "Four to the floor, phrygian menace",
  },
  Indian: {
    color: "#ffb020",
    instruments: ["Tabla", "Sitar", "Tanpura", "Bansuri", "Dhol", "Shehnai", "Mridangam", "Santoor"],
    // Raga Bhairav: flat 2nd and flat 6th against natural 3rd and 7th.
    scale: [0, 1, 4, 5, 7, 8, 11],
    root: 50,
    bpm: 96,
    blurb: "Raga Bhairav over a tabla cycle",
  },
  Rock: {
    color: "#ff6b35",
    instruments: ["Electric Guitar", "Distorted Bass", "Drum Kit", "Power Chord", "Solo Lead", "Crash Cymbal", "Amp Drive", "Wah Pedal"],
    // Minor pentatonic — the blues box.
    scale: [0, 3, 5, 7, 10],
    root: 45,
    bpm: 124,
    blurb: "Minor pentatonic, backbeat on two and four",
  },
  Country: {
    color: "#ffd93d",
    instruments: ["Banjo", "Steel Guitar", "Acoustic Guitar", "Fiddle", "Dobro", "Mandolin", "Upright Bass", "Honky Piano"],
    // Major pentatonic.
    scale: [0, 2, 4, 7, 9],
    root: 52,
    bpm: 112,
    blurb: "Major pentatonic, train-beat shuffle",
  },
  Arabic: {
    color: "#b388ff",
    instruments: ["Oud", "Darbuka", "Riq", "Qanun", "Ney Flute", "Buzuq", "Maqam Synth", "Doumbek"],
    // Maqam Hijaz — the augmented second between the 2nd and 3rd degrees.
    scale: [0, 1, 4, 5, 7, 8, 10],
    root: 50,
    bpm: 104,
    blurb: "Maqam Hijaz over a maqsum groove",
  },
  Celtic: {
    color: "#4ade80",
    instruments: ["Uilleann Pipes", "Celtic Harp", "Bodhran", "Tin Whistle", "Folk Fiddle", "Frame Drum", "Hurdy Gurdy", "Mandolin"],
    // Dorian — minor with a raised sixth.
    scale: [0, 2, 3, 5, 7, 9, 10],
    root: 50,
    bpm: 116,
    blurb: "Dorian jig over a bodhran pulse",
  },
};

/** Equal temperament from MIDI note number. 69 is A440. */
export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/**
 * Map a scale-degree index to a MIDI note, wrapping into higher octaves as the
 * index runs past the end of the scale. Degree 0 is the root.
 */
export function degreeToMidi(genre: keyof typeof GENRES | string, degree: number): number {
  const { scale, root } = GENRES[genre] ?? GENRES["Wet/808"];
  const octave = Math.floor(degree / scale.length);
  const step = ((degree % scale.length) + scale.length) % scale.length;
  return root + octave * 12 + scale[step];
}

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function midiToName(note: number): string {
  return `${NOTE_NAMES[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;
}
