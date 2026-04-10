/**
 * @ledgerium/intelligence-engine
 *
 * Process Intelligence Layer for Ledgerium AI.
 *
 * Transforms arrays of ProcessRunBundle outputs (from @ledgerium/process-engine)
 * into portfolio-level intelligence:
 *
 * - ProcessMetrics: volume, timing, completion rate across runs
 * - TimestudyResult: total and per-step duration statistics
 * - VarianceReport: duration variance, step count variance, sequence stability
 * - VariantSet: detected path variants with frequency and similarity scores
 * - BottleneckReport: high-duration and high-variance step positions
 * - DriftReport: structural, timing, step count, and exception rate drift
 * - StandardPathResult: most common execution structure
 *
 * All functions are deterministic, privacy-safe, and evidence-linked.
 */

export { analyzePortfolio, resolveOptions } from './intelligenceEngine.js';

export type {
  ProcessRunBundle,
  IntelligenceInput,
  IntelligenceOptions,
  PortfolioIntelligence,
  ProcessMetrics,
  TimestudyResult,
  StepPositionTimestudy,
  VarianceReport,
  HighVarianceStep,
  VariantSet,
  ProcessVariant,
  PathSignature,
  BottleneckReport,
  BottleneckStep,
  DriftReport,
  DriftSignal,
  DriftType,
  DriftSeverity,
  StandardPathResult,
} from './types.js';

export { INTELLIGENCE_ENGINE_VERSION, INTELLIGENCE_DEFAULTS } from './types.js';

// Path signature utilities (useful for callers doing their own similarity checks)
export { computePathSignature, computeSignatureSimilarity, bigramJaccardSimilarity } from './pathSignature.js';

// Individual analysis functions (composable; useful when only one analysis is needed)
export { buildMetrics } from './metricsBuilder.js';
export { analyzeTimestudy } from './timestudyAnalyzer.js';
export { analyzeVariance } from './varianceAnalyzer.js';
export { detectVariants } from './variantDetector.js';
export { detectBottlenecks } from './bottleneckDetector.js';
export { detectDrift } from './driftDetector.js';

// Phase 3: Process Intelligence Layer
export { analyzeSopAlignment } from './sopAlignmentEngine.js';
export type { SOPStep, SOPAlignmentResult, UndocumentedStep, UnusedStep, SOPDriftIndicator } from './sopAlignmentEngine.js';

export {
  computeStandardizationScore,
  computeDocumentationDriftScore,
  detectOutlierRuns,
  deriveRecommendedCanonicalPath,
} from './standardizationScorer.js';
export type {
  StandardizationScore,
  DocumentationDriftScore,
  OutlierRun,
  RecommendedCanonicalPath,
} from './standardizationScorer.js';

// Phase 4: Recommendation Engine
export {
  generateRecommendations,
  computeAutomationROI,
  simulateWhatIf,
} from './recommendationEngine.js';
export type {
  Recommendation,
  RecommendationType,
  RecommendationImpact,
  RecommendationConfidence,
  AutomationROI,
  WhatIfScenario,
} from './recommendationEngine.js';

// ─── Process Grouping Hierarchy (Phase 5) ─────────────────────────────────────

// Grouping types & explainability
export {
  toConfidenceBand,
  EXPLANATION_CODE_LABELS,
  POSITIVE_CODES,
  WEAKNESS_CODES,
  GROUPING_MODEL_VERSION,
} from './groupingTypes.js';
export type {
  ConfidenceBand,
  GroupClassification,
  ExplanationCode,
  ExplanationEntry,
  GroupingExplanation,
  NormalizedTitle,
  StepFingerprint,
  ComponentType,
  CanonicalComponent,
  ProcessFamilyMetrics,
  ProcessFamily,
  ProcessGroupMetrics,
  ProcessGroup,
  DeviationPoint,
  ProcessVariantRecord,
  ClusteringScores,
  WorkflowRunRecord,
  RelationshipType,
  RelationshipEntityType,
  GroupRelationship,
} from './groupingTypes.js';

// Title normalization
export {
  normalizeTitle,
  normalizeTitles,
  titleFamilySimilarity,
  isParameterizedVariant,
} from './titleNormalizer.js';

// Step / event fingerprinting
export {
  fingerprintStep,
  fingerprintWorkflowSteps,
  fingerprintSimilarity,
  sequenceFingerSimilarity,
  fingerprintEvent,
  hashEventSequence,
  hashStepSequence,
} from './stepFingerprinter.js';

// Canonical component detection
export { detectComponents } from './componentDetector.js';
export type { ComponentDetectionInput, ComponentDetectionResult } from './componentDetector.js';

// ─── Scoring Engine (Phase 5.2) ───────────────────────────────────────────────

// Scoring configuration
export {
  SCORING_MODEL_VERSION,
  DEFAULT_SCORING_CONFIG,
  resolveConfidenceBand,
  resolveConfidenceBandLabel,
  isGenericTitle,
  buildExplanation,
  setOverlap,
  orderedBigramOverlap,
} from './scoringConfig.js';
export type {
  ScoringConfidenceBand,
  BandThreshold,
  ExactGroupWeights,
  FamilyWeights,
  ComponentReuseWeights,
  AutomationWeights,
  ScoringConfig,
} from './scoringConfig.js';

// Exact group scoring
export { scoreExactGroup } from './exactGroupScorer.js';
export type { ExactGroupScoreResult, ExactGroupDimensionScores } from './exactGroupScorer.js';

// Family scoring + possible match + relationships
export {
  scoreFamilyMembership,
  evaluatePossibleMatch,
  createRelationship,
  generateRunRelationships,
  generateGroupRelationships,
  resetRelationshipCounter,
} from './familyScorer.js';
export type {
  FamilyDecision,
  FamilyScoreResult,
  FamilyDimensionScores,
  PossibleMatchLabel,
  PossibleMatchResult,
} from './familyScorer.js';

// Variant distance analysis
export { computeVariantDistance, buildVariantRecords } from './variantAnalyzer.js';
export type { VariantClassification, VariantDistanceResult } from './variantAnalyzer.js';

// Component reuse scoring
export { scoreComponentReuse } from './componentReuseScorer.js';
export type { ComponentReuseDecision, ComponentReuseResult, ComponentReuseDimensionScores } from './componentReuseScorer.js';

// Automation opportunity scoring
export { scoreAutomationOpportunity, deriveAutomationFactors } from './automationScorer.js';
export type { AutomationFactors, AutomationScoreResult } from './automationScorer.js';
