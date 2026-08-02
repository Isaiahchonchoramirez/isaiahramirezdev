import * as THREE from "three";

/**
 * PROCEDURAL ENVIRONMENT MAPS.
 *
 * ── The problem this solves ─────────────────────────────────────────────────
 * Every material in this project is a dielectric (metalness 0), and in a PBR
 * renderer a dielectric's specular response comes almost entirely from the
 * environment, not from punctual lights. With `scene.environment` unset, a
 * roughness-0.06 obsidian blade and a roughness-1.0 lump of ash reflect the
 * same nothing, and the whole material library collapses back into flat colour.
 * That was the actual reason the character looked like it was carved from one
 * block: not the geometry, and not the colours, but that there was nothing in
 * the world for any of it to reflect.
 *
 * ── Why generated rather than an HDR file ───────────────────────────────────
 * An .hdr is a megabyte-scale binary asset, this project ships no binaries, and
 * a downloaded environment would bring its own lighting story that fights the
 * one the scene is telling. Generating it means the environment can be *derived
 * from the same palette as the sky*, so reflections agree with the backdrop for
 * free, and it costs a few kilobytes of code and one PMREM pass at boot.
 *
 * ── How it works ────────────────────────────────────────────────────────────
 * Build a tiny scene of unlit emissive geometry — a gradient dome plus a few
 * bright panels standing in for the sun and the sky's bright quarter — and let
 * `PMREMGenerator` convolve it into a prefiltered mipmapped radiance map. This
 * is the same technique three.js's own RoomEnvironment uses; only the contents
 * differ.
 */

/** Unlit emissive panel. The building block of both environments below. */
function panel(colour, intensity, { w = 1, h = 1, pos, rot }) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(colour).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false, // this is radiance data, not a picture — do not film it
    }),
  );
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  return mesh;
}

/**
 * A vertical gradient dome, inside-out. Supplies the low-frequency ambient that
 * fills shadow — the difference between a shaded cheek being *cool* and a
 * shaded cheek being *black*.
 */
function dome(top, horizon, bottom) {
  const geo = new THREE.SphereGeometry(48, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uMid: { value: new THREE.Color(horizon) },
      uBottom: { value: new THREE.Color(bottom) },
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
        vec3 c = mix(uBottom, uMid, smoothstep(-0.55, 0.05, h));
        c = mix(c, uTop, smoothstep(0.0, 0.75, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function convolve(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();

  // The source scene has done its job; nothing below keeps a reference to it.
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });

  return target.texture;
}

/**
 * The world environment: a cold overcast sub-arctic sky with a low sun.
 *
 * The asymmetry matters. A uniform dome produces uniform reflections, which is
 * the "everything looks like grey clay" failure. One bright quarter where the
 * sun is means a wet eye or a polished blade catches a *directional* glint that
 * moves as the player turns, and that motion is most of what reads as real.
 */
export function buildWorldEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.add(dome("#3f5877", "#b9c4cc", "#5d5545"));

  // The sun's quarter — warm, low, and by far the brightest thing present.
  scene.add(panel("#ffe6c4", 5.4, { w: 34, h: 22, pos: [-26, 12, -18], rot: [0, 0.9, 0] }));
  // Cold bounce off the ice sheet opposite it, so rims read blue not black.
  scene.add(panel("#bcd6ec", 1.5, { w: 40, h: 26, pos: [24, 14, 16], rot: [0, -0.8, 0] }));
  // Sky overhead.
  scene.add(panel("#cdd9e4", 1.1, { w: 60, h: 60, pos: [0, 34, 0], rot: [Math.PI / 2, 0, 0] }));
  // Ground bounce: tundra, so warm-dun rather than green. Weak on purpose —
  // strong up-light is what makes figures look like they are on a stage.
  scene.add(panel("#6e6350", 0.5, { w: 60, h: 60, pos: [0, -12, 0], rot: [-Math.PI / 2, 0, 0] }));

  return convolve(renderer, scene);
}

/**
 * The character-creation environment: a neutral studio.
 *
 * Deliberately different from the world's. The world environment is a
 * storytelling light — warm sun, blue ice, strong colour cast. That is exactly
 * wrong for judging a face, because it tints every skin tone toward the same
 * apparent hue and the swatches stop meaning anything. This one is close to
 * achromatic so the skin tone you pick is the skin tone you get, with just
 * enough warm/cool split between the two sides to keep the form from going
 * flat.
 */
export function buildStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.add(dome("#8f929a", "#6e7178", "#3a3b40"));

  // Key side: a large soft source, barely warm. Large = soft shadow edge, which
  // is what lets a nose read as a form rather than as a hard-edged wedge.
  scene.add(panel("#fff4e6", 4.2, { w: 26, h: 30, pos: [-14, 9, -10], rot: [0, 0.85, 0] }));
  // Fill side: cooler, and much weaker, so the shadow side keeps its shape.
  scene.add(panel("#dfe8f2", 1.15, { w: 22, h: 26, pos: [13, 7, -6], rot: [0, -0.9, 0] }));
  // Rim from behind: this is what separates a dark-haired head from a dark
  // backdrop, and without it the silhouette dissolves at every skin tone.
  scene.add(panel("#e8f0fa", 2.6, { w: 20, h: 20, pos: [2, 11, 15], rot: [0.3, Math.PI, 0] }));
  // Soft top light, for the eye sockets.
  scene.add(panel("#f2f2f5", 1.4, { w: 30, h: 30, pos: [0, 20, 0], rot: [Math.PI / 2, 0, 0] }));

  return convolve(renderer, scene);
}
