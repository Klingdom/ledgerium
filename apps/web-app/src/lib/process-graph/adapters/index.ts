/**
 * Path E — Adapters Barrel (iter 076 / PATHE-P01)
 *
 * Re-exports the adapter surface. No logic in this file per CLAUDE.md
 * "no logic in index files".
 */

export {
  reviewedEvidenceRetentionDaysForPlan,
  reviewedEvidenceRetentionUntil,
  unreviewedEvidenceRetentionUntil,
  isEvidenceRetentionExpired,
  REVIEWED_EVIDENCE_RETENTION_DAYS_PAID,
  REVIEWED_EVIDENCE_RETENTION_DAYS_FREE,
  UNREVIEWED_EVIDENCE_RETENTION_DAYS,
} from './retention-policy.js';

export {
  computeVariantHash,
  getVariantHashAlgorithmVersion,
  VARIANT_HASH_ALGORITHM_VERSION,
} from './variant-hash.js';
export type {
  VariantHashAlgorithmVersion,
  VariantHashInput,
} from './variant-hash.js';

export { migrateProcessGraph } from './migrate-process-graph.js';
export type {
  MigrationResult,
  MigrationSuccess,
  MigrationFailure,
  V1ProcessGraphInput,
} from './migrate-process-graph.js';

export {
  parseProcessGraphJson,
  serializeProcessGraphToJson,
} from './parse-process-graph-json.js';
