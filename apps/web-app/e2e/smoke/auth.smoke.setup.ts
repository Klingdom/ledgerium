/**
 * Smoke auth setup — logs the seeded smoke user in against the production
 * build on :3099 and saves the session storageState for the authed Analysis
 * smoke project. Mirrors e2e/auth.setup.ts.
 */
import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = './e2e/.auth/smoke-user.json';

// MUST stay in sync with e2e/smoke/seed-smoke-user.js
const SMOKE_EMAIL = 'smoke@ledgerium.test';
const SMOKE_PASSWORD = 'SmokePass123!';

setup('authenticate smoke user', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  const emailInput = page.getByLabel('Email');
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 });

  await emailInput.fill(SMOKE_EMAIL);
  await page.getByLabel('Password').fill(SMOKE_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 60_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
});
