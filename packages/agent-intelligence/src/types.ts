/**
 * Agent Intelligence — Core Type Definitions
 *
 * Defines the output shape for the transformation pipeline that converts
 * ProcessOutput (from @ledgerium/process-engine) into structured agent-ready
 * workflow intelligence.
 *
 * Design principles:
 * - All outputs are deterministic (same input → same output)
 * - Every field includes a confidence score
 * - Every step traces back to source event IDs
 * - No PII or raw DOM selectors in intent strings
 */

// ─── Version ──────────────────────────────────────────────────────────────────

export const AGENT_INTELLIGENCE_VERSION = '0.1.0' as const;

// ─── AutomationType ───────────────────────────────────────────────────────────

/**
 * Classification of how a step or activity can be automated.
 * Ordered from least to most human involvement required.
 */
export type AutomationType =
  | 'full_automation'   // No human needed — fully scriptable
  | 'ai_assisted'       // AI can draft/suggest; human reviews
  | 'human_in_loop'     // Human must approve before execution
  | 'manual_only';      // Cannot be automated safely

// ─── InferenceMethod ──────────────────────────────────────────────────────────

/**
 * How a particular field value was derived.
 * Used to communicate confidence and reproducibility.
 */
export type InferenceMethod =
  | 'deterministic'   // Rule-based, same output every time
  | 'heuristic'       // Pattern-based, likely correct but not guaranteed
  | 'llm_inferred';   // Reserved for future LLM-assisted inference (not used in v0.1)

// ─── SkillType ────────────────────────────────────────────────────────────────

/**
 * The type of skill required to execute a step.
 * Maps to agent capability categories.
 */
export type SkillType =
  | 'data_extraction'
  | 'data_entry'
  | 'navigation'
  | 'verification'
  | 'communication'
  | 'file_operation'
  | 'decision'
  | 'integration'
  | 'monitoring';

// ─── StepIntelligence ─────────────────────────────────────────────────────────

/**
 * Semantic interpretation of a single step from the process engine.
 * Enriches raw StepDefinition + SOPStep with intent, classification, and
 * traceability for agent consumption.
 */
export interface StepIntelligence {
  /** From StepDefinition.stepId — stable cross-pipeline identifier. */
  stepId: string;
  /** From ProcessRun.runId — identifies the source workflow. */
  sourceWorkflowId: string;
  /**
   * Canonical action type for agent tooling.
   * Examples: 'click', 'type', 'navigate', 'upload', 'submit', 'download'
   */
  actionType: string;
  /**
   * Human-readable statement of what this step accomplishes.
   * Examples: "Send report email via Gmail", "Fill invoice form in NetSuite"
   * Never contains raw CSS selectors or DOM element names.
   */
  inferredIntent: string;
  /** Canonical verb extracted from step title. Examples: 'send', 'fill', 'navigate' */
  verb: string;
  /** Canonical object extracted from step title. Examples: 'email', 'form', 'file' */
  object: string;
  /** Additional contextual qualifier, or null if none detected. */
  qualifier: string | null;
  /** Canonical system name from SYSTEM_MAP, or null if not recognized. */
  system: string | null;
  /** Business entity involved (e.g. 'invoice', 'customer'). Null if not detected. */
  entity: string | null;
  /** Business domain (from StepDefinition.domains[0]). Null if not present. */
  domain: string | null;
  /** Required inputs to execute this step (from SOPStep.inputs). */
  inputData: string[];
  /** Data or artifacts produced by this step (from StepDefinition.outputs). */
  outputData: string[];
  /**
   * Conditions that must be true before this step can execute.
   * Derived from step sequence context and SOP structure.
   */
  preconditions: string[];
  /** Conditions that become true after this step completes. */
  postconditions: string[];
  /** How this step can be automated, or why it must remain manual. */
  automationClassification: AutomationType;
  /** Expected duration in milliseconds. Null if not available. */
  estimatedDurationMs: number | null;
  /** Composite confidence: 0 (unknown) → 1 (fully deterministic). */
  confidence: number;
  /** How the primary fields were derived. */
  inferenceMethod: InferenceMethod;
  /** Source event IDs for full traceability to raw captured events. */
  evidenceEventIds: string[];
  /** Link back to the original step definition for cross-referencing. */
  rawReference: {
    stepOrdinal: number;
    rawTitle: string;
    category: string;
    systems: string[];
    domains: string[];
  };
}

// ─── Activity ─────────────────────────────────────────────────────────────────

/**
 * A logical grouping of consecutive steps that share a common system context
 * or intent cluster. Activities are the unit of work for agent planning.
 */
