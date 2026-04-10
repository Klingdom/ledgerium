/**
 * Scoring Configuration
 *
 * Central configuration for all grouping, scoring, and classification
 * logic in the process intelligence layer. All weights, thresholds,
 * penalties, and band mappings live here — nowhere else.
 *
 * Design:
 * - Every numeric constant is configurable via ScoringConfig
 * - Defaults are production-tuned
 * - Model version tracks algorithm changes for auditability
 */

import type { ExplanationCode, ExplanationEntry, GroupingExplanation } from './groupingTypes.js';
import { GROUPING_MODEL_VERSION } from './groupingTypes.js';

// ─── Scoring model version ───────────────────────────────────────────────────

export const SCORING_MODEL_VERSION = '1.0.0' as const;

// ─── Confidence band types ───────────────────────────────────────────────────

export type ScoringConfidenceBand =
  | 'verified'
  | 'high_confidence'
  | 'moderate_confidence'
  | 'low_confidence'
  | 'possible_match';

export interface BandThreshold {
  minScore: number;
  band: ScoringConfidenceBand;
  label: string;
}

// ─── Exact group weights ─────────────────────────────────────────────────────

export interface ExactGroupWeights {
  normalizedNameSimilarity: number;
  startAnchorMatch: number;
  endAnchorMatch: number;
  orderedCoreStepSimilarity: number;
  orderedEventSimilarity: number;
  samePrimarySystems: number;
  artifactSimilarity: number;
  intentSimilarity: number;
}

// ─── Family weights ──────────────────────────────────────────────────────────

export interface FamilyWeights {
  semanticTitlePatternSimilarity: number;
  sharedCoreComponents: number;
  sharedSystems: number;
  similarOutputOrArtifact: number;
  similarIntent: number;
  overlappingPathSegments: number;
  startEndContextSimilarity: number;
}

// ─── Component reuse weights ─────────────────────────────────────────────────

export interface ComponentReuseWeights {
  canonicalVerbMatch: number;
  canonicalObjectMatch: number;
  sameSystem: number;
  screenContextSimilarity: number;
  predecessorSuccessorSimilarity: number;
  eventTypeMatch: number;
  artifactSimilarity: number;
  semanticTextSimilarity: number;
}

// ─── Automation scoring weights ──────────────────────────────────────────────

export interface AutomationWeights {
  repeatFrequency: number;
  manualClickDensity: number;
  determinism: number;
  reuseAcrossFamilies: number;
  timeCost: number;
  delayConcentration: number;
  pathStability: number;
  // Penalty factors (reduce score)
  exceptionRatePenalty: number;
  ambiguityPenalty: number;
}

// ─── Full config ─────────────────────────────────────────────────────────────

export interface ScoringConfig {
  modelVersion: string;

  // ── Exact group
  exactGroupWeights: ExactGroupWeights;
  exactGroupThresholds: {
    /** Score >= this = verified exact group candidate */
    verified: number;
    /** Score >= this but < verified = likely exact, needs stricter validation */
    likely: number;
    /** Score < this = do not exact-group */
    minimum: number;
  };
  /** Multiplier applied to start anchor contribution when anchors mismatch (< 1.0 = penalty) */
  anchorMismatchPenalty: number;

  // ── Family
  familyWeights: FamilyWeights;
  familyThresholds: {
    /** Score >= this = same family */
    sameFamily: number;
    /** Score >= this = likely family / related sibling */
    likelyFamily: number;
    /** Score >= this = possible related */
    possibleRelated: number;
    /** Score < this = no meaningful family link */
    minimum: number;
  };

  // ── Component reuse
  componentReuseWeights: ComponentReuseWeights;
  componentReuseThresholds: {
    sameComponent: number;
    likelySameComponent: number;
    possibleRelatedAction: number;
    minimum: number;
  };

  // ── Variant distance
  variantThresholds: {
    /** Deviation score (0-1) below which variant is minor */
    minorVariant: number;
    /** Deviation score above which variant is outlier */
    outlier: number;
  };

  // ── Confidence bands
  bands: BandThreshold[];

  // ── Generic title detection
  genericTitlePatterns: RegExp[];
  genericTitlePenalty: number;

  // ── Edge-case thresholds
  shortWorkflowStepCount: number;
  incompleteRecordingConfidenceCap: number;
  lowSampleSizeThreshold: number;

  // ── Automation scoring
  automationWeights: AutomationWeights;
}

