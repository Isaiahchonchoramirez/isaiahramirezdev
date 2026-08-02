import * as THREE from "three";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";
import { Humanoid } from "./humanoid.js";
import { EYE_COLOURS, HAIR_COLOURS, SKIN_TONES } from "./appearance.js";

const MODEL_FILES = {
  "veyr-hunter": "veyr-hunter.glb",
  "aurean-keeper": "aurean-keeper.glb",
  "ember-elder": "ember-elder.glb",
};
// GitHub Pages gives immutable-looking asset URLs a browser cache lifetime.
// Bump this whenever the generated GLBs change so body/sex switches cannot
// silently reuse an older character file from a previous deployment.
const MODEL_REVISION = "2026-08-02-hair-library";

const cache = new Map();
const loader = new GLTFLoader();

// Scratch values for the per-bone maths in `swing`, so a frame of animation
// allocates nothing.
const BODY_X = new THREE.Vector3(1, 0, 0);
const PARENT_Q = new THREE.Quaternion();
const PARENT_IN_BODY = new THREE.Quaternion();
const WANTED_Q = new THREE.Quaternion();

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
    this.bodyQuat = new THREE.Quaternion();
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
    const requestId = modelId;
    loadModel(modelId).then((gltf) => {
      if (requestId !== this.currentModel) return;
      this.model?.removeFromParent();
      this.bones = {};
      this.clothPieces = [];
      this.equipmentPieces = [];
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
    const selected = {
      torso: appearance.torsoGarment ?? "tunic",
      lower: appearance.lowerGarment ?? "wrap",
      mantle: appearance.mantle ?? "none",
      feet: appearance.footwear ?? "bare",
      hair: appearance.hairStyle ?? "cropped",
    };
    for (const piece of this.equipmentPieces) {
      piece.visible = selected[piece.userData.slot] === piece.userData.variant;
    }
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

    // Browser-friendly secondary cloth motion. The garment remains skinned to
    // the pelvis for locomotion; this adds a damped lag from stride plus two
    // off-frequency wind notes so it never rocks like a rigid pendulum.
    for (const cloth of this.clothPieces) {
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
        array[i] = base[i] + wave * cloth.flow * 0.10 * free;
        array[i + 2] = base[i + 2] + (wind + stride * 0.6) * cloth.flow * free
          + wave * cloth.flow * 0.18 * free;
      }
      position.needsUpdate = true;
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
    this.currentModel = null;
    this.sourceHeight = 0;
    this.fallback?.dispose();
  }
}
