/**
 * Process Variants — documentation screenshots + e2e smoke for the Variants tab.
 *
 * Double duty: (1) navigates Workflow → Variants → Map/DNA/List + the process map
 * and asserts no client-side exception (the e2e coverage the smoke gate lacked),
 * and (2) captures the canonical screenshots used in the docs page.
 *
 * Seeds the sample variant set ("Approve Expense Report" recorded 8 ways) via
 * /api/sample-variants. Runs under the `authenticated` project (growth user, which
 * has the intelligenceLayer feature the Variants tab requires).
 *
 *   pnpm exec playwright test e2e/app/variants-screenshots.spec.ts --project=authenticated
 *
 * Output: apps/web-app/public/docs/screenshots/
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SHOT_DIR = path.join(__dirname, '../../public/docs/screenshots');
const VIEWPORT = { width: 1440, height: 900 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function shot(page: any, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}

test.describe('Process Variants documentation', () => {
  let workflowId = '';

  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    // Seed the 8-recording variant sample (idempotent). Returns the primary id.
    const res = await request.post('/api/sample-variants');
    expect(res.ok(), 'sample-variants seed should succeed').toBeTruthy();
    const data = await res.json();
    workflowId = data.id;
    expect(workflowId, 'sample-variants should return a workflow id').toBeTruthy();
    console.log('[variants-screenshots] seeded sample workflow', workflowId);
  });

  test('Variants map / DNA / list / evidence + process map render and are captured', async ({ page }) => {
    test.setTimeout(150_000); // first next-dev compile of the workflow page can be slow

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.setViewportSize(VIEWPORT);
    await page.goto(`/workflows/${workflowId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Default Workflow tab → switch the map to "Variants" mode.
    const variantsMode = page.getByTestId('workflow-mode-variants');
    await variantsMode.waitFor({ state: 'visible', timeout: 30_000 });
    await variantsMode.click();

    // ── Map view ────────────────────────────────────────────────────────────
    const storyMap = page.getByTestId('variants-story-map');
    await storyMap.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1500); // let React Flow fitView settle
    await expect(storyMap).toBeVisible();
    await shot(page, 'workflow-variants-map');

    // ── Evidence drill (click a branch edge) — best-effort screenshot ─────────
    try {
      const edges = page.locator('.react-flow__edge');
      const count = await edges.count();
      if (count > 1) {
        await edges.nth(Math.min(2, count - 1)).click({ force: true, timeout: 5000 });
        await page.waitForTimeout(700);
        await shot(page, 'workflow-variants-evidence');
      }
    } catch {
      /* edge hit-testing is fiddly; the map screenshot already shows the branches */
    }

    // ── DNA view ──────────────────────────────────────────────────────────────
    await page.getByTestId('variants-view-dna').click();
    const dna = page.getByTestId('variant-dna-strip');
    await dna.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(dna).toBeVisible();
    await page.waitForTimeout(500);
    await shot(page, 'workflow-variants-dna');

    // ── List view ─────────────────────────────────────────────────────────────
    await page.getByTestId('variants-view-list').click();
    await page.waitForTimeout(900);
    await shot(page, 'workflow-variants-list');

    // ── Process map (Flow mode) ───────────────────────────────────────────────
    await page.getByTestId('workflow-mode-flow').click();
    await page.waitForTimeout(2000); // React Flow render
    await shot(page, 'workflow-process-map');

    // ── Report tab: variance/variants must reflect the multi-run COHORT ────────
    // The sample has 16 recordings; after pointing /analyze at the cohort
    // analyzer, the Variance & Variants section must NOT show the single-run
    // "recorded once" placeholder.
    const analyzeResp = page.waitForResponse(
      (r) => r.url().includes('/analyze') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.getByTestId('workflow-tab-report').click();
    await analyzeResp.catch(() => undefined); // best-effort; render assertion below is the gate
    await page.locator('#rpt-variance').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1500);
    await shot(page, 'workflow-report');
    await expect(
      page.locator('text=Run this workflow again to unlock'),
      'multi-run sample must not show the single-run variance placeholder',
    ).toHaveCount(0);

    // ── Dashboard list (Batch A: Date Recorded column + sorts) ────────────────
    // Exercises the changed dashboard page under the no-page-error assertion and
    // captures the workflow library with the new columns.
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, 'dashboard-list');

    // ── E2E assertions: nothing crashed ───────────────────────────────────────
    await expect(page.locator('text=Application error')).toHaveCount(0);
    expect(errors, `no uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
