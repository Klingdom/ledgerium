/**
 * Regenerate the demo process-output fixture for the product-page workflow-view
 * container. Runs the REAL process engine on the sample bundle and snapshots the
 * output as plain JSON so the public demo renders exactly what production does —
 * no hand-authored shape that can drift from `buildNormalizedViewModel`.
 *
 * Run: cd apps/web-app && pnpm tsx scripts/generate-demo-process-output.ts
 * Output: src/components/demo/fixtures/demoProcessOutput.po.json
 *
 * Deterministic: the bundle uses a fixed clock (no Date.now/Math.random), so the
 * snapshot is reproducible. Re-run only when the engine or sample changes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcessEngine } from '@/lib/ingestion';
import { buildBundleFromSpec } from '@/lib/sample-workflow';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/components/demo/fixtures/demoProcessOutput.po.json');

// Approve Expense Report standard path — matches the demo's variants fixture
// (DEMO_VARIANT_INTELLIGENCE) + SOP fixture, so Container 2's flow / variants /
// SOP all describe one consistent workflow.
const APPROVE_EXPENSE_SPEC = {
  title: 'Approve Expense Report (Sample)',
  sessionId: 'demo-approve-expense-std',
  baseTimeMs: 1_700_000_000_000,
  steps: [
    { title: 'Open expense report', groupingReason: 'click_then_navigate', boundaryReason: 'navigation_changed', system: 'Concur', domain: 'concur.example.com', page: 'Expense Report', route: '/expense/view', durationMs: 1_500, confidence: 0.9 },
    { title: 'Review line items', groupingReason: 'data_entry', boundaryReason: 'action_completed', system: 'Concur', domain: 'concur.example.com', page: 'Expense Report', route: '/expense/view', durationMs: 8_000, confidence: 0.88 },
    { title: 'Approve report', groupingReason: 'single_action', boundaryReason: 'action_completed', system: 'Concur', domain: 'concur.example.com', page: 'Expense Report', route: '/expense/view', durationMs: 4_000, confidence: 0.9 },
    { title: 'Notify employee', groupingReason: 'send_action', boundaryReason: 'app_context_changed', system: 'Concur', domain: 'concur.example.com', page: 'Notification', route: '/expense/notify', durationMs: 2_000, confidence: 0.88 },
    { title: 'Archive to records', groupingReason: 'single_action', boundaryReason: 'session_stop', system: 'Concur', domain: 'concur.example.com', page: 'Records', route: '/records', durationMs: 1_000, confidence: 0.86 },
  ],
};

const output = runProcessEngine(buildBundleFromSpec(APPROVE_EXPENSE_SPEC));

// Determinism gate: identical inputs must yield identical output.
const second = runProcessEngine(buildBundleFromSpec(APPROVE_EXPENSE_SPEC));
if (JSON.stringify(output) !== JSON.stringify(second)) {
  throw new Error('runProcessEngine is non-deterministic for the sample bundle — refusing to snapshot.');
}

if (!output.processRun || !output.processMap) {
  throw new Error('processOutput missing processRun/processMap — the workflow view would render blank.');
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(
  `[demo-fixture] wrote ${OUT}\n` +
    `  title=${output.processRun.activityName ?? '(none)'} ` +
    `steps=${output.processDefinition.stepDefinitions.length} ` +
    `nodes=${output.processMap.nodes?.length ?? 0} ` +
    `systems=${JSON.stringify(output.processMap.systems ?? [])}`,
);
