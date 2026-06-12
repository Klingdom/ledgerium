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
  timeout: 90_000,

  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3099',
    ...devices['Desktop Chrome'],
    // TZ-divergence: the browser hydrates in a NON-UTC timezone while the server
    // (webServer below) runs in UTC. This reproduces the production VPS condition
    // (server UTC vs user-browser TZ) so a date rendered without a fixed timeZone
    // mismatches on hydration here too — catching the "flash → unstyled" class the
    // smoke gate previously could not (server+client were the same TZ).
    timezoneId: 'America/New_York',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Seeds prisma/smoke.db with one user (Slice 1b). Public tests stay auth-free
  // via project scoping below; only the `authed` project uses storageState.
  globalSetup: './e2e/smoke/global-setup-smoke.ts',

  projects: [
    // Public hydration gate — no auth, no seeded data required.
    { name: 'public', testMatch: /hydration\.smoke\.spec\.ts/ },
    // Auth setup — logs the seeded smoke user in, saves storageState.
    { name: 'setup', testMatch: /auth\.smoke\.setup\.ts/ },
    // Authenticated Analysis-view gate — depends on setup's storageState.
    {
      name: 'authed',
      testMatch: /analysis\.smoke\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: './e2e/.auth/smoke-user.json' },
    },
    // NEW-T2: Authenticated canvas hydration gate — workflow page, all four
    // map modes (flow / swimlane / variants / systems).  Depends on setup
    // (smoke user must be logged in and the seeded workflow must be reachable
    // via POST /api/sample-variants which runs in-process against smoke.db).
    {
      name: 'canvas-authed',
      testMatch: /canvas\.smoke\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: './e2e/.auth/smoke-user.json' },
    },
  ],

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
      // Server runs in UTC (like the VPS); the browser hydrates in America/New_York
      // (use.timezoneId). Any date rendered without a fixed timeZone mismatches.
      TZ: 'UTC',
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
