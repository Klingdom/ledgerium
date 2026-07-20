/**
 * Deterministic content hash for SOP document identity.
 *
 * Ledgerium SOP version identity (`SOP.version`; see B-1 in
 * docs/meta/SOP_BUILDER_REVIEW_001.md) is a function of the document's
 * content, not a counter - so two regenerations from identical evidence
 * produce an identical version, and are correctly NOT treated as a "new"
 * version. This module supplies that function: a pure, dependency-free,
 * non-cryptographic content fingerprint.
 *
 * `packages/process-engine` has zero runtime dependencies by design - it
 * must stay portable across the browser extension, the web-app server, and
 * any future host. This hash is therefore hand-rolled TypeScript, not
 * `crypto`, following the same non-cryptographic-hash-for-fingerprinting
 * precedent already established in this codebase
 * (`apps/extension-app/src/shared/utils.ts` `djb2Hash`, used to compute
 * `selectorFingerprint`).
 *
 * NOT a security hash. Do not use this for anything requiring collision
 * resistance against an adversary - it exists only to detect whether
 * generated SOP content changed between two builds.
 */

const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS_PASS_1 = 0x811c9dc5;
const FNV_OFFSET_BASIS_PASS_2 = 0x9e3779b9; // distinct seed - independent second pass

/** One FNV-1a pass over `input`, seeded with `seed`. Pure; 32-bit output. */
function fnv1aPass(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Hashes an already-serialized string into a 16-hex-char fingerprint.
 *
 * Two independent FNV-1a passes (different seeds) are concatenated rather
 * than relying on a single 32-bit hash - this reduces accidental-collision
 * risk while remaining pure integer arithmetic (no `crypto`, no I/O, no
 * randomness, no clock).
 */
export function computeContentHash(serialized: string): string {
  const pass1 = fnv1aPass(serialized, FNV_OFFSET_BASIS_PASS_1).toString(16).padStart(8, '0');
  const pass2 = fnv1aPass(serialized, FNV_OFFSET_BASIS_PASS_2).toString(16).padStart(8, '0');
  return `${pass1}${pass2}`;
}

// --- SOP-specific serialization ---------------------------------------------

/** Minimal, explicit shape of the content that defines a SOP's identity. */
export interface SOPContentForHash {
  title: string;
  purpose: string;
  scope: string;
  steps: ReadonlyArray<{
    ordinal: number;
    title: string;
    action: string;
    expectedOutcome: string;
    instructions: ReadonlyArray<{ instruction: string }>;
  }>;
}

// ASCII "information separator" control characters (Unit Separator 0x1F,
// Record Separator 0x1E, Group Separator 0x1D). Built via
// String.fromCharCode rather than embedded literally so the delimiters stay
// visibly auditable in this source file rather than appearing as invisible
// characters. These code points never appear in generated SOP text, so they
// cannot collide with the content itself and cause two different documents
// to accidentally serialize to the same string.
const FIELD_SEP = String.fromCharCode(0x1f); // between fields within a record
const STEP_SEP = String.fromCharCode(0x1e); // between steps
const INSTR_SEP = String.fromCharCode(0x1d); // between instructions within a step

/**
 * Builds a stable, explicitly-ordered serialization of the fields that
 * define a SOP's content identity.
 *
 * Deliberately NOT `JSON.stringify(sop)`: key order is not guaranteed
 * stable across engine changes, and stringifying the whole object would
 * pull in fields that must NOT affect identity - `generatedAt` (evidence
 * timestamp, not content), `sopId`, and `version`/`contentHash` themselves
 * (which would make the hash depend on its own prior value). This function
 * only ever reads the fields listed below, in the fixed order below, so the
 * hash input is fully auditable from this one place.
 */
export function serializeSOPContentForHash(content: SOPContentForHash): string {
  const header = [content.title, content.purpose, content.scope].join(FIELD_SEP);
  const stepParts = content.steps.map(step => {
    const instructionsPart = step.instructions.map(i => i.instruction).join(INSTR_SEP);
    return [
      String(step.ordinal),
      step.title,
      step.action,
      step.expectedOutcome,
      instructionsPart,
    ].join(FIELD_SEP);
  });
  return [header, ...stepParts].join(STEP_SEP);
}

/** Computes the deterministic content-identity hash for a SOP's content. */
export function computeSOPContentHash(content: SOPContentForHash): string {
  return computeContentHash(serializeSOPContentForHash(content));
}
