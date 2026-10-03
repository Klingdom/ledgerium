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

  // ── #374: a PUT that never answers is aborted client-side; the queued save goes out ──
  test('a never-answered first PUT times out: the queued save is sent and both views survive a reload (#374)', async ({ page, request }) => {
    await page.clock.install(); // timers only advance when we fast-forward
    await stubWorkflows(page);
    await load(page);
    const seen: string[] = [];
    await page.route('**/api/dashboard/preferences', async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      seen.push(route.request().postData() ?? '');
      if (seen.length === 1) return new Promise<void>(() => { /* never answered */ });
      return route.continue();
    });
    const dialog = await openPicker(page);

    await createView(dialog, 'Hang A');
    await expect.poll(() => seen.length).toBe(1); // PUT #1 unanswered
    await createView(dialog, 'Hang B');
    await page.clock.fastForward(1000); // past the 400 ms debounce: queued, not sent
    await page.waitForTimeout(300);
    expect(seen).toHaveLength(1);
    await expect(dialog.getByText('Saving…')).toBeVisible();

    await page.clock.fastForward(16_000); // past the 15 s abort
    await expect.poll(() => seen.length).toBe(2);
    expect(JSON.parse(seen[1]!).savedViews.map((v: { name: string }) => v.name)).toEqual(['Hang A', 'Hang B']);
    await expect(dialog.getByText('Saving…')).toHaveCount(0);
    await expect(dialog.getByText(/Couldn't save your changes/)).toHaveCount(0);
    await expect.poll(async () => (await getPrefs(request)).savedViews.map((v) => v.name)).toEqual(['Hang A', 'Hang B']);

    await page.unroute('**/api/dashboard/preferences');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    const d2 = await openPicker(page);
    await expect(d2.getByRole('button', { name: 'Apply saved view: Hang A' })).toBeVisible();
    await expect(d2.getByRole('button', { name: 'Apply saved view: Hang B' })).toBeVisible();
  });
});

