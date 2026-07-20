/**
 * All types for the Ledgerium Deterministic Process Engine.
 *
 * Input types mirror the canonical event + step shapes produced by the
 * normalization and segmentation engines. Output types represent the
 * structured process intelligence derived from a recorded session.
 *
 * No UI, browser, or framework dependencies.
 *
 * Schema version: 1.5.0
 * Changes from 1.4.0:
 *  - SOPInstruction gained `sourceRawEventId` — the capture-time
 *    `raw_event_id`, sourced from
 *    `CanonicalEventInput.normalization_meta.sourceEventId`. `sourceEventId`
 *    (the canonical `event_id`) is kept alongside it, unchanged. See
 *    docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §4.2 —
 *    this is the stable anchor a future overlay/authoring system needs;
 *    `sourceEventId` alone is not stable across re-normalization.
 *  - SOP gained `contentOrigin` (closed union, currently always
 *    `'engine-derived'` — see `SOPContentOrigin`), a provenance stamp
 *    required before any overlay/authoring write path can safely exist.
 *    See ADR §9.
 * Changes from 1.3.0:
 *  - SOP.version is no longer a hardcoded literal. It is now a deterministic
 *    content-identity composite `${engineVersion}+${contentHash.slice(0, 8)}`
 *    (see ./contentHash.ts). Two regenerations from identical evidence at the
 *    same engine version now correctly produce an identical version, instead
 *    of every SOP the system has ever produced carrying the same string.
 *  - SOP gained `engineVersion` (the PROCESS_ENGINE_VERSION that generated
 *    this content), `contentHash` (the full deterministic fingerprint), and
 *    `approvalStatus` (closed union, currently always `'unapproved'` — there
 *    is no approval workflow yet, so the document says so honestly instead
 *    of implying one). `generatedAt` is unchanged in value (still sourced
 *    from `sessionJson.startedAt`, never the wall clock) but is now
 *    documented as an observation timestamp, not a publication/effective
 *    date. See docs/meta/SOP_BUILDER_REVIEW_001.md B-1 and §7 step 2a.
 * Changes from 1.2.0:
 *  - SOP template renderers (sopTemplates.ts / renderHelpers.ts): removed
 *    fabricated content from EnterpriseSOP.controls / .risks / .escalationRules,
 *    OperatorSOP.commonMistakes, and EnterpriseSOPDecision.options[].condition
 *    (now optional — omitted rather than invented). These fields no longer
 *    fall back to boilerplate text asserting facts, controls, or org
 *    structure that were never observed in the recording; they may now
 *    legitimately be empty arrays / omit `condition`. See
 *    docs/meta/SOP_BUILDER_REVIEW_001.md §2 and §7 step 1.
 * Changes from 1.1.0:
 *  - SOPInstruction: new type — event-level granularity within SOP steps
 *  - SOPStep: added instructions[] (event-level), detail now derived from instructions
 *  - ProcessMapNode.metadata: added humanEventCount, pageTitle, routeTemplate,
 *    dominantAction, eventTypeSummary — richer step-level map data
 *  - ProcessMapEdge: added boundaryLabel (human-readable transition description)
 */

// ─── Engine version ───────────────────────────────────────────────────────────

/**
 * Engine + generated-output schema version.
 *
 * Convention (established at 1.2.0 → 1.3.0, 2026-07-20): this constant MUST
 * be bumped for ANY change to the semantics of generated SOP/process-map
 * output — not just type/shape changes. That includes wording changes that
 * alter what a rendered document asserts (e.g. removing fabricated content,
 * changing a fallback string, adding/removing a template field's fallback
 * behavior). Prior to 1.3.0 there was no such convention; wording-only
 * changes landed without a version bump (see
 * docs/meta/SOP_BUILDER_REVIEW_001.md B-1 for the audit finding this closes
 * the gap for). Consumers (e.g. EnterpriseSOP.revisionMetadata.engineVersion)
 * treat this value as the identity of "what this document claims," so a
 * meaning-changing edit without a bump is itself a truthfulness defect.
 *
 * Bumped 1.3.0 → 1.4.0: `SOP.version` output semantics changed from a
 * hardcoded literal to a deterministic content-identity composite (see the
 * "Changes from 1.3.0" note above) — this is itself exactly the class of
 * meaning-changing edit this convention exists to catch.
 *
 * Bumped 1.4.0 → 1.5.0: `SOPInstruction` gained `sourceRawEventId` and `SOP`
 * gained `contentOrigin` (see "Changes from 1.4.0" above) — both are changes
 * to generated output per
 * docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §4.2. Note
 * the interaction documented there: this bump changes `SOP.version` (which
 * embeds `engineVersion`) for every document, while `contentHash` is
 * unchanged, because the hashed field set (`contentHash.ts`) does not
 * include instruction provenance or document-level provenance. That is
 * correct, not a bug — see `anchorStability.test.ts` for the regression
 * test that pins this behavior.
 */
