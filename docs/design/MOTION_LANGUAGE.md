# Motion Language

## Purpose

Motion in Reef explains continuity, hierarchy, processing, and causality. It should make a complex evidence system easier to follow and the ocean world feel physically coherent. It must never create delay, hide uncertainty, or compete with technical content.

## Motion principles

### Continuity

When a finding opens its source, shared geometry and focus movement show that the evidence belongs to the finding. Avoid unrelated fades that erase spatial memory.

### Causality

Processing and change propagation move from source toward result. Direction is meaningful. Random pulsing and ambient activity never masquerade as work.

### Restraint

Most interface transitions complete in 120–240 ms. Larger panel or world transitions may use 240–500 ms. Nothing in a repeated review loop should regularly exceed 300 ms.

### Interruptibility

Navigation motion responds immediately to new input. Users can reverse, skip, or close transitions without waiting for a timeline.

### Physical calm

Use smooth acceleration and settling, not bounces, rubber effects, overshoot, or confetti. Underwater weight comes from slower ambient drift, not sluggish controls.

## Motion vocabulary

| Pattern | Meaning | Constraints |
| --- | --- | --- |
| Bloom | New extraction or finding became available | One cycle, then settles to static state |
| Current | Relationship or dependency direction | Runs only on selection or explanation |
| Descent | Move from conclusion toward source detail | Must preserve selection and allow instant skip |
| Ascent | Return from evidence to finding/report context | Reverses the descent path |
| Drift | Ambient world liveliness | Low amplitude; stops under reduced motion or inactivity |
| Sweep | Revision comparison across a bounded source | User-triggered and scrubbable |
| Dissolve | Superseded version leaving active context | Never implies deletion; history remains accessible |

## Interface timing tokens

- Instant state response: 0–80 ms.
- Micro-transition: 120–180 ms.
- Panel/layout transition: 180–260 ms.
- Context transition: 240–400 ms.
- World camera transition: 350–700 ms, always skippable.
- Ambient cycles: 8–30 seconds with low contrast.

Tokens are ceilings for common work, not targets every interaction must use.

## Processing motion

Progress must reflect actual stages and units. A bloom can announce a completed page batch, but the interface also shows plain-language state such as “OCR: 84 of 120 pages.” Never use an endless cinematic animation to conceal unknown progress.

Partial failure interrupts the relevant region, not the whole world. Failed or unsupported material becomes a stable coverage-gap state with remediation.

## Revision motion

Revision comparison is the strongest functional use of motion. A user may scrub between baseline and current states; changed regions remain spatially anchored while additions emerge and removals recede. Text labels, a change list, and static diff mode provide equivalent meaning.

## Reduced motion

With `prefers-reduced-motion` or the product setting:

- replace travel and scale transitions with immediate state changes or short crossfades;
- stop particles, drift, pulses, and animated currents;
- keep focus placement, progress text, and change highlighting;
- never autoplay camera movement.

Reduced motion is verified in automated and manual release checks.

## Performance budgets

- No motion causes a core interaction to miss its responsiveness budget.
- Animate transform and opacity where possible; avoid layout thrashing.
- World rendering adapts detail before dropping interaction frame rate.
- Background tabs and obscured canvases stop rendering.
- GSAP is reserved for complex, measured sequences; routine UI motion uses the standard component-motion layer.

## Prohibited patterns

- Notification confetti, streaks, achievement motion, or engagement loops.
- Continuous pulsing on unresolved issues.
- Scroll-jacking, forced camera tours, or parallax that affects reading.
- Motion-only status, severity, direction, or selection.
- Long skeleton screens when known processing stages can be shown.
- Fake progress percentages.
