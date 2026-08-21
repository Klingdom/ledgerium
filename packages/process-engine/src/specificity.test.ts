/**
 * specificity.ts tests — Step Vagueness Rate (SVR) measurement.
 *
 * Groups:
 *   A — isVagueInstructionText (confirmed graded-fallback set)
 *   B — computeInstructionSpecificity (3-signal rubric, audit-honesty IFF)
 *   C — computeStepSpecificity (aggregation, audit-honesty IFF)
 *   D — computeSopVagueness (SVR formula, confidence OR-rule, divide-by-zero guard)
 *   E — Determinism (same input -> byte-identical output)
 *   F — Hard-constraint litmus tests named explicitly in the task
 */

import { describe, it, expect } from 'vitest';
import {
  isVagueInstructionText,
  computeInstructionSpecificity,
  computeStepSpecificity,
  computeSopVagueness,
  VAGUE_INSTRUCTION_STRINGS,
  VAGUE_INSTRUCTION_PREFIXES,
  LOW_CONFIDENCE_THRESHOLD,
  SPECIFICITY_THRESHOLD,
} from './specificity.js';
import type { SOPInstruction, SOPStep, SOP } from './types.js';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function instruction(overrides?: Partial<SOPInstruction>): SOPInstruction {
  return {
    sequence: 1,
    instruction: 'Click "Send"',
    eventType: 'interaction.click',
    sourceEventId: 'evt-1',
    sourceRawEventId: 'raw-evt-1',
    isSensitive: false,
    redacted: false,
    ...overrides,
  };
}

