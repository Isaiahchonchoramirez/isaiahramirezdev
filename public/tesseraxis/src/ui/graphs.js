// Telemetry graphs.
//
// One card per graph, one canvas per card, all sharing a time window so the
// whole stack reads as a single instrument rather than as unrelated pictures.
//
// A deliberate constraint: every channel on a card shares one y-axis. Plotting
// altitude (0–2000 m) against throttle (0–1) on twinned scales would let the
// reader see a correlation that is purely an artefact of where the two axes
// happened to be pinned. Quantities with different units get different cards.

import { el, formatValue } from './dom.js';
import { INK, SURFACE, seriesColor } from './theme.js';

const PAD = { left: 56, right: 58, top: 10, bottom: 22 };

export class GraphCard {
  constructor(spec, recorder, channelColors) {
    this.spec = spec;
    this.recorder = recorder;
    this.channels = spec.channels
      .map((key) => recorder.channel(key))
      .filter(Boolean);
    this.colors = this.channels.map((c) => c.color || channelColors.get(c.key) || seriesColor(0));

    // A single series does not need a legend box — the card title names it.
    // Two or more always do, so identity is never carried by colour alone.
    const legend =
      this.channels.length > 1
        ? el(
            'div',
            { class: 'graph-legend' },
            this.channels.map((channel, i) =>
              el('span', { class: 'legend-item' }, [
                el('i', { style: { background: this.colors[i] } }),
                channel.label,
              ]),
            ),
          )
        : null;

    this.canvas = el('canvas', { class: 'graph-canvas' });
    this.tooltip = el('div', { class: 'graph-tooltip', hidden: true });

    this.element = el('article', { class: 'graph-card' }, [
      el('header', { class: 'graph-head' }, [
        el('h4', { text: spec.title }),
        el('span', { class: 'graph-unit', text: this.channels[0]?.unit ?? '' }),
        legend,
      ]),
      el('div', { class: 'graph-body' }, [this.canvas, this.tooltip]),
    ]);

    this.ctx = this.canvas.getContext('2d');
    this.hover = null;
    this._bindHover();
  }

