/**
 * Health Score Distribution Comparison Script — Ledgerium AI
 * Iteration: 029 | Mode 1 | top-score | DV2-R01
 *
 * Computes v1 and v2 health scores for every workflow in the local dev database,
 * emits distribution statistics, and writes a markdown artifact at:
 *   docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md
 *
 * Usage:
 *   pnpm --filter web-app health-score:compare
 *
 * DATABASE_URL env var controls which database is used. If not set, defaults to
 * the local SQLite dev database at prisma/test.db.
 *
 * Exits 0 on success, 1 on failure.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { computeHealthScore } from '../src/lib/health-scores';
import { computeHealthScoreV2 } from '../src/lib/workflow-metrics';
import { toMetricsInput } from '../src/lib/metrics-input-adapter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScorePair {
  workflowId: string;
  v1Overall: number;
  v2Overall: number;
  v2IsGated: boolean;
}

interface DistributionStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  p95: number;
  stddev: number;
}

interface BandCounts {
  red: number;   // < 60
  amber: number; // 60–79
  green: number; // >= 80
}

interface DeltaStats {
  count: number;
  mean: number;
  median: number;
  p5: number;
  p95: number;
  min: number;
  max: number;
  countAbsDelta20: number;
  countAbsDelta10: number;
  countAbsDelta5: number;
}

// ── Statistical helpers ───────────────────────────────────────────────────────

function sortedNums(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower]!;
  const frac = idx - lower;
  return sortedValues[lower]! + frac * (sortedValues[upper]! - sortedValues[lower]!);
}

function computeStats(values: number[]): DistributionStats {
  const n = values.length;
  if (n === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, p25: 0, p75: 0, p95: 0, stddev: 0 };
  }
  const s = sortedNums(values);
  const sum = s.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance = s.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  return {
    count: n,
    min: s[0]!,
    max: s[n - 1]!,
    mean,
    median: percentile(s, 50),
    p25: percentile(s, 25),
    p75: percentile(s, 75),
    p95: percentile(s, 95),
    stddev: Math.sqrt(variance),
  };
}

function computeBandCounts(values: number[]): BandCounts {
  let red = 0, amber = 0, green = 0;
  for (const v of values) {
    if (v < 60) red++;
    else if (v < 80) amber++;
    else green++;
  }
  return { red, amber, green };
}

function bandLabel(score: number): 'red' | 'amber' | 'green' {
  if (score < 60) return 'red';
  if (score < 80) return 'amber';
  return 'green';
}

function computeDeltaStats(pairs: ScorePair[]): DeltaStats {
  if (pairs.length === 0) {
    return {
      count: 0, mean: 0, median: 0, p5: 0, p95: 0, min: 0, max: 0,
      countAbsDelta20: 0, countAbsDelta10: 0, countAbsDelta5: 0,
    };
  }
  const deltas = pairs.map(p => p.v2Overall - p.v1Overall);
  const s = sortedNums(deltas);
  const sum = s.reduce((a, b) => a + b, 0);
  const mean = sum / s.length;
  return {
    count: s.length,
    mean,
    median: percentile(s, 50),
    p5: percentile(s, 5),
    p95: percentile(s, 95),
    min: s[0]!,
    max: s[s.length - 1]!,
    countAbsDelta20: deltas.filter(d => Math.abs(d) >= 20).length,
    countAbsDelta10: deltas.filter(d => Math.abs(d) >= 10).length,
    countAbsDelta5: deltas.filter(d => Math.abs(d) < 5).length,
  };
}

/**
 * Spearman rank correlation.
 * Returns null if n < 5 (insufficient data for meaningful correlation).
 * Handles ties via mid-rank averaging.
 * Formula: ρ = 1 - (6·Σd²) / (n·(n²-1))
 */
function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5) return null;

  function assignRanks(values: number[]): number[] {
    const indexed = values.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && indexed[j + 1]!.v === indexed[j]!.v) j++;
      const midRank = (i + 1 + j + 1) / 2;
      for (let k = i; k <= j; k++) {
        ranks[indexed[k]!.i] = midRank;
      }
      i = j + 1;
    }
    return ranks;
  }

  const rxs = assignRanks(xs);
  const rys = assignRanks(ys);

  // Degenerate: all values identical on one axis → rank correlation undefined
  if (rxs.every(r => r === rxs[0]) || rys.every(r => r === rys[0])) return null;

  let d2sum = 0;
  for (let i = 0; i < n; i++) {
    const d = rxs[i]! - rys[i]!;
    d2sum += d * d;
  }

  return 1 - (6 * d2sum) / (n * (n * n - 1));
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function r2(n: number): string {
  return n.toFixed(2);
}

