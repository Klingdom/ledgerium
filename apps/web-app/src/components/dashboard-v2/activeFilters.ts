/**
 * activeFilters — the unified "active filters" model (atglance-review #11).
 *
 * ONE canonical derivation of the constraints currently narrowing the workflow
 * list, drawn from the FOUR independent filter mechanisms that all already feed
 * the single `applyFilters` pipeline:
 *
 *   (a) opportunity-segment click  → FilterState.opportunity
 *   (b) insight chip               → insightFilterKey
 *   (c) the filter panel           → FilterState.{systems,opportunity,healthStatus,needsAttention}
 *   (d) presets                    → presetFilters (a FilterSet evaluated via evaluateFilterSet)
 *       + global search            → searchQuery (the toolbar Search input)
 *
 * This module is PURE: no React, no Date.now(), no I/O. It maps the existing
 * source state into a flat, render-ready list of removable chips, each carrying
 * a `source` tag + `key` so the bar can render one chip per active constraint
 * and clear exactly that constraint (or all at once). It invents NO parallel
 * filter state — `FilterState` + `insightFilterKey` + `searchQuery` +
 * `presetId/presetFilters` remain the single source of truth; this is a
 * read-only projection of them.
 *
 * Honesty: the chip LABELS describe only real, active constraints. A constraint
 * that is not set produces no chip. Nothing here fabricates a filter — it only
 * names the ones the user (or a clicked surface) has applied.
 *
 * @see WorkflowListFilterBar.ts — FilterState definition
 * @see WorkflowList.ts          — applyFilters (the single pipeline)
 * @see DashboardV2Shell.tsx     — owns the source state + renders ActiveFiltersBar
 */

import type { FilterState, HealthStatusFilter } from './WorkflowListFilterBar.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';

// ── Source taxonomy ───────────────────────────────────────────────────────────

/**
 * Which underlying mechanism a chip's constraint originates from. Used by the
 * bar's per-chip clear to route the removal back to the correct source setter,
 * and for analytics/debug clarity.
 */
export type ActiveFilterSource =
  | 'search'
  | 'system'
  | 'opportunity'
  | 'healthStatus'
  | 'needsAttention'
  | 'insight'
  | 'preset';

/**
 * One removable active-filter chip. `key` is unique within a render so React
 * can key on it and the bar can identify which chip's clear was clicked.
 */
export interface ActiveFilterChip {
  /** Stable unique key (source + discriminator). */
  readonly key: string;
  /** Originating mechanism. */
  readonly source: ActiveFilterSource;
  /** Human-readable chip text, e.g. "Opportunity: Automate". */
  readonly label: string;
  /**
   * For multi-valued sources (systems), the specific value this chip clears.
   * `null` for single-valued sources (opportunity, healthStatus, …).
   */
  readonly value: string | null;
}

// ── Display labels (mirror WorkflowListFilterBar option labels) ───────────────

const OPPORTUNITY_LABEL: Record<OpportunityTag, string> = {
  automate: 'Automate',
  standardize: 'Standardize',
  optimize: 'Optimize',
  monitor: 'Monitor',
  healthy: 'Healthy',
};

const HEALTH_STATUS_LABEL: Record<HealthStatusFilter, string> = {
  healthy: 'Healthy',
  needs_review: 'Needs Review',
  high_variation: 'High Variation',
  stale: 'Stale',
};

/**
 * Plain-language label for an insight chip's filterKey. Definitions only — these
 * describe the real constraint each filterKey applies in `applyFilters`.
 * `bottleneck_insight` is a GLOBAL chip (no per-row filter) so it is intentionally
 * excluded — it does not narrow the list and therefore is not an active filter.
 */
const INSIGHT_FILTER_LABEL: Record<string, string> = {
  'variationScore_gt_0.7': 'High variation',
  opportunityTag_automate: 'Automation candidates',
  opportunityTag_monitor: 'Needs review',
  healthScore_gte_70: 'Healthy (70+)',
};

/**
 * Whether a given insightFilterKey actually narrows the row list. The
 * `bottleneck_insight` key is a global insight with no per-row predicate in
 * `applyFilters`, so selecting it does NOT constrain the list and must NOT
 * appear as an active-filter chip (honesty: the bar shows only real constraints).
 */
export function isRowNarrowingInsightKey(key: string | null): boolean {
  if (key === null) return false;
  return key in INSIGHT_FILTER_LABEL;
}

// ── Derivation ─────────────────────────────────────────────────────────────────

export interface ActiveFilterSources {
  filters: FilterState;
  insightFilterKey: string | null;
  searchQuery: string;
  /** Active preset id (for the chip label), or null. */
  presetId: string | null;
  /** Human-readable label for the active preset, or null. */
  presetLabel: string | null;
}

