# Time-Study Intelligence Review 001 — Smart Cross-Workflow Analysis & Comparison

**Type:** Mode 3-adjacent multi-agent design review (NON-counting; ZERO product code changed)
**Date:** 2026-07-12
**Directive (CEO):** "Dramatically improved time-study view. The system should be smart enough to analyze workflow recordings and cluster, compare, contrast, or any other analysis across all workflows. See relationships and visually compare any workflows."
**Panel (5):** system-architect · analytics · ux-designer · competitive-researcher · product-manager
**Per-agent artifacts:** `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001/{architect,analytics,ux,competitive,pm}_analysis.md`

---

## 1. Executive verdict

**This is a wiring + visualization gap, not an algorithm gap.** `packages/intelligence-engine/` already contains a deterministic, tested, privacy-safe "Process Grouping Hierarchy": exact-group scoring, **family scoring**, canonical-component detection, **variant-distance (LCS edit-alignment)**, **N-way divergence** (`analyzeDivergence`), path-signatures, step-fingerprints, bottleneck + variance analysis, standardization/automation scoring, and a `clustering/` module (union-find). The Prisma tables already exist and are migrated (`ProcessFamily`, `GroupRelationship`, `CanonicalComponentRecord`) — but **confirmed via grep, zero application code reads or writes them**, the `clustering/` module is documented "pure and UNWIRED," and all analysis is currently framed **per-process**, not across the whole library.

**Unifying architecture (architect): "the graph is the spine."** Edges = relationships, clusters = connected components, families = labeled clusters, compare = zoom into a subgraph, time-study = a metric rollup over any node-set. Every piece reuses an existing engine primitive.

**The "dramatically better" core (analytics):** per-variant time-study splitting — today bottleneck/timing are computed group-wide; splitting them per-variant is what enables "variant B is 40% slower at step 5."

**One hard risk (PM):** the cluster threshold is uncalibrated against real data — silently merging two genuinely different processes is worse than not merging. Family-grouping needs a calibration gate before it's trusted.

---

## 2. What already exists vs. what's missing

| Capability | Status |
|---|---|
| Per-workflow time-study, bottlenecks, variance | ✅ built + shipped |
| Variant detection + variant-distance (LCS) | ✅ pure, tested |
| N-way divergence (LCS backbone, matched/added/removed/reordered) | ✅ `analyzeDivergence` |
| Family scoring, component-reuse, exact-group clustering (union-find) | ✅ pure, tested |
| Relationship types (`same_family`, `shares_component`, `template_like`) + Prisma tables | ✅ migrated, **0 UI/app consumers** |
| Deterministic full-portfolio clustering wired end-to-end | ❌ `clustering/` unwired; threshold uncalibrated |
| Per-**variant** time-study splitting | ❌ only group-wide today |
| Cross-workflow similarity edges persisted + served | ❌ (needs 1 new table + API) |
| `subset_of` / `superset_of` containment relationships | ❌ derivable from existing `lcsAlignment()` |
| Any cross-workflow compare/relationship UI | ❌ |
| Reconciled AI-opportunity score (`computeAiOpportunityScore` vs `scoreAutomationOpportunity` diverge) | ⚠️ must reconcile before automation clustering |

---

## 3. The elegant solution set (consolidated + ranked)

Merges architect (backend), analytics (model), ux (visuals), pm (scope). Effort/risk 1–5.

| # | Solution | User value | Reuses | Net-new | Effort/Risk |
|---|----------|-----------|--------|---------|-------------|
| **T1** | **Portfolio Time-Sink Ranking** — aggregate already-trusted per-process bottleneck/timing across the whole library; ranked "where your org's time goes" bars + step duration ranges | "What should I fix first?" | bottleneck/timestudy analyzers | pure aggregation over node-set | 1 / 1 |
| **T2** | **N-Way Visual Compare / Process Diff** — aligned swimlanes (code-diff style): matched / added / removed / reordered steps; block width ∝ mean duration; toggle structural-vs-temporal lens; per-step time deltas | "Compare these 3; why is one slower?" | `analyzeDivergence`, `computeVariantDistance`, LCS | one pure cross-definition alignment wrapper; repoint per-variant timestudy to per-subset | 2 / 2 |
| **T3** | **Relationship Graph Service + Family Browser** — new pure `crossWorkflowGraph.ts` composing existing scorers into weighted, **explained** edges; clusters = connected components; families = labeled clusters. One new `WorkflowSimilarityEdge` table; `GET /api/intelligence/graph`; incremental on-ingest scoring | "Which of my workflows are really the same process?" | familyScorer, componentDetector, union-find, `GroupRelationship` | 1 table + orchestration + **calibration gate** | 3 / 3 |
| **T4** | **Relationship / Similarity Map (UI)** — deterministic **scatter today** (cycle time × sequence stability, bubble = runs, color = opportunity) → **dendrogram with drag-cut threshold** next; browse families. Force-directed graphs rejected (non-deterministic) | "Show me everything like this" | metrics present today (1A needs zero new math) | 1B needs T3 | 2 / 3 |
| **T5** | **Variant Divergence Overlay ("metro map")** — one process's variants branching off a standard-path spine; line thickness = frequency, glow = bottleneck/variance heat | "Where do runs diverge, and which path is costly?" | `VariantSet`, `BottleneckReport` | mostly rendering | 2 / 2 |
| **T6** | **Smart Insights narrative layer** — deterministic/templated sentences over T1–T5 ("these 4 are one process with 3 variants; variant B is 40% slower at step 5") | lowers the analysis skill floor | all above | templating only (LLM-narrative deferred to AI-Vision track) | 2 / 1 |

