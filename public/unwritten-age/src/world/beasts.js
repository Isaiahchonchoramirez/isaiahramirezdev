import * as THREE from "three";
import { makeRng } from "../noise.js";

/**
 * Procedural creature bodies.
 *
 * Same contract as the humanoid: one data record per species, one builder, and
 * a named joint map so the meshes can be swapped for rigged models later
 * without touching spawning, AI or combat.
 *
 * The skeleton is generic on purpose — spine segments, a neck chain, a tail
 * chain, four limbs, and optional attachments — so a mammoth, a great cat, a
 * crested saurian and a feathered serpent are all the same code with different
 * numbers. That is what makes these easy for you to go in and re-proportion:
 * change the record, not the builder.
 *
 * Required format if you replace these with real models: glTF 2.0 (.glb),
 * Y-up, -Z forward, metre scale, origin between the front feet, joints named
 * as in `joints` below, idle/walk/charge clips without root motion.
 */

const lerp = (a, b, t) => a + (b - a) * t;

function mat(colour, rough = 0.92, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colour), roughness: rough, metalness: 0, ...opts,
  });
}

function seg(material, topR, botR, len, sides = 8) {
  const g = new THREE.CylinderGeometry(topR, botR, len, sides);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

/**
 * Species records.
 *
 * `kind` picks the silhouette family:
 *   graviped  — heavy four-legged browser (mammoth-shaped)
 *   prowler   — low, fast quadruped (great cat)
 *   strider   — tall two-legged saurian
 *   serpent   — long-necked, long-tailed, optional wings
 *
 * `mythic: true` means the thing is remembered rather than merely alive — the
 * Chronicle can erase these, and they read with faint self-light.
 */
export const BEASTS = {
  tuskedWanderer: {
    id: "tuskedWanderer",
    name: "Tusked Wanderer",
    kind: "graviped",
    lore: "The valley's largest neighbour. Grazes, ignores you, and will not be ignored.",
    length: 5.2, height: 3.4, mass: 1.0,
    hide: "#5b4a3a", under: "#6e5a45", accent: "#d8cfba",
    fur: true, tusks: true, trunk: true,
    hp: 900, damage: 34, speed: 2.2, xp: 420, remembrance: 26,
    practice: "tracking",
  },
  paleStalker: {
    id: "paleStalker",
    name: "Pale Stalker",
    kind: "prowler",
    lore: "Cold-country cat. You will hear it once, afterwards.",
    length: 2.9, height: 1.5, mass: 0.55,
    hide: "#b3a58c", under: "#cbbfa6", accent: "#3b352c",
    fur: true, fangs: true,
    hp: 340, damage: 26, speed: 7.6, xp: 210, remembrance: 14,
    practice: "tracking",
  },
  antleredKing: {
    id: "antleredKing",
    name: "Antlered King",
    kind: "graviped",
    lore: "Carries more bone above its head than most people own in a lifetime.",
    length: 3.6, height: 2.5, mass: 0.7,
    hide: "#7a6144", under: "#8d7455", accent: "#d6cdb8",
    fur: true, antlers: true,
    hp: 460, damage: 22, speed: 5.4, xp: 260, remembrance: 16,
    practice: "tracking",
  },

  /* ---- remembered things. Older than anything alive; erasable. ---- */
  crestedGrievance: {
    id: "crestedGrievance",
    name: "Crested Grievance",
    kind: "strider",
    lore:
      "Nobody has seen one. Everybody's grandmother describes the same crest, " +
      "the same three-toed print, the same sound before the rain.",
    length: 6.5, height: 4.2, mass: 0.9,
    hide: "#4a5340", under: "#6d7355", accent: "#c2603a",
    crest: true, fangs: true, mythic: true,
    hp: 1400, damage: 52, speed: 6.2, xp: 900, remembrance: 60,
    practice: "starreading",
  },
  riverCoil: {
    id: "riverCoil",
    name: "River Coil",
    kind: "serpent",
    lore:
      "Every people along the water tells it differently and draws it the same. " +
      "It is said to be owed something, and to be patient about collecting.",
    length: 9.0, height: 2.6, mass: 0.6,
    hide: "#37505a", under: "#7fa8b4", accent: "#cfe4ff",
    wings: true, frill: true, mythic: true,
    hp: 1800, damage: 46, speed: 5.0, xp: 1200, remembrance: 80,
    practice: "starreading",
  },
};

export const BEAST_IDS = Object.keys(BEASTS);

export class Beast {
  constructor(species) {
    this.species = species;
    this.root = new THREE.Group();
    this.root.name = `beast:${species.id}`;
    this.joints = {};
    this.parts = new THREE.Group();
    this.root.add(this.parts);
    this.phase = Math.random() * 6.28;
    this.build();
  }

  dispose() {
    this.parts.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose());
    });
    this.parts.clear();
    this.joints = {};
  }

  build() {
    const s = this.species;
    const rng = makeRng(s.id.length * 977);

    const emissive = s.mythic
      ? { emissive: new THREE.Color(s.accent), emissiveIntensity: 0.22 }
      : {};
    const hide = mat(s.hide, s.fur ? 1.0 : 0.82, emissive);
    const under = mat(s.under, s.fur ? 1.0 : 0.8, emissive);
    const bone = mat(s.accent, 0.7);

    this.hideMaterial = hide;

    const L = s.length;
    const H = s.height;
    const girth = H * 0.22 * lerp(0.8, 1.25, s.mass);

    /* ---- body: a chain of spine segments so it can bend */
    const spineCount = s.kind === "serpent" ? 7 : 4;
    const bodyY = s.kind === "strider" ? H * 0.55 : H * 0.62;
    const root = new THREE.Object3D();
    root.position.y = bodyY;
    this.parts.add(root);
    this.joints.spine0 = root;

    let node = root;
    const segLen = (L * (s.kind === "serpent" ? 0.42 : 0.5)) / spineCount;
    for (let i = 0; i < spineCount; i += 1) {
      const t = i / (spineCount - 1);
      // Barrel out at the shoulders and hips, narrow at the waist.
      const r = girth * lerp(1.0, 0.72, Math.abs(t - 0.45) * 1.6);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), hide);
      bead.scale.set(r * 0.92, r, segLen * 0.72);
      bead.castShadow = true;
      node.add(bead);

      const next = new THREE.Object3D();
      next.position.z = segLen;      // +Z is toward the tail
      node.add(next);
      this.joints[`spine${i + 1}`] = next;
      node = next;
    }
    const tailRoot = node;

    /* ---- neck + head, forward of the body (-Z) */
    const neckCount = s.kind === "serpent" ? 6 : 3;
    const neckLen = (s.kind === "serpent" ? L * 0.34 : L * 0.2) / neckCount;
    let neck = new THREE.Object3D();
    neck.position.z = -segLen * 0.4;
    neck.position.y = s.kind === "strider" ? girth * 0.5 : girth * 0.2;
    root.add(neck);
    this.joints.neck0 = neck;
    this.neckChain = [neck];

    for (let i = 0; i < neckCount; i += 1) {
      const r = girth * lerp(0.62, 0.34, i / neckCount);
      neck.add(seg(hide, r, r * 0.9, neckLen, 8).rotateX(Math.PI / 2));
      const next = new THREE.Object3D();
      next.position.z = -neckLen;
      neck.add(next);
      this.joints[`neck${i + 1}`] = next;
      this.neckChain.push(next);
      neck = next;
    }

    const head = new THREE.Object3D();
    neck.add(head);
    this.joints.head = head;
    this.buildHead(head, s, girth, hide, under, bone, rng);

    /* ---- tail */
    const tailCount = s.kind === "serpent" ? 8 : 4;
    const tailLen = (s.kind === "serpent" ? L * 0.4 : L * 0.24) / tailCount;
    let tail = tailRoot;
    this.tailChain = [];
    for (let i = 0; i < tailCount; i += 1) {
      const r = girth * lerp(0.55, 0.08, i / tailCount);
      tail.add(seg(hide, r, r * 0.7, tailLen, 7).rotateX(-Math.PI / 2));
      const next = new THREE.Object3D();
      next.position.z = tailLen;
      tail.add(next);
      this.joints[`tail${i}`] = next;
      this.tailChain.push(next);
      tail = next;
    }

    /* ---- limbs */
    const biped = s.kind === "strider" || s.kind === "serpent";
    const legPairs = biped ? [{ z: -segLen * 0.2, hind: true }]
      : [{ z: -segLen * 0.5, hind: false }, { z: segLen * (spineCount - 1.4), hind: true }];

    this.legs = [];
    legPairs.forEach((pair) => {
      [-1, 1].forEach((side) => {
        const hipJoint = new THREE.Object3D();
        hipJoint.position.set(side * girth * 0.78, 0, pair.z);
        root.add(hipJoint);

        const upper = H * (pair.hind ? 0.34 : 0.30);
        const lower = H * (pair.hind ? 0.30 : 0.28);
        const thick = girth * (s.kind === "prowler" ? 0.26 : 0.34);

        hipJoint.add(seg(hide, thick, thick * 0.78, upper, 8));
        const knee = new THREE.Object3D();
        knee.position.y = -upper;
        hipJoint.add(knee);
        knee.add(seg(under, thick * 0.74, thick * 0.5, lower, 7));

        const ankle = new THREE.Object3D();
        ankle.position.y = -lower;
        knee.add(ankle);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), under);
        foot.scale.set(thick * 1.5, H * 0.07, thick * 2.4);
        foot.position.set(0, -H * 0.035, -thick * 0.5);
        foot.castShadow = true;
        ankle.add(foot);

        // Hind legs of a biped fold forward; a straight column looks wrong.
        if (biped) { hipJoint.rotation.x = 0.4; knee.rotation.x = -0.8; ankle.rotation.x = 0.42; }

        const tag = `${pair.hind ? "hind" : "fore"}${side < 0 ? "L" : "R"}`;
        this.joints[tag] = hipJoint;
        this.legs.push({ hip: hipJoint, knee, ankle, side, hind: pair.hind });
      });
    });

    /* ---- attachments */
    if (s.wings) this.buildWings(root, s, girth, hide, bone);
    if (s.fur) this.buildFur(root, s, girth, segLen, spineCount, hide, rng);

    this.height = H;
    this.capsule = { radius: girth * 1.1, height: H };
  }

  buildHead(head, s, girth, hide, under, bone, rng) {
    const skullLen = s.height * (s.kind === "graviped" ? 0.30 : 0.34);
    const skullR = girth * (s.kind === "graviped" ? 0.42 : 0.32);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), hide);
    skull.scale.set(skullR, skullR * 0.9, skullLen * 0.62);
    skull.position.z = -skullLen * 0.3;
    skull.castShadow = true;
    head.add(skull);

    // Snout, tapering forward.
    const snout = new THREE.Mesh(
      new THREE.CylinderGeometry(skullR * 0.72, skullR * 0.42, skullLen * 0.9, 8),
      hide,
    );
    snout.rotation.x = Math.PI / 2;
    snout.position.z = -skullLen * 0.9;
    snout.castShadow = true;
    head.add(snout);

    // Eyes — set wide, low emissive on mythic things only.
    const eyeMat = mat(s.mythic ? s.accent : "#231c14", 0.3,
      s.mythic ? { emissive: new THREE.Color(s.accent), emissiveIntensity: 1.4 } : {});
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(skullR * 0.17, 8, 6), eyeMat);
      eye.position.set(side * skullR * 0.72, skullR * 0.28, -skullLen * 0.55);
      head.add(eye);
    });

    if (s.trunk) {
      let node = head;
      for (let i = 0; i < 5; i += 1) {
        const r = skullR * lerp(0.34, 0.12, i / 5);
        const piece = seg(hide, r, r * 0.85, skullLen * 0.32, 7);
        piece.rotation.x = 0.5 + i * 0.22;   // curls down and under
        piece.position.z = -skullLen * 1.2;
        node.add(piece);
        const next = new THREE.Object3D();
        next.position.set(0, -skullLen * 0.26, -skullLen * 0.05);
        node.add(next);
        node = next;
      }
    }

    if (s.tusks) {
      [-1, 1].forEach((side) => {
        const tusk = new THREE.Mesh(
          new THREE.TorusGeometry(s.height * 0.32, skullR * 0.12, 6, 14, Math.PI * 0.9),
          bone,
        );
        tusk.position.set(side * skullR * 0.6, -skullR * 0.2, -skullLen * 1.1);
        tusk.rotation.set(Math.PI * 0.5, side * 0.3, side * 2.1);
        tusk.castShadow = true;
        head.add(tusk);
      });
    }

    if (s.antlers) {
      [-1, 1].forEach((side) => {
        const beam = seg(bone, skullR * 0.13, skullR * 0.08, s.height * 0.5, 6);
        beam.position.set(side * skullR * 0.45, skullR * 0.6, -skullLen * 0.2);
        beam.rotation.set(-0.4, 0, side * -0.75);
        head.add(beam);
        for (let t = 0; t < 4; t += 1) {
          const tine = seg(bone, skullR * 0.07, skullR * 0.03, s.height * 0.2, 5);
          tine.position.set(side * (skullR * 0.9 + t * s.height * 0.11), skullR * 0.6 + t * s.height * 0.1, -skullLen * 0.2);
          tine.rotation.set(-0.5, 0, side * -1.15);
          head.add(tine);
        }
      });
    }

    if (s.crest) {
      const crest = new THREE.Mesh(
        new THREE.ConeGeometry(skullR * 1.5, s.height * 0.42, 3),
        mat(s.accent, 0.75),
      );
      crest.rotation.set(-0.5, 0, 0);
      crest.scale.z = 0.22;
      crest.position.set(0, skullR * 1.0, skullLen * 0.1);
      crest.castShadow = true;
      head.add(crest);
    }

    if (s.frill) {
      const frill = new THREE.Mesh(
        new THREE.CircleGeometry(skullR * 2.1, 9, 0, Math.PI),
        mat(s.accent, 0.8, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      );
      frill.position.set(0, skullR * 0.3, skullLen * 0.25);
      frill.rotation.x = -0.35;
      head.add(frill);
    }

    if (s.fangs) {
      [-1, 1].forEach((side) => {
        const fang = new THREE.Mesh(new THREE.ConeGeometry(skullR * 0.1, skullR * 0.62, 5), bone);
        fang.rotation.x = Math.PI;
        fang.position.set(side * skullR * 0.3, -skullR * 0.45, -skullLen * 1.15);
        head.add(fang);
      });
    }
  }

  buildWings(root, s, girth, hide, bone) {
    this.wings = [];
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Object3D();
      pivot.position.set(side * girth * 0.6, girth * 0.5, -girth * 0.2);
      root.add(pivot);

      const span = s.length * 0.42;
      const membrane = new THREE.Mesh(
        new THREE.CircleGeometry(span, 7, 0, Math.PI * 0.85),
        mat(s.under, 0.9, { transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
      );
      membrane.rotation.set(Math.PI / 2, 0, side * 0.4);
      membrane.scale.set(1, 0.62, 1);
      pivot.add(membrane);

      for (let f = 0; f < 4; f += 1) {
        const rib = seg(bone, girth * 0.05, girth * 0.02, span * (0.95 - f * 0.12), 5);
        rib.rotation.set(Math.PI / 2, 0, side * (0.15 + f * 0.32));
        pivot.add(rib);
      }
      this.wings.push({ pivot, side });
    });
  }

  /** Shaggy coat: rings of tapered spikes. Cheap, and reads as fur in silhouette. */
  buildFur(root, s, girth, segLen, spineCount, hide, rng) {
    const coat = mat(s.hide, 1.0);
    for (let i = 0; i < spineCount; i += 1) {
      const node = this.joints[`spine${i}`];
      if (!node) continue;
      const count = 10;
      for (let k = 0; k < count; k += 1) {
        const a = (k / count) * Math.PI * 2;
        const tuft = new THREE.Mesh(
          new THREE.ConeGeometry(girth * 0.13, girth * (0.5 + rng() * 0.7), 4),
          coat,
        );
        tuft.position.set(Math.cos(a) * girth * 0.9, Math.sin(a) * girth * 0.9, 0);
        tuft.rotation.set(Math.PI, 0, -a + Math.PI / 2);
        node.add(tuft);
      }
    }
  }

  /** Gait, breath and idle sway. `speed01` blends stand → walk → run. */
  animate(dt, speed01 = 0) {
    const g = THREE.MathUtils.clamp(speed01, 0, 1);
    this.phase += dt * lerp(1.1, 6.2, g);
    const t = this.phase;
    const swing = lerp(0.05, 0.62, g);

    this.legs?.forEach((leg, i) => {
      // Diagonal pairs, the way four-legged animals actually move.
      const off = (leg.hind ? Math.PI : 0) + (leg.side < 0 ? 0 : Math.PI);
      leg.hip.rotation.x = Math.sin(t + off) * swing + (leg.hind && this.species.kind !== "graviped" ? 0.4 : 0);
      leg.knee.rotation.x = -Math.max(0, Math.sin(t + off + 1.2)) * swing * 0.9;
    });

    // Neck and tail lag behind the body — the thing that reads as weight.
    this.neckChain?.forEach((n, i) => {
      n.rotation.x = Math.sin(t * 0.5 - i * 0.4) * lerp(0.02, 0.07, g);
      n.rotation.y = Math.sin(t * 0.32 - i * 0.5) * lerp(0.03, 0.09, g);
    });
    this.tailChain?.forEach((n, i) => {
      n.rotation.y = Math.sin(t * 0.7 - i * 0.55) * lerp(0.04, 0.16, g);
      n.rotation.x = Math.sin(t * 0.4 - i * 0.3) * 0.03;
    });

    this.wings?.forEach((w) => {
      w.pivot.rotation.z = Math.sin(t * 0.8) * 0.14 * w.side;
      w.pivot.rotation.x = Math.sin(t * 0.8 + 0.6) * 0.1;
    });
  }
}

