/**
 * Path E — ProcessGraph v1.0 → v2.0 Migration (iter 076 / PATHE-P01)
 *
 * Pure deterministic forward-migration adapter parallel to Path D D+3
 * `migratePreferences` pattern (iter 059). v1.0 → v2.0 migration synthesizes a
 * linear graph from the existing `ProcessDefinition.pathSignature` string with
 * `isInferred: true` + `confidenceScore: 0.40` — honest degraded synthesis
 * per system-architect §A Decision #4 (no silent quality drop).
 *
 * **Migration scope**:
 *   - v1.0 INPUT: `{ schemaVersion: '1.0', workflowId, pathSignature, runCount }`
 *     where `pathSignature` is colon-separated step categories (existing
 *     ProcessDefinition format).
 *   - v2.0 OUTPUT: a full `ProcessGraph` with synthesized nodes / edges,
 *     `isInferred: true` + `confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE`
 *     on every entity. No DecisionPoints (linear path; no branches inferable
 *     from pathSignature alone). No Variants (clustering requires N≥2 runs and
 *     PATHE-P08 multi-dim similarity which is not available at migration).
 *
 * **Determinism contract** (CLAUDE.md core):
 *   - Pure function. Same `raw` → byte-identical `MigrationResult`.
 *   - Zero `Date.now()` / `Math.random()` / I/O.
 *   - `computedAtMs` comes from the caller-supplied parameter (NOT generated
 *     inside this module).
 *   - Node / edge IDs use a deterministic hash of `(workflowId, step index,
 *     normalized label)` — no UUID v4 / nanoid.
 *
 * **Never throws**. All error / fallback paths return
 * `{ ok: null, reason: string }`.
 *
 * @see ../types/entities.ts — ProcessGraph / ProcessNode / ProcessEdge
 * @see ../types/closed-unions.ts — V1_DEGRADED_SYNTHESIS_CONFIDENCE
 * @see docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md (iter-059)
 */

import { createHash } from 'node:crypto';

import {
  INFERRED_CONFIDENCE_THRESHOLD,
  PROCESS_GRAPH_SCHEMA_VERSION,
  V1_DEGRADED_SYNTHESIS_CONFIDENCE,
} from '../types/closed-unions.js';
import type {
  ProcessEdge,
  ProcessGraph,
  ProcessNode,
} from '../types/entities.js';

// ── Migration result types ───────────────────────────────────────────────────

/**
 * Successful migration result. `ok` is the v2.0 ProcessGraph synthesized from
 * the v1.0 input. `warnings` carries non-fatal information for server-side
 * logging (NOT for direct user display).
 */
export interface MigrationSuccess {
  readonly ok: ProcessGraph;
  readonly warnings: readonly string[];
}

/**
 * Failed migration result. `ok` is null; `reason` carries a single-line
 * human-readable explanation for server-side logging.
 */
export interface MigrationFailure {
  readonly ok: null;
  readonly reason: string;
}

/** Union return type for `migrateProcessGraph`. */
export type MigrationResult = MigrationSuccess | MigrationFailure;

// ── v1.0 input shape ─────────────────────────────────────────────────────────

/**
 * Subset of v1.0 `ProcessDefinition` fields the migrator consumes. Caller
 * extracts these from the Prisma row.
 */
export interface V1ProcessGraphInput {
  readonly id: string;
  readonly workflowId: string;
  readonly pathSignature: string;
  readonly runCount: number;
  /** Caller-supplied wall-clock ms; this module never reads the clock. */
  readonly computedAtMs: number;
}

// ── Deterministic ID derivation ──────────────────────────────────────────────

/**
 * Deterministic node/edge ID derivation. Uses SHA-256 truncated to 16 hex chars
 * for collision-safety at Phase 1 scale (parallel to `computeVariantHash`).
 *
 * Same `(workflowId, kind, ordinal, labelHint)` → byte-identical id.
 */
