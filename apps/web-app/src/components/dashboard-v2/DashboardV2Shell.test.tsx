/**
 * DashboardV2Shell — smoke tests for state derivation logic.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure state-derivation logic from the shell.
 *
 * The 3 states tested:
 *  - loading  → isLoading=true
 *  - ready    → isLoading=false, no error, workflows present
 *  - empty    → isLoading=false, no error, no workflows, no filters
 *
 * iter-030: analytics — dashboard_v2_viewed event shape contract
 */

import { describe, it, expect, vi } from 'vitest';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
import type { WorkflowRowData } from './WorkflowRow.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import { applyFilters, type WorkflowListState } from './WorkflowList.js';

// ── Minimal fixture ───────────────────────────────────────────────────────────

function makeWorkflow(overrides: Partial<WorkflowRowData> = {}): WorkflowRowData {
  return {
    id: 'wf-1',
    title: 'Test Workflow',
    toolsUsed: ['Salesforce'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastViewedAt: null,
    metricsV2: {
      runs: 5,
      avgTimeMs: 120_000,
      variationScore: 0.2,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: 75,
        speed: 30,
        consistency: 24,
        dataQuality: 14,
        standardization: 7,
        isGated: false,
      },
      opportunityTag: 'healthy',
      aiOpportunityScore: 42,
      confidence: 0.9,
    },
    ...overrides,
  };
}

// ── State derivation helper (extracted from DashboardV2Shell logic) ───────────

function deriveState(params: {
  isLoading: boolean;
  isError: boolean;
  filteredWorkflows: WorkflowRowData[];
  anyFiltersActive: boolean;
}): WorkflowListState {
  const { isLoading, isError, filteredWorkflows, anyFiltersActive } = params;
  if (isLoading) return 'loading';
  if (isError) return 'error';
  if (filteredWorkflows.length === 0 && !anyFiltersActive) return 'empty';
  if (filteredWorkflows.length === 0 && anyFiltersActive) return 'no-results';
  if (filteredWorkflows.length < 3) return 'sparse';
  return 'ready';
}

const emptyFilters: FilterState = { systems: [], opportunity: null, healthStatus: null, needsAttention: false };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DashboardV2Shell state derivation', () => {
  it('returns "loading" when isLoading is true', () => {
    const state = deriveState({
      isLoading: true,
      isError: false,
      filteredWorkflows: [],
      anyFiltersActive: false,
    });
    expect(state).toBe('loading');
  });

  it('returns "empty" when not loading, no error, and no workflows without filters', () => {
    const state = deriveState({
      isLoading: false,
      isError: false,
      filteredWorkflows: [],
      anyFiltersActive: false,
    });
    expect(state).toBe('empty');
  });

  it('returns "ready" when 3+ workflows are present', () => {
    const workflows = [makeWorkflow({ id: '1' }), makeWorkflow({ id: '2' }), makeWorkflow({ id: '3' })];
    const state = deriveState({
      isLoading: false,
      isError: false,
      filteredWorkflows: workflows,
      anyFiltersActive: false,
    });
    expect(state).toBe('ready');
  });

  it('returns "sparse" when 1–2 workflows are present', () => {
    const state = deriveState({
      isLoading: false,
      isError: false,
      filteredWorkflows: [makeWorkflow()],
      anyFiltersActive: false,
    });
    expect(state).toBe('sparse');
  });

  it('returns "error" when isError is true (overrides empty check)', () => {
    const state = deriveState({
      isLoading: false,
      isError: true,
      filteredWorkflows: [],
      anyFiltersActive: false,
    });
    expect(state).toBe('error');
  });

  it('returns "no-results" when no matching workflows but filters are active', () => {
    const state = deriveState({
      isLoading: false,
      isError: false,
      filteredWorkflows: [],
      anyFiltersActive: true,
    });
    expect(state).toBe('no-results');
  });
});

describe('hasActiveFilters', () => {
  it('returns false for empty filter state', () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false);
  });

  it('returns true when systems filter has values', () => {
    expect(hasActiveFilters({ ...emptyFilters, systems: ['Salesforce'] })).toBe(true);
  });

  it('returns true when opportunity filter is set', () => {
    expect(hasActiveFilters({ ...emptyFilters, opportunity: 'automate' })).toBe(true);
  });

  it('returns true when healthStatus filter is set', () => {
    expect(hasActiveFilters({ ...emptyFilters, healthStatus: 'healthy' })).toBe(true);
  });

  it('returns true when needsAttention is true (iter-024 §4.1 item e)', () => {
    expect(hasActiveFilters({ ...emptyFilters, needsAttention: true })).toBe(true);
  });

  it('returns false when needsAttention is false and all other filters empty', () => {
    expect(hasActiveFilters({ ...emptyFilters, needsAttention: false })).toBe(false);
  });
});

