import { describe, it, expect } from 'vitest';
import { computeRetention } from './retention-cohorts';

const DAY = 86_400_000;
// Wednesday 2026-07-01 12:00 UTC; current ISO week Monday = 2026-06-29.
const NOW = Date.UTC(2026, 6, 1, 12, 0, 0);

describe('computeRetention maturity (row #250)', () => {
  it('a 3-day-old cohort does not pull week-4 retention down', () => {
    const users = [
      { id: 'm1', createdAt: new Date(Date.UTC(2026, 4, 26)) },
      { id: 'm2', createdAt: new Date(Date.UTC(2026, 4, 26)) },
      { id: 'f1', createdAt: new Date(NOW - 3 * DAY) },
    ];
    const events = ['m1', 'm2'].map((id) => ({ userId: id, createdAt: new Date(Date.UTC(2026, 5, 24)) }));
    const r = computeRetention(users, events, NOW);
    const fresh = r.cohorts.find((c) => c.signups === 1)!;
    expect(fresh.retention).toEqual([100, null, null, null, null]);
    expect(r.averageRetention[4]).toBe(100);
  });

  it('week N is not measurable until week N has fully elapsed', () => {
    const users = [{ id: 'u', createdAt: new Date(Date.UTC(2026, 5, 15)) }];
    const c = computeRetention(users, [], NOW).cohorts.find((x) => x.signups === 1)!;
    expect(c.retention).toEqual([100, 0, null, null, null]);
  });

  it('no users: no fake zeros, average null beyond week 0', () => {
    const r = computeRetention([], [], NOW);
    expect(r.averageRetention).toEqual([100, null, null, null, null]);
    expect(r.cohorts.every((c) => c.retention.every((v) => v === null))).toBe(true);
  });
});
