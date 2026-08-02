import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';
  
  return {
    base: isGitHubPages ? '/isaiahramirezdev/' : '/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // Vite preloads a lazy chunk's dependencies by default, which pulled the
      // 1.2 MB three.js bundle back onto the critical path and undid the lazy
      // import. Keep preloading everything except that.
      modulePreload: {
        resolveDependencies: (_url, deps) =>
          deps.filter((dep) => !/three-|FloatingJelly-/.test(dep)),
      },
      rollupOptions: {
        output: {
          // Everything used to land in one ~1.35 MB file, so the browser had to
          // parse the whole 3D stack before it could paint a single project.
          // Splitting it means three.js only downloads once the jellyfish is
          // actually mounted, which is after first paint.
          manualChunks: {
            three: ["three", "@react-three/fiber", "@react-three/drei"],
            motion: ["gsap", "@gsap/react"],
            react: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    publicDir: 'public',
  };
});