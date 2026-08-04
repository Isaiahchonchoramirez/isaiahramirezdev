import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createChemistry, makeSystems } from './physics.js';
import { createChemistryView } from './view.js';
import { BY_SYMBOL } from './elements.js';

export default definePlugin({
  id: 'chemistry',
  title: 'Periodic Combination Lab',
  subtitle: 'Valence · charge balance · bond character',
  summary: 'Choose elements and the lab enumerates every compound their oxidation states allow, classifies the bonding, ranks the results by plausibility, and explains what it rejected.',
  capacity: 16,
  defaultSeed: 118,
  camera: { position: [0, 34, 30], target: [0, 2, 0], far: 2000 },
  params, channels, graphs, actions,

  setup(ctx) {
    const state = createChemistry(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;
    ctx.loop.addSystem('control', systems.search, 'chemistry:search');
    ctx.loop.addSystem('post', systems.post, 'chemistry:telemetry');
    if (ctx.viewport) {
      const view = createChemistryView(ctx, state);
      ctx.loop.onRender(() => view.render());
      return () => view.dispose();
    }
    return () => {};
  },

  hierarchy(ctx) {
    const s = ctx.state;
    return [
      {
        label: `Elements · ${s.symbols.length} selected`,
        status: s.symbols.length >= 2 ? 'good' : 'warning',
        detail: s.symbols.join(', ') || 'choose at least two',
        children: s.symbols.map((symbol) => {
          const e = BY_SYMBOL.get(symbol);
          return {
            label: `${e.symbol} · ${e.name}`,
            status: 'active',
            detail: `group ${e.group} · EN ${e.electronegativity ?? '—'} · ${e.oxidation.join(', ') || 'no states'}`,
          };
        }),
      },
      {
        label: 'Search', status: s.done ? 'good' : 'active', detail: s.phase,
        children: [
          { label: 'Combinations', status: 'active', detail: `${s.cursor} of ${s.queue.length}` },
          { label: 'Candidates evaluated', status: 'active', detail: String(s.evaluated) },
          { label: 'Charge-balanced', status: s.compounds.length ? 'good' : 'idle', detail: String(s.compounds.length) },
          { label: 'Rejected', status: s.rejections.length ? 'warning' : 'idle', detail: String(s.rejections.length) },
        ],
      },
    ];
  },

  hud(ctx) {
    const m = ctx.state.metrics;
    return [
      { label: 'Evaluated', value: m.evaluated, precision: 0 },
      { label: 'Found', value: m.found, precision: 0, status: m.found ? 'good' : null },
      { label: 'Ionic', value: m.ionic, precision: 0 },
      { label: 'Covalent', value: m.covalent, precision: 0 },
      { label: 'Metallic', value: m.metallic, precision: 0 },
      { label: 'Best', value: m.bestStability, precision: 0 },
      { label: 'Progress', value: m.progress, unit: '%', precision: 0 },
    ];
  },

  inspect(ctx) {
    const s = ctx.state;
    const sections = [];

    if (s.compounds.length) {
      sections.push({
        title: `Compounds found (${s.compounds.length})`,
        rows: s.compounds.slice(0, 14).map((c) => ({
          label: c.formula,
          value: `${c.bond.type} · ${c.stability}`,
          status: c.stability >= 70 ? 'good' : c.stability >= 55 ? null : 'warning',
        })),
      });

      const best = s.compounds[0];
      // The formula stays out of the section title: titles are uppercased by
      // the panel styling, and NaCl is not the same string as NACL.
      sections.push({
        title: 'Most plausible compound',
        rows: [
          { label: 'Formula', value: best.formula, status: 'good' },
          { label: 'Bond character', value: best.bond.type },
          { label: 'Electronegativity difference', value: best.bond.delta, precision: 2 },
          { label: 'Oxidation states', value: best.states.join(' / ') },
          { label: 'Formula mass', value: best.mass, unit: 'u', precision: 2 },
          { label: 'Plausibility', value: best.stability, precision: 0,
            status: best.stability >= 70 ? 'good' : 'warning' },
          ...best.parts.map((p) => ({
            label: `${p.element.name} atoms`, value: p.count, precision: 0,
          })),
        ],
      });
    } else if (s.done) {
      sections.push({ title: 'No compounds', rows: [
        { label: 'Result', value: 'nothing balanced', status: 'warning' },
        { label: 'Candidates evaluated', value: s.evaluated, precision: 0 },
      ] });
    }

    if (ctx.params.showRejected && s.rejections.length) {
      sections.push({
        title: `Rejected (${s.rejections.length})`,
        rows: s.rejections.slice(0, 10).map((r) => ({
          label: r.formula, value: r.reason, status: 'warning',
        })),
      });
    }
    return sections;
  },

  verdict(ctx) {
    const s = ctx.state;
    if (!s.done) return null;
    const best = s.compounds[0];
    return {
      status: s.compounds.length ? 'good' : 'warning',
      headline: best
        ? `${s.compounds.length} compounds · best ${best.formula}`
        : 'No charge-balanced combination',
      rows: [
        { label: 'Elements', value: s.symbols.join(', ') || '—' },
        { label: 'Candidate stoichiometries', value: s.evaluated, precision: 0 },
        { label: 'Charge-balanced', value: s.compounds.length, precision: 0 },
        { label: 'Rejected', value: s.rejections.length, precision: 0 },
        { label: 'Ionic', value: ctx.state.metrics.ionic, precision: 0 },
        { label: 'Covalent', value: ctx.state.metrics.covalent, precision: 0 },
        ...(best ? [
          { label: 'Best formula', value: best.formula, status: 'good' },
          { label: 'Its oxidation states', value: best.states.join(' / ') },
        ] : []),
      ],
    };
  },

  explain() {
    return [
      { title: 'One rule does most of the work', body: 'A neutral compound needs its oxidation numbers, weighted by how many atoms of each element are present, to sum to zero. That single constraint is why NaCl exists and NaCl₂ does not: sodium only gives up one electron, so there is nothing to balance a second chloride. Calcium gives up two, so CaCl₂ is fine. The generator tries every ratio and keeps only the ones that cancel.' },
      { title: 'Balanced is not the same as real', body: 'Plenty of formulas balance on paper and are not things you could put in a bottle. Ca₃CO balances if you let carbon take −4, and it is nonsense. Plausibility scoring is what separates them: it rewards each element using its most common oxidation state and small whole-number ratios, and penalises exotic states and large subscripts. Treat the ranking as the useful output, not the raw list.' },
      { title: 'Bond character is a gradient', body: 'The difference in electronegativity across a compound predicts how the electrons are shared. Above roughly 1.7 one atom has effectively taken them and the bond is ionic; between 0.4 and 1.7 they are shared unevenly; below that, near-equally. The 1.7 line is a teaching convention rather than a physical boundary, which is why the actual difference is always shown next to the label — Fe₂O₃ sits at 1.61 and gets called covalent here while most textbooks call it ionic.' },
      { title: 'Why two metals give you nothing', body: 'Both donate electrons, so there is no acceptor and the charges cannot cancel. Sodium and potassium genuinely do mix — as an alloy, held together by a shared electron sea rather than by transfer between specific atoms. That is a real material but not a compound with a formula, which is why the search reports it as a rejection with a reason instead of inventing NaK.' },
      { title: 'What the search is doing per tick', body: 'Each tick takes one combination of the selected elements and walks every ratio up to the subscript limit against every listed oxidation state. The candidate count climbs far faster than the compound count — that gap, visible on the first graph, is the real lesson: the periodic table permits enormously less than raw combinatorics suggests.' },
      { title: 'Limits worth knowing', body: 'Oxidation states are the common ones, not every state an element can be coerced into. Bond character for a ternary is judged across its most electropositive and most electronegative members only. There is no geometry, no lattice energy, and no kinetics — so the lab can tell you a compound is permitted and how ordinary it looks, but not whether it is stable at room temperature or how to make it.' },
    ];
  },
});
