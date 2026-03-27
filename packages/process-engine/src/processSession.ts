/**
 * processSession — the primary public API of the Ledgerium Process Engine.
 *
 * Takes a recorded session bundle and returns a structured ProcessOutput
 * containing: ProcessRun, ProcessDefinition, ProcessMap, and SOP.
 *
 * Guarantees:
 * - Deterministic: same input always produces the same output
 * - Pure: no side effects, no I/O, no global state
 * - Environment-agnostic: no browser, Node, or framework dependencies
 * - Validated: input is checked before derivation begins (spec §8.1)
 */

import type { ProcessEngineInput, ProcessOutput } from './types.js';
import { buildProcessRun } from './processRunBuilder.js';
import { buildProcessDefinition } from './processDefinitionBuilder.js';
import { buildProcessMap } from './processMapBuilder.js';
import { buildSOP } from './sopBuilder.js';
import { validateProcessEngineInput } from './inputValidator.js';

export function processSession(input: ProcessEngineInput): ProcessOutput {
  // Stage 0: Preconditions and validation (engine spec §8.1).
  // Throw early with structured errors rather than producing silent garbage.
  const validation = validateProcessEngineInput(input);
  if (!validation.valid) {
    throw new Error(
      `[process-engine] Invalid input: ${validation.errors.join('; ')}`,
    );
  }

  // All builders are called with the same immutable input.
  // Order does not matter — each builder is independent.
  const processRun = buildProcessRun(input);
  const processDefinition = buildProcessDefinition(input);
  const processMap = buildProcessMap(input);
  const sop = buildSOP(input);

  return { processRun, processDefinition, processMap, sop };
}
