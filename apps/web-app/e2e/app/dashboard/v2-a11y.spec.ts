/**
 * v2-a11y.spec.ts
 *
 * Automated accessibility baseline for the Dashboard V2 surface.
 *
 * Tool: @axe-core/playwright (installed as devDependency in iter 022).
 *
 * Policy (PRD §10 + iter 022 QA scope):
 *  - FAIL build on: critical or serious violations (zero tolerance)
 *  - WARN only (logged, not failed): moderate violations
 *    Rationale: moderate violations may include known Tailwind/design-token
 *    issues that are tracked separately. Post-ship sweep targets zero moderate.
 *  - IGNORE: minor violations (cosmetic, low user impact)
 *
 * Test states exercised:
 *  1. Empty state (no workflows) — baseline page structure
 *  2. Normal state (5 workflows) — full table with rows
 *
 * Auth: authenticated project (storageState: .auth/user.json).
 *
 * Note on route intercepts: axe is run against the rendered DOM. The
 * /api/workflows intercept populates the table so axe can evaluate the
 * full table structure (headers, cells, ARIA attributes) rather than only
 * the empty-state skeleton.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const V2_URL = '/dashboard?v2=1';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeWorkflow(id: string, title: string, healthScore: number, opportunityTag: string): object {
  return {
    id,
    title,
    toolsUsed: ['Salesforce'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastViewedAt: null,
    metricsV2: {
      runs: 3,
      avgTimeMs: 90_000,
      variationScore: 0.3,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: healthScore,
        speed: 20,
        consistency: 20,
        dataQuality: 16,
        standardization: healthScore > 70 ? 14 : 8,
        isGated: false,
      },
      opportunityTag,
      aiOpportunityScore: 30,
      confidence: 0.82,
    },
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Runs axe against the current page and asserts:
 * - Zero critical violations (throws to fail the test)
 * - Zero serious violations (throws to fail the test)
 * - Logs moderate violations to the test output without failing
 */
