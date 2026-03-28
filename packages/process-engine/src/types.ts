/**
 * All types for the Ledgerium Deterministic Process Engine.
 *
 * Input types mirror the canonical event + step shapes produced by the
 * normalization and segmentation engines. Output types represent the
 * structured process intelligence derived from a recorded session.
 *
 * No UI, browser, or framework dependencies.
 *
 * Schema version: 1.2.0
 * Changes from 1.1.0:
 *  - SOPInstruction: new type — event-level granularity within SOP steps
 *  - SOPStep: added instructions[] (event-level), detail now derived from instructions
 *  - ProcessMapNode.metadata: added humanEventCount, pageTitle, routeTemplate,
 *    dominantAction, eventTypeSummary — richer step-level map data
 *  - ProcessMapEdge: added boundaryLabel (human-readable transition description)
 */

// ─── Engine version ───────────────────────────────────────────────────────────

export const PROCESS_ENGINE_VERSION = '1.2.0' as const;

// ─── Grouping / boundary reasons (mirrors segmentation-engine) ───────────────

export type GroupingReason =
  | 'click_then_navigate'
  | 'fill_and_submit'
  | 'repeated_click_dedup'
  | 'single_action'
  | 'data_entry'
  | 'send_action'
  | 'file_action'
  | 'error_handling'
  | 'annotation';

export type BoundaryReason =
  | 'form_submitted'
  | 'navigation_changed'
  | 'route_changed'
  | 'target_changed'
  | 'action_completed'
  | 'app_context_changed'
  | 'idle_gap'
  | 'user_annotation'
  | 'session_stop'
  | 'explicit_boundary';

// ─── Category visual config (canonical; used by all UIs) ─────────────────────

export interface CategoryConfig {
  label: string;
  color: string;
  bg: string;
}

export const CATEGORY_CONFIG: Record<GroupingReason, CategoryConfig> = {
  click_then_navigate:  { label: 'Navigation',      color: '#2dd4bf', bg: 'rgba(45,212,191,0.07)' },
  fill_and_submit:      { label: 'Form Submit',     color: '#60a5fa', bg: 'rgba(96,165,250,0.07)' },
  repeated_click_dedup: { label: 'Repeated Action', color: '#fb923c', bg: 'rgba(251,146,60,0.07)' },
  single_action:        { label: 'Action',          color: '#94a3b8', bg: 'rgba(148,163,184,0.07)' },
  data_entry:           { label: 'Data Entry',      color: '#a78bfa', bg: 'rgba(167,139,250,0.07)' },
  send_action:          { label: 'Send / Submit',   color: '#34d399', bg: 'rgba(52,211,153,0.07)' },
  file_action:          { label: 'File Action',     color: '#fbbf24', bg: 'rgba(251,191,36,0.07)' },
  error_handling:       { label: 'Error Handling',  color: '#f87171', bg: 'rgba(248,113,113,0.07)' },
  annotation:           { label: 'Annotation',      color: '#c084fc', bg: 'rgba(192,132,252,0.07)' },
};

// ─── Input types (internal — matches canonical event/step shape) ──────────────

export interface CanonicalEventInput {
  event_id: string;
  session_id: string;
  t_ms: number;
  t_wall: string;
  event_type: string;
  actor_type: 'human' | 'system' | 'recorder';
  page_context?: {
    url: string;
    urlNormalized: string;
    domain: string;
    routeTemplate: string;
    pageTitle: string;
    applicationLabel: string;
    moduleLabel?: string;
  };
  target_summary?: {
    selector?: string;
    selectorConfidence?: number;
    label?: string;
    role?: string;
    elementType?: string;
    isSensitive: boolean;
    sensitivityClass?: string;
  };
  normalization_meta: {
    sourceEventId: string;
    sourceEventType: string;
    normalizationRuleVersion: string;
    redactionApplied: boolean;
    redactionReason?: string;
  };
  annotation_text?: string;
}

