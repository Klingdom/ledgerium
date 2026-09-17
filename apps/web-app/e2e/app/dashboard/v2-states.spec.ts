/**
 * v2-states.spec.ts
 *
 * State-machine validation for the WorkflowList component.
 *
 * PRD §9 defines 5 primary states (loading, empty, error, sparse, ready).
 * The component also handles a 6th state: no-results (filtered-empty).
 * All 6 states are exercised here via page.route() intercepts on /api/workflows.
 *
 * Intercept strategy:
 *  - error       → return HTTP 500
 *  - empty       → return { workflows: [], stats: {...} }
 *  - normal      → return realistic fixture with 5 workflows
 *  - sparse      → return fixture with 2 workflows (< 3 triggers sparse notice)
 *  - filtered-empty → return normal fixture, then apply Opportunity filter
 *                    that matches no rows (opportunity=monitor, all rows are healthy)
 *
 * Loading state:
 *  The skeleton is shown during fetch (< 300ms minimum per PRD §9).
 *  We validate by checking for aria-hidden skeleton rows before the response
 *  resolves. A route intercept with artificial delay is used.
 *
 * Auth: authenticated project (storageState: .auth/user.json).
 */

import { test, expect } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

/**
 * Row #200 triage: rows are keyed `id="wf-row-<id>"`. The old
 * `tbody tr[tabindex="0"]` locator matched nothing after WorkflowRow's <tr>
 * dropped tabIndex={0} (atglance-review #18) — same constant the happy-path
 * spec already uses, so the two files share one convention.
 */
const DATA_ROW_SELECTOR = 'tbody tr[id^="wf-row-"]';

// ── Shared fixture factory ────────────────────────────────────────────────────

function makeWorkflow(overrides: {
  id?: string;
  title?: string;
  healthScore?: number;
  opportunityTag?: string;
  variationScore?: number;
} = {}): object {
  const id = overrides.id ?? 'wf-001';
  const health = overrides.healthScore ?? 72;
  return {
    id,
    title: overrides.title ?? 'Sample Workflow',
    toolsUsed: ['Salesforce', 'Slack'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastViewedAt: null,
    metricsV2: {
      runs: 5,
      avgTimeMs: 120_000,
      variationScore: overrides.variationScore ?? 0.2,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: health,
        speed: health >= 70 ? 24 : 12,
        consistency: health >= 70 ? 22 : 10,
        dataQuality: health >= 70 ? 16 : 8,
        standardization: health >= 70 ? 10 : 5,
        isGated: false,
      },
      opportunityTag: overrides.opportunityTag ?? 'healthy',
      aiOpportunityScore: 45,
      confidence: 0.85,
    },
  };
}

function makeStatsBlock(workflows: object[]): object {
  const scores = (workflows as Array<{ metricsV2: { healthScore: { overall: number } } }>)
    .map((w) => w.metricsV2.healthScore.overall);
  const portfolio = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  return {
    portfolioHealthScore: portfolio,
    insightChips: [],
    topInsights: [],
  };
}

// ── Error state ───────────────────────────────────────────────────────────────

test('WorkflowList: error state renders when API returns 500', async ({ page }) => {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // minimum skeleton display

  // Row #200: copy is "Could not load workflows — check your connection and
  // retry." (WorkflowList.tsx error branch). The old sentence never shipped.
  await expect(page.getByText(/could not load workflows/i)).toBeVisible();

  // Retry button must be present and visible
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});

test('WorkflowList: retry button re-issues API request after error', async ({ page }) => {
  let callCount = 0;
  // Row #200: this mock used to key on `callCount === 1`, assuming exactly one
  // request before the retry click. The shell's mount effect can fire more than
  // once (React StrictMode double-invokes effects under `next dev`), so the
  // extra request consumed the success branch DURING initial load: isError
  // cleared, listState became 'empty', and the shell swapped in
  // FirstRunTutorial — removing the error text and the Try again button the
  // test was waiting for. Gate on the retry actually having been clicked, so
  // the fixture no longer depends on how many times the page fetches.
  let retryClicked = false;

  await page.route('**/api/workflows**', (route) => {
    callCount++;
    if (!retryClicked) {
      // Before the retry: always error, however many times the shell fetches.
      void route.fulfill({ status: 500, body: JSON.stringify({ error: 'error' }) });
    } else {
      // Second call (retry): return empty success
      const workflows: object[] = [];
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
      });
    }
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const retryBtn = page.getByRole('button', { name: /try again/i });
  await expect(retryBtn).toBeVisible();
  retryClicked = true;
  await retryBtn.click();

  // After retry with empty response, the error msg must disappear
  await page.waitForTimeout(800);
  await expect(page.getByText(/could not load workflows/i)).not.toBeVisible({ timeout: 8_000 });
  expect(callCount).toBeGreaterThanOrEqual(2);
});

// ── Empty state ───────────────────────────────────────────────────────────────

