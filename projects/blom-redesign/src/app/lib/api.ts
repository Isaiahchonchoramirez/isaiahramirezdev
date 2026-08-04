// Talking to the Bløm service.
//
// The site is deployed as static files, so there is not always a server on the
// other end. Every submission is therefore written locally first and posted
// second: an order or an enquiry is never lost because an API was unreachable,
// and the UI can tell the truth about which of the two happened.

const API_URL =
  (typeof localStorage !== "undefined" && localStorage.getItem("blom.api")) || "http://localhost:8788";

export type Submission = {
  kind: "order" | "enquiry" | "newsletter" | "membership";
  payload: Record<string, unknown>;
};

export type SubmitResult = {
  /** Reference the customer can quote back. Generated locally so it exists either way. */
  reference: string;
  /** True when the service acknowledged it; false when it is queued locally. */
  delivered: boolean;
};

const QUEUE_KEY = "blom.queue";

function reference(kind: string): string {
  // Short, readable, and unambiguous when read aloud over the phone: no O/0,
  // no I/1.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const random = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of random) suffix += alphabet[byte % alphabet.length];
  return `${kind.slice(0, 3).toUpperCase()}-${suffix}`;
}

function readQueue(): (Submission & { reference: string; at: string })[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(entries: (Submission & { reference: string; at: string })[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries.slice(-50)));
  } catch {
    // Private browsing with storage disabled. The submission still goes out
    // over the network; it just is not replayable.
  }
}

export async function submit({ kind, payload }: Submission): Promise<SubmitResult> {
  const ref = reference(kind);
  const entry = { kind, payload, reference: ref, at: new Date().toISOString() };

  writeQueue([...readQueue(), entry]);

  try {
    const response = await fetch(`${API_URL}/api/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(6000),
    });
    return { reference: ref, delivered: response.ok };
  } catch {
    return { reference: ref, delivered: false };
  }
}

/** Everything submitted from this browser, newest first. */
export function history() {
  return readQueue().slice().reverse();
}
