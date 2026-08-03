// Powered descent — the physics and the guidance.
//
// This file has no rendering in it and imports nothing from three.js, so the
// whole vehicle can be flown headless: in a test, in a batch parameter sweep,
// in a worker. tools/fly.mjs does exactly that.
//
// Frame convention: world Y is up, the pad sits at the origin. The vehicle's
// long axis is body +Y, so an upright rocket has its body axis aligned with
// world up and the engine bell at body −Y.

import {
  vec3, quat, clamp, v3length, v3normalize, v3cross, v3dot,
  qRotate, qRotateInverse, qIntegrate, qFromAxisAngle, qnormalize,
  DEG, RAD, slewLimit,
} from '../../engine/math.js';
import { Pid } from '../../control/pid.js';

const G0 = 9.80665;          // standard gravity, and the Isp reference
const EARTH_RADIUS = 6371000;
const SEA_LEVEL_DENSITY = 1.225;
const SCALE_HEIGHT = 8500;   // exponential atmosphere, troposphere-ish fit
const SPEED_OF_SOUND = 340.3;

export const SCENARIOS = {
  hop: {
    label: 'Suborbital hop',
    altitude: 2200, vertical: -150, downrange: 400, lateral: -45,
    fuel: 12000, tilt: 12,
  },
  entry: {
    label: 'High entry',
    altitude: 5200, vertical: -280, downrange: 1100, lateral: -85,
    fuel: 15500, tilt: 16,
  },
  divert: {
    label: 'Off-target divert',
    altitude: 2400, vertical: -150, downrange: 620, lateral: -5,
    fuel: 11000, tilt: 6,
  },
  reserve: {
    label: 'Low propellant',
    altitude: 2000, vertical: -160, downrange: 260, lateral: -35,
    fuel: 5200, tilt: 9,
  },
};

// Everything the systems below need, in one place. Held by the plugin rather
// than in module scope so two instances could run side by side.
export function createRocket(ctx) {
  const { world, params } = ctx;

  const C = {
    Transform: world.defineComponent('Transform', {
      x: 'f64', y: 'f64', z: 'f64',
      qx: 'f64', qy: 'f64', qz: 'f64', qw: 'f64',
    }),
    Velocity: world.defineComponent('Velocity', {
      vx: 'f64', vy: 'f64', vz: 'f64',
      wx: 'f64', wy: 'f64', wz: 'f64',
    }),
    Mass: world.defineComponent('Mass', {
      mass: 'f64', fuel: 'f64', dry: 'f64',
      ixx: 'f64', iyy: 'f64', izz: 'f64',
    }),
    // gimbalA tilts thrust toward body +X, gimbalB toward body +Z. ctrlTx and
    // ctrlTz are the torques the fins and thrusters are contributing this tick,
    // stored rather than recomputed so the inspector can show the split.
    Actuator: world.defineComponent('Actuator', {
      throttle: 'f64', gimbalA: 'f64', gimbalB: 'f64',
      ctrlTx: 'f64', ctrlTz: 'f64', roll: 'f64',
    }),
    Accum: world.defineComponent('Accum', {
      fx: 'f64', fy: 'f64', fz: 'f64',
      tx: 'f64', ty: 'f64', tz: 'f64',
    }),
  };

  const scenario = SCENARIOS[params.scenario] ?? SCENARIOS.hop;

  const entity = world.createEntity('Booster');
  world.add(entity, C.Transform, {
    x: scenario.downrange, y: scenario.altitude, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
  });
  world.add(entity, C.Velocity, {
    vx: scenario.lateral, vy: scenario.vertical, vz: 0,
    wx: 0, wy: 0, wz: 0,
  });
  world.add(entity, C.Mass, {});
  world.add(entity, C.Actuator, {});
  world.add(entity, C.Accum, {});

  const state = {
    entity,
    C,
    scenario,
    phase: 'coast',
    ignitionTime: null,
    touchdown: null,

    // Only the descent loop is a genuine PID — it has an integrator that has to
    // trim out a steady bias. The attitude loop is a proportional-derivative
    // law on the pointing error, which is the standard result for rigid-body
    // attitude control and needs no integral term at all.
    pids: { descent: new Pid({ kp: 1.35, ki: 0.12, kd: 0.05, outMin: -6, outMax: 45, integralLimit: 6 }) },

    att: { alphaX: 0, alphaZ: 0, tauGimbal: 0, tauSurface: 0, finShare: 0, gimbalSaturated: false },

    // Wind is an Ornstein–Uhlenbeck process rather than white noise: real gusts
    // are correlated in time, and a controller tuned against white noise is
    // tuned against a disturbance that cannot happen.
    windRng: ctx.rng.fork('wind'),
    wind: { x: 0, z: 0 },

    // Air state, computed in the sense phase so the controller and the force
    // accumulation both read the same numbers from the same instant.
    air: { vx: 0, vy: 0, vz: 0, speed: 0, density: 0, q: 0, mach: 0 },

    derived: {
      altitude: 0, speed: 0, vertical: 0, lateral: 0,
      tilt: 0, attitudeError: 0, offset: 0,
      thrust: 0, drag: 0, dynamicPressure: 0, mach: 0,
      acceleration: 0, twr: 0, gravity: G0,
      targetVertical: 0, burnTimeLeft: 0, deltaVLeft: 0,
      feedforward: 0, autopilot: true,
    },
  };

  applyMassProperties(ctx, state, scenario.fuel);

  // Pitched over into the retrograde direction, which is where an entry burn
  // leaves a returning booster.
  const q = quat();
  qFromAxisAngle(q, { x: 0, y: 0, z: 1 }, -scenario.tilt * DEG);
  C.Transform.qx[entity] = q.x;
  C.Transform.qy[entity] = q.y;
  C.Transform.qz[entity] = q.z;
  C.Transform.qw[entity] = q.w;

  return state;
}

