import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertOctagon, AlertTriangle, Info, FileJson, FileText, Download,
  Rows3, Columns3, CircleCheck, Copy, Timer, X,
} from "lucide-react";

import { GlassCard } from "./GlassCard";
import { ColumnTable } from "./ColumnTable";
import { CorrelationMatrix } from "./CorrelationMatrix";
import { BarList } from "./BarList";
import type { ParsedTable } from "../lib/parse";
import type { Profile } from "../lib/profile";
import { download, toCleanedCSV, toJSON, toMarkdown } from "../lib/report";

const SEVERITY = {
  critical: { icon: AlertOctagon, color: "#ef4444", label: "Critical" },
  warning: { icon: AlertTriangle, color: "#f59e0b", label: "Warning" },
  info: { icon: Info, color: "#00d9ff", label: "Note" },
} as const;

const shorten = (name: string) => (name.length > 16 ? `${name.slice(0, 15)}…` : name);

function Tile({
  icon: Icon, label, value, note, color,
}: {
  icon: typeof Rows3; label: string; value: string; note: string; color: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#8ba7c7] text-sm">{label}</p>
          <motion.p
            className="text-[#e0f4ff] tabular-nums truncate"
            style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {value}
          </motion.p>
          <p className="text-sm mt-0.5" style={{ color }}>{note}</p>
        </div>
        <div className="p-3 rounded-xl flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}45` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </GlassCard>
  );
}

