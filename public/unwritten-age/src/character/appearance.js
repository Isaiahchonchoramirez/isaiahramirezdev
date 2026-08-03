import { HAIR_OPTIONS, normaliseWardrobeAppearance } from "./wardrobe-catalog.js";

/**
 * The appearance data model.
 *
 * Every control declares what it actually drives via `affects`:
 *
 *   "body"     — moves the body you can see right now
 *   "deferred" — saved with the character, but does not move it yet
 *
 * The avatar used to be rebuilt from primitives, so every dimension we could
 * name we could also construct and every slider here moved the mesh. It is now
 * a rigged MPFB human exported from Blender, and a skinned glTF only bends
 * where it has been given somewhere to bend. Overall height is honoured by
 * scaling; everything below is authored in the .blend and needs morph targets
 * exported before it can be driven from here.
 *
 * The rule that survived the swap is the one that matters: a control that
 * cannot be honoured is marked "deferred" and rendered in its own labelled
 * group — never as a live slider that does nothing.
 */

/** Skin tones spanning realistic global variation, dark → light, ordered. */
export const SKIN_TONES = [
  "#3a2318", "#4a2e1e", "#5c3a26", "#6f4a30", "#845c3c",
  "#9a7049", "#b08659", "#c39c72", "#d4b28d", "#e2c6a6",
];

export const HAIR_COLOURS = [
  "#100c0a", "#241a14", "#3c2a1d", "#573c26", "#74522f",
  "#8f6b3d", "#a98a5c", "#c4ab84", "#8a8a8a", "#d8d4cc",
];

export const EYE_COLOURS = [
  "#3d2a1a", "#5a3f22", "#7a5a2e", "#6b7a4a", "#4a6b6b",
  "#3f5f7a", "#5a6b8a", "#2e2a28",
];

export const HAIR_STYLES = HAIR_OPTIONS;

export const BODY_SEXES = [
  { id: "male", name: "Male body" },
  { id: "female", name: "Female body" },
  { id: "androgynous", name: "Androgynous body" },
];

export const HAIR_TEXTURES = [
  { id: "straight", name: "Straight" },
  { id: "wavy", name: "Wavy" },
  { id: "curled", name: "Curled" },
  { id: "coiled", name: "Coiled" },
];

export const FACIAL_HAIR = [
  { id: "none", name: "None" },
  { id: "stubble", name: "Stubble" },
  { id: "short-beard", name: "Short beard" },
  { id: "full-beard", name: "Full beard" },
  { id: "braided-beard", name: "Braided beard" },
  { id: "moustache", name: "Moustache" },
];

export const VOICES = [
  { id: "low", name: "Low" },
  { id: "resonant", name: "Resonant" },
  { id: "clear", name: "Clear" },
  { id: "gravel", name: "Gravel" },
  { id: "quiet", name: "Quiet" },
  { id: "high", name: "High" },
];

export const BODY_BASES = [
  { id: "veyr-hunter", name: "Veyr hunter" },
  { id: "aurean-keeper", name: "Aurean keeper" },
  { id: "ember-elder", name: "Ember elder" },
];

export const TORSO_GARMENTS = [
  { id: "none", name: "None" },
  { id: "tunic", name: "Woven tunic" },
  { id: "hide-armor", name: "Layered hide armor" },
];

export const LOWER_GARMENTS = [
  { id: "none", name: "None" },
  { id: "wrap", name: "Pleated wrap" },
  { id: "robe", name: "Long ritual robe" },
];

export const MANTLES = [
  { id: "none", name: "None" },
  { id: "shoulder-mantle", name: "Shoulder mantle" },
];

export const FOOTWEAR = [
  { id: "bare", name: "Barefoot" },
  { id: "fur-boots", name: "Fur calf wraps" },
];

export const MARKINGS = [
  { id: "none", name: "None" },
  { id: "ochre-bands", name: "Ochre bands", colour: "#b5502f" },
  { id: "ash-mask", name: "Ash mask", colour: "#cfc9bd" },
  { id: "charcoal-lines", name: "Charcoal lines", colour: "#2a2724" },
  { id: "ancestor-tally", name: "Ancestor tally", colour: "#e6dcc4" },
  { id: "sun-rays", name: "Sun rays", colour: "#d9a441" },
  { id: "beast-track", name: "Beast tracks", colour: "#5a3a30" },
];

export const SCARS = [
  { id: "none", name: "None" },
  { id: "brow", name: "Brow" },
  { id: "cheek", name: "Cheek" },
  { id: "jaw", name: "Jaw" },
  { id: "throat", name: "Throat" },
];

/**
 * Slider definitions. `affects: "body"` sliders move the mesh immediately;
 * `affects: "deferred"` sliders are stored on the character and wait for morph
 * targets to be exported from the .blend sources.
 */
export const BODY_SLIDERS = [
  { key: "height", name: "Height", min: 1.5, max: 2.0, step: 0.01, affects: "body", unit: "m" },
  { key: "build", name: "Overall build", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "muscularity", name: "Muscularity", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "bodyFat", name: "Body fat", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "shoulderWidth", name: "Shoulder width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "chestWidth", name: "Chest width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "waistWidth", name: "Waist width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "hipWidth", name: "Hip width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "armThickness", name: "Arm thickness", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "legThickness", name: "Leg thickness", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "torsoLength", name: "Torso length", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "armLength", name: "Arm proportion", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "legLength", name: "Leg proportion", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "neckLength", name: "Neck length", min: 0, max: 1, step: 0.01, affects: "body" },
  // Driven by authored morph targets rather than bone scale, so they swell and
  // shrink the surface instead of stretching a whole segment.
  { key: "bust", name: "Bust", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "glutes", name: "Seat", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "belly", name: "Belly", min: 0, max: 1, step: 0.01, affects: "body" },
];

