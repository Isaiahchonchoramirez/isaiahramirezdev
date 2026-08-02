/**
 * Geometric marks for the skills grid.
 *
 * These replaced five separate WebGL canvases — each of which loaded its own
 * GLB *and* an HDR environment map — to render what were effectively logos.
 * Inline SVG costs nothing, scales perfectly, and inherits the theme colour,
 * so the 3D budget stays with the jellyfish where it earns its place.
 *
 * They are abstract marks rather than brand logos: shapes that read as the
 * discipline, not trademarks reproduced from memory.
 */

const MARKS = {
  // Orbiting electrons — component composition.
  react: (
    <>
      <circle cx="32" cy="32" r="4.5" fill="currentColor" />
      <ellipse cx="32" cy="32" rx="21" ry="8" />
      <ellipse cx="32" cy="32" rx="21" ry="8" transform="rotate(60 32 32)" />
      <ellipse cx="32" cy="32" rx="21" ry="8" transform="rotate(120 32 32)" />
    </>
  ),
  // Two interlocking loops — the paired-serpent shape of the Python mark.
  python: (
    <>
      <path d="M32 12h-9a6 6 0 0 0-6 6v7h21a6 6 0 0 1 6 6v6" />
      <path d="M32 52h9a6 6 0 0 0 6-6v-7H26a6 6 0 0 1-6-6v-6" />
      <circle cx="24" cy="19" r="2" fill="currentColor" stroke="none" />
      <circle cx="40" cy="45" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  // Hexagon with a request arrow passing through — an endpoint.
  node: (
    <>
      <path d="M32 10 53 22v20L32 54 11 42V22z" />
      <path d="M22 32h20" />
      <path d="M36 26l6 6-6 6" />
    </>
  ),
  // Tetrahedron — the simplest 3D solid.
  three: (
    <>
      <path d="M32 9 55 50H9z" />
      <path d="M32 9v41" />
      <path d="M9 50 32 36l23 14" />
    </>
  ),
  // Commit graph — branching and merging.
  git: (
    <>
      <circle cx="18" cy="18" r="5" />
      <circle cx="18" cy="46" r="5" />
      <circle cx="46" cy="32" r="5" />
      <path d="M18 23v18" />
      <path d="M18 32h13a10 10 0 0 1 10 0" />
    </>
  ),
  data: (
    <>
      <ellipse cx="32" cy="17" rx="19" ry="7" />
      <path d="M13 17v30c0 3.9 8.5 7 19 7s19-3.1 19-7V17" />
      <path d="M13 32c0 3.9 8.5 7 19 7s19-3.1 19-7" />
    </>
  ),
};

export default function TechMark({ mark = "react", size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {MARKS[mark] ?? MARKS.react}
    </svg>
  );
}
