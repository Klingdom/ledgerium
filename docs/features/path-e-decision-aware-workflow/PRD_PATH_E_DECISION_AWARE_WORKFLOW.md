# PRD — Path E: Decision-Aware Workflow Modeling
## Product Manager Section — DECISION_AWARE_WORKFLOW_VISION_REVIEW_001

**Date:** 2026-05-18
**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting)
**Author section:** `product-manager`
**Status:** DRAFT — awaits CEO review and specialist-agent synthesis before any build iteration opens

---

## Executive Summary

Path E transforms Ledgerium from a linear-sequence recorder into a graph-native process intelligence platform. A Ledgerium workflow today is a flat ordered list of `DerivedStep` objects. After Path E, that same recording becomes a node in a directed graph where branches, decision points, conditional edges, retry loops, and exception paths are first-class structures — fully traced to the original `source_event_ids` that produced them.

The competitive premise is direct: every incumbent process-mapping/mining/SOP tool (Celonis, UiPath Process Mining, Lucidchart, Miro, Visio, Scribe) either (a) requires manual diagram drawing, (b) mines from ERP/database logs rather than observed browser behavior, or (c) records linearly without branching awareness. Ledgerium's combination of automated observation + deterministic graph construction from real runs is category-distinctive.

**Honest timeline: 10 phases = 18-22 iterations.** This is not a sprint. Do not let the visual appeal of a Process Map UI pull scope into an early phase. The data model and merge algorithm must ship and be proven correct before any pixel is rendered.

**MVP gate (phases 1-4 only = 7-9 iterations):** Graph schema + observed-path normalization + variant detection upgrade + process-map v1 UI. This is the minimum surface that makes Path E visibly distinct from what is shipped today.

**Hard constraint:** Path E must not modify the extension capture pipeline (MV3 Chrome extension, `apps/extension-app/`). `DerivedStep` is the input contract; graph construction happens server-side or in-package, downstream of the existing deterministic segmentation output.

---

## A. MVP Scope Definition

### What constitutes "better than current process mapping/mining/SOP software"

Three testable claims at MVP exit:

1. **Observed-first:** every graph node traces to real `source_event_ids` — no manual diagram, no synthetic steps.
2. **Branch-aware:** multiple recordings of the same workflow produce a merged canonical graph with branch frequencies from real data, not guesses.
3. **Confidence-labeled:** every edge, branch condition, and decision point carries a numeric confidence score derived from the variant detection algorithm — users see "2 of 5 runs took this path (40%)" not a bare arrow.

No competitor ships all three simultaneously from browser-observed behavior. Celonis ships (2) and (3) from ERP logs but not (1). Scribe ships (1) but not (2) or (3).

### MVP: MUST-SHIP capability areas (phases 1-4)

| Capability Area | MVP? | Rationale |
|---|---|---|
| Graph schema (ProcessGraph type + node/edge types) | MUST-SHIP | Foundation for everything; no UI can render without it |
| Normalization / observed-path extraction | MUST-SHIP | Converts existing DerivedStep arrays into linear graph paths |
| Decision detection (branch point identification) | MUST-SHIP | The core differentiator; minimum viable without this is just Scribe |
| Variant clustering (upgrade existing variantDetector) | MUST-SHIP | Already partially built; needs graph-native output |
| Graph merge (multi-run canonical graph construction) | MUST-SHIP | Required for "multiple recordings → one map" |
| Process Map UI (read-only, v1) | MUST-SHIP | Without some visual surface the graph is invisible to users |
| Side panel (click-to-explain) | MUST-SHIP | Without explainability the graph is untrustworthy |
| SOP generation with conditional logic | DEFER (Phase 5) | Valuable but not required to prove core graph claim |
| AI intelligence layer | DEFER (Phase 6-7) | Depends on AI Vision Build; dangerous to couple at MVP |
| Automation opportunity per branch | DEFER (Phase 6-7) | Same AI Vision dependency |
| Advanced metrics (per-branch cycle time, etc.) | DEFER (Phase 5) | Path C metrics engine must ship first |
| Variant Explorer UI | DEFER (Phase 5) | Tabular view first; full explorer is Phase 2 |
| Best-practice recommender | DEFER (Phase 8) | Requires sufficient corpus; not MVP |
| Confidence model calibration | DEFER (Phase 4, partial) | Basic confidence at MVP; calibration curve Phase 4 |
| Empty states / sparse states | MUST-SHIP | Required for trust; zero-data empty state ships with UI |
| Import/Export (graph JSON + Mermaid + SOP + agent-spec) | DEFER (Phase 6) | Markdown export ships at Phase 5; full suite Phase 6 |

### Capability areas explicitly excluded from MVP

- BPMN import/export (Phase 2+)
- Real-time collaborative editing of process map
- Manual node addition/deletion by user (graph is observation-derived only at MVP)
- AI-inferred branch conditions without confidence labels (never allowed)
- Graph database (Neo4j/DGraph) — Postgres+JSONB sufficient for MVP per architecture default

### Realistic MVP iteration count

Phases 1-4 = 7-9 iterations. Be honest: phase 3 (graph merge algorithm) is the hardest single piece of work in Path E and will likely require 2-3 iterations on its own (schema + algorithm + correctness tests). Phase 4 (Process Map UI) requires a rendering library selection and component build that is 2-3 iterations minimum.

Total Path E = 18-22 iterations across 10 phases.

---

## B. 10-Phase Mapping

---

### Phase 1: Graph Schema + Type Contracts

**Mission:** Define the canonical `ProcessGraph` type system. No computation, no UI — pure contract definition that every downstream phase imports.

**Acceptance criteria:**
1. AC-1.1: A new pure-TypeScript module `packages/process-graph/src/types.ts` exports `ProcessGraph`, `GraphNode`, `GraphEdge`, `DecisionPoint`, `BranchCondition`, `VariantPath`, and `GraphConfidenceScore` with zero imports from web-app or extension-app.
2. AC-1.2: `GraphNode` union type covers `ObservedStepNode | DecisionNode | StartNode | EndNode | ExceptionNode | RetryLoopAnchorNode`. Each variant carries `nodeId: string`, `confidence: number` in `[0,1]`, and `evidenceRunIds: readonly string[]`.
3. AC-1.3: `GraphEdge` carries `fromNodeId`, `toNodeId`, `frequency: number` (absolute run count), `frequencyPct: number` (0-1 fraction of runs traversing this edge), `conditions: BranchCondition[]`, and `evidenceRunIds`.
4. AC-1.4: `BranchCondition` carries `description: string` (plain English), `inferenceMethod: 'observed' | 'inferred' | 'annotated'`, and `confidence: number`.
5. AC-1.5: `ProcessGraph` carries `graphVersion: string` (semver), `workflowId: string`, `runCount: number`, `computedAt: string` (ISO 8601), `nodes: readonly GraphNode[]`, `edges: readonly GraphEdge[]`, `decisionPoints: readonly DecisionPoint[]`, and `mergeRuleVersion: string`.
6. AC-1.6: All exported types are frozen-at-compile-time via `Readonly<>` or `as const`; no mutable exported objects.
7. AC-1.7: `packages/process-graph/src/types.test.ts` achieves 100% type-coverage via `satisfies` assertions for all union members; minimum 10 substantive `it()` blocks.
8. AC-1.8: `pnpm typecheck` passes clean across all packages; zero new `any` types introduced.

**Estimated iterations:** 1

**Primary agent:** `system-architect`

**D-4 gate forecast:**
- Clause 2 (≥200 LOC pure module): FIRES. `types.ts` + `index.ts` will exceed 200 LOC of exported interface surface. `system-architect` PRIMARY satisfies the gate intrinsically.
- Clause 1 (≥3 user-visible strings): does NOT fire (pure type module; zero UI copy).

**Dependencies:** None. Parallel-safe with Path C R+1 (no schema overlap at phase 1).

**Risk:** LOW. Pure type definition with zero runtime. Only risk is naming-convention drift if not locked early.

**Inputs required:**
- `packages/segmentation-engine/src/types.ts` — `DerivedStep`, `GroupingReason`, `BoundaryReason` (consumed as inputs to graph construction, not modified)
- `packages/intelligence-engine/src/types.ts` — `VariantSet`, `ProcessVariant`, `PathSignature` (graph types must be compatible with existing variant output)

**Outputs to downstream:**
- `packages/process-graph/src/types.ts` — consumed by phases 2, 3, 4, 5, 6, 7, 8, 9, 10

---

### Phase 2: Observed-Path Extractor (Linear Graph Construction)

**Mission:** Given a single `ProcessRun` + `ProcessDefinition` (one recording), produce a valid `ProcessGraph` containing only `ObservedStepNode` and `StartNode`/`EndNode` entries — a linear graph. No branching yet. This validates the data model against real data before the merge algorithm ships.

