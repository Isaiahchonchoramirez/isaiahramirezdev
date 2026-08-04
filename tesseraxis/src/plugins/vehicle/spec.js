import { SERIES } from '../../ui/theme.js';

const [S1, S2, S3, S4] = SERIES;

export const params = [
  { key: 'scenario', type: 'select', label: 'Experiment', group: 'Experiment', rebuild: true, default: 'autonomous', options: [
    { value: 'autonomous', label: 'Autonomous circuit' },
    { value: 'braking', label: 'Emergency braking' },
    { value: 'skidpad', label: 'Limit handling' },
  ] },
  { key: 'mass', label: 'Vehicle mass', unit: 'kg', group: 'Vehicle', min: 700, max: 3500, step: 25, default: 1480, rebuild: true },
  { key: 'wheelbase', label: 'Wheelbase', unit: 'm', group: 'Vehicle', min: 2, max: 4, step: 0.05, default: 2.72, rebuild: true },
  { key: 'trackWidth', label: 'Track width', unit: 'm', group: 'Vehicle', min: 1.3, max: 2.2, step: 0.02, default: 1.62, rebuild: true },
  { key: 'cgHeight', label: 'CG height', unit: 'm', group: 'Vehicle', min: 0.25, max: 1.2, step: 0.02, default: 0.54 },
  { key: 'power', label: 'Peak power', unit: 'kW', group: 'Powertrain', min: 50, max: 800, step: 10, default: 260 },
  { key: 'brakeForce', label: 'Maximum braking', unit: 'N', group: 'Powertrain', min: 4000, max: 30000, step: 250, default: 17500 },
  { key: 'cornerStiffness', label: 'Tire corner stiffness', unit: 'N/rad', group: 'Tires', min: 20000, max: 160000, step: 2500, default: 78000 },
  { key: 'frictionDry', label: 'Dry-road friction', group: 'Tires', min: 0.5, max: 1.6, step: 0.02, default: 1.08 },
  { key: 'rain', label: 'Rain intensity', unit: '%', group: 'Environment', min: 0, max: 100, step: 1, default: 15, help: 'Reduces available tire friction and lengthens braking distance.' },
  { key: 'springRate', label: 'Spring rate', unit: 'N/m', group: 'Suspension', min: 15000, max: 90000, step: 1000, default: 42000 },
  { key: 'damping', label: 'Damper rate', unit: 'N·s/m', group: 'Suspension', min: 800, max: 8000, step: 100, default: 3600 },
  { key: 'antiRoll', label: 'Anti-roll stiffness', unit: 'N·m/rad', group: 'Suspension', min: 0, max: 80000, step: 1000, default: 28000 },
  { key: 'targetSpeed', label: 'Autonomous target', unit: 'm/s', group: 'Autonomy', min: 4, max: 42, step: 0.5, default: 22 },
  { key: 'lookahead', label: 'Path lookahead', unit: 'm', group: 'Autonomy', min: 3, max: 30, step: 0.5, default: 11 },
  { key: 'steeringGain', label: 'Path correction gain', group: 'Autonomy', min: 0.2, max: 4, step: 0.05, default: 1.45 },
  { key: 'showForces', type: 'boolean', label: 'Show tire forces', group: 'Display', default: true },
  { key: 'showPath', type: 'boolean', label: 'Show target path', group: 'Display', default: true },
];

export const channels = [
  { key: 'speed', label: 'Vehicle speed', unit: 'm/s', group: 'Motion', color: S1, precision: 2, min: 0 },
  { key: 'targetSpeed', label: 'Target speed', unit: 'm/s', group: 'Motion', color: S2, precision: 2, min: 0 },
  { key: 'lateralAccel', label: 'Lateral acceleration', unit: 'm/s²', group: 'Dynamics', color: S1, precision: 2 },
  { key: 'longitudinalAccel', label: 'Longitudinal acceleration', unit: 'm/s²', group: 'Dynamics', color: S2, precision: 2 },
  { key: 'yawRate', label: 'Yaw rate', unit: '°/s', group: 'Dynamics', color: S3, precision: 2 },
  { key: 'slipFront', label: 'Front slip angle', unit: '°', group: 'Tires', color: S1, precision: 2 },
  { key: 'slipRear', label: 'Rear slip angle', unit: '°', group: 'Tires', color: S2, precision: 2 },
  { key: 'tireUseFront', label: 'Front friction use', unit: '%', group: 'Tires', color: S3, precision: 1, min: 0 },
  { key: 'tireUseRear', label: 'Rear friction use', unit: '%', group: 'Tires', color: S4, precision: 1, min: 0 },
  { key: 'roll', label: 'Body roll', unit: '°', group: 'Suspension', color: S1, precision: 2 },
  { key: 'pitch', label: 'Body pitch', unit: '°', group: 'Suspension', color: S2, precision: 2 },
  { key: 'pathError', label: 'Path error', unit: 'm', group: 'Autonomy', color: S1, precision: 2, min: 0 },
  { key: 'stoppingDistance', label: 'Stopping distance', unit: 'm', group: 'Experiment', color: S2, precision: 2, min: 0 },
  { key: 'collisions', label: 'Barrier contacts', unit: '', group: 'Safety', color: S3, precision: 0, min: 0 },
];

export const graphs = [
  { id: 'speed', title: 'Speed controller', channels: ['speed', 'targetSpeed'], includeZero: true },
  { id: 'accel', title: 'Acceleration', channels: ['lateralAccel', 'longitudinalAccel'] },
  { id: 'yaw', title: 'Yaw response', channels: ['yawRate'] },
  { id: 'slip', title: 'Tire slip angles', channels: ['slipFront', 'slipRear'] },
  { id: 'tire', title: 'Friction budget', channels: ['tireUseFront', 'tireUseRear'] },
  { id: 'body', title: 'Body attitude', channels: ['roll', 'pitch'] },
  { id: 'path', title: 'Path tracking error', channels: ['pathError'], includeZero: true },
  { id: 'stop', title: 'Braking distance', channels: ['stoppingDistance'], includeZero: true },
];

export const actions = [
  { key: 'autopilot', label: 'Autonomous driver', type: 'toggle', keys: ['KeyP'] },
  { key: 'throttle', label: 'Throttle / brake', type: 'axis', axis: ['KeyS', 'KeyW'] },
  { key: 'steer', label: 'Steering', type: 'axis', axis: ['ArrowRight', 'ArrowLeft'] },
  { key: 'brake', label: 'Emergency brake', type: 'momentary', keys: ['KeyB'] },
];

export function defaultParams(overrides = {}) {
  return Object.assign(Object.fromEntries(params.map((p) => [p.key, p.default])), overrides);
}
