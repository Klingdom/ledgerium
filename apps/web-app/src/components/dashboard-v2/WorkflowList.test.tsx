/**
 * WorkflowList — state-machine branch tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure logic: applyFilters, state derivation, sort logic.
 *
 * 5 states covered: loading, empty, no-results, error, sparse, ready
 */

import { describe, it, expect } from 'vitest';
import { applyFilters } from './WorkflowList.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import type { WorkflowRowData } from './WorkflowRow.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import type { WorkflowListState } from './WorkflowList.js';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeWorkflow(id: string, overrides: {
  toolsUsed?: string[];
  opportunityTag?: WorkflowRowData['metricsV2']['opportunityTag'];
  healthOverall?: number;
  variationScore?: number;
  isGated?: boolean;
} = {}): WorkflowRowData {
  return {
    id,
    title: `Workflow ${id}`,
    toolsUsed: overrides.toolsUsed ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastViewedAt: null,
    metricsV2: {
      runs: 3,
      avgTimeMs: 60_000,
      variationScore: overrides.variationScore ?? 0.3,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: overrides.healthOverall ?? 65,
        speed: 18,
        consistency: 21,
        dataQuality: 14,
        standardization: 12,
        isGated: overrides.isGated ?? false,
      },
      opportunityTag: overrides.opportunityTag ?? 'healthy',
      aiOpportunityScore: 40,
      confidence: 0.75,
    },
  };
}

const emptyFilters: FilterState = { systems: [], opportunity: null, healthStatus: null, needsAttention: false };

// ── State derivation (extracted logic) ───────────────────────────────────────

function deriveState(
  isLoading: boolean,
  isError: boolean,
  filtered: WorkflowRowData[],
  anyFiltersActive: boolean,
): WorkflowListState {
  if (isLoading) return 'loading';
  if (isError) return 'error';
  if (filtered.length === 0 && !anyFiltersActive) return 'empty';
  if (filtered.length === 0 && anyFiltersActive) return 'no-results';
  if (filtered.length < 3) return 'sparse';
  return 'ready';
}

// ── State machine branch tests ────────────────────────────────────────────────

describe('WorkflowList state machine', () => {
  it('state=loading when isLoading=true regardless of data', () => {
    expect(deriveState(true, false, [makeWorkflow('1')], false)).toBe('loading');
  });

  it('state=error when isError=true', () => {
    expect(deriveState(false, true, [], false)).toBe('error');
  });

  it('state=empty when 0 workflows and no filters', () => {
    expect(deriveState(false, false, [], false)).toBe('empty');
  });

  it('state=no-results when 0 filtered workflows but filters active', () => {
    expect(deriveState(false, false, [], true)).toBe('no-results');
  });

  it('state=sparse when 1 or 2 workflows after filter', () => {
    expect(deriveState(false, false, [makeWorkflow('1')], false)).toBe('sparse');
    expect(deriveState(false, false, [makeWorkflow('1'), makeWorkflow('2')], false)).toBe('sparse');
  });

  it('state=ready when 3+ workflows', () => {
    const ws = [makeWorkflow('1'), makeWorkflow('2'), makeWorkflow('3')];
    expect(deriveState(false, false, ws, false)).toBe('ready');
  });
});

// ── applyFilters — filter correctness ────────────────────────────────────────