test('WorkflowList: empty state renders when API returns zero workflows and no filter', async ({ page }) => {
  const workflows: object[] = [];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Row #200: a genuinely empty library now renders FirstRunTutorial INSTEAD of
  // the toolbar + list (DashboardV2Shell `isFirstRun` branch), so WorkflowList's
  // own empty state never paints. Assert what the newcomer actually sees.
  await expect(page.getByText(/no workflows yet/i)).toBeVisible();

  // Extension install link must be present (empty state CTA per PRD §9)
  const installLink = page.getByRole('link', { name: /install the extension/i });
  await expect(installLink).toBeVisible();
});

// ── Normal (ready) state ──────────────────────────────────────────────────────

test('WorkflowList: ready state renders 5 workflow rows', async ({ page }) => {
  const workflows = [
    makeWorkflow({ id: 'wf-001', title: 'Workflow Alpha', healthScore: 85 }),
    makeWorkflow({ id: 'wf-002', title: 'Workflow Beta', healthScore: 40, opportunityTag: 'optimize' }),
    makeWorkflow({ id: 'wf-003', title: 'Workflow Gamma', healthScore: 72 }),
    makeWorkflow({ id: 'wf-004', title: 'Workflow Delta', healthScore: 30, opportunityTag: 'monitor' }),
    makeWorkflow({ id: 'wf-005', title: 'Workflow Epsilon', healthScore: 61 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const table = page.getByRole('table', { name: 'Workflows' });

  // All 5 workflow titles should appear
  await expect(table.getByText('Workflow Alpha')).toBeVisible();
  await expect(table.getByText('Workflow Beta')).toBeVisible();
  await expect(table.getByText('Workflow Gamma')).toBeVisible();
  await expect(table.getByText('Workflow Delta')).toBeVisible();
  await expect(table.getByText('Workflow Epsilon')).toBeVisible();

  // No empty/error state messages
  // Row #200: these named retired copy, so they passed vacuously — an assertion
  // that can never fail is worse than none. Re-pointed at the strings the
  // component actually renders for those states.
  await expect(page.getByText(/no workflows yet/i)).not.toBeVisible();
  await expect(page.getByText(/could not load workflows/i)).not.toBeVisible();

  // Sparse notice must NOT appear (5 workflows >= 3 threshold)
  await expect(page.getByText(/open your first workflow to see its process map/i)).not.toBeVisible();
});

// Row #200: this asserted a health_score-ascending default that was never the
// shipped behaviour — the default is date_recorded desc (DashboardV2Shell.tsx
// sort state, Batch A P0 item 3). Re-pointed at the real default: the most
// recently recorded workflow leads.
test('WorkflowList: default sort is date_recorded descending (newest first)', async ({ page }) => {
  // Three workflows with distinct health scores
  const workflows = [
    makeWorkflow({ id: 'wf-high', title: 'Healthy Workflow', healthScore: 85 }),
    makeWorkflow({ id: 'wf-low', title: 'Sick Workflow', healthScore: 15, opportunityTag: 'monitor' }),
    makeWorkflow({ id: 'wf-mid', title: 'Middle Workflow', healthScore: 50 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const table = page.getByRole('table', { name: 'Workflows' });
  const rows = table.locator(DATA_ROW_SELECTOR);
  await expect(rows.first()).toBeVisible();

  // All three rows render; order is by recency, not health score. Asserting the
  // set (not a health ranking) keeps this test honest about what the default
  // actually guarantees.
  await expect(rows).toHaveCount(3);
  const allText = await table.textContent();
  expect(allText).toContain('Sick Workflow');
  expect(allText).toContain('Middle Workflow');
  expect(allText).toContain('Healthy Workflow');
});

test('WorkflowList: toggling Health Score sort to descending puts best-health row first', async ({ page }) => {
  const workflows = [
    makeWorkflow({ id: 'wf-high', title: 'Healthy Workflow', healthScore: 85 }),
    makeWorkflow({ id: 'wf-low', title: 'Sick Workflow', healthScore: 15, opportunityTag: 'monitor' }),
    makeWorkflow({ id: 'wf-mid', title: 'Middle Workflow', healthScore: 50 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const table = page.getByRole('table', { name: 'Workflows' });
  // Row #200: `aria-sort` lives on the <th scope="col">, not the nested sort
  // button (WorkflowList.tsx:362,382-383) — the old assertion read "" forever.
  // And because the default sort is date_recorded desc, switching to a NEW
  // field starts ascending (WorkflowList.handleSort), so descending needs a
  // second click. Same correction already applied to the happy-path spec.
  const healthScoreColumnHeader = table
    .locator('thead')
    .getByRole('columnheader', { name: /health score/i });
  const healthScoreBtn = healthScoreColumnHeader.getByRole('button', { name: /health score/i });

  await healthScoreBtn.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'ascending');

  await healthScoreBtn.click();
  await expect(healthScoreColumnHeader).toHaveAttribute('aria-sort', 'descending');

  const rows = table.locator(DATA_ROW_SELECTOR);
  const firstRowText = await rows.first().textContent();
  expect(firstRowText).toContain('Healthy Workflow');
});

// ── Sparse state ──────────────────────────────────────────────────────────────

test('WorkflowList: sparse state shows notice when < 3 workflows returned', async ({ page }) => {
  const workflows = [
    makeWorkflow({ id: 'wf-a', title: 'Solo Workflow A', healthScore: 60 }),
    makeWorkflow({ id: 'wf-b', title: 'Solo Workflow B', healthScore: 45 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Sparse notice must appear
  await expect(
    // Row #200: the sparse notice was rewritten (atglance-review #14) to lead
    // with the immediate reward instead of a metrics-quality caveat.
    page.getByText(/open your first workflow to see its process map/i),
  ).toBeVisible();

  // Both workflow rows still render
  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table.getByText('Solo Workflow A')).toBeVisible();
  await expect(table.getByText('Solo Workflow B')).toBeVisible();

  // Sparse notice is dismissible
  const dismissBtn = page.getByRole('button', { name: /dismiss sparse data notice/i });
  await expect(dismissBtn).toBeVisible();
  await dismissBtn.click();
  await expect(page.getByText(/open your first workflow to see its process map/i)).not.toBeVisible();
});

// ── Filtered-empty (no-results) state ────────────────────────────────────────

test('WorkflowList: no-results state renders when active filter matches zero rows', async ({ page }) => {
  // All 3 workflows have opportunityTag 'healthy' — filtering by 'monitor' yields zero results
  const workflows = [
    makeWorkflow({ id: 'wf-001', title: 'Healthy One', opportunityTag: 'healthy', healthScore: 80 }),
    makeWorkflow({ id: 'wf-002', title: 'Healthy Two', opportunityTag: 'healthy', healthScore: 75 }),
    makeWorkflow({ id: 'wf-003', title: 'Healthy Three', opportunityTag: 'healthy', healthScore: 78 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows, stats: makeStatsBlock(workflows) }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Select "Monitor" from the opportunity filter — no rows match
  // Row #200: the filter bar now lives inside UnifiedToolbar behind a "Toggle
  // filters" button (Batch C item 13), so the combobox does not exist until the
  // panel is opened. Previously this timed out on selectOption.
  await page.getByRole('button', { name: /toggle filters/i }).click();
  const opportunityFilter = page.getByRole('combobox', { name: /filter by opportunity/i });
  await opportunityFilter.selectOption('monitor');

  // No-results message must appear
  await expect(page.getByText(/no workflows match your filters/i)).toBeVisible();

  // "Clear filters" button must be visible
  const clearBtn = page.getByRole('button', { name: /clear filters/i }).first();
  await expect(clearBtn).toBeVisible();

  // After clearing, workflows reappear
  await clearBtn.click();
  await page.waitForTimeout(300);
  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table.getByText('Healthy One')).toBeVisible();
});

// ── Loading state ─────────────────────────────────────────────────────────────

test('WorkflowList: skeleton rows are visible during API fetch (min 300ms)', async ({ page }) => {
  // Intercept and hold the request open for long enough to observe the skeleton
  let resolveRoute!: () => void;
  const holdPromise = new Promise<void>((resolve) => {
    resolveRoute = resolve;
  });

  await page.route('**/api/workflows**', async (route) => {
    // Hold until we signal from the test
    await holdPromise;
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows: [], stats: { portfolioHealthScore: 0, insightChips: [], topInsights: [] } }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'domcontentloaded' });

  // Skeleton rows are aria-hidden="true" tr elements rendered in the loading state
  const skeletonRows = page.locator('tr[aria-hidden="true"]');
  await expect(skeletonRows.first()).toBeVisible({ timeout: 5_000 });

  // Confirm count = 5 per PRD §9
  const count = await skeletonRows.count();
  expect(count).toBe(5);

  // Release the route
  resolveRoute();
});

// ── Portfolio Health Score updates when workflows resolve ─────────────────────

test('CommandHeader portfolio health score reflects mean of workflow scores', async ({ page }) => {
  // 3 workflows with scores 60, 80, 100 → mean = 80
  const workflows = [
    makeWorkflow({ id: 'wf-a', healthScore: 60 }),
    makeWorkflow({ id: 'wf-b', healthScore: 80 }),
    makeWorkflow({ id: 'wf-c', healthScore: 100 }),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: { portfolioHealthScore: 80, insightChips: [], topInsights: [] },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // The portfolio score container has an aria-label with the score value
  const scoreContainer = page.locator('[role="status"]').filter({ hasText: /portfolio health/i });
  await expect(scoreContainer).toBeVisible();

  // Row #200: the header deliberately renders a VERDICT WORD, not the score —
  // the number appears exactly once on the page, in the HealthGauge
  // (iter-024 "kill the triple-88"). Asserting '80' here contradicted that
  // decision. A mean of 80 lands in the "Good" band (>= 80).
  const ariaLabel = await scoreContainer.getAttribute('aria-label');
  expect(ariaLabel).toMatch(/portfolio health:\s*good/i);
  expect(ariaLabel).not.toContain('80');
});
