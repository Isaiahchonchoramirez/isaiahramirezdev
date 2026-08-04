import { SERIES } from '../../ui/theme.js';
import { TARGETS } from './physics.js';

const [S1, S2, S3, S4] = SERIES;

export const params = [
  { key: 'mode', type: 'select', label: 'Experiment', group: 'Experiment', rebuild: true, default: 'exterior', options: [
    { value: 'exterior', label: 'Exterior ballistics' },
    { value: 'terminal', label: 'Impact & penetration' },
    { value: 'intercept', label: 'Intercept guidance' },
  ] },

  { key: 'muzzleVelocity', label: 'Launch velocity', unit: 'm/s', group: 'Projectile', min: 50, max: 1800, step: 5, default: 850, rebuild: true },
  { key: 'mass', label: 'Projectile mass', unit: 'kg', group: 'Projectile', min: 0.001, max: 50, step: 0.001, default: 0.0097, rebuild: true,
    help: 'Mass and calibre together set sectional density, which is what actually governs how well a projectile holds velocity and how deep it penetrates.' },
  { key: 'calibre', label: 'Calibre', unit: 'mm', group: 'Projectile', min: 3, max: 200, step: 0.1, default: 7.62, rebuild: true },
  { key: 'dragScale', label: 'Form factor', group: 'Projectile', min: 0.4, max: 2.5, step: 0.01, default: 1,
    help: 'Scales the standard drag curve. Below 1 is a more streamlined shape than the reference projectile.' },

  { key: 'elevation', label: 'Launch elevation', unit: '°', group: 'Launch', min: -10, max: 89, step: 0.1, default: 12, rebuild: true },
  { key: 'azimuth', label: 'Launch azimuth', unit: '°', group: 'Launch', min: -180, max: 180, step: 1, default: 0, rebuild: true },
  { key: 'launchHeight', label: 'Launch height', unit: 'm', group: 'Launch', min: 0, max: 3000, step: 1, default: 1.6, rebuild: true },

  { key: 'windSpeed', label: 'Wind speed', unit: 'm/s', group: 'Environment', min: 0, max: 40, step: 0.5, default: 0 },
  { key: 'windDirection', label: 'Wind from', unit: '°', group: 'Environment', min: -180, max: 180, step: 5, default: 90 },
  { key: 'latitude', label: 'Latitude', unit: '°', group: 'Environment', min: -80, max: 80, step: 1, default: 42 },
  { key: 'coriolis', type: 'boolean', label: 'Coriolis effect', group: 'Environment', default: true,
    help: 'Earth rotates under the projectile during flight. Negligible at 100 m, metres of deflection at extreme range.' },
  { key: 'spinDrift', type: 'boolean', label: 'Spin drift', group: 'Environment', default: true },
  { key: 'twistDirection', type: 'select', label: 'Rifling twist', group: 'Environment', default: 1, options: [
    { value: 1, label: 'Right-hand' },
    { value: -1, label: 'Left-hand' },
  ] },

  { key: 'targetRange', label: 'Target range', unit: 'm', group: 'Target', min: 10, max: 4000, step: 10, default: 300, rebuild: true },
  { key: 'targetMaterial', type: 'select', label: 'Target material', group: 'Target', default: 'mildSteel',
    options: Object.entries(TARGETS).map(([value, t]) => ({ value, label: t.label })) },
  { key: 'plateThickness', label: 'Plate thickness', unit: 'mm', group: 'Target', min: 1, max: 400, step: 1, default: 10 },
  { key: 'obliquity', label: 'Impact obliquity', unit: '°', group: 'Target', min: 0, max: 85, step: 1, default: 0,
    help: 'Angle between the projectile path and the plate normal. Zero is a square hit; past the critical angle it glances off.' },

  { key: 'targetSpeed', label: 'Target speed', unit: 'm/s', group: 'Intercept', min: 0, max: 600, step: 5, default: 220, rebuild: true },
  { key: 'targetAltitude', label: 'Target altitude', unit: 'm', group: 'Intercept', min: 10, max: 8000, step: 10, default: 900, rebuild: true },
  { key: 'navigationGain', label: 'Navigation gain N', group: 'Intercept', min: 1, max: 8, step: 0.1, default: 3.5,
    help: 'Classic proportional navigation uses 3–5. Too low and it lags the target; too high and noise saturates the airframe.' },
  { key: 'lateralLimit', label: 'Lateral acceleration limit', unit: 'g', group: 'Intercept', min: 1, max: 60, step: 1, default: 20 },
  { key: 'lethalRadius', label: 'Intercept radius', unit: 'm', group: 'Intercept', min: 0.5, max: 50, step: 0.5, default: 5 },

  { key: 'showTrail', type: 'boolean', label: 'Show trajectory', group: 'Display', default: true },
];

export const channels = [
  { key: 'altitude', label: 'Altitude', unit: 'm', group: 'Trajectory', color: S1, precision: 1 },
  { key: 'downrange', label: 'Downrange', unit: 'm', group: 'Trajectory', color: S2, precision: 1, min: 0 },
  { key: 'drop', label: 'Drop from launch', unit: 'm', group: 'Trajectory', color: S3, precision: 2 },
  { key: 'drift', label: 'Lateral drift', unit: 'm', group: 'Trajectory', color: S4, precision: 3 },
  { key: 'speed', label: 'Velocity', unit: 'm/s', group: 'Motion', color: S1, precision: 1, min: 0 },
  { key: 'mach', label: 'Mach number', unit: '', group: 'Motion', color: S2, precision: 3, min: 0 },
  { key: 'energy', label: 'Kinetic energy', unit: 'kJ', group: 'Motion', color: S3, precision: 3, min: 0 },
  { key: 'dragForce', label: 'Drag force', unit: 'N', group: 'Motion', color: S4, precision: 2, min: 0 },
  { key: 'separation', label: 'Range to target', unit: 'm', group: 'Guidance', color: S1, precision: 2, min: 0 },
  { key: 'closingSpeed', label: 'Closing speed', unit: 'm/s', group: 'Guidance', color: S2, precision: 1 },
  { key: 'lateralDemand', label: 'Lateral demand', unit: 'g', group: 'Guidance', color: S3, precision: 2, min: 0 },
  { key: 'losRate', label: 'Line-of-sight rate', unit: 'rad/s', group: 'Guidance', color: S4, precision: 4 },
];

export const graphs = [
  { id: 'profile', title: 'Altitude and downrange', channels: ['altitude', 'downrange'], includeZero: true },
  { id: 'velocity', title: 'Velocity decay', channels: ['speed'], includeZero: true },
  { id: 'mach', title: 'Mach number', channels: ['mach'], includeZero: true },
  { id: 'energy', title: 'Kinetic energy', channels: ['energy'], includeZero: true },
  { id: 'drag', title: 'Drag force', channels: ['dragForce'], includeZero: true },
  { id: 'deflection', title: 'Drop and drift', channels: ['drop', 'drift'] },
  { id: 'range', title: 'Range to target', channels: ['separation'], includeZero: true },
  { id: 'demand', title: 'Guidance demand', channels: ['lateralDemand'], includeZero: true },
  { id: 'los', title: 'Line-of-sight rate', channels: ['losRate'] },
];

export const actions = [];

export function defaultParams(overrides = {}) {
  return Object.assign(Object.fromEntries(params.map((p) => [p.key, p.default])), overrides);
}
