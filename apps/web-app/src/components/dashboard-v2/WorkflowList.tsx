'use client';

/**
 * WorkflowList — Section 3 state-machine container.
 *
 * Owns a 6-state machine:
 *   loading      → 5 skeleton rows
 *   empty        → "No workflows recorded yet." + extension install link
 *   no-results   → "No workflows match your filters." + clear button
 *   error        → "Something went wrong." + retry button
 *   sparse       → list + dismissible notice (< 3 workflows)
 *   ready        → normal list
 *
 * All states rendered inline — no separate atom components.
 *
 * Sort state (PRD §5.3):
 *   Default: health_score ascending (worst first)
 *   Available: health_score asc/desc, name asc/desc, opportunity grouped
 *
 * Accessibility (PRD §10):
 *   - <table> with <thead>/<tbody>, <th scope="col"> for column headers
 *   - <th scope="row"> is in WorkflowRow
 *   - Sort buttons use aria-sort
 *   - Responsive: Systems hidden < 768px, Opportunity hidden < 480px (sm breakpoint = 640px, md = 768px)
 *
 * Time range annotation (D7):
 *   When time range is NOT "all", Runs in subtext is annotated "(all-time)" because
 *   the API does not yet support time-windowed run counts.
 */

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Columns3 } from 'lucide-react';
import Link from 'next/link';
import { track } from '@/lib/analytics.js';
import WorkflowRow, { type WorkflowRowData } from './WorkflowRow.js';
import WorkflowListFilterBar, {
  type FilterState,
  type HealthStatusFilter,
  hasActiveFilters,
} from './WorkflowListFilterBar.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
// EXTENSION_CONFIG.chromeStoreUrl was the empty-state CTA target (Batch A: replaced with /install)
import type { TimeRange } from './CommandHeader.js';
import {
  getColumnByKey,
  type ColumnKey,
} from '@/lib/dashboard-columns/index.js';
import type { RowDensity } from './density.js';

// ── Locked columns (always visible regardless of user preferences) ─────────────

const LOCKED_COLUMN_KEYS = new Set<ColumnKey>(['workflow_title', 'health_score']);

// ── UI state machine ──────────────────────────────────────────────────────────

export type WorkflowListState =
  | 'loading'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'sparse'
  | 'ready';

// ── Sort types ────────────────────────────────────────────────────────────────

/**
 * Batch A (2026-06-12): extended with run_count, cycle_time, last_run,
 * date_recorded, case_volume (P0 item 2 of dashboard-redesign).
 *
 * Source mapping (honest per FEASIBILITY_DASHBOARD_REVIEW §1):
 *   run_count     = metricsV2.runs (ProcessDefinition.runCount)
 *   cycle_time    = metricsV2.avgTimeMs (ProcessDefinition.avgDurationMs)
 *   last_run      = processDefinitionUpdatedAt (ProcessDefinition.updatedAt)
 *   date_recorded = createdAt (Workflow.createdAt)
 *   case_volume   = metricsV2.runs (alias of run_count — sorts identically)
 */
export type SortField =
  | 'health_score'
  | 'name'
  | 'opportunity'
  | 'run_count'
  | 'cycle_time'
  | 'last_run'
  | 'date_recorded'
  | 'case_volume';

type SortDir = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  dir: SortDir;
}

const OPPORTUNITY_ORDER: Record<OpportunityTag, number> = {
  monitor: 0,
  optimize: 1,
  standardize: 2,
  automate: 3,
  healthy: 4,
};

/**
 * Item #13 (atglance-review) — column-header glosses. The sortable `<th>`
 * elements render via SortButton with no registry `description`, so a non-expert
 * meets bare jargon ("Cycle Time", "Runs", "Health Score"). These are plain,
 * honest definitions only — NO fabricated targets/benchmarks. Applied as `title`
 * on the `<th>` (columnheader) so they don't interfere with the sort button.
 */
