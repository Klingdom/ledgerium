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
    authMock.mockResolvedValue({ user: { id: 'a', email: 'phil@mediafier.ai' } });
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
    authMock.mockResolvedValue({ user: { id: 'a', email: 'phil@mediafier.ai' } });
    findMany.mockResolvedValue([]);
    const body = await (await GET(req())).json();
    expect(body.dashboardV2Retirement.bounceRate).toBeNull();
    expect(body.dashboardV2Retirement.chipClickRate).toBeNull();
  });

  it('adds upgradePromptByLocation and no longer clamps conversion drop-off (row #248)', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', email: 'phil@mediafier.ai' } });
    // One user clicks with no prior view (pricing button): stage 3 > stage 2.
    findMany.mockResolvedValue([
      { ...row('upgrade_clicked', { location: 'upgrade_button' }), userId: 'u2' },
      row('upgrade_prompt_viewed', { location: 'teams_create', plan: 'team' }),
    ]);
    const body = await (await GET(req())).json();
    expect(body.upgradePromptByLocation.locations.map((l: { location: string }) => l.location).sort())
      .toEqual(['teams_create', 'upgrade_button']);
    const conv = body.funnels.conversion;
    // views 1 user, clicks 1 user, plan_limit_hit 0: view->click is 0 dropoff; limit_hit->view is -1.
    expect(conv[1].dropoff).toBe(-1);
    // plan_limit_hit had nobody, so the rate into the next stage is unknown —
    // null, not 0%, which would claim nobody progressed (MR-042 §5).
    expect(conv[1].rate).toBeNull();
    expect(conv[2].rate).toBe(100);
  });

  it('refuses isAdmin:true when the email is not on the allowlist (row #276)', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', email: 'user@example.com', isAdmin: true } });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('stays admin-only', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', email: 'user@example.com' } });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/analytics/events ?days= validation (row #254)', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    findMany.mockReset().mockResolvedValue([]);
    authMock.mockReset().mockResolvedValue({ user: { id: 'a', email: 'phil@mediafier.ai' } });
    GET = (await import('./route.js')).GET;
  });

  const call = (q: string) => GET(new NextRequest(`http://localhost/api/analytics/events${q}`));

  it.each(['abc', '-1', '0', '1.5', '366', '99999999999', '', '1e3', '%20'])(
    '?days=%s is 400 and never reaches the database',
    async (v) => {
      const res = await call(`?days=${v}`);
      expect(res.status).toBe(400);
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it.each(['1', '30', '365'])('?days=%s is accepted', async (v) => {
    const res = await call(`?days=${v}`);
    expect(res.status).toBe(200);
    expect((await res.json()).summary.periodDays).toBe(Number(v));
  });

  it('absent days defaults to 30', async () => {
    const res = await call('');
    expect(res.status).toBe(200);
    expect((await res.json()).summary.periodDays).toBe(30);
  });
});
