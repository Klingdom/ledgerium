/**
 * Input validator for the Ledgerium Deterministic Process Engine.
 *
 * Implements engine spec §8.1 (Stage 0: Preconditions and validation).
 *
 * Checks that a ProcessEngineInput is usable before derivation begins.
 * On failure, returns structured errors rather than silently producing
 * partial or incorrect outputs.
 *
 * All checks are deterministic and evidence-based — no heuristics.
 */

import type { ProcessEngineInput, InputValidationResult } from './types.js';

export function validateProcessEngineInput(
  input: ProcessEngineInput,
): InputValidationResult {
  const errors: string[] = [];

  // ── Session metadata ───────────────────────────────────────────────────────

  if (!input.sessionJson) {
    errors.push('sessionJson is required');
  } else {
    if (!input.sessionJson.sessionId || input.sessionJson.sessionId.trim() === '') {
      errors.push('sessionJson.sessionId is required and must not be empty');
    }
    if (!input.sessionJson.activityName || input.sessionJson.activityName.trim() === '') {
      errors.push('sessionJson.activityName is required and must not be empty');
    }
    if (!input.sessionJson.startedAt) {
      errors.push('sessionJson.startedAt is required');
    } else if (isNaN(Date.parse(input.sessionJson.startedAt))) {
      errors.push('sessionJson.startedAt must be a valid ISO 8601 datetime');
    }
    if (input.sessionJson.endedAt !== undefined && isNaN(Date.parse(input.sessionJson.endedAt))) {
      errors.push('sessionJson.endedAt must be a valid ISO 8601 datetime when present');
    }
    if (
      input.sessionJson.startedAt &&
      input.sessionJson.endedAt &&
      !isNaN(Date.parse(input.sessionJson.startedAt)) &&
      !isNaN(Date.parse(input.sessionJson.endedAt))
    ) {
      if (new Date(input.sessionJson.endedAt) < new Date(input.sessionJson.startedAt)) {
        errors.push('sessionJson.endedAt must not be before sessionJson.startedAt');
      }
    }
  }

  // ── Normalized events ──────────────────────────────────────────────────────

  if (!Array.isArray(input.normalizedEvents)) {
    errors.push('normalizedEvents must be an array');
  } else {
    const seenEventIds = new Set<string>();
    for (let i = 0; i < input.normalizedEvents.length; i++) {
      const evt = input.normalizedEvents[i]!;

      if (!evt.event_id || evt.event_id.trim() === '') {
        errors.push(`normalizedEvents[${i}].event_id is required`);
      } else if (seenEventIds.has(evt.event_id)) {
        errors.push(`normalizedEvents[${i}].event_id is a duplicate: "${evt.event_id}"`);
      } else {
        seenEventIds.add(evt.event_id);
      }

      if (typeof evt.t_ms !== 'number' || evt.t_ms < 0) {
        errors.push(`normalizedEvents[${i}].t_ms must be a non-negative number`);
      }

      if (!evt.event_type) {
        errors.push(`normalizedEvents[${i}].event_type is required`);
      }

      if (!evt.actor_type || !['human', 'system', 'recorder'].includes(evt.actor_type)) {
        errors.push(`normalizedEvents[${i}].actor_type must be 'human', 'system', or 'recorder'`);
      }

      if (!evt.normalization_meta) {
        errors.push(`normalizedEvents[${i}].normalization_meta is required`);
      }
    }

    // Events must be in non-decreasing timestamp order (engine spec §8.1)
    for (let i = 1; i < input.normalizedEvents.length; i++) {
      const prev = input.normalizedEvents[i - 1]!;
      const curr = input.normalizedEvents[i]!;
      if (curr.t_ms < prev.t_ms) {
        errors.push(
          `normalizedEvents are not in timestamp order at index ${i}: ` +
          `t_ms ${curr.t_ms} < ${prev.t_ms}`,
        );
        break; // one ordering error is enough to flag
      }
    }
  }

  // ── Derived steps ──────────────────────────────────────────────────────────

  if (!Array.isArray(input.derivedSteps)) {
    errors.push('derivedSteps must be an array');
  } else {
    const seenStepIds = new Set<string>();
    for (let i = 0; i < input.derivedSteps.length; i++) {
      const step = input.derivedSteps[i]!;

      if (!step.step_id || step.step_id.trim() === '') {
        errors.push(`derivedSteps[${i}].step_id is required`);
      } else if (seenStepIds.has(step.step_id)) {
        errors.push(`derivedSteps[${i}].step_id is a duplicate: "${step.step_id}"`);
      } else {
        seenStepIds.add(step.step_id);
      }

      if (typeof step.ordinal !== 'number' || step.ordinal < 1) {
        errors.push(`derivedSteps[${i}].ordinal must be a positive integer (1-based)`);
      }

      if (!step.status || !['provisional', 'finalized'].includes(step.status)) {
        errors.push(`derivedSteps[${i}].status must be 'provisional' or 'finalized'`);
      }

      if (typeof step.confidence !== 'number' || step.confidence < 0 || step.confidence > 1) {
        errors.push(`derivedSteps[${i}].confidence must be a number between 0 and 1`);
      }

      if (!Array.isArray(step.source_event_ids)) {
        errors.push(`derivedSteps[${i}].source_event_ids must be an array`);
      }
    }
  }

  if (errors.length === 0) {
    return { valid: true };
  }
  return { valid: false, errors };
}
