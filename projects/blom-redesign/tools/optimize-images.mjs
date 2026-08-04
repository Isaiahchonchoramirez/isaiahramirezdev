// The Figma export shipped 30 MB of PNGs — one menu photo alone was 12 MB,
// which is more bytes than the rest of the portfolio combined. Nothing here
// needs a lossless alpha channel, so everything becomes a capped-width WebP.
// Run with: node tools/optimize-images.mjs
import { readdir, stat, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "..", "src", "imports");

// Nothing in the layout renders wider than a 1600 px content column, and the
// logo sits in a 48 px-tall nav slot, so anything past this is invisible detail.
const MAX_WIDTH = 1600;
const QUALITY = 82;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const files = (await readdir(dir)).filter((f) => /\.png$/i.test(f));
let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(dir, file);
  const out = src.replace(/\.png$/i, ".webp");
  const original = (await stat(src)).size;

  const image = sharp(src);
  const { width } = await image.metadata();

  await image
    .resize({ width: Math.min(width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);

  const optimized = (await stat(out)).size;
  before += original;
  after += optimized;
  console.log(`${file.padEnd(44)} ${kb(original).padStart(9)} → ${kb(optimized).padStart(9)}`);

  await unlink(src);
}

console.log(`\ntotal ${kb(before)} → ${kb(after)} (${(100 - (after / before) * 100).toFixed(1)}% smaller)`);
