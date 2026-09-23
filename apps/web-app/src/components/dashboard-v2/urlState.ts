/**
 * urlState — pure parse/serialize for the Dashboard V2 shareable-URL surface
 * (row #198).
 *
 * Problem: DashboardV2Shell held timeRange / filters / searchQuery / sort in
 * plain `useState` with zero URL reflection, so a filtered view could not be
 * shared, bookmarked, or survive a reload.
 *
 * Scope (row #198 verbatim — nothing else is synced to the URL):
 *   - timeRange    (CommandHeader.tsx TimeRange)
 *   - filters      (WorkflowListFilterBar.tsx FilterState)
 *   - searchQuery  (the DEBOUNCED value — not the raw per-keystroke searchInput)
 *   - sort         (WorkflowList.tsx SortState)
 *
 * Explicitly NOT synced here: activePresetId, presetFilters, insightFilterKey,
 * visible columns (already persisted server-side per user), portfolio sidebar
 * state, highlightWorkflowId.
 *
 * This module is PURE: no React, no `window`, no DOM. `DashboardV2Shell` is the
 * only caller and owns all side effects (reading `window.location.search`,
 * `history.replaceState`, the `popstate` listener). Keeping the parse/serialize
 * logic here means it is unit-testable without jsdom (the web-app test
 * environment is `node` — see vitest.config.ts).
 *
 * ── Precedence (documented once, here, as the single source of truth) ──────────
 * For each of the four fields above, independently:
 *   1. If the URL contains a valid value for that field, the URL wins.
 *   2. Otherwise, fall back to the existing saved preference for that field —
 *      today none of these four fields have a server- or localStorage-backed
 *      preference (unlike visibleColumns/savedViews, which are explicitly out
 *      of scope for this row), so step 2 collapses to the hard default below.
 *   3. Otherwise, use the hard default.
 * A URL that OMITS a given param must never clobber whatever that field's
 * value already resolved to via steps 2/3 — `parseDashboardUrlState` only
 * returns the fields that were actually present (and valid) in the query
 * string; the caller is responsible for filling any gaps via `??`.
 */

import type { TimeRange } from './CommandHeader.js';
import type { FilterState, HealthStatusFilter } from './WorkflowListFilterBar.js';
import type { SortField, SortState } from './WorkflowList.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';

// ── Hard defaults (mirror DashboardV2Shell's initial useState literals) ────────
// These are also what gets OMITTED from a serialized URL (requirement: a
// pristine dashboard produces a clean URL with no query string).

export const DEFAULT_TIME_RANGE: TimeRange = 'all';

export const DEFAULT_FILTERS: FilterState = {
  systems: [],
  opportunity: null,
  healthStatus: null,
  needsAttention: false,
};

export const DEFAULT_SEARCH_QUERY = '';

export const DEFAULT_SORT: SortState = { field: 'date_recorded', dir: 'desc' };

// ── Known-value validation (defensive — never cast, always check membership) ───

const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', '90d', 'all'];
const OPPORTUNITY_TAGS: readonly OpportunityTag[] = [
  'automate',
  'standardize',
  'optimize',
  'monitor',
  'healthy',
];
const HEALTH_STATUSES: readonly HealthStatusFilter[] = [
  'healthy',
  'needs_review',
  'high_variation',
  'stale',
];
const SORT_FIELDS: readonly SortField[] = [
  'health_score',
  'name',
  'opportunity',
  'run_count',
  'cycle_time',
  'last_run',
  'date_recorded',
  'case_volume',
];
const SORT_DIRS: readonly SortState['dir'][] = ['asc', 'desc'];

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

// ── URL query-param names ───────────────────────────────────────────────────────
// `systems` is repeated (one param per system) rather than comma-joined — this
// lets URLSearchParams' own percent-encoding handle system names that contain a
// comma or space with zero custom escaping logic.

const PARAM = {
  timeRange: 'timeRange',
  systems: 'systems',
  opportunity: 'opportunity',
  healthStatus: 'health',
  needsAttention: 'attention',
  searchQuery: 'q',
  sort: 'sort',
} as const;

// ── Parsed shape ─────────────────────────────────────────────────────────────
// Every field is optional — a key is present IFF the URL carried a valid value
// for it. `filters` is itself partial for the same reason: a URL that sets only
// `?opportunity=automate` must not imply anything about systems/healthStatus/
// needsAttention.

export interface ParsedDashboardUrlState {
  timeRange?: TimeRange;
  filters?: Partial<FilterState>;
  searchQuery?: string;
  sort?: SortState;
}

