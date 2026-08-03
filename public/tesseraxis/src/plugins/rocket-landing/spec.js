// The declarative half of the Powered Descent Lab.
//
// Parameters, telemetry channels, graph layout and control bindings, with no
// physics and no rendering. Split out from index.js so the vehicle can be flown
// headless — tools/fly.mjs imports this and physics.js and never touches
// three.js, which is what makes the guidance testable in Node.

import { SERIES } from '../../ui/theme.js';
import { SCENARIOS } from './physics.js';

// Colours are taken from the front of the validated categorical order, per
// graph. Every chart here has at most four series, so its adjacent pairs are
// pairs the palette validator actually checked. Two channels on different
// cards sharing a hue is fine — small multiples each carry their own legend.
const [S1, S2, S3, S4] = SERIES;

export const params = [
  {
    key: 'scenario', type: 'select', label: 'Scenario', group: 'Mission', rebuild: true,
    default: 'hop',
    options: Object.entries(SCENARIOS).map(([value, s]) => ({ value, label: s.label })),
    help: 'Sets the state the vehicle starts in — altitude, speed, downrange offset and propellant load.',
  },
  {
    key: 'windMean', label: 'Steady wind', unit: 'm/s', group: 'Mission',
    min: -25, max: 25, step: 0.5, default: 4,
    help: 'A constant crosswind along +X. The vehicle has to lean into it the whole way down.',
  },
  {
    key: 'windGust', label: 'Gust intensity', unit: 'm/s', group: 'Mission',
    min: 0, max: 12, step: 0.25, default: 2.5,
    help: 'Strength of the time-correlated gust process. Driven by the run seed, so the same seed gives the same weather.',
  },

  {
    key: 'dryMass', label: 'Dry mass', unit: 'kg', group: 'Vehicle', rebuild: true,
    min: 8000, max: 45000, step: 500, default: 22000,
  },
  {
    key: 'length', label: 'Length', unit: 'm', group: 'Vehicle', rebuild: true,
    min: 15, max: 70, step: 1, default: 47,
    help: 'Also the gimbal lever arm — the engine sits half a length below the centre of mass.',
  },
  {
    key: 'radius', label: 'Radius', unit: 'm', group: 'Vehicle', rebuild: true,
    min: 0.8, max: 5, step: 0.05, default: 1.83,
  },
  {
    key: 'engines', label: 'Engines lit', unit: '', group: 'Vehicle',
    min: 1, max: 3, step: 1, default: 1,
    help: 'More engines mean more authority and a higher minimum thrust — three engines cannot throttle down far enough to hover a light vehicle.',
  },
  {
    key: 'thrustPerEngine', label: 'Thrust per engine', unit: 'N', group: 'Vehicle',
    min: 200000, max: 1200000, step: 5000, default: 845000,
  },
  {
    key: 'isp', label: 'Specific impulse', unit: 's', group: 'Vehicle',
    min: 200, max: 400, step: 1, default: 282,
    help: 'Seconds of thrust per unit weight of propellant. Sets the mass flow: ṁ = F / (Isp · g₀).',
  },
  {
    key: 'minThrottle', label: 'Minimum throttle', unit: '', group: 'Vehicle',
    min: 0.2, max: 0.8, step: 0.01, default: 0.4,
    help: 'An engine cannot throttle to nothing. If minimum thrust exceeds the vehicle’s weight it cannot hover, only decelerate.',
  },
  {
    key: 'maxGimbal', label: 'Gimbal limit', unit: '°', group: 'Vehicle',
    min: 1, max: 15, step: 0.25, default: 7,
  },
  {
    key: 'gimbalRate', label: 'Gimbal slew rate', unit: '°/s', group: 'Vehicle',
    min: 2, max: 60, step: 1, default: 22,
    help: 'How fast the actuator can move. A controller tuned without this limit is tuned against a vehicle that does not exist.',
  },
  {
    key: 'rcsTorque', label: 'Thruster torque', unit: 'N·m', group: 'Vehicle',
    min: 0, max: 400000, step: 5000, default: 40000,
    help: 'Cold-gas attitude authority. Always available and always weak — it is what holds the vehicle steady when there is neither thrust nor airspeed to work with.',
  },
  {
    key: 'finArea', label: 'Grid fin area', unit: 'm²', group: 'Vehicle',
    min: 0, max: 12, step: 0.25, default: 4,
    help: 'Fin authority scales with dynamic pressure, so the fins are strong exactly when the vehicle is fast and useless exactly when it is slow. Set this to zero and the coast phase becomes uncontrollable.',
  },
  {
    key: 'finLever', label: 'Grid fin lever arm', unit: 'm', group: 'Vehicle',
    min: 5, max: 32, step: 0.5, default: 18,
  },

  {
    key: 'dragAxial', label: 'Axial drag coefficient', unit: '', group: 'Aerodynamics',
    min: 0.1, max: 1.5, step: 0.01, default: 0.42,
  },
  {
    key: 'dragNormal', label: 'Broadside drag coefficient', unit: '', group: 'Aerodynamics',
    min: 0.5, max: 5, step: 0.05, default: 2.6,
    help: 'A cylinder side-on has roughly six times the drag it has nose-on. This is what punishes a loss of attitude control.',
  },
  {
    key: 'copOffset', label: 'Centre of pressure offset', unit: 'm', group: 'Aerodynamics',
    min: -8, max: 12, step: 0.25, default: 2.5,
    help: 'Distance from the centre of mass toward the nose. Positive is aerodynamically unstable — the air pushes the vehicle further off axis, and the gimbal has to fight it.',
  },

  {
    key: 'profileDecel', label: 'Profile deceleration', unit: 'm/s²', group: 'Guidance',
    min: 3, max: 25, step: 0.5, default: 8,
    help: 'The descent profile is v = −(v_touchdown + √(2·a·h)). Raising a makes the vehicle fall faster for longer and brake harder at the end.',
  },
  {
    key: 'touchdownRate', label: 'Touchdown rate target', unit: 'm/s', group: 'Guidance',
    min: 0.5, max: 6, step: 0.1, default: 1.8,
  },
  {
    key: 'flareHeight', label: 'Flare height', unit: 'm', group: 'Guidance',
    min: 0, max: 40, step: 0.5, default: 0,
    help: 'Height at which the profile stops steepening and holds a constant slow rate. Zero by default, and that is not an oversight: at minimum throttle this vehicle still makes more thrust than it weighs, so it cannot hover. Raise this and watch it arrest, refuse to descend the last few metres, and climb away — which is exactly why a booster lands by arriving at zero speed and zero altitude simultaneously.',
  },
  {
    key: 'maxDescentRate', label: 'Descent rate cap', unit: 'm/s', group: 'Guidance',
    min: 50, max: 400, step: 5, default: 260,
  },
  {
    key: 'ignitionMargin', label: 'Ignition margin', unit: '', group: 'Guidance',
    min: -0.15, max: 0.35, step: 0.005, default: 0.03,
    help: 'Fraction of the profile speed at which the engine lights early. Higher is safer and costs propellant; negative lights late and may not stop in time.',
  },
  {
    key: 'maxTilt', label: 'Tilt limit', unit: '°', group: 'Guidance',
    min: 2, max: 35, step: 0.5, default: 20,
    help: 'Caps how far the guidance will lean the vehicle to correct laterally. Lateral acceleration is tan(tilt) × vertical acceleration, so this is the real limit on how fast the pad can be reached.',
  },
  {
    key: 'uprightHeight', label: 'Upright-by height', unit: 'm', group: 'Guidance',
    min: 20, max: 500, step: 5, default: 150,
    help: 'Over this height above the pad the guidance winds down its position correction and narrows the tilt allowance, so the vehicle arrives vertical. Set it very low and the vehicle is still leaning to chase the pad centre when it touches — which is a landing on one leg.',
  },
  {
    key: 'terminalTilt', label: 'Terminal tilt allowance', unit: '°', group: 'Guidance',
    min: 0, max: 12, step: 0.25, default: 5,
    help: 'The floor the tilt allowance narrows to. It has to stay above zero: the last seconds of the descent still need enough authority to null sideways drift, and drift is what tips a vehicle over.',
  },
  {
    key: 'lateralKp', label: 'Lateral position gain', unit: 's⁻²', group: 'Guidance',
    min: 0, max: 0.3, step: 0.002, default: 0.09,
    help: 'With the velocity gain this is a second-order approach: undamped frequency is √Kp, so the pad is closed on with a time constant near 1/√Kp. Too low and the vehicle is still translating when the run ends.',
  },
  {
    key: 'lateralKd', label: 'Lateral velocity gain', unit: 's⁻¹', group: 'Guidance',
    min: 0, max: 1.6, step: 0.01, default: 0.6,
    help: 'Damping ratio is Kd / (2√Kp) — at the defaults exactly 1, critically damped. Raise it and the approach becomes sluggish; lower it and the vehicle swings past the pad and has to come back.',
  },

  {
    key: 'descentKp', label: 'Descent P', unit: '', group: 'Control gains',
    min: 0, max: 5, step: 0.05, default: 1.35,
  },
  {
    key: 'descentKi', label: 'Descent I', unit: '', group: 'Control gains',
    min: 0, max: 1.5, step: 0.01, default: 0.12,
  },
  {
    key: 'descentKd', label: 'Descent D', unit: '', group: 'Control gains',
    min: 0, max: 1, step: 0.005, default: 0.05,
  },
  {
    key: 'attitudeKp', label: 'Attitude P', unit: 'rad/s²', group: 'Control gains',
    min: 0, max: 3, step: 0.01, default: 0.64,
    help: 'Angular acceleration commanded per unit of pointing error. With the derivative term, the closed loop behaves like a second-order system of natural frequency √P.',
  },
  {
    key: 'attitudeKd', label: 'Attitude D', unit: 's⁻¹', group: 'Control gains',
    min: 0, max: 6, step: 0.02, default: 1.44,
    help: 'Rate feedback. Damping ratio is D / (2√P) — at the defaults that is 0.9, just short of critical. Drop it toward zero to watch the vehicle oscillate.',
  },
  {
    key: 'attitudeAuthority', label: 'Attitude rate limit', unit: 'rad/s²', group: 'Control gains',
    min: 0.05, max: 2, step: 0.01, default: 0.35,
    help: 'Caps the angular acceleration the loop will ask for, so a large pointing error cannot command a manoeuvre the effectors could never deliver.',
  },

  {
    key: 'limitVertical', label: 'Max touchdown vertical', unit: 'm/s', group: 'Landing criteria',
    min: 1, max: 15, step: 0.25, default: 6,
  },
  {
    key: 'limitLateral', label: 'Max touchdown lateral', unit: 'm/s', group: 'Landing criteria',
    min: 0.25, max: 8, step: 0.25, default: 2,
  },
  {
    key: 'limitTilt', label: 'Max touchdown tilt', unit: '°', group: 'Landing criteria',
    min: 1, max: 20, step: 0.5, default: 5,
  },
  {
    key: 'limitOffset', label: 'Max miss distance', unit: 'm', group: 'Landing criteria',
    min: 1, max: 40, step: 0.5, default: 8,
  },
  {
    key: 'padHeight', label: 'Pad height', unit: 'm', group: 'Landing criteria', rebuild: true,
    min: 0, max: 20, step: 0.5, default: 0.4,
  },

  { key: 'showForces', type: 'boolean', label: 'Show force vectors', group: 'Display', default: true },
  { key: 'showTrail', type: 'boolean', label: 'Show flight path', group: 'Display', default: true },
];

