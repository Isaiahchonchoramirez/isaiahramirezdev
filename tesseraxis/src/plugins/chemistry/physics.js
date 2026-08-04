// Which compounds a set of elements can actually form.
//
// Not a time-stepped physical system: a search. It is written as one anyway
// because the search has a natural progression — candidate stoichiometries
// are enumerated in batches across ticks — and that makes the platform's
// timeline, telemetry and graphs mean something rather than being decoration.
//
// The rule being taught is charge balance. A neutral compound needs the
// oxidation numbers of its atoms, weighted by how many of each there are, to
// sum to zero. That one constraint is what rules out NaCl2 and permits CaCl2,
// and it is why the generator rejects far more than it accepts.

import { BY_SYMBOL, isMetal, isNoble } from './elements.js';

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** Bond character from the electronegativity difference across the pair. */
export function classifyBond(a, b) {
  if (a.electronegativity === null || b.electronegativity === null) return { type: 'none', delta: 0 };
  const delta = Math.abs(a.electronegativity - b.electronegativity);
  if (isMetal(a) && isMetal(b)) return { type: 'metallic', delta };
  // The 1.7 line is the usual teaching threshold; it is a gradient, not a
  // cliff, which is why the readout shows the actual difference too.
  if (delta >= 1.7) return { type: 'ionic', delta };
  if (delta >= 0.4) return { type: 'polar covalent', delta };
  return { type: 'nonpolar covalent', delta };
}

