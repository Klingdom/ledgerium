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

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { assertAxeCompliance } from '../../helpers/axe.js';
import { forceTheme, expectThemeApplied } from '../../helpers/theme.js';

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
// Extracted to e2e/helpers/axe.ts at loop 57 so the SOP a11y spec shares this
// exact ratchet rather than copying it. Behaviour is unchanged.

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
  // lock icon + "See score by dimension" when isGated is true, row #197).
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

  // Dismiss the analytics consent banner before navigation so it doesn't intercept clicks.
  // The banner checks localStorage('ledgerium_analytics_consent') — pre-setting it prevents
  // the banner from mounting and blocking pointer events on the health score cell.
  await page.addInitScript(() => {
    window.localStorage.setItem('ledgerium_analytics_consent', 'essential');
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
      // Row #200 (loop 19): this seeded an EMPTY library, so the shell rendered
      // FirstRunTutorial instead of the toolbar + list and the table never
      // existed — the test was asserting table semantics on a page that has no
      // table. Seed rows so the table actually renders.
      body: JSON.stringify({
        // This spec's makeWorkflow takes positional args: (id, title, healthScore, opportunityTag).
        workflows: [makeWorkflow('wf-1', 'Semantic Table Workflow', 70, 'monitor')],
        stats: { portfolioHealthScore: 70, insightChips: [], topInsights: [] },
      }),
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
  // PRD §10: Health Score color band is NOT the only indicator — aria-label must convey band.
  // Note: workflowCount must be > 0 so CommandHeader shows the health score widget instead of
  // the WDC2-P05 activation prompt (iter-080: health widget is suppressed when no workflows).
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [makeWorkflow('wf-band-001', 'Band Test Workflow', 35, 'monitor')],
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
  // Row #200 (loop 19): this required a DIGIT plus poor/fair/good, so it could
  // never pass. The header deliberately renders a verdict word and no number —
  // the score appears once, in the HealthGauge (iter-024 "kill the triple-88") —
  // and the band vocabulary is Good / Fair / Needs attention. The PRD §10 intent
  // (band conveyed non-visually, not by colour alone) is still asserted here.
  expect(ariaLabel).toMatch(/portfolio health:\s*(good|fair|needs attention)/i);
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
        // Row #200 (loop 19): this seeded an EMPTY library, so the shell took the
        // `isFirstRun` branch and rendered FirstRunTutorial INSTEAD of the toolbar,
        // list and InsightsStrip — the chip under test never mounted, and the
        // "Process insights" region was never found. Seed a workflow so the strip
        // renders. (makeWorkflow here is positional: id, title, healthScore, tag.)
        workflows: [makeWorkflow('wf-chip', 'Chip Fixture Workflow', 55, 'monitor')],
        stats: {
          portfolioHealthScore: 55,
          insightChips: [
            {
              id: 'chip-test',
              severity: 'warning',
              label: '2 workflows show high variation → consider standardizing',
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

  // The chip filter action is now a <button> element (not role=button div) to avoid
  // nested-interactive violation. Locate the filter button by its aria-pressed attribute
  // (set directly on the <button>, not a descendant — use locator not filter({ has })).
  const chip = strip.locator('button[aria-pressed]').first();
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

test('sort header columns have aria-sort attribute', async ({ page }) => {
  // PRD §10: Sort column headers carry aria-sort on the <th> (columnheader role).
  // Per ARIA spec, aria-sort is only valid on columnheader / rowheader role elements,
  // NOT on <button> children. The <button> inside the <th> is the interactive control;
  // the <th> conveys sort state to screen readers via aria-sort.
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const table = page.getByRole('table', { name: 'Workflows' });
  const thead = table.locator('thead');

  // Date Recorded <th> — default sort column since Batch A, should have aria-sort=descending.
  // The button inside it must still be visible and interactive.
  const dateTh = thead.locator('th').filter({ has: page.getByRole('button', { name: /date recorded/i }) });
  await expect(dateTh).toHaveAttribute('aria-sort', 'descending');
  await expect(thead.getByRole('button', { name: /date recorded/i })).toBeVisible();

  // Health Score <th> — sortable but inactive, should have aria-sort=none
  const healthTh = thead.locator('th').filter({ has: page.getByRole('button', { name: /health score/i }) });
  await expect(healthTh).toHaveAttribute('aria-sort', 'none');
  await expect(thead.getByRole('button', { name: /health score/i })).toBeVisible();

  // Workflow (name) <th> — inactive, should have aria-sort=none
  const nameTh = thead.locator('th').filter({ has: page.getByRole('button', { name: /^workflow$/i }) });
  await expect(nameTh).toHaveAttribute('aria-sort', 'none');
  await expect(thead.getByRole('button', { name: /^workflow$/i })).toBeVisible();
});

// ── Row #223 (loop 38): lock the 1.4.11 / 1.4.1 exemption ────────────────────
//
// The portfolio-health rail uses bg-amber-500 / bg-green-500, which measure
// 2.15:1 and 2.28:1 against a white surface — below the 3:1 floor for non-text
// contrast. That is NOT a violation today, and these tests pin exactly why:
// the rail is decorative because the verdict WORD carries the same status as
// visible text, and the accessible name carries it for assistive tech.
//
// If someone later removes the word, or strips aria-hidden from the rail so it
// becomes the sole carrier, the exemption evaporates and 1.4.11 starts to bite.
// These fail at that moment rather than at the next audit.
//
// Sources for the exemption (added loop 45 — MR-029 flagged this ruling as
// uncited, and it survived MR-030 and MR-031 that way):
//
//   SC 1.4.11 Non-text Contrast scopes the 3:1 floor to "Graphical Objects:
//   Parts of graphics required to understand the content, except when a
//   particular presentation of graphics is essential to the information being
//   conveyed." The rail is not required to understand the content — the verdict
//   word states the same status in text — so it falls outside that scope.
//   https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
//
//   SC 1.4.1 Use of Color requires that "Color is not used as the only visual
//   means of conveying information, indicating an action, prompting a response,
//   or distinguishing a visual element." The word is the non-colour carrier,
//   which is precisely what the assertions below pin.
//   https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
//
// Both are Understanding documents, not the normative text; the quoted clauses
// are from the success criteria themselves. If you are auditing this, read the
// SC, not this comment.
//
// (a11y-architect proposed these as jsdom/RTL tests; web-app has neither -
// its unit tests are pure logic and source-text assertions - so they live here,
// against a real DOM, which is what the assertions actually need.)
for (const band of [
  { score: 30, word: /needs attention/i },
  { score: 70, word: /fair/i },
  { score: 90, word: /good/i },
]) {
  test(`1.4.1/1.4.11 lock: health status has a non-colour carrier at score ${band.score}`, async ({ page }) => {
    await page.route('**/api/workflows**', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [makeWorkflow('wf-001', 'Alpha Workflow', band.score, 'healthy')],
          stats: { portfolioHealthScore: band.score, insightChips: [], topInsights: [] },
        }),
      });
    });

    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const status = page.getByRole('status').filter({ hasText: /./ }).first();

    // 1. Assistive tech gets the verdict lexically, not by colour.
    const label = await page
      .locator('[aria-label^="Portfolio health:"]')
      .first()
      .getAttribute('aria-label');
    expect(label, 'no "Portfolio health:" accessible name found').toBeTruthy();
    expect(label!).toMatch(band.word);

    // 2. A SIGHTED user gets it as visible text too - not colour alone (1.4.1).
    const container = page.locator('[aria-label^="Portfolio health:"]').first();
    await expect(container).toContainText(band.word);

    // 3. The coloured rail stays hidden from the AT tree, which is what keeps it
    //    decorative and therefore exempt from the 3:1 non-text floor (1.4.11).
    const rail = container.locator('div[aria-hidden="true"]').first();
    await expect(rail).toHaveAttribute('aria-hidden', 'true');

    void status;
  });
}

