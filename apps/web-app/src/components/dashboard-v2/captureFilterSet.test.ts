/**
 * #368: captureFilterSet — capture rule, parity with the dashboard's own
 * filtering (applyFilters), and restore through the preset pipeline.
 */
import { describe, it, expect } from 'vitest';
import { captureFilterSet } from './captureFilterSet';
import { applyFilters } from './WorkflowList';
import { evaluateFilterSet, type FilterSet } from '@/lib/dashboard-columns/filters';
import { deriveActiveFilterChips, clearActiveFilterChip } from './activeFilters';
import type { WorkflowRowData } from './WorkflowRow';
import type { FilterState } from './WorkflowListFilterBar';
import type { OpportunityTag } from '@/lib/workflow-metrics';

const NOW = 1_700_000_000_000;
const none: FilterState = { systems: [], opportunity: null, healthStatus: null, needsAttention: false };

function row(
  id: string,
  tag: OpportunityTag,
  health: number,
  opts: { gated?: boolean } = {},
): WorkflowRowData {
  const iso = new Date('2026-01-01T00:00:00.000Z').toISOString();
  return {
    id,
    title: `W ${id}`,
    toolsUsed: ['Salesforce'],
    createdAt: iso,
    updatedAt: iso,
    lastViewedAt: null,
    processDefinitionUpdatedAt: iso,
    metricsV2: {
      runs: 5,
      avgTimeMs: 1000,
      variationScore: 0.2,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: health, speed: 1, consistency: 1, dataQuality: 1, standardization: 1,
        isGated: opts.gated ?? false,
      },
      opportunityTag: tag,
      aiOpportunityScore: 10,
      confidence: 0.9,
    },
  } as unknown as WorkflowRowData;
}

const tags: OpportunityTag[] = ['automate', 'standardize', 'optimize', 'monitor', 'healthy'];
const scores = [0, 39, 40, 41, 69, 70, 71, 100];
const fixtures: WorkflowRowData[] = tags.flatMap((t) =>
  scores.map((s, i) => row(`${t}-${s}`, t, s, { gated: i % 3 === 0 })),
);
const ids = (rs: WorkflowRowData[]) => rs.map((r) => r.id);

/** Rows the dashboard's own filtering keeps vs rows the captured FilterSet keeps. */
function parity(adHoc: Partial<FilterState>, insight: string | null) {
  const own = applyFilters(fixtures, { ...none, ...adHoc }, insight, NOW, '', null);
  const cap = captureFilterSet({
    presetFilters: null, filters: { ...none, ...adHoc }, insightFilterKey: insight, searchQuery: '',
  });
  const viaSet = fixtures.filter((w) =>
    evaluateFilterSet(cap.filters, {
      title: w.title, toolsUsed: w.toolsUsed, lastViewedAt: w.lastViewedAt, createdAt: w.createdAt,
      processDefinitionUpdatedAt: w.processDefinitionUpdatedAt, metricsV2: w.metricsV2,
      referenceNowMs: NOW, activeTimeRange: 'all',
    } as never),
  );
  return { own, viaSet, cap };
}

describe('#368 parity: converted FilterSet filters the same rows as applyFilters', () => {
  for (const t of tags) {
    it(`opportunity=${t}`, () => {
      const { own, viaSet, cap } = parity({ opportunity: t }, null);
      expect(own.length).toBeGreaterThan(0);
      expect(ids(viaSet)).toEqual(ids(own));
      expect(cap.isPartial).toBe(false);
    });
  }
  it('health band healthy (>= 70), including gated rows', () => {
    const { own, viaSet, cap } = parity({ healthStatus: 'healthy' }, null);
    expect(own.some((r) => r.metricsV2.healthScore.isGated)).toBe(true);
    expect(ids(viaSet)).toEqual(ids(own));
    expect(cap.isPartial).toBe(false);
  });
  it('health band needs_review (< 40), including gated rows', () => {
    const { own, viaSet, cap } = parity({ healthStatus: 'needs_review' }, null);
    expect(own.length).toBeGreaterThan(0);
    expect(ids(viaSet)).toEqual(ids(own));
    expect(cap.isPartial).toBe(false);
  });
  for (const key of ['opportunityTag_automate', 'opportunityTag_monitor', 'healthScore_gte_70']) {
    it(`insight chip ${key}`, () => {
      const { own, viaSet, cap } = parity({}, key);
      expect(own.length).toBeGreaterThan(0);
      expect(ids(viaSet)).toEqual(ids(own));
      expect(cap.isPartial).toBe(false);
    });
  }
  it('combined opportunity + health band AND-compose identically', () => {
    const { own, viaSet } = parity({ opportunity: 'automate', healthStatus: 'healthy' }, null);
    expect(ids(viaSet)).toEqual(ids(own));
  });
});

