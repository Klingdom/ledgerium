/**
 * Workflow View Model — Normalized Data Layer
 *
 * Transforms raw ProcessOutput into display-ready view models for all
 * three visualization modes. Components consume these normalized types
 * and never touch raw engine structures.
 *
 * Design principles:
 * - Every field is non-null with sensible defaults (no undefined leaks to UI)
 * - Labels are humanized conservatively (improve weak ones, never fabricate)
 * - Model supports flow, variants, and systems modes from one transformation
 * - Extensible: future AI overlays and compare mode add fields, not restructure
 */

import { CATEGORY_STYLES, NODE_TYPE_STYLES, confidenceColor } from '../constants';

// ─── Normalized node ─────────────────────────────────────────────────────────

export type ViewNodeType = 'start' | 'end' | 'task' | 'decision' | 'exception';

export interface ViewNode {
  /** Stable identifier (from engine ProcessMapNode.id). */
  id: string;
  /** Associated step definition ID (empty for start/end synthetic nodes). */
  stepId: string;
  /** 1-based ordinal position in the flow (0 for start, N+1 for end). */
  ordinal: number;
  /** Human-readable title — improved from raw engine title. */
  label: string;
  /** Short label for compact display (max ~30 chars). */
  shortLabel: string;
  /** Semantic node type. */
  nodeType: ViewNodeType;
  /** Step category (click_then_navigate, fill_and_submit, etc.). */
  category: string;
  /** Human-readable category label (Navigation, Form Submit, etc.). */
  categoryLabel: string;
  /** Deterministic layout position. */
  position: { x: number; y: number };
  /** Phase this node belongs to (null for start/end). */
  phaseId: string | null;
  /** System/application where this step executes. */
  system: string;
  /** All systems involved in this step. */
  systems: string[];
  /** Page title where the step occurred. */
  pageTitle: string;
  /** Route template for the page. */
  routeTemplate: string;
  /** Dominant user action type. */
  dominantAction: string;

  // ── Metrics (all guaranteed non-null) ──────────────────────────────────

  /** Duration in milliseconds (0 if unknown). */
  durationMs: number;
  /** Human-readable duration ("2m 30s", "< 1s"). */
  durationLabel: string;
  /** Total event count. */
  eventCount: number;
  /** Human-initiated event count. */
  humanEventCount: number;
  /** Step confidence 0-1. */
  confidence: number;

  // ── Flags ──────────────────────────────────────────────────────────────

  /** Whether this node is an inferred decision point. */
  isDecisionPoint: boolean;
  /** Decision question label (empty if not a decision point). */
  decisionLabel: string;
  /** Whether this step handles an error/exception. */
  isExceptionPath: boolean;
  /** Whether this step contains sensitive data. */
  hasSensitiveData: boolean;
  /** Whether this step has low confidence (< 0.7). */
  isLowConfidence: boolean;

  // ── Friction ───────────────────────────────────────────────────────────

  /** Friction indicators affecting this step. */
  frictionIndicators: ViewFriction[];
  /** Whether any high-severity friction exists on this node. */
  hasHighFriction: boolean;

  // ── Visual styling (pre-computed for canvas) ───────────────────────────

  /** Primary accent color (border, icon). */
  accentColor: string;
  /** Background color (light, for node fill). */
  bgColor: string;
  /** Hover/selected background. */
  bgHoverColor: string;
  /** Text color for labels. */
  textColor: string;

  // ── SOP integration ────────────────────────────────────────────────────

  /** Operational definition text (empty if unavailable). */
  operationalDefinition: string;
  /** SOP procedure text (empty if unavailable). */
  procedure: string;
  /** Expected outcome text (empty if unavailable). */
  expectedOutcome: string;
  /** Warnings from SOP. */
  warnings: string[];

  // ── Extensibility ──────────────────────────────────────────────────────

  /** Automation opportunity score (0-100, null if not computed). */
  automationScore: number | null;
  /** Frequency of this step across runs (0-1, null if single run). */
  frequency: number | null;
}

// ─── Normalized edge ─────────────────────────────────────────────────────────

