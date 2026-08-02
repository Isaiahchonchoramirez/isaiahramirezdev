import * as THREE from "three";
import { SKIN_TONES, HAIR_COLOURS, EYE_COLOURS, MARKINGS, SCARS } from "./appearance.js";
import { CULTURES } from "./cultures.js";
import { CLASSES } from "./classes.js";
import { makeRng } from "../noise.js";
import {
  skinSet, hair as hairMaterial, facialHair as facialHairMaterial,
  eyeMaterials, cloth as clothMaterial, hide as hideMaterial, fur as furMaterial,
  bone as boneMaterial, wood as woodMaterial, stone as stoneMaterial,
  flint as flintMaterial, pigment as pigmentMaterial,
} from "../render/materials.js";

/**
 * Procedural humanoid.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * There is no rigged character asset in this project. Rather than ship a
 * primitive and call it a person, this builds a correctly proportioned figure
 * out of separate anatomical forms on the classical 7.5-head canon.
 *
 * ── The swap contract ────────────────────────────────────────────────────────
 * Gameplay code NEVER touches a mesh. It touches `root` (position/rotation) and
 * calls `animate()`. Everything visible hangs off named joints in `this.joints`
 * using standard humanoid bone names. To replace this with a real rigged model:
 *
 *   1. Load a GLTF whose skeleton uses the same names (see JOINT_NAMES below).
 *   2. In `build()`, parent the loaded skeleton to `root` instead of calling
 *      `buildBody()`, and point `this.joints` at the loaded bones.
 *   3. Swap `animate()` for an AnimationMixer driving idle/walk/run clips.
 *
 * Movement, camera, collision and combat require no changes — they only know
 * about `root`, `capsule` and `headHeight`.
 *
 * Required asset format for that replacement: glTF 2.0 (.glb), Y-up, -Z
 * forward, metre scale, origin between the feet, a humanoid skeleton with the
 * joint names below, and idle / walk / run clips that are root-motion free.
 */

export const JOINT_NAMES = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "elbowL", "wristL",
  "shoulderR", "elbowR", "wristR",
  "thighL", "kneeL", "ankleL",
  "thighR", "kneeR", "ankleR",
];

/* The 7.5-head canon, as fractions of total height, measured from the sole. */
const CANON = {
  sole: 0.0,
  ankle: 0.040,
  knee: 0.267,
  hip: 0.500,
  navel: 0.600,
  chest: 0.733,
  shoulder: 0.8133,
  chin: 0.8667,
  crown: 1.0,
};

const lerp = (a, b, t) => a + (b - a) * t;

function mat(colour, roughness = 0.85, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colour),
    roughness,
    metalness: 0,
    ...opts,
  });
}

/** A limb segment: a tapered capsule spanning `length` downward from a joint. */
function segment(material, topR, bottomR, length, segs = 10) {
  const geo = new THREE.CylinderGeometry(topR, bottomR, length, segs, 1, false);
  geo.translate(0, -length / 2, 0); // hang from the joint
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function ball(material, r, segs = 12) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs * 0.75), material);
  mesh.castShadow = true;
  return mesh;
}

export class Humanoid {
  constructor(appearance) {
    this.root = new THREE.Group();
    this.root.name = "humanoid-root";
    this.joints = {};
    this.parts = new THREE.Group(); // everything visible, so it can be dropped wholesale
    this.root.add(this.parts);
    this.phase = 0;
    this.appearance = null;
    this.setAppearance(appearance);
  }

  /** Rebuild from scratch. Cheap enough to call on every slider drag. */
  setAppearance(appearance) {
    this.appearance = appearance;
    this.dispose();
    this.buildBody();
  }

