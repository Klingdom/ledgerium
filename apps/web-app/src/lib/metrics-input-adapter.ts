/**
 * Metrics Input Adapter — Ledgerium AI Dashboard V2
 *
 * Extracted from apps/web-app/src/app/api/workflows/route.ts (iter-029).
 *
 * Converts a Prisma-shaped workflow row + its relations into the pure
 * WorkflowMetricsInput shape expected by the metrics engine.
 *
 * Kept outside the metrics module intentionally: the metrics module must stay
 * I/O-free and unaware of Prisma types. Parsing/normalisation is a
 * route-layer concern.
 *
 * iter-049 / WDC-R03 extension: also parses ProcessDefinition.intelligenceJson
 * (a JSON-stringified PortfolioIntelligence from @ledgerium/intelligence-engine,
 * populated by apps/web-app/src/lib/intelligence.ts) into a typed slice of
 * Layer 3 inputs. The slice is currently UNCONSUMED by computeWorkflowMetrics —
 * this is a contract-prep iteration. Future Path D iterations will wire the
 * Layer 3 fields onto the dashboard without further adapter changes.
 *
 * Failure modes (all return intelligence = null, never throw):
 *   - intelligenceJson is null              → null
 *   - intelligenceJson is the empty string  → null
 *   - intelligenceJson is malformed JSON    → null
 *   - parsed JSON fails Zod validation      → null (extra fields tolerated)
 *
 * Zod schema is co-located here intentionally: it is an adapter-internal
 * concern. No other module should consume the parsed shape directly — they
 * should consume the typed `WorkflowMetricsInput.intelligence` field.
 */

import { z } from 'zod';

import type { WorkflowMetricsInput } from './workflow-metrics';

// ── Zod schema for the parsed intelligenceJson slice ──────────────────────────
//
// We only validate the fields we consume. `.passthrough()` (default in Zod 3) +
// `.optional()` on every field tolerates the extended PortfolioIntelligence
// shape produced by intelligence.ts (which adds standardization / outlierRuns /
// recommendedPath / sopAlignment / documentationDrift / recommendations /
// automationROI keys alongside the engine output).
//
// Field paths trace 1:1 to packages/intelligence-engine/src/types.ts:
//   - variance.sequenceStability        ← VarianceReport
//   - variance.stepCountVariance.stdDev ← VarianceReport.stepCountVariance
//   - variants.standardPath.frequency   ← VariantSet.standardPath (nullable)
//   - variants.variantCount             ← VariantSet
const IntelligenceJsonSchema = z.object({
  variance: z
    .object({
      sequenceStability: z.number().nullable().optional(),
      stepCountVariance: z
        .object({
          stdDev: z.number().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
  variants: z
    .object({
      variantCount: z.number().nullable().optional(),
      standardPath: z
        .object({
          frequency: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
});

type ParsedIntelligence = NonNullable<WorkflowMetricsInput['intelligence']>;

/**
 * Parse a stringified PortfolioIntelligence blob into the Layer 3 slice
 * consumed by WorkflowMetricsInput. Any failure path returns null — this
 * function never throws, by contract.
 *
 * Exported for direct unit testing (matches `applyFilters` precedent
 * iter-037, `filterByTimeRange` precedent iter-045 — pure deterministic
 * adapter helpers are tested at the function boundary, not via render
 * mounting).
 */
export function parseIntelligenceJson(raw: string | null): ParsedIntelligence | null {
  if (raw === null || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = IntelligenceJsonSchema.safeParse(parsed);
  if (!result.success) return null;

  const data = result.data;
  return {
    sequenceStability: data.variance?.sequenceStability ?? null,
    stepCountVarianceStdDev: data.variance?.stepCountVariance?.stdDev ?? null,
    standardPathFrequency: data.variants?.standardPath?.frequency ?? null,
    variantCount: data.variants?.variantCount ?? null,
  };
}

export function toMetricsInput(
  w: {
    id: string;
    confidence: number | null;
    stepCount: number | null;
    durationMs: number | null;
    phaseCount: number | null;
    toolsUsed: string | null;
    createdAt: Date;
    lastViewedAt: Date | null;
    processDefinition: {
      runCount: number;
      variantCount: number;
      avgDurationMs: number | null;
      medianDurationMs: number | null;
      stabilityScore: number | null;
      confidenceScore: number | null;
      intelligenceJson: string | null;
    } | null;
  },
  processInsights: Array<{
    insightType: string;
    severity: string;
    title: string;
    observedValue: string | null;
  }>,
): WorkflowMetricsInput {
  const parsedTools: string[] = w.toolsUsed ? (() => {
    try {
      const parsed = JSON.parse(w.toolsUsed!);
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
      return [];
    }
  })() : [];

  return {
    id: w.id,
    confidence: w.confidence,
    stepCount: w.stepCount,
    durationMs: w.durationMs,
    phaseCount: w.phaseCount,
    toolsUsed: parsedTools,
    createdAt: w.createdAt,
    lastViewedAt: w.lastViewedAt,
    processDefinition: w.processDefinition ? {
      runCount: w.processDefinition.runCount,
      variantCount: w.processDefinition.variantCount,
      avgDurationMs: w.processDefinition.avgDurationMs,
      medianDurationMs: w.processDefinition.medianDurationMs,
      stabilityScore: w.processDefinition.stabilityScore,
      confidenceScore: w.processDefinition.confidenceScore,
    } : null,
    processInsights,
    intelligence: parseIntelligenceJson(w.processDefinition?.intelligenceJson ?? null),
  };
}