describe('#368 capture rule', () => {
  const base = { presetFilters: null, filters: none, insightFilterKey: null, searchQuery: '' };

  it('nothing active -> empty, not partial', () => {
    expect(captureFilterSet(base)).toEqual({ filters: [], isPartial: false });
  });

  it('takes preset filters verbatim and adds convertible ad-hoc filters', () => {
    const preset: FilterSet = [
      { columnKey: 'opportunity_tag', value: { kind: 'multi', operator: 'in', values: ['automate'] } },
    ];
    const r = captureFilterSet({ ...base, presetFilters: preset, filters: { ...none, healthStatus: 'healthy' } });
    expect(r.filters[0]).toBe(preset[0]);
    expect(r.filters).toHaveLength(2);
  });

  it('dedupes an identical ad-hoc + insight constraint', () => {
    const r = captureFilterSet({
      ...base,
      filters: { ...none, opportunity: 'automate' },
      insightFilterKey: 'opportunityTag_automate',
    });
    expect(r.filters).toHaveLength(1);
  });

  it.each([
    ['systems', { filters: { ...none, systems: ['Salesforce'] } }],
    ['needsAttention', { filters: { ...none, needsAttention: true } }],
    ['high_variation', { filters: { ...none, healthStatus: 'high_variation' as const } }],
    ['stale', { filters: { ...none, healthStatus: 'stale' as const } }],
    ['variation insight chip', { insightFilterKey: 'variationScore_gt_0.7' }],
    ['search', { searchQuery: 'invoice' }],
  ])('%s is inexpressible: flagged partial, nothing fabricated', (_n, patch) => {
    const r = captureFilterSet({ ...base, ...patch });
    expect(r.isPartial).toBe(true);
    expect(r.filters).toEqual([]);
  });

  it('the global bottleneck chip does not narrow rows, so it is not partial', () => {
    expect(captureFilterSet({ ...base, insightFilterKey: 'bottleneck_insight' }).isPartial).toBe(false);
  });

  it('whitespace-only search is not partial', () => {
    expect(captureFilterSet({ ...base, searchQuery: '   ' }).isPartial).toBe(false);
  });
});

describe('#368 restore through the preset pipeline', () => {
  it('a stored view FilterSet fed as presetFilters filters rows like the ad-hoc filter (JSON round-trip)', () => {
    const cap = captureFilterSet({
      presetFilters: null, filters: { ...none, opportunity: 'automate' }, insightFilterKey: null, searchQuery: '',
    });
    const stored = JSON.parse(JSON.stringify(cap.filters)) as FilterSet;
    const restored = applyFilters(fixtures, none, null, NOW, '', stored);
    expect(ids(restored)).toEqual(
      ids(applyFilters(fixtures, { ...none, opportunity: 'automate' }, null, NOW, '', null)),
    );
  });

  it('filters on an unavailable column stay no-ops (match nothing, never fabricate)', () => {
    const stale: FilterSet = [
      { columnKey: 'cycle_time_p95_ms' as never, value: { kind: 'scalar', operator: 'gt', value: 1 } },
    ];
    expect(applyFilters(fixtures, none, null, NOW, '', stale)).toEqual([]);
  });

  it('view chip shows "View: {name}" and its clear drops only the view', () => {
    const chips = deriveActiveFilterChips({
      filters: none, insightFilterKey: null, searchQuery: '', presetId: null, presetLabel: null, viewName: 'My view',
    });
    expect(chips.map((c) => c.label)).toEqual(['View: My view']);
    const next = clearActiveFilterChip(
      { filters: none, insightFilterKey: null, searchQuery: '', presetId: null, viewName: 'My view' },
      chips[0]!,
    );
    expect(next.viewName).toBeNull();
  });

  it('no view chip when no view is applied', () => {
    expect(
      deriveActiveFilterChips({ filters: none, insightFilterKey: null, searchQuery: '', presetId: null, presetLabel: null }),
    ).toEqual([]);
  });
});