export interface DerivedStepInput {
  step_id: string;
  session_id: string;
  ordinal: number;
  title: string;
  status: 'provisional' | 'finalized';
  boundary_reason?: string;
  grouping_reason: string;
  confidence: number;
  source_event_ids: string[];
  start_t_ms: number;
  end_t_ms?: number;
  duration_ms?: number;
  page_context?: {
    domain: string;
    applicationLabel: string;
    routeTemplate: string;
  };
}

export interface SessionMetaInput {
  sessionId: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
}

export interface ProcessEngineInput {
  sessionJson: SessionMetaInput;
  normalizedEvents: CanonicalEventInput[];
  derivedSteps: DerivedStepInput[];
}

// ─── Input validation result ──────────────────────────────────────────────────

export type InputValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

// ─── Output: ProcessRun ───────────────────────────────────────────────────────

export interface ProcessRun {
  runId: string;
  sessionId: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  durationLabel: string;
  stepCount: number;
  eventCount: number;
  humanEventCount: number;
  systemEventCount: number;
  // Systems accessed during this run (§16.2 run-level context)
  systemsUsed: string[];
  // Run-level metrics derived from step classification (engine spec §16.2)
  errorStepCount: number;       // count of error_handling steps
  navigationStepCount: number;  // count of click_then_navigate steps
  completionStatus: 'complete' | 'partial';
  engineVersion: string;
}

// ─── Output: ProcessDefinition ────────────────────────────────────────────────

export interface StepDefinition {
  ordinal: number;
  stepId: string;
  title: string;
  category: GroupingReason;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  operationalDefinition: string;
  purpose: string;
  systems: string[];
  domains: string[];
  inputs: string[];
  outputs: string[];
  completionCondition: string;
  confidence: number;
  durationMs?: number;
  durationLabel: string;
  eventCount: number;
  hasSensitiveEvents: boolean;
  // Traceability: source event IDs that produced this step (§19.1)
  sourceEventIds: string[];
}

export interface ProcessDefinition {
  definitionId: string;
  name: string;
  version: string;
  description: string;
  purpose: string;
  scope: string;
  systems: string[];
  domains: string[];
  estimatedDurationMs?: number;
  estimatedDurationLabel: string;
  stepDefinitions: StepDefinition[];
  // Provenance: engine rule version used to derive this definition (§19.1)
  ruleVersion: string;
}

// ─── Output: ProcessMap ───────────────────────────────────────────────────────

/**
 * Node types per engine spec §14.3.
 * - start/end: synthetic boundary nodes (no corresponding step)
 * - task: standard step node
 * - exception: error/recovery step node
 * - decision: future use for branch points
 */
export type ProcessMapNodeType = 'start' | 'task' | 'exception' | 'decision' | 'end';

/**
 * A phase groups consecutive steps that share an application/system context.
 * Supports swimlane views and scannability (engine spec §8.5, §12.2).
 */
export interface ProcessMapPhase {
  id: string;
  name: string;
  system: string;
  /** Ordered step node IDs belonging to this phase (excludes synthetic start/end). */
  stepNodeIds: string[];
}

export interface ProcessMapNodeMetadata {
  systems: string[];
  domain?: string;
  durationMs?: number;
  durationLabel: string;
  /** Total events (human + system) associated with this step. */
  eventCount: number;
  /** Count of human-initiated events only. */
  humanEventCount: number;
  /** Primary page title where most of this step occurred. */
  pageTitle?: string;
  /** Primary route template for this step. */
  routeTemplate?: string;
  /**
   * Most frequent human action type in this step.
   * Examples: "Data entry", "Navigation", "Click", "Form submit"
   */
  dominantAction?: string;
  /**
   * Count of each event type present in this step.
   * Useful for rendering event-type badges or tooltips on map nodes.
   * Example: { "interaction.click": 1, "navigation.open_page": 1 }
   */
  eventTypeSummary: Record<string, number>;
}

