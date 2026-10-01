/**
 * GET /api/analytics/events — dashboardV2Retirement key (row #247).
 * Verifies the key is added additively and carries the pure function's output
 * over the rows the route read; the arithmetic itself is covered in
 * src/lib/dashboard-v2-retirement-metrics.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const findMany = vi.fn();
const authMock = vi.fn();

vi.mock('@/db', () => ({ db: { analyticsEvent: { findMany: (...a: unknown[]) => findMany(...a) } } }));
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));

const row = (eventName: string, properties: Record<string, unknown> = {}) => ({
  eventName,
  userId: 'u1',
  properties: JSON.stringify(properties),
  createdAt: new Date('2026-09-01T00:00:00Z'),
});

describe('GET /api/analytics/events dashboardV2Retirement', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    findMany.mockReset();
    authMock.mockReset();
    GET = (await import('./route.js')).GET;
  });

  const req = () => new NextRequest('http://localhost/api/analytics/events?days=30');

  it('adds the key alongside the existing keys', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', isAdmin: true } });
    findMany.mockResolvedValue([
      row('dashboard_v2_viewed', { chipsRenderedCount: 2 }),
      row('dashboard_v2_viewed', { chipsRenderedCount: 2 }),
      row('dashboard_bounced'),
      row('insight_chip_clicked'),
    ]);
    const body = await (await GET(req())).json();
    expect(body.summary.totalEvents).toBe(4);
    expect(body.eventCounts).toBeDefined();
    expect(body.funnels).toBeDefined();
    expect(body.dashboardV2Retirement).toEqual({
      views: 2,
      bounces: 1,
      bounceRate: 0.5,
      chipsRendered: 4,
      chipClicks: 1,
      chipClickRate: 0.25,
      viewsMissingChipCount: 0,
    });
  });

  it('returns null rates when the window has no dashboard events', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', isAdmin: true } });
    findMany.mockResolvedValue([]);
    const body = await (await GET(req())).json();
    expect(body.dashboardV2Retirement.bounceRate).toBeNull();
    expect(body.dashboardV2Retirement.chipClickRate).toBeNull();
  });

  it('stays admin-only', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', isAdmin: false } });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});
