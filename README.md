# React + Vite

## Reef canonical blueprint

Reef's single documentation authority is [`docs/README.md`](docs/README.md). Read in
this order before making product or implementation decisions:

1. [`ADR-001`](docs/decisions/ADR-001-initial-market-wedge.md) — why M&A diligence is
   the provisional validation wedge and engineering is deferred.
2. [`COMPANY.md`](docs/vision/COMPANY.md) and
   [`MISSION.md`](docs/vision/MISSION.md) — company direction and boundaries.
3. [`PRODUCT.md`](docs/product/PRODUCT.md) and [`MVP.md`](docs/product/MVP.md) — exact
   customer, workflow, deliverable, and exclusions.
4. [`docs/validation/README.md`](docs/validation/README.md) and
   [`SCORECARD.md`](docs/validation/SCORECARD.md) — evidence plan and the gate that
   blocks M1 application implementation.
5. Architecture, design, and business documents in the order listed by the canonical
   index.

Files under [`docs/reef/`](docs/reef/README.md) are preserved historical proposals and
are not implementation authority. The Sora kit is supporting brand material only.

> **Favor ruthless focus over breadth.** If two ideas compete, choose the one that
> gets a real customer to pay sooner while preserving the long-term vision. Reef
> should evolve from one exceptional workflow into a platform, not attempt to be a
> platform before it has product-market fit.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Local apps in `public/`

- `public/lyrx/` — Lyrx, the browser DAW
- `public/datacore/` — DataCore, the governed data pipeline
- `public/shared/lyrx-vault.js` — IndexedDB store both apps share (same origin)

DataCore's Crawlers screen can drive a real crawler instead of its simulation:

```bash
npm run crawler     # http://localhost:8787, then reload /datacore/#crawl
```

It can also find sources for you — describe the material and it searches Openverse,
the Internet Archive and Wikisource. What it fetches can be picked item by item and
sent straight into Lyrx's library.
See [`server/README.md`](server/README.md) for the safety limits and the API.

## Credits
- 3D Jellyfish model by [n-](https://sketchfab.com/n-) on Sketchfab.
- 3D Portfolio structure inspired by [Adrian Hajdin](https://github.com/adrianhajdin/3d-portfolio).
# Github_pages
