/**
 * Process map template renderers.
 *
 * Three rendering modes that consume ProcessOutput and produce structured
 * template artifacts:
 *
 * 1. Swimlane — cross-functional view with lanes by system/role (default)
 * 2. BPMN-informed — technical notation for complex branching workflows
 * 3. SIPOC + High-Level — executive summary view
 *
 * All renderers are pure and deterministic.
 */

import type { ProcessOutput, ProcessMapNode, ProcessMapPhase } from '../types.js';
import type {
  SwimlaneProcessMap,
  SwimlaneMapStep,
  SwimlaneMapDecision,
  BPMNProcessMap,
  BPMNTask,
  BPMNGateway,
  BPMNSequenceFlow,
  BPMNPool,
  BPMNSystemInteraction,
  BPMNExceptionFlow,
  SIPOCProcessMap,
  RenderedProcessMap,
  ProcessMapTemplateType,
} from '../templateTypes.js';
import {
  conciseStepLabel,
  stepPageContext,
  buildLanes,
  nodeLaneId,
  detectHandoffs,
  clusterIntoStages,
  inferSuppliers,
  inferCustomers,
} from './renderHelpers.js';

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function renderProcessMap(
  output: ProcessOutput,
  template: ProcessMapTemplateType,
): RenderedProcessMap {
  switch (template) {
    case 'swimlane':       return renderSwimlane(output);
    case 'bpmn_informed':  return renderBPMN(output);
    case 'sipoc_high_level': return renderSIPOC(output);
  }
}

// ─── 1. Cross-Functional Swimlane ────────────────────────────────────────────

function renderSwimlane(output: ProcessOutput): SwimlaneProcessMap {
  const { processMap, processDefinition, sop } = output;
  const taskNodes = processMap.nodes.filter(
    n => n.nodeType !== 'start' && n.nodeType !== 'end',
  );

  const lanes = buildLanes(processMap.phases, processMap.nodes);
  const handoffs = detectHandoffs(processMap.nodes, processMap.phases);

  // Build step entries
  const steps: SwimlaneMapStep[] = taskNodes.map(node => ({
    ordinal: node.ordinal,
    title: conciseStepLabel(node.title),
    laneId: nodeLaneId(node, processMap.phases),
    category: node.category,
    categoryLabel: node.categoryLabel,
    durationLabel: node.metadata.durationLabel,
    dominantAction: node.metadata.dominantAction ?? 'Action',
    isExceptionPath: node.nodeType === 'exception',
    pageContext: stepPageContext(node),
  }));

  // Build decision entries from decision nodes
  const decisions: SwimlaneMapDecision[] = [];
  for (let i = 0; i < taskNodes.length; i++) {
    const node = taskNodes[i]!;
    if (node.metadata.isDecisionPoint && node.metadata.decisionLabel) {
      const nextNode = taskNodes[i + 1];
      const decisionLabel = node.metadata.decisionLabel;

      let yesPath: string;
      let noPath: string;

      if (nextNode?.nodeType === 'exception') {
        const resumeNode = taskNodes[i + 2];
        const resumeLabel = resumeNode
          ? conciseStepLabel(resumeNode.title)
          : 'next step';
        yesPath = `${decisionLabel} accepted — proceed to ${resumeLabel}`;
        noPath = `Validation error at ${conciseStepLabel(node.title)} — resolve before continuing`;
      } else if (nextNode) {
        yesPath = `${decisionLabel} confirmed — proceed to ${conciseStepLabel(nextNode.title)}`;
        noPath = 'Process completes';
      } else {
        yesPath = `${decisionLabel} confirmed — process completes`;
        noPath = 'Process completes';
      }

      decisions.push({
        afterStepOrdinal: node.ordinal,
        label: decisionLabel,
        laneId: nodeLaneId(node, processMap.phases),
        yesPath,
        noPath,
      });
    }
  }

  const qi = sop.qualityIndicators;

  // Derive contextual fallbacks for objective, trigger, and outcome
  const fallbackObjective = deriveSwimlaneObjective(processMap.name, taskNodes, processMap.systems);
  const fallbackTrigger = deriveSwimlaneContext(taskNodes, 'trigger');
  const fallbackOutcome = deriveSwimlaneContext(taskNodes, 'outcome');

  return {
    templateType: 'swimlane',
    title: processMap.name,
    objective: processMap.objective ?? fallbackObjective,
    trigger: processMap.trigger ?? fallbackTrigger,
    outcome: processMap.outcome ?? fallbackOutcome,
    durationLabel: processMap.durationLabel ?? sop.estimatedTime,
    lanes,
    steps,
    decisions,
    handoffs,
    frictionAnnotations: processMap.frictionSummary ?? [],
    metadata: {
      systems: processMap.systems,
      roles: sop.roles ?? ['Operator'],
      stepCount: taskNodes.length,
      phaseCount: processMap.phases.length,
      confidence: qi?.averageConfidence ?? 0,
    },
  };
}

