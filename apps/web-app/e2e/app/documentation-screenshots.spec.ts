/**
 * Documentation screenshots — authenticated app pages.
 *
 * Captures a canonical screenshot of every key feature in the Ledgerium AI
 * web app for use in user-facing documentation.
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

  // Load the sample workflow so the dashboard is never empty.
  // The endpoint is idempotent — it returns alreadyExists:true on repeat calls.
  await request.post('/api/sample-workflow');
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

test.describe('Dashboard screenshots', () => {
  test('dashboard-empty', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    // Navigate before the sample workflow loads in the browser to capture
    // the onboarding checklist / empty state.  The page will show the
    // checklist for a fresh session even if a workflow exists in the DB.
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll back to top so the empty-state / checklist is visible.
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, 'dashboard-empty');
  });

  test('dashboard-with-workflows', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

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

    // Focus the search input to make the controls clearly visible.
    try {
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i)
      );
      await searchInput.first().focus();
    } catch {
      // Search input may not be present in the current view — proceed anyway.
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
      // The button acts as a toggle; if the sidebar is already open the class
      // contains 'brand' tokens.  Click it once to open if needed.
      const btnClass = await portfoliosBtn.getAttribute('class');
      if (btnClass && !btnClass.includes('brand-50')) {
        await portfoliosBtn.click();
        await page.waitForTimeout(400);
      }
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

  test('workflow-flow-view', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) {
      // No workflow available — skip gracefully.
      return;
    }

    // The "Workflow" tab is active by default.
    // Wait for the canvas / process map to render.
    try {
      await page.waitForSelector('canvas, [class*="canvas"], [class*="flow"]', {
        timeout: 8_000,
      });
    } catch {
      // Canvas may not appear on a sample workflow with no process map.
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

    try {
      await page.getByRole('button', { name: /^SOP$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      // Tab may use different selector — try text fallback.
      try {
        await page.getByText(/^SOP$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available — capture current state.
      }
    }

    await screenshot(page, 'workflow-sop-tab');
  });

  test('workflow-report-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^Report$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^Report$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-report-tab');
  });

  test('workflow-insights-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^Insights$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^Insights$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-insights-tab');
  });

  test('workflow-interpretation-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^Interpretation$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^Interpretation$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-interpretation-tab');
  });

  test('workflow-intelligence-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^Intelligence$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^Intelligence$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-intelligence-tab');
  });

  test('workflow-agents-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^AI Agents$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^AI Agents$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-agents-tab');
  });

  test('workflow-evidence-tab', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    try {
      await page.getByRole('button', { name: /^Evidence$/i }).click();
      await page.waitForTimeout(1000);
    } catch {
      try {
        await page.getByText(/^Evidence$/).click();
        await page.waitForTimeout(1000);
      } catch {
        // Not available.
      }
    }

    await screenshot(page, 'workflow-evidence-tab');
  });

  test('workflow-share-dialog', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    const url = await goToFirstWorkflow(page);
    if (!url) return;

    // Click the Share button to enable sharing and reveal the share state.
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
    await page.waitForTimeout(1000);
    await screenshot(page, 'analytics-dashboard');
  });

  test('analytics-process-detail', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Attempt to click into the first process definition detail.
    try {
      const processLink = page.locator('[href*="/analytics/process/"]').first();
      await processLink.waitFor({ state: 'visible', timeout: 8_000 });
      await processLink.click();
      await page.waitForURL('**/analytics/process/**', { timeout: 15_000 });
      await page.waitForTimeout(1000);
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
