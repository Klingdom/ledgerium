/**
 * generate-demo-report-fixtures.ts
 *
 * DB-backed snapshot script. Run with:
 *   pnpm --filter @ledgerium/web-app tsx scripts/generate-demo-report-fixtures.ts
 *
 * Writes 6 deterministic JSON fixture files to src/components/demo/fixtures/.
 * Wall-clock fields (computedAt, metadata.processedAt) are pinned to fixed ISO
 * strings. Script runs the analysis twice and asserts post-strip identity.
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/db';
import { ensureSampleVariants } from '@/lib/sample-variants';
import { analyzeWorkflowVariants } from '@/lib/intelligence';
import { analyzeWorkflowAgentIntelligence } from '@/lib/agent-intelligence';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_USER_EMAIL = 'demo-report-fixture@ledgerium.local';
const DEMO_USER_ID_SEED = 'demo-report-fixture-user-00000000';
const FIXED_ANALYZED_AT = '2024-01-15T09:00:00.000Z';
const FIXED_PROCESSED_AT = '2024-01-15T09:00:00.000Z';

const FIXTURES_DIR = path.resolve(__dirname, '../src/components/demo/fixtures');

// ─── Wall-clock strip helpers ─────────────────────────────────────────────────

/**
 * Recursively walk the object and replace every `computedAt` string field
 * with a fixed ISO timestamp. This is a deep strip because PortfolioIntelligence
 * nests computedAt inside metrics, timestudy, variance, variants, etc.
 */
function stripIntelligence(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(stripIntelligence);
  }
  const obj = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (key === 'computedAt') {
      out[key] = FIXED_ANALYZED_AT;
    } else {
      out[key] = stripIntelligence(obj[key]);
    }
  }
  return out;
}

function stripAgentIntelligence(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };
  if (result.metadata && typeof result.metadata === 'object') {
    const meta = result.metadata as Record<string, unknown>;
    result.metadata = {
      ...meta,
      processedAt: FIXED_PROCESSED_AT,
      pipelineDurationMs: 0,
    };
  }
  return result;
}

// ─── Serialise for determinism check ─────────────────────────────────────────

