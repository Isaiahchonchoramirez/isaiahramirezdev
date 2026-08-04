// The transport: audio graph, scheduler, metering, export and recording.
//
// Kept out of React on purpose. Audio scheduling has to run ahead of the
// clock on a fixed lookahead, and driving that from render state means every
// dropped frame is an audible glitch. React reads from here; it never
// schedules.

import { degreeToMidi } from "./instruments";
import { STEPS, type DrumPattern, type MelodyPattern } from "./generate";
import {
  createBus, createChannel, encodeWAV, playDrum, playNote, DRUM_TRACKS,
  type Bus, type DrumId, type Sends, type TrackFX,
} from "./synth";

/**
 * Per-track channel strips, rebuilt only when that track's settings change.
 *
 * A strip is a panner, two filters, a shaper and the send taps; building one
 * per hit is what made a long export take the better part of a minute.
 */
class Channels {
  private cache = new Map<string, { input: AudioNode; fx: TrackFX }>();

  constructor(
    private ctx: BaseAudioContext,
    private destination: AudioNode,
    private sends: Sends | null,
  ) {}

  for(id: string, fx: TrackFX): AudioNode {
    const existing = this.cache.get(id);
    // Compare by value, not identity: React hands us a fresh object on every
    // render even when nothing about the channel actually moved.
    if (existing && sameFX(existing.fx, fx)) return existing.input;

    const input = createChannel(this.ctx, this.destination, fx, this.sends);
    this.cache.set(id, { input, fx: { ...fx } });
    return input;
  }
}

function sameFX(a: TrackFX, b: TrackFX): boolean {
  return (
    a.volume === b.volume &&
    a.pitch === b.pitch &&
    a.bass === b.bass &&
    a.reverb === b.reverb &&
    a.delay === b.delay &&
    a.pan === b.pan &&
    a.distortion === b.distortion &&
    a.filter === b.filter
  );
}

/** Everything the scheduler needs to render one step. Read fresh every tick. */
export type Song = {
  bpm: number;
  drums: DrumPattern;
  melody: MelodyPattern;
  genre: string;
  instrument: string;
  drumFX: Record<string, TrackFX>;
  melodyFX: TrackFX;
  /** Which of the 16 arrangement bars play, in order. */
  arrangement: boolean[];
  muted: Record<string, boolean>;
  samples: Record<string, AudioBuffer | undefined>;
};

// Schedule this far ahead of the audio clock. Long enough to survive a stalled
// frame, short enough that a knob turn is heard almost immediately.
const LOOKAHEAD = 0.12;
const TICK_MS = 25;

export class Engine {
  private ctx: AudioContext | null = null;
  private bus: Bus | null = null;
  private analyser: AnalyserNode | null = null;
  private channels: Channels | null = null;
  // Explicitly ArrayBuffer-backed: getByteFrequencyData will not accept a view
  // that might sit on a SharedArrayBuffer.
  private analyserData = new Uint8Array(new ArrayBuffer(0));

  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  /** Index into the *active* bars of the arrangement. */
  private barIndex = 0;
  private scheduled: { step: number; bar: number; time: number }[] = [];

  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private getSong: () => Song;

  constructor(getSong: () => Song) {
    this.getSong = getSong;
  }

  /** Create the context on first use — browsers require a user gesture. */
  init(): AudioContext {
    if (this.ctx) {
      void this.ctx.resume();
      return this.ctx;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.analyser = analyser;
    this.analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    this.bus = createBus(ctx, analyser, this.getSong().bpm);
    this.channels = new Channels(ctx, this.bus.master, this.bus.sends);

    return ctx;
  }

  get context() {
    return this.ctx;
  }

  /** Preview a single instrument note, for clicking around the sound library. */
  audition(instrument: string, degree = 0) {
    const ctx = this.init();
    const song = this.getSong();
    playNote(
      ctx,
      this.channels!.for("melody", song.melodyFX),
      instrument,
      degreeToMidi(song.genre, degree),
      ctx.currentTime + 0.02,
      0.5,
      song.melodyFX,
    );
  }

  auditionDrum(id: DrumId) {
    const ctx = this.init();
    const song = this.getSong();
    playDrum(ctx, this.channels!.for(id, song.drumFX[id]), id, ctx.currentTime + 0.02, song.drumFX[id], song.samples[id]);
  }

  start() {
    const ctx = this.init();
    void ctx.resume();

    this.step = 0;
    this.barIndex = 0;
    this.scheduled = [];
    this.nextNoteTime = ctx.currentTime + 0.06;

    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.scheduled = [];
  }

  private tick() {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;

    const song = this.getSong();
    const activeBars = song.arrangement.reduce<number[]>((acc, on, i) => (on ? [...acc, i] : acc), []);
    // An empty arrangement would divide by zero below; treat it as one bar.
    const bars = activeBars.length > 0 ? activeBars : [0];

    bus.delayNode.delayTime.value = (60 / song.bpm) * 0.75;
    const stepDuration = 60 / song.bpm / 4;

    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      const step = this.step;
      const at = this.nextNoteTime;
      const bar = bars[this.barIndex % bars.length];

      for (const track of DRUM_TRACKS) {
        if (song.muted[track.id]) continue;
        if (song.drums[track.id]?.[step]) {
          const fx = song.drumFX[track.id];
          playDrum(ctx, this.channels!.for(track.id, fx), track.id, at, fx, song.samples[track.id]);
        }
      }

      if (!song.muted.melody) {
        const degree = song.melody[step];
        if (degree !== null && degree !== undefined) {
          // Hold the note until the next written note or rest, so a line of
          // sustained instruments legatos instead of machine-gunning.
          let length = 1;
          while (length < 4 && song.melody[(step + length) % STEPS] === null) length++;
          playNote(
            ctx,
            this.channels!.for("melody", song.melodyFX),
            song.instrument,
            degreeToMidi(song.genre, degree),
            at,
            length * stepDuration * 0.9,
            song.melodyFX,
          );
        }
      }

      this.scheduled.push({ step, bar, time: at });
      this.nextNoteTime += stepDuration;
      this.step = (step + 1) % STEPS;
      if (this.step === 0) this.barIndex++;
    }
  }

