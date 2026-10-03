/**
 * saved-views-persistence.spec.ts  (backlog #367)
 *
 * Real round trip for ColumnPicker saved views: create / rename / delete via the
 * drawer, reload, and assert the server persisted the change. The preferences
 * API is deliberately NOT mocked (the prior v2-a11y saved-view tests mock it,
 * which is how the "PUT strips savedViews" bug went unnoticed). Only
 * /api/workflows is stubbed so the toolbar renders deterministically.
 *
 * Auth: authenticated project (storageState .auth/user.json). The user's own
 * preference row is snapshotted before and restored after each test.
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';
const PREFS_URL = '/api/dashboard/preferences';

function makeWorkflow(id: string, title: string): object {
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
  savedViews: Array<{ id: string; name: string }>;
}

async function getPrefs(request: APIRequestContext): Promise<Prefs> {
  const res = await request.get(PREFS_URL);
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { data: { preferences: Prefs } }).data.preferences;
}

async function stubWorkflows(page: Page): Promise<void> {
  await page.route('**/api/workflows**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: [makeWorkflow('wf-sv1', 'Saved View Workflow One'), makeWorkflow('wf-sv2', 'Saved View Workflow Two'), makeWorkflow('wf-sv3', 'Saved View Workflow Three')],
        stats: { portfolioHealthScore: 70, insightChips: [], topInsights: [], userPlan: 'free' },
      }),
    });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('ledgerium_analytics_consent', 'essential');
  });
}

