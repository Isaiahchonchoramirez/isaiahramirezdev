# DataCore crawler

The real fetching half of DataCore's **Crawlers** screen. Without it, that screen
runs a simulation; with it, DataCore fetches actual pages and audio, and what you
pick lands in Lyrx.

```bash
npm run crawler     # http://localhost:8787
npm run dev         # the site, in another terminal
```

Then open `/datacore/index.html#crawl`. The banner reads **LIVE CRAWLER** when the
service is up and **DEMO MODE** when it isn't — nothing else to configure. The
deployed GitHub Pages build has no service, so it always shows the simulation.

## Finding sources when you don't have any

The **Don't know where to look?** panel searches three keyless, rights-aware
catalogues and proposes targets. Nothing is fetched until you choose something.

| catalogue | what it gives |
|---|---|
| **Openverse** | aggregates Freesound (591K), Jamendo (628K) and Wikimedia Commons (3.9M) audio, with direct media URLs |
| **Internet Archive** | `netlabels` + `opensource_audio` collections and texts, filtered to items that record a licence |
| **Wikisource** | CC BY-SA texts |

**Licence** narrows by what you're allowed to do, not just what exists:

| mode | keeps |
|---|---|
| Commercially usable *(default)* | anything without `-nc` or `-nd` — CC0, BY, BY-SA, public domain |
| CC0 / public domain | only CC0 and PD — no attribution strings attached |
| Any licence | everything, NC and ND included |

**Source** narrows where it looks: Freesound for one-shots and field recordings,
Jamendo for finished tracks (often NC), Commons for folk/classical/spoken,
Archive for netlabel releases, Wikisource for lyrics.

Archive audio searches are scoped to the two open-music collections on purpose —
searching all of archive.org surfaces 200MB radio broadcasts nobody can use.

**Per load** sets how many arrive at a time — 10, 20, 50 or 100. The list keeps
loading as you scroll (there's a *Load more* button too), so a big search doesn't
render thousands of rows at once. It stops and says *end of results* when the
catalogues run dry.

Every audio row has a **▶ speaker button** — audition it before you take it.
Rows show duration and size, which matters: Freesound "previews" include
20-minute, 28MB files. Only the first 8MB is fetched to listen.

Two ways to use the results:

- **Use as seeds** — fills the seed box, and adds any off-site media hosts to the
  allow list at the same time (the step that's easy to forget by hand).
- **Add straight to findings** — catalogue hits already carry a licence, so they
  skip the crawl and land in Findings ready to send to Lyrx.

Paste a bare domain (`freesound.org`) instead of a topic and it reads that site's
`robots.txt` and `sitemap.xml` for real URLs — for when you know the site but not
the pages.

Two behaviours worth knowing, both learned the hard way:

- These catalogues **AND** every term, so `appalachian folk ballad banjo` finds
  almost nothing while `banjo` finds plenty. A narrow query widens in steps —
  full phrase, two best words, then one — stopping as soon as it has enough.
  The panel reports which query actually produced the results.
- Previewing goes through **Web Audio**, not an `<audio>` element. Pointing an
  `<audio>` element at these CDNs stalls at `readyState 0` indefinitely while a
  plain `fetch` of the identical URL returns in milliseconds, so the bytes are
  fetched and decoded by hand. All four sources answer ranged CORS requests.
- An `archive.org/details/…` item is a *page*, not a sound file. Adopting one
  reads the item's metadata, picks the real audio files under the size cap, and
  grants `*.archive.org` because downloads redirect onto a storage node. Items
  whose files are all oversized are refused with the reason.

## Using it

1. **Seed targets** — one URL per line. Only these hosts are ever contacted.
2. **Also allow (media hosts)** — audio usually sits on a CDN (`upload.wikimedia.org`);
   name it here or linked audio can be listed but never downloaded.
3. **Extraction map** — CSS selectors run against each page. `a[rel="license"] @href`
   reads an attribute instead of text.
4. **Start crawl** → watch the fetch log. Pages with no verifiable licence are
   marked `HOLD` and quarantined; they cannot be collected.
5. **Findings** — tick what you want, then:
   - **Download** — a `datacore-bundle.json` manifest (text inline, audio as URLs)
   - **Send to Lyrx** — downloads the bytes and writes them into the shared vault

Audio is only downloaded when you pick it. Listing a file costs nothing; choosing
it is what authorises the transfer.

## In Lyrx

Everything sent shows up under **Library › Imported from DataCore**. Text loads
into the Lyrics window, samples decode onto a pad. Both keep their licence label.

Storage is an IndexedDB database named `lyrx-vault`, shared because `/datacore/`
and `/lyrx/` are the same origin. Unlike Lyrx's in-memory pad buffers, imported
samples survive a reload. `public/shared/lyrx-vault.js` is the only API.

## Limits

Enforced in the service, not the UI, so the page cannot talk past them:

| | |
|---|---|
| hosts | seed hosts + explicitly named media hosts, nothing else (`*.example.org` allows subdomains; a bare `*` never matches) |
| robots.txt | fetched per host and honoured, including `Crawl-delay` |
| rate | ≥1s between requests to the same host, one at a time |
| size | 40 pages/crawl, depth ≤4, 2MB per page, 15MB per audio file, 30 audio files |
| network | GET only, no cookies, no auth, ≤3 redirects, 10s timeout |
| targets | loopback and private-range hosts refused (SSRF guard) |
| types | `text/html` and `text/plain` for pages, `audio/*` (plus `application/ogg`) for media |

Fetched bytes land in `.crawl-store/` at the repo root (gitignored). `Reset`
clears both the job and that directory.

## Rights classification

A page is kept only if a licence can be read from a structured signal — a
`rel="license"` link, a licence `<meta>`, a `creativecommons.org` URL, or footer
boilerplate. Prose that merely mentions "public domain" does not count. Anything
else is quarantined, which is the point of the project: publicly reachable is not
the same as authorised to train on.

The classifier recognises CC0, CC BY, CC BY-SA, CC BY-NC, public domain and MIT.
It is a heuristic, not legal advice — check the licence yourself before doing
anything beyond personal experimentation, and note that CC BY-SA and CC BY-NC
carry obligations that "kept" does not discharge.

## API

| endpoint | |
|---|---|
| `GET /api/health` | liveness + limits |
| `POST /api/discover` | `{q, kind, license, source}` — topic search across catalogues, or sitemap read for a domain |
| `POST /api/adopt` | `{items}` — catalogue hits into findings, resolving Archive items to files |
| `GET /api/status` | running flag, counters, log |
| `GET /api/results` | everything found |
| `POST /api/crawl` | `{seeds, extraHosts, depth, maxPages, rateLimit, audio, fields}` |
| `POST /api/stop` / `POST /api/reset` | stop the job / wipe job + store |
| `POST /api/collect` | `{ids}` — pulls bytes, downloading audio at this point |
| `GET /api/file/:id` | a stored record's bytes |
| `GET /api/bundle?ids=` | the download manifest |
