import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Exclude Playwright E2E specs — these are run via `pnpm test:e2e` (Playwright),
    // not by Vitest.  Without this exclusion Vitest picks up the e2e/ directory
    // because it matches the default *.spec.ts glob and crashes on
    // `test.beforeAll` from @playwright/test.
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
    ],
  },
})
