# 04 · Visual language and the world

Palette and grade are shared with [`../reef-sora-kit.md`](../reef-sora-kit.md). Change
one and change the other in the same commit, or the launch film stops looking like the
product.

---

## Identity

**Reference points:** Blue Planet's patience. Apple's restraint. A luxury museum's
lighting — objects lit, room dark, nothing competing. Subnautica's sense that the world
continues past what you can see.

**Explicitly not:** cyberpunk, Tron, HUD overlays, neon grids, glitch, chromatic
aberration as a UI effect, hexagons, circuit-board motifs, purple-to-pink gradients.
Every one of these is a default that AI-assisted design falls into and every one is
already everywhere.

**The feeling:** you have descended somewhere quiet and enormous where things are
already happening. The user is a visitor with a light, not an operator at a console.

### Palette

| Token | Hex | Role |
|---|---|---|
| `abyss` | `#040E18` | Deepest background, page base |
| `deep` | `#0A2233` | Panel and surface base |
| `mid` | `#123246` | Elevated surface, borders |
| `teal` | `#10788C` | Structure, inactive state, chrome |
| `biolume` | `#3FE0D0` | Primary accent, focus, active, links |
| `emerald` | `#2FD48A` | Success, resolved, new connection |
| `sunlight` | `#F2E3B0` | The light from above; deadlines, warnings |
| `pressure` | `#E8674F` | Contradiction and critical only. Never decorative. |
| `foam` | `#E6F2F5` | Primary text |
| `silt` | `#8FA8B4` | Secondary text |

Two accents carry meaning and are rationed: `sunlight` means time pressure, `pressure`
means contradiction. Nothing else may use them. A palette where the alarm color also
appears on a button is a palette with no alarm color.

Light theme exists and is not an afterthought — half of enterprise users work in bright
rooms and print. It inverts to warm paper (`#F7F4EE`) with the same accents darkened for
contrast. The reef itself never light-themes; it stays underwater, which is honest,
because it *is* underwater.

### Typography

| Use | Face | Notes |
|---|---|---|
| Interface | **Inter** | 14/20 base. Boring on purpose. Read for hours. |
| Display | **Instrument Serif** or **Editorial New** | Hero, section openers, memo title only. The museum-placard voice. |
| Evidence & data | **JetBrains Mono** | Quoted clauses, IDs, figures, code. Anything a user might compare character by character. |

One serif, one sans, one mono, no more. Display type is large and rare — under 200
words of it in the entire product.

### Material

Surfaces are glass in water, not glass on a desktop. Backdrop blur 20px, background
`rgba(18,50,70,0.55)`, a 1px top border at 12% white for the light hitting the upper
edge, no drop shadow. Shadow implies a light source above a surface; underwater the
light is volumetric and comes through, so panels glow faintly at their edges instead of
casting.

Radius 12px on panels, 8px on controls, 4px on chips. Nothing fully round except
avatars and status dots.

**Restraint rule:** at most two glass layers stacked. Three is where every glassmorphic
interface turns to mud.

---

## The world

### Depth is provenance

The single decision that makes the reef functional rather than decorative: **vertical
position encodes abstraction.** Swimming down is drilling into evidence.

| Zone | Depth | Contains | Light |
|---|---|---|---|
| **Surface** | 0m | The memo. Conclusions. What you'd send someone. | Full sun, gold caustics |
| **Sunlight** | −20m | Findings, answers, summaries | Bright, clear shafts |
| **Kelp forest** | −60m | Document families, contract lineages, folder structure | Filtered green, swaying vertical forms |
| **Reef** | −150m | Individual documents as organisms | Bioluminescence dominant, faint sun |
| **Deep** | −600m | Pages, tables, individual clauses | Self-lit only |
| **Abyss** | −2000m | Raw text spans, cells, OCR output | The user's light only |
| **Vents** | floor | Contradictions and unresolved conflicts | Hot, `pressure`-lit, the only warm light below |

Ascending abstracts. Descending cites. A user who clicks an evidence link in the memo is
visually thrown from the surface to the abyss, and that motion *is* the explanation of
what provenance means. Nobody has to be taught it.

