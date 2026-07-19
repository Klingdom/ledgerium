/**
 * specificity.test.ts — Tests for the SVR metric module.
 *
 * Covers:
 *   - isVagueInstruction: exact-match and prefix-match detection
 *   - computeStepSpecificity: per-step vagueness counts + AUDIT-HONESTY IFF invariant
 *   - computeSopVagueness: aggregate SVR across full SOP
 *   - Boundary conditions: empty inputs, 0.5 threshold, determinism
 *
 * MEASURE-ONLY: these tests do NOT test validateRenderedSOP verdict changes —
 * that is guarded in sopValidator.test.ts.
 *
 * Reference: SOP_DETAIL_SPECIFICITY_REVIEW_001 §7, P0-b.
 */

import { describe, it, expect } from 'vitest';
import {
  isVagueInstruction,
  computeStepSpecificity,
  computeSopVagueness,
  VAGUE_INSTRUCTION_STRINGS,
  VAGUE_INSTRUCTION_PREFIXES,
} from './specificity.js';
import type { SOP, SOPStep, SOPInstruction } from './types.js';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

/** Minimal SOPInstruction. */
function makeInstruction(instruction: string): SOPInstruction {
  return {
    sequence: 1,
    instruction,
    eventType: 'interaction.click',
    sourceEventId: 'evt-test',
    isSensitive: false,
    redacted: false,
  };
}

/** Minimal SOPStep with given instructions. */
function makeStep(
  instructions: SOPInstruction[],
  overrides?: { ordinal?: number; stepId?: string },
): SOPStep {
  return {
    ordinal: overrides?.ordinal ?? 1,
    stepId: overrides?.stepId ?? 'step-1',
    title: 'Test step',
    category: 'single_action',
    action: 'Click something',
    instructions,
    detail: '',
    inputs: [],
    expectedOutcome: 'Action completed',
    warnings: [],
    durationLabel: '< 1 s',
    confidence: 0.9,
    sourceStepId: 'step-1',
  };
}

