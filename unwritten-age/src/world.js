import * as THREE from "three";
import { fbm, ridged, makeRng } from "./noise.js";

/**
 * The starter zone: a Late Pleistocene valley at the ice edge.
 *
 * Everything is procedural — there is no art budget — so the period has to be
 * carried by silhouette, palette and material rather than by texture work:
 * cold sedge and lichen instead of lawn green, birch and spruce instead of
 * generic conifers, glacial rock and snow-fill in the hollows, and a camp
 * built only from things people actually had in 20,000 BCE: hide, timber,
 * bone, antler, fibre, stone, ochre.
 *
 * Deliberately absent: masonry, metal, wheels, sawn planks, right angles.
 */

export const WORLD_SIZE = 460;
const SEGMENTS = 320;
export const WATER_LEVEL = 2.6;

/* Landmark anchors, shared so terrain and props agree on where things are. */
export const SANCTUARY = { x: 96, z: -78 };
export const CAMP = { x: 0, z: 0 };

export function heightAt(x, z) {
  const nx = x / 190;
  const nz = z / 190;

  let h = fbm(nx * 2.1, nz * 2.1, 5, 1337) * 20 - 6;

  // Glacial peaks ringing the valley.
  const d = Math.sqrt(x * x + z * z) / (WORLD_SIZE * 0.5);
  const rim = Math.pow(Math.max(0, d - 0.52) / 0.48, 1.7);
  h += ridged(nx * 1.6, nz * 1.6, 4, 99) * 74 * rim;

  // A meltwater channel: the reason the camp is sited where it is.
  const river = Math.exp(-Math.pow((z - 62 - Math.sin(x * 0.018) * 16) / 13, 2));
  h -= river * 9.5;

  // Sheltered shelf the camp sits on, above the flood line.
  const shelf = Math.exp(-((x * x + z * z) / 3400));
  h = h * (1 - shelf * 0.58) + shelf * 10.5;

  // The sanctuary terrace.
  const tx = x - SANCTUARY.x;
  const tz = z - SANCTUARY.z;
  const terrace = Math.exp(-((tx * tx + tz * tz) / 2600));
  h = h * (1 - terrace) + terrace * 25.5;

  return h;
}

export function groundY(x, z) {
  return Math.max(heightAt(x, z), WATER_LEVEL - 0.35);
}

/* Cold-climate palette. No lawn green anywhere in it. */
const C = {
  water: new THREE.Color("#25404e"),
  silt: new THREE.Color("#7d7361"),
  gravel: new THREE.Color("#8b8478"),
  sedge: new THREE.Color("#6e6a45"),
  moss: new THREE.Color("#4f5a3c"),
  heath: new THREE.Color("#5c5340"),
  rock: new THREE.Color("#63615c"),
  scree: new THREE.Color("#7a766e"),
  snow: new THREE.Color("#e6ecf2"),
  ice: new THREE.Color("#c2d8e6"),
};

function terrainColour(h, slope, x, z, target) {
  if (h < WATER_LEVEL + 0.5) return target.copy(C.silt).lerp(C.water, 0.4);
  if (h < WATER_LEVEL + 2.0) return target.copy(C.gravel);
  if (h > 62) return target.copy(C.ice).lerp(C.snow, 0.5);
  if (h > 42) return target.copy(C.snow).lerp(C.rock, Math.min(1, slope * 1.9));
  if (slope > 0.58) return target.copy(C.rock).lerp(C.scree, slope * 0.5);

  const t = THREE.MathUtils.clamp((h - 4) / 34, 0, 1);
  target.copy(C.sedge).lerp(C.heath, t * 0.7).lerp(C.moss, slope * 0.9);
  const patch = fbm(x / 26, z / 26, 3, 707);
  if (patch > 0.62 && h > 12) target.lerp(C.snow, (patch - 0.62) * 2.6);
  return target;
}

