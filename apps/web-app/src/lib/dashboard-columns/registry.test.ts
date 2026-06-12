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
  accessDateRecorded,
} from './index.js';
import type { ColumnAccessorContext, ColumnKey, TimeRange } from './types.js';
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
    // Batch A (2026-06-12): processDefinitionUpdatedAt — honest "Last Run" proxy
    // backed by ProcessDefinition.updatedAt (not lastViewedAt).  See accessLastRunAt.
    processDefinitionUpdatedAt: '2026-04-28T10:00:00.000Z',
    metricsV2: makeMetricsV2(),
    // iter-065 / WDC2-P01 — deterministic frozen wall-clock + lifetime range
    // for accessor tests. The existing iter-056 accessors are lifetime
    // accessors and ignore these fields by design; Group G asserts that.
    referenceNowMs: 1_700_000_000_000,
    activeTimeRange: 'all',
    ...overrides,
  };
}

// ── Group A: Catalog completeness ─────────────────────────────────────────────

describe('WORKFLOW_DASHBOARD_COLUMNS — catalog completeness (Group A)', () => {
  it('A1: catalog enumerates exactly 39 columns (7 display + 32 Tier A)', () => {
    // Batch A (2026-06-12): date_recorded added as 7th display column.
    expect(WORKFLOW_DASHBOARD_COLUMNS.length).toBe(39);
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
// Updated at iter-067 (WDC2-P03): cycle_time_mean_ms promoted to default-pack,
// expanding the default-visible set from 6 → 7.  B2 updated to reflect that
// the default-pack now spans two groups (display + flow); the audit-honesty IFF
// invariant (availability='available' ⇔ non-null accessor) in Group C / Group F
// is the correct gate — group membership is descriptive, not restrictive.
//
// Batch A (2026-06-12): date_recorded promoted to default-pack (8 columns).

describe('WORKFLOW_DASHBOARD_COLUMNS — default-visibility integrity (Group B)', () => {
  it('B1: exactly 8 columns are defaultVisible (Batch A: 8-column default-pack)', () => {
    // Batch A (2026-06-12): date_recorded added as 8th default-pack column.
    const defaults = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    expect(defaults.length).toBe(8);
  });

  it('B2: every defaultVisible column has availability="available" and non-null accessor', () => {
    // WDC2-P03 (iter-067): cycle_time_mean_ms is defaultGroup='flow', not 'display',
    // so the previous "all defaults are display group" assertion is intentionally
    // relaxed to the audit-honesty IFF invariant: available ⇔ non-null accessor.
    const defaults = WORKFLOW_DASHBOARD_COLUMNS.filter((col) => col.defaultVisible);
    for (const col of defaults) {
      expect(
        col.availability,
        `default-visible column ${col.key} must be available (audit-honesty IFF)`,
      ).toBe('available');
      expect(
        col.accessor,
        `default-visible column ${col.key} must have non-null accessor`,
      ).not.toBeNull();
    }
  });

  it('B3: defaultVisible set matches the Batch A canonical 8-column set by key', () => {
    // Batch A (2026-06-12): date_recorded promoted to default-pack.
    const expected = new Set<ColumnKey>([
      'workflow_title',
      'systems',
      'opportunity_tag',
      'health_score',
      'last_run_at',
      'run_count',
      'cycle_time_mean_ms', // WDC2-P03 (iter-067): 7th default-pack column
      'date_recorded',      // Batch A (2026-06-12): 8th default-pack column
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

  it('B5: getDefaultVisibleColumns() returns the same 8 entries as the .filter view', () => {
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

  it('D5: accessLastRunAt returns processDefinitionUpdatedAt (honest Last Run proxy — Batch A rewire)', () => {
    // Batch A (2026-06-12): rewired from lastViewedAt → processDefinitionUpdatedAt
    // so the "Last Run" column is backed by ProcessDefinition.updatedAt (when
    // the process last gained a run) rather than a view timestamp.
    expect(accessLastRunAt(makeContext())).toBe('2026-04-28T10:00:00.000Z');
    expect(accessLastRunAt(makeContext({ processDefinitionUpdatedAt: null }))).toBeNull();
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

  it('D10: accessDateRecorded returns createdAt ISO string (Batch A / date_recorded column)', () => {
    expect(accessDateRecorded(makeContext())).toBe('2026-03-01T09:00:00.000Z');
    // Different createdAt values → different return values
    const laterCtx = makeContext({ createdAt: '2026-06-12T08:00:00.000Z' });
    expect(accessDateRecorded(laterCtx)).toBe('2026-06-12T08:00:00.000Z');
  });
});

// ── Group F: default-pack composition lock (updated Batch A 2026-06-12) ────────
//
// Originally pinned the canonical 6-column default-pack mandated by MR-014 §7.1
// ASK-1.  Updated at iter-067 to reflect the WDC2-P03 7th-column promotion:
// cycle_time_mean_ms.defaultVisible flipped false → true.
//
// Updated at Batch A (2026-06-12) to reflect the 8th-column promotion:
// date_recorded.defaultVisible flipped to true (dashboard-redesign P0 item 4).
//
// Lock-intent: any change to `defaultVisible` flags in registry.ts that
// widens, narrows, or re-attributes the default-pack will break one or more
// assertions below, forcing an intentional review rather than silent drift.
//
// Canonical 8-column set (Batch A / 2026-06-12):
//   workflow_title · systems · opportunity_tag · health_score
//   · cycle_time_mean_ms · last_run_at · run_count · date_recorded
//
// Note: workflow_title and health_score are LOCKED-VISIBLE (iter-031; WDC §11)
// and always appear at the head/tail of the rendered row regardless of their
// position in `getDefaultVisibleColumns()`.  The remaining 6 columns render as
// the "dynamic" middle cells between the two locked columns.

describe('WORKFLOW_DASHBOARD_COLUMNS — D+6 default-pack composition lock (Group F)', () => {
  it('F1: getDefaultVisibleColumns() returns exactly 8 entries (Batch A: 8-column default-pack)', () => {
    // Batch A (2026-06-12): date_recorded promoted, expanding to 8 default columns.
    const defaults = getDefaultVisibleColumns();
    expect(defaults.length).toBe(8);
  });

  it('F2: the 8 default-visible keys are exactly the Batch A canonical set (set-equality)', () => {
    // Batch A (2026-06-12): date_recorded added as 8th default-pack column.
    const expected = new Set<ColumnKey>([
      'workflow_title',
      'health_score',
      'opportunity_tag',
      'run_count',
      'last_run_at',
      'systems',
      'cycle_time_mean_ms',
      'date_recorded',
    ]);
    const actual = new Set<ColumnKey>(getDefaultVisibleColumns().map((col) => col.key));
    expect(actual).toEqual(expected);
  });

  it('F3: all 7 default-visible columns have availability === "available" (audit-honesty — pending columns must never be in the default-pack)', () => {
    for (const col of getDefaultVisibleColumns()) {
      expect(
        col.availability,
        `default-pack column ${col.key} must be available, not ${col.availability}`,
      ).toBe('available');
    }
  });

  it('F4: all 7 default-visible columns have a non-null accessor (accessor IFF available invariant holds for defaults)', () => {
    for (const col of getDefaultVisibleColumns()) {
      expect(col.accessor, `default-pack column ${col.key} must have a non-null accessor`).not.toBeNull();
    }
  });

  it('F5: getDefaultVisibleColumns() returns entries in registry insertion order (deterministic ordering)', () => {
    // getDefaultVisibleColumns() is a filter over the frozen catalog — it
    // preserves registry insertion order by definition.  The 8 default-visible
    // entries appear in the catalog in this order:
    //   [0] workflow_title  · [1] systems         · [2] opportunity_tag
    //   [3] health_score    · [4] last_run_at      · [5] run_count
    //   [6] date_recorded   (Batch A 2026-06-12 — display group, after run_count)
    //   [7] cycle_time_mean_ms (iter-067 WDC2-P03 — sits in Tier A section)
    // Locking insertion order protects against registry reordering silently
    // changing which column appears in which table position for default users.
    const expectedOrder: ColumnKey[] = [
      'workflow_title',
      'systems',
      'opportunity_tag',
      'health_score',
      'last_run_at',
      'run_count',
      'date_recorded',
      'cycle_time_mean_ms',
    ];
    const actualOrder = getDefaultVisibleColumns().map((col) => col.key);
    expect(actualOrder).toEqual(expectedOrder);
  });

  it('F6: no column outside the canonical 8 has defaultVisible === true (drift-protection against silent widening)', () => {
    // Batch A (2026-06-12): date_recorded added as 8th canonical default-pack column.
    const canonicalDefaultKeys = new Set<ColumnKey>([
      'workflow_title',
      'health_score',
      'opportunity_tag',
      'run_count',
      'last_run_at',
      'systems',
      'cycle_time_mean_ms', // WDC2-P03 (iter-067): 7th default-pack column
      'date_recorded',      // Batch A (2026-06-12): 8th default-pack column
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

  it('E3: listColumnKeys() returns all 39 keys', () => {
    // Batch A (2026-06-12): date_recorded added → 39 total.
    const keys = listColumnKeys();
    expect(keys.length).toBe(39);
    expect(keys).toContain('workflow_title');
    expect(keys).toContain('date_recorded');
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

// ── Group G: WDC2-P01 ColumnAccessorContext extension (iter-065) ──────────────
//
// Pins the iter-065 contract extension that added `referenceNowMs` and
// `activeTimeRange` to `ColumnAccessorContext`. The 10 existing iter-056
// accessors are LIFETIME accessors — they MUST return byte-identical results
// regardless of the two new time-related fields. Wave A statistical accessors
// landing in row #101 (WDC2-P02) will consume the fields; this group's intent
// is to lock the lifetime-preservation invariant for the iter-056 set so that
// future Wave A landings cannot silently flip an iter-056 accessor's semantics.
//
// Audit-honesty (Ledgerium IFF invariant): re-asserted here at the registry
// level to cover the renaming risk surface introduced by the contract change.

describe('ColumnAccessorContext — WDC2-P01 contract extension (Group G, iter-065)', () => {
  it('G1: ColumnAccessorContext accepts referenceNowMs (number) + activeTimeRange (TimeRange) — compile-time shape', () => {
    // The TS compiler enforces shape at construction; this runtime test
    // verifies the fields are reachable + carry the expected primitive types.
    const ctx = makeContext({ referenceNowMs: 1_800_000_000_000, activeTimeRange: '30d' });
    expect(typeof ctx.referenceNowMs).toBe('number');
    expect(ctx.referenceNowMs).toBe(1_800_000_000_000);
    expect(ctx.activeTimeRange).toBe('30d');
    // TimeRange closed-union — must be one of the 4 literals.
    const validRanges: TimeRange[] = ['7d', '30d', '90d', 'all'];
    expect(validRanges).toContain(ctx.activeTimeRange);
  });

  it('G2: every iter-056 accessor is deterministic — byte-identical output across repeat calls with identical context', () => {
    const ctx = makeContext();
    for (const [key, accessor] of Object.entries(AVAILABLE_ACCESSORS)) {
      const r1 = accessor(ctx);
      const r2 = accessor(ctx);
      const r3 = accessor(ctx);
      expect(r1, `accessor '${key}' call 1 vs 2 must match`).toEqual(r2);
      expect(r2, `accessor '${key}' call 2 vs 3 must match`).toEqual(r3);
    }
  });

  it('G3: lifetime semantics — every iter-056 accessor ignores referenceNowMs (two wall-clock values, identical other context → identical output)', () => {
    const baseCtx = makeContext();
    const ctxAt1700 = { ...baseCtx, referenceNowMs: 1_700_000_000_000 };
    const ctxAt1800 = { ...baseCtx, referenceNowMs: 1_800_000_000_000 };
    for (const [key, accessor] of Object.entries(AVAILABLE_ACCESSORS)) {
      const at1700 = accessor(ctxAt1700);
      const at1800 = accessor(ctxAt1800);
      expect(
        at1700,
        `accessor '${key}' must be lifetime — referenceNowMs change leaked into output (got ${JSON.stringify(at1700)} vs ${JSON.stringify(at1800)})`,
      ).toEqual(at1800);
    }
  });

  it('G4: lifetime semantics — every iter-056 accessor ignores activeTimeRange (4 windows, identical other context → identical output)', () => {
    const ranges: TimeRange[] = ['7d', '30d', '90d', 'all'];
    const baseCtx = makeContext();
    for (const [key, accessor] of Object.entries(AVAILABLE_ACCESSORS)) {
      const referenceOutput = accessor({ ...baseCtx, activeTimeRange: 'all' });
      for (const range of ranges) {
        const output = accessor({ ...baseCtx, activeTimeRange: range });
        expect(
          output,
          `accessor '${key}' must be lifetime — activeTimeRange '${range}' leaked into output (got ${JSON.stringify(output)} vs reference ${JSON.stringify(referenceOutput)})`,
        ).toEqual(referenceOutput);
      }
    }
  });

  it('G5: audit-honesty IFF invariant preserved across registry under the extended context contract — accessor non-null IFF availability === "available"', () => {
    // Re-walking the registry under the post-iter-065 context shape catches
    // any availability flip or accessor null↔non-null transition that might
    // have slipped in alongside the contract change. Mirrors Group C1 but
    // explicitly anchored to the WDC2-P01 contract change.
    for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
      if (col.availability === 'available') {
        expect(
          col.accessor,
          `WDC2-P01: available column '${col.key}' must retain a non-null accessor`,
        ).not.toBeNull();
      } else {
        expect(
          col.accessor,
          `WDC2-P01: pending column '${col.key}' (${col.availability}) must retain accessor=null`,
        ).toBeNull();
      }
    }
  });

  it('G6: ColumnAccessorContext keyof exhaustiveness — exactly 8 keys (title, toolsUsed, lastViewedAt, createdAt, processDefinitionUpdatedAt, metricsV2, referenceNowMs, activeTimeRange)', () => {
    // Compile-time exhaustiveness via the type assignment below: if a field
    // is added to / removed from ColumnAccessorContext without updating this
    // tuple, TS will fail at compile time. Runtime check enumerates the keys
    // on a representative instance.
    //
    // Batch A (2026-06-12): processDefinitionUpdatedAt added (honest "Last Run"
    // proxy backed by ProcessDefinition.updatedAt).
    const expectedKeys: Array<keyof ColumnAccessorContext> = [
      'title',
      'toolsUsed',
      'lastViewedAt',
      'createdAt',
      'processDefinitionUpdatedAt',
      'metricsV2',
      'referenceNowMs',
      'activeTimeRange',
    ];
    // Compile-time exhaustiveness guard: if `keyof ColumnAccessorContext`
    // gains/loses a member without updating `expectedKeys`, this type-only
    // assignment fails to compile.
    type _ExpectedExhaustive = Exclude<keyof ColumnAccessorContext, typeof expectedKeys[number]> extends never
      ? true
      : never;
    const _exhaustiveCheck: _ExpectedExhaustive = true;
    void _exhaustiveCheck;

    const ctx = makeContext();
    const actualKeys = Object.keys(ctx).sort();
    expect(actualKeys).toEqual(expectedKeys.slice().sort());
    expect(actualKeys.length).toBe(8);
  });
});
