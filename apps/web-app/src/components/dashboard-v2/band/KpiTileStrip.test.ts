/**
 * KpiTileStrip — atglance-review #2 + #6 + SIGNALS #4 contract tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. KpiTileStrip is a
 * presentational component with no exported pure helper, so these tests pin the
 * KpiTileData CONTRACT (compile-time) and the honesty rules that drive the tile
 * set: the health score number is NOT part of the KPI strip data (item #2 —
 * "kill the triple-88"); a provenance/units field exists for every tile (item
 * #6); and the SIGNALS #4 strip composition is Total · Cycle · Automation ·
 * High-Variance (Distinct Systems DEMOTED to the Tier-2 facts row so nothing is
 * shown twice). The narrator/gauge/opportunity helpers are covered separately.
 *
 * @atglance-review #2 (kill triple-88) / #6 (honest provenance) / SIGNALS #4
 */

import { describe, it, expect } from 'vitest';
import type { KpiTileData } from './KpiTileStrip';
import { buildHighVarianceTileState } from '@/lib/dashboard-band-stats';

// ── #2 + #4: the KPI strip carries no health SCORE and no distinct-systems ────
//
// Compile-time contract: KpiTileData has NO avgHealthScore / avgHealthScoreDelta
// fields (item #2) and NO distinctSystemCount (SIGNALS #4 demoted it to the
// Tier-2 facts row). It DOES carry the honest High-Variance tile state. If a
// future edit re-adds the removed fields, this object literal stops type-checking
// (excess-property check) and `pnpm typecheck` fails — the structural guard.

describe('KpiTileData: post-#2/#4 strip composition', () => {
  it('constructs with the High-Variance tile state (and no health/distinct-systems fields)', () => {
    const data: KpiTileData = {
      totalWorkflows: 16,
      recordedThisMonth: 3,
      medianCycleTimeMs: 272_000,
      cycleTimeSampleCount: 9,
      automationCandidates: 4,
      highVariance: buildHighVarianceTileState(3, 12),
    };
    expect(data.highVariance.available).toBe(true);
    expect(data.highVariance.count).toBe(3);
    expect(data.highVariance.multiRunCount).toBe(12);
    // The strip carries no health score and no distinct-systems (would be a type
    // error if it did — these now live in the gauge + the Tier-2 facts row).
    expect('avgHealthScore' in data).toBe(false);
    expect('avgHealthScoreDelta' in data).toBe(false);
    expect('distinctSystemCount' in data).toBe(false);
  });

  it('High-Variance tile carries an HONEST empty state when no multi-run workflows (K==0)', () => {
    const data: KpiTileData = {
      totalWorkflows: 1,
      recordedThisMonth: 0,
      medianCycleTimeMs: null,
      cycleTimeSampleCount: 0,
      automationCandidates: 0,
      // Zero multi-run workflows → not available → the tile must render "—"/"needs ≥2 runs".
      highVariance: buildHighVarianceTileState(0, 0),
    };
    expect(data.highVariance.available).toBe(false);
    expect(data.highVariance.count).toBe(0);
    expect(data.highVariance.multiRunCount).toBe(0);
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
  high_variance:
    'Workflows with high run-to-run variation — a consistency proxy, not a defect rate. Counted only across multi-run workflows (variation needs ≥2 runs). The standardize signal.',
} as const;

describe('atglance-review #6 / SIGNALS #4: KPI provenance is definitions/units only', () => {
  it('cycle-time provenance discloses the honest denominator + "not a target"', () => {
    expect(PROVENANCE.cycle_time).toContain('only the timed workflows');
    expect(PROVENANCE.cycle_time).toContain('not a target');
  });

  it('automation-candidates provenance labels candidacy, not ROI', () => {
    expect(PROVENANCE.automation_candidates).toContain('candidacy signal');
    expect(PROVENANCE.automation_candidates).toContain('not an ROI');
  });

  it('high-variance provenance labels the PROXY nature + the multi-run gate', () => {
    expect(PROVENANCE.high_variance.toLowerCase()).toContain('proxy');
    expect(PROVENANCE.high_variance.toLowerCase()).toContain('not a defect rate');
    expect(PROVENANCE.high_variance).toContain('≥2 runs');
  });

  it('no provenance string fabricates a benchmark / sigma / DPMO / CV / savings target', () => {
    for (const text of Object.values(PROVENANCE)) {
      const lc = text.toLowerCase();
      for (const forbidden of ['benchmark', 'sigma', 'dpmo', ' cv', 'industry average', 'savings of']) {
        expect(lc).not.toContain(forbidden);
      }
    }
  });
});
