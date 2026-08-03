// The kernel.
//
// Holds the world, the clock, the RNG, and the recorder, and owns the lifecycle
// of exactly one loaded plugin. Everything a plugin can touch arrives through
// the context object built here, so a plugin never reaches for a global and
// never has to know whether it is running attached to a canvas or headless in a
// batch job.

import World, { resetComponentRegistry } from './world.js';
import Loop from './loop.js';
import EventBus from './events.js';
import Recorder from './recorder.js';
import Rng from './rng.js';

export class Simulation {
  constructor({ hz = 120, capacity = 200000 } = {}) {
    this.hz = hz;
    this.capacity = capacity;

    this.loop = new Loop({ hz });
    this.events = new EventBus();
    this.recorder = new Recorder();
    this.rng = new Rng();

    this.world = null;
    this.plugin = null;
    this.teardown = null;
    this.params = {};
    this.seed = 1;

    // Live action state. Momentary actions read as 0/1 and hold while a key is
    // down; axis actions carry a signed value. Plugins read this in the
    // 'input' phase and never touch the keyboard themselves.
    this.actions = new Map();
    this.plugins = new Map();

    // 'live' means keys drive the run and are being written to the journal;
    // 'replay' means the journal drives the run and keys are ignored until the
    // user grabs control back.
    this.mode = 'live';

    this.ctx = null;
    this.log = [];
    this.logLimit = 400;

    this._bindTransport();
  }

  register(plugin) {
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  list() {
    return [...this.plugins.values()];
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  load(pluginId, { seed = null, params = null } = {}) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`No plugin registered as "${pluginId}"`);

    this.unload();
    // Rendering belongs to the host, but plugin scene lifetime follows plugin
    // lifetime. Clear the outgoing scene before setup adds the incoming one.
    this.viewport?.clearPlugin();

    this.plugin = plugin;
    this.seed = seed ?? plugin.defaultSeed ?? 1;
    this.rng.seed(this.seed);

    // Defaults first, then any overrides from a share link or a saved run, so
    // a plugin gaining a new parameter does not break older links.
    this.params = {};
    for (const spec of plugin.params ?? []) this.params[spec.key] = spec.default;
    if (params) Object.assign(this.params, params);

    // Component bits are a global 32-slot budget; releasing them here is what
    // lets the user switch between plugins all session without exhausting it.
    resetComponentRegistry();
    this.world = new World({ capacity: plugin.capacity ?? this.capacity });

    this.recorder.channels.clear();
    for (const spec of plugin.channels ?? []) this.recorder.defineChannel(spec.key, spec);
    this.recorder.reset({ plugin: plugin.id, seed: this.seed, params: { ...this.params } });

    this.actions.clear();
    for (const action of plugin.actions ?? []) this.actions.set(action.key, 0);

    this.loop.clearSystems();
    this.loop.reset();
    // The event bus also carries application-level listeners (the shell and
    // renderer lifecycle). Clearing it here silently disconnects the UI on
    // the first load and again on every restart. Transport is bound once in
    // the constructor; plugins that subscribe to events must release those
    // subscriptions from their teardown function.

    this.ctx = {
      sim: this,
      world: this.world,
      loop: this.loop,
      events: this.events,
      recorder: this.recorder,
      rng: this.rng,
      params: this.params,
      // Optional rendering boundary supplied by a browser host. Headless
      // callers leave this undefined and never import a plugin view.
      viewport: this.viewport,
      // Plugins call these rather than reading this.actions directly, so the
      // replay path and the live path go through one place.
      action: (key) => this.actions.get(key) ?? 0,
      emit: (type, payload) => this.events.emit(type, payload),
      mark: (type, label, payload) => this.mark(type, label, payload),
      print: (message, level) => this.print(message, level),
    };

    this.teardown = plugin.setup(this.ctx) ?? null;

    // Telemetry sampling and keyframing are the kernel's job, appended after
    // the plugin's own systems so they observe a fully settled tick.
    this.loop.addSystem('post', () => this._afterTick(), 'kernel:record');

    this.loop.start(this.ctx);
    this.mark('run', `${plugin.title} loaded · seed ${this.seed}`);
    this.print(`Loaded ${plugin.title} at ${this.hz} Hz, seed ${this.seed}`, 'info');
    this.events.emit('sim:loaded', { plugin });
    return plugin;
  }

  unload() {
    if (!this.plugin) return;
    this.loop.stop();
    if (typeof this.teardown === 'function') this.teardown();
    this.loop.clearSystems();
    this.world?.clear();
    this.teardown = null;
    this.plugin = null;
    this.ctx = null;
  }

  // Rebuilds the run from scratch with the current parameters. Resetting rather
  // than nudging state is the only way to keep a run reproducible after a
  // parameter change — a gain edited mid-flight makes the journal describe a
  // vehicle that never existed.
  restart({ seed = this.seed, params = this.params } = {}) {
    const id = this.plugin?.id;
    if (!id) return;
    const paused = this.loop.paused;
    this.load(id, { seed, params: { ...params } });
    if (paused) this.loop.pause();
    else this.loop.play();
    this.events.emit('sim:restarted', {});
  }

