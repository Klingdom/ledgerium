/**
 * activeFilters — unified active-filters model tests (atglance-review #11).
 *
 * Environment: Vitest (node) — pure logic, no React rendering.
 *
 * Verifies the SINGLE source-of-truth projection: each of the four filter
 * mechanisms (opportunity segment, insight chip, filter panel, preset) + search
 * maps into exactly one (or more, for systems) active-filter chip; that a
 * not-set source produces no chip (honest empty); and that the derivation is
 * deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveActiveFilterChips,
  hasAnyActiveFilter,
  isRowNarrowingInsightKey,
  clearActiveFilterChip,
  CLEARED_FILTER_STATE,
  type ActiveFilterSources,
  type ActiveFilterState,
  type ActiveFilterChip,
} from './activeFilters';
import type { FilterState } from './WorkflowListFilterBar';

const emptyFilters: FilterState = {
  systems: [],
  opportunity: null,
  healthStatus: null,
  needsAttention: false,
};

const emptySources: ActiveFilterSources = {
  filters: emptyFilters,
  insightFilterKey: null,
  searchQuery: '',
  presetId: null,
  presetLabel: null,
};

describe('activeFilters: empty / honest no-op', () => {
  it('produces zero chips when nothing is active', () => {
    expect(deriveActiveFilterChips(emptySources)).toEqual([]);
  });

  it('hasAnyActiveFilter is false when no source is set', () => {
    expect(hasAnyActiveFilter(emptySources)).toBe(false);
  });

  it('a whitespace-only search query is not an active filter (honest)', () => {
    const chips = deriveActiveFilterChips({ ...emptySources, searchQuery: '   ' });
    expect(chips).toEqual([]);
  });
});

describe('activeFilters: each source maps into the unified model', () => {
  it('(a) opportunity segment → one Opportunity chip', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      filters: { ...emptyFilters, opportunity: 'automate' },
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.source).toBe('opportunity');
    expect(chips[0]!.label).toBe('Opportunity: Automate');
    expect(chips[0]!.value).toBe('automate');
  });

  it('(b) insight chip → one chip with a plain-language label', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      insightFilterKey: 'variationScore_gt_0.7',
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.source).toBe('insight');
    expect(chips[0]!.label).toBe('High variation');
  });

  it('(b) global bottleneck insight key is NOT an active filter (no row predicate)', () => {
    // bottleneck_insight has no per-row predicate in applyFilters — it must not
    // appear as an active filter (honesty: shows only real constraints).
    expect(isRowNarrowingInsightKey('bottleneck_insight')).toBe(false);
    const chips = deriveActiveFilterChips({
      ...emptySources,
      insightFilterKey: 'bottleneck_insight',
    });
    expect(chips).toEqual([]);
  });

  it('(c) filter panel: systems → one chip per system', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      filters: { ...emptyFilters, systems: ['Salesforce', 'Slack'] },
    });
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.label)).toEqual(['System: Salesforce', 'System: Slack']);
    expect(chips.every((c) => c.source === 'system')).toBe(true);
  });

  it('(c) filter panel: healthStatus → one Health chip', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      filters: { ...emptyFilters, healthStatus: 'high_variation' },
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toBe('Health: High Variation');
    expect(chips[0]!.source).toBe('healthStatus');
  });

  it('(c) filter panel: needsAttention → one chip', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      filters: { ...emptyFilters, needsAttention: true },
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toBe('Needs attention');
    expect(chips[0]!.source).toBe('needsAttention');
  });

  it('(d) preset → one Preset chip using the human label', () => {
    const chips = deriveActiveFilterChips({
      ...emptySources,
      presetId: 'automation_candidates',
      presetLabel: 'Automation Candidates',
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.source).toBe('preset');
    expect(chips[0]!.label).toBe('Preset: Automation Candidates');
    expect(chips[0]!.value).toBe('automation_candidates');
  });

  it('search → one Search chip carrying the trimmed query', () => {
    const chips = deriveActiveFilterChips({ ...emptySources, searchQuery: '  invoice  ' });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.source).toBe('search');
    expect(chips[0]!.label).toBe('Search: invoice');
  });
});

describe('activeFilters: combined sources + uniqueness', () => {
  it('combines all four mechanisms into one ordered list', () => {
    const chips = deriveActiveFilterChips({
      filters: {
        systems: ['Salesforce'],
        opportunity: 'automate',
        healthStatus: 'stale',
        needsAttention: true,
      },
      insightFilterKey: 'healthScore_gte_70',
      searchQuery: 'report',
      presetId: 'standardize',
      presetLabel: 'Standardize',
    });
    // search + 1 system + opportunity + healthStatus + needsAttention + insight + preset
    expect(chips).toHaveLength(7);
    // Keys are unique within a render (React keying contract).
    const keys = chips.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(hasAnyActiveFilter).toBeTypeOf('function');
  });

  it('is deterministic — same sources → byte-identical chips', () => {
    const sources: ActiveFilterSources = {
      filters: { ...emptyFilters, opportunity: 'monitor', systems: ['A', 'B'] },
      insightFilterKey: null,
      searchQuery: 'x',
      presetId: null,
      presetLabel: null,
    };
    expect(deriveActiveFilterChips(sources)).toEqual(deriveActiveFilterChips(sources));
  });
});

// ── Clear reducers (per-chip clear + Clear-all) ───────────────────────────────

const fullState: ActiveFilterState = {
  filters: {
    systems: ['Salesforce', 'Slack'],
    opportunity: 'automate',
    healthStatus: 'stale',
    needsAttention: true,
  },
  insightFilterKey: 'healthScore_gte_70',
  searchQuery: 'report',
  presetId: 'standardize',
};

describe('activeFilters: Clear-all resets every source', () => {
  it('CLEARED_FILTER_STATE has no active constraint of any kind', () => {
    expect(CLEARED_FILTER_STATE.filters.systems).toEqual([]);
    expect(CLEARED_FILTER_STATE.filters.opportunity).toBeNull();
    expect(CLEARED_FILTER_STATE.filters.healthStatus).toBeNull();
    expect(CLEARED_FILTER_STATE.filters.needsAttention).toBe(false);
    expect(CLEARED_FILTER_STATE.insightFilterKey).toBeNull();
    expect(CLEARED_FILTER_STATE.searchQuery).toBe('');
    expect(CLEARED_FILTER_STATE.presetId).toBeNull();
  });

  it('deriving chips from the cleared state yields zero chips', () => {
    const chips = deriveActiveFilterChips({
      filters: CLEARED_FILTER_STATE.filters,
      insightFilterKey: CLEARED_FILTER_STATE.insightFilterKey,
      searchQuery: CLEARED_FILTER_STATE.searchQuery,
      presetId: CLEARED_FILTER_STATE.presetId,
      presetLabel: null,
    });
    expect(chips).toHaveLength(0);
  });
});

describe('activeFilters: per-chip clear routes to the right source only', () => {
  function chip(source: ActiveFilterChip['source'], value: string | null): ActiveFilterChip {
    return { key: source, source, label: '', value };
  }

  it('clearing the search chip clears only searchQuery', () => {
    const next = clearActiveFilterChip(fullState, chip('search', null));
    expect(next.searchQuery).toBe('');
    expect(next.filters).toEqual(fullState.filters);
    expect(next.presetId).toBe('standardize');
  });

  it('clearing a system chip removes only that one system', () => {
    const next = clearActiveFilterChip(fullState, chip('system', 'Salesforce'));
    expect(next.filters.systems).toEqual(['Slack']);
    expect(next.filters.opportunity).toBe('automate');
  });

  it('clearing the opportunity chip clears only opportunity', () => {
    const next = clearActiveFilterChip(fullState, chip('opportunity', 'automate'));
    expect(next.filters.opportunity).toBeNull();
    expect(next.filters.healthStatus).toBe('stale');
  });

  it('clearing the healthStatus chip clears only healthStatus', () => {
    const next = clearActiveFilterChip(fullState, chip('healthStatus', 'stale'));
    expect(next.filters.healthStatus).toBeNull();
    expect(next.filters.opportunity).toBe('automate');
  });

  it('clearing the needsAttention chip clears only needsAttention', () => {
    const next = clearActiveFilterChip(fullState, chip('needsAttention', null));
    expect(next.filters.needsAttention).toBe(false);
    expect(next.filters.systems).toEqual(['Salesforce', 'Slack']);
  });

  it('clearing the insight chip clears only insightFilterKey', () => {
    const next = clearActiveFilterChip(fullState, chip('insight', 'healthScore_gte_70'));
    expect(next.insightFilterKey).toBeNull();
    expect(next.presetId).toBe('standardize');
  });

  it('clearing the preset chip clears only presetId', () => {
    const next = clearActiveFilterChip(fullState, chip('preset', 'standardize'));
    expect(next.presetId).toBeNull();
    expect(next.insightFilterKey).toBe('healthScore_gte_70');
  });
});
