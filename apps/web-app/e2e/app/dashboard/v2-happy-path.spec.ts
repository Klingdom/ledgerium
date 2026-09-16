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
 * The seed user (e2e@ledgerium.test) has 5 seeded workflows (row #195,
 * see e2e/seed-test-db.js) — one per OpportunityTag, with distinct
 * healthScore.overall values, so row-click / sort / filter / kebab tests
 * below exercise real rows rather than an empty state.
 * State-machine and plan-gating scenarios live in their own spec files.
 */

import { test, expect } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

/**
 * Row #195: the `<tr>` for a workflow row is no longer keyboard-focusable in
 * its own right (atglance-review #18 removed `tabIndex={0}` — keyboard
 * navigation now flows through the per-cell buttons). The stable identifier
 * is the `id="wf-row-<workflowId>"` attribute WorkflowRow always sets, so
 * every locator below selects data rows via that prefix instead of the
 * stale `tr[tabindex="0"]` selector.
 */
const DATA_ROW_SELECTOR = 'tbody tr[id^="wf-row-"]';

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

test('Command Header renders time range selector defaulting to "All time"', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  const selector = page.getByRole('combobox', { name: 'Time range' });
  await expect(selector).toBeVisible();

  // Row #200 triage: this asserted '30d' (the original D7 / PRD §5.1 default)
  // and had been failing unnoticed since iter-067, which deliberately changed
  // the default to 'all' per CEO Signal 1 / WDC2-P03 — see the comment at
  // DashboardV2Shell.tsx:228 and the state at :232. A process-intelligence
  // library should open on the whole event log, not a rolling window. Stale
  // test, not a regression.
  await expect(selector).toHaveValue('all');
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

test('clicking first workflow row navigates to /workflows/[id]', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const table = page.getByRole('table', { name: 'Workflows' });
  const firstRow = table.locator(DATA_ROW_SELECTOR).first();
  await firstRow.waitFor({ state: 'visible', timeout: 10_000 });

  await firstRow.click();

  await page.waitForURL(/\/workflows\/[^/]+/, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/workflows\/[^/]+/);
});

// ── Sort ─────────────────────────────────────────────────────────────────────

test('sorting by Health Score asc then desc changes row order', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const table = page.getByRole('table', { name: 'Workflows' });
  // Row #195 finding: `aria-sort` lives on the `<th scope="col">` (the
  // columnheader), NOT on the nested `<SortButton>` — WorkflowList.tsx sets
  // `aria-sort={sortAriaValue(...)}` on the `<th>` and renders the button as
  // a child. Click the button to trigger the sort; assert `aria-sort` on the
  // columnheader.
  const healthScoreColumnHeader = table
    .locator('thead')
    .getByRole('columnheader', { name: /health score/i });
  const healthScoreHeader = healthScoreColumnHeader.getByRole('button', { name: /health score/i });

  // The health-score value lives in the button's own aria-label
  // ("Health score: N, <band>[, ...]. Show breakdown."), not in generic cell
  // text — reading it directly is robust to column-order changes (row #195
  // finding: dynamic columns (D+4 picker) now sit between the title and the
  // health-score cell, so a positional `td.nth(N)` locator is not stable).
  const getFirstScore = async () => {
    const firstRowScoreBtn = table
      .locator(DATA_ROW_SELECTOR)
      .first()
      .locator('button[aria-label^="Health score:"]');
    const label = await firstRowScoreBtn.getAttribute('aria-label');
    const match = label?.match(/Health score: (\d+)/);
    return match ? match[1] : null;
  };

  // Default sort is date_recorded desc (Batch A P0 item 3) — the Health
  // Score header starts unselected (aria-sort="none"). The first click on an
  // unselected sortable header activates it ascending (see
  // WorkflowList.handleSort: a field switch always starts at 'asc').
  const scoreBefore = await getFirstScore();

  await healthScoreHeader.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'ascending');
  const scoreAfterAsc = await getFirstScore();

  await healthScoreHeader.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'descending');
  const scoreAfterDesc = await getFirstScore();

  await healthScoreHeader.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'ascending');
  const scoreAfterAscAgain = await getFirstScore();

  // Seeded fixtures have 5 distinct healthScore.overall values (10/50/55/83/95)
  // — asc vs desc must show different top rows, and the round trip back to
  // asc must reproduce the original top row.
  expect(scoreAfterAsc).not.toBe(scoreAfterDesc);
  expect(scoreAfterAscAgain).toBe(scoreAfterAsc);
  // scoreBefore reflects the default date_recorded-desc order, which is not
  // guaranteed to differ from the asc health-score order — no assertion on
  // scoreBefore beyond confirming a row was present to read from.
  expect(scoreBefore).not.toBeNull();
});

