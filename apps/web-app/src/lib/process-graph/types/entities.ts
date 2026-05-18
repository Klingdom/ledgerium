/**
 * Path E — Process Graph Entity Interfaces (iter 076 / PATHE-P01)
 *
 * Entity interfaces for the Path E graph model. Every interface is purely typed
 * (no runtime). All entities consume the 5 closed unions from `closed-unions.ts`
 * to ensure compile-time exhaustiveness on switch/match consumers.
 *
 * Determinism contract:
 *   - All fields readonly; no mutable arrays / maps reachable from a typed entity.
 *   - Timestamps are wall-clock milliseconds (`number`) for in-memory work and
 *     `Date` for Prisma round-trips. Storage layer (PATHE-P01 migration) uses
 *     `DATETIME`; serialization helpers handle the conversion deterministically.
 *
 * Audit-honesty IFF invariant (Group B in `validation/topology.ts`):
 *   - `node.isInferred === true IFF node.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`
 *   - `edge.isInferred === true IFF edge.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`
 *   - `condition.isInferred === true IFF condition.confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`
 *   - `evidencePointer.reviewedAt !== null IFF ProcessEvidenceReview row exists`
 *
 * @see closed-unions.ts — 5 closed unions + thresholds
 * @see catalog/*.ts — frozen mirror arrays + exhaustiveness locks
 * @see validation/topology.ts — Group A-E invariant tests
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §4 + Appendix C
 */

import type {
  ConditionType,
  DecisionType,
  EdgeType,
  NodeType,
  ProcessGraphSchemaVersion,
  VariantLabel,
} from './closed-unions.js';

// ── EvidencePointer ───────────────────────────────────────────────────────────

/**
 * Pointer back to the source event that produced an entity.
 *
 * Every entity (Node / Edge / Decision / Condition / Variant) carries
 * `rawEvidence: readonly EvidencePointer[]`. Each pointer references a specific
 * (workflowRun, stepIndex) coordinate in the immutable event log — preserving
 * the deterministic trace from observed behavior to inferred structure.
 *
 * **Reviewed-Evidence Retention (CEO directive 2026-05-18, Appendix C)**:
 *   - `reviewedAt: null` — evidence has NOT been reviewed by a user.
 *   - `reviewedAt: <ms timestamp>` — user explicitly reviewed this evidence
 *     pointer (clicked "Mark Reviewed" / expanded the evidence card /
 *     acted on a derived recommendation). A corresponding
 *     `ProcessEvidenceReview` row exists with `retentionUntil` computed
 *     by the retention policy (365 days for Team+, 90 days for Free/Starter).
 *
 * **Audit-honesty IFF invariant** (Group B):
 *   `reviewedAt !== null IFF ProcessEvidenceReview row exists for this pointer`
 *
 * Pointers themselves are pure value-objects — they do not carry the review
 * record content; the `ProcessEvidenceReview` model is the source of truth for
 * review metadata + retention.
 */
export interface EvidencePointer {
  /** The workflow run that produced this evidence. */
  readonly workflowRunId: string;
  /** Zero-based index into the run's step array. */
  readonly stepIndex: number;
  /** Wall-clock milliseconds of the source event (deterministic over storage). */
  readonly timestamp: number;
  /**
   * Reviewed-Evidence Retention Policy (CEO directive 2026-05-18):
   *   - `null` — evidence has NOT been reviewed (90-day default retention)
   *   - `<ms timestamp>` — user reviewed this evidence; retention extends to
   *     365 days from this timestamp (Team+ tier) or 90 days (Free/Starter).
   *
   * Audit-honesty IFF: `reviewedAt !== null` IFF `ProcessEvidenceReview` row
   * exists for `(workflowRunId, stepIndex)`.
   */
  readonly reviewedAt: number | null;
}

// ── ProcessNode ───────────────────────────────────────────────────────────────

/**
 * A node in the Path E process graph. Every node carries a `nodeType` from the
 * `NodeType` closed union + a `confidenceScore` + `isInferred` audit-honesty
 * pair + `rawEvidence` traceability.
 *
 * **Determinism**: `id` is a deterministic hash of
 * `(processGraphId, normalizedLabel, routeTemplate, applicationLabel, positionHint)`.
 * The PATHE-P10 graph-merge engine computes the hash; this iteration only
 * defines the contract.
 *
 * **normalizedLabel**: produced by PATHE-P02 intent-inference engine.
 * `null` at v1.0 → v2.0 migration time (the migrator does not have the
 * normalization context); flipped to a real label by PATHE-P02 ingest pipeline.
 */
