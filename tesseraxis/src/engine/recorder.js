// Telemetry capture and replay.
//
// Two separate things live here, and the distinction matters:
//
//   Telemetry is what a run *reported* — altitude, thrust, gimbal angle. It
//   feeds the graphs and the CSV export. It is lossy by design.
//
//   The journal is what a run *was* — seed, parameters, and the exact sequence
//   of control inputs, keyframed with world snapshots. Because the engine is
//   deterministic, replaying the journal reproduces the run bit for bit; the
//   telemetry is a byproduct, not the source of truth. This is why scrubbing
//   the timeline backwards is honest here rather than an animation: seeking
//   restores the nearest keyframe and re-simulates forward.

const MAX_SAMPLES = 262144; // ~36 min at 120 Hz before the first decimation

export class Channel {
  constructor(key, options = {}) {
    this.key = key;
    this.label = options.label || key;
    this.unit = options.unit || '';
    this.group = options.group || 'general';
    this.color = options.color || null;
    this.precision = options.precision ?? 2;
    // Fixed axis bounds when a quantity has a meaningful range (throttle is
    // 0–1 whatever the run does); null means autoscale.
    this.min = options.min ?? null;
    this.max = options.max ?? null;

    this.data = new Float32Array(1024);
    this.length = 0;
    this.latest = 0;
  }

  push(value) {
    if (this.length >= this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data[this.length++] = value;
    this.latest = value;
  }

  // Throws away every other sample, halving resolution in place. Called when a
  // run outlives the sample budget — a long run degrades smoothly instead of
  // either truncating (losing the end, which is the interesting part) or
  // growing until the tab dies.
  decimate() {
    const half = this.length >> 1;
    for (let i = 0; i < half; i++) this.data[i] = this.data[i * 2];
    this.length = half;
  }

  clear() {
    this.length = 0;
    this.latest = 0;
  }

  // Min/max over a window, for graph autoscaling.
  extent(from = 0, to = this.length) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i < to; i++) {
      const v = this.data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (lo === Infinity) return [0, 1];
    // A dead-flat channel would otherwise render as a divide-by-zero.
    if (hi - lo < 1e-9) return [lo - 0.5, hi + 0.5];
    return [lo, hi];
  }
}

export class Recorder {
  constructor({ sampleEvery = 2, keyframeEvery = 600 } = {}) {
    // Telemetry is sampled every N ticks. At the default 120 Hz tick and
    // sampleEvery = 2 that is 60 samples a second, which is finer than any
    // graph can resolve on screen and small enough to export comfortably.
    this.sampleEvery = sampleEvery;
    this.keyframeEvery = keyframeEvery;

    this.channels = new Map();
    this.times = new Float32Array(1024);
    this.sampleCount = 0;
    this.decimations = 0;

    this.events = [];
    this.inputs = [];
    this.keyframes = [];
    this._inputCursor = 0;

    this.enabled = true;
    this.meta = { seed: 0, plugin: null, params: null, startedAt: null };
  }

  defineChannel(key, options) {
    let channel = this.channels.get(key);
    if (!channel) {
      channel = new Channel(key, options);
      this.channels.set(key, channel);
    }
    return channel;
  }

  channel(key) {
    return this.channels.get(key);
  }

  // Called by plugins during the 'post' phase. Values written between samples
  // are simply the ones not kept — the last write before a sample boundary is
  // what lands, which matches how a real data acquisition system samples a
  // continuous signal.
  write(key, value) {
    const channel = this.channels.get(key);
    if (channel) channel.latest = value;
  }

  writeMany(values) {
    for (const key in values) this.write(key, values[key]);
  }

  // Commits one sample row across every channel. Rows stay aligned by
  // construction, so column i of every channel is the same instant.
  sample(time, tick) {
    if (!this.enabled) return;
    if (tick % this.sampleEvery !== 0) return;

    if (this.sampleCount >= MAX_SAMPLES) {
      this._decimate();
    }

    if (this.sampleCount >= this.times.length) {
      const grown = new Float32Array(this.times.length * 2);
      grown.set(this.times);
      this.times = grown;
    }
    this.times[this.sampleCount++] = time;
    for (const channel of this.channels.values()) channel.push(channel.latest);
  }

