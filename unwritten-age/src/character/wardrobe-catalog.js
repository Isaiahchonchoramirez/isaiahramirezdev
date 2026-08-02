/** Production wardrobe data. Rendering code consumes this catalog; it does not
 * know individual garment names. Assets are embedded in each body GLB today,
 * but the same records can point at external GLBs later. */

export const SKELETON_STANDARD = "unwritten_humanoid_v1";

export const EQUIPMENT_SLOTS = Object.freeze([
  "baseBody", "hair", "facialHair", "torsoInner", "torsoOuter",
  "lowerBody", "feet", "hands", "headwear", "shoulders", "back",
  "waist", "accessory", "weapon",
]);

export const BODY_REGIONS = Object.freeze([
  "head", "neck", "torso", "pelvis",
  "upperArmLeft", "upperArmRight", "lowerArmLeft", "lowerArmRight",
  "handLeft", "handRight", "upperLegLeft", "upperLegRight",
  "lowerLegLeft", "lowerLegRight", "footLeft", "footRight",
]);

export const SUPPORTED_BODY_MORPHS = Object.freeze([
  "bodyMass", "muscularity", "chest", "waist", "hipWidth",
  "shoulderWidth", "armSize", "legSize", "height",
]);

const wearable = (record) => Object.freeze({
  asset: "embedded-character-glb",
  skeletonStandard: SKELETON_STANDARD,
  bodyProfiles: ["female", "male", "neutral"],
  supportsMorphs: [],
  supportsBodyControls: SUPPORTED_BODY_MORPHS,
  fitStrategy: "sharedSkeleton",
  hideBodyParts: [],
  incompatibleItems: [],
  suppressesSlots: [],
  physicsProfile: "none",
  headwearCompatibility: "none",
  enabled: true,
  ...record,
});

export const WARDROBE_ITEMS = Object.freeze([
  wearable({ id: "woven_tunic", label: "Woven tunic", slots: ["torsoInner"],
    node: { slot: "torso", variant: "tunic" },
    hideBodyParts: ["torso"], physicsProfile: "skinned_fitted" }),
  wearable({ id: "layered_hide_armor", label: "Layered hide armor", slots: ["torsoOuter"],
    node: { slot: "torso", variant: "hide-armor" },
    hideBodyParts: ["torso"], physicsProfile: "skinned_rigid" }),
  wearable({ id: "pleated_wrap", label: "Pleated wrap", slots: ["lowerBody"],
    node: { slot: "lower", variant: "wrap" },
    hideBodyParts: ["pelvis", "upperLegLeft", "upperLegRight"], physicsProfile: "short_wrap" }),
  wearable({ id: "long_ritual_robe", label: "Long ritual robe", slots: ["lowerBody"],
    node: { slot: "lower", variant: "robe" },
    hideBodyParts: ["pelvis", "upperLegLeft", "upperLegRight", "lowerLegLeft", "lowerLegRight"],
    suppressesSlots: ["feet"], physicsProfile: "long_robe" }),
  wearable({ id: "fur_calf_wraps", label: "Fur calf wraps", slots: ["feet"],
    node: { slot: "feet", variant: "fur-boots" },
    hideBodyParts: ["lowerLegLeft", "lowerLegRight"], physicsProfile: "skinned_fitted" }),
  wearable({ id: "shoulder_mantle", label: "Shoulder mantle", slots: ["shoulders", "back"],
    node: { slot: "mantle", variant: "shoulder-mantle" },
    hideBodyParts: [], physicsProfile: "short_mantle" }),
  wearable({ id: "fibre_belt", label: "Fibre belt", slots: ["waist"],
    node: { slot: "waist", variant: "fibre-belt" }, physicsProfile: "skinned_rigid" }),

  wearable({ id: "hair_close_crop", label: "Close-cropped", slots: ["hair"],
    node: { slot: "hair", variant: "close-crop" }, headwearCompatibility: "close" }),
  wearable({ id: "hair_coiled", label: "Coiled / tightly curled", slots: ["hair"],
    node: { slot: "hair", variant: "coiled-crown" }, headwearCompatibility: "open" }),
  wearable({ id: "hair_shoulder_natural", label: "Shoulder-length natural", slots: ["hair"],
    node: { slot: "hair", variant: "long-loose" }, headwearCompatibility: "none" }),
  wearable({ id: "hair_single_braid", label: "Single braid", slots: ["hair"],
    node: { slot: "hair", variant: "long-braid" }, headwearCompatibility: "open",
    physicsProfile: "restrained_braid" }),
  wearable({ id: "hair_pulled_back", label: "Pulled back", slots: ["hair"],
    node: { slot: "hair", variant: "ponytail" }, headwearCompatibility: "open",
    physicsProfile: "restrained_tie" }),
]);

export const WARDROBE_BY_ID = new Map(WARDROBE_ITEMS.map((item) => [item.id, item]));

