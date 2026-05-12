/**
 * Workflow Dashboard Filter Registry — Path D D+2 (iter-058).
 *
 * Pure deterministic module defining the filter contract that D+3 persistence,
 * D+4 picker UI, and D+5 preset chips consume. Composes with the D+1 column
 * registry without modifying it.
 *
 * Design decisions:
 *  - `FilterOperator` is a closed union; each `ColumnDataType` maps to a
 *    specific operator subset via `OperatorsByDataType`. The picker (D+4) reads
 *    this map to render the right input control without per-column switch logic.
 *  - `FilterValue` is a discriminated union keyed by `kind`; the `operator`
 *    field is present in every variant for round-trip serialization fidelity
 *    (D+3 persistence stores/restores `FilterSet` as JSON).
 *  - `evaluateFilter` / `evaluateFilterSet` are pure predicates — no I/O, no
 *    clocks, no React. All comparisons are documented for determinism.
 *  - Audit-honesty IFF invariant (MDR-P01/P02 precedent extended to filters):
 *    a filter against a non-`available` column MUST return `false`. Future R+1/
 *    R+3 iterations flip availability in the registry, not in this module.
 *
 * Operator naming convention: machine-keys only (`'gt'` not `'Greater than'`).
 * Human-readable display labels belong to the D+4 picker UI, not here.
 *
 * Determinism contract: same `ColumnFilter` + same `ColumnAccessorContext`
 * → byte-identical boolean result. No `Date.now()`, no `Math.random()`, no I/O.
 *
 * @see types.ts      — ColumnKey, ColumnDataType, ColumnAvailability
 * @see registry.ts   — frozen catalog with filterable + availability fields
 * @see accessors.ts  — AVAILABLE_ACCESSORS lookup table
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md (WDC-P02)
 * @see docs/features/dashboard-v3-metrics-engine/SNAPSHOT_TABLE_DECISION.md
 */

import { WORKFLOW_DASHBOARD_COLUMNS } from './registry.js';
import { AVAILABLE_ACCESSORS } from './accessors.js';
import type {
  ColumnKey,
  ColumnDataType,
  ColumnAccessorContext,
  WorkflowDashboardColumn,
} from './types.js';

// ── FilterOperator (closed union) ─────────────────────────────────────────────

/**
 * All filter operators across all column data types.
 *
 * Operator semantics:
 *  - `eq` / `neq`      — strict equality / inequality (applies to: number, string,
 *                         percentage, duration, enum)
 *  - `gt` / `gte`      — strictly greater / greater-or-equal (numeric: number,
 *                         percentage, duration)
 *  - `lt` / `lte`      — strictly less / less-or-equal (numeric same)
 *  - `between`         — inclusive range; shape differs by data type (see
 *                         FilterValue `range` / `dateRange` kinds)
 *  - `in` / `notIn`    — multi-select membership (applies to: enum)
 *  - `contains`        — case-insensitive substring match (applies to: string).
 *                        Comparison via `toLocaleLowerCase()` on both sides.
 *  - `startsWith`      — case-insensitive prefix match (applies to: string).
 *                        Comparison via `toLocaleLowerCase()` on both sides.
 *  - `before` / `after` — ISO-8601 date comparison. Parsed via `Date.parse()`;
 *                          returns `false` if either value is not a valid ISO
 *                          date (NaN guard). Comparison is millisecond-epoch.
 *  - `isTrue` / `isFalse` — boolean flag test (applies to: boolean)
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'before'
  | 'after'
  | 'isTrue'
  | 'isFalse';

// ── OperatorsByDataType (single source of truth for picker input controls) ────

/**
 * The valid operators for each `ColumnDataType`.
 *
 * Frozen module-singleton — `Object.isFrozen(OperatorsByDataType)` is `true`.
 * The picker (D+4) reads this to render the operator dropdown without
 * hard-coding per-column logic.
 *
 * Design: `boolean` columns do NOT expose `eq`/`neq` because the semantics are
 * captured more expressively by `isTrue`/`isFalse`; the `evaluateFilter`
 * implementation handles both flag variants.
 */
