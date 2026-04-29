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
 * - Logs moderate violations to the test output (developer ergonomics)
 * - HARD assertion: moderate.length <= maxModerate (ratchet baseline, DV2-R04)
 *
 * @param maxModerate - Maximum permitted moderate violations. Default 0. Pass an
 *   explicit value at the call site to make the ratchet baseline reader-visible.
 *   If you need to raise the baseline, change the call-site value and add a
 *   code-review comment explaining the intentional deviation.
 */
async function assertAxeCompliance(
  page: import('@playwright/test').Page,
  label: string,
  maxModerate: number = 0,
): Promise<void> {
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

  // Moderate ratchet — HARD assertion (DV2-R04, iter-046).
  // Prevents silent moderate-violation accumulation across states.
  // To raise the baseline: pass a higher maxModerate at the call site with a comment.
  expect(
    moderate.length,
    `[axe][${label}] moderate violation count ${moderate.length} exceeds ratchet baseline ${maxModerate}. Either fix the new violation OR (if intentional) raise the baseline at the call site with a code-review note.`,
  ).toBeLessThanOrEqual(maxModerate);

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

  await assertAxeCompliance(page, 'empty-state', 0);
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

  await assertAxeCompliance(page, 'normal-state-5-workflows', 0);
});

// ── Test: error state (API returns 500) ──────────────────────────────────────

test('axe: zero critical/serious violations on error state (API 500)', async ({ page }) => {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Wait for the error UI to render (skeleton resolves; isError flips true)
  await page.waitForTimeout(700);

  await assertAxeCompliance(page, 'error-state', 0);
});

// ── Test: sparse state (1 workflow, <3 row threshold) ────────────────────────

test('axe: zero critical/serious violations on sparse state (1 workflow)', async ({ page }) => {
  const workflows = [makeWorkflow('wf-sparse-001', 'Lonely Workflow', 65, 'optimize')];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: {
          portfolioHealthScore: 65,
          insightChips: [],
          topInsights: [],
        },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await assertAxeCompliance(page, 'sparse-state-1-workflow', 0);
});

// ── Test: gated (free-tier) tooltip state ────────────────────────────────────

test('axe: zero critical/serious violations on gated tooltip state (free-tier user)', async ({ page }) => {
  // Free-tier user: metricsV2.healthScore.isGated = true. Clicking the row's
  // health score cell exposes the upgrade-CTA tooltip (HealthTooltip renders
  // lock icon + "Upgrade to see breakdown" when isGated is true).
  //
  // Trigger approach: the health score cell is a <td onClick> containing a
  // <div aria-label="Health score: 72, ...">. There is no <button> — the click
  // handler is on the <td> with stopPropagation. We click the <td> directly via
  // the aria-label div locator. If the locator count is 0 (e.g., aria-label
  // text differs from expected pattern), we fall back to clicking the <td>
  // that contains the score text "72" in a <span aria-hidden>.
  // This approach is verified against WorkflowRow.tsx lines 855-930 (iter-046).
  const workflows = [
    {
      id: 'wf-gated-001',
      title: 'Gated Workflow',
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
          overall: 72,
          speed: 20,
          consistency: 20,
          dataQuality: 16,
          standardization: 16,
          isGated: true, // free-tier gate — triggers upgrade-CTA tooltip
        },
        opportunityTag: 'healthy',
        aiOpportunityScore: 30,
        confidence: 0.82,
      },
    },
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: { portfolioHealthScore: 72, insightChips: [], topInsights: [] },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // Trigger the gated tooltip by clicking the health score cell.
  // WorkflowRow.tsx: the <td> at line 855 has onClick toggling showTooltip.
  // The inner <div> carries aria-label="Health score: 72, ..." (lines 863-871).
  // We locate by that aria-label pattern; the click is on the <td> parent via
  // the div's bounding box (Playwright click on a child triggers the parent td).
  const row = page.getByRole('row').filter({ hasText: 'Gated Workflow' });
  await expect(row).toBeVisible();

  // Primary: locate the div with aria-label matching "Health score: 72"
  const scoreDiv = row.locator('[aria-label*="Health score: 72"]').first();
  if (await scoreDiv.count() > 0) {
    await scoreDiv.click();
    await page.waitForTimeout(200); // tooltip mount
  }
  // Fallback: if aria-label locator misses, click the <td> containing the score
  else {
    const scoreTd = row.locator('td').last();
    await scoreTd.click();
    await page.waitForTimeout(200);
  }

  await assertAxeCompliance(page, 'gated-tooltip-state', 0);
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

// ── MDR-P06 regression: kebab trigger keyboard-accessible without mouse hover ──

test('MDR-P06: kebab trigger is in DOM and focusable without mouse hover', async ({ page }) => {
  // Regression: prior to MDR-P06 fix the trigger was wrapped in {isHovered && (...)}
  // and never mounted for keyboard-only users. Now it is always mounted.
  const workflows = [makeWorkflow('wf-k01', 'Keyboard Test Workflow', 75, 'healthy')];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: { portfolioHealthScore: 75, insightChips: [], topInsights: [] },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Trigger must be attached to the DOM regardless of hover state.
  const kebabTrigger = page.locator('[aria-label^="Actions for"]').first();
  await expect(kebabTrigger).toBeAttached();

  // Programmatically focus the trigger — keyboard-only users reach it via Tab.
  // This must not throw; prior to fix it would throw because the element did not exist.
  await kebabTrigger.focus();
  await expect(kebabTrigger).toBeFocused();
});

// ── MDR-P07 regression: aria-controls="portfolio-sidebar" resolves to real DOM id ──

test('MDR-P07: aria-controls="portfolio-sidebar" resolves to existing DOM element', async ({ page }) => {
  // Regression: prior to MDR-P07 fix the <aside> had no id, making the
  // aria-controls reference broken per ARIA 1.2.
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Open the sidebar so the <aside id="portfolio-sidebar"> is mounted.
  const portfoliosToggle = page.locator('[aria-controls="portfolio-sidebar"]').first();
  await expect(portfoliosToggle).toBeVisible();
  await portfoliosToggle.click();

  // After click the sidebar must be visible and must carry the declared id.
  const sidebar = page.locator('#portfolio-sidebar');
  await expect(sidebar).toBeVisible();
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
