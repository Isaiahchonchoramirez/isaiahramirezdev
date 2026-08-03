// Deterministic pseudo-random numbers.
//
// Math.random() is seeded by the host and cannot be replayed, which would make
// every "reproducible run" claim in this platform a lie. Every stochastic value
// in Tesseraxis — spawn jitter, sensor noise, wind gusts — comes from one of these
// instead, so a run is fully described by its seed plus its control inputs.
//
// xoshiro128** is used rather than a Mersenne Twister: 16 bytes of state, no
// warm-up, passes TestU01 BigCrush, and stays in exact 32-bit integer range so
// two machines running the same build produce the same stream bit for bit.

export class Rng {
  constructor(seed = 0x9e3779b9) {
    this.seed(seed);
  }

  // splitmix32 expands one 32-bit seed into the four words xoshiro needs.
  // Seeding all four words from the same value directly would leave the
  // generator in a low-entropy state that takes thousands of draws to escape.
  seed(seed) {
    let z = seed >>> 0;
    const next = () => {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
      return (t ^ (t >>> 15)) >>> 0;
    };
    this.s0 = next();
    this.s1 = next();
    this.s2 = next();
    this.s3 = next();
    // A state of all zeros is a fixed point that only ever emits zero.
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1;
    this._spare = null;
    return this;
  }

  // Raw 32-bit draw.
  nextUint32() {
    const { s1 } = this;
    let result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;

    this.s2 ^= this.s0;
    this.s3 ^= s1;
    this.s1 = (s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);

    return result;
  }

  // Uniform in [0, 1). Divides by 2^32 so the result is exactly representable.
  next() {
    return this.nextUint32() / 4294967296;
  }

  // Uniform in [min, max).
  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // Standard normal via Marsaglia polar. The method produces two independent
  // samples per pass, so the unused one is cached — discarding it would double
  // the draws consumed and change the stream for anyone replaying the run.
  normal(mean = 0, stdDev = 1) {
    if (this._spare !== null) {
      const value = this._spare;
      this._spare = null;
      return mean + stdDev * value;
    }
    let u, v, s;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const scale = Math.sqrt((-2 * Math.log(s)) / s);
    this._spare = v * scale;
    return mean + stdDev * u * scale;
  }

  onUnitSphere(out = { x: 0, y: 0, z: 0 }) {
    const z = this.range(-1, 1);
    const theta = this.range(0, Math.PI * 2);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    out.x = r * Math.cos(theta);
    out.y = r * Math.sin(theta);
    out.z = z;
    return out;
  }

  // Snapshot/restore lets the recorder capture the generator alongside the
  // world so a replay resumed from mid-run draws the same numbers as the
  // original did from that point.
  save() {
    return [this.s0, this.s1, this.s2, this.s3, this._spare];
  }

  load(state) {
    [this.s0, this.s1, this.s2, this.s3, this._spare] = state;
    return this;
  }

  // Named sub-streams. A plugin that pulls wind noise from rng.fork('wind')
  // keeps its draws independent of one that pulls sensor noise, so adding a
  // consumer to one system does not shift the numbers the other one sees.
  fork(label) {
    let h = 0x811c9dc5;
    for (let i = 0; i < label.length; i++) {
      h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
    }
    return new Rng((h ^ this.s0) >>> 0);
  }
}

function rotl(x, k) {
  return (((x << k) | (x >>> (32 - k))) >>> 0);
}

export default Rng;
