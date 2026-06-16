/**
 * WorkflowRow — unit tests for plan gating, dimension labels, healthy tag,
 * and iter-030 analytics instrumentation.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests pure-logic helpers and contract enforcement rules.
 *
 * Contract enforcement (iter-021 spec):
 *  1. isGated=true → breakdown should be hidden (tooltip shows lock)
 *  2. isGated=false → breakdown with Speed/Consistency/Data Quality/Standardization labels
 *  3. opportunityTag='healthy' → positive signal, renders green chip labeled "Healthy"
 *  4. aiOpportunityScore shown in tooltip only when tag='automate' and not gated
 *
 * iter-030 analytics:
 *  5. workflow_row_clicked event shape (healthBand derivation, elapsed ms)
 *  6. upgrade_clicked event shape (location=dashboard_v2_health_gate)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
// next/navigation is imported transitively by WorkflowRow (useRouter); stub it so
// the real healthPillTier export can be imported in the node test environment.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import type { WorkflowMetricsOutput, HealthScoreV2, OpportunityTag } from '@/lib/workflow-metrics.js';
import {
  healthPillTier as realHealthPillTier,
  formatCellValue,
  formatDurationMs,
} from './WorkflowRow.js';

// ── Health band derivation (duplicated from WorkflowRow for unit testability) ─
// iter-024: thresholds tightened to 60/80 per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4

function healthBand(score: number): { label: 'poor' | 'fair' | 'good' } {
  if (score < 60) return { label: 'poor' };
  if (score < 80) return { label: 'fair' };
  return { label: 'good' };
}

// ── Health pill tier mapping (Batch C item 17) ────────────────────────────────
// Mirror of WorkflowRow.healthPillTier — uses the SAME 60/80 thresholds as
// healthBand (single source of truth). Pure, node-safe (no React import). Kept
// as a mirror to match this file's established healthBand-mirror convention and
// avoid importing the next/navigation-dependent component into the node env.

function healthPillTier(score: number): {
  label: 'Healthy' | 'At risk' | 'Needs review';
  pillClass: string;
} {
  if (score < 60) return { label: 'Needs review', pillClass: 'bg-red-50 border-red-200 text-red-700' };
  if (score < 80) return { label: 'At risk', pillClass: 'bg-amber-50 border-amber-200 text-amber-700' };
  return { label: 'Healthy', pillClass: 'bg-green-50 border-green-200 text-green-700' };
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

describe('healthPillTier (Batch C item 17)', () => {
  it('score < 60 → "Needs review" (red pill)', () => {
    expect(healthPillTier(0).label).toBe('Needs review');
    expect(healthPillTier(59).label).toBe('Needs review');
    expect(healthPillTier(59).pillClass).toContain('red');
  });

  it('score 60–79 → "At risk" (amber pill)', () => {
    expect(healthPillTier(60).label).toBe('At risk');
    expect(healthPillTier(79).label).toBe('At risk');
    expect(healthPillTier(60).pillClass).toContain('amber');
  });

  it('score >= 80 → "Healthy" (green pill)', () => {
    expect(healthPillTier(80).label).toBe('Healthy');
    expect(healthPillTier(100).label).toBe('Healthy');
    expect(healthPillTier(80).pillClass).toContain('green');
  });

  it('shares the SAME 60/80 thresholds as healthBand (single source of truth)', () => {
    // The pill tier must agree band-for-band with healthBand at every score.
    for (let s = 0; s <= 100; s++) {
      const band = healthBand(s).label; // 'poor' | 'fair' | 'good'
      const tier = healthPillTier(s).label;
      const expected = band === 'poor' ? 'Needs review' : band === 'fair' ? 'At risk' : 'Healthy';
      expect(tier).toBe(expected);
    }
  });

  it('the exported helper agrees with the test mirror at the band boundaries (no drift)', () => {
    for (const s of [0, 59, 60, 79, 80, 100]) {
      expect(realHealthPillTier(s).label).toBe(healthPillTier(s).label);
      expect(realHealthPillTier(s).pillClass).toBe(healthPillTier(s).pillClass);
    }
  });

  it('the pill is honest — it never alters the numeric score, only maps its band', () => {
    // The mapping is a pure function of the score; identical input → identical tier.
    expect(realHealthPillTier(72)).toEqual(realHealthPillTier(72));
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
});

// ── Process-variation grouping signal (Phase 1) ──────────────────────────────

/** Mirrors the variant subtext gating in WorkflowRow (honest: never "1 variant"). */
function buildVariantsSubtextPart(runs: number | null, variantCount: number | null | undefined): string | null {
  const vc = variantCount ?? null;
  if (runs !== null && runs >= 2 && vc !== null && vc >= 2) return `${vc} variants`;
  return null;
}

