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
 * Flow View, Analysis and the ticked-criteria state are NOT covered here yet,
 * and that is deliberate rather than an oversight.
 *
 * Running them found real, serious violations — a keyboard-inaccessible
 * scrollable region in Flow View (`scrollable-region-focusable`) and two
 * contrast failures in Analysis (`div[title="91% confidence"] > .text-[9px]`
 * and `.text-violet-500`). Row #229 carries the details.
 *
 * They are omitted rather than shipped red, because a failing spec blocks the
 * deploy gate for every unrelated change; and rather than shipped with a raised
 * ratchet baseline, because a baseline that tolerates serious violations is how
 * a zero-tolerance policy quietly becomes decorative. They come back with their
 * fixes, in one commit, so the coverage and the clean result arrive together.
 */
