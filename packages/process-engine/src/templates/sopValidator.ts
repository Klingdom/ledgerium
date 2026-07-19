/**
 * SOP quality gate — rejects poor rendered output before it reaches end users.
 *
 * Rules are evaluated in declaration order; the first failure wins.
 * Returns a structured result — never throws. Throwing is the caller's policy.
 *
 * Sources:
 *   - Gap #8 in docs/sop/IMPLEMENTATION_NOTES.md
 *   - Anti-patterns in docs/sop/QUALITY_RUBRIC.md §10
 *   - Banned strings in docs/sop/TRANSFORMATION_RULES.md §5.1
 */

import type { RenderedSOP } from '../templateTypes.js';
import type { ProcessOutput } from '../types.js';
import { renderSOPMarkdown } from './markdownRenderer.js';
import { computeSopVagueness } from '../specificity.js';
import type { SopVaguenessResult } from '../specificity.js';

// ─── Named constants ─────────────────────────────────────────────────────────

/**
 * Recorder-generated artifact strings that must never appear in a rendered SOP.
 *
 * Source: TRANSFORMATION_RULES.md §5.1 lines 121–124.
 * Note: IMPLEMENTATION_NOTES.md Gap #8 lists 7 strings and omits "Click the section".
 * TRANSFORMATION_RULES.md §5.1 is the authoritative source and includes all 8.
 * This implementation follows TRANSFORMATION_RULES.md §5.1 (the richer spec).
 */
const BANNED_RECORDER_STRINGS: readonly string[] = [
  'Click the div',
  'Click the span',
  'Click the svg',
  'Click the p',
  'Click the li',
  'Click the section',
  'Interact with element',
  'Perform action',
] as const;

const MIN_STEP_COUNT = 2 as const;

/**
 * Rejects generic document-management placeholder titles.
 * Examples: "Workflow 1", "Untitled Process", "workflow", "Untitled Workflow 42"
 */
const GENERIC_TITLE_REGEX = /^(Workflow|Untitled Process|Untitled Workflow)\s*\d*$/i;

/**
 * Rejects boilerplate purpose prose that scores 0 in QUALITY_RUBRIC.md §4.1.
 */
const PROSE_ONLY_PURPOSE_PREFIX = 'This SOP describes ';

// ─── Result type ─────────────────────────────────────────────────────────────

export type SOPValidation =
  | { ok: true; specificity?: SopVaguenessResult }
  | { ok: false; reason: string; diagnostic: string; suggestion: string };

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the document-level title for any RenderedSOP variant.
 */
function resolveTitle(rendered: RenderedSOP): string {
  if (rendered.templateType === 'operator_centric') {
    return rendered.taskTitle;
  }
  return rendered.title;
}

/**
 * Returns the top-level purpose / what-this-is-for string for any RenderedSOP variant.
 * Returns an empty string when the field is absent.
 */
function resolvePurpose(rendered: RenderedSOP): string {
  if (rendered.templateType === 'operator_centric') {
    return rendered.whatThisIsFor;
  }
  if (rendered.templateType === 'enterprise') {
    return rendered.purpose;
  }
  // decision_based
  return rendered.purpose;
}

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * Validates a rendered SOP against quality-gate rules.
 *
 * Rules (first failure wins):
 *   1. No banned recorder artifacts in the rendered Markdown.
 *   2. Minimum step count (≥ 2) in output.sop.steps.
 *   3. Every step must have at least one evidence instruction.
 *   4. Every step must have a non-empty expectedOutcome.
 *   5. [bonus] Title must not match generic placeholder patterns.
 *   6. [bonus] Purpose must not begin with the boilerplate prefix.
 *
 * @param rendered - The RenderedSOP produced by the template renderer.
 * @param output   - The full ProcessOutput, used to inspect SOP step data.
 * @returns SOPValidation — ok: true on success, structured error otherwise.
 */
export function validateRenderedSOP(
  rendered: RenderedSOP,
  output: ProcessOutput,
): SOPValidation {
  const markdown = renderSOPMarkdown(rendered);

  // ── Rule 1: banned recorder artifacts ────────────────────────────────────
  for (const banned of BANNED_RECORDER_STRINGS) {
    if (markdown.includes(banned)) {
      return {
        ok: false,
        reason: 'banned_recorder_artifact',
        diagnostic: `Rendered SOP contains banned string "${banned}". Check label-resolution ladder in sopBuilder.ts.`,
        suggestion: `Investigate the source event — its target_summary.label or role was likely missing.`,
      };
    }
  }

  // ── Rule 2: minimum step count ────────────────────────────────────────────
  const stepCount = output.sop.steps.length;
  if (stepCount < MIN_STEP_COUNT) {
    return {
      ok: false,
      reason: 'too_few_steps',
      diagnostic: `SOP has ${stepCount} step(s); minimum is ${MIN_STEP_COUNT}.`,
      suggestion: `Re-record the workflow with more actions.`,
    };
  }

  // ── Rule 3: evidence present everywhere ───────────────────────────────────
  for (const step of output.sop.steps) {
    if (step.instructions.length === 0) {
      return {
        ok: false,
        reason: 'step_has_no_evidence',
        diagnostic: `Step ${step.ordinal} ("${step.title}") has no evidence events.`,
        suggestion: `Investigate segmentation — the step was created but no actionable events populated it.`,
      };
    }
  }

  // ── Rule 4: empty expected outcomes ───────────────────────────────────────
  const emptyExpected = output.sop.steps.filter(s => !s.expectedOutcome).length;
  if (emptyExpected > 0) {
    return {
      ok: false,
      reason: 'empty_expected_outcomes',
      diagnostic: `${emptyExpected} step(s) have no expected outcome.`,
      suggestion: `Review contentEnricher.ts expected-outcome generation.`,
    };
  }

  // ── Rule 5 (bonus): generic titles ────────────────────────────────────────
  const title = resolveTitle(rendered);
  if (GENERIC_TITLE_REGEX.test(title)) {
    return {
      ok: false,
      reason: 'generic_title',
      diagnostic: `SOP title "${title}" matches the generic-placeholder pattern.`,
      suggestion: `Give the SOP a specific, business-meaningful title describing the actual workflow.`,
    };
  }

  // ── Rule 6 (bonus): prose-only purpose ────────────────────────────────────
  const purpose = resolvePurpose(rendered);
  if (purpose.toLowerCase().startsWith(PROSE_ONLY_PURPOSE_PREFIX.toLowerCase())) {
    return {
      ok: false,
      reason: 'prose_only_purpose',
      diagnostic: `SOP purpose begins with the boilerplate prefix "${PROSE_ONLY_PURPOSE_PREFIX}".`,
      suggestion: `Rewrite the purpose as a specific, business-meaningful statement (see QUALITY_RUBRIC.md §4.1 high example).`,
    };
  }

  return { ok: true, specificity: computeSopVagueness(output.sop) };
}
