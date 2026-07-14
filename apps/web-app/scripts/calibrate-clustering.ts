/**
 * Clustering-Threshold Calibration Script — Ledgerium AI
 * Cross-Workflow Intelligence Program — Phase 0
 *
 * Loads active workflows + their `process_output` artifacts from the DB,
 * derives each workflow's deterministic path signature via the EXACT same
 * `computePathSignature()` helper `workflowGrouping.ts` / `intelligence.ts`
 * already use for auto-clustering, runs `calibrateThreshold()` against the
 * resulting pairwise `traceSimilarity` distribution, and prints a JSON report
 * plus a human-readable summary.
 *
 * Read-only: this script does not write to the database or the filesystem.
 * It never wires `LEDGERIUM_SIMILARITY_CLUSTERING` or mutates any workflow —
 * it is a pure analysis/reporting tool for picking a defensible
 * `clusterSignatures({ threshold })` production value from real data.
 *
 * Scope: `clusterSignatures` is only ever invoked scoped to a single user's
 * workflows in production (`clusterWorkflows(userId)` in `intelligence.ts`).
 * This script mirrors that scope — workflows are grouped by `userId` and a
 * separate calibration report is computed PER USER (cross-user pairs are
 * never compared, since they would never be compared in production either).
 * An aggregate summary across all per-user reports is printed for
 * convenience, plus one optional GLOBAL cross-user pool report (clearly
 * labeled as reference-only, not a production recommendation) so a single
 * developer with a lot of personal test data isn't left with zero signal.
 *
 * Usage:
 *   pnpm --filter web-app calibrate:clustering
 *   CALIBRATION_USER_ID=<userId> pnpm --filter web-app calibrate:clustering
 *
 * DATABASE_URL env var controls which database is used. If not set, defaults
 * to the local SQLite dev database at prisma/test.db (same convention as
 * scripts/health-score-distribution.ts).
 *
 * Exits 0 on success, 1 on failure.
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  computePathSignature,
  calibrateThreshold,
  DEFAULT_CLUSTER_THRESHOLD,
  type CalibrationMember,
  type CalibrationReport,
} from '@ledgerium/intelligence-engine';
import type { ProcessRun, ProcessDefinition as EngineProcessDefinition, SOP } from '@ledgerium/process-engine';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProcessOutput = { processRun: ProcessRun; processDefinition: EngineProcessDefinition; sop?: SOP };

interface WorkflowRow {
  id: string;
  userId: string;
  processOutput: ProcessOutput | null;
}

interface PerUserReport {
  userId: string;
  workflowCount: number;
  skippedCount: number;
  report: CalibrationReport;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function r4(n: number | null): string {
  return n === null ? 'n/a' : n.toFixed(4);
}

function printSummary(label: string, report: CalibrationReport): void {
  console.log(`\n--- ${label} ---`);
  console.log(`  members:            ${report.memberCount}`);
  console.log(`  pairs:              ${report.distribution.pairCount}`);
  console.log(
    `  similarity min/mean/median/max: ${r4(report.distribution.min)} / ${r4(report.distribution.mean)} / ${r4(report.distribution.median)} / ${r4(report.distribution.max)}`,
  );
  console.log('  histogram (10 buckets over [0,1]):');
  for (const b of report.distribution.histogram) {
    const bar = '#'.repeat(Math.min(50, b.count));
    console.log(`    [${b.rangeStart.toFixed(2)}, ${b.rangeEnd.toFixed(2)}${b.rangeEnd === 1 ? ']' : ')'} ${String(b.count).padStart(4)} ${bar}`);
  }
  console.log('  threshold sweep:');
  console.log('    threshold | clusterCount | largestCluster | singletons | mergedPairs');
  for (const p of report.sweep) {
    console.log(
      `    ${p.threshold.toFixed(2).padStart(9)} | ${String(p.clusterCount).padStart(12)} | ${String(p.largestClusterSize).padStart(15)} | ${String(p.singletonCount).padStart(10)} | ${String(p.mergedPairCount).padStart(11)}`,
    );
  }
  console.log(`  recommended threshold: ${report.recommendedThreshold ?? 'n/a'}`);
  if (report.plateauRange) {
    console.log(`  plateau range:          [${report.plateauRange.start}, ${report.plateauRange.end}] (${report.plateauRange.length} points, clusterCount=${report.plateauRange.clusterCount})`);
  }
  console.log(`  reason: ${report.reason}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[info] Starting clustering-threshold calibration (Cross-Workflow Intelligence, Phase 0)');

  const defaultDbPath = path.resolve(__dirname, '../prisma/test.db');
  const databaseUrl = process.env['DATABASE_URL'] ?? `file:${defaultDbPath}`;
  if (!process.env['DATABASE_URL']) {
    console.log(`[info] DATABASE_URL not set — defaulting to file:${defaultDbPath}`);
  }

  const scopedUserId = process.env['CALIBRATION_USER_ID'];
  if (scopedUserId) {
    console.log(`[info] CALIBRATION_USER_ID set — scoping to user ${scopedUserId} only`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    console.log('[info] Querying workflows + process_output artifacts...');
    const workflows = await prisma.workflow.findMany({
      where: {
        status: 'active',
        ...(scopedUserId ? { userId: scopedUserId } : {}),
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        userId: true,
        artifacts: {
          where: { artifactType: 'process_output' },
          select: { contentJson: true },
        },
      },
    });

    console.log(`[info] Found ${workflows.length} active workflow(s).`);

    // Parse the process_output artifact JSON per workflow. One corrupt
    // artifact must not throw and abort the whole calibration run — skip it
    // (same defensive posture as intelligence.ts getWorkflowsWithOutputs()).
    const rows: WorkflowRow[] = [];
    let parseFailures = 0;
    for (const w of workflows) {
      let processOutput: ProcessOutput | null = null;
      const raw = w.artifacts[0]?.contentJson;
      if (raw) {
        try {
          processOutput = JSON.parse(raw) as ProcessOutput;
        } catch {
          processOutput = null;
          parseFailures++;
        }
      }
      rows.push({ id: w.id, userId: w.userId, processOutput });
    }
    if (parseFailures > 0) {
      console.log(`[warn] ${parseFailures} workflow(s) had unparsable process_output JSON — skipped.`);
    }

    // Derive a deterministic path signature per workflow via the SAME helper
    // used by workflowGrouping.ts / intelligence.ts for live auto-clustering.
    const membersByUser = new Map<string, CalibrationMember[]>();
    let skippedNoOutput = 0;
    for (const row of rows) {
      if (!row.processOutput?.processDefinition?.stepDefinitions) {
        skippedNoOutput++;
        continue;
      }
      let member: CalibrationMember;
      try {
        member = { id: row.id, signature: computePathSignature(row.processOutput) };
      } catch {
        // Same defensive posture as clusterWorkflows() in intelligence.ts.
        skippedNoOutput++;
        continue;
      }
      const bucket = membersByUser.get(row.userId) ?? [];
      bucket.push(member);
      membersByUser.set(row.userId, bucket);
    }

    if (skippedNoOutput > 0) {
      console.log(`[info] ${skippedNoOutput} workflow(s) skipped (missing/invalid process_output — cannot derive a signature).`);
    }

    const userIds = [...membersByUser.keys()].sort();
    console.log(`[info] ${userIds.length} user(s) with at least one signed workflow.`);

    // ── Per-user calibration (mirrors production clusterSignatures() scope) ──

    const perUserReports: PerUserReport[] = [];
    for (const userId of userIds) {
      const members = membersByUser.get(userId) as CalibrationMember[];
      const report = calibrateThreshold(members);
      perUserReports.push({ userId, workflowCount: members.length, skippedCount: 0, report });
    }

    const eligibleUserReports = perUserReports.filter((r) => r.workflowCount >= 2);

    // ── Global cross-user pool (reference only — NOT how production clusters) ─

    const allMembers: CalibrationMember[] = [];
    for (const bucket of membersByUser.values()) allMembers.push(...bucket);
    const globalReport = calibrateThreshold(allMembers);

    // ── Print JSON report ──────────────────────────────────────────────────

    const jsonOutput = {
      generatedAtScriptVersion: 'calibrate-clustering/1.0.0',
      currentProductionDefault: DEFAULT_CLUSTER_THRESHOLD,
      totalWorkflows: workflows.length,
      totalUsers: userIds.length,
      usersWithSufficientData: eligibleUserReports.length,
      perUser: perUserReports.map((r) => ({ userId: r.userId, workflowCount: r.workflowCount, report: r.report })),
      globalCrossUserPool: {
        note: 'Reference only — clusterSignatures() is always scoped to a single user in production. This pool mixes workflows across users and should NOT be used alone to pick the production threshold.',
        workflowCount: allMembers.length,
        report: globalReport,
      },
    };

    console.log('\n[json]');
    console.log(JSON.stringify(jsonOutput, null, 2));

    // ── Readable summary ───────────────────────────────────────────────────

    console.log('\n[summary] === Clustering Threshold Calibration ===');
    console.log(`  Current production default (DEFAULT_CLUSTER_THRESHOLD): ${DEFAULT_CLUSTER_THRESHOLD}`);
    console.log(`  Total active workflows queried: ${workflows.length}`);
    console.log(`  Users with >= 1 signed workflow: ${userIds.length}`);
    console.log(`  Users with >= 2 signed workflows (calibration-eligible): ${eligibleUserReports.length}`);

    if (eligibleUserReports.length === 0) {
      console.log('\n  [WARNING] No user has >= 2 signed workflows. Per-user calibration cannot');
      console.log('  produce a recommendation yet. Falling back to the global cross-user pool');
      console.log('  below FOR REFERENCE ONLY — it does not reflect production clustering scope.');
    }

    for (const r of eligibleUserReports) {
      printSummary(`User ${r.userId} (N=${r.workflowCount})`, r.report);
    }

    printSummary(`GLOBAL cross-user pool (N=${allMembers.length}) — REFERENCE ONLY`, globalReport);

    console.log('\n[info] Done. Exit 0.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[error] Script failed:', err);
  process.exit(1);
});
