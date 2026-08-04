// Rendering a Voice into actual sound.
//
// Every function here takes a BaseAudioContext rather than an AudioContext,
// which is what lets the exact same code drive live playback and an
// OfflineAudioContext render. The WAV you export is the arrangement you heard,
// not a second implementation that approximates it.

import { INSTRUMENTS, midiToHz, type Voice } from "./instruments";

export type TrackFX = {
  volume: number;
  pitch: number;
  bass: number;
  reverb: number;
  delay: number;
  pan: number;
  distortion: number;
  filter: number;
};

export const DEFAULT_FX: TrackFX = {
  volume: 80,
  pitch: 50,
  bass: 60,
  reverb: 15,
  delay: 0,
  pan: 50,
  distortion: 0,
  filter: 80,
};

export const FX_LABELS: Record<keyof TrackFX, string> = {
  volume: "VOL",
  pitch: "PTCH",
  bass: "BASS",
  reverb: "RVB",
  delay: "DLY",
  pan: "PAN",
  distortion: "DST",
  filter: "FLT",
};

export const DRUM_TRACKS = [
  { id: "kick", label: "KICK", color: "#2ff5d8" },
  { id: "snare", label: "SNARE", color: "#ff3d7f" },
  { id: "hihat_c", label: "HH-C", color: "#8b5cff" },
  { id: "hihat_o", label: "HH-O", color: "#ff8c42" },
  { id: "clap", label: "CLAP", color: "#2fa8ff" },
  { id: "tom_h", label: "TOM-H", color: "#ffd93d" },
  { id: "tom_l", label: "TOM-L", color: "#ff5fa2" },
  { id: "perc", label: "PERC", color: "#4ade80" },
] as const;

export type DrumId = (typeof DRUM_TRACKS)[number]["id"];

// ─── shared buffers ──────────────────────────────────────────────────────────

// Impulse responses and noise are expensive to build and identical every time,
// so they are made once per context rather than once per note.
const impulseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();

/**
 * A PeriodicWave carrying an instrument's whole harmonic spectrum.
 *
 * This replaced one OscillatorNode per partial. Eight oscillators per note
 * meant a sixteen-bar export built roughly ten thousand nodes and locked the
 * main thread for the better part of a minute; a periodic wave gets the same
 * spectrum out of a single oscillator, because producing an arbitrary harmonic
 * series is exactly what the node is for.
 *
 * Only valid for harmonic instruments. Bells and struck metal have partials at
 * non-integer ratios, which a Fourier series over integer harmonics cannot
 * represent, so those keep discrete oscillators.
 */
function harmonicWave(ctx: BaseAudioContext, instrument: string, partials: number[]): PeriodicWave {
  let perContext = waveCache.get(ctx);
  if (!perContext) {
    perContext = new Map();
    waveCache.set(ctx, perContext);
  }

  const cached = perContext.get(instrument);
  if (cached) return cached;

  // Index 0 is DC and must stay zero; index n is the nth harmonic.
  const real = new Float32Array(partials.length + 1);
  const imag = new Float32Array(partials.length + 1);
  partials.forEach((amplitude, i) => {
    imag[i + 1] = amplitude;
  });

  // disableNormalization: false lets the browser scale the result to a
  // consistent peak, so a bright instrument is not simply louder.
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perContext.set(instrument, wave);
  return wave;
}

function impulse(ctx: BaseAudioContext): AudioBuffer {
  const cached = impulseCache.get(ctx);
  if (cached) return cached;

  const length = Math.floor(ctx.sampleRate * 2.2);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
  }

  impulseCache.set(ctx, buffer);
  return buffer;
}

function noise(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;

  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  noiseCache.set(ctx, buffer);
  return buffer;
}

function noiseSource(ctx: BaseAudioContext, at: number, duration: number): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  // Start at a random offset so repeated hits are not bit-identical.
  const offset = Math.random() * (source.buffer.duration - duration - 0.01);
  source.start(at, Math.max(0, offset), duration + 0.01);
  return source;
}

// ─── pre-rendered percussion ─────────────────────────────────────────────────

/**
 * Noise-based percussion, baked once per context.
 *
 * A hi-hat built live is a buffer source through a highpass and a bandpass
 * into a gain — four nodes, and two of them biquads. At twenty hats per bar
 * over sixteen bars that is several hundred filters for one track, and it was
 * the single largest cost in a long export.
 *
 * Filtering the noise here in plain JavaScript instead, once, means each hit
 * becomes one buffer source and one gain. The filters are the standard
 * one-pole difference equations; for broadband noise shaped by an envelope
 * this is indistinguishable from the biquad version.
 */
