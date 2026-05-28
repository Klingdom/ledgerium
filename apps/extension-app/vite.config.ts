import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    minify: 'esbuild',
    sourcemap: false,
  },
  esbuild: {
    // Strip console.log and debugger statements in production builds.
    // esbuild is already a Vite bundled dependency — no extra package needed.
    // QA BLOCKER-2 + CHROME_STORE_REVIEW_001 §1 security requirement.
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