// Mass and inertia of a uniform cylinder, recomputed as propellant drains.
// Treating inertia as constant is the usual shortcut and it is wrong in a way
// that matters here: a booster loses most of its mass during the burn, and its
// response to the same gimbal deflection changes by the same factor.
export function applyMassProperties(ctx, state, fuel) {
  const { params } = ctx;
  const { C, entity } = state;
  const dry = params.dryMass;
  const mass = dry + Math.max(0, fuel);
  const r = params.radius;
  const h = params.length;

  C.Mass.dry[entity] = dry;
  C.Mass.fuel[entity] = Math.max(0, fuel);
  C.Mass.mass[entity] = mass;
  C.Mass.ixx[entity] = (mass * (3 * r * r + h * h)) / 12;
  C.Mass.izz[entity] = (mass * (3 * r * r + h * h)) / 12;
  C.Mass.iyy[entity] = (mass * r * r) / 2;
}

export const atmosphericDensity = (altitude) =>
  altitude < 0 ? SEA_LEVEL_DENSITY : SEA_LEVEL_DENSITY * Math.exp(-altitude / SCALE_HEIGHT);

// Inverse-square gravity. At 5 km the difference from a constant 9.80665 is
// about 0.16% — small, free, and it keeps the code honest if someone raises the
// entry altitude to something suborbital.
export const gravityAt = (altitude) =>
  G0 * (EARTH_RADIUS / (EARTH_RADIUS + Math.max(0, altitude))) ** 2;

// The descent profile the autopilot flies: the speed at which the vehicle can
// still stop, given a reserve deceleration, plus a small touchdown speed. It is
// also the ignition trigger — the engine lights the moment the vehicle is
// falling faster than this curve allows, which is what a suicide burn is.
//
// `centreHeight` is the world Y of the vehicle's centre of mass. The height
// that matters is the gap under its feet, half a vehicle length lower — take
// the centre height instead and the profile happily flies the vehicle into the
// pad at the 20-odd m/s it thinks it still has room to shed.
export function targetDescentRate(centreHeight, params) {
  const hEff = clearanceAboveFlare(centreHeight, params);
  return -Math.min(
    params.maxDescentRate,
    params.touchdownRate + Math.sqrt(2 * params.profileDecel * hEff),
  );
}

// Height above the flare, which is where the constant-deceleration curve
// applies. Below the flare the profile is a constant slow rate: the curve's
// slope tends to infinity as h → 0, so tracking it all the way down would
// demand infinite jerk, and a vehicle that cannot deliver that simply arrives
// fast — by about 10 m/s, which is the difference between a landing and a
// crater.
function clearanceAboveFlare(centreHeight, params) {
  const h = centreHeight - params.padHeight - params.length * 0.5;
  return Math.max(0, h - params.flareHeight);
}

