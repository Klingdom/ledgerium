/**
 * Dashboard Column-Config Persistence — Path D D+3 (iter-059).
 *
 * Pure adapter module for the `user_dashboard_preferences` Prisma model.
 * Provides:
 *  - `UserDashboardPreference` — runtime shape of the JSON payload
 *  - `SavedView` — forward-compat stub for D+5 preset chips
 *  - `CURRENT_SCHEMA_VERSION` — single source of truth for version constant
 *  - `getDefaultPreferences()` — deterministic defaults from D+1 registry
 *  - `migratePreferences(raw)` — pure migration function (zero I/O, zero clocks)
 *  - `serializePreferencesForDb(prefs)` — write adapter
 *  - `deserializePreferencesFromDb(row)` — read adapter
 *
 * Determinism contract (CLAUDE.md core):
 *  - Same input → byte-identical output for all functions in this module.
 *  - Zero `Date.now()`, `Math.random()`, or any I/O.
 *  - `SavedView.createdAt` is caller-supplied; this module never generates it.
 *
 * Audit-honesty IFF invariant (from D+1 registry, extended here):
 *  - Saved column keys that no longer exist in the registry are gracefully
 *    dropped on read; the caller receives a `droppedKeys` list so the UI can
 *    surface the "N columns unavailable" notice (E2E Scenario 4).
 *  - Filter references to stale columns are NOT dropped — they are returned
 *    verbatim and the D+2 `evaluateFilter` guard returns `false` at runtime.
 *    This preserves the user's filter intent without silently corrupting it.
 *
 * Deferred (see PERSISTENCE_SCHEMA.md §5):
 *  - localStorage write-through cache → D+4 picker iteration
 *  - URL shareable-link override → D+5 preset-chips iteration
 *  - SavedView CRUD routes → D+5 preset-chips iteration
 *  - /api/dashboard/preferences GET/PUT → D+4 picker iteration
 *
 * @see docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md
 * @see apps/web-app/src/lib/dashboard-columns/filters.ts (FilterSet — D+2)
 * @see apps/web-app/src/lib/dashboard-columns/registry.ts (column registry — D+1)
 * @see apps/web-app/prisma/schema.prisma (UserDashboardPreference model)
 */

import type { FilterSet } from './filters.js';
import type { ColumnKey } from './types.js';
import { listColumnKeys, getDefaultVisibleColumns } from './index.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Current schema version for stored preference documents.
 *
 * Increment this constant when the wire format changes (add fields, rename
 * fields, change field semantics). Each increment MUST also add a forward-
 * migration branch in `migratePreferences` and a corresponding unit test.
 *
 * Protocol for bumping:
 *  1. Increment `CURRENT_SCHEMA_VERSION`.
 *  2. Add a `v${N-1}_to_v${N}` migration step inside `migratePreferences`.
 *  3. Add a unit test in `persistence.test.ts` covering the forward migration.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

// ── SavedView (forward-compat stub for D+5) ───────────────────────────────────

/**
 * A named snapshot of a (visibleColumns, columnOrder, filters) triple.
 *
 * D+5 preset-chips iteration adds CRUD semantics (create/update/delete named
 * views). Iter-059 ships only the type + round-trip persistence fidelity — the
 * `savedViews` array inside `UserDashboardPreference` round-trips through
 * `serializePreferencesForDb` / `deserializePreferencesFromDb` without loss.
 *
 * **`id`**: caller-generated (UUID or cuid). This module never generates IDs.
 * **`createdAt`**: ISO-8601 string; caller-supplied. Not generated here.
 */
export interface SavedView {
  /** Caller-generated stable identifier (UUID or cuid). */
  readonly id: string;
  /** User-chosen label for the view (≤ 64 chars recommended). */
  readonly name: string;
  /** Columns visible in this saved view. */
  readonly visibleColumns: readonly ColumnKey[];
  /** Display order of columns in this saved view. */
  readonly columnOrder: readonly ColumnKey[];
  /** Active filters for this saved view. */
  readonly filters: FilterSet;
  /** ISO-8601 creation timestamp; caller-supplied, never generated here. */
  readonly createdAt: string;
}