type PercussionKind = "hihat_closed" | "hihat_open" | "clap" | "snare";

const percussionCache = new WeakMap<BaseAudioContext, Map<PercussionKind, AudioBuffer>>();

const PERCUSSION_SPEC: Record<PercussionKind, { duration: number; highpass: number; bandpass: number; decay: number }> = {
  hihat_closed: { duration: 0.055, highpass: 7200, bandpass: 10800, decay: 55 },
  hihat_open: { duration: 0.34, highpass: 7200, bandpass: 10800, decay: 9 },
  clap: { duration: 0.13, highpass: 1200, bandpass: 1750, decay: 26 },
  snare: { duration: 0.2, highpass: 900, bandpass: 1700, decay: 18 },
};

function percussion(ctx: BaseAudioContext, kind: PercussionKind): AudioBuffer {
  let perContext = percussionCache.get(ctx);
  if (!perContext) {
    perContext = new Map();
    percussionCache.set(ctx, perContext);
  }

  const cached = perContext.get(kind);
  if (cached) return cached;

  const spec = PERCUSSION_SPEC[kind];
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * spec.duration));
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);

  // One-pole coefficients from the cutoff frequencies.
  const hpAlpha = 1 / (1 + (2 * Math.PI * spec.highpass) / rate);
  const bpAlpha = (2 * Math.PI * spec.bandpass) / rate / (1 + (2 * Math.PI * spec.bandpass) / rate);

  let lastIn = 0;
  let hp = 0;
  let bp = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    hp = hpAlpha * (hp + white - lastIn);
    lastIn = white;
    // Resonant-ish peak: a low-pass of the high-passed signal, subtracted to
    // leave a band.
    bp += bpAlpha * (hp - bp);
    data[i] = (hp * 0.65 + bp * 0.85) * Math.exp((-i / rate) * spec.decay);
  }

  perContext.set(kind, buffer);
  return buffer;
}

/** One-shot a baked percussion buffer: one source, one gain. */
function firePercussion(
  ctx: BaseAudioContext,
  dest: AudioNode,
  kind: PercussionKind,
  at: number,
  gain: number,
  offset = 0,
) {
  const source = ctx.createBufferSource();
  source.buffer = percussion(ctx, kind);
  // Small random rate variation so a run of sixteenth hats is not one sample
  // repeated, which is what makes a machine hat sound like a machine.
  source.playbackRate.value = 0.94 + Math.random() * 0.12;

  const env = ctx.createGain();
  env.gain.value = gain;
  source.connect(env);
  env.connect(dest);
  source.start(at + offset);
}

/** A soft-clip curve. k = 0 is transparent; higher k is more aggressive. */
function distortionCurve(k: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(1024 * 4));
  for (let i = 0; i < 1024; i++) {
    const x = (i * 2) / 1023 - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ─── channel strip ───────────────────────────────────────────────────────────

export type Sends = { reverb: GainNode; delay: GainNode };

/**
 * Build a channel: filter → distortion → tone shelf → pan → output, plus the
 * two aux sends. Returns the node voices should play into.
 *
 * One of these per track, not one per hit. Building the strip per note meant a
 * sixteen-bar render allocated tens of thousands of filters, panners and
 * shapers, and took the better part of a minute; per track it is a few dozen
 * nodes for the whole song.
 */
export function createChannel(
  ctx: BaseAudioContext,
  destination: AudioNode,
  fx: TrackFX,
  sends: Sends | null,
): AudioNode {
  const out = ctx.createGain();
  out.gain.value = 1;

  const panner = ctx.createStereoPanner();
  panner.pan.value = (fx.pan - 50) / 50;
  out.connect(panner);
  panner.connect(destination);

  // Sends tap the post-pan signal so a hard-panned hit keeps its position in
  // the reverb tail rather than collapsing to the centre.
  if (sends) {
    if (fx.reverb > 1) {
      const send = ctx.createGain();
      send.gain.value = (fx.reverb / 100) * 0.7;
      panner.connect(send);
      send.connect(sends.reverb);
    }
    if (fx.delay > 1) {
      const send = ctx.createGain();
      send.gain.value = (fx.delay / 100) * 0.6;
      panner.connect(send);
      send.connect(sends.delay);
    }
  }

  // Low shelf, centred so 60 on the knob is flat.
  const shelf = ctx.createBiquadFilter();
  shelf.type = "lowshelf";
  shelf.frequency.value = 180;
  shelf.gain.value = (fx.bass - 60) * 0.32;
  shelf.connect(out);

  let head: AudioNode = shelf;

  if (fx.distortion > 2) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve((fx.distortion / 100) * 260);
    shaper.oversample = "2x";
    // Drive up into the curve, then pull back down, so turning up distortion
    // adds harmonics instead of just adding volume.
    const drive = ctx.createGain();
    drive.gain.value = 1 + (fx.distortion / 100) * 2.4;
    const trim = ctx.createGain();
    trim.gain.value = 1 / (1 + (fx.distortion / 100) * 1.5);

    drive.connect(shaper);
    shaper.connect(trim);
    trim.connect(shelf);
    head = drive;
  }

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  // Exponential, because pitch is perceived logarithmically: a linear cutoff
  // knob spends most of its travel in a range that all sounds the same.
  // 0 → 120 Hz, 100 → ~18 kHz.
  lowpass.frequency.value = 120 * 2 ** ((fx.filter / 100) * 7.2);
  lowpass.Q.value = 0.8;
  lowpass.connect(head);

  return lowpass;
}