Hydrothermal vents get the most literal treatment in the world because they earn it:
places where something is genuinely wrong, glowing hot on an otherwise cold floor,
visible from a long way off.

### Taxonomy

An uploaded object becomes an organism by what it *is*, and its behavior encodes its
properties. The mapping must be learnable in one exposure and never arbitrary.

| Object | Organism | Why it reads correctly | Encodes |
|---|---|---|---|
| PDF / contract | **Coral formation** | Fixed, structural, accretes into families | Size = length. Branch count = sections. Glow = referenced by others. |
| Spreadsheet | **School of fish** | Many identical units moving as one body | Count = rows. Tightness = data quality. Scatter = missing values. |
| Database / table | **Reef substrate** | The floor other things grow on | Extent = size. Ridges = tables. |
| Audio | **Jellyfish** | Soft-edged, drifts, no hard structure | Pulse = speaker changes. Size = duration. |
| Video | **Ray** | Glides through, passes over things | Wingspan = duration. Grid flex = scene changes. |
| Image / scan | **Anemone** | Fixed, soft, attached to a host | Attached to its parent document. Dim if OCR confidence is low. |
| Email thread | **Current** | A moving line connecting places | Path = participants. Speed = tempo. |
| Code / structured data | **Crystalline growth** | Geometric among the organic | Facets = modules |
| The graph | **Neural reef** | Everything, seen from far enough back | Only visible from Sunlight zone and above |

**Rules that keep this from becoming a zoo:**

1. New type → new organism only if the existing ones genuinely misrepresent it.
2. Type is silhouette. Properties are behavior. Never encode a property by changing an
   organism into a different creature.
3. Every organism reads at 20 pixels. If it needs to be large to be identifiable, the
   silhouette is wrong.
4. Nothing has eyes, faces, or personality. These are objects, not characters.

### Light, particulate, current

**Light** comes from above and from the organisms. Three shafts maximum in frame,
drifting on a 40-second cycle, never aligned with the camera. Bioluminescence is the
only light below the reef zone, which makes the user's own attention a light source —
looking at something illuminates it slightly.

**Particulate** is the depth cue that makes water read as water. Density increases with
depth. It drifts, never falls straight, and it catches every light source. Cut particles
first under performance pressure and last under aesthetic pressure — they are cheap and
they carry most of the atmosphere.

**Current** moves everything continuously at low amplitude on a long period. The world
is never still. This is what "the ocean should breathe" means concretely: a 22-second
primary sine with a 7-second secondary, amplitude under 3% of object size. Perceptible
only when you stop looking for it.

---

## Motion

### Camera language

Four moves. Nothing else is in the vocabulary.

| Move | When | Duration | Curve |
|---|---|---|---|
| **Descend** | Going deeper into evidence | 900ms | `cubic-bezier(.25,.1,.25,1)` |
| **Ascend** | Abstracting, going back | 700ms | Same, faster — returning is always quicker than exploring |
| **Drift** | Ambient, always running | continuous | Sine |
| **Frame** | Focusing a selection | 600ms | Slight overshoot, `cubic-bezier(.34,1.4,.64,1)` |

Never: roll, dutch angle, snap-cut, whip pan, shake, or zoom. Zoom is not a camera move
underwater and it immediately reads as a game.

The camera has mass. It starts slowly and stops slowly, and it never arrives
instantaneously anywhere. It is also never fully still — even "stationary" carries the
drift.

### Timing

| Class | Duration | Curve |
|---|---|---|
| Micro — hover, focus, toggle | 120ms | `ease-out` |
| Interface — panels, expansion | 200ms | `cubic-bezier(.4,0,.2,1)` |
| Transition — surfaces, views | 400ms | `cubic-bezier(.25,.1,.25,1)` |
| World — camera, depth | 600–900ms | as above |
| Ambient — current, drift | 7–40s | sine, looping |

Interface motion under 200ms, world motion over 600ms, nothing in between. That gap is
what keeps the tool feeling fast and the world feeling large in the same product.

### Transition language

