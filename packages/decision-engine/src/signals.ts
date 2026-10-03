/**
 * Decision signals 4-7 (PATHE-P06): navigation, approval/rejection, validation
 * (pass/fail pair), error modals. Pure and deterministic.
 *
 * Signals add evidence-linked conditions per outcome and a flag set consumed by
 * `inferQuestion` (precedence there). Descriptions are constants plus
 * `safeLabel`-masked, already-sanitized labels: no raw free text reaches output.
 *
 * "5 special pattern detectors" = the five question-inference patterns in
 * question-inference.ts (approval pair, validation, create-vs-find, role,
 * generic); signals 5 and 6 feed the first two, 4 and 7 extend the last.
 */

import type { OutcomeDraft } from './conditions.js';
import { refOf } from './conditions.js';
import { capDescription, nfc, safeLabel } from './text-safety.js';
import { stepNodeKey } from './trie.js';
import type { EvidenceRef, InferredCondition, StepInput } from './types.js';

/** Upstream producer: canonical event type (schema-events) of events behind a step. */
export const MODAL_OPENED_EVENT = 'system.modal_opened';

/** Action-label patterns (word-boundary, case-insensitive; labels NFC-normalized first). */
export const APPROVAL_RE = /\b(?:approve[ds]?|approving|accept(?:s|ed)?|authori[sz]e[ds]?)\b/iu;
export const REJECTION_RE = /\b(?:reject(?:s|ed|ing)?|den(?:y|ies|ied)|declin(?:e[ds]?|ing)|refus(?:e[ds]?|ing)|disapprove[ds]?)\b/iu;

/**
 * Consent / banner / session wording is not a business approval:
 * "Accept all cookies", "Decline tracking", "Accept terms". ("Sign off/out/in"
 * and "log off" no longer match APPROVAL_RE at all.)
 */
export const NON_DECISION_RE =
  /\b(?:cookies?|consent|privacy|tracking|gdpr|terms)\b/iu;

export const isApprovalLabel = (l: string): boolean => {
  const s = nfc(l);
  return APPROVAL_RE.test(s) && !REJECTION_RE.test(s) && !NON_DECISION_RE.test(s);
};
export const isRejectionLabel = (l: string): boolean => {
  const s = nfc(l);
  return REJECTION_RE.test(s) && !APPROVAL_RE.test(s) && !NON_DECISION_RE.test(s);
};

export interface SignalResult {
  readonly conditions: ReadonlyMap<string, readonly InferredCondition[]>;
  /** Signal 6: a retry outcome AND a pass outcome exist. */
  readonly validationPair: boolean;
  /** Signal 7: some outcomes open a modal, others do not. */
  readonly exception: boolean;
  /**
   * True only when EVERY modal-opening outcome step declares `modalKind: 'error'`.
   * The event type alone (system.modal_opened) does not establish error-ness.
   */
  readonly exceptionIsError: boolean;
  /** Signal 4: outcomes land on different route templates. */
  readonly navigation: boolean;
}

export interface SignalContext {
  readonly drafts: readonly OutcomeDraft[];
  /** Step at each outcome's first visit (undefined for END). */
  readonly firstStep: (outcomeKey: string) => StepInput | undefined;
  readonly runSteps: ReadonlyMap<string, readonly StepInput[]>;
  /** Steps from root to the branch node (index of the outcome step in a run). */
  readonly branchDepth: number;
  readonly endKey: string;
}

const cond = (
  conditionType: InferredCondition['conditionType'],
  description: string,
  evidence: readonly EvidenceRef[],
  inferenceMethod: InferredCondition['inferenceMethod'] = 'observed',
): InferredCondition => ({
  conditionType,
  description: capDescription(description),
  inferenceMethod,
  evidence,
});

export function detectSignals(ctx: SignalContext): SignalResult {
  const { drafts } = ctx;
  const out = new Map<string, InferredCondition[]>(drafts.map((d) => [d.outcomeKey, []]));
  const evOf = (d: OutcomeDraft): EvidenceRef[] => (d.evidenceVisits ?? d.branchVisits).map(refOf);
  const real = drafts.filter((d) => d.outcomeKey !== ctx.endKey);

  // Signal 4: navigation (structural: route templates differ).
  const routes = new Set(real.map((d) => ctx.firstStep(d.outcomeKey)?.routeTemplate ?? ''));
  const navigation = routes.size >= 2;

  // Signal 5: approval / rejection action labels. Label text alone is a heuristic,
  // so the condition is `inferred` (P01: no confident decision from a label).
  const hasApproval = drafts.some((d) => isApprovalLabel(d.label));
  const hasRejection = drafts.some((d) => isRejectionLabel(d.label));
  if (hasApproval && hasRejection) {
    for (const d of drafts) {
      const kind = isApprovalLabel(d.label) ? 'an approval' : isRejectionLabel(d.label) ? 'a rejection' : null;
      if (kind) {
        out.get(d.outcomeKey)!.push(cond('approval_status', `Action "${safeLabel(d.label)}" records ${kind}`, evOf(d), 'inferred'));
      }
    }
  }

  // Signal 6: validation = a retry outcome (every run revisits an earlier step) + a pass outcome.
  const isRetryRun = (runId: string, step: StepInput | undefined): boolean => {
    if (!step) return false;
    const key = stepNodeKey(step);
    return (ctx.runSteps.get(runId) ?? []).slice(0, ctx.branchDepth).some((s) => stepNodeKey(s) === key);
  };
  const retryByOutcome = new Map<string, boolean>();
  for (const d of drafts) {
    const visits = d.evidenceVisits ?? [];
    retryByOutcome.set(d.outcomeKey, visits.length > 0 && visits.every((v) => isRetryRun(v.runId, v.step)));
  }
  const retries = drafts.filter((d) => retryByOutcome.get(d.outcomeKey));
  const passes = drafts.filter((d) => !retryByOutcome.get(d.outcomeKey));
  const validationPair = retries.length > 0 && passes.length > 0;
  if (validationPair) {
    for (const d of retries) {
      out.get(d.outcomeKey)!.push(cond('validation_status', 'Run returns to an earlier step after submit (validation retry)', evOf(d)));
    }
    for (const d of passes) {
      out.get(d.outcomeKey)!.push(cond('validation_status', 'Run continues without returning to an earlier step (validation passed)', evOf(d)));
    }
  }

  // Signal 7: modal opened for every run of some outcomes and for none of others.
  const modalOf = (d: OutcomeDraft): boolean | null => {
    const visits = d.evidenceVisits ?? [];
    if (visits.length === 0) return false; // END outcome: nothing opened
    const n = visits.filter((v) => v.step?.eventTypes?.includes(MODAL_OPENED_EVENT)).length;
    return n === visits.length ? true : n === 0 ? false : null; // null = mixed within outcome
  };
  const modal = drafts.map((d) => ({ d, m: modalOf(d) }));
  const exception = modal.some((x) => x.m === true) && modal.some((x) => x.m === false);
  const exceptionIsError =
    exception &&
    modal.every(({ d, m }) => m !== true || (d.evidenceVisits ?? []).every((v) => v.step?.modalKind === 'error'));
  if (exception) {
    for (const { d, m } of modal) {
      if (m === null) continue;
      out.get(d.outcomeKey)!.push(
        cond('ui_state', m ? 'A modal dialog opens on this path' : 'No modal dialog opens on this path', evOf(d)),
      );
    }
  }

  return { conditions: out, validationPair, exception, exceptionIsError, navigation };
}
