import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Hash, Type, ToggleLeft, Calendar, Tags, Fingerprint } from "lucide-react";
import type { ColumnProfile } from "../lib/profile";

const KIND_STYLE: Record<string, { label: string; color: string; icon: typeof Hash }> = {
  integer: { label: "integer", color: "#00d9ff", icon: Hash },
  decimal: { label: "decimal", color: "#00d9ff", icon: Hash },
  boolean: { label: "boolean", color: "#10b981", icon: ToggleLeft },
  date: { label: "date", color: "#f59e0b", icon: Calendar },
  categorical: { label: "category", color: "#7c3aed", icon: Tags },
  identifier: { label: "identifier", color: "#ec4899", icon: Fingerprint },
  text: { label: "text", color: "#8ba7c7", icon: Type },
};

const number = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Number.isInteger(n)) return n.toLocaleString();
  if (abs < 0.01 && abs > 0) return n.toExponential(2);
  return n.toFixed(2);
};

/** The distribution bars under an expanded numeric column. */
function Histogram({ column }: { column: ColumnProfile }) {
  const histogram = column.numeric!.histogram;
  const peak = Math.max(...histogram.map((b) => b.count), 1);

  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {histogram.map((bin, i) => (
          <div key={i} className="flex-1 group/bar relative flex items-end h-full">
            <motion.div
              className="w-full rounded-t"
              style={{ backgroundImage: "linear-gradient(to top, #00d9ff, #7c3aed)" }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(2, (bin.count / peak) * 100)}%` }}
              transition={{ duration: 0.4, delay: i * 0.02 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block whitespace-nowrap rounded-md px-2 py-1 text-xs z-10"
              style={{ background: "rgba(10,25,41,0.97)", border: "1px solid rgba(0,217,255,0.35)", color: "#e0f4ff" }}>
              {bin.from === bin.to ? number(bin.from) : `${number(bin.from)} – ${number(bin.to)}`} ·{" "}
              {bin.count.toLocaleString()} rows
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[#8ba7c7] mt-1.5">
        <span>{number(column.numeric!.min)}</span>
        <span>{number(column.numeric!.max)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(0,217,255,0.06)", border: "1px solid rgba(0,217,255,0.15)" }}>
      <div className="text-[#8ba7c7] text-xs uppercase tracking-wider">{label}</div>
      <div className="text-[#e0f4ff] tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function ColumnRow({ column }: { column: ColumnProfile }) {
  const [open, setOpen] = useState(false);
  const style = KIND_STYLE[column.kind] ?? KIND_STYLE.text;
  const Icon = style.icon;
  const filled = 1 - column.missingShare;

  return (
    <div style={{ borderTop: "1px solid rgba(0,217,255,0.12)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#00d9ff]/5 transition-colors"
        aria-expanded={open}
      >
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 text-[#8ba7c7] transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />

        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: style.color }} />

        <span className="text-[#e0f4ff] truncate min-w-0 flex-1">{column.name}</span>

        <span
          className="hidden sm:inline flex-shrink-0 px-2 py-0.5 rounded-full text-xs"
          style={{ color: style.color, background: `${style.color}18`, border: `1px solid ${style.color}40` }}
        >
          {style.label}
        </span>

        {/* Fill bar: how much of the column actually holds a value. */}
        <span className="hidden md:flex items-center gap-2 flex-shrink-0 w-32">
          <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,217,255,0.12)" }}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${filled * 100}%`,
                background: filled > 0.95 ? "#10b981" : filled > 0.6 ? "#f59e0b" : "#ef4444",
              }}
            />
          </span>
          <span className="text-[#8ba7c7] text-xs tabular-nums w-9 text-right">{(filled * 100).toFixed(0)}%</span>
        </span>

        <span className="text-[#8ba7c7] text-xs tabular-nums flex-shrink-0 w-20 text-right">
          {column.unique.toLocaleString()} distinct
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 space-y-4" style={{ background: "rgba(0,8,20,0.5)" }}>
              {column.numeric && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    <Stat label="min" value={number(column.numeric.min)} />
                    <Stat label="p25" value={number(column.numeric.p25)} />
                    <Stat label="median" value={number(column.numeric.median)} />
                    <Stat label="p75" value={number(column.numeric.p75)} />
                    <Stat label="max" value={number(column.numeric.max)} />
                    <Stat label="mean" value={number(column.numeric.mean)} />
                    <Stat label="std dev" value={number(column.numeric.stdDev)} />
                    <Stat label="sum" value={number(column.numeric.sum)} />
                  </div>
                  <Histogram column={column} />
                  {column.numeric.outlierCount > 0 && (
                    <p className="text-[#f59e0b] text-sm">
                      {column.numeric.outlierCount.toLocaleString()} values sit outside 1.5 × IQR
                      {column.numeric.outliers.length > 0 && (
                        <span className="text-[#8ba7c7]">
                          {" "}— e.g. {column.numeric.outliers.slice(0, 5).map(number).join(", ")}
                        </span>
                      )}
                    </p>
                  )}
                </>
              )}

              {column.categories && (
                <div className="space-y-1.5">
                  {column.categories.top.map((entry) => (
                    <div key={entry.value} className="flex items-center gap-3">
                      <span className="text-[#e0f4ff] text-sm w-40 truncate flex-shrink-0" title={entry.value}>
                        {entry.value}
                      </span>
                      <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,217,255,0.1)" }}>
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ backgroundImage: "linear-gradient(to right, #7c3aed, #ec4899)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.share * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </span>
                      <span className="text-[#8ba7c7] text-xs tabular-nums w-28 text-right flex-shrink-0">
                        {entry.count.toLocaleString()} · {(entry.share * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {column.categories.distinct > column.categories.top.length && (
                    <p className="text-[#8ba7c7] text-xs pt-1">
                      + {(column.categories.distinct - column.categories.top.length).toLocaleString()} more distinct values
                    </p>
                  )}
                </div>
              )}

              {!column.numeric && !column.categories && column.examples.length > 0 && (
                <p className="text-[#8ba7c7] text-sm">
                  Sample values: <span className="text-[#e0f4ff]">{column.examples.join(" · ")}</span>
                </p>
              )}

              {column.mixedTypes && (
                <p className="text-[#f59e0b] text-sm">
                  Mixed types — {column.mixedTypes.map((t) => `${t.count.toLocaleString()} ${t.kind}`).join(", ")}
                </p>
              )}

              <p className="text-[#8ba7c7] text-xs">
                {column.count.toLocaleString()} values · {column.missing.toLocaleString()} missing ·{" "}
                {(column.uniqueShare * 100).toFixed(1)}% of present values are unique
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ColumnTable({ columns }: { columns: ColumnProfile[] }) {
  const [query, setQuery] = useState("");
  const visible = query
    ? columns.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : columns;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,217,255,0.2)", background: "rgba(10,25,41,0.4)" }}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: "rgba(0,217,255,0.05)" }}>
        <h3 className="text-[#e0f4ff]">Columns</h3>
        <span className="text-[#8ba7c7] text-sm">{columns.length} profiled</span>
        <div className="flex-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter columns…"
          className="px-3 py-1.5 rounded-lg text-sm text-[#e0f4ff] placeholder:text-[#8ba7c7]/60 outline-none focus:border-[#00d9ff]/60 transition-colors"
          style={{ background: "rgba(0,8,20,0.6)", border: "1px solid rgba(0,217,255,0.25)" }}
        />
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-[#8ba7c7]">No column matches "{query}".</p>
      ) : (
        visible.map((column) => <ColumnRow key={column.name} column={column} />)
      )}
    </div>
  );
}
