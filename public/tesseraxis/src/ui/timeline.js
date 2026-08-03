// The timeline.
//
// Scrubbing here is not scrubbing a recording — there are no stored frames to
// jump between. Dragging the playhead restores the nearest world snapshot and
// re-simulates forward under the recorded inputs, so the state you land on is
// the state the run actually had. That is only possible because the engine is
// deterministic, and it is the single feature that most justifies the fixed
// timestep everything else is built on.

import { el, formatClock } from './dom.js';

const MARK_COLORS = {
  run: '#78e8ff',
  phase: '#c98500',
  contact: '#0ca30c',
  warning: '#fab219',
  failure: '#d03b3b',
};

export class Timeline {
  constructor(container, sim) {
    this.sim = sim;
    this.container = container;

    this.track = el('div', { class: 'timeline-track' });
    this.fill = el('div', { class: 'timeline-fill' });
    this.marks = el('div', { class: 'timeline-marks' });
    this.head = el('div', { class: 'timeline-head' });
    this.tip = el('div', { class: 'timeline-tip', hidden: true });

    this.track.append(this.fill, this.marks, this.head);

    this.clock = el('span', { class: 'timeline-clock', text: 'T+00:00.00' });
    this.tickLabel = el('span', { class: 'timeline-tick', text: 'tick 0' });

    this.element = el('div', { class: 'timeline' }, [
      this.clock,
      el('div', { class: 'timeline-track-wrap' }, [this.track, this.tip]),
      this.tickLabel,
    ]);
    container.append(this.element);

    this._dragging = false;
    this._markCount = 0;
    this._bind();
  }

  _bind() {
    const track = this.track;

    const timeAt = (clientX) => {
      const rect = track.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return fraction * this.sim.loop.time;
    };

    track.addEventListener('pointerdown', (event) => {
      track.setPointerCapture(event.pointerId);
      this._dragging = true;
      this.sim.seekToTime(timeAt(event.clientX));
    });

    track.addEventListener('pointermove', (event) => {
      const time = timeAt(event.clientX);
      const rect = track.getBoundingClientRect();
      this.tip.hidden = false;
      this.tip.textContent = formatClock(time);
      this.tip.style.left = `${event.clientX - rect.left}px`;

      if (!this._dragging) return;
      // Seeking on every pointermove would re-simulate up to five seconds of
      // physics per event and make the drag feel like treacle. Coalescing to
      // one seek per animation frame keeps it responsive while still landing
      // on real state rather than an interpolation.
      this._pendingSeek = time;
      if (!this._seekScheduled) {
        this._seekScheduled = true;
        requestAnimationFrame(() => {
          this._seekScheduled = false;
          if (this._pendingSeek !== null) this.sim.seekToTime(this._pendingSeek);
          this._pendingSeek = null;
        });
      }
    });

    const release = (event) => {
      if (this._dragging) track.releasePointerCapture?.(event.pointerId);
      this._dragging = false;
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('pointerleave', () => {
      this.tip.hidden = true;
    });
  }

  // Event marks are rebuilt only when their count changes — the run adds a
  // handful over a whole flight, so rebuilding per frame would be pure waste.
  update() {
    const { loop, recorder } = this.sim;
    const duration = Math.max(loop.time, 1e-6);

    this.clock.textContent = formatClock(loop.time);
    this.tickLabel.textContent = `tick ${loop.tick.toLocaleString()}`;

    // The playhead sits at the live edge unless a seek has moved it back, in
    // which case loop.time is the seek point and the fill shows how much of
    // the run is behind it.
    this.fill.style.width = '100%';
    this.head.style.left = '100%';

    if (recorder.events.length !== this._markCount) {
      this._markCount = recorder.events.length;
      this.marks.innerHTML = '';
      for (const event of recorder.events) {
        const mark = el('i', {
          class: 'timeline-mark',
          title: `${formatClock(event.time)} — ${event.label}`,
          style: {
            left: `${(event.time / duration) * 100}%`,
            background: MARK_COLORS[event.type] ?? MARK_COLORS.run,
          },
        });
        this.marks.append(mark);
      }
      this._markDuration = duration;
    } else if (this._markDuration && Math.abs(duration - this._markDuration) > duration * 0.02) {
      // The run got meaningfully longer, so the existing marks are now in the
      // wrong place. Repositioning is cheaper than rebuilding.
      const nodes = this.marks.children;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.left = `${(recorder.events[i].time / duration) * 100}%`;
      }
      this._markDuration = duration;
    }
  }
}

export default Timeline;
