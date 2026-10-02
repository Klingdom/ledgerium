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
      findFirst: async ({ where }: any) => {
        const { propertiesMatch } = await import('@/lib/alerts/like-test-support');
        return (
          rows
            .filter((r) => matches(r, where) && propertiesMatch(r.properties, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
        );
      },
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

  it('every allowlisted name is accepted; server-private names are not', () => {
    for (const n of ANALYTICS_EVENT_NAMES) expect(isAllowedAnalyticsEventName(n)).toBe(true);
    expect(isAllowedAnalyticsEventName('alert_notified')).toBe(false);
    expect(isAllowedAnalyticsEventName('unknown')).toBe(false);
  });
});

describe('server-only names are not writable by a client (row #298)', () => {
  it.each(['subscription_created', 'api_error', 'workflow_uploaded', 'payment_failed', 'plan_limit_hit', 'team_created'])(
    'POST %s is not persisted (anonymous or signed in)',
    async (name) => {
      const res = await post([{ event: name, endpoint: '/x', status: 500 }]);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ received: 0, attempted: 0, dropped: 1 });
      authState.session = { user: { id: 'me' } };
      await post([{ event: name }]);
      expect(rows).toHaveLength(0);
    },
  );

  it('a name a browser emits is still accepted, as a client row', async () => {
    const res = await post([{ event: 'page_viewed', path: '/a' }, { event: 'upload_failed', error: 'Network error' }]);
    expect(await res.json()).toMatchObject({ received: 2, dropped: 0 });
    expect(rows.map((r) => [r.eventName, r.source])).toEqual([
      ['page_viewed', 'client'],
      ['upload_failed', 'client'],
    ]);
  });

  it('a mixed batch keeps only the browser-emitted names', async () => {
    await post([{ event: 'subscription_created' }, { event: 'sop_viewed', workflowId: 'w' }, { event: 'api_error' }]);
    expect(rows.map((r) => r.eventName)).toEqual(['sop_viewed']);
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
    // api_error / payment_failed have no client emitter, so they are not stored at
    // all (row #298); upload_failed is client-emitted, so those rows are stored
    // but as 'client' rows, which the alerts do not read.
    expect(rows.filter((r) => r.source === 'client').map((r) => r.eventName)).toEqual(Array(10).fill('upload_failed'));
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
    expect(await loadAlertStates(now, ['a1'])).toEqual({});
    rows.push({ eventName: 'alert_notified', source: 'server', userId: null, properties: props, createdAt: new Date(now) });
    expect((await loadAlertStates(now, ['a1']))['a1']?.state).toBe('firing');
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
