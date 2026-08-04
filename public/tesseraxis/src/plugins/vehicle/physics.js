import { clamp, DEG, RAD, slewLimit } from '../../engine/math.js';

const G = 9.80665;
const TRACK_RX = 88;
const TRACK_RZ = 52;
const ROAD_HALF_WIDTH = 8;

// Scenarios that run on the closed oval. Everything else drives on open ground,
// which is the point: the lab used to offer nothing but a loop, so the only
// trajectory it could ever show was a circle.
const TRACK_SCENARIOS = new Set(['autonomous', 'braking', 'skidpad']);
// Free-drive proving ground: a square pad with a soft edge, big enough that the
// vehicle's own dynamics rather than the walls decide where it goes.
const PAD_HALF = 150;
// Crash test geometry. The vehicle runs down -X and the barrier face sits at
// X = 0, so crush is simply how far the bumper has passed the plane.
const BARRIER_X = 0;
// Run-up is timed rather than fixed. A constant distance meant a 30 km/h test
// spent three seconds driving to the barrier while a 100 km/h test arrived
// almost immediately — the waiting was inversely proportional to how
// interesting the run was.
const CRASH_APPROACH_SECONDS = 0.7;
const CRASH_APPROACH_MIN = 6;

export const isTrackScenario = (scenario) => TRACK_SCENARIOS.has(scenario);

export function createVehicle(ctx) {
  const { world, params } = ctx;
  const Vehicle = world.defineComponent('VehicleBody', {
    x: 'f64', z: 'f64', yaw: 'f64', u: 'f64', v: 'f64', r: 'f64',
    steer: 'f64', throttle: 'f64', brake: 'f64', roll: 'f64', rollRate: 'f64', pitch: 'f64', pitchRate: 'f64',
  });
  const entity = world.createEntity('Test vehicle');
  const scenario = params.scenario;

  // Where the run starts, and how fast, is entirely a property of the
  // experiment being performed.
  let start;
  if (scenario === 'crash') {
    const impact = params.impactSpeed / 3.6;
    start = { x: -Math.max(CRASH_APPROACH_MIN, impact * CRASH_APPROACH_SECONDS), z: 0, yaw: 0, u: impact };
  } else if (scenario === 'freedrive') {
    start = { x: -40, z: 0, yaw: 0, u: 0 };
  } else {
    const initialSpeed = scenario === 'braking' ? 30 : scenario === 'skidpad' ? 16 : 8;
    start = { x: TRACK_RX, z: 0, yaw: Math.PI / 2, u: initialSpeed };
  }
  world.add(entity, Vehicle, start);

  const autopilot = scenario === 'autonomous' || scenario === 'braking';
  const state = {
    entity, Vehicle, scenario,
    phase: scenario === 'braking' ? 'approach' : scenario === 'crash' ? 'sled' : 'running',
    autopilot,
    brakeStartX: null, brakeStartZ: null, collisionLatch: false, collisions: 0, distance: 0,
    forces: { front: 0, rear: 0, longitudinal: 0, normalFront: params.mass * G * 0.5, normalRear: params.mass * G * 0.5 },
    crash: createCrashState(params),
    damage: {
      integrity: 100, front: 0, side: 0, suspension: 0,
      wheelLoss: 0, powertrainFailed: false, immobilized: false,
      rollover: false, fuelBreach: false, fire: false,
      lastSeverity: 0, debrisEvents: 0,
    },
    metrics: {
      speed: start.u, targetSpeed: params.targetSpeed, lateralAccel: 0, longitudinalAccel: 0, yawRate: 0,
      slipFront: 0, slipRear: 0, tireUseFront: 0, tireUseRear: 0, roll: 0, pitch: 0,
      pathError: 0, stoppingDistance: 0, collisions: 0, friction: params.frictionDry,
      crush: 0, decel: 0, occupantDecel: 0, occupantExcursion: 0, energyAbsorbed: 0,
      integrity: 100, impactSeverity: 0,
    },
  };
  ctx.sim.actions.set('autopilot', state.autopilot ? 1 : 0);
  return state;
}

