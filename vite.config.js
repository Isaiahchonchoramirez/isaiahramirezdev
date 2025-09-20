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
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    publicDir: 'public',
  };
});