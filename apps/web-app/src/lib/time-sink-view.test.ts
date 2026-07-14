/**
 * time-sink-view — state-derivation unit tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. Mirrors the
 * UsageQuotaMeter/deriveQuotaState pure-helper test pattern (this repo's
 * convention for `apps/web-app`: web-app's vitest.config.ts runs
 * `environment: 'node'` with no @testing-library dependency anywhere in the
 * package — see UsageQuotaMeter.test.tsx).
 */

import { describe, expect, it } from 'vitest';
import {
  deriveTimeSinkViewState,
  deriveTotalsDisplay,
  deriveEntryDisplay,
  deriveRankedEntryDisplays,
  formatPlanName,
} from './time-sink-view';
import type {
  PortfolioTimeSinkEntry,
  PortfolioTimeSinkReport,
} from '@ledgerium/intelligence-engine';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<PortfolioTimeSinkEntry> = {}): PortfolioTimeSinkEntry {
  return {
    workflowId: 'wf-1',
    title: 'Onboard vendor',
    runCount: 10,
    aggregateTimeMs: 50000,
    pctOfPortfolioTime: 83.3333,
    topBottleneck: {
      position: 2,
      category: 'approval_wait',
      severity: 'high',
      delayMs: 6000,
      durationRatio: 3,
      evidenceRunIds: ['run-c', 'run-a'],
    },
    stepDurationRange: {
      minMs: 12000,
      medianMs: 19000,
      p90Ms: 25000,
      maxMs: 30000,
    },
    hasTimingData: true,
    evidenceRunIds: ['run-a', 'run-b', 'run-c'],
    ...overrides,
  };
}

function makeReport(overrides: Partial<PortfolioTimeSinkReport> = {}): PortfolioTimeSinkReport {
  return {
    version: 'timesink-aggregate/1.0.0',
    ranked: [makeEntry()],
    totals: { totalTimeMs: 60000, workflowCount: 2, coveredWorkflowCount: 2 },
    ...overrides,
  };
}

// ── deriveTimeSinkViewState ───────────────────────────────────────────────────

describe('deriveTimeSinkViewState', () => {
  it('returns "loading" while the request is in flight, regardless of other params', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: true, httpStatus: null, hasNetworkError: false, report: null }),
    ).toBe('loading');
    expect(
      deriveTimeSinkViewState({ isLoading: true, httpStatus: 200, hasNetworkError: false, report: makeReport() }),
    ).toBe('loading');
  });

  it('returns "error" on a network/parse failure', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: null, hasNetworkError: true, report: null }),
    ).toBe('error');
  });

  it('returns "unauthorized" on HTTP 401', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 401, hasNetworkError: false, report: null }),
    ).toBe('unauthorized');
  });

  it('returns "forbidden" on HTTP 403 (plan-gated)', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 403, hasNetworkError: false, report: null }),
    ).toBe('forbidden');
  });

  it('returns "error" on any other non-200 status (e.g. 404, 500)', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 500, hasNetworkError: false, report: null }),
    ).toBe('error');
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 404, hasNetworkError: false, report: null }),
    ).toBe('error');
  });

  it('returns "error" on a 200 with a missing/null report body (malformed envelope)', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 200, hasNetworkError: false, report: null }),
    ).toBe('error');
  });

  it('returns "empty-no-workflows" when totals.workflowCount is 0', () => {
    const report = makeReport({ ranked: [], totals: { totalTimeMs: 0, workflowCount: 0, coveredWorkflowCount: 0 } });
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 200, hasNetworkError: false, report }),
    ).toBe('empty-no-workflows');
  });

  it('returns "empty-no-coverage" when workflows exist but none have timing data', () => {
    const report = makeReport({
      ranked: [makeEntry({ hasTimingData: false, aggregateTimeMs: 0, pctOfPortfolioTime: 0 })],
      totals: { totalTimeMs: 0, workflowCount: 3, coveredWorkflowCount: 0 },
    });
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 200, hasNetworkError: false, report }),
    ).toBe('empty-no-coverage');
  });

  it('returns "ready" when at least one workflow is covered', () => {
    expect(
      deriveTimeSinkViewState({ isLoading: false, httpStatus: 200, hasNetworkError: false, report: makeReport() }),
    ).toBe('ready');
  });
});

