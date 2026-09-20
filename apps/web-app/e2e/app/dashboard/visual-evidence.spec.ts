/**
 * visual-evidence.spec.ts
 *
 * WHY THIS EXISTS (row #220 / MR-025 §6, MR-026 P-9′)
 *
 * Loop 25 changed `--content-tertiary` and `.btn-primary` — colours used in 828
 * places across 132 files — and validated the change with axe, unit tests and
 * E2E. All of it automated, none of it looked at. Two meta-reviews in a row
 * called that out: nothing in this repo has ever rendered a page and produced an
 * artefact a human (or an agent that can read images) could inspect.
 *
 * WHAT THIS IS — AND IS NOT
 *
 * It writes PNGs of the dashboard's main states in BOTH themes to
 * `test-results/visual/`, and asserts only that each screenshot is non-blank.
 *
 * It is deliberately NOT `toHaveScreenshot` pixel-diffing. Baselines are
 * platform-specific — a baseline captured on this Windows dev machine would
 * disagree with the Linux CI runner on font rendering alone — so a pixel gate
 * added now would be red on arrival, and a permanently red gate is one everyone
 * learns to ignore (the same reasoning that kept this gate at two spec files in
 * `e2e-web-app.yml`).
 *
 * So: evidence, not assertion. The PNGs are the deliverable. Attach one to any
 * change that alters what the product looks like.
 *
 * The light theme matters here specifically: `--content-tertiary` measured
 * 2.45:1 on light before loop 25 — worse than the dark default everybody looks
 * at, and unmeasured until MR-025.
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolved from the Playwright cwd (apps/web-app) rather than import.meta:
// this file is transpiled into a scope where import.meta is unavailable and
// the loader fails with "require is not defined in ES module scope".
const OUT_DIR = resolve(process.cwd(), 'test-results', 'visual');

const V2_URL = '/dashboard?v2=1';

/** Mirrors the fixture shape used by v2-a11y.spec.ts. */
function makeWorkflow(id: string, title: string, healthScore: number, opportunityTag: string): object {
  return {
    id,
    title,
    toolsUsed: ['Salesforce', 'NetSuite'],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    lastViewedAt: null,
    processDefinitionUpdatedAt: '2026-09-10T10:00:00.000Z',
    healthStatus: 'healthy',
    metricsV2: {
      runs: 12,
      avgTimeMs: 240_000,
      variationScore: healthScore < 50 ? 0.8 : 0.2,
      variationLabel: healthScore < 50 ? 'high' : 'low',
      bottleneckLabel: null,
      healthScore: { overall: healthScore, speed: 20, consistency: 20, dataQuality: 20, standardization: 20, isGated: false },
      opportunityTag,
      aiOpportunityScore: 50,
      confidence: 0.8,
    },
  };
}

const WORKFLOWS = [
  makeWorkflow('wf-001', 'Invoice approval', 85, 'healthy'),
  makeWorkflow('wf-002', 'Vendor onboarding', 30, 'monitor'),
  makeWorkflow('wf-003', 'Expense reconciliation', 55, 'optimize'),
  makeWorkflow('wf-004', 'Customer refund', 72, 'automate'),
  makeWorkflow('wf-005', 'Payroll export', 40, 'standardize'),
];

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

for (const theme of ['dark', 'light'] as const) {
  test(`visual evidence: populated dashboard (${theme} theme)`, async ({ page }) => {
    await page.route('**/api/workflows**', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: WORKFLOWS,
          stats: {
            portfolioHealthScore: 64,
            insightChips: [],
            topInsights: [],
            userPlan: 'team',
          },
        }),
      });
    });

    // `dark` is the shipped default (layout.tsx renders class="dark" server-side).
    // Setting the class directly does NOT work: useTheme's mount effect reads
    // localStorage and re-applies its own value, overwriting it — my first
    // attempt produced a "light" screenshot byte-identical to the dark one, and
    // the size check happily passed. Drive the app's own mechanism instead.
    if (theme === 'light') {
      await page.addInitScript(() => {
        localStorage.setItem('ledgerium-theme', 'light');
      });
    }

    await page.goto(V2_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900); // skeleton resolves at 300ms minimum

    // Assert the theme actually applied BEFORE capturing. Without this the spec
    // silently captured two identical dark screenshots and called one "light".
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass, `expected the ${theme} theme to be applied`).toContain(theme);

    const file = resolve(OUT_DIR, `dashboard-${theme}.png`);
    const buffer = await page.screenshot({ path: file, fullPage: true });

    // Non-blank check only. A screenshot of a white void would otherwise pass
    // silently and the artefact would be worthless — the same failure mode as
    // the promo tiles, which were pixel-verified for exactly this reason.
    expect(buffer.byteLength, `${file} looks empty`).toBeGreaterThan(20_000);
  });
}
