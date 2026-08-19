/**
 * POST /api/analytics/events — visitorId promotion to the first-class column.
 *
 * REVENUE_PLAN_20K attribution fix (2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2). Regression lock:
 * before this fix, a client-sent `visitorId` on a batched event was only
 * ever written into the unindexed `properties` JSON blob. This suite
 * asserts it is now promoted to `AnalyticsEvent.visitorId` and stripped
 * from the stored `properties` blob (not duplicated).
 *
 * Mocking strategy:
 *   - vi.mock('@/db') — spies on db.analyticsEvent.create
 *   - vi.mock('@/lib/auth') — controls session (pre-login events have none)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/analytics/events', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let dbLib: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dbLib = await import('@/db');
    const routeModule = await import('./route.js');
    POST = routeModule.POST;
  });

  it('promotes a client-sent visitorId to the AnalyticsEvent.visitorId column', async () => {
    const req = makeRequest({
      events: [{ event: 'seo_page_viewed', pageType: 'alternatives', slug: 'x', visitorId: 'vid-batch-1' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: 'seo_page_viewed',
        visitorId: 'vid-batch-1',
      }),
    });
  });

  it('strips visitorId from the stored properties JSON blob (not duplicated)', async () => {
    const req = makeRequest({
      events: [{ event: 'page_viewed', path: '/pricing', visitorId: 'vid-batch-2' }],
    });

    await POST(req);

    const call = vi.mocked(dbLib.db.analyticsEvent.create).mock.calls[0]![0] as {
      data: { properties: string };
    };
    const storedProperties = JSON.parse(call.data.properties);
    expect(storedProperties).not.toHaveProperty('visitorId');
    expect(storedProperties.path).toBe('/pricing');
  });

  it('writes visitorId: null when the event has none (backward compatible)', async () => {
    const req = makeRequest({ events: [{ event: 'page_viewed', path: '/x' }] });

    await POST(req);

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({ visitorId: null }),
    });
  });

  it('ignores a non-string visitorId rather than persisting a malformed value', async () => {
    const req = makeRequest({ events: [{ event: 'page_viewed', path: '/x', visitorId: 12345 }] });

    await POST(req);

    expect(vi.mocked(dbLib.db.analyticsEvent.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({ visitorId: null }),
    });
  });

  it('joinability: two events sharing the same visitorId both persist the same value', async () => {
    const req = makeRequest({
      events: [
        { event: 'seo_page_viewed', pageType: 'alternatives', slug: 'a', visitorId: 'vid-shared' },
        { event: 'signup_completed', visitorId: 'vid-shared' },
      ],
    });

    await POST(req);

    const calls = vi.mocked(dbLib.db.analyticsEvent.create).mock.calls;
    expect(calls).toHaveLength(2);
    expect((calls[0]![0] as any).data.visitorId).toBe('vid-shared');
    expect((calls[1]![0] as any).data.visitorId).toBe('vid-shared');
  });
});
