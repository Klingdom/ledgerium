/**
 * Row #406: the dashboard shows, and dashboard_v2_viewed reports, the range the
 * user actually sees. With a stored range the stored value is adopted only when
 * the preferences GET answers; before this row the list rendered (and the view
 * event fired) with the default 'all' in the meantime.
 *
 * Observation: delivered bodies (sendBeacon / fetch to /api/analytics/events, as in
 * bounce.spec.ts) plus the in-page buffer, since a non-terminal event is buffered
 * until the batch flush.
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';
const PREFS_URL = '/api/dashboard/preferences';

function wf(id: string, title: string, daysAgo: number): object {
  return {
    id,
    title,
    toolsUsed: ['Salesforce'],
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastViewedAt: null,
    metricsV2: {
      runs: 3,
      avgTimeMs: 90_000,
      variationScore: 0.3,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: { overall: 80, speed: 20, consistency: 20, dataQuality: 16, standardization: 14, isGated: false },
      opportunityTag: 'healthy',
      aiOpportunityScore: 30,
      confidence: 0.82,
    },
  };
}

interface Prefs {
  visibleColumns: string[];
  columnOrder: string[];
  savedViews: unknown[];
  defaultTimeRange?: string;
}

async function getPrefs(request: APIRequestContext): Promise<Prefs> {
  const res = await request.get(PREFS_URL);
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { data: { preferences: Prefs } }).data.preferences;
}

/** Recent (inside every range) + Old (visible only under 'all'). */
async function stubWorkflows(page: Page): Promise<void> {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [
          wf('wf-r1', 'Range Recent One', 2),
          wf('wf-r2', 'Range Recent Two', 3),
          wf('wf-r3', 'Range Recent Three', 4),
          wf('wf-old', 'Range Old Workflow', 40),
        ],
        stats: { portfolioHealthScore: 70, insightChips: [], topInsights: [], userPlan: 'free' },
      }),
    });
  });
}

/** Record delivered analytics bodies, and whether the 'all'-only row ever hit the DOM. */
async function observe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('ledgerium_analytics_consent', 'essential');
    const w = window as unknown as { __delivered: Promise<string>[]; __sawOld: boolean };
    w.__delivered = [];
    w.__sawOld = false;
    const isAnalytics = (u: unknown) => String(u).includes('/api/analytics/events');
    const origBeacon = navigator.sendBeacon?.bind(navigator);
    if (origBeacon) {
      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
        if (isAnalytics(url) && data instanceof Blob) w.__delivered.push(data.text());
        else if (isAnalytics(url) && typeof data === 'string') w.__delivered.push(Promise.resolve(data));
        return origBeacon(url, data);
      };
    }
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL ? input : input.url;
      if (isAnalytics(url) && typeof init?.body === 'string') w.__delivered.push(Promise.resolve(init.body));
      return origFetch(input, init);
    };
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Range Old Workflow')) w.__sawOld = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
}

/** time_range of every delivered dashboard_v2_viewed, in delivery order. */
async function viewedRanges(page: Page): Promise<unknown[]> {
  return page.evaluate(async () => {
    const w = window as unknown as { __delivered?: Promise<string>[]; __ledgerium_events?: Array<Record<string, unknown>> };
    const bodies = await Promise.all(w.__delivered ?? []);
    const out: unknown[] = [];
    // Delivered batches first (drained earlier), then anything still buffered.
    const buffered = (w.__ledgerium_events ?? []).filter((e) => e.event === 'dashboard_v2_viewed');
    for (const b of bodies) {
      try {
        for (const e of (JSON.parse(b).events ?? []) as Array<Record<string, unknown>>) {
          if (e.event === 'dashboard_v2_viewed') out.push(e.time_range);
        }
      } catch { /* not JSON */ }
    }
    for (const e of buffered) out.push(e.time_range);
    return out;
  });
}

async function sawOld(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __sawOld: boolean }).__sawOld);
}

test.describe('view event and list carry the displayed range (#406)', () => {
  let original: Prefs;

  async function store(request: APIRequestContext, range: string): Promise<void> {
    const res = await request.put(PREFS_URL, {
      data: { visibleColumns: original.visibleColumns, columnOrder: original.columnOrder, defaultTimeRange: range },
    });
    expect(res.status()).toBe(200);
  }

  test.beforeEach(async ({ request }) => {
    original = await getPrefs(request);
    await store(request, '7d');
  });

  test.afterEach(async ({ request }) => {
    await request.put(PREFS_URL, {
      data: {
        visibleColumns: original.visibleColumns,
        columnOrder: original.columnOrder,
        savedViews: original.savedViews,
        defaultTimeRange: original.defaultTimeRange ?? 'all',
      },
    });
  });

  test('preferences GET delayed: no rows before the range applies; the first view carries 7d', async ({ page }) => {
    await stubWorkflows(page);
    await observe(page);
    await page.route(`**${PREFS_URL}`, async (route) => {
      if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto(V2_URL, { waitUntil: 'domcontentloaded' });

    // Well inside the hold (workflows answered, preferences not): nothing shown, no view yet.
    await page.waitForTimeout(900);
    await expect(page.getByText('Range Recent One')).toHaveCount(0);
    await expect(page.getByText('Range Old Workflow')).toHaveCount(0);
    expect(await viewedRanges(page)).toEqual([]);

    await expect(page.getByText('Range Recent One')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Time range')).toHaveValue('7d');
    await expect(page.getByText('Range Old Workflow')).toHaveCount(0);
    await expect.poll(() => viewedRanges(page), { timeout: 10_000 }).not.toEqual([]);
    expect((await viewedRanges(page))[0]).toBe('7d');
    expect(await sawOld(page), "a row only the 'all' range shows was rendered").toBe(false);
  });

  test('preferences GET 500: rows show with the default range and the view carries it', async ({ page }) => {
    await stubWorkflows(page);
    await observe(page);
    await page.route(`**${PREFS_URL}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });
    await page.goto(V2_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Range Recent One')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Time range')).toHaveValue('all');
    await expect(page.getByText('Range Old Workflow')).toBeVisible();
    await expect.poll(() => viewedRanges(page), { timeout: 10_000 }).not.toEqual([]);
    expect((await viewedRanges(page))[0]).toBe('all');
  });

  test('an explicit URL range wins and is not held for the preferences', async ({ page }) => {
    await stubWorkflows(page);
    await observe(page);
    await page.route(`**${PREFS_URL}`, async (route) => {
      if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await page.goto('/dashboard?v2=1&timeRange=90d', { waitUntil: 'domcontentloaded' });
    // Shown well before the held GET answers.
    await expect(page.getByText('Range Recent One')).toBeVisible({ timeout: 3500 });
    await expect(page.getByLabel('Time range')).toHaveValue('90d');
    await expect.poll(() => viewedRanges(page), { timeout: 10_000 }).not.toEqual([]);
    expect((await viewedRanges(page))[0]).toBe('90d');
  });
});
