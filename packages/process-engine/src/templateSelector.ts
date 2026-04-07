/**
 * Template selector — deterministic rules for choosing the best process map
 * and SOP template based on observed workflow characteristics.
 *
 * Selection is pure and deterministic: same ProcessOutput always produces
 * the same template choice.
 *
 * Selection can be overridden manually via the `overrides` parameter.
 */

import type { ProcessOutput } from './types.js';
import type {
  ProcessMapTemplateType,
  SOPTemplateType,
  TemplateSelection,
} from './templateTypes.js';

// ─── Selection overrides ─────────────────────────────────────────────────────

export interface TemplateOverrides {
  processMap?: ProcessMapTemplateType;
  sop?: SOPTemplateType;
}

// ─── Main selector ───────────────────────────────────────────────────────────

export function selectTemplates(
  output: ProcessOutput,
  overrides?: TemplateOverrides,
): TemplateSelection {
  return {
    processMap: overrides?.processMap
      ? { template: overrides.processMap, rationale: 'Manual override' }
      : selectProcessMapTemplate(output),
    sop: overrides?.sop
      ? { template: overrides.sop, rationale: 'Manual override' }
      : selectSOPTemplate(output),
  };
}

// ─── Process map selection ───────────────────────────────────────────────────

function selectProcessMapTemplate(
  output: ProcessOutput,
): TemplateSelection['processMap'] {
  const { processMap, processDefinition, sop } = output;
  const steps = processDefinition.stepDefinitions;

  // Metric extraction
  const stepCount = steps.length;
  const systemCount = processMap.systems.length;
  const decisionNodeCount = processMap.nodes.filter(n => n.nodeType === 'decision').length;
  const exceptionNodeCount = processMap.nodes.filter(n => n.nodeType === 'exception').length;
  // Check if any step has system-actor events (more events than human events)
  const hasSystemEvents = processMap.nodes.some(
    n => n.nodeType !== 'start' && n.nodeType !== 'end' &&
      n.metadata.humanEventCount < n.metadata.eventCount,
  );
  const branchingRatio = stepCount > 0
    ? (decisionNodeCount + exceptionNodeCount) / stepCount
    : 0;

  // Rule 1: SIPOC for very short workflows or summary-level output
  if (stepCount <= 3) {
    return {
      template: 'sipoc_high_level',
      rationale: `Only ${stepCount} steps — high-level summary view is most appropriate`,
    };
  }

  // Rule 2: BPMN-informed for complex branching, retries, or heavy system interaction
  if (
    branchingRatio >= 0.3 ||
    (decisionNodeCount >= 2 && exceptionNodeCount >= 2) ||
    (hasSystemEvents && branchingRatio >= 0.2)
  ) {
    return {
      template: 'bpmn_informed',
      rationale: `High branching ratio (${Math.round(branchingRatio * 100)}%) with ${decisionNodeCount} decision points and ${exceptionNodeCount} exception paths — BPMN notation provides clearer flow representation`,
    };
  }

  // Rule 3: Cross-functional swimlane is the default for most workflows
  return {
    template: 'swimlane',
    rationale: systemCount > 1
      ? `${stepCount} steps across ${systemCount} systems — swimlane view shows ownership and handoffs clearly`
      : `${stepCount} steps in ${processMap.systems[0] ?? 'single system'} — swimlane is the standard default view`,
  };
}

// ─── SOP selection ───────────────────────────────────────────────────────────

function selectSOPTemplate(
  output: ProcessOutput,
): TemplateSelection['sop'] {
  const { sop, processDefinition } = output;
  const steps = sop.steps;

  // Metric extraction
  const stepCount = steps.length;
  const decisionStepCount = steps.filter(s => s.isDecisionPoint === true).length;
  const errorStepCount = steps.filter(s => s.category === 'error_handling').length;
  const branchRatio = stepCount > 0
    ? (decisionStepCount + errorStepCount) / stepCount
    : 0;
  const systemCount = sop.systems.length;
  const hasCommonIssues = (sop.commonIssues?.length ?? 0) > 0;
  const hasFriction = (sop.frictionSummary?.length ?? 0) > 0;

  // Rule 1: Decision-based SOP when branching dominates
  if (
    branchRatio >= 0.3 ||
    (decisionStepCount >= 2 && errorStepCount >= 2) ||
    (hasCommonIssues && branchRatio >= 0.2)
  ) {
    return {
      template: 'decision_based',
      rationale: `${decisionStepCount} decision points and ${errorStepCount} exception steps (${Math.round(branchRatio * 100)}% branch ratio) — decision-based format makes conditional logic explicit`,
    };
  }

  // Rule 2: Enterprise SOP for formal multi-system workflows
  if (
    systemCount >= 3 ||
    (stepCount >= 8 && systemCount >= 2) ||
    (stepCount >= 10 && hasFriction)
  ) {
    return {
      template: 'enterprise',
      rationale: systemCount >= 3
        ? `${systemCount} systems involved — enterprise format provides governance structure`
        : `${stepCount} steps across ${systemCount} systems — enterprise format supports formal documentation needs`,
    };
  }

  // Rule 3: Operator-centric is the default for most workflows
  return {
    template: 'operator_centric',
    rationale: `${stepCount} steps — operator-centric format prioritizes execution clarity and frontline usability`,
  };
}
