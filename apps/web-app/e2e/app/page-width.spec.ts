/**
 * page-width.spec.ts (authenticated surface) — row #403
 *
 * WCAG 1.4.10 Reflow: at 320 CSS px (400 % zoom) and 375 px (phone) no
 * signed-in page may scroll sideways. The AppShell header nav used to hold
 * seven icon links plus the account controls in one non-wrapping row, so every
 * app page was 582 px wide (dashboard 878). Below `sm` the nav is now a
 * disclosure ("Toggle menu"); this is the assertion that keeps it that way.
 *
 * Also: every header link must have an accessible name at 375 px (the labels
 * were `hidden` below `sm`, leaving icon-only links with no name).
 */
import { test, expect, type Page } from '@playwright/test';
import { assertAxeCompliance } from '../helpers/axe';

// Seeded for the growth user in e2e/seed-test-db.js.
export const APP_ROUTES = [
  '/dashboard',
  '/account',
  '/teams',
  '/teams/join',
  '/analytics',
  '/analytics/time-sinks',
  '/recommendations',
  '/upload',
  '/compare',
  '/workflows/e2e-wf-growth-automate',
  '/this-route-does-not-exist', // 404 page, also inside AppShell
] as const;

const WIDTHS = [320, 375] as const;

async function settle(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
}

for (const width of WIDTHS) {
  for (const route of APP_ROUTES) {
    test(`${route} does not scroll sideways at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await settle(page, route);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${route} is ${scrollWidth}px wide in a ${innerWidth}px window`).toBeLessThanOrEqual(
        innerWidth,
      );
    });
  }
}

test.describe('AppShell menu at 375 px', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('menu button is a labelled disclosure; every link has an accessible name', async ({ page }) => {
    await settle(page, '/account');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAttribute('aria-controls', 'app-nav');
    await expect(page.locator('#app-nav')).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const nav = page.locator('#app-nav');
    await expect(nav).toBeVisible();

    const links = nav.getByRole('link');
    expect(await links.count()).toBeGreaterThanOrEqual(8); // 7 sections + docs
    for (const link of await links.all()) {
      const name = await link.evaluate((el) => {
        const labelled = el.getAttribute('aria-label');
        return (labelled ?? el.textContent ?? '').trim();
      });
      expect(name, `link ${await link.getAttribute('href')} has no accessible name`).not.toBe('');
    }
    await expect(nav.getByRole('button', { name: 'Sign out' })).toBeVisible();
    // Opening the menu must not widen the page either.
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]!);

    await assertAxeCompliance(page, 'app menu open (375px)', 0, '#app-nav');
  });

  test('focus moves into the menu; Escape closes it and returns focus to the button', async ({ page }) => {
    await settle(page, '/account');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await button.click();
    await expect(page.locator('#app-nav a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#app-nav')).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('choosing a link navigates and closes the menu', async ({ page }) => {
    await settle(page, '/account');
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.locator('#app-nav').getByRole('link', { name: 'Upload' }).click();
    await expect(page).toHaveURL(/\/upload/);
    await expect(page.locator('#app-nav')).toBeHidden();
  });

  test('Tab past the last item closes the menu and focus is not under the panel', async ({ page }) => {
    await settle(page, '/account');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await button.click();
    const nav = page.locator('#app-nav');
    await expect(nav.locator('a').first()).toBeFocused();
    // Tab to the last focusable control in the panel (Sign out).
    const signOut = nav.getByRole('button', { name: 'Sign out' });
    for (let i = 0; i < 30 && !(await signOut.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(signOut).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    const uncovered = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && (hit === el || el.contains(hit));
    });
    expect(uncovered, 'newly focused element is covered or focus was lost').toBe(true);
  });

  test('Shift+Tab from the first item back to the button keeps the menu open', async ({ page }) => {
    await settle(page, '/account');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await button.click();
    await expect(page.locator('#app-nav a').first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#app-nav')).toBeVisible();
  });

  test("clicking the current page's link closes the menu", async ({ page }) => {
    await settle(page, '/account');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await button.click();
    await page.locator('#app-nav').getByRole('link', { name: 'Account' }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#app-nav')).toBeHidden();
  });
});

for (const width of [375, 1280] as const) {
  for (const route of ['/account', '/upload', '/teams/join'] as const) {
    test(`exactly one nav link has aria-current="page" on ${route} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await settle(page, route);
      await expect(page.locator('#app-nav a[aria-current="page"]')).toHaveCount(1);
    });
  }
}

test('desktop keeps the inline nav and no Menu button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await settle(page, '/account');
  await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeHidden();
  await expect(page.locator('#app-nav').getByRole('link', { name: 'Upload' })).toBeVisible();
});
