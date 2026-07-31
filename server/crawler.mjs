// DataCore crawler service — the real fetching half of the Crawlers screen.
//
//   npm run crawler        (listens on 8787)
//
// Deliberately small: node:http, one dependency (cheerio) for the selector map.
// Everything it fetches lands in .crawl-store/ and nothing leaves this machine.
//
// Safety rails, all enforced server-side so the UI cannot talk past them:
//   · host allowlist — only hosts named in the seeds are ever contacted
//   · robots.txt fetched per host and honoured, including Crawl-delay
//   · one request at a time per host, minimum spacing, hard page cap, depth cap
//   · GET only, no cookies, no auth, capped redirects, capped body size
//   · loopback / private-range hosts refused (SSRF guard)
//   · text/html + text/plain for pages, audio/* for media, nothing else
import http from 'node:http';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(HERE, '..', '.crawl-store');
const PORT = Number(process.env.CRAWLER_PORT || 8787);
const UA = 'DataCoreCrawler/0.1 (+personal research crawler; contact via site owner)';

const LIMITS = {
  maxPages: 40,          // hard ceiling on fetched pages per job
  maxDepth: 4,
  minDelayMs: 1000,      // floor on per-host spacing, whatever the UI asks for
  requestTimeoutMs: 10000,
  maxRedirects: 3,
  maxPageBytes: 2 * 1024 * 1024,
  maxAudioBytes: 15 * 1024 * 1024,
  maxAudioFiles: 30,
};

const AUDIO_EXT = /\.(wav|mp3|ogg|oga|flac|m4a|aac)(\?|#|$)/i;

/**
 * `/wiki/File:song.ogg` is an HTML page *about* a recording, not the recording.
 * It ends in .ogg, so an extension test lists it as audio and every download
 * attempt then fails with "not audio (text/html)" — for ever, on every run,
 * because nothing about it changes. Recognise the shape and never list it.
 */
function isDescriptionPage(u) {
  return /\/(wiki|w)\/(File|Image|Media):/i.test(u.pathname)
    || /\/(file|image)\/[^/]+$/i.test(u.pathname) && !/\.\w+$/.test(u.pathname);
}

// Open catalogues used to find seeds when you don't know where to look. All
// three are keyless and rights-aware — they report a licence per item, which is
// the only reason they're usable here.
const CATALOGUES = {
  openverse: 'https://api.openverse.org/v1',
  archive: 'https://archive.org/advancedsearch.php',
  wikisource: 'https://en.wikisource.org/w/api.php',
};

// Openverse aggregates these; naming one narrows the search to it.
// Freesound = one-shots and field recordings, Jamendo = finished tracks,
// Commons = folk/classical/spoken.
const OPENVERSE_SOURCES = {
  freesound: 'freesound',
  jamendo: 'jamendo',
  commons: 'wikimedia_audio',
};

// Searching all of archive.org surfaces 200MB radio shows. These two collections
// are where deliberately-shareable music actually lives.
const ARCHIVE_AUDIO_COLLECTIONS = '(netlabels OR opensource_audio)';

// ── job state ────────────────────────────────────────────────────────────────
const job = blankJob();

function blankJob() {
  return {
    running: false,
    startedAt: null,
    finishedAt: null,
    settings: null,
    counters: { queued: 0, fetched: 0, parsed: 0, stored: 0, quarantined: 0, skipped: 0, bytes: 0 },
    log: [],
    results: [],       // {id, type, url, host, title, excerpt, license, bytes, status, foundOn}
    seen: new Set(),
    hostState: new Map(), // host -> {robots, lastHit}
    stopRequested: false,
  };
}

function logLine(code, msg, color) {
  job.log.unshift({ t: new Date().toLocaleTimeString('en-GB', { hour12: false }), code, msg, color });
  job.log.length = Math.min(job.log.length, 60);
}

// ── guards ───────────────────────────────────────────────────────────────────
const PRIVATE_V4 = [
  /^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

/**
 * Allowlist test. `*.us.archive.org` matches any subdomain — needed because some
 * archives redirect downloads onto a per-node hostname you can't know in advance.
 * A bare `*` is never accepted: the wildcard must still name a concrete domain.
 */
function hostAllowed(host, allowHosts) {
  if (allowHosts.has(host)) return true;
  for (const entry of allowHosts) {
    if (entry.startsWith('*.') && entry.length > 2) {
      const suffix = entry.slice(1); // ".us.archive.org"
      if (host.endsWith(suffix)) return true;
    }
  }
  return false;
}

async function hostIsPublic(host) {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return false;
  try {
    const { address } = await lookup(host);
    if (address === '::1' || address.startsWith('fc') || address.startsWith('fd')) return false;
    return !PRIVATE_V4.some(re => re.test(address));
  } catch {
    return false;
  }
}

/** Minimal robots.txt: the `*` group's Disallow/Allow prefixes plus Crawl-delay. */
function parseRobots(txt) {
  const rules = { disallow: [], allow: [], crawlDelay: 0 };
  let inStar = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const val = rest.join(':').trim();
    if (key === 'user-agent') inStar = val === '*';
    else if (!inStar) continue;
    else if (key === 'disallow' && val) rules.disallow.push(val);
    else if (key === 'allow' && val) rules.allow.push(val);
    else if (key === 'crawl-delay') rules.crawlDelay = Math.min(30, Number(val) || 0) * 1000;
  }
  return rules;
}

function robotsAllows(rules, pathname) {
  if (!rules) return true;
  const longest = list => list
    .filter(p => pathname.startsWith(p))
    .reduce((best, p) => (p.length > best ? p.length : best), 0);
  const deny = longest(rules.disallow);
  const allow = longest(rules.allow);
  return allow >= deny; // an equally-or-more specific Allow wins
}

/**
 * A host saying 429 is asking to be left alone for a while. Downloading media
 * back to back is exactly what provokes it, so widen this host's spacing for the
 * rest of the run — honouring Retry-After when it is offered, doubling when it
 * is not. Failed items keep no file, so the next scheduled run picks them up.
 */
async function backOff(host, res) {
  const st = job.hostState.get(host);
  if (!st) return;
  const retryAfter = Number(res.headers.get('retry-after')) * 1000;
  const next = Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter
    : Math.min(30000, Math.max(2000, (st.backoff || job.settings.delayMs || 1000) * 2));
  st.backoff = next;
  logLine('SLOW', `${host} asked us to slow down — ${Math.round(next / 1000)}s between requests`, '#ffb020');
}

async function hostGate(host) {
  let st = job.hostState.get(host);
  if (!st) {
    st = { robots: null, lastHit: 0, backoff: 0 };
    job.hostState.set(host, st);
    try {
      const res = await timedFetch(`https://${host}/robots.txt`, { redirect: 'follow' });
      st.robots = res.ok ? parseRobots((await res.text()).slice(0, 200 * 1024)) : null;
      logLine('ROBOTS', `${host}/robots.txt — ${res.ok ? 'loaded' : 'none (treating as open)'}`, '#8a8a8a');
    } catch {
      logLine('ROBOTS', `${host}/robots.txt — unreachable, treating as open`, '#8a8a8a');
    }
  }
  const delay = Math.max(LIMITS.minDelayMs, job.settings.delayMs, st.robots?.crawlDelay || 0, st.backoff || 0);
  const wait = st.lastHit + delay - Date.now();
  if (wait > 0) await sleep(wait);
  st.lastHit = Date.now();
  return st;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIMITS.requestTimeoutMs);
  return fetch(url, {
    ...opts,
    method: opts.method || 'GET',
    signal: ctrl.signal,
    redirect: opts.redirect || 'manual',
    headers: { 'user-agent': UA, accept: opts.accept || '*/*', ...(opts.headers || {}) },
  }).finally(() => clearTimeout(timer));
}

