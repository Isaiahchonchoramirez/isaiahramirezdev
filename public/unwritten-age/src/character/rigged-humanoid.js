import * as THREE from "three";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";
import { Humanoid } from "./humanoid.js";

const MODEL_FILES = {
  "veyr-hunter": "veyr-hunter.glb",
  "aurean-keeper": "aurean-keeper.glb",
  "ember-elder": "ember-elder.glb",
};

const cache = new Map();
const loader = new GLTFLoader();

function loadModel(id) {
  if (!cache.has(id)) {
    const file = MODEL_FILES[id] ?? MODEL_FILES["veyr-hunter"];
    const url = new URL(`../../assets/characters/${file}`, import.meta.url).href;
    cache.set(id, loader.loadAsync(url));
  }
  return cache.get(id);
}

/**
 * Real MPFB human used in the world. The old procedural humanoid remains visible
 * only while the GLB downloads or if WebGL cannot load it, so a slow connection
 * never leaves the player invisible.
 */
export class RiggedHumanoid {
  constructor(appearance) {
    this.root = new THREE.Group();
    this.root.name = "rigged-humanoid-root";
    this.fallback = new Humanoid(appearance);
    this.root.add(this.fallback.root);
    this.model = null;
    this.bones = {};
    this.phase = 0;
    this.currentModel = null;
    this.setAppearance(appearance);
  }

  setAppearance(appearance) {
    this.appearance = appearance;
    this.fallback?.setAppearance(appearance);
    this.totalHeight = appearance.height ?? 1.74;
    this.headHeight = this.totalHeight * 0.93;
    this.capsule = { radius: 0.32, height: this.totalHeight };
    const modelId = appearance.bodyBase ?? (appearance.culture === "aurean" ? "aurean-keeper" : "veyr-hunter");
    if (modelId === this.currentModel) return;
    this.currentModel = modelId;
    const requestId = modelId;
    loadModel(modelId).then((gltf) => {
      if (requestId !== this.currentModel) return;
      this.model?.removeFromParent();
      this.model = cloneSkeleton(gltf.scene);
      this.model.name = `${modelId}-instance`;
      this.model.traverse((node) => {
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.frustumCulled = false;
        }
        if (node.isBone) this.bones[node.name] = node;
      });
      // MPFB exports at metre scale. Match the chosen height without distorting
      // individual body regions; detailed morphs remain authored in Blender.
      const bounds = new THREE.Box3().setFromObject(this.model);
      const sourceHeight = Math.max(0.01, bounds.max.y - bounds.min.y);
      this.model.scale.setScalar(this.totalHeight / sourceHeight);
      this.model.position.y = -bounds.min.y * this.model.scale.y;
      this.root.add(this.model);
      this.fallback.root.visible = false;
    }).catch((error) => console.warn(`Could not load MPFB body ${modelId}`, error));
  }

  animate(dt, gait = 0) {
    if (!this.model) {
      this.fallback.animate(dt, gait);
      return;
    }
    this.phase += dt * (2.2 + gait * 6.2);
    const swing = Math.sin(this.phase) * gait;
    const breathe = Math.sin(this.phase * 0.22) * 0.018;
    const setX = (name, value) => { if (this.bones[name]) this.bones[name].rotation.x = value; };
    setX("thigh_l", swing * 0.58);
    setX("thigh_r", -swing * 0.58);
    setX("calf_l", Math.max(0, -swing) * 0.55);
    setX("calf_r", Math.max(0, swing) * 0.55);
    setX("upperarm_l", -swing * 0.42);
    setX("upperarm_r", swing * 0.42);
    if (this.bones.spine_03) this.bones.spine_03.rotation.x = breathe;
    this.root.position.y = Math.abs(Math.sin(this.phase * 2)) * 0.018 * gait;
  }
}