**Cross-cutting model (analytics):** deterministic **3-layer clustering** — Layer 1 exact-group (built) → Layer 2 family (wrap `scoreFamilyMembership` in union-find) → Layer 3 full-portfolio threshold-ladder over one new pure composite distance (`durationBandSimilarity` is the only net-new function). Deterministic cluster naming via `titleNormalizer` + `componentDetector`.

---

## 4. Match the category — and leapfrog it

**Match (competitive):** dual frequency+time variant ranking · an explicit **baseline/reference path** · **separate structural-vs-temporal diff lenses** · cross-dimension benchmarking · heat/animation for bottlenecks · **interactive** (not black-box) clustering controls · progressive disclosure (happy-path default, not spaghetti).

**Leapfrog — only deterministic, evidence-linked capture can:**
1. **Exact step-fingerprint diffing** (code-diff, not fuzzy trace-alignment) — T2's foundation.
2. **Evidence-linked time deltas** — every "3.2× slower" links to immutable captured evidence; auditable proof, not inference.
3. **Reproducible deterministic clustering** — same inputs → same clusters every run (regulated-buyer differentiator).
4. **Evidence-grounded relationship graph** across *distinct* workflows by shared tools/fields observed — T3.
5. **Diff-and-replay** — step two runs side-by-side with automatic first-divergence flag.

---

## 5. Recommended phased build (leverage the engine first)

- **Phase 0 — Calibration (no product code):** calibrate the cluster/family threshold against real workflow data; adopt a **confirm-not-auto-merge** stance. Reconcile the two AI-opportunity-score implementations.
- **Phase 1 — T1 Portfolio Time-Sink Ranking:** pure aggregation, zero clustering risk — the fastest "dramatically better time-study" win.
- **Phase 2 — T2 N-Way Visual Compare:** upgrade `/compare` past its current 2-workflow/flat-metric cap using the built LCS-backbone diff, repointed cross-definition + per-variant timestudy.
- **Phase 3 — T3 Relationship Graph + Family Browser** (behind the calibration gate) → **T4** map UI → **T5** divergence overlay.
- **Phase 4 — T6 narrative layer** (deterministic templates; LLM narrative deferred to the AI Integration Platform Vision track).

All APIs return `{data,error,meta}`; determinism/evidence preserved via versioned pure scorers, explanation codes, `evidenceRunIds`, and config-version hashes.

---

## 6. Measurable outcomes
Extend the existing (Draft) `MEASUREMENT_PLAN_PROCESS_VARIATION.md` rather than duplicate: add **family-precision**, **subset/superset-precision**, **clustering reproducibility** (identical clusters across re-runs), **time-to-insight**, and a "correct-merge / no-false-merge" gate for T3. T1/T2 measured by adoption + time-to-first-comparison.

---

## 7. Open CEO decisions
1. **Auto-merge risk tolerance** for family grouping (recommend confirm-not-auto-merge + calibration gate).
2. **Deterministic vs LLM** narrative for T6 (recommend deterministic now; LLM belongs to the AI-Vision track).
3. **Calibration data source** — which real workflows calibrate the threshold.
4. **Graph-UI investment timing** (T4 1B/T3) vs shipping T1/T2 first.
5. **IA placement** — extend `/analytics` + `/compare`, or a new route family.
6. **Orchestration cadence / compute budget** for on-ingest cross-workflow scoring at Phase 3+.

---

## 8. Governance
NON-counting Mode 3-adjacent review; zero product code changed; zero cadence increment. No P0 promotions applied. If actioned, this is largely web-app + intelligence-engine work (not extension-pipeline), so it is **not** Extension-Reliability P0-gated — but T3 needs the calibration gate before family grouping is exposed. Entry via standard PRD/Define artifacts + the audit-intake pattern if promoted.
