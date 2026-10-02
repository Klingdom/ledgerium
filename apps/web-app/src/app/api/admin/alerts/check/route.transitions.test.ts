/**
 * Row #292: the alerts/check job notifies on transition, not hourly.
 * Uses the REAL lib/alert-state against an in-memory AnalyticsEvent fake, so a
 * "run" here is the same persistence round-trip production does between hourly runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { eventName: string; properties: string | null; createdAt: Date };
const { rows, failWrites } = vi.hoisted(() => ({ rows: [] as Row[], failWrites: { states: new Set<string>() } }));

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async ({ where }: any) =>
        rows.filter((r) => r.eventName === where.eventName && r.createdAt >= where.createdAt.gte),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async ({ data }: any) => {
        if (failWrites.states.has(JSON.parse(data.properties).state)) throw new Error('db write failed');
        rows.push({ eventName: data.eventName, properties: data.properties, createdAt: data.createdAt });
        return data;
      },
    },
  },
}));
vi.mock('@/lib/compute-alerts', () => ({ computeAlerts: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ sendAlertNotification: vi.fn() }));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));

import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';
import { GET } from './route';
import { clearUnconfirmedAlertWrites } from '@/lib/alert-state';

const mockCompute = computeAlerts as ReturnType<typeof vi.fn>;
const mockSend = sendAlertNotification as ReturnType<typeof vi.fn>;
const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 1, 0, 0, 0);
const DELIVERED = { configured: 1, delivered: 1, failed: 0 };
const ALL_FAILED = { configured: 1, delivered: 0, failed: 1 };

const alert = (status: 'firing' | 'ok' | 'insufficient_data', id = 'zero_uploads_24h') => ({
  id, severity: 'P1' as const, status, message: 'm', value: 0, threshold: 1, checkedAt: '',
});

const req = () =>
  new Request('http://localhost/api/admin/alerts/check', { headers: { authorization: 'Bearer s3cret' } });

async function run(atMs: number) {
  vi.setSystemTime(atMs);
  const res = await GET(req() as never);
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  rows.length = 0;
  failWrites.states.clear();
  clearUnconfirmedAlertWrites();
  vi.clearAllMocks();
  vi.useFakeTimers();
  process.env.CRON_SECRET = 's3cret';
  mockSend.mockResolvedValue(DELIVERED);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('alerts/check notifies on transition (row #292)', () => {
  it('the same firing alert on two consecutive hourly runs sends once; the second is 200 + suppressed', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    const a = await run(T0);
    const b = await run(T0 + HOUR);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(b.body).toMatchObject({ alertsFiring: 1, alertsSent: 0, alertsSuppressed: 1 });
  });

  it('sends a reminder once the 24h interval has elapsed, then goes quiet again', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    await run(T0 + 23 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(1);
    await run(T0 + 24 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
    await run(T0 + 25 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('a failed delivery is not recorded as sent: it is retried next run (424 then 200)', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    mockSend.mockResolvedValueOnce(ALL_FAILED);
    expect((await run(T0)).status).toBe(424);
    expect(rows).toHaveLength(0);
    mockSend.mockResolvedValue(DELIVERED);
    expect((await run(T0 + HOUR)).status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect((await run(T0 + 2 * HOUR)).body.alertsSuppressed).toBe(1);
  });

  it('firing -> ok x3 (hysteresis) -> firing notifies again immediately (resolution is recorded, not announced)', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    mockCompute.mockResolvedValue([alert('ok')]);
    for (let h = 1; h <= 3; h++) await run(T0 + h * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(1);
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0 + 4 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('state is read from the table, not process memory (fresh module instance still suppresses)', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    vi.resetModules();
    const fresh = await import('./route');
    vi.setSystemTime(T0 + HOUR);
    const res = await fresh.GET(req() as never);
    expect((await res.json()).alertsSuppressed).toBe(1);
  });

  it('a partial delivery (207) still records the alert as sent', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    mockSend.mockResolvedValueOnce({ configured: 2, delivered: 1, failed: 1 });
    expect((await run(T0)).status).toBe(207);
    expect((await run(T0 + HOUR)).body.alertsSuppressed).toBe(1);
  });

  it('flapping hourly for 24h pages once (was 12x)', async () => {
    for (let h = 0; h < 24; h++) {
      mockCompute.mockResolvedValue([alert(h % 2 === 0 ? 'firing' : 'ok')]);
      await run(T0 + h * HOUR);
    }
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('a signal that stays ok for 3 runs is resolved; the next fire pages again', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    mockCompute.mockResolvedValue([alert('ok')]);
    for (let h = 1; h <= 3; h++) await run(T0 + h * HOUR);
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0 + 4 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('fire, 13h insufficient_data, fire -> 2 pages; a 3h blip -> 1 page', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    mockCompute.mockResolvedValue([alert('insufficient_data')]);
    for (let h = 1; h <= 13; h++) await run(T0 + h * HOUR);
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0 + 14 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);

    rows.length = 0;
    mockSend.mockClear();
    const T1 = T0 + 100 * HOUR;
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T1);
    mockCompute.mockResolvedValue([alert('insufficient_data')]);
    for (let h = 1; h <= 2; h++) await run(T1 + h * HOUR);
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T1 + 3 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('a failed resolved write then a re-fire within 24h pages (duplicate-shaped, not lost) and reports it', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    await run(T0);
    mockCompute.mockResolvedValue([alert('ok')]);
    await run(T0 + HOUR);
    await run(T0 + 2 * HOUR);
    failWrites.states.add('resolved');
    const failed = await run(T0 + 3 * HOUR);
    expect(failed.body.stateWriteFailures).toBe(1);
    mockCompute.mockResolvedValue([alert('firing')]);
    const refire = await run(T0 + 4 * HOUR);
    expect(refire.body.alertsSent).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('a failed firing write after a successful send re-sends next run (accepted duplicate), then recovers', async () => {
    mockCompute.mockResolvedValue([alert('firing')]);
    failWrites.states.add('firing');
    expect((await run(T0)).body.stateWriteFailures).toBe(1);
    failWrites.states.clear();
    await run(T0 + HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
    await run(T0 + 2 * HOUR);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
