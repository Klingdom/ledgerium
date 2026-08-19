/**
 * analytics-server.ts — trackServer() visitorId column write + getFirstTouchVisitorId().
 *
 * REVENUE_PLAN_20K attribution fix (2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2). Regression locks:
 *
 *   - trackServer() had NO visitorId parameter at all before this fix — every
 *     server-side (billing webhook) event carried only userId. This suite
 *     asserts visitorId, when present, is written to the new first-class
 *     AnalyticsEvent.visitorId column, and that it is stripped from the
 *     stored `properties` JSON blob (not duplicated).
 *   - Existing call sites that never pass visitorId must be entirely
 *     unaffected (backward compatibility).
 *   - getFirstTouchVisitorId() must never throw and must return null (not
 *     fabricate a value) for missing users / missing column data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('./posthog-server.js', () => ({
  captureServerEvent: vi.fn(),
}));

describe('trackServer(): visitorId column write', () => {
  let dbLib: any;
  let trackServer: (event: string, properties?: Record<string, unknown>) => void;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dbLib = await import('@/db');
    const mod = await import('./analytics-server.js');
    trackServer = mod.trackServer;
  });

  it('writes properties.visitorId to the AnalyticsEvent.visitorId column', async () => {
    trackServer('subscription_created', { userId: 'user_1', plan: 'starter', visitorId: 'vid-abc-123' });

    // trackServer is fire-and-forget (never awaits) — flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventName: 'subscription_created',
          userId: 'user_1',
          visitorId: 'vid-abc-123',
        }),
      }),
    );
  });

  it('writes visitorId: null when no visitorId property is passed (backward compatible)', async () => {
    trackServer('page_viewed', { userId: 'user_2' });
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user_2', visitorId: null }),
      }),
    );
  });

  it('never crashes existing call sites that omit both userId and visitorId', async () => {
    expect(() => trackServer('client_error', { message: 'boom' })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null, visitorId: null }),
      }),
    );
  });

  it('strips visitorId from the stored properties JSON blob (not duplicated)', async () => {
    trackServer('subscription_created', { userId: 'user_3', plan: 'team', visitorId: 'vid-dup-check' });
    await Promise.resolve();
    await Promise.resolve();

    const call = vi.mocked(dbLib.db.analyticsEvent.create).mock.calls[0]![0] as {
      data: { properties: string };
    };
    const storedProperties = JSON.parse(call.data.properties);
    expect(storedProperties).not.toHaveProperty('visitorId');
    expect(storedProperties).not.toHaveProperty('userId');
    expect(storedProperties.plan).toBe('team');
  });

  it('does not forward visitorId to PostHog properties (it is not a display field there)', async () => {
    const posthogLib = await import('./posthog-server.js');
    trackServer('subscription_created', { userId: 'user_4', plan: 'starter', visitorId: 'vid-posthog-check' });
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.mocked(posthogLib.captureServerEvent)).toHaveBeenCalledWith(
      'subscription_created',
      'user_4',
      expect.not.objectContaining({ visitorId: expect.anything() }),
    );
  });
});

describe('getFirstTouchVisitorId()', () => {
  let dbLib: any;
  let getFirstTouchVisitorId: (userId: string | null | undefined) => Promise<string | null>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dbLib = await import('@/db');
    const mod = await import('./analytics-server.js');
    getFirstTouchVisitorId = mod.getFirstTouchVisitorId;
  });

  it('returns the user firstTouchVisitorId when present', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValueOnce({ firstTouchVisitorId: 'vid-resolved' });

    const result = await getFirstTouchVisitorId('user_1');

    expect(result).toBe('vid-resolved');
    expect(vi.mocked(dbLib.db.user.findUnique)).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: { firstTouchVisitorId: true },
    });
  });

  it('returns null (not throws) when the user has no firstTouchVisitorId', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValueOnce({ firstTouchVisitorId: null });

    const result = await getFirstTouchVisitorId('user_2');

    expect(result).toBeNull();
  });

  it('returns null when the user does not exist', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValueOnce(null);

    const result = await getFirstTouchVisitorId('user_missing');

    expect(result).toBeNull();
  });

  it('returns null for a null/undefined userId without querying the DB', async () => {
    expect(await getFirstTouchVisitorId(null)).toBeNull();
    expect(await getFirstTouchVisitorId(undefined)).toBeNull();
    expect(vi.mocked(dbLib.db.user.findUnique)).not.toHaveBeenCalled();
  });

  it('never throws when the DB lookup itself rejects', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockRejectedValueOnce(new Error('DB down'));

    await expect(getFirstTouchVisitorId('user_3')).resolves.toBeNull();
  });
});