export const channels = [
  { key: 'altitude', label: 'Altitude', unit: 'm', group: 'Position', color: S1, precision: 1 },
  { key: 'offset', label: 'Miss distance', unit: 'm', group: 'Position', color: S2, precision: 2 },

  { key: 'vertical', label: 'Vertical speed', unit: 'm/s', group: 'Velocity', color: S1, precision: 2 },
  { key: 'targetVertical', label: 'Profile target', unit: 'm/s', group: 'Velocity', color: S2, precision: 2 },
  { key: 'lateral', label: 'Lateral speed', unit: 'm/s', group: 'Velocity', color: S3, precision: 2 },
  { key: 'speed', label: 'Total speed', unit: 'm/s', group: 'Velocity', color: S4, precision: 2 },

  { key: 'throttle', label: 'Throttle', unit: '', group: 'Propulsion', color: S1, precision: 3, min: 0, max: 1 },
  { key: 'thrust', label: 'Thrust', unit: 'kN', group: 'Propulsion', color: S1, precision: 1 },
  { key: 'mass', label: 'Total mass', unit: 'kg', group: 'Propulsion', color: S1, precision: 0 },
  { key: 'fuel', label: 'Propellant', unit: 'kg', group: 'Propulsion', color: S2, precision: 0 },

  { key: 'tilt', label: 'Tilt from vertical', unit: '°', group: 'Attitude', color: S1, precision: 2 },
  { key: 'attitudeError', label: 'Pointing error', unit: '°', group: 'Attitude', color: S2, precision: 2 },
  { key: 'gimbalPitch', label: 'Gimbal pitch', unit: '°', group: 'Attitude', color: S3, precision: 2 },
  { key: 'gimbalYaw', label: 'Gimbal yaw', unit: '°', group: 'Attitude', color: S4, precision: 2 },

  { key: 'dynamicPressure', label: 'Dynamic pressure', unit: 'kPa', group: 'Aerodynamics', color: S1, precision: 2 },
  { key: 'acceleration', label: 'Load factor', unit: 'g', group: 'Aerodynamics', color: S2, precision: 2 },
];

