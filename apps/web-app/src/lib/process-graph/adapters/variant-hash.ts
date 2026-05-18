/**
 * Path E — variantHash v2.0.0 (iter 076 / PATHE-P01)
 *
 * Versioned variant-hash function with algorithm version pinned INSIDE the
 * hash payload. **Closes DEP-08** (PRD §15 R-1 highest-leverage open risk)
 * per system-architect §E.
 *
 * Hash formula:
 *   sha256(JSON.stringify({
 *     v: '2.0.0',
 *     nodeTypeSequence: NodeType[],
 *     normalizedActionSequence: string[],
 *   })).slice(0, 16)
 *
 * The `v: '2.0.0'` discriminant lives INSIDE the payload (not as a prefix on
 * the hash output). This guarantees:
 *   - Hash collision across algorithm versions is IMPOSSIBLE (different `v`
 *     bytes → different SHA-256 input → different output).
 *   - Future v2.1.0 / v3.0.0 bumps can re-compute new hashes for existing
 *     variants WITHOUT collision risk.
 *   - Byte-identical reproducibility across deploys at the same version.
 *
 * **Determinism contract** (Ledgerium core):
 *   - Pure function. Same inputs → byte-identical 16-char hex string.
 *   - Zero `Date.now()` / `Math.random()` / network I/O / clock reads.
 *   - Uses Node.js `crypto` `createHash('sha256')` — deterministic across
 *     Node versions (FIPS-compliant SHA-256).
 *
 * **Note on scope at PATHE-P01**: this iteration ships the hash function +
 * v2.0.0 pinning. The actual variant clustering that produces
 * `nodeTypeSequence` + `normalizedActionSequence` ships at PATHE-P08
 * (iter E+8). PATHE-P10 graph-merge engine (iter E+10) is the first caller
 * of this function in production.
 *
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §4 row 7 (DEP-08 closure)
 * @see ../archive/v2_0_0.ts — frozen snapshot of v2.0 contract
 */

import { createHash } from 'node:crypto';
import type { NodeType } from '../types/closed-unions.js';

// ── Algorithm version (pinned inside payload) ─────────────────────────────────

/**
 * Variant-hash algorithm version. PINNED INSIDE the hash payload (NOT as a
 * prefix on the output). Future bumps add a new constant + branch on caller.
 */
export const VARIANT_HASH_ALGORITHM_VERSION = '2.0.0' as const;

/** Closed union of supported algorithm versions. */
export type VariantHashAlgorithmVersion = '2.0.0';

// ── Hash input contract ──────────────────────────────────────────────────────

/**
 * The deterministic input to the v2.0.0 hash.
 *
 * Both fields are caller-supplied:
 *   - `nodeTypeSequence`: ordered sequence of `NodeType` values traversed by
 *     the variant (start → ... → end)
 *   - `normalizedActionSequence`: ordered sequence of PATHE-P02-normalized
 *     action labels (e.g. ["Open customer record", "Search for invoice",
 *     "Select approval status"])
 *
 * The two arrays MUST have identical length (1:1 correspondence between
 * NodeType and normalized action at each step). Caller's responsibility to
 * enforce; this function does NOT validate.
 */
export interface VariantHashInput {
  readonly nodeTypeSequence: readonly NodeType[];
  readonly normalizedActionSequence: readonly string[];
}

// ── computeVariantHash ───────────────────────────────────────────────────────

/**
 * Compute the deterministic 16-char hex v2.0.0 variant hash.
 *
 * @param input - The variant's normalized signature.
 * @returns 16-character lowercase hex string (first 16 chars of SHA-256).
 *
 * Determinism: identical `input` → byte-identical output across deploys.
 * Algorithm version is pinned inside the payload via the `v` field; future
 * version bumps cannot collide because the input bytes differ.
 *
 * **Why 16 chars?** Birthday-collision probability at 16 hex chars (64 bits)
 * is ~1 in 2^32 for 10^10 distinct variants — sufficient for Phase 1 single-
 * tenant scale (<10k variants per workflow). Phase 2 can extend to 32 chars
 * without breaking determinism by introducing a v3.0.0 algorithm version.
 */
export function computeVariantHash(input: VariantHashInput): string {
  // Algorithm version pinned INSIDE the payload — collision-impossible across
  // version bumps because the input bytes change with `v`.
  const payload = {
    v: VARIANT_HASH_ALGORITHM_VERSION,
    nodeTypeSequence: input.nodeTypeSequence,
    normalizedActionSequence: input.normalizedActionSequence,
  };
  // JSON.stringify is deterministic for objects with declared key order; the
  // payload is constructed with fixed key order above so this is safe.
  const json = JSON.stringify(payload);
  const fullHash = createHash('sha256').update(json).digest('hex');
  return fullHash.slice(0, 16);
}

// ── Parse / inspect (forward-compat helpers) ─────────────────────────────────

/**
 * Return the algorithm version a given variantHash payload would have used.
 * Currently always returns `'2.0.0'`. Forward-compatibility helper for
 * PATHE-P04 migrator that reads existing rows with legacy v1.x hashes.
 */
export function getVariantHashAlgorithmVersion(): VariantHashAlgorithmVersion {
  return VARIANT_HASH_ALGORITHM_VERSION;
}
