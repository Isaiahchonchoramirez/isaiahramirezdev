# Reef Design Language

## Design objective

Reef should feel calm, precise, deep, and alive while helping a buyer prepare evidence for a high-stakes review quickly. The product earns memorability through spatial clarity and restrained craft, not decorative spectacle.

The ocean identity has two layers:

1. **Work layer:** fast, flat, keyboard-complete review surfaces for documents, findings, evidence, and decisions.
2. **World layer:** an optional spatial map for understanding corpus structure, coverage, relationships, and change.

Both describe the same information. No task or fact exists only in the world layer.

## Principles

### Evidence is visually primary

Findings and generated language are subordinate to the source. The interface always provides a short route from claim to exact evidence and makes revision context obvious.

### Density is earned

Professional users need information density, but hierarchy must remain legible. Default views show the next decision; detail appears progressively without hiding material uncertainty.

### Calm signals state

Use luminance, position, text, and restrained motion to report state. Avoid casino color, celebratory confetti, pulsing urgency, and ornamental glass effects that reduce contrast.

### Two speeds

Routine review is immediate and keyboard-driven. Orientation and transitions may breathe. No animation sits between a reviewer and evidence.

### Metaphor remains optional

Every ocean metaphor must improve recognition, navigation, or explanation. If ordinary language and a standard control are clearer, use them.

## Information hierarchy

1. Current review and package status.
2. Unresolved material findings.
3. Current and baseline evidence.
4. Coverage gaps and uncertainty.
5. Package inventory and relationships.
6. Processing, model, and audit detail.

## Color

The launch-film palette becomes a product token family, adjusted for accessibility:

| Token | Base | Use |
| --- | --- | --- |
| Abyss | `#040E18` | Deep canvas and focused evidence mode |
| Deep | `#0A2233` | Raised navigation and spatial background |
| Structure teal | `#10788C` | Boundaries, neutral relationships, focus context |
| Biolume | `#3FE0D0` | Primary active state and selected evidence |
| Growth | `#2FD48A` | Resolved/verified state, always paired with text/icon |
| Sunlight | `#F2E3B0` | Sparse attention or current-context accent |
| Paper | near-white neutral | Document and report surfaces |

Critical, warning, and informational colors use accessible semantic tokens that remain distinguishable under common color-vision deficiencies. Never use the marketing palette as an excuse for low-contrast body text.

## Typography

- A neutral, highly legible sans serif for interface and dense review work.
- A restrained display face may appear in marketing and empty-state headings, never in tables or evidence.
- Tabular numerals for quantities, revisions, confidence, and timestamps.
- Minimum comfortable body size of 16 CSS pixels; dense tables may use 14 with generous line height and user zoom support.
- Long technical labels wrap or reveal fully; truncation always has an accessible full-name path.

## Components

Core components are source viewer, revision compare, finding row, evidence anchor, confidence/coverage state, document inventory, filter/command palette, processing timeline, disposition control, and report preview.

Components encode domain language. Generic “cards everywhere” are discouraged. Borders, spacing, alignment, and typography establish hierarchy before shadows or glass.

## Layout

The main review surface uses a resizable evidence workspace:

```text
review navigation | finding queue | current evidence | baseline/context
```

Panels collapse predictably at narrower widths. The finding queue remains reachable without covering evidence. Mobile supports status and light triage, not forced parity with desktop comparison.

## Accessibility

- Target WCAG 2.2 AA.
- Complete keyboard operation, including panel movement and evidence navigation.
- Visible focus, logical reading order, named landmarks, and live-region progress updates.
- Zoom to 200% without loss of function; text reflows where document fidelity is not required.
- Source images provide extracted text alternatives and coordinate-linked reading order.
- Reduced motion removes spatial travel and continuous ambient effects.
- The world layer has a complete structured-list alternative.

## Quality bar

A surface is unfinished until it defines loading, empty, partial, stale, failed, unsupported, permission-denied, offline, and completed states. Beautiful success screens do not compensate for vague failure.

Related: [OCEAN_WORLD.md](OCEAN_WORLD.md), [MOTION_LANGUAGE.md](MOTION_LANGUAGE.md), and [../architecture/ENGINEERING_PRINCIPLES.md](../architecture/ENGINEERING_PRINCIPLES.md).
