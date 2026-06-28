import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright config for Chrome Web Store tile composition.
 * No auth, no server, no global setup — composes static HTML tiles.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'store-tiles.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    headless: true,
    screenshot: 'off',
  },
  projects: [
    {
      name: 'store-tiles',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
