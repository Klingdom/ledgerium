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
import { gunzipSync } from 'node:zlib';

const HOST = 'http://posthog.e2e.test';

/** Decode a posthog-js /e/ body (gzip, base64 `data=` form, or plain JSON) to its raw text. */
function decodeBody(buf: Buffer | null): string {
  if (!buf || buf.length === 0) return '';
  if (buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString('utf8');
  let text = buf.toString('utf8');
  if (text.startsWith('data=')) {
    text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  }
  return text;
}

async function stubPostHog(page: Page): Promise<{ all: string[]; events: () => number; bodies: string[] }> {
  const all: string[] = [];
  const bodies: string[] = [];
  await page.route(`${HOST}/**`, async (route) => {
    const url = new URL(route.request().url());
    all.push(url.pathname);
    if (url.pathname.startsWith('/e/')) bodies.push(decodeBody(route.request().postDataBuffer()));
    const body = url.pathname.startsWith('/flags') || url.pathname.startsWith('/decide')
      ? '{"featureFlags":{},"config":{"enable_collect_everything":false}}'
      : '{"status":1}';
    await route.fulfill({ status: 200, contentType: 'application/json', body, headers: { 'access-control-allow-origin': '*' } });
  });
  return { all, bodies, events: () => all.filter((p) => p.startsWith('/e/')).length };
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

  test('decline then accept in the same page: capture resumes with a NEW $device_id; no body carries visitorId (#400)', async ({ page }) => {
    const ph = await stubPostHog(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    });
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    const banner = page.locator('[data-consent-banner]');
    const footerBtn = page.locator('footer').getByRole('button', { name: 'Analytics preferences' });

    await banner.getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => ph.events(), { timeout: 20_000 }).toBeGreaterThan(0);

    const deviceIds = () => {
      const ids: string[] = [];
      for (const raw of ph.bodies) {
        const m = raw.match(/"\$device_id":"([^"]+)"/g) ?? [];
        for (const x of m) ids.push(x.replace(/^"\$device_id":"|"$/g, ''));
      }
      return ids;
    };
    await expect.poll(() => deviceIds().length, { timeout: 10_000 }).toBeGreaterThan(0);
    const firstId = deviceIds()[0]!;
    const countBefore = ph.bodies.length;

    // Decline, then accept again without leaving the page
    await footerBtn.click();
    await banner.getByRole('button', { name: 'Decline PostHog' }).click();
    await expect(banner).toBeHidden();
    await page.waitForTimeout(500);
    const afterDecline = ph.events();
    await footerBtn.click();
    await banner.getByRole('button', { name: 'Accept' }).click();
    await expect(banner).toBeHidden();

    // Capture resumes (kills the "optInPostHog is a no-op" mutant)
    await page.getByRole('link', { name: 'Features' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect.poll(() => ph.events(), { timeout: 20_000, message: JSON.stringify(ph.all) }).toBeGreaterThan(afterDecline);

    const later = ph.bodies.slice(countBefore).flatMap((raw) => raw.match(/"\$device_id":"([^"]+)"/g) ?? [])
      .map((x) => x.replace(/^"\$device_id":"|"$/g, ''));
    expect(later.length).toBeGreaterThan(0);
    for (const id of later) expect(id).not.toBe(firstId);

    // No PostHog body contains the first-party visitorId (key or value)
    const visitorId = await page.evaluate(() => localStorage.getItem('ledgerium_visitor_id'));
    expect(visitorId).toBeTruthy();
    for (const raw of ph.bodies) {
      expect(raw).not.toContain('visitorId');
      expect(raw).not.toContain(visitorId!);
    }
  });

  test('campaign landing (#405): utm values are sent shortened/dropped, query stripped, click id masked', async ({ page }) => {
    const ph = await stubPostHog(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
      localStorage.setItem('ledgerium_analytics_consent', 'full');
    });
    const longCampaign = 'c'.repeat(100);
    await page.goto(
      '/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=' + longCampaign +
        '&utm_content=jane%40example.com&gclid=abc123&fbclid=fb456&msclkid=ms789',
      { waitUntil: 'networkidle' },
    );
    await expect.poll(() => ph.bodies.length, { timeout: 20_000, message: JSON.stringify(ph.all) }).toBeGreaterThan(0);
    await page.waitForTimeout(4_000); // batch flush

    type Ev = { event: string; properties: Record<string, unknown> };
    const events: Ev[] = ph.bodies.flatMap((raw) => {
      const j = JSON.parse(raw) as Ev | Ev[];
      return Array.isArray(j) ? j : [j];
    });
    const pageview = events.find((e) => e.event === '$pageview');
    expect(pageview, JSON.stringify(events.map((e) => e.event))).toBeTruthy();

    const carriers = events.filter((e) => e.event === '$pageview' || e.event === 'pricing_page_viewed');
    expect(carriers.length).toBeGreaterThan(0);
    for (const e of carriers) {
      const p = e.properties;
      expect(p.utm_source).toBe('newsletter');
      expect(p.utm_medium).toBe('email');
      expect(String(p.utm_campaign).length).toBe(64);
      expect(p.utm_campaign).toBe(longCampaign.slice(0, 64));
    }
    const priced = events.find((e) => e.event === 'pricing_page_viewed');
    expect(priced, 'pricing_page_viewed').toBeTruthy();
    expect(priced!.properties.utmCampaign).toBe(longCampaign.slice(0, 64));
    for (const e of events) {
      // every utm-named property anywhere is <= 64 chars; the email-bearing value never leaves
      for (const [k, v] of Object.entries(e.properties)) {
        if (/utm_/i.test(k) && typeof v === 'string') expect(v.length).toBeLessThanOrEqual(64);
        if (/utm_content/i.test(k)) throw new Error('utm_content with an email must be dropped, got ' + k);
      }
    }
    const all = ph.bodies.join(' ');
    expect(all).not.toContain('example.com');
    expect(all).not.toContain('jane');
    // no query string on any URL property
    expect(String(pageview!.properties.$current_url)).toMatch(/\/pricing$/);
    for (const raw of ph.bodies) expect(raw).not.toMatch(/\/pricing\?/);
    // click ids arrive as the posthog-js placeholder, never raw
    for (const k of ['gclid', 'fbclid', 'msclkid', '$session_entry_gclid']) {
      expect(pageview!.properties[k], k).toBe('<masked>');
    }
    for (const raw of ph.bodies) {
      expect(raw).not.toContain('abc123');
      expect(raw).not.toContain('fb456');
      expect(raw).not.toContain('ms789');
    }
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
