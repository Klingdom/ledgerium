# Ledgerium AI — Improvement Backlog

Last updated: 2026-04-20 (post-**iteration 019 — companion burn-down #15 (Mode 1 + Mode 5 item 2/5)**); circular import eliminated by extracting `HIGH_CONFIDENCE_THRESHOLD` + `LOW_CONFIDENCE_THRESHOLD` to new `confidenceThresholds.ts` shared module; `renderHelpers.ts` + `sopTemplates.ts` both import from shared; backward-compat re-exports preserved; 1652/1652 tests passing (+6 regression tests); #15 closes MR-004 staleness-cap KEEP verdict; pool 23 → **22 open**; closure ratio 0.167 → ~0.200 (10-iter window); zero behavior change; MR-004 Change A Mode 5 companion-burn-down obligation **satisfied**)  
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

- Total candidates reviewed: 47 (38 prior + 4 P0 audit-intake from `PRICING_AUDIT_001.md` + 3 Mode-3 follow-ups from billing hardening + 1 PRD-promoted BUG-07 from audit cold pool + 1 iter-017 follow-up; iter 018 added zero new rows; iter 019 closed **#15** with 0 new follow-ups)
- Top priority area: **iter 020 = Mode 5 item 3/5 — Metrics engine build** per `PRD_DASHBOARD_V2.md` §7. Primary agent: backend-engineer. Deliverables: `apps/web-app/src/lib/workflow-metrics.ts` with `computeHealthScoreV2()`, `computeOpportunityTag()`, `computeInsightChips()`; unit tests covering all 5 PRD §11 fixture archetypes; API route update. NO UI changes. Entry gate: iter 019 validation green (✅ confirmed).
- Open follow-up pool (Birth iter shown): #7 (008, age 10) · **#14 (007, age 11 — past staleness cap, KEEP per MR-004 Agenda 3, target post-Path-B iter 023+)** · ~~#15 (006, age 13 — closed iter 019)~~ · #19/20/21 (010) · #23/24 (011) · #26 (012) · #27/28 (M3@012) · #29/30 (013) · #31/32 (014) · #34/35/36 (audit-intake P0) · #37/38/39 (M3@016 follow-ups) · **#40 (PRD-promoted BUG-07)** · **#41 (iter 017 follow-up)** — **22 items open** (23 at iter 018 close − 1 closed at iter 019 − 0 new generated at iter 019 = 22)
- **MR-004 staleness-cap verdicts (2026-04-20, per MR_004.md Agenda 3):** #14 KEEP (wire `validateRenderedSOP` into `processSession.ts`; Effort 2, Risk 2, Phase-2-dependent; target post-Path-B burn-down window iter 023+) · ~~#15 KEEP (confidence-thresholds extraction; Effort 1, Risk 1; pre-targeted for iter 019 companion burn-down)~~ **CLOSED iter 019 (commit `eca703c`)** · #7 KEEP + flag-for-MR-005 (policy-engine `credit_card` regex; reaches cap at iter 018 → MR-005 will rescan at iter 023). First MR-004 KEEP verdict to close; #14 and #7 remain open, MR-005 will re-triage.
- **Path B companion-burn-down compliance (MR-004 Change A, new guardrail 8):** Mode 5 sequence of ≥3 items with pool > 8 requires one burn-down iteration within or preceding the sequence. Path B = 5 items (018 PRD → 019 burn-down → 020 metrics → 021 UI → 022 polish). **Iter 019 = burn-down #15 SATISFIED (2026-04-20, commit `eca703c`).** Obligation discharged; remaining Path B iterations (020, 021, 022) can proceed without further companion-burn-down gating.
- **Mode 5 saturation acknowledgement (MR-004 Change C, escalated guardrail 6):** `mode-5-saturation: user-ack; rationale: CEO explicit approval 2026-04-20 for 4 consecutive web-app iterations iter 019–022 under full knowledge of extension/segmentation/normalization/policy surface drought.` Recorded per new guardrail 6 wording.
- **Audit intake pattern (unchanged):** only P0 items in live backlog. P1/P2/P3 cold-pool items (≈26 remaining after BUG-07 promotion) held in `PRICING_AUDIT_001.md`. MR-004 Agenda 1 verdict: **keep, with codification** — audit-intake pattern will be formalized in CLAUDE.md at post-Path-B governance iteration (iter 023+; one of the 3 deferred MR-004 diffs).
- **PRD-trigger promotion pattern (unchanged):** BUG-07 remains the sole instance. MR-004 Agenda 2 verdict: **formalize as rule** — will be codified in CLAUDE.md at post-Path-B governance iteration alongside audit-intake codification (same deferred diff batch).
- Highest-risk unresolved items: **#40 BUG-07 (PRD-promoted, score 11, hard blocker for approved Team Trial feature — post-Path-B target)**, **#14 (post-Path-B target, past-cap staleness)**, iter-010 follow-ups #19–21.
- Last completed work: **iter 019 — confidence-thresholds extraction (`#15` burn-down + Mode 5 companion).** Commit `eca703c`. 4 files changed (+74/−5); 2 new files (shared module + 6 regression tests); 2 modified files (import-path change + export→re-export for backward compat). 1652/1652 tests pass (+6 vs iter 018). Prior: iter 018 MR-004 + Path B PRD (Mode 4 + Mode 5 1/5, governance-only).
- Last meta-review: **Meta-Review 004 (2026-04-20, covering iter 014–017 + Mode-3)** — see `docs/meta/MR_004.md`. Prior: MR-003 `META_REVIEW_003.md`, MR-002 `META_REVIEW_002.md`, MR-001 `META_REVIEW_001.md`. **Next meta-review (MR-005) due at iter 023 boundary** (iter 019 + 020 + 021 = 3 bounded loops post-MR-004; iter 022 is the 4th and MR-005 fires at boundary per Mode 5 guardrail 5 counter increment).
- Next recommended action: **iter 020 — Mode 5 item 3/5: Metrics engine build** per `PRD_DASHBOARD_V2.md` §7. Primary agent: backend-engineer. Deliverables per PRD §7 (all TypeScript interfaces) and §11 (5 fixture archetypes for unit tests). NO UI changes. Alternates deferred (Path B is `directed` — no valid alternative).
- Release-blocker burn rate (last 5 bounded loops iter 014–019, excluding Mode-4 + Mode-3): **0/0** — all blockers closed. No change.
- Follow-up closure ratio (10-iter window): **~0.200** at iter 019 close (+1 closure from #15; +0 new follow-ups this iter). MR-003 revised KPI target from ≥0.4 to ≥0.25 by iter 018 — missed; MR-004 Agenda 10 Signal A proposes further revision to ≥0.25 by iter 025 (deferred to MR-005 per one-control-variable-at-a-time discipline). Iter 020/021/022 build iterations expected 0–1 closures each (Path B is net new code, not debt burn-down); next sustained closure cadence post-iter-023.
- **Autonomous-vs-directed sub-partition (rolling iter 009–019; Mode-3 + Mode-4 excluded):** `top-score` 1/10 (iter 009) · `burn-down` 7/10 (iter 006–008 aged out, now iter 012–014, 017, **019**) · `blocker-cadence` 1/10 (iter 009 overlap) · `directed` 3/10 (iter 010, 011, 016). Iter 018 `directed` aged-in outside 10-window start boundary (Mode 4 overlay excluded). MR-004 narrowed cool-off clause 7 to exclude `directed` — prevents the iter-016 misuse pattern from repeating. Next cool-off opportunity: earliest iter 025 (requires 3 consecutive post-Path-B burn-downs).
- MR-004 governance diffs applied (recap): **Change A** Mode 5 guardrail 8 companion-burn-down rule (new); **Change B** Follow-Up Debt Policy clause 7 narrowed to exclude `directed`; **Change C** Mode 5 guardrail 6 escalated to explicit user-acknowledgement. **Deferred (post-Path-B):** Change D audit-intake pattern codification; Change E reverse portfolio-drift early-trigger; Change F test-only surface-coverage counting rule.

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
| 14 | Wire `validateRenderedSOP` into `processSession.ts` (dev-throws/prod-logs) | fix | SOP quality gate | 3 | 5 | 3 | 4 | 2 | 2 | **11** | 007 | new (iter 007 follow-up) — saturation cleared post-iter-010 |
| ~~15~~ | ~~Extract confidence thresholds to shared constants module (remove `renderHelpers.ts ↔ sopTemplates.ts` circular)~~ | ~~improvement~~ | ~~code hygiene~~ | ~~2~~ | ~~3~~ | ~~2~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**10**~~ | ~~006~~ | **done (iter 019 — commit `eca703c`; new `confidenceThresholds.ts` module; backward-compat re-exports from sopTemplates; +6 regression tests locking values + contract; zero behavior change)** |
| 16 | Fix DELETE /api/keys error handling | fix | API safety | 2 | 3 | 1 | 5 | 1 | 1 | **9** | — | new (iter 001) |
| 17 | Extract shared ingestion service (upload/sync) | improvement | API architecture | 4 | 5 | 4 | 3 | 4 | 3 | **9** | — | new (iter 001) |
| ~~18~~ | ~~Surface `meta.persistenceTruncated` flag in review UI / bundle builder~~ | ~~improvement~~ | ~~UX resilience~~ | ~~3~~ | ~~4~~ | ~~2~~ | ~~4~~ | ~~1~~ | ~~1~~ | ~~**11**~~ | ~~010~~ | **done (iter 014 — amber warning banner in ReviewScreen + HistoryDetailScreen; `buildBundle` regression test)** |
| 19 | Garbage-collect stale `ledgerium_active_session_events_*` keys on SW startup | fix | session durability | 2 | 4 | 2 | 5 | 1 | 1 | **11** | 010 | new (iter 010 follow-up) |
| 20 | `loadFromStorage` sessionId/in-flight flag cross-validation | fix | session durability | 3 | 4 | 2 | 4 | 1 | 2 | **10** | 010 | new (iter 010 follow-up) |
| 21 | Real-extension `launchPersistentContext` E2E harness | improvement | quality assurance | 4 | 5 | 4 | 3 | 4 | 3 | **9** | 010 | new (iter 010 follow-up; originally iter 013) |
| ~~22~~ | ~~I1 cross-path assertion (LiveStep-level, 12 golden fixtures)~~ | ~~improvement~~ | ~~invariants / testing~~ | ~~3~~ | ~~4~~ | ~~3~~ | ~~5~~ | ~~1~~ | ~~1~~ | ~~**13**~~ | ~~011~~ | **done (iter 012 — I1a; I1b deferred to #26)** |
| 23 | `SEGMENTATION_RULE_VERSION` doc drift (`docs/invariants.md` L172 says `'1.0.0'`; code says `'1.1.0'`) | fix | docs / invariants | 2 | 3 | 1 | 5 | 1 | 1 | **9** | 011 | new (iter 011 follow-up) |
| 24 | `LiveStep` type tightening (`grouping?`, `boundaryReason?` → typed enum unions) | improvement | type safety | 2 | 3 | 2 | 5 | 1 | 1 | **10** | 011 | new (iter 011 follow-up) |
| ~~25~~ | ~~Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation)~~ | ~~improvement~~ | ~~invariants / testing~~ | ~~4~~ | ~~5~~ | ~~4~~ | ~~3~~ | ~~3~~ | ~~2~~ | ~~**11**~~ | ~~011~~ | **done (iter 013 — 3 fixtures covering click-with-label, fill-and-submit, route-change; zero production code changes)** |
| 26 | I1b: DerivedStep-level byte-identity (add `LiveStepBuilder.getDerivedSteps()` accessor + strict test) | improvement | invariants / testing | 3 | 4 | 2 | 4 | 2 | 1 | **10** | 012 | new (iter 012 follow-up — deferral from I1a per §5.3 revision) |
| 27 | Fix E2E seed/assertion mismatch in `apps/web-app/e2e/api/account.spec.ts` (test asserts `plan='free'` but seeded user has `plan='growth'`) | fix | quality assurance | 2 | 3 | 1 | 5 | 1 | 1 | **9** | M3@012 | new (Mode 3 follow-up — billing fix `09b2d80`) |
| 28 | Downgrade UX edge case: non-free user without `stripeCustomerId` should surface contact-support path instead of attempting Stripe portal redirect | fix | UX resilience | 2 | 3 | 2 | 4 | 2 | 2 | **7** | M3@012 | new (Mode 3 follow-up — billing fix `09b2d80`) |
| 29 | Fix `pnpm --filter <pkg> test` not resolving test files (root vitest config glob vs per-package resolution) — add per-package `vitest.config.ts` stubs or workspace-aware config | improvement | DX / tooling | 2 | 3 | 2 | 4 | 1 | 1 | **9** | 013 | new (iter 013 follow-up — found during fixture regeneration) |
| 30 | Add rapid-focus-blur normalizer dedup fixture to full-pipeline golden set (focus → immediate blur → no input) — currently `fill-and-submit` only exercises the `focus → input_changed` dedup path | improvement | invariants / testing | 2 | 4 | 2 | 4 | 1 | 1 | **10** | 013 | new (iter 013 follow-up — complementary to #25 fixture set) |
| 31 | Bootstrap sidepanel component test harness (jsdom + `@testing-library/react` + vitest env config) to enable component-level test coverage for `ReviewScreen` / `HistoryDetailScreen` / future screens | improvement | quality assurance | 3 | 4 | 4 | 4 | 2 | 2 | **11** | 014 | new (iter 014 follow-up — banner render currently untested at component level) |
| 32 | Extract `TruncationWarningBanner` into shared sidepanel components directory (currently duplicated across `ReviewScreen.tsx` and `HistoryDetailScreen.tsx`, ~10 lines each) | improvement | code hygiene | 1 | 2 | 1 | 5 | 1 | 1 | **7** | 014 | new (iter 014 follow-up — low-priority DRY cleanup) |
| ~~33~~ | ~~**QA-01** Minimum billing test suite: unit for plans/stripe/feature-gating boundary; integration (Stripe mock) for webhook events (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed, missing WEBHOOK_SECRET); checkout route error-shape contract tests~~ | ~~improvement~~ | ~~billing / quality assurance~~ | ~~5~~ | ~~5~~ | ~~2~~ | ~~5~~ | ~~3~~ | ~~2~~ | ~~**12**~~ | ~~audit-intake~~ | **done (iter 017 — 21 new vitest tests: 7 webhook integration + 14 feature-gating unit; +1 Playwright 401 contract; narrowed from "plans/stripe/feature-gating + integration + contract" to "webhook integration + feature-gating + 1 contract append" — plans.ts unit tests deferred as non-gap)** |
| 34 | **F-COH-01** Fix healthScores copy contradiction (Starter feature vs FAQ definition of intelligence-layer as Team+) — relabel Starter feature as "process health indicators" in `config.ts:72` AND update FAQ answer in `pricing/page.tsx:26` | fix | copy / trust | 2 | 3 | 1 | 5 | 1 | 1 | **9** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** same-page direct contradiction; trust-erosion risk |
| 35 | **F-COH-02** Reframe Starter value story from "clean exports" (feature) to outcome — update `pricing/page.tsx:145` plan guidance strip to "Document professionally" or "Build your process library" | fix | copy / conversion | 3 | 4 | 2 | 4 | 1 | 2 | **10** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** $49 Starter currently positioned as ransom tier (remove watermark) not value tier |
| 36 | **G-02** Add upgrade link to `UsageQuotaMeter` at 80% threshold with plan-specific CTA ("3 of 5 recordings used — upgrade to Team for unlimited") — currently fires amber at 80% with no upgrade path until 100% | improvement | UX / conversion | 3 | 3 | 2 | 5 | 1 | 1 | **11** | audit-intake | **new (P0 audit-intake — `PRICING_AUDIT_001.md`)** highest-intent moment currently wasted |
| 37 | Fix `PRO_PRICE_ID` silent-empty-string pattern (`apps/web-app/src/lib/stripe.ts:36`) — uses same `?? ''` pattern that BUG-04 fixed for WEBHOOK_SECRET; if `STRIPE_PRO_PRICE_ID` is unset, the legacy mapping silently adds empty-string key | fix | billing / hygiene | 1 | 3 | 1 | 5 | 1 | 1 | **6** | M3@016→17 | new (Mode 3 follow-up — billing fix; deprecated path, low blast radius) |
| 38 | `APP_URL` hardcoded fallback (`apps/web-app/src/app/api/billing/checkout/route.ts:~120`) — `process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'` could produce wrong redirect URLs in staging/preview environments | fix | config / security | 2 | 3 | 1 | 5 | 1 | 2 | **7** | M3@016→17 | new (Mode 3 follow-up — billing fix) |
| 39 | `UpgradeButton` `setTimeout` cleanup via `useEffect` — if user navigates away mid-redirect (1500ms delay for `already_subscribed` case), timer callback still fires on unmounted component; convert to `useEffect` with cleanup | improvement | code hygiene / correctness | 1 | 2 | 1 | 5 | 1 | 1 | **6** | M3@016→17 | new (Mode 3 follow-up — billing fix) |
| 40 | **BUG-07** Remove silent `subscriptionStatus @default("trialing")` in `apps/web-app/prisma/schema.prisma:16` (change to `@default("none")`); update explicit assignment in `apps/web-app/src/app/api/auth/signup/route.ts:43` to `'none'`; generate + apply Prisma migration | fix | billing / schema hygiene | 3 | 4 | 1 | 5 | 1 | 1 | **11** | PRD-promoted | **PROMOTED from audit cold pool on 2026-04-20** — hard blocker for approved `PRD_TEAM_TRIAL.md` (Dependency §11a). NOT a current revenue leak (verified: entitlements flow through `plan` field which correctly defaults to `'free'`). IS a UX-misfire + analytics-noise blocker for Team Trial feature because trial surfaces/events key on `subscriptionStatus === 'trialing'`. |
| 41 | `admin_bypass` E2E contract test in `upgrade-button-error-state.spec.ts` — requires an allowlisted test identity seeded in Playwright auth state; current auth state has only `user.json` (standard user). Extend seed + add 3rd test case asserting `code: 'admin_bypass'` response shape | improvement | billing / quality assurance | 2 | 3 | 1 | 4 | 2 | 1 | **7** | 017 | new (iter 017 follow-up — deliberately deferred per <15-min scope guard in QA-01 brief; completes checkout error-shape contract coverage) |

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

> **All Phase-1 release blockers closed as of iter 011.** The release-blocker bonus `+B3` no longer applies to any item in the table.
> All areas clear; no `−S` penalties apply.
> Items 7, 14, 19, 20, 21, 23, 24, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, **40, 41** are open follow-ups (pool size = **22** — iter 019 closed #15, generated 0 new follow-ups; 23 − 1 = 22). MR-002 Change C: pool > 8 still triggers the ceiling rule; MR-004 Change A (new Mode 5 guardrail 8): companion-burn-down rule **SATISFIED at iter 019**. Remaining Path B iterations (020, 021, 022) are net-new code builds, not expected to close additional follow-ups. `Birth iter` anchors: `M3@012` (billing-fix Mode 3 of iter 012), `audit-intake` (P0 promotions from `PRICING_AUDIT_001.md`), `M3@016→17` (Mode 3 residual from pricing-audit intake), `PRD-promoted` (items pulled from cold pool by PRD approval), `017` (iter 017 follow-up).
> **Saturation status (rolling iter 015–019):** governance (Mode 4) 015 · web-app UI 016 · billing/QA 017 · governance (Mode 4 + Mode 5 define) 018 · code hygiene (process-engine package) 019 — 4 distinct production-code Areas across counted iterations (extension 014 aged out). Remaining Path B iter 020/021/022 = 3 consecutive web-app touches. Iter 019's `code hygiene` Area touched `packages/process-engine/` (extension-adjacent shared package) providing partial portfolio-drift relief before the web-app saturation cluster. User-acknowledgement of saturation captured at iter 018 start per new guardrail 6.
> **Meta-Review 002 complete (2026-04-19).** Governance diffs A/B/C/D/E/F applied. **Meta-Review 003 complete (2026-04-20)**; diffs A/B/C/D applied. **Meta-Review 004 complete (2026-04-20, iter 018)**; diffs A/B/C applied immediately to CLAUDE.md (companion-burn-down, cool-off narrowing, guardrail-6 escalation); diffs D/E/F deferred to post-Path-B governance iteration. **MR-005 due at iter 023 boundary** (3 bounded loops post-MR-004 = iter 019 + 020 + 021 + Mode 5 items).
> **Cold pool (P1/P2/P3 audit items)**: see `PRICING_AUDIT_001.md` sections P1/P2/P3 — ~26 items deliberately held out of live backlog to preserve pool-size ceiling behavior (was ~27; BUG-07 promoted to live row #40 on 2026-04-20 via `PRD_TEAM_TRIAL.md` approval). Items promote to live backlog one at a time as P0s burn down OR when a newly-approved PRD establishes a cold-pool item as a hard blocker. Governance rationale documented in audit § Governance Notes; MR-004 Agenda 1+2 verdicts: keep pattern, formalize in CLAUDE.md at post-Path-B governance iteration (iter 023+, one of the 3 deferred MR-004 diffs).

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