// One unit and one y-axis per card. Altitude and vertical speed are the two
// numbers everyone wants side by side, and putting them on twinned axes is
// exactly the chart that invents a correlation — so they get two cards sharing
// a time window instead. The plugin loader rejects any graph whose channels
// disagree on units.
export const graphs = [
  { id: 'altitude', title: 'Altitude', channels: ['altitude'], includeZero: true },
  { id: 'velocity', title: 'Velocity vs profile', channels: ['vertical', 'targetVertical', 'lateral', 'speed'] },
  { id: 'throttle', title: 'Throttle', channels: ['throttle'] },
  { id: 'attitude', title: 'Attitude and gimbal', channels: ['tilt', 'attitudeError', 'gimbalPitch', 'gimbalYaw'] },
  { id: 'mass', title: 'Mass budget', channels: ['mass', 'fuel'], includeZero: true },
  { id: 'position', title: 'Miss distance', channels: ['offset'], includeZero: true },
  { id: 'aero', title: 'Dynamic pressure', channels: ['dynamicPressure'], includeZero: true },
  { id: 'load', title: 'Load factor', channels: ['acceleration'], includeZero: true },
];

export const actions = [
  { key: 'autopilot', label: 'Autopilot', type: 'toggle', keys: ['KeyP'] },
  { key: 'throttle', label: 'Throttle up / down', type: 'axis', axis: ['KeyS', 'KeyW'] },
  { key: 'pitch', label: 'Gimbal pitch', type: 'axis', axis: ['ArrowDown', 'ArrowUp'] },
  { key: 'yaw', label: 'Gimbal yaw', type: 'axis', axis: ['ArrowLeft', 'ArrowRight'] },
  { key: 'roll', label: 'RCS roll', type: 'axis', axis: ['KeyQ', 'KeyE'] },
];

// Convenience for headless callers, which have no inspector to read defaults
// off of.
export function defaultParams(overrides = {}) {
  const out = {};
  for (const spec of params) out[spec.key] = spec.default;
  return { ...out, ...overrides };
}
