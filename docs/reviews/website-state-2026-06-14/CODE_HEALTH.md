# Ledgerium AI — Code Health & Architecture Review

**Date:** 2026-06-14
**Type:** Read-only code-health / architecture review (system-architect). No product code changed.
**Scope:** monorepo shape, test posture, determinism + hydration-safety, intelligence-engine, the report/dashboard render pipelines, tech debt, CI discipline.
**Method:** static file inspection + grep (Bash unavailable in this environment; line counts and test totals cite file tails and the most recent meta artifact `docs/meta/MR_019_META_REVIEW.md`, not a fresh suite run).

---

## 0. Repo shape (evidence)

- **pnpm workspace** (`pnpm-workspace.yaml`): `apps/*` + `packages/*`.
- **11 packages/apps:** `apps/web-app` (`@ledgerium/web-app`), `apps/extension-app`; packages `intelligence-engine`, `process-engine`, `agent-intelligence`, `intent-inference`, `segmentation-engine`, `normalization-engine`, `policy-engine`, `schema-events`, `shared-types`.
- **Stack** (`apps/web-app/package.json`): Next 14.2, React 18.3, `@xyflow/react` 12 + `elkjs` 0.11 (canvas layout), Prisma 6, next-auth 5 beta, Stripe 17, Zod 3, recharts 3, posthog. Vitest + Playwright + `@axe-core/playwright`.
- **Test total:** ~**2308 tests across ~80 test files** workspace-wide (per `MR_019_META_REVIEW.md:56,552`). The CLAUDE.md narrative (iter 074, "2183 tests") is a stale snapshot; the repo has progressed through teams/billing/demo-mode/flash-safety work to ~iter 099+.

---

## 1. Strengths

### 1.1 Determinism is architecturally enforced, not aspirational
- `packages/intelligence-engine/src/intelligenceEngine.ts:9-14` states the contract in code: "Pure function: same inputs → same analytics outputs… no randomness, no LLM, no opaque heuristics." `analyzePortfolio()` (`:68`) returns a fully-typed `PortfolioIntelligence` (`types.ts:342-354`) with required fields.
- The render pipeline honors it. Grep for `Date.now()` / `Math.random()` / `new Date()` in `apps/web-app/src/components/*.tsx` returns **zero hits inside layout/render math** — the only matches are event-handler refs and `useMemo` request-boundary snapshots (`DashboardV2Shell.tsx:169,256,300,305,561`; `WorkflowRow.tsx:788`) plus chart components that explicitly document "NO Date.now()/Math.random() in render" (`band/RecordedTrendChart.tsx:9-10`, `band/TopBand.tsx:15`, `UnifiedToolbar.tsx:26`).
- `lib/variantFlowModel.ts:9-21` and `adapters/shapeResolver.ts:11` both carry "no Date.now()/Math.random(), no unstable sorts → byte-identical positions → hydration-safe" as a hard requirement.

### 1.2 The honesty chokepoint is a real, single, testable function
- `adapters/shapeResolver.ts` is "the single honesty chokepoint for process-map shapes" — a **total, pure truth table** over `nodeType × decisionProvenance`. The load-bearing invariant: a diamond may only come from `observed-divergence` / `observed-validation`; `inferred`/`null` is *demoted* to a process box (`:43-58`). This makes "no fabricated decisions" a compile-and-test-enforced property, not a convention. It has a co-located test (`shapeResolver.test.ts`).
- `variantFlowModel.ts:11-15` extends the same discipline to labels: "decisionLabel NEVER contains a fabricated business condition… observed-count language only." This is the evidence-linkage moat expressed at the UI boundary.

### 1.3 Evidence-linkage is plumbed end to end
- Engine outputs carry `evidenceRunIds` for traceability (`intelligenceEngine.ts:11`). `lib/intelligence.ts` is a clean orchestrator that consumes the engine's `PortfolioIntelligence` and persists results — it does not reinvent analytics.

### 1.4 Strictness is turned up
- `tsconfig.base.json:5` enables **`exactOptionalPropertyTypes: true`** — one of the strictest TS flags, rarely on in production codebases. Combined with the strict-mode posture this is a strong baseline.

