// Client for the optional local relay.
//
// Everything in the Upload Command Center runs in the browser and needs no
// server at all. Fetching an arbitrary URL does need one — the browser's
// same-origin policy will not let a page on one host read the HTML of
// another. So that one capability lives behind a small local service, and the
// UI tells the truth about whether it is running instead of faking a result.

export const RELAY_URL =
  (typeof localStorage !== "undefined" && localStorage.getItem("datagate.relay")) || "http://localhost:8789";

export type RelayState = "checking" | "online" | "offline";

export type PageScan = {
  url: string;
  finalUrl: string;
  status: number;
  elapsedMs: number;
  bytes: number;
  title: string | null;
  description: string | null;
  lang: string | null;
  headings: { level: number; text: string }[];
  links: { internal: number; external: number; nofollow: number; broken: string[] };
  images: { total: number; missingAlt: number };
  scripts: number;
  stylesheets: number;
  tables: { rows: number; columns: number; caption: string | null }[];
  openGraph: Record<string, string>;
  jsonLdTypes: string[];
  findings: { severity: "critical" | "warning" | "info"; title: string; detail: string }[];
};

export async function checkRelay(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${RELAY_URL}/api/health`, {
      signal: signal ?? AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function scanURL(url: string): Promise<PageScan> {
  const response = await fetch(`${RELAY_URL}/api/scan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await response.json().catch(() => ({ error: "The relay returned something that was not JSON." }));
  if (!response.ok) throw new Error(body.error ?? `Relay responded ${response.status}.`);
  return body as PageScan;
}
