// The statistics engine. Everything DataGate claims about a dataset is
// computed here from the actual rows — there are no placeholder numbers left
// anywhere in the product.

import type { Cell, ParsedTable, Row } from "./parse";

export type ColumnKind = "integer" | "decimal" | "boolean" | "date" | "categorical" | "identifier" | "text";

export type NumericSummary = {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  stdDev: number;
  sum: number;
  /** Values beyond 1.5 × IQR from the quartiles, capped for display. */
  outliers: number[];
  outlierCount: number;
  histogram: { label: string; from: number; to: number; count: number }[];
};

export type CategorySummary = {
  top: { value: string; count: number; share: number }[];
  distinct: number;
};

export type ColumnProfile = {
  name: string;
  kind: ColumnKind;
  count: number;
  missing: number;
  missingShare: number;
  unique: number;
  uniqueShare: number;
  numeric?: NumericSummary;
  categories?: CategorySummary;
  /** Example values shown in the column table. */
  examples: string[];
  /** Set when a column holds more than one underlying type. */
  mixedTypes?: { kind: string; count: number }[];
};

export type Finding = {
  id: string;
  severity: "critical" | "warning" | "info";
  column?: string;
  title: string;
  detail: string;
};

export type Correlation = { a: string; b: string; r: number };

export type Profile = {
  rows: number;
  totalRows: number;
  sampled: boolean;
  columns: ColumnProfile[];
  findings: Finding[];
  correlations: Correlation[];
  duplicateRows: number;
  completeness: number;
  /** Milliseconds spent profiling — reported rather than invented. */
  elapsedMs: number;
  format: string;
};

const isMissing = (v: Cell) => v === null || v === undefined || v === "";

// Dates people actually store: ISO, US slash, and ISO-with-time.
const DATE_PATTERN = /^(\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2}(:\d{2})?)?|\d{1,2}\/\d{1,2}\/\d{2,4})$/;

function rawKind(value: Cell): ColumnKind | "missing" {
  if (isMissing(value)) return "missing";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "decimal";
  if (DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))) return "date";
  return "text";
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next === undefined ? sorted[base] : sorted[base] + rest * (next - sorted[base]);
}

function formatBound(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs >= 10) return n.toFixed(0);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function summariseNumeric(values: number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);

  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const iqr = p75 - p25;
  const lowFence = p25 - 1.5 * iqr;
  const highFence = p75 + 1.5 * iqr;
  const outliers = iqr > 0 ? sorted.filter((v) => v < lowFence || v > highFence) : [];

  const min = sorted[0];
  const max = sorted[n - 1];

  // A narrow integer range gets one bar per value. Sturges' rule on ten
  // distinct integers asks for eleven bins, and the spare bin renders as a
  // gap in the distribution that is an artefact of the binning rather than
  // anything in the data.
  const span = max - min;
  const allIntegers = sorted.every(Number.isInteger);
  const discrete = allIntegers && span > 0 && span + 1 <= 20;

  // Otherwise Sturges, clamped — enough bars to show a shape, few enough to read.
  const binCount = discrete ? span + 1 : Math.max(4, Math.min(18, Math.ceil(Math.log2(n) + 1)));
  const width = discrete ? 1 : span / binCount || 1;

  const histogram = Array.from({ length: binCount }, (_, i) => {
    const from = min + i * width;
    const to = discrete ? from : i === binCount - 1 ? max : from + width;
    return { label: formatBound(from), from, to, count: 0 };
  });

  for (const value of sorted) {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    histogram[index].count++;
  }

  return {
    min,
    max,
    mean,
    median: quantile(sorted, 0.5),
    p25,
    p75,
    stdDev: Math.sqrt(variance),
    sum,
    outliers: outliers.slice(0, 12),
    outlierCount: outliers.length,
    histogram,
  };
}

