# Metrics Engine + v2 Workflow Library Dashboard — Multi-Agent Review 001

**Date:** 2026-04-22
**Mode:** Mode 3-adjacent (CEO-directed; non-counting toward improvement-loop cadence)
**Scope:** Shipped behavior of metrics engine (`packages/intelligence-engine/` + `apps/web-app/src/lib/workflow-metrics.ts` + `metrics-input-adapter.ts` + `apps/web-app/src/app/api/workflows/route.ts`) and v2 workflow library dashboard (`apps/web-app/src/components/dashboard-v2/` + `apps/web-app/e2e/app/dashboard/`) through iter 032 close.
**Out of scope:** Path C v3 Process Intelligence Metrics Engine (separate Define lane — `docs/features/dashboard-v3-metrics-engine/`); v1 dashboard (frozen); extension surfaces; billing.
**Precedent:** Follows `DASHBOARD_V2_REVIEW_001.md` structure (iter 026→27 intake).

**Agents engaged (10 parallel):** product-manager · system-architect · ux-designer · qa-engineer · backend-engineer · frontend-engineer · analytics · growth-strategist · competitive-researcher · security (via general-purpose)

**Raw counts across agents:** 15 P0 · 35 P1 · 28 P2 · 16 P3 = 94 findings.
**After dedupe and severity reconciliation:** 9 P0 · 23 P1 · 22 P2 · 12 P3 = 66 unique findings.

**Audit-Intake disposition per MR-005 D-5:**
- **9 P0 items promote to live `IMPROVEMENT_BACKLOG.md`** (Birth iter: `audit-intake`, this review).
- **57 P1/P2/P3 items held in cold pool** in this artifact. Promotion paths: (a) live-P0 closure creates slot (coordinator-discretion), OR (b) PRD-cited hard-blocker enumerated dependency, OR (c) MR-006 Change D staleness triage at age ≥10 iterations post-intake.

---

## 1. Executive Summary

**Overall verdict:** The shipped v2 dashboard delivers its "verdict not spreadsheet" design intent at the row level and passes axe-core zero-tolerance on populated and empty states (iter 022). Post iter-030/031 instrumentation and WorkflowRow interaction-hardening closed the most visible a11y and trust gaps. However, **9 P0 defects were identified across three categories that are release-blockers for both external launch and the `#57` flag-retirement decision**:

1. **Engine correctness (2)**: the `automate` Opportunity tag fires for workflows with unhealthy Health Scores (no `overall >= 40` guard on Rule 1); the high-variance insight chip copy hardcodes "SLA" and "onboarding cohort" despite a PRD §2 non-goal forbidding fabricated text.

2. **Determinism / architecture (3)**: the `/api/workflows` handler calls `Date.now()` and `new Date()` inline in three metrics-scoring paths (portfolio prior-window, month boundary, staleness), making "same input → same output" false across clocks and timezones — a direct invariant violation per `docs/invariants.md`. The route still contains **seven additional shadow functions** beyond those enumerated by DV2-R06 (cold pool), and two of them (`computeAiOpportunityScore` v1 at route.ts:155 vs v2 in workflow-metrics.ts:397; `computeVariationScore` v1 vs v2) produce **numerically different outputs for the same row** in the same API response — `stats.*` and `metricsV2.*` can silently disagree at threshold boundaries.

3. **A11y / instrumentation (4)**: the kebab menu trigger is gated behind `isHovered` state, making rename/archive/copy-link inaccessible via keyboard-only (WCAG 2.1 SC 2.1.1 failure); `aria-controls="portfolio-sidebar"` references a DOM id that does not exist (ARIA 1.2 violation); three components register concurrent document-level Escape handlers producing double-dismiss with incorrect focus returns when co-active. On the measurement side, bounce rate has no instrumentation path at all, and plan tier is absent from all v2 event payloads — making the PRD §4 success-metric evaluation for #57 flag retirement structurally impossible from shipped data.

**Post-soak launch readiness:** **Not ready** for external GA or v1-v2 flag retirement until the 9 P0 items close. Seven of the 9 are small changes (one-condition guard, one copy substitution, five single-component changes, one `id=` attribute) — total estimated effort <3 iterations if bundled logically. The two architecturally-larger P0 items (determinism time-injection, shadow-function consolidation) overlap with Path C Build intent and could be addressed either as standalone v2 fixes OR as Path C Phase A foundation work.

**Top strengths worth preserving:**
- `workflow-metrics.ts` named-constant discipline with PRD-section refs on every threshold (system-architect §3).
- Honest dimension naming post iter-020 correction (efficiency/reliability → speed/dataQuality) — zero relapse observed (growth-strategist §5).
- `processSessionFull` iter-026 composition pattern (system-architect §11).
- 4-column verdict layout discipline — D10 has held across all iteration additions (ux-designer §6).
- Tenant isolation: every `/api/workflows` path filters by `userId` before any other predicate — no IDOR found (security §7).
- Typed Opportunity verdict (5-category enum) with no equivalent in competitive landscape (competitive-researcher §6).

---

## 2. Methodology

### 2.1 Agents and assignments