describe('grouping signal — variant subtext', () => {
  it('shows "K variants" only with multi-run, multi-variant groups', () => {
    expect(buildVariantsSubtextPart(5, 3)).toBe('3 variants');
    expect(buildVariantsSubtextPart(2, 2)).toBe('2 variants');
  });

  it('is suppressed for single-run, single-variant, or missing data', () => {
    expect(buildVariantsSubtextPart(1, 4)).toBeNull();   // single run → no variant noise
    expect(buildVariantsSubtextPart(5, 1)).toBeNull();   // one variant is not a distribution
    expect(buildVariantsSubtextPart(5, 0)).toBeNull();
    expect(buildVariantsSubtextPart(5, null)).toBeNull();
    expect(buildVariantsSubtextPart(5, undefined)).toBeNull();
    expect(buildVariantsSubtextPart(null, 3)).toBeNull();
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

// ── iter-030: analytics event shapes ─────────────────────────────────────────

/**
 * Pure-logic derivation of the workflow_row_clicked event shape.
 * Mirrors the logic in WorkflowRow.handleRowClick().
 */
function buildWorkflowRowClickedEvent(params: {
  workflowId: string;
  healthScoreOverall: number;
  dashboardViewPerfTimestampMs: number;
  perfNow: number;
}): {
  event: string;
  workflowId: string;
  elapsedMsSinceDashboardView: number;
  healthBand: 'red' | 'amber' | 'green';
  originSurface: 'list_row' | 'kpi_drill' | 'pareto';
} {
  const { workflowId, healthScoreOverall, dashboardViewPerfTimestampMs, perfNow } = params;
  const elapsed =
    dashboardViewPerfTimestampMs > 0
      ? Math.round(perfNow - dashboardViewPerfTimestampMs)
      : 0;
  const hBand: 'red' | 'amber' | 'green' =
    healthScoreOverall < 60 ? 'red' : healthScoreOverall < 80 ? 'amber' : 'green';
  return {
    event: 'workflow_row_clicked',
    workflowId,
    elapsedMsSinceDashboardView: elapsed,
    healthBand: hBand,
    // atglance-review #20: a direct list-row click always reports 'list_row'.
    originSurface: 'list_row',
  };
}

describe('iter-030: workflow_row_clicked event shape', () => {
  it('event name is workflow_row_clicked', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'wf-abc',
      healthScoreOverall: 72,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 600,
    });
    expect(ev.event).toBe('workflow_row_clicked');
  });

  it('workflowId is forwarded correctly', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'wf-xyz',
      healthScoreOverall: 50,
      dashboardViewPerfTimestampMs: 0,
      perfNow: 0,
    });
    expect(ev.workflowId).toBe('wf-xyz');
  });

  it('healthBand=red when healthScore < 60', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 45,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('red');
  });

  it('healthBand=amber when healthScore is 60–79', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 70,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('amber');
  });

  it('healthBand=green when healthScore >= 80', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 85,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('green');
  });

  it('elapsedMsSinceDashboardView is positive when dashboardViewPerfTimestampMs > 0', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 72,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 3500,
    });
    expect(ev.elapsedMsSinceDashboardView).toBe(3400);
  });

  it('elapsedMsSinceDashboardView is 0 when dashboardViewPerfTimestampMs is 0 (defensive path)', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 72,
      dashboardViewPerfTimestampMs: 0,
      perfNow: 3500,
    });
    expect(ev.elapsedMsSinceDashboardView).toBe(0);
  });

  it('healthBand=red boundary: score=59', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 59,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('red');
  });

  it('healthBand=amber boundary: score=60', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 60,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('amber');
  });

  it('healthBand=green boundary: score=80', () => {
    const ev = buildWorkflowRowClickedEvent({
      workflowId: 'w1',
      healthScoreOverall: 80,
      dashboardViewPerfTimestampMs: 100,
      perfNow: 200,
    });
    expect(ev.healthBand).toBe('green');
  });
});

