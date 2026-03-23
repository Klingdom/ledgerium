/**
 * @ledgerium/normalization-engine
 *
 * Public API: URL normalisation utilities + core event normaliser.
 */

export {
  TRACKING_PARAMS,
  normalizeUrl,
  extractDomain,
  deriveRouteTemplate,
  deriveApplicationLabel,
} from './url-normalizer.js';

export {
  NORMALIZATION_RULE_VERSION,
  RAW_TO_CANONICAL_TYPE,
  generateEventId,
  normalizeEvent,
  normalizeSession,
} from './normalizer.js';

export type {
  RawEvent,
  PolicyDecision,
  CanonicalEvent,
  PolicyLogEntry,
  NormalizationResult,
} from './normalizer.js';