  _bindHover() {
    const canvas = this.canvas;
    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      this.tooltip.hidden = true;
    });
  }

  // range: [tStart, tEnd] in simulated seconds. playhead: current sim time.
  draw(range, playhead) {
    const canvas = this.canvas;
    const dpr = Math.min(globalThis.devicePixelRatio ?? 1, 2);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const plot = {
      x: PAD.left,
      y: PAD.top,
      w: Math.max(1, cssWidth - PAD.left - PAD.right),
      h: Math.max(1, cssHeight - PAD.top - PAD.bottom),
    };

    const [t0, t1] = range;
    const span = Math.max(1e-6, t1 - t0);
    const recorder = this.recorder;

    const from = recorder.indexAtTime(t0);
    const to = Math.min(recorder.sampleCount, recorder.indexAtTime(t1) + 1);

    const [lo, hi] = this._domain(from, to);
    const toX = (t) => plot.x + ((t - t0) / span) * plot.w;
    const toY = (v) => plot.y + plot.h - ((v - lo) / (hi - lo)) * plot.h;

    this._drawGrid(ctx, plot, lo, hi, t0, t1, toX, toY);

    // Sampling stride: never draw more than about two points per device pixel
    // column. Beyond that the extra segments are invisible and the cost is not.
    const visible = to - from;
    const stride = Math.max(1, Math.floor(visible / (plot.w * 2)));

    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x, plot.y - 2, plot.w, plot.h + 4);
    ctx.clip();

    for (let c = 0; c < this.channels.length; c++) {
      this._drawSeries(ctx, this.channels[c], this.colors[c], from, to, stride, toX, toY);
    }
    ctx.restore();

    this._drawEndLabels(ctx, plot, to, toY);
    this._drawPlayhead(ctx, plot, playhead, t0, t1, toX);
    this._drawCrosshair(ctx, plot, t0, span, toX, toY, from, to);
  }

  _domain(from, to) {
    const spec = this.spec;
    // A fixed range is used whenever the quantity has one — throttle is 0 to 1
    // whatever a given run does, and letting it autoscale would make an idle
    // engine's noise look like full-range activity.
    let lo = Infinity;
    let hi = -Infinity;
    for (const channel of this.channels) {
      if (channel.min !== null && channel.max !== null) {
        lo = Math.min(lo, channel.min);
        hi = Math.max(hi, channel.max);
        continue;
      }
      const [cLo, cHi] = channel.extent(from, to);
      lo = Math.min(lo, cLo);
      hi = Math.max(hi, cHi);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];

    if (spec.includeZero && lo > 0) lo = 0;
    if (spec.includeZero && hi < 0) hi = 0;

    // A little headroom so a peak never sits exactly on the frame edge.
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }

  _drawGrid(ctx, plot, lo, hi, t0, t1, toX, toY) {
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';

    // Solid hairlines one shade off the surface — a grid is scaffolding, and
    // dashing it makes it read as a threshold that means something.
    const ticks = niceTicks(lo, hi, 4);
    ctx.strokeStyle = INK.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = INK.muted;
    ctx.textAlign = 'right';

    for (const value of ticks) {
      const y = Math.round(toY(value)) + 0.5;
      if (y < plot.y - 1 || y > plot.y + plot.h + 1) continue;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
      ctx.fillText(formatTick(value), plot.x - 8, y);
    }

    // Zero line gets a touch more presence than the rest of the grid — for a
    // signed quantity like vertical speed, the sign change is the reading.
    if (lo < 0 && hi > 0) {
      const y = Math.round(toY(0)) + 0.5;
      ctx.strokeStyle = INK.axis;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = INK.grid;
    ctx.textAlign = 'center';
    const timeTicks = niceTicks(t0, t1, 5);
    for (const value of timeTicks) {
      if (value < t0 || value > t1) continue;
      const x = Math.round(toX(value)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
      ctx.fillText(`${value.toFixed(value >= 100 ? 0 : 1)}s`, x, plot.y + plot.h + 11);
    }
  }

  _drawSeries(ctx, channel, color, from, to, stride, toX, toY) {
    const times = this.recorder.times;
    const data = channel.data;
    if (to - from < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    let started = false;
    for (let i = from; i < to; i += stride) {
      const value = data[i];
      if (!Number.isFinite(value)) {
        // A gap in the data is drawn as a gap, not bridged — pretending
        // otherwise invents a value that was never recorded.
        started = false;
        continue;
      }
      const x = toX(times[i]);
      const y = toY(value);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    // Always include the final sample so the line reaches the playhead even
    // when the stride would have skipped it.
    const last = to - 1;
    if (started && Number.isFinite(data[last])) ctx.lineTo(toX(times[last]), toY(data[last]));
    ctx.stroke();
  }

  // Direct labels at the right edge. Selective by design: the current value of
  // each series, and nothing else. A number on every point is unreadable.
  _drawEndLabels(ctx, plot, to, toY) {
    if (to < 1 || this.channels.length > 4) return;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Collision avoidance: labels are placed in value order and pushed apart
    // to a minimum spacing, so two series that converge do not overprint.
    const entries = this.channels
      .map((channel, i) => ({
        value: channel.data[to - 1],
        color: this.colors[i],
        precision: channel.precision,
      }))
      .filter((entry) => Number.isFinite(entry.value))
      .map((entry) => ({ ...entry, y: toY(entry.value) }))
      .sort((a, b) => a.y - b.y);

    const minGap = 12;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].y - entries[i - 1].y < minGap) entries[i].y = entries[i - 1].y + minGap;
    }

    for (const entry of entries) {
      const y = Math.max(plot.y + 5, Math.min(plot.y + plot.h - 5, entry.y));
      ctx.fillStyle = entry.color;
      ctx.fillRect(plot.x + plot.w + 4, y - 1, 6, 2);
      // The number itself wears ink, not the series colour: coloured text at
      // 10px is hard to read, and the swatch beside it already carries identity.
      ctx.fillStyle = INK.secondary;
      ctx.fillText(formatValue(entry.value, entry.precision), plot.x + plot.w + 14, y);
    }
  }

  _drawPlayhead(ctx, plot, playhead, t0, t1, toX) {
    if (playhead < t0 || playhead > t1) return;
    const x = Math.round(toX(playhead)) + 0.5;
    ctx.strokeStyle = 'rgba(120,232,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
  }

  _drawCrosshair(ctx, plot, t0, span, toX, toY, from, to) {
    const hover = this.hover;
    if (!hover || to - from < 1) {
      this.tooltip.hidden = true;
      return;
    }
    if (hover.x < plot.x || hover.x > plot.x + plot.w) {
      this.tooltip.hidden = true;
      return;
    }

    const time = t0 + ((hover.x - plot.x) / plot.w) * span;
    const index = Math.max(from, Math.min(to - 1, this.recorder.indexAtTime(time)));
    const x = Math.round(toX(this.recorder.times[index])) + 0.5;

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();

    const rows = [];
    for (let c = 0; c < this.channels.length; c++) {
      const channel = this.channels[c];
      const value = channel.data[index];
      if (!Number.isFinite(value)) continue;

      const y = toY(value);
      // A 2px surface ring around the marker separates it from the line it
      // sits on without drawing a border in a third colour.
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = SURFACE;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.colors[c];
      ctx.fill();

      rows.push(
        `<span><i style="background:${this.colors[c]}"></i>${channel.label}</span><b>${formatValue(
          value,
          channel.precision,
          channel.unit,
        )}</b>`,
      );
    }

    this.tooltip.innerHTML =
      `<em>${this.recorder.times[index].toFixed(2)} s</em>` +
      rows.map((row) => `<div class="tip-row">${row}</div>`).join('');
    this.tooltip.hidden = false;

    // Flip the tooltip to the other side of the cursor near the right edge so
    // it never leaves the card.
    const width = this.tooltip.offsetWidth || 150;
    const flip = hover.x + width + 18 > this.canvas.clientWidth;
    this.tooltip.style.left = `${flip ? hover.x - width - 12 : hover.x + 12}px`;
    this.tooltip.style.top = `${Math.min(plot.y + plot.h - 10, hover.y)}px`;
  }
}

