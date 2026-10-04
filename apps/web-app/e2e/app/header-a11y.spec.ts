/**
 * Axe check scoped to the shared AppShell <header> (row #409).
 *
 * Every other authenticated axe check is scoped to <main>, so the header was
 * never scanned. The "Get Extension" chip measured 1.82:1 in the dark theme
 * at 1024 px and wider (text for dark surfaces on a light brand-50 tint).
 *
 * The header is identical on every signed-in route, so one route is enough.
 */

import { test, expect } from '@playwright/test';
import { assertAxeCompliance } from '../helpers/axe.js';
import { forceTheme, expectThemeApplied, type Theme } from '../helpers/theme.js';

const THEMES: Theme[] = ['dark', 'light'];
const WIDTHS = [640, 1024, 1280];

test.describe('AppShell header a11y (authenticated)', () => {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`header has no critical/serious violations: ${theme} @ ${width}px`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/account', { waitUntil: 'networkidle' });
        await expect(page.locator('header')).toBeVisible();
        await expectThemeApplied(page, theme);
        await assertAxeCompliance(page, `header ${theme} ${width}px`, 0, 'header');
      });
    }

    test(`header chip is compliant while hovered: ${theme} @ 1280px`, async ({ page }) => {
      await forceTheme(page, theme);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/account', { waitUntil: 'networkidle' });
      await expectThemeApplied(page, theme);
      await page.locator('header a[title="Download Chrome Extension"], header button[title="Download Chrome Extension"]').first().hover();
      await assertAxeCompliance(page, `header chip hover ${theme}`, 0, 'header');
    });

    test(`header has no critical/serious violations with menu open: ${theme} @ 375px`, async ({ page }) => {
      await forceTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto('/account', { waitUntil: 'networkidle' });
      await expectThemeApplied(page, theme);
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await expect(page.locator('#app-nav')).toBeVisible();
      await assertAxeCompliance(page, `header ${theme} 375px menu open`, 0, 'header');
    });
  }
});
