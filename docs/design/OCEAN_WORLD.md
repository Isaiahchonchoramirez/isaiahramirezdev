# Ocean World

## Purpose

The ocean is Reef’s spatial information model. It answers questions a list handles poorly: What kinds of evidence are here? Where are the dense clusters? Which requirements connect distant documents? What changed? Where is coverage weak?

It is not the primary review queue, a mandatory navigation system, or an animated file browser.

## Canonical metaphor map

| Ocean concept | Product concept | Usability rule |
| --- | --- | --- |
| Surface | Executive report and current review outcome | Highest abstraction; never raw source |
| Sunlight zone | Accepted findings and active decisions | Things requiring current human attention |
| Reef | A project corpus | Stable structure built from many linked sources |
| Reef formation | Discipline, system, or document family | Grouping must match customer taxonomy |
| Coral colony | Logical document across revisions | Growth shows version history, not file size alone |
| Polyp | Source region or extracted requirement | Selectable evidence unit with a flat-view equivalent |
| Current | Typed relationship or dependency | Direction, strength, and uncertainty must be inspectable |
| Bioluminescent bloom | Processing or newly detected change | Temporary state; never a permanent glow tax |
| Open ocean | Sparse or weakly connected material | Signals isolation, not “miscellaneous” judgment |
| Deep ocean | Raw documents and unresolved context | Deeper means closer to source and lower abstraction |
| Abyss | Unprocessed, inaccessible, failed, or unsupported coverage | Always labeled; never used to imply mystery |
| Marine life | Transient derived objects or activity | Used sparingly; see below |
| Particles | Ambient scale and processing cues | Decorative only and removable for performance/accessibility |
| Light | Attention, evidence confidence, or active path | Meaning always duplicated through text/shape |

## Depth semantics

Depth has one meaning: **distance from decision to source**.

- Surface: report-level conclusions.
- Sunlight: findings and dispositions.
- Reef body: normalized requirements, entities, and references.
- Deep floor: page regions, table cells, and original artifacts.
- Abyss boundary: coverage the system cannot interpret or the user cannot access.

Do not overload depth with severity, age, confidentiality, or file type. Those use separate encodings.

## Marine life policy

The earlier brand concepts map whales to databases, schools to tables, jellyfish to audio, and rays to video. That works in a launch film because the viewer reads it emotionally. In product navigation it is too ambiguous.

Therefore:

- marine life is allowed in onboarding, ambient state, marketing, and an optional legend-driven corpus overview;
- standard product nouns remain visible: drawing, specification, table, requirement, RFI, finding;
- an animal shape never becomes the only way to identify a format;
- “AI reasoning = whale migration” is rejected. Reasoning needs a trace, not an animal metaphor;
- file-type animals are deferred until audio/video are real customer modalities.

## Navigation

Users enter the world from a project overview or by toggling from the structured corpus view. Search and command palette work in both modes. Selecting an organism opens its standard detail panel; it does not require camera precision.

Required controls:

- jump to unresolved finding;
- filter discipline, type, revision, confidence, and status;
- isolate a relationship path;
- return to the previous selection and camera state;
- reset orientation instantly;
- toggle list/world without losing context.

Keyboard and screen-reader users receive the same graph as an expandable hierarchy and relationship list.

## Visual encodings

- Size: quantity of supported evidence, logarithmically bounded.
- Density: relationship concentration.
- Brightness: current selection or verified attention, not quality by itself.
- Pulse: temporary processing/change only.
- Hue: stable category token with legend.
- Broken contour: missing/failed coverage.
- Filament direction: reference or change propagation, with arrow/label on inspection.

Every encoding has a legend and textual representation. Avoid decorative randomness that makes the same project look different on every visit.

## Performance and fallback

- The world is code-split and never downloaded for users who do not open it.
- Target stable interaction on representative integrated graphics, with adaptive object/particle/detail budgets.
- Pause rendering when hidden or idle.
- Respect reduced motion and low-power settings.
- If WebGL fails, open the structured corpus map automatically with no lost capability.

## Removal test

For every metaphor ask: does it improve time to locate, understand, compare, or remember information? If measured use shows no improvement, remove it from the product while retaining it in brand storytelling if valuable there.