  /**
   * Where the transport actually is right now, for the playhead. Derived from
   * the audio clock rather than a React interval, so the highlight lines up
   * with what you hear.
   */
  position(): { step: number; bar: number } | null {
    const ctx = this.ctx;
    if (!ctx || this.timer === null) return null;

    const now = ctx.currentTime;
    let current: { step: number; bar: number } | null = null;
    for (const entry of this.scheduled) {
      if (entry.time <= now + 0.01) current = { step: entry.step, bar: entry.bar };
    }
    this.scheduled = this.scheduled.filter((entry) => entry.time > now - 0.2);

    return current;
  }

  /** Twelve-band spectrum, 0–1 per band, straight off the analyser. */
  levels(bands = 12): number[] {
    const analyser = this.analyser;
    if (!analyser) return Array(bands).fill(0);

    analyser.getByteFrequencyData(this.analyserData);

    const out: number[] = [];
    // Logarithmic band edges: linear FFT bins put eleven of twelve bars in the
    // treble, where there is almost nothing to show.
    const binCount = this.analyserData.length;
    for (let b = 0; b < bands; b++) {
      const from = Math.floor(binCount ** (b / bands)) - 1;
      const to = Math.floor(binCount ** ((b + 1) / bands));
      let peak = 0;
      for (let i = Math.max(0, from); i < Math.min(binCount, Math.max(to, from + 1)); i++) {
        peak = Math.max(peak, this.analyserData[i]);
      }
      out.push(peak / 255);
    }
    return out;
  }

  async decodeSample(file: File): Promise<AudioBuffer> {
    const ctx = this.init();
    return ctx.decodeAudioData(await file.arrayBuffer());
  }

  // ─── recording ─────────────────────────────────────────────────────────────

  get isRecording() {
    return this.recorder !== null;
  }

  /**
   * Capture the live output, including anything tweaked while it runs. This is
   * genuinely different from export: export re-renders the arrangement offline
   * and is always clean, whereas this is a performance.
   */
  startRecording(onStop: (blob: Blob) => void) {
    const ctx = this.init();
    if (this.recorder) return;

    const destination = ctx.createMediaStreamDestination();
    this.analyser!.connect(destination);

    // Opus in a WebM container is the one format every browser that supports
    // MediaRecorder can actually produce.
    const recorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm" });
    this.recordedChunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };
    recorder.onstop = () => {
      onStop(new Blob(this.recordedChunks, { type: "audio/webm" }));
      this.analyser!.disconnect(destination);
      this.recorder = null;
    };

    recorder.start();
    this.recorder = recorder;
  }

  stopRecording() {
    this.recorder?.stop();
  }

  // ─── offline export ────────────────────────────────────────────────────────

  /**
   * Render the whole arrangement offline and return a WAV.
   *
   * This walks the same playDrum/playNote functions the live scheduler uses,
   * against an OfflineAudioContext, so what lands on disk is what was heard —
   * not a second, drifting implementation of the same song.
   */
  async export(song: Song): Promise<Blob> {
    const activeBars = song.arrangement.filter(Boolean).length || 1;
    const stepDuration = 60 / song.bpm / 4;
    // Two bars of 4/4 per pattern pass, plus tail for the reverb and delay.
    const total = activeBars * STEPS * stepDuration + 3;

    const offline = new OfflineAudioContext(2, Math.ceil(total * 44100), 44100);
    const bus = createBus(offline, offline.destination, song.bpm);
    const channels = new Channels(offline, bus.master, bus.sends);

    let cursor = 0;
    for (let bar = 0; bar < song.arrangement.length; bar++) {
      if (!song.arrangement[bar]) continue;

      for (let step = 0; step < STEPS; step++) {
        const at = cursor + step * stepDuration;

        for (const track of DRUM_TRACKS) {
          if (song.muted[track.id]) continue;
          if (song.drums[track.id]?.[step]) {
            const fx = song.drumFX[track.id];
            playDrum(offline, channels.for(track.id, fx), track.id, at, fx, song.samples[track.id]);
          }
        }

        if (!song.muted.melody) {
          const degree = song.melody[step];
          if (degree !== null && degree !== undefined) {
            let length = 1;
            while (length < 4 && song.melody[(step + length) % STEPS] === null) length++;
            playNote(
              offline,
              channels.for("melody", song.melodyFX),
              song.instrument,
              degreeToMidi(song.genre, degree),
              at,
              length * stepDuration * 0.9,
              song.melodyFX,
            );
          }
        }
      }

      cursor += STEPS * stepDuration;
    }

    return encodeWAV(await offline.startRendering());
  }

  dispose() {
    this.stop();
    this.stopRecording();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke on the next turn so the download has actually started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
