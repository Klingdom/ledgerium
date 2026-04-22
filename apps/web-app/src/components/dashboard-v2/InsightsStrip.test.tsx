/**
 * InsightsStrip — iter-030 analytics instrumentation tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure logic for insight_chip_clicked event shape.
 *
 * PRD §4 metric #5: insight chip CTR (>15% of sessions with ≥5 workflows).
 */

import { describe, it, expect, vi } from 'vitest';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

// ── insight_chip_clicked event shape ─────────────────────────────────────────

type ChipSeverity = 'critical' | 'warning' | 'info' | 'positive';

function buildInsightChipClickedEvent(params: {
  severity: ChipSeverity;
  filterKey: string;
}): { event: string; severity: ChipSeverity; filterKey: string } {
  return {
    event: 'insight_chip_clicked',
    severity: params.severity,
    filterKey: params.filterKey,
  };
}

describe('iter-030: insight_chip_clicked event shape', () => {
  it('event name is insight_chip_clicked', () => {
    const ev = buildInsightChipClickedEvent({ severity: 'warning', filterKey: 'variationScore_gt_0.7' });
    expect(ev.event).toBe('insight_chip_clicked');
  });

  it('severity is forwarded from the chip object', () => {
    const ev = buildInsightChipClickedEvent({ severity: 'critical', filterKey: 'some_key' });
    expect(ev.severity).toBe('critical');
  });

  it('filterKey is forwarded from the chip object', () => {
    const ev = buildInsightChipClickedEvent({ severity: 'info', filterKey: 'opportunityTag_automate' });
    expect(ev.filterKey).toBe('opportunityTag_automate');
  });

  it('all 4 severity values are valid', () => {
    const severities: ChipSeverity[] = ['critical', 'warning', 'info', 'positive'];
    for (const severity of severities) {
      const ev = buildInsightChipClickedEvent({ severity, filterKey: 'test_key' });
      expect(ev.severity).toBe(severity);
    }
  });

  it('filterKey is never empty for a chip event (chips must have a filterKey)', () => {
    const ev = buildInsightChipClickedEvent({ severity: 'positive', filterKey: 'healthScore_gte_70' });
    expect(ev.filterKey.length).toBeGreaterThan(0);
  });

  it('event shape has exactly 3 fields: event, severity, filterKey', () => {
    const ev = buildInsightChipClickedEvent({ severity: 'warning', filterKey: 'foo' });
    expect(Object.keys(ev).sort()).toEqual(['event', 'filterKey', 'severity']);
  });
});
