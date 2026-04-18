import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for the Chrome MV3 extension (Ledgerium AI Recorder).
 *
 * Test strategy: static-harness approach.
 *
 * WHY: The real extension sidepanel bundles to /dist/src/sidepanel/index.html
 * and communicates exclusively through chrome.runtime.sendMessage /
 * chrome.runtime.onMessage.  Running under launchPersistentContext
 * (real-extension approach) requires a fully-installed Chromium build, an
 * unpacked extension load, and a real Chrome profile — too flaky for a first
 * E2E foothold and unnecessary for lifecycle smoke tests.
 *
 * Instead, we serve the built dist/ via a local HTTP server and inject a
 * chrome.* API mock into the page BEFORE React mounts.  This lets us drive
 * real production code (same JS bundle that ships in the extension) while
 * controlling every background response deterministically.
 *
 * The real-extension approach with launchPersistentContext is deferred to a
 * future iteration once the static-harness suite is stable.
 *
 * Run:
 *   cd apps/extension-app && pnpm test:e2e
 *   (requires: pnpm exec playwright install chromium)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /recording-lifecycle\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 400, height: 600 },
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
