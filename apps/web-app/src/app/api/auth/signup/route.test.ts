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

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    dbLib = await import('@/db');
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
});
