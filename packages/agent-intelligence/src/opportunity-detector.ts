/**
 * Opportunity Detector
 *
 * Analyzes workflow structure, step intelligence, and skill library to identify
 * where AI, automation, and agents can be applied — with evidence-backed scoring.
 *
 * Detection categories:
 * 1. repetition              — Repeated steps/patterns that can be automated
 * 2. deterministic_logic     — Rule-based steps with no human judgment needed
 * 3. data_movement           — Manual data transfer between systems
 * 4. content_generation      — Email writing, report creation, drafting
 * 5. multi_system_orchestration — Workflows spanning 3+ systems
 * 6. friction_reduction      — Steps with high duration or excessive complexity
 * 7. decision_support        — Human decision points that could benefit from AI
 *
 * All detection is deterministic: same input → same output.
 */

import type {
  StepIntelligence,
  Activity,
  WorkflowStructure,
  SkillLibrary,
  AutomationType,
  Opportunity,
  OpportunityAnalysis,
  OpportunityCategory,
  OpportunityClassification,
  OpportunityEvidence,
} from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Objects associated with content generation. */
const CONTENT_OBJECTS = new Set([
  'email', 'message', 'report', 'document', 'draft', 'comment', 'note',
]);

/** Verbs associated with content entry/creation. */
const CONTENT_VERBS = new Set(['enter', 'fill', 'write']);

/** Verbs associated with data copy/paste operations. */
const COPY_PASTE_VERBS = new Set(['copy', 'paste']);

/** Duration threshold (ms) above which a single step is considered slow. */
const FRICTION_STEP_THRESHOLD_MS = 30_000;

/** Duration threshold (ms) above which an activity is considered long. */
const FRICTION_ACTIVITY_THRESHOLD_MS = 60_000;

/** Minimum step count for a long activity friction signal. */
const FRICTION_ACTIVITY_MIN_STEPS = 5;

// ─── Duration helpers ─────────────────────────────────────────────────────────

/**
 * Sum an array of nullable durations.
 * The caller is responsible for ensuring none are null before calling.
 */
function sumDurations(durations: (number | null)[]): number {
  return durations.reduce<number>((acc, d) => acc + (d as number), 0);
}

// ─── Score helpers ────────────────────────────────────────────────────────────

/**
 * Map AutomationType to a feasibility score (0-100).
 * Higher = easier to implement / less risky.
 */
function automationFeasibility(classification: AutomationType): number {
  switch (classification) {
    case 'full_automation': return 90;
    case 'ai_assisted':     return 70;
    case 'human_in_loop':   return 40;
    case 'manual_only':     return 10;
  }
}

/**
 * Resolve the most common AutomationType among a set of steps.
 * Uses the same ordering as aggregateAutomation in skill-extractor —
 * most restrictive wins when counts are tied.
 */
function dominantAutomationType(steps: StepIntelligence[]): AutomationType {
  if (steps.length === 0) return 'manual_only';
  const counts: Record<AutomationType, number> = {
    full_automation: 0,
    ai_assisted: 0,
    human_in_loop: 0,
    manual_only: 0,
  };
  for (const s of steps) {
    counts[s.automationClassification] += 1;
  }
  // Most permissive first; if tied, prefer most permissive
  const order: AutomationType[] = ['full_automation', 'ai_assisted', 'human_in_loop', 'manual_only'];
  let best: AutomationType = 'manual_only';
  let bestCount = -1;
  for (const t of order) {
    if (counts[t] > bestCount) {
      bestCount = counts[t];
      best = t;
    }
  }
  return best;
}

/**
 * Compute the four scoring factors and composite score for an opportunity.
 */
function computeScore(params: {
  estimatedTimeSavingsMs: number | null;
  totalWorkflowDurationMs: number | null;
  affectedStepCount: number;
  dominantAutomation: AutomationType;
  avgConfidence: number;
}): {
  timeSaved: number;
  frequency: number;
  feasibility: number;
  reliability: number;
  score: number;
} {
  const { estimatedTimeSavingsMs, totalWorkflowDurationMs, affectedStepCount, dominantAutomation, avgConfidence } = params;

  let timeSaved: number;
  if (estimatedTimeSavingsMs === null || totalWorkflowDurationMs === null || totalWorkflowDurationMs === 0) {
    timeSaved = 50;
  } else {
    timeSaved = Math.min(100, (estimatedTimeSavingsMs / totalWorkflowDurationMs) * 100);
  }
  timeSaved = Math.round(timeSaved);

  const frequency = Math.min(100, affectedStepCount * 20);
  const feasibility = automationFeasibility(dominantAutomation);
  const reliability = Math.round(Math.min(100, avgConfidence * 100));

  const score = Math.round(
    timeSaved * 0.35 +
    frequency * 0.20 +
    feasibility * 0.30 +
    reliability * 0.15,
  );

  return { timeSaved, frequency, feasibility, reliability, score };
}

