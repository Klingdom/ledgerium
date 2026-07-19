/**
 * specificity.ts — Step Vagueness Rate (SVR) metric for Ledgerium SOPs.
 *
 * SVR = vagueInstructionCount / totalInstructionCount  (guard → 0 if totalInstructionCount === 0)
 *
 * A "vague instruction" is one produced by a last-resort fallback in
 * sopBuilder.ts because the captured event lacked a target label.  These
 * strings currently PASS all quality-gate rules (they are NOT in
 * BANNED_RECORDER_STRINGS) but carry low informational value for the
 * end user.
 *
 * MEASURE-ONLY: this module never mutates, rejects, or re-routes any SOP.
 * It is attached to validateRenderedSOP as an observability annotation only.
 *
 * DETERMINISM CONTRACT: same input → byte-identical output.
 * No clock, randomness, LLM, or I/O inside this module.
 *
 * Sources (P0-b, SOP_DETAIL_SPECIFICITY_REVIEW_001 §7):
 *   sopBuilder.ts deriveInstruction() fallback ladder — each case's last-resort
 *   branch and semantic-role / input-role template strings.
 */

import type { SOP, SOPStep } from './types.js';

// ─── Vague string catalogue ───────────────────────────────────────────────────

/**
 * Exact-match set of fallback instruction strings produced by sopBuilder.ts
 * when a captured event had no usable target label.
 *
 * All entries currently PASS validateRenderedSOP (they are NOT in
 * BANNED_RECORDER_STRINGS) but provide low informational value.
 *
 * Sources: sopBuilder.ts deriveInstruction() cases:
 *   interaction.click (SEMANTIC_ROLES + last-resort), interaction.input_change
 *   (INPUT_ROLES + last-resort), interaction.submit, interaction.select,
 *   interaction.keyboard_shortcut, interaction.upload_file,
 *   interaction.download_file, interaction.drag_started,
 *   interaction.drag_completed, navigation.open_page, navigation.route_change,
 *   navigation.tab_activated, navigation.app_context_changed.
 */
export const VAGUE_INSTRUCTION_STRINGS: ReadonlySet<string> = new Set([
  // interaction.click — semantic role known but no label (SEMANTIC_ROLES ladder)
  'Click the button',
  'Click the link',
  'Click the tab',
  'Click the menuitem',
  'Click the option',
  'Click the checkbox',
  'Click the radio',
  'Click the switch',
  'Click the combobox',
  'Click the listbox',
  'Click the textbox',
  // interaction.click — no label, no role, no page context (absolute last resort)
  'Click the target element',
  // interaction.input_change — role known but no label (INPUT_ROLES ladder)
  'Enter value in the textbox field',
  'Enter value in the combobox field',
  'Enter value in the spinbutton field',
  'Enter value in the searchbox field',
  'Enter value in the input field',
  // interaction.input_change — no label, no role, no page context (absolute last resort)
  'Enter the required value',
  // interaction.submit — no label, no role, no page context (absolute last resort)
  'Submit the form',
  // interaction.select — no label, no role (last resort)
  'Select the required option',
  // interaction.keyboard_shortcut — always vague (no label-based variant exists)
  'Use keyboard shortcut',
  // interaction.upload_file — no label (last resort)
  'Upload the required file',
  // interaction.download_file — no label (last resort)
  'Download the file',
  // interaction.drag_started — no label (last resort)
  'Drag element to target',
  // interaction.drag_completed — no label (last resort)
  'Release at target location',
  // navigation.open_page — no destination (last resort)
  'Wait for page to load',
  // navigation.route_change — no destination (last resort)
  'Page route updates',
  // navigation.tab_activated — no destination (last resort)
  'Switch browser tab',
  // navigation.app_context_changed — no applicationLabel (last resort)
  'Application context changes',
]);

/**
 * Prefix-match strings for page-context-appended and role-appended vague variants.
 *
 * An instruction matches when it starts with any of these prefixes
 * (case-sensitive — strings are produced deterministically by sopBuilder.ts).
 *
 * Examples:
 *   'Click the target element on "Invoice Form"'  → matches 'Click the target element on '
 *   'Enter the required value in Salesforce'      → matches 'Enter the required value in '
 *   'Submit using the button'                     → matches 'Submit using the '
 */
export const VAGUE_INSTRUCTION_PREFIXES: readonly string[] = [
  // interaction.click — page-context variants (no label, page/app appended)
  'Click the target element on ',
  'Click the target element in ',
  // interaction.input_change — page-context variants
  'Enter the required value on ',
  'Enter the required value in ',
  // interaction.submit — page-context and role-context variants
  'Submit the form on ',
  'Submit using the ',
  // interaction.select — role-context variant (e.g. 'Select from the combobox')
  'Select from the ',
  // interaction.input_change — role-page variant (e.g. 'Enter value in the textbox field on "Form"')
  'Enter value in the ',
];

