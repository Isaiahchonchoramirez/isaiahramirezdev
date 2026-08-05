// Assembles the shots into a finished promo: trimmed cut, brand text cards
// rendered in real Archivo, and an audio bed the app itself exported.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/irmac/.claude/skills/gstack/node_modules/playwright/index.mjs';

const SRC = path.resolve('art/lyrx-broll');
const OUT = path.resolve('art/lyrx-promo');
const WORK = path.resolve('/private/tmp/claude-501/-Users-irmac-Developer-isaiahramirezdev/8e8bcea7-ff94-4a80-96e3-528cc4ef9765/scratchpad/build');
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });

// clip = [file, inPoint, duration]
const CUT = [
  ['01-hero-sweep',    0.60, 3.5],
  ['02-hero-play',     1.30, 3.0],
  ['05-workspace-snap',2.95, 3.0],
  ['06-sequencer',     1.00, 4.5],
  ['07-piano-roll',    0.80, 3.5],
  ['08-synth',         1.90, 3.0],
  ['09-ai-producer',   1.10, 5.2],
  ['10-mix',           2.00, 3.0],
  ['11-voice-lab',     2.00, 3.6],
  ['04-seq-strip',     0.50, 2.8],
  ['12-community',     0.80, 2.8],
  ['14-hero-out',      1.00, 4.0]
];

