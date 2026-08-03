import * as THREE from "three";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";
import { Humanoid } from "./humanoid.js";
import { EYE_COLOURS, HAIR_COLOURS, SKIN_TONES } from "./appearance.js";
import { WardrobeController } from "./wardrobe-controller.js";
import { WARDROBE_BY_ID } from "./wardrobe-catalog.js";

const MODEL_FILES = {
  "veyr-hunter": "veyr-hunter.glb",
  "aurean-keeper": "aurean-keeper.glb",
  "ember-elder": "ember-elder.glb",
};
// GitHub Pages gives immutable-looking asset URLs a browser cache lifetime.
// Bump this whenever the generated GLBs change so body/sex switches cannot
// silently reuse an older character file from a previous deployment.
const MODEL_REVISION = "2026-08-02-sexed-bodies-and-body-morphs-v1";

const cache = new Map();
const loader = new GLTFLoader();

// Scratch values for the per-bone maths in `swing`, so a frame of animation
// allocates nothing.
const BODY_X = new THREE.Vector3(1, 0, 0);
const PARENT_Q = new THREE.Quaternion();
const PARENT_IN_BODY = new THREE.Quaternion();
const WANTED_Q = new THREE.Quaternion();

// Cloth collision scratch, so a frame of solving allocates nothing.
const BIND_FORWARD = new THREE.Matrix4();
const BIND_INVERSE = new THREE.Matrix4();
const BIND_BONE = new THREE.Matrix4();
const SCALE_V = new THREE.Vector3();
const COLLIDE_A = new THREE.Vector3();
const COLLIDE_B = new THREE.Vector3();
const COLLIDE_P = new THREE.Vector3();
const COLLIDE_AXIS = new THREE.Vector3();
const COLLIDE_CLOSEST = new THREE.Vector3();

/** Leg thickness the cloth collides against, as a fraction of body height. */
const LEG_RADIUS = 0.034;
/** Relaxation passes after collision, and how hard edges pull back to length. */
const CLOTH_RELAX_PASSES = 2;
const CLOTH_STIFFNESS = 0.8;

/**
 * MPFB's skins ship an alpha channel they never use, so glTF marks them BLEND.
 * Three then draws the body in the transparent pass with `depthWrite` off,
 * which sorts skin over clothing and makes eyes, teeth and lashes punch through
 * the face. A material that is fully opaque and has no alpha map is opaque.
 *
 * The generator now exports these correctly; this keeps already-published
 * bodies right without forcing a re-export of every .glb.
 */
function forceOpaque(material) {
  if (!material.transparent || material.opacity < 1 || material.alphaMap) return;
  material.transparent = false;
  material.depthWrite = true;
  material.needsUpdate = true;
}

/**
 * Unique edges of a garment, with their authored lengths.
 *
 * These are the distance constraints the relaxation pass solves. Vertices in
 * the top `anchor` of the garment are marked pinned: that is the belted band
 * held against the waist, and letting collisions drag it around would pull the
 * whole skirt off the hips.
 */
function buildClothEdges(geometry, anchor) {
  const index = geometry.index;
  const position = geometry.attributes.position;
  if (!index) return [];
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const span = Math.max(1e-6, max.y - min.y);
  const pinned = (v) => (max.y - position.getY(v)) / span < anchor;

  const seen = new Set();
  const edges = [];
  const add = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    const dx = position.getX(a) - position.getX(b);
    const dy = position.getY(a) - position.getY(b);
    const dz = position.getZ(a) - position.getZ(b);
    edges.push({ a, b, rest: Math.hypot(dx, dy, dz), pinnedA: pinned(a), pinnedB: pinned(b) });
  };
  for (let i = 0; i < index.count; i += 3) {
    const x = index.getX(i);
    const y = index.getX(i + 1);
    const z = index.getX(i + 2);
    add(x, y); add(y, z); add(z, x);
  }
  return edges;
}

function loadModel(id) {
  if (!cache.has(id)) {
    const file = MODEL_FILES[id] ?? MODEL_FILES["veyr-hunter"];
    const asset = new URL(`../../assets/characters/${file}`, import.meta.url);
    asset.searchParams.set("v", MODEL_REVISION);
    const url = asset.href;
    cache.set(id, loader.loadAsync(url));
  }
  return cache.get(id);
}

/**
 * Fetch the bodies the player has not asked for yet, one at a time.
 *
 * The three bodies are genuinely different meshes, so switching Body sex used
 * to mean waiting on a ~12 MB download with the stand-in on screen. Warming
 * them once the chosen body is already up costs the player nothing — the first
 * body still has the connection to itself — and makes every later switch
 * instant. Sequential on purpose: three parallel downloads would just compete.
 */