  _decimate() {
    const half = this.sampleCount >> 1;
    for (let i = 0; i < half; i++) this.times[i] = this.times[i * 2];
    this.sampleCount = half;
    for (const channel of this.channels.values()) channel.decimate();
    this.sampleEvery *= 2;
    this.decimations++;
  }

  logEvent(tick, time, type, label, payload = null) {
    this.events.push({ tick, time, type, label, payload });
  }

  // Records a control input against the tick it took effect on. Replay applies
  // these at exactly the same tick, which is the whole basis of reproducibility
  // — the inputs are the only thing about a run that is not a pure function of
  // the seed and the parameters.
  logInput(tick, action, value) {
    this.inputs.push({ tick, action, value });
  }

  inputsForTick(tick) {
    // Runs are short and inputs are sparse; a linear scan here would be fine,
    // but keeping a cursor makes replay O(n) overall rather than O(n²).
    const out = [];
    // `<=` rather than `===` so an input recorded against a tick that a seek
    // stepped past is still applied rather than being stranded forever and
    // desynchronising everything after it.
    while (
      this._inputCursor < this.inputs.length &&
      this.inputs[this._inputCursor].tick <= tick
    ) {
      out.push(this.inputs[this._inputCursor++]);
    }
    return out;
  }

  // Drops everything recorded after `tick`. Used when the timeline is scrubbed
  // back and the run is re-simulated forward — the samples ahead of the
  // playhead describe a future that is about to be recomputed, and keeping
  // them would leave the graphs showing two runs spliced together.
  truncateToTick(tick, time) {
    let keep = this.sampleCount;
    while (keep > 0 && this.times[keep - 1] > time) keep--;
    this.sampleCount = keep;
    for (const channel of this.channels.values()) channel.length = keep;

    while (this.events.length > 0 && this.events[this.events.length - 1].tick > tick) {
      this.events.pop();
    }
    while (this.keyframes.length > 0 && this.keyframes[this.keyframes.length - 1].tick > tick) {
      this.keyframes.pop();
    }
  }

  // Discards scripted inputs after `tick`. Called when the user takes manual
  // control mid-replay: from that instant the recording is theirs, the way
  // recording over a tape works.
  truncateInputsAfter(tick) {
    let keep = this.inputs.length;
    while (keep > 0 && this.inputs[keep - 1].tick > tick) keep--;
    this.inputs.length = keep;
  }

  // Positions the replay cursor at the first input due on or after `tick`.
  seekInputCursor(tick) {
    this._inputCursor = 0;
    while (
      this._inputCursor < this.inputs.length &&
      this.inputs[this._inputCursor].tick < tick
    ) {
      this._inputCursor++;
    }
  }

  keyframe(tick, snapshot) {
    this.keyframes.push({ tick, snapshot });
  }

  // Nearest keyframe at or before `tick`. Binary search because scrubbing
  // drags across the timeline and calls this every pointer move.
  keyframeAtOrBefore(tick) {
    let lo = 0;
    let hi = this.keyframes.length - 1;
    let best = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.keyframes[mid].tick <= tick) {
        best = this.keyframes[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  // Index into the sample arrays for a given simulated time.
  indexAtTime(time) {
    let lo = 0;
    let hi = this.sampleCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.times[mid] < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  get duration() {
    return this.sampleCount > 0 ? this.times[this.sampleCount - 1] : 0;
  }

  reset(meta = {}) {
    for (const channel of this.channels.values()) channel.clear();
    this.sampleCount = 0;
    this.decimations = 0;
    this.events.length = 0;
    this.inputs.length = 0;
    this.keyframes.length = 0;
    this._inputCursor = 0;
    this.meta = { ...this.meta, ...meta, startedAt: new Date().toISOString() };
  }

  rewindInputCursor() {
    this._inputCursor = 0;
  }

  // Everything needed to reconstruct the run elsewhere. Deliberately excludes
  // the telemetry: a journal plus this build reproduces the telemetry, and
  // shipping both would let the two disagree.
  toJournal() {
    return {
      format: 'tesseraxis-journal/1',
      meta: this.meta,
      inputs: this.inputs,
      events: this.events.map(({ tick, time, type, label }) => ({ tick, time, type, label })),
    };
  }
}

export default Recorder;
