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
 * Mechanical extract-and-reexport: zero behavior change from the original
 * inline function. Qualifies for D-4 exception (preserves existing contract
 * byte-identically).
 */

import type { WorkflowMetricsInput } from './workflow-metrics';

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
  };
}
