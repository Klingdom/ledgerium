/**
 * Builds a pure graph model from engine inputs.
 *
 * Engine spec §14: Process map generation model.
 * Granularity: STEP level — each node represents one segmented step.
 *
 * Outputs:
 * - Synthetic start and end nodes (spec §14.3)
 * - Task/exception nodes per finalized step with rich step-level metadata
 * - Phases grouping consecutive steps by application/system context (spec §8.5)
 * - Edges with transition type and human-readable boundary labels
 *
 * Node metadata includes:
 * - eventTypeSummary: breakdown of event types in this step (for badges/tooltips)
 * - dominantAction: the primary thing that happened in this step
 * - humanEventCount: distinct from total eventCount
 * - pageTitle / routeTemplate: primary page context for this step
 *
 * No React, no browser APIs, no UI framework dependencies.
 * Positions are deterministic: vertical layout, ordinal-based spacing.
 */

import type {
  ProcessEngineInput,
  ProcessMap,
  ProcessMapNode,
  ProcessMapEdge,
  ProcessMapPhase,
  ProcessMapNodeType,
  ProcessMapNodeMetadata,
  CanonicalEventInput,
  GroupingReason,
} from './types.js';
import { CATEGORY_CONFIG, PROCESS_ENGINE_VERSION } from './types.js';
import { formatDuration, uniqueSystems, uniqueDomains, toGroupingReason } from './stepAnalyzer.js';

// ─── Layout constants ─────────────────────────────────────────────────────────
// Deterministic, fixed for all renders. Adjust only for global layout changes.

const NODE_X = 0;
const NODE_HEIGHT = 84;
const NODE_GAP = 20;
const SYNTHETIC_NODE_HEIGHT = 48;

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildProcessMap(input: ProcessEngineInput): ProcessMap {
  const { sessionJson, normalizedEvents, derivedSteps } = input;

  const eventById = new Map<string, CanonicalEventInput>(
    normalizedEvents.map(e => [e.event_id, e]),
  );

  const finalizedSteps = derivedSteps.filter(s => s.status === 'finalized');

  // ── Aggregate systems for the whole map ──────────────────────────────────
  const allSystems = uniqueSystems(normalizedEvents);

  // ── Build task / exception nodes ─────────────────────────────────────────
  // Offset by the synthetic start node height so task nodes start below it.
  const startNodeHeight = SYNTHETIC_NODE_HEIGHT + NODE_GAP;

  const taskNodes: ProcessMapNode[] = finalizedSteps.map((step, index) => {
    const events = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);

    const groupingReason: GroupingReason = toGroupingReason(step.grouping_reason);
    const category = CATEGORY_CONFIG[groupingReason];
    const systems = uniqueSystems(events);
    const domains = uniqueDomains(events);

    // Node type: exception for error_handling, task for everything else (spec §14.3)
    const nodeType: ProcessMapNodeType =
      groupingReason === 'error_handling' ? 'exception' : 'task';

    const metadata = buildNodeMetadata(events, systems, domains, step.duration_ms);

    return {
      id: step.step_id,
      stepId: step.step_id,
      ordinal: step.ordinal,
      title: step.title,
      nodeType,
      category: groupingReason,
      categoryLabel: category.label,
      categoryColor: category.color,
      categoryBg: category.bg,
      position: {
        x: NODE_X,
        y: startNodeHeight + index * (NODE_HEIGHT + NODE_GAP),
      },
      metadata,
    };
  });

  // ── Build phases from consecutive application context groups ─────────────
  const phases = buildPhases(sessionJson.sessionId, finalizedSteps);

  // Attach phaseId to each task node
  for (const phase of phases) {
    for (const nodeId of phase.stepNodeIds) {
      const node = taskNodes.find(n => n.id === nodeId);
      if (node !== undefined) {
        node.phaseId = phase.id;
      }
    }
  }

  // ── Build synthetic start node (spec §14.3) ───────────────────────────────
  const startNode: ProcessMapNode = {
    id: `${sessionJson.sessionId}-start`,
    stepId: `${sessionJson.sessionId}-start`,
    ordinal: 0,
    title: 'Start',
    nodeType: 'start',
    category: 'single_action',
    categoryLabel: 'Start',
    categoryColor: '#64748b',
    categoryBg: 'rgba(100,116,139,0.07)',
    position: { x: NODE_X, y: 0 },
    metadata: {
      systems: [],
      durationLabel: '',
      eventCount: 0,
      humanEventCount: 0,
      eventTypeSummary: {},
    },
  };

  // ── Build synthetic end node (spec §14.3) ─────────────────────────────────
  const endNodeY =
    taskNodes.length > 0
      ? taskNodes[taskNodes.length - 1]!.position.y + NODE_HEIGHT + NODE_GAP
      : startNodeHeight;

  const endNode: ProcessMapNode = {
    id: `${sessionJson.sessionId}-end`,
    stepId: `${sessionJson.sessionId}-end`,
    ordinal: finalizedSteps.length + 1,
    title: 'End',
    nodeType: 'end',
    category: 'single_action',
    categoryLabel: 'End',
    categoryColor: '#64748b',
    categoryBg: 'rgba(100,116,139,0.07)',
    position: { x: NODE_X, y: endNodeY },
    metadata: {
      systems: [],
      durationLabel: '',
      eventCount: 0,
      humanEventCount: 0,
      eventTypeSummary: {},
    },
  };

  // ── Build edges ───────────────────────────────────────────────────────────
  const allNodes = [startNode, ...taskNodes, endNode];
  const edges: ProcessMapEdge[] = [];

  for (let i = 0; i < allNodes.length - 1; i++) {
    const from = allNodes[i]!;
    const to = allNodes[i + 1]!;

    // Exception transition when either endpoint is an exception node
    const edgeType: ProcessMapEdge['type'] =
      to.nodeType === 'exception' || from.nodeType === 'exception'
        ? 'exception'
        : 'sequence';

    // The boundary reason comes from the target step (the step that triggered the boundary)
    const targetDerivedStep =
      to.nodeType !== 'start' && to.nodeType !== 'end'
        ? finalizedSteps.find(s => s.step_id === to.stepId)
        : undefined;

    const boundaryReason = targetDerivedStep?.boundary_reason;

    edges.push({
      id: `edge-${from.id}-${to.id}`,
      source: from.id,
      target: to.id,
      type: edgeType,
      ...(boundaryReason !== undefined && { boundaryReason }),
      boundaryLabel: deriveBoundaryLabel(from.nodeType, to.nodeType, boundaryReason),
    });
  }

  return {
    id: `${sessionJson.sessionId}-map`,
    name: sessionJson.activityName,
    version: PROCESS_ENGINE_VERSION,
    sessionId: sessionJson.sessionId,
    systems: allSystems,
    phases,
    nodes: allNodes,
    edges,
  };
}

