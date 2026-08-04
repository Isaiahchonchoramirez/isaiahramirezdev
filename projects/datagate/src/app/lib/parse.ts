// Tabular parsing for whatever a visitor drags onto the gate.
//
// This is deliberately dependency-free. A CSV parser is a small amount of
// code once you accept that the only hard part is quoting, and shipping
// Papaparse to do it would cost more bytes than the whole analysis engine.

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export type ParsedTable = {
  columns: string[];
  rows: Row[];
  /** Rows actually held in memory — large files are sampled, see MAX_ROWS. */
  sampled: boolean;
  totalRows: number;
  format: "csv" | "tsv" | "json" | "jsonl";
  delimiter?: string;
};

export class ParseError extends Error {}

// Profiling a million rows in the main thread would freeze the tab. A 50k
// sample puts every statistic here inside a fraction of a percent of the
// true value while keeping the whole pass under a frame budget.
const MAX_ROWS = 50_000;

/**
 * Split one delimited line, honouring RFC 4180 quoting: a quoted field may
 * contain the delimiter, and a doubled quote inside a quoted field is a
 * literal quote.
 */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === delimiter) {
      out.push(field);
      field = "";
    } else field += char;
  }

  out.push(field);
  return out;
}

/**
 * Split on newlines, but not on newlines that live inside a quoted field —
 * an address column with a line break in it is otherwise enough to shear a
 * file into nonsense.
 */
function splitRecords(text: string): string[] {
  const records: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      records.push(current);
      current = "";
    } else current += char;
  }

  if (current.length) records.push(current);
  return records.filter((r) => r.trim().length > 0);
}

/**
 * Pick the delimiter by counting candidates on the header line, ignoring
 * anything inside quotes. Whichever appears most and appears consistently on
 * the following lines wins.
 */
function sniffDelimiter(records: string[]): string {
  const candidates = [",", "\t", ";", "|"];
  const sample = records.slice(0, 12);

  let best = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const counts = sample.map((line) => splitLine(line, delimiter).length);
    const first = counts[0];
    if (first < 2) continue;

    // Consistency matters more than raw count: a prose column full of commas
    // still yields a ragged row width, while the true delimiter does not.
    const consistent = counts.filter((c) => c === first).length / counts.length;
    const score = consistent * 10 + first;

    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

/** Turn a raw string cell into a typed value. Empty and the usual null spellings become null. */
export function coerce(raw: string): Cell {
  const value = raw.trim();
  if (value === "") return null;

  const lower = value.toLowerCase();
  if (lower === "null" || lower === "na" || lower === "n/a" || lower === "nan" || lower === "none") {
    return null;
  }
  if (lower === "true") return true;
  if (lower === "false") return false;

  // Accept 1,234.56 and (1,234) accounting negatives, but never treat a
  // zero-padded value like 007 or a phone number as a number — those are
  // identifiers, and rounding them destroys the data.
  const negated = /^\((.*)\)$/.exec(value);
  const body = negated ? negated[1] : value;
  const cleaned = body.replace(/[,$\s]/g, "").replace(/%$/, "");

  if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(cleaned)) {
    if (/^0\d/.test(cleaned)) return value;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return negated ? -n : n;
  }

  return value;
}

function normaliseHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((header, i) => {
    let name = header.trim().replace(/^﻿/, "");
    if (!name) name = `column_${i + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
}

function parseDelimited(text: string, format: "csv" | "tsv"): ParsedTable {
  const records = splitRecords(text);
  if (records.length === 0) throw new ParseError("The file has no readable rows.");

  const delimiter = format === "tsv" ? "\t" : sniffDelimiter(records);
  const columns = normaliseHeaders(splitLine(records[0], delimiter));

  const body = records.slice(1);
  const kept = body.slice(0, MAX_ROWS);

  const rows: Row[] = kept.map((record) => {
    const values = splitLine(record, delimiter);
    const row: Row = {};
    columns.forEach((column, i) => {
      row[column] = i < values.length ? coerce(values[i]) : null;
    });
    return row;
  });

  return {
    columns,
    rows,
    sampled: body.length > MAX_ROWS,
    totalRows: body.length,
    format,
    delimiter,
  };
}

/** Flatten one level of nesting so `{user:{id:1}}` profiles as a `user.id` column. */
function flatten(value: unknown, prefix = "", out: Row = {}): Row {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      const name = prefix ? `${prefix}.${key}` : key;
      if (inner && typeof inner === "object" && !Array.isArray(inner)) flatten(inner, name, out);
      else if (Array.isArray(inner)) out[name] = `[${inner.length} items]`;
      else out[name] = (inner ?? null) as Cell;
    }
  }
  return out;
}

function parseJSON(text: string): ParsedTable {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ParseError(`Not valid JSON — ${(error as Error).message}`);
  }

  // A payload is very often `{ data: [...] }` or `{ results: [...] }` rather
  // than a bare array, so reach one level in before giving up.
  let records: unknown[] | null = Array.isArray(data) ? data : null;
  if (!records && data && typeof data === "object") {
    const arrays = Object.values(data as Record<string, unknown>).filter(Array.isArray);
    if (arrays.length) records = arrays.sort((a, b) => b.length - a.length)[0] as unknown[];
  }

  if (!records) throw new ParseError("The JSON has no array of records to profile.");
  if (records.length === 0) throw new ParseError("The JSON array is empty.");

  const kept = records.slice(0, MAX_ROWS);
  const rows = kept.map((record) =>
    record && typeof record === "object" && !Array.isArray(record)
      ? flatten(record)
      : ({ value: record as Cell } as Row),
  );

  // Union the keys rather than trusting the first record — sparse objects are
  // the norm in API dumps.
  const columns = normaliseHeaders([...new Set(rows.flatMap((row) => Object.keys(row)))]);
  for (const row of rows) for (const column of columns) if (!(column in row)) row[column] = null;

  return { columns, rows, sampled: records.length > MAX_ROWS, totalRows: records.length, format: "json" };
}

function parseJSONL(text: string): ParsedTable {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const parsed = parseJSON(`[${lines.join(",")}]`);
  return { ...parsed, format: "jsonl" };
}

/** Detect the shape from the extension first, then from the content. */
export function parseText(text: string, filename = ""): ParsedTable {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  const head = text.trimStart();

  if (extension === "json") return parseJSON(text);
  if (extension === "jsonl" || extension === "ndjson") return parseJSONL(text);
  if (extension === "tsv") return parseDelimited(text, "tsv");
  if (extension === "csv") return parseDelimited(text, "csv");

  if (head.startsWith("{") || head.startsWith("[")) {
    // Several `{...}` lines in a row is JSONL, one object is JSON.
    const lines = head.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length > 1 && lines.every((l) => l.trim().startsWith("{"))) return parseJSONL(text);
    return parseJSON(text);
  }

  return parseDelimited(text, text.includes("\t") ? "tsv" : "csv");
}

export async function parseFile(file: File): Promise<ParsedTable> {
  if (file.size > 64 * 1024 * 1024) {
    throw new ParseError("That file is over 64 MB — the gate profiles a sample locally, not a warehouse.");
  }
  const text = await file.text();
  if (!text.trim()) throw new ParseError("That file is empty.");
  return parseText(text, file.name);
}
