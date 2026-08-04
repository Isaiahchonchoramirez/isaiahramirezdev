// Research execution primitives shared by the browser and future cloud workers.
// These functions know nothing about a particular plugin: an evaluator receives
// a seed and parameter set and returns objective metrics.

export function compileScenarioScript(steps) {
  if (!Array.isArray(steps)) throw new TypeError('Scenario script must be an array');
  const compiled = steps.map((step, index) => {
    if (!Number.isInteger(step.tick) || step.tick < 0) throw new Error(`Script step ${index} has an invalid tick`);
    if (!['action', 'parameter', 'mark'].includes(step.type)) throw new Error(`Script step ${index} has an invalid type`);
    if (step.type !== 'mark' && typeof step.key !== 'string') throw new Error(`Script step ${index} needs a key`);
    return Object.freeze({ ...step });
  }).sort((a, b) => a.tick - b.tick);
  return Object.freeze(compiled);
}

export function attachScenarioScript(sim, steps) {
  const script = compileScenarioScript(steps);
  let cursor = 0;
  return sim.loop.addSystem('input', () => {
    while (cursor < script.length && script[cursor].tick <= sim.loop.tick) {
      const step = script[cursor++];
      if (step.type === 'action') sim.setAction(step.key, step.value);
      else if (step.type === 'parameter') sim.setParam(step.key, step.value);
      else sim.mark('script', step.label ?? 'Script marker', step.payload ?? null);
    }
  }, 'research:scenario-script');
}

export function gridCandidates(space) {
  const entries = Object.entries(space);
  const out = [];
  const visit = (index, current) => {
    if (index === entries.length) { out.push({ ...current }); return; }
    const [key, values] = entries[index];
    if (!Array.isArray(values) || values.length === 0) throw new Error(`Search dimension "${key}" is empty`);
    for (const value of values) { current[key] = value; visit(index + 1, current); }
  };
  visit(0, {});
  return out;
}

export async function optimize({ candidates, seeds = [1], evaluate, objective, direction = 'min', onProgress, signal }) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('Optimization needs candidates');
  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    if (signal?.aborted) throw new DOMException('Optimization cancelled', 'AbortError');
    const metrics = [];
    for (const seed of seeds) metrics.push(await evaluate({ params: candidates[i], seed }));
    const score = metrics.reduce((sum, metric) => sum + Number(objective(metric)), 0) / metrics.length;
    const result = { index: i, params: candidates[i], score, metrics };
    results.push(result); onProgress?.({ completed: i + 1, total: candidates.length, result });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  results.sort((a, b) => direction === 'max' ? b.score - a.score : a.score - b.score);
  return { best: results[0], results };
}

export function makeResearchJob({ plugin, kind, seed = 1, params = {}, script = [], objective = null }) {
  if (!plugin || !['run', 'sweep', 'optimize', 'rl-train'].includes(kind)) throw new Error('Invalid research job');
  return {
    format: 'tesseraxis-research-job/1', id: crypto.randomUUID(), plugin, kind, seed,
    params: structuredClone(params), script: compileScenarioScript(script), objective,
    createdAt: new Date().toISOString(), status: 'queued',
  };
}
