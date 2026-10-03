/**
 * Row #394 - analytics consent can be given and withdrawn without a reload.
 *
 * playwright.config.ts gives the dev server a STUB PostHog key and a fake host
 * (posthog.e2e.test). Every request to that host is intercepted and fulfilled
 * here, so nothing leaves the machine; the spec observes PostHog only by the
 * requests it sends (init -> /flags + /e/, capture -> /e/).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HOST = 'http://posthog.e2e.test';

async function stubPostHog(page: Page): Promise<{ all: string[]; events: () => number }> {
  const all: string[] = [];
  await page.route(`${HOST}/**`, async (route) => {
    const url = new URL(route.request().url());
    all.push(url.pathname);
    const body = url.pathname.startsWith('/flags') || url.pathname.startsWith('/decide')
      ? '{"featureFlags":{},"config":{"enable_collect_everything":false}}'
      : '{"status":1}';
    await route.fulfill({ status: 200, contentType: 'application/json', body, headers: { 'access-control-allow-origin': '*' } });
  });
  return { all, events: () => all.filter((p) => p.startsWith('/e/')).length };
}

test.describe('analytics consent (#394)', () => {
  // posthog-js drops events from HeadlessChrome user agents and navigator.webdriver /
  // userAgentData HeadlessChrome browsers (bot filter), which would make "capturing stopped" vacuous. Present an ordinary Chrome UA (and webdriver/userAgentData masked in the first test) so a capture that
  // should happen does happen (the accept step asserts it).
  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  test('accept starts PostHog without a reload; withdraw via the footer stops capturing', async ({ page }) => {
    const ph = await stubPostHog(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); // brands: HeadlessChrome
    });
    await page.goto('/pricing', { waitUntil: 'networkidle' });

    const banner = page.locator('[data-consent-banner]');
    await expect(banner).toBeVisible();
    expect(ph.all).toEqual([]); // nothing before a choice

    // Accept: same document (marker proves no reload), PostHog initialises and sends a page view
    await page.evaluate(() => { (window as unknown as { __noReload: boolean }).__noReload = true; });
    await banner.getByRole('button', { name: 'Accept' }).click();
    await expect(banner).toBeHidden();
    await expect.poll(() => ph.events(), { timeout: 20_000, message: JSON.stringify(ph.all) }).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('ledgerium_analytics_consent'))).toBe('full');

    // Withdraw through the footer control
    await page.locator('footer').getByRole('button', { name: 'Analytics preferences' }).click();
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Keep current choice' })).toBeVisible();
    await banner.getByRole('button', { name: 'Decline PostHog' }).click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('ledgerium_analytics_consent'))).toBe('essential');

    // Capturing has stopped: client-side navigation + time for any batch flush sends no /e/
    await page.waitForTimeout(500);
    const before = ph.events();
    await page.getByRole('link', { name: 'Features' }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5_000); // > posthog-js batch flush interval (3s)
    expect(ph.events()).toBe(before);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
  });

  test('essential from the start: PostHog never starts', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ledgerium_analytics_consent', 'essential'));
    const ph = await stubPostHog(page);
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4_000);
    expect(ph.all).toEqual([]);
  });

  test('axe: banner (first visit and reopened) and footer control have no critical/serious violations', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    const banner = page.locator('[data-consent-banner]');
    await expect(banner).toBeVisible();
    await page.waitForTimeout(600); // slide-in transition finished

    const scan = async () => {
      const r = await new AxeBuilder({ page }).include('[data-consent-banner]').include('footer').analyze();
      return r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    };
    expect(await scan()).toEqual([]);

    await banner.getByRole('button', { name: 'Decline PostHog' }).click();
    await page.locator('footer').getByRole('button', { name: 'Analytics preferences' }).click();
    await expect(banner.getByRole('button', { name: 'Keep current choice' })).toBeVisible();
    await page.waitForTimeout(600);
    expect(await scan()).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(banner).toBeHidden();
  });

  test.describe('mobile: banner never covers the open nav drawer', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('with the banner showing, every drawer item is hit-testable; banner is usable after close', async ({ page }) => {
      await stubPostHog(page);
      await page.goto('/product', { waitUntil: 'networkidle' });
      const banner = page.locator('[data-consent-banner]');
      await expect(banner).toBeVisible();
      await page.waitForTimeout(600); // slide-in transition finished

      await page.getByLabel('Toggle menu').click();
      await page.getByRole('button', { name: 'Solutions' }).click();
      await page.getByRole('button', { name: 'Resources' }).click();

      const drawer = page.locator('#mobile-nav-drawer');
      const items = drawer.locator('a, button');
      const count = await items.count();
      expect(count).toBeGreaterThan(5);
      for (let i = 0; i < count; i++) {
        const item = items.nth(i);
        await item.scrollIntoViewIfNeeded();
        const topmostIsItem = await item.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && el.contains(hit);
        });
        expect(topmostIsItem, `drawer item #${i} is covered`).toBe(true);
      }

      // Closing the drawer returns the banner to the top of the stack and it still works.
      await page.getByLabel('Toggle menu').click();
      await expect(page.getByLabel('Toggle menu')).toHaveAttribute('aria-expanded', 'false');
      await banner.getByRole('button', { name: 'Decline PostHog' }).click();
      await expect(banner).toBeHidden();
    });
  });

  test('privacy page names the processors and how to change the choice', async ({ page }) => {
    await page.goto('/privacy');
    const section = page.locator('#analytics');
    await expect(section).toContainText('PostHog');
    await expect(section).toContainText('Umami');
    await expect(section).toContainText('Analytics preferences');
  });
});
