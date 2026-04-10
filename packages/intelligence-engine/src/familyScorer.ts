/**
 * Family Scoring + Possible Match + Relationship Engine
 *
 * Determines whether workflows or exact groups belong in the same broader
 * family, surfaces possible matches that aren't strong enough for verified
 * grouping, and generates typed relationship objects between all entities.
 *
 * Family grouping is deliberately broader than exact grouping:
 *   - "Email Customer World Cities Report" and "Email Customer US Cities Report"
 *     are different exact groups but belong to the same family.
 *   - Parameterized qualifier differences are a strong family signal.
 *   - Shared components + overlapping systems + similar intent can establish
 *     family membership even when titles differ moderately.
 *
 * Possible Match logic activates when:
 *   - Family score is suggestive but not strong (0.55-0.67)
 *   - Component overlap is meaningful but not decisive
 *   - Low sample size prevents stronger classification
 *   - Naming suggests relation but path evidence is mixed
 */

import type {
  ExplanationCode,
  ExplanationEntry,
  GroupingExplanation,
  NormalizedTitle,
  StepFingerprint,
  WorkflowRunRecord,
  GroupRelationship,
  RelationshipType,
  RelationshipEntityType,
} from './groupingTypes.js';
import { GROUPING_MODEL_VERSION } from './groupingTypes.js';
import type { ScoringConfig, ScoringConfidenceBand } from './scoringConfig.js';
import {
  DEFAULT_SCORING_CONFIG,
  resolveConfidenceBand,
  buildExplanation,
  isGenericTitle,
  setOverlap,
  orderedBigramOverlap,
} from './scoringConfig.js';
import { titleFamilySimilarity, isParameterizedVariant } from './titleNormalizer.js';
import { sequenceFingerSimilarity } from './stepFingerprinter.js';

// ─── Result types ────────────────────────────────────────────────────────────

export type FamilyDecision =
  | 'same_family'
  | 'likely_family'
  | 'possible_related'
  | 'no_family_link';

export interface FamilyScoreResult {
  score: number;
  confidenceBand: ScoringConfidenceBand;
  decision: FamilyDecision;
  dimensionScores: FamilyDimensionScores;
  explanation: GroupingExplanation;
}

export interface FamilyDimensionScores {
  semanticTitlePatternSimilarity: number;
  sharedCoreComponents: number;
  sharedSystems: number;
  similarOutputOrArtifact: number;
  similarIntent: number;
  overlappingPathSegments: number;
  startEndContextSimilarity: number;
}

export type PossibleMatchLabel =
  | 'Possible Match'
  | 'Low Confidence Related'
  | 'Needs Review';

export interface PossibleMatchResult {
  score: number;
  label: PossibleMatchLabel;
  reason: string;
  explanation: GroupingExplanation;
}

// ─── Family Scoring ──────────────────────────────────────────────────────────

/**
 * Score two workflow runs for family membership.
 */