function sopStep(overrides?: Partial<SOPStep>): SOPStep {
  return {
    ordinal: 1,
    stepId: 'step-1',
    title: 'Send the email',
    category: 'send_action',
    action: 'Click "Send"',
    instructions: [instruction()],
    detail: '1. Click "Send"',
    inputs: [],
    expectedOutcome: 'Email moves to Sent and the compose window closes',
    warnings: [],
    durationLabel: '< 1s',
    confidence: 0.9,
    sourceStepId: 'step-1',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group A — isVagueInstructionText
// ═══════════════════════════════════════════════════════════════════════════

describe('Group A: isVagueInstructionText — confirmed graded-fallback set', () => {
  it('A1: matches all 9 exact bottom-rung strings', () => {
    expect(VAGUE_INSTRUCTION_STRINGS.length).toBe(9);
    for (const s of VAGUE_INSTRUCTION_STRINGS) {
      expect(isVagueInstructionText(s)).toBe(true);
    }
  });

  it('A2: matches all 5 dynamic-suffix prefix variants', () => {
    expect(VAGUE_INSTRUCTION_PREFIXES.length).toBe(5);
    const suffixed = VAGUE_INSTRUCTION_PREFIXES.map(p => `${p}Some Page"`);
    for (const s of suffixed) {
      expect(isVagueInstructionText(s)).toBe(true);
    }
  });

  it('A3: exact prefix-derived strings from sopBuilder.ts patterns are caught', () => {
    expect(isVagueInstructionText('Click the target element on "Inbox"')).toBe(true);
    // 'Click in {app}' (not 'Click the target element in {app}') is the
    // current source text as of the P0-c B1 rename (2026-08-20) — see
    // VAGUE_INSTRUCTION_PREFIXES's doc comment for why the rename alone
    // does not exempt this fallback from being a confirmed vague match.
    expect(isVagueInstructionText('Click in Gmail')).toBe(true);
    expect(isVagueInstructionText('Enter the required value on "Order Form"')).toBe(true);
    expect(isVagueInstructionText('Enter the required value in Salesforce')).toBe(true);
    expect(isVagueInstructionText('Submit the form on "Checkout"')).toBe(true);
  });

  it('A4: does not flag genuinely specific instructions', () => {
    expect(isVagueInstructionText('Click "Send"')).toBe(false);
    expect(isVagueInstructionText('Enter value in "Name"')).toBe(false);
    expect(isVagueInstructionText('Submit via "Save"')).toBe(false);
  });

  it('A5: does not false-positive on strings that merely contain a vague word', () => {
    // "target" and "required" appearing elsewhere must not trigger a match —
    // this is exact/prefix matching, not substring matching.
    expect(isVagueInstructionText('Click the target row to select it')).toBe(false);
    expect(isVagueInstructionText('This field is required by policy')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group B — computeInstructionSpecificity
// ═══════════════════════════════════════════════════════════════════════════

describe('Group B: computeInstructionSpecificity — 3-signal rubric', () => {
  const ctxFull = { system: 'Gmail', expectedOutcome: 'The email moves to Sent' };
  const ctxNoResult = { system: 'Gmail', expectedOutcome: '' };

  it('B1: Tier 1 — object + location + result -> specific, not vague', () => {
    const inst = instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' });
    const r = computeInstructionSpecificity(inst, ctxFull);
    expect(r.hasObject).toBe(true);
    expect(r.hasLocation).toBe(true);
    expect(r.hasResult).toBe(true);
    expect(r.signalCount).toBe(3);
    expect(r.specificity).toBe(1);
    expect(r.tier).toBe(1);
    expect(r.vague).toBe(false);
  });

  it('B2: Tier 2 — object + location, no result -> not vague', () => {
    const inst = instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' });
    const r = computeInstructionSpecificity(inst, ctxNoResult);
    expect(r.signalCount).toBe(2);
    expect(r.tier).toBe(2);
    expect(r.vague).toBe(false);
  });

  it('B3: Tier 3 — object only -> vague (1 signal, per literal >=2-of-3 rule)', () => {
    const inst = instruction({
      instruction: 'Click "Send"',
      targetLabel: 'Send',
      // no instruction.system
    });
    const r = computeInstructionSpecificity(inst, { expectedOutcome: '' } /* no location, no result */);
    expect(r.hasObject).toBe(true);
    expect(r.hasLocation).toBe(false);
    expect(r.hasResult).toBe(false);
    expect(r.signalCount).toBe(1);
    expect(r.tier).toBe(3);
    expect(r.vague).toBe(true);
  });

  it('B4: Tier 4 — location only (no object) -> vague', () => {
    const inst = instruction({ instruction: 'Wait for system to finish processing' });
    const r = computeInstructionSpecificity(inst, ctxNoResult /* has location, empty result */);
    // ctxNoResult has system set and empty expectedOutcome -> hasLocation true, hasResult false
    expect(r.hasObject).toBe(false);
    expect(r.hasLocation).toBe(true);
    expect(r.hasResult).toBe(false);
    expect(r.signalCount).toBe(1);
    expect(r.tier).toBe(4);
    expect(r.vague).toBe(true);
  });

  it('B5: Tier 6 — no object/location, text matches confirmed fallback set -> vague, Unusable', () => {
    const inst = instruction({ instruction: 'Click the target element' });
    const r = computeInstructionSpecificity(inst, { expectedOutcome: '' });
    expect(r.hasObject).toBe(false);
    expect(r.hasLocation).toBe(false);
    expect(r.hasResult).toBe(false);
    expect(r.signalCount).toBe(0);
    expect(r.specificity).toBe(0);
    expect(r.tier).toBe(6);
    expect(r.vague).toBe(true);
  });

  it('B6: Tier 5 — no object/location, text NOT a known fallback string -> vague, Weak (not Unusable)', () => {
    const inst = instruction({ instruction: 'Something happened' });
    const r = computeInstructionSpecificity(inst, { expectedOutcome: '' });
    expect(r.tier).toBe(5);
    expect(r.vague).toBe(true);
  });

  it('B7: targetLabel present but instruction text is a known constant-fallback (keyboard shortcut case) -> all signals suppressed', () => {
    // Mirrors interaction.keyboard_shortcut: deriveInstruction() always
    // returns 'Use keyboard shortcut' regardless of any targetLabel that may
    // have been computed on the instruction, or of the step's system/result.
    // Per module doc decision #1, a confirmed graded-fallback match forces
    // ALL THREE signals false, even when ctxFull independently supplies a
    // real location and result.
    const inst = instruction({ instruction: 'Use keyboard shortcut', targetLabel: 'Search box' });
    const r = computeInstructionSpecificity(inst, ctxFull);
    expect(r.hasObject).toBe(false);
    expect(r.hasLocation).toBe(false);
    expect(r.hasResult).toBe(false);
    expect(r.tier).toBe(6);
    expect(r.vague).toBe(true);
  });

  it('B8: audit-honesty IFF invariant — vague === true IFF specificity < SPECIFICITY_THRESHOLD (exhaustive over 8 signal combinations)', () => {
    for (const hasObjectLabel of [undefined, 'X']) {
      for (const hasLocationSys of [undefined, 'Y']) {
        for (const hasResultText of ['', 'Z']) {
          const inst = instruction({
            instruction: hasObjectLabel ? `Click "${hasObjectLabel}"` : 'Click the target element',
            ...(hasObjectLabel !== undefined && { targetLabel: hasObjectLabel }),
            ...(hasLocationSys !== undefined && { system: hasLocationSys }),
          });
          const r = computeInstructionSpecificity(inst, { expectedOutcome: hasResultText });
          expect(r.vague).toBe(r.specificity < SPECIFICITY_THRESHOLD);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group C — computeStepSpecificity
// ═══════════════════════════════════════════════════════════════════════════

describe('Group C: computeStepSpecificity', () => {
  it('C1: aggregates multiple instructions correctly', () => {
    const step = sopStep({
      instructions: [
        instruction({ sequence: 1, instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' }),
        instruction({ sequence: 2, instruction: 'Click the target element' }),
      ],
    });
    const r = computeStepSpecificity(step);
    expect(r.totalInstructionCount).toBe(2);
    expect(r.instructions[0]!.vague).toBe(false);
    expect(r.instructions[1]!.vague).toBe(true);
    // Instruction 1: 'Click "Send"' is not a confirmed fallback string ->
    // object+location+result all present -> specificity 1.0.
    // Instruction 2: 'Click the target element' IS a confirmed fallback
    // string -> the override (module doc decision #1) forces all three
    // signals false regardless of the step's own system/expectedOutcome ->
    // specificity 0.
    expect(r.averageSpecificity).toBeCloseTo((1 + 0) / 2, 4);
  });

  it('C2: empty instructions array -> averageSpecificity 0, vague true', () => {
    const step = sopStep({ instructions: [] });
    const r = computeStepSpecificity(step);
    expect(r.totalInstructionCount).toBe(0);
    expect(r.averageSpecificity).toBe(0);
    expect(r.vague).toBe(true);
  });

  it('C3: audit-honesty IFF invariant — vague === true IFF averageSpecificity < SPECIFICITY_THRESHOLD', () => {
    const specific = sopStep({
      instructions: [instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' })],
    });
    const vague = sopStep({
      instructions: [instruction({ instruction: 'Click the target element' })],
    });
    const r1 = computeStepSpecificity(specific);
    const r2 = computeStepSpecificity(vague);
    expect(r1.vague).toBe(r1.averageSpecificity < SPECIFICITY_THRESHOLD);
    expect(r2.vague).toBe(r2.averageSpecificity < SPECIFICITY_THRESHOLD);
  });

  it('C4: lowConfidence is independent of averageSpecificity (own IFF, not folded into `vague`)', () => {
    const step = sopStep({
      confidence: 0.3,
      instructions: [instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' })],
    });
    const r = computeStepSpecificity(step);
    // Fully specific instruction -> averageSpecificity 1.0 -> vague (this field) false,
    // even though the step is low-confidence.
    expect(r.averageSpecificity).toBe(1);
    expect(r.vague).toBe(false);
    expect(r.lowConfidence).toBe(true);
    expect(r.lowConfidence).toBe(step.confidence < LOW_CONFIDENCE_THRESHOLD);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group D — computeSopVagueness (SVR)
// ═══════════════════════════════════════════════════════════════════════════

function sop(steps: SOPStep[]): Pick<SOP, 'steps'> {
  return { steps };
}

describe('Group D: computeSopVagueness — SVR formula', () => {
  it('D1: SVR = 0 when every instruction is specific', () => {
    const s = sop([
      sopStep({
        instructions: [instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' })],
      }),
    ]);
    const r = computeSopVagueness(s);
    expect(r.svr).toBe(0);
    expect(r.vagueInstructionCount).toBe(0);
    expect(r.totalInstructionCount).toBe(1);
  });

  it('D2: SVR = 1 when every instruction is vague', () => {
    const s = sop([
      sopStep({
        instructions: [instruction({ instruction: 'Click the target element' })],
      }),
    ]);
    const r = computeSopVagueness(s);
    expect(r.svr).toBe(1);
    expect(r.vagueInstructionCount).toBe(1);
  });

  it('D3: mixed SOP produces the correct ratio', () => {
    const s = sop([
      sopStep({
        stepId: 'step-1',
        instructions: [
          instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' }),
          instruction({ instruction: 'Click the target element' }),
        ],
      }),
      sopStep({
        stepId: 'step-2',
        instructions: [instruction({ instruction: 'Enter value in "Name"', targetLabel: 'Name', system: 'Gmail' })],
      }),
    ]);
    const r = computeSopVagueness(s);
    expect(r.totalInstructionCount).toBe(3);
    expect(r.vagueInstructionCount).toBe(1);
    expect(r.svr).toBeCloseTo(1 / 3, 4);
  });

  it('D4: divide-by-zero guard — zero instructions across the whole SOP -> svr 0, not NaN', () => {
    const s = sop([sopStep({ instructions: [] })]);
    const r = computeSopVagueness(s);
    expect(r.totalInstructionCount).toBe(0);
    expect(r.svr).toBe(0);
    expect(Number.isNaN(r.svr)).toBe(false);
  });

  it('D4b: divide-by-zero guard — SOP with zero steps at all', () => {
    const r = computeSopVagueness(sop([]));
    expect(r.stepCount).toBe(0);
    expect(r.totalInstructionCount).toBe(0);
    expect(r.svr).toBe(0);
  });

  it('D5: low-confidence step forces its instructions to count as vague even when structurally specific (OR-rule)', () => {
    const s = sop([
      sopStep({
        confidence: 0.4, // below LOW_CONFIDENCE_THRESHOLD
        instructions: [instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' })],
      }),
    ]);
    const r = computeSopVagueness(s);
    // The instruction's OWN specificity is 1.0 (fully specific) but the
    // parent step's low confidence forces it into the vague count — matches
    // the review's §5 OR-rule exactly.
    expect(r.vagueInstructionCount).toBe(1);
    expect(r.svr).toBe(1);
    expect(r.vagueStepCount).toBe(1);
  });

  it('D6: high-confidence, structurally-vague step also counts as vague (the other side of the OR)', () => {
    const s = sop([
      sopStep({
        confidence: 0.99,
        instructions: [instruction({ instruction: 'Click the target element' })],
      }),
    ]);
    const r = computeSopVagueness(s);
    expect(r.vagueInstructionCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group E — Determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('Group E: determinism — same input produces byte-identical output', () => {
  it('E1: computeInstructionSpecificity is deterministic across repeated calls with freshly-constructed equal inputs', () => {
    const build = () =>
      instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' });
    const ctx = { system: 'Gmail', expectedOutcome: 'Confirmed' };
    const r1 = computeInstructionSpecificity(build(), { ...ctx });
    const r2 = computeInstructionSpecificity(build(), { ...ctx });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('E2: computeStepSpecificity is deterministic across repeated calls on independently-built, deep-equal steps', () => {
    const build = () =>
      sopStep({
        instructions: [
          instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' }),
          instruction({ sequence: 2, instruction: 'Click the target element' }),
        ],
      });
    const r1 = computeStepSpecificity(build());
    const r2 = computeStepSpecificity(build());
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('E3: computeSopVagueness is deterministic across repeated calls, including 10 repeated invocations', () => {
    const build = () =>
      sop([
        sopStep({
          stepId: 'a',
          instructions: [
            instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' }),
            instruction({ sequence: 2, instruction: 'Enter the required value' }),
          ],
        }),
        sopStep({
          stepId: 'b',
          confidence: 0.3,
          instructions: [instruction({ instruction: 'Submit via "Save"', targetLabel: 'Save', system: 'App' })],
        }),
      ]);

    const results = Array.from({ length: 10 }, () => JSON.stringify(computeSopVagueness(build())));
    const [first, ...rest] = results;
    for (const r of rest) {
      expect(r).toBe(first);
    }
  });

  it('E4: no hidden mutation — calling computeStepSpecificity twice on the SAME object reference does not change its result', () => {
    const step = sopStep({
      instructions: [instruction({ instruction: 'Click "Send"', targetLabel: 'Send', system: 'Gmail' })],
    });
    const r1 = computeStepSpecificity(step);
    const r2 = computeStepSpecificity(step);
    expect(r1).toEqual(r2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group F — Hard-constraint litmus tests (task-mandated proofs)
// ═══════════════════════════════════════════════════════════════════════════

describe('Group F: hard-constraint litmus tests', () => {
  it('F1: "Click the target element" is scored as vague (worst-case labelless click)', () => {
    const step = sopStep({
      instructions: [instruction({ instruction: 'Click the target element' })],
    });
    const stepSpec = computeStepSpecificity(step);
    expect(stepSpec.instructions[0]!.vague).toBe(true);
    const sopSpec = computeSopVagueness(sop([step]));
    expect(sopSpec.svr).toBe(1);
  });

  it('F2: "Enter the required value" is scored as vague (worst-case labelless input)', () => {
    const step = sopStep({
      instructions: [instruction({ instruction: 'Enter the required value', eventType: 'interaction.input_change' })],
    });
    const stepSpec = computeStepSpecificity(step);
    expect(stepSpec.instructions[0]!.vague).toBe(true);
    const sopSpec = computeSopVagueness(sop([step]));
    expect(sopSpec.svr).toBe(1);
  });

  it('F3: a genuinely specific instruction (names element + context) is NOT scored as vague', () => {
    const step = sopStep({
      system: 'Salesforce',
      expectedOutcome: 'Confirmation message appears and record is saved in Salesforce',
      instructions: [
        instruction({
          instruction: 'Enter value in "Vendor Name"',
          targetLabel: 'Vendor Name',
          system: 'Salesforce',
        }),
      ],
    });
    const stepSpec = computeStepSpecificity(step);
    expect(stepSpec.instructions[0]!.vague).toBe(false);
    expect(stepSpec.instructions[0]!.tier).toBe(1);
    const sopSpec = computeSopVagueness(sop([step]));
    expect(sopSpec.svr).toBe(0);
  });

  it('F4: score is byte-identical across repeated runs on the same input (full SVR pipeline)', () => {
    const buildSop = () =>
      sop([
        sopStep({
          instructions: [
            instruction({ instruction: 'Click the target element' }),
            instruction({ sequence: 2, instruction: 'Enter value in "Name"', targetLabel: 'Name', system: 'App' }),
          ],
        }),
      ]);

    const outputs = new Set<string>();
    for (let i = 0; i < 25; i++) {
      outputs.add(JSON.stringify(computeSopVagueness(buildSop())));
    }
    // A Set collapses duplicates — exactly one distinct serialization proves
    // byte-identical output across 25 independent runs.
    expect(outputs.size).toBe(1);
  });
});