async function openPicker(page: Page) {
  await page.getByRole('button', { name: 'Customize columns' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize columns' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function load(page: Page) {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByText('Saved View Workflow One')).toBeVisible();
}

/** Run an action that triggers the debounced PUT and wait for it to succeed. */
async function withPersistedPut(page: Page, action: () => Promise<void>): Promise<void> {
  const put = page.waitForResponse(
    (r) => r.url().includes(PREFS_URL) && r.request().method() === 'PUT',
  );
  await action();
  const res = await put;
  expect(res.status()).toBe(200);
}

test.describe('saved views persist server-side (#367)', () => {
  let original: Prefs;

  test.beforeEach(async ({ request }) => {
    original = await getPrefs(request);
    // Start from a known-empty saved-views list (real API).
    const res = await request.put(PREFS_URL, {
      data: { visibleColumns: original.visibleColumns, columnOrder: original.columnOrder, savedViews: [] },
    });
    expect(res.status()).toBe(200);
  });

  test.afterEach(async ({ request }) => {
    await request.put(PREFS_URL, {
      data: {
        visibleColumns: original.visibleColumns,
        columnOrder: original.columnOrder,
        savedViews: original.savedViews,
      },
    });
  });

  test('create, rename and delete each survive a reload', async ({ page, request }) => {
    await stubWorkflows(page);
    await load(page);

    // ── create ──
    let dialog = await openPicker(page);
    await dialog.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
    await dialog.getByRole('textbox', { name: 'Name for saved view' }).fill('E2E Persisted View');
    await withPersistedPut(page, () => dialog.getByRole('button', { name: 'Confirm save view' }).click());

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    const list = dialog.getByRole('list', { name: 'Your saved views' });
    await expect(list.getByRole('button', { name: 'Apply saved view: E2E Persisted View' })).toBeVisible();
    expect((await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['E2E Persisted View']);

    // ── rename ──
    await list.getByRole('button', { name: 'Rename saved view: E2E Persisted View' }).click({ force: true });
    const renameInput = dialog.getByRole('textbox', { name: 'Rename saved view' });
    await renameInput.fill('E2E Renamed View');
    await withPersistedPut(page, () => renameInput.press('Enter'));

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    await expect(dialog.getByRole('button', { name: 'Apply saved view: E2E Renamed View' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Apply saved view: E2E Persisted View' })).toHaveCount(0);

    // ── delete ──
    await dialog.getByRole('button', { name: 'Delete saved view: E2E Renamed View' }).click({ force: true });
    await withPersistedPut(page, () =>
      dialog.getByRole('button', { name: 'Confirm delete — E2E Renamed View' }).click(),
    );

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    await expect(dialog.getByText('No saved views yet.')).toBeVisible();
    expect((await getPrefs(request)).savedViews).toEqual([]);
  });

  test('a column toggle PUT (no savedViews field) does not wipe saved views', async ({ page, request }) => {
    await stubWorkflows(page);
    const seed = await request.put(PREFS_URL, {
      data: {
        visibleColumns: original.visibleColumns,
        columnOrder: original.columnOrder,
        savedViews: [
          {
            id: 'e2e-seed-view',
            name: 'Seeded',
            visibleColumns: original.visibleColumns,
            columnOrder: original.columnOrder,
            filters: [],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });
    expect(seed.status()).toBe(200);

    await load(page);
    const dialog = await openPicker(page);
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Seeded' })).toBeVisible();

    // Toggle any non-locked column checkbox → column-only PUT.
    const box = dialog.getByRole('checkbox').and(dialog.locator(':not([disabled])')).first();
    await withPersistedPut(page, () => box.click());

    expect((await getPrefs(request)).savedViews.map((v) => v.id)).toEqual(['e2e-seed-view']);
  });

  // ── #369: a column change right after a saved-view change must not drop it ──
  const toggleAnyColumn = (dialog: ReturnType<Page['getByRole']>) =>
    dialog.getByRole('checkbox').and(dialog.locator(':not([disabled])')).first().click();

  async function seedView(request: APIRequestContext): Promise<void> {
    const res = await request.put(PREFS_URL, {
      data: {
        visibleColumns: original.visibleColumns,
        columnOrder: original.columnOrder,
        savedViews: [
          {
            id: 'e2e-seed-view',
            name: 'Seeded',
            visibleColumns: original.visibleColumns,
            columnOrder: original.columnOrder,
            filters: [],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });
    expect(res.status()).toBe(200);
  }

  test('create then immediately toggle a column: the view survives a reload (#369)', async ({ page, request }) => {
    await stubWorkflows(page);
    await load(page);
    let dialog = await openPicker(page);
    await dialog.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
    await dialog.getByRole('textbox', { name: 'Name for saved view' }).fill('Quick Toggle View');
    await withPersistedPut(page, async () => {
      await dialog.getByRole('button', { name: 'Confirm save view' }).click();
      await toggleAnyColumn(dialog); // inside the 400 ms debounce window
    });

    expect((await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['Quick Toggle View']);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Quick Toggle View' })).toBeVisible();
  });

  test('rename then immediately toggle a column: the rename survives a reload (#369)', async ({ page, request }) => {
    await seedView(request);
    await stubWorkflows(page);
    await load(page);
    let dialog = await openPicker(page);
    await dialog.getByRole('list', { name: 'Your saved views' })
      .getByRole('button', { name: 'Rename saved view: Seeded' }).click({ force: true });
    const input = dialog.getByRole('textbox', { name: 'Rename saved view' });
    await input.fill('Seeded Renamed');
    await withPersistedPut(page, async () => {
      await input.press('Enter');
      await toggleAnyColumn(dialog);
    });

    expect((await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['Seeded Renamed']);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Seeded Renamed' })).toBeVisible();
  });

  test('delete then immediately toggle a column: the delete survives a reload (#369)', async ({ page, request }) => {
    await seedView(request);
    await stubWorkflows(page);
    await load(page);
    let dialog = await openPicker(page);
    await dialog.getByRole('button', { name: 'Delete saved view: Seeded' }).click({ force: true });
    await withPersistedPut(page, async () => {
      await dialog.getByRole('button', { name: 'Confirm delete — Seeded' }).click();
      await toggleAnyColumn(dialog);
    });

    expect((await getPrefs(request)).savedViews).toEqual([]);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    dialog = await openPicker(page);
    await expect(dialog.getByText('No saved views yet.')).toBeVisible();
  });

  // ── #372: at most one PUT in flight; a held first PUT must not be overtaken ──
  async function createView(dialog: ReturnType<Page['getByRole']>, name: string): Promise<void> {
    await dialog.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
    await dialog.getByRole('textbox', { name: 'Name for saved view' }).fill(name);
    await dialog.getByRole('button', { name: 'Confirm save view' }).click();
  }

  /** Hold the first preferences PUT; later PUTs pass through. */
  async function holdFirstPut(page: Page) {
    const seen: string[] = [];
    let release!: (mode: 'continue' | 'fail') => void;
    const released = new Promise<'continue' | 'fail'>((r) => { release = r; });
    let first!: () => void;
    const firstSeen = new Promise<void>((r) => { first = r; });
    let n = 0;
    await page.route('**/api/dashboard/preferences', async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      n += 1;
      seen.push(route.request().postData() ?? '');
      if (n === 1) {
        first();
        const mode = await released;
        if (mode === 'fail') {
          return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
        }
      }
      return route.continue();
    });
    return { seen, release, firstSeen };
  }

  test('a held first PUT is not overtaken: both views survive a reload (#372)', async ({ page, request }) => {
    await stubWorkflows(page);
    await load(page);
    const held = await holdFirstPut(page);
    const dialog = await openPicker(page);

    await createView(dialog, 'Held A');
    await held.firstSeen; // PUT #1 is now unanswered
    await createView(dialog, 'Held B');
    await page.waitForTimeout(1000); // well past the 400 ms debounce
    expect(held.seen).toHaveLength(1); // PUT #2 must be waiting, not in flight

    const second = page.waitForResponse(
      (r) => r.url().includes(PREFS_URL) && r.request().method() === 'PUT' && held.seen.length === 2,
    );
    held.release('continue');
    expect((await second).status()).toBe(200);
    expect(held.seen).toHaveLength(2);

    expect((await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['Held A', 'Held B']);
    await page.unroute('**/api/dashboard/preferences');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    const d2 = await openPicker(page);
    await expect(d2.getByRole('button', { name: 'Apply saved view: Held A' })).toBeVisible();
    await expect(d2.getByRole('button', { name: 'Apply saved view: Held B' })).toBeVisible();
  });

  test('a held first PUT that fails: the queued save still persists both and the UI matches the server (#372)', async ({ page, request }) => {
    await stubWorkflows(page);
    await load(page);
    const held = await holdFirstPut(page);
    const dialog = await openPicker(page);

    await createView(dialog, 'Fail A');
    await held.firstSeen;
    await createView(dialog, 'Fail B');
    await page.waitForTimeout(1000);
    expect(held.seen).toHaveLength(1);

    const second = page.waitForResponse(
      (r) => r.url().includes(PREFS_URL) && r.request().method() === 'PUT' && held.seen.length === 2,
    );
    held.release('fail');
    expect((await second).status()).toBe(200);

    // UI was not rolled back and shows no stale error; server holds the same list.
    const list = dialog.getByRole('list', { name: 'Your saved views' });
    await expect(list.getByRole('button', { name: 'Apply saved view: Fail A' })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Apply saved view: Fail B' })).toBeVisible();
    await expect(dialog.getByText(/Couldn't save your changes/)).toHaveCount(0);
    expect((await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['Fail A', 'Fail B']);

    await page.unroute('**/api/dashboard/preferences');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    const d2 = await openPicker(page);
    await expect(d2.getByRole('button', { name: 'Apply saved view: Fail A' })).toBeVisible();
    await expect(d2.getByRole('button', { name: 'Apply saved view: Fail B' })).toBeVisible();
  });
});