export function scoreFamilyMembership(
  a: WorkflowRunRecord,
  b: WorkflowRunRecord,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): FamilyScoreResult {
  const w = config.familyWeights;
  const supporting: ExplanationEntry[] = [];
  const weaknesses: ExplanationEntry[] = [];

  // ── Dimension 1: Semantic title pattern similarity ───────────────────────

  let titleSim = titleFamilySimilarity(a.normalizedTitle, b.normalizedTitle);

  // Boost for parameterized variants (same family sig, different qualifier)
  const isParamVariant = isParameterizedVariant(a.normalizedTitle, b.normalizedTitle);
  if (isParamVariant) {
    titleSim = Math.max(titleSim, 0.95);
    supporting.push({
      code: 'PARAMETERIZED_QUALIFIER_DIFF',
      weight: w.semanticTitlePatternSimilarity,
      detail: `Differs mainly in qualifier: "${a.normalizedTitle.qualifier ?? ''}" vs "${b.normalizedTitle.qualifier ?? ''}"`,
    });
  }

  // Penalty for generic titles
  if (isGenericTitle(a.title, config) || isGenericTitle(b.title, config)) {
    titleSim *= config.genericTitlePenalty;
    weaknesses.push({
      code: 'GENERIC_TITLE_PENALTY',
      weight: w.semanticTitlePatternSimilarity * (1 - config.genericTitlePenalty),
    });
  }

  if (titleSim >= 0.80) {
    supporting.push({ code: 'TITLE_PATTERN_MATCH', weight: w.semanticTitlePatternSimilarity });
  }

  // Same action + entity check
  if (
    a.normalizedTitle.action && b.normalizedTitle.action &&
    a.normalizedTitle.action === b.normalizedTitle.action &&
    a.normalizedTitle.entity && b.normalizedTitle.entity &&
    a.normalizedTitle.entity === b.normalizedTitle.entity
  ) {
    supporting.push({ code: 'SAME_ACTION_ENTITY', weight: w.similarIntent * 0.5 });
  }

  // ── Dimension 2: Shared core components ──────────────────────────────────

  const componentSim = computeSharedComponentRatio(a.stepFingerprints, b.stepFingerprints);

  if (componentSim >= 0.60) {
    supporting.push({
      code: 'SHARED_COMPONENTS',
      weight: w.sharedCoreComponents,
      detail: `${Math.round(componentSim * 100)}% shared step components`,
    });
  } else if (componentSim >= 0.30) {
    supporting.push({
      code: 'SHARED_CORE_STEPS',
      weight: w.sharedCoreComponents * componentSim,
    });
  }

  // ── Dimension 3: Shared systems ──────────────────────────────────────────

  const systemSim = setOverlap(a.systems, b.systems);

  if (systemSim >= 0.60) {
    supporting.push({ code: 'OVERLAPPING_SYSTEMS', weight: w.sharedSystems });
  } else if (systemSim < 0.20 && a.systems.length > 0 && b.systems.length > 0) {
    weaknesses.push({ code: 'SYSTEM_MISMATCH', weight: w.sharedSystems * 0.5 });
  }

  // ── Dimension 4: Similar output or artifact ──────────────────────────────

  const artifactSim = setOverlap(a.artifacts, b.artifacts);

  if (artifactSim >= 0.60) {
    supporting.push({ code: 'SIMILAR_ARTIFACT', weight: w.similarOutputOrArtifact });
  } else if (artifactSim < 0.20 && a.artifacts.length > 0 && b.artifacts.length > 0) {
    weaknesses.push({
      code: 'ARTIFACT_MISMATCH',
      weight: w.similarOutputOrArtifact * 0.5,
      detail: 'Output artifacts differ materially',
    });
  }

  // ── Dimension 5: Similar intent ──────────────────────────────────────────

  const intentSim = computeFamilyIntentSimilarity(a, b);

  if (intentSim >= 0.70) {
    supporting.push({ code: 'SIMILAR_INTENT', weight: w.similarIntent });
  }

  // ── Dimension 6: Overlapping path segments ───────────────────────────────

  const pathSim = computePathSegmentOverlap(a.stepFingerprints, b.stepFingerprints);

  if (pathSim >= 0.50) {
    supporting.push({
      code: 'SIMILAR_STEP_SEQUENCE',
      weight: w.overlappingPathSegments,
      detail: `${Math.round(pathSim * 100)}% path segment overlap`,
    });
  } else if (pathSim < 0.20) {
    weaknesses.push({
      code: 'PATH_DIVERGENCE',
      weight: w.overlappingPathSegments * 0.5,
    });
  }

  // ── Dimension 7: Start/end context similarity ────────────────────────────

  const startSim = a.startAnchor === b.startAnchor ? 1.0 : computeAnchorPartialSim(a.startAnchor, b.startAnchor);
  const endSim = a.endAnchor === b.endAnchor ? 1.0 : computeAnchorPartialSim(a.endAnchor, b.endAnchor);
  const contextSim = (startSim + endSim) / 2;

  if (contextSim >= 0.60) {
    supporting.push({ code: 'SAME_START_ANCHOR', weight: w.startEndContextSimilarity * 0.5 });
    supporting.push({ code: 'SAME_END_ANCHOR', weight: w.startEndContextSimilarity * 0.5 });
  }

  // ── Edge cases ───────────────────────────────────────────────────────────

  const minSteps = Math.min(a.stepCount, b.stepCount);
  if (minSteps <= config.shortWorkflowStepCount) {
    weaknesses.push({
      code: 'SHORT_WORKFLOW',
      weight: 0.03,
      detail: `Very short workflow (${minSteps} steps) limits evidence`,
    });
  }

  // ── Composite score ──────────────────────────────────────────────────────

  const score = clamp(
    titleSim * w.semanticTitlePatternSimilarity +
    componentSim * w.sharedCoreComponents +
    systemSim * w.sharedSystems +
    artifactSim * w.similarOutputOrArtifact +
    intentSim * w.similarIntent +
    pathSim * w.overlappingPathSegments +
    contextSim * w.startEndContextSimilarity,
  );

  // ── Decision ─────────────────────────────────────────────────────────────

  const t = config.familyThresholds;
  let decision: FamilyDecision;
  if (score >= t.sameFamily) {
    decision = 'same_family';
  } else if (score >= t.likelyFamily) {
    decision = 'likely_family';
  } else if (score >= t.possibleRelated) {
    decision = 'possible_related';
  } else {
    decision = 'no_family_link';
  }

  return {
    score: round3(score),
    confidenceBand: resolveConfidenceBand(score, config),
    decision,
    dimensionScores: {
      semanticTitlePatternSimilarity: round3(titleSim),
      sharedCoreComponents: round3(componentSim),
      sharedSystems: round3(systemSim),
      similarOutputOrArtifact: round3(artifactSim),
      similarIntent: round3(intentSim),
      overlappingPathSegments: round3(pathSim),
      startEndContextSimilarity: round3(contextSim),
    },
    explanation: buildExplanation(supporting, weaknesses, config.modelVersion),
  };
}

