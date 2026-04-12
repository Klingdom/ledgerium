/**
 * SOP View Model — Normalized Data Layer
 *
 * Transforms raw SOP + template artifacts into a display-ready view model
 * supporting all three SOP modes (Execution, Visual Process, Intelligence).
 *
 * Guarantees:
 * - Every field is non-null with sensible defaults
 * - Step labels are humanized (weak labels improved with context)
 * - Missing data degrades gracefully (no undefined in UI)
 * - Enterprise, operator, and decision template data is extracted when available
 */

import { CATEGORY_STYLES, confidenceColor } from '../../workflow-view/constants';
import { humanizeStepLabel, humanizeShortLabel, humanizeInstructionText } from '../../shared/humanize';
import type { InstructionContext } from '../../shared/humanize';
import type {
  SOPViewModel,
  SOPMetadata,
  SOPViewStep,
  SOPViewInstruction,
  SOPViewFriction,
  SOPViewPhase,
  SOPViewDecision,
  SOPViewIssue,
  SOPViewInsight,
  SOPRecommendation,
  SOPQuickStart,
  SOPWorkflowDNA,
  SOPSmartSummary,
  SOPEnterpriseData,
  RecommendationType,
} from '../types';

// ═════════════════════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═════════════════════════════════════════════════════════════════════════════