/** fetch + bounded redirect chain, re-checking the allowlist at every hop. */
async function safeFetch(url, { accept, allowHosts }) {
  let current = url;
  for (let hop = 0; hop <= LIMITS.maxRedirects; hop++) {
    const u = new URL(current);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('unsupported protocol');
    if (!hostAllowed(u.hostname, allowHosts)) throw new Error(`host ${u.hostname} not in allowlist`);
    if (!(await hostIsPublic(u.hostname))) throw new Error(`host ${u.hostname} resolves to a private address`);
    await hostGate(u.hostname);
    const res = await timedFetch(current, { accept });
    if (res.status === 429 || res.status === 503) await backOff(u.hostname, res);
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).href;
      continue;
    }
    return { res, finalUrl: current };
  }
  throw new Error('too many redirects');
}

async function readCapped(res, cap) {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > cap) throw new Error(`body ${(declared / 1048576).toFixed(1)}MB over cap`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > cap) throw new Error(`body ${(buf.length / 1048576).toFixed(1)}MB over cap`);
  return buf;
}

// ── extraction ───────────────────────────────────────────────────────────────
/** Runs the UI's extraction map. `a[rel=license] @href` reads an attribute. */
/**
 * The readable words on a page.
 *
 * `.text()` on <body> also returns the contents of <script> and <style>, so a
 * naive scrape of a modern page is mostly minified JavaScript. That is fine for
 * a licence check and useless as training data, so the machinery goes first.
 */
function readableText($) {
  const $$ = cheerio.load($.html());
  $$('script, style, noscript, template, svg, nav, header, footer, aside, form').remove();
  const scope = $$('article, main').first();
  const root = scope.length ? scope : $$('body');
  return root.text().replace(/\s+/g, ' ').trim();
}