// Sort headers aria-sort attribute can be validated without rows.
//
// Row #200 triage — both tests below were asserting against the wrong element
// AND the wrong default, and had been failing unnoticed:
//   1. `aria-sort` belongs on the `<th scope="col">` (the columnheader), not on
//      the nested sort `<button>`. WorkflowList.tsx says so at :362 and
//      :382-383, and applies `aria-sort={sortAriaValue(...)}` to the `<th>`.
//   2. The default sort is `date_recorded` desc (DashboardV2Shell.tsx:265,
//      Batch A P0 item 3), not health_score asc — so an unselected Health Score
//      header starts at `none`, and its first click sorts ascending.
// Both are stale tests, not product regressions.
test('Health Score column header starts unsorted (aria-sort="none")', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const healthScoreColumnHeader = page
    .getByRole('table', { name: 'Workflows' })
    .locator('thead')
    .getByRole('columnheader', { name: /health score/i });

  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'none');
});

test('clicking Health Score sort header toggles aria-sort ascending then descending', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const healthScoreColumnHeader = page
    .getByRole('table', { name: 'Workflows' })
    .locator('thead')
    .getByRole('columnheader', { name: /health score/i });
  const healthScoreBtn = healthScoreColumnHeader.getByRole('button', { name: /health score/i });

  // Switching to a new sort field always starts ascending (WorkflowList.handleSort).
  await healthScoreBtn.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'ascending');

  await healthScoreBtn.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'descending');
});

// ── Filter by tag ─────────────────────────────────────────────────────────────

test('filter by opportunity tag shows filtered subset', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Row #195 finding: WorkflowListFilterBar (with the opportunity combobox)
  // no longer renders inline in the list — Batch C item 13 moved it into a
  // collapsible panel behind the toolbar's "Toggle filters" button
  // (UnifiedToolbar.tsx). The panel must be opened before the combobox
  // exists in the DOM.
  await page.getByRole('button', { name: /toggle filters/i }).click();

  // Select "Monitor" from the opportunity filter
  const opportunityFilter = page.getByRole('combobox', { name: /filter by opportunity/i });
  await opportunityFilter.selectOption('monitor');

  // Active filter chip should appear for "Monitor"
  await expect(page.getByText('Monitor').first()).toBeVisible();

  // Table should now show only rows with Monitor tag OR no-results state.
  // Seeded fixtures have exactly one 'monitor'-tagged row (row #195).
  const table = page.getByRole('table', { name: 'Workflows' });
  const rows = table.locator('tbody tr[id^="wf-row-"]');
  const noResults = page.getByText(/no workflows match your filters/i);

  const hasRows = (await rows.count()) > 0;
  const hasNoResults = await noResults.isVisible();
  expect(hasRows || hasNoResults).toBe(true);
  if (hasRows) {
    await expect(rows).toHaveCount(1);
    // Scope to the opportunity chip's aria-label rather than getByText('Monitor')
    // — the row title text can legitimately contain the word "Monitor" too,
    // which would make a plain text locator ambiguous (strict-mode violation).
    await expect(rows.first().locator('[aria-label="Opportunity: Monitor"]')).toBeVisible();
  }

  // Clear filter — the visible "Clear all" lives in ActiveFiltersBar (the
  // filter panel's own internal "Clear all" renders a second, duplicate
  // button by name while the panel is open — scope to the named region to
  // keep this locator unambiguous).
  const clearBtn = page
    .getByRole('region', { name: 'Active filters' })
    .getByRole('button', { name: /clear all/i });
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await expect(opportunityFilter).toHaveValue('');
  }
});

// ── Kebab menu keyboard accessibility ─────────────────────────────────────────

test('kebab menu opens with keyboard Enter, closes with Escape, returns focus to trigger', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const table = page.getByRole('table', { name: 'Workflows' });
  const firstRow = table.locator(DATA_ROW_SELECTOR).first();
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

  // Escape closes menu and focus returns to trigger (MDR-P08 centralized
  // Escape dispatch — closed iter-041 — restores focus to the kebab button).
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();

  // Focus should return to the kebab button or the row
  // (WCAG 2.1 SC 3.2.2 — closing a menu must not discard focus)
  const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  expect(focusedElement).toMatch(/Actions for/i);
});
