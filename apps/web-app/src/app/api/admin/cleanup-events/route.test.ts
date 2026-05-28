/**
 * Unit tests for GET /api/admin/cleanup-events.
 *
 * Covers:
 *  - 404 for non-admin caller
 *  - 200 dry-run (default) for admin caller
 *  - 200 actual deletion for admin caller
 *  - 400 for invalid `days` param
 *  - 500 when DB throws
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth')             — controls session
 *  - vi.mock('@/lib/admin-allowlist')  — controls canAccessAdmin
 *  - vi.mock('@/db')                   — controls DB calls
 *
 * @iter 090 / ADM-002 PR-1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
  isAdminUnlimited: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { GET } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  analyticsEvent: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/admin/cleanup-events');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/cleanup-events', () => {
  it('returns 404 for a non-admin caller', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const response = await GET(makeRequest());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 200 with dry-run counts for an admin caller (default dry-run = true)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    // count called twice: once for deletedCount, once for retainedCount
    mockDb.analyticsEvent.count
      .mockResolvedValueOnce(150)   // deletedCount
      .mockResolvedValueOnce(5000); // retainedCount

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.dryRun).toBe(true);
    expect(body.deletedCount).toBe(150);
    expect(body.retainedCount).toBe(5000);
    expect(typeof body.olderThan).toBe('string');
    // No actual deletion should have happened
    expect(mockDb.analyticsEvent.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 200 and performs deletion when dryRun=false', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    // count called twice: once for pre-deletion count, once for retained count
    mockDb.analyticsEvent.count
      .mockResolvedValueOnce(10)   // deletedCount (pre-scan)
      .mockResolvedValueOnce(990); // retainedCount (post-delete)
    // findMany returns one batch of 10 IDs, then empty to stop the loop
    mockDb.analyticsEvent.findMany
      .mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }])
      .mockResolvedValueOnce([]);
    mockDb.analyticsEvent.deleteMany.mockResolvedValue({ count: 2 });

    const response = await GET(makeRequest({ dryRun: 'false' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.dryRun).toBe(false);
    expect(body.deletedCount).toBe(10);
    expect(body.retainedCount).toBe(990);
    expect(mockDb.analyticsEvent.deleteMany).toHaveBeenCalled();
  });

  it('returns 400 when `days` param is below minimum', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);

    const response = await GET(makeRequest({ days: '3' })); // below MIN_RETENTION_DAYS=7
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/days/i);
  });

  it('returns 500 when DB throws', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockDb.analyticsEvent.count.mockRejectedValue(new Error('DB connection lost'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});