export function buildSOPViewModel(
  rawSop: any,
  workflowRecord?: { id: string; title: string; confidence: number | null; createdAt: string; status: string },
  templateArtifacts?: { operator_centric?: any; enterprise?: any; decision_based?: any },
): SOPViewModel | null {
  if (!rawSop) return null;

  const qi = rawSop.qualityIndicators;
  const frictionAll: any[] = rawSop.frictionSummary ?? [];
  const commonIssues: any[] = rawSop.commonIssues ?? [];
  const operatorData = templateArtifacts?.operator_centric;
  const enterpriseData = templateArtifacts?.enterprise;

  // ── Metadata ─────────────────────────────────────────────────────────────

  const avgConf = qi?.averageConfidence ?? null;
  const confLabel = avgConf !== null
    ? avgConf >= 0.85 ? 'High' : avgConf >= 0.7 ? 'Moderate' : 'Low'
    : 'Unknown';

  const metadata: SOPMetadata = {
    id: workflowRecord?.id ?? rawSop.sopId ?? '',
    title: workflowRecord?.title ?? rawSop.title ?? '',
    objective: rawSop.businessObjective ?? rawSop.purpose ?? '',
    purpose: rawSop.purpose ?? '',
    scope: rawSop.scope ?? '',
    trigger: rawSop.trigger ?? '',
    estimatedTime: rawSop.estimatedTime ?? '',
    stepCount: rawSop.steps?.length ?? 0,
    systems: rawSop.systems ?? [],
    roles: rawSop.roles ?? [],
    confidence: workflowRecord?.confidence ?? avgConf,
    confidenceLabel: confLabel,
    status: workflowRecord?.status ?? 'active',
    createdAt: workflowRecord?.createdAt ?? rawSop.generatedAt ?? '',
    frictionCount: frictionAll.length,
    errorStepCount: qi?.errorStepCount ?? 0,
    lowConfidenceStepCount: qi?.lowConfidenceStepCount ?? 0,
    isComplete: qi?.isComplete ?? true,
    version: rawSop.version ?? '1.0',
    sourceNote: `Derived from observed workflow behavior. ${rawSop.steps?.length ?? 0} steps, evidence-linked.`,
  };

  // ── Steps (normalized + humanized) ───────────────────────────────────────

  const rawSteps: any[] = rawSop.steps ?? [];
  const steps: SOPViewStep[] = rawSteps.map((s, i) => normalizeStep(s, rawSteps, i));

  // ── Phases ───────────────────────────────────────────────────────────────

  const phases: SOPViewPhase[] = buildPhases(steps);

  // ── Decisions ────────────────────────────────────────────────────────────

  const decisions: SOPViewDecision[] = buildDecisions(rawSteps);

  // ── Issues ───────────────────────────────────────────────────────────────

  const issues: SOPViewIssue[] = commonIssues.map((ci: any) => ({
    title: safe(ci.title, 'Issue detected'),
    description: safe(ci.description, ''),
    affectedStepOrdinals: ci.stepOrdinals ?? [],
  }));

  // ── Insights ─────────────────────────────────────────────────────────────

  const insights = buildInsights(frictionAll, metadata, rawSteps);

  // ── Recommendations (intelligence mode) ──────────────────────────────────

  const recommendations = buildRecommendations(steps, frictionAll, metadata);

  // ── Quick start (execution mode) ─────────────────────────────────────────

  const quickStart: SOPQuickStart = {
    trigger: metadata.trigger || `When you need to ${metadata.title.toLowerCase()}`,
    prerequisites: rawSop.prerequisites ?? [],
    systemsNeeded: metadata.systems,
    estimatedTime: metadata.estimatedTime || '',
    whenToUseIt: operatorData?.whenToUseIt ?? deriveWhenToUseIt(metadata.title),
    isReady: (rawSop.prerequisites ?? []).length <= 3,
  };

  // ── Workflow DNA (visual mode) ───────────────────────────────────────────

  const workflowDNA = buildWorkflowDNA(steps, phases);

  // ── Smart summary (intelligence mode) ────────────────────────────────────

  const smartSummary = buildSmartSummary(metadata, steps, frictionAll);

  // ── Enterprise enrichment ────────────────────────────────────────────────

  const enterprise: SOPEnterpriseData = {
    rolesAndResponsibilities: enterpriseData?.rolesAndResponsibilities ?? [],
    controls: enterpriseData?.controls ?? [],
    risks: enterpriseData?.risks ?? [],
    revisionMetadata: enterpriseData?.revisionMetadata ?? null,
  };

  // ── Template-derived data ────────────────────────────────────────────────

  const tips: string[] = operatorData?.tips ?? [];
  const commonMistakes: string[] = operatorData?.commonMistakes ?? [];
  const qualityAdvisory = operatorData?.qualityAdvisory ?? qi?.qualityAdvisory ?? null;

  return {
    metadata,
    steps,
    phases,
    decisions,
    issues,
    insights,
    recommendations,
    prerequisites: rawSop.prerequisites ?? [],
    completionCriteria: rawSop.completionCriteria ?? [],
    tips,
    commonMistakes,
    qualityAdvisory,
    quickStart,
    workflowDNA,
    smartSummary,
    enterprise,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP NORMALIZATION + LABEL HUMANIZATION
// ═════════════════════════════════════════════════════════════════════════════

function normalizeStep(raw: any, allSteps: any[], index: number): SOPViewStep {
  const cat = raw.category ?? 'single_action';
  const style = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
  const frictionRaw: any[] = raw.frictionIndicators ?? [];
  const sys = safe(raw.system, '');

  // Normalize instructions with humanized text
  const rawInstructions: any[] = raw.instructions ?? [];
  const instructions: SOPViewInstruction[] = rawInstructions.map((inst: any) => ({
    sequence: inst.sequence ?? 0,
    text: humanizeInstructionText(
      safe(inst.instruction, ''),
      safe(inst.targetLabel, ''),
      safe(inst.system, sys),
    ),
    type: (['action', 'wait', 'verify', 'note'].includes(inst.instructionType) ? inst.instructionType : 'action') as SOPViewInstruction['type'],
    system: safe(inst.system, ''),
    isSensitive: inst.isSensitive === true,
    targetLabel: safe(inst.targetLabel, ''),
  }));

  // Build instruction context for the humanizer
  const instructionCtx: InstructionContext[] = instructions.map(i => ({
    text: i.text,
    type: i.type,
    system: i.system,
    targetLabel: i.targetLabel,
    isSensitive: i.isSensitive,
  }));

  // Humanize step title using the shared humanizer
  const humanizedTitle = humanizeStepLabel({
    rawTitle: raw.title ?? '',
    category: cat,
    categoryLabel: style.label,
    system: sys || undefined,
    action: raw.action,
    instructions: instructionCtx,
    ordinal: raw.ordinal ?? index + 1,
  });

  const isErrorHandling = cat === 'error_handling';
  const automationHint = deriveAutomationHint(cat, instructions, raw);

  // Humanize the action field too
  const rawAction = safe(raw.action, '');
  const humanizedAction = rawAction && rawAction !== humanizedTitle ? rawAction : humanizedTitle;

  return {
    id: raw.stepId ?? `step-${raw.ordinal ?? index + 1}`,
    ordinal: raw.ordinal ?? index + 1,
    title: humanizedTitle,
    shortTitle: humanizeShortLabel(humanizedTitle),
    action: humanizedAction,
    category: cat,
    categoryLabel: style.label,
    accentColor: style.color,
    bgColor: style.bg,
    textColor: style.text,
    system: sys,
    actor: safe(raw.actor, ''),
    durationLabel: safe(raw.durationLabel, ''),
    confidence: raw.confidence ?? 0.5,
    isLowConfidence: (raw.confidence ?? 0.5) < 0.7,
    isDecisionPoint: raw.isDecisionPoint === true,
    decisionLabel: safe(raw.decisionLabel, ''),
    hasSensitiveData: (raw.warnings ?? []).length > 0 || instructions.some(i => i.isSensitive),
    expectedOutcome: safe(raw.expectedOutcome, ''),
    warnings: raw.warnings ?? [],
    instructions,
    detailText: humanizeDetailText(raw.detail ?? '', sys),
    inputs: raw.inputs ?? [],
    frictionIndicators: frictionRaw.map(normalizeFriction),
    hasHighFriction: frictionRaw.some((f: any) => f.severity === 'high'),
    phaseId: '',
    isErrorHandling,
    automationHint,
  };
}

/** Humanize the pre-formatted detail text (numbered instruction lines). */
function humanizeDetailText(detail: string, system: string): string {
  if (!detail) return '';
  return detail.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    // Check if line contains a known weak instruction phrase
    if (trimmed.includes('Click the target element') || trimmed.includes('Enter the required value')) {
      // Extract the number prefix
      const match = trimmed.match(/^(\d+\.\s*)/);
      const prefix = match?.[1] ?? '';
      const rest = trimmed.slice(prefix.length);
      const humanized = humanizeInstructionText(rest, '', system);
      return prefix + humanized;
    }
    return line;
  }).join('\n');
}

