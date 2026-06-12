/**
 * ShapeResolver — the single honesty chokepoint for process-map shapes (P0-2).
 *
 * Maps ViewNode → VisioShape (and the React Flow nodeType) via a total, pure,
 * deterministic truth table. This is the ONLY place that decides whether a node
 * renders as a diamond.
 *
 * Hard rule: a diamond may only come from an observed source.
 *  'observed-divergence'  → solid 'decision' diamond  (multi-run divergence)
 *  'observed-validation'  → dashed 'decision-validation' diamond  (single-run submit→error)
 *  'inferred' / null      → 'process' box (NEVER a diamond — this is the chokepoint)
 *
 * No Date.now(), Math.random(), or DOM access. Pure function.
 *
 * Reference: ARCH_FINAL_PLAN §1.2–§1.3, PROCESS_MAPPING_MASTER_PLAN §2.
 */

import type { ViewNode } from './viewModel';

// ─── Output types ─────────────────────────────────────────────────────────────

/**
 * Canonical Visio shape vocabulary for P0.
 * 'terminal'           — start/end pill (React Flow: terminalNode)
 * 'process'            — task rectangle (React Flow: taskNode)
 * 'decision'           — solid diamond; observed-divergence only (React Flow: decisionNode)
 * 'decision-validation'— dashed diamond; observed-validation only (React Flow: decisionNode,
 *                        dashed styling applied by WorkflowDecisionNode)
 */
export type VisioShape = 'terminal' | 'process' | 'decision' | 'decision-validation';

/** The React Flow registered node-type key. */
export type RFNodeType = 'taskNode' | 'decisionNode' | 'terminalNode';

/** Resolved shape descriptor — one per ViewNode. */
export interface ShapeSpec {
  /** Canonical Visio shape. */
  shape: VisioShape;
  /** React Flow registered node-type key. */
  rfType: RFNodeType;
}

// ─── Truth table ──────────────────────────────────────────────────────────────

/**
 * Total, deterministic truth table over all ViewNodeType × decisionProvenance.
 *
 * | nodeType          | decisionProvenance         | → shape              | rfType        |
 * |-------------------|---------------------------|----------------------|---------------|
 * | start / end       | (any)                     | terminal             | terminalNode  |
 * | decision          | 'observed-divergence'      | decision             | decisionNode  |
 * | decision          | 'observed-validation'      | decision-validation  | decisionNode  |
 * | decision          | 'inferred' / null          | process (DEMOTED)    | taskNode      |
 * | task / exception  | (any)                     | process              | taskNode      |
 *
 * The 'inferred' → 'process' row is the chokepoint: a fabricated or heuristic-only
 * decision can NEVER render as a diamond through this function.
 */
export function resolveShape(node: ViewNode): ShapeSpec {
  const { nodeType, decisionProvenance } = node;

  // Terminal nodes (start / end)
  if (nodeType === 'start' || nodeType === 'end') {
    return { shape: 'terminal', rfType: 'terminalNode' };
  }

  // Decision nodes — provenance determines shape
  if (nodeType === 'decision') {
    if (decisionProvenance === 'observed-divergence') {
      return { shape: 'decision', rfType: 'decisionNode' };
    }
    if (decisionProvenance === 'observed-validation') {
      return { shape: 'decision-validation', rfType: 'decisionNode' };
    }
    // 'inferred' or null → demote to process box (CHOKEPOINT: no diamond)
    return { shape: 'process', rfType: 'taskNode' };
  }

  // task / exception → process box
  return { shape: 'process', rfType: 'taskNode' };
}