// ─── drum voices ─────────────────────────────────────────────────────────────

function kick(ctx: BaseAudioContext, dest: AudioNode, at: number, gain: number, fx: TrackFX) {
  const bend = (fx.pitch - 50) * 0.6;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(175 + bend, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(24, 30 + bend * 0.2), at + 0.42);
  env.gain.setValueAtTime(gain * 1.25, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
  osc.connect(env);
  env.connect(dest);
  osc.start(at);
  osc.stop(at + 0.52);

  // The click is what makes a kick audible on a phone speaker that cannot
  // reproduce the fundamental at all.
  const click = ctx.createOscillator();
  const clickEnv = ctx.createGain();
  click.type = "triangle";
  click.frequency.value = 1500;
  clickEnv.gain.setValueAtTime(gain * 0.55, at);
  clickEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.013);
  click.connect(clickEnv);
  clickEnv.connect(dest);
  click.start(at);
  click.stop(at + 0.02);
}

function snare(ctx: BaseAudioContext, dest: AudioNode, at: number, gain: number, fx: TrackFX) {
  firePercussion(ctx, dest, "snare", at, gain * 0.8);

  const body = ctx.createOscillator();
  const bodyEnv = ctx.createGain();
  body.frequency.value = 185 + (fx.pitch - 50) * 0.5;
  bodyEnv.gain.setValueAtTime(gain * 0.32, at);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
  body.connect(bodyEnv);
  bodyEnv.connect(dest);
  body.start(at);
  body.stop(at + 0.1);
}

function hihat(ctx: BaseAudioContext, dest: AudioNode, at: number, open: boolean, gain: number) {
  firePercussion(ctx, dest, open ? "hihat_open" : "hihat_closed", at, gain * 0.6);
}

function clap(ctx: BaseAudioContext, dest: AudioNode, at: number, gain: number) {
  // Four bursts slightly out of sync — a clap is several pairs of hands, and a
  // single burst just sounds like a snare.
  for (const [i, offset] of [0, 0.009, 0.019, 0.03].entries()) {
    firePercussion(ctx, dest, "clap", at, i === 3 ? gain : gain * 0.42, offset);
  }
}

function tom(ctx: BaseAudioContext, dest: AudioNode, at: number, high: boolean, gain: number, fx: TrackFX) {
  const base = high ? 220 : 108;
  const bend = (fx.pitch - 50) * 0.9;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime((base + bend) * 1.45, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(26, base * 0.42), at + 0.3);
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.36);
  osc.connect(env);
  env.connect(dest);
  osc.start(at);
  osc.stop(at + 0.4);
}

function perc(ctx: BaseAudioContext, dest: AudioNode, at: number, gain: number, fx: TrackFX) {
  const freq = 340 + (fx.pitch / 100) * 900;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq * 2.1, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.32, at + 0.1);
  env.gain.setValueAtTime(gain * 0.85, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
  osc.connect(env);
  env.connect(dest);
  osc.start(at);
  osc.stop(at + 0.17);
}

