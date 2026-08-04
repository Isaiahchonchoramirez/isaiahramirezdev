import { Simulation } from '../src/engine/simulation.js';
import { params, channels, graphs, actions, defaultParams } from '../src/plugins/vehicle/spec.js';
import { createVehicle, makeSystems } from '../src/plugins/vehicle/physics.js';

globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const plugin = { id: 'vehicle-dynamics', title: 'Vehicle Dynamics Lab', capacity: 32, params, channels, graphs, actions,
  setup(ctx) { const state = createVehicle(ctx), s = makeSystems(ctx, state); ctx.state = state;
    ctx.loop.addSystem('input', s.input); ctx.loop.addSystem('control', s.control); ctx.loop.addSystem('forces', s.forces);
    ctx.loop.addSystem('integrate', s.integrate); ctx.loop.addSystem('constrain', s.constrain); ctx.loop.addSystem('post', s.post); }
};

function run(scenario, seed = 1001, seconds = 25) {
  const sim = new Simulation({ hz: 120, capacity: 32 }); sim.print = () => {}; sim.register(plugin);
  sim.load(plugin.id, { seed, params: defaultParams({ scenario }) });
  const max = seconds * sim.hz;
  for (let i = 0; i < max && sim.ctx.state.phase !== 'stopped'; i++) sim.step(1);
  const m = sim.ctx.state.metrics;
  return { finite: Object.values(m).every(Number.isFinite), speed: m.speed, error: m.pathError, stop: m.stoppingDistance, collisions: m.collisions };
}

let failures = 0;
for (const scenario of ['autonomous', 'braking', 'skidpad']) {
  const r = run(scenario);
  const pass = r.finite && (scenario !== 'braking' || (r.speed < 0.3 && r.stop > 5 && r.stop < 120));
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${scenario.padEnd(11)} speed ${r.speed.toFixed(2)} m/s · path ${r.error.toFixed(2)} m · stop ${r.stop.toFixed(1)} m · contacts ${r.collisions}`);
}
const a = run('autonomous', 424242, 8), b = run('autonomous', 424242, 8);
const deterministic = JSON.stringify(a) === JSON.stringify(b);
if (!deterministic) failures++;
console.log(`[${deterministic ? 'PASS' : 'FAIL'}] determinism same seed reproduces vehicle metrics exactly`);
process.exit(failures ? 1 : 0);
