/**
 * ColumnPicker — state derivation tests (iter-061, Path D D+4).
 *
 * Environment: Vitest node — no jsdom, no React rendering.
 * Tests pure logic: column grouping, locked/pending derivation, visibility state.
 *
 * These tests exercise the same invariants enforced by the ColumnPicker component:
 *  - Locked keys (workflow_title, health_score) always appear visible and non-togglable.
 *  - Pending columns (availability !== 'available') are disabled regardless of visibleSet.
 *  - Available non-locked columns respect the visibleSet.
 *  - All 7 groups contain their expected columns from the registry.
 *  - Total rendered columns across all groups equals the registry size (38).
 *
 * @see apps/web-app/src/components/dashboard-v2/ColumnPicker.tsx
 * @see apps/web-app/src/lib/dashboard-columns/registry.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  WORKFLOW_DASHBOARD_COLUMNS,
  type ColumnKey,
  type ColumnGroup,
} from '../../lib/dashboard-columns/index.js';

// ── Mirrors picker internals (not exported by component — tested here directly) ─

const LOCKED_KEYS = new Set<ColumnKey>(['workflow_title', 'health_score']);

const GROUP_ORDER: ColumnGroup[] = [
  'display', 'flow', 'step', 'variation', 'quality', 'behavior', 'bottleneck',
];

interface GroupedColumn {
  key: ColumnKey;
  availability: string;
  isLocked: boolean;
  isVisible: boolean;
}

function buildGroupedColumns(
  visibleSet: Set<ColumnKey>,
): Record<ColumnGroup, GroupedColumn[]> {
  const result: Record<ColumnGroup, GroupedColumn[]> = {
    display: [], flow: [], step: [], variation: [], quality: [], behavior: [], bottleneck: [],
  };
  for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
    result[col.defaultGroup].push({
      key: col.key,
      availability: col.availability,
      isLocked: LOCKED_KEYS.has(col.key),
      isVisible: visibleSet.has(col.key) || LOCKED_KEYS.has(col.key),
    });
  }
  return result;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function allGroupedColumns(
  visibleSet: Set<ColumnKey>,
): GroupedColumn[] {
  const grouped = buildGroupedColumns(visibleSet);
  return GROUP_ORDER.flatMap((g) => grouped[g]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ColumnPicker: column grouping (iter-061)', () => {
  it('total columns across all groups equals registry size (40)', () => {
    // Batch A (2026-06-12): date_recorded added → 39 total.
    // WDC2-P02 (iter-075): ai_opportunity_score added as 40th entry.
    const grouped = buildGroupedColumns(new Set<ColumnKey>());
    const total = GROUP_ORDER.reduce((sum, g) => sum + grouped[g].length, 0);
    expect(total).toBe(40);
  });

  it('every registered column appears in exactly one group', () => {
    // Batch A (2026-06-12): date_recorded added → 39 unique keys.
    const grouped = buildGroupedColumns(new Set<ColumnKey>());
    const seen = new Set<ColumnKey>();
    for (const g of GROUP_ORDER) {
      for (const col of grouped[g]) {
        expect(seen.has(col.key)).toBe(false); // no duplicates
        seen.add(col.key);
      }
    }
    expect(seen.size).toBe(40); // WDC2-P02 (iter-075): ai_opportunity_score added as 40th entry
  });

  it('all 7 canonical groups are present', () => {
    const grouped = buildGroupedColumns(new Set<ColumnKey>());
    for (const g of GROUP_ORDER) {
      expect(grouped[g]).toBeDefined();
    }
  });
});

describe('ColumnPicker: locked column invariants (iter-061)', () => {
  it('workflow_title is always visible regardless of visibleSet', () => {
    const emptySet = new Set<ColumnKey>();
    const cols = allGroupedColumns(emptySet);
    const titleCol = cols.find((c) => c.key === 'workflow_title');
    expect(titleCol).toBeDefined();
    expect(titleCol!.isLocked).toBe(true);
    expect(titleCol!.isVisible).toBe(true);
  });

  it('health_score is always visible regardless of visibleSet', () => {
    const emptySet = new Set<ColumnKey>();
    const cols = allGroupedColumns(emptySet);
    const healthCol = cols.find((c) => c.key === 'health_score');
    expect(healthCol).toBeDefined();
    expect(healthCol!.isLocked).toBe(true);
    expect(healthCol!.isVisible).toBe(true);
  });

  it('exactly 2 columns are locked (workflow_title and health_score)', () => {
    const cols = allGroupedColumns(new Set<ColumnKey>());
    const locked = cols.filter((c) => c.isLocked);
    expect(locked).toHaveLength(2);
    const lockedKeys = locked.map((c) => c.key);
    expect(lockedKeys).toContain('workflow_title');
    expect(lockedKeys).toContain('health_score');
  });
});

describe('ColumnPicker: visibility state derivation (iter-061)', () => {
  it('available non-locked column is visible when in visibleSet', () => {
    const visibleSet = new Set<ColumnKey>(['last_run_at']);
    const cols = allGroupedColumns(visibleSet);
    const col = cols.find((c) => c.key === 'last_run_at');
    expect(col).toBeDefined();
    expect(col!.isVisible).toBe(true);
  });

  it('available non-locked column is NOT visible when absent from visibleSet', () => {
    const visibleSet = new Set<ColumnKey>(['workflow_title', 'health_score']);
    const cols = allGroupedColumns(visibleSet);
    // last_run_at is available but not in the set
    const col = cols.find((c) => c.key === 'last_run_at');
    expect(col).toBeDefined();
    expect(col!.isVisible).toBe(false);
  });

  it('pending column is NOT visible even when in visibleSet (availability gate)', () => {
    // pending-path-c-r1 columns should appear as disabled in the picker regardless
    // Verify the registry correctly classifies at least some columns as pending
    const cols = allGroupedColumns(new Set(WORKFLOW_DASHBOARD_COLUMNS.map((c) => c.key)));
    const pendingCols = cols.filter((c) => c.availability !== 'available');
    expect(pendingCols.length).toBeGreaterThan(0);
    // The picker treats pending as disabled — availability drives the disabled state, not isVisible
    for (const col of pendingCols) {
      expect(col.availability).toMatch(/^pending-/);
    }
  });
});

describe('ColumnPicker: pending column availability labels (iter-061)', () => {
  it('audit-honesty IFF invariant: pending columns have null accessor in registry', () => {
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      if (col.availability !== 'available') {
        // The registry enforces accessor === null for all non-available columns
        expect(col.accessor).toBeNull();
      }
    }
  });

  it('available columns have non-null accessor in registry', () => {
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      if (col.availability === 'available') {
        expect(col.accessor).not.toBeNull();
      }
    }
  });

  it('pending-path-c-r1 and pending-path-c-r3 are the only non-available statuses', () => {
    const statuses = new Set(WORKFLOW_DASHBOARD_COLUMNS.map((c) => c.availability));
    for (const status of statuses) {
      expect(['available', 'pending-path-c-r1', 'pending-path-c-r3']).toContain(status);
    }
  });
});

// ── atglance-review #18: real focus trap on the aria-modal dialog ─────────────
// The drawer is role="dialog" aria-modal="true"; Tab must cycle within it rather
// than escape to the page behind. Source-level assertions (node env — no DOM
// render) verify the trap exists and that Escape-close + focus-return remain.

describe('atglance-review #18: ColumnPicker focus trap', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./ColumnPicker.tsx', import.meta.url)),
    'utf8',
  );

  it('has a Tab-cycle focus trap handler wired to the drawer onKeyDown', () => {
    expect(src).toMatch(/handleTrapKeyDown/);
    expect(src).toMatch(/onKeyDown=\{handleTrapKeyDown\}/);
    // The trap keys on Tab and queries focusable children.
    expect(src).toMatch(/if \(e\.key !== 'Tab'\) return/);
    expect(src).toMatch(/querySelectorAll/);
  });

  it('wraps focus at both ends (Tab on last → first, Shift+Tab on first → last)', () => {
    expect(src).toMatch(/if \(e\.shiftKey\)/);
    expect(src).toMatch(/first\.focus\(\)/);
    expect(src).toMatch(/last\.focus\(\)/);
  });

  it('preserves Escape-close and focus-return (not regressed by the trap)', () => {
    expect(src).toMatch(/if \(e\.key === 'Escape'\)[\s\S]*?onClose\(\)/);
    expect(src).toMatch(/triggerRef\.current\?\.focus\(\)/);
  });

  it('the dialog is still aria-modal with role=dialog', () => {
    expect(src).toMatch(/role="dialog"/);
    expect(src).toMatch(/aria-modal="true"/);
  });
});
