/**
 * Workflow Interpreter — AI Process Interpretation Layer (Phase 2)
 *
 * Transforms deterministic ProcessOutput into a unified interpretation
 * artifact that explains WHAT the workflow is doing, WHERE decisions
 * happen, WHERE friction exists, and WHERE rework occurs.
 *
 * All interpretations are grounded in workflow evidence. Nothing is
 * hallucinated — every conclusion traces to specific steps, events,
 * or structural patterns in the recorded workflow.
 *
 * Architecture:
 *   ProcessOutput → workflowInterpreter → WorkflowInterpretation
 *
 * The interpretation artifact is stored alongside other workflow
 * artifacts and surfaced in the UI on the workflow detail page.
 */

import type {
  ProcessOutput,
  FrictionIndicator,
  GroupingReason,
} from './types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProcessType =
  | 'transaction'         // Linear data entry → submit
  | 'approval'            // Review → approve/reject flow
  | 'coordination'        // Multi-system coordination
  | 'review'              // Review-heavy with verification
  | 'exception_handling'  // Error recovery / exception path
  | 'data_collection'     // Mostly data entry across fields
  | 'research'            // Navigation-heavy lookup/review
  | 'general';            // No dominant pattern

export interface DecisionPoint {
  stepOrdinal: number;
  stepTitle: string;
  decisionType: 'approval' | 'validation' | 'routing' | 'conditional' | 'review';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface ReworkPattern {
  type: 'validation_loop' | 'edit_cycle' | 'revisit' | 'repeated_action';
  description: string;
  stepOrdinals: number[];
  occurrences: number;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface FrictionPoint {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  stepOrdinals: number[];
  evidence: string;
}

export interface ProcessPhase {
  ordinal: number;
  name: string;
  system: string;
  stepRange: [number, number]; // [startOrdinal, endOrdinal]
  stepCount: number;
  dominantAction: string;
}

export interface InsightItem {
  category: 'decision' | 'friction' | 'rework' | 'complexity' | 'efficiency' | 'observation';
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence: string;
  stepOrdinals?: number[];
}

export interface WorkflowInterpretation {
  /** Polished natural language summary of the workflow. */
  summary: string;
  /** Classified process type. */
  processType: ProcessType;
  /** Confidence in the process type classification. */
  processTypeConfidence: 'high' | 'medium' | 'low';
  /** Detected decision points. */
  decisions: DecisionPoint[];
  /** Detected rework/loop patterns. */
  rework: ReworkPattern[];
  /** Friction points (from enricher + additional analysis). */
  friction: FrictionPoint[];
  /** Identified process phases. */
  phases: ProcessPhase[];
  /** Prioritized insight items. */
  insights: InsightItem[];
  /** Aggregate scores. */
  scores: {
    /** 0-100: how complex is this workflow? */
    complexity: number;
    /** 0-100: how much friction exists? */
    friction: number;
    /** 0-100: how linear/straight-through is the flow? */
    linearity: number;
    /** 0-100: how much manual effort vs system automation? */
    manualIntensity: number;
  };
  /** Metadata for traceability. */
  stepCount: number;
  systemCount: number;
  systems: string[];
  durationMs: number | null;
  computedAt: string;
}

// ─── Main interpreter ───────────────────────────────────────────────────────

export function interpretWorkflow(output: ProcessOutput): WorkflowInterpretation {
  const { processRun, processDefinition, processMap, sop } = output;
  const steps = processDefinition.stepDefinitions;
  const systems = processRun.systemsUsed;

  // Phase detection
  const phases = detectPhases(output);

  // Decision detection (enhanced beyond just error-based)
  const decisions = detectDecisions(output);

  // Rework/loop detection
  const rework = detectRework(output);

  // Friction analysis (leverage existing + add new patterns)
  const friction = analyzeFriction(output);

  // Process type classification
  const { processType, confidence: processTypeConfidence } = classifyProcessType(output, decisions, rework, friction);

  // Scores
  const scores = computeScores(output, decisions, rework, friction);

  // Generate insights (prioritized)
  const insights = generateInsights(output, decisions, rework, friction, phases, scores);

  // Compose summary
  const summary = composeSummary(output, processType, decisions, rework, friction, phases, scores);

  return {
    summary,
    processType,
    processTypeConfidence,
    decisions,
    rework,
    friction,
    phases,
    insights,
    scores,
    stepCount: steps.length,
    systemCount: systems.length,
    systems,
    durationMs: processRun.durationMs ?? null,
    computedAt: new Date().toISOString(),
  };
}

// ─── Phase Detection ────────────────────────────────────────────────────────

function detectPhases(output: ProcessOutput): ProcessPhase[] {
  const phases: ProcessPhase[] = [];
  const mapPhases = output.processMap.phases;

  for (let i = 0; i < mapPhases.length; i++) {
    const phase = mapPhases[i]!;
    const stepIds = phase.stepNodeIds ?? [];
    if (stepIds.length === 0) continue;

    // Find ordinal range from step definitions
    const ordinals = stepIds
      .map(id => output.processDefinition.stepDefinitions.find(s => s.stepId === id)?.ordinal)
      .filter((o): o is number => o !== undefined)
      .sort((a, b) => a - b);

    if (ordinals.length === 0) continue;

    // Determine dominant action in this phase
    const phaseSteps = output.processDefinition.stepDefinitions.filter(s =>
      ordinals.includes(s.ordinal),
    );
    const dominantAction = getDominantAction(phaseSteps.map(s => s.category));

    phases.push({
      ordinal: i + 1,
      name: phase.name,
      system: phase.system,
      stepRange: [ordinals[0]!, ordinals[ordinals.length - 1]!],
      stepCount: ordinals.length,
      dominantAction,
    });
  }

  return phases;
}

function getDominantAction(categories: string[]): string {
  const counts = new Map<string, number>();
  for (const cat of categories) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let dominant = 'mixed';
  let maxCount = 0;
  for (const [cat, count] of counts) {
    if (count > maxCount) { dominant = cat; maxCount = count; }
  }
  return ACTION_LABELS[dominant] ?? dominant;
}

const ACTION_LABELS: Record<string, string> = {
  click_then_navigate: 'navigation',
  fill_and_submit: 'form completion',
  data_entry: 'data entry',
  send_action: 'submission',
  file_action: 'document handling',
  error_handling: 'error recovery',
  single_action: 'interaction',
  repeated_click_dedup: 'repeated action',
  annotation: 'annotation',
};

// ─── Decision Detection (Enhanced) ──────────────────────────────────────────

function detectDecisions(output: ProcessOutput): DecisionPoint[] {
  const decisions: DecisionPoint[] = [];
  const steps = output.processDefinition.stepDefinitions;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const next = steps[i + 1];
    const title = step.title.toLowerCase();

    // Pattern 1: Submit/send followed by error handling
    if ((step.category === 'fill_and_submit' || step.category === 'send_action') &&
        next?.category === 'error_handling') {
      decisions.push({
        stepOrdinal: step.ordinal,
        stepTitle: step.title,
        decisionType: 'validation',
        confidence: 'high',
        evidence: `Step ${step.ordinal} submission followed by error handling at step ${next.ordinal}`,
      });
    }

    // Pattern 2: Approval/review language in step titles
    if (/\b(approv|reject|review|verify|confirm|validate|check|assess)\b/i.test(title)) {
      if (!decisions.some(d => d.stepOrdinal === step.ordinal)) {
        decisions.push({
          stepOrdinal: step.ordinal,
          stepTitle: step.title,
          decisionType: title.includes('approv') ? 'approval' : 'review',
          confidence: 'medium',
          evidence: `Step title "${step.title}" contains decision language`,
        });
      }
    }

    // Pattern 3: Navigation after data entry (routing decision)
    if (step.category === 'data_entry' && next?.category === 'click_then_navigate') {
      const prevSystem = step.systems[0];
      const nextSystem = next.systems[0];
      if (prevSystem && nextSystem && prevSystem !== nextSystem) {
        decisions.push({
          stepOrdinal: step.ordinal,
          stepTitle: step.title,
          decisionType: 'routing',
          confidence: 'low',
          evidence: `Data entry in ${prevSystem} followed by navigation to different system (${nextSystem})`,
        });
      }
    }
  }

  return decisions;
}

// ─── Rework/Loop Detection ──────────────────────────────────────────────────

function detectRework(output: ProcessOutput): ReworkPattern[] {
  const patterns: ReworkPattern[] = [];
  const steps = output.processDefinition.stepDefinitions;

  // Pattern 1: Same category appears multiple times with same system
  const categorySystemCounts = new Map<string, { ordinals: number[]; count: number }>();
  for (const step of steps) {
    const key = `${step.category}::${step.systems[0] ?? 'unknown'}`;
    const entry = categorySystemCounts.get(key) ?? { ordinals: [], count: 0 };
    entry.count++;
    entry.ordinals.push(step.ordinal);
    categorySystemCounts.set(key, entry);
  }

  for (const [key, data] of categorySystemCounts) {
    if (data.count >= 2) {
      const [category, system] = key.split('::');
      if (category === 'click_then_navigate' || category === 'single_action') continue; // Navigation repeats are normal

      patterns.push({
        type: 'repeated_action',
        description: `${ACTION_LABELS[category!] ?? category} repeated ${data.count} times in ${system}`,
        stepOrdinals: data.ordinals,
        occurrences: data.count,
        severity: data.count >= 3 ? 'high' : 'medium',
        evidence: `Steps ${data.ordinals.join(', ')} all perform ${category} in ${system}`,
      });
    }
  }

  // Pattern 2: Error handling followed by retry of same action type
  for (let i = 0; i < steps.length - 2; i++) {
    const step = steps[i]!;
    const errorStep = steps[i + 1];
    const retryStep = steps[i + 2];

    if (errorStep?.category === 'error_handling' &&
        retryStep?.category === step.category &&
        step.systems[0] === retryStep.systems[0]) {
      patterns.push({
        type: 'validation_loop',
        description: `Validation loop: ${step.title} → error → retry at step ${retryStep.ordinal}`,
        stepOrdinals: [step.ordinal, errorStep.ordinal, retryStep.ordinal],
        occurrences: 1,
        severity: 'high',
        evidence: `Step ${step.ordinal} failed, error at ${errorStep.ordinal}, retry at ${retryStep.ordinal}`,
      });
    }
  }

  // Pattern 3: Same page/route visited multiple times (backtracking)
  const routeVisits = new Map<string, number[]>();
  for (const node of output.processMap.nodes) {
    if (node.nodeType === 'task' && node.metadata.routeTemplate) {
      const route = node.metadata.routeTemplate;
      const entry = routeVisits.get(route) ?? [];
      entry.push(node.ordinal);
      routeVisits.set(route, entry);
    }
  }

  for (const [route, ordinals] of routeVisits) {
    if (ordinals.length >= 2) {
      patterns.push({
        type: 'revisit',
        description: `Same page revisited ${ordinals.length} times (${route})`,
        stepOrdinals: ordinals,
        occurrences: ordinals.length,
        severity: ordinals.length >= 3 ? 'high' : 'low',
        evidence: `Route "${route}" visited at steps ${ordinals.join(', ')}`,
      });
    }
  }

  return patterns;
}

// ─── Friction Analysis ──────────────────────────────────────────────────────

function analyzeFriction(output: ProcessOutput): FrictionPoint[] {
  const points: FrictionPoint[] = [];

  // Use existing friction from content enricher
  for (const f of output.sop.frictionSummary ?? []) {
    points.push({
      type: f.type,
      description: f.label,
      severity: f.severity as FrictionPoint['severity'],
      stepOrdinals: f.stepOrdinals ?? [],
      evidence: `Detected by friction analyzer: ${f.type}`,
    });
  }

  // Additional: navigation density (ratio of nav steps to total)
  const steps = output.processDefinition.stepDefinitions;
  const navSteps = steps.filter(s => s.category === 'click_then_navigate');
  const navRatio = steps.length > 0 ? navSteps.length / steps.length : 0;

  if (navRatio > 0.5 && steps.length > 4) {
    points.push({
      type: 'navigation_heavy',
      description: `${Math.round(navRatio * 100)}% of steps are navigation-only, suggesting interface friction or complex navigation requirements`,
      severity: navRatio > 0.7 ? 'high' : 'medium',
      stepOrdinals: navSteps.map(s => s.ordinal),
      evidence: `${navSteps.length} of ${steps.length} steps are click_then_navigate`,
    });
  }

  // Additional: system switching burden
  const systemSwitches = countSystemSwitches(steps);
  if (systemSwitches >= 3) {
    points.push({
      type: 'system_switching',
      description: `Workflow switches between applications ${systemSwitches} times, increasing cognitive load`,
      severity: systemSwitches >= 5 ? 'high' : 'medium',
      stepOrdinals: [],
      evidence: `${systemSwitches} system switches across ${output.processRun.systemsUsed.length} systems`,
    });
  }

  return points;
}

function countSystemSwitches(steps: { systems: string[] }[]): number {
  let switches = 0;
  let lastSystem = '';
  for (const step of steps) {
    const system = step.systems[0] ?? '';
    if (system && system !== lastSystem && lastSystem) switches++;
    if (system) lastSystem = system;
  }
  return switches;
}

// ─── Process Type Classification ────────────────────────────────────────────

function classifyProcessType(
  output: ProcessOutput,
  decisions: DecisionPoint[],
  rework: ReworkPattern[],
  friction: FrictionPoint[],
): { processType: ProcessType; confidence: 'high' | 'medium' | 'low' } {
  const steps = output.processDefinition.stepDefinitions;
  const categories = steps.map(s => s.category);

  const hasFormSubmit = categories.includes('fill_and_submit');
  const hasSendAction = categories.includes('send_action');
  const hasFileAction = categories.includes('file_action');
  const hasErrorHandling = categories.includes('error_handling');
  const approvalDecisions = decisions.filter(d => d.decisionType === 'approval');
  const reviewDecisions = decisions.filter(d => d.decisionType === 'review');
  const navSteps = categories.filter(c => c === 'click_then_navigate').length;
  const dataSteps = categories.filter(c => c === 'data_entry' || c === 'fill_and_submit').length;
  const navRatio = steps.length > 0 ? navSteps / steps.length : 0;
  const dataRatio = steps.length > 0 ? dataSteps / steps.length : 0;
  const systemCount = output.processRun.systemsUsed.length;

  // Approval workflow: has approval decisions + form/send
  if (approvalDecisions.length > 0 && (hasFormSubmit || hasSendAction)) {
    return { processType: 'approval', confidence: 'high' };
  }

  // Exception handling: has error_handling steps
  if (hasErrorHandling && rework.some(r => r.type === 'validation_loop')) {
    return { processType: 'exception_handling', confidence: 'high' };
  }

  // Review-heavy: multiple review decisions
  if (reviewDecisions.length >= 2) {
    return { processType: 'review', confidence: 'medium' };
  }

  // Multi-system coordination
  if (systemCount >= 3) {
    return { processType: 'coordination', confidence: 'medium' };
  }

  // Data collection: mostly data entry
  if (dataRatio > 0.5) {
    return { processType: 'data_collection', confidence: 'medium' };
  }

  // Transaction: simple form + submit
  if (hasFormSubmit && hasSendAction && steps.length <= 8) {
    return { processType: 'transaction', confidence: 'medium' };
  }

  // Research: navigation-heavy
  if (navRatio > 0.5) {
    return { processType: 'research', confidence: 'low' };
  }

  return { processType: 'general', confidence: 'low' };
}

// ─── Scores ─────────────────────────────────────────────────────────────────

function computeScores(
  output: ProcessOutput,
  decisions: DecisionPoint[],
  rework: ReworkPattern[],
  friction: FrictionPoint[],
): WorkflowInterpretation['scores'] {
  const steps = output.processDefinition.stepDefinitions;
  const categories = steps.map(s => s.category);
  const stepCount = steps.length;

  // Complexity (0-100): based on step count, decisions, system count, rework
  const complexityFromSteps = Math.min(stepCount / 20, 1) * 30;
  const complexityFromDecisions = Math.min(decisions.length / 5, 1) * 25;
  const complexityFromSystems = Math.min(output.processRun.systemsUsed.length / 5, 1) * 25;
  const complexityFromRework = Math.min(rework.length / 3, 1) * 20;
  const complexity = Math.round(complexityFromSteps + complexityFromDecisions + complexityFromSystems + complexityFromRework);

  // Friction (0-100): from friction points weighted by severity
  const frictionScore = Math.min(100, Math.round(
    friction.reduce((sum, f) => sum + (f.severity === 'high' ? 30 : f.severity === 'medium' ? 15 : 5), 0),
  ));

  // Linearity (0-100): how straight-through is the flow?
  const reworkPenalty = Math.min(rework.length * 15, 50);
  const decisionPenalty = Math.min(decisions.length * 10, 30);
  const backtrackPenalty = rework.filter(r => r.type === 'revisit').length * 10;
  const linearity = Math.max(0, 100 - reworkPenalty - decisionPenalty - backtrackPenalty);

  // Manual intensity (0-100): ratio of human vs system events
  const humanRatio = output.processRun.eventCount > 0
    ? output.processRun.humanEventCount / output.processRun.eventCount
    : 0.5;
  const manualIntensity = Math.round(humanRatio * 100);

  return { complexity, friction: frictionScore, linearity, manualIntensity };
}

// ─── Insight Generation ─────────────────────────────────────────────────────

function generateInsights(
  output: ProcessOutput,
  decisions: DecisionPoint[],
  rework: ReworkPattern[],
  friction: FrictionPoint[],
  phases: ProcessPhase[],
  scores: WorkflowInterpretation['scores'],
): InsightItem[] {
  const insights: InsightItem[] = [];
  const steps = output.processDefinition.stepDefinitions;

  // Decision insights
  if (decisions.length > 0) {
    insights.push({
      category: 'decision',
      severity: decisions.length >= 3 ? 'high' : 'info',
      title: `${decisions.length} decision point${decisions.length !== 1 ? 's' : ''} detected`,
      description: decisions.length >= 3
        ? `This workflow involves ${decisions.length} decision points, indicating a review-heavy or approval-dependent process that may benefit from clearer routing rules.`
        : `${decisions.length} decision point${decisions.length !== 1 ? 's were' : ' was'} identified in the workflow execution.`,
      evidence: decisions.map(d => `Step ${d.stepOrdinal}: ${d.decisionType} (${d.confidence} confidence)`).join('; '),
      stepOrdinals: decisions.map(d => d.stepOrdinal),
    });
  }

  // Rework insights
  const validationLoops = rework.filter(r => r.type === 'validation_loop');
  if (validationLoops.length > 0) {
    insights.push({
      category: 'rework',
      severity: 'high',
      title: `${validationLoops.length} validation loop${validationLoops.length !== 1 ? 's' : ''} detected`,
      description: `The workflow contains ${validationLoops.length} submit-fail-retry cycle${validationLoops.length !== 1 ? 's' : ''}, suggesting data quality issues or unclear validation requirements that increase completion time.`,
      evidence: validationLoops.map(r => r.evidence).join('; '),
      stepOrdinals: validationLoops.flatMap(r => r.stepOrdinals),
    });
  }

  const repeatedActions = rework.filter(r => r.type === 'repeated_action');
  if (repeatedActions.length > 0) {
    insights.push({
      category: 'rework',
      severity: 'medium',
      title: `${repeatedActions.length} repeated action pattern${repeatedActions.length !== 1 ? 's' : ''}`,
      description: repeatedActions.map(r => r.description).join('. ') + '.',
      evidence: repeatedActions.map(r => r.evidence).join('; '),
      stepOrdinals: repeatedActions.flatMap(r => r.stepOrdinals),
    });
  }

  // Friction insights
  const highFriction = friction.filter(f => f.severity === 'high');
  if (highFriction.length > 0) {
    insights.push({
      category: 'friction',
      severity: 'high',
      title: `${highFriction.length} high-friction area${highFriction.length !== 1 ? 's' : ''} identified`,
      description: highFriction.map(f => f.description).join('. ') + '.',
      evidence: highFriction.map(f => f.evidence).join('; '),
      stepOrdinals: highFriction.flatMap(f => f.stepOrdinals),
    });
  }

  // Complexity insight
  if (scores.complexity >= 70) {
    insights.push({
      category: 'complexity',
      severity: 'medium',
      title: 'High process complexity',
      description: `This ${steps.length}-step workflow across ${output.processRun.systemsUsed.length} system${output.processRun.systemsUsed.length !== 1 ? 's' : ''} with ${decisions.length} decision point${decisions.length !== 1 ? 's' : ''} indicates significant operational complexity that may benefit from simplification.`,
      evidence: `Complexity score: ${scores.complexity}/100 (steps: ${steps.length}, systems: ${output.processRun.systemsUsed.length}, decisions: ${decisions.length}, rework: ${rework.length})`,
    });
  }

  // Linearity insight
  if (scores.linearity <= 40) {
    insights.push({
      category: 'efficiency',
      severity: 'medium',
      title: 'Fragmented execution pattern',
      description: 'The workflow shows significant non-linear execution with rework loops, backtracking, or decision branches that fragment the straight-through path.',
      evidence: `Linearity score: ${scores.linearity}/100`,
    });
  }

  // Multi-system coordination insight
  if (output.processRun.systemsUsed.length >= 3) {
    insights.push({
      category: 'observation',
      severity: 'info',
      title: `Multi-system workflow (${output.processRun.systemsUsed.length} systems)`,
      description: `This workflow coordinates across ${output.processRun.systemsUsed.join(', ')}, which increases handoff complexity and potential for data inconsistency.`,
      evidence: `Systems: ${output.processRun.systemsUsed.join(', ')}`,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
  insights.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return insights;
}

// ─── Summary Composition ────────────────────────────────────────────────────

const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  transaction: 'a data entry and submission workflow',
  approval: 'an approval and review workflow',
  coordination: 'a multi-system coordination workflow',
  review: 'a review and verification workflow',
  exception_handling: 'an exception handling and recovery workflow',
  data_collection: 'a data collection workflow',
  research: 'a research and information gathering workflow',
  general: 'an operational workflow',
};

function composeSummary(
  output: ProcessOutput,
  processType: ProcessType,
  decisions: DecisionPoint[],
  rework: ReworkPattern[],
  friction: FrictionPoint[],
  phases: ProcessPhase[],
  scores: WorkflowInterpretation['scores'],
): string {
  const steps = output.processDefinition.stepDefinitions;
  const systems = output.processRun.systemsUsed;
  const activityName = output.processRun.activityName;

  // Opening sentence
  const typeLabel = PROCESS_TYPE_LABELS[processType];
  const systemPhrase = systems.length > 1
    ? `spanning ${systems.join(' and ')}`
    : systems.length === 1 ? `in ${systems[0]}` : '';

  let summary = `"${activityName}" is ${typeLabel} with ${steps.length} steps ${systemPhrase}.`;

  // Phase summary
  if (phases.length > 1) {
    const phaseNames = phases.map(p => `${p.name} (${p.dominantAction})`).join(', ');
    summary += ` The workflow progresses through ${phases.length} phases: ${phaseNames}.`;
  }

  // Notable characteristics
  const notable: string[] = [];

  if (decisions.length > 0) {
    notable.push(`${decisions.length} manual decision point${decisions.length !== 1 ? 's' : ''}`);
  }

  const loops = rework.filter(r => r.type === 'validation_loop');
  if (loops.length > 0) {
    notable.push(`${loops.length} validation loop${loops.length !== 1 ? 's' : ''}`);
  }

  if (systems.length >= 3) {
    notable.push(`coordination across ${systems.length} systems`);
  }

  const highFriction = friction.filter(f => f.severity === 'high');
  if (highFriction.length > 0) {
    notable.push(`${highFriction.length} high-friction area${highFriction.length !== 1 ? 's' : ''}`);
  }

  if (notable.length > 0) {
    summary += ` Notable characteristics include ${notable.join(', ')}.`;
  }

  // Efficiency observation
  if (scores.linearity >= 80) {
    summary += ' The execution follows a largely linear path, suggesting a well-standardized process.';
  } else if (scores.linearity <= 40) {
    summary += ' The execution pattern is fragmented, indicating opportunities for standardization.';
  }

  return summary;
}