function extract($, fields) {
  const out = {};
  for (const f of fields || []) {
    if (!f.selector) continue;
    const m = f.selector.match(/^(.*?)\s*@(\S+)$/);
    const sel = (m ? m[1] : f.selector).trim();
    const attr = m ? m[2] : null;
    let nodes;
    try { nodes = $(sel); } catch { continue; }
    if (!nodes.length) continue;
    const vals = nodes.toArray()
      .map(n => (attr ? ($(n).attr(attr) || '') : $(n).text()))
      .map(v => v.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (vals.length) out[f.name] = vals.join(attr ? ' ' : '\n\n').slice(0, 20000);
  }
  return out;
}

const LICENSE_HINTS = [
  [/creativecommons\.org\/publicdomain\/zero/i, 'CC0'],
  [/creativecommons\.org\/licenses\/by-sa/i, 'CC BY-SA'],
  [/creativecommons\.org\/licenses\/by-nc/i, 'CC BY-NC (non-commercial)'],
  [/creativecommons\.org\/licenses\/by/i, 'CC BY'],
  [/public\s?domain/i, 'public domain'],
  [/\bMIT\b/, 'MIT'],
];

/**
 * DataCore's whole premise: no reusable licence found ⇒ quarantine, don't store.
 * Reads structured licence signals rather than scanning body prose — a page that
 * merely says "public domain" in a sentence is not a page that grants it.
 */
function classifyRights($, fields) {
  const signals = [fields.licence || '', fields.license || ''];
  $('link[rel~="license"], a[rel~="license"]').each((_, el) => signals.push($(el).attr('href') || ''));
  $('meta[name="license"], meta[name="dc.rights"], meta[name="DC.rights"], meta[property="dcterms.license"]')
    .each((_, el) => signals.push($(el).attr('content') || ''));
  $('a[href*="creativecommons.org"]').each((_, el) => signals.push($(el).attr('href') || ''));
  // Licence boilerplate lives in the footer far more often than the head.
  signals.push($('footer, #footer, .footer, #catlinks, .licensetpl, .license, #license').text().slice(0, 3000));

  const hay = signals.filter(Boolean).join(' ');
  for (const [re, label] of LICENSE_HINTS) if (re.test(hay)) return { license: label, ok: true };
  return { license: 'unknown', ok: false };
}

// ── the crawl ────────────────────────────────────────────────────────────────
async function runCrawl(settings) {
  job.settings = settings;
  job.running = true;
  job.startedAt = Date.now();
  job.finishedAt = null;

  const allowHosts = new Set(settings.allowHosts);
  const queue = settings.seeds.map(url => ({ url, depth: 0 }));
  job.counters.queued = queue.length;

  // A scheduled run walks the same sites as yesterday's, so pages still have to
  // be opened — that is how new links turn up. What must not happen twice is
  // *storing*: `have` is checked at each store point so the dataset grows
  // without duplicates. `resume: false` ignores it and collects everything again.
  const have = settings.resume === false ? new Set() : new Set(alreadyHaveFile());
  const haveText = settings.resume === false ? new Set() : collectedHashes();
  const dead = settings.resume === false ? new Set() : deadLinks();

  logLine('START', `${queue.length} seed(s) · depth ${settings.depth} · ≤${settings.maxPages} pages · hosts: ${[...allowHosts].join(', ')}`, '#2CFF05');
  if (have.size) logLine('RESUME', `${have.size} already collected — looking for what is new`, '#21E5E5');

  let audioCount = 0;

  while (queue.length && job.counters.fetched < settings.maxPages && !job.stopRequested) {
    const { url, depth } = queue.shift();
    job.counters.queued = queue.length;
    const key = url.split('#')[0];
    if (job.seen.has(key)) { job.counters.skipped++; continue; }
    job.seen.add(key);

    let u;
    try { u = new URL(url); } catch { logLine('BAD', `${url} — not a URL`, '#8a8a8a'); continue; }
    if (!hostAllowed(u.hostname, allowHosts)) { job.counters.skipped++; logLine('SKIP', `${u.hostname} — outside allowlist`, '#8a8a8a'); continue; }

    const st = job.hostState.get(u.hostname);
    if (st?.robots && !robotsAllows(st.robots, u.pathname)) {
      job.counters.skipped++;
      logLine('ROBOTS', `${u.host}${u.pathname} — disallowed, not fetched`, '#ffb020');
      continue;
    }

    try {
      const { res, finalUrl } = await safeFetch(url, { accept: 'text/html,text/plain;q=0.9', allowHosts });
      job.counters.fetched++;
      if (!res.ok) { logLine(String(res.status), `${u.host}${u.pathname}`, '#ffb020'); continue; }

      const ctype = (res.headers.get('content-type') || '').split(';')[0].trim();
      if (!/^text\/(html|plain)$/.test(ctype)) { job.counters.skipped++; logLine('SKIP', `${u.host}${u.pathname} — ${ctype || 'unknown type'}`, '#8a8a8a'); continue; }

      const body = (await readCapped(res, LIMITS.maxPageBytes)).toString('utf8');
      job.counters.parsed++;
      job.counters.bytes += Buffer.byteLength(body);

      const $ = cheerio.load(body);
      const fields = extract($, settings.fields);
      const rights = classifyRights($, fields);
      const title = (fields.title || $('title').first().text() || u.pathname).replace(/\s+/g, ' ').trim().slice(0, 160);
      const text = fields.body || readableText($);

      const hash = textHash(text);

      if (have.has(finalUrl) || haveText.has(hash)) {
        // walked again only to reach its links; the bytes are already collected
        job.counters.skipped++;
        logLine('HAVE', `${u.host}${u.pathname} — collected already`, '#8a8a8a');
      } else if (!rights.ok) {
        job.counters.quarantined++;
        job.results.push(await store({
          type: 'text', url: finalUrl, host: u.hostname, title,
          license: rights.license, status: 'quarantined',
          excerpt: text.slice(0, 220), bytes: Buffer.byteLength(text), foundOn: null,
        }, null));
        logLine('HOLD', `${u.host}${u.pathname} — no reusable licence, quarantined`, '#BF00FF');
      } else {
        job.counters.stored++;
        haveText.add(hash);
        job.results.push(await store({
          type: 'text', url: finalUrl, host: u.hostname, title, hash,
          license: rights.license, status: 'kept',
          excerpt: text.slice(0, 220), bytes: Buffer.byteLength(text), foundOn: null,
        }, Buffer.from(JSON.stringify({ title, license: rights.license, url: finalUrl, fields, text }, null, 2))));
        logLine('200 OK', `${u.host}${u.pathname} — ${rights.license}`, '#2CFF05');
      }

      // audio links on the page — recorded now, bytes pulled only when picked
      if (settings.audio && audioCount < LIMITS.maxAudioFiles) {
        const links = new Set();
        $('a[href], audio[src], source[src]').each((_, el) => {
          const href = $(el).attr('href') || $(el).attr('src');
          if (!href) return;
          try {
            const abs = new URL(href, finalUrl);
            if (AUDIO_EXT.test(abs.pathname) && !isDescriptionPage(abs) && hostAllowed(abs.hostname, allowHosts)) {
              links.add(abs.href);
            }
          } catch { /* ignore unparseable */ }
        });
        for (const link of links) {
          if (audioCount >= LIMITS.maxAudioFiles || job.seen.has(link) || have.has(link) || dead.has(link)) continue;
          job.seen.add(link);
          audioCount++;
          job.results.push(await store({
            type: 'audio', url: link, host: new URL(link).hostname,
            title: decodeURIComponent(link.split('/').pop().split('?')[0]),
            license: rights.license, status: rights.ok ? 'listed' : 'quarantined',
            excerpt: `linked from ${u.pathname}`, bytes: 0, foundOn: finalUrl,
          }, null));
          logLine('AUDIO', `${new URL(link).pathname.split('/').pop()} — listed, not downloaded yet`, '#21E5E5');
        }
      }

      // follow same-host links
      if (depth < settings.depth) {
        const next = new Set();
        $('a[href]').each((_, el) => {
          try {
            const abs = new URL($(el).attr('href'), finalUrl);
            abs.hash = '';
            if (hostAllowed(abs.hostname, allowHosts) && !AUDIO_EXT.test(abs.pathname) && !job.seen.has(abs.href)) next.add(abs.href);
          } catch { /* ignore */ }
        });
        for (const href of [...next].slice(0, 25)) queue.push({ url: href, depth: depth + 1 });
        job.counters.queued = queue.length;
      }
    } catch (err) {
      logLine('ERR', `${u.host}${u.pathname} — ${err.message}`, '#ff4d4d');
    }
  }

  job.running = false;
  job.finishedAt = Date.now();
  logLine('DONE', job.stopRequested
    ? `stopped — ${job.counters.stored} kept, ${job.counters.quarantined} quarantined`
    : `finished — ${job.counters.stored} kept, ${job.counters.quarantined} quarantined, ${job.counters.skipped} skipped`, '#2CFF05');
  job.stopRequested = false;
}

// ── the manifest ─────────────────────────────────────────────────────────────
// A job lives in memory and dies with the process, but the files it wrote do
// not. Without a record on disk, a second run starts counting at r1 again and
// overwrites everything the first run collected — fatal for a dataset that is
// meant to grow on a schedule. The manifest is that record: the id high-water
// mark, plus every URL already collected so repeat runs skip them.
const MANIFEST = path.join(STORE, 'manifest.json');
let manifest = { nextId: 1, items: {}, dead: {} };

async function loadManifest() {
  try {
    const raw = JSON.parse(await readFile(MANIFEST, 'utf8'));
    manifest = {
      nextId: Number(raw.nextId) > 0 ? Number(raw.nextId) : 1,
      items: raw.items && typeof raw.items === 'object' ? raw.items : {},
      dead: raw.dead && typeof raw.dead === 'object' ? raw.dead : {},
    };
  } catch {
    // No manifest: either a first run, or a store written before there was one.
    // Files from those earlier runs still have to be safe, so the id counter
    // restarts above the highest r<N> already sitting in the directory.
    manifest = { nextId: 1, items: {}, dead: {} };
    let high = 0;
    for (const name of await readdir(STORE).catch(() => [])) {
      const n = Number((name.match(/^r(\d+)\./) || [])[1]);
      if (n > high) high = n;
    }
    if (high) {
      manifest.nextId = high + 1;
      await saveManifest();
      console.log(`  found ${high} file(s) from before the manifest — continuing at r${manifest.nextId}`);
    }
  }
  return manifest;
}

let manifestWrite = Promise.resolve();
/** Serialised so concurrent stores cannot interleave and truncate the file. */
function saveManifest() {
  manifestWrite = manifestWrite.then(async () => {
    await mkdir(STORE, { recursive: true });
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  }).catch(() => { /* a failed manifest write must not kill the crawl */ });
  return manifestWrite;
}

async function store(meta, buf) {
  const id = `r${manifest.nextId++}`;
  const rec = { id, ...meta, file: buf ? `${id}.json` : null };
  if (buf) {
    await mkdir(STORE, { recursive: true });
    await writeFile(path.join(STORE, `${id}.json`), buf);
  }
  await noteCollected(rec);
  return rec;
}

/**
 * Record a row against its URL. `fetchPage` / `fetchAudio` write their own files
 * and fill in `rec.file` later, so they call this again to correct the entry.
 */
async function noteCollected(rec) {
  if (!rec.url) return rec;
  manifest.items[rec.url] = {
    id: rec.id, file: rec.file || null, title: rec.title, license: rec.license,
    type: rec.type, bytes: rec.bytes || 0, status: rec.status,
    hash: rec.hash || manifest.items[rec.url]?.hash || null,
    collectedAt: manifest.items[rec.url]?.collectedAt || new Date().toISOString(),
  };
  await saveManifest();
  return rec;
}

/** URLs with bytes already on disk — a repeat run has nothing to gain refetching. */
function alreadyHaveFile() {
  return Object.entries(manifest.items)
    .filter(([, it]) => it.file)
    .map(([url]) => url);
}

/**
 * Hashes of text already collected.
 *
 * The same page arrives under more than one address — `imslp.org/` and
 * `imslp.org/wiki/Main_Page` are one page reached two ways — so a URL key alone
 * lets duplicates through. Duplicates are worse than useless in a training set:
 * the model sees the same passage repeatedly and memorises it. Hashing the
 * extracted text catches those regardless of the address they came in by.
 */
function textHash(text) {
  return createHash('sha256').update(String(text).replace(/\s+/g, ' ').trim()).digest('hex');
}

function collectedHashes() {
  return new Set(Object.values(manifest.items).map(it => it.hash).filter(Boolean));
}

/**
 * Show what has already been collected.
 *
 * A job lives in memory, so after the scheduler has run all night the service
 * restarts with an empty one and the screen reads "Nothing here yet" — while the
 * disk holds hundreds of files. Rebuilding the list from the manifest at start-up
 * means opening the app shows the library, not an empty room.
 */
function seedResultsFromManifest() {
  job.results = Object.entries(manifest.items)
    .filter(([, it]) => it.file)
    .map(([url, it]) => ({
      id: it.id, url, host: (() => { try { return new URL(url).hostname; } catch { return ''; } })(),
      title: it.title || url, license: it.license || 'unknown',
      type: /\.(wav|mp3|ogg|oga|flac|m4a|aac)$/i.test(it.file) ? 'audio' : 'text',
      status: it.status || 'kept', bytes: it.bytes || 0, file: it.file, foundOn: null,
    }))
    .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));   // newest first
  return job.results.length;
}

