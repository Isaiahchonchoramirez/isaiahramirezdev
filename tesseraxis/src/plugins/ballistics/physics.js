// Exterior ballistics, terminal mechanics, and intercept guidance.
//
// Three experiments that share one projectile. All of it is textbook physics:
// a 3-DOF point mass through a standard atmosphere, a Poncelet penetration
// law, and proportional navigation. Nothing here describes how to build
// anything — the subject is trajectories, energy, and control laws.

import { clamp, DEG } from '../../engine/math.js';

const G = 9.80665;
const EARTH_RATE = 7.2921159e-5; // rad/s
const SEA_LEVEL_DENSITY = 1.225; // kg/m³

// World axes: x East, y Up, z North.

/** International Standard Atmosphere, troposphere only. */
export function atmosphere(altitude) {
  const h = clamp(altitude, 0, 20000);
  const temperature = 288.15 - 0.0065 * h;
  const density = SEA_LEVEL_DENSITY * Math.pow(1 - 2.25577e-5 * h, 4.25588);
  // a = sqrt(gamma R T); 20.0468 folds the constants together.
  const speedOfSound = 20.0468 * Math.sqrt(temperature);
  return { density, speedOfSound, temperature };
}

/**
 * Drag coefficient against Mach number, shaped like a standard G1 curve:
 * roughly flat subsonic, a sharp rise through the transonic region as a shock
 * forms on the nose, then a slow decay supersonic. The transonic hump is the
 * whole reason a projectile slowing through Mach 1 loses energy so fast.
 */
const CD_TABLE = [
  [0.0, 0.225], [0.6, 0.23], [0.8, 0.26], [0.9, 0.33], [0.95, 0.42],
  [1.0, 0.52], [1.05, 0.565], [1.2, 0.545], [1.5, 0.48], [2.0, 0.41],
  [2.5, 0.36], [3.0, 0.325], [4.0, 0.29], [5.0, 0.27],
];

export function dragCoefficient(mach) {
  if (mach <= CD_TABLE[0][0]) return CD_TABLE[0][1];
  const last = CD_TABLE[CD_TABLE.length - 1];
  if (mach >= last[0]) return last[1];
  for (let i = 1; i < CD_TABLE.length; i++) {
    const [m1, c1] = CD_TABLE[i];
    if (mach <= m1) {
      const [m0, c0] = CD_TABLE[i - 1];
      return c0 + (c1 - c0) * (mach - m0) / (m1 - m0);
    }
  }
  return last[1];
}

/**
 * Poncelet penetration into a semi-infinite target.
 *
 * The target resists with two terms: a constant strength S, and an inertial
 * term ρv² for the material that has to be shoved out of the way. Integrating
 * m·dv/dx = −A(S + ρv²) gives the closed form below.
 *
 * Both terms are needed. Strength alone predicts metres of penetration into
 * soft targets, because nothing stops a fast projectile once the yield stress
 * is small — in reality what stops it there is the inertia of the material
 * being displaced, which is why the inertial term dominates in gelatin and
 * the strength term dominates in armour.
 */
export function penetrationDepth({ mass, area, velocity, targetStrength, targetDensity }) {
  if (velocity <= 0) return 0;
  const inertial = targetDensity * velocity * velocity;
  return (mass / (2 * area * targetDensity)) * Math.log(1 + inertial / targetStrength);
}

// Target materials: resistance strength in Pa and density in kg/m³.
export const TARGETS = {
  ballisticGel: { label: 'Ballistic gelatin', strength: 0.4e6, density: 1030 },
  pine: { label: 'Pine board', strength: 3e6, density: 500 },
  concrete: { label: 'Concrete', strength: 130e6, density: 2400 },
  aluminium: { label: 'Aluminium 6061', strength: 400e6, density: 2700 },
  mildSteel: { label: 'Mild steel', strength: 1.0e9, density: 7850 },
  armourSteel: { label: 'RHA steel', strength: 2.4e9, density: 7850 },
};

