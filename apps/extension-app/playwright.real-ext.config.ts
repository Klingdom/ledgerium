import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E config for the REAL-EXTENSION harness (iter 070).
 *
 * Test strategy: real-extension approach via chromium.launchPersistentContext()
 *
 * WHY THIS IS A SEPARATE CONFIG:
 *   The static-harness suite (playwright.config.ts + e2e/recording-lifecycle.spec.ts)
 *   serves the built dist/ via HTTP and injects a deterministic chrome.* mock.
 *   That suite is fast, stable, and appropriate for CI on every PR.
 *
 *   This config loads the REAL unpacked extension into a real Chromium browser using
 *   --load-extension and --disable-extensions-except.  It exercises the actual MV3
 *   service worker, content scripts, and sidepanel together — scenarios the static
 *   harness cannot reach:
 *     - Real background/content script message handling (no mock transport layer)
 *     - Real chrome.storage.local persistence
 *     - Real service worker lifecycle (startup, keepalive, SW restart recovery)
 *
 * PREREQUISITE:
 *   Extension must be built before running: pnpm --filter extension-app build
 *   The harness reads from dist/ which must exist at run time.
 *
 * RUN (manual / pre-release validation — NOT CI-on-every-PR):
 *   cd apps/extension-app && pnpm test:e2e:real
 *   (requires: pnpm exec playwright install chromium)
 *
 * STABILITY NOTE:
 *   Real-extension tests are inherently slower and more environment-sensitive
 *   than the static harness.  retries: 1 is always on.  Generous timeouts are
 *   set.  Tests that are unstable on Windows on first attempt are skipped with
 *   a clear comment — re-enable as platform support matures.
 *
 * WINDOWS COMPATIBILITY:
 *   headless: false is required on Windows for extension loading to work
 *   correctly with Playwright's bundled Chromium.  headless: 'new' may work
 *   on Linux CI but has reported issues with extension SW startup on Windows.
 *   Workers are 1 and fullyParallel: false because all tests share a single
 *   temp profile directory per test (created/destroyed in beforeEach/afterEach).
 */
export default defineConfig({
  testDir: './e2e/real-extension',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: process.env.CI ? 'github' : 'list',

  timeout: 60_000,
  expect: { timeout: 12_000 },

  use: {
    // Real-extension tests do NOT use a shared browser — each test calls
    // chromium.launchPersistentContext() directly with a temp profile dir.
    // The `use` block here is intentionally minimal; the actual launch options
    // are configured inline in the test file where launchPersistentContext is called.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
