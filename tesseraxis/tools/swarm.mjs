// Deterministic, renderer-free regression test for the Swarm Intelligence Lab.
// Usage: node public/tesseraxis/tools/swarm.mjs

import { Simulation } from '../src/engine/simulation.js';
import { params, channels, graphs, actions, defaultParams } from '../src/plugins/swarm/spec.js';
import { createSwarm, makeSystems } from '../src/plugins/swarm/physics.js';

globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const plugin = {
  id: 'swarm', title: 'Swarm Intelligence Lab', capacity: 4096, defaultSeed: 271828,
  params, channels, graphs, actions,
  setup(ctx) {
    const state = createSwarm(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;
    ctx.loop.addSystem('input', systems.input);
    ctx.loop.addSystem('control', systems.control);
    ctx.loop.addSystem('integrate', systems.integrate);
    ctx.loop.addSystem('post', systems.post);
  },
};

function run(mission, seed, seconds = 12) {
  const sim = new Simulation({ hz: 120, capacity: 4096 });
  sim.print = () => {};
  sim.register(plugin);
  sim.load('swarm', { seed, params: defaultParams({ mission, agentCount: 256 }) });
  sim.step(seconds * sim.hz);
  const m = sim.ctx.state.metrics;
  const A = sim.ctx.state.Agent;
  let finite = true;
  for (const e of sim.ctx.state.agents) {
    finite &&= Number.isFinite(A.x[e]) && Number.isFinite(A.y[e]) && Number.isFinite(A.z[e]);
  }
  return { finite, ...m };
}

let failed = 0;
for (const mission of ['flock', 'rescue', 'formation']) {
  const result = run(mission, 94021);
  const pass = result.finite && result.meanSpeed > 0 && result.connected > 50 && result.dispersion > 0;
  if (!pass) failed++;
  console.log(
    `[${pass ? 'PASS' : 'FAIL'}] ${mission.padEnd(10)} ` +
    `${result.meanSpeed.toFixed(2)} m/s · ${result.connected.toFixed(1)}% connected · ` +
    `${result.alignment.toFixed(1)}% consensus · ${result.coverage.toFixed(1)}% coverage`,
  );
}

const a = run('rescue', 424242, 5);
const b = run('rescue', 424242, 5);
const deterministic = JSON.stringify(a) === JSON.stringify(b);
if (!deterministic) failed++;
console.log(`[${deterministic ? 'PASS' : 'FAIL'}] determinism same seed reproduces collective metrics exactly`);
process.exit(failed ? 1 : 0);