// ── UserDashboardPreference (runtime payload shape) ───────────────────────────

/**
 * Runtime shape of the JSON document stored in
 * `user_dashboard_preferences.payload`.
 *
 * This interface represents the IN-MEMORY representation used by all callers.
 * The persistence adapters (`serializePreferencesForDb` /
 * `deserializePreferencesFromDb`) convert between this type and the raw JSON
 * string stored in the database.
 *
 * Wire format is defined in PERSISTENCE_SCHEMA.md §2.
 */
export interface UserDashboardPreference {
  /** Schema version at time of last write. Always `CURRENT_SCHEMA_VERSION` after migration. */
  readonly schemaVersion: number;
  /**
   * Ordered list of column keys the user has toggled on.
   * Every entry is a member of `listColumnKeys()` at the time preferences were
   * last cleaned. Entries may become stale if a `ColumnKey` is removed after
   * the document was written; `migratePreferences` handles graceful degradation.
   */
  readonly visibleColumns: readonly ColumnKey[];
  /**
   * Full display order of visible columns.
   * Must be a permutation of `visibleColumns`. Allows drag-and-drop reordering
   * in D+4 picker UI.
   */
  readonly columnOrder: readonly ColumnKey[];
  /**
   * Active filter set. Stored verbatim; see PERSISTENCE_SCHEMA.md §2 invariant 3
   * for the rationale behind not dropping stale filter column references.
   */
  readonly filters: FilterSet;
  /**
   * Named saved views. Empty array before D+5 preset-chips iteration adds CRUD.
   * The array round-trips through persistence without loss.
   */
  readonly savedViews: readonly SavedView[];
}

// ── MigrationResult ───────────────────────────────────────────────────────────

/**
 * Return value of `migratePreferences` and `deserializePreferencesFromDb`.
 *
 * `droppedKeys`: `ColumnKey` values that were present in the stored document but
 * are no longer in the registry. The D+4 API GET handler should surface the
 * "N columns unavailable" notice to the UI and write back the cleaned document
 * so subsequent reads return a clean state (E2E Scenario 4).
 *
 * `warnings`: human-readable strings describing fallback decisions (e.g.
 * "No preference document found; using defaults."). Empty in the normal path.
 * Intended for server-side logging, NOT for direct display to end users.
 */
export interface MigrationResult {
  readonly preferences: UserDashboardPreference;
  readonly droppedKeys: readonly ColumnKey[];
  readonly warnings: readonly string[];
}

// ── Serialization helpers ─────────────────────────────────────────────────────

/**
 * Return value of `serializePreferencesForDb`.
 *
 * `schemaVersion` mirrors `preferences.schemaVersion` so the Prisma model's
 * top-level column is always in sync with the payload (enables DB-side queries
 * like `WHERE schema_version < 2` without parsing JSON).
 *
 * `payload` is a JSON string ready for the Prisma `String` column
 * (SQLite stores JSON as TEXT; Prisma handles the column mapping).
 */
export interface DbSerializedPreference {
  readonly schemaVersion: number;
  readonly payload: string;
}

// ── getDefaultPreferences ─────────────────────────────────────────────────────

/**
 * Return the deterministic default `UserDashboardPreference`.
 *
 * Default visible columns come from `getDefaultVisibleColumns()` (D+1 registry
 * helper — columns with `defaultVisible: true`). `columnOrder` mirrors
 * `visibleColumns`. `filters` and `savedViews` are empty.
 *
 * Determinism: same output on every call. No I/O, no clocks.
 * Returns a fresh object on every call (not a singleton) so callers can safely
 * mutate-replace fields in test assertions without affecting other callers.
 */