// ── Light theme (row #232, held back at loop 64) ──────────────────────────────

/**
 * Loop 64 ran the first light-theme axe probe this repo has ever had, found a
 * real `color-contrast` failure on the dashboard's health figures, and did NOT
 * ship this test — because shipping it red blocks the deploy gate for every
 * unrelated change, and shipping it with the ratchet raised is how a
 * zero-tolerance policy quietly becomes decorative.
 *
 * It was filed as row #232 with measurements and comes back here with the fix,
 * which is the only thing that makes "held back" mean something other than
 * "quietly never written".
 *
 * The fixture spans all three health bands on purpose. The original probe only
 * rendered some of them, and the whole lesson of #229 and #230 is that a
 * fixture which exercises one branch reports on one branch.
 */
test('axe: zero critical/serious violations on the populated dashboard, LIGHT theme', async ({ page }) => {
  await forceTheme(page, 'light');

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [
          makeWorkflow('wf-poor', 'Poor Workflow', 30, 'monitor'),   // red band
          makeWorkflow('wf-fair', 'Fair Workflow', 70, 'optimize'),  // amber band
          makeWorkflow('wf-good', 'Good Workflow', 90, 'healthy'),   // green band
        ],
        stats: {
          portfolioHealthScore: 63,
          portfolioHealthScoreDelta: 4,  // renders CommandHeader's delta colour
          insightChips: [],
          topInsights: [],
        },
      }),
    });
  });

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expectThemeApplied(page, 'light');
  await page.waitForTimeout(700);

  // Prove the rows actually rendered. A dashboard that failed to load would
  // scan an empty table and pass, reporting a green tick for a check that never
  // examined the colours under test.
  await expect(page.getByText('Poor Workflow')).toBeVisible();
  await expect(page.getByText('Fair Workflow')).toBeVisible();
  await expect(page.getByText('Good Workflow')).toBeVisible();

  await assertAxeCompliance(page, 'dashboard-populated-light', 0);
});

