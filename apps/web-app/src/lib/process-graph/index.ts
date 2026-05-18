/**
 * Path E — Process Graph Module Barrel (iter 076 / PATHE-P01)
 *
 * Public surface for the Path E `apps/web-app/src/lib/process-graph/` module.
 * Consumers import from `@/lib/process-graph` (this barrel). Per CLAUDE.md
 * "no logic in index files", this file is re-exports only.
 *
 * @see types/closed-unions.ts — 5 closed unions + thresholds + schema version
 * @see types/entities.ts — entity interfaces (ProcessGraph et al.)
 * @see catalog/*.ts — frozen mirror arrays + exhaustiveness locks
 * @see adapters/*.ts — variant-hash + migrate + parse + retention policy
 * @see validation/topology.ts — Group A-E topology + audit-honesty invariants
 * @see validation/zod-schemas.ts — runtime validation schemas
 * @see archive/v2_0_0.ts — frozen v2.0 contract snapshot
 */

// ── Closed unions + schema version constants ──────────────────────────────────
export type {
  NodeType,
  EdgeType,
  DecisionType,
  ConditionType,
  VariantLabel,
  ProcessGraphSchemaVersion,
} from './types/closed-unions.js';

export {
  PROCESS_GRAPH_SCHEMA_VERSION,
  INFERRED_CONFIDENCE_THRESHOLD,
  V1_DEGRADED_SYNTHESIS_CONFIDENCE,
} from './types/closed-unions.js';

// ── Entity interfaces ─────────────────────────────────────────────────────────
export type {
  EvidencePointer,
  ProcessNode,
  ProcessEdge,
  Condition,
  DecisionPoint,
  Variant,
  ProcessGraph,
  ProcessEvidenceReview,
  ProcessEvidenceReviewAction,
} from './types/entities.js';

// ── Catalogs (frozen mirror arrays) ───────────────────────────────────────────
export { NODE_TYPES, DECISION_BEARING_NODE_TYPES, TERMINAL_NODE_TYPES } from './catalog/node-types.js';
export { EDGE_TYPES, CYCLE_EDGE_TYPES } from './catalog/edge-types.js';
export { DECISION_TYPES } from './catalog/decision-types.js';
export { CONDITION_TYPES } from './catalog/condition-types.js';
export { VARIANT_LABELS, DOMINANT_VARIANT_LABEL } from './catalog/variant-labels.js';

// ── Adapters ──────────────────────────────────────────────────────────────────
export {
  reviewedEvidenceRetentionDaysForPlan,
  reviewedEvidenceRetentionUntil,
  unreviewedEvidenceRetentionUntil,
  isEvidenceRetentionExpired,
  REVIEWED_EVIDENCE_RETENTION_DAYS_PAID,
  REVIEWED_EVIDENCE_RETENTION_DAYS_FREE,
  UNREVIEWED_EVIDENCE_RETENTION_DAYS,
  computeVariantHash,
  getVariantHashAlgorithmVersion,
  VARIANT_HASH_ALGORITHM_VERSION,
  migrateProcessGraph,
  parseProcessGraphJson,
  serializeProcessGraphToJson,
} from './adapters/index.js';

export type {
  VariantHashAlgorithmVersion,
  VariantHashInput,
  MigrationResult,
  MigrationSuccess,
  MigrationFailure,
  V1ProcessGraphInput,
} from './adapters/index.js';

// ── Validation ────────────────────────────────────────────────────────────────
export { validateGraphTopology } from './validation/topology.js';
export type { TopologyViolation, TopologyValidationResult } from './validation/topology.js';

export {
  nodeTypeSchema,
  edgeTypeSchema,
  decisionTypeSchema,
  conditionTypeSchema,
  variantLabelSchema,
  processGraphSchemaVersionSchema,
  evidencePointerSchema,
  processNodeSchema,
  processEdgeSchema,
  conditionSchema,
  decisionPointSchema,
  variantSchema,
  processGraphSchema,
  processEvidenceReviewActionSchema,
  processEvidenceReviewSchema,
} from './validation/zod-schemas.js';

// ── Archive (v2.0 frozen snapshot) ────────────────────────────────────────────
export { PROCESS_GRAPH_V2_0_SNAPSHOT } from './archive/v2_0_0.js';

// ── Confidence Language Taxonomy (PATHE-P03) ──────────────────────────────────
export type {
  ConfidenceBand,
  ConfidenceLabel,
  ConfidenceColorHint,
} from './confidence-language.js';

export {
  HIGH_CONFIDENCE_FLOOR,
  MEDIUM_CONFIDENCE_FLOOR,
  LOW_CONFIDENCE_FLOOR,
  MIN_OBSERVATIONS_FOR_HIGH,
  confidenceToBand,
  bandToLabel,
  formatLowConfidenceLabel,
  inferredToLabel,
  bandToColorHint,
} from './confidence-language.js';