- **List → Reef:** the list dissolves downward into particles that become the reef. 400ms.
- **Reef → List:** particles rise and knit into rows. 400ms.
- **Memo claim → evidence:** descend, hard and fast. The camera falls through depth zones
  with visible zone transitions and lands on the highlighted span. 900ms, and it is the
  most important motion in the product because it teaches provenance.
- **Room → room:** ascend to surface, cross, descend. 700ms. Deliberate — rooms are
  different places.
- **Within a surface:** cross-fade at 200ms. No sliding, no page-turn.

### Scroll

Scroll is depth on the landing page and in the reef, and ordinary scroll everywhere
else. Scrolljacking is confined to the marketing site and capped at five viewport
heights.

In the reef, scroll changes depth zone with detents — it settles into a zone rather than
floating between two. Parallax runs on three layers (0.6 / 0.85 / 1.0); more layers cost
frames and add nothing perceptible.

Working surfaces never hijack scroll. Ever.

### Particles

- Ambient particulate: 2,000–8,000 by depth, GPU instanced, one draw call
- Ingest bloom: up to 20,000 for 3 seconds, then culled
- Connection filaments: shader-driven flow along a curve, not particle systems
- Every system has a hard budget and degrades by count, never by turning off — a scene
  with no particles reads as broken, a scene with a third of them reads as clearer water

### Shader direction

Five, no more. Each solves a problem that geometry can't.

1. **Water volume** — fog by depth, blue-green absorption with red falling off first,
   which is what actually makes water look like water rather than blue air.
2. **Caustics** — projected animated pattern, surface and sunlight zones only.
3. **Bioluminescence** — emissive with soft bloom, pulse driven by data state, not by a
   clock.
4. **Filament flow** — directional gradient along a curve so connections read as
   *travelling*.
5. **Depth-of-field** — subtle, focal plane on the selection. The only effect permitted
   to touch the whole frame.

No screen-space reflections, no volumetric ray marching, no SSAO. The cost is enormous
and the aesthetic gain underwater is close to zero.

### Loading

There is no spinner in Reef. Three loading treatments, each honest about what it's
waiting for:

1. **Skeleton** at true final dimensions, breathing at 2s period, for known layouts.
2. **The pipeline** (surface 5) for processing — an animation that is a readout, moving
   at real throughput.
3. **Progressive world** for the reef — water, then light, then formations by importance,
   then detail. Interactive before complete.

---

## Performance budgets

Non-negotiable. The buyer is on a two-year-old MacBook Air in a hotel with 40 Chrome tabs
open.

| Metric | Target | Hard limit |
|---|---|---|
| Landing LCP, cold 4G | 1.8s | 2.5s |
| App shell interactive | 1.2s | 2.0s |
| Search first result | 200ms | 400ms |
| Answer first token | 1.2s | 2.5s |
| Reef interactive | 2.0s | 4.0s |
| Reef sustained | 60fps | 30fps, else fall back |
| Reef memory | 400MB | 800MB |
| Initial JS, no reef | 180KB gz | 250KB gz |
| Reef bundle, lazy | 900KB gz | 1.4MB gz |

The reef bundle is never in the initial load. It is fetched when a user first presses
`Tab`, and a user who never presses `Tab` never downloads a byte of Three.js.

### Degradation ladder

Detect once on entry, re-evaluate on sustained frame drop, and move down without asking:

1. **Full** — all shaders, full particles, DOF, 60fps target
2. **Reduced** — no DOF, half particles, simplified caustics
3. **Minimal** — flat shading, no particles, no post
4. **List** — automatic fallback, plainly explained, manual retry available

Triggers: no WebGL2, sustained sub-24fps for 3s, `deviceMemory < 4`, `prefers-reduced-motion`
(→ Minimal with all ambient motion frozen), battery saver, or an explicit user setting
that is remembered forever.

### The rule that outranks all of the above

**If the reef costs the working surfaces a single frame, the reef loses.** It runs in its
own lazy chunk, its own canvas, and its own render loop, and it is torn down completely
on exit. A user in the list view should have no way to tell whether a 3D engine exists in
this product.
