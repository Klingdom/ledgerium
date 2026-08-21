/**
 * Step Vagueness Rate (SVR) — deterministic specificity measurement for
 * rendered SOP steps and instructions.
 *
 * Ships the P0-b measurement gate from
 * docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md RC-4 / §5: the existing SOP
 * quality gate (`sopValidator.ts`) bans a small hardcoded set of recorder
 * artifact strings but "measures nothing about specificity." This module
 * replaces whack-a-mole string banning with a structural, deterministic
 * measurement grounded in three signals defined by the UX specificity rubric
 * (docs/meta/SOP_SPECIFICITY_REVIEW/ux_analysis.md §1):
 *
 *   Signal 1 — Object:   what to interact with (the named element/field)
 *   Signal 2 — Location: where in the application (system/app context)
 *   Signal 3 — Result:   what changes after the action (expected outcome)
 *
 * A step detail is "specific enough" when it names >= 2 of the 3 signals
 * (CEO directive, mirrored from the UX rubric's six-tier table). This module
 * measures; it does not decide what to do about the number. Nothing here
 * changes SOP generation output.
 *
 * ─── Design decisions & deviations from the six-tier UX table ───────────────
 *
 * 1. Structural signals over string matching, WITH ONE OVERRIDE. `hasObject`
 *    is derived from the already-computed `SOPInstruction.targetLabel` field
 *    (populated by `sopBuilder.ts::safeTargetLabel`), not from regex-matching
 *    instruction text. This is the fix for RC-4's actual defect:
 *    `sopValidator.ts`'s banned-string list bans strings the system never
 *    emits ("Click the div") and misses the ones it does ("Click the target
 *    element"). A structural signal tracks future degradation-ladder changes
 *    in `sopBuilder.ts` automatically; a string list does not.
 *
 *    THE OVERRIDE (load-bearing — do not remove without re-reading this
 *    note): `instruction.system` and `step.expectedOutcome` are populated by
 *    `sopBuilder.ts` almost unconditionally whenever `page_context` /
 *    `completionCondition` exist at all — independent of whether the
 *    instruction TEXT itself is the bottom-rung vague fallback. Measured
 *    directly: `single-action-no-label` (the canonical no-label fixture)
 *    renders `'Click the target element on "Page"'` — a confirmed
 *    graded-fallback string — yet still carries `instruction.system = 'App'`
 *    and a non-empty `step.expectedOutcome` (both populated regardless of the
 *    fallback). Scoring Location and Result independently of the fallback
 *    match would make Signals 2+3 satisfy the >=2-of-3 bar on their own,
 *    which measured 0% SVR across all 12 golden fixtures at first
 *    implementation — a metric that never fires is not a measurement.
 *    Per the UX rubric's own Tier 6 definition ("HTML term / None / None" —
 *    docs/meta/SOP_SPECIFICITY_REVIEW/ux_analysis.md §1), a confirmed
 *    graded-fallback match means the instruction asserts NOTHING — so this
 *    module forces `hasObject = hasLocation = hasResult = false` whenever
 *    `isVagueInstructionText()` matches, regardless of what the step's other
 *    fields happen to carry. This is the correct reading of Tier 6, not a
 *    special case bolted on to make numbers move.
 *
 * 2. `isVagueInstructionText` (the confirmed graded-fallback set — 9 exact
 *    strings + 5 dynamic-suffix prefixes, verified line-by-line against
 *    `sopBuilder.ts::deriveInstruction` on 2026-08-13) is a load-bearing
 *    PRIMARY signal for the override above, not a whack-a-mole addition —
 *    see decision 1. It is intentionally NOT meant to be extended ad hoc:
 *    if a new structurally-general gap appears in `sopBuilder.ts`, prefer
 *    widening the structural signal (`targetLabel`/`system`/`expectedOutcome`
 *    presence) so future degradation-ladder changes are tracked
 *    automatically, and reserve this list for confirmed, source-verified
 *    fallback strings only.
 *
 * 3. Collapsed six tiers to a binary "specific enough" test. The UX table
 *    ranks Tier 3 ("Located" — object only) above Tier 4 ("Generic" —
 *    location only), because a named object with no location is more
 *    actionable than a location with no object. Both tiers carry exactly one
 *    of three signals. The CEO directive's literal rule is a *count*
 *    (">= 2 of 3"), not a weighted rank — under that count, Tier 3 and
 *    Tier 4 are equally "not specific enough." This module preserves the
 *    full six-tier label for diagnostic/reporting purposes (`tier` field,
 *    `SPECIFICITY_TIER_LABELS`) but the boolean `vague` gate is governed
 *    strictly by the >=2-of-3 count, per the literal directive.
 *
 * 4. Signal 3 (Result) is measured as "is `expectedOutcome` non-empty," not
 *    "is `expectedOutcome` a genuine, non-boilerplate derivation." The
 *    latter is RC-5 (per-step purpose/outcome derive-or-null), explicitly a
 *    separate, out-of-scope backlog item. Today `buildExpectedOutcome()`
 *    always returns a non-empty string outside the fallback-override case
 *    above — an honest, documented limitation, not a bug: today's SVR is
 *    driven mostly by whether an instruction hits the confirmed
 *    graded-fallback set (decision 1) plus Signal 1 (object), and will start
 *    doing more diagnostic work on genuinely-labelled-but-shallow steps once
 *    RC-5 ships (`expectedOutcome` becoming legitimately empty when no
 *    honest derivation is possible).
 *
 * 5. Scope: every instruction present in `SOPStep.instructions` is included
 *    in the SVR denominator, matching the review's literal formula
 *    (`vague_instruction_count / total_instruction_count`). Non-interactive
 *    instruction types (system/navigation narration) are scored by the same
 *    3-signal test; most carry no `targetLabel` (no object concept applies)
 *    but do carry real location/result signals and are not, in general,
 *    members of the confirmed graded-fallback set — so they are frequently
 *    NOT vague under this metric even without an object. This is treated as
 *    an honest reflection of reader-actionability for genuinely
 *    non-interactive narration (you know *where* and *what changes*, even
 *    with nothing to click), distinct from the override in decision 1, which
 *    applies only when the confirmed fallback set actually matches.
 *
 * Determinism contract: every function in this module is pure. No
 * `Date.now()`, `Math.random()`, or I/O. Same input -> byte-identical
 * output, always.
 *
 * Source of the confirmed graded-fallback set: `sopBuilder.ts`'s
 * `deriveInstruction()`, re-verified against source on 2026-08-13 against
 * the claim in docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §5 ("9
 * patterns + 5 page-appended prefix variants") — independently re-derived
 * and confirmed to match exactly. Re-verified again on 2026-08-20 after
 * harvesting the P0-c render-layer fixes (§4/§7 B1/B3/B4) from the parked
 * `chore/process-engine-specificity-wip` branch (commit e9f13bf) onto
 * `deriveInstruction()` / `buildAction()` — only one entry in
 * VAGUE_INSTRUCTION_PREFIXES needed updating (the B1 rename); see that
 * constant's doc comment for why the rename still counts as a confirmed
 * fallback under its new text. Exact line numbers are intentionally not
 * cited here (they drift with every edit); the function name is the stable
 * anchor.
 */

