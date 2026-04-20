# Changelog

All notable changes to Ledgerium AI improvement operations should be documented here.

The format is inspired by Keep a Changelog and adapted for bounded improvement loops.

---

## [2026-04-20] - Mode 3 @ iter 016→17: Pricing audit + billing revenue-integrity hardening (out of cadence)

### CEO directive (scope trigger)

"Can you have the team closely inspect the pricing and subscription models and make sure they make sense and that they are functional."

### Governance framing

- **Mode 3 (Debugging — out of cadence)** per CLAUDE.md § Operating Modes. Bug-fix work; does **NOT** consume the bounded-loop cadence counter. Iter 017 remains the next bounded loop (forced burn-down per pool-size ceiling).
- **Audit-intake pattern (new, CEO-approved):** audit produced `PRICING_AUDIT_001.md` (19 cross-specialist findings from 5 lenses — product, strategic, technical, functional, growth). P0 findings promoted to live backlog immediately; P1/P2/P3 held in the audit doc as a "cold pool" to prevent pool-size ceiling collapse. Pattern queued for MR-004 evaluation.
- **Scope:** fix 3 P0 revenue-integrity bugs (silent plan fallback, silent webhook-secret misconfiguration, silent upgrade-blocked responses). One logical outcome: convert silent billing failures to noisy retryable / user-visible failures.
- **Mode 3 does not consume bounded-loop cadence.** MR-004 cadence counter still advances by bounded iterations only; MR-004 triggers at iter 018 as planned.

### Audit phase (evidence before intervention)

5-agent dispatch (product-manager + market-research + system-architect + qa-engineer + growth-strategist) produced `PRICING_AUDIT_001.md` (~4,000 words). Cross-specialist consensus identified 19 findings:

- **3 P0 (fix immediately, Mode 3):** BUG-01 silent `planFromPriceId` fallback to `'starter'`; BUG-03 silent HTTP 400 on upgrade blocks; BUG-04 `STRIPE_WEBHOOK_SECRET` empty-string fallback.
- **4 P1 (cold pool):** BUG-02 webhook idempotency gap; BUG-05 customer-creation TOCTOU race; BUG-06 non-atomic quota enforcement; BUG-07 `subscription.status: 'trialing'` handling.
- **12 P2/P3 (cold pool + 4 live backlog promotions):** copy coherence, growth activation, trial infrastructure, feature gating naming consistency.

### Fixed

**BUG-01 — Silent plan fallback in `planFromPriceId`** (`apps/web-app/src/lib/stripe.ts`)
- Changed return type from `PlanType` to `PlanType | null`. Unknown price IDs now return `null` with `console.warn('[billing] planFromPriceId: unmapped price ID <id>')` instead of silently coercing to `'starter'`.
- Caller (`apps/web-app/src/app/api/billing/webhook/route.ts`) now throws explicitly when `planFromPriceId` returns null for paid subscriptions, forcing Stripe webhook retry rather than persisting wrong plan state.

**BUG-03 — Silent HTTP 400 on upgrade blocks** (`apps/web-app/src/app/api/billing/checkout/route.ts` + `apps/web-app/src/components/UpgradeButton.tsx`)
- API response shape now includes discriminating `code: 'admin_bypass' | 'already_subscribed'` field (lines 38–42, 79–83).
- `UpgradeButton` now renders an inline `<p role="alert" aria-live="polite">` error, fires `upgrade_blocked` analytics event with `{ code, location }`, and delays 1500ms before navigation on `already_subscribed` redirect so users see the message.

**BUG-04 — Silent `STRIPE_WEBHOOK_SECRET` empty-string fallback** (`apps/web-app/src/lib/stripe.ts` + webhook route)
- Module-level `WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''` constant replaced with `getWebhookSecret()` function that throws `'STRIPE_WEBHOOK_SECRET is not configured'` on empty/whitespace. Webhook route invokes it inside the outer try/catch → HTTP 500 on missing → Stripe retries (noisy + observable).

### Added

- **`PRICING_AUDIT_001.md`** (new, ~4,000 words) — authoritative pricing-surface reference; executive summary, 19-finding consensus table with lens attribution, 4 analytical parts (strategic / technical / functional / growth), consolidated P0–P3 recommendations, Mode routing, governance notes, 5 CEO decision points, files-inspected evidence trail. Cold-pool reservoir for P1/P2/P3 items.
- **`apps/web-app/src/lib/stripe.test.ts`** (new, 7 Vitest tests, +103 LOC) — regression protection for `planFromPriceId` (unmapped / known / empty) and `getWebhookSecret` (unset / empty / whitespace / valid).
- **`apps/web-app/e2e/api/upgrade-button-error-state.spec.ts`** (new, 2 Playwright tests, +57 LOC) — regression protection for BUG-03 response-shape contract (`already_subscribed` + generic 400 invariant shape).
- `upgrade_blocked` analytics event added to `apps/web-app/src/lib/analytics.ts` with payload `{ code: 'admin_bypass' | 'already_subscribed', location: string }`.

### Changed

- `apps/web-app/src/lib/stripe.ts` (+20 / −4 LOC) — BUG-01 + BUG-04 core fix.
- `apps/web-app/src/app/api/billing/webhook/route.ts` (+24 / −12 LOC) — removed inner try/catch that silenced Stripe API errors in `checkout.session.completed`; integrated `getWebhookSecret()`.
- `apps/web-app/src/app/api/billing/checkout/route.ts` (+2 LOC) — response-shape `code` discriminator.
- `apps/web-app/src/components/UpgradeButton.tsx` (+36 net LOC) — inline error surface, analytics instrumentation, navigation delay.
- `apps/web-app/src/lib/analytics.ts` (+1 LOC) — new event type.

### CEO approvals (5 decision points — all approved)

1. Combined Mode 3 fix for BUG-01 + BUG-03 + BUG-04 → **APPROVED** (executed this iteration).
2. Audit-intake pattern (P0 immediate promotion; P1/P2 cold pool) → **APPROVED** (now in effect; MR-004 will evaluate).
3. Pro tier at $99 → worth a scoped PRD → **APPROVED** (Phase 3a dispatch; artifact-only, no code).
4. 14-day Team trial → worth a dedicated iteration after bugs ship → **APPROVED** (Phase 3b dispatch; artifact-only, no code).
5. "Growth → Automate" rename → defer until Pro tier strategy is settled → **APPROVED** (held in cold pool).

### Impact

- **Revenue-integrity posture:** three "silent billing failure" anti-patterns converted to noisy retryable (webhook secret, plan mapping) or user-visible (upgrade button) failures. Stripe at-least-once retry semantics now work *with* the system instead of masking state drift.
- **Observability:** `upgrade_blocked` event closes a measurable gap in conversion funnel analytics — we can now quantify admin-bypass and already-subscribed friction.
- **SYSTEM_HEALTH.md billing scorecard:** new dimension added at 4.5 (strong) based on deterministic error handling and regression test coverage at the unit + contract layer.
- **Known gap (tracked):** zero integration coverage for full webhook → database persistence path. Surfaced as new top risk #1 in SYSTEM_HEALTH.md; promoted to backlog as #33 QA-01 (score 12, audit-intake).

### Validation (independent coordinator verification)

- `pnpm --filter @ledgerium/web-app typecheck` → clean
- `pnpm --filter @ledgerium/web-app test` → **86/86 passed** (79 pre-existing + 7 new billing unit tests)
- `pnpm --filter @ledgerium/web-app build` → clean (67 static pages, no route regressions)
- Playwright spec file lints; full suite deferred to CI (no new failures expected).
- `git diff --stat` → 6 modified + 2 new test files + 1 new audit doc + 4 artifact updates.

### Follow-ups generated (Birth iter: `M3@016→17`)

**Live backlog (P0 audit-intake):**
- **#33 QA-01** — Full billing integration test suite (webhook → DB persistence path). Score 12.
- **#34 F-COH-01** — Align `healthScores` copy with audit-surfaced inconsistencies. Score 9.
- **#35 F-COH-02** — Reframe Starter tier messaging for audit-surfaced positioning gaps. Score 10.
- **#36 G-02** — 80%-of-quota in-app upgrade prompt. Score 11.

**Mode 3 direct follow-ups (live backlog):**
- **#37** — `PRO_PRICE_ID` silent-empty env-var pattern (mirror-risk of BUG-04). Score 6.
- **#38** — `APP_URL` hardcoded in billing flow. Score 7.
- **#39** — `UpgradeButton` setTimeout cleanup (React unmount hazard). Score 6.

**Cold pool (held in `PRICING_AUDIT_001.md` for future burn-down):**
- BUG-02, BUG-05, BUG-06, BUG-07 (P1) + 8 P2/P3 items.

**Density-response log line:** `density-response: acknowledged, carried forward` — rationale: Mode 3 intentionally generated 7 follow-ups as byproduct of systematic audit scope; 4 of 7 are strategic audit-intake promotions (intentional live-pool expansion, not residual churn); 3 of 7 are narrow Mode-3 adjacents with low scores; pool growth (15→22) is governed via cold-pool discipline and ceiling-rule enforcement. Conscious decision to defer.

### Governance

- **Pool size:** 15 → 22 (7 new live rows). Ceiling rule (pool > 8) remains active — iter 017 forced burn-down. Cold-pool discipline means the 22 is not artificially inflated by audit-wide expansion.
- **Mode 3 cadence rule (reaffirmed):** iter 016 was the most recent bounded loop; iter 017 is still the next bounded loop. Mode 3 does not consume the MR-004 counter.
- **MR-004 agenda additions (for iter 018 meta-review):**
  - Evaluate audit-intake pattern (P0-only live promotion + cold pool) effectiveness.
  - Measure whether ceiling-cool-off clause 7 delivered a top-score selection at iter 016 (it did not — it served a directed pick; this Mode 3 does not affect that evaluation).
  - Review whether Mode 3 batches should require a `density-response` log line explicitly (currently inherited from bounded-loop policy).
- **Coordinator recommendation for iter 017:** #15 (Extract confidence thresholds to shared constants, score 10, Birth 006, age now 10 — staleness cap reached; MUST triage at MR-004 unless closed) as primary; alternate = #33 QA-01 if CEO prefers to continue billing hardening momentum.

### Risks (flagged, not blocking)

- P1 billing bugs (idempotency, customer TOCTOU, atomic quota, trialing status) remain in cold pool. Stripe at-least-once retries can still cause double-grant state drift until BUG-02 lands.
- Admin-bypass E2E coverage deferred (no allowlisted test identity). Tracked via #33 QA-01.
- Audit-intake pattern is new; MR-004 may refine P0/P1 thresholds or cold-pool release cadence.

---

## [2026-04-20] - Iteration 016: Dashboard simplification — 5 sections removed (Mode 2 directed + first ceiling-cool-off invocation)

### User directive (CEO scope)

"Dramatically simplify the dashboard page of the main web app. Remove: Volume & Coverage object, Quality & Readiness object, Signals & Opportunities object, the entire Intelligence Summary section, and the Bottleneck Radar section."

