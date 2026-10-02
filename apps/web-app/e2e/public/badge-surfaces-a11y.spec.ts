/**
 * Light- and dark-theme coverage for the surfaces carrying tinted status
 * badges — row #236.
 *
 * ## Why these pages
 *
 * #236's badges were measured at 1.04:1 to 2.33:1 and live in three places:
 * admin operations, the demo surfaces, and the SOP-template marketing pages.
 * None of the three had any light-theme scan, which is why badges that bad
 * survived — the ratchets reached the dashboard and the SOP viewer and
 * stopped.
 *
 * Admin is covered by `e2e/app/admin/admin-a11y.spec.ts`, which currently
 * skips: that route 404s for anyone not on the hardcoded admin allowlist, and
 * adding a test account to a security boundary is not a trade worth making
 * for coverage. These two pages render the same badge components with no such
 * constraint, so they are where the tokens actually get exercised.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { forceTheme, expectThemeApplied } from '../helpers/theme.js';

/*
  HELD BACK, with the reason and the row, because a hold recorded only in a log
  is indistinguishable from a test nobody wrote.

  Row #245 (filed loop 77, closed loop 81) held three contrast defects here.
  They are fixed, and the sop-template light scan RETURNED with that fix, as
  the row required. Returning the scans found more than the row listed, and
  the fix covers what they found: the active public-nav item (the same
  tint-pair defect, 1.06:1 light), a warning band at 4.4:1, and the report
  tiles' consistency colours (green 3.6:1 and amber 3.04:1 in light — amber
  only latent because the fixture happens to be green).

  /product RETURNED with row #255 (loop 82), both themes. Its only remaining
  violation was inside the workflow-map node, `WorkflowTaskNode`, which
  hardcoded light-canvas colours as inline styles (step label `#111827` on a
  ~6%-alpha tint, 1.08:1 in the DARK default theme). The node body is now an
  opaque per-theme surface with token text and a measured per-category label
  colour; the pairs are asserted in `src/app/theme-contrast.test.ts`.
  Remaining workflow-map canvas items (edges, minimap, lane headers, legends)
  are listed under row #255's residual, not held here: axe finds none on this
  page in either theme.
*/
const COVERED = [
  { name: 'sop-template', path: '/sop-templates/invoice-approval-sop-template', themes: ['dark', 'light'] },
  { name: 'product', path: '/product', themes: ['dark', 'light'] },
] as const;

for (const pageDef of COVERED) {
  for (const theme of pageDef.themes as readonly ('dark' | 'light')[]) {
    test(`axe: no critical/serious violations on ${pageDef.name} (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      await page.goto(pageDef.path, { waitUntil: 'networkidle' });

      // Prove the page rendered and the theme took. Without both, a redirect
      // or a silently-ignored preference would scan the wrong thing and pass.
      await expect(page.locator('body')).toBeVisible();
      await expectThemeApplied(page, theme);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      const report = blocking
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes
              .map((n) => `${n.target.join(', ')} — ${n.any[0]?.message ?? ''}`)
              .join('\n  ')}`,
        )
        .join('\n\n');

      expect(
        blocking.length,
        `${pageDef.name} (${theme}) has ${blocking.length} critical/serious violation(s):\n\n${report}`,
      ).toBe(0);
    });
  }
}
