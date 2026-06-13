'use client';

/**
 * UnifiedToolbar — Batch C item 13.
 *
 * Consolidates the three previously-stacked control surfaces (PresetChipRail,
 * the "Customize columns" button row, and WorkflowListFilterBar) into ONE
 * two-row toolbar:
 *
 *   Row 1 (data controls): Portfolios · Search · Filter · Sort · Columns
 *   Row 2 (views):         preset chips + saved-view chips (PresetChipRail)
 *
 * This is a LAYOUT / COMPOSITION change. Every control REUSES the existing
 * component and handler unchanged:
 *   - Portfolios toggle → the existing `onTogglePortfolioSidebar` handler.
 *   - Filter           → the existing <WorkflowListFilterBar> with its exact
 *                        `filters` + `onFiltersChange` contract, shown in an
 *                        expandable panel (no internal behavior changed).
 *   - Sort             → calls the SAME `onSortChange` the column headers use
 *                        (single source of truth lifted to the shell).
 *   - Columns          → the existing ColumnPicker trigger (`onOpenColumns` +
 *                        `columnsTriggerRef`); the drawer itself is unchanged.
 *   - Preset / saved   → the existing <PresetChipRail> verbatim.
 *
 * No data is mutated here. Search is a controlled input; debouncing lives in the
 * shell. No Date.now()/Math.random() in render.
 *
 * @batch C (2026-06-12)
 */

import { Search, SlidersHorizontal, Columns3, FolderTree, X, Rows3 } from 'lucide-react';
import WorkflowListFilterBar, {
  type FilterState,
} from './WorkflowListFilterBar.js';
import PresetChipRail from './PresetChipRail.js';
import type { SortField, SortState } from './WorkflowList.js';
import { DENSITY_OPTIONS, type RowDensity } from './density.js';
import type { PresetDefinition } from '@/lib/dashboard-columns/presets.js';
import type { UserDashboardPreference } from '@/lib/dashboard-columns/index.js';

// ── Sort options (mirror the WorkflowList SortField union) ────────────────────

/**
 * Sort menu options, in the order recommended by UX_DASHBOARD_REVIEW §4.2.
 * Each entry maps a user-facing label to a (field, dir) pair. The toolbar Sort
 * control sets sort directly (it does not toggle) — the column headers retain
 * their click-to-toggle behavior independently.
 */
const SORT_OPTIONS: readonly { value: string; label: string; field: SortField; dir: 'asc' | 'desc' }[] = [
  { value: 'date_recorded:desc', label: 'Date Recorded (newest first)', field: 'date_recorded', dir: 'desc' },
  { value: 'name:asc', label: 'Name (A → Z)', field: 'name', dir: 'asc' },
  { value: 'run_count:desc', label: 'Runs (most first)', field: 'run_count', dir: 'desc' },
  { value: 'cycle_time:desc', label: 'Cycle Time (longest first)', field: 'cycle_time', dir: 'desc' },
  { value: 'last_run:desc', label: 'Last Run (most recent first)', field: 'last_run', dir: 'desc' },
  { value: 'health_score:asc', label: 'Health Score (worst first)', field: 'health_score', dir: 'asc' },
  { value: 'opportunity:asc', label: 'Opportunity (automate first)', field: 'opportunity', dir: 'asc' },
];

