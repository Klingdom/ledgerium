# Changelog

All notable changes to Ledgerium AI improvement operations should be documented here.

The format is inspired by Keep a Changelog and adapted for bounded improvement loops.

---

## [2026-04-16] - Analytics Next Steps: Alerting, missing tracking, upgrade instrumentation

### Added
- `GET /api/admin/alerts` — Evaluates 8 alert conditions (3×P1, 4×P2, 1×P3) against AnalyticsEvent table. Returns per-alert status (ok/firing/insufficient_data), thresholds, and summary counts.
- System Alerts section in admin analytics dashboard — shows firing alerts with severity badges, pulsing status dots, and "Show all" toggle for ok alerts. Green "All systems operational" banner when healthy.
- `trackServer('signup_completed')` in `/api/auth/signup` — server-side signup tracking for reliable funnel measurement
- `trackServer('extension_api_key_created')` in `/api/keys` POST — tracks extension setup milestone
- `trackServer('plan_limit_hit')` in `/api/upload` — was missing (only in `/api/sync`)
- `track('upgrade_prompt_viewed')` in `UpgradeCTA` component — fires once on mount with feature/plan context
- `track('upgrade_clicked')` and `track('checkout_started')` in `UpgradeButton` component — completes conversion funnel instrumentation

### Changed
- `/api/admin/cleanup-events` — replaced single `deleteMany` with batched deletion (1000 per batch) to avoid long table locks on large datasets

### Impact
- All 8 DASHBOARD_SPEC alerting conditions now evaluated via API
- Conversion funnel fully instrumented: upgrade_prompt_viewed → upgrade_clicked → checkout_started → subscription_created
- Server-side signup tracking ensures funnel accuracy even if client-side tracking fails
- Extension API key creation tracked for activation funnel measurement
- All 1,393 tests pass, typecheck clean

---

## [2026-04-16] - Analytics Phase 3: Admin dashboard enhancements, event cleanup, SOP survey

### Added
- `GET /api/analytics/engagement` — Computes 0-100 engagement scores for all users based on 8 weighted behavioral signals (workflows, SOP views, exports, shares, map views, analyses, login recency, org usage). Returns per-user breakdown and tier distribution (high/medium/low/inactive).
- `GET /api/analytics/retention` — Computes weekly cohort retention over last 8 signup weeks. Tracks % of users who uploaded workflows in weeks 0-4+ after signup, with average retention row.
- `GET /api/admin/cleanup-events` — Admin event retention management. Supports dry-run (count only) and purge modes with configurable retention window (7-3650 days, default 90).
- Enhanced admin analytics dashboard with 3 new sections: Engagement Score Distribution (tier tiles + user table), Retention Cohorts (heat-map table), Event Cleanup (check/purge UI)
- `SOPUsefulnessSurvey` component — Non-blocking in-app feedback prompt that appears after 30s on SOP tab. 4 response options: yes_as_is, minor_edits, major_rework, not_useful
- `sop_usefulness_response` added to AnalyticsEvent union type

### Impact
- Admin can now see per-user engagement scoring, identify churn risk, and track weekly retention cohorts
- Direct output quality signal collection via SOP usefulness survey (KPI-005 target: 50% yes+minor_edits)
- Event table can now be managed to prevent unbounded growth
- All 1,393 tests pass, typecheck clean

---

## [2026-04-16] - Iteration 003: Replace duplicated extension logic with workspace package imports

### Changed
- `apps/extension-app/src/shared/constants.ts` — Replaced local definitions of `SEGMENTATION_RULE_VERSION`, `IDLE_GAP_MS`, `CLICK_NAV_WINDOW_MS`, `RAPID_CLICK_DEDUP_MS` with re-exports from `@ledgerium/segmentation-engine`
- `apps/extension-app/src/shared/utils.ts` — Replaced local `extractDomain` and `deriveRouteTemplate` implementations with re-exports from `@ledgerium/normalization-engine`
- `apps/extension-app/src/background/normalizer.ts` — Replaced local `RAW_TO_CANONICAL` map with spread of `RAW_TO_CANONICAL_TYPE` from `@ledgerium/normalization-engine` + 3 extension-specific additions; replaced local `SENSITIVE_RE` and `isSensitive()` with `classifySensitivity()` from `@ledgerium/policy-engine`; imported `NORMALIZATION_RULE_VERSION` from package

