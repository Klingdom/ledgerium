/**
 * Path E — Prisma JSON ↔ ProcessGraph Round-Trip (iter 076 / PATHE-P01)
 *
 * Pure adapter between the wire format stored in Prisma JSON columns and the
 * runtime `ProcessGraph` entity. Mirrors the iter-049 `parseIntelligenceJson`
 * adapter pattern.
 *
 * Behavior:
 *   - `parseProcessGraphJson(raw: string | null): ProcessGraph | null`
 *       - null / empty string / malformed JSON → null
 *       - JSON parses but does not match v2.0 contract → null
 *       - JSON parses + matches contract → typed ProcessGraph
 *   - `serializeProcessGraphToJson(graph: ProcessGraph): string`
 *       - Deterministic JSON serialization (stable key order via
 *         object-construction order in the caller; arrays preserve order).
 *
 * **Pure module**: zero I/O, zero clocks, never throws. Failure modes return
 * `null` so call sites (Prisma row consumers) get explicit graceful-degradation
 * paths.
 *
 * @see ../types/entities.ts — ProcessGraph contract
 * @see ../validation/zod-schemas.ts — runtime validation
 */

import { processGraphSchema } from '../validation/zod-schemas.js';
import type { ProcessGraph } from '../types/entities.js';

/**
 * Parse a raw JSON string into a ProcessGraph; return null on any failure.
 *
 * @param raw - The raw JSON string from the Prisma column, or `null`.
 * @returns Typed ProcessGraph on success; `null` on failure (null / empty /
 *          malformed JSON / contract mismatch).
 *
 * Determinism: same `raw` → byte-identical output (Zod validation is
 * deterministic; JSON.parse is deterministic).
 */
export function parseProcessGraphJson(raw: string | null): ProcessGraph | null {
  if (raw === null || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const validation = processGraphSchema.safeParse(parsed);
  if (!validation.success) return null;

  // The Zod schema mirrors the ProcessGraph interface; safeParse output is
  // structurally compatible. Cast through unknown to satisfy TS readonly
  // strictness; the runtime shape is validated by Zod above.
  return validation.data as unknown as ProcessGraph;
}

/**
 * Serialize a ProcessGraph to a deterministic JSON string.
 *
 * Key-order determinism: JSON.stringify preserves the insertion order of an
 * object's own enumerable string-keyed properties. The runtime ProcessGraph
 * construction sites (e.g. `migrateProcessGraph`) use fixed key order so this
 * round-trip is byte-identical.
 *
 * Pure: zero I/O, never throws (ProcessGraph is closed-typed).
 */
export function serializeProcessGraphToJson(graph: ProcessGraph): string {
  return JSON.stringify(graph);
}
