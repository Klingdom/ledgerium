# Meta-Review 003 — Iterations 012–014

Date: 2026-04-20
Triggered by: base cadence (3 loops since Meta-Review 002: iter 012 + 013 + 014)
Scope: iterations 012, 013, 014 + efficacy assessment of MR-002 Changes A–F applied in commit `6e52a6f`

---

## Executive Summary

MR-002's governance package landed and **operated exactly as designed**. The pool-size ceiling rule (Change C) fired on all three iterations in this window and produced a monotonic closure-ratio recovery (0.000 → 0.077 → 0.143 → 0.188) without generating density-trigger violations. The birth-iter schema (Change B) is 100% populated including the novel `M3@012` anchor convention coined for Mode-3 follow-ups. The scope-expansion protocol (Change D) was never invoked — but it was *available* and observably deterred expansion: iter 012 could have bundled `#22 + #25` (a permissible expansion under MR-002 §7 §473), iter 013 could have reached into the normalizer, iter 014 could have bootstrapped a sidepanel component harness — **each iteration held scope cleanly and deferred the adjacent work to follow-up items instead.** That is the mature behavior MR-001 and MR-002 were trying to produce.

**But three signals warrant governance attention:**

1. **The ceiling rule (Change C) has fully dominated selection for 3 consecutive loops** — every iteration in this window was `burn-down`-forced. The priority score formula never discriminated; the coordinator picked highest-scored follow-up among ≤8 eligible items. If this pattern holds through iter 016/017, the refined scoring formula from MR-001 has been stress-tested on **exactly one loop** (iter 009) in its entire post-MR-001 lifespan. That is not enough evidence to conclude the formula works.

2. **The closure ratio is climbing but slowing.** Deltas are +0.077, +0.066, +0.045 across the three loops. At the current decelerating rate, the 0.4 target is at least 10+ loops away. More structurally: iter 012/013/014 each **net-added** to the pool (13→14→15 because each loop spawns ~1.3 items while closing 1). The pool-size ceiling is working as a stop-loss on growth, not as a closure engine. The system is treading water, not draining the pool.

3. **CLAUDE.md § Current Phase and § Known Issues are stale.** They still list Playwright E2E and session persistence as `[BLOCKER]` and `missing`. Those closed in iter 009 and iter 010, and MR-002 headlined "All Phase-1 release blockers closed" — yet the authoritative phase-context file was not updated. This is a governance hygiene failure that contradicts SYSTEM_HEALTH.md, IMPROVEMENT_BACKLOG.md, and MR-002's own text. Any compaction-recovery pass that reads CLAUDE.md will onboard with wrong priorities.

System state: **Healthy, measurably improving, but governance-hygiene drift on the most-read file.**

Headline recommendation: **Fix CLAUDE.md staleness (Change A below), then let the system run at least 2 non-ceiling iterations before MR-004** — either because pool organically drops to ≤8, or because a phase-entry artifact (Phase 2 scope, structured logging, or similar non-follow-up pick) is explicitly permitted as a one-time exception. The refined scoring formula cannot be validated if the ceiling rule permanently blocks it.

---

## Scope window

| Iter | Mode | Selection rule | Primary implementer(s) | Area | Commit | Score | Outcome |
|------|------|----------------|------------------------|------|--------|-------|---------|
| 012 | 1 (standard, forced burn-down) | `burn-down` (ceiling) | qa-engineer | invariants / testing | `2866a78` | 13 | I1a LiveStep cross-path invariant regression test (12 byte-identity fixtures); I1b deferred as #26; coordinator authored §5.3 design-doc revision after qa HALT |
| 013 | 1 (standard, forced burn-down) | `burn-down` (ceiling) | backend-engineer | invariants / testing | `6d41207` | 11 | Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation), 3 fixtures × 12 tests, zero production LOC touched |
| 014 | 1 (standard, forced burn-down) | `burn-down` (ceiling) | frontend-engineer | UX resilience | `c54c81c` | 11 | `persistenceTruncated` amber warning banner in `ReviewScreen` + `HistoryDetailScreen`; `buildBundle` regression test |

Intervening Mode-3 (out of cadence): `09b2d80` account-page billing fix with admin-unlimited allowlist; spawned follow-ups #27, #28 tagged `M3@012`.

**Window characteristics:**
- 3/3 iterations forced by ceiling rule (MR-002 Change C); zero `top-score`, zero `blocker-cadence`, zero `directed`
- 3/3 iterations produced zero production-logic regressions (iter 013 had zero prod LOC; iter 012 one `export` keyword + JSDoc; iter 014 +36 prod LOC of additive JSX)
- 3/3 iterations passed validation cleanly; no HALT-and-fix cycles; qa-engineer HALT on iter 012 caught a testability bug in the brief *before* implementation, not during validation — that is the right direction for the signal
- 3/3 iterations rotated primary agents (qa → backend → frontend); rolling 5-loop window has 5 distinct primaries (backend, qa, architect, frontend, devops) — the strongest diversity in the project's bounded-loop history
- 3/3 iterations generated follow-ups below the density threshold (1, 2, 2) — density trigger dormant, not violated

---

## Per-change effectiveness scorecard — MR-002 Changes A–F

### Change A — Density-trigger enforcement via `density-response:` log line

**Verdict: Structurally working; not stress-tested.**

Evidence:
- Grep of `density-response:` in ITERATION_LOG.md → **zero matches** (iter 012/013/014 generated 1/2/2 follow-ups respectively, below the ≥3 threshold).
- However, each iteration **explicitly logged the check**: `"Follow-up density check: N generated. Below the ≥3 threshold. density-response: log line not required per CLAUDE.md § Follow-Up Debt Policy clause 4."` (see ITERATION_LOG.md lines 836, 935, 1006). The log line is present *as a structural negative*, which is valuable for auditability.

