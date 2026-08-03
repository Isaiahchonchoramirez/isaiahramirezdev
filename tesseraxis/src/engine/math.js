// Scalar math for the simulation core.
//
// This file deliberately does not import three.js. The engine has to be able to
// run headless — in a worker, in a batch optimiser, in a test — and pulling the
// renderer in for a dot product would tie physics to the presence of a canvas.
// The viewport converts these plain objects into three.js types at the boundary.
//
// Everything here is f64. Three.js stores positions as f32, which loses ~7
// significant digits — enough that a rocket integrated at f32 over a 300-second
// descent drifts metres off its own trajectory between two identical runs.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Maps v from [inLo, inHi] onto [outLo, outHi], clamped at both ends.
export const remap = (v, inLo, inHi, outLo, outHi) =>
  outLo + (outHi - outLo) * clamp((v - inLo) / (inHi - inLo), 0, 1);

// ---------------------------------------------------------------------------
// Vectors
// ---------------------------------------------------------------------------

export const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

export const v3set = (o, x, y, z) => ((o.x = x), (o.y = y), (o.z = z), o);
export const v3copy = (o, a) => ((o.x = a.x), (o.y = a.y), (o.z = a.z), o);
export const v3add = (o, a, b) => v3set(o, a.x + b.x, a.y + b.y, a.z + b.z);
export const v3sub = (o, a, b) => v3set(o, a.x - b.x, a.y - b.y, a.z - b.z);
export const v3scale = (o, a, s) => v3set(o, a.x * s, a.y * s, a.z * s);

// o += a * s. The workhorse of every integrator here, kept allocation-free
// because it runs a few hundred thousand times a second.
export const v3addScaled = (o, a, s) =>
  v3set(o, o.x + a.x * s, o.y + a.y * s, o.z + a.z * s);

export const v3dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const v3cross = (o, a, b) =>
  v3set(
    o,
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );

export const v3lengthSq = (a) => a.x * a.x + a.y * a.y + a.z * a.z;
export const v3length = (a) => Math.sqrt(v3lengthSq(a));

export const v3distance = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export function v3normalize(o, a = o) {
  const len = v3length(a);
  // Returning zero rather than NaN keeps a degenerate frame from poisoning the
  // whole state vector; callers that care check the length themselves.
  if (len < 1e-12) return v3set(o, 0, 0, 0);
  return v3scale(o, a, 1 / len);
}

// Caps a vector's magnitude without changing its direction. Used for thrust
// limits, steering forces, and speed clamps.
export function v3clampLength(o, a, max) {
  const len = v3length(a);
  if (len <= max || len < 1e-12) return v3copy(o, a);
  return v3scale(o, a, max / len);
}

// ---------------------------------------------------------------------------
// Quaternions — attitude is stored as (x, y, z, w)
// ---------------------------------------------------------------------------

export const quat = (x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w });

export const qcopy = (o, a) =>
  ((o.x = a.x), (o.y = a.y), (o.z = a.z), (o.w = a.w), o);

export function qmul(o, a, b) {
  const ax = a.x, ay = a.y, az = a.z, aw = a.w;
  const bx = b.x, by = b.y, bz = b.z, bw = b.w;
  o.x = aw * bx + ax * bw + ay * bz - az * by;
  o.y = aw * by - ax * bz + ay * bw + az * bx;
  o.z = aw * bz + ax * by - ay * bx + az * bw;
  o.w = aw * bw - ax * bx - ay * by - az * bz;
  return o;
}

export function qnormalize(o, a = o) {
  const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w);
  if (len < 1e-12) return ((o.x = 0), (o.y = 0), (o.z = 0), (o.w = 1), o);
  const s = 1 / len;
  o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; o.w = a.w * s;
  return o;
}

export const qconjugate = (o, a) =>
  ((o.x = -a.x), (o.y = -a.y), (o.z = -a.z), (o.w = a.w), o);

export function qFromAxisAngle(o, axis, angle) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  o.x = axis.x * s; o.y = axis.y * s; o.z = axis.z * s; o.w = Math.cos(half);
  return o;
}

// Rotates a vector by a quaternion using the shortened Rodrigues form —
// t = 2(q_vec × v); v' = v + q_w·t + (q_vec × t). Roughly half the
// multiplications of building a matrix first.
export function qRotate(o, q, v) {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  o.x = v.x + q.w * tx + (q.y * tz - q.z * ty);
  o.y = v.y + q.w * ty + (q.z * tx - q.x * tz);
  o.z = v.z + q.w * tz + (q.x * ty - q.y * tx);
  return o;
}

