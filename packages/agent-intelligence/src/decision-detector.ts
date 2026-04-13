/**
 * Decision Detector
 *
 * Detects decision points in a workflow from process map structure and
 * friction indicators. Decision points represent moments where the process
 * may branch, retry, or require human judgment.
 *
 * Detection sources:
 * 1. Error recovery: steps categorized as 'error_handling'
 * 2. Branching: process map nodes with multiple outgoing edges
 * 3. Human judgment: manual_only or human_in_loop steps following automated steps
 * 4. Retry patterns: friction indicators of type 'retry_detected' or 'backtracking'
 * 5. Decision nodes: process map nodes with nodeType === 'decision'
 *
 * All decisions carry confidence scores and evidence indicators.
 */

import type { ProcessOutput } from '@ledgerium/process-engine';
import type { StepIntelligence, DecisionPoint } from './types.js';

// ─── Detection helpers ────────────────────────────────────────────────────────

/**
 * Build a map of stepId → StepIntelligence for fast lookup.
 */
function buildStepIndex(steps: StepIntelligence[]): Map<string, StepIntelligence> {
  const index = new Map<string, StepIntelligence>();
  for (const step of steps) {
    index.set(step.stepId, step);
  }
  return index;
}

/**
 * Count outgoing edges per node ID in the process map.
 */
function buildOutgoingEdgeCount(output: ProcessOutput): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of output.processMap.edges) {
    counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
  }
  return counts;
}

// ─── Individual detectors ─────────────────────────────────────────────────────

/**
 * Detect error recovery decision points from steps categorized as 'error_handling'.
 */
function detectErrorRecovery(
  steps: StepIntelligence[],
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const results: Array<Omit<DecisionPoint, 'decisionId'>> = [];

  for (const step of steps) {
    if (step.rawReference.category === 'error_handling') {
      // Find the preceding step as the "after" anchor
      const stepOrdinal = step.rawReference.stepOrdinal;
      const precedingOrdinal = stepOrdinal - 1;
      const precedingStep = steps.find(
        s => s.rawReference.stepOrdinal === precedingOrdinal,
      );

      results.push({
        afterStepId: precedingStep?.stepId ?? step.stepId,
        type: 'error_recovery',
        description: `Error or exception handling detected: "${step.inferredIntent}"`,
        indicators: [
          'Step categorized as error_handling',
          `Step title: "${step.rawReference.rawTitle}"`,
        ],
        confidence: step.confidence,
        stepOrdinals: [stepOrdinal],
      });
    }
  }

  return results;
}

/**
 * Detect branching decision points from process map nodes with multiple outgoing edges.
 */
function detectBranching(
  steps: StepIntelligence[],
  output: ProcessOutput,
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const results: Array<Omit<DecisionPoint, 'decisionId'>> = [];
  const outgoingEdgeCount = buildOutgoingEdgeCount(output);
  const stepIndex = buildStepIndex(steps);

  for (const node of output.processMap.nodes) {
    if (node.nodeType === 'start' || node.nodeType === 'end') continue;

    const edgeCount = outgoingEdgeCount.get(node.id) ?? 0;
    if (edgeCount <= 1) continue;

    // This node has multiple outgoing edges — it's a branching point
    const matchingStep = stepIndex.get(node.stepId);
    if (!matchingStep) continue;

    results.push({
      afterStepId: matchingStep.stepId,
      type: 'branching',
      description: `Process branches at "${matchingStep.inferredIntent}" (${edgeCount} possible paths)`,
      indicators: [
        `Process map node has ${edgeCount} outgoing edges`,
        `Step: "${matchingStep.rawReference.rawTitle}"`,
      ],
      confidence: 0.8,
      stepOrdinals: [matchingStep.rawReference.stepOrdinal],
    });
  }

  return results;
}

/**
 * Detect decision map nodes explicitly marked as decision points.
 */
function detectDecisionNodes(
  steps: StepIntelligence[],
  output: ProcessOutput,
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const results: Array<Omit<DecisionPoint, 'decisionId'>> = [];
  const stepIndex = buildStepIndex(steps);

  for (const node of output.processMap.nodes) {
    if (node.nodeType !== 'decision') continue;

    const matchingStep = stepIndex.get(node.stepId);
    if (!matchingStep) continue;

    const decisionLabel = node.metadata.decisionLabel ?? 'Decision required';

    results.push({
      afterStepId: matchingStep.stepId,
      type: 'conditional',
      description: decisionLabel,
      indicators: [
        'Process map node is marked as a decision node',
        `Decision label: "${decisionLabel}"`,
      ],
      confidence: 0.85,
      stepOrdinals: [matchingStep.rawReference.stepOrdinal],
    });
  }

  return results;
}

/**
 * Detect human judgment points: manual_only or human_in_loop steps that follow
 * automated steps, indicating a required handoff.
 */
