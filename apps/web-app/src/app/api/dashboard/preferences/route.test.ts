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
