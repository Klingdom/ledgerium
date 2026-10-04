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
import type { ColumnKey, TimeRange } from './types.js';
import { listColumnKeys, getDefaultVisibleColumns } from './index.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Current schema version for stored preference documents.
 *
 * Increment this constant when the wire format changes (add fields, rename
 * fields, change field semantics). Each increment MUST also add a forward-
 * migration branch in `migratePreferences` and a corresponding unit test.
 *
 * `defaultTimeRange` (row #103) is an OPTIONAL ADDITIVE field of version 1.
 * It does not bump the version (row #407): the reader deployed in production
 * rebuilds a v1 document from its known fields and ignores unknown ones, so a
 * rollback costs only the range. A bump is allowed only if the code already in
 * production can read the new version (rollback-safe) - see PERSISTENCE_SCHEMA.md §3.
 *
 * Protocol for bumping:
 *  1. Confirm production's reader can read the new version without data loss.
 *  2. Increment `CURRENT_SCHEMA_VERSION`.
 *  3. Add a `v${N-1}_to_v${N}` migration step inside `migratePreferences`.
 *  4. Add a unit test in `persistence.test.ts` covering the forward migration.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/**
 * Highest schemaVersion this reader treats as its own. Version 2 existed only
 * in local/test databases (loop 203, never deployed): same shape as v1 plus
 * `defaultTimeRange`, so it is read as v1 and rewritten as v1 on the next PUT.
 * Anything above this is a genuinely newer document: read-only (see
 * `MigrationResult.isNewerVersion`).
 */
export const LAST_COMPATIBLE_SCHEMA_VERSION = 2 as const;

/** Oldest stored schema version that can be forward-migrated. */
const MIN_MIGRATABLE_SCHEMA_VERSION = 1;

/** Closed set of persistable time ranges (mirrors `TimeRange` in types.ts). */
export const TIME_RANGE_VALUES: readonly TimeRange[] = ['7d', '30d', '90d', 'all'];

/** The default range: today's dashboard default, and what legacy (v1) rows migrate to. */
export const DEFAULT_TIME_RANGE_PREFERENCE: TimeRange = 'all';

/** Runtime membership check; the stored value is untrusted JSON. */
export function isTimeRange(value: unknown): value is TimeRange {
  return typeof value === 'string' && (TIME_RANGE_VALUES as readonly string[]).includes(value);
}

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
  /**
   * v2: the user's default time range. Absent only on hand-built in-memory
   * values; every migrated/default document carries it ('all' unless the user
   * chose another). A per-user setting, independent of lens and of saved views
   * (a saved view neither carries nor changes it).
   */
  readonly defaultTimeRange?: TimeRange;
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
  /**
   * True when the stored document was written by a newer client
   * (schemaVersion > `LAST_COMPATIBLE_SCHEMA_VERSION`). `preferences` then holds
   * the known fields read from it, but callers MUST NOT write it back: the
   * stored row may carry fields this code does not know (row #407).
   */
  readonly isNewerVersion?: boolean;
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
    defaultTimeRange: DEFAULT_TIME_RANGE_PREFERENCE,
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
  // Non-destructive (row #407): read the known fields instead of resetting.
  if (storedVersion > LAST_COMPATIBLE_SCHEMA_VERSION) {
    const read = migrateDocument(doc);
    return {
      ...read,
      warnings: [
        `Preferences from a newer client version (schemaVersion ${storedVersion}); read known fields only, not rewriting.`,
        ...read.warnings,
      ],
      isNewerVersion: true,
    };
  }

  // ── Unsupported past version (older than any deployed schema) ────────────
  if (storedVersion < MIN_MIGRATABLE_SCHEMA_VERSION) {
    return {
      preferences: getDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preferences at unsupported legacy schemaVersion ${storedVersion}; resetting to defaults.`,
      ],
    };
  }

  // ── v1 (current) and v2 (local-only, read as v1) ──────────────────────────
  return migrateDocument(doc);
}

/**
 * Validate and clean a stored document (schemaVersion 1; v2 and newer are read
 * through the same known-field rules).
 *
 * `defaultTimeRange` is optional: absent resolves to the default ('all') with
 * no warning; present but not a valid range resets to the default with a warning.
 *
 * Drops unknown `ColumnKey`s from `visibleColumns` and `columnOrder`.
 * Returns defaults for any missing or wrong-type required fields.
 *
 * Pure function; no I/O.
 */
function migrateDocument(doc: Record<string, unknown>): MigrationResult {
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

  // ── defaultTimeRange (optional additive field of v1) ──────────────────────
  let defaultTimeRange: TimeRange = DEFAULT_TIME_RANGE_PREFERENCE;
  if (doc['defaultTimeRange'] !== undefined) {
    if (isTimeRange(doc['defaultTimeRange'])) {
      defaultTimeRange = doc['defaultTimeRange'];
    } else {
      warnings.push(
        `defaultTimeRange is not a valid range (got: ${JSON.stringify(doc['defaultTimeRange'])}); using "${DEFAULT_TIME_RANGE_PREFERENCE}".`,
      );
    }
  }

  const preferences: UserDashboardPreference = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    visibleColumns,
    columnOrder,
    filters,
    savedViews,
    defaultTimeRange,
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
      ...(prefs.defaultTimeRange !== undefined ? { defaultTimeRange: prefs.defaultTimeRange } : {}),
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