// ─── Possible Match Logic ────────────────────────────────────────────────────

/**
 * Evaluate whether two runs should be surfaced as a possible match.
 * Activates when family score is suggestive but not strong.
 */
export function evaluatePossibleMatch(
  a: WorkflowRunRecord,
  b: WorkflowRunRecord,
  familyResult: FamilyScoreResult,
  sampleSizeA: number,
  sampleSizeB: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): PossibleMatchResult | null {
  // Only activate for borderline / sub-threshold cases
  if (familyResult.decision === 'same_family' || familyResult.decision === 'likely_family') {
    return null; // Already grouped — no need for "possible match"
  }

  if (familyResult.decision === 'no_family_link' && familyResult.score < 0.35) {
    return null; // Too weak to even surface
  }

  const supporting: ExplanationEntry[] = [];
  const weaknesses: ExplanationEntry[] = [];

  let label: PossibleMatchLabel;
  let reason: string;

  // Low sample size: might become a family with more evidence
  const isLowSample = sampleSizeA < config.lowSampleSizeThreshold ||
    sampleSizeB < config.lowSampleSizeThreshold;

  if (isLowSample) {
    weaknesses.push({
      code: 'LOW_SAMPLE_SIZE',
      weight: 0.1,
      detail: `Only ${Math.min(sampleSizeA, sampleSizeB)} runs observed`,
    });
  }

  // Determine label
  if (familyResult.decision === 'possible_related') {
    if (isLowSample) {
      label = 'Needs Review';
      reason = 'Low sample size prevents stronger classification; relationship is suggestive';
    } else {
      label = 'Low Confidence Related';
      reason = 'Component overlap or naming suggests relation, but path evidence is mixed';
    }
    supporting.push({
      code: 'POSSIBLE_SIBLING_WORKFLOW',
      weight: familyResult.score,
      detail: reason,
    });
  } else {
    // no_family_link but score >= 0.35 — weak possible match
    label = 'Possible Match';
    reason = 'Weak signals suggest a possible relationship; not enough evidence for classification';
    supporting.push({
      code: 'POSSIBLE_SIBLING_WORKFLOW',
      weight: familyResult.score,
      detail: reason,
    });
  }

  return {
    score: familyResult.score,
    label,
    reason,
    explanation: buildExplanation(supporting, weaknesses, config.modelVersion),
  };
}

