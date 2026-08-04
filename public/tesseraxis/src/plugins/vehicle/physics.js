import { clamp, DEG, RAD, slewLimit } from '../../engine/math.js';

const G = 9.80665;
const TRACK_RX = 88;
const TRACK_RZ = 52;
const ROAD_HALF_WIDTH = 8;

export function createVehicle(ctx) {
  const { world, params } = ctx;
  const Vehicle = world.defineComponent('VehicleBody', {
    x: 'f64', z: 'f64', yaw: 'f64', u: 'f64', v: 'f64', r: 'f64',
    steer: 'f64', throttle: 'f64', brake: 'f64', roll: 'f64', rollRate: 'f64', pitch: 'f64', pitchRate: 'f64',
  });
  const entity = world.createEntity('Test vehicle');
  const scenario = params.scenario;
  const initialSpeed = scenario === 'braking' ? 30 : scenario === 'skidpad' ? 16 : 8;
  world.add(entity, Vehicle, { x: TRACK_RX, z: 0, yaw: Math.PI / 2, u: initialSpeed });
  const state = {
    entity, Vehicle, phase: scenario === 'braking' ? 'approach' : 'running', autopilot: scenario !== 'skidpad',
    brakeStartX: null, brakeStartZ: null, collisionLatch: false, collisions: 0, distance: 0,
    forces: { front: 0, rear: 0, longitudinal: 0, normalFront: params.mass * G * 0.5, normalRear: params.mass * G * 0.5 },
    metrics: {
      speed: initialSpeed, targetSpeed: params.targetSpeed, lateralAccel: 0, longitudinalAccel: 0, yawRate: 0,
      slipFront: 0, slipRear: 0, tireUseFront: 0, tireUseRear: 0, roll: 0, pitch: 0,
      pathError: 0, stoppingDistance: 0, collisions: 0, friction: params.frictionDry,
    },
  };
  ctx.sim.actions.set('autopilot', state.autopilot ? 1 : 0);
  return state;
}

export function trackPoint(angle) {
  return { x: TRACK_RX * Math.cos(angle), z: TRACK_RZ * Math.sin(angle) };
}

