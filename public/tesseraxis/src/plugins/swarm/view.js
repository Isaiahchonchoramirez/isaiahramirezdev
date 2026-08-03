import * as THREE from 'three';

export function createSwarmView(ctx, state) {
  const { viewport, params } = ctx;
  const root = new THREE.Group();
  const geometry = new THREE.ConeGeometry(0.58, 2.4, 6);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x79e8ff, roughness: 0.32, metalness: 0.58 });
  const mesh = new THREE.InstancedMesh(geometry, material, state.agents.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = state.agents.length <= 800;
  root.add(mesh);

  const target = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.35, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0x48ffa8, transparent: true, opacity: 0.8 }),
  );
  target.rotation.x = Math.PI / 2;
  root.add(target);

  const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(params.sensorRadius, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0x6be5ff, wireframe: true, transparent: true, opacity: 0.08 }),
  );
  root.add(sensor);

  for (const obstacle of state.obstacles) {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(obstacle.radius, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x27313d, roughness: 0.88, metalness: 0.08 }),
    );
    body.position.set(obstacle.x, obstacle.y, obstacle.z);
    body.castShadow = true;
    root.add(body);
  }

  viewport.add(root);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(1, 1, 1);
  const velocity = new THREE.Vector3(), quaternion = new THREE.Quaternion(), forward = new THREE.Vector3(0, 0, 1);
  const slow = new THREE.Color(0x5bc6ff), fast = new THREE.Color(0xffc857), color = new THREE.Color();

  function render() {
    const A = state.Agent;
    for (let i = 0; i < state.agents.length; i++) {
      const e = state.agents[i];
      position.set(A.x[e], A.y[e], A.z[e]);
      velocity.set(A.vx[e], A.vy[e], A.vz[e]);
      if (velocity.lengthSq() > 1e-8) quaternion.setFromUnitVectors(forward, velocity.normalize());
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
      if (params.showVelocity) {
        color.copy(slow).lerp(fast, Math.min(1, Math.hypot(A.vx[e], A.vy[e], A.vz[e]) / params.maxSpeed));
        mesh.setColorAt(i, color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    target.position.set(state.goal.x, state.goal.y, state.goal.z);
    target.rotation.z += 0.008;
    sensor.visible = Boolean(params.showSensors);
    const lead = state.agents[0];
    sensor.position.set(A.x[lead], A.y[lead], A.z[lead]);
    viewport.follow(state.metrics.cx, state.metrics.cy, state.metrics.cz);
    viewport.frame(Math.max(95, params.worldRadius * 1.35));
  }

  return { render, dispose() {} };
}

export default createSwarmView;