**Acceptance criteria:**
1. AC-2.1: New pure module `packages/process-graph/src/pathExtractor.ts` exports `extractObservedPath(bundle: ProcessRunBundle): ProcessGraph`.
2. AC-2.2: Output graph for a single run has exactly `runCount: 1`, one `StartNode`, one `EndNode`, N `ObservedStepNode` entries (N = `DerivedStep` count), and N+1 `GraphEdge` entries (start → step[0] → ... → step[N-1] → end).
3. AC-2.3: Each `ObservedStepNode` carries `evidenceRunIds: [bundle.processRun.runId]` and `confidence: bundle.processRun.steps[i].confidence` (direct passthrough from `DerivedStep.confidence`).
4. AC-2.4: All edges on a single-run linear path carry `frequency: 1` and `frequencyPct: 1.0`.
5. AC-2.5: `extractObservedPath` is deterministic: identical inputs produce byte-identical JSON-serializable output.
6. AC-2.6: `packages/process-graph/src/pathExtractor.test.ts` contains minimum 12 substantive `it()` blocks covering: empty session, single-step session, 5-step session, `evidenceRunId` propagation, confidence passthrough, edge count invariant (nodes − 1 = edges for linear path), and determinism repeat-call test.
7. AC-2.7: Zero `Date.now()` or `Math.random()` calls inside `pathExtractor.ts`; `computedAt` receives an injected `nowIso: string` parameter.
8. AC-2.8: `pnpm typecheck` clean; `pnpm test` passes with ≥12 new tests in workspace count.

**Estimated iterations:** 1

**Primary agent:** `backend-engineer`

**D-4 gate forecast:**
- Clause 2: FIRES if total module LOC ≥200 (probable for pathExtractor + types integration). `system-architect` adjacency required for contract review.
- Clause 1: does NOT fire.

**Dependencies:** Phase 1 (`ProcessGraph` type contract must exist).

**Risk:** LOW. Mechanical transformation from existing DerivedStep array to graph structure.

**Inputs required:**
- `packages/process-graph/src/types.ts` (Phase 1 output)
- `packages/process-engine/src/types.ts` — `ProcessRun`, `ProcessDefinition`
- `packages/intelligence-engine/src/types.ts` — `ProcessRunBundle`

**Outputs to downstream:**
- `packages/process-graph/src/pathExtractor.ts` — consumed by Phase 3 (merge algorithm tests), Phase 4 (UI data source)

---

### Phase 3: Multi-Run Graph Merge Algorithm

**Mission:** The hardest phase in Path E. Given N `ProcessGraph` objects (each from one run, produced by Phase 2), merge them into a single canonical `ProcessGraph` with branch detection, decision point identification, edge frequency computation, and variant labeling. This is the core differentiator.

**Acceptance criteria:**
1. AC-3.1: New module `packages/process-graph/src/graphMerger.ts` exports `mergeGraphs(graphs: readonly ProcessGraph[], options: GraphMergeOptions): ProcessGraph`.
2. AC-3.2: Two runs with identical step sequences produce a merged graph with no branch nodes and all edges at `frequencyPct: 1.0`.
3. AC-3.3: Two runs where run B inserts one extra step at position 3 produce a merged graph with a `DecisionNode` at position 3, one edge with `frequencyPct: 0.5` leading to the extra step, and a bypass edge with `frequencyPct: 0.5` skipping it.
4. AC-3.4: A run that ends earlier than the standard path (exception/truncated run) produces an `ExceptionNode` at the divergence point with `frequencyPct` equal to the fraction of runs that terminated early.
5. AC-3.5: Retry loop detection: a run that revisits a previously-seen step category (e.g., `fill_and_submit` → `error_handling` → `fill_and_submit`) produces a `RetryLoopAnchorNode` with a back-edge carrying the retry run count.
6. AC-3.6: Merged graph `runCount` equals the count of input graphs.
7. AC-3.7: All merged `GraphEdge.evidenceRunIds` entries are accurate — each run ID appears exactly in the edges it contributed to, verifiable by tracing back to the Phase 2 output.
8. AC-3.8: `mergeRuleVersion` on output graph matches the current `GRAPH_MERGE_RULE_VERSION` constant (semver string, locked in `graphMerger.ts`).
9. AC-3.9: Minimum 20 substantive `it()` blocks in `graphMerger.test.ts` covering: identical runs, single divergence, multi-branch, exception path, retry loop, N=1 (trivial merge), N=100 (stress test for determinism), `evidenceRunIds` accuracy across all 7 AC cases.
10. AC-3.10: `graphMerger.ts` must pass a circular-dependency check: zero imports from `web-app`, `extension-app`, or any Prisma-touching module.
11. AC-3.11: `pnpm test` workspace count increases by ≥20 substantive blocks.

**Estimated iterations:** 2-3 (recommend 3: schema iteration, algorithm iteration, correctness + stress test iteration)

**Primary agent:** `system-architect` (iterations 1-2), `qa-engineer` (iteration 3 — correctness + stress)

**D-4 gate forecast:**
- Clause 2: FIRES (graphMerger.ts will exceed 300 LOC exported surface). `system-architect` PRIMARY satisfies the gate.
- Clause 1: does NOT fire.

**Dependencies:** Phase 1 (types), Phase 2 (pathExtractor — needed for test fixture generation).

**Risk:** HIGH. Graph merge is algorithmically complex. The AC surface is explicit to prevent scope drift. Key risk: the similarity threshold for "same step position" across runs requires careful tuning against real recorded data (reuse `VARIANT_SIMILARITY_THRESHOLD: 0.75` from `packages/intelligence-engine/src/types.ts` as the starting default per `INTELLIGENCE_DEFAULTS`). A wrong threshold produces false branches or missed branches. Recommend CEO allocate a correctness-review iteration explicitly.

**Inputs required:**
- Phase 1 + Phase 2 outputs
- `packages/intelligence-engine/src/variantDetector.ts` — `detectVariants()` algorithm reviewed for reuse of the similarity-scoring logic (do not duplicate; extend or consume)
- `packages/intelligence-engine/src/pathSignature.ts` — `computePathSignature()`, `computeSignatureSimilarity()` (directly reusable for merge-position alignment)

**Outputs to downstream:**
- `packages/process-graph/src/graphMerger.ts` — consumed by Phase 4 API route, Phase 5 metrics, Phase 6 export, Phase 7 AI layer

---

### Phase 4: Process Map v1 UI + API Route + Side Panel

**Mission:** Ship the first user-visible Process Map. Read-only. Accessed at `/workflows/[id]/map`. Renders the merged `ProcessGraph` as a directed node-edge diagram. Clicking any node or edge opens a side panel with the click-to-explain surface.

**Acceptance criteria:**
1. AC-4.1: New route `/workflows/[id]/map` renders a full-page Process Map view; the existing `/workflows` tabular dashboard is preserved byte-identical.
2. AC-4.2: New API endpoint `GET /api/workflows/[id]/graph` returns a serialized `ProcessGraph` computed by calling Phase 3 `mergeGraphs()` over all runs associated with `workflowId`.
3. AC-4.3: Decision points render as diamond-shaped nodes (or distinct visual treatment) with the branch count visible (`2 branches`).
4. AC-4.4: Each edge displays its frequency percentage (e.g., `40%`) inline on the edge label; edges with `frequencyPct < 0.2` are visually de-emphasized (lower opacity or dashed).
5. AC-4.5: Exception nodes and retry loop anchors use a distinct visual treatment (color or icon) separate from standard step nodes.
6. AC-4.6: Clicking any node opens a side panel showing: node title, node type, confidence score (e.g., `Confidence: 87%`), run count contributing to this node, list of `evidenceRunIds` (truncated to 5 with "and N more" overflow), and the `BranchCondition.description` in plain English for decision nodes.
7. AC-4.7: The side panel is keyboard-accessible: Tab reaches it, Escape closes it, focus returns to the triggering node on close (reuses `useEscapeDispatch` pattern from `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx`).
8. AC-4.8: Empty state: when `runCount < 2` (insufficient data for merge), the Process Map route renders a deterministic empty state: "Record this workflow at least twice to see how paths compare" with a CTA linking to the extension install page.
9. AC-4.9: Sparse state: when `runCount >= 2` but all runs have identical paths, the map renders but displays an info banner: "All recordings followed the same path — record more variations to reveal decision points."
10. AC-4.10: The rendering library selection is a CEO decision (D-03); the component is abstracted behind a `ProcessMapRenderer` interface so the library can be swapped without changing the API or data layer.
11. AC-4.11: `GET /api/workflows/[id]/graph` returns `{ data: ProcessGraph | null, error: string | null, meta: { runCount: number, computedAt: string } }` matching the `{ data, error, meta }` API envelope from `CLAUDE.md` Coding Standards.
12. AC-4.12: New E2E tests in `apps/web-app/e2e/app/workflows/map.spec.ts`: map renders for a workflow with ≥2 runs; side panel opens on node click; Escape closes side panel; empty state renders for 0-run workflow; axe compliance scan on map view (zero critical/serious violations).
13. AC-4.13: Free-tier users see a gated version of the map: linear path only (no branch overlay), with a gate chip "Decision branches available on Starter+" — same gating pattern as `HealthTooltip` in `WorkflowRow.tsx`.

