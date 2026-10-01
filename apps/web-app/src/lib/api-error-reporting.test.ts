import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Row #246 (MR-039 A-2). `api_error` had zero emitters, so the P2
 * `api_error_spike` alert read `ok` permanently. These tests establish two
 * things the row asked for, at two levels:
 *
 *  1. `reportApiError` emits for exactly the 5xx band and nothing else, and can
 *     never throw into the error path it is reporting from.
 *  2. End to end: a real route handler that fails produces a stored `api_error`
 *     row, and enough of them make the real `computeAlerts` FIRE — the
 *     property that was false before this row, and the one the row said to
 *     verify "by provoking one".
 */

// ── An in-memory analytics table, shared by trackServer and computeAlerts ────

interface StoredEvent { eventName: string; properties: string; createdAt: Date }
const stored = vi.hoisted(() => [] as { eventName: string; properties: string; createdAt: Date }[]);
const mockTeamMemberFindMany = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      create: vi.fn(async ({ data }: { data: { eventName: string; properties: string } }) => {
        stored.push({ eventName: data.eventName, properties: data.properties, createdAt: new Date() });
        return data;
      }),
      count: vi.fn(async ({ where }: { where: { eventName: string } }) =>
        stored.filter((e: StoredEvent) => e.eventName === where.eventName).length),
      findMany: vi.fn(async () => []),
      groupBy: vi.fn(async () => []),
    },
    teamMember: { findMany: mockTeamMemberFindMany },
  },
}));
vi.mock('./posthog-server', () => ({ captureServerEvent: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'user_001' } })) }));

beforeEach(() => {
  stored.length = 0;
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('reportApiError — which statuses are reported', () => {
  it.each([500, 502, 503, 599])('reports %i', async (status) => {
    const { reportApiError } = await import('./api-error-reporting');
    reportApiError('/api/teams', status);
    await flush();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.eventName).toBe('api_error');
    expect(JSON.parse(stored[0]!.properties)).toEqual({ endpoint: '/api/teams', status });
  });

  // 4xx is expected traffic — counting it would make ">10 per hour" measure
  // mistyped passwords. Non-integers and out-of-range values are not statuses.
  it.each([200, 400, 401, 403, 404, 429, 499, 600, 500.5, Number.NaN])('ignores %s', async (status) => {
    const { reportApiError } = await import('./api-error-reporting');
    reportApiError('/api/teams', status);
    await flush();
    expect(stored).toHaveLength(0);
  });

  it('never throws, even when the analytics layer does', async () => {
    vi.resetModules();
    vi.doMock('./analytics-server', () => ({
      trackServer: () => { throw new Error('analytics down'); },
    }));
    const { reportApiError } = await import('./api-error-reporting');
    expect(() => reportApiError('/api/teams', 500)).not.toThrow();
    vi.doUnmock('./analytics-server');
    vi.resetModules();
  });

  it('carries no message or request path — the payload is endpoint pattern and status only', async () => {
    const { reportApiError } = await import('./api-error-reporting');
    reportApiError('/api/workflows/[id]/share', 500);
    await flush();
    expect(Object.keys(JSON.parse(stored[0]!.properties)).sort()).toEqual(['endpoint', 'status']);
  });
});

describe('end to end: a failing route makes the alert fire', () => {
  it('a real GET /api/teams failure stores an api_error row', async () => {
    mockTeamMemberFindMany.mockRejectedValue(new Error('db unavailable'));
    const { GET } = await import('@/app/api/teams/route');
    const res = await GET();
    await flush();
    expect(res.status).toBe(500);
    const errors = stored.filter((e) => e.eventName === 'api_error');
    expect(errors).toHaveLength(1);
    expect(JSON.parse(errors[0]!.properties)).toEqual({ endpoint: '/api/teams', status: 500 });
  });

  it('api_error_spike reads ok at 10 failures and FIRES at 11', async () => {
    mockTeamMemberFindMany.mockRejectedValue(new Error('db unavailable'));
    const { GET } = await import('@/app/api/teams/route');
    const { computeAlerts } = await import('./compute-alerts');
    const spike = async () => (await computeAlerts()).find((a) => a.id === 'api_error_spike')!;

    for (let i = 0; i < 10; i++) await GET();
    await flush();
    expect((await spike()).status).toBe('ok');
    expect((await spike()).value).toBe(10);

    await GET();
    await flush();
    expect((await spike()).status).toBe('firing');
  });

  it('a successful request reports nothing', async () => {
    mockTeamMemberFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/teams/route');
    const res = await GET();
    await flush();
    expect(res.status).toBe(200);
    expect(stored.filter((e) => e.eventName === 'api_error')).toHaveLength(0);
  });
});
