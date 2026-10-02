/**
 * Path E — Process Graph Closed Unions + Schema Version (iter 076 / PATHE-P01)
 *
 * The 5 closed-union string-literal types that govern every entity in the Path E
 * graph model: NodeType (15) / EdgeType (10) / DecisionType (9) / ConditionType
 * (10) / VariantLabel (9). Plus the schema-version constant that pins the wire
 * format for `ProcessGraph` documents.
 *
 * Compile-time exhaustiveness pattern (parallel to Path D D+1 `ColumnKey` at
 * `apps/web-app/src/lib/dashboard-columns/types.ts:75-120`): each closed union is
 * mirrored by a frozen catalog array under `catalog/*.ts` with a `satisfies` +
 * `Exclude<T, U> extends never` lock that forces TypeScript to error at compile
 * time if a union member is added without also adding it to the catalog (or
 * vice-versa).
 *
 * Determinism contract (Ledgerium core invariant):
 *   - Pure type definitions; zero runtime.
 *   - No `Date.now()` / `Math.random()` / I/O reachable from this file.
 *
 * Audit-honesty contract (extends iter-049 + D+1 IFF invariant):
 *   - `isInferred === true IFF confidenceScore < 0.55` for ProcessNode / ProcessEdge
 *     / Condition (Group B invariant in topology tests).
 *
 * @see types/entities.ts — entity interfaces consuming these unions
 * @see catalog/*.ts — frozen mirror arrays with exhaustiveness locks
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §4 + Appendix C
 */

// ── Schema version ────────────────────────────────────────────────────────────

/**
 * Current Path E graph schema version (semver).
 *
 * Increment when the wire format of `ProcessGraph` changes (add/rename/remove
 * fields, change field semantics). Every increment MUST also ship a forward-
 * migration branch in `adapters/migrate-process-graph.ts` + a unit test.
 *
 * v1.0 = pre-Path-E linear `pathSignature` synthesis (existing `ProcessDefinition`
 *        rows; honest degraded `isInferred: true` `confidenceScore: 0.40`).
 * v2.0 = Path E launch (this iteration ships v2.0 contract).
 *
 * Pinned via `as const` so consumers get the literal type rather than `string`.
 */
export const PROCESS_GRAPH_SCHEMA_VERSION = '2.0' as const;

/**
 * Closed-union type alias for the schema version. Future bumps add a member;
 * removal of a member is a breaking change and MUST be accompanied by a major
 * version bump in `package.json` + a coordinated archive snapshot under
 * `archive/v{major}_{minor}_{patch}.ts`.
 */
export type ProcessGraphSchemaVersion = '1.0' | '2.0';

// ── NodeType (15 members) ─────────────────────────────────────────────────────

/**
 * Closed union of every node category Path E can produce.
 *
 * Categories:
 *  - `start` / `end` — graph terminals (exactly one of each per ProcessGraph)
 *  - `action` — observed user interaction (click / type / select / navigate)
 *  - `decision` / `system_decision` / `human_judgment` — branching nodes
 *  - `approval` / `validation` — gate semantics
 *  - `exception` — exception path entry
 *  - `retry` — retry-loop anchor
 *  - `loop` — non-retry repetition
 *  - `handoff` — between-system or between-person transition
 *  - `wait` — observed pause / async wait
 *  - `ai_opportunity` — node identified by automation classifier as AI-suitable
 *  - `automation_opportunity` — node identified as deterministic-automation
 *    suitable (RPA / API / rule-based)
 *
 * Members enumerated in `catalog/node-types.ts` (frozen array + exhaustiveness
 * lock). Member order in this union is canonical; DO NOT reorder without
 * also updating the catalog array.
 */
export type NodeType =
  | 'start'
  | 'end'
  | 'action'
  | 'decision'
  | 'system_decision'
  | 'human_judgment'
  | 'approval'
  | 'validation'
  | 'exception'
  | 'retry'
  | 'loop'
  | 'handoff'
  | 'wait'
  | 'ai_opportunity'
  | 'automation_opportunity';

// ── EdgeType (10 members) ─────────────────────────────────────────────────────

/**
 * Closed union of every edge category Path E can produce.
 *
 * Categories:
 *  - `sequence` — default forward edge between sequential steps
 *  - `branch` — outgoing edge from a decision node
 *  - `merge` — convergence edge into a merge point
 *  - `exception` — edge into an exception path
 *  - `retry` — back-edge in a retry loop
 *  - `loop` — back-edge in a non-retry loop
 *  - `fallback` — fallback path edge
 *  - `escalation` — escalation path edge
 *  - `approval` — approval-success edge
 *  - `rejection` — approval-rejection edge
 *  - `automation_candidate` — edge into a node tagged automation_opportunity
 *
 * Members enumerated in `catalog/edge-types.ts` (frozen array + exhaustiveness
 * lock).
 */
export type EdgeType =
  | 'sequence'
  | 'branch'
  | 'merge'
  | 'exception'
  | 'retry'
  | 'loop'
  | 'fallback'
  | 'escalation'
  | 'approval'
  | 'rejection'
  | 'automation_candidate';

