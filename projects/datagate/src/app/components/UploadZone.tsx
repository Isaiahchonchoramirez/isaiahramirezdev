import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { Upload, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ParseError, parseFile, parseText, type ParsedTable } from "../lib/parse";
import { profileTable, type Profile } from "../lib/profile";
import { demoCSV } from "../lib/report";

export type Scan = { table: ParsedTable; profile: Profile; filename: string };

const ACCEPT = ".csv,.tsv,.json,.jsonl,.ndjson,.txt,text/csv,application/json,text/plain";
const FORMATS = [
  { label: "CSV", color: "#00d9ff" },
  { label: "TSV", color: "#7c3aed" },
  { label: "JSON", color: "#ec4899" },
  { label: "JSONL", color: "#10b981" },
];

export function UploadZone({ onScan }: { onScan: (scan: Scan) => void }) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (load: () => Promise<{ table: ParsedTable; filename: string }>) => {
      setBusy(true);
      setError(null);
      try {
        const { table, filename } = await load();
        // Yield before profiling so the spinner actually paints on a large
        // file, rather than the tab appearing to hang. This is a timeout and
        // not requestAnimationFrame on purpose: rAF never fires in a
        // backgrounded tab, so a scan started and then tabbed away from would
        // wedge the button in its disabled state forever.
        await new Promise((resolve) => setTimeout(resolve, 0));
        onScan({ table, profile: profileTable(table), filename });
      } catch (cause) {
        setError(
          cause instanceof ParseError ? cause.message : `Could not read that file — ${(cause as Error).message}`,
        );
      } finally {
        setBusy(false);
      }
    },
    [onScan],
  );

  const handleFile = useCallback(
    (file: File) => run(async () => ({ table: await parseFile(file), filename: file.name })),
    [run],
  );

  const handleDemo = useCallback(
    () => run(async () => ({ table: parseText(demoCSV(), "orders.csv"), filename: "orders-demo.csv" })),
    [run],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-4">
      <GlassCard hover={false}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-busy={busy}
          className="border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#00d9ff]"
          style={{
            borderColor: dragging ? "rgba(0,217,255,0.9)" : "rgba(0,217,255,0.3)",
            background: dragging ? "rgba(0,217,255,0.08)" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          {busy ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2
                className="w-14 h-14 text-[#00d9ff] animate-spin"
                style={{ filter: "drop-shadow(0 0 10px #00d9ff)" }}
              />
              <h3 className="text-[#e0f4ff]">Profiling…</h3>
              <p className="text-[#8ba7c7]">Parsing, typing every column, and measuring the distributions.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <Upload className="w-14 h-14 text-[#00d9ff]" />
              <h3 className="text-[#e0f4ff]">{dragging ? "Release to scan" : "Drop a file to open the gate"}</h3>
              <p className="text-[#8ba7c7] max-w-md">
                CSV, TSV, JSON or JSONL. It is read in this tab and never leaves your machine — there is no upload.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {FORMATS.map(({ label, color }) => (
                  <span
                    key={label}
                    className="px-3.5 py-1.5 rounded-full text-sm"
                    style={{ color, background: `${color}1a`, border: `1px solid ${color}4d` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 mt-4 p-3 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }}
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
            <p className="text-[#e0f4ff] text-sm">{error}</p>
          </motion.div>
        )}
      </GlassCard>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
        <button
          onClick={handleDemo}
          disabled={busy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors disabled:opacity-50"
          style={{ border: "1px solid rgba(124,58,237,0.5)" }}
        >
          <Sparkles className="w-4 h-4" /> Scan a sample dataset instead
        </button>
        <p className="text-[#8ba7c7] text-sm">900 orders with real duplicates, gaps and a genuine correlation to find.</p>
      </div>
    </div>
  );
}
