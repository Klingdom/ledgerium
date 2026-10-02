/**
 * sop-a11y.spec.ts — accessibility ratchet for the SOP surface.
 *
 * The dashboard has had one since iter 022. The SOP is the artefact this
 * product actually hands to an operator, and it had none.
 *
 * ## This is the second attempt, and the first one is why it looks like this
 *
 * Loop 57 shipped a version that mocked `/api/workflows/:id` and reported
 * "4/4 pass across all three SOP modes". It tested nothing. The detail page
 * keeps the active tab in React state initialised to `'workflow'`, and
 * redirects to `/dashboard` when the fetch is not ok — so a fixture that did
 * not match sent every test to the wrong page, the SOP never mounted, and the
 * mode switches were wrapped in `if (count > 0)` guards that silently skipped.
 * Four tests, all green, none of them looking at a SOP.
 *
 * So this version mocks nothing. It navigates to a **seeded workflow carrying a
 * real SOP artifact**, clicks the real tab, and asserts the SOP mounted before
 * scanning. Every state transition is proved rather than slept through: if the
 * page stops rendering a SOP, these fail instead of quietly passing.
 *
 * Auth: `authenticated` project (storageState `.auth/user.json`).
 */

import { test, expect, type Page } from '@playwright/test';
import { assertAxeCompliance } from '../../helpers/axe.js';
import { forceTheme, expectThemeApplied } from '../../helpers/theme.js';

/** Seeded in `e2e/seed-test-db.js`, owned by the growth-plan test user. */
const WORKFLOW_ID = 'e2e-wf-growth-automate';

/**
 * Open the SOP tab and prove it actually mounted.
 *
 * The mode switcher renders unconditionally inside `SOPPageShell`, so its
 * presence is the signal that a SOP is on screen rather than an empty state or
 * the dashboard we were redirected to.
 */
async function openSop(page: Page): Promise<void> {
  await page.goto(`/workflows/${WORKFLOW_ID}`, { waitUntil: 'networkidle' });

  // If the detail fetch failed we are on /dashboard by now. Assert where we
  // are before doing anything else, so the failure names the real problem.
  await expect(page).toHaveURL(new RegExp(`/workflows/${WORKFLOW_ID}`));

  await page.getByTestId('workflow-tab-sop').click();
  await expect(page.getByRole('button', { name: /execution sop/i })).toBeVisible();
}

/**
 * Switch mode and wait on the resulting state, not on the clock.
 * `SOPModeSwitcher` marks the active button with `aria-pressed`.
 */
async function switchMode(page: Page, name: RegExp): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test('axe: zero critical/serious violations — Execution SOP mode', async ({ page }) => {
  await openSop(page);
  // Execution is the landing mode; assert the content is really there before
  // scanning, so an empty shell cannot pass as a clean SOP.
  await expect(page.getByText(/invoice approval/i).first()).toBeVisible();
  await assertAxeCompliance(page, 'sop-execution', 0);
});

/**
 * The three tests below were written at loop 62 and held back rather than
 * shipped, because they were red: they had found a keyboard-inaccessible
 * scrollable region in Flow View and two contrast failures in Analysis. Row
 * #229 fixed those, so they land here now — coverage and a clean result in the
 * same commit, which was the point of holding them.
 */

test('axe: zero critical/serious violations — Flow View mode', async ({ page }) => {
  await openSop(page);
  await switchMode(page, /flow view/i);
  // The flow strip is the thing this mode exists for. If it is absent the scan
  // would pass on an empty panel, which is the failure mode of the first spec.
  await expect(page.getByRole('group', { name: /process flow/i })).toBeVisible();
  await assertAxeCompliance(page, 'sop-flow-view', 0);
});

test('axe: zero critical/serious violations — Analysis mode', async ({ page }) => {
  await openSop(page);
  await switchMode(page, /analysis/i);
  await expect(page.getByText(/intelligence layer/i).first()).toBeVisible();
  await assertAxeCompliance(page, 'sop-analysis', 0);
});

test('the Flow View process strip is reachable and scrollable by keyboard', async ({ page }) => {
  await openSop(page);
  await switchMode(page, /flow view/i);

  // Row #229 was a `scrollable-region-focusable` failure: the strip scrolled
  // but had no tab stop, so off-screen steps were unreachable without a mouse.
  // axe checks for the tab stop; this checks the tab stop is the right element
  // and actually does something, which axe cannot tell you.
  // Row #231: the tab stop is now a roving-tabindex step button inside the
  // strip (the container itself is no longer focusable).
  const strip = page.getByRole('group', { name: /process flow/i });
  const firstStep = strip.getByRole('button', { name: /^Step 1:/ });
  await expect(firstStep).toHaveAttribute('tabindex', '0');

  await firstStep.focus();
  await expect(firstStep).toBeFocused();
});

/**
 * Light theme (row #230).
 *
 * Every axe ratchet in this repo ran against the dark theme, because dark is
 * the default and nothing ever set otherwise. That is half the product going
 * unchecked, and it hid a focus indicator at 2.18:1 on 68 elements for as long
 * as the light theme has existed — the colours were fine in dark, so no scan
 * had reason to complain.
 *
 * This note used to record a hold: the dashboard had no light-theme scan,
 * because probing it found a real `color-contrast` failure and shipping the
 * test red would have blocked the deploy gate for every unrelated change. That
 * hold discharged at loop 67 — row #232 was fixed and the dashboard light test
 * lives in `v2-a11y.spec.ts`. The record is amended here rather than left
 * standing, because a hold notice that outlives its hold is a false statement
 * about coverage sitting in the file a reader checks first.
 *
 * Still uncovered in light, and recorded so the gap is not mistaken for
 * completeness: the admin, demo and public marketing surfaces. Row #236.
 */
test('axe: zero critical/serious violations — Execution SOP mode, LIGHT theme', async ({ page }) => {
  await forceTheme(page, 'light');
  await openSop(page);
  // Prove the theme actually applied. Without this the scan would silently run
  // against dark and pass — a green tick for a check that never happened, which
  // is the exact failure this whole spec was rewritten to stop.
  await expectThemeApplied(page, 'light');
  await expect(page.getByText(/invoice approval/i).first()).toBeVisible();
  await assertAxeCompliance(page, 'sop-execution-light', 0);
});

test('axe: zero critical/serious violations — Analysis mode, LIGHT theme', async ({ page }) => {
  await forceTheme(page, 'light');
  await openSop(page);
  await expectThemeApplied(page, 'light');
  await switchMode(page, /analysis/i);
  await expect(page.getByText(/intelligence layer/i).first()).toBeVisible();
  await assertAxeCompliance(page, 'sop-analysis-light', 0);
});

test('axe: zero critical/serious violations — Flow View mode, LIGHT theme', async ({ page }) => {
  // Added after MR-036 pointed out that loop 64 scanned two of the three modes
  // in light and recorded nothing about the third, while the entry read as
  // surface-wide. An unexplained gap in coverage is indistinguishable from an
  // oversight, which is the failure mode the hold-it-back convention exists to
  // avoid — so either this passes, or its absence gets a reason and a row.
  await forceTheme(page, 'light');
  await openSop(page);
  await expectThemeApplied(page, 'light');
  await switchMode(page, /flow view/i);
  await expect(page.getByRole('group', { name: /process flow/i })).toBeVisible();
  await assertAxeCompliance(page, 'sop-flow-view-light', 0);
});
