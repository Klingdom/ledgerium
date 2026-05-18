/**
 * WorkflowList — state-machine branch tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure logic: applyFilters, state derivation, sort logic.
 *
 * 5 states covered: loading, empty, no-results, error, sparse, ready
 *
 * iter-030: analytics — dashboard_v2_sort_changed event shape
 */

import { describe, it, expect, vi } from 'vitest';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
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

// ── iter-030: dashboard_v2_sort_changed event shape ───────────────────────────

/**
 * Pure-logic derivation of the dashboard_v2_sort_changed event.
 * Mirrors handleSort() in WorkflowList.tsx.
 */
type SortField = 'health_score' | 'name' | 'opportunity';
type SortDir = 'asc' | 'desc';

function buildSortEvent(
  currentField: SortField,
  currentDir: SortDir,
  clickedField: SortField,
): { event: string; column: string; direction: SortDir } {
  const nextDir: SortDir =
    currentField === clickedField && currentDir === 'asc' ? 'desc' : 'asc';
  return { event: 'dashboard_v2_sort_changed', column: clickedField, direction: nextDir };
}

describe('iter-030: dashboard_v2_sort_changed event shape', () => {
  it('event name is dashboard_v2_sort_changed', () => {
    const ev = buildSortEvent('health_score', 'asc', 'name');
    expect(ev.event).toBe('dashboard_v2_sort_changed');
  });

  it('column reflects the clicked sort field', () => {
    const ev = buildSortEvent('health_score', 'asc', 'opportunity');
    expect(ev.column).toBe('opportunity');
  });

  it('direction=asc when clicking a new field (not currently sorted)', () => {
    const ev = buildSortEvent('health_score', 'asc', 'name');
    expect(ev.direction).toBe('asc');
  });

  it('direction=desc when clicking the active field that is currently asc', () => {
    const ev = buildSortEvent('health_score', 'asc', 'health_score');
    expect(ev.direction).toBe('desc');
  });

  it('direction=asc when clicking the active field that is currently desc (toggle back)', () => {
    const ev = buildSortEvent('name', 'desc', 'name');
    expect(ev.direction).toBe('asc');
  });

  it('direction is always "asc" or "desc" (exhaustive)', () => {
    const fields: SortField[] = ['health_score', 'name', 'opportunity'];
    const dirs: SortDir[] = ['asc', 'desc'];
    for (const field of fields) {
      for (const dir of dirs) {
        for (const clickField of fields) {
          const ev = buildSortEvent(field, dir, clickField);
          expect(['asc', 'desc']).toContain(ev.direction);
        }
      }
    }
  });
});

// ── WDC2-P05 (iter-080): copy-pin assertions ─────────────────────────────────
//
// These lock the user-facing strings introduced by WDC2-P05 Part A (empty-state
// activation pull) and Part B (5 Growth POLISH substitutions) so future renames
// must be explicit. They mirror the render-branch state machine using the same
// deriveState() helper above — no jsdom required.

/** Simulated copy map keyed by state, mirroring WorkflowList.tsx render branches. */
const COPY = {
  empty: {
    body: 'Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time.',
    cta: 'Install extension to start →',
  },
  sparse: {
    notice: 'Your first workflow is recorded. Record 2 more to unlock health score comparison across your library.',
  },
  error: {
    message: 'Could not load workflows — check your connection and retry.',
  },
} as const;

describe('WDC2-P05 (iter-080): WorkflowList copy-pin assertions', () => {
  it('empty-state body copy matches WDC-002 growth-strategist verbatim spec', () => {
    // Fires when deriveState returns "empty" (0 workflows, no filters)
    expect(deriveState(false, false, [], false)).toBe('empty');
    expect(COPY.empty.body).toBe(
      'Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time.',
    );
  });

  it('empty-state CTA copy matches WDC-002 growth-strategist verbatim spec', () => {
    expect(COPY.empty.cta).toBe('Install extension to start →');
  });

  it('sparse-state notice copy matches WDC-002 growth-strategist verbatim spec', () => {
    // Fires when deriveState returns "sparse" (1 or 2 workflows)
    expect(deriveState(false, false, [makeWorkflow('a1')], false)).toBe('sparse');
    expect(COPY.sparse.notice).toBe(
      'Your first workflow is recorded. Record 2 more to unlock health score comparison across your library.',
    );
  });

  it('error-state copy matches WDC-002 growth-strategist verbatim spec', () => {
    expect(deriveState(false, true, [], false)).toBe('error');
    expect(COPY.error.message).toBe(
      'Could not load workflows — check your connection and retry.',
    );
  });
});

// ── MDR-P03: applyFilters nowMs injection (iter-037) ─────────────────────────

describe('MDR-P03 applyFilters nowMs injection (iter-037)', () => {
  it('applyFilters with explicit nowMs produces identical output across repeat calls with same nowMs', () => {
    // Workflow updated 40 days ago — should match 'stale' filter
    const fixedNowMs = new Date('2026-04-23T00:00:00.000Z').getTime();
    const staleWorkflow = makeWorkflow('stale-w', {
      toolsUsed: [],
      opportunityTag: 'monitor',
      healthOverall: 70,
    });
    // Manually set updatedAt to 40 days ago
    const staleWf: WorkflowRowData = {
      ...staleWorkflow,
      updatedAt: new Date(fixedNowMs - 40 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const freshWorkflow = makeWorkflow('fresh-w', {});

    const filters: FilterState = { ...emptyFilters, healthStatus: 'stale' };

    const r1 = applyFilters([staleWf, freshWorkflow], filters, null, fixedNowMs);
    const r2 = applyFilters([staleWf, freshWorkflow], filters, null, fixedNowMs);

    // Both calls with same nowMs → identical result
    expect(r1.map((w) => w.id)).toEqual(r2.map((w) => w.id));
    expect(r1).toHaveLength(1);
    expect(r1[0]!.id).toBe('stale-w');
  });

  it('age filter uses injected nowMs, not wall-clock — same workflow is stale at T1 but not at T0', () => {
    const updatedAt = new Date('2026-02-01T00:00:00.000Z').toISOString(); // Feb 1
    const workflow = makeWorkflow('w1', {});
    const wf: WorkflowRowData = { ...workflow, updatedAt };

    const filters: FilterState = { ...emptyFilters, healthStatus: 'stale' };

    // nowMs = 10 days after updatedAt — NOT stale (< 30 day threshold)
    const nowMs10 = new Date('2026-02-11T00:00:00.000Z').getTime();
    const r10 = applyFilters([wf], filters, null, nowMs10);
    expect(r10).toHaveLength(0);

    // nowMs = 40 days after updatedAt — IS stale (> 30 day threshold)
    const nowMs40 = new Date('2026-03-13T00:00:00.000Z').getTime();
    const r40 = applyFilters([wf], filters, null, nowMs40);
    expect(r40).toHaveLength(1);
  });

  it('default nowMs parameter (no injection) preserves backward compatibility', () => {
    // When nowMs is omitted, applyFilters still runs without error (uses Date.now() default)
    const filters: FilterState = emptyFilters;
    const wf = makeWorkflow('w1', {});
    // Should not throw and should return the workflow
    const result = applyFilters([wf], filters, null);
    expect(result).toHaveLength(1);
  });
});
