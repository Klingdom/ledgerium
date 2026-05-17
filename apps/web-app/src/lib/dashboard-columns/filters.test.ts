/**
 * Dashboard-columns filter registry — invariants + predicate tests
 * (iter-058 / Path D D+2).
 *
 * Groups:
 *  A — OperatorsByDataType invariants (3 cases)
 *  B — getFilterableColumns (3 cases)
 *  C — listOperatorsForColumn (3 cases)
 *  D — evaluateFilter (8 cases)
 *  E — evaluateFilterSet (3 cases)
 *  F — audit-honesty invariants (2 cases)
 *
 * MR-006 Change C ≥12 substantive `it()` blocks satisfied with margin (22).
 *
 * @see filters.ts · registry.ts · accessors.ts · types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  OperatorsByDataType,
  getFilterableColumns,
  listOperatorsForColumn,
  evaluateFilter,
  evaluateFilterSet,
} from './filters.js';
import type {
  ColumnFilter,
  FilterSet,
} from './filters.js';
import type { ColumnAccessorContext, ColumnDataType } from './types.js';
import type { WorkflowMetricsOutput } from '../workflow-metrics.js';

// ── Test helper: deterministic baseline context ───────────────────────────────

/**
 * Returns a deterministic `ColumnAccessorContext` suitable for filter evaluation
 * tests. Uses real `WorkflowMetricsOutput` shape — no stubs.
 *
 * `overrides` are shallow-merged at the top level; callers may override
 * individual fields (including `metricsV2`) as needed.
 */
function makeContext(overrides: Partial<ColumnAccessorContext> = {}): ColumnAccessorContext {
  const metricsV2: WorkflowMetricsOutput = {
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
  };

  return {
    title: 'Approve Vendor Invoices',
    toolsUsed: ['Salesforce', 'NetSuite', 'DocuSign'],
    lastViewedAt: '2026-04-29T14:00:00.000Z',
    createdAt: '2026-03-01T09:00:00.000Z',
    metricsV2,
    // iter-065 / WDC2-P01 — deterministic frozen wall-clock + lifetime range
    // for filter-predicate tests. Filter predicates do not consume these
    // fields (filter evaluation operates on accessor outputs, which today are
    // all lifetime), so any deterministic value preserves test semantics.
    referenceNowMs: 1_700_000_000_000,
    activeTimeRange: 'all',
    ...overrides,
  };
}

// ── Group A: OperatorsByDataType invariants ───────────────────────────────────

describe('OperatorsByDataType — invariants (Group A)', () => {
  it('A1: every ColumnDataType has at least one operator', () => {
    const dataTypes: ColumnDataType[] = [
      'number', 'string', 'date', 'enum', 'percentage', 'duration', 'boolean',
    ];
    for (const dt of dataTypes) {
      expect(
        OperatorsByDataType[dt].length,
        `ColumnDataType '${dt}' must have ≥1 operator`,
      ).toBeGreaterThan(0);
    }
  });

  it('A2: closed-union exhaustiveness — OperatorsByDataType satisfies Record<ColumnDataType, ...>', () => {
    // Compile-time: the `satisfies` clause in filters.ts asserts structural
    // completeness. Runtime: verify every key the test knows about is present.
    const expectedKeys: ColumnDataType[] = [
      'number', 'string', 'date', 'enum', 'percentage', 'duration', 'boolean',
    ];
    for (const key of expectedKeys) {
      expect(Object.prototype.hasOwnProperty.call(OperatorsByDataType, key)).toBe(true);
    }
    // No extra keys
    expect(Object.keys(OperatorsByDataType).sort()).toEqual(expectedKeys.slice().sort());
  });

  it('A3: OperatorsByDataType is frozen (immutability)', () => {
    expect(Object.isFrozen(OperatorsByDataType)).toBe(true);
  });
});

// ── Group B: getFilterableColumns ─────────────────────────────────────────────