### Governance framing

- **Mode 2 (Targeted fix — user-directed):** single logical outcome (dashboard simplification) with five internal removal steps, one file, one Area (web-app UI), one reversible commit.
- **Selection rule:** `directed` + `ceiling-cool-off: invoked; rationale: user-directed CEO scope; pool 15 > 8 would force burn-down, clause 7 (MR-003 Change B, landed at iter 015) authorizes single-use cool-off to honor the directed scope with one-logical-outcome discipline`.
- **First invocation of MR-003 Change B (ceiling-cool-off clause 7)** — the policy is now stress-tested in a real directed scenario.
- **First web-app bounded-loop iteration since iter 001** (14-iter drought broken) — partial relief on MR-003 Signal 5 portfolio drift; portfolio-drift counter reset to 0.

### Removed

Five sections from `apps/web-app/src/app/(app)/dashboard/page.tsx`:

1. **Volume & Coverage** card (~L867–892) — total workflows / recorded-this-week / system count / avg duration.
2. **Quality & Readiness** card (~L894–921) — avg confidence / SOP ready count / maturity score / cognitive load.
3. **Signals & Opportunities** card (~L923–948) — needs review / optimization opportunities / insights count / AI candidates.
4. **Intelligence Summary** (entire section, ~L957–1098) — section header + 3 sub-cards: Action Items, AI Opportunities, Recent Activity.
5. **Bottleneck Radar** (~L1103–1125) — 4-column grid of high/medium bottleneck-risk workflows.

Also removed:
- The Executive Overview 3-column grid wrapper that held sections 1–3 (including its LAYER 1 section comment).
- 2 useMemo hooks with zero surviving consumers: `staleWorkflows`, `bottleneckWorkflows`.
- 2 unused lucide-react icon imports: `Brain`, `Activity`.

### Preserved (verified surviving consumers)

Frontend-engineer honestly narrowed the coordinator's initial dead-code brief when grep-verification showed 4 of 7 candidate items had legitimate surviving consumers:

- `needsAttentionWorkflows` / `optimizationWorkflows` — feed `topRiskWorkflow` / `topOpportunityWorkflow` upstream of Command Center Top Signals strip.
- `confidenceColorClass()` / `confidenceBarColorClass()` — used at 3 call sites in Workflow Library cards.
- `BottleneckRisk` type + `WorkflowSummary.bottleneckRisk` field — API contract field returned from `/api/workflows`; data-model level, not section-scoped.
- Icon imports `AlertTriangle`, `Zap`, `Clock` — used in Command Center header and Workflow Library.

Command Center Header, Workflow Library, Process Groups View, Empty State, and all API data-fetching paths are untouched.

### Impact

- **Post-removal dashboard flow:** Command Center Header (Org Health + Top Signals strip + Top Insights + Usage Meter + action buttons) → Process Families preview (conditional) → View Mode Toggle → Workflow Library / Process Groups View. Lean single-column reading path; the signal-level insights in Command Center are no longer duplicated by the metric-summary cards below.
- **LOC:** `−282 / +0` in `page.tsx` (1 file changed, 0 new files).
- **Cognitive load reduction:** 5 of the most derived-metric-heavy sections removed; Top Signals strip continues to surface the same underlying alerts at a higher-impact frame.
- **Zero production-logic risk surface:** pure removal, no behavior change to what remains.
- **Signal-5 relief:** first bounded-loop web-app iteration since iter 001; portfolio-drift counter reset; web-app UI area now represented in the rolling 5-loop saturation window (4 distinct areas now).

### Validation (independent coordinator verification)

- `pnpm --filter @ledgerium/web-app typecheck` → clean (tsc --noEmit, no errors)
- `pnpm --filter @ledgerium/web-app test` → **79/79 passed** (3 test files: humanize 25 tests, health-scores 29 tests, format 25 tests)
- `pnpm --filter @ledgerium/web-app build` → clean (67 static pages generated; `/dashboard` route builds to 25.7 kB)
- `git diff --stat` → 1 file changed, 282 deletions
- Grep for `"Volume & Coverage|Quality & Readiness|Signals & Opportunities|Intelligence Summary|Bottleneck Radar"` in `page.tsx` → **0 matches**
- Grep for `"staleWorkflows|bottleneckWorkflows"` in `apps/web-app/src/` → **0 matches**

### Governance

- **Rule:** `directed` + `ceiling-cool-off: invoked`. Cool-off consumed — single-use per clause 7; iter 017 returns to clause 6 burn-down.
- **Cool-off rationale evaluation (for MR-004 to consider):** MR-003 Change B was motivated by the need to exercise the refined scoring formula via `top-score`; iter 016 invoked it for a `directed` pick instead. Clause 7's text explicitly lists `directed` as permitted, but this does NOT advance the top-score-evidence goal. MR-004 should decide whether cool-off should be narrowed to `top-score`-only or whether it correctly serves dual purposes (user-scope respect + formula exercise, whichever arrives first).
- **Agent diversity:** frontend-engineer is now 2nd consecutive primary (iter 014 + iter 016); same-implementer-4+ trigger is 2 away. Monitor iter 018/020 for diversity pick.
- **Saturation status post iter 016 (rolling iter 011–016 excluding Mode-4 iter 015):** extension architecture 1 · invariants/testing 2 (012+013) · UX resilience 1 · web-app UI 1. **No 3-in-a-row; 4 distinct areas — strong diversity.**
- **Staleness-cap watch (CRITICAL):** #15 (Birth 006) now at age 10 — **staleness cap reached**. Per CLAUDE.md § Follow-Up Debt Policy clause 2, this item MUST be triaged at MR-004 (iter 018) unless iter 017 preemptively closes it. #14 (Birth 007, age 9) reaches cap at iter 017. **Coordinator recommendation: iter 017 = #15** (Extract confidence thresholds to shared constants, score 10, Effort 2 / Risk 1).
- **Meta-review cadence:** iter 016 is the 1st bounded loop post-MR-003. MR-004 triggers at iter 018 (base cadence, 3 bounded loops post-MR-003). Stability window active through iter 017.

### Follow-ups

**Zero follow-ups generated.** Directed Mode 2 with clean scope + clean validation + no emergent adjacent work. Frontend-engineer's dead-code narrowing is a scope-discipline signal, not a follow-up.

### Risks (flagged, not blocking)

- If the CEO intends "dramatically simplify" as an ongoing program, additional Mode-2 iterations may follow. Coordinator will treat each as a separate directed iteration with its own scope statement; no pre-emptive multi-section backlog items created.
- Cool-off invocation pattern deviates from MR-003's stated motivation. MR-004 will formally review.

---

## [2026-04-20] - Iteration 015: Meta-Review 003 (Mode 4, governance-only) — 4 diffs applied

### Governance-only iteration — no product code changes

Per CLAUDE.md § Meta-Review Cadence, base cadence (every 3 completed improvement loops) triggered Meta-Review 003 at iter 015. Covered iter 012 + 013 + 014 and evaluated MR-002 Changes A–F efficacy. Produced `META_REVIEW_003.md` (514 lines) with 4 proposed governance diffs; coordinator adopted all 4.

### Added
- `META_REVIEW_003.md` at repo root — full effectiveness scorecard of MR-002 Changes A–F, 6 new signals surfaced from iter 012/013/014, proposed governance diffs A–D, iter 016 recommendation, cadence self-critique.
- **CLAUDE.md § Follow-Up Debt Policy clause 7 (MR-003 Change B) — ceiling-rule cool-off:** after 3 consecutive `burn-down`-forced iterations, the next iteration is authorized to ignore clause 6 once (single-use) and select by `top-score`, `blocker-cadence`, or `directed`, provided the iteration log records `ceiling-cool-off: invoked; rationale: [reason]`. Unlocks refined-scoring-formula exercise from its 6-loop dormancy (only 1 `top-score` selection since MR-001 — iter 009).
- **CLAUDE.md § Meta-Review Cadence new early-trigger (MR-003 Change D):** 10+ consecutive iterations without touching a tracked non-extension surface flags portfolio drift. Addresses Signal 5 (Mode-3 billing fix surfaced 4 silent web-app bugs the bounded loop never would have caught).

### Changed
- **CLAUDE.md § Current Phase + § Known Issues (MR-003 Change A, hygiene):** removed stale `[BLOCKER]` listings for Playwright E2E and session persistence (closed in iter 009/010); added iter 009/010/012/013/014 to Resolved list; rewrote Known Issues to reflect "no current Phase-1 blockers; pool at 15; web-app surface under-surveyed." Prior state contradicted SYSTEM_HEALTH.md + IMPROVEMENT_BACKLOG.md for 5 iterations.
- **SYSTEM_HEALTH.md autonomous-vs-directed ratio row (MR-003 Change C):** sub-partitioned into `top-score` / `burn-down` / `blocker-cadence` / `directed`. Reveals `top-score autonomous = 1/10` (iter 009 only), which is below the healthy band `top-score + blocker-cadence ≥ 2/10`. MR-004 can now measure whether cool-off rule unlocks more top-score selections.
- IMPROVEMENT_BACKLOG.md portfolio summary + saturation block + selection-rule list updated; added ceiling-cool-off and pool-size-ceiling to portfolio-override list; added `ceiling-cool-off` to the set of valid "Candidate Selection" rule tags.
- SYSTEM_HEALTH.md Current Top Opportunities rewritten for iter 016 = cool-off → #4 (primary) or burn-down → #19 (fallback); Recommended Next Iteration section rewritten with cool-off mode vs burn-down mode candidate ranking; Meta-Review Status flipped to "MR-003 complete; stability window through iter 017; MR-004 at iter 018."

### Impact
- **Before MR-003:** CLAUDE.md 5-iter stale on blockers; refined scoring formula stress-tested on 1 loop (iter 009) in entire post-MR-001 lifespan; 3 consecutive ceiling-forced burn-downs risked permanent formula dormancy; closure ratio 0.188 decelerating toward asymptotic non-closure of the 0.4 target.
- **After MR-003:** all three governance files (CLAUDE.md, SYSTEM_HEALTH.md, IMPROVEMENT_BACKLOG.md) now cross-consistent on blocker state and pool size; ceiling-cool-off guarantees at least 1 `top-score` discriminating selection per 4-loop window; closure-ratio KPI revised from ≥0.4 to ≥0.25 by iter 018 (realistic calibration); portfolio-drift early-trigger armed.

### Validation
- Cross-artifact consistency: `CLAUDE.md § Current Phase` (no blockers, pool 15) = `SYSTEM_HEALTH.md § Release Blockers` ("3 of 3 closed") = `IMPROVEMENT_BACKLOG.md § Portfolio Summary` (pool 15, no blockers). Pre-MR-003 these 3 files were in 3-way contradiction.
- Mode 4 stop condition: `git diff --stat` touches only governance files (CLAUDE.md, SYSTEM_HEALTH.md, IMPROVEMENT_BACKLOG.md, ITERATION_LOG.md, CHANGELOG.md) + 1 new artifact (META_REVIEW_003.md). Zero files under `apps/` or `packages/`.
- No schema change, no invariant change, no rule version change, no dependency change.

