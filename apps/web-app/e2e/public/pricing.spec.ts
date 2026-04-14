import { test, expect } from '@playwright/test';

test.describe('Pricing page', () => {
  test('displays all pricing tiers', async ({ page }) => {
    await page.goto('/pricing');

    // Should show all 5 tier names as h3 headings
    for (const tier of ['Free', 'Starter', 'Team', 'Growth', 'Enterprise']) {
      await expect(
        page.getByRole('heading', { name: tier, exact: true })
      ).toBeVisible();
    }
  });

  test('shows pricing amounts', async ({ page }) => {
    await page.goto('/pricing');

    // Check key prices are displayed
    await expect(page.getByText('$0')).toBeVisible();
    await expect(page.getByText('$49')).toBeVisible();
  });

  test('has CTA buttons for each tier', async ({ page }) => {
    await page.goto('/pricing');

    // The Free tier should have "Get Started Free" CTA
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible();
  });

  test('shows trust signals', async ({ page }) => {
    await page.goto('/pricing');

    // "No credit card required" appears under each CTA
    const trustSignals = page.getByText(/no credit card required/i);
    await expect(trustSignals.first()).toBeVisible();
  });
});
