/**
 * Anchor-stability regression test — the gate protecting the overlay
 * design's core assumption.
 *
 * docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md §5 builds an
 * entire orphan/conflict taxonomy on the premise that
 * `SOPInstruction.sourceRawEventId` — `raw_event_id`, carried through
 * `CanonicalEventInput.normalization_meta.sourceEventId` — survives an
 * **engine re-run over the same stored bundle** (regeneration case R1,
 * ADR §2.1) even when `PROCESS_ENGINE_VERSION` changes (ADR §4.2). Per ADR
 * §10 item 3: "Without it, §5's entire taxonomy rests on a property nothing
 * enforces." Until this file existed, that premise was an argument, not a
 * gate.
 *
 * If any assertion in this file ever fails, the orphan taxonomy in ADR §5
 * no longer holds for the operation that produced the failure, and the
 * overlay design (when built) must be re-derived for that case, not
 * patched around. Per ADR §8 hazard 1, do not weaken or delete these
 * assertions to make an unrelated change land — that is exactly the class
 * of determinism regression this file exists to catch.
 *
 * What this file asserts, per fixture, per instruction:
 *   1. `sourceRawEventId` is present and non-empty (no silent gaps).
 *   2. `sourceRawEventId` resolves to a real event in the input bundle
 *      (no dangling anchors).
 *   3. Two runs of the engine at the SAME version produce a byte-identical
 *      anchor set (baseline determinism).
 *   4. Two runs of the engine at DIFFERENT `PROCESS_ENGINE_VERSION` values
 *      produce a byte-identical anchor set (the R1 stability claim ADR §5
 *      depends on) — simulated via module mocking, see
 *      `runAtSimulatedVersion` below.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { processSession } from './processSession.js';
import type { ProcessEngineInput, ProcessOutput, SOPInstruction } from './types.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Same real-world fixture bundle set exercised by fixture-test.test.ts —
// 10 recorded workflows across distinct domains, each with its raw
// `normalization_meta.sourceEventId` genuinely distinct from `event_id`
// (unlike several hand-rolled unit-test fixtures elsewhere in this
// package), which makes this the right fixture set for a test whose whole
// point is distinguishing the two.
const fixtureDir = path.resolve(__dirname, '../../../fixtures/workflows');
const fixtureFiles = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.json'));

function loadFixture(file: string): ProcessEngineInput {
  const raw = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf-8'));
  return {
    sessionJson: {
      sessionId: raw.sessionJson.sessionId,
      activityName: raw.sessionJson.activityName,
      startedAt: raw.sessionJson.startedAt,
      ...(raw.sessionJson.endedAt ? { endedAt: raw.sessionJson.endedAt } : {}),
    },
    normalizedEvents: raw.normalizedEvents,
    derivedSteps: raw.derivedSteps,
  };
}

/** Every instruction across every step, in document order. */
function allInstructions(output: ProcessOutput): SOPInstruction[] {
  return output.sop.steps.flatMap(step => step.instructions);
}

/** The anchor set: `sourceRawEventId` per instruction, in document order. */
function anchorSet(output: ProcessOutput): string[] {
  return allInstructions(output).map(i => i.sourceRawEventId);
}

/**
 * Runs `processSession` against a freshly re-evaluated module graph in
 * which `PROCESS_ENGINE_VERSION` has been swapped for a different value —
 * a simulated engine-version bump, without needing a second real fixture
 * bundle or an actual engine release.
 *
 * `sourceRawEventId` is derived purely from
 * `evt.normalization_meta.sourceEventId` in `sopBuilder.ts` and has no
 * read of `PROCESS_ENGINE_VERSION` anywhere in its computation path. This
 * harness exists to prove that claim by observation rather than merely
 * assert it by code inspection — it is the actual "simulate a version
 * bump" step from ADR §10 item 3.
 *
 * Mechanism: `vi.resetModules()` clears Vitest's module registry, then
 * `vi.doMock('./types.js', ...)` registers a factory that returns every
 * real export of `types.js` (via `importOriginal`) except
 * `PROCESS_ENGINE_VERSION`, which is overridden. A fresh dynamic
 * `import('./processSession.js')` then re-evaluates the whole
 * processSession → sopBuilder → stepAnalyzer → types module graph against
 * the mocked constant. The mock is undone and the registry reset again
 * afterward so it cannot leak into any other test in this file.
 */
