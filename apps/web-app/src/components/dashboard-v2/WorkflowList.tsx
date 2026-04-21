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

import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Columns3 } from 'lucide-react';
import Link from 'next/link';
import WorkflowRow, { type WorkflowRowData } from './WorkflowRow.js';
import WorkflowListFilterBar, {
  type FilterState,
  type HealthStatusFilter,
  hasActiveFilters,
} from './WorkflowListFilterBar.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import { EXTENSION_CONFIG } from '@/lib/config.js';
import type { TimeRange } from './CommandHeader.js';

// ── UI state machine ──────────────────────────────────────────────────────────

export type WorkflowListState =
  | 'loading'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'sparse'
  | 'ready';

// ── Sort types ────────────────────────────────────────────────────────────────

type SortField = 'health_score' | 'name' | 'opportunity';
type SortDir = 'asc' | 'desc';

interface SortState {
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

function sortWorkflows(workflows: WorkflowRowData[], sort: SortState): WorkflowRowData[] {
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
    }
    return sort.dir === 'asc' ? diff : -diff;
  });
  return sorted;
}

// ── Filter application ────────────────────────────────────────────────────────

export function applyFilters(
  workflows: WorkflowRowData[],
  filters: FilterState,
  insightFilterKey: string | null,
): WorkflowRowData[] {
  let result = workflows;

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
      // 'stale': no isStale field on WorkflowRowData — approximate by age
      if (h === 'stale') {
        const age = Date.now() - new Date(w.updatedAt).getTime();
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

interface SortButtonProps {
  field: SortField;
  label: string;
  currentSort: SortState;
  onSort: (field: SortField) => void;
}

function SortButton({ field, label, currentSort, onSort }: SortButtonProps) {
  const isActive = currentSort.field === field;
  const ariaSortValue: 'none' | 'ascending' | 'descending' = isActive
    ? currentSort.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-sort={ariaSortValue}
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
}: WorkflowListProps) {
  const [sort, setSort] = useState<SortState>({ field: 'health_score', dir: 'asc' });
  const [sparseNoticeDismissed, setSparseNoticeDismissed] = useState(false);

  function handleSort(field: SortField) {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  }

  function clearAllFilters() {
    onFiltersChange({ systems: [], opportunity: null, healthStatus: null });
    onClearInsightFilter();
  }

  const filteredWorkflows = state === 'loading'
    ? []
    : applyFilters(workflows, filters, insightFilterKey);
  const sortedWorkflows = sortWorkflows(filteredWorkflows, sort);

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
      {/* Filter bar + D5 portfolio toggle */}
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

      {/* Sparse notice */}
      {(state === 'sparse' || (state === 'ready' && workflows.length > 0 && workflows.length < 3)) &&
        !sparseNoticeDismissed && (
          <div
            role="status"
            className="mx-ds-8 mt-ds-3 px-ds-3 py-ds-2 rounded-ds-sm bg-amber-50 border border-amber-200 text-[14px] text-amber-700 flex items-center justify-between gap-ds-4"
          >
            <span>
              Metrics improve as more workflows are recorded. Some scores may be incomplete.
            </span>
            <button
              type="button"
              onClick={() => setSparseNoticeDismissed(true)}
              className="flex-shrink-0 text-[12px] font-medium text-amber-600 hover:text-amber-800 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
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
              <th
                scope="col"
                className="px-ds-4 py-ds-2 text-left"
              >
                <SortButton
                  field="name"
                  label="Workflow"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th
                scope="col"
                className="px-ds-4 py-ds-2 text-left hidden md:table-cell text-[12px] font-medium text-[var(--content-secondary)]"
              >
                Systems
              </th>
              <th
                scope="col"
                className="px-ds-4 py-ds-2 text-left hidden sm:table-cell"
              >
                <SortButton
                  field="opportunity"
                  label="Opportunity"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th
                scope="col"
                className="px-ds-4 py-ds-2 text-right"
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
                <td colSpan={5} className="px-ds-4 py-ds-8 text-center">
                  <div className="flex flex-col items-center gap-ds-3">
                    <p className="text-[16px] font-medium text-[var(--content-primary)]">
                      Something went wrong loading your workflows.
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
                <td colSpan={5} className="px-ds-4 py-ds-8 text-center">
                  <div className="flex flex-col items-center gap-ds-3">
                    <p className="text-[16px] font-medium text-[var(--content-primary)]">
                      No workflows recorded yet.
                    </p>
                    <p className="text-[14px] text-[var(--content-secondary)]">
                      Install the browser extension to start recording workflows.
                    </p>
                    <Link
                      href={EXTENSION_CONFIG.chromeStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-ds-sm border border-[var(--border-default)] text-[14px] font-medium text-[var(--content-primary)] transition-colors duration-150 hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      Install extension →
                    </Link>
                  </div>
                </td>
              </tr>
            )}

            {/* No-results state (filters active, no match) */}
            {state === 'no-results' && (
              <tr>
                <td colSpan={5} className="px-ds-4 py-ds-8 text-center">
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
                  {...(onWorkflowRename ? { onRename: onWorkflowRename } : {})}
                  {...(onWorkflowArchive ? { onArchive: onWorkflowArchive } : {})}
                />
              ))}

            {/* Filtered to zero within sparse/ready — inline no-results */}
            {(state === 'sparse' || state === 'ready') &&
              sortedWorkflows.length === 0 &&
              hasActiveFilters(filters) && (
                <tr>
                  <td colSpan={5} className="px-ds-4 py-ds-6 text-center">
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
