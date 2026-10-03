/**
 * captureFilterSet — #368 (SAVED_VIEWS_DESIGN §5).
 *
 * Pure converter from the dashboard's live filter state to the `FilterSet` a
 * saved view stores. It captures:
 *   - the active preset's / applied view's FilterSet, verbatim;
 *   - ONLY the ad-hoc constraints that a FilterSet expresses EXACTLY:
 *       opportunity            → opportunity_tag in [t]
 *       healthStatus healthy   → health_score gte 70
 *       healthStatus needs_review → health_score lt 40
 *       insight automate       → opportunity_tag in [automate]
 *       insight monitor        → opportunity_tag in [monitor]
 *       insight healthScore_gte_70 → health_score gte 70
 *     Each mapping has a parity test against `applyFilters`.
 *
 * Everything else cannot be expressed (systems: array accessor always false;
 * needsAttention / high_variation / stale: run-gated or clock-relative; other
 * row-narrowing insight chips; search) and sets `isPartial` so the UI can say
 * so. No silent partial capture.
 *
 * Deterministic: no clocks, no I/O.
 */

import type { ColumnFilter, FilterSet } from '@/lib/dashboard-columns/filters.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import { isRowNarrowingInsightKey } from './activeFilters.js';

export interface CaptureFilterInput {
  /** Active preset's or applied view's FilterSet, or null. */
  presetFilters: FilterSet | null;
  filters: FilterState;
  insightFilterKey: string | null;
  searchQuery: string;
}

export interface CaptureFilterResult {
  readonly filters: FilterSet;
  /** True when an active constraint could not be expressed and was left out. */
  readonly isPartial: boolean;
}

function opportunityIn(tag: string): ColumnFilter {
  return {
    columnKey: 'opportunity_tag',
    value: { kind: 'multi', operator: 'in', values: [tag] },
  };
}

function healthScore(operator: 'gte' | 'lt', value: number): ColumnFilter {
  return {
    columnKey: 'health_score',
    value: { kind: 'scalar', operator, value },
  };
}

/** Exact FilterSet for an ad-hoc opportunity segment, or null if none. */
export function opportunityToFilter(tag: string | null): ColumnFilter | null {
  return tag === null ? null : opportunityIn(tag);
}

/** Exact FilterSet for the healthStatus values that convert; null otherwise. */
export function healthStatusToFilter(status: FilterState['healthStatus']): ColumnFilter | null {
  if (status === 'healthy') return healthScore('gte', 70);
  if (status === 'needs_review') return healthScore('lt', 40);
  return null;
}

/** Exact FilterSet for the three insight chips that map exactly; null otherwise. */
export function insightKeyToFilter(key: string | null): ColumnFilter | null {
  if (key === 'opportunityTag_automate') return opportunityIn('automate');
  if (key === 'opportunityTag_monitor') return opportunityIn('monitor');
  if (key === 'healthScore_gte_70') return healthScore('gte', 70);
  return null;
}

export function captureFilterSet(input: CaptureFilterInput): CaptureFilterResult {
  const { presetFilters, filters, insightFilterKey, searchQuery } = input;
  const out: ColumnFilter[] = [...(presetFilters ?? [])];
  let isPartial = false;

  const add = (f: ColumnFilter | null): void => {
    if (f === null) return;
    const sig = JSON.stringify(f);
    if (!out.some((o) => JSON.stringify(o) === sig)) out.push(f);
  };

  add(opportunityToFilter(filters.opportunity));

  if (filters.healthStatus !== null) {
    const f = healthStatusToFilter(filters.healthStatus);
    if (f === null) isPartial = true;
    else add(f);
  }

  if (insightFilterKey !== null && isRowNarrowingInsightKey(insightFilterKey)) {
    const f = insightKeyToFilter(insightFilterKey);
    if (f === null) isPartial = true;
    else add(f);
  }

  if (filters.systems.length > 0) isPartial = true;
  if (filters.needsAttention) isPartial = true;
  if (searchQuery.trim() !== '') isPartial = true;

  return { filters: out, isPartial };
}
