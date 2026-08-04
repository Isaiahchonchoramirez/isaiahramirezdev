// The Bløm taproom service.
//
// Orders, private-event enquiries, newsletter signups and club memberships
// land here. It is deliberately small: a JSON file per kind, an append, and a
// couple of read endpoints. There is no database because there is no problem
// a database would solve at this size, and no payment processing because
// taking card details is the taproom's job, not a portfolio site's.
//
//   node server/blom/service.mjs        → http://localhost:8788
//   PORT=9100 node server/blom/service.mjs
//
// No dependencies.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8788);
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");

const KINDS = new Set(["order", "enquiry", "newsletter", "membership"]);
const MAX_BODY = 64 * 1024;

// Enough to stop an accidental loop from filling the disk. This is a local
// service on a developer's machine, not a public endpoint.
const RATE_LIMIT = { windowMs: 60_000, max: 60 };
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const window = hits.get(ip)?.filter((t) => now - t < RATE_LIMIT.windowMs) ?? [];
  window.push(now);
  hits.set(ip, window);
  return window.length > RATE_LIMIT.max;
}

async function readAll(kind) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, `${kind}.json`), "utf8"));
  } catch {
    return [];
  }
}

async function append(kind, record) {
  await mkdir(DATA_DIR, { recursive: true });
  const existing = await readAll(kind);
  existing.push(record);
  await writeFile(path.join(DATA_DIR, `${kind}.json`), JSON.stringify(existing, null, 2));
  return existing.length;
}

/**
 * Validate on the server as well as in the browser.
 *
 * Client-side validation is a convenience for the person filling the form;
 * it is not a guarantee about what arrives, because anything can POST here.
 */
function validate(kind, payload) {
  const problems = [];
  const email = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  if (kind === "order") {
    if (!payload?.customer?.name?.trim()) problems.push("customer.name is required");
    if (!email(payload?.customer?.email)) problems.push("customer.email must be a valid address");
    if (!Array.isArray(payload?.items) || payload.items.length === 0) problems.push("items must be a non-empty array");
    if (payload?.fulfilment === "ship" && !payload?.address?.trim()) problems.push("address is required when shipping");

    // Recompute the total rather than trusting the number that arrived.
    if (Array.isArray(payload?.items)) {
      const subtotal = payload.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0);
      if (payload.totals?.subtotal !== subtotal) {
        problems.push(`subtotal does not match the line items (sent ${payload.totals?.subtotal}, computed ${subtotal})`);
      }
    }
  }

  if (kind === "enquiry") {
    if (!payload?.name?.trim()) problems.push("name is required");
    if (!email(payload?.email)) problems.push("email must be a valid address");
  }

  if (kind === "newsletter" && !email(payload?.email)) problems.push("email must be a valid address");

  if (kind === "membership") {
    if (!payload?.name?.trim()) problems.push("name is required");
    if (!email(payload?.email)) problems.push("email must be a valid address");
    if (!["individual", "household", "premium"].includes(payload?.tier)) problems.push("tier must be a known membership");
  }

  return problems;
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        req.destroy();
        reject(new Error("Body too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const ip = req.socket.remoteAddress ?? "unknown";

  if (pathname === "/api/health") {
    return send(res, 200, { ok: true, service: "blom-taproom", version: "1.0" });
  }

  // GET /api/orders, /api/enquiries … — what the taproom would actually read.
  const listMatch = /^\/api\/(order|enquiry|newsletter|membership)s?$/.exec(pathname);
  if (listMatch && req.method === "GET") {
    const kind = listMatch[1];
    const records = await readAll(kind);
    return send(res, 200, { kind, count: records.length, records: records.slice(-100).reverse() });
  }

  const postMatch = /^\/api\/(\w+)$/.exec(pathname);
  if (postMatch && req.method === "POST") {
    const kind = postMatch[1];
    if (!KINDS.has(kind)) return send(res, 404, { error: `Unknown submission kind "${kind}".` });
    if (rateLimited(ip)) return send(res, 429, { error: "Too many submissions. Try again in a minute." });

    let parsed;
    try {
      parsed = JSON.parse((await readBody(req)) || "{}");
    } catch (error) {
      return send(res, 400, { error: `Could not parse the body — ${error.message}` });
    }

    const problems = validate(kind, parsed.payload);
    if (problems.length) return send(res, 422, { error: "Validation failed.", problems });

    const record = {
      reference: parsed.reference ?? null,
      receivedAt: new Date().toISOString(),
      submittedAt: parsed.at ?? null,
      payload: parsed.payload,
    };

    const total = await append(kind, record);
    console.log(`${kind} ${record.reference ?? "(no ref)"} — ${total} on file`);

    return send(res, 201, { ok: true, reference: record.reference, stored: total });
  }

  send(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`Bløm taproom service on http://localhost:${PORT}`);
  console.log(`  writing to ${DATA_DIR}`);
  console.log("  GET  /api/health");
  console.log("  POST /api/{order,enquiry,newsletter,membership}");
  console.log("  GET  /api/{orders,enquiries,newsletters,memberships}");
});
