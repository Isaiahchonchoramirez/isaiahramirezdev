// DataGate's web relay.
//
// The profiler in the browser needs no server. Fetching a page the user does
// not control does: the same-origin policy stops a tab from reading another
// site's HTML, and that is a security boundary worth respecting rather than
// routing around. So this small service does the fetch, parses the document,
// and hands back structure — never raw page content.
//
//   npm run relay:datagate                  → http://localhost:8789
//   PORT=9000 node server/datagate/relay.mjs
//
// 8789 because DataCore's crawler already owns 8787 and the Bløm service owns
// 8788; all three are meant to be runnable at once.
//
// Dependencies: cheerio, already in the portfolio's devDependencies.

import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

const PORT = Number(process.env.PORT ?? 8789);
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

// The relay runs on a developer's machine, where "localhost" and the private
// ranges reach services that were never meant to be exposed. Refusing them
// keeps a pasted URL from turning this into an SSRF pivot into the LAN.
const BLOCKED_V4 = [
  { prefix: "0.", reason: "unspecified" },
  { prefix: "10.", reason: "private" },
  { prefix: "127.", reason: "loopback" },
  { prefix: "169.254.", reason: "link-local" },
  { prefix: "192.168.", reason: "private" },
];

function isBlockedAddress(address) {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
    return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8");
  }

  for (const { prefix } of BLOCKED_V4) {
    if (address.startsWith(prefix)) return true;
  }

  // 172.16.0.0/12 — only the second octet 16–31 is private.
  const octets = address.split(".").map(Number);
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

  return false;
}

async function assertPublicHost(hostname) {
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true }).catch(() => {
        throw new Error(`Could not resolve ${hostname}.`);
      });

  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new Error("That host resolves to a private or loopback address, which the relay will not fetch.");
    }
  }
}

/** Read the body with a hard cap, so a streaming endpoint cannot exhaust memory. */
async function readCapped(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`The page is larger than ${MAX_BYTES / 1024 / 1024} MB.`);
    }
    chunks.push(value);
  }

  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