/** The full (post-precedence) state shape `serializeDashboardUrlState` consumes. */
export interface DashboardUrlState {
  timeRange: TimeRange;
  filters: FilterState;
  searchQuery: string;
  sort: SortState;
}

/**
 * Parse a `location.search` string (with or without the leading `?`) into the
 * subset of dashboard fields the URL actually carries valid values for.
 *
 * Defensive: unknown/invalid enum values (`?timeRange=banana`, an unrecognised
 * `health`, a malformed `sort`) are silently dropped — never cast, never throw.
 * `URLSearchParams` itself never throws on malformed input, but the parse is
 * additionally wrapped so a hostile/unexpected `search` value degrades to "no
 * params present" rather than propagating an exception into the shell.
 */
export function parseDashboardUrlState(search: string): ParsedDashboardUrlState {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return {};
  }

  const result: ParsedDashboardUrlState = {};

  const rawTimeRange = params.get(PARAM.timeRange);
  if (rawTimeRange !== null && isOneOf(rawTimeRange, TIME_RANGES)) {
    result.timeRange = rawTimeRange;
  }

  const filters: Partial<FilterState> = {};

  const systemValues = params.getAll(PARAM.systems).filter((s) => s !== '');
  if (systemValues.length > 0) {
    filters.systems = systemValues;
  }

  const rawOpportunity = params.get(PARAM.opportunity);
  if (rawOpportunity !== null && isOneOf(rawOpportunity, OPPORTUNITY_TAGS)) {
    filters.opportunity = rawOpportunity;
  }

  const rawHealthStatus = params.get(PARAM.healthStatus);
  if (rawHealthStatus !== null && isOneOf(rawHealthStatus, HEALTH_STATUSES)) {
    filters.healthStatus = rawHealthStatus;
  }

  const rawNeedsAttention = params.get(PARAM.needsAttention);
  if (rawNeedsAttention !== null) {
    filters.needsAttention = rawNeedsAttention === '1';
  }

  if (Object.keys(filters).length > 0) {
    result.filters = filters;
  }

  // searchQuery: presence is meaningful even when the value is '' (an explicit
  // `?q=` clears search) — distinct from the param being absent entirely, which
  // must not touch searchQuery at all. Whitespace-only values (`?q=%20`) are
  // preserved verbatim; only exact-empty is a no-op against the default.
  const rawSearchQuery = params.get(PARAM.searchQuery);
  if (rawSearchQuery !== null) {
    result.searchQuery = rawSearchQuery;
  }

  const rawSort = params.get(PARAM.sort);
  if (rawSort !== null) {
    const parts = rawSort.split(':');
    if (parts.length === 2) {
      const [field, dir] = parts;
      if (
        field !== undefined &&
        dir !== undefined &&
        isOneOf(field, SORT_FIELDS) &&
        isOneOf(dir, SORT_DIRS)
      ) {
        result.sort = { field, dir };
      }
    }
  }

  return result;
}

/**
 * Serialize the full, post-precedence dashboard state into a `location.search`
 * string. Fields equal to their hard default are OMITTED so a pristine
 * dashboard produces a clean URL (`''`, no leading `?`). Returns `''` when
 * every field is at its default.
 */
export function serializeDashboardUrlState(state: DashboardUrlState): string {
  const params = new URLSearchParams();

  if (state.timeRange !== DEFAULT_TIME_RANGE) {
    params.set(PARAM.timeRange, state.timeRange);
  }

  for (const system of state.filters.systems) {
    params.append(PARAM.systems, system);
  }

  // Compared against the literal default (not `DEFAULT_FILTERS.<field>`) so
  // TypeScript narrows the union in the true branch without a cast.
  if (state.filters.opportunity !== null) {
    params.set(PARAM.opportunity, state.filters.opportunity);
  }

  if (state.filters.healthStatus !== null) {
    params.set(PARAM.healthStatus, state.filters.healthStatus);
  }

  if (state.filters.needsAttention) {
    params.set(PARAM.needsAttention, '1');
  }

  if (state.searchQuery !== DEFAULT_SEARCH_QUERY) {
    params.set(PARAM.searchQuery, state.searchQuery);
  }

  if (state.sort.field !== DEFAULT_SORT.field || state.sort.dir !== DEFAULT_SORT.dir) {
    params.set(PARAM.sort, `${state.sort.field}:${state.sort.dir}`);
  }

  const qs = params.toString();
  return qs === '' ? '' : `?${qs}`;
}
