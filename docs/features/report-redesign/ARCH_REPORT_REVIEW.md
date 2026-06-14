# Workflow Report — Architecture Review & Clean Redesign

**Author:** system-architect
**Date:** 2026-06-14
**Mode:** READ-ONLY architecture review. No code changes.
**Scope:** The workflow **Report** view — how its intelligence/data is produced and rendered, and the correct design for a best-in-class report. Primary defect under investigation: **variance / variants data is dropped or misread**.

---

## 0. TL;DR

The Report tab and the Variants tab are fed by **two different analysis functions over two different cohorts**:

| Surface | API route | lib function | Cohort | Output |
|---|---|---|---|---|
| **Report tab** (`WorkflowReportPage`) | `POST /api/workflows/[id]/analyze` | `analyzeWorkflow()` | **single run** (`[workflowId]` only) | `PortfolioIntelligence` over 1 run |
| **Variants tab** (`WorkflowPageShell` variants mode) | `POST /api/workflows/[id]/variants` | `analyzeWorkflowVariants()` | **cross-run cohort** (persisted group ∪ similarity cluster ∪ self) | `PortfolioIntelligence` over N runs + variant titles/durations |

The Report's "Variance & Variants" section therefore **always sees `runCount === 1`**, hits the single-run guard, and renders the *"Recorded once. Run this workflow again…"* placeholder — **even when the workflow belongs to a multi-run process group that the dashboard already counts as "N runs" and the Variants tab already renders correctly.** Variance, variants, timestudy, and cross-run bottlenecks are silently suppressed on the Report. This is not a render bug; it is a **data-source bug**: the Report consumes the wrong analysis function.

Secondary issue: the Report defines its own private `IntelligenceData` interface (`WorkflowReportPage.tsx:186-194`) that is a **narrow, lossy, hand-maintained re-declaration** of the engine's `PortfolioIntelligence` (`packages/intelligence-engine/src/types.ts:342-354`). The two drift independently; the report reads fields by optional-chaining and silently shows `—` whenever its private shape diverges from the engine's real shape.

**The fix (P0):** point the Report at the **same cross-run cohort intelligence the Variants tab uses** (`analyzeWorkflowVariants`), behind a **single shared, honest `ProcessIntelligence` contract** consumed by Report + Variants + dashboard. P1 modernizes presentation (shared insight-band, client-only deterministic Recharts). P2 adds export/print.

---

## 1. Current Report DATA ARCHITECTURE

### 1.1 How the detail page assembles data

`apps/web-app/src/app/(app)/workflows/[id]/page.tsx` is a **client component** (`'use client'`, line 1). It is the single orchestrator for all three tabs (Workflow / SOP / Report). Data arrives in **three independent fetch lifecycles**:

1. **Base artifacts** — `useEffect` at `page.tsx:120-137` fetches `GET /api/workflows/[id]` once on mount → `setData(result)`. The response (`route.ts:98-112`) returns `{ workflow, artifacts[] }` where each artifact's `contentJson` is **already JSON-parsed server-side** (`route.ts:109`). The page then pulls named artifacts out of the array by `artifactType` (`page.tsx:243-261`): `process_output`, `workflow_report`, `sop`, `process_map`, `workflow_insights`, `workflow_interpretation`, templates.

2. **Single-run intelligence** — `handleRunIntelligence()` (`page.tsx:183-195`) `POST`s `/api/workflows/[id]/analyze` → `setIntelligenceData(result.intelligence)`. Auto-fired once when the Report tab first becomes active (`page.tsx:111-118`).

3. **Agent intelligence** — `handleRunAgentIntelligence()` (`page.tsx:224-236`) `POST`s `/api/workflows/[id]/agent-intelligence` → `setAgentIntelligenceData(result.data)`. Also auto-fired on Report-tab open.

A **fourth, separate** lifecycle exists for variants: `handleLoadVariants()` (`page.tsx:199-214`) `POST`s `/api/workflows/[id]/variants` → `setVariantIntelligence(result.intelligence)`. This is **lazy-loaded only when the user opens variants mode in the Workflow tab** (`WorkflowPageShell.tsx:113-116`), and is **passed only to `WorkflowPageShell`** (`page.tsx:428`), **never to `WorkflowReportPage`**.

### 1.2 What the Report actually receives