function preloadOtherBodies(activeId) {
  const queue = Object.keys(MODEL_FILES).filter((id) => id !== activeId && !cache.has(id));
  const next = () => {
    const id = queue.shift();
    if (!id) return;
    loadModel(id).then(next, next);
  };
  // Off the critical path: let the active body finish decoding and present a
  // frame before competing for bandwidth.
  if (typeof requestIdleCallback === "function") requestIdleCallback(next, { timeout: 2000 });
  else setTimeout(next, 400);
}

/**
 * Real MPFB human used in the world. The old procedural humanoid remains visible
 * only while the GLB downloads or if WebGL cannot load it, so a slow connection
 * never leaves the player invisible.
 *
 * The character creator renders this same class, so what is sculpted on the
 * turntable is the body that walks into the valley. `onModelChange` fires once
 * the real body has replaced the stand-in, which is how the creator knows to
 * drop its loading note.
 */
export class RiggedHumanoid {
  constructor(appearance, { onModelChange } = {}) {
    this.root = new THREE.Group();
    this.root.name = "rigged-humanoid-root";
    this.onModelChange = onModelChange;
    this.fallback = new Humanoid(appearance);
    this.root.add(this.fallback.root);
    this.model = null;
    this.bones = {};
    this.restPose = {};
    this.clothPieces = [];
    this.equipmentPieces = [];
    this.wardrobe = null;
    this.loadVersion = 0;
    this.bodyQuat = new THREE.Quaternion();
    this.legColliders = [];
    this.phase = 0;
    this.windPhase = Math.random() * Math.PI * 2;
    this.currentModel = null;
    this.sourceHeight = 0;
    this.sourceFloor = 0;
    this.setAppearance(appearance);
  }

