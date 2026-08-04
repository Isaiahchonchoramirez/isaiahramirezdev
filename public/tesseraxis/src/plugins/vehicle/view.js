import * as THREE from 'three';
import { ForceArrow, Trail } from '../../render/helpers.js';
import { TRACK, trackPoint, isTrackScenario } from './physics.js';

export function createVehicleView(ctx, state) {
  const { viewport, params } = ctx;
  const root = new THREE.Group();
  const scenario = params.scenario;
  const onTrack = isTrackScenario(scenario);
  let path = null;

  if (onTrack) {
    const roadShape = new THREE.Shape();
    const samples = 160;
    for (let i = 0; i <= samples; i++) {
      const a = i / samples * Math.PI * 2, p = trackPoint(a);
      if (i === 0) roadShape.moveTo(p.x, p.z); else roadShape.lineTo(p.x, p.z);
    }
    const hole = new THREE.Path();
    for (let i = samples; i >= 0; i--) {
      const a = i / samples * Math.PI * 2;
      const x = (TRACK.rx - TRACK.halfWidth * 1.15) * Math.cos(a), z = (TRACK.rz - TRACK.halfWidth * 1.15) * Math.sin(a);
      if (i === samples) hole.moveTo(x, z); else hole.lineTo(x, z);
    }
    roadShape.holes.push(hole);
    const road = new THREE.Mesh(new THREE.ShapeGeometry(roadShape), new THREE.MeshStandardMaterial({ color: 0x151b21, roughness: 0.88 }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.015; road.receiveShadow = true; root.add(road);

    const linePoints = [];
    for (let i = 0; i <= samples; i++) { const p = trackPoint(i / samples * Math.PI * 2); linePoints.push(new THREE.Vector3(p.x, 0.06, p.z)); }
    path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineDashedMaterial({ color: 0x6be5ff, dashSize: 2.2, gapSize: 2, transparent: true, opacity: 0.5 }));
    path.computeLineDistances(); root.add(path);
  } else {
    // Open ground. A grid rather than a ribbon of road, because the whole
    // point of these two scenarios is that there is no prescribed line.
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x141a20, roughness: 0.92 }),
    );
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.01; pad.receiveShadow = true; root.add(pad);
    const grid = new THREE.GridHelper(300, 30, 0x2a3a47, 0x1d2830);
    grid.position.y = 0.02; root.add(grid);
  }

  if (scenario === 'crash') {
    // The barrier face sits at x = 0 and the vehicle arrives along +X.
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.4, 9),
      new THREE.MeshStandardMaterial({ color: 0x39414a, metalness: 0.25, roughness: 0.8 }),
    );
    barrier.position.set(0.8, 1.2, 0); barrier.castShadow = true; barrier.receiveShadow = true; root.add(barrier);
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2.2, 1.05),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xf2c14e : 0x11161b }),
      );
      stripe.position.set(-0.02, 1.2, i * 2.1); root.add(stripe);
    }

  }

  // Watch from the approach side. The plugin's default camera sits beyond the
  // barrier, which puts a solid wall between the viewer and the only thing
  // worth looking at. It has to be applied on the first render rather than
  // here, because the shell calls setCameraSpec(plugin.camera) *after*
  // setup() and would otherwise overwrite it. follow()/frame() then move only
  // the target and distance, leaving these orbit angles in place.
  let cameraPlaced = scenario !== 'crash';

  const car = new THREE.Group(); root.add(car);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.55, 4.35), new THREE.MeshStandardMaterial({ color: 0x47cce8, metalness: 0.7, roughness: 0.26 }));
  body.position.y = 0.7; body.castShadow = true; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.58, 2.05), new THREE.MeshStandardMaterial({ color: 0x142631, metalness: 0.35, roughness: 0.18 }));
  cabin.position.set(0, 1.15, -0.15); cabin.castShadow = true; car.add(cabin);
  const wheels = [];
  for (const x of [-params.trackWidth / 2, params.trackWidth / 2]) for (const z of [-params.wheelbase * 0.48, params.wheelbase * 0.52]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 18), new THREE.MeshStandardMaterial({ color: 0x080a0c, roughness: 0.82 }));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.38, z); wheel.castShadow = true; car.add(wheel); wheels.push({ wheel, front: z > 0 });
  }
  const debris = new THREE.Group(); root.add(debris);
  const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x2d7382, metalness: 0.65, roughness: 0.38 });
  for (let i = 0; i < 8; i++) {
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.18 + i * 0.015, 0.035, 0.32), debrisMaterial);
    shard.visible = false; debris.add(shard);
  }
  const smoke = new THREE.Group(); car.add(smoke);
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + i * 0.035, 8, 6),
      new THREE.MeshBasicMaterial({ color: i < 2 ? 0x292d30 : 0x555a5d, transparent: true, opacity: 0.22 }),
    );
    puff.position.set((i % 2 - 0.5) * 0.22, 0.9 + i * 0.22, 1.25 - i * 0.08);
    puff.visible = false; smoke.add(puff);
  }
  const trail = new Trail({ maxPoints: 5000, color: 0x48ffa8, opacity: 0.55 }); root.add(trail.line);
  const frontForce = new ForceArrow({ color: 0xffc857, scale: 0.045, maxLength: 12 });
  const rearForce = new ForceArrow({ color: 0xff7a90, scale: 0.045, maxLength: 12 }); root.add(frontForce.group, rearForce.group);
  viewport.add(root);

  const BODY_LENGTH = 4.35;
  let emittedDebris = 0;

  function render() {
    const C = state.Vehicle, e = state.entity;
    if (!cameraPlaced) {
      viewport.setCameraSpec({ position: [-15, 6, 12], target: [C.x[e], 1, 0] });
      cameraPlaced = true;
    }
    car.position.set(C.x[e], 0, C.z[e]); car.rotation.set(C.pitch[e], -C.yaw[e] + Math.PI / 2, -C.roll[e]);
    for (const [index, item] of wheels.entries()) {
      if (item.front) item.wheel.rotation.y = C.steer[e];
      const detached = index < state.damage.wheelLoss;
      if (detached) {
        item.wheel.position.x += (index % 2 ? 1 : -1) * 0.018;
        item.wheel.position.y = Math.max(0.22, item.wheel.position.y - 0.003);
        item.wheel.rotation.x += 0.07;
      }
    }
    trail.push(C.x[e], 0.09, C.z[e]); trail.line.visible = Boolean(params.showPath);
    if (path) path.visible = Boolean(params.showPath);

    // Crush is shown by shortening the body from the nose backwards. The car's
    // forward axis is local +Z, so the mesh is scaled on Z and pushed back by
    // half the lost length, which keeps the cabin and rear axle where they are
    // and takes the deformation entirely out of the front — which is what a
    // crumple zone does.
    if (state.crash?.maxCrush > 0) {
      const crush = Math.min(state.crash.maxCrush, BODY_LENGTH * 0.55);
      body.scale.z = (BODY_LENGTH - crush) / BODY_LENGTH;
      body.position.z = -crush / 2;
    }
    const d = state.damage;
    body.scale.x = Math.max(0.68, 1 - d.side * 0.0028);
    body.rotation.y = d.side * 0.0018;
    cabin.rotation.z = d.side * 0.0015;
    cabin.position.y = 1.15 - Math.max(0, 35 - d.integrity) * 0.003;
    if (d.rollover) car.rotation.z += Math.sign(C.roll[e] || 1) * Math.PI * 0.48;

    while (emittedDebris < Math.min(debris.children.length, d.debrisEvents * 2)) {
      const shard = debris.children[emittedDebris];
      const side = emittedDebris % 2 ? 1 : -1;
      shard.visible = true;
      shard.position.set(C.x[e] - Math.cos(C.yaw[e]) * (0.8 + emittedDebris * 0.16), 0.08,
        C.z[e] + side * (1.1 + emittedDebris * 0.28));
      shard.rotation.set(0.2 * emittedDebris, C.yaw[e] + side * 0.5, 0.35 * side);
      emittedDebris++;
    }
    for (const [i, puff] of smoke.children.entries()) {
      puff.visible = d.powertrainFailed || d.fire;
      puff.material.color.setHex(d.fire && i < 3 ? 0xff6a22 : 0x555a5d);
      puff.material.opacity = d.fire && i < 3 ? 0.62 : 0.2;
      puff.position.x += Math.sin(performance.now() * 0.0017 + i) * 0.002;
    }
    const lateral = new THREE.Vector3(-Math.sin(C.yaw[e]), 0, Math.cos(C.yaw[e]));
    frontForce.set({ x: C.x[e] + Math.cos(C.yaw[e]) * params.wheelbase * 0.48, y: 0.55, z: C.z[e] + Math.sin(C.yaw[e]) * params.wheelbase * 0.48 }, { x: lateral.x * state.forces.front, y: 0, z: lateral.z * state.forces.front });
    rearForce.set({ x: C.x[e] - Math.cos(C.yaw[e]) * params.wheelbase * 0.52, y: 0.55, z: C.z[e] - Math.sin(C.yaw[e]) * params.wheelbase * 0.52 }, { x: lateral.x * state.forces.rear, y: 0, z: lateral.z * state.forces.rear });
    frontForce.group.visible = rearForce.group.visible = Boolean(params.showForces);
    viewport.follow(C.x[e], 1.4, C.z[e]);
    // Close in for the crash so the crush is actually legible at the moment
    // it happens; the other scenarios need enough of the road to be useful.
    viewport.frame(scenario === 'crash' ? 13 : 24);
  }
  return { render, dispose() {} };
}

export default createVehicleView;