export const SORTABLE_HEADER_GLOSS: Partial<Record<SortField, string>> = {
  name: 'The name of the recorded process. Click to sort A–Z.',
  opportunity:
    'The engine\'s verdict for this workflow (automate / standardize / optimize / monitor / healthy) — a candidacy signal, not an ROI estimate.',
  run_count: 'How many times this process has been recorded.',
  cycle_time: 'How long a run of this process takes, on average. Shown as time, not a target.',
  last_run: 'When this process was most recently active (uses the process definition\'s last-updated time as a proxy).',
  date_recorded: 'When this process was first recorded.',
  health_score:
    'A 0–100 composite of confidence, SOP readiness, maturity, and review status. 80+ good, 60–79 fair, under 60 needs attention.',
};

export function sortWorkflows(workflows: WorkflowRowData[], sort: SortState): WorkflowRowData[] {
  const sorted = [...workflows];
  sorted.sort((a, b) => {
    let diff = 0;
    if (sort.field === 'health_score') {
      diff = a.metricsV2.healthScore.overall - b.metricsV2.healthScore.overall;
    } else if (sort.field === 'name') {
      diff = a.title.localeCompare(b.title);
    } else if (sort.field === 'opportunity') {
      diff =
        OPPORTUNITY_ORDER[a.metricsV2.opportunityTag] -
        OPPORTUNITY_ORDER[b.metricsV2.opportunityTag];
    } else if (sort.field === 'run_count' || sort.field === 'case_volume') {
      // case_volume is an alias of run_count — both sort by ProcessDefinition.runCount.
      // Null (unprocessed workflows) sort last regardless of direction.
      const av = a.metricsV2.runs ?? -1;
      const bv = b.metricsV2.runs ?? -1;
      diff = av - bv;
    } else if (sort.field === 'cycle_time') {
      // avgTimeMs — null sorts last (Infinity sentinel → always after finite values).
      const av = a.metricsV2.avgTimeMs ?? Infinity;
      const bv = b.metricsV2.avgTimeMs ?? Infinity;
      diff = av - bv;
    } else if (sort.field === 'last_run') {
      // ProcessDefinition.updatedAt proxy.  Null (no processDefinition) sorts last.
      const at = a.processDefinitionUpdatedAt ? new Date(a.processDefinitionUpdatedAt).getTime() : -1;
      const bt = b.processDefinitionUpdatedAt ? new Date(b.processDefinitionUpdatedAt).getTime() : -1;
      diff = at - bt;
    } else if (sort.field === 'date_recorded') {
      // Workflow.createdAt — always present; deterministic ISO parse.
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      diff = at - bt;
    }
    // Stable tie-break by id ensures deterministic ordering when primary diff === 0.
    if (diff === 0) {
      diff = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    return sort.dir === 'asc' ? diff : -diff;
  });
  return sorted;
}

// ── Global search (Batch C item 15) ───────────────────────────────────────────

/**
 * Deterministic client-side search predicate.
 *
 * Matches when the (trimmed, lower-cased) query is a substring of the workflow
 * title OR any of its `toolsUsed` system names. An empty/whitespace query
 * matches everything (no-op), so callers can pass the raw input unconditionally.
 *
 * Pure: no Date/random; same (workflow, query) → same boolean. Search never
 * mutates data — it only filters which rows are shown.
 */
export function matchesSearch(workflow: WorkflowRowData, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  if (workflow.title.toLowerCase().includes(q)) return true;
  return workflow.toolsUsed.some((s) => s.toLowerCase().includes(q));
}

// ── Filter application ────────────────────────────────────────────────────────

export function applyFilters(
  workflows: WorkflowRowData[],
  filters: FilterState,
  insightFilterKey: string | null,
  // MDR-P03: injected clock reference so age-based filters are deterministic
  // across repeat calls at the same request boundary.  Defaults to Date.now()
  // for call sites that are not yet clock-injection aware (backward compatible).
  nowMs: number = Date.now(),
  // Batch C item 15: global search query. Defaults to '' (no-op) so existing
  // call sites keep their exact behavior — search is purely additive.
  searchQuery: string = '',
): WorkflowRowData[] {
  let result = workflows;

  // Global search (title + systems substring match). Applied first so the
  // remaining filters operate on the searched subset (order does not affect
  // the final set — all predicates are conjunctive — but this keeps the cheap
  // string check up front).
  const q = searchQuery.trim().toLowerCase();
  if (q !== '') {
    result = result.filter((w) => matchesSearch(w, q));
  }

  // "Needs attention" filter (iter-024 §4.1 item e):
  // health < 60 OR variationLabel === 'high'
  // Note: delta ≤ −10 excluded from v1 (per-workflow delta not in MVP).
  if (filters.needsAttention) {
    result = result.filter(
      (w) =>
        w.metricsV2.healthScore.overall < 60 ||
        w.metricsV2.variationLabel === 'high',
    );
  }

  // System filter (multi-select — AND logic within a row's toolsUsed)
  if (filters.systems.length > 0) {
    result = result.filter((w) =>
      filters.systems.some((s) => w.toolsUsed.includes(s)),
    );
  }

  // Opportunity filter
  if (filters.opportunity !== null) {
    result = result.filter(
      (w) => w.metricsV2.opportunityTag === filters.opportunity,
    );
  }

  // Health status filter: map to metricsV2 properties
  if (filters.healthStatus !== null) {
    result = result.filter((w) => {
      const h = filters.healthStatus as HealthStatusFilter;
      const score = w.metricsV2.healthScore.overall;
      const variation = w.metricsV2.variationScore;
      if (h === 'healthy') return score >= 70;
      if (h === 'needs_review') return score < 40;
      if (h === 'high_variation') return variation > 0.67;
      // 'stale': no isStale field on WorkflowRowData — approximate by age.
      // Uses injected nowMs so repeated calls with the same reference yield
      // identical results regardless of wall-clock drift.
      if (h === 'stale') {
        const age = nowMs - new Date(w.updatedAt).getTime();
        return age > 30 * 24 * 60 * 60 * 1000; // > 30 days
      }
      return true;
    });
  }

  // Insight chip filter key
  if (insightFilterKey !== null) {
    if (insightFilterKey === 'variationScore_gt_0.7') {
      result = result.filter((w) => w.metricsV2.variationScore > 0.7);
    } else if (insightFilterKey === 'opportunityTag_automate') {
      result = result.filter((w) => w.metricsV2.opportunityTag === 'automate');
    } else if (insightFilterKey === 'opportunityTag_monitor') {
      result = result.filter((w) => w.metricsV2.opportunityTag === 'monitor');
    } else if (insightFilterKey === 'healthScore_gte_70') {
      result = result.filter((w) => w.metricsV2.healthScore.overall >= 70);
    }
    // bottleneck_insight: no per-workflow filter key — show all (the chip is global)
  }

  return result;
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td className="px-ds-4 py-ds-3">
        <div className="flex flex-col gap-1">
          <div className="h-3.5 w-48 rounded bg-[var(--border-subtle)] animate-pulse" />
          <div className="h-3 w-32 rounded bg-[var(--border-subtle)] animate-pulse opacity-60" />
        </div>
      </td>
      <td className="px-ds-4 py-ds-3 hidden md:table-cell">
        <div className="flex gap-ds-1">
          <div className="h-5 w-16 rounded-ds-sm bg-[var(--border-subtle)] animate-pulse" />
          <div className="h-5 w-12 rounded-ds-sm bg-[var(--border-subtle)] animate-pulse opacity-60" />
        </div>
      </td>
      <td className="px-ds-4 py-ds-3 hidden sm:table-cell">
        <div className="h-5 w-20 rounded-ds-sm bg-[var(--border-subtle)] animate-pulse" />
      </td>
      <td className="px-ds-4 py-ds-3">
        <div className="flex items-center justify-end gap-ds-2">
          <div className="h-1 w-12 rounded-full bg-[var(--border-subtle)] animate-pulse" />
          <div className="h-4 w-8 rounded bg-[var(--border-subtle)] animate-pulse" />
        </div>
      </td>
      <td className="px-ds-2 py-ds-3 w-8" />
    </tr>
  );
}

