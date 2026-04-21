/**
 * v2-plan-gating.spec.ts
 *
 * Plan-gating validation for the Dashboard V2 Health Score column.
 *
 * PRD §12 / D8 policy:
 *  - Free tier: Health Score integer visible (ungated). Breakdown tooltip is
 *    gated — shows lock icon + "Upgrade to see breakdown" + "View plans →" link.
 *  - Starter+ (growth plan): breakdown tooltip shows Speed / Consistency /
 *    Data Quality / Standardization dimensions.
 *
 * Test accounts:
 *  - e2e@ledgerium.test     → plan: 'growth'  (Starter+ equiv, full breakdown)
 *  - free@ledgerium.test    → plan: 'free'    (gated breakdown)
 *
 * IMPORTANT: The 'free' test user does not exist in the current seed
 * (seed-test-db.js only creates 'growth' plan users). Both plan-gating tests
 * that require a Free user are marked test.skip until the seed is updated.
 * The growth-plan breakdown test runs against the existing auth user.
 *
 * Auth: authenticated project (storageState: .auth/user.json).
 * Plan-gating tests requiring free-user auth use a separate storage state
 * (./e2e/.auth/free-user.json) which does not yet exist — hence the skips.
 */

import { test, expect, type Page } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

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
    const rows = table.locator('tbody tr[tabindex="0"]');
    await rows.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// ── Free-tier gating ──────────────────────────────────────────────────────────

test.skip(
  'Free user: Health Score integer is visible in the column',
  // SKIP REASON: Free-tier test user (free@ledgerium.test) not present in seed.
  // seed-test-db.js must be updated to create a user with plan: 'free' and
  // corresponding storageState at e2e/.auth/free-user.json.
  // FOLLOW-UP: "Add free-tier test user to e2e seed for plan-gating coverage"
  async ({ browser }) => {
    const context = await browser.newContext({
      storageState: './e2e/.auth/free-user.json',
    });
    const page = await context.newPage();

    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    const hasRows = await waitForWorkflowRows(page);

    if (!hasRows) {
      test.skip(); // No rows to assert against — benign skip
      return;
    }

    // Health Score integer must be visible in the first row
    const firstRow = page
      .getByRole('table', { name: 'Workflows' })
      .locator('tbody tr[tabindex="0"]')
      .first();

    // The cell aria-label pattern is "Health score: [N], [poor|fair|good]"
    const healthCell = firstRow.locator('[aria-label*="Health score:"]');
    await expect(healthCell).toBeVisible();

    await context.close();
  },
);

test.skip(
  'Free user: health score breakdown tooltip shows upgrade CTA, not dimension breakdown',
  // SKIP REASON: Free-tier test user not in seed. Same prerequisite as above.
  async ({ browser }) => {
    const context = await browser.newContext({
      storageState: './e2e/.auth/free-user.json',
    });
    const page = await context.newPage();

    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    const hasRows = await waitForWorkflowRows(page);

    if (!hasRows) {
      test.skip();
      return;
    }

    const firstRow = page
      .getByRole('table', { name: 'Workflows' })
      .locator('tbody tr[tabindex="0"]')
      .first();

    // Click the health score cell (4th column) to open tooltip
    const healthCell = firstRow.locator('td').nth(3);
    await healthCell.click();

    // Gated tooltip: must show upgrade copy, must NOT show breakdown dimensions
    await expect(page.getByText(/upgrade to see breakdown/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view plans/i })).toBeVisible();

    // Dimension labels (Speed, Consistency, Data Quality, Standardization) must be absent
    await expect(page.getByText(/^Speed$/)).not.toBeVisible();
    await expect(page.getByText(/^Consistency$/)).not.toBeVisible();
    await expect(page.getByText(/^Data Quality$/)).not.toBeVisible();
    await expect(page.getByText(/^Standardization$/)).not.toBeVisible();

    // The lock icon is aria-hidden but its sibling text is "Upgrade to see breakdown"
    const lockContainer = page.locator('[data-tooltip-type="gated"]').or(
      page.getByText(/upgrade to see breakdown/i).locator('..'),
    );
    await expect(lockContainer).toBeVisible();

    await context.close();
  },
);

test.skip(
  'Free user: upgrade path is accessible — CTA link points to /pricing',
  // SKIP REASON: Free-tier test user not in seed.
  async ({ browser }) => {
    const context = await browser.newContext({
      storageState: './e2e/.auth/free-user.json',
    });
    const page = await context.newPage();

    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    const hasRows = await waitForWorkflowRows(page);

    if (!hasRows) {
      test.skip();
      return;
    }

    const firstRow = page
      .getByRole('table', { name: 'Workflows' })
      .locator('tbody tr[tabindex="0"]')
      .first();

    // Open the health score tooltip
    await firstRow.locator('td').nth(3).click();

    const upgradeLink = page.getByRole('link', { name: /view plans/i });
    await expect(upgradeLink).toBeVisible();
    await expect(upgradeLink).toHaveAttribute('href', '/pricing');

    await context.close();
  },
);

// ── Starter+ (growth) breakdown ───────────────────────────────────────────────

test.skip(
  'Starter+ user: health score breakdown tooltip shows all 4 dimensions',
  // SKIP REASON: The growth-plan user (e2e@ledgerium.test) exists but has no
  // seeded workflows. The health score cell tooltip requires a row to click.
  // Un-skip after seedDashboardV2Dev() fixtures are merged.
  async ({ page }) => {
    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    const hasRows = await waitForWorkflowRows(page);

    if (!hasRows) {
      test.skip();
      return;
    }

    const firstRow = page
      .getByRole('table', { name: 'Workflows' })
      .locator('tbody tr[tabindex="0"]')
      .first();

    // Click health score cell (4th column) to open tooltip
    const healthCell = firstRow.locator('td').nth(3);
    await healthCell.click();

    // Full breakdown must show all 4 honest dimension labels (PRD §7 naming note)
    await expect(page.getByText('Speed')).toBeVisible();
    await expect(page.getByText('Consistency')).toBeVisible();
    await expect(page.getByText('Data Quality')).toBeVisible();
    await expect(page.getByText('Standardization')).toBeVisible();

    // Upgrade copy must NOT appear for a Starter+ user
    await expect(page.getByText(/upgrade to see breakdown/i)).not.toBeVisible();
  },
);

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
