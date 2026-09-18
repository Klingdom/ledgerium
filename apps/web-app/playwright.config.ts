import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Ledgerium AI web app.
 *
 * Uses a dedicated test database (SQLite) and a fresh Next.js dev server.
 * Auth state is shared via storageState to avoid repeated login flows.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially — Next.js dev server compiles on demand and
     parallel requests cause compilation timeouts under load. */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'html',

  /* Default timeout: 45s to handle first-compile lag */
  timeout: 45_000,
  expect: { timeout: 10_000 },

  /* Shared settings for all tests */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3098',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* Wait for network to settle before asserting */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* Global setup — seeds test DB and creates auth state */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  projects: [
    /* Auth setup — runs first, produces storageState for other projects.
       Anchored at a path-separator-or-start boundary + end-of-string so it
       matches ONLY .../auth.setup.ts and not .../free-auth.setup.ts (which
       contains "auth.setup.ts" as a substring — a bare `^...$` anchor does
       NOT work here because Playwright matches testMatch against the
       testDir-relative path, e.g. "e2e/auth.setup.ts" on some platforms, not
       the bare filename). */
    {
      name: 'auth-setup',
      testMatch: /(^|[\\/])auth\.setup\.ts$/,
    },

    /* Free-tier auth setup — produces e2e/.auth/free-user.json for
       plan-gating tests (row #195). */
    {
      name: 'free-auth-setup',
      testMatch: /(^|[\\/])free-auth\.setup\.ts$/,
    },

    /* Public pages — no auth required */
    {
      name: 'public',
      // Row #210: anchored on the e2e/ subdirectory. The old /public\/.+/ shape
      // matched a path SUBSTRING, and every path here contains 'web-app/', so the
      // three projects overlapped: `authenticated` collected 171 of the 229 listed
      // tests — all the public and api specs too, each run a second time with a
      // session. A public-page test passing while logged in is not evidence about
      // the logged-out page.
      testMatch: /e2e[\/]public[\/].+\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Authenticated pages — depends on both auth setups so every spec file
       (including plan-gating tests, which open their own free-tier
       browser.newContext({ storageState: './e2e/.auth/free-user.json' }))
       can rely on both storageState files already existing. */
    {
      name: 'authenticated',
      // Row #210: was /app\/.+/, which matched 'web-app/' in every path — it swept
      // in public/, api/ AND e2e/smoke/ (the smoke specs have their OWN config,
      // playwright.smoke.config.ts, needing a production build and a separate DB;
      // they were never meant to run here).
      testMatch: /e2e[\/]app[\/].+\.spec\.ts$/,
      dependencies: ['auth-setup', 'free-auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/user.json',
      },
    },

    /* API tests */
    {
      name: 'api',
      // Row #210: anchored like the others.
      testMatch: /e2e[\/]api[\/].+\.spec\.ts$/,
      dependencies: ['auth-setup'],
      use: {
        storageState: './e2e/.auth/user.json',
      },
    },
  ],

  /* Start the Next.js dev server on port 3098 (avoids conflict with dev on 3000) */
  webServer: {
    command: 'npx next dev -p 3098',
    port: 3098,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      NEXTAUTH_SECRET: 'e2e-test-secret-not-for-production',
      NEXTAUTH_URL: 'http://localhost:3098',
      // Disable PostHog in tests
      NEXT_PUBLIC_POSTHOG_KEY: '',
      NEXT_PUBLIC_POSTHOG_HOST: '',
    },
  },
});