// 1-2-5 tick steps. Picking round numbers matters more than hitting the
// requested count exactly — a reader can do arithmetic with 250 and cannot
// with 237.
function niceTicks(lo, hi, count) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo];
  const rough = (hi - lo) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step = (normalized >= 5 ? 10 : normalized >= 2 ? 5 : normalized >= 1 ? 2 : 1) * magnitude;
  const first = Math.ceil(lo / step) * step;
  const ticks = [];
  for (let v = first; v <= hi + step * 1e-6; v += step) {
    // Re-rounding kills the float dust that turns 0.30000000000000004 into a
    // seven-character axis label.
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
  }
  return ticks;
}

function formatTick(value) {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${(value / 1e3).toFixed(0)}k`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1);
  if (abs === 0) return '0';
  return value.toFixed(2);
}

// The stack of graph cards, plus the shared time window they all honour.
export class GraphPanel {
  constructor(container) {
    this.container = container;
    this.cards = [];
    this.windowSeconds = 30;
    this.followLatest = true;
  }

  build(plugin, recorder) {
    this.container.innerHTML = '';
    this.cards = [];

    // Colours are assigned per plugin in declaration order, so a channel keeps
    // the same hue on every card it appears on.
    const channelColors = new Map();
    (plugin.channels ?? []).forEach((spec, i) => {
      channelColors.set(spec.key, spec.color || seriesColor(i));
    });

    for (const spec of plugin.graphs ?? []) {
      const card = new GraphCard(spec, recorder, channelColors);
      this.cards.push(card);
      this.container.append(card.element);
    }
  }

  draw(currentTime, duration) {
    // The window trails the playhead while a run is live and pins to the whole
    // run when the user zooms out — two behaviours, one control.
    let t0;
    let t1;
    if (this.windowSeconds === Infinity) {
      t0 = 0;
      t1 = Math.max(1, duration);
    } else {
      t1 = Math.max(this.windowSeconds, currentTime);
      t0 = t1 - this.windowSeconds;
    }
    for (const card of this.cards) card.draw([t0, t1], currentTime);
  }
}

export default GraphPanel;
