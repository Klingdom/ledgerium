'use client';

/**
 * DashboardV2Shell — top-level layout for the Dashboard V2 experience.
 *
 * Owns:
 *  - Data fetching (fetch + useState, matching codebase pattern — TanStack Query
 *    not installed; see FRONTEND_NOTES deviation)
 *  - Time range state (D7: UI-only, default 30d)
 *  - Filter state (system, opportunity, health status)
 *  - Insight chip filter state
 *
 * Renders the 3 sections:
 *  1. CommandHeader
 *  2. InsightsStrip
 *  3. WorkflowList
 *
 * State machine derivation (PRD §9):
 *  - loading      → isLoading
 *  - error        → isError
 *  - empty        → workflows.length === 0 && !hasActiveFilters
 *  - no-results   → workflows.length === 0 && hasActiveFilters (after filter)
 *  - sparse       → 0 < filteredCount < 3 (before filters)
 *  - ready        → else
 *
 * Note: the state is derived from post-filter results so the list body
 * reflects the active filter context accurately.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Columns3 } from 'lucide-react';
import { track, setUserPlanForAnalytics } from '@/lib/analytics.js';
import CommandHeader, { type TimeRange } from './CommandHeader.js';
import InsightsStrip from './InsightsStrip.js';
import TopBand from './band/TopBand.js';
import type {
  OpportunityCounts,
  ActivityWeekBucket,
} from '@/lib/dashboard-band-stats.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import WorkflowList, {
  type WorkflowListState,
  applyFilters,
} from './WorkflowList.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import type { WorkflowRowData } from './WorkflowRow.js';
import type { InsightChip } from '@/lib/workflow-metrics.js';
import PortfolioSidebar, { type PortfolioNode } from '@/components/PortfolioSidebar.js';
import ColumnPicker, { type SaveStatus } from './ColumnPicker.js';
import PresetChipRail from './PresetChipRail.js';
import {
  type ColumnKey,
  type UserDashboardPreference,
  type SavedView,
  getDefaultVisibleColumns,
} from '@/lib/dashboard-columns/index.js';
import type { PresetDefinition } from '@/lib/dashboard-columns/presets.js';

// ── API response types ────────────────────────────────────────────────────────

interface WorkflowsApiResponse {
  workflows: WorkflowRowData[];
  stats: {
    portfolioHealthScore: number;
    /** Period-over-period delta; null if prior period has insufficient data (iter-024 §4.1 item a) */
    portfolioHealthScoreDelta: number | null;
    insightChips: InsightChip[];
    topInsights: Array<{ id: string; title: string; severity: string; insightType: string }>;
    /** MDR-P09 (b): server-resolved plan for free-vs-paid event segmentation */
    userPlan?: string;
    // ── Batch B (2026-06-12): top-of-page band aggregates ───────────────────
    recordedThisMonth?: number;
    aiOpportunityCount?: number;
    opportunityCounts?: OpportunityCounts;
    medianCycleTimeMs?: number | null;
    activityByWeek?: ActivityWeekBucket[];
  };
}

/** Default zeroed opportunity counts — used before data loads. */
const EMPTY_OPPORTUNITY_COUNTS: OpportunityCounts = {
  automate: 0,
  standardize: 0,
  optimize: 0,
  monitor: 0,
  healthy: 0,
};

// ── Default visible columns (ASK-1: 6-column initial default pack) ───────────

const DEFAULT_VISIBLE_KEYS: readonly ColumnKey[] = getDefaultVisibleColumns().map(
  (col) => col.key,
);

// ── Preferences API envelope type ─────────────────────────────────────────────

interface PreferencesApiResponse {
  data: {
    preferences: UserDashboardPreference;
    droppedKeys: readonly ColumnKey[];
    warnings: readonly string[];
  } | null;
  error: string | null;
  meta: { schemaVersion?: number };
}

// ── Minimum skeleton display to avoid flash ───────────────────────────────────

