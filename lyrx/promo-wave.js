// <lyrx-wave> — an animated waveform / spectrogram field.
//
// Dozens of closely spaced strands, neon bloom, vertical spectrum spikes and a
// centre-weighted brightness envelope, faded at all four edges.
//
//     <script src="./promo-wave.js"></script>
//     <lyrx-wave amp="0.9" speed="0.4" density="56" spikes="280" glow="1.4"></lyrx-wave>
//
// Attributes
//   amp         amplitude multiplier                        (default 1,   0–4)
//   speed       time multiplier                             (default 1,   0–5)
//   density     strand count. 40–60 desktop, 24–32 mobile   (default auto)
//   spikes      spectrum column count                       (default 180, 20–500)
//   glow        bloom radius multiplier. 0 skips the pass   (default 1,   0–3)
//   spread      vertical spread of the strands, 0.05–0.8   (default 0.23)
//   mirror      "1" draws a dimmed reflection below         (default off)
//   background  "transparent" skips the dark wash           (default: wash)
//
// LyrxWaveField.render(ctx, opts) is exported on window for callers that drive
// their own canvas — see the hero in index.html. opts adds centerY, offsetY,
// mouse, edges ('all' | 'x' | 'none'), composite and alpha.
//
// Palette is blue → violet with the brand lime threaded through, matching the
// hero canvas in index.html. Keep the two in step; they read as one system when
// a visitor scrolls from one to the other.
//
// Honours prefers-reduced-motion by rendering a single static frame, and pauses
// entirely while scrolled offscreen.

const LIME_HUE = 76;        // #C8FF2E as hsl
const BLUE_HUE = 224;
const VIOLET_HUE = 266;
const ACCENT_EVERY = 7;     // every Nth strand carries the lime
const BLOOM_SCALE = 0.25;   // bloom buffer size relative to the field

class LyrxWave extends HTMLElement {
  connectedCallback() {
    if (this._canvas) return;
    // Only fill in what the page hasn't already set. Writing inline styles
    // unconditionally would beat a stylesheet's `position:absolute; inset:0`
    // and collapse the element to zero height.
    const cs = getComputedStyle(this);
    if (cs.display === 'inline') this.style.display = 'block';
    if (cs.position === 'static') this.style.position = 'relative';

    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    this._still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this);
    this._resize();

    // Pause offscreen so a page full of these costs nothing while scrolled away.
    this._io = new IntersectionObserver(es => es[0].isIntersecting ? this._start() : this._stop(), { rootMargin: '120px' });
    this._io.observe(this);
  }

  disconnectedCallback() {
    this._stop();
    this._ro?.disconnect();
    this._io?.disconnect();
  }

  _resize() {
    // 1.5 is plenty: the bloom pass softens everything anyway, and the raster cost
    // of this many strokes scales with device pixels.
    const dpr = this._dpr = Math.min(devicePixelRatio || 1, 1.5);
    const r = this.getBoundingClientRect();
    this._w = Math.max(1, Math.round(r.width));
    this._h = Math.max(1, Math.round(r.height));
    this._canvas.width = Math.round(this._w * dpr);
    this._canvas.height = Math.round(this._h * dpr);
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this._still || !this._raf) this._draw(0);
  }



  _start() {
    if (this._raf || this._still) { if (this._still) this._draw(0); return; }
    const loop = now => { this._draw(now / 1000); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }

  _stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }

  _draw(t) {
    const c = this._ctx;
    const w = this._w;
    const h = this._h;

    if (!c || !w || !h) return;

    const amp = this._numberAttr('amp', 1, 0, 4);
    const speed = this._numberAttr('speed', 1, 0, 5);
    const density = Math.round(this._numberAttr('density', this._autoDensity(), 8, 90));
    const spikes = Math.round(this._numberAttr('spikes', 180, 20, 500));
    const glow = this._numberAttr('glow', 1, 0, 3);
    const spread = this._numberAttr('spread', 0.23, 0.05, 0.8);
    const mirror = this.getAttribute('mirror') === '1';
    const tm = t * speed;

    c.clearRect(0, 0, w, h);

    // Dark wash. Skip it when the element overlays content that must show through.
    if (this.getAttribute('background') !== 'transparent') {
      const bg = c.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, 'rgba(0,0,0,0.99)');
      bg.addColorStop(0.5, 'rgba(1,2,10,0.96)');
      bg.addColorStop(1, 'rgba(0,0,0,0.99)');
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
    }

    (this._field || (this._field = new LyrxWaveField()))
      .render(c, { w, h, tm, amp, density, spikes, glow, spread, mirror });
  }

  _numberAttr(name, fallback, min = -Infinity, max = Infinity) {
    const raw = Number.parseFloat(this.getAttribute(name));
    const value = Number.isFinite(raw) ? raw : fallback;
    return Math.min(max, Math.max(min, value));
  }

  // Narrow viewports get fewer strands. Overridden by an explicit density attribute.
  _autoDensity() {
    return this._w < 700 ? 26 : 46;
  }

}