// ─── Default configuration ───────────────────────────────────────────────────

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  modelVersion: SCORING_MODEL_VERSION,

  exactGroupWeights: {
    normalizedNameSimilarity: 0.18,
    startAnchorMatch: 0.16,
    endAnchorMatch: 0.16,
    orderedCoreStepSimilarity: 0.22,
    orderedEventSimilarity: 0.12,
    samePrimarySystems: 0.06,
    artifactSimilarity: 0.04,
    intentSimilarity: 0.06,
  },
  exactGroupThresholds: {
    verified: 0.90,
    likely: 0.82,
    minimum: 0.82,
  },
  anchorMismatchPenalty: 0.3,

  familyWeights: {
    semanticTitlePatternSimilarity: 0.22,
    sharedCoreComponents: 0.20,
    sharedSystems: 0.10,
    similarOutputOrArtifact: 0.12,
    similarIntent: 0.18,
    overlappingPathSegments: 0.12,
    startEndContextSimilarity: 0.06,
  },
  familyThresholds: {
    sameFamily: 0.80,
    likelyFamily: 0.68,
    possibleRelated: 0.55,
    minimum: 0.55,
  },

  componentReuseWeights: {
    canonicalVerbMatch: 0.20,
    canonicalObjectMatch: 0.20,
    sameSystem: 0.16,
    screenContextSimilarity: 0.10,
    predecessorSuccessorSimilarity: 0.12,
    eventTypeMatch: 0.08,
    artifactSimilarity: 0.08,
    semanticTextSimilarity: 0.06,
  },
  componentReuseThresholds: {
    sameComponent: 0.88,
    likelySameComponent: 0.75,
    possibleRelatedAction: 0.60,
    minimum: 0.60,
  },

  variantThresholds: {
    minorVariant: 0.15,
    outlier: 0.50,
  },

  bands: [
    { minScore: 0.90, band: 'verified', label: 'Verified' },
    { minScore: 0.82, band: 'high_confidence', label: 'High Confidence' },
    { minScore: 0.70, band: 'moderate_confidence', label: 'Moderate Confidence' },
    { minScore: 0.55, band: 'low_confidence', label: 'Low Confidence' },
    { minScore: 0.00, band: 'possible_match', label: 'Possible Match' },
  ],

  genericTitlePatterns: [
    /^test$/i,
    /^test\s*\d*$/i,
    /^untitled$/i,
    /^new\s*(?:workflow|recording|process)?$/i,
    /^demo$/i,
    /^example$/i,
    /^sample$/i,
    /^temp$/i,
    /^tmp$/i,
    /^asdf/i,
    /^(?:my|the)\s+(?:workflow|process|recording)$/i,
    /^workflow\s*\d*$/i,
    /^recording\s*\d*$/i,
    /^process\s*\d*$/i,
    /^email\s*test$/i,
  ],
  genericTitlePenalty: 0.4,

  shortWorkflowStepCount: 2,
  incompleteRecordingConfidenceCap: 0.75,
  lowSampleSizeThreshold: 3,

  automationWeights: {
    repeatFrequency: 0.18,
    manualClickDensity: 0.14,
    determinism: 0.16,
    reuseAcrossFamilies: 0.10,
    timeCost: 0.14,
    delayConcentration: 0.08,
    pathStability: 0.10,
    exceptionRatePenalty: 0.05,
    ambiguityPenalty: 0.05,
  },
};

// ─── Confidence band resolution ──────────────────────────────────────────────