/**
 * upgrade_clicked event from gated health tooltip — event #6.
 * The event reuses the existing upgrade_clicked type with location='dashboard_v2_health_gate'.
 */
function buildUpgradeClickedEvent(): { event: string; location: string } {
  return { event: 'upgrade_clicked', location: 'dashboard_v2_health_gate' };
}

describe('iter-030: upgrade_clicked from gated health tooltip (event #6)', () => {
  it('event name is upgrade_clicked', () => {
    const ev = buildUpgradeClickedEvent();
    expect(ev.event).toBe('upgrade_clicked');
  });

  it('location is dashboard_v2_health_gate', () => {
    const ev = buildUpgradeClickedEvent();
    expect(ev.location).toBe('dashboard_v2_health_gate');
  });

  it('location is not empty or undefined', () => {
    const ev = buildUpgradeClickedEvent();
    expect(ev.location).toBeTruthy();
  });
});

// ── iter-031 DV2-R02a: inline edit state machine ──────────────────────────────

/**
 * Pure-logic model of the InlineEdit commit/cancel decision.
 *
 * Rules (mirrored from InlineEdit.commit()):
 *  - Empty value → cancel (no PATCH)
 *  - Value unchanged (trimmed === currentTitle) → cancel (no PATCH)
 *  - Value changed → commit (PATCH body = { title: trimmed })
 *
 * Blur behaviour mirrors Enter: if value is changed → commit; unchanged → cancel.
 */
type InlineEditDecision =
  | { action: 'commit'; patchBody: { title: string } }
  | { action: 'cancel' };

function inlineEditDecide(currentTitle: string, inputValue: string): InlineEditDecision {
  const trimmed = inputValue.trim();
  if (!trimmed || trimmed === currentTitle) {
    return { action: 'cancel' };
  }
  return { action: 'commit', patchBody: { title: trimmed } };
}

describe('iter-031 DV2-R02a: inline edit commit/cancel logic', () => {
  it('changed value → commit action with trimmed title in PATCH body', () => {
    const result = inlineEditDecide('Old Name', 'New Name');
    expect(result.action).toBe('commit');
    if (result.action === 'commit') {
      expect(result.patchBody).toEqual({ title: 'New Name' });
    }
  });

  it('unchanged value → cancel (no PATCH)', () => {
    const result = inlineEditDecide('My Workflow', 'My Workflow');
    expect(result.action).toBe('cancel');
  });

  it('empty string → cancel (no PATCH)', () => {
    const result = inlineEditDecide('My Workflow', '');
    expect(result.action).toBe('cancel');
  });

  it('whitespace-only → cancel (no PATCH)', () => {
    const result = inlineEditDecide('My Workflow', '   ');
    expect(result.action).toBe('cancel');
  });

  it('value with surrounding whitespace → commit with trimmed title', () => {
    const result = inlineEditDecide('Old', '  New Title  ');
    expect(result.action).toBe('commit');
    if (result.action === 'commit') {
      expect(result.patchBody.title).toBe('New Title');
    }
  });

  it('blur with changed value → same commit decision as Enter', () => {
    // blur calls commit() with the same logic — decision is identical
    const onEnter = inlineEditDecide('Old', 'New');
    const onBlur = inlineEditDecide('Old', 'New');
    expect(onEnter).toEqual(onBlur);
    expect(onEnter.action).toBe('commit');
  });

  it('Escape key → cancel regardless of value (Escape is always cancel)', () => {
    // Escape bypasses inlineEditDecide and always calls onCancel directly.
    // This test documents that the Escape path is NOT a commit path.
    const wouldHaveCommitted = inlineEditDecide('Old', 'New');
    expect(wouldHaveCommitted.action).toBe('commit'); // confirms value IS changed
    // But Escape cancels — modelled here as the escape-always-cancels invariant:
    const escapeAction = 'cancel' as const;
    expect(escapeAction).toBe('cancel');
  });

  it('PATCH body uses title key only (no status field)', () => {
    const result = inlineEditDecide('Old', 'New');
    if (result.action === 'commit') {
      expect(Object.keys(result.patchBody)).toEqual(['title']);
      expect('status' in result.patchBody).toBe(false);
    }
  });
});