export const PROCESS_ENGINE_VERSION = '1.5.0' as const;

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

// Category color palette — aligned to Ledgerium brand emerald.
// The most-common step types (Navigation, Send) use brand-green shades so the
// recorder reads "green on white" matching the website's `--accent: #20f2a6`.
// Other categories use distinct hues for visual differentiation per step type.
// CEO directive 2026-05-28: restore green dominance to recorder UI; do NOT
// revert without explicit ack.
export const CATEGORY_CONFIG: Record<GroupingReason, CategoryConfig> = {
  click_then_navigate:  { label: 'Navigation',      color: '#10b981', bg: 'rgba(16,185,129,0.07)' },
  fill_and_submit:      { label: 'Form Submit',     color: '#0ea5e9', bg: 'rgba(14,165,233,0.07)' },
  repeated_click_dedup: { label: 'Repeated Action', color: '#fb923c', bg: 'rgba(251,146,60,0.07)' },
  single_action:        { label: 'Action',          color: '#94a3b8', bg: 'rgba(148,163,184,0.07)' },
  data_entry:           { label: 'Data Entry',      color: '#a78bfa', bg: 'rgba(167,139,250,0.07)' },
  send_action:          { label: 'Send / Submit',   color: '#059669', bg: 'rgba(5,150,105,0.07)' },
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
  /** Friction indicators observed at this step. */
  frictionIndicators?: FrictionIndicator[];
  /** Whether this node is an inferred decision point. */
  isDecisionPoint?: boolean;
  /** Human-readable label for a decision point. */
  decisionLabel?: string;
  /** Actor or role performing this step. */
  actor?: string;
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
  /** Inferred business objective of this workflow. */
  objective?: string;
  /** Trigger condition that starts this process. */
  trigger?: string;
  /** Expected outcome when the process completes. */
  outcome?: string;
  /** Total duration label for the entire process. */
  durationLabel?: string;
  /** Aggregate friction indicators across the entire map. */
  frictionSummary?: FrictionIndicator[];
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
  /**
   * Canonical event ID this instruction was derived from
   * (`CanonicalEventInput.event_id`) — a UUID v4 minted fresh by the
   * normalization engine each time a raw event is normalized
   * (`docs/invariants.md:90-93`).
   *
   * Stable across an **engine re-run** over the same stored bundle
   * (regeneration case R1 — see
   * docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §2.1),
   * which today is the only regeneration the server can actually perform.
   * NOT stable across **re-normalization** (R2) — a fresh normalize pass
   * mints a new `event_id` for the same underlying capture, even though
   * nothing observable changed.
   *
   * Kept alongside `sourceRawEventId` per ADR §4.2 rather than replaced by
   * it: (a) it is the correct key for R1, the common case, and matching on
   * both fields is a stronger signal than either alone; (b) it is already
   * consumed by traceability surfaces (e.g. `ask-this-process` citations)
   * and removing it would be an unnecessary breaking change; (c) a
   * *disagreement* between the two (raw matches, canonical does not) is
   * itself the signal that an R2 re-normalization occurred.
   */
  sourceEventId: string;
  /**
   * Capture-time raw event ID this instruction was derived from —
   * `raw_event_id`, assigned once at the moment of capture in the
   * immutable raw bundle (`docs/invariants.md:89`), carried unchanged
   * through normalization as
   * `CanonicalEventInput.normalization_meta.sourceEventId`
   * (`docs/invariants.md:112`; `types.ts:144-145` in this package — that
   * field is non-optional, and the upload contract
   * (`apps/web-app/src/lib/ingestion.ts:29-34`) requires it as a
   * non-optional string, so it cannot be absent in a bundle the server has
   * accepted).
   *
   * Stable across **both** an engine re-run (R1) **and** a re-normalization
   * of the same raw capture (R2) — see
   * docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §1 Fact 3
   * and §2.1. It is strictly dominant over `sourceEventId` as a stable
   * anchor and is the field a future overlay/authoring system must bind
   * edits to (ADR §4). Do not derive a "stability" claim from
   * `sourceEventId` alone — see that field's own JSDoc.
   */
  sourceRawEventId: string;
  /** Application/system in which this event occurred. */
  system?: string;
  /** Whether this event involves sensitive data fields. */
  isSensitive: boolean;
  /** Whether the sensitive value was redacted before capture. */
  redacted: boolean;
  /** UI element label associated with the event, if available and non-sensitive. */
  targetLabel?: string;
  /**
   * Instruction classification: 'action' for user-initiated steps,
   * 'wait' for system processing, 'verify' for confirmation checks.
   */
  instructionType?: 'action' | 'wait' | 'verify' | 'note';
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
  /** Actor or role performing this step (inferred from behavior patterns). */
  actor?: string;
  /** Friction indicators observed during this step. */
  frictionIndicators?: FrictionIndicator[];
  /** Whether this step is a decision point that affects subsequent flow. */
  isDecisionPoint?: boolean;
  /** Human-readable label for a decision point (question form). */
  decisionLabel?: string;
}