### Impact
- Before: Extension declared 6 workspace packages as dependencies but imported from 0 of them in background/capture code. Normalization, segmentation constants, and sensitivity detection were duplicated locally.
- After: Extension imports from 3 workspace packages (`normalization-engine`, `segmentation-engine`, `policy-engine`). 6 constants, 2 utility functions, 1 type map, and 1 sensitivity function now use the single source of truth.
- Removed ~80 lines of duplicated logic
- Zero behavior change — all 1,393 tests pass, typecheck clean, extension builds successfully

### Notes
- Extension-specific items preserved: `normalizeUrl` (more secure — strips sensitive params + hash), `deriveAppLabel` (more app labels), 3 extra event type mappings (`context_menu`, `dropdown_opened`, `dropdown_closed`)
- Future iterations can address: LiveStepBuilder ↔ StreamingSegmenter convergence, full type unification, upstreaming extension-only improvements to packages

---

## [2026-04-15] - Iteration 002: CI quality gate

### Added
- `quality-gate` job in `.github/workflows/deploy.yml` — runs `pnpm typecheck` and `pnpm test` before Docker build
- Job dependency chain: `quality-gate → build-and-push → deploy`
- Uses Node.js 20, pnpm 9, `--frozen-lockfile` install

### Impact
- Before: every push to `main` deployed to production with zero automated quality checks
- After: all 1,393 tests and full monorepo typecheck must pass before any deployment
- All existing and future test/type investments are now enforced on the deployment path

---

## [2026-04-14] - Phase F2+F3: Free/Starter + Team/Growth feature implementation

### Added (Phase F2 — Free + Starter)
- `apps/web-app/src/lib/health-scores.ts` — Deterministic 0-100 health scoring (completeness, confidence, duration, complexity)
- `apps/web-app/src/lib/health-scores.test.ts` — 29 unit tests for health scoring
- `GET /api/workflows/[id]/export-json` — JSON export endpoint, gated to Starter+ (cleanExports)
- Watermarked exports for Free tier in `/api/workflows/[id]/export-markdown`
- Health scores in workflow list (`GET /api/workflows`) and detail (`GET /api/workflows/[id]`) for Starter+

### Added (Phase F3 — Team + Growth)
- `GET /api/workflows/[id]/agent-composition` — AI agent profiles from workflow, gated to Growth+
- `GET /api/workflows/[id]/integration-risk` — Integration risk assessment, gated to Growth+
- `GET /api/workflows/[id]/export-bpmn` — BPMN 2.0 XML export, gated to Growth+
- `POST /api/analytics/compare` — Cross-workflow comparison, gated to Growth+
- `apps/web-app/src/lib/bpmn-export.ts` — BPMN 2.0 XML generator from process map data

### Added (Frontend Infrastructure)
- `apps/web-app/src/hooks/useAccount.ts` — Account data hook with module-level cache
- `apps/web-app/src/hooks/useFeatureGate.ts` — Feature gate hook for conditional UI rendering
- `apps/web-app/src/components/shared/FeatureGate.tsx` — Declarative feature gating component
- `apps/web-app/src/components/shared/UpgradeCTA.tsx` — Reusable upgrade prompt (full + compact)
- `apps/web-app/src/components/shared/RecordingLimitBadge.tsx` — Recording usage indicator with progress bar

### Changed (Feature Gates on Existing Routes)
- `POST /api/analytics` — Gated to Team+ (intelligenceLayer)
- `POST /api/workflows/[id]/analyze` — Gated to Team+ (intelligenceLayer)
- `PATCH /api/insights/[id]` — Gated to Team+ (intelligenceLayer)
- `GET /api/process-definitions` — Gated to Team+ (intelligenceLayer)
- `POST /api/agent-intelligence/portfolio` — Gated to Growth+ (agentComposition)
- `POST /api/workflows/[id]/agent-intelligence` — Gated to Growth+ (agentComposition)
- `POST /api/portfolios` — Gated to Team+ (sharedLibrary)
- `GET/PATCH/DELETE /api/portfolios/[id]` — Gated to Team+ (sharedLibrary)
- `POST/DELETE /api/portfolios/[id]/workflows` — Gated to Team+ (sharedLibrary)
- `POST /api/teams` — Gated to Team+ (teamWorkspace)
- `POST /api/teams/[id]/invite` — Gated to Team+ (teamWorkspace)