export function buildTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  const colours = new Float32Array(pos.count * 3);
  const normal = geo.attributes.normal;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    terrainColour(pos.getY(i), 1 - normal.getY(i), pos.getX(i), pos.getZ(i), c);
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.97,
    metalness: 0,
  }));
  mesh.receiveShadow = true;
  mesh.name = "terrain";
  return mesh;
}

/** Meltwater: cold, reflective, faintly moving. */
export function buildWater() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE * 1.4, WORLD_SIZE * 1.4, 80, 80);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2b4d5e"),
    transparent: true,
    opacity: 0.86,
    roughness: 0.12,
    metalness: 0.62,
    flatShading: true,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>",
        `#include <begin_vertex>
         transformed.y += sin(transformed.x * 0.11 + uTime * 0.9) * 0.22
                        + sin(transformed.z * 0.15 - uTime * 0.7) * 0.16;`);
    mat.userData.shader = shader;
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_LEVEL;
  mesh.name = "water";
  return mesh;
}

/** Cold, pale sky — a low sun that never gets high at this latitude. */
export function buildSky() {
  const geo = new THREE.SphereGeometry(WORLD_SIZE * 1.15, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#2a3f5c") },
      uMid: { value: new THREE.Color("#8fa2b4") },
      uBottom: { value: new THREE.Color("#d9c3a8") },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = mix(uBottom, uMid, smoothstep(-0.06, 0.30, h));
        c = mix(c, uTop, smoothstep(0.22, 0.8, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "sky";
  return mesh;
}

/* ------------------------------------------------------------------ flora */

/**
 * Spruce, birch and low scrub, instanced.
 * Birch matters disproportionately: a bare pale trunk is the fastest visual
 * cue for "cold northern woodland" rather than "generic forest".
 */
export function buildScatter() {
  const group = new THREE.Group();
  const rng = makeRng(20260801);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const clearOfCamp = (x, z) => x * x + z * z > 2100;
  const clearOfSanctuary = (x, z) => {
    const tx = x - SANCTUARY.x, tz = z - SANCTUARY.z;
    return tx * tx + tz * tz > 3400;
  };

  /* --- spruce */
  const SPRUCE = 1100;
  const spruceTrunk = new THREE.CylinderGeometry(0.09, 0.17, 2.4, 5);
  spruceTrunk.translate(0, 1.2, 0);
  const spruceCrown = new THREE.ConeGeometry(1.15, 6.4, 7);
  spruceCrown.translate(0, 4.6, 0);

  const spruceTrunkMesh = new THREE.InstancedMesh(
    spruceTrunk,
    new THREE.MeshStandardMaterial({ color: "#3d3128", roughness: 1, flatShading: true }),
    SPRUCE,
  );
  const spruceCrownMesh = new THREE.InstancedMesh(
    spruceCrown,
    new THREE.MeshStandardMaterial({ color: "#3c4c3a", roughness: 0.96, flatShading: true }),
    SPRUCE,
  );

  let n = 0, guard = 0;
  while (n < SPRUCE && guard < SPRUCE * 40) {
    guard += 1;
    const x = (rng() - 0.5) * WORLD_SIZE * 0.94;
    const z = (rng() - 0.5) * WORLD_SIZE * 0.94;
    const h = heightAt(x, z);
    if (h < WATER_LEVEL + 2.6 || h > 38) continue;
    if (!clearOfCamp(x, z) || !clearOfSanctuary(x, z)) continue;
    if (h > 30 && rng() > 0.3) continue;

    const s = 0.62 + rng() * 0.85;
    dummy.position.set(x, h - 0.15, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(s * (0.85 + rng() * 0.3), s, s * (0.85 + rng() * 0.3));
    dummy.updateMatrix();
    spruceTrunkMesh.setMatrixAt(n, dummy.matrix);
    spruceCrownMesh.setMatrixAt(n, dummy.matrix);
    tint.setHSL(0.28 + rng() * 0.05, 0.16 + rng() * 0.12, 0.19 + rng() * 0.1);
    spruceCrownMesh.setColorAt(n, tint);
    n += 1;
  }
  spruceTrunkMesh.count = spruceCrownMesh.count = n;
  spruceTrunkMesh.instanceMatrix.needsUpdate = true;
  spruceCrownMesh.instanceMatrix.needsUpdate = true;
  if (spruceCrownMesh.instanceColor) spruceCrownMesh.instanceColor.needsUpdate = true;
  spruceTrunkMesh.castShadow = spruceCrownMesh.castShadow = true;
  group.add(spruceTrunkMesh, spruceCrownMesh);

  /* --- birch */
  const BIRCH = 420;
  const birchTrunk = new THREE.CylinderGeometry(0.07, 0.13, 5.2, 6);
  birchTrunk.translate(0, 2.6, 0);
  const birchCrown = new THREE.SphereGeometry(1.5, 7, 5);
  birchCrown.translate(0, 5.6, 0);

  const birchTrunkMesh = new THREE.InstancedMesh(
    birchTrunk,
    new THREE.MeshStandardMaterial({ color: "#cfc9bb", roughness: 0.9, flatShading: true }),
    BIRCH,
  );
  const birchCrownMesh = new THREE.InstancedMesh(
    birchCrown,
    new THREE.MeshStandardMaterial({
      color: "#7d7a4e", roughness: 1, flatShading: true, transparent: true, opacity: 0.9,
    }),
    BIRCH,
  );

  let b = 0; guard = 0;
  while (b < BIRCH && guard < BIRCH * 60) {
    guard += 1;
    const x = (rng() - 0.5) * WORLD_SIZE * 0.9;
    const z = (rng() - 0.5) * WORLD_SIZE * 0.9;
    const h = heightAt(x, z);
    if (h < WATER_LEVEL + 3 || h > 26) continue;
    if (!clearOfCamp(x, z) || !clearOfSanctuary(x, z)) continue;
    const s = 0.6 + rng() * 0.7;
    dummy.position.set(x, h - 0.1, z);
    dummy.rotation.set((rng() - 0.5) * 0.09, rng() * 6.28, (rng() - 0.5) * 0.09);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    birchTrunkMesh.setMatrixAt(b, dummy.matrix);
    birchCrownMesh.setMatrixAt(b, dummy.matrix);
    b += 1;
  }
  birchTrunkMesh.count = birchCrownMesh.count = b;
  birchTrunkMesh.instanceMatrix.needsUpdate = true;
  birchCrownMesh.instanceMatrix.needsUpdate = true;
  birchTrunkMesh.castShadow = true;
  group.add(birchTrunkMesh, birchCrownMesh);

  /* --- tundra scrub */
  const SCRUB = 2200;
  const scrubMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: "#5d5738", roughness: 1, flatShading: true }),
    SCRUB,
  );
  let sc = 0; guard = 0;
  while (sc < SCRUB && guard < SCRUB * 20) {
    guard += 1;
    const x = (rng() - 0.5) * WORLD_SIZE * 0.96;
    const z = (rng() - 0.5) * WORLD_SIZE * 0.96;
    const h = heightAt(x, z);
    if (h < WATER_LEVEL + 1.2 || h > 44) continue;
    dummy.position.set(x, h + 0.1, z);
    dummy.rotation.set(rng(), rng() * 6.28, rng());
    dummy.scale.set(0.5 + rng() * 1.3, 0.3 + rng() * 0.5, 0.5 + rng() * 1.3);
    dummy.updateMatrix();
    scrubMesh.setMatrixAt(sc, dummy.matrix);
    tint.setHSL(0.13 + rng() * 0.06, 0.16 + rng() * 0.14, 0.16 + rng() * 0.1);
    scrubMesh.setColorAt(sc, tint);
    sc += 1;
  }
  scrubMesh.count = sc;
  scrubMesh.instanceMatrix.needsUpdate = true;
  if (scrubMesh.instanceColor) scrubMesh.instanceColor.needsUpdate = true;
  group.add(scrubMesh);

  /* --- glacial erratics and scree */
  const ROCKS = 620;
  const rockMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: "#66635d", roughness: 1, flatShading: true }),
    ROCKS,
  );
  let r = 0; guard = 0;
  while (r < ROCKS && guard < 24000) {
    guard += 1;
    const x = (rng() - 0.5) * WORLD_SIZE * 0.96;
    const z = (rng() - 0.5) * WORLD_SIZE * 0.96;
    const h = heightAt(x, z);
    if (h < WATER_LEVEL - 0.5) continue;
    dummy.position.set(x, h + 0.15, z);
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    dummy.scale.set(0.5 + rng() * 2.6, 0.4 + rng() * 1.5, 0.5 + rng() * 2.6);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(r, dummy.matrix);
    r += 1;
  }
  rockMesh.count = r;
  rockMesh.instanceMatrix.needsUpdate = true;
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  group.add(rockMesh);

  group.name = "scatter";
  return group;
}

