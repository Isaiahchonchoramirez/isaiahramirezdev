import { useMemo, useState } from "react";
import type { Correlation } from "../lib/profile";

// A diverging scale, not the usual red-to-green: positive correlations run
// toward the interface's cyan and negative ones toward amber, a pair that
// still separates for the ~8% of men with red-green colour blindness. The
// number is printed in every cell as well, so colour is never the only signal.
function cellColor(r: number): string {
  const strength = Math.min(1, Math.abs(r));
  const alpha = 0.08 + strength * 0.72;
  return r >= 0 ? `rgba(0, 217, 255, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;
}

export function CorrelationMatrix({ correlations }: { correlations: Correlation[] }) {
  const [hover, setHover] = useState<Correlation | null>(null);

  const { labels, lookup } = useMemo(() => {
    const names = [...new Set(correlations.flatMap((c) => [c.a, c.b]))];
    const map = new Map<string, number>();
    for (const c of correlations) {
      map.set(`${c.a}|${c.b}`, c.r);
      map.set(`${c.b}|${c.a}`, c.r);
    }
    return { labels: names, lookup: map };
  }, [correlations]);

  if (labels.length < 2) {
    return (
      <p className="text-[#8ba7c7] text-sm">
        A correlation needs at least two numeric columns with values in the same rows. This dataset has{" "}
        {labels.length === 1 ? "only one" : "none"}.
      </p>
    );
  }

  const strongest = correlations.filter((c) => Math.abs(c.r) >= 0.5).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th />
              {labels.map((label) => (
                <th key={label} className="p-0 align-bottom">
                  {/* Rotated so long column names do not force a 3000px table. */}
                  <div
                    className="text-[#8ba7c7] text-xs whitespace-nowrap"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 92 }}
                    title={label}
                  >
                    {label.length > 16 ? `${label.slice(0, 15)}…` : label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel) => (
              <tr key={rowLabel}>
                <th
                  className="text-[#8ba7c7] text-xs text-right pr-2 font-normal whitespace-nowrap max-w-[9rem] truncate"
                  title={rowLabel}
                >
                  {rowLabel.length > 18 ? `${rowLabel.slice(0, 17)}…` : rowLabel}
                </th>
                {labels.map((colLabel) => {
                  const same = rowLabel === colLabel;
                  const r = same ? 1 : lookup.get(`${rowLabel}|${colLabel}`);
                  return (
                    <td
                      key={colLabel}
                      className="w-11 h-11 text-center text-xs tabular-nums rounded cursor-default transition-transform hover:scale-110"
                      style={{
                        background: r === undefined ? "rgba(139,167,199,0.06)" : cellColor(r),
                        color: r !== undefined && Math.abs(r) > 0.55 ? "#00121f" : "#e0f4ff",
                        border: "1px solid rgba(0,217,255,0.12)",
                      }}
                      onMouseEnter={() => !same && r !== undefined && setHover({ a: rowLabel, b: colLabel, r })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {r === undefined ? "" : r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-[#8ba7c7]">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded" style={{ background: cellColor(-1) }} /> −1 inverse
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded" style={{ background: cellColor(0) }} /> 0 none
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded" style={{ background: cellColor(1) }} /> +1 direct
        </span>
        {hover && (
          <span className="text-[#e0f4ff]">
            {hover.a} × {hover.b} = {hover.r.toFixed(3)}
          </span>
        )}
      </div>

      {strongest.length > 0 ? (
        <ul className="space-y-1.5">
          {strongest.map((c) => (
            <li key={`${c.a}-${c.b}`} className="text-sm text-[#8ba7c7]">
              <span className="text-[#e0f4ff]">{c.a}</span> and <span className="text-[#e0f4ff]">{c.b}</span> move{" "}
              {c.r > 0 ? "together" : "inversely"} — r = {c.r.toFixed(3)}, so one explains about{" "}
              {(c.r * c.r * 100).toFixed(0)}% of the other's variance.
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#8ba7c7]">
          No pair reaches |r| ≥ 0.5. These columns vary largely independently of one another.
        </p>
      )}

      <p className="text-xs text-[#8ba7c7]/70">
        Pearson r on pairwise-complete rows. It measures straight-line association only — a strong curve reads as
        nothing here, and a strong r is still not evidence that one column causes the other.
      </p>
    </div>
  );
}
