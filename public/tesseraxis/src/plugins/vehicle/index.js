import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createVehicle, makeSystems } from './physics.js';
import { createVehicleView } from './view.js';

export default definePlugin({
  id: 'vehicle-dynamics', title: 'Vehicle Dynamics Lab', subtitle: 'Tires · suspension · autonomy · collision physics',
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
    const s = ctx.state, m = s.metrics;
    return [{ label: 'Test vehicle', status: s.collisions ? 'warning' : 'good', detail: s.phase, children: [
      { label: 'Powertrain', status: 'active', detail: `${(s.Vehicle.throttle[s.entity] * 100).toFixed(0)}% throttle` },
      { label: 'Front axle', status: m.tireUseFront > 95 ? 'warning' : 'active', detail: `${m.tireUseFront.toFixed(0)}% friction` },
      { label: 'Rear axle', status: m.tireUseRear > 95 ? 'warning' : 'active', detail: `${m.tireUseRear.toFixed(0)}% friction` },
      { label: 'Suspension', status: 'active', detail: `${m.roll.toFixed(1)}° roll` },
      { label: 'Autonomous driver', status: s.autopilot ? 'good' : 'idle', detail: s.autopilot ? 'engaged' : 'manual' },
    ] }, { label: 'Test circuit', status: 'idle', children: [
      { label: 'Surface', status: ctx.params.rain > 50 ? 'warning' : 'good', detail: `μ ${m.friction.toFixed(2)}` },
      { label: 'Barrier', status: s.collisions ? 'warning' : 'idle', detail: `${s.collisions} contacts` },
    ] }];
  },
  hud(ctx) { const m = ctx.state.metrics; return [
    { label: 'Speed', value: m.speed * 3.6, unit: 'km/h', precision: 0 },
    { label: 'Path error', value: m.pathError, unit: 'm', precision: 2, status: m.pathError > 5 ? 'warning' : null },
    { label: 'Lateral', value: m.lateralAccel / 9.80665, unit: 'g', precision: 2 },
    { label: 'Front tire', value: m.tireUseFront, unit: '%', precision: 0, status: m.tireUseFront > 95 ? 'critical' : null },
    { label: 'Rear tire', value: m.tireUseRear, unit: '%', precision: 0, status: m.tireUseRear > 95 ? 'critical' : null },
    { label: 'Roll', value: m.roll, unit: '°', precision: 1 },
    { label: 'Contacts', value: m.collisions, precision: 0, status: m.collisions ? 'warning' : 'good' },
  ]; },
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
  ]; },
  explain() { return [
    { title: 'Why tires saturate', body: 'Lateral tire force begins approximately linear with slip angle, then approaches <code>μ·Fz</code>. Once an axle spends its friction budget, adding steering angle does not add proportional cornering force; it adds scrub. The front saturating first is understeer, the rear first is oversteer.' },
    { title: 'Why braking moves grip forward', body: 'Deceleration transfers normal load through the center-of-gravity height. Tesseraxis recomputes front and rear normal force every step, so rain, braking, and steering compete through the same finite tire budget.' },
    { title: 'What the suspension model exposes', body: 'Body roll and pitch are second-order spring-damper responses driven by lateral and longitudinal acceleration. Spring, damper, and anti-roll values can be changed live to compare transient response without changing the road input.' },
    { title: 'How the autonomous driver works', body: 'The controller selects a lookahead point on the circuit, closes heading error with rate-limited steering, and reduces target speed when predicted curvature exceeds the current friction limit. It is a measurable controller, not a prerecorded racing line.' },
  ]; },
});