// --- 1. text cards, rendered in the browser so the type is genuinely Archivo ---
// The hero already carries "Make the night." in 76px, so no card goes over it.
// Both overlays sit in the empty Sound-editor strip along the bottom of the studio,
// on a scrim, so they never fight the UI.
const CARDS = [
  { id: 'card1', at: 6.9,  dur: 2.6, html: `<div class="mid">A full studio. <span class="dim">One browser tab.</span></div>` },
  { id: 'card2', at: 19.4, dur: 2.8, html: `<div class="mid">Or just say <span class="dim">what you want.</span></div>` }
];

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  html,body{margin:0;width:1440px;height:810px;font-family:Archivo,system-ui,sans-serif;color:#F4F4F0;}
`;

const CARD_CSS = BASE_CSS + `
  body{background:transparent;}
  .scrim{position:absolute;left:0;right:0;bottom:0;height:44%;
         background:linear-gradient(to top,rgba(8,8,11,.97) 4%,rgba(8,8,11,.86) 34%,rgba(8,8,11,0) 100%);}
  .wrap{position:absolute;left:0;right:0;bottom:0;padding:0 84px 74px;}
  .mid{font-size:46px;font-weight:500;letter-spacing:-0.025em;line-height:1.18;
       text-shadow:0 4px 30px rgba(0,0,0,.9);}
  .dim{color:#C8FF2E;}
`;

const END_CSS = BASE_CSS + `
  body{background:#08080B;}
  .bg{position:absolute;inset:0;
      background:radial-gradient(760px 420px at 50% 42%, rgba(28,38,6,.55), transparent 66%);}
  .grain{position:absolute;inset:0;opacity:.035;mix-blend-mode:screen;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
  .c{position:absolute;inset:0;display:flex;flex-direction:column;
     align-items:center;justify-content:center;gap:20px;}
  .mark{font-size:112px;font-weight:700;letter-spacing:-0.035em;line-height:1;}
  .dot{color:#C8FF2E;}
  .tag{font-family:'JetBrains Mono',monospace;font-size:14px;letter-spacing:0.16em;
       text-transform:uppercase;color:#A6A6A0;}
  .url{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:0.1em;
       color:#C8FF2E;margin-top:6px;}
  .rule{width:64px;height:1px;background:#2A2A30;margin:4px 0;}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
for (const c of CARDS) {
  await page.setContent(`<style>${CARD_CSS}</style><div class="scrim"></div><div class="wrap">${c.html}</div>`);
  await page.waitForTimeout(800);                       // let webfonts land
  await page.screenshot({ path: path.join(WORK, `${c.id}.png`), omitBackground: true });
}
await page.setContent(`<style>${END_CSS}</style><div class="bg"></div><div class="grain"></div>
  <div class="c">
    <div class="mark">Lyrx<span class="dot">.</span></div>
    <div class="rule"></div>
    <div class="tag">Everything runs in this tab.</div>
    <div class="url">isaiahchonchoramirez.github.io/isaiahramirezdev/lyrx</div>
  </div>`);
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(WORK, 'endcard.png') });
await browser.close();
console.log(`rendered ${CARDS.length} overlay cards + end card`);

// end card becomes a real 3.2s segment so the film actually lands
const END_DUR = 3.2;
const endMp4 = path.join(WORK, 'endcard.mp4');
ff(['-loop', '1', '-t', String(END_DUR), '-i', path.join(WORK, 'endcard.png'),
    '-vf', 'scale=1920:1080:flags=lanczos,fps=60,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', endMp4]);

// --- 2. trim each clip, normalise geometry, add short cross-dissolves via xfade ---
const segs = [];
CUT.forEach(([name, ss, d], i) => {
  const src = path.join(SRC, `${name}.mp4`);
  if (!fs.existsSync(src)) throw new Error('missing clip ' + src);
  const dst = path.join(WORK, `seg${String(i).padStart(2, '0')}.mp4`);
  ff(['-ss', String(ss), '-t', String(d), '-i', src,
      '-vf', 'scale=1920:1080:flags=lanczos,fps=60,format=yuv420p',
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', dst]);
  segs.push({ dst, d });
});
segs.push({ dst: endMp4, d: END_DUR });
console.log(`trimmed ${segs.length - 1} segments + end card`);

// chain xfades so cuts breathe instead of snapping
let filter = '', prev = '[0:v]', tOff = 0;
segs.forEach((s, i) => {
  if (i === 0) { tOff = s.d; return; }
  const last = i === segs.length - 1;
  const xf = last ? 0.7 : 0.28;              // land on the end card, don't snap to it
  const out = last ? '[vx]' : `[x${i}]`;
  filter += `${prev}[${i}:v]xfade=transition=fade:duration=${xf}:offset=${(tOff - xf).toFixed(3)}${out};`;
  tOff += s.d - xf;
  prev = out;
});
const totalV = tOff;
console.log(`video length ${totalV.toFixed(2)}s`);

// --- 3. overlay the text cards with alpha fades ---
const cardIdx = segs.length;
CARDS.forEach((c, k) => {
  const inLbl = k === 0 ? '[vx]' : `[o${k}]`;
  const outLbl = k === CARDS.length - 1 ? '[vout]' : `[o${k + 1}]`;
  const f = 0.45;
  filter += `[${cardIdx + k}:v]format=rgba,` +
            `fade=t=in:st=${c.at}:d=${f}:alpha=1,` +
            `fade=t=out:st=${(c.at + c.dur - f).toFixed(2)}:d=${f}:alpha=1[c${k}];`;
  filter += `${inLbl}[c${k}]overlay=0:0:enable='between(t,${c.at},${(c.at + c.dur).toFixed(2)})'${outLbl};`;
});

// --- 4. audio bed: loop, trim, normalise, fade ---
const bed = path.join(SRC, 'audio', 'bed-a.wav');
const bedIdx = cardIdx + CARDS.length;
filter += `[${bedIdx}:a]aloop=loop=-1:size=2e9,atrim=0:${totalV.toFixed(2)},` +
          `loudnorm=I=-15:TP=-1.5:LRA=11,` +
          `afade=t=in:st=0:d=0.8,afade=t=out:st=${(totalV - 1.6).toFixed(2)}:d=1.6[aout]`;

const args = [];
segs.forEach(s => args.push('-i', s.dst));
CARDS.forEach(c => args.push('-loop', '1', '-t', String(totalV), '-i', path.join(WORK, `${c.id}.png`)));
args.push('-i', bed);

const final = path.join(OUT, 'lyrx-promo-40s.mp4');
ff([...args, '-filter_complex', filter,
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    '-t', totalV.toFixed(2), final]);

// silent version for editors who want their own audio
const silent = path.join(OUT, 'lyrx-promo-40s-silent.mp4');
ff(['-i', final, '-an', '-c:v', 'copy', '-movflags', '+faststart', silent]);

// square + vertical crops for social
ff(['-i', final, '-vf', 'crop=1080:1080:420:0,scale=1080:1080', '-c:a', 'copy',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-movflags', '+faststart',
    path.join(OUT, 'lyrx-promo-square.mp4')]);
ff(['-i', final, '-vf', 'crop=608:1080:656:0,scale=1080:1920', '-c:a', 'copy',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-movflags', '+faststart',
    path.join(OUT, 'lyrx-promo-vertical.mp4')]);

// poster frame
ff(['-ss', '4.2', '-i', final, '-frames:v', '1', path.join(OUT, 'poster.png')]);

for (const f of fs.readdirSync(OUT)) {
  const p = path.join(OUT, f);
  console.log(`  ${f}  ${(fs.statSync(p).size / 1048576).toFixed(1)}MB`);
}
