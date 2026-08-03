import { clamp } from '../../engine/math.js';

const CELL_SAMPLES = 32;

export function createSwarm(ctx) {
  const { world, params, rng } = ctx;
  const Agent = world.defineComponent('SwarmAgent', {
    x: 'f64', y: 'f64', z: 'f64', vx: 'f64', vy: 'f64', vz: 'f64',
    ax: 'f64', ay: 'f64', az: 'f64', group: 'u8',
  });

  const agents = new Uint32Array(params.agentCount);
  const radius = params.worldRadius;
  for (let i = 0; i < agents.length; i++) {
    const e = world.createEntity(`Agent ${i + 1}`);
    agents[i] = e;
    const angle = rng.next() * Math.PI * 2;
    const spread = Math.sqrt(rng.next()) * radius * 0.48;
    const y = 8 + rng.next() * radius * 0.45;
    world.add(e, Agent, {
      x: Math.cos(angle) * spread, y, z: Math.sin(angle) * spread,
      vx: rng.range(-3, 3), vy: rng.range(-1, 1), vz: rng.range(-3, 3),
      group: i % 4,
    });
  }

  const obstacles = params.mission === 'flock' ? [] : [
    { x: -28, y: 25, z: 8, radius: 12 },
    { x: 20, y: 42, z: -18, radius: 15 },
    { x: 42, y: 20, z: 32, radius: 10 },
    { x: -4, y: 18, z: 45, radius: 9 },
  ];

  return {
    Agent, agents, obstacles,
    goal: { x: radius * 0.55, y: radius * 0.34, z: -radius * 0.35 },
    retargetLatch: false, scatterLatch: false, targetIndex: 0,
    visited: new Uint8Array(CELL_SAMPLES * CELL_SAMPLES), visitedCount: 0,
    metrics: {
      cx: 0, cy: 0, cz: 0, meanSpeed: 0, maxSpeed: 0, meanNeighbors: 0,
      connected: 0, alignment: 0, dispersion: 0, goalDistance: 0, coverage: 0, nearMisses: 0,
    },
  };
}

