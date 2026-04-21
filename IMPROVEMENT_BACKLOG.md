# Ledgerium AI — Improvement Backlog

Last updated: 2026-04-21 (post-**Path C (v3 Process Intelligence Metrics Engine) Define lane (Mode 3-adjacent, NON-counting) — CEO-directed**); 8 Define-phase specialist agents consulted in parallel (`product-manager` · `system-architect` · `ux-designer` · `qa-engineer` · `growth-strategist` · `analytics` · `competitive-researcher`); 8 artifacts produced under `docs/features/dashboard-v3-metrics-engine/` (INPUT_SPEC 750 LOC · PRD_METRICS_ENGINE 594 LOC · ARCHITECTURE_METRICS_ENGINE 1,218 LOC · UX_FLOWS_METRICS_ENGINE 513 LOC · TEST_PLAN_METRICS_ENGINE 755 LOC · MEASUREMENT_PLAN_METRICS_ENGINE 811 LOC · COPY_PACK_METRICS 714 LOC · COMPETITIVE_VALIDATION_METRICS ~180 LOC coordinator-synthesized; authoritative full output persisted in tool-results JSON); coordinator synthesis `PATH_C_SEQUENCING.md` (~300 LOC) locks 17 CEO open questions + Path C Phase A/B split (iter 032-037 + iter 038-042) + mandatory meta-coordinator Mode 4 pre-check per MR-005 D-7. **Zero live-backlog rows added** — Define phase is pre-PRD-approval; DV2-R05 (seed fixture + free-tier user) and DV2-R06 (v1 shadow-function route audit) stand ready for MR-005 D-5 clause 5 PRD-trigger promotion upon PRD_METRICS_ENGINE approval (both cited in PRD_METRICS_ENGINE DEP-03). Iter 027-031 burn-down program unchanged. Pool unchanged at **35 open** (no-code, Mode 3-adjacent non-counting). Prior 2026-04-21 DASHBOARD_V2_REVIEW_001 intake entry preserved below.

