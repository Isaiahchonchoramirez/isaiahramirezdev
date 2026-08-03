// Visual instruments.
//
// The point of this platform is that nothing is hidden, and a force you cannot
// see is hidden. These are the objects that put the physics on screen next to
// the thing it is acting on: the vectors, the path actually flown, the target
// the guidance is aiming at.

import * as THREE from 'three';

// A force vector drawn at a point. The length is a log-ish scaling of the
// magnitude rather than a linear one — thrust and drag differ by three orders
// of magnitude during a descent, and a linear scale renders one of them either
// invisible or off screen.
export class ForceArrow {
  constructor({ color = 0x6be5ff, scale = 0.01, maxLength = 40, headRatio = 0.18 } = {}) {
    this.scale = scale;
    this.maxLength = maxLength;
    this.headRatio = headRatio;

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    // depthTest off and a high renderOrder so instrumentation is never buried
    // inside the vehicle it is describing.
    this.material = material;

    // Unit-length shaft along +Y, scaled per frame. Building the geometry once
    // and scaling beats regenerating a cylinder every tick.
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), material);
    this.shaft.geometry.translate(0, 0.5, 0);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 10), material);
    this.head.geometry.translate(0, 0.5, 0);

    this.group = new THREE.Group();
    this.group.add(this.shaft, this.head);
    this.group.renderOrder = 999;
    this.group.visible = false;

    this._dir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._quat = new THREE.Quaternion();
  }

  // origin and vector are plain {x,y,z} from the engine.
  set(origin, vector) {
    const magnitude = Math.hypot(vector.x, vector.y, vector.z);
    if (magnitude < 1e-6) {
      this.group.visible = false;
      return;
    }
    // sqrt compresses the dynamic range enough to show a 5 kN control force
    // and a 900 kN main engine in the same frame.
    const length = Math.min(this.maxLength, Math.sqrt(magnitude) * this.scale);

    this._dir.set(vector.x, vector.y, vector.z).normalize();
    this._quat.setFromUnitVectors(this._up, this._dir);

    this.group.position.set(origin.x, origin.y, origin.z);
    this.group.quaternion.copy(this._quat);

    const headLength = length * this.headRatio;
    const shaftLength = Math.max(0.001, length - headLength);
    const width = Math.max(0.4, length * 0.05);

    this.shaft.scale.set(width, shaftLength, width);
    this.head.scale.set(width, headLength, width);
    this.head.position.y = shaftLength;

    this.group.visible = true;
  }

  setVisible(visible) {
    this._forced = visible;
    if (!visible) this.group.visible = false;
  }

  dispose() {
    this.shaft.geometry.dispose();
    this.head.geometry.dispose();
    this.material.dispose();
  }
}

// The path actually flown, as a preallocated line strip.
//
// Pushing points into a growing array and rebuilding the geometry each frame is
// the obvious implementation and it allocates a new GPU buffer every frame. This
// writes into one fixed buffer and moves the draw range instead.
export class Trail {
  constructor({ maxPoints = 4000, color = 0x6be5ff, opacity = 0.7 } = {}) {
    this.maxPoints = maxPoints;
    this.positions = new Float32Array(maxPoints * 3);
    this.count = 0;

    this.geometry = new THREE.BufferGeometry();
    this.attribute = new THREE.BufferAttribute(this.positions, 3);
    this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.attribute);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this.line = new THREE.Line(this.geometry, this.material);
    this.line.frustumCulled = false;

    this._minSpacing = 0.05;
    this._last = { x: NaN, y: NaN, z: NaN };
  }

  push(x, y, z) {
    // Skipping points closer together than the minimum keeps a hovering
    // vehicle from burning the whole buffer on a single spot.
    const dx = x - this._last.x;
    const dy = y - this._last.y;
    const dz = z - this._last.z;
    if (this.count > 0 && dx * dx + dy * dy + dz * dz < this._minSpacing * this._minSpacing) {
      return;
    }

    if (this.count >= this.maxPoints) {
      // Halve the trail rather than shifting every point down by one. The
      // shift is O(n) per frame forever; this is O(n) once per buffer fill and
      // the user reads it as the trail thinning out behind them.
      const half = this.maxPoints >> 1;
      this.positions.copyWithin(0, half * 3, this.count * 3);
      this.count -= half;
    }

    const i = this.count * 3;
    this.positions[i] = x;
    this.positions[i + 1] = y;
    this.positions[i + 2] = z;
    this.count++;
    this._last = { x, y, z };

    this.geometry.setDrawRange(0, this.count);
    this.attribute.needsUpdate = true;
    // Without this the line vanishes once it leaves the bounding sphere
    // computed when the buffer was empty.
    this.geometry.computeBoundingSphere();
  }

  clear() {
    this.count = 0;
    this._last = { x: NaN, y: NaN, z: NaN };
    this.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// The landing target: concentric rings with a tolerance band, so "did it land
// on the pad" is a question the picture answers.
export function createLandingPad({ radius = 12, tolerance = 5 } = {}) {
  const group = new THREE.Group();

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x141b24, roughness: 0.85, metalness: 0.1 }),
  );
  deck.position.y = 0.2;
  deck.receiveShadow = true;
  group.add(deck);

  const ring = (r, color, opacity) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.18, r, 96),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.42;
    return mesh;
  };

  group.add(ring(radius - 0.6, 0x6be5ff, 0.8));
  group.add(ring(tolerance, 0x48ffa8, 0.55));
  group.add(ring(radius * 0.45, 0x6be5ff, 0.25));

  // Crosshair through the centre, so lateral offset is readable at a glance.
  const cross = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-radius + 1, 0.43, 0),
    new THREE.Vector3(radius - 1, 0.43, 0),
    new THREE.Vector3(0, 0.43, -radius + 1),
    new THREE.Vector3(0, 0.43, radius - 1),
  ]);
  const crossLines = new THREE.LineSegments(
    cross,
    new THREE.LineBasicMaterial({ color: 0x6be5ff, transparent: true, opacity: 0.4 }),
  );
  group.add(crossLines);

  return group;
}

// A vertical beam marking a position on the ground plane — used for the target
// when the vehicle is too high for the pad itself to be more than a dot.
export function createBeacon({ color = 0x6be5ff, height = 400 } = {}) {
  const geometry = new THREE.CylinderGeometry(0.35, 0.35, height, 6, 1, true);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}
