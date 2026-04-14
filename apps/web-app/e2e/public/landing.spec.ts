import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads and shows hero content', async ({ page }) => {
    await page.goto('/');

    // Should show the Ledgerium branding
    await expect(page.locator('body')).toBeVisible();

    // Should have a CTA to start
    const cta = page.getByRole('link', { name: /start free|get started|sign up/i });
    await expect(cta.first()).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');

    // Should have links to key public pages (check exact text from PublicNav)
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ledgerium/i);
  });
});
