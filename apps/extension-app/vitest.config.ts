import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Exclude Playwright E2E specs — these are run via `pnpm test:e2e` (Playwright),
    // not by Vitest.  Without this exclusion Vitest picks up the e2e/ directory
    // because it matches the default *.spec.ts glob and crashes on
    // `test.beforeAll` from @playwright/test.
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
    ],
    // Component tests use jsdom to simulate a browser DOM environment.
    // Pure-logic tests (background/, content/, shared/) are unaffected: they
    // do not import React or DOM APIs and run fine under jsdom.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
