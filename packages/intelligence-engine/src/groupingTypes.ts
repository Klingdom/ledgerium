/**
 * Process Grouping Hierarchy — Type Definitions
 *
 * Defines the full hierarchy for process intelligence:
 *
 *   ProcessFamily
 *     └─ ProcessGroup (exact cluster)
 *         └─ ProcessVariantRecord (execution path within a group)
 *             └─ WorkflowRunRecord (individual run)
 *                 └─ StepFingerprint (canonical step identity)
 *
 *   CanonicalComponent — reusable step/event patterns across groups/families
 *   GroupRelationship — edges between any two entities in the hierarchy
 *   ExplanationCode — structured explainability primitives
 *
 * Design:
 * - Conservative for exact grouping (nearly all signals must agree)
 * - Family grouping is broader (parameterized qualifier differences allowed)
 * - Every grouping decision carries explanation metadata
 * - No UI or framework dependencies
 */

// ─── Confidence bands ────────────────────────────────────────────────────────

export type ConfidenceBand = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

export function toConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.75) return 'high';
  if (score >= 0.55) return 'medium';
  if (score >= 0.35) return 'low';
  return 'very_low';
}

// ─── Grouping classification ─────────────────────────────────────────────────

export type GroupClassification =
  | 'exact_group'
  | 'variant'
  | 'process_family'
  | 'shared_component'
  | 'possible_related'
  | 'standalone';

// ─── Explainability codes ────────────────────────────────────────────────────
// Structured codes for every grouping/relationship decision.
// Each code maps to a human-readable chip in the UI layer.

export type ExplanationCode =
  // Exact group signals
  | 'SAME_START_ANCHOR'
  | 'SAME_END_ANCHOR'
  | 'HIGH_STEP_OVERLAP'
  | 'HIGH_EVENT_OVERLAP'
  | 'SAME_SYSTEMS'
  | 'SAME_INTENT'
  | 'TITLE_EXACT_MATCH'
  | 'TITLE_NORMALIZED_MATCH'
  | 'STEP_SIGNATURE_MATCH'
  | 'EVENT_SIGNATURE_MATCH'
  // Family signals
  | 'TITLE_PATTERN_MATCH'
  | 'PARAMETERIZED_QUALIFIER_DIFF'
  | 'SAME_ACTION_ENTITY'
  | 'SHARED_CORE_STEPS'
  | 'OVERLAPPING_SYSTEMS'
  | 'SIMILAR_STEP_SEQUENCE'
  | 'SIMILAR_INTENT'
  | 'SIMILAR_ARTIFACT'
  | 'SHARED_COMPONENTS'
  | 'POSSIBLE_SIBLING_WORKFLOW'
  // Component signals
  | 'POSSIBLE_COMPONENT_REUSE'
  | 'COMMON_STEP_PATTERN'
  | 'CROSS_FAMILY_REUSE'
  // Relationship signals
  | 'VARIANT_LIKE'
  | 'TEMPLATE_LIKE'
  | 'PARENT_CHILD'
  // Weakness / penalty signals
  | 'LOW_SAMPLE_SIZE'
  | 'MISSING_STEPS'
  | 'DURATION_MISMATCH'
  | 'SYSTEM_MISMATCH'
  | 'TITLE_MISMATCH'
  | 'WEAK_SEQUENCE_MATCH'
  | 'GENERIC_TITLE_PENALTY'
  | 'ARTIFACT_MISMATCH'
  | 'PATH_DIVERGENCE'
  | 'ANCHOR_MISMATCH'
  | 'INCOMPLETE_RECORDING'
  | 'SHORT_WORKFLOW';