// Renderer for the field itself. Owns its offscreen buffers so both the custom
// element and the app's own hero canvas (index.html rafLoop) can drive one.
//
// render() only ever composites onto the target — it never clears it and never
// runs destination-in against it — so it is safe to draw over existing content
// such as the hero's laser beams.
class LyrxWaveField {
  render(ctx, o) {
    const w = this._w = Math.max(1, Math.round(o.w));
    const h = this._h = Math.max(1, Math.round(o.h));
    if (!w || !h) return;

    const amp = o.amp ?? 1;
    const density = Math.round(o.density ?? 46);
    const spikes = Math.round(o.spikes ?? 180);
    const glow = o.glow ?? 1;
    const spread = o.spread ?? 0.23;
    const centerFrac = o.centerY ?? 0.58;
    const mouse = o.mouse || null;
    const tm = o.tm ?? 0;

    const s = this._scratchCtx();
    s.clearRect(0, 0, w, h);
    s.save();
    // source-over, not screen: on a transparent buffer these low-alpha strokes
    // still accumulate into brightness, and per-stroke `screen` blending measured
    // ~5ms/frame more at this stroke count.
    s.globalCompositeOperation = 'source-over';
    this._drawSpectrumSpikes(s, w, h, tm, spikes, amp, centerFrac, mouse);
    this._drawWaveMesh(s, w, h, tm, density, amp, o.mirror, spread, centerFrac, mouse);
    this._drawBrightRidges(s, w, h, tm, amp, centerFrac, mouse);
    s.restore();

    // Fade the buffer, not the target: destination-in on the target would erase
    // whatever was already drawn there.
    if (o.edges !== 'none') {
      s.save();
      s.globalCompositeOperation = 'destination-in';
      s.drawImage(this._edgeMask(w, h, o.edges || 'all'), 0, 0, w, h);
      s.restore();
    }

    // offsetY lets a caller render only the band it needs and place it, instead of
    // paying for a buffer the full height of its canvas.
    const oy = o.offsetY || 0;

    ctx.save();
    if (o.composite) ctx.globalCompositeOperation = o.composite;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.drawImage(this._scratch, 0, oy, w, h);

    if (glow > 0) {
      // Blur a quarter-scale copy and upscale it. Bloom carries no high-frequency
      // detail, so this is visually identical to blurring at full resolution and
      // costs ~16x less — the blur is the last real expense in the frame.
      const bctx = this._bloomCtx();
      const bw = this._bloom.width, bh = this._bloom.height;
      bctx.clearRect(0, 0, bw, bh);
      bctx.filter = `blur(${Math.max(0.5, 5 * glow * BLOOM_SCALE).toFixed(2)}px)`;
      bctx.drawImage(this._scratch, 0, 0, bw, bh);
      bctx.filter = 'none';
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = (o.alpha ?? 1) * 0.9;
      ctx.drawImage(this._bloom, 0, oy, w, h);
    }
    ctx.restore();
  }

  // Offscreen buffer the strands are drawn into, so the bloom is one blur of the
  // finished field rather than a shadowBlur on every one of ~340 strokes.
  //
  // Kept at 1 device pixel per CSS pixel even on denser displays: this is a soft
  // glow field sitting behind a bloom pass, so the upscale is invisible, and stroke
  // rasterisation is the hot path — it scales with buffer area.
  _scratchCtx() {
    const sw = this._w, sh = this._h;
    if (!this._scratch) {
      this._scratch = document.createElement('canvas');
      this._sctx = this._scratch.getContext('2d');
    }
    if (this._scratch.width !== sw || this._scratch.height !== sh) {
      this._scratch.width = sw;
      this._scratch.height = sh;
    }
    this._sctx.setTransform(1, 0, 0, 1, 0, 0);
    return this._sctx;
  }

  // Quarter-scale buffer the bloom is blurred in before being upscaled back.
  _bloomCtx() {
    const bw = Math.max(1, Math.round(this._w * BLOOM_SCALE));
    const bh = Math.max(1, Math.round(this._h * BLOOM_SCALE));
    if (!this._bloom) {
      this._bloom = document.createElement('canvas');
      this._bctx = this._bloom.getContext('2d');
    }
    if (this._bloom.width !== bw || this._bloom.height !== bh) {
      this._bloom.width = bw;
      this._bloom.height = bh;
    }
    this._bctx.setTransform(1, 0, 0, 1, 0, 0);
    return this._bctx;
  }