function sortValue(sort: SortState): string {
  return `${sort.field}:${sort.dir}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UnifiedToolbarProps {
  // Portfolios
  portfolioSidebarOpen: boolean;
  onTogglePortfolioSidebar: () => void;
  // Search (Batch C item 15)
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Filter (reuses WorkflowListFilterBar)
  availableSystems: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  // Sort (shared with the column headers)
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  // Density (Batch C item 16)
  density: RowDensity;
  onDensityChange: (density: RowDensity) => void;
  // Columns (reuses the existing ColumnPicker trigger)
  onOpenColumns: () => void;
  isColumnsOpen: boolean;
  /** Mutable so the same ref can be attached to the button here AND read by
   *  ColumnPicker for focus-return. Matches the shell's `useRef` shape. */
  columnsTriggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  // Preset / saved-view chips (reuses PresetChipRail)
  currentPreferences: UserDashboardPreference;
  onApplyPreset: (preset: PresetDefinition) => void;
  userPlan?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UnifiedToolbar({
  portfolioSidebarOpen,
  onTogglePortfolioSidebar,
  searchQuery,
  onSearchChange,
  availableSystems,
  filters,
  onFiltersChange,
  isFilterPanelOpen,
  onToggleFilterPanel,
  sort,
  onSortChange,
  density,
  onDensityChange,
  onOpenColumns,
  isColumnsOpen,
  columnsTriggerRef,
  currentPreferences,
  onApplyPreset,
  userPlan,
}: UnifiedToolbarProps) {
  const activeFilterCount =
    (filters.systems.length > 0 ? 1 : 0) +
    (filters.opportunity !== null ? 1 : 0) +
    (filters.healthStatus !== null ? 1 : 0) +
    (filters.needsAttention ? 1 : 0);

  function handleSortSelect(value: string) {
    const opt = SORT_OPTIONS.find((o) => o.value === value);
    if (opt) onSortChange({ field: opt.field, dir: opt.dir });
  }

  return (
    <div className="flex flex-col border-b border-[var(--border-subtle)]">
      {/* ── Row 1: data controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-ds-2 px-ds-8 py-ds-3">
        {/* Portfolios toggle (reuses the existing handler) */}
        <button
          type="button"
          onClick={onTogglePortfolioSidebar}
          className={`
            inline-flex items-center gap-ds-1 px-ds-3 py-ds-1.5 rounded-ds-sm border
            text-[13px] font-medium transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            ${
              portfolioSidebarOpen
                ? 'bg-[var(--surface-secondary)] text-[var(--content-primary)] border-[var(--border-default)]'
                : 'bg-transparent text-[var(--content-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)]'
            }
          `}
          aria-label="Toggle portfolio navigation sidebar"
          aria-expanded={portfolioSidebarOpen}
          aria-controls="portfolio-sidebar"
        >
          <FolderTree size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Portfolios</span>
        </button>

        {/* Search (flex-grow) */}
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            aria-hidden="true"
            className="absolute left-ds-2 top-1/2 -translate-y-1/2 text-[var(--content-tertiary)]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search workflows…"
            aria-label="Search workflows by name or system"
            className="
              w-full pl-ds-6 pr-ds-2 py-ds-1.5 rounded-ds-sm
              text-[13px] text-[var(--content-primary)]
              bg-transparent border border-[var(--border-default)]
              placeholder:text-[var(--content-tertiary)]
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            "
          />
          {searchQuery !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-ds-2 top-1/2 -translate-y-1/2 rounded text-[var(--content-tertiary)] hover:text-[var(--content-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter toggle — opens the existing WorkflowListFilterBar panel */}
        <button
          type="button"
          onClick={onToggleFilterPanel}
          className={`
            inline-flex items-center gap-ds-1 px-ds-3 py-ds-1.5 rounded-ds-sm border
            text-[13px] font-medium transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            ${
              isFilterPanelOpen || activeFilterCount > 0
                ? 'bg-[var(--surface-secondary)] text-[var(--content-primary)] border-[var(--border-default)]'
                : 'bg-transparent text-[var(--content-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)]'
            }
          `}
          aria-label="Toggle filters"
          aria-expanded={isFilterPanelOpen}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && (
            <span
              className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-green-600 text-white text-[10px] font-semibold tabular-nums"
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort control — shares onSortChange with the column headers */}
        <label className="inline-flex items-center gap-ds-1 text-[13px] text-[var(--content-secondary)]">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sortValue(sort)}
            onChange={(e) => handleSortSelect(e.target.value)}
            aria-label="Sort workflows"
            className="
              text-[13px] font-medium text-[var(--content-primary)]
              bg-transparent border border-[var(--border-default)] rounded-ds-sm
              px-ds-2 py-ds-1.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer
            "
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {/* If the active sort is a field/dir not in the preset menu (e.g.
                toggled to an alternate direction via a column header), surface it
                as a transient option so the select reflects the true state. */}
            {!SORT_OPTIONS.some((o) => o.value === sortValue(sort)) && (
              <option value={sortValue(sort)}>
                {sort.field} ({sort.dir})
              </option>
            )}
          </select>
        </label>

        {/* Density (Batch C item 16) — compact / regular / relaxed row heights.
            Pure presentational control; never alters data. */}
        <label className="inline-flex items-center gap-ds-1 text-[13px] text-[var(--content-secondary)]">
          <Rows3 size={14} aria-hidden="true" className="hidden sm:inline" />
          <select
            value={density}
            onChange={(e) => onDensityChange(e.target.value as RowDensity)}
            aria-label="Row density"
            className="
              text-[13px] font-medium text-[var(--content-primary)]
              bg-transparent border border-[var(--border-default)] rounded-ds-sm
              px-ds-2 py-ds-1.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer
            "
          >
            {DENSITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Columns — reuses the existing ColumnPicker trigger + ref */}
        <button
          ref={columnsTriggerRef}
          type="button"
          onClick={onOpenColumns}
          className="
            inline-flex items-center gap-ds-1 px-ds-3 py-ds-1.5 rounded-ds-sm border
            text-[13px] font-medium text-[var(--content-secondary)]
            border-[var(--border-default)]
            transition-colors duration-150
            hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
          "
          aria-label="Customize columns"
          aria-expanded={isColumnsOpen}
          aria-haspopup="dialog"
        >
          <Columns3 size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Columns</span>
        </button>
      </div>

      {/* Filter panel — the existing WorkflowListFilterBar, shown on demand.
          Its handlers + analytics are byte-identical; only its visibility is
          gated here. */}
      {isFilterPanelOpen && (
        <div className="border-t border-[var(--border-subtle)]">
          <WorkflowListFilterBar
            availableSystems={availableSystems}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}

      {/* ── Row 2: preset + saved-view chips (PresetChipRail verbatim) ────── */}
      <PresetChipRail
        currentPreferences={currentPreferences}
        onApplyPreset={onApplyPreset}
        {...(userPlan !== undefined ? { userPlan } : {})}
      />
    </div>
  );
}
