// The scheduler.
//
// Physics advances on a fixed timestep and nothing else. Integrating by the
// frame's wall-clock delta is the single most common way a browser simulation
// becomes irreproducible: the same run on a 60 Hz laptop and a 144 Hz monitor
// takes different-sized steps, accumulates different truncation error, and
// lands the rocket in a different place. Here a tick is always the same dt, so
// tick number 18,000 means exactly 150.000 s of simulated time on any machine.
//
// Rendering is decoupled and interpolates between the two most recent states,
// which is what keeps a 120 Hz sim looking smooth on a 60 Hz display.

export const PHASES = [
  'input',    // sample controls, apply scripted commands
  'sense',    // sensors read the previous tick's world
  'control',  // autopilots and controllers decide
  'actuate',  // apply controller output to actuators, with rate limits
  'forces',   // accumulate forces and torques
  'integrate',// advance state
  'constrain',// contacts, joints, ground
  'post',     // derived quantities, verdicts, cleanup
];

export class Loop {
  constructor({ hz = 120, maxStepsPerFrame = 8 } = {}) {
    this.hz = hz;
    this.dt = 1 / hz;

    // A frame that needs more steps than this gives up on catching up and lets
    // simulated time fall behind wall-clock time. Without the cap, one slow
    // frame schedules extra steps, which makes the next frame slower still —
    // the spiral of death that ends with a locked tab.
    this.maxStepsPerFrame = maxStepsPerFrame;

    this.accumulator = 0;
    this.tick = 0;
    this.time = 0;          // simulated seconds, always tick * dt
    this.timeScale = 1;
    this.running = false;
    this.paused = true;

    this.systems = new Map(PHASES.map((phase) => [phase, []]));
    this.renderCallbacks = [];

    this._raf = 0;
    this._lastWallClock = 0;
    this._stepsRequested = 0;
    this._frameStart = 0;

    // Rolling performance numbers for the telemetry bar.
    this.stats = {
      fps: 0,
      stepMs: 0,
      renderMs: 0,
      stepsLastFrame: 0,
      behind: false,
    };
    this._fpsAccum = 0;
    this._fpsFrames = 0;
  }

  // Systems are (world, dt, ctx) => void and run in insertion order within a
  // phase. Order across phases is fixed by PHASES, which is what stops a
  // plugin from accidentally reading a force that has not been summed yet.
  addSystem(phase, fn, label = fn.name || 'anonymous') {
    const list = this.systems.get(phase);
    if (!list) throw new Error(`Unknown phase "${phase}"`);
    fn._label = label;
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  onRender(fn) {
    this.renderCallbacks.push(fn);
    return () => {
      const i = this.renderCallbacks.indexOf(fn);
      if (i >= 0) this.renderCallbacks.splice(i, 1);
    };
  }

  clearSystems() {
    for (const phase of PHASES) this.systems.get(phase).length = 0;
    this.renderCallbacks.length = 0;
  }

  // One deterministic step. Exposed directly so headless callers — a batch
  // optimiser, a test — can drive the simulation without a display refresh.
  step(ctx) {
    const dt = this.dt;
    for (const phase of PHASES) {
      const list = this.systems.get(phase);
      for (let i = 0; i < list.length; i++) list[i](ctx.world, dt, ctx);
    }
    this.tick++;
    // Deriving time from the tick count rather than accumulating `+= dt`
    // avoids the float drift that would otherwise put t at 149.9999997 after
    // 18,000 additions.
    this.time = this.tick * dt;
  }

  start(ctx) {
    if (this.running) return;
    this.running = true;
    this._lastWallClock = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(frame);
      this._frame(now, ctx);
    };
    this._raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _frame(now, ctx) {
    let frameSeconds = (now - this._lastWallClock) / 1000;
    this._lastWallClock = now;

    // A tab restored from the background reports an enormous delta. Clamping
    // it means the simulation resumes where it was rather than trying to
    // fast-forward through ten minutes of physics in one frame.
    if (frameSeconds > 0.25) frameSeconds = 0.25;

    this._fpsAccum += frameSeconds;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.stats.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    let steps = 0;
    const stepStart = performance.now();

    if (this.paused) {
      // While paused the only way time advances is an explicit single-step
      // request from the transport controls.
      while (this._stepsRequested > 0) {
        this.step(ctx);
        this._stepsRequested--;
        steps++;
      }
      this.accumulator = 0;
    } else {
      this.accumulator += frameSeconds * this.timeScale;
      while (this.accumulator >= this.dt && steps < this.maxStepsPerFrame) {
        this.step(ctx);
        this.accumulator -= this.dt;
        steps++;
      }
      // Dropping the leftover when we hit the cap keeps the backlog from
      // compounding into the next frame.
      this.stats.behind = this.accumulator >= this.dt;
      if (this.stats.behind) this.accumulator = 0;
    }

    this.stats.stepMs = performance.now() - stepStart;
    this.stats.stepsLastFrame = steps;

    // Fraction of a tick the renderer is ahead of the last integrated state.
    // Plugins use it to interpolate positions so motion looks continuous even
    // though the physics is quantised.
    const alpha = this.paused ? 0 : this.accumulator / this.dt;

    const renderStart = performance.now();
    for (const fn of this.renderCallbacks) fn(alpha, ctx);
    this.stats.renderMs = performance.now() - renderStart;
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  toggle() {
    this.paused = !this.paused;
  }

  // Advances exactly n ticks on the next frame, regardless of pause state.
  requestSteps(n = 1) {
    this._stepsRequested += n;
  }

  reset() {
    this.tick = 0;
    this.time = 0;
    this.accumulator = 0;
    this._stepsRequested = 0;
  }
}

export default Loop;
