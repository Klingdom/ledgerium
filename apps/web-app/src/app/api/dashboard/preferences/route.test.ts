/**
 * Unit tests for GET + PUT /api/dashboard/preferences (iter-061, Path D D+4).
 *
 * Covers:
 *  - GET 401 when unauthenticated
 *  - GET returns default preferences for a user with no stored row
 *  - GET returns stored preferences for a user with an existing row
 *  - GET writes back cleaned prefs when droppedKeys are present (E2E Scenario 4)
 *  - PUT 401 when unauthenticated
 *  - PUT 400 when body contains unknown ColumnKey
 *  - PUT 400 when body is invalid JSON shape
 *  - PUT happy path — persists and returns preferences
 *  - PUT preserves existing filters (only updates visibleColumns + columnOrder)
 *  - Round-trip: PUT data can be retrieved by GET
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/db') — controls db upsert / findUnique
 *  - vi.mock for persistence + index modules — prevents ESM .js resolution failure
 *    in root vitest context (no @-alias in workspace root vitest.config.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks (hoisted by vitest transform) ────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    userDashboardPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// The route imports these with .js extensions — mock them so the ESM resolver
// doesn't fail in the root vitest environment which lacks the @ alias.
// Provide just enough surface for the route's calls to work correctly.

const ALL_KNOWN_KEYS = [
  'workflow_title', 'health_score', 'last_run_at', 'run_count',
  'case_volume', 'cycle_time_ms', 'cycle_time_mean_ms', 'systems',
  'opportunity_tag', 'system_count_per_run',
] as const;

type KnownKey = (typeof ALL_KNOWN_KEYS)[number];

// Default preferences returned when no stored row exists
const DEFAULT_PREFS = {
  schemaVersion: 1,
  visibleColumns: ['workflow_title', 'health_score', 'last_run_at', 'run_count', 'systems', 'opportunity_tag'],
  columnOrder: ['workflow_title', 'health_score', 'last_run_at', 'run_count', 'systems', 'opportunity_tag'],
  filters: [] as unknown[],
  savedViews: [] as unknown[],
};

function makeMigrationResult(prefs: typeof DEFAULT_PREFS, dropped: string[] = []) {
  return { preferences: prefs, droppedKeys: dropped, warnings: [] as string[] };
}

vi.mock('@/lib/dashboard-columns/persistence.js', () => ({
  CURRENT_SCHEMA_VERSION: 1,
  getDefaultPreferences: vi.fn(() => ({ ...DEFAULT_PREFS })),
  deserializePreferencesFromDb: vi.fn((row: { schemaVersion: number; payload: string } | null) => {
    if (row === null) return makeMigrationResult({ ...DEFAULT_PREFS });
    try {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      // Detect stale keys — any key not in ALL_KNOWN_KEYS is "dropped"
      const cols = (parsed.visibleColumns as string[]) ?? [];
      const dropped = cols.filter((k) => !(ALL_KNOWN_KEYS as readonly string[]).includes(k));
      const clean = cols.filter((k) => (ALL_KNOWN_KEYS as readonly string[]).includes(k));
      const prefs = { ...DEFAULT_PREFS, ...parsed, visibleColumns: clean, columnOrder: clean };
      return makeMigrationResult(prefs as typeof DEFAULT_PREFS, dropped);
    } catch {
      return makeMigrationResult({ ...DEFAULT_PREFS });
    }
  }),
  migratePreferences: vi.fn((raw: Record<string, unknown>) => {
    const cols = (raw.visibleColumns as string[]) ?? [];
    const dropped = cols.filter((k) => !(ALL_KNOWN_KEYS as readonly string[]).includes(k));
    const clean = cols.filter((k) => (ALL_KNOWN_KEYS as readonly string[]).includes(k));
    const prefs = { ...DEFAULT_PREFS, ...raw, visibleColumns: clean, columnOrder: clean };
    return makeMigrationResult(prefs as typeof DEFAULT_PREFS, dropped);
  }),
  serializePreferencesForDb: vi.fn((prefs: typeof DEFAULT_PREFS) => ({
    schemaVersion: prefs.schemaVersion,
    payload: JSON.stringify(prefs),
  })),
}));

vi.mock('@/lib/dashboard-columns/index.js', () => ({
  listColumnKeys: vi.fn(() => ALL_KNOWN_KEYS),
  getColumnByKey: vi.fn((key: KnownKey) => ({ key, label: key })),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = db.userDashboardPreference.findUnique as ReturnType<typeof vi.fn>;
const mockUpsert = db.userDashboardPreference.upsert as ReturnType<typeof vi.fn>;

// ── Canonical payload fixtures ────────────────────────────────────────────────

const STORED_PAYLOAD = JSON.stringify({
  schemaVersion: 1,
  visibleColumns: ['workflow_title', 'health_score', 'last_run_at'],
  columnOrder: ['workflow_title', 'health_score', 'last_run_at'],
  filters: [],
  savedViews: [],
});

// ── Request helpers ───────────────────────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/dashboard/preferences', {
    method: 'GET',
  });
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dashboard/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePutRequestRaw(body: string): NextRequest {
  return new NextRequest('http://localhost/api/dashboard/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('GET /api/dashboard/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({});
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);

    const { GET } = await import('./route.js');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; data: null };
    expect(body.error).toBeTruthy();
    expect(body.data).toBeNull();
  });

  it('returns default preferences when user has no stored row', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);

    const { GET } = await import('./route.js');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { preferences: { visibleColumns: string[] }; droppedKeys: string[] };
      error: null;
    };
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data.preferences.visibleColumns)).toBe(true);
    expect(body.data.preferences.visibleColumns).toContain('workflow_title');
    expect(body.data.preferences.visibleColumns).toContain('health_score');
    expect(body.data.droppedKeys).toEqual([]);
  });

  it('returns stored preferences when user has an existing row', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ schemaVersion: 1, payload: STORED_PAYLOAD });

    const { GET } = await import('./route.js');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { preferences: { visibleColumns: string[] }; droppedKeys: string[] };
      error: null;
    };
    expect(body.error).toBeNull();
    expect(body.data.preferences.visibleColumns).toContain('last_run_at');
    expect(body.data.droppedKeys).toEqual([]);
  });

  it('returns droppedKeys and writes back cleaned prefs when stale key present (E2E Scenario 4)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const stalePayload = JSON.stringify({
      schemaVersion: 1,
      visibleColumns: ['workflow_title', 'health_score', 'bogus_key_deleted_from_registry'],
      columnOrder: ['workflow_title', 'health_score', 'bogus_key_deleted_from_registry'],
      filters: [],
      savedViews: [],
    });
    mockFindUnique.mockResolvedValue({ schemaVersion: 1, payload: stalePayload });

    const { GET } = await import('./route.js');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { preferences: { visibleColumns: string[] }; droppedKeys: string[] };
      error: null;
    };
    expect(body.data.droppedKeys).toContain('bogus_key_deleted_from_registry');
    expect(body.data.preferences.visibleColumns).not.toContain('bogus_key_deleted_from_registry');
    // Write-back should have been called once
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/dashboard/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({});
    mockFindUnique.mockResolvedValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { PUT } = await import('./route.js');
    const res = await PUT(
      makePutRequest({ visibleColumns: ['workflow_title'], columnOrder: ['workflow_title'] }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; data: null };
    expect(body.error).toBeTruthy();
    expect(body.data).toBeNull();
  });

  it('returns 400 when body contains an unknown ColumnKey', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const { PUT } = await import('./route.js');
    const res = await PUT(
      makePutRequest({
        visibleColumns: ['workflow_title', 'completely_bogus_column_xyz'],
        columnOrder: ['workflow_title', 'completely_bogus_column_xyz'],
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/unknown column key/i);
  });

  it('returns 400 when body is malformed JSON', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const { PUT } = await import('./route.js');
    const res = await PUT(makePutRequestRaw('{invalid-json'));

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it('persists visibleColumns and returns valid preferences on happy path', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const { PUT } = await import('./route.js');
    const res = await PUT(
      makePutRequest({
        visibleColumns: ['workflow_title', 'health_score', 'last_run_at'],
        columnOrder: ['workflow_title', 'health_score', 'last_run_at'],
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { preferences: { visibleColumns: string[] } };
      error: null;
    };
    expect(body.error).toBeNull();
    expect(body.data.preferences.visibleColumns).toContain('last_run_at');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('preserves existing filters when updating visibleColumns', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const existingPayload = JSON.stringify({
      schemaVersion: 1,
      visibleColumns: ['workflow_title', 'health_score'],
      columnOrder: ['workflow_title', 'health_score'],
      filters: [{ columnKey: 'health_score', operator: 'gte', value: { scalar: 50 } }],
      savedViews: [],
    });
    mockFindUnique.mockResolvedValue({ schemaVersion: 1, payload: existingPayload });

    const { PUT } = await import('./route.js');
    const res = await PUT(
      makePutRequest({
        visibleColumns: ['workflow_title', 'health_score', 'run_count'],
        columnOrder: ['workflow_title', 'health_score', 'run_count'],
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { preferences: { visibleColumns: string[] } };
      error: null;
    };
    expect(body.data.preferences.visibleColumns).toContain('run_count');
    // Upsert called once — merge persisted
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('round-trip: upsert payload from PUT is returned correctly by GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const wantedColumns = ['workflow_title', 'health_score', 'run_count', 'case_volume'];

    let capturedPayload: string | null = null;
    mockUpsert.mockImplementation(
      ({ create }: { create: { payload: string } }) => {
        capturedPayload = create.payload;
        return Promise.resolve({});
      },
    );

    const { PUT, GET } = await import('./route.js');

    const putRes = await PUT(
      makePutRequest({ visibleColumns: wantedColumns, columnOrder: wantedColumns }),
    );
    expect(putRes.status).toBe(200);

    mockFindUnique.mockResolvedValue(
      capturedPayload !== null ? { schemaVersion: 1, payload: capturedPayload } : null,
    );

    const getRes = await GET(makeGetRequest());
    const getBody = (await getRes.json()) as {
      data: { preferences: { visibleColumns: string[] } };
      error: null;
    };

    for (const key of wantedColumns) {
      expect(getBody.data.preferences.visibleColumns).toContain(key);
    }
  });
});

// ── #367: savedViews persistence ──────────────────────────────────────────────

describe('PUT /api/dashboard/preferences — savedViews (#367)', () => {
  const COLS = ['workflow_title', 'health_score'];
  const view = (over: Record<string, unknown> = {}) => ({
    id: 'view-1',
    name: 'My view',
    visibleColumns: COLS,
    columnOrder: COLS,
    filters: [{ columnKey: 'health_score', value: { kind: 'scalar', operator: 'gte', value: 50 } }],
    createdAt: '2020-01-01T00:00:00.000Z',
    ...over,
  });
  const base = (savedViews?: unknown) => ({
    visibleColumns: COLS,
    columnOrder: COLS,
    ...(savedViews !== undefined ? { savedViews } : {}),
  });

  type Pref = { savedViews: Array<Record<string, unknown>> };
  let stored: { schemaVersion: number; payload: string } | null;

  beforeEach(() => {
    vi.clearAllMocks();
    stored = null;
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockImplementation(() => Promise.resolve(stored));
    mockUpsert.mockImplementation(
      ({ create, update }: { create: { payload: string }; update: { payload: string } }) => {
        stored = { schemaVersion: 1, payload: (stored ? update : create).payload };
        return Promise.resolve({});
      },
    );
  });

  async function put(body: unknown) {
    const { PUT } = await import('./route.js');
    return PUT(makePutRequest(body));
  }
  async function get() {
    const { GET } = await import('./route.js');
    const res = await GET(makeGetRequest());
    return ((await res.json()) as { data: { preferences: Pref } }).data.preferences;
  }

  it('round-trips savedViews through GET', async () => {
    const res = await put(base([view()]));
    expect(res.status).toBe(200);
    const prefs = await get();
    expect(prefs.savedViews).toHaveLength(1);
    expect(prefs.savedViews[0]).toMatchObject({ id: 'view-1', name: 'My view', visibleColumns: COLS });
    expect(prefs.savedViews[0]!.filters).toEqual(view().filters);
  });

  it('rename and delete persist (present field replaces the list)', async () => {
    await put(base([view(), view({ id: 'view-2', name: 'Two' })]));
    await put(base([view({ name: 'Renamed' }), view({ id: 'view-2', name: 'Two' })]));
    expect((await get()).savedViews.map((v) => v.name)).toEqual(['Renamed', 'Two']);
    await put(base([view({ id: 'view-2', name: 'Two' })]));
    expect((await get()).savedViews.map((v) => v.id)).toEqual(['view-2']);
    await put(base([]));
    expect((await get()).savedViews).toEqual([]);
  });

  it('absent savedViews preserves the stored list', async () => {
    await put(base([view()]));
    const res = await put(base());
    expect(res.status).toBe(200);
    expect((await get()).savedViews.map((v) => v.id)).toEqual(['view-1']);
  });

  it('trims names, drops unknown column keys inside a view, and never trusts client createdAt', async () => {
    await put(base([view({ name: '  Padded  ', visibleColumns: [...COLS, 'gone_key'], columnOrder: [...COLS, 'gone_key'], createdAt: '1999-01-01T00:00:00.000Z' })]));
    const v = (await get()).savedViews[0]!;
    expect(v.name).toBe('Padded');
    expect(v.visibleColumns).toEqual(COLS);
    expect(v.columnOrder).toEqual(COLS);
    expect(v.createdAt).not.toBe('1999-01-01T00:00:00.000Z');
    const firstCreatedAt = v.createdAt;
    // Re-PUT with a different client createdAt: stored value is kept.
    await put(base([view({ createdAt: '2001-01-01T00:00:00.000Z' })]));
    expect((await get()).savedViews[0]!.createdAt).toBe(firstCreatedAt);
  });

  it.each([
    ['more than 10 views', Array.from({ length: 11 }, (_, i) => view({ id: `v${i}` })), /at most 10/i],
    ['empty name', [view({ name: '   ' })], /must not be empty/i],
    ['name over 64 chars', [view({ name: 'x'.repeat(65) })], /at most 64/i],
    ['duplicate ids', [view(), view()], /unique/i],
    ['non-array', 'nope', /./],
    ['malformed filter', [view({ filters: [{ columnKey: 'health_score', value: { kind: 'nope' } }] })], /./],
    ['non-string column entry', [view({ visibleColumns: [1] })], /./],
  ])('rejects %s with 400 and writes nothing', async (_label, views, msg) => {
    const res = await put(base(views));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(msg as RegExp);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('accepts exactly 10 views and a 64-char name', async () => {
    const views = Array.from({ length: 10 }, (_, i) => view({ id: `v${i}`, name: 'y'.repeat(64) }));
    expect((await put(base(views))).status).toBe(200);
    expect((await get()).savedViews).toHaveLength(10);
  });

  it('writes only to the session user row (no client-controlled userId)', async () => {
    await put({ ...base([view()]), userId: 'victim' });
    const arg = mockUpsert.mock.calls[0]![0] as { where: { userId: string } };
    expect(arg.where.userId).toBe('user-1');
    expect(mockFindUnique.mock.calls[0]![0]).toMatchObject({ where: { userId: 'user-1' } });
  });
});
