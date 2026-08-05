// The 11 shots. Each returns after its choreography; recording is handled by capture.mjs.
import { glide, warp, clickHere, clickEl, glideToEl, dragSlider, typeInto, VW, VH } from './rig.mjs';

const wait = (p, ms) => p.waitForTimeout(ms);

const GROUP_OF = {
  arrange: 'Compose', tracks: 'Compose', seq: 'Compose', keys: 'Compose', chords: 'Compose',
  midigen: 'Compose', session: 'Compose', pads: 'Compose',
  synth: 'Sound', synthdes: 'Sound', inspector: 'Sound', sample: 'Sound', autom: 'Sound',
  mixer: 'Mix', rack: 'Mix', meters: 'Mix', master: 'Mix',
  ai: 'AI', copilot: 'AI',
  lyrics: 'Write', voice: 'Write', voicelib: 'Write',
  browser: 'Library', versions: 'Library', exportw: 'Library'
};

// --- setup helpers (run outside the recording) ---

export async function gotoStudio(page) {
  await page.locator('button[data-view="studio"]').first().click();
  await page.waitForSelector('select');
  await wait(page, 500);
}

export async function setLayout(page, name) {
  await page.locator('select').first().selectOption(name);
  await wait(page, 700);
}

export async function openWin(page, id) {
  const grp = GROUP_OF[id];
  await page.locator(`button[data-g="${grp}"]`).first().click();
  await wait(page, 200);
  await page.locator(`button[data-id="${id}"]`).first().click();
  await wait(page, 250);
  // close the menu
  await page.locator(`button[data-g="${grp}"]`).first().click();
  await wait(page, 200);
}

export async function closeAllWins(page) {
  await setLayout(page, 'Workspace');
  await page.evaluate(() => {
    document.querySelectorAll('[data-win]').forEach(w => {
      const x = w.querySelector('button[title="Close"]');
      if (x && getComputedStyle(w).display !== 'none') x.click();
    });
  });
  await wait(page, 400);
}

// Move a window so the shot frames well.
export async function placeWin(page, id, x, y, w, h) {
  const bar = page.locator(`[data-win="${id}"] [data-mode="move"]`).first();
  const box = await bar.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  if (w && h) {
    const win = await page.locator(`[data-win="${id}"]`).first().boundingBox();
    const grip = page.locator(`[data-win="${id}"] [data-mode="se"]`).first();
    const gb = await grip.boundingBox();
    if (gb) {
      await page.mouse.move(gb.x + 8, gb.y + 8);
      await page.mouse.down();
      await page.mouse.move(win.x + w, win.y + h, { steps: 12 });
      await page.mouse.up();
    }
  }
  await wait(page, 250);
}

// Eased programmatic scroll. Smoother than wheel deltas and repeatable.
export async function smoothScroll(page, to, ms) {
  await page.evaluate(([target, dur]) => new Promise(res => {
    const from = window.scrollY, d = target - from, t0 = performance.now();
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + d * ease(t));
      t < 1 ? requestAnimationFrame(step) : res();
    })(t0);
  }), [to, ms]);
}

export async function transportPlay(page) {
  await page.locator('button[aria-label="Play or stop"]').first().click();
  await wait(page, 300);
}

export async function clearPattern(page) {
  const btn = page.locator('button:has-text("Clear")').first();
  if (await btn.count()) { await btn.click(); await wait(page, 300); }
}

// --- the shots ---

