# Meta-Review 006 (MR-006)

**Date:** 2026-04-22
**Iteration:** 029 close → 030 entry (Mode 4, governance-only; NO product code changes)
**Loops evaluated:** iter 026 → 029 (4 bounded loops post-MR-005 at iter 025)
**Status:** Complete
**Prior meta-review:** `C:\Users\philk\ledgerium\docs\meta\MR_005.md` (iter 025)
**Triggering condition:** Base 3-loop cadence fully filled — iter 026 + 027 + 028 counted = 3; iter 029 = 4th bounded loop since MR-005. Mode 4 MANDATORY before iter 030 Mode 1 can proceed.

---

## 1. Executive Summary

The window iter 026 → 029 is the first 4-iteration block since MR-001 to execute **zero validation failures, zero follow-ups generated, and three consecutive pool-reducing burn-downs followed by a clean cool-off-consumed `top-score` pick**. MR-005 D-1 through D-7 shipped with observable behavior change in 5 of 7 rules and have not, so far, introduced any rule that produced a false positive or unintended side effect. Execution quality is the strongest it has been across any 4-loop window in the history of the improvement loop — and that is itself the most important finding of this review.

**Top 3 findings:**
1. **MR-005 D-5 audit-intake pattern validated on its second instance.** DASHBOARD_V2_REVIEW_001 promoted 3 P0s (DV2-R01/R02/R03), held 24 in cold pool, and produced one PRD-trigger-eligible cold-pool promotion (DV2-R05/R06 via PRD_METRICS_ENGINE) with zero procedural drift. The pattern is now production-grade.
2. **MR-005 D-4 specialist-invocation gate has never fired in its primary mode, but the exception clause fired twice (iter 026 68 LOC below threshold; iter 029 mechanical extract).** The gate is working as a negative filter but has not yet forced a real specialist adjacency. Drought risk is partially but not fully retired.
3. **Agent-diversity rotation at iter 029 (backend-engineer streak broken at 3 → 0 via rotation to `analytics`) was proactive.** The 4+ trigger was never tripped — but the 3→rotation behavior suggests the 4+ threshold may be one iteration too lax in practice. Evidence is 1 rotation in 1 opportunity, not statistically decisive yet.

**Top 3 recommendations:**
1. **MR-006 Change A — Cool-off recharge rule.** Make the cool-off single-use resource **rechargeable after 3 consecutive burn-downs post-consumption**, matching the original earn-it cadence. Rationale: iter 029 consumption produced measurable formula-validation evidence (Spearman ρ, 33% |Δ|≥10) — the exact outcome the rule was designed to enable. Permanent single-use after one productive consumption creates no tool for the next post-debt-regime validation event.
2. **MR-006 Change B — No change to D-2 (hard-ceiling at pool > 15).** Rule remained dormant entire window (no Mode 5 occurred). Next Mode 5 is Path C Build Phase A at earliest iter 032; the rule will get its first live evaluation there. Do not tune on zero evidence.
3. **MR-006 Change C — Tighten test-touch counting language to prevent false-positive credit.** Iter 029's single `vi.mock` stub in route.test.ts is technically a test-file touch in web-app but is not substantive surface exercise. D-6 currently reads "modifications to `*.test.ts` files within a tracked surface DO count as surface coverage." Tighten to require ≥1 new or materially-modified test case (not mock-plumbing changes alone) to count for reverse-drift or forward-drift counters. Evidence: iter 029 D-1 counter incremented 0 → 1 correctly under current rule; if such thin touches become common the rule loses diagnostic value.

**Window is otherwise a strong validation of MR-005.** The remaining 4 recommendations are minor parameter clarifications; no new rules proposed.

---

## 2. Window Recap Table

| Iter | Mode | Rule | Primary agent | Area | Pool Δ | Follow-ups generated | Density-response | Cool-off |
|---:|:--|:--|:--|:--|:--:|:--:|:--|:--|
| 026 | 1 | burn-down | backend-engineer | process-engine | 33 → 32 | 0 | n/a | streak 1/3 |
| 027 | 1 | burn-down | backend-engineer | policy-engine (ext) | 34 → 32 (post-intake 32→35) | 0 | n/a | streak 2/3 |
| 028 | 1 | burn-down | backend-engineer | extension-app (session-store) | 34 → 32 | 0 | n/a | streak 3/3 → re-arm |
| 029 | 1 | top-score (cool-off CONSUMED) | analytics | web-app (analytics script) | 32 → 31 | 0 | n/a | single-use CONSUMED |

