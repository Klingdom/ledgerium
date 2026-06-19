/**
 * dfgModel — Directly-Follows Graph (DFG) builder and coverage filter.
 *
 * Celonis-style frequency-weighted process map:
 *  - Nodes = activities; edges = "A is immediately followed by B"
 *  - Node and edge carry a frequency (count of runs/cases traversing it)
 *  - A coverage slider progressively hides the rarest transitions
 *
 * HARD REQUIREMENTS (mirroring variantFlowModel.ts):
 *  - Deterministic: no Date.now(), no Math.random(), all sorts use total-order comparators.
 *  - Observed-only: no transitive/inferred edges; every edge traces to real runs.
 *  - Evidence-linked: every node and edge carries sorted, deduplicated evidenceRunIds.
 *  - Never throws: malformed or empty input returns a valid minimal graph.
 *
 * Pure module — no React, no I/O, no side effects.
 *
 * See ARCHITECTURE_DFG.md §1–§4 for the full spec.
 *
 * Schema v2 additions (QW2):
 *  - DfgNode and DfgEdge now carry duration aggregates:
 *    meanDurationMs, medianDurationMs, p95DurationMs, durationSampleCount.
 *  - durationSampleCount === 0 → all duration fields are 0 (no data).
 *  - Edge duration = duration of the TARGET step (transition-time semantics).
 *  - Computation is deterministic: sorted arrays, no floating-point ordering dependency.
 *  - Math.max(…spread) replaced with .reduce() to avoid call-stack crash at ~130k nodes.
 *  - O(E²) allEdges.find() in filterDfgByCoverage replaced with Map<id, DfgEdge>.
 */

import { CATEGORY_STYLES } from '../components/workflow-view/constants';
import type { VariantInput } from './variantFlowModel';

// ─── Re-export VariantInput so consumers can import from one place ─────────────
export type { VariantInput };

// ─── Public types (spec §1) ───────────────────────────────────────────────────

/** Schema version pin — bump on any field/semantic change; consumers assert this. */
export const DFG_SCHEMA_VERSION = 2 as const;

/** Stable, derived node identity. START/END are synthetic terminals. */
export interface DfgNode {
  /** Deterministic id. Terminals: '__start__' | '__end__'.
   *  Activity nodes: `node:${category}:${canonicalLabel}` (see §2 id derivation). */
  id: string;
  /** 'start' | 'end' | 'activity' — terminals anchor the happy path. */
  kind: 'start' | 'end' | 'activity';
  /** GroupingReason category (e.g. 'fill_and_submit'); '' for terminals. */
  category: string;
  /** Display label — REAL recorded title when present, else humanized category. Never fabricated. */
  label: string;
  /** Number of cases (runs) in which this activity occurs. Terminals = totalRuns. */
  caseCount: number;
  /** Sorted, de-duplicated union of run ids that traversed this node (the evidence link). */
  evidenceRunIds: string[];

  // ── Duration aggregates (schema v2, QW2) ──────────────────────────────────
  /** Number of duration samples collected. 0 = no timing data available. */
  durationSampleCount: number;
  /** Arithmetic mean of all collected step durations, ms. 0 when durationSampleCount === 0. */
  meanDurationMs: number;
  /** Median of all collected step durations, ms. 0 when durationSampleCount === 0. */
  medianDurationMs: number;
  /** 95th-percentile of all collected step durations, ms. 0 when durationSampleCount === 0. */
  p95DurationMs: number;
}

/** A directly-follows transition observed between two activities (or terminal↔activity). */
export interface DfgEdge {
  /** Deterministic id: `edge:${sourceId}->${targetId}`. */
  id: string;
  sourceId: string;
  targetId: string;
  /** Number of cases (runs) in which source is immediately followed by target. */
  caseCount: number;
  /** Sorted, de-duplicated union of run ids that traversed this transition. */
  evidenceRunIds: string[];

  // ── Duration aggregates (schema v2, QW2) ──────────────────────────────────
  /** Number of duration samples collected (= duration of the TARGET step). 0 = no data. */
  durationSampleCount: number;
  /** Arithmetic mean of target-step durations for this transition, ms. */
  meanDurationMs: number;
  /** Median of target-step durations for this transition, ms. */
  medianDurationMs: number;
  /** 95th-percentile of target-step durations for this transition, ms. */
  p95DurationMs: number;
}