import type { SOP, SOPStep, SOPInstruction } from './types.js';

// ─── Named thresholds ─────────────────────────────────────────────────────────

/**
 * A step is treated as low-confidence when its `confidence` falls below this
 * value. Mirrors the `lowDataFlag` pattern in the orphan `intent-inference`
 * package (`normalizedLabelConfidence < 0.55 IFF lowDataFlag`) — see the
 * "Reconciliation with lowDataFlag" note in this file's module doc below.
 * Deliberately distinct from `QualityIndicators.lowConfidenceStepCount`'s
 * pre-existing 0.7 threshold (contentEnricher.ts) — that is a different,
 * already-shipped quality signal; this constant is scoped only to the SVR
 * vague-instruction formula per the review's §5 definition.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.55 as const;

/**
 * A step or instruction is "vague" when its specificity score is strictly
 * below this value. With three equally-weighted signals (1/3 each), a
 * specificity of exactly 1/3 (one signal) is 0.333 and two signals is 0.667
 * — 0.50 is the only threshold value that cleanly separates ">=2 signals"
 * from "<=1 signal" per the CEO directive's literal count rule.
 */
export const SPECIFICITY_THRESHOLD = 0.5 as const;

// ─── Confirmed graded-fallback instruction-text set ──────────────────────────

