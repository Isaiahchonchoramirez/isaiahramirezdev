// Turn .crawl-store into something a trainer can actually read.
//
//   npm run dataset
//
// Collecting and training are different jobs with different shapes. The store is
// organised for the crawler — one file per capture, keyed by id. A trainer wants
// flat files, one example per line, with the junk already gone. This is the step
// in between, and it is deliberately re-runnable: it never writes into
// .crawl-store, so you can throw dataset/ away and rebuild it.
//
// Writes into dataset/:
//   lyrics.jsonl      text examples, one JSON object per line
//   audio.jsonl       one line per audio file, with its path and licence
//   ATTRIBUTION.md    who to credit, per licence — CC BY and BY-SA require this
//   summary.json      counts, licence spread, what was dropped and why
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(HERE, '..', '.crawl-store');
const OUT = path.join(HERE, '..', 'dataset');

// Text shorter than this is a navigation stub or an error page, not material.
const MIN_TEXT_CHARS = 400;

const AUDIO_EXT = /\.(wav|mp3|ogg|oga|flac|m4a|aac)$/i;

/**
 * Licences that permit training and redistribution, mapped to what you owe in
 * return. Anything not listed is left out of the dataset rather than guessed at.
 */
const USABLE = {
  'CC0': { credit: false, shareAlike: false },
  'Public domain': { credit: false, shareAlike: false },
  'CC BY': { credit: true, shareAlike: false },
  'CC BY-SA': { credit: true, shareAlike: true },
};

/** NC and ND cannot go into a model you might ever publish or sell. */
const EXCLUDED = /-NC|-ND|unknown|see item/i;

/**
 * Is this prose, or is it source code that got scraped by accident?
 *
 * Captures taken before the crawler learned to strip <script> are full of
 * minified JavaScript. It reads as text and passes a length check, so it has to
 * be recognised by shape: real writing does not carry dozens of braces and
 * semicolons per thousand characters.
 */
function looksLikeCode(text) {
  const sample = text.slice(0, 4000);
  const markers = (sample.match(/[{};]|=>|function\s*\(|var\s+\w+\s*=|\$\.\w+/g) || []).length;
  return markers / (sample.length / 1000) > 12;
}

/**
 * One recording, offered in several formats, is one recording.
 *
 * Archives publish transcodes side by side — `song.flac`, `song.flac.ogg`,
 * `song.flac.mp3` are the same performance three times. Training on all three
 * teaches the model that this particular track matters three times as much as
 * it does. Strip the chain of format suffixes to find what they have in common.
 */
function recordingKey(url) {
  let name = decodeURIComponent(url.split('/').pop().split('?')[0]);
  let prev;
  do { prev = name; name = name.replace(AUDIO_EXT, ''); } while (name !== prev);
  return name.toLowerCase();
}

function licenceRule(license) {
  const l = String(license || '').trim();
  if (EXCLUDED.test(l)) return null;
  for (const [key, rule] of Object.entries(USABLE)) {
    if (l.toUpperCase().startsWith(key.toUpperCase())) return { ...rule, label: l };
  }
  return null;
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(path.join(STORE, 'manifest.json'), 'utf8'));
  } catch {
    return { items: {} };
  }
}

