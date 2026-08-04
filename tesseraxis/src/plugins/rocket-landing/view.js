// The visual half of the powered-descent plugin. Physics stays in plain f64
// arrays; this module only mirrors the latest state into Three.js objects.

import * as THREE from 'three';
import { ForceArrow, Trail, createLandingPad, createBeacon } from '../../render/helpers.js';

export function createRocketView(ctx, state) {
  const { params } = ctx;
  const viewport = ctx.viewport;
  if (!viewport) throw new Error('Rocket view requires a Tesseraxis viewport');

  const root = new THREE.Group();
  const vehicle = new THREE.Group();
  root.add(vehicle);

  const metal = new THREE.MeshStandardMaterial({ color: 0xd9e1e8, metalness: 0.72, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.8, roughness: 0.34 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x223746, metalness: 0.55, roughness: 0.42 });
  const soot = new THREE.MeshStandardMaterial({ color: 0x0b0e12, metalness: 0.45, roughness: 0.72 });

  const R = params.radius;
  const L = params.length;

  // The silhouette is what makes a rocket read as a rocket, and a silhouette is
  // set by its profile curve. Body, nose and nozzle are therefore lathed from
  // explicit profiles rather than assembled from cylinders — the previous nose
  // was a cylinder tapering from 0.91R to R over a tenth of the length, which
  // is a barely-bevelled can lid rather than a nose cone.
  const lathe = (profile, material, segments = 36) => {
    const mesh = new THREE.Mesh(
      new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), segments),
      material,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Tangent ogive: the standard nose profile. For nose length h and base radius
  // R the generating circle has radius rho, and the curve is the arc of that
  // circle that meets the body wall exactly parallel — which is what stops the
  // join from showing as a crease.
  const noseHeight = L * 0.17;
  const rho = (R * R + noseHeight * noseHeight) / (2 * R);
  const noseProfile = [];
  const NOSE_STEPS = 18;
  // Built base-upward so the profile's y ascends, which is what the lathe wants.
  // With y measured up from the body join, the tangent-ogive radius is
  // sqrt(rho² - y²) + R - rho: that is R at y=0 and exactly 0 at y=noseHeight,
  // meeting the body wall parallel so the join does not show as a crease.
  for (let i = 0; i <= NOSE_STEPS; i++) {
    const y = (i / NOSE_STEPS) * noseHeight;
    const radiusAt = Math.sqrt(Math.max(0, rho * rho - y * y)) + R - rho;
    noseProfile.push([Math.max(0, radiusAt), y]);
  }
  const nose = lathe(noseProfile, metal);
  nose.position.y = L * 0.5;
  vehicle.add(nose);

  // Body: a long tank with a subtle taper, an interstage band, and a boat-tail
  // at the base where the thrust structure narrows.
  const body = lathe([
    [R * 0.88, 0],
    [R, L * 0.06],
    [R, L * 0.94],
    [R * 0.985, L],
  ], metal);
  body.position.y = -L * 0.5;
  vehicle.add(body);

  const interstage = lathe([
    [R * 1.004, 0],
    [R * 1.004, L * 0.085],
  ], accent);
  interstage.position.y = L * 0.39;
  vehicle.add(interstage);

  // Two raceway conduits running the length of the tank. Small, but they break
  // the untextured cylinder up and give roll a visible reference.
  for (const side of [-1, 1]) {
    const raceway = new THREE.Mesh(
      new THREE.BoxGeometry(R * 0.13, L * 0.74, R * 0.09),
      accent,
    );
    raceway.position.set(side * R * 0.99, L * 0.02, 0);
    raceway.castShadow = true;
    vehicle.add(raceway);
  }

  // Engine bell: a flared de Laval nozzle. The throat pinches to ~0.2R and the
  // exit cone opens back out, which is the shape the eye recognises as an
  // engine — the old part was a straight cylinder that read as a pipe stub.
  // Profile runs bottom-up: the wide exit is the lowest point and the throat
  // pinches above it, so the bell opens downward toward the exhaust.
  const bellLength = L * 0.11;
  const bell = lathe([
    [R * 0.58, -bellLength],
    [R * 0.45, -bellLength * 0.78],
    [R * 0.30, -bellLength * 0.5],
    [R * 0.19, -bellLength * 0.28],
    [R * 0.30, 0],
  ], soot, 28);
  bell.position.y = -L * 0.5;
  vehicle.add(bell);

  const thrustPlate = lathe([
    [0, 0],
    [R * 0.86, 0],
    [R * 0.8, L * 0.022],
  ], dark);
  thrustPlate.position.y = -L * 0.5;
  vehicle.add(thrustPlate);

  // Four grid fins and four landing legs make attitude readable even when the
  // cylindrical body itself has no obvious roll reference. Each is built once
  // and cloned, so the lattice costs four draw calls rather than forty.
  // Cross-section furniture is sized from the radius, not the length. This
  // vehicle defaults to 47 m on a 1.83 m radius — a 25:1 fineness ratio — so
  // anything scaled off L comes out as a wire or a mast rather than a part.
  const finSpan = R * 1.15;
  const finHeight = R * 1.3;
  const finThickness = R * 0.12;
  const gridFin = new THREE.Group();
  const finFrame = new THREE.Mesh(new THREE.BoxGeometry(finThickness, finHeight, finSpan), dark);
  gridFin.add(finFrame);
  // The lattice itself: a few crossing slats standing proud of the frame is
  // enough to read as a grid fin at flight distances.
  for (let i = -1; i <= 1; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(finThickness * 1.5, finHeight * 0.92, finSpan * 0.06), accent);
    rib.position.z = (i / 2) * finSpan * 0.62;
    gridFin.add(rib);
    const chord = new THREE.Mesh(new THREE.BoxGeometry(finThickness * 1.5, finHeight * 0.07, finSpan * 0.92), accent);
    chord.position.y = (i / 2) * finHeight * 0.62;
    gridFin.add(chord);
  }
  const finStalk = new THREE.Mesh(new THREE.BoxGeometry(R * 0.22, finHeight * 0.34, finSpan * 0.16), dark);
  finStalk.position.x = -R * 0.16;
  gridFin.add(finStalk);

  // One leg: an A-frame strut angled out from the base to a footpad, which is
  // how a landing leg actually carries load — the old version was a lone
  // cylinder floating beside the hull.
  const legLength = R * 3.1;
  const legSplay = 0.62; // radians from vertical
  const landingLeg = new THREE.Group();
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.13, R * 0.2, legLength, 10), dark);
  strut.position.set(Math.sin(legSplay) * legLength * 0.5, -Math.cos(legSplay) * legLength * 0.5, 0);
  strut.rotation.z = -legSplay;
  strut.castShadow = true;
  landingLeg.add(strut);
  // The pusher rod braces the strut back to the hull at a shallower angle,
  // which is what makes the pair read as a load path rather than two sticks.
  const pusher = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.07, R * 0.07, legLength * 0.66, 8), accent);
  pusher.position.set(Math.sin(legSplay) * legLength * 0.34, -Math.cos(legSplay) * legLength * 0.2, 0);
  pusher.rotation.z = -legSplay * 1.9;
  landingLeg.add(pusher);
  const footpad = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.36, R * 0.12, 14), dark);
  footpad.position.set(Math.sin(legSplay) * legLength, -Math.cos(legSplay) * legLength, 0);
  footpad.castShadow = true;
  landingLeg.add(footpad);

  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5 + Math.PI * 0.25;

    const fin = gridFin.clone();
    fin.position.set(Math.cos(angle) * R * 1.16, L * 0.335, Math.sin(angle) * R * 1.16);
    fin.rotation.y = -angle;
    fin.traverse((part) => { part.castShadow = true; });
    vehicle.add(fin);

    const leg = landingLeg.clone();
    leg.position.set(Math.cos(angle) * R * 0.9, -L * 0.5 + R * 0.35, Math.sin(angle) * R * 0.9);
    leg.rotation.y = -angle;
    leg.traverse((part) => { part.castShadow = true; });
    vehicle.add(leg);
  }

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa43b, transparent: true, opacity: 0.78, depthWrite: false,
  });
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(params.radius * 0.5, params.length * 0.32, 20, 1, true),
    flameMaterial,
  );
  flame.geometry.rotateX(Math.PI);
  // Hangs from the nozzle exit rather than from the old stub's position: the
  // cone's origin is its midpoint, so half its length below the bell mouth.
  flame.position.y = -L * 0.5 - bellLength - L * 0.16;
  vehicle.add(flame);

  const pad = createLandingPad({ radius: Math.max(12, params.limitOffset + 5), tolerance: params.limitOffset });
  pad.position.y = params.padHeight - 0.4;
  root.add(pad);
  root.add(createBeacon({ height: Math.min(600, state.scenario.altitude * 0.28) }));

  const trail = new Trail({ maxPoints: 6000, color: 0x6be5ff, opacity: 0.72 });
  root.add(trail.line);

  const thrustArrow = new ForceArrow({ color: 0xffa43b, scale: 0.012, maxLength: 55 });
  const dragArrow = new ForceArrow({ color: 0x6be5ff, scale: 0.02, maxLength: 42 });
  root.add(thrustArrow.group, dragArrow.group);
  viewport.add(root);

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const thrustDirection = new THREE.Vector3();
  const bodyUp = new THREE.Vector3(0, 1, 0);

  function render() {
    const { C, entity } = state;
    position.set(C.Transform.x[entity], C.Transform.y[entity], C.Transform.z[entity]);
    quaternion.set(
      C.Transform.qx[entity], C.Transform.qy[entity], C.Transform.qz[entity], C.Transform.qw[entity],
    );
    vehicle.position.copy(position);
    vehicle.quaternion.copy(quaternion);

    const throttle = C.Actuator.throttle[entity];
    flame.visible = throttle > 0.002 && C.Mass.fuel[entity] > 0;
    flame.scale.set(0.72 + throttle * 0.35, Math.max(0.05, throttle), 0.72 + throttle * 0.35);

    if (params.showTrail) trail.push(position.x, position.y, position.z);
    trail.line.visible = Boolean(params.showTrail);

    thrustDirection.copy(bodyUp).applyQuaternion(quaternion).multiplyScalar(state.derived.thrust);
    thrustArrow.set(position, thrustDirection);
    dragArrow.set(position, {
      x: -state.air.vx * state.derived.drag / Math.max(1e-6, state.air.speed),
      y: -state.air.vy * state.derived.drag / Math.max(1e-6, state.air.speed),
      z: -state.air.vz * state.derived.drag / Math.max(1e-6, state.air.speed),
    });
    thrustArrow.group.visible = Boolean(params.showForces && state.derived.thrust > 0);
    dragArrow.group.visible = Boolean(params.showForces && state.derived.drag > 1);

    viewport.follow(position.x, Math.max(params.padHeight + 18, position.y), position.z);
    const clearance = Math.max(0, state.derived.altitude);
    viewport.frame(Math.max(75, Math.min(900, clearance * 0.42 + params.length * 1.8)));
  }

  function dispose() {
    // The viewport clears and disposes the complete plugin tree between labs.
  }

  return { render, dispose };
}

export default createRocketView;