export const SHOTS = {

  // 1. Hero. Cursor sweep bends the five laser beams and deforms four waveform layers.
  async s01_hero_sweep(page) {
    await warp(page, VW * 0.06, VH * 0.86);
    await wait(page, 500);
    await glide(page, VW * 0.30, VH * 0.74, 1100);
    await glide(page, VW * 0.52, VH * 0.88, 1000);
    await glide(page, VW * 0.78, VH * 0.70, 1100);
    await glide(page, VW * 0.94, VH * 0.82, 800);
    await wait(page, 500);
  },

  // 2. Hero. Click the play disc: sparks fire, loop starts, beams brighten with energy.
  async s02_hero_play(page) {
    await warp(page, VW * 0.72, VH * 0.86);
    await wait(page, 300);
    await glideToEl(page, 'button[aria-label="Play or pause the demo loop"]', 900);
    await wait(page, 260);
    await clickHere(page);
    await wait(page, 2600);
  },

  // 3. Slow scroll through the new home page: seq strip, stats, studio-night plate,
  //    features, drum-pad and vinyl. Pure texture, no cursor.
  async s03_home_scroll(page) {
    await warp(page, -400, -400);          // park the cursor off-frame
    await wait(page, 600);
    await smoothScroll(page, 700, 2200);
    await wait(page, 900);
    await smoothScroll(page, 1500, 2000);
    await wait(page, 700);
    await smoothScroll(page, 2350, 2400);
    await wait(page, 900);
    await smoothScroll(page, 2950, 2000);
    await wait(page, 1000);
  },

  // 4. The self-animating sequencer strip. Playhead sweeps 16 steps on a 3.2s loop.
  async s04_seq_strip(page) {
    await warp(page, -400, -400);
    await wait(page, 5200);                 // a bit over one full sweep
  },

  // 5. Home to studio, then the Everything workspace snaps six windows into place.
  async s03_workspace_snap(page) {
    await warp(page, VW * 0.30, VH * 0.80);
    await glideToEl(page, 'button:has-text("Start making")', 850);
    await wait(page, 220);
    await clickHere(page);
    await page.waitForSelector('select');
    await wait(page, 900);
    await glideToEl(page, 'select', 700);
    await wait(page, 200);
    await page.evaluate(([a, b]) => window.__clickRing && window.__clickRing(a, b),
      [(await page.locator('select').first().boundingBox()).x + 40, (await page.locator('select').first().boundingBox()).y + 12]);
    await page.locator('select').first().selectOption('Everything');
    await wait(page, 1900);
  },

  // 4. Step sequencer. Build a pattern while the playhead sweeps.
  async s04_sequencer(page) {
    const cells = page.locator('[data-win="tracks"] [data-ti][data-j]');
    const total = await cells.count();
    const perRow = 16;
    // kick on 1/5/9/13, snare on 5/13, hats on offbeats
    const picks = [0, 4, 8, 12, perRow + 4, perRow + 12, perRow * 2 + 2, perRow * 2 + 6, perRow * 2 + 10];
    await warp(page, 300, 300);
    for (const i of picks) {
      if (i >= total) continue;
      const box = await cells.nth(i).boundingBox();
      if (!box) continue;
      await glide(page, box.x + box.width / 2, box.y + box.height / 2, 300);
      await clickHere(page);
      await wait(page, 190);
    }
    await wait(page, 900);
  },

  // 5. Piano roll. Draw a four-note line.
  async s05_piano_roll(page) {
    const cells = page.locator('[data-win="keys"] [data-i][data-j]');
    const picks = [[9, 0], [7, 4], [4, 8], [7, 12], [2, 14]];
    await warp(page, 420, 260);
    for (const [i, j] of picks) {
      const el = page.locator(`[data-win="keys"] [data-i="${i}"][data-j="${j}"]`).first();
      if (!(await el.count())) continue;
      const box = await el.boundingBox();
      if (!box) continue;
      await glide(page, box.x + box.width / 2, box.y + box.height / 2, 340);
      await clickHere(page);
      await wait(page, 180);
    }
    await wait(page, 800);
  },

  // 6. Synth. Sweep the cutoff, then detune. Transport waveform reshapes live.
  async s06_synth(page) {
    const sliders = page.locator('[data-win="synth"] input[type="range"]');
    const n = await sliders.count();
    if (n > 0) {
      await dragSlider(page, '[data-win="synth"] input[type="range"] >> nth=0', 0.92, 1000);
      await wait(page, 350);
      await dragSlider(page, '[data-win="synth"] input[type="range"] >> nth=0', 0.28, 800);
      await wait(page, 300);
    }
    if (n > 1) {
      await dragSlider(page, '[data-win="synth"] input[type="range"] >> nth=1', 0.7, 700);
      await wait(page, 600);
    }
  },

  // 7. AI producer. Type a prompt, hit Generate, watch the grid behind it repopulate.
  async s07_ai_producer(page) {
    await warp(page, VW * 0.5, VH * 0.5);
    await typeInto(page, '[data-win="ai"] textarea', 'dark rolling techno, hypnotic, 128', 21);
    await wait(page, 500);
    await glideToEl(page, '[data-win="ai"] button:has-text("Generate track")', 700);
    await wait(page, 240);
    await clickHere(page);
    await wait(page, 3000);
  },

  // 8. Mixer plus plugin rack, spectrum reacting in Analytics.
  async s08_mix(page) {
    const fx = page.locator('[data-win="mixer"] input[type="range"]');
    if (await fx.count() > 2) {
      await dragSlider(page, '[data-win="mixer"] input[type="range"] >> nth=2', 0.8, 850);
      await wait(page, 400);
    }
    const rack = page.locator('[data-win="rack"] input[type="range"]');
    if (await rack.count() > 0) {
      await dragSlider(page, '[data-win="rack"] input[type="range"] >> nth=0', 0.75, 800);
    }
    await wait(page, 1100);
  },

  // 9. Voice lab. Pick a character, type a line, speak it.
  async s09_voice(page) {
    await warp(page, VW * 0.4, VH * 0.4);
    const raspy = page.locator('[data-win="voice"] button[data-id="raspy"]').first();
    if (await raspy.count()) {
      const box = await raspy.boundingBox();
      if (box) { await glide(page, box.x + box.width / 2, box.y + box.height / 2, 700); await clickHere(page); }
    }
    await wait(page, 450);
    await typeInto(page, '[data-win="voice"] input[placeholder="what should it say…"]', 'make the night', 17);
    await wait(page, 400);
    await glideToEl(page, '[data-win="voice"] button:has-text("Speak it")', 600);
    await wait(page, 200);
    await clickHere(page);
    await wait(page, 1500);
  },

  // 10. Community feed.
  async s10_community(page) {
    await warp(page, VW * 0.5, VH * 0.35);
    await wait(page, 500);
    await page.mouse.wheel(0, 240);
    await wait(page, 900);
    await page.mouse.wheel(0, 200);
    await wait(page, 800);
    const open = page.locator('button:has-text("Open")').first();
    if (await open.count()) {
      const box = await open.boundingBox();
      if (box) { await glide(page, box.x + box.width / 2, box.y + box.height / 2, 700); await clickHere(page); }
    }
    await wait(page, 900);
  },

  // 13. DataCore crossover band. Hovering scales the three arcs outward.
  async s13_datacore(page) {
    await warp(page, VW * 0.2, VH * 0.8);
    await wait(page, 600);
    await glideToEl(page, 'a.lx-xband', 1000);
    await wait(page, 1800);
    await glide(page, VW * 0.86, VH * 0.55, 700);
    await wait(page, 600);
  },

  // 14. Back to the hero, wide and idle, for the end card.
  async s11_hero_out(page) {
    await warp(page, VW * 0.86, VH * 0.78);
    await wait(page, 400);
    await glide(page, VW * 0.55, VH * 0.72, 1400);
    await glide(page, VW * 0.34, VH * 0.84, 1200);
    await wait(page, 1200);
  }
};
