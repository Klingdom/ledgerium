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

import type { ProcessOutput } from '../types.js';
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
      decisions.push({
        afterStepOrdinal: node.ordinal,
        label: node.metadata.decisionLabel,
        laneId: nodeLaneId(node, processMap.phases),
        yesPath: nextNode?.nodeType === 'exception'
          ? `Continue to step ${taskNodes[i + 2]?.ordinal ?? 'next'}`
          : `Continue to step ${nextNode?.ordinal ?? 'next'}`,
        noPath: nextNode?.nodeType === 'exception'
          ? 'Error handling path'
          : 'Process completes',
      });
    }
  }

  const qi = sop.qualityIndicators;

  return {
    templateType: 'swimlane',
    title: processMap.name,
    objective: processMap.objective ?? `Complete the ${processMap.name} workflow`,
    trigger: processMap.trigger ?? 'Workflow initiated',
    outcome: processMap.outcome ?? 'Workflow completed',
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
      systemInteractions.push({
        taskId: node.stepId,
        type: 'send',
        system: node.metadata.systems[0] ?? 'System',
        description: `Submit data to ${node.metadata.systems[0] ?? 'system'}`,
      });
    }
  }

  // Build exception flows
  const exceptionFlows: BPMNExceptionFlow[] = [];
  for (let i = 0; i < taskNodes.length; i++) {
    const node = taskNodes[i]!;
    if (node.nodeType === 'exception') {
      const precedingNode = taskNodes[i - 1];
      const sopStep = sop.steps.find(s => s.stepId === node.stepId);
      exceptionFlows.push({
        sourceTaskId: precedingNode?.stepId ?? 'unknown',
        errorLabel: `Error at step ${precedingNode?.ordinal ?? '?'}`,
        handlingSteps: sopStep
          ? sopStep.instructions.map(inst => inst.instruction)
          : ['Resolve the error'],
        resolution: 'Continue to next step after resolution',
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

  // Risk highlights from friction
  const riskHighlights: string[] = [];
  for (const f of (processMap.frictionSummary ?? [])) {
    if (f.severity === 'high' || f.severity === 'medium') {
      riskHighlights.push(f.label);
    }
  }
  if (riskHighlights.length === 0 && (sop.commonIssues?.length ?? 0) > 0) {
    for (const issue of sop.commonIssues!) {
      riskHighlights.push(issue.title);
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