export interface ProcessNode {
  /** Stable deterministic identifier for the node. */
  readonly id: string;
  /** FK to parent ProcessGraph. */
  readonly processGraphId: string;
  /** Category of the node (closed union). */
  readonly nodeType: NodeType;
  /** Raw observed label (e.g. "Click button") — preserved unmodified. */
  readonly rawLabel: string;
  /** PATHE-P02-normalized label; null at v1.0→v2.0 migration. */
  readonly normalizedLabel: string | null;
  /** Application / system label (e.g. "Salesforce"); null when unknown. */
  readonly applicationLabel: string | null;
  /** URL route template (e.g. "/customers/:id"); null when unknown. */
  readonly routeTemplate: string | null;
  /** Confidence in [0, 1]. Audit-honesty IFF: < 0.55 ⇔ isInferred = true. */
  readonly confidenceScore: number;
  /** Audit-honesty flag. MUST match `confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`. */
  readonly isInferred: boolean;
  /** Number of distinct runs that produced this node. */
  readonly observationCount: number;
  /** Source-evidence pointers for this node. */
  readonly rawEvidence: readonly EvidencePointer[];
}

// ── ProcessEdge ───────────────────────────────────────────────────────────────

/**
 * A directed edge in the process graph. References `fromNodeId` + `toNodeId`
 * by ProcessNode.id (foreign key invariant validated by Group C topology test).
 *
 * **Frequency semantics**:
 *   - `runFrequency` — absolute count of runs that traversed this edge
 *   - `runFrequencyPct` — fraction in [0, 1]; sum across out-edges from a single
 *     branching node should equal 1.0 ± ε (rounding tolerance handled in tests)
 */
export interface ProcessEdge {
  /** Stable deterministic identifier. */
  readonly id: string;
  /** FK to parent ProcessGraph. */
  readonly processGraphId: string;
  /** FK to ProcessNode.id (source). */
  readonly fromNodeId: string;
  /** FK to ProcessNode.id (target). */
  readonly toNodeId: string;
  /** Category of the edge (closed union). */
  readonly edgeType: EdgeType;
  /** Absolute count of runs traversing this edge. */
  readonly runFrequency: number;
  /** Fraction in [0, 1] of runs traversing this edge. */
  readonly runFrequencyPct: number;
  /** Confidence in [0, 1]. Audit-honesty IFF: < 0.55 ⇔ isInferred = true. */
  readonly confidenceScore: number;
  /** Audit-honesty flag. MUST match `confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`. */
  readonly isInferred: boolean;
  /** Source-evidence pointers. */
  readonly rawEvidence: readonly EvidencePointer[];
}

// ── Condition ─────────────────────────────────────────────────────────────────

/**
 * A branching condition attached to a DecisionPoint's outgoing edge.
 *
 * Example:
 *   "Approval Required" field === "Yes"
 *
 * Fields:
 *   - `description` — plain-English statement (≤ 200 chars; UI tooltip budget)
 *   - `conditionType` — closed-union categorization
 *   - `confidenceScore` + `isInferred` — audit-honesty pair (same IFF invariant)
 */
export interface Condition {
  readonly id: string;
  readonly decisionPointId: string;
  readonly description: string;
  readonly conditionType: ConditionType;
  readonly confidenceScore: number;
  readonly isInferred: boolean;
  readonly rawEvidence: readonly EvidencePointer[];
}

// ── DecisionPoint ─────────────────────────────────────────────────────────────

/**
 * A branching node enriched with decision metadata.
 *
 * Constraint: every node with `nodeType` in
 *   `{'decision', 'system_decision', 'human_judgment', 'approval', 'validation'}`
 * MUST have a corresponding DecisionPoint with `nodeId` matching the node's id
 * (1:1 invariant enforced by Group C topology test).
 *
 * `conditions: readonly Condition[]` — one condition per outgoing edge from
 * `nodeId`. Phase 1 is 1:N (DecisionPoint:Condition); M:N promotion at Phase 2
 * if reuse becomes significant (per system-architect ambiguity #3).
 */
export interface DecisionPoint {
  readonly id: string;
  readonly processGraphId: string;
  /** FK to ProcessNode.id (the branching node). */
  readonly nodeId: string;
  readonly decisionType: DecisionType;
  readonly conditions: readonly Condition[];
  readonly confidenceScore: number;
  readonly isInferred: boolean;
  readonly rawEvidence: readonly EvidencePointer[];
}

// ── Variant ───────────────────────────────────────────────────────────────────

/**
 * A clustered group of runs that follow a similar path through the graph.
 *
 * `variantHash` is the deterministic v2.0.0 hash of the variant's signature
 * (algorithm version pinned inside the payload per PATHE-P04 / DEP-08 closure).
 *
 * `variantLabel` from the 9-label `VariantLabel` taxonomy (PATHE-P08 multi-dim
 * HAC single-linkage clustering output).
 *
 * Invariant (Group C): exactly one `dominant_path` per ProcessGraph.
 */
