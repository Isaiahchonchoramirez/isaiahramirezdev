import * as THREE from "three";
import { ENEMY_TYPES } from "./data.js";
import { groundY, WORLD_SIZE } from "./world.js";
import { makeRng } from "./noise.js";

/** Shared geometry — one allocation per shape, reused by every entity. */
const GEO = {
  wisp: new THREE.IcosahedronGeometry(0.9, 1),
  husk: new THREE.DodecahedronGeometry(1.1, 0),
  shard: new THREE.TetrahedronGeometry(0.32, 0),
};

export class Enemy {
  constructor(typeId, x, z) {
    const type = ENEMY_TYPES[typeId];
    this.type = type;
    this.maxHp = type.hp;
    this.hp = type.hp;
    this.dead = false;
    this.attackTimer = 0;
    this.home = new THREE.Vector2(x, z);

    const mat = new THREE.MeshStandardMaterial({
      color: type.colour,
      emissive: type.colour,
      emissiveIntensity: 0.9,
      roughness: 0.5,
      flatShading: true,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(typeId === "wisp" ? GEO.wisp : GEO.husk, mat);
    this.mesh.scale.setScalar(type.scale);
    this.mesh.position.set(x, groundY(x, z) + 1.5, z);
    this.mesh.castShadow = true;
    this.mesh.userData.entity = this;

    // Orbiting shards, so even a primitive reads as "wrong" rather than plain.
    this.shards = [];
    const count = typeId === "wisp" ? 3 : 5;
    for (let i = 0; i < count; i += 1) {
      const shard = new THREE.Mesh(GEO.shard, mat);
      this.mesh.add(shard);
      this.shards.push({ mesh: shard, phase: (i / count) * Math.PI * 2, r: 1.5 + i * 0.16 });
    }
    this.bob = Math.random() * Math.PI * 2;
  }

  update(dt, playerPos, onHit) {
    if (this.dead) return;
    this.bob += dt;

    const pos = this.mesh.position;
    const toPlayer = new THREE.Vector3().subVectors(playerPos, pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist < 26 && dist > 2.1) {
      // Chase.
      toPlayer.normalize();
      pos.x += toPlayer.x * this.type.speed * dt;
      pos.z += toPlayer.z * this.type.speed * dt;
    } else if (dist >= 26) {
      // Drift back toward home so the world does not slowly empty out.
      const home = new THREE.Vector3(this.home.x, 0, this.home.y);
      const back = home.sub(new THREE.Vector3(pos.x, 0, pos.z));
      if (back.length() > 3) {
        back.normalize();
        pos.x += back.x * this.type.speed * 0.45 * dt;
        pos.z += back.z * this.type.speed * 0.45 * dt;
      }
    }

    pos.y = groundY(pos.x, pos.z) + 1.5 + Math.sin(this.bob * 2) * 0.24;

    this.attackTimer -= dt;
    if (dist <= 2.6 && this.attackTimer <= 0) {
      this.attackTimer = 1.35;
      onHit(this.type.damage);
    }

    this.shards.forEach((s) => {
      s.phase += dt * 1.6;
      s.mesh.position.set(
        Math.cos(s.phase) * s.r,
        Math.sin(s.phase * 1.7) * 0.5,
        Math.sin(s.phase) * s.r,
      );
      s.mesh.rotation.x += dt * 2;
      s.mesh.rotation.y += dt * 1.4;
    });
    this.mesh.rotation.y += dt * 0.5;
  }

  damage(amount) {
    this.hp -= amount;
    this.mesh.material.emissiveIntensity = 2.6;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return this.dead;
  }
}

/** The god at the centre of the erasure. A bigger, slower, scripted fight. */
export class GodBoss {
  constructor(god, position) {
    this.god = god;
    this.maxHp = god.hp;
    this.hp = god.hp;
    this.dead = false;
    this.active = false;
    this.attackTimer = 2;
    this.phase = 0;

    const mat = new THREE.MeshStandardMaterial({
      color: god.colour,
      emissive: god.colour,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      flatShading: true,
      transparent: true,
    });
    this.material = mat;

    this.mesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 1), mat);
    core.castShadow = true;
    this.mesh.add(core);
    this.core = core;

    this.rings = [];
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 1.5, 0.16, 6, 40), mat);
      ring.rotation.x = Math.PI / 2 + i * 0.5;
      this.mesh.add(ring);
      this.rings.push(ring);
    }

    this.light = new THREE.PointLight(god.colour, 0, 90, 2);
    this.mesh.add(this.light);
    this.mesh.position.copy(position);
    this.mesh.visible = false;
    this.mesh.userData.boss = this;
  }

  spawn() {
    this.active = true;
    this.mesh.visible = true;
    this.light.intensity = 120;
  }

  update(dt, playerPos, onHit) {
    if (!this.active || this.dead) return;
    this.phase += dt;
    this.mesh.position.y += Math.sin(this.phase * 0.9) * dt * 0.6;
    this.core.rotation.y += dt * 0.7;
    this.rings.forEach((ring, i) => {
      ring.rotation.z += dt * (0.5 + i * 0.25);
      ring.rotation.y += dt * 0.3;
    });

    const dist = this.mesh.position.distanceTo(playerPos);
    this.attackTimer -= dt;
    if (dist < 22 && this.attackTimer <= 0) {
      this.attackTimer = 2.4;
      onHit(18, this.mesh.position.clone());
    }
  }

  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.material.emissiveIntensity = 3.2;
    if (this.hp === 0) this.dead = true;
    return this.dead;
  }
}

/** Populate the world with roaming enemies, avoiding town and water. */
export function spawnEnemies(scene) {
  const rng = makeRng(555);
  const enemies = [];
  const plan = [
    ["wisp", 34],
    ["husk", 16],
  ];

  plan.forEach(([typeId, count]) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 4000) {
      guard += 1;
      const x = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.7;
      if (x * x + z * z < 3600) continue; // leave the village and its approach safe
      if (groundY(x, z) < 3.4) continue; // not in the sea
      const enemy = new Enemy(typeId, x, z);
      scene.add(enemy.mesh);
      enemies.push(enemy);
      placed += 1;
    }
  });

  return enemies;
}
