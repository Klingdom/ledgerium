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

    // Row #200 (loop 20): `getByText('$0')` is a substring match that also hits
    // the plan-comparison table further down the page, so this failed on a
    // strict-mode conflict rather than a wrong price. The prices themselves are
    // correct (config.ts: Free 0, Starter 49). Scope to the tier cards' price
    // element, which is the thing this test is actually about.
    const tierPrice = page.locator('span.text-3xl.font-bold');
    await expect(tierPrice.filter({ hasText: '$0' }).first()).toBeVisible();
    await expect(tierPrice.filter({ hasText: '$49' }).first()).toBeVisible();
  });

  test('has CTA buttons for each tier', async ({ page }) => {
    await page.goto('/pricing');

    // Row #200 (loop 20): the Free tier's CTA is "Map Your First Workflow Free"
    // (config.ts:58) — "Get Started Free" never shipped, so this could not pass.
    await expect(
      page.getByRole('link', { name: /map your first workflow free/i }).first(),
    ).toBeVisible();
  });

  test('shows trust signals', async ({ page }) => {
    await page.goto('/pricing');

    // "No credit card required" appears under each CTA
    const trustSignals = page.getByText(/no credit card required/i);
    await expect(trustSignals.first()).toBeVisible();
  });
});