function formulaOf(parts) {
  return parts.map(({ element, count }) => element.symbol + (count > 1 ? subscript(count) : '')).join('');
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (n) => String(n).split('').map((d) => SUBSCRIPTS[Number(d)]).join('');

/**
 * Order a formula the way chemists write it: the more electropositive element
 * first. That is a convention, but writing ClNa instead of NaCl is the kind of
 * thing that makes a generated result look wrong even when it is right.
 */
function order(parts) {
  return [...parts].sort((p, q) => {
    const a = p.element.electronegativity ?? 99;
    const b = q.element.electronegativity ?? 99;
    if (a !== b) return a - b;
    return p.element.number - q.element.number;
  });
}

/**
 * How ordinary a charge-balanced result is.
 *
 * Charge balance says a formula is *possible*. It does not say it is
 * something you would find on a shelf — CrO₃ and Cr₂O₃ both balance, and one
 * of them is far more common. Score rewards using each element's most typical
 * oxidation state and small whole-number ratios, and penalises combinations
 * that balance on paper but are not really molecular compounds at all.
 */
function score(parts, states, bond) {
  let value = 60;

  parts.forEach(({ element, count }, index) => {
    const rank = element.oxidation.indexOf(states[index]);
    // Most-common state is free; each step down the list costs.
    value -= rank * 9;
    if (count > 3) value -= (count - 3) * 6;
  });

  if (bond.type === 'ionic') value += 14;
  else if (bond.type === 'polar covalent') value += 8;
  else if (bond.type === 'metallic') value -= 22; // an alloy, not a compound
  else if (bond.type === 'nonpolar covalent') value += 2;

  const total = parts.reduce((sum, p) => sum + p.count, 0);
  if (total > 6) value -= (total - 6) * 4;

  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Every charge-balanced stoichiometry for one combination of elements. */
export function combinationsFor(symbols, maxSubscript) {
  const elements = symbols.map((s) => BY_SYMBOL.get(s)).filter(Boolean);
  const results = [];
  const rejections = [];

  if (elements.length < 2) return { results, rejections, evaluated: 0 };

  if (elements.some(isNoble)) {
    rejections.push({
      formula: elements.map((e) => e.symbol).join(' + '),
      reason: 'A noble gas has a filled valence shell, so it has no oxidation state to balance with.',
    });
    return { results, rejections, evaluated: 0 };
  }

  const counts = elements.map(() => 1);
  const seen = new Set();
  let evaluated = 0;
  let anyBalanced = false;

  const walk = (index) => {
    if (index === elements.length) {
      // Only reduced ratios: Na₂Cl₂ is not a separate compound from NaCl.
      const divisor = counts.reduce((a, b) => gcd(a, b));
      if (divisor !== 1) return;

      const stateWalk = (i, chosen) => {
        if (i === elements.length) {
          evaluated++;
          const charge = chosen.reduce((sum, state, k) => sum + state * counts[k], 0);
          if (charge !== 0) return;
          anyBalanced = true;

          const parts = elements.map((element, k) => ({ element, count: counts[k] }));
          const ordered = order(parts);
          const orderedStates = ordered.map((p) => chosen[parts.indexOf(p)]);
          const formula = formulaOf(ordered);
          if (seen.has(formula)) return;
          seen.add(formula);

          const bond = classifyBond(ordered[0].element, ordered[ordered.length - 1].element);
          const mass = ordered.reduce((sum, p) => sum + p.element.mass * p.count, 0);
          results.push({
            formula,
            parts: ordered,
            states: orderedStates,
            bond,
            mass,
            stability: score(ordered, orderedStates, bond),
          });
          return;
        }
        for (const state of elements[i].oxidation) stateWalk(i + 1, [...chosen, state]);
      };
      stateWalk(0, []);
      return;
    }
    for (let n = 1; n <= maxSubscript; n++) {
      counts[index] = n;
      walk(index + 1);
    }
    counts[index] = 1;
  };
  walk(0);

  if (!anyBalanced) {
    const positiveOnly = elements.every((e) => e.oxidation.every((s) => s > 0));
    const negativeOnly = elements.every((e) => e.oxidation.every((s) => s < 0));
    rejections.push({
      formula: elements.map((e) => e.symbol).join(' + '),
      reason: positiveOnly
        ? 'Every one of these elements gives up electrons. With nothing to accept them the charges cannot cancel.'
        : negativeOnly
          ? 'Every one of these elements accepts electrons. With nothing to donate them the charges cannot cancel.'
          : `No whole-number ratio up to ${maxSubscript} balances the available oxidation states.`,
    });
  }

  results.sort((a, b) => b.stability - a.stability);
  return { results, rejections, evaluated };
}

/** Every subset of the chosen elements worth trying, smallest first. */
function subsets(symbols, maxElements) {
  const out = [];
  const walk = (start, current) => {
    if (current.length >= 2) out.push([...current]);
    if (current.length === maxElements) return;
    for (let i = start; i < symbols.length; i++) {
      current.push(symbols[i]);
      walk(i + 1, current);
      current.pop();
    }
  };
  walk(0, []);
  return out.sort((a, b) => a.length - b.length);
}

export function createChemistry(ctx) {
  const { params } = ctx;
  // Four slots rather than a typed list: the inspector only renders sliders,
  // switches and dropdowns, and a dropdown of real symbols cannot be
  // misspelled.
  const chosen = [params.elementA, params.elementB, params.elementC, params.elementD];
  const known = [...new Set(chosen.filter((s) => s && s !== 'none' && BY_SYMBOL.has(s)))];

  const queue = subsets(known, params.maxElements);

  return {
    symbols: known, unknown: [], queue, cursor: 0,
    compounds: [], rejections: [],
    evaluated: 0, done: queue.length === 0,
    phase: queue.length === 0 ? 'idle' : 'searching',
    metrics: {
      evaluated: 0, found: 0, ionic: 0, covalent: 0, metallic: 0,
      progress: 0, bestStability: 0,
    },
  };
}

export function makeSystems(ctx, state) {
  function search() {
    if (state.done) return;
    const params = ctx.params;

    // One subset per tick. The batch is small on purpose: the search is what
    // the timeline is showing, so it should be visible rather than finished
    // before the first frame renders.
    const combination = state.queue[state.cursor++];
    const { results, rejections, evaluated } = combinationsFor(combination, params.maxSubscript);

    state.evaluated += evaluated;
    for (const rejection of rejections) state.rejections.push(rejection);
    for (const compound of results) {
      if (compound.stability < params.minStability) {
        state.rejections.push({
          formula: compound.formula,
          reason: `Balances at ${compound.states.join(' / ')} but scores ${compound.stability}, below the plausibility floor.`,
        });
        continue;
      }
      state.compounds.push(compound);
    }

    if (state.cursor >= state.queue.length) {
      state.done = true;
      state.phase = 'complete';
      state.compounds.sort((a, b) => b.stability - a.stability || a.mass - b.mass);
      ctx.mark('experiment',
        `${state.compounds.length} compounds from ${state.evaluated} candidate stoichiometries`);
      ctx.loop.pause();
    }
  }

  function post() {
    const m = state.metrics;
    m.evaluated = state.evaluated;
    m.found = state.compounds.length;
    m.ionic = state.compounds.filter((c) => c.bond.type === 'ionic').length;
    m.covalent = state.compounds.filter((c) => c.bond.type.includes('covalent')).length;
    m.metallic = state.compounds.filter((c) => c.bond.type === 'metallic').length;
    m.progress = state.queue.length ? (state.cursor / state.queue.length) * 100 : 100;
    m.bestStability = state.compounds.length ? state.compounds[0].stability : 0;
    ctx.recorder.writeMany(m);
  }

  return { search, post };
}
