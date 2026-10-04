/**
 * Row #407: a preferences row written by a NEWER schema version must never be
 * replaced by this code (e.g. after a rollback of the app).
 *
 * Unlike route.test.ts this file runs the REAL persistence module, so the
 * assertions cover the route and the reader together:
 *  - GET reads the known fields of a newer row (saved views survive) and does
 *    not write anything back, even when the row also holds stale column keys.
 *  - A column-only PUT on a newer row answers 409 and writes nothing, so the
 *    row (saved views, columns, unknown future fields) is left byte-identical.
 *  - A v1 row and a local-only v2 row are still written normally, as v1.
 *
 * Decision (409 over merge): merging known fields into a newer document would
 * silently drop fields this version cannot see and could mis-apply changed
 * semantics; writing defaults (the old behavior) erased the user's data.
 * Refusing the write is the only option that cannot lose anything.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: { userDashboardPreference: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
// Real modules, loaded by relative path so this file does not depend on the
// '@' alias being configured in the root vitest context.
vi.mock('@/lib/dashboard-columns/persistence.js', async () => {
  return await import('../../../../lib/dashboard-columns/persistence.js');
});
vi.mock('@/lib/dashboard-columns/index.js', async () => {
  return await import('../../../../lib/dashboard-columns/index.js');
});

import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = db.userDashboardPreference.findUnique as ReturnType<typeof vi.fn>;
const mockUpsert = db.userDashboardPreference.upsert as ReturnType<typeof vi.fn>;

const VIEW = {
  id: 'sv-1',
  name: 'Kept view',
  visibleColumns: ['workflow_title', 'run_count'],
  columnOrder: ['workflow_title', 'run_count'],
  filters: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function row(schemaVersion: number, extra: Record<string, unknown> = {}) {
  return {
    schemaVersion,
    payload: JSON.stringify({
      schemaVersion,
      visibleColumns: ['workflow_title', 'health_score'],
      columnOrder: ['workflow_title', 'health_score'],
      filters: [],
      savedViews: [VIEW],
      defaultTimeRange: '7d',
      ...extra,
    }),
  };
}

function put(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dashboard/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const COLUMN_ONLY = { visibleColumns: ['workflow_title'], columnOrder: ['workflow_title'] };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockUpsert.mockResolvedValue({});
});

describe('preferences route — newer-version rows are non-destructive (#407)', () => {
  it('GET on a schemaVersion 3 row returns its saved views, columns and range, and writes nothing', async () => {
    mockFindUnique.mockResolvedValue(row(3, { futureField: { a: 1 } }));
    const { GET } = await import('./route.js');
    const res = await GET(new NextRequest('http://localhost/api/dashboard/preferences'));
    const body = (await res.json()) as {
      data: { preferences: { savedViews: unknown[]; visibleColumns: string[]; defaultTimeRange: string }; warnings: string[] };
    };
    expect(res.status).toBe(200);
    expect(body.data.preferences.savedViews).toEqual([VIEW]);
    expect(body.data.preferences.visibleColumns).toEqual(['workflow_title', 'health_score']);
    expect(body.data.preferences.defaultTimeRange).toBe('7d');
    expect(body.data.warnings.join('\n')).toMatch(/newer client/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('GET on a newer row that also has a stale column key does not write the cleaned document back', async () => {
    mockFindUnique.mockResolvedValue(
      row(3, { visibleColumns: ['workflow_title', 'column_from_the_future'] }),
    );
    const { GET } = await import('./route.js');
    const res = await GET(new NextRequest('http://localhost/api/dashboard/preferences'));
    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('a column-only PUT on a schemaVersion 3 row answers 409 and writes nothing', async () => {
    mockFindUnique.mockResolvedValue(row(3));
    const { PUT } = await import('./route.js');
    const res = await PUT(put(COLUMN_ONLY));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(/newer app version/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('a PUT that carries savedViews and a range is refused just the same', async () => {
    mockFindUnique.mockResolvedValue(row(4));
    const { PUT } = await import('./route.js');
    const res = await PUT(put({ ...COLUMN_ONLY, savedViews: [], defaultTimeRange: '30d' }));
    expect(res.status).toBe(409);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('a v1 row is written normally: saved views and range kept, stored as schemaVersion 1', async () => {
    mockFindUnique.mockResolvedValue(row(1));
    const { PUT } = await import('./route.js');
    const res = await PUT(put(COLUMN_ONLY));
    expect(res.status).toBe(200);
    const arg = mockUpsert.mock.calls[0]![0] as { update: { schemaVersion: number; payload: string } };
    expect(arg.update.schemaVersion).toBe(1);
    const stored = JSON.parse(arg.update.payload);
    expect(stored.schemaVersion).toBe(1);
    expect(stored.savedViews).toEqual([VIEW]);
    expect(stored.defaultTimeRange).toBe('7d');
    expect(stored.visibleColumns).toEqual(['workflow_title']);
  });

  it('a local-only schemaVersion 2 row is read as v1 and rewritten as v1 (not 409)', async () => {
    mockFindUnique.mockResolvedValue(row(2));
    const { PUT } = await import('./route.js');
    const res = await PUT(put(COLUMN_ONLY));
    expect(res.status).toBe(200);
    const arg = mockUpsert.mock.calls[0]![0] as { update: { schemaVersion: number; payload: string } };
    expect(arg.update.schemaVersion).toBe(1);
    expect(JSON.parse(arg.update.payload).savedViews).toEqual([VIEW]);
  });
});