export function makeSystems(ctx, state) {
  const { Agent: A, agents, obstacles } = state;
  const grid = new Map();
  const neighbors = new Uint16Array(agents.length);
  const sensed = new Uint16Array(agents.length);
  const key = (x, y, z) => `${x}|${y}|${z}`;

  function input() {
    const retarget = ctx.action('retarget') !== 0;
    if (retarget && !state.retargetLatch) {
      state.targetIndex++;
      const a = state.targetIndex * 2.399963229728653;
      const r = ctx.params.worldRadius * 0.62;
      state.goal.x = Math.cos(a) * r;
      state.goal.z = Math.sin(a) * r;
      state.goal.y = 20 + (state.targetIndex % 4) * 13;
      ctx.mark('mission', 'Mission objective relocated');
    }
    state.retargetLatch = retarget;
    const scatter = ctx.action('scatter') !== 0;
    if (scatter && !state.scatterLatch) ctx.mark('warning', 'Emergency dispersion command');
    state.scatterLatch = scatter;
  }

  function control(world, dt) {
    const p = ctx.params;
    const cellSize = Math.max(1, p.sensorRadius);
    const sensor2 = p.sensorRadius * p.sensorRadius;
    const separation2 = p.separationRadius * p.separationRadius;
    const loss = p.communicationLoss / 100;
    grid.clear();
    neighbors.fill(0);
    sensed.fill(0);

    for (let i = 0; i < agents.length; i++) {
      const e = agents[i];
      const cx = Math.floor(A.x[e] / cellSize), cy = Math.floor(A.y[e] / cellSize), cz = Math.floor(A.z[e] / cellSize);
      const k = key(cx, cy, cz);
      let bucket = grid.get(k);
      if (!bucket) grid.set(k, (bucket = []));
      bucket.push(i);
    }

    let nearMisses = 0;
    for (let i = 0; i < agents.length; i++) {
      const e = agents[i];
      const x = A.x[e], y = A.y[e], z = A.z[e];
      const vx = A.vx[e], vy = A.vy[e], vz = A.vz[e];
      const gx = Math.floor(x / cellSize), gy = Math.floor(y / cellSize), gz = Math.floor(z / cellSize);
      let sx = 0, sy = 0, sz = 0, avx = 0, avy = 0, avz = 0, px = 0, py = 0, pz = 0, count = 0;

      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const bucket = grid.get(key(gx + dx, gy + dy, gz + dz));
        if (!bucket) continue;
        for (const j of bucket) {
          if (j === i) continue;
          const o = agents[j];
          const rx = A.x[o] - x, ry = A.y[o] - y, rz = A.z[o] - z;
          const d2 = rx * rx + ry * ry + rz * rz;
          if (d2 > sensor2 || d2 < 1e-9) continue;
          sensed[i]++;
          if (d2 < separation2) {
            const inv = 1 / d2;
            sx -= rx * inv; sy -= ry * inv; sz -= rz * inv;
            if (j > i) nearMisses++;
          }
          // A seeded, deterministic draw models a lossy peer-to-peer link.
          if (ctx.rng.next() < loss) continue;
          avx += A.vx[o]; avy += A.vy[o]; avz += A.vz[o];
          px += A.x[o]; py += A.y[o]; pz += A.z[o];
          count++;
        }
      }
      neighbors[i] = count;

      let ax = sx * p.separationWeight, ay = sy * p.separationWeight, az = sz * p.separationWeight;
      if (count > 0) {
        const inv = 1 / count;
        ax += (avx * inv - vx) * p.alignmentWeight;
        ay += (avy * inv - vy) * p.alignmentWeight;
        az += (avz * inv - vz) * p.alignmentWeight;
        ax += (px * inv - x) * p.cohesionWeight * 0.05;
        ay += (py * inv - y) * p.cohesionWeight * 0.05;
        az += (pz * inv - z) * p.cohesionWeight * 0.05;
      }

      let tx = state.goal.x, ty = state.goal.y, tz = state.goal.z;
      if (p.mission === 'formation') {
        const wing = (i % 2 ? 1 : -1) * Math.ceil((i % 18) / 2) * 2.4;
        tx += wing; ty += (i % 7) * 1.25 - 4; tz += Math.abs(wing) * 0.38;
      } else if (p.mission === 'rescue') {
        const band = i % 12;
        tx += (band - 5.5) * 5;
        tz += (Math.floor(i / 12) % 8 - 3.5) * 4;
      }
      ax += (tx - x) * p.goalWeight * 0.028;
      ay += (ty - y) * p.goalWeight * 0.028;
      az += (tz - z) * p.goalWeight * 0.028;

      for (const o of obstacles) {
        const rx = x - o.x, ry = y - o.y, rz = z - o.z;
        const d = Math.hypot(rx, ry, rz);
        const influence = o.radius + p.sensorRadius;
        if (d < influence && d > 1e-6) {
          const push = p.obstacleWeight * (influence - d) / influence / d;
          ax += rx * push; ay += ry * push; az += rz * push;
        }
      }

      const r = Math.hypot(x, z), bound = p.worldRadius;
      if (r > bound * 0.82) { ax -= x * 0.05; az -= z * 0.05; }
      if (y < 4) ay += (4 - y) * 1.8;
      if (y > bound * 0.85) ay -= (y - bound * 0.85) * 0.8;
      if (state.scatterLatch) { ax += (x - state.metrics.cx) * 0.12; ay += (y - state.metrics.cy) * 0.12; az += (z - state.metrics.cz) * 0.12; }

      const mag = Math.hypot(ax, ay, az);
      const scale = mag > p.maxAccel ? p.maxAccel / mag : 1;
      A.ax[e] = ax * scale; A.ay[e] = ay * scale; A.az[e] = az * scale;
    }
    state.metrics.nearMisses = nearMisses;
  }

  function integrate(world, dt) {
    const max = ctx.params.maxSpeed;
    for (let i = 0; i < agents.length; i++) {
      const e = agents[i];
      A.vx[e] += A.ax[e] * dt; A.vy[e] += A.ay[e] * dt; A.vz[e] += A.az[e] * dt;
      const speed = Math.hypot(A.vx[e], A.vy[e], A.vz[e]);
      if (speed > max) { const s = max / speed; A.vx[e] *= s; A.vy[e] *= s; A.vz[e] *= s; }
      A.x[e] += A.vx[e] * dt; A.y[e] += A.vy[e] * dt; A.z[e] += A.vz[e] * dt;
    }
  }

  function post() {
    const m = state.metrics;
    let cx = 0, cy = 0, cz = 0, svx = 0, svy = 0, svz = 0, speedSum = 0, maxSpeed = 0, neighborSum = 0, connected = 0;
    for (let i = 0; i < agents.length; i++) {
      const e = agents[i], speed = Math.hypot(A.vx[e], A.vy[e], A.vz[e]);
      cx += A.x[e]; cy += A.y[e]; cz += A.z[e]; svx += A.vx[e]; svy += A.vy[e]; svz += A.vz[e];
      speedSum += speed; maxSpeed = Math.max(maxSpeed, speed); neighborSum += neighbors[i]; if (sensed[i] > 0) connected++;
      if (ctx.params.mission === 'rescue') {
        const ix = clamp(Math.floor((A.x[e] / ctx.params.worldRadius * 0.5 + 0.5) * CELL_SAMPLES), 0, CELL_SAMPLES - 1);
        const iz = clamp(Math.floor((A.z[e] / ctx.params.worldRadius * 0.5 + 0.5) * CELL_SAMPLES), 0, CELL_SAMPLES - 1);
        const cell = iz * CELL_SAMPLES + ix;
        if (!state.visited[cell]) { state.visited[cell] = 1; state.visitedCount++; }
      }
    }
    const inv = 1 / agents.length;
    cx *= inv; cy *= inv; cz *= inv;
    let dispersion = 0;
    for (let i = 0; i < agents.length; i++) { const e = agents[i]; dispersion += Math.hypot(A.x[e] - cx, A.y[e] - cy, A.z[e] - cz); }
    const vectorMean = Math.hypot(svx, svy, svz) * inv;
    m.cx = cx; m.cy = cy; m.cz = cz; m.meanSpeed = speedSum * inv; m.maxSpeed = maxSpeed;
    m.meanNeighbors = neighborSum * inv; m.connected = connected * inv * 100;
    m.alignment = m.meanSpeed > 1e-6 ? clamp(vectorMean / m.meanSpeed * 100, 0, 100) : 100;
    m.dispersion = dispersion * inv; m.goalDistance = Math.hypot(cx - state.goal.x, cy - state.goal.y, cz - state.goal.z);
    m.coverage = state.visitedCount / state.visited.length * 100;
    ctx.recorder.writeMany(m);
  }

  return { input, control, integrate, post };
}
