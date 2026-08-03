// Headless flight test.
//
//   node public/tesseraxis/tools/fly.mjs
//   node public/tesseraxis/tools/fly.mjs --scenario entry --seeds 20 --verbose
//
// Flies the Powered Descent Lab in Node with no canvas and no renderer, which
// is possible only because the physics and the plugin's declarative spec were
// kept free of three.js. It is the regression test for the guidance: if a
// change to the controller stops it landing, this says so.
//
// It doubles as the determinism check — the same seed is flown twice and the
// two touchdown states are compared bit for bit.

import { Simulation } from '../src/engine/simulation.js';
import { params, channels, graphs, actions, defaultParams } from '../src/plugins/rocket-landing/spec.js';
import { createRocket, makeSystems, evaluateLanding, SCENARIOS } from '../src/plugins/rocket-landing/physics.js';

// The loop drives itself off requestAnimationFrame in the browser. Here the
// harness steps it by hand, so the stub only has to exist, not to fire.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const seedCount = Number(flag('seeds', 8));
const onlyScenario = flag('scenario', null);
const verbose = has('verbose');
const MAX_SECONDS = 420;

const plugin = {
  id: 'rocket-landing',
  title: 'Powered Descent Lab',
  capacity: 64,
  defaultSeed: 1337,
  params,
  channels,
  graphs,
  actions,
  setup(ctx) {
    const state = createRocket(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;
    ctx.sim.actions.set('autopilot', 1);
    ctx.loop.addSystem('input', systems.input);
    ctx.loop.addSystem('sense', systems.sense);
    ctx.loop.addSystem('control', () => {
      const p = ctx.params;
      state.pids.descent.set(p.descentKp, p.descentKi, p.descentKd);
    });
    ctx.loop.addSystem('control', systems.control);
    ctx.loop.addSystem('forces', systems.forces);
    ctx.loop.addSystem('integrate', systems.integrate);
    ctx.loop.addSystem('constrain', systems.constrain);
    ctx.loop.addSystem('post', systems.post);
    return () => {};
  },
};

function fly(scenario, seed, overrides = {}) {
  const sim = new Simulation({ hz: 120, capacity: 64 });
  // Silence the run's own console chatter; the harness prints its own summary.
  sim.print = () => {};
  sim.register(plugin);
  sim.load('rocket-landing', {
    seed,
    params: defaultParams({ scenario, ...overrides }),
  });

  const state = sim.ctx.state;
  const maxTicks = MAX_SECONDS * sim.hz;
  let peakTilt = 0;
  let peakLoad = 0;

  while (!state.touchdown && sim.loop.tick < maxTicks) {
    sim.step(1);
    peakTilt = Math.max(peakTilt, state.derived.tilt);
    peakLoad = Math.max(peakLoad, state.derived.acceleration / 9.80665);
  }

  if (!state.touchdown) {
    return { seed, timedOut: true, altitude: state.derived.altitude };
  }

  const result = evaluateLanding(state.touchdown, sim.params);
  return {
    seed,
    timedOut: false,
    status: result.status,
    headline: result.headline,
    failures: result.failures.map((f) => f.label),
    vertical: Math.abs(state.touchdown.vertical),
    lateral: state.touchdown.lateral,
    tilt: state.touchdown.tilt,
    offset: state.touchdown.offset,
    fuel: state.touchdown.fuel,
    time: state.touchdown.time,
    ignition: state.ignitionTime,
    peakTilt,
    peakLoad,
  };
}

// --------------------------------------------------------------------------

const scenarios = onlyScenario ? [onlyScenario] : Object.keys(SCENARIOS);
let failures = 0;
let total = 0;

console.log(`\nTesseraxis — powered descent flight test  (${seedCount} seeds per scenario)\n`);

for (const scenario of scenarios) {
  const results = [];
  for (let i = 0; i < seedCount; i++) {
    results.push(fly(scenario, 1000 + i * 7919));
  }

  const landed = results.filter((r) => !r.timedOut && r.status === 'good');
  const hard = results.filter((r) => !r.timedOut && r.status !== 'good');
  const stuck = results.filter((r) => r.timedOut);
  total += results.length;
  failures += hard.length + stuck.length;

  const label = SCENARIOS[scenario]?.label ?? scenario;
  const verdict = hard.length + stuck.length === 0 ? 'PASS' : 'FAIL';
  console.log(`  [${verdict}] ${label.padEnd(20)} ${landed.length}/${results.length} landed within limits`);

  if (landed.length > 0) {
    const mean = (key) => landed.reduce((sum, r) => sum + r[key], 0) / landed.length;
    const worst = (key) => Math.max(...landed.map((r) => r[key]));
    console.log(
      `         touchdown ${mean('vertical').toFixed(2)} m/s vertical (worst ${worst('vertical').toFixed(2)}), ` +
        `${mean('lateral').toFixed(2)} m/s lateral (worst ${worst('lateral').toFixed(2)})`,
    );
    console.log(
      `         miss ${mean('offset').toFixed(2)} m (worst ${worst('offset').toFixed(2)}), ` +
        `tilt ${mean('tilt').toFixed(2)}° (worst ${worst('tilt').toFixed(2)}°), ` +
        `peak tilt ${worst('peakTilt').toFixed(1)}°`,
    );
    console.log(
      `         burn ${(mean('time') - mean('ignition')).toFixed(1)} s, ` +
        `propellant left ${mean('fuel').toFixed(0)} kg, peak load ${worst('peakLoad').toFixed(2)} g`,
    );
  }

  for (const r of hard) {
    console.log(`         seed ${r.seed}: ${r.headline} — over: ${r.failures.join(', ')} ` +
      `(v ${r.vertical.toFixed(2)}, lat ${r.lateral.toFixed(2)}, tilt ${r.tilt.toFixed(2)}, miss ${r.offset.toFixed(2)})`);
  }
  for (const r of stuck) {
    console.log(`         seed ${r.seed}: never touched down (still at ${r.altitude.toFixed(0)} m)`);
  }
  if (verbose) {
    for (const r of results) console.log('        ', JSON.stringify(r));
  }
  console.log('');
}

// --------------------------------------------------------------------------
// Determinism: the same seed twice must produce identical touchdown state.

const a = fly('hop', 424242);
const b = fly('hop', 424242);
const identical =
  a.vertical === b.vertical && a.lateral === b.lateral &&
  a.tilt === b.tilt && a.offset === b.offset && a.time === b.time;

console.log(`  [${identical ? 'PASS' : 'FAIL'}] determinism        same seed reproduces touchdown exactly`);
if (!identical) {
  failures++;
  console.log(`         run A ${JSON.stringify(a)}`);
  console.log(`         run B ${JSON.stringify(b)}`);
}

console.log(`\n  ${total - failures}/${total + 1} checks passed\n`);
process.exit(failures === 0 ? 0 : 1);
