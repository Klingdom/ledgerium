/**
 * Workflow Dashboard Column Registry — invariants + accessor coverage tests
 * (iter-056 / Path D D+1).
 *
 * Tests are organized into 5 groups:
 *  - Group A: Catalog completeness  (count, key uniqueness, group integrity)
 *  - Group B: Default-visibility integrity  (6 defaults match shipped UI)
 *  - Group C: Audit-honesty invariant (accessor non-null IFF available)
 *  - Group D: Accessor correctness (5+ representative columns)
 *  - Group E: Determinism + module-singleton + lookup-helper sanity
 *
 * MR-006 Change C ≥12 substantive `it()` blocks satisfied with margin (30).
 *
 * @see registry.ts · types.ts · accessors.ts
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_DASHBOARD_COLUMNS,
  AVAILABLE_ACCESSORS,
  getColumnByKey,
  listColumnKeys,
  getDefaultVisibleColumns,
  accessHealthScore,
  accessRunCount,
  accessOpportunityTag,
  accessSystems,
  accessLastRunAt,
  accessWorkflowTitle,
  accessCycleTimeMs,
  accessCaseVolume,
  accessSystemCountPerRun,
} from './index.js';
import type { ColumnAccessorContext, ColumnKey } from './types.js';
import type { WorkflowMetricsOutput } from '../workflow-metrics.js';

// ── Test fixture: a representative WorkflowMetricsOutput ──────────────────────

function makeMetricsV2(overrides: Partial<WorkflowMetricsOutput> = {}): WorkflowMetricsOutput {
  return {
    runs: 42,
    avgTimeMs: 180_000,
    variationScore: 0.45,
    variationLabel: 'medium',
    bottleneckLabel: 'Awaiting approval',
    healthScore: {
      overall: 78,
      speed: 22,
      consistency: 24,
      dataQuality: 16,
      standardization: 16,
      isGated: false,
    },
    opportunityTag: 'optimize',
    aiOpportunityScore: 65,
    confidence: 0.82,
    ...overrides,
  };
}

function makeContext(overrides: Partial<ColumnAccessorContext> = {}): ColumnAccessorContext {
  return {
    title: 'Approve Vendor Invoices',
    toolsUsed: ['Salesforce', 'NetSuite', 'DocuSign'],
    lastViewedAt: '2026-04-29T14:00:00.000Z',
    createdAt: '2026-03-01T09:00:00.000Z',
    metricsV2: makeMetricsV2(),
    ...overrides,
  };
}

// ── Group A: Catalog completeness ─────────────────────────────────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — catalog completeness (Group A)', () => {
  it('A1: catalog enumerates exactly 38 columns (6 display + 32 Tier A)', () => {
    expect(WORKFLOW_DASHBOARD_COLUMNS.length).toBe(38);
  });

  it('A2: every ColumnKey is unique across the catalog', () => {
    const keys = WORKFLOW_DASHBOARD_COLUMNS.map((col) => col.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('A3: every column has a non-empty label ≤ 24 chars (UI compactness)', () => {
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      expect(col.label.length, `column ${col.key} label "${col.label}" length`).toBeGreaterThan(0);
      expect(col.label.length, `column ${col.key} label "${col.label}" length`).toBeLessThanOrEqual(24);
    }
  });

  it('A4: every column has a description ≤ 80 chars (picker tooltip budget)', () => {
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      expect(col.description.length, `column ${col.key} description length`).toBeGreaterThan(0);
      expect(col.description.length, `column ${col.key} description length`).toBeLessThanOrEqual(80);
    }
  });

  it('A5: every column belongs to a known ColumnGroup taxonomy', () => {
    const validGroups = new Set([
      'display',
      'flow',
      'step',
      'variation',
      'quality',
      'behavior',
      'bottleneck',
    ]);
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      expect(validGroups.has(col.defaultGroup), `column ${col.key} group ${col.defaultGroup}`).toBe(true);
    }
  });

  it('A6: every column has a known dataType', () => {
    const validTypes = new Set([
      'number',
      'string',
      'date',
      'enum',
      'percentage',
      'duration',
      'boolean',
    ]);
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      expect(validTypes.has(col.dataType), `column ${col.key} dataType ${col.dataType}`).toBe(true);
    }
  });
});

// ── Group B: Default-visibility integrity ─────────────────────────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — default-visibility integrity (Group B)', () => {
  it('B1: exactly 6 columns are defaultVisible (matches shipped WorkflowRow surface)', () => {
    const defaults = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    expect(defaults.length).toBe(6);
  });

  it('B2: every defaultVisible column is in the display group', () => {
    const defaults = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    for (const col of defaults) {
      expect(col.defaultGroup, `default-visible column ${col.key} should be group=display`).toBe(
        'display',
      );
    }
  });

  it('B3: defaultVisible set matches the 6 currently-rendered fields by key', () => {
    const expected = new Set<ColumnKey>([
      'workflow_title',
      'systems',
      'opportunity_tag',
      'health_score',
      'last_run_at',
      'run_count',
    ]);
    const actual = new Set(
      WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.key),
    );
    expect(actual).toEqual(expected);
  });

  it('B4: no defaultVisible column carries a planTierGate (free-tier base experience)', () => {
    const defaults = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    for (const col of defaults) {
      expect(col.planTierGate, `default column ${col.key} must not be plan-gated`).toBeNull();
    }
  });

  it('B5: getDefaultVisibleColumns() returns the same 6 entries as the .filter view', () => {
    const helper = getDefaultVisibleColumns();
    const direct = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    expect(helper.length).toBe(direct.length);
    // Loop bound `i < helper.length` plus the length-equality assertion above guarantee
    // in-range access; non-null assertions here satisfy `noUncheckedIndexedAccess`.
    for (let i = 0; i < helper.length; i += 1) {
      expect(helper[i]!.key).toBe(direct[i]!.key);
    }
  });
});

// ── Group C: Audit-honesty invariant ──────────────────────────────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — audit-honesty invariant (Group C)', () => {
  it('C1: accessor is non-null IFF availability === "available"', () => {
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      if (col.availability === 'available') {
        expect(col.accessor, `available column ${col.key} must have accessor`).not.toBeNull();
      } else {
        expect(
          col.accessor,
          `pending column ${col.key} (${col.availability}) must have accessor=null`,
        ).toBeNull();
      }
    }
  });

  it('C2: every available column key appears in AVAILABLE_ACCESSORS lookup', () => {
    const availableKeys = WORKFLOW_DASHBOARD_COLUMNS.filter(
      (col) => col.availability === 'available',
    ).map((col) => col.key);
    for (const key of availableKeys) {
      expect(
        AVAILABLE_ACCESSORS[key],
        `availability=available column ${key} missing from AVAILABLE_ACCESSORS`,
      ).toBeDefined();
    }
  });

  it('C3: at least 1 column claims pending-path-c-r1 (engine + persistence dependency)', () => {
    const pendingR1 = WORKFLOW_DASHBOARD_COLUMNS.filter(
      (col) => col.availability === 'pending-path-c-r1',
    );
    expect(pendingR1.length).toBeGreaterThanOrEqual(1);
  });

  it('C4: at least 1 column claims pending-path-c-r3 (per-run snapshot dependency)', () => {
    const pendingR3 = WORKFLOW_DASHBOARD_COLUMNS.filter(
      (col) => col.availability === 'pending-path-c-r3',
    );
    expect(pendingR3.length).toBeGreaterThanOrEqual(1);
  });

  it('C5: every column availability is in the closed set', () => {
    const validAvailability = new Set(['available', 'pending-path-c-r1', 'pending-path-c-r3']);
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      expect(
        validAvailability.has(col.availability),
        `column ${col.key} availability ${col.availability}`,
      ).toBe(true);
    }
  });
});

// ── Group D: Accessor correctness (representative columns) ────────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — accessor correctness (Group D)', () => {
  it('D1: accessHealthScore returns metricsV2.healthScore.overall', () => {
    const ctx = makeContext();
    expect(accessHealthScore(ctx)).toBe(78);
  });

  it('D2: accessRunCount returns metricsV2.runs and propagates null on unprocessed workflows', () => {
    expect(accessRunCount(makeContext())).toBe(42);
    const unprocessed = makeContext({ metricsV2: makeMetricsV2({ runs: null }) });
    expect(accessRunCount(unprocessed)).toBeNull();
  });

  it('D3: accessOpportunityTag returns the opportunityTag literal verbatim', () => {
    expect(accessOpportunityTag(makeContext())).toBe('optimize');
    const automate = makeContext({ metricsV2: makeMetricsV2({ opportunityTag: 'automate' }) });
    expect(accessOpportunityTag(automate)).toBe('automate');
  });

  it('D4: accessSystems returns toolsUsed array reference', () => {
    const ctx = makeContext();
    expect(accessSystems(ctx)).toEqual(['Salesforce', 'NetSuite', 'DocuSign']);
  });

  it('D5: accessLastRunAt returns lastViewedAt and null when never viewed', () => {
    expect(accessLastRunAt(makeContext())).toBe('2026-04-29T14:00:00.000Z');
    expect(accessLastRunAt(makeContext({ lastViewedAt: null }))).toBeNull();
  });

  it('D6: accessWorkflowTitle returns the title string and null on blank title', () => {
    expect(accessWorkflowTitle(makeContext())).toBe('Approve Vendor Invoices');
    expect(accessWorkflowTitle(makeContext({ title: '' }))).toBeNull();
  });

  it('D7: accessCycleTimeMs aliases avgTimeMs (Layer 1 cycle-time identity)', () => {
    expect(accessCycleTimeMs(makeContext())).toBe(180_000);
    expect(accessCycleTimeMs(makeContext({ metricsV2: makeMetricsV2({ avgTimeMs: null }) }))).toBeNull();
  });

  it('D8: accessCaseVolume aliases metricsV2.runs (canonical metric_key parity)', () => {
    expect(accessCaseVolume(makeContext())).toBe(42);
  });

  it('D9: accessSystemCountPerRun returns toolsUsed.length (workflow-grain proxy)', () => {
    expect(accessSystemCountPerRun(makeContext())).toBe(3);
    expect(accessSystemCountPerRun(makeContext({ toolsUsed: [] }))).toBe(0);
  });
});

// ── Group F: D+6 default-pack composition lock ────────────────────────────────
//
// These tests pin the canonical 6-column default-pack mandated by MR-014 §7.1
// ASK-1: "ship initial default pack at 6 columns matching today's hard-coded
// rendering; expand to 7+ columns post-Path-C-R+1 when more `available`
// accessors land."
//
// Lock-intent: any change to `defaultVisible` flags in registry.ts that
// widens, narrows, or re-attributes the default-pack will break one or more
// assertions below, forcing an intentional review rather than silent drift.
//
// Canonical 6-column set (ASK-1 / MR-014 §7.1):
//   workflow_title · systems · opportunity_tag · health_score · last_run_at · run_count
//
// Note: workflow_title and health_score are LOCKED-VISIBLE (iter-031; WDC §11)
// and always appear at the head/tail of the rendered row regardless of their
// position in `getDefaultVisibleColumns()`.  The remaining 4 columns render as
// the "dynamic" middle cells between the two locked columns.

describe('WORKFLOW_DASHBOARD_COLUMNS — D+6 default-pack composition lock (Group F)', () => {
  it('F1: getDefaultVisibleColumns() returns exactly 6 entries (ASK-1 count)', () => {
    const defaults = getDefaultVisibleColumns();
    expect(defaults.length).toBe(6);
  });

  it('F2: the 6 default-visible keys are exactly the ASK-1 canonical set (set-equality)', () => {
    const expected = new Set<ColumnKey>([
      'workflow_title',
      'health_score',
      'opportunity_tag',
      'run_count',
      'last_run_at',
      'systems',
    ]);
    const actual = new Set<ColumnKey>(getDefaultVisibleColumns().map((col) => col.key));
    expect(actual).toEqual(expected);
  });

  it('F3: all 6 default-visible columns have availability === "available" (audit-honesty — pending columns must never be in the default-pack)', () => {
    for (const col of getDefaultVisibleColumns()) {
      expect(
        col.availability,
        `default-pack column ${col.key} must be available, not ${col.availability}`,
      ).toBe('available');
    }
  });

  it('F4: all 6 default-visible columns have a non-null accessor (accessor IFF available invariant holds for defaults)', () => {
    for (const col of getDefaultVisibleColumns()) {
      expect(col.accessor, `default-pack column ${col.key} must have a non-null accessor`).not.toBeNull();
    }
  });

  it('F5: getDefaultVisibleColumns() returns entries in registry insertion order (deterministic ordering)', () => {
    // getDefaultVisibleColumns() is a filter over the frozen catalog — it
    // preserves registry insertion order by definition.  The 6 default-visible
    // entries appear in the catalog in this order:
    //   [0] workflow_title · [1] systems · [2] opportunity_tag
    //   [3] health_score   · [4] last_run_at · [5] run_count
    // Locking insertion order protects against registry reordering silently
    // changing which column appears in which table position for default users.
    const expectedOrder: ColumnKey[] = [
      'workflow_title',
      'systems',
      'opportunity_tag',
      'health_score',
      'last_run_at',
      'run_count',
    ];
    const actualOrder = getDefaultVisibleColumns().map((col) => col.key);
    expect(actualOrder).toEqual(expectedOrder);
  });

  it('F6: no column outside the canonical 6 has defaultVisible === true (drift-protection against silent widening)', () => {
    const canonicalDefaultKeys = new Set<ColumnKey>([
      'workflow_title',
      'health_score',
      'opportunity_tag',
      'run_count',
      'last_run_at',
      'systems',
    ]);
    const nonCanonicalDefaults = WORKFLOW_DASHBOARD_COLUMNS.filter(
      (col) => col.defaultVisible && !canonicalDefaultKeys.has(col.key),
    );
    expect(
      nonCanonicalDefaults.map((col) => col.key),
      'Non-canonical column(s) unexpectedly marked defaultVisible — update canonical set or remove defaultVisible flag',
    ).toHaveLength(0);
  });
});

// ── Group E: Determinism + module-singleton + lookup helpers ──────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — determinism + helpers (Group E)', () => {
  it('E1: catalog is frozen (Object.freeze) — runtime mutation rejected', () => {
    expect(Object.isFrozen(WORKFLOW_DASHBOARD_COLUMNS)).toBe(true);
  });

  it('E2: getColumnByKey resolves a known key and returns undefined for unknown', () => {
    const found = getColumnByKey('health_score');
    expect(found?.key).toBe('health_score');
    expect(found?.label).toBe('Health Score');
    // @ts-expect-error — test runtime guard with intentionally invalid key
    expect(getColumnByKey('not_a_real_column_key')).toBeUndefined();
  });

  it('E3: listColumnKeys() returns all 38 keys', () => {
    const keys = listColumnKeys();
    expect(keys.length).toBe(38);
    expect(keys).toContain('workflow_title');
    expect(keys).toContain('cycle_time_ms');
    expect(keys).toContain('max_wait_step_id');
  });

  it('E4: accessor calls are deterministic — same context → identical output across repeats', () => {
    const ctx = makeContext();
    const r1 = accessHealthScore(ctx);
    const r2 = accessHealthScore(ctx);
    const r3 = accessHealthScore(ctx);
    expect(r1).toBe(78);
    expect(r2).toBe(78);
    expect(r3).toBe(78);
  });

  it('E5: AVAILABLE_ACCESSORS is frozen (Object.freeze)', () => {
    expect(Object.isFrozen(AVAILABLE_ACCESSORS)).toBe(true);
  });
});