/**
 * Build an OpportunityEvidence entry.
 */
function makeEvidence(
  signal: string,
  sourceStepIds: string[],
  metric: string,
  reasoning: string,
): OpportunityEvidence {
  return { signal, sourceStepIds, metric, reasoning };
}

/**
 * Find activity IDs that contain at least one of the given step IDs.
 */
function findActivityIds(stepIds: string[], activities: Activity[]): string[] {
  return activities
    .filter(a => a.stepIds.some(sid => stepIds.includes(sid)))
    .map(a => a.activityId);
}

/**
 * Find skill IDs whose sourceStepIds overlap with the given step IDs.
 */
function findSkillIds(stepIds: string[], skillLibrary: SkillLibrary): string[] {
  return skillLibrary.skills
    .filter(sk => sk.sourceStepIds.some(sid => stepIds.includes(sid)))
    .map(sk => sk.skillId);
}

/**
 * Collect unique systems from a set of steps.
 */
function collectSystems(steps: StepIntelligence[]): string[] {
  return [...new Set(steps.map(s => s.system).filter((s): s is string => s !== null))];
}

/**
 * Average confidence for a set of steps.
 */
function avgConfidence(steps: StepIntelligence[]): number {
  if (steps.length === 0) return 0;
  return steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
}

// ─── Partial opportunity (pre-score) ──────────────────────────────────────────

interface RawOpportunity {
  category: OpportunityCategory;
  classification: OpportunityClassification;
  title: string;
  description: string;
  affectedStepIds: string[];
  affectedActivityIds: string[];
  relatedSkillIds: string[];
  systems: string[];
  evidence: OpportunityEvidence[];
  estimatedTimeSavingsMs: number | null;
  confidence: number;
  dominantAutomation: AutomationType;
}

// ─── Category 1: Repetition ───────────────────────────────────────────────────

