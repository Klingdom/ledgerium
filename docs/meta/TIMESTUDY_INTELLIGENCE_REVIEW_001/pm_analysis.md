# Time-Study Intelligence Review 001 — Product Manager Analysis

**Mode:** 3-adjacent design review (NON-counting). Analysis artifact only — zero code changes.
**Author:** product-manager (parallel track: system-architect / analytics / ux-designer / competitive-researcher own mechanism + visual design; this document owns scope + prioritization).
**Date:** 2026-07-12.
**Inputs reviewed:** `apps/web-app/src/app/(app)/analytics/page.tsx`, `apps/web-app/src/app/(app)/analytics/process/[id]/page.tsx`, `apps/web-app/src/app/(app)/compare/page.tsx`, `apps/web-app/src/lib/workflowGrouping.ts`, `apps/web-app/src/lib/reportDivergence.ts`, `apps/web-app/prisma/schema.prisma`, and the full `packages/intelligence-engine/src/` inventory (24 modules + `clustering/` subpackage).

---

## 1. Problem Statement

Ledgerium already captures real behavior and computes rigorous **per-process** intelligence (timestudy, variance, variants, bottlenecks, SOP alignment, automation ROI). What it does **not** do today is answer questions that only make sense **across** a user's workflow library. As a portfolio grows past ~10-15 recorded workflows, the two views that exist (`/analytics` portfolio dashboard and `/compare` 2-way ROI tool) stop being sufficient, and the questions the CEO is naming become the actual jobs users are trying to do:

| # | User job | Currently answerable? |
|---|---|---|
| J1 | "Which of my workflows are really the same process, just recorded under different titles?" | **No.** Grouping is exact-path-signature only in production; near-duplicates sit as separate, siloed "Process Families" (which are really just exact groups — see §2). |
| J2 | "Why is this run/workflow slower than that one?" | **Partially**, but only *within* one process definition (bottleneck ranking, variance) — never across two different definitions or across the whole portfolio. |
| J3 | "Compare these 3 workflows." | **Only 2 at a time**, and only flat metric deltas (cycle time, steps, systems, health) — no step-level diff, no visual timeline, no path awareness. |
| J4 | "What should I standardize or automate, portfolio-wide?" | **Only per-definition** (standardization score, automation ROI list exist per process). No cross-definition ranking of "biggest time-sink across everything I do," no shared-component view. |
| J5 | "Show me how my workflows relate to each other." | **No surface exists.** No relationship/similarity graph, no family hierarchy browser, despite the backend types and schema already existing (§2). |

**Why now:** the CEO's framing ("cluster/compare/contrast and find relationships across ALL workflows") is exactly the gap between "process intelligence for one recording" (shipped, mature) and "process intelligence for a library" (unshipped, but — critically — **already half-built**, see §2). This is a leverage moment, not a from-scratch build.

---

## 2. Capability Map — What Exists vs. What's Missing

### 2a. Already built AND wired into production UI (proven, low-risk to extend)

| Capability | Engine function | Where it's consumed |
|---|---|---|
| Per-process timestudy (per-step-position mean/median/min/max/p90/stdDev) | `analyzeTimestudy` | `/analytics/process/[id]` "Time Study" section |
| Per-process variance / sequence stability | `analyzeVariance` | same page, "Variance Analysis" |
| Per-process variant detection + standard path | `detectVariants`, `computePathSignature` | same page, "Variant Breakdown" |
| Per-process bottleneck ranking | `detectBottlenecks` | same page, "Bottlenecks" |
| SOP alignment / documentation drift / outlier runs / recommended canonical path | `analyzeSopAlignment`, `computeDocumentationDriftScore`, `detectOutlierRuns`, `deriveRecommendedCanonicalPath` | same page, sections 7-9 |
| Per-process automation ROI + recommendations | `computeAutomationROI`, `generateRecommendations` | same page, sections 11-12; also drives `/analytics/product` and a What-If simulator |
| Diverge → reconverge (branch/rejoin) visualization data | `analyzeDivergence` (LCS-backbone + DFG cross-check) | `reportDivergence.ts` → workflow/variant report view — **scoped to variants within one process definition**, not cross-definition |
| 2-way baseline/after compare + ROI | `computeWorkflowComparison` (a separate, simpler lib — does **not** call the intelligence engine at all) | `/compare` |
| Exact-signature auto-grouping into `ProcessDefinition` | `computePathSignature` | `/analytics` "Process Families" list (these are exact groups, not fuzzy families) |
| **Fuzzy similarity auto-merge of near-duplicate recordings** | `traceSimilarity` + `clusterSignatures` (`clustering/`) | `workflowGrouping.ts` — wired, but gated by `LEDGERIUM_SIMILARITY_CLUSTERING` env flag, **defaults OFF in production**. The engine's own code comments flag `DEFAULT_CLUSTER_THRESHOLD = 0.6` as "CONSERVATIVE... calibrated via the labeled hold-out... before clustering is wired into live grouping" — **calibration has not happened.** |