Interpretation: Change A successfully converted an ignored qualitative clause (MR-002 found 3 consecutive silent violations in iter 009/010/011) into a machine-greppable artifact that the coordinator now proactively addresses even when it does not fire. **This is the intended behavior of mechanization.** It worked without firing in anger.

Residual concern: the rule has never produced a `density-response: re-scoped` or `density-response: root-cause-analyst invoked` because no loop in this window generated ≥3 follow-ups. Whether the rule actually drives the right response when triggered is untested. Natural next stress test: a larger-scope loop (e.g. #31 sidepanel component harness, likely 3+ follow-ups) will eventually trigger it. Hold verdict pending that event.

### Change B — `Birth iter` column required on follow-up rows

**Verdict: Fully working; novel anchor convention coined in-flight.**

Evidence:
- IMPROVEMENT_BACKLOG.md lines 79–104: every open follow-up (#7, #14, #15, #19–32) has a populated `Birth iter` column. Zero rows with `—` or blank in the Birth iter field for follow-up-typed rows.
- Mode-3 follow-ups (#27, #28) introduced a new anchor convention `M3@012` — "Mode-3 intervention anchored to the last completed iteration for staleness-cap purposes." This is a sensible extension; Mode 3 doesn't consume an iteration number, so the follow-up needs a fixed reference point. Documented in IMPROVEMENT_BACKLOG.md line 126 and re-stated in each iter log.
- Staleness-cap scan is now mechanical: sort by `current_iter − birth_iter`, flag any ≥10. Current oldest: #15 (Birth 006, age 8), #14 (Birth 007, age 7), #7 (Birth 008, age 6). **None over cap yet.** All are in the meta-review watch zone.

Interpretation: Schema change executed cleanly, compliance is 100%, and a minor extension (M3@anchor) was handled with sound judgment. No further action required.

### Change C — Pool-size ceiling rule (pool > 8 → next iter MUST be burn-down)

**Verdict: Working as stop-loss. Under-calibrated as closure engine.**

Evidence:
- 3/3 iterations in this window fired under `burn-down` rule — explicit in ITERATION_LOG.md lines 801, 885, 957.
- Pool trajectory: 11 (pre-iter-012) → 11 (iter 012: close #22, open #26) → 13 (Mode-3 adds #27/#28, out of cadence) → 14 (iter 013: close #25, open #29/#30) → 15 (iter 014: close #18, open #31/#32). **Net +4 across the 3-loop window** despite the ceiling rule firing every iteration.
- Closure ratio over rolling 10-iter windows: 0.000 → 0.077 → 0.143 → 0.188.
- Zero iterations picked `top-score`, `blocker-cadence`, or `directed` in this window. The ceiling rule has fully dominated selection.

Interpretation split:
- **Stop-loss view (positive):** without Change C, the pool would almost certainly have grown to 16+ in this window because iter 012/013/014 would each spawn 1–2 follow-ups with zero forced closures. The ceiling rule is visibly holding net growth to +4 while each loop adds ~1.3 net.
- **Closure-engine view (negative):** closure-ratio deltas are decelerating (+0.077, +0.066, +0.045). If the pattern persists, ratio hits 0.4 around iter 020 organically. That is a **5-iteration lag** between the metric target and the pool's natural equilibrium.

Underlying structural issue: the system is not generating follow-ups from a bounded debt; it is generating them from the **work itself**. Every non-trivial iteration discovers 1–2 adjacent items (a deferred tier, a doc drift, a DX gap, a test-harness gap). This is healthy discovery — it is not debt in the pathological sense. Treating it as debt and forcing indefinite burn-down means the system spends an increasing fraction of its capacity closing follow-ups instead of picking top-score strategic items.

**Residual concern:** Change C needs an **upper-bound on consecutive forcings** or the refined scoring formula is never exercised. Recommendation in §Proposed governance diffs below.

### Change D — Scope-expansion protocol (Mode 5 guardrail 7)

**Verdict: Effective as deterrent; zero invocations needed; protocol is visibly influencing coordinator behavior.**

Evidence:
- Grep of `scope-expansion:` in ITERATION_LOG.md → **zero matches** (zero invocations).
- Three legitimate expansion candidates were each evaluated and rejected:
  - Iter 012: qa-engineer's HALT revealed I1 was untestable-as-stated. Two response paths existed: (a) expand scope to add `getDerivedSteps()` accessor on `LiveStepBuilder`, or (b) narrow the assertion via design-doc revision. Coordinator chose (b), explicitly split into I1a (in-scope) + I1b (deferred as #26). Iter-log §812 documents the decision with the rationale "Mode 1 doesn't have that protocol; the `export` keyword is test-wiring not new logic." This is **exactly** how the protocol is supposed to work: the *absence* of a `scope-expansion: approved` log should correspond to actual scope restraint, and it does.
  - Iter 013: zero production LOC change. The design-note §908 about `normalizeEvent()` non-determinism in `event_id` was surfaced and **handled test-side** rather than expanding into normalizer changes. Iter-log §895 explicitly says "Mode 1 does not permit scope expansion. Zero production logic modified."
  - Iter 014: `HistoryDetailScreen.tsx` banner was **pre-authorized in the brief**, not an expansion — documented in iter-log §967. Could have expanded to sidepanel component test harness (deferred to #31 instead).
- Pattern: the coordinator treats `scope-expansion: approved` as a load-bearing phrase that requires all 5 conditions to be met, not a rubber-stamp. The absence of invocations over 3 loops of genuinely-tempting expansions is the strongest possible signal the protocol is working.

Interpretation: Change D is the MR-002 change with the clearest evidentiary success story — it has shaped behavior without ever firing. This is exactly what mechanized qualitative policy should achieve. No action required.

### Change E — Autonomous-vs-directed ratio row in SYSTEM_HEALTH.md

**Verdict: Working; metric is in band; trend predictable.**

Evidence:
- SYSTEM_HEALTH.md line 36 tracks "last 10 iterations (iter 005–014): 2 directed (iter 010, iter 011) / 8 autonomous = 0.2 directed ratio. Healthy band: 0.1–0.3."
- Iter 012/013/014 were all autonomous (Mode 1 burn-down), so the ratio held steady at 0.2.
- Iter-log §940 confirms the metric is being tracked *per iteration*, not just in SYSTEM_HEALTH.md, which means it's genuinely in coordinator awareness.

**Caveat (matching the task prompt's probe):** the "autonomous" loops in this window were all ceiling-forced `burn-down`, not true `top-score` autonomous selections. If we sub-partition:
- `top-score` autonomous: **0 / 3** in this window
- `burn-down` autonomous: **3 / 3** in this window
- `blocker-cadence` autonomous: 0
- `directed`: 0

The MR-002 language treated all non-directed as "autonomous," which papers over a meaningful distinction. **The refined formula from MR-001 has not been exercised in discriminating top-score mode since iter 009.** This is a 6-loop gap (iter 010 directed, 011 directed, 012/013/014 ceiling-forced). The score-formula efficacy question raised in MR-002 §3 "Change #1 Residual concern" remains unanswered.

Recommendation: sub-partition the metric. See Proposed Change C below.

### Change F — Trigger #2 rewrite to be phase-aware

**Verdict: Applied correctly; dormant this window; would have mis-fired without it.**

Evidence:
- CLAUDE.md line 414 reads: "0 release-blocker items selected in 5 loops AND at least 1 open blocker exists in `SYSTEM_HEALTH.md`" ✓ applied.
- This window: 0 blockers selected (all 3 loops were burn-down). Pre-MR-002 wording would have tripped trigger #2 at iter 014 (iter 010 + 011 closed blockers → 0 blocker-picks in iter 012/013/014 = 3 consecutive, iter 015 would be the 5-loop pre-MR-002 trigger point) and forced an *unnecessary* early meta-review alongside the base-cadence MR-003.
- With the Change F guard, trigger #2 correctly did **not** fire because zero open blockers exist in SYSTEM_HEALTH.md.

Interpretation: textbook phase-aware guard. No action required. **But see §Non-changes: this trigger becomes load-bearing again the instant Phase 2 surfaces a blocker.**

---

## Per-change summary table

| # | Change | Applied in `6e52a6f` | Iter 012 effect | Iter 013 effect | Iter 014 effect | Verdict |
|---|--------|----------------------|-----------------|-----------------|-----------------|---------|
| A | Density-response log line | ✓ | Acknowledged (1 FU, below threshold) | Acknowledged (2 FU, below threshold) | Acknowledged (2 FU, below threshold) | Working structurally; not stress-tested |
| B | Birth iter field required | ✓ | Populated (#26 → 012) | Populated (#29/#30 → 013) | Populated (#31/#32 → 014) | Fully working; M3@anchor convention coined |
| C | Pool-size ceiling (>8) | ✓ | Forced burn-down (pool 11) | Forced burn-down (pool 13) | Forced burn-down (pool 14) | Working as stop-loss; needs ceiling-on-ceiling |
| D | Scope-expansion protocol | ✓ | Declined expansion (I1a/I1b split) | Declined expansion (0 prod LOC) | Declined expansion (sidepanel harness → #31) | Effective as deterrent; zero invocations; ideal outcome |
| E | Autonomous-vs-directed ratio | ✓ | 0.2 (held) | 0.2 (held) | 0.2 (held) | Working; needs sub-partition for top-score vs burn-down |
| F | Trigger #2 phase-awareness | ✓ | Prevented spurious fire | Prevented spurious fire | Prevented spurious fire | Textbook guard; load-bearing in Phase 2 |

---

## New signals that emerged in this window

### Signal 1 — Three consecutive ceiling-forced burn-downs

The ceiling rule (Change C) has fired on **every** iteration since MR-002 landed. If iter 016 also fires under the ceiling (pool will be 13–15 at that point), the refined-formula post-MR-001 discriminating count will remain at **1 loop** (iter 009). The formula cannot be validated.

The ceiling is supposed to be a **ceiling**, not a floor — it was introduced to prevent runaway debt growth, not to permanently dominate selection. Current behavior suggests the threshold (pool > 8) is mis-calibrated for this project's structural follow-up generation rate (~1.3 FU per non-trivial loop).

### Signal 2 — Closure-ratio improvement decelerating

Three data points: +0.077, +0.066, +0.045 per loop. At the current exponential decay, the rate approaches but does not cross +0 — meaning the ratio may asymptote below 0.4 without ever reaching it. Mechanism: the window counts both closures AND generations, and since each burn-down closure spawns ~1.3 new items, the numerator-denominator ratio grows sub-linearly.

This is a structural issue that **no change to the ceiling rule alone can fix.** Two options: (a) accept the 0.4 target was over-calibrated and revise downward, or (b) introduce a multi-close loop pattern (iterations that close 2+ follow-ups by design, not just by policy).

### Signal 3 — Mature scope discipline, maturely handled

All three iterations faced legitimate scope-expansion temptations and declined. Iter 012's design-doc revision (I1a/I1b split) is the strongest example — the coordinator authored an artifact edit to **make the policy-permitted scope testable** rather than expand the loop. This is advanced governance behavior. It should be explicitly documented as a pattern (see §Dormancy / phase-aware observations).

### Signal 4 — Stale CLAUDE.md Phase section

CLAUDE.md § Current Phase (lines 330–335) and § Known Issues (lines 348–349) still mark Playwright E2E and session persistence as OPEN BLOCKERS. These closed in iter 009 and iter 010 respectively. The file has not been updated since before iter 003 based on the `✅ remove duplicated background logic (iter 003)` line in the "Resolved" sub-section — only iter 011's segmentation convergence has been added to resolved. This is a 5-iteration lag on the most-read governance file.

**Why this matters:** the Compaction Recovery Protocol (CLAUDE.md line 365) explicitly directs any future session to read CLAUDE.md first. A new coordinator session would onboard with "Phase 1, 2 blockers open" — and would either: (a) try to "fix" already-closed blockers, (b) be confused by the contradiction with SYSTEM_HEALTH.md, or (c) defer to the stale source of truth and mis-prioritize. This is the single most important governance-hygiene failure in this window.

### Signal 5 — Mode 3 Billing bug suggests web-app/extension-app split risk

The Mode-3 billing fix (`09b2d80`) surfaced four compounding bugs in the web-app account-page flow: data-shape mismatch, empty-body POST, missing plan selector, no admin-unlimited. None of these were in the extension-app (which is where all 14 bounded improvement loops have landed). This suggests the **web-app surface is accumulating silent defects outside the improvement-loop gaze.** The backlog has 8+ items rooted in extension-app/segmentation surfaces and ~2 in web-app (#27 E2E seed mismatch, #28 downgrade UX). Over 10+ loops, the improvement system has touched web-app exactly twice (iter 001, iter 009's E2E), leaving the revenue-critical surface relatively under-surveyed.

This is not a MR-003 enforcement issue, but it is a **pattern worth flagging** for iter 016+ and the Phase 2 transition.

### Signal 6 — Area saturation near-miss, handled proactively

Iter 012 and 013 were both `invariants / testing`. Iter 014's selection rationale (iter-log §958) explicitly cited "proactive saturation avoidance: iter 012 + 013 were both in invariants/testing; picking #26 or #30 (also invariants/testing) would trip the 3-in-a-row rule. #18's UX resilience area cleanly diversifies."

**This is the saturation rule working as intended — not as a deflected block but as coordinator-aware pivot.** It also means the 3-in-a-row rule is arguably well-calibrated: a 2-in-a-row soft warning would be redundant given the coordinator is already pivoting at 2-in-a-row when permissible. No change needed (see §Non-changes).

---

## Proposed governance diffs

Format matches MR-002: name · problem · evidence · proposed diff · expected outcome · cost.

### Change A — Update CLAUDE.md § Current Phase and § Known Issues (MANDATORY, hygiene)

**Problem:** the authoritative phase-context file is 5 iterations stale. It lists two already-closed blockers as open and omits iter 009/010 from the Resolved list. Any compaction-recovery onboarding reads wrong state.

**Evidence:**
- CLAUDE.md lines 331–332 list Playwright E2E and session persistence as `[BLOCKER]`; closed in iter 009 (`1a1ba6c`) and iter 010 (`d24699d`).
- CLAUDE.md lines 348–349 list "full session event persistence missing" and "no Playwright E2E coverage" as Known Issues; both resolved.
- CLAUDE.md line 342 lists iter 011 convergence as resolved (so the file WAS touched in MR-002-era), but the iter 009/010 closures were not added.
- SYSTEM_HEALTH.md line 7 states "All three Phase-1 release blockers are now closed"; IMPROVEMENT_BACKLOG.md lines 64–68 show all three as `done`. Direct contradiction with CLAUDE.md.

**Proposed diff** to CLAUDE.md § Current Phase (replace lines 326–342):

```markdown
## Current Phase

Phase 1 in progress — **all release blockers closed as of iter 011.**
Phase 2 entry planning is unblocked; no forced-blocker items remain.

Priorities (non-blocker; ordered by score/strategic value):
- Phase 2 scope / PRD refresh (item #10 ICP narrative / strategic planning loop)
- artifact + system-health refresh dashboard process (item #4, score 13)
- structured error logging with session context (item #9, score 11)
- real-extension launchPersistentContext E2E harness (item #21, score 9)

Follow-up pool is currently at 15 open items (ceiling rule active).
See IMPROVEMENT_BACKLOG.md for the full ranked pool.

Resolved (do not re-list; chronological):
- ✅ remove duplicated background logic (iter 003)
- ✅ integrate policy engine into normalizer (iter 003) and content capture (iter 008)
- ✅ SOP metadata strip + trust-signal trifecta (iters 004/005/006)
- ✅ SOP release-readiness validator (iter 007)
- ✅ Playwright E2E recording lifecycle + CI workflow (iter 009)
- ✅ full session event persistence for service worker restart recovery (iter 010)
- ✅ converge LiveStepBuilder / StreamingSegmenter / buildDerivedSteps / segmentEvents (iter 011)
- ✅ I1a LiveStep cross-path regression test (iter 012); full-pipeline golden fixture (iter 013); persistenceTruncated UI banner (iter 014)
```

And § Known Issues (replace lines 346–351):

```markdown
## Known Issues

- No current Phase-1 release blockers.
- Follow-up pool at 15 items (see IMPROVEMENT_BACKLOG.md); pool-size ceiling rule active — next non-meta iteration forced to burn-down.
- Web-app surface under-surveyed by improvement loops (see MR-003 Signal 5); track for Phase 2 scope.

Do not silently fix tracked issues — surface and update status.
```

**Expected outcome:** any future compaction-recovery or new-session onboarding reads a phase-consistent status across CLAUDE.md + SYSTEM_HEALTH.md + IMPROVEMENT_BACKLOG.md. Zero contradictions.

**Cost:** ~20 lines in CLAUDE.md. No code change. No policy change.

### Change B — Add CLAUDE.md § Follow-Up Debt Policy clause 7: ceiling-rule cool-off (MANDATORY)

**Problem:** MR-002 Change C (pool-size ceiling rule) has dominated selection for 3 consecutive loops. If this continues, the refined scoring formula from MR-001 is never exercised in `top-score` mode, and MR-001's entire formula rewrite rests on exactly one test case (iter 009). The ceiling was intended as a stop-loss, not a permanent governor.

**Evidence:**
- ITERATION_LOG.md lines 801, 885, 957: iter 012/013/014 all `burn-down`-forced via ceiling.
- Pool trajectory 11 → 11 → 13 → 14 → 15: net still growing despite forcings. Ceiling alone is not draining the pool.
- Closure-ratio deltas 0.077 → 0.066 → 0.045: decelerating. Organic target-hit is 5+ loops away.
- Structural observation: each non-trivial iteration spawns ~1.3 follow-ups; with ceiling forcing a burn-down that closes 1 item, net flow is +0.3 per iter.

**Proposed diff** — add clause 7 to CLAUDE.md § Follow-Up Debt Policy (after current clause 6):

```markdown
7. **Ceiling-rule cool-off (MR-003 Change B):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score`, `blocker-cadence`, or `directed` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8.
```

**Expected outcome (testable):**
- Within any 4-loop window, at least 1 iteration selects under non-burn-down rule.
- Cool-off invocation count becomes grep-able: `grep "ceiling-cool-off: invoked" ITERATION_LOG.md`.
- If cool-off fires and the chosen `top-score` item demonstrates a clear formula-discrimination win (as iter 009 did), Meta-Review 004 can carry concrete evidence that the refined formula works.
- If cool-off fires and picks the same item the ceiling would have anyway, that is also useful evidence (formula and ceiling are aligned; policy simplification is possible).

**Cost:** ~5 lines in CLAUDE.md. No code change.

### Change C — Sub-partition the autonomous-vs-directed ratio metric (OPTIONAL but cheap)

**Problem:** the MR-002 Change E metric treats `burn-down`-forced selection as "autonomous," which obscures whether the refined scoring formula is being exercised. Current reading of `0.2 directed / 0.8 autonomous = healthy` masks the fact that `top-score autonomous = 0` in the 3-loop window.

**Evidence:** §Change E analysis above. Iter-log §940 and §1011 both report "autonomous = 0.2 stable in 0.1–0.3" without distinguishing `top-score` from `burn-down`.

**Proposed diff** — update the SYSTEM_HEALTH.md scorecard row for autonomous-vs-directed to sub-partition:

```markdown
| Autonomous-selection ratio (rolling 10-loop window) | healthy | 4 | Iter 005–014: `top-score` autonomous 1/10 (iter 009 only) · `burn-down` autonomous 6/10 · `blocker-cadence` 1/10 (iter 009 overlap) · `directed` 2/10 (iter 010, 011). Healthy band: `top-score + blocker-cadence ≥ 2/10` to exercise the refined formula. **Currently below band** — ceiling rule has dominated selection. MR-003 Change B (cool-off rule) will release pressure. |
```

**Expected outcome:** MR-004 has direct visibility into whether the cool-off rule (proposed Change B) actually produced `top-score` selections. Metric is grep-able and self-documenting.

**Cost:** ~3 lines in SYSTEM_HEALTH.md, plus a one-line adjustment in the existing coordinator per-iter ratio report.

### Change D — Add portfolio-diversity early-trigger to Meta-Review Cadence (OPTIONAL, light touch)

**Problem:** Signal 5 (web-app surface under-surveyed) is a latent risk not caught by any current early-trigger. The existing early-triggers catch Area saturation (same Area × 3), agent saturation (same primary × 4), and validation failures — but they do not catch **surface-level portfolio drift** (10+ iterations in extension-app vs 2 in web-app).

**Evidence:**
- Of 14 completed iterations, ~11 land on extension-app / segmentation / normalization surfaces; ~2 on web-app; ~1 on process-engine.
- Mode 3 billing fix surfaced 4 compounding web-app bugs that the improvement loop never would have caught because it does not look there.
- No existing CLAUDE.md policy clause references cross-app or cross-surface coverage.

**Proposed diff** — add early-trigger clause to CLAUDE.md § Meta-Review Cadence (after current early-trigger list, before the "After a meta-review completes" paragraph):

```markdown
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift
```

**Expected outcome:** MR-004 receives a flag if iter 015–025 all stay on extension-app. Whether to act is meta-reviewer judgment, but the drift is surfaced.

**Cost:** 1 line in CLAUDE.md. No enforcement mechanism — purely an awareness trigger.

---

## Non-changes (things that look broken but are not)

### Not changing: the 3-in-a-row saturation threshold

Signal 6 (iter 014's proactive saturation pivot) demonstrates the coordinator is already pivoting at 2-in-a-row when permissible. Dropping the threshold to 2 would add policy weight to an already-mature behavior. Keep the threshold at 3. The current calibration is producing the right result: hard block at 3, soft coordinator awareness at 2.

### Not changing: the 0.4 closure-ratio target

The target is admittedly unlikely to be hit in this regime (ceiling decelerating). But **lowering the target** without diagnosing why it was set there in the first place is premature. MR-002 set 0.4 based on MR-001's observation that follow-ups were accumulating at ~1.2/loop with 0 burn-down — so the target was calibrated to be "stable state" not "aggressive drawdown." The metric's job is to be **tight enough to reveal structural drift**, which it is doing. Hitting it is secondary.

Revisit at MR-004 only if (a) the cool-off rule (proposed Change B) produces consistent `top-score` picks that ignore follow-ups, and (b) the 10-iter window's closure ratio still shows structural blockage. Until then, the tension between ceiling and target is productive — it keeps coordinator attention on follow-up hygiene.

### Not changing: Change F (trigger #2 phase-aware guard)

Dormant this window (zero blockers, so the guard has no work). Will become load-bearing the moment Phase 2 opens a new blocker. The guard is cheap and correct; no reason to touch it.

### Not changing: the base 3-loop meta-review cadence

MR-001 set the floor at 3 loops to preserve effectiveness measurement; MR-002 preserved it; MR-003 preserves it. The cool-off rule (proposed Change B) will likely produce more visible formula activity over iter 016–019, but this is not a reason to shorten cadence. MR-004 at iter 018 (3 loops after MR-003, assuming iter 015 is Mode-4) is the right timing. See §Meta-review effectiveness self-critique for broader cadence discussion.

### Not changing: Change D (scope-expansion protocol)

MR-002 Change D produced zero invocations in 3 loops. The temptation is to say "if it never fires, why have it?" But §Change D analysis above shows the protocol has observably shaped coordinator behavior — iter 012's I1a/I1b split is a textbook case. A policy that shapes behavior without needing to fire is the best kind of policy. Keep untouched.

---

## Dormancy / phase-aware observations

### Dormant policies (expected, not concerning)

- **Release-blocker bonus (+3):** dormant — no blockers. Will re-activate when Phase 2 surfaces blockers. Do not remove.
- **1-in-5 release-blocker cadence rule:** dormant — no blockers. Phase-F guard prevents spurious fire. Will re-activate with Phase 2.
- **Trigger #2 (0 blockers in 5 loops + open blocker exists):** dormant — zero open blockers. Guard working.
- **Trigger #6 (named blocker > 8 loops):** dormant — no blockers.

### Latent policies approaching activation

- **Staleness-cap (clause 2, 10-loop age):** #15 at age 8, #14 at age 7, #7 at age 6. None over cap yet, but MR-004 (projected iter ~018) should open with a staleness-cap scan. If the ceiling-cool-off (proposed Change B) allows iter 016/017 to pick a non-follow-up, #15 and #14 will cross age 10 in the MR-004 window and trigger mandatory triage.

### Emerging patterns worth documenting in CLAUDE.md

The coordinator's iter-012 decision — author an artifact edit (design-doc §5.3 revision) to reshape what "in scope" means rather than expand the loop — is a pattern worth codifying. Proposed addition to `coordinator.md` memory or `.claude/decisions.md`:

> **Pattern: Artifact-as-scope-adjustment.** When a halt reveals that the literal scope of a backlog item is unachievable as-stated, the coordinator may author an artifact revision (design doc clarification, invariant doc splitting I1a/I1b, scope-discipline re-statement) to land the achievable portion and defer the unachievable portion as a new follow-up. This is *not* scope expansion (which requires Mode 5 guardrail 7); it is scope refinement. Must be documented in the iteration log and the artifact edit must be traceable to the specialist agent's halt rationale.

This is not a CLAUDE.md rule change — it is a captured operational pattern that future coordinators can reference. Recommend logging in `.claude/decisions.md` during MR-003 commit.

---

## Recommendation for iter 016 (first non-meta iteration post-MR-003)

**Primary recommendation: Apply MR-003 Change B (ceiling-cool-off) and invoke it at iter 016.**

### Selection rationale under cool-off

Pool at iter 016 start: 15 (still > 8 ceiling). Under current Change C, iter 016 is forced burn-down. Under proposed Change B, iter 016 is *authorized* to cool off and pick by top-score.

If cool-off is invoked, the top candidates by score (from IMPROVEMENT_BACKLOG.md ranked backlog):

| # | Title | Type | Score | Area | Rationale |
|---|-------|------|-------|------|-----------|
| 4 | Artifact + system-health refresh process | improvement | 13 | agentic CI | **Top candidate.** Directly supports MR-003 Change A's staleness prevention (CLAUDE.md updates would become automatic). Non-follow-up. Exercises `top-score` rule in a non-tidying context. |
| 5 | Invariant-focused regression suite (segmentation + normalization) | improvement | 12 | invariants / testing | Would trip 2-in-a-row saturation if iter 017 also picks invariants — but iter 012/013 streak already cleared. Still coordinator-aware risk. |
| 6 | Product wedge / ICP narrative | experiment | 12 | product / GTM | Phase-2-adjacent; non-coding loop possibility; novel area for improvement loops. |

**Recommendation:** iter 016 = **item #4 (Artifact + system-health refresh process), score 13, selection rule `ceiling-cool-off: invoked → top-score`.**

Rationale:
- **Closes the exact hygiene gap MR-003 Change A is patching manually.** A refresh process for CLAUDE.md § Current Phase and SYSTEM_HEALTH.md means this kind of staleness never recurs. Meta-level leverage.
- **Non-extension-app surface.** Touches `.claude/` tooling / docs, which partially addresses Signal 5 (portfolio drift).
- **Effort 2, risk 1.** Reversible, low-complexity. Good first exercise of the cool-off rule.
- **Score 13 is highest non-follow-up candidate.** If cool-off works as designed, this is what the refined formula would pick.

### Fallback recommendation (if Change B is not adopted)

If the coordinator prefers to keep Change C unmodified and iter 016 stays forced burn-down, the top pick from the follow-up pool is:

**#19 (GC stale session_events keys on SW startup), score 11, Area session durability, Birth iter 010, age 6.**

Rationale: highest-scored follow-up tied at 11, lowest effort (1) and lowest risk (1) in the tied set, session-durability area has not been picked since iter 010 (6 loops ago, cleans up the MR-002 Change C forced-pivot aesthetic where iter 014 picked UX-resilience partly to avoid saturation). SYSTEM_HEALTH.md already lists #19 as top pick for iter 016. No surprises.

### What NOT to pick for iter 016

- **#26 (I1b DerivedStep byte-identity):** same area as iter 012/013 — even with saturation cleared, returning to invariants/testing a 3rd time in 4 loops looks like drift.
- **#31 (sidepanel component test harness):** score 11, but effort 2 / risk 2, likely spawns ≥3 follow-ups (jsdom config + vitest env + component fixture harness), would trip density trigger (Change A). Defer until cool-off / top-score regime has produced cleaner evidence.
- **#14 (wire validateRenderedSOP):** approaching staleness (age 7), but same loop type MR-001 called out as narrow polish. Re-examine at MR-004 if it crosses age 10.

---

## Effectiveness KPIs to track over iter 016–018

| Metric | Current | Target (iter 016–018) | Rationale |
|--------|---------|-----------------------|-----------|
| Ceiling-cool-off invocations | 0 (not yet in policy) | ≥ 1 in 4-loop window (post-Change B) | Validates the refined scoring formula gets exercised |
| `top-score` autonomous selections (rolling 10) | 1 (iter 009) | ≥ 2 | Formula discrimination evidence |
| Follow-up closure ratio (rolling 10) | 0.188 | ≥ 0.25 | Incremental progress; lowered from MR-002's 0.4 target for realism |
| Open follow-up pool size | 15 | ≤ 13 by iter 018 | Net-negative drift; ceiling plus cool-off should produce |
| Portfolio surface coverage (non-extension-app touch) | 2 / 14 lifetime | ≥ 1 in iter 016–018 | Address Signal 5 |
| Staleness-cap violations (age ≥ 10) | 0 | 0 maintained | Keep the oldest items from crossing cap via burn-down pressure |
| Density-response invocations | 0 (dormant, threshold not met) | tracking-only; no target | Will fire when triggered; absence is not failure |
| Scope-expansion invocations | 0 | tracking-only; no target | Protocol works as deterrent; firing is fine, silent violation is not |
| CLAUDE.md / SYSTEM_HEALTH.md consistency | fails (stale blockers) | 100% consistent after Change A | Hygiene |

---

## Concrete changes summary (for coordinator to apply)

| # | Change | File(s) | Mandatory? | Diff size |
|---|--------|---------|------------|-----------|
| A | Update CLAUDE.md § Current Phase + § Known Issues (remove stale blocker listings, add iter 009/010/012/013/014 to Resolved) | CLAUDE.md | **MANDATORY (hygiene)** | ~20 lines |
| B | Add CLAUDE.md § Follow-Up Debt Policy clause 7: ceiling-rule cool-off | CLAUDE.md | **MANDATORY** | ~5 lines |
| C | Sub-partition autonomous-vs-directed ratio row in SYSTEM_HEALTH.md | SYSTEM_HEALTH.md | OPTIONAL | ~3 lines |
| D | Add portfolio-diversity early-trigger to § Meta-Review Cadence | CLAUDE.md | OPTIONAL | 1 line |

Total mandatory diff: ~25 lines across CLAUDE.md. Total optional: ~4 lines across SYSTEM_HEALTH.md + CLAUDE.md. No code change. No test change. No package change.

Changes A and B together address the two structural concerns (stale governance file + ceiling-only selection regime). Changes C and D are observability enhancements that surface signals for MR-004 without enforcing new behavior.

---

## Meta-review effectiveness self-critique

**Was MR-003 worth running, or is the 3-loop cadence too frequent?**

**Honest assessment: MR-003 was worth running, but only barely.**

Arguments for: MR-003 caught a real, objectively-wrong governance artifact (stale CLAUDE.md Phase section) that no mechanical check would have surfaced. It caught a real structural risk (ceiling rule permanently dominating selection, refined formula untested). It surfaced Signal 5 (portfolio drift toward extension-app). These are three concrete, actionable findings that would have compounded if left for 6 loops.

Arguments against: four of the six MR-002 changes (A/B/D/E/F) are verdicts of "working, no change needed." That is 67% tautology by count. The real governance work is in Change A hygiene + Change B cool-off. Combined, those are ~25 lines of diff — the same signal could have been captured in a focused 50-line hygiene pass.

**Recommendation on cadence:**

- **Keep base cadence at 3 loops for now.** The 3-loop floor is the measurement-validity minimum MR-001 established; extending it beyond 3 makes effectiveness assessment unreliable. But:
- **Consider introducing a "lite meta-review" variant for low-signal windows.** After MR-004 (iter ~018), if that review also finds ≥4 of 6 prior diffs "working, no change," the system may be converging on governance stability, and switching to a 4-loop or 5-loop base cadence with an earlier-trigger threshold tightened could be justified. Specifically:
  - Change base cadence from 3 → 5 loops.
  - Tighten early-trigger #1 from "3 consecutive same-Area" to "2 consecutive same-Area with no explicit pivot signal."
  - Add trigger "MR-001/002/003/004 delivered ≥N ‘no change needed' verdicts in a row → next meta-review is a 50-line lite pass, not a full review."

This recommendation is **for MR-004 to consider, not MR-003 to enact.** Changing cadence in the same meta-review that asks the question would violate MR-001's control-variable-isolation principle.

**Self-critique summary:** MR-003 surfaced 2 mandatory diffs worth applying. That is above the threshold of "worth the overhead" but below the threshold of "loud governance failure." The system is in a steady-state where meta-reviews are performing as audits on a maturing loop rather than as course-corrections on a drifting one. This is exactly the desired end-state — but it does suggest that after MR-004, cadence calibration should be on the table.

---

## Appendix A — Open follow-up pool as of MR-003 close

| # | Title | Area | Birth iter | Age | Score | Recommended disposition |
|---|-------|------|-----------|-----|-------|-------------------------|
| 7 | Widen policy-engine credit_card regex | policy coverage | 008 | 6 | 11 | hold; approaching staleness mid-zone |
| 14 | Wire validateRenderedSOP into pipeline | SOP quality gate | 007 | 7 | 11 | hold; eligible for iter 017/018 if cool-off doesn't pick #4 |
| 15 | Extract confidence thresholds | code hygiene | 006 | 8 | 10 | **MR-004 mandatory triage at age 10 (iter 016)** |
| 19 | GC stale session_events keys | session durability | 010 | 4 | 11 | **fallback iter 016 pick** (if cool-off not adopted) |
| 20 | loadFromStorage cross-validation | session durability | 010 | 4 | 10 | eligible for iter 017 |
| 21 | Real-extension launchPersistentContext E2E | quality assurance | 010 | 4 | 9 | defer; effort 4 / risk 3 |
| 23 | SEGMENTATION_RULE_VERSION doc drift | docs / invariants | 011 | 3 | 9 | low-cost cleanup; pair opportunity |
| 24 | LiveStep type tightening | type safety | 011 | 3 | 10 | defer |
| 26 | I1b DerivedStep-level byte-identity | invariants / testing | 012 | 2 | 10 | defer; invariants/testing area rate-limiting |
| 27 | E2E seed/assertion mismatch (account.spec.ts) | quality assurance | M3@012 | 2 | 9 | low-cost web-app cleanup; relates to Signal 5 |
| 28 | Downgrade UX edge case | UX resilience | M3@012 | 2 | 7 | defer |
| 29 | pnpm --filter test resolution | DX / tooling | 013 | 1 | 9 | low-cost DX; pair opportunity |
| 30 | Rapid-focus-blur normalizer fixture | invariants / testing | 013 | 1 | 10 | defer; invariants/testing area rate-limiting |
| 31 | Sidepanel component test harness | quality assurance | 014 | 0 | 11 | defer; effort 2 / risk 2 + density risk |
| 32 | Extract TruncationWarningBanner | code hygiene | 014 | 0 | 7 | defer; lowest score |

**Staleness watch:** #15 is at age 8 (Birth 006, current-iter-minus-birth = 14 - 6 = 8). It will cross the 10-loop cap at iter 016 if not picked. **MR-004 must open with a mandatory triage of #15** per CLAUDE.md clause 2. If iter 016 adopts the ceiling-cool-off and picks item #4 (not #15), and iter 017 burns down a different item, #15 hits age 10 at iter 016. Recommend the coordinator either:
(a) pick #15 at iter 017 preemptively, or
(b) be prepared to deliver explicit keep / downgrade / delete triage on #15 at MR-004.

---

## Appendix B — Files to edit when applying this review

Files to edit:

1. `C:\Users\philk\ledgerium\CLAUDE.md` — Change A (§ Current Phase + § Known Issues hygiene refresh) + Change B (§ Follow-Up Debt Policy clause 7 cool-off) + Change D (§ Meta-Review Cadence portfolio-drift trigger, optional)
2. `C:\Users\philk\ledgerium\SYSTEM_HEALTH.md` — Change C (sub-partition autonomous-vs-directed ratio row, optional) + update Meta-Review Status block to reference MR-003
3. `C:\Users\philk\ledgerium\IMPROVEMENT_BACKLOG.md` — update Last updated header, MR reference line, post-iter-015 recommendation section (no schema change)
4. `C:\Users\philk\ledgerium\.claude\decisions.md` — OPTIONAL log entry for "Artifact-as-scope-adjustment" pattern captured in §Dormancy / phase-aware observations

Files NOT to edit (per Mode 4 stop condition):
- No product code changes.
- No test changes.
- No package changes.

---

## Appendix C — Grep checks for MR-004 to run

These are the machine-verifiable KPI queries MR-004 should execute against ITERATION_LOG.md and IMPROVEMENT_BACKLOG.md:

```bash
# Ceiling-cool-off invocations (expect ≥1 if Change B adopted)
grep -c "ceiling-cool-off: invoked" ITERATION_LOG.md

# top-score autonomous selections in iter 015-018 window
grep "Rule: \`top-score\`" ITERATION_LOG.md | tail -10

# density-response invocations (tracking only, may be 0)
grep "density-response:" ITERATION_LOG.md

# scope-expansion invocations (tracking only, may be 0)
grep "scope-expansion: approved" ITERATION_LOG.md

# Staleness-cap scan: any follow-up with age >= 10
# (requires computing current_iter - birth_iter per row in IMPROVEMENT_BACKLOG.md)
```

---

Ready for coordinator to apply diffs: **yes — Changes A and B are mandatory and well-evidenced. Change A is pure governance hygiene (no risk). Change B introduces one new escape hatch that can be invoked at most once per 4-loop window and is self-contained. Changes C and D are optional observability enhancements with negligible risk.**