function deriveDeterministicId(
  workflowId: string,
  kind: 'node' | 'edge' | 'graph',
  ordinal: number,
  labelHint: string,
): string {
  const payload = `${workflowId}|${kind}|${ordinal}|${labelHint}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

// ── migrateProcessGraph ──────────────────────────────────────────────────────

/**
 * Migrate a v1.0 ProcessDefinition → v2.0 ProcessGraph via honest degraded
 * synthesis.
 *
 * Behavior matrix (parallel to `migratePreferences` defensive branches):
 *   - `null` / `undefined` → `{ ok: null, reason: 'null-or-undefined' }`
 *   - Non-object → `{ ok: null, reason: 'not-an-object' }`
 *   - Array → `{ ok: null, reason: 'array-not-object' }`
 *   - Missing required fields → `{ ok: null, reason: 'missing-required-fields' }`
 *   - Empty `pathSignature` → `{ ok: <linear graph with start+end only>, warnings: [...] }`
 *   - Happy path → `{ ok: <synthesized graph>, warnings: [...] }`
 *
 * Synthesis algorithm (deterministic):
 *   1. Split `pathSignature` on `':'` → ordered list of step categories.
 *   2. Emit `start` node + N `action` nodes + `end` node.
 *   3. Emit N+1 `sequence` edges connecting them in order.
 *   4. Every entity carries `isInferred: true` + `confidenceScore: 0.40`.
 *   5. Zero DecisionPoints / Variants (cannot infer from linear signature).
 *
 * Determinism: identical `raw` → byte-identical `ProcessGraph`. IDs derived
 * via SHA-256 of `(workflowId, kind, ordinal, label)`; no UUID generation.
 */
export function migrateProcessGraph(raw: unknown): MigrationResult {
  // ── Null / undefined ─────────────────────────────────────────────────────
  if (raw === null || raw === undefined) {
    return { ok: null, reason: 'null-or-undefined' };
  }

  // ── Must be a plain object ───────────────────────────────────────────────
  if (typeof raw !== 'object') {
    return { ok: null, reason: 'not-an-object' };
  }
  if (Array.isArray(raw)) {
    return { ok: null, reason: 'array-not-object' };
  }

  const obj = raw as Record<string, unknown>;

  // ── Required-field validation ────────────────────────────────────────────
  const id = typeof obj.id === 'string' ? obj.id : null;
  const workflowId = typeof obj.workflowId === 'string' ? obj.workflowId : null;
  const pathSignature = typeof obj.pathSignature === 'string' ? obj.pathSignature : null;
  const runCount = typeof obj.runCount === 'number' && Number.isFinite(obj.runCount) ? obj.runCount : null;
  const computedAtMs =
    typeof obj.computedAtMs === 'number' && Number.isFinite(obj.computedAtMs)
      ? obj.computedAtMs
      : null;

  if (
    id === null ||
    workflowId === null ||
    pathSignature === null ||
    runCount === null ||
    computedAtMs === null
  ) {
    return { ok: null, reason: 'missing-required-fields' };
  }

  // ── Parse pathSignature ──────────────────────────────────────────────────
  // Existing convention: colon-separated step categories. Empty string → no
  // intermediate actions (start → end only).
  const trimmed = pathSignature.trim();
  const stepCategories = trimmed.length > 0 ? trimmed.split(':').map((s) => s.trim()) : [];

  const warnings: string[] = [
    `Migrated from v1.0 pathSignature; isInferred=true; confidenceScore=${V1_DEGRADED_SYNTHESIS_CONFIDENCE}`,
  ];
  if (stepCategories.length === 0) {
    warnings.push('Empty pathSignature; synthesized start→end only.');
  }

  // ── Synthesize nodes (start + N actions + end) ───────────────────────────
  const nodes: ProcessNode[] = [];

  const startNodeId = deriveDeterministicId(workflowId, 'node', 0, '__start__');
  nodes.push({
    id: startNodeId,
    processGraphId: id,
    nodeType: 'start',
    rawLabel: 'Start',
    normalizedLabel: null,
    applicationLabel: null,
    routeTemplate: null,
    confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE,
    isInferred: true,
    observationCount: runCount,
    rawEvidence: [],
  });

  for (let i = 0; i < stepCategories.length; i++) {
    const category = stepCategories[i] ?? '';
    nodes.push({
      id: deriveDeterministicId(workflowId, 'node', i + 1, category),
      processGraphId: id,
      nodeType: 'action',
      rawLabel: category,
      normalizedLabel: null, // PATHE-P02 will fill this on re-ingest
      applicationLabel: null,
      routeTemplate: null,
      confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE,
      isInferred: true,
      observationCount: runCount,
      rawEvidence: [],
    });
  }

  const endNodeId = deriveDeterministicId(
    workflowId,
    'node',
    stepCategories.length + 1,
    '__end__',
  );
  nodes.push({
    id: endNodeId,
    processGraphId: id,
    nodeType: 'end',
    rawLabel: 'End',
    normalizedLabel: null,
    applicationLabel: null,
    routeTemplate: null,
    confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE,
    isInferred: true,
    observationCount: runCount,
    rawEvidence: [],
  });

  // ── Synthesize edges (sequence between consecutive nodes) ────────────────
  const edges: ProcessEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (!from || !to) continue; // Defensive — bounded by loop condition
    edges.push({
      id: deriveDeterministicId(workflowId, 'edge', i, `${from.id}->${to.id}`),
      processGraphId: id,
      fromNodeId: from.id,
      toNodeId: to.id,
      edgeType: 'sequence',
      runFrequency: runCount,
      runFrequencyPct: 1.0,
      confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE,
      isInferred: true,
      rawEvidence: [],
    });
  }

  // ── Sanity check: confidence < threshold ⇒ isInferred = true ─────────────
  // Audit-honesty IFF invariant: V1_DEGRADED_SYNTHESIS_CONFIDENCE (0.40) is
  // intentionally below INFERRED_CONFIDENCE_THRESHOLD (0.55) so every entity
  // synthesized here flags as inferred — UX renders honest low-confidence
  // affordances rather than overclaiming.
  if (V1_DEGRADED_SYNTHESIS_CONFIDENCE >= INFERRED_CONFIDENCE_THRESHOLD) {
    // This is a compile-time-checked invariant of the constants in
    // closed-unions.ts. If we ever raise V1_DEGRADED_SYNTHESIS_CONFIDENCE
    // above the threshold without coordinating an IFF-invariant update, the
    // warnings list will surface it for governance review.
    warnings.push(
      'INVARIANT VIOLATION: V1_DEGRADED_SYNTHESIS_CONFIDENCE >= INFERRED_CONFIDENCE_THRESHOLD',
    );
  }

  // ── Assemble ProcessGraph ────────────────────────────────────────────────
  const graph: ProcessGraph = {
    id,
    workflowId,
    graphVersion: 1,
    graphSchemaVersion: PROCESS_GRAPH_SCHEMA_VERSION,
    runCount,
    computedAtMs,
    nodes,
    edges,
    decisionPoints: [],
    variants: [],
    isInferred: true,
    confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE,
  };

  return { ok: graph, warnings };
}
