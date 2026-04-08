/**
 * Builds a pure graph model from engine inputs.
 *
 * Canonical process map model v2.0: enriched, friction-aware, decision-enabled.
 *
 * Engine spec §14: Process map generation model.
 * Granularity: STEP level — each node represents one segmented step.
 *
 * v2.0 improvements:
 * - Decision nodes inferred from submit → error_handling patterns
 * - Friction indicators attached to nodes where detected
 * - Enriched phase labels with business context
 * - Meaningful start/end nodes with trigger/outcome labels
 * - Process-level objective, trigger, and outcome
 * - Duration label at map level
 *
 * Outputs:
 * - Synthetic start and end nodes with trigger/outcome context
 * - Task/exception/decision nodes per finalized step with rich metadata
 * - Phases grouping consecutive steps by application/system context
 * - Edges with transition type and human-readable boundary labels
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
import {
  inferBusinessObjective,
  inferTrigger,
  detectFriction,
  detectDecisionPoints,
  cleanStepTitle,
  enrichPhaseLabel,
} from './contentEnricher.js';

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

  // ── Enrichment layer ─────────────────────────────────────────────────────
  const friction = detectFriction(finalizedSteps, normalizedEvents);
  const decisionPoints = detectDecisionPoints(finalizedSteps, normalizedEvents);
  const objective = inferBusinessObjective(
    sessionJson.activityName, finalizedSteps, normalizedEvents,
  );
  const trigger = inferTrigger(
    sessionJson.activityName, finalizedSteps, normalizedEvents,
  );

  // ── Total duration ─────────────────────────────────────────────────────
  const totalDurationMs = finalizedSteps.reduce(
    (sum, s) => sum + (s.duration_ms ?? 0), 0,
  );

  // ── Build task / exception / decision nodes ─────────────────────────────
  const startNodeHeight = SYNTHETIC_NODE_HEIGHT + NODE_GAP;

  const taskNodes: ProcessMapNode[] = finalizedSteps.map((step, index) => {
    const events = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);

    const groupingReason: GroupingReason = toGroupingReason(step.grouping_reason);
    const category = CATEGORY_CONFIG[groupingReason];
    const systems = uniqueSystems(events);
    const domains = uniqueDomains(events);

    // Node type: decision if inferred, exception for error_handling, task otherwise
    const isDecision = decisionPoints.has(step.step_id);
    const nodeType: ProcessMapNodeType = isDecision
      ? 'decision'
      : groupingReason === 'error_handling'
        ? 'exception'
        : 'task';

    // Clean the title (pass events for field-level context)
    const cleanedTitle = cleanStepTitle(step.title, groupingReason, events);

    // Friction for this specific step
    const stepFriction = friction.filter(f => f.stepOrdinals.includes(step.ordinal));

    const metadata = buildNodeMetadata(
      events, systems, domains, step.duration_ms,
      stepFriction.length > 0 ? stepFriction : undefined,
      isDecision,
      decisionPoints.get(step.step_id),
    );

    return {
      id: step.step_id,
      stepId: step.step_id,
      ordinal: step.ordinal,
      title: cleanedTitle,
      nodeType,
      category: groupingReason,
      categoryLabel: category.label,
      categoryColor: isDecision ? '#f59e0b' : category.color,  // Amber for decisions
      categoryBg: isDecision ? 'rgba(245,158,11,0.07)' : category.bg,
      position: {
        x: NODE_X,
        y: startNodeHeight + index * (NODE_HEIGHT + NODE_GAP),
      },
      metadata,
    };
  });

  // ── Build phases with enriched labels ───────────────────────────────────
  const phases = buildPhases(sessionJson.sessionId, finalizedSteps, eventById);

  // Attach phaseId to each task node
  for (const phase of phases) {
    for (const nodeId of phase.stepNodeIds) {
      const node = taskNodes.find(n => n.id === nodeId);
      if (node !== undefined) {
        node.phaseId = phase.id;
      }
    }
  }

  // ── Infer outcome from last step ────────────────────────────────────────
  const lastStep = finalizedSteps[finalizedSteps.length - 1];
  const lastStepEvents = lastStep
    ? lastStep.source_event_ids
        .map(id => eventById.get(id))
        .filter((e): e is CanonicalEventInput => e !== undefined)
    : [];
  const lastPage = lastStepEvents.find(e => e.page_context?.pageTitle)?.page_context?.pageTitle;
  const outcome = lastStep
    ? lastPage
      ? `${sessionJson.activityName} completed — "${lastPage}" reached`
      : `${sessionJson.activityName} completed`
    : 'Workflow completed';

  // ── Build synthetic start node ──────────────────────────────────────────
  const startNode: ProcessMapNode = {
    id: `${sessionJson.sessionId}-start`,
    stepId: `${sessionJson.sessionId}-start`,
    ordinal: 0,
    title: 'Start',
    nodeType: 'start',
    category: 'single_action',
    categoryLabel: 'Trigger',
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

  // ── Build synthetic end node ────────────────────────────────────────────
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
    categoryLabel: 'Complete',
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

  // ── Build edges ─────────────────────────────────────────────────────────
  const allNodes = [startNode, ...taskNodes, endNode];
  const edges: ProcessMapEdge[] = [];

  for (let i = 0; i < allNodes.length - 1; i++) {
    const from = allNodes[i]!;
    const to = allNodes[i + 1]!;

    const edgeType: ProcessMapEdge['type'] =
      to.nodeType === 'exception' || from.nodeType === 'exception'
        ? 'exception'
        : 'sequence';

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
    // New canonical fields
    objective,
    trigger,
    outcome,
    ...(totalDurationMs > 0 && { durationLabel: formatDuration(totalDurationMs) }),
    ...(friction.length > 0 && { frictionSummary: friction }),
  };
}

// ─── Node metadata builder ────────────────────────────────────────────────────

function buildNodeMetadata(
  events: CanonicalEventInput[],
  systems: string[],
  domains: string[],
  durationMs: number | undefined,
  frictionIndicators?: ProcessMapNodeMetadata['frictionIndicators'],
  isDecisionPoint?: boolean,
  decisionLabel?: string,
): ProcessMapNodeMetadata {
  const humanEvents = events.filter(e => e.actor_type === 'human');

  const eventTypeSummary: Record<string, number> = {};
  for (const evt of events) {
    eventTypeSummary[evt.event_type] = (eventTypeSummary[evt.event_type] ?? 0) + 1;
  }

  const pageTitle = mostFrequentPageTitle(events);
  const routeTemplate = mostFrequentRouteTemplate(events);
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
    ...(frictionIndicators !== undefined && { frictionIndicators }),
    ...(isDecisionPoint === true && { isDecisionPoint: true }),
    ...(decisionLabel !== undefined && { decisionLabel }),
  };
}

// ─── Dominant action derivation ───────────────────────────────────────────────

function deriveDominantAction(humanEvents: CanonicalEventInput[]): string | undefined {
  if (humanEvents.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const evt of humanEvents) {
    counts.set(evt.event_type, (counts.get(evt.event_type) ?? 0) + 1);
  }

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
    if (count > max || (count === max && result !== undefined && key < result)) {
      result = key;
      max = count;
    }
  }
  return result;
}

// ─── Boundary label derivation ────────────────────────────────────────────────

function deriveBoundaryLabel(
  fromNodeType: ProcessMapNodeType,
  toNodeType: ProcessMapNodeType,
  boundaryReason: string | undefined,
): string {
  if (fromNodeType === 'start') return 'Workflow begins';
  if (toNodeType === 'end') return 'Workflow completes';

  // Decision-related transitions
  if (fromNodeType === 'decision' && toNodeType === 'exception') return 'Validation failed';
  if (fromNodeType === 'decision') return 'Accepted';

  if (boundaryReason === undefined) return 'Continues';

  const LABELS: Record<string, string> = {
    navigation_changed:  'Page navigation',
    route_changed:       'Route changed',
    target_changed:      'Target changed',
    action_completed:    'Action completed',
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
 * Groups consecutive finalized steps by applicationLabel into phases.
 * v2.0: Enriched phase labels with business context.
 */
function buildPhases(
  sessionId: string,
  finalizedSteps: Array<{
    step_id: string;
    grouping_reason: string;
    source_event_ids: string[];
    title: string;
    page_context?: { applicationLabel: string; domain: string; routeTemplate: string };
  }>,
  eventById: Map<string, CanonicalEventInput>,
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

  // Enrich phase labels with business context (including event data)
  for (const phase of phases) {
    const phaseSteps = finalizedSteps.filter(s => phase.stepNodeIds.includes(s.step_id));
    // Collect all events for steps in this phase
    const phaseEvents: CanonicalEventInput[] = [];
    for (const step of phaseSteps) {
      for (const eid of step.source_event_ids) {
        const evt = eventById.get(eid);
        if (evt) phaseEvents.push(evt);
      }
    }
    phase.name = enrichPhaseLabel(phase.system, phaseSteps, phaseEvents);
  }

  return phases;
}
