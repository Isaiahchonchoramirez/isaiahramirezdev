import { compileScenarioScript, gridCandidates, optimize } from '../src/research/experiment.js';

const script = compileScenarioScript([{ tick: 20, type: 'action', key: 'brake', value: 1 }, { tick: 10, type: 'mark', label: 'start' }]);
if (script[0].tick !== 10) throw new Error('Scenario compiler did not order steps');
const candidates = gridCandidates({ kp: [1, 2, 3], kd: [0.1, 0.2] });
if (candidates.length !== 6) throw new Error('Grid expansion failed');
const result = await optimize({ candidates, seeds: [1, 2], evaluate: async ({ params, seed }) => ({ loss: (params.kp - 2) ** 2 + params.kd + seed * 0 }), objective: (m) => m.loss });
if (result.best.params.kp !== 2 || result.best.params.kd !== 0.1) throw new Error('Optimizer selected the wrong candidate');
console.log('[PASS] scenario scripting validates and orders deterministic inputs');
console.log('[PASS] grid search expands every parameter combination');
console.log('[PASS] optimizer aggregates seeded evaluations and selects the objective minimum');