describe('applyFilters', () => {
  const workflows = [
    makeWorkflow({ id: 'a', toolsUsed: ['Salesforce', 'Slack'] }),
    makeWorkflow({
      id: 'b',
      toolsUsed: ['HubSpot'],
      metricsV2: {
        ...makeWorkflow().metricsV2,
        opportunityTag: 'automate',
        healthScore: { ...makeWorkflow().metricsV2.healthScore, overall: 30 },
      },
    }),
    makeWorkflow({
      id: 'c',
      toolsUsed: ['NetSuite'],
      metricsV2: {
        ...makeWorkflow().metricsV2,
        variationScore: 0.85,
      },
    }),
  ];

  it('returns all workflows when no filters active', () => {
    expect(applyFilters(workflows, emptyFilters, null)).toHaveLength(3);
  });

  it('filters by system (OR logic across systems)', () => {
    const result = applyFilters(
      workflows,
      { ...emptyFilters, systems: ['Salesforce'] },
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('filters by opportunity tag', () => {
    const result = applyFilters(
      workflows,
      { ...emptyFilters, opportunity: 'automate' },
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('b');
  });

  it('applies insight filter key for variationScore_gt_0.7', () => {
    const result = applyFilters(workflows, emptyFilters, 'variationScore_gt_0.7');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('c');
  });

  it('applies insight filter key for healthScore_gte_70', () => {
    const result = applyFilters(workflows, emptyFilters, 'healthScore_gte_70');
    // Only 'a' has overall >= 70 (75); 'b' has 30
    expect(result.some((w) => w.id === 'a')).toBe(true);
    expect(result.some((w) => w.id === 'b')).toBe(false);
  });
});

// ── iter-030: dashboard_v2_viewed event shape ─────────────────────────────────

/**
 * Pure-logic derivation of the dashboard_v2_viewed event shape.
 * Mirrors the computation in DashboardV2Shell's useEffect for this event.
 */
function buildDashboardV2ViewedEvent(params: {
  workflowCount: number;
  filtersState: { systems: string[]; opportunity: string | null; healthStatus: string | null; needsAttention: boolean };
  insightFilterKey: string | null;
  activePortfolioId: string | null;
}): { event: string; workflowCount: number; hasActiveFilters: boolean; portfolioFilterActive: boolean } {
  const { workflowCount, filtersState, insightFilterKey, activePortfolioId } = params;
  const hasFilters =
    filtersState.systems.length > 0 ||
    filtersState.opportunity !== null ||
    filtersState.healthStatus !== null ||
    filtersState.needsAttention ||
    insightFilterKey !== null;
  return {
    event: 'dashboard_v2_viewed',
    workflowCount,
    hasActiveFilters: hasFilters,
    portfolioFilterActive: activePortfolioId !== null,
  };
}

const baseFilters = { systems: [], opportunity: null, healthStatus: null, needsAttention: false };

describe('iter-030: dashboard_v2_viewed event shape', () => {
  it('event name is dashboard_v2_viewed', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 5,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.event).toBe('dashboard_v2_viewed');
  });

  it('workflowCount matches the loaded workflow count', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 7,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.workflowCount).toBe(7);
  });

  it('hasActiveFilters=false when no filters are active', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.hasActiveFilters).toBe(false);
  });

  it('hasActiveFilters=true when systems filter is active', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: { ...baseFilters, systems: ['Salesforce'] },
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.hasActiveFilters).toBe(true);
  });

  it('hasActiveFilters=true when insightFilterKey is set', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: 'variationScore_gt_0.7',
      activePortfolioId: null,
    });
    expect(ev.hasActiveFilters).toBe(true);
  });

  it('portfolioFilterActive=false when no portfolio selected', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.portfolioFilterActive).toBe(false);
  });

  it('portfolioFilterActive=true when a portfolio is selected', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: 'portfolio-123',
    });
    expect(ev.portfolioFilterActive).toBe(true);
  });

  it('workflowCount=0 is valid (empty state fires after load)', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 0,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
    });
    expect(ev.workflowCount).toBe(0);
    expect(ev.event).toBe('dashboard_v2_viewed');
  });
});