// Step title humanization moved to shared/humanize.ts
// SOP adapter uses humanizeStepLabel() from the shared module

function deriveAutomationHint(category: string, instructions: SOPViewInstruction[], raw: any): string | null {
  // Data entry with multiple field inputs = strong automation candidate
  if (category === 'data_entry' && instructions.filter(i => i.type === 'action').length >= 3) {
    return 'Multiple data entry fields — candidate for form auto-fill';
  }
  // Repeated clicks = possible macro/shortcut
  if (category === 'repeated_click_dedup') {
    return 'Repeated action — consider keyboard shortcut or macro';
  }
  // File actions = potential API integration
  if (category === 'file_action') {
    return 'File operation — candidate for automated file handling';
  }
  // Send/submit with system = potential API trigger
  if (category === 'send_action' && raw.system) {
    return `Submission to ${raw.system} — candidate for API automation`;
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE BUILDING
// ═════════════════════════════════════════════════════════════════════════════

function buildPhases(steps: SOPViewStep[]): SOPViewPhase[] {
  const phases: SOPViewPhase[] = [];
  let currentSystem = '';
  let currentPhase: SOPViewPhase | null = null;

  for (const step of steps) {
    const sys = step.system || 'General';
    if (sys !== currentSystem || !currentPhase) {
      currentPhase = {
        id: `phase-${phases.length + 1}`,
        label: sys,
        system: sys,
        stepIds: [],
        stepCount: 0,
        totalDuration: '',
        color: step.accentColor,
        hasFriction: false,
      };
      phases.push(currentPhase);
      currentSystem = sys;
    }
    currentPhase.stepIds.push(step.id);
    currentPhase.stepCount++;
    if (step.hasHighFriction || step.frictionIndicators.length > 0) {
      currentPhase.hasFriction = true;
    }
    step.phaseId = currentPhase.id;
  }

  return phases;
}

// ═════════════════════════════════════════════════════════════════════════════
// DECISION BUILDING
// ═════════════════════════════════════════════════════════════════════════════

function buildDecisions(rawSteps: any[]): SOPViewDecision[] {
  return rawSteps
    .filter((s: any) => s.isDecisionPoint && s.decisionLabel)
    .map((s: any) => {
      const nextStep = rawSteps.find((n: any) => n.ordinal === s.ordinal + 1);
      const isNextError = nextStep?.category === 'error_handling';
      return {
        stepOrdinal: s.ordinal,
        stepId: safe(s.stepId, `step-${s.ordinal}`),
        question: s.decisionLabel,
        options: [
          {
            condition: s.system ? `${s.system} accepts` : 'Validation passes',
            action: 'Continue to next step',
          },
          ...(isNextError ? [{
            condition: s.system ? `${s.system} returns error` : 'Validation fails',
            action: `Resolve error (step ${nextStep.ordinal}), then retry`,
          }] : []),
        ],
      };
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// INSIGHT BUILDING
// ═════════════════════════════════════════════════════════════════════════════

function buildInsights(frictionAll: any[], metadata: SOPMetadata, rawSteps: any[]): SOPViewInsight[] {
  const insights: SOPViewInsight[] = [];

  // Friction-derived insights
  frictionAll.forEach((f: any, i: number) => {
    insights.push({
      id: `friction-${i}`,
      label: safe(f.label, 'Friction detected'),
      detail: safe(f.label, ''),
      severity: f.severity === 'high' ? 'critical' : f.severity === 'medium' ? 'warning' : 'info',
      affectedStepOrdinals: f.stepOrdinals ?? [],
    });
  });

  // Error steps
  if (metadata.errorStepCount > 0) {
    insights.unshift({
      id: 'errors',
      label: `${metadata.errorStepCount} error step${metadata.errorStepCount !== 1 ? 's' : ''} in procedure`,
      detail: 'Error handling steps indicate the process encounters failures that require recovery.',
      severity: 'warning',
      affectedStepOrdinals: rawSteps.filter((s: any) => s.category === 'error_handling').map((s: any) => s.ordinal),
    });
  }

  // Low confidence
  if (metadata.lowConfidenceStepCount > 0) {
    insights.push({
      id: 'low-confidence',
      label: `${metadata.lowConfidenceStepCount} step${metadata.lowConfidenceStepCount !== 1 ? 's' : ''} with low label confidence`,
      detail: 'These steps may have unclear or generic labels. Consider reviewing them manually.',
      severity: 'info',
      affectedStepOrdinals: rawSteps.filter((s: any) => (s.confidence ?? 0.5) < 0.7).map((s: any) => s.ordinal),
    });
  }

  // Multi-system complexity
  if (metadata.systems.length >= 3) {
    insights.push({
      id: 'multi-system',
      label: `Process spans ${metadata.systems.length} systems`,
      detail: `This procedure requires working across ${metadata.systems.join(', ')}. Cross-system handoffs are a common source of errors.`,
      severity: 'info',
      affectedStepOrdinals: [],
    });
  }

  return insights;
}

// ═════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION BUILDING
// ═════════════════════════════════════════════════════════════════════════════

function buildRecommendations(
  steps: SOPViewStep[],
  frictionAll: any[],
  metadata: SOPMetadata,
): SOPRecommendation[] {
  const recs: SOPRecommendation[] = [];
  let recId = 0;

  // Automation candidates: data entry + file action steps
  const dataEntrySteps = steps.filter(s => s.category === 'data_entry' && s.instructions.filter(i => i.type === 'action').length >= 3);
  if (dataEntrySteps.length > 0) {
    recs.push({
      id: `rec-${++recId}`,
      type: 'automation',
      title: 'Automate repetitive data entry',
      detail: `${dataEntrySteps.length} step${dataEntrySteps.length !== 1 ? 's' : ''} involve multiple field entries. Consider form auto-fill or API integration.`,
      affectedStepOrdinals: dataEntrySteps.map(s => s.ordinal),
      impact: dataEntrySteps.length >= 3 ? 'high' : 'medium',
    });
  }

  // Integration candidates: cross-system send/submit
  const sendSteps = steps.filter(s => s.category === 'send_action' && s.system);
  if (sendSteps.length > 0 && metadata.systems.length >= 2) {
    recs.push({
      id: `rec-${++recId}`,
      type: 'integration',
      title: 'Connect systems via API',
      detail: `${sendSteps.length} submission step${sendSteps.length !== 1 ? 's' : ''} could be automated with system integrations between ${metadata.systems.join(' and ')}.`,
      affectedStepOrdinals: sendSteps.map(s => s.ordinal),
      impact: 'medium',
    });
  }

  // Simplification: excessive navigation
  const navSteps = steps.filter(s => s.category === 'click_then_navigate');
  if (navSteps.length >= 4) {
    recs.push({
      id: `rec-${++recId}`,
      type: 'simplification',
      title: 'Reduce navigation overhead',
      detail: `${navSteps.length} navigation steps suggest the user must click through multiple pages. Consider direct links or bookmarks.`,
      affectedStepOrdinals: navSteps.map(s => s.ordinal),
      impact: navSteps.length >= 6 ? 'high' : 'medium',
    });
  }

  // Training: low confidence steps
  const lowConfSteps = steps.filter(s => s.isLowConfidence);
  if (lowConfSteps.length >= 2) {
    recs.push({
      id: `rec-${++recId}`,
      type: 'training',
      title: 'Review ambiguous steps',
      detail: `${lowConfSteps.length} steps have low label confidence. These may benefit from clearer naming or additional documentation.`,
      affectedStepOrdinals: lowConfSteps.map(s => s.ordinal),
      impact: 'low',
    });
  }

  // Quality: high friction
  const highFrictionSteps = steps.filter(s => s.hasHighFriction);
  if (highFrictionSteps.length > 0) {
    recs.push({
      id: `rec-${++recId}`,
      type: 'quality',
      title: 'Address high-friction steps',
      detail: `${highFrictionSteps.length} step${highFrictionSteps.length !== 1 ? 's' : ''} have high friction. These are the top candidates for process improvement.`,
      affectedStepOrdinals: highFrictionSteps.map(s => s.ordinal),
      impact: 'high',
    });
  }

  return recs.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return (impactOrder[a.impact as keyof typeof impactOrder] ?? 2) - (impactOrder[b.impact as keyof typeof impactOrder] ?? 2);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW DNA (mini process map preview)
// ═════════════════════════════════════════════════════════════════════════════

function buildWorkflowDNA(steps: SOPViewStep[], phases: SOPViewPhase[]): SOPWorkflowDNA {
  const stepDots = steps.map(s => ({
    ordinal: s.ordinal,
    category: s.category,
    color: s.accentColor,
    isDecision: s.isDecisionPoint,
    isError: s.isErrorHandling,
  }));

  // Identify phase break positions (where system changes)
  const phaseBreaks: number[] = [];
  for (let i = 1; i < steps.length; i++) {
    if (steps[i]!.phaseId !== steps[i - 1]!.phaseId) {
      phaseBreaks.push(steps[i]!.ordinal);
    }
  }

  const systems = new Set(steps.map(s => s.system).filter(Boolean));

  return {
    stepDots,
    phaseBreaks,
    systemCount: systems.size,
    totalSteps: steps.length,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SMART SUMMARY (intelligence mode)
// ═════════════════════════════════════════════════════════════════════════════

function buildSmartSummary(
  metadata: SOPMetadata,
  steps: SOPViewStep[],
  frictionAll: any[],
): SOPSmartSummary {
  const systemList = metadata.systems.length > 0
    ? metadata.systems.join(', ')
    : 'the target system';

  const oneLiner = metadata.objective
    || `${metadata.stepCount}-step procedure for "${metadata.title}" using ${systemList}.`;

  const statsSentence = [
    `${metadata.stepCount} step${metadata.stepCount !== 1 ? 's' : ''}`,
    metadata.estimatedTime ? `~${metadata.estimatedTime}` : null,
    metadata.systems.length > 0 ? `${metadata.systems.length} system${metadata.systems.length !== 1 ? 's' : ''}` : null,
    metadata.roles.length > 0 ? `${metadata.roles.length} role${metadata.roles.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const highFriction = frictionAll.filter((f: any) => f.severity === 'high');
  let primaryInsight: string;
  if (highFriction.length > 0) {
    primaryInsight = `${highFriction.length} high-severity friction point${highFriction.length !== 1 ? 's' : ''} detected — these are the top improvement targets.`;
  } else if (metadata.errorStepCount > 0) {
    primaryInsight = `${metadata.errorStepCount} error handling step${metadata.errorStepCount !== 1 ? 's' : ''} in this procedure — investigate root causes.`;
  } else if (metadata.lowConfidenceStepCount > 0) {
    primaryInsight = `${metadata.lowConfidenceStepCount} step${metadata.lowConfidenceStepCount !== 1 ? 's' : ''} have low label confidence — consider manual review.`;
  } else {
    primaryInsight = `Process appears clean — no major friction or error patterns detected.`;
  }

  let systemSummary: string;
  if (metadata.systems.length === 0) {
    systemSummary = 'No system context detected.';
  } else if (metadata.systems.length === 1) {
    systemSummary = `Operates entirely within ${metadata.systems[0]}.`;
  } else {
    systemSummary = `Spans ${metadata.systems.length} systems: ${systemList}. Cross-system transitions may introduce handoff risk.`;
  }

  return { oneLiner, statsSentence, primaryInsight, systemSummary };
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL DERIVATION
// ═════════════════════════════════════════════════════════════════════════════

function deriveWhenToUseIt(title: string): string {
  const lower = title.toLowerCase();
  if (lower.startsWith('process '))  return `When a new ${lower.replace('process ', '')} needs to be processed`;
  if (lower.startsWith('review '))   return `When a ${lower.replace('review ', '')} is ready for review`;
  if (lower.startsWith('create '))   return `When a new ${lower.replace('create ', '')} needs to be created`;
  if (lower.startsWith('update '))   return `When an existing ${lower.replace('update ', '')} requires updates`;
  if (lower.startsWith('submit '))   return `When a ${lower.replace('submit ', '')} is ready for submission`;
  if (lower.startsWith('approve '))  return `When a ${lower.replace('approve ', '')} requires approval`;
  if (lower.startsWith('send '))     return `When ${lower.replace('send ', '')} needs to be sent`;
  if (lower.startsWith('email '))    return `When ${lower.replace('email ', '')} needs to be emailed`;
  return `When you need to ${lower}`;
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

function normalizeFriction(raw: any): SOPViewFriction {
  return {
    type: safe(raw.type, 'unknown'),
    label: safe(raw.label, 'Friction detected'),
    severity: ['low', 'medium', 'high'].includes(raw.severity) ? raw.severity : 'low',
    affectedStepOrdinals: Array.isArray(raw.stepOrdinals) ? raw.stepOrdinals : [],
  };
}
