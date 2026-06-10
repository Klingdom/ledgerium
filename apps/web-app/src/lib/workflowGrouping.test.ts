import { describe, it, expect, afterEach } from 'vitest';
import type { ProcessRunBundle } from '@ledgerium/intelligence-engine';
import {
  buildSignatureGroups,
  groupWorkflowsForClustering,
  isSimilarityClusteringEnabled,
  type GroupableWorkflow,
} from './workflowGrouping';

/**
 * Minimal groupable workflow. computePathSignature only reads
 * processDefinition.stepDefinitions[].{ordinal,category}, so we provide exactly
 * that and cast — the cast documents which fields are actually exercised.
 */
function wf(id: string, cats: string[]): GroupableWorkflow {
  return {
    id,
    title: `wf-${id}`,
    processOutput: {
      processRun: {} as ProcessRunBundle['processRun'],
      processDefinition: {
        stepDefinitions: cats.map((category, ordinal) => ({ ordinal, category })),
      } as unknown as ProcessRunBundle['processDefinition'],
    },
  };
}

const SUBMIT = ['click', 'fill', 'submit'];
const SUBMIT_PLUS = ['click', 'fill', 'validate', 'submit']; // one inserted step → similar
const UNRELATED = ['navigate', 'search', 'export', 'download'];

afterEach(() => {
  delete process.env.LEDGERIUM_SIMILARITY_CLUSTERING;
});

describe('isSimilarityClusteringEnabled', () => {
  it('defaults to false and reads the env flag', () => {
    delete process.env.LEDGERIUM_SIMILARITY_CLUSTERING;
    expect(isSimilarityClusteringEnabled()).toBe(false);
    process.env.LEDGERIUM_SIMILARITY_CLUSTERING = '1';
    expect(isSimilarityClusteringEnabled()).toBe(true);
    process.env.LEDGERIUM_SIMILARITY_CLUSTERING = 'true';
    expect(isSimilarityClusteringEnabled()).toBe(true);
    process.env.LEDGERIUM_SIMILARITY_CLUSTERING = 'off';
    expect(isSimilarityClusteringEnabled()).toBe(false);
  });
});

describe('buildSignatureGroups (legacy exact grouping)', () => {
  it('groups identical signatures and separates different ones', () => {
    const groups = buildSignatureGroups([
      wf('a', SUBMIT),
      wf('b', SUBMIT),
      wf('c', UNRELATED),
    ]);
    expect(groups.size).toBe(2);
    expect(groups.get('click:fill:submit')?.map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('skips workflows with no processOutput', () => {
    const groups = buildSignatureGroups([
      wf('a', SUBMIT),
      { id: 'x', title: 'x', processOutput: null },
    ]);
    expect(groups.size).toBe(1);
  });
});

describe('groupWorkflowsForClustering — flag OFF (production default)', () => {
  it('is byte-identical to exact grouping — similar variants stay separate', () => {
    const wfs = [wf('a', SUBMIT), wf('b', SUBMIT_PLUS), wf('c', UNRELATED)];
    const off = groupWorkflowsForClustering(wfs, { similarityClustering: false });
    const exact = buildSignatureGroups(wfs);
    expect([...off.entries()]).toEqual([...exact.entries()]);
    expect(off.size).toBe(3); // A, B (similar but not identical), C all separate
  });
});

describe('groupWorkflowsForClustering — flag ON (similarity)', () => {
  it('merges distinct-but-similar signatures and keeps unrelated separate', () => {
    const wfs = [wf('a', SUBMIT), wf('b', SUBMIT_PLUS), wf('c', UNRELATED)];
    const merged = groupWorkflowsForClustering(wfs, { similarityClustering: true });
    expect(merged.size).toBe(2);
    // A + B merge under the smaller representative signature; C stays alone.
    expect(merged.get('click:fill:submit')?.map((w) => w.id).sort()).toEqual(['a', 'b']);
    expect(merged.has('navigate:search:export:download')).toBe(true);
  });

  it('EXACT-SUBSET invariant: identical-only signatures are unchanged when enabled', () => {
    const wfs = [wf('a', SUBMIT), wf('b', SUBMIT), wf('c', SUBMIT)];
    const merged = groupWorkflowsForClustering(wfs, { similarityClustering: true });
    expect(merged.size).toBe(1);
    expect(merged.get('click:fill:submit')?.map((w) => w.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('a higher threshold falls back to no merge (more groups)', () => {
    const wfs = [wf('a', SUBMIT), wf('b', SUBMIT_PLUS)];
    const merged = groupWorkflowsForClustering(wfs, { similarityClustering: true, threshold: 0.9 });
    expect(merged.size).toBe(2);
  });

  it('is deterministic across repeated runs and input order', () => {
    const wfs = [wf('a', SUBMIT), wf('b', SUBMIT_PLUS), wf('c', UNRELATED)];
    const forward = [...groupWorkflowsForClustering(wfs, { similarityClustering: true }).entries()]
      .map(([k, v]) => [k, v.map((w) => w.id).sort()]);
    const reversed = [...groupWorkflowsForClustering([...wfs].reverse(), { similarityClustering: true }).entries()]
      .map(([k, v]) => [k, v.map((w) => w.id).sort()]);
    // sort entries by key for comparison (Map iteration order may differ by input order)
    const norm = (e: unknown[]) => [...e].sort((a, b) => ((a as [string])[0] < (b as [string])[0] ? -1 : 1));
    expect(norm(reversed)).toEqual(norm(forward));
  });
});
