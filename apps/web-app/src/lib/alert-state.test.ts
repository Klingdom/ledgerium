/** Row #292: pure transition decision. */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/db', () => ({ db: { analyticsEvent: {} } }));
import {
  decideAlertSends, reduceAlertStates, ALERT_REMINDER_INTERVAL_MS as DAY,
  ALERT_QUIET_NEW_INCIDENT_MS as QUIET, ALERT_RESOLVE_AFTER_OK_RUNS as N, type AlertStates,
} from './alert-state';
import type { AlertResult } from './compute-alerts';

const NOW = 1_000_000_000_000;
const a = (status: AlertResult['status'], severity: AlertResult['severity'] = 'P1', id = 'x'): AlertResult => ({
  id, severity, status, message: '', value: null, threshold: null, checkedAt: '',
});
const NONE = { sends: [], suppressed: [], resolved: [], clear: [], continued: [] };
const HOUR = 3_600_000;
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
  it('firing state + first ok -> NOT resolved yet; records clear(okRuns 1), no send', () => {
    const r = d({ x: { state: 'firing', atMs: NOW - 5 } }, [a('ok')]);
    expect(r).toEqual({ ...NONE, clear: [{ id: 'x', okRuns: 1, sinceMs: NOW }] });
  });
  it('N ok runs (no firing run between) resolve; N-1 do not; sinceMs is preserved', () => {
    const prev = (okRuns: number): AlertStates => ({ x: { state: 'clear', atMs: NOW - HOUR, okRuns, sinceMs: NOW - 5 * HOUR, notifiedAtMs: NOW - 9 * HOUR } });
    expect(d(prev(N - 2), [a('ok')]).clear).toEqual([{ id: 'x', okRuns: N - 1, sinceMs: NOW - 5 * HOUR }]);
    expect(d(prev(N - 2), [a('ok')]).resolved).toEqual([]);
    expect(d(prev(N - 1), [a('ok')]).resolved).toEqual(['x']);
    expect(d(prev(N - 1), [a('ok')]).clear).toEqual([]);
  });
  it('ok, insufficient, ok, ok -> resolved (insufficient_data is neutral: neither counts nor resets)', () => {
    let prev: AlertStates = { x: { state: 'firing', atMs: NOW - 10 * HOUR } };
    const step = (status: AlertResult['status'], t: number) => {
      const r = d(prev, [a(status)], t);
      const c = r.clear[0];
      if (c) prev = { x: { state: 'clear', atMs: t, okRuns: c.okRuns, sinceMs: c.sinceMs, notifiedAtMs: NOW - 10 * HOUR } };
      return r;
    };
    expect(step('ok', NOW).clear[0]?.okRuns).toBe(1);
    expect(step('insufficient_data', NOW + HOUR)).toEqual(NONE);
    expect(step('ok', NOW + 2 * HOUR).clear[0]?.okRuns).toBe(2);
    expect(step('ok', NOW + 3 * HOUR).resolved).toEqual(['x']);
  });
  it('clock moved backwards (stored notifiedAt in the future), still firing -> send, not suppressed', () => {
    const r = d({ x: { state: 'firing', atMs: NOW + HOUR, notifiedAtMs: NOW + HOUR } }, [a('firing')]);
    expect(r.sends.map((s) => s.kind)).toEqual(['reminder']);
    expect(r.suppressed).toEqual([]);
    const q = d({ x: { state: 'clear', atMs: NOW + HOUR, okRuns: 0, sinceMs: NOW + HOUR, notifiedAtMs: NOW - HOUR } }, [a('firing')]);
    expect(q.sends.map((s) => s.kind)).toEqual(['new']);
  });
  it('re-fire during the hysteresis is a continuation: suppressed + continued write, no page', () => {
    const r = d({ x: { state: 'clear', atMs: NOW - HOUR, okRuns: 1, sinceMs: NOW - HOUR, notifiedAtMs: NOW - 2 * HOUR } }, [a('firing')]);
    expect(r.sends).toEqual([]);
    expect(r.suppressed).toHaveLength(1);
    expect(r.continued).toEqual([{ id: 'x', firingRuns: 1 }]);
  });
  it('a continued row re-fire is plain suppression (no further write); ok after continued restarts the count', () => {
    const prev: AlertStates = { x: { state: 'continued', atMs: NOW - HOUR, notifiedAtMs: NOW - 3 * HOUR } };
    expect(d(prev, [a('firing')])).toEqual({ ...NONE, suppressed: [a('firing')] });
    expect(d(prev, [a('ok')]).clear).toEqual([{ id: 'x', okRuns: 1, sinceMs: NOW }]);
  });
  it('reminder uses the last SEND time, not the latest row, through clear/continued rows', () => {
    const prev: AlertStates = { x: { state: 'continued', atMs: NOW - HOUR, notifiedAtMs: NOW - DAY } };
    expect(d(prev, [a('firing')]).sends[0]?.kind).toBe('reminder');
  });
  it('insufficient_data never resolves; it starts a quiet spell once, then writes nothing', () => {
    expect(d({ x: { state: 'firing', atMs: NOW - 5 } }, [a('insufficient_data')])).toEqual({ ...NONE, clear: [{ id: 'x', okRuns: 0, sinceMs: NOW }] });
    expect(d({ x: { state: 'continued', atMs: NOW - 5 } }, [a('insufficient_data')]).clear).toHaveLength(1);
    expect(d({ x: { state: 'clear', atMs: NOW - 5, okRuns: 0, sinceMs: NOW - 5 } }, [a('insufficient_data')])).toEqual(NONE);
    expect(d({ x: { state: 'resolved', atMs: 1 } }, [a('insufficient_data')])).toEqual(NONE);
    expect(d({}, [a('insufficient_data')])).toEqual(NONE);
  });
  it('quiet spell boundary: fires again after QUIET-1ms -> continuation; after exactly QUIET -> new page', () => {
    const prev = (since: number): AlertStates => ({ x: { state: 'clear', atMs: since, okRuns: 0, sinceMs: since, notifiedAtMs: since - HOUR } });
    expect(d(prev(NOW - QUIET + 1), [a('firing')]).sends).toEqual([]);
    expect(d(prev(NOW - QUIET), [a('firing')]).sends[0]?.kind).toBe('new');
  });
  it('legacy rows (no okRuns/sinceMs/notifiedAtMs) still behave: firing suppressed, ok -> clear', () => {
    expect(d({ x: { state: 'firing', atMs: NOW - 1 } }, [a('firing')]).suppressed).toHaveLength(1);
    expect(d({ x: { state: 'clear', atMs: NOW - 1, okRuns: 0, sinceMs: NOW - 1 } }, [a('ok')]).clear).toEqual([{ id: 'x', okRuns: 1, sinceMs: NOW - 1 }]);
  });
  it('ok with resolved/no state -> nothing', () => {
    expect(d({}, [a('ok')])).toEqual(NONE);
    expect(d({ x: { state: 'resolved', atMs: 1 } }, [a('ok')]).resolved).toEqual([]);
  });
  it('P3 is never sent, suppressed or resolved', () => {
    expect(d({}, [a('firing', 'P3')])).toEqual(NONE);
  });
  it('alerts are independent; future-dated state (clock skew) sends rather than suppresses', () => {
    const r = d({ x: { state: 'firing', atMs: NOW + 5 * DAY } }, [a('firing', 'P1', 'x'), a('firing', 'P2', 'y')]);
    expect(r.suppressed).toEqual([]);
    expect(r.sends.map((s) => s.alert.id).sort()).toEqual(['x', 'y']);
  });
  it('is deterministic', () => {
    const prev: AlertStates = { x: { state: 'firing', atMs: NOW - DAY } };
    expect(d(prev, [a('firing')])).toEqual(d(prev, [a('firing')]));
  });
});