// ─── Node metadata builder ────────────────────────────────────────────────────

/**
 * Builds rich step-level metadata for a process map node.
 *
 * The metadata is used by renderers to display event breakdowns, dominant actions,
 * page context, and human vs system event ratios on map node cards.
 */
function buildNodeMetadata(
  events: CanonicalEventInput[],
  systems: string[],
  domains: string[],
  durationMs: number | undefined,
): ProcessMapNodeMetadata {
  const humanEvents = events.filter(e => e.actor_type === 'human');

  // Count all event types present in this step
  const eventTypeSummary: Record<string, number> = {};
  for (const evt of events) {
    eventTypeSummary[evt.event_type] = (eventTypeSummary[evt.event_type] ?? 0) + 1;
  }

  // Primary page context: use the most common pageTitle across events
  const pageTitle = mostFrequentPageTitle(events);
  const routeTemplate = mostFrequentRouteTemplate(events);

  // Dominant action: most frequent human event type mapped to readable label
  const dominantAction = deriveDominantAction(humanEvents);

  return {
    systems,
    ...(domains[0] !== undefined && { domain: domains[0] }),
    ...(durationMs !== undefined && { durationMs }),
    durationLabel: formatDuration(durationMs),
    eventCount: events.length,
    humanEventCount: humanEvents.length,
    ...(pageTitle !== undefined && { pageTitle }),
    ...(routeTemplate !== undefined && { routeTemplate }),
    ...(dominantAction !== undefined && { dominantAction }),
    eventTypeSummary,
  };
}

// ─── Dominant action derivation ───────────────────────────────────────────────

/**
 * Maps the most frequent human event type in a step to a readable action label.
 * Used to describe "what mainly happened in this step" on the map node.
 */
