import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright config for extension screenshot harness.
 * No auth, no server, no global setup — just opens static HTML.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'extension-screenshots.spec.ts',
  fullyParallel: true,
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
      name: 'extension-screenshots',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