export function getDefaultPreferences(): UserDashboardPreference {
  const defaultCols = getDefaultVisibleColumns().map((col) => col.key);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    visibleColumns: defaultCols,
    columnOrder: defaultCols,
    filters: [] as FilterSet,
    savedViews: [],
  };
}

// ── migratePreferences ────────────────────────────────────────────────────────

/**
 * Pure deterministic migration function.
 *
 * Accepts an `unknown` value (the raw parsed JSON blob from the DB, localStorage,
 * or any other source) and returns a `MigrationResult` with:
 *  - `preferences`: a valid, cleaned `UserDashboardPreference` at
 *    `CURRENT_SCHEMA_VERSION`
 *  - `droppedKeys`: any `ColumnKey` values from the stored document that are no
 *    longer present in the registry (E2E Scenario 4 graceful degradation)
 *  - `warnings`: human-readable strings for server-side logging (NOT for users)
 *
 * Never throws. All error/fallback paths return `getDefaultPreferences()`.
 *
 * Determinism: same `raw` → byte-identical `MigrationResult`. Zero I/O.
 */
export function migratePreferences(raw: unknown): MigrationResult {
  // ── Null / undefined ─────────────────────────────────────────────────────
  if (raw === null || raw === undefined) {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: ['No preference document found; using defaults.'],
    };
  }

  // ── Must be a plain object ───────────────────────────────────────────────
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preference document has unexpected type "${Array.isArray(raw) ? 'array' : typeof raw}"; using defaults.`,
      ],
    };
  }

  const doc = raw as Record<string, unknown>;

  // ── schemaVersion must be a number ────────────────────────────────────────
  if (typeof doc['schemaVersion'] !== 'number') {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preference document missing or invalid schemaVersion (got: ${JSON.stringify(doc['schemaVersion'])}); using defaults.`,
      ],
    };
  }

  const storedVersion = doc['schemaVersion'] as number;

  // ── Future version: newer client wrote this document ─────────────────────
  if (storedVersion > CURRENT_SCHEMA_VERSION) {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preferences from a newer client version (schemaVersion ${storedVersion}); resetting to defaults.`,
      ],
    };
  }

  // ── Past version: forward-migrate ────────────────────────────────────────
  if (storedVersion < CURRENT_SCHEMA_VERSION) {
    // No prior versions exist yet (current is v1, the first version).
    // This branch is a defensive forward-migration skeleton for when v2+
    // ships. Each version bump adds a case here.
    //
    // When v2 ships:
    //   if (storedVersion === 1) { doc = migrateV1ToV2(doc); }
    //
    // For now: no migration path exists from any prior version (none were
    // deployed), so return defaults with a warning.
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preferences at unsupported legacy schemaVersion ${storedVersion}; resetting to defaults.`,
      ],
    };
  }

  // ── Current version: validate and clean ──────────────────────────────────
  // storedVersion === CURRENT_SCHEMA_VERSION (=== 1)
  return migrateV1(doc);
}

/**
 * Validate and clean a schemaVersion-1 document.
 *
 * Drops unknown `ColumnKey`s from `visibleColumns` and `columnOrder`.
 * Returns defaults for any missing or wrong-type required fields.
 *
 * Pure function; no I/O.
 */