// Inverse rotation, i.e. world -> body. Conjugating first would allocate.
export function qRotateInverse(o, q, v) {
  const tx = 2 * (v.y * q.z - v.z * q.y);
  const ty = 2 * (v.z * q.x - v.x * q.z);
  const tz = 2 * (v.x * q.y - v.y * q.x);
  o.x = v.x + q.w * tx + (ty * q.z - tz * q.y);
  o.y = v.y + q.w * ty + (tz * q.x - tx * q.z);
  o.z = v.z + q.w * tz + (tx * q.y - ty * q.x);
  return o;
}

// Shortest-arc rotation taking `from` onto `to`, both assumed unit length.
export function qFromUnitVectors(o, from, to) {
  let r = v3dot(from, to) + 1;
  if (r < 1e-8) {
    // Antiparallel: any axis perpendicular to `from` is a valid 180° turn.
    r = 0;
    if (Math.abs(from.x) > Math.abs(from.z)) {
      o.x = -from.y; o.y = from.x; o.z = 0;
    } else {
      o.x = 0; o.y = -from.z; o.z = from.y;
    }
  } else {
    o.x = from.y * to.z - from.z * to.y;
    o.y = from.z * to.x - from.x * to.z;
    o.z = from.x * to.y - from.y * to.x;
  }
  o.w = r;
  return qnormalize(o);
}

// Angle in radians between two attitudes — the number an attitude controller
// actually wants to drive to zero.
export function qAngleTo(a, b) {
  const d = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  return 2 * Math.acos(clamp(Math.abs(d), -1, 1));
}

// Integrates attitude by a body-frame angular velocity over dt.
//
// The exact exponential map is used instead of the usual q += 0.5·ω·q·dt
// first-order step: the linear form drifts off the unit sphere and needs
// constant renormalisation, which quietly bleeds energy out of a spin. At the
// tick rates here the difference shows up as a tumbling stage slowly losing
// rotation it should have kept.
export function qIntegrate(o, q, omega, dt) {
  const wx = omega.x * dt * 0.5;
  const wy = omega.y * dt * 0.5;
  const wz = omega.z * dt * 0.5;
  const theta = Math.sqrt(wx * wx + wy * wy + wz * wz);

  let s, c;
  if (theta < 1e-8) {
    // sin(θ)/θ → 1 as θ → 0; the series avoids dividing by ~0.
    s = 1 - (theta * theta) / 6;
    c = 1 - (theta * theta) / 2;
  } else {
    s = Math.sin(theta) / theta;
    c = Math.cos(theta);
  }

  const dx = wx * s, dy = wy * s, dz = wz * s, dw = c;
  const x = dw * q.x + dx * q.w + dy * q.z - dz * q.y;
  const y = dw * q.y - dx * q.z + dy * q.w + dz * q.x;
  const z = dw * q.z + dx * q.y - dy * q.x + dz * q.w;
  const w = dw * q.w - dx * q.x - dy * q.y - dz * q.z;
  o.x = x; o.y = y; o.z = z; o.w = w;
  return qnormalize(o);
}

// Euler angles from a quaternion, in the yaw-pitch-roll order engineers read
// off a flight display. Returned in radians.
export function qToEuler(o, q) {
  const sinp = 2 * (q.w * q.x - q.y * q.z);
  o.pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
  o.yaw = Math.atan2(2 * (q.w * q.y + q.z * q.x), 1 - 2 * (q.x * q.x + q.y * q.y));
  o.roll = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.x * q.x + q.z * q.z));
  return o;
}

// ---------------------------------------------------------------------------
// Signal helpers
// ---------------------------------------------------------------------------

// First-order low-pass, specified by time constant rather than by an opaque
// alpha, so a filter keeps its behaviour if the tick rate changes.
export function lowPass(prev, next, dt, tau) {
  if (tau <= 0) return next;
  const alpha = 1 - Math.exp(-dt / tau);
  return prev + (next - prev) * alpha;
}

// Limits how fast a value may change, in units per second. Real actuators
// cannot step instantly, and a controller tuned without this is tuned against
// a plant that does not exist.
export function slewLimit(prev, target, dt, ratePerSecond) {
  const maxStep = ratePerSecond * dt;
  const delta = target - prev;
  return prev + clamp(delta, -maxStep, maxStep);
}
