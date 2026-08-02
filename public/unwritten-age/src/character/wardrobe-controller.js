import * as THREE from "three";
import { EQUIPMENT_SLOTS, WARDROBE_BY_ID, appearanceLoadout } from "./wardrobe-catalog.js";

const SLOT_SET = new Set(EQUIPMENT_SLOTS);

function regionForBone(name = "") {
  const side = name.endsWith("_l") ? "Left" : name.endsWith("_r") ? "Right" : "";
  if (name === "head") return "head";
  if (name.startsWith("neck")) return "neck";
  if (name === "pelvis") return "pelvis";
  if (name.startsWith("spine") || name.startsWith("clavicle")) return "torso";
  if (name.startsWith("upperarm")) return `upperArm${side}`;
  if (name.startsWith("lowerarm")) return `lowerArm${side}`;
  if (/^(hand|thumb|index|middle|ring|pinky)/.test(name)) return `hand${side}`;
  if (name.startsWith("thigh")) return `upperLeg${side}`;
  if (name.startsWith("calf")) return `lowerLeg${side}`;
  if (name.startsWith("foot") || name.startsWith("toe")) return `foot${side}`;
  return null;
}

/** One authority for embedded modular equipment and non-destructive body masks. */
export class WardrobeController {
  constructor(model, { debug = false } = {}) {
    this.model = model;
    this.debug = debug;
    this.equipped = new Map();
    this.nodesByItem = new Map();
    this.bodyMasks = [];
    this.discover();
  }

  discover() {
    for (const item of WARDROBE_BY_ID.values()) this.nodesByItem.set(item.id, []);
    this.model.traverse((node) => {
      if (node.userData?.role === "skin" && node.isSkinnedMesh) this.registerBody(node);
      const slot = node.userData?.slot;
      const variant = node.userData?.variant;
      if (!slot || !variant) return;
      node.visible = false;
      for (const item of WARDROBE_BY_ID.values()) {
        if (item.node?.slot === slot && item.node?.variant === variant) {
          this.nodesByItem.get(item.id).push(node);
          node.userData.wardrobeItemId = item.id;
        }
      }
    });
    if (this.debug) this.inspect();
  }

  registerBody(node) {
    const geometry = node.geometry;
    if (!geometry.index || !geometry.attributes.skinIndex || !node.skeleton) return;
    const original = new geometry.index.array.constructor(geometry.index.array);
    const regions = new Array(geometry.attributes.position.count);
    const skinIndex = geometry.attributes.skinIndex;
    const skinWeight = geometry.attributes.skinWeight;
    const component = (attribute, index, lane) => [attribute.getX(index), attribute.getY(index),
      attribute.getZ(index), attribute.getW(index)][lane];
    for (let vertex = 0; vertex < regions.length; vertex += 1) {
      let best = 0;
      for (let lane = 1; lane < 4; lane += 1) {
        if (component(skinWeight, vertex, lane) > component(skinWeight, vertex, best)) best = lane;
      }
      const bone = node.skeleton.bones[component(skinIndex, vertex, best)];
      regions[vertex] = regionForBone(bone?.name);
    }
    this.bodyMasks.push({ node, original, regions });
  }

  unequipSlot(slot, refresh = true) {
    const itemId = this.equipped.get(slot);
    if (!itemId) return;
    const item = WARDROBE_BY_ID.get(itemId);
    for (const claimed of item?.slots ?? [slot]) {
      if (this.equipped.get(claimed) === itemId) this.equipped.delete(claimed);
    }
    if (refresh) this.refresh();
  }

  equipItem(slot, itemId, refresh = true) {
    if (!SLOT_SET.has(slot)) throw new Error(`Invalid wardrobe slot: ${slot}`);
    if (!itemId) { this.unequipSlot(slot, refresh); return true; }
    const item = WARDROBE_BY_ID.get(itemId);
    if (!item?.enabled || !item.slots.includes(slot)) return false;
    for (const activeId of new Set(this.equipped.values())) {
      const active = WARDROBE_BY_ID.get(activeId);
      if (active?.suppressesSlots?.some((blocked) => item.slots.includes(blocked))
          || active?.incompatibleItems?.includes(itemId)
          || item.incompatibleItems?.includes(activeId)) return false;
    }
    for (const claimed of item.slots) this.unequipSlot(claimed, false);
    for (const claimed of item.slots) this.equipped.set(claimed, itemId);
    for (const suppressed of item.suppressesSlots) this.unequipSlot(suppressed, false);
    if (refresh) this.refresh();
    return true;
  }

  clearAll(refresh = true) {
    this.equipped.clear();
    if (refresh) this.refresh();
  }

  applyAppearance(appearance) {
    this.clearAll(false);
    for (const itemId of appearanceLoadout(appearance)) {
      const item = WARDROBE_BY_ID.get(itemId);
      if (item) this.equipItem(item.slots[0], itemId, false);
    }
    this.refresh();
  }

  refresh() {
    const active = new Set(this.equipped.values());
    for (const [itemId, nodes] of this.nodesByItem) {
      const visible = active.has(itemId);
      for (const node of nodes) node.visible = visible;
    }
    this.recalculateBodyMask(active);
  }

  recalculateBodyMask(active) {
    const hidden = new Set();
    for (const itemId of active) {
      for (const region of WARDROBE_BY_ID.get(itemId)?.hideBodyParts ?? []) hidden.add(region);
    }
    for (const { node, original, regions } of this.bodyMasks) {
      const kept = [];
      for (let i = 0; i < original.length; i += 3) {
        const votes = [regions[original[i]], regions[original[i + 1]], regions[original[i + 2]]]
          .filter((region) => region && hidden.has(region)).length;
        if (votes < 2) kept.push(original[i], original[i + 1], original[i + 2]);
      }
      node.geometry.setIndex(kept);
      node.geometry.index.needsUpdate = true;
      node.geometry.computeBoundingSphere();
    }
  }

  applySharedMorphs(appearance) {
    const values = {
      bodyMass: appearance.build, muscularity: appearance.muscularity,
      chest: appearance.chestWidth, waist: appearance.waistWidth,
      hipWidth: appearance.hipWidth, shoulderWidth: appearance.shoulderWidth,
      armSize: appearance.armThickness, legSize: appearance.legThickness,
    };
    for (const itemId of new Set(this.equipped.values())) {
      for (const node of this.nodesByItem.get(itemId) ?? []) {
        if (!node.morphTargetDictionary || !node.morphTargetInfluences) continue;
        for (const [name, raw] of Object.entries(values)) {
          const index = node.morphTargetDictionary[name];
          if (index !== undefined) node.morphTargetInfluences[index] = ((raw ?? 0.5) - 0.5) * 2;
        }
      }
    }
  }

  inspect() {
    const rows = [];
    this.model.traverse((node) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      const itemId = node.userData?.wardrobeItemId;
      const item = WARDROBE_BY_ID.get(itemId);
      rows.push({
        node: node.name, type: node.isSkinnedMesh ? "SkinnedMesh" : "Mesh",
        parent: node.parent?.name ?? "", skeleton: node.skeleton?.uuid ?? "",
        visible: node.visible, slot: node.userData?.slot ?? "",
        item: itemId ?? "", source: node.userData?.MPFB_GEN_asset_source ?? "embedded",
        bodyMask: (item?.hideBodyParts ?? []).join(","),
        active: item?.slots.some((slot) => this.equipped.get(slot) === itemId) ?? false,
      });
    });
    console.table(rows);
    return rows;
  }
}
