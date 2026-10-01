/**
 * Accessibility ratchet for the admin operations surface — row #236.
 *
 * ## Why this did not exist
 *
 * Light-theme axe coverage reached the dashboard and the SOP and stopped
 * there. The admin, demo and marketing surfaces had none — which is exactly
 * where #236's tinted status badges live, so the badges that were measured at
 * 1.04:1 to 2.33:1 were sitting under no ratchet at all. A row that fixes a
 * defect and leaves the surface unscanned has fixed today's instance.
 *
 * Scanned in both themes. The light theme is the one that has historically
 * been wrong, and the dark theme is the default, so neither is optional.
 */

import { test, expect, type Page } from '@playwright/test';
import { assertAxeCompliance } from '../../helpers/axe.js';
import { forceTheme, expectThemeApplied } from '../../helpers/theme.js';

const ADMIN_URL = '/admin/operations';

/**
 * Open the admin dashboard and confirm it actually rendered.
 *
 * Non-admins get a 404 from this route by design, so an unauthorised run would
 * otherwise scan a not-found page and report it clean — a green tick for a
 * surface never examined, which this suite has paid for before.
 */
async function openAdmin(page: Page): Promise<boolean> {
  const res = await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
  if (res && res.status() === 404) return false;
  await expect(page.getByRole('heading', { name: /operations/i }).first()).toBeVisible();
  return true;
}

for (const theme of ['dark', 'light'] as const) {
  test(`axe: zero critical/serious violations on admin operations, ${theme} theme`, async ({ page }) => {
    await forceTheme(page, theme);

    const reachable = await openAdmin(page);
    test.skip(
      !reachable,
      'the authenticated test user is not on the admin allowlist, so this route 404s by design. ' +
        'Skipped rather than passed: a scan of a 404 page is not coverage of the admin dashboard.',
    );

    await expectThemeApplied(page, theme);
    await assertAxeCompliance(page, `admin-operations-${theme}`, 0);
  });
}
