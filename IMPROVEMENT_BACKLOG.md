# Ledgerium AI — Improvement Backlog

Last updated: 2026-04-20 (post-iteration 015 / Meta-Review 003 — 4 governance diffs applied; ceiling-cool-off clause 7 now available at iter 016; pool unchanged at 15 (Mode 4 adds no follow-ups); iter 016 authorized to cool-off → top-score pick #4 or fallback burn-down pick #19)  
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

### Saturation status (computed over iter 010–014 — rolling 5 bounded loops; iter 015 is Mode 4 and does not consume Area cadence)

- Session-durability area = 1 of last 5 (iter 010)
- Extension-architecture / segmentation area = 1 of last 5 (iter 011)
- Invariants / testing area = 2 of last 5 (iter 012, iter 013) — **2-in-a-row watch**; picking invariants again at iter 016 would trip 3-in-a-row (#26, #30 flagged)
- UX resilience area = 1 of last 5 (iter 014)
- Quality assurance area = 0 of last 5
- SOP area = 0 of last 5
- No 3-in-a-row; no `−S` penalties currently apply. Coordinator-aware 2-in-a-row signal on invariants/testing.

### Portfolio override rules

See `CLAUDE.md § Selection Policy` — any of these overrides top-score:
1. Release-blocker minimum cadence (1-in-5)
2. Area saturation rule
3. Follow-up burn-down (1-in-5)

---

## Portfolio Summary

- Total candidates reviewed: 38 (27 prior + 4 iter-011 follow-ups + 1 iter-012 follow-up + 2 Mode-3 follow-ups + 2 iter-013 follow-ups + 2 iter-014 follow-ups)
- Top priority area: **iter 016 = ceiling-cool-off → top-score (MR-003 Change B clause 7, single-use)** OR fallback burn-down. Cool-off top pick: **#4** Artifact + system-health refresh process (score 13, Area agentic CI). Burn-down top pick: **#19** GC stale session keys (score 11, Area session durability).
- Open follow-up pool (Birth iter shown): #7 (008) · #14 (007) · #15 (006) · #19/20/21 (010) · #23/24 (011) · #26 (012) · #27/28 (M3@012) · #29/30 (013) · #31/32 (014) — **15 items open** (unchanged; Mode 4 adds no follow-ups)
- **Staleness watch (MR-003 Appendix A)**: #15 (Birth 006, age 9) crosses the 10-loop cap at iter 016. If iter 016 ≠ #15 (e.g. cool-off picks #4), MR-004 must execute mandatory keep/downgrade/delete triage per CLAUDE.md § Follow-Up Debt Policy clause 2. Recommend iter 017 = #15 preemptively.
- Highest-risk unresolved item: no release blockers remain; highest-risk open items are iter-010 follow-ups #19–21 and iter-011 follow-ups #23/24.
- Last completed item: **Meta-Review 003 (iteration 015, Mode 4)** — governance-only, 4 diffs applied to CLAUDE.md + SYSTEM_HEALTH.md; no product code changes. Prior: persistenceTruncated UI banner (iter 014).
- Last meta-review: **Meta-Review 003 (2026-04-20)** — see `META_REVIEW_003.md`; prior: MR-002 (2026-04-19) `META_REVIEW_002.md`; MR-001 (2026-04-17) `META_REVIEW_001.md`. **Next meta-review (MR-004) due at iter 018** (base cadence: 3 loops post MR-003). Stability window active through iter 017.
- Next recommended action: **iter 016 — ceiling-cool-off invoked, pick #4 Artifact + system-health refresh process (score 13)**. Rationale: (a) mechanizes MR-003 Change A's manual staleness-prevention work; (b) first `top-score` autonomous selection since iter 009 — exercises the refined scoring formula; (c) non-extension-app surface partially addresses MR-003 Signal 5 portfolio drift. Fallback (if cool-off declined): **#19** (GC stale session keys, score 11, burn-down, Effort 1 / Risk 1).
- Release-blocker burn rate (last 5 loops iter 011–015, excluding Mode-4 iter 015): **0/0** — all blockers closed; future blockers will surface in Phase 2 planning.
- Follow-up closure ratio (10-iter window iter 005–014, unchanged since iter 015 is Mode 4): **0.188**. MR-003 revised KPI target from ≥0.4 to ≥0.25 by iter 018 (see META_REVIEW_003.md §Effectiveness KPIs). Pool-size ceiling active for iter 016 unless cool-off invoked.
- MR-003 governance diffs applied: **Change A** CLAUDE.md § Current Phase + § Known Issues hygiene refresh; **Change B** CLAUDE.md § Follow-Up Debt Policy clause 7 ceiling-cool-off; **Change C** SYSTEM_HEALTH.md autonomous-ratio sub-partition; **Change D** CLAUDE.md § Meta-Review Cadence portfolio-drift early-trigger.

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
| 15 | Extract confidence thresholds to shared constants module (remove `renderHelpers.ts ↔ sopTemplates.ts` circular) | improvement | code hygiene | 2 | 3 | 2 | 5 | 1 | 1 | **10** | 006 | new (iter 006 follow-up) — saturation cleared post-iter-010 |
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

> **All Phase-1 release blockers closed as of iter 011.** The release-blocker bonus `+B3` no longer applies to any item in the table.
> All areas clear; no `−S` penalties apply.
> Items 7, 14, 15, 19, 20, 21, 23, 24, 26, 27, 28, 29, 30, 31, 32 are open follow-ups (pool size = 15 — #18 closed in iter 014, #31 + #32 opened). MR-002 Change C: pool > 8 triggers the ceiling rule → **iter 016 MUST be burn-down** (iter 015 is Mode 4 meta-review, not a coding loop). `Birth iter` for Mode-3 follow-ups uses the anchor `M3@012` — the last completed iteration at the time of creation — for deterministic staleness-cap enforcement.
> **Saturation cleared:** iter 014 landed in `UX resilience`, breaking the 012+013 invariants/testing streak. 3-in-a-row rule inactive for iter 016.
> **Meta-Review 002 complete (2026-04-19).** Governance diffs A/B/C/D/E/F applied. **Meta-Review 003 DUE at iter 015** (base cadence: 3 loops since MR-002 = iter 012, 013, 014 completed).

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
