// Scroll choreography for the Lyrx landing page.
//   [data-rise]        fades and rises into view once
//   [data-rise="fade"] fades only (for full-bleed image bands)
//   [data-rise="wipe"] reveals left-to-right
//   [data-d="1|2|3"]   stagger, handled in CSS
//
// The page is re-rendered by the app's own view switcher, which throws away DOM
// nodes and the classes on them. So this re-scans on mutation rather than
// running once at load.
(() => {
  // Claim the reveal styles the moment this file parses. The CSS scopes every
  // hidden state under .lx-motion, so a failed load leaves the page fully visible
  // rather than blank.
  document.documentElement.classList.add('lx-motion');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute('data-seen', '');
          io.unobserve(e.target);
        }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
    : null;

  function scan() {
    const nodes = document.querySelectorAll('[data-rise]:not([data-seen]):not([data-watched])');
    for (const n of nodes) {
      n.setAttribute('data-watched', '');
      // No observer, or the visitor asked for less motion: show it immediately.
      if (!io || REDUCED.matches) { n.setAttribute('data-seen', ''); continue; }
      // Already on screen at load (the hero) — reveal without waiting for a scroll.
      const r = n.getBoundingClientRect();
      if (r.top < innerHeight * 0.92 && r.bottom > 0) {
        requestAnimationFrame(() => n.setAttribute('data-seen', ''));
        continue;
      }
      io.observe(n);
    }
  }

  // Hero object drifts against the scroll. Cheap: one transform var, rAF-throttled.
  let ticking = false;
  function parallax() {
    ticking = false;
    const hero = document.querySelector('.lx-hero-object');
    if (!hero || REDUCED.matches) return;
    const r = hero.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const progress = 1 - (r.top + r.height / 2) / innerHeight;   // -1 … 1
    hero.style.setProperty('--lx-par', (progress * 26).toFixed(1) + 'px');
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
  }

  // The hero render ships on a black ground, which the CSS drops with
  // mix-blend-mode:screen. If a cut-out version with real transparency is dropped
  // in later, screen would let the violet bloom shine through the synth's body —
  // so sample the image and switch treatments instead of hard-coding either one.
  function heroAlpha() {
    const wrap = document.querySelector('.lx-hero-object');
    const img = wrap && wrap.querySelector('img');
    if (!img || wrap.hasAttribute('data-cut-checked')) return;
    const test = () => {
      wrap.setAttribute('data-cut-checked', '');
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 12;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.clearRect(0, 0, 12, 12);
        x.drawImage(img, 0, 0, 12, 12);
        const d = x.getImageData(0, 0, 12, 12).data;
        let minA = 255;
        for (let i = 3; i < d.length; i += 4) if (d[i] < minA) minA = d[i];
        if (minA < 24) wrap.setAttribute('data-cut', '');   // real transparency
      } catch (e) { /* tainted canvas: leave the default treatment */ }
    };
    img.complete && img.naturalWidth ? test() : img.addEventListener('load', test, { once: true });
  }

  function boot() {
    scan();
    parallax();
    heroAlpha();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });

    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); parallax(); heroAlpha(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', boot)
    : boot();
})();