// dv/dh along the profile. The autopilot multiplies it by the current descent
// rate to get dv/dt — the deceleration the profile is *about* to demand — and
// commands that directly as feedforward. Without it the PID is permanently
// chasing a moving setpoint and settles with a standing error that grows as the
// curve steepens; that error is precisely the speed the vehicle arrives with.
export function profileSlope(centreHeight, params) {
  const hEff = clearanceAboveFlare(centreHeight, params);
  if (hEff < 1e-6) return 0;
  const rate = params.touchdownRate + Math.sqrt(2 * params.profileDecel * hEff);
  // In the capped region the profile is flat, so it demands nothing.
  if (rate >= params.maxDescentRate) return 0;
  return -params.profileDecel / Math.sqrt(2 * params.profileDecel * hEff);
}

// ---------------------------------------------------------------------------
// Systems, in the order the loop runs them
// ---------------------------------------------------------------------------

export function makeSystems(ctx, state) {
  const { C, entity } = state;
  const { params } = ctx;

  // Scratch vectors, allocated once. These systems run 120 times a second and
  // per-tick garbage is the difference between a smooth frame and a stutter.
  const tmp = {
    up: vec3(0, 1, 0),
    bodyAxis: vec3(),
    dragForce: vec3(),
    dragBody: vec3(),
    thrustBody: vec3(),
    thrustWorld: vec3(),
    torque: vec3(),
    lever: vec3(),
    desiredAxis: vec3(),
    desiredBody: vec3(),
    axisError: vec3(),
    q: quat(),
    omega: vec3(),
  };

  const readQuat = () => {
    tmp.q.x = C.Transform.qx[entity];
    tmp.q.y = C.Transform.qy[entity];
    tmp.q.z = C.Transform.qz[entity];
    tmp.q.w = C.Transform.qw[entity];
    return tmp.q;
  };

  const liveThrust = () =>
    C.Mass.fuel[entity] > 0
      ? C.Actuator.throttle[entity] * params.engines * params.thrustPerEngine
      : 0;

  // -- input -------------------------------------------------------------

  const input = (world, dt) => {
    if (state.touchdown) return;

    state.derived.autopilot = ctx.action('autopilot') !== 0;
    if (state.derived.autopilot) return;

    // Manual flying. Throttle is a rate control rather than an absolute — an
    // instantaneous jump from 0 to 100% is not something a turbopump does, and
    // holding a key to spool up is closer to the real thing.
    C.Actuator.throttle[entity] = clamp(
      C.Actuator.throttle[entity] + ctx.action('throttle') * dt * 0.8, 0, 1,
    );
    C.Actuator.gimbalA[entity] = slewLimit(
      C.Actuator.gimbalA[entity], ctx.action('yaw') * params.maxGimbal * DEG, dt, params.gimbalRate * DEG,
    );
    C.Actuator.gimbalB[entity] = slewLimit(
      C.Actuator.gimbalB[entity], -ctx.action('pitch') * params.maxGimbal * DEG, dt, params.gimbalRate * DEG,
    );
    C.Actuator.ctrlTx[entity] = 0;
    C.Actuator.ctrlTz[entity] = 0;
    C.Actuator.roll[entity] = ctx.action('roll');
  };

  // -- sense: wind and the air state ------------------------------------

  const sense = (world, dt) => {
    // dx = −(x/τ)dt + σ√dt · N(0,1) — mean-reverting, so gusts build and decay
    // instead of flickering.
    const tau = 6;
    const decay = dt / tau;
    state.wind.x += -state.wind.x * decay + params.windGust * Math.sqrt(dt) * state.windRng.normal();
    state.wind.z += -state.wind.z * decay + params.windGust * Math.sqrt(dt) * state.windRng.normal();

    // Velocity relative to the moving air mass, which is what actually
    // generates force — a vehicle drifting with the wind feels no crosswind.
    const air = state.air;
    air.vx = C.Velocity.vx[entity] - state.wind.x - params.windMean;
    air.vy = C.Velocity.vy[entity];
    air.vz = C.Velocity.vz[entity] - state.wind.z;
    air.speed = Math.hypot(air.vx, air.vy, air.vz);
    air.density = atmosphericDensity(C.Transform.y[entity]);
    air.q = 0.5 * air.density * air.speed * air.speed;
    air.mach = air.speed / SPEED_OF_SOUND;

    state.derived.dynamicPressure = air.q;
    state.derived.mach = air.mach;
  };

  // -- control: guidance, attitude, and control allocation ---------------

  const control = (world, dt) => {
    if (state.touchdown) return;

    const x = C.Transform.x[entity];
    const y = C.Transform.y[entity];
    const z = C.Transform.z[entity];
    const vx = C.Velocity.vx[entity];
    const vy = C.Velocity.vy[entity];
    const vz = C.Velocity.vz[entity];
    const mass = C.Mass.mass[entity];

    const targetRate = targetDescentRate(y, params);
    state.derived.targetVertical = targetRate;

    // Ignition: the profile is the trigger. Above the curve the vehicle can
    // still stop; below it, every tick of delay costs propellant it does not
    // have.
    if (state.phase === 'coast') {
      if (vy < targetRate * (1 - params.ignitionMargin) && C.Mass.fuel[entity] > 0) {
        state.phase = 'burn';
        state.ignitionTime = ctx.loop.time;
        ctx.mark('phase', 'Landing burn ignition');
        ctx.print(
          `Ignition at ${(y - params.padHeight).toFixed(0)} m, ${Math.abs(vy).toFixed(1)} m/s descent`,
          'info',
        );
      }
    }

    if (!state.derived.autopilot) return;

    // ---- outer loop: where should the body axis point? ----

    if (state.phase === 'coast') {
      C.Actuator.throttle[entity] = 0;
      // Retrograde. Pointing the engine into the airflow is both what the burn
      // will need and the least draggy attitude to wait in.
      const speed = state.air.speed;
      if (speed > 1) {
        tmp.desiredAxis.x = -state.air.vx / speed;
        tmp.desiredAxis.y = -state.air.vy / speed;
        tmp.desiredAxis.z = -state.air.vz / speed;
      } else {
        tmp.desiredAxis.x = 0; tmp.desiredAxis.y = 1; tmp.desiredAxis.z = 0;
      }
    } else {
      const gravity = gravityAt(y);

      // Vertical closes on the descent profile. The feedforward term supplies
      // the deceleration the profile itself demands, leaving the PID to correct
      // only the residual — which is what lets a loop with modest gains track a
      // setpoint that is steepening under it.
      const feedforward = profileSlope(y, params) * vy;
      state.derived.feedforward = feedforward;
      const verticalAccel =
        gravity + feedforward + state.pids.descent.update(targetRate, vy, dt);

      // Lateral guidance is a second-order approach on position and velocity.
      //
      // A speed-in-distance profile like the vertical axis uses was tried here
      // and is worse: it authorises a high closing speed at long range, the
      // vehicle accelerates to take it, and by the time it needs to shed that
      // speed the tilt allowance below has tapered away the authority to do so.
      // The vertical axis does not have that problem because gravity, not the
      // controller, supplies the closing speed. Here the PD's own damping term
      // limits the approach speed continuously instead.
      // Close to the pad the guidance stops chasing position and only damps
      // velocity. The two terms are treated differently on purpose: arriving
      // two metres off centre is a miss distance, arriving with two metres per
      // second of drift is a tipped-over vehicle. Below the taper height the
      // position error is accepted for what it is and the remaining authority
      // goes entirely into stopping the drift.
      const clearance = Math.max(0, y - params.padHeight - params.length * 0.5);
      const positionWeight = clamp(clearance / params.uprightHeight, 0, 1);

      let lateralX = -params.lateralKp * x * positionWeight - params.lateralKd * vx;
      let lateralZ = -params.lateralKp * z * positionWeight - params.lateralKd * vz;

      // The tilt allowance narrows toward the ground for the same reason — a
      // vehicle has to arrive upright — but it narrows to a floor rather than
      // to zero. Taking it all the way to zero leaves the last second of the
      // descent with no lateral authority at all, and whatever drift happens to
      // exist at that moment is simply what it lands with.
      const tiltLimit =
        params.terminalTilt + (params.maxTilt - params.terminalTilt) * positionWeight;

      // Scaling the horizontal component rather than clamping the tilt
      // afterwards keeps the commanded vector's bearing and costs it only
      // magnitude — clamping the angle would change which way it leans.
      const maxHorizontal = Math.tan(tiltLimit * DEG) * verticalAccel;
      const horizontal = Math.hypot(lateralX, lateralZ);
      if (horizontal > maxHorizontal && horizontal > 1e-9) {
        const scale = maxHorizontal / horizontal;
        lateralX *= scale;
        lateralZ *= scale;
      }

      tmp.desiredAxis.x = lateralX;
      tmp.desiredAxis.y = verticalAccel;
      tmp.desiredAxis.z = lateralZ;
      const commandedAccel = v3length(tmp.desiredAxis);
      v3normalize(tmp.desiredAxis);

      // Throttle follows from the magnitude: the thrust needed to produce the
      // commanded acceleration, as a fraction of what the engines can give.
      const available = params.engines * params.thrustPerEngine;
      C.Actuator.throttle[entity] = C.Mass.fuel[entity] > 0
        ? clamp((mass * commandedAccel) / available, params.minThrottle, 1)
        : 0;
    }

    // ---- inner loop: point the body axis there ----

    const q = readQuat();
    qRotateInverse(tmp.desiredBody, q, tmp.desiredAxis);

    // cross(body +Y, desired-in-body) is exactly the rotation vector that
    // closes the error: its direction is the axis to turn about and its
    // magnitude is the sine of the angle. It saturates gracefully at 90°
    // instead of wrapping, which an Euler-angle formulation does not.
    v3cross(tmp.axisError, tmp.up, tmp.desiredBody);
    state.derived.attitudeError = Math.acos(clamp(tmp.desiredBody.y, -1, 1)) * RAD;

    // Proportional-derivative on pointing error and body rate, commanding an
    // angular acceleration directly. Working in acceleration rather than in
    // torque is what makes the gains independent of how heavy the vehicle
    // currently is — the mass cancels in the next step.
    const limit = params.attitudeAuthority;
    state.att.alphaX = clamp(
      params.attitudeKp * tmp.axisError.x - params.attitudeKd * C.Velocity.wx[entity],
      -limit, limit,
    );
    state.att.alphaZ = clamp(
      params.attitudeKp * tmp.axisError.z - params.attitudeKd * C.Velocity.wz[entity],
      -limit, limit,
    );

    allocate(state.att.alphaX * C.Mass.ixx[entity], state.att.alphaZ * C.Mass.izz[entity], dt);
    C.Actuator.roll[entity] = 0;
  };

  // Control allocation. Three effectors, each with a different availability:
  // the gimbal needs the engine lit, the fins need dynamic pressure, and the
  // thrusters work always but are weak. They are used in that order, because
  // that is the order of cost — vectoring thrust the vehicle is already
  // producing is free, deflecting a fin costs drag, and firing a thruster
  // spends a consumable.
  function allocate(tauX, tauZ, dt) {
    const thrust = liveThrust();
    const lever = params.length * 0.5;
    let remainingX = tauX;
    let remainingZ = tauZ;
    let targetA = 0;
    let targetB = 0;

    if (thrust > 1) {
      const maxSin = Math.sin(params.maxGimbal * DEG);
      // τ = r × F with r = (0, −L/2, 0) gives τx = −(L/2)·T·sin(b) and
      // τz = +(L/2)·T·sin(a), which inverts to this.
      const sinB = clamp(-tauX / (lever * thrust), -maxSin, maxSin);
      const sinA = clamp(tauZ / (lever * thrust), -maxSin, maxSin);
      targetB = Math.asin(sinB);
      targetA = Math.asin(sinA);
      state.att.gimbalSaturated =
        Math.abs(sinB) >= maxSin - 1e-9 || Math.abs(sinA) >= maxSin - 1e-9;

      remainingX = tauX + lever * thrust * sinB;
      remainingZ = tauZ - lever * thrust * sinA;
      state.att.tauGimbal = Math.hypot(lever * thrust * sinB, lever * thrust * sinA);
    } else {
      state.att.gimbalSaturated = false;
      state.att.tauGimbal = 0;
    }

    C.Actuator.gimbalA[entity] = slewLimit(C.Actuator.gimbalA[entity], targetA, dt, params.gimbalRate * DEG);
    C.Actuator.gimbalB[entity] = slewLimit(C.Actuator.gimbalB[entity], targetB, dt, params.gimbalRate * DEG);

    // Grid fins scale with dynamic pressure, so they are strong exactly when
    // the vehicle is fast and useless exactly when it is slow — which is the
    // whole reason a landing booster needs both them and a gimbal, and why the
    // handover between the two is the interesting part of the descent.
    const finTorque = params.finArea * state.air.q * params.finLever;
    const authority = finTorque + params.rcsTorque;
    state.att.finShare = authority > 0 ? finTorque / authority : 0;
    state.att.tauSurface = Math.hypot(
      clamp(remainingX, -authority, authority),
      clamp(remainingZ, -authority, authority),
    );

    C.Actuator.ctrlTx[entity] = clamp(remainingX, -authority, authority);
    C.Actuator.ctrlTz[entity] = clamp(remainingZ, -authority, authority);
  }

  // -- forces -------------------------------------------------------------

  const forces = (world, dt) => {
    const y = C.Transform.y[entity];
    const mass = C.Mass.mass[entity];
    const q = readQuat();
    const air = state.air;

    C.Accum.fx[entity] = 0;
    C.Accum.fy[entity] = 0;
    C.Accum.fz[entity] = 0;
    C.Accum.tx[entity] = 0;
    C.Accum.ty[entity] = 0;
    C.Accum.tz[entity] = 0;

    const gravity = gravityAt(y);
    state.derived.gravity = gravity;
    C.Accum.fy[entity] -= mass * gravity;

    qRotate(tmp.bodyAxis, q, tmp.up);

    if (air.speed > 0.1) {
      // Angle of attack between the body axis and the airflow. A booster
      // descending engine-first meets the air at roughly 180°, so the sign of
      // the dot product is not the interesting part — the deviation from axial
      // flow is, and that is what drives the normal force.
      const cosAlpha = clamp((tmp.bodyAxis.x * air.vx + tmp.bodyAxis.y * air.vy + tmp.bodyAxis.z * air.vz) / air.speed, -1, 1);
      const sinAlpha2 = 1 - cosAlpha * cosAlpha;

      // Blend between the slender axial coefficient and the much larger
      // broadside one. A cylinder side-on has several times the drag it has
      // end-on, and that term is what punishes a loss of attitude control.
      const cd = params.dragAxial + (params.dragNormal - params.dragAxial) * sinAlpha2;
      const area = Math.PI * params.radius * params.radius;
      const magnitude = air.q * cd * area;
      state.derived.drag = magnitude;

      const invSpeed = 1 / air.speed;
      tmp.dragForce.x = -magnitude * air.vx * invSpeed;
      tmp.dragForce.y = -magnitude * air.vy * invSpeed;
      tmp.dragForce.z = -magnitude * air.vz * invSpeed;

      C.Accum.fx[entity] += tmp.dragForce.x;
      C.Accum.fy[entity] += tmp.dragForce.y;
      C.Accum.fz[entity] += tmp.dragForce.z;

      // Aerodynamic torque. The centre of pressure sits forward of the centre
      // of mass on a body falling engine-first, so the air pushes the vehicle
      // further off axis rather than back onto it. That instability is real, it
      // is why grid fins exist, and here it is what the controller must fight.
      qRotateInverse(tmp.dragBody, q, tmp.dragForce);
      tmp.lever.x = 0;
      tmp.lever.y = params.copOffset;
      tmp.lever.z = 0;
      v3cross(tmp.torque, tmp.lever, tmp.dragBody);
      C.Accum.tx[entity] += tmp.torque.x;
      C.Accum.ty[entity] += tmp.torque.y;
      C.Accum.tz[entity] += tmp.torque.z;
    } else {
      state.derived.drag = 0;
    }

    // Thrust.
    const throttle = C.Actuator.throttle[entity];
    const fuel = C.Mass.fuel[entity];
    if (throttle > 0 && fuel > 0) {
      const magnitude = throttle * params.engines * params.thrustPerEngine;
      state.derived.thrust = magnitude;

      const a = C.Actuator.gimbalA[entity];
      const b = C.Actuator.gimbalB[entity];
      tmp.thrustBody.x = Math.sin(a) * Math.cos(b);
      tmp.thrustBody.y = Math.cos(a) * Math.cos(b);
      tmp.thrustBody.z = Math.sin(b);
      const norm = v3length(tmp.thrustBody);
      const scale = magnitude / norm;
      tmp.thrustBody.x *= scale;
      tmp.thrustBody.y *= scale;
      tmp.thrustBody.z *= scale;

      qRotate(tmp.thrustWorld, q, tmp.thrustBody);
      C.Accum.fx[entity] += tmp.thrustWorld.x;
      C.Accum.fy[entity] += tmp.thrustWorld.y;
      C.Accum.fz[entity] += tmp.thrustWorld.z;

      tmp.lever.x = 0;
      tmp.lever.y = -params.length * 0.5;
      tmp.lever.z = 0;
      v3cross(tmp.torque, tmp.lever, tmp.thrustBody);
      C.Accum.tx[entity] += tmp.torque.x;
      C.Accum.ty[entity] += tmp.torque.y;
      C.Accum.tz[entity] += tmp.torque.z;

      // ṁ = F / (Isp · g₀) — the rocket equation's other half, and the reason
      // the vehicle's response changes over the burn.
      const flow = magnitude / (params.isp * G0);
      const remaining = fuel - flow * dt;
      applyMassProperties(ctx, state, remaining);

      if (remaining <= 0) {
        ctx.mark('warning', 'Propellant exhausted');
        ctx.print('Propellant exhausted — the vehicle is ballistic from here', 'warn');
      }
    } else {
      state.derived.thrust = 0;
      if (fuel <= 0) C.Actuator.throttle[entity] = 0;
    }

    // Fins and thrusters, plus manual roll about the long axis where the
    // gimbal has no authority at all.
    C.Accum.tx[entity] += C.Actuator.ctrlTx[entity];
    C.Accum.tz[entity] += C.Actuator.ctrlTz[entity];
    C.Accum.ty[entity] += C.Actuator.roll[entity] * params.rcsTorque;
  };

  // -- integrate ----------------------------------------------------------

  const integrate = (world, dt) => {
    if (state.touchdown) return;

    const invMass = 1 / C.Mass.mass[entity];

    // Semi-implicit (symplectic) Euler: velocity updates first, then position
    // advances using the *new* velocity. Explicit Euler — position from the old
    // velocity — pumps energy into every oscillation it touches; this variant
    // does not, at identical cost.
    const ax = C.Accum.fx[entity] * invMass;
    const ay = C.Accum.fy[entity] * invMass;
    const az = C.Accum.fz[entity] * invMass;
    // Load factor is what an accelerometer reads: everything except gravity.
    state.derived.acceleration = Math.hypot(ax, ay + state.derived.gravity, az);

    C.Velocity.vx[entity] += ax * dt;
    C.Velocity.vy[entity] += ay * dt;
    C.Velocity.vz[entity] += az * dt;

    C.Transform.x[entity] += C.Velocity.vx[entity] * dt;
    C.Transform.y[entity] += C.Velocity.vy[entity] * dt;
    C.Transform.z[entity] += C.Velocity.vz[entity] * dt;

    // Euler's equation in the body frame: I·ω̇ = τ − ω × (I·ω). The gyroscopic
    // term is what makes a spinning asymmetric body precess, and dropping it —
    // as plenty of game engines do — makes a tumbling stage behave as though it
    // were in a viscous fluid.
    const ixx = C.Mass.ixx[entity];
    const iyy = C.Mass.iyy[entity];
    const izz = C.Mass.izz[entity];
    const wx = C.Velocity.wx[entity];
    const wy = C.Velocity.wy[entity];
    const wz = C.Velocity.wz[entity];

    C.Velocity.wx[entity] += ((C.Accum.tx[entity] + (izz - iyy) * wy * wz) / ixx) * dt;
    C.Velocity.wy[entity] += ((C.Accum.ty[entity] + (ixx - izz) * wz * wx) / iyy) * dt;
    C.Velocity.wz[entity] += ((C.Accum.tz[entity] + (iyy - ixx) * wx * wy) / izz) * dt;

    tmp.omega.x = C.Velocity.wx[entity];
    tmp.omega.y = C.Velocity.wy[entity];
    tmp.omega.z = C.Velocity.wz[entity];

    const q = readQuat();
    qIntegrate(q, q, tmp.omega, dt);
    qnormalize(q);
    C.Transform.qx[entity] = q.x;
    C.Transform.qy[entity] = q.y;
    C.Transform.qz[entity] = q.z;
    C.Transform.qw[entity] = q.w;
  };

  // -- constrain: the ground ----------------------------------------------

  const constrain = (world, dt) => {
    if (state.touchdown) return;

    const contactHeight = params.padHeight + params.length * 0.5;
    if (C.Transform.y[entity] > contactHeight) return;

    // Touchdown ends the run. What happens to a booster after it arrives at
    // 40 m/s is a structures question, not a guidance one, and pretending to
    // simulate it would be pretending.
    const q = readQuat();
    qRotate(tmp.bodyAxis, q, tmp.up);

    state.touchdown = {
      time: ctx.loop.time,
      vertical: C.Velocity.vy[entity],
      lateral: Math.hypot(C.Velocity.vx[entity], C.Velocity.vz[entity]),
      tilt: Math.acos(clamp(tmp.bodyAxis.y, -1, 1)) * RAD,
      offset: Math.hypot(C.Transform.x[entity], C.Transform.z[entity]),
      fuel: C.Mass.fuel[entity],
    };

    C.Transform.y[entity] = contactHeight;
    C.Velocity.vx[entity] = 0;
    C.Velocity.vy[entity] = 0;
    C.Velocity.vz[entity] = 0;
    C.Velocity.wx[entity] = 0;
    C.Velocity.wy[entity] = 0;
    C.Velocity.wz[entity] = 0;
    C.Actuator.throttle[entity] = 0;

    const result = evaluateLanding(state.touchdown, params);
    state.phase = result.status === 'good' ? 'landed' : 'failed';
    ctx.mark(result.status === 'good' ? 'contact' : 'failure', result.headline);
    ctx.print(result.headline, result.status === 'good' ? 'good' : 'error');
    ctx.loop.pause();
  };

  // -- post: derived quantities and telemetry ------------------------------

  const post = (world, dt) => {
    const d = state.derived;
    const x = C.Transform.x[entity];
    const y = C.Transform.y[entity];
    const z = C.Transform.z[entity];

    d.altitude = y - params.padHeight - params.length * 0.5;
    d.vertical = C.Velocity.vy[entity];
    d.lateral = Math.hypot(C.Velocity.vx[entity], C.Velocity.vz[entity]);
    d.speed = Math.hypot(C.Velocity.vx[entity], C.Velocity.vy[entity], C.Velocity.vz[entity]);
    d.offset = Math.hypot(x, z);

    const q = readQuat();
    qRotate(tmp.bodyAxis, q, tmp.up);
    d.tilt = Math.acos(clamp(tmp.bodyAxis.y, -1, 1)) * RAD;

    const mass = C.Mass.mass[entity];
    d.twr = d.thrust / (mass * d.gravity);

    // Burn time left at the current flow, and the Δv that buys. Both are
    // numbers an operator actually watches.
    const flow = d.thrust / (params.isp * G0);
    d.burnTimeLeft = flow > 1e-6 ? C.Mass.fuel[entity] / flow : Infinity;
    d.deltaVLeft = params.isp * G0 * Math.log(mass / Math.max(1, C.Mass.dry[entity]));

    ctx.recorder.writeMany({
      altitude: d.altitude,
      vertical: d.vertical,
      lateral: d.lateral,
      speed: d.speed,
      throttle: C.Actuator.throttle[entity],
      thrust: d.thrust / 1000,
      mass,
      fuel: C.Mass.fuel[entity],
      tilt: d.tilt,
      attitudeError: d.attitudeError,
      gimbalPitch: C.Actuator.gimbalB[entity] * RAD,
      gimbalYaw: C.Actuator.gimbalA[entity] * RAD,
      dynamicPressure: d.dynamicPressure / 1000,
      acceleration: d.acceleration / G0,
      offset: d.offset,
      targetVertical: d.targetVertical,
    });
  };

  return { input, sense, control, forces, integrate, constrain, post };
}

