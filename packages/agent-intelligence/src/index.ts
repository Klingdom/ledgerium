/**
 * @ledgerium/agent-intelligence
 *
 * Core Transformation Engine for agent-ready workflow intelligence.
 *
 * Converts ProcessOutput (from @ledgerium/process-engine) into:
 * - StepIntelligence: semantic enrichment of each step (intent, verb, object, system,
 *   automation classification, traceability)
 * - Activity: logical groupings of steps by system boundary and intent
 * - DecisionPoint: branch, retry, and human judgment points in the workflow
 * - WorkflowStructure: full workflow with dependencies and automation scoring
 * - TransformationResult: complete pipeline output with metadata
 *
 * All processing is deterministic and rule-based (no LLM calls).
 * Every output traces back to source event IDs.
 */

// ─── Main pipeline ────────────────────────────────────────────────────────────

export { transformWorkflow } from './transform.js';

// ─── Individual pipeline stages (composable) ─────────────────────────────────

export { parseSteps } from './step-parser.js';
export { buildActivities } from './activity-builder.js';
export { detectDecisions } from './decision-detector.js';
export { buildWorkflow } from './workflow-builder.js';
export { extractSkills } from './skill-extractor.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  AutomationType,
  InferenceMethod,
  SkillType,
  StepIntelligence,
  Activity,
  DecisionPoint,
  WorkflowStructure,
  WorkflowDependency,
  TransformationResult,
  Skill,
  SkillIO,
  SkillCluster,
  SkillLibrary,
} from './types.js';

export { AGENT_INTELLIGENCE_VERSION } from './types.js';

// ─── Mapping tables (for external use / extension) ───────────────────────────

export {
  VERB_MAP,
  OBJECT_MAP,
  SYSTEM_MAP,
  EVENT_TYPE_VERB_MAP,
  VERB_TO_ACTION_TYPE,
  CATEGORY_TO_AUTOMATION,
  VERB_TO_SKILL_TYPE,
  SYSTEM_CAPABILITIES,
} from './verb-maps.js';