// ─── 2. BPMN-Informed ────────────────────────────────────────────────────────

function renderBPMN(output: ProcessOutput): BPMNProcessMap {
  const { processMap, processDefinition, sop } = output;
  const taskNodes = processMap.nodes.filter(
    n => n.nodeType !== 'start' && n.nodeType !== 'end',
  );

  // Build pools from phases
  const pools: BPMNPool[] = processMap.phases.map(phase => ({
    id: phase.id,
    label: phase.system,
    system: phase.system,
    taskIds: phase.stepNodeIds,
  }));

  // Build BPMN tasks
  const tasks: BPMNTask[] = taskNodes.map(node => {
    const stepDef = processDefinition.stepDefinitions.find(s => s.stepId === node.stepId);
    const isSystem = node.metadata.humanEventCount === 0;
    return {
      id: node.stepId,
      ordinal: node.ordinal,
      label: conciseStepLabel(node.title),
      type: isSystem ? 'system' : node.category === 'error_handling' ? 'manual' : 'user',
      poolId: nodeLaneId(node, processMap.phases),
      durationLabel: node.metadata.durationLabel,
      inputs: stepDef?.inputs ?? [],
      outputs: stepDef?.outputs ?? [],
    };
  });

  // Build gateways from decision points
  const gateways: BPMNGateway[] = [];
  for (let i = 0; i < taskNodes.length; i++) {
    const node = taskNodes[i]!;
    if (node.metadata.isDecisionPoint && node.metadata.decisionLabel) {
      const nextNode = taskNodes[i + 1];
      const afterException = taskNodes[i + 2];
      const conditions: Array<{ label: string; targetTaskId: string }> = [];

      if (nextNode?.nodeType === 'exception') {
        if (afterException) {
          conditions.push({ label: 'Yes — Accepted', targetTaskId: afterException.stepId });
        }
        conditions.push({ label: 'No — Error', targetTaskId: nextNode.stepId });
      } else if (nextNode) {
        conditions.push({ label: 'Yes', targetTaskId: nextNode.stepId });
      }

      gateways.push({
        id: `gw-${node.stepId}`,
        type: 'exclusive',
        label: node.metadata.decisionLabel,
        afterTaskId: node.stepId,
        conditions,
      });
    }
  }

  // Build sequence flows
  const sequenceFlows: BPMNSequenceFlow[] = processMap.edges.map(edge => ({
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    label: edge.boundaryLabel,
    isDefault: edge.type === 'sequence',
  }));

  // Build system interactions
  const systemInteractions: BPMNSystemInteraction[] = [];
  for (const node of taskNodes) {
    if (node.category === 'fill_and_submit' || node.category === 'send_action') {
      const stepDef = processDefinition.stepDefinitions.find(s => s.stepId === node.stepId);
      const system = node.metadata.systems[0] ?? 'System';
      const description = deriveSystemInteractionDescription(node, stepDef?.inputs ?? []);
      systemInteractions.push({
        taskId: node.stepId,
        type: 'send',
        system,
        description,
      });
    }
  }

  // Build exception flows
  const exceptionFlows: BPMNExceptionFlow[] = [];
  for (let i = 0; i < taskNodes.length; i++) {
    const node = taskNodes[i]!;
    if (node.nodeType === 'exception') {
      const precedingNode = taskNodes[i - 1];
      const nextNode = taskNodes[i + 1];
      const sopStep = sop.steps.find(s => s.stepId === node.stepId);
      const system = node.metadata.systems[0] ?? precedingNode?.metadata.systems[0] ?? 'system';
      const precedingTitle = precedingNode ? conciseStepLabel(precedingNode.title) : 'previous action';
      const errorLabel = `${precedingTitle} failed in ${system}`;
      const resolution = nextNode
        ? `Resolve error and proceed to ${conciseStepLabel(nextNode.title)}`
        : `Resolve error in ${system} and complete the process`;
      exceptionFlows.push({
        sourceTaskId: precedingNode?.stepId ?? 'unknown',
        errorLabel,
        handlingSteps: sopStep
          ? sopStep.instructions.map(inst => inst.instruction)
          : [`Resolve the error in ${system}`],
        resolution,
      });
    }
  }

  const hasRetries = processMap.frictionSummary?.some(f => f.type === 'backtracking') ?? false;
  const hasParallel = false; // Not yet supported in data model

  return {
    templateType: 'bpmn_informed',
    processId: processMap.id,
    processName: processMap.name,
    startEvent: {
      id: `${processMap.sessionId}-start`,
      label: processMap.trigger ?? 'Process Start',
      type: 'start',
      ...(processMap.trigger !== undefined && { trigger: processMap.trigger }),
    },
    endEvent: {
      id: `${processMap.sessionId}-end`,
      label: processMap.outcome ?? 'Process Complete',
      type: 'end',
    },
    tasks,
    gateways,
    sequenceFlows,
    pools,
    systemInteractions,
    exceptionFlows,
    metadata: {
      systems: processMap.systems,
      eventCount: processDefinition.stepDefinitions.reduce((sum, s) => sum + s.eventCount, 0),
      hasParallelPaths: hasParallel,
      hasRetries,
      hasSystemEvents: systemInteractions.length > 0,
    },
  };
}