function createCrashState(params) {
  const impact = params.impactSpeed / 3.6;
  return {
    contact: false, done: false, struckInterior: false,
    crush: 0, maxCrush: 0, bottomedOut: false,
    decel: 0, peakDecel: 0, energy: 0,
    impactSpeed: impact, deltaV: 0, pulseTime: 0,
    // The belted occupant is a second mass that only couples to the car once
    // the belt takes up. Until then it keeps travelling at the impact speed.
    occupantV: impact, occupantRel: 0, occupantDecel: 0, occupantPeak: 0, occupantMaxRel: 0,
  };
}

export function trackPoint(angle) {
  return { x: TRACK_RX * Math.cos(angle), z: TRACK_RZ * Math.sin(angle) };
}

export function makeSystems(ctx, state) {
  const { Vehicle: C, entity: e } = state;

  function input(world, dt) {
    // A crash run is a sled test: the driver has no say in it, and letting
    // keys add throttle mid-impact would corrupt the measured pulse.
    if (state.scenario === 'crash') return;
    state.autopilot = ctx.action('autopilot') !== 0;
    if (state.autopilot) return;
    const axis = ctx.action('throttle');
    C.throttle[e] = slewLimit(C.throttle[e], Math.max(0, axis), dt, 1.8);
    C.brake[e] = slewLimit(C.brake[e], Math.max(0, -axis) || ctx.action('brake'), dt, 3.5);
    C.steer[e] = slewLimit(C.steer[e], ctx.action('steer') * 30 * DEG, dt, 95 * DEG);
  }

  function applyDamage({ speed, normalSpeed = speed, side = false, rollover = false }) {
    const d = state.damage;
    const energy = 0.5 * ctx.params.mass * normalSpeed * normalSpeed;
    // Rough damage scale: a regulatory-speed frontal impact consumes a
    // meaningful portion of the replaceable front structure, while a
    // motorway-speed rigid-barrier hit reaches powertrain/cell failure.
    const severity = clamp(energy / 280000, 0, 3.5);
    d.lastSeverity = severity;
    const loss = severity * (side ? 19 : 18) + (rollover ? 24 : 0);
    d.integrity = clamp(d.integrity - loss, 0, 100);
    if (side) d.side = clamp(d.side + severity * 28, 0, 100);
    else d.front = clamp(d.front + severity * 32, 0, 100);
    d.suspension = clamp(d.suspension + severity * (side ? 24 : 14) + (rollover ? 35 : 0), 0, 100);
    if (severity > 0.72) d.debrisEvents++;
    if (d.suspension > 58 && d.wheelLoss === 0) d.wheelLoss = 1;
    if (d.suspension > 86) d.wheelLoss = 2;
    if (d.front > 74 || d.integrity < 38) d.powertrainFailed = true;
    d.rollover ||= rollover;
    // A fire is deliberately rare. Hollywood fireballs are not a default
    // crash outcome; this requires a severe impact plus a breached fuel system.
    d.fuelBreach ||= (side && severity > 1.55) || severity > 2.35;
    d.fire ||= d.fuelBreach && energy > 900000;
    d.immobilized ||= d.powertrainFailed || d.wheelLoss >= 2 || d.rollover || d.integrity <= 12;
    if (d.powertrainFailed) C.throttle[e] = 0;
    return severity;
  }

  // The crash sled holds the vehicle at exactly the requested impact speed
  // until the bumper reaches the barrier. Without it the run-up distance and
  // aerodynamic drag would both feed into the speed at contact, and the
  // experiment's independent variable would stop being the impact speed.
  function sled() {
    if (state.scenario !== 'crash' || state.crash.contact) return;
    C.u[e] = state.crash.impactSpeed;
    C.v[e] = 0; C.r[e] = 0; C.steer[e] = 0;
  }

  function control(world, dt) {
    sled();
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

  // Distance from the centre of gravity to the front bumper, which is what
  // actually touches the barrier.
  const noseAhead = (p) => p.wheelbase * 0.48 + 0.82;

  /**
   * Front structure against a rigid barrier.
   *
   * A real crush curve rises steeply while the rails buckle elastically and
   * then flattens into a long plastic plateau — that plateau is the whole
   * point of a crumple zone, because a roughly constant force is what turns a
   * given amount of kinetic energy into the longest possible stopping
   * distance, and stopping distance is what sets peak deceleration. Modelled
   * as a linear rise clipped at a plateau force.
   */
  // Pure: force the structure returns at a given crush depth. Kept free of
  // side effects because both the force phase and the bookkeeping phase need
  // to ask the same question in the same tick.
  function crushForceAt(crush, p) {
    if (crush <= 0) return 0;
    const plateau = p.crushForce * 1000;
    // Past the crushable length the remaining structure is the passenger
    // cell, which is built not to deform — so it goes rigid and the pulse
    // spikes. That spike is the thing crumple zones exist to avoid.
    if (crush >= p.crushLength) return plateau * 6;
    return Math.min(p.crushStiffness * crush, plateau);
  }

  const currentCrush = (p) => Math.max(0, (C.x[e] + noseAhead(p)) - BARRIER_X);

  function barrierForce(p) {
    const crash = state.crash;
    if (state.scenario !== 'crash' || crash.done) return 0;

    const crush = currentCrush(p);
    if (crush <= 0) return 0;

    if (!crash.contact) {
      crash.contact = true;
      crash.impactSpeed = Math.max(crash.impactSpeed, C.u[e]);
      state.phase = 'impact';
      ctx.mark('collision', `Barrier contact at ${(C.u[e] * 3.6).toFixed(1)} km/h`);
    }
    if (crush >= p.crushLength) crash.bottomedOut = true;
    return crushForceAt(crush, p);
  }

  function forces() {
    const p = ctx.params;
    const mass = p.mass, a = p.wheelbase * 0.48, b = p.wheelbase - a;
    const u = Math.max(0.5, Math.abs(C.u[e])), v = C.v[e], r = C.r[e];
    const friction = p.frictionDry * (1 - 0.48 * p.rain / 100);
    state.metrics.friction = friction;
    const alphaF = Math.atan2(v + a * r, u) - C.steer[e];
    const alphaR = Math.atan2(v - b * r, u);
    const powerFactor = state.damage.powertrainFailed ? 0 : clamp(state.damage.integrity / 65, 0.25, 1);
    const engineForce = C.throttle[e] * p.power * 1000 * powerFactor / Math.max(5, u);
    const braking = C.brake[e] * p.brakeForce;
    const drag = 0.39 * u * u + 14 * u;
    const longitudinal = engineForce - braking - drag - barrierForce(p);
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
    // Suspension damage introduces alignment pull and makes a failed vehicle
    // progressively harder to control instead of remaining perfectly healthy.
    if (state.damage.suspension > 20 && state.scenario !== 'crash') {
      const pull = (state.damage.suspension / 100) * (state.damage.wheelLoss ? 0.42 : 0.08);
      C.r[e] += pull * dt;
      C.v[e] += pull * Math.max(1, C.u[e]) * 0.12 * dt;
    }
    state.metrics.lateralAccel = lateralAccel; state.metrics.longitudinalAccel = du;
  }

  /**
   * The belted occupant, as a second mass.
   *
   * The occupant is not bolted to the car. Through the belt's slack and its
   * stretch they keep moving at the impact speed while the structure is
   * already slowing, then get decelerated over a shorter distance and hence
   * at a higher peak — which is why occupant loads exceed vehicle loads, and
   * why slack matters so much more than it looks like it should.
   */
  function occupant(dt) {
    const crash = state.crash, p = ctx.params;
    if (!crash.contact || crash.done) return;

    crash.occupantRel += (crash.occupantV - C.u[e]) * dt;
    crash.occupantRel = Math.max(0, crash.occupantRel);
    crash.occupantMaxRel = Math.max(crash.occupantMaxRel, crash.occupantRel);

    const stretch = crash.occupantRel - p.beltSlack;
    let force = 0;
    if (stretch > 0) force = p.beltStiffness * stretch + p.beltDamping * Math.max(0, crash.occupantV - C.u[e]);

    // Past this the occupant has run out of survival space and reaches the
    // interior, which is a hard stop rather than a restrained one.
    if (crash.occupantRel >= p.survivalSpace && !crash.struckInterior) {
      crash.struckInterior = true;
      ctx.mark('collision', 'Occupant contacted vehicle interior');
    }
    if (crash.struckInterior) force = Math.max(force, p.beltStiffness * 4 * (crash.occupantRel - p.survivalSpace));

    const accel = force / Math.max(1, p.occupantMass);
    crash.occupantV = Math.max(0, crash.occupantV - accel * dt);
    crash.occupantDecel = accel / G;
    crash.occupantPeak = Math.max(crash.occupantPeak, crash.occupantDecel);
  }

  function crashStep(dt) {
    const crash = state.crash;
    if (state.scenario !== 'crash') return;

    const crush = currentCrush(ctx.params);
    if (crash.contact && !crash.done) {
      // Energy is the area under the crush curve. Trapezoid rather than
      // right-endpoint: the force rises steeply through the elastic phase, and
      // taking the end-of-step value across the whole step overstated the area
      // enough to report more energy absorbed than the vehicle ever had.
      const previous = crash.maxCrush;
      const advance = Math.max(0, crush - previous);
      if (advance > 0) {
        crash.energy += 0.5 * (crushForceAt(previous, ctx.params) + crushForceAt(crush, ctx.params)) * advance;
      }
      crash.crush = crush;
      crash.maxCrush = Math.max(crash.maxCrush, crush);
      crash.decel = Math.abs(state.metrics.longitudinalAccel) / G;
      crash.peakDecel = Math.max(crash.peakDecel, crash.decel);
      crash.pulseTime += dt;
      occupant(dt);

      // The pulse is over when the structure stops being compressed.
      if (C.u[e] <= 0.05) {
        crash.done = true;
        crash.deltaV = crash.impactSpeed;
        state.phase = 'post-impact';
        C.u[e] = -crash.impactSpeed * ctx.params.restitution;
        state.collisions++;
        applyDamage({ speed: crash.impactSpeed, normalSpeed: crash.impactSpeed });
        ctx.mark('experiment',
          `Crash complete · ${crash.maxCrush.toFixed(2)} m crush · ${crash.peakDecel.toFixed(0)} g peak · ` +
          `occupant ${crash.occupantPeak.toFixed(0)} g`);
        ctx.loop.pause();
      }
    }
  }

  function constrain(world, dt) {
    if (state.scenario === 'crash') { crashStep(dt); return; }
    if (state.scenario === 'freedrive') { padBounds(); return; }

    const x = C.x[e], z = C.z[e];
    const radial = Math.sqrt((x * x) / (TRACK_RX * TRACK_RX) + (z * z) / (TRACK_RZ * TRACK_RZ));
    const centreAngle = Math.atan2(z / TRACK_RZ, x / TRACK_RX);
    const centre = trackPoint(centreAngle);
    const error = Math.hypot(x - centre.x, z - centre.z);
    state.metrics.pathError = error;
    const contact = error > ROAD_HALF_WIDTH;
    if (contact) {
      const dx = x - centre.x, dz = z - centre.z, d = Math.max(1e-6, Math.hypot(dx, dz));
      const speedBefore = Math.hypot(C.u[e], C.v[e]);
      const normalSpeed = Math.min(speedBefore, Math.abs(C.v[e]) + Math.abs(C.u[e]) * 0.34);
      C.x[e] = centre.x + dx / d * ROAD_HALF_WIDTH;
      C.z[e] = centre.z + dz / d * ROAD_HALF_WIDTH;
      C.u[e] *= 0.72; C.v[e] *= -0.25; C.r[e] *= 0.45;
      if (!state.collisionLatch) {
        state.collisions++;
        const severity = applyDamage({ speed: speedBefore, normalSpeed, side: true });
        ctx.mark('collision', `Track barrier impact · severity ${severity.toFixed(2)}`);
      }
    }
    state.collisionLatch = contact;
    if (!Number.isFinite(radial)) { C.x[e] = TRACK_RX; C.z[e] = 0; C.u[e] = 0; }
  }

  // Free driving still needs an edge somewhere, but it is a boundary rather
  // than a rail: it only acts once the vehicle actually reaches it, so the
  // path in between is entirely the driver's and the tire model's.
  function padBounds() {
    let hit = false;
    for (const axis of ['x', 'z']) {
      if (C[axis][e] > PAD_HALF) { C[axis][e] = PAD_HALF; hit = true; }
      if (C[axis][e] < -PAD_HALF) { C[axis][e] = -PAD_HALF; hit = true; }
    }
    if (hit) {
      const speedBefore = Math.hypot(C.u[e], C.v[e]);
      C.u[e] *= 0.55; C.v[e] *= -0.2; C.r[e] *= 0.4;
      if (!state.collisionLatch) {
        state.collisions++;
        const severity = applyDamage({ speed: speedBefore, normalSpeed: speedBefore * 0.7, side: true });
        ctx.mark('collision', `Proving-ground barrier impact · severity ${severity.toFixed(2)}`);
      }
    }
    state.collisionLatch = hit;
    state.metrics.pathError = 0;
  }

  function post() {
    const speed = Math.hypot(C.u[e], C.v[e]);
    state.metrics.speed = speed; state.metrics.yawRate = C.r[e] * RAD;
    state.metrics.roll = C.roll[e] * RAD; state.metrics.pitch = C.pitch[e] * RAD;
    state.metrics.collisions = state.collisions;

    const crash = state.crash;
    state.metrics.crush = crash.maxCrush;
    state.metrics.decel = crash.contact ? crash.decel : 0;
    state.metrics.occupantDecel = crash.occupantDecel;
    state.metrics.occupantExcursion = crash.occupantRel;
    state.metrics.energyAbsorbed = crash.energy / 1000; // kJ
    state.metrics.integrity = state.damage.integrity;
    state.metrics.impactSeverity = state.damage.lastSeverity;

    // A large sustained roll angle represents a trip/rollover. This is an
    // outcome, not a cosmetic animation: control and propulsion are lost.
    if (!state.damage.rollover && Math.abs(C.roll[e]) > 58 * DEG && speed > 8) {
      applyDamage({ speed, normalSpeed: speed * 0.8, side: true, rollover: true });
      state.phase = 'rollover';
      ctx.mark('collision', 'Vehicle rollover · simulation failed');
    }
    if (state.damage.immobilized && state.scenario !== 'crash') {
      C.throttle[e] = 0;
      state.autopilot = false;
      if (speed < 0.35 && state.phase !== 'failed') {
        state.phase = 'failed';
        ctx.mark('experiment', 'Vehicle immobilized by structural damage');
        ctx.loop.pause();
      }
    }

    if (state.brakeStartX !== null) state.metrics.stoppingDistance = Math.hypot(C.x[e] - state.brakeStartX, C.z[e] - state.brakeStartZ);
    if (ctx.params.scenario === 'braking' && state.phase === 'braking' && speed < 0.2) {
      state.phase = 'stopped'; ctx.mark('experiment', `Stopped in ${state.metrics.stoppingDistance.toFixed(1)} m`); ctx.loop.pause();
    }
    ctx.recorder.writeMany(state.metrics);
  }
  return { input, control, forces, integrate, constrain, post };
}

export const TRACK = { rx: TRACK_RX, rz: TRACK_RZ, halfWidth: ROAD_HALF_WIDTH };
