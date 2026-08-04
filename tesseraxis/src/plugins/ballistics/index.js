import { definePlugin } from '../../sdk/plugin.js';
import { params, channels, graphs, actions } from './spec.js';
import { createBallistics, makeSystems, TARGETS } from './physics.js';
import { createBallisticsView } from './view.js';

const MODE_LABEL = {
  exterior: 'Exterior ballistics',
  terminal: 'Impact & penetration',
  intercept: 'Intercept guidance',
};

export default definePlugin({
  id: 'ballistics',
  title: 'Ballistics & Intercept Lab',
  subtitle: 'Trajectories · drag · penetration · guidance',
  summary: 'Projectile motion through a standard atmosphere, Poncelet penetration mechanics, and proportional navigation — three classical problems sharing one projectile.',
  capacity: 16,
  defaultSeed: 1618,
  camera: { position: [220, 140, -200], target: [0, 40, 200], far: 40000 },
  params, channels, graphs, actions,

  setup(ctx) {
    const state = createBallistics(ctx);
    const systems = makeSystems(ctx, state);
    ctx.state = state;
    ctx.loop.addSystem('integrate', systems.integrate, 'ballistics:flight');
    ctx.loop.addSystem('constrain', systems.constrain, 'ballistics:impact');
    ctx.loop.addSystem('post', systems.post, 'ballistics:telemetry');
    if (ctx.viewport) {
      const view = createBallisticsView(ctx, state);
      ctx.loop.onRender(() => view.render());
      return () => view.dispose();
    }
    return () => {};
  },

  hierarchy(ctx) {
    const s = ctx.state, m = s.metrics, p = ctx.params;
    const nodes = [{
      label: `Projectile · ${p.calibre} mm`, status: s.done ? 'idle' : 'active', detail: s.phase,
      children: [
        { label: 'Mass', status: 'active', detail: `${(p.mass * 1000).toFixed(1)} g` },
        { label: 'Sectional density', status: 'active', detail: `${(p.mass / s.area).toFixed(0)} kg/m²` },
        { label: 'Velocity', status: 'active', detail: `${m.speed.toFixed(0)} m/s · Mach ${m.mach.toFixed(2)}` },
        { label: 'Drag', status: m.mach > 0.8 && m.mach < 1.2 ? 'warning' : 'active', detail: `${m.dragForce.toFixed(1)} N` },
      ],
    }, {
      label: 'Atmosphere', status: 'idle',
      children: [
        { label: 'Altitude', status: 'active', detail: `${m.altitude.toFixed(0)} m` },
        { label: 'Wind', status: p.windSpeed ? 'warning' : 'idle', detail: `${p.windSpeed} m/s from ${p.windDirection}°` },
        { label: 'Coriolis', status: p.coriolis ? 'good' : 'idle', detail: p.coriolis ? `${p.latitude}° latitude` : 'disabled' },
        { label: 'Spin drift', status: p.spinDrift ? 'good' : 'idle', detail: p.spinDrift ? `${m.drift.toFixed(2)} m` : 'disabled' },
      ],
    }];

    if (ctx.params.mode === 'intercept') {
      const g = s.guidance;
      nodes.push({
        label: 'Guidance', status: g.intercepted ? 'good' : s.done ? 'critical' : 'active',
        detail: `N = ${p.navigationGain}`,
        children: [
          { label: 'Range to target', status: 'active', detail: `${m.separation.toFixed(0)} m` },
          { label: 'Closing speed', status: 'active', detail: `${g.closing.toFixed(0)} m/s` },
          { label: 'Lateral demand', status: g.saturated ? 'critical' : 'good', detail: `${g.lateral.toFixed(1)} g` },
          { label: 'Airframe limit', status: g.everSaturated ? 'warning' : 'good', detail: `${p.lateralLimit} g` },
        ],
      });
    }
    return nodes;
  },

  hud(ctx) {
    const s = ctx.state, m = s.metrics;
    if (ctx.params.mode === 'intercept') {
      const g = s.guidance;
      return [
        { label: 'Range', value: m.separation, unit: 'm', precision: 0 },
        { label: 'Closing', value: g.closing, unit: 'm/s', precision: 0 },
        { label: 'LOS rate', value: g.losRate, unit: 'rad/s', precision: 4 },
        { label: 'Demand', value: g.lateral, unit: 'g', precision: 1, status: g.saturated ? 'critical' : null },
        { label: 'Miss', value: Number.isFinite(g.missDistance) ? g.missDistance : 0, unit: 'm', precision: 2 },
        { label: 'Time', value: m.flightTime, unit: 's', precision: 2 },
      ];
    }
    return [
      { label: 'Velocity', value: m.speed, unit: 'm/s', precision: 0 },
      { label: 'Mach', value: m.mach, precision: 2, status: m.mach > 0.8 && m.mach < 1.2 ? 'warning' : null },
      { label: 'Altitude', value: m.altitude, unit: 'm', precision: 0 },
      { label: 'Downrange', value: m.downrange, unit: 'm', precision: 0 },
      { label: 'Energy', value: m.energy, unit: 'kJ', precision: 2 },
      { label: 'Drift', value: m.drift, unit: 'm', precision: 2 },
      { label: 'Time', value: m.flightTime, unit: 's', precision: 2 },
    ];
  },

  inspect(ctx) {
    const s = ctx.state, m = s.metrics, p = ctx.params;
    const sections = [
      { title: 'Flight state', rows: [
        { label: 'Mode', value: MODE_LABEL[p.mode] ?? p.mode },
        { label: 'Phase', value: s.phase },
        { label: 'Velocity', value: m.speed, unit: 'm/s', precision: 1 },
        { label: 'Mach number', value: m.mach, precision: 3 },
        { label: 'Kinetic energy', value: m.energy, unit: 'kJ', precision: 3 },
        { label: 'Drag force', value: m.dragForce, unit: 'N', precision: 2 },
      ] },
      { title: 'Position', rows: [
        { label: 'Altitude', value: m.altitude, unit: 'm', precision: 1 },
        { label: 'Downrange', value: m.downrange, unit: 'm', precision: 1 },
        { label: 'Drop from launch', value: m.drop, unit: 'm', precision: 2 },
        { label: 'Lateral drift', value: m.drift, unit: 'm', precision: 3 },
        { label: 'Apex', value: s.apex, unit: 'm', precision: 1 },
        { label: 'Flight time', value: m.flightTime, unit: 's', precision: 3 },
      ] },
    ];

    if (s.terminal) {
      const t = s.terminal;
      sections.push({ title: 'Terminal effect', rows: [
        { label: 'Target', value: t.material },
        { label: 'Impact velocity', value: t.impactSpeed, unit: 'm/s', precision: 0 },
        { label: 'Normal component', value: t.normalSpeed, unit: 'm/s', precision: 0 },
        { label: 'Obliquity', value: t.obliquity, unit: '°', precision: 0 },
        { label: 'Critical ricochet angle', value: t.criticalAngle, unit: '°', precision: 0 },
        { label: 'Penetration depth', value: t.depth * 1000, unit: 'mm', precision: 1 },
        { label: 'Line-of-sight thickness', value: t.lineOfSight * 1000, unit: 'mm', precision: 1 },
        { label: 'Residual velocity', value: t.residual, unit: 'm/s', precision: 0 },
      ] });
    }

    if (p.mode === 'intercept') {
      const g = s.guidance;
      sections.push({ title: 'Guidance', rows: [
        { label: 'Navigation gain', value: p.navigationGain, precision: 1 },
        { label: 'Closing speed', value: g.closing, unit: 'm/s', precision: 1 },
        { label: 'Line-of-sight rate', value: g.losRate, unit: 'rad/s', precision: 5 },
        { label: 'Lateral demand', value: g.lateral, unit: 'g', precision: 2, status: g.saturated ? 'critical' : 'good' },
        { label: 'Peak demand', value: g.peakLateral, unit: 'g', precision: 2 },
        { label: 'Closest approach', value: Number.isFinite(g.missDistance) ? g.missDistance : 0, unit: 'm', precision: 2 },
      ] });
    }
    return sections;
  },

  verdict(ctx) {
    const s = ctx.state, p = ctx.params;
    if (!s.done) return null;

    if (p.mode === 'intercept') {
      const g = s.guidance;
      return {
        status: g.intercepted ? 'good' : 'critical',
        headline: g.intercepted
          ? `Intercept · ${g.missDistance.toFixed(2)} m closest approach`
          : `Miss · ${g.missDistance.toFixed(1)} m closest approach`,
        rows: [
          { label: 'Closest approach', value: g.missDistance, unit: 'm', precision: 2 },
          { label: 'Intercept radius', value: p.lethalRadius, unit: 'm', precision: 1 },
          { label: 'Peak lateral demand', value: g.peakLateral, unit: 'g', precision: 1,
            status: g.everSaturated ? 'critical' : 'good' },
          { label: 'Airframe limit', value: p.lateralLimit, unit: 'g', precision: 0 },
          { label: 'Demand saturated', value: g.everSaturated ? 'yes' : 'no',
            status: g.everSaturated ? 'warning' : 'good' },
          { label: 'Time of flight', value: s.time, unit: 's', precision: 2 },
        ],
      };
    }

    if (s.terminal) {
      const t = s.terminal;
      const status = t.ricochet ? 'warning' : t.perforates ? 'critical' : 'good';
      return {
        status,
        headline: t.ricochet ? `Ricochet at ${t.obliquity}°`
          : t.perforates ? `Perforated ${p.plateThickness} mm ${t.material}`
          : `Stopped by ${p.plateThickness} mm ${t.material}`,
        rows: [
          { label: 'Impact velocity', value: t.impactSpeed, unit: 'm/s', precision: 0 },
          { label: 'Sectional density', value: t.sectionalDensity, unit: 'kg/m²', precision: 0 },
          { label: 'Penetration depth', value: t.depth * 1000, unit: 'mm', precision: 1 },
          { label: 'Plate line-of-sight', value: t.lineOfSight * 1000, unit: 'mm', precision: 1 },
          { label: 'Energy at plate', value: t.energy / 1000, unit: 'kJ', precision: 2 },
          { label: 'Residual velocity', value: t.residual, unit: 'm/s', precision: 0 },
        ],
      };
    }

    const i = s.impact;
    if (!i) return null;
    return {
      status: 'good',
      headline: `Impact at ${i.range.toFixed(0)} m`,
      rows: [
        { label: 'Ground range', value: i.range, unit: 'm', precision: 1 },
        { label: 'Time of flight', value: i.time, unit: 's', precision: 2 },
        { label: 'Impact velocity', value: i.speed, unit: 'm/s', precision: 0 },
        { label: 'Impact energy', value: i.energy / 1000, unit: 'kJ', precision: 2 },
        { label: 'Energy retained', value: i.energy / (0.5 * p.mass * p.muzzleVelocity ** 2) * 100, unit: '%', precision: 1 },
        { label: 'Impact angle', value: i.angle, unit: '°', precision: 1 },
        { label: 'Apex', value: s.apex, unit: 'm', precision: 1 },
        { label: 'Lateral drift', value: i.drift, unit: 'm', precision: 2 },
      ],
    };
  },

  explain() {
    return [
      { title: 'Why velocity falls off a cliff near Mach 1', body: 'Drag is <code>½ρv²C<sub>d</sub>A</code>, and C<sub>d</sub> is not constant. As the projectile approaches the speed of sound a shock forms on the nose and the drag coefficient more than doubles over a narrow band. Watch the Mach graph cross 1.0 and compare it to the velocity graph — the steepest loss is right there, which is why a projectile that starts supersonic sheds energy fastest early.' },
      { title: 'Sectional density beats mass', body: 'Two projectiles of the same mass but different calibre do not fly or penetrate alike. What matters is mass divided by frontal area. A heavier projectile with a wider face presents more area for drag to work on and more area for a target to resist through, so it both slows faster and penetrates less.' },
      { title: 'Coriolis and spin drift are different things', body: 'Coriolis is real: the Earth rotates under the projectile during flight, and the deflection depends on latitude and direction of fire. Spin drift is gyroscopic — a spin-stabilised projectile slowly yaws in the direction of rifling twist. Both are negligible at 100 m and both are metres at extreme range. Toggle each independently to see which is which.' },
      { title: 'How penetration is modelled', body: 'The Poncelet law: the target resists with a constant strength term plus an inertial term <code>ρv²</code> for material shoved aside. Integrating gives a logarithmic depth. Strength dominates in armour, inertia dominates in soft targets — which is why the strength term alone would predict several metres of penetration into gelatin, and why the model needs both.' },
      { title: 'Why obliquity protects better than thickness', body: 'A plate struck at an angle presents more material along the projectile path — line-of-sight thickness is <code>t / cos(θ)</code>, so 60° nearly doubles it. Past a critical angle set by the projectile’s sectional density the nose cannot bite at all and it ricochets, defeating the plate entirely without ever loading it.' },
      { title: 'Proportional navigation holds a bearing, not a heading', body: 'The guidance commands lateral acceleration equal to <code>N · V<sub>c</sub> · ω</code>, where ω is how fast the line of sight rotates. If the bearing to something is not changing while the range closes, you are on a collision course — sailors use the same rule. Below about N = 2 the law cannot converge; 3 to 5 is the classical range. Push the gain up and the demand saturates the airframe instead, and saturation is what sets miss distance.' },
      { title: 'What this lab is and is not', body: 'It is a 3-DOF point-mass model: no yaw, no pitch damping, no aeroelasticity, and a generic drag curve rather than a measured one. It reproduces the relationships taught in exterior ballistics and guidance courses — transonic drag rise, energy retention, ricochet geometry, PN convergence — and the comparisons between runs are meaningful. Absolute figures are indicative.' },
    ];
  },
});
