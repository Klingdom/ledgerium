/**
 * Regression test for POST /api/auth/signup.
 *
 * BUG-07 — new free users must NOT receive subscriptionStatus 'trialing'.
 *   The schema default was silently set to 'trialing', causing the account
 *   page to display a false "Trial" badge for users who have no Stripe
 *   subscription. This test locks the correct value ('none') so any future
 *   reversion is caught immediately.
 *
 * Mocking strategy (mirrors webhook/route.test.ts):
 *   - vi.mock('@/db')               — spy on db.user.create / db.user.findUnique
 *   - vi.mock('bcryptjs')           — deterministic hash, avoids slow bcrypt rounds
 *   - vi.mock('@/lib/analytics-server') — no-op trackServer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'user_test_001',
        email: 'new@example.com',
      }),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

vi.mock('@/lib/analytics-server', () => ({
  trackServer: vi.fn(),
}));

// Rate-limit module is mocked so route-level tests can deterministically
// force the allow / block outcome without racing NODE_ENV=test's own
// bypass short-circuit inside checkAuthRateLimit itself (auth-buckets.test.ts
// covers the real bucket logic directly).
vi.mock('@/lib/rate-limit/auth-buckets', () => ({
  checkAuthRateLimit: vi.fn(() => ({ allowed: true })),
  AUTH_RATE_LIMITS: {
    forgotPassword: { max: 5, windowMs: 15 * 60 * 1000 },
    signup: { max: 10, windowMs: 60 * 60 * 1000 },
    login: { max: 10, windowMs: 15 * 60 * 1000 },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let dbLib: typeof import('@/db');
  let rateLimitLib: typeof import('@/lib/rate-limit/auth-buckets');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    dbLib = await import('@/db');
    rateLimitLib = await import('@/lib/rate-limit/auth-buckets');
    vi.mocked(rateLimitLib.checkAuthRateLimit).mockReturnValue({ allowed: true });
    const routeModule = await import('./route.js');
    POST = routeModule.POST;
  });

  // ── BUG-07 regression ────────────────────────────────────────────────────

  it('BUG-07: new signup creates user with subscriptionStatus "none", not "trialing"', async () => {
    const req = makeRequest({
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(vi.mocked(dbLib.db.user.create)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionStatus: 'none',
        }),
      }),
    );
  });

  // ── Email normalization regression (2026-07-09) ──────────────────────────
  // Root cause: signup previously stored/looked-up email RAW while
  // forgot-password lowercased, so any mixed-case signup could never be
  // found by the password-reset lookup. Both the duplicate-check and the
  // create must use the same normalized (lowercased/trimmed) form.

  it('normalizes a mixed-case email for the duplicate-check lookup', async () => {
    const req = makeRequest({
      email: 'Mixed.Case@Example.COM',
      password: 'password123',
      name: 'Test User',
    });

    await POST(req);

    expect(vi.mocked(dbLib.db.user.findUnique)).toHaveBeenCalledWith({
      where: { email: 'mixed.case@example.com' },
    });
  });

  it('stores the normalized (lowercased) email on create', async () => {
    const req = makeRequest({
      email: 'Mixed.Case@Example.COM',
      password: 'password123',
      name: 'Test User',
    });

    await POST(req);

    expect(vi.mocked(dbLib.db.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'mixed.case@example.com',
        }),
      }),
    );
  });

  // ── Rate limiting (abuse protection) ─────────────────────────────────────

  it('returns 429 with a Retry-After header when the rate limit is exceeded, before creating the user', async () => {
    vi.mocked(rateLimitLib.checkAuthRateLimit).mockReturnValue({
      allowed: false,
      retryAfterSeconds: 3600,
    });

    const req = makeRequest({
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe('Too many requests');
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(vi.mocked(dbLib.db.user.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db.user.create)).not.toHaveBeenCalled();
  });

  it('keys the rate-limit check with the "signup:" purpose prefix and the derived IP', async () => {
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.9, 10.0.0.1',
      },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    await POST(req);

    expect(vi.mocked(rateLimitLib.checkAuthRateLimit)).toHaveBeenCalledWith(
      'signup:198.51.100.9',
      expect.any(Number),
      { max: 10, windowMs: 60 * 60 * 1000 },
    );
  });

  it('falls back to "unknown" when no x-forwarded-for header is present', async () => {
    const req = makeRequest({
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User',
    });

    await POST(req);

    expect(vi.mocked(rateLimitLib.checkAuthRateLimit)).toHaveBeenCalledWith(
      'signup:unknown',
      expect.any(Number),
      { max: 10, windowMs: 60 * 60 * 1000 },
    );
  });

  it('allowed requests proceed to create the user as before', async () => {
    vi.mocked(rateLimitLib.checkAuthRateLimit).mockReturnValue({ allowed: true });

    const req = makeRequest({
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(vi.mocked(dbLib.db.user.create)).toHaveBeenCalledOnce();
  });
});