// ─── 3. SIPOC + High-Level ───────────────────────────────────────────────────

function renderSIPOC(output: ProcessOutput): SIPOCProcessMap {
  const { processMap, sop, processDefinition } = output;

  const stages = clusterIntoStages(processMap.phases, processMap.nodes);
  const suppliers = inferSuppliers(output);
  const customers = inferCustomers(output);

  // Derive inputs from SOP prerequisites and data fields
  const inputs = sop.inputs.length > 0
    ? sop.inputs
    : sop.prerequisites;

  // Derive outputs from SOP outputs
  const outputs = sop.outputs;

  // Risk highlights from friction — prefixed with phase/system context
  const riskHighlights: string[] = [];
  for (const f of (processMap.frictionSummary ?? [])) {
    if (f.severity === 'high' || f.severity === 'medium') {
      const contextSystem = deriveRiskContext(f.stepOrdinals, processMap.nodes, processMap.phases);
      riskHighlights.push(contextSystem ? `[${contextSystem}] ${f.label}` : f.label);
    }
  }
  if (riskHighlights.length === 0 && (sop.commonIssues?.length ?? 0) > 0) {
    for (const issue of sop.commonIssues!) {
      const contextSystem = deriveRiskContext(issue.stepOrdinals, processMap.nodes, processMap.phases);
      riskHighlights.push(contextSystem ? `[${contextSystem}] ${issue.title}` : issue.title);
    }
  }

  const qi = sop.qualityIndicators;

  return {
    templateType: 'sipoc_high_level',
    processName: processMap.name,
    businessObjective: processMap.objective ?? sop.businessObjective ?? `Complete ${processMap.name}`,
    suppliers,
    inputs: inputs.slice(0, 8),
    processStages: stages,
    outputs: outputs.slice(0, 8),
    customers,
    boundaries: {
      start: processMap.trigger ?? 'Process initiated',
      end: processMap.outcome ?? 'Process completed',
    },
    keySystems: processMap.systems,
    keyRoles: sop.roles ?? ['Operator'],
    riskHighlights: riskHighlights.slice(0, 5),
    metrics: {
      stepCount: processDefinition.stepDefinitions.length,
      systemCount: processMap.systems.length,
      estimatedDuration: sop.estimatedTime,
      confidence: qi?.averageConfidence ?? 0,
    },
  };
}