Previous: 2026-04-21 (post-**DASHBOARD_V2_REVIEW_001 multi-agent diagnostic audit (Mode 3-adjacent, NON-counting)**); 8 specialist agents consulted in parallel (`product-manager` · `ux-designer` · `system-architect` · `frontend-engineer` · `backend-engineer` · `qa-engineer` · `analytics` · `growth-strategist`); consolidated artifact at `docs/meta/DASHBOARD_V2_REVIEW_001.md` (150 lines; Executive Summary; 8-lens Verdict Matrix; 27 findings classified P0/P1/P2/P3 per MR-005 D-5 Audit-Intake Pattern; Cross-Cutting Themes section; GA/Launch Decision Matrix; Recommended Iter Sequencing iter 027→032+). **P0-only live promotion at intake (D-5 clause 2):** **3 rows added (DV2-R01, DV2-R02, DV2-R03)** with `Birth iter: DV2-REVIEW-001`. **P1 cold pool (11 items DV2-R04→R14), P2 cold pool (10 items DV2-R15→R24), P3 cold pool (3 items DV2-R25→R27)** held in artifact per D-5 clauses 4+5; promote via P0 burn-down creating slot OR PRD-trigger citation. **Pool trajectory: 32 → 35 at intake commit** — re-violates MR-002 Change C hard ceiling (35 > 15). MR-005 post-intake burn-down programming: iter 027 (#7) + iter 028 (#19+#20) remain as programmed; **iter 029 first `top-score` eligible slot** — tie-break recommendation DV2-R01 over #51 (rationale: executes without PostHog gating, directly unblocks #42, ~1-day server-side script vs multi-component instrumentation pass); **iter 030 = #51** analytics instrumentation; **iter 031 = DV2-R02 + DV2-R03 bundled** under guardrail 7(b) one-logical-outcome = "WorkflowRow interaction hardening" (both in `WorkflowRow.tsx`, both UX/a11y). GA status: v2 shipped at flag-on iter 021, default at `/dashboard` iter 022, soak window open, **NOT externally-launch-ready, NOT #57-flag-retirement-ready**. Dominant debt themes: (1) measurement entirely uninstrumented (#51 + DV2-R01 collectively block #42/#57/#59/#61/PRD §4 baseline/external-launch measurement read), (2) 2 executive-grade UX breaches untracked (native-dialogs DV2-R02 + tooltip-keyboard-dismiss DV2-R03 — WCAG 2.1 SC 1.4.13), (3) real #42 blocker is route's v1 shadow functions (DV2-R06 cold pool), not just `computeHealthScore()`. This review does NOT increment improvement-loop cadence counter (Mode 3-adjacent diagnostic). Prior iteration 026 entry preserved below.

Previous: 2026-04-21 (post-**iteration 026 — #14 `validateRenderedSOP` wired into process-engine pipeline (Mode 1, `burn-down`)**); new `packages/process-engine/src/processSessionFull.ts` (68 LOC pure composed function: `processSession` → `renderTemplates` → `validateRenderedSOP`) + 14-test regression suite `processSessionFull.test.ts` (384 LOC); `packages/process-engine/src/index.ts` +2 lines exporting `processSessionFull` + `ProcessSessionFullResult`; zero changes to existing `processSession.ts` (Option A design — preserves contract depended on by web-app API route, extension BG job, 116+ fixture tests); typecheck clean; process-engine package **429 → 443** tests; workspace **1728 → 1742** tests; zero follow-ups generated. **#14 closed** (past-cap staleness #1, 19 iterations old at close). Pool **33 → 32**. Area rotation OFF web-app (process-engine = tracked Phase-2 surface; extension-adjacent partial reverse-drift relief — full relief arrives iter 027 #7 policy-engine). D-4 specialist-invocation gate evaluated: 68 LOC << 200 LOC threshold, `system-architect` adjacency not required; no user-visible copy strings, `growth-strategist` adjacency not required. Agent-diversity: `backend-engineer` = 1 consecutive (iter 025 Mode 4 `meta-coordinator` excluded from counter). Cadence counter +1 → 1/3 toward MR-006. Cool-off 3-consecutive-burn-down streak = 1 of 3; re-arms at iter 029 if iter 027 + iter 028 also burn-down as programmed. Prior iteration 025 MR-005 entry preserved below.

Previous: 2026-04-21 (post-**iteration 025 — MR-005 meta-review (Mode 4, governance-only; NO product code changes)**); MR-005 artifact written at `docs/meta/MR_005.md` covering iter 019→024 Path B (6 bounded loops) + Mode 3 principal-review @iter 020. **7 CLAUDE.md governance diffs applied:** D-1 reverse portfolio-drift trigger at N=5 consecutive non-extension iterations (separately-logged `reverse-portfolio-drift: user-ack` required; Mode 5 precedence does NOT auto-suppress) · D-2 scaled Mode 5 companion burn-down ⌈N/3⌉ + hard-stop ceiling at pool>15 (supersedes MR-004 Change A singular "at least one" language) · D-3 fourth density-response option `scope-guard-adjacent` (per-follow-up anchor to PRD section / architecture decision / blocked-on-other-item; stricter than `acknowledged, carried forward`) · D-4 specialist-invocation gate (`growth-strategist` MUST be adjacent on ≥3 user-visible copy strings; `system-architect` MUST be primary/adjacent on new-contract ≥200 LOC pure module) · D-5 Audit-Intake Pattern codified as new CLAUDE.md section (cold pool + P0-only live promotion + PRD-trigger promotion; formalizes `PRICING_AUDIT_001.md` working convention) · D-6 test-only-touch counting rule (supersedes MR-004 Change F; `*.test.ts`/`*.test.tsx`/`*.spec.ts` modifications within tracked surfaces DO count as surface coverage) · D-7 Mode 5 sequence-length soft cap at N=5 (N ≥ 6 requires meta-coordinator pre-check; `mode-5-length-override: user-ack` available). **Staleness triage complete** (14 past-cap items; `(025 − Birth iter) ≥ 10`): 10 KEEP (#7 #14 #19 #20 #23 #24 #26 #27 #29 #30 #31), 3 DOWNGRADE (#21 #28 #32 — annotated inline), 0 DELETE. **Iter 026-028 burn-down programming fixed:** iter 026 = #14 (process-engine, extension-adjacent, past-cap #1, score 11; rotates off web-app) · iter 027 = #7 (policy-engine, full reverse-drift relief, E=1/R=1) · iter 028 = #19+#20 bundled (session durability, same `storage.ts` SW-startup path, guardrail 7(b) one-logical-outcome preserved). First `top-score` slot eligible iter 029 (cool-off re-arms after 3 consecutive burn-downs). Pool unchanged at **33 open** (Mode 4 no-code). Pool-shrinkage targets: ≤25 by iter 028 close; ≤15 by iter 035 (restores ceiling diagnostic value). Reverse portfolio-drift trigger **armed at iter 024 close** (5 consecutive non-extension iters: 020/021/022/023/024 web-app + iter 019 process-engine non-extension); clears at iter 026 close if programmed #14 selected. Saturation log: iter 025 = Mode 4, non-counting for Area saturation (still `governance` area, independent of Path B rotation clock). Prior iteration 024 entry preserved below.

Previous: 2026-04-21 (post-**iteration 024 — v2 Dashboard executive refinement (Mode 5 item 6/6 — Path B complete)**); §4.1 items (a)–(f) of `PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md` delivered as one logical outcome — portfolio delta in Command Header (30d current vs 30d prior; null when prior-window <3 workflows), action-leading chip copy rewrite (filterKey contract preserved), 3-state RAG color pip on Health Score cells + global threshold alignment 40/70 → 60/80, "High variation" badge on Name cell (`variationLabel === 'high'` only; v1 scope), "Needs attention" pinned filter chip as FIRST element in filter bar (v1 predicate: `health < 60 OR variationLabel === 'high'`; delta ≤ −10 arm deferred to #60), run-count qualifier `n=N` when `runs < 10` + `n=0 — no runs` when null. 11 files modified + 1 new test file (`CommandHeader.test.ts`, 15 tests). Web-app package test count **245 → 289** (+44); typecheck clean. New exports in `workflow-metrics.ts`: `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` constant + `computePortfolioHealthScorePrior()`. `/api/workflows` route extended with `portfolioHealthScorePrior` + `portfolioHealthScoreDelta` in `stats`. scope-expansion: approved (global 60/80 threshold alignment — PRD §2.4 locks globally, partial application would contradict; guardrail 7 a–e satisfied). mode-5-saturation: user-ack (5th consecutive web-app iteration; CEO ack reaffirmed 3× — 2026-04-20 + 2026-04-21 executive-refinement + 2026-04-21 Option A). density-response: acknowledged, carried forward (4 follow-ups generated — #58/#59/#60/#61, all scope-boundary post-launch items). ceiling-cool-off: NOT invoked (Mode 5 directed precedence; MR-004 Change B exclusion). Path B CLOSED — 6-iteration sequence (018 PRD → 019 burn-down → 020 metrics → 021 UI → 022 a11y/E2E → 023 BUG-07 interrupt → 024 exec refinement). Agent diversity across Path B: 3:3 backend:frontend. Row #54 struck through (iter-024 target done; was governance-not-debt); +4 new follow-ups #58-#61. Pool **29 → 33 open** (ceiling deeply violated; MR-005 mandatory at iter 025 boundary MUST triage aggressively). Prior iteration 023 entry preserved below.

Previous: 2026-04-21 (post-**iteration 023 — BUG-07 subscriptionStatus default fix (Mode 2 targeted fix)**); new free users now assigned `subscriptionStatus = 'none'` instead of silent `'trialing'`; 2-line change (`schema.prisma:16` + `signup/route.ts:43`) + 1 new regression test file (`signup/route.test.ts`, +87 LOC, single BUG-07 assertion); `prisma db push` applied to local SQLite (141 ms); no migration file (project uses db-push pattern; row #12 is separate scope guard); no retroactive backfill (scope-creep risk; optional product decision); no `account/page.tsx` edits (`statusLabels['none']` already renders "Free" at lines 74-77); web-app package test count **244 → 245** (+1 regression test); typecheck clean; callsite audit confirms zero `subscriptionStatus === 'trialing'` gating logic anywhere (all remaining `'trialing'` literals are legitimate Stripe webhook paths at `webhook/route.ts:104, 111` + `webhook/route.test.ts:151, 177`). Unblocks `PRD_TEAM_TRIAL.md` Dependency §11a. Row #40 closed; pool **30 → 29**. Zero follow-ups generated. Mode 2 precedence bypasses ceiling rule + saturation rule (iter 023 = 4th consecutive web-app iteration; CEO saturation user-ack reaffirmed 2026-04-21 still applies). Agent diversity: `backend-engineer` = 1 (resets frontend-engineer streak of 2). MR-005 shifts iter 024 → iter 025. Prior iteration 021/022 entries preserved below.

Previous: 2026-04-21 (post-**iteration 021 — v2 Dashboard UI build (Mode 5 item 4/5, PRD_DASHBOARD_V2 §5 + §8 + §9 + post-Mode-3 contract)**); 8 new components under `apps/web-app/src/components/dashboard-v2/` (DashboardV2Shell, CommandHeader, InsightsStrip, WorkflowList state-machine, WorkflowListFilterBar, WorkflowRow + barrel + 3 co-located test files); `/dashboard?v2=1` flag-gated route; 5 UI states reachable (loading/empty/no-results/error/sparse/ready); plan-gated breakdown tooltip with honest dimension labels (Speed/Consistency/Data Quality/Standardization — `FORBIDDEN_LABELS` negative-assertion test enforces absence of efficiency/reliability); positive `'healthy'` tag + `'positive'` chip severity rendered; 4-column verdict grid per PRD §5.3 post-Mode-3; design-token compliance per §5.4 (typography 12/14/16/20/28, spacing grid, radii 6/10, monochrome + 3 semantic hues, ≤150ms motion); typecheck clean; web-app package 11 test files / 233 tests passing; v1 dashboard untouched. **8 follow-ups generated** (#45 system icon mapping, #46 TanStack Query adoption, #47 useSearchParams Suspense wrap, #48 D1 auto-redirect, #49 kebab "Edit name"/"Archive" wiring, #50 D7 "(all-time)" annotation, #51 v2 analytics instrumentation, #52 PortfolioSidebar D5 integration, **#53 workspace vitest `.test.tsx` discovery gap — coordinator-generated from retracted scope expansion**); pool **25 → 34 open**; density-response: acknowledged-and-carried-forward (structural, not pathological — detailed-PRD build iterations surface legitimate adjacencies; several are iter-022 polish candidates; MR-005 at iter 023 will triage aggressively); commit pending.  

Previous: 2026-04-20 (post-**iteration 020 — workflow-metrics engine (Mode 5 item 3/5, PRD_DASHBOARD_V2 §7)**); new pure module `apps/web-app/src/lib/workflow-metrics.ts` with 8 exported functions + 21 named threshold constants; `computeHealthScoreV2` (CEO's 0.30/0.30/0.20/0.20 formula) + `computeOpportunityTag` (Automate/Standardize/Optimize/Monitor/None decision tree) + per-workflow + aggregate functions; 5 PRD §11 fixture archetypes + 62 unit tests + 4 route integration tests; API route enriches each workflow with `metricsV2` + stats with `portfolioHealthScore` + `insightChips`; v1 `computeHealthScore()` preserved per D2 parallel-run directive; 1718/1718 tests passing (+66 vs iter 019); **3 follow-ups generated** (#42 v1 retirement post-Path-B per D2, #43 computeInsightChips staleCount param, #44 route sort params); pool **22 → 25 open**; density-response: acknowledged-and-carried-forward; zero UI changes; commit `afb1250`.  
Current phase: Phase 1  
Backlog purpose: maintain a ranked, evidence-based portfolio of the highest-value fixes, improvements, and experiments for bounded improvement loops.

## Scoring Formula

```text
priority_score =
    impact + alignment + learning + confidence
  − effort − risk
  + release_blocker_bonus      # +3 if item is in SYSTEM_HEALTH.md Release Blockers
  − saturation_penalty          # −2 if 3 of last 5 iterations landed in the same Area
```

Scoring scale:
- 1 = very low
- 3 = medium
- 5 = very high

Higher total score = higher priority. Post Meta-Review 001: range widened to ~6–18 (was 10–16).

### Saturation status (computed over iter 011–016 — rolling 5 bounded loops; iter 015 is Mode 4 and does not consume Area cadence)

- Extension-architecture / segmentation area = 1 of last 5 (iter 011)
- Invariants / testing area = 2 of last 5 (iter 012, iter 013) — cluster cleared; 2 more non-invariants loops aged it out
- UX resilience area = 1 of last 5 (iter 014)
- Web-app UI area = 1 of last 5 (iter 016) — **new entry**; first web-app bounded loop since iter 001, partial Signal-5 portfolio-drift relief
- Session-durability area = 0 of last 5 (iter 010 aged out)
- No 3-in-a-row; no `−S` penalties currently apply. Area diversity remains strong (4 distinct areas in rolling 5-loop window).

### Portfolio override rules

See `CLAUDE.md § Selection Policy` — any of these overrides top-score:
1. Release-blocker minimum cadence (1-in-5)
2. Area saturation rule
3. Follow-up burn-down (1-in-5)

---

## Portfolio Summary

- Total candidates reviewed: 69 (50 prior + 9 iter-021 follow-ups + 3 iter-022 follow-ups + 4 iter-024 follow-ups + **3 DASHBOARD_V2_REVIEW_001 P0 intake promotions (DV2-R01 distribution comparison, DV2-R02 kebab inline interactions, DV2-R03 tooltip keyboard dismiss)** — iter 022 closed 5: #47 via Mode 3 commit `6799604` + #48/#49/#50/#52 via iter-022 code; iter 023 closed #40 BUG-07; iter 024 closed #54 (governance-tracking row, not debt); iter 026 closed #14)
- **Next iteration:** **iter 027 = #7 Widen policy-engine `credit[_-]?card` regex** (`burn-down`, MANDATORY, **fully resolves reverse portfolio-drift trigger D-1 in a single iteration**) — policy-engine area (tracked extension surface), past-cap staleness #1 after iter 026 (age 18), score 11, E=1/R=1 trivial. Primary agent: `backend-engineer`. Entry gate: iter 026 committed; `processSessionFull` exported from process-engine package (confirmed). Validation: regex unit tests cover `credit card` / `credit_card` / `credit-card` variants; existing test set green. Rationale: simultaneously addresses 3 signals — top remaining staleness item (#14 closed iter 026), reverse portfolio-drift D-1 full relief (policy-engine is D-1-enumerated tracked extension surface), cool-off streak 2 of 3.
- **Iter 026 completed:** **#14 Wire `validateRenderedSOP` into `processSession` pipeline (Mode 1, `burn-down`).** Primary agent: `backend-engineer`. Files: NEW `packages/process-engine/src/processSessionFull.ts` (68 LOC pure composed function: `processSession → renderTemplates → validateRenderedSOP`) + NEW `processSessionFull.test.ts` (14 tests, 384 LOC) + `packages/process-engine/src/index.ts` +2 exports. Zero changes to existing `processSession.ts` (Option A design choice — preserves contract consumed by web-app API route, extension BG job, 116+ fixture tests). Typecheck clean. Process-engine package **429 → 443 tests** (+14). Workspace **1728 → 1742** (+14). D-4 specialist-invocation gate evaluated cleanly: 68 LOC << 200 LOC threshold; no ≥3 copy strings; neither `system-architect` nor `growth-strategist` adjacency required. Zero follow-ups generated (density-trigger clause 3 did not fire). #14 closed (past-cap staleness #1 — 19 iterations old at close). Pool **33 → 32** (first net shrinkage since iter 023). Cadence counter +1 → 1/3 toward MR-006. Cool-off streak = 1 of 3. Reverse portfolio-drift D-1 remains armed at iter 026 close (process-engine is extension-adjacent, not a D-1-enumerated tracked extension surface); full relief arrives iter 027 with policy-engine touch #7.
- **Iter 025 completed:** MR-005 meta-review (Mode 4, governance-only). Triggering conditions BOTH fired: base 3-loop cadence (6 bounded loops post-MR-004: 019+020+021+022+023+024 = 2× base) AND Mode 5 guardrail 4 (Path B sequence of ≥3 items completed). Primary agent: `meta-coordinator`. Zero product code changes (Mode 4 rule). Output: `docs/meta/MR_005.md` + 7 CLAUDE.md governance diffs applied (D-1 reverse portfolio-drift trigger · D-2 scaled companion-burn-down + hard-stop ceiling · D-3 fourth density-response · D-4 specialist-invocation gate · D-5 audit-intake codification · D-6 test-touch counting · D-7 Mode 5 sequence-length soft cap). Supersedes: MR-004 Change A (D-2 scaled replacement) + MR-004 Change F (D-6 applied). Staleness triage: 10 KEEP, 3 DOWNGRADE (#21/#28/#32), 0 DELETE. Next meta-review (MR-006) earliest iter 028 (3-loop stability window from iter 025).
- Open follow-up pool (Birth iter shown): **#7 (008, age 18 — past staleness cap #1 post-iter-026, iter 027 target)** · ~~#14 (007 — closed iter 026)~~ · ~~#15 (006 — closed iter 019)~~ · #19/20 (010, age 16 — past cap, KEEP, iter 028 bundle target) · #21 (010, age 16 — past cap, **MR-005 DOWNGRADE**) · #23/24 (011, age 15 — past cap, KEEP) · #26 (012, age 14 — past cap, KEEP) · #27 (M3@012, age ~14 — past cap, KEEP) · **#28 (M3@012, past cap, MR-005 DOWNGRADE)** · #29/30 (013, age 13 — past cap, KEEP) · #31 (014, age 12 — past cap, KEEP) · **#32 (014, past cap, MR-005 DOWNGRADE)** · #34/35/36 (audit-intake P0, age ~9) · #37/38/39 (M3@016 follow-ups) · ~~#40 (PRD-promoted BUG-07 — closed iter 023)~~ · **#41 (iter 017 follow-up)** · **#42/#43/#44 (iter 020 follow-ups)** · **#45/#46 (iter 021 — carried)** · ~~#47 (iter 021 — closed Mode 3 `6799604`)~~ · ~~#48/#49/#50 (iter 021 — closed iter 022)~~ · **#51 (iter 021 — analytics, post-launch target, score 13)** · ~~#52 (iter 021 — closed iter 022)~~ · **#53 (iter 021 coordinator-generated)** · ~~#54 (iter-024-target row; governance-tracking not debt — closed iter 024)~~ · **#55/#56/#57 (iter 022 follow-ups)** · **#58/#59/#60/#61 (iter 024 follow-ups)** · **DV2-R01/R02/R03 (DV2-REVIEW-001 audit-intake P0 — 2026-04-21)** — **35 items open** (+3 net from DASHBOARD_V2_REVIEW_001 audit-intake P0 promotion; re-violates hard ceiling 35 > 15; post-intake burn-down trajectory iter 027 (−1 #7) → 34; iter 028 (−2 #19+#20 bundle) → 32; iter 029 (−1 DV2-R01 or #51) → 31; iter 030 (−1 other) → 30; iter 031 (−2 DV2-R02+R03 bundle) → 28; iter 035 ≤15 target requires ~13 more closures in iter 032-035 which is achievable only with additional bundled iterations or multi-item closures).
- **MR-005 staleness-cap verdicts (2026-04-21, per MR_005.md Agenda 6):** 14 past-cap items triaged. **KEEP (10):** #7 (policy-engine regex, iter 027 target) · #14 (validateRenderedSOP wiring, iter 026 target, past-cap #1) · #19/#20 (session GC + cross-validation, iter 028 bundle target) · #23 (SEGMENTATION_RULE_VERSION doc drift) · #24 (LiveStep type tightening) · #26 (DerivedStep byte-identity) · #27 (E2E seed mismatch) · #29 (pnpm filter resolution) · #30 (rapid focus-blur fixture) · #31 (sidepanel test harness). **DOWNGRADE (3):** #21 (E=4 blocks easy selection; revisit MR-006) · #28 (lower-score edge case) · #32 (cosmetic DRY). **DELETE (0).** Audit-intake rows #34/#35/#36 age ~8 — below 10-cap, flag for MR-006 if still open at iter ~28-30. Prior MR-004 verdicts: ~~#15 KEEP CLOSED iter 019~~; #14 KEEP ROLLED to MR-005 iter 026; #7 KEEP ROLLED to MR-005 iter 027.
- **Path B companion-burn-down compliance (MR-004 Change A, new guardrail 8):** Mode 5 sequence of ≥3 items with pool > 8 requires one burn-down iteration within or preceding the sequence. Path B = 5 items (018 PRD ✅ → 019 burn-down ✅ → **020 metrics ✅** → 021 UI → 022 polish). Iter 019 = burn-down #15 SATISFIED (2026-04-20, commit `eca703c`). Obligation discharged; remaining Path B iterations (021, 022) can proceed without further companion-burn-down gating. **MR-005 at iter 023 boundary will re-evaluate** whether the post-Path-B pool (projected 25 + iter 021 follow-ups + iter 022 follow-ups) warrants a second burn-down-heavy window.
- **Mode 5 saturation acknowledgement (MR-004 Change C, escalated guardrail 6):** `mode-5-saturation: user-ack; rationale: CEO explicit approval 2026-04-20 for 4 consecutive web-app iterations iter 019–022 under full knowledge of extension/segmentation/normalization/policy surface drought.` Recorded per new guardrail 6 wording.
- **Audit intake pattern (unchanged):** only P0 items in live backlog. P1/P2/P3 cold-pool items (≈26 remaining after BUG-07 promotion) held in `PRICING_AUDIT_001.md`. MR-004 Agenda 1 verdict: **keep, with codification** — audit-intake pattern will be formalized in CLAUDE.md at post-Path-B governance iteration (iter 023+; one of the 3 deferred MR-004 diffs).
- **PRD-trigger promotion pattern (unchanged):** BUG-07 remains the sole instance. MR-004 Agenda 2 verdict: **formalize as rule** — will be codified in CLAUDE.md at post-Path-B governance iteration alongside audit-intake codification (same deferred diff batch).
- Highest-risk unresolved items: ~~**#40 BUG-07 (PRD-promoted, score 11, hard blocker for approved Team Trial feature — post-Path-B target)**~~ **closed iter 023**; remaining: **#14 (past-cap staleness; post-Path-B target)**, iter-010 follow-ups #19–21, **#51 v2 analytics instrumentation (PRD §4 measurable-outcome dependency, score 13 — post-Path-B priority)**.
- Last completed work: **iter 022 — v2 Dashboard a11y + polish + E2E (Mode 5 item 5/6).** 17 files (12 modified + 5 new). +11 web-app tests (6 D7 annotation + 5 kebab body-shape); web-app package 233 → 244 tests. 4 new Playwright E2E specs (`v2-a11y` with axe-core, `v2-happy-path`, `v2-plan-gating`, `v2-states`). 4 iter-021 follow-ups closed (#48/#49/#50/#52) + #47 closed by Mode 3 `6799604`. 3 new follow-ups generated (#55/#56/#57). Pool 34 → 30 net. Prior: iter 021 v2 Dashboard UI build (Mode 5 item 4/5) + Mode 3 principal-review correction.
- Last meta-review: **Meta-Review 005 (2026-04-21, covering iter 019–024 Path B + Mode 3 @iter 020)** — see `docs/meta/MR_005.md`. 7 governance diffs applied (D-1 through D-7). Supersedes MR-004 Change A (singular "at least one" companion-burn-down language replaced with ⌈N/3⌉ scaling) + MR-004 Change F (deferred; now applied as D-6). Stability window runs through iter 028 boundary; **MR-006 earliest at iter 028** (3-loop floor rule). Early-trigger watch: reverse portfolio-drift armed (clears at iter 026 if #14 selected); hard-stop ceiling (D-2 clause 9) only fires inside Mode 5 — none expected through iter 028; same-implementer 4+ risk if iter 026-028 all use backend-engineer (coordinator must rotate iter 029).
- Next recommended action: **iter 026 = #14 Wire `validateRenderedSOP` into `processSession` (`burn-down`, MANDATORY, Mode 1).** Primary agent: `backend-engineer`. Scope: wire existing `validateRenderedSOP` validator into `processSession.ts` pipeline with documented error surfacing; preserves determinism (validator is already pure); Phase-2 dependency. Score 11, E=2, R=2. Entry gate: iter 025 MR-005 artifact committed + 7 CLAUDE.md diffs applied + staleness triage recorded in backlog (all ✅). Validation: `pnpm typecheck` + `pnpm test` green; `validateRenderedSOP` invocation path verifiable in `processSession.ts`; regression test locking validator-in-pipeline behavior. Rotation: process-engine area (off web-app, satisfies Area rotation post-Path-B); extension-adjacent (partial reverse-drift relief). Iter 027 pre-queued = #7 (policy-engine, full reverse-drift relief); iter 028 pre-queued = #19+#20 bundle (session durability).
- Release-blocker burn rate (last 5 bounded loops iter 015–020, excluding Mode-4 + Mode-3): **0/0** — all blockers closed. No change.
- Follow-up closure ratio (10-iter window): **~0.100 at iter 020 close** (+1 closure iter 019, +0 closures iter 020, +3 new follow-ups iter 020 — ratio regresses from ~0.200 to ~0.100 as denominator inflates). This is expected during build-heavy iterations; MR-003 KPI target ≥0.25 by iter 018 missed; MR-004 Agenda 10 Signal A proposes revision to ≥0.25 by iter 025 (deferred to MR-005). Path B iter 021/022 expected +0 closures each and +2–4 follow-ups each; post-Path-B burn-down window (iter 023+) is when closure ratio must recover.
- **Autonomous-vs-directed sub-partition (rolling iter 010–020; Mode-3 + Mode-4 excluded):** `top-score` 1/10 (iter 009 aged out; no `top-score` in window) · `burn-down` 6/10 (iter 012–014, 017, 019) · `blocker-cadence` 0/10 (iter 009 overlap aged out) · `directed` 4/10 (iter 010, 011, 016, **020**; iter 018 is Mode 4 overlay, excluded). MR-004 narrowed cool-off clause 7 to exclude `directed` — prevents the iter-016 misuse pattern from repeating. Path B iter 021/022 = 2 more `directed` picks queued. Still below MR-003 band `top-score + blocker-cadence ≥ 2/10` (currently 0). Next cool-off opportunity: earliest iter 026 (requires 3 consecutive post-Path-B burn-downs).
- MR-004 governance diffs applied (recap): **Change A** Mode 5 guardrail 8 companion-burn-down rule (new; **SUPERSEDED by MR-005 D-2** — singular language replaced with ⌈N/3⌉ scaling); **Change B** Follow-Up Debt Policy clause 7 narrowed to exclude `directed`; **Change C** Mode 5 guardrail 6 escalated to explicit user-acknowledgement. **Change D/E/F deferred → all applied as MR-005 D-5/D-1/D-6** respectively. All three MR-004 deferred changes now codified.
- MR-005 governance diffs applied: **D-1** reverse portfolio-drift trigger at N=5 (Meta-Review Cadence early-triggers list — new bullet); **D-2** scaled Mode 5 companion burn-down ⌈N/3⌉ + hard-stop ceiling at pool>15 (Mode 5 guardrails — clause 8 replacement + new clause 9; supersedes MR-004 Change A); **D-3** fourth density-response option `scope-guard-adjacent` (Follow-Up Debt Policy clause 4 — new third option); **D-4** specialist-invocation gate (Operating Model — new subsection after Rules; `growth-strategist` ≥3 copy strings, `system-architect` ≥200 LOC new contract); **D-5** Audit-Intake Pattern codification (new CLAUDE.md section between Follow-Up Debt Policy and Coding Standards; supersedes MR-004 Change D); **D-6** test-only-touch counting (inline parenthetical on portfolio-drift line; supersedes MR-004 Change F); **D-7** Mode 5 sequence-length soft cap at N=5 (Mode 5 guardrails — new clause 10).

---

## Ranked Backlog

Score column format: `base ± adjustments = final` where adjustments are `+B` (release-blocker bonus) and `−S` (saturation penalty). Ranked by `final`.

### Release Blockers (auto-top per 1-in-5 cadence rule)

**All Phase-1 release blockers closed as of iter 011.** Table preserved for historical traceability.

| Rank | Title | Type | Area | I | A | L | C | E | R | Score | Status |
|------|-------|------|------|---|---|---|---|---|---|-------|--------|
| ~~—~~ | ~~Converge LiveStepBuilder with StreamingSegmenter~~ | ~~improvement~~ | ~~extension architecture~~ | ~~4~~ | ~~5~~ | ~~3~~ | ~~3~~ | ~~4~~ | ~~3~~ | ~~8 +B3 = 11~~ | **done (iter 011)** |
| ~~—~~ | ~~Persist full session event stream for service worker restart recovery~~ | ~~fix~~ | ~~session durability~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11 +B3 = 14~~ | **done (iter 010)** |
| ~~—~~ | ~~Add Playwright E2E tests for recording lifecycle~~ | ~~improvement~~ | ~~quality assurance~~ | ~~4~~ | ~~5~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~2~~ | ~~12 +B3 = 15~~ | **done (iter 009)** |

### Standard Backlog

Schema note (MR-002 Change B): `Birth iter` column is MANDATORY for any row tagged "follow-up (iter N)". Rows with `—` are non-follow-up proposals and predate the column; they are exempt.

| Rank | Title | Type | Area | I | A | L | C | E | R | Score | Birth iter | Status |
|------|-------|------|------|---|---|---|---|---|---|-------|-----------|--------|
| 4 | Add dashboard-level process for artifact and system-health refresh after each loop | improvement | agentic CI | 3 | 4 | 5 | 4 | 2 | 1 | **13** | — | proposed |
| 5 | Create invariant-focused regression suite for segmentation and normalization versions | improvement | invariants / testing | 4 | 5 | 4 | 4 | 3 | 2 | **12** | — | proposed |
| 6 | Draft clearer product wedge and ICP narrative for deterministic process intelligence | experiment | product / GTM | 3 | 4 | 5 | 3 | 2 | 1 | **12** | — | proposed |
| 7 | Widen policy-engine `credit[_-]?card` regex to `/credit[\s_-]*card/i` | fix | policy coverage | 2 | 4 | 2 | 5 | 1 | 1 | **11** | 008 | new (iter 008 follow-up) |
| 8 | Add try/catch to 11 unguarded API routes | fix | API safety | 4 | 4 | 2 | 5 | 3 | 1 | **11** | — | new (iter 001) |
| 9 | Add structured error logging with session context | improvement | observability | 4 | 4 | 4 | 4 | 3 | 2 | **11** | — | proposed |
| 10 | Evaluate event bundle integrity checks before downstream derivation | experiment | evidence linkage | 4 | 5 | 5 | 3 | 3 | 3 | **11** | — | proposed |
| 11 | Fix (db as any) casts / regenerate Prisma client | fix | type safety | 3 | 4 | 3 | 4 | 2 | 2 | **10** | — | new (iter 001) |
| 12 | Initialize Prisma migrations baseline | fix | data integrity | 4 | 4 | 3 | 4 | 2 | 3 | **10** | — | new (iter 001) |
| 13 | Define recorder failure-state UX for service worker interruption and recovery | experiment | UX resilience | 3 | 4 | 4 | 3 | 2 | 2 | **10** | — | proposed |
| ~~14~~ | ~~Wire `validateRenderedSOP` into `processSession.ts` (dev-throws/prod-logs)~~ | ~~fix~~ | ~~SOP quality gate~~ | ~~3~~ | ~~5~~ | ~~3~~ | ~~4~~ | ~~2~~ | ~~2~~ | ~~**11**~~ | ~~007~~ | **done (iter 026 — new `packages/process-engine/src/processSessionFull.ts` composed pipeline + 14-test regression suite; Option A preserves `processSession` contract; process-engine package 429→443 tests; workspace 1728→1742; zero follow-ups; past-cap staleness #1 closed)** |
| ~~15~~ | ~~Extract confidence thresholds to shared constants module (remove `renderHelpers.ts ↔ sopTemplates.ts` circular)~~ | ~~improvement~~ | ~~code hygiene~~ | ~~2~~ | ~~3~~ | ~~2~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**10**~~ | ~~006~~ | **done (iter 019 — commit `eca703c`; new `confidenceThresholds.ts` module; backward-compat re-exports from sopTemplates; +6 regression tests locking values + contract; zero behavior change)** |
| 16 | Fix DELETE /api/keys error handling | fix | API safety | 2 | 3 | 1 | 5 | 1 | 1 | **9** | — | new (iter 001) |
| 17 | Extract shared ingestion service (upload/sync) | improvement | API architecture | 4 | 5 | 4 | 3 | 4 | 3 | **9** | — | new (iter 001) |
| ~~18~~ | ~~Surface `meta.persistenceTruncated` flag in review UI / bundle builder~~ | ~~improvement~~ | ~~UX resilience~~ | ~~3~~ | ~~4~~ | ~~2~~ | ~~4~~ | ~~1~~ | ~~1~~ | ~~**11**~~ | ~~010~~ | **done (iter 014 — amber warning banner in ReviewScreen + HistoryDetailScreen; `buildBundle` regression test)** |
| 19 | Garbage-collect stale `ledgerium_active_session_events_*` keys on SW startup | fix | session durability | 2 | 4 | 2 | 5 | 1 | 1 | **11** | 010 | new (iter 010 follow-up) |
| 20 | `loadFromStorage` sessionId/in-flight flag cross-validation | fix | session durability | 3 | 4 | 2 | 4 | 1 | 2 | **10** | 010 | new (iter 010 follow-up) |
| 21 | Real-extension `launchPersistentContext` E2E harness | improvement | quality assurance | 4 | 5 | 4 | 3 | 4 | 3 | **9** | 010 | new (iter 010 follow-up; originally iter 013) — **triage: MR-005 DOWNGRADE** (E=4 blocks easy selection; still valuable but not near-term; revisit MR-006) |
| ~~22~~ | ~~I1 cross-path assertion (LiveStep-level, 12 golden fixtures)~~ | ~~improvement~~ | ~~invariants / testing~~ | ~~3~~ | ~~4~~ | ~~3~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**13**~~ | ~~011~~ | **done (iter 012 — I1a; I1b deferred to #26)** |
| 23 | `SEGMENTATION_RULE_VERSION` doc drift (`docs/invariants.md` L172 says `'1.0.0'`; code says `'1.1.0'`) | fix | docs / invariants | 2 | 3 | 1 | 5 | 1 | 1 | **9** | 011 | new (iter 011 follow-up) |
| 24 | `LiveStep` type tightening (`grouping?`, `boundaryReason?` → typed enum unions) | improvement | type safety | 2 | 3 | 2 | 5 | 1 | 1 | **10** | 011 | new (iter 011 follow-up) |
| ~~25~~ | ~~Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation)~~ | ~~improvement~~ | ~~invariants / testing~~ | ~~4~~ | ~~5~~ | ~~4~~ | ~~3~~ | ~~3~~ | ~~2~~ | ~~**11**~~ | ~~011~~ | **done (iter 013 — 3 fixtures covering click-with-label, fill-and-submit, route-change; zero production code changes)** |
| 26 | I1b: DerivedStep-level byte-identity (add `LiveStepBuilder.getDerivedSteps()` accessor + strict test) | improvement | invariants / testing | 3 | 4 | 2 | 4 | 2 | 1 | **10** | 012 | new (iter 012 follow-up — deferral from I1a per §5.3 revision) |
| 27 | Fix E2E seed/assertion mismatch in `apps/web-app/e2e/api/account.spec.ts` (test asserts `plan='free'` but seeded user has `plan='growth'`) | fix | quality assurance | 2 | 3 | 1 | 5 | 1 | 1 | **9** | M3@012 | new (Mode 3 follow-up — billing fix `09b2d80`) |
| 28 | Downgrade UX edge case: non-free user without `stripeCustomerId` should surface contact-support path instead of attempting Stripe portal redirect | fix | UX resilience | 2 | 3 | 2 | 4 | 2 | 2 | **7** | M3@012 | new (Mode 3 follow-up — billing fix `09b2d80`) — **triage: MR-005 DOWNGRADE** (lower-score edge case; defer behind staler higher-score items; revisit MR-006) |
| 29 | Fix `pnpm --filter <pkg> test` not resolving test files (root vitest config glob vs per-package resolution) — add per-package `vitest.config.ts` stubs or workspace-aware config | improvement | DX / tooling | 2 | 3 | 2 | 4 | 1 | 1 | **9** | 013 | new (iter 013 follow-up — found during fixture regeneration) |
| 30 | Add rapid-focus-blur normalizer dedup fixture to full-pipeline golden set (focus → immediate blur → no input) — currently `fill-and-submit` only exercises the `focus → input_changed` dedup path | improvement | invariants / testing | 2 | 4 | 2 | 4 | 1 | 1 | **10** | 013 | new (iter 013 follow-up — complementary to #25 fixture set) |
| 31 | Bootstrap sidepanel component test harness (jsdom + `@testing-library/react` + vitest env config) to enable component-level test coverage for `ReviewScreen` / `HistoryDetailScreen` / future screens | improvement | quality assurance | 3 | 4 | 4 | 4 | 2 | 2 | **11** | 014 | new (iter 014 follow-up — banner render currently untested at component level) |
| 32 | Extract `TruncationWarningBanner` into shared sidepanel components directory (currently duplicated across `ReviewScreen.tsx` and `HistoryDetailScreen.tsx`, ~10 lines each) | improvement | code hygiene | 1 | 2 | 1 | 5 | 1 | 1 | **7** | 014 | new (iter 014 follow-up — low-priority DRY cleanup) — **triage: MR-005 DOWNGRADE** (cosmetic DRY; no urgency; revisit MR-006) |
| ~~33~~ | ~~**QA-01** Minimum billing test suite: unit for plans/stripe/feature-gating boundary; integration (Stripe mock) for webhook events (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed, missing WEBHOOK_SECRET); checkout route error-shape contract tests~~ | ~~improvement~~ | ~~billing / quality assurance~~ | ~~5~~ | ~~5~~ | ~~2~~ | ~~5~~ | ~~3~~ | ~~2~~ | ~~**12**~~ | ~~audit-intake~~ | **done (iter 017 — 21 new vitest tests: 7 webhook integration + 14 feature-gating unit; +1 Playwright 401 contract; narrowed from "plans/stripe/feature-gating + integration + contract" to "webhook integration + feature-gating + 1 contract append" — plans.ts unit tests deferred as non-gap)** |
| 34 | **F-COH-01** Fix healthScores copy contradiction (Starter feature vs FAQ definition of intelligence-layer as Team+) — relabel Starter feature as "process health indicators" in `config.ts:72` AND update FAQ answer in `pricing/page.tsx:26` | fix | copy / trust | 2 | 3 | 1 | 5 | 1 | 1 | **9** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** same-page direct contradiction; trust-erosion risk |
| 35 | **F-COH-02** Reframe Starter value story from "clean exports" (feature) to outcome — update `pricing/page.tsx:145` plan guidance strip to "Document professionally" or "Build your process library" | fix | copy / conversion | 3 | 4 | 2 | 4 | 1 | 2 | **10** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** $49 Starter currently positioned as ransom tier (remove watermark) not value tier |
| 36 | **G-02** Add upgrade link to `UsageQuotaMeter` at 80% threshold with plan-specific CTA ("3 of 5 recordings used — upgrade to Team for unlimited") — currently fires amber at 80% with no upgrade path until 100% | improvement | UX / conversion | 3 | 3 | 2 | 5 | 1 | 1 | **11** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** highest-intent moment currently wasted |
| 37 | Fix `PRO_PRICE_ID` silent-empty-string pattern (`apps/web-app/src/lib/stripe.ts:36`) — uses same `?? ''` pattern that BUG-04 fixed for WEBHOOK_SECRET; if `STRIPE_PRO_PRICE_ID` is unset, the legacy mapping silently adds empty-string key | fix | billing / hygiene | 1 | 3 | 1 | 5 | 1 | 1 | **6** | M3@016→17 | new (Mode 3 follow-up — billing fix; deprecated path, low blast radius) |
| 38 | `APP_URL` hardcoded fallback (`apps/web-app/src/app/api/billing/checkout/route.ts:~120`) — `process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'` could produce wrong redirect URLs in staging/preview environments | fix | config / security | 2 | 3 | 1 | 5 | 1 | 2 | **7** | M3@016→17 | new (Mode 3 follow-up — billing fix) |
| 39 | `UpgradeButton` `setTimeout` cleanup via `useEffect` — if user navigates away mid-redirect (1500ms delay for `already_subscribed` case), timer callback still fires on unmounted component; convert to `useEffect` with cleanup | improvement | code hygiene / correctness | 1 | 2 | 1 | 5 | 1 | 1 | **6** | M3@016→17 | new (Mode 3 follow-up — billing fix) |
| ~~40~~ | ~~**BUG-07** Remove silent `subscriptionStatus @default("trialing")` in `apps/web-app/prisma/schema.prisma:16` (change to `@default("none")`); update explicit assignment in `apps/web-app/src/app/api/auth/signup/route.ts:43` to `'none'`; generate + apply Prisma migration~~ | ~~fix~~ | ~~billing / schema hygiene~~ | ~~3~~ | ~~4~~ | ~~1~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**11**~~ | ~~PRD-promoted~~ | **done (iter 023 Mode 2 targeted fix — schema default → `'none'`; hardcoded duplicate in signup/route.ts → `'none'`; new `signup/route.test.ts` with BUG-07 regression test; `prisma db push` applied — no migration file, project uses db-push pattern; zero UI regression because `statusLabels['none']` already renders "Free"; zero backfill by design). Unblocks `PRD_TEAM_TRIAL.md` Dependency §11a.** |
| 41 | `admin_bypass` E2E contract test in `upgrade-button-error-state.spec.ts` — requires an allowlisted test identity seeded in Playwright auth state; current auth state has only `user.json` (standard user). Extend seed + add 3rd test case asserting `code: 'admin_bypass'` response shape | improvement | billing / quality assurance | 2 | 3 | 1 | 4 | 2 | 1 | **7** | 017 | new (iter 017 follow-up — deliberately deferred per <15-min scope guard in QA-01 brief; completes checkout error-shape contract coverage) |
| 42 | Retire `computeHealthScore()` v1 in `apps/web-app/src/lib/health-scores.ts` after v2 output distribution comparison — PRD_DASHBOARD_V2 §D2 commitment: run v1 + v2 in parallel through Path B then retire v1 | fix | code hygiene / PRD commitment | 2 | 4 | 2 | 4 | 2 | 2 | **8** | 020 | new (iter 020 follow-up — PRD D2 contractual commitment; requires distribution comparison and downstream consumer audit; post-Path-B target) |
| 43 | Extend `computeInsightChips()` signature to accept `staleCount: number` parameter so the stale chip can be emitted — currently stale chip is omitted because `WorkflowMetricsOutput` has no age-based signal; route handler owns `staleCount` | improvement | metrics engine | 2 | 3 | 1 | 5 | 1 | 1 | **9** | 020 | new (iter 020 follow-up — minor API refinement to complete chip coverage; 1–2 LOC signature change + 1 test update) |
| 44 | Add `sort=opportunity` and `sort=health_score` params to `/api/workflows` route — PRD §6 references these as required sort params; deferred by iter 020 as route-layer additions beyond pure metrics-engine scope | improvement | API / dashboard-v2 | 2 | 4 | 1 | 5 | 2 | 1 | **9** | 020 | new (iter 020 follow-up — candidate for iter 021 during UI build OR standalone follow-up if iter 021 stays strictly component-scope) |
| 45 | System icon mapping for `WorkflowRow` Systems column — PRD §5.3 specifies icon-only pills; no `toolName → LucideIcon|string` lookup exists in codebase; iter 021 rendered accessible text pills (truncated 8-char) as honest fallback. Needs design/icon-source decision (Lucide mapping for Salesforce/Slack/NetSuite/Gmail/etc.) | improvement | UX / dashboard-v2 | 3 | 3 | 1 | 4 | 2 | 1 | **8** | 021 | new (iter 021 follow-up — PRD §5.3 compliance; deferred because color-only-signaling without icons would have violated PRD §10 accessibility) |
| 46 | Adopt TanStack Query (`@tanstack/react-query`) in web-app — PRD referenced TanStack Query; package is NOT installed; iter 021 used existing `fetch + useState + useEffect` pattern that matches v1 dashboard. Adoption is an architecture decision requiring dependency install + QueryClientProvider setup + migration audit of existing data-fetching call sites | improvement | architecture / dashboard-v2 | 2 | 2 | 2 | 4 | 3 | 2 | **5** | 021 | new (iter 021 follow-up — explicit deviation; current fetch pattern works identically; this is a "nice to have" architecture upgrade, not a correctness issue) |
| ~~47~~ | ~~Wrap `DashboardPage` (or the `(app)` layout) in `<Suspense>` boundary so `useSearchParams()` in the client `DashboardV2Shell` path does not trigger Next.js 14 warning~~ | ~~fix~~ | ~~web-app / Next.js hygiene~~ | ~~2~~ | ~~3~~ | ~~1~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**9**~~ | ~~021~~ | **done (Mode 3 commit `6799604` — `DashboardPage` content wrapped in `<Suspense>`; was a deployment blocker on Next.js 14 build)** |
| ~~48~~ | ~~Activate `?v2=1` auto-redirect per PRD D1 rollout §14~~ | ~~improvement~~ | ~~rollout / dashboard-v2~~ | ~~4~~ | ~~5~~ | ~~2~~ | ~~5~~ | ~~1~~ | ~~2~~ | ~~**13**~~ | ~~021~~ | **done (iter 022 — inverted to v2-default; `?v2=0` retained as 14-day soak escape hatch; full flag retirement tracked as #57)** |
| ~~49~~ | ~~Wire `WorkflowRow` kebab menu "Edit name" + "Archive" to backend~~ | ~~improvement~~ | ~~dashboard-v2 / feature completion~~ | ~~3~~ | ~~3~~ | ~~1~~ | ~~4~~ | ~~2~~ | ~~2~~ | ~~**7**~~ | ~~021~~ | **done (iter 022 — real `PATCH /api/workflows/:id` with optimistic UI + busy states + `role="alert"` error region; +5 body-shape unit tests)** |
| ~~50~~ | ~~Add "(all-time)" annotation to Runs subtext in `WorkflowRow` when time range filter ≠ "All"~~ | ~~fix~~ | ~~dashboard-v2 / honest-labels~~ | ~~2~~ | ~~4~~ | ~~1~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**10**~~ | ~~021~~ | **done (iter 022 — `timeRange` prop flow shell → list → row; +6 boundary unit tests)** |
| 51 | v2 dashboard analytics instrumentation — emit new events `dashboard_view`, `workflow_row_click`, `insight_chip_click`, `dashboard_sort`, `dashboard_filter`, `upgrade_cta_click[source=health_gate]` referenced by PRD §4 success metrics; extend analytics event taxonomy; required before post-launch metrics can be measured against PRD §4 targets | improvement | analytics / dashboard-v2 | 5 | 5 | 2 | 5 | 2 | 2 | **13** | 021 | new (iter 021 follow-up — blocks PRD §4 measurable-outcome commitments; candidate for iter 022 scope inclusion OR immediately post-Path-B if iter 022 runs tight) |
| ~~52~~ | ~~`PortfolioSidebar` integration with v2 shell per PRD D5~~ | ~~improvement~~ | ~~dashboard-v2 / PRD D5~~ | ~~2~~ | ~~3~~ | ~~1~~ | ~~4~~ | ~~2~~ | ~~1~~ | ~~**7**~~ | ~~021~~ | **done (iter 022 — collapsed-by-default, Columns3 toggle in filter bar with `aria-expanded` + `aria-controls`, `/api/portfolios` fetch, client-side filter)** |
| 53 | Workspace-level vitest does not discover `*.test.tsx` files — root `vitest.config.ts` include glob is `.test.ts` only. Iter 021 introduced the first 3 `.test.tsx` files (React component tests). Adding `.test.tsx` to root include fails because root config lacks the `@` alias (`apps/web-app/vitest.config.ts` has it) and may need jsdom env. Fix options: (a) migrate to vitest workspaces/projects feature with per-package config composition; or (b) switch root `"test"` script to `pnpm -r test` for recursive delegation. Current workaround: `pnpm --filter web-app test` picks up all tsx tests (11 files / 233 tests). Workspace count of 1728 is accurate for what the root config can run but excludes 47 new component tests. | fix | tooling / test-infra | 3 | 3 | 2 | 4 | 2 | 1 | **9** | 021 | new (iter 021 discovery — attempted scope expansion reverted per guardrail 7 item (b) "one logical outcome" failure; proper fix requires vitest workspaces migration or monorepo test-script re-architecture; commented placeholder in `vitest.config.ts`) |
| ~~54~~ | ~~**Dashboard v2 executive refinement bundle (iter 024 target — shifted from iter 023 per CEO Option A 2026-04-21)** — ship §4.1 of `PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md`: (a) portfolio health period-over-period delta in Command Header, (b) action-leading insight chip copy rewrite, (c) 3-state RAG color pip on Health Score (green ≥80, amber 60–79, red <60), (d) variation badge on Name cell when variationLabel ∈ {High, Very High}, (e) "Needs attention" pinned filter chip (`health <60 OR variation High+ OR delta ≤ −10`), (f) run-count qualifier `n=N` when N<10. One logical outcome per guardrail 7(b): "executive-grade comprehension of the v2 surface at GA."~~ | ~~improvement~~ | ~~dashboard-v2 / executive UX~~ | ~~5~~ | ~~5~~ | ~~3~~ | ~~5~~ | ~~3~~ | ~~2~~ | ~~**13**~~ | ~~021~~ | **done (iter 024 — all 6 items delivered; v1 scope-deferrals tracked as #58/#59/#60; commit pending)** |
| 55 | `.gitignore` monorepo-pattern fix — root `.gitignore` has top-level patterns `e2e/.auth/` + `prisma/test.db` that do not match monorepo paths `apps/web-app/e2e/.auth/` + `apps/web-app/prisma/test.db`. Observed accumulation of untracked `apps/web-app/e2e/.auth/user.json` (Playwright session auth state — **must never be committed**) + `apps/web-app/prisma/test.db` (SQLite binary). Fix options: (a) add `**/e2e/.auth/` + `**/prisma/test.db` recursive patterns to root `.gitignore`; or (b) add app-local `.gitignore` under `apps/web-app/`. Low effort, low risk. | fix | tooling / security hygiene | 2 | 3 | 1 | 5 | 1 | 1 | **9** | 022 | new (iter 022 follow-up — coordinator-discovered during iter-022 triage; legitimate security-hygiene gap because auth state contains session cookies/tokens) |
| 56 | `docs/features/user-templates/` governance decision — 12-file separate feature-planning workstream present in working tree (PRD, ARCHITECTURE, BACKEND_PLAN, FRONTEND_PLAN, GROWTH_PLAN, OPS_PLAN, COMPETITIVE_LANDSCAPE, MARKET_VALIDATION, MASTER_PLAN, METRICS, TEST_STRATEGY, UX_FLOWS for "User-Uploaded Workflow and SOP Templates"). Not iter-022 scope; held out of commit per scope discipline. Requires governance decision: (a) commit as-is under `docs/features/`, (b) restructure into `docs/prd/PRD_USER_TEMPLATES.md` + subordinate design docs per existing PRD naming convention, (c) continue out-of-tree until feature formally picked up. | improvement | governance / planning | 3 | 3 | 1 | 3 | 2 | 1 | **7** | 022 | new (iter 022 follow-up — coordinator-discovered during iter-022 triage; no code implication; pure governance question) |
| 57 | Post-soak `?v2=0` flag full retirement — PRD D1 commits to 14-day soak period after iter-022 auto-redirect activation. Currently `page.tsx` branches on `searchParams.get('v2') !== '0'`; v2 is default, `?v2=0` retained as rollback escape. Full retirement removes the branch, removes the v1 render path (~280 LOC of v1 dashboard delete), and retires the flag entirely. Scheduled for iter 022 + 14d (approx iter 036 if loop cadence holds at 1/day; sooner if cadence accelerates). | improvement | rollout / dashboard-v2 / code hygiene | 3 | 4 | 1 | 5 | 2 | 1 | **10** | 022 | new (iter 022 follow-up — PRD D1 post-launch commitment; tracking row so the 14-day-post-GA cleanup does not silently drop) |
| 58 | `growth-strategist` copy review on rewritten chip labels from iter 024 §4.1(b) action-leading rewrite — current labels are verb-first and scannable but were inlined by `frontend-engineer` without brand-voice vetting. Specialist pass to align tone/cadence/terminology with `docs/brand/` voice guidelines; preserve `filterKey` contract absolutely. Low risk, low effort. Candidate for iter 025+ burn-down if MR-005 flags copy as a signal; otherwise cold until production user-test feedback arrives. | improvement | dashboard-v2 / copy polish | 3 | 3 | 1 | 4 | 1 | 1 | **9** | 024 | new (iter 024 follow-up — scope-boundary deferral; chip copy shipped functional but unvetted by growth-strategist) |
| 59 | `variationLabel === 'very_high'` extension — iter 024 §4.1(d) v1 shipped "High variation" badge firing on `'high'` only. PRD explicitly calls for "High+" (High OR Very High) once production distribution data tells us the coefficient-of-variation cutoffs. Requires: (a) extend `WorkflowMetricsOutput.variationLabel` union to add `'very_high'`, (b) define threshold in `VARIATION_VERY_HIGH_THRESHOLD` constant, (c) extend `computeVariation()` decision tree, (d) update badge render logic. Blocked on analytics #51 providing distribution data. | improvement | dashboard-v2 / metrics-engine | 3 | 3 | 2 | 3 | 2 | 2 | **7** | 024 | new (iter 024 follow-up — blocked on #51 analytics instrumentation producing coefficient-of-variation distribution; post-launch) |
| 60 | Per-workflow delta for `needsAttention` filter precision — iter 024 §4.1(e) v1 shipped predicate `health < 60 OR variationLabel === 'high'`. Full PRD spec includes a third arm `delta ≤ −10` (period-over-period per-workflow health drop ≥10 points). Requires extending `computeWorkflowMetrics` with per-workflow prior-window signal — non-trivial because workflows carry only `updatedAt`, not historical event timestamps. Options: (a) add event-level prior-window query to `/api/workflows` route; (b) introduce a separate `/api/workflows/deltas` endpoint; (c) snapshot workflow health into a time-series table and query by window. Architecture decision required before implementation. | improvement | dashboard-v2 / metrics-engine / data model | 4 | 4 | 3 | 3 | 4 | 3 | **7** | 024 | new (iter 024 follow-up — v1 scope-boundary deferral; requires architecture decision on historical-signal storage strategy) |
| 61 | `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` threshold post-launch review — iter 024 hard-coded minimum 3 workflows in prior partition to return a non-null delta. Arbitrary; chosen to prevent noisy delta on small portfolios. Once production data exists: (a) observe the distribution of portfolios by workflow count, (b) observe delta noise vs signal at various `n` values, (c) reassess whether 3 is too strict (too many nulls) or too lenient (noisy deltas). May also need a separate threshold for "at least N workflows with runs in each window" to guard against delta between two partitions that both have data but not comparable activity. | improvement | dashboard-v2 / metrics-engine / calibration | 2 | 2 | 2 | 3 | 1 | 1 | **7** | 024 | new (iter 024 follow-up — post-launch analytics review; threshold calibration work that can only happen with real data) |
| 62 | **DV2-R01** Server-side v1-vs-v2 health-score distribution comparison script + `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` artifact — query production `events`/`workflows` over 30-day window; compute per-workflow score under both v1 `computeHealthScore()` (`apps/web-app/src/lib/health-scores.ts`) and v2 `computeHealthScoreV2()` (`apps/web-app/src/lib/workflow-metrics.ts`); emit markdown artifact with mean/median/p25/p75/p95 per formula + overlap histogram + per-workflow divergence-tail list (top-20 largest \|v2−v1\|). Unblocks #42 v1 retirement (PRD_DASHBOARD_V2 §D2 parallel-run commitment requires distribution evidence before deletion), #59 `variationLabel === 'very_high'` threshold calibration, #61 `PORTFOLIO_PRIOR_MIN_WORKFLOWS` calibration review. Executes WITHOUT PostHog gating (pure server-side read-only analysis; no production-code impact). | improvement | analytics-ops / dashboard-v2 | 4 | 5 | 3 | 4 | 2 | 1 | **13** | DV2-REVIEW-001 | **new (P0 audit-intake — `docs/meta/DASHBOARD_V2_REVIEW_001.md`)** — blocks #42 v1 retirement per PRD D2; recommended iter 029 first `top-score` slot |
| 63 | **DV2-R02** Replace `window.prompt` (rename) + `window.confirm` (archive) in `WorkflowRow` kebab menu with inline interactions — `WorkflowRow.tsx:268` rename prompt → inline edit mode with tab-to-confirm / escape-to-cancel; `WorkflowRow.tsx:295` archive confirm → lightweight inline confirmation affordance with undo window. Independently flagged by UX lens (executive-grade credibility + WCAG) AND frontend-engineer lens (Playwright-untestable without dialog-mock setup). Blocks #57 flag retirement (E2E plan-gating suite currently skips dialog-based interactions) and external launch (native browser dialog breach of executive-grade UX). | fix | dashboard-v2 / UX / a11y | 3 | 4 | 2 | 5 | 2 | 2 | **10** | DV2-REVIEW-001 | **new (P0 audit-intake — `docs/meta/DASHBOARD_V2_REVIEW_001.md`)** — UX lens + FE lens independently flagged; recommended iter 031 bundled with DV2-R03 |
| 64 | **DV2-R03** Add keyboard Escape + blur-dismiss handler on health-score breakdown tooltip (`WorkflowRow.tsx:523`) — WCAG 2.1 SC 1.4.13 (Content on Hover or Focus) requires dismissible / hoverable / persistent behavior; tooltip currently has hover-trigger and click-toggle but no keyboard dismiss path. Add `onKeyDown` Escape handler within tooltip portal + explicit `onBlur` close; preserve existing hover-show behavior. Blocks PRD §10 a11y commitment ("no a11y regressions acceptable for release") and external launch. | fix | dashboard-v2 / a11y | 2 | 4 | 1 | 5 | 1 | 1 | **10** | DV2-REVIEW-001 | **new (P0 audit-intake — `docs/meta/DASHBOARD_V2_REVIEW_001.md`)** — WCAG 2.1 SC 1.4.13 violation; recommended iter 031 bundled with DV2-R02 |

### Completed (historical)

| Iter | Title | Final score |
|------|-------|-------|
| 001 | Add vitest config + test script to web-app | 16 |
| 003 | Replace duplicated background logic with workspace package imports | 14 |
| 004 | Metadata strip + confidence badge above the fold in SOP markdown renderer | 15 |
| 005 | Hoist per-step `evidenceEvents: string[]` onto SOP step interfaces | 15 |
| 006 | Per-step `confidence?: number` + three-tier confidence glyph | 14 |
| 007 | Add `templates/sopValidator.ts` (validator-only, no pipeline wiring) | 13 |
| 008 | Integrate `@ledgerium/policy-engine` into `content/capture.ts` | 13 |
| 009 | Add Playwright E2E tests for recording lifecycle + CI workflow | 15 |
| 010 | Persist full session event stream for SW restart recovery | 14 |
| 011 | Converge LiveStepBuilder ↔ StreamingSegmenter (+ `buildDerivedSteps` + `segmentEvents` onto package primitive) | 11 |
| 012 | I1a regression test — LiveStep-level cross-path equality across 12 golden fixtures | 13 |
| 013 | Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation) — 3 fixtures, 12 byte-identity tests, zero production code changes | 11 |
| 014 | Surface `persistenceTruncated` flag in review UI — amber warning banner in `ReviewScreen` + `HistoryDetailScreen`; `buildBundle` regression test | 11 |
| 015 | **Meta-Review 003** (Mode 4, governance-only) — applied 4 diffs: CLAUDE.md hygiene refresh (A), ceiling-cool-off clause 7 (B), SYSTEM_HEALTH.md autonomous-ratio sub-partition (C), portfolio-drift early-trigger (D). No product code changes. | — |
| 016 | **Dashboard simplification** (Mode 2 directed + `ceiling-cool-off: invoked`) — removed 5 sections from web-app dashboard: Volume & Coverage, Quality & Readiness, Signals & Opportunities, Intelligence Summary (entire), Bottleneck Radar. −282 LOC in `page.tsx` (1 file, 0 new files). Dead-code audit: 2 useMemos removed (`staleWorkflows`, `bottleneckWorkflows`); 4 candidate items preserved after verifying surviving consumers. First web-app bounded-loop iteration since iter 001 (Signal-5 relief). Zero follow-ups. | — (directed, not ranked) |
| M3@016→17 | **Pricing audit + billing revenue-integrity hardening** (Mode 3 — debugging, out of cadence, does NOT consume bounded-loop counter) — BUG-01 (silent `'starter'` fallback in `planFromPriceId` + webhook catch-block) + BUG-03 (silent UpgradeButton failure on admin/already-subscribed) + BUG-04 (missing `STRIPE_WEBHOOK_SECRET` silent pipeline failure). All three P0 revenue-integrity bugs resolved in one commit. Files: `stripe.ts` (+20/−4), `webhook/route.ts` (+24/−12), `checkout/route.ts` (+2), `UpgradeButton.tsx` (+36 net, rewrite), `analytics.ts` (+1 `upgrade_blocked` event), `stripe.test.ts` (+103 new, 7 tests), `upgrade-button-error-state.spec.ts` (+57 new E2E). Validation: 86/86 tests pass, typecheck clean, build clean. Generated: `PRICING_AUDIT_001.md` cold-pool reference + 4 P0 audit-intake items (#33–36) + 3 Mode-3 follow-ups (#37–39). | — (Mode 3, not ranked) |
| 017 | **Minimum billing test suite** (`burn-down`, QA-01 audit-intake close) — new `webhook/route.test.ts` (+348, 7 tests: all 5 Stripe event types + missing secret + invalid signature, incl. BUG-01 and BUG-04 regression locks); new `feature-gating.test.ts` (+199, 14 tests: 5-tier boundary + admin bypass + null-plan coercion + quota at-limit / over-limit); `upgrade-button-error-state.spec.ts` +19 (1 new test: 401 unauth). Zero production-code modifications. Vitest baseline 86 → 107 (+21 tests). Scope narrowed from "plans+stripe+feature-gating unit + integration + contract" to "webhook integration + feature-gating unit + 1 contract append" (plans.ts unit tests deferred as non-gap). 1 follow-up opened (#41, admin-bypass E2E identity). | 12 |
| 018 | **Meta-Review 004 + Path B PRD** (Mode 4 + Mode 5 item 1/5, `directed`) — `docs/meta/MR_004.md` produced (143 lines; 10 agenda items; 6 proposed CLAUDE.md diffs — 3 applied this iteration, 3 deferred); `docs/prd/PRD_DASHBOARD_V2.md` approved (527 lines; 15 sections; D1–D10 locked per CEO delegation); 3 CLAUDE.md governance diffs applied (Mode 5 guardrail 8 new companion-burn-down rule · Follow-Up Debt Policy clause 7 narrowed to exclude `directed` · Mode 5 guardrail 6 escalated to explicit user-ack). Staleness triage: #14/#15/#7 all KEEP. Path B renumbered 4→5 iterations; iter 019 = companion burn-down #15. Zero production code changes. Zero follow-ups generated. | — (directed + Mode 4, not ranked) |
| 019 | **Confidence-thresholds extraction** (`burn-down` #15 + Mode 5 item 2/5 — companion-burn-down per MR-004 Change A new guardrail 8) — new `packages/process-engine/src/templates/confidenceThresholds.ts` (+18 LOC, single source of truth for `HIGH_CONFIDENCE_THRESHOLD = 0.85` + `LOW_CONFIDENCE_THRESHOLD = 0.70`); new `confidenceThresholds.test.ts` (+46 LOC, 6 regression tests locking values + backward-compat re-export contract); `renderHelpers.ts` import-path change (0 net LOC); `sopTemplates.ts` export→import-and-re-export (+4 LOC net; backward compat preserved for `templates.test.ts` consumers). Circular import `renderHelpers ↔ sopTemplates` eliminated. Past-staleness-cap item (Birth iter 006, age 13) closed. 1652/1652 tests pass (+6 vs iter 018). Zero follow-ups. Satisfies MR-004 Change A Mode 5 companion-burn-down obligation for Path B. | 10 |
| 020 | **Workflow-metrics engine** (Mode 5 item 3/5, `directed` per Path B) — new `apps/web-app/src/lib/workflow-metrics.ts` (+305 LOC; 8 exported functions + orchestrator; 21 named threshold constants; pure deterministic module); new `workflow-metrics.test.ts` (+307 LOC, 62 unit tests); new `__tests__/workflow-metrics.fixtures.ts` (+105 LOC, 5 PRD §11 archetypes); new `api/workflows/route.test.ts` (+146 LOC, 4 integration tests); modified `api/workflows/route.ts` (+100 LOC net, `toMetricsInput()` adapter + per-workflow indexing + metricsV2 + stats enrichment). v1 `computeHealthScore()` preserved per D2 parallel-run directive. 1652 → 1718 tests (+66). 3 follow-ups generated (#42/#43/#44) — density-response: `acknowledged, carried forward` (all three are PRD-commitment / scope-boundary artifacts, not iter-020 re-scope candidates). NO UI changes. | — (directed, not ranked) |

> **All Phase-1 release blockers closed as of iter 011.** The release-blocker bonus `+B3` no longer applies to any item in the table.
> All areas clear; no `−S` penalties apply.
> Items 7, 19, 20, 21, 23, 24, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, **41, 42, 43, 44, 45, 46, 51, 53, 55, 56, 57, 58, 59, 60, 61, DV2-R01, DV2-R02, DV2-R03** are open follow-ups (pool size = **35** — iter 026 closed #14 / DASHBOARD_V2_REVIEW_001 audit-intake promoted 3 P0s DV2-R01/R02/R03 to live pool (32 + 3 = 35 open); ~24 additional items held in `docs/meta/DASHBOARD_V2_REVIEW_001.md` cold pool per MR-005 D-5 clauses 4+5). MR-002 Change C: pool > 8 still triggers the ceiling rule; pool deeply violated; MR-004 Change A (new Mode 5 guardrail 8): companion-burn-down rule **SATISFIED at iter 019**. Iter 024 = Mode 5 item 6/6 (`directed`) — bypassed ceiling via Mode-5 precedence; no cool-off consumed (MR-004 Change B exclusion applies to directed selections). Path B CLOSED at iter 024. Post-Path-B iter 025 = MR-005 meta-review; iter 026+ is where aggressive pool shrinkage MUST begin. `Birth iter` anchors: `M3@012` (billing-fix Mode 3 of iter 012), `audit-intake` (P0 promotions from `PRICING_AUDIT_001.md`), `M3@016→17` (Mode 3 residual from pricing-audit intake), `PRD-promoted` (items pulled from cold pool by PRD approval), `017` (iter 017 follow-up), `020` (iter 020 metrics-engine follow-ups), `021` (iter 021 UI-build follow-ups), `022` (iter 022 a11y/polish/E2E follow-ups), `024` (iter 024 executive-refinement follow-ups).
> **Saturation status (rolling iter 020–024):** **web-app (metrics + API route) 020** · **web-app (v2 UI components) 021** · **web-app (v2 a11y + polish + E2E) 022** · **web-app (schema + route signal hygiene) 023** · **web-app (executive refinement — delta, RAG, badge, Needs-attention, run-count) 024** — **5 consecutive web-app iterations** triggering saturation rule. CEO user-acknowledgement recorded per guardrail 6 escalation (original 2026-04-20 for 4 consecutive iter 019–022; reaffirmed 2026-04-21 with executive-refinement acceptance extending to iter 023 then to iter 024 via Option A insertion — third reaffirmation covers iter 024 as 5th consecutive web-app touch). Reverse portfolio-drift trigger (MR-004 Change E proposed, deferred) now has 5 data points for MR-005 evaluation at iter 025 boundary. Post-MR-005 iter 026+ MUST rotate off web-app area.
> **Meta-Review 002 complete (2026-04-19).** Governance diffs A/B/C/D/E/F applied. **Meta-Review 003 complete (2026-04-20)**; diffs A/B/C/D applied. **Meta-Review 004 complete (2026-04-20, iter 018)**; diffs A/B/C applied immediately to CLAUDE.md; diffs D/E/F deferred to post-Path-B governance iteration. **MR-005 MANDATORY at iter 025** (both base 3-loop cadence [6 bounded loops post-MR-004: 019+020+021+022+023+024] AND Mode 5 guardrail 4 [sequence ≥3 items completed] independently trigger). Path B CLOSED at iter 024. MR-005 scope: reverse portfolio-drift trigger evaluation (MR-004 Change E proposed, 5 data points now available) · deferred MR-004 Changes D/E/F triage · pool-size ceiling discipline under Mode 5 directed precedence · density-trigger accounting across Path B (020:3 / 021:9 / 022:3 / 023:0 / 024:4) · agent-diversity signal (Path B 3:3 backend:frontend) · post-MR-005 burn-down programming for iter 026+.
> **Cold pool (P1/P2/P3 audit items)**: see `PRICING_AUDIT_001.md` sections P1/P2/P3 — ~26 items deliberately held out of live backlog to preserve pool-size ceiling behavior (was ~27; BUG-07 promoted to live row #40 on 2026-04-20 via `PRD_TEAM_TRIAL.md` approval; closed by iter 023 per CEO Option A). Items promote to live backlog one at a time as P0s burn down OR when a newly-approved PRD establishes a cold-pool item as a hard blocker. Governance rationale documented in audit § Governance Notes; MR-004 Agenda 1+2 verdicts: keep pattern, formalize in CLAUDE.md at post-Path-B governance iteration (iter 025+, one of the 3 deferred MR-004 diffs).

---

## Candidate Details

### 1. Replace duplicated background logic with workspace package imports
- Type: improvement
- Area: extension architecture
- Problem: the extension background layer duplicates normalization, segmentation, and policy logic instead of importing from workspace packages.
- Evidence: listed as the top active Phase 1 priority and explicitly tracked technical debt in the current engineering brief.
- Expected benefit: stronger determinism, less divergence risk, cleaner package boundaries, easier maintenance.
- Dependencies: verify package interfaces are stable; confirm extension build wiring.
- Impact (1-5): 5
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 5
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 14
- Recommended next action: select for the next bounded loop unless a blocking reliability issue supersedes it.
- Notes: this is the best current blend of impact, feasibility, and system simplification.

### 2. Persist full session event stream for service worker restart recovery
- Type: fix
- Area: session durability
- Problem: session data is not fully persisted to `chrome.storage.local`; only meta is stored, which weakens recovery after service worker restart.
- Evidence: explicitly listed in known issues and active priorities.
- Expected benefit: stronger resilience, less data loss risk, more trustworthy capture pipeline.
- Dependencies: storage strategy, serialization boundaries, recovery-state validation.
- Impact (1-5): 5
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 4
- Risk (1-5): 3
- Priority score: 11
- Recommended next action: keep at the top of the queue; likely follows the package deduplication work.
- Notes: mission-critical for trust and recovery.

### 3. Integrate `@ledgerium/policy-engine` into `content/capture.ts`
- Type: fix
- Area: capture pipeline
- Problem: `content/capture.ts` still uses a local sensitivity pattern instead of the shared policy engine.
- Evidence: explicitly listed in known issues.
- Expected benefit: consistent policy application, less duplication, cleaner trust model.
- Dependencies: import path validation and content-script compatibility.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 3
- Confidence (1-5): 5
- Effort (1-5): 2
- Risk (1-5): 2
- Priority score: 13
- Recommended next action: strong low-risk candidate if the next loop favors a smaller change.
- Notes: likely fast win.

### 4. Add Playwright E2E tests for recording lifecycle
- Type: improvement
- Area: quality assurance
- Problem: no Playwright E2E coverage exists for the extension recording lifecycle.
- Evidence: explicitly listed as an active priority and known gap.
- Expected benefit: higher confidence in capture, recovery, and lifecycle behavior.
- Dependencies: reliable extension test harness and stable recording scenarios.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 12
- Recommended next action: likely one of the first testing-focused loops after architectural cleanup.
- Notes: unlocks safer future iteration.

### 5. Add structured error logging with session context
- Type: improvement
- Area: observability
- Problem: logging lacks enough session-aware context to trace failures across capture and recovery flows.
- Evidence: active priority; consistent with observability-first architecture principle.
- Expected benefit: faster debugging, clearer auditability, better recovery analysis.
- Dependencies: log schema and session-context propagation.
- Impact (1-5): 4
- Strategic alignment (1-5): 4
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 11
- Recommended next action: pair with session recovery or testing work.
- Notes: strong enabling improvement.

### 6. Create invariant-focused regression suite for segmentation and normalization versions
- Type: improvement
- Area: invariants / testing
- Problem: key constants and versioned behaviors are documented, but they should have explicit regression protection.
- Evidence: strong invariant list in compaction protocol; high product risk if changed accidentally.
- Expected benefit: protects deterministic core and reduces silent drift.
- Dependencies: identify critical invariant assertions and placement in test hierarchy.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 12
- Recommended next action: consider early because it increases safety for other refactors.
- Notes: high trust leverage.

### 7. Add dashboard-level process for artifact and system-health refresh after each loop
- Type: improvement
- Area: agentic CI
- Problem: the continuous-improvement system needs consistent artifact refresh discipline after each iteration.
- Evidence: new agentic CI structure requires visible state and repeatable updates.
- Expected benefit: stronger governance, less stale status, clearer operator visibility.
- Dependencies: command + dashboard templates + execution discipline.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 5
- Confidence (1-5): 4
- Effort (1-5): 2
- Risk (1-5): 1
- Priority score: 13
- Recommended next action: already partially addressed by the artifact pack; maintain as process discipline.
- Notes: enabling layer, not product feature.

### 8. Define recorder failure-state UX for service worker interruption and recovery
- Type: experiment
- Area: UX resilience
- Problem: interruption and restart recovery likely need clearer user-facing states and guidance.
- Evidence: recovery is an active engineering priority; current UX guidance is not yet captured.
- Expected benefit: better trust, lower confusion, clearer error handling.
- Dependencies: recovery model and state transitions.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 4
- Confidence (1-5): 3
- Effort (1-5): 2
- Risk (1-5): 2
- Priority score: 10
- Recommended next action: good paired discovery item once recovery implementation is clearer.
- Notes: not the first build item, but strategically useful.

### 9. Evaluate event bundle integrity checks before downstream derivation
- Type: experiment
- Area: evidence linkage
- Problem: downstream derivation quality depends on trustworthy, complete event bundles.
- Evidence: consistent with Ledgerium's trust-first and evidence-linked positioning.
- Expected benefit: stronger guarantees before normalization and segmentation.
- Dependencies: define integrity criteria and failure behavior.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 5
- Confidence (1-5): 3
- Effort (1-5): 3
- Risk (1-5): 3
- Priority score: 11
- Recommended next action: strong future experiment after core recovery and package cleanup.
- Notes: important for long-term trust model.

### 10. Draft clearer product wedge and ICP narrative for deterministic process intelligence
- Type: experiment
- Area: product / GTM
- Problem: product direction is strong, but the clearest ICP and wedge narrative could be made sharper for future launch work.
- Evidence: current docs are engineering-strong; GTM articulation can become more explicit.
- Expected benefit: better product-market framing and future launch efficiency.
- Dependencies: product-manager + market-research + growth-strategist assessment.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 5
- Confidence (1-5): 3
- Effort (1-5): 2
- Risk (1-5): 1
- Priority score: 12
- Recommended next action: run as a current-state strategy loop, not a coding loop.
- Notes: useful but not ahead of deterministic-core work.

---

## Selection Rules

See `CLAUDE.md § Selection Policy` for the authoritative policy.

**Portfolio overrides** (any overrides top-score):
1. Release-blocker minimum cadence (1-in-5)
2. Area saturation rule (no 3-in-a-row same Area)
3. Follow-up burn-down (1-in-5 targets a prior follow-up)
4. Pool-size density ceiling (pool > 8 → forced burn-down) — MR-002 Change C
5. Ceiling-rule cool-off (after 3 consecutive ceiling-forced burn-downs, next iter may ignore clause 4 once, single-use) — MR-003 Change B

**Within those constraints, prefer:**
1. the highest final score
2. lower-risk items among close scores
3. items that improve determinism, traceability, recovery, and validation
4. reversible changes
5. **exactly one item per iteration**

The iteration log's "Candidate Selection" block MUST state which rule drove the selection: `top-score`, `blocker-cadence`, `saturation-rule`, `burn-down`, `ceiling-cool-off`, or `directed`.
