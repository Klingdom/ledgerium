/**
 * a11y.spec.ts (public surface)
 *
 * WHY THIS EXISTS (row #222)
 *
 * Until loop 35 the only accessibility scan on the public site was
 * `nav.spec.ts:125`, scoped to `.include('header')`. The page bodies — the first
 * thing a logged-out visitor sees — had never been scanned. When loop 34 finally
 * ran a full-page scan it found 11 serious contrast nodes on the landing page
 * and 10 on pricing, in the SHIPPED DEFAULT theme.
 *
 * WHY DARK ONLY
 *
 * Dark is the default (`layout.tsx` renders `class="dark"`) and is now clean:
 * 0 critical/serious on both pages. The light theme still has 11 (landing) and
 * 26 (pricing) nodes, all of them dark-palette Tailwind classes hardcoded into
 * components — `text-brand-400`, `text-amber-400`, `text-red-400` and friends
 * rendering on white. That is a separate defect family, tracked as row #223.
 *
 * Gating light today would make this spec red, and the CI gate runs the whole
 * suite (loop 33) with deploy depending on it (loop 30) — so a red spec here
 * blocks every release. Add the light theme to this loop the day #223 lands.
 * Do not "fix" a failure here by narrowing the scan.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { forceTheme, expectThemeApplied } from '../helpers/theme.js';
import { PUBLIC_STATIC_ROUTES } from '../helpers/public-routes.js';

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'pricing', path: '/pricing' },
] as const;

for (const pageDef of PAGES) {
  test(`axe: no critical/serious violations on ${pageDef.name} (dark, full page)`, async ({ page }) => {
    await page.goto(pageDef.path, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    const report = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id} (${v.nodes.length} nodes)\n  ${v.nodes
            .slice(0, 5)
            .map((n) => n.html.slice(0, 120))
            .join('\n  ')}`,
      )
      .join('\n\n');

    expect(blocking, `[axe][${pageDef.name}] ${blocking.length} blocking violation(s):\n\n${report}`).toEqual([]);
  });
}

// Row #418: the dark (default) theme is scanned over every static public route, not
// just / and /pricing. Light joins this loop when #223 lands; do not narrow the list.
for (const route of PUBLIC_STATIC_ROUTES) {
  test(`axe: no critical/serious violations on ${route} (dark, full page)`, async ({ page }) => {
    await forceTheme(page, 'dark');
    await page.goto(route, { waitUntil: 'networkidle' });
    await expectThemeApplied(page, 'dark');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    const report = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id} (${v.nodes.length} nodes)\n  ${v.nodes
            .slice(0, 5)
            .map((n) => n.html.slice(0, 120))
            .join('\n  ')}`,
      )
      .join('\n\n');
    expect(blocking, `[axe][${route}] ${blocking.length} blocking violation(s):\n\n${report}`).toEqual([]);
  });
}

// Row 113 (re-scoped by MR-065): pricing comparison table semantics. The full-page
// scan above covers the whole page; this asserts the table structure and scans the
// table alone.
test('pricing comparison table exposes table semantics and has no critical/serious axe violations', async ({ page }) => {
  await page.goto('/pricing', { waitUntil: 'networkidle' });
  const table = page.getByRole('table', { name: 'Plan comparison' });
  await expect(table).toHaveCount(1);
  await expect(table.locator('thead th:not([scope="col"])')).toHaveCount(0);
  await expect(table.locator('tbody th[scope="row"]').first()).toBeVisible();
  await expect(table.locator('th[scope="rowgroup"]')).toHaveCount(4);
  expect(await table.getByText('Not included').count()).toBeGreaterThan(0);

  const results = await new AxeBuilder({ page }).include('table').analyze();
  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});

// Row 390: at narrow widths the comparison table scrolls horizontally and holds
// nothing focusable, so its wrapper must be a focusable, named region. Run in both
// themes; the scan is scoped to the wrapper because the light theme's full-page
// contrast debt (#223) is a separate row.
for (const theme of ['dark', 'light'] as const) {
  test(`pricing comparison scroll region is keyboard-operable at 375px (${theme})`, async ({ page }) => {
    await forceTheme(page, theme);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    await expectThemeApplied(page, theme);

    const region = page.getByRole('region', { name: 'Plan comparison' });
    await expect(region).toHaveCount(1);
    await expect(region).toHaveAttribute('tabindex', '0');
    const dims = await region.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(dims.sw).toBeGreaterThan(dims.cw);

    const results = await new AxeBuilder({ page })
      .include('[role="region"][aria-labelledby]')
      .analyze();
    expect(results.violations.map((v) => v.id)).not.toContain('scrollable-region-focusable');
    // Light-theme colour contrast inside the table (brand tints on hardcoded dark-palette
    // classes) is existing debt tracked by #223, not this row; every other rule must pass.
    const blocking = results.violations.filter(
      (v) => (v.impact === 'critical' || v.impact === 'serious') && !(theme === 'light' && v.id === 'color-contrast'),
    );
    expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);

    // Keyboard: focus the region, then scroll it with ArrowRight.
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    expect(await region.evaluate((el) => el.scrollLeft)).toBe(0);
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    // Focus indicator is drawn (ring = box-shadow) in the theme's focus colour.
    const ring = await region.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe('none');
  });
}

// Row 395: the table's sr-only spans are position:absolute; unless the scroll region is
// positioned they escape it and widen the page (666px at a 375px viewport). WCAG 1.4.10
// exempts the table's own scroll, not the page's. Both themes, both narrow widths.
for (const theme of ['dark', 'light'] as const) {
  for (const width of [320, 375] as const) {
    test(`pricing page does not scroll sideways at ${width}px (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/pricing', { waitUntil: 'networkidle' });
      await expectThemeApplied(page, theme);

      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(m.sw, `scrollWidth ${m.sw} > innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);

      // Keyboard to the end of the region: the window must not pan.
      const region = page.getByRole('region', { name: 'Plan comparison' });
      await region.scrollIntoViewIfNeeded();
      await region.focus();
      for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => region.evaluate((el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1))
        .toBe(true);
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
    });
  }
}