// ── deriveTotalsDisplay ────────────────────────────────────────────────────────

describe('deriveTotalsDisplay', () => {
  it('formats total time and coverage honestly', () => {
    const display = deriveTotalsDisplay(makeReport());
    expect(display.totalTimeLabel).toBe('1m');
    expect(display.coverageLabel).toBe('2 of 2 workflows have timing data');
    expect(display.workflowCount).toBe(2);
    expect(display.coveredWorkflowCount).toBe(2);
    expect(display.isFullyCovered).toBe(true);
  });

  it('shows "—" for total time when totalTimeMs is 0', () => {
    const display = deriveTotalsDisplay(
      makeReport({ totals: { totalTimeMs: 0, workflowCount: 1, coveredWorkflowCount: 0 } }),
    );
    expect(display.totalTimeLabel).toBe('—');
    expect(display.isFullyCovered).toBe(false);
  });

  it('singularizes "workflow" when workflowCount is 1', () => {
    const display = deriveTotalsDisplay(
      makeReport({ totals: { totalTimeMs: 1000, workflowCount: 1, coveredWorkflowCount: 1 } }),
    );
    expect(display.coverageLabel).toBe('1 of 1 workflow has timing data');
  });

  it('isFullyCovered is false when workflowCount is 0 (no fabricated "fully covered" on an empty set)', () => {
    const display = deriveTotalsDisplay(
      makeReport({ totals: { totalTimeMs: 0, workflowCount: 0, coveredWorkflowCount: 0 } }),
    );
    expect(display.isFullyCovered).toBe(false);
  });

  it('isFullyCovered is false when only a subset of workflows are covered', () => {
    const display = deriveTotalsDisplay(
      makeReport({ totals: { totalTimeMs: 1000, workflowCount: 4, coveredWorkflowCount: 2 } }),
    );
    expect(display.isFullyCovered).toBe(false);
  });
});

// ── deriveEntryDisplay ─────────────────────────────────────────────────────────