/** Remember a link that can never work, so later runs do not keep trying it. */
manifest.dead = manifest.dead || {};
async function noteDead(url, why) {
  if (!url) return;
  manifest.dead = manifest.dead || {};
  manifest.dead[url] = { why: String(why).slice(0, 120), at: new Date().toISOString() };
  await saveManifest();
}

function deadLinks() {
  return new Set(Object.keys(manifest.dead || {}));
}

/** A catalogue item adopted without a crawl has no stored text yet — fetch it now. */
async function fetchTextRecord(rec) {
  if (rec.file) return rec;
  const allowHosts = new Set(job.settings.allowHosts);
  const { res, finalUrl } = await safeFetch(rec.url, { accept: 'text/html,text/plain;q=0.9', allowHosts });
  if (!res.ok) throw new Error(`${res.status} from ${rec.host}`);
  const ctype = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^text\/(html|plain)$/.test(ctype)) throw new Error(`not a page (${ctype || 'unknown type'})`);
  const body = (await readCapped(res, LIMITS.maxPageBytes)).toString('utf8');
  const $ = cheerio.load(body);
  const fields = extract($, job.settings.fields);
  const text = fields.body || readableText($);
  const title = rec.title || (fields.title || $('title').first().text() || '').trim();
  await mkdir(STORE, { recursive: true });
  rec.file = `${rec.id}.json`;
  rec.bytes = Buffer.byteLength(text);
  await writeFile(path.join(STORE, rec.file),
    Buffer.from(JSON.stringify({ title, license: rec.license, url: finalUrl, fields, text }, null, 2)));
  job.counters.bytes += rec.bytes;
  await noteCollected(rec);
  logLine('PULL', `${title.slice(0, 44)} — ${Math.round(rec.bytes / 1024)}KB`, '#2CFF05');
  return rec;
}

/** Audio is pulled on demand — picking it in the UI is what authorises the download. */
async function fetchAudio(rec) {
  if (rec.file) return rec;
  const allowHosts = new Set(job.settings.allowHosts);
  const { res, finalUrl } = await safeFetch(rec.url, { accept: 'audio/*', allowHosts });
  if (!res.ok) throw new Error(`${res.status} from ${rec.host}`);
  const ctype = (res.headers.get('content-type') || '').split(';')[0].trim();
  // A ".../File:song.ogg" *page* also ends in .ogg — trust the content-type, not the path.
  const isAudio = /^audio\//.test(ctype)
    || /^application\/(ogg|x-ogg|x-flac)$/.test(ctype)   // ogg/flac ship under application/*
    || (/^(application|binary)\/octet-stream$/.test(ctype) && AUDIO_EXT.test(new URL(finalUrl).pathname));
  if (!isAudio) throw new Error(`not audio (${ctype || 'unknown type'})`);
  const buf = await readCapped(res, LIMITS.maxAudioBytes);
  await mkdir(STORE, { recursive: true });
  const ext = (new URL(finalUrl).pathname.match(/\.(\w+)$/) || [, 'bin'])[1];
  rec.file = `${rec.id}.${ext}`;
  rec.mime = ctype || 'audio/mpeg';
  rec.bytes = buf.length;
  await writeFile(path.join(STORE, rec.file), buf);
  job.counters.bytes += buf.length;
  await noteCollected(rec);
  logLine('PULL', `${rec.title} — ${(buf.length / 1048576).toFixed(1)}MB downloaded`, '#21E5E5');
  return rec;
}

