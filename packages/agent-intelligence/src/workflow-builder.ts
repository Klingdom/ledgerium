/**
 * Workflow Builder
 *
 * Constructs the complete WorkflowStructure from activities, steps, and
 * decision points.
 *
 * Responsibilities:
 * - Set workflowId and workflowName from ProcessRun
 * - Build dependency edges between activities (sequential by default;
 *   conditional if a decision point occurs between them)
 * - Compute automationScore: weighted average of per-step scores
 * - Derive automationClassification from the score
 * - Aggregate systems, duration, and confidence
 *
 * Automation score weights per step:
 *   full_automation  → 100
 *   ai_assisted      → 70
 *   human_in_loop    → 40
 *   manual_only      → 0
 *
 * Classification from score:
 *   >= 80 → full_automation
 *   >= 60 → ai_assisted
 *   >= 30 → human_in_loop
 *   <  30 → manual_only
 */

import type { ProcessOutput } from '@ledgerium/process-engine';
import type {
  StepIntelligence,
  Activity,
  DecisionPoint,
  WorkflowStructure,
  WorkflowDependency,
  AutomationType,
} from './types.js';

// ─── Automation score weights ─────────────────────────────────────────────────

const AUTOMATION_WEIGHTS: Record<AutomationType, number> = {
  full_automation: 100,
  ai_assisted: 70,
  human_in_loop: 40,
  manual_only: 0,
};

// ─── Score → classification ───────────────────────────────────────────────────

function scoreToClassification(score: number): AutomationType {
  if (score >= 80) return 'full_automation';
  if (score >= 60) return 'ai_assisted';
  if (score >= 30) return 'human_in_loop';
  return 'manual_only';
}

// ─── Automation score calculation ─────────────────────────────────────────────

/**
 * Compute a weighted automation score (0–100) for a set of steps.
 * Weighting: by step duration if available, else equal weight.
 */
function computeAutomationScore(steps: StepIntelligence[]): number {
  if (steps.length === 0) return 0;

  const totalDuration = steps.reduce(
    (sum, s) => sum + (s.estimatedDurationMs ?? 0),
    0,
  );
  const useEqualWeight = totalDuration === 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const step of steps) {
    const stepScore = AUTOMATION_WEIGHTS[step.automationClassification];
    const weight = useEqualWeight
      ? 1
      : (step.estimatedDurationMs ?? 0) > 0
        ? step.estimatedDurationMs!
        : totalDuration / steps.length; // use average for steps without duration

    weightedSum += stepScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

// ─── Dependency builder ───────────────────────────────────────────────────────

/**
 * Build dependency edges between activities.
 *
 * Each activity depends on the previous one (sequential by default).
 * If a decision point occurs between two activities, the dependency is
 * marked as 'conditional'.
 */
function buildDependencies(
  activities: Activity[],
  decisions: DecisionPoint[],
  steps: StepIntelligence[],
): WorkflowDependency[] {
  if (activities.length <= 1) return [];

  // Build a set of stepIds that have decision points after them
  const decisionAfterStepIds = new Set(decisions.map(d => d.afterStepId));

  // Build a map of stepId → activityId for lookup
  const stepToActivity = new Map<string, string>();
  for (const activity of activities) {
    for (const stepId of activity.stepIds) {
      stepToActivity.set(stepId, activity.activityId);
    }
  }

  const dependencies: WorkflowDependency[] = [];

  for (let i = 1; i < activities.length; i++) {
    const fromActivity = activities[i - 1]!;
    const toActivity = activities[i]!;

    // Check if any step in the "from" activity has a decision point after it
    const hasDecisionBetween = fromActivity.stepIds.some(sid =>
      decisionAfterStepIds.has(sid),
    );

    dependencies.push({
      fromActivityId: fromActivity.activityId,
      toActivityId: toActivity.activityId,
      type: hasDecisionBetween ? 'conditional' : 'sequential',
    });
  }

  return dependencies;
}

// ─── Duration aggregation ─────────────────────────────────────────────────────

/**
 * Sum step durations. Returns null if any step is missing duration data.
 */
function totalDuration(steps: StepIntelligence[]): number | null {
  if (steps.some(s => s.estimatedDurationMs === null)) return null;
  return steps.reduce((sum, s) => sum + (s.estimatedDurationMs ?? 0), 0);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build the complete WorkflowStructure.
 *
 * @param steps - All enriched steps for this workflow
 * @param activities - Grouped activities
 * @param decisions - Detected decision points
 * @param output - Original process engine output (for run metadata)
 * @returns Complete WorkflowStructure
 */
export function buildWorkflow(
  steps: StepIntelligence[],
  activities: Activity[],
  decisions: DecisionPoint[],
  output: ProcessOutput,
): WorkflowStructure {
  const { processRun } = output;

  // Aggregate all unique systems
  const systems = [...new Set(
    steps
      .map(s => s.system)
      .filter((s): s is string => s !== null),
  )];

  // Compute automation score
  const automationScore = computeAutomationScore(steps);
  const automationClassification = scoreToClassification(automationScore);

  // Build dependency graph
  const dependencies = buildDependencies(activities, decisions, steps);

  // Average confidence
  const confidence = steps.length > 0
    ? Math.round(
        (steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length) * 1000,
      ) / 1000
    : 0;

  // Total duration
  const totalDurationMs = totalDuration(steps);

  return {
    workflowId: processRun.runId,
    workflowName: processRun.activityName,
    activities,
    decisionPoints: decisions,
    systems,
    totalDurationMs,
    stepCount: steps.length,
    activityCount: activities.length,
    dependencies,
    automationClassification,
    automationScore,
    confidence,
  } satisfies WorkflowStructure;
}