/* ------------------------------------------------------ the standing stones */

/**
 * The supernatural landmark, and the god at the centre of the erasure.
 *
 * Deliberately NOT a temple: colonnades and dressed masonry are ten thousand
 * years too late. It is a ring of raised stones around one suspended, humming
 * rock — something people dragged here for a reason nobody now living recalls.
 *
 * Both states exist from the start; erasure crossfades between them, so the
 * ruin was always what it "really" was.
 */
export function buildTemple() {
  const group = new THREE.Group();
  group.position.set(SANCTUARY.x, heightAt(SANCTUARY.x, SANCTUARY.z) - 0.4, SANCTUARY.z);

  const stone = new THREE.MeshStandardMaterial({ color: "#8d8a82", roughness: 0.92, flatShading: true });
  const baseStone = new THREE.MeshStandardMaterial({ color: "#6f6c65", roughness: 0.96, flatShading: true });
  const ruinStone = new THREE.MeshStandardMaterial({
    color: "#5a574f", roughness: 1, flatShading: true, transparent: true, opacity: 0,
  });

  const intact = new THREE.Group();
  const ruined = new THREE.Group();
  const rng = makeRng(7788);

  // Packed earth and gravel platform — the part that survives erasure.
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 17, 1.1, 22), baseStone);
  platform.position.y = 0.4;
  platform.receiveShadow = true;
  group.add(platform);

  // Raised stones: rough, leaning, uneven. Nobody was cutting these to a spec.
  const N = 11;
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const hgt = 6.4 + rng() * 4.6;
    const w = 1.5 + rng() * 0.9;
    const menhir = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, w * 0.55), stone);
    menhir.position.set(Math.cos(a) * 11.5, 0.9 + hgt / 2, Math.sin(a) * 11.5);
    menhir.rotation.set((rng() - 0.5) * 0.08, a + (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.09);
    menhir.castShadow = true;
    intact.add(menhir);

    const fallen = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, w * 0.55), ruinStone);
    const drop = a + 0.25;
    fallen.position.set(Math.cos(drop) * (10 + rng() * 5), 1.2 + w * 0.3, Math.sin(drop) * (10 + rng() * 5));
    fallen.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.4, rng() * 3, (rng() - 0.5) * 0.6);
    fallen.castShadow = true;
    ruined.add(fallen);
  }

  // Lintels across three pairs — what makes it read as *built* rather than natural.
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.28;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.1, 1.5), stone);
    lintel.position.set(Math.cos(a) * 11.5, 9.4, Math.sin(a) * 11.5);
    lintel.rotation.y = a + Math.PI / 2;
    lintel.castShadow = true;
    intact.add(lintel);
  }

  // The suspended stone. Restrained on purpose: a dull rock that should not be
  // up there is more unsettling than a glowing crystal.
  const ward = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.9, 0),
    new THREE.MeshStandardMaterial({
      color: "#9fb4c4",
      emissive: new THREE.Color("#7fa8c8"),
      emissiveIntensity: 1.4,
      roughness: 0.6,
    }),
  );
  ward.position.y = 6.6;
  ward.name = "wardStone";
  intact.add(ward);

  const wardLight = new THREE.PointLight("#9fc8e6", 46, 46, 2);
  wardLight.position.y = 6.6;
  intact.add(wardLight);

  // Ochre hand-prints on the inner faces: the only decoration these carry.
  const ochre = new THREE.MeshStandardMaterial({ color: "#a8442a", roughness: 1 });
  for (let i = 0; i < 14; i += 1) {
    const a = rng() * Math.PI * 2;
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.22 + rng() * 0.14, 6), ochre);
    mark.position.set(Math.cos(a) * 10.6, 2 + rng() * 4, Math.sin(a) * 10.6);
    mark.lookAt(0, mark.position.y, 0);
    intact.add(mark);
  }

  group.add(intact, ruined);
  group.name = "temple";
  group.userData = { intact, ruined, stone, baseStone, ruinStone, ward, wardLight };
  return group;
}