function profileColumn(name: string, values: Cell[]): ColumnProfile {
  const total = values.length;
  const kinds = new Map<string, number>();
  const present: Cell[] = [];

  for (const value of values) {
    const kind = rawKind(value);
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    if (kind !== "missing") present.push(value);
  }

  const missing = kinds.get("missing") ?? 0;
  const count = present.length;

  const frequency = new Map<string, number>();
  for (const value of present) {
    const key = String(value);
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  const unique = frequency.size;

  const typed = [...kinds.entries()].filter(([kind]) => kind !== "missing");
  const dominant = typed.sort((a, b) => b[1] - a[1])[0]?.[0] as ColumnKind | undefined;

  let kind: ColumnKind = dominant ?? "text";

  const numbers = present.filter((v): v is number => typeof v === "number");
  const numericShare = count > 0 ? numbers.length / count : 0;

  // Near-unique rather than exactly unique: a handful of duplicate rows is
  // the normal state of an export, and an order id is still an order id when
  // three rows repeat.
  const uniqueShare = count > 0 ? unique / count : 0;
  const looksLikeKey = count > 20 && uniqueShare >= 0.98;

  if (numericShare > 0.9 && numbers.length > 0) {
    kind = numbers.every(Number.isInteger) ? "integer" : "decimal";
    // A near-distinct integer column is a key, not a measurement — averaging
    // a row id produces a number that means nothing.
    if (kind === "integer" && looksLikeKey) kind = "identifier";
  } else if (kind === "text") {
    if (looksLikeKey) kind = "identifier";
    else if (unique <= Math.max(25, count * 0.05)) kind = "categorical";
  }

  const profile: ColumnProfile = {
    name,
    kind,
    count,
    missing,
    missingShare: total > 0 ? missing / total : 0,
    unique,
    uniqueShare,
    examples: [...frequency.keys()].slice(0, 3).map((v) => (v.length > 40 ? `${v.slice(0, 37)}…` : v)),
  };

  if ((kind === "integer" || kind === "decimal") && numbers.length > 1) {
    profile.numeric = summariseNumeric(numbers);
  }

  if (kind === "categorical" || kind === "boolean" || kind === "text") {
    const top = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, n]) => ({
        value: value.length > 32 ? `${value.slice(0, 29)}…` : value,
        count: n,
        share: count > 0 ? n / count : 0,
      }));
    profile.categories = { top, distinct: unique };
  }

  // A column that is 98% numeric with a stray "unknown" is a real problem
  // downstream, so surface the split rather than silently coercing. But
  // integer and decimal are one type as far as any store is concerned — a
  // price column holding both 7 and 7.5 is not a defect, and flagging it
  // buries the conflicts that actually matter.
  const conflicting = new Map<string, number>();
  for (const [k, n] of typed) {
    const family = k === "integer" || k === "decimal" ? "number" : k;
    conflicting.set(family, (conflicting.get(family) ?? 0) + n);
  }
  if (conflicting.size > 1) {
    profile.mixedTypes = [...conflicting.entries()].map(([k, n]) => ({ kind: k, count: n }));
  }

  return profile;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return NaN;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }

  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator === 0 ? NaN : covariance / denominator;
}

function correlate(rows: Row[], columns: ColumnProfile[]): Correlation[] {
  const numeric = columns.filter((c) => c.numeric && c.kind !== "identifier").slice(0, 14);
  const out: Correlation[] = [];

  for (let i = 0; i < numeric.length; i++) {
    for (let j = i + 1; j < numeric.length; j++) {
      const a: number[] = [];
      const b: number[] = [];

      // Pairwise-complete: a row missing either value tells us nothing about
      // how the two move together, so it is dropped from this pair only.
      for (const row of rows) {
        const va = row[numeric[i].name];
        const vb = row[numeric[j].name];
        if (typeof va === "number" && typeof vb === "number") {
          a.push(va);
          b.push(vb);
        }
      }

      const r = pearson(a, b);
      if (Number.isFinite(r)) out.push({ a: numeric[i].name, b: numeric[j].name, r });
    }
  }

  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

function countDuplicates(rows: Row[], columns: string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const key = columns.map((c) => String(row[c] ?? "")).join(" ");
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  }
  return duplicates;
}