describe('re-arm (row #297)', () => {
  const cont = (firingRuns: number | undefined, notified: number): AlertStates => ({
    x: { state: 'continued', atMs: NOW - HOUR, notifiedAtMs: notified, ...(firingRuns === undefined ? {} : { firingRuns }) },
  });
  it('second consecutive firing run after a clear, >= 4h since the page -> new send', () => {
    const r = d(cont(1, NOW - 4 * HOUR), [a('firing')]);
    expect(r.sends.map((s) => s.kind)).toEqual(['new']);
    expect(r.continued).toEqual([]);
  });
  it('re-arm is held back under the 4h min gap, without writing (steady)', () => {
    const r = d(cont(1, NOW - 4 * HOUR + 1), [a('firing')]);
    expect(r.sends).toEqual([]);
    expect(r.suppressed).toHaveLength(1);
    expect(r.continued).toEqual([]);
  });
  it('legacy continued row (no counter) never re-arms', () => {
    expect(d(cont(undefined, NOW - 10 * HOUR), [a('firing')]).sends).toEqual([]);
  });
  it('first firing run after a clear is only counted', () => {
    const r = d({ x: { state: 'clear', atMs: NOW - HOUR, okRuns: 2, sinceMs: NOW - 2 * HOUR, notifiedAtMs: NOW - 3 * HOUR } }, [a('firing')]);
    expect(r.sends).toEqual([]);
    expect(r.continued).toEqual([{ id: 'x', firingRuns: 1 }]);
  });
  it('reduce carries firingRuns; clear rows missing counters get safe defaults', () => {
    const rw = (o: object, at: number) => ({ properties: JSON.stringify({ alertId: 'x', ...o }), createdAt: new Date(at) });
    expect(reduceAlertStates([rw({ state: 'continued', firingRuns: 1 }, 5)])['x']).toEqual({ state: 'continued', atMs: 5, firingRuns: 1 });
    expect(reduceAlertStates([rw({ state: 'clear' }, 5)])['x']).toEqual({ state: 'clear', atMs: 5, okRuns: 0, sinceMs: 5 });
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
    expect(s).toEqual({ x: { state: 'resolved', atMs: 20, notifiedAtMs: 10 }, y: { state: 'firing', atMs: 5, notifiedAtMs: 5 } });
  });
  it('carries okRuns/sinceMs from the latest clear row and notifiedAtMs from the latest firing row', () => {
    const r = (o: object, at: number) => ({ properties: JSON.stringify({ alertId: 'x', ...o }), createdAt: new Date(at) });
    const s = reduceAlertStates([r({ state: 'clear', okRuns: 2, sinceMs: 7 }, 30), r({ state: 'firing' }, 10), r({ state: 'firing' }, 5)]);
    expect(s['x']).toEqual({ state: 'clear', atMs: 30, okRuns: 2, sinceMs: 7, notifiedAtMs: 10 });
  });
});
