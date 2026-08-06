(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'dc-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  const pointer = { x: 0, y: 0, active: false };
  let w = 0;
  let h = 0;
  let dpr = 1;
  let scrollTarget = 0;
  let scroll = 0;
  let raf = 0;
  let last = 0;

  const random = (seed) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  const countForWidth = () => Math.min(300, Math.max(120, Math.round(w / 5.5)));
  let particles = [];

  // Halo sprites. Drawing a pre-rendered radial gradient beats ctx.shadowBlur on
  // both looks and cost: shadowBlur smears every dot into the same fuzzy blob,
  // while a sprite keeps a hard core with a soft falloff around it — which is
  // what makes the points read as individually visible rather than as haze.
  const halos = {};
  function halo(rgb, size) {
    const key = `${rgb}|${size}`;
    if (halos[key]) return halos[key];
    const s = size * 2;
    const off = document.createElement('canvas');
    off.width = s;
    off.height = s;
    const c = off.getContext('2d');
    // Kept deliberately faint. These composite additively, so when the field
    // clusters, dozens of halos land on top of each other — at any higher alpha
    // the stack blows out past the colour into a grey cloud that reads as dust
    // rather than as a constellation.
    const g = c.createRadialGradient(size, size, 0, size, size, size);
    g.addColorStop(0, `rgba(${rgb},0.26)`);
    g.addColorStop(0.3, `rgba(${rgb},0.08)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    halos[key] = off;
    return off;
  }

  function makeParticles() {
    particles = Array.from({ length: countForWidth() }, (_, i) => ({
      // Biased right of centre. The hero copy runs down the left, so an even
      // scatter puts the densest part of the field exactly where it is least
      // wanted — behind the headline.
      x: 0.24 + random(i + 1) * 0.8,
      y: random(i + 47),
      // Three readable depth bands rather than one continuous blur: the eye
      // needs discrete planes to perceive depth, not a smooth size gradient.
      z: [0.34, 0.66, 1][i % 3] + random(i + 91) * 0.22,
      orbit: random(i + 173) * Math.PI * 2,
      group: i % 4,
      amber: i % 37 === 0,
      twinkle: random(i + 211) * Math.PI * 2,
    }));
  }

  function resize() {
    w = innerWidth;
    h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
  }

  function progress() {
    const root = document.querySelector('.dc-landing');
    const max = Math.max(1, (root?.scrollHeight || document.documentElement.scrollHeight) - h);
    return Math.min(1, scroll / max);
  }

  function position(p, t, time) {
    const section = Math.min(3, Math.floor(t * 4));
    const local = t * 4 - section;
    const drift = reduceMotion ? 0 : Math.sin(time * 0.00018 * p.z + p.orbit) * 13;
    // Depth parallax: near particles travel further against the scroll than far
    // ones, which is what separates the planes as the page moves.
    const parallax = reduceMotion ? 0 : -scroll * 0.045 * p.z;
    let x = p.x * w;
    let y = p.y * h + parallax;

    // Resting structure. At the top of the page the field used to be pure
    // scatter, which reads as television static rather than as data. Blending
    // part-way toward a layered ring gives the hero a subject the eye can hold,
    // while the un-blended remainder keeps it from looking like clip art.
    if (section === 0) {
      const cx = 0.68 * w;
      const cy = 0.44 * h;
      const ringRadius = (0.09 + p.group * 0.052) * Math.min(w, h * 1.9);
      const angle = p.orbit + time * 0.000045 * (p.group % 2 ? 1 : -1);
      const lx = cx + Math.cos(angle) * ringRadius;
      const ly = cy + Math.sin(angle) * ringRadius * 0.66;
      // Fades out as the first pattern-forming phase takes over.
      const settle = 0.5 * (1 - Math.min(1, local));
      x += (lx - x) * settle;
      y += (ly - y) * settle;
    }

    if (section >= 1) {
      const centers = [
        [0.23, 0.28], [0.72, 0.23], [0.34, 0.72], [0.78, 0.68],
      ];
      const c = centers[p.group];
      const radius = (36 + p.z * 125) * (section === 1 ? 1 - local * 0.42 : 0.58);
      const angle = p.orbit + time * 0.00008 + t * 5.5;
      const tx = c[0] * w + Math.cos(angle) * radius;
      const ty = c[1] * h + Math.sin(angle) * radius * 0.62;
      const pull = section === 1 ? local : 1;
      x += (tx - x) * pull;
      y += (ty - y) * pull;
    }

    if (section >= 2) {
      const columns = w < 700 ? 2 : 4;
      const col = p.group % columns;
      const row = Math.floor(p.group / columns);
      const cx = ((col + 0.7) / columns) * w;
      const cy = (0.34 + row * 0.34) * h;
      // Loose enough that the group stays legible as a set of points. Tighter
      // than this and the four groups collapse into four solid dots.
      const capsuleX = cx + Math.cos(p.orbit) * (74 + 66 * p.z);
      const capsuleY = cy + Math.sin(p.orbit) * (32 + 22 * p.z);
      const compress = section === 2 ? local : 1;
      x += (capsuleX - x) * compress;
      y += (capsuleY - y) * compress;
    }

    if (pointer.active) {
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < 190) {
        const influence = (1 - dist / 190) * 0.1;
        x += dx * influence;
        y += dy * influence;
      }
    }

    return { x: x + drift, y: y + drift * 0.35 };
  }

  function draw(time = 0) {
    raf = requestAnimationFrame(draw);
    if (time - last < (w < 700 ? 32 : 16)) return;
    last = time;
    scroll += (scrollTarget - scroll) * (reduceMotion ? 1 : 0.055);
    const t = progress();
    ctx.clearRect(0, 0, w, h);

    const pts = particles.map((p) => ({ ...p, ...position(p, t, time) }));
    // Never fully off: the threads are what make the resting rings read as a
    // lattice instead of loose dots.
    const connect = Math.max(0.4, Math.min(1, (t - 0.16) * 3.1));
    if (connect > 0) {
      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        for (let j = i + 1; j < Math.min(pts.length, i + 20); j += 1) {
          const b = pts[j];
          if (a.group !== b.group) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 96) {
            ctx.strokeStyle = `rgba(53,231,255,${(1 - dist / 96) * 0.2 * connect})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // Halos first, then cores on top, so no core is ever washed out by a
    // neighbour's glow.
    ctx.globalCompositeOperation = 'lighter';
    pts.forEach((p) => {
      const rgb = p.amber ? '255,182,92' : '92,235,255';
      const size = Math.round((p.amber ? 15 : 6 + p.z * 7));
      const sprite = halo(rgb, size);
      ctx.drawImage(sprite, p.x - size, p.y - size);
    });
    ctx.globalCompositeOperation = 'source-over';

    pts.forEach((p) => {
      const pulse = reduceMotion ? 1 : 0.86 + Math.sin(time * 0.0011 * p.z + p.twinkle) * 0.14;
      const radius = (p.amber ? 1.7 : 0.5 + p.z * 0.95) * pulse;
      ctx.fillStyle = p.amber
        ? 'rgba(255,205,150,0.98)'
        : `rgba(190,248,255,${(0.42 + p.z * 0.5) * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // The amber thread — one warm path traced through the field. Drawn as a
    // smoothed curve rather than a polyline so it reads as a route, not a
    // zig-zag.
    const amber = pts.filter((p) => p.amber).sort((a, b) => a.x - b.x);
    if (amber.length > 2) {
      ctx.strokeStyle = `rgba(255,182,92,${0.14 + connect * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(amber[0].x, amber[0].y);
      for (let i = 0; i < amber.length - 1; i += 1) {
        const a = amber[i];
        const b = amber[i + 1];
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      ctx.stroke();
    }
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => {
    scrollTarget = scrollY;
    // Drives the back-to-top affordance, which should not exist at the top.
    document.body.classList.toggle('dc-scrolled', scrollY > 600);
  }, { passive: true });
  addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  addEventListener('pointerout', () => { pointer.active = false; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else start();
  });

  // Sections carry data-reveal but nothing was ever observing them, so they all
  // sat at their pre-animation opacity. Re-observe on mutation because the view
  // is template-rendered and sections arrive after this script runs.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('dc-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  const bindReveals = () => {
    document.querySelectorAll('[data-reveal]:not(.dc-in)').forEach((el) => observer.observe(el));
  };

  // The field belongs to the landing page. The app shell has transparent gaps,
  // so leaving it running there just puts drifting particles through the middle
  // of the dashboard. Single entry point for starting the loop, so the mutation
  // observer and the visibility handler can't each start one of their own.
  const onLanding = () => !!document.querySelector('.dc-landing');
  const start = () => {
    if (raf || document.hidden || !onLanding()) return;
    raf = requestAnimationFrame(draw);
  };
  const syncVisibility = () => {
    const landing = onLanding();
    canvas.style.display = landing ? '' : 'none';
    if (landing) start();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  const sync = () => { bindReveals(); syncVisibility(); };

  resize();
  scrollTarget = scrollY;
  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
})();
