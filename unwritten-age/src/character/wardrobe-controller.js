import * as THREE from "three";
import { EQUIPMENT_SLOTS, WARDROBE_BY_ID, appearanceLoadout } from "./wardrobe-catalog.js";

const SLOT_SET = new Set(EQUIPMENT_SLOTS);

/** Coverage test: cell size, search radius, and how far to pull the seam in. */
const COVERAGE_CELL = 0.06;
const COVERAGE_RADIUS = 0.05;
const MASK_EROSION_PASSES = 4;

const cellKey = (x, y, z) => `${Math.floor(x / COVERAGE_CELL)},`
  + `${Math.floor(y / COVERAGE_CELL)},${Math.floor(z / COVERAGE_CELL)}`;

/** Is any garment vertex within `COVERAGE_RADIUS` of this point? */
function nearCloth(grid, x, y, z) {
  if (grid.size === 0) return false;
  const limit = COVERAGE_RADIUS * COVERAGE_RADIUS;
  const cx = Math.floor(x / COVERAGE_CELL);
  const cy = Math.floor(y / COVERAGE_CELL);
  const cz = Math.floor(z / COVERAGE_CELL);
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 3) {
          const ax = bucket[i] - x;
          const ay = bucket[i + 1] - y;
          const az = bucket[i + 2] - z;
          if (ax * ax + ay * ay + az * az < limit) return true;
        }
      }
    }
  }
  return false;
}

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

  /**
   * Hash every active covering garment's vertices into coarse cells.
   *
   * Bone regions alone are far too blunt to mask against: "torso" runs from the
   * waist to the base of the skull, so a sleeveless tunic that hides the torso
   * also punched a hole through the collarbone and neck well above its own
   * neckline. Proximity to the cloth itself respects whatever silhouette the
   * art actually has — necklines, hems, cuffs and all.
   */
  buildCoverageGrid(active) {
    const grid = new Map();
    const regions = new Set();
    for (const itemId of active) {
      const item = WARDROBE_BY_ID.get(itemId);
      if (!item?.hideBodyParts?.length) continue;
      for (const region of item.hideBodyParts) regions.add(region);
      for (const node of this.nodesByItem.get(itemId) ?? []) {
        // Headless equip/suppression tests drive the controller with plain stub
        // nodes; anything without real geometry simply contributes no coverage.
        const position = node.geometry?.attributes?.position;
        if (!position) continue;
        for (let i = 0; i < position.count; i += 1) {
          const x = position.getX(i);
          const y = position.getY(i);
          const z = position.getZ(i);
          const cell = cellKey(x, y, z);
          let bucket = grid.get(cell);
          if (!bucket) grid.set(cell, bucket = []);
          bucket.push(x, y, z);
        }
      }
    }
    return { grid, regions };
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
    this.bodyMasks.push({ node, original, regions, height: geometry.attributes.position });
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
    const { grid, regions: hidden } = this.buildCoverageGrid(active);

    for (const { node, original, regions, height } of this.bodyMasks) {
      let covered = new Uint8Array(regions.length);
      for (let vertex = 0; vertex < regions.length; vertex += 1) {
        if (!hidden.has(regions[vertex])) continue;
        const x = height.getX(vertex);
        const y = height.getY(vertex);
        const z = height.getZ(vertex);
        covered[vertex] = nearCloth(grid, x, y, z) ? 1 : 0;
      }

      // Pull the boundary inward. Cloth sits a few millimetres off the skin, so
      // proximity alone puts the cut right at the hem and the seam shows as a
      // torn dark fringe. Releasing every rim vertex a few times over moves the
      // cut safely under the garment, whatever shape its edge is.
      for (let pass = 0; pass < MASK_EROSION_PASSES; pass += 1) {
        const next = covered.slice();
        for (let i = 0; i < original.length; i += 3) {
          const a = original[i];
          const b = original[i + 1];
          const c = original[i + 2];
          if (covered[a] && covered[b] && covered[c]) continue;
          next[a] = 0; next[b] = 0; next[c] = 0;
        }
        covered = next;
      }

      const kept = [];
      for (let i = 0; i < original.length; i += 3) {
        const a = original[i];
        const b = original[i + 1];
        const c = original[i + 2];
        if (!(covered[a] && covered[b] && covered[c])) kept.push(a, b, c);
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
