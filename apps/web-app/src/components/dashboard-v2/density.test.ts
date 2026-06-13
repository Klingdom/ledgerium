/**
 * density — pure-helper unit tests (Batch C item 16).
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. The SSR-safe
 * `useDensity` hook itself requires a React renderer and is exercised in the
 * flash-safety / E2E gate; here we lock the pure, deterministic helpers that
 * map densities to padding classes and validate stored values.
 *
 * @batch C (2026-06-12)
 */

import { describe, it, expect } from 'vitest';
import {
  densityRowPaddingClass,
  parseDensity,
  DENSITY_OPTIONS,
  DEFAULT_DENSITY,
  DENSITY_STORAGE_KEY,
  type RowDensity,
} from './density.js';

describe('densityRowPaddingClass', () => {
  it('compact → py-ds-2 (8px)', () => {
    expect(densityRowPaddingClass('compact')).toBe('py-ds-2');
  });

  it('regular → py-ds-3 (12px) — matches the pre-Batch-C row padding', () => {
    expect(densityRowPaddingClass('regular')).toBe('py-ds-3');
  });

  it('relaxed → py-ds-4 (16px)', () => {
    expect(densityRowPaddingClass('relaxed')).toBe('py-ds-4');
  });

  it('the default density maps to the pre-existing py-ds-3 padding (no visual change at default)', () => {
    expect(densityRowPaddingClass(DEFAULT_DENSITY)).toBe('py-ds-3');
  });

  it('is deterministic for every known density', () => {
    for (const opt of DENSITY_OPTIONS) {
      expect(densityRowPaddingClass(opt.value)).toBe(densityRowPaddingClass(opt.value));
    }
  });
});

describe('parseDensity', () => {
  it('accepts the three valid densities', () => {
    expect(parseDensity('compact')).toBe('compact');
    expect(parseDensity('regular')).toBe('regular');
    expect(parseDensity('relaxed')).toBe('relaxed');
  });

  it('rejects unknown / corrupted values → null (defensive against bad localStorage)', () => {
    expect(parseDensity('cozy')).toBeNull();
    expect(parseDensity('')).toBeNull();
    expect(parseDensity('REGULAR')).toBeNull();
    expect(parseDensity(null)).toBeNull();
    expect(parseDensity(undefined)).toBeNull();
  });
});

describe('density constants', () => {
  it('DEFAULT_DENSITY is "regular" (stable first-paint value for SSR safety)', () => {
    expect(DEFAULT_DENSITY).toBe('regular');
  });

  it('DENSITY_OPTIONS lists exactly the three densities in compact→relaxed order', () => {
    expect(DENSITY_OPTIONS.map((o) => o.value)).toEqual<RowDensity[]>([
      'compact',
      'regular',
      'relaxed',
    ]);
  });

  it('every option has a non-empty human label', () => {
    for (const opt of DENSITY_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it('storage key is namespaced under ledgerium.dashboard', () => {
    expect(DENSITY_STORAGE_KEY).toBe('ledgerium.dashboard.rowDensity');
  });
});
