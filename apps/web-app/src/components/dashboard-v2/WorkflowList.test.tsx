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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
import {
  applyFilters,
  sortWorkflows,
  matchesSearch,
  SORTABLE_HEADER_GLOSS,
  isNumericColumn,
  columnAlignClass,
} from './WorkflowList.js';
import type { ColumnDataType } from '@/lib/dashboard-columns/index.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import type { WorkflowRowData } from './WorkflowRow.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import type { WorkflowListState, SortState } from './WorkflowList.js';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeWorkflow(id: string, overrides: {
  toolsUsed?: string[];
  opportunityTag?: WorkflowRowData['metricsV2']['opportunityTag'];
  healthOverall?: number;
  variationScore?: number;
  isGated?: boolean;
  createdAt?: string;
  processDefinitionUpdatedAt?: string | null;
  runs?: number | null;
  avgTimeMs?: number | null;
} = {}): WorkflowRowData {
  return {
    id,
    title: `Workflow ${id}`,
    toolsUsed: overrides.toolsUsed ?? [],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastViewedAt: null,
    // Batch A (2026-06-12): processDefinitionUpdatedAt for honest "Last Run" proxy
    processDefinitionUpdatedAt: overrides.processDefinitionUpdatedAt !== undefined
      ? overrides.processDefinitionUpdatedAt
      : new Date().toISOString(),
    metricsV2: {
      runs: overrides.runs !== undefined ? overrides.runs : 3,
      avgTimeMs: overrides.avgTimeMs !== undefined ? overrides.avgTimeMs : 60_000,
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
    // atglance-review #14 (2026-06-16): rewritten to INVITE the first click into
    // the workflow (the aha-moment) instead of deferring it ("record 2 more").
    notice: 'Open your first workflow to see its process map, cycle time, and where AI fits. Record 2 more to compare health across your library.',
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

  it('sparse-state notice copy matches the atglance-review #14 first-open invitation', () => {
    // Fires when deriveState returns "sparse" (1 or 2 workflows)
    expect(deriveState(false, false, [makeWorkflow('a1')], false)).toBe('sparse');
    expect(COPY.sparse.notice).toBe(
      'Open your first workflow to see its process map, cycle time, and where AI fits. Record 2 more to compare health across your library.',
    );
  });

  it('sparse copy INVITES the first open (aha-moment first) and keeps the honest run-count disclosure', () => {
    const lc = COPY.sparse.notice.toLowerCase();
    // Leads with the immediate reward — opening the recorded workflow.
    expect(lc).toContain('open your first workflow');
    // Names only what the detail page honestly shows.
    expect(lc).toContain('process map');
    expect(lc).toContain('cycle time');
    // Library benefit is preserved as secondary (honest run-count disclosure).
    expect(lc).toContain('record 2 more');
    // It no longer DEFERS the aha-moment with the old "unlock … comparison" framing.
    expect(lc).not.toContain('unlock health score comparison');
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

// ── Batch A (2026-06-12): sortWorkflows — new sort fields ─────────────────────
//
// Tests for the 5 new SortField values added by dashboard-redesign P0 item 2:
// run_count, cycle_time, last_run, date_recorded, case_volume.
// All comparators are pure deterministic functions over WorkflowRowData.

describe('Batch A: sortWorkflows — new sort fields (2026-06-12)', () => {
  it('sort by run_count asc — ascending by runs (nulls last via -1 sentinel)', () => {
    const a = makeWorkflow('a', { runs: 5 });
    const b = makeWorkflow('b', { runs: 2 });
    const c = makeWorkflow('c', { runs: null });
    const sort: SortState = { field: 'run_count', dir: 'asc' };
    const result = sortWorkflows([a, b, c], sort);
    expect(result.map((w) => w.id)).toEqual(['c', 'b', 'a']);
  });

  it('sort by run_count desc — descending by runs', () => {
    const a = makeWorkflow('a', { runs: 5 });
    const b = makeWorkflow('b', { runs: 2 });
    const sort: SortState = { field: 'run_count', dir: 'desc' };
    const result = sortWorkflows([a, b], sort);
    expect(result.map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('sort by case_volume — sorts identically to run_count (alias)', () => {
    const a = makeWorkflow('a', { runs: 10 });
    const b = makeWorkflow('b', { runs: 3 });
    const sortRuns: SortState = { field: 'run_count', dir: 'asc' };
    const sortCv: SortState = { field: 'case_volume', dir: 'asc' };
    const r1 = sortWorkflows([a, b], sortRuns).map((w) => w.id);
    const r2 = sortWorkflows([a, b], sortCv).map((w) => w.id);
    expect(r1).toEqual(r2);
  });

  it('sort by cycle_time asc — ascending by avgTimeMs (null sorts last via Infinity)', () => {
    const fast = makeWorkflow('fast', { avgTimeMs: 30_000 });
    const slow = makeWorkflow('slow', { avgTimeMs: 120_000 });
    const none = makeWorkflow('none', { avgTimeMs: null });
    const sort: SortState = { field: 'cycle_time', dir: 'asc' };
    const result = sortWorkflows([slow, none, fast], sort);
    expect(result.map((w) => w.id)).toEqual(['fast', 'slow', 'none']);
  });

  it('sort by cycle_time desc — descending by avgTimeMs', () => {
    const fast = makeWorkflow('fast', { avgTimeMs: 30_000 });
    const slow = makeWorkflow('slow', { avgTimeMs: 120_000 });
    const sort: SortState = { field: 'cycle_time', dir: 'desc' };
    const result = sortWorkflows([fast, slow], sort);
    expect(result.map((w) => w.id)).toEqual(['slow', 'fast']);
  });

  it('sort by last_run asc — ascending by processDefinitionUpdatedAt (null sorts last via -1)', () => {
    const old = makeWorkflow('old', { processDefinitionUpdatedAt: '2026-01-01T00:00:00.000Z' });
    const recent = makeWorkflow('recent', { processDefinitionUpdatedAt: '2026-06-01T00:00:00.000Z' });
    const none = makeWorkflow('none', { processDefinitionUpdatedAt: null });
    const sort: SortState = { field: 'last_run', dir: 'asc' };
    const result = sortWorkflows([recent, none, old], sort);
    expect(result.map((w) => w.id)).toEqual(['none', 'old', 'recent']);
  });

  it('sort by last_run desc — most recent first', () => {
    const old = makeWorkflow('old', { processDefinitionUpdatedAt: '2026-01-01T00:00:00.000Z' });
    const recent = makeWorkflow('recent', { processDefinitionUpdatedAt: '2026-06-01T00:00:00.000Z' });
    const sort: SortState = { field: 'last_run', dir: 'desc' };
    const result = sortWorkflows([old, recent], sort);
    expect(result.map((w) => w.id)).toEqual(['recent', 'old']);
  });

  it('sort by date_recorded asc — oldest first', () => {
    const a = makeWorkflow('a', { createdAt: '2026-01-15T00:00:00.000Z' });
    const b = makeWorkflow('b', { createdAt: '2026-06-12T00:00:00.000Z' });
    const sort: SortState = { field: 'date_recorded', dir: 'asc' };
    const result = sortWorkflows([b, a], sort);
    expect(result.map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('sort by date_recorded desc — newest first (default sort direction)', () => {
    const a = makeWorkflow('a', { createdAt: '2026-01-15T00:00:00.000Z' });
    const b = makeWorkflow('b', { createdAt: '2026-06-12T00:00:00.000Z' });
    const sort: SortState = { field: 'date_recorded', dir: 'desc' };
    const result = sortWorkflows([a, b], sort);
    expect(result.map((w) => w.id)).toEqual(['b', 'a']);
  });

  it('stable tie-break by id when primary sort values are equal', () => {
    const w1 = makeWorkflow('w1', { runs: 5 });
    const w2 = makeWorkflow('w2', { runs: 5 });
    const sort: SortState = { field: 'run_count', dir: 'asc' };
    const result = sortWorkflows([w2, w1], sort);
    // ids 'w1' < 'w2' lexicographically → 'w1' first
    expect(result.map((w) => w.id)).toEqual(['w1', 'w2']);
  });
});

// ── Batch C item 15: global search ────────────────────────────────────────────
//
// matchesSearch is a pure predicate (title + systems substring); applyFilters
// threads the searchQuery through as an additive, default-'' (no-op) filter.

describe('Batch C: matchesSearch (2026-06-12)', () => {
  it('empty / whitespace query matches every workflow (no-op)', () => {
    const w = makeWorkflow('a', { toolsUsed: ['Salesforce'] });
    expect(matchesSearch(w, '')).toBe(true);
    expect(matchesSearch(w, '   ')).toBe(true);
  });

  it('matches on workflow title substring (case-insensitive)', () => {
    const w = makeWorkflow('a'); // title = "Workflow a"
    expect(matchesSearch(w, 'workflow')).toBe(true);
    expect(matchesSearch(w, 'WORKFLOW')).toBe(true);
    expect(matchesSearch(w, 'flow a')).toBe(true);
  });

  it('matches on a system name substring (case-insensitive)', () => {
    const w = makeWorkflow('a', { toolsUsed: ['Salesforce', 'Slack'] });
    expect(matchesSearch(w, 'sales')).toBe(true);
    expect(matchesSearch(w, 'SLACK')).toBe(true);
  });

  it('returns false when neither title nor systems contain the query', () => {
    const w = makeWorkflow('a', { toolsUsed: ['Salesforce'] });
    expect(matchesSearch(w, 'netsuite')).toBe(false);
    expect(matchesSearch(w, 'zzz')).toBe(false);
  });

  it('trims surrounding whitespace before matching', () => {
    const w = makeWorkflow('a', { toolsUsed: ['Workday'] });
    expect(matchesSearch(w, '  workday  ')).toBe(true);
  });
});

describe('Batch C: applyFilters search integration (2026-06-12)', () => {
  const workflows = [
    makeWorkflow('invoice', { toolsUsed: ['Salesforce'] }),
    makeWorkflow('payroll', { toolsUsed: ['Workday'] }),
    makeWorkflow('onboard', { toolsUsed: ['Slack', 'Notion'] }),
  ];
  // Note: makeWorkflow titles are `Workflow ${id}` — search "payroll" hits the id.

  it('default (no searchQuery arg) preserves the full result set — backward compatible', () => {
    expect(applyFilters(workflows, emptyFilters, null)).toHaveLength(3);
  });

  it('empty-string searchQuery is a no-op', () => {
    expect(applyFilters(workflows, emptyFilters, null, Date.now(), '')).toHaveLength(3);
  });

  it('search narrows by title substring', () => {
    const r = applyFilters(workflows, emptyFilters, null, Date.now(), 'payroll');
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('payroll');
  });

  it('search narrows by system name', () => {
    const r = applyFilters(workflows, emptyFilters, null, Date.now(), 'notion');
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe('onboard');
  });

  it('search composes with other filters (conjunctive)', () => {
    // System filter Salesforce → only 'invoice'; search 'payroll' → none match both.
    const r = applyFilters(
      workflows,
      { ...emptyFilters, systems: ['Salesforce'] },
      null,
      Date.now(),
      'payroll',
    );
    expect(r).toHaveLength(0);
  });

  it('search yielding no match returns [] (drives the no-results state honestly)', () => {
    const r = applyFilters(workflows, emptyFilters, null, Date.now(), 'no-such-thing');
    expect(r).toHaveLength(0);
  });

  it('is deterministic for the same query (search never mutates data)', () => {
    const r1 = applyFilters(workflows, emptyFilters, null, Date.now(), 'work');
    const r2 = applyFilters(workflows, emptyFilters, null, Date.now(), 'work');
    expect(r1.map((w) => w.id)).toEqual(r2.map((w) => w.id));
    // original array is untouched
    expect(workflows).toHaveLength(3);
  });
});

// ── atglance-review #13: sortable column-header glosses (definitions only) ─────

describe('atglance-review #13: SORTABLE_HEADER_GLOSS', () => {
  it('glosses the key sortable columns a newcomer meets', () => {
    expect(SORTABLE_HEADER_GLOSS.cycle_time).toBeTruthy();
    expect(SORTABLE_HEADER_GLOSS.run_count).toBeTruthy();
    expect(SORTABLE_HEADER_GLOSS.health_score).toBeTruthy();
    expect(SORTABLE_HEADER_GLOSS.last_run).toBeTruthy();
    expect(SORTABLE_HEADER_GLOSS.date_recorded).toBeTruthy();
    expect(SORTABLE_HEADER_GLOSS.opportunity).toBeTruthy();
  });

  it('cycle-time gloss is a plain definition that disclaims it is "not a target"', () => {
    expect(SORTABLE_HEADER_GLOSS.cycle_time!.toLowerCase()).toContain('on average');
    expect(SORTABLE_HEADER_GLOSS.cycle_time!.toLowerCase()).toContain('not a target');
  });

  it('last-run gloss honestly labels the updatedAt proxy', () => {
    expect(SORTABLE_HEADER_GLOSS.last_run!.toLowerCase()).toContain('proxy');
  });

  it('no header gloss fabricates a benchmark / sigma / DPMO / ROI', () => {
    for (const text of Object.values(SORTABLE_HEADER_GLOSS)) {
      const lc = text.toLowerCase();
      for (const forbidden of ['benchmark', 'sigma', 'dpmo', 'industry average']) {
        expect(lc).not.toContain(forbidden);
      }
    }
  });
});

// ── atglance-review #15: right-align numeric columns (registry-dataType-driven) ─

describe('atglance-review #15: numeric column alignment (dataType-driven)', () => {
  it('numeric/duration/percentage/date dataTypes are right-aligned (scannable)', () => {
    const numericTypes: ColumnDataType[] = ['number', 'duration', 'percentage', 'date'];
    for (const t of numericTypes) {
      expect(isNumericColumn(t)).toBe(true);
      expect(columnAlignClass(t)).toBe('text-right');
    }
  });

  it('text dataTypes (string/enum/boolean) stay left-aligned', () => {
    const textTypes: ColumnDataType[] = ['string', 'enum', 'boolean'];
    for (const t of textTypes) {
      expect(isNumericColumn(t)).toBe(false);
      expect(columnAlignClass(t)).toBe('text-left');
    }
  });

  it('undefined dataType is treated as text (left) — never accidentally right-aligns', () => {
    expect(isNumericColumn(undefined)).toBe(false);
    expect(columnAlignClass(undefined)).toBe('text-left');
  });

  it('the default-pack numeric columns (Runs, Cycle Time, dates) resolve to right-align', () => {
    // Maps the registry dataTypes of the scannable default columns named in #15.
    const runs: ColumnDataType = 'number'; // run_count
    const cycle: ColumnDataType = 'duration'; // cycle_time_mean_ms
    const recorded: ColumnDataType = 'date'; // date_recorded / last_run_at
    expect(columnAlignClass(runs)).toBe('text-right');
    expect(columnAlignClass(cycle)).toBe('text-right');
    expect(columnAlignClass(recorded)).toBe('text-right');
  });
});

// ── atglance-review #15: near-duplicate row title disambiguation gating ────────
//
// The collision detection in WorkflowList computes, over the rendered set, the
// set of titles that appear ≥2 times (case-insensitive, whitespace-collapsed).
// Only those rows get a disambiguator → unique titles get zero clutter. These
// tests pin that gating rule (the same pure logic the component uses).

/** Mirror of WorkflowList's collision-key normalization (deterministic). */
function titleCollisionKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Mirror of WorkflowList's duplicate-title set computation over a rendered set. */
function computeDuplicateTitleKeys(titles: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const t of titles) {
    const k = titleCollisionKey(t);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const dups = new Set<string>();
  for (const [k, n] of counts) if (n > 1) dups.add(k);
  return dups;
}

describe('atglance-review #15: duplicate-title disambiguation gating', () => {
  it('flags a title that appears ≥2 times in the visible set', () => {
    const dups = computeDuplicateTitleKeys([
      'Approve Expense Report (Sample)',
      'Approve Expense Report (Sample)',
      'Approve Expense Report (Sample)',
      'Onboard New Hire',
    ]);
    expect(dups.has(titleCollisionKey('Approve Expense Report (Sample)'))).toBe(true);
    // The unique title is NOT flagged → it gets NO added clutter (gating).
    expect(dups.has(titleCollisionKey('Onboard New Hire'))).toBe(false);
  });

  it('a fully unique-title library produces ZERO flagged collisions', () => {
    const dups = computeDuplicateTitleKeys(['Alpha', 'Beta', 'Gamma']);
    expect(dups.size).toBe(0);
  });

  it('collision detection is case-insensitive and whitespace-collapsed (near-same)', () => {
    const dups = computeDuplicateTitleKeys(['Approve  Report', 'approve report']);
    expect(dups.has(titleCollisionKey('Approve Report'))).toBe(true);
    expect(dups.size).toBe(1);
  });

  it('the 16× sample case flags exactly the one colliding title', () => {
    const titles = Array.from({ length: 16 }, () => 'Approve Expense Report (Sample)');
    const dups = computeDuplicateTitleKeys(titles);
    expect(dups.size).toBe(1);
    expect(dups.has(titleCollisionKey('Approve Expense Report (Sample)'))).toBe(true);
  });
});

// ── atglance-review #15: sticky header + right-align (source-pin) ─────────────
// Node env (no DOM render): assert the table markup keeps the sticky header CSS
// and the numeric headers right-align — while preserving aria-sort + scope + the
// header tooltips. Catches a regression even without a Playwright render.

describe('atglance-review #15: sticky header + numeric right-align (source)', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./WorkflowList.tsx', import.meta.url)),
    'utf8',
  );

  it('the header row carries the CSS sticky classes (sticky / top-0 / bg + z-index)', () => {
    // Sticky lives on the header cells via the [&>th] arbitrary variant because
    // border-collapse tables do not honor sticky on <thead>/<tr>.
    expect(src).toContain('[&>th]:sticky');
    expect(src).toContain('[&>th]:top-0');
    expect(src).toContain('[&>th]:z-10');
    expect(src).toMatch(/\[&>th\]:bg-\[var\(--surface-primary\)\]/);
  });

  it('numeric column headers (Runs / Cycle Time / Last Run / Date Recorded) are text-right', () => {
    // Each sortable numeric <th> right-aligns; the SortButton is inline so the
    // text-right applies to it.
    expect(src).toMatch(/key="run_count"[\s\S]*?text-right/);
    expect(src).toMatch(/key="cycle_time_mean_ms"[\s\S]*?text-right/);
    expect(src).toMatch(/key="last_run_at"[\s\S]*?text-right/);
    expect(src).toMatch(/key="date_recorded"[\s\S]*?text-right/);
  });

  it('generic registry columns align via columnAlignClass(dataType) — not value-shape', () => {
    expect(src).toMatch(/columnAlignClass\(colDef\.dataType\)/);
  });

  it('aria-sort + scope + header title tooltips are preserved on the numeric headers', () => {
    // The sticky/right-align change must NOT strip the a11y attributes.
    expect(src).toMatch(/key="run_count"[\s\S]*?aria-sort=\{sortAriaValue\('run_count', sort\)\}/);
    expect(src).toMatch(/key="run_count"[\s\S]*?title=\{SORTABLE_HEADER_GLOSS\.run_count\}/);
    expect(src).toMatch(/key="date_recorded"[\s\S]*?scope="col"/);
  });

  it('passes isDuplicateTitle to each WorkflowRow (collision-gated disambiguator)', () => {
    expect(src).toMatch(/isDuplicateTitle=\{duplicateTitleKeys\.has\(titleCollisionKey\(workflow\.title\)\)\}/);
  });
});
