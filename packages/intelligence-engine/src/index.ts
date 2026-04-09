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
