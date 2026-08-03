// Powered Descent Lab.
//
// Three files, three jobs: spec.js declares the workspace, physics.js flies the
// vehicle without knowing anything can see it, view.js draws it without knowing
// what a PID is. This file is the only place the three meet.

import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createRocket, makeSystems, evaluateLanding } from './physics.js';
import { createRocketView } from './view.js';
import { RAD } from '../../engine/math.js';

export default definePlugin({
  id: 'rocket-landing',
  title: 'Powered Descent Lab',
  subtitle: 'Propulsive landing · 6-DOF · gimballed thrust',
  summary:
    'A booster returning under its own engine, with the guidance loop, the propellant budget and the aerodynamics all on screen.',

  capacity: 64,
  defaultSeed: 1337,
  camera: { position: [110, 55, 110], target: [0, 40, 0], far: 40000 },

  params,
  channels,
  graphs,
  actions,

  // -----------------------------------------------------------------------

  setup(ctx) {
    const state = createRocket(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;

    // The autopilot starts engaged. Toggling it is a recorded input like any
    // other, so a run flown half on autopilot and half by hand still replays.
    ctx.sim.actions.set('autopilot', 1);

    ctx.loop.addSystem('input', systems.input, 'rocket:input');
    ctx.loop.addSystem('sense', systems.sense, 'rocket:wind');
    ctx.loop.addSystem('control', syncGains(ctx, state), 'rocket:gains');
    ctx.loop.addSystem('control', systems.control, 'rocket:guidance');
    ctx.loop.addSystem('forces', systems.forces, 'rocket:forces');
    ctx.loop.addSystem('integrate', systems.integrate, 'rocket:integrate');
    ctx.loop.addSystem('constrain', systems.constrain, 'rocket:ground');
    ctx.loop.addSystem('post', systems.post, 'rocket:telemetry');

    const view = createRocketView(ctx, state);
    ctx.loop.onRender((alpha) => view.render(alpha));

    return () => view.dispose();
  },

  // -----------------------------------------------------------------------

  hierarchy(ctx) {
    const state = ctx.state;
    if (!state) return [];
    const { C, entity } = state;
    const d = state.derived;

    const phaseStatus =
      state.phase === 'landed' ? 'good' : state.phase === 'failed' ? 'critical' : 'active';
    const gimballing =
      Math.abs(C.Actuator.gimbalA[entity]) > 0.001 || Math.abs(C.Actuator.gimbalB[entity]) > 0.001;

    return [
      {
        label: 'Booster',
        status: phaseStatus,
        detail: state.phase,
        children: [
          { label: 'Rigid body', status: 'active', detail: `${(C.Mass.mass[entity] / 1000).toFixed(1)} t` },
          {
            label: `Engines ×${ctx.params.engines}`,
            status: d.thrust > 0 ? 'good' : 'idle',
            detail: `${(C.Actuator.throttle[entity] * 100).toFixed(0)}%`,
          },
          {
            label: 'Gimbal',
            status: gimballing ? 'active' : 'idle',
            detail: `${(C.Actuator.gimbalB[entity] * RAD).toFixed(1)}° / ${(C.Actuator.gimbalA[entity] * RAD).toFixed(1)}°`,
          },
          {
            label: 'Propellant tank',
            status: C.Mass.fuel[entity] > 0 ? 'active' : 'critical',
            detail: `${C.Mass.fuel[entity].toFixed(0)} kg`,
          },
          {
            label: 'Grid fins',
            status: state.att.finShare > 0.5 ? 'good' : 'idle',
            detail: `${(state.att.finShare * 100).toFixed(0)}% of authority`,
          },
        ],
      },
      {
        label: 'Environment',
        status: 'idle',
        children: [
          { label: 'Landing pad', status: 'good', detail: '0, 0' },
          { label: 'Atmosphere', status: 'active', detail: `${(d.dynamicPressure / 1000).toFixed(2)} kPa` },
          { label: 'Wind', status: 'active', detail: `${(ctx.params.windMean + state.wind.x).toFixed(1)} m/s` },
        ],
      },
      {
        label: 'Guidance',
        status: d.autopilot ? 'good' : 'warning',
        detail: d.autopilot ? 'auto' : 'manual',
        children: [
          {
            label: 'Descent PID',
            status: state.pids.descent.saturated ? 'warning' : 'active',
            detail: state.pids.descent.output.toFixed(2),
          },
          {
            label: 'Attitude PD',
            status: 'active',
            detail: `${state.att.alphaX.toFixed(3)} / ${state.att.alphaZ.toFixed(3)}`,
          },
          {
            label: 'Gimbal allocation',
            status: state.att.gimbalSaturated ? 'warning' : 'active',
            detail: `${(state.att.tauGimbal / 1000).toFixed(0)} kN·m`,
          },
          {
            label: 'Fins + thrusters',
            status: 'active',
            detail: `${(state.att.tauSurface / 1000).toFixed(0)} kN·m`,
          },
        ],
      },
    ];
  },

  hud(ctx) {
    const state = ctx.state;
    if (!state) return [];
    const d = state.derived;
    const fuel = state.C.Mass.fuel[state.entity];
    return [
      { label: 'Altitude', value: d.altitude, unit: 'm', precision: 0 },
      {
        label: 'Vertical', value: d.vertical, unit: 'm/s', precision: 1,
        status: d.altitude < 60 && d.vertical < -ctx.params.limitVertical ? 'critical' : null,
      },
      { label: 'Lateral', value: d.lateral, unit: 'm/s', precision: 1 },
      { label: 'Throttle', value: state.C.Actuator.throttle[state.entity] * 100, unit: '%', precision: 0 },
      { label: 'Propellant', value: fuel, unit: 'kg', precision: 0, status: fuel < 400 ? 'warning' : null },
      {
        label: 'Tilt', value: d.tilt, unit: '°', precision: 1,
        status: d.tilt > ctx.params.maxTilt + 5 ? 'warning' : null,
      },
      { label: 'Miss', value: d.offset, unit: 'm', precision: 1 },
    ];
  },

  inspect(ctx) {
    const state = ctx.state;
    if (!state) return [];
    const d = state.derived;
    const { C, entity } = state;
    const pid = state.pids.descent.terms();

    return [
      {
        title: 'Flight state',
        rows: [
          { label: 'Phase', value: state.phase },
          { label: 'Mode', value: d.autopilot ? 'Autopilot' : 'Manual', status: d.autopilot ? 'good' : 'warning' },
          { label: 'Altitude', value: d.altitude, unit: 'm', precision: 1 },
          { label: 'Vertical speed', value: d.vertical, unit: 'm/s' },
          { label: 'Profile target', value: d.targetVertical, unit: 'm/s' },
          { label: 'Lateral speed', value: d.lateral, unit: 'm/s' },
          { label: 'Miss distance', value: d.offset, unit: 'm' },
          { label: 'Tilt', value: d.tilt, unit: '°' },
          { label: 'Pointing error', value: d.attitudeError, unit: '°' },
        ],
      },
      {
        title: 'Propulsion',
        rows: [
          { label: 'Thrust', value: d.thrust / 1000, unit: 'kN', precision: 1 },
          { label: 'Throttle', value: C.Actuator.throttle[entity] * 100, unit: '%', precision: 1 },
          {
            label: 'Thrust / weight', value: d.twr, precision: 2,
            status: d.thrust > 0 && d.twr < 1 ? 'warning' : null,
          },
          { label: 'Propellant', value: C.Mass.fuel[entity], unit: 'kg', precision: 0 },
          {
            label: 'Burn time left',
            value: Number.isFinite(d.burnTimeLeft) ? d.burnTimeLeft : '—',
            unit: 's', precision: 1,
          },
          { label: 'Δv remaining', value: d.deltaVLeft, unit: 'm/s', precision: 0 },
          { label: 'Total mass', value: C.Mass.mass[entity], unit: 'kg', precision: 0 },
        ],
      },
      {
        title: 'Descent controller',
        rows: [
          { label: 'P term', value: pid.p, precision: 3 },
          { label: 'I term', value: pid.i, precision: 3 },
          { label: 'D term', value: pid.d, precision: 3 },
          { label: 'Output', value: pid.output, unit: 'm/s²', precision: 2 },
          { label: 'Saturated', value: pid.saturated ? 'yes' : 'no', status: pid.saturated ? 'warning' : null },
        ],
      },
      {
        title: 'Environment',
        rows: [
          { label: 'Local gravity', value: d.gravity, unit: 'm/s²', precision: 4 },
          { label: 'Dynamic pressure', value: d.dynamicPressure / 1000, unit: 'kPa', precision: 2 },
          { label: 'Drag', value: d.drag / 1000, unit: 'kN', precision: 2 },
          { label: 'Mach', value: d.mach, precision: 2 },
          { label: 'Wind (X)', value: ctx.params.windMean + state.wind.x, unit: 'm/s' },
          { label: 'Load factor', value: d.acceleration / 9.80665, unit: 'g', precision: 2 },
        ],
      },
    ];
  },

  verdict(ctx) {
    const state = ctx.state;
    if (!state?.touchdown) return null;
    return evaluateLanding(state.touchdown, ctx.params);
  },

  explain() {
    return [
      {
        title: 'Why the engine lights when it does',
        body:
          'The autopilot flies a speed-versus-altitude curve, <code>v = −(v_td + √(2·a·h))</code> — the ' +
          'constant-deceleration solution solved for speed. Above that curve the vehicle can still stop with the ' +
          'deceleration it has; below it, it cannot. So the curve is both the target and the ignition trigger: the ' +
          'engine lights the instant the vehicle crosses it, which is what a suicide burn actually is. Lighting ' +
          'early wastes propellant holding the vehicle up; lighting late means arriving with speed left over.',
      },
      {
        title: 'Why the gains are divided by thrust and inertia',
        body:
          'A booster burns off most of its mass on the way down. The same gimbal deflection produces a torque that ' +
          'grows with thrust and an angular acceleration that grows again as inertia falls, so a fixed-gain attitude ' +
          'loop that is calm at ignition is oscillating by touchdown. The inner loop divides its command by the ' +
          'authority it currently has, <code>(L/2 · T) / I</code>, which holds the loop gain roughly constant across ' +
          'the burn. Move <em>Authority normalisation</em> well off its default to watch the compensation break down.',
      },
      {
        title: 'Why the vehicle wants to fall sideways',
        body:
          'The centre of pressure sits above the centre of mass on a body descending engine-first, so aerodynamic ' +
          'force acts on a lever arm that pushes the vehicle <em>further</em> off axis rather than back onto it. ' +
          'That is a genuinely unstable plant, and it is why real boosters carry grid fins. Set <em>Centre of ' +
          'pressure offset</em> negative to make the airframe self-righting, and watch the gimbal activity collapse.',
      },
      {
        title: 'Why no graph here has two y-axes',
        body:
          'Altitude and vertical speed are the two numbers everyone wants side by side, and plotting them on twinned ' +
          'axes is the most misleading thing a telemetry display can do: where the two scales get pinned relative to ' +
          'each other is arbitrary, so the crossings the reader sees are artefacts of the layout. They get two cards ' +
          'on a shared time window instead. The plugin loader refuses to build a graph whose channels disagree on ' +
          'units, so this is enforced rather than remembered.',
      },
      {
        title: 'What reproducible means here',
        body:
          'Physics advances on a fixed 1/120 s step regardless of frame rate, every random draw comes from a seeded ' +
          'generator, and every control input is journaled against the tick it landed on. Scrubbing the timeline ' +
          'restores the nearest world snapshot and re-simulates forward, so the state you land on is the state the ' +
          'run actually had rather than an interpolation of what was drawn. The share link carries the seed and the ' +
          'parameters and nothing else, because that is genuinely all a run is.',
      },
    ];
  },
});

// Gains are editable while flying, so the descent PID is refreshed from the
// parameters each tick. Rebuilding the controller instead would discard the
// integrator state and put a step into the output every time a slider moved.
// The attitude law holds no state, so it just reads the parameters directly.
function syncGains(ctx, state) {
  return () => {
    const p = ctx.params;
    state.pids.descent.set(p.descentKp, p.descentKi, p.descentKd);
  };
}