export function resolveConfidenceBand(
  score: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoringConfidenceBand {
  for (const band of config.bands) {
    if (score >= band.minScore) return band.band;
  }
  return 'possible_match';
}

export function resolveConfidenceBandLabel(
  score: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): string {
  for (const band of config.bands) {
    if (score >= band.minScore) return band.label;
  }
  return 'Possible Match';
}

// ─── Generic title detection ─────────────────────────────────────────────────

export function isGenericTitle(
  title: string,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): boolean {
  const trimmed = title.trim();
  if (trimmed.length === 0) return true;
  return config.genericTitlePatterns.some(p => p.test(trimmed));
}

// ─── Explanation builders ────────────────────────────────────────────────────

/**
 * Build a GroupingExplanation from accumulated evidence entries.
 * Generates a human-readable summary from the codes.
 */
export function buildExplanation(
  supporting: ExplanationEntry[],
  weaknesses: ExplanationEntry[],
  modelVersion: string = GROUPING_MODEL_VERSION,
): GroupingExplanation {
  const summary = generateExplanationSummary(supporting, weaknesses);
  return { summary, supporting, weaknesses, modelVersion };
}

/**
 * Generate a concise human-readable summary from explanation entries.
 * Designed for card subtitles (1-2 sentences).
 */
function generateExplanationSummary(
  supporting: ExplanationEntry[],
  weaknesses: ExplanationEntry[],
): string {
  const parts: string[] = [];

  // Summarize top positive signals
  const topSupporting = supporting
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  for (const entry of topSupporting) {
    const text = SUMMARY_TEMPLATES[entry.code];
    if (text) parts.push(entry.detail ?? text);
  }

  // Summarize top weaknesses
  if (weaknesses.length > 0) {
    const topWeak = weaknesses.sort((a, b) => b.weight - a.weight)[0];
    if (topWeak) {
      const text = SUMMARY_TEMPLATES[topWeak.code];
      if (text) parts.push(topWeak.detail ?? text);
    }
  }

  if (parts.length === 0) return 'Grouped based on observed evidence.';
  return parts.join('. ') + '.';
}

/**
 * Templates for generating explanation summaries from codes.
 * Each code maps to a default phrase; the entry's `detail` field overrides.
 */
const SUMMARY_TEMPLATES: Partial<Record<ExplanationCode, string>> = {
  SAME_START_ANCHOR: 'Same start point',
  SAME_END_ANCHOR: 'Same end point',
  HIGH_STEP_OVERLAP: 'High step overlap',
  HIGH_EVENT_OVERLAP: 'High event overlap',
  SAME_SYSTEMS: 'Same systems used',
  SAME_INTENT: 'Same business intent',
  TITLE_EXACT_MATCH: 'Exact title match',
  TITLE_NORMALIZED_MATCH: 'Normalized title match',
  STEP_SIGNATURE_MATCH: 'Identical step sequence',
  EVENT_SIGNATURE_MATCH: 'Identical event sequence',
  TITLE_PATTERN_MATCH: 'Title follows a shared pattern',
  PARAMETERIZED_QUALIFIER_DIFF: 'Differs mainly in qualifier token',
  SAME_ACTION_ENTITY: 'Same action on the same entity',
  SHARED_CORE_STEPS: 'Shares core steps',
  OVERLAPPING_SYSTEMS: 'Overlapping systems',
  SIMILAR_STEP_SEQUENCE: 'Similar step sequence',
  SIMILAR_INTENT: 'Similar business intent',
  SIMILAR_ARTIFACT: 'Similar output artifact',
  SHARED_COMPONENTS: 'Shares reusable components',
  POSSIBLE_SIBLING_WORKFLOW: 'Possibly related sibling workflow',
  POSSIBLE_COMPONENT_REUSE: 'Possible component reuse',
  COMMON_STEP_PATTERN: 'Common step pattern across workflows',
  CROSS_FAMILY_REUSE: 'Component reused across process families',
  LOW_SAMPLE_SIZE: 'Low sample size reduces confidence',
  MISSING_STEPS: 'Some steps are missing or skipped',
  DURATION_MISMATCH: 'Duration differs significantly',
  SYSTEM_MISMATCH: 'Different systems used',
  TITLE_MISMATCH: 'Title differs significantly',
  WEAK_SEQUENCE_MATCH: 'Weak step sequence match',
  GENERIC_TITLE_PENALTY: 'Generic title reduces name-based confidence',
  ARTIFACT_MISMATCH: 'Output artifact differs materially',
  PATH_DIVERGENCE: 'Execution path diverges significantly',
  ANCHOR_MISMATCH: 'Start or end point differs',
  INCOMPLETE_RECORDING: 'Recording appears incomplete',
  SHORT_WORKFLOW: 'Very short workflow limits evidence',
};

// ─── Utility: set overlap ────────────────────────────────────────────────────

/** Jaccard similarity for two string sets: |intersection| / |union|. */
export function setOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Ordered bigram Jaccard similarity for two string sequences.
 * Captures order: ["A","B","C"] → bigrams ["A:B","B:C"].
 */
export function orderedBigramOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length <= 1 && b.length <= 1) {
    // Single-element: direct comparison
    return a[0] === b[0] ? 1.0 : 0.0;
  }

  const bigramsA = toBigrams(a);
  const bigramsB = toBigrams(b);

  const countA = new Map<string, number>();
  for (const bg of bigramsA) countA.set(bg, (countA.get(bg) ?? 0) + 1);
  const countB = new Map<string, number>();
  for (const bg of bigramsB) countB.set(bg, (countB.get(bg) ?? 0) + 1);

  let intersection = 0;
  for (const [key, ca] of countA) {
    intersection += Math.min(ca, countB.get(key) ?? 0);
  }
  const union = bigramsA.length + bigramsB.length - intersection;
  return union === 0 ? 1.0 : intersection / union;
}

function toBigrams(arr: string[]): string[] {
  if (arr.length < 2) return arr.map(s => `__S__:${s}`);
  const result: string[] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    result.push(`${arr[i]}:${arr[i + 1]}`);
  }
  return result;
}