export interface Activity {
  /** Stable ID: "act-{1-based index}" */
  activityId: string;
  /** Human-readable name describing what this activity accomplishes. */
  activityName: string;
  /** Ordered step IDs belonging to this activity. */
  stepIds: string[];
  /** What this activity accomplishes as a whole. */
  purpose: string;
  /** Primary system for this activity, or null if multi-system. */
  system: string | null;
  /** All systems accessed in this activity. */
  systems: string[];
  /** Union of all step inputs in this activity. */
  inputs: string[];
  /** Union of all step outputs in this activity. */
  outputs: string[];
  /** Sum of step durations. Null if any step lacks duration data. */
  estimatedDurationMs: number | null;
  /** Number of steps in this activity. */
  stepCount: number;
  /** Aggregate automation classification across all steps. */
  automationClassification: AutomationType;
  /** Average confidence across all steps in this activity. */
  confidence: number;
}

// ─── DecisionPoint ────────────────────────────────────────────────────────────

/**
 * A point in the workflow where the process may branch, retry, or require
 * human judgment. Detected from process map structure and friction indicators.
 */
export interface DecisionPoint {
  /** Stable ID: "dec-{1-based index}" */
  decisionId: string;
  /** The step ID after which this decision occurs. */
  afterStepId: string;
  /** The type of decision this represents. */
  type: 'conditional' | 'branching' | 'retry' | 'human_judgment' | 'error_recovery';
  /** Human-readable description of the decision. */
  description: string;
  /** Evidence strings describing why this was detected as a decision point. */
  indicators: string[];
  /** Confidence in this detection (0–1). */
  confidence: number;
  /** Step ordinals involved in this decision. */
  stepOrdinals: number[];
}

// ─── WorkflowDependency ───────────────────────────────────────────────────────

/**
 * A directed dependency edge between two activities in the workflow.
 */
export interface WorkflowDependency {
  /** Source activity ID. */
  fromActivityId: string;
  /** Target activity ID. */
  toActivityId: string;
  /**
   * Nature of the dependency.
   * 'sequential' = always follows, 'conditional' = only if a decision resolves true,
   * 'parallel' = reserved for future parallel workflow support.
   */
  type: 'sequential' | 'conditional' | 'parallel';
}

// ─── WorkflowStructure ────────────────────────────────────────────────────────

/**
 * The complete structured workflow: activities, dependencies, decision points,
 * and aggregate metrics. This is the primary output consumed by agent planners.
 */
export interface WorkflowStructure {
  /** From ProcessRun.runId. */
  workflowId: string;
  /** From ProcessRun.activityName. */
  workflowName: string;
  /** Ordered list of activities in this workflow. */
  activities: Activity[];
  /** Decision points detected in this workflow. */
  decisionPoints: DecisionPoint[];
  /** All unique systems accessed across the workflow. */
  systems: string[];
  /** Total estimated duration in ms. Null if any step lacks duration data. */
  totalDurationMs: number | null;
  /** Total number of steps across all activities. */
  stepCount: number;
  /** Total number of activities. */
  activityCount: number;
  /** Directed dependency edges between activities. */
  dependencies: WorkflowDependency[];
  /** Aggregate automation classification for the full workflow. */
  automationClassification: AutomationType;
  /**
   * Automation score: 0–100.
   * Weighted average of per-step automation potential:
   *   full_automation=100, ai_assisted=70, human_in_loop=40, manual_only=0
   * Weighted by step duration (equal weight if no duration data).
   */
  automationScore: number;
  /** Composite confidence across all steps. */
  confidence: number;
}

// ─── TransformationResult ─────────────────────────────────────────────────────

/**
 * Full output of the transformation pipeline.
 * Contains the enriched step list, activity groupings, workflow structure,
 * and pipeline metadata for traceability.
 */
export interface TransformationResult {
  /** Enriched step intelligence objects, one per StepDefinition. */
  steps: StepIntelligence[];
  /** Logical activity groupings derived from steps. */
  activities: Activity[];
  /** Complete workflow structure with dependencies and metrics. */
  workflow: WorkflowStructure;
  /** All detected decision points in the workflow. */
  decisionPoints: DecisionPoint[];
  /** Pipeline metadata for traceability and debugging. */
  metadata: {
    /** Version of the agent-intelligence engine. */
    engineVersion: string;
    /** ISO-8601 timestamp of when the transformation was run. */
    processedAt: string;
    /** The ProcessRun.runId this was derived from. */
    sourceRunId: string;
    /** Wall-clock time to run the full pipeline in milliseconds. */
    pipelineDurationMs: number;
  };
}