### 2b. Fully designed, pure, deterministic, tested — but completely unwired (zero application usage)

This is the single biggest finding of this review. An entire **"Process Grouping Hierarchy"** (Phase 5) exists as production-quality pure functions with matching Prisma tables already migrated — and nothing calls it:

| Layer | Pure engine function(s) | Prisma table (exists, empty in practice) |
|---|---|---|
| Title normalization + family-signature parsing | `normalizeTitle`, `titleFamilySimilarity`, `isParameterizedVariant` (`titleNormalizer.ts`) | — |
| Step / event fingerprinting for cross-workflow semantic matching | `fingerprintStep`, `fingerprintWorkflowSteps`, `sequenceFingerSimilarity`, `hashStepSequence` (`stepFingerprinter.ts`) | (embedded in `StepFingerprint` type) |
| Canonical reusable-component detection | `detectComponents` (`componentDetector.ts`) | `CanonicalComponentRecord` |
| Exact-group scoring with explainability | `scoreExactGroup` (`exactGroupScorer.ts`) | (feeds `ProcessDefinition` extended fields — `explanationJson`, `confidenceBand`, `startAnchor`/`endAnchor`, already in schema, unpopulated) |
| **Family scoring, possible-match, and relationship generation** | `scoreFamilyMembership`, `evaluatePossibleMatch`, `generateRunRelationships`, `generateGroupRelationships` (`familyScorer.ts`) | `ProcessFamily`, `GroupRelationship` |
| Component-reuse scoring | `scoreComponentReuse` (`componentReuseScorer.ts`) | `CanonicalComponentRecord.familyCount`/`groupCount` |
| Automation-opportunity scoring (portfolio-aware factors) | `scoreAutomationOpportunity`, `deriveAutomationFactors` (`automationScorer.ts`) | — |
| Cross-run/cross-group similarity distance | `computeVariantDistance`, `buildVariantRecords` (`variantAnalyzer.ts`) | `ProcessVariantRecord` (extended fields already in schema: `deviationPoints`, `addedSteps`, `removedSteps`, `reorderedSteps`) |
| Structured explainability vocabulary (36 codes, human-readable labels, positive/weakness classification) | `groupingTypes.ts` (`ExplanationCode`, `EXPLANATION_CODE_LABELS`, `GroupingExplanation`) | embedded as JSON columns across the above tables |

**Confirmed via grep: zero occurrences of `prisma.processFamily`, `prisma.groupRelationship`, or `prisma.canonicalComponentRecord` anywhere in `apps/web-app/src`.** The schema migration shipped; the write path never did. There is no orchestration job that runs any of the family/component/relationship scorers over a real user's workflow set.

**Implication for scope:** Options (b) and (c) below are not "build a clustering engine" — they are "build the batch job + API + UI that finally uses an engine and schema that already exist." This changes the effort/risk profile substantially versus a naive read of the CEO's ask.

### 2c. Missing entirely (no engine, no schema, no UI)

- **N-way (3+) visual compare** — today capped at 2, flat-metric-only.
- **Cross-definition step-level diff / visual timeline** — `analyzeDivergence`'s LCS-backbone + `DeviationPoint`/`addedSteps`/`removedSteps`/`reorderedSteps` types are the right primitives but have never been pointed at *two different process definitions* instead of *variants of one definition*.
- **Portfolio-wide (cluster-level) time-sink ranking** — `detectBottlenecks` is per-`ProcessDefinition` scope only; there is no aggregation across all definitions weighted by run volume.
- **Relationship/similarity graph visualization** — `GroupRelationship` rows would exist once §2b is wired, but no graph-rendering surface exists anywhere in the codebase.
- **Portfolio-scope narrative synthesis** — today's `ProcessInsight` model is per-`ProcessDefinition`, generic-severity, dismissible. No comparative narrative ("3 of your 8 invoice workflows are really the same process, one variant runs 40% slower").
- **Orchestration/compute-budget model for Phase 5** — the existing `/analytics` "Run Analysis" button computes per-definition intelligence synchronously; family/relationship scoring is pairwise-ish and needs an explicit cadence decision (on-demand vs. background job) before it can run at scale (Phase 2 ceiling of ~10k runs / 100k steps is already noted in `ARCHITECTURE_METRICS_ENGINE.md`).