/** Scatter beasts across the valley, keeping mythic ones rare and remote. */
export function spawnBeasts(scene, groundY, worldSize) {
  const rng = makeRng(60607);
  const out = [];
  const plan = [
    ["tuskedWanderer", 5], ["antleredKing", 7], ["paleStalker", 4],
    ["crestedGrievance", 2], ["riverCoil", 1],
  ];

  plan.forEach(([id, count]) => {
    const species = BEASTS[id];
    let placed = 0, guard = 0;
    while (placed < count && guard < 3000) {
      guard += 1;
      const x = (rng() - 0.5) * worldSize * 0.72;
      const z = (rng() - 0.5) * worldSize * 0.72;
      if (x * x + z * z < 4900) continue;               // not in camp
      if (species.mythic && x * x + z * z < 14000) continue; // remembered things keep away
      const y = groundY(x, z);
      if (y < 3.2) continue;

      const beast = new Beast(species);
      beast.root.position.set(x, y, z);
      beast.root.rotation.y = rng() * Math.PI * 2;
      beast.hp = species.hp;
      beast.maxHp = species.hp;
      beast.dead = false;
      beast.home = new THREE.Vector2(x, z);
      beast.root.userData.beast = beast;
      scene.add(beast.root);
      out.push(beast);
      placed += 1;
    }
  });
  return out;
}
