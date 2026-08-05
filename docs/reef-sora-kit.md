# Reef — Sora kit

Prompts for the launch film. Fourteen shots, each generated twice: once as a still,
then as motion that starts from that still.

**Generate every photoshot in Part 1 before any b-roll in Part 2.** Sora's
image-to-video path takes an image as the first frame, so a still you have already
approved fixes the composition, palette and lighting before a video generation is
spent on it. Prompting a clip cold re-rolls all of that on every attempt, and the
fourteen clips will not look like one film. Approve the frame, then move it.

```
art/reef-stills/     01-surface-threshold.png … 14-ascent.png
art/reef-broll/      01-surface-threshold.mp4 … 14-ascent.mp4
```

Same numbering across both directories, so a clip and the frame it grew from always
share a name.

---

## The world

Paste this block into every prompt, still and motion alike. It is what keeps fourteen
separate generations reading as one place.

> Photoreal underwater cinematography. Deep ocean, blue-green and teal, lit by
> volumetric shafts of sunlight from far above and by the bioluminescence of the
> subjects themselves. Fine particulate suspended in the water catches the light.
> Soft caustics. Anamorphic lens, shallow depth of field, natural lens flare, subtle
> chromatic aberration at the edges. Colour graded like a premium science documentary:
> deep shadows, controlled highlights, no crushed blacks. 4K, cinematic, no text,
> no logos, no user interface, no people unless stated.

**Palette** — hold these across the set:

| | Hex | Where |
|---|---|---|
| Abyss | `#040E18` | Shadow, the water beyond the light |
| Deep | `#0A2233` | Mid water, the base of every frame |
| Teal | `#10788C` | Structure, coral body, the reef in shadow |
| Biolume | `#3FE0D0` | Node cores, active connections, the primary accent |
| Emerald | `#2FD48A` | Secondary accent, growth and new connections |
| Sunlight | `#F2E3B0` | The light column from above. The only warm value — use it sparingly or it stops reading as warm |

**Avoid, in every prompt** — append verbatim:

> No text, no captions, no watermarks, no logos, no floating UI panels, no charts,
> no holographic screens, no divers, no submarines, no wreckage, no treasure, no
> cyberpunk neon pink or purple, no lens dirt overlays, no fisheye distortion.

The no-interface rule matters more than it looks. The moment a screen or a chart
enters frame, Sora fills it with garbled pseudo-text, the shot becomes unusable as a
backdrop, and it dates the moment the product's real UI changes.

---

## The spine

The fourteen shots tell one thing: you go down, you find that it is alive, you watch a
single file become part of it, you see how big it is, you ask it something, you come
back up.

| | Shot | Beat |
|---|---|---|
| 01 | Surface threshold | You are about to leave the known part |
| 02 | Descent | The light narrows, the dark opens |
| 03 | Reef reveal | Something enormous is already down here |
| 04 | Upload bloom | One file arrives and dissolves |
| 05 | Polyp macro | What it became, up close |
| 06 | Connection filaments | It reaches for what was already there |
| 07 | The school | Structured rows, moving as one body |
| 08 | The whale | The database, vast and slow |
| 09 | Jellyfish drift | Audio, ambient and soft-edged |
| 10 | The ray | Video, gliding through |
| 11 | Neural reef | The graph, shaped like a cortex |
| 12 | Scale reveal | It does not end |
| 13 | Query pulse | You ask. Light crosses everything |
| 14 | Ascent | Back toward the surface, the reef lit below |

---

# Part 1 — Photoshots

Stills. 16:9, 3840×2160. For each, generate four and keep the one whose light column
sits where you want it, because that column is the through-line of the whole cut.

Where a shot is worth having vertically for social, it is marked. Reframe by
regenerating at 9:16 rather than cropping — a crop loses the light shaft.

---

### 01 · surface-threshold
*16:9 · also 9:16*

> Looking straight up at the underside of the ocean surface from twelve metres down.
> The surface is a rippling mirror of fractured sunlight, gold and white breaking into
> moving geometry. Beneath it the water deepens from turquoise to near black at the
> frame edges. A few motes of plankton drift through the light. Nothing else in frame.
> The composition is calm, symmetrical, almost architectural.

Cold open. Nothing has happened yet.

---

### 02 · descent
*16:9*

> A single wide column of sunlight falling through deep blue water into darkness
> below. The column is sharply defined by suspended particulate. The water around it
> is dark teal fading to black. Far down at the bottom of the column, a faint
> blue-green glow suggests something large that is not yet visible. Vertical
> composition inside a horizontal frame, the light column slightly off-centre.