/** Human-readable labels for each code, usable by UI chip renderers. */
export const EXPLANATION_CODE_LABELS: Record<ExplanationCode, string> = {
  SAME_START_ANCHOR: 'Same start point',
  SAME_END_ANCHOR: 'Same end point',
  HIGH_STEP_OVERLAP: 'High step overlap',
  HIGH_EVENT_OVERLAP: 'High event overlap',
  SAME_SYSTEMS: 'Same systems',
  SAME_INTENT: 'Same intent',
  TITLE_EXACT_MATCH: 'Exact title match',
  TITLE_NORMALIZED_MATCH: 'Normalized title match',
  STEP_SIGNATURE_MATCH: 'Step signature match',
  EVENT_SIGNATURE_MATCH: 'Event signature match',
  TITLE_PATTERN_MATCH: 'Title pattern match',
  PARAMETERIZED_QUALIFIER_DIFF: 'Parameterized qualifier difference',
  SAME_ACTION_ENTITY: 'Same action + entity',
  SHARED_CORE_STEPS: 'Shared core steps',
  OVERLAPPING_SYSTEMS: 'Overlapping systems',
  SIMILAR_STEP_SEQUENCE: 'Similar step sequence',
  SIMILAR_INTENT: 'Similar intent',
  SIMILAR_ARTIFACT: 'Similar artifact',
  SHARED_COMPONENTS: 'Shared components',
  POSSIBLE_SIBLING_WORKFLOW: 'Possible sibling workflow',
  POSSIBLE_COMPONENT_REUSE: 'Possible component reuse',
  COMMON_STEP_PATTERN: 'Common step pattern',
  CROSS_FAMILY_REUSE: 'Cross-family reuse',
  VARIANT_LIKE: 'Variant-like',
  TEMPLATE_LIKE: 'Template-like',
  PARENT_CHILD: 'Parent–child',
  LOW_SAMPLE_SIZE: 'Low sample size',
  MISSING_STEPS: 'Missing steps',
  DURATION_MISMATCH: 'Duration mismatch',
  SYSTEM_MISMATCH: 'System mismatch',
  TITLE_MISMATCH: 'Title mismatch',
  WEAK_SEQUENCE_MATCH: 'Weak sequence match',
  GENERIC_TITLE_PENALTY: 'Generic title penalty',
  ARTIFACT_MISMATCH: 'Artifact mismatch',
  PATH_DIVERGENCE: 'Path divergence',
  ANCHOR_MISMATCH: 'Anchor mismatch',
  INCOMPLETE_RECORDING: 'Incomplete recording',
  SHORT_WORKFLOW: 'Short workflow',
};

/** Codes that strengthen a grouping decision (positive evidence). */
export const POSITIVE_CODES: readonly ExplanationCode[] = [
  'SAME_START_ANCHOR', 'SAME_END_ANCHOR', 'HIGH_STEP_OVERLAP', 'HIGH_EVENT_OVERLAP',
  'SAME_SYSTEMS', 'SAME_INTENT', 'TITLE_EXACT_MATCH', 'TITLE_NORMALIZED_MATCH',
  'STEP_SIGNATURE_MATCH', 'EVENT_SIGNATURE_MATCH', 'TITLE_PATTERN_MATCH',
  'PARAMETERIZED_QUALIFIER_DIFF', 'SAME_ACTION_ENTITY', 'SHARED_CORE_STEPS',
  'OVERLAPPING_SYSTEMS', 'SIMILAR_STEP_SEQUENCE', 'SIMILAR_INTENT', 'SIMILAR_ARTIFACT',
  'SHARED_COMPONENTS', 'POSSIBLE_SIBLING_WORKFLOW', 'POSSIBLE_COMPONENT_REUSE',
  'COMMON_STEP_PATTERN', 'CROSS_FAMILY_REUSE',
] as const;

/** Codes that weaken a grouping decision (negative evidence / caveats). */
export const WEAKNESS_CODES: readonly ExplanationCode[] = [
  'LOW_SAMPLE_SIZE', 'MISSING_STEPS', 'DURATION_MISMATCH',
  'SYSTEM_MISMATCH', 'TITLE_MISMATCH', 'WEAK_SEQUENCE_MATCH',
  'GENERIC_TITLE_PENALTY', 'ARTIFACT_MISMATCH', 'PATH_DIVERGENCE',
  'ANCHOR_MISMATCH', 'INCOMPLETE_RECORDING', 'SHORT_WORKFLOW',
] as const;

// ─── Explanation metadata ────────────────────────────────────────────────────

export interface ExplanationEntry {
  code: ExplanationCode;
  /** Weight this signal contributed to the grouping score. */
  weight: number;
  /** Human-readable detail (optional; for tooltip/drawer). */
  detail?: string;
}

export interface GroupingExplanation {
  /** Overall summary suitable for a card subtitle. */
  summary: string;
  /** Positive evidence codes that supported this grouping. */
  supporting: ExplanationEntry[];
  /** Weakness codes that reduced confidence. */
  weaknesses: ExplanationEntry[];
  /** Model/algorithm version that produced this explanation. */
  modelVersion: string;
}

// ─── Normalized title ────────────────────────────────────────────────────────

export interface NormalizedTitle {
  /** Full original title. */
  raw: string;
  /** Lowercased, trimmed, separator-normalized form. */
  normalized: string;
  /** Parsed structured components. */
  action: string | null;
  entity: string | null;
  artifact: string | null;
  qualifier: string | null;
  businessContext: string | null;
  /** Signature for family matching (action + entity + artifact, no qualifier). */
  familySignature: string;
  /** Signature for exact matching (includes qualifier). */
  exactSignature: string;
}

// ─── Step fingerprint ────────────────────────────────────────────────────────

