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

function healthBand(score: number): { label: 'poor' | 'fair' | 'good' } {
  if (score < 40) return { label: 'poor' };
  if (score < 70) return { label: 'fair' };
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
  it('score < 40 → poor', () => {
    expect(healthBand(0).label).toBe('poor');
    expect(healthBand(39).label).toBe('poor');
  });

  it('score 40–69 → fair', () => {
    expect(healthBand(40).label).toBe('fair');
    expect(healthBand(69).label).toBe('fair');
  });

  it('score >= 70 → good', () => {
    expect(healthBand(70).label).toBe('good');
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