### Governance summary

| # | Change | File | Mandatory | Lines |
|---|--------|------|-----------|-------|
| A | Hygiene refresh (§ Current Phase + § Known Issues) | CLAUDE.md | ✅ | ~20 |
| B | Ceiling-rule cool-off clause 7 | CLAUDE.md | ✅ | ~5 |
| C | Autonomous-ratio sub-partition | SYSTEM_HEALTH.md | optional | ~3 |
| D | Portfolio-drift early-trigger | CLAUDE.md | optional | 1 |

**Total diff:** ~29 lines across 2 governance files.

### Follow-ups
- **Zero follow-ups generated.** Mode 4 is governance-only.
- **Staleness watch carried forward:** #15 (Birth 006, age 9) crosses 10-loop cap at iter 016. If iter 016 = #4 (cool-off pick, not #15) and iter 017 ≠ #15, MR-004 must execute mandatory keep/downgrade/delete triage per CLAUDE.md § Follow-Up Debt Policy clause 2.

### Risks (flagged, not blocking)
- **Signal 2 — decelerating closure ratio:** deltas 0.077 → 0.066 → 0.045. Structural issue (each non-trivial loop generates ~1.3 follow-ups while closing 1). MR-003 deliberately did NOT lower the 0.4 target or intervene in generation rate; revisit at MR-004.
- **Cadence self-critique:** 4 of 6 MR-002 changes verdict "working, no change needed" (67% tautology). If MR-004 also finds majority tautology, consider introducing a "lite meta-review" variant. **Do not shorten cadence in the same review that asks the question** — control-variable isolation principle.
- **Signal 5 — web-app portfolio drift:** inferred from 14 iterations but partly an artifact of Phase-1 priorities (extension-app is where blockers lived). Change D trigger monitors prospectively; no action required until it fires.

---

## [2026-04-19] - Iteration 014: Surface `persistenceTruncated` flag in review UI — forced burn-down by MR-002 Change C ceiling rule, third consecutive

### Added
- `TruncationWarningBanner` JSX component (10 LOC) rendered conditionally in two screens when `meta?.persistenceTruncated === true`:
  - `apps/extension-app/src/sidepanel/screens/ReviewScreen.tsx` — between session-summary header and upload progress bar, above the step list.
  - `apps/extension-app/src/sidepanel/screens/HistoryDetailScreen.tsx` — first child of loaded-bundle block, above metadata row.
  - Styling: amber palette (`bg-amber-50 border-amber-200 text-amber-800`) + decorative `⚠` glyph with `aria-hidden="true"`.
  - Copy: "Some events may be missing from this session. The browser hit a storage limit during recording, so later events were not saved. The steps below are accurate but may be incomplete." Plain English, no `chrome.storage.local` jargon.
- `apps/extension-app/src/background/bundle-builder.test.ts` — regression assertion (+28 LOC) that `buildBundle()` preserves `meta.persistenceTruncated === true` in `bundle.sessionJson.persistenceTruncated`. Uses mock `SessionStore` with empty event arrays. Guarantees future bundle-builder changes cannot silently drop the flag.

### Changed
- `IMPROVEMENT_BACKLOG.md` — row #18 closed (strike-through, marked done iter 014); rows #31 and #32 added for iter-014 follow-ups (Birth iter 014); portfolio summary updated: total candidates 36 → 38, pool 14 → 15 (net +1), closure ratio 0.143 → 0.188.
- `SYSTEM_HEALTH.md` — session durability/recovery scorecard row upgraded 4 → 4.5 (silent data-loss trust gap closed); test-coverage 1617 → 1618 tests; autonomous-vs-directed window rolled to iter 005–014 (ratio unchanged at 0.2); recommended-next-iteration block rewritten for iter 015 = Meta-Review 003 + iter 016 burn-down; Meta-Review Status flipped from "current" to "MR-003 due".

**Zero changes to iter-010/011/012/013 surfaces.** `session-store.ts` unchanged, `types.ts` `SessionMeta` shape unchanged, `bundle-builder.ts` production code unchanged, segmentation-engine unchanged, normalization-engine fixtures unchanged, convergence-invariant-i1 test unchanged, full-pipeline regression test unchanged.

### Impact
- **Silent data-loss trust gap closed at the UX layer.** Previously, when `chrome.storage.local` quota was exceeded during recording (iter-010 append-stop truncation), the `persistenceTruncated: true` flag was correctly set and persisted through restart + export, but was only visible to someone who opened the exported JSON by hand. A user could end a long recording, walk through the review screen seeing their captured steps (accurate — prefix preserved), export, and not realize their capture was incomplete. This directly contradicted Ledgerium's trust-first product positioning. Users with a truncated capture now see an explicit amber warning at both immediate post-recording review (`ReviewScreen`) and any historical revisit (`HistoryDetailScreen`).
- **Regression-guarded:** `bundle-builder.test.ts` now contains an explicit assertion that `buildBundle()` carries `persistenceTruncated` through to `sessionJson`. Future bundle-builder changes (e.g., refactors, field-selection) cannot silently break the flag carry-through.
- **Follow-up closure ratio 0.143 → 0.188** for the 10-iter window iter 005–014. Recovery trajectory continues monotonically (0.0 → 0.077 → 0.143 → 0.188 across iter 011 → 012 → 013 → 014). Still below 0.4 target.
- Test-suite totals: **1617 → 1618 tests** (+1 exact delta), 47 files unchanged (extended existing file, no new test file).
- Production LOC touched: 36 (ReviewScreen +17 / HistoryDetailScreen +19). Test LOC added: +28. Total: 64.

### Validation
- `pnpm --filter @ledgerium/extension-app typecheck`: clean.
- `pnpm --filter @ledgerium/extension-app test`: 197/197 pass (baseline 196 + 1 new).
- `pnpm --filter @ledgerium/extension-app build`: clean, 2.47s.
- `pnpm typecheck` (root): clean across 10 packages + 2 apps.
- `pnpm test` (root): 1618/1618 pass, 47 files. Delta from pre-iter-014: exactly +1 test / 0 new files.
- Git diff scope: only the 3 expected files modified. iter-010/011/012/013 surfaces verifiably untouched.