The glow at the bottom is the only promise the shot makes. Keep it faint — if it
resolves here, shot 03 has nothing left to do.

---

### 03 · reef-reveal
*16:9*

> A vast bioluminescent coral reef emerging from darkness in deep water. The coral is
> structural and geometric rather than organic-messy: branching towers, fan
> formations, and dome colonies, all threaded with veins of glowing cyan and emerald
> light that pulse faintly from within. Shafts of sunlight fall across the upper
> formations. The reef extends past both edges of the frame and down into blackness.
> Wide establishing shot, deep focus.

The word doing the work is *structural*. Sora's default coral is a lumpy tropical
reef. Geometric, veined and lit from inside is what makes it read as built rather than
grown.

---

### 04 · upload-bloom
*16:9 · also 9:16*

> A single luminous rectangular shard, the size of a hand, suspended alone in dark
> water, glowing pale gold. It is dissolving at its edges into thousands of tiny
> particles of light. The particles spiral outward and begin to reorganise into the
> first branching form of a small coral structure below it. Macro cinematography,
> very shallow depth of field, the background reef soft and out of focus far behind.
> Volumetric glow, water caustics on the particles.

The product shot. A file arrives, stops being a file, becomes part of a living
structure. Everything Reef claims is in this frame.

---

### 05 · polyp-macro
*16:9*

> Extreme macro of a single coral polyp made of translucent glass-like material with a
> bright cyan core pulsing slowly inside it. Filaments of light run out from the base
> of the polyp into the coral structure below. Individual particles of water
> particulate float across the foreground, out of focus. Background is almost entirely
> black with a single soft shaft of light behind. Scientific, precise, beautiful.

One node. This is the shot that says the thing is made of parts and each part is
doing something.

---

### 06 · connection-filaments
*16:9*

> Two separate coral formations in dark water, each glowing faintly from within, with
> a filament of bright cyan light stretching between them through the water. Smaller
> secondary filaments are forming alongside the first, reaching out from one structure
> toward the other. The light in the filaments is directional, brightest at the point
> where it meets the second structure. Mid shot, shallow depth of field, heavy
> particulate catching the filament light.

Directional light in the filament is the detail that sells it. It should look like
something is travelling, not like a wire is hanging there.

---

### 07 · the-school
*16:9*

> A dense school of thousands of small identical silver-and-cyan fish moving as one
> body through deep blue water, forming a single flowing shape. Every fish carries a
> faint bioluminescent line along its flank so the school reads as one continuous
> luminous surface. A shaft of sunlight cuts through the school from above. The reef
> is visible far below, soft and dark.

Structured tabular data. Many identical units, one shape, moving together.

---

### 08 · the-whale
*16:9*

> An enormous whale passing through deep water, seen from below and slightly behind,
> silhouetted against a distant shaft of sunlight far above. Faint patterns of
> bioluminescent cyan light trace along the whale's flanks and underside like veins.
> The whale fills most of the frame, slow and immense. Small particles drift in the
> foreground. Dark, reverent, enormous sense of scale.

Silhouette and backlight, not a well-lit whale. The scale only reads if you cannot
quite see all of it.

---

### 09 · jellyfish-drift
*16:9 · also 9:16*

> Several translucent jellyfish drifting in near-black water, their bells lit from
> within with soft emerald and cyan light that pulses gently. Long trailing tentacles
> catch the light in thin bright lines. Deep shadow all around them. Shallow depth of
> field, one jellyfish sharp in the foreground, the others soft blooms of light
> behind. Extremely soft, slow, weightless.

Audio. Soft-edged, ambient, no hard geometry anywhere in frame.

---

### 10 · the-ray
*16:9*

> A large manta ray gliding through a shaft of sunlight in blue water, seen from
> below. The underside of its wings carries a faint grid of luminous cyan lines that
> flex as the wings move. Light from above rakes across its back. The reef is far
> below in shadow. Wide, graceful, unhurried.

Video files. The flexing grid on the wing is the only literal touch in the set — keep
it faint enough to be a texture rather than a diagram.

---

### 11 · neural-reef
*16:9*

> A colossal coral formation in deep water whose overall silhouette suggests the folds
> and hemispheres of a brain, built entirely from branching luminous coral and
> threaded through with tens of thousands of glowing cyan connections running between
> its surfaces. Small fish and rays weave between the folds. Distant sunlight from far
> above. Wide, symmetrical, awe-inducing, photoreal.

