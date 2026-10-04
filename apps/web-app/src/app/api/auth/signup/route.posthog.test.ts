/**
 * #404 — POST /api/auth/signup end to end with the REAL trackServer: the
 * signup_completed event is written to the AnalyticsEvent table but never
 * reaches PostHog (the consent choice lives only in the browser).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const posthogNode = vi.hoisted(() => ({ ctor: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor(...a: unknown[]) { posthogNode.ctor(...a); }
    capture(...a: unknown[]) { posthogNode.capture(...a); }
    shutdown() { return Promise.resolve(); }
  },
}));

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user_ph_001', email: 'new@example.com' }),
    },
    analyticsEvent: { create: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock('bcryptjs', () => ({ hash: vi.fn().mockResolvedValue('hashed_password') }));
vi.mock('@/lib/sample-workflow', () => ({
  ensureSampleWorkflow: vi.fn().mockResolvedValue(null),
  ensureAdditionalSampleWorkflows: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/sample-variants', () => ({ ensureSampleVariants: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/rate-limit/auth-buckets', () => ({
  checkAuthRateLimit: vi.fn(() => ({ allowed: true })),
  AUTH_RATE_LIMITS: { signup: { max: 10, windowMs: 3600000 } },
}));

describe('POST /api/auth/signup server analytics (#404)', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let dbMod: typeof import('@/db');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('POSTHOG_API_KEY', 'phc_fake');
    dbMod = await import('@/db');
    POST = (await import('./route.js')).POST;
  });

  it('writes the signup_completed row and sends nothing to PostHog', async () => {
    const res = await POST(new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }));
    expect(res.status).toBe(201);
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.mocked(dbMod.db.analyticsEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventName: 'signup_completed', userId: 'user_ph_001' }) }),
    );
    expect(posthogNode.ctor).not.toHaveBeenCalled();
    expect(posthogNode.capture).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
