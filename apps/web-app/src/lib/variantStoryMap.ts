/**
 * Variant "story map" builder (Process Variation Phase 2, V2).
 *
 * Turns the multi-run variants of a process into a single left→right map: the
 * standard path is a straight spine, and each variant's deviation is a branch that
 * peels off the spine and rejoins it downstream. Built on the deterministic
 * `analyzeDivergence` engine, run-weighted by each variant's runCount.
 *
 * Pure + DETERMINISTIC (no Date/random; arithmetic positions; stable engine order)
 * → the same variants always produce a byte-identical map → hydration-safe and
 * unit-testable. Node positions are computed here, NOT by a layout library, so the
 * diagram is reproducible. Every branch traces back to its source runs.
 */
import { analyzeDivergence, type DivergenceRun } from '@ledgerium/intelligence-engine';

export interface StoryVariantInput {
  id: string;
  isStandard?: boolean;
  runCount?: number;
  stepCategories: string[];
}

export type StoryNodeKind = 'backbone' | 'branch';

export interface StoryNode {
  id: string;
  kind: StoryNodeKind;
  category: string;
  /** Index on the backbone (for backbone nodes); null for branch nodes. */
  backboneIndex: number | null;
  x: number;
  y: number;
  /** Backbone node where at least one branch leaves (out-degree > 1). */
  isDecision: boolean;
  /** Run share of the path this node belongs to (1 for the spine). */
  runShare: number;
}

export type StoryEdgeKind = 'spine' | 'branch' | 'rejoin' | 'shortcut';

export interface StoryEdge {
  id: string;
  source: string;
  target: string;
  kind: StoryEdgeKind;
  /** 0–1 share of runs traversing this edge (for stroke weight). */
  runShare: number;
  runCount: number;
  /** Number of alternative steps on this branch (label context). */
  altCount: number;
}

export interface VariantStoryMap {
  nodes: StoryNode[];
  edges: StoryEdge[];
  backbone: string[];
  totalRuns: number;
  /** Run-weighted count of runs that follow the spine end-to-end. */
  conformingRunCount: number;
  branchCount: number;
  version: string;
}

const SPACING_X = 170;
const SPACING_Y = 120;
export const STORY_MAP_VERSION = 'variant-story/1.0.0';

/**
 * Build the variant story map. Returns null when there is no standard path or
 * fewer than two variants (nothing to branch).
 */
export function buildVariantStoryMap(variants: StoryVariantInput[]): VariantStoryMap | null {
  const withSteps = variants.filter((v) => v.stepCategories.length > 0);
  if (withSteps.length < 2) return null;

  const standard = withSteps.find((v) => v.isStandard) ?? withSteps[0]!;
  const backbone = standard.stepCategories;
  if (backbone.length === 0) return null;

  const runs: DivergenceRun[] = withSteps.map((v) => ({ id: v.id, steps: v.stepCategories }));
  const analysis = analyzeDivergence(backbone, runs);

  const runCountByVariant = new Map(withSteps.map((v) => [v.id, v.runCount ?? 0]));
  const totalRuns = withSteps.reduce((s, v) => s + (v.runCount ?? 0), 0) || withSteps.length;

  // Run-weighted conforming count (variants that take no branch).
  const divergingIds = new Set<string>();
  for (const b of analysis.branches) for (const id of b.evidenceRunIds) divergingIds.add(id);
  const conformingRunCount = withSteps
    .filter((v) => !divergingIds.has(v.id))
    .reduce((s, v) => s + (v.runCount ?? 0), 0);

  // ── Spine ────────────────────────────────────────────────────────────────
  const nodes: StoryNode[] = backbone.map((category, i) => ({
    id: `bb-${i}`,
    kind: 'backbone' as const,
    category,
    backboneIndex: i,
    x: i * SPACING_X,
    y: 0,
    isDecision: false,
    runShare: 1,
  }));

  const edges: StoryEdge[] = [];
  for (let i = 0; i < backbone.length - 1; i++) {
    edges.push({ id: `spine-${i}`, source: `bb-${i}`, target: `bb-${i + 1}`, kind: 'spine', runShare: 1, runCount: totalRuns, altCount: 0 });
  }

  // ── Branches ───────────────────────────────────────────────────────────────
  analysis.branches.forEach((b, lane) => {
    const weight = b.evidenceRunIds.reduce((s, id) => s + (runCountByVariant.get(id) ?? 0), 0);
    const runShare = totalRuns > 0 ? weight / totalRuns : 0;
    const laneY = (lane + 1) * SPACING_Y;

    if (b.divergeAfterIndex >= 0) {
      const dNode = nodes.find((n) => n.backboneIndex === b.divergeAfterIndex);
      if (dNode) dNode.isDecision = true;
    }

    const startIdx = b.divergeAfterIndex; // -1..len-1
    const endIdx = b.reconvergeAtIndex; // 1..len
    const startX = (startIdx >= 0 ? startIdx : -0.6) * SPACING_X;
    const endX = (endIdx < backbone.length ? endIdx : backbone.length - 1 + 0.6) * SPACING_X;
    const sourceBackboneId = `bb-${startIdx >= 0 ? startIdx : 0}`;
    const targetBackboneId = `bb-${endIdx < backbone.length ? endIdx : backbone.length - 1}`;

    if (b.altSteps.length === 0) {
      // Shortcut (skipped backbone steps): a dashed bypass between anchors.
      edges.push({ id: `shortcut-${lane}`, source: sourceBackboneId, target: targetBackboneId, kind: 'shortcut', runShare, runCount: weight, altCount: 0 });
      return;
    }

    const count = b.altSteps.length;
    const branchNodeIds: string[] = [];
    b.altSteps.forEach((category, k) => {
      const t = (k + 1) / (count + 1);
      const id = `br-${lane}-${k}`;
      branchNodeIds.push(id);
      nodes.push({ id, kind: 'branch', category, backboneIndex: null, x: startX + (endX - startX) * t, y: laneY, isDecision: false, runShare });
    });

    edges.push({ id: `branch-${lane}-in`, source: sourceBackboneId, target: branchNodeIds[0]!, kind: 'branch', runShare, runCount: weight, altCount: count });
    for (let k = 0; k < branchNodeIds.length - 1; k++) {
      edges.push({ id: `branch-${lane}-${k}`, source: branchNodeIds[k]!, target: branchNodeIds[k + 1]!, kind: 'branch', runShare, runCount: weight, altCount: count });
    }
    edges.push({ id: `rejoin-${lane}`, source: branchNodeIds[branchNodeIds.length - 1]!, target: targetBackboneId, kind: 'rejoin', runShare, runCount: weight, altCount: count });
  });

  return {
    nodes,
    edges,
    backbone,
    totalRuns,
    conformingRunCount,
    branchCount: analysis.branches.length,
    version: `${STORY_MAP_VERSION}#${analysis.version}`,
  };
}
