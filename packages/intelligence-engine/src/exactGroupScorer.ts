/**
 * Exact Group Scoring Engine
 *
 * Determines whether two workflow runs belong to the same verified exact
 * process group. Uses weighted multi-dimensional scoring across title,
 * anchors, step sequences, event sequences, systems, artifacts, and intent.
 *
 * Conservative by design:
 * - Heavy penalty for anchor mismatches (different start/end = different process)
 * - Generic titles ("test", "workflow 1") get title weight reduced
 * - Requires >= 0.82 composite score to allow grouping
 * - Never groups on title alone — path evidence is mandatory
 *
 * All outputs include structured explanation codes and confidence bands.
 */

import type {
  ExplanationCode,
  ExplanationEntry,
  GroupingExplanation,
  NormalizedTitle,
  StepFingerprint,
  WorkflowRunRecord,
} from './groupingTypes.js';
import type { ScoringConfig, ScoringConfidenceBand } from './scoringConfig.js';
import {
  DEFAULT_SCORING_CONFIG,
  resolveConfidenceBand,
  buildExplanation,
  isGenericTitle,
  setOverlap,
  orderedBigramOverlap,
} from './scoringConfig.js';
import { titleFamilySimilarity } from './titleNormalizer.js';
import { sequenceFingerSimilarity } from './stepFingerprinter.js';

// ─── Result types ────────────────────────────────────────────────────────────

export interface ExactGroupScoreResult {
  /** Composite score 0-1. */
  score: number;
  /** User-facing confidence band. */
  confidenceBand: ScoringConfidenceBand;
  /** Whether this pair should be merged into the same exact group. */
  shouldMerge: boolean;
  /** Per-dimension scores for transparency. */
  dimensionScores: ExactGroupDimensionScores;
  /** Structured explanation of the decision. */
  explanation: GroupingExplanation;
}

