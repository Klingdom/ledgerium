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

test.describe('PublicNav — mobile (Iteration C, 375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('hamburger toggles aria-expanded', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    const burger = page.getByLabel('Toggle menu');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  test('drawer opens, Solutions accordion curates to hubs (6), full leaf list hidden', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    await page.getByLabel('Toggle menu').click();
    await page.getByRole('button', { name: 'Solutions' }).click();
    await expect(page.getByRole('link', { name: 'Operations teams' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View all roles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Business Analysts' })).toHaveCount(0);
  });

  test('pinned CTA stays in viewport with all accordions expanded', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    await page.getByLabel('Toggle menu').click();
    await page.getByRole('button', { name: 'Solutions' }).click();
    await page.getByRole('button', { name: 'Resources' }).click();
    const cta = page.getByRole('link', { name: /start free|go to app/i }).first();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(667);
    }
  });

  test('body scroll is locked while the drawer is open and restored on close', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    await page.getByLabel('Toggle menu').click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.getByLabel('Toggle menu').click();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });

  test('Escape closes the drawer and returns focus to the hamburger', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'networkidle' });
    const burger = page.getByLabel('Toggle menu');
    await burger.click();
    await expect(page.getByRole('button', { name: 'Solutions' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(burger).toBeFocused();
  });
});