// ── Row #105: ColumnPicker drawer + PresetChipRail + SavedViews + dynamic headers ──
//
// QA BLOCKER 1 from WORKFLOW_DASHBOARD_REVIEW_002: the `role="dialog"
// aria-modal="true"` drawer, the 10-chip rail and the saved-views CRUD section
// had never been axe-scanned. Every scan below uses the zero-moderate ratchet.
//
// Selector notes (verified against source, not guessed):
//  - Trigger: <button aria-label="Customize columns"> in UnifiedToolbar.tsx. The
//    drawer ALSO carries aria-label="Customize columns" but as role=dialog, so
//    the two are told apart by role (button vs dialog).
//  - Rail: role=toolbar name "Preset views"; chips are <div role=button
//    data-preset-id="..." aria-disabled>.
//  - The drawer sits inside <main> (AppShell), so assertAxeCompliance's
//    `.include('main')` really covers it; test 1 asserts that containment so a
//    future portal-to-body refactor cannot silently turn the scan into a no-op.

const PICKER_PRESET_IDS = [
  'automation_candidates',
  'needs_attention',
  'standardize',
  'high_volume',
  'recent_activity',
  'ready_to_share',
  'my_teams_bottlenecks',
  'ai_automation_candidates',
  'ai_executions_running',
  'ai_savings_leaders',
] as const;

const DEFAULT_PICKER_COLUMNS = [
  'workflow_title',
  'systems',
  'opportunity_tag',
  'health_score',
  'last_run_at',
  'run_count',
];

interface SavedViewFixture {
  id: string;
  name: string;
  visibleColumns: string[];
  columnOrder: string[];
  filters: unknown[];
  createdAt: string;
}

function makeSavedView(id: string, name: string): SavedViewFixture {
  return {
    id,
    name,
    visibleColumns: DEFAULT_PICKER_COLUMNS,
    columnOrder: DEFAULT_PICKER_COLUMNS,
    filters: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

async function mockCustomizableDashboard(
  page: Page,
  opts: {
    userPlan?: string;
    visibleColumns?: string[];
    savedViews?: SavedViewFixture[];
  } = {},
): Promise<void> {
  const visibleColumns = opts.visibleColumns ?? DEFAULT_PICKER_COLUMNS;
  const workflows = [
    makeWorkflow('wf-p1', 'Picker Workflow One', 85, 'healthy'),
    makeWorkflow('wf-p2', 'Picker Workflow Two', 55, 'optimize'),
    makeWorkflow('wf-p3', 'Picker Workflow Three', 72, 'automate'),
  ];

  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows,
        stats: {
          portfolioHealthScore: 70,
          insightChips: [],
          topInsights: [],
          userPlan: opts.userPlan ?? 'free',
        },
      }),
    });
  });

  // GET returns the stored preferences; PUT just acknowledges (no DB writes).
  await page.route('**/api/dashboard/preferences', (route) => {
    if (route.request().method() === 'PUT') {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null, error: null, meta: {} }),
      });
      return;
    }
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          preferences: {
            schemaVersion: 1,
            visibleColumns,
            columnOrder: visibleColumns,
            filters: [],
            savedViews: opts.savedViews ?? [],
          },
          droppedKeys: [],
          warnings: [],
        },
        error: null,
        meta: { schemaVersion: 1 },
      }),
    });
  });

  // Keep the analytics consent banner from intercepting pointer events.
  await page.addInitScript(() => {
    window.localStorage.setItem('ledgerium_analytics_consent', 'essential');
  });
}