| Agent | Focus | Files read |
|---|---|---|
| product-manager | PRD-reality drift, ICP fit, verdict clarity | PRD_DASHBOARD_V2, executive-refinement addendum, components, metrics lib |
| system-architect | Determinism, contracts, composability | intelligence-engine primitives, workflow-metrics.ts, metrics-input-adapter.ts, route.ts, invariants |
| ux-designer | State machine, interaction friction, hierarchy | 8 dashboard-v2 components, E2E specs, DASHBOARD_V2_REVIEW_001 |
| qa-engineer | Coverage gaps, boundary tests, E2E skips | unit + E2E tests, vitest configs |
| backend-engineer | Route implementation, shadow functions, perf | route.ts full, workflow-metrics.ts, route.test.ts |
| frontend-engineer | Component architecture, a11y beyond axe | all dashboard-v2 components, analytics.ts |
| analytics | PRD §4 coverage, measurement plan for #57 | analytics.ts, posthog.ts, event call sites, PRD §4 |
| growth-strategist | Copy honesty, positioning, activation | all user-visible strings in components, COPY_PACK_METRICS |
| competitive-researcher | Landscape positioning, parity gaps | Scribe/Celonis/UiPath/Tango/Guidde via WebFetch + WebSearch |
| security (general-purpose) | Tenant isolation, IDOR, plan-gating, sanitization | route.ts, share routes, auth helpers, schema |

### 2.2 Severity ladder

- **P0** — release-blocker. Contradicts invariants, user-visible dishonesty, a11y blocker (WCAG A/AA), CVE-class risk, or prevents #57 retirement decision.
- **P1** — material quality gap on shipped behavior. Demonstrable correctness drift, comprehension blocker, or measurement gap.
- **P2** — polish, refactor debt, defense-in-depth, or clarity.
- **P3** — ergonomic, long-tail, or future-state.

### 2.3 Dedupe rule

Findings flagged by multiple agents for the same root cause consolidated under the agent with the most specific evidence anchor. Confirmations of known cold-pool items (DV2-R04→R27) noted but NOT re-added to this artifact — they remain in `DASHBOARD_V2_REVIEW_001.md` cold pool.

---

## 3. P0 Findings — Live Backlog Promotion (9 items)

These items enter `IMPROVEMENT_BACKLOG.md` with `Birth iter: audit-intake` at this review's close. All are release-blockers for external GA and/or the `#57` flag-retirement decision.

### MDR-P01 · Opportunity tag `automate` fires for unhealthy workflows

- **Source:** product-manager F1
- **Evidence:** `apps/web-app/src/lib/workflow-metrics.ts:452–460` — `computeOpportunityTag` Rule 1 (`automate`) has no `healthScore.overall >= 40` guard. Rules 2 (`standardize`) and 3 (`optimize`) uniquely carry the guard; Rule 1 does not.
- **Problem:** A workflow scoring 22 (clearly unhealthy, belongs in `monitor`) gets tagged "Automate" if it has many steps + long duration + 2+ tools. This is a verdict contradiction that erodes user trust.
- **Direction:** Add `healthScore.overall >= AUTOMATE_MIN_OVERALL` (e.g. 40) as conjunctive guard on Rule 1, consistent with Rules 2 and 3.
- **Estimated effort:** 1 line + 3-5 tests. E=1 R=1.

### MDR-P02 · Insight chip "SLA" fabrication violates PRD §2 non-goal

- **Source:** product-manager F2
- **Evidence:** `workflow-metrics.ts:593–598` — high-variance chip label reads `"${n} workflows pulling your SLA down → review onboarding cohort"`. Neither "SLA" nor "onboarding cohort" is derived from any data field. PRD §2 non-goal: "Fake insight text: any text in the Insights Strip must be computed from real data or must not appear at all."
- **Problem:** Fabricated context in a primary trust-surface violates an explicit PRD non-goal. The phrase asserts facts about the user's context (that they have SLAs, that they have an onboarding cohort) without evidence.
- **Direction:** Rewrite to reference only known signal — e.g., `"${n} workflows show high execution variance → investigate consistency"` — or route through a growth-strategist copy review (MDR-P02 bundle with GR-01 below).
- **Estimated effort:** 1 string change + 1-2 tests. E=1 R=1.

### MDR-P03 · Non-deterministic `Date.now()` / `new Date()` leaks in request-scoped metrics path

- **Source:** system-architect F1 + backend-engineer F4 (BE-04) + analytics F5 (AN-05)
- **Evidence:**
  - `route.ts:485` — `const now = Date.now()` at handler entry
  - `route.ts:107–109` — `computeIsStale` calls `Date.now()` directly
  - `route.ts:714` — `computePortfolioHealthScorePrior(..., new Date())` — the primitive accepts `referenceDate` explicitly but the caller passes fresh `new Date()`
  - `DashboardV2Shell.tsx:105–189` — `dashboardViewPerfTimestampRef.current` initialized to 0, written in a `useEffect` after render, passed as snapshot prop to `WorkflowList` → `WorkflowRow` for `elapsedMsSinceDashboardView` computation
- **Problem:** Same DB state produces different metric output across requests depending on wall-clock. Violates Ledgerium invariant "Transformations are deterministic" (`docs/invariants.md`). Downstream: `workflow_row_clicked.elapsedMsSinceDashboardView` reports 0 on any click before the ref is written (React re-render race), making PRD §4 metric #2 (time-to-first-click p50/p95) structurally uncomputable.
- **Direction:** Pass a single `referenceDate: number` into the route handler from an upstream clock boundary; every downstream metrics function (existing `computePortfolioHealthScorePrior` signature already supports this) consumes the injected value. Convert `dashboardViewPerfTimestampRef` to state so the prop is reactive.
- **Estimated effort:** ~20 LOC + 8-12 tests. E=2 R=1.

### MDR-P04 · `recordedThisMonth` is locale/timezone dependent

