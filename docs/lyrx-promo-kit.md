# Lyrx promo kit

Everything here was captured from the real app. No AI-generated video, no mockups.

```
art/lyrx-promo/                 the finished film
  lyrx-promo-40s.mp4            41.3s · 1920×1080 · 60fps · with audio
  lyrx-promo-40s-silent.mp4     same cut, no audio, for your own score
  lyrx-promo-square.mp4         1080×1080
  lyrx-promo-vertical.mp4       1080×1920
  poster.png                    frame at 4.2s

art/lyrx-broll/                 14 raw shots, 4.6s–11.9s each, cut them how you like
  01-hero-sweep … 14-hero-out
  audio/bed-a|b|c.wav           three loops Lyrx exported itself

tools/lyrx-broll/               the rig, re-runnable
  rig.mjs      browser, synthetic cursor, eased pointer, screencast capture
  shots.mjs    choreography for each shot
  capture.mjs  drives the app, writes the 14 mp4s
  audio.mjs    drives the app's own WAV export
  build.mjs    trims, cross-dissolves, overlays text cards, muxes audio

public/lyrx/promo-wave.js       <lyrx-wave> live canvas (replaces waveform.png)
public/lyrx/promo-wave-demo.html  side-by-side demo and wiring snippet
```

Re-run any of it:

```
npm run dev                                  # must be up first
node tools/lyrx-broll/capture.mjs            # all 14 shots
node tools/lyrx-broll/capture.mjs 09 11      # just these
node tools/lyrx-broll/audio.mjs              # re-export the audio beds
node tools/lyrx-broll/build.mjs              # re-cut the film
```

---

## How it was captured

Headless Chromium at 1440×810, deviceScaleFactor 2, so frames land at 2880×1620 and
downsample to 1080p. Playwright drives real pointer events, which matters: the hero
canvas bends its five laser beams toward the cursor and deforms four waveform layers
under it (`index.html:2807-2860`), so that motion only exists if something actually
moves a pointer. The rig injects a drawn cursor since headless has none, and captures
through the CDP screencast with real frame timestamps, so ffmpeg gets true timing
rather than an assumed frame rate.

The AI producer needed no special handling. It has no network calls, so "Generate
track" runs locally and the capture is deterministic.

## The audio is the app

`audio.mjs` drives the studio's own EXPORT WAV button and catches the download. Three
beds came out at 128, 92, and 140 BPM, 6.7–8.5s each. The film uses `bed-a` looped and
normalised to -15 LUFS. The promo's soundtrack is a loop Lyrx made, which is a better
claim than any stock track.

---

## The cut

41.3 seconds, twelve segments plus an end card, 0.28s dissolves between shots and 0.7s
into the end card.

| # | Source shot | In | Len | What happens |
|---|---|---|---|---|
| 1 | 01-hero-sweep | 0.60 | 3.5 | Cursor sweeps, laser beams bend to follow, waveform layers bulge |
| 2 | 02-hero-play | 1.30 | 3.0 | Click the play disc, sparks fire, loop starts |
| 3 | 05-workspace-snap | 2.95 | 3.0 | Pick **Everything**, six windows tile into place carrying a live session |
| 4 | 06-sequencer | 1.00 | 4.5 | Empty grid, then kick, snare, and clap land while the playhead sweeps |
| 5 | 07-piano-roll | 0.80 | 3.5 | Four notes drawn in A natural minor |
| 6 | 08-synth | 1.90 | 3.0 | Cutoff dragged across its range next to the piano roll |
| 7 | 09-ai-producer | 1.10 | 5.2 | "dark rolling techno, hypnotic, 128" typed live, Generate clicked |
| 8 | 10-mix | 2.00 | 3.0 | Mixer and plugin rack, spectrum moving in Analytics |
| 9 | 11-voice-lab | 2.00 | 3.6 | Raspy character picked, a line typed, Speak it |
| 10 | 04-seq-strip | 0.50 | 2.8 | The "Start with one square" grid, playhead sweeping |
| 11 | 12-community | 0.80 | 2.8 | Feed scroll, Open on a track |
| 12 | 14-hero-out | 1.00 | 4.0 | Back wide on the hero |
| 13 | end card | — | 3.2 | Wordmark, tagline, URL |

Two text overlays only, both sitting in the empty Sound-editor strip along the bottom
on a gradient scrim:

- **6.9s** "A full studio. *One browser tab.*"
- **19.4s** "Or just say *what you want.*"