export const OperatorsByDataType: Record<ColumnDataType, readonly FilterOperator[]> =
  Object.freeze({
    number:     Object.freeze(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'] as const),
    percentage: Object.freeze(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'] as const),
    duration:   Object.freeze(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'] as const),
    string:     Object.freeze(['eq', 'neq', 'contains', 'startsWith'] as const),
    enum:       Object.freeze(['in', 'notIn'] as const),
    date:       Object.freeze(['before', 'after', 'between'] as const),
    boolean:    Object.freeze(['isTrue', 'isFalse'] as const),
  } satisfies Record<ColumnDataType, readonly FilterOperator[]>);

// ── FilterValue (discriminated union) ─────────────────────────────────────────

/**
 * Scalar comparison — single value against a numeric/string column.
 *
 * For date columns with `'before'` / `'after'`, `value` carries an ISO-8601
 * string (e.g. `"2026-01-01T00:00:00.000Z"`). Parsed via `Date.parse()` in
 * `evaluateFilter`; NaN guard returns `false` on invalid input.
 *
 * For numeric/duration/percentage columns, `value` is a `number`.
 *
 * For string columns with `'eq'` / `'neq'`, `value` is a string literal.
 */
export type ScalarFilterValue = {
  readonly kind: 'scalar';
  readonly operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'before' | 'after';
  readonly value: string | number;
};

/**
 * Numeric range — both endpoints inclusive.
 *
 * Used with numeric/duration/percentage `'between'` operator.
 * `evaluateFilter` checks `min <= columnValue <= max`.
 */
export type RangeFilterValue = {
  readonly kind: 'range';
  readonly operator: 'between';
  readonly min: number;
  readonly max: number;
};

/**
 * Date range — both endpoints inclusive (millisecond-epoch comparison).
 *
 * `startIso` / `endIso` are ISO-8601 strings. `Date.parse()` + NaN guard.
 * `evaluateFilter` checks `startMs <= columnEpochMs <= endMs`.
 */
export type DateRangeFilterValue = {
  readonly kind: 'dateRange';
  readonly operator: 'between';
  readonly startIso: string;
  readonly endIso: string;
};

/**
 * Multi-select set membership — for `'enum'` columns.
 *
 * `in`: column value must be one of `values`.
 * `notIn`: column value must NOT be any of `values`.
 * Empty `values` array → `in` always false; `notIn` always true.
 */
export type MultiFilterValue = {
  readonly kind: 'multi';
  readonly operator: 'in' | 'notIn';
  readonly values: readonly string[];
};

/**
 * Case-insensitive text search — for `'string'` columns.
 *
 * `contains`:   `columnValue.toLocaleLowerCase()` includes `value.toLocaleLowerCase()`
 * `startsWith`: `columnValue.toLocaleLowerCase()` starts with `value.toLocaleLowerCase()`
 */
export type TextFilterValue = {
  readonly kind: 'text';
  readonly operator: 'contains' | 'startsWith';
  readonly value: string;
};

/**
 * Boolean flag — for `'boolean'` columns.
 *
 * `isTrue`:  column value must be truthy
 * `isFalse`: column value must be falsy
 */
export type FlagFilterValue = {
  readonly kind: 'flag';
  readonly operator: 'isTrue' | 'isFalse';
};

/**
 * Discriminated union of all filter value shapes.
 * Serializes cleanly to JSON (D+3 persistence uses JSON round-trip).
 */
export type FilterValue =
  | ScalarFilterValue
  | RangeFilterValue
  | DateRangeFilterValue
  | MultiFilterValue
  | TextFilterValue
  | FlagFilterValue;

// ── ColumnFilter / FilterSet ──────────────────────────────────────────────────

/**
 * A single column-filter pairing: which column, and what filter to apply.
 *
 * The `columnKey` references an entry in the column registry. `evaluateFilter`
 * resolves the accessor and applies `value` to the derived column value.
 */
export interface ColumnFilter {
  readonly columnKey: ColumnKey;
  readonly value: FilterValue;
}

/**
 * An ordered collection of filters applied with AND semantics.
 * `evaluateFilterSet` returns `true` iff every filter in the set passes.
 * An empty `FilterSet` (length 0) passes unconditionally — no filter = include.
 */
export type FilterSet = readonly ColumnFilter[];

// ── evaluateFilter ─────────────────────────────────────────────────────────────

/**
 * Apply a single `ColumnFilter` to one row's accessor context.
 *
 * Return semantics:
 *  - `false` if `filter.columnKey` refers to a column whose `availability` is
 *    NOT `'available'` — audit-honesty: a pending column has no accessor, so
 *    its filter cannot be evaluated and conservatively fails.
 *  - `false` if the column's accessor returns `null` for this specific row
 *    (value genuinely unavailable, e.g. unprocessed workflow).
 *  - `false` if the accessor value does not match the expected JS type for the
 *    operator (defensive: e.g. `'gt'` against a string column returns `false`).
 *  - Otherwise the operator result (see `FilterOperator` docstring for semantics
 *    of each operator including case-insensitivity, NaN guards, and epoch math).
 *
 * Determinism: same inputs → byte-identical boolean. No clocks, no I/O.
 */
export function evaluateFilter(
  filter: ColumnFilter,
  ctx: ColumnAccessorContext,
): boolean {
  // ── Audit-honesty: bail if column is not available ────────────────────────
  const col = WORKFLOW_DASHBOARD_COLUMNS.find((c) => c.key === filter.columnKey);
  if (!col || col.availability !== 'available') {
    return false;
  }

  // ── Resolve accessor and derive value ─────────────────────────────────────
  const accessor = AVAILABLE_ACCESSORS[filter.columnKey];
  if (!accessor) {
    // Should never happen: available column must have an accessor in the map.
    return false;
  }
  const raw = accessor(ctx);
  if (raw === null || raw === undefined) {
    return false;
  }

  const fv = filter.value;

  // ── Dispatch on FilterValue kind ──────────────────────────────────────────
  switch (fv.kind) {
    case 'scalar':
      return evaluateScalar(fv, raw, col.dataType);

    case 'range': {
      if (typeof raw !== 'number') return false;
      // Inclusive: min <= value <= max
      return raw >= fv.min && raw <= fv.max;
    }

    case 'dateRange': {
      if (typeof raw !== 'string') return false;
      const colMs = Date.parse(raw);
      const startMs = Date.parse(fv.startIso);
      const endMs = Date.parse(fv.endIso);
      if (isNaN(colMs) || isNaN(startMs) || isNaN(endMs)) return false;
      // Inclusive: startMs <= colMs <= endMs
      return colMs >= startMs && colMs <= endMs;
    }

    case 'multi': {
      if (typeof raw !== 'string') return false;
      const inSet = (fv.values as readonly string[]).includes(raw);
      return fv.operator === 'in' ? inSet : !inSet;
    }

    case 'text': {
      if (typeof raw !== 'string') return false;
      const haystack = raw.toLocaleLowerCase();
      const needle = fv.value.toLocaleLowerCase();
      if (fv.operator === 'contains') {
        return haystack.includes(needle);
      }
      // startsWith
      return haystack.startsWith(needle);
    }

    case 'flag': {
      return fv.operator === 'isTrue' ? Boolean(raw) : !Boolean(raw);
    }

    default: {
      // TypeScript exhaustiveness — should be unreachable
      const _exhaustive: never = fv;
      return false;
    }
  }
}

/**
 * Evaluate a `ScalarFilterValue` against a raw column value.
 *
 * `'before'` / `'after'` operators: `value` is treated as an ISO-8601 string;
 * both the column value and the filter value are parsed with `Date.parse()`.
 * If either parses to NaN the function returns `false` (defensive).
 *
 * Numeric operators (`'gt'`, `'gte'`, `'lt'`, `'lte'`, `'eq'`, `'neq'`):
 * `typeof raw` must be `'number'`; the `value` is cast to a number.
 *
 * String `'eq'` / `'neq'`: exact match (case-sensitive), for use with
 * non-text-search string columns (e.g. exact workflow title equality).
 */
function evaluateScalar(
  fv: ScalarFilterValue,
  raw: unknown,
  dataType: ColumnDataType,
): boolean {
  if (fv.operator === 'before' || fv.operator === 'after') {
    // Date comparison — both values must be valid ISO strings
    if (typeof raw !== 'string') return false;
    const colMs = Date.parse(raw);
    const filterMs = typeof fv.value === 'string'
      ? Date.parse(fv.value)
      : (fv.value as number);
    if (isNaN(colMs) || isNaN(filterMs)) return false;
    return fv.operator === 'before' ? colMs < filterMs : colMs > filterMs;
  }

  if (fv.operator === 'eq' || fv.operator === 'neq') {
    if (dataType === 'string' && typeof raw === 'string') {
      const match = raw === String(fv.value);
      return fv.operator === 'eq' ? match : !match;
    }
    if (typeof raw === 'number') {
      const match = raw === Number(fv.value);
      return fv.operator === 'eq' ? match : !match;
    }
    return false;
  }

  // Remaining numeric operators: gt, gte, lt, lte
  if (typeof raw !== 'number') return false;
  const filterNum = Number(fv.value);
  if (isNaN(filterNum)) return false;

  switch (fv.operator) {
    case 'gt':  return raw > filterNum;
    case 'gte': return raw >= filterNum;
    case 'lt':  return raw < filterNum;
    case 'lte': return raw <= filterNum;
    default: {
      const _exhaustive: never = fv.operator;
      return false;
    }
  }
}

// ── evaluateFilterSet ─────────────────────────────────────────────────────────

/**
 * Apply a `FilterSet` (AND-semantics) to one row's accessor context.
 *
 * Returns `true` iff every filter in `filters` passes for this row.
 * An empty filter set returns `true` unconditionally (no filter = include all).
 *
 * Short-circuits on the first `false` result for performance.
 *
 * Determinism: same filter set + same context → byte-identical boolean.
 */
export function evaluateFilterSet(
  filters: FilterSet,
  ctx: ColumnAccessorContext,
): boolean {
  for (let i = 0; i < filters.length; i++) {
    // `filters[i]!` — loop bound `i < filters.length` guarantees in-range access;
    // non-null assertion is a TypeScript strict-mode safety-net for
    // `noUncheckedIndexedAccess` widening `T[number]` → `T | undefined`.
    if (!evaluateFilter(filters[i]!, ctx)) {
      return false;
    }
  }
  return true;
}

// ── Filter-eligibility helpers ────────────────────────────────────────────────

/**
 * Return the columns that are both `availability === 'available'` and
 * `filterable === true`.
 *
 * Per ASK-3 verdict (MR-014): initial filter coverage is limited to the 10
 * `available` entries today. Filter coverage expands as `pending-path-c-r1` /
 * `pending-path-c-r3` entries flip to `available` at R+1/R+3.
 *
 * Determinism: returns a slice of the frozen registry — same result across calls.
 */
export function getFilterableColumns(): readonly WorkflowDashboardColumn[] {
  return WORKFLOW_DASHBOARD_COLUMNS.filter(
    (col) => col.availability === 'available' && col.filterable,
  );
}

/**
 * Return the valid `FilterOperator` values for a given column.
 *
 * Returns `[]` if:
 *  - the column is not found in the registry (runtime safety for dynamic keys)
 *  - the column's `availability` is not `'available'` (audit-honesty: a filter
 *    on a pending column is not valid — the picker should disable the column)
 *
 * Otherwise returns `OperatorsByDataType[col.dataType]`.
 *
 * Determinism: lookup over frozen structures — byte-identical across calls.
 */
export function listOperatorsForColumn(key: ColumnKey): readonly FilterOperator[] {
  const col = WORKFLOW_DASHBOARD_COLUMNS.find((c) => c.key === key);
  if (!col || col.availability !== 'available') {
    return [] as const;
  }
  return OperatorsByDataType[col.dataType];
}
