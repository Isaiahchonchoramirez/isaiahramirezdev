// Shared rig: browser launch, synthetic cursor, eased pointer motion, screencast capture.
import { chromium } from '/Users/irmac/.claude/skills/gstack/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = process.env.LYRX_URL || 'http://localhost:5173/lyrx/index.html';
export const VW = 1440, VH = 810, DSF = 2;

const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// A drawn cursor, because headless Chrome has no pointer to film.
const CURSOR_JS = `
(() => {
  if (window.__cur) return;
  const c = document.createElement('div');
  c.id = '__cursor';
  c.style.cssText = [
    'position:fixed','left:0','top:0','z-index:2147483647','pointer-events:none',
    'width:22px','height:22px','margin:-2px 0 0 -2px','transition:none',
    'will-change:transform'
  ].join(';');
  c.innerHTML = \`<svg width="22" height="22" viewBox="0 0 22 22">
    <path d="M2 1 L2 16.2 L6.1 12.4 L8.9 18.6 L11.7 17.3 L8.9 11.3 L14.4 11.1 Z"
      fill="#F4F4F0" stroke="#08080B" stroke-width="1.1" stroke-linejoin="round"/>
  </svg>\`;
  document.documentElement.appendChild(c);
  window.__cur = c;
  window.__moveCur = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  // Let the page drive the drawn cursor so glide() needs one CDP call per step, not two.
  window.addEventListener('mousemove', e => window.__moveCur(e.clientX, e.clientY), true);
  window.addEventListener('pointermove', e => window.__moveCur(e.clientX, e.clientY), true);
  window.__clickRing = (x, y) => {
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #C8FF2E;border-radius:50%;left:' +
      x + 'px;top:' + y + 'px;width:8px;height:8px;margin:-4px 0 0 -4px;opacity:.9';
    document.documentElement.appendChild(r);
    r.animate([{ width:'8px', height:'8px', margin:'-4px 0 0 -4px', opacity:.9 },
               { width:'52px', height:'52px', margin:'-26px 0 0 -26px', opacity:0 }],
              { duration: 460, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => r.remove();
  };
})();
`;

export async function launch() {
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--hide-scrollbars',
      '--mute-audio=false'
    ]
  });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: DSF,
    reducedMotion: 'no-preference',
    colorScheme: 'dark'
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('  [page error]', e.message));
  return { browser, ctx, page };
}

export async function goHome(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  await page.addStyleTag({ content: `
    *, *::before, *::after { text-rendering: optimizeLegibility; }
    ::-webkit-scrollbar { width: 0; height: 0; }
  ` });
  await page.evaluate(CURSOR_JS);
  await page.waitForTimeout(900);
}

export async function reinstallCursor(page) {
  await page.evaluate(CURSOR_JS);
}

// Pointer state so eased moves can start where the last one ended.
let px = VW / 2, py = VH / 2;
export function cursorAt() { return { x: px, y: py }; }
export async function warp(page, x, y) {
  px = x; py = y;
  await page.mouse.move(x, y);
}

// Eased pointer travel. The page's own mousemove listener redraws the cursor.
export async function glide(page, x, y, ms = 700) {
  const sx = px, sy = py;
  const steps = Math.max(2, Math.round(ms / 16));
  const t0 = Date.now();
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    await page.mouse.move(sx + (x - sx) * t, sy + (y - sy) * t);
    const target = t0 + (ms * i) / steps;
    const slack = target - Date.now();
    if (slack > 1) await page.waitForTimeout(slack);
  }
  px = x; py = y;
}

export async function clickHere(page) {
  await page.evaluate(([a, b]) => window.__clickRing && window.__clickRing(a, b), [px, py]);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
}

export async function glideToEl(page, selector, ms = 700, nth = 0) {
  const box = await page.locator(selector).nth(nth).boundingBox();
  if (!box) throw new Error('no box for ' + selector);
  await glide(page, box.x + box.width / 2, box.y + box.height / 2, ms);
  return box;
}

export async function clickEl(page, selector, ms = 700, nth = 0) {
  await glideToEl(page, selector, ms, nth);
  await clickHere(page);
}

// Drag a range input from wherever its thumb is to a fraction of its track.
export async function dragSlider(page, selector, toFrac, ms = 900) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error('no slider ' + selector);
  const y = box.y + box.height / 2;
  const el = page.locator(selector).first();
  const { min, max, value } = await el.evaluate(n => ({ min: +n.min, max: +n.max, value: +n.value }));
  const startFrac = (value - min) / (max - min);
  const x0 = box.x + 6 + (box.width - 12) * startFrac;
  const x1 = box.x + 6 + (box.width - 12) * toFrac;

  await glide(page, x0, y, 420);
  await page.evaluate(([a, b]) => window.__clickRing && window.__clickRing(a, b), [x0, y]);
  await page.mouse.down();
  const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    const nx = x0 + (x1 - x0) * t;
    await page.mouse.move(nx, y);
    // range inputs in this app listen on change; nudge the value directly too
    await el.evaluate((n, frac) => {
      const mn = +n.min, mx = +n.max, st = +n.step || 1;
      const raw = mn + (mx - mn) * frac;
      n.value = String(Math.round(raw / st) * st);
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }, (nx - box.x - 6) / (box.width - 12));
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
  px = x1; py = y;
}

export async function typeInto(page, selector, text, cps = 22) {
  await clickEl(page, selector, 600);
  const el = page.locator(selector).first();
  await el.focus();
  for (const ch of text) {
    await el.evaluate((n, c) => {
      n.value = (n.value || '') + c;
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }, ch);
    await page.waitForTimeout(1000 / cps + (Math.random() * 34 - 12));
  }
}

// ---- screencast ----
export class Recorder {
  constructor(page, outDir) {
    this.page = page; this.outDir = outDir;
    this.frames = []; this.n = 0; this.client = null;
  }
  async start() {
    fs.mkdirSync(this.outDir, { recursive: true });
    this.client = await this.page.context().newCDPSession(this.page);
    this.client.on('Page.screencastFrame', async ev => {
      const file = path.join(this.outDir, `f${String(this.n++).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(ev.data, 'base64'));
      this.frames.push({ file, t: ev.metadata.timestamp });
      try { await this.client.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch (e) {}
    });
    await this.client.send('Page.startScreencast', {
      format: 'jpeg', quality: 96, maxWidth: VW * DSF, maxHeight: VH * DSF, everyNthFrame: 1
    });
  }
  async stop() {
    try { await this.client.send('Page.stopScreencast'); } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
    return this.frames;
  }
  // ffmpeg concat list using real inter-frame timestamps
  writeConcat(listPath) {
    const f = this.frames;
    if (!f.length) throw new Error('no frames captured');
    const lines = [];
    for (let i = 0; i < f.length; i++) {
      const dur = i < f.length - 1 ? Math.max(0.004, f[i + 1].t - f[i].t) : 1 / 60;
      lines.push(`file '${path.resolve(f[i].file)}'`, `duration ${dur.toFixed(5)}`);
    }
    lines.push(`file '${path.resolve(f[f.length - 1].file)}'`);
    fs.writeFileSync(listPath, lines.join('\n'));
    return { count: f.length, seconds: f[f.length - 1].t - f[0].t };
  }
}
