/**
 * Main Transformation Pipeline Orchestrator
 *
 * Converts a ProcessOutput (from @ledgerium/process-engine) into a
 * TransformationResult — the full agent-ready workflow intelligence output.
 *
 * Pipeline stages:
 * 1. parseSteps()          → StepIntelligence[]  (semantic enrichment of steps)
 * 2. buildActivities()     → Activity[]          (logical step groupings)
 * 3. detectDecisions()     → DecisionPoint[]     (branch + retry points)
 * 4. buildWorkflow()       → WorkflowStructure   (full workflow with dependencies)
 * 5. extractSkills()       → SkillLibrary        (reusable skill extraction)
 * 6. detectOpportunities() → OpportunityAnalysis (AI + automation opportunity scoring)
 * 7. composeAgents()       → AgentComposition    (agent profile composition)
 *
 * All stages are deterministic and pure — same input → same output.
 * Pipeline timing is included in metadata for observability.
 */

import type { ProcessOutput } from '@ledgerium/process-engine';
import type { TransformationResult } from './types.js';
import { AGENT_INTELLIGENCE_VERSION } from './types.js';
import { parseSteps } from './step-parser.js';
import { buildActivities } from './activity-builder.js';
import { detectDecisions } from './decision-detector.js';
import { buildWorkflow } from './workflow-builder.js';
import { extractSkills } from './skill-extractor.js';
import { detectOpportunities } from './opportunity-detector.js';
import { composeAgents } from './agent-composer.js';

/**
 * Transform a ProcessOutput into a full TransformationResult.
 *
 * This is the primary entry point for the agent-intelligence package.
 * All business logic is delegated to the individual stage functions.
 *
 * @param output - Full process engine output containing run, definition, map, and SOP
 * @returns Complete transformation result with steps, activities, workflow, and metadata
 */
export function transformWorkflow(output: ProcessOutput): TransformationResult {
  const startMs = Date.now();

  // Stage 1: Parse steps into enriched StepIntelligence objects
  const steps = parseSteps(output);

  // Stage 2: Group steps into logical activities
  const activities = buildActivities(steps);

  // Stage 3: Detect decision points from map structure and friction
  const decisionPoints = detectDecisions(steps, output);

  // Stage 4: Build the complete workflow structure
  const workflow = buildWorkflow(steps, activities, decisionPoints, output);

  // Stage 5: Extract reusable skills from steps and activities
  const skillLibrary = extractSkills(steps, activities);

  // Stage 6: Detect AI and automation opportunities
  const opportunities = detectOpportunities(steps, activities, workflow, skillLibrary);

  // Stage 7: Compose agent profiles from activities, skills, and opportunities
  const agentComposition = composeAgents(activities, skillLibrary, opportunities, workflow, steps);

  const pipelineDurationMs = Date.now() - startMs;

  return {
    steps,
    activities,
    workflow,
    decisionPoints,
    skillLibrary,
    opportunities,
    agentComposition,
    metadata: {
      engineVersion: AGENT_INTELLIGENCE_VERSION,
      processedAt: new Date().toISOString(),
      sourceRunId: output.processRun.runId,
      pipelineDurationMs,
    },
  };
}
