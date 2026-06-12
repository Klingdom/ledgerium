/**
 * Variant Flow Model — Build a NormalizedViewModel from variant intelligence.
 *
 * Converts the output of `analyzeWorkflowVariants` (PortfolioIntelligence) into
 * a flow-canvas graph: standard path as a straight spine of task nodes, decision
 * diamonds at divergence points, branch steps as parallel lanes that peel off and
 * rejoin, start/end terminals, and frequency-weighted edges.
 *
 * HARD REQUIREMENTS:
 *  - Deterministic: same input → byte-identical positions → hydration-safe.
 *    No Date.now(), Math.random(), or unstable sorts.
 *  - Honest: decisionLabel NEVER contains a fabricated business condition.
 *    Labels use observed-count language only ("3 of 16 runs took an alternate
 *    path here"). Real step titles from the representative run are used when
 *    available; only falls back to humanized category when titles are absent.
 *  - All edges flow forward (no leftward arrows). Head/tail divergence edge
 *    omission per LAYOUT_PLAN §3a/§5 Phase 4.
 *  - Plan B deterministic layered layout: layer = backbone index, within-layer
 *    lane by greedy interval coloring in frequency order. No ELK needed here.
 *
 * Pure function — no async, no DB calls, no side effects.
 */

import { analyzeDivergence, type DivergenceRun } from '@ledgerium/intelligence-engine';
import { CATEGORY_STYLES, NODE_TYPE_STYLES, LAYOUT } from '../components/workflow-view/constants';
import type {
  NormalizedViewModel,
  ViewNode,
  ViewEdge,
  ViewVariantPath,
} from '../components/workflow-view/adapters/viewModel';

// ─── Layout constants (Plan B — integer-layer arithmetic) ─────────────────────

const LAYER_W = 320;   // horizontal pitch: node width 260 + gap 60
const LANE_H  = 160;   // vertical pitch per lane below spine
const NODE_H  = 80;    // approximate node height for bounding-box purposes
const SPINE_Y = 0;     // spine sits at y = 0

// ─── Public input types ───────────────────────────────────────────────────────

/**
 * A single variant with its representative step titles (labels).
 * `stepCategories` and `stepTitles` are parallel arrays; either may be shorter
 * than the other if data is sparse — the adapter pads with category fallbacks.
 */
export interface VariantInput {
  /** Unique identifier — e.g. "variant-1" from PortfolioIntelligence. */
  id: string;
  /** Whether this is the standard (most frequent) path. */
  isStandard: boolean;
  /** Number of runs following this path. */
  runCount: number;
  /** Fraction of total runs following this path (0–1). */
  frequency: number;
  /** Ordered step categories (GroupingReason values). */
  stepCategories: string[];
  /**
   * Human-readable step titles for each category position (may be empty or
   * shorter than stepCategories — adapter uses categoryLabel fallback).
   * MUST come from real recorded step data; NEVER fabricated.
   */
  stepTitles?: string[] | undefined;
  /** Source run IDs (the evidence link). */
  evidenceRunIds?: string[] | undefined;
  /** Per-step duration in milliseconds (parallel to stepCategories). */
  stepDurationsMs?: number[] | undefined;
}

export interface VariantFlowModelInput {
  variants: VariantInput[];
  totalRuns: number;
}

// ─── Output ───────────────────────────────────────────────────────────────────

/**
 * Build a NormalizedViewModel representing the variant process map.
 * Returns null when there is insufficient data (< 2 variants or empty paths).
 */