function analyse(html, requestUrl, finalUrl, status, elapsedMs, bytes) {
  const $ = cheerio.load(html);
  const origin = new URL(finalUrl);

  const headings = $("h1, h2, h3, h4")
    .map((_, el) => ({
      level: Number(el.tagName[1]),
      text: $(el).text().trim().replace(/\s+/g, " ").slice(0, 120),
    }))
    .get()
    .filter((h) => h.text);

  let internal = 0;
  let external = 0;
  let nofollow = 0;
  const malformed = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (($(el).attr("rel") ?? "").includes("nofollow")) nofollow++;

    try {
      const resolved = new URL(href, finalUrl);
      if (resolved.hostname === origin.hostname) internal++;
      else external++;
    } catch {
      // A href the browser cannot resolve either — worth reporting.
      if (malformed.length < 8) malformed.push(href.slice(0, 80));
    }
  });

  const images = $("img");
  const missingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;

  const tables = $("table")
    .map((_, el) => {
      const rows = $(el).find("tr").length;
      const columns = Math.max(...$(el).find("tr").map((__, tr) => $(tr).children("td, th").length).get(), 0);
      const caption = $(el).find("caption").first().text().trim() || null;
      return { rows, columns, caption };
    })
    .get()
    .filter((t) => t.rows > 1);

  const openGraph = {};
  $('meta[property^="og:"]').each((_, el) => {
    const key = $(el).attr("property");
    const content = $(el).attr("content");
    if (key && content) openGraph[key] = content.slice(0, 200);
  });

  const jsonLdTypes = new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text());
      for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
        if (entry && typeof entry["@type"] === "string") jsonLdTypes.add(entry["@type"]);
      }
    } catch {
      // Malformed JSON-LD is common and not worth failing the scan over.
    }
  });

  const title = $("title").first().text().trim() || null;
  const description = $('meta[name="description"]').attr("content")?.trim() ?? null;

  const findings = [];

  if (!title) {
    findings.push({ severity: "critical", title: "No <title>", detail: "Search results and browser tabs have nothing to show for this page." });
  } else if (title.length > 65) {
    findings.push({ severity: "info", title: `Title is ${title.length} characters`, detail: "Search results truncate around 60 characters." });
  }

  if (!description) {
    findings.push({ severity: "warning", title: "No meta description", detail: "Search engines will assemble a snippet from body copy instead of a written one." });
  }

  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    findings.push({ severity: "warning", title: "No h1", detail: "The page has no top-level heading, so its outline starts mid-hierarchy." });
  } else if (h1Count > 1) {
    findings.push({ severity: "info", title: `${h1Count} h1 elements`, detail: "More than one top-level heading makes the document outline ambiguous." });
  }

  if (missingAlt > 0) {
    findings.push({
      severity: missingAlt > images.length / 2 ? "warning" : "info",
      title: `${missingAlt} of ${images.length} images have no alt text`,
      detail: "A screen reader announces these as unlabelled images, or reads out the filename.",
    });
  }

  if (!$("html").attr("lang")) {
    findings.push({ severity: "warning", title: "No lang attribute", detail: "Screen readers fall back to the system language and may pronounce the page wrong." });
  }

  if (malformed.length) {
    findings.push({ severity: "info", title: `${malformed.length} unresolvable links`, detail: `Hrefs a browser cannot parse: ${malformed.join(", ")}` });
  }

  if (bytes > 1024 * 1024) {
    findings.push({ severity: "info", title: `${(bytes / 1024 / 1024).toFixed(1)} MB of HTML`, detail: "Large documents delay first paint before a single asset is fetched." });
  }

  return {
    url: requestUrl,
    finalUrl,
    status,
    elapsedMs,
    bytes,
    title,
    description,
    lang: $("html").attr("lang") ?? null,
    headings: headings.slice(0, 40),
    links: { internal, external, nofollow, broken: malformed },
    images: { total: images.length, missingAlt },
    scripts: $("script[src]").length,
    stylesheets: $('link[rel="stylesheet"]').length,
    tables: tables.slice(0, 10),
    openGraph,
    jsonLdTypes: [...jsonLdTypes],
    findings,
  };
}

async function scan(rawUrl) {
  let target;
  try {
    target = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error("That is not a URL the relay can parse.");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("Only http and https are fetched.");
  }

  await assertPublicHost(target.hostname);

  const started = Date.now();
  const response = await fetch(target, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      // Identify honestly. A relay that lies about who it is has no business
      // lecturing anyone about data provenance.
      "user-agent": "DataGate-Relay/1.0 (+https://github.com/Isaiahchonchoramirez/isaiahramirezdev)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("html") && !type.includes("xml")) {
    throw new Error(`That URL returned ${type || "an unknown type"}, not HTML.`);
  }

  const html = await readCapped(response);
  return analyse(html, target.href, response.url, response.status, Date.now() - started, Buffer.byteLength(html));
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    // The page is served from the portfolio origin (or a dev server) while
    // the relay runs on localhost, so it is cross-origin by construction.
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(payload);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (pathname === "/api/health") {
    return send(res, 200, { ok: true, service: "datagate-relay", version: "1.0" });
  }

  if (pathname === "/api/scan" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });

    return req.on("end", async () => {
      try {
        const { url } = JSON.parse(body || "{}");
        if (!url) return send(res, 400, { error: "Send { url } in the body." });
        send(res, 200, await scan(url));
      } catch (error) {
        const message = error?.name === "TimeoutError" ? `No response within ${TIMEOUT_MS / 1000}s.` : error.message;
        send(res, 400, { error: message });
      }
    });
  }

  send(res, 404, { error: "Not found. The relay serves /api/health and /api/scan." });
});

server.listen(PORT, () => {
  console.log(`DataGate relay listening on http://localhost:${PORT}`);
  console.log("  GET  /api/health");
  console.log("  POST /api/scan   { \"url\": \"https://example.com\" }");
});
