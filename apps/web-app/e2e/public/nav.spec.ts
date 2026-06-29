import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * NAVIGATION_IA_001 — Iteration B acceptance gates for the logged-out marketing
 * nav (PublicNav). Covers keyboard a11y, aria-current prefix match, one-open,
 * route-change close, crawlability, and an axe scan of the header.
 *
 * Runs against the public site (no auth). Default viewport = desktop.
 */

const SOLUTIONS = 'button[aria-controls="nav-panel-solutions"]';
const RESOURCES = 'button[aria-controls="nav-panel-resources"]';
const SOL_PANEL = '#nav-panel-solutions';
const RES_PANEL = '#nav-panel-resources';

test.describe('PublicNav — structure & interaction (Iteration B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
  });

  test('renders the 4-item bar + CTAs', async ({ page }) => {
    await expect(page.locator(SOLUTIONS)).toBeVisible();
    await expect(page.locator(RESOURCES)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Product', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toBeVisible();
    // Primary CTA exists in either auth state (logged-out: Start free; logged-in: Go to app).
    await expect(page.getByRole('link', { name: /start free|go to app/i }).first()).toBeVisible();
  });

  test('panel links are in the DOM even when closed (crawlable)', async ({ page }) => {
    // CSS-hidden, not conditionally rendered: the links exist for crawlers.
    await expect(page.locator(`${SOL_PANEL} a[href="/departments/finance"]`)).toHaveCount(1);
    await expect(page.locator(`${RES_PANEL} a[href="/workflow-library"]`)).toHaveCount(1);
    // ...but not visible until opened.
    await expect(page.locator(SOL_PANEL)).toBeHidden();
  });

  test('click opens panel and toggles aria-expanded', async ({ page }) => {
    await expect(page.locator(SOLUTIONS)).toHaveAttribute('aria-expanded', 'false');
    await page.locator(SOLUTIONS).click();
    await expect(page.locator(SOLUTIONS)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(SOL_PANEL)).toBeVisible();
    // same-trigger click closes
    await page.locator(SOLUTIONS).click();
    await expect(page.locator(SOL_PANEL)).toBeHidden();
  });

  test('one panel open at a time', async ({ page }) => {
    await page.locator(SOLUTIONS).click();
    await expect(page.locator(SOL_PANEL)).toBeVisible();
    await page.locator(RESOURCES).click();
    await expect(page.locator(RES_PANEL)).toBeVisible();
    await expect(page.locator(SOL_PANEL)).toBeHidden();
    await expect(page.locator(SOLUTIONS)).toHaveAttribute('aria-expanded', 'false');
  });

  test('outside click closes the panel', async ({ page }) => {
    await page.locator(SOLUTIONS).click();
    await expect(page.locator(SOL_PANEL)).toBeVisible();
    await page.locator('h1').first().click();
    await expect(page.locator(SOL_PANEL)).toBeHidden();
  });

  test('keyboard: Enter opens + focus moves into panel; Escape closes + returns focus to trigger', async ({ page }) => {
    await page.locator(SOLUTIONS).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(SOL_PANEL)).toBeVisible();
    await expect(page.locator(`${SOL_PANEL} a`).first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator(SOL_PANEL)).toBeHidden();
    await expect(page.locator(SOLUTIONS)).toBeFocused();
  });

  test('route change closes the open panel', async ({ page }) => {
    await page.locator(SOLUTIONS).click();
    await page.locator(`${SOL_PANEL} a[href="/use-cases/operations"]`).click();
    await page.waitForURL('**/use-cases/operations');
    await expect(page.locator(SOLUTIONS)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(SOL_PANEL)).toBeHidden();
  });
});

test.describe('PublicNav — aria-current prefix match', () => {
  test('/departments/finance highlights Solutions only', async ({ page }) => {
    await page.goto('/departments/finance', { waitUntil: 'networkidle' });
    await expect(page.locator(SOLUTIONS)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(RESOURCES)).not.toHaveAttribute('aria-current', 'page');
  });

  test('/workflow-library highlights Resources only', async ({ page }) => {
    await page.goto('/workflow-library', { waitUntil: 'networkidle' });
    await expect(page.locator(RESOURCES)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(SOLUTIONS)).not.toHaveAttribute('aria-current', 'page');
  });

  test('/pricing highlights Pricing, not Solutions', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(SOLUTIONS)).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('PublicNav — axe (header, panel open)', () => {
  test('no critical/serious violations with Solutions open', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    await page.locator(SOLUTIONS).click();
    await expect(page.locator(SOL_PANEL)).toBeVisible();
    const results = await new AxeBuilder({ page }).include('header').analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
  });
});

test.describe('PublicNav — mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('drawer opens, Solutions accordion curates to hubs, Start free pinned', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    await page.getByLabel('Toggle menu').click();
    const solutionsBtn = page.getByRole('button', { name: 'Solutions' });
    await solutionsBtn.click();
    await expect(page.getByRole('link', { name: 'Operations teams' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View all roles' })).toBeVisible();
    // The full per-leaf list is NOT shown on mobile (curated to 6).
    await expect(page.getByRole('link', { name: 'Business Analysts' })).toHaveCount(0);
    // Pinned CTA reachable in either auth state.
    await expect(page.getByRole('link', { name: /start free|go to app/i }).first()).toBeVisible();
  });
});