The one shot allowed to be an obvious metaphor. *Suggests* is load-bearing: an actual
brain sitting on the seafloor is a worse image than a reef that happens to fold like
one.

---

### 12 · scale-reveal
*16:9*

> Extremely wide shot of a bioluminescent reef system stretching to the horizon in
> every direction across a deep ocean floor, glowing cyan and emerald, seen from high
> above and far back. Columns of sunlight fall through the water at intervals across
> the whole expanse. The far edges of the reef fade into blue haze without ending.
> Aerial-style underwater composition, enormous depth, atmospheric perspective.

*Without ending* is the whole shot. Any visible edge to the reef breaks it.

---

### 13 · query-pulse
*16:9*

> A wave of bright cyan light travelling across a vast dark bioluminescent reef,
> illuminating each coral structure in sequence as it passes and leaving them glowing
> brighter behind it. The leading edge of the wave is sharp and brilliant, the reef
> ahead of it still dark. Wide shot, dramatic contrast between the lit and unlit
> reef, heavy volumetric light in the water above the wave.

You ask a question and the whole organisation answers at once. Also the single best
frame in the set for the site's hero.

---

### 14 · ascent
*16:9 · also 9:16*

> Rising through deep blue water toward the distant bright surface far above, looking
> up. Below and behind, the bioluminescent reef is a soft field of cyan and emerald
> light receding into the depths. The surface above is a rippling plane of gold.
> Particulate streams past. Peaceful, resolved, a sense of return.

Close. Mirrors shot 01 with everything now known.

---

# Part 2 — B-roll

Motion. Each prompt below runs **image-to-video from its matching still**, so it opens
on a frame you have already approved and only has to invent the movement.

Two rules across the set:

- **One camera move per shot.** Sora given two moves does neither cleanly.
- **Slow.** Everything underwater is slow, and slow footage cuts against anything.
  Fast motion here reads as stock, and it cannot be held under a title card.

Durations are what each shot needs in a cut, not what Sora will happily produce.
Generate a little long and trim.

---

### 01-motion · surface-threshold — 6s
*from `01-surface-threshold.png`*

> The camera holds still, looking up. The mirrored surface above ripples and shifts
> continuously, breaking sunlight into slowly moving geometry across the frame.
> Plankton motes drift lazily. Nothing enters or leaves. Extremely slow, meditative,
> almost static.

Deliberately motionless. It buys the descent in 02 its momentum.

---

### 02-motion · descent — 8s
*from `02-descent.png`*

> The camera descends slowly and steadily straight down through the column of
> sunlight. Particulate streams upward past the lens as the camera falls. The light
> above narrows and dims; the faint blue-green glow far below grows slightly
> brighter and larger. Continuous, smooth, unhurried descent. No cut, no rotation.

The particulate rising past the lens is what tells the eye the camera is moving rather
than the world zooming. Say it explicitly or Sora will give you a zoom.

---

### 03-motion · reef-reveal — 7s
*from `03-reef-reveal.png`*

> The camera pushes forward slowly toward the reef as it emerges from darkness. The
> glowing veins running through the coral pulse gently, slightly out of sync with one
> another, so light moves across the structure. Small fish drift between the
> formations. Shafts of sunlight sway slowly overhead.

Out of sync is the note that matters. Synchronised pulsing looks like a screensaver.

---

### 04-motion · upload-bloom — 6s
*from `04-upload-bloom.png`*

> The luminous shard dissolves completely into thousands of particles of light that
> spiral outward and downward, then settle and knit themselves into a branching coral
> structure that grows upward into frame. The camera holds a slow, almost
> imperceptible push-in throughout. Macro, shallow focus, particles drifting through
> the foreground out of focus.

The hero clip. Generate this one more times than the others.

---

### 05-motion · polyp-macro — 5s
*from `05-polyp-macro.png`*

> The cyan core inside the polyp pulses slowly, three times, each pulse sending a
> visible travelling pulse of light down the filaments into the structure below.
> The camera drifts a few centimetres sideways, revealing more filaments behind.
> Everything else is still. Water particulate floats across the foreground.

Three pulses, counted. An unspecified number gives you a flicker.

---

### 06-motion · connection-filaments — 6s
*from `06-connection-filaments.png`*

> A new filament of light grows outward from the left coral formation, crosses the
> open water, and connects to the right formation. At the moment of contact, both
> structures brighten. Two further filaments begin forming behind it. Slow lateral
> camera drift to the right. Heavy particulate lit by the filaments.

