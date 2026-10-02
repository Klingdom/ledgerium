import { describe, it, expect } from 'vitest';
import { computeDashboardV2RetirementMetrics, MIN_USERS_FOR_RATE } from './dashboard-v2-retirement-metrics';
import { MAX_INSIGHT_CHIPS } from './workflow-metrics';

const T0 = Date.UTC(2026, 8, 1);
const at = (s: number) => new Date(T0 + s * 1000);

type Row = { eventName: string; userId: string | null; properties: string | null; createdAt: Date };
const view = (u: string, chips: unknown, s = 0): Row => ({
  eventName: 'dashboard_v2_viewed',
  userId: u,
  properties: JSON.stringify({ chipsRenderedCount: chips }),
  createdAt: at(s),
});
const bounce = (u: string, s = 1): Row => ({ eventName: 'dashboard_bounced', userId: u, properties: '{}', createdAt: at(s) });
const click = (u: string, s = 1): Row => ({ eventName: 'insight_chip_clicked', userId: u, properties: '{}', createdAt: at(s) });

const N = MIN_USERS_FOR_RATE;
/** N distinct users, each with one view of `chips` chips. */
const crowd = (chips = 2, prefix = 'u'): Row[] => Array.from({ length: N }, (_, i) => view(`${prefix}${i}`, chips));

describe('computeDashboardV2RetirementMetrics', () => {
  it('returns null rates and zero counts for no events', () => {
    expect(computeDashboardV2RetirementMetrics([])).toEqual({
      views: 0,
      bounces: 0,
      bounceRate: null,
      bounceUsers: 0,
      chipsRendered: 0,
      chipClicks: 0,
      chipClickRate: null,
      chipUsers: 0,
      minUsers: N,
      viewsMissingChipCount: 0,
    });
  });

  it('bounce rate is the mean of per-user rates over users', () => {
    // 10 users, 1 view each, 2 of them bounce -> 0.2
    const rows = [...crowd(0), bounce('u0'), bounce('u1')];
    const m = computeDashboardV2RetirementMetrics(rows);
    expect(m.bounceRate).toBeCloseTo(0.2);
    expect(m.bounceUsers).toBe(10);
    expect(m.bounces).toBe(2);
  });

  it('is 0 (not null) with enough users, views and no bounces', () => {
    expect(computeDashboardV2RetirementMetrics(crowd(1)).bounceRate).toBe(0);
  });

  it('chip-click rate is the mean of per-user capped rates', () => {
    // u0: 2 chips, 1 click -> 0.5; u1..u9: 2 chips, 0 clicks -> 0
    const m = computeDashboardV2RetirementMetrics([...crowd(2), click('u0')]);
    expect(m.chipClickRate).toBeCloseTo(0.05);
    expect(m.chipUsers).toBe(10);
    expect(m.chipsRendered).toBe(20);
    expect(m.chipClicks).toBe(1);
  });

  it('users who saw no chips are not in the chip sample', () => {
    const m = computeDashboardV2RetirementMetrics([...crowd(0), click('u0')]);
    expect(m.chipUsers).toBe(0);
    expect(m.chipClickRate).toBeNull();
  });

  it('counts malformed or invalid chipsRenderedCount in viewsMissingChipCount and excludes them from the sum', () => {
    const bad = (properties: string | null): Row => ({ ...view('u', 0), properties });
    const m = computeDashboardV2RetirementMetrics([
      view('u', 4),
      bad('not json'),
      bad(null),
      bad('{}'),
      bad('"str"'),
      bad('null'),
      view('u', '3'),
      view('u', -1),
      view('u', null),
      view('u', 1.5),
    ]);
    expect(m.views).toBe(10);
    expect(m.chipsRendered).toBe(4);
    expect(m.viewsMissingChipCount).toBe(9);
  });

  it('ignores unrelated events', () => {
    const m = computeDashboardV2RetirementMetrics([{ eventName: 'page_viewed', userId: 'u1', properties: '{}', createdAt: at(0) }]);
    expect(m.views).toBe(0);
    expect(m.chipClicks).toBe(0);
  });

  it('does not depend on row order', () => {
    const rows = [...crowd(2), click('u0'), bounce('u1'), bounce('u1', 2), view('u1', 3, 5)];
    expect(computeDashboardV2RetirementMetrics([...rows].reverse())).toEqual(computeDashboardV2RetirementMetrics(rows));
  });
});