describe('getFilterableColumns (Group B)', () => {
  it('B1: returns exactly 10 entries today (available + filterable)', () => {
    // Per ASK-3 verdict (MR-014): filter coverage = 10 available entries.
    expect(getFilterableColumns().length).toBe(10);
  });

  it('B2: every returned entry has availability === "available" AND filterable === true', () => {
    const cols = getFilterableColumns();
    for (const col of cols) {
      expect(col.availability, `${col.key} must be available`).toBe('available');
      expect(col.filterable, `${col.key} must be filterable`).toBe(true);
    }
  });

  it('B3: result is byte-stable across two calls (determinism)', () => {
    const first = getFilterableColumns();
    const second = getFilterableColumns();
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      // `first[i]!` / `second[i]!` — loop bound `i < first.length` and
      // `.length === second.length` (asserted above) guarantee in-range access;
      // non-null assertions are strict-mode safety-nets for noUncheckedIndexedAccess.
      expect(first[i]!.key).toBe(second[i]!.key);
    }
  });
});

// ── Group C: listOperatorsForColumn ───────────────────────────────────────────

describe('listOperatorsForColumn (Group C)', () => {
  it('C1: returns numeric operators for health_score (dataType: number)', () => {
    const ops = listOperatorsForColumn('health_score');
    // health_score is available + number → should return numeric operator set
    expect(ops).toContain('gt');
    expect(ops).toContain('gte');
    expect(ops).toContain('lt');
    expect(ops).toContain('lte');
    expect(ops).toContain('eq');
    expect(ops).toContain('between');
  });

  it('C2: returns enum operators for opportunity_tag (dataType: enum)', () => {
    const ops = listOperatorsForColumn('opportunity_tag');
    expect(ops).toContain('in');
    expect(ops).toContain('notIn');
    // Enum columns must NOT include numeric operators
    expect(ops).not.toContain('gt');
  });

  it('C3: returns [] for a pending-path-c-r1 column (audit-honesty)', () => {
    // throughput_time_ms is pending-path-c-r1 per registry
    const ops = listOperatorsForColumn('throughput_time_ms');
    expect(ops).toHaveLength(0);
  });
});

// ── Group D: evaluateFilter ───────────────────────────────────────────────────

describe('evaluateFilter (Group D)', () => {
  it('D1: numeric gt passes when columnValue > filterValue (health_score)', () => {
    const ctx = makeContext(); // health_score.overall = 78
    const filter: ColumnFilter = {
      columnKey: 'health_score',
      value: { kind: 'scalar', operator: 'gt', value: 70 },
    };
    expect(evaluateFilter(filter, ctx)).toBe(true);
  });

  it('D2: numeric gt fails when columnValue === filterValue (boundary: strict inequality)', () => {
    const ctx = makeContext(); // health_score.overall = 78
    const filter: ColumnFilter = {
      columnKey: 'health_score',
      value: { kind: 'scalar', operator: 'gt', value: 78 },
    };
    expect(evaluateFilter(filter, ctx)).toBe(false);
  });

  it('D3: numeric between inclusive — columnValue at boundary returns true', () => {
    const ctx = makeContext(); // health_score.overall = 78
    // min === max === actual value → inclusive both ends
    const filter: ColumnFilter = {
      columnKey: 'health_score',
      value: { kind: 'range', operator: 'between', min: 78, max: 78 },
    };
    expect(evaluateFilter(filter, ctx)).toBe(true);
  });

  it('D4: numeric between exclusive — columnValue outside range returns false', () => {
    const ctx = makeContext(); // health_score.overall = 78
    const filter: ColumnFilter = {
      columnKey: 'health_score',
      value: { kind: 'range', operator: 'between', min: 80, max: 100 },
    };
    expect(evaluateFilter(filter, ctx)).toBe(false);
  });

  it('D5: enum in — opportunityTag matches values list returns true', () => {
    const ctx = makeContext(); // opportunityTag = 'optimize'
    const filter: ColumnFilter = {
      columnKey: 'opportunity_tag',
      value: { kind: 'multi', operator: 'in', values: ['optimize', 'automate'] },
    };
    expect(evaluateFilter(filter, ctx)).toBe(true);
  });

  it('D6: text contains — case-insensitive substring match on workflow_title', () => {
    const ctx = makeContext(); // title = 'Approve Vendor Invoices'
    const filter: ColumnFilter = {
      columnKey: 'workflow_title',
      value: { kind: 'text', operator: 'contains', value: 'vendor' }, // lowercase needle
    };
    expect(evaluateFilter(filter, ctx)).toBe(true);
  });

  it('D7: date before — ISO comparison on last_run_at', () => {
    const ctx = makeContext(); // lastViewedAt = '2026-04-29T14:00:00.000Z'
    // A filter asking for rows before 2026-05-01 should include our row
    const filterPass: ColumnFilter = {
      columnKey: 'last_run_at',
      value: { kind: 'scalar', operator: 'before', value: '2026-05-01T00:00:00.000Z' },
    };
    expect(evaluateFilter(filterPass, ctx)).toBe(true);

    // A filter asking for rows before 2026-04-01 should exclude our row
    const filterFail: ColumnFilter = {
      columnKey: 'last_run_at',
      value: { kind: 'scalar', operator: 'before', value: '2026-04-01T00:00:00.000Z' },
    };
    expect(evaluateFilter(filterFail, ctx)).toBe(false);
  });

  it('D8: flag isFalse — returns false for a boolean pending column (audit-honesty path)', () => {
    // is_bottleneck_step is pending-path-c-r3 — evaluateFilter must return false
    // regardless of the flag direction, because the column is not available.
    const filter: ColumnFilter = {
      columnKey: 'is_bottleneck_step',
      value: { kind: 'flag', operator: 'isFalse' },
    };
    expect(evaluateFilter(filter, makeContext())).toBe(false);
  });
});

