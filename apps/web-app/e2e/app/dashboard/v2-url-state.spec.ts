/**
 * v2-url-state.spec.ts
 *
 * WHY THIS EXISTS (row #198)
 *
 * The filter state is now mirrored into the URL so a filtered view can be
 * shared, bookmarked and reloaded. That work is covered by 35 unit tests — but
 * those test the pure parse/serialise functions in isolation. They cannot tell
 * you whether the shell is actually WIRED to them: a perfectly correct parser
 * that nothing calls would pass every one of them.
 *
 * These tests exercise the wiring in a real browser: a URL with filters in it
 * must change what is rendered, and changing what is rendered must change the
 * URL. Nothing else here is worth testing at this level.
 */

import { test, expect } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

function makeWorkflow(id: string, title: string, opportunityTag: string) {
  return {
    id,
    title,
    toolsUsed: ['Salesforce'],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    lastViewedAt: null,
    processDefinitionUpdatedAt: '2026-09-10T10:00:00.000Z',
    healthStatus: 'healthy',
    metricsV2: {
      runs: 12,
      avgTimeMs: 240_000,
      variationScore: 0.2,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: 80,
        speed: 20,
        consistency: 20,
        dataQuality: 20,
        standardization: 20,
        isGated: false,
      },
      opportunityTag,
      aiOpportunityScore: 50,
      confidence: 0.8,
    },
  };
}

const WORKFLOWS = [
  makeWorkflow('wf-a', 'Alpha Automate', 'automate'),
  makeWorkflow('wf-b', 'Beta Healthy', 'healthy'),
  makeWorkflow('wf-c', 'Gamma Healthy', 'healthy'),
];

async function stubWorkflows(page: import('@playwright/test').Page) {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: WORKFLOWS,
        stats: { portfolioHealthScore: 80, insightChips: [], topInsights: [] },
      }),
    });
  });
}

test('a filtered URL actually filters the list on load (#198)', async ({ page }) => {
  await stubWorkflows(page);
  await page.goto(`${V2_URL}&opportunity=automate`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // The automate row survives; the healthy ones are filtered out. If the shell
  // were not wired to the parser, all three would render and this fails.
  await expect(page.getByText('Alpha Automate')).toBeVisible();
  await expect(page.getByText('Beta Healthy')).toHaveCount(0);
  await expect(page.getByText('Gamma Healthy')).toHaveCount(0);
});

test('an unfiltered dashboard leaves a clean URL, and a bad value does not break it (#198)', async ({ page }) => {
  await stubWorkflows(page);

  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  // Only the ?v2=1 that got us here — no filter params invented from defaults.
  expect(new URL(page.url()).searchParams.get('opportunity')).toBeNull();
  expect(new URL(page.url()).searchParams.get('timeRange')).toBeNull();

  // Hostile/unknown values must fall back to the default rather than throw or
  // render an empty dashboard.
  await page.goto(`${V2_URL}&timeRange=banana&opportunity=%3Bdrop`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await expect(page.getByText('Alpha Automate')).toBeVisible();
  await expect(page.getByText('Beta Healthy')).toBeVisible();
});

test('reloading a filtered URL keeps the filter (#198)', async ({ page }) => {
  await stubWorkflows(page);
  await page.goto(`${V2_URL}&opportunity=automate`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await expect(page.getByText('Alpha Automate')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // The whole point of the row: the view survives a reload.
  await expect(page.getByText('Alpha Automate')).toBeVisible();
  await expect(page.getByText('Beta Healthy')).toHaveCount(0);
});

test('changing a filter in the UI writes it to the URL, so the view is shareable (#198)', async ({ page }) => {
  await stubWorkflows(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // The opportunity select lives behind the toolbar's filter panel.
  await page.getByRole('button', { name: 'Toggle filters' }).click();
  await page.getByLabel('Filter by opportunity').selectOption('automate');
  await page.waitForTimeout(500);

  // This is the half the unit tests cannot reach: the shell must serialise its
  // state back into the address bar, or nothing is actually shareable.
  await expect
    .poll(() => new URL(page.url()).searchParams.get('opportunity'), { timeout: 5000 })
    .toBe('automate');

  // And it must be a real shareable link, not just a decorated address bar:
  // opening the captured URL in a fresh page must reproduce the filtered view.
  const shared = page.url();
  const page2 = await page.context().newPage();
  await page2.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: WORKFLOWS,
        stats: { portfolioHealthScore: 80, insightChips: [], topInsights: [] },
      }),
    });
  });
  await page2.goto(shared, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(900);
  await expect(page2.getByText('Alpha Automate')).toBeVisible();
  await expect(page2.getByText('Beta Healthy')).toHaveCount(0);
  await page2.close();
});
