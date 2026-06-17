/**
 * "Ask This Process" — Phase A deterministic, NO-LLM grounding substrate.
 *
 * Barrel re-exports only (no logic per CLAUDE.md "no logic in index files").
 * This module dir has ZERO LLM / provider / network imports — the determinism
 * boundary (ADR-001). The route + panel wiring is a separate later iteration.
 *
 * @module ask-this-process
 */

export type {
  CitationKind,
  ResolvedCitation,
  BundleFriction,
  BundleInstruction,
  BundleStep,
  BundleConformance,
  BundleDrift,
  BundleSignals,
  BundleProcessMeta,
  GroundedEvidenceBundle,
  CitationSet,
  AskResultKind,
  RefusalReason,
  QuestionClass,
  AskResult,
} from './types';
export { citationResolveKey } from './types';

export {
  buildAskContext,
  type BuildAskContextInput,
  type BuildAskContextResult,
} from './contextBuilder';

export {
  parseClaimedCitations,
  validateCitations,
  shouldDowngradeToRefusal,
  type ClaimedCitation,
  type ValidateCitationsResult,
} from './citationValidator';

export {
  classifyQuestion,
  answerQuestion,
  type ClassifyResult,
} from './answerTemplates';

export {
  canonicalSerialize,
  canonicalSha256,
  type CanonicalValue,
} from './canonicalHash';
