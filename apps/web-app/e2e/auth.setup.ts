/**
 * Auth setup — logs in as the test user and saves session cookies.
 *
 * This runs as a "setup" project before authenticated tests.
 * The resulting storageState is reused by all authenticated test projects.
 */

import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = './e2e/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  // Navigate to login page and wait for full hydration
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the form to be interactive (React hydration)
  const emailInput = page.getByLabel('Email');
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 });

  // Fill credentials
  await emailInput.fill('e2e@ledgerium.test');
  await page.getByLabel('Password').fill('TestPass123!');

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (first compile can be slow)
  await page.waitForURL('**/dashboard**', { timeout: 60_000 });

  // Verify we're authenticated
  await expect(page).toHaveURL(/\/dashboard/);

  // Save signed-in state
  await page.context().storageState({ path: AUTH_FILE });
});
