# Bløm taproom service

The server half of the Bløm redesign. Orders, private-event enquiries,
newsletter signups and club memberships land here.

```bash
npm run service:blom     # http://localhost:8788
npm run dev              # the site, in another terminal
```

Then open `/blom/`. Place an order and the confirmation says **"Sent to the
taproom."** Stop the service and place another: it says **"Saved on this
device"** instead, with the same reference. Nothing is lost either way — the
browser writes every submission to `localStorage` before it tries the network,
so an unreachable service degrades to a queue rather than to a silent failure.
The deployed GitHub Pages build has no service, so it always queues.

## Endpoints

| method | path | does |
|---|---|---|
| `GET` | `/api/health` | liveness, used by the client to decide what to say |
| `POST` | `/api/order` | a basket, a customer and a fulfilment choice |
| `POST` | `/api/enquiry` | a private-event request |
| `POST` | `/api/newsletter` | an address and its topic preferences |
| `POST` | `/api/membership` | a club tier signup |
| `GET` | `/api/orders` | last 100, newest first — the same for `enquiries`, `newsletters`, `memberships` |

Submissions append to `server/blom/data/<kind>.json`. That directory is
gitignored; it is somebody's order history, not source.

## Validation happens twice

The browser validates so the person filling the form gets a useful message
before they submit. The service validates again because anything can POST to
it and client-side checks are a convenience, not a guarantee.

Orders get one extra check: the subtotal is **recomputed from the line items**
and the request is rejected if it disagrees with the number that arrived.

```bash
curl -s -X POST localhost:8788/api/order -H 'content-type: application/json' -d '{
  "payload": {
    "customer": { "name": "X", "email": "x@example.com" },
    "fulfilment": "pickup",
    "items": [{ "unitPrice": 2499, "quantity": 2 }],
    "totals": { "subtotal": 1 }
  }
}'
# {"error":"Validation failed.","problems":["subtotal does not match the line items (sent 1, computed 4998)"]}
```

## What it deliberately does not do

**No payments.** Taking card details is the taproom's job and a payment
processor's job. An order here is a request the taproom confirms, and both the
checkout and the club signup say so on the form rather than implying a
transaction that never happened.

**No database.** A JSON file per kind is the right size for this. Reaching for
Postgres would add an install step, a schema migration and a connection pool to
solve a problem that does not exist yet.

## Ports

Three local services are meant to run at once:

| port | service |
|---|---|
| 8787 | DataCore crawler (`npm run crawler`) |
| 8788 | Bløm taproom (`npm run service:blom`) |
| 8789 | DataGate relay (`npm run relay:datagate`) |
