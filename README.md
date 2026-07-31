# React + Vite

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
