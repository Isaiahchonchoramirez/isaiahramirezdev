# DataGate

A data profiler that runs where your data already is.

Drop a CSV, TSV, JSON or JSONL file into the page and it returns a real profile:
every column typed, every distribution measured, every duplicate, gap, type
conflict and outlier named — with an explanation of why each one matters
downstream. Nothing is uploaded. The file is read by the tab it was dropped on
and the analysis runs in JavaScript on the same thread.

The layout began as a Figma Make export. The design survived; the engine behind
it was written from scratch.

## What actually runs

| Piece | Where |
| --- | --- |
| CSV/TSV/JSON/JSONL parser — quoting, embedded newlines, delimiter sniffing, ragged rows | `src/app/lib/parse.ts` |
| Type inference, per-column statistics, IQR outliers, correlation, quality findings | `src/app/lib/profile.ts` |
| Markdown / JSON / cleaned-CSV export, seeded demo dataset | `src/app/lib/report.ts` |
| Optional URL-scanning service | `../../server/datagate/relay.mjs` |

No parsing or charting library is involved. The CSV parser is about 120 lines,
which is less than the bytes a dependency would have cost, and the bars and
histograms are drawn directly.

### Statistics

Per numeric column: min, p25, median, p75, max, mean, sample standard deviation,
sum, a binned histogram, and outliers outside 1.5 × IQR of the quartiles.
Integer columns spanning 20 values or fewer get one histogram bar per value, so
the shape shown is the data's rather than the binning rule's.

Per categorical column: ranked value frequencies with shares.

Across numeric columns: Pearson correlation on pairwise-complete rows, ranked
by absolute strength. Identifier columns are excluded — correlating two row ids
produces a number that means nothing.

### Type inference

`integer`, `decimal`, `boolean`, `date`, `categorical`, `identifier`, `text`.

Two decisions the profiler makes deliberately:

- A zero-padded value like `007` stays text. Coercing it to `7` destroys data.
- A near-unique column (≥ 98% distinct, more than 20 rows) is an identifier,
  not a measurement, so it is kept out of the statistics and the correlations.

## The relay

File scanning needs no server. Fetching a page the user does not control does —
the same-origin policy stops a tab from reading another site's HTML, and that
boundary is worth respecting rather than routing around. So URL scanning runs
against a small local service, and the UI states plainly whether it is up
instead of faking a result.

```
npm run relay      # http://localhost:8787
```

It refuses hosts that resolve to loopback, link-local or private ranges, caps
the response at 5 MB, times out at 15 s, and identifies itself honestly in its
user-agent. It returns structure — headings, link and image counts, tables,
Open Graph, JSON-LD types, accessibility and SEO findings — never raw page
content.

## Development

```
npm install
npm run dev          # vite dev server
npm test             # 55 checks over the parser and the statistics
npm run typecheck
npm run build        # builds into ../../public/datagate/
```

`npm run build` writes straight into the portfolio's `public/` directory, so the
site's own build picks it up with everything else. Asset paths are relative,
which is what lets the same bundle serve from `/datagate/` locally and
`/isaiahramirezdev/datagate/` on GitHub Pages.

## Tests

`npm test` covers value coercion, RFC 4180 quoting, delimiter sniffing, JSON
flattening and JSONL detection, the quantile and standard-deviation maths
against hand-computed values, correlation against exact ±1 relationships, every
type-inference rule, each quality finding, and the cleaned-CSV export. The demo
dataset is seeded, so the duplicates, the missing values and the planted
negative correlation between shipping time and satisfaction are asserted rather
than assumed.