**Net pool movement iter 026 → 029:** 33 → 31 (−2 net; 4 closures achieved against 3 intake promotions from DASHBOARD_V2_REVIEW_001 between iter 026 close and iter 027 entry). **Zero follow-ups generated across 4 iterations.** **Zero validation failures.** **One agent rotation (backend → analytics).**

---

## 3. Per-Rule Effectiveness Assessment

### 3.1 MR-005 D-1 — Reverse portfolio-drift trigger (N=5 non-extension)

**Evidence:**
- Trigger was **armed at iter 024 close** (Path B 5-consecutive-web-app) and **cleared at iter 027 close** by the `policy-engine` (D-1-enumerated surface) burn-down.
- Iter 028 was `extension-app` (D-1-enumerated) — extended clearance further.
- Iter 029 was `web-app` (non-D-1-enumerated) — counter incremented 0 → 1. Still 4 iterations away from re-firing threshold.
- No `reverse-portfolio-drift: user-ack` was ever required in the window.

**Assessment:** The rule did exactly the work it was designed for: it bounded the policy-engine drought that had been growing silently through Path B. The iter 027 `#7` selection was effectively programmed by the trigger's armed state at iter 025 close. Without D-1 the coordinator had no enforceable mechanism to prioritize policy-engine surface ahead of scoring-equivalent alternatives.

**Verdict: Effective.** Fired once, produced the intended response, and did not interfere with any subsequent selection. N=5 threshold appears well-calibrated — iter 029 at counter=1 creates room for non-extension work without immediate re-trigger pressure.

### 3.2 MR-005 D-2 — Mode 5 hard-ceiling at pool > 15

**Evidence:**
- Zero Mode 5 sequences in the window. Rule dormant.
- Pool sat at 31 → 34 throughout — 2× the hard-ceiling threshold — but no Mode 5 was proposed.

**Why no Mode 5 was proposed:**
1. MR-005 D-7 soft cap requires a meta-coordinator pre-check for N≥6 sequences; Path C Build (N=11) cannot open without that pre-check.
2. Path C Define lane CEO question-backlog (17 open questions per `PATH_C_SEQUENCING.md §7`) blocks PRD approval.
3. Iter 026-028 burn-down programming was explicitly fixed at iter 025 close; there was no head-space for a new Mode 5.

**Assessment:** The absence of Mode 5 in a high-debt regime is consistent with the friction-point design of D-2 + D-7. We cannot distinguish "rule dormant because deterrent works" from "rule dormant because conditions never arose." Both Path C Build Phase A entry (earliest iter 032) and any future Mode 5 in an elevated-pool state will be the first real test.

**Verdict: Insufficient Evidence (but not failing).** Zero opportunities to fire; no false-positive risk observed. Preserve as written. Re-evaluate at MR-007 if Mode 5 occurs in iter 030-035.

### 3.3 MR-005 D-3 — Density-response `scope-guard-adjacent` option

**Evidence:**
- Clause 3 (density trigger, 3+ follow-ups) did not fire in any iteration of the window. Zero follow-ups generated across all four iterations.
- D-3's `scope-guard-adjacent` option therefore had zero invocations.
- Density-response taxonomy was not exercised at all.

**Assessment:** Zero follow-ups across 4 iterations is the exact operational profile the density trigger was designed to handle at *low density*, not the PRD-build density profile that D-3 was added to address. Path B iter 020/021/022/024 produced 3/9/3/4 follow-ups respectively; window iter 026-029 produced 0/0/0/0. The D-3 option is therefore *correctly inert for burn-down and targeted iterations* and will be tested the next time a detailed-PRD build iteration occurs (Path C Build Phase A iter 032+).

**Verdict: Insufficient Evidence — preserve.** Zero fires in 4 iterations is not evidence the rule is over-engineered; it is evidence the window was dominated by narrowly-scoped burn-downs that don't produce adjacency-density pressure. Keep as written. Re-evaluate at MR-007 after Path C Build begins.

### 3.4 MR-005 D-4 — Specialist-invocation gate (≥3 copy OR ≥200 LOC)

**Evidence:**
- **Iter 026 evaluated cleanly.** New `processSessionFull` contract = 68 LOC, well below 200. Zero user-visible copy. Gate did not fire. Correct behavior.
- **Iter 027 evaluated cleanly.** 2-line regex widen + 6 tests. Well below 200 LOC. Zero user-visible copy. Gate did not fire. Correct behavior.
- **Iter 028 evaluated cleanly.** ~120 new production LOC in `session-store.ts`. Below 200. Zero user-visible copy. Gate did not fire. Correct behavior.
- **Iter 029 fired the D-4 exception clause.** 75 LOC mechanical extract-and-reexport of `toMetricsInput` (byte-identical). The "mechanical refactors that preserve existing contract byte-identically (extract-and-reexport patterns)" exception was correctly invoked. No adjacency required.