/** First rows of the file, so the profile is checkable against the source. */
function DataPreview({ table }: { table: ParsedTable }) {
  const rows = table.rows.slice(0, 8);
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(0,217,255,0.18)" }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column}
                className="text-left px-3 py-2 text-[#00d9ff] whitespace-nowrap font-normal"
                style={{ background: "rgba(0,217,255,0.08)", borderBottom: "1px solid rgba(0,217,255,0.22)" }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 ? "rgba(0,8,20,0.4)" : "transparent" }}>
              {table.columns.map((column) => {
                const value = row[column];
                return (
                  <td key={column} className="px-3 py-1.5 whitespace-nowrap max-w-[16rem] truncate"
                    style={{ color: value === null ? "#8ba7c7" : "#e0f4ff", fontStyle: value === null ? "italic" : "normal" }}>
                    {value === null ? "null" : String(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScanResults({
  table, profile, filename, onClear,
}: {
  table: ParsedTable; profile: Profile; filename: string; onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const critical = profile.findings.filter((f) => f.severity === "critical").length;
  const warnings = profile.findings.filter((f) => f.severity === "warning").length;

  // Distinct-value counts per column: the fastest read on which columns carry
  // signal and which are constants or free text.
  const cardinality = useMemo(
    () =>
      profile.columns
        .map((c) => ({
          name: shorten(c.name),
          value: c.unique,
          // Identifiers and categories are the two shapes worth spotting at a
          // glance, so they get their own hue rather than one uniform bar.
          color: c.kind === "identifier" ? "#ec4899" : c.kind === "categorical" ? "#7c3aed" : "#00d9ff",
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    [profile.columns],
  );

  const missingness = useMemo(
    () =>
      profile.columns
        .filter((c) => c.missing > 0)
        .map((c) => {
          const share = Number((c.missingShare * 100).toFixed(1));
          return {
            name: shorten(c.name),
            value: share,
            color: share > 40 ? "#ef4444" : share > 10 ? "#f59e0b" : "#00d9ff",
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    [profile.columns],
  );

  const base = filename.replace(/\.[^.]+$/, "") || "dataset";

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(toMarkdown(profile, filename));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h3 className="text-[#e0f4ff] truncate" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{filename}</h3>
          <p className="text-[#8ba7c7] text-sm">
            {profile.format}
            {profile.sampled
              ? ` · ${profile.rows.toLocaleString()} of ${profile.totalRows.toLocaleString()} rows profiled`
              : ` · ${profile.rows.toLocaleString()} rows`}
            {" · "}{profile.columns.length} columns
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#8ba7c7] hover:text-[#e0f4ff] transition-colors"
          style={{ border: "1px solid rgba(139,167,199,0.3)" }}
        >
          <X className="w-4 h-4" /> Close scan
        </button>
      </div>

      {profile.sampled && (
        <p className="text-sm px-4 py-2.5 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          This file is larger than the 50,000-row in-browser limit, so every figure below describes the first{" "}
          {profile.rows.toLocaleString()} rows rather than all {profile.totalRows.toLocaleString()}.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          icon={Rows3} label="Rows profiled" color="#00d9ff"
          value={profile.rows.toLocaleString()}
          note={profile.duplicateRows > 0 ? `${profile.duplicateRows.toLocaleString()} duplicated` : "no duplicates"}
        />
        <Tile
          icon={Columns3} label="Columns" color="#7c3aed"
          value={String(profile.columns.length)}
          note={`${profile.columns.filter((c) => c.numeric).length} numeric · ${profile.columns.filter((c) => c.kind === "categorical").length} categorical`}
        />
        <Tile
          icon={CircleCheck} label="Completeness" color={profile.completeness > 0.95 ? "#10b981" : "#f59e0b"}
          value={`${(profile.completeness * 100).toFixed(1)}%`}
          note="of cells hold a value"
        />
        <Tile
          icon={Timer} label="Scan time" color="#ec4899"
          value={`${profile.elapsedMs} ms`}
          note={critical + warnings > 0 ? `${critical} critical · ${warnings} warnings` : "no issues found"}
        />
      </div>

      <GlassCard hover={false}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="text-[#e0f4ff]">Findings</h3>
          <span className="text-[#8ba7c7] text-sm">
            {profile.findings.length === 0 ? "nothing flagged" : `${profile.findings.length} raised`}
          </span>
        </div>

        {profile.findings.length === 0 ? (
          <p className="text-[#8ba7c7]">
            No duplicate rows, no empty or constant columns, no mixed types, and no column is more than 5% missing.
            The file is structurally clean.
          </p>
        ) : (
          <ul className="space-y-3">
            {profile.findings.map((finding) => {
              const severity = SEVERITY[finding.severity];
              const Icon = severity.icon;
              return (
                <li
                  key={finding.id}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ background: `${severity.color}0d`, border: `1px solid ${severity.color}33` }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: severity.color }} />
                  <div className="min-w-0">
                    <p className="text-[#e0f4ff]">
                      <span className="text-xs uppercase tracking-wider mr-2" style={{ color: severity.color }}>
                        {severity.label}
                      </span>
                      {finding.title}
                    </p>
                    <p className="text-[#8ba7c7] text-sm mt-1">{finding.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      <ColumnTable columns={profile.columns} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hover={false}>
          <h3 className="text-[#e0f4ff] mb-1">Distinct values per column</h3>
          <p className="text-[#8ba7c7] text-sm mb-4">Identifiers sit at the top; a bar of 1 is a constant.</p>
          <BarList data={cardinality} />
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="text-[#e0f4ff] mb-1">Missing values</h3>
          <p className="text-[#8ba7c7] text-sm mb-4">
            {missingness.length === 0 ? "Nothing is missing anywhere in this file." : "Percentage of rows with no value."}
          </p>
          {missingness.length === 0 ? (
            <div className="flex items-center justify-center h-[220px]">
              <CircleCheck className="w-16 h-16" style={{ color: "#10b981", filter: "drop-shadow(0 0 14px #10b981)" }} />
            </div>
          ) : (
            // Fixed 0–100 scale: a column that is 3% missing should look
            // nearly full, not fill the row because it happens to be the worst.
            <BarList data={missingness} max={100} format={(v) => `${v}%`} />
          )}
        </GlassCard>
      </div>

      <GlassCard hover={false}>
        <h3 className="text-[#e0f4ff] mb-1">Relationships between numeric columns</h3>
        <p className="text-[#8ba7c7] text-sm mb-4">Pearson correlation, computed on this file.</p>
        <CorrelationMatrix correlations={profile.correlations} />
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="text-[#e0f4ff] mb-1">First rows</h3>
        <p className="text-[#8ba7c7] text-sm mb-4">The parsed values, so you can check the profile against the source.</p>
        <DataPreview table={table} />
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="text-[#e0f4ff] mb-1">Take it with you</h3>
        <p className="text-[#8ba7c7] text-sm mb-4">
          Everything above was computed in this tab. Nothing was uploaded anywhere.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => download(toMarkdown(profile, filename), `${base}-report.md`, "text/markdown")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors"
            style={{ border: "1px solid rgba(0,217,255,0.5)" }}
          >
            <FileText className="w-4 h-4" /> Markdown report
          </button>
          <button
            onClick={() => download(toJSON(profile, filename), `${base}-profile.json`, "application/json")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors"
            style={{ border: "1px solid rgba(124,58,237,0.5)" }}
          >
            <FileJson className="w-4 h-4" /> JSON profile
          </button>
          <button
            onClick={() => download(toCleanedCSV(table, profile), `${base}-cleaned.csv`, "text/csv")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[#ec4899] hover:bg-[#ec4899]/10 transition-colors"
            style={{ border: "1px solid rgba(236,72,153,0.5)" }}
          >
            <Download className="w-4 h-4" /> Cleaned CSV
          </button>
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[#8ba7c7] hover:text-[#e0f4ff] transition-colors"
            style={{ border: "1px solid rgba(139,167,199,0.35)" }}
          >
            <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy report"}
          </button>
        </div>
        <p className="text-[#8ba7c7] text-xs mt-3">
          The cleaned CSV drops duplicate rows and any column that is empty or constant — each removal is one the
          findings list above explains.
        </p>
      </GlassCard>
    </div>
  );
}
