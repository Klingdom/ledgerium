/**
 * lenses — pure lens-config unit tests (DASHBOARD_PERSONAS_REVIEW_001 P0, v1).
 *
 * Locks the v1 lens model: the framework wires exactly `library` + `lss`, the
 * `library` lens is the byte-identical-to-today default (null sentinels), and
 * the `lss` column pack uses ONLY registry-`available` columns (the scope /
 * honesty guarantee — no pending-path-c columns, no registry churn).
 *
 * Environment: Vitest (node) — no jsdom. The lens config module is pure.
 */

import { describe, it, expect } from 'vitest';
import {
  LENS_CONFIGS,
  LENS_ORDER,
  LSS_COLUMN_PACK,
  DEFAULT_LENS,
  parseLens,
  getLensConfig,
  isColumnAvailable,
  resolveAvailableColumns,
  type Lens,
} from './lenses.js';
import {
  WORKFLOW_DASHBOARD_COLUMNS,
  type ColumnKey,
} from '@/lib/dashboard-columns/index.js';

const AVAILABLE_KEYS = new Set<ColumnKey>(
  WORKFLOW_DASHBOARD_COLUMNS.filter((c) => c.availability === 'available').map(
    (c) => c.key,
  ),
);

describe('lens framework', () => {
  it('wires exactly two lenses in v1 (library + lss)', () => {
    expect(LENS_ORDER).toEqual<Lens[]>(['library', 'lss']);
    expect(Object.keys(LENS_CONFIGS).sort()).toEqual(['library', 'lss']);
  });

  it('DEFAULT_LENS is "library" (stable first-paint value for SSR safety)', () => {
    expect(DEFAULT_LENS).toBe('library');
    expect(LENS_ORDER[0]).toBe('library');
  });

  it('every lens config id matches its catalog key and has a non-empty label', () => {
    for (const [key, config] of Object.entries(LENS_CONFIGS)) {
      expect(config.id).toBe(key);
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.description.length).toBeGreaterThan(0);
    }
  });

  it('LENS_CONFIGS is frozen (deterministic module-singleton)', () => {
    expect(Object.isFrozen(LENS_CONFIGS)).toBe(true);
    expect(Object.isFrozen(LENS_CONFIGS.library)).toBe(true);
    expect(Object.isFrozen(LENS_CONFIGS.lss)).toBe(true);
  });
});

describe('library lens = today’s behavior (no regression)', () => {
  it('library uses null sentinels for columnPack + defaultSort (shell keeps its own defaults)', () => {
    const lib = LENS_CONFIGS.library;
    expect(lib.columnPack).toBeNull();
    expect(lib.defaultSort).toBeNull();
    expect(lib.panel).toBeNull();
  });
});

describe('lss lens config', () => {
  it('LSS pack uses ONLY registry-available columns (scope/honesty guarantee)', () => {
    expect(LSS_COLUMN_PACK.length).toBeGreaterThan(0);
    for (const key of LSS_COLUMN_PACK) {
      expect(AVAILABLE_KEYS.has(key), `${key} must be available`).toBe(true);
    }
  });

  it('LSS pack does NOT include variant_count (pending-path-c-r1 — not flipped this pass)', () => {
    expect(LSS_COLUMN_PACK).not.toContain('variant_count');
  });

  it('LSS pack includes the cycle-time + run-count Measure columns', () => {
    expect(LSS_COLUMN_PACK).toContain('cycle_time_mean_ms');
    expect(LSS_COLUMN_PACK).toContain('run_count');
    // locked columns are present (always rendered by the row)
    expect(LSS_COLUMN_PACK).toContain('workflow_title');
    expect(LSS_COLUMN_PACK).toContain('health_score');
  });

  it('LSS pack has no duplicate keys', () => {
    expect(new Set(LSS_COLUMN_PACK).size).toBe(LSS_COLUMN_PACK.length);
  });

  it('LSS default sort is cycle_time descending (longest-first Measure entry point)', () => {
    const lss = LENS_CONFIGS.lss;
    expect(lss.defaultSort).toEqual({ field: 'cycle_time', dir: 'desc' });
  });

  it('LSS panel is the pareto above-list panel', () => {
    expect(LENS_CONFIGS.lss.panel).toBe('pareto');
  });
});

describe('resolveAvailableColumns gate', () => {
  it('drops pending-path-c columns, preserves order + dedupes', () => {
    const proposed: ColumnKey[] = [
      'workflow_title',
      'variant_count', // pending → dropped
      'run_count',
      'run_count', // dup → dropped
      'cycle_time_p95_ms', // pending → dropped
      'cycle_time_mean_ms',
    ];
    expect(resolveAvailableColumns(proposed)).toEqual<ColumnKey[]>([
      'workflow_title',
      'run_count',
      'cycle_time_mean_ms',
    ]);
  });

  it('isColumnAvailable agrees with the registry availability field', () => {
    expect(isColumnAvailable('cycle_time_mean_ms')).toBe(true);
    expect(isColumnAvailable('run_count')).toBe(true);
    expect(isColumnAvailable('variant_count')).toBe(false);
    expect(isColumnAvailable('cycle_time_p95_ms')).toBe(false);
  });
});

describe('parseLens / getLensConfig', () => {
  it('parseLens accepts the two wired lenses', () => {
    expect(parseLens('library')).toBe('library');
    expect(parseLens('lss')).toBe('lss');
  });

  it('parseLens rejects unknown / corrupted values → null', () => {
    expect(parseLens('understand')).toBeNull();
    expect(parseLens('document')).toBeNull();
    expect(parseLens('')).toBeNull();
    expect(parseLens('LSS')).toBeNull();
    expect(parseLens(null)).toBeNull();
    expect(parseLens(undefined)).toBeNull();
  });

  it('getLensConfig returns the matching config; falls back to library for unknown', () => {
    expect(getLensConfig('lss').id).toBe('lss');
    // forced unknown id → library fallback (defensive)
    expect(getLensConfig('nope' as Lens).id).toBe('library');
  });
});