function detectRepetition(
  steps: StepIntelligence[],
  activities: Activity[],
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Signal A: Skills with 2+ sourceStepIds (same skill repeated)
  for (const skill of skillLibrary.skills) {
    if (skill.sourceStepIds.length >= 2) {
      const affectedSteps = steps.filter(s => skill.sourceStepIds.includes(s.stepId));
      if (affectedSteps.length < 2) continue;

      // Time savings: sum of repeated step durations minus one occurrence
      const durations = affectedSteps.map(s => s.estimatedDurationMs);
      const hasMissingDuration = durations.some(d => d === null);
      const estimatedTimeSavingsMs = hasMissingDuration
        ? null
        : sumDurations(durations.slice(1));

      const affectedActivityIds = findActivityIds(skill.sourceStepIds, activities);

      opportunities.push({
        category: 'repetition',
        classification: 'automation_candidate',
        title: `Repeated skill: ${skill.skillName}`,
        description: `The action '${skill.description}' is performed ${skill.sourceStepIds.length} times in this workflow. Automating it once and reusing the result eliminates redundant manual effort.`,
        affectedStepIds: [...skill.sourceStepIds],
        affectedActivityIds,
        relatedSkillIds: [skill.skillId],
        systems: [...skill.requiredSystems],
        evidence: [
          makeEvidence(
            'repeated_skill',
            skill.sourceStepIds,
            `count=${skill.sourceStepIds.length}`,
            `Skill '${skill.skillName}' appears ${skill.sourceStepIds.length} times in this workflow`,
          ),
        ],
        estimatedTimeSavingsMs,
        confidence: skill.confidence,
        dominantAutomation: skill.automationClassification,
      });
    }
  }

  // Signal B: Consecutive steps with the same verb
  const verbRuns: Map<string, StepIntelligence[]> = new Map();
  let currentVerb: string | null = null;
  let currentRun: StepIntelligence[] = [];

  for (const step of steps) {
    if (step.verb === currentVerb) {
      currentRun.push(step);
    } else {
      if (currentRun.length >= 3 && currentVerb !== null) {
        const key = `consecutive-verb-${currentVerb}`;
        verbRuns.set(key, [...currentRun]);
      }
      currentVerb = step.verb;
      currentRun = [step];
    }
  }
  // Flush final run
  if (currentRun.length >= 3 && currentVerb !== null) {
    const key = `consecutive-verb-${currentVerb}`;
    verbRuns.set(key, [...currentRun]);
  }

  for (const [, runSteps] of verbRuns) {
    const verb = runSteps[0]!.verb;
    const stepIds = runSteps.map(s => s.stepId);

    // Avoid duplicating what skill-based detection already captured
    const alreadyCovered = opportunities.some(
      o => o.category === 'repetition' && stepIds.every(id => o.affectedStepIds.includes(id)),
    );
    if (alreadyCovered) continue;

    const durations = runSteps.map(s => s.estimatedDurationMs);
    const hasMissingDuration = durations.some(d => d === null);
    const estimatedTimeSavingsMs = hasMissingDuration
      ? null
      : sumDurations(durations.slice(1));

    opportunities.push({
      category: 'repetition',
      classification: 'automation_candidate',
      title: `Repeated '${verb}' actions (${runSteps.length} consecutive steps)`,
      description: `${runSteps.length} consecutive steps all perform '${verb}' actions. These can be consolidated or automated as a single repeated operation.`,
      affectedStepIds: stepIds,
      affectedActivityIds: findActivityIds(stepIds, activities),
      relatedSkillIds: findSkillIds(stepIds, skillLibrary),
      systems: collectSystems(runSteps),
      evidence: [
        makeEvidence(
          'consecutive_same_verb',
          stepIds,
          `count=${runSteps.length}`,
          `${runSteps.length} consecutive steps with verb '${verb}'`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: avgConfidence(runSteps),
      dominantAutomation: dominantAutomationType(runSteps),
    });
  }

  return opportunities;
}

// ─── Category 2: Deterministic Logic ─────────────────────────────────────────

function detectDeterministicLogic(
  steps: StepIntelligence[],
  activities: Activity[],
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Find runs of consecutive fully-automatable, high-confidence steps
  let currentRun: StepIntelligence[] = [];

  const flushRun = () => {
    if (currentRun.length >= 2) {
      const stepIds = currentRun.map(s => s.stepId);
      const durations = currentRun.map(s => s.estimatedDurationMs);
      const hasMissingDuration = durations.some(d => d === null);
      const estimatedTimeSavingsMs = hasMissingDuration
        ? null
        : sumDurations(durations);

      opportunities.push({
        category: 'deterministic_logic',
        classification: 'automation_candidate',
        title: `${currentRun.length} consecutive deterministic steps`,
        description: `${currentRun.length} consecutive steps are fully automatable with high confidence. These can be scripted into a single automated sequence with no human involvement.`,
        affectedStepIds: stepIds,
        affectedActivityIds: findActivityIds(stepIds, activities),
        relatedSkillIds: findSkillIds(stepIds, skillLibrary),
        systems: collectSystems(currentRun),
        evidence: [
          makeEvidence(
            'consecutive_full_automation',
            stepIds,
            `count=${currentRun.length}`,
            `${currentRun.length} consecutive steps are fully deterministic and automatable`,
          ),
        ],
        estimatedTimeSavingsMs,
        confidence: avgConfidence(currentRun),
        dominantAutomation: 'full_automation',
      });
    }
    currentRun = [];
  };

  for (const step of steps) {
    if (
      step.automationClassification === 'full_automation' &&
      step.confidence >= 0.8
    ) {
      currentRun.push(step);
    } else {
      flushRun();
    }
  }
  flushRun();

  return opportunities;
}

// ─── Category 3: Data Movement ────────────────────────────────────────────────

function detectDataMovement(
  steps: StepIntelligence[],
  activities: Activity[],
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Signal A: outputData of step A overlaps with inputData of later step B in a different system
  for (let i = 0; i < steps.length; i++) {
    const producer = steps[i]!;
    if (producer.outputData.length === 0) continue;

    for (let j = i + 1; j < steps.length; j++) {
      const consumer = steps[j]!;
      if (consumer.inputData.length === 0) continue;

      // Must be different systems
      if (producer.system === consumer.system) continue;
      if (producer.system === null || consumer.system === null) continue;

      const overlap = producer.outputData.filter(field => consumer.inputData.includes(field));
      if (overlap.length === 0) continue;

      const affectedStepIds = [producer.stepId, consumer.stepId];
      const durations = [producer.estimatedDurationMs, consumer.estimatedDurationMs];
      const hasMissingDuration = durations.some(d => d === null);
      // Savings are from the data entry (consumer) step
      const estimatedTimeSavingsMs = hasMissingDuration
        ? null
        : (consumer.estimatedDurationMs as number);

      opportunities.push({
        category: 'data_movement',
        classification: 'integration_opportunity',
        title: `Manual data transfer: ${producer.system} → ${consumer.system}`,
        description: `Data produced in ${producer.system} (${overlap.join(', ')}) is manually re-entered in ${consumer.system}. An API integration would eliminate this manual bridging.`,
        affectedStepIds,
        affectedActivityIds: findActivityIds(affectedStepIds, activities),
        relatedSkillIds: findSkillIds(affectedStepIds, skillLibrary),
        systems: [producer.system, consumer.system],
        evidence: [
          makeEvidence(
            'cross_system_data_overlap',
            affectedStepIds,
            `fields=${overlap.join(',')}`,
            `Data flows manually from ${producer.system} to ${consumer.system} via ${overlap.join(', ')}`,
          ),
        ],
        estimatedTimeSavingsMs,
        confidence: (producer.confidence + consumer.confidence) / 2,
        dominantAutomation: dominantAutomationType([producer, consumer]),
      });
    }
  }

  // Signal B: copy/paste verbs
  const copyPasteSteps = steps.filter(s => COPY_PASTE_VERBS.has(s.verb));
  if (copyPasteSteps.length > 0) {
    const stepIds = copyPasteSteps.map(s => s.stepId);
    const durations = copyPasteSteps.map(s => s.estimatedDurationMs);
    const hasMissingDuration = durations.some(d => d === null);
    const estimatedTimeSavingsMs = hasMissingDuration
      ? null
      : sumDurations(durations);

    opportunities.push({
      category: 'data_movement',
      classification: 'integration_opportunity',
      title: `Manual copy/paste detected (${copyPasteSteps.length} steps)`,
      description: `${copyPasteSteps.length} copy/paste steps were detected. These are a strong signal of manual data bridging between systems that should be replaced with direct integration.`,
      affectedStepIds: stepIds,
      affectedActivityIds: findActivityIds(stepIds, activities),
      relatedSkillIds: findSkillIds(stepIds, skillLibrary),
      systems: collectSystems(copyPasteSteps),
      evidence: [
        makeEvidence(
          'copy_paste_verb',
          stepIds,
          `count=${copyPasteSteps.length}`,
          `Copy/paste operations detected — these indicate manual data bridging`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: avgConfidence(copyPasteSteps),
      dominantAutomation: dominantAutomationType(copyPasteSteps),
    });
  }

  // Signal C: data_entry skill following data_extraction skill (cross-step)
  const skillsByStep = new Map<string, string>();
  for (const skill of skillLibrary.skills) {
    for (const stepId of skill.sourceStepIds) {
      skillsByStep.set(stepId, skill.skillType);
    }
  }

  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i]!;
    const next = steps[i + 1]!;
    if (
      skillsByStep.get(current.stepId) === 'data_extraction' &&
      skillsByStep.get(next.stepId) === 'data_entry' &&
      current.system !== next.system
    ) {
      const affectedStepIds = [current.stepId, next.stepId];
      const alreadyCovered = opportunities.some(
        o =>
          o.category === 'data_movement' &&
          affectedStepIds.every(id => o.affectedStepIds.includes(id)),
      );
      if (alreadyCovered) continue;

      const durations = [current.estimatedDurationMs, next.estimatedDurationMs];
      const hasMissingDuration = durations.some(d => d === null);
      const estimatedTimeSavingsMs = hasMissingDuration
        ? null
        : (next.estimatedDurationMs as number);

      opportunities.push({
        category: 'data_movement',
        classification: 'integration_opportunity',
        title: `Extract-then-enter pattern: ${current.system ?? 'unknown'} → ${next.system ?? 'unknown'}`,
        description: `A data extraction step is immediately followed by a data entry step in a different system. This pattern indicates manual data bridging that an integration could automate.`,
        affectedStepIds,
        affectedActivityIds: findActivityIds(affectedStepIds, activities),
        relatedSkillIds: findSkillIds(affectedStepIds, skillLibrary),
        systems: [current.system, next.system].filter((s): s is string => s !== null),
        evidence: [
          makeEvidence(
            'extraction_followed_by_entry',
            affectedStepIds,
            `systems=${current.system ?? 'unknown'}->${next.system ?? 'unknown'}`,
            `Data extracted from ${current.system ?? 'unknown'} then manually entered into ${next.system ?? 'unknown'}`,
          ),
        ],
        estimatedTimeSavingsMs,
        confidence: (current.confidence + next.confidence) / 2,
        dominantAutomation: dominantAutomationType([current, next]),
      });
    }
  }

  return opportunities;
}

// ─── Category 4: Content Generation ──────────────────────────────────────────

function detectContentGeneration(
  steps: StepIntelligence[],
  activities: Activity[],
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Signal A: content verb + content object
  const contentSteps = steps.filter(
    s => CONTENT_VERBS.has(s.verb) && CONTENT_OBJECTS.has(s.object),
  );

  // Signal B: communication skillType with inputData
  const communicationSteps = steps.filter(s => {
    const skillType = skillLibrary.skills.find(sk => sk.sourceStepIds.includes(s.stepId))?.skillType;
    return skillType === 'communication' && s.inputData.length > 0;
  });

  // Merge, deduplicate
  const allContentSteps = [...new Map(
    [...contentSteps, ...communicationSteps].map(s => [s.stepId, s]),
  ).values()];

  if (allContentSteps.length === 0) return [];

  const stepIds = allContentSteps.map(s => s.stepId);
  const durations = allContentSteps.map(s => s.estimatedDurationMs);
  const hasMissingDuration = durations.some(d => d === null);
  // AI can draft, human reviews quickly — 70% savings
  const estimatedTimeSavingsMs = hasMissingDuration
    ? null
    : Math.round(sumDurations(durations) * 0.7);

  const intents = allContentSteps.map(s => s.inferredIntent).join('; ');

  opportunities.push({
    category: 'content_generation',
    classification: 'ai_assist_candidate',
    title: `AI-assisted content creation (${allContentSteps.length} steps)`,
    description: `${allContentSteps.length} steps involve content creation (emails, reports, documents). AI can generate drafts, reducing the human effort to review and approve rather than author from scratch.`,
    affectedStepIds: stepIds,
    affectedActivityIds: findActivityIds(stepIds, activities),
    relatedSkillIds: findSkillIds(stepIds, skillLibrary),
    systems: collectSystems(allContentSteps),
    evidence: [
      makeEvidence(
        'content_creation_detected',
        stepIds,
        `count=${allContentSteps.length}`,
        `Content creation detected: ${intents} — AI can generate drafts`,
      ),
    ],
    estimatedTimeSavingsMs,
    confidence: avgConfidence(allContentSteps),
    dominantAutomation: dominantAutomationType(allContentSteps),
  });

  return opportunities;
}

// ─── Category 5: Multi-System Orchestration ───────────────────────────────────

function detectMultiSystemOrchestration(
  steps: StepIntelligence[],
  activities: Activity[],
  workflow: WorkflowStructure,
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  if (workflow.systems.length < 3) return [];

  const stepIds = steps.map(s => s.stepId);
  const totalDuration = workflow.totalDurationMs;
  const estimatedTimeSavingsMs =
    totalDuration !== null ? Math.round(totalDuration * 0.3) : null;

  const systemList = workflow.systems.join(', ');

  return [
    {
      category: 'multi_system_orchestration',
      classification: 'agent_orchestration_candidate',
      title: `Multi-system workflow spanning ${workflow.systems.length} systems`,
      description: `This workflow spans ${workflow.systems.length} systems (${systemList}). An agent orchestrator can coordinate across these systems, eliminating manual context-switching and reducing coordination errors.`,
      affectedStepIds: stepIds,
      affectedActivityIds: activities.map(a => a.activityId),
      relatedSkillIds: findSkillIds(stepIds, skillLibrary),
      systems: [...workflow.systems],
      evidence: [
        makeEvidence(
          'multi_system_workflow',
          stepIds,
          `system_count=${workflow.systems.length}`,
          `Workflow spans ${workflow.systems.length} systems (${systemList}) — agent orchestration can reduce context switching`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: workflow.confidence,
      dominantAutomation: workflow.automationClassification,
    },
  ];
}

// ─── Category 6: Friction Reduction ──────────────────────────────────────────

function detectFrictionReduction(
  steps: StepIntelligence[],
  activities: Activity[],
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Signal A: individual slow steps
  const slowSteps = steps.filter(
    s => s.estimatedDurationMs !== null && s.estimatedDurationMs > FRICTION_STEP_THRESHOLD_MS,
  );

  for (const step of slowSteps) {
    const durationMs = step.estimatedDurationMs as number;
    const seconds = Math.round(durationMs / 1000);
    const estimatedTimeSavingsMs = Math.round(durationMs * 0.5);

    opportunities.push({
      category: 'friction_reduction',
      classification: 'ai_assist_candidate',
      title: `High-friction step: ${step.inferredIntent}`,
      description: `This step takes ${seconds}s — significantly above the typical threshold for '${step.verb}' actions. AI assistance or automation can reduce the time spent on this step.`,
      affectedStepIds: [step.stepId],
      affectedActivityIds: findActivityIds([step.stepId], activities),
      relatedSkillIds: findSkillIds([step.stepId], skillLibrary),
      systems: step.system !== null ? [step.system] : [],
      evidence: [
        makeEvidence(
          'high_duration_step',
          [step.stepId],
          `duration=${seconds}s`,
          `Step takes ${seconds}s — above typical threshold for '${step.verb}' actions`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: step.confidence,
      dominantAutomation: step.automationClassification,
    });
  }

  // Signal B: long multi-step activities
  for (const activity of activities) {
    if (
      activity.stepCount >= FRICTION_ACTIVITY_MIN_STEPS &&
      activity.estimatedDurationMs !== null &&
      activity.estimatedDurationMs > FRICTION_ACTIVITY_THRESHOLD_MS
    ) {
      const durationSec = Math.round((activity.estimatedDurationMs) / 1000);
      const estimatedTimeSavingsMs = Math.round(activity.estimatedDurationMs * 0.5);

      // Avoid duplicating step-level opportunities
      const alreadyCovered = opportunities.some(
        o =>
          o.category === 'friction_reduction' &&
          activity.stepIds.every(id => o.affectedStepIds.includes(id)),
      );
      if (alreadyCovered) continue;

      const affectedSteps = steps.filter(s => activity.stepIds.includes(s.stepId));

      opportunities.push({
        category: 'friction_reduction',
        classification: 'ai_assist_candidate',
        title: `High-friction activity: ${activity.activityName}`,
        description: `Activity '${activity.activityName}' has ${activity.stepCount} steps and takes ${durationSec}s. Reducing friction through AI assistance or partial automation would meaningfully improve throughput.`,
        affectedStepIds: [...activity.stepIds],
        affectedActivityIds: [activity.activityId],
        relatedSkillIds: findSkillIds(activity.stepIds, skillLibrary),
        systems: [...activity.systems],
        evidence: [
          makeEvidence(
            'long_multi_step_activity',
            activity.stepIds,
            `steps=${activity.stepCount},duration=${durationSec}s`,
            `Activity has ${activity.stepCount} steps and takes ${durationSec}s — high friction indicator`,
          ),
        ],
        estimatedTimeSavingsMs,
        confidence: activity.confidence,
        dominantAutomation: dominantAutomationType(affectedSteps),
      });
    }
  }

  return opportunities;
}

// ─── Category 7: Decision Support ────────────────────────────────────────────

function detectDecisionSupport(
  steps: StepIntelligence[],
  activities: Activity[],
  workflow: WorkflowStructure,
  skillLibrary: SkillLibrary,
): RawOpportunity[] {
  const opportunities: RawOpportunity[] = [];

  // Signal A: human_judgment decision points
  const humanJudgmentDecisions = workflow.decisionPoints.filter(
    dp => dp.type === 'human_judgment',
  );

  for (const dp of humanJudgmentDecisions) {
    // Find steps adjacent to this decision point
    const afterIndex = steps.findIndex(s => s.stepId === dp.afterStepId);
    const adjacentSteps = afterIndex >= 0
      ? steps.slice(Math.max(0, afterIndex - 1), afterIndex + 2)
      : [];

    const stepIds = adjacentSteps.length > 0
      ? adjacentSteps.map(s => s.stepId)
      : [dp.afterStepId];

    const durations = adjacentSteps.map(s => s.estimatedDurationMs);
    const hasMissingDuration = durations.some(d => d === null);
    const estimatedTimeSavingsMs = hasMissingDuration || durations.length === 0
      ? null
      : Math.round(sumDurations(durations) * 0.4);

    opportunities.push({
      category: 'decision_support',
      classification: 'ai_assist_candidate',
      title: `Human judgment required: ${dp.description}`,
      description: `A human judgment decision point was detected after step ${dp.afterStepId}. AI can pre-analyze inputs and provide recommendations, reducing cognitive load and decision time.`,
      affectedStepIds: stepIds,
      affectedActivityIds: findActivityIds(stepIds, activities),
      relatedSkillIds: findSkillIds(stepIds, skillLibrary),
      systems: collectSystems(adjacentSteps),
      evidence: [
        makeEvidence(
          'human_judgment_decision_point',
          stepIds,
          `decision_id=${dp.decisionId}`,
          `Human judgment required at step ${dp.afterStepId} — AI can provide recommendations`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: dp.confidence,
      dominantAutomation: 'human_in_loop',
    });
  }

  // Signal B: steps with human_in_loop classification
  const humanInLoopSteps = steps.filter(
    s => s.automationClassification === 'human_in_loop',
  );

  if (humanInLoopSteps.length > 0) {
    const stepIds = humanInLoopSteps.map(s => s.stepId);

    // Avoid full duplication with decision point opportunities if same steps
    const notAlreadyCovered = humanInLoopSteps.filter(
      s => !opportunities.some(o => o.affectedStepIds.includes(s.stepId)),
    );
    if (notAlreadyCovered.length === 0) return opportunities;

    const uncoveredIds = notAlreadyCovered.map(s => s.stepId);
    const durations = notAlreadyCovered.map(s => s.estimatedDurationMs);
    const hasMissingDuration = durations.some(d => d === null);
    const estimatedTimeSavingsMs = hasMissingDuration
      ? null
      : Math.round(sumDurations(durations) * 0.4);

    opportunities.push({
      category: 'decision_support',
      classification: 'ai_assist_candidate',
      title: `Human-in-loop steps (${notAlreadyCovered.length} steps)`,
      description: `${notAlreadyCovered.length} steps require human approval before execution. AI can pre-evaluate these steps and provide a recommendation, turning approvals from deliberation to confirmation.`,
      affectedStepIds: uncoveredIds,
      affectedActivityIds: findActivityIds(uncoveredIds, activities),
      relatedSkillIds: findSkillIds(uncoveredIds, skillLibrary),
      systems: collectSystems(notAlreadyCovered),
      evidence: [
        makeEvidence(
          'human_in_loop_steps',
          uncoveredIds,
          `count=${notAlreadyCovered.length}`,
          `${notAlreadyCovered.length} steps have human_in_loop automation classification — AI can provide pre-analysis`,
        ),
      ],
      estimatedTimeSavingsMs,
      confidence: avgConfidence(notAlreadyCovered),
      dominantAutomation: 'human_in_loop',
    });
  }

  return opportunities;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Within each category, if a step appears in multiple opportunities, keep only
 * the higher-scoring one. Steps CAN appear across different categories.
 *
 * This function works on pre-scored opportunities so score is available for
 * comparison. We run it after scoring.
 */
function deduplicateWithinCategory(opportunities: Opportunity[]): Opportunity[] {
  const byCategory = new Map<OpportunityCategory, Opportunity[]>();

  for (const opp of opportunities) {
    const existing = byCategory.get(opp.category) ?? [];
    existing.push(opp);
    byCategory.set(opp.category, existing);
  }

  const result: Opportunity[] = [];

  for (const [, catOpps] of byCategory) {
    // For each opportunity in this category, check if its steps are covered by
    // a higher-scoring opportunity also in this category.
    const kept: Opportunity[] = [];

    // Sort by score descending so greedy selection works
    const sorted = [...catOpps].sort((a, b) => b.score - a.score);

    for (const opp of sorted) {
      // Check if all affected steps are already covered by a kept opportunity
      const alreadyCovered = opp.affectedStepIds.every(stepId =>
        kept.some(k => k.affectedStepIds.includes(stepId)),
      );
      if (!alreadyCovered) {
        kept.push(opp);
      }
    }

    result.push(...kept);
  }

  return result;
}

// ─── Score raw opportunities ──────────────────────────────────────────────────

function scoreOpportunity(
  raw: RawOpportunity,
  totalWorkflowDurationMs: number | null,
): Opportunity {
  const affectedStepCount = raw.affectedStepIds.length;
  const scoreFactors = computeScore({
    estimatedTimeSavingsMs: raw.estimatedTimeSavingsMs,
    totalWorkflowDurationMs,
    affectedStepCount,
    dominantAutomation: raw.dominantAutomation,
    avgConfidence: raw.confidence,
  });

  return {
    // opportunityId assigned after sorting
    opportunityId: 'opp-0',
    category: raw.category,
    classification: raw.classification,
    title: raw.title,
    description: raw.description,
    affectedStepIds: raw.affectedStepIds,
    affectedActivityIds: raw.affectedActivityIds,
    relatedSkillIds: raw.relatedSkillIds,
    systems: raw.systems,
    evidence: raw.evidence,
    score: scoreFactors.score,
    scoringFactors: {
      timeSaved: scoreFactors.timeSaved,
      frequency: scoreFactors.frequency,
      feasibility: scoreFactors.feasibility,
      reliability: scoreFactors.reliability,
    },
    estimatedTimeSavingsMs: raw.estimatedTimeSavingsMs,
    confidence: Math.round(raw.confidence * 1000) / 1000,
  };
}

// ─── Initialize breakdown records ─────────────────────────────────────────────

function initCategoryBreakdown(): Record<OpportunityCategory, number> {
  return {
    repetition: 0,
    deterministic_logic: 0,
    data_movement: 0,
    content_generation: 0,
    multi_system_orchestration: 0,
    friction_reduction: 0,
    decision_support: 0,
  };
}

function initClassificationBreakdown(): Record<OpportunityClassification, number> {
  return {
    automation_candidate: 0,
    ai_assist_candidate: 0,
    integration_opportunity: 0,
    agent_orchestration_candidate: 0,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect AI and automation opportunities in a workflow.
 *
 * Analyzes steps, activities, workflow structure, and skill library to produce
 * a scored, evidence-backed list of where AI, automation, and agents can be applied.
 *
 * @param steps - StepIntelligence[] from the parse stage
 * @param activities - Activity[] from the activity-builder stage
 * @param workflow - WorkflowStructure from the workflow-builder stage
 * @param skillLibrary - SkillLibrary from the skill-extractor stage
 * @returns OpportunityAnalysis with scored opportunities and aggregate metrics
 */
export function detectOpportunities(
  steps: StepIntelligence[],
  activities: Activity[],
  workflow: WorkflowStructure,
  skillLibrary: SkillLibrary,
): OpportunityAnalysis {
  const emptyAnalysis: OpportunityAnalysis = {
    opportunities: [],
    totalOpportunities: 0,
    categoryBreakdown: initCategoryBreakdown(),
    classificationBreakdown: initClassificationBreakdown(),
    topScore: 0,
    totalEstimatedTimeSavingsMs: null,
  };

  if (steps.length === 0) {
    return emptyAnalysis;
  }

  // ── Detect raw opportunities by category ──────────────────────────────────

  const rawOpportunities: RawOpportunity[] = [
    ...detectRepetition(steps, activities, skillLibrary),
    ...detectDeterministicLogic(steps, activities, skillLibrary),
    ...detectDataMovement(steps, activities, skillLibrary),
    ...detectContentGeneration(steps, activities, skillLibrary),
    ...detectMultiSystemOrchestration(steps, activities, workflow, skillLibrary),
    ...detectFrictionReduction(steps, activities, skillLibrary),
    ...detectDecisionSupport(steps, activities, workflow, skillLibrary),
  ];

  if (rawOpportunities.length === 0) {
    return emptyAnalysis;
  }

  // ── Score each opportunity ─────────────────────────────────────────────────

  const scored = rawOpportunities.map(raw =>
    scoreOpportunity(raw, workflow.totalDurationMs),
  );

  // ── Deduplicate within category ────────────────────────────────────────────

  const deduplicated = deduplicateWithinCategory(scored);

  // ── Sort by score descending, then assign stable IDs ──────────────────────

  deduplicated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: category alphabetical for determinism
    return a.category.localeCompare(b.category);
  });

  const opportunities: Opportunity[] = deduplicated.map((opp, idx) => ({
    ...opp,
    opportunityId: `opp-${idx + 1}`,
  }));

  // ── Aggregate metrics ──────────────────────────────────────────────────────

  const categoryBreakdown = initCategoryBreakdown();
  const classificationBreakdown = initClassificationBreakdown();

  for (const opp of opportunities) {
    categoryBreakdown[opp.category] += 1;
    classificationBreakdown[opp.classification] += 1;
  }

  const topScore = opportunities.length > 0 ? opportunities[0]!.score : 0;

  const hasNullSavings = opportunities.some(o => o.estimatedTimeSavingsMs === null);
  const totalEstimatedTimeSavingsMs = hasNullSavings
    ? null
    : opportunities.reduce((sum, o) => sum + (o.estimatedTimeSavingsMs as number), 0);

  return {
    opportunities,
    totalOpportunities: opportunities.length,
    categoryBreakdown,
    classificationBreakdown,
    topScore,
    totalEstimatedTimeSavingsMs,
  } satisfies OpportunityAnalysis;
}