// ── Group E: evaluateFilterSet ────────────────────────────────────────────────

describe('evaluateFilterSet (Group E)', () => {
  it('E1: empty filter set returns true (no filter = include all)', () => {
    const emptySet: FilterSet = [];
    expect(evaluateFilterSet(emptySet, makeContext())).toBe(true);
  });

  it('E2: AND short-circuits on first false (all must pass)', () => {
    const ctx = makeContext(); // health_score = 78, opportunity_tag = 'optimize'
    // First filter passes (health_score > 70 ✓), second filter fails (not 'automate')
    const filters: FilterSet = [
      {
        columnKey: 'health_score',
        value: { kind: 'scalar', operator: 'gt', value: 70 },
      },
      {
        columnKey: 'opportunity_tag',
        value: { kind: 'multi', operator: 'in', values: ['automate'] },
      },
    ];
    expect(evaluateFilterSet(filters, ctx)).toBe(false);
  });

  it('E3: all-passing filter set returns true and is deterministic across repeat calls', () => {
    const ctx = makeContext(); // health_score = 78, opportunity_tag = 'optimize'
    const filters: FilterSet = [
      {
        columnKey: 'health_score',
        value: { kind: 'scalar', operator: 'gte', value: 78 },
      },
      {
        columnKey: 'opportunity_tag',
        value: { kind: 'multi', operator: 'in', values: ['optimize', 'monitor'] },
      },
    ];
    const result1 = evaluateFilterSet(filters, ctx);
    const result2 = evaluateFilterSet(filters, ctx);
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});

// ── Group F: audit-honesty invariants ─────────────────────────────────────────

describe('audit-honesty — pending columns (Group F)', () => {
  it('F1: evaluateFilter returns false for a pending-path-c-r1 column regardless of value', () => {
    // completion_rate_pct is pending-path-c-r1
    const filter: ColumnFilter = {
      columnKey: 'completion_rate_pct',
      value: { kind: 'scalar', operator: 'gt', value: 0 },
    };
    expect(evaluateFilter(filter, makeContext())).toBe(false);
  });

  it('F2: evaluateFilter returns false when accessor returns null (unprocessed workflow)', () => {
    // run_count accessor returns metricsV2.runs; set runs = null to simulate unprocessed
    const ctx = makeContext({
      metricsV2: {
        runs: null,
        avgTimeMs: null,
        variationScore: 0,
        variationLabel: 'low',
        bottleneckLabel: null,
        healthScore: {
          overall: 0,
          speed: 0,
          consistency: 0,
          dataQuality: 0,
          standardization: 0,
          isGated: false,
        },
        opportunityTag: 'healthy',
        aiOpportunityScore: 0,
        confidence: null,
      },
    });
    const filter: ColumnFilter = {
      columnKey: 'run_count',
      value: { kind: 'scalar', operator: 'gt', value: 0 },
    };
    // accessor returns null for runs=null → evaluateFilter must return false
    expect(evaluateFilter(filter, ctx)).toBe(false);
  });
});