/**
 * Document approval status.
 *
 * Closed union with exactly one member today: this system has no approval
 * workflow yet (see docs/meta/SOP_BUILDER_REVIEW_001.md §7 step 2b, which is
 * separately gated on an open product decision), so every generated SOP is
 * honestly `'unapproved'`. The type makes that absence undeniable — nothing
 * can silently default, infer, or fabricate a different value while this
 * union has one member. Widen this union when an approval workflow ships.
 */
export type SOPApprovalStatus = 'unapproved';

/**
 * Content-origin provenance stamp for a SOP document.
 *
 * Closed union with exactly one member today: this system has no
 * overlay/authoring write path yet (see
 * docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §9), so
 * every generated SOP is honestly `'engine-derived'`. This is the same
 * discipline as `SOPApprovalStatus` — the type makes the absence of any
 * other origin undeniable while this union has one member.
 *
 * `SOP.contentOrigin` is OPTIONAL, and that is deliberate, not an
 * oversight — it is the backfill mechanism itself, not a gap needing one.
 * `buildSOP` (reached solely via `processSession`,
 * `sopBuilder.ts` / `processSession.ts`) is the ONLY writer of SOP content,
 * and the persistence layer (`WorkflowArtifact`) is create-only — there is
 * no `.update()` / `.upsert()` call anywhere that could have mutated a
 * stored SOP after it was generated, and no `updatedAt` column recording
 * one. That means the **absence** of `contentOrigin` on any stored document
 * is itself proof the document predates this field, and therefore proof it
 * is engine-derived — no separate batch backfill migration is needed, and
 * per ADR §9, writing one now would in fact be worse: a post-hoc UPDATE is
 * an *assertion* about old rows, while this field's introduction, with no
 * mutation path having ever existed before it, is *evidence*. Do not later
 * "fix" this by adding a migration that stamps old rows explicitly — that
 * would replace evidence with an assertion for no benefit.
 *
 * This reasoning stops holding for any document touched by an
 * overlay/authoring write path once one exists. Widen this union to the
 * four-valued `observed` / `derived` / `authored` / `absent` model already
 * sketched (`docs/meta/SOP_BUILDER_REVIEW_001.md` §5 line 118; ADR §9
 * target shape) **before** that write path ships, not after — ADR §9:
 * "stamp provenance ... before any overlay write path exists ... cheap now
 * and impossible later."
 */
export type SOPContentOrigin = 'engine-derived';