**Counter-check against Path B (iter 019-024):** Had D-4 been in force at iter 020 (305 LOC new `workflow-metrics.ts`), `system-architect` adjacency would have been MANDATORY — and that is exactly the intervention Mode 3 principal-review delivered post-hoc (seven category-level weaknesses corrected via dimension-naming pivot and 9-col→4-col collapse). D-4 would have caught this pre-iter. At iter 024 chip copy rewrote 5 user-visible strings; D-4 would have forced `growth-strategist` adjacency, which was explicitly bypassed as a follow-up #58.

**Assessment:** The gate has now been evaluated 4× (once per iteration) and never fired in its primary affirmative path. The negative filter is correct every time. The exception clause fired once cleanly at iter 029. The absence of affirmative fires is a consequence of window-scope characteristics (burn-downs + mechanical extract), not rule failure. The first real test will be Path C Build Phase A iter 032+ where new ≥200 LOC contracts are projected.

**Verdict: Partially Effective.** Correct as negative filter; untested in affirmative-invocation mode. The ≥200 LOC threshold is credibly well-calibrated against Path B retro evidence (iter 020 at 305 LOC would have fired; iter 026 at 68 LOC correctly does not). Preserve; re-evaluate at MR-007.

### 3.5 MR-005 D-5 — Audit-intake pattern

**Evidence:**
- DASHBOARD_V2_REVIEW_001 intake fired between iter 026 close and iter 027 entry: 3 P0 promotions (DV2-R01/R02/R03 at score 13/10/10), 24 P1-P3 held cold.
- All 3 promoted rows carry `Birth iter: DV2-REVIEW-001` (canonical anchor, correct per D-5 clause 3).
- DV2-R01 closed at iter 029 via `top-score` selection (first cold-pool-derived P0 closure). Path 1 promotion slot created at iter 029 close — coordinator explicitly held the slot pending MR-006 triage (valid; no rule violation).
- Path 2 (PRD-trigger) has not fired in the window, but PRD_METRICS_ENGINE is awaiting approval and cites DV2-R05 + DV2-R06 as enumerated dependencies — exactly the reader-verifiable citation pattern D-5 requires.

**P1 cold-pool accumulation risk check:** 11 P1 items in cold pool (DV2-R04 through DV2-R14). Highest-impact P1s (DV2-R05 seed fixture, DV2-R06 shadow-function audit, DV2-R04 axe-core ratchet) all have real-world impact. If none promote by MR-007 (earliest iter 032), triage them explicitly at next meta-review — current pattern permits but doesn't force P1 attention.

