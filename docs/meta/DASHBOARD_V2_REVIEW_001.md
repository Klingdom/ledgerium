# Dashboard v2 Review 001 — Post-Path-B Multi-Lens Audit

**Date:** 2026-04-21
**Mode:** Mode 3-adjacent diagnostic review (NON-counting — does not increment improvement-loop cadence)
**Trigger:** User-directed multi-agent review of the shipped v2 dashboard surface
**Scope:** Path B deliverables (iter 020–024) as shipped and currently live at `/dashboard` default
**Intake pattern:** MR-005 D-5 Audit-Intake — findings classified P0/P1/P2/P3; only P0 promotes to live backlog at intake
**Agents consulted (8, parallel):** `product-manager` · `ux-designer` · `system-architect` · `frontend-engineer` · `backend-engineer` · `qa-engineer` · `analytics` · `growth-strategist`

---

## MR-006 Change D Staleness Triage — 2026-09-16

**Trigger:** This cold pool was last touched 2026-04-30 (~5 months / ~240 commits ago). MR-019 queued its triage as "cannot defer further," MR-020 skipped it, MR-021 rated the pipeline Failing. This pass re-verifies every still-open item against the CURRENT codebase (not the artifact's own prose) per MR-006 Change D staleness escalation.

**Method:** the 8 items already carrying `MR-0NN: DELETED` anchors (R09/R11/R19/R20/R23/R25/R26) and R06 (deleted at MR-008) were left as-is. R01/R02/R03 were promoted and closed iterations 029/031 and are out of scope for this pass (already-closed live rows). Every other item (16 total: R04/R05/R07/R08/R10/R12/R13/R14/R15/R16/R17/R18/R21/R22/R24/R27) was checked against current source with Grep/Read, not trusted from the artifact text.

| Verdict | Count |
|---|---|
| Open before this triage | 16 |
| `shipped` | 2 (R04, R12) |
| `keep-cold` | 7 (R07, R16, R17, R18, R21, R22, R27) |
| `promote` | 5 (R05, R08, R13, R14, R15) — cap applied, all 5 slots used |
| `delete` | 2 (R10, R24 — both duplicates of already-open live backlog rows) |

Full per-item reasoning is inline below, in the existing anchor style.

---

## Executive Summary

v2 is approximately **78% PRD-compliant**, is live as default at `/dashboard` (since iter 022), and is functionally GA behind `?v2=0` escape hatch. However, v2 is **NOT externally-launch-ready** and **NOT flag-retirement-ready (#57)**. Two failure modes dominate:

1. **Unmeasurable.** Every PRD §4 success-metric event is absent from the shipped code. v1-vs-v2 superiority cannot be proven. The 14-day soak window (opened iter 022) is generating zero analytics signal. #51 (already live, score 13) is the #1 remaining priority but is not by itself sufficient — a server-side distribution comparison is also required to close #42.
2. **Two executive-grade UX breaches untracked.** `window.prompt`/`window.confirm` used in WorkflowRow kebab (rename/archive); tooltip with no keyboard Escape (WCAG 2.1 SC 1.4.13 violation). Both independently flagged by UX + FE lenses; neither is in the backlog.

The metrics engine, state machine, a11y scaffolding, and design-token discipline are strong. Backend purity is excellent. Primary debt is concentrated in: (a) measurement instrumentation, (b) v1 shadow functions living in the route (not just `computeHealthScore()`), (c) interactive-path E2E skips for want of seed fixtures, (d) upgrade-CTA conversion story.

---

## Verdict Matrix (8 Lenses)

| Lens | Verdict | Summary |
|---|---|---|
| PRD compliance | **Partial (~78%)** | §5/§7/§8/§9/§10/§14 solid; §4 entirely uninstrumented; EXEC §4.1(a–f) all shipped; §11 seed + Lighthouse CI never delivered; axe-core automated gate absent |
| UX | **Conditional GA** | Scan order + state machine + honest labels + a11y scaffolding strong; `window.prompt` + tooltip-Escape gap + filter-URL-state + no-op create-portfolio button |
| Architecture | **Sound** | Pure engine, clean boundaries, reversible flag-gating; #60 needs arch decision (Option C snapshot-table recommended); duplicate helpers in route.ts are primary #42 risk |
| Frontend | **Mostly solid** | 3 correctness risks — `as`-cast on `portfolioIds`, duplicate `applyFilters`, native-dialog usage; design-token compliance clean; state machine well-factored |
| Backend | **Mostly solid** | Engine fully pure + deterministic; route has `{ data, error, meta }` drift, `Date.now()` leak in v1 path, `oneMonthAgo` window mismatch, integration tests mock the engine away |
| QA | **Conditional GA** | Engine + EXEC §4.1 covered; interactive E2E skipped (seed gap); plan-gating E2E 100% skipped (free-tier user absent); moderate axe violations logged-not-asserted |
| Analytics | **Unready** | Zero v2 events instrumented. PRD §4 baseline was never established. Cannot prove v2 > v1. Hard blocker for #57 retirement and external launch. |
| Growth | **Unready** | Copy has structural bones; upgrade CTA is feature-named not value-led; single buried touchpoint; no what's-new for v2 transition; chip `{signal} → {next action}` contract possibly unimplemented at API layer |

---

## Findings by Severity

### P0 — Release / Launch / Flag-Retirement Blockers

**Per MR-005 D-5, P0s promote to `IMPROVEMENT_BACKLOG.md` live pool at intake.**

| Ref | Title | Blocks | Area | Evidence |
|---|---|---|---|---|
| **DV2-R01** | Server-side v1-vs-v2 health-score distribution comparison script + `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` artifact | #42 v1 retirement (PRD D2 commitment) | analytics-ops | Analytics lens — distribution comparison is unblockable without this artifact; can execute without PostHog gating |
| **DV2-R02** | Replace `window.prompt` (rename) + `window.confirm` (archive) in `WorkflowRow` kebab menu with inline interactions | #57 flag retirement; external launch | dashboard-v2 / UX | UX lens + FE lens both flagged independently; `WorkflowRow.tsx:268,295`; untestable in Playwright without dialog-mock setup |
| **DV2-R03** | Add keyboard Escape handler on health-score breakdown tooltip | PRD §10 compliance; external launch | dashboard-v2 / a11y | UX lens — WCAG 2.1 SC 1.4.13 (Content on Hover or Focus); `WorkflowRow.tsx:523`; tooltip has no keyboard dismiss path |

### P1 — Significant Debt (cold pool)

Held in this artifact. Promote via P0 burn-down (D-5 path 1) OR PRD-trigger (D-5 path 2).

- **DV2-R04** axe-core regression gate extension — run `assertAxeCompliance` on error state, sparse state, gated (free-tier) tooltip state; add `moderate.length ≤ N` ratchet assertion to prevent silent moderate-violation accumulation. Untracked by existing backlog. — **MR-021-triage 2026-09-16: SHIPPED** (promoted to live backlog row #80 and closed iter 046; `assertAxeCompliance` at `apps/web-app/e2e/app/dashboard/v2-a11y.spec.ts:77-106` carries the `maxModerate` ratchet param + hard `expect(moderate.length).toBeLessThanOrEqual(maxModerate)` assertion; 3 new tests cover error/sparse/gated states; commit `127d467`. This cold-pool copy was simply never struck through when the row shipped.)
- **DV2-R05** `seedDashboardV2Dev()` fixture (PRD §11 requirement for iter 021, never delivered) + `free@ledgerium.test` user + `e2e/.auth/free-user.json` storageState. Unblocks **4 skipped interactive E2E tests** (row click, sort with data, filter, kebab keyboard) + **4 skipped plan-gating E2E tests**. — **MR-021-triage 2026-09-16: PROMOTE** (still true today — verified 4 `test.skip(...)` blocks in `apps/web-app/e2e/app/dashboard/v2-happy-path.spec.ts:156,180,250,285` and 4 in `apps/web-app/e2e/app/dashboard/v2-plan-gating.spec.ts:52,86,132,167`, all still gated on "Un-skip after seedDashboardV2Dev() fixtures are merged"; no such fixture exists anywhere in the repo. Impact: 8 dead E2E tests including the entire plan-gating suite, ~5 months stale.)
- ~~**DV2-R06** Route v1 shadow-function audit: `route.ts:154` `computeAiOpportunityScore` (v1 signature differs from v2 export), `route.ts:568` variation-score v1 (different blending formula than `workflow-metrics.ts`), `route.ts:107` `computeIsStale` (uses `Date.now()` directly), v1 `computeSopReadiness`. These duplicate implementations drift silently from v2 and are the **primary #42 retirement blocker**, not `computeHealthScore()` alone.~~ **DELETED AT MR-008 (iter 036, 2026-04-23) — DUPLICATE of live-backlog MDR-P05** (METRICS_DASHBOARD_REVIEW_001 §3 P0 row #69, promoted iter 032 with concrete numeric divergence evidence). MR-008 §5 cold-pool partial triage: MDR-P05 supersedes DV2-R06 scope fully (shadow-function `computeAiOpportunityScore` + `computeVariationScore` divergence is MDR-P05's exact fix; `computeIsStale` `Date.now()` leak is MDR-P03's exact fix). See `docs/meta/MR_008_META_REVIEW.md` §5.
- **DV2-R07** Add ≥1 non-mocked route integration test — currently `route.test.ts:40–62` mocks `computeWorkflowMetrics`, `computePortfolioHealthScore`, `computePortfolioHealthScorePrior`, `computeInsightChips` entirely. Adapter `toMetricsInput` untested end-to-end. Regression in adapter mapping would not fail CI. — **MR-021-triage 2026-09-16: KEEP-COLD** (route.test.ts still mocks `@/lib/metrics-input-adapter` + `@/lib/workflow-metrics` at lines 44/61 — literal ask unmet — BUT the practical risk is substantially mitigated: `apps/web-app/src/lib/metrics-input-adapter.test.ts` (added iter 049) directly unit-tests `toMetricsInput`/`parseIntelligenceJson` with 8 non-mocked cases. A regression in adapter mapping would now fail that suite even though route.test.ts stays mocked. Real gap, lower residual risk than originally scoped.)
- **DV2-R08** Upgrade-CTA value-led rewrite + secondary placement. Current gated tooltip says "Upgrade to see breakdown" / "View plans →" — feature-named, buried under hover+click, single touchpoint. PRD §4 10%-lift target structurally unreachable. — **MR-021-triage 2026-09-16: PROMOTE** (copy itself unchanged — "Upgrade to see breakdown" still live at `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx:334`. The "single touchpoint / structurally unreachable" framing is now FALSE — the pricing/quota overhaul since iter 048 added upgrade CTAs on `UsageQuotaMeter` at 80%/100% and on gated `PresetChipRail` chips — but this specific first-contact tooltip is still feature-named, not value-led, and was evidently missed by that later work. Small fix, `growth-strategist` review.)
- ~~**DV2-R09** In-app what's-new banner for v2 transition (returning-user session continuity). One sentence, dismissible, tied to a user preference flag.~~ **MR-010: DELETED — subsumed by #57 flag-retirement engineering-complete at iter 041; once v2 retires v1 via #57 the returning-user transition surface disappears (no dual-mode session continuity problem remains). See `docs/meta/MR_010_META_REVIEW.md` §5.**
- **DV2-R10** `{ data, error, meta }` envelope normalization on `/api/workflows` 200 response — current 200 returns `{ workflows, stats }`; CLAUDE.md API Design contract drift. — **MR-021-triage 2026-09-16: DELETE (duplicate of live row)** (claim is still technically true — `apps/web-app/src/app/api/workflows/route.ts:753-754` still returns bare `{ workflows, stats: {...} }` — but this item was already promoted to live `IMPROVEMENT_BACKLOG.md` row #85 at MR-013 with `Birth iter: MR-013-promoted`, and row #85 is still open there today. This cold-pool copy is a stale duplicate of a row that is already independently tracked; deleting here to avoid double-counting.)
- ~~**DV2-R11** Chip `{signal} → {next action}` template contract verification — PRD §2.2 action-leading rewrite may be a component-level display pattern without underlying data-layer template enforcement. If `chip.label` passthrough in `InsightsStrip.tsx` never receives `→`-formatted strings from the engine, the rewrite is cosmetic.~~ **MR-010: DELETED — verified by MDR-P02 closure at iter 035 (`workflow-metrics.ts` variance-high chip string uses computed-signal action-leading template `"${n} workflows show high execution variance → investigate consistency"`; `→` format enforced at engine boundary not component layer). See `docs/meta/MR_010_META_REVIEW.md` §5.**
- **DV2-R12** Snapshot-table arch decision for #60 per-workflow delta — recommend **Option C** (nightly `workflow_health_snapshot(workflow_id, captured_at, health_score, variation_score)` table; aligns with Ledgerium immutability-first principle). Option A (event-level prior-window query) is per-request expensive; Option B (separate `/api/workflows/deltas`) doubles round-trips without fixing storage. — **MR-021-triage 2026-09-16: SHIPPED** (promoted to live backlog row #86 and closed iter 055; ADR at `docs/features/dashboard-v3-metrics-engine/SNAPSHOT_TABLE_DECISION.md` adopts a refined Option C — `metric_fact` (R+1) + `process_run_snapshot` (R+3), run-grain not workflow-grain, explicit `snapshot_version`, write-through on ingest — landed in commit `cbc6681` "Path D customizable workflow dashboard complete (iter 055-064)". This cold-pool copy was never struck through.)
- **DV2-R13** `DashboardV2Shell.handleCreatePortfolio` is a silent no-op (line 278) — wire to existing `CreatePortfolioDialog` (already imported in `page.tsx`) OR disable the sidebar button with tooltip. — **MR-021-triage 2026-09-16: PROMOTE** (still live, worse than described — `handleCreatePortfolio` no longer exists as a named function; it is now an inline `onCreatePortfolio={() => { /* deferred to follow-up #50 */ }}` no-op at `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx:1176-1179`, wired to TWO buttons in `apps/web-app/src/components/PortfolioSidebar.tsx:328,383`. Both are silent dead clicks with no disabled state, no tooltip. `CreatePortfolioDialog` still exists unwired at `apps/web-app/src/components/CreatePortfolioDialog.tsx`. Real user-facing trust defect, tiny fix — either wire the dialog or disable+tooltip the button.)
- **DV2-R14** Copy pass on 6 flagged user-visible strings (concretizes existing #58): sparse-state notice, empty-state body, run-count null label (`n=0 — no runs` → "No runs yet"), upgrade tooltip headline, delta null state (`— vs last 30d` → "No prior data"), "High Variation" filter option (→ "Inconsistent"). Scoped copy-review pass; `growth-strategist` sign-off required pre-ship. — **MR-021-triage 2026-09-16: PROMOTE (partial — 3 of 6 confirmed still live)** (sparse-state notice + empty-state body copy WERE rewritten by a later "atglance-review #14 (GROWTH_DASHBOARD_REVIEW §8)" pass per `apps/web-app/src/components/dashboard-v2/WorkflowList.tsx:673`. But 3 items are unambiguously still as originally flagged: run-count null label still `'n=0 — no runs'` at `WorkflowRow.tsx:1294` / `WorkflowRow.test.tsx:454`; delta null state still `'— vs last 30d'` at `CommandHeader.tsx:106`; filter option still `'High Variation'` at `WorkflowListFilterBar.tsx:52` + `activeFilters.ts:81`. Re-scope to the 3 remaining strings; `growth-strategist` sign-off still required.)

### P2 — Polish (cold pool)

- **DV2-R15** URL-serialize dashboard filter state — persistence + shareable filtered views. — **MR-021-triage 2026-09-16: PROMOTE** (still fully absent — no `URLSearchParams`/`useSearchParams`/`router.push` filter-state wiring found anywhere in `DashboardV2Shell.tsx`. Path D shipped server-persisted `SavedView` CRUD (per-account, not shareable-via-link) and a time-range selector, but neither substitutes for a shareable URL — filter state still cannot be bookmarked or sent to a colleague. Moderate value, moderate effort, still real.)
- **DV2-R16** Filter-bar overflow "+N more" truncation — currently `flex-wrap` only. — **MR-021-triage 2026-09-16: KEEP-COLD** (still true — `ActiveFiltersBar.tsx:51` is still bare `flex flex-wrap`, no truncation logic. Minor UI polish, not worth a row on its own.)
- **DV2-R17** Delta label "vs last 30d" time-range awareness OR clarifying "(always 30d)" sub-label. — **MR-021-triage 2026-09-16: KEEP-COLD** (still true and the label is at least still accurate — `route.ts:719` `PRIOR_WINDOW_DAYS = 30` is genuinely fixed regardless of the dashboard's (now-shipped) time-range selector; `CommandHeader.tsx:106-109` renders "vs last 30d" unconditionally. Not misleading, just not reactive to the time-range filter. Minor honesty nit, low urgency vs. other open items.)
- **DV2-R18** `InsightsStrip` dismissed-set reset on chip-id change across re-fetches. — **MR-021-triage 2026-09-16: KEEP-COLD** (still true — `InsightsStrip.tsx:83` `dismissedIds` state has no reset effect keyed on the incoming `chips` set. Real but low-blast-radius: chip IDs are stable category keys, so the only failure mode is a dismissed category staying hidden across a refetch within the same session.)
- ~~**DV2-R19** `computeIsStale` determinism injection (`now: Date` parameter).~~ **MR-010: DELETED — coverage-already-shipped at iter 037 MDR-P03 closure (`route.ts:107-114` `computeIsStale(..., nowMs: number)` 3rd-param extension; single-upstream-clock-boundary `referenceNowMs` pattern at `route.ts:485-487`). See `docs/meta/MR_010_META_REVIEW.md` §5.**
- ~~**DV2-R20** `oneMonthAgo` (`setDate(1)`) vs `PRIOR_WINDOW_DAYS` (30) window-semantics consistency in `route.ts:691`.~~ **MR-010: DELETED — coverage-already-shipped at iter 037 MDR-P04 closure (UTC-month-boundary `Date.UTC(getUTCFullYear, getUTCMonth, 1, 0, 0, 0, 0)` at `route.ts:628-635` closes TZ-dependence; windowing semantics now deterministic). See `docs/meta/MR_010_META_REVIEW.md` §5.**
- **DV2-R21** Remove duplicate `applyFilters` call — shell computes `filteredWorkflows` at `DashboardV2Shell.tsx:205`; `WorkflowList.tsx:288` re-applies on the same inputs. — **MR-021-triage 2026-09-16: KEEP-COLD** (the two calls are not actually redundant duplication today: `DashboardV2Shell.tsx:782-793` computes `applyFilters` over `portfolioFilteredWorkflows` for count/view-state derivation only (empty/sparse/no-results), while `WorkflowList.tsx:563` independently applies `applyFilters` over `portfolioFilteredWorkflows` — the *pre*-filter list, not the shell's already-filtered output — to render rows. Two calls, same effective filter logic, but architecturally intentional (list component owns its own render-filtering). The perf concern is already addressed: `WorkflowList.tsx:554-556` documents "atglance-review #19 (perf): memoize ... only recomputation is elided." Real duplication-of-logic, but already mitigated and not a correctness bug.)
- **DV2-R22** `useEffect` sync for `displayTitle` on `workflow.title` prop change in `WorkflowRow.tsx:386`. — **MR-021-triage 2026-09-16: KEEP-COLD** (still true — `WorkflowRow.tsx:806` `useState(workflow.title)` has no sync effect, and `key={workflow.id}` at `WorkflowList.tsx:911` means an external title change — e.g. renamed in another tab — won't remount the row or refresh `displayTitle`. Real but edge-case; local rename already updates `displayTitle` at the rename call site.)
- ~~**DV2-R23** Runtime guard for `portfolioIds` on workflow payload — remove silent `as`-cast at `DashboardV2Shell.tsx:197`.~~ **MR-013: DELETED — superseded by Path C R+2 metric-fact persistence layer; the new `/api/metrics/*` route surface introduces Zod-validated request/response envelopes per revised-PRD v2.0 §11 acceptance gate G-3, and the legacy `as`-cast at `DashboardV2Shell.tsx:197` will be removed by R+2's response-shape migration. Standalone fix would be re-done by R+2; cold-pool retention costs more than direct closure via Path C. See `docs/meta/MR_013_META_REVIEW.md` §5.**
- **DV2-R24** `staleCount` parameter plumbing — concretizes existing #43; signature `computeInsightChips(workflows, processInsights, staleCount: number)` with rule `staleCount >= 2`. — **MR-021-triage 2026-09-16: DELETE (duplicate of live row)** (claim still true — `computeInsightChips(workflows, processInsights)` at `workflow-metrics.ts:642-644` has no `staleCount` parameter and no stale chip today — but this item explicitly says "concretizes existing #43," and live backlog row #43 (`IMPROVEMENT_BACKLOG.md:197`) is still open with the identical ask. No separate cold-pool tracking needed.)

### P3 — Informational (cold pool)

- ~~**DV2-R25** Skeleton row `key={i}` index-as-key — static count, no reorder risk; hygiene flag only.~~ **MR-013: DELETED — superseded by #57 v2 dashboard flag retirement (chain at 10/10 ENGINEERING-COMPLETE post-iter-041; only 14d soak remains). The skeleton-row code path lives inside the v2 dashboard surface that retires when #57 fires; closing the hygiene flag in v2 produces no durable value because the surface is sunsetting. Path D D+1 column registry will replace the skeleton-row implementation entirely with a metric-driven render path. See `docs/meta/MR_013_META_REVIEW.md` §5.**
- ~~**DV2-R26** Redundant `computeVariation` call in `computeOpportunityTag` — pure, no correctness risk; micro-waste.~~ **MR-010: DELETED — shipped via MDR-P05 iter 039 (v1 shadow-function consolidation; `metricsV2 = computeWorkflowMetrics(metricsInput)` now computed once per workflow at top of `map()` callback; v1 `computeVariationScore` + v1 `computeAiOpportunityScore` both deleted from `route.ts`; downstream per-workflow helpers consume `metricsV2.*` directly — redundant call class eliminated). See `docs/meta/MR_010_META_REVIEW.md` §5.**
- **DV2-R27** `tools` JSON parsed twice per workflow (`route.ts:559` + `toMetricsInput` at line 352) — micro-perf. — **MR-021-triage 2026-09-16: KEEP-COLD** (still true, and now worse than described — `route.ts:470-477` parses `w.toolsUsed` once into `parsedTools`, but then passes the RAW string to `computeProcessType(w.toolsUsed, ...)` (line 516) and `computeComplexityScore(..., w.toolsUsed, ...)` (line 517), both of which internally `JSON.parse` it again at lines 154/188 — 3 parses per workflow today, not 2. Still pure micro-perf, no correctness risk; not worth a row on its own but worth widening scope if it's ever picked up.)

---

## Cross-Cutting Themes (observed across ≥2 lenses)

1. **Measurement is the dominant gap.** #51 (live, score 13) + DV2-R01 (new P0) collectively block: #42 v1 retirement (PRD D2), #57 flag retirement, #59 variationLabel calibration, #61 threshold calibration, PRD §4 baseline establishment, external launch measurement read. [PM · Analytics · Growth]
2. **Native browser dialogs breach executive-grade UX.** Independently flagged by UX lens (credibility, WCAG) and FE lens (testability). Single fix (DV2-R02) closes both concerns. [UX · FE]
3. **The real #42 blocker is the route's v1 shadow functions, not `computeHealthScore()`.** Duplicate `computeAiOpportunityScore`, duplicate variation scoring, duplicate SOP-readiness, `computeIsStale` non-determinism. Bug fixes land in one implementation and silently skip the other. [Arch · BE]
4. **Axe-core coverage exists but is shallow.** PRD §10 commits to "no a11y regressions acceptable for release"; moderate violations are logged-to-console without assertion; error/sparse/gated DOM variants not scanned; tooltip-keyboard-dismiss is a SC 1.4.13 violation today. [PM · QA · UX]
5. **Upgrade path is conversion-void.** One gated touchpoint, feature-named, no value proposition, no secondary placement, no in-app what's-new. PRD §4 10%-lift target is structurally unreachable under current surface. [Growth · PM]
6. **E2E covers states but skips the interactive hot path.** 4 interactive tests + 4 plan-gating tests skipped — all waiting on `seedDashboardV2Dev()` (PRD §11) + free-tier user (never seeded). Primary user flow untested. [QA · Arch]

---

## Recommended Iter Sequencing

Post-MR-005 burn-down (iter 027–028) proceeds as programmed — DV2-R01/02/03 do NOT displace #7 and #19+#20.

- **Iter 029 first eligible `top-score` slot:** Tie between #51 (live, score 13, analytics instrumentation) and DV2-R01 (new P0, distribution comparison for #42). **Recommend DV2-R01** for iter 029 because (a) executes without PostHog gating, (b) directly unblocks #42, (c) ~1-day server-side script vs multi-component instrumentation pass.
- **Iter 030:** #51 analytics instrumentation (full 6-event spec per analytics agent's scoped recommendation).
- **Iter 031:** DV2-R02 + DV2-R03 bundled under guardrail 7(b) one-logical-outcome = "WorkflowRow interaction hardening" (both live in `WorkflowRow.tsx`, both are a11y/UX).
- **Iter 032+:** DV2-R04 (axe ratchet), DV2-R05 (seed), ~~DV2-R06 (shadow-function audit — may be sub-divided)~~ **superseded by live-backlog MDR-P05 at MR-008**, #42 v1 retirement (now unblocked).

## GA / Launch Decision Matrix

| Milestone | Current | Remaining Blockers |
|---|---|---|
| v2 GA at `?v2=1` flag-on | ✅ shipped iter 021 UI + iter 022 a11y/default-on | NONE |
| 14-day soak period | in progress (opened iter 022) | NONE — soak is passive; concerning because generating zero signal |
| **#57 flag retirement (~iter 036)** | **gated** | DV2-R02, DV2-R03, DV2-R05 (E2E plan-gating seed), #51 (analytics) |
| **External launch** | **gated** | All P0s + #51 + DV2-R04 (a11y ratchet) + DV2-R08 (upgrade CTA) + DV2-R09 (what's-new) |
| **#42 v1 retirement** | **gated** | DV2-R01 (distribution artifact), ~~DV2-R06~~ **MDR-P05 (shadow-function consolidation; supersedes DV2-R06 per MR-008)** |

---

## Audit-Intake Compliance (MR-005 D-5)

- **Cold pool:** DV2-R04 through DV2-R27 (24 items) held in this artifact; not in live backlog at intake.
- **P0 promotion at intake:** DV2-R01, DV2-R02, DV2-R03 promoted to `IMPROVEMENT_BACKLOG.md` live pool with `Birth iter: DV2-REVIEW-001`.
- **Promotion paths forward (per D-5 clauses 4 + 5):**
  - Path 1 — P0 burn-down creates slot: next-highest cold-pool item MAY promote to live when a live DV2-R0x closes.
  - Path 2 — PRD-trigger: a newly-approved PRD citing a cold-pool item by number in a numbered Dependencies section promotes it.

**Pool trajectory impact:** +3 P0s promoted at intake → live pool 32 → **35** at DV2-REVIEW-001 commit. Re-violates hard ceiling (35 > 15). MR-005 post-intake burn-down programming updates:
- Iter 027 (#7) + iter 028 (#19+#20) remain as programmed — 2 closures → pool ≈ 32 at iter 028 close.
- Iter 029 (DV2-R01 or #51) + iter 030 (#51 or DV2-R01) — 2 closures → pool ≈ 30.
- To hit prior ≤15-by-iter-035 target, 15 more closures required across iter 031–035 (3/iter average). Achievable if DV2-R02/R03 bundle, DV2-R04/R05 execute as single iterations each.

---

## Appendix — Agent Sources

8 specialist agents consulted 2026-04-21 via parallel Mode 3 invocation. Individual reports preserved in session transcript at timestamp of this artifact's commit. Inputs: 8 agent IDs archived; see conversation thread.

- **product-manager** — 500-word PRD compliance audit against PRD_DASHBOARD_V2.md + PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md
- **ux-designer** — 500-word UX review across 6 components + state machine + interactions
- **system-architect** — 500-word architecture review; `workflow-metrics.ts` + route + flag-gating + #60 arch recommendation
- **frontend-engineer** — 500-word code review across 6 components + 4 test files; 7 concrete issues with severity
- **backend-engineer** — 500-word BE review; engine purity verified + 6 concrete route issues
- **qa-engineer** — 500-word QA review; PRD-commitment coverage map + 7 concrete gaps
- **analytics** — 500-word measurement readiness; 6-event taxonomy gap analysis + #51 scoped spec
- **growth-strategist** — 500-word copy + upgrade + activation review; 8 concrete string replacements recommended

---

**End of DASHBOARD_V2_REVIEW_001**