export interface ProcessMapNode {
  id: string;
  stepId: string;
  ordinal: number;
  title: string;
  /** Semantic node type per spec §14.3. */
  nodeType: ProcessMapNodeType;
  category: GroupingReason;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  position: { x: number; y: number };
  /** Phase this node belongs to, if phases were detected. */
  phaseId?: string;
  metadata: ProcessMapNodeMetadata;
}

export interface ProcessMapEdge {
  id: string;
  source: string;
  target: string;
  /** Transition type. 'sequence' = normal flow, 'exception' = error path. */
  type: 'sequence' | 'exception';
  /** Raw boundary signal from segmentation engine. */
  boundaryReason?: string;
  /** Human-readable description of why this transition occurred. Always present. */
  boundaryLabel: string;
}

export interface ProcessMap {
  /** Stable map identifier: `{sessionId}-map` */
  id: string;
  /** Human-readable name derived from session activityName. */
  name: string;
  /** Schema version of this map output. */
  version: string;
  sessionId: string;
  /** All unique systems/applications visible across all steps. */
  systems: string[];
  /** Phase groupings for swimlane support (empty if no multi-system context). */
  phases: ProcessMapPhase[];
  nodes: ProcessMapNode[];
  edges: ProcessMapEdge[];
}

// ─── Output: SOP ─────────────────────────────────────────────────────────────

/**
 * A single event-level instruction within a SOP step.
 *
 * SOPs operate at event granularity: every meaningful observed event becomes
 * a discrete, numbered, actionable instruction within its parent step.
 * This gives executors the full operational detail needed to reproduce the step.
 */
export interface SOPInstruction {
  /** Sequential position within this step (1-based). */
  sequence: number;
  /** Human-readable imperative instruction derived from the event. */
  instruction: string;
  /** The canonical event type this instruction was derived from. */
  eventType: string;
  /** Source event ID for traceability back to observed evidence. */
  sourceEventId: string;
  /** Application/system in which this event occurred. */
  system?: string;
  /** Whether this event involves sensitive data fields. */
  isSensitive: boolean;
  /** Whether the sensitive value was redacted before capture. */
  redacted: boolean;
  /** UI element label associated with the event, if available and non-sensitive. */
  targetLabel?: string;
}

export interface SOPStep {
  ordinal: number;
  stepId: string;
  title: string;
  category: GroupingReason;
  /** Step-level action summary (verb phrase). */
  action: string;
  /**
   * Event-level detailed instructions for this step.
   * One entry per meaningful observed event, in occurrence order.
   * input_change events are deduplicated per field (last value kept).
   */
  instructions: SOPInstruction[];
  /**
   * Formatted text rendering of instructions — newline-separated, numbered.
   * Useful for direct display or export without further processing.
   */
  detail: string;
  system?: string;
  inputs: string[];
  expectedOutcome: string;
  warnings: string[];
  durationLabel: string;
  confidence: number;
  /** Source step ID for traceability back to ProcessDefinition step (§15.3). */
  sourceStepId: string;
}

export interface SOP {
  sopId: string;
  title: string;
  version: string;
  purpose: string;
  scope: string;
  systems: string[];
  prerequisites: string[];
  estimatedTime: string;
  /** Required inputs to begin the process (§15.2). */
  inputs: string[];
  /** Expected outputs / deliverables upon completion (§15.2). */
  outputs: string[];
  /** Measurable criteria confirming the process is complete (§15.2). */
  completionCriteria: string[];
  steps: SOPStep[];
  notes: string[];
  generatedAt: string;
}

// ─── Output: ProcessOutput (full engine result) ───────────────────────────────

export interface ProcessOutput {
  processRun: ProcessRun;
  processDefinition: ProcessDefinition;
  processMap: ProcessMap;
  sop: SOP;
}