**Estimated iterations:** 2-3 (API route + data plumbing: 1 iteration; UI component + side panel: 1-2 iterations)

**Primary agent:** `frontend-engineer` (UI), `backend-engineer` (API route)

**D-4 gate forecast:**
- Clause 1 (≥3 user-visible strings): FIRES. Process Map UI will introduce ≥10 new user-visible strings (node labels, edge labels, side panel copy, empty state, gate chip). `growth-strategist` adjacency MANDATORY.
- Clause 2 (≥200 LOC pure module): FIRES if `ProcessMapRenderer` abstraction layer exceeds 200 LOC exported surface. `system-architect` adjacency likely.

**Dependencies:** Phases 1, 2, 3 all complete. CEO decision on rendering library (D-03) must be made before this phase begins.

**Risk:** MEDIUM. The UI is the first user-visible surface; scope pressure will be high. The `ProcessMapRenderer` abstraction layer is the correct approach to manage library-swap risk. The axe compliance requirement is non-negotiable given Ledgerium's MDR-P06/P07/P08 history.

**Inputs required:**
- Phases 1-3 outputs
- `apps/web-app/src/lib/dashboard-columns/types.ts` — `ColumnAccessorContext` + `TimeRange` (for consistent time-filtering pattern if graph is time-window scoped)
- `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx` — `useEscapeDispatch` pattern for side panel keyboard management
- `apps/web-app/prisma/schema.prisma` — `Workflow` model (to confirm no schema migration needed at Phase 4; `processDefinitionId` FK already exists)

**Outputs to downstream:**
- `/workflows/[id]/map` route (consumed by Phase 5 for metrics tab, Phase 6 for export surface, Phase 7 for AI recommendation overlay)
- `ProcessMapRenderer` interface (Phase 9 can upgrade rendering library without breaking data layer)

---

### Phase 5: Decision-Aware Metrics + Variant Explorer Tab

**Mission:** Extend the existing metrics engine with per-branch and per-variant statistics. Add a Variant Explorer tab at `/workflows/[id]/variants`. Integrate with Path C (v3 metrics engine) rather than duplicating it.

**Acceptance criteria:**
1. AC-5.1: New API endpoint `GET /api/workflows/[id]/variants` returns `VariantSet` (already computed by `packages/intelligence-engine/src/variantDetector.ts`) plus per-variant duration statistics from `TimestudyResult`.
2. AC-5.2: Variant Explorer tab at `/workflows/[id]/variants` renders a sortable table: variant label, run count, frequency %, mean duration, decision divergence point, and a "View on map" link that navigates to `/workflows/[id]/map?highlight=variantId`.
3. AC-5.3: Process Map view accepts `?highlight=variantId` query param and visually highlights all nodes/edges belonging to the specified variant.
4. AC-5.4: Per-branch cycle time metrics computed and displayed in the side panel for each `DecisionNode`: "Runs taking this branch: median X ms (N runs)" vs "Runs taking alternate branch: median Y ms (M runs)".
5. AC-5.5: SOP generation extended to include conditional logic blocks: `IF [BranchCondition.description] THEN [step sequence] ELSE [alternate step sequence]` at each `DecisionNode`.
6. AC-5.6: Markdown SOP export (`/api/workflows/[id]/export?format=markdown`) includes conditional logic blocks per AC-5.5.
7. AC-5.7: Low-confidence annotations: any decision point with `confidence < 0.6` renders a warning label "Inferred condition — verify manually" in both the map view and the SOP export.
8. AC-5.8: Exception paths in the SOP export produce a separate section "Exception Paths" listing each exception node with its frequency and evidence run IDs.
9. AC-5.9: Minimum 15 substantive `it()` blocks covering AC-5.1 through AC-5.8.

**Estimated iterations:** 2

**Primary agent:** `backend-engineer` (metrics API), `frontend-engineer` (Variant Explorer UI)

**D-4 gate forecast:**
- Clause 1: FIRES (SOP conditional-logic copy + variant explorer labels ≥3 strings). `growth-strategist` adjacency MANDATORY.
- Clause 2: FIRES if SOP generation module ≥200 LOC. `system-architect` adjacency for SOP conditional-logic contract.

**Dependencies:** Phases 1-4. Path C metrics engine (v3) must be in flight or complete for per-branch cycle time; if not shipped, Phase 5 uses existing `workflow-metrics.ts` `medianDurationMs` as a proxy.

**Risk:** MEDIUM. The SOP conditional-logic generation requires careful template design; overly generic templates produce SOP copy that is no better than existing tools.

**Inputs required:**
- Phases 1-4 outputs
- `packages/intelligence-engine/src/variantDetector.ts` — `detectVariants()` (already returns `VariantSet`)
- `packages/intelligence-engine/src/timestudyAnalyzer.ts` — `analyzeTimestudy()` (per-step duration statistics)
- `apps/web-app/src/lib/workflow-metrics.ts` — existing `WorkflowMetricsOutput` (bridge for metrics compatibility)

**Outputs to downstream:**
- `/api/workflows/[id]/variants` endpoint
- Markdown SOP export endpoint
- Conditional-logic SOP template (consumed by Phase 8 best-practice recommender)

---

### Phase 6: Export Suite (Graph JSON + Mermaid + Agent-Spec)

**Mission:** Complete the export surface. Graph JSON and Markdown SOP are shipped in Phase 5. Phase 6 adds Mermaid diagram export, agent-spec export (for AI Vision Build handoff), and a structured `ProcessGraph` JSON format per AC-15.

**Acceptance criteria:**
1. AC-6.1: `GET /api/workflows/[id]/export?format=graph-json` returns a well-formed `ProcessGraph` JSON document with all nodes, edges, decision points, variant labels, and confidence scores.
2. AC-6.2: `GET /api/workflows/[id]/export?format=mermaid` returns a valid Mermaid `flowchart TD` document renderable by the Mermaid CLI without errors.
3. AC-6.3: `GET /api/workflows/[id]/export?format=agent-spec` returns a structured JSON document compatible with AI Vision Build's recommendation engine input contract (defined in `docs/runbooks/AI_AGENT_SPEC_FORMAT.md` — new runbook created in this phase).
4. AC-6.4: All export formats are gated at Starter+ tier; free-tier users receive a 402 response with a `{ error: "Export available on Starter+", upgradeUrl: "/pricing" }` body.
5. AC-6.5: Export endpoint accepts optional `?variantId=` param to export a single variant path rather than the full merged graph.
6. AC-6.6: Mermaid export maps `DecisionNode` to `{decision}` diamond shape; `ExceptionNode` to `(exception)` rounded shape; `RetryLoopAnchorNode` to `[retry]` standard rectangle with a back-edge.
7. AC-6.7: Minimum 10 substantive `it()` blocks covering each format, free-tier gate, and variant-scoped export.

**Estimated iterations:** 1

**Primary agent:** `backend-engineer`

**D-4 gate forecast:**
- Clause 1: does NOT fire (export format is backend-only; zero new UI copy).
- Clause 2: May fire if export module ≥200 LOC. `system-architect` adjacency if so.

**Dependencies:** Phases 1-5.

**Risk:** LOW. Export is mechanical serialization of the already-computed `ProcessGraph`.

**Inputs required:** Phases 1-5 outputs; AI Vision Build `agent-spec` format TBD (coordinate with `system-architect` before shipping AC-6.3).

**Outputs to downstream:** `agent-spec` export consumed by AI Vision Build AI+4 recommendation engine.

---

### Phase 7: AI Intelligence Layer Integration

**Mission:** Integrate Path E graph structures with the AI Vision Build recommendation engine. Each branch and decision point in the process map becomes a candidate surface for AI recommendation. This phase does NOT build the AI provider adapter (that is AI Vision Build AI+1 through AI+3) — it adds the graph-native input surface.

**Acceptance criteria:**
1. AC-7.1: `packages/ai-recommendation-engine/src/graphRecommender.ts` (new module) accepts a `ProcessGraph` and produces `GraphRecommendation[]` — a list of per-node/per-edge AI fit assessments with `recommendationId`, `targetNodeId`, `recommendationType: 'automate' | 'optimize' | 'monitor'`, `rationale: string` (plain English), `confidence: number`, and `evidenceEdgeIds`.
2. AC-7.2: Process Map UI renders AI recommendation badges on nodes/edges that have `GraphRecommendation` entries; clicking a badge opens the side panel extended with the recommendation detail.
3. AC-7.3: Automation opportunity score per branch: each branch edge in the map displays an `aiOpportunityScore` (0-100) computed from `packages/intelligence-engine/src/automationScorer.ts` (already exists — `scoreAutomationOpportunity()`); no new computation, new visual surface only.
4. AC-7.4: Free tier: no AI recommendation badges visible; recommendation count shown as a locked chip "3 AI automation opportunities — unlock on Growth+".
5. AC-7.5: Minimum 10 substantive `it()` blocks covering AC-7.1 through AC-7.4; `graphRecommender.ts` has zero imports from `ai-provider-adapter` (determinism boundary: recommendations are pure output; AI API calls happen in the execution layer, not here).
6. AC-7.6: `graphRecommender.ts` passes circular-dependency check: ZERO imports from any AI provider adapter module (parallel to existing `dashboard-columns/registry.test.ts` closed-union test pattern).

