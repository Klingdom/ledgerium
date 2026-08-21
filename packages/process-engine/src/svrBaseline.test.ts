/**
 * Step Vagueness Rate (SVR) baseline over the 12 segmentation-engine golden
 * fixtures — docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §5 / P0-b.
 *
 * Fixtures live at fixtures/vagueness-golden/*.json. Each is a real
 * (normalizedEvents, derivedSteps) pair produced by actually running
 * `@ledgerium/segmentation-engine`'s `segmentEvents()` over the 12 golden
 * fixtures at packages/segmentation-engine/fixtures/golden/*.json (generated
 * once via a throwaway test in that package, then deleted — process-engine
 * takes zero new package dependency on segmentation-engine; see the fixture
 * JSON's own contents, which are plain static data with no import coupling).
 *
 * This suite runs the REAL pipeline end to end — processSessionFull() —
 * exactly as docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §5 specifies
 * ("Computable today ... by running processSessionFull over the 12 golden
 * fixture chains"). It is report-only: it establishes and locks the
 * measured baseline as a regression-detecting snapshot, it does not gate.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { processSessionFull } from './processSessionFull.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from './types.js';
import type { SopVagueness } from './specificity.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'vagueness-golden');

interface GoldenFixtureFile {
  fixtureName: string;
  normalizedEvents: CanonicalEventInput[];
  derivedSteps: DerivedStepInput[];
}

function loadFixture(file: string): GoldenFixtureFile {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, file), 'utf-8')) as GoldenFixtureFile;
}

function toInput(fixture: GoldenFixtureFile): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: 'test-session-golden',
      activityName: `Golden fixture: ${fixture.fixtureName}`,
      startedAt: '2026-01-01T00:00:00Z',
    },
    normalizedEvents: fixture.normalizedEvents,
    derivedSteps: fixture.derivedSteps,
  };
}

describe('SVR baseline — 12 segmentation-engine golden fixtures', () => {
  const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));

  it('exercises exactly 12 golden fixtures', () => {
    expect(files.length).toBe(12);
  });

  interface FixtureResult {
    name: string;
    ran: boolean;
    stepCount: number;
    totalInstructionCount: number;
    vagueInstructionCount: number;
    svr: number;
    skipReason?: string;
  }

  const results: FixtureResult[] = [];

  for (const file of files) {
    const fixture = loadFixture(file);

    it(`computes SVR for fixture "${fixture.fixtureName}"`, () => {
      if (fixture.derivedSteps.length === 0) {
        // empty-session: zero derived steps. processSession() will produce
        // an empty SOP; there is nothing to score. Report this honestly as
        // a skip rather than forcing a fabricated 0-instruction "0% vague".
        results.push({
          name: fixture.fixtureName,
          ran: false,
          stepCount: 0,
          totalInstructionCount: 0,
          vagueInstructionCount: 0,
          svr: 0,
          skipReason: 'zero derived steps (empty-session fixture)',
        });
        expect(fixture.derivedSteps.length).toBe(0);
        return;
      }

      const { sopValidation } = processSessionFull(toInput(fixture));
      const spec: SopVagueness = sopValidation.specificity;

      results.push({
        name: fixture.fixtureName,
        ran: true,
        stepCount: spec.stepCount,
        totalInstructionCount: spec.totalInstructionCount,
        vagueInstructionCount: spec.vagueInstructionCount,
        svr: spec.svr,
      });

      // Sanity invariants — every reading must be a valid ratio.
      expect(spec.svr).toBeGreaterThanOrEqual(0);
      expect(spec.svr).toBeLessThanOrEqual(1);
      expect(Number.isNaN(spec.svr)).toBe(false);
    });
  }

  it('determinism: re-running processSessionFull on every fixture twice yields byte-identical specificity', () => {
    for (const file of files) {
      const fixture = loadFixture(file);
      if (fixture.derivedSteps.length === 0) continue;
      const input = toInput(fixture);
      const first = processSessionFull(input).sopValidation.specificity;
      const second = processSessionFull(input).sopValidation.specificity;
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    }
  });

  it('reports the aggregate baseline across all 12 fixtures', () => {
    // This runs after the per-fixture its() above have populated `results`
    // (vitest executes it() blocks within a describe in declaration order).
    expect(results.length).toBe(12);

    const ranResults = results.filter(r => r.ran);
    const totalInstructions = ranResults.reduce((s, r) => s + r.totalInstructionCount, 0);
    const totalVague = ranResults.reduce((s, r) => s + r.vagueInstructionCount, 0);
    const aggregateSvr = totalInstructions > 0 ? totalVague / totalInstructions : 0;

    // eslint-disable-next-line no-console
    console.log('\n=== SVR baseline — 12 segmentation-engine golden fixtures ===');
    for (const r of results.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!r.ran) {
        console.log(`  ${r.name.padEnd(28)} SKIPPED (${r.skipReason})`);
      } else {
        console.log(
          `  ${r.name.padEnd(28)} steps=${r.stepCount} instructions=${r.totalInstructionCount} ` +
            `vague=${r.vagueInstructionCount} SVR=${(r.svr * 100).toFixed(1)}%`,
        );
      }
    }
    console.log(
      `  TOTAL (11 scored fixtures, empty-session excluded): instructions=${totalInstructions} ` +
        `vague=${totalVague} aggregate SVR=${(aggregateSvr * 100).toFixed(1)}%`,
    );
    console.log('===============================================================\n');

    // Baseline regression lock: fail loudly if the aggregate baseline moves.
    // This number is the measured 2026-08-13 baseline over the 12 golden
    // fixtures with the SOP generation code as it exists today: 11 of the 12
    // fixtures are fully-labelled (real target_summary.label on every
    // interactive event) and score 0% vague; the 12th, `single-action-no-label`
    // — the fixture purpose-built to have zero label/role signal — is the
    // ONLY vague reading (its single instruction, 1/1). See
    // docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §10 for the full
    // discussion of why this is an honest, non-degenerate baseline rather
    // than a metric that never fires. If this assertion fails, either
    // (a) sopBuilder.ts changed and the baseline needs to be re-measured and
    // re-recorded, or (b) specificity.ts changed and the same applies.
    expect(totalInstructions).toBe(31);
    expect(totalVague).toBe(1);
    expect(aggregateSvr).toBeCloseTo(1 / 31, 6);
  });
});
