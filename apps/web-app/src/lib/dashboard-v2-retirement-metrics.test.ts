import { describe, it, expect } from 'vitest';
import { computeDashboardV2RetirementMetrics } from './dashboard-v2-retirement-metrics';

const view = (chips: unknown) => ({
  eventName: 'dashboard_v2_viewed',
  properties: JSON.stringify({ chipsRenderedCount: chips }),
});
const bounce = { eventName: 'dashboard_bounced', properties: '{}' };
const click = { eventName: 'insight_chip_clicked', properties: '{}' };

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
      { eventName: 'dashboard_v2_viewed', properties: 'not json' },
      { eventName: 'dashboard_v2_viewed', properties: null },
      { eventName: 'dashboard_v2_viewed', properties: '{}' },
      { eventName: 'dashboard_v2_viewed', properties: '"str"' },
      { eventName: 'dashboard_v2_viewed', properties: 'null' },
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
    const m = computeDashboardV2RetirementMetrics([{ eventName: 'page_viewed', properties: '{}' }]);
    expect(m.views).toBe(0);
    expect(m.chipClicks).toBe(0);
  });

  it('does not depend on row order', () => {
    const rows = [view(2), click, bounce, view(3), { eventName: 'dashboard_v2_viewed', properties: 'x' }];
    expect(computeDashboardV2RetirementMetrics([...rows].reverse())).toEqual(
      computeDashboardV2RetirementMetrics(rows),
    );
  });
});