**Estimated iterations:** 2

**Primary agent:** `system-architect` (contract + determinism boundary), `frontend-engineer` (UI badges)

**D-4 gate forecast:**
- Clause 1: FIRES (AI recommendation badges + locked chip copy ≥3 strings). `growth-strategist` adjacency MANDATORY.
- Clause 2: FIRES (`graphRecommender.ts` will exceed 200 LOC). `system-architect` PRIMARY satisfies gate.

**Dependencies:** Phases 1-6. AI Vision Build AI+1 (provider adapter) must have shipped its `AIProviderAdapter` interface before AC-7.1 contract can be finalized. If AI Vision Build has NOT shipped, Phase 7 ships AC-7.3 only (automation score visualization) and defers AC-7.1 + AC-7.2.

**Risk:** HIGH. This phase is the coupling point between Path E and AI Vision Build. If AI Vision Build timeline slips, Phase 7 has a safe partial scope (AC-7.3 + AC-7.4 only). Do not block the entire phase on AI Vision Build readiness.

**Inputs required:**
- Phases 1-6 outputs
- AI Vision Build `AIProviderAdapter` interface (if shipped)
- `packages/intelligence-engine/src/automationScorer.ts` — `scoreAutomationOpportunity()`
- `docs/runbooks/AI_AGENT_SPEC_FORMAT.md` (Phase 6 output)

**Outputs to downstream:** `GraphRecommendation[]` consumed by Phase 8 best-practice recommender.

---

### Phase 8: Best-Practice Recommender + Confidence Model

**Mission:** Use the portfolio of merged process graphs across all workflows to surface cross-workflow best-practice recommendations ("3 of your workflows share this step pattern; the fastest variant takes 40% less time"). This requires aggregating across `ProcessGraph` objects, not just within one.

**Acceptance criteria:**
1. AC-8.1: New API endpoint `GET /api/portfolio/graph-patterns` returns `CrossWorkflowPattern[]` — groups of workflows sharing a structurally similar sub-graph pattern, ranked by aggregate time savings potential.
2. AC-8.2: Portfolio-level view at `/dashboard` (existing portfolio command header) displays a new insight chip "Best-practice available" when a `CrossWorkflowPattern` exists with ≥3 member workflows and time savings potential ≥20%.
3. AC-8.3: Confidence model: all confidence scores across `ProcessGraph` (node confidence, edge confidence, branch condition confidence) are calibrated against real run outcomes using a held-out validation set. Calibration report accessible at `GET /api/portfolio/confidence-calibration` returning observed accuracy vs predicted confidence in 10 buckets.
4. AC-8.4: Low-confidence propagation: if a `DecisionNode` confidence < 0.5, all downstream nodes in that branch inherit `confidence: max(parentConfidence, nodeConfidence)` (conservative floor).
5. AC-8.5: Minimum 12 substantive `it()` blocks.

**Estimated iterations:** 2

**Primary agent:** `analytics` (confidence calibration), `backend-engineer` (pattern aggregation API)

**D-4 gate forecast:** Clause 1 likely fires (insight chip copy). `growth-strategist` adjacency if ≥3 new strings.

**Dependencies:** Phases 1-7. Requires sufficient user corpus (at least 3 users with ≥2 workflows each with ≥2 runs). If corpus is insufficient at ship time, AC-8.2 should be gated behind a feature flag defaulting to OFF.

**Risk:** MEDIUM. Cross-workflow pattern matching is computationally heavier than single-workflow merge. Recommend query-time computation with a Redis TTL cache rather than pre-materialization at MVP.

**Inputs required:** All prior phase outputs. `apps/web-app/prisma/schema.prisma` — `Portfolio`, `ProcessFamily`, `WorkflowPortfolio` models (already exist; can group by portfolio for pattern search scope).

**Outputs to downstream:** `CrossWorkflowPattern[]` consumed by Phase 9 (executive view).

---

### Phase 9: Executive Process Map + Premium UI Polish

**Mission:** Ship the executive-ready UI tier. Elevated visual polish, print/share-ready layout, executive dashboard tab at `/dashboard/portfolio?view=process-map`. This is the phase that justifies "premium executive-ready UI" per AC-15.

**Acceptance criteria:**
1. AC-9.1: New portfolio-level Process Map view at `/dashboard/portfolio?view=process-map` shows a tiled grid of top-N workflow process maps (thumbnail cards), filterable by portfolio.
2. AC-9.2: Each workflow card shows: process map thumbnail (SVG export of the merged graph), variant count, run count, top AI opportunity count, and health score.
3. AC-9.3: "Share" button generates a read-only share link (reuses existing `Workflow.shareToken` pattern from `apps/web-app/prisma/schema.prisma`) rendering the process map in view-only mode with no authentication required.
4. AC-9.4: Print CSS: the process map renders cleanly on an A4/Letter page with decision branches visible; tested via Playwright `page.pdf()` in E2E.
5. AC-9.5: All UI surfaces pass axe compliance scan (zero critical/serious violations).
6. AC-9.6: `growth-strategist` review MANDATORY for all copy introduced in this phase before ship.
7. AC-9.7: This phase is restricted to Growth + Enterprise tiers for the portfolio process map view; Starter users see a locked state "Portfolio process map available on Growth+".

**Estimated iterations:** 2

**Primary agent:** `frontend-engineer` + `ux-designer` adjacent (mandatory — executive-facing UI requires UX review)

**D-4 gate forecast:** Clause 1 FIRES (≥3 new strings). `growth-strategist` MANDATORY. `ux-designer` adjacent recommended but not clause-mandated.

**Dependencies:** Phases 1-8.

**Risk:** MEDIUM. Print CSS + share link + thumbnail SVG rendering are three distinct technical surfaces. Risk is scope expansion. Recommend splitting into two iterations: (a) share link + portfolio view, (b) print CSS + thumbnail SVG.

**Inputs required:** Phase 4 `ProcessMapRenderer` interface (thumbnail SVG is a rendering mode of the same component). Phase 8 `CrossWorkflowPattern[]` (for portfolio insight chips).

**Outputs to downstream:** Phase 10 import/export extensions.

---

### Phase 10: Import/Export Extensions + BPMN Bridge (Phase 2 Entry Point)

**Mission:** Complete the export surface with BPMN import/export and round-trip fidelity. This is explicitly a Phase 2 capability — it is listed here to define the boundary cleanly, not to ship at MVP.

**Acceptance criteria:** Deferred. CEO approval required before Phase 10 opens.

**Estimated iterations:** 2-3

**Primary agent:** `system-architect`

**Risk:** MEDIUM. BPMN tooling interoperability requires external library dependency evaluation.

**Dependencies:** Phases 1-9 complete.

**Note:** Phase 10 is the explicit boundary between Path E MVP and Path E Phase 2. No Phase 10 work enters the live backlog until a separate CEO-directed PRD is approved.

---

## C. P0 Audit-Intake Row Proposals

All rows carry `Birth iter: audit-intake-PATHE-001`. Ordered by recommended sequencing.

---

**PATHE-P01 — ProcessGraph type contract (packages/process-graph/)**

- **Description:** Create `packages/process-graph/` as a new monorepo package. Deliver `src/types.ts` (ProcessGraph, GraphNode union, GraphEdge, DecisionPoint, BranchCondition, VariantPath, GraphConfidenceScore), `src/index.ts` barrel re-export, `package.json`, and `tsconfig.json`. All types are Readonly. Modify `pnpm-workspace.yaml` to include the new package. Zero runtime code. Minimum 10 substantive test assertions via `satisfies` type-level coverage.
- **Score:** I=5 A=5 L=4 C=4 E=2 R=1 = **15**
- **Primary agent:** `system-architect`
- **Estimated LOC:** ~180 production + ~120 test
- **Dependencies:** None
- **Phase:** 1

---

**PATHE-P02 — Observed-path extractor (packages/process-graph/src/pathExtractor.ts)**

