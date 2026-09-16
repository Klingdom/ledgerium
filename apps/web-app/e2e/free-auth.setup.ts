/**
 * Free-tier auth setup — logs in as the free-plan test user and saves session
 * cookies (row #195).
 *
 * Mirrors auth.setup.ts exactly, differing only in credentials and output
 * path. Runs as its own "setup" project so `e2e/.auth/free-user.json` exists
 * before any spec that needs a free-tier session — see playwright.config.ts
 * `authenticated` project dependencies.
 */

import { test as setup, expect } from '@playwright/test';

const FREE_AUTH_FILE = './e2e/.auth/free-user.json';

setup('authenticate as free-tier test user', async ({ page }) => {
  // Navigate to login page and wait for full hydration
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the form to be interactive (React hydration)
  const emailInput = page.getByLabel('Email');
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 });

  // Fill credentials
  await emailInput.fill('free@ledgerium.test');
  await page.getByLabel('Password').fill('TestPass123!');

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (first compile can be slow)
  await page.waitForURL('**/dashboard**', { timeout: 60_000 });

  // Verify we're authenticated
  await expect(page).toHaveURL(/\/dashboard/);

  // Save signed-in state
  await page.context().storageState({ path: FREE_AUTH_FILE });
});
