import { describe, it, expect } from 'vitest';
import { computeActivationRate, ACTIVATION_WINDOW_DAYS } from './activation-rate';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 30, 12, 0, 0);
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY);

describe('computeActivationRate (row #250)', () => {
  it('many active long-tenured users + few new signups: ratio reflects the cohort only', () => {
    const signups = [10, 10, 9, 9, 8].map((d, i) => ({ userId: `n${i}`, createdAt: at(d) }));
    const views = Array.from({ length: 50 }, (_, i) => ({ userId: `old${i}`, createdAt: at(1) }));
    const r = computeActivationRate(signups, views, NOW);
    expect(r.cohortSize).toBe(5);
    expect(r.activated).toBe(0);
    expect(r.rate).toBe(0);
  });

  it('rate is within [0,1]; duplicate views and non-cohort users do not inflate it', () => {
    const signups = [{ userId: 'a', createdAt: at(10) }, { userId: 'b', createdAt: at(10) }];
    const views = [
      { userId: 'a', createdAt: at(9) },
      { userId: 'a', createdAt: at(8) },
      { userId: 'b', createdAt: at(9) },
      { userId: 'zzz', createdAt: at(9) },
    ];
    const r = computeActivationRate(signups, views, NOW);
    expect(r.activated).toBe(2);
    expect(r.rate).toBe(1);
  });

  it('views outside [signup, signup+window] do not activate', () => {
    const signups = [{ userId: 'a', createdAt: at(12) }];
    const late = [{ userId: 'a', createdAt: new Date(at(12).getTime() + (ACTIVATION_WINDOW_DAYS + 1) * DAY) }];
    const early = [{ userId: 'a', createdAt: new Date(at(12).getTime() - 1000) }];
    expect(computeActivationRate(signups, late, NOW).activated).toBe(0);
    expect(computeActivationRate(signups, early, NOW).activated).toBe(0);
  });

  it('immature signups (< 7d old) are excluded, not counted as failures', () => {
    expect(computeActivationRate([{ userId: 'fresh', createdAt: at(2) }], [], NOW)).toEqual({
      cohortSize: 0,
      activated: 0,
      rate: null,
    });
  });

  it('empty cohort yields null; null userIds ignored', () => {
    expect(computeActivationRate([], [], NOW).rate).toBeNull();
    expect(computeActivationRate([{ userId: null, createdAt: at(10) }], [], NOW).cohortSize).toBe(0);
  });
});
