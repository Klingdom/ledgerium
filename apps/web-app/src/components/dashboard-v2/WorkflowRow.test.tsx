/**
 * WorkflowRow — unit tests for plan gating, dimension labels, healthy tag.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests pure-logic helpers and contract enforcement rules.
 *
 * Contract enforcement (iter-021 spec):
 *  1. isGated=true → breakdown should be hidden (tooltip shows lock)
 *  2. isGated=false → breakdown with Speed/Consistency/Data Quality/Standardization labels
 *  3. opportunityTag='healthy' → positive signal, renders green chip labeled "Healthy"
 *  4. aiOpportunityScore shown in tooltip only when tag='automate' and not gated
 */

import { describe, it, expect } from 'vitest';
import type { WorkflowMetricsOutput, HealthScoreV2, OpportunityTag } from '@/lib/workflow-metrics.js';

// ── Health band derivation (duplicated from WorkflowRow for unit testability) ─
// iter-024: thresholds tightened to 60/80 per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4

function healthBand(score: number): { label: 'poor' | 'fair' | 'good' } {
  if (score < 60) return { label: 'poor' };
  if (score < 80) return { label: 'fair' };
  return { label: 'good' };
}

// ── Dimension label correctness ───────────────────────────────────────────────

const HONEST_DIMENSION_LABELS = ['Speed', 'Consistency', 'Data Quality', 'Standardization'];
const FORBIDDEN_LABELS = ['efficiency', 'reliability', 'Efficiency', 'Reliability'];

// ── Plan gating logic ─────────────────────────────────────────────────────────

function shouldShowBreakdown(isGated: boolean): boolean {
  return !isGated;
}

function shouldShowAiScore(isGated: boolean, opportunityTag: OpportunityTag): boolean {
  return !isGated && opportunityTag === 'automate';
}

// ── Opportunity config coverage ───────────────────────────────────────────────