export const HEAD_SLIDERS = [
  { key: "headSize", name: "Head size", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "headWidth", name: "Head width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "jawWidth", name: "Jaw width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "chinLength", name: "Chin length", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "browRidge", name: "Brow ridge", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "noseSize", name: "Nose", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "cheekbones", name: "Cheekbones", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "earSize", name: "Ears", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "eyeSpacing", name: "Eye spacing", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "eyeHeight", name: "Eye position", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "eyeDepth", name: "Eye depth", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "mouthWidth", name: "Mouth width", min: 0, max: 1, step: 0.01, affects: "body" },
  { key: "lipFullness", name: "Lip fullness", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "noseBridge", name: "Nose bridge", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "noseHeight", name: "Nose position", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "mouthHeight", name: "Mouth position", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "eyeSize", name: "Eye size", min: 0, max: 1, step: 0.01, affects: "deferred" },
  { key: "age", name: "Age", min: 0, max: 1, step: 0.01, affects: "deferred" },
];

export function defaultAppearance() {
  return {
    // identity
    name: "",
    culture: "veyr",
    archetype: "huntmaster",
    voice: "low",
    bodyBase: "veyr-hunter",
    bodySex: "male",

    // body — all drive the mesh
    height: 1.74,
    build: 0.5,
    muscularity: 0.45,
    bodyFat: 0.4,
    shoulderWidth: 0.5,
    chestWidth: 0.5,
    waistWidth: 0.5,
    hipWidth: 0.5,
    armThickness: 0.5,
    legThickness: 0.5,
    torsoLength: 0.5,
    armLength: 0.5,
    legLength: 0.5,
    neckLength: 0.5,
    bust: 0.5,
    glutes: 0.5,
    belly: 0.5,

    // head
    headSize: 0.5,
    headWidth: 0.5,
    jawWidth: 0.5,
    chinLength: 0.5,
    browRidge: 0.5,
    noseSize: 0.5,
    cheekbones: 0.5,
    earSize: 0.5,
    eyeSpacing: 0.5,
    eyeHeight: 0.5,
    noseBridge: 0.5,
    noseHeight: 0.5,
    mouthHeight: 0.5,
    eyeSize: 0.5,
    eyeDepth: 0.5,
    mouthWidth: 0.5,
    lipFullness: 0.5,
    age: 0.35,

    // surface
    skinTone: 4,
    hairStyle: "hair_close_crop",
    outfitPreset: "veyr_hunter",
    hairTexture: "straight",
    hairLength: 0.5,
    hairColour: 2,
    facialHair: "stubble",
    eyeColour: 0,
    marking: "ochre-bands",
    scar: "none",
    torsoGarment: "tunic",
    lowerGarment: "wrap",
    mantle: "none",
    footwear: "bare",
  };
}

const rand = (n) => Math.floor(Math.random() * n);
const randf = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[rand(arr.length)];

/** Randomise within a culture, so results still read as that lineage. */
export function randomAppearance(cultureId, cultures) {
  const culture = cultures[cultureId];
  const base = defaultAppearance();
  const sliders = [...BODY_SLIDERS, ...HEAD_SLIDERS];

  sliders.forEach((s) => {
    if (s.key === "height") base.height = +randf(1.54, 1.95).toFixed(2);
    // Bias toward the middle so random faces stay plausible rather than extreme.
    else base[s.key] = +((Math.random() + Math.random() + Math.random()) / 3).toFixed(2);
  });

  base.culture = cultureId;
  base.skinTone = pick(culture.skinBias);
  base.hairStyle = pick(HAIR_STYLES).id;
  base.hairTexture = pick(HAIR_TEXTURES).id;
  base.hairColour = rand(HAIR_COLOURS.length);
  base.hairLength = +Math.random().toFixed(2);
  base.facialHair = pick(FACIAL_HAIR).id;
  base.eyeColour = rand(EYE_COLOURS.length);
  base.marking = pick(MARKINGS).id;
  base.scar = pick(SCARS).id;
  base.voice = pick(culture.voiceBias);
  return base;
}

/* ------------------------------------------------------------- persistence */

const STORE_KEY = "unwritten-age:characters";

export function savePreset(appearance) {
  const all = loadPresets();
  const label = appearance.name?.trim() || "Unnamed";
  all[label] = { ...appearance, savedAt: Date.now() };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false; // private browsing, quota, etc. — the caller reports it
  }
}

export function loadPresets() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return Object.fromEntries(Object.entries(saved)
      .map(([name, appearance]) => [name, normaliseWardrobeAppearance(appearance)]));
  } catch {
    return {};
  }
}

export function deletePreset(label) {
  const all = loadPresets();
  delete all[label];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch { /* nothing useful to do */ }
}

/** Remember the character taken into the world, so reload does not lose it. */
export function saveActive(appearance) {
  try {
    localStorage.setItem("unwritten-age:active", JSON.stringify(appearance));
  } catch { /* non-fatal */ }
}

export function loadActive() {
  try {
    const raw = localStorage.getItem("unwritten-age:active");
    return raw ? normaliseWardrobeAppearance({ ...defaultAppearance(), ...JSON.parse(raw) }) : null;
  } catch {
    return null;
  }
}
