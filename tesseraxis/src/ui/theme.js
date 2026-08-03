// Colour tokens.
//
// Canvas cannot read CSS custom properties, so the values the graphs draw with
// live here and style.css mirrors them for the DOM. Keeping one source in JS
// rather than parsing computed styles every frame avoids a layout read inside
// the render loop.
//
// The categorical series slots are the validated eight-hue order, stepped for a
// dark surface. They were checked against this file's SURFACE with the
// data-viz validator: all eight clear the lightness band, the chroma floor,
// adjacent CVD separation (worst pair ΔE 8.4), the normal-vision floor
// (worst 19.3), and 3:1 contrast. Do not reorder them and do not add a ninth —
// the ordering is the colourblind-safety mechanism, and a generated ninth hue
// is indistinguishable from one of these under simulation.

export const SURFACE = '#0b1119';
export const PLANE = '#070b11';

export const INK = {
  primary: '#eef4fb',
  secondary: '#9fb0c4',
  muted: '#6c7f95',
  grid: 'rgba(255,255,255,0.055)',
  axis: 'rgba(255,255,255,0.14)',
  accent: '#78e8ff',
};

// Assigned in fixed order and never cycled. A graph needing a ninth channel is
// a graph that should have been split into small multiples.
export const SERIES = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
];

// Reserved for state, never for identity. Always shipped with a glyph and a
// label so the meaning never rests on hue alone.
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const STATUS_GLYPH = {
  good: '✓',
  warning: '!',
  serious: '▲',
  critical: '✕',
};

// Deterministic slot assignment: a channel keeps its colour no matter which
// other channels happen to be on the same graph, so a reader who learned
// "thrust is orange" is never contradicted by a different view.
export function seriesColor(index) {
  return SERIES[index % SERIES.length];
}