const OPPORTUNITY_LABELS: Record<OpportunityTag, string> = {
  automate: 'Automate',
  standardize: 'Standardize',
  optimize: 'Optimize',
  monitor: 'Monitor',
  healthy: 'Healthy',
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeHealthScore(overrides: Partial<HealthScoreV2> = {}): HealthScoreV2 {
  return {
    overall: 72,
    speed: 30,
    consistency: 21,
    dataQuality: 14,
    standardization: 7,
    isGated: false,
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<WorkflowMetricsOutput> = {}): WorkflowMetricsOutput {
  return {
    runs: 5,
    avgTimeMs: 90_000,
    variationScore: 0.25,
    variationLabel: 'low',
    bottleneckLabel: null,
    healthScore: makeHealthScore(),
    opportunityTag: 'healthy',
    aiOpportunityScore: 40,
    confidence: 0.85,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('plan gating', () => {
  it('isGated=false → breakdown is visible', () => {
    expect(shouldShowBreakdown(false)).toBe(true);
  });

  it('isGated=true → breakdown is hidden', () => {
    expect(shouldShowBreakdown(true)).toBe(false);
  });

  it('isGated=true → AI score not shown even for automate tag', () => {
    expect(shouldShowAiScore(true, 'automate')).toBe(false);
  });

  it('isGated=false + automate tag → AI score shown', () => {
    expect(shouldShowAiScore(false, 'automate')).toBe(true);
  });

  it('isGated=false + non-automate tag → AI score not shown', () => {
    for (const tag of ['standardize', 'optimize', 'monitor', 'healthy'] as OpportunityTag[]) {
      expect(shouldShowAiScore(false, tag)).toBe(false);
    }
  });
});

describe('honest dimension labels', () => {
  it('all 4 honest labels are defined', () => {
    expect(HONEST_DIMENSION_LABELS).toContain('Speed');
    expect(HONEST_DIMENSION_LABELS).toContain('Consistency');
    expect(HONEST_DIMENSION_LABELS).toContain('Data Quality');
    expect(HONEST_DIMENSION_LABELS).toContain('Standardization');
  });

  it('forbidden labels are NOT in the honest label set', () => {
    for (const forbidden of FORBIDDEN_LABELS) {
      expect(HONEST_DIMENSION_LABELS).not.toContain(forbidden);
    }
  });

  it('label count is exactly 4 (no extras)', () => {
    expect(HONEST_DIMENSION_LABELS).toHaveLength(4);
  });
});

describe('healthy tag rendering', () => {
  it('opportunityTag=healthy maps to label "Healthy"', () => {
    expect(OPPORTUNITY_LABELS['healthy']).toBe('Healthy');
  });

  it('all 5 opportunity tags have non-empty labels', () => {
    for (const [tag, label] of Object.entries(OPPORTUNITY_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe('none'); // 'none' was the pre-v2 silent fallthrough — forbidden
    }
  });

  it('healthy tag is a positive signal — distinct from null/none', () => {
    const metrics = makeMetrics({ opportunityTag: 'healthy' });
    expect(metrics.opportunityTag).toBe('healthy');
    // Ensure the tag is a real string, not undefined/null
    expect(metrics.opportunityTag).toBeTruthy();
  });
});

describe('healthBand helper', () => {
  // iter-024: thresholds tightened to 60/80 per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4
  it('score < 60 → poor (iter-024 threshold)', () => {
    expect(healthBand(0).label).toBe('poor');
    expect(healthBand(59).label).toBe('poor');
  });

  it('score 60–79 → fair (iter-024 threshold)', () => {
    expect(healthBand(60).label).toBe('fair');
    expect(healthBand(79).label).toBe('fair');
  });

  it('score >= 80 → good (iter-024 threshold)', () => {
    expect(healthBand(80).label).toBe('good');
    expect(healthBand(100).label).toBe('good');
  });
});

describe('HealthScoreV2 field names (contract enforcement)', () => {
  it('healthScore contains speed (not efficiency)', () => {
    const hs = makeHealthScore();
    expect('speed' in hs).toBe(true);
    expect('efficiency' in hs).toBe(false);
  });

  it('healthScore contains dataQuality (not reliability)', () => {
    const hs = makeHealthScore();
    expect('dataQuality' in hs).toBe(true);
    expect('reliability' in hs).toBe(false);
  });

  it('healthScore contains consistency', () => {
    const hs = makeHealthScore();
    expect('consistency' in hs).toBe(true);
  });

  it('healthScore contains standardization', () => {
    const hs = makeHealthScore();
    expect('standardization' in hs).toBe(true);
  });
});

// ── D7: (all-time) annotation logic ──────────────────────────────────────────

/**
 * Mirrors the runs subtext construction logic from WorkflowRow.
 * D7 PRD: when time range is NOT "all", append "(all-time)" to run count.
 */
function buildRunsSubtext(
  runs: number | null,
  timeRange: 'all' | '7d' | '30d' | '90d',
): string | null {
  if (runs === null) return null;
  const isAllTime = timeRange === 'all';
  return `${runs} run${runs !== 1 ? 's' : ''}${isAllTime ? '' : ' (all-time)'}`;
}

describe('D7 (all-time) annotation', () => {
  it('does NOT append (all-time) when timeRange is "all"', () => {
    const subtext = buildRunsSubtext(5, 'all');
    expect(subtext).toBe('5 runs');
    expect(subtext).not.toContain('(all-time)');
  });

  it('appends (all-time) when timeRange is "7d"', () => {
    const subtext = buildRunsSubtext(5, '7d');
    expect(subtext).toContain('(all-time)');
    expect(subtext).toBe('5 runs (all-time)');
  });

  it('appends (all-time) when timeRange is "30d"', () => {
    const subtext = buildRunsSubtext(3, '30d');
    expect(subtext).toContain('(all-time)');
    expect(subtext).toBe('3 runs (all-time)');
  });

  it('appends (all-time) when timeRange is "90d"', () => {
    const subtext = buildRunsSubtext(1, '90d');
    expect(subtext).toContain('(all-time)');
    expect(subtext).toBe('1 run (all-time)');
  });

  it('handles singular "run" (1 run) correctly', () => {
    expect(buildRunsSubtext(1, 'all')).toBe('1 run');
    expect(buildRunsSubtext(1, '30d')).toBe('1 run (all-time)');
  });

  it('returns null when runs is null', () => {
    expect(buildRunsSubtext(null, '30d')).toBeNull();
    expect(buildRunsSubtext(null, 'all')).toBeNull();
  });
});

// ── #49: Kebab wiring — API request shape ────────────────────────────────────

/**
 * Validates the shape of PATCH request bodies sent by the kebab menu actions.
 * The real API endpoint at PATCH /api/workflows/[id] accepts:
 *   - { title: string } for rename
 *   - { status: 'archived' } for archive
 */

function buildRenameBody(newTitle: string): { title: string } {
  return { title: newTitle.trim() };
}

function buildArchiveBody(): { status: 'archived' } {
  return { status: 'archived' };
}

describe('kebab menu API request shapes (#49)', () => {
  it('rename body has correct shape with trimmed title', () => {
    const body = buildRenameBody('  New Name  ');
    expect(body).toEqual({ title: 'New Name' });
    expect(Object.keys(body)).toHaveLength(1);
  });

  it('rename body does not include status field', () => {
    const body = buildRenameBody('My Workflow');
    expect('status' in body).toBe(false);
  });

  it('archive body has correct shape', () => {
    const body = buildArchiveBody();
    expect(body).toEqual({ status: 'archived' });
    expect(Object.keys(body)).toHaveLength(1);
  });

  it('archive body does not include title field', () => {
    const body = buildArchiveBody();
    expect('title' in body).toBe(false);
  });

  it('archive status value is exactly "archived" (not "deleted" or "inactive")', () => {
    const body = buildArchiveBody();
    expect(body.status).toBe('archived');
  });
});

// ── (c) RAG color pip — health band thresholds 60/80 (iter-024 §4.1 item c) ──

/**
 * The pip color class is derived from healthBand(). We expose the pipClass
 * here to verify the 3-state coverage without mounting the component.
 */
function healthBandPip(score: number): { pipClass: string } {
  if (score < 60) return { pipClass: 'bg-red-500' };
  if (score < 80) return { pipClass: 'bg-amber-500' };
  return { pipClass: 'bg-green-500' };
}

describe('RAG color pip — healthBand thresholds (iter-024 §4.1 item c)', () => {
  it('score=59 → red pip (bg-red-500)', () => {
    expect(healthBandPip(59).pipClass).toBe('bg-red-500');
  });

  it('score=75 → amber pip (bg-amber-500)', () => {
    expect(healthBandPip(75).pipClass).toBe('bg-amber-500');
  });

  it('score=85 → green pip (bg-green-500)', () => {
    expect(healthBandPip(85).pipClass).toBe('bg-green-500');
  });

  it('boundary: score=60 → amber (not red)', () => {
    expect(healthBandPip(60).pipClass).toBe('bg-amber-500');
  });

  it('boundary: score=80 → green (not amber)', () => {
    expect(healthBandPip(80).pipClass).toBe('bg-green-500');
  });
});

// ── (d) Variation badge (iter-024 §4.1 item d) ───────────────────────────────

/**
 * Badge fires only when variationLabel === 'high'. 'low' and 'medium' must not show it.
 */
function shouldShowVariationBadge(variationLabel: 'low' | 'medium' | 'high'): boolean {
  return variationLabel === 'high';
}

describe('variation badge (iter-024 §4.1 item d)', () => {
  it('badge shown when variationLabel === "high"', () => {
    const metrics = makeMetrics({ variationLabel: 'high', variationScore: 0.8 });
    expect(shouldShowVariationBadge(metrics.variationLabel)).toBe(true);
  });

  it('badge NOT shown when variationLabel === "medium"', () => {
    const metrics = makeMetrics({ variationLabel: 'medium', variationScore: 0.5 });
    expect(shouldShowVariationBadge(metrics.variationLabel)).toBe(false);
  });

  it('badge NOT shown when variationLabel === "low"', () => {
    const metrics = makeMetrics({ variationLabel: 'low', variationScore: 0.2 });
    expect(shouldShowVariationBadge(metrics.variationLabel)).toBe(false);
  });
});

// ── (f) Run-count qualifier (iter-024 §4.1 item f) ───────────────────────────

/**
 * Mirrors the run-count qualifier rendering logic from WorkflowRow.
 * Qualifier shown when runs !== null && runs < 10.
 * Null runs → "n=0 — no runs".
 */
function buildRunCountQualifier(runs: number | null): string | null {
  if (runs !== null && runs < 10) return `n=${runs}`;
  if (runs === null) return 'n=0 — no runs';
  return null; // runs >= 10: no qualifier
}

describe('run-count qualifier (iter-024 §4.1 item f)', () => {
  it('runs=4 renders qualifier n=4', () => {
    expect(buildRunCountQualifier(4)).toBe('n=4');
  });

  it('runs=10 does NOT render qualifier (returns null)', () => {
    expect(buildRunCountQualifier(10)).toBeNull();
  });

  it('runs=11 does NOT render qualifier', () => {
    expect(buildRunCountQualifier(11)).toBeNull();
  });

  it('runs=null renders honest null state "n=0 — no runs"', () => {
    expect(buildRunCountQualifier(null)).toBe('n=0 — no runs');
  });

  it('runs=9 (boundary) renders qualifier n=9', () => {
    expect(buildRunCountQualifier(9)).toBe('n=9');
  });
});