// ─── Result types ─────────────────────────────────────────────────────────────

/** Specificity measurement for a single SOP step. */
export interface StepSpecificityResult {
  /** Step identifier (from SOPStep.stepId). */
  stepId: string;
  /** Ordinal position (from SOPStep.ordinal). */
  ordinal: number;
  /**
   * Fraction of instructions that are NOT vague.
   * Range: 0.0 – 1.0.
   * Guard: 1.0 when totalCount === 0 (no instructions → not measurably vague).
   */
  specificity: number;
  /** Number of vague instructions in this step. */
  vagueCount: number;
  /** Total number of instructions in this step. */
  totalCount: number;
  /**
   * AUDIT-HONESTY IFF INVARIANT: `vague === true` IFF `specificity < 0.50`.
   * Flag is set when more than half the instructions in this step are vague.
   */
  vague: boolean;
}

/** Aggregate vagueness measurement for a complete SOP. */
export interface SopVaguenessResult {
  /**
   * Step Vagueness Rate: vagueInstructionCount / totalInstructionCount.
   * Guard: 0 when totalInstructionCount === 0 (no instructions → treat as specific).
   */
  svr: number;
  /** Total vague instruction count across all steps. */
  vagueInstructionCount: number;
  /** Total instruction count across all steps. */
  totalInstructionCount: number;
  /** Per-step breakdown, in step ordinal order. */
  perStep: StepSpecificityResult[];
}

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Returns true when `instruction` is a known vague fallback string produced
 * by sopBuilder.ts when a captured event had no usable target label.
 *
 * Detection order:
 *   1. Exact membership in VAGUE_INSTRUCTION_STRINGS (O(1) Set lookup).
 *   2. Prefix match against each VAGUE_INSTRUCTION_PREFIXES entry (sequential scan).
 *
 * Case-sensitive — sopBuilder.ts strings are produced deterministically.
 * Pure function: no state, no clock, no randomness, no I/O.
 */
export function isVagueInstruction(instruction: string): boolean {
  if (VAGUE_INSTRUCTION_STRINGS.has(instruction)) return true;
  for (const prefix of VAGUE_INSTRUCTION_PREFIXES) {
    if (instruction.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Computes the specificity measurement for a single SOP step.
 *
 * @param step - A SOPStep with zero or more instructions.
 * @returns StepSpecificityResult with counts and derived flags.
 *
 * Pure function; deterministic.
 */
export function computeStepSpecificity(step: SOPStep): StepSpecificityResult {
  const totalCount = step.instructions.length;

  if (totalCount === 0) {
    // Guard: no instructions → cannot measure vagueness; treat as fully specific.
    return {
      stepId: step.stepId,
      ordinal: step.ordinal,
      specificity: 1.0,
      vagueCount: 0,
      totalCount: 0,
      vague: false, // 1.0 < 0.50 is false → AUDIT-HONESTY IFF INVARIANT holds
    };
  }

  const vagueCount = step.instructions.filter(
    inst => isVagueInstruction(inst.instruction),
  ).length;

  const specificity = (totalCount - vagueCount) / totalCount;

  return {
    stepId: step.stepId,
    ordinal: step.ordinal,
    specificity,
    vagueCount,
    totalCount,
    vague: specificity < 0.50, // AUDIT-HONESTY IFF INVARIANT
  };
}

/**
 * Computes the Step Vagueness Rate (SVR) for a complete SOP.
 *
 * SVR = vagueInstructionCount / totalInstructionCount
 * Guard: 0 when totalInstructionCount === 0.
 *
 * @param sop - The SOP to measure (from ProcessOutput.sop).
 * @returns SopVaguenessResult with aggregate SVR and per-step breakdown.
 *
 * Pure function; deterministic.
 */
export function computeSopVagueness(sop: SOP): SopVaguenessResult {
  const perStep = sop.steps.map(computeStepSpecificity);

  const totalInstructionCount = perStep.reduce((sum, s) => sum + s.totalCount, 0);
  const vagueInstructionCount = perStep.reduce((sum, s) => sum + s.vagueCount, 0);

  const svr =
    totalInstructionCount === 0 ? 0 : vagueInstructionCount / totalInstructionCount;

  return {
    svr,
    vagueInstructionCount,
    totalInstructionCount,
    perStep,
  };
}