- **Description:** Deliver `pathExtractor.ts` pure module: `extractObservedPath(bundle: ProcessRunBundle, nowIso: string): ProcessGraph`. Linear graph output for a single run. Zero `Date.now()` inside module. 12+ substantive `it()` blocks in `pathExtractor.test.ts`. Modify `packages/process-graph/src/index.ts` to re-export. Coordinate with Phase 1 `ProcessGraph` type — `system-architect` adjacency for contract review if module exceeds 200 LOC exported surface.
- **Score:** I=4 A=5 L=4 C=4 E=2 R=1 = **14**
- **Primary agent:** `backend-engineer`
- **Estimated LOC:** ~160 production + ~140 test
- **Dependencies:** PATHE-P01
- **Phase:** 2

---

**PATHE-P03 — Graph merge algorithm v1 (packages/process-graph/src/graphMerger.ts)**

- **Description:** Deliver `graphMerger.ts`: `mergeGraphs(graphs: readonly ProcessGraph[], options: GraphMergeOptions): ProcessGraph`. Algorithm: position-aligned merge using `computeSignatureSimilarity()` from `packages/intelligence-engine/src/pathSignature.ts` for position matching. Branch detection when ≥2 runs diverge at a position. `DecisionNode` insertion at divergence points. Edge frequency computation. `ExceptionNode` and `RetryLoopAnchorNode` detection. `GRAPH_MERGE_RULE_VERSION` constant. Minimum 20 substantive `it()` blocks. Circular-dependency test: zero imports from web-app.
- **Score:** I=5 A=5 L=5 C=3 E=4 R=3 = **11**
- **Primary agent:** `system-architect`
- **Estimated LOC:** ~350 production + ~300 test
- **Dependencies:** PATHE-P01, PATHE-P02
- **Phase:** 3

---

**PATHE-P04 — Graph merge correctness + stress tests (packages/process-graph/src/graphMerger.test.ts extension)**

- **Description:** Dedicated test iteration for PATHE-P03. Deliver a comprehensive golden-fixture test suite for `graphMerger.ts`: 6 golden fixture scenarios stored in `packages/process-graph/fixtures/` (identical runs, single branch, multi-branch, exception path, retry loop, N=50 stress). Each fixture has `raw/` input (array of ProcessGraph JSON files) and `expected/` output. Tests assert byte-identical output for all fixtures. `qa-engineer` PRIMARY. No production code changes permitted unless a correctness defect is discovered.
- **Score:** I=4 A=5 L=4 C=4 E=2 R=2 = **13**
- **Primary agent:** `qa-engineer`
- **Estimated LOC:** ~0 production + ~400 test + ~600 fixture JSON
- **Dependencies:** PATHE-P01, PATHE-P02, PATHE-P03
- **Phase:** 3

---

**PATHE-P05 — Process Map API route (apps/web-app/src/app/api/workflows/[id]/graph/route.ts)**

- **Description:** New API route: `GET /api/workflows/[id]/graph`. Fetches all `ProcessRun` + `ProcessDefinition` pairs for the workflow via Prisma (reusing existing `processDefinitionId` FK on `Workflow` model). Calls `mergeGraphs()` from PATHE-P03. Returns `{ data: ProcessGraph | null, error: string | null, meta: { runCount, computedAt } }`. Auth gate via existing middleware. Free-tier users receive full `ProcessGraph` but the response includes `tierGate: { decision_branches: 'starter+' }` metadata. 10+ substantive `it()` blocks in `apps/web-app/src/app/api/workflows/[id]/graph/route.test.ts`.
- **Score:** I=4 A=5 L=3 C=4 E=2 R=2 = **12**
- **Primary agent:** `backend-engineer`
- **Estimated LOC:** ~120 production + ~180 test
- **Dependencies:** PATHE-P01, PATHE-P02, PATHE-P03, PATHE-P04
- **Phase:** 4

---

**PATHE-P06 — Process Map UI v1 + Side Panel (apps/web-app/src/app/(app)/workflows/[id]/map/)**

- **Description:** New Next.js App Router route at `apps/web-app/src/app/(app)/workflows/[id]/map/page.tsx`. Client component `ProcessMapView.tsx` consuming `GET /api/workflows/[id]/graph`. `ProcessMapRenderer` interface abstraction in `apps/web-app/src/lib/process-map/renderer.ts`. Default implementation using the CEO-selected library (xyflow recommended; see D-03). Side panel component `GraphNodeSidePanel.tsx` with keyboard management via `useEscapeDispatch` (import from existing `WorkflowRow.tsx` pattern). Empty state and sparse state per Phase 4 ACs. Free-tier gating chip. `growth-strategist` D-4 clause 1 adjacency MANDATORY (≥10 new user-visible strings forecast). 12+ E2E tests in `apps/web-app/e2e/app/workflows/map.spec.ts`. Axe scan required.
- **Score:** I=5 A=5 L=4 C=3 E=4 R=3 = **10**
- **Primary agent:** `frontend-engineer`
- **Estimated LOC:** ~500 production + ~300 test + ~120 E2E
- **Dependencies:** PATHE-P01 through PATHE-P05. CEO decision D-03 (rendering library) must be resolved before this row executes.
- **Phase:** 4

---

**PATHE-P07 — Variant Explorer tab + per-variant metrics API (apps/web-app/src/app/(app)/workflows/[id]/variants/)**

- **Description:** New route at `apps/web-app/src/app/(app)/workflows/[id]/variants/page.tsx`. API endpoint `GET /api/workflows/[id]/variants` returning `VariantSet` (from existing `detectVariants()`) plus per-variant `TimestudyResult` (from existing `analyzeTimestudy()`). Variant Explorer table component. "View on map" link with `?highlight=variantId`. Process Map view updated to accept and render `?highlight=variantId` query param. 15+ substantive `it()` blocks.
- **Score:** I=4 A=4 L=3 C=4 E=3 R=2 = **10**
- **Primary agent:** `frontend-engineer`
- **Estimated LOC:** ~300 production + ~200 test
- **Dependencies:** PATHE-P01 through PATHE-P06
- **Phase:** 5

---

**PATHE-P08 — Decision-aware SOP generation with conditional logic (apps/web-app/src/lib/sop-generator/)**

- **Description:** New module `apps/web-app/src/lib/sop-generator/graphSopGenerator.ts`: `generateSop(graph: ProcessGraph, options: SopGeneratorOptions): StructuredSop`. `StructuredSop` type: sections with `title`, `body` (Markdown string), and `type: 'standard' | 'conditional' | 'exception'`. Decision nodes produce conditional blocks (`IF [condition] THEN...`). Exception nodes produce exception sections. Low-confidence annotations (`confidence < 0.6`) produce "Inferred condition — verify manually" callouts. Markdown export endpoint `GET /api/workflows/[id]/export?format=markdown`. 15+ substantive `it()` blocks in `graphSopGenerator.test.ts`. `growth-strategist` adjacency MANDATORY for SOP template copy review.
- **Score:** I=4 A=4 L=4 C=4 E=3 R=2 = **11**
- **Primary agent:** `backend-engineer`
- **Estimated LOC:** ~280 production + ~220 test
- **Dependencies:** PATHE-P01 through PATHE-P05
- **Phase:** 5

---

**PATHE-P09 — Export suite v1 (graph JSON + Mermaid + agent-spec)**

- **Description:** Export API endpoint `GET /api/workflows/[id]/export?format=graph-json|mermaid|agent-spec`. New module `apps/web-app/src/lib/export/graphExporter.ts`. Mermaid serializer: `flowchart TD` format with shape mapping per Phase 6 ACs. Agent-spec serializer: produces `AgentSpec` JSON per `docs/runbooks/AI_AGENT_SPEC_FORMAT.md` (new runbook created in this iteration). Free-tier gate returns 402. Variant-scoped export via `?variantId=`. 10+ substantive `it()` blocks. Runbook at `docs/runbooks/AI_AGENT_SPEC_FORMAT.md`.
- **Score:** I=3 A=4 L=3 C=4 E=2 R=1 = **11**
- **Primary agent:** `backend-engineer`
- **Estimated LOC:** ~220 production + ~160 test + ~80 runbook
- **Dependencies:** PATHE-P01 through PATHE-P08
- **Phase:** 6

---

**PATHE-P10 — AI automation opportunity overlay on Process Map**

- **Description:** Extend Process Map UI to show per-node `aiOpportunityScore` badges (0-100) sourced from existing `scoreAutomationOpportunity()` in `packages/intelligence-engine/src/automationScorer.ts`. Side panel extended with automation opportunity detail for flagged nodes. Free-tier lock: "N AI automation opportunities — unlock on Growth+". `graphRecommender.ts` module enforces zero imports from AI provider adapter. `growth-strategist` adjacency MANDATORY (new locked chip copy). 10+ substantive `it()` blocks.
- **Score:** I=4 A=5 L=3 C=4 E=3 R=2 = **11**
- **Primary agent:** `frontend-engineer`
- **Estimated LOC:** ~180 production + ~160 test
- **Dependencies:** PATHE-P01 through PATHE-P06. Does NOT require AI Vision Build to ship.
- **Phase:** 7

---

**PATHE-P11 — Prisma schema + ProcessGraph persistence (apps/web-app/prisma/)**