/**
 * Exact-match bottom-rung instruction strings — the literal text
 * `deriveInstruction()` returns when no object signal (label or meaningful
 * role) is available at all, for interaction/upload/download/drag/select/
 * keyboard event types. Verified against `sopBuilder.ts::deriveInstruction`
 * line by line on 2026-08-13; re-verified 2026-08-20 (P0-c harvest touched
 * only the `Click ...` fallbacks — see VAGUE_INSTRUCTION_PREFIXES below —
 * none of these exact-match strings changed).
 */
export const VAGUE_INSTRUCTION_STRINGS: readonly string[] = [
  'Click the target element',
  'Enter the required value',
  'Submit the form',
  'Select the required option',
  'Use keyboard shortcut',
  'Upload the required file',
  'Download the file',
  'Drag element to target',
  'Release at target location',
] as const;

/**
 * Prefix-match variants of the bare fallback strings above, produced when a
 * page title or application label is available but no object signal is.
 * These carry a dynamic suffix (`${pageLabel}` / `${page.applicationLabel}`)
 * so they cannot be exact-matched; they are matched by prefix instead.
 * Verified against `sopBuilder.ts:296-330` on 2026-08-13; re-verified on
 * 2026-08-20 after harvesting the P0-c render-layer fixes from the parked
 * `chore/process-engine-specificity-wip` branch.
 *
 * `'Click in '` (re-verification note, 2026-08-20): P0-c B1 renamed
 * `deriveInstruction()`'s applicationLabel-only click fallback from
 * `` `Click the target element in ${app}` `` to `` `Click in ${app}` `` —
 * dropping the redundant "the target element" phrase. This is a WORDING
 * change only: the fallback still asserts zero object signal (no label, no
 * semantic role), so it must remain a confirmed graded-fallback under its
 * new text, not silently drop out of this list. Letting a rename alone
 * improve the SVR would fake an improvement — the reader still doesn't know
 * WHAT to click, only that the app is named. This entry replaces (not
 * supplements) the pre-B1 `'Click the target element in '` prefix, which
 * `sopBuilder.ts` no longer emits.
 */
export const VAGUE_INSTRUCTION_PREFIXES: readonly string[] = [
  'Click the target element on "',
  'Click in ',
  'Enter the required value on "',
  'Enter the required value in ',
  'Submit the form on "',
] as const;

/**
 * True when `text` is exactly one of the confirmed bottom-rung fallback
 * strings, or starts with one of the dynamic-suffix prefixes. This is a
 * SECONDARY correction layer — see module doc decision #2. Do not extend
 * this list to chase individual output strings; extend the structural
 * signal instead.
 */
export function isVagueInstructionText(text: string): boolean {
  if (VAGUE_INSTRUCTION_STRINGS.includes(text)) return true;
  return VAGUE_INSTRUCTION_PREFIXES.some(prefix => text.startsWith(prefix));
}

// ─── Tier classification (UX rubric §1) ──────────────────────────────────────

