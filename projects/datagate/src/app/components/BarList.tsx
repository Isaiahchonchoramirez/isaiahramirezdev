import { motion } from "motion/react";

export type BarDatum = { name: string; value: number; color: string; note?: string };

/**
 * A horizontal bar list.
 *
 * This replaced a Recharts <BarChart layout="vertical">: passing per-bar
 * <Cell> colours produced empty <g class="recharts-bar-rectangle"> nodes
 * under React 19, so the chart drew its axes and no data. These bars are a
 * dozen divs, they animate through the same motion runtime as the rest of the
 * page, and dropping the dependency took roughly 300 KB off the bundle.
 */
export function BarList({
  data,
  max,
  format = (v) => v.toLocaleString(),
}: {
  data: BarDatum[];
  /** Upper bound of the scale. Defaults to the largest value present. */
  max?: number;
  format?: (value: number) => string;
}) {
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-2">
      {data.map((datum, i) => (
        <li key={datum.name} className="flex items-center gap-3">
          <span className="text-[#8ba7c7] text-xs w-28 flex-shrink-0 text-right truncate" title={datum.name}>
            {datum.name}
          </span>

          <span className="flex-1 h-5 rounded-md overflow-hidden relative" style={{ background: "rgba(0,217,255,0.07)" }}>
            <motion.span
              className="block h-full rounded-md"
              style={{ background: datum.color, boxShadow: `0 0 10px ${datum.color}55` }}
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(0.8, (datum.value / ceiling) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
            />
          </span>

          <span className="text-[#e0f4ff] text-xs tabular-nums w-20 flex-shrink-0 text-right">
            {format(datum.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