### 1.5 Very low ambient tech debt markers
- Repo-wide grep for `TODO|FIXME|HACK|XXX` in `*.ts(x)` returns **2 occurrences in 2 files** (`extension-app/e2e/real-extension/sidepanel-real.spec.ts`, `sop-view/SOPPageShell.tsx`). Debt is tracked in artifacts/backlog rather than scattered as inline rot.

### 1.6 The flash-safety gate is genuinely good engineering
- `e2e/smoke/hydration.smoke.spec.ts` and `playwright.smoke.config.ts` reproduce the *exact* production failure mode: build WITHOUT `NEXT_PUBLIC_UMAMI_*`, run `next start` WITH them, browser in `America/New_York` vs server `TZ=UTC` (`smoke.config.ts:36,82`). It distinguishes static (○) vs dynamic (ƒ) routes and targets `/share/[token]` as the key reproduction route. The canvas gate (`canvas.smoke.spec.ts`) extends this to all four map modes (flow/swimlane/variants/systems) with the INV-2 rationale that ELK's async `layout()` must run only in `useEffect`. Error patterns are centralized in one canonical list (`hydration-patterns.ts`) — no copy-paste drift. This is the correct shape for a runtime-class regression gate.

### 1.7 Extension reliability invariant intact
- All CLAUDE.md "forbidden silent-change" surfaces are present and discoverable (`content/capture.ts`, `background/index.ts`, `background/session-store.ts`, `injection-manager.ts`, `manifest.json`). The `RAW_EVENT_CAPTURED` / `attachDOMListeners` capture path is locatable and unbroken.

---

## 2. Tech debt + top risks

