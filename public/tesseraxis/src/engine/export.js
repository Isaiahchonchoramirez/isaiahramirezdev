// Run export.
//
// A simulation you cannot get the numbers out of is a toy. Everything here
// produces a file the user can open in a spreadsheet, a notebook, or a diffing
// tool, with enough provenance in it to know which run produced it.

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking on the next macrotask rather than immediately: Safari cancels an
  // in-flight download if the object URL disappears in the same turn.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// Header rows carry the seed and the parameter set, commented with '#'. pandas
// and most spreadsheet importers skip those on request, and without them an
// exported CSV is a column of numbers nobody can trace back to a run.
export function toCsv(recorder) {
  const channels = [...recorder.channels.values()];
  const lines = [];

  lines.push(`# tesseraxis run export`);
  lines.push(`# plugin: ${recorder.meta.plugin ?? 'unknown'}`);
  lines.push(`# seed: ${recorder.meta.seed}`);
  lines.push(`# started: ${recorder.meta.startedAt ?? ''}`);
  lines.push(`# samples: ${recorder.sampleCount}`);
  if (recorder.decimations > 0) {
    lines.push(`# note: run exceeded the sample budget and was decimated ${recorder.decimations}x`);
  }
  if (recorder.meta.params) {
    for (const [key, value] of Object.entries(recorder.meta.params)) {
      lines.push(`# param.${key}: ${value}`);
    }
  }

  // Units belong in the header, not appended to every cell where they would
  // make the column non-numeric.
  lines.push(['time_s', ...channels.map((c) => (c.unit ? `${c.key}_${c.unit}` : c.key))].join(','));

  for (let i = 0; i < recorder.sampleCount; i++) {
    const row = new Array(channels.length + 1);
    row[0] = recorder.times[i].toFixed(4);
    for (let c = 0; c < channels.length; c++) {
      row[c + 1] = formatNumber(channels[c].data[i], channels[c].precision);
    }
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

function formatNumber(value, precision) {
  if (!Number.isFinite(value)) return '';
  // Very large and very small magnitudes go to exponential rather than being
  // rounded to a wall of zeros or to 0.00.
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) return value.toExponential(4);
  return value.toFixed(precision);
}

export function toJson(recorder) {
  const channels = {};
  for (const channel of recorder.channels.values()) {
    channels[channel.key] = {
      label: channel.label,
      unit: channel.unit,
      group: channel.group,
      // Array.from on the subarray so the JSON holds plain numbers rather than
      // a typed-array's index-keyed object form.
      values: Array.from(channel.data.subarray(0, recorder.sampleCount)),
    };
  }
  return JSON.stringify(
    {
      format: 'tesseraxis-run/1',
      meta: recorder.meta,
      sampleCount: recorder.sampleCount,
      decimations: recorder.decimations,
      time: Array.from(recorder.times.subarray(0, recorder.sampleCount)),
      channels,
      events: recorder.events,
      inputs: recorder.inputs,
    },
    null,
    2,
  );
}

export function exportCsv(recorder) {
  const name = `tesseraxis-${recorder.meta.plugin ?? 'run'}-${stamp()}.csv`;
  download(name, new Blob([toCsv(recorder)], { type: 'text/csv;charset=utf-8' }));
  return name;
}

export function exportJson(recorder) {
  const name = `tesseraxis-${recorder.meta.plugin ?? 'run'}-${stamp()}.json`;
  download(name, new Blob([toJson(recorder)], { type: 'application/json' }));
  return name;
}

export function exportJournal(recorder) {
  const name = `tesseraxis-${recorder.meta.plugin ?? 'run'}-${stamp()}.journal.json`;
  const body = JSON.stringify(recorder.toJournal(), null, 2);
  download(name, new Blob([body], { type: 'application/json' }));
  return name;
}

// Share links carry the seed and the parameter overrides in the fragment, not
// the query string — the fragment never reaches a server, so a shared run stays
// between the two people sharing it.
export function buildShareLink(pluginId, seed, params) {
  const payload = { p: pluginId, s: seed, v: params };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const url = new URL(window.location.href);
  url.hash = `run=${encoded}`;
  return url.toString();
}

export function parseShareLink(hash = window.location.hash) {
  const match = /run=([A-Za-z0-9\-_]+)/.exec(hash);
  if (!match) return null;
  try {
    const base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(base64)));
    const payload = JSON.parse(json);
    return { pluginId: payload.p, seed: payload.s, params: payload.v || {} };
  } catch {
    // A mangled link should drop the user into the default scenario rather
    // than a broken shell.
    return null;
  }
}