The brighten-on-contact is the beat. Without it there is no moment in the shot.

---

### 07-motion · the-school — 6s
*from `07-the-school.png`*

> The school turns as one body, its shape flowing and reforming continuously, the
> luminous lines along the fish catching the light as they bank. The camera tracks
> alongside, moving with the school. A shaft of sunlight sweeps across them as they
> turn.

---

### 08-motion · the-whale — 8s
*from `08-the-whale.png`*

> The whale moves slowly across and away from the camera with deep, unhurried tail
> strokes. The bioluminescent veins along its flank brighten faintly with each
> stroke. The camera holds nearly still, letting the whale pass through frame. Light
> from far above shifts across its back as it goes.

Let it exit. A whale that stays centred for eight seconds stops being enormous.

---

### 09-motion · jellyfish-drift — 7s
*from `09-jellyfish-drift.png`*

> The jellyfish pulse slowly and drift upward, bells contracting and expanding,
> tentacles trailing and undulating behind them. Their internal light brightens on
> each contraction. The camera rises with them at the same speed. Weightless, silent,
> extremely slow.

---

### 10-motion · the-ray — 6s
*from `10-the-ray.png`*

> The ray beats its wings twice, slowly, and glides forward over the camera and out of
> the top of frame. The luminous grid on its underside flexes with the wing movement
> and brightens as it passes directly overhead through the shaft of light. The camera
> holds still and looks up.

Passing directly over the lens is the shot. It is the one moment in the set with real
proximity to the subject.

---

### 11-motion · neural-reef — 8s
*from `11-neural-reef.png`*

> The camera orbits slowly to the right around the brain-shaped reef formation.
> Thousands of connections between its surfaces pulse and flicker in overlapping
> waves, so light moves continuously across the whole structure without ever
> repeating. Fish and rays weave through the folds. Distant light sways above.

The orbit is the only rotation in the kit. That is what makes it feel like the set
piece.

---

### 12-motion · scale-reveal — 9s
*from `12-scale-reveal.png`*

> The camera pulls back and rises continuously, revealing more and more of the glowing
> reef stretching to the horizon in every direction. The reef never comes to an edge.
> Shafts of sunlight drift across the expanse below. Slow, continuous, enormous.

The longest clip in the kit, and it should be. The scale is the point, and scale
needs time.

---

### 13-motion · query-pulse — 7s
*from `13-query-pulse.png`*

> The wave of cyan light sweeps across the entire reef from the left edge of frame to
> the right, illuminating each structure in sequence and leaving them glowing behind
> it. The water above the wave lights volumetrically as it passes. The camera holds
> still. After the wave passes, the whole reef is left brighter than it began.

Ending brighter than it started is what makes it a payoff instead of an effect. The
hero loop.

---

### 14-motion · ascent — 7s
*from `14-ascent.png`*

> The camera rises steadily toward the bright surface far above. The reef below
> recedes into the blue and dims. Particulate streams downward past the lens. The
> surface grows larger and brighter until it fills the upper third of frame.
> Continuous, smooth, resolving.

---

## Cutting it

A 45-second launch film out of these, if you want a starting order:

```
02 descent          4.0s   open in motion, no title yet
03 reef reveal      3.5s
04 upload bloom     5.0s   the product beat — hold it longest of the early shots
05 polyp macro      2.5s
06 connection       3.0s
07 school           2.5s
09 jellyfish        2.5s
08 whale            4.0s
11 neural reef      5.0s   the turn
12 scale reveal     5.0s
13 query pulse      5.5s   the payoff
14 ascent           4.0s   end card over the last 2s
```

Shot 01 sits out of the main cut. It is the site's silent hero loop and the pre-roll
frame everywhere else.

Cross-dissolve between shots, 0.3s. Underwater footage dissolves cleanly because the
particulate fields blend; hard cuts fight the pacing.

**Text.** The only text in the film is the end card. Nothing in these fourteen shots
should carry a caption, because they are also the site backdrops, the social stills
and the deck backgrounds, and text welds a clip to one use.

End card, over 14-ascent:

> **Reef**
> Every file you own is one organism.
> The reef is what they build together.

---

## Before you spend a lot of generations

Run shot **04** and shot **13** first, both stills, four each. Those two carry the
product idea and the payoff. If the palette and the light hold up in those, the other
twelve will follow, and if they do not, you have found it out for eight images instead
of sixty.