export type SpecificityTier = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Human-readable tier names, matching
 * docs/meta/SOP_SPECIFICITY_REVIEW/ux_analysis.md §1's six-tier table.
 * For reporting/diagnostics only — the `vague` boolean gate does not use
 * tier rank (see module doc decision #3).
 */
export const SPECIFICITY_TIER_LABELS: Readonly<Record<SpecificityTier, string>> = {
  1: 'Specific',
  2: 'Partial',
  3: 'Located',
  4: 'Generic',
  5: 'Weak',
  6: 'Unusable',
};

// ─── Instruction-level specificity ───────────────────────────────────────────

/** Minimal step-shaped context an instruction needs to be scored. */
export interface SpecificityStepContext {
  system?: string | undefined;
  expectedOutcome: string;
}

export interface InstructionSpecificity {
  /** Signal 1 — names the object (element/field) being acted on. */
  hasObject: boolean;
  /** Signal 2 — names the location (system/app context). */
  hasLocation: boolean;
  /** Signal 3 — names the expected result of the action. */
  hasResult: boolean;
  /** Count of signals present, 0–3. */
  signalCount: 0 | 1 | 2 | 3;
  /** signalCount / 3. */
  specificity: number;
  /** Six-tier classification per the UX rubric — diagnostic only. */
  tier: SpecificityTier;
  /**
   * Audit-honesty IFF invariant: `vague === true` IFF
   * `specificity < SPECIFICITY_THRESHOLD` (equivalently, IFF signalCount <= 1).
   */
  vague: boolean;
}

/**
 * Scores a single SOP instruction against the three-signal rubric.
 *
 * Pure and deterministic — same instruction + step context always produces
 * the same result object.
 */
export function computeInstructionSpecificity(
  instruction: Pick<SOPInstruction, 'instruction' | 'targetLabel' | 'system'>,
  step: SpecificityStepContext,
): InstructionSpecificity {
  const textIsVague = isVagueInstructionText(instruction.instruction);

  // Override (module doc decision #1): a confirmed graded-fallback match
  // asserts nothing about object, location, or result — Tier 6 per the UX
  // rubric ("HTML term / None / None") — regardless of what
  // instruction.system / step.expectedOutcome independently carry.
  const hasObject = !textIsVague && Boolean(instruction.targetLabel);
  const hasLocation = !textIsVague && (Boolean(instruction.system) || Boolean(step.system));
  const hasResult =
    !textIsVague && Boolean(step.expectedOutcome && step.expectedOutcome.trim().length > 0);

  const signalCount = ((hasObject ? 1 : 0) + (hasLocation ? 1 : 0) + (hasResult ? 1 : 0)) as
    | 0
    | 1
    | 2
    | 3;
  const specificity = signalCount / 3;

  let tier: SpecificityTier;
  if (textIsVague) {
    tier = 6;
  } else if (hasObject) {
    tier = hasLocation ? (hasResult ? 1 : 2) : 3;
  } else {
    tier = hasLocation ? 4 : 5;
  }

  const vague = specificity < SPECIFICITY_THRESHOLD;

  return { hasObject, hasLocation, hasResult, signalCount, specificity, tier, vague };
}

// ─── Step-level specificity ──────────────────────────────────────────────────

export interface StepSpecificity {
  stepOrdinal: number;
  instructions: InstructionSpecificity[];
  totalInstructionCount: number;
  /** Mean of instructions[].specificity. 0 when there are no instructions. */
  averageSpecificity: number;
  /**
   * Audit-honesty IFF invariant: `vague === true` IFF
   * `averageSpecificity < SPECIFICITY_THRESHOLD`.
   */
  vague: boolean;
  /**
   * Separate low-confidence signal (`step.confidence < LOW_CONFIDENCE_THRESHOLD`).
   * Deliberately NOT folded into `vague` above — that keeps this field's IFF
   * invariant literal and independently testable. `computeSopVagueness`
   * combines this with per-instruction `vague` via OR, matching the review's
   * §5 SVR formula.
   */
  lowConfidence: boolean;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Scores every instruction in a step and aggregates to a step-level result.
 *
 * Pure and deterministic.
 */
export function computeStepSpecificity(step: SOPStep): StepSpecificity {
  const ctx: SpecificityStepContext = {
    system: step.system,
    expectedOutcome: step.expectedOutcome,
  };
  const instructions = step.instructions.map(instruction =>
    computeInstructionSpecificity(instruction, ctx),
  );
  const totalInstructionCount = instructions.length;
  const averageSpecificity =
    totalInstructionCount > 0
      ? round4(instructions.reduce((sum, i) => sum + i.specificity, 0) / totalInstructionCount)
      : 0;

  return {
    stepOrdinal: step.ordinal,
    instructions,
    totalInstructionCount,
    averageSpecificity,
    vague: averageSpecificity < SPECIFICITY_THRESHOLD,
    lowConfidence: step.confidence < LOW_CONFIDENCE_THRESHOLD,
  };
}

// ─── SOP-level Step Vagueness Rate (SVR) ─────────────────────────────────────

export interface SopVagueness {
  /**
   * Instructions counted vague: their own `vague` flag is true, OR their
   * parent step's confidence is below `LOW_CONFIDENCE_THRESHOLD` — matching
   * docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §5's formula exactly.
   */
  vagueInstructionCount: number;
  totalInstructionCount: number;
  /**
   * Step Vagueness Rate = vagueInstructionCount / totalInstructionCount.
   * Guarded to 0 when totalInstructionCount is 0 (no instructions to score —
   * distinct from "0% vague"; callers that need to distinguish the two
   * should check `totalInstructionCount === 0` directly).
   */
  svr: number;
  stepCount: number;
  /** Steps whose own averageSpecificity is vague OR whose confidence is low. */
  vagueStepCount: number;
}

/**
 * Computes the Step Vagueness Rate for a full rendered SOP.
 *
 * Pure and deterministic — same SOP object always produces the same result.
 * Report-only: this function has no gating behavior; callers decide what
 * (if anything) to do with the number.
 */
export function computeSopVagueness(sop: Pick<SOP, 'steps'>): SopVagueness {
  let vagueInstructionCount = 0;
  let totalInstructionCount = 0;
  let vagueStepCount = 0;

  for (const step of sop.steps) {
    const stepSpec = computeStepSpecificity(step);
    totalInstructionCount += stepSpec.totalInstructionCount;

    for (const instructionSpec of stepSpec.instructions) {
      if (instructionSpec.vague || stepSpec.lowConfidence) vagueInstructionCount++;
    }

    if (stepSpec.vague || stepSpec.lowConfidence) vagueStepCount++;
  }

  const svr = totalInstructionCount > 0 ? round4(vagueInstructionCount / totalInstructionCount) : 0;

  return {
    vagueInstructionCount,
    totalInstructionCount,
    svr,
    stepCount: sop.steps.length,
    vagueStepCount,
  };
}

/**
 * Reconciliation with the existing `lowDataFlag` self-declaration
 * (`packages/intent-inference/src/confidence-scorer.ts`):
 *
 * `intent-inference` is an orphan package — no other package in this
 * monorepo imports from it (verified 2026-08-13: zero
 * `@ledgerium/intent-inference` references outside its own package.json).
 * It is not wired into the normalization/segmentation/process-engine
 * pipeline that produces the `SOP` this module scores. There is nothing to
 * "build on" in the literal sense of calling its code.
 *
 * What IS reused is its *pattern*: `lowDataFlag` is a boolean derived from a
 * confidence score via a documented, tested audit-honesty IFF invariant
 * (`lowDataFlag === true IFF confidence < 0.55`). This module's `vague`
 * fields follow the identical shape and the identical 0.55 confidence
 * threshold (`LOW_CONFIDENCE_THRESHOLD`) for the step-level low-confidence
 * signal, deliberately choosing consistency with that existing convention
 * over inventing a new threshold. If `intent-inference` is ever wired into
 * this pipeline, its `lowDataFlag` and this module's step-level
 * `lowConfidence` would already share both the semantics and the constant.
 */
