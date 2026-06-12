/**
 * Batch B band — pure-logic unit tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the exported pure helpers of the band components. The recharts-based
 * RecordedTrendChart is NOT imported here (recharts pulls browser APIs under
 * node-env — see admin TimeSeriesChart.test.ts); its pure helpers live in
 * trend-utils.ts and are tested below.
 *
 * @batch B (2026-06-12)
 */

import { describe, it, expect, vi } from 'vitest';

// analytics.track is called inside OpportunityBar / KpiTileStrip handlers; mock it.
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

import { gaugeBand, arcGeometry } from './HealthGauge';
import { deriveSegments } from './OpportunityBar';
import { buildNarrator } from './NarratorSummary';
import { formatWeekTick, totalRecorded, shouldSuppressTrend } from './trend-utils';
import type { OpportunityCounts } from '@/lib/dashboard-band-stats';

// ── HealthGauge ────────────────────────────────────────────────────────────────

describe('HealthGauge.gaugeBand', () => {
  it('maps scores to the 60/80 bands', () => {
    expect(gaugeBand(0).label).toBe('poor');
    expect(gaugeBand(59).label).toBe('poor');
    expect(gaugeBand(60).label).toBe('fair');
    expect(gaugeBand(79).label).toBe('fair');
    expect(gaugeBand(80).label).toBe('good');
    expect(gaugeBand(100).label).toBe('good');
  });
});

describe('HealthGauge.arcGeometry', () => {
  it('is deterministic for a given size', () => {
    expect(arcGeometry(96)).toEqual(arcGeometry(96));
  });

  it('computes a half-circumference arc length proportional to the radius', () => {
    const g = arcGeometry(96);
    expect(g.arcLength).toBeCloseTo(Math.PI * g.r, 6);
    expect(g.path).toContain('A'); // SVG arc command present
  });
});

// ── OpportunityBar.deriveSegments ──────────────────────────────────────────────

const emptyCounts: OpportunityCounts = {
  automate: 0,
  standardize: 0,
  optimize: 0,
  monitor: 0,
  healthy: 0,
};

describe('OpportunityBar.deriveSegments', () => {
  it('returns no segments and total 0 for empty counts', () => {
    expect(deriveSegments(emptyCounts)).toEqual({ segments: [], total: 0 });
  });

  it('omits zero-count tags and orders by action priority', () => {
    const counts: OpportunityCounts = {
      automate: 2,
      standardize: 0,
      optimize: 1,
      monitor: 0,
      healthy: 1,
    };
    const { segments, total } = deriveSegments(counts);
    expect(total).toBe(4);
    expect(segments.map((s) => s.tag)).toEqual(['automate', 'optimize', 'healthy']);
  });

  it('computes percentages that sum to ~100 for the present segments', () => {
    const counts: OpportunityCounts = {
      automate: 1,
      standardize: 1,
      optimize: 1,
      monitor: 1,
      healthy: 0,
    };
    const { segments } = deriveSegments(counts);
    const sum = segments.reduce((s, seg) => s + seg.pct, 0);
    expect(sum).toBeCloseTo(100, 1);
  });
});

// ── NarratorSummary.buildNarrator ──────────────────────────────────────────────

describe('NarratorSummary.buildNarrator', () => {
  it('returns null when there are no workflows (honest omission)', () => {
    expect(
      buildNarrator({
        totalWorkflows: 0,
        avgHealthScore: 72,
        highVariationCount: 0,
        opportunityCounts: emptyCounts,
      }),
    ).toBeNull();
  });

  it('includes the health average when present and the high-variation clause', () => {
    const s = buildNarrator({
      totalWorkflows: 12,
      avgHealthScore: 72,
      highVariationCount: 3,
      opportunityCounts: emptyCounts,
    });
    expect(s).toBe(
      'Your 12 workflows average a health score of 72. 3 have high variation — consider standardizing.',
    );
  });

  it('omits the health clause when avgHealthScore is null (no fabrication)', () => {
    const s = buildNarrator({
      totalWorkflows: 5,
      avgHealthScore: null,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, automate: 2 },
    });
    expect(s).toBe('You have 5 workflows. 2 are automation candidates.');
  });

  it('falls back to the automation clause when no high-variation workflows', () => {
    const s = buildNarrator({
      totalWorkflows: 4,
      avgHealthScore: 88,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, automate: 1 },
    });
    expect(s).toBe('Your 4 workflows average a health score of 88. 1 is an automation candidate.');
  });

  it('uses the monitor clause when no variation or automation signal exists', () => {
    const s = buildNarrator({
      totalWorkflows: 4,
      avgHealthScore: 70,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, monitor: 2 },
    });
    expect(s).toBe('Your 4 workflows average a health score of 70. 2 need remediation before automation.');
  });

  it('produces only the lead clause when no actionable signal exists', () => {
    const s = buildNarrator({
      totalWorkflows: 1,
      avgHealthScore: 95,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, healthy: 1 },
    });
    expect(s).toBe('Your 1 workflow average a health score of 95.');
  });
});

// ── trend-utils ────────────────────────────────────────────────────────────────

describe('trend-utils', () => {
  it('formatWeekTick renders a UTC short date and tolerates bad input', () => {
    expect(formatWeekTick('2026-06-12T00:00:00.000Z')).toBe('Jun 12');
    expect(formatWeekTick('not-a-date')).toBe('');
  });

  it('totalRecorded sums bucket counts', () => {
    expect(
      totalRecorded([
        { weekStartIso: 'a', count: 1 },
        { weekStartIso: 'b', count: 4 },
      ]),
    ).toBe(5);
  });

  it('shouldSuppressTrend is true for empty data or < 3 total recordings', () => {
    expect(shouldSuppressTrend([])).toBe(true);
    expect(shouldSuppressTrend([{ weekStartIso: 'a', count: 2 }])).toBe(true);
    expect(
      shouldSuppressTrend([
        { weekStartIso: 'a', count: 2 },
        { weekStartIso: 'b', count: 1 },
      ]),
    ).toBe(false);
  });
});