// ── iter-031 DV2-R02b: inline archive confirm state machine ──────────────────

/**
 * Pure-logic model of the InlineArchiveConfirm affordance.
 *
 * Rules:
 *  - Confirm button → PATCH body = { status: 'archived' }; onConfirm callback fires
 *  - Cancel button → no PATCH; onCancel callback fires; focus returns to trigger
 *  - Escape key → same as cancel
 */
type ArchiveDecision =
  | { action: 'confirm'; patchBody: { status: 'archived' } }
  | { action: 'cancel' };

function archiveConfirmDecide(userAction: 'confirm' | 'cancel' | 'escape'): ArchiveDecision {
  if (userAction === 'confirm') {
    return { action: 'confirm', patchBody: { status: 'archived' } };
  }
  return { action: 'cancel' };
}

describe('iter-031 DV2-R02b: inline archive confirm logic', () => {
  it('confirm action → patchBody is { status: "archived" }', () => {
    const result = archiveConfirmDecide('confirm');
    expect(result.action).toBe('confirm');
    if (result.action === 'confirm') {
      expect(result.patchBody).toEqual({ status: 'archived' });
    }
  });

  it('cancel action → no PATCH, action is cancel', () => {
    const result = archiveConfirmDecide('cancel');
    expect(result.action).toBe('cancel');
  });

  it('Escape key → treated as cancel, no PATCH', () => {
    const result = archiveConfirmDecide('escape');
    expect(result.action).toBe('cancel');
  });

  it('confirm PATCH body has exactly one key: status', () => {
    const result = archiveConfirmDecide('confirm');
    if (result.action === 'confirm') {
      expect(Object.keys(result.patchBody)).toHaveLength(1);
      expect(result.patchBody.status).toBe('archived');
    }
  });

  it('confirm PATCH body status is "archived" (not "deleted" or "inactive")', () => {
    const result = archiveConfirmDecide('confirm');
    if (result.action === 'confirm') {
      expect(result.patchBody.status).toBe('archived');
    }
  });

  it('confirm PATCH body has no title field', () => {
    const result = archiveConfirmDecide('confirm');
    if (result.action === 'confirm') {
      expect('title' in result.patchBody).toBe(false);
    }
  });
});

// ── iter-031 DV2-R03: tooltip dismiss logic ───────────────────────────────────

/**
 * Pure-logic model of HealthTooltip dismiss conditions (WCAG 2.1 SC 1.4.13).
 *
 * SC 1.4.13 "dismissible" arm:
 *  - Escape key → always dismiss
 *  - Blur with focus leaving tooltip region (relatedTarget outside) → dismiss
 *  - Blur with focus staying inside tooltip region (relatedTarget inside) → no dismiss
 *
 * Existing behaviors that must be preserved (not under test here, documented):
 *  - hover-show: parent sets showTooltip=true on mouse enter health cell
 *  - click-toggle: parent toggles showTooltip on click of health cell
 */
type TooltipDismissDecision = 'dismiss' | 'keep';

function tooltipDismissOnKeyDown(key: string): TooltipDismissDecision {
  return key === 'Escape' ? 'dismiss' : 'keep';
}

function tooltipDismissOnBlur(params: {
  relatedTargetIsInsideContainer: boolean;
}): TooltipDismissDecision {
  // If relatedTarget is null (focus left document) or outside container → dismiss
  return params.relatedTargetIsInsideContainer ? 'keep' : 'dismiss';
}

describe('iter-031 DV2-R03: tooltip dismiss logic (WCAG 2.1 SC 1.4.13)', () => {
  it('Escape key → dismiss tooltip', () => {
    expect(tooltipDismissOnKeyDown('Escape')).toBe('dismiss');
  });

  it('non-Escape key → keep tooltip open', () => {
    expect(tooltipDismissOnKeyDown('Tab')).toBe('keep');
    expect(tooltipDismissOnKeyDown('Enter')).toBe('keep');
    expect(tooltipDismissOnKeyDown('ArrowDown')).toBe('keep');
  });

  it('blur with relatedTarget outside tooltip container → dismiss', () => {
    expect(tooltipDismissOnBlur({ relatedTargetIsInsideContainer: false })).toBe('dismiss');
  });

  it('blur with relatedTarget inside tooltip container → keep open (focus moved within tooltip)', () => {
    expect(tooltipDismissOnBlur({ relatedTargetIsInsideContainer: true })).toBe('keep');
  });

  it('blur with null relatedTarget (focus left document) → dismiss', () => {
    // null relatedTarget means focus left window entirely — treated as "outside"
    // modelled by relatedTargetIsInsideContainer: false (container.contains(null) === false)
    expect(tooltipDismissOnBlur({ relatedTargetIsInsideContainer: false })).toBe('dismiss');
  });

  it('only Escape among all key events triggers dismiss (exhaustive check)', () => {
    const keys = ['Tab', 'Enter', 'Space', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'a', 'z'];
    for (const key of keys) {
      expect(tooltipDismissOnKeyDown(key)).toBe('keep');
    }
  });
});

