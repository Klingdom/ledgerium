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
import { filterByTimeRange } from './DashboardV2Shell.js';

// ── Minimal fixture ───────────────────────────────────────────────────────────

function makeWorkflow(overrides: Partial<WorkflowRowData> = {}): WorkflowRowData {
  return {
    id: 'wf-1',
    title: 'Test Workflow',
    toolsUsed: ['Salesforce'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastViewedAt: null,
    // Batch A (2026-06-12): processDefinitionUpdatedAt for honest "Last Run" proxy
    processDefinitionUpdatedAt: new Date().toISOString(),
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

// ── atglance-review #14: first-run chrome suppression rule ────────────────────
//
// The shell suppresses the analyst chrome (lens tabs, KPI band, opportunity bar,
// weekly chart, facts row, toolbar, preset chips, insights strip, active-filters
// bar) and renders the FirstRunTutorial INSTEAD iff `isFirstRun`. `isFirstRun`
// is exactly the 'empty' viewState (0 workflows, no active filters) — it reuses
// the existing state machine, it does NOT invent a new threshold.

/** Mirror of the shell's isFirstRun derivation (listState === 'empty'). */
function isFirstRun(state: WorkflowListState): boolean {
  return state === 'empty';
}

describe('atglance-review #14: first-run chrome-suppression rule', () => {
  it('SUPPRESSES the analyst chrome only on the empty (0-workflow, no-filter) case', () => {
    expect(
      isFirstRun(
        deriveState({ isLoading: false, isError: false, filteredWorkflows: [], anyFiltersActive: false }),
      ),
    ).toBe(true);
  });

  it('does NOT suppress chrome at sparse (1–2 workflows) — the chrome MAY remain', () => {
    const state = deriveState({
      isLoading: false,
      isError: false,
      filteredWorkflows: [makeWorkflow()],
      anyFiltersActive: false,
    });
    expect(state).toBe('sparse');
    expect(isFirstRun(state)).toBe(false);
  });

  it('does NOT suppress chrome at ready (3+ workflows)', () => {
    const workflows = [makeWorkflow({ id: '1' }), makeWorkflow({ id: '2' }), makeWorkflow({ id: '3' })];
    const state = deriveState({ isLoading: false, isError: false, filteredWorkflows: workflows, anyFiltersActive: false });
    expect(isFirstRun(state)).toBe(false);
  });

  it('does NOT treat "no-results" (filters active, nothing matched) as first-run', () => {
    // A user who filtered to zero is NOT a newcomer — keep the chrome so they can
    // clear the filter; the tutorial is only the genuine 0-workflow case.
    const state = deriveState({ isLoading: false, isError: false, filteredWorkflows: [], anyFiltersActive: true });
    expect(state).toBe('no-results');
    expect(isFirstRun(state)).toBe(false);
  });

  it('does NOT suppress chrome while loading or on error', () => {
    expect(isFirstRun(deriveState({ isLoading: true, isError: false, filteredWorkflows: [], anyFiltersActive: false }))).toBe(false);
    expect(isFirstRun(deriveState({ isLoading: false, isError: true, filteredWorkflows: [], anyFiltersActive: false }))).toBe(false);
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
 *
 * WDC2-P03 (iter-067): added time_range parameter — defaults to 'all' to
 * reflect the new default state and keep existing call-sites backwards-compat.
 */
function buildDashboardV2ViewedEvent(params: {
  workflowCount: number;
  filtersState: { systems: string[]; opportunity: string | null; healthStatus: string | null; needsAttention: boolean };
  insightFilterKey: string | null;
  activePortfolioId: string | null;
  timeRange?: '7d' | '30d' | '90d' | 'all';
}): { event: string; workflowCount: number; hasActiveFilters: boolean; portfolioFilterActive: boolean; time_range: '7d' | '30d' | '90d' | 'all' } {
  const { workflowCount, filtersState, insightFilterKey, activePortfolioId, timeRange = 'all' } = params;
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
    time_range: timeRange,
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

  // WDC2-P03 (iter-067): time_range analytics prereq
  it('time_range defaults to "all" (WDC2-P03: new default reflects CEO Signal 1)', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
      // no timeRange param — defaults to 'all'
    });
    expect(ev.time_range).toBe('all');
  });

  it('time_range reflects explicit non-"all" selection (e.g. "30d")', () => {
    const ev = buildDashboardV2ViewedEvent({
      workflowCount: 3,
      filtersState: baseFilters,
      insightFilterKey: null,
      activePortfolioId: null,
      timeRange: '30d',
    });
    expect(ev.time_range).toBe('30d');
  });
});

// ── MDR-P09: bounce detection predicate (iter-038 / PRD §4 metric #2) ────────

/**
 * shouldEmitBounce extracts the pure decision logic from the beforeunload
 * handler so it can be unit-tested without JSDOM beforeunload complexities.
 *
 * Logic mirrors DashboardV2Shell's handleBeforeUnload:
 *   - viewFired must be true (dashboard_v2_viewed was emitted this mount)
 *   - clickCount must be 0 (user never interacted)
 */
function shouldEmitBounce(viewFired: boolean, clickCount: number): boolean {
  if (!viewFired) return false;
  if (clickCount > 0) return false;
  return true;
}

/**
 * computeBounceElapsedMs mirrors the elapsedMsSinceDashboardView derivation
 * in handleBeforeUnload.
 */
function computeBounceElapsedMs(
  dashboardViewPerfTimestampMs: number,
  nowPerfMs: number,
): number {
  if (dashboardViewPerfTimestampMs <= 0) return 0;
  return Math.max(0, Math.round(nowPerfMs - dashboardViewPerfTimestampMs));
}

describe('MDR-P09: bounce detection predicate (shouldEmitBounce)', () => {
  it('emits bounce when view fired and zero clicks', () => {
    expect(shouldEmitBounce(true, 0)).toBe(true);
  });

  it('does NOT emit bounce when view fired but user clicked once', () => {
    expect(shouldEmitBounce(true, 1)).toBe(false);
  });

  it('does NOT emit bounce when user clicked multiple times', () => {
    expect(shouldEmitBounce(true, 5)).toBe(false);
  });

  it('does NOT emit bounce when view has not fired (page abandoned before data loaded)', () => {
    expect(shouldEmitBounce(false, 0)).toBe(false);
  });

  it('does NOT emit bounce when view not fired even if clicks somehow registered', () => {
    // Edge case: click before view (should not be possible per listener lifecycle, but guard holds)
    expect(shouldEmitBounce(false, 3)).toBe(false);
  });
});

describe('MDR-P09: bounce elapsed-ms derivation', () => {
  it('returns elapsed ms between view-timestamp and page-exit time', () => {
    const viewTs = 1000;
    const exitTs = 3500;
    expect(computeBounceElapsedMs(viewTs, exitTs)).toBe(2500);
  });

  it('returns 0 when view timestamp was not yet set (pre-data-load exit)', () => {
    expect(computeBounceElapsedMs(0, 5000)).toBe(0);
  });

  it('clamps to 0 if clock skew produces negative value (defensive)', () => {
    // nowPerfMs < dashboardViewPerfTimestampMs would be impossible in normal
    // operation but Math.max(0, ...) guards defensively.
    expect(computeBounceElapsedMs(5000, 4999)).toBe(0);
  });
});

// ── MDR-P09: userPlan side-channel enrichment (iter-038 / PRD §4 metrics #3/#4/#6) ─

/**
 * buildEnrichedEvent mirrors the enrichment logic in analytics.ts track():
 *   - spread payload
 *   - add timestamp + url
 *   - if __ledgerium_userPlan is set, merge it into the event as userPlan
 *
 * This test validates the pure enrichment logic independently of the browser
 * runtime so it runs cleanly in vitest node environment.
 */
function buildEnrichedEvent(
  payload: Record<string, unknown>,
  userPlanSlot: string | null | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...payload, timestamp: new Date().toISOString() };
  if (userPlanSlot != null) base.userPlan = userPlanSlot;
  return base;
}

describe('MDR-P09: userPlan enrichment via side-channel', () => {
  it('userPlan is present on event when plan is set in side-channel', () => {
    const ev = buildEnrichedEvent({ event: 'dashboard_v2_viewed', workflowCount: 3 }, 'starter');
    expect(ev.userPlan).toBe('starter');
  });

  it('userPlan is absent when side-channel is null (API omitted plan)', () => {
    const ev = buildEnrichedEvent({ event: 'dashboard_v2_viewed', workflowCount: 3 }, null);
    expect(ev.userPlan).toBeUndefined();
  });

  it('userPlan is absent when side-channel is undefined (never set)', () => {
    const ev = buildEnrichedEvent({ event: 'dashboard_v2_viewed', workflowCount: 3 }, undefined);
    expect(ev.userPlan).toBeUndefined();
  });

  it('userPlan propagates to any event type (e.g. workflow_row_clicked)', () => {
    const ev = buildEnrichedEvent(
      { event: 'workflow_row_clicked', workflowId: 'wf-1', healthBand: 'green', elapsedMsSinceDashboardView: 300 },
      'pro',
    );
    expect(ev.userPlan).toBe('pro');
    expect(ev.event).toBe('workflow_row_clicked');
  });

  it('userPlan updates when API re-fetch returns a different plan', () => {
    // Simulate plan upgrade: first fetch returns 'free', upgrade happens, re-fetch returns 'starter'
    const ev1 = buildEnrichedEvent({ event: 'dashboard_v2_viewed', workflowCount: 1 }, 'free');
    const ev2 = buildEnrichedEvent({ event: 'dashboard_v2_viewed', workflowCount: 1 }, 'starter');
    expect(ev1.userPlan).toBe('free');
    expect(ev2.userPlan).toBe('starter');
    // The two events reflect different plan states — correct for longitudinal analysis
    expect(ev1.userPlan).not.toBe(ev2.userPlan);
  });
});

// ── MDR-P03 DashboardV2Shell view-perf-timestamp reactive state (iter-037) ─────

/**
 * Simulates the elapsedMs computation that WorkflowRow performs using
 * dashboardViewPerfTimestampMs.  Validates the guard contract that prevents
 * zero-elapsed events before the timestamp state is set.
 */
function computeElapsedMs(
  dashboardViewPerfTimestampMs: number,
  clickPerfNow: number,
): number | null {
  // Guard: if timestamp has not yet been set (still 0), do not emit elapsed.
  if (dashboardViewPerfTimestampMs === 0) return null;
  return Math.max(0, clickPerfNow - dashboardViewPerfTimestampMs);
}

describe('MDR-P03 DashboardV2Shell view-perf-timestamp reactive state (iter-037)', () => {
  it('early click before timestamp is set returns null (not 0)', () => {
    // dashboardViewPerfTimestampMs is 0 before the useEffect fires
    const elapsed = computeElapsedMs(0, performance.now());
    expect(elapsed).toBeNull();
  });

  it('post-state-set click returns a non-negative elapsed value', () => {
    const setAt = performance.now();
    // Simulate a click 50ms after the timestamp was set
    const clickAt = setAt + 50;
    const elapsed = computeElapsedMs(setAt, clickAt);
    expect(elapsed).not.toBeNull();
    expect(elapsed!).toBeGreaterThanOrEqual(0);
  });

  it('elapsed values are monotonically non-decreasing for sequential clicks', () => {
    const setAt = performance.now();
    const click1 = setAt + 100;
    const click2 = setAt + 200;
    const click3 = setAt + 350;

    const e1 = computeElapsedMs(setAt, click1)!;
    const e2 = computeElapsedMs(setAt, click2)!;
    const e3 = computeElapsedMs(setAt, click3)!;

    expect(e2).toBeGreaterThan(e1);
    expect(e3).toBeGreaterThan(e2);
  });

  it('converting ref to state means prop updates reactively (structural contract)', () => {
    // This test validates the structural contract: state setter is called in the
    // effect, which triggers a re-render, so WorkflowRow receives the updated
    // value — unlike a ref which does NOT trigger re-render.
    // We verify this via the pure computation: the guard catches 0 pre-effect,
    // and positive values post-effect.
    const preEffect = computeElapsedMs(0, 10);
    const postEffect = computeElapsedMs(100, 150);

    expect(preEffect).toBeNull();        // pre-effect: no elapsed emitted
    expect(postEffect).toBe(50);         // post-effect: 150 - 100 = 50ms
  });
});

// ── FOLLOWUP-037-02: filterByTimeRange deterministic clock (iter-045) ─────────

/**
 * Frozen epoch so all tests are wall-clock-independent.
 * Chosen as a round number near 2023-11-14T00:00:00Z.
 */
const FROZEN_NOW = 1_700_000_000_000;

/** Milliseconds in common time windows */
const MS_7D  = 7  * 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;
const MS_90D = 90 * 24 * 60 * 60 * 1000;

function makeTimeWorkflow(id: string, createdAtMs: number): WorkflowRowData {
  return makeWorkflow({
    id,
    createdAt: new Date(createdAtMs).toISOString(),
  });
}

describe('FOLLOWUP-037-02: filterByTimeRange deterministic clock (iter-045)', () => {
  it('1. deterministic repeat-call: 5 calls with identical inputs produce identical result lengths', () => {
    const wf = makeTimeWorkflow('w1', FROZEN_NOW - MS_7D + 1000); // inside 7d window
    const results = Array.from({ length: 5 }, () =>
      filterByTimeRange([wf], '7d', FROZEN_NOW),
    );
    const sizes = new Set(results.map((r) => r.length));
    expect(sizes.size).toBe(1);
    expect(results[0]).toHaveLength(1);
  });

  it('2. range="all" short-circuit: returns input array unchanged regardless of nowMs', () => {
    const workflows = [
      makeTimeWorkflow('a', FROZEN_NOW - MS_90D * 10), // very old
      makeTimeWorkflow('b', FROZEN_NOW - 1000),
    ];
    const result = filterByTimeRange(workflows, 'all', FROZEN_NOW);
    expect(result).toHaveLength(2);
    expect(result).toEqual(workflows);
  });

  it('3. 7d boundary inclusive: workflow at exactly 7 days ago is INCLUDED', () => {
    const wf = makeTimeWorkflow('exact7d', FROZEN_NOW - MS_7D);
    const result = filterByTimeRange([wf], '7d', FROZEN_NOW);
    expect(result).toHaveLength(1);
  });

  it('4. 7d boundary exclusive: workflow 1 ms before 7-day cutoff is EXCLUDED', () => {
    const wf = makeTimeWorkflow('just-outside-7d', FROZEN_NOW - MS_7D - 1);
    const result = filterByTimeRange([wf], '7d', FROZEN_NOW);
    expect(result).toHaveLength(0);
  });

  it('5. 30d boundary inclusive: workflow at exactly 30 days ago is INCLUDED', () => {
    const wf = makeTimeWorkflow('exact30d', FROZEN_NOW - MS_30D);
    const result = filterByTimeRange([wf], '30d', FROZEN_NOW);
    expect(result).toHaveLength(1);
  });

  it('6. 30d boundary exclusive: workflow 1 ms before 30-day cutoff is EXCLUDED', () => {
    const wf = makeTimeWorkflow('just-outside-30d', FROZEN_NOW - MS_30D - 1);
    const result = filterByTimeRange([wf], '30d', FROZEN_NOW);
    expect(result).toHaveLength(0);
  });

  it('7. 90d boundary inclusive: workflow at exactly 90 days ago is INCLUDED', () => {
    const wf = makeTimeWorkflow('exact90d', FROZEN_NOW - MS_90D);
    const result = filterByTimeRange([wf], '90d', FROZEN_NOW);
    expect(result).toHaveLength(1);
  });

  it('8. 90d boundary exclusive: workflow 1 ms before 90-day cutoff is EXCLUDED', () => {
    const wf = makeTimeWorkflow('just-outside-90d', FROZEN_NOW - MS_90D - 1);
    const result = filterByTimeRange([wf], '90d', FROZEN_NOW);
    expect(result).toHaveLength(0);
  });

  it('9. advancing nowMs with fixed createdAt changes inclusion', () => {
    const createdAtMs = FROZEN_NOW - MS_30D + 1000; // 1 second inside 30d window at FROZEN_NOW
    const wf = makeTimeWorkflow('sliding', createdAtMs);

    // At FROZEN_NOW: createdAt is within the 30d window → included
    const resultInWindow = filterByTimeRange([wf], '30d', FROZEN_NOW);
    expect(resultInWindow).toHaveLength(1);

    // Advance nowMs by 2 seconds: cutoff = (FROZEN_NOW + 2000) - MS_30D = createdAtMs + 1000
    // createdAtMs < new cutoff → excluded
    const nowAdvanced = FROZEN_NOW + 2000;
    const resultOutOfWindow = filterByTimeRange([wf], '30d', nowAdvanced);
    expect(resultOutOfWindow).toHaveLength(0);
  });

  it('10. empty input: filterByTimeRange([], "30d", nowMs) returns []', () => {
    const result = filterByTimeRange([], '30d', FROZEN_NOW);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('11. all-out-of-range: every workflow older than cutoff returns []', () => {
    const workflows = [
      makeTimeWorkflow('old1', FROZEN_NOW - MS_30D - 1000),
      makeTimeWorkflow('old2', FROZEN_NOW - MS_30D - 5000),
      makeTimeWorkflow('old3', FROZEN_NOW - MS_30D * 2),
    ];
    const result = filterByTimeRange(workflows, '30d', FROZEN_NOW);
    expect(result).toHaveLength(0);
  });

  it('12. mixed input: only in-window subset returns', () => {
    const workflows = [
      makeTimeWorkflow('in1',  FROZEN_NOW - 1000),              // 1s ago — in 7d
      makeTimeWorkflow('in2',  FROZEN_NOW - MS_7D + 1000),      // 1s inside 7d boundary — in
      makeTimeWorkflow('out1', FROZEN_NOW - MS_7D - 1),         // 1ms outside 7d — out
      makeTimeWorkflow('out2', FROZEN_NOW - MS_30D),            // exactly at 30d — out of 7d
      makeTimeWorkflow('out3', FROZEN_NOW - MS_90D),            // way old — out
    ];
    const result = filterByTimeRange(workflows, '7d', FROZEN_NOW);
    expect(result).toHaveLength(2);
    expect(result.map((w) => w.id).sort()).toEqual(['in1', 'in2']);
  });

  it('13. pure function — no global state: round-trip with different nowMs then back yields original result', () => {
    const wf = makeTimeWorkflow('rtrip', FROZEN_NOW - MS_30D + 5000); // inside 30d at FROZEN_NOW

    const firstCall  = filterByTimeRange([wf], '30d', FROZEN_NOW);
    // Advance time so workflow is excluded
    const secondCall = filterByTimeRange([wf], '30d', FROZEN_NOW + MS_30D);
    // Back to original nowMs — must reproduce first call's result
    const thirdCall  = filterByTimeRange([wf], '30d', FROZEN_NOW);

    expect(firstCall).toHaveLength(1);
    expect(secondCall).toHaveLength(0);
    expect(thirdCall).toHaveLength(1);
    expect(thirdCall[0]!.id).toBe(firstCall[0]!.id);
  });
});

// ── WDC2-P03 (iter-067): 'all' range edge-behavior ───────────────────────────
//
// Supplements the existing test 2 (range="all" short-circuit) with additional
// edge cases that the new 'all' default makes load-bearing:
//   - very old workflows (365 days)
//   - N=1000 performance smoke test
//   - epoch-boundary createdAt (new Date(0))
//   - empty input passes through cleanly under 'all'

describe("WDC2-P03: filterByTimeRange 'all' range edge cases (iter-067)", () => {
  it("14. 'all' returns 365-day-old workflow (no date cutoff applied)", () => {
    const MS_365D = 365 * 24 * 60 * 60 * 1000;
    const wf = makeTimeWorkflow('year-old', FROZEN_NOW - MS_365D);
    const result = filterByTimeRange([wf], 'all', FROZEN_NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('year-old');
  });

  it("15. 'all' returns all N=1000 workflows (performance smoke — no filter applied)", () => {
    const workflows = Array.from({ length: 1000 }, (_, i) =>
      makeTimeWorkflow(`wf-${i}`, FROZEN_NOW - i * 1000),
    );
    const result = filterByTimeRange(workflows, 'all', FROZEN_NOW);
    expect(result).toHaveLength(1000);
  });

  it("16. 'all' returns workflow with epoch-boundary createdAt (new Date(0).toISOString())", () => {
    // new Date(0) = 1970-01-01T00:00:00.000Z — the Unix epoch boundary
    const epochWorkflow = makeTimeWorkflow('epoch', 0);
    const result = filterByTimeRange([epochWorkflow], 'all', FROZEN_NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('epoch');
  });

  it("17. 'all' with empty input returns [] (identity on empty array)", () => {
    const result = filterByTimeRange([], 'all', FROZEN_NOW);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});