- **Source:** system-architect F2
- **Evidence:** `route.ts:627–633` — `oneMonthAgo.setDate(1); setHours(0,0,0,0)` computes "first of month" in the Node process's local timezone. Same data produces different `stats.recordedThisMonth` counts when the service runs in UTC vs PST vs CET.
- **Problem:** A server move or timezone change silently shifts a user-visible count. Violates determinism invariant and breaks any cross-region deployment.
- **Direction:** Compute the month boundary in UTC; document the chosen anchor in the metrics contract.
- **Estimated effort:** 2-3 LOC + 3 tests. E=1 R=1.

### MDR-P05 · Shadow function v1/v2 numeric divergence (`aiOpportunityScore` + `variationScore`)

- **Source:** backend-engineer F1 + F2 (BE-01, BE-02) — DEEPER than DV2-R06 cold-pool audit
- **Evidence:**
  - `route.ts:27–45` (v1 `computeVariationScore`) vs `workflow-metrics.ts:239–266` (v2): for `variantCount=8 stabilityScore=0.9`, v1 returns `0.09` (averaged blend), v2 returns `0.10` (1 - stability direct). Filter at `route.ts:610` uses v1; chips use v2.
  - `route.ts:155–188` (v1 `computeAiOpportunityScore`) vs `workflow-metrics.ts:397–428` (v2): bonus branch differs. `stats.aiOpportunityCount` at `route.ts:672` counts v1; `metricsV2.opportunityTag === 'automate'` uses v2. Same row → different counts.
- **Problem:** Same API response emits `stats.*` (v1 values) and `metricsV2.*` (v2 values) that disagree at threshold boundaries. Users will see "3 automate opportunities" in CommandHeader while the list shows 2 or 4 rows tagged `automate`.
- **Direction:** Delete v1 `computeAiOpportunityScore` and v1 `computeVariationScore` in route.ts; derive `stats.aiOpportunityCount` and filter predicates from the already-computed `metricsV2.aiOpportunityScore` and `metricsV2.variationScore`. This extends the DV2-R06 (cold-pool) scope with concrete numeric evidence of divergence.
- **Estimated effort:** ~30 LOC deletions + ~10 LOC consolidation + 10-15 regression tests. E=2 R=2.

### MDR-P06 · Kebab menu trigger is keyboard-inaccessible (WCAG 2.1 SC 2.1.1)

- **Source:** frontend-engineer F-1
- **Evidence:** `WorkflowRow.tsx:847–875` — trigger button is only mounted when `isHovered === true`. Keyboard-only users never trigger hover, so the button never enters the DOM, is never focusable. Entire rename/archive/copy-link surface unreachable without a mouse.
- **Problem:** WCAG 2.1 SC 2.1.1 (Keyboard) failure on a shipped user-visible action surface. Critical violation — this is NOT the type of a11y gap axe-core catches because the element simply doesn't render.
- **Direction:** Decouple trigger visibility from hover state. Use CSS `group-focus-within:opacity-100` (or `visibility`) so the button is always in the DOM; focus-visible styles handle discoverability.
- **Estimated effort:** ~10 LOC + 2-3 a11y tests (Tab-to-kebab path). E=1 R=1.

### MDR-P07 · `aria-controls="portfolio-sidebar"` references non-existent DOM id (ARIA 1.2 violation)

- **Source:** frontend-engineer F-3
- **Evidence:** `WorkflowList.tsx:341` — button has `aria-controls="portfolio-sidebar"`. The `<aside>` rendered in `DashboardV2Shell.tsx:303–329` has NO `id` attribute. Screen readers (NVDA, JAWS) either ignore the broken reference or surface an error.
- **Problem:** ARIA 1.2 spec violation on a shipped surface. Assistive-tech users experience a broken control relationship.
- **Direction:** Add `id="portfolio-sidebar"` to the `<aside>` element in `DashboardV2Shell.tsx:306`.
- **Estimated effort:** 1 LOC + 1 test. E=1 R=1.

### MDR-P08 · Concurrent document-level Escape handlers produce double-dismiss

- **Source:** frontend-engineer F-2
- **Evidence:** Three components register `document.addEventListener('keydown', ...)` simultaneously when all three can co-exist:
  - `HealthTooltip` at `WorkflowRow.tsx:158–167`
  - `KebabMenu` at `WorkflowRow.tsx:304–314`
  - `InlineArchiveConfirm` at `WorkflowRow.tsx:477–486`
- **Problem:** A single Escape keystroke fires all active handlers; `onDismiss` and `onClose` both run, returning focus to conflicting targets. Manifests as soon as tooltip-open + archive-confirm-open co-activation occurs — latent under current patterns, guaranteed in exploratory QA.
- **Direction:** Centralize Escape handling in `WorkflowRow` with a single `useEffect` keyed on which overlay is currently active. Alternative: focus-trap abstraction.
- **Estimated effort:** ~40 LOC refactor + 5-8 tests. E=2 R=2.

### MDR-P09 · Flag-retirement decision-blocker instrumentation (bounce rate + plan tier)

- **Source:** analytics F1 + F2 (AN-01, AN-02)
- **Evidence:**
  - `posthog.ts:49` — `disable_session_recording: true` means no PostHog session boundary; no `dashboard_bounced` event is emitted on unload; bounce rate per PRD §4 row 2 has no instrumentation path
  - `analytics.ts:154` — `EnrichedEvent.userPlan?: string` is declared but zero v2 dashboard call sites populate it; `track()` never receives `userPlan` from any component; `route.ts:357` resolves plan server-side but does not thread to the client