export function createBallistics(ctx) {
  const { world, params } = ctx;
  const Body = world.defineComponent('Projectile', {
    x: 'f64', y: 'f64', z: 'f64', vx: 'f64', vy: 'f64', vz: 'f64',
  });

  const projectile = world.createEntity('Projectile');
  const elevation = params.elevation * DEG;
  const azimuth = params.azimuth * DEG;
  const v0 = params.muzzleVelocity;
  world.add(projectile, Body, {
    x: 0, y: params.launchHeight, z: 0,
    vx: v0 * Math.cos(elevation) * Math.sin(azimuth),
    vy: v0 * Math.sin(elevation),
    vz: v0 * Math.cos(elevation) * Math.cos(azimuth),
  });

  let target = null;
  if (params.mode === 'intercept') {
    target = world.createEntity('Target');
    // Crossing geometry: the target runs across the interceptor's nose, which
    // is the case that actually exercises a guidance law. A pure tail chase
    // needs no lead at all.
    const tx = params.targetRange * 0.35, ty = params.targetAltitude, tz = params.targetRange;
    world.add(target, Body, { x: tx, y: ty, z: tz, vx: -params.targetSpeed, vy: 0, vz: 0 });

    // Launch on a lead-pursuit heading rather than the elevation and azimuth
    // used by the other two modes. Without it the interceptor starts pointing
    // somewhere unrelated and guidance spends the whole flight recovering, so
    // every run misses by hundreds of metres and the gain sweep shows nothing.
    // The residual error PN then has to remove is real: gravity and drag are
    // not in this lead solution.
    let flight = Math.hypot(tx, ty - params.launchHeight, tz) / v0;
    for (let i = 0; i < 4; i++) {
      const ax = tx - params.targetSpeed * flight, ay = ty, az = tz;
      flight = Math.hypot(ax, ay - params.launchHeight, az) / v0;
    }
    const aimX = tx - params.targetSpeed * flight;
    const aimY = ty - params.launchHeight;
    const aimZ = tz;
    const norm = Math.max(1e-6, Math.hypot(aimX, aimY, aimZ));
    Body.vx[projectile] = v0 * aimX / norm;
    Body.vy[projectile] = v0 * aimY / norm;
    Body.vz[projectile] = v0 * aimZ / norm;
  }

  const area = Math.PI * Math.pow(params.calibre / 2000, 2); // calibre is in mm
  // Terminal tests place the plate on the bore line at the selected range.
  // Gravity and drag still create a real vertical miss; the plate is not a
  // magic infinite plane that registers a hit anywhere in the sky.
  const targetY = params.launchHeight + params.targetRange * Math.tan(elevation);
  const state = {
    Body, projectile, target, area,
    mode: params.mode,
    phase: 'flight',
    done: false,
    time: 0,
    apex: 0, groundRange: 0, maxMach: 0,
    impact: null, targetY, targetPassed: false,
    terminal: null,
    guidance: {
      lateral: 0, peakLateral: 0, closing: 0, losRate: 0, missDistance: Infinity,
      separation: Infinity, saturated: false, everSaturated: false, intercepted: false,
    },
    metrics: {
      altitude: params.launchHeight, downrange: 0, speed: v0, mach: 0, energy: 0,
      drop: 0, drift: 0, dragForce: 0, flightTime: 0,
      lateralDemand: 0, closingSpeed: 0, separation: 0, losRate: 0,
      penetration: 0, residualVelocity: 0,
    },
  };
  return state;
}