### Metrics
- Test suite: 1,364 → 1,393 (+29 health score tests)
- New files: 15
- Modified files: 22
- Zero regressions

---

## [2026-04-13] - Phase F1: Tier-based feature gating foundation

### Added
- `apps/web-app/src/lib/plans.ts` — PlanType system, PLAN_FEATURES constant mapping all 5 tiers to 19 feature flags and limits (recordings, seats, recorders)
- `apps/web-app/src/lib/feature-gating.ts` — Server-side guards: requireFeature(), checkRecordingLimit(), buildFeatureFlags(), buildFeatureFlagsWithUsage()
- `TIER_FEATURE_ROADMAP.md` — Complete 4-phase roadmap for implementing all tier features (F1-F4)
- `FEATURE_GATING_DESIGN.md` — Architecture design for feature gating, Stripe multi-tier, client awareness

### Changed
- `apps/web-app/src/lib/stripe.ts` — Added STRIPE_PRICES for all 6 price IDs (3 tiers × monthly/annual), planFromPriceId() resolver, getPriceId() lookup
- `apps/web-app/src/app/api/billing/webhook/route.ts` — Resolves plan from Stripe price ID instead of hardcoding "pro"
- `apps/web-app/src/app/api/billing/checkout/route.ts` — Accepts plan + interval parameters, resolves correct Stripe price
- `apps/web-app/src/app/api/upload/route.ts` — Replaced hardcoded free limit with checkRecordingLimit() (monthly reset, all tiers)
- `apps/web-app/src/app/api/sync/route.ts` — Same recording limit fix as upload route
- `apps/web-app/src/app/api/account/route.ts` — Returns full feature flags, plan info, and usage limits
- `apps/web-app/src/lib/session.ts` — Removed PLAN_LIMITS constant, canUpload() now delegates to feature-gating

### Notes
- Legacy "pro" plan maps to "starter" via toPlanType() — no disruption to existing users
- Recording limits now use monthly count (uploads this calendar month) instead of cumulative uploadCount
- All 1,364 tests pass with zero regressions
- Phase F1 unblocks F2 (Free+Starter completion) and F3 (Team+Growth features)

---

## [2026-04-13] - Iteration 001: Web-app test infrastructure

### Added
- `apps/web-app/vitest.config.ts` — vitest configuration with `@/` path alias, proper include/exclude patterns
- `test` and `test:watch` scripts in `apps/web-app/package.json`

### Changed
- Web-app test files (`humanize.test.ts`, `format.test.ts`) are now discovered and executed by vitest
- Monorepo test count: 1,314 → 1,364 (+50 web-app tests now running)
- `IMPROVEMENT_BACKLOG.md` updated with 5 new candidates from iteration 001 assessment
- `SYSTEM_HEALTH.md` test coverage score: 3 → 3.5

### Notes
- This was the first true bounded improvement loop (iteration 001)
- Selected item scored 16 (highest by 4 points over next candidate)
- Unblocks all future web-app test authoring: API route tests, component tests, integration tests

---

## [2026-04-12] - Agentic CI initialization

### Added
- `.claude/commands/improvement-loop.md` to run one bounded continuous-improvement iteration
- `.claude/templates/improvement_backlog_template.md` for ranked improvement backlog maintenance
- `.claude/templates/iteration_log_template.md` for repeatable iteration documentation
- `IMPROVEMENT_BACKLOG.md` seeded with a ranked top-10 portfolio aligned to current Phase 1 priorities
- `ITERATION_LOG.md` initialized with iteration 000
- `SYSTEM_HEALTH.md` initialized with a current-state scorecard

### Changed
- improvement operations now have a deterministic scoring formula and one-item-per-loop rule
- system-level improvement work is now tracked through explicit operating artifacts instead of ad hoc session memory

### Notes
- no product code was changed in this initialization step
- the next step is to run the first true bounded improvement loop and implement exactly one selected item
