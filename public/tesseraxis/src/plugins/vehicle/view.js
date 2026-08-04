import * as THREE from 'three';
import { ForceArrow, Trail } from '../../render/helpers.js';
import { TRACK, trackPoint } from './physics.js';

export function createVehicleView(ctx, state) {
  const { viewport, params } = ctx;
  const root = new THREE.Group();
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
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineDashedMaterial({ color: 0x6be5ff, dashSize: 2.2, gapSize: 2, transparent: true, opacity: 0.5 }));
  path.computeLineDistances(); root.add(path);

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
  const trail = new Trail({ maxPoints: 5000, color: 0x48ffa8, opacity: 0.55 }); root.add(trail.line);
  const frontForce = new ForceArrow({ color: 0xffc857, scale: 0.045, maxLength: 12 });
  const rearForce = new ForceArrow({ color: 0xff7a90, scale: 0.045, maxLength: 12 }); root.add(frontForce.group, rearForce.group);
  viewport.add(root);

  function render() {
    const C = state.Vehicle, e = state.entity;
    car.position.set(C.x[e], 0, C.z[e]); car.rotation.set(C.pitch[e], -C.yaw[e] + Math.PI / 2, -C.roll[e]);
    for (const item of wheels) if (item.front) item.wheel.rotation.y = C.steer[e];
    trail.push(C.x[e], 0.09, C.z[e]); trail.line.visible = Boolean(params.showPath);
    path.visible = Boolean(params.showPath);
    const lateral = new THREE.Vector3(-Math.sin(C.yaw[e]), 0, Math.cos(C.yaw[e]));
    frontForce.set({ x: C.x[e] + Math.cos(C.yaw[e]) * params.wheelbase * 0.48, y: 0.55, z: C.z[e] + Math.sin(C.yaw[e]) * params.wheelbase * 0.48 }, { x: lateral.x * state.forces.front, y: 0, z: lateral.z * state.forces.front });
    rearForce.set({ x: C.x[e] - Math.cos(C.yaw[e]) * params.wheelbase * 0.52, y: 0.55, z: C.z[e] - Math.sin(C.yaw[e]) * params.wheelbase * 0.52 }, { x: lateral.x * state.forces.rear, y: 0, z: lateral.z * state.forces.rear });
    frontForce.group.visible = rearForce.group.visible = Boolean(params.showForces);
    viewport.follow(C.x[e], 1.4, C.z[e]); viewport.frame(24);
  }
  return { render, dispose() {} };
}

export default createVehicleView;
