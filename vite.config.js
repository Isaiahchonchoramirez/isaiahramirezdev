import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  return {
    // Only set base path when building for GitHub Pages deployment
    base: command === 'build' && process.env.GITHUB_PAGES === 'true' 
      ? '/isaiahramirezdev/' 
      : '/',
    plugins: [react(), tailwindcss()],
  };
});

