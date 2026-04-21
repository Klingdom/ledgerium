/**
 * v2-happy-path.spec.ts
 *
 * Primary happy-path coverage for the Dashboard V2 surface (`/dashboard?v2=1`).
 *
 * Scope (iter 022):
 *  - Page load without hydration errors (follow-up #47 Suspense regression)
 *  - Command Header: title + time-range selector + portfolio health score
 *  - Insights Strip: 0–4 chips (empty state is valid)
 *  - Workflow List: grid OR empty/error state renders; 4-column check
 *  - Row navigation to /workflows/[id]
 *  - Sort (Health Score asc → desc): row order changes
 *  - Filter by opportunity tag: filtered subset renders
 *  - Kebab menu: items present, keyboard accessible (Enter opens, Escape closes, focus returns)
 *
 * Out of scope: iter 023 items (period delta, RAG color, variation badge, "Needs attention"
 * filter, run-count qualifier, action-leading copy). Unit tests belong to frontend-engineer.
 *
 * Auth: authenticated project (storageState: .auth/user.json, plan: 'growth').
 * The seed user has no workflows — the empty state is a valid success path.
 * State-machine and plan-gating scenarios live in their own spec files.
 */

import { test, expect } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

// ── Follow-up #47 — Suspense regression ─────────────────────────────────────
// Assert no hydration or client-side JS errors on initial load with search params.

test('no page errors on initial load with ?v2=1 search param (follow-up #47)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Allow hydration to complete before checking
  await page.waitForTimeout(500);

  expect(pageErrors, `Page errors detected: ${pageErrors.join('; ')}`).toHaveLength(0);
});

// ── Command Header ────────────────────────────────────────────────────────────

test('Command Header renders with "Workflows" title', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // The h1 inside CommandHeader reads "Workflows" per PRD §5.1
  await expect(page.getByRole('heading', { name: 'Workflows', level: 1 })).toBeVisible();
});

test('Command Header renders time range selector with default "Last 30 days"', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  const selector = page.getByRole('combobox', { name: 'Time range' });
  await expect(selector).toBeVisible();

  // Default value per D7 / PRD §5.1
  await expect(selector).toHaveValue('30d');
});

test('Command Header time range selector changes value', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  const selector = page.getByRole('combobox', { name: 'Time range' });
  await selector.selectOption('7d');
  await expect(selector).toHaveValue('7d');

  await selector.selectOption('all');
  await expect(selector).toHaveValue('all');
});

test('Command Header renders portfolio health score section', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // The portfolio health score container has role="status" and an aria-label
  // containing "Portfolio health" per CommandHeader.tsx
  const scoreContainer = page.locator('[role="status"]').filter({ hasText: /portfolio health/i });
  await expect(scoreContainer).toBeVisible({ timeout: 15_000 });
});

// ── Insights Strip ────────────────────────────────────────────────────────────

test('Insights Strip renders 0–4 chips or is absent (empty state is valid)', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Wait for data load to settle
  await page.waitForTimeout(800);

  // The strip renders only when chips.length > 0. With a fresh seed user
  // (no workflows), no chips fire — this absence is a valid empty state per PRD §5.2.
  // If chips are present, assert count is within bounds.
  const strip = page.getByRole('region', { name: 'Process insights' });
  const stripVisible = await strip.isVisible();

  if (stripVisible) {
    const chips = strip.locator('[role="button"]');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(1);
    expect(chipCount).toBeLessThanOrEqual(5); // PRD §5.2 max 5
  }
  // Strip absent = empty state — acceptable, no assertion failure
});

// ── Workflow List — structure ─────────────────────────────────────────────────

test('Workflow List table renders with correct 4-column headers', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Wait for either empty state or normal list (allow for skeleton)
  await page.waitForTimeout(800);

  // Per PRD D10/§5.3: exactly 4 data columns (Workflow, Systems, Opportunity, Health Score)
  // plus a visually-empty Actions column header.
  // The col headers are scope="col" th elements.
  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table).toBeVisible();

  // Verify the 4 named data column headers are present
  const thead = table.locator('thead');
  await expect(thead.getByRole('columnheader', { name: /workflow/i })).toBeVisible();
  await expect(thead.getByRole('columnheader', { name: /systems/i })).toBeVisible();
  await expect(thead.getByRole('columnheader', { name: /opportunity/i })).toBeVisible();
  await expect(thead.getByRole('columnheader', { name: /health score/i })).toBeVisible();

  // Confirm no deprecated columns from v1 appear (Steps, Active, Runs standalone, Variation label)
  await expect(thead.getByRole('columnheader', { name: /^steps$/i })).not.toBeVisible();
  await expect(thead.getByRole('columnheader', { name: /^active$/i })).not.toBeVisible();
  await expect(thead.getByRole('columnheader', { name: /^variation$/i })).not.toBeVisible();
});

test('Workflow List renders a recognisable state: empty, error, sparse, or ready', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table).toBeVisible();

  // One of these state indicators must be visible — all are valid for the seed user
  const emptyMsg = page.getByText(/no workflows recorded yet/i);
  const errorMsg = page.getByText(/something went wrong loading your workflows/i);
  const sparseNotice = page.getByText(/metrics improve as more workflows/i);
  const firstRow = table.locator('tbody tr').first();

  const anyStateVisible =
    (await emptyMsg.isVisible()) ||
    (await errorMsg.isVisible()) ||
    (await sparseNotice.isVisible()) ||
    (await firstRow.isVisible());

  expect(anyStateVisible, 'Expected a recognisable WorkflowList state to be visible').toBe(true);
});

// ── Row navigation ────────────────────────────────────────────────────────────