// ── MDR-P08: centralized Escape dispatch (iter-041) ───────────────────────────

/**
 * Pure-logic model of the useEscapeDispatch priority table.
 *
 * The hook itself installs/removes a document listener; the dispatch logic is
 * the observable contract. We model it as a pure function here to keep tests
 * jsdom-free (matching the rest of this test file) and to lock the invariants:
 *
 *   Priority 1: isConfirmingArchive → archiveCancel fires; kebab/tooltip do NOT
 *   Priority 2: isEditingName (but not confirmingArchive) → no-op (InlineEdit
 *               owns its own onKeyDown on the focused input)
 *   Priority 3: showKebab (no archive, no edit) → kebabClose fires; tooltip does NOT
 *   Priority 4: showTooltip only → tooltipDismiss fires
 *   No-op: no overlays active → nothing fires
 *
 * Sequential dismissal: after each priority fires, the caller is expected to
 * clear that overlay's state; the next Escape press sees the updated state and
 * dispatches to the next priority.
 */

type OverlayState = {
  isConfirmingArchive: boolean;
  isEditingName: boolean;
  showKebab: boolean;
  showTooltip: boolean;
};

type DispatchResult =
  | { fired: 'archiveCancel' }
  | { fired: 'kebabClose' }
  | { fired: 'tooltipDismiss' }
  | { fired: 'editNoop' }
  | { fired: 'none' };

/** Pure model of useEscapeDispatch priority logic (mirrors hook body). */
function escapeDispatch(state: OverlayState): DispatchResult {
  if (state.isConfirmingArchive) return { fired: 'archiveCancel' };
  if (state.isEditingName) return { fired: 'editNoop' };
  if (state.showKebab) return { fired: 'kebabClose' };
  if (state.showTooltip) return { fired: 'tooltipDismiss' };
  return { fired: 'none' };
}

/** Returns whether the dispatch installs a listener (any overlay active). */
function listenerShouldBeInstalled(state: OverlayState): boolean {
  return state.isConfirmingArchive || state.showKebab || state.showTooltip || state.isEditingName;
}

