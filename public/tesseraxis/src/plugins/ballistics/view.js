import * as THREE from 'three';
import { Trail } from '../../render/helpers.js';

export function createBallisticsView(ctx, state) {
  const { viewport, params } = ctx;
  const root = new THREE.Group();
  const mode = params.mode;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x121820, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const grid = new THREE.GridHelper(4000, 40, 0x263441, 0x1a232b);
  grid.position.y = 0.05; root.add(grid);

  // A deliberately visible but correctly shaped spin-stabilised projectile.
  // The old view used a metre-scale sphere, which made a serious point-mass
  // solver look like a toy throwing balls. The ogive, bearing surface and
  // boat-tail now communicate what the simulated body actually represents.
  const visualRadius = Math.max(0.38, Math.min(2.2, params.calibre / 55));
  const visualLength = visualRadius * (params.calibre < 25 ? 5.2 : 3.8);
  const profile = [
    new THREE.Vector2(0.05 * visualRadius, 0),
    new THREE.Vector2(0.72 * visualRadius, 0.12 * visualLength),
    new THREE.Vector2(visualRadius, 0.25 * visualLength),
    new THREE.Vector2(visualRadius, 0.72 * visualLength),
    new THREE.Vector2(0.78 * visualRadius, 0.84 * visualLength),
    new THREE.Vector2(0.42 * visualRadius, 0.94 * visualLength),
    new THREE.Vector2(0.02 * visualRadius, visualLength),
  ];
  const projectile = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 24),
    new THREE.MeshStandardMaterial({ color: 0xb9893f, emissive: 0x201507, metalness: 0.88, roughness: 0.2 }),
  );
  projectile.castShadow = true; root.add(projectile);

  const trail = new Trail({ maxPoints: 8000, color: 0x6be5ff, opacity: 0.8 });
  root.add(trail.line);

  const muzzle = new THREE.Group(); root.add(muzzle);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 5.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x252c31, metalness: 0.8, roughness: 0.35 }),
  );
  barrel.position.set(0, params.launchHeight, -2.7);
  barrel.rotation.x = Math.PI / 2; muzzle.add(barrel);

  // Range stakes make the scale legible. They are spaced in actual metres;
  // without them a 300 m shot and a 3 km shot look like the same empty grid.
  if (mode !== 'intercept') {
    const interval = params.targetRange > 1200 ? 500 : params.targetRange > 400 ? 200 : 100;
    for (let z = interval; z <= Math.min(4000, params.targetRange || 4000); z += interval) {
      const stake = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.2, 0.12),
        new THREE.MeshStandardMaterial({ color: z % (interval * 5) === 0 ? 0xffc857 : 0x70808d }),
      );
      stake.position.set(-4, 1.1, z); root.add(stake);
    }
  }

  const impactEffects = new THREE.Group(); root.add(impactEffects);
  for (let i = 0; i < 18; i++) {
    const fragment = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.45, 5),
      new THREE.MeshBasicMaterial({ color: i < 5 ? 0xffd27a : 0x9aa3aa }),
    );
    fragment.visible = false; impactEffects.add(fragment);
  }

  let targetMesh = null;
  let losLine = null;
  if (mode === 'intercept') {
    targetMesh = new THREE.Mesh(
      new THREE.ConeGeometry(6, 22, 12),
      new THREE.MeshStandardMaterial({ color: 0xff7a90, metalness: 0.4, roughness: 0.4 }),
    );
    targetMesh.rotation.z = Math.PI / 2; root.add(targetMesh);

    // The line of sight, drawn because proportional navigation is entirely
    // about how fast this line rotates — not about how long it is.
    losLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.55 }),
    );
    root.add(losLine);
  }

  if (mode === 'terminal') {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(6, 6, Math.max(0.1, params.plateThickness / 100)),
      new THREE.MeshStandardMaterial({ color: 0x5a6472, metalness: 0.75, roughness: 0.35 }),
    );
    plate.position.set(0, state.targetY, params.targetRange);
    plate.rotation.y = params.obliquity * Math.PI / 180;
    plate.castShadow = true; plate.receiveShadow = true; root.add(plate);
  }

  viewport.add(root);
  const pos = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function render() {
    const B = state.Body, p = state.projectile;
    pos.set(B.x[p], B.y[p], B.z[p]);
    projectile.position.copy(pos);
    velocity.set(B.vx[p], B.vy[p], B.vz[p]);
    if (velocity.lengthSq() > 1e-8) {
      velocity.normalize();
      projectile.quaternion.setFromUnitVectors(up, velocity);
    }

    if (params.showTrail && !state.done) trail.push(pos.x, pos.y, pos.z);
    trail.line.visible = Boolean(params.showTrail);

    if (targetMesh && state.target !== null) {
      const t = state.target;
      targetMesh.position.set(B.x[t], B.y[t], B.z[t]);
      const points = losLine.geometry.attributes.position;
      points.setXYZ(0, pos.x, pos.y, pos.z);
      points.setXYZ(1, B.x[t], B.y[t], B.z[t]);
      points.needsUpdate = true;
      losLine.geometry.computeBoundingSphere();
    }

    if (state.done && state.impact) {
      for (const [i, fragment] of impactEffects.children.entries()) {
        fragment.visible = true;
        const angle = i / impactEffects.children.length * Math.PI * 2;
        const spread = 0.45 + (i % 4) * 0.22;
        fragment.position.set(pos.x + Math.cos(angle) * spread, Math.max(0.12, pos.y + Math.sin(angle * 2) * spread), pos.z - spread * 0.35);
        fragment.rotation.set(angle, angle * 0.5, Math.PI / 2);
      }
    }

    // Keep both the projectile and whatever it is heading for in frame, which
    // for a trajectory means backing off as the flight develops.
    viewport.follow(pos.x, Math.max(2, pos.y), pos.z);
    const reach = Math.max(state.metrics.downrange, state.metrics.altitude, 60);
    viewport.frame(Math.min(3000, reach * 0.75 + 40));
  }

  return { render, dispose() {} };
}

export default createBallisticsView;
