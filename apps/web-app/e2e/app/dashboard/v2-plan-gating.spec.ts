/**
 * v2-plan-gating.spec.ts
 *
 * Plan-gating validation for the Dashboard V2 Health Score column.
 *
 * PRD §12 / D8 policy:
 *  - Free tier: Health Score integer visible (ungated). Breakdown tooltip is
 *    gated — shows lock icon + "See score by dimension" + a plans link.
 *  - Starter+ (growth plan): breakdown tooltip shows Speed / Consistency /
 *    Data Quality / Standardization dimensions.
 *
 * Test accounts (row #195 — see e2e/seed-test-db.js):
 *  - e2e@ledgerium.test     → plan: 'growth'  (Starter+ equiv, full breakdown)
 *  - free@ledgerium.test    → plan: 'free'    (gated breakdown)
 *
 * Both accounts have 5 seeded workflows (one per OpportunityTag) so every
 * test below has a real row to act against.
 *
 * Auth: authenticated project (storageState: .auth/user.json) for the
 * growth-plan tests. Free-tier tests open their own
 * browser.newContext({ storageState: './e2e/.auth/free-user.json' }),
 * produced by the `free-auth-setup` Playwright project (see
 * playwright.config.ts — the `authenticated` project depends on it so the
 * file exists before this spec runs).
 */

import { test, expect, type Page } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

/**
 * Row #195: `<tr>` data rows are identified by their `id="wf-row-<id>"`
 * attribute, not by `tabindex` (atglance-review #18 removed row-level
 * `tabIndex={0}` — see v2-happy-path.spec.ts for the same finding).
 */
const DATA_ROW_SELECTOR = 'tbody tr[id^="wf-row-"]';

// ── Helper ───────────────────────────────────────────────────────────────────

/**
 * Wait for the workflow table to contain at least one data row.
 * Returns false if the page renders an empty/error state instead.
 */
async function waitForWorkflowRows(page: Page, timeout = 12_000): Promise<boolean> {
  try {
    const table = page.getByRole('table', { name: 'Workflows' });
    await table.waitFor({ state: 'visible', timeout });
    // Wait for the skeleton rows to resolve
    await page.waitForTimeout(600);
    const rows = table.locator(DATA_ROW_SELECTOR);
    await rows.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// ── Free-tier gating ──────────────────────────────────────────────────────────

test('Free user: Health Score integer is visible in the column', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: './e2e/.auth/free-user.json',
  });
  const page = await context.newPage();

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  const hasRows = await waitForWorkflowRows(page);

  // Row #195: the free-tier user is seeded with 5 workflows — a missing row
  // here is a real regression, not a benign empty state.
  expect(hasRows, 'expected free-tier seed workflows to render').toBe(true);

  // Health Score integer must be visible in the first row
  const firstRow = page
    .getByRole('table', { name: 'Workflows' })
    .locator(DATA_ROW_SELECTOR)
    .first();

  // The cell aria-label pattern is "Health score: [N], [poor|fair|good]"
  const healthCell = firstRow.locator('[aria-label*="Health score:"]');
  await expect(healthCell).toBeVisible();

  await context.close();
});