async function assertAxeCompliance(page: import('@playwright/test').Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('#__next') // scope to Next.js root, excluding browser chrome
    .analyze();

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');
  const moderate = results.violations.filter((v) => v.impact === 'moderate');

  // Log moderate violations as warnings (non-blocking for this iteration)
  if (moderate.length > 0) {
    const moderateReport = moderate
      .map((v) => `  [moderate] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    console.warn(
      `\n[axe][${label}] ${moderate.length} MODERATE violation(s) — tracked, not blocking:\n${moderateReport}\n`,
    );
  }

  // Critical violations — FAIL
  if (critical.length > 0) {
    const report = critical
      .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`)
      .join('\n\n');
    expect.soft(critical.length, `[axe][${label}] CRITICAL violations:\n\n${report}`).toBe(0);
  }

  // Serious violations — FAIL
  if (serious.length > 0) {
    const report = serious
      .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`)
      .join('\n\n');
    expect.soft(serious.length, `[axe][${label}] SERIOUS violations:\n\n${report}`).toBe(0);
  }

  // Hard fail if any soft assertions accumulated
  expect(critical.length + serious.length, `[axe][${label}] ${critical.length} critical + ${serious.length} serious violation(s) — see above`).toBe(0);
}

// ── Test: empty state ─────────────────────────────────────────────────────────

test('axe: zero critical/serious violations on empty state (no workflows)', async ({ page }) => {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [],
        stats: { portfolioHealthScore: 0, insightChips: [], topInsights: [] },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Wait for skeleton to resolve (min 300ms per PRD §9)
  await page.waitForTimeout(700);

  await assertAxeCompliance(page, 'empty-state');
});

// ── Test: normal state (populated table) ─────────────────────────────────────

test('axe: zero critical/serious violations on normal state (5 workflows, full table)', async ({ page }) => {
  const workflows = [
    makeWorkflow('wf-001', 'Alpha Workflow', 85, 'healthy'),
    makeWorkflow('wf-002', 'Beta Workflow', 30, 'monitor'),
    makeWorkflow('wf-003', 'Gamma Workflow', 55, 'optimize'),
    makeWorkflow('wf-004', 'Delta Workflow', 72, 'automate'),
    makeWorkflow('wf-005', 'Epsilon Workflow', 40, 'standardize'),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: {
          portfolioHealthScore: 56,
          insightChips: [
            {
              id: 'chip-monitor',
              severity: 'warning',
              label: '1 workflow has low confidence and needs review',
              filterKey: 'opportunityTag_monitor',
              count: 1,
            },
          ],
          topInsights: [],
        },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Wait for full render including insights strip
  await page.waitForTimeout(700);

  await assertAxeCompliance(page, 'normal-state-5-workflows');
});

// ── Focused structural checks (independent of axe) ───────────────────────────

test('table has correct semantic structure: thead, tbody, th[scope=col] headers', async ({ page }) => {
  // PRD §10: semantic <table> with <thead>, <tbody>, <th scope="col">
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflows: [], stats: { portfolioHealthScore: 0, insightChips: [], topInsights: [] } }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const table = page.locator('table[aria-label="Workflows"]');
  await expect(table).toBeVisible();

  // thead must exist
  await expect(table.locator('thead')).toBeVisible();

  // tbody must exist
  await expect(table.locator('tbody')).toBeVisible();

  // Column headers must have scope="col"
  const colHeaders = table.locator('thead th[scope="col"]');
  const colHeaderCount = await colHeaders.count();
  expect(colHeaderCount).toBeGreaterThanOrEqual(4); // 4 data columns + 1 actions
});

test('portfolio health score has non-color semantic: aria-label includes "poor/fair/good"', async ({ page }) => {
  // PRD §10: Health Score color band is NOT the only indicator — aria-label must convey band
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [],
        stats: { portfolioHealthScore: 35, insightChips: [], topInsights: [] },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // The portfolio health container aria-label should include the semantic band
  const scoreContainer = page.locator('[role="status"]').filter({
    hasText: /portfolio health/i,
  });
  await expect(scoreContainer).toBeVisible();

  const ariaLabel = await scoreContainer.getAttribute('aria-label');
  expect(ariaLabel).toBeTruthy();
  // Should match pattern "Portfolio health: [N], [poor|fair|good]"
  expect(ariaLabel).toMatch(/portfolio health:\s*\d+,\s*(poor|fair|good)/i);
});

test('time range selector is keyboard-accessible native <select>', async ({ page }) => {
  // PRD §10: Time range selector must be <select> or accessible combobox
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const selector = page.getByRole('combobox', { name: 'Time range' });
  await expect(selector).toBeVisible();

  // Focus and navigate with keyboard
  await selector.focus();
  await page.keyboard.press('Tab'); // Tab away
  // No assertion failure = keyboard navigation did not throw

  // Confirm it's a native select (role=combobox) — not a div pretending to be one
  const tagName = await selector.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName).toBe('select');
});

test('insight chip has correct ARIA: role=button, aria-pressed, aria-label with severity prefix', async ({ page }) => {
  // Only exercisable when chips are present — route to return a chip
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [],
        stats: {
          portfolioHealthScore: 0,
          insightChips: [
            {
              id: 'chip-test',
              severity: 'warning',
              label: '2 workflows show high execution variance',
              filterKey: 'variationScore_gt_0.7',
              count: 2,
            },
          ],
          topInsights: [],
        },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const strip = page.getByRole('region', { name: 'Process insights' });
  await expect(strip).toBeVisible();

  const chip = strip.locator('[role="button"]').first();
  await expect(chip).toBeVisible();

  // aria-pressed must be present (InsightsStrip.tsx sets it)
  const ariaPressed = await chip.getAttribute('aria-pressed');
  expect(ariaPressed).not.toBeNull();

  // aria-label must include severity prefix per InsightsStrip CHIP_STYLE.ariaPrefix
  const ariaLabel = await chip.getAttribute('aria-label');
  expect(ariaLabel).toMatch(/warning:/i);
});

test('sort header buttons have aria-sort attribute', async ({ page }) => {
  // PRD §10: Sort headers are <button> elements with aria-sort attributes
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  const thead = table.locator('thead');

  // Health Score button — default sort column, should have aria-sort=ascending
  const healthBtn = thead.getByRole('button', { name: /health score/i });
  await expect(healthBtn).toBeVisible();
  await expect(healthBtn).toHaveAttribute('aria-sort', 'ascending');

  // Workflow (name) sort button — inactive, should have aria-sort=none
  const nameBtn = thead.getByRole('button', { name: /^workflow$/i });
  await expect(nameBtn).toBeVisible();
  await expect(nameBtn).toHaveAttribute('aria-sort', 'none');
});