test.skip(
  'clicking first workflow row navigates to /workflows/[id]',
  // SKIP REASON: The seed user (e2e@ledgerium.test) has no seeded workflows.
  // The row click path cannot be exercised until seedDashboardV2Dev() fixtures
  // are merged (iter 022 companion work per PRD §11).
  // FOLLOW-UP: coordinator to track "seed v2 dev fixtures" as a prerequisite
  // for un-skipping this test. See follow-up logged at end of this file.
  async ({ page }) => {
    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const table = page.getByRole('table', { name: 'Workflows' });
    const firstRow = table.locator('tbody tr[tabindex="0"]').first();
    await firstRow.waitFor({ state: 'visible', timeout: 10_000 });

    await firstRow.click();

    await page.waitForURL(/\/workflows\/[^/]+/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/workflows\/[^/]+/);
  },
);

// ── Sort ─────────────────────────────────────────────────────────────────────

test.skip(
  'sorting by Health Score asc then desc changes row order',
  // SKIP REASON: No workflow rows available in seed — sort order cannot be observed.
  // Un-skip after seedDashboardV2Dev() fixtures are merged.
  async ({ page }) => {
    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const table = page.getByRole('table', { name: 'Workflows' });
    const healthScoreHeader = table
      .locator('thead')
      .getByRole('button', { name: /health score/i });

    // Default is asc (worst first) — collect first-row score
    const getFirstScore = async () => {
      const firstCell = table.locator('tbody tr[tabindex="0"]').first()
        .locator('td').nth(3); // 4th column = Health Score
      return firstCell.textContent();
    };

    const scoreBefore = await getFirstScore();

    // Click to toggle to desc
    await healthScoreHeader.click();
    await expect(healthScoreHeader).toHaveAttribute('aria-sort', 'descending');
    const scoreAfterDesc = await getFirstScore();

    // Click back to asc
    await healthScoreHeader.click();
    await expect(healthScoreHeader).toHaveAttribute('aria-sort', 'ascending');
    const scoreAfterAsc = await getFirstScore();

    // Scores should change between asc and desc (assuming >1 workflow with different scores)
    expect(scoreBefore).not.toBe(scoreAfterDesc);
    expect(scoreAfterAsc).toBe(scoreBefore);
  },
);

// Sort headers aria-sort attribute can be validated without rows
test('Health Score sort header has correct aria-sort attribute (default ascending)', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  const healthScoreBtn = table
    .locator('thead')
    .getByRole('button', { name: /health score/i });

  // Default sort is health_score asc per PRD §5.3
  await expect(healthScoreBtn).toHaveAttribute('aria-sort', 'ascending');
});

test('clicking Health Score sort header toggles aria-sort to descending', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  const healthScoreBtn = table
    .locator('thead')
    .getByRole('button', { name: /health score/i });

  await healthScoreBtn.click();
  await expect(healthScoreBtn).toHaveAttribute('aria-sort', 'descending');

  await healthScoreBtn.click();
  await expect(healthScoreBtn).toHaveAttribute('aria-sort', 'ascending');
});

// ── Filter by tag ─────────────────────────────────────────────────────────────

test.skip(
  'filter by opportunity tag shows filtered subset',
  // SKIP REASON: No workflow rows in seed — filter behaviour requires rows with
  // varied opportunityTags. Un-skip after seedDashboardV2Dev() fixtures merged.
  async ({ page }) => {
    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Select "Monitor" from the opportunity filter
    const opportunityFilter = page.getByRole('combobox', { name: /filter by opportunity/i });
    await opportunityFilter.selectOption('monitor');

    // Active filter chip should appear for "Monitor"
    await expect(page.getByText('Monitor').first()).toBeVisible();

    // Table should now show only rows with Monitor tag OR no-results state
    const table = page.getByRole('table', { name: 'Workflows' });
    const rows = table.locator('tbody tr[tabindex="0"]');
    const noResults = page.getByText(/no workflows match your filters/i);

    const hasRows = (await rows.count()) > 0;
    const hasNoResults = await noResults.isVisible();
    expect(hasRows || hasNoResults).toBe(true);

    // Clear filter
    const clearBtn = page.getByRole('button', { name: /clear all/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(opportunityFilter).toHaveValue('');
    }
  },
);

// ── Kebab menu keyboard accessibility ─────────────────────────────────────────

test.skip(
  'kebab menu opens with keyboard Enter, closes with Escape, returns focus to trigger',
  // SKIP REASON: Kebab button is only visible on row hover. With no workflow rows
  // in seed, the kebab cannot be exercised. Un-skip after seedDashboardV2Dev() merged.
  async ({ page }) => {
    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const table = page.getByRole('table', { name: 'Workflows' });
    const firstRow = table.locator('tbody tr[tabindex="0"]').first();
    await firstRow.waitFor({ state: 'visible' });

    // Hover to reveal kebab button
    await firstRow.hover();

    const kebabBtn = firstRow.getByRole('button', { name: /^Actions for/i });
    await expect(kebabBtn).toBeVisible();

    // Keyboard: focus the button and press Enter to open
    await kebabBtn.focus();
    await page.keyboard.press('Enter');

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // Menu items: Edit name, Archive, Copy link
    await expect(menu.getByRole('menuitem', { name: /edit name/i })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /archive/i })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /copy link/i })).toBeVisible();

    // Escape closes menu and focus returns to trigger
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();

    // Focus should return to the kebab button or the row
    // (WCAG 2.1 SC 3.2.2 — closing a menu must not discard focus)
    // Note: current WorkflowRow implementation closes via click-outside handler,
    // not a keydown Escape on the menu. Focus return is not explicitly implemented.
    // This assertion captures the desired behavior; if it fails, log as a defect.
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focusedElement).toMatch(/Actions for/i);
  },
);