const SKELETON_MIN_MS = 300;

// ── Time range filter ─────────────────────────────────────────────────────────

/**
 * MDR-P03 site 7 / FOLLOWUP-037-02 (iter 045): age-based filter uses an
 * injected upstream clock so repeated calls within the same render cycle
 * yield identical results. See route.ts:485-487 for the canonical pattern.
 */
export function filterByTimeRange(
  workflows: WorkflowRowData[],
  range: TimeRange,
  nowMs: number,
): WorkflowRowData[] {
  if (range === 'all') return workflows;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = nowMs - days * 24 * 60 * 60 * 1000;
  return workflows.filter((w) => new Date(w.createdAt).getTime() >= cutoff);
}

// ── Extract unique systems from workflow set ──────────────────────────────────

function extractSystems(workflows: WorkflowRowData[]): string[] {
  const seen = new Set<string>();
  for (const w of workflows) {
    for (const s of w.toolsUsed) {
      seen.add(s);
    }
  }
  return Array.from(seen).sort();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardV2Shell() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [allWorkflows, setAllWorkflows] = useState<WorkflowRowData[]>([]);
  const [portfolioHealthScore, setPortfolioHealthScore] = useState<number | null>(null);
  const [portfolioHealthScoreDelta, setPortfolioHealthScoreDelta] = useState<number | null>(null);
  const [insightChips, setInsightChips] = useState<InsightChip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // ── Batch B (2026-06-12): top-of-page band aggregates ───────────────────────
  const [recordedThisMonth, setRecordedThisMonth] = useState<number>(0);
  const [aiOpportunityCount, setAiOpportunityCount] = useState<number>(0);
  const [opportunityCounts, setOpportunityCounts] = useState<OpportunityCounts>(
    EMPTY_OPPORTUNITY_COUNTS,
  );
  const [medianCycleTimeMs, setMedianCycleTimeMs] = useState<number | null>(null);
  const [activityByWeek, setActivityByWeek] = useState<ActivityWeekBucket[]>([]);

  // D5: Portfolio sidebar state — collapsed by default per PRD §D5
  const [portfolioSidebarOpen, setPortfolioSidebarOpen] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioNode[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);

  // Enforce minimum skeleton display time
  const loadStartRef = useRef<number>(Date.now());

  // MDR-P03 site 6: converted from ref to state so WorkflowRow receives a
  // reactive prop update — early clicks before the effect fires no longer
  // observe the initial 0 value (which made PRD §4 metric #2 uncomputable).
  // Guard in the useEffect below ensures elapsedMs is only emitted after this
  // is set (non-zero), preserving the "no elapsed event before viewed" contract.
  const [dashboardViewPerfTimestampMs, setDashboardViewPerfTimestampMs] = useState<number>(0);

  // PRD §4 metric #1: fire dashboard_v2_viewed once per mount, after data loads.
  // Guard ensures it fires exactly once even if allWorkflows updates again.
  const dashboardViewFiredRef = useRef<boolean>(false);

  // MDR-P09 (b): server-resolved plan for free-vs-paid event segmentation.
  const [userPlan, setUserPlan] = useState<string | undefined>(undefined);

  // MDR-P09 (a): bounce detection — counts trackable click interactions since
  // dashboard_v2_viewed fired.  useRef avoids re-renders; incremented by a
  // capture-phase click listener attached to the shell root div.
  const clickCountSinceViewRef = useRef<number>(0);
  const shellRootRef = useRef<HTMLDivElement | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  // WDC2-P03 (iter-067): default changed '30d' → 'all' per CEO Signal 1.
  // 8-of-8 agent convergence in WORKFLOWS_DASHBOARD_REVIEW_002: process
  // intelligence defaults to full event-log view (Celonis / UiPath / Apromore
  // pattern), not rolling-window (Datadog / Mixpanel operational-monitoring).
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [filters, setFilters] = useState<FilterState>({
    systems: [],
    opportunity: null,
    healthStatus: null,
    needsAttention: false,
  });
  const [insightFilterKey, setInsightFilterKey] = useState<string | null>(null);

  // ── Column picker state (D+4 iter-061) ──────────────────────────────────────

  /** The ordered list of column keys the user has chosen to display. */
  const [visibleColumns, setVisibleColumns] =
    useState<readonly ColumnKey[]>(DEFAULT_VISIBLE_KEYS);

  /** Whether the column picker drawer is open. */
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  /** Save status for the column picker footer indicator. */
  const [pickerSaveStatus, setPickerSaveStatus] = useState<SaveStatus>('idle');

  /** Error message to show when pickerSaveStatus === 'error'. */
  const [pickerSaveError, setPickerSaveError] = useState<string | null>(null);

  /** Ref to the "Customize columns" trigger button — focus returns here on close. */
  const pickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  /** Debounce timer for the preferences PUT request. */
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── D+5 SavedView state (iter-062) ──────────────────────────────────────────

  /** The user's named saved views. */
  const [savedViews, setSavedViews] = useState<readonly SavedView[]>([]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    const elapsed = Date.now() - loadStartRef.current;
    const remainingDelay = Math.max(0, SKELETON_MIN_MS - elapsed);

    try {
      const res = await fetch('/api/workflows?sort=health_score&dir=asc');
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data = (await res.json()) as WorkflowsApiResponse;

      // Enforce minimum skeleton display
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      setAllWorkflows(data.workflows ?? []);
      setPortfolioHealthScore(data.stats?.portfolioHealthScore ?? null);
      setPortfolioHealthScoreDelta(data.stats?.portfolioHealthScoreDelta ?? null);
      setInsightChips(data.stats?.insightChips ?? []);
      // Batch B (2026-06-12): hydrate top-of-page band aggregates.
      setRecordedThisMonth(data.stats?.recordedThisMonth ?? 0);
      setAiOpportunityCount(data.stats?.aiOpportunityCount ?? 0);
      setOpportunityCounts(data.stats?.opportunityCounts ?? EMPTY_OPPORTUNITY_COUNTS);
      setMedianCycleTimeMs(data.stats?.medianCycleTimeMs ?? null);
      setActivityByWeek(data.stats?.activityByWeek ?? []);
      // MDR-P09 (b): set plan for event segmentation (side-channel enriches all
      // subsequent track() calls; see setUserPlanForAnalytics in analytics.ts).
      const plan = data.stats?.userPlan;
      setUserPlan(plan);
      setUserPlanForAnalytics(plan);
      setIsError(false);
    } catch {
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    loadStartRef.current = Date.now();
    void fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    loadStartRef.current = Date.now();
    void fetchWorkflows();
  }, [fetchWorkflows]);

  // PRD §4 metric #1: emit dashboard_v2_viewed once after data is available.
  // Fires when loading completes (either success or error) and hasn't yet fired this mount.
  // Uses state values directly (not derived anyFiltersActive) to avoid TDZ in closure.
  useEffect(() => {
    if (isLoading) return;
    if (dashboardViewFiredRef.current) return;
    dashboardViewFiredRef.current = true;
    setDashboardViewPerfTimestampMs(performance.now());
    const filtersActive =
      filters.systems.length > 0 ||
      filters.opportunity !== null ||
      filters.healthStatus !== null ||
      filters.needsAttention ||
      insightFilterKey !== null;
    track({
      event: 'dashboard_v2_viewed',
      workflowCount: allWorkflows.length,
      hasActiveFilters: filtersActive,
      portfolioFilterActive: activePortfolioId !== null,
      // WDC2-P03 (iter-067): time_range analytics prereq — segment by active
      // filter at dashboard load so per-range retention is computable.
      time_range: timeRange,
    });
  // Intentional: this effect is a "fire once on first data load" pattern.
  // allWorkflows.length is the trigger signal — other deps are snapshot values at emission time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, allWorkflows.length]);

  // D5: fetch portfolios for the sidebar (best-effort — sidebar is supplementary)
  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const res = await fetch('/api/portfolios');
        if (!res.ok) return;
        const data = (await res.json()) as { portfolios?: PortfolioNode[] };
        setPortfolios(data.portfolios ?? []);
      } catch {
        // Portfolio fetch failure is non-critical — sidebar stays empty
      }
    }
    void fetchPortfolios();
  }, []);

  // D+4 (iter-061): Load saved column preferences on mount.
  // D+5 (iter-062): Also loads savedViews from the same GET response.
  // Falls back to DEFAULT_VISIBLE_KEYS if the API is unavailable or user has
  // no stored preferences.  Errors are swallowed — customization is progressive
  // enhancement and a missing preferences endpoint should not break the dashboard.
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/dashboard/preferences');
        if (!res.ok) return; // 401 or server error — use defaults silently
        const body = (await res.json()) as PreferencesApiResponse;
        if (body.data?.preferences?.visibleColumns) {
          setVisibleColumns(body.data.preferences.visibleColumns);
        }
        if (Array.isArray(body.data?.preferences?.savedViews)) {
          setSavedViews(body.data.preferences.savedViews);
        }
      } catch {
        // Network error — keep defaults; non-critical
      }
    }
    void loadPreferences();
  }, []);

  // D+4 (iter-061): Debounced PUT to persist column preferences (400ms after last toggle).
  // D+5 (iter-062): Extended to also persist savedViews when they change.
  // Cleanup cancels any pending timer on unmount to prevent state updates on unmounted component.
  const scheduleSave = useCallback(
    (nextVisible: readonly ColumnKey[], nextSavedViews?: readonly SavedView[]) => {
      if (saveDebounceRef.current !== null) {
        clearTimeout(saveDebounceRef.current);
      }
      setPickerSaveStatus('saving');
      setPickerSaveError(null);

      // Capture current savedViews via closure; caller may pass updated views
      saveDebounceRef.current = setTimeout(() => {
        async function persist() {
          try {
            const res = await fetch('/api/dashboard/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                visibleColumns: nextVisible,
                // columnOrder tracks the same order as visibleColumns for now;
                // drag-and-drop reorder is deferred to a future iteration.
                columnOrder: nextVisible,
                // D+5: include savedViews in the payload
                ...(nextSavedViews !== undefined
                  ? { savedViews: nextSavedViews }
                  : {}),
              }),
            });
            if (!res.ok) {
              const err = (await res.json()) as { error?: string };
              throw new Error(err.error ?? `HTTP ${res.status}`);
            }
            setPickerSaveStatus('saved');
            // Briefly show "Saved" then reset to idle
            setTimeout(() => { setPickerSaveStatus('idle'); }, 1500);
          } catch (err) {
            setPickerSaveStatus('error');
            setPickerSaveError(
              err instanceof Error ? err.message : 'Could not save — changes not persisted.',
            );
          }
        }
        void persist();
      }, 400);
    },
    [],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveDebounceRef.current !== null) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  // D+4 (iter-061): Toggle a column's visibility.
  // Optimistic update — local state is updated synchronously; debounced PUT follows.
  const handleToggleColumn = useCallback(
    (key: ColumnKey, nextVisible: boolean) => {
      setVisibleColumns((prev) => {
        const next = nextVisible
          ? [...prev, key]
          : prev.filter((k) => k !== key);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  // D+5 (iter-062): SavedView CRUD — update savedViews array and persist.
  const handleSavedViewsChange = useCallback(
    (nextViews: readonly SavedView[]) => {
      setSavedViews(nextViews);
      // Persist immediately (no debounce needed — user-initiated save actions
      // are infrequent; debounce is only needed for rapid toggle sequences).
      scheduleSave(visibleColumns, nextViews);
    },
    [scheduleSave, visibleColumns],
  );

  // D+5 (iter-062): Apply a saved view (update column config + filters).
  // Note: the shell owns filter state via the existing FilterState type;
  // SavedView filters are FilterSet (D+2) which is different from FilterState
  // (UI-layer composite). Applying a saved view updates visibleColumns only
  // for now; full filter apply deferred to D+6 when filter UI integration
  // between FilterState and FilterSet is resolved (scope-adjacent observation).
  const handleApplySavedView = useCallback(
    (view: SavedView) => {
      setVisibleColumns(view.visibleColumns);
      scheduleSave(view.visibleColumns, undefined);
    },
    [scheduleSave],
  );

  // D+5 (iter-062): Apply a preset chip — update visibleColumns + columnOrder.
  // The preset catalog defines filters as FilterSet (D+2); similar to saved views,
  // full filter apply is a scope-adjacent observation (D+6 scope).
  const handleApplyPreset = useCallback(
    (preset: PresetDefinition) => {
      setVisibleColumns(preset.visibleColumns);
      scheduleSave(preset.visibleColumns, undefined);
    },
    [scheduleSave],
  );

  // D+5 (iter-062): Derive the current preferences snapshot for the chip rail
  // (active-state detection).
  const currentPreferencesSnapshot: UserDashboardPreference = useMemo(
    () => ({
      schemaVersion: 1,
      visibleColumns,
      columnOrder: visibleColumns,
      filters: [],
      savedViews,
    }),
    [visibleColumns, savedViews],
  );

  // MDR-P09 (a): capture-phase click counter.  Attaches to the shell root div
  // once dashboard_v2_viewed has fired; increments clickCountSinceViewRef on
  // any click bubble so beforeunload can distinguish bounce from engagement.
  useEffect(() => {
    const el = shellRootRef.current;
    if (!el || !dashboardViewFiredRef.current) return;
    const handleClick = () => { clickCountSinceViewRef.current += 1; };
    el.addEventListener('click', handleClick, true); // capture phase
    return () => { el.removeEventListener('click', handleClick, true); };
  // Re-run when dashboardViewFiredRef.current transitions to true (after view fires).
  // The dependency on dashboardViewPerfTimestampMs is a proxy for that transition.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardViewPerfTimestampMs]);

  // MDR-P09 (a): beforeunload bounce emission.  Fires dashboard_bounced when
  // the user exits without any tracked click interaction.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!dashboardViewFiredRef.current) return; // view never fired — not a bounce
      if (clickCountSinceViewRef.current > 0) return; // user engaged — not a bounce
      const elapsedMsSinceDashboardView = dashboardViewPerfTimestampMs > 0
        ? Math.max(0, Math.round(performance.now() - dashboardViewPerfTimestampMs))
        : 0;
      track({
        event: 'dashboard_bounced',
        workflowCount: allWorkflows.length,
        elapsedMsSinceDashboardView,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  // allWorkflows.length and dashboardViewPerfTimestampMs are snapshot values read
  // inside the handler — they must be in deps so the closure captures latest values.
  }, [allWorkflows.length, dashboardViewPerfTimestampMs]);

  // #49: kebab rename — update local workflow title without re-fetch
  const handleWorkflowRename = useCallback((id: string, newTitle: string) => {
    setAllWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, title: newTitle } : w)),
    );
  }, []);

  // #49: kebab archive — remove from local list immediately (optimistic)
  const handleWorkflowArchive = useCallback((id: string) => {
    setAllWorkflows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // MDR-P03: stable clock reference for age-based filters within this render
  // cycle.  filterByTimeRange (FOLLOWUP-037-02 iter 045) and applyFilters
  // (iter 037) both consume this snapshot so both call sites observe identical
  // time-window boundaries regardless of wall-clock drift mid-render.
  const filterNowMs = useMemo(() => Date.now(), []);

  // Apply time range (UI-only, D7)
  const timeFilteredWorkflows = filterByTimeRange(allWorkflows, timeRange, filterNowMs);

  // D5: apply portfolio filter if a portfolio is selected
  // Scaffold: client-side grouping by workflow.portfolioIds (if present) or "Uncategorized"
  // Follow-up: full API-driven portfolio filtering (see follow-up note in render)
  const portfolioFilteredWorkflows =
    activePortfolioId === null
      ? timeFilteredWorkflows
      : timeFilteredWorkflows.filter((w) => {
          // WorkflowRowData may have portfolioIds field from the API response
          const wWithPortfolio = w as WorkflowRowData & { portfolioIds?: string[] };
          return (
            wWithPortfolio.portfolioIds?.includes(activePortfolioId) ??
            activePortfolioId === 'uncategorized'
          );
        });

  // Apply user filters + insight filter to determine UI state
  const filteredWorkflows = applyFilters(portfolioFilteredWorkflows, filters, insightFilterKey, filterNowMs);

  const availableSystems = extractSystems(allWorkflows);

  // Batch B (2026-06-12): band-only derived counts from the full set.
  // highVariationCount drives the narrator; cycleTimeSampleCount is the honest
  // denominator for the median-cycle-time tile ("across N workflows").
  const highVariationCount = useMemo(
    () => allWorkflows.filter((w) => w.metricsV2.variationLabel === 'high').length,
    [allWorkflows],
  );
  const cycleTimeSampleCount = useMemo(
    () => allWorkflows.filter((w) => w.metricsV2.avgTimeMs != null).length,
    [allWorkflows],
  );

  // Batch B: toggle the opportunity filter when an OpportunityBar segment is clicked.
  const handleOpportunitySegmentClick = useCallback((tag: OpportunityTag) => {
    setFilters((prev) => ({
      ...prev,
      opportunity: prev.opportunity === tag ? null : tag,
    }));
  }, []);

  const anyFiltersActive =
    hasActiveFilters(filters) || insightFilterKey !== null;

  // Derive UI state
  function deriveState(): WorkflowListState {
    if (isLoading) return 'loading';
    if (isError) return 'error';
    if (filteredWorkflows.length === 0 && !anyFiltersActive) return 'empty';
    if (filteredWorkflows.length === 0 && anyFiltersActive) return 'no-results';
    if (filteredWorkflows.length < 3) return 'sparse';
    return 'ready';
  }
  const listState = deriveState();

  // Top insight: highest-severity chip
  const topInsight =
    insightChips.length > 0
      ? insightChips.reduce((best, chip) => {
          const order: Record<InsightChip['severity'], number> = {
            critical: 4,
            warning: 3,
            info: 2,
            positive: 1,
          };
          return order[chip.severity] > order[best.severity] ? chip : best;
        })
      : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      ref={shellRootRef}
      className="flex flex-col gap-0 min-h-0"
      role="region"
      aria-label="Workflow intelligence dashboard"
    >
      {/* Section 1: Command Header */}
      <CommandHeader
        portfolioHealthScore={isLoading ? null : portfolioHealthScore}
        portfolioHealthScoreDelta={isLoading ? null : portfolioHealthScoreDelta}
        topInsight={topInsight}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        workflowCount={allWorkflows.length}
      />

      {/* Batch B (2026-06-12): top-of-page graphics band (mounts between header and list) */}
      <TopBand
        data={{
          isLoading,
          totalWorkflows: allWorkflows.length,
          recordedThisMonth,
          medianCycleTimeMs,
          cycleTimeSampleCount,
          automationCandidates: aiOpportunityCount,
          avgHealthScore: portfolioHealthScore,
          avgHealthScoreDelta: portfolioHealthScoreDelta,
          highVariationCount,
          opportunityCounts,
          activityByWeek,
        }}
        activeOpportunity={filters.opportunity}
        onOpportunitySegmentClick={handleOpportunitySegmentClick}
      />

      {/* Section 2: Insights Strip */}
      {!isLoading && !isError && insightChips.length > 0 && (
        <InsightsStrip
          chips={insightChips}
          activeFilterKey={insightFilterKey}
          onChipClick={(key) => {
            setInsightFilterKey((prev) => (prev === key ? null : key));
          }}
        />
      )}
      {/* Note: insight_chip_clicked event is emitted inside InsightsStrip itself */}

      {/* Sections 3+: sidebar + list layout */}
      <div className="flex flex-row gap-0 min-h-0">
        {/* D5: PortfolioSidebar — collapsed by default, expanded via filter bar button */}
        {portfolioSidebarOpen && (
          <aside
            id="portfolio-sidebar"
            aria-label="Portfolio navigation"
            className="flex-shrink-0 border-r border-[var(--border-subtle)]"
          >
            <PortfolioSidebar
              portfolios={portfolios}
              activePortfolioId={activePortfolioId}
              onSelectPortfolio={setActivePortfolioId}
              onCreatePortfolio={() => {
                // Full portfolio creation requires CreatePortfolioDialog — deferred to
                // follow-up: D5 portfolio API support (#50)
              }}
              onRefresh={() => {
                // Re-fetch portfolios on change
                fetch('/api/portfolios')
                  .then((r) => r.json())
                  .then((data: { portfolios?: PortfolioNode[] }) => {
                    setPortfolios(data.portfolios ?? []);
                  })
                  .catch(() => undefined);
              }}
              isCollapsed={false}
              onToggleCollapsed={() => setPortfolioSidebarOpen(false)}
            />
          </aside>
        )}

        {/* Section 3: Workflow Intelligence List — aria-live for filter announcements */}
        <div className="flex-1 min-w-0" aria-live="polite" aria-atomic="false">
          {/* D+5 (iter-062): Preset chip rail — above the "Customize columns" trigger */}
          <PresetChipRail
            currentPreferences={currentPreferencesSnapshot}
            onApplyPreset={handleApplyPreset}
            {...(userPlan !== undefined ? { userPlan } : {})}
          />

          {/* D+4 (iter-061): "Customize columns" trigger — positioned above the table */}
          <div className="flex justify-end px-ds-4 py-ds-2 border-b border-[var(--border-subtle)]">
            <button
              ref={pickerTriggerRef}
              type="button"
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="
                inline-flex items-center gap-ds-2 px-ds-3 py-ds-1.5 rounded-ds-sm
                text-[13px] font-medium text-[var(--content-secondary)]
                border border-[var(--border-default)]
                transition-colors duration-150
                hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
              "
              aria-label="Customize columns"
              aria-expanded={isPickerOpen}
              aria-haspopup="dialog"
            >
              <Columns3 size={14} aria-hidden="true" />
              Customize columns
            </button>
          </div>

          <WorkflowList
            state={listState}
            workflows={portfolioFilteredWorkflows}
            filters={filters}
            insightFilterKey={insightFilterKey}
            availableSystems={availableSystems}
            timeRange={timeRange}
            onFiltersChange={setFilters}
            onClearInsightFilter={() => setInsightFilterKey(null)}
            onRetry={handleRetry}
            onWorkflowRename={handleWorkflowRename}
            onWorkflowArchive={handleWorkflowArchive}
            portfolioSidebarOpen={portfolioSidebarOpen}
            onTogglePortfolioSidebar={() => setPortfolioSidebarOpen((prev) => !prev)}
            dashboardViewPerfTimestampMs={dashboardViewPerfTimestampMs}
            visibleColumns={visibleColumns}
          />
        </div>
      </div>

      {/* D+4+5 (iter-061/062): Column picker drawer — portal-style, z-indexed above the table */}
      <ColumnPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        saveStatus={pickerSaveStatus}
        saveError={pickerSaveError}
        triggerRef={pickerTriggerRef}
        savedViews={savedViews}
        currentFilters={[]}
        onSavedViewsChange={handleSavedViewsChange}
        onApplySavedView={handleApplySavedView}
      />
    </div>
  );
}