**Assessment:** Second validation of the pattern with zero procedural drift. The pattern held cleanly under a larger intake (3 P0 + 24 cold vs. PRICING_AUDIT_001's 4 P0 + 27 cold). Pool-size ceiling diagnostic value preserved (pool was 32 pre-intake, spiked to 35 post-intake, back to 32 by iter 028 close — intake absorbed within one iteration of regular burn-down).

**Verdict: Effective.** Second validation confirms the pattern. Minor refinement opportunity at MR-007 if P1 cold pool ages without promotion — see MR-006 Change D below for a prophylactic tweak.

### 3.6 MR-005 D-6 — Test-touch surface counting

**Evidence:**
- Iter 029 added exactly one `vi.mock('@/lib/metrics-input-adapter', ...)` block to `route.test.ts`. This is a test-file modification in web-app.
- The D-1 reverse-drift counter incremented 0 → 1 at iter 029 close, treating iter 029 as a web-app (non-extension) iteration.
- Current D-6 wording would also credit this touch *if* route.test.ts were in a tracked extension surface — which it is not. So no false-positive credit occurred in this iteration under D-1.

**But the near-miss is instructive:** if a future iteration's only touch to a tracked extension surface were a 1-line `vi.mock` addition in an extension-app test file, D-6 would credit that as reverse-drift relief. The rule-as-written says "modifications to `*.test.ts` files within a tracked surface DO count" — it does not require substantive test-case addition. A mock-plumbing-only touch exercises no determinism and catches no regressions.

**Assessment:** The rule produced correct behavior in the window. But iter 029 revealed a narrow edge case where a thin test-mock touch could count as substantive surface coverage. Low-probability but high-consequence false-positive: it would mask real drift.

**Verdict: Effective, with refinement opportunity.** See MR-006 Change C below.

### 3.7 MR-005 D-7 — Mode 5 length soft-cap (N ≥ 6 requires pre-check)

**Evidence:**
- Zero Mode 5 in the window. Rule dormant.
- Path C Build Phase A (projected N=11) is the next Mode 5 and is blocked by the MR-005 D-7 pre-check (MANDATORY before opening the sequence).

**Ambiguity check against `PATH_C_SEQUENCING.md §7`:** The sequencing artifact correctly notes the pre-check is required. The D-7 wording ("Mode 4 artifact, ≤1 page, no product code") is unambiguous. The pre-check has four specified evaluation criteria (pool trajectory, area-saturation arc, agent-diversity projection, split-candidacy for 6th+ item). No ambiguity surfaced in the window.

**Assessment:** Rule dormant; no issue detected. Deferral to first live evaluation at Path C Build Phase A.

**Verdict: Insufficient Evidence (preserve).** Zero opportunities to fire. Re-evaluate at MR-007 after Path C Build pre-check is produced.

### 3.8 Cool-off rule (MR-003 B / MR-004 B / narrowed) — consumed at iter 029

**Evidence:**
- Cool-off re-armed at iter 028 close (3-consecutive-burn-down streak 026+027+028 satisfied).
- Consumed at iter 029 for the `top-score` pick (DV2-R01 at score 13).
- Produced concrete formula-validation evidence: the artifact `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` contains Spearman ρ = -0.41, 33% |Δ|≥10, 0/6 band crossings. This is exactly the kind of "high score but discriminating value check" MR-003 Agenda 8 envisioned.
- The consumption was the first non-`directed` cool-off invocation since iter 016 (which was a `directed` misfire, later closed by MR-004 Change B narrowing).

**Cardinality question:** Should cool-off be rechargeable? Evidence for yes: the consumption was productive (formula-validation artifact shipped); the system entered iter 030 in the same high-debt regime; without recharge, no `top-score` pick can execute under pool > 8 until the pool drops ≤ 8 (projected iter 038). That is 8 iterations of locked-out scoring-formula exercise. Evidence for no: a recharge mechanism could re-enable the original MR-003 misfire pattern (cool-off consumed on an item that doesn't actually need it). MR-004 B already closed the `directed` misfire path, so the remaining risk is narrower.

**Assessment:** The single-use design worked — the first non-`directed` invocation shipped the validation artifact it was designed to enable. But in a 30+ open-pool regime, permanent single-use lockout-until-pool-normalizes is too aggressive. A bounded recharge (3 consecutive burn-downs re-arms, same as initial arming) restores the rule's utility without reintroducing the misfire risk.

**Verdict: Effective at single-use; recommend recharge.** See MR-006 Change A below.

### 3.9 Agent-diversity rotation (4+ trigger)

**Evidence:**
- `backend-engineer` consecutive counter: 1 at iter 026 close, 2 at iter 027 close, 3 at iter 028 close.
- Iter 029 rotated to `analytics`, breaking the streak 3 → 0 *before* the 4+ trigger fired.
- The rotation was forced by work-type match (DV2-R01 is analytics-ops script work, not engineering) and is documented in iter 029 Candidate Selection as "MANDATORY agent rotation."

**Was the rotation proactive or pre-emptive?** Proactive — the 4+ rule would have fired at iter 029 if `backend-engineer` had been selected again. The coordinator chose `analytics` as the work-type-aligned primary. This is correct behavior under the existing rule.

**Should the threshold tighten from 4+ to 3+?** Evidence against tightening: the coordinator's proactive rotation at 3 indicates the 4+ rule is functioning as a *soft ceiling* that the coordinator pre-empts, which is the behavior the rule wants. Tightening to 3+ would make the hard ceiling match the soft pre-emption point, removing the head-room the coordinator currently uses to avoid the trigger. N=1 rotation is also not a statistically decisive sample.

**Assessment:** The rule is producing the intended preemption behavior. Tightening is premature without evidence of a coordinator failing to pre-empt at 3.

**Verdict: Effective (preserve).** No change recommended. Re-evaluate if coordinator fails to pre-empt a 4-consecutive scenario in iter 030-035.

### 3.10 Ceiling rule (pool > 8 forces burn-down)

**Evidence:**
- Pool at iter 025 close (MR-005): 33.
- Pool at iter 029 close (MR-006 entry): 31.
- **Net movement over 4 iterations: −2.** Closures: 4 (iter 026 closed #14; iter 027 closed #7; iter 028 closed #19+#20 bundle; iter 029 closed DV2-R01). Intake: 3 P0 DV2 promotions between iter 026 and iter 027.
- **Closure-to-intake ratio for window: 4/3 = 1.33** — finally above 1.0 after Path B (0.42). Narrow — but positive.
- Pool has been in continuous violation of the > 8 soft ceiling for the entire window; the hard ceiling > 15 (Mode-5 only) did not apply outside Mode 5.

**Burn-rate trajectory:**
- Current window: ~0.5 net closures/iteration (4 closures minus 3 intake over 4 iterations = +1 net, ~0.25/iter; or 4 closures over 4 iter = 1.0/iter pre-intake).
- Projected: pool ≤ 25 by iter 034; pool ≤ 15 by iter 038. MR-005 Agenda 6 target of ≤15 by iter 035 will be missed by 2-3 iterations.

**Should a steeper burn-rate mechanism be introduced (e.g., mandatory double-burn-down when pool > 25)?** Evidence for: current burn-rate will not hit the ≤15 target on MR-005's timeline. Evidence against: iter 028 #19+#20 bundle already demonstrates opportunistic double-burn-downs are possible under existing rules (guardrail 7(b) one-logical-outcome); forcing double-burn-downs structurally would be a significant new rule. Zero validation failures across the window suggests existing mechanisms are adequate if applied consistently.

**Assessment:** The rule is working but the target timeline is slipping ~3 iterations. The burn-rate issue is real but not structural — it is a function of PRD-approval pace (Path C Build would produce additional closures) and agent availability. No new rule is warranted based on window evidence alone.

**Verdict: Effective.** Pool trajectory is now strictly-improving; the ≤15 target is a stretch goal and its 3-iteration miss does not indicate rule failure. Preserve.

---

## 4. Recommended Control Diffs

Each diff below is written as an applyable old_string/new_string pair with sufficient surrounding context. Apply in the order presented. Count: **4 diffs** (A/B/C/D). No new rules; all are clarifications or minor parameter tweaks.

### MR-006 Change A — Cool-off recharge rule

**Location:** `CLAUDE.md` § Follow-Up Debt Policy, clause 7.

**Rationale (≤3 sentences):** Iter 029 consumption of the single-use cool-off produced exactly the formula-validation evidence the rule was designed to enable (Spearman ρ, 33% |Δ|≥10 artifact). Permanent single-use after one productive invocation locks out scoring-formula exercise for the remainder of the high-debt regime (projected ≥8 iterations until pool ≤ 8). A bounded recharge — same 3-consecutive-burn-down earn-it cadence as initial arming — restores the rule's validation utility without reintroducing the `directed` misfire risk (still excluded per MR-004 Change B).

**Expected observable effect:** Post-MR-006, any time 3 consecutive burn-downs occur post-cool-off-consumption, the cool-off re-arms and may be invoked once more under pool > 8 for a `top-score` or `blocker-cadence` selection. MR-007 will measure: did cool-off re-arm at any point in iter 030-034? Did it get consumed? Did the consumption produce another formula-validation artifact?

**Rollback trigger:** If a second cool-off consumption in iter 030-040 produces zero formula-validation evidence (i.e., the item would have passed by top-score anyway without the refinement concern the rule was designed to surface), revert to single-use at MR-008.

**old_string:**
```
7. **Ceiling-rule cool-off (MR-003 Change B, narrowed by MR-004 Change B):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score` or `blocker-cadence` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8. **Exclusion (MR-004 Change B):** `directed` selections (Mode 2/5) already bypass clause 6 via operating-mode precedence and do NOT require cool-off invocation. Consuming a cool-off on a `directed` pick produces zero formula-validation evidence (observed at iter 016) and wastes a single-use resource — this is now prohibited.
```

**new_string:**
```
7. **Ceiling-rule cool-off (MR-003 Change B, narrowed by MR-004 Change B, recharge added by MR-006 Change A):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score` or `blocker-cadence` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use per charge: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8. **Recharge (MR-006 Change A):** after cool-off consumption, 3 new consecutive `burn-down` iterations re-arm the cool-off resource, at which point it may be invoked once more under the same rules. Recharge is unbounded — the rule may fire as often as the earn-it cadence allows. **Exclusion (MR-004 Change B):** `directed` selections (Mode 2/5) already bypass clause 6 via operating-mode precedence and do NOT require cool-off invocation. Consuming a cool-off on a `directed` pick produces zero formula-validation evidence (observed at iter 016) and wastes a charged resource — this is prohibited. Rationale for recharge: iter 029 validated that a single-charge consumption produces measurable formula-validation evidence (Spearman ρ distribution artifact); permanent single-use lockout in a persistent high-debt regime eliminates the rule's utility for repeat validation events.
```

---

### MR-006 Change B — Preserve D-2 hard-ceiling unchanged

**Rationale (≤3 sentences):** D-2 hard-ceiling (pool > 15 forces burn-down inside Mode 5) did not fire in iter 026-029 because no Mode 5 occurred. Zero evidence for or against the rule. Preserve as-written; Path C Build Phase A (earliest iter 032) will be the first live evaluation.

**Expected observable effect:** No observable change. D-2 wording unchanged.

**Rollback trigger:** N/A — no change proposed.

**Diff:** None. This is a recorded "no-change" decision to prevent D-2 from being modified speculatively on zero-evidence.

---

### MR-006 Change C — Test-touch counting requires substantive test-case modification

**Location:** `CLAUDE.md` § Meta-Review Cadence, Early triggers list, D-6 portfolio-drift parenthetical; and the reverse portfolio-drift trigger (D-1) where D-6 is cross-referenced.

**Rationale (≤3 sentences):** Iter 029 added a single `vi.mock` stub to route.test.ts — technically a test-file modification in a tracked surface. Under current D-6 wording ("modifications to `*.test.ts` files... DO count as surface coverage"), a mock-plumbing-only touch would earn the same drift-counter credit as adding or modifying a substantive test case. Tighten to require ≥1 new or materially-changed test case assertion to count for drift-counter purposes; pure mock-plumbing / import-path-only edits do not suffice.

**Expected observable effect:** MR-007 should find that any touch claiming drift-counter credit carries either a new `test(...)` / `it(...)` block OR a materially-changed existing assertion. Purely mechanical test-file edits (import paths, mock registrations) are recorded but do not credit the counter.

**Rollback trigger:** If the tightened rule produces a missed-drift scenario (e.g., a legitimate test refactor that clearly exercises determinism but contains no new/changed assertions is denied credit and drift accumulates silently), loosen at MR-008.

**old_string (D-6 parenthetical on forward-drift line; already in force):**
```
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift (MR-003 Change D). **Test-only touches count (MR-005 Change D-6 / MR-004 Change F):** modifications to `*.test.ts` / `*.test.tsx` / `*.spec.ts` files within a tracked surface DO count as surface coverage — they exercise determinism and catch regressions, which IS the benefit the rule was designed to surface.
```

**new_string:**
```
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift (MR-003 Change D). **Test-only touches count (MR-005 Change D-6 / MR-004 Change F, tightened by MR-006 Change C):** modifications to `*.test.ts` / `*.test.tsx` / `*.spec.ts` files within a tracked surface count as surface coverage **only if they include ≥1 new or materially-modified test case assertion** — adding a new `test(...)` / `it(...)` block OR changing an existing assertion's expected value / predicate / coverage. Mock-plumbing-only edits (import paths, `vi.mock` stub additions, harness-parameter passthroughs) do NOT count as surface coverage. Rationale: mock-plumbing edits do not exercise determinism or catch regressions; the rule's diagnostic intent is substantive coverage, not file-level touch count.
```

---

### MR-006 Change D — Audit cold-pool P1 staleness escalation (prophylactic)

**Location:** `CLAUDE.md` § Audit-Intake Pattern (the MR-005 D-5 section), add a new clause 7.

**Rationale (≤3 sentences):** DV2-REVIEW-001 produced 11 P1 cold-pool items (DV2-R04 through DV2-R14) with real-world measurement / launch / a11y impact. Current D-5 rules require P0-burn-down-creates-slot OR PRD-trigger for promotion — both passive. If no P0 slot opens and no PRD cites a given P1, high-impact items can age indefinitely in cold pool. Add a staleness-escalation clause equivalent to the live-pool 10-iteration cap, scoped to cold-pool items, to force explicit meta-review triage.

**Expected observable effect:** MR-007 will include a mandatory cold-pool staleness scan. Any cold-pool item older than 10 iterations (from its audit-producing iteration) must be explicitly triaged: keep-cold, promote, or delete. This mirrors the live-pool staleness-cap treatment.

**Rollback trigger:** If MR-007 finds no P1 cold-pool items aged past 10 without promotion (because natural P0 burn-down or PRD-trigger promotion is sufficient), retire the clause at MR-008 as proven-unneeded.

**old_string (end of Audit-Intake Pattern section, after clause 6):**
```
6. **No other promotion paths.** Coordinator judgment or "we should probably look at this" is NOT a valid promotion path — it breaks the pool-size ceiling rule's protection.

Rationale: the pattern was validated by `PRICING_AUDIT_001.md` (iter M3@016→17) where 4 P0 items entered live, ~27 P1/P2/P3 held cold, and one cold-pool item (BUG-07) promoted cleanly via PRD trigger (iter 018, closed iter 023). The codification locks in working convention before a second audit-style artifact introduces drift.
```

**new_string:**
```
6. **No other promotion paths.** Coordinator judgment or "we should probably look at this" is NOT a valid promotion path — it breaks the pool-size ceiling rule's protection.
7. **Cold-pool staleness escalation (MR-006 Change D).** Cold-pool items that have been held without promotion for ≥ 10 iterations post-audit-intake MUST be explicitly triaged at the next meta-review. Each aged cold-pool item receives an explicit verdict: `keep-cold` (still relevant, no action needed), `promote` (enters live backlog with `Birth iter: MR-N-promoted` and cited evidence for elevated priority), or `delete` (no longer relevant). This mirrors the live-pool 10-iteration staleness-cap treatment (Follow-Up Debt Policy clause 2) and prevents high-impact P1 items from aging silently when neither P0-burn-down nor PRD-trigger promotion occurs.

Rationale: the pattern was validated by `PRICING_AUDIT_001.md` (iter M3@016→17) where 4 P0 items entered live, ~27 P1/P2/P3 held cold, and one cold-pool item (BUG-07) promoted cleanly via PRD trigger (iter 018, closed iter 023); it was re-validated by `DASHBOARD_V2_REVIEW_001.md` (iter 026→27 intake) where 3 P0 entered live and 24 P1/P2/P3 held cold with DV2-R01 closure creating a promotion slot and DV2-R05/R06 queued for PRD-trigger promotion upon PRD_METRICS_ENGINE approval. The codification locks in working convention; the staleness-escalation clause prevents cold-pool drift.
```

---

## 5. No-Change Rules (Working As Designed — Do Not Touch)

The following rules operated correctly in the window and should NOT be modified at MR-006. Each entry names the rule and cites the evidence of correct operation.

1. **MR-005 D-1 reverse portfolio-drift trigger (N=5).** Fired once (armed iter 024 close), cleared once (iter 027 policy-engine burn-down), produced no false positives. Correct calibration.
2. **MR-005 D-2 hard-ceiling at pool > 15 (Mode 5 only).** Dormant; no Mode 5 in window. Preserve for Path C Build Phase A live test.
3. **MR-005 D-3 fourth density-response `scope-guard-adjacent`.** Dormant; no density-trigger fires. Preserve for next PRD-build iteration.
4. **MR-005 D-4 specialist-invocation gate (≥3 copy / ≥200 LOC).** Evaluated 4× cleanly as negative filter; exception clause fired once cleanly. No false positives.
5. **MR-005 D-5 audit-intake pattern.** Second validation (DV2-REVIEW-001); pattern held cleanly. Augmented by MR-006 Change D for cold-pool staleness.
6. **MR-005 D-7 Mode 5 length soft-cap (N ≥ 6 pre-check).** Dormant; preserves Path C Build gate.
7. **Ceiling rule clause 6 (pool > 8 forces burn-down).** Correctly forced iter 026/027/028 burn-down selections. Preserve.
8. **Same-implementer 4+ trigger.** Coordinator correctly pre-empted at 3 via rotation to `analytics`; rule is functioning as soft ceiling. Preserve.
9. **MR-004 Change B narrowed cool-off (directed exclusion).** Iter 029 consumption was a proper `top-score` selection, not `directed`. Exclusion held. Preserve.
10. **Follow-Up Debt Policy clause 1 (1-in-5 burn-down floor) and clause 4 (density-response taxonomy).** Unused in window but observed not to interfere; preserve.

---

## 6. Next Meta-Review Trigger

**MR-007 earliest iteration:** **iter 032 (3-loop stability window from MR-006 at iter 029 close).** The 3-loop floor rule per `CLAUDE.md § Meta-Review Cadence` ("do not run another for at least 3 loops") means MR-007 cannot fire before iter 032.

**Early-trigger watch for iter 030-032:**
- **Reverse portfolio-drift (D-1):** counter at 1 post-iter-029. Trigger fires at counter=5. No immediate risk unless iter 030-031 are both non-extension.
- **Pool-size ceiling (clause 6):** pool at 31; continues to force burn-down unless MR-006 Change A recharge re-arms the cool-off. Iter 030 projection: `#51` analytics instrumentation (score 13, web-app) if MR-006 does not re-program.
- **Cool-off recharge (MR-006 Change A if adopted):** re-arms after 3 consecutive burn-downs post-iter-029. If iter 030-032 are all burn-down, recharge completes iter 032 close → first recharge-eligible `top-score` slot iter 033.
- **Same-implementer 4+:** `analytics` = 1 post-iter-029. If iter 030-032 are all `backend-engineer`, counter at 3 entering iter 033; coordinator must pre-empt at 3 per MR-006 §3.9 "preserve" verdict.
- **Mode 5 hard-stop (D-2 clause 9):** inactive outside Mode 5; no Mode 5 expected iter 030-031. Path C Build Phase A (earliest iter 032) would be the first live evaluation.
- **Reverse portfolio-drift user-ack:** not applicable unless counter reaches 5.
- **DASHBOARD_V2 cold-pool PRD-trigger:** DV2-R05 + DV2-R06 auto-promote upon PRD_METRICS_ENGINE approval per MR-005 D-5 clause 5.

**Hard triggers** that would force MR-007 earlier than iter 032:
- Any Mode 5 sequence initiated (D-7 pre-check is itself a Mode 4 artifact and counts).
- 2 consecutive validation failures.
- Same-implementer-4+ actually tripped.
- Reverse portfolio-drift reaching N=5.

---

## 7. Open Questions for CEO

1. **Cool-off recharge adoption?** MR-006 Change A proposes rechargeable cool-off after 3 consecutive burn-downs post-consumption. Accept/reject for iter 030+?
2. **DV2-REVIEW-001 P1 cold-pool triage policy?** Current plan: auto-promote DV2-R05 + DV2-R06 via PRD_METRICS_ENGINE approval (MR-005 D-5 clause 5). Should DV2-R04 (axe-core regression gate) also be force-promoted independently given the PRD §10 a11y commitment, or wait for natural P0-burn-down slot creation?
3. **Path C Build Phase A opening trigger?** PRD_METRICS_ENGINE is awaiting CEO approval on 17 open questions. What is the earliest realistic iteration the Mode 5 pre-check (D-7) could run — iter 031, 032, or later?
4. **Burn-rate stretch target?** MR-005 set ≤15 pool by iter 035. Current trajectory projects iter 038. Should MR-006 revise the target to ≤15 by iter 038, or preserve ≤15 by iter 035 as aspirational?

---

## Cadence Note

- MR-006 completed at iter 029 close (Mode 4 governance-only).
- Stability window runs through iter 032 (3 loops per MR-001 floor rule).
- MR-007 earliest iter 032. If MR-006 Change A is adopted and an early-trigger fires (e.g., validation failure, Mode 5 start, reverse-drift N=5), MR-007 could be earlier.

## Supersedes Note

- **MR-006 Change A** supersedes the single-use language of MR-003 Change B / MR-004 Change B. The directed-exclusion (MR-004 B) is preserved; only the cardinality (single-use → rechargeable) changes.
- **MR-006 Change C** tightens MR-005 D-6 (test-touch counting). The core rule (test touches count) is preserved; the threshold for what constitutes a substantive touch is added.
- **MR-006 Change D** extends MR-005 D-5 (audit-intake pattern) with a new clause 7 (cold-pool staleness escalation). No existing clause is modified.
- **MR-006 Change B** is a formal no-change decision on D-2 hard-ceiling.
- D-1, D-3, D-4, D-7, MR-004 Change B, same-implementer-4+, ceiling clause 6, Follow-Up Debt Policy clauses 1-4 all preserved unchanged.

---

## Effectiveness Metric Targets (for MR-007)

MR-007 must measure:

1. **Did MR-006 Change A (cool-off recharge) fire in iter 030-034?** If fired, was it consumed productively (formula-validation evidence)? If never re-armed, was the ≤15 pool target reached first (making recharge unneeded)?
2. **Did MR-006 Change C (substantive test-touch) produce a different drift-counter outcome than the un-tightened rule?** Compare any claimed-drift-credit events to the substantive-test-case threshold.
3. **Did MR-006 Change D (cold-pool staleness escalation) fire?** Audit-intake rows #34/#35/#36 age ~9 at iter 029; at iter 032 they will be age ~12 (past 10-iter cap). MR-007 MUST triage them explicitly.
4. **Pool trajectory vs the slipping ≤15 target.** Pool at iter 029 close: 31. Target ≤ 25 by iter 034 (original MR-005 target ≤ 25 by iter 028 was 32, already missed by 7); target ≤ 15 by iter 038 (MR-006 revised).
5. **First Mode 5 in post-MR-005 window.** Did Path C Build Phase A open? Did the D-7 pre-check produce a usable artifact?
6. **D-4 specialist-invocation first affirmative fire.** Has any iteration triggered `system-architect` or `growth-strategist` adjacency via the primary (not exception) path? Zero affirmative fires in iter 026-029 is consistent with burn-down dominance; iter 030+ may change this.
7. **Closure-to-intake ratio over 10-iter window.** iter 020-029 window: 4 closures (#14, #7, #19, #20, DV2-R01 across iter 026-029) + 1 closure (iter 023 #40 BUG-07) vs 19 Path B follow-ups + 3 DV2 P0 intake = 5 closures / 22 created = **0.23**, below the 0.4 floor. MR-007 target: ≥ 0.4 over iter 024-033 window.

---

**End of MR-006.**