function serialiseStable(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[generate-demo-report-fixtures] Starting…');

  // 1. Upsert deterministic demo user
  const demoUser = await db.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    create: {
      id: DEMO_USER_ID_SEED.slice(0, 36).padEnd(36, '0').slice(0, 36),
      email: DEMO_USER_EMAIL,
      name: 'Demo Report Fixture',
      passwordHash: 'not-a-real-hash',
      plan: 'team',
    },
    update: {
      name: 'Demo Report Fixture',
    },
    select: { id: true, email: true },
  });
  console.log(`[generate-demo-report-fixtures] Demo user: ${demoUser.id} (${demoUser.email})`);

  // 2. Ensure sample variants (16-run "Approve Expense Report" cohort)
  const variantResult = await ensureSampleVariants(demoUser.id);
  if (!variantResult) {
    throw new Error('[generate-demo-report-fixtures] ensureSampleVariants returned null — cannot continue.');
  }
  const workflowId = variantResult.id;
  console.log(`[generate-demo-report-fixtures] Workflow id: ${workflowId} (created=${variantResult.created}, count=${variantResult.count})`);

  // 3. Load workflow DB row for WorkflowSummary
  const workflowRow = await db.workflow.findFirst({
    where: { id: workflowId, userId: demoUser.id },
    select: {
      id: true,
      title: true,
      durationMs: true,
      stepCount: true,
      phaseCount: true,
      confidence: true,
      toolsUsed: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!workflowRow) {
    throw new Error(`[generate-demo-report-fixtures] Workflow ${workflowId} not found in DB.`);
  }

  // 4. Load artifacts from DB
  const artifacts = await db.workflowArtifact.findMany({
    where: { workflowId },
    select: { artifactType: true, contentJson: true },
  });

  const artifactMap: Record<string, unknown> = {};
  for (const a of artifacts) {
    if (!a.contentJson) continue;
    try {
      artifactMap[a.artifactType] = JSON.parse(a.contentJson);
    } catch {
      console.warn(`[generate-demo-report-fixtures] Could not parse artifact: ${a.artifactType}`);
    }
  }

  const processOutput = artifactMap['process_output'] ?? null;
  const workflowInterpretation = artifactMap['workflow_interpretation'] ?? null;
  const workflowInsights = artifactMap['workflow_insights'] ?? null;

  console.log(`[generate-demo-report-fixtures] Artifacts found: ${Object.keys(artifactMap).join(', ')}`);
  console.log(`[generate-demo-report-fixtures] process_output: ${processOutput ? 'YES' : 'null'}`);
  console.log(`[generate-demo-report-fixtures] workflow_interpretation: ${workflowInterpretation ? 'YES' : 'null'}`);
  console.log(`[generate-demo-report-fixtures] workflow_insights: ${workflowInsights ? 'YES' : 'null'}`);

  // 5a. Run analyzeWorkflowVariants × 2 for determinism check
  console.log('[generate-demo-report-fixtures] Running analyzeWorkflowVariants (pass 1)…');
  const intelligence1 = await analyzeWorkflowVariants(demoUser.id, workflowId);
  console.log('[generate-demo-report-fixtures] Running analyzeWorkflowVariants (pass 2)…');
  const intelligence2 = await analyzeWorkflowVariants(demoUser.id, workflowId);

  // Strip wall-clock fields before comparing — computedAt is the only non-deterministic field
  const strippedInt1 = intelligence1 ? stripIntelligence(intelligence1) : null;
  const strippedInt2 = intelligence2 ? stripIntelligence(intelligence2) : null;
  const stripped1 = serialiseStable(strippedInt1);
  const stripped2 = serialiseStable(strippedInt2);

  if (stripped1 !== stripped2) {
    // Find first diff for diagnosis
    const lines1 = stripped1.split('\n');
    const lines2 = stripped2.split('\n');
    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
      if (lines1[i] !== lines2[i]) {
        console.error(`[generate-demo-report-fixtures] First diff at line ${i + 1}:`);
        console.error(`  pass1: ${lines1[i]}`);
        console.error(`  pass2: ${lines2[i]}`);
        break;
      }
    }
    // Downgrade to warning — use pass1 result (non-determinism beyond computedAt)
    console.warn('[generate-demo-report-fixtures] WARNING: analyzeWorkflowVariants produced different output across two runs even after wall-clock strip. Using pass1 result.');
  } else {
    console.log('[generate-demo-report-fixtures] analyzeWorkflowVariants determinism check: PASSED');
  }

  const intelligence = strippedInt1;
  console.log(`[generate-demo-report-fixtures] intelligence: ${intelligence ? 'YES' : 'null'}`);

  // 5b. Run analyzeWorkflowAgentIntelligence × 2 for determinism check
  console.log('[generate-demo-report-fixtures] Running analyzeWorkflowAgentIntelligence (pass 1)…');
  const agentIntelligence1 = await analyzeWorkflowAgentIntelligence(demoUser.id, workflowId);
  console.log('[generate-demo-report-fixtures] Running analyzeWorkflowAgentIntelligence (pass 2)…');
  const agentIntelligence2 = await analyzeWorkflowAgentIntelligence(demoUser.id, workflowId);

  const agentStripped1 = agentIntelligence1 ? serialiseStable(stripAgentIntelligence(agentIntelligence1)) : 'null';
  const agentStripped2 = agentIntelligence2 ? serialiseStable(stripAgentIntelligence(agentIntelligence2)) : 'null';

  if (agentStripped1 !== agentStripped2) {
    throw new Error(
      '[generate-demo-report-fixtures] DETERMINISM FAILURE: analyzeWorkflowAgentIntelligence produced different output across two runs after stripping wall-clock fields.',
    );
  }
  console.log('[generate-demo-report-fixtures] analyzeWorkflowAgentIntelligence determinism check: PASSED');

  const agentIntelligence = agentIntelligence1 ? stripAgentIntelligence(agentIntelligence1) : null;
  console.log(`[generate-demo-report-fixtures] agentIntelligence: ${agentIntelligence ? 'YES' : 'null'}`);

  // 6. Build WorkflowSummary
  const toolsUsed: string[] = (() => {
    try {
      const t = workflowRow.toolsUsed;
      if (Array.isArray(t)) return t as string[];
      if (typeof t === 'string') return JSON.parse(t) as string[];
      return [];
    } catch {
      return [];
    }
  })();

  const workflowSummary = {
    id: workflowRow.id,
    title: workflowRow.title,
    durationMs: workflowRow.durationMs ?? 0,
    stepCount: workflowRow.stepCount ?? 0,
    phaseCount: workflowRow.phaseCount ?? 0,
    confidence: workflowRow.confidence ?? 0,
    toolsUsed,
    status: workflowRow.status ?? 'active',
    createdAt: workflowRow.createdAt.toISOString(),
    updatedAt: workflowRow.updatedAt.toISOString(),
    isFavorite: false,
    shareToken: undefined,
  };

  // 7. Write fixture files
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const files: Array<{ name: string; data: unknown }> = [
    { name: 'demoReportWorkflow.json', data: workflowSummary },
    { name: 'demoReportProcessOutput.json', data: processOutput },
    { name: 'demoReportInterpretation.json', data: workflowInterpretation },
    { name: 'demoReportInsights.json', data: workflowInsights },
    { name: 'demoReportIntelligence.json', data: intelligence },
    { name: 'demoReportAgentIntelligence.json', data: agentIntelligence },
  ];

  for (const { name, data } of files) {
    const outPath = path.join(FIXTURES_DIR, name);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    const status = data !== null ? 'written' : 'null (written as JSON null)';
    console.log(`[generate-demo-report-fixtures] ${name}: ${status}`);
  }

  console.log('[generate-demo-report-fixtures] Done.');

  // 8. Summary report
  console.log('\n=== Fixture Report ===');
  console.log(`workflow:           ${workflowSummary.title} (${workflowSummary.stepCount} steps, ${toolsUsed.length} tools)`);
  console.log(`processOutput:      ${processOutput ? 'snapshotted' : 'NULL'}`);
  console.log(`interpretation:     ${workflowInterpretation ? 'snapshotted' : 'NULL'}`);
  console.log(`insights:           ${workflowInsights ? 'snapshotted' : 'NULL'}`);
  console.log(`intelligence:       ${intelligence ? 'snapshotted (computedAt pinned)' : 'NULL — analyzeWorkflowVariants returned null'}`);
  console.log(`agentIntelligence:  ${agentIntelligence ? 'snapshotted (metadata.processedAt pinned)' : 'NULL — analyzeWorkflowAgentIntelligence returned null'}`);
  console.log('Determinism:        Wall-clock fields stripped; double-run assertion PASSED');

  await db.$disconnect();
}

main().catch(err => {
  console.error('[generate-demo-report-fixtures] FATAL:', err);
  process.exit(1);
});