`WorkflowReportPage` is rendered at `page.tsx:465-487` with these props:

```
workflow         ← workflow summary (always present)
insights         ← workflowInsights artifact      (workflow_insights.contentJson)
interpretation   ← interpretation artifact         (workflow_interpretation.contentJson)
intelligence     ← intelligenceData (state)        ← /analyze  ← analyzeWorkflow()  [SINGLE RUN]
agentIntelligence← agentIntelligenceData (state)   ← /agent-intelligence
processOutput    ← processOutput artifact          (process_output.contentJson)
```

The **`intelligence` prop is the single-run output**. There is no path by which the cross-run `variantIntelligence` reaches the Report.

### 1.3 Where intelligence is produced — single-run vs cross-run cohort

`apps/web-app/src/lib/intelligence.ts` exposes two relevant functions:

- **`analyzeWorkflow(userId, workflowId)`** (`intelligence.ts:423-431`): loads **only the target workflow's** process output (`getWorkflowsWithOutputs(userId, [workflowId])`), builds **1 bundle**, calls `analyzePortfolio({ runs: bundles })`. Result is honest but trivially single-run: `metrics.runCount === 1`, `variants.variantCount === 1`, `variance.sequenceStability === 1`, `highVarianceSteps === []`, `timestudy` has no spread.

