/**
 * Path E — Graph Topology Validation (iter 076 / PATHE-P01)
 *
 * Pure validator that enforces structural invariants on a ProcessGraph:
 *
 *  Group C (topology):
 *   - Every edge `fromNodeId`/`toNodeId` references an existing node in the
 *     graph (referential integrity).
 *   - No orphan nodes (every node except `start` has ≥1 incoming edge; every
 *     node except `end` has ≥1 outgoing edge).
 *   - Every node with `nodeType ∈ DECISION_BEARING_NODE_TYPES` has exactly one
 *     DecisionPoint with matching `nodeId` (1:1 invariant).
 *   - At most one node of `nodeType: 'start'` and at most one of `'end'`.
 *
 *  Group B (audit-honesty IFF, replicated for graphs):
 *   - For every node / edge / condition: `isInferred === true IFF
 *     confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`.
 *
 *  Group D (variant invariants):
 *   - At most one `dominant_path` variant per graph.
 *
 * **Pure module**: zero I/O, deterministic output, never throws.
 *
 * @see ../types/entities.ts
 * @see ../types/closed-unions.ts
 * @see ../catalog/node-types.ts (DECISION_BEARING_NODE_TYPES)
 */

import { DECISION_BEARING_NODE_TYPES } from '../catalog/node-types.js';
import { DOMINANT_VARIANT_LABEL } from '../catalog/variant-labels.js';
import { INFERRED_CONFIDENCE_THRESHOLD } from '../types/closed-unions.js';
import type { ProcessGraph } from '../types/entities.js';

// ── Result types ─────────────────────────────────────────────────────────────

/**
 * Single topology violation report. `code` is a stable machine-readable
 * identifier; `message` is a developer-facing human-readable string.
 */
export interface TopologyViolation {
  readonly code:
    | 'edge_references_unknown_node'
    | 'orphan_node_no_incoming'
    | 'orphan_node_no_outgoing'
    | 'multiple_start_nodes'
    | 'multiple_end_nodes'
    | 'decision_bearing_node_missing_decision_point'
    | 'decision_point_references_unknown_node'
    | 'decision_point_references_non_branching_node'
    | 'audit_honesty_iff_violation_node'
    | 'audit_honesty_iff_violation_edge'
    | 'audit_honesty_iff_violation_condition'
    | 'multiple_dominant_path_variants';
  readonly message: string;
  readonly entityId: string | null;
}

/** Result of `validateGraphTopology`. */
export interface TopologyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly TopologyViolation[];
}

// ── validateGraphTopology ────────────────────────────────────────────────────

/**
 * Run every topology + audit-honesty invariant against a ProcessGraph.
 *
 * Determinism: identical `graph` → byte-identical `TopologyValidationResult`.
 * Violations are emitted in a fixed order (referential → topology → audit-
 * honesty → variant) so test snapshots remain stable across runs.
 *
 * @param graph - The graph to validate.
 * @returns `{ ok: violations.length === 0, violations }`.
 */
