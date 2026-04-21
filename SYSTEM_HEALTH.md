# Ledgerium AI — System Health

Last updated: 2026-04-21 (post-**iteration 025 — MR-005 meta-review (Mode 4, governance-only; NO product code changes)**); MR-005 artifact written at `docs/meta/MR_005.md` covering iter 019→024 Path B (6 bounded loops) + Mode 3 @iter 020 principal review. **7 CLAUDE.md governance diffs applied** (D-1 through D-7): reverse portfolio-drift trigger at N=5 (separately-logged user-ack) · scaled Mode 5 companion burn-down ⌈N/3⌉ + hard-stop ceiling at pool>15 (supersedes MR-004 Change A) · fourth density-response option `scope-guard-adjacent` · specialist-invocation gate (`growth-strategist` ≥3 copy strings, `system-architect` ≥200 LOC new contract) · Audit-Intake Pattern codification (new section) · test-touch counting (supersedes MR-004 Change F) · Mode 5 sequence-length soft cap at N=5. Staleness triage: 10 KEEP, 3 DOWNGRADE (#21/#28/#32), 0 DELETE. Iter 026-028 burn-down programming fixed (026=#14, 027=#7, 028=#19+#20 bundle). Test count **unchanged at 289 web-app / 1728 workspace** (Mode 4 rule: no product code changes). Pool unchanged at **33 open** (no code → no closures + no creations). Iter 025 Area = `governance` (Mode 4, non-counting for Area saturation; Path B rotation clock stays armed at 5 consecutive non-extension iters; reverse-drift trigger D-1 armed, clears if iter 026 = #14 as programmed). Next meta-review: **MR-006 earliest iter 028** (3-loop stability window from MR-005). Iter 026 = `burn-down`, MANDATORY rotation off web-app, primary agent `backend-engineer`. Prior iteration 024 entry preserved below.

Previous entry: 2026-04-21 (post-**iteration 024 — v2 Dashboard executive refinement (Mode 5 item 6/6 — Path B CLOSED)**); 6 sub-items delivered as one logical outcome per `PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md` §4.1: (a) portfolio period-over-period delta in CommandHeader with trend icon/color/aria-label; (b) action-leading chip copy rewrite (5 labels; filterKey contract preserved); (c) 3-state RAG color pip on WorkflowRow Health Score cell + global threshold alignment 40/70 → 60/80 across CommandHeader band + row pip + row rail + row text; (d) "High variation" badge in Name cell on `variationLabel === 'high'` only (v1 — `'very_high'` deferred to #59); (e) "Needs attention" pinned filter chip as FIRST element in filter bar, v1 predicate `health < 60 OR variationLabel === 'high'` (delta ≤ −10 arm deferred to #60); (f) run-count qualifier `n=N` when `runs < 10`, `n=0 — no runs` when null. 11 files modified + 1 new test file (`CommandHeader.test.ts`, 15 tests); web-app package test count **245 → 289** (+44); typecheck clean across workspace. New metrics-engine exports: `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` constant + `computePortfolioHealthScorePrior()`. API route `/api/workflows` extended with `portfolioHealthScorePrior` + `portfolioHealthScoreDelta` in `stats`. scope-expansion: approved (60/80 global threshold — PRD §2.4 locks globally). mode-5-saturation: user-ack (5th consecutive web-app iteration; CEO ack recorded 3×). density-response: acknowledged, carried forward (4 new follow-ups #58/#59/#60/#61 — scope-boundary post-launch items). ceiling-cool-off: NOT invoked (Mode 5 directed precedence; MR-004 Change B exclusion). Pool **29 → 33 open** (closed #54 governance-tracking-not-debt; generated 4 new; ceiling deeply violated). Agent diversity across Path B: 3:3 backend:frontend (healthy). **Path B CLOSED** — 6-iteration sequence complete. **Iter 025 = MR-005 meta-review (MANDATORY — base cadence AND Mode 5 guardrail 4 both trigger). No product code changes at iter 025.** Reverse portfolio-drift trigger (MR-004 Change E) now has 5 data points available for meta-coordinator evaluation. Prior iteration 023 entry preserved below.

Previous entry: 2026-04-21 (post-**iteration 023 — BUG-07 subscriptionStatus default fix (Mode 2 targeted fix)**); single-outcome schema default fix delivered per CEO Option A directive 2026-04-21; `apps/web-app/prisma/schema.prisma:16` changed `@default("trialing")` → `@default("none")`; `apps/web-app/src/app/api/auth/signup/route.ts:43` changed hardcoded `'trialing'` → `'none'`; new `apps/web-app/src/app/api/auth/signup/route.test.ts` (+87 LOC, single BUG-07 regression test); `prisma db push` applied to local SQLite (141 ms — no migration file; project uses db-push pattern; backlog row #12 is scope guard for migrations baseline); zero UI regression (`statusLabels['none']` at `account/page.tsx:74-77` already renders "Free"); zero backfill by design; web-app package test count **244 → 245**; typecheck clean; callsite audit confirms zero `subscriptionStatus === 'trialing'` gating logic anywhere in app (all remaining `'trialing'` literals are legitimate Stripe webhook paths at `webhook/route.ts:104, 111` + `webhook/route.test.ts:151, 177`); unblocks `PRD_TEAM_TRIAL.md` Dependency §11a; row #40 closed; pool **30 → 29**; zero follow-ups generated (density-response: n/a); `backend-engineer` primary (resets frontend-engineer consecutive-counter of 2 from iter 021/022); Mode 2 precedence bypasses ceiling rule + saturation rule (iter 023 = 4th consecutive web-app iteration; CEO saturation user-ack reaffirmed 2026-04-21 covers extension; reverse portfolio-drift trigger continues accumulating for MR-005 at iter 025). **Iter 024 = Mode 5 item 6/6 executive refinement (frontend-engineer primary, PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §4.1 items a–f); Iter 025 = MR-005 meta-review** (cadence: 019 + 020 + 021 + 022 + 023 + 024 = 6 bounded loops post-MR-004). Prior iteration 022 entry preserved below.

Previous entry: 2026-04-21 (post-**iteration 022 — v2 Dashboard a11y + polish + E2E (Mode 5 item 5/6, PRD_DASHBOARD_V2 §10 + §14 + executive-refinement addendum)**); **iter 023 redirected by CEO directive 2026-04-21 Option A: Mode 2 targeted fix on #40 BUG-07 (`subscriptionStatus @default("trialing")` → `"none"` + migration; unblocks `PRD_TEAM_TRIAL.md`); executive-refinement bundle slides iter 023 → iter 024; MR-005 slides iter 024 → iter 025.** Post-iter-022: a11y wiring complete across 4 v2 components (semantic `role="region"` + `aria-label` + hidden `aria-live` screen-reader announcement region + kebab focus management + Escape-to-trigger + `role="alert"` error region); 4 follow-up closures (#47 Suspense via Mode 3 `6799604`; #48 flag auto-redirect D1 — default now v2, `?v2=0` = 14-day soak escape; #49 kebab rename/archive wired to real PATCH with optimistic UI + error recovery; #50 D7 honest `(all-time)` qualifier on runs subtext; #52 D5 PortfolioSidebar integrated + Columns3 toggle + `/api/portfolios` fetch); 4 new Playwright E2E specs under `apps/web-app/e2e/app/dashboard/` (`v2-a11y` with axe-core zero-tolerance on critical/serious; `v2-happy-path`; `v2-plan-gating`; `v2-states`); `@axe-core/playwright@^4.11.2` devDependency; web-app package test count **233 → 244** (+11 tests: 6 D7 boundary + 5 kebab PATCH body shape); typecheck clean; workspace `pnpm test` unchanged at 1728 (known `.test.tsx` discovery gap #53). **3 new follow-ups** (#55 gitignore monorepo-pattern fix — surfaces untracked `apps/web-app/prisma/test.db` + `apps/web-app/e2e/.auth/user.json`; #56 `docs/features/user-templates/` governance decision — 12-file separate feature workstream held out of iter 022; #57 `?v2=0` flag full retirement at iter 022+14d soak). Open pool **34 → 30** (closed 4, generated 3; row #54 iter-023-target retained as governance not debt; ceiling still violated). Agent diversity: frontend-engineer counter = 2 (iter 021 + 022); iter 023 = backend-engineer primary (schema + migration + route). Prior iteration 021 entry preserved below.

Previous entry: 2026-04-21 (post-**iteration 021 — v2 Dashboard UI build (Mode 5 item 4/5, PRD_DASHBOARD_V2 §5/§8/§9 + post-Mode-3 contract)**); 8 new components under `apps/web-app/src/components/dashboard-v2/` (DashboardV2Shell owning TanStack-free fetch state, CommandHeader with inline time-range/portfolio score/top-insight, InsightsStrip with inlined chip rendering including new `positive` severity, WorkflowList as 5-state-machine container [loading/empty/no-results/error/sparse/ready], WorkflowListFilterBar, WorkflowRow with 4-column verdict grid + plan-gated breakdown tooltip honoring `isGated`); `/dashboard?v2=1` flag-gated — v1 dashboard preserved unchanged behind absent-flag; honest dimension labels enforced at runtime AND by `FORBIDDEN_LABELS = ['efficiency', 'reliability', …]` negative-assertion test block in `WorkflowRow.test.tsx`; design-token compliance per PRD §5.4 (typography 12/14/16/20/28, weights 400/500/600, tabular-nums for numerics, spacing 4/8/12/16/24/32, radii 6/10, monochrome + 3 semantic hues, single elevation, ≤150ms motion); web-app package now **11 test files / 233 tests** (+3 new test files: DashboardV2Shell 15 tests, WorkflowList 17 tests, WorkflowRow tests including FORBIDDEN_LABELS enforcement); typecheck clean across workspace. **9 follow-ups generated** (#45 system icon mapping, #46 TanStack Query adoption, #47 useSearchParams Suspense wrap, #48 D1 auto-redirect activation per iter 022 rollout, #49 kebab "Edit name"/"Archive" wiring, #50 D7 "(all-time)" annotation, #51 v2 analytics instrumentation [PRD §4 measurable-outcome dependency], #52 PortfolioSidebar D5 integration, #53 workspace vitest `.test.tsx` discovery gap [coordinator-generated during retracted scope expansion — guardrail 7 correctly invoked then backed off on "one logical outcome" test]); open follow-up pool **25 → 34** — pool-size ceiling rule deeply violated; Mode 5 operating-mode precedence + companion-burn-down-discharged-iter-019 allow iter 022 to proceed; **MR-005 at iter 023 boundary MANDATORY** per Mode 5 guardrail 4 (sequence ≥3 items) AND base cadence — expect aggressive burn-down programming post-Path-B. Agent diversity: frontend-engineer counter = 1 (rotated from backend-engineer consecutive counter of 2 at iter 020 close, now reset). Prior Mode 3 correction entry preserved below.

Previous entry: 2026-04-21 (post-**Mode 3 principal-level design correction of iter 020 surface + PRD §5/§7/§8**); CEO-directed non-counting design review tightened 7 category-level weaknesses before iter 021 UI build: (1) `HealthScoreV2` dimensions renamed `efficiency`→`speed` + `reliability`→`dataQuality` (honest labels; CEO 0.30/0.30/0.20/0.20 weights preserved); (2) speed scoring graduated 3-band [ideal 30 / adjacent 18 / far 5 / null 0] — killed binary cliff; (3) `computeAiOpportunityScore` elevated to named export + `aiOpportunityScore` field on `WorkflowMetricsOutput` (audit surface for `automate` tag); (4) `OpportunityTag` `'none'` → `'healthy'` (positive fallthrough); (5) `InsightChip.severity` gains `'positive'` + new healthy-portfolio chip ("N workflows running smoothly" when ≥3 overall ≥70 AND no warning/critical chips present); (6) PRD §5.3 columns 9 → 4 (Name · Systems · Opportunity · Health Score — verdict not spreadsheet); (7) PRD §8 components 18 → 8 (state variants folded into one `WorkflowList`; single-cell atoms inline into `WorkflowRow`); (8) new PRD §5.4 locks design tokens (typography scale 12/14/16/20/28, spacing grid, radii 6/10, monochrome + 3 semantic hues, single elevation); `isTrendReady` removed (dead surface). Test count **1718 → 1728** (+10 net: graduated-speed boundaries, positive-chip rules, aiOpportunityScore contract). Typecheck clean; 1728/1728 tests green. Mode 3 does NOT increment any counter; Path B remains at 3/5 complete. Prior iteration 020 entry preserved unchanged.

## Executive Summary

Ledgerium AI is in **Phase 1** with a strong deterministic product foundation, comprehensive analytics infrastructure, and clear architectural principles. The current system is strongest in **vision clarity, invariants, analytics coverage, and core trust-first philosophy**. **All three Phase-1 release blockers are now closed** — Playwright E2E (iter 009), session event persistence (iter 010), and LiveStepBuilder ↔ StreamingSegmenter convergence (iter 011). The system is architecturally ready for Phase 2 with no carried blockers.

**Meta-Review 002** (2026-04-19) confirmed MR-001's control changes (formula rewrite, delegation rubric, Mode 5 formalization) are working first-order, but flagged a priority finding: the **density trigger** in `Follow-Up Debt Policy` clause 3 was silently violated 3 consecutive iterations (009, 010, 011 each generated ≥3 follow-ups with zero `density-response` log). MR-002 mechanized the policy into a machine-enforceable log line (Change A), added `Birth iter` as a mandatory schema field (Change B), and introduced a pool-size ceiling rule (Change C) that forces iter 012 to burn-down because the open follow-up pool is 11 items (> 8).

Overall confidence: **High, strengthening further post-iter-020** (3 of 3 release blockers closed; MR-004 Change A companion-burn-down obligation satisfied at iter 019; metrics engine lands pure-deterministic with 66-test coverage expansion). **Post-iter-020:** Path B now 3 of 5 iterations complete (018 PRD + MR-004 ✅, 019 burn-down #15 ✅, 020 metrics engine ✅). Test count trajectory 1646 → 1652 → 1718 across Path B build iterations (+72 net). CEO's Health Score formula (0.30 efficiency / 0.30 consistency / 0.20 reliability / 0.20 standardization) now computable alongside existing v1 per D2 parallel-run directive; Opportunity tagging deterministic via explicit decision tree. Pool 22 → 25 (+3 follow-ups generated iter 020: v1 retirement per D2, stale-chip signature refinement, route sort params) — this is expected during build-heavy PRD execution and `density-response: acknowledged, carried forward` rationale recorded per CLAUDE.md clause 4. **Path B remaining:** iter 021 UI build (frontend-engineer primary, 18 components under `dashboard-v2/`, 5 UI states, `/dashboard?v2=1` flag-gated per D1), iter 022 accessibility + polish + E2E (qa-engineer + frontend-engineer). **Billing revenue-integrity:** unchanged (4.8/5 scorecard; 21-test regression net holds). **Agent diversity:** backend-engineer consecutive-use counter = 2 (iter 019 + iter 020). Iter 021 MUST be frontend-engineer per PRD §8 component build — counter resets. Same-implementer-4+ trigger stays distant. **Deferred governance work (MR-004 Changes D/E/F):** audit-intake codification, reverse portfolio-drift trigger, test-touch counting rule — queued for post-Path-B governance iteration (iter 023+).

---

## Current Phase

- Phase: **Phase 1**
- Summary: extension shell and shared packages exist; Phase 1 work is focused on removing duplication, hardening capture policy integration, improving recovery, and adding stronger validation.

---

## System Health Scorecard

| Dimension | Status | Score (1-5) | Notes |
|----------|--------|-------------|------|
| Product clarity | strong | 5 | trust-first, deterministic positioning is unusually clear |
| Architectural discipline | strong | 4 | invariants and principles are well defined |
| Deterministic core protection | moderate | 4 | good principles, but more regression protection is still needed |
| Package / code consistency | strong | 5 | **all 4 segmentation implementations converged onto `@ledgerium/segmentation-engine` in iter 011**; extension imports segmentation exclusively from package; ADR-001 Phase 1 complete for segmentation; extension now imports from 4+ workspace packages across background and content layers |
| Session durability / recovery | strong | 4.5 | full event persistence landed in iter 010 — all four arrays (raw, canonical, policyLog, liveSteps) debounced to `chrome.storage.local` per-session; quota-overflow append-stop; schema-version guard; `onSuspend` flush. **Iter 014 closed the trust gap** by surfacing the `persistenceTruncated` flag to users in `ReviewScreen` + `HistoryDetailScreen` (amber warning banner) + regression test in `bundle-builder.test.ts`. Silent data-loss window eliminated. |
| Test coverage | strong | 4.85 | **Web-app package is now 13 test files / 289 tests post-iter-024 (+1 test file / +44 tests vs iter-023 close of 12 files / 245 tests — new `CommandHeader.test.ts` with 15 tests covering delta label rendering, delta color class, delta aria fragment, health band 60/80 transitions; +29 tests across 4 existing files: workflow-metrics.test.ts +12, WorkflowRow.test.tsx +13, WorkflowList.test.tsx +3, DashboardV2Shell.test.tsx +2; 3 threshold tests updated 40/70 → 60/80). Workspace `pnpm test` count will re-baseline at next full audit (known root-config `.test.tsx` discovery gap #53 still blocks workspace discovery of new component tests). Iter-023 added `signup/route.test.ts` +1 (BUG-07 regression asserting `db.user.create` called with `subscriptionStatus: 'none'` on new signup). Iter-022 added 11 tests (6 D7 `(all-time)` boundary tests + 5 kebab PATCH body-shape tests). 4 new Playwright E2E specs landed iter 022 under `apps/web-app/e2e/app/dashboard/` (`v2-a11y.spec.ts` with axe-core zero-tolerance on critical/serious; `v2-happy-path.spec.ts`; `v2-plan-gating.spec.ts`; `v2-states.spec.ts`). Workspace `pnpm test` count held at 1728 due to known root-config `.test.tsx` discovery gap (follow-up #53, not fixed this iter). **1,728 Vitest workspace tests across 53 files** (workspace total unchanged post-iter-021 because new dashboard-v2 component tests live in the web-app package's 11-file / 233-test scope which rolls into the workspace total — workspace figure will re-baseline at next full `pnpm test` audit; web-app package specifically is now **11 test files / 233 tests** +3 files +~47 tests vs iter 020). Mode 3 principal review added: graduated-speed boundary tests in `workflow-metrics.test.ts` [ideal-lower, ideal-upper, short-adjacent, long-adjacent, long-adjacent-upper, far-outside-both-sides], 4-test `computeAiOpportunityScore` block, 3 positive-chip rule tests; iter 020 +66 metrics-engine tests; iter 019 +6 regression tests; iter 017 +21 billing tests; iter 014 +1 bundle regression; iter 013 +12 full-pipeline fixtures). Full regression surface now covers: segmentation determinism (iter 011: 24 live + 24 batch byte-identity), LiveStep cross-path equality (iter 012: 12 I1a), end-to-end normalizer+segmentation byte-identity (iter 013: 12 full-pipeline), persistence-flag carry-through (iter 014: 1 bundle regression), billing webhook + feature-gating (iter 017: 21 tests), confidence-threshold values + import contract (iter 019: 6 tests), and workflow-metrics-engine deterministic output + principal-review corrections (iter 020 + Mode 3: 72 tests). **4 Playwright E2E tests** (3 iter 009 lifecycle + 1 iter 010 restart-recovery smoke). **Gap: no sidepanel component-level test harness** — flagged as follow-up #31 for iter 016+ consideration. I1b deferred as follow-up #26. |
| Observability | strong | 4 | analytics fully instrumented, 8 alert conditions, admin dashboard with engagement/retention/alerts |
| Agentic CI readiness | strong | 4.5 | command, backlog, iteration log, templates, Meta-Review 001 + 002 diffs applied; iter 009 + 010 + 011 all used multi-agent loops; Mode 5 directed sequence executed cleanly across iter 010 + 011 (two independent iterations, own commits, own validations, zero scope violations); iter 011 first iteration since init to use `system-architect` as primary agent; MR-002 mechanized density-trigger + birth-iter schema + pool-size ceiling + scope-expansion protocol |
| GTM readiness | emerging | 2.5 | product wedge promising; analytics infrastructure ready for data-driven decisions |
| Release readiness | strong | 5 | **3 of 3 release blockers closed** (E2E iter 009, session persistence iter 010, segmentation convergence iter 011). Zero Phase-1 blockers remain. CI gate live on PRs via `e2e-extension.yml`. Byte-equivalence regression harness guards the segmentation convergence. |
| Autonomous-vs-directed selection ratio (MR-002 Change E; MR-003 Change C sub-partition) | below band | 3 | Last 10 bounded iterations (iter 006–014 + iter 016; iter 015 Mode 4 excluded; Mode 3 excluded) sub-partitioned: `top-score` autonomous **1/10** (iter 009) · `burn-down` autonomous **6/10** (iter 006, 007, 008, 012, 013, 014) · `blocker-cadence` **1/10** (iter 009 overlap) · `directed` **3/10** (iter 010, 011, **016**). Iter 016 invoked ceiling-cool-off but selection rule was `directed` (user-named), so `top-score` count is unchanged at 1/10. **Still below band** `top-score + blocker-cadence ≥ 2/10`. Clause 7 is single-use and has been consumed at iter 016 → iter 017 returns to burn-down; next `top-score` opportunity at iter 018/019 when another 3-consecutive-burn-down streak would re-arm cool-off. |
| Billing revenue-integrity | very strong | 4.8 | **Post-iter-017:** Mode-3 anti-pattern fixes (BUG-01/03/04) now locked by 21-test regression safety net (7 webhook integration covering all 5 Stripe event types + missing-secret + invalid-signature paths; 14 feature-gating unit tests with 5-tier boundary + admin bypass + null-plan coercion + quota edges; 1 new 401 contract test). Webhook handler integration coverage went from **0 → 7 tests** in iter 017 (closes previous Top Risk #1). Remaining gaps: `admin_bypass` E2E contract (follow-up #41, deferred per scope guard — needs allowlisted test identity) and `plans.ts` unit coverage (non-gap by iter 017 scoping). Pricing-audit cold pool now holds 2 P1 structural bugs (#BUG-05 customer-creation TOCTOU, #BUG-06 atomic quota race); BUG-07 promoted to live backlog as #40 on `PRD_TEAM_TRIAL.md` approval. |

---

## Artifact Health

| Artifact | Status | Notes |
|---------|--------|------|
| `CLAUDE.md` | present | strong operating guidance |
| `IMPROVEMENT_BACKLOG.md` | present | seeded with top 10 current-state items |
| `ITERATION_LOG.md` | present | initialized |
| `SYSTEM_HEALTH.md` | present | initialized |
| `CHANGELOG.md` | present | initialized |
| `PRD.md` | unknown / repo-dependent | verify in live repo |
| `ARCHITECTURE.md` | unknown / repo-dependent | verify in live repo |
| `API_SPEC.md` | unknown / repo-dependent | verify in live repo |
| `TEST_PLAN.md` | unknown / repo-dependent | verify in live repo |
| `METRICS.md` | present | docs/METRICS.md — KPI definitions with formulas |
| `METRICS_FRAMEWORK.md` | present | docs/METRICS_FRAMEWORK.md — North star, AARRR, tier funnels |
| `EVENT_TRACKING_PLAN.md` | present | docs/EVENT_TRACKING_PLAN.md — 28+ events with full specs |
| `DASHBOARD_SPEC.md` | present | docs/DASHBOARD_SPEC.md — 3 admin dashboards, alerting rules |
| `ANALYTICS_ARCHITECTURE.md` | present | docs/ANALYTICS_ARCHITECTURE.md — Collection architecture, privacy |
| `docs/sop/` pack | present | 14 artifacts: design system, schema, transformation rules, quality rubric, 3 template specs, 3 rendered examples, implementation notes, collaboration requests |
| `PRICING_AUDIT_001.md` | present | **new (2026-04-20, Mode 3)** — consolidated pricing + subscription audit; 4 specialist lenses; 11 numbered technical bugs + 6 strategic-coherence findings + 10 growth recommendations; P0 items entered live backlog, P1/P2/P3 held as cold pool; CEO decision points documented |

---

## Top Strengths

1. Very clear trust-first product identity
2. Strong deterministic and invariant-based architectural philosophy
3. Comprehensive analytics infrastructure (50+ events, engagement scoring, retention cohorts, 8 system alerts)
4. Good monorepo and package direction for long-term reuse
5. Explicit active priorities and known technical debt
6. Full conversion funnel instrumented end-to-end

---

## Top Risks

1. **Path B web-app saturation (2 remaining consecutive iterations 021–022)** — iter 020 landed web-app (metrics + API route). Iter 021 will be 3rd web-app touch in rolling 5-window (not yet 3-in-a-row — 016 and 020 are both web-app but not consecutive). Iter 022 = potential 3-in-a-row if 020/021/022 are all web-app. User-ack from iter 018 stands. Reverse portfolio-drift trigger (MR-004 Change E, deferred) would arm at iter 023 if extension surface receives no touches. MR-005 at iter 023 boundary will evaluate Path B balance retroactively.
2. **BUG-07 still open, still blocks Team Trial build entry** — `subscriptionStatus @default("trialing")` in `schema.prisma:16` + signup-route explicit assignment will misfire trial-keyed UI + analytics surfaces. NOT a current revenue leak (entitlements verified to flow through `plan` field), IS a hard blocker for the approved `PRD_TEAM_TRIAL.md`. Live as #40, PRD-promoted; score 11; Effort 1 / Risk 1. **Not targeted until post-Path-B** (iter 023+ candidate). Acceptable because Team Trial build itself has not started — blocker has no downstream consumer right now.
3. **Staleness-cap items KEEP verdict post-iter-019** — #14 (age 11, past cap) and #7 (age 12, past cap) remain open after iter 019 closed #15. MR-005 rescan at iter 023 will be tighter; #14 is the top post-Path-B burn-down candidate.
4. **Remaining P1 billing structural bugs in cold pool** — `PRICING_AUDIT_001.md` still holds #BUG-05 (customer-creation TOCTOU race) and #BUG-06 (atomic quota race). Stripe at-least-once retries can still cause double-grant state drift until these close. Promoted one-at-a-time as P0s burn down.
5. **Scoring formula under-powered (MR-004 Agenda 8)** — 12 items currently within 2 points of live top; `release_blocker_bonus` and `saturation_penalty` dormant; formula is effectively 6 dimensions not 8. Deferred to MR-005 per stability-window discipline (one control variable at a time). Proposed refinements: PRD-bonus + staleness-bonus.
6. Static-harness E2E does not exercise real `chrome.runtime` transport / background service worker — real-extension `launchPersistentContext` tests still pending (iter 010 follow-up #21, originally iter 013)
7. PostHog not yet connected (env vars not set) — analytics only writes to internal DB
8. Extension content layer still has minimal unit test coverage outside target-inspector (capture.ts, state-observer.ts, label-extractor.ts untested)
9. Follow-up pool at **25 items** — iter 019 closed 1 / generated 0; iter 020 closed 0 / generated 3 (#42 v1 retirement per PRD D2, #43 computeInsightChips stale-chip parameter, #44 route sort params). Still well above pool-size ceiling (8). Mode 5 companion-burn-down rule (new guardrail 8) discharged for Path B at iter 019. Remaining Path B iterations (021/022) are net-new code builds, 0–1 closures expected each with 2–4 follow-ups expected each. Post-Path-B iter 023+ is where pool must begin shrinking; MR-005 at iter 023 boundary will re-evaluate whether cool-off re-arms at iter 026+ or later.
10. Invariant I1 (LiveStep-to-DerivedStep correspondence, design doc §5.3) is structurally guaranteed post-convergence but not explicitly tested — flagged as iter-011 follow-up #22
11. `SEGMENTATION_RULE_VERSION` doc/code drift (`docs/invariants.md` L172 vs `rules.ts` L16) — iter-011 follow-up #23

---

## Current Top Opportunities

1. **Iter 026 (Mode 1, `burn-down`, MANDATORY rotation off web-app): Close #14 — Wire `validateRenderedSOP` into `processSession.ts`.** Process-engine area (extension-adjacent, partial reverse-drift relief), past-cap staleness #1 (age 18), Phase-2 dependency, score 11, E=2/R=2. Primary agent: `backend-engineer` (template-rendering validation integration). Validation: `pnpm typecheck` + `pnpm test` green; `validateRenderedSOP` invocation path verifiable in `processSession.ts`; regression test locking validator-in-pipeline behavior. Rationale: simultaneously addresses 3 signals — top staleness item, Area rotation (Path B rotation clock cleared), reverse portfolio-drift trigger (D-1, armed at iter 024) partial relief. Iter 025 MR-005 gate ✅ satisfied.

2. **Iter 027 (Mode 1, `burn-down`, extension surface): Close #7 — Widen policy-engine `credit_card` regex** to cover `credit card` / `credit_card` / `credit-card` variants. Pure policy-engine surface (tracked extension surface) — **fully resolves reverse portfolio-drift trigger D-1 in a single iteration**. E=1/R=1 trivial. Primary agent: `backend-engineer` (policy-engine specialist invocation if available). Validation: regex unit tests cover new coverage; existing test set green.

3. **Iter 028 (Mode 1, `burn-down`, session durability bundle): Close #19 + #20 bundled.** Both extension-app surface, both iter-010 follow-ups past cap, both live in `storage.ts` SW-startup code path — guardrail 7(b) "one logical outcome" satisfied as a pair. Primary agent: `backend-engineer` (or rotate to different agent if consecutive-use counter forces). Validation: GC path test + cross-validation test green; no regression to existing session-persistence tests. **Same-implementer-4+ trigger fires at iter 029 if backend-engineer primary all 3 of 026/027/028** — coordinator must rotate iter 029.

4. **Iter 029 (first eligible `top-score` slot since iter 009): #4 dashboard-level artifact + system-health refresh process** (score 13, agentic CI area, non-web-app, non-extension). Cool-off re-arms after 3 consecutive burn-downs (026/027/028 per plan). This would be the first `top-score` selection in 20+ iterations — the refined-scoring-formula validation event MR-003/MR-004 have been waiting for.

5. **Team Trial feature build** — ✅ **unblocked** (iter 023 closed #40 BUG-07). Design phase entry open. Candidate for a future parallel stream post iter 028.

6. **Pro tier feature build** — unblocked for Design phase entry.

7. Real-extension `launchPersistentContext` E2E (#21, **MR-005 DOWNGRADE**), iter-010 durability follow-ups #19 #20 (iter 028 bundle target), #31 sidepanel test harness (post iter 028 candidate).

---

## Release Blockers

**All Phase-1 release blockers closed as of iter 011.** Table preserved for historical traceability.

| # | Blocker | Opened | Resolved | Iterations unaddressed | Iteration |
|---|---------|--------|----------|-------------------|-----------|
| 1 | LiveStepBuilder ↔ StreamingSegmenter duplication | iter 003 | iter 011 | 8 | **iter 011** (Mode 5 directed item 2/2) |
| 2 | Session event persistence for SW restart recovery | iter 000 | iter 010 | 9 | iter 010 (Mode 5 directed item 1/2) |
| 3 | Playwright E2E tests for recording lifecycle | iter 000 | iter 009 | 8 | iter 009 (1-in-5 blocker-cadence forced selection) |

**Resolved in iter 011**: Segmentation convergence — `LiveStepBuilder`, `StreamingSegmenter`, `buildDerivedSteps`, `segmentEvents` all flow through the single `@ledgerium/segmentation-engine` primitive. ADR-001 Phase 1 complete for segmentation. 12 golden fixtures × 2 contracts × byte-identity assertions form the regression gate. 79 net new tests.
**Resolved in iter 010**: Session event persistence for SW restart recovery — all four arrays (raw/canonical/policy/live) debounced to `chrome.storage.local` per-session; quota-overflow append-stop; schema-version guard; `onSuspend` flush; 16 new unit tests + 2 integration tests + 1 Playwright smoke.
**Resolved in iter 009**: E2E Playwright lifecycle tests — 3 tests covering idle → recording → complete, plus CI wiring via `e2e-extension.yml` (runs on push/PR to main).
**Resolved in iter 008**: shared capture-policy enforcement — now integrated via `classifySensitivity` in `target-inspector.ts`.
**Resolved in iter 003**: extension background logic deduplicated (normalization-engine, segmentation-engine, policy-engine imports).

### Release-blocker burn rate
- 5-loop window (iter 007–011): **3 closed** (E2E tests iter 009; session persistence iter 010; segmentation convergence iter 011)
- Target under 1-in-5 cadence rule: ≥ 1 closed per 5-loop window → **exceeded 3× (3 of last 5)**
- **All Phase-1 blockers now closed.** Future blockers will be surfaced during Phase 2 planning.

---

## Recommended Next Iteration

**Iter 026 (Mode 1, `burn-down`, MANDATORY): Close #14 — Wire `validateRenderedSOP` into `processSession.ts`.** Past-cap staleness #1 (age 18), Phase-2 dependency, process-engine area (extension-adjacent), score 11, E=2/R=2.

Primary agent: **backend-engineer** (template-rendering validation integration; delegation rubric match).

Rationale:
- **Staleness-cap compliance:** #14 is the oldest open follow-up at age 18; MR-005 staleness triage verdict KEEP (2026-04-21, per `MR_005.md` Agenda 6). Deferring further accumulates meta-review debt.
- **Area rotation compliance:** Path B ran 5 consecutive web-app iterations (020/021/022/023/024). Process-engine area rotates off web-app cleanly; `saturation_penalty` resets.
- **Reverse portfolio-drift trigger (D-1) partial relief:** process-engine is extension-adjacent; iter 026 provides partial relief of the armed D-1 trigger. Full relief at iter 027 via #7 (policy-engine pure extension surface).
- **Follow-up pool ceiling:** pool at 33 (>>8 soft ceiling; ~2× D-2 hard-stop ceiling at 15). Burn-down is mandatory under clause 6.

### Mandatory sequencing (iter 026-028 burn-down window)

1. **Iter 026 (Mode 1 burn-down):** close #14. Validation: `pnpm typecheck` + `pnpm test` green; `validateRenderedSOP` invocation path verifiable in `processSession.ts`; regression test locking validator-in-pipeline behavior.
2. **Iter 027 (Mode 1 burn-down):** close #7. Validation: regex unit tests cover `credit card` / `credit_card` / `credit-card`; existing test set green. Fully clears reverse portfolio-drift trigger D-1.
3. **Iter 028 (Mode 1 burn-down):** close #19 + #20 bundled. Validation: GC path test + cross-validation test green; no regression to session-persistence tests. Guardrail 7(b) one-logical-outcome preserved.
4. **Iter 029 (first eligible `top-score` slot since iter 009):** cool-off re-arms after 3 consecutive burn-downs. Candidate: #4 dashboard-level artifact + system-health refresh process (score 13, non-web-app, non-extension).
5. **Iter 028 boundary:** MR-006 earliest (3-loop stability window from MR-005 at iter 025).

### Candidates for post-Path-B burn-down cadence (iter 023+)

- **#40** BUG-07 Remove silent `subscriptionStatus @default("trialing")` — score 11 (PRD-promoted, billing/schema hygiene, E=1/R=1, unblocks Team Trial build)
- **#14** Wire `validateRenderedSOP` into `processSession.ts` — score 11 (past cap by iter 023)
- **#31** Bootstrap sidepanel component test harness — score 11 (iter 014 follow-up, quality assurance)
- **#19** GC stale `ledgerium_active_session_events_*` keys — score 11 (iter 010 follow-up, session durability)
- **#7** Widen policy-engine `credit_card` regex — score 11 (iter 008 follow-up, past cap by iter 018 → flag for MR-005)
- **#36** G-02 Upgrade link at 80% quota — score 11 (audit-intake, UX/conversion)

### Meta-review trigger check (post iter 018)
- Loops since Meta-Review 004: **0** (iter 018 = MR-004 itself). Base cadence fires at iter 023 boundary.
- Post-meta-review stability window: expires at iter 021 (3 bounded loops post-MR-004 per MR-001 floor rule; iter 019 + 020 + 021 = 3 bounded iterations).
- Early-trigger conditions:
  - 3-consecutive-same-Area: Path B will run 4 consecutive web-app iterations (019 code-hygiene → 020 web-app lib → 021 web-app UI → 022 web-app E2E). If #15 is counted as web-app-adjacent rather than extension-adjacent, this triggers 3-in-a-row at iter 021. User-acknowledgement captured at iter 018 start per guardrail 6 escalation — trigger pre-neutralized for this sequence.
  - Same-implementer 4+: backend at 019 + 020 + 021 = 3 if frontend primary takes 021 instead (recommended). Rotation preserves trigger distance.
  - Follow-up accumulation > 10: pool 23; above ceiling. Guardrail 8 holds one closure at iter 019 (pool → 22); net-zero or slow-growth expected during 020/021/022.
  - Validation-failure run: 0 (iter 018 had no code to fail).
  - Portfolio-drift trigger (MR-003 Change D): counter at 0 post-iter-017 (MR-004 Agenda 4 ruled test-only touches DO count). Path B iter 019 is borderline code-hygiene → shared constants; iter 020–022 are web-app. Reverse portfolio-drift trigger (MR-004 Change E, deferred) will arm iter 023+ if extension surface receives no touches.
- Staleness-cap scan: **#15 targeted iter 019 (pre-close);** **#14 will reach age 11 post-iter-019 (past cap, MR-005 rescan);** **#7 reaches cap at iter 018 → flagged for MR-005.**
- Closure-ratio trajectory: iter 018 = 0 closure + 0 generation = unchanged (non-counting for KPI purposes — Mode 4 + artifact-only). Iter 019 = +1 closure expected. Rolling 10-iter ratio target ≥0.25 still achievable if iter 019 lands cleanly.
- Autonomous-vs-directed sub-partition: `top-score` **still 1/10** (no autonomous opportunity in Path B — all iter 019–022 are `burn-down` or `directed`). Cool-off re-arm opportunity at iter 025+ at earliest (requires 3 consecutive burn-downs post-Path-B).

## Meta-Review Status

- Completed loops since initialization: **24 bounded iterations (iter 001–024; iter 015 + 018 + 025 = Mode 4 meta-reviews, do not count toward cadence; Mode 3 corrections at iter 016→17 + iter 020 + iter 021 do not count toward cadence)**
- Last meta-review: **Meta-Review 005 (2026-04-21, covering iter 019–024 Path B + Mode 3 @iter 020)** — see `docs/meta/MR_005.md`
- Prior meta-reviews: MR-004 (2026-04-20, iter 014–017 + M3) `docs/meta/MR_004.md`; MR-003 (2026-04-20, iter 012–014) `META_REVIEW_003.md`; MR-002 (2026-04-19, iter 009–011) `META_REVIEW_002.md`; MR-001 (2026-04-17, iter 004–008) `META_REVIEW_001.md`
- Bounded loops completed since MR-005: **0** (iter 025 = MR-005 itself). Iter 026/027/028 will increment counter to 3 (MR-006 earliest trigger).
- MR-005 applied **7 governance diffs** this iteration (D-1 through D-7): D-1 reverse portfolio-drift trigger at N=5 (CLAUDE.md § Meta-Review Cadence early-triggers); D-2 scaled Mode 5 companion burn-down ⌈N/3⌉ + hard-stop ceiling pool>15 (CLAUDE.md § Operating Modes clause 8 replacement + new clause 9); D-3 fourth density-response option `scope-guard-adjacent` (CLAUDE.md § Follow-Up Debt Policy clause 4); D-4 specialist-invocation gate (CLAUDE.md § Operating Model — new subsection); D-5 Audit-Intake Pattern codification (new CLAUDE.md section between Follow-Up Debt Policy and Coding Standards); D-6 test-only-touch counting (inline parenthetical on portfolio-drift line); D-7 Mode 5 sequence-length soft cap at N=5 (new clause 10).
- **Supersedes:** D-2 supersedes MR-004 Change A (singular "at least one" replaced with ⌈N/3⌉ scaling); D-6 supersedes MR-004 Change F (deferred); D-5 supersedes MR-004 Change D (deferred); D-1 supersedes MR-004 Change E (deferred, with threshold tightened to N=5). All three MR-004 deferred changes now codified.
- **MR-005 staleness triage:** 14 past-cap items triaged. **KEEP (10):** #7 #14 #19 #20 #23 #24 #26 #27 #29 #30 #31 (minus #15 closed iter 019). **DOWNGRADE (3):** #21 #28 #32 (annotated inline in `IMPROVEMENT_BACKLOG.md`). **DELETE (0).**
- **Next meta-review trigger: BASE-CADENCE at iter 028 boundary** — 3 bounded loops post-MR-005 (iter 026 + 027 + 028). Stability window runs through iter 028 (MR-001 floor rule).
- Early-trigger watch for iter 026-028:
  - Reverse portfolio-drift (D-1): ARMED at iter 024 close. Clears at iter 026 if #14 selected as programmed; full relief at iter 027 via #7 policy-engine.
  - Pool-size ceiling (clause 6): violated (pool 33 >> 8). Automatic burn-down forcing satisfied by iter 026-028 programming.
  - Cool-off re-arm (clause 7): requires 3 consecutive burn-downs — iter 026+027+028 = re-armed iter 029.
  - Mode 5 hard-stop (D-2 clause 9): fires only inside Mode 5; no Mode 5 expected through iter 028.
  - Same-implementer 4+: `backend-engineer` recommended for all 3 of 026/027/028 (delegation rubric match). Trigger fires at iter 029 if 4th consecutive backend; coordinator MUST rotate iter 029 to frontend or qa or a specialist.
- Status: **MR-005 complete; stability window open through iter 028; MR-006 earliest iter 028 boundary**

### Meta-Review 001 headline findings

1. Scoring formula deprioritized release blockers → added `release_blocker_bonus` (+3) and `saturation_penalty` (−2) terms.
2. Agent orchestration collapsed to `backend-engineer` for 5 consecutive loops → Delegation Decision Rubric added to `coordinator.md`.
3. Zero release blockers closed in 5 loops → 1-in-5 forced-rotation rule added.
4. Follow-up debt accumulating at ~1.2 per loop with 0 burn-down → 1-in-5 burn-down rule added.
5. Mode 5 (Directed Sequence) formalized in CLAUDE.md.

### Key behavior changes enacted (verified)

- Iter 009 selection: **Playwright E2E tests** (release-blocker bonus + SOP saturation penalty forced the pivot) ✅ landed
- Iter 009 implementer: **qa-engineer + devops-engineer** (first non-backend-engineer loop since iter 003) ✅ landed
- Release-blocker burn rate: 0/3 → **1/3** (E2E tests closed) ✅
- Selection formula verified discriminating: iter 009 final score 15 beat competitors by 1–2 points under new formula (would have tied or lost under the old formula)

---

## Confidence Notes

This system-health view is grounded in the current engineering brief and seeded improvement backlog. It should be refreshed after:
- the first direct repo review in Claude Code
- every completed improvement loop
- any material phase change