  dispose() {
    this.parts.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose();
      }
    });
    this.parts.clear();
    this.joints = {};
  }

  /* ------------------------------------------------------------------ build */

  buildBody() {
    const a = this.appearance;
    const H = a.height;
    const headUnit = H / 7.5;

    // Derived proportions. Every one of these is driven by a slider that the
    // creator UI marks as affecting the body.
    const build = lerp(0.82, 1.24, a.build);
    const muscle = lerp(0.85, 1.22, a.muscularity);
    const fat = lerp(0.88, 1.3, a.bodyFat);
    const girth = build * lerp(muscle, fat, 0.5);

    // NAMING RULE, because getting this wrong makes a figure look inflated or
    // starved: `*Span` is a full width across the body; `*R` is a radius fed to
    // a sphere/cylinder scale. Never mix them.
    const shoulderSpan = H * lerp(0.205, 0.275, a.shoulderWidth) * build; // ~0.42 m
    const hipSpan = H * lerp(0.15, 0.23, a.hipWidth ?? 0.5) * build;
    const chestShape = lerp(0.82, 1.2, a.chestWidth ?? 0.5);
    const waistShape = lerp(0.78, 1.18, a.waistWidth ?? 0.5);
    const shoulderW = shoulderSpan; // kept for adornment sizing below
    const hipW = hipSpan * 0.5;     // radius, for the pelvis ellipsoid

    // Torso vs leg proportion trade against each other around the hip line, so
    // total height always stays exactly `H`.
    const hipY = H * CANON.hip * lerp(0.94, 1.06, a.legLength);
    const shoulderY = lerp(hipY + (H * CANON.shoulder - H * CANON.hip) * 0.86,
                           hipY + (H * CANON.shoulder - H * CANON.hip) * 1.14,
                           a.torsoLength);
    const chinY = shoulderY + headUnit * lerp(0.34, 0.62, a.neckLength);
    const headH = headUnit * lerp(0.88, 1.12, a.headSize);

    this.headHeight = chinY + headH * 0.55;
    this.totalHeight = H;

    const skinMaterials = skinSet(
      SKIN_TONES[a.skinTone] ?? SKIN_TONES[4],
      a.age,
      a.weathering ?? 0.3,
    );
    const skin = skinMaterials.base;
    this.skinMaterials = skinMaterials;
    this.skinMaterial = skin;

    const culture = CULTURES[a.culture] ?? CULTURES.veyr;
    const archetype = CLASSES[a.archetype] ?? CLASSES.huntmaster;
    const cloth = clothMaterial(culture.palette.cloth[0], { worn: 0.48 });
    const clothDark = clothMaterial(culture.palette.cloth[1], { worn: 0.68 });
    const leather = hideMaterial("#4a3628", { supple: 0.72 });
    const fur = furMaterial(culture.palette.cloth[3] ?? "#4e4238", { depth: 0.72 });

    /* ---- hips (root of the skeleton) */
    const hips = new THREE.Object3D();
    hips.position.y = hipY;
    hips.name = "hips";
    this.parts.add(hips);
    this.joints.hips = hips;

    const pelvis = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      skin,
    );
    pelvis.scale.set(hipSpan * 0.5, headUnit * 0.5, hipSpan * 0.34);
    pelvis.position.y = -headUnit * 0.1;
    pelvis.castShadow = true;
    hips.add(pelvis);

    /* ---- spine → chest */
    const torsoLen = shoulderY - hipY;
    const spine = new THREE.Object3D();
    spine.name = "spine";
    hips.add(spine);
    this.joints.spine = spine;

    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin);
    abdomen.scale.set(hipSpan * 0.47 * girth * waistShape, torsoLen * 0.34, hipSpan * 0.31 * girth);
    abdomen.position.y = torsoLen * 0.26;
    abdomen.castShadow = true;
    spine.add(abdomen);

    const chest = new THREE.Object3D();
    chest.position.y = torsoLen * 0.52;
    chest.name = "chest";
    spine.add(chest);
    this.joints.chest = chest;

    const ribcage = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin);
    ribcage.scale.set(shoulderSpan * 0.39 * chestShape, torsoLen * 0.42, hipSpan * 0.36 * chestShape * lerp(0.95, 1.15, a.muscularity));
    ribcage.position.y = torsoLen * 0.18;
    ribcage.castShadow = true;
    chest.add(ribcage);

    // Trapezius wedge — reads as shoulders rather than a ball joint.
    const traps = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
    traps.scale.set(shoulderSpan * 0.44, torsoLen * 0.12, hipSpan * 0.26);
    traps.position.y = torsoLen * 0.34;
    chest.add(traps);

    /* ---- garment over the torso
       A lathed profile rather than a cylinder. A straight tube reads as a
       sandwich board because it ignores the shoulder slope and the waist; a
       profile that narrows at the waist and flares at the hem reads as worn
       cloth even with no texture on it. */
    const garmentMat = a.culture === "veyr" ? fur : clothDark;
    const hemY = -torsoLen * 0.42;
    const tunicProfile = [
      new THREE.Vector2(shoulderSpan * 0.20, torsoLen * 0.44),  // neck opening
      new THREE.Vector2(shoulderSpan * 0.42, torsoLen * 0.36),  // over the shoulder
      new THREE.Vector2(shoulderSpan * 0.40, torsoLen * 0.16),  // chest
      new THREE.Vector2(hipSpan * 0.50 * waistShape, -torsoLen * 0.06),
      new THREE.Vector2(hipSpan * 0.63, -torsoLen * 0.24),      // hip
      new THREE.Vector2(hipSpan * 0.72, hemY),                  // hem, flared
    ];
    const tunic = new THREE.Mesh(new THREE.LatheGeometry(tunicProfile, 22), garmentMat);
    tunic.material.side = THREE.DoubleSide;
    tunic.position.y = torsoLen * 0.30;
    tunic.castShadow = true;
    spine.add(tunic);
    this.garment = tunic;

    // Ragged hem: a few hanging tabs so the bottom edge is not a perfect circle.
    const hemRng = makeRng(Math.round(a.height * 1000) + 17);
    for (let i = 0; i < 9; i += 1) {
      const ang = (i / 9) * Math.PI * 2 + hemRng() * 0.2;
      const tab = new THREE.Mesh(
        new THREE.PlaneGeometry(hipSpan * 0.2, headUnit * (0.3 + hemRng() * 0.5)),
        garmentMat,
      );
      tab.material.side = THREE.DoubleSide;
      const r = hipSpan * 0.71;
      tab.position.set(Math.cos(ang) * r, torsoLen * 0.30 + hemY - headUnit * 0.16, Math.sin(ang) * r);
      tab.rotation.y = -ang + Math.PI / 2;
      spine.add(tab);
    }

    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(hipSpan * 0.52, headUnit * 0.05, 6, 20),
      leather,
    );
    belt.rotation.x = Math.PI / 2;
    belt.position.y = torsoLen * 0.24;
    spine.add(belt);

    // A hanging pouch and a knapped blade at the belt — people carried things.
    const pouch = new THREE.Mesh(new THREE.SphereGeometry(headUnit * 0.2, 8, 6), leather);
    pouch.scale.set(1, 1.25, 0.62);
    pouch.position.set(hipSpan * 0.42, torsoLen * 0.10, -hipSpan * 0.28);
    spine.add(pouch);

    /* ---- neck → head */
    const neckLen = chinY - shoulderY;
    const neck = new THREE.Object3D();
    neck.position.y = torsoLen * 0.42;
    neck.name = "neck";
    chest.add(neck);
    this.joints.neck = neck;

    const neckMesh = segment(skin, headUnit * 0.165, headUnit * 0.20, neckLen * 1.5, 10);
    neckMesh.position.y = neckLen * 1.2;
    neck.add(neckMesh);

    const head = new THREE.Object3D();
    head.position.y = neckLen * 1.15;
    head.name = "head";
    neck.add(head);
    this.joints.head = head;
    this.buildHead(head, headH, skin, a);

    /* ---- arms */
    const upperArmLen = torsoLen * lerp(0.62, 0.78, a.armLength);
    const foreArmLen = torsoLen * lerp(0.54, 0.68, a.armLength);
    const armR = headUnit * 0.205 * muscle * build * lerp(0.72, 1.32, a.armThickness ?? 0.5);

    [-1, 1].forEach((side) => {
      const tag = side < 0 ? "L" : "R";
      const shoulder = new THREE.Object3D();
      shoulder.position.set(side * shoulderSpan * 0.42, torsoLen * 0.3, 0);
      shoulder.name = `shoulder${tag}`;
      chest.add(shoulder);
      this.joints[`shoulder${tag}`] = shoulder;

      const deltoid = ball(skin, armR * 1.35, 10);
      shoulder.add(deltoid);
      shoulder.add(segment(skin, armR * 1.05, armR * 0.86, upperArmLen));

      const elbow = new THREE.Object3D();
      elbow.position.y = -upperArmLen;
      elbow.name = `elbow${tag}`;
      shoulder.add(elbow);
      this.joints[`elbow${tag}`] = elbow;

      elbow.add(segment(skin, armR * 0.88, armR * 0.62, foreArmLen));

      const wrist = new THREE.Object3D();
      wrist.position.y = -foreArmLen;
      wrist.name = `wrist${tag}`;
      elbow.add(wrist);
      this.joints[`wrist${tag}`] = wrist;

      // Sleeve over the upper arm, so the garment does not stop at the shoulder.
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(armR * 1.5, armR * 1.12, upperArmLen * 0.62, 10, 1, true),
        a.culture === "veyr" ? fur : clothDark,
      );
      sleeve.material.side = THREE.DoubleSide;
      sleeve.position.y = -upperArmLen * 0.28;
      sleeve.castShadow = true;
      shoulder.add(sleeve);

      // Bracer at the forearm — hide bound with fibre.
      const bracer = new THREE.Mesh(
        new THREE.CylinderGeometry(armR * 0.92, armR * 0.72, foreArmLen * 0.44, 9, 1, true),
        leather,
      );
      bracer.material.side = THREE.DoubleSide;
      bracer.position.y = -foreArmLen * 0.7;
      elbow.add(bracer);

      /* Hand: palm plus four fingers and an opposed thumb. At gameplay range
         this only registers as "not a mitten", but in the creator close-up a
         featureless blob is the first thing the eye rejects. */
      const palm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skinMaterials.palm);
      palm.scale.set(armR * 1.45, headUnit * 0.2, armR * 0.72);
      palm.position.y = -headUnit * 0.12;
      palm.castShadow = true;
      wrist.add(palm);

      const fingerGeo = new THREE.CylinderGeometry(armR * 0.2, armR * 0.15, headUnit * 0.26, 5);
      fingerGeo.translate(0, -headUnit * 0.13, 0);
      for (let f = 0; f < 4; f += 1) {
        const finger = new THREE.Mesh(fingerGeo, skinMaterials.palm);
        finger.position.set((f - 1.5) * armR * 0.62, -headUnit * 0.21, 0);
        // Fingers curl slightly; a flat splayed hand looks like a mannequin.
        finger.rotation.x = -0.22 - f * 0.04;
        finger.castShadow = true;
        wrist.add(finger);
      }
      const thumb = new THREE.Mesh(fingerGeo, skinMaterials.palm);
      thumb.scale.setScalar(0.9);
      thumb.position.set(side * armR * 1.05, -headUnit * 0.15, armR * 0.2);
      thumb.rotation.set(-0.3, 0, side * 0.9);
      wrist.add(thumb);

      // Rest pose: arms hang slightly out and slightly forward, never straight
      // down — straight down is what makes a figure look like a mannequin.
      shoulder.rotation.z = side * 0.14;
      shoulder.rotation.x = -0.06;
      elbow.rotation.x = -0.18;
    });

    /* ---- legs */
    const thighLen = hipY - H * CANON.knee * lerp(0.96, 1.04, a.legLength);
    const calfLen = H * CANON.knee * lerp(0.96, 1.04, a.legLength) - H * CANON.ankle;
    const legR = headUnit * 0.335 * muscle * build * lerp(0.72, 1.32, a.legThickness ?? 0.5);

    [-1, 1].forEach((side) => {
      const tag = side < 0 ? "L" : "R";
      const thigh = new THREE.Object3D();
      thigh.position.set(side * hipSpan * 0.26, -headUnit * 0.12, 0);
      thigh.name = `thigh${tag}`;
      hips.add(thigh);
      this.joints[`thigh${tag}`] = thigh;

      thigh.add(segment(skin, legR * 1.12, legR * 0.82, thighLen, 12));

      const knee = new THREE.Object3D();
      knee.position.y = -thighLen;
      knee.name = `knee${tag}`;
      thigh.add(knee);
      this.joints[`knee${tag}`] = knee;

      knee.add(ball(skin, legR * 0.8, 8));
      knee.add(segment(skin, legR * 0.86, legR * 0.5, calfLen, 12));

      // Calf belly, so the lower leg is not a plain cone.
      const calfMuscle = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skin);
      calfMuscle.scale.set(legR * 0.82, calfLen * 0.3, legR * 0.95 * muscle);
      calfMuscle.position.set(0, -calfLen * 0.3, -legR * 0.2);
      knee.add(calfMuscle);

      const ankle = new THREE.Object3D();
      ankle.position.y = -calfLen;
      ankle.name = `ankle${tag}`;
      knee.add(ankle);
      this.joints[`ankle${tag}`] = ankle;

      // Foot extends forward (-Z) so the figure has an unmistakable facing.
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), leather);
      foot.scale.set(legR * 1.6, H * CANON.ankle * 1.15, headUnit * 0.92);
      foot.position.set(0, -H * CANON.ankle * 0.42, -headUnit * 0.22);
      foot.castShadow = true;
      ankle.add(foot);

      // Leg wrapping — hide bound with fibre, correct for the period.
      const wrap = new THREE.Mesh(
        new THREE.CylinderGeometry(legR * 0.92, legR * 0.62, calfLen * 0.8, 10, 1, true),
        a.culture === "veyr" ? fur : clothDark,
      );
      wrap.material.side = THREE.DoubleSide;
      wrap.position.y = -calfLen * 0.42;
      knee.add(wrap);
    });

    this.buildAdornments(chest, hips, headUnit, shoulderW, culture, archetype, a,
      { torsoLen, hipSpan, fur, clothDark, leather });

    // Collision capsule and the point the camera should track.
    this.capsule = { radius: Math.max(shoulderW * 0.42, 0.3), height: H };
    this.eyeHeight = chinY + headH * 0.62;
  }

  /* ------------------------------------------------------------------- head */

  buildHead(head, headH, skin, a) {
    const skinMaterials = this.skinMaterials;
    // Radii, not widths: a real head is ~0.15 m across and ~0.19 m deep, which
    // is about a third of its height. Treating these as widths inflates the
    // skull to twice life size and the figure stops reading as human.
    const w = headH * lerp(0.29, 0.36, a.headWidth);
    const d = headH * 0.40;

    // Cranium.
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), skin);
    cranium.scale.set(w, headH * 0.375, d);
    cranium.position.y = headH * 0.11;
    cranium.castShadow = true;
    head.add(cranium);

    // Jaw + chin, tapering forward and down.
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin);
    jaw.scale.set(w * lerp(0.70, 0.94, a.jawWidth), headH * lerp(0.17, 0.24, a.chinLength), d * 0.80);
    jaw.position.set(0, -headH * lerp(0.15, 0.21, a.chinLength), -headH * 0.02);
    jaw.castShadow = true;
    head.add(jaw);

    // Brow ridge — the single strongest cue that a head is a *face*.
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
    brow.scale.set(w * 0.9, headH * lerp(0.05, 0.09, a.browRidge), headH * 0.16);
    brow.position.set(0, headH * 0.12, -d * lerp(0.62, 0.76, a.browRidge));
    head.add(brow);

    // Cheekbones.
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skinMaterials.warm);
      cheek.scale.set(w * 0.3, headH * 0.13, headH * lerp(0.12, 0.2, a.cheekbones));
      cheek.position.set(side * w * lerp(0.5, 0.66, a.cheekbones), -headH * 0.02, -d * 0.5);
      head.add(cheek);
    });

    // Nose — a wedge, pointing -Z (forward).
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), skinMaterials.warm);
    nose.scale.set(
      headH * lerp(0.07, 0.12, a.noseSize),
      headH * lerp(0.16, 0.27, a.noseSize),
      headH * lerp(0.1, 0.17, a.noseSize),
    );
    nose.rotation.x = Math.PI * 0.62;
    const noseY = headH * lerp(-0.065, 0.07, a.noseHeight ?? 0.5);
    nose.position.set(0, noseY, -d * 0.78);
    head.add(nose);

    /* Eyes: sclera, iris and an upper lid.
       `eyeDepth` moves the whole eye along Z within the socket — a deep-set
       eye under a heavy brow and a shallow one read as different people, and
       it is one of the strongest identity cues available at this fidelity. */
    const sclera = eyeMaterials.sclera();
    const iris = eyeMaterials.iris(EYE_COLOURS[a.eyeColour] ?? EYE_COLOURS[0]);
    const pupilMaterial = eyeMaterials.pupil();
    const catchlightMaterial = eyeMaterials.catchlight();
    const spacing = w * lerp(0.3, 0.44, a.eyeSpacing);
    const eyeY = headH * lerp(-0.005, 0.085, a.eyeHeight ?? 0.5);
    const eyeR = headH * lerp(0.036, 0.056, a.eyeSize);
    const setBack = -d * lerp(0.70, 0.54, a.eyeDepth);

    this.eyelids = [];
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 9), sclera);
      eye.position.set(side * spacing, eyeY, setBack);
      head.add(eye);

      const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.58, 9, 7), iris);
      irisMesh.position.set(side * spacing, eyeY, setBack - eyeR * 0.72);
      head.add(irisMesh);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.26, 8, 6), pupilMaterial);
      pupil.position.set(side * spacing, eyeY, setBack - eyeR * 1.08);
      head.add(pupil);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.095, 6, 5), catchlightMaterial);
      catchlight.position.set(side * spacing - eyeR * 0.16, eyeY + eyeR * 0.27, setBack - eyeR * 1.29);
      head.add(catchlight);

      // Upper lid: a skin cap over the eye, rotated down to blink.
      const lidPivot = new THREE.Object3D();
      lidPivot.position.set(side * spacing, eyeY, setBack);
      head.add(lidPivot);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(eyeR * 1.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        skin,
      );
      lidPivot.add(lid);
      lidPivot.rotation.x = -0.28;   // resting, showing most of the eye
      this.eyelids.push(lidPivot);
    });

    // Nose bridge — the ridge between the brows, separate from the tip.
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skin);
    bridge.scale.set(
      headH * lerp(0.035, 0.062, a.noseBridge),
      headH * 0.17,
      headH * lerp(0.05, 0.1, a.noseBridge),
    );
    bridge.position.set(0, headH * 0.075, -d * 0.72);
    head.add(bridge);

    // Ears.
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), skinMaterials.warm);
      ear.scale.set(headH * 0.04, headH * lerp(0.09, 0.15, a.earSize), headH * 0.08);
      ear.position.set(side * w * 0.98, headH * 0.02, 0);
      head.add(ear);
    });

    /* Mouth: an upper and lower lip either side of a recessed line, both
       driven by `mouthWidth` and `lipFullness`. Two thin ellipsoids are
       enough — the shape of the mouth reads long before any detail in it. */
    const mouthW = w * lerp(0.30, 0.56, a.mouthWidth);
    const lipT = headH * lerp(0.012, 0.036, a.lipFullness);
    const lipMat = skinMaterials.lip;
    const mouthY = headH * lerp(-0.21, -0.105, a.mouthHeight ?? 0.5);
    const mouthZ = -d * 0.70;

    const gap = new THREE.Mesh(
      new THREE.BoxGeometry(mouthW * 2, headH * 0.014, headH * 0.02),
      skinMaterials.maw,
    );
    gap.position.set(0, mouthY, mouthZ - headH * 0.004);
    head.add(gap);

    [1, -1].forEach((which) => {
      const lip = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), lipMat);
      lip.scale.set(mouthW, lipT * (which > 0 ? 1 : 1.2), headH * 0.035);
      lip.position.set(0, mouthY + which * (lipT * 1.15), mouthZ);
      head.add(lip);
    });

    this.buildHair(head, headH, w, d, a);
    this.buildFaceMarks(head, headH, w, d, a);
  }

  buildHair(head, headH, w, d, a) {
    this.hairFalls = [];
    if (a.hairStyle === "bare") return;
    const colour = HAIR_COLOURS[a.hairColour] ?? HAIR_COLOURS[2];
    const hairMat = hairMaterial(colour, {
      coarse: a.hairTexture === "coiled" ? 0.9 : a.hairTexture === "curled" ? 0.65 : 0.3,
    });
    const len = lerp(0.5, 1.9, a.hairLength);
    const puff = a.hairTexture === "coiled" ? 1.28
      : a.hairTexture === "curled" ? 1.16
      : a.hairTexture === "wavy" ? 1.07 : 1.0;

    // Skull cap, always present when not bare.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    cap.scale.set(w * 1.07 * puff, headH * 0.43 * puff, d * 1.07 * puff);
    cap.position.y = headH * 0.11;
    cap.castShadow = true;
    head.add(cap);

    this.hairFalls = this.hairFalls ?? [];
    const addFall = (x, z, length, radius) => {
      const fall = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 0.7, length, 8),
        hairMat,
      );
      fall.position.set(x, headH * 0.18 - length / 2, z);
      fall.castShadow = true;
      // Pivot at the scalp so the length swings rather than sliding.
      const pivot = new THREE.Object3D();
      pivot.position.set(x, headH * 0.18, z);
      fall.position.set(0, -length / 2, 0);
      pivot.add(fall);
      head.add(pivot);
      this.hairFalls.push(pivot);
    };

    switch (a.hairStyle) {
      case "bound-tail":
        addFall(0, d * 0.86, headH * 1.5 * len, headH * 0.1 * puff);
        break;
      case "long-braid":
        addFall(0, d * 0.8, headH * 2.4 * len, headH * 0.09);
        break;
      case "loose-waves":
        addFall(-w * 0.86, d * 0.34, headH * 1.7 * len, headH * 0.13 * puff);
        addFall(w * 0.86, d * 0.34, headH * 1.7 * len, headH * 0.13 * puff);
        addFall(0, d * 0.82, headH * 1.5 * len, headH * 0.14 * puff);
        break;
      case "matted-locks":
        for (let i = 0; i < 7; i += 1) {
          const ang = (i / 7) * Math.PI * 1.5 + Math.PI * 0.25;
          addFall(Math.cos(ang) * w * 0.8, Math.sin(ang) * d * 0.8, headH * (1.1 + (i % 3) * 0.4) * len, headH * 0.055);
        }
        break;
      case "fur-lined-braids":
        addFall(-w * 0.8, d * 0.5, headH * 1.6 * len, headH * 0.085);
        addFall(w * 0.8, d * 0.5, headH * 1.6 * len, headH * 0.085);
        break;
      case "shaved-sides":
        cap.scale.set(w * 0.52, headH * 0.6 * puff, d * 1.05);
        addFall(0, d * 0.7, headH * 1.1 * len, headH * 0.09);
        break;
      default: // cropped — cap only
        break;
    }

    // Facial hair.
    if (a.facialHair !== "none") {
      const beardMat = facialHairMaterial(colour);
      const cfg = {
        stubble: { h: 0.1, r: 0.98, z: 0.0 },
        "short-beard": { h: 0.24, r: 1.0, z: 0.02 },
        "full-beard": { h: 0.5, r: 1.04, z: 0.04 },
        "braided-beard": { h: 0.72, r: 0.9, z: 0.06 },
        moustache: { h: 0.07, r: 0.6, z: 0.0 },
      }[a.facialHair] ?? { h: 0.2, r: 1, z: 0 };

      const beard = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), beardMat);
      beard.scale.set(w * 0.82 * cfg.r, headH * (0.2 + cfg.h), d * 0.7);
      beard.position.set(
        0,
        -headH * (0.18 + cfg.h * 0.55),
        -d * (0.18 - cfg.z),
      );
      beard.castShadow = true;
      head.add(beard);

      if (a.facialHair === "moustache") {
        beard.scale.set(w * 0.4, headH * 0.05, headH * 0.06);
        beard.position.set(0, -headH * 0.115, -d * 0.7);
      }
    }
  }

  /** Ritual paint, ash, ochre and scars — surface, applied as thin geometry. */
  buildFaceMarks(head, headH, w, d, a) {
    const marking = MARKINGS.find((m) => m.id === a.marking);
    if (marking && marking.id !== "none") {
      const markMat = pigmentMaterial(marking.colour);
      if (marking.id === "ash-mask") {
        const band = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), markMat);
        band.scale.set(w * 1.01, headH * 0.15, d * 0.72);
        band.position.set(0, headH * 0.05, -d * 0.28);
        head.add(band);
      } else {
        const count = marking.id === "ancestor-tally" ? 5 : 3;
        for (let i = 0; i < count; i += 1) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(w * 1.45, headH * 0.026, headH * 0.018),
            markMat,
          );
          stripe.position.set(0, headH * (0.07 - i * 0.062), -d * 0.66);
          stripe.rotation.z = marking.id === "sun-rays" ? (i - 1) * 0.16 : 0;
          head.add(stripe);
        }
      }
    }

    const scar = SCARS.find((s) => s.id === a.scar);
    if (scar && scar.id !== "none") {
      const scarMat = this.skinMaterials.scar;
      const place = {
        brow: [w * 0.4, headH * 0.13, -d * 0.66, 0.5],
        cheek: [-w * 0.5, -headH * 0.02, -d * 0.6, 1.1],
        jaw: [w * 0.5, -headH * 0.2, -d * 0.45, 0.3],
        throat: [0, -headH * 0.42, -d * 0.5, 0.2],
      }[scar.id];
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(headH * 0.02, headH * 0.22, headH * 0.02),
        scarMat,
      );
      line.position.set(place[0], place[1], place[2]);
      line.rotation.z = place[3];
      head.add(line);
    }
  }

  /** Culture adornments and the class silhouette prop. */
  buildAdornments(chest, hips, headUnit, shoulderW, culture, archetype, a, ctx = {}) {
    const { torsoLen = 0.5, hipSpan = 0.3, fur, clothDark, leather } = ctx;
    const accent = mat(culture.palette.accent, 0.5, {
      emissive: new THREE.Color(culture.palette.accent),
      emissiveIntensity: 0.18,
      metalness: 0.25,
    });
    const bone = boneMaterial("#d8cfba");
    const wood = woodMaterial("#4a3a28", { handled: .65 });

    // Neck adornment — shell/bone/greenstone, both cultures wear something.
    const torc = new THREE.Mesh(
      new THREE.TorusGeometry(headUnit * 0.24, headUnit * 0.03, 8, 24),
      a.culture === "aurean" ? accent : bone,
    );
    torc.rotation.x = Math.PI / 2;
    torc.position.y = headUnit * 1.62;
    chest.add(torc);

    const sil = archetype.silhouette ?? {};

    // Cloak / hood across the shoulders.
    if (sil.cloak) {
      const long = sil.cloak === "long" || sil.cloak === "flowing";
      /* A cape hangs from the shoulders and trails behind. It is pivoted at
         the top so `animate()` can swing it — a cape rigid to the spine is the
         classic tell that nothing on a character is simulated. */
      const cloakPivot = new THREE.Object3D();
      cloakPivot.position.set(0, torsoLen * 0.34, hipSpan * 0.16);
      chest.add(cloakPivot);
      this.capePivot = cloakPivot;

      const cloak = new THREE.Mesh(
        new THREE.CylinderGeometry(
          shoulderW * 0.44, shoulderW * (long ? 0.86 : 0.62),
          headUnit * (long ? 3.6 : 2.0), 16, 3, true,
          -Math.PI * 0.58, Math.PI * 1.16,
        ),
        clothMaterial(culture.palette.cloth[2] ?? "#7d6f5c", { worn: .82 }),
      );
      cloak.material.side = THREE.DoubleSide;
      cloak.position.y = -headUnit * (long ? 1.8 : 1.0);
      cloak.castShadow = true;
      cloakPivot.add(cloak);

      // Shoulder mantle covering the clasp line.
      const mantle = new THREE.Mesh(
        new THREE.SphereGeometry(shoulderW * 0.5, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        a.culture === "veyr" ? fur : clothMaterial(culture.palette.cloth[1] ?? "#7d6f5c", { worn: .78 }),
      );
      mantle.scale.set(1, 0.62, 0.9);
      mantle.position.y = torsoLen * 0.33;
      mantle.castShadow = true;
      chest.add(mantle);
    }

    if (sil.hood) {
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(headUnit * 0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        clothMaterial(culture.palette.cloth[1], { worn: .8 }),
      );
      hood.position.y = headUnit * 2.1;
      hood.rotation.x = -0.2;
      hood.castShadow = true;
      chest.add(hood);
    }

    if (sil.pack) {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(shoulderW * 0.52, headUnit * 0.85, headUnit * 0.34),
        hideMaterial("#5a4433", { supple: .3 }),
      );
      pack.position.set(0, headUnit * 0.55, headUnit * 0.62);
      pack.castShadow = true;
      chest.add(pack);
    }

    // The held prop rides in the right hand, so it swings with the arm.
    const wrist = this.joints.wristR;
    if (!wrist) return;

    const haft = (len, r, material) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 7), material);
      m.castShadow = true;
      return m;
    };

    if (sil.spear) {
      const shaft = haft(headUnit * 8.2, headUnit * 0.045, wood);
      shaft.rotation.x = 0.28;
      shaft.position.set(0, -headUnit * 1.4, 0);
      wrist.add(shaft);
      const point = new THREE.Mesh(new THREE.ConeGeometry(headUnit * 0.11, headUnit * 0.62, 4), bone);
      point.position.y = headUnit * 4.4;
      shaft.add(point);
    } else if (sil.staff) {
      const shaft = haft(headUnit * 7.6, headUnit * 0.05, wood);
      shaft.rotation.x = 0.1;
      shaft.position.set(0, -headUnit * 1.2, 0);
      wrist.add(shaft);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(headUnit * 0.26, 0), accent);
      crown.position.y = headUnit * 3.9;
      shaft.add(crown);
    } else if (sil.blade) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(headUnit * 0.13, headUnit * 2.7, headUnit * 0.05),
        flintMaterial("#34343a"),
      );
      blade.position.set(0, -headUnit * 1.5, 0);
      blade.castShadow = true;
      wrist.add(blade);
    } else if (sil.maul) {
      const shaft = haft(headUnit * 3.4, headUnit * 0.06, wood);
      shaft.position.set(0, -headUnit * 1.1, 0);
      wrist.add(shaft);
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(headUnit * 0.42, 0), stoneMaterial("#6d6b67"));
      stone.position.y = -headUnit * 1.9;
      shaft.add(stone);
    } else if (sil.daggers) {
      const dagger = new THREE.Mesh(
        new THREE.ConeGeometry(headUnit * 0.09, headUnit * 1.1, 4),
        flintMaterial("#2e2c33"),
      );
      dagger.rotation.x = Math.PI;
      dagger.position.set(0, -headUnit * 0.75, 0);
      wrist.add(dagger);
    }

    if (sil.shield) {
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(headUnit * 1.15, headUnit * 1.15, headUnit * 0.1, 12),
        woodMaterial("#5a4433", { handled: .45 }),
      );
      shield.rotation.set(Math.PI / 2, 0, 0.2);
      shield.position.set(0, -headUnit * 0.9, headUnit * 0.25);
      shield.castShadow = true;
      this.joints.wristL?.add(shield);
    }
  }

  /* -------------------------------------------------------------- animation */

  /**
   * Procedural locomotion. Blends idle → walk → run from `speed01`.
   * Replaced wholesale by an AnimationMixer when a rigged model arrives.
   */
  animate(dt, speed01 = 0, airborne = false) {
    const j = this.joints;
    if (!j.hips) return;

    const gait = THREE.MathUtils.clamp(speed01, 0, 1);
    // Stride frequency rises with speed; amplitude too, but not linearly.
    this.phase += dt * lerp(1.6, 9.2, gait);
    const t = this.phase;
    const swing = lerp(0.06, 0.92, gait);
    const armSwing = lerp(0.05, 0.72, gait);

    const breathe = Math.sin(t * 0.55) * 0.02;

    // Legs — opposed.
    if (j.thighL && j.thighR) {
      j.thighL.rotation.x = Math.sin(t) * swing;
      j.thighR.rotation.x = -Math.sin(t) * swing;
      // Knees only bend backwards, and mostly on the recovery half of the step.
      j.kneeL.rotation.x = -Math.max(0, Math.sin(t + Math.PI * 0.5)) * swing * 1.15 - 0.04;
      j.kneeR.rotation.x = -Math.max(0, Math.sin(t + Math.PI * 1.5)) * swing * 1.15 - 0.04;
      j.ankleL.rotation.x = -Math.sin(t) * swing * 0.3;
      j.ankleR.rotation.x = Math.sin(t) * swing * 0.3;
    }

    // Arms — counter-swing to the legs.
    if (j.shoulderL && j.shoulderR) {
      j.shoulderL.rotation.x = -Math.sin(t) * armSwing - 0.06;
      j.shoulderR.rotation.x = Math.sin(t) * armSwing - 0.06;
      j.elbowL.rotation.x = -0.18 - Math.abs(Math.sin(t)) * armSwing * 0.55;
      j.elbowR.rotation.x = -0.18 - Math.abs(Math.sin(t)) * armSwing * 0.55;
    }

    // Torso counter-rotation and the vertical bob of a real gait.
    if (j.spine) {
      j.spine.rotation.y = -Math.sin(t) * gait * 0.13;
      j.spine.rotation.x = gait * 0.14 + breathe; // lean into a run
    }
    if (j.chest) j.chest.rotation.y = Math.sin(t) * gait * 0.09;
    if (j.head) {
      j.head.rotation.y = -Math.sin(t) * gait * 0.05;
      j.head.rotation.x = -gait * 0.1;
    }

    // Two footfalls per stride cycle.
    const bob = Math.abs(Math.cos(t)) * lerp(0.004, 0.045, gait);
    j.hips.position.y = this.hipRest ?? (this.hipRest = j.hips.position.y);
    j.hips.position.y = this.hipRest - bob + (airborne ? 0.05 : 0);

    this.animateSecondary(dt, gait, t);
  }

  /**
   * Secondary motion: breath, blinking, and lag on hair and cape.
   *
   * None of this is simulation — it is phase-offset sine driven by the same
   * gait clock. That is enough, because what sells a figure as alive is that
   * loose things arrive *after* the body does, not that the physics is real.
   */
  animateSecondary(dt, gait, t) {
    const j = this.joints;

    // Breathing, always present, slower and deeper when standing still.
    this.breath = (this.breath ?? 0) + dt * lerp(0.9, 2.4, gait);
    if (j.chest) {
      const swell = 1 + Math.sin(this.breath) * lerp(0.012, 0.03, gait);
      j.chest.scale.set(swell, 1, swell);
    }

    // Blinking: mostly closed for a fraction of a second, at irregular gaps.
    this.blinkTimer = (this.blinkTimer ?? 2) - dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.4 + Math.random() * 3.6;
      this.blinkPhase = 0.16;
    }
    if (this.blinkPhase > 0) this.blinkPhase -= dt;
    const shut = Math.max(0, this.blinkPhase) / 0.16;
    this.eyelids?.forEach((lid) => {
      lid.rotation.x = -0.28 + shut * 1.9;
    });

    // Hair lags the head and lifts with speed.
    this.hairFalls?.forEach((fall, i) => {
      const phase = t - i * 0.35;
      fall.rotation.x = -gait * 0.5 + Math.sin(phase * 0.8) * lerp(0.02, 0.14, gait);
      fall.rotation.z = Math.sin(phase * 0.55 + i) * lerp(0.015, 0.1, gait);
    });

    // The cape trails: pushed back by travel, swinging across the stride.
    if (this.capePivot) {
      const target = -gait * 0.42 + Math.sin(t * 0.5) * lerp(0.015, 0.09, gait);
      this.capeSwing = (this.capeSwing ?? 0) + (target - (this.capeSwing ?? 0)) * Math.min(1, dt * 5);
      this.capePivot.rotation.x = this.capeSwing;
      this.capePivot.rotation.z = Math.sin(t) * gait * 0.07;
    }
  }

  /** Idle-only pose, for the character-creation turntable. */
  poseForPreview() {
    this.animate(0.016, 0);
    const j = this.joints;
    if (j.spine) j.spine.rotation.x = 0.02;
    if (j.head) j.head.rotation.x = 0;
  }
}
