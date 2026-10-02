/**
 * Row #295 — no unauthenticated request can create a row the server treats as
 * its own (alert state or alert input). Uses an in-memory fake of the table
 * that HONOURS `source` in `where`, and runs the real POST route, the real
 * computeAlerts and the real loadAlertStates against it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

type Row = { eventName: string; source: string; userId: string | null; properties: string | null; createdAt: Date };
const { rows, authState } = vi.hoisted(() => ({
  rows: [] as Row[],
  authState: { session: null as null | { user: { id: string } } },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matches(r: Row, where: any): boolean {
  if (where.eventName && r.eventName !== where.eventName) return false;
  if (where.source && r.source !== where.source) return false;
  if (where.userId && 'not' in where.userId && r.userId === where.userId.not) return false;
  const c = where.createdAt;
  if (c?.gte && r.createdAt < c.gte) return false;
  if (c?.lte && r.createdAt > c.lte) return false;
  return true;
}

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async ({ data }: any) => {
        rows.push({ properties: null, userId: null, createdAt: new Date(), ...data });
        return {};
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async ({ where }: any) => rows.filter((r) => matches(r, where)).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async ({ where, take }: any) =>
        rows
          .filter((r) => matches(r, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take ?? undefined),
    },
  },
}));
vi.mock('@/lib/auth', () => ({ auth: async () => authState.session }));

import { POST } from './route';
import { computeAlerts } from '@/lib/compute-alerts';
import { loadAlertStates } from '@/lib/alert-state';
import { ANALYTICS_EVENT_NAMES, isAllowedAnalyticsEventName } from '@/lib/analytics-event-names';
import {
  ANALYTICS_INGEST_RATE_LIMIT_MAX,
  resetAnalyticsIngestRateLimitBuckets,
} from '@/lib/rate-limit/analytics-ingest-buckets';

function post(events: unknown[], ip = '203.0.113.1') {
  return POST(
    new NextRequest('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ events }),
    }),
  );
}

beforeEach(() => {
  rows.length = 0;
  authState.session = null;
  resetAnalyticsIngestRateLimitBuckets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ingestion allowlist (row #295)', () => {
  it('persists nothing for a forged alert_notified batch, and keeps the success shape', async () => {
    const res = await post([{ event: 'alert_notified', alertId: 'api_error_spike', state: 'firing', source: 'server' }]);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(0);
    expect(body).toMatchObject({ received: 0, attempted: 0, failed: 0, dropped: 1 });
  });

  it('drops unknown and malformed entries but keeps allowlisted ones in the same batch', async () => {
    await post([{ event: 'nope' }, null, 'x', { event: 'page_viewed', path: '/a' }, {}]);
    expect(rows.map((r) => r.eventName)).toEqual(['page_viewed']);
  });

  it('every client union name is accepted; server-private names are not', () => {
    for (const n of ANALYTICS_EVENT_NAMES) expect(isAllowedAnalyticsEventName(n)).toBe(true);
    expect(isAllowedAnalyticsEventName('alert_notified')).toBe(false);
    expect(isAllowedAnalyticsEventName('unknown')).toBe(false);
  });
});

describe('source and userId are server-decided (row #295)', () => {
  it("stores source 'client' even when the body says 'server'", async () => {
    await post([{ event: 'page_viewed', path: '/a', source: 'server' }]);
    expect(rows[0]!.source).toBe('client');
  });

  it('ignores a body userId when there is no session', async () => {
    await post([{ event: 'page_viewed', path: '/a', userId: 'victim-1' }]);
    expect(rows[0]!.userId).toBeNull();
  });

  it('uses the session userId over a body userId', async () => {
    authState.session = { user: { id: 'me' } };
    await post([{ event: 'page_viewed', path: '/a', userId: 'victim-1' }]);
    expect(rows[0]!.userId).toBe('me');
  });
});

describe('forged client rows cannot move alerts or alert state (row #295)', () => {
  it('forged api_error / payment_failed / upload_failed do not change computeAlerts', async () => {
    const forged = (name: string, n: number) => Array.from({ length: n }, () => ({ event: name, endpoint: '/x', status: 500 }));
    await post([...forged('api_error', 20), ...forged('payment_failed', 5), ...forged('upload_failed', 10)]);
    // Rows were accepted (allowlisted names) but are 'client' rows.
    expect(rows.filter((r) => r.source === 'client').length).toBeGreaterThan(0);
    const alerts = await computeAlerts(Date.now());
    const v = (id: string) => alerts.find((a) => a.id === id)!;
    expect(v('api_error_spike')).toMatchObject({ value: 0, status: 'ok' });
    expect(v('payment_failure_rate')).toMatchObject({ value: 0, status: 'ok' });
    expect(v('processing_failure_spike').value).toBe(0);
  });

  it('server rows still count (the filter selects, it does not blank)', async () => {
    for (let i = 0; i < 11; i++) {
      rows.push({ eventName: 'api_error', source: 'server', userId: null, properties: null, createdAt: new Date() });
    }
    const a = (await computeAlerts(Date.now())).find((x) => x.id === 'api_error_spike')!;
    expect(a).toMatchObject({ value: 11, status: 'firing' });
  });

  it('a client-source alert_notified row is invisible to loadAlertStates; a server row is read', async () => {
    const now = Date.now();
    const props = JSON.stringify({ alertId: 'a1', state: 'firing' });
    rows.push({ eventName: 'alert_notified', source: 'client', userId: null, properties: props, createdAt: new Date(now) });
    expect(await loadAlertStates(now)).toEqual({});
    rows.push({ eventName: 'alert_notified', source: 'server', userId: null, properties: props, createdAt: new Date(now) });
    expect((await loadAlertStates(now))['a1']?.state).toBe('firing');
  });
});

describe('rate limit (row #295)', () => {
  it('trips after the per-IP limit, per IP, with Retry-After', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (let i = 0; i < ANALYTICS_INGEST_RATE_LIMIT_MAX; i++) {
      expect((await post([], '198.51.100.7')).status).toBe(200);
    }
    const blocked = await post([{ event: 'page_viewed', path: '/a' }], '198.51.100.7');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(rows).toHaveLength(0);
    expect((await post([], '198.51.100.8')).status).toBe(200);
  });
});