test('Free user: health score breakdown tooltip shows upgrade CTA, not dimension breakdown', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: './e2e/.auth/free-user.json',
  });
  const page = await context.newPage();

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  const hasRows = await waitForWorkflowRows(page);
  expect(hasRows, 'expected free-tier seed workflows to render').toBe(true);

  const firstRow = page
    .getByRole('table', { name: 'Workflows' })
    .locator(DATA_ROW_SELECTOR)
    .first();

  // Row #195: the breakdown trigger is the health-score `<button>` itself
  // (aria-label^="Health score:") — column position is not stable (D+4
  // column picker inserts a variable number of dynamic columns before the
  // locked health_score column), so a positional `td.nth(N)` locator is not
  // reliable. Clicking the button matches how HealthTooltip is actually
  // opened in WorkflowRow.tsx.
  const healthScoreBtn = firstRow.locator('button[aria-label^="Health score:"]');
  await healthScoreBtn.click();

  // Gated tooltip: must show upgrade copy, must NOT show breakdown dimensions
  // Row #197: lead line renamed from "Upgrade to see breakdown" to
  // "See score by dimension" — states the payoff rather than the feature name.
  await expect(page.getByText(/see score by dimension/i)).toBeVisible();
  // Row #197: the gated tooltip's lead line changed from "Upgrade to see
  // breakdown" (which named the feature) to "See score by dimension" (which
  // names what the user would actually get). The upgrade action is carried by
  // the plans link below it.
  // Row #195 finding: the gated tooltip's plans link reads "Compare plans →"
  // (changed from "View plans →" at iter-064 / row #104 WDC2-P05 — see
  // WorkflowRow.tsx HealthTooltip — this spec pre-dates that copy change and
  // was never re-validated because it was skipped).
  await expect(page.getByRole('link', { name: /compare plans/i })).toBeVisible();

  // Dimension labels (Speed, Consistency, Data Quality, Standardization) must be absent
  await expect(page.getByText(/^Speed$/)).not.toBeVisible();
  await expect(page.getByText(/^Consistency$/)).not.toBeVisible();
  await expect(page.getByText(/^Data Quality$/)).not.toBeVisible();
  await expect(page.getByText(/^Standardization$/)).not.toBeVisible();

  // The lock icon is aria-hidden but its sibling text is "See score by dimension" (row #197)
  const lockContainer = page.getByText(/see score by dimension/i).locator('..');
  await expect(lockContainer).toBeVisible();

  await context.close();
});

test('Free user: upgrade path is accessible — CTA link points to /pricing', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: './e2e/.auth/free-user.json',
  });
  const page = await context.newPage();

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  const hasRows = await waitForWorkflowRows(page);
  expect(hasRows, 'expected free-tier seed workflows to render').toBe(true);

  const firstRow = page
    .getByRole('table', { name: 'Workflows' })
    .locator(DATA_ROW_SELECTOR)
    .first();

  // Open the health score tooltip (see row #195 note above re: button vs td locator)
  await firstRow.locator('button[aria-label^="Health score:"]').click();

  const upgradeLink = page.getByRole('link', { name: /compare plans/i });
  await expect(upgradeLink).toBeVisible();
  await expect(upgradeLink).toHaveAttribute('href', '/pricing');

  await context.close();
});

// ── Starter+ (growth) breakdown ───────────────────────────────────────────────

test('Starter+ user: health score breakdown tooltip shows all 4 dimensions', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  const hasRows = await waitForWorkflowRows(page);

  // Row #195: the growth-plan user is seeded with 5 workflows.
  expect(hasRows, 'expected growth-plan seed workflows to render').toBe(true);

  const firstRow = page
    .getByRole('table', { name: 'Workflows' })
    .locator(DATA_ROW_SELECTOR)
    .first();

  // Click the health-score button to open the tooltip (see row #195 note above)
  await firstRow.locator('button[aria-label^="Health score:"]').click();

  // Full breakdown must show all 4 honest dimension labels (PRD §7 naming note)
  await expect(page.getByText('Speed')).toBeVisible();
  await expect(page.getByText('Consistency')).toBeVisible();
  await expect(page.getByText('Data Quality')).toBeVisible();
  await expect(page.getByText('Standardization')).toBeVisible();

  // Upgrade copy must NOT appear for a Starter+ user
  // A paid user must NOT see the gated lead line (row #197 renamed it).
  await expect(page.getByText(/see score by dimension/i)).not.toBeVisible();
});

// ── Plan gating structural assertion (no rows needed) ─────────────────────────

test('Health Score column header is present in the table for authenticated user', async ({ page }) => {
  // This confirms the column exists and plan-gating did not remove it entirely
  // (D8 confirmed: integer is ungated; breakdown is gated; column is never hidden).
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table.locator('thead').getByRole('columnheader', { name: /health score/i })).toBeVisible();
});

test('Opportunity column header is present for authenticated user (ungated per D8)', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table.locator('thead').getByRole('columnheader', { name: /opportunity/i })).toBeVisible();
});