  waveAt(x, tm, strand, w, mouse, centerY) {
    // Normalised so the composition scales across viewport widths rather than
    // changing shape with raw pixel count.
    const nx = x / Math.max(1, w);

    // Broad hills: the overall silhouette.
    const macro =
      Math.sin(nx * Math.PI * 4.15 + tm * 0.52 + strand * 0.013) * 29 +
      Math.sin(nx * Math.PI * 8.8 - tm * 0.31 + 1.3) * 16 +
      Math.sin(nx * Math.PI * 14.5 + tm * 0.73 + strand * 0.026) * 8;

    // Smaller ripples give each strand its own trajectory.
    const detail =
      Math.sin(x * 0.017 + tm * 1.18 + strand * 0.17) * 5.5 +
      Math.sin(x * 0.041 - tm * 0.84 + strand * 0.31) * 2.4;

    // Energy rises and falls across the width so it never looks uniform.
    const energy =
      0.55 +
      0.3 * Math.sin(nx * Math.PI * 2.6 - 0.9) +
      0.15 * Math.sin(nx * Math.PI * 9.0 + 0.4);

    let v = (macro + detail) * energy;

    // Cursor bulge, carried over from the hero canvas: strands lift and ripple
    // toward the pointer, falling off with distance in both axes.
    if (mouse && mouse.active) {
      const dx = Math.abs(x - mouse.x);
      const influence = Math.exp(-(dx * dx) / (2 * 110 * 110));
      const pull = centerY == null ? 1
        : Math.max(0, 1 - Math.abs(mouse.y - centerY) / Math.max(1, this._h * 0.7));
      v += influence * pull * (22 + Math.abs(mouse.vx || 0) * 1.1) * Math.sin(x * 0.06 + tm * 6);
      v += influence * pull * 12;
    }

    return v;
  }

