/**
 * Pure adapter: turn variant path-signatures into the Report's diverge→reconverge
 * view (Process Variation Phase 2). Branch structure comes from the deterministic
 * LCS-backbone engine; percentages are run-weighted from each variant's runCount,
 * and every branch traces back to its source variants.
 *
 * No DB / no React — pure + deterministic (no Date/random) → hydration-safe and
 * unit-testable. Returns null when there is no standard path or no real branching.
 */
import { analyzeDivergence, type DivergenceRun } from '@ledgerium/intelligence-engine';

export interface DivergenceVariantInput {
  variantId: string;
  isStandardPath?: boolean;
  pathSignature?: { signature?: string };
  runCount?: number;
}

export interface DivergenceBranchView {
  key: string;
  afterLabel: string;
  rejoinLabel: string;
  altSteps: string[];
  skippedBackbone: string[];
  runShare: number;
  runCount: number;
  dfgConfirmed: boolean;
}

export interface DivergenceView {
  backbone: string[];
  conformingPct: number;
  branches: DivergenceBranchView[];
}

export function deriveDivergence(
  variantList: DivergenceVariantInput[],
  totalRuns: number,
): DivergenceView | null {
  const withSig = variantList.filter((v) => (v.pathSignature?.signature ?? '').length > 0);
  if (withSig.length < 2) return null;

  const standard = withSig.find((v) => v.isStandardPath);
  if (!standard) return null;
  const backbone = (standard.pathSignature?.signature ?? '').split(':').filter(Boolean);
  if (backbone.length === 0) return null;

  const runs: DivergenceRun[] = withSig.map((v) => ({
    id: v.variantId,
    steps: (v.pathSignature?.signature ?? '').split(':').filter(Boolean),
  }));
  const analysis = analyzeDivergence(backbone, runs);
  if (analysis.branches.length === 0) return null;

  const runCountByVariant = new Map(withSig.map((v) => [v.variantId, v.runCount ?? 0]));
  const denom = totalRuns > 0 ? totalRuns : withSig.reduce((s, v) => s + (v.runCount ?? 0), 0) || 1;

  const divergingIds = new Set<string>();
  for (const b of analysis.branches) for (const id of b.evidenceRunIds) divergingIds.add(id);
  const conformingRuns = withSig
    .filter((v) => !divergingIds.has(v.variantId))
    .reduce((s, v) => s + (v.runCount ?? 0), 0);

  const branches: DivergenceBranchView[] = analysis.branches.map((b) => {
    const weighted = b.evidenceRunIds.reduce((s, id) => s + (runCountByVariant.get(id) ?? 0), 0);
    return {
      key: `${b.divergeAfterIndex}|${b.reconvergeAtIndex}|${b.altSteps.join('>')}|${b.skippedBackbone.join('>')}`,
      afterLabel: b.divergeAfterIndex >= 0 ? (backbone[b.divergeAfterIndex] ?? 'start') : 'start',
      rejoinLabel: b.reconvergeAtIndex < backbone.length ? (backbone[b.reconvergeAtIndex] ?? 'end') : 'end',
      altSteps: b.altSteps,
      skippedBackbone: b.skippedBackbone,
      runShare: denom > 0 ? weighted / denom : 0,
      runCount: weighted,
      dfgConfirmed: b.dfgConfirmedSplit || b.dfgConfirmedJoin,
    };
  });

  return { backbone, conformingPct: denom > 0 ? conformingRuns / denom : 0, branches };
}