describe('deriveEntryDisplay', () => {
  it('derives a fully-populated covered row', () => {
    const row = deriveEntryDisplay(makeEntry(), 1);
    expect(row.rank).toBe(1);
    expect(row.workflowId).toBe('wf-1');
    expect(row.title).toBe('Onboard vendor');
    expect(row.hasTimingData).toBe(true);
    expect(row.aggregateTimeLabel).toBe('50s');
    expect(row.pctLabel).toBe('83.3%');
    expect(row.deemphasized).toBe(false);
  });

  it('formats the bottleneck label from category, ratio, and delay', () => {
    const row = deriveEntryDisplay(makeEntry(), 1);
    expect(row.bottleneckLabel).toBe('approval_wait · 3.0× avg step · +6s slower than average');
    expect(row.bottleneckSeverity).toBe('high');
  });

  it('formats a "moderate" severity bottleneck distinctly from "high"', () => {
    const row = deriveEntryDisplay(
      makeEntry({
        topBottleneck: {
          position: 1,
          category: 'form_fill',
          severity: 'moderate',
          delayMs: 500,
          durationRatio: 1.2,
          evidenceRunIds: ['run-x'],
        },
      }),
      1,
    );
    expect(row.bottleneckSeverity).toBe('moderate');
    expect(row.bottleneckLabel).toContain('1.2× avg step');
  });

  it('returns null bottleneck label + severity when topBottleneck is null (no fabrication)', () => {
    const row = deriveEntryDisplay(makeEntry({ topBottleneck: null, stepDurationRange: null }), 1);
    expect(row.bottleneckLabel).toBeNull();
    expect(row.bottleneckSeverity).toBeNull();
    expect(row.rangeLabel).toBeNull();
  });

  it('formats the step duration range from min/median/p90/max', () => {
    const row = deriveEntryDisplay(makeEntry(), 1);
    expect(row.rangeLabel).toBe('min 12s · median 19s · p90 25s · max 30s');
  });

  it('renders individual null range fields as "—" without dropping the whole range', () => {
    const row = deriveEntryDisplay(
      makeEntry({
        stepDurationRange: { minMs: 12000, medianMs: null, p90Ms: 25000, maxMs: null },
      }),
      1,
    );
    expect(row.rangeLabel).toBe('min 12s · median — · p90 25s · max —');
  });

  it('formats the evidence-linkage cue with the correct run count and pluralization', () => {
    const single = deriveEntryDisplay(makeEntry({ evidenceRunIds: ['run-a'] }), 1);
    expect(single.evidenceLabel).toBe('computed from 1 run');
    expect(single.evidenceRunCount).toBe(1);

    const multi = deriveEntryDisplay(makeEntry({ evidenceRunIds: ['run-a', 'run-b'] }), 1);
    expect(multi.evidenceLabel).toBe('computed from 2 runs');
  });

  it('marks a row with hasTimingData=false as de-emphasized with honest placeholder labels', () => {
    const row = deriveEntryDisplay(
      makeEntry({
        hasTimingData: false,
        aggregateTimeMs: 0,
        pctOfPortfolioTime: 0,
        topBottleneck: null,
        stepDurationRange: null,
        evidenceRunIds: [],
      }),
      3,
    );
    expect(row.deemphasized).toBe(true);
    expect(row.aggregateTimeLabel).toBe('—');
    expect(row.pctLabel).toBe('—');
    expect(row.barWidthPct).toBe(0);
    expect(row.evidenceLabel).toBe('no timing yet');
    expect(row.evidenceRunCount).toBe(0);
  });

  it('floors a tiny nonzero share to a minimum 1% bar width so it never renders invisibly', () => {
    const row = deriveEntryDisplay(makeEntry({ pctOfPortfolioTime: 0.2 }), 1);
    expect(row.barWidthPct).toBe(1);
  });

  it('never floors bar width when the entry has no timing data, even if pct is nonzero', () => {
    // Defensive case: pct should always be 0 alongside hasTimingData=false from
    // the engine, but the derivation must not fabricate a visible bar either way.
    const row = deriveEntryDisplay(makeEntry({ hasTimingData: false, pctOfPortfolioTime: 5 }), 1);
    expect(row.barWidthPct).toBe(0);
  });

  it('clamps an out-of-range pct into [0,100] defensively', () => {
    const over = deriveEntryDisplay(makeEntry({ pctOfPortfolioTime: 150 }), 1);
    expect(over.pctOfPortfolioTime).toBe(100);
    expect(over.barWidthPct).toBe(100);

    const under = deriveEntryDisplay(makeEntry({ pctOfPortfolioTime: -10 }), 1);
    expect(under.pctOfPortfolioTime).toBe(0);
  });

  it('pluralizes "run" in the runCount summary correctly at 1 vs N', () => {
    const one = deriveEntryDisplay(makeEntry({ runCount: 1 }), 1);
    expect(one.runCount).toBe(1);
    const many = deriveEntryDisplay(makeEntry({ runCount: 7 }), 1);
    expect(many.runCount).toBe(7);
  });
});

// ── deriveRankedEntryDisplays ──────────────────────────────────────────────────

describe('deriveRankedEntryDisplays', () => {
  it('preserves API sort order and assigns sequential 1-based ranks', () => {
    const ranked = [
      makeEntry({ workflowId: 'big', aggregateTimeMs: 50000 }),
      makeEntry({ workflowId: 'small', aggregateTimeMs: 10000 }),
      makeEntry({ workflowId: 'tiny', hasTimingData: false, aggregateTimeMs: 0 }),
    ];
    const rows = deriveRankedEntryDisplays(ranked);
    expect(rows.map((r) => r.workflowId)).toEqual(['big', 'small', 'tiny']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('returns an empty array for an empty ranked list', () => {
    expect(deriveRankedEntryDisplays([])).toEqual([]);
  });

  it('is a pure function of its input — repeat calls produce deep-equal output', () => {
    const ranked = [makeEntry()];
    const first = deriveRankedEntryDisplays(ranked);
    const second = deriveRankedEntryDisplays(ranked);
    expect(first).toEqual(second);
  });
});

// ── formatPlanName ─────────────────────────────────────────────────────────────

describe('formatPlanName', () => {
  it('title-cases a plan slug', () => {
    expect(formatPlanName('team')).toBe('Team');
    expect(formatPlanName('growth')).toBe('Growth');
    expect(formatPlanName('enterprise')).toBe('Enterprise');
  });

  it('falls back to an honest generic label when plan is undefined', () => {
    expect(formatPlanName(undefined)).toBe('a higher plan');
  });
});