function findIssues(profile: Omit<Profile, "findings">, columns: ColumnProfile[]): Finding[] {
  const findings: Finding[] = [];
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  if (profile.duplicateRows > 0) {
    const share = profile.duplicateRows / profile.rows;
    findings.push({
      id: "duplicate-rows",
      severity: share > 0.05 ? "critical" : "warning",
      title: `${profile.duplicateRows.toLocaleString()} duplicate rows`,
      detail: `${pct(share)} of the rows repeat a row that appeared earlier, across every column. Deduplicate before aggregating or every total is inflated.`,
    });
  }

  for (const column of columns) {
    if (column.count === 0) {
      findings.push({
        id: `empty-${column.name}`,
        severity: "critical",
        column: column.name,
        title: `"${column.name}" is entirely empty`,
        detail: "Every value is missing. The column carries no information and can be dropped.",
      });
      continue;
    }

    if (column.missingShare >= 0.4) {
      findings.push({
        id: `missing-${column.name}`,
        severity: column.missingShare >= 0.7 ? "critical" : "warning",
        column: column.name,
        title: `"${column.name}" is ${pct(column.missingShare)} missing`,
        detail: `Only ${column.count.toLocaleString()} of ${profile.rows.toLocaleString()} rows carry a value. Any average over this column describes the rows that happened to be filled in, not the dataset.`,
      });
    } else if (column.missingShare > 0.05) {
      findings.push({
        id: `missing-${column.name}`,
        severity: "info",
        column: column.name,
        title: `"${column.name}" has ${pct(column.missingShare)} missing`,
        detail: `${column.missing.toLocaleString()} blank values — worth deciding whether to impute or exclude.`,
      });
    }

    if (column.unique === 1 && column.count > 1) {
      findings.push({
        id: `constant-${column.name}`,
        severity: "warning",
        column: column.name,
        title: `"${column.name}" never varies`,
        detail: `Every row holds "${column.examples[0]}". A constant column cannot explain anything and adds noise to a model.`,
      });
    }

    if (column.mixedTypes && column.mixedTypes.length > 1) {
      const described = column.mixedTypes.map((t) => `${t.count.toLocaleString()} ${t.kind}`).join(", ");
      findings.push({
        id: `mixed-${column.name}`,
        severity: "warning",
        column: column.name,
        title: `"${column.name}" mixes types`,
        detail: `${described}. Loading this into a typed store will either fail or silently coerce.`,
      });
    }

    if (column.numeric && column.numeric.outlierCount > 0) {
      const share = column.numeric.outlierCount / column.count;
      if (share > 0.005) {
        findings.push({
          id: `outliers-${column.name}`,
          severity: share > 0.1 ? "warning" : "info",
          column: column.name,
          title: `"${column.name}" has ${column.numeric.outlierCount.toLocaleString()} outliers`,
          detail: `Values outside 1.5 × IQR of the quartiles (${formatBound(column.numeric.p25)} – ${formatBound(column.numeric.p75)}). The extremes reach ${formatBound(column.numeric.min)} and ${formatBound(column.numeric.max)}.`,
        });
      }
    }

    if (column.kind === "categorical" && column.unique > 50) {
      findings.push({
        id: `cardinality-${column.name}`,
        severity: "info",
        column: column.name,
        title: `"${column.name}" has ${column.unique.toLocaleString()} distinct values`,
        detail: "High cardinality — one-hot encoding this would add a column per value. Group the long tail first.",
      });
    }
  }

  for (const { a, b, r } of profile.correlations.slice(0, 3)) {
    if (Math.abs(r) >= 0.9) {
      findings.push({
        id: `collinear-${a}-${b}`,
        severity: "warning",
        title: `"${a}" and "${b}" move together (r = ${r.toFixed(2)})`,
        detail: "Near-perfect correlation usually means one column is derived from the other. Keeping both double-counts the same signal.",
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return findings.sort((x, y) => order[x.severity] - order[y.severity]);
}

export function profileTable(table: ParsedTable): Profile {
  const started = performance.now();

  const columns = table.columns.map((name) =>
    profileColumn(
      name,
      table.rows.map((row) => row[name]),
    ),
  );

  const correlations = correlate(table.rows, columns);
  const duplicateRows = countDuplicates(table.rows, table.columns);

  const cells = table.rows.length * table.columns.length;
  const filled = columns.reduce((acc, c) => acc + c.count, 0);

  const base = {
    rows: table.rows.length,
    totalRows: table.totalRows,
    sampled: table.sampled,
    columns,
    correlations,
    duplicateRows,
    completeness: cells > 0 ? filled / cells : 1,
    elapsedMs: 0,
    format: table.format.toUpperCase(),
  };

  const findings = findIssues(base, columns);

  return { ...base, findings, elapsedMs: Math.round(performance.now() - started) };
}