function deriveDominantAction(humanEvents: CanonicalEventInput[]): string | undefined {
  if (humanEvents.length === 0) return undefined;

  // Count human event types
  const counts = new Map<string, number>();
  for (const evt of humanEvents) {
    counts.set(evt.event_type, (counts.get(evt.event_type) ?? 0) + 1);
  }

  // Find the most frequent
  let dominant = '';
  let maxCount = 0;
  for (const [type, count] of counts) {
    if (count > maxCount || (count === maxCount && type < dominant)) {
      dominant = type;
      maxCount = count;
    }
  }

  return DOMINANT_ACTION_LABELS[dominant] ?? 'Interaction';
}

const DOMINANT_ACTION_LABELS: Record<string, string> = {
  'interaction.click':            'Click',
  'interaction.input_change':     'Data entry',
  'interaction.submit':           'Form submit',
  'interaction.select':           'Selection',
  'interaction.keyboard_shortcut':'Keyboard shortcut',
  'interaction.upload_file':      'File upload',
  'interaction.download_file':    'File download',
  'interaction.drag_started':     'Drag',
  'interaction.drag_completed':   'Drop',
  'navigation.open_page':         'Page load',
  'navigation.route_change':      'Navigation',
  'navigation.tab_activated':     'Tab switch',
  'navigation.app_context_changed': 'App switch',
  'session.annotation_added':     'Annotation',
};

// ─── Page context helpers ─────────────────────────────────────────────────────

function mostFrequentPageTitle(events: CanonicalEventInput[]): string | undefined {
  const counts = new Map<string, number>();
  for (const evt of events) {
    const title = evt.page_context?.pageTitle;
    if (title) counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return mostFrequent(counts);
}

function mostFrequentRouteTemplate(events: CanonicalEventInput[]): string | undefined {
  const counts = new Map<string, number>();
  for (const evt of events) {
    const route = evt.page_context?.routeTemplate;
    if (route) counts.set(route, (counts.get(route) ?? 0) + 1);
  }
  return mostFrequent(counts);
}

function mostFrequent(counts: Map<string, number>): string | undefined {
  if (counts.size === 0) return undefined;
  let result: string | undefined;
  let max = 0;
  for (const [key, count] of counts) {
    // Tie-break: lexicographic order for determinism
    if (count > max || (count === max && result !== undefined && key < result)) {
      result = key;
      max = count;
    }
  }
  return result;
}

// ─── Boundary label derivation ────────────────────────────────────────────────

/**
 * Converts a raw boundary reason into a human-readable transition label for edges.
 *
 * Always returns a non-empty string so renderers can label every edge without
 * conditional handling.
 */
function deriveBoundaryLabel(
  fromNodeType: ProcessMapNodeType,
  toNodeType: ProcessMapNodeType,
  boundaryReason: string | undefined,
): string {
  // Synthetic node transitions
  if (fromNodeType === 'start') return 'Process begins';
  if (toNodeType === 'end') return 'Process completes';

  if (boundaryReason === undefined) return 'Continues';

  const LABELS: Record<string, string> = {
    navigation_changed:  'Page navigation',
    form_submitted:      'Form submitted',
    app_context_changed: 'Application switch',
    idle_gap:            'Idle pause',
    user_annotation:     'Annotated boundary',
    session_stop:        'Session stopped',
    explicit_boundary:   'Explicit step boundary',
  };

  return LABELS[boundaryReason] ?? boundaryReason.replace(/_/g, ' ');
}

// ─── Phase computation ────────────────────────────────────────────────────────

/**
 * Groups consecutive finalized steps by their applicationLabel into phases.
 *
 * Rule (deterministic):
 *   A new phase starts when the applicationLabel changes from the previous step.
 *   Steps with no page_context inherit the current open phase's system label.
 */
function buildPhases(
  sessionId: string,
  finalizedSteps: Array<{ step_id: string; page_context?: { applicationLabel: string } }>,
): ProcessMapPhase[] {
  if (finalizedSteps.length === 0) return [];

  const phases: ProcessMapPhase[] = [];
  let phaseIndex = 0;
  let currentLabel = '';

  for (const step of finalizedSteps) {
    const label = step.page_context?.applicationLabel ?? '';
    const effectiveLabel = label || currentLabel || 'Unknown System';

    if (phases.length === 0 || (label && label !== currentLabel)) {
      phaseIndex++;
      phases.push({
        id: `${sessionId}-phase-${phaseIndex}`,
        name: effectiveLabel,
        system: effectiveLabel,
        stepNodeIds: [step.step_id],
      });
      if (label) currentLabel = label;
    } else {
      phases[phases.length - 1]!.stepNodeIds.push(step.step_id);
    }
  }

  return phases;
}
