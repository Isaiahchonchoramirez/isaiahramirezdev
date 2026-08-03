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

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(params.radius, params.radius * 0.97, params.length, 32, 1),
    metal,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  vehicle.add(body);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(params.radius * 0.91, params.radius, params.length * 0.1, 32),
    accent,
  );
  nose.position.y = params.length * 0.45;
  nose.castShadow = true;
  vehicle.add(nose);

  const engine = new THREE.Mesh(
    new THREE.CylinderGeometry(params.radius * 0.46, params.radius * 0.78, params.length * 0.075, 24, 1, true),
    dark,
  );
  engine.position.y = -params.length * 0.53;
  vehicle.add(engine);

  // Four grid fins and four landing legs make attitude readable even when the
  // cylindrical body itself has no obvious roll reference.
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(params.radius * 1.1, params.length * 0.09, params.radius * 0.1),
      dark,
    );
    fin.position.set(
      Math.cos(angle) * params.radius * 1.15,
      params.length * 0.32,
      Math.sin(angle) * params.radius * 1.15,
    );
    fin.rotation.y = -angle;
    fin.castShadow = true;
    vehicle.add(fin);

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, params.length * 0.23, 8),
      dark,
    );
    leg.position.set(
      Math.cos(angle) * params.radius * 1.28,
      -params.length * 0.43,
      Math.sin(angle) * params.radius * 1.28,
    );
    leg.rotation.z = Math.cos(angle) * -0.28;
    leg.rotation.x = Math.sin(angle) * 0.28;
    vehicle.add(leg);
  }

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa43b, transparent: true, opacity: 0.78, depthWrite: false,
  });
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(params.radius * 0.62, params.length * 0.32, 20, 1, true),
    flameMaterial,
  );
  flame.geometry.rotateX(Math.PI);
  flame.position.y = -params.length * 0.72;
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