// The landing criteria, written once and read by both the verdict card and the
// console. Each is checked separately so a failure says which limit was missed
// rather than just "crashed".
export function evaluateLanding(touchdown, params) {
  const checks = [
    { label: 'Vertical speed', value: Math.abs(touchdown.vertical), limit: params.limitVertical, unit: 'm/s' },
    { label: 'Lateral speed', value: touchdown.lateral, limit: params.limitLateral, unit: 'm/s' },
    { label: 'Tilt', value: touchdown.tilt, limit: params.limitTilt, unit: '°' },
    { label: 'Miss distance', value: touchdown.offset, limit: params.limitOffset, unit: 'm' },
  ];

  const failures = checks.filter((check) => check.value > check.limit);
  const status = failures.length === 0 ? 'good' : failures.length === 1 ? 'warning' : 'critical';

  const headline =
    failures.length === 0
      ? 'Landed within every limit'
      : failures.length === 1
        ? `Hard landing — ${failures[0].label.toLowerCase()} over limit`
        : `Vehicle lost — ${failures.length} limits exceeded`;

  return {
    status,
    headline,
    checks,
    failures,
    rows: [
      ...checks.map((check) => ({
        label: check.label,
        value: check.value,
        unit: check.unit,
        precision: 2,
        status: check.value > check.limit ? 'critical' : 'good',
      })),
      { label: 'Propellant left', value: touchdown.fuel, unit: 'kg', precision: 0 },
      { label: 'Flight time', value: touchdown.time, unit: 's', precision: 1 },
    ],
    criteria:
      `Limits: ${params.limitVertical} m/s vertical, ${params.limitLateral} m/s lateral, ` +
      `${params.limitTilt}° tilt, ${params.limitOffset} m from the pad centre.`,
  };
}
