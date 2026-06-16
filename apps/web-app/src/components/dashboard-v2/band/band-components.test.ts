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
import { deriveSegments, OPPORTUNITY_GLOSS } from './OpportunityBar';
import { buildNarrator, buildNarratorParts } from './NarratorSummary';
import { formatWeekTick, totalRecorded, shouldSuppressTrend, computeYTicks, isDegenerateYDomain } from './trend-utils';
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

// ── atglance-review #13: opportunity-tag gloss (definitions only) ──────────────

describe('OpportunityBar.OPPORTUNITY_GLOSS (item #13 — verdict legend)', () => {
  it('glosses all 5 opportunity verdicts', () => {
    expect(Object.keys(OPPORTUNITY_GLOSS).sort()).toEqual([
      'automate',
      'healthy',
      'monitor',
      'optimize',
      'standardize',
    ]);
  });

  it('each gloss is a plain-language definition, not a fabricated target/benchmark', () => {
    for (const text of Object.values(OPPORTUNITY_GLOSS)) {
      expect(text.length).toBeGreaterThan(0);
      const lc = text.toLowerCase();
      for (const forbidden of ['target', 'benchmark', 'sigma', 'dpmo', 'roi', 'savings', '%']) {
        expect(lc).not.toContain(forbidden);
      }
    }
  });

  it('definitions reference the real scoring inputs (runs / variation / stability)', () => {
    expect(OPPORTUNITY_GLOSS.automate.toLowerCase()).toContain('stable');
    expect(OPPORTUNITY_GLOSS.standardize.toLowerCase()).toContain('many different ways');
    expect(OPPORTUNITY_GLOSS.monitor.toLowerCase()).toContain('runs');
    expect(OPPORTUNITY_GLOSS.healthy.toLowerCase()).toContain('no action');
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

// ── NarratorSummary.buildNarratorParts (atglance-review #9 — clause→filter) ─────
//
// The structured narrator exposes which honest filter the follow-up clause maps
// to, so the component can wire the clause as an interactive "navigate" target.
// The lead clause (portfolio-wide average) has NO honest filter target.

describe('NarratorSummary.buildNarratorParts (#9 clause→filter mapping)', () => {
  it('high-variation clause maps to the high_variation health-status filter', () => {
    const parts = buildNarratorParts({
      totalWorkflows: 12,
      avgHealthScore: 72,
      highVariationCount: 3,
      opportunityCounts: emptyCounts,
    });
    expect(parts).not.toBeNull();
    expect(parts!.follow?.filter).toEqual({ kind: 'healthStatus', value: 'high_variation' });
    // The joined sentence is byte-identical to buildNarrator (single source).
    expect(`${parts!.lead}${parts!.follow?.text ?? ''}`).toBe(
      'Your 12 workflows average a health score of 72. 3 have high variation — consider standardizing.',
    );
  });

  it('automation clause maps to the automate opportunity filter', () => {
    const parts = buildNarratorParts({
      totalWorkflows: 4,
      avgHealthScore: 88,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, automate: 1 },
    });
    expect(parts!.follow?.filter).toEqual({ kind: 'opportunity', value: 'automate' });
  });

  it('monitor clause maps to the monitor opportunity filter', () => {
    const parts = buildNarratorParts({
      totalWorkflows: 4,
      avgHealthScore: 70,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, monitor: 2 },
    });
    expect(parts!.follow?.filter).toEqual({ kind: 'opportunity', value: 'monitor' });
  });

  it('lead-only narrator has no follow clause and therefore no filter target (honest)', () => {
    const parts = buildNarratorParts({
      totalWorkflows: 1,
      avgHealthScore: 95,
      highVariationCount: 0,
      opportunityCounts: { ...emptyCounts, healthy: 1 },
    });
    expect(parts!.follow).toBeNull();
  });

  it('returns null when there are no workflows (honest omission)', () => {
    expect(
      buildNarratorParts({
        totalWorkflows: 0,
        avgHealthScore: 50,
        highVariationCount: 0,
        opportunityCounts: emptyCounts,
      }),
    ).toBeNull();
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

// ── computeYTicks (trend Y-axis integer tick fix, Batch C) ─────────────────────

describe('computeYTicks (integer Y-axis ticks)', () => {
  it('empty data → [0, 1] flat baseline with one unit of headroom', () => {
    expect(computeYTicks([])).toEqual([0, 1]);
  });

  it('all-zero counts → [0, 1] (no fractional ticks on a flat zero series)', () => {
    expect(
      computeYTicks([
        { weekStartIso: 'a', count: 0 },
        { weekStartIso: 'b', count: 0 },
      ]),
    ).toEqual([0, 1]);
  });

  it('small max (≤ 5) → every integer from 0 to max', () => {
    expect(
      computeYTicks([
        { weekStartIso: 'a', count: 1 },
        { weekStartIso: 'b', count: 3 },
        { weekStartIso: 'c', count: 2 },
      ]),
    ).toEqual([0, 1, 2, 3]);
  });

  it('max of exactly 5 → 0..5 inclusive', () => {
    expect(computeYTicks([{ weekStartIso: 'a', count: 5 }])).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('large max (> 5) → 0, midpoint, max only (≤ 5 distinct ticks)', () => {
    expect(computeYTicks([{ weekStartIso: 'a', count: 12 }])).toEqual([0, 6, 12]);
  });

  it('all returned ticks are integers (never fractional)', () => {
    const ticks = computeYTicks([
      { weekStartIso: 'a', count: 7 },
      { weekStartIso: 'b', count: 3 },
    ]);
    for (const t of ticks) {
      expect(Number.isInteger(t)).toBe(true);
    }
  });

  it('returns ticks in strictly ascending order, deduped', () => {
    // max=2 → midpoint would be 1 — Set already guarantees no dupes; verify order.
    const ticks = computeYTicks([{ weekStartIso: 'a', count: 9 }]);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!);
    }
  });

  it('is deterministic for the same input', () => {
    const data = [
      { weekStartIso: 'a', count: 4 },
      { weekStartIso: 'b', count: 8 },
    ];
    expect(computeYTicks(data)).toEqual(computeYTicks(data));
  });

  it('produces DISTINCT ticks (no repeated labels like "3 / 3 / 3")', () => {
    // The COMPETITIVE review flagged repeated tick labels. Across a range of maxes
    // the returned ticks must always be strictly distinct.
    for (const max of [1, 2, 3, 5, 7, 12, 30, 100]) {
      const ticks = computeYTicks([{ weekStartIso: 'a', count: max }]);
      expect(new Set(ticks).size, `max=${max} ticks must be distinct`).toBe(ticks.length);
    }
  });
});

// ── isDegenerateYDomain (suppress Y-axis when max ≤ 1) ─────────────────────────

describe('isDegenerateYDomain (degenerate Y-axis suppression)', () => {
  it('empty data → degenerate (max 0)', () => {
    expect(isDegenerateYDomain([])).toBe(true);
  });

  it('all-zero counts → degenerate', () => {
    expect(
      isDegenerateYDomain([
        { weekStartIso: 'a', count: 0 },
        { weekStartIso: 'b', count: 0 },
      ]),
    ).toBe(true);
  });

  it('max of exactly 1 → degenerate (no meaningful vertical scale)', () => {
    expect(
      isDegenerateYDomain([
        { weekStartIso: 'a', count: 1 },
        { weekStartIso: 'b', count: 0 },
        { weekStartIso: 'c', count: 1 },
      ]),
    ).toBe(true);
  });

  it('max of 2 → NOT degenerate (axis renders)', () => {
    expect(
      isDegenerateYDomain([
        { weekStartIso: 'a', count: 2 },
        { weekStartIso: 'b', count: 1 },
      ]),
    ).toBe(false);
  });

  it('larger maxes → NOT degenerate', () => {
    expect(isDegenerateYDomain([{ weekStartIso: 'a', count: 3 }])).toBe(false);
    expect(isDegenerateYDomain([{ weekStartIso: 'a', count: 30 }])).toBe(false);
  });

  it('is deterministic for the same input', () => {
    const data = [{ weekStartIso: 'a', count: 1 }];
    expect(isDegenerateYDomain(data)).toBe(isDegenerateYDomain(data));
  });
});
