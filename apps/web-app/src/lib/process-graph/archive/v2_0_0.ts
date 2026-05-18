/**
 * Path E — v2.0 Frozen Contract Snapshot (iter 076 / PATHE-P01)
 *
 * Versioned snapshot of the v2.0 ProcessGraph contract for byte-identical
 * audit-trail reproducibility (parallel to PRICING-P01 §M `archive/v1_0_0.ts`
 * pattern). Future major / minor bumps add a new file under this directory;
 * existing snapshots are NEVER modified.
 *
 * Snapshot contents (informational; runtime behavior NOT re-implemented here):
 *
 *   v2.0 PROCESS_GRAPH_SCHEMA_VERSION = '2.0'
 *   INFERRED_CONFIDENCE_THRESHOLD = 0.55
 *   V1_DEGRADED_SYNTHESIS_CONFIDENCE = 0.40
 *
 *   NodeType (15): start, end, action, decision, system_decision,
 *     human_judgment, approval, validation, exception, retry, loop,
 *     handoff, wait, ai_opportunity, automation_opportunity
 *
 *   EdgeType (11): sequence, branch, merge, exception, retry, loop,
 *     fallback, escalation, approval, rejection, automation_candidate
 *
 *   DecisionType (9): user_choice, business_rule, system_state, data_condition,
 *     approval_decision, validation_result, exception_handling, human_judgment,
 *     unknown_inferred
 *
 *   ConditionType (10): ui_state, user_input, field_value, system_response,
 *     data_threshold, role_permission, approval_status, validation_status,
 *     timing_based, inferred_unknown
 *
 *   VariantLabel (9): dominant_path, standard_path, alternate_path,
 *     exception_path, failure_path, escalation_path, rework_path,
 *     high_performance_path, low_performance_path
 *
 *   variantHash algorithm version: 2.0.0 (CLOSES DEP-08)
 *
 * @see ../types/closed-unions.ts — live contract source
 */

import { PROCESS_GRAPH_SCHEMA_VERSION } from '../types/closed-unions.js';
import { VARIANT_HASH_ALGORITHM_VERSION } from '../adapters/variant-hash.js';

/** Frozen snapshot of v2.0 metadata for audit-trail / replay introspection. */
export const PROCESS_GRAPH_V2_0_SNAPSHOT = Object.freeze({
  schemaVersion: PROCESS_GRAPH_SCHEMA_VERSION,
  variantHashAlgorithmVersion: VARIANT_HASH_ALGORITHM_VERSION,
  nodeTypeCount: 15,
  edgeTypeCount: 11,
  decisionTypeCount: 9,
  conditionTypeCount: 10,
  variantLabelCount: 9,
  inferredConfidenceThreshold: 0.55,
  v1DegradedSynthesisConfidence: 0.4,
} as const);