export interface StepFingerprint {
  id: string;
  workflowRunId: string;
  sequenceIndex: number;
  /** Raw step title from the process engine. */
  rawLabel: string;
  /** Cleaned, lowercased, canonical label. */
  normalizedLabel: string;
  /** Parsed verb (e.g. "send", "download", "click"). */
  verb: string | null;
  /** Parsed object (e.g. "email", "report", "button"). */
  object: string | null;
  /** Parsed qualifier (e.g. "csv", "pdf", "draft"). */
  qualifier: string | null;
  /** System where this step occurs (e.g. "gmail", "salesforce"). */
  system: string | null;
  /** Page/screen context (route template or page title). */
  screenContext: string | null;
  /** Canonical event type of the primary event (e.g. "interaction.click"). */
  eventType: string | null;
  /** Target element type (e.g. "button", "input", "link"). */
  targetType: string | null;
  /** ID of the preceding step's fingerprint (null for first step). */
  precedingStepFingerprintId: string | null;
  /** ID of the following step's fingerprint (null for last step). */
  followingStepFingerprintId: string | null;
  /**
   * How often this step appears vs. being skipped across runs in its group.
   * 1.0 = always present; 0.0 = never present (should not happen in practice).
   */
  optionalityScore: number;
  /**
   * How deterministic the step's outcome is across runs.
   * 1.0 = same outcome every time; lower = variable outcomes.
   */
  determinismScore: number;
  /**
   * Composite semantic identity string: "verb:object:system:eventType".
   * Used for cross-workflow step matching.
   */
  semanticSignature: string;
  /** Mapped canonical component ID, if a known component was matched. */
  canonicalComponentId: string | null;
  /** Confidence in the fingerprint's parsed fields (0-1). */
  confidence: number;
}

// ─── Canonical component ─────────────────────────────────────────────────────

export type ComponentType =
  | 'action'       // e.g. "Send Email", "Submit Form"
  | 'navigation'   // e.g. "Open Dashboard", "Navigate to Settings"
  | 'data_entry'   // e.g. "Fill Customer Name", "Enter Address"
  | 'file_action'  // e.g. "Download Report", "Attach File"
  | 'verification' // e.g. "Verify Total", "Check Status"
  | 'decision'     // e.g. "Choose Template", "Select Option"
  | 'integration'; // e.g. "API Call", "Webhook Trigger"

export interface CanonicalComponent {
  id: string;
  /** Human-readable name (e.g. "Send Email", "Download Report CSV"). */
  componentName: string;
  componentType: ComponentType;
  /** Canonical verb for this component (e.g. "send", "download"). */
  canonicalVerb: string;
  /** Canonical object (e.g. "email", "report"). */
  canonicalObject: string;
  /** Primary system (e.g. "gmail", "reporting_app"). Null if system-agnostic. */
  canonicalSystem: string | null;
  /** Brief description of what this component does. */
  description: string;
  /** How many step fingerprints matched this component. */
  usageCount: number;
  /** How many distinct families use this component. */
  familyCount: number;
  /** How many distinct exact groups use this component. */
  groupCount: number;
  /** Average duration across all matched fingerprints. */
  avgDurationMs: number | null;
  /**
   * How variable the duration is across uses (CV).
   * High volatility = inconsistent execution time.
   */
  volatilityScore: number | null;
  /** Placeholder: scored in later prompts. */
  automationOpportunityScore: number | null;
  /** IDs of components that commonly precede this one. */
  commonPredecessors: string[];
  /** IDs of components that commonly follow this one. */
  commonSuccessors: string[];
  /** IDs of semantically related components. */
  relatedComponentIds: string[];
}

// ─── Process family ──────────────────────────────────────────────────────────

export interface ProcessFamilyMetrics {
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  p90DurationMs: number | null;
  /** Fraction of runs that follow the most common path within the family. */
  commonPathPct: number;
  totalVariants: number;
  /** Placeholder: scored in later prompts. */
  automationOpportunityScore: number | null;
  /** How much variance exists across the family's exact groups. */
  volatilityScore: number | null;
  /** How standardized execution is across the family. */
  standardizationScore: number | null;
}

export interface ProcessFamily {
  id: string;
  familyName: string;
  familySlug: string;
  description: string;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  totalExactGroups: number;
  totalRuns: number;
  /** Inferred business intent for the family (e.g. "email report to customer"). */
  canonicalIntent: string;
  /** Algorithm version that created this family. */
  createdFromModelVersion: string;
  /** Structured explanation of why these groups form a family. */
  explanation: GroupingExplanation;
  /** IDs of other families that may be related. */
  relatedFamilyIds: string[];
  /** Union of all systems across all groups in this family. */
  topSystems: string[];
  /** IDs of canonical components shared across groups in this family. */
  commonComponentIds: string[];
  metrics: ProcessFamilyMetrics;
}

// ─── Process group (exact cluster) ───────────────────────────────────────────

