// Drives the real Lyrx app and records each shot to mp4.
//   node tools/lyrx-broll/capture.mjs            # all shots
//   node tools/lyrx-broll/capture.mjs 04 07      # just these
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { launch, goHome, Recorder, VW, VH, DSF } from './rig.mjs';
import * as S from './shots.mjs';

const OUT = path.resolve('art/lyrx-broll');
const TMP = path.resolve('/private/tmp/claude-501/-Users-irmac-Developer-isaiahramirezdev/8e8bcea7-ff94-4a80-96e3-528cc4ef9765/scratchpad/frames');

const wait = (p, ms) => p.waitForTimeout(ms);

// setup runs before recording starts; run is what gets filmed.
const PLAN = [
  { id: '01', name: 'hero-sweep', run: S.SHOTS.s01_hero_sweep,
    setup: async () => {} },

  { id: '02', name: 'hero-play', run: S.SHOTS.s02_hero_play,
    setup: async () => {} },

  { id: '03', name: 'home-scroll', run: S.SHOTS.s03_home_scroll,
    setup: async page => { await wait(page, 1200); } },

  { id: '04', name: 'seq-strip', run: S.SHOTS.s04_seq_strip,
    setup: async page => {
      await page.locator('.lx-seq-stage').scrollIntoViewIfNeeded();
      await wait(page, 900);
    } },

  // Load a real session and start it before dropping back to home, so the six
  // windows snap in carrying content instead of empty grids.
  { id: '05', name: 'workspace-snap', run: S.SHOTS.s03_workspace_snap,
    setup: async page => {
      await S.gotoStudio(page);
      await page.locator('button:has-text("Roll dice")').first().click();
      await wait(page, 900);
      await S.transportPlay(page);
      await wait(page, 700);
      await S.setLayout(page, 'Workspace');
      await page.locator('a[data-view="home"]').first().click();
      await wait(page, 900);
    } },

  { id: '06', name: 'sequencer', run: S.SHOTS.s04_sequencer,
    setup: async page => {
      await S.gotoStudio(page);
      await S.setLayout(page, 'Beginner');
      await page.locator('[data-win="tracks"] button[title="Fill desk"]').first().click();
      await wait(page, 500);
      await S.clearPattern(page);
      await S.transportPlay(page);
      await wait(page, 600);
    } },

  { id: '07', name: 'piano-roll', run: S.SHOTS.s05_piano_roll,
    setup: async page => {
      await S.gotoStudio(page);
      await S.closeAllWins(page);
      await S.openWin(page, 'keys');
      await page.locator('[data-win="keys"] button[title="Fill desk"]').first().click();
      await wait(page, 500);
      await S.transportPlay(page);
      await wait(page, 500);
    } },

  { id: '08', name: 'synth', run: S.SHOTS.s06_synth,
    setup: async page => {
      await S.gotoStudio(page);
      await S.closeAllWins(page);
      await S.openWin(page, 'keys');
      await S.openWin(page, 'synth');
      await page.locator('button:has-text("Tile")').first().click();   // built-in auto-arrange
      await wait(page, 600);
      await page.locator('button:has-text("Roll dice")').first().click();
      await wait(page, 700);
      await S.transportPlay(page);
      await wait(page, 500);
    } },

  { id: '09', name: 'ai-producer', run: S.SHOTS.s07_ai_producer,
    setup: async page => {
      await S.gotoStudio(page);
      await S.setLayout(page, 'Beginner');
      await S.clearPattern(page);
      await S.placeWin(page, 'tracks', 30, 30);
      await S.placeWin(page, 'ai', 640, 300);
      await S.transportPlay(page);
      await wait(page, 500);
    } },

  { id: '10', name: 'mix', run: S.SHOTS.s08_mix,
    setup: async page => {
      await S.gotoStudio(page);
      await S.setLayout(page, 'Mixing');
      await S.transportPlay(page);
      await wait(page, 900);
    } },

  { id: '11', name: 'voice-lab', run: S.SHOTS.s09_voice,
    setup: async page => {
      await S.gotoStudio(page);
      await S.setLayout(page, 'Vocals');
      await page.locator('[data-win="voice"] button[title="Fill desk"]').first().click();
      await wait(page, 600);
    } },

  { id: '12', name: 'community', run: S.SHOTS.s10_community,
    setup: async page => {
      await page.locator('a[data-view="community"]').first().click();
      await wait(page, 900);
    } },

  { id: '13', name: 'datacore', run: S.SHOTS.s13_datacore,
    setup: async page => {
      await page.locator('a.lx-xband').scrollIntoViewIfNeeded();
      await wait(page, 800);
    } },

  { id: '14', name: 'hero-out', run: S.SHOTS.s11_hero_out,
    setup: async () => {} }
];

function ffmpeg(args) {
  return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
}

const only = process.argv.slice(2);
const plan = only.length ? PLAN.filter(p => only.includes(p.id)) : PLAN;

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true });

const results = [];

for (const shot of plan) {
  const tag = `${shot.id}-${shot.name}`;
  process.stdout.write(`\n▶ shot ${tag}\n`);
  const { browser, page } = await launch();
  try {
    await goHome(page);
    await shot.setup(page);
    await page.evaluate(() => {           // cursor survives view swaps
      if (!document.getElementById('__cursor')) return;
      document.documentElement.appendChild(document.getElementById('__cursor'));
    });

    const dir = path.join(TMP, tag);
    const rec = new Recorder(page, dir);
    await rec.start();
    await wait(page, 240);
    await shot.run(page);
    await wait(page, 240);
    await rec.stop();

    const list = path.join(dir, 'concat.txt');
    const info = rec.writeConcat(list);
    const mp4 = path.join(OUT, `${tag}.mp4`);
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list,
            '-vf', `scale=${VW}:${VH}:flags=lanczos,fps=60,format=yuv420p`,
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', mp4]);
    const secs = (info.seconds).toFixed(2);
    console.log(`  ${info.count} frames · ${secs}s · ${mp4}`);
    results.push({ tag, frames: info.count, seconds: +secs, mp4 });
  } catch (e) {
    console.error(`  FAILED ${tag}: ${e.message}`);
    results.push({ tag, error: e.message });
  } finally {
    await browser.close();
  }
}

fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(results, null, 2));
console.log('\n' + results.map(r => r.error ? `✗ ${r.tag}  ${r.error}` : `✓ ${r.tag}  ${r.seconds}s`).join('\n'));