describe('anonymous rows do not count (row #298)', () => {
  const anon = (r: Row): Row => ({ ...r, userId: null });

  it('anonymous bounces, views and clicks change nothing', () => {
    const real = [...crowd(2), bounce('u0')];
    const forged = [...Array.from({ length: 50 }, () => anon(bounce('x'))), anon(view('x', 5)), anon(click('x'))];
    expect(computeDashboardV2RetirementMetrics([...real, ...forged])).toEqual(computeDashboardV2RetirementMetrics(real));
  });
});

describe('one account cannot move a #57 metric (row #302)', () => {
  it('N forged bounce rows from one account move bounce rate by at most one user weight', () => {
    const real = [...crowd(0), bounce('u0')]; // 1/10 users bounced -> 0.1
    const base = computeDashboardV2RetirementMetrics(real).bounceRate!;
    // forger: 1000 bounces, and 1000 views of their own to pair against
    const forger: Row[] = [];
    for (let i = 0; i < 1000; i++) forger.push(view('forger', 0, 10 + i), bounce('forger', 10 + i));
    const m = computeDashboardV2RetirementMetrics([...real, ...forger]);
    // 11 users now; forger contributes one rate in [0,1]
    expect(m.bounceUsers).toBe(11);
    expect(Math.abs(m.bounceRate! - base)).toBeLessThanOrEqual(1 / 11 + 1e-9);
    expect(m.bounceRate!).toBeLessThanOrEqual((1 + 1) / 11 + 1e-9);
  });

  it('a forged chipsRenderedCount of 1e9 is clamped to the producer maximum', () => {
    const rows = [...crowd(2), view('forger', 1e9)];
    const m = computeDashboardV2RetirementMetrics(rows);
    expect(m.chipsRendered).toBe(10 * 2 + MAX_INSIGHT_CHIPS);
    // and 1000 clicks from the forger give it a single capped rate of 1, not 1e-7
    const withClicks = computeDashboardV2RetirementMetrics([...rows, ...Array.from({ length: 1000 }, (_, i) => click('forger', i))]);
    expect(withClicks.chipClickRate!).toBeLessThanOrEqual(1 / 11 + 1e-9);
  });

  it('one forged chip-click row cannot flip chip-click rate to ~0 through a huge denominator', () => {
    const base = computeDashboardV2RetirementMetrics([...crowd(2), click('u0'), click('u1')]);
    const forged = computeDashboardV2RetirementMetrics([...crowd(2), click('u0'), click('u1'), view('forger', 1e9)]);
    expect(base.chipClickRate!).toBeGreaterThan(0.09);
    expect(forged.chipClickRate!).toBeGreaterThan(0.09 * 10 / 11 - 1e-9);
  });

  it('orphan bounces (no preceding view from the same user) are ignored', () => {
    const rows = [
      ...crowd(0),
      ...Array.from({ length: 100 }, (_, i) => bounce('orphan', i)), // no views at all
      bounce('u0', -100), // before u0's only view
      bounce('u1', 1),
      bounce('u1', 2), // second bounce, only one view
    ];
    const m = computeDashboardV2RetirementMetrics(rows);
    expect(m.bounces).toBe(1); // only u1's first
    expect(m.bounceUsers).toBe(10);
    expect(m.bounceRate).toBeCloseTo(0.1);
  });

  it('a user cannot bounce another user\'s view', () => {
    const m = computeDashboardV2RetirementMetrics([...crowd(0), bounce('someone-else')]);
    expect(m.bounces).toBe(0);
  });

  it('below the minimum sample both rates are null (insufficient data), at it they are reported', () => {
    const few = Array.from({ length: N - 1 }, (_, i) => view(`u${i}`, 2));
    const mFew = computeDashboardV2RetirementMetrics([...few, bounce('u0'), click('u0')]);
    expect(mFew.bounceRate).toBeNull();
    expect(mFew.chipClickRate).toBeNull();
    const mEnough = computeDashboardV2RetirementMetrics([...few, view('extra', 2), bounce('u0'), click('u0')]);
    expect(mEnough.bounceRate).not.toBeNull();
    expect(mEnough.chipClickRate).not.toBeNull();
  });

  it('one account with one row cannot satisfy the minimum sample alone', () => {
    expect(computeDashboardV2RetirementMetrics([view('forger', 5), bounce('forger')]).bounceRate).toBeNull();
  });
});