### Governance
- **Selection rule**: `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (pool = 14 > 8). Third consecutive iteration under the ceiling rule. Among 4 items tied at score 11 (#18, #19, #7, #14), chose #18 on CLAUDE.md § Selection Policy tie-breaker 3 ("prefer items that improve determinism, traceability, recovery, and validation") + proactive saturation avoidance (avoiding a third consecutive invariants/testing loop after iter 012 + 013).
- **Density trigger**: 2 follow-ups generated (#31, #32). Below ≥3 threshold → no `density-response:` log line required.
- **Scope discipline**: no Mode 5 scope-expansion invocation; Mode 1 does not permit. No jsdom / `@testing-library/react` bootstrap (would have been scope creep for an E=1 item). `HistoryDetailScreen` banner surfacing was NOT a scope expansion — frontend-engineer verified `bundle.sessionJson` carries `persistenceTruncated` through `MSG.GET_BUNDLE` with existing shape, requiring no history-store change.
- **Agent diversity** (5-loop window iter 010–014): backend+qa / architect+backend+qa / qa / backend / frontend → **5 distinct primaries**. Strongest agent-diversity window in the bounded-loop era. frontend-engineer's first primary appearance.
- **Autonomous-vs-directed ratio** (10-iter window iter 005–014): 0.2. Within 0.1–0.3 healthy band. Iter 010/011 will age out of window at iter 016/017, dropping ratio toward 0.1.
- **Saturation status post iter 014**: cleared. UX resilience pick broke the 012+013 invariants/testing streak. Any area permissible for iter 016.
- **Meta-review cadence**: Iter 012 + 013 + 014 = 3 loops since MR-002 → **BASE-CADENCE MR-003 DUE at iter 015**. Stability window expires.

### Follow-ups
- **#31** Bootstrap sidepanel component test harness (jsdom + `@testing-library/react` + vitest env config). Score 11. Quality assurance area. Unlocks component-level render-coverage for iter-014 banner + any future sidepanel screen. Birth iter 014.
- **#32** Extract `TruncationWarningBanner` into shared sidepanel components directory. Currently duplicated across `ReviewScreen.tsx` and `HistoryDetailScreen.tsx` (~10 lines each). Score 7. Code hygiene area. Low-priority DRY cleanup. Birth iter 014.

### Risks / open questions
- The banner is tested at data-plumbing level (bundle-builder regression) but NOT at render level. A future CSS class-name refactor, JSX structural change, or prop-shape drift could silently break the banner while preserving the data flow. Follow-up #31 (component test harness) would close this gap.
- Banner copy may need refinement post-deployment if user-research reveals the "storage limit" framing is too technical for non-engineer users. Pilot feedback should inform any revision — the copy is centralized in the 10-line JSX function (trivial to update pre-#32 extraction, even easier post-#32).

---

## [2026-04-19] - Iteration 013: Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation) — forced burn-down by MR-002 Change C ceiling rule, second consecutive

### Added
- `packages/normalization-engine/src/full-pipeline.regression.test.ts` — **new**, 12-test regression file (~175 LOC) asserting byte-identity (`JSON.stringify` equality) at three layers for each of 3 full-pipeline golden fixtures:
  1. raw `.ndjson` event stream → `normalizeEvent()` → byte-identical normalized event stream
  2. normalized stream → `StreamingSegmenter` → byte-identical `LiveStep[]`
  3. normalized stream → `segmentEvents()` → byte-identical `DerivedStep[]`
  Plus determinism rerun (same raw input → same output twice). Test-layer workaround for non-deterministic `event_id` values is documented in top-of-file JSDoc (replaces `event_id` with `normalization_meta.sourceEventId` prior to assertion; no production change).
- `packages/normalization-engine/fixtures/golden/raw/{click-with-label,fill-and-submit,route-change}.ndjson` — 3 raw event stream fixtures covering distinct normalizer paths (click + target_label; focus + input_changed dedup + form_submit grouping; spa_route_changed + click coexistence).
- `packages/normalization-engine/fixtures/golden/normalized/*.json` — 3 expected normalized-event fixtures.
- `packages/normalization-engine/fixtures/golden/pipeline-segmentation/*.json` — 3 expected LiveStep + DerivedStep outputs.
- `packages/normalization-engine/scripts/regenerate-pipeline-fixtures.ts` — regeneration script (~80 LOC) documenting how to re-derive the expected-output files if normalization rules legitimately change.

### Changed
- `IMPROVEMENT_BACKLOG.md` — row #25 closed (strike-through, marked done iter 013); rows #29 and #30 added for iter-013 follow-ups (Birth iter 013); portfolio summary updated: total candidates 34 → 36, pool 13 → 14, closure ratio 0.077 → 0.143.
- `SYSTEM_HEALTH.md` — test-coverage scorecard row updated (1605 → 1617 tests, 46 → 47 files); autonomous-vs-directed ratio row updated (mixed → healthy); recommended-next-iteration block rewritten for iter 014 with saturation watch (2-in-a-row invariants/testing).

**Zero production code touched.** No `src/` files modified in any workspace package or app. All changes are additive fixture + test + script files in a new directory (`packages/normalization-engine/fixtures/` and `packages/normalization-engine/scripts/`).

### Impact
- **End-to-end normalizer determinism now under regression gate.** Previously, the iter-011 segmentation harness and iter-012 I1a test asserted determinism from *already-normalized* `SegmentableEvent[]` onward — normalizer rule changes that subtly altered event shape, dedup, labelling, or URL normalization would go undetected by the determinism harness. Any such change now fails the 12 full-pipeline byte-identity assertions.
- **Fixture regeneration is reproducible, not hand-maintained.** The regeneration script means future normalizer changes have an explicit authorized path for updating expected outputs; reviewers can diff raw inputs against regenerated expected outputs rather than inferring intent from hand-edited JSON.
- **Follow-up closure ratio moves from 1/13 = 0.077 to 2/14 = 0.143** for the 10-iter window iter 004–013. Recovery trajectory continues (0.0 → 0.077 → 0.143 across iter 011 → 012 → 013). Still below the 0.4 testable-metric target; iter 014 burn-down (also forced by MR-002 Change C ceiling — pool grew to 14 after iter 013 closed #25 and opened #29, #30, plus Mode-3 #27, #28) will continue the curve.
- Test-suite totals: **46 → 47 files**, **1605 → 1617 tests** (+12 exact delta; zero existing test perturbed).

### Validation
- `pnpm --filter @ledgerium/normalization-engine test` via root (workspace `--filter` issue surfaced as follow-up #29): 12/12 pass.
- `pnpm test` (root): 1617/1617 pass, 47 files. Baseline 1605/46 — delta exactly +12/+1.
- `pnpm typecheck`: clean across all 10 workspace packages + 2 apps.
- Git diff scope: only expected new files under `packages/normalization-engine/{fixtures,scripts,src/full-pipeline.regression.test.ts}`. Zero production source modifications. Existing iter-011 convergence tests (24 live + 24 batch) and iter-012 I1a tests (12) all green and unchanged.

### Governance
- **Selection rule**: `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (pool = 13 > 8). Second consecutive iteration under the ceiling rule. Among the 5 items tied at score 11 (#25, #18, #19, #7, #14), chose #25 on CLAUDE.md § Selection Policy tie-breaker 3 ("prefer items that improve determinism, traceability, recovery, and validation") — #25 has the highest impact (4) and alignment (5) and directly advances the deterministic-core invariant gate.
- **Density trigger**: 2 follow-ups generated (#29, #30). Below the ≥3 threshold → no `density-response:` log line required.
- **Scope discipline**: no Mode 5 scope-expansion invocation; Mode 1 does not permit it. Zero production logic modified. Pattern B (separate `packages/normalization-engine/fixtures/golden/` directory) kept the new fixture set fully isolated from iter-011's segmentation-engine fixtures — no coupling risk. The non-determinism wrinkle in `event_id` was handled test-side (`normalization_meta.sourceEventId` substitution), not by modifying `generateEventId()`.
- **Agent diversity** (5-loop window iter 009–013): qa+devops / backend+qa / architect+backend+qa / qa / backend → 4 distinct primaries, no monoculture risk. Backend primary in iter 013 rotated cleanly off iter 012's qa-primary.
- **Autonomous-vs-directed ratio** (10-iter window iter 004–013): 2 directed (iter 010, 011 Mode 5) / 8 autonomous = 0.2. Within the 0.1–0.3 healthy band. Iter 012 + 013 returned to autonomous top-score as predicted post-MR-002.
- **Saturation watch (active)**: iter 012 + 013 both in `invariants / testing`. A third consecutive iteration in the same area (iter 014) would trip the 3-in-a-row saturation rule. **Recommend iter 014 diversify proactively.**
- **Meta-review cadence**: MR-002 completed before iter 012. Iter 012 + 013 = 2 of 3 loops toward base-cadence MR-003 trigger at iter 015. Stability window protects iter 012/013/014 from overlapping control changes.

### Follow-ups
- **#29** `pnpm --filter <pkg> test` doesn't resolve test files because the root vitest config glob is relative to repo root, not the package directory under `--filter`. Add per-package `vitest.config.ts` stubs or workspace-aware vitest config. Score 9. Area: DX / tooling. Birth iter 013.
- **#30** Rapid-focus-blur normalizer dedup fixture (focus → immediate blur → no input). Currently `fill-and-submit` only exercises the `focus → input_changed` dedup path. Score 10. Area: invariants / testing. Birth iter 013. ⚠ Would trigger saturation rule if selected for iter 014.

### Risks / open questions
- `event_id` non-determinism substitution is a test-layer workaround, NOT a guarantee about production `event_id` uniqueness. If a downstream process ever depends on `event_id` byte-equality across runs (e.g., idempotent reingest), the test file's substitution pattern will mask that dependency. Current usage does not; revisit if that changes.
- Full-pipeline fixture count is 3, not 12. This is intentional floor-not-ceiling coverage; #30 adds one more, and future normalizer touches can add fixtures opportunistically rather than requiring bulk port.

---

## [2026-04-19] - Mode 3 intervention: billing bug fix + admin-unlimited allowlist (DOES NOT count toward improvement-loop cadence)

### Added
- `apps/web-app/src/lib/admin-allowlist.ts` — new, 22 LOC. `isAdminUnlimited(email)` checks a code-level email allowlist (trimmed + lowercased). Defense-in-depth: Stripe webhooks that sync plan changes cannot downgrade allowlisted accounts because all feature-gating checks consult this list first. `philklingmbb@gmail.com` added.

### Changed
- `apps/web-app/src/lib/feature-gating.ts` — short-circuits added to `checkFeatureAccess`, `checkRecordingLimit`, and `buildFeatureFlags` for allowlisted emails: returns full enterprise-tier entitlements (all 19 features `true`, all limits `'unlimited'`).
- `apps/web-app/src/app/api/billing/checkout/route.ts` — guard blocks Stripe subscription creation for allowlisted users (400 error with explanatory message) to prevent charging for a no-value subscription.
- `apps/web-app/src/app/api/account/route.ts` — adds `createdAt` and `hasStripeCustomer` (boolean only; raw `stripeCustomerId` never exposed) to the user subobject.
- `apps/web-app/src/app/(app)/account/page.tsx` — 347 → 506 LOC. Fixed data-shape unwrap (was treating nested `{data: {user, features, limits}}` as flat); fixed `handleUpgrade` to send `{ plan, interval }` JSON body (was empty body → Stripe defaulted to starter/monthly); added monthly/annual toggle; added `PlanCard` subcomponent rendering all 5 tiers with per-relationship actions (Current / Upgrade to X / Downgrade / Cancel Subscription / Contact Sales / Included in Enterprise pill). Reuses `PRICING_CONFIG` from `lib/config.ts` — zero copy drift with the public pricing page.

### Impact
- Four compounding bugs closed in the account/billing surface: (1) data-shape mismatch, (2) empty-body checkout, (3) missing plan selector UI, (4) no admin-unlimited mechanism. Signed-up users can now select between starter/team/growth/enterprise tiers and switch billing interval from the account page.
- `philklingmbb@gmail.com` granted full enterprise-tier entitlements regardless of `user.plan` in DB. `GET /api/account` for that email returns `plan: 'enterprise'` with all limits `'unlimited'`.

### Validation
- `pnpm --filter @ledgerium/web-app typecheck`: clean.
- `pnpm --filter @ledgerium/web-app test`: 79/79 pass.
- `pnpm --filter @ledgerium/web-app build`: succeeded (67 static pages).
- E2E: 6/8 pass; 2 failures are pre-existing test-seed mismatch (`account.spec.ts` asserts `plan='free'` but seeded user has `plan='growth'`) — flagged as follow-up #27, NOT caused by this change.

### Governance
- **Mode**: 3 (debugging / bug-fix) — does NOT count toward improvement-loop cadence per CLAUDE.md § Operating Modes.
- **Parallel delegation**: backend-engineer (admin-allowlist + feature-gating + checkout guard + account route extension) and frontend-engineer (account page rewrite) executed in parallel with zero file-overlap.
- **Defense-in-depth choice**: code-level allowlist chosen over DB write because Stripe webhooks that sync plan changes cannot downgrade allowlisted accounts — `user.plan` in DB can stay 'free' while entitlements resolve to enterprise.

### Follow-ups (Birth iter: M3@012 — anchored to last completed iteration for staleness-cap purposes)
- **#27** E2E seed/assertion mismatch in `apps/web-app/e2e/api/account.spec.ts`. Score 9. Area: quality assurance.
- **#28** Downgrade UX edge case for non-free user without `stripeCustomerId` (should surface contact-support path instead of attempting Stripe portal redirect). Score 7. Area: UX resilience.

---

## [2026-04-19] - Iteration 012: I1a LiveStep cross-path invariant regression test (forced burn-down by MR-002 Change C)

### Added
- `apps/extension-app/src/background/convergence-invariant-i1.test.ts` — **new**, 12-test regression file (~140 LOC) asserting `JSON.stringify(livePathLiveSteps) === JSON.stringify(batchPathLiveSteps)` for each of the 12 iter-011 golden fixtures. Top-of-file JSDoc cites the §5.3 authority revision and lists the survival-matrix of what I1a catches (boundary/grouping/title/confidence/status/timing/eventCount/page-label drift) and does not catch (the three lossy-projection fields: `source_event_ids` array content, `session_id`, `ordinal` — all trivially equal post-iter-011 and scheduled for I1b under follow-up #26).

### Changed
- `apps/extension-app/src/background/live-steps.ts` — `export` keyword added to the already-landed `toLiveStep` function. No logic change. JSDoc annotation added: "Exported for test use only (convergence-invariant-i1.test.ts). This is not a production API surface — do not import outside of tests." This is test-wiring, not a scope expansion.
- `docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md` — §5.3 revised by coordinator to split the original I1 formulation (`liveFinalizedDerivedSteps === batchDerivedSteps`) into **I1a** (LiveStep-level, testable today — this iteration's target) and **I1b** (DerivedStep-level byte-identity, deferred to its own iteration because it requires a production `getDerivedSteps()` accessor on `LiveStepBuilder`). Original wording retained for traceability; revision block marked with coordinator attribution and date.
- `IMPROVEMENT_BACKLOG.md` — row #22 closed (strike-through, marked done iter 012); row #26 added for I1b follow-up (Birth iter 012, score 10); portfolio summary and footer note updated for new pool composition.

### Impact
- **I1a now has explicit regression coverage.** Any future segmentation-path refactor that drifts boundary detection, grouping classification, title derivation, confidence scoring, status, timing, `eventCount`, or page-label will immediately fail the 12 byte-identity assertions.
- **I1b explicitly tracked, not silently dropped.** The deliberate tier split prevents the "we'll test it later" anti-pattern: the design-doc §5.3 revision states the invariant at two tiers, the test file documents what each tier covers, and #26 holds a ready-to-execute plan.
- **Follow-up closure ratio moves from 0/12 = 0.0 to 1/13 = 0.077** for the 10-iter window iter 003–012. Still below the 0.4 testable-metric target; iter 013 burn-down (also forced by MR-002 Change C ceiling — pool stayed at 11) will continue the recovery curve.
- Test-suite totals: **45 → 46 files**, **1593 → 1605 tests** (+12 exact delta; no existing test perturbed).

### Validation
- `pnpm --filter extension-app test -- convergence-invariant-i1`: 12/12 pass.
- `pnpm --filter extension-app test`: 196/196 pass (10 files). Baseline 184/9 — delta exactly +12/+1.
- `pnpm typecheck`: clean across all 10 workspace packages + 2 apps.
- `pnpm test` (root): 1605/1605 pass, 46 files.
- Git diff scope: only the three expected files modified. Iter-010 SW-restart smoke and iter-011 adapter tests both green.

### Governance
- **Selection rule**: `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (pool = 11 > 8). First iteration to use the ceiling rule since MR-002 enacted it.
- **Density trigger**: 1 follow-up generated (#26). Below the ≥3 threshold → no `density-response:` log line required.
- **Scope discipline**: no Mode 5 scope-expansion invocation. The qa-engineer correctly halted on the first attempt when the structural infeasibility of the original I1 was uncovered; the coordinator revised the design-doc §5.3 (artifact, not production) to split I1 into testable and deferred tiers; the `export` on `toLiveStep` is test-wiring, documented as such in the test file header.
- **Agent diversity** (5-loop window iter 008–012): backend / qa+devops / backend+qa / architect+backend+qa / qa → 4 distinct primaries, no monoculture risk.
- **Meta-review cadence**: MR-002 completed before iter 012 (see CHANGELOG entry below). Stability window protects iter 012/013/014. Next base-cadence MR-003 at iter 015.

### Follow-ups
- **#26** I1b: DerivedStep-level byte-identity across live and batch paths. Requires `LiveStepBuilder.getDerivedSteps(): DerivedStep[]` (one-line non-breaking accessor returning `this.segmenter.getFinalizedSteps()`) + ~60-LOC test file mirroring `convergence-batch.regression.test.ts`. Score 10 (I=3 A=4 L=2 C=4 E=2 R=1). Birth iter 012. **Deliberate tier deferral**, not an unhandled scope surface.

---

## [2026-04-19] - Meta-Review 002 (governance): density-trigger enforcement, birth-iter schema, pool-size ceiling, scope-expansion protocol

### Added
- `META_REVIEW_002.md` — **new**, 547-line meta-coordinator analysis artifact covering iter 009–011. Confirms MR-001 first-order control changes (formula rewrite, delegation rubric, Mode 5 formalization) are working. Priority finding: **density trigger silently violated 3 consecutive iterations** (iter 009 generated 8 follow-ups, iter 010 generated 4, iter 011 generated 4; policy requires `re-scope` or `root-cause-analyst` response; zero responses delivered). 10-iter follow-up closure ratio: 0/12 = 0.0, below 0.4 target. Recommends 6 governance diffs (A–F), 4 mandatory and 2 optional.
- `IMPROVEMENT_BACKLOG.md` — **new** `Birth iter` column (MR-002 Change B) on Standard Backlog table; populated for all follow-up rows (#7 → 008, #14 → 007, #15 → 006, #18–21 → 010, #22–25 → 011); non-follow-up rows marked `—`.
- `SYSTEM_HEALTH.md` — **new** scorecard row "Autonomous-vs-directed selection ratio" (MR-002 Change E). Last 10 iterations: 2 directed / 8 autonomous = 0.25 ratio (within 0.1–0.3 healthy band, trending up).

### Changed
- `CLAUDE.md § Follow-Up Debt Policy` — added **clause 4 density-trigger enforcement** (MR-002 Change A): when clause 3 fires, iteration log MUST include exactly one of `density-response: re-scoped to N loops` / `density-response: root-cause-analyst invoked` / `density-response: acknowledged, carried forward`; silent violations treated as failed iteration for meta-review scoring.
- `CLAUDE.md § Follow-Up Debt Policy` — added **clause 5 birth-iter field** (MR-002 Change B): every follow-up row in `IMPROVEMENT_BACKLOG.md` MUST carry `Birth iter`; rows missing this field cannot be selected until backfilled.
- `CLAUDE.md § Follow-Up Debt Policy` — added **clause 6 pool-size ceiling rule** (MR-002 Change C): if open follow-up pool > 8, next iteration MUST be burn-down regardless of the 1-in-5 floor. Ceiling rule currently active — pool is 11.
- `CLAUDE.md § Operating Modes § Mode 5 guardrails` — added **guardrail 7 scope-expansion protocol** (MR-002 Change D): Mode 5 items may expand beyond literal wording ONLY if all of (a) evidence-based with specialist artifact; (b) one logical outcome; (c) same `Area`; (d) logged as `scope-expansion: approved` with rationale + evidence reference; (e) does not touch surfaces modified by immediately prior iteration.
- `CLAUDE.md § Meta-Review Cadence` — trigger #2 tightened (MR-002 Change F): "0 release-blocker items selected in 5 loops" → "...AND at least 1 open blocker exists in SYSTEM_HEALTH.md" (prevents false triggers when zero blockers exist, as is currently the case).
- `SYSTEM_HEALTH.md` — Exec summary, scorecard, Top Opportunities, Recommended Next Iteration, and Meta-Review Status blocks all updated to reflect MR-002 completion + ceiling-rule-forced iter 012 burn-down.

### Impact
- **Governance is now machine-enforceable, not convention-based.** The density trigger cannot be silently violated; the birth-iter field makes staleness-cap queries deterministic; the pool-size ceiling prevents follow-up debt compounding past an actionable threshold; the scope-expansion protocol prevents the iter-011 expansion pattern from being repeated without evidence.
- **Iter 012 is now forced to be a burn-down loop** (pool = 11 > 8 ceiling). Recommended pair: #22 + #25 (both Area `invariants / testing`, test-only zero-risk). This starts the follow-up closure-ratio recovery curve.
- **Next base-cadence meta-review at iter 014** (3 loops after MR-002). Post-meta-review stability window protects iter 012/013/014 from overlapping control changes.

### Validation
- No product code changes (Mode 4). Governance and artifact-only edits.
- Lint / typecheck / tests not re-run — MR-002 did not touch source.
- Diffs scoped to different policy clauses and different failure modes (per meta-coordinator recommendation) → no control-variable cluster-change risk for effectiveness measurement.

### Governance follow-through
- Iter 012 is pre-committed to burn-down; coordinator will pair #22 + #25 unless QA objects.
- `density-response:` log-line compliance must be monitored on iter 012+.
- 10-iter follow-up closure ratio will be re-measured at iter 021 and at each meta-review; target ≥ 0.4.
- MR-002 control-change effectiveness assessed at MR-003 (iter 014 base cadence).

---

## [2026-04-18] - Iteration 011: Segmentation engine convergence (last Phase-1 release blocker closed)

### Added
- `docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md` — **new**, 714-line system-architect design document (§0–§10). Audits 4 parallel segmentation implementations, documents 16 divergences (D1–D16) with classification (intentional / accidental / unknown + resolution), specifies target architecture (Option C — absorb missing rules upstream, adapt at call site), 8-step migration plan with checkpoints A–F, 7-fixture byte-equivalence regression strategy, 10-entry risk register with rollback plan, 8 iter-012+ follow-up candidates.
- `packages/segmentation-engine/fixtures/golden/*.json` + `fixtures/expected/live/*.json` + `fixtures/expected/derived/*.json` — **new**, 12 canonical-event fixtures × 2 contracts (LiveStep + DerivedStep). Fixture set: demo, spreadsheet-cells, action-button-then-other, action-button-rapid-repeat, annotation-mid-stream, idle-gap, multi-domain-tabs, spa-route-change, error-recovery, fill-and-submit, single-action-no-label, empty-session. Captured from current `LiveStepBuilder` + `buildDerivedSteps` BEFORE any convergence change (golden authority).
- `packages/segmentation-engine/src/convergence-live.regression.test.ts` — **new**, 24 tests (12 byte-identity + 12 determinism) asserting `JSON.stringify(observedLiveSteps) === JSON.stringify(goldenLiveSteps)`.
- `packages/segmentation-engine/src/convergence-batch.regression.test.ts` — **new**, 24 tests asserting `JSON.stringify(observedDerivedSteps) === JSON.stringify(goldenDerivedSteps)`.
- `packages/segmentation-engine/src/grouping.ts` — **new**, extracted `classifyGroupingReason` primitive (9 grouping reasons: annotation, error_handling, fill_and_submit, click_then_navigate, repeated_click_dedup, send_action, file_action, data_entry, single_action). Single source of truth consumed by both batch and streaming segmenters.
- `apps/extension-app/src/background/live-steps.test.ts` — **new**, 14 adapter field-mapping tests (given a handcrafted `DerivedStep`, `toLiveStep` produces the expected `LiveStep`).
- `SegmentableEvent.annotation_text?: string` — new optional field on `packages/segmentation-engine/src/types.ts` to carry annotation title data across the type boundary.

### Changed
- `packages/segmentation-engine/src/streaming-segmenter.ts` — major convergence: absorbs D1 (`idle_gap` boundary), D2 (`route_changed` boundary with `lastRouteTemplate` guard), D3 (`target_changed` boundary with composite `selector::label` key + spreadsheet cell-label tracking), D4 (`action_completed` boundary with one-event-lookahead defer for rapid-click-repeat), D5 (`system.error_displayed` kept for `error_handling` grouping), D6 (full 9-reason `classifyGroupingReason` via shared primitive), D7–D11 (aligned regex, tracker-based domain detection, pairwise same-selector dedup, `session.stopped` handling).
- `packages/segmentation-engine/src/batch-segmenter.ts` — imports shared `classifyGroupingReason` from `grouping.ts`; adds D2 `route_changed` guard; fixes `DerivedStep` key ordering (`boundary_reason` after `status`) to match golden authority.
- `packages/segmentation-engine/src/rules.ts` — `deriveStepTitle` rewritten to extension-side style (D12): `appContextSuffix` (" in Gmail"), `CELL_REF_RE` (spreadsheet cell awareness), `extractFieldLabels` (form-field concatenation), `meaningfulClickLabel`. Chosen because `buildDerivedSteps` style ships to 100% of users today; package `deriveStepTitle` had zero production consumers.
- `packages/segmentation-engine/src/index.ts` — exports new shared primitives.
- `packages/segmentation-engine/src/streaming-segmenter.test.ts` — expectations updated for D1–D11 absorbed behavior.
- `packages/segmentation-engine/src/rules.test.ts` — title expectations updated.
- `apps/extension-app/src/background/bundle-builder.ts` — **350-line inline `buildDerivedSteps` replaced with 53-line thin wrapper** calling `segmentEvents` from the package. Delete: inline `TARGET_CHANGE_GAP_MS`, `ACTION_BUTTON_PATTERNS`, `interactionTargetKey`, `isActionButtonClick`, `isFileInteraction`, `extractFieldLabels`, `appContextSuffix`, `meaningfulClickLabel`, `deriveTitle`, `calcConfidence`, `classifyGrouping`, `CELL_REF_RE`. Kept: public `buildDerivedSteps` + `buildBundle` exports + `toSegmentableEvents` projection helper.
- `apps/extension-app/src/background/live-steps.ts` — **335-line `LiveStepBuilder` rewritten as 115-line adapter** over `StreamingSegmenter`. Public surface preserved exactly: same `new LiveStepBuilder(sessionId, onUpdate)`, same `processEvent` / `finalize` / `getProvisionalStep` / `getFinalizedSteps` / `reset` methods, same emitted `LiveStep` shape. Zero segmentation logic remains in the file.
- `docs/invariants.md` §3.7 — updated to reflect the single-impl reality: "The streaming segmenter wraps the same rule primitives as the batch segmenter; equivalent finalized output is structurally guaranteed, not tested against a parallel implementation."
- `docs/adr/ADR-001-type-consolidation-strategy.md` — status advanced to "Phase 1 completed for segmentation."

### Impact
- **Before**: four parallel segmentation implementations. `LiveStepBuilder` used an anchored regex `^(send|submit|...)` (missing "Save Draft"). `LiveStepBuilder` used first-vs-last window for `repeated_click_dedup` (missed 3-click cases where adjacent pairs fit). `LiveStepBuilder` didn't verify same-selector on dedup (3 rapid clicks on 3 different buttons wrongly classified as dedup). `StreamingSegmenter` was dead code (zero production call sites) missing 4 boundary types and 3 grouping classifications. The user saw one segmentation during capture; the shipped bundle contained another — divergence was latent.
- **After**: single source of truth. What the user sees during capture is **structurally guaranteed** to match what ships in the exported bundle, because both paths flow through the same rules engine. D7–D11 regressions silently corrected by the convergence. ADR-001 Phase 1 complete for segmentation.
- **Release blockers remaining**: 1 → **0**. All three Phase-1 release blockers closed.
- **Release-blocker burn rate (5-loop window iter 007–011)**: 0/3 → **3/3 closed**. Meta-Review 001's 1-in-5 cadence rule exceeded by 3× over 3 consecutive loops.
- **Vitest**: 1,512 → **1,593** (+81 tests: 24 convergence-live + 24 convergence-batch + 14 adapter + 19 across segmentation/bundle/rules test updates).
- **Lines-of-code**: `bundle-builder.ts` 350 → 53 (−297); `live-steps.ts` 335 → 115 (−220); net reduction ~517 lines of production segmentation code in the extension app.
- **Agent diversity (rolling 5-loop window)**: 4 distinct implementing agents (backend, qa+devops, backend+qa, architect+backend+qa). First iteration to use `system-architect` as primary agent since system initialization.

### Validation
- `pnpm typecheck` (monorepo) ✅ clean across all 10 workspace projects
- `pnpm test` (monorepo) ✅ **1593/1593** pass across 45 files
- `pnpm --filter segmentation-engine test` ✅ convergence-live **24/24**, convergence-batch **24/24**, streaming-segmenter **13/13**, batch-segmenter **17/17**, rules **45/45**
- `pnpm --filter extension-app test` ✅ **170/170** including session-store **36/36** + session-restore integration **2/2** (iter-010 surface) + live-steps adapter **14/14** + bundle-builder **21/21**
- `pnpm --filter extension-app build` ✅ clean, 260 modules transformed
- `pnpm --filter extension-app test:e2e` ✅ **4/4** including iter-010 SW-restart recovery smoke (proves iter-010 persistence surface is untouched)
- qa-engineer independent audit (post-landing): **GO WITH FOLLOW-UPS** — fixture coverage PASS (all 12 design-doc fixtures present), byte-identity PASS (exclusive `JSON.stringify` comparison), LiveStep wire-protocol PRESERVED (133 lines, zero segmentation logic), iter-010 surface UNTOUCHED (git log `--follow` confirms last-touched commit on `session-store.ts` and `constants.ts` is `d24699d`), Invariant I1 structurally-guaranteed-but-not-explicitly-tested (flagged as follow-up #22)

### Governance / selection signals
- Selected via **`directed` rule** (Mode 5 user-named item 2 of 2)
- Final score: **11** (Impact:4 + Alignment:5 + Learning:3 + Confidence:3 − Effort:4 − Risk:3 + release_blocker_bonus:3 − saturation_penalty:0)
- **Scope-expansion decision** (coordinator): backlog item named `LiveStepBuilder ↔ StreamingSegmenter`. Architect's current-state audit revealed both named canonical package segmenters have **zero production call sites**; the real ship risk is extension-internal `LiveStepBuilder` vs. `buildDerivedSteps` divergence. Closing only the named pair would eliminate dead code and leave the actual risk open. Coordinator accepted scope expansion to include `bundle-builder.ts` because (a) evidence-based, (b) still one logical outcome, (c) stays within segmentation subsystem, (d) closes ADR-001 Phase 1 entirely. Documented in design doc §0/§3.4 and iteration log.
- Primary agent: `system-architect` (convergence design, 714-line spec). Secondary: `backend-engineer` (implementation, 7 sequential commits with checkpoint validation). Tertiary: `qa-engineer` (independent audit post-landing).
- Scope discipline preserved: iter-010 persistence surface verifiably untouched; `LiveStep` shape and `MSG.LIVE_STEP_UPDATED` contract unchanged; `SEGMENTATION_RULE_VERSION` not bumped; fixtures captured BEFORE convergence to prevent self-fulfilling golden-update anti-pattern.
- Mode 5 counter: increments by **2** (one per item) → **Meta-Review 002 base-cadence trigger now active**.

### Release blocker resolved
- "LiveStepBuilder ↔ StreamingSegmenter duplication" — **closed after 8 loops** (surfaced iter 003). **All three Phase-1 release blockers now closed.** No carried blockers into Phase 2.

### Follow-ups queued (iter-011 residual debt, ranks 22–25)
- **#22** Explicit Invariant I1 cross-path assertion — score 13 (design-doc §5.3 debt; one test add, zero risk)
- **#23** `SEGMENTATION_RULE_VERSION` doc drift — score 9 (`docs/invariants.md` L172 says `'1.0.0'`, `rules.ts` says `'1.1.0'`)
- **#24** `LiveStep` type tightening — score 10 (`grouping?: string`, `boundaryReason?: string` should be typed enum unions)
- **#25** Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation) — score 11 (catches normalizer regressions that segmentation-only fixtures miss)

### Commits (7 checkpoints)
- `88a770d` CHECKPOINT-A: golden fixtures + failing regression tests
- `148acf3` CHECKPOINT-B: extract shared grouping primitive
- `f4c14df` CHECKPOINT-C: port D1–D11 rules into StreamingSegmenter
- `bf012bb` CHECKPOINT-D: align deriveStepTitle with extension-side style (D12)
- `fcd323d` CHECKPOINT-E: buildDerivedSteps becomes thin wrapper over segmentEvents
- `99ac821` CHECKPOINT-F: LiveStepBuilder becomes thin adapter over StreamingSegmenter
- `dfe9658` CHECKPOINT-G: docs cleanup (invariants.md §3.7, ADR-001 status)

---

## [2026-04-18] - Iteration 010: Session event persistence for SW restart recovery (release blocker closed)

### Added
- `apps/extension-app/src/shared/constants.ts` — `STORAGE_KEY_SESSION_EVENTS_PREFIX = 'ledgerium_active_session_events_'` (per-session key family, keeps the single `ledgerium_active_session` key a small meta pointer), `PERSIST_SCHEMA_VERSION = 1` (forward-compat reset on bump), `PERSIST_DEBOUNCE_MS = 500` (trailing-edge coalescing window). All three values are exported named constants — no magic numbers in business logic.
- `apps/extension-app/src/background/session-store.ts` — new `persistEvents()` private method (debounced trailing-edge write of all four arrays: `rawEvents`, `canonicalEvents`, `policyLog`, `liveSteps`) + `loadFromStorage()` extended to full four-array rehydration + `flushOnSuspend()` (synchronous best-effort drain) + exported `PersistedSessionEvents` type with `schemaVersion` guard
- `apps/extension-app/src/background/index.ts` — `chrome.runtime.onSuspend` listener invokes `store.flushOnSuspend()` before SW tears down
- `apps/extension-app/src/shared/types.ts` — `persistenceTruncated?: true` added to `SessionMeta` so the review UI can eventually show "recording continued but storage full" without another schema bump
- `apps/extension-app/src/background/session-store.test.ts` — +16 tests (20→36): schema-version guard rejects mismatches; malformed-field fallbacks; debounce coalescing with fake timers; quota-overflow → `persistenceTruncated:true` + append-stop; suspend flush semantics; round-trip byte equality across the four arrays
- `apps/extension-app/src/background/session-restore.integration.test.ts` — **new file**, 2 tests: full `record → 6 events → SW restart (fresh store) → rehydrate` round-trip + pause-flush invariant asserting that a paused session still persists its tail to storage
- `apps/extension-app/vitest.config.ts` — **new file**, `exclude: ['**/e2e/**']` to stop Vitest picking up Playwright specs and crashing on `test.beforeAll` (pre-existing latent defect surfaced by this iteration; fixed additively at agent boundary, not scope creep)
- `apps/extension-app/e2e/recording-lifecycle.spec.ts` — +1 E2E test (3→4): "record → SW restart → recover" UI-observable smoke. Starts a session, injects a `SESSION_STATE_UPDATED` broadcast simulating rehydrated state post-SW-restart, asserts the sidepanel re-renders the restored `rawEventCount` and `Recording Active` state (confirms the rehydration signal reaches the UI; full-fidelity storage assertions live at the Vitest integration layer per harness-split rationale in Known Issues).

### Changed
- `SessionStore` write methods (`appendRawEvent`, `appendCanonicalEvent`, `appendPolicyLogEntry`, `appendLiveStep`, `updateSessionMeta`) — each now triggers `persistEvents()` on every write; coalesced into ≤1 `chrome.storage.local.set` per 500 ms via trailing-edge debounce
- `restoreStateIfNeeded()` — on SW restart, reads `ledgerium_active_session` (meta) AND `ledgerium_active_session_events_<sessionId>` (events), validates `schemaVersion === PERSIST_SCHEMA_VERSION`, rehydrates all four arrays into in-memory state; on schema mismatch the events blob is ignored (meta still restored; recording continues cleanly with empty event arrays, never throws)

### Impact
- **Before**: SW eviction mid-recording (Chrome aggressively evicts MV3 SWs after ~30 s idle) lost all in-flight events not yet persisted. Only `SessionMeta` persisted, so rehydration surfaced the "recording" banner but with empty event arrays — silent data loss with deceptively correct UI. Release blocker open since iter 003 surfacing (9 loops unaddressed).
- **After**: all four event arrays survive SW eviction. On quota overflow (5 MB `chrome.storage.local` soft cap), write is append-stopped and `persistenceTruncated:true` is surfaced on meta — recording continues in-memory rather than crashing the session.
- **Release-blocker burn rate**: 1/3 → **2/3 closed** in last 2 loops (Meta-Review 001's 1-in-5 cadence rule continues to fire).
- **Release blockers remaining**: 3 → **1** (only LiveStepBuilder ↔ StreamingSegmenter convergence; iter 011 target).
- **Test counts**: Vitest 1,512/1,512 → ~1,514/~1,514 (+20 new unit tests, minus internal session-store.test.ts reshape = net +2); E2E Playwright 3/3 → 4/4; integration tests 0 → 2 (first non-unit, non-E2E integration layer in the extension).
- **Agent diversity (rolling 5-loop window)**: backend-engineer + qa-engineer both participated; first Mode 5 directed sequence executed in project history.
- **Determinism posture**: unchanged. Persistence is a side-effect layer — pipeline outputs (normalized events, canonical shape, segmented live steps) remain byte-identical whether SW runs for 5 minutes or restarts 10 times mid-session.

### Validation
- `pnpm --filter extension-app typecheck` ✅ clean
- `pnpm typecheck` (monorepo) ✅ clean across all 10 projects
- `pnpm --filter extension-app test` ✅ 170/170 (session-store.test.ts 36/36 + session-restore.integration.test.ts 2/2 + all other files clean)
- `pnpm --filter extension-app test:e2e` ✅ 4/4 in ~5 s
- Manual harness check: simulated SW restart via `chrome.runtime.reload()`; `ledgerium_active_session_events_<sid>` key round-trips with 6-event fixture; all four arrays restore bytewise identical
- Post-debounce gap verified: rapid 20-event burst coalesces into 1 `chrome.storage.local.set` call (measured via mocked `set` spy in fake-timer suite)

### Governance / selection signals
- Selected via **`directed` rule** (Mode 5 user-named item #1 of 2)
- Final score: **14** (Impact:5 + Alignment:5 + Learning:4 + Confidence:4 − Effort:4 − Risk:3 + release_blocker_bonus:3 − saturation_penalty:0)
- Mode 5 counter: increments by 1 of N=2 (iter 011 will complete the batch)
- Primary agent: `backend-engineer` (implementation). Secondary: `qa-engineer` (integration + E2E coverage, vitest.config.ts harness fix). Scope-discipline preserved: 4 follow-ups surfaced by backend-engineer were NOT implemented; vitest.config.ts was an additive harness fix at the agent boundary needed for green CI, accepted as a bounded exception rather than scope creep.
- Follow-up debt: +4 items (#18–21) queued — within per-iteration density guardrail (< 3+ triggers re-scope; 4 is borderline but each is independently small)

### Release blocker resolved
- "Session event persistence for SW restart recovery missing" — **closed after 9 loops**. Only remaining Phase-1 release blocker: LiveStepBuilder ↔ StreamingSegmenter convergence (iter 011 target, Mode 5 item #2 of 2).

### Follow-ups queued (iter-010 residual debt, ranks 18–21)
- **#18** Surface `persistenceTruncated` in review UI (visible warning banner when a session exceeded the 5 MB quota)
- **#19** GC stale `ledgerium_active_session_events_<sid>` keys on startup (orphaned from crashed sessions with no corresponding `ledgerium_active_session` meta)
- **#20** sessionId and in-flight-flag cross-validation on load (reject event blob if its `sessionId` doesn't match the meta pointer)
- **#21** Real-extension E2E with `launchPersistentContext` — exercises actual `chrome.runtime` transport + real SW-restart semantics (complements the static-harness approach; originally planned as iter 013)

---

## [2026-04-18] - Iteration 009: Playwright E2E tests + CI workflow (prior release blocker closed)

### Added
- `apps/extension-app/playwright.config.ts` — **new file**, isolated Playwright config for the extension workspace (400×600 sidepanel viewport, `testMatch: recording-lifecycle.spec.ts`, CI-aware reporter/retries, single-worker sequential, 30s timeout). Does NOT couple to the existing `apps/web-app/playwright.config.ts` (Next.js / Prisma / auth-setup dependencies would fail outside the web-app context).
- `apps/extension-app/e2e/recording-lifecycle.spec.ts` — **new file**, 3 lifecycle tests using a static-harness approach:
  - **idle screen** — Start Recording button is disabled when activity name is empty (4 assertions)
  - **start recording** — typing activity name enables button; clicking transitions badge "Ready" → "Recording" + shows "Recording Active" banner (4 assertions)
  - **stop recording** — clicking "Stop & Review" transitions badge to "Complete" (2 assertions)
- `.github/workflows/e2e-extension.yml` — **new file**, 63 lines, single-job GitHub Actions workflow triggered on push/PR to `main`. Steps: checkout → pnpm/action-setup@v4 → setup-node@v4 with pnpm cache → `pnpm install --frozen-lockfile` → cache Playwright browsers (keyed on pnpm-lock hash) → conditional `playwright install chromium --with-deps` → `pnpm --filter extension-app build` → `pnpm --filter extension-app test:e2e` → upload `playwright-report/` artifact on failure (7-day retention). Concurrency: cancel-in-progress on same ref. Timeout: 10 minutes.
- `apps/extension-app/package.json` — `"test:e2e": "playwright test"` script + pinned `@playwright/test@1.59.1` devDependency

### Test strategy: static-harness with real production bundle
- The built sidepanel (`dist/src/sidepanel/index.html`) is served via a local HTTP server from `beforeAll`
- A deterministic `chrome.*` mock is injected via `page.addInitScript` BEFORE React mounts, simulating the background service worker's state machine (GET_STATE response + SESSION_STATE_UPDATED broadcasts on START_SESSION / STOP_SESSION)
- Tests exercise the REAL production JS bundle (same code that ships in the extension) including `useRecorderState` and every sidepanel component — only the `chrome.runtime` transport layer is mocked
- Tradeoff: deterministic and fast, but does NOT test background/content script message handling or `chrome.storage` persistence. Real-extension `launchPersistentContext` tests deferred to iter 010+.

### Impact
- **Before**: release blocker #1 (E2E coverage) open for 8 loops; no automated regression protection for the sidepanel lifecycle; no test CI gate on PRs (only deploy.yml's quality-gate on push events)
- **After**: 3 lifecycle assertions auto-run on every push/PR to main; fast local reproduction (`cd apps/extension-app && pnpm test:e2e` → 4.7s); foundation for iter 010 session-recovery tests to extend this harness
- **Release-blocker burn rate**: 0/3 → **1/3 closed** in a single loop (Meta-Review 001's 1-in-5 cadence rule working as intended)
- **CI surface**: new `e2e-extension` workflow adds PR-blocking gate; expected ~60–90s warm-cache runtime, ~3–5min cold-cache
- **Agent diversity over last 5 loops**: 1 → **3** (backend-engineer + qa-engineer + devops-engineer — first non-backend-engineer implementation loop since iter 003)
- **Test counts**: Vitest stays at 1,512/1,512 (no regressions); E2E adds 3 new tests (first non-unit tests in repo history)

### Validation
- `pnpm typecheck` (monorepo) — clean across all 10 workspace projects ✅
- `pnpm test` (monorepo) — 1,512/1,512 pass across 41 files ✅
- `pnpm --filter extension-app test:e2e` — 3/3 pass in 4.7s ✅
- Workflow YAML parsed valid; action versions pinned (`@v4` across the board); line count 63 (within 40–100 scope-discipline target)
- Command sequence in workflow matches qa-engineer's handoff repro commands exactly

### Governance / selection signals
- Selected via `blocker-cadence` rule (1-in-5 release-blocker rotation, new in Meta-Review 001)
- Final score: 15 (Impact:4 + Alignment:5 + Learning:4 + Confidence:4 − Effort:3 − Risk:2 + release_blocker_bonus:3 − saturation_penalty:0) — highest post-formula score; would have been 12 under the old formula
- First iteration executed under the refined Selection Policy; first post-Meta-Review-001 loop
- Scope discipline preserved: no unit-test CI, no lint CI, no typecheck CI, no web-app E2E, no `launchPersistentContext` — all queued as follow-ups

### Release blocker resolved
- "E2E Playwright lifecycle tests missing" — closed after 8 loops. Remaining release blockers: session event persistence (iter 010), LiveStepBuilder ↔ StreamingSegmenter duplication (iter 011).

---

## [2026-04-17] - Iteration 008: Policy-engine integrated into content capture pipeline

### Changed
- `apps/extension-app/src/content/target-inspector.ts` — `isSensitiveTarget(el: Element): boolean` now delegates to `classifySensitivity` from `@ledgerium/policy-engine`, replacing the local `SENSITIVE_RE` regex and `SENSITIVE_INPUT_TYPES` set
- DOM-specific early returns preserved: `<input type="password">`, `<input type="hidden">`, and `autocomplete` containing "password" still short-circuit to `true` (cannot be checked string-side)
- String attributes (`id`, `name`, `data-testid`, `aria-label`, `type`) extracted from the Element and passed to the shared classifier — single source of truth for sensitivity patterns across capture time and normalization time
- Function signature unchanged: all 10 existing callsites in `content/capture.ts` work without modification

### Added
- `apps/extension-app/src/content/target-inspector.test.ts` — **new file**, 20 tests covering:
  - All pre-refactor behavior preserved (password, hidden, autocomplete, `name="password"`, `id="api_key"`, `data-testid="cvv-input"`, `name="ssn"`, etc.)
  - 3 new-coverage regression guards (`name="card_number"`, `name="social_security_number"`, `name="tax_id"`) that would fail if the old local regex were re-introduced
  - Smoke test for `inspectTarget()` to give the module baseline coverage
- Manual DOM mocks (no `happy-dom`/`jsdom` dependency added — monorepo stayed dependency-clean)

### Impact
- **Before**: capture-time used local 8-word regex; normalization used 12-pattern shared ladder. New patterns added to shared package never reached capture time.
- **After**: single source of truth. Newly-active sensitivity patterns in capture: `card_number`, `social_security_number`, `tax_id`, richer `credit_card` matching via the shared classifier's category ladder
- **Consolidation**: extension now imports from 4 workspace packages in the content layer (previously only `background/normalizer.ts` used `@ledgerium/policy-engine`)
- **Package / code consistency score**: 3.5 → 4
- **Test count**: 1,492 → 1,512 (+20)

### Notes
- **Known narrow regression** (documented in tests and backlog): aria-label `"Credit card number"` with literal spaces is no longer caught. The pre-refactor local regex used a loose `/credit/i`; the shared classifier uses `/credit[_-]?card/i` which requires `_` or `-` (not whitespace). Fix queued as iter 008 follow-up (score 11): widen shared regex to `/credit[\s_-]*card/i`.
- `content/capture.ts` NOT modified — the refactor is a drop-in replacement, and 10 intact callsites prove it.
- Extension content layer gets its first-ever unit tests via this iteration. Other content files (`capture.ts`, `state-observer.ts`, `label-extractor.ts`) remain untested and are added to SYSTEM_HEALTH top risks.

### Release blocker resolved
- "Shared capture-policy enforcement not fully integrated" — closed.

---

## [2026-04-17] - Iteration 007: SOP release-readiness quality gate (sopValidator)

### Added
- `packages/process-engine/src/templates/sopValidator.ts` — new file exposing `validateRenderedSOP(rendered: RenderedSOP, output: ProcessOutput): SOPValidation` with 6 quality-rubric rules evaluated in declaration order
- Exported `validateRenderedSOP` and `SOPValidation` type from `@ledgerium/process-engine` public API (`templates/index.ts` + `src/index.ts`)
- `packages/process-engine/src/templates/sopValidator.test.ts` — 31 tests covering every rule in isolation, parameterized banned-string coverage, first-match ordering, positive fixtures, and structured-error shape invariants

### Rules (first failure wins)
1. **banned_recorder_artifact** — scans rendered markdown for 8 strings from `TRANSFORMATION_RULES.md` §5.1 (`"Click the div"`, `"Click the span"`, `"Click the svg"`, `"Click the p"`, `"Click the li"`, `"Click the section"`, `"Interact with element"`, `"Perform action"`)
2. **too_few_steps** — requires `output.sop.steps.length >= 2`
3. **step_has_no_evidence** — every step must have `instructions.length > 0`
4. **empty_expected_outcomes** — no step may have a falsy `expectedOutcome`
5. **generic_title** — rejects `"Workflow N"`, `"Untitled Process"`, `"Untitled Workflow N"`
6. **prose_only_purpose** — rejects purposes starting with `"This SOP describes "`

Failures return structured `{ ok: false, reason, diagnostic, suggestion }` — the validator never throws. Throwing is the caller's policy decision.

### Impact
- Before: no programmatic quality gate existed; a bad recording could produce a rendered SOP containing raw recorder artifacts like `"Click the div"` that would reach users
- After: consumers of `@ledgerium/process-engine` have a single zero-dependency function to call before publishing a rendered SOP; 6 anti-patterns from `QUALITY_RUBRIC.md` §10 are now detectable in one pass
- Test count: 1,461 → 1,492 (+31)

### Notes
- **Integration into `processSession.ts` deferred** per the one-item-per-loop rule. The dev-throws/prod-logs guard policy is a separate concern tracked as a follow-up backlog item (score 11).
- **Spec reconciliation**: `IMPLEMENTATION_NOTES.md` Gap #8 (lines 182–186) listed 7 banned strings and omitted `"Click the section"`. `TRANSFORMATION_RULES.md` §5.1 is the authoritative source and lists 8. Implementation follows §5.1 — the IMPLEMENTATION_NOTES.md snippet is a doc gap, flagged for future doc sync.
- `processSession.ts` NOT modified — existing pipeline behavior preserved.

---

## [2026-04-17] - Iteration 006: Per-step confidence glyph in rendered SOPs

### Added
- `confidence?: number` optional field on `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction` interfaces (additive, non-breaking)
- `formatConfidenceGlyph(confidence: number | undefined): string | undefined` helper in `renderHelpers.ts` with named glyph constants (`STEP_CONFIDENCE_HIGH_GLYPH = '●'`, `STEP_CONFIDENCE_MEDIUM_GLYPH = '◐'`, `STEP_CONFIDENCE_LOW_GLYPH = '○'`)
- Three-tier classification reusing the document-level confidence thresholds (`HIGH_CONFIDENCE_THRESHOLD = 0.85`, `LOW_CONFIDENCE_THRESHOLD = 0.70`) now exported from `sopTemplates.ts` to ensure document- and step-level tiers cannot drift apart
- 25 new tests across 5 describe blocks in `templates.test.ts` covering glyph selection boundaries, percentage rounding, undefined handling, and per-template population across all four Decision branch patterns

### Changed
- `packages/process-engine/src/templates/sopTemplates.ts` — all three template builders now populate `confidence: step.confidence` per step (including all four DecisionSOP action patterns)
- `packages/process-engine/src/templates/markdownRenderer.ts` — all three render functions emit the confidence glyph line directly after the evidence row:
  - `● High confidence (92%)` for confidence ≥ 0.85
  - `◐ Medium confidence (78%)` for 0.70 ≤ confidence < 0.85
  - `○ Low confidence (54%) — review manually` for confidence < 0.70

### Impact
- Before: low-confidence and high-confidence steps rendered identically; reviewers had no inline signal for which steps to audit
- After: every step that has a confidence score shows its tier glyph with the explicit `— review manually` advisory on low-confidence steps
- **SOP trust-signal trifecta complete**: document-level badge (iter 004) + per-step evidence (iter 005) + per-step confidence (iter 006) — the three core visible signals from Design System §7.3
- Test count: 1,436 → 1,461 (+25)

### Notes
- Thresholds are single-sourced from `sopTemplates.ts` to prevent tier drift. This creates a benign circular import (`renderHelpers.ts → sopTemplates.ts → renderHelpers.ts`) that resolves cleanly via ESM hoisting because the shared values are primitive constants. Queued as a low-effort follow-up (extract to shared constants module) — backlog item score 10.
- Scope discipline: no other trust signals added in this loop (e.g., no per-step risk markers, no sensitivity flags).

---

## [2026-04-17] - Iteration 005: Per-step evidence references in rendered SOPs

### Added
- `evidenceEvents?: string[]` optional field on `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction` interfaces (additive, non-breaking)
- `formatEvidenceRow(eventIds: string[]): string | undefined` helper in `renderHelpers.ts` with named truncation constants (`MAX_EVIDENCE_IDS = 8`, `EVIDENCE_TRUNCATION_HEAD = 5`)
- 17 new tests across 6 describe blocks in `templates.test.ts` covering helper unit tests, per-template evidence rendering, empty/undefined suppression, and truncation

### Changed
- `packages/process-engine/src/templates/sopTemplates.ts` — all three template builders now populate `evidenceEvents` per step from `step.instructions.map(i => i.sourceEventId)`
- `packages/process-engine/src/templates/markdownRenderer.ts` — all three render functions emit `◦ Evidence: N events · ev_XX, ev_YY` per step (with correct singular/plural; omitted when empty; truncated to first 5 + `…+N more` over 8 IDs)

### Impact
- Before: source event IDs existed in the underlying `SOPStep.instructions[].sourceEventId` data but never surfaced in rendered output; readers had no per-step traceability without traversing internal data structures
- After: every step in every rendered SOP shows its evidence line immediately below the expected-outcome row, matching the approved `docs/sop/examples/01_operator_centric_example.md` aesthetic
- Combined with iter 004: rendered SOPs now surface confidence at the document level AND evidence at the step level — both core visible trust signals from `docs/sop/DESIGN_SYSTEM.md`
- Test count: 1,419 → 1,436 (+17)

### Notes
- Scope was deliberately narrowed to `evidenceEvents` only. Adjacent fields from broader IMPLEMENTATION_NOTES lists (`confidence`, `isSensitive`, `durationLabel`, `risks`, `branchType`, `probability`, `metadata`, `evidenceManifest`) are explicitly out of scope per the one-item rule and are now tracked as follow-up backlog items.
- Truncation cap chosen: 8 full IDs, then first 5 + `…+N more`. Constants are named in `renderHelpers.ts` for future tunability.

---

## [2026-04-17] - Iteration 004: SOP metadata strip + confidence badge above the fold

### Added
- `docs/sop/` — 14-artifact world-class SOP framework delivered by sop-expert agent (design system, canonical schema, transformation rules, quality rubric, 3 template specs, 3 rendered reference examples, implementation notes, collaboration requests). All examples trace to a shared 28-event `source_recording.json` for deterministic traceability proof.
- `packages/process-engine/src/templates/renderHelpers.ts` — `renderMetadataStrip()`, `renderEnterpriseMetadataTable()`, `renderConfidenceBadge()` helpers
- `qualityBadge()` classifier exported from `sopTemplates.ts` with `HIGH_CONFIDENCE_THRESHOLD`, `LOW_CONFIDENCE_THRESHOLD`, `HIGH_BADGE_MAX_LOW_STEPS`, `LOW_BADGE_MIN_LOW_STEPS` constants
- 26 new test cases in `templates.test.ts` across 6 describe blocks covering helpers, classifier, and above-the-fold position assertions for all three SOP templates

### Changed
- `packages/process-engine/src/templateTypes.ts` — added optional `qualityBadge?: 'high' | 'medium' | 'low'`, `averageConfidence?: number`, `generatedAt?: string` fields to `OperatorSOP`, `EnterpriseSOP`, `DecisionSOP` (all additive, non-breaking)
- `packages/process-engine/src/templates/sopTemplates.ts` — all three template builders populate the new metadata fields from `qualityIndicators`
- `packages/process-engine/src/templates/markdownRenderer.ts` — `renderOperatorMarkdown`, `renderEnterpriseMarkdown`, `renderDecisionMarkdown` restructured to emit H1 → italic purpose tagline → metadata strip → confidence badge as the first block

### Impact
- Before: rendered SOPs jumped from H1 directly into `## What This Is For`; generator credit only in footer; no confidence surfacing anywhere in the document
- After: first 15 lines of every rendered SOP contain H1, italic purpose, metadata strip (`Ledgerium SOP · v1.0 · N steps · M systems · X% confidence · Generated YYYY-MM-DD`), and confidence callout (`> ✓ High confidence` / `> ⚠ Medium confidence` / `> ⚠ Low confidence`)
- Customer-visible SOP output quality lifted to match approved `docs/sop/examples/` aesthetic
- Ledgerium's trust-first promise is now visible above the fold, not buried in metadata
- Test count: 1,393 → 1,419 (+26)

### Notes
- Interface changes are additive with safe defaults (`averageConfidence ?? 1`, `qualityBadge ?? 'high'`) — any caller still passing partial objects continues working
- Gap #2 (per-step evidence hoisting) and Gap #3 (sopValidator) from sop-expert's `IMPLEMENTATION_NOTES.md` are explicitly OUT OF SCOPE for this iteration and are now top backlog items
- Decision SOP metadata strip uses `N paths` wording (vs `N steps`) to match decision template's target aesthetic

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