Nothing goes over the hero. It already says "Make the night." in 76px, and a second
line of type on top of it just fights.

Cards are rendered in headless Chrome using real Archivo and JetBrains Mono, not
ffmpeg's `drawtext` (which this ffmpeg build lacks anyway), so the type matches the
site exactly.

### Voiceover, if you add one

48 words. Read low and unhurried.

> (0:09) Program the drums. (0:14) Draw the melody, twist the synth.
> (0:21) Or skip all of it, and just say what you want.
> (0:29) Sing it in a voice you built yourself.
> (0:36) Lyrx. Everything runs in this tab.

Use `lyrx-promo-40s-silent.mp4` so you can duck the bed under the read yourself.

---

## Shots not in the cut

Two captured shots sit unused, both usable:

- **03-home-scroll** (11.9s) is a slow pass down the whole home page: sequencer strip,
  stats, the studio-night plate, features, drum pad and vinyl. Good for a longer edit
  or a silent loop on a landing page.
- **13-datacore** (5.1s) hovers the DataCore band and its three arcs scale outward.
  Add it before the end card with the line *Trained on data we're allowed to use* if
  the piece needs to carry the sister project. Keep it to two seconds. It changes the
  temperature.

---

## The live waveform

`public/lyrx/promo-wave.js` draws a waveform / spectrogram field: dozens of strands
with a neon bloom, vertical spectrum columns, a centre-weighted brightness envelope
and its own fade on all four edges. It replaces the old 1.1MB `waveform.png` plate,
pauses through an IntersectionObserver when scrolled offscreen, and renders a single
static frame under `prefers-reduced-motion`.

| Attribute | Default | |
|---|---|---|
| `amp` | 1 | amplitude, 0–4 |
| `speed` | 1 | time multiplier, 0–5 |
| `density` | auto | strand count. 46 desktop, 26 under 700px |
| `spikes` | 180 | spectrum columns, 20–500 |
| `glow` | 1 | bloom radius multiplier. `0` skips the pass |
| `spread` | 0.23 | vertical spread of the strands, 0.05–0.8 |
| `mirror` | off | `"1"` adds a dimmed reflection |
| `background` | wash | `"transparent"` skips the near-black fill |

**`background="transparent"` is not the default.** Left off, the element paints its own
near-black wash over whatever sits behind it. Every overlay use needs it.

```css
.lx-seq-stage lyrx-wave {
  position: absolute !important;   /* the component writes an inline position */
  inset: 0; height: auto; opacity: .9;
  /* no mask needed — the component fades its own edges */
}
```

Open `/lyrx/promo-wave-demo.html` to tune values against live examples.

### The hero uses the same renderer

The waveform along the bottom of the hero is the one wired to the analyser, and it is
drawn by the app's own `rafLoop`, not by `<lyrx-wave>`. Both now share the renderer:
`promo-wave.js` exports `window.LyrxWaveField`, and the hero constructs its own
instance. Change the field in one place and both move together.

The hero passes what the standalone element cannot:

- `amp: (0.62 + energy * 1.7) * amp` — `energy` comes off the analyser, so the field
  swells with whatever is actually playing
- `mouse` — strands bulge and ripple toward the pointer, the hero's original behaviour
- `composite: 'screen'` — it lays over the laser beams instead of covering them
- `offsetY` + a 340px `h` — the band only occupies the bottom of the hero, so the buffer
  is sized to the band. Rendering the full 1440×842 instead cost 13fps at 2x DPR.

`render()` only ever composites onto the target. It never clears it and never runs
`destination-in` against it — the edge fade is applied to its own buffer first —
so it is safe to draw over content that is already there.

### It is easy to make this component very slow

Three things cost real frames, all measured on the sequencer band at 1440×454:

| | ms/frame | fps (2x DPR) |
|---|---|---|
| `shadowBlur` per stroke, ~340 strokes | 18.3 | 2 |
| one bloom pass over an offscreen buffer | 4.3 | 28 |
| `source-over` on the buffer instead of `screen` | — | 35 |
| quarter-scale bloom buffer + cached edge mask | 5.0 | 47 |

`shadowBlur` is the trap. It looks free in a JS profile because the blur happens at
raster time, not when the call is queued — the draw loop timed at 3.9ms while the page
ran at 2fps. Bloom belongs in one blur of the finished field, never per stroke.

