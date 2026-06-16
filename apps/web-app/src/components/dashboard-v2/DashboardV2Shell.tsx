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
  type SortState,
  applyFilters,
} from './WorkflowList.js';
import type { FilterState, HealthStatusFilter } from './WorkflowListFilterBar.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import type { WorkflowRowData } from './WorkflowRow.js';
import type { InsightChip } from '@/lib/workflow-metrics.js';
import PortfolioSidebar, { type PortfolioNode } from '@/components/PortfolioSidebar.js';
import ColumnPicker, { type SaveStatus } from './ColumnPicker.js';
import UnifiedToolbar from './UnifiedToolbar.js';
import ActiveFiltersBar from './ActiveFiltersBar.js';
import {
  deriveActiveFilterChips,
  clearActiveFilterChip,
  CLEARED_FILTER_STATE,
  type ActiveFilterChip,
  type ActiveFilterState,
} from './activeFilters.js';
import LensSwitcher from './LensSwitcher.js';
import LssParetoPanel from './LssParetoPanel.js';
import { useDensity } from './density.js';
import { useLens } from './lens.js';
import {
  getLensConfig,
  DEFAULT_LENS,
  type Lens,
  type LensSortField,
} from '@/lib/dashboard-lenses/lenses.js';
import type { ParetoWorkflowInput } from '@/lib/dashboard-lenses/pareto.js';
import {
  type ColumnKey,
  type UserDashboardPreference,
  type SavedView,
  getDefaultVisibleColumns,
} from '@/lib/dashboard-columns/index.js';
import {
  getPresetById,
  type PresetDefinition,
  type PresetId,
} from '@/lib/dashboard-columns/presets.js';
import type { FilterSet } from '@/lib/dashboard-columns/filters.js';

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
    // ── SIGNALS batch (2026-06-16): observed library-facts counts ───────────
    // All additive, backward-compatible, and sourced from already-computed
    // engine output (no new engine math). Threaded so the band can surface them.
    needsReview?: number;
    recordedThisWeek?: number;
    totalRuns?: number;
    multiRunWorkflowCount?: number;
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
  // SIGNALS batch (2026-06-16): observed library-facts counts threaded from the
  // route stats (already-computed; needsReview + a sum/count over metricsV2.runs).
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);

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

  // atglance-review #10/#11: the active preset's ROW filters flow through the
  // single applyFilters pipeline (via FilterSet → evaluateFilterSet) so applying
  // a preset filters rows, not just columns. `activePresetId` drives the
  // active-filters bar chip + lets the chip rail show the applied preset.
  const [activePresetId, setActivePresetId] = useState<PresetId | null>(null);
  const [presetFilters, setPresetFilters] = useState<FilterSet | null>(null);

  // atglance-review #9: the workflow row to scroll-to + briefly highlight when a
  // Pareto bar is clicked (observed-only drill — navigates to the real row).
  const [highlightWorkflowId, setHighlightWorkflowId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Batch C unified-toolbar state ───────────────────────────────────────────

  // item 15: global search. `searchInput` is the raw controlled-input value;
  // `searchQuery` is the debounced value actually applied to the list (200ms,
  // matching the existing search debounce convention).
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // item 13: sort lifted to the shell so the toolbar Sort control and the
  // WorkflowList column headers share a single source of truth.  Default is
  // date_recorded desc (Batch A P0 item 3), identical to WorkflowList's prior
  // internal default.
  const [sort, setSort] = useState<SortState>({ field: 'date_recorded', dir: 'desc' });

  // item 13: filter panel open/closed (the WorkflowListFilterBar now lives in
  // an expandable panel inside the toolbar).
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // item 16: SSR-safe row density (default 'regular'; reconciles to localStorage
  // after mount — no hydration mismatch).
  const [density, setDensity] = useDensity();

  // ── Persona LENS state (DASHBOARD_PERSONAS_REVIEW_001 P0, v1) ─────────────────
  // SSR-safe active lens (default 'library'; reconciles to localStorage after
  // mount — no hydration mismatch). Switching is client-only — no refetch.
  const [activeLens, setLens] = useLens();

  // The user's library-lens column pack — the columns to restore when switching
  // back to 'library'. Tracks the persisted/picker columns so the LSS lens can
  // temporarily override the visible pack WITHOUT losing the user's choices.
  // Library renders EXACTLY these (today's behavior). Updated whenever the user
  // edits columns while in the library lens (see handleToggleColumn / load).
  const libraryColumnsRef = useRef<readonly ColumnKey[]>(DEFAULT_VISIBLE_KEYS);
  // The library lens's sort, captured so switching back restores it (LSS forces
  // its own default sort). Default mirrors the shell's initial sort.
  const librarySortRef = useRef<SortState>({ field: 'date_recorded', dir: 'desc' });
  // Mirror of the active lens for use inside effects with stable (empty) deps —
  // avoids re-running the mount-only preferences load when the lens changes.
  const activeLensRef = useRef<Lens>(activeLens);
  activeLensRef.current = activeLens;
  // Tracks whether the post-mount lens reconciliation has run, so it applies the
  // localStorage-restored lens pack/sort exactly once.
  const lensReconciledRef = useRef<boolean>(false);

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
      // SIGNALS batch (2026-06-16): observed needs-review count (route stat).
      setNeedsReviewCount(data.stats?.needsReview ?? 0);
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
      // atglance-review #20: the active lens at load (read via ref so this
      // fire-once effect captures the hydrated lens without adding a dep).
      lens: activeLensRef.current,
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
          const saved = body.data.preferences.visibleColumns;
          // The saved pack is the user's LIBRARY pack — remember it so the lens
          // switcher can restore it. Only push to live visibleColumns when the
          // library lens is active; a non-default lens owns the visible pack as
          // a view override (lens persistence is client-only / localStorage).
          libraryColumnsRef.current = saved;
          if (getLensConfig(activeLensRef.current).columnPack === null) {
            setVisibleColumns(saved);
          }
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

  // Batch C item 15: debounce the search input (200ms) before applying it to the
  // list — deterministic, no network. The debounce smooths rapid typing without
  // altering any data; an empty query is a no-op filter.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // D+4 (iter-061): Toggle a column's visibility.
  // Optimistic update — local state is updated synchronously; debounced PUT follows.
  const handleToggleColumn = useCallback(
    (key: ColumnKey, nextVisible: boolean) => {
      setVisibleColumns((prev) => {
        const next = nextVisible
          ? [...prev, key]
          : prev.filter((k) => k !== key);
        scheduleSave(next);
        // Keep the library-pack memory in sync when the user edits columns while
        // on the library lens, so a lens round-trip restores their edits.
        if (activeLensRef.current === 'library') {
          libraryColumnsRef.current = next;
        }
        return next;
      });
    },
    [scheduleSave],
  );

  // atglance-review #20: toggle the column picker and emit the open event only
  // on the false→true transition (never on close), so usage signal counts opens.
  const handleToggleColumnPicker = useCallback(() => {
    setIsPickerOpen((prev) => {
      const next = !prev;
      if (next) {
        track({
          event: 'dashboard_column_picker_opened',
          visibleColumnCount: visibleColumns.length,
        });
      }
      return next;
    });
  }, [visibleColumns.length]);

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

  // atglance-review #10: Apply a preset chip — update visibleColumns + columnOrder
  // AND apply the preset's ROW filters through the single applyFilters pipeline
  // (FilterSet → evaluateFilterSet). Closes the deferred "chips filter columns,
  // not rows" over-promise: "Automation Candidates" now actually shows automation
  // candidates.
  //
  // Applying a preset is a one-click VIEW: it replaces the ad-hoc filter
  // mechanisms (panel filters + opportunity segment + insight chip) with the
  // preset's own constraint, so the active-filters bar shows a single coherent
  // "Preset: …" chip rather than a confusing compound state. Search is preserved
  // (orthogonal free-text). The preset's FilterSet may be empty (e.g. Recent
  // Activity has no expressible row filter) — that honestly filters nothing,
  // changing only the columns, never fabricating a row constraint.
  const handleApplyPreset = useCallback(
    (preset: PresetDefinition) => {
      setVisibleColumns(preset.visibleColumns);
      scheduleSave(preset.visibleColumns, undefined);
      // Apply the preset's row filters via the single pipeline.
      setPresetFilters(preset.filters.length > 0 ? preset.filters : null);
      setActivePresetId(preset.id);
      // Clear the ad-hoc filter mechanisms so the preset is the dominant view.
      setFilters({ systems: [], opportunity: null, healthStatus: null, needsAttention: false });
      setInsightFilterKey(null);
      // PRD §4 / item #20: preset_view_applied was previously unwired for v2.
      track({ event: 'preset_view_applied', preset: preset.id });
    },
    [scheduleSave],
  );

  // ── Lens switch (DASHBOARD_PERSONAS_REVIEW_001 P0, v1) ────────────────────────
  // Switching lenses is CLIENT-ONLY: it re-frames the same in-memory workflows
  // (no refetch) and applies the lens's column pack + default sort. It MUST NOT
  // persist to the DB (the LSS pack is a view override, not the user's saved
  // library pack — persisting it would regress the library default on reload).
  //
  // map the pure-module LensSortField → the WorkflowList SortField (identical
  // literal spaces; the cast is total and the type guarantees membership).
  const handleLensChange = useCallback(
    (nextLens: Lens) => {
      if (nextLens === activeLens) return;

      // Leaving the library lens: snapshot the user's current columns + sort so
      // returning to 'library' restores EXACTLY today's behavior.
      if (activeLens === 'library') {
        libraryColumnsRef.current = visibleColumns;
        librarySortRef.current = sort;
      }

      const config = getLensConfig(nextLens);

      if (config.columnPack !== null) {
        // Apply the lens pack as a view override (state only — no scheduleSave).
        setVisibleColumns(config.columnPack);
      } else {
        // library: restore the user's saved/preferred pack verbatim.
        setVisibleColumns(libraryColumnsRef.current);
      }

      if (config.defaultSort !== null) {
        const field = config.defaultSort.field as LensSortField & SortState['field'];
        setSort({ field, dir: config.defaultSort.dir });
      } else {
        // library: restore the captured library sort.
        setSort(librarySortRef.current);
      }

      setLens(nextLens);
      track({ event: 'dashboard_lens_changed', lens: nextLens, workflowCount: allWorkflows.length });
    },
    [activeLens, visibleColumns, sort, setLens, allWorkflows.length],
  );

  // Post-mount lens reconciliation: useLens restores the persisted lens from
  // localStorage after mount (SSR-safe — first paint is always 'library'). When
  // it reconciles to a non-library lens, apply that lens's column pack + default
  // sort exactly once so the LSS view is correct on a hard reload. Runs only on
  // the activeLens transition, after first paint, and never overrides the
  // library lens (which preserves today's behavior verbatim).
  useEffect(() => {
    if (lensReconciledRef.current) return;
    if (activeLens === DEFAULT_LENS) return; // nothing to apply for the default
    lensReconciledRef.current = true;
    const config = getLensConfig(activeLens);
    if (config.columnPack !== null) {
      setVisibleColumns(config.columnPack);
    }
    if (config.defaultSort !== null) {
      const field = config.defaultSort.field as LensSortField & SortState['field'];
      setSort({ field, dir: config.defaultSort.dir });
    }
  }, [activeLens]);

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

  // atglance-review #19 (perf): every derived chain below is memoized on its real
  // inputs so the full time→portfolio→filter pipeline does NOT re-run on every
  // keystroke/hover re-render — only when an actual input changes. The single
  // `filterNowMs` boundary is threaded into WorkflowList (below) so the list's
  // pipeline observes the SAME clock — one logical filter result, not a parallel
  // pipeline that can disagree at an age boundary (closes FRONTEND review #4).

  // Apply time range (UI-only, D7)
  const timeFilteredWorkflows = useMemo(
    () => filterByTimeRange(allWorkflows, timeRange, filterNowMs),
    [allWorkflows, timeRange, filterNowMs],
  );

  // D5: apply portfolio filter if a portfolio is selected
  // Scaffold: client-side grouping by workflow.portfolioIds (if present) or "Uncategorized"
  // Follow-up: full API-driven portfolio filtering (see follow-up note in render)
  const portfolioFilteredWorkflows = useMemo(
    () =>
      activePortfolioId === null
        ? timeFilteredWorkflows
        : timeFilteredWorkflows.filter((w) => {
            // WorkflowRowData may have portfolioIds field from the API response
            const wWithPortfolio = w as WorkflowRowData & { portfolioIds?: string[] };
            return (
              wWithPortfolio.portfolioIds?.includes(activePortfolioId) ??
              activePortfolioId === 'uncategorized'
            );
          }),
    [timeFilteredWorkflows, activePortfolioId],
  );

  // Apply user filters + insight filter + search to determine UI state.
  // Batch C item 15: searchQuery threaded in so the derived state machine
  // distinguishes "no-results" (active search/filter, nothing matched) from
  // "empty" (genuinely no workflows).
  const filteredWorkflows = useMemo(
    () =>
      applyFilters(
        portfolioFilteredWorkflows,
        filters,
        insightFilterKey,
        filterNowMs,
        searchQuery,
        presetFilters,
      ),
    [portfolioFilteredWorkflows, filters, insightFilterKey, filterNowMs, searchQuery, presetFilters],
  );

  const availableSystems = useMemo(() => extractSystems(allWorkflows), [allWorkflows]);

  // LSS lens (v1): map the currently-visible workflows into the pure Pareto
  // input shape. Computed only when the LSS lens is active to avoid needless
  // work on the default lens. Deterministic — depends only on the filtered set.
  const paretoInputs: ParetoWorkflowInput[] = useMemo(() => {
    if (activeLens !== 'lss') return [];
    return filteredWorkflows.map((w) => ({
      id: w.id,
      title: w.title,
      avgTimeMs: w.metricsV2.avgTimeMs,
      runs: w.metricsV2.runs,
      // metricsV2.variantCount is a data field (NOT a registry column this pass);
      // honest absence → undefined → the variation strip renders "—".
      variantCount: w.metricsV2.variantCount ?? null,
    }));
  }, [activeLens, filteredWorkflows]);

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

  // SIGNALS batch (2026-06-16): observed library-facts aggregates derived from
  // the SAME already-computed per-workflow `metricsV2.runs` (no new engine math,
  // matching the existing highVariationCount client-derive pattern).
  //  - multiRunWorkflowCount = the honest denominator for the High-Variance tile
  //    (#4): variation is undefined for a single run, so only runs ≥ 2 count.
  //  - totalRuns = the evidence denominator surfaced in the Tier-2 facts row (#7).
  const multiRunWorkflowCount = useMemo(
    () =>
      allWorkflows.filter((w) => {
        const r = w.metricsV2.runs;
        return r != null && r >= 2;
      }).length,
    [allWorkflows],
  );
  const totalRuns = useMemo(
    () =>
      allWorkflows.reduce((sum, w) => {
        const r = w.metricsV2.runs;
        return sum + (r != null && r > 0 ? r : 0);
      }, 0),
    [allWorkflows],
  );

  // Batch B: toggle the opportunity filter when an OpportunityBar segment is
  // clicked.  Clearing the active preset keeps the unified active-filters model
  // coherent: a manual ad-hoc filter change supersedes the one-click preset view.
  const handleOpportunitySegmentClick = useCallback((tag: OpportunityTag) => {
    setActivePresetId(null);
    setPresetFilters(null);
    setFilters((prev) => ({
      ...prev,
      opportunity: prev.opportunity === tag ? null : tag,
    }));
  }, []);

  // atglance-review #11: a manual filter-panel change supersedes the active
  // preset (single coherent active state). Wraps setFilters so every ad-hoc
  // filter mechanism feeds the SAME model.
  const handleFiltersChange = useCallback((next: FilterState) => {
    setActivePresetId(null);
    setPresetFilters(null);
    setFilters(next);
  }, []);

  // atglance-review #9: wire the at-a-glance surfaces (KPI tiles, narrator) into
  // the SAME opportunity filter the OpportunityBar segment-click already uses, so
  // clicking them navigates the list and the active-filters bar reflects it.
  // ONLY honest targets are wired — see KpiTileStrip/NarratorSummary for which
  // tiles/clauses are interactive vs. clearly non-interactive.
  const applyOpportunityFilter = useCallback((tag: OpportunityTag) => {
    setActivePresetId(null);
    setPresetFilters(null);
    setInsightFilterKey(null);
    setFilters((prev) => ({
      ...prev,
      // Toggle: clicking the same tile/clause again clears it.
      opportunity: prev.opportunity === tag ? null : tag,
    }));
  }, []);

  // KPI tile → filter. Only the Automation Candidates tile maps to a real,
  // honest opportunity filter (opportunityTag === 'automate'). All other tiles
  // (total workflows / median cycle time / distinct systems) have NO honest
  // single-filter target and are rendered non-interactive by KpiTileStrip — this
  // handler is only ever called for the automation_candidates tile.
  const handleKpiTileFilter = useCallback(
    (tag: OpportunityTag) => {
      applyOpportunityFilter(tag);
    },
    [applyOpportunityFilter],
  );

  // Narrator clause → filter. The narrator's follow-up clause is one of: high
  // variation / automation candidates / needs-remediation (monitor). Each maps
  // to a real honest filter; NarratorSummary makes only the clause with a real
  // target interactive (and passes the matching tag here).
  const handleNarratorFilter = useCallback(
    (tag: OpportunityTag, healthStatus: HealthStatusFilter | null) => {
      if (healthStatus !== null) {
        setActivePresetId(null);
        setPresetFilters(null);
        setInsightFilterKey(null);
        setFilters((prev) => ({
          ...prev,
          healthStatus: prev.healthStatus === healthStatus ? null : healthStatus,
          opportunity: null,
        }));
        return;
      }
      applyOpportunityFilter(tag);
    },
    [applyOpportunityFilter],
  );

  // atglance-review #11: insight-chip toggle also supersedes the active preset.
  const handleInsightChipClick = useCallback((key: string) => {
    setActivePresetId(null);
    setPresetFilters(null);
    setInsightFilterKey((prev) => (prev === key ? null : key));
  }, []);

  const anyFiltersActive =
    hasActiveFilters(filters) ||
    insightFilterKey !== null ||
    searchQuery.trim() !== '' ||
    activePresetId !== null;

  // atglance-review #11: the unified active-filters model. ONE projection of the
  // four source mechanisms (panel filters, opportunity segment, insight chip,
  // preset) + search — the same state applyFilters consumes. The bar renders
  // these chips; clearing any chip routes back to the correct source setter.
  const activePresetLabel = activePresetId !== null
    ? getPresetById(activePresetId)?.label ?? null
    : null;
  const activeFilterChips: ActiveFilterChip[] = deriveActiveFilterChips({
    filters,
    insightFilterKey,
    searchQuery,
    presetId: activePresetId,
    presetLabel: activePresetLabel,
  });

  // Apply an ActiveFilterState diff back to the shell's individual setters. The
  // pure reducers in activeFilters.ts are the single source of truth for WHICH
  // constraint each clear affects; this maps the resulting state onto the
  // shell's state slots (including the preset's FilterSet, which mirrors presetId).
  const applyActiveFilterState = useCallback((next: ActiveFilterState) => {
    setFilters(next.filters);
    setInsightFilterKey(next.insightFilterKey);
    setSearchInput(next.searchQuery);
    setSearchQuery(next.searchQuery);
    if (next.presetId === null) {
      setActivePresetId(null);
      setPresetFilters(null);
    }
  }, []);

  // Clear every constraint across all four sources + search (single Clear-all).
  const handleClearAllFilters = useCallback(() => {
    applyActiveFilterState(CLEARED_FILTER_STATE);
  }, [applyActiveFilterState]);

  // Clear a single active-filter chip, routed via the pure reducer.
  const handleClearChip = useCallback(
    (chip: ActiveFilterChip) => {
      applyActiveFilterState(
        clearActiveFilterChip(
          {
            filters,
            insightFilterKey,
            searchQuery,
            presetId: activePresetId,
          },
          chip,
        ),
      );
    },
    [applyActiveFilterState, filters, insightFilterKey, searchQuery, activePresetId],
  );

  // atglance-review #9: Pareto bar drill — scroll the matching row into view and
  // apply a transient highlight. Observed-only: it navigates to a REAL row by id;
  // it never fabricates a target and never mutates data.
  const handleSelectWorkflow = useCallback((workflowId: string) => {
    // atglance-review #20: measure whether the "vital few" Pareto framing drives
    // navigation. Opaque workflowId only — no workflow content (PostHog posture).
    track({ event: 'dashboard_pareto_bar_clicked', workflowId });
    setHighlightWorkflowId(workflowId);
    if (highlightTimerRef.current !== null) {
      clearTimeout(highlightTimerRef.current);
    }
    // Defer the scroll so the highlight class is applied before scrolling.
    requestAnimationFrame(() => {
      const el = document.getElementById(`wf-row-${workflowId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    highlightTimerRef.current = setTimeout(() => {
      setHighlightWorkflowId(null);
      highlightTimerRef.current = null;
    }, 2400);
  }, []);

  // Cleanup the highlight timer on unmount.
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

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

      {/* Persona LENS switcher (DASHBOARD_PERSONAS_REVIEW_001 P0, v1): client-only
          tablist re-framing the same data. 'library' = today's behavior verbatim. */}
      <div className="px-ds-4 pt-ds-2">
        <LensSwitcher activeLens={activeLens} onLensChange={handleLensChange} />
      </div>

      {/* LSS "Measure & Analyze" above-list panel: the Pareto of total observed
          time (mean × runs) + variation strip. Only when the LSS lens is active. */}
      {activeLens === 'lss' && !isLoading && !isError && (
        <div className="px-ds-4 pt-ds-3">
          <LssParetoPanel workflows={paretoInputs} onSelectWorkflow={handleSelectWorkflow} />
        </div>
      )}

      {/* Batch B (2026-06-12): top-of-page graphics band (mounts between header and list) */}
      <TopBand
        data={{
          isLoading,
          totalWorkflows: allWorkflows.length,
          recordedThisMonth,
          medianCycleTimeMs,
          cycleTimeSampleCount,
          automationCandidates: aiOpportunityCount,
          // SIGNALS #7: distinct systems — reuses the already-computed
          // availableSystems list (no new computation). Demoted from the KPI
          // strip into the Tier-2 facts row by #4.
          distinctSystemCount: availableSystems.length,
          avgHealthScore: portfolioHealthScore,
          avgHealthScoreDelta: portfolioHealthScoreDelta,
          highVariationCount,
          // SIGNALS #4 / #7: honest denominators + observed counts (already-computed).
          multiRunWorkflowCount,
          totalRuns,
          needsReviewCount,
          opportunityCounts,
          activityByWeek,
        }}
        activeOpportunity={filters.opportunity}
        onOpportunitySegmentClick={handleOpportunitySegmentClick}
        onKpiFilter={handleKpiTileFilter}
        onNarratorFilter={handleNarratorFilter}
      />

      {/* Section 2: Insights Strip */}
      {!isLoading && !isError && insightChips.length > 0 && (
        <InsightsStrip
          chips={insightChips}
          activeFilterKey={insightFilterKey}
          onChipClick={handleInsightChipClick}
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
          {/* Batch C item 13: ONE unified two-row toolbar replaces the three
              previously-stacked control surfaces (PresetChipRail + Customize
              columns button + WorkflowListFilterBar). Every control reuses the
              existing handler unchanged — this is a composition/relocation. */}
          <UnifiedToolbar
            portfolioSidebarOpen={portfolioSidebarOpen}
            onTogglePortfolioSidebar={() => setPortfolioSidebarOpen((prev) => !prev)}
            searchQuery={searchInput}
            onSearchChange={setSearchInput}
            availableSystems={availableSystems}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isFilterPanelOpen={isFilterPanelOpen}
            onToggleFilterPanel={() => setIsFilterPanelOpen((prev) => !prev)}
            sort={sort}
            onSortChange={setSort}
            density={density}
            onDensityChange={setDensity}
            onOpenColumns={handleToggleColumnPicker}
            isColumnsOpen={isPickerOpen}
            columnsTriggerRef={pickerTriggerRef}
            currentPreferences={currentPreferencesSnapshot}
            onApplyPreset={handleApplyPreset}
            {...(userPlan !== undefined ? { userPlan } : {})}
          />

          {/* atglance-review #11: unified active-filters bar — ONE row above the
              list showing every active constraint from all four mechanisms +
              search, each removable, with a single Clear-all. Renders nothing
              when no filters are active. */}
          <ActiveFiltersBar
            chips={activeFilterChips}
            onClearChip={handleClearChip}
            onClearAll={handleClearAllFilters}
          />

          <WorkflowList
            state={listState}
            workflows={portfolioFilteredWorkflows}
            filters={filters}
            insightFilterKey={insightFilterKey}
            presetFilters={presetFilters}
            highlightWorkflowId={highlightWorkflowId}
            availableSystems={availableSystems}
            timeRange={timeRange}
            onFiltersChange={handleFiltersChange}
            onClearInsightFilter={handleClearAllFilters}
            onRetry={handleRetry}
            onWorkflowRename={handleWorkflowRename}
            onWorkflowArchive={handleWorkflowArchive}
            portfolioSidebarOpen={portfolioSidebarOpen}
            onTogglePortfolioSidebar={() => setPortfolioSidebarOpen((prev) => !prev)}
            dashboardViewPerfTimestampMs={dashboardViewPerfTimestampMs}
            visibleColumns={visibleColumns}
            sort={sort}
            onSortChange={setSort}
            searchQuery={searchQuery}
            density={density}
            nowMs={filterNowMs}
            hideFilterBar
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
