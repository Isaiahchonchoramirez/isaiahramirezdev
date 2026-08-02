import assert from "node:assert/strict";
import * as THREE from "three";
import { WARDROBE_BY_ID } from "../public/unwritten-age/src/character/wardrobe-catalog.js";
import { WardrobeController } from "../public/unwritten-age/src/character/wardrobe-controller.js";

const scene = new THREE.Group();
for (const item of WARDROBE_BY_ID.values()) {
  const node = new THREE.Object3D();
  node.name = `test-${item.id}`;
  node.userData = { ...item.node };
  scene.add(node);
}
const controller = new WardrobeController(scene);

controller.applyAppearance({
  torsoGarment: "tunic", lowerGarment: "robe", footwear: "fur-boots",
  mantle: "shoulder-mantle", hairStyle: "hair_single_braid",
});
assert.equal(controller.equipped.get("lowerBody"), "long_ritual_robe");
assert.equal(controller.equipped.has("feet"), false, "long robe must suppress calf wraps");
assert.equal(controller.equipped.get("shoulders"), "shoulder_mantle");
assert.equal(controller.equipped.get("back"), "shoulder_mantle");
assert.equal(controller.equipped.get("hair"), "hair_single_braid");

controller.applyAppearance({
  torsoGarment: "tunic", lowerGarment: "wrap", footwear: "fur-boots",
  mantle: "none", hairStyle: "bald",
});
assert.equal(controller.equipped.get("lowerBody"), "pleated_wrap");
assert.equal(controller.equipped.get("feet"), "fur_calf_wraps");
assert.equal(controller.equipped.has("back"), false);
assert.equal(controller.equipped.has("hair"), false);

const visibleLower = [...WARDROBE_BY_ID.values()].filter((item) => item.slots.includes("lowerBody"))
  .flatMap((item) => controller.nodesByItem.get(item.id)).filter((node) => node.visible);
assert.equal(visibleLower.length, 1, "exactly one lower-body item may be visible");
controller.equipItem("lowerBody", "pleated_wrap");
assert.equal(visibleLower[0].parent, scene, "repeated equip must not attach a duplicate node");

controller.clearAll();
assert.equal([...controller.nodesByItem.values()].flat().some((node) => node.visible), false);
console.log("Wardrobe runtime tests passed: exclusivity, suppression, multi-slot claims, bald/none, repeat safety.");
