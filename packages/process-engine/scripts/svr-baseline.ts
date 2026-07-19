/**
 * svr-baseline.ts — Step Vagueness Rate (SVR) baseline measurement script.
 *
 * Runs processSessionFull on every workflow fixture and aggregates the
 * SVR metric introduced in specificity.ts (P0-b, SOP_DETAIL_SPECIFICITY_REVIEW_001 §7).
 *
 * MEASURE-ONLY: this script never modifies any fixture or production code.
 * It reads sopValidation.specificity from the quality-gate return value and
 * prints the aggregate baseline number.
 *
 * Usage:
 *   npx tsx packages/process-engine/scripts/svr-baseline.ts
 *     -- OR --
 *   pnpm --filter @ledgerium/process-engine svr-baseline
 *   (add "svr-baseline": "tsx scripts/svr-baseline.ts" to package.json scripts)
 *
 * Output (to stdout):
 *   Per-fixture SVR and aggregate summary table.
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { processSessionFull } from '../src/processSessionFull.js';
import { validateProcessEngineInput } from '../src/inputValidator.js';
import type { ProcessEngineInput } from '../src/types.js';

// ─── ESM-compatible __dirname ─────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Paths ────────────────────────────────────────────────────────────────────

const FIXTURE_DIR = resolve(__dirname, '../../../fixtures/workflows');

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixtureResult {
  file: string;
  svr: number | null;      // null when SOP validation fails (can't measure)
  reason: string | null;   // validation failure reason when svr is null
  vagueCount: number;
  totalCount: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function run(): void {
  const files = readdirSync(FIXTURE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`ERROR: No JSON fixtures found in ${FIXTURE_DIR}`);
    process.exit(1);
  }

  console.log(`\nSVR Baseline — processSessionFull across ${files.length} fixtures`);
  console.log(`Fixture dir: ${FIXTURE_DIR}`);
  console.log('='.repeat(72));

  const results: FixtureResult[] = [];

  for (const file of files) {
    const raw: unknown = JSON.parse(
      readFileSync(join(FIXTURE_DIR, file), 'utf-8'),
    );

    const rawObj = raw as Record<string, unknown>;

    const input: ProcessEngineInput = {
      sessionJson: rawObj['sessionJson'] as ProcessEngineInput['sessionJson'],
      normalizedEvents: rawObj['normalizedEvents'] as ProcessEngineInput['normalizedEvents'],
      derivedSteps: rawObj['derivedSteps'] as ProcessEngineInput['derivedSteps'],
    };

    // Validate input before running pipeline
    const validation = validateProcessEngineInput(input);
    if (!validation.valid) {
      console.log(`  SKIP ${file}: invalid input — ${validation.errors.join('; ')}`);
      results.push({ file, svr: null, reason: 'invalid_input', vagueCount: 0, totalCount: 0 });
      continue;
    }

    try {
      const { sopValidation } = processSessionFull(input);

      if (!sopValidation.ok) {
        // Validation failure — SVR cannot be measured (no specificity field)
        results.push({ file, svr: null, reason: sopValidation.reason, vagueCount: 0, totalCount: 0 });
        console.log(`  FAIL ${file}: reason=${sopValidation.reason}`);
        continue;
      }

      // ok: true — specificity is always present (never undefined post-iteration)
      const spec = sopValidation.specificity;
      const svr = spec?.svr ?? 0;
      const vagueCount = spec?.vagueInstructionCount ?? 0;
      const totalCount = spec?.totalInstructionCount ?? 0;

      results.push({ file, svr, reason: null, vagueCount, totalCount });

      const pct = (svr * 100).toFixed(1);
      const bar = '#'.repeat(Math.round(svr * 20));
      console.log(`  OK   ${file.replace('.json', '').padEnd(48)} SVR=${pct}% [${bar.padEnd(20)}] ${vagueCount}/${totalCount}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ file, svr: null, reason: `exception: ${msg}`, vagueCount: 0, totalCount: 0 });
      console.log(`  ERR  ${file}: ${msg}`);
    }
  }

  // ─── Aggregate summary ──────────────────────────────────────────────────────

  const measured = results.filter(r => r.svr !== null);
  const failed   = results.filter(r => r.svr === null);

  console.log('\n' + '='.repeat(72));
  console.log('AGGREGATE SUMMARY');
  console.log('='.repeat(72));
  console.log(`  Fixtures processed : ${results.length}`);
  console.log(`  SOPs measured      : ${measured.length}`);
  console.log(`  Skipped/failed     : ${failed.length}`);

  if (measured.length === 0) {
    console.log('\n  No SOPs could be measured — check fixture validity.');
    process.exit(1);
  }

  const totalVague  = measured.reduce((s, r) => s + r.vagueCount, 0);
  const totalInstr  = measured.reduce((s, r) => s + r.totalCount, 0);
  const globalSvr   = totalInstr === 0 ? 0 : totalVague / totalInstr;

  const svrValues   = measured.map(r => r.svr as number);
  const meanSvr     = svrValues.reduce((s, v) => s + v, 0) / svrValues.length;
  const minSvr      = Math.min(...svrValues);
  const maxSvr      = Math.max(...svrValues);
  const sorted      = [...svrValues].sort((a, b) => a - b);
  const mid         = Math.floor(sorted.length / 2);
  const medianSvr   = sorted.length % 2 !== 0
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;

  console.log(`\n  Vague instructions : ${totalVague} / ${totalInstr} total`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Global SVR (pool)  : ${(globalSvr * 100).toFixed(2)}%`);
  console.log(`  Mean SVR           : ${(meanSvr   * 100).toFixed(2)}%`);
  console.log(`  Median SVR         : ${(medianSvr * 100).toFixed(2)}%`);
  console.log(`  Min SVR            : ${(minSvr    * 100).toFixed(2)}%`);
  console.log(`  Max SVR            : ${(maxSvr    * 100).toFixed(2)}%`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`\n  BASELINE (global SVR): ${(globalSvr * 100).toFixed(2)}%`);
  console.log(`  This is the P0-b baseline figure to record in SOP_DETAIL_SPECIFICITY_REVIEW_001 §7.`);
  console.log('\n' + '='.repeat(72) + '\n');
}

run();
