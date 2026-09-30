/**
 * Force a theme for the duration of a test.
 *
 * ## Why this exists
 *
 * Row #230. Every axe ratchet in this repo ran against the dark theme, because
 * dark is the default and nothing ever set otherwise. That blind spot hid a
 * focus indicator measuring 2.18:1 in light mode — against a 3:1 floor — on 68
 * elements, for as long as the light theme has existed. The colours were fine
 * in dark, so no scan ever had reason to complain.
 *
 * A ratchet that only ever sees one of two themes is testing half the product.
 *
 * ## How the theme is applied
 *
 * `useTheme` reads `localStorage['ledgerium-theme']` on mount and adds or
 * removes a `light` class on `<html>`. Seeding that key via `addInitScript`
 * means the preference is present before the app's first render, so there is no
 * dark-then-light flash for axe to scan mid-transition.
 *
 * This must be called BEFORE `page.goto`.
 */

import type { Page } from '@playwright/test';

const STORAGE_KEY = 'ledgerium-theme';

export type Theme = 'dark' | 'light';

/**
 * Seed the theme preference for every document this page loads.
 *
 * @param page  Playwright page, NOT yet navigated.
 * @param theme Which theme to force.
 */
export async function forceTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [STORAGE_KEY, theme],
  );
}

/**
 * Assert the theme actually took effect.
 *
 * Worth calling explicitly in light-theme specs: if the preference were
 * silently ignored the scan would run against dark and pass, which is precisely
 * the failure mode this helper exists to end — a green tick for a check that
 * never happened.
 */
export async function expectThemeApplied(page: Page, theme: Theme): Promise<void> {
  const { expect } = await import('@playwright/test');
  const hasLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
  expect(
    hasLight,
    `expected the ${theme} theme to be active, but <html> ${hasLight ? 'has' : 'does not have'} the "light" class`,
  ).toBe(theme === 'light');
}