export function validateGraphTopology(graph: ProcessGraph): TopologyValidationResult {
  const violations: TopologyViolation[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const decisionBearingNodeIds = new Set(
    graph.nodes.filter((n) => DECISION_BEARING_NODE_TYPES.has(n.nodeType)).map((n) => n.id),
  );

  // ── Edge referential integrity ───────────────────────────────────────────
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      violations.push({
        code: 'edge_references_unknown_node',
        message: `Edge ${edge.id} fromNodeId=${edge.fromNodeId} not found in nodes`,
        entityId: edge.id,
      });
    }
    if (!nodeIds.has(edge.toNodeId)) {
      violations.push({
        code: 'edge_references_unknown_node',
        message: `Edge ${edge.id} toNodeId=${edge.toNodeId} not found in nodes`,
        entityId: edge.id,
      });
    }
  }

  // ── Orphan-node detection ─────────────────────────────────────────────────
  // 'start' nodes legitimately have zero incoming edges; 'end' nodes have zero
  // outgoing. Any other node with zero on one side is an orphan.
  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  for (const edge of graph.edges) {
    outgoingCount.set(edge.fromNodeId, (outgoingCount.get(edge.fromNodeId) ?? 0) + 1);
    incomingCount.set(edge.toNodeId, (incomingCount.get(edge.toNodeId) ?? 0) + 1);
  }
  for (const node of graph.nodes) {
    // Orphan-incoming: any node that is NOT 'start' must have ≥1 incoming edge.
    if (node.nodeType !== 'start' && (incomingCount.get(node.id) ?? 0) === 0) {
      violations.push({
        code: 'orphan_node_no_incoming',
        message: `Node ${node.id} (${node.nodeType}) has zero incoming edges`,
        entityId: node.id,
      });
    }
    // Orphan-outgoing: any node that is NOT 'end' must have ≥1 outgoing edge.
    if (node.nodeType !== 'end' && (outgoingCount.get(node.id) ?? 0) === 0) {
      violations.push({
        code: 'orphan_node_no_outgoing',
        message: `Node ${node.id} (${node.nodeType}) has zero outgoing edges`,
        entityId: node.id,
      });
    }
  }

  // ── At-most-one start + at-most-one end ──────────────────────────────────
  const startCount = graph.nodes.filter((n) => n.nodeType === 'start').length;
  const endCount = graph.nodes.filter((n) => n.nodeType === 'end').length;
  if (startCount > 1) {
    violations.push({
      code: 'multiple_start_nodes',
      message: `Graph has ${startCount} start nodes (expected ≤1)`,
      entityId: null,
    });
  }
  if (endCount > 1) {
    violations.push({
      code: 'multiple_end_nodes',
      message: `Graph has ${endCount} end nodes (expected ≤1)`,
      entityId: null,
    });
  }

  // ── DecisionPoint 1:1 invariant ──────────────────────────────────────────
  const decisionPointNodeIds = new Set(graph.decisionPoints.map((dp) => dp.nodeId));

  for (const nodeId of decisionBearingNodeIds) {
    if (!decisionPointNodeIds.has(nodeId)) {
      violations.push({
        code: 'decision_bearing_node_missing_decision_point',
        message: `Node ${nodeId} is decision-bearing but has no corresponding DecisionPoint`,
        entityId: nodeId,
      });
    }
  }
  for (const dp of graph.decisionPoints) {
    if (!nodeIds.has(dp.nodeId)) {
      violations.push({
        code: 'decision_point_references_unknown_node',
        message: `DecisionPoint ${dp.id} references unknown nodeId=${dp.nodeId}`,
        entityId: dp.id,
      });
    } else if (!decisionBearingNodeIds.has(dp.nodeId)) {
      violations.push({
        code: 'decision_point_references_non_branching_node',
        message: `DecisionPoint ${dp.id} references non-branching node ${dp.nodeId}`,
        entityId: dp.id,
      });
    }
  }

  // ── Audit-honesty IFF (Group B) on nodes ─────────────────────────────────
  for (const node of graph.nodes) {
    const expectedInferred = node.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD;
    if (node.isInferred !== expectedInferred) {
      violations.push({
        code: 'audit_honesty_iff_violation_node',
        message: `Node ${node.id} isInferred=${node.isInferred} but confidence=${node.confidenceScore} (expected isInferred=${expectedInferred})`,
        entityId: node.id,
      });
    }
  }
  // On edges
  for (const edge of graph.edges) {
    const expectedInferred = edge.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD;
    if (edge.isInferred !== expectedInferred) {
      violations.push({
        code: 'audit_honesty_iff_violation_edge',
        message: `Edge ${edge.id} isInferred=${edge.isInferred} but confidence=${edge.confidenceScore} (expected isInferred=${expectedInferred})`,
        entityId: edge.id,
      });
    }
  }
  // On conditions (walk decisionPoints.conditions)
  for (const dp of graph.decisionPoints) {
    for (const cond of dp.conditions) {
      const expectedInferred = cond.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD;
      if (cond.isInferred !== expectedInferred) {
        violations.push({
          code: 'audit_honesty_iff_violation_condition',
          message: `Condition ${cond.id} isInferred=${cond.isInferred} but confidence=${cond.confidenceScore} (expected isInferred=${expectedInferred})`,
          entityId: cond.id,
        });
      }
    }
  }

  // ── At-most-one dominant_path variant ────────────────────────────────────
  const dominantCount = graph.variants.filter(
    (v) => v.variantLabel === DOMINANT_VARIANT_LABEL,
  ).length;
  if (dominantCount > 1) {
    violations.push({
      code: 'multiple_dominant_path_variants',
      message: `Graph has ${dominantCount} variants with variantLabel='${DOMINANT_VARIANT_LABEL}' (expected ≤1)`,
      entityId: null,
    });
  }

  return { ok: violations.length === 0, violations };
}
