# AI-Opportunity Score Reconciliation

**Type:** Build-phase design decision (system-architect). ZERO product code — specifies the fix for `backend-engineer`.
**Date:** 2026-07-13
**Blocks:** Phase 0 must complete before any cross-workflow automation-ranking surface ships (T1 automation column, T6 automation narrative).
**Trigger:** analytics review flagged two coexisting AI-opportunity implementations — the exact drift class MDR-P05 (iter 039) had to close on the dashboard.

---

## 1. The two implementations

### A — `computeAiOpportunityScore` — `apps/web-app/src/lib/workflow-metrics.ts:449`
- **Inputs:** `WorkflowMetricsInput` — `stepCount`, `durationMs`, `toolsUsed[]`. Three cheap signals available for **any single workflow, even with one run**.
- **Formula:** 4-factor additive, all positive: `min(stepCount/20·30, 30) + min(durationMs/X·25, 25) + min(toolCount/Y·25, 25) + HIGH_OPT_BONUS(steps>15 ‖ duration>300s)`. No penalties.
- **Output:** `0–100` integer, bare number.
- **Grain:** per-workflow.
- **Consumed (LIVE):** `computeOpportunityTag` **Rule 1 `automate` gate** (`aiScore >= 60 && toolsUsed.length >= 2 && overall >= 40`), surfaced on the dashboard row, exercised by `route.test.ts` + `workflow-metrics.test.ts`. **Auditable from the API response by design.**

### B — `scoreAutomationOpportunity` — `packages/intelligence-engine/src/automationScorer.ts:62`
- **Inputs:** `AutomationFactors` — **9 factors**: repeatFrequency, manualClickDensity, determinism, reuseAcrossFamilies, timeCost, delayConcentration, pathStability (7 positive) + exceptionRate, ambiguityLevel (2 penalties). Derived via `deriveAutomationFactors()` from **group/multi-run context** (runCount, familyCount, pathStability, errorRate, fingerprint confidence).
- **Formula:** config-weighted sum of 7 positives **minus** 2 penalties, scaled `0–100`. Deliberately penalizes unstable/exception-heavy processes.
- **Output:** rich `AutomationScoreResult` — `score` + `rank` enum + `factorBreakdown` + `explanation` + `supportingEntries` (evidence-linked).
- **Grain:** per-process-group / per-canonical-component.
- **Consumed:** **UNWIRED** — exported in `index.ts`, tests only. Requires ≥2 runs / family context; cannot be computed for a fresh single-run workflow.

---

## 2. Verdict — legitimately DISTINCT (different grain + input availability), NOT a true duplicate

They answer the same *conceptual* question ("how good an automation candidate is this?") on the same `0–100` scale, which is exactly why they read as duplicates — but they are **not interchangeable**:

- **Different grain / input availability.** A works at per-workflow grain from 3 signals that exist on day one; the dashboard needs an opinion on *every* row immediately. B needs repeat-frequency, path-stability, exception-rate, reuse-breadth — signals that only exist once a process has **clustered into a group with multiple runs**. B literally cannot run on a fresh singleton.
- **Different semantics.** B is penalty-aware (automation on chaos is penalized); A is purely additive and will happily score an unstable process highly. Merging A→B would change the live `automate`-tag distribution; merging B→A would discard the 9-factor risk model.

**A true unify (single formula, one output) is the wrong call** — it either strips B's risk model or blocks the dashboard tag on clustering.

## 3. Resolution — documented **two-score contract** with distinct names + a hard non-mixing rule

Ship the two-score contract now (zero regression to the live gate); schedule optional convergence later (§5).

1. **Distinct names, distinct grain, distinct consumers** — codify so the collision can never re-drift:
   | Score | Canonical name | Grain | Sole consumers |
   |---|---|---|---|
   | A `computeAiOpportunityScore` | **`workflowAutomationSignal`** | per-workflow | dashboard row opportunity-tag (`automate` gate) — **unchanged** |
   | B `scoreAutomationOpportunity` | **`groupAutomationOpportunity`** | per-group/component | **all cross-workflow surfaces** (T1 time-sink automation column, T6 automation narrative, any automation clustering/ranking) |
2. **Hard rule (the anti-drift guarantee):** *never surface both scores on the same view, and never compare them.* Cross-workflow automation ranking uses **only** the group-grain score B. The per-workflow signal A stays confined to the single-row dashboard tag it already gates.
3. **Provenance field:** wherever an automation score is displayed/persisted, carry `scoreProvenance: 'workflow-signal' | 'group-opportunity'` + `scorerVersion`, so any surface is self-describing and audit can prove which formula produced a number.
4. **Feature-vector correction:** the analytics feature vector (§1 of `analytics_analysis.md`) lists `aiOpportunityScore: computeAiOpportunityScore()`. For cross-workflow clustering, **prefer B where the workflow has clustered (≥2 runs), fall back to A only for unclustered singletons, and tag the fallback via `scoreProvenance`.** The composite distance contract (§1 BUILD_SPEC) intentionally does **not** include an automation term, so this does not affect edge weights — it affects only display/ranking columns.

## 4. Exact refactor for backend-engineer (no behavior change to the live path)
1. **No formula edit to `computeAiOpportunityScore`.** Rename-alias only: export it additionally as `workflowAutomationSignal` (keep the old name as a deprecated re-export to avoid churn in `route.ts` / tests). Zero output change → zero opportunity-tag-distribution movement.
2. **Wire `scoreAutomationOpportunity` for cross-workflow surfaces.** Build `deriveAutomationFactors()` inputs from group-level data (runCount, familyCount, pathStability from `standardizationScorer`, errorRate, avg fingerprint confidence) at the T1/T6 orchestration layer. Export as `groupAutomationOpportunity`.
3. **Add `scoreProvenance` + `scorerVersion`** to the T1/T6 automation payloads and to any persisted automation ranking.
4. **Add a lint/architecture test** asserting no single component imports both scorers — the structural guard that prevents re-drift (mirrors the MDR-P05 deletion-lock pattern).

## 5. Regression risk
- **Rename-alias for A: negligible.** Output byte-identical; only an added export name. Existing tests pass unchanged.
- **Wiring B: low, contained.** B is currently unwired, so wiring it introduces net-new behavior with no existing consumer to break; risk is limited to correct `deriveAutomationFactors` population (unit-test the derivation against known fixtures).
- **The trap to avoid (HIGH if mishandled):** any attempt to *unify* A and B into one formula touches the LIVE `automate` gate (Rule 1, `aiScore >= 60`) — a tested, user-visible tag distribution. If convergence is ever pursued (§5-optional), it MUST be **output-preserving for the per-workflow path**, golden-locked with fixtures, and re-reviewed by `growth-strategist` if the tag distribution shifts. Recommend **NOT** unifying pre-T1; the two-score contract carries zero regression and fully unblocks the program.

**Optional future convergence (deferred, output-locked):** reduce A to a thin grain-adapter that builds a *partial* `AutomationFactors` (the 3 day-one signals) with neutral defaults for unavailable factors and calls B — giving one formula with two grain entry points. Only worth doing behind golden fixtures proving the live `automate` distribution is unchanged. Not required for this program.