function detectHumanJudgment(
  steps: StepIntelligence[],
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const results: Array<Omit<DecisionPoint, 'decisionId'>> = [];

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;

    const prevIsAutomated =
      prev.automationClassification === 'full_automation' ||
      prev.automationClassification === 'ai_assisted';
    const currRequiresHuman =
      curr.automationClassification === 'manual_only' ||
      curr.automationClassification === 'human_in_loop';

    if (prevIsAutomated && currRequiresHuman) {
      results.push({
        afterStepId: prev.stepId,
        type: 'human_judgment',
        description: `Human decision required before "${curr.inferredIntent}"`,
        indicators: [
          `Previous step (${prev.automationClassification}): "${prev.inferredIntent}"`,
          `Current step requires (${curr.automationClassification}): "${curr.inferredIntent}"`,
        ],
        confidence: 0.7,
        stepOrdinals: [prev.rawReference.stepOrdinal, curr.rawReference.stepOrdinal],
      });
    }
  }

  return results;
}

/**
 * Detect retry patterns from friction indicators in SOP steps and the process map.
 */
function detectRetryPatterns(
  steps: StepIntelligence[],
  output: ProcessOutput,
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const results: Array<Omit<DecisionPoint, 'decisionId'>> = [];
  const stepIndex = buildStepIndex(steps);

  // Check SOP step friction indicators
  for (const sopStep of output.sop.steps) {
    const indicators = sopStep.frictionIndicators ?? [];
    const retryIndicator = indicators.find(
      fi => fi.type === 'retry_detected' || fi.type === 'backtracking',
    );

    if (!retryIndicator) continue;

    const matchingStep = stepIndex.get(sopStep.stepId) ?? stepIndex.get(sopStep.sourceStepId);
    if (!matchingStep) continue;

    results.push({
      afterStepId: matchingStep.stepId,
      type: 'retry',
      description: `Retry or backtracking behavior detected at "${matchingStep.inferredIntent}"`,
      indicators: [
        `Friction indicator: ${retryIndicator.type} (${retryIndicator.severity} severity)`,
        `Friction label: "${retryIndicator.label}"`,
      ],
      confidence: retryIndicator.severity === 'high' ? 0.85 : 0.65,
      stepOrdinals: retryIndicator.stepOrdinals,
    });
  }

  // Also check process map friction summary
  const mapFriction = output.processMap.frictionSummary ?? [];
  for (const fi of mapFriction) {
    if (fi.type !== 'retry_detected' && fi.type !== 'backtracking') continue;
    if (fi.stepOrdinals.length === 0) continue;

    const ordinal = fi.stepOrdinals[0]!;
    const matchingStep = steps.find(s => s.rawReference.stepOrdinal === ordinal);
    if (!matchingStep) continue;

    // Avoid duplicate with SOP-level detection
    const alreadyDetected = results.some(r => r.afterStepId === matchingStep.stepId);
    if (alreadyDetected) continue;

    results.push({
      afterStepId: matchingStep.stepId,
      type: 'retry',
      description: `Retry or backtracking observed at step ${ordinal}: "${matchingStep.inferredIntent}"`,
      indicators: [
        `Map-level friction: ${fi.type} (${fi.severity} severity)`,
        `Friction label: "${fi.label}"`,
      ],
      confidence: fi.severity === 'high' ? 0.8 : 0.6,
      stepOrdinals: fi.stepOrdinals,
    });
  }

  return results;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Remove duplicate decision points for the same afterStepId and type.
 * Keeps the highest-confidence entry.
 */
function deduplicateDecisions(
  decisions: Array<Omit<DecisionPoint, 'decisionId'>>,
): Array<Omit<DecisionPoint, 'decisionId'>> {
  const seen = new Map<string, Omit<DecisionPoint, 'decisionId'>>();

  for (const decision of decisions) {
    const key = `${decision.afterStepId}::${decision.type}`;
    const existing = seen.get(key);
    if (!existing || decision.confidence > existing.confidence) {
      seen.set(key, decision);
    }
  }

  return [...seen.values()];
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect decision points in a workflow.
 *
 * @param steps - Enriched step intelligence objects
 * @param output - Full process engine output (for map structure and friction data)
 * @returns Array of detected decision points with stable IDs
 */
export function detectDecisions(
  steps: StepIntelligence[],
  output: ProcessOutput,
): DecisionPoint[] {
  const raw: Array<Omit<DecisionPoint, 'decisionId'>> = [
    ...detectErrorRecovery(steps),
    ...detectBranching(steps, output),
    ...detectDecisionNodes(steps, output),
    ...detectHumanJudgment(steps),
    ...detectRetryPatterns(steps, output),
  ];

  const deduped = deduplicateDecisions(raw);

  // Sort by the ordinal of the afterStepId for stable ordering
  const stepOrdinalMap = new Map<string, number>(
    steps.map(s => [s.stepId, s.rawReference.stepOrdinal]),
  );
  const sorted = deduped.sort((a, b) => {
    const ordA = stepOrdinalMap.get(a.afterStepId) ?? 0;
    const ordB = stepOrdinalMap.get(b.afterStepId) ?? 0;
    return ordA - ordB;
  });

  return sorted.map((d, index) => ({
    ...d,
    decisionId: `dec-${index + 1}`,
  }));
}
