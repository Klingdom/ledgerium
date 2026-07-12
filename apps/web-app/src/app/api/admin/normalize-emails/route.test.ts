/**
 * Unit tests for POST /api/admin/normalize-emails.
 *
 * Covers:
 *  - 404 when unauthenticated (no session, no ops token)
 *  - 404 when session exists but caller is not admin
 *  - Dry-run (default) reports totals/collisions/sample and performs zero writes
 *  - Apply updates only SAFE rows, skips collisions entirely
 *  - Collision detection: two mixed-case rows mapping to the same normalized
 *    value, and a mixed-case row colliding with an already-normalized row
 *  - Idempotency: a second apply run (with already-normalized data) reports
 *    zero rows needing normalization
 *  - 500 when a DB query throws
 *  - ops-token auth path (mirrors /api/admin/password-reset-link)
 *
 * Mocking strategy (mirrors admin/password-reset-link/route.test.ts):
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls canAccessAdmin
 *  - vi.mock('@/db') — controls all Prisma calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: { findMany: vi.fn(), update: vi.fn() },
  },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { POST } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockUserFindMany = db.user.findMany as ReturnType<typeof vi.fn>;
const mockUserUpdate = db.user.update as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────────

// `body` defaults to `{}` (rather than an omitted body) so the route's
// `apply` field is simply absent — this exercises the "no apply key ⇒
// dry-run" default path identically to an omitted request body, while
// avoiding NextRequest's `exactOptionalPropertyTypes`-strict RequestInit shape.
function makeRequest(body: unknown = {}): NextRequest {
  return new NextRequest('http://localhost/api/admin/normalize-emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ADMIN_SESSION = { user: { email: 'phil@mediafier.ai' } };
const NON_ADMIN_SESSION = { user: { email: 'not-admin@example.com' } };

beforeEach(() => {
  vi.clearAllMocks();
  mockUserUpdate.mockResolvedValue({ id: 'x', email: 'x' });
});

describe('POST /api/admin/normalize-emails', () => {
  it('returns 404 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await POST(makeRequest({ apply: false }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.data).toBeNull();
    expect(json.error).toEqual({ code: 'not_found', message: 'Not Found' });
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it('returns 404 when session exists but caller is not admin', async () => {
    mockAuth.mockResolvedValue(NON_ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error?.code).toBe('not_found');
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  describe('dry-run (default)', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(ADMIN_SESSION);
      mockCanAccessAdmin.mockReturnValue(true);
    });

    it('reports totals, safe rows, and a sample with zero writes when body omits apply', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'Already@Normal.com'.toLowerCase() },
        { id: '2', email: 'Mixed.Case@Example.COM' },
        { id: '3', email: '  Trailing.Space@Example.com  ' },
      ]);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.error).toBeNull();
      expect(json.data.totalUsers).toBe(3);
      expect(json.data.needNormalization).toBe(2);
      expect(json.data.safeToNormalize).toBe(2);
      expect(json.data.collisions).toEqual([]);
      expect(json.data.sample).toHaveLength(2);
      expect(json.data.sample).toEqual(
        expect.arrayContaining([
          { id: '2', from: 'Mixed.Case@Example.COM', to: 'mixed.case@example.com' },
          { id: '3', from: '  Trailing.Space@Example.com  ', to: 'trailing.space@example.com' },
        ]),
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('explicit apply:false behaves identically to omitted body', async () => {
      mockUserFindMany.mockResolvedValue([{ id: '1', email: 'Mixed.Case@Example.COM' }]);

      const res = await POST(makeRequest({ apply: false }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.safeToNormalize).toBe(1);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('caps the sample at 10 entries even when more rows need normalization', async () => {
      const users = Array.from({ length: 15 }, (_, i) => ({
        id: `u${i}`,
        email: `User${i}@Example.COM`,
      }));
      mockUserFindMany.mockResolvedValue(users);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(json.data.safeToNormalize).toBe(15);
      expect(json.data.sample).toHaveLength(10);
    });

    it('detects a collision between two mixed-case rows mapping to the same normalized value', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'Dup@Example.com' },
        { id: '2', email: 'dup@Example.COM' },
      ]);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(json.data.safeToNormalize).toBe(0);
      expect(json.data.needNormalization).toBe(2);
      expect(json.data.collisions).toHaveLength(2);
      expect(json.data.collisions).toEqual(
        expect.arrayContaining([
          { id: '1', email: 'Dup@Example.com', conflictsWith: 'dup@Example.COM' },
          { id: '2', email: 'dup@Example.COM', conflictsWith: 'Dup@Example.com' },
        ]),
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('detects a collision between a mixed-case row and an already-normalized different user', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'taken@example.com' }, // already normalized
        { id: '2', email: 'Taken@Example.com' }, // would collide once normalized
      ]);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(json.data.safeToNormalize).toBe(0);
      expect(json.data.collisions).toEqual([
        { id: '2', email: 'Taken@Example.com', conflictsWith: 'taken@example.com' },
      ]);
    });

    it('reports zero work when every row is already normalized', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'a@example.com' },
        { id: '2', email: 'b@example.com' },
      ]);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(json.data.totalUsers).toBe(2);
      expect(json.data.needNormalization).toBe(0);
      expect(json.data.safeToNormalize).toBe(0);
      expect(json.data.collisions).toEqual([]);
      expect(json.data.sample).toEqual([]);
    });
  });

  describe('apply:true', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(ADMIN_SESSION);
      mockCanAccessAdmin.mockReturnValue(true);
    });

    it('updates only safe rows and skips collisions', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'Mixed.Case@Example.COM' }, // safe
        { id: '2', email: 'Dup@Example.com' }, // collision
        { id: '3', email: 'dup@Example.COM' }, // collision (with #2)
        { id: '4', email: 'already@normal.com' }, // already normalized
      ]);

      const res = await POST(makeRequest({ apply: true }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.error).toBeNull();
      expect(json.data.updated).toBe(1);
      expect(json.data.skippedCollisions).toBe(2);
      expect(json.data.collisions).toHaveLength(2);

      expect(mockUserUpdate).toHaveBeenCalledOnce();
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { email: 'mixed.case@example.com' },
      });
    });

    it('is idempotent — a second apply run against already-normalized data updates nothing', async () => {
      // Simulates state AFTER the first apply run: everything is normalized,
      // and the former collision rows are untouched (still mixed-case).
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'mixed.case@example.com' }, // normalized by prior run
        { id: '2', email: 'Dup@Example.com' }, // still a collision, never written
        { id: '3', email: 'dup@Example.COM' },
        { id: '4', email: 'already@normal.com' },
      ]);

      const res = await POST(makeRequest({ apply: true }));
      const json = await res.json();

      expect(json.data.updated).toBe(0);
      expect(json.data.skippedCollisions).toBe(2);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('does not write anything when all rows are collisions', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: '1', email: 'Dup@Example.com' },
        { id: '2', email: 'dup@Example.COM' },
      ]);

      const res = await POST(makeRequest({ apply: true }));
      const json = await res.json();

      expect(json.data.updated).toBe(0);
      expect(json.data.skippedCollisions).toBe(2);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });

  it('returns 500 when a DB query throws', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindMany.mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.data).toBeNull();
    expect(json.error?.code).toBe('internal_error');
  });
});

// ── Server-to-server ops-token auth path ────────────────────────────────────────

describe('POST /api/admin/normalize-emails — ops-token auth', () => {
  const OPS_LABEL = 'admin-normalize-emails.v1';
  const SECRET = 'test-nextauth-secret-value';
  const originalSecret = process.env.NEXTAUTH_SECRET;

  function validOpsToken(secret: string): string {
    const windowMinute = Math.floor(Date.now() / 60000);
    return createHmac('sha256', secret).update(`${OPS_LABEL}:${windowMinute}`).digest('hex');
  }

  function makeRequestWithToken(body: unknown, token: string | null): NextRequest {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token !== null) headers['x-ops-token'] = token;
    return new NextRequest('http://localhost/api/admin/normalize-emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);
    process.env.NEXTAUTH_SECRET = SECRET;
    mockUserFindMany.mockResolvedValue([{ id: '1', email: 'Mixed.Case@Example.COM' }]);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it('200 with a valid ops token even without an admin session', async () => {
    const res = await POST(makeRequestWithToken({}, validOpsToken(SECRET)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.safeToNormalize).toBe(1);
  });

  it('404 when the ops token is wrong', async () => {
    const res = await POST(makeRequestWithToken({}, 'deadbeef'));
    expect(res.status).toBe(404);
  });

  it('404 when no token is provided and no admin session', async () => {
    const res = await POST(makeRequestWithToken({}, null));
    expect(res.status).toBe(404);
  });

  it('404 when NEXTAUTH_SECRET is unset (ops path disabled)', async () => {
    delete process.env.NEXTAUTH_SECRET;
    const res = await POST(makeRequestWithToken({}, validOpsToken(SECRET)));
    expect(res.status).toBe(404);
  });
});
