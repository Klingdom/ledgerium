import { test, expect } from '@playwright/test';

test.describe('Teams page (authenticated)', () => {
  test('loads teams page', async ({ page }) => {
    await page.goto('/teams');
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows team creation or empty state for free user', async ({ page }) => {
    await page.goto('/teams');

    // Free tier user may see upgrade prompt or empty state
    const content = page.getByText(/team|upgrade|create/i);
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });
});