- **Description:** Add `ProcessGraphSnapshot` model to `apps/web-app/prisma/schema.prisma`: `id` UUID PK, `workflowId` FK ON DELETE CASCADE (unique constraint: one snapshot per workflow), `graphVersion` String, `mergeRuleVersion` String, `runCount` Int, `payload` JSONB (serialized ProcessGraph), `computedAt` DateTime, standard timestamps. Migration at `apps/web-app/prisma/migrations/`. `GET /api/workflows/[id]/graph` updated to serve from cache if `runCount` matches live count and `mergeRuleVersion` matches current constant; recomputes otherwise. 10+ substantive `it()` blocks for persistence adapter. Note: this row may ship before PATHE-P05 if the architect determines cache-first is required for performance; ordering is advisory.
- **Score:** I=3 A=4 L=3 C=4 E=2 R=2 = **10**
- **Primary agent:** `backend-engineer`
- **Estimated LOC:** ~80 production + ~120 test + ~40 migration SQL
- **Dependencies:** PATHE-P01, PATHE-P03, PATHE-P05
- **Phase:** 4 (recommended to ship alongside PATHE-P05 or immediately after)

---

### P0 Ordering Summary

| Order | Row ID | Phase | Score | Primary Agent |
|---|---|---|---|---|
| 1 | PATHE-P01 | 1 | 15 | system-architect |
| 2 | PATHE-P02 | 2 | 14 | backend-engineer |
| 3 | PATHE-P03 | 3 | 11 | system-architect |
| 4 | PATHE-P04 | 3 | 13 | qa-engineer |
| 5 | PATHE-P05 | 4 | 12 | backend-engineer |
| 6 | PATHE-P11 | 4 | 10 | backend-engineer |
| 7 | PATHE-P06 | 4 | 10 | frontend-engineer |
| 8 | PATHE-P08 | 5 | 11 | backend-engineer |
| 9 | PATHE-P07 | 5 | 10 | frontend-engineer |
| 10 | PATHE-P09 | 6 | 11 | backend-engineer |
| 11 | PATHE-P10 | 7 | 11 | frontend-engineer |

---

## D. Hard Dependencies on Other Vision Tracks

### AI Vision Build (AI_INTEGRATION_PLATFORM_VISION_REVIEW_001)

Path E is a prerequisite for AI Vision Build, not a dependent. AI Vision Build §2 explicitly identifies C1 "Process intelligence platform (measure + baseline)" as "MOSTLY SHIPPED — Path C R+1–R+7 persistence." Path E strengthens C1 by making the process model graph-native — AI recommendations can then be targeted to specific branches and decision points rather than the whole workflow.

**Coordination rule:** AI Vision Build AI+4 (recommendation engine) should consume `agent-spec` export from PATHE-P09 as its input contract rather than the current flat `WorkflowMetricsOutput`. This requires a joint `system-architect` session before AI+4 ships. Do not allow AI+4 to define its own input contract without Path E graph structure.

**Serialization recommendation:** Path E phases 1-3 (graph schema + merge algorithm) can proceed IN PARALLEL with AI Vision Build AI+1 through AI+3 (provider adapters + credential vault). There is no schema dependency until AI+4. Begin both tracks simultaneously if iteration budget allows.

### Path C (v3 metrics engine, PRD_METRICS_ENGINE_REVISED.md)

Path C R+1 adds `metric_fact` persistence for Tier B metrics including `variantCount` and `variant_hash`. Path E's `GraphNode` types use `evidenceRunIds` for traceability; the `variant_hash` from Path C R+1 is a useful cross-reference for graph cache invalidation. **Do not duplicate:** Path E's `ProcessGraphSnapshot` cache row (PATHE-P11) should store `variantHash` from the Path C `process_run_snapshot` model to detect when the graph needs recomputation.

**Non-duplication rule:** `cycle_time_mean_ms`, `cycle_time_median_ms`, `cycle_time_stddev_ms` are Path C metrics, not Path E metrics. Path E's per-branch duration display (Phase 5 AC-5.4) reads from Path C `TimestudyResult`, it does not recompute them.

### Path D (workflow dashboard customization, COMPLETE at iter 063)

Path D shipped:
- `apps/web-app/src/lib/dashboard-columns/registry.ts` — 38 `ColumnKey` entries, 10 currently `available`
- `apps/web-app/src/lib/dashboard-columns/presets.ts` — 10 preset chips
- `apps/web-app/src/lib/dashboard-columns/persistence.ts` — `UserDashboardPreference` versioned schema

**Non-interference rule:** Path E adds a NEW route (`/workflows/[id]/map`) and NEW route (`/workflows/[id]/variants`). It does NOT replace the existing `/workflows` tabular dashboard. The `ColumnKey` registry is NOT modified by Path E at MVP. Future Path E columns (e.g., `variant_count`, `decision_point_count`, `process_map_available`) may be added as new `ColumnKey` entries in the registry following the D+1 pattern — but this is Phase 2+.

**Positive reuse:** `ProcessMapRenderer` component and `GraphNodeSidePanel` should use `useEscapeDispatch` from `WorkflowRow.tsx`, `InlineArchiveConfirm` / `InlineEdit` keyboard patterns, and the `role="dialog" aria-modal="true"` drawer pattern from the existing ColumnPicker component.

### Stripe billing stack (CODE-COMPLETE post iter 068)

Path E features shift tier gates. Current gates at `apps/web-app/src/lib/plans.ts`:
- `free`: maxRecordingsPerMonth = 5
- `starter`: maxRecordingsPerMonth = 15
- `team`: maxRecordingsPerMonth = unlimited

Path E introduces graph-intelligence features that require explicit plan gating. Recommended tier additions to `plans.ts` (per Section E below):
- Add `processMapAccess: boolean` flag (false for free, true for starter+)
- Add `decisionBranchAccess: boolean` flag (false for free, true for starter+)
- Add `exportAccess: boolean` flag (false for free, true for starter+)
- Add `portfolioProcessMapAccess: boolean` flag (false for free/starter/team, true for growth+)
- Add `aiOpportunityAccess: boolean` flag (false for free/starter/team, true for growth+)

These flags integrate with the existing Stripe billing stack without requiring new Stripe products — they are plan-level feature flags resolved server-side from `toPlanType(user.plan)`.

---

## E. Tier / Pricing Impact

CEO directive: "keep current pricing models." Path E features layer onto existing tiers without restructuring prices.

### Free tier