export interface ExactGroupDimensionScores {
  normalizedNameSimilarity: number;
  startAnchorMatch: number;
  endAnchorMatch: number;
  orderedCoreStepSimilarity: number;
  orderedEventSimilarity: number;
  samePrimarySystems: number;
  artifactSimilarity: number;
  intentSimilarity: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score two workflow runs for exact group membership.
 *
 * @param a - First workflow run record
 * @param b - Second workflow run record
 * @param config - Scoring configuration (defaults to production config)
 * @returns Scoring result with merge decision, band, and explanations
 */
export function scoreExactGroup(
  a: WorkflowRunRecord,
  b: WorkflowRunRecord,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ExactGroupScoreResult {
  const w = config.exactGroupWeights;
  const supporting: ExplanationEntry[] = [];
  const weaknesses: ExplanationEntry[] = [];

  // ── Dimension 1: Normalized name similarity ──────────────────────────────

  let nameSim = computeNameSimilarity(a.normalizedTitle, b.normalizedTitle);

  // Generic title penalty: reduce reliance on title when title is generic
  const aGeneric = isGenericTitle(a.title, config);
  const bGeneric = isGenericTitle(b.title, config);
  let effectiveNameWeight = w.normalizedNameSimilarity;

  if (aGeneric || bGeneric) {
    effectiveNameWeight *= config.genericTitlePenalty;
    weaknesses.push({
      code: 'GENERIC_TITLE_PENALTY',
      weight: w.normalizedNameSimilarity * (1 - config.genericTitlePenalty),
      detail: `Generic title "${aGeneric ? a.title : b.title}" reduces name-based confidence`,
    });
  }

  if (nameSim >= 0.95) {
    supporting.push({ code: 'TITLE_EXACT_MATCH', weight: effectiveNameWeight, detail: 'Titles match exactly' });
  } else if (nameSim >= 0.80) {
    supporting.push({ code: 'TITLE_NORMALIZED_MATCH', weight: effectiveNameWeight * nameSim });
  } else if (nameSim < 0.50) {
    weaknesses.push({ code: 'TITLE_MISMATCH', weight: effectiveNameWeight * (1 - nameSim) });
  }

  // ── Dimension 2: Start anchor match ──────────────────────────────────────

  const startSim = a.startAnchor === b.startAnchor ? 1.0 : computeAnchorSimilarity(a.startAnchor, b.startAnchor);
  let effectiveStartWeight = w.startAnchorMatch;

  if (startSim >= 0.90) {
    supporting.push({ code: 'SAME_START_ANCHOR', weight: effectiveStartWeight, detail: 'Same start point' });
  } else {
    // Heavy penalty for anchor mismatch
    effectiveStartWeight *= config.anchorMismatchPenalty;
    weaknesses.push({
      code: 'ANCHOR_MISMATCH',
      weight: w.startAnchorMatch * (1 - config.anchorMismatchPenalty),
      detail: 'Start points differ',
    });
  }

  // ── Dimension 3: End anchor match ────────────────────────────────────────

  const endSim = a.endAnchor === b.endAnchor ? 1.0 : computeAnchorSimilarity(a.endAnchor, b.endAnchor);
  let effectiveEndWeight = w.endAnchorMatch;

  if (endSim >= 0.90) {
    supporting.push({ code: 'SAME_END_ANCHOR', weight: effectiveEndWeight, detail: 'Same end point' });
  } else {
    effectiveEndWeight *= config.anchorMismatchPenalty;
    weaknesses.push({
      code: 'ANCHOR_MISMATCH',
      weight: w.endAnchorMatch * (1 - config.anchorMismatchPenalty),
      detail: 'End points differ',
    });
  }

  // ── Dimension 4: Ordered core step similarity ────────────────────────────

  const stepSim = computeStepSimilarity(a.stepFingerprints, b.stepFingerprints);

  if (stepSim >= 0.90) {
    supporting.push({
      code: 'HIGH_STEP_OVERLAP',
      weight: w.orderedCoreStepSimilarity,
      detail: `${Math.round(stepSim * 100)}% shared core steps`,
    });
  } else if (stepSim >= 0.75) {
    supporting.push({
      code: 'SIMILAR_STEP_SEQUENCE',
      weight: w.orderedCoreStepSimilarity * stepSim,
      detail: `${Math.round(stepSim * 100)}% step sequence similarity`,
    });
  } else {
    weaknesses.push({
      code: 'PATH_DIVERGENCE',
      weight: w.orderedCoreStepSimilarity * (1 - stepSim),
      detail: `Only ${Math.round(stepSim * 100)}% step overlap`,
    });
  }

  // ── Dimension 5: Ordered event similarity ────────────────────────────────

  const eventSim = orderedBigramOverlap(a.eventFingerprints, b.eventFingerprints);

  if (eventSim >= 0.85) {
    supporting.push({
      code: 'HIGH_EVENT_OVERLAP',
      weight: w.orderedEventSimilarity,
      detail: `${Math.round(eventSim * 100)}% event sequence overlap`,
    });
  } else if (eventSim < 0.50) {
    weaknesses.push({
      code: 'WEAK_SEQUENCE_MATCH',
      weight: w.orderedEventSimilarity * (1 - eventSim),
      detail: `Only ${Math.round(eventSim * 100)}% event overlap`,
    });
  }

  // ── Dimension 6: Same primary systems ────────────────────────────────────

  const systemSim = setOverlap(a.systems, b.systems);

  if (systemSim >= 0.80) {
    supporting.push({ code: 'SAME_SYSTEMS', weight: w.samePrimarySystems, detail: 'Same systems used' });
  } else if (systemSim < 0.40) {
    weaknesses.push({
      code: 'SYSTEM_MISMATCH',
      weight: w.samePrimarySystems * (1 - systemSim),
      detail: 'Different primary systems',
    });
  }

  // ── Dimension 7: Artifact similarity ─────────────────────────────────────

  const artifactSim = setOverlap(a.artifacts, b.artifacts);

  if (artifactSim >= 0.80) {
    supporting.push({ code: 'SIMILAR_ARTIFACT', weight: w.artifactSimilarity });
  } else if (artifactSim < 0.30 && a.artifacts.length > 0 && b.artifacts.length > 0) {
    weaknesses.push({
      code: 'ARTIFACT_MISMATCH',
      weight: w.artifactSimilarity,
      detail: 'Output artifacts differ materially',
    });
  }

  // ── Dimension 8: Intent similarity ───────────────────────────────────────

  const intentSim = computeIntentSimilarity(a, b);

  if (intentSim >= 0.80) {
    supporting.push({ code: 'SAME_INTENT', weight: w.intentSimilarity, detail: 'Same business intent' });
  }

  // ── Edge-case penalties ──────────────────────────────────────────────────

  if (a.stepCount <= config.shortWorkflowStepCount || b.stepCount <= config.shortWorkflowStepCount) {
    weaknesses.push({
      code: 'SHORT_WORKFLOW',
      weight: 0.05,
      detail: `Very short workflow (${Math.min(a.stepCount, b.stepCount)} steps) limits evidence`,
    });
  }

  // ── Compute weighted composite score ─────────────────────────────────────

  // Redistribute weight if generic title reduced name weight
  const totalWeight = effectiveNameWeight + effectiveStartWeight + effectiveEndWeight +
    w.orderedCoreStepSimilarity + w.orderedEventSimilarity +
    w.samePrimarySystems + w.artifactSimilarity + w.intentSimilarity;

  const rawScore = (
    nameSim * effectiveNameWeight +
    startSim * effectiveStartWeight +
    endSim * effectiveEndWeight +
    stepSim * w.orderedCoreStepSimilarity +
    eventSim * w.orderedEventSimilarity +
    systemSim * w.samePrimarySystems +
    artifactSim * w.artifactSimilarity +
    intentSim * w.intentSimilarity
  ) / totalWeight;

  // Clamp to [0, 1]
  const score = Math.max(0, Math.min(1, rawScore));

  // ── Apply hard guardrails ────────────────────────────────────────────────

  // Hard block: if core step similarity is below 0.50, never exact-group
  const hardBlocked = stepSim < 0.50;
  // Hard block: if both anchors are materially different
  const anchorsBlocked = startSim < 0.40 && endSim < 0.40;

  const shouldMerge = !hardBlocked && !anchorsBlocked && score >= config.exactGroupThresholds.minimum;

  if (hardBlocked) {
    weaknesses.push({
      code: 'PATH_DIVERGENCE',
      weight: 0.22,
      detail: 'Core step sequence diverges too much for exact grouping',
    });
  }

  const confidenceBand = resolveConfidenceBand(score, config);
  const explanation = buildExplanation(supporting, weaknesses, config.modelVersion);

  return {
    score: Math.round(score * 1000) / 1000,
    confidenceBand,
    shouldMerge,
    dimensionScores: {
      normalizedNameSimilarity: round3(nameSim),
      startAnchorMatch: round3(startSim),
      endAnchorMatch: round3(endSim),
      orderedCoreStepSimilarity: round3(stepSim),
      orderedEventSimilarity: round3(eventSim),
      samePrimarySystems: round3(systemSim),
      artifactSimilarity: round3(artifactSim),
      intentSimilarity: round3(intentSim),
    },
    explanation,
  };
}

// ─── Internal dimension computations ─────────────────────────────────────────

function computeNameSimilarity(a: NormalizedTitle, b: NormalizedTitle): number {
  // Exact signature match = 1.0
  if (a.exactSignature === b.exactSignature && a.exactSignature.length > 0) return 1.0;
  // Family signature match = 0.85 (same process, different qualifier)
  if (a.familySignature === b.familySignature && a.familySignature.length > 0) return 0.85;
  // Fall back to title family similarity
  return titleFamilySimilarity(a, b);
}

function computeAnchorSimilarity(anchorA: string, anchorB: string): number {
  if (anchorA === anchorB) return 1.0;
  if (!anchorA || !anchorB) return 0.0;
  // Parse anchor format: "verb:object:system:eventType"
  const partsA = anchorA.split(':');
  const partsB = anchorB.split(':');
  let matches = 0;
  const total = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] === partsB[i] && partsA[i] !== '_') matches++;
  }
  return total === 0 ? 0 : matches / total;
}

function computeStepSimilarity(a: StepFingerprint[], b: StepFingerprint[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  return sequenceFingerSimilarity(a, b);
}

function computeIntentSimilarity(a: WorkflowRunRecord, b: WorkflowRunRecord): number {
  // Intent is inferred from action + entity + artifact in the normalized title
  const titleA = a.normalizedTitle;
  const titleB = b.normalizedTitle;

  let score = 0;
  let dimensions = 0;

  // Same action
  if (titleA.action && titleB.action) {
    dimensions++;
    if (titleA.action === titleB.action) score++;
  }

  // Same entity
  if (titleA.entity && titleB.entity) {
    dimensions++;
    if (titleA.entity === titleB.entity) score++;
  }

  // Same artifact type
  if (titleA.artifact && titleB.artifact) {
    dimensions++;
    const tokensA = new Set(titleA.artifact.split(' '));
    const tokensB = new Set(titleB.artifact.split(' '));
    const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    score += union > 0 ? intersection / union : 0;
  }

  // Same systems (as a proxy for operational context)
  if (a.systems.length > 0 && b.systems.length > 0) {
    dimensions++;
    score += setOverlap(a.systems, b.systems);
  }

  return dimensions === 0 ? 0.5 : score / dimensions;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
