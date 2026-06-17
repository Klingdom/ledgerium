/**
 * citation-validator — the one-way gate back from the (Phase-B) LLM (Phase A).
 *
 * PURE. Input: claimed citation ids (as if parsed from a model's answer) + the
 * closed `CitationSet`. Output: ONLY the citations that set-intersect the
 * authorized universe, resolved to renderable references. Every claimed id NOT
 * in the set is silently dropped — it is structurally impossible for an id
 * outside the `CitationSet` to survive (ADR-001 Decision 2). This is the
 * anti-fabrication gate.
 *
 * The validator also parses the citation grammar out of free text (so a Phase-B
 * adapter can hand it either pre-parsed ids or the raw answer string), and
 * exposes the deterministic honesty downgrade rule: a non-refusal answer that
 * makes affirmative claims but produces ZERO surviving citations is downgraded
 * to a refusal.
 *
 * GRAMMAR (ADR-001):
 *   [[step:N]]      — N matches ^[1-9][0-9]*$        authorized IFF N ∈ stepOrdinals
 *   [[event:ID]]    — ID is non-empty, no ']'         authorized IFF ID ∈ sourceEventIds
 *   [[process]]     — whole-process fact              authorized IFF processCitable
 *
 * ZERO LLM / provider / network import (enforced by a no-import test).
 *
 * @module ask-this-process/citationValidator
 */

import {
  citationResolveKey,
  type CitationSet,
  type ResolvedCitation,
} from './types';

/** A parsed-but-not-yet-validated claimed citation token. */
export type ClaimedCitation =
  | { kind: 'step'; ordinal: number }
  | { kind: 'event'; sourceEventId: string }
  | { kind: 'process' };

/**
 * Parse the citation grammar out of an arbitrary answer string. Pure + total:
 * malformed tokens are simply not matched. Returns parsed tokens in
 * first-appearance order (deduplication happens at validation).
 *
 * Matches `[[step:4]]`, `[[event:evt_abc]]`, `[[process]]`. The event id is any
 * run of non-`]` characters (so `]]` reliably terminates the token).
 */
export function parseClaimedCitations(answerText: string): ClaimedCitation[] {
  const out: ClaimedCitation[] = [];
  if (typeof answerText !== 'string' || answerText.length === 0) return out;

  const re = /\[\[(step:[1-9][0-9]*|event:[^\]]+|process)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answerText)) !== null) {
    const body = m[1]!;
    if (body === 'process') {
      out.push({ kind: 'process' });
    } else if (body.startsWith('step:')) {
      const ordinal = Number.parseInt(body.slice('step:'.length), 10);
      // The regex already guaranteed a positive integer shape.
      out.push({ kind: 'step', ordinal });
    } else if (body.startsWith('event:')) {
      const sourceEventId = body.slice('event:'.length).trim();
      if (sourceEventId.length > 0) {
        out.push({ kind: 'event', sourceEventId });
      }
    }
  }
  return out;
}

/** Resolve a single claimed token's lookup key in the CitationSet.resolve map. */
function resolveKeyFor(claim: ClaimedCitation): string {
  switch (claim.kind) {
    case 'step':
      return citationResolveKey.step(claim.ordinal);
    case 'event':
      return citationResolveKey.event(claim.sourceEventId);
    case 'process':
      return citationResolveKey.process();
  }
}

export interface ValidateCitationsResult {
  /** The surviving (claimed ∩ authorized) citations, resolved + de-duplicated. */
  valid: ResolvedCitation[];
  /** Count of claimed citations that were dropped (hallucinated / unknown). */
  droppedCount: number;
}

/**
 * Validate claimed citations against the closed CitationSet. Returns ONLY the
 * intersection, resolved + de-duplicated (first occurrence wins, preserving
 * order). Any claimed id not present in the set is dropped and counted.
 *
 * `claimed` may be either pre-parsed `ClaimedCitation[]` or a raw answer string
 * (parsed here via the grammar).
 *
 * PURE: no clock, no randomness, no I/O. Set membership only.
 */
export function validateCitations(
  claimed: ClaimedCitation[] | string,
  citationSet: CitationSet,
): ValidateCitationsResult {
  const claims = typeof claimed === 'string' ? parseClaimedCitations(claimed) : claimed;

  const valid: ResolvedCitation[] = [];
  const seenKeys = new Set<string>();
  let droppedCount = 0;

  for (const claim of claims) {
    // `process` is authorized only when the bundle authorizes it.
    if (claim.kind === 'process' && !citationSet.processCitable) {
      droppedCount += 1;
      continue;
    }

    const key = resolveKeyFor(claim);
    const resolved = citationSet.resolve.get(key);
    if (!resolved) {
      // Not in the authorized universe — hallucinated / unknown id. Drop it.
      droppedCount += 1;
      continue;
    }
    if (seenKeys.has(key)) {
      // Duplicate claim of the same authorized id — collapse, do not count as a drop.
      continue;
    }
    seenKeys.add(key);
    valid.push(resolved);
  }

  return { valid, droppedCount };
}

/**
 * The deterministic honesty downgrade (ADR-001 Decision 3): a non-refusal answer
 * that makes affirmative factual claims but has ZERO surviving valid citations
 * is, by policy, NOT an answer — it must be downgraded to a refusal.
 *
 * Whole-process meta facts ("7 steps") are legitimate citation-free prose ONLY
 * if they carry the `[[process]]` token (which, when authorized, survives as a
 * valid citation) — so a truly citation-free affirmative answer is correctly
 * downgraded.
 *
 * `madeAffirmativeClaim` is the caller's signal that the answer asserted a fact
 * (Phase A templates always assert; a pure greeting/echo would not).
 */
export function shouldDowngradeToRefusal(args: {
  madeAffirmativeClaim: boolean;
  validCitationCount: number;
}): boolean {
  return args.madeAffirmativeClaim && args.validCitationCount === 0;
}
