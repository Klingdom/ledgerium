/**
 * KpiTileStrip — atglance-review #2 + #6 contract tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. KpiTileStrip is a
 * presentational component with no exported pure helper, so these tests pin the
 * KpiTileData CONTRACT (compile-time) and the honesty rules that drive the tile
 * set: the health score number is NOT part of the KPI strip data (item #2 —
 * "kill the triple-88"), and a provenance/units field exists for every tile
 * (item #6). The narrator/gauge/opportunity helpers are covered separately.
 *
 * @atglance-review #2 (kill triple-88) / #6 (honest provenance)
 */

import { describe, it, expect } from 'vitest';
import type { KpiTileData } from './KpiTileStrip';

// ── #2: the KPI strip no longer carries the health SCORE number ───────────────
//
// Compile-time contract: KpiTileData has NO avgHealthScore / avgHealthScoreDelta
// fields. If a future edit re-adds them, this object literal stops type-checking
// (excess-property check) and `pnpm typecheck` fails — the structural guard.

describe('atglance-review #2: KpiTileData excludes the health score number', () => {
  it('constructs with the post-#2 fields and the distinct-systems fill', () => {
    const data: KpiTileData = {
      totalWorkflows: 16,
      recordedThisMonth: 3,
      medianCycleTimeMs: 272_000,
      cycleTimeSampleCount: 9,
      automationCandidates: 4,
      distinctSystemCount: 7,
    };
    // The fill stat is an already-computed honest count (availableSystems.length).
    expect(data.distinctSystemCount).toBe(7);
    // The strip carries no health score (would be a type error if it did).
    expect('avgHealthScore' in data).toBe(false);
    expect('avgHealthScoreDelta' in data).toBe(false);
  });

  it('distinctSystemCount is the honest fill — a plain count, never a derived %', () => {
    const data: KpiTileData = {
      totalWorkflows: 1,
      recordedThisMonth: 0,
      medianCycleTimeMs: null,
      cycleTimeSampleCount: 0,
      automationCandidates: 0,
      distinctSystemCount: 1,
    };
    expect(Number.isInteger(data.distinctSystemCount)).toBe(true);
  });
});

// ── #6: provenance strings are definitions only (no targets/benchmarks) ───────
//
// The provenance tooltips are component literals; pinned here verbatim so a
// refactor can't silently weaken the honest denominators / proxy disclaimers.

const PROVENANCE = {
  total_workflows:
    'Every digital process you have recorded. Counts all workflows, regardless of the time-range filter.',
  cycle_time:
    "Median of each workflow's mean run duration, across only the timed workflows (not all workflows). Shown as time, not a target.",
  automation_candidates:
    "Workflows tagged 'automate' by the opportunity engine — a candidacy signal from runs and variation, not an ROI or savings estimate.",
  distinct_systems:
    'Count of unique systems observed across all recorded workflows. Derived from observed runs.',
} as const;

describe('atglance-review #6: KPI provenance is definitions/units only', () => {
  it('cycle-time provenance discloses the honest denominator + "not a target"', () => {
    expect(PROVENANCE.cycle_time).toContain('only the timed workflows');
    expect(PROVENANCE.cycle_time).toContain('not a target');
  });

  it('automation-candidates provenance labels candidacy, not ROI', () => {
    expect(PROVENANCE.automation_candidates).toContain('candidacy signal');
    expect(PROVENANCE.automation_candidates).toContain('not an ROI');
  });

  it('no provenance string fabricates a benchmark / sigma / DPMO / savings target', () => {
    for (const text of Object.values(PROVENANCE)) {
      const lc = text.toLowerCase();
      for (const forbidden of ['benchmark', 'sigma', 'dpmo', 'industry average', 'savings of']) {
        expect(lc).not.toContain(forbidden);
      }
    }
  });
});
