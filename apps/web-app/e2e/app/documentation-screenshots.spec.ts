/**
 * Documentation screenshots — authenticated app pages.
 *
 * Captures a canonical screenshot of every key feature in the Ledgerium AI
 * web app for use in user-facing documentation.
 *
 * IMPORTANT: This test seeds 5+ diverse sample workflows via /api/seed-demo-data
 * so the dashboard, analytics, and workflow detail pages all show real data.
 *
 * Run with:
 *   pnpm exec playwright test e2e/app/documentation-screenshots.spec.ts --project=authenticated
 *
 * Output directory: apps/web-app/docs/screenshots/
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../docs/screenshots');

/** Viewport used for all documentation screenshots. */
const DOCS_VIEWPORT = { width: 1440, height: 900 };

/** Save a viewport screenshot (no vertical scrolling). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function screenshot(page: any, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

/** Save a full-page screenshot (includes content below the fold). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fullPageScreenshot(page: any, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

test.beforeAll(async ({ request }) => {
  // Ensure the screenshot output directory exists before any test runs.
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Load the original sample workflow (idempotent).
  await request.post('/api/sample-workflow');

  // Seed 5 additional diverse workflows so every page has real data.
  const seedResp = await request.post('/api/seed-demo-data');
  const seedData = await seedResp.json();
  console.log('[seed-demo-data]', JSON.stringify(seedData));
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

test.describe('Dashboard screenshots', () => {
  test('dashboard-with-workflows', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Wait for at least one workflow card to appear.
    try {
      await page.waitForSelector('[href*="/workflows/"]', { timeout: 10_000 });
    } catch {
      // Workflow cards may not be present — screenshot whatever is shown.
    }

    await screenshot(page, 'dashboard-with-workflows');
  });

  test('dashboard-search-filter', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Focus the search input and type a query to show the search in action.
    try {
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i),
      );
      await searchInput.first().click();
      await searchInput.first().fill('Purchase');
      await page.waitForTimeout(800);
    } catch {
      // Search input may not be present — proceed anyway.
    }

    await screenshot(page, 'dashboard-search-filter');
  });

  test('dashboard-portfolio-sidebar', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Ensure the Portfolios panel is expanded (click the toggle if collapsed).
    try {
      const portfoliosBtn = page.getByRole('button', { name: /portfolios/i });
      await portfoliosBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await portfoliosBtn.click();
      await page.waitForTimeout(400);
    } catch {
      // Portfolio sidebar may not be present — proceed.
    }

    await screenshot(page, 'dashboard-portfolio-sidebar');
  });
});

// ─── Upload page ─────────────────────────────────────────────────────────────

test.describe('Upload page screenshots', () => {
  test('upload-page', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/upload', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'upload-page');
  });
});

// ─── Workflow detail pages ────────────────────────────────────────────────────

test.describe('Workflow detail screenshots', () => {
  /**
   * Navigate to the first available workflow detail page.
   * Returns the workflow URL or null if none are available.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function goToFirstWorkflow(page: any): Promise<string | null> {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const workflowLink = page.locator('[href*="/workflows/"]').first();
    try {
      await workflowLink.waitFor({ state: 'visible', timeout: 10_000 });
      await workflowLink.click();
      await page.waitForURL('**/workflows/**', { timeout: 15_000 });
      await page.waitForTimeout(1500);
      return page.url();
    } catch {
      return null;
    }
  }

  /** Click a tab button by its label text. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function clickTab(page: any, name: string) {
    // Tabs are <button> elements with icon + label text.
    try {
      const tab = page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
      await tab.waitFor({ state: 'visible', timeout: 5_000 });
      await tab.click();
      await page.waitForTimeout(1200);
    } catch {
      // Fallback: try clicking any element matching the text.
      try {
        await page.getByText(new RegExp(`^${name}$`)).first().click();
        await page.waitForTimeout(1200);
      } catch {
        // Tab not available — proceed with current state.
      }
    }
  }

  test('workflow-flow-view', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    // The "Workflow" tab is active by default — wait for the process map.
    try {
      await page.waitForSelector(
        'canvas, [class*="canvas"], [class*="flow"], [class*="process-map"], svg',
        { timeout: 8_000 },
      );
    } catch {
      // Canvas may not appear on a sample workflow.
    }

    await screenshot(page, 'workflow-flow-view');
  });

  test('workflow-swimlane-view', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    // Click the "Swimlane" mode button in the mode switcher.
    try {
      const swimlaneBtn = page.getByRole('button', { name: /swimlane/i });
      await swimlaneBtn.waitFor({ state: 'visible', timeout: 8_000 });
      await swimlaneBtn.click();
      await page.waitForTimeout(1000);
    } catch {
      // Mode switcher not present — skip.
    }

    await screenshot(page, 'workflow-swimlane-view');
  });

  test('workflow-sop-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'SOP');
    await screenshot(page, 'workflow-sop-tab');
  });

  test('workflow-report-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'Report');
    await screenshot(page, 'workflow-report-tab');
  });

  test('workflow-insights-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'Insights');
    await screenshot(page, 'workflow-insights-tab');
  });

  test('workflow-interpretation-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'Interpretation');
    await screenshot(page, 'workflow-interpretation-tab');
  });

  test('workflow-intelligence-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'Intelligence');
    await screenshot(page, 'workflow-intelligence-tab');
  });

  test('workflow-agents-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'AI Agents');
    await screenshot(page, 'workflow-agents-tab');
  });

  test('workflow-evidence-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;
    await clickTab(page, 'Evidence');
    await screenshot(page, 'workflow-evidence-tab');
  });

  test('workflow-share-dialog', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    // Click the Share button to open the share dialog.
    try {
      const shareBtn = page.getByRole('button', { name: /^Share$/i });
      await shareBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await shareBtn.click();
      await page.waitForTimeout(800);
    } catch {
      // Share button not present — proceed.
    }

    await screenshot(page, 'workflow-share-dialog');
  });
});

// ─── Analytics / Process Intelligence ────────────────────────────────────────

test.describe('Analytics screenshots', () => {
  test('analytics-dashboard', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // If there's a "Run Analysis" button, click it to populate analytics.
    try {
      const runBtn = page.getByRole('button', { name: /run analysis/i });
      await runBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await runBtn.click();

      // Wait for analysis to complete — look for process families to appear
      // or wait up to 15 seconds for the results.
      try {
        await page.waitForSelector('[href*="/analytics/process/"]', { timeout: 15_000 });
      } catch {
        // Analysis may not produce visible links — wait a flat duration as fallback.
        await page.waitForTimeout(8_000);
      }

      // Reload the page to get the post-analysis view cleanly.
      await page.goto('/analytics', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    } catch {
      // Button may not be present or analysis already done.
    }

    await screenshot(page, 'analytics-dashboard');
  });

  test('analytics-process-detail', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // If analysis hasn't been run yet, run it now.
    try {
      const runBtn = page.getByRole('button', { name: /run analysis/i });
      const hasRunBtn = await runBtn.isVisible().catch(() => false);
      if (hasRunBtn) {
        await runBtn.click();
        await page.waitForTimeout(10_000);
        await page.goto('/analytics', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
      }
    } catch {
      // Already analyzed.
    }

    // Attempt to click into the first process definition detail.
    try {
      const processLink = page.locator('[href*="/analytics/process/"]').first();
      await processLink.waitFor({ state: 'visible', timeout: 8_000 });
      await processLink.click();
      await page.waitForURL('**/analytics/process/**', { timeout: 15_000 });
      await page.waitForTimeout(1500);
    } catch {
      // No process definitions available — screenshot analytics overview.
    }

    await screenshot(page, 'analytics-process-detail');
  });
});

// ─── Recommendations ─────────────────────────────────────────────────────────

test.describe('Recommendations screenshots', () => {
  test('recommendations-page', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/recommendations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'recommendations-page');
  });
});

// ─── Teams ───────────────────────────────────────────────────────────────────

test.describe('Teams screenshots', () => {
  test('teams-page', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/teams', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'teams-page');
  });

  test('teams-create', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/teams', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Reveal the create team form.
    try {
      const createBtn = page
        .getByRole('button', { name: /create team|new team/i })
        .or(page.getByRole('button', { name: /\+/i }).first());
      await createBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await createBtn.click();
      await page.waitForTimeout(600);
    } catch {
      // Button not visible — proceed with current state.
    }

    await screenshot(page, 'teams-create');
  });
});

// ─── Account ─────────────────────────────────────────────────────────────────

test.describe('Account screenshots', () => {
  test('account-page', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'account-page');
  });

  test('account-api-keys', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll to the Extension Sync / API keys section.
    try {
      const keysSection = page.getByRole('heading', {
        name: /extension sync|api key/i,
      });
      await keysSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    } catch {
      // Heading not found — screenshot from current scroll position.
    }

    await screenshot(page, 'account-api-keys');
  });
});