- **See:** Observed linear path only — a single-run linear graph at `/workflows/[id]/map` showing the most recent recording as a flat sequence. No decision branches rendered; branches are blurred/replaced with a gate chip.
- **Gate chip text:** "Decision branches available on Starter+ — see plans →" (reuses "Compare plans →" CTA pattern from WDC-002 #104)
- **Cannot use:** Multi-run graph merge (no visual), export suite, variant explorer, AI opportunity overlay
- **Can use:** Single-run linear map view (demonstrates the product concept), side panel for step details (no confidence scores shown)
- **Rationale:** Free users see enough to understand what the product does without getting the full intelligence value. The gate is the branch visualization, not the map itself.

### Starter tier ($49/month)

- **Unlocks:** Full merged Process Map (decision branches, edge frequencies, confidence scores), Side panel with all fields, Variant Explorer tab, Markdown SOP export with conditional logic, Graph JSON export, Mermaid export
- **Cannot use:** AI opportunity overlay, Portfolio Process Map, Agent-spec export, Best-practice cross-workflow recommendations
- **Rationale:** Starter unlocks the core intelligence value prop. This is the primary free-to-paid conversion point for Path E — "Record twice, see how paths differ."

### Team tier ($249/month)

- **Unlocks:** Everything in Starter plus: Shared process map links (read-only share tokens), team-level process map comparison (side-by-side map views for multiple team members' recordings of the same workflow), variant attribution (which team member recorded which variant)
- **Cannot use:** AI opportunity overlay, Portfolio Process Map, Best-practice recommender
- **Rationale:** Team tier unlocks collaboration value on top of individual intelligence.

### Growth tier ($799/month)

- **Unlocks:** Everything in Team plus: AI automation opportunity overlay on Process Map, Portfolio Process Map view (`/dashboard/portfolio?view=process-map`), Best-practice cross-workflow recommender, Agent-spec export (for AI Vision Build integration), Confidence calibration dashboard
- **Rationale:** Growth tier is the "AI-ready" tier. The AI opportunity overlay is the highest-value Path E feature and appropriately gates at the highest self-serve tier.

### Enterprise tier

- **Unlocks:** Everything in Growth plus: Custom retention policies for ProcessGraph snapshots, on-premise graph merge computation (air-gap compatible), SSO + audit trail for process map access, custom `BranchCondition` taxonomy, BPMN export (Phase 2)
- **Rationale:** Enterprise unlocks compliance and customization requirements for large operations teams.

---

## F. Open CEO Decisions Required at MVP Entry

**D-01: Storage architecture for ProcessGraph**

- **Option A (recommended):** Postgres + JSONB `payload` column in new `ProcessGraphSnapshot` table (PATHE-P11). Consistent with existing Prisma + SQLite/Postgres dual-target schema. No new infrastructure. Performance degrades at >1,000 nodes per graph.
- **Option B:** Graph database (Neo4j, DGraph, Amazon Neptune). Superior query capability for cross-workflow pattern search (Phase 8). Adds a new infrastructure dependency and operational burden. NOT recommended at MVP.
- **Coordinator default if no CEO decision by Phase 3 start:** Option A.

**D-02: MVP scope boundary**

- **Option A (recommended):** Phases 1-4 = MVP. Ship Process Map v1 + side panel before any SOP/export/AI features.
- **Option B:** Phases 1-5 = MVP. Include Variant Explorer and SOP export at MVP.
- **Option C:** Phases 1-7 = MVP. Include AI opportunity overlay.
- **Coordinator recommendation:** Option A. Phases 1-4 are sufficient for the core claim ("multi-recording → canonical graph with branches"). Extending MVP scope increases timeline risk without improving the core claim.

**D-03: Process map rendering library**

- **Option A (recommended):** React Flow / xyflow (MIT, 46k stars, active maintenance, TanStack ecosystem aligned, supports custom node types and edge rendering, SSR-compatible). Install cost: 1 new dependency (~280kb gzip).
- **Option B:** Cytoscape.js (BSD-3, 10k stars, more graph-algorithm-oriented, less React-native). Higher integration cost for React component model.
- **Option C:** Custom SVG (zero new dependency, maximum control, 3-4x development cost for equivalent features). Not recommended.
- **Coordinator recommendation:** Option A (xyflow). The `ProcessMapRenderer` interface abstraction in PATHE-P06 allows a future library swap without breaking the data layer.

**D-04: Coordination with AI Vision Build**

- **Option A (recommended):** Parallel tracks. Path E phases 1-3 and AI Vision Build AI+1 through AI+3 proceed simultaneously. Joint `system-architect` session at Path E Phase 6 entry to align `agent-spec` export format with AI+4 recommendation engine input.
- **Option B:** Serial. Complete Path E phases 1-6 before AI Vision Build begins.
- **Option C:** Serial. Complete AI Vision Build AI+1 through AI+3 before Path E begins.
- **Coordinator recommendation:** Option A. The tracks are independent until Phase 6/AI+4.

**D-05: Tier gating strategy for decision branches**

- **Option A (recommended):** Gate decision branch visualization at Starter+; show linear path to Free. Matches current pattern of gating intelligence features at paid tiers.
- **Option B:** Gate full Process Map (including linear path) at Starter+. More aggressive monetization but reduces free-tier value demonstration.
- **Coordinator recommendation:** Option A. The linear path view for Free users is sufficient to demonstrate the product concept and motivate upgrade.

**D-06: Mode 5 sequence batching for Path E**

- Path E phases 1-10 = 18-22 iterations. Attempting to batch as a single Mode 5 sequence would violate MR-005 D-7 (N≥6 requires meta-coordinator pre-check) and the Mode 5 hard-stop ceiling (pool > 15).
- **Recommended:** Run phases as Mode 1 series (parallel to how Path D was executed as D+1 through D+6 Mode 1 series). Each P0 row executes as its own Mode 1 or Mode 2 bounded loop. No Mode 5 batching.
- **CEO acknowledgement required:** Confirm Mode 1 series as the execution model for Path E.

**D-07: Variant Explorer URL pattern**

- **Option A (recommended):** `/workflows/[id]/variants` as a new tab alongside the existing workflow detail view. Preserves existing navigation.
- **Option B:** Replace the existing workflow detail view entirely with a tabbed view (Overview | Map | Variants). Cleaner UX long-term but higher migration risk.
- **Coordinator recommendation:** Option A at MVP; evaluate Option B at Phase 9 executive polish.

---

## G. What NOT to Do at Path E MVP

1. **Do not replace the existing `/workflows` dashboard.** It must remain byte-identical throughout phases 1-7. Path E adds `/map` and `/variants` routes; it does not redirect existing routes.

2. **Do not modify `apps/extension-app/`.** The extension capture pipeline (`DerivedStep` production) is frozen. Graph construction happens server-side or in the `process-graph` package, downstream of `DerivedStep` output.

3. **Do not deprecate `packages/intelligence-engine/src/variantDetector.ts`.** Path E's `graphMerger.ts` should consume or extend `computePathSignature()` and `computeSignatureSimilarity()` from the existing `pathSignature.ts` module. Do not rewrite variant detection — it is already deterministic and tested.

4. **Do not deprecate `apps/web-app/src/lib/dashboard-columns/registry.ts`.** The Path D column registry is the foundation for the tabular dashboard. Path E may add new `ColumnKey` entries in Phase 2+, but it never modifies or removes existing entries.

5. **Do not ship Process Map as the only entry point.** The tabular `/workflows` dashboard remains the primary entry point. Process Map is accessed from a "View process map" link within the workflow detail; it is not the default landing view.

6. **Do not claim AI-inferred decision certainty without explicit confidence labels.** Every `BranchCondition` with `inferenceMethod: 'inferred'` must display its `confidence` score in the UI. The copy "Inferred condition — verify manually" is mandatory for `confidence < 0.6`. This is non-negotiable.

7. **Do not add a graph database dependency at MVP.** Postgres + JSONB (D-01 Option A) is sufficient for MVP. A graph DB adds operational burden, infrastructure cost, and team skill requirements that are unjustified until cross-workflow pattern queries (Phase 8) become a performance bottleneck.

8. **Do not ship branch conditions as free-text LLM completions without a deterministic fallback.** `BranchCondition.description` at MVP must be computable from the `BoundaryReason` + `GroupingReason` taxonomy (a lookup table is sufficient) before LLM inference is layered on. This preserves the Ledgerium determinism invariant.

9. **Do not ship Phase 3 (graph merge) without the correctness test suite (PATHE-P04).** The merge algorithm is algorithmically complex. Shipping the algorithm without golden-fixture regression tests is a reliability risk that will create long-term correctness debt.

10. **Do not couple Path E Phase 7 (AI integration) to AI Vision Build's production timeline.** Phase 7 has a safe partial scope (PATHE-P10: automation score visualization from existing `scoreAutomationOpportunity()`) that ships independently. The full AI recommendation layer waits for AI Vision Build AI+4 without blocking the rest of Path E.

---

## H. Success Metrics for Path E Launch

### Quantitative

| Metric | Baseline | MVP Target | Measurement Method |
|---|---|---|---|
| Variant detection accuracy | No baseline (feature not shipped) | ≥80% of true branches detected (manual ground-truth annotation of 20 test workflows, each with ≥5 runs) | QA golden-fixture suite + manual review |
| Decision confidence calibration | No baseline | Brier score ≤0.15 on 10-bucket calibration curve | `GET /api/portfolio/confidence-calibration` |
| Process Map render time (10 runs, ≤50 nodes) | No baseline | p95 ≤ 1,500ms TTI | Playwright `performance.measure()` in E2E suite |
| Process Map render time (100 runs, ≤200 nodes) | No baseline | p95 ≤ 3,000ms TTI | Load test script |
| Export format compatibility | No baseline | Graph JSON: valid JSON (jq parse pass); Mermaid: zero `mermaid --validate` errors; SOP Markdown: renders in GitHub/Notion without escaping issues | CI export validation step |
| Merge algorithm determinism | No baseline | 100% byte-identical output across 10 runs of `mergeGraphs()` on identical inputs | Automated in `graphMerger.test.ts` golden fixtures |

### Qualitative

**User feedback survey (shipped at Phase 4 exit, presented after first Process Map view):**
- "Is this process map more useful than your current SOP tool?" (1-5 Likert)
- "Did you discover a step variant you weren't aware of?" (Yes / No)
- "Would you pay for this feature?" (Yes / No / Already paying)

Target: ≥60% of respondents score 4 or 5 on the first question at 30-day mark.

### Adoption

| Metric | 30-day target | 90-day target |
|---|---|---|
| % of paid users who view Process Map at least once | 25% | 40% |
| % of Process Map viewers who export at least one time | 15% | 30% |
| % of Starter+ users who view Variant Explorer | 20% | 35% |
| Process Map as first-session action for new Starter signups | 10% | 20% |

---

## I. Acceptance Criteria Verification (AC-1 through AC-15)

**AC-1: Single recording produces clean observed workflow map**

- Reader-testable: `extractObservedPath(singleRunBundle)` returns a `ProcessGraph` with `runCount: 1`, linear topology (no `DecisionNode` or branch edges), and all nodes carrying the source run ID in `evidenceRunIds`. Verified by PATHE-P02 test suite.
- Path E phase: 2.

**AC-2: Multiple recordings merge into canonical graph**

- Reader-testable: `mergeGraphs([graph1, graph2, ..., graphN])` returns a single `ProcessGraph` with `runCount: N`, all input run IDs represented in `evidenceRunIds` across nodes and edges. Verified by PATHE-P03 + PATHE-P04 golden-fixture suite.
- Path E phase: 3.

**AC-3: Different paths appear as branches**

- Reader-testable: Two runs where run B takes a different path at step 3 produce a `ProcessGraph` with a `DecisionNode` at position 3 and two outgoing edges with `frequencyPct` values summing to 1.0. Verified by PATHE-P03 AC-3.3 test case.
- Path E phase: 3.

**AC-4: Decision points are visible**

- Reader-testable: Process Map UI renders `DecisionNode` with distinct visual treatment (diamond shape or equivalent). Playwright screenshot assertion in `map.spec.ts` confirms `[data-node-type="decision"]` elements are present and visible for a workflow with ≥2 diverging runs.
- Path E phase: 4.

**AC-5: Branch conditions in plain English**

- Reader-testable: Each `DecisionNode` in the side panel displays `BranchCondition.description` as a non-empty plain-English string. The description is derivable from `BoundaryReason` + `GroupingReason` lookup table without LLM inference for MVP. Verified by PATHE-P06 side panel unit tests.
- Path E phase: 4 (deterministic lookup table); Phase 7 (LLM-enhanced optional).

**AC-6: Variant frequency from real runs**

- Reader-testable: Each `GraphEdge` carries `frequencyPct: number` derived from the count of `evidenceRunIds` divided by total `runCount`. Verified by PATHE-P03 test case AC-3.6. UI displays this as a percentage on edge labels per PATHE-P06 AC-4.4.
- Path E phase: 3 (data), 4 (UI).

**AC-7: Low-confidence decisions are marked**

- Reader-testable: Any `GraphNode` or `DecisionNode` with `confidence < 0.6` renders a warning indicator in the Process Map UI. Side panel for such nodes displays "Inferred condition — verify manually". Verified by PATHE-P06 unit tests and E2E assertion.
- Path E phase: 4.

**AC-8: SOPs include conditional logic**

- Reader-testable: `generateSop(graphWithDecisionNodes)` returns a `StructuredSop` where each `DecisionNode` produces a section with `type: 'conditional'` containing "IF [condition] THEN [...] ELSE [...]" text. Verified by PATHE-P08 test suite.
- Path E phase: 5.

**AC-9: Exception paths and retry loops are supported**

- Reader-testable: `graphMerger.ts` detects `ExceptionNode` (truncated run divergence) and `RetryLoopAnchorNode` (back-edge to previously-seen step). PATHE-P03 AC-3.4 and AC-3.5 verify both. Process Map UI renders them with distinct visual treatment per PATHE-P06 AC-4.5.
- Path E phase: 3 (algorithm), 4 (UI).

**AC-10: Click-to-explain any node/edge/decision/variant**

- Reader-testable: Clicking any element in the Process Map opens `GraphNodeSidePanel` with the element's `evidenceRunIds`, `confidence`, `type`, and `BranchCondition.description`. Playwright E2E test in `map.spec.ts` verifies panel opens on click and contains non-empty explanation text.
- Path E phase: 4.

**AC-11: AI/automation opportunities tied to workflow locations**

- Reader-testable: Each node with `aiOpportunityScore > 60` (from `scoreAutomationOpportunity()`) displays a badge in the Process Map UI. Clicking the badge opens the side panel with automation rationale text. Free-tier shows locked count chip. Verified by PATHE-P10 unit tests.
- Path E phase: 7.

**AC-12: Exports include graph JSON + Markdown + SOP + Mermaid + agent-spec**

- Reader-testable: `GET /api/workflows/[id]/export?format=graph-json` → valid `ProcessGraph` JSON; `?format=markdown` → valid Markdown SOP; `?format=mermaid` → zero `mermaid --validate` errors; `?format=agent-spec` → valid `AgentSpec` JSON matching schema in `docs/runbooks/AI_AGENT_SPEC_FORMAT.md`. All formats verified in PATHE-P08 (Markdown SOP) and PATHE-P09 (graph JSON, Mermaid, agent-spec). Note: "SOP" as a format is the Markdown SOP with conditional logic; it is not a separate format from Markdown.
- Path E phase: 5 (Markdown SOP), 6 (graph JSON, Mermaid, agent-spec).

**AC-13: Existing recordings still work**

- Reader-testable: `pnpm test` workspace count ≥ 2183 (current baseline from iter 074) at Path E MVP exit. Zero existing test assertions modified by any Path E iteration. The extension capture pipeline in `apps/extension-app/` is untouched. The `/workflows` tabular dashboard is byte-identical at Phase 4 exit. Verified by `git diff --stat` constraint on all Path E iterations.
- Applies to: All phases.

**AC-14: Tests cover major branching and variants**

- Reader-testable: PATHE-P03 + PATHE-P04 deliver ≥20 substantive `it()` blocks for the merge algorithm covering all 7 branch/variant scenarios. PATHE-P02 delivers ≥12 blocks for path extraction. PATHE-P06 delivers ≥12 E2E tests for the Process Map UI. Total new test count at Phase 4 MVP exit: workspace test count ≥ 2183 + 62 (minimum from PATHE-P01 through PATHE-P06 + PATHE-P11 combined).
- Applies to: Phases 1-4.

**AC-15: Premium executive-ready UI**

- Reader-testable: Phase 9 Portfolio Process Map passes axe compliance scan (zero critical/serious violations). Print CSS produces a clean A4/Letter render verified by Playwright `page.pdf()`. Share link generates a read-only URL accessible without authentication. `growth-strategist` review sign-off logged in iteration entry for all Phase 9 copy.
- Path E phase: 9.

---

## J. Distinctive Product Recommendation

**The single highest-leverage move: "Deviation Alert" — proactive notification when a new recording deviates from the canonical path.**

Every current process intelligence tool is passive: you go to the map, you see the variants. Ledgerium can be the first to be active: when a new recording is submitted and its path deviates from the canonical standard path by more than a configurable threshold (suggested default: Jaccard distance > 0.3), Ledgerium sends an in-app notification (and optionally email) to the workflow owner: "New recording of 'Invoice Approval' took an unusual path — 3 steps differed from your standard process. [View deviation]."

This is a single, implementable product capability (one BullMQ job + one API endpoint + one email template) that transforms Path E from a retrospective analytics tool into a real-time process governance tool. No competitor in the current landscape ships this from browser-observed behavior.

**Why this is highest-leverage:**

1. It creates a reason to keep Ledgerium open every day, not just when building SOPs.
2. It directly addresses the "process drift" concern that compliance teams have — the same concern that makes Celonis valuable in regulated industries.
3. It is a natural Growth+ tier feature (team-level deviation alerts with configurable thresholds and Slack/email routing).
4. It can be built in 1-2 iterations after Phase 3 (graph merge) ships, using the existing BullMQ + analytics infrastructure, without touching the UI.
5. It converts a passive intelligence product into an active governance product — a category repositioning that no additional UI work is required to achieve.

**Implementation anchor:** New BullMQ job `process-deviation-check` triggered on each new `ProcessGraphSnapshot` computation. If `computeSignatureSimilarity(newPath, standardPath) < (1 - threshold)`, insert a `ProcessInsight` record (model already exists in `apps/web-app/prisma/schema.prisma`) with `type: 'deviation_alert'` and dispatch an in-app notification. Email delivery reuses the Stripe notification infrastructure from iter 068.

---

## Artifact Dependencies Summary

| Artifact | Status | Path E dependency |
|---|---|---|
| `packages/segmentation-engine/src/types.ts` | Shipped | DerivedStep as input to Phase 2 pathExtractor |
| `packages/intelligence-engine/src/types.ts` | Shipped | ProcessRunBundle, VariantSet, PathSignature consumed |
| `packages/intelligence-engine/src/pathSignature.ts` | Shipped | computeSignatureSimilarity() reused in Phase 3 |
| `packages/intelligence-engine/src/variantDetector.ts` | Shipped | detectVariants() reused in Phase 5 |
| `packages/intelligence-engine/src/automationScorer.ts` | Shipped | scoreAutomationOpportunity() reused in Phase 7 |
| `apps/web-app/prisma/schema.prisma` | Shipped | ProcessGraphSnapshot additive migration in Phase 4 |
| `apps/web-app/src/lib/dashboard-columns/registry.ts` | Shipped | NOT modified by Path E MVP |
| `apps/web-app/src/lib/plans.ts` | Shipped | New feature flags added in Phase 4 |
| `docs/features/dashboard-v3-metrics-engine/PRD_METRICS_ENGINE_REVISED.md` | Draft (awaiting CEO approval) | Path C metrics shared by Phase 5; coordinate not duplicate |
| AI Vision Build `AIProviderAdapter` | Not built | Required only for Phase 7 full scope; Phase 7 has safe partial scope |
