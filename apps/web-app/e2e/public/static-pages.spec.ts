import { test, expect } from '@playwright/test';

test.describe('Static public pages', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText('Why Ledgerium exists')).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    // Use the h1 heading which is unique
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/privacy policy/i);
  });

  test('demo page loads', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('body')).toBeVisible();
  });

  test('install extension page loads', async ({ page }) => {
    await page.goto('/install-extension');
    await expect(page.getByText(/extension|chrome/i).first()).toBeVisible();
  });
});
