/**
 * Workflow Dashboard Column Registry — public surface (iter-056 / Path D D+1).
 *
 * Consumers import from `@/lib/dashboard-columns` (this barrel). No logic
 * lives in this file per CLAUDE.md "no logic in index files".
 *
 * @see types.ts — interfaces + closed unions
 * @see registry.ts — frozen catalog of 38 column entries
 * @see accessors.ts — pure derivations for available columns
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ColumnKey,
  ColumnGroup,
  ColumnDataType,
  ColumnAvailability,
  PlanTierGate,
  ColumnAccessor,
  ColumnAccessorContext,
  TimeRange,
  WorkflowDashboardColumn,
} from './types.js';

// ── Catalog ───────────────────────────────────────────────────────────────────
export { WORKFLOW_DASHBOARD_COLUMNS } from './registry.js';

// ── Accessors (named exports for fine-grained imports + lookup table) ─────────
export {
  accessWorkflowTitle,
  accessSystems,
  accessOpportunityTag,
  accessHealthScore,
  accessLastRunAt,
  accessRunCount,
  accessCycleTimeMs,
  accessCycleTimeMeanMs,
  accessCaseVolume,
  accessSystemCountPerRun,
  AVAILABLE_ACCESSORS,
} from './accessors.js';

// ── Lookup helpers ────────────────────────────────────────────────────────────

import { WORKFLOW_DASHBOARD_COLUMNS } from './registry.js';
import type { ColumnKey, WorkflowDashboardColumn } from './types.js';

/**
 * Find a registry entry by `ColumnKey`. Returns `undefined` if the key is not
 * present (TypeScript closed-union prevents this in normal use; runtime guard
 * remains for dynamic-key consumers like persistence rehydration in D+3).
 *
 * Determinism: pure lookup over the frozen registry.
 */
export function getColumnByKey(key: ColumnKey): WorkflowDashboardColumn | undefined {
  return WORKFLOW_DASHBOARD_COLUMNS.find((col) => col.key === key);
}

/**
 * Return the full set of `ColumnKey` literals registered in the catalog. Used
 * by D+3 persistence (versioned-schema migration) and D+4 picker (rendering
 * checkbox list) to enumerate the column space without duplicating the union.
 */
export function listColumnKeys(): readonly ColumnKey[] {
  return WORKFLOW_DASHBOARD_COLUMNS.map((col) => col.key);
}

/**
 * Return the default-pack subset (`defaultVisible: true`). The D+6 default-
 * pack iteration may revise the contents; consumers should treat this as the
 * source of truth for "what shows up before the user customizes anything".
 */
export function getDefaultVisibleColumns(): readonly WorkflowDashboardColumn[] {
  return WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
}

// ── Filters (D+2) ─────────────────────────────────────────────────────────────
export type {
  FilterOperator,
  FilterValue,
  ScalarFilterValue,
  RangeFilterValue,
  DateRangeFilterValue,
  MultiFilterValue,
  TextFilterValue,
  FlagFilterValue,
  ColumnFilter,
  FilterSet,
} from './filters.js';

export {
  OperatorsByDataType,
  evaluateFilter,
  evaluateFilterSet,
  getFilterableColumns,
  listOperatorsForColumn,
} from './filters.js';

// ── Persistence (D+3) ─────────────────────────────────────────────────────────
export type {
  SavedView,
  UserDashboardPreference,
  MigrationResult,
  DbSerializedPreference,
} from './persistence.js';

export {
  CURRENT_SCHEMA_VERSION,
  getDefaultPreferences,
  migratePreferences,
  serializePreferencesForDb,
  deserializePreferencesFromDb,
} from './persistence.js';
