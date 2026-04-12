/**
 * Process Variants Map Adapter
 *
 * Converts NormalizedViewModel + optional intelligence data into a
 * path comparison view. When variant data is available (from the
 * intelligence engine's PortfolioIntelligence), shows multiple paths
 * with divergence highlighting. Falls back to single-path display.
 */

import type { NormalizedViewModel, ViewNode, ViewVariantPath } from './viewModel';

// ─── Output types ────────────────────────────────────────────────────────────

export interface VariantFlowNode {
  id: string;
  type: 'variantStepNode';
  position: { x: number; y: number };
  data: {
    viewNode: ViewNode;
    /** Which variant paths include this node. */
    pathIds: string[];
    /** Whether this node is a divergence point. */
    isDivergencePoint: boolean;
    /** Opacity: 1.0 for standard path, 0.6 for variant-only. */
    opacity: number;
  };
}

export interface VariantAdapterOutput {
  /** Nodes with variant overlay data. */
  nodes: VariantFlowNode[];
  /** Standard edges from the flow (reused). */
  edges: Array<{ id: string; source: string; target: string; type: string; data: any }>;
  /** Variant path cards for the sidebar/panel. */
  paths: ViewVariantPath[];
  /** Whether variant data is available. */
  hasVariantData: boolean;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * Build variant comparison data.
 *
 * @param model - The normalized view model
 * @param intelligence - Optional intelligence JSON from the process definition
 *   (contains `variants.variants[]` with path signatures and frequencies)
 */
export function buildVariantData(
  model: NormalizedViewModel,
  intelligence?: any,
): VariantAdapterOutput {
  const variants = model.variants.length > 0
    ? model.variants
    : extractVariantsFromIntelligence(intelligence);

  const hasVariantData = variants.length > 1;

  // For single-path (no variant data), all nodes get full opacity
  // and no divergence highlighting.
  const nodes: VariantFlowNode[] = model.nodes.map(viewNode => ({
    id: viewNode.id,
    type: 'variantStepNode' as const,
    position: viewNode.position,
    data: {
      viewNode,
      pathIds: hasVariantData ? ['standard'] : ['default'],
      isDivergencePoint: false,
      opacity: 1.0,
    },
  }));

  // Reuse the standard edges
  const edges = model.edges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    type: 'workflowEdge',
    data: { viewEdge: e },
  }));

  return { nodes, edges, paths: variants, hasVariantData };
}

// ─── Intelligence extraction ─────────────────────────────────────────────────

function extractVariantsFromIntelligence(intelligence: any): ViewVariantPath[] {
  if (!intelligence?.variants?.variants) return [];

  const rawVariants: any[] = intelligence.variants.variants;
  return rawVariants.map((v: any, i: number) => ({
    id: v.variantId ?? `variant-${i + 1}`,
    label: v.isStandardPath ? 'Standard Path' : `Variant ${i + 1}`,
    isStandard: v.isStandardPath === true,
    frequency: v.frequency ?? 0,
    runCount: v.runCount ?? 0,
    avgDurationMs: null,
    stepCategories: v.pathSignature?.stepCategories ?? [],
    divergencePoints: [],
  }));
}