// ── Sort header button ────────────────────────────────────────────────────────

/**
 * Derive the ARIA sort value for a given field and sort state.
 * Used by the parent <th aria-sort="..."> — `aria-sort` belongs on the
 * columnheader element, NOT on the <button> inside it (WCAG aria-allowed-attr).
 */
export function sortAriaValue(
  field: SortField,
  currentSort: SortState,
): 'none' | 'ascending' | 'descending' {
  if (currentSort.field !== field) return 'none';
  return currentSort.dir === 'asc' ? 'ascending' : 'descending';
}

interface SortButtonProps {
  field: SortField;
  label: string;
  currentSort: SortState;
  onSort: (field: SortField) => void;
}

function SortButton({ field, label, currentSort, onSort }: SortButtonProps) {
  const isActive = currentSort.field === field;
  // aria-sort belongs on the <th> (columnheader), not on this button.
  // See sortAriaValue() — callers apply it to the containing <th>.

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`
        inline-flex items-center gap-ds-1 text-[12px] font-medium
        transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded
        ${isActive ? 'text-[var(--content-primary)]' : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)]'}
      `}
    >
      {label}
      {isActive ? (
        currentSort.dir === 'asc' ? (
          <ArrowUp size={10} aria-hidden="true" />
        ) : (
          <ArrowDown size={10} aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown size={10} aria-hidden="true" />
      )}
    </button>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorkflowListProps {
  state: WorkflowListState;
  workflows: WorkflowRowData[];
  filters: FilterState;
  insightFilterKey: string | null;
  availableSystems: string[];
  /** D7: passed down to WorkflowRow to annotate runs with "(all-time)" */
  timeRange: TimeRange;
  onFiltersChange: (filters: FilterState) => void;
  onClearInsightFilter: () => void;
  onRetry: () => void;
  /** Called when a workflow is renamed via kebab menu */
  onWorkflowRename?: (id: string, newTitle: string) => void;
  /** Called when a workflow is archived via kebab menu — removes it from the list */
  onWorkflowArchive?: (id: string) => void;
  /** D5: whether the portfolio sidebar is currently open */
  portfolioSidebarOpen?: boolean;
  /** D5: toggle the portfolio sidebar open/closed */
  onTogglePortfolioSidebar?: () => void;
  /** PRD §4 metric #2: perf timestamp captured at dashboard_v2_viewed emission.
   * Passed through to WorkflowRow for elapsed-time computation on row click. */
  dashboardViewPerfTimestampMs?: number;
  /**
   * D+4 (iter-061): ordered list of visible column keys from user preferences.
   * Drives the table header and is passed to each WorkflowRow for cell rendering.
   * Defaults to the pre-D+4 6-column set when not provided.
   */
  visibleColumns?: readonly ColumnKey[];
  /**
   * Batch C item 13: controlled sort state. When provided (with onSortChange),
   * sort is owned by the parent (the unified toolbar Sort control + the column
   * headers share one source of truth). When omitted, WorkflowList keeps its
   * own internal sort state — preserving backward-compatible standalone use.
   */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /**
   * Batch C item 15: global search query (title + systems). Threaded into
   * applyFilters. Defaults to '' (no-op) — additive, never breaks existing rows.
   */
  searchQuery?: string;
  /** Batch C item 16: row density, passed through to each WorkflowRow. */
  density?: RowDensity;
  /**
   * Batch C item 13: when true the unified toolbar owns the filter controls
   * (portfolios toggle + filter bar), so WorkflowList suppresses its own
   * filter-bar row to avoid duplicate control surfaces. Defaults to false so
   * standalone usage keeps rendering its filter bar.
   */
  hideFilterBar?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkflowList({
  state,
  workflows,
  filters,
  insightFilterKey,
  availableSystems,
  timeRange,
  onFiltersChange,
  onClearInsightFilter,
  onRetry,
  onWorkflowRename,
  onWorkflowArchive,
  portfolioSidebarOpen = false,
  onTogglePortfolioSidebar,
  dashboardViewPerfTimestampMs = 0,
  visibleColumns,
  sort: controlledSort,
  onSortChange,
  searchQuery = '',
  density = 'regular',
  hideFilterBar = false,
}: WorkflowListProps) {
  // Batch A (2026-06-12): default sort changed from health_score asc → date_recorded desc
  // (newest first) per dashboard-redesign P0 item 3.
  // Batch C item 13: sort may be controlled by the parent (unified toolbar).
  // When `controlledSort`/`onSortChange` are provided the internal state is
  // unused; otherwise WorkflowList owns sort as before (backward compatible).
  const [internalSort, setInternalSort] = useState<SortState>({ field: 'date_recorded', dir: 'desc' });
  const sort = controlledSort ?? internalSort;
  const [sparseNoticeDismissed, setSparseNoticeDismissed] = useState(false);

  // MDR-P03: stable clock boundary captured once at render so all age-based
  // filter evaluations in this render cycle use an identical reference.
  // atglance-review item #17: this same boundary is also threaded into every
  // WorkflowRow's accessorContext (referenceNowMs) so no row reads Date.now()
  // in render — one wall-clock value per render, shared by all rows.
  const nowMs = useMemo(() => Date.now(), []);

  function handleSort(field: SortField) {
    const nextDir: SortDir =
      sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc';
    const next: SortState = { field, dir: nextDir };
    if (onSortChange) {
      onSortChange(next);
    } else {
      setInternalSort(next);
    }
    // PRD §4 metric #3: sort engagement
    track({
      event: 'dashboard_v2_sort_changed',
      column: field,
      direction: nextDir,
    });
  }

  function clearAllFilters() {
    onFiltersChange({ systems: [], opportunity: null, healthStatus: null, needsAttention: false });
    onClearInsightFilter();
  }

  const filteredWorkflows = state === 'loading'
    ? []
    : applyFilters(workflows, filters, insightFilterKey, nowMs, searchQuery);
  const sortedWorkflows = sortWorkflows(filteredWorkflows, sort);

  // D+4: derive the ordered middle columns (between workflow_title and health_score)
  // from visibleColumns, or fall back to the pre-D+4 defaults.
  const dynamicHeaderKeys: ColumnKey[] = visibleColumns
    ? visibleColumns.filter((k) => !LOCKED_COLUMN_KEYS.has(k)) as ColumnKey[]
    : ['systems', 'opportunity_tag'];

  // Total column count for colSpan in empty/error states:
  // workflow_title + dynamic_cols + health_score + kebab
  const totalColCount = 1 + dynamicHeaderKeys.length + 1 + 1;

  // Screen reader announcement text — announced when filter/sort changes
  const anyActive = hasActiveFilters(filters) || insightFilterKey !== null;
  const srAnnouncement =
    state === 'loading'
      ? 'Loading workflows'
      : state === 'error'
      ? 'Error loading workflows'
      : state === 'empty'
      ? 'No workflows recorded yet'
      : state === 'no-results'
      ? 'No workflows match current filters'
      : `${sortedWorkflows.length} workflow${sortedWorkflows.length !== 1 ? 's' : ''}${anyActive ? ' (filtered)' : ''}`;

  return (
    <section className="flex flex-col gap-0" aria-label="Workflow intelligence list" role="region">
      {/* Hidden live region — announces filter/sort result counts to screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>
      {/* Filter bar + D5 portfolio toggle.
          Batch C item 13: when the unified toolbar owns these controls
          (`hideFilterBar`), this row is suppressed to remove the duplicate
          control surface — the exact same WorkflowListFilterBar + portfolios
          toggle now live in the toolbar with byte-identical handlers. */}
      {!hideFilterBar && (
        <div className="flex items-center">
          {/* D5: Portfolios icon button — toggles sidebar open/closed */}
          {onTogglePortfolioSidebar && (
            <button
              type="button"
              onClick={onTogglePortfolioSidebar}
              className={`
                flex items-center gap-ds-1 px-ds-3 py-ds-3 border-b border-r border-[var(--border-subtle)]
                text-[12px] font-medium transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
                ${
                  portfolioSidebarOpen
                    ? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
                    : 'bg-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
                }
              `}
              aria-label="Toggle portfolio navigation sidebar"
              aria-expanded={portfolioSidebarOpen}
              aria-controls="portfolio-sidebar"
            >
              <Columns3 size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Portfolios</span>
            </button>
          )}
          <div className="flex-1">
            <WorkflowListFilterBar
              availableSystems={availableSystems}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>
        </div>
      )}

      {/* Sparse notice */}
      {(state === 'sparse' || (state === 'ready' && workflows.length > 0 && workflows.length < 3)) &&
        !sparseNoticeDismissed && (
          <div
            role="status"
            className="mx-ds-8 mt-ds-3 px-ds-3 py-ds-2 rounded-ds-sm bg-amber-50 border border-amber-200 text-[14px] text-amber-700 flex items-center justify-between gap-ds-4"
          >
            <span>
              Your first workflow is recorded. Record 2 more to unlock health score comparison across your library.
            </span>
            <button
              type="button"
              onClick={() => setSparseNoticeDismissed(true)}
              className="flex-shrink-0 text-[12px] font-medium text-amber-700 hover:text-amber-900 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              aria-label="Dismiss sparse data notice"
            >
              Dismiss
            </button>
          </div>
        )}

      {/* Main table — always rendered for semantic structure; content varies by state */}
      <div className="px-ds-8 py-ds-3">
        <table className="w-full border-collapse" aria-label="Workflows">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {/* Workflow name (locked, always first) */}
              <th
                scope="col"
                aria-sort={sortAriaValue('name', sort)}
                className="px-ds-4 py-ds-2 text-left"
                title={SORTABLE_HEADER_GLOSS.name}
              >
                <SortButton
                  field="name"
                  label="Workflow"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              {/* Dynamic middle columns from user preferences */}
              {dynamicHeaderKeys.map((colKey) => {
                // Opportunity column keeps its sort button
                if (colKey === 'opportunity_tag') {
                  return (
                    <th
                      key="opportunity_tag"
                      scope="col"
                      aria-sort={sortAriaValue('opportunity', sort)}
                      className="px-ds-4 py-ds-2 text-left hidden sm:table-cell"
                      title={SORTABLE_HEADER_GLOSS.opportunity}
                    >
                      <SortButton
                        field="opportunity"
                        label="Opportunity"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                    </th>
                  );
                }
                // Systems column — plain header (not sortable)
                if (colKey === 'systems') {
                  return (
                    <th
                      key="systems"
                      scope="col"
                      className="px-ds-4 py-ds-2 text-left hidden md:table-cell text-[12px] font-medium text-[var(--content-secondary)]"
                    >
                      Systems
                    </th>
                  );
                }
                // Batch A (2026-06-12): sortable columns with SortButton headers.
                // run_count, cycle_time_mean_ms, last_run_at, date_recorded each map
                // to a SortField so users can click the column header to sort.
                if (colKey === 'run_count') {
                  return (
                    <th key="run_count" scope="col" aria-sort={sortAriaValue('run_count', sort)} className="px-ds-4 py-ds-2 text-left" title={SORTABLE_HEADER_GLOSS.run_count}>
                      <SortButton field="run_count" label="Runs" currentSort={sort} onSort={handleSort} />
                    </th>
                  );
                }
                if (colKey === 'cycle_time_mean_ms') {
                  return (
                    <th key="cycle_time_mean_ms" scope="col" aria-sort={sortAriaValue('cycle_time', sort)} className="px-ds-4 py-ds-2 text-left" title={SORTABLE_HEADER_GLOSS.cycle_time}>
                      <SortButton field="cycle_time" label="Cycle Time" currentSort={sort} onSort={handleSort} />
                    </th>
                  );
                }
                if (colKey === 'last_run_at') {
                  return (
                    <th key="last_run_at" scope="col" aria-sort={sortAriaValue('last_run', sort)} className="px-ds-4 py-ds-2 text-left" title={SORTABLE_HEADER_GLOSS.last_run}>
                      <SortButton field="last_run" label="Last Run" currentSort={sort} onSort={handleSort} />
                    </th>
                  );
                }
                if (colKey === 'date_recorded') {
                  return (
                    <th key="date_recorded" scope="col" aria-sort={sortAriaValue('date_recorded', sort)} className="px-ds-4 py-ds-2 text-left" title={SORTABLE_HEADER_GLOSS.date_recorded}>
                      <SortButton field="date_recorded" label="Date Recorded" currentSort={sort} onSort={handleSort} />
                    </th>
                  );
                }
                // Generic column header from registry (plain label for non-sortable columns)
                const colDef = getColumnByKey(colKey);
                if (!colDef) return null;
                return (
                  <th
                    key={colKey}
                    scope="col"
                    className="px-ds-4 py-ds-2 text-left text-[12px] font-medium text-[var(--content-secondary)]"
                    title={colDef.description}
                  >
                    {colDef.label}
                  </th>
                );
              })}
              {/* Health Score (locked, always last before kebab) */}
              <th
                scope="col"
                aria-sort={sortAriaValue('health_score', sort)}
                className="px-ds-4 py-ds-2 text-right"
                title={SORTABLE_HEADER_GLOSS.health_score}
              >
                <SortButton
                  field="health_score"
                  label="Health Score"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              {/* Kebab column — visually empty header */}
              <th scope="col" className="px-ds-2 py-ds-2 w-8">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Loading state: 5 skeleton rows */}
            {state === 'loading' &&
              Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}

            {/* Error state */}
            {state === 'error' && (
              <tr>
                <td colSpan={totalColCount} className="px-ds-4 py-ds-8 text-center">
                  <div className="flex flex-col items-center gap-ds-3">
                    <p className="text-[16px] font-medium text-[var(--content-primary)]">
                      Could not load workflows — check your connection and retry.
                    </p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-ds-sm bg-[var(--content-primary)] text-[var(--surface-primary)] text-[14px] font-medium transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state (no workflows at all) */}
            {state === 'empty' && (
              <tr>
                <td colSpan={totalColCount} className="px-ds-4 py-ds-8 text-center">
                  <div className="flex flex-col items-center gap-ds-3">
                    <p className="text-[16px] font-medium text-[var(--content-primary)]">
                      No workflows recorded yet.
                    </p>
                    <p className="text-[14px] text-[var(--content-secondary)]">
                      Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time.
                    </p>
                    {/* Batch A (2026-06-12): CTA points to /install (internal route),
                        not EXTENSION_CONFIG.chromeStoreUrl (placeholder dead link).
                        Secondary CTA to /upload restores the v1 upload path. */}
                    <Link
                      href="/install"
                      className="inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-ds-sm border border-[var(--border-default)] text-[14px] font-medium text-[var(--content-primary)] transition-colors duration-150 hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      Install extension to start →
                    </Link>
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-ds-sm text-[14px] font-medium text-[var(--content-secondary)] transition-colors duration-150 hover:text-[var(--content-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
                    >
                      Upload a recording →
                    </Link>
                  </div>
                </td>
              </tr>
            )}

            {/* No-results state (filters active, no match) */}
            {state === 'no-results' && (
              <tr>
                <td colSpan={totalColCount} className="px-ds-4 py-ds-8 text-center">
                  <div className="flex flex-col items-center gap-ds-3">
                    <p className="text-[16px] font-medium text-[var(--content-primary)]">
                      No workflows match your filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-ds-sm border border-[var(--border-default)] text-[14px] font-medium text-[var(--content-primary)] transition-colors duration-150 hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Sparse + Ready states: render rows */}
            {(state === 'sparse' || state === 'ready') &&
              sortedWorkflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  timeRange={timeRange}
                  density={density}
                  dashboardViewPerfTimestampMs={dashboardViewPerfTimestampMs}
                  // item #17: thread the single shared clock boundary into every
                  // row so no row calls Date.now() in render.
                  referenceNowMs={nowMs}
                  {...(visibleColumns !== undefined ? { visibleColumns } : {})}
                  {...(onWorkflowRename ? { onRename: onWorkflowRename } : {})}
                  {...(onWorkflowArchive ? { onArchive: onWorkflowArchive } : {})}
                />
              ))}

            {/* Filtered to zero within sparse/ready — inline no-results */}
            {(state === 'sparse' || state === 'ready') &&
              sortedWorkflows.length === 0 &&
              hasActiveFilters(filters) && (
                <tr>
                  <td colSpan={totalColCount} className="px-ds-4 py-ds-6 text-center">
                    <div className="flex flex-col items-center gap-ds-3">
                      <p className="text-[14px] text-[var(--content-secondary)]">
                        No workflows match your filters.
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-[14px] font-medium text-[var(--content-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