/**
 * Project the four source mechanisms into a flat, ordered list of active-filter
 * chips. Pure + deterministic — same sources → same chips.
 *
 * Order (most "scoped first"): search → systems → opportunity → healthStatus →
 * needsAttention → insight → preset. The order is stable so the bar renders
 * predictably; it has no effect on the list result (all constraints are AND-ed
 * inside `applyFilters` / `evaluateFilterSet`).
 */
export function deriveActiveFilterChips(sources: ActiveFilterSources): ActiveFilterChip[] {
  const { filters, insightFilterKey, searchQuery, presetId, presetLabel } = sources;
  const chips: ActiveFilterChip[] = [];

  // Search
  const q = searchQuery.trim();
  if (q !== '') {
    chips.push({
      key: 'search',
      source: 'search',
      label: `Search: ${q}`,
      value: null,
    });
  }

  // Systems (multi-valued → one chip per system)
  for (const system of filters.systems) {
    chips.push({
      key: `system:${system}`,
      source: 'system',
      label: `System: ${system}`,
      value: system,
    });
  }

  // Opportunity (single)
  if (filters.opportunity !== null) {
    chips.push({
      key: 'opportunity',
      source: 'opportunity',
      label: `Opportunity: ${OPPORTUNITY_LABEL[filters.opportunity]}`,
      value: filters.opportunity,
    });
  }

  // Health status (single)
  if (filters.healthStatus !== null) {
    chips.push({
      key: 'healthStatus',
      source: 'healthStatus',
      label: `Health: ${HEALTH_STATUS_LABEL[filters.healthStatus]}`,
      value: filters.healthStatus,
    });
  }

  // Needs attention (flag)
  if (filters.needsAttention) {
    chips.push({
      key: 'needsAttention',
      source: 'needsAttention',
      label: 'Needs attention',
      value: null,
    });
  }

  // Insight chip (only row-narrowing keys; bottleneck_insight excluded)
  if (insightFilterKey !== null && isRowNarrowingInsightKey(insightFilterKey)) {
    chips.push({
      key: 'insight',
      source: 'insight',
      label: INSIGHT_FILTER_LABEL[insightFilterKey] ?? 'Insight filter',
      value: insightFilterKey,
    });
  }

  // Preset (one chip; clearing it removes the preset's FilterSet from the list)
  if (presetId !== null) {
    chips.push({
      key: 'preset',
      source: 'preset',
      label: `Preset: ${presetLabel ?? presetId}`,
      value: presetId,
    });
  }

  return chips;
}

/**
 * Whether ANY active-filter chip would render for the given sources. Mirrors
 * `deriveActiveFilterChips(...).length > 0` but cheaper — the bar uses this to
 * decide whether to render at all (shows nothing when no filters are active).
 */
export function hasAnyActiveFilter(sources: ActiveFilterSources): boolean {
  return deriveActiveFilterChips(sources).length > 0;
}

// ── Pure clear reducers (single source of truth for chip removal) ─────────────

/**
 * The full active-filter source state, as a single value, so clearing logic can
 * be expressed and tested as a pure reducer. The shell holds these in separate
 * `useState`s; these reducers describe the canonical "after clear" state which
 * the shell's setters apply.
 */
export interface ActiveFilterState {
  filters: FilterState;
  insightFilterKey: string | null;
  searchQuery: string;
  presetId: string | null;
}

/** The fully-cleared filter state (Clear-all target). */
export const CLEARED_FILTER_STATE: ActiveFilterState = {
  filters: { systems: [], opportunity: null, healthStatus: null, needsAttention: false },
  insightFilterKey: null,
  searchQuery: '',
  presetId: null,
};

/**
 * Remove exactly ONE active-filter chip's constraint, routed by its `source`.
 * Pure — returns the next ActiveFilterState. The shell applies the diff via its
 * individual setters; this function is the single source of truth for which
 * constraint each chip clears.
 */
export function clearActiveFilterChip(
  state: ActiveFilterState,
  chip: ActiveFilterChip,
): ActiveFilterState {
  switch (chip.source) {
    case 'search':
      return { ...state, searchQuery: '' };
    case 'system':
      return {
        ...state,
        filters: {
          ...state.filters,
          systems: state.filters.systems.filter((s) => s !== chip.value),
        },
      };
    case 'opportunity':
      return { ...state, filters: { ...state.filters, opportunity: null } };
    case 'healthStatus':
      return { ...state, filters: { ...state.filters, healthStatus: null } };
    case 'needsAttention':
      return { ...state, filters: { ...state.filters, needsAttention: false } };
    case 'insight':
      return { ...state, insightFilterKey: null };
    case 'preset':
      return { ...state, presetId: null };
  }
}