// ── discovery ────────────────────────────────────────────────────────────────
// "I don't know where to look." Ask catalogues that already track licensing,
// rather than guessing at the open web. Nothing here is crawled — it only
// proposes targets, which you then pick from.

const CC_LABEL = {
  'cc0': 'CC0', 'pdm': 'public domain', 'by': 'CC BY', 'by-sa': 'CC BY-SA',
  'by-nc': 'CC BY-NC (non-commercial)', 'by-nd': 'CC BY-ND (no derivatives)',
  'by-nc-sa': 'CC BY-NC-SA (non-commercial)', 'by-nc-nd': 'CC BY-NC-ND (non-commercial)',
};

const catFetch = (url) => timedFetch(url, { redirect: 'follow', accept: 'application/json' })
  .then(r => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} from ${new URL(url).hostname}`))));

/**
 * license mode: 'any' | 'commercial' (usable in a released track) | 'open' (CC0/PD).
 * Openverse can filter server-side, which is why so much of the earlier output
 * came back NC-only — nothing was asking it not to.
 */
function openverseLicenseParam(license) {
  if (license === 'open') return '&license=cc0,pdm';
  if (license === 'commercial') return '&license_type=commercial,modification';
  return '';
}

const OPENVERSE_MAX_PAGE = 20;   // hard cap for anonymous requests

async function fromOpenverse(q, limit, { license = 'any', source = 'all', page = 1 } = {}) {
  // Asking for more than 20 is rejected outright, so walk pages instead.
  const rounds = Math.min(5, Math.ceil(limit / OPENVERSE_MAX_PAGE));
  const size = Math.min(OPENVERSE_MAX_PAGE, limit);
  const first = (page - 1) * rounds + 1;
  const results = [];
  for (let i = 0; i < rounds; i++) {
    const url = `${CATALOGUES.openverse}/audio/?q=${encodeURIComponent(q)}&page_size=${size}&page=${first + i}`
      + openverseLicenseParam(license)
      + (OPENVERSE_SOURCES[source] ? `&source=${OPENVERSE_SOURCES[source]}` : '');
    let data;
    try { data = await catFetch(url); } catch (err) {
      if (i === 0) throw err;   // first page failing is a real error
      break;                    // running off the end of the results is not
    }
    results.push(...(data.results || []));
    if ((data.results || []).length < size) break;
  }
  return results.map(r => ({
    kind: 'audio',
    title: r.title || 'untitled',
    // the media file itself; the landing page is what carries the licence notice
    url: r.url,
    pageUrl: r.foreign_landing_url || r.url,
    license: CC_LABEL[r.license] || (r.license || 'unknown').toUpperCase(),
    creator: r.creator || '',
    source: 'Openverse',
    provider: r.provider || '',
    // worth surfacing: some "previews" are 29MB, half-hour recordings
    duration: Number(r.duration) || 0,   // ms
    bytes: Number(r.filesize) || 0,
  }));
}

/** Reject licences that can't be used the way the chosen mode implies. */
function licenceMatches(licenseUrl, mode) {
  if (mode === 'open') return /publicdomain|licenses\/zero|\/zero\//i.test(licenseUrl);
  if (mode === 'commercial') return !/-nc|-nd/i.test(licenseUrl);
  return true;
}

async function fromArchive(q, limit, mediatype, { license = 'any', page = 1 } = {}) {
  const scope = mediatype === 'audio' ? ` AND collection:${ARCHIVE_AUDIO_COLLECTIONS}` : '';
  const query = `${q} AND mediatype:(${mediatype})${scope}`;
  const url = `${CATALOGUES.archive}?q=${encodeURIComponent(query)}`
    + '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl&fl%5B%5D=creator'
    // over-fetch because unlicensed rows get dropped below
    + `&rows=${limit * 4}&page=${page}&output=json`;
  const data = await catFetch(url);
  return (data.response?.docs || [])
    // no licence recorded ⇒ not a candidate; DataCore would quarantine it anyway
    .filter(d => d.licenseurl && licenceMatches(d.licenseurl, license))
    .slice(0, limit)
    .map(d => {
      const lic = LICENSE_HINTS.find(([re]) => re.test(d.licenseurl));
      return {
        kind: mediatype === 'audio' ? 'audio' : 'text',
        title: Array.isArray(d.title) ? d.title[0] : (d.title || d.identifier),
        url: `https://archive.org/details/${d.identifier}`,
        pageUrl: `https://archive.org/details/${d.identifier}`,
        license: lic ? lic[1] : 'see item',
        creator: Array.isArray(d.creator) ? d.creator[0] : (d.creator || ''),
        source: 'Internet Archive',
        provider: 'archive.org',
      };
    });
}

async function fromWikisource(q, limit, { page = 1 } = {}) {
  const url = `${CATALOGUES.wikisource}?action=query&list=search&srsearch=${encodeURIComponent(q)}`
    + `&srlimit=${limit}&sroffset=${(page - 1) * limit}&format=json`;
  const data = await catFetch(url);
  return (data.query?.search || []).map(r => ({
    kind: 'text',
    title: r.title,
    url: 'https://en.wikisource.org/wiki/' + encodeURIComponent(r.title.replace(/ /g, '_')),
    pageUrl: 'https://en.wikisource.org/wiki/' + encodeURIComponent(r.title.replace(/ /g, '_')),
    license: 'CC BY-SA',
    creator: '',
    source: 'Wikisource',
    provider: 'en.wikisource.org',
  }));
}