export type ViewEdgeType = 'sequence' | 'exception' | 'decision';

export interface ViewEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: ViewEdgeType;
  /** Human-readable transition label. */
  label: string;
  /** Raw boundary reason from segmentation. */
  boundaryReason: string;
  /** Whether this is an exception/error path. */
  isExceptionPath: boolean;
  /** Pre-computed stroke color. */
  strokeColor: string;
  /** Pre-computed stroke width. */
  strokeWidth: number;
  /** Whether the edge should be dashed. */
  isDashed: boolean;
}

// ─── Normalized phase (swimlane group) ───────────────────────────────────────

export interface ViewPhase {
  id: string;
  /** Human-readable phase name. */
  label: string;
  /** System/application name. */
  system: string;
  /** Node IDs belonging to this phase (ordered). */
  nodeIds: string[];
  /** Number of steps in this phase. */
  stepCount: number;
  /** Total duration across all steps in this phase. */
  totalDurationMs: number;
  /** Total events across all steps. */
  totalEvents: number;
  /** Phase color (derived from first step's category or system). */
  color: string;
}

// ─── Normalized friction ─────────────────────────────────────────────────────

export interface ViewFriction {
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  affectedStepOrdinals: number[];
}

// ─── System interaction model (for systems map) ──────────────────────────────

export interface ViewSystem {
  /** System identifier (lowercase, normalized). */
  id: string;
  /** Display name. */
  label: string;
  /** Number of steps executing in this system. */
  stepCount: number;
  /** Total duration spent in this system. */
  totalDurationMs: number;
  /** Total human events in this system. */
  humanEventCount: number;
  /** Node IDs belonging to this system. */
  nodeIds: string[];
  /** Phase IDs associated with this system. */
  phaseIds: string[];
}

export interface ViewSystemEdge {
  /** "source-system→target-system" */
  id: string;
  sourceSystemId: string;
  targetSystemId: string;
  /** Human-readable label for the handoff. */
  label: string;
  /** How many times this handoff occurs. */
  count: number;
  /** Node IDs involved in the transition. */
  transitionNodeIds: string[];
}

// ─── Variant path model (for variants map) ───────────────────────────────────

export interface ViewVariantPath {
  id: string;
  label: string;
  /** Whether this is the standard/canonical path. */
  isStandard: boolean;
  /** Fraction of runs following this path (0-1). */
  frequency: number;
  /** Number of runs following this path. */
  runCount: number;
  /** Average duration for this path. */
  avgDurationMs: number | null;
  /** Ordered step categories for this path. */
  stepCategories: string[];
  /** Step ordinals where this path diverges from standard. */
  divergencePoints: number[];
}

// ─── Complete normalized view model ──────────────────────────────────────────

export interface NormalizedViewModel {
  // ── Core graph data (for flow map) ─────────────────────────────────────
  nodes: ViewNode[];
  edges: ViewEdge[];
  phases: ViewPhase[];

  // ── System interaction data (for systems map) ──────────────────────────
  systems: ViewSystem[];
  systemEdges: ViewSystemEdge[];

  // ── Variant data (for variants map) ────────────────────────────────────
  variants: ViewVariantPath[];

  // ── Aggregate metrics ──────────────────────────────────────────────────
  totalDurationMs: number;
  totalSteps: number;
  totalEvents: number;
  totalSystems: number;
  totalHandoffs: number;
  totalFriction: number;
  avgConfidence: number;