export function makeSystems(ctx, state) {
  const { Body: B, projectile: p } = state;

  const speedOf = (e) => Math.hypot(B.vx[e], B.vy[e], B.vz[e]);

  /** Aerodynamic drag plus gravity, Coriolis and a spin-drift approximation. */
  function accelerationOn(e, params) {
    const speed = speedOf(e);
    const air = atmosphere(B.y[e]);
    const mach = speed / air.speedOfSound;
    const cd = dragCoefficient(mach) * params.dragScale;

    // Drag opposes velocity: magnitude ½ρv²CdA, direction −v̂.
    const dragMagnitude = 0.5 * air.density * speed * speed * cd * state.area;
    const invSpeed = speed > 1e-6 ? 1 / speed : 0;
    let ax = -dragMagnitude * B.vx[e] * invSpeed / params.mass;
    let ay = -dragMagnitude * B.vy[e] * invSpeed / params.mass - G;
    let az = -dragMagnitude * B.vz[e] * invSpeed / params.mass;

    // Wind acts by changing the air the projectile sees, so it enters through
    // the drag term rather than as a force of its own. Recomputed here as a
    // correction using the relative velocity.
    if (params.windSpeed !== 0) {
      const wind = params.windSpeed;
      const heading = params.windDirection * DEG;
      const wx = wind * Math.sin(heading), wz = wind * Math.cos(heading);
      const rx = B.vx[e] - wx, ry = B.vy[e], rz = B.vz[e] - wz;
      const rel = Math.hypot(rx, ry, rz);
      if (rel > 1e-6) {
        const relDrag = 0.5 * air.density * rel * rel * dragCoefficient(rel / air.speedOfSound) * params.dragScale * state.area;
        ax = -relDrag * rx / rel / params.mass;
        ay = -relDrag * ry / rel / params.mass - G;
        az = -relDrag * rz / rel / params.mass;
      }
    }

    if (params.coriolis) {
      // a = −2Ω × v, with Ω expressed in the local East-Up-North frame.
      const lat = params.latitude * DEG;
      const ox = 0, oy = EARTH_RATE * Math.sin(lat), oz = EARTH_RATE * Math.cos(lat);
      ax += -2 * (oy * B.vz[e] - oz * B.vy[e]);
      ay += -2 * (oz * B.vx[e] - ox * B.vz[e]);
      az += -2 * (ox * B.vy[e] - oy * B.vx[e]);
    }

    state.metrics.dragForce = dragMagnitude;
    state.metrics.mach = mach;
    state.maxMach = Math.max(state.maxMach, mach);
    return { ax, ay, az };
  }

  function integrate(world, dt) {
    if (state.done) return;
    const params = ctx.params;
    state.time += dt;

    const a = accelerationOn(p, params);
    B.vx[p] += a.ax * dt; B.vy[p] += a.ay * dt; B.vz[p] += a.az * dt;

    if (state.mode === 'intercept') guide(dt, params);

    B.x[p] += B.vx[p] * dt; B.y[p] += B.vy[p] * dt; B.z[p] += B.vz[p] * dt;

    // Spin drift: a gyroscopically stabilised projectile drifts slowly in the
    // direction of rifling twist. The real mechanism is precession of the
    // spin axis; this is the standard empirical approximation, proportional
    // to the square of flight time.
    if (params.spinDrift) {
      state.metrics.drift = params.twistDirection * 0.0086 * Math.pow(state.time, 2) * params.muzzleVelocity / 800;
      B.x[p] += params.twistDirection * 0.0172 * state.time * dt * params.muzzleVelocity / 800;
    }

    if (state.target !== null) {
      const t = state.target;
      B.x[t] += B.vx[t] * dt; B.y[t] += B.vy[t] * dt; B.z[t] += B.vz[t] * dt;
    }

    state.apex = Math.max(state.apex, B.y[p]);
  }

  /**
   * Proportional navigation.
   *
   * Commanded lateral acceleration is N times the closing speed times the
   * rate at which the line of sight rotates. Holding the line of sight still
   * is the whole idea: if the bearing to the target is not changing, the two
   * are on a collision course, whatever either of them is doing.
   */
  function guide(dt, params) {
    const t = state.target;
    if (t === null) return;
    const g = state.guidance;

    const rx = B.x[t] - B.x[p], ry = B.y[t] - B.y[p], rz = B.z[t] - B.z[p];
    const range = Math.hypot(rx, ry, rz);
    const vx = B.vx[t] - B.vx[p], vy = B.vy[t] - B.vy[p], vz = B.vz[t] - B.vz[p];

    // Closing speed is the rate the range shrinks: −(r·v)/|r|.
    const closing = -(rx * vx + ry * vy + rz * vz) / Math.max(1e-6, range);
    g.closing = closing;
    g.separation = range;
    g.missDistance = Math.min(g.missDistance, range);

    // ω = (r × v) / (r·r) is the line-of-sight rotation rate vector.
    const inv = 1 / Math.max(1e-9, range * range);
    const ox = (ry * vz - rz * vy) * inv;
    const oy = (rz * vx - rx * vz) * inv;
    const oz = (rx * vy - ry * vx) * inv;
    g.losRate = Math.hypot(ox, oy, oz);

    // a = N · Vc · (ω × v̂): perpendicular to the flight path by construction,
    // so the guidance turns the projectile without adding speed.
    const speed = Math.max(1e-6, speedOf(p));
    const ux = B.vx[p] / speed, uy = B.vy[p] / speed, uz = B.vz[p] / speed;
    let ax = params.navigationGain * closing * (oy * uz - oz * uy);
    let ay = params.navigationGain * closing * (oz * ux - ox * uz);
    let az = params.navigationGain * closing * (ox * uy - oy * ux);

    // No airframe can pull unlimited g. Saturation is where a guidance law
    // stops being able to correct, and it is usually what sets miss distance.
    const demand = Math.hypot(ax, ay, az);
    const limit = params.lateralLimit * G;
    g.saturated = demand > limit;
    if (g.saturated) g.everSaturated = true;
    if (g.saturated && demand > 1e-9) {
      const scale = limit / demand;
      ax *= scale; ay *= scale; az *= scale;
    }
    g.lateral = Math.min(demand, limit) / G;
    g.peakLateral = Math.max(g.peakLateral, g.lateral);

    B.vx[p] += ax * dt; B.vy[p] += ay * dt; B.vz[p] += az * dt;
  }

  function constrain() {
    if (state.done) return;
    const params = ctx.params;

    if (state.mode === 'intercept') {
      const g = state.guidance;
      // Once the range starts growing again the closest approach is behind
      // us, and that closest approach is the miss distance.
      if (g.closing < 0 && state.time > 0.05) {
        g.intercepted = g.missDistance <= params.lethalRadius;
        state.done = true;
        state.phase = g.intercepted ? 'intercepted' : 'missed';
        ctx.mark('experiment',
          `${g.intercepted ? 'Intercept' : 'Miss'} · closest approach ${g.missDistance.toFixed(2)} m at ${state.time.toFixed(2)} s`);
        ctx.loop.pause();
      }
      return;
    }

    // Ground plane, or the target plate in terminal mode.
    const targetPlane = state.mode === 'terminal' ? params.targetRange : Infinity;
    const crossedPlate = state.mode === 'terminal' && !state.targetPassed && B.z[p] >= targetPlane;
    // The visible plate is 6 × 6 m. This is intentionally a generous
    // instrumented test target, but unlike the previous infinite plane it can
    // actually be missed in elevation or windage.
    const hitPlate = crossedPlate && Math.abs(B.y[p] - state.targetY) <= 3 && Math.abs(B.x[p]) <= 3;
    if (crossedPlate) {
      state.targetPassed = true;
      if (!hitPlate) ctx.mark('experiment', `Target missed · offset ${Math.hypot(B.x[p], B.y[p] - state.targetY).toFixed(2)} m`);
    }

    if (hitPlate || B.y[p] <= 0) {
      const speed = speedOf(p);
      state.groundRange = Math.hypot(B.x[p], B.z[p]);
      state.impact = {
        speed,
        energy: 0.5 * params.mass * speed * speed,
        time: state.time,
        range: state.groundRange,
        drift: B.x[p],
        angle: Math.atan2(-B.vy[p], Math.hypot(B.vx[p], B.vz[p])) / DEG,
      };

      if (hitPlate) terminalEffect(params, speed);
      else state.phase = state.mode === 'terminal' && state.targetPassed ? 'target-missed' : 'impact';

      state.done = true;
      ctx.mark('experiment', state.mode === 'terminal'
        ? `Plate struck at ${speed.toFixed(0)} m/s`
        : `Impact at ${state.groundRange.toFixed(1)} m after ${state.time.toFixed(2)} s`);
      ctx.loop.pause();
    }
  }

  /** What happens when the projectile reaches the plate. */
  function terminalEffect(params, speed) {
    const material = TARGETS[params.targetMaterial] ?? TARGETS.mildSteel;
    const obliquity = params.obliquity;

    // At high obliquity a projectile glances rather than digs in. The critical
    // angle rises with sectional density — a long, dense penetrator bites
    // where a light one skips.
    const sectionalDensity = params.mass / state.area; // kg/m²
    const criticalAngle = clamp(52 + 12 * Math.log10(Math.max(1, sectionalDensity / 50)), 45, 82);
    const ricochet = obliquity > criticalAngle;

    // Only the component normal to the plate does the penetrating; the rest
    // carries the projectile along the surface.
    const normalSpeed = speed * Math.cos(obliquity * DEG);
    const depth = ricochet ? 0 : penetrationDepth({
      mass: params.mass, area: state.area, velocity: normalSpeed,
      targetStrength: material.strength, targetDensity: material.density,
    });

    // Line-of-sight thickness through a plate struck at an angle is greater
    // than the plate's own thickness by 1/cos(obliquity).
    const lineOfSight = (params.plateThickness / 1000) / Math.max(0.08, Math.cos(obliquity * DEG));
    const perforates = !ricochet && depth > lineOfSight;

    // Residual velocity after perforation, from the energy left over.
    const energy = 0.5 * params.mass * normalSpeed * normalSpeed;
    const absorbed = Math.min(energy, material.strength * state.area * lineOfSight);
    const residual = perforates ? Math.sqrt(Math.max(0, 2 * (energy - absorbed) / params.mass)) : 0;

    state.terminal = {
      material: material.label, ricochet, perforates,
      depth, lineOfSight, criticalAngle, obliquity,
      sectionalDensity, energy, absorbed, residual,
      impactSpeed: speed, normalSpeed,
    };
    state.phase = ricochet ? 'ricochet' : perforates ? 'perforated' : 'stopped';
    state.metrics.penetration = depth;
    state.metrics.residualVelocity = residual;
  }

  function post() {
    const m = state.metrics, params = ctx.params;
    m.altitude = B.y[p];
    m.downrange = Math.hypot(B.x[p], B.z[p]);
    m.speed = speedOf(p);
    m.energy = 0.5 * params.mass * m.speed * m.speed / 1000; // kJ
    m.flightTime = state.time;
    m.drop = params.launchHeight - B.y[p];
    if (!params.spinDrift) m.drift = B.x[p];

    const g = state.guidance;
    m.lateralDemand = g.lateral;
    m.closingSpeed = g.closing;
    m.separation = Number.isFinite(g.separation) ? g.separation : 0;
    m.losRate = g.losRate;

    ctx.recorder.writeMany(m);
  }

  return { integrate, constrain, post };
}