// ── #383: a non-library lens pack must never be saved as the library default ──
test.describe('lens pack never persists as the library pack (#383)', () => {
  let original: Prefs;

  test.beforeEach(async ({ request }) => {
    original = await getPrefs(request);
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

  async function checkedColumns(dialog: ReturnType<Page['getByRole']>): Promise<string[]> {
    const boxes = dialog.getByRole('checkbox');
    const n = await boxes.count();
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const b = boxes.nth(i);
      if (await b.isChecked()) out.push((await b.getAttribute('aria-label')) ?? (await b.evaluate((el) => el.closest('label')?.textContent ?? '')));
    }
    return out;
  }

  test('toggle + create view under the LSS lens leave the saved library columns intact; reload restores them', async ({ page, request }) => {
    await stubWorkflows(page);
    const puts: Array<{ visibleColumns: string[]; columnOrder: string[]; savedViews?: Array<{ name: string }> }> = [];
    page.on('request', (r) => {
      if (r.url().includes(PREFS_URL) && r.method() === 'PUT') puts.push(JSON.parse(r.postData() ?? '{}'));
    });
    await load(page);

    // Library columns as the user sees them, before any lens.
    let dialog = await openPicker(page);
    const libraryChecked = await checkedColumns(dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Switch to the LSS lens (client-only: no PUT).
    await page.locator('#lens-tab-lss').click();
    await expect(page.locator('#lens-tab-lss')).toHaveAttribute('aria-selected', 'true');
    expect(puts).toHaveLength(0);

    dialog = await openPicker(page);
    const lensChecked = await checkedColumns(dialog);
    expect(lensChecked).not.toEqual(libraryChecked); // the lens pack really differs

    // Toggle a column under the lens: lens-local, so no PUT at all.
    await toggleAnyColumnLocal(dialog);
    await page.waitForTimeout(1200); // well past the 400 ms debounce
    expect(puts).toHaveLength(0);

    // Create a saved view under the lens: the PUT carries the view + the LIBRARY pack.
    await dialog.getByRole('button', { name: 'Save current column configuration as a named view' }).click();
    await dialog.getByRole('textbox', { name: 'Name for saved view' }).fill('Lens View');
    await withPersistedPut(page, () => dialog.getByRole('button', { name: 'Confirm save view' }).click());

    expect(puts).toHaveLength(1);
    expect(puts[0]!.visibleColumns).toEqual(original.visibleColumns);
    expect(puts[0]!.columnOrder).toEqual(original.visibleColumns);
    expect(puts[0]!.savedViews!.map((v) => v.name)).toEqual(['Lens View']);

    const prefs = await getPrefs(request);
    expect(prefs.visibleColumns).toEqual(original.visibleColumns);
    expect(prefs.savedViews.map((v) => v.name)).toEqual(['Lens View']);

    // Reload (the lens itself is remembered client-side), return to the library
    // lens: the original library columns are shown.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Open workflow: Saved View Workflow One' })).toBeVisible();
    await page.locator('#lens-tab-library').click();
    await expect(page.locator('#lens-tab-library')).toHaveAttribute('aria-selected', 'true');
    dialog = await openPicker(page);
    expect(await checkedColumns(dialog)).toEqual(libraryChecked);
  });

  function toggleAnyColumnLocal(dialog: ReturnType<Page['getByRole']>) {
    return dialog.getByRole('checkbox').and(dialog.locator(':not([disabled])')).first().click();
  }
});

// ── #384: nothing is sent before the initial preferences GET has succeeded ──
test.describe('no preferences PUT before the baseline loads (#384)', () => {
  let original: Prefs;
  const SEEDED_PACK = ['workflow_title', 'health_score', 'run_count'];
  const seedView = (id: string, name: string) => ({
    id,
    name,
    visibleColumns: ['workflow_title', 'health_score'],
    columnOrder: ['workflow_title', 'health_score'],
    filters: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  test.beforeEach(async ({ request }) => {
    original = await getPrefs(request);
    const res = await request.put(PREFS_URL, {
      data: {
        visibleColumns: SEEDED_PACK,
        columnOrder: SEEDED_PACK,
        savedViews: [seedView('seed-a', 'Alpha'), seedView('seed-b', 'Beta')],
      },
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

  function recordPuts(page: Page): Array<Record<string, unknown>> {
    const puts: Array<Record<string, unknown>> = [];
    page.on('request', (r) => {
      if (r.url().includes(PREFS_URL) && r.method() === 'PUT') puts.push(JSON.parse(r.postData() ?? '{}'));
    });
    return puts;
  }

  async function expectServerUnchanged(request: APIRequestContext) {
    const prefs = await getPrefs(request);
    expect(prefs.visibleColumns).toEqual(SEEDED_PACK);
    expect(prefs.savedViews.map((v) => v.name)).toEqual(['Alpha', 'Beta']);
  }

  test('A: LSS lens, GET held 4 s: create is blocked, no PUT, stored views and library pack intact', async ({ page, request }) => {
    await stubWorkflows(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('ledgerium.dashboard.activeLens', 'lss');
    });
    const puts = recordPuts(page);
    let releaseGet!: () => void;
    const gate = new Promise<void>((r) => { releaseGet = r; });
    await page.route('**/api/dashboard/preferences', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await gate;
      return route.continue();
    });

    await page.goto(V2_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Open workflow: Saved View Workflow One' })).toBeVisible();
    await expect(page.locator('#lens-tab-lss')).toHaveAttribute('aria-selected', 'true');
    const dialog = await openPicker(page);

    // The GET has not answered: the create control is off, the list is not claimed empty.
    const save = dialog.getByRole('button', { name: 'Save current column configuration as a named view' });
    await expect(save).toBeDisabled();
    await expect(dialog.getByText('No saved views yet.')).toHaveCount(0);
    await save.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200); // well past the 400 ms debounce
    expect(puts).toHaveLength(0);

    releaseGet();
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Alpha' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Beta' })).toBeVisible();
    await expect(save).toBeEnabled();
    await page.waitForTimeout(1000);
    expect(puts).toHaveLength(0);
    await expectServerUnchanged(request);
  });

  test('B: GET answers 500: no PUT on an attempted create, error + Retry show, Retry loads the stored views', async ({ page, request }) => {
    await stubWorkflows(page);
    const puts = recordPuts(page);
    let gets = 0;
    let failing = true; // dev StrictMode runs the load effect twice: fail every GET until Retry
    await page.route('**/api/dashboard/preferences', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      gets += 1;
      if (failing) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
      }
      return route.continue();
    });

    await load(page);
    const dialog = await openPicker(page);
    await expect(dialog.getByText("Couldn't load your saved views.")).toBeVisible();
    const save = dialog.getByRole('button', { name: 'Save current column configuration as a named view' });
    await expect(save).toBeDisabled();
    await save.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200);
    expect(puts).toHaveLength(0);
    await expectServerUnchanged(request);

    failing = false;
    const getsBeforeRetry = gets;
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Alpha' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Apply saved view: Beta' })).toBeVisible();
    await expect(dialog.getByText("Couldn't load your saved views.")).toHaveCount(0);
    await expect(save).toBeEnabled();
    await expect(save).toBeFocused();
    expect(gets).toBe(getsBeforeRetry + 1);
    await page.waitForTimeout(800);
    expect(puts).toHaveLength(0);
    await expectServerUnchanged(request);
  });

  test('C: library lens, column toggled before the GET answers: nothing sent until it does, then one PUT with the column change and no savedViews', async ({ page, request }) => {
    await stubWorkflows(page);
    const puts = recordPuts(page);
    let releaseGet!: () => void;
    const gate = new Promise<void>((r) => { releaseGet = r; });
    await page.route('**/api/dashboard/preferences', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await gate;
      return route.continue();
    });

    await page.goto(V2_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Saved View Workflow One')).toBeVisible();
    const dialog = await openPicker(page);
    const box = dialog.getByRole('checkbox').and(dialog.locator(':not([disabled])')).first();
    const before = await box.isChecked();
    await box.click();
    await page.waitForTimeout(1200);
    expect(puts).toHaveLength(0); // queued, not sent

    const put = page.waitForResponse((r) => r.url().includes(PREFS_URL) && r.request().method() === 'PUT');
    releaseGet();
    expect((await put).status()).toBe(200);
    expect(puts).toHaveLength(1);
    expect(puts[0]).not.toHaveProperty('savedViews'); // server keeps the stored list
    // A local edit made before the load wins over the server's pack.
    expect(await box.isChecked()).toBe(!before);
    const prefs = await getPrefs(request);
    expect(prefs.savedViews.map((v) => v.name)).toEqual(['Alpha', 'Beta']);
    expect(prefs.visibleColumns).toEqual(puts[0]!.visibleColumns);
  });
});