function pct(count: number, total: number): string {
  if (total === 0) return '0.00%';
  return ((count / total) * 100).toFixed(2) + '%';
}

function statsTable(label: string, stats: DistributionStats): string {
  return [
    `### ${label}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Count | ${stats.count} |`,
    `| Min | ${r2(stats.min)} |`,
    `| Max | ${r2(stats.max)} |`,
    `| Mean | ${r2(stats.mean)} |`,
    `| Median | ${r2(stats.median)} |`,
    `| P25 | ${r2(stats.p25)} |`,
    `| P75 | ${r2(stats.p75)} |`,
    `| P95 | ${r2(stats.p95)} |`,
    `| Std Dev | ${r2(stats.stddev)} |`,
    '',
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[info] Starting health score distribution comparison (iter-029, DV2-R01)');

  // Resolve database URL — default to local test.db
  const defaultDbPath = path.resolve(__dirname, '../prisma/test.db');
  const databaseUrl = process.env['DATABASE_URL'] ?? `file:${defaultDbPath}`;

  if (!process.env['DATABASE_URL']) {
    console.log(`[info] DATABASE_URL not set — defaulting to file:${defaultDbPath}`);
  }

  // Instantiate a dedicated PrismaClient for this script with the resolved URL.
  // This bypasses the Next.js global singleton and avoids the import-hoisting
  // timing problem with process.env assignment.
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    // ── Query workflows ────────────────────────────────────────────────────

    console.log('[info] Querying workflows...');
    const workflows = await prisma.workflow.findMany({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        confidence: true,
        stepCount: true,
        durationMs: true,
        phaseCount: true,
        toolsUsed: true,
        createdAt: true,
        lastViewedAt: true,
        processDefinition: {
          select: {
            runCount: true,
            variantCount: true,
            avgDurationMs: true,
            medianDurationMs: true,
            stabilityScore: true,
            confidenceScore: true,
            // iter-049 / WDC-R03: required by toMetricsInput adapter to
            // populate WorkflowMetricsInput.intelligence (Layer 3 slice).
            // Unconsumed by computeHealthScoreV2 in this script — passthrough
            // only — but required for the adapter call to typecheck.
            intelligenceJson: true,
          },
        },
      },
    });

    console.log(`[info] Found ${workflows.length} active workflow(s).`);

    // ── Query per-workflow insights ────────────────────────────────────────

    const allInsights = await prisma.processInsight.findMany({
      where: { dismissed: false },
      select: {
        workflowId: true,
        insightType: true,
        severity: true,
        title: true,
        observedValue: true,
      },
    });

    const insightsByWorkflowId = new Map<string, Array<{
      insightType: string;
      severity: string;
      title: string;
      observedValue: string | null;
    }>>();
    for (const insight of allInsights) {
      if (!insight.workflowId) continue;
      const existing = insightsByWorkflowId.get(insight.workflowId) ?? [];
      existing.push({
        insightType: insight.insightType,
        severity: insight.severity,
        title: insight.title,
        observedValue: insight.observedValue ?? null,
      });
      insightsByWorkflowId.set(insight.workflowId, existing);
    }

    // ── Compute scores ─────────────────────────────────────────────────────

    const pairs: ScorePair[] = [];

    for (const w of workflows) {
      // V1 health score
      const v1 = computeHealthScore({
        stepCount: w.stepCount,
        confidence: w.confidence,
        durationMs: w.durationMs,
        phaseCount: w.phaseCount,
      });

      // V2 health score — via the same adapter used by the /api/workflows route
      const processInsights = insightsByWorkflowId.get(w.id) ?? [];
      const metricsInput = toMetricsInput(w, processInsights);
      const v2 = computeHealthScoreV2(metricsInput);

      pairs.push({
        workflowId: w.id,
        v1Overall: v1.overall,
        v2Overall: v2.overall,
        v2IsGated: v2.isGated,
      });
    }

    const n = pairs.length;
    const gatedCount = pairs.filter(p => p.v2IsGated).length;

    // ── Statistical computations ───────────────────────────────────────────

    const v1Scores = pairs.map(p => p.v1Overall);
    const v2Scores = pairs.map(p => p.v2Overall);

    const v1Stats = computeStats(v1Scores);
    const v2Stats = computeStats(v2Scores);
    const v1Bands = computeBandCounts(v1Scores);
    const v2Bands = computeBandCounts(v2Scores);
    const deltaStats = computeDeltaStats(pairs);
    const rho = spearman(v1Scores, v2Scores);

    // Band transition matrix: rows = v1 band, cols = v2 band
    const transitionMatrix: Record<string, Record<string, number>> = {
      red: { red: 0, amber: 0, green: 0 },
      amber: { red: 0, amber: 0, green: 0 },
      green: { red: 0, amber: 0, green: 0 },
    };
    for (const p of pairs) {
      const v1Band = bandLabel(p.v1Overall);
      const v2Band = bandLabel(p.v2Overall);
      transitionMatrix[v1Band]![v2Band]!++;
    }

    // Band-crossing count (off-diagonal transitions)
    const crossedBand = pairs.filter(
      p => bandLabel(p.v1Overall) !== bandLabel(p.v2Overall),
    ).length;

    // ── Interpretation helpers ─────────────────────────────────────────────

    const insufficientData = n < 3;
    const lowSampleWarning = n < 10
      ? `\n> **WARNING: Sample size is N=${n}, which is below the recommended minimum of 10 for reliable distribution analysis. Statistics are computed but should not be used as sole retirement justification. Complete DV2-R05 (seed fixture + free-tier test user) before closing #42.**\n`
      : '';

    const correlationText = rho === null
      ? `Not computed — N=${n} is below the minimum of 5 required for Spearman correlation.`
      : `ρ = ${r2(rho)} — ${Math.abs(rho) >= 0.7 ? 'strong' : Math.abs(rho) >= 0.4 ? 'moderate' : 'weak'} monotonic agreement between v1 and v2 overall scores.`;

    const crossedPct = n > 0 ? ((crossedBand / n) * 100).toFixed(1) : '0.0';

    const retirementRecommendation = (() => {
      if (insufficientData) {
        return `**Blocked — insufficient data (N=${n}).** A meaningful retirement decision requires at least N=3 workflows. Complete DV2-R05 (seed fixture + free-tier test user) to produce a valid baseline before closing #42.`;
      }
      if (n < 10) {
        return `**Conditional — low sample size (N=${n}).** ${crossedBand} workflow(s) (${crossedPct}%) crossed a band boundary. ${rho !== null ? `Correlation ρ=${r2(rho)}.` : 'Correlation not computed (N < 5).'} Complete DV2-R05 to increase N before closing #42.`;
      }
      const strong = rho !== null && Math.abs(rho) >= 0.7;
      const lowCross = crossedBand / n < 0.15;
      if (strong && lowCross) {
        return `**Supported** — v2 is highly correlated with v1 (ρ=${rho !== null ? r2(rho) : 'n/a'}) and only ${crossedPct}% of workflows cross a band boundary. v1 retirement is justified on evidence. Close #42 after the 14-day soak window completes and DV2-R02/R03 + #51 are delivered.`;
      }
      return `**Requires review** — ${crossedPct}% of workflows (N=${crossedBand}) cross a band boundary. ${rho !== null ? `Correlation ρ=${r2(rho)}.` : ''} Investigate high-delta workflows before confirming v1 retirement.`;
    })();

    // ── Executive summary bullets ──────────────────────────────────────────

    const execBullets = [
      `- **Sample size:** N=${n} active workflow(s) from local dev DB snapshot${n < 10 ? ' _(low sample — see warning below)_' : ''}.`,
      `- **V1 mean / median overall:** ${r2(v1Stats.mean)} / ${r2(v1Stats.median)}`,
      `- **V2 mean / median overall:** ${r2(v2Stats.mean)} / ${r2(v2Stats.median)}`,
      `- **Band boundary crossings:** ${crossedBand}/${n} workflows (${crossedPct}%) changed band (red / amber / green) between v1 and v2.`,
      `- **Rank correlation:** ${correlationText}`,
      `- **Retirement signal:** ${retirementRecommendation}`,
    ].join('\n');

    // ── Build markdown artifact ────────────────────────────────────────────

    const md = `# Health Score Distribution Comparison — v1 vs v2

**Date:** 2026-04-22
**Iteration:** 029
**Selection:** Mode 1, \`top-score\`
**Audit ref:** [DV2-R01](../meta/DASHBOARD_V2_REVIEW_001.md) in \`docs/meta/DASHBOARD_V2_REVIEW_001.md\` line 46
**PRD link:** PRD_DASHBOARD_V2.md D2 (parallel-run + v1 retirement commitment)
**Generated by:** \`apps/web-app/scripts/health-score-distribution.ts\`
**Sample size:** ${n} workflow(s) (from local dev DB snapshot)

---

## Executive Summary
${lowSampleWarning}
${execBullets}

---

## Methodology

Workflows were queried from the local dev database (SQLite, \`prisma/test.db\`) filtered to
\`status = 'active'\` and sorted by \`id\` for deterministic ordering across runs.

**V1 health score** is computed by \`computeHealthScore\` from \`src/lib/health-scores.ts\`:
four equally-weighted dimensions (completeness / confidence / duration / complexity),
each 0–25, total 0–100.

**V2 health score** is computed by \`computeHealthScoreV2\` from \`src/lib/workflow-metrics.ts\`,
via the \`toMetricsInput\` adapter from \`src/lib/metrics-input-adapter.ts\`. Four weighted
dimensions (speed 0–30, consistency 0–30, dataQuality 0–20, standardization 0–20), total 0–100.

**Band thresholds** (v2 canonical, PRD §7): \`< 60\` = red (needs attention),
\`60–79\` = amber (watch), \`≥ 80\` = green (healthy). Applied to both v1 and v2 scores.

**Per-workflow insights** (bottleneck / delay signals) are fetched and passed to the v2
adapter, mirroring the \`/api/workflows\` route query shape exactly.

**Spearman rank correlation** uses the formula \`ρ = 1 - (6·Σd²) / (n·(n²-1))\` with
mid-rank tie-breaking. Not computed for N < 5.

**Limitation:** The dev database is pre-populated with seed/test data. ${n < 10 ? `**Current N=${n} is below the recommended minimum of 10.** ` : ''}A production-scale comparison requires DV2-R05 (seed fixture + free-tier test user).

---

## Distribution Statistics

${statsTable('V1 Overall Score (0–100)', v1Stats)}
${statsTable('V2 Overall Score (0–100)', v2Stats)}

---

## Band Distribution

Bands: **Red** = overall < 60, **Amber** = 60–79, **Green** = ≥ 80.

| Band | V1 Count | V1 % | V2 Count | V2 % |
|------|----------|------|----------|------|
| Red (< 60) | ${v1Bands.red} | ${pct(v1Bands.red, n)} | ${v2Bands.red} | ${pct(v2Bands.red, n)} |
| Amber (60–79) | ${v1Bands.amber} | ${pct(v1Bands.amber, n)} | ${v2Bands.amber} | ${pct(v2Bands.amber, n)} |
| Green (≥ 80) | ${v1Bands.green} | ${pct(v1Bands.green, n)} | ${v2Bands.green} | ${pct(v2Bands.green, n)} |
| **Total** | **${n}** | **100.00%** | **${n}** | **100.00%** |

---

## Band Transition Matrix

Rows = V1 band, Columns = V2 band. Cell values = workflow count.
Diagonal = agreement; off-diagonal = reclassification.

| V1 \\ V2 | Red (v2) | Amber (v2) | Green (v2) |
|-----------|----------|------------|------------|
| **Red (v1)** | ${transitionMatrix['red']!['red']} | ${transitionMatrix['red']!['amber']} | ${transitionMatrix['red']!['green']} |
| **Amber (v1)** | ${transitionMatrix['amber']!['red']} | ${transitionMatrix['amber']!['amber']} | ${transitionMatrix['amber']!['green']} |
| **Green (v1)** | ${transitionMatrix['green']!['red']} | ${transitionMatrix['green']!['amber']} | ${transitionMatrix['green']!['green']} |

**Total reclassified: ${crossedBand}/${n} (${crossedPct}%)**

---

## Delta Distribution

Delta = \`v2.overall − v1.overall\`. Positive = v2 scores higher; negative = v1 scores higher.

| Metric | Value |
|--------|-------|
| Count | ${deltaStats.count} |
| Mean delta | ${r2(deltaStats.mean)} |
| Median delta | ${r2(deltaStats.median)} |
| P5 | ${r2(deltaStats.p5)} |
| P95 | ${r2(deltaStats.p95)} |
| Min delta | ${r2(deltaStats.min)} |
| Max delta | ${r2(deltaStats.max)} |

**Delta magnitude buckets:**

| Bucket | Count | % of total |
|--------|-------|------------|
| \\|delta\\| ≥ 20 (major reclassification) | ${deltaStats.countAbsDelta20} | ${pct(deltaStats.countAbsDelta20, n)} |
| \\|delta\\| ≥ 10 (material difference) | ${deltaStats.countAbsDelta10} | ${pct(deltaStats.countAbsDelta10, n)} |
| \\|delta\\| < 5 (near-identical) | ${deltaStats.countAbsDelta5} | ${pct(deltaStats.countAbsDelta5, n)} |

**Interpretation:** Mean delta of ${r2(deltaStats.mean)} indicates v2 scores
${deltaStats.mean > 0.5 ? 'higher' : deltaStats.mean < -0.5 ? 'lower' : 'approximately equally'} on average relative to v1.
${deltaStats.countAbsDelta20 > 0 ? `${deltaStats.countAbsDelta20} workflow(s) have a major delta (|Δ| ≥ 20) — these warrant manual inspection before v1 retirement.` : 'No workflows have a major delta (|Δ| ≥ 20).'}

---

## Rank Correlation

${rho === null
  ? `**Spearman ρ: not computed** — N=${n} is below the minimum of 5 required for meaningful rank correlation. Re-run this script after completing DV2-R05 (seed fixture) to obtain a valid correlation.`
  : `**Spearman ρ = ${r2(rho)}** — ${Math.abs(rho) >= 0.7 ? 'Strong' : Math.abs(rho) >= 0.4 ? 'Moderate' : 'Weak'} monotonic agreement between v1 and v2 overall scores. ${Math.abs(rho) >= 0.7 ? 'High correlation supports v1 retirement — both metrics rank workflows similarly.' : Math.abs(rho) >= 0.4 ? 'Moderate correlation: the metrics broadly agree on ranking but differ in absolute values.' : 'Low correlation: the metrics disagree on workflow ranking. Investigate before v1 retirement.'}`
}

---

## Gating Note

**${gatedCount}** workflow(s) have \`v2.isGated = true\` in the raw v2 output.

Note: \`computeHealthScoreV2\` always returns \`isGated: false\` by design — the flag is applied
post-computation by the route handler per user plan. In this standalone script no plan context
is applied, so all scores have \`isGated: false\`. The numeric scores in both v1 and v2 are
unaffected by the gating flag.

---

## Recommendation for #42

${retirementRecommendation}

**Prerequisites for #42 closure (all must be met):**
1. **DV2-R05** — seed fixture + free-tier test user (unblocks meaningful N for this comparison; currently N=${n})
2. **DV2-R02 + DV2-R03** — WorkflowRow interaction hardening (a11y/UX gate, iter 031)
3. **#51** — v2 analytics instrumentation (PRD §4 measurable-outcome dependency, iter 030)
4. **14-day soak window** post-iter-022 GA (started 2026-04-20; closes ~2026-05-04)
5. **Re-run this script** after DV2-R05 to confirm distribution findings at representative N

---

_Generated by \`apps/web-app/scripts/health-score-distribution.ts\` at iteration 029._
_Audit ref: DV2-R01 in \`docs/meta/DASHBOARD_V2_REVIEW_001.md\`._
`;

    // ── Write artifact ─────────────────────────────────────────────────────

    const outputDir = path.resolve(__dirname, '../../../docs/analysis');
    const outputPath = path.join(outputDir, 'HEALTH_SCORE_DISTRIBUTION_COMPARISON.md');

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`[info] Artifact written to: ${outputPath}`);

    // ── Summary to stdout ──────────────────────────────────────────────────

    console.log('\n[summary] === Health Score Distribution Comparison ===');
    console.log(`  N workflows:       ${n}`);
    console.log(`  V1 mean/median:    ${r2(v1Stats.mean)} / ${r2(v1Stats.median)}`);
    console.log(`  V2 mean/median:    ${r2(v2Stats.mean)} / ${r2(v2Stats.median)}`);
    console.log(`  Band crossings:    ${crossedBand}/${n} (${crossedPct}%)`);
    console.log(`  Spearman ρ:        ${rho !== null ? r2(rho) : `N/A (N=${n} < 5)`}`);
    console.log(`  Gated (v2):        ${gatedCount}`);
    if (n < 10) {
      console.log(`\n  [WARNING] N=${n} is below the recommended minimum of 10.`);
      console.log('  Complete DV2-R05 (seed fixture) before using this as retirement evidence.');
    }
    console.log('\n[info] Done. Exit 0.');

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[error] Script failed:', err);
  process.exit(1);
});
