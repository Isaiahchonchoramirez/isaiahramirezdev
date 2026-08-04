import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createVehicle, makeSystems } from './physics.js';
import { createVehicleView } from './view.js';

function crashSection(ctx) {
  const c = ctx.state.crash;
  return { title: 'Crash test', rows: [
    { label: 'Phase', value: ctx.state.phase },
    { label: 'Crush', value: c.maxCrush, unit: 'm', precision: 3 },
    { label: 'Crumple zone used', value: Math.min(100, c.maxCrush / ctx.params.crushLength * 100), unit: '%', precision: 0,
      status: c.bottomedOut ? 'critical' : 'good' },
    { label: 'Peak vehicle', value: c.peakDecel, unit: 'g', precision: 1 },
    { label: 'Peak occupant', value: c.occupantPeak, unit: 'g', precision: 1,
      status: c.occupantPeak > 60 ? 'critical' : c.occupantPeak > 40 ? 'warning' : 'good' },
    { label: 'Occupant excursion', value: c.occupantMaxRel, unit: 'm', precision: 3,
      status: c.struckInterior ? 'critical' : 'good' },
    { label: 'Energy absorbed', value: c.energy / 1000, unit: 'kJ', precision: 1 },
  ] };
}

export default definePlugin({
  id: 'vehicle-dynamics', title: 'Vehicle Dynamics Lab', subtitle: 'Tires · suspension · autonomy · crash physics',
  summary: 'A transparent planar vehicle model for studying tire saturation, load transfer, body control, braking, weather, and autonomous path tracking.',
  capacity: 32, defaultSeed: 314159, camera: { position: [18, 13, 18], target: [0, 1, 0], far: 1500 },
  params, channels, graphs, actions,
  setup(ctx) {
    const state = createVehicle(ctx), systems = makeSystems(ctx, state); ctx.state = state;
    ctx.loop.addSystem('input', systems.input, 'vehicle:driver');
    ctx.loop.addSystem('control', systems.control, 'vehicle:autonomy');
    ctx.loop.addSystem('forces', systems.forces, 'vehicle:tires');
    ctx.loop.addSystem('integrate', systems.integrate, 'vehicle:body');
    ctx.loop.addSystem('constrain', systems.constrain, 'vehicle:collisions');
    ctx.loop.addSystem('post', systems.post, 'vehicle:telemetry');
    if (ctx.viewport) { const view = createVehicleView(ctx, state); ctx.loop.onRender(() => view.render()); return () => view.dispose(); }
    return () => {};
  },
  hierarchy(ctx) {
    const s = ctx.state, m = s.metrics, d = s.damage;
    return [{ label: 'Test vehicle', status: d.immobilized ? 'critical' : s.collisions ? 'warning' : 'good', detail: s.phase, children: [
      { label: 'Structure', status: d.integrity < 40 ? 'critical' : d.integrity < 75 ? 'warning' : 'good', detail: `${d.integrity.toFixed(0)}% integrity` },
      { label: 'Powertrain', status: d.powertrainFailed ? 'critical' : 'active', detail: d.powertrainFailed ? 'failed' : `${(s.Vehicle.throttle[s.entity] * 100).toFixed(0)}% throttle` },
      { label: 'Front axle', status: m.tireUseFront > 95 ? 'warning' : 'active', detail: `${m.tireUseFront.toFixed(0)}% friction` },
      { label: 'Rear axle', status: m.tireUseRear > 95 ? 'warning' : 'active', detail: `${m.tireUseRear.toFixed(0)}% friction` },
      { label: 'Suspension', status: d.wheelLoss ? 'critical' : d.suspension > 35 ? 'warning' : 'active', detail: d.wheelLoss ? `${d.wheelLoss} wheel lost` : `${m.roll.toFixed(1)}° roll` },
      { label: 'Autonomous driver', status: s.autopilot ? 'good' : 'idle', detail: s.autopilot ? 'engaged' : 'manual' },
    ] }, { label: 'Test circuit', status: 'idle', children: [
      { label: 'Surface', status: ctx.params.rain > 50 ? 'warning' : 'good', detail: `μ ${m.friction.toFixed(2)}` },
      { label: 'Barrier', status: s.collisions ? 'warning' : 'idle', detail: `${s.collisions} contacts` },
    ] }];
  },
  hud(ctx) {
    const m = ctx.state.metrics;
    if (ctx.params.scenario === 'crash') {
      const c = ctx.state.crash;
      return [
        { label: 'Speed', value: m.speed * 3.6, unit: 'km/h', precision: 0 },
        { label: 'Crush', value: c.maxCrush, unit: 'm', precision: 3 },
        { label: 'Zone used', value: Math.min(100, c.maxCrush / ctx.params.crushLength * 100), unit: '%', precision: 0,
          status: c.bottomedOut ? 'critical' : null },
        { label: 'Vehicle', value: c.peakDecel, unit: 'g', precision: 0 },
        { label: 'Occupant', value: c.occupantPeak, unit: 'g', precision: 0,
          status: c.occupantPeak > 60 ? 'critical' : c.occupantPeak > 40 ? 'warning' : null },
        { label: 'Excursion', value: c.occupantMaxRel, unit: 'm', precision: 3,
          status: c.struckInterior ? 'critical' : null },
        { label: 'Pulse', value: c.pulseTime * 1000, unit: 'ms', precision: 0 },
      ];
    }
    return [
      { label: 'Speed', value: m.speed * 3.6, unit: 'km/h', precision: 0 },
      { label: 'Path error', value: m.pathError, unit: 'm', precision: 2, status: m.pathError > 5 ? 'warning' : null },
      { label: 'Lateral', value: m.lateralAccel / 9.80665, unit: 'g', precision: 2 },
      { label: 'Front tire', value: m.tireUseFront, unit: '%', precision: 0, status: m.tireUseFront > 95 ? 'critical' : null },
      { label: 'Rear tire', value: m.tireUseRear, unit: '%', precision: 0, status: m.tireUseRear > 95 ? 'critical' : null },
      { label: 'Roll', value: m.roll, unit: '°', precision: 1 },
      { label: 'Contacts', value: m.collisions, precision: 0, status: m.collisions ? 'warning' : 'good' },
      { label: 'Integrity', value: m.integrity, unit: '%', precision: 0, status: m.integrity < 40 ? 'critical' : m.integrity < 75 ? 'warning' : 'good' },
    ];
  },
  inspect(ctx) { const s = ctx.state, m = s.metrics; return [
    { title: 'Vehicle state', rows: [
      { label: 'Driver', value: s.autopilot ? 'Autonomous' : 'Manual', status: s.autopilot ? 'good' : 'warning' },
      { label: 'Speed', value: m.speed * 3.6, unit: 'km/h', precision: 1 }, { label: 'Yaw rate', value: m.yawRate, unit: '°/s' },
      { label: 'Lateral acceleration', value: m.lateralAccel, unit: 'm/s²' }, { label: 'Longitudinal acceleration', value: m.longitudinalAccel, unit: 'm/s²' },
    ] },
    { title: 'Tire state', rows: [
      { label: 'Front slip angle', value: m.slipFront, unit: '°' }, { label: 'Rear slip angle', value: m.slipRear, unit: '°' },
      { label: 'Front friction use', value: m.tireUseFront, unit: '%', status: m.tireUseFront > 95 ? 'critical' : 'good' },
      { label: 'Rear friction use', value: m.tireUseRear, unit: '%', status: m.tireUseRear > 95 ? 'critical' : 'good' }, { label: 'Surface friction', value: m.friction },
    ] },
    { title: 'Experiment', rows: [
      { label: 'Scenario', value: ctx.params.scenario }, { label: 'Path error', value: m.pathError, unit: 'm' },
      { label: 'Stopping distance', value: m.stoppingDistance, unit: 'm' }, { label: 'Barrier contacts', value: m.collisions, precision: 0 },
    ] },
    { title: 'Damage state', rows: [
      { label: 'Structural integrity', value: s.damage.integrity, unit: '%', precision: 1, status: s.damage.integrity < 40 ? 'critical' : s.damage.integrity < 75 ? 'warning' : 'good' },
      { label: 'Front damage', value: s.damage.front, unit: '%', precision: 0 },
      { label: 'Side damage', value: s.damage.side, unit: '%', precision: 0 },
      { label: 'Suspension damage', value: s.damage.suspension, unit: '%', precision: 0 },
      { label: 'Powertrain', value: s.damage.powertrainFailed ? 'failed' : 'operational', status: s.damage.powertrainFailed ? 'critical' : 'good' },
      { label: 'Fuel system', value: s.damage.fire ? 'fire' : s.damage.fuelBreach ? 'breached' : 'intact', status: s.damage.fire ? 'critical' : s.damage.fuelBreach ? 'warning' : 'good' },
    ] },
    ...(ctx.params.scenario === 'crash' ? [crashSection(ctx)] : []),
  ]; },

  verdict(ctx) {
    const s = ctx.state, c = s.crash;
    if (ctx.params.scenario !== 'crash' || !c.done) return null;
    // Roughly: sustained occupant loads above ~60 g are where restraint
    // engineering stops being about comfort. Reported as a band, not a
    // survival claim — this is a lumped two-mass model, not a crash dummy.
    const status = c.struckInterior || c.occupantPeak > 60 ? 'critical' : c.occupantPeak > 40 ? 'warning' : 'good';
    return {
      status,
      headline: c.struckInterior
        ? 'Occupant ran out of survival space'
        : `Occupant peak ${c.occupantPeak.toFixed(0)} g`,
      rows: [
        { label: 'Impact speed', value: c.impactSpeed * 3.6, unit: 'km/h', precision: 1 },
        { label: 'Structural crush', value: c.maxCrush, unit: 'm', precision: 3 },
        { label: 'Crumple zone used', value: Math.min(100, c.maxCrush / ctx.params.crushLength * 100), unit: '%', precision: 0,
          status: c.bottomedOut ? 'critical' : 'good' },
        { label: 'Pulse duration', value: c.pulseTime * 1000, unit: 'ms', precision: 0 },
        { label: 'Peak vehicle deceleration', value: c.peakDecel, unit: 'g', precision: 1 },
        { label: 'Peak occupant deceleration', value: c.occupantPeak, unit: 'g', precision: 1, status },
        { label: 'Occupant excursion', value: c.occupantMaxRel, unit: 'm', precision: 3,
          status: c.struckInterior ? 'critical' : 'good' },
        { label: 'Energy absorbed', value: c.energy / 1000, unit: 'kJ', precision: 1 },
      ],
    };
  },
  explain() { return [
    { title: 'Why tires saturate', body: 'Lateral tire force begins approximately linear with slip angle, then approaches <code>μ·Fz</code>. Once an axle spends its friction budget, adding steering angle does not add proportional cornering force; it adds scrub. The front saturating first is understeer, the rear first is oversteer.' },
    { title: 'Why braking moves grip forward', body: 'Deceleration transfers normal load through the center-of-gravity height. Tesseraxis recomputes front and rear normal force every step, so rain, braking, and steering compete through the same finite tire budget.' },
    { title: 'What the suspension model exposes', body: 'Body roll and pitch are second-order spring-damper responses driven by lateral and longitudinal acceleration. Spring, damper, and anti-roll values can be changed live to compare transient response without changing the road input.' },
    { title: 'How the autonomous driver works', body: 'The controller selects a lookahead point on the circuit, closes heading error with rate-limited steering, and reduces target speed when predicted curvature exceeds the current friction limit. It is a measurable controller, not a prerecorded racing line.' },
    { title: 'Why a crumple zone lowers the pulse', body: 'Kinetic energy is fixed by mass and impact speed. The structure has to absorb all of it as <code>force × distance</code>, so the only free variable is the distance over which it is absorbed. Doubling the crush length roughly halves the force, and force divided by mass is the deceleration everyone inside experiences. A stiffer front stops the car sooner and hurts more.' },
    { title: 'Why the occupant pulls more g than the car', body: 'The occupant is a separate mass coupled through a belt. Across the belt’s slack and stretch they keep travelling at the impact speed while the structure is already slowing, so they cover their velocity change over a shorter distance and later in the event. Set slack to zero and watch the occupant peak fall — that is the entire argument for pretensioners.' },
    { title: 'What bottoming out looks like', body: 'Past the crumple zone length the model returns a far higher force, because what is left is the passenger cell and it is built not to deform. On the pulse graph it is a sudden spike at the end. If the crumple-zone-used readout hits 100%, the crash was bigger than the structure was designed for and the numbers past that point are the cell being loaded directly.' },
    { title: 'What this crash model is not', body: 'Two lumped masses, a linear-then-plateau crush curve, and a spring-damper belt. It reproduces the trends taught in a first course on impact biomechanics — pulse shape, ride-down, the cost of slack — but it is not a finite-element model and the g figures are not injury criteria. Treat the comparisons as real and the absolute numbers as indicative.' },
  ]; },
});