  setAppearance(appearance) {
    this.appearance = appearance;
    this.fallback?.setAppearance(appearance);
    this.totalHeight = appearance.height ?? 1.74;
    this.headHeight = this.totalHeight * 0.93;
    this.capsule = { radius: 0.32, height: this.totalHeight };
    const sexModels = { male: "veyr-hunter", female: "aurean-keeper", androgynous: "ember-elder" };
    const modelId = sexModels[appearance.bodySex] ?? appearance.bodyBase
      ?? (appearance.culture === "aurean" ? "aurean-keeper" : "veyr-hunter");

    if (modelId === this.currentModel) {
      // Same body, new measurements — apply what the loaded mesh can honour
      // without waiting for a reload that will never come.
      this.applyHeight();
      this.applySurface(appearance);
      this.applyProportions(appearance);
      this.applyFaceMorphs(appearance);
      this.applyEquipment(appearance);
      return;
    }

    this.currentModel = modelId;
    const requestId = ++this.loadVersion;
    loadModel(modelId).then((gltf) => {
      if (requestId !== this.loadVersion || modelId !== this.currentModel) return;
      this.model?.removeFromParent();
      this.bones = {};
      this.clothPieces = [];
      this.equipmentPieces = [];
      this.wardrobe = null;
      this.model = cloneSkeleton(gltf.scene);
      this.model.name = `${modelId}-instance`;
      this.model.traverse((node) => {
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.frustumCulled = false;
          // SkeletonUtils.clone shares materials with the cached glTF, so two
          // characters would recolour each other. Give every instance its own.
          node.material = Array.isArray(node.material)
            ? node.material.map((m) => m.clone())
            : node.material.clone();
          (Array.isArray(node.material) ? node.material : [node.material]).forEach(forceOpaque);
          if (node.userData?.role === "skin") node.geometry = node.geometry.clone();
        }
        if (node.isBone) {
          this.bones[node.name] = node;
          // The pose we animate away from. Without it every gait value is an
          // absolute rotation and "standing still" means "every bone at zero",
          // which is not the rest pose of an MPFB rig.
          this.restPose[node.name] = node.quaternion.clone();
        }
        if (node.userData?.role === "garment-flow") {
          node.geometry = node.geometry.clone();
          const position = node.geometry.attributes.position;
          this.clothPieces.push({
            node,
            rest: node.quaternion.clone(),
            flow: Number(node.userData.flow) || 0.04,
            anchor: Number(node.userData.cloth_anchor) || 0.18,
            basePositions: new Float32Array(position.array),
            // The shape as authored. Re-fitting always starts from this, so
            // dragging a slider back and forth cannot ratchet the hem wider.
            authored: new Float32Array(position.array),
            edges: buildClothEdges(node.geometry, Number(node.userData.cloth_anchor) || 0.18),
          });
        }
        if (node.userData?.slot && node.userData?.variant) {
          this.equipmentPieces.push(node);
        }
      });
      // MPFB exports at metre scale. Measure the bind pose once, then match the
      // chosen height without distorting individual body regions; detailed
      // morphs remain authored in Blender.
      const bounds = new THREE.Box3().setFromObject(this.model);
      this.sourceHeight = Math.max(0.01, bounds.max.y - bounds.min.y);
      this.sourceFloor = bounds.min.y;
      this.wardrobe = new WardrobeController(this.model, {
        debug: new URLSearchParams(location.search).get("wardrobeDebug") === "1",
      });
      this.applyHeight();
      this.applySurface(this.appearance);
      this.applyProportions(this.appearance);
      this.applyFaceMorphs(this.appearance);
      this.applyEquipment(this.appearance);
      this.root.add(this.model);
      // The primitive stand-in has its own synthetic hair. Removing it rather
      // than merely hiding it guarantees it can never layer over MPFB hair.
      this.fallback?.root.removeFromParent();
      this.fallback = null;
      this.onModelChange?.(modelId);
      preloadOtherBodies(modelId);
    }).catch((error) => console.warn(`Could not load MPFB body ${modelId}`, error));
  }

  /**
   * Recolour the body from the appearance record.
   *
   * The skin, hair and eye maps are full-colour textures, so a tint multiplies
   * rather than replaces. Dividing by the texture's rough mid-tone keeps the
   * chosen swatch honest: pick the middle skin tone and you get the body as
   * authored, pick a darker one and it darkens from there, instead of every
   * choice compounding with the map and coming out near-black.
   */
  applySurface(appearance) {
    if (!this.model) return;
    // Ceiling on the brightening: pushing a dark hair map up to a pale blonde
    // is a multiply either way, and without a limit the light end of every
    // palette clips to flat white and loses the strands.
    const tint = (target, hex, midpoint) => {
      target.set(hex);
      target.setRGB(
        Math.min(1.6, target.r / midpoint),
        Math.min(1.6, target.g / midpoint),
        Math.min(1.6, target.b / midpoint),
      );
    };
    this.model.traverse((node) => {
      if (!node.isMesh) return;
      const role = node.userData?.role;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (!material?.color) return;
      if (role === "skin") {
        tint(material.color, SKIN_TONES[appearance.skinTone] ?? SKIN_TONES[4], 0.55);
      } else if (role === "hair") {
        tint(material.color, HAIR_COLOURS[appearance.hairColour] ?? HAIR_COLOURS[2], 0.5);
      } else if (role === "eyes") {
        tint(material.color, EYE_COLOURS[appearance.eyeColour] ?? EYE_COLOURS[0], 0.45);
      }
    });
  }

  /** Toggle authored equipment variants without reloading or cloning a body. */
  applyEquipment(appearance) {
    this.wardrobe?.applyAppearance(appearance);
    this.wardrobe?.applySharedMorphs(appearance);
    // Let the cloth out to fit whoever is wearing it, then mask the skin again.
    // The mask decides what to hide by how close the cloth is, so it has to be
    // told after the cloth has moved — otherwise a heavy build's thighs stay
    // visible through a skirt that has just been widened to cover them.
    this.fitFlowingGarments();
    this.wardrobe?.refresh();
  }

  /** Drive the facial shape keys authored after MPFB's relaxed pose is baked. */
  applyFaceMorphs(appearance) {
    if (!this.model) return;
    const controls = {
      headWidth: appearance.headWidth,
      jawWidth: appearance.jawWidth,
      chinLength: appearance.chinLength,
      noseSize: appearance.noseSize,
      cheekbones: appearance.cheekbones,
      mouthWidth: appearance.mouthWidth,
      bust: appearance.bust,
      glutes: appearance.glutes,
      belly: appearance.belly,
    };
    this.model.traverse((node) => {
      if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
      for (const [name, value] of Object.entries(controls)) {
        const index = node.morphTargetDictionary[name];
        if (index !== undefined) node.morphTargetInfluences[index] = ((value ?? 0.5) - 0.5) * 2;
      }
    });
  }

  /**
   * Reshape the body from the proportion sliders.
   *
   * Every bone in this rig points along its own local +Y, so Y is the segment's
   * length and X/Z are its girth — which is enough to drive real proportions
   * without morph targets. Scale is inherited down the chain, so each change is
   * cancelled again on the first bone that should not carry it; otherwise
   * lengthening an arm would also inflate the hand on the end of it.
   */
  applyProportions(appearance) {
    if (!this.model) return;
    const set = (name, lengthwise, girth = 1) => {
      const bone = this.bones[name];
      if (bone) bone.scale.set(girth, lengthwise, girth);
    };
    // A slider at 0.5 leaves the body as authored; `spread` is how far the ends
    // of the slider are allowed to take it.
    const from = (value, spread) => 1 + ((value ?? 0.5) - 0.5) * spread;

    const armLength = from(appearance.armLength, 0.26);
    const legLength = from(appearance.legLength, 0.26);
    const torso = from(appearance.torsoLength, 0.22);
    const neck = from(appearance.neckLength, 0.4);
    const shoulders = from(appearance.shoulderWidth, 0.34)
      * from(appearance.muscularity, 0.28);

    // Girth: overall build nudges everything, then the specific sliders on top.
    // These multiply, so the individual spreads stay narrow — four sliders at
    // full compounding into a 1.75x limb is a caricature, not a heavy build.
    const muscle = from(appearance.muscularity, 0.56);
    const build = from(appearance.build, 0.24) * from(appearance.bodyFat, 0.16);
    const armGirth = build * from(appearance.armThickness, 0.28)
      * muscle;
    const legGirth = build * from(appearance.legThickness, 0.28)
      * from(appearance.muscularity, 0.46);

    ["l", "r"].forEach((side) => {
      set(`clavicle_${side}`, shoulders);
      set(`upperarm_${side}`, armLength / shoulders, armGirth);
      set(`lowerarm_${side}`, 1, 1);
      set(`hand_${side}`, 1 / armLength, 1 / armGirth);

      set(`thigh_${side}`, legLength, legGirth);
      set(`calf_${side}`, 1, 1);
      set(`foot_${side}`, 1 / legLength, 1 / legGirth);
    });

    set("pelvis", 1, build * from(appearance.hipWidth, 0.34));
    // A sculpted build widens the back and chest while keeping the waist from
    // swelling at the same rate. This creates an athletic V rather than a
    // uniformly inflated character.
    const waistMuscle = from(appearance.muscularity, 0.10);
    const chestMuscle = from(appearance.muscularity, 0.48);
    set("spine_01", torso, build * waistMuscle * from(appearance.waistWidth, 0.34));
    set("spine_02", 1, 1);
    set("spine_03", 1, chestMuscle * from(appearance.chestWidth, 0.3));
    // Everything above the chest undoes the torso's stretch, so a long back
    // does not also give the character a long neck and a big head.
    set("neck_01", neck / torso, 1 / (chestMuscle * from(appearance.chestWidth, 0.3)));
    set("head", from(appearance.headSize, 0.28) / (neck / torso) / torso,
      from(appearance.headSize, 0.28));
  }

  /**
   * Let flowing garments out until the body fits inside them.
   *
   * A skirt is weighted entirely to the pelvis so it swings as one piece rather
   * than scissoring with the legs — but that also means it cannot hear the leg
   * and hip sliders, and at heavy builds the thighs simply walked out through
   * it. This measures the widest the body actually gets at each height under
   * the garment and opens the cloth to clear it, band by band, so the hem only
   * widens where something is pushing on it.
   *
   * Ratios are used rather than distances so the result is independent of
   * whatever uniform scale the garment's own bone is carrying.
   */
  fitFlowingGarments() {
    if (!this.model || !this.clothPieces.length) return;
    const bodyMesh = this.wardrobe?.bodyMasks?.[0]?.node;
    if (!bodyMesh?.applyBoneTransform) return;
    // Skinned positions are read from the skeleton's cached bone matrices, and
    // those are only refreshed during render. Fitting runs the moment a slider
    // moves, so without this it measures the body from before the change.
    this.model.updateMatrixWorld(true);
    bodyMesh.skeleton?.update();

    const BANDS = 28;
    // Cloth clears the widest skin in each band by this much. Loose enough that
    // a stride or a breath cannot push the body back out through it.
    const MARGIN = 1.11;
    // The belted top sits close instead — this is what makes it read as tied on
    // rather than hung on. Top fifth of the garment, 2% of air.
    const WAIST_MARGIN = 1.02;
    const WAIST_GRIP = 0.2;
    const bodyPos = bodyMesh.geometry.attributes.position;
    const bodyRegions = this.wardrobe.bodyMasks[0].regions;
    const scratch = new THREE.Vector3();

    for (const cloth of this.clothPieces) {
      if (!cloth.node.visible) continue;
      cloth.node.skeleton?.update();
      const position = cloth.node.geometry.attributes.position;
      const authored = cloth.authored;

      // Measure only what this garment is responsible for covering. The arms
      // hang at hip height, so sampling every vertex in the skirt's band range
      // let a heavy build's hands drag the hem out into a table.
      const item = WARDROBE_BY_ID.get(cloth.node.userData?.wardrobeItemId);
      const covers = new Set(item?.hideBodyParts ?? []);
      if (!covers.size) continue;

      // Skinned extent of this garment, so bands line up with where it hangs.
      let low = Infinity;
      let high = -Infinity;
      for (let i = 0; i < position.count; i += 1) {
        const y = cloth.node.applyBoneTransform(i,
          scratch.set(authored[i * 3], authored[i * 3 + 1], authored[i * 3 + 2])).y;
        if (y < low) low = y;
        if (y > high) high = y;
      }
      if (!(high > low)) continue;
      const bandOf = (y) => Math.max(0, Math.min(BANDS - 1,
        Math.floor(((y - low) / (high - low)) * BANDS)));

      // Widest skin at each height, and widest cloth at each height.
      const bodyRadius = new Float64Array(BANDS);
      for (let i = 0; i < bodyPos.count; i += 1) {
        if (!covers.has(bodyRegions[i])) continue;
        const p = bodyMesh.applyBoneTransform(i, scratch.fromBufferAttribute(bodyPos, i));
        if (p.y < low || p.y > high) continue;
        const radius = Math.hypot(p.x, p.z);
        const band = bandOf(p.y);
        if (radius > bodyRadius[band]) bodyRadius[band] = radius;
      }
      // Measure the garment as authored, never as last fitted — otherwise each
      // pass divides by its own previous result and the hem drifts.
      const clothRadius = new Float64Array(BANDS);
      for (let i = 0; i < position.count; i += 1) {
        const p = cloth.node.applyBoneTransform(i,
          scratch.set(authored[i * 3], authored[i * 3 + 1], authored[i * 3 + 2]));
        const radius = Math.hypot(p.x, p.z);
        const band = bandOf(p.y);
        if (radius > clothRadius[band]) clothRadius[band] = radius;
      }

      const widen = new Float64Array(BANDS);
      for (let band = 0; band < BANDS; band += 1) {
        if (clothRadius[band] <= 1e-5 || bodyRadius[band] <= 1e-5) { widen[band] = 1; continue; }
        // Bands run from the hem upward, so the top ones are the waist. Belted
        // against the body it must be able to take *in* as well as let out — a
        // ring authored for one waist hung visibly off every slimmer one. The
        // free hem below only ever opens, so the skirt keeps its drawn flare.
        const belted = Math.max(0, (band / (BANDS - 1) - (1 - WAIST_GRIP)) / WAIST_GRIP);
        const toWaist = (bodyRadius[band] * WAIST_MARGIN) / clothRadius[band];
        const toHem = Math.max(1, (bodyRadius[band] * MARGIN) / clothRadius[band]);
        widen[band] = toWaist * belted + toHem * (1 - belted);
      }
      // Smooth the profile so a single wide band cannot pinch the silhouette.
      // Taking the max keeps the hem from ever tightening onto the body — but
      // it must not reach the belted bands, or it drags the waist back open to
      // whatever the fullest part of the hip below it needed.
      const smoothed = widen.slice();
      for (let band = 0; band < BANDS; band += 1) {
        const belted = Math.max(0, (band / (BANDS - 1) - (1 - WAIST_GRIP)) / WAIST_GRIP);
        if (belted >= 1) continue;
        const before = widen[Math.max(0, band - 1)];
        const after = widen[Math.min(BANDS - 1, band + 1)];
        smoothed[band] = Math.max(widen[band], (before + widen[band] + after) / 3);
      }

      for (let i = 0; i < position.count; i += 1) {
        const y = cloth.node.applyBoneTransform(i,
          scratch.set(authored[i * 3], authored[i * 3 + 1], authored[i * 3 + 2])).y;
        const scale = smoothed[bandOf(y)];
        cloth.basePositions[i * 3] = authored[i * 3] * scale;
        cloth.basePositions[i * 3 + 1] = authored[i * 3 + 1];
        cloth.basePositions[i * 3 + 2] = authored[i * 3 + 2] * scale;
      }
      position.array.set(cloth.basePositions);
      position.needsUpdate = true;
      cloth.node.geometry.computeBoundingBox();
      cloth.node.geometry.computeBoundingSphere();
    }
  }

  /**
   * Leg colliders for the cloth, rebuilt from wherever the legs currently are.
   *
   * A capsule per thigh and shin, in the garment's own local space so cloth
   * vertices can be tested without a matrix per vertex. Radii come from the
   * bone's own scale, so they grow with the leg-thickness slider exactly as the
   * limb does.
   */
  updateLegColliders() {
    if (!this.model) return;
    const legs = [["thigh_l", "calf_l"], ["thigh_r", "calf_r"], ["calf_l", "foot_l"], ["calf_r", "foot_r"]];
    this.legColliders.length = 0;
    for (const [fromName, toName] of legs) {
      const from = this.bones[fromName];
      const to = this.bones[toName];
      if (!from || !to) continue;
      from.updateWorldMatrix(true, false);
      to.updateWorldMatrix(true, false);
      const a = new THREE.Vector3().setFromMatrixPosition(from.matrixWorld);
      const b = new THREE.Vector3().setFromMatrixPosition(to.matrixWorld);
      const girth = new THREE.Vector3().setFromMatrixScale(from.matrixWorld);
      this.legColliders.push({
        a, b,
        radius: LEG_RADIUS * this.totalHeight * Math.max(girth.x, girth.z),
      });
    }
  }

  /**
   * The transform between a garment's stored vertices and the world.
   *
   * Vertex arrays hold bind-pose positions; the GPU does the skinning. To test
   * one against a posed leg the two have to be brought into the same space, so
   * this rebuilds the exact chain Three's skinning shader applies:
   *
   *   world = meshWorld · bindInverse · (bone · boneInverse) · bind · vertex
   *
   * Only valid because these flowing garments are weighted wholly to one bone —
   * with blended weights there is no single matrix to invert, and collision
   * would have to be solved per vertex in world space instead.
   */
  bindSpaceMatrix(node) {
    const skeleton = node.skeleton;
    const skinIndex = node.geometry.attributes.skinIndex;
    if (!skeleton || !skinIndex) return null;
    const bone = skeleton.bones[skinIndex.getX(0)];
    const boneInverse = skeleton.boneInverses[skinIndex.getX(0)];
    if (!bone || !boneInverse) return null;
    bone.updateWorldMatrix(true, false);
    const forward = BIND_FORWARD
      .copy(node.matrixWorld)
      .multiply(node.bindMatrixInverse)
      .multiply(BIND_BONE.multiplyMatrices(bone.matrixWorld, boneInverse))
      .multiply(node.bindMatrix);
    return { forward, inverse: BIND_INVERSE.copy(forward).invert() };
  }

  /**
   * Push cloth out of the legs, then pull it back into shape.
   *
   * This is the useful half of a position-based cloth solver. Each vertex that
   * has ended up inside a leg capsule is projected to its surface, and a couple
   * of relaxation passes over the mesh's own edges stop that projection from
   * tearing holes or stretching the weave. There is no gravity or momentum
   * here — the skinning and the sway already provide the motion; this only
   * enforces the one rule they cannot, which is that a leg is solid.
   */
  resolveClothCollisions(cloth) {
    if (!this.legColliders.length || !cloth.edges) return;
    const toBind = this.bindSpaceMatrix(cloth.node);
    if (!toBind) return;
    const position = cloth.node.geometry.attributes.position;
    const array = position.array;
    const point = COLLIDE_P;
    const axis = COLLIDE_AXIS;
    const closest = COLLIDE_CLOSEST;
    // How much the bind→world transform scales, so a world-space radius can be
    // expressed in the bind-pose units the vertex array is stored in.
    const shrink = 1 / Math.max(1e-6, SCALE_V.setFromMatrixScale(toBind.forward).x);

    // Capsules, carried once into the garment's bind pose.
    const capsules = this.legColliders.map((leg) => ({
      a: leg.a.clone().applyMatrix4(toBind.inverse),
      b: leg.b.clone().applyMatrix4(toBind.inverse),
      radius: leg.radius * shrink,
    }));

    let moved = false;
    const collide = () => {
      for (const capsule of capsules) {
        const { a, b, radius } = capsule;
        axis.subVectors(b, a);
        const lengthSq = Math.max(1e-8, axis.lengthSq());
        for (let i = 0; i < array.length; i += 3) {
          point.set(array[i], array[i + 1], array[i + 2]);
          const along = THREE.MathUtils.clamp(
            (point.x - a.x) * axis.x + (point.y - a.y) * axis.y + (point.z - a.z) * axis.z,
            0, lengthSq,
          ) / lengthSq;
          closest.copy(a).addScaledVector(axis, along);
          const dx = point.x - closest.x;
          const dz = point.z - closest.z;
          const flat = Math.hypot(dx, dz);
          if (flat >= radius || flat < 1e-6) continue;
          // Out along the shortest horizontal escape; cloth slides round a leg
          // rather than being lifted off it.
          const push = radius / flat;
          array[i] = closest.x + dx * push;
          array[i + 2] = closest.z + dz * push;
          moved = true;
        }
      }
    };

    // Relax: pull each edge back toward the length it was authored at, so
    // pushed vertices drag their neighbours instead of tearing away from them.
    const relax = () => {
      for (const edge of cloth.edges) {
        const p = edge.a * 3;
        const q = edge.b * 3;
        let dx = array[q] - array[p];
        let dy = array[q + 1] - array[p + 1];
        let dz = array[q + 2] - array[p + 2];
        const length = Math.hypot(dx, dy, dz);
        if (length < 1e-6) continue;
        const correction = ((length - edge.rest) / length) * 0.5 * CLOTH_STIFFNESS;
        dx *= correction; dy *= correction; dz *= correction;
        // The belted top is pinned; only the free cloth below may move.
        if (!edge.pinnedA) { array[p] += dx; array[p + 1] += dy; array[p + 2] += dz; }
        if (!edge.pinnedB) { array[q] -= dx; array[q + 1] -= dy; array[q + 2] -= dz; }
      }
    };

    // Alternate the two, the way a position-based solver does: relaxing pulls
    // cloth back toward the leg it was just pushed off, so collision has to get
    // the last word or the penetration simply returns.
    for (let pass = 0; pass < CLOTH_RELAX_PASSES; pass += 1) {
      collide();
      if (!moved) return;
      relax();
    }
    collide();
    if (moved) position.needsUpdate = true;
  }

  /** Scale the loaded body to the requested height, keeping its feet on zero. */
  applyHeight() {
    if (!this.model || !this.sourceHeight) return;
    const scale = this.totalHeight / this.sourceHeight;
    this.model.scale.setScalar(scale);
    this.model.position.y = -this.sourceFloor * scale;
  }

  /**
   * Swing a bone about the body's own left-right axis: positive is forward.
   *
   * These bones' local axes line up with nothing anatomical — rotating a thigh
   * about its own X abducts the leg rather than flexing the hip, which is why
   * driving `rotation.x` produced a lateral scissor rather than a stride
   * (0.71 m of sideways foot travel against 0.10 m forward). Naming the axis in
   * body space makes "swing the leg forward" mean that on any bone, whatever
   * roll it happens to have been authored with.
   */
  swing(name, angle) {
    const bone = this.bones[name];
    const rest = this.restPose[name];
    if (!bone || !rest) return;

    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(PARENT_Q);
    // The parent's rotation relative to the body, so the axis below stays the
    // body's own left-right axis however the character is facing.
    PARENT_IN_BODY.copy(this.bodyQuat).invert().multiply(PARENT_Q);
    WANTED_Q.setFromAxisAngle(BODY_X, -angle);

    bone.quaternion
      .copy(PARENT_IN_BODY).invert()
      .multiply(WANTED_Q)
      .multiply(PARENT_IN_BODY)
      .multiply(rest);
  }

  animate(dt, gait = 0) {
    if (!this.model) {
      this.fallback.animate(dt, gait);
      return;
    }
    this.phase += dt * (2.4 + gait * 5.2);
    this.windPhase += dt;
    const t = this.phase;
    const g = gait;

    this.model.updateWorldMatrix(true, false);
    this.model.getWorldQuaternion(this.bodyQuat);

    // One leg leads the other by half a cycle; ~30° of hip is what a real
    // stride opens to.
    const hipL = Math.sin(t);
    const hipR = Math.sin(t + Math.PI);
    this.swing("thigh_l", hipL * 0.52 * g);
    this.swing("thigh_r", hipR * 0.52 * g);

    // The knee is what separates a walk from a pair of scissors: long through
    // stance, folding hard through the swing and peaking just after the foot
    // leaves the ground — hence the lag on the phase.
    const knee = (p) => Math.pow(Math.max(0, Math.sin(p + 1.15)), 1.5);
    this.swing("calf_l", -knee(t) * 1.05 * g);
    this.swing("calf_r", -knee(t + Math.PI) * 1.05 * g);

    // Roll the foot through the step instead of sliding it along flat.
    this.swing("foot_l", Math.sin(t + 0.7) * 0.28 * g);
    this.swing("foot_r", Math.sin(t + Math.PI + 0.7) * 0.28 * g);

    // Arms counter the legs — left arm travels with the right leg.
    this.swing("upperarm_l", hipR * 0.45 * g);
    this.swing("upperarm_r", hipL * 0.45 * g);
    this.swing("lowerarm_l", -Math.max(0, hipR) * 0.55 * g);
    this.swing("lowerarm_r", -Math.max(0, hipL) * 0.55 * g);

    // Breath when still, a little counter-rotation when moving.
    this.swing("spine_03", Math.sin(t * 0.22) * 0.02 * (1 - g) - hipL * 0.05 * g);

    // Where the legs are this frame, for the cloth to collide against.
    this.updateLegColliders();

    // Browser-friendly secondary cloth motion. The garment remains skinned to
    // the pelvis for locomotion; this adds a damped lag from stride plus two
    // off-frequency wind notes so it never rocks like a rigid pendulum.
    for (const cloth of this.clothPieces) {
      if (!cloth.node.visible) continue;
      const wind = Math.sin(this.windPhase * 1.17) * 0.55
        + Math.sin(this.windPhase * 2.31 + 1.4) * 0.22;
      const stride = Math.sin(t - 0.55) * g;
      const side = Math.sin(t * 0.5 + 0.8) * g;
      // Never rotate the entire garment: that moves the supposedly fixed
      // waistband around the object's origin. Keep its authored/skinned
      // transform and put all secondary motion below the pinned band.
      cloth.node.quaternion.slerp(cloth.rest, 1 - Math.pow(0.0001, dt));

      // Bend the loose mesh itself. Fixed waist/shoulder vertices barely move;
      // displacement grows toward the free hem, producing folds rather than a
      // rigid object rocking around its origin.
      const position = cloth.node.geometry.attributes.position;
      const array = position.array;
      const base = cloth.basePositions;
      const bounds = cloth.node.geometry.boundingBox
        ?? (cloth.node.geometry.computeBoundingBox(), cloth.node.geometry.boundingBox);
      const span = Math.max(0.001, bounds.max.y - bounds.min.y);
      for (let i = 0; i < array.length; i += 3) {
        const descent = THREE.MathUtils.clamp((bounds.max.y - base[i + 1]) / span, 0, 1);
        const free = THREE.MathUtils.smoothstep(descent, cloth.anchor, 1);
        const wave = Math.sin(this.windPhase * 2.0 + base[i] * 9 + base[i + 1] * 5);
        // Sideways sway runs at half the stride frequency, matching the hips
        // rolling once per full cycle rather than once per step.
        array[i] = base[i] + (wave * 0.10 + side * 0.35) * cloth.flow * free;
        array[i + 2] = base[i + 2] + (wind + stride * 0.6) * cloth.flow * free
          + wave * cloth.flow * 0.18 * free;
      }
      position.needsUpdate = true;
      // Sway is free to put cloth anywhere, including inside a leg. Last word
      // goes to the solver, which puts it back outside.
      this.resolveClothCollisions(cloth);
    }

    // The body rises over each supporting leg — twice a cycle, not once.
    this.root.position.y = Math.abs(Math.sin(t)) * 0.035 * g;
  }

  /**
   * How far to turn the figure so it faces a turntable camera sitting on +Z.
   * The procedural stand-in is built facing -Z; the MPFB export faces +Z. The
   * creator asks rather than assumes, so the answer stays correct while the
   * real body is still downloading.
   */
  get previewFacing() {
    return this.model ? 0 : Math.PI;
  }

  /** Idle-only pose, for the character-creation turntable. */
  poseForPreview() {
    if (!this.model) {
      this.fallback.poseForPreview();
      return;
    }
    // Standing still: zero the gait so no walk cycle is left frozen mid-stride.
    // animate() already breathes the spine when gait is zero.
    this.animate(0.016, 0);
    this.root.position.y = 0;
  }

  /**
   * Detach from the scene. Geometry, materials and textures belong to the
   * cached glTF and are shared with every other instance of this body, so they
   * are deliberately not disposed — only the stand-in's own resources are ours
   * to free.
   */
  dispose() {
    this.model?.removeFromParent();
    this.model = null;
    this.bones = {};
    this.clothPieces = [];
    this.equipmentPieces = [];
    this.wardrobe = null;
    this.currentModel = null;
    this.sourceHeight = 0;
    this.fallback?.dispose();
  }
}