/* --------------------------------------------------------------- the camp */

/** A hide-and-timber camp: everything here is buildable with what is to hand. */
export function buildSettlement() {
  const group = new THREE.Group();
  const rng = makeRng(4242);

  const hide = new THREE.MeshStandardMaterial({ color: "#8a7358", roughness: 1, flatShading: true });
  const hideDark = new THREE.MeshStandardMaterial({ color: "#6d5943", roughness: 1, flatShading: true });
  const timber = new THREE.MeshStandardMaterial({ color: "#4e4032", roughness: 1, flatShading: true });
  const boneMat = new THREE.MeshStandardMaterial({ color: "#d6cdb8", roughness: 0.85, flatShading: true });

  /* --- conical hide shelters on a timber frame */
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const r = 12 + rng() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const tent = new THREE.Group();
    const size = 1.5 + rng() * 0.55;

    const cover = new THREE.Mesh(new THREE.ConeGeometry(2.5 * size, 3.6 * size, 9, 1, true), hide);
    cover.material.side = THREE.DoubleSide;
    cover.position.y = 1.8 * size;
    cover.castShadow = true;
    tent.add(cover);

    // Poles projecting through the smoke hole — the detail that sells it.
    for (let p = 0; p < 5; p += 1) {
      const pa = (p / 5) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6 * size, 5), timber);
      pole.position.set(Math.cos(pa) * 0.34 * size, 2.3 * size, Math.sin(pa) * 0.34 * size);
      pole.rotation.set(Math.cos(pa) * 0.13, 0, -Math.sin(pa) * 0.13);
      tent.add(pole);
    }

    tent.position.set(x, heightAt(x, z), z);
    tent.rotation.y = rng() * Math.PI;
    group.add(tent);
  }

  /* --- central hearth, ringed with stones */
  const fire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: "#ffb547", emissive: "#ff7a1a", emissiveIntensity: 3.4 }),
  );
  fire.position.set(0, heightAt(0, 0) + 0.5, 0);
  fire.name = "firstFlame";
  group.add(fire);

  const hearthStone = new THREE.MeshStandardMaterial({ color: "#57544e", roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 + rng() * 0.16, 0), hearthStone);
    s.position.set(Math.cos(a) * 1.5, heightAt(0, 0) + 0.12, Math.sin(a) * 1.5);
    s.rotation.set(rng(), rng(), rng());
    s.castShadow = true;
    group.add(s);
  }

  const fireLight = new THREE.PointLight("#ff9a3c", 46, 30, 2);
  fireLight.position.set(0, heightAt(0, 0) + 1.4, 0);
  group.add(fireLight);

  /* --- drying racks: hide stretched on a timber A-frame */
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.9;
    const x = Math.cos(a) * 8.5;
    const z = Math.sin(a) * 8.5;
    const rack = new THREE.Group();
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 5), timber);
      leg.position.set(side * 0.9, 1.1, 0);
      leg.rotation.z = -side * 0.14;
      rack.add(leg);
    });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 5), timber);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 2.1;
    rack.add(bar);
    for (let s = 0; s < 3; s += 1) {
      const skin = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), hideDark);
      skin.material.side = THREE.DoubleSide;
      skin.position.set(-0.6 + s * 0.6, 1.5, 0);
      rack.add(skin);
    }
    rack.position.set(x, heightAt(x, z), z);
    rack.rotation.y = a;
    group.add(rack);
  }

  /* --- megafauna evidence: a mammoth skull and rib arc at the camp edge */
  const bones = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), boneMat);
  skull.scale.set(1, 0.95, 1.2);
  skull.position.y = 1.0;
  skull.castShadow = true;
  bones.add(skull);
  [-1, 1].forEach((side) => {
    const tusk = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 6, 14, Math.PI * 1.05), boneMat);
    tusk.position.set(side * 0.7, 0.8, 0.7);
    tusk.rotation.set(1.5, side * 0.5, side * 1.5);
    tusk.castShadow = true;
    bones.add(tusk);
  });
  for (let i = 0; i < 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.1 + i * 0.12, 0.075, 5, 12, Math.PI * 0.8), boneMat);
    rib.position.set(-1.6 - i * 0.75, 0.7, 0);
    rib.rotation.set(0, Math.PI / 2, 0.25);
    rib.castShadow = true;
    bones.add(rib);
  }
  bones.position.set(-19, heightAt(-19, 13), 13);
  bones.rotation.y = 0.7;
  group.add(bones);

  /* --- knapping floor: struck flint scattered by the fire */
  const flint = new THREE.MeshStandardMaterial({ color: "#3f4348", roughness: 0.55, flatShading: true });
  for (let i = 0; i < 26; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = 3 + rng() * 2.4;
    const chip = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + rng() * 0.11, 0), flint);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    chip.position.set(x, heightAt(x, z) + 0.05, z);
    chip.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    group.add(chip);
  }

  /* --- ochre-stained grinding stone */
  const grind = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.8, 0.3, 9),
    new THREE.MeshStandardMaterial({ color: "#7b6a5c", roughness: 1, flatShading: true }),
  );
  grind.position.set(4.2, heightAt(4.2, -3.4) + 0.15, -3.4);
  grind.castShadow = true;
  group.add(grind);
  const pigment = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 10),
    new THREE.MeshStandardMaterial({ color: "#a8442a", roughness: 1 }),
  );
  pigment.rotation.x = -Math.PI / 2;
  pigment.position.set(4.2, heightAt(4.2, -3.4) + 0.31, -3.4);
  group.add(pigment);

  group.name = "settlement";
  group.userData = { fire, fireLight };
  return group;
}

/** Mammoth tracks pressed into the mud along the river approach. */
export function buildTracks() {
  const group = new THREE.Group();
  const rng = makeRng(31415);
  const mud = new THREE.MeshStandardMaterial({ color: "#3f362c", roughness: 1 });

  let x = -60, z = 74;
  for (let i = 0; i < 26; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const print = new THREE.Mesh(new THREE.CircleGeometry(0.62 + rng() * 0.12, 9), mud);
    print.rotation.x = -Math.PI / 2;
    const px = x + side * 1.3;
    const pz = z + rng() * 0.8;
    print.position.set(px, groundY(px, pz) + 0.06, pz);
    group.add(print);
    x += 4.2;
    z -= 1.1 + rng() * 0.7;
  }
  group.name = "tracks";
  return group;
}

/** Cold haze and drifting snow, so the air is never empty. */
export function buildAtmosphere() {
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const rng = makeRng(2718);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rng() - 0.5) * 220;
    positions[i * 3 + 1] = rng() * 40 + 2;
    positions[i * 3 + 2] = (rng() - 0.5) * 220;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: "#dfe9f2",
    size: 0.13,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  points.name = "atmosphere";
  points.userData.basePositions = positions.slice();
  return points;
}