const DRUM_VOICES: Record<DrumId, (c: BaseAudioContext, d: AudioNode, t: number, g: number, fx: TrackFX) => void> = {
  kick,
  snare,
  hihat_c: (c, d, t, g) => hihat(c, d, t, false, g),
  hihat_o: (c, d, t, g) => hihat(c, d, t, true, g),
  clap: (c, d, t, g) => clap(c, d, t, g),
  tom_h: (c, d, t, g, fx) => tom(c, d, t, true, g, fx),
  tom_l: (c, d, t, g, fx) => tom(c, d, t, false, g, fx),
  perc,
};

/**
 * Trigger one drum hit into a prepared channel. `sample`, when present,
 * replaces the synthesised voice.
 */
export function playDrum(
  ctx: BaseAudioContext,
  input: AudioNode,
  id: DrumId,
  at: number,
  fx: TrackFX,
  sample?: AudioBuffer,
) {
  const gain = (fx.volume / 100) * 0.85;
  if (gain <= 0) return;

  if (sample) {
    const source = ctx.createBufferSource();
    source.buffer = sample;
    // The pitch knob becomes playback rate for a sample, which is the only
    // honest interpretation without a time-stretch implementation.
    source.playbackRate.value = 2 ** (((fx.pitch - 50) / 50) * 0.6);
    const env = ctx.createGain();
    env.gain.value = gain;
    source.connect(env);
    env.connect(input);
    source.start(at);
    return;
  }

  DRUM_VOICES[id](ctx, input, at, gain, fx);
}

// ─── melodic voices ──────────────────────────────────────────────────────────

/** Oscillator shape best suited to each archetype's spectrum. */
function shapeFor(voice: Voice): OscillatorType {
  switch (voice.archetype) {
    case "sub":
      return "sine";
    case "blow":
    case "bow":
      return "sawtooth";
    case "lead":
      return "sawtooth";
    default:
      return "sine";
  }
}

/**
 * Trigger one pitched note.
 *
 * Additive rather than subtractive: each partial in the voice gets its own
 * oscillator at the right multiple of the fundamental with its own amplitude.
 * That is what lets a bell's inharmonic partials and a pipe's odd-harmonic
 * spectrum come out sounding like a bell and a pipe.
 */
