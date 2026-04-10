/**
 * SOP template renderers.
 *
 * Three rendering modes that consume ProcessOutput and produce structured
 * SOP artifacts:
 *
 * 1. Operator-Centric — frontline execution focus (default)
 * 2. Enterprise — formal governance documentation
 * 3. Decision-Based — branch-heavy and triage workflows
 *
 * All renderers are pure and deterministic.
 */

import type { ProcessOutput } from '../types.js';
import { PROCESS_ENGINE_VERSION } from '../types.js';
import type {
  OperatorSOP,
  OperatorSOPStep,
  EnterpriseSOP,
  EnterpriseSOPStep,
  EnterpriseSOPDecision,
  DecisionSOP,
  DecisionSOPBranch,
  RenderedSOP,
  SOPTemplateType,
} from '../templateTypes.js';
import {
  primaryInstruction,
  stepCaution,
  deriveCommonMistakes,
  deriveTips,
} from './renderHelpers.js';

// ─── Quality advisory ────────────────────────────────────────────────────────

/**
 * Build a human-readable quality advisory message when some steps have
 * low label confidence. Returns undefined when quality is adequate.
 *
 * Examples:
 *   "3 of 12 steps have low label confidence — consider reviewing these
 *    steps manually before sharing this SOP."
 *   "1 of 5 steps has low label confidence — review step 3 manually."
 */
