/** Row #292: pure transition decision. */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/db', () => ({ db: { analyticsEvent: {} } }));
import { decideAlertSends, reduceAlertStates, ALERT_REMINDER_INTERVAL_MS as DAY, type AlertStates } from './alert-state';
import type { AlertResult } from './compute-alerts';

const NOW = 1_000_000_000_000;
const a = (status: AlertResult['status'], severity: AlertResult['severity'] = 'P1', id = 'x'): AlertResult => ({
  id, severity, status, message: '', value: null, threshold: null, checkedAt: '',
});
const d = (prev: AlertStates, r: AlertResult[], now = NOW) => decideAlertSends(prev, r, now);

describe('decideAlertSends', () => {
  it('no state + firing -> new send', () => {
    expect(d({}, [a('firing')]).sends.map((s) => s.kind)).toEqual(['new']);
  });
  it('firing recorded just now -> suppressed, no send', () => {
    const r = d({ x: { state: 'firing', atMs: NOW - 1 } }, [a('firing')]);
    expect(r.sends).toEqual([]);
    expect(r.suppressed).toHaveLength(1);
  });
  it('reminder boundary: 24h - 1ms suppressed, exactly 24h reminder', () => {
    expect(d({ x: { state: 'firing', atMs: NOW - DAY + 1 } }, [a('firing')]).sends).toEqual([]);
    expect(d({ x: { state: 'firing', atMs: NOW - DAY } }, [a('firing')]).sends[0]?.kind).toBe('reminder');
  });
  it('resolved + firing -> new send', () => {
    expect(d({ x: { state: 'resolved', atMs: NOW - 1 } }, [a('firing')]).sends[0]?.kind).toBe('new');
  });
  it('firing state + ok -> resolved list, no send', () => {
    const r = d({ x: { state: 'firing', atMs: NOW - 5 } }, [a('ok')]);
    expect(r.resolved).toEqual(['x']);
    expect(r.sends).toEqual([]);
  });
  it('firing state + insufficient_data -> keeps state: neither resolves nor sends', () => {
    const r = d({ x: { state: 'firing', atMs: NOW - 5 } }, [a('insufficient_data')]);
    expect(r).toEqual({ sends: [], suppressed: [], resolved: [] });
  });
  it('ok with resolved/no state -> nothing', () => {
    expect(d({}, [a('ok')])).toEqual({ sends: [], suppressed: [], resolved: [] });
    expect(d({ x: { state: 'resolved', atMs: 1 } }, [a('ok')]).resolved).toEqual([]);
  });
  it('P3 is never sent, suppressed or resolved', () => {
    expect(d({}, [a('firing', 'P3')])).toEqual({ sends: [], suppressed: [], resolved: [] });
  });
  it('alerts are independent; future-dated state (clock skew) is suppressed', () => {
    const r = d({ x: { state: 'firing', atMs: NOW + 5 * DAY } }, [a('firing', 'P1', 'x'), a('firing', 'P2', 'y')]);
    expect(r.suppressed.map((s) => s.id)).toEqual(['x']);
    expect(r.sends.map((s) => s.alert.id)).toEqual(['y']);
  });
  it('is deterministic', () => {
    const prev: AlertStates = { x: { state: 'firing', atMs: NOW - DAY } };
    expect(d(prev, [a('firing')])).toEqual(d(prev, [a('firing')]));
  });
});

describe('reduceAlertStates', () => {
  const row = (alertId: unknown, state: unknown, at: number) => ({ properties: JSON.stringify({ alertId, state }), createdAt: new Date(at) });
  it('latest row per alert wins regardless of order; ignores malformed rows', () => {
    const s = reduceAlertStates([
      row('x', 'resolved', 20), row('x', 'firing', 10), row('y', 'firing', 5),
      { properties: 'not json', createdAt: new Date(99) }, { properties: null, createdAt: new Date(99) },
      row('z', 'bogus', 99), row(7, 'firing', 99),
    ]);
    expect(s).toEqual({ x: { state: 'resolved', atMs: 20 }, y: { state: 'firing', atMs: 5 } });
  });
});