---

## 3. Solution Options

Each option is scoped as an independently shippable, reversible unit (Ledgerium's "small reversible changes" principle). None require a new module boundary decision beyond what `system-architect` will size.

### Option A — N-Way Visual Compare (upgrade `/compare`)

- **User job served:** J3 ("compare these 3"), partially J2.
- **User value:** select 2-5 workflows, see them side by side as a visual step timeline with LCS-aligned step diff (added/removed/reordered/substituted highlighted), not just a metrics table. Directly answers "why is this one slower" at the step level.
- **Reusable from engine:** `pathSignature`/`stepCategories`, `analyzeTimestudy`, `detectBottlenecks` (run per selected definition), and — most valuably — the `analyzeDivergence` LCS-backbone algorithm repointed from "variants of one definition" to "N selected definitions' canonical paths against each other," plus the already-typed `DeviationPoint`/`addedSteps`/`removedSteps`/`reorderedSteps` shapes from `groupingTypes.ts` (currently unused but exactly fit-for-purpose).
- **Net-new work:** N-way selector UI; step-timeline/diff visual component (ux-designer + frontend-engineer); an adapter analogous to `reportDivergence.ts`/`variantAdapter.ts` but for cross-definition alignment instead of cross-variant.
- **Effort / risk:** **Medium / Low.** No new Prisma migration, no new dormant-table risk, no fuzzy-matching accuracy risk (user explicitly picks what to compare — no auto-clustering judgment call is made).
- **Measurable outcome:** baseline = 0% of sessions compare 3+ workflows today (hard cap at 2). Target: ≥15% of `/compare` sessions select 3+ workflows within 60 days of ship. Leading indicator: `workflow_comparison_viewed` event rate with `compareCount ≥ 3`.

### Option B — Process Family Browser (activate the dormant Phase 5 hierarchy)

- **User job served:** J1 directly; supports J4/J5.
- **User value:** the authoritative answer to "which of my workflows are really the same process" — surfaces near-duplicate `ProcessDefinition`s as one `ProcessFamily` with explainability chips (`EXPLANATION_CODE_LABELS`: "Same start point," "Shared core steps," "Title pattern match," etc.) so the merge is never a black box.
- **Reusable from engine:** effectively the entire §2b stack — `titleNormalizer`, `stepFingerprinter`, `componentDetector`, `exactGroupScorer`, `familyScorer`, `componentReuseScorer`, the full `ExplanationCode` vocabulary — **plus** the Prisma tables (`ProcessFamily`, `GroupRelationship`, `CanonicalComponentRecord`) which are already migrated and waiting.
- **Net-new work:** (1) an orchestration/batch job that runs the scoring pipeline over a user's full workflow set and populates the three dormant tables (this is the actual net-new engineering — the scoring math is done); (2) API routes to read family/group/relationship data; (3) a browse UI one level above today's `/analytics` (family list → drill into member `ProcessDefinition`s, reusing the existing process-detail page).
- **Effort / risk:** **Medium-High / Medium.** This is the highest-leverage option (most code reuse) but also the highest **trust** risk: `DEFAULT_CLUSTER_THRESHOLD = 0.6` is explicitly documented as uncalibrated against real labeled data. Silently merging two workflows that are actually *different* real processes is a worse outcome than not merging at all — it corrupts the metrics of both. **This option should not ship with silent auto-merge in v1** (see Open Decision #1).
- **Measurable outcome:** baseline = 0 families exist today (feature doesn't render). Targets: # of exact-`ProcessDefinition` groups consolidated into families; % of proposed families with `confidenceBand ∈ {high, very_high}`; user accept/reject rate on "possible match" prompts (this is the real precision proxy in the absence of ground truth — track `family_match_confirmed` / `family_match_rejected`).

### Option C — Relationship / Similarity Graph View

- **User job served:** J5 directly; supports J4 ("automate this once, it's reused everywhere").
- **User value:** a visual map of how workflows relate — shared components, template-like, parent/child, cross-family reuse. E.g., "this login+export component appears in 12 workflows across 4 families; automate it once for portfolio-wide leverage."
- **Reusable from engine:** `GroupRelationship` type + table, `generateRunRelationships`/`generateGroupRelationships`, `componentReuseScorer`, `CanonicalComponent` detection.
- **Net-new work:** graph-rendering UI (force-directed or grouped-node graph — likely a new charting/graph-visualization dependency, ux-designer + frontend-engineer heavy); a relationship-edge computation pass (this is a **direct sequel to B**, not parallel — needs B's family/component data populated first).
- **Effort / risk:** **High / Medium-High.** Depends on B shipping first. Graph UIs risk becoming "pretty but useless" if all `possible_related` edges render indiscriminately — needs careful curation of which relationship types/confidence bands surface by default.
- **Measurable outcome:** baseline = no surface exists. Target: # of standardization/automation actions initiated from a graph node (`relationship_node_clicked` → downstream action); qualitative "does this help me decide what to automate" signal.

### Option D — Cluster-Level Time-Study with Portfolio Bottleneck Ranking

- **User job served:** J4 directly; supports J2.
- **User value:** "what's the single biggest time-sink across everything I do" — a portfolio rollup ranking step-categories/components by aggregate time-cost, weighted by run volume, instead of today's per-definition-only bottleneck lists.
- **Reusable from engine:** 100% reuse of already-computed, already-wired per-definition outputs (`analyzeTimestudy`, `detectBottlenecks`) — v1 is a pure aggregation layer in the web-app that map-reduces existing per-definition bottleneck data weighted by `runCount`. A v2 (post-Option-B) could merge equivalent steps across *different* process definitions using `stepFingerprinter`/`componentDetector` for a truer portfolio-wide ranking.
- **Net-new work:** v1 needs **zero new engine code** — it's an aggregation function + a new "Portfolio Time-Sinks" section on `/analytics` (or a new tab). v2 (component-aware merge) depends on B.
- **Effort / risk:** **Low-Medium / Low.** No fuzzy-matching judgment calls in v1 (pure arithmetic over existing, already-trusted per-definition numbers). Cheapest option in this list with real user value.
- **Measurable outcome:** baseline = no portfolio-level ranking exists. Target: click-through rate from "top time-sink" card to the underlying process/automation-ROI detail; matches the existing `/compare` "must-have number" pattern — track observed duration reduction on the top-ranked category 60/90 days post-ship for users who acted on it.

### Option E — Smart Insights Narrative Layer

- **User job served:** ties J1-J4 together into plain-language summaries; executive-consumption layer.
- **User value:** "3 of your 8 invoice workflows are really the same process; one variant runs 40% slower" — turns structured comparison/cluster/bottleneck data into a sentence, not a table.
- **Reusable from engine:** the existing `ProcessInsight` model/API pattern (dismissible insights already ship, single-definition scoped today) and — directly — the `GroupingExplanation`/`EXPLANATION_CODE_LABELS` vocabulary, which is *designed* to produce human-readable summary chips.
- **Net-new work:** a portfolio-scope insight generator that consumes B/C/D's structured outputs (so this must sequence **last**); a deterministic, templated narrative-composition layer. Per Ledgerium's determinism-first principle and the CEO's separately-signaled AI Integration Platform vision, this should stay **templated, not LLM-generated**, for v1 — narrative synthesis via LLM is a distinct, larger decision already in flight elsewhere (see Open Decision #2).
- **Effort / risk:** **Medium / Low-Medium.** Well-trodden pattern (same shape as today's shipped insight-chip copy). Low risk if scoped to deterministic templates over already-validated B/C/D data.
- **Measurable outcome:** baseline = 0 cross-workflow narrative insights exist. Target: insight-to-action click-through rate; % of sessions where a narrative insight is the entry point into compare/family/graph views.

---

## 4. Recommended Phased Build Sequence

Ordered to **leverage existing engine surfaces first**, defer the one option that carries real accuracy/trust risk until it can be validated, and let later options consume the structured data produced by earlier ones.

1. **Phase 0 — Calibration gate (Define-phase, not a feature).** Before Option B ships any auto-merge behavior, validate `DEFAULT_CLUSTER_THRESHOLD` and `familyScorer` weights against a labeled hold-out of real "known same-process" workflow pairs. This is explicitly flagged as an unmet prerequisite in the engine's own code comments — skipping it repeats the WDC-002-style "audit-honesty" risk this codebase has already paid down elsewhere (mis-clustering silently corrupts two workflows' metrics at once).
2. **Phase 1 — Option D (portfolio time-sink ranking), v1.** Cheapest, lowest-risk, zero new fuzzy-matching risk, 100% reuse of already-trusted per-definition numbers. Ships immediate value into the current time-study surface.
3. **Phase 2 — Option A (N-way visual compare).** Second-cheapest, high user-value, no new persistence/schema, no dormant-table dependency. Directly answers J2/J3 with a visual step-diff instead of flat deltas.
4. **Phase 3 — Option B (Process Family Browser).** The big unlock — activates the dormant Prisma schema + Phase-5 scoring engine. Requires Phase 0 calibration evidence. Recommend shipping with **explicit user confirmation** for `possible_related`/`likely_family` matches (not silent auto-merge) until live-usage confirmation data accumulates.
5. **Phase 4 — Option C (Relationship graph).** Direct sequel to B; only invest in the graph-visualization UI once family-grouping trust is validated with real users (avoid shipping a confusing map before the underlying grouping is credible).
6. **Phase 5 — Option E (Narrative layer) + Option D v2 (component-aware portfolio ranking).** Capstone — consumes B/C/D's structured outputs; cheapest to build last since it summarizes already-computed data rather than computing anything new.

This sequencing means **3 of 5 options (D, A, and D-v1's slice) ship before any new fuzzy-matching accuracy risk is taken on**, and the two highest-effort/highest-trust-risk options (B, C) are explicitly gated on a calibration step the engine's own authors already called out as missing.

---

## 5. Open CEO Decisions

1. **Fuzzy-clustering risk tolerance.** Should near-duplicate workflows ever silently auto-merge into one family, or must every merge in v1 require explicit user confirmation ("possible match — confirm?")? This gates whether Option B ships as auto-merge or suggest-and-confirm, and directly affects the calibration bar in Phase 0.
2. **Determinism vs. LLM narrative.** Does Option E's "smart insights" stay 100% deterministic/templated (matching Ledgerium's north-star and everything shipped to date), or does cross-workflow narrative synthesis fold into the separately-signaled AI Integration Platform Vision (BYOK LLM recommendations)? Recommendation: keep v1 deterministic; let the AI-vision program own any future LLM-based narrative to avoid scope collision with that already-in-flight review.
3. **Calibration data source (blocks Phase 3).** Do we have, or can we generate, a labeled hold-out of "known same-process" workflow pairs from real usage to calibrate the family-scoring thresholds — or do we ship Phase 3 behind a beta/feature flag with heavy "possible match, confirm?" UI and collect the labels live from user confirmations?
4. **Graph UI investment (Option C).** Is a full relationship-graph visualization (new charting/graph dependency, force-directed layout, ux-designer-heavy) worth building now, or should "shared component reuse" ship first as a simple list/badge on the family browser (a cheap Option B extension) until user demand for a visual graph is validated?
5. **IA placement.** Should Options A/D land as enhancements to the **existing** `/compare` and `/analytics` pages (lower navigation-disruption risk, recommended), or as new dedicated routes (e.g., `/analytics/families`, `/analytics/timestudy`)? Recommend enhancing existing pages first — mirrors the lesson from the Workflows Dashboard Customization review, where IA inversion was itself flagged as a P0 risk.
6. **Orchestration cadence for Phase 3+.** On-demand ("Run Analysis" button, today's pattern) vs. a background job? Family/relationship scoring is pairwise-ish and materially more expensive than today's per-definition analysis — needs an explicit compute-budget decision before Phase 3, especially against the ~10k-run/100k-step Phase 2 ceiling already documented in the metrics-engine architecture.

---

## Handoff

- **Problem + user jobs:** §1.
- **Target users:** existing Ledgerium workflow-library owners with ≥10 recorded workflows (the point at which portfolio-level questions start outranking single-process questions); secondary — ops leads doing quarterly standardization/automation reviews.
- **MVP scope:** Phase 1 (Option D v1) + Phase 2 (Option A) per §4 — both ship with zero new fuzzy-matching risk and 100% reuse of already-wired, already-trusted engine output.
- **Explicitly excluded from MVP:** any auto-merge behavior (Option B) until Phase 0 calibration evidence exists; relationship graph (Option C) until Option B ships and earns user trust; LLM-based narrative (Option E) pending Open Decision #2.
- **Acceptance criteria / success metrics:** per-option in §3; each option carries a stated baseline, target, and leading-indicator event name so `analytics` can wire dashboards before ship.
- **Downstream recipients:** `system-architect` (orchestration job design for Phase 3, N-way compare adapter design for Phase 2, module-boundary decision for the dormant Phase-5 write path), `ux-designer` (step-timeline diff visual for A, family-browser + explanation-chip UI for B, graph visualization for C), `analytics` (event taxonomy for the 6 measurable outcomes above), `competitive-researcher` (validate market expectations for family-browser and graph-view patterns before C investment).