  // -----------------------------------------------------------------------
  // Per-tick kernel work
  // -----------------------------------------------------------------------

  _afterTick() {
    const { loop, recorder } = this;

    if (this.mode === 'replay') {
      for (const input of recorder.inputsForTick(loop.tick)) {
        this.actions.set(input.action, input.value);
      }
    }

    recorder.sample(loop.time, loop.tick);

    // World snapshots at a coarse interval give the timeline something to seek
    // to. Five seconds of simulated time at the default rate — frequent enough
    // that a scrub never re-simulates more than that, rare enough that a long
    // run does not hold hundreds of megabytes of state.
    if (loop.tick % recorder.keyframeEvery === 0) {
      recorder.keyframe(loop.tick, this.world.snapshot());
    }

    // A replay that reaches the end of its script hands control back rather
    // than sitting there consuming inputs that do not exist.
    if (this.mode === 'replay' && recorder._inputCursor >= recorder.inputs.length) {
      this.mode = 'live';
      this.events.emit('sim:mode', { mode: 'live' });
    }
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  setAction(key, value) {
    if (this.actions.get(key) === value) return;
    this.actions.set(key, value);
    if (this.mode === 'replay') {
      // Touching the controls during a replay takes the run back. Everything
      // the journal said would happen after this instant is discarded, because
      // it is no longer what happened.
      this.mode = 'live';
      this.recorder.truncateInputsAfter(this.loop.tick);
      this.print('Manual control taken — replay ahead of this point discarded', 'warn');
      this.events.emit('sim:mode', { mode: 'live' });
    }
    this.recorder.logInput(this.loop.tick, key, value);
  }

  // -----------------------------------------------------------------------
  // Transport
  // -----------------------------------------------------------------------

  _bindTransport() {
    this.events.on('transport:play', () => this.loop.play());
    this.events.on('transport:pause', () => this.loop.pause());
    this.events.on('transport:step', (n) => this.loop.requestSteps(n ?? 1));
  }

  setTimeScale(scale) {
    this.loop.timeScale = scale;
    this.events.emit('sim:timescale', { scale });
  }

  // Seeks by restoring the nearest world snapshot and re-simulating forward
  // under the recorded inputs. Slower than storing every frame's positions, and
  // completely faithful: the state you land on is the state the run actually
  // had, not an interpolation of what was drawn.
  seekToTick(targetTick) {
    const { recorder, loop } = this;
    if (!this.plugin) return;

    const target = Math.max(0, Math.min(targetTick, loop.tick));
    const keyframe = recorder.keyframeAtOrBefore(target);

    if (!keyframe) {
      this.restart();
      return;
    }

    const wasPaused = loop.paused;
    loop.pause();

    this.world.restore(keyframe.snapshot);
    loop.tick = keyframe.tick;
    loop.time = keyframe.tick * loop.dt;

    recorder.truncateToTick(keyframe.tick, keyframe.tick * loop.dt);
    recorder.seekInputCursor(keyframe.tick);
    this.mode = 'replay';

    // Re-simulate up to the requested tick. This is the same step() the live
    // loop calls, so the physics cannot diverge between the two paths.
    const budget = target - keyframe.tick;
    for (let i = 0; i < budget; i++) this.step(1);

    if (!wasPaused) loop.play();
    this.events.emit('sim:seek', { tick: loop.tick, time: loop.time });
  }

  seekToTime(seconds) {
    this.seekToTick(Math.round(seconds * this.hz));
  }

  step(n = 1) {
    for (let i = 0; i < n; i++) this.loop.step(this.ctx);
  }

  // -----------------------------------------------------------------------
  // Parameters
  // -----------------------------------------------------------------------

  setParam(key, value) {
    const spec = (this.plugin?.params ?? []).find((p) => p.key === key);
    this.params[key] = value;
    this.recorder.meta.params = { ...this.params };

    // Some parameters describe the vehicle as built (dry mass, engine count)
    // and cannot change mid-run without making the run incoherent; others are
    // gains and setpoints that an operator legitimately turns while flying.
    // The plugin declares which is which.
    if (spec?.rebuild) {
      this.restart({ params: this.params });
    } else {
      this.events.emit('param:changed', { key, value });
    }
  }

  // -----------------------------------------------------------------------
  // Log and event marks
  // -----------------------------------------------------------------------

  mark(type, label, payload = null) {
    this.recorder.logEvent(this.loop.tick, this.loop.time, type, label, payload);
    this.events.emit('sim:mark', { type, label, time: this.loop.time });
  }

  print(message, level = 'info') {
    const entry = { time: this.loop.time, message, level };
    this.log.push(entry);
    if (this.log.length > this.logLimit) this.log.shift();
    this.events.emit('sim:log', entry);
  }
}

export default Simulation;