/** The complete frequency-weighted process map. */
export interface DirectlyFollowsGraph {
  version: typeof DFG_SCHEMA_VERSION;
  /** Insertion-ordered, then stably re-sorted (see §2) — deterministic. */
  nodes: DfgNode[];
  edges: DfgEdge[];
  /** Total cases analyzed (== sum of variant.runCount). Denominator for coverage %. */
  totalRuns: number;
  /** max caseCount over edges (0 if none) — frontend normalizes stroke weight. */
  maxEdgeFrequency: number;
  /** max caseCount over activity nodes (0 if none) — frontend normalizes node weight. */
  maxNodeFrequency: number;
}

// ─── Terminal ids ─────────────────────────────────────────────────────────────

const START_ID = '__start__';
const END_ID   = '__end__';

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Humanize a category name to a display label.
 * Mirrors variantFlowModel.ts catStyle() fallback.
 */
function categoryLabel(category: string): string {
  const style = CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES];
  return style?.label ?? category;
}

/**
 * Real step label for a variant at position i — exactly mirrors
 * variantFlowModel.ts:272-277 stepLabel helper.
 *  - Real title when stepTitles[i] exists and length > 2
 *  - Humanized category label otherwise
 */
function stepLabel(variant: VariantInput, stepIndex: number): string {
  const title = variant.stepTitles?.[stepIndex];
  if (title && title.trim().length > 2) return title.trim();
  const cat = variant.stepCategories[stepIndex] ?? 'single_action';
  return categoryLabel(cat);
}

/**
 * Derive the canonical, collision-resistant node id for an activity.
 * canonicalLabel = stepLabel lowercased, trimmed, internal whitespace collapsed.
 */
function activityNodeId(variant: VariantInput, stepIndex: number): string {
  const cat    = variant.stepCategories[stepIndex] ?? 'single_action';
  const raw    = stepLabel(variant, stepIndex);
  const canon  = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return `node:${cat}:${canon}`;
}

/**
 * Finalize an evidenceRunIds accumulator to a sorted, deduped string array.
 * This is the sole place that touches the final ordering — always a total-order
 * `.sort()` with no stability dependency on insertion order.
 */
