/**
 * Persistence schema tests — Path D D+3 (iter-059).
 *
 * Coverage: getDefaultPreferences, migratePreferences, round-trip
 * serialization, graceful degradation (E2E Scenario 4), and schema-version
 * boundary handling.
 *
 * MR-006 Change C: ≥12 substantive `it()` blocks required for drift-counter
 * credit. This file ships 16 substantive blocks.
 *
 * Determinism contract: all assertions use deep-equal (toEqual) not
 * reference-equal (toBe) because `getDefaultPreferences()` returns a fresh
 * object on each call by design.
 *
 * @see apps/web-app/src/lib/dashboard-columns/persistence.ts
 * @see docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md
 */

import { describe, it, expect } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  LAST_COMPATIBLE_SCHEMA_VERSION,
  getDefaultPreferences,
  migratePreferences,
  serializePreferencesForDb,
  deserializePreferencesFromDb,
} from './persistence.js';
import { listColumnKeys, getDefaultVisibleColumns } from './index.js';
import type { FilterSet } from './filters.js';
import type { ColumnKey } from './types.js';
import type { SavedView, UserDashboardPreference, MigrationResult } from './persistence.js';

// ── Group A: getDefaultPreferences ────────────────────────────────────────────

describe('Group A: getDefaultPreferences()', () => {
  it('A-1: schemaVersion is CURRENT_SCHEMA_VERSION (1) and the default range is all', () => {
    const prefs = getDefaultPreferences();
    expect(prefs.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(prefs.defaultTimeRange).toBe('all');
  });

  it('A-2: default visibleColumns are a non-empty subset of registered ColumnKeys', () => {
    const prefs = getDefaultPreferences();
    const knownKeys = new Set(listColumnKeys());
    expect(prefs.visibleColumns.length).toBeGreaterThan(0);
    for (const key of prefs.visibleColumns) {
      expect(knownKeys.has(key)).toBe(true);
    }
  });

  it('A-3: deterministic repeat-call returns deep-equal (not reference-equal) shapes', () => {
    const first = getDefaultPreferences();
    const second = getDefaultPreferences();
    // Different references (fresh object each call)
    expect(first).not.toBe(second);
    // Byte-identical content
    expect(first).toEqual(second);
  });

  it('A-4: default filters is an empty array and savedViews is an empty array', () => {
    const prefs = getDefaultPreferences();
    expect(prefs.filters).toEqual([]);
    expect(prefs.savedViews).toEqual([]);
  });
});

// ── Group B: migratePreferences — happy path ──────────────────────────────────

describe('Group B: migratePreferences — valid v1 input', () => {
  it('B-1: valid v1 document with known columns migrates unchanged at the current version', () => {
    const knownKeys = listColumnKeys();
    // Take the first 3 known keys as our visible set
    const pick = knownKeys.slice(0, 3) as string[];
    const raw = {
      schemaVersion: 1,
      visibleColumns: pick,
      columnOrder: pick,
      filters: [],
      savedViews: [],
    };
    const result = migratePreferences(raw);
    expect(result.preferences.schemaVersion).toBe(1);
    expect(result.preferences.visibleColumns).toEqual(pick);
    expect(result.preferences.columnOrder).toEqual(pick);
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('B-2: valid v1 document with unknown column key → that key is dropped', () => {
    const raw = {
      schemaVersion: 1,
      visibleColumns: ['workflow_title', 'UNKNOWN_LEGACY_COLUMN'],
      columnOrder: ['workflow_title', 'UNKNOWN_LEGACY_COLUMN'],
      filters: [],
      savedViews: [],
    };
    const result = migratePreferences(raw);
    expect(result.preferences.visibleColumns).toEqual(['workflow_title']);
    expect(result.preferences.columnOrder).toEqual(['workflow_title']);
    expect(result.droppedKeys).toContain('UNKNOWN_LEGACY_COLUMN');
  });

  it('B-3: valid v1 document with all-known columns → droppedKeys is empty', () => {
    const knownKeys = listColumnKeys();
    const allKnown = knownKeys.slice(0, 5) as string[];
    const raw = {
      schemaVersion: 1,
      visibleColumns: allKnown,
      columnOrder: allKnown,
      filters: [],
      savedViews: [],
    };
    const result = migratePreferences(raw);
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.preferences.visibleColumns).toEqual(allKnown);
  });
});

// ── Group C: migratePreferences — defensive / fallback paths ──────────────────

describe('Group C: migratePreferences — defensive inputs', () => {
  it('C-1: null input → defaults + warning', () => {
    const result = migratePreferences(null);
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('C-2: undefined input → defaults + warning', () => {
    const result = migratePreferences(undefined);
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('C-3: wrong-type inputs (array, number, string) → defaults + warning each', () => {
    for (const wrongInput of [[], 42, 'hello'] as unknown[]) {
      const result = migratePreferences(wrongInput);
      expect(result.preferences).toEqual(getDefaultPreferences());
      expect(result.droppedKeys).toEqual([]);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it('C-4: object missing schemaVersion field → defaults + warning', () => {
    const result = migratePreferences({ visibleColumns: ['workflow_title'] });
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ── Group D: migratePreferences — schema-version boundary handling ─────────────

describe('Group D: migratePreferences — schema-version boundaries', () => {
  it('D-1: schemaVersion above the compatible range -> known fields are read, not reset (#407)', () => {
    const result = migratePreferences({
      schemaVersion: LAST_COMPATIBLE_SCHEMA_VERSION + 99,
      visibleColumns: ['workflow_title'],
      columnOrder: ['workflow_title'],
      filters: [],
      savedViews: [{ id: 'v', name: 'kept', visibleColumns: ['workflow_title'], columnOrder: ['workflow_title'], filters: [], createdAt: '2026-01-01T00:00:00.000Z' }],
    });
    expect(result.isNewerVersion).toBe(true);
    expect(result.preferences.visibleColumns).toEqual(['workflow_title']);
    expect(result.preferences.savedViews).toHaveLength(1);
    expect(result.warnings.join('\n').toLowerCase()).toMatch(/newer/);
  });

  it('D-2: schemaVersion < CURRENT_SCHEMA_VERSION (defensive legacy branch) → defaults + warning', () => {
    const result = migratePreferences({ schemaVersion: 0 });
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ── Group E: round-trip serialization ─────────────────────────────────────────

describe('Group E: serialize → deserialize round-trip', () => {
  it('E-1: serialize then deserialize returns deep-equal preferences', () => {
    // Use getDefaultPreferences() as the input — it returns a properly-typed
    // UserDashboardPreference, bypassing the string[] vs ColumnKey[] issue that
    // would arise from slicing listColumnKeys() (which returns readonly ColumnKey[]
    // but slice produces ColumnKey[], still assignable to readonly ColumnKey[]).
    const prefs = getDefaultPreferences();

    const serialized = serializePreferencesForDb(prefs);
    expect(serialized.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(typeof serialized.payload).toBe('string');

    const row = { schemaVersion: serialized.schemaVersion, payload: serialized.payload };
    const result = deserializePreferencesFromDb(row);
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings).toEqual([]);
    // All fields survive the round-trip
    expect(result.preferences.schemaVersion).toBe(prefs.schemaVersion);
    expect(result.preferences.visibleColumns).toEqual([...prefs.visibleColumns]);
    expect(result.preferences.columnOrder).toEqual([...prefs.columnOrder]);
    expect(result.preferences.filters).toEqual([]);
    expect(result.preferences.savedViews).toEqual([]);
  });

  it('E-2: serializing defaults round-trips cleanly with schemaVersion 1', () => {
    const defaults = getDefaultPreferences(); // already typed as UserDashboardPreference
    const serialized = serializePreferencesForDb(defaults);
    const row = { schemaVersion: serialized.schemaVersion, payload: serialized.payload };
    const result = deserializePreferencesFromDb(row);

    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.preferences.schemaVersion).toBe(1);
    // Deep-equal to original defaults
    expect(result.preferences).toEqual(defaults);
  });
});

// ── Group F: graceful degradation (E2E Scenario 4) ───────────────────────────

describe('Group F: graceful degradation — stale ColumnKey references (E2E Scenario 4)', () => {
  it('F-1: visibleColumns with a now-removed key → removed key in droppedKeys, not in preferences.visibleColumns', () => {
    // Simulate a stored document that references a column that no longer exists
    const removedKey = 'DEPRECATED_COLUMN_FROM_OLD_DEPLOY';
    const raw = {
      schemaVersion: 1,
      visibleColumns: ['workflow_title', removedKey, 'health_score'],
      columnOrder: ['workflow_title', removedKey, 'health_score'],
      filters: [],
      savedViews: [],
    };
    const result = migratePreferences(raw);

    // Removed key must appear in droppedKeys
    expect(result.droppedKeys).toContain(removedKey);

    // Removed key must NOT appear in the returned preferences
    expect(result.preferences.visibleColumns).not.toContain(removedKey);
    expect(result.preferences.columnOrder).not.toContain(removedKey);

    // Known columns are preserved
    expect(result.preferences.visibleColumns).toContain('workflow_title');
    expect(result.preferences.visibleColumns).toContain('health_score');
  });

  it('F-2: columnOrder with a removed key → that key filtered from columnOrder, droppedKeys populated', () => {
    const removedKey = 'ANOTHER_STALE_KEY';
    const raw = {
      schemaVersion: 1,
      visibleColumns: ['workflow_title'],         // removedKey not in visible → already filtered
      columnOrder: ['workflow_title', removedKey], // but it slipped into columnOrder
      filters: [],
      savedViews: [],
    };
    const result = migratePreferences(raw);

    // columnOrder must not contain the stale key
    expect(result.preferences.columnOrder).not.toContain(removedKey);
    // The stale key should be in droppedKeys if it was in visibleColumns
    // (it wasn't in visibleColumns here, so droppedKeys reflects only visible drops)
    // columnOrder stale entries are silently dropped (not added to droppedKeys,
    // since they were already absent from the visible set)
    expect(result.preferences.columnOrder).toEqual(['workflow_title']);
  });

  it('F-3: null DB row (no preference saved yet) → defaults, no warnings, no droppedKeys', () => {
    const result = deserializePreferencesFromDb(null);
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('F-4: DB row with corrupted JSON payload → defaults + warning', () => {
    const row = { schemaVersion: 1, payload: '{this is not valid json' };
    const result = deserializePreferencesFromDb(row);
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ── Group G: defaultTimeRange (optional additive field of v1, rows #103/#407) ─

describe('Group G: defaultTimeRange (additive, version stays 1)', () => {
  const cols = ['workflow_title', 'health_score'];
  const base = { visibleColumns: cols, columnOrder: cols, filters: [], savedViews: [] };
  const view = { id: 'v1', name: 'Mine', visibleColumns: ['workflow_title'], columnOrder: ['workflow_title'], filters: [], createdAt: '2026-01-01T00:00:00.000Z' };

  it('G-0: the schema version is 1 (an additive optional field does not bump it)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(getDefaultPreferences().schemaVersion).toBe(1);
  });

  it('G-1: a v1 document without the field gets the default range "all" silently', () => {
    const result = migratePreferences({ schemaVersion: 1, ...base });
    expect(result.preferences.schemaVersion).toBe(1);
    expect(result.preferences.defaultTimeRange).toBe('all');
    expect(result.warnings).toEqual([]);
    expect(result.isNewerVersion).toBeUndefined();
  });

  it.each(['7d', '30d', '90d', 'all'] as const)('G-2: a v1 document keeps its range %s, columns and views', (range) => {
    const result = migratePreferences({ schemaVersion: 1, defaultTimeRange: range, ...base, savedViews: [view] });
    expect(result.preferences.defaultTimeRange).toBe(range);
    expect(result.preferences.visibleColumns).toEqual(cols);
    expect(result.preferences.savedViews).toEqual([view]);
    expect(result.warnings).toEqual([]);
  });

  it('G-3: an invalid range resets to "all" with a warning and keeps the rest of the document', () => {
    for (const bad of ['1y', 7, null, {}, ''] as unknown[]) {
      const result = migratePreferences({ schemaVersion: 1, defaultTimeRange: bad, ...base });
      expect(result.preferences.defaultTimeRange).toBe('all');
      expect(result.preferences.visibleColumns).toEqual(cols);
      expect(result.warnings.join('\n')).toMatch(/defaultTimeRange/);
    }
  });

  it('G-4: a schemaVersion 2 document (local/test DBs only) is read as v1 and is not "newer"', () => {
    const result = migratePreferences({ schemaVersion: 2, defaultTimeRange: '7d', ...base });
    expect(result.preferences.schemaVersion).toBe(1);
    expect(result.preferences.defaultTimeRange).toBe('7d');
    expect(result.preferences.visibleColumns).toEqual(cols);
    expect(result.isNewerVersion).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it('G-5: the range round-trips through serialize/deserialize under version 1', () => {
    const prefs = { ...getDefaultPreferences(), defaultTimeRange: '90d' as const };
    const s = serializePreferencesForDb(prefs);
    expect(s.schemaVersion).toBe(1);
    expect(JSON.parse(s.payload).schemaVersion).toBe(1);
    expect(JSON.parse(s.payload).defaultTimeRange).toBe('90d');
    const back = deserializePreferencesFromDb({ schemaVersion: s.schemaVersion, payload: s.payload });
    expect(back.preferences.defaultTimeRange).toBe('90d');
  });

  it('G-6: a newer version (3) keeps columns, views and range, and flags isNewerVersion', () => {
    const result = migratePreferences({ schemaVersion: 3, defaultTimeRange: '7d', ...base, savedViews: [view], futureField: { x: 1 } });
    expect(result.isNewerVersion).toBe(true);
    expect(result.preferences.defaultTimeRange).toBe('7d');
    expect(result.preferences.visibleColumns).toEqual(cols);
    expect(result.preferences.savedViews).toEqual([view]);
  });
});

// ── Group H: rollback safety (row #407) ───────────────────────────────────────
//
// FROZEN COPY of the reader deployed in production (origin/main at loop 151):
// `getDefaultPreferences` + `migratePreferences` + `migrateV1`, copied verbatim
// from `git show origin/main:apps/web-app/src/lib/dashboard-columns/persistence.ts`
// (only renamed with a `prod` prefix; CURRENT_SCHEMA_VERSION -> PROD_SCHEMA_VERSION).
// Do NOT edit it to follow current code: it exists to prove that a document
// written by THIS code is still readable by the code a rollback would restore.
const PROD_SCHEMA_VERSION = 1 as const;

function prodGetDefaultPreferences(): UserDashboardPreference {
  const defaultCols = getDefaultVisibleColumns().map((col) => col.key);
  return {
    schemaVersion: PROD_SCHEMA_VERSION,
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
 *    `PROD_SCHEMA_VERSION`
 *  - `droppedKeys`: any `ColumnKey` values from the stored document that are no
 *    longer present in the registry (E2E Scenario 4 graceful degradation)
 *  - `warnings`: human-readable strings for server-side logging (NOT for users)
 *
 * Never throws. All error/fallback paths return `prodGetDefaultPreferences()`.
 *
 * Determinism: same `raw` → byte-identical `MigrationResult`. Zero I/O.
 */
function prodMigratePreferences(raw: unknown): MigrationResult {
  // ── Null / undefined ─────────────────────────────────────────────────────
  if (raw === null || raw === undefined) {
    return {
      preferences: prodGetDefaultPreferences(),
      droppedKeys: [],
      warnings: ['No preference document found; using defaults.'],
    };
  }

  // ── Must be a plain object ───────────────────────────────────────────────
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      preferences: prodGetDefaultPreferences(),
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
      preferences: prodGetDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preference document missing or invalid schemaVersion (got: ${JSON.stringify(doc['schemaVersion'])}); using defaults.`,
      ],
    };
  }

  const storedVersion = doc['schemaVersion'] as number;

  // ── Future version: newer client wrote this document ─────────────────────
  if (storedVersion > PROD_SCHEMA_VERSION) {
    return {
      preferences: prodGetDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preferences from a newer client version (schemaVersion ${storedVersion}); resetting to defaults.`,
      ],
    };
  }

  // ── Past version: forward-migrate ────────────────────────────────────────
  if (storedVersion < PROD_SCHEMA_VERSION) {
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
      preferences: prodGetDefaultPreferences(),
      droppedKeys: [],
      warnings: [
        `Preferences at unsupported legacy schemaVersion ${storedVersion}; resetting to defaults.`,
      ],
    };
  }

  // ── Current version: validate and clean ──────────────────────────────────
  // storedVersion === PROD_SCHEMA_VERSION (=== 1)
  return prodMigrateV1(doc);
}

/**
 * Validate and clean a schemaVersion-1 document.
 *
 * Drops unknown `ColumnKey`s from `visibleColumns` and `columnOrder`.
 * Returns defaults for any missing or wrong-type required fields.
 *
 * Pure function; no I/O.
 */
function prodMigrateV1(doc: Record<string, unknown>): MigrationResult {
  const knownKeys = new Set<string>(listColumnKeys());
  const droppedKeys: ColumnKey[] = [];
  const warnings: string[] = [];

  // ── visibleColumns ────────────────────────────────────────────────────────
  let visibleColumns: ColumnKey[];
  if (!Array.isArray(doc['visibleColumns'])) {
    warnings.push(
      `visibleColumns is not an array (got: ${typeof doc['visibleColumns']}); using defaults.`,
    );
    visibleColumns = [...prodGetDefaultPreferences().visibleColumns] as ColumnKey[];
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
    schemaVersion: PROD_SCHEMA_VERSION,
    visibleColumns,
    columnOrder,
    filters,
    savedViews,
  };

  return { preferences, droppedKeys, warnings };
}


describe('Group H: a document written by this code, read by the production reader (rollback safety, #407)', () => {
  const cols = ['workflow_title', 'health_score', 'run_count'] as ColumnKey[];
  const view: SavedView = {
    id: 'sv-1',
    name: 'My view',
    visibleColumns: ['workflow_title'] as ColumnKey[],
    columnOrder: ['workflow_title'] as ColumnKey[],
    filters: [] as unknown as FilterSet,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const written = serializePreferencesForDb({
    ...getDefaultPreferences(),
    visibleColumns: cols,
    columnOrder: cols,
    savedViews: [view],
    defaultTimeRange: '7d',
  });

  it('H-1: the frozen production reader sees schemaVersion 1 and no warnings', () => {
    const prod = prodMigratePreferences(JSON.parse(written.payload));
    expect(written.schemaVersion).toBe(PROD_SCHEMA_VERSION);
    expect(prod.warnings).toEqual([]);
    expect(prod.preferences.schemaVersion).toBe(1);
  });

  it('H-2: production keeps every column and saved view; only the range is lost', () => {
    const prod = prodMigratePreferences(JSON.parse(written.payload));
    const now = migratePreferences(JSON.parse(written.payload));
    expect(prod.preferences.visibleColumns).toEqual(cols);
    expect(prod.preferences.columnOrder).toEqual(cols);
    expect(prod.preferences.savedViews).toEqual([view]);
    expect(prod.preferences.savedViews).toEqual(now.preferences.savedViews);
    expect((prod.preferences as unknown as Record<string, unknown>)['defaultTimeRange']).toBeUndefined();
    expect(now.preferences.defaultTimeRange).toBe('7d');
  });

  it('H-3: a schemaVersion 2 document would NOT have survived production (why the bump was reverted)', () => {
    const v2 = { ...JSON.parse(written.payload), schemaVersion: 2 };
    const prod = prodMigratePreferences(v2);
    expect(prod.preferences.savedViews).toEqual([]);
    expect(prod.warnings.join('\n')).toMatch(/newer client/);
  });
});
