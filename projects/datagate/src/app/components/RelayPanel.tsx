import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Globe, Loader2, RefreshCw, ServerCog, AlertCircle, ExternalLink } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import { RELAY_URL, checkRelay, scanURL, type PageScan, type RelayState } from "../lib/relay";

const SEVERITY_COLOR = { critical: "#ef4444", warning: "#f59e0b", info: "#00d9ff" } as const;

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(0,217,255,0.06)", border: "1px solid rgba(0,217,255,0.16)" }}>
      <div className="text-[#8ba7c7] text-xs uppercase tracking-wider">{label}</div>
      <div className="text-[#e0f4ff] tabular-nums" style={{ fontSize: "1.25rem", fontWeight: 600 }}>{value}</div>
      {hint && <div className="text-[#8ba7c7] text-xs mt-0.5">{hint}</div>}
    </div>
  );
}

function PageReport({ scan }: { scan: PageScan }) {
  return (
    <div className="space-y-5">
      <div>
        <a
          href={scan.finalUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[#00d9ff] hover:underline inline-flex items-center gap-1.5 break-all"
        >
          {scan.finalUrl} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
        </a>
        <p className="text-[#e0f4ff] mt-1">{scan.title ?? "(no title element)"}</p>
        {scan.description && <p className="text-[#8ba7c7] text-sm mt-1">{scan.description}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Metric label="Status" value={String(scan.status)} />
        <Metric label="Fetched in" value={`${scan.elapsedMs} ms`} />
        <Metric label="HTML size" value={`${(scan.bytes / 1024).toFixed(0)} KB`} />
        <Metric label="Links" value={String(scan.links.internal + scan.links.external)} hint={`${scan.links.internal} internal · ${scan.links.external} external`} />
        <Metric label="Images" value={String(scan.images.total)} hint={`${scan.images.missingAlt} without alt`} />
        <Metric label="Assets" value={String(scan.scripts + scan.stylesheets)} hint={`${scan.scripts} js · ${scan.stylesheets} css`} />
      </div>

      {scan.headings.length > 0 && (
        <div>
          <h4 className="text-[#e0f4ff] mb-2">Heading outline</h4>
          <ul className="space-y-1">
            {scan.headings.slice(0, 14).map((heading, i) => (
              <li key={i} className="text-sm text-[#8ba7c7]" style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}>
                <span className="text-[#7c3aed] mr-2">h{heading.level}</span>
                {heading.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scan.tables.length > 0 && (
        <div>
          <h4 className="text-[#e0f4ff] mb-2">Tabular data found</h4>
          <ul className="space-y-1 text-sm text-[#8ba7c7]">
            {scan.tables.map((table, i) => (
              <li key={i}>
                {table.caption ?? `Table ${i + 1}`} — {table.rows} rows × {table.columns} columns
              </li>
            ))}
          </ul>
        </div>
      )}

      {scan.jsonLdTypes.length > 0 && (
        <p className="text-sm text-[#8ba7c7]">
          Structured data: <span className="text-[#e0f4ff]">{scan.jsonLdTypes.join(", ")}</span>
        </p>
      )}

      {scan.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[#e0f4ff]">Findings</h4>
          {scan.findings.map((finding, i) => (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{
                background: `${SEVERITY_COLOR[finding.severity]}0d`,
                border: `1px solid ${SEVERITY_COLOR[finding.severity]}33`,
              }}
            >
              <p className="text-[#e0f4ff] text-sm">
                <span className="text-xs uppercase tracking-wider mr-2" style={{ color: SEVERITY_COLOR[finding.severity] }}>
                  {finding.severity}
                </span>
                {finding.title}
              </p>
              <p className="text-[#8ba7c7] text-sm mt-1">{finding.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RelayPanel() {
  const [state, setState] = useState<RelayState>("checking");
  const [url, setUrl] = useState("");
  const [scan, setScan] = useState<PageScan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const probe = useCallback(async () => {
    setState("checking");
    setState((await checkRelay()) ? "online" : "offline");
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;

    setBusy(true);
    setError(null);
    try {
      setScan(await scanURL(url.trim()));
      setState("online");
    } catch (cause) {
      const message = (cause as Error).message;
      // A failed fetch here almost always means the relay is not running, not
      // that the target site is down — say which.
      setError(
        /fetch|network|abort/i.test(message)
          ? "The relay did not answer. Start it with `npm run relay` and try again."
          : message,
      );
      if (/fetch|network/i.test(message)) setState("offline");
    } finally {
      setBusy(false);
    }
  };

  const badge = {
    checking: { color: "#8ba7c7", label: "Checking…" },
    online: { color: "#10b981", label: "Connected" },
    offline: { color: "#f59e0b", label: "Not running" },
  }[state];

  return (
    <GlassCard hover={false}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ background: "rgba(0,217,255,0.1)", border: "1px solid rgba(0,217,255,0.3)" }}>
          <ServerCog className="w-6 h-6 text-[#00d9ff]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[#e0f4ff]">Web relay</h3>
          <p className="text-[#8ba7c7] text-sm break-all">{RELAY_URL}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: badge.color, boxShadow: `0 0 8px ${badge.color}` }}
            animate={state === "checking" ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
          <span style={{ color: badge.color }}>{badge.label}</span>
          <button
            onClick={probe}
            className="p-1.5 rounded-lg text-[#8ba7c7] hover:text-[#00d9ff] transition-colors"
            aria-label="Re-check the relay"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[#8ba7c7] mb-4">
        File scanning runs entirely in your browser. Fetching a page you do not control cannot — the browser blocks
        cross-origin reads, and no amount of front-end code gets around that. So this one capability runs against a
        small local service, and it is honest about whether that service is up.
      </p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 rounded-lg text-[#e0f4ff] placeholder:text-[#8ba7c7]/60 outline-none focus:border-[#00d9ff]/70 transition-colors"
          style={{ background: "rgba(0,8,20,0.6)", border: "1px solid rgba(0,217,255,0.25)" }}
        />
        <NeonButton variant="primary" size="md">
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Scanning
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> Scan page
            </span>
          )}
        </NeonButton>
      </form>

      {state === "offline" && !error && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <p className="text-[#e0f4ff] text-sm mb-2">The relay is not running. From the project root:</p>
          <code className="block px-3 py-2 rounded-md text-[#00d9ff] text-sm" style={{ background: "rgba(0,8,20,0.7)" }}>
            npm run relay
          </code>
          <p className="text-[#8ba7c7] text-sm mt-2">
            It is a single Node file with no dependencies beyond the ones already installed. Everything else on this
            page works without it.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 mt-4 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }} role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <p className="text-[#e0f4ff] text-sm">{error}</p>
        </div>
      )}

      {scan && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(0,217,255,0.2)" }}>
          <PageReport scan={scan} />
        </motion.div>
      )}
    </GlassCard>
  );
}
