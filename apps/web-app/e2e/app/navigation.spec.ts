import { test, expect } from '@playwright/test';

test.describe('App navigation (authenticated)', () => {
  test('can navigate between all main sections', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Upload
    await page.getByRole('link', { name: /upload/i }).click();
    await expect(page).toHaveURL(/\/upload/);

    // Navigate to Account
    await page.getByRole('link', { name: /account/i }).click();
    await expect(page).toHaveURL(/\/account/);

    // Navigate back to Workflows/Dashboard
    await page.getByRole('link', { name: /workflows/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('clicking logo navigates to dashboard', async ({ page }) => {
    await page.goto('/upload');

    // Click the logo/brand link
    const logoLink = page.locator('header a').first();
    await logoLink.click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('nav highlights active page', async ({ page }) => {
    await page.goto('/upload');

    // The Upload nav item should have active styling
    const uploadLink = page.getByRole('link', { name: /upload/i });
    const className = await uploadLink.getAttribute('class');
    expect(className).toMatch(/brand/);
  });
});
