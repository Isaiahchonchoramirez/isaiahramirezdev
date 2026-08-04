import { Simulation } from '../src/engine/simulation.js';
import { params, channels, graphs, actions, defaultParams } from '../src/plugins/ballistics/spec.js';
import { createBallistics, makeSystems } from '../src/plugins/ballistics/physics.js';

globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const plugin = {
  id: 'ballistics', title: 'Ballistics', capacity: 16, params, channels, graphs, actions,
  setup(ctx) {
    const state = createBallistics(ctx), systems = makeSystems(ctx, state); ctx.state = state;
    ctx.loop.addSystem('integrate', systems.integrate);
    ctx.loop.addSystem('constrain', systems.constrain);
    ctx.loop.addSystem('post', systems.post);
  },
};

function run(mode, overrides = {}, seconds = 30) {
  const sim = new Simulation({ hz: 120, capacity: 16 }); sim.print = () => {}; sim.register(plugin);
  sim.load(plugin.id, { seed: 1618, params: defaultParams({ mode, ...overrides }) });
  for (let i = 0; i < seconds * sim.hz && !sim.ctx.state.done; i++) sim.step(1);
  const s = sim.ctx.state;
  return { done: s.done, phase: s.phase, metrics: { ...s.metrics }, impact: s.impact, terminal: s.terminal, guidance: { ...s.guidance } };
}

const cases = [
  ['exterior', run('exterior')],
  ['terminal', run('terminal', { elevation: 0, targetRange: 300 })],
  ['intercept', run('intercept')],
];
let failures = 0;
for (const [name, result] of cases) {
  const finite = Object.values(result.metrics).every(Number.isFinite);
  const modeResult = name === 'terminal' ? Boolean(result.terminal) : name === 'intercept' ? Number.isFinite(result.guidance.missDistance) : Boolean(result.impact);
  const pass = result.done && finite && modeResult;
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name.padEnd(9)} ${result.phase} · ${result.metrics.speed.toFixed(1)} m/s`);
}

const a = run('exterior'), b = run('exterior');
const deterministic = JSON.stringify(a) === JSON.stringify(b);
if (!deterministic) failures++;
console.log(`[${deterministic ? 'PASS' : 'FAIL'}] determinism same initial state reproduces trajectory exactly`);
const miss = run('terminal', { elevation: 0, azimuth: 10, targetRange: 300 });
const finitePlate = miss.done && !miss.terminal && miss.phase === 'target-missed';
if (!finitePlate) failures++;
console.log(`[${finitePlate ? 'PASS' : 'FAIL'}] finite target geometry rejects a shot outside the plate`);
process.exit(failures ? 1 : 0);