  // ── Quality flags ──────────────────────────────────────────────────────
  hasDecisions: boolean;
  hasExceptions: boolean;
  hasFriction: boolean;
  hasMultipleSystems: boolean;
  isComplete: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// ADAPTER: Raw ProcessOutput → NormalizedViewModel
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Transform raw engine ProcessOutput into a fully normalized view model.
 * Every field is guaranteed non-null with sensible defaults.
 */
export function buildNormalizedViewModel(
  processOutput: {
    processRun?: any;
    processDefinition?: any;
    processMap?: any;
    sop?: any;
  } | null,
): NormalizedViewModel | null {
  if (!processOutput) return null;

  const { processRun, processDefinition, processMap, sop } = processOutput;
  if (!processRun || !processMap) return null;

  const stepDefs: any[] = processDefinition?.stepDefinitions ?? [];
  const sopSteps: any[] = sop?.steps ?? [];
  const rawNodes: any[] = processMap.nodes ?? [];
  const rawEdges: any[] = processMap.edges ?? [];
  const rawPhases: any[] = processMap.phases ?? [];

  // ── Build step lookup maps ───────────────────────────────────────────────

  const stepDefMap = new Map<string, any>();
  for (const s of stepDefs) stepDefMap.set(s.stepId, s);

  const sopStepMap = new Map<string, any>();
  for (const s of sopSteps) sopStepMap.set(s.stepId, s);

  // ── Normalize nodes ──────────────────────────────────────────────────────

  const nodes: ViewNode[] = rawNodes.map((raw: any) => {
    const sd = stepDefMap.get(raw.stepId);
    const ss = sopStepMap.get(raw.stepId);
    const meta = raw.metadata ?? {};
    const cat = raw.category ?? 'single_action';
    const style = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;

    // Terminal node styling
    const isTerminal = raw.nodeType === 'start' || raw.nodeType === 'end';
    const terminalStyle = isTerminal ? NODE_TYPE_STYLES[raw.nodeType as keyof typeof NODE_TYPE_STYLES] : null;

    const label = humanizeLabel(raw.title, cat, meta);
    const frictionRaw: any[] = meta.frictionIndicators ?? [];

    return {
      id: safe(raw.id, ''),
      stepId: safe(raw.stepId, ''),
      ordinal: raw.ordinal ?? 0,
      label,
      shortLabel: truncate(label, 32),
      nodeType: normalizeNodeType(raw.nodeType),
      category: cat,
      categoryLabel: style.label,
      position: { x: raw.position?.x ?? 0, y: raw.position?.y ?? 0 },
      phaseId: raw.phaseId ?? null,
      system: (meta.systems ?? [])[0] ?? '',
      systems: meta.systems ?? [],
      pageTitle: safe(meta.pageTitle, ''),
      routeTemplate: safe(meta.routeTemplate, ''),
      dominantAction: safe(meta.dominantAction, ''),

      durationMs: meta.durationMs ?? sd?.durationMs ?? 0,
      durationLabel: safe(meta.durationLabel ?? sd?.durationLabel, '< 1s'),
      eventCount: meta.eventCount ?? sd?.eventCount ?? 0,
      humanEventCount: meta.humanEventCount ?? 0,
      confidence: sd?.confidence ?? 0.5,

      isDecisionPoint: meta.isDecisionPoint === true,
      decisionLabel: safe(meta.decisionLabel, ''),
      isExceptionPath: raw.nodeType === 'exception',
      hasSensitiveData: sd?.hasSensitiveEvents === true,
      isLowConfidence: (sd?.confidence ?? 0.5) < 0.7,

      frictionIndicators: frictionRaw.map(normalizeFriction),
      hasHighFriction: frictionRaw.some((f: any) => f.severity === 'high'),

      accentColor: terminalStyle?.color ?? style.color,
      bgColor: terminalStyle?.bg ?? style.bg,
      bgHoverColor: terminalStyle?.bg ?? style.bgHover,
      textColor: terminalStyle?.color ?? style.text,

      operationalDefinition: safe(sd?.operationalDefinition, ''),
      procedure: safe(ss?.detail, ''),
      expectedOutcome: safe(ss?.expectedOutcome, ''),
      warnings: ss?.warnings ?? [],

      automationScore: null,
      frequency: null,
    };
  });

  // ── Normalize edges ──────────────────────────────────────────────────────

  const edges: ViewEdge[] = rawEdges.map((raw: any) => {
    const type = normalizeEdgeType(raw.type);
    const isException = type === 'exception';
    return {
      id: safe(raw.id, ''),
      sourceId: safe(raw.source, ''),
      targetId: safe(raw.target, ''),
      type,
      label: safe(raw.boundaryLabel, ''),
      boundaryReason: safe(raw.boundaryReason, ''),
      isExceptionPath: isException,
      strokeColor: isException ? '#fca5a5' : type === 'decision' ? '#fbbf24' : '#cbd5e1',
      strokeWidth: 2,
      isDashed: isException,
    };
  });

  // ── Normalize phases ─────────────────────────────────────────────────────

  const phases: ViewPhase[] = rawPhases.map((raw: any) => {
    const nodeIds: string[] = raw.stepNodeIds ?? [];
    const phaseNodes = nodes.filter(n => nodeIds.includes(n.id));
    const totalDur = phaseNodes.reduce((s, n) => s + n.durationMs, 0);
    const totalEvt = phaseNodes.reduce((s, n) => s + n.eventCount, 0);
    const firstCat = phaseNodes[0]?.category ?? 'single_action';
    const color = (CATEGORY_STYLES[firstCat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action).color;

    return {
      id: safe(raw.id, ''),
      label: safe(raw.name, raw.system ?? 'Phase'),
      system: safe(raw.system, ''),
      nodeIds,
      stepCount: phaseNodes.length,
      totalDurationMs: totalDur,
      totalEvents: totalEvt,
      color,
    };
  });

  // ── Build system interaction model ───────────────────────────────────────

  const systemMap = new Map<string, ViewSystem>();
  for (const node of nodes) {
    if (node.nodeType === 'start' || node.nodeType === 'end') continue;
    const sysId = normalizeSystemId(node.system);
    if (!sysId) continue;
    if (!systemMap.has(sysId)) {
      systemMap.set(sysId, {
        id: sysId,
        label: node.system,
        stepCount: 0,
        totalDurationMs: 0,
        humanEventCount: 0,
        nodeIds: [],
        phaseIds: [],
      });
    }
    const sys = systemMap.get(sysId)!;
    sys.stepCount++;
    sys.totalDurationMs += node.durationMs;
    sys.humanEventCount += node.humanEventCount;
    sys.nodeIds.push(node.id);
    if (node.phaseId && !sys.phaseIds.includes(node.phaseId)) {
      sys.phaseIds.push(node.phaseId);
    }
  }
  const systems = [...systemMap.values()];

  // Build system-to-system edges (handoffs)
  const systemEdges: ViewSystemEdge[] = [];
  const handoffCounts = new Map<string, { count: number; nodes: string[]; label: string }>();
  for (const edge of edges) {
    const srcNode = nodes.find(n => n.id === edge.sourceId);
    const tgtNode = nodes.find(n => n.id === edge.targetId);
    if (!srcNode || !tgtNode) continue;
    const srcSys = normalizeSystemId(srcNode.system);
    const tgtSys = normalizeSystemId(tgtNode.system);
    if (!srcSys || !tgtSys || srcSys === tgtSys) continue;
    const key = `${srcSys}→${tgtSys}`;
    if (!handoffCounts.has(key)) {
      handoffCounts.set(key, { count: 0, nodes: [], label: `${srcNode.system} → ${tgtNode.system}` });
    }
    const entry = handoffCounts.get(key)!;
    entry.count++;
    entry.nodes.push(srcNode.id, tgtNode.id);
  }
  for (const [key, data] of handoffCounts) {
    const [srcId, tgtId] = key.split('→');
    systemEdges.push({
      id: key,
      sourceSystemId: srcId!,
      targetSystemId: tgtId!,
      label: data.label,
      count: data.count,
      transitionNodeIds: [...new Set(data.nodes)],
    });
  }

  // ── Aggregate metrics ────────────────────────────────────────────────────

  const taskNodes = nodes.filter(n => n.nodeType !== 'start' && n.nodeType !== 'end');
  const totalDurationMs = processRun.durationMs ?? taskNodes.reduce((s, n) => s + n.durationMs, 0);
  const totalEvents = processRun.eventCount ?? taskNodes.reduce((s, n) => s + n.eventCount, 0);
  const avgConfidence = taskNodes.length > 0
    ? taskNodes.reduce((s, n) => s + n.confidence, 0) / taskNodes.length
    : 0;
  const allFriction = nodes.flatMap(n => n.frictionIndicators);

  return {
    nodes,
    edges,
    phases,
    systems,
    systemEdges,
    variants: [], // Populated when intelligence data is available
    totalDurationMs,
    totalSteps: taskNodes.length,
    totalEvents,
    totalSystems: systems.length,
    totalHandoffs: systemEdges.reduce((s, e) => s + e.count, 0),
    totalFriction: allFriction.length,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    hasDecisions: nodes.some(n => n.isDecisionPoint),
    hasExceptions: nodes.some(n => n.isExceptionPath),
    hasFriction: allFriction.length > 0,
    hasMultipleSystems: systems.length > 1,
    isComplete: processRun.completionStatus === 'complete',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// LABEL HUMANIZATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Improve a step label for node display. Conservative: enhances weak labels
 * using available context, but never fabricates content.
 *
 * Strategy:
 * 1. If label is already good (starts with imperative verb, > 3 words), keep it
 * 2. If label is "Perform action" / "Click element" / bare noun, enrich with
 *    page title, system, or dominant action
 * 3. Truncate to reasonable display length
 */
function humanizeLabel(
  rawTitle: string,
  category: string,
  metadata: any,
): string {
  const title = (rawTitle ?? '').trim();
  if (!title) return fallbackLabel(category, metadata);

  // "Start" and "End" are fine as-is
  if (title === 'Start' || title === 'End') return title;

  // Already has good structure (3+ words) — return as-is
  const words = title.split(/\s+/);
  if (words.length >= 3) return title;

  // Bare fallbacks that need enrichment
  const weak = [
    'Perform action', 'Click element', 'Update field', 'Enter field',
    'Interact with', 'Complete action', 'Handle error', 'Attach file',
  ];
  if (weak.some(w => title.startsWith(w))) {
    const enriched = fallbackLabel(category, metadata);
    // Only use the enriched label if it's actually better than what we have
    if (enriched.split(/\s+/).length > title.split(/\s+/).length) return enriched;
    return title;
  }

  // Short titles (1-2 words) that are just category names — enrich them
  const catLabel = (CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action).label;
  if (title === catLabel || title.toLowerCase() === catLabel.toLowerCase()) {
    const enriched = fallbackLabel(category, metadata);
    if (enriched !== catLabel) return enriched;
  }

  return title;
}

function fallbackLabel(category: string, metadata: any): string {
  const page = metadata?.pageTitle;
  const system = (metadata?.systems ?? [])[0];
  const action = metadata?.dominantAction;
  const route = metadata?.routeTemplate;
  const catLabel = (CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action).label;

  // Build the richest available label — never return a bare category name
  if (page && system && page !== system) return `${catLabel} on ${page} (${system})`;
  if (page) return `${catLabel} on ${page}`;
  if (system && route) return `${catLabel} at ${route} (${system})`;
  if (system) return `${catLabel} in ${system}`;
  if (route) return `${catLabel} at ${route}`;
  if (action) return action;
  // Last resort: append a step ordinal hint if we have it from the metadata
  return `${catLabel} step`;
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function safe(value: any, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function normalizeNodeType(raw: any): ViewNodeType {
  const valid: ViewNodeType[] = ['start', 'end', 'task', 'decision', 'exception'];
  return valid.includes(raw) ? raw : 'task';
}

function normalizeEdgeType(raw: any): ViewEdgeType {
  if (raw === 'exception') return 'exception';
  if (raw === 'decision') return 'decision';
  return 'sequence';
}

function normalizeFriction(raw: any): ViewFriction {
  return {
    type: safe(raw.type, 'unknown'),
    label: safe(raw.label, 'Friction detected'),
    severity: ['low', 'medium', 'high'].includes(raw.severity) ? raw.severity : 'low',
    affectedStepOrdinals: Array.isArray(raw.stepOrdinals) ? raw.stepOrdinals : [],
  };
}

function normalizeSystemId(system: string): string {
  if (!system) return '';
  return system.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
