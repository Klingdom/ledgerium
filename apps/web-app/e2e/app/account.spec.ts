import { test, expect } from '@playwright/test';

test.describe('Account page (authenticated)', () => {
  test('loads and shows account heading', async ({ page }) => {
    await page.goto('/account');

    // Should show account/settings page content
    await expect(page.getByText(/account|profile|settings/i).first()).toBeVisible();
  });

  test('shows current plan', async ({ page }) => {
    await page.goto('/account');

    // Should show the user's plan (free tier shown as "Free")
    await expect(page.getByText(/free/i).first()).toBeVisible();
  });

  test('account API returns correct data', async ({ request }) => {
    const response = await request.get('/api/account');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toBeTruthy();
    expect(body.data.user.email).toBe('e2e@ledgerium.test');
    expect(body.data.features).toBeTruthy();
    expect(body.data.limits).toBeTruthy();
  });
});
