/**
 * processSessionFull — composed pipeline: derive → render → validate.
 *
 * Extends the base processSession pipeline by immediately rendering the output
 * with renderTemplates and running the SOP quality gate (validateRenderedSOP).
 *
 * Guarantees (inherited from each stage):
 * - Deterministic: same input always produces the same output
 * - Pure: no side effects, no I/O, no global state
 * - Never throws on validation failure — failure is in the returned
 *   `sopValidation` object (ok: false + structured diagnostic)
 * - Throws on invalid ProcessEngineInput, matching processSession behaviour
 *
 * Usage:
 *   const { output, artifacts, sopValidation } = processSessionFull(input);
 *   if (!sopValidation.ok) {
 *     console.warn(sopValidation.diagnostic);
 *   }
 *
 * Cross-reference: processSession.ts (derivation), renderTemplates (rendering),
 * validateRenderedSOP (quality gate — spec §8.1, docs/sop/QUALITY_RUBRIC.md §10).
 */

import type { ProcessEngineInput, ProcessOutput } from './types.js';
import type { RenderedArtifacts } from './templateTypes.js';
import type { SOPValidation } from './templates/sopValidator.js';
import type { TemplateOverrides } from './templateSelector.js';
import { processSession } from './processSession.js';
import { renderTemplates } from './templates/index.js';
import { validateRenderedSOP } from './templates/sopValidator.js';

// ─── Return type ─────────────────────────────────────────────────────────────

export interface ProcessSessionFullResult {
  /** Structured derivation output (ProcessRun, ProcessDefinition, ProcessMap, SOP). */
  output: ProcessOutput;
  /** Rendered template artifacts (processMap, sop, selection). */
  artifacts: RenderedArtifacts;
  /** Quality-gate result. ok: true passes; ok: false carries reason + diagnostic + suggestion. */
  sopValidation: SOPValidation;
}

// ─── Composed pipeline ───────────────────────────────────────────────────────

/**
 * Full process-engine pipeline: derive → render → validate.
 *
 * Composes processSession + renderTemplates + validateRenderedSOP into a single
 * call so callers do not have to wire the three stages themselves.
 *
 * @param input     - Validated session bundle (same contract as processSession).
 * @param overrides - Optional template overrides forwarded to renderTemplates.
 * @returns ProcessSessionFullResult containing output, artifacts, and sopValidation.
 * @throws  Same conditions as processSession (invalid input).
 */
export function processSessionFull(
  input: ProcessEngineInput,
  overrides?: TemplateOverrides,
): ProcessSessionFullResult {
  // Stage 1: derivation (throws on invalid input — same as processSession)
  const output = processSession(input);

  // Stage 2: rendering (deterministic; no throws)
  const artifacts = renderTemplates(output, overrides);

  // Stage 3: quality gate (never throws; failure in return value)
  const sopValidation = validateRenderedSOP(artifacts.sop, output);

  return { output, artifacts, sopValidation };
}
