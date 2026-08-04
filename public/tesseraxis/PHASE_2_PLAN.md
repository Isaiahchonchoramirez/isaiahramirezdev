# Tesseraxis Phase 2 — Architecture and Milestone Plan

## Architecture assessment

Phase 1 is already a working browser-native simulation platform, not a prototype to discard.

- `src/engine/` owns deterministic state, fixed-step execution, ECS storage, event dispatch, snapshots, replay inputs, and telemetry recording.
- `src/sdk/plugin.js` is the stable module boundary. Simulation modules declare parameters, actions, channels, graphs, setup, inspection, and explanation without owning the workspace.
- `src/render/viewport.js` isolates Three.js from the engine and already keeps headless simulation tests possible.
- `src/ui/` owns the current imperative workspace shell, schema-driven inspector, timeline, graphs, and textual telemetry.
- `src/plugins/` contains mature demonstrations that are more advanced than the Phase 2 brief requires. They remain validation fixtures while workspace capabilities are built.

The Phase 2 frontend should migrate incrementally. The engine and recorder remain authoritative. React/TypeScript components will be introduced behind adapters and must not directly own physics state or tick the simulation.

## Proposed file plan

### Milestone 1

- `index.html`: complete toolbar, workspace regions, accessible rail controls, panel semantics.
- `style.css`: responsive three-panel shell, collapsible rails, state rail, focus treatment, laptop/tablet modes.
- `src/ui/workspace.js`: layout presets, local persistence, panel collapse, project title, command availability.
- `src/ui/shell.js`: connect workspace commands to the existing engine and keep simulation state visible.

### Migration foundation after Milestone 1

- `src/contracts/`: JSDoc-first contracts that can move to strict TypeScript without changing runtime behavior.
- `src/state/`: separate project, workspace, selection, simulation, and replay adapters.
- `src/workspace/`: React/TypeScript panels mounted one region at a time.
- `src/workers/`: simulation and telemetry transport after profiling proves the main-thread boundary is needed.
- `src/persistence/`: validated project and layout schemas, migrations, IndexedDB adapters.
- `tests/`: Vitest state tests and Playwright workflow tests.

## Technical risks

1. **Rewrite risk:** replacing the deterministic engine while replacing the UI would make regressions impossible to isolate. Mitigation: preserve engine APIs and migrate panel-by-panel.
2. **Dual-state risk:** React, Three.js, and the worker could each become an authority. Mitigation: engine snapshots flow outward; commands and inputs flow inward.
3. **Replay integrity:** live editing during a run can invalidate deterministic replay. Mitigation: editing is locked while running unless a future explicit live-edit mode records every mutation.
4. **Telemetry pressure:** sending 120 nested object payloads per second through React or a worker will cause avoidable churn. Mitigation: typed buffers, sampled subscriptions, and transferable transform arrays.
5. **Dependency weight:** React Three Fiber, Rapier, ECharts, and docking libraries can create a large startup bundle. Mitigation: add dependencies only at the milestone that consumes them and lazy-load analysis tools.
6. **Vendor graph noise:** the architecture analyzer includes vendored Three.js symbols, producing collapsed and dangling analysis edges. Engine and UI findings are reliable; vendor communities are not used for design decisions.

## Milestone checklist

- [x] Architecture assessment and migration boundary
- [x] Milestone 1 — workspace shell
- [ ] Milestone 2 — viewport tools and selection
- [ ] Milestone 3 — explicit simulation state machine and render interpolation
- [ ] Milestone 4 — synchronized hierarchy, inspector, validation, undo/redo
- [ ] Milestone 5 — typed telemetry, events, graphs, console
- [ ] Milestone 6 — recording and replay workspace
- [ ] Milestone 7 — scientific overlays and measurement tools
- [ ] Milestone 8 — persistence, layouts, and exports
- [ ] Milestone 9 — focused Phase 2 demonstration scenes
- [ ] Milestone 10 — automated workflow tests and performance optimization

## Milestone 1 acceptance

- The app remains runnable with every existing plugin.
- Primary transport controls remain visible.
- Project, edit, layout, search, settings, and help commands have stable UI locations.
- Left hierarchy and right inspector rails collapse independently.
- The analysis dock collapses and resizes.
- Workspace presets persist locally and do not alter simulation state.
- Current simulation mode is visible without relying on color alone.
- Laptop and tablet inspection layouts prioritize the viewport.