/** "I know the site, not the pages" — read robots.txt/sitemap.xml for real URLs. */
async function fromSitemap(input, limit) {
  const host = input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return [];
  if (!(await hostIsPublic(host))) throw new Error(`${host} is not a public host`);

  const maps = [];
  try {
    const res = await timedFetch(`https://${host}/robots.txt`, { redirect: 'follow' });
    if (res.ok) {
      const txt = (await res.text()).slice(0, 200 * 1024);
      for (const m of txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)) maps.push(m[1]);
    }
  } catch { /* fall through to the conventional location */ }
  if (!maps.length) maps.push(`https://${host}/sitemap.xml`);

  const urls = [];
  let lastStatus = 0;
  for (const map of maps.slice(0, 2)) {
    try {
      const res = await timedFetch(map, { redirect: 'follow' });
      if (!res.ok) { lastStatus = res.status; continue; }
      const xml = (await res.text()).slice(0, 2 * 1024 * 1024);
      // a sitemap index points at more sitemaps; follow one level only
      const nested = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/gi)].map(m => m[1]);
      if (nested.length) {
        const inner = await timedFetch(nested[0], { redirect: 'follow' });
        if (inner.ok) {
          const innerXml = (await inner.text()).slice(0, 2 * 1024 * 1024);
          urls.push(...[...innerXml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/gi)].map(m => m[1]));
        }
      }
      urls.push(...[...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/gi)].map(m => m[1]));
    } catch { /* skip unreadable sitemaps */ }
    if (urls.length >= limit) break;
  }

  // A refusal is worth saying out loud — it's different from having no sitemap.
  if (!urls.length && lastStatus) {
    throw new Error(lastStatus === 403 || lastStatus === 401 || lastStatus === 429
      ? `${host} refused the request (HTTP ${lastStatus}) — likely bot protection`
      : `${host}'s sitemap returned HTTP ${lastStatus}`);
  }

  return urls.slice(0, limit).map(u => ({
    kind: 'text',
    title: decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || host),
    url: u,
    pageUrl: u,
    license: 'unverified',
    creator: '',
    source: 'Sitemap',
    provider: host,
  }));
}

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'with', 'from', 'to', 'by', 'music', 'song', 'songs']);

/**
 * These catalogues AND every term, so "appalachian folk ballad banjo" finds
 * almost nothing while "banjo" finds plenty. Keep the `n` most distinctive
 * words so a descriptive phrase still returns something to look at.
 */
function broaden(q, n) {
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const ranked = [...new Set(words)].sort((a, b) => b.length - a.length);
  return ranked.slice(0, n).join(' ') || q.split(/\s+/)[0].toLowerCase();
}

async function runProviders(q, { kind, license = 'any', source = 'all', page = 1, pageSize = 20 }) {
  const wants = k => kind === 'both' || kind === k;
  const via = name => source === 'all' || source === name;
  // CC BY-SA is fine commercially but isn't public domain, so Wikisource drops
  // out of an "open" search rather than returning results the mode excludes.
  const wikisourceFits = license !== 'open';

  // Work out who's active first, so the requested page size can be split
  // between them instead of every provider returning a fixed handful.
  const active = [
    ...(wants('audio') && via('archive') ? ['archive-audio'] : []),
    ...(wants('audio') && (source === 'all' || OPENVERSE_SOURCES[source]) ? ['openverse'] : []),
    ...(wants('text') && via('wikisource') && wikisourceFits ? ['wikisource'] : []),
    ...(wants('text') && via('archive') ? ['archive-text'] : []),
  ];
  const per = Math.max(2, Math.min(100, Math.ceil(pageSize / Math.max(1, active.length))));
  const openverseOpts = { license, page, ...(OPENVERSE_SOURCES[source] ? { source } : {}) };

  const jobs = active.map(name => {
    switch (name) {
      case 'archive-audio': return [name, fromArchive(q, per, 'audio', { license, page })];
      case 'openverse': return [name, fromOpenverse(q, per, openverseOpts)];
      case 'wikisource': return [name, fromWikisource(q, per, { page })];
      default: return [name, fromArchive(q, per, 'texts', { license, page })];
    }
  });
  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const candidates = [];
  const problems = [];
  let anyFull = false;   // a provider that filled its quota probably has more
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      candidates.push(...r.value);
      if (r.value.length >= per) anyFull = true;
    } else problems.push(`${jobs[i][0]}: ${r.reason.message}`);
  });
  return { candidates, problems, anyFull };
}

/**
 * `archive.org/details/<id>` is a web page, not a sound file. Ask the item's
 * metadata which files it actually holds and hand back real audio URLs.
 * Downloads redirect onto a per-node host, hence the `*.archive.org` grant.
 */