### 2.1 RISK (HIGH) — The smoke/hydration gate is NOT wired into the deploy pipeline
This is the single most important finding. `.github/workflows/deploy.yml` `quality-gate` job runs **only** `pnpm typecheck` + `pnpm test` (unit) at `:40-44`, then builds and deploys **straight to the Hostinger prod VPS** (`:79-93`). The Playwright smoke gate — the very artifact built in response to the 2026-06-04 production crisis and named in `SESSION_RETRO_AND_GUARDRAILS_001.md:22` as the binding guardrail ("No deploy without… a real-browser runtime smoke gate passes") — **does not run in CI before deploy**. Guardrail #4 in that same doc states verbatim "Build-passing ≠ working… a browser-level gate is the validation of record." The pipeline currently violates its own #1 rule.
- Mitigating: `deploy.yml:72-77` *does* contain the RCA-5 fix (passing `NEXT_PUBLIC_UMAMI_*` as Docker build-args so the build/runtime asymmetry that caused the flash can no longer occur). So the known root cause is structurally fixed at build-arg level — but nothing *proves* it stays fixed on each deploy, and there is no staging step (guardrail #1c).

### 2.2 RISK (HIGH) — The lossy report contract (deferred R-E unification) caused a real outage
`components/detail/WorkflowReportPage.tsx` re-declares its **own private** `IntelligenceData` / `AgentIntelligenceData` interfaces (`:240-302`) in which essentially every field is optional or `| null | undefined` — fully divorced from the engine's required-field `PortfolioIntelligence` (`intelligence-engine/src/types.ts:342-354`). The report then defends every access with `asArray()` whose comment names the incident directly: *"can carry null or a non-array where the typed interface says array… so one malformed artifact never throws and blanks the whole Report with an unstyled 'Application error' (the production outage 2026-06-09)"* (`WorkflowReportPage.tsx:52-60`). 
- This is the classic single-source-of-truth gap: the engine's type system guarantees are **discarded at the API/JSON boundary**, the report re-invents a weaker shadow type, and the gap manifested as a P0 unstyled-crash in prod. The defensive `asArray` is a correct band-aid but it treats the symptom; the contract is still un-unified. Until the route serializes a *validated* shape (Zod parse at the boundary) that the report imports rather than re-declares, every new artifact field is a fresh crash surface.

### 2.3 RISK (MEDIUM) — Mega-components
- `WorkflowReportPage.tsx` is **~2300+ lines** (a single file holding ~15 section sub-components: Insights, Variance/Variants, Timestudy, Bottlenecks, Drift, Composed Agents, Skill Library, Integrations, Roadmap — visible at `:990,1118,1215,1707,1944,2270,2390,2472,2534,2589,2701`).
- `app/(app)/dashboard/page.tsx` is **~2369 lines** (`:2369` is the file tail).
These are review-resistant and merge-conflict-prone. The report's per-section functions are already cleanly separable; the dashboard page is harder. Neither is *broken*, but both concentrate risk and slow safe change — and the report's size is exactly why the 2026-06-09 null-array crash hid in plain sight.

### 2.4 RISK (LOW–MEDIUM) — A residual hydration exposure remains
- `components/Footer.tsx:69` renders `{new Date().getFullYear()}` directly in JSX. On a year boundary, server (UTC) and client (local TZ) can disagree → text-content hydration mismatch — the same *class* as the umami crash, on a component present on every page. The smoke gate's `America/New_York` vs `UTC` setup would only catch this near Jan 1. Low probability, but it is a live instance of the exact pattern the codebase otherwise rigorously forbids.

### 2.5 Duplicated-logic watch (LOW)
- The report's `IntelligenceData` mirrors fields the engine already types (2.2). The honesty/determinism comment block ("no Date.now/Math.random… hydration-safe") is repeated across `shapeResolver.ts`, `variantFlowModel.ts`, and the chart components — benign duplication, but it signals the invariant lives in comments + tests rather than in a shared type/lint rule.

---

## 3. Test / quality coverage assessment

**Strong:**
- **Pure engines** — `intelligence-engine` carries dense co-located tests (`intelligenceEngine.test.ts`, `scoringEngine.test.ts`, `clustering/clustering.test.ts`, `divergenceAnalyzer.test.ts`, `phase3.test.ts`, fingerprinter/componentDetector/titleNormalizer tests; ~178 tests per the brief). Determinism here is the best-tested property in the repo.
- **The honesty chokepoint** — `shapeResolver.test.ts` and `variantAdapter.test.ts` lock the diamond-provenance truth table.
- **Dashboard-columns registry** — `registry.test.ts`, `filters.test.ts`, `presets.test.ts`, `persistence.test.ts` give the customization surface a real lock (audit-honesty IFF invariant, migration round-trips).
- **Runtime smoke** — hydration + canvas + analysis smoke specs are well-designed and reproduce the real failure mode.

**Thin / exposed:**
- **The report itself.** `WorkflowReportPage.tsx` (~2300 LOC, the file that crashed prod) has **no co-located unit test** (no `WorkflowReportPage.test.tsx` in `components/detail/`). Its derivation helpers are partially covered via `reportEvidence`/`reportScorecard`/`reportVerdict` modules, but the malformed-artifact defense (`asArray` on null/non-array intelligence) — the exact 2026-06-09 failure — is not directly asserted with a "feed a lossy artifact, assert no throw" test. The smoke gate explicitly notes the seeded sample never hits these shapes (`WorkflowReportPage.tsx:56-57`), so smoke would not have caught it either.
- **The dashboard page** (~2369 LOC) relies on `dashboard-v2` component tests rather than a page-level integration test.
- **E2E breadth vs depth.** The smoke gate covers ~5 public routes + 4 canvas modes + analysis. It does NOT exercise the Report view with realistic *multi-run, partially-populated* intelligence artifacts — the precise data shape that broke prod. There is a canvas hydration gate but no **report hydration gate** with a deliberately lossy fixture.
- **Coverage of the deploy path itself** is zero browser-level (see 2.1).

---

## 4. Determinism + hydration-safety posture

**Determinism: ROBUST.** The pure-engine layer and the render adapters (`shapeResolver`, `variantFlowModel`, view-model adapters) are deterministic by explicit contract and enforced by tests. No raw `Date.now()`/`Math.random()` in layout math. `exactOptionalPropertyTypes` + strict TS reduce the "optional field surprises" class. This is a genuine, defensible strength and the core of the product's evidence-linked positioning.

**Hydration-safety: MUCH IMPROVED, NOT FULLY CLOSED.**
- The *known* root cause (umami build/runtime env asymmetry) is fixed two ways: the UmamiAnalytics component is loaded only in `useEffect` (per `hydration.smoke.spec.ts:46`), and the deploy build passes the vars as build-args (`deploy.yml:72-77`). 
- The smoke gates are the right design and reproduce the exact failure mode (TZ divergence + static/dynamic route distinction + canvas ELK-in-`useEffect` rule).
- **Remaining exposure:** (a) the gates are not enforced pre-deploy in CI (2.1); (b) `Footer.tsx:69` `new Date().getFullYear()` is a live year-boundary mismatch instance (2.4); (c) the report's lossy-artifact crash class (2.2) is a hydration-adjacent runtime crash that the smoke gate cannot see because it runs against a "clean" seeded sample. So the posture is "the one crash we suffered is fixed and gated, but the *general class* (boundary type erosion + per-page date rendering) is not yet structurally eliminated."

---

## 5. Overall grade + top 5 engineering priorities

### Grade: **B (B / B+ on the engine + determinism core; pulled down to B by CI gate wiring + the un-unified report contract)**

Rationale: The deterministic core, the honesty chokepoint, `exactOptionalPropertyTypes`, near-zero inline debt, and the well-built smoke gate are A-grade engineering. Two things hold it at B: (1) the runtime gate that exists is **not in the deploy pipeline**, so the codebase's own #1 guardrail is unenforced; (2) the report's lossy private contract — which caused an actual P0 outage — is patched, not resolved. Neither is hard to close; both are high-leverage.

### Top 5 priorities (ordered)

1. **Wire the smoke gate into the deploy pipeline (highest leverage).** Add a job between `quality-gate` and `build-and-push` in `deploy.yml` that runs `playwright.smoke.config.ts` against a production build, OR gate deploy on a staging smoke pass. This converts the existing, already-written gate from "documentation" into the validation-of-record the retro mandated. Add a deliberately-lossy report fixture to the gate so the 2026-06-09 class is covered, not just the umami class.

2. **Unify the R-E contract (resolve, don't defend).** Replace the report's private all-optional `IntelligenceData` (`WorkflowReportPage.tsx:240-302`) with a single shared, Zod-validated boundary type derived from the engine's `PortfolioIntelligence`. Parse-and-coerce once at the route/serialization layer so the report consumes a guaranteed shape; keep `asArray` only as defense-in-depth. This eliminates the recurring crash surface at its source.

3. **Decompose the two mega-components.** Extract `WorkflowReportPage.tsx`'s ~15 section functions into their own files (they are already pure and separable) and break `dashboard/page.tsx` (~2369 LOC) into composed sections. Smaller files make the null-array class reviewable and add natural seams for unit tests.

4. **Close the residual hydration instances + add a report hydration gate.** Fix `Footer.tsx:69` (render the year from a build-time constant or a `suppressHydrationWarning`/`useEffect` pattern). Add a `report.smoke.spec.ts` mirroring the canvas gate, seeded with a multi-run + partially-null intelligence artifact.

5. **Extend the gated-CI discipline to a11y + perf (the next maturity step).** `@axe-core/playwright` is already a dependency and used in dashboard a11y specs; promote an axe ratchet + a canvas/report render-budget check into the same enforced gate so accessibility and performance regressions are caught with the same rigor now applied to hydration.

---

## Appendix — key file references

| Concern | File:line |
|---|---|
| Engine determinism contract | `packages/intelligence-engine/src/intelligenceEngine.ts:9-14,68` |
| Canonical engine type | `packages/intelligence-engine/src/types.ts:342-354` |
| Honesty chokepoint (diamond truth table) | `apps/web-app/src/components/workflow-view/adapters/shapeResolver.ts:43-58` |
| Honest variant labels / determinism | `apps/web-app/src/lib/variantFlowModel.ts:9-21` |
| Lossy report contract | `apps/web-app/src/components/detail/WorkflowReportPage.tsx:240-302` |
| Outage-naming defensive coercion | `apps/web-app/src/components/detail/WorkflowReportPage.tsx:52-60` |
| Smoke gate config (TZ/env asymmetry) | `apps/web-app/playwright.smoke.config.ts:36,69-91` |
| Hydration smoke spec | `apps/web-app/e2e/smoke/hydration.smoke.spec.ts` |
| Canvas smoke spec | `apps/web-app/e2e/smoke/canvas.smoke.spec.ts` |
| Deploy pipeline (no smoke gate) | `.github/workflows/deploy.yml:40-44,72-77,79-93` |
| Production crisis retro + guardrails | `docs/meta/SESSION_RETRO_AND_GUARDRAILS_001.md:10,22,25` |
| Strict TS | `tsconfig.base.json:5` |
| Residual hydration instance | `apps/web-app/src/components/Footer.tsx:69` |
| Test totals | `docs/meta/MR_019_META_REVIEW.md:56,552` |