export const OUTFIT_PRESETS = Object.freeze([
  { id: "veyr_hunter", label: "Veyr Hunter", items: ["woven_tunic", "pleated_wrap", "fibre_belt", "fur_calf_wraps"] },
  { id: "veyr_spiritwalker", label: "Veyr Spiritwalker", items: ["woven_tunic", "pleated_wrap", "shoulder_mantle", "fibre_belt"] },
  { id: "aurean_keeper", label: "Aurean Keeper", items: ["woven_tunic", "long_ritual_robe", "fibre_belt"] },
  { id: "ember_elder", label: "Ember Elder", items: ["layered_hide_armor", "pleated_wrap", "shoulder_mantle", "fibre_belt"] },
  { id: "base_testing", label: "Unclothed / Base Testing", items: [] },
]);

export const OUTFIT_PRESET_BY_ID = new Map(OUTFIT_PRESETS.map((preset) => [preset.id, preset]));

export const HAIR_OPTIONS = Object.freeze([
  { id: "bald", name: "Bald / shaved" },
  ...WARDROBE_ITEMS.filter((item) => item.slots.includes("hair") && item.enabled)
    .map((item) => ({ id: item.id, name: item.label })),
]);

export function appearanceLoadout(appearance) {
  const torso = { tunic: "woven_tunic", "hide-armor": "layered_hide_armor", none: null };
  const lower = { wrap: "pleated_wrap", loincloth: "pleated_wrap", robe: "long_ritual_robe", none: null };
  const feet = { "fur-boots": "fur_calf_wraps", bare: null, none: null };
  const mantle = { "shoulder-mantle": "shoulder_mantle", none: null };
  const legacyHair = {
    "close-crop": "hair_close_crop", cropped: "hair_close_crop",
    "short-tousled": "hair_close_crop", "short-swept": "hair_close_crop",
    "coiled-crown": "hair_coiled", "long-loose": "hair_shoulder_natural",
    "long-braid": "hair_single_braid", ponytail: "hair_pulled_back",
  };
  const hair = appearance.hairStyle === "bald" ? null
    : (WARDROBE_BY_ID.has(appearance.hairStyle) ? appearance.hairStyle : legacyHair[appearance.hairStyle]);
  const items = [torso[appearance.torsoGarment], lower[appearance.lowerGarment],
    feet[appearance.footwear], mantle[appearance.mantle], hair];
  if (lower[appearance.lowerGarment]) items.push("fibre_belt");
  return items.filter(Boolean);
}

export function applyOutfitPresetToAppearance(appearance, presetId) {
  const preset = OUTFIT_PRESET_BY_ID.get(presetId);
  if (!preset) return { ...appearance };
  const has = (id) => preset.items.includes(id);
  return {
    ...appearance,
    outfitPreset: presetId,
    torsoGarment: has("layered_hide_armor") ? "hide-armor" : has("woven_tunic") ? "tunic" : "none",
    lowerGarment: has("long_ritual_robe") ? "robe" : has("pleated_wrap") ? "wrap" : "none",
    mantle: has("shoulder_mantle") ? "shoulder-mantle" : "none",
    footwear: has("fur_calf_wraps") ? "fur-boots" : "bare",
  };
}

export function normaliseWardrobeAppearance(appearance) {
  const next = { ...appearance };
  const validHair = new Set(HAIR_OPTIONS.map((option) => option.id));
  if (!validHair.has(next.hairStyle)) {
    next.hairStyle = {
      cropped: "hair_close_crop", "close-crop": "hair_close_crop",
      "short-tousled": "hair_close_crop", "short-swept": "hair_close_crop",
      "coiled-crown": "hair_coiled", "long-loose": "hair_shoulder_natural",
      "long-braid": "hair_single_braid", ponytail: "hair_pulled_back",
    }[next.hairStyle] ?? "hair_close_crop";
  }
  if (!["none", "tunic", "hide-armor"].includes(next.torsoGarment)) next.torsoGarment = "tunic";
  if (next.lowerGarment === "loincloth") next.lowerGarment = "wrap";
  if (!["none", "wrap", "robe"].includes(next.lowerGarment)) next.lowerGarment = "wrap";
  if (!["none", "shoulder-mantle"].includes(next.mantle)) next.mantle = "none";
  if (!["bare", "fur-boots"].includes(next.footwear)) next.footwear = "bare";
  return next;
}

export function validateWardrobeCatalog() {
  const errors = [];
  const slots = new Set(EQUIPMENT_SLOTS);
  const regions = new Set(BODY_REGIONS);
  const ids = new Set();
  for (const item of WARDROBE_ITEMS) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate item id`);
    ids.add(item.id);
    for (const slot of item.slots) if (!slots.has(slot)) errors.push(`${item.id}: invalid slot ${slot}`);
    for (const region of item.hideBodyParts) if (!regions.has(region)) errors.push(`${item.id}: invalid body region ${region}`);
    if (!item.asset) errors.push(`${item.id}: missing asset`);
    if (!item.skeletonStandard) errors.push(`${item.id}: missing skeleton standard`);
    if (!item.node) errors.push(`${item.id}: missing explicit node binding`);
  }
  return errors;
}
