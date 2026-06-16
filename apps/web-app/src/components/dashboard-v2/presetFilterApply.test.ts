/**
 * preset-applies-filters — atglance-review #10 tests.
 *
 * Environment: Vitest (node) — pure logic, no React rendering.
 *
 * Verifies the closed over-promise: applying a preset now filters ROWS (not just
 * columns) by threading the preset's real FilterSet through the SINGLE
 * applyFilters pipeline (via evaluateFilterSet). Confirms:
 *   - "Automation Candidates" actually shows automate-tagged rows.
 *   - A preset's FilterSet AND-composes with other active constraints.
 *   - An empty-FilterSet preset (e.g. Recent Activity) honestly filters nothing.
 *   - Audit-honesty: a preset that references a value no row carries yields the
 *     honest subset (never fabricated rows).
 */

import { describe, it, expect } from 'vitest';
import { applyFilters } from './WorkflowList';
import type { WorkflowRowData } from './WorkflowRow';
import type { FilterState } from './WorkflowListFilterBar';
import { getPresetById } from '@/lib/dashboard-columns/presets';
import type { OpportunityTag } from '@/lib/workflow-metrics';

const emptyFilters: FilterState = {
  systems: [],
  opportunity: null,
  healthStatus: null,
  needsAttention: false,
};

function makeWorkflow(
  id: string,
  opts: { tag?: OpportunityTag; runs?: number; health?: number } = {},
): WorkflowRowData {
  const { tag = 'healthy', runs = 5, health = 75 } = opts;
  return {
    id,
    title: `Workflow ${id}`,
    toolsUsed: ['Salesforce'],
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    lastViewedAt: null,
    processDefinitionUpdatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    metricsV2: {
      runs,
      avgTimeMs: 120_000,
      variationScore: 0.2,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: health,
        speed: 30,
        consistency: 24,
        dataQuality: 14,
        standardization: 7,
        isGated: false,
      },
      opportunityTag: tag,
      aiOpportunityScore: 42,
      confidence: 0.9,
    },
  };
}

const FROZEN_NOW = 1_700_000_000_000;

const workflows: WorkflowRowData[] = [
  makeWorkflow('a', { tag: 'automate', runs: 12, health: 80 }),
  makeWorkflow('b', { tag: 'standardize', runs: 3, health: 60 }),
  makeWorkflow('c', { tag: 'healthy', runs: 1, health: 90 }),
  makeWorkflow('d', { tag: 'monitor', runs: 15, health: 45 }),
];

describe('atglance-review #10: presets filter rows via applyFilters', () => {
  it('null presetFilters = no preset constraint (additive, backward-compatible)', () => {
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', null);
    expect(result).toHaveLength(4);
  });

  it('"Automation Candidates" preset filters to automate-tagged rows only', () => {
    const preset = getPresetById('automation_candidates')!;
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    expect(result.map((w) => w.id)).toEqual(['a']);
    expect(result.every((w) => w.metricsV2.opportunityTag === 'automate')).toBe(true);
  });

  it('"Standardize" preset filters to standardize-tagged rows only', () => {
    const preset = getPresetById('standardize')!;
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    expect(result.map((w) => w.id)).toEqual(['b']);
  });

  it('"High Volume" preset filters to run_count >= 10', () => {
    const preset = getPresetById('high_volume')!;
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    // a (12 runs) and d (15 runs) qualify; b (3) and c (1) do not.
    expect(result.map((w) => w.id).sort()).toEqual(['a', 'd']);
  });

  it('"Needs Attention" preset filters to monitor/needs_review (honest: needs_review unmatched)', () => {
    const preset = getPresetById('needs_attention')!;
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    // Only 'monitor' rows exist; 'needs_review' is not an opportunityTag any row
    // carries — the evaluator honestly yields just the monitor row.
    expect(result.map((w) => w.id)).toEqual(['d']);
  });

  it('"Recent Activity" preset has an empty FilterSet → honestly filters nothing', () => {
    const preset = getPresetById('recent_activity')!;
    expect(preset.filters).toHaveLength(0);
    const result = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    // Empty FilterSet passes unconditionally — applying this preset changes
    // columns only, it does not over-promise a row filter.
    expect(result).toHaveLength(4);
  });

  it('preset FilterSet AND-composes with the global search query', () => {
    const preset = getPresetById('high_volume')!;
    // Search narrows to "a"; preset keeps run_count>=10 → still "a".
    const result = applyFilters(
      workflows,
      emptyFilters,
      null,
      FROZEN_NOW,
      'Workflow a',
      preset.filters,
    );
    expect(result.map((w) => w.id)).toEqual(['a']);
  });

  it('preset filtering is deterministic — same inputs → identical result', () => {
    const preset = getPresetById('automation_candidates')!;
    const r1 = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    const r2 = applyFilters(workflows, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    expect(r1.map((w) => w.id)).toEqual(r2.map((w) => w.id));
  });

  it('a preset yielding zero matches returns [] (honest empty — never fabricated rows)', () => {
    // All-healthy set + automation_candidates preset → no automate rows.
    const allHealthy = [makeWorkflow('h1'), makeWorkflow('h2'), makeWorkflow('h3')];
    const preset = getPresetById('automation_candidates')!;
    const result = applyFilters(allHealthy, emptyFilters, null, FROZEN_NOW, '', preset.filters);
    expect(result).toEqual([]);
  });
});
