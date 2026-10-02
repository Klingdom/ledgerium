import { describe, it, expect } from 'vitest';
import { computeDashboardV2RetirementMetrics } from './dashboard-v2-retirement-metrics';

const view = (chips: unknown) => ({
  eventName: 'dashboard_v2_viewed',
  userId: 'u1',
  properties: JSON.stringify({ chipsRenderedCount: chips }),
});
const bounce = { eventName: 'dashboard_bounced', userId: 'u1', properties: '{}' };
const click = { eventName: 'insight_chip_clicked', userId: 'u1', properties: '{}' };

describe('computeDashboardV2RetirementMetrics', () => {
  it('returns null rates and zero counts for no events', () => {
    expect(computeDashboardV2RetirementMetrics([])).toEqual({
      views: 0,
      bounces: 0,
      bounceRate: null,
      chipsRendered: 0,
      chipClicks: 0,
      chipClickRate: null,
      viewsMissingChipCount: 0,
    });
  });

  it('null bounce rate (not 0) when there are bounces but no views', () => {
    const m = computeDashboardV2RetirementMetrics([bounce]);
    expect(m.bounces).toBe(1);
    expect(m.bounceRate).toBeNull();
  });

  it('computes bounce rate as bounces / views', () => {
    const m = computeDashboardV2RetirementMetrics([view(0), view(0), view(0), view(0), bounce]);
    expect(m.views).toBe(4);
    expect(m.bounces).toBe(1);
    expect(m.bounceRate).toBe(0.25);
  });

  it('is 0 (not null) when views exist and no bounces', () => {
    expect(computeDashboardV2RetirementMetrics([view(1)]).bounceRate).toBe(0);
  });

  it('sums chipsRenderedCount across views', () => {
    const m = computeDashboardV2RetirementMetrics([view(3), view(2), view(0), click]);
    expect(m.chipsRendered).toBe(5);
    expect(m.chipClicks).toBe(1);
    expect(m.chipClickRate).toBeCloseTo(0.2);
    expect(m.viewsMissingChipCount).toBe(0);
  });

  it('null chip-click rate when chips rendered is 0, even with clicks', () => {
    const m = computeDashboardV2RetirementMetrics([view(0), click]);
    expect(m.chipsRendered).toBe(0);
    expect(m.chipClickRate).toBeNull();
  });

  it('counts malformed or invalid chipsRenderedCount in viewsMissingChipCount and excludes them from the sum', () => {
    const m = computeDashboardV2RetirementMetrics([
      view(4),
      { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: 'not json' },
      { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: null },
      { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: '{}' },
      { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: '"str"' },
      { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: 'null' },
      view('3'),
      view(-1),
      view(null),
    ]);
    expect(m.views).toBe(9);
    expect(m.chipsRendered).toBe(4);
    expect(m.viewsMissingChipCount).toBe(8);
  });

  it('does not clamp a rate above 100%', () => {
    const m = computeDashboardV2RetirementMetrics([view(1), click, click, click, bounce, bounce]);
    expect(m.chipClickRate).toBe(3);
    expect(m.bounceRate).toBe(2);
  });

  it('ignores unrelated events', () => {
    const m = computeDashboardV2RetirementMetrics([{ eventName: 'page_viewed', userId: 'u1', properties: '{}' }]);
    expect(m.views).toBe(0);
    expect(m.chipClicks).toBe(0);
  });

  it('does not depend on row order', () => {
    const rows = [view(2), click, bounce, view(3), { eventName: 'dashboard_v2_viewed', userId: 'u1', properties: 'x' }];
    expect(computeDashboardV2RetirementMetrics([...rows].reverse())).toEqual(
      computeDashboardV2RetirementMetrics(rows),
    );
  });
});

describe('computeDashboardV2RetirementMetrics: anonymous rows do not count (row #298)', () => {
  const anon = <T extends { eventName: string; properties?: string | null }>(r: T) => ({ ...r, userId: null });

  it('an anonymous bounce does not move the bounce rate', () => {
    const real = [view(0), view(0), view(0), view(0), bounce];
    const forged = Array.from({ length: 50 }, () => anon(bounce));
    const withForged = computeDashboardV2RetirementMetrics([...real, ...forged]);
    expect(withForged).toEqual(computeDashboardV2RetirementMetrics(real));
    expect(withForged.bounces).toBe(1);
    expect(withForged.bounceRate).toBe(0.25);
  });

  it('anonymous views and chip clicks do not count either', () => {
    const m = computeDashboardV2RetirementMetrics([view(2), click, anon(view(100)), anon(click), anon(click)]);
    expect(m.views).toBe(1);
    expect(m.chipsRendered).toBe(2);
    expect(m.chipClicks).toBe(1);
    expect(m.chipClickRate).toBe(0.5);
  });

  it('a window of only anonymous rows is "no data" (null), not zero', () => {
    const m = computeDashboardV2RetirementMetrics([anon(view(3)), anon(bounce)]);
    expect(m.views).toBe(0);
    expect(m.bounceRate).toBeNull();
  });
});
