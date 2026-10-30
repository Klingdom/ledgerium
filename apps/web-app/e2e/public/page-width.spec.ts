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

/**
 * Row #430 (loop 225): CI runs on Linux, whose fonts are wider than Windows'
 * (generic monospace falls back to a wider face). /docs (a URL in <code>) and
 * /use-cases/operations (a whitespace-nowrap label) passed here and overflowed
 * by 6 px and 1 px there. Each check is therefore repeated with text widened by
 * 4 % and monospace swapped for Courier New, so text that fits only with
 * Windows fonts fails on Windows too. On 2026-10-29 this stress pass flagged
 * exactly those two routes out of 37, and no others.
 */
const WIDE_TEXT_CSS =
  '*{letter-spacing:0.04em !important}' +
  'code,kbd,pre,samp,.font-mono{font-family:"Courier New",monospace !important}';


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

        // Applied after the plain check; the next page.goto loads a fresh document.
        await page.addStyleTag({ content: WIDE_TEXT_CSS });
        const w = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        expect(w.sw, `${route} @${width} with wider text: scrollWidth ${w.sw} > innerWidth ${w.iw}`).toBeLessThanOrEqual(w.iw);
      }
    });
  }
}