export interface Variant {
  readonly id: string;
  readonly processGraphId: string;
  /** Deterministic v2.0.0 hash of the variant's normalized signature. */
  readonly variantHash: string;
  readonly variantLabel: VariantLabel;
  /** Run-count for this variant. */
  readonly runCount: number;
  /** Fraction in [0, 1] of total runs falling in this variant. */
  readonly runFrequencyPct: number;
  /** Mean run duration in milliseconds; null when N<2. */
  readonly meanDurationMs: number | null;
  /** Step count in the canonical path. */
  readonly stepCount: number;
  /** Ordered list of ProcessNode.id traversed by this variant. */
  readonly nodeSequence: readonly string[];
  readonly rawEvidence: readonly EvidencePointer[];
}

// ── ProcessGraph (root) ───────────────────────────────────────────────────────

/**
 * Append-only versioned root of the Path E graph for a single workflow.
 *
 * `graphVersion` (int) — revision counter; bumps when graph is re-merged with
 *                         new runs.
 * `graphSchemaVersion` (semver) — wire-format contract version; bumps when the
 *                         interfaces in this file change shape.
 *
 * Immutability: rows in the underlying Prisma table are NEVER mutated. A new
 * revision is INSERTed with a higher `graphVersion`; the previous revision is
 * preserved for byte-identical webhook replay + audit trail.
 */
export interface ProcessGraph {
  readonly id: string;
  readonly workflowId: string;
  /** Monotonic revision counter starting at 1. */
  readonly graphVersion: number;
  /** Wire-format contract version (PROCESS_GRAPH_SCHEMA_VERSION). */
  readonly graphSchemaVersion: ProcessGraphSchemaVersion;
  /** Total runs included in this revision. */
  readonly runCount: number;
  /** Wall-clock ms when this revision was computed (caller-supplied). */
  readonly computedAtMs: number;
  /** All nodes in this graph. */
  readonly nodes: readonly ProcessNode[];
  /** All edges in this graph. */
  readonly edges: readonly ProcessEdge[];
  /** All decision points in this graph. */
  readonly decisionPoints: readonly DecisionPoint[];
  /** All variants in this graph. */
  readonly variants: readonly Variant[];
  /** Honest degraded synthesis flag — true when graph was migrated from v1.0. */
  readonly isInferred: boolean;
  /** Overall confidence in [0, 1]. */
  readonly confidenceScore: number;
}

// ── ProcessEvidenceReview (CEO directive Appendix C) ──────────────────────────

/**
 * Review record for an evidence pointer (Reviewed-Evidence Retention Policy).
 *
 * Created when a user takes an explicit review action in the side-panel
 * Evidence tab (PATHE-P12, iter E+12). Drives the 365-day retention floor
 * for Team+ tiers vs 90-day floor for Free/Starter.
 *
 * Plan-tier capture: `planTierAtReview` snapshots the user's plan at write
 * time so retention is computed deterministically against the plan in force
 * at review time (not subject to retroactive change if plan changes later).
 *
 * Cleanup: daily BullMQ job `cleanup_expired_evidence_reviews` at 02:00 UTC
 * queries `retention_until < NOW()` and soft-deletes rows (move to
 * `process_evidence_reviews_archive` with `deletedAt`; hard-delete on day +30).
 */
export type ProcessEvidenceReviewAction =
  | 'mark_reviewed'
  | 'expand_evidence'
  | 'act_on_recommendation';

export interface ProcessEvidenceReview {
  readonly id: string;
  /** Composite ref to the EvidencePointer (workflowRunId + stepIndex). */
  readonly evidencePointerId: string;
  /** Denormalized for query — workflowRunId portion of evidencePointerId. */
  readonly workflowRunId: string;
  /** Denormalized for query — stepIndex portion of evidencePointerId. */
  readonly stepIndex: number;
  /** FK to User.id who performed the review. */
  readonly reviewedBy: string;
  /** Wall-clock ms when review action occurred. */
  readonly reviewedAtMs: number;
  /** Explicit review action taken (closed union). */
  readonly reviewAction: ProcessEvidenceReviewAction;
  /**
   * Computed at write-time:
   *   `reviewedAt + 365 days` for Team / Growth / Enterprise
   *   `reviewedAt + 90 days`  for Free / Starter
   */
  readonly retentionUntilMs: number;
  /** Plan tier snapshot at review time (free / starter / team / growth / enterprise). */
  readonly planTierAtReview: string;
  /** Wall-clock ms when the row was created. */
  readonly createdAtMs: number;
}