// ─── Private helpers ────────────────────────────────────────────────────────

/**
 * Derives a meaningful objective from the actual workflow steps.
 * Prioritizes form submissions, then multi-system coordination, then generic.
 */
function deriveSwimlaneObjective(
  name: string,
  taskNodes: ProcessMapNode[],
  systems: string[],
): string {
  const submitNodes = taskNodes.filter(
    n => n.category === 'fill_and_submit' || n.category === 'send_action',
  );

  if (submitNodes.length > 0 && systems.length > 1) {
    const submitTitles = submitNodes.map(n => conciseStepLabel(n.title, 30));
    return `${submitTitles[0]} across ${systems.join(' and ')}`;
  }

  if (submitNodes.length > 0) {
    return conciseStepLabel(submitNodes[0]!.title, 50) + ` in ${systems[0] ?? 'the system'}`;
  }

  if (systems.length > 1) {
    return `Coordinate ${name} across ${systems.join(', ')}`;
  }

  return `Complete ${name} in ${systems[0] ?? 'the system'}`;
}

/**
 * Derives a contextual trigger or outcome from the first/last task node.
 */
function deriveSwimlaneContext(
  taskNodes: ProcessMapNode[],
  field: 'trigger' | 'outcome',
): string {
  if (taskNodes.length === 0) {
    return field === 'trigger' ? 'Workflow initiated' : 'Workflow completed';
  }

  if (field === 'trigger') {
    const first = taskNodes[0]!;
    const system = first.metadata.systems[0];
    const page = first.metadata.pageTitle ?? first.metadata.routeTemplate;
    if (system && page) return `User navigates to ${page} in ${system}`;
    if (system) return `User begins work in ${system}`;
    if (page) return `User opens ${page}`;
    return `User initiates ${conciseStepLabel(first.title, 40)}`;
  }

  // outcome
  const last = taskNodes[taskNodes.length - 1]!;
  const system = last.metadata.systems[0];
  if (last.category === 'fill_and_submit' || last.category === 'send_action') {
    return `${conciseStepLabel(last.title, 40)} completed${system ? ` in ${system}` : ''}`;
  }
  if (system) return `${conciseStepLabel(last.title, 40)} completed in ${system}`;
  return `${conciseStepLabel(last.title, 40)} completed`;
}

/**
 * Derives a descriptive system interaction from step inputs and context.
 */
function deriveSystemInteractionDescription(
  node: ProcessMapNode,
  inputs: string[],
): string {
  const system = node.metadata.systems[0] ?? 'system';

  if (inputs.length > 0) {
    const fieldList = inputs.slice(0, 3).join(', ');
    const suffix = inputs.length > 3 ? ` and ${inputs.length - 3} more fields` : '';
    return `Submit ${fieldList}${suffix} to ${system}`;
  }

  // Use the step title for a better fallback than "Submit data"
  if (node.category === 'send_action') {
    return `${conciseStepLabel(node.title, 40)} in ${system}`;
  }

  return `Complete form submission in ${system}`;
}

/**
 * Derives the system/phase context string for a set of step ordinals.
 * Used to prefix risk highlights with where they occur.
 */
function deriveRiskContext(
  stepOrdinals: number[],
  nodes: ProcessMapNode[],
  phases: ProcessMapPhase[],
): string {
  if (stepOrdinals.length === 0) return '';

  const relevantNodes = nodes.filter(
    n => stepOrdinals.includes(n.ordinal) && n.nodeType !== 'start' && n.nodeType !== 'end',
  );

  if (relevantNodes.length === 0) return '';

  // Collect unique systems from the affected nodes
  const systems = [...new Set(relevantNodes.flatMap(n => n.metadata.systems))];
  if (systems.length === 0) {
    // Fall back to phase name
    const phaseIds = [...new Set(relevantNodes.map(n => n.phaseId).filter(Boolean))];
    const phaseNames = phaseIds
      .map(id => phases.find(p => p.id === id)?.name)
      .filter((n): n is string => n !== undefined);
    return phaseNames[0] ?? '';
  }

  return systems.join(', ');
}