export function playNote(
  ctx: BaseAudioContext,
  input: AudioNode,
  instrument: string,
  midi: number,
  at: number,
  duration: number,
  fx: TrackFX,
  velocity = 1,
) {
  const voice = INSTRUMENTS[instrument];
  if (!voice) return;

  const gain = (fx.volume / 100) * 0.5 * velocity;
  if (gain <= 0) return;

  // The pitch knob is a ±6-semitone bend on top of the note itself.
  const bend = ((fx.pitch - 50) / 50) * 6;
  const fundamental = midiToHz(midi + (voice.transpose ?? 0) + bend);

  const attack = voice.attack;
  const decay = voice.decay;
  const sustainLevel = voice.sustain;
  const release = voice.release;
  const held = Math.max(0.05, duration);
  const end = at + held + release;

  // Voice-level amplitude envelope, shared by every partial.
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);

  if (sustainLevel > 0.01) {
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * sustainLevel), at + attack + decay);
    amp.gain.setValueAtTime(Math.max(0.0002, gain * sustainLevel), at + held);
  } else {
    // Percussive: decay straight to silence and ignore the held length, which
    // is what makes a plucked string sound plucked.
    amp.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  // Brightness tracks the envelope: acoustic instruments are brightest at the
  // attack and darken as they decay.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.Q.value = 0.7;
  tone.frequency.setValueAtTime(Math.min(18000, voice.brightness * 1.6), at);
  tone.frequency.exponentialRampToValueAtTime(Math.max(200, voice.brightness * 0.45), end);

  amp.connect(tone);
  tone.connect(input);

  // Optional vibrato, shared across every partial so they stay in tune.
  let vibrato: OscillatorNode | null = null;
  let vibratoDepth: GainNode | null = null;
  if (voice.vibrato) {
    const [cents, rate] = voice.vibrato;
    vibrato = ctx.createOscillator();
    vibrato.frequency.value = rate;
    vibratoDepth = ctx.createGain();
    // Depth is in cents, so it has to be scaled per partial; this holds the
    // ratio and each partial multiplies by its own frequency.
    vibratoDepth.gain.value = cents / 1200;
    vibrato.connect(vibratoDepth);
    vibrato.start(at);
    vibrato.stop(end);
  }

  const detune = voice.detune ?? 0;

  // Bells and struck metal are inharmonic: their partials array holds literal
  // frequency ratios rather than amplitudes, because that spacing is the whole
  // reason a bell sounds like a bell. Everything else is harmonic and can be
  // one oscillator carrying a periodic wave.
  const inharmonic = voice.archetype === "bell" || voice.archetype === "metal";

  const attachVibrato = (osc: OscillatorNode, frequency: number) => {
    if (!vibratoDepth) return;
    // The shared depth node holds a ratio; scaling it by this oscillator's own
    // frequency turns it into the right number of Hz for this partial.
    const scaled = ctx.createGain();
    scaled.gain.value = frequency;
    vibratoDepth.connect(scaled);
    scaled.connect(osc.frequency);
  };

  if (inharmonic) {
    voice.partials.forEach((ratio, index) => {
      const level = 1 / (index + 1) ** 1.3;
      const frequency = fundamental * ratio;
      // Above Nyquist a partial aliases back down as an audible wrong pitch.
      if (frequency > ctx.sampleRate / 2.2) return;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      attachVibrato(osc, frequency);

      const partialGain = ctx.createGain();
      partialGain.gain.value = level / Math.sqrt(voice.partials.length);
      osc.connect(partialGain);
      partialGain.connect(amp);
      osc.start(at);
      osc.stop(end);
    });
  } else {
    // A sub is a pure sine and gains nothing from a wavetable.
    const wave = voice.archetype === "sub" ? null : harmonicWave(ctx, instrument, voice.partials);

    // A detuned voice needs two oscillators — that beating between them is the
    // entire effect. Everything else runs on one.
    const stack = detune ? [-detune, detune] : [0];
    stack.forEach((cents) => {
      const osc = ctx.createOscillator();
      if (wave) osc.setPeriodicWave(wave);
      else osc.type = shapeFor(voice);
      osc.frequency.value = fundamental;
      if (cents) osc.detune.value = cents;
      attachVibrato(osc, fundamental);

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1 / stack.length;
      osc.connect(voiceGain);
      voiceGain.connect(amp);
      osc.start(at);
      osc.stop(end);
    });
  }

  // Breath, bow and pick noise, shaped to the same envelope but shorter.
  if (voice.noise) {
    const noiseDuration = Math.min(held + release, voice.archetype === "blow" || voice.archetype === "bow" ? held : 0.09);

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = Math.min(12000, fundamental * 3.5);
    band.Q.value = 0.6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * voice.noise * 0.5), at + Math.max(0.004, attack));
    env.gain.exponentialRampToValueAtTime(0.0001, at + noiseDuration);

    noiseSource(ctx, at, noiseDuration).connect(band);
    band.connect(env);
    env.connect(input);
  }
}

// ─── master bus ──────────────────────────────────────────────────────────────

export type Bus = {
  master: GainNode;
  sends: Sends;
  delayNode: DelayNode;
};

/** Build master compression, reverb and a tempo-synced delay onto a destination. */
export function createBus(ctx: BaseAudioContext, destination: AudioNode, bpm: number): Bus {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  compressor.connect(destination);

  const master = ctx.createGain();
  // 0.8 rendered a full arrangement right at digital full scale — a handful of
  // samples clipped at exactly 1.0. This leaves headroom under the ceiling.
  master.gain.value = 0.7;
  master.connect(compressor);

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse(ctx);
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.36;
  convolver.connect(reverbWet);
  reverbWet.connect(master);
  const reverbIn = ctx.createGain();
  reverbIn.connect(convolver);

  // A dotted eighth, the delay time that makes a repeat land between the
  // beats instead of doubling them.
  const delayNode = ctx.createDelay(2);
  delayNode.delayTime.value = (60 / bpm) * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.34;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 3200;
  delayNode.connect(damp);
  damp.connect(feedback);
  feedback.connect(delayNode);
  const delayWet = ctx.createGain();
  delayWet.gain.value = 0.42;
  delayNode.connect(delayWet);
  delayWet.connect(master);
  const delayIn = ctx.createGain();
  delayIn.connect(delayNode);

  return { master, sends: { reverb: reverbIn, delay: delayIn }, delayNode };
}

// ─── WAV ─────────────────────────────────────────────────────────────────────

export function encodeWAV(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const dataBytes = length * channels * 2;

  const out = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(out);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  // Pull each channel out once rather than calling getChannelData per sample.
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: "audio/wav" });
}