async function runAtSimulatedVersion(
  input: ProcessEngineInput,
  simulatedVersion: string,
): Promise<ProcessOutput> {
  vi.resetModules();
  vi.doMock('./types.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./types.js')>();
    return { ...actual, PROCESS_ENGINE_VERSION: simulatedVersion };
  });

  const { processSession: processSessionAtSimulatedVersion } = await import('./processSession.js');
  const output = processSessionAtSimulatedVersion(input);

  vi.doUnmock('./types.js');
  vi.resetModules();

  return output;
}

// ─── Per-fixture invariants (no version change) ──────────────────────────────

describe('anchor stability — sourceRawEventId invariants across all fixtures', () => {
  for (const file of fixtureFiles) {
    it(`${file}: every instruction has a present, non-empty sourceRawEventId`, () => {
      const output = processSession(loadFixture(file));
      const instructions = allInstructions(output);

      // A fixture with zero instructions would make every assertion below
      // vacuously true and hide a regression — guard against that first.
      expect(instructions.length).toBeGreaterThan(0);

      for (const instr of instructions) {
        expect(typeof instr.sourceRawEventId).toBe('string');
        expect(instr.sourceRawEventId.length).toBeGreaterThan(0);
      }
    });

    it(`${file}: every sourceRawEventId resolves to a real event in the input bundle`, () => {
      const input = loadFixture(file);
      const output = processSession(input);

      const rawIdsInBundle = new Set(
        input.normalizedEvents.map(e => e.normalization_meta.sourceEventId),
      );

      for (const instr of allInstructions(output)) {
        expect(rawIdsInBundle.has(instr.sourceRawEventId)).toBe(true);
      }
    });

    it(`${file}: two runs at the same engine version produce a byte-identical anchor set (determinism)`, () => {
      const input = loadFixture(file);
      const first = anchorSet(processSession(input));
      const second = anchorSet(processSession(input));
      expect(second).toEqual(first);
    });
  }
});

// ─── Cross-version stability (the ADR §5 gate) ────────────────────────────────

describe('anchor stability — sourceRawEventId across a simulated PROCESS_ENGINE_VERSION bump', () => {
  for (const file of fixtureFiles) {
    it(`${file}: anchor set is byte-identical when PROCESS_ENGINE_VERSION differs (regeneration case R1)`, async () => {
      const input = loadFixture(file);

      const before = processSession(input);
      const after = await runAtSimulatedVersion(input, '9.9.9-simulated-bump');

      // Sanity: prove the simulated bump actually took effect. Without
      // this, a broken mock could make the test trivially pass by
      // comparing a version's output against itself.
      expect(after.sop.engineVersion).toBe('9.9.9-simulated-bump');
      expect(after.sop.engineVersion).not.toBe(before.sop.engineVersion);

      // The assertion the whole ADR §5 taxonomy depends on: the anchor set
      // does not move when the engine version does.
      expect(anchorSet(after)).toEqual(anchorSet(before));

      // Corollary from ADR §4.2, pinned explicitly rather than left
      // implied: a version bump changes SOP.version (which embeds
      // engineVersion) for every document, but does NOT change
      // contentHash, because the hashed field set (contentHash.ts) does
      // not include instruction or document provenance.
      expect(after.sop.contentHash).toBe(before.sop.contentHash);
      expect(after.sop.version).not.toBe(before.sop.version);
    });
  }
});
