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
import { db } from '@/db';

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

// ─── Row #243: the batch reports what it actually wrote ─────────────────────

describe('POST /api/analytics/events — partial failures and honest counts', () => {
  async function post(events: unknown[]) {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
      headers: { 'content-type': 'application/json' },
    });
    return (await POST(req)).json() as Promise<Record<string, unknown>>;
  }

  // Row #295: names must be in the client allowlist, so use a real one.
  const event = (n: number) => ({ event: 'page_viewed', path: `/p${n}`, visitorId: `v${n}` });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('one failing event costs one event, not the rest of the batch', async () => {
    // The loop used to sit in a single try, so the first failure abandoned
    // everything after it. A batch could lose most of itself this way.
    const create = (db as unknown as { analyticsEvent: { create: ReturnType<typeof vi.fn> } }).analyticsEvent.create;
    create.mockResolvedValueOnce({});
    create.mockRejectedValueOnce(new Error('constraint'));
    create.mockResolvedValueOnce({});

    const body = await post([event(1), event(2), event(3)]);

    expect(create).toHaveBeenCalledTimes(3);
    expect(body.received, 'the two good events should still have been written').toBe(2);
    expect(body.failed).toBe(1);
  });

  it('reports what was written, not what was built', async () => {
    // `received` used to be records.length regardless of outcome, so a batch
    // that wrote nothing was told it had arrived intact.
    const create = (db as unknown as { analyticsEvent: { create: ReturnType<typeof vi.fn> } }).analyticsEvent.create;
    create.mockRejectedValue(new Error('db down'));

    const body = await post([event(1), event(2)]);

    expect(body.received).toBe(0);
    expect(body.attempted).toBe(2);
    expect(body.failed).toBe(2);
    expect(body.ok, 'a batch that persisted nothing is not ok').toBe(false);
  });

  it('says so when a batch is truncated', async () => {
    const create = (db as unknown as { analyticsEvent: { create: ReturnType<typeof vi.fn> } }).analyticsEvent.create;
    create.mockResolvedValue({});

    const body = await post(Array.from({ length: 105 }, (_, i) => event(i)));

    expect(body.received).toBe(100);
    expect(body.truncated, 'five events were dropped and the caller was not told').toBe(5);
    expect(body.ok).toBe(false);
  });

  it('a fully successful batch is ok, with no truncation and no failures', async () => {
    const create = (db as unknown as { analyticsEvent: { create: ReturnType<typeof vi.fn> } }).analyticsEvent.create;
    create.mockResolvedValue({});

    const body = await post([event(1), event(2)]);

    expect(body).toMatchObject({ ok: true, received: 2, attempted: 2, failed: 0, truncated: 0 });
  });

  it('still returns HTTP 200 when everything fails', async () => {
    // Analytics must never surface as a broken page. An honest body and a
    // benign status are separable, and conflating them is what produced a
    // success report over a partial write in the first place.
    const create = (db as unknown as { analyticsEvent: { create: ReturnType<typeof vi.fn> } }).analyticsEvent.create;
    create.mockRejectedValue(new Error('db down'));

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ events: [event(1)] }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
