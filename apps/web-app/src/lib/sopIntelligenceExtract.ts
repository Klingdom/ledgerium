/**
 * extractSopIntelligence — pure, defensive parser for the additive SOP
 * conformance API field.
 *
 * Lives in `lib/` (NOT the route module) so it can be exported + unit-tested
 * directly: Next.js route files may only export route handlers, and the additive
 * `sopIntelligence` field needs a regression lock around its null / legacy /
 * malformed degradation (QA_SOP_P0_REVIEW P1-B).
 *
 * Render-only consumers gate on totalRunCount >= 2.
 */

export interface ExtractedSopIntelligence {
  sopAlignment: unknown;
  documentationDrift: unknown;
  /** Honest cohort run count (the conformance denominator). */
  runCount: number;
}

/**
 * Extract the SOP-relevant alignment + drift slice from the persisted
 * PortfolioIntelligence JSON. Returns null on absent or malformed input;
 * never throws.
 */
export function extractSopIntelligence(
  processDefinition: { intelligenceJson?: string | null; runCount?: number } | null | undefined,
): ExtractedSopIntelligence | null {
  if (!processDefinition?.intelligenceJson) return null;
  try {
    const parsed = JSON.parse(processDefinition.intelligenceJson) as {
      sopAlignment?: unknown;
      documentationDrift?: unknown;
      runCount?: number;
    };
    const sopAlignment = parsed.sopAlignment ?? null;
    const documentationDrift = parsed.documentationDrift ?? null;
    // Nothing useful to surface — keep the payload small.
    if (!sopAlignment && !documentationDrift) return null;
    return {
      sopAlignment,
      documentationDrift,
      runCount: processDefinition.runCount ?? (typeof parsed.runCount === 'number' ? parsed.runCount : 0),
    };
  } catch {
    return null;
  }
}
