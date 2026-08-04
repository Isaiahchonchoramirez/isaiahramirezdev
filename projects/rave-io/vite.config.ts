import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // The portfolio serves this from /rave/ locally and from
  // /isaiahramirezdev/rave/ on GitHub Pages, so every asset URL has to be
  // relative — an absolute /assets/… would 404 under the Pages prefix.
  base: './',

  build: {
    // Build straight into the portfolio's public dir; `vite build` at the
    // repo root then copies it into dist/ with everything else.
    outDir: path.resolve(__dirname, '../../public/rave'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