async function main() {
  const manifest = await loadManifest();
  const entries = Object.entries(manifest.items).filter(([, it]) => it.file);
  if (!entries.length) {
    console.log('Nothing collected yet — run `npm run collect` first.');
    return;
  }

  const lyrics = [];
  const audio = [];
  const credits = new Map();          // "licence" -> [{title, url, creator}]
  const dropped = { noLicence: 0, tooShort: 0, missingFile: 0, restrictive: 0, duplicate: 0, code: 0 };
  const licenceSpread = {};
  // Second line of defence. The crawler skips duplicates as it collects, but
  // anything gathered before it did that is still sitting in the store.
  const seenText = new Set();

  for (const [url, it] of entries) {
    licenceSpread[it.license || 'unknown'] = (licenceSpread[it.license || 'unknown'] || 0) + 1;

    const rule = licenceRule(it.license);
    if (!rule) {
      if (EXCLUDED.test(String(it.license || 'unknown'))) dropped.restrictive++;
      else dropped.noLicence++;
      continue;
    }

    const file = path.join(STORE, it.file);
    let info;
    try { info = await stat(file); } catch { dropped.missingFile++; continue; }

    if (AUDIO_EXT.test(it.file)) {
      audio.push({
        id: it.id,
        path: path.relative(OUT, file),
        title: it.title || '',
        url,
        license: rule.label,
        bytes: info.size,
      });
    } else {
      let doc;
      try { doc = JSON.parse(await readFile(file, 'utf8')); } catch { dropped.missingFile++; continue; }
      const text = String(doc.text || '').trim();
      if (text.length < MIN_TEXT_CHARS) { dropped.tooShort++; continue; }
      if (looksLikeCode(text)) { dropped.code++; continue; }
      const hash = createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex');
      if (seenText.has(hash)) { dropped.duplicate++; continue; }
      seenText.add(hash);
      lyrics.push({
        id: it.id,
        title: doc.title || it.title || '',
        url,
        license: rule.label,
        text,
      });
    }

    if (rule.credit) {
      const list = credits.get(rule.label) || [];
      list.push({ title: it.title || url, url });
      credits.set(rule.label, list);
    }
  }

  await mkdir(OUT, { recursive: true });

  // Keep one copy of each recording — the largest, as the best quality on offer.
  const byRecording = new Map();
  for (const a of audio) {
    const key = recordingKey(a.url);
    const held = byRecording.get(key);
    if (!held || a.bytes > held.bytes) byRecording.set(key, a);
  }
  const uniqueAudio = [...byRecording.values()];
  dropped.altFormat = audio.length - uniqueAudio.length;

  const jsonl = rows => rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
  await writeFile(path.join(OUT, 'lyrics.jsonl'), jsonl(lyrics));
  await writeFile(path.join(OUT, 'audio.jsonl'), jsonl(uniqueAudio));

  // CC BY and BY-SA are only honoured if the credit actually ships with the
  // model. Generating it here means it cannot be forgotten later.
  const lines = ['# Attribution', '',
    'Material below was used to build the models in this project.',
    'Every entry is reproduced under the licence named in its heading.', ''];
  if (!credits.size) lines.push('_Nothing collected so far requires credit (CC0 / public domain only)._');
  for (const [licence, items] of [...credits].sort()) {
    lines.push(`## ${licence}`, '');
    for (const it of items) lines.push(`- [${it.title}](${it.url})`);
    lines.push('');
  }
  await writeFile(path.join(OUT, 'ATTRIBUTION.md'), lines.join('\n'));

  const textChars = lyrics.reduce((n, r) => n + r.text.length, 0);
  const audioBytes = uniqueAudio.reduce((n, r) => n + r.bytes, 0);
  const summary = {
    builtAt: new Date().toISOString(),
    text: { examples: lyrics.length, characters: textChars, approxTokens: Math.round(textChars / 4) },
    audio: { files: uniqueAudio.length, bytes: audioBytes, megabytes: +(audioBytes / 1048576).toFixed(1) },
    dropped,
    licenceSpread,
    shareAlike: [...credits.keys()].some(l => /-SA/i.test(l)),
  };
  await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(`dataset/ built from ${entries.length} collected item(s)\n`);
  console.log(`  text   ${lyrics.length} example(s) · ${textChars.toLocaleString()} chars · ~${summary.text.approxTokens.toLocaleString()} tokens`);
  console.log(`  audio  ${uniqueAudio.length} file(s) · ${summary.audio.megabytes} MB`);
  console.log(`  dropped: ${dropped.restrictive} restrictive licence · ${dropped.noLicence} no licence · ${dropped.tooShort} too short · ${dropped.duplicate} duplicate · ${dropped.code} scraped code · ${dropped.altFormat} other format · ${dropped.missingFile} unreadable`);
  if (summary.shareAlike) {
    console.log('\n  NOTE: share-alike material is included. A model trained on it may');
    console.log('        carry the same obligation onto whatever you publish.');
  }
  const enough = summary.text.approxTokens > 500000 || summary.audio.megabytes > 500;
  console.log(`\n  ${enough ? 'Enough to attempt a first fine-tune.' : 'Still far too small to train on — keep collecting.'}`);
}

main().catch(err => { console.error('FAILED —', err.message); process.exit(1); });