  _drawWaveMesh(c, w, h, tm, density, amp, mirror, spread, centerFrac, mouse) {
    const centerY = h * centerFrac;
    // These curves are low-frequency and the bloom softens them further, so a
    // sample every ~7px is indistinguishable from every 3px and costs half as
    // much to rasterise. Strand rasterisation is the hot path in this component.
    const step = Math.max(5, Math.min(9, w / 200));

    for (let i = 0; i < density; i++) {
      const p = density <= 1 ? 0 : i / (density - 1);
      const depth = p - 0.5;

      // Spread vertically while keeping the middle tightly packed.
      const verticalOffset =
        depth * h * spread +
        Math.sin(i * 0.72 + tm * 0.16) * 2.4;

      const strandAmp = amp * (0.76 + Math.cos(depth * Math.PI) * 0.34);

      // Top strands lean blue, lower strands violet, with a lime strand threaded
      // through at a regular interval to hold the brand accent in the field.
      const accent = i % ACCENT_EVERY === 3;
      const hue = accent ? LIME_HUE : BLUE_HUE + p * (VIOLET_HUE - BLUE_HUE);
      const lightness = 61 + Math.cos(depth * Math.PI) * 9;
      const alpha = (0.08 + Math.cos(depth * Math.PI) * 0.2) * (accent ? 0.85 : 1);

      c.beginPath();

      for (let x = -step; x <= w + step; x += step) {
        const wave = this.waveAt(x, tm, i, w, mouse, centerY) * strandAmp;

        // Slight skew separates strands instead of stacking perfect copies.
        const skew =
          Math.sin(x * 0.006 + i * 0.2 - tm * 0.2) *
          Math.abs(depth) *
          10;

        const y = centerY + verticalOffset - wave + skew;

        if (x <= 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }

      c.strokeStyle = `hsla(${hue}, 96%, ${lightness}%, ${alpha})`;
      c.lineWidth = 0.55 + (1 - Math.abs(depth) * 2) * 0.55;
      c.stroke();

      if (mirror) {
        c.save();
        c.globalAlpha = 0.16;
        c.scale(1, -0.42);
        c.translate(0, -centerY * 3.25);
        c.stroke();
        c.restore();
      }
    }

  }

  _drawBrightRidges(c, w, h, tm, amp, centerFrac, mouse) {
    const centerY = h * centerFrac;
    const step = Math.max(2, Math.min(4, w / 520));

    // The lime ridge reads as the signal line; blue and violet sit behind it.
    const ridges = [
      { offset: -3, hue: LIME_HUE,   alpha: 0.72, width: 1.20 },
      { offset: 4,  hue: 218,        alpha: 0.58, width: 0.90 },
      { offset: 13, hue: VIOLET_HUE, alpha: 0.40, width: 0.75 }
    ];

    for (let r = 0; r < ridges.length; r++) {
      const ridge = ridges[r];

      c.beginPath();

      for (let x = 0; x <= w; x += step) {
        const wave =
          this.waveAt(x, tm, r * 11 + 5, w, mouse, centerY) *
          amp *
          (1.02 - r * 0.08);

        const y = centerY + ridge.offset - wave;

        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }

      c.strokeStyle = `hsla(${ridge.hue}, 100%, 70%, ${ridge.alpha})`;
      c.lineWidth = ridge.width;
      c.stroke();
    }

  }

  _drawSpectrumSpikes(c, w, h, tm, count, amp, centerFrac, mouse) {
    const centerY = h * (centerFrac - 0.02);
    const spacing = w / count;

    for (let i = 0; i < count; i++) {
      const x = i * spacing;
      const nx = x / Math.max(1, w);

      const wave = this.waveAt(x, tm, i * 0.17, w, mouse, centerY) * amp;
      const ridgeY = centerY - wave;

      // Deterministic pseudo-random: irregular columns without frame-to-frame flicker.
      const noise =
        0.5 +
        0.5 *
          Math.sin(
            i * 12.9898 +
            Math.sin(i * 0.81) * 18.233 +
            tm * (0.6 + (i % 7) * 0.025)
          );

      const pulse =
        0.45 +
        0.55 * Math.abs(Math.sin(i * 0.19 - tm * 1.35));

      const cluster =
        0.35 +
        0.65 *
          Math.pow(
            Math.abs(Math.sin(nx * Math.PI * 10.7 + tm * 0.12)),
            3
          );

      const spikeHeight = (8 + noise * 82 * pulse * cluster) * amp;

      const hue = BLUE_HUE - 6 + 35 * nx;
      const alpha = 0.06 + noise * 0.24;

      const gradient = c.createLinearGradient(
        x,
        ridgeY - spikeHeight,
        x,
        ridgeY + spikeHeight * 0.55
      );

      gradient.addColorStop(0, `hsla(${hue},100%,62%,0)`);
      gradient.addColorStop(0.55, `hsla(${hue},100%,67%,${alpha})`);
      gradient.addColorStop(1, `hsla(${hue + 15},100%,62%,0)`);

      c.beginPath();
      c.moveTo(x, ridgeY - spikeHeight);
      c.lineTo(x, ridgeY + spikeHeight * 0.55);
      c.strokeStyle = gradient;
      c.lineWidth = Math.max(0.45, spacing * 0.24);
      c.stroke();
    }

  }

  // The fade only changes when the element resizes, so bake it once and apply it
  // as a single destination-in blit rather than rebuilding two gradients a frame.
  _edgeMask(w, h, edges = 'all') {
    if (this._mask && this._mask.width === w && this._mask.height === h && this._maskEdges === edges) return this._mask;
    this._maskEdges = edges;
    const m = this._mask || (this._mask = document.createElement('canvas'));
    m.width = w; m.height = h;
    const x = m.getContext('2d');
    x.clearRect(0, 0, w, h);

    const horizontal = x.createLinearGradient(0, 0, w, 0);
    horizontal.addColorStop(0, 'rgba(0,0,0,0)');
    horizontal.addColorStop(0.035, 'rgba(0,0,0,0.82)');
    horizontal.addColorStop(0.1, 'rgba(0,0,0,1)');
    horizontal.addColorStop(0.9, 'rgba(0,0,0,1)');
    horizontal.addColorStop(0.965, 'rgba(0,0,0,0.82)');
    horizontal.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = horizontal;
    x.fillRect(0, 0, w, h);

    if (edges === 'all') {
      const vertical = x.createLinearGradient(0, 0, 0, h);
      vertical.addColorStop(0, 'rgba(0,0,0,0)');
      vertical.addColorStop(0.18, 'rgba(0,0,0,0.85)');
      vertical.addColorStop(0.4, 'rgba(0,0,0,1)');
      vertical.addColorStop(0.78, 'rgba(0,0,0,1)');
      vertical.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in';
      x.fillStyle = vertical;
      x.fillRect(0, 0, w, h);
    }

    return m;
  }

}

customElements.define('lyrx-wave', LyrxWave);

// index.html's rafLoop drives its own instance on the hero canvas, so the
// music-reactive waveform and this one are the same renderer.
window.LyrxWaveField = LyrxWaveField;
