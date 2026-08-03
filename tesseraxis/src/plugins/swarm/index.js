import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createSwarm, makeSystems } from './physics.js';
import { createSwarmView } from './view.js';

export default definePlugin({
  id: 'swarm',
  title: 'Swarm Intelligence Lab',
  subtitle: 'Distributed autonomy · local sensing · emergent coordination',
  summary: 'A deterministic multi-agent laboratory for flocking, search and rescue, formation control, and resilient local consensus.',
  capacity: 4096,
  defaultSeed: 271828,
  camera: { position: [150, 110, 150], target: [0, 35, 0], far: 5000 },
  params, channels, graphs, actions,

  setup(ctx) {
    const state = createSwarm(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;
    ctx.loop.addSystem('input', systems.input, 'swarm:commands');
    ctx.loop.addSystem('control', systems.control, 'swarm:distributed-law');
    ctx.loop.addSystem('integrate', systems.integrate, 'swarm:kinematics');
    ctx.loop.addSystem('post', systems.post, 'swarm:telemetry');
    if (ctx.viewport) {
      const view = createSwarmView(ctx, state);
      ctx.loop.onRender(() => view.render());
      return () => view.dispose();
    }
    return () => {};
  },

  hierarchy(ctx) {
    const s = ctx.state, m = s.metrics;
    return [
      {
        label: `Swarm · ${s.agents.length} agents`, status: m.connected > 95 ? 'good' : 'warning',
        detail: ctx.params.mission,
        children: [
          { label: 'Local sensing', status: 'active', detail: `${m.meanNeighbors.toFixed(1)} peers/agent` },
          { label: 'Consensus network', status: m.connected > 95 ? 'good' : 'warning', detail: `${m.connected.toFixed(0)}% connected` },
          { label: 'Collision avoidance', status: m.nearMisses ? 'warning' : 'good', detail: `${m.nearMisses} violations` },
          { label: 'Mission guidance', status: 'active', detail: `${m.goalDistance.toFixed(1)} m` },
        ],
      },
      {
        label: 'Environment', status: 'idle',
        children: [
          { label: 'Operating volume', status: 'active', detail: `${ctx.params.worldRadius} m radius` },
          { label: 'Obstacles', status: s.obstacles.length ? 'warning' : 'idle', detail: String(s.obstacles.length) },
          { label: 'Mission objective', status: 'good', detail: `${s.goal.x.toFixed(0)}, ${s.goal.y.toFixed(0)}, ${s.goal.z.toFixed(0)}` },
        ],
      },
    ];
  },

  hud(ctx) {
    const m = ctx.state.metrics;
    return [
      { label: 'Agents', value: ctx.state.agents.length, precision: 0 },
      { label: 'Mean speed', value: m.meanSpeed, unit: 'm/s', precision: 1 },
      { label: 'Neighbors', value: m.meanNeighbors, precision: 1 },
      { label: 'Consensus', value: m.alignment, unit: '%', precision: 0, status: m.alignment < 45 ? 'warning' : null },
      { label: 'Connected', value: m.connected, unit: '%', precision: 0, status: m.connected < 90 ? 'warning' : null },
      { label: 'Coverage', value: m.coverage, unit: '%', precision: 1 },
      { label: 'Safety', value: m.nearMisses, precision: 0, status: m.nearMisses ? 'critical' : 'good' },
    ];
  },

  inspect(ctx) {
    const s = ctx.state, m = s.metrics;
    return [
      { title: 'Collective state', rows: [
        { label: 'Population', value: s.agents.length, precision: 0 },
        { label: 'Mean speed', value: m.meanSpeed, unit: 'm/s' },
        { label: 'Maximum speed', value: m.maxSpeed, unit: 'm/s' },
        { label: 'Dispersion', value: m.dispersion, unit: 'm' },
        { label: 'Velocity consensus', value: m.alignment, unit: '%', precision: 1 },
      ] },
      { title: 'Distributed network', rows: [
        { label: 'Mean neighbor degree', value: m.meanNeighbors },
        { label: 'Agents with a neighbor', value: m.connected, unit: '%', precision: 1, status: m.connected < 90 ? 'warning' : 'good' },
        { label: 'Packet loss model', value: ctx.params.communicationLoss, unit: '%', precision: 0 },
        { label: 'Sensor radius', value: ctx.params.sensorRadius, unit: 'm' },
      ] },
      { title: 'Mission', rows: [
        { label: 'Mode', value: ctx.params.mission },
        { label: 'Objective distance', value: m.goalDistance, unit: 'm' },
        { label: 'Search coverage', value: m.coverage, unit: '%', precision: 1 },
        { label: 'Safety violations', value: m.nearMisses, precision: 0, status: m.nearMisses ? 'critical' : 'good' },
      ] },
    ];
  },

  explain() {
    return [
      { title: 'No agent sees the whole swarm', body: 'Each vehicle reads only neighbors inside its sensing radius. The global flock is an emergent result of three local vectors: <code>separation + alignment + cohesion</code>. There is no central animation path and no hidden leader.' },
      { title: 'Why spatial hashing matters', body: 'Comparing every pair costs O(n²). Tesseraxis bins agents into sensor-sized cells and checks only the 27 adjacent cells, making neighborhood discovery approximately O(n) at stable density. That is the algorithmic difference between a demo and a scalable simulator.' },
      { title: 'What packet loss changes', body: 'Local collision sensing remains available, but a deterministic fraction of neighbor messages is omitted from alignment and cohesion. The seed makes the loss pattern reproducible, allowing control laws to be compared against identical network faults.' },
      { title: 'How to read consensus', body: 'Velocity consensus is the magnitude of the mean velocity divided by mean speed. It approaches 100% when agents travel together and falls toward zero when their headings cancel—even if every agent is moving quickly.' },
      { title: 'Search is measured, not implied', body: 'The rescue mission projects visits onto a fixed spatial occupancy grid. Coverage is the percentage of cells actually observed, so changing population, sensing, speed, or guidance produces a result that can be graphed and exported.' },
    ];
  },
});
