// The 3D viewport.
//
// This is the only file in the simulation path that imports three.js. Plugins
// hand it geometry and read camera state; they never see a WebGLRenderer. That
// boundary is what keeps the engine runnable without a canvas.

import * as THREE from 'three';

export class Viewport {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      // The viewport is opaque and covers its container, so there is nothing
      // to composite against and an alpha buffer is pure cost.
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080d);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
    this.camera.position.set(40, 25, 40);

    // Orbit state, kept in spherical coordinates around a target the plugin
    // can move. Writing this by hand rather than vendoring OrbitControls buys
    // one thing that matters here: the target can be driven by the simulation
    // (follow a rocket) while the user is still orbiting, without the two
    // fighting over the same state.
    this.target = new THREE.Vector3(0, 5, 0);
    this.desiredTarget = this.target.clone();
    this.spherical = { radius: 60, theta: Math.PI * 0.25, phi: Math.PI * 0.35 };
    this.desiredRadius = 60;
    this.followDamping = 6;

    this.minRadius = 2;
    this.maxRadius = 6000;
    this.enabled = true;

    this._pointers = new Map();
    this._lastPinch = 0;
    this._dragging = false;
    this._lastPointer = { x: 0, y: 0 };

    this._buildLighting();
    this._buildGround();
    this._bindInput();

    this.overlays = new THREE.Group();
    this.scene.add(this.overlays);

    // Objects a plugin owns; cleared wholesale when a plugin unloads so no
    // geometry survives into the next simulation.
    this.pluginRoot = new THREE.Group();
    this.scene.add(this.pluginRoot);

    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  _buildLighting() {
    // Hemisphere light does the ambient fill: a cool sky above and a warm
    // ground bounce below reads as outdoors without needing an environment map.
    const hemi = new THREE.HemisphereLight(0x9fd4ff, 0x2a2118, 0.55);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2e0, 2.4);
    sun.position.set(120, 180, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // The shadow frustum is fitted to the working volume by hand. Left at the
    // default it covers 10 units and every vehicle here sits outside it.
    const d = 160;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 600;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.5;
    this.scene.add(sun);
    this.sun = sun;

    // A dim rim light from behind keeps silhouettes readable against the dark
    // background when the sun is on the far side.
    const rim = new THREE.DirectionalLight(0x6be5ff, 0.5);
    rim.position.set(-100, 40, -120);
    this.scene.add(rim);
  }

  _buildGround() {
    this.ground = new THREE.Group();

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(8000, 8000),
      new THREE.MeshStandardMaterial({
        color: 0x0b1016,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.position.y = -0.02;
    this.ground.add(plane);

    // Two grids at different scales: a fine one for close work and a coarse
    // one that stays legible when the camera pulls back kilometres.
    const fine = new THREE.GridHelper(400, 80, 0x1b3a4a, 0x11212b);
    fine.material.transparent = true;
    fine.material.opacity = 0.6;
    this.ground.add(fine);

    const coarse = new THREE.GridHelper(4000, 40, 0x14313f, 0x0d1a22);
    coarse.material.transparent = true;
    coarse.material.opacity = 0.35;
    coarse.position.y = -0.01;
    this.ground.add(coarse);

    this.scene.add(this.ground);
  }

  setGroundVisible(visible) {
    this.ground.visible = visible;
  }

  _bindInput() {
    const canvas = this.canvas;
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled) return;
      canvas.setPointerCapture(event.pointerId);
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this._dragging = true;
      this._lastPointer = { x: event.clientX, y: event.clientY };
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this._pointers.has(event.pointerId)) return;
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (this._pointers.size === 2) {
        this._handlePinch();
        return;
      }
      if (!this._dragging) return;

      const dx = event.clientX - this._lastPointer.x;
      const dy = event.clientY - this._lastPointer.y;
      this._lastPointer = { x: event.clientX, y: event.clientY };

      this.spherical.theta -= dx * 0.005;
      this.spherical.phi -= dy * 0.005;
      // Clamped short of the poles: at exactly 0 or π the up vector and the
      // view direction are parallel and the camera basis collapses.
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi));
    });

    const release = (event) => {
      this._pointers.delete(event.pointerId);
      if (this._pointers.size === 0) this._dragging = false;
      this._lastPinch = 0;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);

    canvas.addEventListener(
      'wheel',
      (event) => {
        if (!this.enabled) return;
        event.preventDefault();
        // Exponential zoom: one wheel notch changes the distance by a constant
        // ratio, so the step feels the same whether you are 5 m or 5 km out.
        const factor = Math.exp(event.deltaY * 0.0012);
        this.desiredRadius = Math.max(
          this.minRadius,
          Math.min(this.maxRadius, this.desiredRadius * factor),
        );
      },
      { passive: false },
    );
  }

  _handlePinch() {
    const [a, b] = [...this._pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (this._lastPinch > 0) {
      const factor = this._lastPinch / distance;
      this.desiredRadius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, this.desiredRadius * factor),
      );
    }
    this._lastPinch = distance;
  }

  // Plugins call this each render to point the camera at whatever matters —
  // a rocket, a swarm centroid. The move is damped so a jittery target does
  // not translate into a jittery camera.
  follow(x, y, z) {
    this.desiredTarget.set(x, y, z);
  }

  frame(radius) {
    this.desiredRadius = Math.max(this.minRadius, Math.min(this.maxRadius, radius));
  }

  setCameraSpec(spec = {}) {
    if (spec.target) this.desiredTarget.set(...spec.target);
    if (spec.position) {
      const [px, py, pz] = spec.position;
      const dx = px - this.desiredTarget.x;
      const dy = py - this.desiredTarget.y;
      const dz = pz - this.desiredTarget.z;
      const radius = Math.hypot(dx, dy, dz);
      this.desiredRadius = radius;
      this.spherical.radius = radius;
      this.spherical.theta = Math.atan2(dx, dz);
      this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, dy / radius)));
      this.target.copy(this.desiredTarget);
    }
    if (spec.far) {
      this.camera.far = spec.far;
      this.camera.updateProjectionMatrix();
    }
  }

  update(dtSeconds) {
    // Frame-rate independent damping. The naive `x += (target - x) * k` form
    // converges at a speed that depends on the refresh rate, which is how a
    // camera ends up feeling different on a 144 Hz monitor.
    const t = 1 - Math.exp(-this.followDamping * dtSeconds);
    this.target.lerp(this.desiredTarget, t);
    this.spherical.radius += (this.desiredRadius - this.spherical.radius) * t;

    const { radius, theta, phi } = this.spherical;
    const sinPhi = Math.sin(phi);
    this.camera.position.set(
      this.target.x + radius * sinPhi * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * sinPhi * Math.cos(theta),
    );
    this.camera.lookAt(this.target);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = parent.clientWidth || 1;
    const height = parent.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // `false` leaves the canvas CSS size alone — the layout owns it, and
    // letting three.js write inline styles fights the grid.
    this.renderer.setSize(width, height, false);
  }

  // Drops everything the outgoing plugin added and frees its GPU buffers.
  // Three.js does not do this on removal, and without it every plugin switch
  // leaks a scene's worth of geometry.
  clearPlugin() {
    disposeTree(this.pluginRoot);
    this.pluginRoot.clear();
    disposeTree(this.overlays);
    this.overlays.clear();
  }

  add(object) {
    this.pluginRoot.add(object);
    return object;
  }

  get info() {
    const { render, memory } = this.renderer.info;
    return {
      drawCalls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
    };
  }
}

function disposeTree(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

function disposeMaterial(material) {
  for (const key of Object.keys(material)) {
    const value = material[key];
    if (value && value.isTexture) value.dispose();
  }
  material.dispose();
}

export default Viewport;
