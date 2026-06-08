import { defineConfig, devices } from '@playwright/test';

/**
 * Production smoke gate for Ledgerium AI web app.
 *
 * Purpose: catch client-side/hydration crashes on public pages in a
 * production build.  Runs `next start` (NOT `next dev`) against a
 * pre-built `.next` directory.  The build MUST be performed separately
 * (without umami env vars) so the build-time vs runtime asymmetry that
 * causes the hydration mismatch is faithfully reproduced.
 *
 * Usage:
 *   # Build WITHOUT umami vars (reproduces the bug):
 *   DATABASE_URL=file:./smoke.db NEXTAUTH_SECRET=smoke-secret-not-for-prod npx next build
 *
 *   # Run the gate (webServer starts next start with umami vars — asymmetry!):
 *   npx playwright test --config playwright.smoke.config.ts
 */
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,

  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3099',
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // No globalSetup / auth — public pages only.

  webServer: {
    // Starts the already-built app.  The build was done WITHOUT umami env
    // vars; next start here SETS them — that deliberate asymmetry is what
    // reproduces (and after the fix, proves the absence of) the hydration
    // mismatch.
    command: 'npx next start -p 3099',
    port: 3099,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'file:./smoke.db',
      NEXTAUTH_SECRET: 'smoke-secret-not-for-prod',
      NEXTAUTH_URL: 'http://localhost:3099',
      // These are SET at runtime (simulating the VPS) but were ABSENT at
      // build time — the exact asymmetry that causes the hydration mismatch.
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://umami.example.com/script.js',
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'smoke-test-id',
    },
  },
});
