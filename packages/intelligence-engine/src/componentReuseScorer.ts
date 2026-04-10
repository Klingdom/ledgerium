/**
 * Component Reuse Scorer
 *
 * Determines whether steps/events across workflows map to the same reusable
 * canonical component. Uses weighted multi-dimensional scoring across verb,
 * object, system, screen context, predecessor/successor patterns, event type,
 * artifact, and semantic text similarity.
 *
 * Supports:
 * - Cross-workflow reuse detection
 * - Cross-family reuse detection
 * - High-frequency and high-variance component flagging
 */

import type {
  StepFingerprint,
  ExplanationEntry,
  GroupingExplanation,
} from './groupingTypes.js';
import type { ScoringConfig, ScoringConfidenceBand } from './scoringConfig.js';
import { DEFAULT_SCORING_CONFIG, resolveConfidenceBand, buildExplanation } from './scoringConfig.js';

// ─── Result types ────────────────────────────────────────────────────────────

export type ComponentReuseDecision =
  | 'same_component'
  | 'likely_same_component'
  | 'possible_related_action'
  | 'distinct';

export interface ComponentReuseResult {
  score: number;
  confidenceBand: ScoringConfidenceBand;
  decision: ComponentReuseDecision;
  dimensionScores: ComponentReuseDimensionScores;
  explanation: GroupingExplanation;
}

export interface ComponentReuseDimensionScores {
  canonicalVerbMatch: number;
  canonicalObjectMatch: number;
  sameSystem: number;
  screenContextSimilarity: number;
  predecessorSuccessorSimilarity: number;
  eventTypeMatch: number;
  artifactSimilarity: number;
  semanticTextSimilarity: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score whether two step fingerprints represent the same reusable component.
 */
export function scoreComponentReuse(
  a: StepFingerprint,
  b: StepFingerprint,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ComponentReuseResult {
  const w = config.componentReuseWeights;
  const supporting: ExplanationEntry[] = [];
  const weaknesses: ExplanationEntry[] = [];

  // ── Dimension 1: Canonical verb match ────────────────────────────────────

  const verbSim = (a.verb && b.verb && a.verb === b.verb) ? 1.0 : 0.0;
  if (verbSim === 1.0) {
    supporting.push({ code: 'COMMON_STEP_PATTERN', weight: w.canonicalVerbMatch, detail: `Same verb: ${a.verb}` });
  }

  // ── Dimension 2: Canonical object match ──────────────────────────────────

  const objectSim = (a.object && b.object && a.object === b.object) ? 1.0 : 0.0;
  if (objectSim === 1.0) {
    supporting.push({ code: 'COMMON_STEP_PATTERN', weight: w.canonicalObjectMatch, detail: `Same object: ${a.object}` });
  }

  // ── Dimension 3: Same system ─────────────────────────────────────────────

  let systemSim = 0;
  if (a.system && b.system) {
    systemSim = a.system === b.system ? 1.0 : 0.0;
  } else if (!a.system && !b.system) {
    systemSim = 0.5; // Both system-agnostic, neutral
  }

  if (systemSim === 1.0) {
    supporting.push({ code: 'SAME_SYSTEMS', weight: w.sameSystem, detail: `Same system: ${a.system}` });
  }

  // ── Dimension 4: Screen context similarity ───────────────────────────────

  let screenSim = 0;
  if (a.screenContext && b.screenContext) {
    screenSim = a.screenContext === b.screenContext ? 1.0 : tokenOverlap(a.screenContext, b.screenContext);
  }

  // ── Dimension 5: Predecessor/successor similarity ────────────────────────

  // Compare predecessor and successor semantic signatures
  let predSuccSim = 0;
  let predCount = 0;
  if (a.precedingStepFingerprintId && b.precedingStepFingerprintId) {
    // We only have IDs, not the actual fingerprints, so check if they point
    // to the same relative position pattern. In practice, this is enriched
    // by the component detector's predecessor/successor tracking.
    predCount++;
  }
  if (a.followingStepFingerprintId && b.followingStepFingerprintId) {
    predCount++;
  }
  // If both have context links, give partial credit
  predSuccSim = predCount > 0 ? 0.5 : 0;

  // ── Dimension 6: Event type match ────────────────────────────────────────

  const eventSim = (a.eventType && b.eventType && a.eventType === b.eventType) ? 1.0 : 0.0;

  // ── Dimension 7: Artifact similarity ─────────────────────────────────────

  let artifactSim = 0;
  if (a.qualifier && b.qualifier) {
    artifactSim = a.qualifier === b.qualifier ? 1.0 : tokenOverlap(a.qualifier, b.qualifier);
  } else if (!a.qualifier && !b.qualifier) {
    artifactSim = 0.5; // Both qualifier-less, neutral
  }

  // ── Dimension 8: Semantic text similarity ────────────────────────────────

  const textSim = tokenOverlap(a.normalizedLabel, b.normalizedLabel);

  // ── Composite score ──────────────────────────────────────────────────────

  const score = Math.max(0, Math.min(1,
    verbSim * w.canonicalVerbMatch +
    objectSim * w.canonicalObjectMatch +
    systemSim * w.sameSystem +
    screenSim * w.screenContextSimilarity +
    predSuccSim * w.predecessorSuccessorSimilarity +
    eventSim * w.eventTypeMatch +
    artifactSim * w.artifactSimilarity +
    textSim * w.semanticTextSimilarity,
  ));

  // Cross-family/cross-workflow reuse signals
  if (score >= config.componentReuseThresholds.sameComponent) {
    supporting.push({
      code: 'POSSIBLE_COMPONENT_REUSE',
      weight: score,
      detail: 'High confidence reusable component match',
    });
  } else if (score >= config.componentReuseThresholds.possibleRelatedAction) {
    supporting.push({
      code: 'POSSIBLE_COMPONENT_REUSE',
      weight: score,
      detail: 'Possible related action component',
    });
  }

  // ── Decision ─────────────────────────────────────────────────────────────

  const t = config.componentReuseThresholds;
  let decision: ComponentReuseDecision;
  if (score >= t.sameComponent) {
    decision = 'same_component';
  } else if (score >= t.likelySameComponent) {
    decision = 'likely_same_component';
  } else if (score >= t.possibleRelatedAction) {
    decision = 'possible_related_action';
  } else {
    decision = 'distinct';
  }

  return {
    score: Math.round(score * 1000) / 1000,
    confidenceBand: resolveConfidenceBand(score, config),
    decision,
    dimensionScores: {
      canonicalVerbMatch: verbSim,
      canonicalObjectMatch: objectSim,
      sameSystem: round3(systemSim),
      screenContextSimilarity: round3(screenSim),
      predecessorSuccessorSimilarity: round3(predSuccSim),
      eventTypeMatch: eventSim,
      artifactSimilarity: round3(artifactSim),
      semanticTextSimilarity: round3(textSim),
    },
    explanation: buildExplanation(supporting, weaknesses, config.modelVersion),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