async function openColumnPicker(page: Page) {
  await page.getByRole('button', { name: 'Customize columns' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize columns' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('axe: zero critical/serious violations with ColumnPicker drawer open (row #105 / 1)', async ({ page }) => {
  await mockCustomizableDashboard(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const dialog = await openColumnPicker(page);

  // Modal semantics the drawer promises.
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // The scan is scoped to <main>; prove the drawer is inside it, otherwise this
  // test would pass while never examining the drawer.
  await expect(page.locator('main').getByRole('dialog', { name: 'Customize columns' })).toHaveCount(1);
  // Real content rendered (not an empty shell): grouped column list + saved views.
  await expect(dialog.getByRole('group', { name: 'Available columns' })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Saved views' })).toBeVisible();

  // TODO(row #105b): color-contrast (serious) on the dimmed rows — locked
  // columns ("Always visible", 10px) and pending columns ("Available in an
  // upcoming release") sit under `opacity-60` on the row wrapper, which drops
  // secondary text below 4.5:1. test.fail() keeps the zero-tolerance assertion
  // intact and flips red once fixed (then delete the test.fail line and the
  // structural-only twin test below).
  test.fail(true, 'row #105b: opacity-60 dimmed column rows fail color-contrast');
  await assertAxeCompliance(page, 'column-picker-open', 0);
});

test('axe: ColumnPicker drawer — every rule EXCEPT color-contrast (row #105b interim twin)', async ({ page }) => {
  // While the full-rule drawer test above is an expected failure for contrast,
  // this keeps every OTHER axe rule (aria-required-children/parent,
  // aria-prohibited-attr, names, roles...) enforced on the drawer so a new
  // structural regression cannot hide behind the expected failure. Delete when
  // row #105b is fixed.
  await mockCustomizableDashboard(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();
  await openColumnPicker(page);

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-label="Customize columns"]')
    .disableRules(['color-contrast'])
    .analyze();
  const blocking = results.violations.filter((v) =>
    ['critical', 'serious', 'moderate'].includes(v.impact ?? ''),
  );
  expect(
    blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`),
    'drawer has non-contrast axe violations',
  ).toEqual([]);
});

test('axe + structure: PresetChipRail renders 10 chips with correct plan-gated and AI-disabled states (row #105 / 2)', async ({ page }) => {
  await mockCustomizableDashboard(page, { userPlan: 'free' });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const rail = page.getByRole('toolbar', { name: 'Preset views' });
  await expect(rail).toBeVisible();

  const chips = rail.locator('[data-preset-id]');
  await expect(chips).toHaveCount(10);
  // Catalog order is intentional and deterministic.
  expect(await chips.evaluateAll((els) => els.map((e) => e.getAttribute('data-preset-id')))).toEqual([
    ...PICKER_PRESET_IDS,
  ]);

  const disabledOf = async (id: string) =>
    rail.locator(`[data-preset-id="${id}"]`).getAttribute('aria-disabled');

  // Free plan: 5 canonical enabled, 2 Team-gated disabled, 3 AI disabled.
  for (const id of PICKER_PRESET_IDS.slice(0, 5)) expect(await disabledOf(id), id).toBe('false');
  for (const id of ['ready_to_share', 'my_teams_bottlenecks']) {
    expect(await disabledOf(id), id).toBe('true');
    await expect(rail.locator(`[data-preset-id="${id}"]`)).toHaveAttribute(
      'title',
      /Team plan includes this preset/,
    );
  }
  for (const id of PICKER_PRESET_IDS.slice(7)) {
    expect(await disabledOf(id), id).toBe('true');
    await expect(rail.locator(`[data-preset-id="${id}"]`)).toHaveAttribute(
      'title',
      'Coming in an upcoming release',
    );
  }
  // Disabled chips are out of the tab order; enabled ones are in it.
  await expect(rail.locator('[data-preset-id="ready_to_share"]')).toHaveAttribute('tabindex', '-1');
  await expect(rail.locator('[data-preset-id="high_volume"]')).toHaveAttribute('tabindex', '0');
  // Default pack matches no preset => nothing pressed.
  await expect(rail.locator('[aria-pressed="true"]')).toHaveCount(0);

  await assertAxeCompliance(page, 'preset-rail-free-plan', 0);
});

test('axe + structure: PresetChipRail on Team plan unlocks gated chips but keeps AI chips disabled (row #105 / 2b)', async ({ page }) => {
  await mockCustomizableDashboard(page, { userPlan: 'team' });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const rail = page.getByRole('toolbar', { name: 'Preset views' });
  await expect(rail.locator('[data-preset-id]')).toHaveCount(10);

  for (const id of ['ready_to_share', 'my_teams_bottlenecks']) {
    await expect(rail.locator(`[data-preset-id="${id}"]`)).toHaveAttribute('aria-disabled', 'false');
  }
  for (const id of PICKER_PRESET_IDS.slice(7)) {
    await expect(rail.locator(`[data-preset-id="${id}"]`)).toHaveAttribute('aria-disabled', 'true');
  }

  await assertAxeCompliance(page, 'preset-rail-team-plan', 0);
});

test('axe: PresetChipRail active-chip state (aria-pressed) when preferences equal a preset (row #105 / 2c)', async ({ page }) => {
  // visibleColumns/columnOrder equal the `standardize` preset exactly, so
  // detectActivePreset (exported from presets.ts) must report it active.
  await mockCustomizableDashboard(page, {
    visibleColumns: ['workflow_title', 'opportunity_tag', 'run_count', 'health_score'],
  });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const rail = page.getByRole('toolbar', { name: 'Preset views' });
  await expect(rail.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(rail.locator('[data-preset-id="standardize"]')).toHaveAttribute('aria-pressed', 'true');

  // Active chip = white on bg-brand-700 (#047857, 5.48:1; was green-600 at
  // 3.30:1, row #365): scanned here in its active state.
  await assertAxeCompliance(page, 'preset-rail-active-chip', 0);
});

test('axe: SavedView list inside the drawer — list, create, rename and delete-confirm states (row #105 / 3)', async ({ page }) => {
  // Scoped to the Saved views region: the drawer's column list carries separate
  // contrast defects (see the column-picker-open test); scoping here keeps this
  // test about saved-view CRUD without hiding anything inside the region.
  const SAVED_VIEWS_SCOPE = '[aria-label="Saved views"]';
  await mockCustomizableDashboard(page, {
    savedViews: [makeSavedView('sv-1', 'Weekly review'), makeSavedView('sv-2', 'Ops audit')],
  });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const dialog = await openColumnPicker(page);
  const saved = dialog.getByRole('region', { name: 'Saved views' });
  const list = saved.getByRole('list', { name: 'Your saved views' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(saved.getByRole('button', { name: 'Apply saved view: Weekly review' })).toBeVisible();

  // (a) populated list
  await assertAxeCompliance(page, 'saved-views-list', 0, SAVED_VIEWS_SCOPE);

  // (b) create affordance: structure only here; its axe scan is the separate
  // `row #105 / 3b` test below because the enabled Save button has a known
  // contrast defect.
  await saved.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
  const nameInput = saved.getByRole('textbox', { name: 'Name for saved view' });
  await expect(nameInput).toBeVisible();
  // Escape cancels only the new-view form (#370): drawer stays open, focus
  // returns to the "Save current view" trigger.
  await page.keyboard.press('Escape');
  await expect(nameInput).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(
    saved.getByRole('button', { name: 'Save current column configuration as a named view' }),
  ).toBeFocused();

  // (c) rename affordance: inline rename input
  await saved.getByRole('button', { name: 'Rename saved view: Weekly review' }).click();
  await expect(saved.getByRole('textbox', { name: 'Rename saved view' })).toBeVisible();
  await assertAxeCompliance(page, 'saved-views-rename', 0, SAVED_VIEWS_SCOPE);
  // Escape cancels only the rename (#370): drawer stays open, editor closed,
  // focus back on the row's rename trigger.
  await page.keyboard.press('Escape');
  await expect(saved.getByRole('textbox', { name: 'Rename saved view' })).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(saved.getByRole('button', { name: 'Rename saved view: Weekly review' })).toBeFocused();

  // (d) delete confirmation affordance
  await saved.getByRole('button', { name: 'Delete saved view: Ops audit' }).click();
  await expect(saved.getByRole('button', { name: 'Confirm delete — Ops audit' })).toBeVisible();
  await assertAxeCompliance(page, 'saved-views-delete-confirm', 0, SAVED_VIEWS_SCOPE);
  // Escape cancels only the confirmation (#370); drawer stays open.
  await page.keyboard.press('Escape');
  await expect(saved.getByRole('button', { name: 'Confirm delete — Ops audit' })).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(saved.getByRole('button', { name: 'Delete saved view: Ops audit' })).toBeFocused();
  await expect(list.getByRole('listitem')).toHaveCount(2);

  // (e) Commit paths keep focus inside the aria-modal dialog (#373).
  const focusIsInsideDialog = () =>
    page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

  // Enter-save: focus lands on the new view's Apply button.
  await saved.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
  await saved.getByRole('textbox', { name: 'Name for saved view' }).fill('Quarterly');
  await page.keyboard.press('Enter');
  await expect(saved.getByRole('button', { name: 'Apply saved view: Quarterly' })).toBeFocused();
  expect(await focusIsInsideDialog()).toBe(true);

  // Enter-rename: focus returns to the row's rename trigger (renamed label).
  await saved.getByRole('button', { name: 'Rename saved view: Weekly review' }).click();
  await saved.getByRole('textbox', { name: 'Rename saved view' }).fill('Weekly review v2');
  await page.keyboard.press('Enter');
  await expect(saved.getByRole('button', { name: 'Rename saved view: Weekly review v2' })).toBeFocused();
  expect(await focusIsInsideDialog()).toBe(true);

  // Confirmed delete of a middle row: focus moves to the next row's Apply button.
  await saved.getByRole('button', { name: 'Delete saved view: Ops audit' }).click();
  await saved.getByRole('button', { name: 'Confirm delete — Ops audit' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(saved.getByRole('button', { name: 'Apply saved view: Quarterly' })).toBeFocused();
  expect(await focusIsInsideDialog()).toBe(true);

  // (f) #376 / F0: a failed save rolls the new view back; focus must not drop to
  // BODY. PUT answered 500 -> Doomed's Apply button is removed -> focus lands on
  // Save current view, inside the dialog, and the region stays axe-clean.
  const failPut = (route: import('@playwright/test').Route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ data: null, error: { code: 'INTERNAL', message: 'boom' }, meta: {} }) })
      : route.fallback();
  await page.route('**/api/dashboard/preferences', failPut);
  const saveTrigger = saved.getByRole('button', { name: 'Save current column configuration as a named view' });
  await saveTrigger.click();
  await saved.getByRole('textbox', { name: 'Name for saved view' }).fill('Doomed');
  await page.keyboard.press('Enter');
  await expect(saved.getByRole('button', { name: 'Apply saved view: Doomed' })).toHaveCount(0, { timeout: 5000 });
  await expect(dialog).toBeVisible();
  await expect(saveTrigger).toBeFocused();
  expect(await focusIsInsideDialog()).toBe(true);
  await assertAxeCompliance(page, 'saved-views-after-rollback', 0, SAVED_VIEWS_SCOPE);
  await page.unroute('**/api/dashboard/preferences', failPut);

  // With no editor open, Escape closes the drawer as before.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('axe: SavedView create form with enabled Save button (row #105 / 3b)', async ({ page }) => {
  // The enabled "Save" button is bg-brand-700 text-white (5.48:1; row #365).
  await mockCustomizableDashboard(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const dialog = await openColumnPicker(page);
  const saved = dialog.getByRole('region', { name: 'Saved views' });
  await saved.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
  await saved.getByRole('textbox', { name: 'Name for saved view' }).fill('Quarterly');
  await expect(saved.getByRole('button', { name: 'Confirm save view' })).toBeEnabled();
  await assertAxeCompliance(page, 'saved-views-create-form', 0, '[aria-label="Saved views"]');
});

test('axe: UnifiedToolbar active-filter count badge (row #365)', async ({ page }) => {
  await mockCustomizableDashboard(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  await page.getByRole('button', { name: 'Toggle filters' }).click();
  await page.getByRole('button', { name: 'Needs attention', exact: true, pressed: false }).click();
  // Precondition: the badge (10px white on bg-brand-700) is actually rendered.
  await expect(page.getByLabel('1 active filters')).toBeVisible();
  await assertAxeCompliance(page, 'toolbar-filter-badge', 0, '[aria-label="Toggle filters"]');

  // axe does not flag this 10px badge even at the old green-600 (verified by
  // revert), so also assert the WCAG ratio from computed styles directly.
  const ratio = await page.getByLabel('1 active filters').evaluate((el) => {
    const lum = (rgb: string) => {
      const [r, g, b] = (rgb.match(/[0-9.]+/g) ?? []).slice(0, 3).map(Number).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const cs = getComputedStyle(el);
    const [hi, lo] = [lum(cs.color), lum(cs.backgroundColor)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  });
  expect(ratio, 'filter badge text/background contrast').toBeGreaterThanOrEqual(4.5);
});

test('axe + structure: dynamic column headers after customization — non-default pack, aria-sort correctness (row #105 / 4)', async ({ page }) => {
  // Non-default pack, deliberately ordered: Cycle Time, Runs, Date Recorded.
  await mockCustomizableDashboard(page, {
    visibleColumns: ['workflow_title', 'cycle_time_mean_ms', 'run_count', 'date_recorded', 'health_score'],
  });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await expect(page.getByText('Picker Workflow One')).toBeVisible();

  const table = page.getByRole('table', { name: 'Workflows' });
  const headers = table.locator('thead th[scope="col"]');

  // Header text, in order. Locked name first; locked Health Score last before
  // the sr-only Actions column; the middle follows the saved visibleColumns.
  const texts = (await headers.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  expect(texts[0]).toMatch(/^Workflow/);
  expect(texts[1]).toMatch(/^Cycle Time/);
  expect(texts[2]).toMatch(/^Runs/);
  expect(texts[3]).toMatch(/^Date Recorded/);
  expect(texts[4]).toMatch(/^Health Score/);
  expect(await headers.count()).toBe(6);
  // Columns NOT in the saved pack must not render.
  await expect(table.locator('thead').getByText('Opportunity', { exact: true })).toHaveCount(0);
  await expect(table.locator('thead').getByText('Systems', { exact: true })).toHaveCount(0);

  const th = (name: RegExp) =>
    table.locator('thead th').filter({ has: page.getByRole('button', { name }) });

  // Default sort is Date Recorded descending; every other sortable header is none.
  await expect(th(/date recorded/i)).toHaveAttribute('aria-sort', 'descending');
  await expect(th(/^runs/i)).toHaveAttribute('aria-sort', 'none');
  await expect(th(/cycle time/i)).toHaveAttribute('aria-sort', 'none');
  await expect(th(/health score/i)).toHaveAttribute('aria-sort', 'none');

  // Axe on the customized table, default sort.
  await assertAxeCompliance(page, 'dynamic-columns-default-sort', 0);

  // Sort by a dynamic column: aria-sort moves, exactly one header is active.
  await table.locator('thead').getByRole('button', { name: /^runs/i }).click();
  await expect(th(/^runs/i)).not.toHaveAttribute('aria-sort', 'none');
  await expect(th(/date recorded/i)).toHaveAttribute('aria-sort', 'none');
  const active = await table
    .locator('thead th[aria-sort]')
    .evaluateAll((els) => els.filter((e) => e.getAttribute('aria-sort') !== 'none').length);
  expect(active).toBe(1);

  await assertAxeCompliance(page, 'dynamic-columns-after-sort', 0);
});
