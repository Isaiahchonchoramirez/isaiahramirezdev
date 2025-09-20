import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true' || mode === 'github';
  
  return {
    base: isGitHubPages ? '/isaiahramirezdev/' : '/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    publicDir: 'public',
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
  };
});