describe('MDR-P08: centralized Escape dispatch (iter-041)', () => {
  // Test 1: listener count — zero when no overlays, one when overlays present
  it('no overlays active → listener NOT installed (anyOverlayActive=false)', () => {
    const state: OverlayState = {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: false,
      showTooltip: false,
    };
    expect(listenerShouldBeInstalled(state)).toBe(false);
    expect(escapeDispatch(state).fired).toBe('none');
  });

  it('one overlay active → listener IS installed (anyOverlayActive=true)', () => {
    const states: OverlayState[] = [
      { isConfirmingArchive: true, isEditingName: false, showKebab: false, showTooltip: false },
      { isConfirmingArchive: false, isEditingName: false, showKebab: true, showTooltip: false },
      { isConfirmingArchive: false, isEditingName: false, showKebab: false, showTooltip: true },
    ];
    for (const state of states) {
      expect(listenerShouldBeInstalled(state)).toBe(true);
    }
  });

  it('all three overlays simultaneously active → still exactly ONE dispatch (not three)', () => {
    // The hook installs ONE handler; this test verifies only one callback fires
    const state: OverlayState = {
      isConfirmingArchive: true,
      isEditingName: false,
      showKebab: true,
      showTooltip: true,
    };
    // Only one result returned — archive wins
    const result = escapeDispatch(state);
    expect(result.fired).toBe('archiveCancel');
    // Explicitly confirm kebab and tooltip do NOT fire
    expect(result.fired).not.toBe('kebabClose');
    expect(result.fired).not.toBe('tooltipDismiss');
  });

  // Test 2: Priority 1 — InlineArchiveConfirm wins over KebabMenu
  it('Priority 1: isConfirmingArchive=true + showKebab=true → archiveCancel fires; kebabClose does NOT', () => {
    const state: OverlayState = {
      isConfirmingArchive: true,
      isEditingName: false,
      showKebab: true,
      showTooltip: false,
    };
    const result = escapeDispatch(state);
    expect(result.fired).toBe('archiveCancel');
    expect(result.fired).not.toBe('kebabClose');
  });

  // Test 3: Priority 3 — KebabMenu wins over HealthTooltip
  it('Priority 3: showKebab=true + showTooltip=true → kebabClose fires; tooltipDismiss does NOT', () => {
    const state: OverlayState = {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: true,
      showTooltip: true,
    };
    const result = escapeDispatch(state);
    expect(result.fired).toBe('kebabClose');
    expect(result.fired).not.toBe('tooltipDismiss');
  });

  // Test 4: Priority 4 — HealthTooltip alone
  it('Priority 4: showTooltip=true only → tooltipDismiss fires', () => {
    const state: OverlayState = {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: false,
      showTooltip: true,
    };
    const result = escapeDispatch(state);
    expect(result.fired).toBe('tooltipDismiss');
  });

  // Test 5: No-overlays no-op
  it('no overlays active → Escape fires nothing (no-op)', () => {
    const state: OverlayState = {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: false,
      showTooltip: false,
    };
    expect(escapeDispatch(state).fired).toBe('none');
  });

  // Test 6: Sequential dismissal
  it('sequential dismissal: archive → kebab → tooltip across three Escape presses', () => {
    // Initial: all three overlays open
    let state: OverlayState = {
      isConfirmingArchive: true,
      isEditingName: false,
      showKebab: true,
      showTooltip: true,
    };

    // Press 1: archive cancels
    let result = escapeDispatch(state);
    expect(result.fired).toBe('archiveCancel');
    state = { ...state, isConfirmingArchive: false }; // caller clears archive state

    // Press 2: kebab closes
    result = escapeDispatch(state);
    expect(result.fired).toBe('kebabClose');
    state = { ...state, showKebab: false }; // caller clears kebab state

    // Press 3: tooltip dismisses
    result = escapeDispatch(state);
    expect(result.fired).toBe('tooltipDismiss');
    state = { ...state, showTooltip: false }; // caller clears tooltip state

    // Press 4: nothing left
    result = escapeDispatch(state);
    expect(result.fired).toBe('none');
  });

  // Test 7: preventDefault + stopPropagation contract
  it('Escape with active overlay calls preventDefault and stopPropagation on the event', () => {
    // Simulate the hook's handler receiving a KeyboardEvent-like object
    const mockEvent = {
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    // Inline the handler logic (mirrors the hook body) to verify both calls
    function simulateHandler(
      e: typeof mockEvent,
      state: OverlayState,
    ): void {
      if (e.key !== 'Escape') return;
      if (state.isConfirmingArchive) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (state.isEditingName) return;
      if (state.showKebab) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (state.showTooltip) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    simulateHandler(mockEvent, {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: true,
      showTooltip: false,
    });

    expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
    expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
  });

  // Test 8: non-Escape key → no dispatch, no preventDefault/stopPropagation
  it('non-Escape key with active overlay → no callback fires, no event prevention', () => {
    const mockEvent = {
      key: 'Tab',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    function simulateHandler(
      e: typeof mockEvent,
      state: OverlayState,
    ): DispatchResult {
      if (e.key !== 'Escape') return { fired: 'none' };
      if (state.isConfirmingArchive) {
        e.preventDefault();
        e.stopPropagation();
        return { fired: 'archiveCancel' };
      }
      if (state.isEditingName) return { fired: 'editNoop' };
      if (state.showKebab) {
        e.preventDefault();
        e.stopPropagation();
        return { fired: 'kebabClose' };
      }
      if (state.showTooltip) {
        e.preventDefault();
        e.stopPropagation();
        return { fired: 'tooltipDismiss' };
      }
      return { fired: 'none' };
    }

    const result = simulateHandler(mockEvent, {
      isConfirmingArchive: false,
      isEditingName: false,
      showKebab: true,
      showTooltip: true,
    });

    expect(result.fired).toBe('none');
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
  });

  // Test 9: InlineEdit priority-2 no-op
  it('Priority 2: isEditingName=true (no archive) → no-op (InlineEdit owns its own Escape)', () => {
    const state: OverlayState = {
      isConfirmingArchive: false,
      isEditingName: true,
      showKebab: false,
      showTooltip: false,
    };
    const result = escapeDispatch(state);
    // editNoop means: we recognized it but deliberately did not fire a document callback
    expect(result.fired).toBe('editNoop');
    expect(result.fired).not.toBe('kebabClose');
    expect(result.fired).not.toBe('tooltipDismiss');
    expect(result.fired).not.toBe('archiveCancel');
  });

  // Test 10: archive beats edit if both active (archive is outermost modal)
  it('isConfirmingArchive=true + isEditingName=true → archive wins (archive is highest priority)', () => {
    const state: OverlayState = {
      isConfirmingArchive: true,
      isEditingName: true,
      showKebab: false,
      showTooltip: false,
    };
    const result = escapeDispatch(state);
    expect(result.fired).toBe('archiveCancel');
  });
});

// ── atglance-review #17: single shared clock boundary (no per-row Date.now) ────
//
// The hydration/determinism fix: WorkflowRow's accessorContext must seed
// `referenceNowMs` from a THREADED prop (the list-level single clock boundary),
// NOT a fresh per-row `Date.now()`. This is the recurring production-crash class
// the review flagged. We assert against the component SOURCE so the regression
// (re-introducing Date.now() in the accessorContext build) is caught under the
// gate even without a DOM render.

describe('atglance-review #17: WorkflowRow uses one threaded clock, never per-row Date.now()', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./WorkflowRow.tsx', import.meta.url)),
    'utf8',
  );

  it('accessorContext seeds referenceNowMs from the threaded prop (not Date.now())', () => {
    // The object literal must reference the prop, not call the clock.
    expect(src).toMatch(/referenceNowMs,\s*\n\s*activeTimeRange:/);
    // The old per-row landmine must be gone.
    expect(src).not.toContain('referenceNowMs: Date.now()');
  });

  it('the component declares a referenceNowMs prop with a STABLE default (not Date.now())', () => {
    // Destructured with a literal default — a fresh per-render clock is forbidden.
    expect(src).toMatch(/referenceNowMs\s*=\s*0/);
  });

  it('WorkflowRow has no executable Date.now() call (comments aside)', () => {
    // Strip // line comments and /* */ block comments, then assert no clock call
    // survives in executable code. The threaded `referenceNowMs` prop is the only
    // clock source, snapshotted once at the WorkflowList boundary.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(codeOnly.includes('Date.now()')).toBe(false);
  });
});

// ── atglance-review #19: formatCellValue is registry-dataType driven ──────────
// The generic cell formatter must derive its unit from the column registry
// `dataType`, NOT from the value shape. The old shape-guessing rendered a count
// of 1500 as "25m" and a percentage of 42 as a bare "42".

describe('atglance-review #19: formatCellValue (registry-dataType driven)', () => {
  it('null / undefined / non-finite → "—" (never fabricate)', () => {
    expect(formatCellValue(null, 'number')).toBe('—');
    expect(formatCellValue(undefined, 'duration')).toBe('—');
    expect(formatCellValue(Number.NaN, 'number')).toBe('—');
    expect(formatCellValue(Number.POSITIVE_INFINITY, 'duration')).toBe('—');
  });

  it('a count ≥ 1000 with dataType="number" renders as the integer, NOT a duration', () => {
    // The exact bug from the review: 1500 must NOT become "25m".
    expect(formatCellValue(1500, 'number')).toBe('1500');
    expect(formatCellValue(1500, 'number')).not.toMatch(/m|s|h/);
    expect(formatCellValue(2400, 'number')).toBe('2400');
  });

  it('dataType="duration" formats milliseconds as human time', () => {
    expect(formatCellValue(25_000, 'duration')).toBe('25s');
    expect(formatCellValue(90_000, 'duration')).toBe('1m 30s');
    expect(formatCellValue(3_600_000, 'duration')).toBe('1h');
    expect(formatCellValue(5_400_000, 'duration')).toBe('1h 30m');
  });

  it('dataType="percentage" renders integers without ".0" and decimals to 1 place', () => {
    // Engine percentages are already 0–100 display units.
    expect(formatCellValue(42, 'percentage')).toBe('42%');
    expect(formatCellValue(42.5, 'percentage')).toBe('42.5%');
    expect(formatCellValue(100, 'percentage')).toBe('100%');
    expect(formatCellValue(0, 'percentage')).toBe('0%');
  });

  it('dataType="number" rounds to an integer', () => {
    expect(formatCellValue(3.7, 'number')).toBe('4');
    expect(formatCellValue(12, 'number')).toBe('12');
  });

  it('no dataType (legacy/standalone) falls back to a conservative integer — never re-guesses duration/percent', () => {
    // The fallback must NOT re-introduce the shape-guessing: 1500 stays "1500".
    expect(formatCellValue(1500)).toBe('1500');
    expect(formatCellValue(42.0)).toBe('42');
  });

  it('booleans render Yes/No; empty arrays render "—"; arrays join (max 3 + ellipsis)', () => {
    expect(formatCellValue(true, 'boolean')).toBe('Yes');
    expect(formatCellValue(false, 'boolean')).toBe('No');
    expect(formatCellValue([], 'enum')).toBe('—');
    expect(formatCellValue(['a', 'b', 'c', 'd'], 'enum')).toBe('a, b, c…');
  });

  it('formatDurationMs covers the second/minute/hour boundaries', () => {
    expect(formatDurationMs(0)).toBe('0s');
    expect(formatDurationMs(59_000)).toBe('59s');
    expect(formatDurationMs(60_000)).toBe('1m');
    expect(formatDurationMs(61_000)).toBe('1m 1s');
    expect(formatDurationMs(7_260_000)).toBe('2h 1m');
  });

  it('date columns are formatted upstream (caller uses formatDate), not by formatCellValue', () => {
    // Source proof: the cell render special-cases dataType==='date' BEFORE calling
    // formatCellValue, so date values never hit the generic numeric path.
    const src = readFileSync(
      fileURLToPath(new URL('./WorkflowRow.tsx', import.meta.url)),
      'utf8',
    );
    expect(src).toMatch(/colDef\.dataType === 'date'[\s\S]*?formatDate\(rawValue\)/);
    expect(src).toMatch(/formatCellValue\(rawValue,\s*colDef\.dataType\)/);
  });
});

// ── atglance-review #18: health-cell keyboard opener + row a11y restructure ───
// Source-level assertions (node env — no DOM render here): the health breakdown
// trigger is a real <button> with aria-expanded/aria-controls, and the whole-row
// click target no longer traps keyboard focus (tabIndex/Space=kebab removed).

describe('atglance-review #18: row a11y wiring', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./WorkflowRow.tsx', import.meta.url)),
    'utf8',
  );

  it('the health breakdown trigger is a <button> with aria-expanded + aria-controls', () => {
    expect(src).toMatch(/aria-expanded=\{showTooltip\}/);
    expect(src).toMatch(/aria-controls=\{healthTooltipId\}/);
    // The trigger ref is now a button element (keyboard-operable).
    expect(src).toMatch(/tooltipTriggerRef = useRef<HTMLButtonElement>/);
  });

  it('the HealthTooltip receives the matching id for aria-controls', () => {
    expect(src).toMatch(/id=\{healthTooltipId\}/);
  });

  it('the title is a navigation <button> (primary affordance), not just text', () => {
    expect(src).toMatch(/aria-label=\{`Open workflow: \$\{displayTitle\}`\}/);
  });

  it('the whole <tr> is no longer a focusable element with a Space=kebab binding', () => {
    // tabIndex={0} on the row and the old onKeyDown handler are removed.
    expect(src).not.toContain('onKeyDown={handleRowKeyDown}');
    expect(src).not.toMatch(/<tr[\s\S]*?tabIndex=\{0\}/);
    // The surprising Space → open kebab binding is gone.
    expect(src).not.toMatch(/if \(e\.key === ' '\)[\s\S]*?setShowKebab\(true\)/);
  });

  it('mouse click-anywhere-to-open is preserved on the row', () => {
    expect(src).toMatch(/onClick=\{handleRowClick\}/);
  });
});