function finalizeEvidence(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

/**
 * Comparator: sort nodes by caseCount desc, then id asc.
 * Terminals are pinned externally; this is for activity nodes.
 */
function nodeCmp(a: DfgNode, b: DfgNode): number {
  if (b.caseCount !== a.caseCount) return b.caseCount - a.caseCount;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Comparator: sort edges by caseCount desc, then sourceId asc, then targetId asc.
 */
function edgeCmp(a: DfgEdge, b: DfgEdge): number {
  if (b.caseCount !== a.caseCount) return b.caseCount - a.caseCount;
  if (a.sourceId !== b.sourceId) return a.sourceId < b.sourceId ? -1 : 1;
  return a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0;
}

// ─── Duration aggregate helpers (schema v2, QW2) ──────────────────────────────

/**
 * Compute deterministic duration aggregates from an already-sorted array of
 * duration samples (ms).  Caller sorts before calling.
 *
 * Returns zeros for empty arrays.
 */
function computeDurationAggregates(sortedSamples: number[]): {
  durationSampleCount: number;
  meanDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
} {
  const count = sortedSamples.length;
  if (count === 0) {
    return { durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 };
  }

  // Mean
  let sum = 0;
  for (const v of sortedSamples) sum += v;
  const meanDurationMs = sum / count;

  // Median — lower-median for even-length arrays (single deterministic pick)
  const midIdx = Math.floor((count - 1) / 2);
  const medianDurationMs = count % 2 === 1
    ? sortedSamples[midIdx]!
    : (sortedSamples[midIdx]! + sortedSamples[midIdx + 1]!) / 2;

  // p95 — floor-index pick (consistent with ClickHouse quantile(0.95))
  const p95Idx = Math.floor(0.95 * (count - 1));
  const p95DurationMs = sortedSamples[p95Idx]!;

  return { durationSampleCount: count, meanDurationMs, medianDurationMs, p95DurationMs };
}

// ─── Builder (spec §2) ───────────────────────────────────────────────────────

/**
 * Build a frequency-weighted Directly-Follows Graph from an array of variant inputs.
 *
 * Aggregation rules:
 *  1. totalRuns = Σ runCount over variants with non-empty stepCategories.
 *  2. Per-variant ordered sequence: [__start__, activityId(0)…activityId(L-1), __end__].
 *     Repeated identical activity ids in one variant's path merge to the SAME node
 *     (DFG loops), but contribute only ONE caseCount unit to that node for this variant.
 *  3. Node caseCount = number of variants whose sequence includes the node.
 *  4. Edge (A→B) caseCount = number of variants with A immediately followed by B
 *     (considering every adjacent pair in the full seq including repeated steps).
 *  5. Finalize: dedupe+sort evidenceRunIds, sort nodes/edges, compute max*.
 *  6. Empty input → minimal graph with only __start__/__end__, no edges.
 *  7. Duration aggregates (schema v2): per-step durations from stepDurationsMs are
 *     collected across all variants (weighted by runCount) and aggregated per node
 *     (sojourn time of the step) and per edge (duration of the TARGET step).
 *     Terminals carry durationSampleCount=0 (no timing semantics for synthetic nodes).
 *
 * Never throws.
 */
export function buildDirectlyFollowsGraph(variants: VariantInput[]): DirectlyFollowsGraph {
  // Mutable accumulators
  const nodeCount    = new Map<string, number>();
  const nodeEvidence = new Map<string, string[]>();
  const nodeCategory = new Map<string, string>();
  const nodeLabel    = new Map<string, string>();
  const edgeCount    = new Map<string, number>();
  const edgeEvidence = new Map<string, string[]>();

  // Duration accumulators (schema v2) — raw sample arrays; finalize after all variants
  const nodeDurations = new Map<string, number[]>(); // nodeId → [ms, ms, …]
  const edgeDurations = new Map<string, number[]>(); // edgeKey → [ms, ms, …]

  // Helpers to accumulate counts + evidence
  function addToNode(id: string, runCount: number, evidence: string[]): void {
    nodeCount.set(id, (nodeCount.get(id) ?? 0) + runCount);
    const existing = nodeEvidence.get(id) ?? [];
    existing.push(...evidence);
    nodeEvidence.set(id, existing);
  }

  function addToEdge(srcId: string, tgtId: string, runCount: number, evidence: string[]): void {
    const key = `${srcId}\x00${tgtId}`;
    edgeCount.set(key, (edgeCount.get(key) ?? 0) + runCount);
    const existing = edgeEvidence.get(key) ?? [];
    existing.push(...evidence);
    edgeEvidence.set(key, existing);
  }

  /**
   * Add runCount copies of durationMs to an accumulator map for key.
   * Expanding by runCount weights each individual run correctly.
   */
  function addDurationSamples(
    map: Map<string, number[]>,
    key: string,
    durationMs: number,
    runCount: number,
  ): void {
    const existing = map.get(key) ?? [];
    for (let r = 0; r < runCount; r++) existing.push(durationMs);
    map.set(key, existing);
  }

  // Accumulate terminal evidence separately
  const allEvidence: string[] = [];
  let totalRuns = 0;

  for (const variant of variants) {
    if (variant.stepCategories.length === 0) continue;

    const rc       = variant.runCount;
    const evidence = variant.evidenceRunIds ?? [];
    totalRuns += rc;
    allEvidence.push(...evidence);

    // Build the ordered activity id sequence for this variant
    const activityIds: string[] = [];
    for (let i = 0; i < variant.stepCategories.length; i++) {
      activityIds.push(activityNodeId(variant, i));
      // Record category and label for first encounter (stable: same id ⇒ same category+label)
      const nid = activityIds[activityIds.length - 1]!;
      if (!nodeCategory.has(nid)) {
        const cat = variant.stepCategories[i] ?? 'single_action';
        nodeCategory.set(nid, cat);
        nodeLabel.set(nid, stepLabel(variant, i));
      }
    }

    // Full sequence including terminals
    const seq = [START_ID, ...activityIds, END_ID];

    // Node aggregation: count each DISTINCT activity id ONCE per variant (spec §2 ¶3)
    const seenInVariant = new Set<string>();
    for (let i = 0; i < activityIds.length; i++) {
      const id = activityIds[i]!;
      if (!seenInVariant.has(id)) {
        seenInVariant.add(id);
        addToNode(id, rc, evidence);
      }
      // Node duration: accumulate even if node already seen in this variant
      // (each actual traversal in the sequence warrants a duration sample)
      const dur = variant.stepDurationsMs?.[i];
      if (dur !== undefined && dur >= 0) {
        addDurationSamples(nodeDurations, id, dur, rc);
      }
    }

    // Edge aggregation: every adjacent pair in the FULL seq (spec §2 ¶4)
    // This includes repeated steps (A→A loops) and terminal→activity/activity→terminal.
    for (let k = 0; k < seq.length - 1; k++) {
      const srcId = seq[k]!;
      const tgtId = seq[k + 1]!;
      addToEdge(srcId, tgtId, rc, evidence);

      // Edge duration = duration of the TARGET step (transition-time semantics).
      // Terminals carry no meaningful duration.
      if (tgtId !== END_ID && tgtId !== START_ID) {
        // tgtId corresponds to activityIds[k-1] (k=0 is __start__, so activityIds[k-1] = activityIds[k-1])
        // but seq[k+1] = activityIds[k] (offset by 1 due to START_ID at seq[0]).
        const actIdx = k - 1; // seq[0]=START_ID, seq[1]=activityIds[0], …
        const dur = variant.stepDurationsMs?.[actIdx];
        if (dur !== undefined && dur >= 0) {
          const edgeKey = `${srcId}\x00${tgtId}`;
          addDurationSamples(edgeDurations, edgeKey, dur, rc);
        }
      }
    }
  }

  // Resolve terminals with totalRuns
  const terminalEvidence = finalizeEvidence(allEvidence);

  // Build DfgNode list for activity nodes
  const activityNodes: DfgNode[] = [];
  for (const [id, count] of nodeCount.entries()) {
    const rawSamples = (nodeDurations.get(id) ?? []).slice().sort((a, b) => a - b);
    const durAgg = computeDurationAggregates(rawSamples);
    activityNodes.push({
      id,
      kind: 'activity',
      category: nodeCategory.get(id) ?? '',
      label: nodeLabel.get(id) ?? '',
      caseCount: count,
      evidenceRunIds: finalizeEvidence(nodeEvidence.get(id) ?? []),
      ...durAgg,
    });
  }

  // Sort activity nodes: caseCount desc, then id asc
  activityNodes.sort(nodeCmp);

  // Build DfgEdge list
  const edges: DfgEdge[] = [];
  for (const [key, count] of edgeCount.entries()) {
    const sep = key.indexOf('\x00');
    const sourceId = key.slice(0, sep);
    const targetId = key.slice(sep + 1);
    const rawSamples = (edgeDurations.get(key) ?? []).slice().sort((a, b) => a - b);
    const durAgg = computeDurationAggregates(rawSamples);
    edges.push({
      id: `edge:${sourceId}->${targetId}`,
      sourceId,
      targetId,
      caseCount: count,
      evidenceRunIds: finalizeEvidence(edgeEvidence.get(key) ?? []),
      ...durAgg,
    });
  }

  // Sort edges: caseCount desc, sourceId asc, targetId asc
  edges.sort(edgeCmp);

  // Terminal nodes — no duration aggregates (synthetic nodes)
  const startNode: DfgNode = {
    id: START_ID,
    kind: 'start',
    category: '',
    label: 'Start',
    caseCount: totalRuns,
    evidenceRunIds: terminalEvidence,
    durationSampleCount: 0,
    meanDurationMs: 0,
    medianDurationMs: 0,
    p95DurationMs: 0,
  };
  const endNode: DfgNode = {
    id: END_ID,
    kind: 'end',
    category: '',
    label: 'End',
    caseCount: totalRuns,
    evidenceRunIds: terminalEvidence,
    durationSampleCount: 0,
    meanDurationMs: 0,
    medianDurationMs: 0,
    p95DurationMs: 0,
  };

  // Final node ordering: __start__ first, then activity nodes, then __end__
  const nodes: DfgNode[] = [startNode, ...activityNodes, endNode];

  // Compute maxima (terminals excluded from node max, per spec §2 ¶5).
  // Use .reduce() instead of Math.max(…spread) to avoid call-stack crash at ~130k nodes.
  const maxNodeFrequency = activityNodes.length > 0
    ? activityNodes.reduce((m, n) => n.caseCount > m ? n.caseCount : m, 0)
    : 0;
  const maxEdgeFrequency = edges.length > 0
    ? edges.reduce((m, e) => e.caseCount > m ? e.caseCount : m, 0)
    : 0;

  return {
    version: DFG_SCHEMA_VERSION,
    nodes,
    edges,
    totalRuns,
    maxEdgeFrequency,
    maxNodeFrequency,
  };
}

// ─── Coverage filter (spec §3) ───────────────────────────────────────────────

/**
 * Filter the DFG to retain only the activities and transitions that account for
 * ≥ activityCoverage / connectionCoverage fraction of total cases (Celonis semantics).
 *
 * Steps:
 *  1. Clamp both coverage args to [0,1].
 *  2. Edge selection: keep smallest prefix of edges (by caseCount desc) whose
 *     cumulative share ≥ connectionCoverage. Never empty.
 *  3. Node selection: same rule over activity nodes with activityCoverage.
 *  4. Happy-path guarantee: greedy __start__→__end__ walk over the FULL dfg;
 *     force-include every node and edge on that path.
 *  5. Prune dangling edges/nodes to a fixpoint (≤ 2 passes).
 *  6. Re-emit with recomputed max*, totalRuns unchanged, re-sorted per §2.5.
 *
 * Deterministic: every step uses total-order comparators; same args → identical output.
 */
export function filterDfgByCoverage(
  dfg: DirectlyFollowsGraph,
  activityCoverage: number,
  connectionCoverage: number,
): DirectlyFollowsGraph {
  // Step 1: clamp
  const ac = Math.min(1, Math.max(0, activityCoverage));
  const cc = Math.min(1, Math.max(0, connectionCoverage));

  // Separate activity nodes from terminals
  const activityNodes = dfg.nodes.filter((n) => n.kind === 'activity');
  const allEdges      = dfg.edges;

  // O(E) lookup map — replaces the prior O(E²) allEdges.find() calls in pruning loops.
  const edgeById = new Map<string, DfgEdge>(allEdges.map((e) => [e.id, e]));

  // ── Step 2: Edge selection ────────────────────────────────────────────────

  // Sort by caseCount desc, sourceId asc, targetId asc (total-order)
  const sortedEdges = [...allEdges].sort(edgeCmp);
  const totalEdgeCases = sortedEdges.reduce((s, e) => s + e.caseCount, 0);

  const keptEdgeSet = new Set<string>(); // edge ids

  if (sortedEdges.length > 0) {
    let cumulative = 0;
    for (const edge of sortedEdges) {
      keptEdgeSet.add(edge.id);
      cumulative += edge.caseCount;
      const ratio = totalEdgeCases > 0 ? cumulative / totalEdgeCases : 1;
      if (ratio >= cc) break;
    }
  }

  // ── Step 3: Node selection ────────────────────────────────────────────────

  // Sort activity nodes by caseCount desc, id asc (total-order)
  const sortedActNodes = [...activityNodes].sort(nodeCmp);
  const totalNodeCases = sortedActNodes.reduce((s, n) => s + n.caseCount, 0);

  const keptNodeSet = new Set<string>([START_ID, END_ID]); // terminals always kept

  if (sortedActNodes.length > 0) {
    let cumulative = 0;
    for (const node of sortedActNodes) {
      keptNodeSet.add(node.id);
      cumulative += node.caseCount;
      const ratio = totalNodeCases > 0 ? cumulative / totalNodeCases : 1;
      if (ratio >= ac) break;
    }
  }

  // ── Step 4: Happy-path connectivity guarantee ─────────────────────────────

  // Build adjacency from the FULL original graph (not the filtered set) so the
  // happy-path walk can always reach __end__.
  // For each node, outgoing edges sorted by caseCount desc, targetId asc.
  const outEdges = new Map<string, DfgEdge[]>();
  for (const edge of allEdges) {
    const list = outEdges.get(edge.sourceId) ?? [];
    list.push(edge);
    outEdges.set(edge.sourceId, list);
  }
  for (const [, list] of outEdges) {
    list.sort((a, b) => {
      if (b.caseCount !== a.caseCount) return b.caseCount - a.caseCount;
      return a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0;
    });
  }

  // Greedy walk with cycle guard
  const happyPathNodes = new Set<string>();
  const happyPathEdges = new Set<string>();
  const visited = new Set<string>();
  let current = START_ID;
  happyPathNodes.add(START_ID);

  walkLoop: while (current !== END_ID) {
    visited.add(current);
    const candidates = outEdges.get(current) ?? [];
    let moved = false;
    for (const edge of candidates) {
      if (!visited.has(edge.targetId)) {
        happyPathEdges.add(edge.id);
        happyPathNodes.add(edge.targetId);
        current = edge.targetId;
        moved = true;
        break;
      }
    }
    if (!moved) break walkLoop; // dead-end: no forward path, stop (spec: guard against cycles)
  }

  // Force-include happy path into kept sets
  for (const id of happyPathNodes) keptNodeSet.add(id);
  for (const id of happyPathEdges) keptEdgeSet.add(id);

  // ── Step 5: Prune dangling — fixpoint (≤ 2 passes) ───────────────────────
  // Use edgeById Map (O(1) lookup) instead of allEdges.find() (was O(E) per call → O(E²)).

  for (let pass = 0; pass < 2; pass++) {
    // Drop edges whose source or target is not kept
    for (const id of keptEdgeSet) {
      const edge = edgeById.get(id);
      if (!edge) { keptEdgeSet.delete(id); continue; }
      if (!keptNodeSet.has(edge.sourceId) || !keptNodeSet.has(edge.targetId)) {
        keptEdgeSet.delete(id);
      }
    }

    // Drop activity nodes with no remaining incident edge (terminals exempt)
    const incidentNodes = new Set<string>();
    for (const id of keptEdgeSet) {
      const edge = edgeById.get(id);
      if (edge) {
        incidentNodes.add(edge.sourceId);
        incidentNodes.add(edge.targetId);
      }
    }
    for (const nodeId of keptNodeSet) {
      if (nodeId === START_ID || nodeId === END_ID) continue;
      if (!incidentNodes.has(nodeId)) {
        keptNodeSet.delete(nodeId);
      }
    }
  }

  // ── Step 6: Re-emit filtered graph ───────────────────────────────────────

  const filteredNodes = dfg.nodes.filter((n) => keptNodeSet.has(n.id));
  const filteredEdges = dfg.edges.filter((e) => keptEdgeSet.has(e.id));

  // Re-sort per spec §2.5
  const filteredActivityNodes = filteredNodes.filter((n) => n.kind === 'activity');
  filteredActivityNodes.sort(nodeCmp);

  const start = filteredNodes.find((n) => n.id === START_ID)!;
  const end   = filteredNodes.find((n) => n.id === END_ID)!;
  const sortedFilteredNodes: DfgNode[] = [start, ...filteredActivityNodes, end];

  filteredEdges.sort(edgeCmp);

  // Recompute maxima over kept sets (terminals excluded from node max).
  // Use .reduce() instead of Math.max(…spread) to avoid call-stack crash at ~130k nodes.
  const newMaxNodeFrequency = filteredActivityNodes.length > 0
    ? filteredActivityNodes.reduce((m, n) => n.caseCount > m ? n.caseCount : m, 0)
    : 0;
  const newMaxEdgeFrequency = filteredEdges.length > 0
    ? filteredEdges.reduce((m, e) => e.caseCount > m ? e.caseCount : m, 0)
    : 0;

  return {
    version: DFG_SCHEMA_VERSION,
    nodes: sortedFilteredNodes,
    edges: filteredEdges,
    totalRuns: dfg.totalRuns,
    maxEdgeFrequency: newMaxEdgeFrequency,
    maxNodeFrequency: newMaxNodeFrequency,
  };
}