export function makeSystems(ctx, state) {
  const { Vehicle: C, entity: e } = state;

  function input(world, dt) {
    state.autopilot = ctx.action('autopilot') !== 0;
    if (state.autopilot) return;
    const axis = ctx.action('throttle');
    C.throttle[e] = slewLimit(C.throttle[e], Math.max(0, axis), dt, 1.8);
    C.brake[e] = slewLimit(C.brake[e], Math.max(0, -axis) || ctx.action('brake'), dt, 3.5);
    C.steer[e] = slewLimit(C.steer[e], ctx.action('steer') * 30 * DEG, dt, 95 * DEG);
  }

  function control(world, dt) {
    if (!state.autopilot) return;
    const p = ctx.params;
    const x = C.x[e], z = C.z[e], yaw = C.yaw[e];
    const angle = Math.atan2(z / TRACK_RZ, x / TRACK_RX);
    const lookAngle = p.lookahead / Math.max(20, Math.hypot(TRACK_RX * Math.sin(angle), TRACK_RZ * Math.cos(angle)));
    const target = trackPoint(angle + lookAngle);
    const desired = Math.atan2(target.z - z, target.x - x);
    let headingError = desired - yaw;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;
    C.steer[e] = slewLimit(C.steer[e], clamp(headingError * p.steeringGain, -30 * DEG, 30 * DEG), dt, 95 * DEG);

    let targetSpeed = p.targetSpeed;
    if (p.scenario === 'braking') {
      targetSpeed = state.distance < 32 ? 30 : 0;
      if (targetSpeed === 0 && state.brakeStartX === null) {
        state.brakeStartX = x; state.brakeStartZ = z; state.phase = 'braking';
        ctx.mark('experiment', 'Emergency braking initiated');
      }
    } else {
      const curvature = Math.abs(C.steer[e]) / Math.max(0.1, p.wheelbase);
      targetSpeed = Math.min(targetSpeed, Math.sqrt(Math.max(2, state.metrics.friction * G / Math.max(0.001, curvature))));
    }
    state.metrics.targetSpeed = targetSpeed;
    const speedError = targetSpeed - Math.max(0, C.u[e]);
    C.throttle[e] = slewLimit(C.throttle[e], clamp(speedError * 0.18, 0, 1), dt, 2);
    C.brake[e] = slewLimit(C.brake[e], clamp(-speedError * 0.28, 0, 1), dt, 4);
  }

  function forces() {
    const p = ctx.params;
    const mass = p.mass, a = p.wheelbase * 0.48, b = p.wheelbase - a;
    const u = Math.max(0.5, Math.abs(C.u[e])), v = C.v[e], r = C.r[e];
    const friction = p.frictionDry * (1 - 0.48 * p.rain / 100);
    state.metrics.friction = friction;
    const alphaF = Math.atan2(v + a * r, u) - C.steer[e];
    const alphaR = Math.atan2(v - b * r, u);
    const engineForce = C.throttle[e] * p.power * 1000 / Math.max(5, u);
    const braking = C.brake[e] * p.brakeForce;
    const drag = 0.39 * u * u + 14 * u;
    const longitudinal = engineForce - braking - drag;
    const axEstimate = longitudinal / mass;
    const transfer = mass * axEstimate * p.cgHeight / p.wheelbase;
    const normalF = clamp(mass * G * b / p.wheelbase - transfer, mass * G * 0.1, mass * G * 0.9);
    const normalR = mass * G - normalF;
    const tire = (alpha, normal) => {
      const linear = -p.cornerStiffness * alpha;
      const limit = friction * normal;
      return limit * Math.tanh(linear / Math.max(1, limit));
    };
    const fyF = tire(alphaF, normalF), fyR = tire(alphaR, normalR);
    state.forces = { front: fyF, rear: fyR, longitudinal, normalFront: normalF, normalRear: normalR };
    state.metrics.slipFront = alphaF * RAD; state.metrics.slipRear = alphaR * RAD;
    state.metrics.tireUseFront = Math.abs(fyF) / (friction * normalF) * 100;
    state.metrics.tireUseRear = Math.abs(fyR) / (friction * normalR) * 100;
  }

  function integrate(world, dt) {
    const p = ctx.params, mass = p.mass, a = p.wheelbase * 0.48, b = p.wheelbase - a;
    const yawInertia = mass * (p.wheelbase * p.wheelbase + p.trackWidth * p.trackWidth) / 12;
    const u = C.u[e], v = C.v[e], r = C.r[e];
    const fx = state.forces.longitudinal;
    const fyF = state.forces.front, fyR = state.forces.rear;
    const du = fx / mass + v * r;
    const dv = (fyF + fyR) / mass - u * r;
    const dr = (a * fyF - b * fyR) / yawInertia;
    C.u[e] = Math.max(0, u + du * dt); C.v[e] = v + dv * dt; C.r[e] = r + dr * dt;
    C.yaw[e] += C.r[e] * dt;
    const cy = Math.cos(C.yaw[e]), sy = Math.sin(C.yaw[e]);
    const dx = (C.u[e] * cy - C.v[e] * sy) * dt, dz = (C.u[e] * sy + C.v[e] * cy) * dt;
    C.x[e] += dx; C.z[e] += dz; state.distance += Math.hypot(dx, dz);

    const lateralAccel = (fyF + fyR) / mass;
    const rollTarget = lateralAccel * p.cgHeight / Math.max(0.1, p.trackWidth * G) * 0.55;
    const pitchTarget = -du * p.cgHeight / Math.max(0.1, p.wheelbase * G) * 0.42;
    const bodyMass = mass * 0.85;
    const rollAccel = ((rollTarget - C.roll[e]) * p.springRate - C.rollRate[e] * p.damping - C.roll[e] * p.antiRoll) / Math.max(1, bodyMass);
    const pitchAccel = ((pitchTarget - C.pitch[e]) * p.springRate - C.pitchRate[e] * p.damping) / Math.max(1, bodyMass);
    C.rollRate[e] += rollAccel * dt; C.roll[e] += C.rollRate[e] * dt;
    C.pitchRate[e] += pitchAccel * dt; C.pitch[e] += C.pitchRate[e] * dt;
    state.metrics.lateralAccel = lateralAccel; state.metrics.longitudinalAccel = du;
  }

  function constrain() {
    const x = C.x[e], z = C.z[e];
    const radial = Math.sqrt((x * x) / (TRACK_RX * TRACK_RX) + (z * z) / (TRACK_RZ * TRACK_RZ));
    const centreAngle = Math.atan2(z / TRACK_RZ, x / TRACK_RX);
    const centre = trackPoint(centreAngle);
    const error = Math.hypot(x - centre.x, z - centre.z);
    state.metrics.pathError = error;
    const contact = error > ROAD_HALF_WIDTH;
    if (contact) {
      const dx = x - centre.x, dz = z - centre.z, d = Math.max(1e-6, Math.hypot(dx, dz));
      C.x[e] = centre.x + dx / d * ROAD_HALF_WIDTH;
      C.z[e] = centre.z + dz / d * ROAD_HALF_WIDTH;
      C.u[e] *= 0.72; C.v[e] *= -0.25; C.r[e] *= 0.45;
      if (!state.collisionLatch) { state.collisions++; ctx.mark('collision', 'Track barrier contact'); }
    }
    state.collisionLatch = contact;
    if (!Number.isFinite(radial)) { C.x[e] = TRACK_RX; C.z[e] = 0; C.u[e] = 0; }
  }

  function post() {
    const speed = Math.hypot(C.u[e], C.v[e]);
    state.metrics.speed = speed; state.metrics.yawRate = C.r[e] * RAD;
    state.metrics.roll = C.roll[e] * RAD; state.metrics.pitch = C.pitch[e] * RAD;
    state.metrics.collisions = state.collisions;
    if (state.brakeStartX !== null) state.metrics.stoppingDistance = Math.hypot(C.x[e] - state.brakeStartX, C.z[e] - state.brakeStartZ);
    if (ctx.params.scenario === 'braking' && state.phase === 'braking' && speed < 0.2) {
      state.phase = 'stopped'; ctx.mark('experiment', `Stopped in ${state.metrics.stoppingDistance.toFixed(1)} m`); ctx.loop.pause();
    }
    ctx.recorder.writeMany(state.metrics);
  }
  return { input, control, forces, integrate, constrain, post };
}

export const TRACK = { rx: TRACK_RX, rz: TRACK_RZ, halfWidth: ROAD_HALF_WIDTH };