export function buildVariantFlowModel(
  input: VariantFlowModelInput,
): NormalizedViewModel | null {
  const { variants, totalRuns } = input;

  // Must have at least 2 variants with steps
  const withSteps = variants.filter((v) => v.stepCategories.length > 0);
  if (withSteps.length < 2) return null;

  // Standard = isStandard flag, or first (highest-frequency)
  const standard = withSteps.find((v) => v.isStandard) ?? withSteps[0]!;
  const backbone = standard.stepCategories;
  if (backbone.length === 0) return null;

  const safeTotal = totalRuns > 0 ? totalRuns : withSteps.reduce((s, v) => s + v.runCount, 0) || 1;

  // ── Run divergence analysis ───────────────────────────────────────────────

  const runs: DivergenceRun[] = withSteps.map((v) => ({
    id: v.id,
    steps: v.stepCategories,
  }));
  const analysis = analyzeDivergence(backbone, runs);

  const runCountById = new Map(withSteps.map((v) => [v.id, v.runCount]));
  const evidenceById = new Map(withSteps.map((v) => [v.id, v.evidenceRunIds ?? []]));

  // Rank branches by run-weighted frequency (deterministic tie-break)
  const ranked = analysis.branches
    .map((b) => {
      const weight = b.evidenceRunIds.reduce((s, id) => s + (runCountById.get(id) ?? 0), 0);
      const runShare = safeTotal > 0 ? weight / safeTotal : 0;
      const runIds = [...new Set(b.evidenceRunIds.flatMap((id) => evidenceById.get(id) ?? []))].sort();
      return { b, weight, runShare, runIds };
    })
    .sort(
      (x, y) =>
        y.weight - x.weight ||
        x.b.divergeAfterIndex - y.b.divergeAfterIndex ||
        x.b.reconvergeAtIndex - y.b.reconvergeAtIndex ||
        (x.b.altSteps.join('>') < y.b.altSteps.join('>') ? -1 :
         x.b.altSteps.join('>') > y.b.altSteps.join('>') ? 1 : 0),
    );

  // ── Plan B deterministic layered layout ──────────────────────────────────
  //
  // Phase 1: layer assignment
  //   Backbone node bb-i → layer i
  //   Branch k of a branch with [divergeAfterIndex, reconvergeAtIndex] →
  //     layer = clamp(divergeAfterIndex + 1 + k, 0, backbone.length - 1)
  //     for interior; head/tail use fractional layers handled below.
  //
  // Phase 2: interval-graph greedy lane coloring (frequency order)
  //   Two branches whose [minLayer, maxLayer] overlap get different lanes.
  //
  // Phase 3: x = layer * LAYER_W; y = lane * LANE_H
  //
  // Phase 4: edge sourcing — no backward arrows
  //   head divergence (divergeAfterIndex === -1): omit spine entry edge; only
  //     intra-branch + rejoin(lastBranch → bb[reconvergeAtIndex])
  //   tail divergence (reconvergeAtIndex === backbone.length): omit rejoin;
  //     only entry(bb[len-1] → firstBranch) + intra-branch

  interface BranchLayout {
    branchIndex: number;  // index into ranked[]
    lane: number;
    minCol: number;
    maxCol: number;
    nodes: Array<{ nodeId: string; col: number }>;
    runShare: number;
    runCount: number;
    runIds: string[];
    divergeAfterIndex: number;
    reconvergeAtIndex: number;
    altSteps: string[];
  }

  // ── Backbone column positions ─────────────────────────────────────────────
  //
  // Space backbone nodes so every branch has its OWN columns for its alt steps —
  // this is what prevents the multi-step-branch overlap. For each backbone index
  // i, bbCol[i] is at least one past the previous AND far enough past any branch's
  // diverge column to fit that branch's alt steps:
  //   bbCol[i] = max( bbCol[i-1]+1, max over branches reconverging at i of
  //                   bbCol[divergeAfterIndex] + 1 + altCount )
  const bbCol: number[] = new Array(backbone.length).fill(0);
  for (let i = 1; i < backbone.length; i++) {
    let col = bbCol[i - 1]! + 1;
    for (const { b } of ranked) {
      if (b.divergeAfterIndex >= 0 && b.reconvergeAtIndex === i && b.altSteps.length > 0) {
        col = Math.max(col, bbCol[b.divergeAfterIndex]! + 1 + b.altSteps.length);
      }
    }
    bbCol[i] = col;
  }

  const branchLayouts: BranchLayout[] = [];

  ranked.forEach(({ b, runShare, runIds }, branchIndex) => {
    const s = b.divergeAfterIndex;    // -1 = head divergence
    const e = b.reconvergeAtIndex;    // backbone.length = tail divergence
    const alts = b.altSteps;
    const branchWeight = b.evidenceRunIds.reduce((sum, id) => sum + (runCountById.get(id) ?? 0), 0);

    // Anchor column for this branch's first alt step. Each alt step gets its OWN
    // column (anchor + k) so steps within a branch never collide. Head divergence
    // uses virtual negative columns; a global shift below makes everything ≥ 0.
    const anchorCol =
      s === -1 ? -alts.length
      : e === backbone.length ? bbCol[backbone.length - 1]! + 1
      : bbCol[s]! + 1;

    const branchNodes: Array<{ nodeId: string; col: number }> = [];
    for (let k = 0; k < alts.length; k++) {
      branchNodes.push({ nodeId: `vfm-br-${branchIndex}-${k}`, col: anchorCol + k });
    }

    // Horizontal span the branch covers (diverge anchor → reconverge), for lane packing.
    const spanLo = s === -1 ? anchorCol : bbCol[Math.max(0, s)]!;
    const spanHi = e === backbone.length
      ? (branchNodes.length ? branchNodes[branchNodes.length - 1]!.col : anchorCol)
      : bbCol[Math.min(backbone.length - 1, e)]!;
    const cols = branchNodes.map((n) => n.col);
    const minCol = Math.min(spanLo, spanHi, ...cols);
    const maxCol = Math.max(spanLo, spanHi, ...cols);

    branchLayouts.push({
      branchIndex, lane: 0, minCol, maxCol, nodes: branchNodes,
      runShare, runCount: branchWeight, runIds,
      divergeAfterIndex: s, reconvergeAtIndex: e, altSteps: alts,
    });
  });

  // Greedy interval lane coloring over column spans (deterministic ranked order).
  // Nodeless shortcuts don't consume a lane (they draw a skip edge only).
  const laneEndCol: number[] = [];
  for (const bl of branchLayouts) {
    if (bl.nodes.length === 0) continue;
    let lane = -1;
    for (let l = 0; l < laneEndCol.length; l++) {
      if (bl.minCol > (laneEndCol[l] ?? -Infinity)) { lane = l; laneEndCol[l] = bl.maxCol; break; }
    }
    if (lane === -1) { lane = laneEndCol.length; laneEndCol.push(bl.maxCol); }
    bl.lane = lane;
  }

  // Global shift so every column is ≥ 0 (head divergence uses negative columns).
  let minColAll = 0;
  for (const bl of branchLayouts) for (const n of bl.nodes) minColAll = Math.min(minColAll, n.col);
  const colShift = -minColAll;
  if (colShift !== 0) {
    for (let i = 0; i < bbCol.length; i++) bbCol[i] = bbCol[i]! + colShift;
    for (const bl of branchLayouts) {
      bl.minCol += colShift;
      bl.maxCol += colShift;
      for (const n of bl.nodes) n.col += colShift;
    }
  }

  const maxCol = Math.max(
    bbCol[backbone.length - 1] ?? 0,
    ...branchLayouts.flatMap((bl) => bl.nodes.map((n) => n.col)),
    0,
  );

  // ── Find which backbone positions are decision points ─────────────────────
  //
  // Count affected runs per backbone index first; a position is a decision point
  // ONLY when ≥1 run actually diverged there (prevents a "0 of N" phantom diamond).
  const decisionRunCounts = new Map<number, number>();
  for (const bl of branchLayouts) {
    if (bl.divergeAfterIndex >= 0 && bl.divergeAfterIndex < backbone.length && bl.runCount > 0) {
      const prev = decisionRunCounts.get(bl.divergeAfterIndex) ?? 0;
      decisionRunCounts.set(bl.divergeAfterIndex, prev + bl.runCount);
    }
  }
  const decisionBackboneIndices = new Set<number>(
    [...decisionRunCounts.entries()].filter(([, c]) => c > 0).map(([i]) => i),
  );

  // ── Build ViewNodes ───────────────────────────────────────────────────────

  const nodes: ViewNode[] = [];
  const edges: ViewEdge[] = [];

  // Helper: get category style with default
  function catStyle(cat: string) {
    return CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
  }

  // Helper: real label from variant input — never fabricate
  function stepLabel(variant: VariantInput, stepIndex: number): string {
    const title = variant.stepTitles?.[stepIndex];
    if (title && title.trim().length > 2) return title.trim();
    const cat = variant.stepCategories[stepIndex] ?? 'single_action';
    return catStyle(cat).label;
  }

  // Helper: duration label
  function durLabel(ms: number): string {
    if (ms <= 0) return '';
    if (ms < 1000) return `< 1s`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  // Helper: honest decision label — observed-count language only
  function decisionLabel(divergeAfterIndex: number, affectedRunCount: number): string {
    const pct = safeTotal > 0 ? Math.round((affectedRunCount / safeTotal) * 100) : 0;
    return `${affectedRunCount} of ${safeTotal} run${safeTotal !== 1 ? 's' : ''} took an alternate path here (${pct}%)`;
  }

  // ── START terminal ─────────────────────────────────────────────────────────

  const startX = -LAYER_W;
  nodes.push(makeTerminalNode('vfm-start', 'start', 'Start', startX, SPINE_Y));

  // ── BACKBONE nodes ─────────────────────────────────────────────────────────

  for (let i = 0; i < backbone.length; i++) {
    const cat = backbone[i]!;
    const style = catStyle(cat);
    const isDecision = decisionBackboneIndices.has(i);
    const label = stepLabel(standard, i);
    const dur = standard.stepDurationsMs?.[i] ?? 0;
    const x = bbCol[i]! * LAYER_W;
    const y = SPINE_Y;

    const id = `vfm-bb-${i}`;
    const dLabel = isDecision
      ? decisionLabel(i, decisionRunCounts.get(i) ?? 0)
      : '';

    nodes.push({
      id,
      stepId: `bb-step-${i}`,
      ordinal: i + 1,
      label,
      shortLabel: label.length > 32 ? label.slice(0, 31) + '…' : label,
      nodeType: isDecision ? 'decision' : 'task',
      category: cat,
      categoryLabel: style.label,
      position: { x, y },
      phaseId: null,
      system: '',
      systems: [],
      pageTitle: '',
      routeTemplate: '',
      dominantAction: '',
      durationMs: dur,
      durationLabel: durLabel(dur),
      eventCount: 1,
      humanEventCount: 1,
      confidence: 0.9,
      isDecisionPoint: isDecision,
      decisionLabel: dLabel,
      isExceptionPath: false,
      hasSensitiveData: false,
      isLowConfidence: false,
      frictionIndicators: [],
      hasHighFriction: false,
      accentColor: isDecision ? NODE_TYPE_STYLES.decision.color : style.color,
      bgColor: isDecision ? NODE_TYPE_STYLES.decision.bg : style.bg,
      bgHoverColor: isDecision ? '#fef3c7' : style.bgHover,
      textColor: isDecision ? '#92400e' : style.text,
      operationalDefinition: '',
      procedure: '',
      expectedOutcome: '',
      warnings: [],
      automationScore: null,
      frequency: 1,
      decisionProvenance: isDecision ? 'observed-divergence' : null,
    });
  }

  // ── BRANCH nodes ──────────────────────────────────────────────────────────

  for (const bl of branchLayouts) {
    if (bl.altSteps.length === 0) continue; // shortcut — no nodes

    // Find the matching VariantInput to get real step titles for the branch
    // We match by the branch's evidenceRunIds → variant id
    const branchVariantId = ranked[bl.branchIndex]?.b.evidenceRunIds[0];
    const branchVariant = branchVariantId ? withSteps.find((v) => v.id === branchVariantId) : undefined;

    for (const { nodeId, col } of bl.nodes) {
      // Index within branch nodes for this branchLayout
      const k = bl.nodes.findIndex((n) => n.nodeId === nodeId);
      const cat = bl.altSteps[k] ?? 'single_action';
      const style = catStyle(cat);
      const x = col * LAYER_W;
      const y = (bl.lane + 1) * LANE_H;

      // Map the branch step index back into the variant's full step sequence
      // The branch steps start after divergeAfterIndex + 1 in the variant
      const variantStepIndex = bl.divergeAfterIndex >= 0 ? bl.divergeAfterIndex + 1 + k : k;
      const label = branchVariant ? stepLabel(branchVariant, variantStepIndex) : style.label;
      const dur = branchVariant?.stepDurationsMs?.[variantStepIndex] ?? 0;

      nodes.push({
        id: nodeId,
        stepId: `br-step-${bl.branchIndex}-${k}`,
        ordinal: bl.divergeAfterIndex + 2 + k,
        label,
        shortLabel: label.length > 32 ? label.slice(0, 31) + '…' : label,
        nodeType: 'task',
        category: cat,
        categoryLabel: style.label,
        position: { x, y },
        phaseId: null,
        system: '',
        systems: [],
        pageTitle: '',
        routeTemplate: '',
        dominantAction: '',
        durationMs: dur,
        durationLabel: durLabel(dur),
        eventCount: 1,
        humanEventCount: 1,
        confidence: 0.85,
        isDecisionPoint: false,
        decisionLabel: '',
        isExceptionPath: cat === 'error_handling',
        hasSensitiveData: false,
        isLowConfidence: false,
        frictionIndicators: [],
        hasHighFriction: false,
        accentColor: style.color,
        bgColor: style.bg,
        bgHoverColor: style.bgHover,
        textColor: style.text,
        operationalDefinition: '',
        procedure: '',
        expectedOutcome: '',
        warnings: [],
        automationScore: null,
        frequency: bl.runShare,
        decisionProvenance: null,
      });
    }
  }

  // ── END terminal ──────────────────────────────────────────────────────────

  const endX = maxCol * LAYER_W + LAYER_W;
  nodes.push(makeTerminalNode('vfm-end', 'end', 'End', endX, SPINE_Y));

  // ── EDGES ─────────────────────────────────────────────────────────────────

  // Spine edges: start → bb-0 → bb-1 → ... → bb-(len-1) → end
  // (frequency = 1 = full backbone run share)
  edges.push(makeEdge('vfm-e-start-bb0', 'vfm-start', 'vfm-bb-0', 'sequence',
    '', 1, 2.5, false));

  for (let i = 0; i < backbone.length - 1; i++) {
    const spineShare = 1; // spine always 100%
    edges.push(makeEdge(`vfm-e-spine-${i}`, `vfm-bb-${i}`, `vfm-bb-${i + 1}`,
      'sequence', '', spineShare, strokeForShare(spineShare), false));
  }

  edges.push(makeEdge('vfm-e-bb-end', `vfm-bb-${backbone.length - 1}`, 'vfm-end',
    'sequence', '', 1, 2.5, false));

  // Branch edges per branch layout
  for (const bl of branchLayouts) {
    const s = bl.divergeAfterIndex;
    const e = bl.reconvergeAtIndex;
    const nodeIds = bl.nodes.map((n) => n.nodeId);
    const sw = strokeForShare(bl.runShare);
    const pct = Math.round(bl.runShare * 100);
    const edgeLabel = `${bl.runCount} run${bl.runCount !== 1 ? 's' : ''} · ${pct}%`;

    if (bl.altSteps.length === 0) {
      // SHORTCUT: edge from bb-s to bb-e (skip the steps between)
      // Clamp to valid indices and ensure forward direction
      const srcId = s >= 0 ? `vfm-bb-${s}` : 'vfm-start';
      const tgtId = e < backbone.length ? `vfm-bb-${e}` : 'vfm-end';
      // Only emit if source layer < target layer (forward-only guarantee)
      if (s < e) {
        edges.push(makeEdge(`vfm-e-shortcut-${bl.branchIndex}`, srcId, tgtId,
          'decision', edgeLabel, bl.runShare, 1.5, true));
      }
      continue;
    }

    // HEAD DIVERGENCE (s === -1): omit spine-sourced entry edge.
    // Only emit intra-branch + rejoin.
    if (s === -1) {
      // Intra-branch edges
      for (let k = 0; k < nodeIds.length - 1; k++) {
        edges.push(makeEdge(`vfm-e-br-${bl.branchIndex}-${k}`, nodeIds[k]!, nodeIds[k + 1]!,
          'decision', '', bl.runShare, sw, false));
      }
      // Rejoin to bb-e (only if reconverge is a valid backbone index)
      const tgtId = e < backbone.length ? `vfm-bb-${e}` : 'vfm-end';
      edges.push(makeEdge(`vfm-e-rejoin-${bl.branchIndex}`, nodeIds[nodeIds.length - 1]!, tgtId,
        'decision', edgeLabel, bl.runShare, sw, false));
      continue;
    }

    // TAIL DIVERGENCE (e === backbone.length): omit rejoin edge.
    if (e === backbone.length) {
      // Entry from bb-(len-1)
      edges.push(makeEdge(`vfm-e-entry-${bl.branchIndex}`,
        `vfm-bb-${backbone.length - 1}`, nodeIds[0]!,
        'decision', edgeLabel, bl.runShare, sw, false));
      // Intra-branch
      for (let k = 0; k < nodeIds.length - 1; k++) {
        edges.push(makeEdge(`vfm-e-br-${bl.branchIndex}-${k}`, nodeIds[k]!, nodeIds[k + 1]!,
          'decision', '', bl.runShare, sw, false));
      }
      // No rejoin — tail branches dead-end
      continue;
    }

    // INTERIOR: entry + intra-branch + rejoin
    edges.push(makeEdge(`vfm-e-entry-${bl.branchIndex}`,
      `vfm-bb-${s}`, nodeIds[0]!,
      'decision', edgeLabel, bl.runShare, sw, false));
    for (let k = 0; k < nodeIds.length - 1; k++) {
      edges.push(makeEdge(`vfm-e-br-${bl.branchIndex}-${k}`, nodeIds[k]!, nodeIds[k + 1]!,
        'decision', '', bl.runShare, sw, false));
    }
    edges.push(makeEdge(`vfm-e-rejoin-${bl.branchIndex}`, nodeIds[nodeIds.length - 1]!,
      `vfm-bb-${e}`, 'decision', `rejoins`, bl.runShare, sw, false));
  }

  // ── Validate: every edge flows forward (x-source <= x-target) ────────────
  // Build position map for fast lookup
  const posById = new Map(nodes.map((n) => [n.id, n.position]));
  const validEdges = edges.filter((e) => {
    const sx = posById.get(e.sourceId)?.x ?? 0;
    const tx = posById.get(e.targetId)?.x ?? 0;
    return tx >= sx; // drop any residual backward edges
  });

  // ── ViewVariantPath array ─────────────────────────────────────────────────

  const variantPaths: ViewVariantPath[] = withSteps.map((v) => ({
    id: v.id,
    label: v.isStandard ? 'Standard Path'
      : v.stepCategories.some((c) => c === 'error_handling') ? 'Exception Path'
      : `Variant (${Math.round(v.frequency * 100)}%)`,
    isStandard: v.isStandard,
    frequency: v.frequency,
    runCount: v.runCount,
    avgDurationMs: v.stepDurationsMs
      ? v.stepDurationsMs.reduce((s, d) => s + d, 0) || null
      : null,
    stepCategories: v.stepCategories,
    divergencePoints: [],
    evidenceRunIds: v.evidenceRunIds ?? [],
  }));

  // ── Aggregate metrics ─────────────────────────────────────────────────────

  const taskNodes = nodes.filter((n) => n.nodeType !== 'start' && n.nodeType !== 'end');
  const totalDur = taskNodes.reduce((s, n) => s + n.durationMs, 0);

  return {
    nodes,
    edges: validEdges,
    phases: [],
    systems: [],
    systemEdges: [],
    variants: variantPaths,
    totalDurationMs: totalDur,
    totalSteps: taskNodes.length,
    totalEvents: taskNodes.reduce((s, n) => s + n.eventCount, 0),
    totalSystems: 0,
    totalHandoffs: 0,
    totalFriction: 0,
    avgConfidence: taskNodes.length > 0
      ? taskNodes.reduce((s, n) => s + n.confidence, 0) / taskNodes.length
      : 0,
    hasDecisions: nodes.some((n) => n.isDecisionPoint),
    hasExceptions: nodes.some((n) => n.isExceptionPath),
    hasFriction: false,
    hasMultipleSystems: false,
    isComplete: true,

    // Multi-run provenance: variant model always represents ≥2 runs.
    runCount: safeTotal,
    isMultiRun: true,
    provenanceNotice: '',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTerminalNode(
  id: string,
  type: 'start' | 'end',
  label: string,
  x: number,
  y: number,
): ViewNode {
  const style = NODE_TYPE_STYLES[type];
  return {
    id,
    stepId: '',
    ordinal: type === 'start' ? 0 : 999,
    label,
    shortLabel: label,
    nodeType: type,
    category: 'single_action',
    categoryLabel: style.label,
    position: { x, y },
    phaseId: null,
    system: '',
    systems: [],
    pageTitle: '',
    routeTemplate: '',
    dominantAction: '',
    durationMs: 0,
    durationLabel: '',
    eventCount: 0,
    humanEventCount: 0,
    confidence: 1,
    isDecisionPoint: false,
    decisionLabel: '',
    isExceptionPath: false,
    hasSensitiveData: false,
    isLowConfidence: false,
    frictionIndicators: [],
    hasHighFriction: false,
    accentColor: style.color,
    bgColor: style.bg,
    bgHoverColor: style.bg,
    textColor: style.color,
    operationalDefinition: '',
    procedure: '',
    expectedOutcome: '',
    warnings: [],
    automationScore: null,
    frequency: 1,
    decisionProvenance: null,
  };
}

function makeEdge(
  id: string,
  sourceId: string,
  targetId: string,
  type: 'sequence' | 'decision' | 'exception',
  label: string,
  runShare: number,
  strokeWidth: number,
  isDashed: boolean,
): ViewEdge {
  const strokeColor =
    type === 'exception' ? '#fca5a5'
    : type === 'decision' ? '#d97706'
    : '#9ca3af';
  return {
    id,
    sourceId,
    targetId,
    type,
    label,
    boundaryReason: '',
    isExceptionPath: type === 'exception',
    strokeColor,
    strokeWidth,
    isDashed,
  };
}

function strokeForShare(share: number): number {
  if (share >= 0.8) return 2.5;
  if (share >= 0.4) return 2.0;
  if (share >= 0.15) return 1.5;
  return 1.0;
}

// ─── Adapter: PortfolioIntelligence → VariantFlowModelInput ──────────────────

/**
 * Convert the PortfolioIntelligence returned by `analyzeWorkflowVariants` into
 * the minimal VariantFlowModelInput needed by `buildVariantFlowModel`.
 *
 * Step titles and durations are NOT available in PortfolioIntelligence (which
 * carries only categories). Pass them separately via the `stepTitlesByVariant`
 * map (keyed by variantId) when available.
 */
export function portfolioIntelligenceToVariantInput(
  intelligence: {
    variants?: {
      variants?: Array<{
        variantId?: string;
        isStandardPath?: boolean;
        frequency?: number;
        runCount?: number;
        pathSignature?: { stepCategories?: string[] };
        evidenceRunIds?: string[];
      }>;
      runCount?: number;
    };
    metrics?: { runCount?: number };
  } | null | undefined,
  stepTitlesByVariant?: Map<string, string[]>,
  stepDurationsByVariant?: Map<string, number[]>,
): VariantFlowModelInput {
  if (!intelligence?.variants?.variants?.length) {
    return { variants: [], totalRuns: 0 };
  }

  const rawVariants = intelligence.variants.variants;
  const totalRuns = intelligence.variants.runCount
    ?? intelligence.metrics?.runCount
    ?? rawVariants.reduce((s, v) => s + (v.runCount ?? 0), 0);

  const variants: VariantInput[] = rawVariants.map((v, i) => {
    const id = v.variantId ?? `variant-${i + 1}`;
    const item: VariantInput = {
      id,
      isStandard: v.isStandardPath === true,
      runCount: v.runCount ?? 0,
      frequency: v.frequency ?? 0,
      stepCategories: v.pathSignature?.stepCategories ?? [],
      evidenceRunIds: Array.isArray(v.evidenceRunIds) ? v.evidenceRunIds : [],
    };
    const titles = stepTitlesByVariant?.get(id);
    if (titles !== undefined) item.stepTitles = titles;
    const durs = stepDurationsByVariant?.get(id);
    if (durs !== undefined) item.stepDurationsMs = durs;
    return item;
  });

  return { variants, totalRuns };
}