function buildQualityAdvisory(output: ProcessOutput): string | undefined {
  const qi = output.sop.qualityIndicators;
  if (!qi) return undefined;

  const lowCount = qi.lowConfidenceStepCount;
  const total = output.sop.steps.length;

  if (lowCount === 0) return undefined;

  // Identify which step numbers have low confidence
  const lowSteps = output.sop.steps
    .filter(s => s.confidence < 0.7)
    .map(s => s.ordinal);

  const stepRef = lowSteps.length <= 3
    ? ` (step${lowSteps.length > 1 ? 's' : ''} ${lowSteps.join(', ')})`
    : '';

  const verb = lowCount === 1 ? 'has' : 'have';
  return `${lowCount} of ${total} step${total !== 1 ? 's' : ''} ${verb} low label confidence${stepRef} — consider reviewing ${lowCount === 1 ? 'this step' : 'these steps'} manually before sharing this document.`;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function renderSOP(
  output: ProcessOutput,
  template: SOPTemplateType,
): RenderedSOP {
  switch (template) {
    case 'operator_centric': return renderOperatorCentric(output);
    case 'enterprise':       return renderEnterprise(output);
    case 'decision_based':   return renderDecisionBased(output);
  }
}

// ─── 1. Operator-Centric SOP ─────────────────────────────────────────────────

function renderOperatorCentric(output: ProcessOutput): OperatorSOP {
  const { sop } = output;

  const steps: OperatorSOPStep[] = sop.steps.map(step => ({
    number: step.ordinal,
    action: step.title,
    detail: primaryInstruction(step),
    system: step.system ?? '',
    expectedResult: step.expectedOutcome,
    caution: stepCaution(step),
  }));

  return {
    templateType: 'operator_centric',
    taskTitle: sop.title,
    whatThisIsFor: sop.businessObjective ?? sop.purpose,
    whenToUseIt: sop.trigger ?? deriveWhenToUseIt(sop.title),
    beforeYouBegin: sop.prerequisites,
    systemsNeeded: sop.systems,
    steps,
    commonMistakes: deriveCommonMistakes(output),
    tips: deriveTips(output),
    completionCheck: sop.completionCriteria,
    sourceNote: `This procedure was derived from observed workflow activity in ${sop.systems.join(' and ') || 'the target system'}. All ${sop.steps.length} steps are evidence-linked.`,
    qualityAdvisory: buildQualityAdvisory(output),
  };
}

/**
 * Derives a contextual "when to use" clause from the activity name pattern.
 * Recognizes common verb patterns (process, review, create, update, submit, approve).
 */
function deriveWhenToUseIt(title: string): string {
  const lower = title.toLowerCase();
  if (lower.startsWith('process '))  return `When a new ${lower.replace('process ', '')} needs to be processed`;
  if (lower.startsWith('review '))   return `When a ${lower.replace('review ', '')} is ready for review`;
  if (lower.startsWith('create '))   return `When a new ${lower.replace('create ', '')} needs to be created`;
  if (lower.startsWith('update '))   return `When an existing ${lower.replace('update ', '')} requires updates`;
  if (lower.startsWith('submit '))   return `When a ${lower.replace('submit ', '')} is ready for submission`;
  if (lower.startsWith('approve '))  return `When a ${lower.replace('approve ', '')} requires approval`;
  return `When you need to ${lower}`;
}

// ─── 2. Enterprise SOP ───────────────────────────────────────────────────────

function renderEnterprise(output: ProcessOutput): EnterpriseSOP {
  const { sop, processDefinition } = output;

  // Roles and responsibilities
  const roles = (sop.roles ?? ['Operator']).map(role => ({
    role,
    responsibility: deriveRoleResponsibility(role, output),
  }));

  // Procedure steps
  const procedure: EnterpriseSOPStep[] = sop.steps.map(step => {
    const stepDef = processDefinition.stepDefinitions.find(s => s.stepId === step.stepId);
    return {
      ordinal: step.ordinal,
      title: step.title,
      instruction: primaryInstruction(step),
      actor: step.actor ?? 'Operator',
      system: step.system ?? '',
      inputs: stepDef?.inputs ?? step.inputs,
      outputs: stepDef?.outputs ?? [],
      verificationPoint: step.expectedOutcome,
    };
  });

  // Decision points
  const decisionPoints: EnterpriseSOPDecision[] = sop.steps
    .filter(s => s.isDecisionPoint && s.decisionLabel)
    .map(step => {
      const nextStep = sop.steps.find(s => s.ordinal === step.ordinal + 1);
      const isNextError = nextStep?.category === 'error_handling';
      const successAction = sop.steps.find(s => s.ordinal > step.ordinal && s.category !== 'error_handling');
      const successLabel = step.system
        ? `${step.system} accepts the submission`
        : 'Validation passes';
      const failureLabel = step.system
        ? `${step.system} returns an error`
        : 'Validation fails';
      const failureAction = isNextError && nextStep
        ? `${nextStep.title} (step ${nextStep.ordinal}), then retry`
        : successAction
          ? `Resolve the issue, then resume at step ${successAction.ordinal}`
          : 'Resolve the error (see exception handling) then retry';

      return {
        atStepOrdinal: step.ordinal,
        question: step.decisionLabel!,
        options: [
          { condition: successLabel, action: successAction ? `Continue to step ${successAction.ordinal}: ${successAction.title}` : 'Continue to next step' },
          { condition: failureLabel, action: failureAction },
        ],
      };
    });

  // Controls / checkpoints
  const controls: string[] = [];
  const sensitiveSteps = sop.steps.filter(s => s.warnings.length > 0);
  if (sensitiveSteps.length > 0) {
    controls.push(`${sensitiveSteps.length} step(s) involve sensitive data — verify data handling compliance`);
  }
  if (decisionPoints.length > 0) {
    controls.push(`${decisionPoints.length} decision checkpoint(s) require verification before proceeding`);
  }
  controls.push('Verify system confirmation at each submission step before continuing');

  // Risks
  const risks: string[] = [];
  for (const issue of (sop.commonIssues ?? [])) {
    risks.push(`${issue.title}: ${issue.description}`);
  }
  for (const f of (sop.frictionSummary ?? []).filter(f => f.severity !== 'low')) {
    risks.push(f.label);
  }
  if (risks.length === 0) {
    risks.push('Standard operational risk — follow procedure steps in sequence to minimize errors');
  }

  return {
    templateType: 'enterprise',
    title: sop.title,
    sopId: sop.sopId,
    version: sop.version,
    purpose: sop.purpose,
    scope: sop.scope,
    trigger: sop.trigger ?? `When ${sop.title.toLowerCase()} is required`,
    rolesAndResponsibilities: roles,
    prerequisites: sop.prerequisites,
    inputs: sop.inputs,
    systemsAndTools: sop.systems,
    procedure,
    decisionPoints,
    controls,
    risks,
    outputs: sop.outputs,
    completionCriteria: sop.completionCriteria,
    sourceNote: `This SOP was derived from observed workflow behavior in ${sop.systems.join(' and ') || 'the target system'}. All ${sop.steps.length} procedure steps are evidence-based and traceable to source events.`,
    qualityAdvisory: buildQualityAdvisory(output),
    revisionMetadata: {
      generatedAt: sop.generatedAt,
      engineVersion: PROCESS_ENGINE_VERSION,
      basedOn: `Recorded session ${output.processRun.sessionId}`,
    },
  };
}

function deriveRoleResponsibility(role: string, output: ProcessOutput): string {
  const stepCount = output.sop.steps.length;
  const systemList = output.processMap.systems.join(' and ') || 'the target system';
  const activityName = output.sop.title;

  if (role === 'Cross-functional operator') {
    return `Execute all ${stepCount} steps of "${activityName}" across ${systemList}, ensuring data consistency at each handoff`;
  }
  if (role === 'Document preparer') {
    return `Prepare and attach required documentation for "${activityName}" in ${systemList}`;
  }
  return `Execute the ${stepCount}-step "${activityName}" procedure in ${systemList}`;
}

// ─── 3. Decision-Based SOP ───────────────────────────────────────────────────

function renderDecisionBased(output: ProcessOutput): DecisionSOP {
  const { sop } = output;

  // Build branches from decision points and exception patterns
  const branches: DecisionSOPBranch[] = [];

  // Group steps into branches based on decision points
  const decisionSteps = sop.steps.filter(s => s.isDecisionPoint);
  const errorSteps = sop.steps.filter(s => s.category === 'error_handling');

  if (decisionSteps.length > 0 || errorSteps.length > 0) {
    // Happy path branch — all non-error steps in sequence
    const happyPathSteps = sop.steps.filter(s => s.category !== 'error_handling');
    branches.push({
      condition: 'Standard flow — no errors encountered',
      actions: happyPathSteps.map(step => ({
        ordinal: step.ordinal,
        instruction: `${step.title}: ${primaryInstruction(step)}`,
        system: step.system ?? '',
      })),
      outcome: sop.completionCriteria[0] ?? 'Workflow completes successfully',
    });

    // Error path branches — one per decision point
    for (const decision of decisionSteps) {
      const errorStep = sop.steps.find(
        s => s.category === 'error_handling' && s.ordinal === decision.ordinal + 1,
      );
      if (errorStep) {
        const errorContext = errorStep.system ? ` in ${errorStep.system}` : '';
        branches.push({
          condition: `${decision.decisionLabel ?? 'Validation fails'} — error at step ${decision.ordinal}`,
          actions: [
            {
              ordinal: 1,
              instruction: `Review the error${errorContext}: ${primaryInstruction(errorStep)}`,
              system: errorStep.system ?? '',
            },
            {
              ordinal: 2,
              instruction: `Correct the data per the error message and resubmit at step ${decision.ordinal} (${decision.title})`,
              system: decision.system ?? '',
            },
          ],
          outcome: `Error resolved — resume standard flow at step ${decision.ordinal}`,
        });
      }
    }
  } else {
    // No explicit decisions — create a single linear branch
    branches.push({
      condition: 'Standard execution path',
      actions: sop.steps.map(step => ({
        ordinal: step.ordinal,
        instruction: `${step.title}: ${primaryInstruction(step)}`,
        system: step.system ?? '',
      })),
      outcome: sop.completionCriteria[0] ?? 'Workflow completes',
    });
  }

  // Escalation rules
  const escalationRules: string[] = [];
  if (errorSteps.length >= 2) {
    escalationRules.push('If the same error recurs after correction, escalate to a supervisor or system administrator');
  }
  if (output.processMap.systems.length > 1) {
    escalationRules.push('If a cross-system handoff fails, contact the receiving system\'s support team');
  }
  escalationRules.push('If the workflow cannot be completed after following all exception paths, document the issue and escalate per team policy');

  // Exception handling
  const exceptionHandling: string[] = [];
  for (const issue of (sop.commonIssues ?? [])) {
    exceptionHandling.push(`${issue.title}: ${issue.description}`);
  }
  if (exceptionHandling.length === 0) {
    exceptionHandling.push('No specific exceptions were observed in this workflow recording. Follow standard error handling procedures if issues arise.');
  }

  // Resolution outcomes
  const resolutionOutcomes = sop.completionCriteria.length > 0
    ? sop.completionCriteria
    : ['Workflow completed as documented'];

  // Documentation requirements
  const docRequirements = [
    'Record any deviations from the standard procedure',
    'Note the resolution path taken if an exception occurred',
  ];
  if (sop.systems.length > 1) {
    docRequirements.push(`Confirm successful completion in all ${sop.systems.length} systems`);
  }

  return {
    templateType: 'decision_based',
    title: sop.title,
    purpose: sop.purpose,
    triggerCondition: sop.trigger ?? `When ${sop.title.toLowerCase()} is required`,
    inputsNeeded: sop.inputs.length > 0 ? sop.inputs : sop.prerequisites,
    initialAssessment: buildInitialAssessment(output),
    branches,
    escalationRules,
    exceptionHandling,
    resolutionOutcomes,
    completionCriteria: sop.completionCriteria,
    documentationRequirements: docRequirements,
    sourceNote: `This procedure was derived from observed workflow behavior in ${sop.systems.join(' and ') || 'the target system'}. Branch logic reflects ${branches.length} path${branches.length !== 1 ? 's' : ''} observed during execution.`,
    qualityAdvisory: buildQualityAdvisory(output),
  };
}

function buildInitialAssessment(output: ProcessOutput): string {
  const { sop } = output;
  const parts: string[] = [];

  parts.push(`Verify you have access to: ${sop.systems.join(', ') || 'the required system'}.`);

  if (sop.prerequisites.length > 0) {
    parts.push(`Confirm prerequisites: ${sop.prerequisites[0]}.`);
  }

  const decisionCount = sop.steps.filter(s => s.isDecisionPoint).length;
  if (decisionCount > 0) {
    parts.push(`This workflow contains ${decisionCount} decision point${decisionCount > 1 ? 's' : ''} where the path may vary based on system response.`);
  }

  return parts.join(' ');
}
