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
