// One collection run, start to finish, then exit.
//
//   npm run collect                    one pass over the sites in seeds.txt
//   npm run collect -- --pages 40      raise the page budget for this run
//   npm run collect -- --fresh         ignore what is already collected
//   npm run collect -- --audio-cap 200 download at most 200MB of audio
//   npm run collect -- --no-audio      pages only, download no audio at all
//
// Written for a scheduler: it talks to the crawler service over the same HTTP
// API the browser uses, so a run is identical whether a person or launchd
// started it. If nothing is listening on the port it starts its own service,
// uses it, and shuts it down again — a cron job should not depend on a window
// being open somewhere.
//
// Exit codes: 0 collected something (or had nothing new to collect), 1 failed.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CRAWLER_PORT || 8787);
const BASE = `http://localhost:${PORT}`;
const SEEDS = path.join(HERE, 'seeds.txt');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const fresh = argv.includes('--fresh');
// A crawl only *lists* audio; bytes arrive when something asks for them. In the
// browser that ask is a person ticking a row, which is why an unattended run
// used to collect no audio whatsoever. Here the ask is this cap: enough to build
// a dataset over time, bounded so a nightly job cannot quietly fill the disk.
const audioCapMB = argv.includes('--no-audio') ? 0 : Number(flag('audio-cap', 250));

const log = (...m) => console.log(new Date().toISOString(), ...m);

async function api(pathname, init) {
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} from ${pathname}`);
  return body;
}

async function serviceUp() {
  try {
    const controller = AbortController ? new AbortController() : null;
    const t = controller && setTimeout(() => controller.abort(), 2000);
    const res = await fetch(BASE + '/api/health', { signal: controller?.signal });
    if (t) clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** Start a service we own, and hand back how to stop it. */
async function startService() {
  const child = spawn(process.execPath, [path.join(HERE, 'crawler.mjs')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CRAWLER_PORT: String(PORT) },
  });
  child.stdout.on('data', d => process.stdout.write('  [crawler] ' + d));
  child.stderr.on('data', d => process.stderr.write('  [crawler] ' + d));

  for (let i = 0; i < 40; i++) {                  // up to ~10s to come up
    if (await serviceUp()) return () => child.kill();
    await new Promise(r => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('the crawler service did not start');
}

async function readSeeds() {
  const raw = await readFile(SEEDS, 'utf8').catch(() => {
    throw new Error(`no seed list at ${SEEDS}`);
  });
  const seeds = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (!seeds.length) throw new Error(`${SEEDS} has no sites in it`);
  return seeds;
}

/**
 * Download the audio the crawl listed, newest first, until the cap is reached.
 *
 * Sizes are unknown until a file lands — a listing carries no content-length —
 * so the budget is spent as it goes rather than planned up front. Individual
 * files are already capped server-side, so one bad link cannot blow the budget
 * on its own.
 */
async function pullAudio() {
  if (!audioCapMB) { log('audio: skipped (--no-audio)'); return; }

  const { results } = await api('/api/results');
  const pending = results.filter(r => r.type === 'audio' && !r.hasFile && r.status !== 'quarantined');
  if (!pending.length) { log('audio: nothing new listed'); return; }

  const capBytes = audioCapMB * 1048576;
  log(`audio: ${pending.length} listed · budget ${audioCapMB}MB`);

  let got = 0, files = 0, failed = 0;
  const reasons = new Map();   // a nightly run is unattended: say why, not just how many
  for (let i = 0; i < pending.length && got < capBytes; i += 4) {
    const batch = pending.slice(i, i + 4).map(r => r.id);
    let out;
    try {
      out = await api('/api/collect', { method: 'POST', body: JSON.stringify({ ids: batch }) });
    } catch (err) {
      log(`  batch failed — ${err.message}`);
      failed += batch.length;
      continue;
    }
    for (const item of out.collected) { got += item.bytes || 0; files++; }
    failed += out.failed.length;
    for (const f of out.failed) {
      const why = String(f.error).replace(/^(\d{3}) from .*/, '$1 from host').slice(0, 60);
      reasons.set(why, (reasons.get(why) || 0) + 1);
    }
    if (out.collected.length) {
      log(`  ${files} file(s) · ${(got / 1048576).toFixed(1)}MB of ${audioCapMB}MB`);
    }
  }
  log(`audio: ${files} downloaded · ${(got / 1048576).toFixed(1)}MB${failed ? ` · ${failed} unavailable` : ''}`
    + (got >= capBytes ? ' · budget reached, more left for next run' : ''));
  for (const [why, n] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    log(`  ${n}× ${why}`);
  }
}

async function main() {
  const seeds = await readSeeds();
  let stop = null;

  if (!(await serviceUp())) {
    log(`nothing on ${BASE} — starting one for this run`);
    stop = await startService();
  } else {
    log(`using the crawler service already on ${BASE}`);
  }

  try {
    const before = (await api('/api/status')).dataset || { items: 0 };
    log(`dataset before: ${before.items} item(s)`);

    await api('/api/crawl', {
      method: 'POST',
      body: JSON.stringify({
        seeds: seeds.join('\n'),
        extraHosts: process.env.CRAWLER_EXTRA_HOSTS || 'upload.wikimedia.org',
        depth: Number(flag('depth', 2)),
        maxPages: Number(flag('pages', 40)),
        rateLimit: Number(flag('rate', 2)),
        audio: true,
        resume: !fresh,
        fields: [],
      }),
    });
    log(`crawling ${seeds.length} site(s)${fresh ? ' (fresh — ignoring what is already collected)' : ''}`);

    let last = '';
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const st = await api('/api/status');
      const line = `fetched ${st.counters.fetched} · kept ${st.counters.stored} · set aside ${st.counters.quarantined} · skipped ${st.counters.skipped}`;
      if (line !== last) { log('  ' + line); last = line; }
      if (!st.running) {
        const walked = st.dataset || { items: 0 };
        log(`pages done — ${walked.items - before.items} new page(s)`);
        await pullAudio();
        const after = (await api('/api/status')).dataset || { items: 0 };
        log(`done — dataset now ${after.items} item(s) (+${after.items - before.items} this run)`);
        break;
      }
    }
  } finally {
    if (stop) { log('stopping the service this run started'); stop(); }
  }
}

main().then(
  () => process.exit(0),
  (err) => { log('FAILED —', err.message); process.exit(1); },
);
