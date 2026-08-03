// The plugin contract.
//
// Every simulation in Tesseraxis is a plugin, including the ones that ship with it.
// There is no privileged path: the rocket lab reaches the engine through
// exactly the interface a third-party module would, which is the only way to
// know the interface is actually sufficient.
//
// A plugin is a plain object describing what it simulates and one setup()
// function that builds it. The shell reads the description to generate the
// hierarchy, the inspector controls, the graph layout, and the keyboard help —
// none of that is hand-written per simulation.
//
//   definePlugin({
//     id, title, subtitle, summary,
//     capacity,            // max entities; the world is sized from this
//     defaultSeed,
//     params:   [ParamSpec],    // inspector controls
//     channels: [ChannelSpec],  // telemetry the run records
//     graphs:   [GraphSpec],    // how those channels are plotted
//     actions:  [ActionSpec],   // named controls and their key bindings
//     camera:   {position, target, near, far},
//     setup(ctx) -> teardown?,  // build entities, register systems and views
//     hierarchy(ctx) -> [Node], // left panel tree
//     inspect(ctx, selection) -> [Section], // right panel readouts
//     hud(ctx) -> [{label, value, unit, status}], // the few numbers over the viewport
//     verdict(ctx) -> {status, headline, rows} | null,
//     explain(ctx) -> [{title, body}],   // "why did that happen"
//   })
//
// ParamSpec   {key, label, unit, min, max, step, default, group, help, rebuild}
//             rebuild: true means changing it restarts the run, because the
//             parameter describes the vehicle as built rather than how it is
//             being flown.
// ChannelSpec {key, label, unit, group, color, precision, min, max}
// GraphSpec   {id, title, channels: [key], height, stacked}
// ActionSpec  {key, label, keys: ['KeyW'], type: 'momentary'|'toggle'|'axis',
//              axis: [negativeKey, positiveKey], help}

const REQUIRED = ['id', 'title', 'setup'];

export function definePlugin(spec) {
  for (const field of REQUIRED) {
    if (!spec[field]) throw new Error(`Plugin is missing required field "${field}"`);
  }

  const plugin = {
    subtitle: '',
    summary: '',
    capacity: 4096,
    defaultSeed: 1,
    params: [],
    channels: [],
    graphs: [],
    actions: [],
    camera: { position: [40, 25, 40], target: [0, 5, 0], near: 0.1, far: 20000 },
    hierarchy: () => [],
    inspect: () => [],
    hud: () => [],
    verdict: () => null,
    explain: () => [],
    ...spec,
  };

  // Catching these at registration rather than at first render — a graph
  // pointing at a channel that does not exist would otherwise draw an empty
  // box with no indication of why.
  const channelsByKey = new Map(plugin.channels.map((c) => [c.key, c]));
  for (const graph of plugin.graphs) {
    for (const key of graph.channels) {
      if (!channelsByKey.has(key)) {
        throw new Error(`Plugin "${plugin.id}": graph "${graph.id}" references unknown channel "${key}"`);
      }
    }
    // One graph, one y-axis. Two units on one plot means two scales, and where
    // those two scales get pinned relative to each other is arbitrary — the
    // reader sees a correlation that is an artefact of the layout rather than
    // anything in the data. Quantities in different units belong on different
    // cards.
    const units = new Set(graph.channels.map((key) => channelsByKey.get(key).unit ?? ''));
    if (units.size > 1) {
      throw new Error(
        `Plugin "${plugin.id}": graph "${graph.id}" mixes units [${[...units].join(', ')}] — ` +
          `split it into one card per unit rather than twinning the axes`,
      );
    }
  }

  const paramKeys = new Set();
  for (const param of plugin.params) {
    if (paramKeys.has(param.key)) {
      throw new Error(`Plugin "${plugin.id}": duplicate parameter "${param.key}"`);
    }
    paramKeys.add(param.key);
  }

  return plugin;
}

// Groups a flat parameter list by its `group` field, preserving first-seen
// order so the inspector's sections come out in the order the plugin author
// wrote them rather than alphabetically.
export function groupParams(params) {
  const groups = new Map();
  for (const param of params) {
    const name = param.group || 'Parameters';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(param);
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

export default definePlugin;
