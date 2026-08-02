import fs from "node:fs";
import path from "node:path";
import {
  EQUIPMENT_SLOTS, OUTFIT_PRESETS, WARDROBE_BY_ID, validateWardrobeCatalog,
} from "../public/unwritten-age/src/character/wardrobe-catalog.js";

const root = path.resolve(import.meta.dirname, "..");
const characterDir = path.join(root, "public/unwritten-age/assets/characters");
const files = ["veyr-hunter.glb", "aurean-keeper.glb", "ember-elder.glb"];
const requiredBones = ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "head",
  "upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r", "hand_l", "hand_r",
  "thigh_l", "thigh_r", "calf_l", "calf_r", "foot_l", "foot_r"];
const errors = validateWardrobeCatalog();

function readGlbJson(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString("utf8", 0, 4) !== "glTF") throw new Error(`${file}: not a GLB`);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString().replace(/\0+$/, ""));
}

for (const filename of files) {
  const file = path.join(characterDir, filename);
  if (!fs.existsSync(file)) { errors.push(`${filename}: missing asset path`); continue; }
  const gltf = readGlbJson(file);
  const nodes = gltf.nodes ?? [];
  const names = new Set(nodes.map((node) => node.name));
  if ((gltf.skins?.length ?? 0) !== 1) errors.push(`${filename}: expected 1 armature/skin, found ${gltf.skins?.length ?? 0}`);
  for (const bone of requiredBones) if (!names.has(bone)) errors.push(`${filename}: missing required bone ${bone}`);
  const body = nodes.filter((node) => node.extras?.role === "skin");
  if (body.length !== 1) errors.push(`${filename}: expected 1 base body, found ${body.length}`);
  for (const item of WARDROBE_BY_ID.values()) {
    const matches = nodes.filter((node) => node.extras?.slot === item.node.slot
      && node.extras?.variant === item.node.variant);
    if (!matches.length) errors.push(`${filename}: ${item.id} has no node for ${item.node.slot}/${item.node.variant}`);
    if (matches.some((node) => node.skin === undefined)) errors.push(`${filename}: ${item.id} has a node without the canonical skin binding`);
  }
  const bindings = new Map();
  for (const node of nodes.filter((candidate) => candidate.extras?.slot && candidate.extras?.variant)) {
    const key = `${node.extras.slot}/${node.extras.variant}/${node.name}`;
    if (bindings.has(key)) errors.push(`${filename}: duplicate scene attachment ${key}`);
    bindings.set(key, node);
  }
  console.log(`${filename}: ${nodes.length} nodes, ${gltf.meshes?.length ?? 0} meshes, ${gltf.skins?.length ?? 0} skin`);
}

for (const preset of OUTFIT_PRESETS) {
  const occupied = new Map();
  for (const itemId of preset.items) {
    const item = WARDROBE_BY_ID.get(itemId);
    if (!item) { errors.push(`${preset.id}: references removed item ${itemId}`); continue; }
    for (const slot of item.slots) {
      if (!EQUIPMENT_SLOTS.includes(slot)) errors.push(`${preset.id}: invalid slot ${slot}`);
      if (occupied.has(slot)) errors.push(`${preset.id}: ${occupied.get(slot)} and ${itemId} both claim ${slot}`);
      occupied.set(slot, itemId);
    }
  }
}

if (errors.length) {
  console.error(`Wardrobe validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Wardrobe validation passed: ${WARDROBE_BY_ID.size} items, ${OUTFIT_PRESETS.length} presets.`);
}
