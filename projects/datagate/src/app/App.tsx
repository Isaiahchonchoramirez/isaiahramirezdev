import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Binary, FileSearch, GitCompareArrows, ShieldAlert, Sigma, FileDown } from "lucide-react";

import { Navbar } from "./components/Navbar";
import { PortalRings } from "./components/PortalRings";
import { GlassCard } from "./components/GlassCard";
import { NeonButton } from "./components/NeonButton";
import { FeatureCard } from "./components/FeatureCard";
import { UploadZone, type Scan } from "./components/UploadZone";
import { ScanResults } from "./components/ScanResults";
import { RelayPanel } from "./components/RelayPanel";

// Six things the engine genuinely does. The first draft advertised stock
// prediction and phone lookups, which no amount of front-end code delivers;
// these are the capabilities you can watch run on your own file.
const CAPABILITIES = [
  {
    icon: FileSearch,
    title: "Deep scan",
    description:
      "Parses CSV, TSV, JSON and JSONL — quoted fields, embedded newlines, ragged rows and all — with no upload and no parsing library.",
    accent: "blue" as const,
  },
  {
    icon: Binary,
    title: "Type inference",
    description:
      "Reads each column to decide what it holds: integer, decimal, boolean, date, category, identifier or free text — and refuses to average an ID.",
    accent: "purple" as const,
  },
  {
    icon: Sigma,
    title: "Distribution stats",
    description:
      "Min, quartiles, median, max, mean, standard deviation and a binned histogram per numeric column; ranked frequencies per categorical one.",
    accent: "pink" as const,
  },
  {
    icon: ShieldAlert,
    title: "Quality audit",
    description:
      "Duplicate rows, empty and constant columns, mixed types, missingness and IQR outliers — each reported with why it matters downstream.",
    accent: "blue" as const,
  },
  {
    icon: GitCompareArrows,
    title: "Relationship discovery",
    description:
      "Pearson correlation across every numeric pair on pairwise-complete rows, ranked by strength, flagging collinear columns.",
    accent: "purple" as const,
  },
  {
    icon: FileDown,
    title: "Report export",
    description:
      "The whole profile out as Markdown or JSON, plus a cleaned CSV with the duplicates and dead columns removed.",
    accent: "pink" as const,
  },
];

const HERO_STATS = [
  { value: "0", label: "Bytes uploaded", color: "#00d9ff" },
  { value: "50k", label: "Rows per scan", color: "#7c3aed" },
  { value: "4", label: "Formats read", color: "#ec4899" },
];

export default function App() {
  const [scan, setScan] = useState<Scan | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleScan = useCallback((next: Scan) => setScan(next), []);

  // Land on the results rather than leaving them below the fold. This has to
  // be an effect rather than a callback: scrolling in the same tick as
  // setScan targets the element's pre-render position, which is the wrong
  // place by two screenfuls once the report actually mounts.
  useEffect(() => {
    if (scan) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scan]);

  // The tab title doubles as a status line once a file is loaded.
  useEffect(() => {
    document.title = scan ? `${scan.filename} — DataGate` : "DataGate — data intelligence in the browser";
  }, [scan]);

  return (
    <div className="min-h-screen bg-[#000814] text-[#e0f4ff] overflow-x-hidden">
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0, 217, 255, 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.15) 0%, transparent 50%)`,
        }}
      />

      <Navbar onNavigate={scrollTo} />

      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-6">
            <motion.div
              className="inline-block px-4 py-2 rounded-full mb-4"
              style={{ backgroundColor: "rgba(0, 217, 255, 0.1)", border: "1px solid rgba(0, 217, 255, 0.3)", color: "#00d9ff" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Data profiling that runs in your tab
            </motion.div>

            <h1 className="text-[#e0f4ff]" style={{ fontSize: "clamp(2.25rem, 6vw, 3.5rem)", fontWeight: 700, lineHeight: 1.1 }}>
              Open the gate to
              <br />
              <span className="bg-gradient-to-r from-[#00d9ff] via-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">
                your own data
              </span>
            </h1>

            <p className="text-[#8ba7c7]" style={{ fontSize: "1.25rem" }}>
              Drop in a file and get a real profile: every column typed, every distribution measured, every duplicate,
              gap and outlier named. Nothing is uploaded — the analysis happens in this browser.
            </p>

            <div className="flex flex-wrap gap-4">
              <NeonButton variant="primary" size="lg" onClick={() => scrollTo("archive")}>
                Open the gate
              </NeonButton>
              <NeonButton variant="secondary" size="lg" onClick={() => scrollTo("intelligence")}>
                What it measures
              </NeonButton>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div className="text-[#8ba7c7] text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <PortalRings />
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 px-6" id="intelligence">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-[#e0f4ff] mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700 }}>
              What the engine measures
            </h2>
            <p className="text-[#8ba7c7] max-w-2xl mx-auto" style={{ fontSize: "1.125rem" }}>
              Six passes over your file, all of them running locally in JavaScript.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((capability, i) => (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <FeatureCard {...capability} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 px-6 bg-gradient-to-b from-transparent to-[#0a1929]/50" id="archive">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-[#e0f4ff] mb-4" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700 }}>
              Upload command center
            </h2>
            <p className="text-[#8ba7c7]" style={{ fontSize: "1.125rem" }}>
              Drag a file in, or scan the sample dataset to see the full report.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <UploadZone onScan={handleScan} />
          </motion.div>
        </div>
      </section>

      <section ref={resultsRef} className="relative py-16 px-6" id="scan">
        <div className="container mx-auto max-w-6xl">
          {scan ? (
            <ScanResults
              table={scan.table}
              profile={scan.profile}
              filename={scan.filename}
              onClear={() => {
                setScan(null);
                scrollTo("archive");
              }}
            />
          ) : (
            <GlassCard hover={false} className="text-center py-14">
              <h3 className="text-[#e0f4ff] mb-3" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                No scan loaded
              </h3>
              <p className="text-[#8ba7c7] max-w-lg mx-auto">
                The report lands here — summary tiles, a finding for every structural problem, an expandable profile
                per column with its distribution, a correlation matrix, and the exports.
              </p>
              <div className="mt-6 flex justify-center">
                <NeonButton variant="primary" onClick={() => scrollTo("archive")}>
                  Pick a file
                </NeonButton>
              </div>
            </GlassCard>
          )}
        </div>
      </section>

      <section className="relative py-20 px-6 bg-gradient-to-b from-[#0a1929]/50 to-transparent" id="relays">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-[#e0f4ff] mb-4" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700 }}>
              External relay
            </h2>
            <p className="text-[#8ba7c7]" style={{ fontSize: "1.125rem" }}>
              The one job the browser cannot do on its own.
            </p>
          </motion.div>

          <RelayPanel />
        </div>
      </section>

      <footer className="relative border-t border-[#00d9ff]/20 py-8 px-6 backdrop-blur-xl bg-[#0a1929]/50">
        <div className="container mx-auto text-center text-[#8ba7c7] space-y-1">
          <p>DataGate — a data profiler that runs where your data already is.</p>
          <p className="text-sm">
            Built by Isaiah Ramirez. Every number on this page is computed from the file you provided; nothing is
            transmitted anywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
