/**
 * Bundle evidence-integrity check (backlog row #10).
 *
 * `validateBundle` (lib/ingestion.ts) checks a bundle's SHAPE only. This
 * module checks the property Ledgerium's core invariant depends on: every
 * output is traceable to source evidence. A derived step that cites an event
 * id absent from the bundle's events is a claim with no evidence behind it.
 *
 * Three checks (plus the empty-evidence rule noted on check 1), all pure and deterministic (same bundle -> same counts):
 *   1. unresolvedSourceRefs — `derivedSteps[].source_event_ids` entries that
 *      do not match any `normalizedEvents[].event_id`; a step with an
 *      EMPTY list also counts one (it cites nothing).
 *      The process engine's own input validation (process-engine
 *      inputValidator.ts) enforces the same two rules for every caller;
 *      this gate runs first so routes can return counts without ids.
 *   2. duplicateEventIds    — `normalizedEvents` entries whose `event_id`
 *      repeats an earlier one (an id that names two events cannot be a
 *      reliable reference).
 *   3. sessionIdMismatches  — events, steps and `manifest.sessionId` whose
 *      session id differs from `sessionJson.sessionId`.
 *
 * ## Why no truncation exemption
 *
 * The recorder's `persistenceTruncated` flag (extension session-store.ts)
 * means chrome.storage quota stopped event PERSISTENCE. It does not decouple
 * steps from events: `buildBundle` (extension bundle-builder.ts) derives steps
 * with `buildDerivedSteps(canonicalEvents, ...)` from the very same event
 * array it exports, so a truncated session yields fewer events AND steps
 * derived only from them. Real bundles therefore satisfy all three checks
 * with or without the flag, and a bundle that fails them is corrupt or
 * tampered, not truncated. Every golden/sample fixture was run through these
 * checks before this was written (see tests).
 *
 * ## Privacy
 *
 * The result carries COUNTS ONLY. Event ids, step ids and session ids come
 * from the uploaded bundle and must never be echoed in a response or log.
 */

export interface EvidenceIntegrityInput {
  sessionJson: { sessionId: string };
  normalizedEvents: ReadonlyArray<{ event_id: string; session_id: string }>;
  derivedSteps: ReadonlyArray<{ session_id: string; source_event_ids: ReadonlyArray<string> }>;
  manifest?: { sessionId: string } | undefined;
}

export interface EvidenceIntegrityCounts {
  unresolvedSourceRefs: number;
  duplicateEventIds: number;
  sessionIdMismatches: number;
}

/**
 * `ok` decides acceptance and is false ONLY for the two checks proven to hold
 * for every real producer (MR-044 §2): unresolved step evidence and duplicate
 * event ids. Session-id disagreement is COUNTED but does not reject: event
 * session ids are copied from the content script, and a page restored from
 * the back/forward cache can emit events under the previous session before
 * the new one starts — a real user recording, not corruption. Rejecting it
 * would have failed that recording on every retry. The count is reported so
 * the real rate can be measured before any decision to enforce.
 */
export type EvidenceIntegrityResult = { ok: boolean } & EvidenceIntegrityCounts;

export function checkBundleEvidenceIntegrity(bundle: EvidenceIntegrityInput): EvidenceIntegrityResult {
  const expectedSessionId = bundle.sessionJson.sessionId;

  const seen = new Set<string>();
  let duplicateEventIds = 0;
  let sessionIdMismatches = 0;

  for (const event of bundle.normalizedEvents) {
    if (seen.has(event.event_id)) duplicateEventIds += 1;
    else seen.add(event.event_id);
    if (event.session_id !== expectedSessionId) sessionIdMismatches += 1;
  }

  let unresolvedSourceRefs = 0;
  for (const step of bundle.derivedSteps) {
    // A step citing nothing is unresolved evidence by another route (row #269
    // (4)). No producer emits one: segmentation's step builders return null
    // for an empty event group, so source_event_ids is always a non-empty map
    // of event ids. Counted in unresolvedSourceRefs so the 422 body shape is
    // unchanged.
    if (step.source_event_ids.length === 0) unresolvedSourceRefs += 1;
    for (const ref of step.source_event_ids) {
      if (!seen.has(ref)) unresolvedSourceRefs += 1;
    }
    if (step.session_id !== expectedSessionId) sessionIdMismatches += 1;
  }

  if (bundle.manifest !== undefined && bundle.manifest.sessionId !== expectedSessionId) {
    sessionIdMismatches += 1;
  }

  return {
    ok: unresolvedSourceRefs === 0 && duplicateEventIds === 0,
    unresolvedSourceRefs,
    duplicateEventIds,
    sessionIdMismatches,
  };
}