/** Minimal SOP with the given steps. */
function makeSop(steps: SOPStep[]): SOP {
  return {
    sopId: 'sop-test',
    title: 'Test SOP',
    version: '1.0.0',
    purpose: 'Test SVR metric determinism',
    scope: 'unit-test',
    systems: [],
    prerequisites: [],
    estimatedTime: '< 1 min',
    inputs: [],
    outputs: [],
    completionCriteria: [],
    steps,
    notes: [],
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** A clearly specific instruction — has a real label. */
const SPECIFIC = 'Click the Submit Invoice button';

// ─── Group A: isVagueInstruction — exact-match membership ────────────────────

describe('isVagueInstruction — exact-match vague strings', () => {
  it('classifies every entry in VAGUE_INSTRUCTION_STRINGS as vague', () => {
    // Verify every catalogued vague string is detected without exception.
    // This locks the catalogue against accidental removals.
    const missed: string[] = [];
    for (const s of VAGUE_INSTRUCTION_STRINGS) {
      if (!isVagueInstruction(s)) missed.push(s);
    }
    expect(missed).toEqual([]);
  });

  it('classifies "Click the button" as vague (semantic role, no label)', () => {
    expect(isVagueInstruction('Click the button')).toBe(true);
  });

  it('classifies "Submit the form" as vague (submit fallback, no label)', () => {
    expect(isVagueInstruction('Submit the form')).toBe(true);
  });

  it('classifies "Enter the required value" as vague (input fallback, no label/role)', () => {
    expect(isVagueInstruction('Enter the required value')).toBe(true);
  });

  it('classifies "Use keyboard shortcut" as vague (keyboard, always no label)', () => {
    expect(isVagueInstruction('Use keyboard shortcut')).toBe(true);
  });

  it('classifies "Application context changes" as vague (app context fallback)', () => {
    expect(isVagueInstruction('Application context changes')).toBe(true);
  });
});

// ─── Group B: isVagueInstruction — prefix-match detection ─────────────────────

describe('isVagueInstruction — prefix-match vague variants', () => {
  it('classifies "Click the target element on "Invoice Form"" as vague (page-context suffix)', () => {
    expect(isVagueInstruction('Click the target element on "Invoice Form"')).toBe(true);
  });

  it('classifies "Click the target element in Salesforce" as vague (app-context suffix)', () => {
    expect(isVagueInstruction('Click the target element in Salesforce')).toBe(true);
  });

  it('classifies "Enter the required value on "Checkout Page"" as vague (page suffix)', () => {
    expect(isVagueInstruction('Enter the required value on "Checkout Page"')).toBe(true);
  });

  it('classifies "Submit the form on "Payment Form"" as vague (page suffix)', () => {
    expect(isVagueInstruction('Submit the form on "Payment Form"')).toBe(true);
  });

  it('classifies "Submit using the button" as vague (role-context suffix)', () => {
    expect(isVagueInstruction('Submit using the button')).toBe(true);
  });

  it('classifies all entries in VAGUE_INSTRUCTION_PREFIXES as prefix-detected', () => {
    // Each prefix, extended with a token, must detect as vague.
    const missed: string[] = [];
    for (const prefix of VAGUE_INSTRUCTION_PREFIXES) {
      const sample = prefix + 'SomeTarget';
      if (!isVagueInstruction(sample)) missed.push(sample);
    }
    expect(missed).toEqual([]);
  });
});

// ─── Group C: isVagueInstruction — specific (non-vague) strings ───────────────

describe('isVagueInstruction — specific instructions return false', () => {
  it('returns false for a specific button click with label', () => {
    expect(isVagueInstruction('Click the Submit Invoice button')).toBe(false);
  });

  it('returns false for a specific input with quoted value', () => {
    expect(isVagueInstruction('Enter "john@example.com" in the email field')).toBe(false);
  });

  it('returns false for "Wait for system to finish processing" (wait instruction, not vague)', () => {
    // This is a specific wait instruction from sopBuilder.ts — NOT a vague fallback.
    expect(isVagueInstruction('Wait for system to finish processing')).toBe(false);
  });

  it('returns false for "Enter sensitive value (redacted per privacy policy)" (specific privacy instruction)', () => {
    // This is a privacy-policy-specific string from sopBuilder.ts, not a vague fallback.
    expect(isVagueInstruction('Enter sensitive value (redacted per privacy policy)')).toBe(false);
  });

  it('returns false for an empty string', () => {
    // Empty string is not in the vague catalogue.
    expect(isVagueInstruction('')).toBe(false);
  });

  it('returns false for a string that is a case-different variant (case-sensitive test)', () => {
    // Catalogue strings are case-sensitive — uppercase variant is NOT vague.
    expect(isVagueInstruction('CLICK THE BUTTON')).toBe(false);
  });

  it('returns false for banned recorder strings (they are not in the vague catalogue)', () => {
    // BANNED_RECORDER_STRINGS already FAIL validation. They are NOT in VAGUE_INSTRUCTION_STRINGS.
    // Vague strings are those that currently PASS but are low-value.
    expect(isVagueInstruction('Click the div')).toBe(false);
    expect(isVagueInstruction('Interact with element')).toBe(false);
    expect(isVagueInstruction('Perform action')).toBe(false);
  });
});

// ─── Group D: computeStepSpecificity — counts and boundary cases ──────────────

describe('computeStepSpecificity — step with no instructions (guard)', () => {
  it('returns specificity=1.0, vagueCount=0, totalCount=0, vague=false for empty step', () => {
    const step = makeStep([]);
    const result = computeStepSpecificity(step);
    expect(result.specificity).toBe(1.0);
    expect(result.vagueCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.vague).toBe(false);
  });
});

describe('computeStepSpecificity — all-specific step', () => {
  it('returns specificity=1.0, vagueCount=0 when no vague instructions', () => {
    const step = makeStep([
      makeInstruction(SPECIFIC),
      makeInstruction('Enter "acme" in the username field'),
    ]);
    const result = computeStepSpecificity(step);
    expect(result.specificity).toBe(1.0);
    expect(result.vagueCount).toBe(0);
    expect(result.totalCount).toBe(2);
    expect(result.vague).toBe(false);
  });
});

describe('computeStepSpecificity — all-vague step', () => {
  it('returns specificity=0.0, vagueCount=totalCount, vague=true when all instructions are vague', () => {
    const step = makeStep([
      makeInstruction('Click the button'),
      makeInstruction('Enter the required value'),
    ]);
    const result = computeStepSpecificity(step);
    expect(result.specificity).toBe(0.0);
    expect(result.vagueCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.vague).toBe(true);
  });
});

describe('computeStepSpecificity — exactly half vague (boundary: 0.5 is NOT vague)', () => {
  it('returns specificity=0.5, vague=false when exactly 1 of 2 instructions is vague', () => {
    // vague === (specificity < 0.50); 0.5 < 0.5 is false → vague=false
    const step = makeStep([
      makeInstruction('Click the button'),   // vague
      makeInstruction(SPECIFIC),             // specific
    ]);
    const result = computeStepSpecificity(step);
    expect(result.specificity).toBe(0.5);
    expect(result.vagueCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.vague).toBe(false);
  });
});

describe('computeStepSpecificity — majority vague (> 0.50)', () => {
  it('returns vague=true when 2 of 3 instructions are vague (specificity ≈ 0.333)', () => {
    const step = makeStep([
      makeInstruction('Click the button'),        // vague
      makeInstruction('Submit the form'),         // vague
      makeInstruction(SPECIFIC),                 // specific
    ]);
    const result = computeStepSpecificity(step);
    expect(result.vagueCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.specificity).toBeCloseTo(1 / 3);
    expect(result.vague).toBe(true);
  });
});

describe('computeStepSpecificity — AUDIT-HONESTY IFF invariant', () => {
  it('vague === true IFF specificity < 0.50 for all count combinations 0..5', () => {
    // Exhaustive grid: n instructions of which k are vague, k ∈ 0..n, n ∈ 0..5.
    // Verify the invariant holds for every combination.
    const violations: string[] = [];
    for (let n = 0; n <= 5; n++) {
      for (let k = 0; k <= n; k++) {
        const instructions: SOPInstruction[] = [
          ...Array(k).fill(null).map(() => makeInstruction('Click the button')),
          ...Array(n - k).fill(null).map(() => makeInstruction(SPECIFIC)),
        ];
        const step = makeStep(instructions);
        const result = computeStepSpecificity(step);
        const expectedVague = result.specificity < 0.50;
        if (result.vague !== expectedVague) {
          violations.push(`n=${n} k=${k}: vague=${result.vague} specificity=${result.specificity}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('stepId and ordinal are propagated verbatim from the input step', () => {
    const step = makeStep([makeInstruction(SPECIFIC)], { ordinal: 7, stepId: 'step-7' });
    const result = computeStepSpecificity(step);
    expect(result.stepId).toBe('step-7');
    expect(result.ordinal).toBe(7);
  });
});

describe('computeStepSpecificity — determinism', () => {
  it('returns byte-identical results on repeated calls with same input', () => {
    const step = makeStep([
      makeInstruction('Click the button'),
      makeInstruction(SPECIFIC),
      makeInstruction('Submit the form'),
    ]);
    const first = computeStepSpecificity(step);
    const second = computeStepSpecificity(step);
    expect(first).toEqual(second);
  });
});

// ─── Group E: computeSopVagueness — aggregate SVR ─────────────────────────────

describe('computeSopVagueness — empty SOP guard', () => {
  it('returns svr=0, vagueInstructionCount=0, totalInstructionCount=0 for SOP with no steps', () => {
    const sop = makeSop([]);
    const result = computeSopVagueness(sop);
    expect(result.svr).toBe(0);
    expect(result.vagueInstructionCount).toBe(0);
    expect(result.totalInstructionCount).toBe(0);
    expect(result.perStep).toEqual([]);
  });
});

describe('computeSopVagueness — all-specific SOP', () => {
  it('returns svr=0 when all instructions across all steps are specific', () => {
    const sop = makeSop([
      makeStep([makeInstruction(SPECIFIC), makeInstruction('Enter "value" in the email field')], { ordinal: 1, stepId: 's1' }),
      makeStep([makeInstruction('Click the Confirm button')], { ordinal: 2, stepId: 's2' }),
    ]);
    const result = computeSopVagueness(sop);
    expect(result.svr).toBe(0);
    expect(result.vagueInstructionCount).toBe(0);
    expect(result.totalInstructionCount).toBe(3);
  });
});

describe('computeSopVagueness — mixed vague across multiple steps', () => {
  it('computes correct SVR: vagueCount / totalCount', () => {
    // Step 1: 2 instructions, 1 vague → vagueCount=1
    // Step 2: 2 instructions, 2 vague → vagueCount=2
    // Total: 4 instructions, 3 vague → SVR = 3/4 = 0.75
    const sop = makeSop([
      makeStep([makeInstruction('Click the button'), makeInstruction(SPECIFIC)], { ordinal: 1, stepId: 's1' }),
      makeStep([makeInstruction('Submit the form'), makeInstruction('Enter the required value')], { ordinal: 2, stepId: 's2' }),
    ]);
    const result = computeSopVagueness(sop);
    expect(result.vagueInstructionCount).toBe(3);
    expect(result.totalInstructionCount).toBe(4);
    expect(result.svr).toBeCloseTo(0.75);
  });

  it('perStep array contains one entry per step in ordinal order', () => {
    const sop = makeSop([
      makeStep([makeInstruction('Click the button')], { ordinal: 1, stepId: 's1' }),
      makeStep([makeInstruction(SPECIFIC)], { ordinal: 2, stepId: 's2' }),
    ]);
    const result = computeSopVagueness(sop);
    expect(result.perStep).toHaveLength(2);
    expect(result.perStep[0]?.stepId).toBe('s1');
    expect(result.perStep[1]?.stepId).toBe('s2');
  });

  it('per-step vagueCount values sum to aggregate vagueInstructionCount', () => {
    const sop = makeSop([
      makeStep([makeInstruction('Click the button'), makeInstruction('Submit the form')], { ordinal: 1, stepId: 's1' }),
      makeStep([makeInstruction(SPECIFIC), makeInstruction('Enter the required value')], { ordinal: 2, stepId: 's2' }),
    ]);
    const result = computeSopVagueness(sop);
    const perStepSum = result.perStep.reduce((n, s) => n + s.vagueCount, 0);
    expect(perStepSum).toBe(result.vagueInstructionCount);
  });
});

describe('computeSopVagueness — determinism', () => {
  it('returns byte-identical results on repeated calls with the same SOP', () => {
    const sop = makeSop([
      makeStep([makeInstruction('Click the button'), makeInstruction(SPECIFIC)], { ordinal: 1, stepId: 's1' }),
      makeStep([makeInstruction('Submit the form'), makeInstruction('Use keyboard shortcut')], { ordinal: 2, stepId: 's2' }),
    ]);
    const first = computeSopVagueness(sop);
    const second = computeSopVagueness(sop);
    expect(first).toEqual(second);
  });
});