// ─── Relationship Generation ─────────────────────────────────────────────────

let relationshipCounter = 0;

function nextRelId(): string {
  return `rel-${++relationshipCounter}`;
}

/** Reset counter (for testing). */
export function resetRelationshipCounter(): void {
  relationshipCounter = 0;
}

/**
 * Generate a relationship object between two entities.
 */
export function createRelationship(
  sourceType: RelationshipEntityType,
  sourceId: string,
  targetType: RelationshipEntityType,
  targetId: string,
  relationshipType: RelationshipType,
  confidenceScore: number,
  codes: ExplanationCode[],
  explanationText: string,
  modelVersion: string = GROUPING_MODEL_VERSION,
): GroupRelationship {
  return {
    id: nextRelId(),
    sourceType,
    sourceId,
    targetType,
    targetId,
    relationshipType,
    confidenceScore: round3(confidenceScore),
    explanationCodes: codes,
    explanationText,
    createdFromModelVersion: modelVersion,
  };
}

/**
 * Generate all relationships for a pair of workflow runs based on scoring results.
 */
export function generateRunRelationships(
  a: WorkflowRunRecord,
  b: WorkflowRunRecord,
  familyResult: FamilyScoreResult,
  possibleMatch: PossibleMatchResult | null,
  sharedComponentIds: string[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): GroupRelationship[] {
  const relationships: GroupRelationship[] = [];

  // Family relationship
  if (familyResult.decision === 'same_family' || familyResult.decision === 'likely_family') {
    relationships.push(createRelationship(
      'workflow', a.id,
      'workflow', b.id,
      'same_family',
      familyResult.score,
      extractTopCodes(familyResult.explanation),
      familyResult.explanation.summary,
      config.modelVersion,
    ));
  }

  // Possible match relationship
  if (possibleMatch) {
    relationships.push(createRelationship(
      'workflow', a.id,
      'workflow', b.id,
      'possible_match',
      possibleMatch.score,
      extractTopCodes(possibleMatch.explanation),
      possibleMatch.reason,
      config.modelVersion,
    ));
  }

  // Shared component relationships
  for (const componentId of sharedComponentIds) {
    relationships.push(createRelationship(
      'workflow', a.id,
      'component', componentId,
      'shares_component',
      0.8, // Default component confidence
      ['SHARED_COMPONENTS'],
      'Workflow uses this shared component',
      config.modelVersion,
    ));
    relationships.push(createRelationship(
      'workflow', b.id,
      'component', componentId,
      'shares_component',
      0.8,
      ['SHARED_COMPONENTS'],
      'Workflow uses this shared component',
      config.modelVersion,
    ));
  }

  // Template-like relationship (parameterized variants)
  if (isParameterizedVariant(a.normalizedTitle, b.normalizedTitle)) {
    relationships.push(createRelationship(
      'workflow', a.id,
      'workflow', b.id,
      'template_like',
      familyResult.score,
      ['PARAMETERIZED_QUALIFIER_DIFF', 'TEMPLATE_LIKE'],
      `Parameterized variants: "${a.normalizedTitle.qualifier ?? ''}" vs "${b.normalizedTitle.qualifier ?? ''}"`,
      config.modelVersion,
    ));
  }

  return relationships;
}

/**
 * Generate relationships between process groups.
 */
export function generateGroupRelationships(
  groupAId: string,
  groupBId: string,
  familyResult: FamilyScoreResult,
  sharedComponentIds: string[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): GroupRelationship[] {
  const relationships: GroupRelationship[] = [];

  if (familyResult.decision === 'same_family' || familyResult.decision === 'likely_family') {
    relationships.push(createRelationship(
      'group', groupAId,
      'group', groupBId,
      'same_family',
      familyResult.score,
      extractTopCodes(familyResult.explanation),
      familyResult.explanation.summary,
      config.modelVersion,
    ));
  }

  if (familyResult.decision === 'possible_related') {
    relationships.push(createRelationship(
      'group', groupAId,
      'group', groupBId,
      'possible_match',
      familyResult.score,
      extractTopCodes(familyResult.explanation),
      familyResult.explanation.summary,
      config.modelVersion,
    ));
  }

  if (sharedComponentIds.length > 0) {
    for (const compId of sharedComponentIds) {
      relationships.push(createRelationship(
        'group', groupAId,
        'component', compId,
        'shares_component',
        0.8,
        ['SHARED_COMPONENTS'],
        'Process group uses this shared component',
        config.modelVersion,
      ));
    }
  }

  return relationships;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function computeSharedComponentRatio(a: StepFingerprint[], b: StepFingerprint[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  // Use semantic signatures (verb:object:system:eventType) for matching
  const sigsA = new Set(a.map(fp => fp.semanticSignature));
  const sigsB = new Set(b.map(fp => fp.semanticSignature));

  let shared = 0;
  for (const sig of sigsA) {
    if (sig === '_:_:_:_') continue; // Skip empty signatures
    if (sigsB.has(sig)) shared++;
  }

  const total = new Set([...sigsA, ...sigsB]);
  total.delete('_:_:_:_');

  return total.size === 0 ? 0 : shared / total.size;
}

function computeFamilyIntentSimilarity(a: WorkflowRunRecord, b: WorkflowRunRecord): number {
  const titleA = a.normalizedTitle;
  const titleB = b.normalizedTitle;

  let score = 0;
  let dimensions = 0;

  // Action match
  if (titleA.action || titleB.action) {
    dimensions++;
    if (titleA.action && titleB.action && titleA.action === titleB.action) score++;
  }

  // Entity match
  if (titleA.entity || titleB.entity) {
    dimensions++;
    if (titleA.entity && titleB.entity && titleA.entity === titleB.entity) score++;
  }

  // Artifact similarity (token overlap)
  if (titleA.artifact || titleB.artifact) {
    dimensions++;
    if (titleA.artifact && titleB.artifact) {
      const tokensA = new Set(titleA.artifact.split(' '));
      const tokensB = new Set(titleB.artifact.split(' '));
      const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
      const union = new Set([...tokensA, ...tokensB]).size;
      score += union > 0 ? intersection / union : 0;
    }
  }

  // System overlap as intent proxy
  if (a.systems.length > 0 || b.systems.length > 0) {
    dimensions++;
    score += setOverlap(a.systems, b.systems);
  }

  return dimensions === 0 ? 0.5 : score / dimensions;
}

function computePathSegmentOverlap(a: StepFingerprint[], b: StepFingerprint[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  // Use verb:object pairs as path segments
  const segmentsA = a.map(fp => `${fp.verb ?? '_'}:${fp.object ?? '_'}`);
  const segmentsB = b.map(fp => `${fp.verb ?? '_'}:${fp.object ?? '_'}`);

  // Order-sensitive overlap via bigram Jaccard
  return orderedBigramOverlap(segmentsA, segmentsB);
}

function computeAnchorPartialSim(anchorA: string, anchorB: string): number {
  if (!anchorA || !anchorB) return 0;
  const partsA = anchorA.split(':');
  const partsB = anchorB.split(':');
  let matches = 0;
  const total = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] === partsB[i] && partsA[i] !== '_') matches++;
  }
  return total === 0 ? 0 : matches / total;
}

function extractTopCodes(explanation: GroupingExplanation): ExplanationCode[] {
  return explanation.supporting
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(e => e.code);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
