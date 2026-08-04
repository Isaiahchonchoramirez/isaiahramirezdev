# Graph Report - public/tesseraxis  (2026-08-04)

## Corpus Check
- 49 files · ~74,736 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2358 nodes · 4746 edges · 141 communities (63 shown, 78 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Ui Shell
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Engine Math
- Three.js Runtime
- Three.js Runtime
- Vehicle Index
- Ballistics Index
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Tools Fly
- Engine Recorder
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Swarm Index
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Chemistry Spec
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Chemistry Physics
- Three.js Runtime
- Render Viewport
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Engine Simulation
- Engine World
- Three.js Runtime
- Engine Events
- Engine Loop
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Control Pid
- Render Helpers
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Engine Rng
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Research Experiment
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Tesseraxis Index
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Engine World
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Three.js Runtime
- Tesseraxis Index
- Tesseraxis Index

## God Nodes (most connected - your core abstractions)
1. `bs()` - 78 edges
2. `Gi` - 56 edges
3. `ms()` - 55 edges
4. `cu` - 54 edges
5. `er` - 47 edges
6. `qr` - 46 edges
7. `is()` - 44 edges
8. `zo` - 42 edges
9. `ar` - 40 edges
10. `_l` - 40 edges

## Surprising Connections (you probably didn't know these)
- `atmosphere()` --calls--> `clamp()`  [EXTRACTED]
  src/plugins/ballistics/physics.js → src/engine/math.js
- `run()` --calls--> `defaultParams()`  [EXTRACTED]
  tools/ballistics.mjs → src/plugins/ballistics/spec.js
- `hierarchy()` --references--> `BY_SYMBOL`  [EXTRACTED]
  src/plugins/chemistry/index.js → src/plugins/chemistry/elements.js
- `fly()` --calls--> `evaluateLanding()`  [EXTRACTED]
  tools/fly.mjs → src/plugins/rocket-landing/physics.js
- `fly()` --calls--> `defaultParams()`  [EXTRACTED]
  tools/fly.mjs → src/plugins/rocket-landing/spec.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Reproducible Simulation Workflow** — public_tesseraxis_index_deterministic_physics, public_tesseraxis_index_seeded_simulation, public_tesseraxis_index_replayable_runs, public_tesseraxis_index_exportable_data [INFERRED 0.85]

## Communities (141 total, 78 thin omitted)

### Community 0 - "Ui Shell"
Cohesion: 0.05
Nodes (40): buildShareLink(), download(), exportCsv(), exportJournal(), exportJson(), formatNumber(), parseShareLink(), stamp() (+32 more)

### Community 1 - "Three.js Runtime"
Cohesion: 0.05
Nodes (12): _c, cc, dc, e, fr, hc, jc, mc (+4 more)

### Community 2 - "Three.js Runtime"
Cohesion: 0.03
Nodes (48): _a, br, bu, cr, cs, dd, dr, fa (+40 more)

### Community 3 - "Three.js Runtime"
Cohesion: 0.05
Nodes (4): gc, gr, gs, is()

### Community 4 - "Three.js Runtime"
Cohesion: 0.05
Nodes (32): ds, hs(), os(), Bn(), br(), ci(), Dn, er (+24 more)

### Community 5 - "Three.js Runtime"
Cohesion: 0.05
Nodes (6): ha, ja, mu, ru(), su, _u

### Community 9 - "Three.js Runtime"
Cohesion: 0.08
Nodes (4): cd, lo(), uu, zo

### Community 10 - "Engine Math"
Cohesion: 0.12
Nodes (29): qFromAxisAngle(), qFromUnitVectors(), qIntegrate(), qnormalize(), qRotate(), qRotateInverse(), quat(), slewLimit() (+21 more)

### Community 11 - "Three.js Runtime"
Cohesion: 0.13
Nodes (11): qn(), ar(), ca(), ea(), fr(), ir(), nr(), or() (+3 more)

### Community 12 - "Three.js Runtime"
Cohesion: 0.09
Nodes (4): Ji(), kr, qi(), qr

### Community 13 - "Vehicle Index"
Cohesion: 0.12
Nodes (23): DEG, crashSection(), inspect(), setup(), createCrashState(), createVehicle(), isTrackScenario(), makeSystems() (+15 more)

### Community 14 - "Ballistics Index"
Cohesion: 0.11
Nodes (19): MODE_LABEL, setup(), atmosphere(), CD_TABLE, createBallistics(), makeSystems(), TARGETS, actions (+11 more)

### Community 15 - "Three.js Runtime"
Cohesion: 0.07
Nodes (12): fn, ia, ih, Ki(), ln, ns(), ws, zd() (+4 more)

### Community 16 - "Three.js Runtime"
Cohesion: 0.07
Nodes (8): co(), fl, jl, kl, ll(), ol(), uo(), yn

### Community 17 - "Three.js Runtime"
Cohesion: 0.12
Nodes (5): Do, eo, ro, to, va

### Community 18 - "Tools Fly"
Cohesion: 0.11
Nodes (19): RAD, setup(), syncGains(), verdict(), evaluateLanding(), SCENARIOS, actions, channels (+11 more)

### Community 22 - "Three.js Runtime"
Cohesion: 0.09
Nodes (3): ac(), nc, ql()

### Community 26 - "Three.js Runtime"
Cohesion: 0.08
Nodes (5): oc, pu, rc, ss(), zc

### Community 27 - "Three.js Runtime"
Cohesion: 0.10
Nodes (3): aa, eu, la

### Community 29 - "Swarm Index"
Cohesion: 0.16
Nodes (14): setup(), createSwarm(), makeSystems(), actions, channels, defaultParams(), graphs, params (+6 more)

### Community 30 - "Three.js Runtime"
Cohesion: 0.09
Nodes (7): dh(), il(), kh, nl(), rl(), sl(), tl()

### Community 34 - "Three.js Runtime"
Cohesion: 0.11
Nodes (3): Hi(), ju, Xu

### Community 36 - "Three.js Runtime"
Cohesion: 0.13
Nodes (7): _l, da(), di(), kr(), Qi(), Un(), yi()

### Community 37 - "Chemistry Spec"
Cohesion: 0.13
Nodes (11): hierarchy(), setup(), makeSystems(), actions, channels, graphs, options, params (+3 more)

### Community 39 - "Three.js Runtime"
Cohesion: 0.13
Nodes (4): cn, In, sn, Tn

### Community 40 - "Three.js Runtime"
Cohesion: 0.13
Nodes (8): al(), el(), hh, hl(), jh(), qh(), vh, wh

### Community 41 - "Three.js Runtime"
Cohesion: 0.12
Nodes (3): _s, Ys, zs

### Community 45 - "Chemistry Physics"
Cohesion: 0.21
Nodes (16): BY_SYMBOL, CATEGORY_COLOR, ELEMENTS, isMetal(), isNoble(), METALS, RAW, classifyBond() (+8 more)

### Community 46 - "Three.js Runtime"
Cohesion: 0.12
Nodes (4): ku, td(), ud, zu

### Community 47 - "Render Viewport"
Cohesion: 0.16
Nodes (3): disposeMaterial(), disposeTree(), Viewport

### Community 48 - "Three.js Runtime"
Cohesion: 0.14
Nodes (5): bc, ea, ic, kc, sc

### Community 49 - "Three.js Runtime"
Cohesion: 0.17
Nodes (3): mo, nu, sr

### Community 50 - "Three.js Runtime"
Cohesion: 0.17
Nodes (4): jr, or, pr, Xr

### Community 54 - "Engine Events"
Cohesion: 0.17
Nodes (4): EventBus, Component, resetComponentRegistry(), TYPES

### Community 59 - "Three.js Runtime"
Cohesion: 0.15
Nodes (4): na, pa, ra, wa

### Community 60 - "Control Pid"
Cohesion: 0.16
Nodes (6): CascadedPid, Pid, clamp(), lowPass(), qAngleTo(), remap()

### Community 61 - "Render Helpers"
Cohesion: 0.20
Nodes (5): createRocketView(), createBeacon(), createLandingPad(), ForceArrow, Trail

### Community 62 - "Three.js Runtime"
Cohesion: 0.16
Nodes (4): bn, mi, ua, vi

### Community 63 - "Three.js Runtime"
Cohesion: 0.20
Nodes (6): dr(), gi(), Hn(), _i(), pr(), zi()

### Community 66 - "Three.js Runtime"
Cohesion: 0.18
Nodes (3): hn, on(), Xi()

### Community 70 - "Three.js Runtime"
Cohesion: 0.18
Nodes (3): fh, lh, th

### Community 71 - "Three.js Runtime"
Cohesion: 0.18
Nodes (3): rn, wn, xo

### Community 76 - "Research Experiment"
Cohesion: 0.27
Nodes (7): attachScenarioScript(), compileScenarioScript(), gridCandidates(), makeResearchJob(), optimize(), candidates, script

### Community 84 - "Three.js Runtime"
Cohesion: 0.20
Nodes (6): jn, Un(), yo, za, Pn(), Vn()

### Community 85 - "Three.js Runtime"
Cohesion: 0.22
Nodes (4): cl, dl(), pl(), ul

### Community 89 - "Tesseraxis Index"
Cohesion: 0.22
Nodes (9): Simulation Analysis Dock, Tesseraxis Application Shell, Deterministic Physics, Engineering Simulation Platform, Live Telemetry, Observable Forces, Controllers, and Decisions, Replayable Runs, Seeded Simulation (+1 more)

### Community 98 - "Three.js Runtime"
Cohesion: 0.29
Nodes (5): bo, fo, io, oo, po

### Community 102 - "Three.js Runtime"
Cohesion: 0.25
Nodes (4): Fi, Li, bi(), xi()

### Community 107 - "Three.js Runtime"
Cohesion: 0.29
Nodes (4): sa, Fn(), Nn, On

### Community 109 - "Three.js Runtime"
Cohesion: 0.40
Nodes (3): bind(), getValue(), setValue()

### Community 114 - "Three.js Runtime"
Cohesion: 0.40
Nodes (3): Fs, ls, Vs

## Knowledge Gaps
- **88 isolated node(s):** `PHASES`, `TYPES`, `root`, `canvas`, `simulation` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ar` connect `Three.js Runtime` to `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `er` connect `Three.js Runtime` to `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `cu` connect `Three.js Runtime` to `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`, `Three.js Runtime`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `PHASES`, `TYPES`, `root` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Ui Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.05095839177185601 - nodes in this community are weakly interconnected._
- **Should `Three.js Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `Three.js Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.032692307692307694 - nodes in this community are weakly interconnected._