// ── DecisionType (9 members) ──────────────────────────────────────────────────

/**
 * Closed union for `DecisionPoint.decisionType`.
 *
 * Categories (mapped 1:1 from decision-detection-engine signal taxonomy in
 * PATHE-P05/P06/P07):
 *  - `user_choice` — user clicked one of N user-driven options
 *  - `business_rule` — branching driven by a known business rule
 *  - `system_state` — branching driven by system-side state (e.g. modal open)
 *  - `data_condition` — branching driven by observed field value
 *  - `approval_decision` — approve/reject branching
 *  - `validation_result` — validation success/failure branching
 *  - `exception_handling` — exception-modal-driven branching
 *  - `human_judgment` — long-pause + role-divergence (subjective)
 *  - `unknown_inferred` — branching detected but mechanism not classifiable
 *    (carries `isInferred: true` + `confidenceScore < 0.55`)
 */
export type DecisionType =
  | 'user_choice'
  | 'business_rule'
  | 'system_state'
  | 'data_condition'
  | 'approval_decision'
  | 'validation_result'
  | 'exception_handling'
  | 'human_judgment'
  | 'unknown_inferred';

// ── ConditionType (10 members) ────────────────────────────────────────────────

/**
 * Closed union for `Condition.conditionType`.
 *
 * Categories represent the kind of evidence the condition was inferred from:
 *  - `ui_state` — DOM-derived state (modal open, button enabled)
 *  - `user_input` — observed user typing / selection
 *  - `field_value` — observed form-field content
 *  - `system_response` — server-response-driven branching
 *  - `data_threshold` — numeric threshold ("amount ≥ 1000")
 *  - `role_permission` — user-role-based branching
 *  - `approval_status` — observed approval/rejection
 *  - `validation_status` — validation pass/fail
 *  - `timing_based` — branching driven by wait threshold
 *  - `inferred_unknown` — fallback (carries `isInferred: true`)
 */
export type ConditionType =
  | 'ui_state'
  | 'user_input'
  | 'field_value'
  | 'system_response'
  | 'data_threshold'
  | 'role_permission'
  | 'approval_status'
  | 'validation_status'
  | 'timing_based'
  | 'inferred_unknown';

// ── VariantLabel (9 members) ──────────────────────────────────────────────────

/**
 * Closed union for `Variant.variantLabel` — the 9-label taxonomy produced by
 * PATHE-P08 variant clustering.
 *
 * Labels rank by behavioral semantics (NOT by raw frequency alone):
 *  - `dominant_path` — most-frequent path (≥40% of runs typically)
 *  - `standard_path` — secondary high-frequency path
 *  - `alternate_path` — mid-frequency alternative
 *  - `exception_path` — exception-handling path
 *  - `failure_path` — terminating in failure
 *  - `escalation_path` — escalation triggered
 *  - `rework_path` — rework loop detected
 *  - `high_performance_path` — significantly faster than dominant
 *  - `low_performance_path` — significantly slower than dominant
 *
 * Exactly one `dominant_path` per ProcessGraph (enforced by topology invariant
 * in `validation/topology.ts`).
 */
export type VariantLabel =
  | 'dominant_path'
  | 'standard_path'
  | 'alternate_path'
  | 'exception_path'
  | 'failure_path'
  | 'escalation_path'
  | 'rework_path'
  | 'high_performance_path'
  | 'low_performance_path';

// ── Audit-honesty thresholds (Group B invariant) ──────────────────────────────

/**
 * Confidence threshold below which an entity MUST set `isInferred: true`.
 *
 * Mirrors UX 4-band confidence remap (PATHE-P03):
 *   - High    ≥ 0.80 → Green
 *   - Medium  0.55–0.79 → Amber
 *   - Low     0.30–0.54 → Orange
 *   - Unknown < 0.30 → Grey
 *
 * Path E invariant: `isInferred === true IFF confidenceScore < INFERRED_CONFIDENCE_THRESHOLD`.
 * Group B topology test enforces this for every ProcessNode + ProcessEdge +
 * Condition. PATHE-P03 (iter E+3) will additionally enforce the HARD UX rule
 * that the ConfidenceIndicator NEVER renders "High" when N < 5, regardless of
 * computed value — that is a display-time cap, not a data invariant.
 */
export const INFERRED_CONFIDENCE_THRESHOLD = 0.55 as const;

/**
 * Honest degraded synthesis confidence floor for v1.0 → v2.0 migration.
 *
 * When `migrateProcessGraph` synthesizes a linear v2.0 graph from a pre-Path-E
 * `pathSignature` string, every node + edge carries `isInferred: true` and
 * `confidenceScore: V1_DEGRADED_SYNTHESIS_CONFIDENCE`. This is intentionally
 * below `INFERRED_CONFIDENCE_THRESHOLD` so the UX renders the synthesized graph
 * with explicit low-confidence affordances ("Inferred from prior signature —
 * record more runs for high-confidence detection").
 */
export const V1_DEGRADED_SYNTHESIS_CONFIDENCE = 0.4 as const;
