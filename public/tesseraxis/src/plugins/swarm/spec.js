import { SERIES } from '../../ui/theme.js';

const [S1, S2, S3, S4] = SERIES;

export const params = [
  {
    key: 'mission', type: 'select', label: 'Mission', group: 'Mission', rebuild: true, default: 'rescue',
    options: [
      { value: 'flock', label: 'Open flocking' },
      { value: 'rescue', label: 'Search & rescue' },
      { value: 'formation', label: 'Formation transit' },
    ],
    help: 'Changes the distributed objective while preserving the same local sensing and collision-avoidance laws.',
  },
  { key: 'agentCount', label: 'Agents', group: 'Population', min: 32, max: 3000, step: 16, default: 512, rebuild: true },
  { key: 'worldRadius', label: 'Operating radius', unit: 'm', group: 'Environment', min: 40, max: 300, step: 5, default: 120, rebuild: true },
  { key: 'sensorRadius', label: 'Sensor radius', unit: 'm', group: 'Distributed sensing', min: 4, max: 35, step: 0.5, default: 15 },
  { key: 'separationRadius', label: 'Safety radius', unit: 'm', group: 'Distributed sensing', min: 1, max: 12, step: 0.25, default: 4 },
  { key: 'separationWeight', label: 'Separation', group: 'Flocking law', min: 0, max: 8, step: 0.1, default: 3.4 },
  { key: 'alignmentWeight', label: 'Alignment', group: 'Flocking law', min: 0, max: 5, step: 0.1, default: 1.25 },
  { key: 'cohesionWeight', label: 'Cohesion', group: 'Flocking law', min: 0, max: 3, step: 0.05, default: 0.72 },
  { key: 'goalWeight', label: 'Mission guidance', group: 'Flocking law', min: 0, max: 4, step: 0.05, default: 1.1 },
  { key: 'obstacleWeight', label: 'Obstacle avoidance', group: 'Flocking law', min: 0, max: 12, step: 0.1, default: 6.5 },
  { key: 'maxSpeed', label: 'Maximum speed', unit: 'm/s', group: 'Vehicle', min: 2, max: 30, step: 0.5, default: 12 },
  { key: 'maxAccel', label: 'Maximum acceleration', unit: 'm/s²', group: 'Vehicle', min: 1, max: 20, step: 0.5, default: 7 },
  { key: 'communicationLoss', label: 'Packet loss', unit: '%', group: 'Network', min: 0, max: 70, step: 1, default: 5, help: 'Deterministic packet loss: a neighbor can be sensed locally but omitted from consensus for this tick.' },
  { key: 'showSensors', type: 'boolean', label: 'Show sensing envelope', group: 'Display', default: true },
  { key: 'showVelocity', type: 'boolean', label: 'Color by speed', group: 'Display', default: true },
];

export const channels = [
  { key: 'meanSpeed', label: 'Mean speed', unit: 'm/s', group: 'Motion', color: S1, precision: 2 },
  { key: 'maxSpeed', label: 'Maximum speed', unit: 'm/s', group: 'Motion', color: S2, precision: 2 },
  { key: 'meanNeighbors', label: 'Mean neighbors', unit: '', group: 'Network', color: S1, precision: 2 },
  { key: 'connected', label: 'Locally connected', unit: '%', group: 'Network', color: S2, precision: 1, min: 0, max: 100 },
  { key: 'alignment', label: 'Velocity consensus', unit: '%', group: 'Coordination', color: S1, precision: 1, min: 0, max: 100 },
  { key: 'dispersion', label: 'Swarm dispersion', unit: 'm', group: 'Coordination', color: S2, precision: 2 },
  { key: 'goalDistance', label: 'Centroid to objective', unit: 'm', group: 'Mission', color: S1, precision: 2 },
  { key: 'coverage', label: 'Area searched', unit: '%', group: 'Mission', color: S2, precision: 1, min: 0, max: 100 },
  { key: 'nearMisses', label: 'Safety violations', unit: '', group: 'Safety', color: S3, precision: 0, min: 0 },
];

export const graphs = [
  { id: 'speed', title: 'Fleet speed', channels: ['meanSpeed', 'maxSpeed'] },
  { id: 'network', title: 'Local network', channels: ['meanNeighbors'] },
  { id: 'connectivity', title: 'Connectivity', channels: ['connected', 'alignment'] },
  { id: 'geometry', title: 'Swarm geometry', channels: ['dispersion', 'goalDistance'] },
  { id: 'coverage', title: 'Search coverage', channels: ['coverage'] },
  { id: 'safety', title: 'Safety violations', channels: ['nearMisses'], includeZero: true },
];

export const actions = [
  { key: 'retarget', label: 'Move mission objective', type: 'momentary', keys: ['KeyG'] },
  { key: 'scatter', label: 'Emergency disperse', type: 'momentary', keys: ['KeyX'] },
];

export function defaultParams(overrides = {}) {
  return Object.assign(Object.fromEntries(params.map((p) => [p.key, p.default])), overrides);
}