function migrateV1(doc: Record<string, unknown>): MigrationResult {
  const knownKeys = new Set<string>(listColumnKeys());
  const droppedKeys: ColumnKey[] = [];
  const warnings: string[] = [];

  // ── visibleColumns ────────────────────────────────────────────────────────
  let visibleColumns: ColumnKey[];
  if (!Array.isArray(doc['visibleColumns'])) {
    warnings.push(
      `visibleColumns is not an array (got: ${typeof doc['visibleColumns']}); using defaults.`,
    );
    visibleColumns = [...getDefaultPreferences().visibleColumns] as ColumnKey[];
  } else {
    visibleColumns = [];
    for (const key of doc['visibleColumns'] as unknown[]) {
      if (typeof key !== 'string') {
        warnings.push(`visibleColumns entry is not a string (got: ${typeof key}); skipping.`);
        continue;
      }
      if (!knownKeys.has(key)) {
        droppedKeys.push(key as ColumnKey);
      } else {
        visibleColumns.push(key as ColumnKey);
      }
    }
  }

  // ── columnOrder ───────────────────────────────────────────────────────────
  // columnOrder must be a permutation of visibleColumns (after cleaning).
  // Keys in columnOrder that are not in cleaned visibleColumns are dropped.
  const visibleSet = new Set<string>(visibleColumns);
  let columnOrder: ColumnKey[];
  if (!Array.isArray(doc['columnOrder'])) {
    // Fall back to using visibleColumns as the order
    columnOrder = [...visibleColumns];
  } else {
    columnOrder = [];
    const seenInOrder = new Set<string>();
    for (const key of doc['columnOrder'] as unknown[]) {
      if (typeof key !== 'string') continue;
      if (!visibleSet.has(key)) continue; // not visible, skip
      if (seenInOrder.has(key)) continue; // deduplicate
      seenInOrder.add(key);
      columnOrder.push(key as ColumnKey);
    }
    // If any visible columns are missing from columnOrder, append them
    for (const key of visibleColumns) {
      if (!seenInOrder.has(key)) {
        columnOrder.push(key);
      }
    }
  }

  // ── filters ───────────────────────────────────────────────────────────────
  // Stored verbatim — see PERSISTENCE_SCHEMA.md §2 invariant 3.
  // We only validate the outer shape (must be an array); inner ColumnFilter
  // validation is deferred to evaluateFilter at runtime (audit-honesty IFF).
  const filters: FilterSet = Array.isArray(doc['filters'])
    ? (doc['filters'] as FilterSet)
    : ([] as FilterSet);

  // ── savedViews ────────────────────────────────────────────────────────────
  // Round-trip verbatim; D+5 will validate/process individual views.
  const savedViews: SavedView[] = Array.isArray(doc['savedViews'])
    ? (doc['savedViews'] as SavedView[])
    : [];

  const preferences: UserDashboardPreference = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    visibleColumns,
    columnOrder,
    filters,
    savedViews,
  };

  return { preferences, droppedKeys, warnings };
}

// ── serializePreferencesForDb ─────────────────────────────────────────────────

/**
 * Serialize a `UserDashboardPreference` for writing to the Prisma model.
 *
 * Returns `{ schemaVersion, payload }` where:
 *  - `schemaVersion` mirrors `prefs.schemaVersion` for DB-side queries.
 *  - `payload` is a JSON string suitable for the `String` Prisma column
 *    (SQLite backend; JSON stored as TEXT).
 *
 * Pure function; no I/O, no clocks. Does not mutate `prefs`.
 */
export function serializePreferencesForDb(
  prefs: UserDashboardPreference,
): DbSerializedPreference {
  return {
    schemaVersion: prefs.schemaVersion,
    payload: JSON.stringify({
      schemaVersion: prefs.schemaVersion,
      visibleColumns: prefs.visibleColumns,
      columnOrder: prefs.columnOrder,
      filters: prefs.filters,
      savedViews: prefs.savedViews,
    }),
  };
}

// ── deserializePreferencesFromDb ──────────────────────────────────────────────

/**
 * Deserialize a Prisma model row into a `MigrationResult`.
 *
 * Accepts the raw `{ schemaVersion, payload }` pair from a DB read, or `null`
 * if no row exists for this user yet.
 *
 * - `null` input → `getDefaultPreferences()` with no warnings (first-use path).
 * - Non-null input → passes through `migratePreferences()` after JSON.parse.
 *   JSON parse failures return defaults + a warning.
 *
 * Pure function; no I/O, no clocks.
 */
export function deserializePreferencesFromDb(
  row: { schemaVersion: number; payload: string } | null,
): MigrationResult {
  if (row === null) {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.payload);
  } catch {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [`Failed to parse preference payload JSON; using defaults.`],
    };
  }

  return migratePreferences(parsed);
}