- **`analyzeWorkflowVariants(userId, workflowId)`** (`intelligence.ts:447-547`): the **cross-run cohort** analysis. It:
  - gathers **Cohort 1** = the persisted process group (`processDefinitionId` match — exactly the dashboard's "N runs"; `intelligence.ts:472-474`),
  - gathers **Cohort 2** = a similarity cluster via `clusterSignatures` (`intelligence.ts:479-494`),
  - unions both + self (`intelligence.ts:497`), runs `analyzePortfolio` over the **union of N bundles** (`intelligence.ts:505`),
  - additionally returns per-variant **real recorded step titles + durations** (`variantStepTitles`, `variantStepDurations`; `intelligence.ts:518-542`),
  - falls back to `null` (honest single-run view) when no cohort exists.

  This is the function that produces **correct variance/variants** — and it is the one the Report should consume.

There is also a **persisted** path: `clusterWorkflows()` (`intelligence.ts:148-419`) writes `ProcessDefinition.intelligenceJson` (`intelligence.ts:200-264`) and `ProcessInsight` rows (`generateInsights`, `intelligence.ts:564-680`). The persisted `intelligenceJson` already contains the full multi-run `PortfolioIntelligence` for the group — but **the Report never reads it**; it re-derives single-run intelligence at request time via `/analyze`.

### 1.4 The contract mismatch — `IntelligenceData` vs `PortfolioIntelligence`

The Report declares a **private, lossy** interface (`WorkflowReportPage.tsx:147-194`):

```
IntelligenceData {
  metrics?:    { medianDurationMs?, meanDurationMs?, medianStepCount?, meanStepCount?, runCount?, completionRate? }
  timestudy?:  { stepPositionTimestudies?: TimestudyStep[] }
  variance?:   { sequenceStability?, durationVariance?: { coefficientOfVariation? }, highVarianceSteps?: unknown[] }
  variants?:   { variantCount?, variants?: IntelligenceVariant[] }
  bottlenecks?:{ bottlenecks?: IntelligenceBottleneck[] }
}
```

The engine's real contract (`packages/intelligence-engine/src/types.ts:342-354`) is richer and **structurally different**:

- `PortfolioIntelligence.runCount` is a **top-level field** (`types.ts:344`) — the Report reads `intelligence.metrics.runCount` only (`WorkflowReportPage.tsx:786, 1386, 1409, 1439, 1579`). `ProcessMetrics` *does* carry `runCount` (`types.ts:108`), so this happens to work, but the report ignores the authoritative top-level `runCount`.
- `variance.durationVariance` in the engine is `{ stdDevMs, coefficientOfVariation, isHighVariance }` (`types.ts:200-204`); the Report's private type knows only `coefficientOfVariation` (`WorkflowReportPage.tsx:174`) — `stdDevMs` and `isHighVariance` are **dropped**.
- `variance.stepCountVariance` (`types.ts:205-210`) and `variance.evidenceRunIds` (`types.ts:217`) are **entirely absent** from the Report's type — evidence/provenance is lost.
- `variants.standardPath` (`types.ts:245`) is **absent** from the Report's type; the Report re-derives the standard variant by scanning `variantList.find(v => v.isStandardPath)` (`WorkflowReportPage.tsx:1407`) instead of reading the engine's authoritative `standardPath`.
- `HighVarianceStep` is typed as `unknown[]` (`WorkflowReportPage.tsx:175`); the Report only ever uses `.length` (`WorkflowReportPage.tsx:1406`) — the per-step CV detail the engine computes (`types.ts:181-190`) is never surfaced.
- `bottlenecks[]` (`types.ts:257-269`) carries `isHighDuration`, `isHighVariance`, `coefficientOfVariation`, `runCount`, `evidenceRunIds` — the Report's private `IntelligenceBottleneck` (`WorkflowReportPage.tsx:147-153`) keeps only `position/meanDurationMs/overallMeanStepDurationMs/durationRatio/category`. Severity and provenance are dropped.
- The Report ships an `asArray()` coercion guard (`WorkflowReportPage.tsx:31-33`) specifically because "real artifact JSON can carry `null` or a non-array where the typed interface says array" — i.e. the private interface is **known not to match reality**, and the component defends against its own contract.

**Net effect of §1.4:** even when correct multi-run data *is* supplied, the Report's private interface throws away `stdDevMs`, `isHighVariance`, `standardPath`, per-step variance detail, step-count variance, severity, and all `evidenceRunIds`. The redesign must replace this private re-declaration with the engine contract (or a single shared view contract derived from it).

### 1.5 Exactly where variance/variants are dropped

1. **Primary drop — wrong cohort.** `VarianceVariantsSection` (`WorkflowReportPage.tsx:1382-1402`) reads `runCount = intelligence?.metrics?.runCount ?? 1`. Because `intelligence` came from `/analyze` (single-run), `runCount === 1`, so the section short-circuits to the *"Recorded once…"* placeholder (`WorkflowReportPage.tsx:1391-1402`). `TimestudySection` (`WorkflowReportPage.tsx:1577-1580`) and the `visibleSections` filter (`WorkflowReportPage.tsx:2006-2009`) apply the same `runCount < 2` gate and hide the timestudy. The variance/variant data the Variants tab shows is **structurally unreachable** from the Report.

2. **Secondary drop — lossy contract.** Even if a multi-run `intelligence` were supplied, the private `IntelligenceData` interface (`WorkflowReportPage.tsx:186-194`) discards the fields enumerated in §1.4.

3. **Tertiary inconsistency — duplicate single-run analysis.** `/analyze` recomputes single-run intelligence at request time and ignores the persisted group `intelligenceJson` the cohort path already produces; the Report and Variants tab can therefore disagree about the same workflow (single-source-of-truth violation, the same class of defect closed for the dashboard at iter 039 MDR-P05).

> Note: `ReportTab.tsx` is a **separate, older** report renderer (consumes a `workflow_report` artifact: `header/executiveSummary/metrics/sop`). It is **not** wired into the detail page's Report tab today (`page.tsx:462-487` renders `WorkflowReportPage`, not `ReportTab`). It contains no variance/variants surface and is effectively legacy; the redesign should treat `WorkflowReportPage` as the live Report and either retire `ReportTab` or fold its `executiveSummary`/`keyObservations` content into the new design.

---

## 2. The CORRECT design — Report consumes the same cross-run cohort intelligence

### 2.1 Single source of analysis

The Report must call the **same cohort analysis the Variants tab uses**: `analyzeWorkflowVariants(userId, workflowId)` (`intelligence.ts:447`). This guarantees the Report and Variants tab agree by construction (one function, one cohort, one `analyzePortfolio` invocation), and that the Report's variance/variants match what the dashboard counts as "N runs" (Cohort 1 is the persisted group).

Two viable sourcing strategies (P0 picks one; both keep determinism + hydration-safety):

**Option A (recommended) — single cohort endpoint, consumed by both tabs.**
Promote `/api/workflows/[id]/variants` to the **canonical process-intelligence endpoint** (or add a sibling `/intelligence` that wraps the same lib function). The detail page fetches the cohort intelligence **once**, hydrates a single `processIntelligence` state, and passes it to **both** `WorkflowPageShell` (variants mode) and `WorkflowReportPage`. This removes the duplicate `/analyze` single-run fetch entirely for the report's cross-run sections.

- `page.tsx`: replace the Report's `intelligence={intelligenceData}` (`page.tsx:482`, fed by `/analyze`) with the cohort result. `handleLoadVariants` (`page.tsx:199-214`) already produces exactly this; lift it so it fires on **either** variants-mode open **or** Report-tab open, and feed both surfaces from `variantIntelligence`.
- Keep `analyzeWorkflow` / `/analyze` available for any genuinely single-workflow consumer, but the Report no longer depends on it.

**Option B — Server Component report.**
Convert the Report view into a **server component** (a `/workflows/[id]/report` server segment, or a server child the client tab mounts) that calls `analyzeWorkflowVariants` directly (no API round-trip), passes a fully-resolved `ProcessIntelligence` as props. This is cleaner for determinism and removes the client-side "Run analysis" auto-fire (`page.tsx:111-118`), but is a larger refactor because today the entire detail page is one client component with shared tab state. **Recommend Option A for P0**, keeping Option B as a P1+ structural improvement once the shared contract exists.

### 2.2 Deterministic + hydration-safe

The engine is already deterministic and privacy-safe (`types.ts:10-18`; categories not titles in signatures). The cohort gather is explicitly read-only and deterministic (`intelligence.ts:438-445, 516-518`). To preserve flash-safety (the production outage anchor at `WorkflowReportPage.tsx:25-30`, and the hydration smoke gate at `e2e/smoke/hydration.smoke.spec.ts`):

- **No `Date.now()`/`Math.random()`/`new Date()` in render.** The engine stamps `computedAt` server-side; the report must format provided values only (the existing `useCountUp`/`useScrollSpy` hooks are effect-driven and already hydration-safe). The `ReportTab.tsx:38` `new Date(...).toLocaleDateString(... timeZone: 'UTC')` pattern is acceptable only because it is UTC-pinned; the redesign should keep all date formatting UTC-pinned and value-driven.
- **Keep the `asArray()` defensive coercion** (`WorkflowReportPage.tsx:31-33`) at the contract boundary even after typing tightens — artifact JSON is still untrusted at runtime.
- **Charts client-only** (see §4): Recharts must be dynamically imported with `ssr: false` so no chart HTML is server-rendered → nothing to mismatch on hydration (same principle the smoke gate documents for the Umami `<script>`).

### 2.3 Single-run honesty

The cohort function already encodes single-run honesty: when no similar runs exist it returns `null` (`intelligence.ts:460-463, 499-502`) → the Report falls back to a **single-run view**. The redesign formalizes a tri-state:

- **`runCount >= 2`** → render full Variance & Variants / Timestudy / cross-run bottlenecks with **evidence basis** ("across N runs", surfacing `evidenceRunIds` counts).
- **`runCount === 1`** → render the honest activation nudge (preserve current copy `WorkflowReportPage.tsx:1396-1398`) **but** sourced from the same contract, so the moment a second run is recorded the section "fills in" with no code change.
- **cohort `null` / analysis error** → an explicit, distinguishable empty state (do not collapse error into "recorded once"; the Variants tab already distinguishes `forbidden`/`unprocessed`/`error`, `page.tsx:58-60` — the Report should adopt the same status enum so feature-gating 403s and unprocessed 422s render honestly instead of as "single run").

---

## 3. Unified "Process Intelligence" data contract (DRY — one source of truth)

**Yes — the Report should share a single contract with the Variants tab and the dashboard.** Today the engine contract is re-declared at least three times: the Report's `IntelligenceData` (`WorkflowReportPage.tsx:147-194`), the Variants/`WorkflowPageShell` `variantIntelligence?: any` (`WorkflowPageShell.tsx:59`, fully untyped), and the dashboard's `intelligenceJson` consumers. Define one shared view contract:

### 3.1 `ProcessIntelligence` (shared view contract)

Source of truth is the engine's `PortfolioIntelligence` (`packages/intelligence-engine/src/types.ts:342-354`). Introduce a single shared module (e.g. `apps/web-app/src/lib/process-intelligence/contract.ts`) exporting:

```
// Re-export / alias the engine type as the canonical shape — do NOT re-declare fields.
export type ProcessIntelligence = PortfolioIntelligence & {
  // cohort-only enrichments produced by analyzeWorkflowVariants:
  variantStepTitles?:   Record<string, string[]>;     // intelligence.ts:525, 538
  variantStepDurations?: Record<string, number[]>;    // intelligence.ts:526, 539
};

// Honest load envelope shared by Report + Variants tab:
export type ProcessIntelligenceState =
  | { status: 'idle' | 'loading' }
  | { status: 'loaded'; data: ProcessIntelligence }       // runCount may be 1 (single-run honest)
  | { status: 'unprocessed' | 'forbidden' | 'error' };
```

Rules:
- **The Report's private `IntelligenceData` / `IntelligenceVariance` / `IntelligenceVariant` / `IntelligenceBottleneck` / `IntelligenceMetrics` / `TimestudyStep` interfaces (`WorkflowReportPage.tsx:147-194`) are deleted** and replaced by imports from this contract. This closes §1.4 by construction — there is no second shape to drift.
- **`WorkflowPageShell.variantIntelligence?: any` (`WorkflowPageShell.tsx:59`) is typed to `ProcessIntelligence`.** Report and Variants now provably read the identical object.
- The dashboard's `ProcessDefinition.intelligenceJson` consumers adopt the same `ProcessIntelligence` type when deserializing (the persisted blob is already a `PortfolioIntelligence` superset, `intelligence.ts:253-264`).
- The contract module owns the **selectors** (pure, deterministic, unit-tested) so render code never optional-chains raw: `selectStandardPath(pi)` (reads `variants.standardPath`, `types.ts:245`), `selectSequenceStability(pi)`, `selectHighVarianceSteps(pi)`, `selectCrossRunBottlenecks(pi)`, `selectEvidenceRunCount(pi)`. The existing `asArray()` guard moves into these selectors.

### 3.2 Why DRY here is correct (not over-abstraction)

This is a contract consolidation, not a new abstraction layer: the engine type already exists and is authoritative; we are removing **three hand-maintained copies** and pointing all consumers at it. It directly enforces the Ledgerium "explicit contracts over magic" and "single source of truth" principles (the same fix-class as MDR-P05 dashboard shadow-function consolidation). It also makes the §1.5 drops impossible to reintroduce: a missing field is a **compile error**, not a silent `—`.

---

## 4. Render architecture for a flagship report

Keep the current strong bones — single-scroll sections, right-rail scroll-spy (`RightRailNavigator`, `WorkflowReportPage.tsx:1926-1959`), per-section independent empty states, memoized `visibleSections` (`WorkflowReportPage.tsx:1984-2020`, which keeps the IntersectionObserver stable across async fetches). Layer on:

### 4.1 Section model (ordered)

1. **Hero** (`HeroSection`, keep) — identity band + headline metrics.
2. **Lead insight / "Start here"** (keep, `WorkflowReportPage.tsx:1294`) — highest-leverage signal.
3. **Process Health scores** (keep).
4. **Phase timeline** (keep).
5. **Run metrics** (keep) — but driven by cohort metrics when `runCount >= 2`.
6. **Variance & Variants** (FIX — §1.5) — now fed by cohort `ProcessIntelligence`; surface `standardPath`, `sequenceStability`, `durationVariance.{stdDevMs,coefficientOfVariation,isHighVariance}`, `highVarianceSteps[]` per-step CV, and the Pareto variant bars (existing `WorkflowReportPage.tsx:1468-1511`) using **real variant titles** from `variantStepTitles`.
7. **Step duration (timestudy)** (FIX) — now reachable at `runCount >= 2`.
8. **Insights**, **Automation**, **Bottlenecks** (cross-run), **Step breakdown**, **Friction & decisions**, **Rework**, agent sections — keep.

### 4.2 Shared insight-band (reuse dashboard band components)

The Report already imports shared primitives: `ProcessHealthScoreBar`, `InsightActionCard`, `AutomationScoreChip`, `BottleneckRow` (`WorkflowReportPage.tsx:20-23`), and the repo ships shared band primitives (`AutomationHintBlock`, `ImpactBadge`, `SeverityPill`, `WarningBlock` under `components/shared/`). Introduce a single **`InsightBand`** at the top of the Report (above "Start here") that reuses the **same band components the dashboard uses**, fed by the shared `ProcessIntelligence` selectors — so the dashboard summary chip and the report headline are provably the same numbers (closes the dashboard/report consistency gap). Surface severity via the existing `SeverityPill`/`ImpactBadge` rather than the report's ad-hoc severity maps (`WorkflowReportPage.tsx:1081-1086`).

### 4.3 Recharts — client-only + deterministic

Replace the hand-rolled CSS bars (variant Pareto bar `WorkflowReportPage.tsx:1502-1507`; confidence bar `:483-488`; capability bars) with Recharts **only where it adds analytical value** (variant Pareto chart, per-step timestudy mean/median/p90, duration distribution). Constraints:

- `dynamic(() => import('...'), { ssr: false })` for every chart → no server-rendered chart markup → hydration-safe (per the smoke-gate principle, `hydration.smoke.spec.ts:9-31`). The admin operations dashboard already uses Recharts with a per-instance `useId()` gradient-collision fix (iter 073) — reuse that pattern.
- Charts receive **pre-computed deterministic data** from the engine (no in-component sampling/`Date`/random). Order series by the engine's already-deterministic Pareto order (`WorkflowReportPage.tsx:1412-1416`).
- Provide a **non-chart fallback** (the existing bars) for print and for the SSR/no-JS path.

### 4.4 Print / export

- **Print:** the page already uses `no-print` class scoping (`page.tsx:350, 382, 505`). Add a print stylesheet that linearizes sections, hides the right rail, and forces charts to their static fallback (since `ssr:false` charts won't be in print SSR). The `ds-document`/`ds-attribution` print structure in `ReportTab.tsx:23, 183` is the model to fold in.
- **Export:** keep the existing JSON export (`page.tsx:263-284`) but add a **report-intelligence export** that serializes the resolved `ProcessIntelligence` (with `evidenceRunIds`) so the exported artifact is provenance-complete. A PDF/print-to-PDF path is P2.

---

## 5. Risk / sequencing & contracts that must not break

### P0 — Fix the data source (variance/variants become correct)
1. **Feed the Report from the cohort.** Wire `WorkflowReportPage`'s `intelligence` prop to the `analyzeWorkflowVariants` result (Option A, §2.1): lift `variantIntelligence` so it fires on Report-tab open and is passed to both `WorkflowPageShell` and `WorkflowReportPage` (`page.tsx:428` and `:482`). Adopt the status enum (`page.tsx:58-60`) for honest 403/422/error states on the Report.
2. **No engine changes.** `analyzePortfolio` / `analyzeWorkflowVariants` / `PortfolioIntelligence` are untouched — this is purely a wiring change at the page + report boundary, which keeps blast radius minimal and reversible.
3. **Single-run honesty preserved** via the cohort `null` fallback (§2.3).

### P1 — Unify the contract + modernize presentation
4. Introduce the shared `ProcessIntelligence` contract (§3); delete the Report's private `IntelligenceData` family (`WorkflowReportPage.tsx:147-194`); type `WorkflowPageShell.variantIntelligence` (`WorkflowPageShell.tsx:59`).
5. Add selectors + shared `InsightBand` (§4.2); migrate severity to shared pills.
6. Add client-only deterministic Recharts (§4.3) with static fallbacks.
7. (Optional, structural) Server-component report (Option B, §2.1) once the shared contract exists.

### P2 — Export / print
8. Print stylesheet + provenance-complete intelligence export + print-to-PDF.

### Tests / contracts that MUST NOT break
- **Hydration / flash-safety smoke gate** — `apps/web-app/e2e/smoke/hydration.smoke.spec.ts` (and `hydration-patterns.ts`). Every change must keep dynamic `/workflows/[id]` render free of hydration mismatch and "Application error". The production-outage anchor comment (`WorkflowReportPage.tsx:25-30`) and the `asArray()` guard must survive any contract tightening.
- **Intelligence-engine unit tests** — `packages/intelligence-engine/src/intelligenceEngine.test.ts`, `divergenceAnalyzer.test.ts`, `phase3.test.ts`, `scoringEngine.test.ts`, `stepFingerprinter.test.ts`, `componentDetector.test.ts`, `titleNormalizer.test.ts`. P0 touches **none** of the engine; these must stay green byte-for-byte as a guarantee the data source is engine-faithful. (No standalone `WorkflowReportPage` / report-route test file exists today — a **new** deterministic report test asserting "cohort with N≥2 runs renders Variance & Variants, not the single-run placeholder" should be added as part of P0, since the current absence is exactly why this defect shipped.)
- **`analyzeWorkflowVariants` contract** — its `(PortfolioIntelligence & { variantStepTitles?, variantStepDurations? }) | null` return (`intelligence.ts:447-456`) is now consumed by **two** surfaces; the shared contract (§3.1) must alias it exactly so the Variants tab is not regressed.
- **`divergenceAnalyzer` (`deriveDivergence`)** — consumed by the Variance section (`WorkflowReportPage.tsx:1419`, imported `:16`); its input is the sorted variant list. Keep the sort + input shape stable (`WorkflowReportPage.tsx:1412-1416`).
- **Feature gating** — both `/analyze` and `/variants` gate on `intelligenceLayer` Team+ (`analyze/route.ts:27-38`, `variants/route.ts:28-39`). The Report's new cohort source must preserve the 403 → honest gated state, not a blank/"single-run" render.

### Key risks
- **R1 — Report ⇄ Variants divergence persists if only the wire is changed but contracts stay duplicated.** Mitigation: do P1 contract unification close behind P0.
- **R2 — Charts reintroduce hydration flash.** Mitigation: `ssr:false` + static fallback + reuse iter-073 `useId()` gradient fix; smoke gate is the backstop.
- **R3 — Cohort cost.** `analyzeWorkflowVariants` gathers all user workflows (`intelligence.ts:457`) and clusters them per Report open. Mitigation: it is already the lazy variants path; consider serving the persisted group `intelligenceJson` (`intelligence.ts:253-264`) as a fast path when the group is unchanged, recomputing only on cache miss (a P1+ snapshot-table concern, deliberately out of P0 scope).
- **R4 — `ReportTab.tsx` legacy ambiguity.** It is unwired today; explicitly retire or fold it (§1.5 note) so a future contributor does not "fix" the wrong renderer.

---

## Appendix — file/line index

| Concern | Location |
|---|---|
| Detail page orchestration (client) | `apps/web-app/src/app/(app)/workflows/[id]/page.tsx:41-519` |
| Report rendered with single-run `intelligence` | `page.tsx:465-487` (prop at `:482`) |
| `/analyze` fetch → `setIntelligenceData` | `page.tsx:183-195` |
| `/variants` fetch → `setVariantIntelligence` (Report never receives) | `page.tsx:199-214, 428` |
| Base artifact fetch + parse | `page.tsx:120-137, 242-261`; route `[id]/route.ts:98-112` |
| Report private (lossy) `IntelligenceData` family | `WorkflowReportPage.tsx:147-194` |
| `asArray` defensive guard / outage anchor | `WorkflowReportPage.tsx:25-33` |
| Variance & Variants section + single-run gate | `WorkflowReportPage.tsx:1382-1402` |
| Timestudy `runCount<2` gate | `WorkflowReportPage.tsx:1577-1580` |
| `visibleSections` variance/timestudy gating | `WorkflowReportPage.tsx:2003-2009` |
| Single-run analysis | `lib/intelligence.ts:423-431` |
| Cross-run cohort analysis (correct source) | `lib/intelligence.ts:447-547` |
| Persisted group intelligence (unused by Report) | `lib/intelligence.ts:200-264` |
| Engine contract `PortfolioIntelligence` | `packages/intelligence-engine/src/types.ts:342-354` |
| Engine `VarianceReport` / `VariantSet` | `types.ts:196-249` |
| `analyzePortfolio` entry | `packages/intelligence-engine/src/intelligenceEngine.ts:68` |
| Variants tab consumer (untyped `any`) | `components/workflow-view/WorkflowPageShell.tsx:59, 315-319` |
| Legacy report renderer (unwired) | `components/detail/ReportTab.tsx:15-188` |
| Hydration/flash-safety smoke gate | `apps/web-app/e2e/smoke/hydration.smoke.spec.ts` |
| Feature gating (Team+) | `[id]/analyze/route.ts:27-38`, `[id]/variants/route.ts:28-39` |
