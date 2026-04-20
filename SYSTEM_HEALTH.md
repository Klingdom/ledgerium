# Ledgerium AI — System Health

Last updated: 2026-04-20 (post-**iteration 017 — Minimum billing test suite (QA-01, `burn-down`)**; 21 new vitest tests closing the "zero webhook integration coverage" top-risk gap identified post-Mode-3; both just-approved PRDs (Pro tier + Team trial) now extend a tested handler foundation; 1 follow-up opened (#41 admin-bypass E2E); pool net-flat at 23; **MR-004 due at iter 018** (base cadence, 3 bounded loops post-MR-003 complete); staleness cap breach intensifies — #14 + #15 both at-or-past cap require MR-004 triage per Follow-Up Debt Policy clause 2)

## Executive Summary

Ledgerium AI is in **Phase 1** with a strong deterministic product foundation, comprehensive analytics infrastructure, and clear architectural principles. The current system is strongest in **vision clarity, invariants, analytics coverage, and core trust-first philosophy**. **All three Phase-1 release blockers are now closed** — Playwright E2E (iter 009), session event persistence (iter 010), and LiveStepBuilder ↔ StreamingSegmenter convergence (iter 011). The system is architecturally ready for Phase 2 with no carried blockers.

**Meta-Review 002** (2026-04-19) confirmed MR-001's control changes (formula rewrite, delegation rubric, Mode 5 formalization) are working first-order, but flagged a priority finding: the **density trigger** in `Follow-Up Debt Policy` clause 3 was silently violated 3 consecutive iterations (009, 010, 011 each generated ≥3 follow-ups with zero `density-response` log). MR-002 mechanized the policy into a machine-enforceable log line (Change A), added `Birth iter` as a mandatory schema field (Change B), and introduced a pool-size ceiling rule (Change C) that forces iter 012 to burn-down because the open follow-up pool is 11 items (> 8).

Overall confidence: **High, strengthening further post-iter-017** (3 of 3 release blockers closed; MR-003 governance diffs active in production; cool-off clause 7 invoked once at iter 016 and consumed; scope-expansion protocol continues working as deterrent across 4+ iterations now). **Post-iter-017:** billing revenue-integrity class now very green — the Mode 3 hardening silenced the anti-patterns; iter 017 locks them with a 21-test regression safety net (7 webhook integration + 14 feature-gating unit + 1 additional 401 contract test). Both just-approved PRDs (`PRD_PRO_TIER.md`, `PRD_TEAM_TRIAL.md`) will extend a *tested* handler rather than an untested one. **Phase-2 preparedness strengthened:** Pro tier adds new price IDs on top of tested `planFromPriceId`/`getWebhookSecret`; Team trial extends tested webhook event routing. **Agent diversity stable:** backend-engineer at iter 017 broke the frontend-engineer-back-to-back pattern (014+016) cleanly; same-implementer-4+ trigger remains 3 away. **Remaining billing cold-pool items:** 3 P1 structural bugs (customer-creation TOCTOU #BUG-05, atomic quota race #BUG-06) plus the now-live #BUG-07 (PRD-promoted at iter 017 coordinator-approval pass) — promoted to row #40 as the hard blocker for Team Trial build.

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
| Test coverage | strong | 4.7 | **1,618 Vitest tests across 47 files** (+1 in iter 014: `buildBundle` regression assertion that `meta.persistenceTruncated` flows into `bundle.sessionJson`; iter 013 added 12 full-pipeline fixtures). Full regression surface now covers: segmentation determinism (iter 011: 24 live + 24 batch byte-identity), LiveStep cross-path equality (iter 012: 12 I1a), end-to-end normalizer+segmentation byte-identity (iter 013: 12 full-pipeline), and persistence-flag carry-through (iter 014: 1 bundle regression). **4 Playwright E2E tests** (3 iter 009 lifecycle + 1 iter 010 restart-recovery smoke). **Gap: no sidepanel component-level test harness** — flagged as follow-up #31 for iter 016+ consideration. I1b deferred as follow-up #26. |
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

1. **BUG-07 blocks Team Trial build entry** — `subscriptionStatus @default("trialing")` in `schema.prisma:16` + signup-route explicit assignment will misfire trial-keyed UI + analytics surfaces. NOT a current revenue leak (entitlements verified to flow through `plan` field), IS a hard blocker for the approved `PRD_TEAM_TRIAL.md`. Live as #40, PRD-promoted; score 11; Effort 1 / Risk 1 — small fix, high-leverage.
2. **Staleness-cap breach intensifies** — #15 (Birth 006, age 11 — 1 iter past cap) + #14 (Birth 007, age 10 — at cap) MUST be triaged at MR-004 per Follow-Up Debt Policy clause 2. #7 (Birth 008, age 9 — reaches cap at iter 018). Three items entering or past cap means MR-004's staleness scan is now material, not ceremonial.
3. **Remaining P1 billing structural bugs in cold pool** — `PRICING_AUDIT_001.md` still holds #BUG-05 (customer-creation TOCTOU race) and #BUG-06 (atomic quota race). Stripe at-least-once retries can still cause double-grant state drift until these close. Promoted one-at-a-time as P0s burn down.
4. Static-harness E2E does not exercise real `chrome.runtime` transport / background service worker — real-extension `launchPersistentContext` tests still pending (iter 010 follow-up #21, originally iter 013)
5. PostHog not yet connected (env vars not set) — analytics only writes to internal DB
6. Extension content layer still has minimal unit test coverage outside target-inspector (capture.ts, state-observer.ts, label-extractor.ts untested)
7. Follow-up pool at **23 items** (post-iter-017; net flat — #33 closed, #41 opened) — still well above pool-size ceiling (8); every bounded iter remains forced burn-down unless cool-off re-arms after 3 consecutive burn-downs.
8. Invariant I1 (LiveStep-to-DerivedStep correspondence, design doc §5.3) is structurally guaranteed post-convergence but not explicitly tested — flagged as iter-011 follow-up #22
9. `SEGMENTATION_RULE_VERSION` doc/code drift (`docs/invariants.md` L172 vs `rules.ts` L16) — iter-011 follow-up #23

---

## Current Top Opportunities

1. **Iter 018 (Mode 4): Meta-Review 004 (base cadence)** — 3 bounded loops post-MR-003 (iter 016 + iter 017 + iter 018-boundary). MR-004 agenda now material: (a) audit-intake + PRD-trigger promotion pattern evaluation, (b) ceiling-cool-off clause-7 efficacy review (iter 016's `directed` invocation vs intended `top-score` use), (c) MR-003 Change D portfolio-drift trigger still dormant (counter reset at iter 016, held at iter 017 billing work), (d) **staleness-cap triage: #14 (age 10, at cap) + #15 (age 11, past cap) require explicit keep/downgrade/delete decision**, (e) closure-ratio KPI trajectory.
2. **Iter 019 (Mode 1, post-MR-004): forced burn-down unless cool-off re-arms.** Cool-off is available again only after 3 consecutive burn-downs; iter 017 = burn-down #1; iter 018 is Mode 4 (neutral); iter 019 would be burn-down #2 if still pool > 8. Primary candidate: **#40 BUG-07** (score 11, PRD-promoted, small + high-leverage — unblocks Team Trial build) or **#15** (score 10, age 11 — IF not already triaged by MR-004 at iter 018).
3. **Iter 020+**: if iter 019 is burn-down #2 and iter 020 is burn-down #3, clause 7 cool-off re-arms for iter 021. Otherwise continued burn-down focused on #40, then #34/35/36 (audit-intake P0s — copy + conversion), then #14 (if MR-004 preserves), then iter-010 follow-ups #19/20/21.
4. **Team Trial feature build** — unblocked for Design phase entry once #40 (BUG-07) closes. Feature scope is approved + locked (5 CEO-delegated decisions). PRD cites 7 backend/frontend/email/QA dependencies as ordered build sequence.
5. **Pro tier feature build** — unblocked for Design phase entry. No prerequisite beyond BUG-01 (already closed at Mode 3). Feature scope approved + locked (5 CEO-delegated decisions).
6. Real-extension `launchPersistentContext` E2E (#21) — closes fidelity gap between Vitest integration and OS-level SW restart.
7. Structured session-aware error logging — last item from original Phase-1 priority list.
8. Monitor MR-003 control-change efficacy: ceiling-cool-off invocation count **1** (iter 016 direct, consumed) · top-score autonomous ratio unchanged at 1/10 · closure ratio improves at iter 017 (added 1 closure + 1 generation; net +1 closure-first iteration) · portfolio-drift counter **held at 0** at iter 017 (web-app surface touched via test files — test-only touch is debatable; MR-004 should rule on whether `apps/web-app/e2e/` + test files count toward Signal-5 surface coverage).

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

**Iter 018 (Mode 4): Meta-Review 004** — base cadence has arrived (3 bounded loops post-MR-003 = iter 016 + iter 017 + iter 018-boundary). No product-code changes during Mode 4.

MR-004 must cover at minimum:
- **Audit-intake pattern evaluation** (new 2026-04-20): did P0-only live promotion + cold-pool retention protect the pool-size ceiling signal? Did the pattern prevent backlog flood from a 19-finding audit? Should this generalize to future audit-style artifacts or stay audit-specific?
- **PRD-trigger promotion pattern evaluation** (new 2026-04-20): BUG-07 was promoted from cold pool to live backlog on `PRD_TEAM_TRIAL.md` approval. Did this produce correct signal? Should this be codified as a rule (e.g., "any PRD approval MAY promote cold-pool items if and only if the PRD explicitly cites them as hard blockers")?
- **Ceiling-cool-off clause 7 efficacy** (first invocation at iter 016): the cool-off served a `directed` pick, not the intended `top-score` refined-formula exercise. Narrow to `top-score`-only? Or keep dual-use?
- **Staleness-cap triage (MANDATORY per clause 2):** #14 (age 10, at cap) + #15 (age 11, past cap) require explicit keep/downgrade/delete decision. #7 (age 9) is on deck for iter 019.
- **Closure-ratio KPI trajectory:** iter 017 added 1 closure (#33) + 1 generation (#41); partial recovery. Track whether trajectory meets ≥0.25 by iter 018.
- **Portfolio-drift rule** (MR-003 Change D): does `apps/web-app/e2e/` + test file touches at iter 017 count toward Signal-5 surface coverage, or is only production-code surface counted? MR-004 should rule.

**Iter 019 (Mode 1, post-MR-004): forced burn-down unless cool-off re-arms.** Pool remains 23 > 8. Cool-off returns only after 3 consecutive burn-downs (iter 017 was #1, iter 018 Mode 4 does not count, iter 019 would be #2). Primary candidate: **#40 BUG-07** (score 11, PRD-promoted, Effort 1 / Risk 1 — small + unblocks Team Trial build). Alternate: **#15** IF MR-004 preserves it rather than downgrades/deletes. Alternate: **#14** IF MR-004 preserves it.

### Mandatory sequencing

1. **Iter 018 (Mode 4): Meta-Review 004** — governance-only. Must produce `META_REVIEW_004.md` artifact + apply any adopted diffs. Cadence counter resets after.
2. **Iter 019 (Mode 1)**: forced burn-down, cool-off not yet re-armed. Primary recommendation: **#40 BUG-07** (high-leverage, unblocks Team Trial). Alternate: whichever of #14/#15 survives MR-004 triage.
3. **Iter 020+**: burn-down continuation. If iter 019 + 020 + 021 all burn-down and pool still > 8, clause 7 cool-off re-arms for iter 022 — first chance since iter 016 to exercise the refined-scoring formula via `top-score`.

### Candidates for iter 019 (ordered by score, burn-down mode — pool 23 > 8)

- **#31** Bootstrap sidepanel component test harness — score 11 (iter 014 follow-up, quality assurance; density risk flagged)
- **#19** GC stale `ledgerium_active_session_events_*` keys — score 11 (iter 010 follow-up, session durability)
- **#7** Widen policy-engine `credit_card` regex — score 11 (iter 008 follow-up, **age 9 at iter 017, cap at iter 018**)
- **#14** Wire `validateRenderedSOP` — score 11 (**age 10 at iter 017, at cap — MR-004 triage required**)
- **#40** BUG-07 Remove silent `subscriptionStatus @default("trialing")` — score 11 (PRD-promoted, billing/schema hygiene, Effort 1 / Risk 1, unblocks Team Trial build) ← **coordinator recommendation for iter 019 pending MR-004 outcome**
- **#36** G-02 Upgrade link at 80% quota — score 11 (audit-intake, UX/conversion)
- **#15** Extract confidence thresholds — score 10 (**age 11 at iter 017 — past cap — MR-004 triage required**)

### Meta-review trigger check (post iter 017)
- Loops since Meta-Review 003: **2** (iter 016 + iter 017 bounded loops; iter 015 Mode 4, Mode 3 @ iter 016→17, and artifact-only PRD-approval commit all do NOT count). Base cadence fires at iter 018 (1 more bounded loop boundary).
- Post-meta-review stability window: expires at iter 018. MR-004 is the next governance-change opportunity.
- Early-trigger conditions:
  - 3-consecutive-same-Area: billing/QA 1-in-5, no risk (last 5 bounded = UX resilience 014 · web-app UI 016 · billing/QA 017 = 3 distinct). **Healthy diversity.**
  - Same-implementer 4+: backend-engineer at iter 017 breaks the frontend-engineer-at-014+016 streak; frontend-engineer at 2, backend-engineer at 1 new. **3 away from trigger.**
  - Follow-up accumulation > 10: pool 23; already above; **MR-004 base-cadence will satisfy.**
  - Validation-failure run: 0 (iter 017 clean).
  - Portfolio-drift trigger (MR-003 Change D): counter **incremented to 1** at iter 017 IF test-only touches don't count toward Signal-5 surface coverage (held at 0 if they do). MR-004 should rule.
- Staleness-cap scan: **#15 at age 11 (past cap)**, **#14 at age 10 (at cap)**, **#7 at age 9 (cap at iter 018)**. Three items requiring MR-004 triage — more than any prior meta-review.
- Closure-ratio recovery: **1 closure (#33) + 1 generation (#41)** at iter 017 = closure/generation = 1.0 for this iteration. Rolling 10-iter closure ratio: TBD at MR-004. Target ≥0.25 by iter 018 now more achievable.
- Autonomous-vs-directed sub-partition: `top-score` **still 1/10** (iter 017 was `burn-down`). Cool-off re-arm opportunity at iter 022 earliest.

## Meta-Review Status

- Completed loops since initialization: **16 (iter 001–016; iter 015 = MR-003 Mode 4, does not count toward cadence; Mode 3 @ iter 016→17 does not count toward cadence)**
- Last meta-review: **Meta-Review 003 (2026-04-20, covering iter 012–014)** — see `META_REVIEW_003.md`
- Prior meta-reviews: Meta-Review 003 (2026-04-20, iter 012–014) `META_REVIEW_003.md`; Meta-Review 002 (2026-04-19, iter 009–011) `META_REVIEW_002.md`; Meta-Review 001 (2026-04-17, iter 004–008) `META_REVIEW_001.md`
- Bounded loops completed since last meta-review: **2** (iter 016 + iter 017)
- MR-003 applied 4 governance diffs: CLAUDE.md § Current Phase + § Known Issues hygiene (A); CLAUDE.md § Follow-Up Debt Policy clause 7 ceiling-cool-off (B); SYSTEM_HEALTH.md autonomous-ratio sub-partition (C); CLAUDE.md § Meta-Review Cadence portfolio-drift trigger (D).
- **Iter 016 was first invocation of MR-003 Change B (ceiling-cool-off)** — consumed; cool-off not available again until a new 3-consecutive-burn-down streak builds (iter 017 = #1 of new streak).
- **Next meta-review trigger: BASE-CADENCE at iter 018** — 1 more bounded loop boundary. MR-004 agenda (from iter 017 + prior): (1) audit-intake pattern evaluation [new], (2) PRD-trigger promotion evaluation [new], (3) cool-off clause-7 efficacy (`directed` vs `top-score` use), (4) portfolio-drift Change D trigger — test-only surface counting rule, (5) **mandatory staleness-cap triage on #14 (age 10) + #15 (age 11) + #7 (age 9 by iter 018)**, (6) closure-ratio KPI trajectory.
- Status: **MR-003 active; stability window expires at iter 018; MR-004 executes at iter 018**

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
