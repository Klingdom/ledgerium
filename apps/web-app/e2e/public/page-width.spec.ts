/**
 * page-width.spec.ts (public surface) — row #401
 *
 * WCAG 1.4.10 Reflow: at 320 CSS px (400 % zoom) no public page may scroll
 * sideways. Loop 195 asserted this for /pricing only; /install (335 px) and
 * /product (328 px) overflowed unnoticed. This is that assertion, generalised.
 *
 * Route list: every static page under app/(public). Excluded on purpose:
 *  - dynamic routes ([slug], share/[token]) — no seeded example is statically
 *    guaranteed here;
 *  - /demo and /install-extension — they redirect to /product and /install,
 *    which are already in the list.
 */
import { test, expect } from '@playwright/test';
import { forceTheme, expectThemeApplied } from '../helpers/theme';
import { PUBLIC_STATIC_ROUTES } from '../helpers/public-routes';


for (const theme of ['dark', 'light'] as const) {
  for (const route of PUBLIC_STATIC_ROUTES) {
    test(`${route} does not scroll sideways at 320 and 375 px (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      for (const width of [320, 375] as const) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route, { waitUntil: 'networkidle' });
        await expectThemeApplied(page, theme);
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        expect(m.sw, `${route} @${width}: scrollWidth ${m.sw} > innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);
      }
    });
  }
}
