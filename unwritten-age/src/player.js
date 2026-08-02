import * as THREE from "three";
import { groundY, WORLD_SIZE } from "./world.js";
import { RiggedHumanoid } from "./character/rigged-humanoid.js";

/**
 * Player controller and third-person camera.
 *
 * This file owns movement, collision and camera only. It never builds or
 * inspects a mesh — the visible body is a `Humanoid` behind `this.avatar`, and
 * swapping in a rigged glTF means replacing that one object. The controller
 * talks to it through exactly three things: `avatar.root`, `avatar.capsule`
 * and `avatar.animate()`.
 */

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(camera, dom, appearance) {
    this.camera = camera;
    this.dom = dom;

    this.maxHp = 220;
    this.hp = 220;
    this.shield = 0;
    this.walkSpeed = 3.4;   // metres/second — a real walking pace
    this.runSpeed = 7.4;

    this.mesh = new THREE.Group();

    this.avatar = new RiggedHumanoid(appearance);
    this.mesh.add(this.avatar.root);

    // Faint divine presence. Kept low — this is a mortal avatar, and a blazing
    // aura would flatten the silhouette we just built.
    this.light = new THREE.PointLight("#ffc067", 2.2, 6, 2);
    this.light.position.y = 1.4;
    this.mesh.add(this.light);

    this.position = new THREE.Vector3(0, 0, 40);
    this.facing = Math.PI;
    this.speed01 = 0;
    this.mesh.position.copy(this.position);

    this.yaw = 0;
    this.pitch = 0.34;
    this.distance = 6.4;

    this.keys = new Set();
    this.dragging = false;
    this.bindInput();
  }

  /** Rebuild the body from new appearance data, preserving all motion state. */
  setAppearance(appearance) {
    this.avatar.setAppearance(appearance);
  }

  get capsule() {
    return this.avatar.capsule;
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      this.keys.add(e.code);
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "Space"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    this.dom.addEventListener("contextmenu", (e) => e.preventDefault());
    this.dom.addEventListener("pointerdown", (e) => {
      if (e.button === 2 || e.button === 1) {
        this.dragging = true;
        this.dom.setPointerCapture(e.pointerId);
      }
    });
    this.dom.addEventListener("pointerup", (e) => {
      this.dragging = false;
      if (this.dom.hasPointerCapture?.(e.pointerId)) this.dom.releasePointerCapture(e.pointerId);
    });
    this.dom.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      this.yaw -= e.movementX * 0.0045;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * 0.003, 0.04, 1.15);
    });
    this.dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.008, 2.2, 26);
    }, { passive: false });
  }

  update(dt) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // Facing -Z with +Y up, forward × up is already the player's right hand.
    // The old negate here is what made strafing come out mirrored.
    const right = new THREE.Vector3().crossVectors(forward, UP);

    const move = new THREE.Vector3();
    if (this.keys.has("KeyW")) move.add(forward);
    if (this.keys.has("KeyS")) move.sub(forward);
    if (this.keys.has("KeyD") || this.keys.has("KeyE")) move.add(right);
    if (this.keys.has("KeyA") || this.keys.has("KeyQ")) move.sub(right);

    const running = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const moving = move.lengthSq() > 0;
    const speed = running ? this.runSpeed : this.walkSpeed;

    if (moving) {
      move.normalize();
      this.position.addScaledVector(move, speed * dt);

      const limit = WORLD_SIZE * 0.46;
      this.position.x = THREE.MathUtils.clamp(this.position.x, -limit, limit);
      this.position.z = THREE.MathUtils.clamp(this.position.z, -limit, limit);

      // Turn toward travel, shortest way round, at a human turn rate.
      const want = Math.atan2(move.x, move.z);
      let delta = want - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * Math.min(1, dt * 11);
    }

    // Gait blend, eased so starting and stopping are not instant.
    const targetGait = moving ? (running ? 1 : 0.46) : 0;
    this.speed01 += (targetGait - this.speed01) * Math.min(1, dt * 8);

    this.position.y = groundY(this.position.x, this.position.z);
    this.mesh.position.copy(this.position);
    this.avatar.root.rotation.y = this.facing;
    this.avatar.animate(dt, this.speed01);

    this.updateCamera(dt);
  }

  updateCamera(dt) {
    // Track the chest, not the feet — framing the feet is what makes a
    // third-person camera feel like it is filming the floor.
    const focusY = this.position.y + this.avatar.headHeight * 0.82;
    const focus = new THREE.Vector3(this.position.x, focusY, this.position.z);

    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    ).multiplyScalar(this.distance);

    const desired = focus.clone().add(offset);
    // Never let the camera sink into the hillside behind the player.
    const floor = groundY(desired.x, desired.z) + 0.7;
    desired.y = Math.max(desired.y, floor);

    this.camera.position.lerp(desired, 1 - Math.pow(0.0009, dt));
    this.camera.lookAt(focus);
  }

  takeDamage(amount) {
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
