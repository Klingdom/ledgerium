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
  getDefaultPreferences,
  migratePreferences,
  serializePreferencesForDb,
  deserializePreferencesFromDb,
} from './persistence.js';
import { listColumnKeys } from './index.js';

// ── Group A: getDefaultPreferences ────────────────────────────────────────────

describe('Group A: getDefaultPreferences()', () => {
  it('A-1: schemaVersion is CURRENT_SCHEMA_VERSION (1)', () => {
    const prefs = getDefaultPreferences();
    expect(prefs.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
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
  it('B-1: valid v1 document with known columns passes through unchanged', () => {
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
  it('D-1: schemaVersion > CURRENT_SCHEMA_VERSION → defaults + "newer client" warning', () => {
    const result = migratePreferences({ schemaVersion: CURRENT_SCHEMA_VERSION + 99 });
    expect(result.preferences).toEqual(getDefaultPreferences());
    expect(result.droppedKeys).toEqual([]);
    const warningText = result.warnings.join('\n');
    // Should mention "newer" or "resetting"
    expect(warningText.toLowerCase()).toMatch(/newer|resetting/);
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
