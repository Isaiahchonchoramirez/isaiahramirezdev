# RAVE.IO

A beat machine that runs in a browser tab. Every sound is synthesised from an
oscillator up — there are no samples shipped with it, and nothing is uploaded.

Pick a genre, and the drum grid, the melody roll and the tempo all follow it.
Write a pattern, tune each channel, arrange up to sixteen bars, and render the
result to a WAV.

The layout started as a Figma Make export. The audio engine is new.

## What changed from the export

The original was a convincing screenshot with a working drum machine hidden
inside it. These were the gaps:

| Was | Now |
| --- | --- |
| The 56-instrument sound library was decoration — picking Tabla or Pedal Steel changed nothing | Every instrument is a real voice. Selecting one loads it, previews it, and plays it on the melody roll |
| No pitched instruments at all, despite the instrument lists | A melody roll whose rows are the selected genre's scale, so every square is in key |
| "AI BEAT" wrote one hardcoded pattern regardless of genre | Seven genre rhythms taken from how each style is actually played, plus a melodic generator that walks the scale |
| The 16-bar song arrangement did nothing | Active bars drive both playback and the exported render |
| The master meter was a hardcoded array of twelve numbers | A real `AnalyserNode` with log-spaced bands |
| The record button did nothing | Records the live output through a `MediaStreamDestination` |
| Semantic colour tokens were the stock **light** shadcn palette — `text-primary` was near-black under a cyan glow | A dark palette where the tokens mean what the design intends |
| Mouse-only knobs, fixed-width panels | Keyboard and touch on every control, panels that collapse to a drawer |

## The engine

| Piece | Where |
| --- | --- |
| 56 instruments across 8 synthesis archetypes, 7 genre scales | `src/app/audio/instruments.ts` |
| Voice rendering, channel strips, master bus, WAV encoder | `src/app/audio/synth.ts` |
| Transport, scheduler, metering, recording, offline export | `src/app/audio/engine.ts` |
| Genre rhythms and melodic generation | `src/app/audio/generate.ts` |

### Instruments

Eight archetypes — pluck, bow, blow, bell, membrane, metal, pad, lead, sub —
each with its own spectrum, envelope, brightness, detune, breath noise and
vibrato. An instrument is a line of data against an archetype rather than a
bespoke function, which is roughly how a synthesist works and means adding one
costs a line.

Harmonic instruments run on a single oscillator carrying a `PeriodicWave` built
from their partials. Bells and struck metal keep discrete oscillators, because
their partials sit at non-integer ratios that a Fourier series over integer
harmonics cannot represent — which is exactly why a bell sounds like a bell.

### Scales

Each genre carries a scale, a root and a tempo:

- Wet/808 — natural minor
- Techno — Phrygian, for the flat second
- Indian — Raga Bhairav
- Rock — minor pentatonic
- Country — major pentatonic
- Arabic — Maqam Hijaz
- Celtic — Dorian

The melody roll exposes only those degrees, so there is no wrong note to click.

### Scheduling

The transport lives outside React. Audio is scheduled 120 ms ahead of the clock
on a 25 ms timer, and the playhead is read back from `AudioContext.currentTime`
rather than a React interval — so the highlight lines up with what you hear, and
a dropped frame is not an audible glitch.

Export walks the same `playDrum` / `playNote` functions against an
`OfflineAudioContext`. The WAV is the arrangement you heard, not a second
implementation of it.

### Performance

Two fixes took a sixteen-bar export from over thirty seconds to about seven:

- **One channel strip per track, not per hit.** A strip is a panner, two
  filters, a shaper and the send taps. Building one per note allocated tens of
  thousands of nodes per render.
- **Pre-rendered noise percussion.** A live hi-hat was a buffer source through
  a highpass and a bandpass into a gain — four nodes, two of them biquads, at
  twenty hats a bar. The noise is now filtered once per context in plain
  JavaScript, so each hit is one source and one gain.

## Development

```
npm install
npm run dev
npm run typecheck
npm run build      # builds into ../../public/rave/
```

Space bar toggles the transport. Knobs take arrow keys, shift for coarse steps,
and double-click to centre. Drag across a drum row to paint a run of steps.
