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

  await expect(page.getByText(/something went wrong loading your workflows/i)).toBeVisible();

  // Retry button must be present and visible
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});

test('WorkflowList: retry button re-issues API request after error', async ({ page }) => {
  let callCount = 0;

  await page.route('**/api/workflows**', (route) => {
    callCount++;
    if (callCount === 1) {
      // First call: return error
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
  await retryBtn.click();

  // After retry with empty response, the error msg must disappear
  await page.waitForTimeout(800);
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 8_000 });
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

  await expect(page.getByText(/no workflows recorded yet/i)).toBeVisible();

  // Extension install link must be present (empty state CTA per PRD §9)
  const installLink = page.getByRole('link', { name: /install extension/i });
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
  await expect(page.getByText(/no workflows recorded yet/i)).not.toBeVisible();
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible();

  // Sparse notice must NOT appear (5 workflows >= 3 threshold)
  await expect(page.getByText(/metrics improve as more workflows/i)).not.toBeVisible();
});

test('WorkflowList: default sort is health_score ascending (worst first)', async ({ page }) => {
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
  const rows = table.locator('tbody tr[tabindex="0"]');
  await expect(rows.first()).toBeVisible();

  // With default ascending sort, the worst score (15) should appear first
  const firstRowText = await rows.first().textContent();
  expect(firstRowText).toContain('Sick Workflow');

  // The highest score should appear last
  const lastRowText = await rows.last().textContent();
  expect(lastRowText).toContain('Healthy Workflow');
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
  const healthScoreBtn = table.locator('thead').getByRole('button', { name: /health score/i });

  // Click once to toggle to descending
  await healthScoreBtn.click();
  await expect(healthScoreBtn).toHaveAttribute('aria-sort', 'descending');

  const rows = table.locator('tbody tr[tabindex="0"]');
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
    page.getByText(/metrics improve as more workflows are recorded/i),
  ).toBeVisible();

  // Both workflow rows still render
  const table = page.getByRole('table', { name: 'Workflows' });
  await expect(table.getByText('Solo Workflow A')).toBeVisible();
  await expect(table.getByText('Solo Workflow B')).toBeVisible();

  // Sparse notice is dismissible
  const dismissBtn = page.getByRole('button', { name: /dismiss sparse data notice/i });
  await expect(dismissBtn).toBeVisible();
  await dismissBtn.click();
  await expect(page.getByText(/metrics improve as more workflows/i)).not.toBeVisible();
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

  const ariaLabel = await scoreContainer.getAttribute('aria-label');
  expect(ariaLabel).toContain('80');
});