Two smaller ones: per-stroke `screen` blending cost ~5ms at this stroke count, and
`source-over` accumulates brightness on a transparent buffer anyway; and the edge fade
rebuilt two full-canvas gradients every frame, so it is baked once per resize and
applied as a single `destination-in` blit.

---

## Palette, for anything generated later

The five images you generated read correctly against the UI: violet and indigo carry
the room, lime stays the light source and the interface. Keep that split.

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#08080B` | page ground |
| `--color-surface` | `#101015` | window bodies |
| `--color-accent` | `#C8FF2E` | lime. Buttons, active steps, glow |
| `--color-hot` | `#FF2E7A` | magenta. Studio UI only (close buttons, snare lane) |
| `--color-cyan` | `#21E5E5` | studio UI only (clap lane) |
| `--color-text` | `#F4F4F0` | bone white |

The generative artwork (hero canvas and `<lyrx-wave>`) runs a narrower palette than the
studio UI — green, blue, violet, no magenta or cyan. Both files must stay in step or
the hero and the sequencer band stop reading as one system:

| Layer | RGB | Hex | Role |
|---|---|---|---|
| sub | `88,74,235` | `#584AEB` | deep blue-violet body, the only filled shape |
| synth | `200,255,46` | `#C8FF2E` | lime line, the brand accent |
| hats | `96,178,255` | `#60B2FF` | blue line, fast jitter |
| delay | `155,107,255` | `#9B6BFF` | violet line |

Beams cycle `['200,255,46', '96,150,255', '155,107,255', '120,200,255', '200,255,46']`.

Archivo for everything, JetBrains Mono for labels. Radii are 2/3/4px.

Two rules for future generations: never ask the model to render the word "Lyrx"
(composite it in Archivo 700 at `-0.02em`, matching `index.html:66`), and never ask it
to render UI. Generated interfaces will not survive being cut next to real capture.

Dark gradients stay in CSS. Eight-bit JPEG has roughly five usable steps between
`#08080B` and `#101015` and every one bands visibly, which is why the grain overlay you
added on `.lx-home-hero::after` matters.

---

## Landing page structure

The home view now runs as a crescendo rather than a stack of equal blocks:

1. **Hero** — synth bleeding off the right inside a violet bloom, with the cursor-reactive
   beams and waveform painting *over* it on `mix-blend-mode: screen`
2. **Sequencer band** — `<lyrx-wave>` flowing live behind the animated 16-step grid
3. **Stats** — editorial numbers on hairline dividers
4. **studio-night** — full-bleed plate, "Stay in the feeling"
5. **The film** — the 41s promo, lime hairline, mono metadata
6. **Features** — numbered 01–04 on a hairline grid
7. **drum-pad** — full-bleed band, copy on the right
8. **vinyl** — wide cinematic strip
9. CTA, DataCore band, footer

`public/lyrx/promo-motion.js` drives it: scroll reveals via `[data-rise]`
(`data-d="1|2|3"` staggers, `data-rise="fade"` for image bands), hero parallax, and
image-transparency detection. It re-scans on mutation, since the app's view switcher
throws away DOM nodes.

### Two things that will bite you again

**The template layer rewrites `class` to `classname` on custom elements.** A
`.lx-seq-wave` rule never matched `<lyrx-wave class="lx-seq-wave">`, so the element got
no size and rendered nothing. Style custom elements by tag with a scoping ancestor:
`.lx-seq-stage lyrx-wave { … }`. Normal attributes survive fine.

**`[data-seen]` sets `transform: none`.** Anything centred with
`translate(-50%,-50%)` loses its centring the moment it reveals. The vinyl caption hit
this. Centre with flex instead.

### The hero image treatment

`hero-synth.png` is now a real cut-out (RGBA, clean silhouette), trimmed to its content
bounds so the synth fills its frame instead of floating inside empty transparent margin.

`promo-motion.js` samples the image on load and sets `data-cut` on `.lx-hero-object`
when it finds transparency. That switches off the `mix-blend-mode: screen` and radial
mask that the black-ground version needs. Both versions work with no CSS edit, so you
can swap the file either way and the hero adapts.

The original black-ground render is kept at `art/lyrx-source/hero-synth-black-ground.png`,
outside `public/` so it does not ship.

Do not try to key the background off the black-ground version programmatically. The
synth's body is black and connects to the black ground, so every flood fill eats the
object and leaves only the rim highlights floating in space. It needs real matting.