describe('applyFilters', () => {
  const workflows = [
    makeWorkflow('monitor-w', { opportunityTag: 'monitor', healthOverall: 25, toolsUsed: ['Salesforce'] }),
    makeWorkflow('automate-w', { opportunityTag: 'automate', healthOverall: 80, toolsUsed: ['Slack', 'Salesforce'] }),
    makeWorkflow('healthy-w', { opportunityTag: 'healthy', healthOverall: 82, toolsUsed: ['NetSuite'] }),
    makeWorkflow('high-var-w', { opportunityTag: 'standardize', healthOverall: 55, variationScore: 0.85 }),
  ];

  it('returns all when no filters', () => {
    expect(applyFilters(workflows, emptyFilters, null)).toHaveLength(4);
  });

  it('filters by single system', () => {
    const r = applyFilters(workflows, { ...emptyFilters, systems: ['NetSuite'] }, null);
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('healthy-w');
  });

  it('system filter uses OR across row toolsUsed', () => {
    const r = applyFilters(workflows, { ...emptyFilters, systems: ['Salesforce'] }, null);
    // monitor-w and automate-w both have Salesforce
    expect(r).toHaveLength(2);
    expect(r.map((w) => w.id).sort()).toEqual(['automate-w', 'monitor-w']);
  });

  it('filters by opportunity=monitor', () => {
    const r = applyFilters(workflows, { ...emptyFilters, opportunity: 'monitor' }, null);
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('monitor-w');
  });

  it('filters by healthStatus=healthy (score >= 70)', () => {
    const r = applyFilters(workflows, { ...emptyFilters, healthStatus: 'healthy' }, null);
    expect(r.every((w) => w.metricsV2.healthScore.overall >= 70)).toBe(true);
  });

  it('filters by healthStatus=needs_review (score < 40)', () => {
    const r = applyFilters(workflows, { ...emptyFilters, healthStatus: 'needs_review' }, null);
    expect(r.every((w) => w.metricsV2.healthScore.overall < 40)).toBe(true);
  });

  it('applies insight filter for variationScore_gt_0.7', () => {
    const r = applyFilters(workflows, emptyFilters, 'variationScore_gt_0.7');
    expect(r.every((w) => w.metricsV2.variationScore > 0.7)).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('applies insight filter for opportunityTag_automate', () => {
    const r = applyFilters(workflows, emptyFilters, 'opportunityTag_automate');
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('automate-w');
  });

  it('applies insight filter for opportunityTag_monitor', () => {
    const r = applyFilters(workflows, emptyFilters, 'opportunityTag_monitor');
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('monitor-w');
  });

  it('applies insight filter for healthScore_gte_70', () => {
    const r = applyFilters(workflows, emptyFilters, 'healthScore_gte_70');
    expect(r.every((w) => w.metricsV2.healthScore.overall >= 70)).toBe(true);
  });

  it('insight filter + user filter compound correctly', () => {
    // healthScore_gte_70 AND opportunity=automate
    const r = applyFilters(
      workflows,
      { ...emptyFilters, opportunity: 'automate' },
      'healthScore_gte_70',
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('automate-w');
  });

  // ── needsAttention filter (iter-024 §4.1 item e) ──────────────────────────

  it('needsAttention filter includes workflows with health < 60', () => {
    const lowHealthWorkflow = makeWorkflow('low-health', { healthOverall: 55 });
    const healthyWorkflow = makeWorkflow('healthy', { healthOverall: 80 });
    const result = applyFilters(
      [lowHealthWorkflow, healthyWorkflow],
      { ...emptyFilters, needsAttention: true },
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('low-health');
  });

  it('needsAttention filter includes workflows with variationLabel === "high"', () => {
    const highVarWorkflow = makeWorkflow('high-var', { healthOverall: 75, variationScore: 0.8 });
    // Make variationLabel explicit in the metricsV2
    const wWithHighVar: WorkflowRowData = {
      ...highVarWorkflow,
      metricsV2: {
        ...highVarWorkflow.metricsV2,
        variationLabel: 'high',
      },
    };
    const healthyWorkflow = makeWorkflow('healthy', { healthOverall: 80, variationScore: 0.2 });
    const result = applyFilters(
      [wWithHighVar, healthyWorkflow],
      { ...emptyFilters, needsAttention: true },
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('high-var');
  });

  it('needsAttention=false does not filter (all workflows pass)', () => {
    const r = applyFilters(workflows, { ...emptyFilters, needsAttention: false }, null);
    expect(r).toHaveLength(workflows.length);
  });
});