export interface ProcessGroupMetrics {
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  p90DurationMs: number | null;
  confidenceIntervalLow: number | null;
  confidenceIntervalHigh: number | null;
  /** Fraction of runs following the canonical path. */
  commonPathPct: number;
  /** How consistent the ordered step sequence is across runs (0-1). */
  stepConsistencyScore: number;
  /** How consistent the ordered event types are across runs (0-1). */
  eventConsistencyScore: number;
  /** From the existing standardization scorer. */
  pathStabilityScore: number | null;
  /** Placeholder for later prompts. */
  automationOpportunityScore: number | null;
  /** Fraction of runs containing anomaly steps. */
  anomalyRate: number;
  /** Fraction of runs containing rework/retry patterns. */
  reworkRate: number;
  /** Step positions that are duration hotspots. */
  delayHotspots: number[];
}

export interface ProcessGroup {
  id: string;
  familyId: string | null;
  groupName: string;
  normalizedName: string;
  groupType: GroupClassification;
  /** First step's semantic signature (anchor for matching). */
  startAnchor: string;
  /** Last step's semantic signature (anchor for matching). */
  endAnchor: string;
  /** ID of the canonical variant (most common execution path). */
  canonicalPathId: string | null;
  runCount: number;
  variantCount: number;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  explanation: GroupingExplanation;
  /** Systems used across all runs. */
  systems: string[];
  /** Artifact types produced (e.g. "report", "email"). */
  artifacts: string[];
  /** Actor roles observed (e.g. "operator", "manager"). */
  actors: string[];
  /** Inferred business intent. */
  intentSignature: string;
  /** NormalizedTitle.exactSignature for the canonical name. */
  nameSignature: string;
  /** Hash of the canonical ordered step sequence. */
  stepSignatureHash: string;
  /** Hash of the canonical ordered event type sequence. */
  eventSignatureHash: string;
  metrics: ProcessGroupMetrics;
}

// ─── Process variant ─────────────────────────────────────────────────────────

export interface DeviationPoint {
  /** Step position where deviation occurs. */
  stepIndex: number;
  /** What the canonical path has at this position. */
  canonicalStep: string;
  /** What this variant has instead. */
  variantStep: string;
  /** Type of deviation. */
  deviationType: 'substitution' | 'insertion' | 'deletion' | 'reorder';
}

export interface ProcessVariantRecord {
  id: string;
  processGroupId: string;
  variantName: string;
  /** Rank by frequency within the group (1 = most common). */
  variantRank: number;
  runCount: number;
  percentOfRuns: number;
  /** Ordered step categories for this variant's path. */
  pathStepCategories: string[];
  deviationPoints: DeviationPoint[];
  addedSteps: string[];
  removedSteps: string[];
  reorderedSteps: string[];
  avgDurationMs: number | null;
  confidenceScore: number;
  explanation: GroupingExplanation;
  isStandard: boolean;
  isFastest: boolean;
  isSlowest: boolean;
  isOutlier: boolean;
}

// ─── Workflow run record ─────────────────────────────────────────────────────

export interface ClusteringScores {
  /** How well this run matches its assigned exact group (0-1). */
  exactGroupScore: number;
  /** How well this run fits into the broader family (0-1). */
  familyScore: number;
  /** How many canonical components this run contributes to (normalized). */
  componentReuseScore: number;
  /** How anomalous this run is (0 = normal, 1 = extreme outlier). */
  anomalyScore: number;
}

export interface WorkflowRunRecord {
  id: string;
  originalWorkflowId: string;
  processGroupId: string | null;
  variantId: string | null;
  familyId: string | null;
  title: string;
  normalizedTitle: NormalizedTitle;
  startAnchor: string;
  endAnchor: string;
  stepCount: number;
  eventCount: number;
  systems: string[];
  artifacts: string[];
  actor: string | null;
  durationMs: number | null;
  /** Hash of the ordered step category sequence. */
  pathHash: string;
  stepFingerprints: StepFingerprint[];
  /** Hashes of individual event types in order. */
  eventFingerprints: string[];
  clusteringScores: ClusteringScores;
}

// ─── Group relationship ──────────────────────────────────────────────────────

export type RelationshipType =
  | 'same_family'
  | 'possible_match'
  | 'shares_component'
  | 'template_like'
  | 'parent_child'
  | 'variant_like';

export type RelationshipEntityType = 'family' | 'group' | 'variant' | 'workflow' | 'component';

export interface GroupRelationship {
  id: string;
  sourceType: RelationshipEntityType;
  sourceId: string;
  targetType: RelationshipEntityType;
  targetId: string;
  relationshipType: RelationshipType;
  confidenceScore: number;
  explanationCodes: ExplanationCode[];
  explanationText: string;
  createdFromModelVersion: string;
}

// ─── Model version constant ──────────────────────────────────────────────────

export const GROUPING_MODEL_VERSION = '1.0.0' as const;