export interface SOP {
  sopId: string;
  title: string;
  /**
   * Document content identity: `${engineVersion}+${contentHash.slice(0, 8)}`
   * (see `computeSOPContentHash` in ./contentHash.ts).
   *
   * This is a CONTENT identity, not a controlled-document revision number.
   * Two regenerations from identical evidence at the same engine version
   * produce the identical `version` — that is the intended behavior, not a
   * bug: it lets two copies be compared for content equality. It does NOT
   * mean either copy has been reviewed or approved — see `approvalStatus`.
   *
   * Ref: docs/meta/SOP_BUILDER_REVIEW_001.md B-1.
   */
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
  /**
   * Timestamp of the OBSERVATION this SOP was generated from —
   * `sessionJson.startedAt`, deliberately NOT the wall-clock time the
   * document was built. Sourcing it from evidence rather than `Date.now()`
   * is what keeps SOP generation deterministic (same input → byte-identical
   * output); do not change the source of this value.
   *
   * This is NOT a publication date, an effective date, or an approval date.
   * It does not indicate the document has been reviewed or is in force.
   * Renderers MUST NOT present it as such — see `approvalStatus`.
   */
  generatedAt: string;
  /** Process engine version that generated this content (see `PROCESS_ENGINE_VERSION`). */
  engineVersion: string;
  /**
   * Full deterministic content-identity fingerprint of this document (see
   * `computeSOPContentHash` in ./contentHash.ts). `version` embeds the first
   * 8 characters of this value; the full value is retained here for
   * traceability.
   */
  contentHash: string;
  /** See `SOPApprovalStatus`. */
  approvalStatus: SOPApprovalStatus;
  /**
   * See `SOPContentOrigin`. Always `'engine-derived'` when set by this
   * engine version. Optional — see `SOPContentOrigin` JSDoc for why its
   * absence on documents stored before this field existed is itself the
   * provenance evidence, not a gap.
   */
  contentOrigin?: SOPContentOrigin;
  /** When this SOP should be invoked — the triggering condition. */
  trigger?: string;
  /** Roles or actors involved in this procedure (inferred from behavior). */
  roles?: string[];
  /** Common issues and exception patterns observed during the workflow. */
  commonIssues?: CommonIssue[];
  /** Friction points detected in the observed workflow. */
  frictionSummary?: FrictionIndicator[];
  /** Inferred business objective of this workflow. */
  businessObjective?: string;
  /** Overall process quality indicators. */
  qualityIndicators?: QualityIndicators;
}

// ─── Enrichment types ───────────────────────────────────────────────────────

/**
 * A friction indicator detected from observed behavior patterns.
 * Friction includes: excessive navigation, retries, backtracking,
 * long waits, repeated errors, or manual workarounds.
 */
export interface FrictionIndicator {
  type: FrictionType;
  /** Human-readable description of the friction. */
  label: string;
  /** Severity: 'low' = minor inconvenience, 'medium' = notable, 'high' = significant. */
  severity: 'low' | 'medium' | 'high';
  /** Step ordinal(s) where this friction was observed. */
  stepOrdinals: number[];
}

export type FrictionType =
  | 'excessive_navigation'
  | 'retry_detected'
  | 'backtracking'
  | 'long_wait'
  | 'repeated_error'
  | 'manual_workaround'
  | 'redundant_action'
  | 'context_switching';

/**
 * A common issue or exception pattern detected in the workflow.
 */
export interface CommonIssue {
  /** Short title for the issue. */
  title: string;
  /** Description of the issue and how it was handled. */
  description: string;
  /** Step ordinal(s) where this issue was observed. */
  stepOrdinals: number[];
}

/**
 * Aggregate quality indicators for the overall process.
 */
export interface QualityIndicators {
  /** Average confidence across all steps (0–1). */
  averageConfidence: number;
  /** Number of steps with confidence below 0.7. */
  lowConfidenceStepCount: number;
  /** Number of error-handling steps in the process. */
  errorStepCount: number;
  /** Number of distinct systems/applications used. */
  systemCount: number;
  /** Number of detected friction points. */
  frictionCount: number;
  /** Whether the workflow completed fully. */
  isComplete: boolean;
}

// ─── Output: ProcessOutput (full engine result) ───────────────────────────────

export interface ProcessOutput {
  processRun: ProcessRun;
  processDefinition: ProcessDefinition;
  processMap: ProcessMap;
  sop: SOP;
}