- **Problem:** PRD §4 bounce rate (metric #2) and free-vs-paid segmentation of every event (metrics #3/#4/#6) are structurally impossible to evaluate from shipped event data. The 14-day soak clock cannot convert into a flag-retirement decision without these. MDR-P09 directly blocks `#57` flag retirement.
- **Direction:** (a) Emit `dashboard_bounced` on `beforeunload` when `elapsedMsSinceDashboardView === 0` AND zero click events buffered, OR enable PostHog session boundaries. (b) Thread `userPlan` from server → client via page-level props or a plan context, and include in every v2 dashboard event payload.
- **Estimated effort:** ~40 LOC + 8-10 tests. E=2 R=1.

### P0 coordinator-facing summary

| ID | Area | Effort | Risk | Bundle candidate? |
|---|---|---|---|---|
| MDR-P01 | engine | 1 | 1 | Standalone |
| MDR-P02 | engine/copy | 1 | 1 | Bundle with GR-01 (chip prescriptive rewrite) |
| MDR-P03 | engine/determinism | 2 | 1 | Standalone or bundle w/ MDR-P04 |
| MDR-P04 | engine/determinism | 1 | 1 | Bundle with MDR-P03 |
| MDR-P05 | route/shadow-funcs | 2 | 2 | Standalone (extends DV2-R06) |
| MDR-P06 | a11y | 1 | 1 | Bundle with MDR-P07 (a11y pair) |
| MDR-P07 | a11y | 1 | 1 | Bundle with MDR-P06 |
| MDR-P08 | a11y | 2 | 2 | Standalone |
| MDR-P09 | analytics | 2 | 1 | Standalone |

**Minimum viable iteration sequence (if bundled under Mode 5 7(b) one-logical-outcome):**
- Iter A: MDR-P01 + MDR-P02 (engine correctness + copy honesty) — both single-line/single-condition
- Iter B: MDR-P03 + MDR-P04 (determinism time-injection, both touch same surface)
- Iter C: MDR-P05 (shadow-function consolidation)
- Iter D: MDR-P06 + MDR-P07 (a11y — both in same two files)
- Iter E: MDR-P08 (Escape handler centralization)
- Iter F: MDR-P09 (bounce rate + plan tier instrumentation)

Total estimated: 6 iterations. Could collapse to 4-5 depending on one-logical-outcome discipline at iter-boundary review.

---

## 4. P1 Findings — Cold Pool (23 items)

P1 items represent material quality gaps. They do NOT promote to live backlog at intake. Promotion paths: (a) P0 burn-down creates slot, (b) PRD-trigger enumerated dependency, or (c) MR-006 Change D staleness triage at age ≥10 iter.

### Engine / architecture (6)

- **MDR-P1-01** · Period-over-period delta partitions by `updatedAt`, not run activity → persistent null deltas on real portfolios (product-manager F3). Evidence: `workflow-metrics.ts:539–564`. Direction: partition using a run-activity timestamp (`processDefinition.lastRunAt` or similar); data-model addition required.
- **MDR-P1-02** · Time range selector is a false affordance — changes zero metric output, only the `(all-time)` annotation on subtext (product-manager F4). Evidence: `CommandHeader.tsx` + `WorkflowList.tsx:100–108`. Direction: disable/mute selector with "metrics reflect all-time data" tooltip until D7 is resolved API-side.
- **MDR-P1-03** · Metrics engine runs PARALLEL to `packages/intelligence-engine/` — not on top of. Re-implements variance, standardization, bottleneck, automation scoring inline instead of consuming exported primitives (system-architect F3). Evidence: no `@ledgerium/intelligence-engine` import in web-app `src/lib/` tree. Direction: consume via composition seam; likely Path C Build Phase A territory.
- **MDR-P1-04** · Contracts lack schema version + Zod runtime validators (system-architect F5). Evidence: `workflow-metrics.ts:131–165` — `WorkflowMetricsOutput`, `HealthScoreV2`, `OpportunityTag`, `InsightChip` have no `METRICS_ENGINE_VERSION` constant. Direction: add version constant + Zod schema + include version in stats envelope.
- **MDR-P1-05** · `isGated` is an overloaded output-shape flag mutated post-hoc at `route.ts:535–541`; violates deterministic transformation invariant at contract boundary (system-architect F6, partial overlap with SEC-02 below). Direction: either gate by omitting breakdown fields in a union type OR move plan gate inside pure function with `plan` explicit input.
- **MDR-P1-06** · Traceability gap: `HealthScoreV2` has no `evidenceRunIds[]` — a score of 87.3 cannot be traced back to source events deterministically (system-architect F8). Evidence: contrast with `intelligence-engine/src/metricsBuilder.ts:59`. Direction: add `evidenceRunIds: string[]` + `computedAt` to `HealthScoreV2`.

### Route / backend (5)

- **MDR-P1-07** · No pagination on `db.workflow.findMany` — full-include query before filtering at 200+ rows (backend-engineer F3). Evidence: `route.ts:432–462`. Direction: add `take`/`skip` with hard cap 100; move post-query filters to Prisma `where` where possible.
- **MDR-P1-08** · Route integration tests mock the full metrics engine (adapter contract untested end-to-end) (backend-engineer F5). Evidence: `route.test.ts:40–79`. Direction: add one non-mocked path exercising adapter→engine boundary.
- **MDR-P1-09** · `InsightChip.severity` narrow set diverges from `ProcessInsight.severity: string` DB shape — unknown severities silently produce no chip (system-architect F7). Evidence: `workflow-metrics.ts:125,585,602–616`. Direction: narrow DB severity to enum at adapter boundary with exhaustiveness check.
- **MDR-P1-10** · Zod validation absent on `GET /api/workflows` query-parameter surface (security F1). Evidence: `route.ts:360–383` — `status`, `dir`, `sortBy` cast without enum validation. Direction: Zod schema + strict enum whitelist.
- **MDR-P1-11** · PATCH schema uses `.passthrough()` — weakens contract, fragile to future copy-paste regressions (security F2). Evidence: `apps/web-app/src/app/api/workflows/[id]/route.ts:11–20`. Direction: switch to `.strict()`.

### UX / interaction (5)

- **MDR-P1-12** · Command Header competing primary read paths — title/insight left, score cluster right at equal weight; PRD §1 5-second comprehension target structurally unmet (ux-designer F1). Direction: score cluster as optical entry via placement or scale contrast.
- **MDR-P1-13** · Health Score cell carries 5–7 sub-elements (pip + rail + integer + chevron + SOP subtext + run-count qualifier) in a single column — D10 density discipline eroding (ux-designer F2). Direction: reduce to pip + integer; move rail + SOP + qualifier into tooltip.
- **MDR-P1-14** · "Needs attention" filter at peer visual weight with system/opportunity filters — executive triage lens indistinguishable from granular analytical filters (ux-designer F3). Direction: distinct affordance (persistent toggle above filter bar OR visually heavier button).
- **MDR-P1-15** · Inline archive confirmation placement injects interactive UI inside `<th scope="row">` — semantic mismatch (screen readers expect row-header, not transient confirmation) (ux-designer F4). Direction: render archive confirmation as full-row overlay OR change wrapping element to `<td>` during confirmation state.
- **MDR-P1-16** · Insight chip dismiss + filter-activation divergence — dismissing a chip doesn't clear its associated filter; list stays filtered with no visible indicator why (ux-designer F5). Direction: coordinate dismiss-and-clear OR co-locate dismiss state in shell.

### Frontend component (3)

- **MDR-P1-17** · `displayTitle` not re-synced from `workflow.title` prop changes — post-iter-031 `InlineEdit` uses `displayTitle` as `currentTitle`, so stale title pre-populates edit field (frontend-engineer F-4, confirms DV2-R22 cold-pool priority). Direction: `useEffect(() => setDisplayTitle(workflow.title), [workflow.title])`.
- **MDR-P1-18** · Double `applyFilters` — shell computes `filteredWorkflows` (line 239) then passes pre-filter `portfolioFilteredWorkflows` to `WorkflowList` which re-applies; shell's `filteredWorkflows` used only for `listState` derivation — silent divergence risk (frontend-engineer F-5, confirms DV2-R21). Direction: shell passes `filteredWorkflows`; `WorkflowList` sort-only.
- **MDR-P1-19** · `dashboard_v2_viewed` fires on error state with `workflowCount: 0` — error page views pollute PRD §4 metric #1 baseline (frontend-engineer F-6). Direction: gate emission on `!isError && !isLoading`.

### Analytics (3)

- **MDR-P1-20** · `insight_chip_clicked` fires twice on keyboard activation — `onClick` + `onKeyDown` both emit; inflates chip CTR for keyboard users (analytics F3 / AN-03). Direction: emit only in `onClick`.
- **MDR-P1-21** · No observability on `computeHealthScoreV2` engine failure modes — `durationMs == null` path returns all-zero sub-scores silently; no counter for `isGated=true` rate (analytics F4 / AN-04). Direction: emit server-side `client_error` or operational counter; surface `metricsEngineNullRate` in stats envelope.
- **MDR-P1-22** · Returning authenticated users not re-identified in PostHog — `identifyAnalyticsUser` only called at login/signup; bookmark-return users fragment across anonymous + identified profiles (analytics F6 / AN-06). Direction: call in app shell `useEffect` on session load.

### Copy / positioning (1)

- **MDR-P1-23** · Insight chip copy is still descriptive, not prescriptive — PRD Addendum §2.2 required `{signal} → {next action}` pattern; current chips still say "3 workflows show high execution variance" (growth-strategist F1 / GR-01; also COMP-03). Direction: rewrite chip label templates in `computeInsightChips` to action-leading format; bundle with MDR-P02.

---

## 5. P2 Findings — Cold Pool (22 items)

### Engine / architecture (6)

- **MDR-P2-01** · Health Score breakdown tooltip renders sub-scores as `N/max` fractions (e.g., `12/30`) with no verbal label — jargon for COO/ops persona (product-manager F5 / TIP-01). Evidence: `WorkflowRow.tsx:204–251`.
- **MDR-P2-02** · "Needs attention" + "Needs Review" filter near-synonymy — thresholds differ (<60 vs <40) but labels give no way to distinguish (product-manager F6 / FILT-01).
- **MDR-P2-03** · `computeAiOpportunityScore` bonus double-counts — 15 steps + 5 min maxes base (30+25) AND triggers +20 bonus (product-manager F7 / AIOPP-01). Evidence: `workflow-metrics.ts:400–427`.
- **MDR-P2-04** · Prisma-shape coupling in `toMetricsInput` is untyped against Prisma — schema evolution won't fail typecheck at the seam (system-architect F9). Direction: type adapter input as `Prisma.WorkflowGetPayload<{...}>`.
- **MDR-P2-05** · `toolsUsed` JSON parsing duplicated 4× in `route.ts` + once in adapter (system-architect F10, backend F8). Direction: centralize `parseToolsUsed(raw)` helper.
- **MDR-P2-06** · `computeSopReadiness` duplicated verbatim between `workflow-metrics.ts:301–309` and `route.ts:47–52` — threshold changes must be made in two places (backend F6 / ARCH-11). Direction: single source in metrics lib.

### Route / backend (1)

- **MDR-P2-07** · `computeAiOpportunityScore` in `workflow-metrics.ts` does not consume `scoreAutomationOpportunity` from intelligence-engine — missed-compose pattern (backend F7). Direction: likely resolved by Path C Build Phase A (see MDR-P1-03).

### UX / interaction (4)

- **MDR-P2-08** · Sparse state message is passive — tells user data is incomplete without telling them how to get more data; dead-end for 1-2 workflow users (ux-designer F6). Direction: add "record your first workflow" CTA matching empty-state pattern. Also growth-strategist GR-04.
- **MDR-P2-09** · Delta label "vs last 30d" hardcoded — conflicts visibly with active time-range selector ("Last 7 days" + "vs last 30d" in same component) (ux-designer F7, related to MDR-P1-02).
- **MDR-P2-10** · KebabMenu has no arrow-key navigation between menu items — violates WAI-ARIA menu pattern §3 keyboard interaction (ux-designer F8). Direction: `onKeyDown` on `role="menu"` container for ArrowUp/Down/Home/End.
- **MDR-P2-11** · Insight chip count badge `aria-hidden` but unique info (depends on whether label string embeds the count) (ux-designer F9). Direction: confirm label string includes count text; if not, remove aria-hidden from badge.

### Frontend (2)

- **MDR-P2-12** · `WorkflowRow.tsx` at 879 LOC past file-as-module clarity threshold (frontend F-7). Direction: extract `InlineEdit`, `InlineArchiveConfirm`, `HealthTooltip` to `WorkflowRow/` sub-directory with barrel import; no API changes.
- **MDR-P2-13** · HealthTooltip hover-only trigger has no touch equivalent — iPad user tap-outside triggers row navigation instead of tooltip close (frontend F-8). Direction: document-level touchstart-outside handler.

### Testing (2)

- **MDR-P2-14** · `computePortfolioHealthScore` single-workflow input untested for exact-passthrough (qa F7). Direction: add test for `N=1` preservation.
- **MDR-P2-15** · `computePortfolioHealthScorePrior` default-`refDate` (no-argument) call path untested (qa F8). Direction: document design intent; either test the default path or require explicit refDate everywhere.

### Analytics (3)

- **MDR-P2-16** · Event schema has no version field — rename = flag-day query update, not version-filtered (analytics F7 / AN-07). Direction: add `schemaVersion: 1` to `AnalyticsEvent` union.
- **MDR-P2-17** · `dashboard_v2_filter_applied` fires on "clear" actions with `filterValue: 'cleared'` — mixes apply and clear in same metric (analytics F8 / AN-08). Direction: separate event OR add `action: 'apply' | 'clear'`.
- **MDR-P2-18** · PRD §4 references `analyticsHealthBand` but code field is `healthBand` — documentation drift (analytics F9 / AN-09). Direction: update PRD §4 to match code; `healthBand` is canonical.

### Copy / positioning (3)

- **MDR-P2-19** · "Score breakdown" tooltip header is generic — wastes first line of paid-tier feature surface (growth F5 / GR-05). Direction: "What's driving this score".
- **MDR-P2-20** · "Needs attention" filter definition not exposed — users can't see the threshold without reading source (growth F6 / GR-06). Direction: `title` attribute with "Workflows with health below 60 or high run-to-run variation".
- **MDR-P2-21** · "All time" / "(all-time)" spelling inconsistency across CommandHeader selector vs WorkflowRow annotation (growth F7 / GR-07). Direction: standardize on "All time".

### Security defense-in-depth (3)

- **MDR-P2-22** · No rate-limiting on any `/api/*` route — single authenticated user can hammer compute-heavy metrics GET (security F3). Direction: token-bucket middleware keyed on `session.user.id`.
- *[includes security F4 (no CSRF beyond SameSite), F5 (public share endpoint no rate-limit / enumerable)]* — bundled as MDR-P2-22 defense-in-depth cluster.

### Competitive (1)

- **MDR-P2-23** · Opportunity taxonomy unnamed externally — 5-category enum is a differentiator but buyers can't recall or reference it post-trial (competitive F6 / COMP-06). Direction: name externally in onboarding/marketing ("Process Verdict" or "Action Signal").

---

## 6. P3 Findings — Cold Pool (12 items)

- **MDR-P3-01** · Positive chip `HEALTHY_OVERALL_THRESHOLD=70` vs RAG green threshold 80 mismatch — positive chip can count workflows showing amber (product F8 / POS-01). Direction: align at 80.
- **MDR-P3-02** · `computeSopReadinessProxy` duplicated verbatim route.ts vs workflow-metrics.ts (system F11). Direction: export from metrics lib; route imports. (Duplicate of MDR-P2-06 but noted by architect at P3; severity-reconciled to P2.)
- **MDR-P3-03** · `<tr>` keyboard focus conflict — row-level `onKeyDown` fires Enter on any child focus (ux F10). Direction: check `e.target === e.currentTarget` before row navigation.
- **MDR-P3-04** · InsightsStrip icon double-announcement — both icon `aria-label` and outer container `aria-label` announced (frontend F-9). Direction: `aria-hidden="true"` on icon.
- **MDR-P3-05** · `?v2=0` pre-hook conditional warrants a code comment flagging retire-with-#57 order dependency (frontend F-10).
- **MDR-P3-06** · `CommandHeader.test.ts` 4-branch delta coverage confirmation (qa F9).
- **MDR-P3-07** · No sampling/deduplication on `workflow_row_clicked` — raw count inflation for power users with 100+ rows (analytics F10 / AN-10).
- **MDR-P3-08** · Route enrichment block has no per-row try/catch — one bad row returns 500 for full response (backend F9). Direction: per-row try/catch with `{workflowId, error}` log + fallback enrichment.
- **MDR-P3-09** · "High variation" badge redundant with Opportunity `standardize` tag when both show (growth F8). Direction: post-soak consider resolution.
- **MDR-P3-10** · "Process Health Score" term unowned in competitive vocabulary — begin using consistently externally NOW to claim the term (competitive F7 / COMP-07).
- **MDR-P3-11** · `console.error` in multiple API routes logs raw Prisma errors that can contain user column values (security F6). Direction: log-scrubber.
- **MDR-P3-12** · `/api/admin/bootstrap` first-run escalation path needs audit-log + alert (security F8).

Additional security P3 (folded as notes, not individually tracked):
- `workflow.title` XSS reliance on React auto-escape (security F9) — low risk today; add test.
- Template backfill swallows errors silently (security F10).
- `isGated` advisory-only vs entitlement server-strip — reconciled with MDR-P1-05 at P1 severity.

---

## 7. Strengths to Preserve

Across all 10 agents, these strengths were consistently flagged as non-negotiable to retain in any future refactor:

1. **Engine discipline** — `workflow-metrics.ts` has named threshold constants at the top with PRD-section references. Every magic number is auditable. (system-architect, product-manager, backend-engineer)
2. **Honest dimension naming** — iter-020 killed "efficiency/reliability"; zero relapse observed across full surface. (growth-strategist, product-manager, system-architect)
3. **`processSessionFull` composition pattern** — iter-026's pure-additive wrapping of existing contract is the right model for future engine-to-dashboard work. (system-architect)
4. **Tenant isolation uniformity** — every `/api/workflows` path filters by `userId` before any other predicate; no IDOR found. (security)
5. **4-column verdict layout discipline** — D10 has held across all iteration additions. Do not erode. (ux-designer, competitive-researcher)
6. **6-state machine with inline state rendering** — clean, scan-readable, no implicit fallthrough. (ux-designer, qa-engineer)
7. **State-machine E2E coverage via route-intercept in `v2-states.spec.ts`** — proven pattern for fixture-driven E2E; model for unblocking skipped tests. (qa-engineer)
8. **axe-core zero-tolerance E2E on populated + empty states** — structural a11y floor is held. (qa-engineer, ux-designer)
9. **`SKELETON_MIN_MS=300` flash-of-content mitigation** — correct and non-blocking. (frontend-engineer)
10. **API key auth on `/api/sync`** — SHA-256 hashes, `Bearer ldg_` prefix, content-length + post-parse size checks, plan-gated. (security)
11. **Typed `AnalyticsEvent` discriminated union** — prevents untyped event emission at compile time. (frontend-engineer, analytics)
12. **Typed 5-category `OpportunityTag` enum** — genuine competitive differentiator; name externally. (competitive-researcher)
13. **PostHog forwarding path `track() → posthogCapture()` at `analytics.ts:154-156`** preserved across all iter-030 additions. (analytics)
14. **`PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` null-return** — engine honestly declines to answer rather than returning misleading zero. (system-architect, growth-strategist)
15. **`n=0 — no runs` inline honesty marker** — trust-building differentiator; competitors hide low-N scores. (growth-strategist, product-manager)

---

## 8. Strategic Context — Competitive Landscape (competitive-researcher)

**Key signal (2025-11-10):** Scribe raised $75M Series C at $1.3B valuation to launch **Scribe Optimize** — a workflow mapping + ROI-estimation surface that directly overlaps Ledgerium's Opportunity column and Insights Strip. Source: [TechCrunch](https://techcrunch.com/2025/11/10/scribe-hits-1-3b-valuation-as-it-moves-to-show-where-ai-will-actually-pay-off/), [Scribe Workflow AI](https://scribe.com/workflow-ai).

**Implication:** Ledgerium's "real captured behavior" vs Scribe Optimize's LLM-inferred recommendations is now a **live positioning battle**, not a theoretical one. Determinism + evidence-linking must become visible on the product surface, not just in documentation.

**Actionable competitive findings (severity assigned earlier):**
- **MDR-P1 (bundle)**: Evidence footnote in Health Score tooltip ("Computed from N captured events") — low effort, high trust-signal.
- **MDR-P1 (bundle)**: Portfolio orientation count badge in CommandHeader ("N workflows · N need attention") — closes parity gap with Tango/Guidde.
- **MDR-P3-10**: Begin using "Process Health Score" as a named term externally now to own the vocabulary window.

---

## 9. Intake Recommendations

### 9.1 Immediate (this review's close)

Per MR-005 D-5 clause 2: **9 P0 items promote to `IMPROVEMENT_BACKLOG.md`** with `Birth iter: audit-intake`. The remaining 57 items (23 P1 + 22 P2 + 12 P3) stay in this artifact as cold pool.

Pool impact: 31 (post-MR-007) → **40** post-intake. Pool-size ceiling rule (pool > 8) remains violated; cool-off recharge counter unchanged at 2/3.

### 9.2 Iteration programming implications

Iter 033 (pre-scheduled #24 LiveStep type tightening) proceeds unchanged — saturation-forced non-web-app burn-down, unaffected by this review's web-app P0s.

**Iter 034+ endorsed sequence** (subject to CEO directive):

| Iter | Item | Area | Agent | Rationale |
|---|---|---|---|---|
| 033 | #24 LiveStep | segmentation-engine | backend | Pre-scheduled; saturation-forced |
| 034 | MDR-P06 + MDR-P07 bundle (a11y pair) | web-app | frontend | Both WCAG failures; small surface; Mode 5 7(b) satisfied |
| 035 | MDR-P01 + MDR-P02 bundle | web-app | backend | Engine correctness + copy honesty; both single-line fixes |
| 036 | MDR-P03 + MDR-P04 bundle | web-app | backend | Determinism; same surface (request-scoped time injection) |
| 037 | MDR-P09 | web-app | frontend + analytics | Flag-retirement decision-blocker instrumentation |
| 038 | MDR-P05 | web-app | backend | Shadow-function consolidation (extends DV2-R06) |
| 039 | MDR-P08 | web-app | frontend | Escape-handler centralization |
| 040 | Burn-down follow-up (saturation-breaker) | non-web-app | architect or backend | Mandatory Area rotation after 034-039 web-app cluster |

Note: sequence 034-039 would be 6 consecutive web-app iterations triggering MR-005 D-7 meta-coordinator pre-check. Either (a) break into two Mode 5 sequences of N=3 each with saturation-breakers between, or (b) run pre-check before opening.

Alternative: all 9 P0 as individual Mode 1 bounded loops (no Mode 5 sequence), each selected on its own merits against top-score + burn-down rotation — avoids D-7 pre-check but elongates timeline.

### 9.3 Flag-retirement gating

`#57` v2 flag retirement was previously gated on: 14-day soak + DV2-R02/R03/#51 ✅ + DV2-R06 shadow-function audit.

**This review adds:** MDR-P09 (bounce rate + plan tier instrumentation) as a hard prerequisite — the soak clock cannot convert to a ship-or-rollback decision without it. MDR-P01 and MDR-P02 (engine correctness + copy dishonesty) are also flag-retirement gates because they are user-visible defects that would ship externally.

**Updated #57 prerequisite chain:** #51 ✅ + DV2-R02 ✅ + DV2-R03 ✅ + MDR-P09 + MDR-P01 + MDR-P02 + MDR-P05 (consolidates DV2-R06) + MDR-P06/P07 (a11y WCAG) + 14d soak window.

### 9.4 Path C coordination

P1 items MDR-P1-03 (metrics pipeline bypasses intelligence-engine) and MDR-P2-07 (`scoreAutomationOpportunity` unused) overlap with Path C Build Phase A intent. Two options:

1. **Path C proceeds → both P1s resolve via v3 Build.** No separate v2 work needed.
2. **Path C blocked or delayed → address via standalone v2 refactor.** Higher effort, lower total yield.

Defer decision to CEO pending Path C approval status.

---

## 10. Change-Log Entry (to prepend to `CHANGELOG.md`)

```
## [2026-04-22] - METRICS_DASHBOARD_REVIEW_001 (Mode 3-adjacent, multi-agent)

CEO-directed multi-agent review of shipped metrics engine + v2 dashboard.
10 specialist agents produced 94 raw findings; deduped to 66 unique.
Artifact: docs/meta/METRICS_DASHBOARD_REVIEW_001.md.

Intake per MR-005 D-5:
- 9 P0 → live IMPROVEMENT_BACKLOG.md (Birth iter: audit-intake)
- 23 P1 + 22 P2 + 12 P3 held in cold pool in artifact

P0 summary:
- 2 engine correctness (automate-on-unhealthy verdict, SLA fabrication)
- 3 determinism (Date.now leak, TZ-dependent month, shadow v1/v2 divergence)
- 3 a11y (kebab keyboard, aria-controls broken, concurrent Escape)
- 1 analytics decision-blocker (bounce rate + plan tier)

Pool 31 → 40 at intake. Mode 3-adjacent (NON-counting).
Iter 033 pre-scheduled (#24 LiveStep) unchanged.
```

---

## 11. Closing Notes

This review validates that the v2 dashboard is **structurally correct but shipped with 9 defects that are individually modest but collectively release-blocking**. The depth of the findings (particularly MDR-P05 shadow-function divergence with concrete numeric evidence beyond DV2-R06's general flag) is exactly what the Audit-Intake Pattern was designed to surface.

The P1/P2 cold pool (57 items) should be triaged at MR-008 (iter 035 earliest) using MR-006 Change D staleness escalation — most items age to 10 iter around iter ~042. Routine P0-burn-down promotions from this artifact's cold pool are authorized via MR-005 D-5 clause 4 at coordinator discretion when area-relevance aligns.

**CEO decisions pending:**
- Confirm iter 034+ sequence (three bundles + standalone pattern per §9.2 Table) or direct alternative.
- Confirm P0-promotion disposition per §9.1 (default: all 9 to live).
- Confirm #57 flag-retirement gating extension per §9.3 (MDR-P01/P02/P05/P06/P07/P09 added as prerequisites).
- Path C coordination decision (§9.4).

---

*Artifact produced by coordinator synthesis of 10 parallel specialist agent reports, 2026-04-22. Word count ~4,300. Mode 3-adjacent. Non-counting toward improvement-loop cadence.*