async function resolveArchiveAudio(detailsUrl, max = 3) {
  const m = detailsUrl.match(/archive\.org\/details\/([^/?#]+)/);
  if (!m) return null;
  const id = m[1];
  const meta = await catFetch(`https://archive.org/metadata/${id}`);
  const audio = (meta.files || []).filter(f => AUDIO_EXT.test(f.name || '') && Number(f.size || 0) > 0);
  // Archive lectures and concert tapes run to hundreds of MB — drop anything
  // that could never be collected rather than offering it and failing later.
  const files = audio
    .filter(f => Number(f.size) <= LIMITS.maxAudioBytes)
    .sort((a, b) => Number(a.size) - Number(b.size))  // smallest usable first
    .slice(0, max);
  if (!files.length && audio.length) {
    const smallest = Math.min(...audio.map(f => Number(f.size)));
    throw new Error(`every file exceeds the ${LIMITS.maxAudioBytes / 1048576}MB cap (smallest ${(smallest / 1048576).toFixed(0)}MB)`);
  }
  return files.map(f => ({
    url: `https://archive.org/download/${id}/${encodeURIComponent(f.name)}`,
    title: f.name,
    bytes: Number(f.size) || 0,
  }));
}

async function discover({ q, kind, license = 'any', source = 'all', page = 1, pageSize = 20 }) {
  const looksLikeHost = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/i.test(q.trim());
  const opts = { kind, license, source, page, pageSize };
  let candidates = [];
  let problems = [];
  let usedQuery = q;
  let effectiveQuery = q;
  let note = '';
  let moreLikely = false;

  if (looksLikeHost) {
    try {
      candidates = await fromSitemap(q, 16);
      note = candidates.length ? `read ${candidates.length} URL(s) from ${q}'s sitemap` : `no sitemap found for ${q}`;
    } catch (err) {
      problems.push('sitemap: ' + err.message);
    }
  } else if (page > 1) {
    // Later pages continue whichever query actually worked — re-broadening here
    // would shuffle the result set under the user mid-scroll.
    const round = await runProviders(q, opts);
    candidates = round.candidates;
    problems = round.problems;
    moreLikely = round.anyFull;
  } else {
    // Widen in steps — full phrase, two best words, then one. Two words is
    // still an AND, so a phrase like "folk ballad banjo" needs the last step.
    const attempts = [q];
    for (const n of [2, 1]) {
      const wider = broaden(q, n);
      if (wider && !attempts.some(a => a.toLowerCase() === wider)) attempts.push(wider);
    }

    for (const [i, attempt] of attempts.entries()) {
      const round = await runProviders(attempt, opts);
      problems = problems.concat(round.problems);
      const seen = new Set(candidates.map(c => c.url));
      const extra = round.candidates.filter(c => !seen.has(c.url));
      candidates = candidates.concat(i === 0 ? extra : extra.map(c => ({ ...c, broadened: true })));
      moreLikely = moreLikely || round.anyFull;
      if (i > 0 && extra.length) {
        usedQuery = `${q} → ${attempt}`;
        effectiveQuery = attempt;
        note = `“${q}” was too narrow, so it also searched “${attempt}”`;
      }
      if (candidates.length >= Math.min(6, pageSize)) break;
    }
  }

  let n = 0;
  for (const c of candidates) {
    c.id = `c${page}_${++n}`;   // unique across pages, so appending can't clash
    try { c.host = new URL(c.url).hostname; } catch { c.host = ''; }
    try { c.pageHost = new URL(c.pageUrl).hostname; } catch { c.pageHost = c.host; }
    // only direct media can be auditioned; an item page has nothing to play yet
    c.playable = c.kind === 'audio' && (AUDIO_EXT.test(c.url) || /^https?:\/\/[^/]*(freesound|jamendo|wikimedia)/i.test(c.url));
  }
  const kept = candidates.filter(c => c.host);
  return {
    candidates: kept,
    problems: [...new Set(problems)],
    usedQuery,
    effectiveQuery,
    note,
    page,
    // "more" means a provider hit its quota, not that we guessed from the total
    hasMore: !looksLikeHost && moreLikely && page < 20,
  };
}

// ── http ─────────────────────────────────────────────────────────────────────
const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
};

const readBody = req => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 1e6) { reject(new Error('body too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
});

function normalizeSettings(input) {
  const seeds = String(input.seeds || '')
    .split(/[\n,]/)
    .map(s => s.trim().replace(/^sitemap:/i, ''))
    .filter(Boolean)
    .map(s => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
    .filter(s => { try { new URL(s); return true; } catch { return false; } });
  if (!seeds.length) throw new Error('no usable seed URLs');
  // Seed hosts are allowed implicitly; extras must be named on purpose — media
  // often sits on a CDN subdomain the seeds never mention.
  const extra = String(input.extraHosts || '')
    .split(/[\s,]+/)
    .map(h => h.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(h => /^(\*\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(h));
  const allowHosts = [...new Set([...seeds.map(s => new URL(s).hostname), ...extra])];
  return {
    seeds,
    allowHosts,
    depth: Math.min(LIMITS.maxDepth, Math.max(0, Number(input.depth) || 1)),
    maxPages: Math.min(LIMITS.maxPages, Math.max(1, Number(input.maxPages) || 20)),
    delayMs: Math.max(LIMITS.minDelayMs, Math.round(1000 / Math.max(1, Number(input.rateLimit) || 1))),
    audio: input.audio !== false,
    resume: input.resume !== false,
    fields: Array.isArray(input.fields) ? input.fields.slice(0, 12) : [],
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    return res.end();
  }

  try {
    if (url.pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'datacore-crawler', version: '0.1', limits: LIMITS });
    }

    if (url.pathname === '/api/status') {
      return json(res, 200, {
        running: job.running,
        counters: job.counters,
        log: job.log.slice(0, 20),
        resultCount: job.results.length,
        settings: job.settings,
        // the dataset as it stands on disk, across every run so far
        dataset: { items: alreadyHaveFile().length, nextId: manifest.nextId },
      });
    }

    if (url.pathname === '/api/results') {
      // Results are append-only within a job, so a poller can ask for only what
      // it has not seen yet with ?since=<count it already holds>. `since` out of
      // range means the job was reset underneath it — send the whole list back.
      // `excerpt` is dropped: the page never shows it and it dominated the
      // payload once a crawl passed a few hundred finds.
      const total = job.results.length;
      const asked = Number(url.searchParams.get('since'));
      const since = Number.isFinite(asked) && asked > 0 && asked <= total ? asked : 0;
      const results = job.results.slice(since)
        .map(({ file, excerpt, ...r }) => ({ ...r, hasFile: !!file }));
      return json(res, 200, { results, since, total });
    }

    if (url.pathname === '/api/crawl' && req.method === 'POST') {
      if (job.running) return json(res, 409, { error: 'a crawl is already running' });
      const settings = normalizeSettings(await readBody(req));
      const unreachable = [];
      for (const h of settings.allowHosts) if (!(await hostIsPublic(h))) unreachable.push(h);
      if (unreachable.length) return json(res, 400, { error: `refused: ${unreachable.join(', ')} is loopback/private/unresolvable` });
      Object.assign(job, blankJob());
      runCrawl(settings).catch(err => { job.running = false; logLine('ERR', `crawl aborted — ${err.message}`, '#ff4d4d'); });
      return json(res, 202, { started: true, settings });
    }

    if (url.pathname === '/api/discover' && req.method === 'POST') {
      const { q, kind, license, source, page, pageSize } = await readBody(req);
      if (!q || !String(q).trim()) return json(res, 400, { error: 'nothing to search for' });
      const out = await discover({
        q: String(q).trim().slice(0, 200),
        kind: kind || 'both',
        license: ['any', 'commercial', 'open'].includes(license) ? license : 'any',
        source: ['all', 'freesound', 'jamendo', 'commons', 'archive', 'wikisource'].includes(source) ? source : 'all',
        page: Math.min(20, Math.max(1, Number(page) || 1)),
        pageSize: [10, 20, 50, 100].includes(Number(pageSize)) ? Number(pageSize) : 20,
      });
      logLine('FIND', `"${String(q).slice(0, 40)}" — ${out.candidates.length} candidate(s)`, '#21E5E5');
      return json(res, 200, out);
    }

    // Catalogue hits already carry a licence, so they can enter the findings list
    // without a crawl. Their hosts get allowlisted at the same time.
    if (url.pathname === '/api/adopt' && req.method === 'POST') {
      const { items } = await readBody(req);
      if (!Array.isArray(items) || !items.length) return json(res, 400, { error: 'nothing to adopt' });
      if (!job.settings) job.settings = { allowHosts: [], delayMs: LIMITS.minDelayMs, seeds: [], depth: 0, maxPages: 0, audio: true, fields: [] };
      const added = [];
      const notes = [];
      for (const it of items.slice(0, 40)) {
        // expand an Archive.org item page into the sound files it contains
        let targets = [{ url: it.url, title: it.title, bytes: 0 }];
        if (it.kind === 'audio' && /archive\.org\/details\//.test(it.url)) {
          try {
            const files = await resolveArchiveAudio(it.url);
            if (files && files.length) {
              targets = files;
              // downloads redirect onto a storage node — dn*.ca / ia*.us / etc.
              if (!job.settings.allowHosts.includes('*.archive.org')) job.settings.allowHosts.push('*.archive.org');
            } else {
              notes.push(`${it.title}: no downloadable audio in that item`);
              continue;
            }
          } catch (err) {
            notes.push(`${it.title}: ${err.message}`);
            continue;
          }
        }

        for (const t of targets) {
          let host;
          try { host = new URL(t.url).hostname; } catch { continue; }
          if (!(await hostIsPublic(host))) continue;
          if (!job.settings.allowHosts.includes(host)) job.settings.allowHosts.push(host);
          if (job.seen.has(t.url)) continue;
          job.seen.add(t.url);
          const rec = await store({
            type: it.kind === 'audio' ? 'audio' : 'text',
            url: t.url, host,
            title: String(t.title || t.url).slice(0, 160),
            license: it.license || 'unknown',
            status: 'listed',
            excerpt: `from ${it.source || 'catalogue'}${it.creator ? ' · ' + it.creator : ''}`,
            bytes: t.bytes || 0, foundOn: it.pageUrl || it.url,
          }, null);
          job.results.push(rec);
          added.push(rec.id);
        }
      }
      notes.forEach(n => logLine('SKIP', n.slice(0, 90), '#8a8a8a'));
      logLine('ADOPT', `${added.length} catalogue item(s) added to findings`, '#21E5E5');
      return json(res, 200, { added, notes });
    }

    if (url.pathname === '/api/stop' && req.method === 'POST') {
      job.stopRequested = true;
      return json(res, 200, { stopping: true });
    }

    if (url.pathname === '/api/reset' && req.method === 'POST') {
      job.stopRequested = true;
      await rm(STORE, { recursive: true, force: true });
      Object.assign(job, blankJob());
      manifest = { nextId: 1, items: {}, dead: {} };   // the files are gone; forget them too
      await saveManifest();
      return json(res, 200, { reset: true });
    }

    // Pull bytes for the picked records; audio is downloaded at this point.
    if (url.pathname === '/api/collect' && req.method === 'POST') {
      const { ids } = await readBody(req);
      const wanted = job.results.filter(r => (ids || []).includes(r.id));
      const collected = [];
      const failed = [];
      for (const rec of wanted) {
        if (rec.status === 'quarantined') { failed.push({ id: rec.id, error: 'quarantined — no reusable licence' }); continue; }
        try {
          if (rec.type === 'audio') await fetchAudio(rec);
          else await fetchTextRecord(rec);
          collected.push({ id: rec.id, type: rec.type, title: rec.title, url: rec.url, license: rec.license, bytes: rec.bytes, mime: rec.mime || 'application/json' });
        } catch (err) {
          failed.push({ id: rec.id, error: err.message });
          // A 429 or a timeout is worth trying again tomorrow. "not audio" or
          // "over cap" describes the thing itself and will never come good, so
          // record it and stop spending requests on it.
          if (/not audio|over cap|not a page|unsupported protocol|not in allowlist/i.test(err.message)) {
            await noteDead(rec.url, err.message);
          }
          logLine('ERR', `${rec.title} — ${err.message}`, '#ff4d4d');
        }
      }
      return json(res, 200, { collected, failed });
    }

    // Serve a stored record's bytes so the browser can hand it to Lyrx.
    if (url.pathname.startsWith('/api/file/')) {
      const rec = job.results.find(r => r.id === url.pathname.split('/').pop());
      if (!rec || !rec.file) return json(res, 404, { error: 'nothing stored for that id' });
      res.writeHead(200, {
        'content-type': rec.type === 'audio' ? (rec.mime || 'audio/mpeg') : 'application/json',
        'access-control-allow-origin': '*',
        'content-disposition': `inline; filename="${rec.file}"`,
      });
      return createReadStream(path.join(STORE, rec.file)).pipe(res);
    }

    // Everything kept, as one manifest — the "Download" button's payload.
    if (url.pathname === '/api/bundle') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
      const picked = job.results.filter(r => (ids.length ? ids.includes(r.id) : r.status === 'kept'));
      const items = [];
      for (const rec of picked) {
        const item = { id: rec.id, type: rec.type, title: rec.title, url: rec.url, license: rec.license, host: rec.host, bytes: rec.bytes };
        if (rec.type === 'text' && rec.file) {
          try { item.content = JSON.parse(await readFile(path.join(STORE, rec.file), 'utf8')); } catch { /* skip */ }
        }
        if (rec.type === 'audio' && rec.file) item.download = `http://localhost:${PORT}/api/file/${rec.id}`;
        items.push(item);
      }
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'content-disposition': 'attachment; filename="datacore-bundle.json"',
      });
      return res.end(JSON.stringify({ generated: new Date().toISOString(), source: 'DataCore crawler 0.1', items }, null, 2));
    }

    return json(res, 404, { error: 'no such endpoint' });
  } catch (err) {
    return json(res, 400, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  await mkdir(STORE, { recursive: true });
  await loadManifest();   // ids continue where the last run stopped, not at r1
  seedResultsFromManifest();
  const existing = (await readdir(STORE).catch(() => [])).length;
  console.log(`DataCore crawler listening on http://localhost:${PORT}`);
  console.log(`  store: ${STORE}${existing ? ` (${existing} file(s) from a previous run)` : ''}`);
  console.log(`  collected so far: ${alreadyHaveFile().length} item(s) · next id r${manifest.nextId}`);
  console.log(`  caps: ${LIMITS.maxPages} pages · depth ${LIMITS.maxDepth} · ${LIMITS.minDelayMs}ms/host · audio ≤${LIMITS.maxAudioBytes / 1048576}MB`);
  console.log('  robots.txt is honoured and only seed hosts are contacted.');
});
