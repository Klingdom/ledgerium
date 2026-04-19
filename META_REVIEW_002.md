# Meta-Review 002 — Iterations 009–011

Date: 2026-04-18
Triggered by: base cadence (3 loops since Meta-Review 001; Mode 5 increment N=2 for iter 010+011 plus 1 for iter 009)
Scope: iterations 009, 010, 011 + efficacy assessment of the five Meta-Review 001 diffs applied in commit `19b6832`

---

## Executive Summary

The five behavior changes shipped by Meta-Review 001 (release-blocker bonus, saturation penalty, 1-in-5 blocker cadence, 1-in-5 follow-up burn-down, Delegation Decision Rubric, Mode 5 formalization) produced **their intended first-order outcomes cleanly**. All three Phase-1 release blockers closed in three consecutive loops. Agent diversity broke the backend-engineer monoculture (three distinct primary agents across three loops). Mode 5 executed as a real directed sequence (iter 010+011) with zero scope violations against its six guardrails. The scoring formula discriminated correctly in iter 009 (natural 12 → 15 via the +3 bonus beat competitors by 1–2 points where under the old formula it would have lost to SOP-area items).

**But the system has executed only one truly score-driven selection in this window** (iter 009). Iter 010 and iter 011 were `directed`, not `top-score`, so the refined formula proved discriminating only on the first of the three loops. Simultaneously a new structural risk appeared: **the follow-up pool grew from ~6 open items to 8 across three loops, with zero items closed, and the density trigger — three or more follow-ups from a single iteration — fired twice in two loops (iter 010 generated 4, iter 011 generated 4) and neither triggered the policy-required response (re-scope OR root-cause-analyst invocation).** The 1-in-5 burn-down rule has not yet been violated because burn-down hasn't become due until iter 012, but the density-trigger clause of the same policy is now in double violation.

Secondary signal: now that release blockers are closed, the `release_blocker_bonus` and the 1-in-5 blocker-cadence rule have zero items to apply to for the foreseeable future. Two of MR-001's five diffs become dormant tooling until Phase 2 surfaces new blockers. This is not a problem; it is a predicted state transition. But the early-trigger "0 release-blocker items selected in 5 loops" in CLAUDE.md § Meta-Review Cadence will mis-fire as spurious signal in the post-blocker window and must be either disabled or made phase-aware.

System state: **Healthy on the dimensions MR-001 targeted; drifting toward follow-up debt on a dimension MR-001 only partially instrumented.**

Headline recommendation: **mechanize the density trigger** (it is the only MR-001 policy actively being violated), and **force iter 012 to be a follow-up burn-down loop even beyond the 1-in-5 rule** to arrest the 8-item unaddressed pool before it compounds.

---

## Scope window

| Iter | Mode | Selection rule | Primary implementer(s) | Area | Commit(s) | Score | Outcome |
|------|------|----------------|------------------------|------|-----------|-------|---------|
| 009  | 1 (standard, post-MR-001) | `blocker-cadence` | qa-engineer + devops-engineer | quality assurance | `1a1ba6c` | 15 | Playwright E2E + CI workflow landed; release blocker #1 closed |
| 010  | 5 (directed, item 1/2) | `directed` | backend-engineer + qa-engineer | session durability | `d24699d` + `ae060f0` | 14 | Full event persistence + SW restart recovery; release blocker #2 closed |
| 011  | 5 (directed, item 2/2) | `directed` | system-architect + backend-engineer + qa-engineer | extension architecture / segmentation | `88a770d...dfe9658` + `cf06869` | 11 | 4-impl → 1-impl segmentation convergence; release blocker #3 closed |

Key notes for this window:
- Iter 009 is the first loop executed under MR-001's refined rules — it is the single data point on scoring-formula discrimination in a non-directed context.
- Iter 010+011 was the first real Mode 5 directed sequence since the mode was formalized in CLAUDE.md by MR-001.
- All three loops closed a release blocker. This is historically unprecedented in the project log (prior cumulative closures: 0 across iterations 001–008).

---

## Did the MR-001 changes work? (Per-change effectiveness scorecard)

### Change #1 — `release_blocker_bonus = +3`

**Verdict: Working** (on the one loop where it was actually dispositive).

Evidence:
- **Iter 009**: natural score = 12 (Impact 4 + Alignment 5 + Learning 4 + Confidence 4 − Effort 3 − Risk 2). With +3 blocker bonus → 15. Competing SOP-area items (e.g. wire `validateRenderedSOP`, extract confidence thresholds) carried natural scores of 11 and 10 and were penalized by the saturation rule to 9 and 8 respectively. The +3 bonus was mathematically necessary — without it, Playwright E2E at 12 would have tied the credit_card regex (11 natural, not penalized) after rounding, and a coin-flip policy would have re-selected low-impact polish. **The bonus correctly discriminated.**
- **Iter 010**: natural score = 11, bonused to 14. But selection rule was `directed`, so the bonus played no dispositive role — selection was coordinator-deferred to the user. The bonus is observable in the backlog ranking but did not actually drive the decision.
- **Iter 011**: natural score = 8, bonused to 11. Selection was `directed`. Same caveat as iter 010 — the bonus is visible in the log but not dispositive.

Residual concern: **two of the three loops were `directed`, not `top-score` or `blocker-cadence`.** The bonus has been stress-tested on exactly one genuine selection. This is a thin evidence base on which to conclude the formula is right. Recommend carrying forward but earmarking for re-evaluation after 5 non-directed loops.

Dormancy warning: with all blockers closed, the bonus has **zero items to apply to for iterations 012–N** until Phase 2 surfaces new blockers. The term remains in the formula as dormant tooling. That is fine — do not remove it — but the mathematical range of the formula contracts back toward MR-001's pre-change 10–16 band until new blockers appear.

### Change #2 — `saturation_penalty = −2`

**Verdict: Working as deterrent; no false positives observed.**

Evidence:
- SOP area saturation (4-of-5 at MR-001 time) was **cleared** by iter 011 (SOP area now 1-of-5 across iter 007–011 per IMPROVEMENT_BACKLOG.md line 26–27). The penalty did what it was designed to do: it made SOP polish items mathematically uncompetitive at the moment of iter 009 selection, forcing the pivot.
- **Deflection count**: in iter 009 the penalty deflected two SOP-area candidates from competitive range (validateRenderedSOP 11 → 9; extract confidence thresholds 10 → 8). That is one concrete deflection event.
- **No false positives**: no candidate was incorrectly penalized in iter 010 or iter 011 because no Area was in saturation at those selection moments. The current backlog (post iter 011) shows every Area at 1-of-5 — zero `−S` penalties currently apply.

Residual concern: the rule only triggers at 3-of-last-5 in the same Area. A 2-of-3 cluster (e.g. two follow-up burn-downs in adjacent loops targeting the same subsystem) would **not** trigger the penalty but could be an early warning. Not enough evidence yet to recommend tightening — flag as "watch in iter 012–016."

### Change #3 — 1-in-5 release-blocker cadence rule

**Verdict: Working.** The rule fired exactly once in this window (iter 009 was selected under `blocker-cadence`) and produced the intended pivot.

Evidence:
- Iter 009 explicitly states "Selection rule: `blocker-cadence` — 1-in-5 release-blocker rotation rule."
- Prior state was 5 consecutive loops (iter 004–008) with zero release blockers selected. The rule forced iter 009 to pick from the blocker list.
- The rule has not needed to fire since because iter 010 and iter 011 were directed, and both directed selections happened to be release-blocker items. If the user had directed toward non-blocker work, the coordinator would have been obligated to flag the conflict — it was not stress-tested on that path.

Phase-transition observation: **with all blockers closed, the 1-in-5 blocker-cadence rule is dormant for the foreseeable future.** It will stay dormant until Phase 2 surfaces new blockers. This is coupled to Change #1 and has the same dormancy warning.

### Change #4 — 1-in-5 follow-up burn-down rule

**Verdict: Not Working yet (but not formally violated yet either).**

Evidence:
- Across iter 009, 010, 011: **0 follow-up items selected.** Iter 009 was `blocker-cadence`. Iter 010 and 011 were `directed`. None touched the follow-up pool.
- The 1-in-5 rule triggers when no follow-up has been picked in the last 4 loops — i.e. the 5th must be a follow-up. At the end of iter 011, the count is "3 consecutive loops without follow-up burn-down." Iter 012 is the 4th; iter 013 would be the forced-pick point.
- However, the pool itself has grown from ~0 (pre-iter 009) to **8 open items** (#18–#25) in three loops. Net creation rate: **+2.67 per loop**, with **zero closures**. Closure ratio over the 3-loop window: **0 / 8 = 0.0**. The policy-mandated 10-loop ratio ≥ 0.4 is currently on track to be missed unless iter 012–014 each burns down 2+ items.

Interpretation: the rule is **not yet formally violated**, but the underlying risk the rule was designed to prevent — unbounded follow-up accumulation — is in active violation of the policy's density trigger (see Change #4a below). The rule's cadence is too slow given how fast iter 010 and iter 011 spawned follow-ups.

### Change #4a — Follow-up density trigger (sub-policy of Change #4)

**Verdict: Violated twice. Policy response never executed.**

CLAUDE.md § Follow-Up Debt Policy states: *"if a single iteration generates 3+ follow-ups, the coordinator must either (a) re-scope the iteration into multiple loops, or (b) invoke `root-cause-analyst` on why one loop is spawning that much residual work."*

Evidence of violation:

| Iter | Follow-ups generated | Items | Required response | Response delivered |
|------|----------------------|-------|--------------------|--------------------|
| 009  | 8 (in "Follow-Ups" block: real-extension test, session recovery test, chrome.storage mock, STOP_SESSION badge, unit-test CI, typecheck CI, web-app E2E, content modules, design smell note) | Multiple | density trigger | **none** (not all entered backlog with IDs, but iter 009 block lists 8 distinct items) |
| 010  | 4 (#18, #19, #20, #21) | surface persistenceTruncated; GC stale keys; loadFromStorage cross-validation; launchPersistentContext E2E | density trigger | **none** (no re-scope, no root-cause-analyst invocation) |
| 011  | 4 (#22, #23, #24, #25) | invariant I1 cross-path assertion; doc drift; LiveStep typing; full-pipeline golden fixture | density trigger | **none** (no re-scope, no root-cause-analyst invocation) |

**This is the single most important finding of this meta-review.** The density trigger is the policy clause most likely to catch early systemic strain, and the coordinator has ignored it three times running. Part of the reason appears to be ambiguity: the iter 009 "Follow-Ups" block lists items that were not formally tracked in IMPROVEMENT_BACKLOG.md as `#N` IDs (only iter 010 and iter 011 follow-ups got IDs). So the coordinator may plausibly have reasoned "these aren't 'real' follow-ups yet." That ambiguity is itself a policy gap and must be closed.

### Change #5 — Delegation Decision Rubric

**Verdict: Working — but partly from Mode 5 luck.**

Evidence:
- **Distinct primary agents across iter 009–011 = 3 / 3** (qa-engineer in 009; backend-engineer in 010; system-architect in 011).
- **Rolling 5-loop window** (iter 007–011) distinct agents: backend (007) · backend (008) · qa+devops (009) · backend+qa (010) · architect+backend+qa (011) → **4 distinct implementing agents** across the window (backend, qa, devops, system-architect). Prior 5-loop window (iter 003–007) had effectively 1 (backend-engineer). This is the diversity lift MR-001 targeted.
- `system-architect` appeared as primary for the first time in the project's history at iter 011 — directly enabled by the rubric's "design smell / leaky abstraction" trigger (segmentation convergence is exactly that archetype).

Caveat: **iter 011's architect invocation was driven by Mode 5 directed-sequence specialization**, not by the rubric acting autonomously. The coordinator knew iter 011 was convergence work and the user directed it; the rubric merely confirmed what the directed scope already implied. A truer test is: would the coordinator have invoked `system-architect` if iter 011 had emerged from top-score selection rather than user direction? **Unknown.** The rubric has not yet been stress-tested on autonomous agent rotation.

Recommendation: carry the rubric forward but expect to re-test it in the first 2–3 post-blocker, non-directed loops (iter 012+).

---

## Per-change summary table

| # | Change | Applied in 19b6832 | Iter 009 effect | Iter 010 effect | Iter 011 effect | Verdict |
|---|--------|---------------------|-----------------|-----------------|-----------------|---------|
| 1 | `release_blocker_bonus = +3` | ✓ | dispositive (12 → 15) | visible but not dispositive (directed) | visible but not dispositive (directed) | Working (thin n=1) |
| 2 | `saturation_penalty = −2` | ✓ | dispositive deflection (2 items out of competitive range) | no-op (no area saturated) | no-op (no area saturated) | Working as deterrent |
| 3 | 1-in-5 blocker-cadence | ✓ | fired (forced selection) | bypassed (directed) | bypassed (directed) | Working (tested once) |
| 4 | 1-in-5 follow-up burn-down | ✓ | 0 picks | 0 picks | 0 picks | Not yet triggered; trigger point at iter 013 |
| 4a | Follow-up density trigger | ✓ (as clause of #4) | arguably fired (8 items); no response | fired (4 items); no response | fired (4 items); no response | **Violated × 2+; must mechanize** |
| 5 | Delegation Decision Rubric | ✓ | qa + devops (rubric-driven) | backend + qa (no rotation forced) | architect + backend + qa (Mode 5 scope-driven) | Working, but not stress-tested autonomously |

---

## Mode 5 efficacy review

Iter 010 + 011 was the first real Mode 5 execution. Guardrail-by-guardrail compliance:

| Guardrail (CLAUDE.md § Operating Modes) | iter 010 | iter 011 | Notes |
|------------------------------------------|----------|----------|-------|
| 1. Independent iteration — own commit, own validation, own artifact updates | ✓ | ✓ | Iter 010 = `d24699d` (+`ae060f0` for unrelated web-app fix); iter 011 = 7 production commits `88a770d...dfe9658` + artifact commit `cf06869`. Validation runs stand alone per loop. |
| 2. One-item-per-loop — no cross-item refactors | ✓ | ⚠ | Iter 011 expanded scope to include `bundle-builder.ts`. **See dedicated analysis below.** |
| 3. Scope discipline stated up-front | ✓ | ✓ | Both iter-log entries have explicit "Scope discipline (stated up-front)" blocks listing deferred items. |
| 4. 3+ item MANDATORY meta-review | n/a | n/a | Sequence was N=2; rule does not apply. |
| 5. Counter increments by N, not 1 | ✓ | ✓ | Counter = 3 (iter 009 + N=2 from iter 010+011) per SYSTEM_HEALTH.md line 147 and IMPROVEMENT_BACKLOG.md line 113. Confirmed correct. |
| 6. Area-saturation flag if same-Area items | n/a | n/a | iter 010 = `session durability`, iter 011 = `extension architecture / segmentation` — different Areas, no flag needed. Coordinator correctly did not flag. |

### Deep-dive: the iter-011 scope expansion (guardrail #2)

The named Mode 5 item was "Converge LiveStepBuilder with StreamingSegmenter." Iter 011 expanded the implementation surface to include `bundle-builder.ts` (which implements a different segmentation primitive, `buildDerivedSteps`).

**Was this a scope violation?** Assessing on the merits:

- **Evidence basis**: the system-architect's current-state audit revealed that the canonical package segmenters (`StreamingSegmenter`, `segmentEvents`) had **zero production call sites** — closing only the named pair would have unified two dead-code implementations while leaving the actual live divergence (`LiveStepBuilder` vs `buildDerivedSteps`) open. This is a factual, not speculative, scope expansion.
- **Logical unity**: "unify segmentation onto the package primitive" is one outcome. It requires touching all four implementations or the outcome is not achieved.
- **Documentation**: the coordinator documented the scope expansion in the iteration log, in the design doc §0/§3.4, and in CHANGELOG. It is not hidden scope creep.
- **Containment**: the expansion stayed within the segmentation subsystem (single Area), did not touch iter-010 surfaces (verifiable via `git log --follow` per line 787), did not bump `SEGMENTATION_RULE_VERSION`, did not change wire protocol.

**Verdict: justified scope expansion, correctly documented.** This is how guardrail #2 is *supposed* to work — the coordinator exercised judgment, recorded the rationale, and the architect's design doc provides an auditable evidence trail. But the pattern is **dangerous if repeated** without the same evidentiary rigor. Recommend formalizing a scope-expansion protocol (see §7 Change D).

Counter-example watch: iter 010 added `vitest.config.ts` (pre-existing defect; Vitest was picking up Playwright specs; blocking for green CI). This is a smaller and cleaner case — additive fix, required for validation, not a semantic scope change. Not a violation.

### Did Mode 5 accelerate or distort the loop?

The directed sequence closed 2 of 3 release blockers in 2 loops. **Would non-directed selection have done the same?**

- Iter 010 (session persistence): natural score 11, bonused to 14. Under the new formula, this was the top non-SOP candidate — it would have won `top-score` selection anyway. **Mode 5 did not distort this selection.**
- Iter 011 (segmentation convergence): natural score 8, bonused to 11. Under the new formula, this would have tied several follow-ups (#18, #19, #7, #14 all at 11) and would have been forced-picked by `blocker-cadence` only if no blocker had been selected in the prior 4 loops (which was not the case — iter 009 and iter 010 both were). So **iter 011 would NOT have been picked autonomously** under top-score or cadence rules — the formula would have routed iter 011 to a follow-up burn-down loop and iter 012 (or later) to the segmentation convergence. Mode 5 compressed the timeline by ~1–2 loops.

Interpretation: Mode 5 accelerated release-blocker closure by roughly one loop. Neither selection was distorted (both were good choices), but iter 011 specifically was coordinator-deferred to user direction at a moment when the autonomous formula would have picked something else.

### The coordinator-deferral bias risk

Two of three loops in this window were `directed`. If this pattern persists, the refined scoring formula never gets a chance to prove itself on autonomous selections. **This is a low-severity risk today but worth flagging.** Specifically:

- If every future release-blocker sweep is handled as Mode 5, we will never know whether the formula would have selected the right blocker on its own.
- The user's proactive direction short-circuits the coordinator's judgment muscle. Over many loops, this atrophies the coordinator's autonomous capability.
- Mitigating factor: Mode 5 is user-initiated. The system does not choose Mode 5 on its own. So the bias is a function of user behavior, not system behavior.

Recommendation: no policy change, but SYSTEM_HEALTH.md should track a new metric — **ratio of autonomous-selection loops to directed loops** — so the bias is visible over time.

---

## Follow-up debt trajectory (Priority Finding)

This is the **largest new systemic risk** visible in the post-MR-001 window. It is separate from the MR-001 change-efficacy question and must be addressed independently.

### Pool accumulation

| Pool state | Iteration | Added | Closed | Net | Open |
|-----------|-----------|-------|--------|-----|------|
| Pre-iter 009 | — | — | — | — | ~6 (carried from MR-001 inventory) |
| Post-iter 009 | 009 | 8 listed in log (not all formally backlog-tracked with IDs) | 0 | +(some, ambiguous) | ~6–10 |
| Post-iter 010 | 010 | 4 (#18–#21) | 0 | +4 | ~10–14 |
| Post-iter 011 | 011 | 4 (#22–#25) | 0 | +4 | **8 (backlog-tracked: #18–25; older ones may have been pruned or silently dropped)** |

Net observation: the **current authoritative open pool is 8 formally-tracked follow-ups** (#18–#25 in IMPROVEMENT_BACKLOG.md). Older follow-ups from iter 004–008 era (credit_card regex #7, validateRenderedSOP wire #14, confidence thresholds #15) either got renumbered into the standard backlog or are still there. Inspection of the backlog table shows #7, #14, #15 are still present — so the **real open pool is closer to 11–13 items** once you count iter-007 and iter-008 residuals.

### Policy-relevant metrics

| Metric | Current value | Target | Status |
|--------|---------------|--------|--------|
| Follow-ups closed / follow-ups created (3-loop window) | 0 / 12 = **0.00** | ≥ 0.4 over 10 loops | **Below target, trajectory worsening** |
| Density trigger fires in window | **3** (iter 009, 010, 011) | policy response each time | **0 responses delivered** |
| Loops since last follow-up burn-down | **3** (4 if you count the pre-MR-001 tail) | ≤ 5 (1-in-5 rule) | Will hit ceiling at iter 013 |
| Staleness-cap countdown | None visible | policy requires escalation at 10 loops | **No countdown field exists in backlog entries** |

### Root cause (why this is happening)

Three compounding factors:

1. **Large-scope loops spawn many follow-ups.** Iter 010 (session durability, multi-layer change) and iter 011 (4-impl convergence, 714-line design doc) are objectively high-complexity loops. Each naturally surfaces multiple adjacent items. The density trigger was designed precisely for this kind of loop, but because the trigger's required response is qualitative ("re-scope OR invoke root-cause-analyst"), the coordinator has been able to ignore it without a visible policy violation.
2. **`directed` selection rule bypasses the burn-down rotation.** Mode 5 explicitly names items, and in this window the user named blocker items. The burn-down rotation is only checked when the coordinator picks autonomously. Three consecutive non-autonomous-or-blocker-forced selections bypass the rotation entirely.
3. **No staleness-cap countdown surfaces in the backlog.** CLAUDE.md § Follow-Up Debt Policy specifies a 10-loop staleness cap ("escalated to the next meta-review for explicit keep/downgrade/delete triage"), but IMPROVEMENT_BACKLOG.md entries for #18–#25 do not record their birth iteration in a machine-greppable way (only in the "Status" column as narrative text, e.g. "new (iter 010 follow-up)"). If the coordinator never explicitly computes `current_iter − birth_iter >= 10` per item, items age silently.

### Recommended actions (see §7 for full diffs)

- **Mechanize the density trigger** (a hook or coordinator pre-flight check that fails a loop's artifact update if `follow_ups_generated >= 3` AND no `root-cause-analyst` invocation is logged AND no re-scope note is present).
- **Force iter 012 to be a follow-up burn-down loop** regardless of top-score, and consider iter 013 too. The 1-in-5 rule alone is too slow given the current density.
- **Add a `birth_iter` field** to every follow-up entry in IMPROVEMENT_BACKLOG.md so staleness-cap computation is mechanical.

---

## Ratio metrics over the 3-loop window

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Release-blocker closure rate | **3 / 3 = 1.00** | All-time high. **Not sustainable** — reflects one-time "clear the carried-debt" effect. Expect 0/5 or 0/3 rates for post-blocker phase until Phase 2 surfaces new ones. |
| Agent diversity (distinct primary per loop) | **3 / 3 = 1.00** | Strongly healthy. MR-001's delegation rubric goal achieved. |
| Rolling 5-loop window distinct implementers | **4** (backend, qa, devops, architect) | Exceeds MR-001 target of ≥ 3. |
| Test growth | 1512 → 1593 = **+81 (+5.4%)** | Healthy. Weighted heavily toward segmentation convergence fixtures (24 live + 24 batch = 48 of the 81 are byte-identity assertions, not behavioral tests). |
| Vitest file growth | 41 → 45 = **+4 files** | Proportional to test count. |
| Playwright E2E growth | 0 → 4 tests (first-ever) | Threshold crossed; infrastructure established; iter-013 follow-up will extend to real-extension harness. |
| Scope-expansion events | **1** (iter 011 bundle-builder inclusion) | Justified, documented, contained. |
| Scope violations | **0** | Clean per guardrail audit. |
| Follow-up closure ratio | **0 / 12 = 0.00** | Below policy target 0.4. Priority finding. |
| Density-trigger violations | **3** (iter 009, 010, 011) | Priority finding. |

### Commentary on test-growth attribution

The +81 test delta is impressive-looking but skewed by iter 011's convergence harness. Breaking it down:

- Iter 009: +3 (Playwright E2E)
- Iter 010: +18 (session-store unit tests +16, integration +2, Playwright +1; internal reshape netting less than +18)
- Iter 011: +79 net (24 convergence-live + 24 convergence-batch + 14 adapter + 17 across existing suites)

Of iter 011's +79, **48 tests are byte-identity assertions on 12 golden fixtures × 2 contracts × 2 assertions**. These are high-value regression locks (they catch any semantic drift between the three segmentation pathways), but they are structurally similar tests, not independent behavioral coverage. True "new coverage surface area" from iter 011 is closer to +31 than +79.

This is not a criticism of iter 011's strategy — byte-identity regression gates are exactly the right tool for a convergence refactor. It is a caution against using raw test-count growth as a health signal without reading the attribution.

---

## The next systemic risks (iter 012–016 horizon)

Now that MR-001's forcing functions (release-blocker bonus + blocker-cadence rule) are dormant, three new risks surface:

### Risk A — Phase-2 transition discipline slip

The release-blocker forcing function has been a strong gravitational pull keeping recent iterations on high-impact work. With blockers closed, there is no forcing function pulling iter 012–016 toward strategic items. The backlog shows candidates like "draft clearer product wedge / ICP narrative" (score 12) and "add dashboard-level artifact refresh process" (score 13) sitting near the top of the standard backlog, competing with follow-up pool items (scores 9–13). Without a gravity well, iteration selection may drift toward whatever has the highest raw score — which under the new formula is follow-up #22 (Invariant I1 cross-path assertion, score 13) and standard backlog #4 (artifact refresh, score 13). Both are reasonable; neither is a strategic bet. **Risk: the system enters a tidying phase disguised as a planning phase.**

Recommendation: once iter 012's follow-up burn-down completes, the coordinator should explicitly invoke `product-manager` or `system-architect` to propose a **Phase 2 entry artifact** (e.g. PHASE_2_PRD.md or PHASE_2_SCOPE.md) before iter 014. This establishes new release blockers (or explicit acknowledgement that there are none) and re-activates the blocker-cadence rule. Without this, the `release_blocker_bonus` term stays dormant indefinitely.

### Risk B — Meta-review fatigue / mis-fire

CLAUDE.md § Meta-Review Cadence lists early triggers including "0 release-blocker items selected in 5 loops." In the post-blocker phase, this trigger will fire **mechanically** after iter 016 regardless of system state, because there are no blockers left to select. This is a false positive — the system is healthy precisely because no blockers exist. If the coordinator honors it, MR-003 fires on a spurious signal, burning an iteration on meta-work when the system does not need it.

Recommendation: rewrite the trigger to be phase-aware. See §8.

### Risk C — Follow-up debt compounds through burn-down-only-when-forced behavior

Related to the Priority Finding in §4. If iter 012 burns down 1 item (the minimum under the 1-in-5 rule), the pool goes from 8 to 7 open. If iter 013 spawns 2 follow-ups (lower than iter 010/011's pattern, because it's a smaller loop like the real-extension launchPersistentContext harness), the pool goes from 7 to 9. **Net still growing.** The 1-in-5 rule alone is too slow to reduce a pool that grows by 2–4 per large loop.

Recommendation: modify the burn-down rule to be density-aware: "if the open follow-up pool exceeds 8 items, the next iteration MUST be burn-down regardless of selection rule." See §7 Change A.

---

## Recommended changes

Five MR-001 diffs were shipped. MR-002 proposes **three mandatory** changes (driven by policy violations surfaced in this analysis) and **two optional** changes (phase-transition preparations).

Format: name · problem · evidence · proposed diff · expected outcome (testable) · cost.

### Change A — Mechanize follow-up density trigger (MANDATORY)

**Problem**: CLAUDE.md § Follow-Up Debt Policy requires a specific response when a loop generates 3+ follow-ups. The coordinator ignored this trigger three consecutive times (iter 009, 010, 011).

**Evidence**: see §4 Priority Finding. Policy response delivered: **0 / 3 opportunities**.

**Proposed diff** — add to CLAUDE.md § Follow-Up Debt Policy (after current clause 3):

```markdown
4. **Density-trigger enforcement**: when a loop generates ≥3 follow-ups, the coordinator MUST log one of the following under the iteration's "Governance / Selection Signals" block:
   - `density-response: re-scoped to N loops` (with the follow-up sequence), OR
   - `density-response: root-cause-analyst invoked` (with the agent's verdict referenced), OR
   - `density-response: acknowledged, carried forward` (with explicit coordinator rationale for why neither re-scope nor RCA is appropriate — this is the escape hatch, but it must be written down).

   If none of these lines appears in an iteration whose Follow-Ups block contains ≥3 items, the iteration is considered policy-non-compliant and the next meta-review MUST open with density-trigger remediation.
```

**Expected outcome (testable)**: over iter 012–016, every iteration that generates ≥3 follow-ups must contain one of the three `density-response:` lines. A grep for `density-response:` in ITERATION_LOG.md should return N rows equal to the count of ≥3-follow-up loops. Zero false negatives.

**Cost**: ~10 lines in CLAUDE.md. No code change.

### Change B — Add birth-iter and staleness-countdown to follow-up entries (MANDATORY)

**Problem**: Staleness cap (10-loop escape clause) in CLAUDE.md § Follow-Up Debt Policy is unenforceable today because follow-up entries in IMPROVEMENT_BACKLOG.md record birth iteration only in narrative status text (e.g. "new (iter 010 follow-up)"), not in a field that can be mechanically compared against the current iteration number.

**Evidence**: IMPROVEMENT_BACKLOG.md lines 82–93 show items #14, #15, #18–25. None have an explicit `Birth: iter N` or `Loops open: K` field. Staleness has never been escalated.

**Proposed diff** — amend the backlog table schema. Add a new column `Loops open` to the follow-up-origin items (#7, #14, #15, #18–#25), and a column `Staleness` that computes current-iter minus birth-iter. Example:

```markdown
| # | Title | Type | Area | I | A | L | C | E | R | Score | Birth iter | Loops open | Status |
|---|-------|------|------|---|---|---|---|---|---|-------|-----------|-----------|--------|
| 18 | Surface `meta.persistenceTruncated` flag in review UI | improvement | UX resilience | 3 | 4 | 2 | 4 | 1 | 1 | 11 | 010 | 1 | open |
```

Rule addition to CLAUDE.md § Follow-Up Debt Policy:

```markdown
5. **Birth-iter field required**: every follow-up entry in IMPROVEMENT_BACKLOG.md MUST include a `Birth iter` column value. The staleness-cap rule (clause 2) is computed mechanically as `current_iter − birth_iter >= 10`. Any follow-up meeting this threshold is added to the next meta-review's mandatory triage list.
```

**Expected outcome (testable)**: any meta-review after MR-002 can auto-flag stale follow-ups by sorting IMPROVEMENT_BACKLOG.md by `Loops open` descending and taking entries where `Loops open >= 10`. Today this produces zero (iter 007/008 follow-ups #14, #15, #7 have Loops open of 4, 5, 4 respectively — all below threshold).

**Cost**: ~8 lines in CLAUDE.md; schema change across 11 backlog entries (one-time bulk edit).

### Change C — Force iter 012 to be a follow-up burn-down loop (MANDATORY)

**Problem**: the 1-in-5 burn-down rule alone cannot keep pace with the current generation rate (4-per-large-loop). Iter 012 is due for burn-down under the 1-in-5 rule anyway (3 non-burn-down loops since last), but the rule provides no signal about *how much* burn-down. With 8 open items, burning one is a 12.5% reduction — insufficient.

**Evidence**: see §4 Priority Finding and §6 Risk C.

**Proposed diff** — operational instruction to the coordinator (not a CLAUDE.md rule change, because it is a one-time action, not a durable policy):

> Iter 012 MUST select from the follow-up pool. If the selected follow-up is low-cost (score-for-cost ratio suggests <1 loop of effort), the coordinator SHOULD bundle 2–3 related follow-ups into the same loop *only if* they are all in the same Area and form one logical outcome (treat this as the mirror image of the iter-011 scope-expansion protocol: evidence-based, documented, contained). Example: #22 (Invariant I1 assertion) + #25 (full-pipeline golden fixture) both target invariant coverage in the same subsystem.

Additional durable rule (this one does go in CLAUDE.md § Follow-Up Debt Policy):

```markdown
6. **Pool-size density rule**: if the open follow-up pool exceeds 8 items at the start of an iteration, the NEXT iteration (regardless of `blocker-cadence` status or top-score) MUST be a burn-down loop. This is a ceiling rule — the 1-in-5 rule is the floor.
```

**Expected outcome (testable)**: iter 012's "Candidate Selection" block records selection rule `burn-down` (per CLAUDE.md § Selection Policy Step 3 vocabulary). After iter 012 completes, open pool size decreases by ≥1. After iter 013 (assuming normal selection), pool size trajectory is bounded above.

**Cost**: ~4 lines in CLAUDE.md + 1 coordinator instruction for iter 012.

### Change D — Scope-expansion protocol (OPTIONAL, evidence-supported)

**Problem**: iter 011 executed a justified scope expansion (bundle-builder inclusion). It worked. But the protocol by which the coordinator made that decision is unwritten — future coordinators (or this one in a different mood) could execute an unjustified scope expansion under the same cover.

**Evidence**: iter 011 scope-expansion decision documented in ITERATION_LOG.md lines 720, in design doc §0/§3.4, and in CHANGELOG. **Three documents, one decision, no shared template.** This is tolerable for one event; it's a latent risk for the third or fourth event.

**Proposed diff** — add to CLAUDE.md § Operating Modes § Mode 5 guardrails (new clause 7):

```markdown
7. **Scope-expansion protocol**: if the implementer surfaces evidence that the named item alone cannot close the target outcome, the coordinator MAY approve scope expansion only if ALL of:
   a. the expansion is evidence-based (not speculative) — cited to a specific agent's current-state audit or architect design doc;
   b. it stays within one logical outcome (expansion must still be describable as one sentence);
   c. it stays within the same Area field (so saturation tracking remains coherent);
   d. the scope-expansion decision is logged in the iteration's "Candidate Selection" block as `scope-expansion: approved; evidence: [link]`;
   e. the expansion does not touch surfaces of prior iterations that were explicitly out-of-scope (e.g. iter-010 session durability for iter-011 convergence — verified via git log --follow).

   If any of a–e is absent, expansion must be deferred to the next iteration as a standalone item.
```

**Expected outcome (testable)**: in future Mode 5 loops, any scope expansion produces one `scope-expansion: approved` log line per expansion, with citation. Zero un-cited expansions.

**Cost**: ~15 lines in CLAUDE.md. No code.

### Change E — Add "autonomous-vs-directed ratio" health metric (OPTIONAL, light touch)

**Problem**: two of three loops in this window were `directed`. If this persists, the refined scoring formula is never exercised autonomously, and the coordinator's autonomous-selection muscle atrophies.

**Evidence**: see §3 "Mode 5 efficacy review — coordinator-deferral bias risk" and §5 metric table.

**Proposed diff** — add one row to the SYSTEM_HEALTH.md scorecard:

```markdown
| Autonomous-selection ratio (rolling 5-loop window) | moderate | 3 | 3 of last 5 loops were directed (iter 010, 011) or cadence-forced (iter 009); 0 were pure top-score. Target: ≥ 2 of 5 as pure top-score once release blockers are cleared, to exercise the refined formula. |
```

No policy change. Just visibility so the ratio is tracked and can drive future meta-review triggers.

**Expected outcome (testable)**: the metric becomes grep-able. If, over iter 012–016, the ratio stays below 2/5 pure top-score, MR-003 opens with a scoring-formula-efficacy question. If it reaches 2/5 or 3/5, the formula is being exercised as designed.

**Cost**: ~3 lines in SYSTEM_HEALTH.md.

---

## Meta-review cadence adjustment

### Current state of the cadence rules (CLAUDE.md § Meta-Review Cadence)

Base: every 3 loops. Early triggers:
1. 3+ consecutive iterations in the same `Area` field
2. 0 release-blocker items selected in 5 loops
3. Same implementing agent used for 4+ consecutive loops
4. Follow-up accumulation > 10 open items
5. 2+ iterations fail validation in a row
6. A named release blocker has survived 8+ loops

### Per-trigger phase-awareness assessment

| Trigger | Phase-1 utility | Post-blocker utility | Recommendation |
|---------|-----------------|----------------------|----------------|
| 1. Same Area × 3 | valid | valid | keep |
| 2. 0 blockers in 5 loops | valid forcing signal | **mis-fires** (will always fire by iter 017) | **Rewrite to be phase-aware** |
| 3. Same agent × 4 | valid | valid | keep |
| 4. Follow-ups > 10 | valid | **actively needed now** (pool at 8 and rising) | keep; relates to §7 Change C |
| 5. 2 validation fails in a row | valid | valid | keep |
| 6. Named blocker > 8 loops | valid | dormant (no blockers) | keep (re-activates in Phase 2) |

### Trigger #2 rewrite proposal

**Old**:
```markdown
- 0 release-blocker items selected in 5 loops
```

**New**:
```markdown
- 0 release-blocker items selected in 5 loops AND at least 1 open blocker exists in SYSTEM_HEALTH.md
```

This ensures the trigger fires when blockers exist but are being ignored (the Phase-1 failure mode), and NOT when no blockers exist (the post-Phase-1 healthy state).

**Cost**: 6 words added to CLAUDE.md.

### Base-cadence recommendation

Do NOT extend the 3-loop base cadence. Reasoning:
- The follow-up pool is growing faster than the cadence can catch; shortening the cadence would help but adds meta-overhead. Extending would hide the drift.
- 3 loops is close to the measurement-validity floor (MR-001 said "changing multiple control variables more often than that makes effectiveness measurement impossible"). Shortening to 2 would violate that rule.
- Keep base = 3 loops. Rely on early triggers (especially #4 follow-ups >10) to catch drift.

### Mandatory meta-review timing

The 3-loop base cadence means **MR-003 is due after iter 014** (assuming normal loops — iter 012 + iter 013 + iter 014 = 3 since MR-002). However, if iter 012 fires under `burn-down` and iter 013 fires under `burn-down` (per Change C), and iter 014 is also burn-down (if pool still >8), that is **3 consecutive same-area-ish loops** depending on which follow-ups get burned down. This could trip early-trigger #1 prematurely. Monitor; consider noting in SYSTEM_HEALTH.md that "follow-up burn-down" is a valid cross-Area selection mode not subject to Area saturation concerns.

---

## Metrics to track forward

| Metric | Current | Target (iter 012–016) | Rationale |
|--------|---------|-----------------------|-----------|
| Release-blocker closure rate (5-loop window) | 3/3 | tracks Phase-2 blocker emergence | one-time effect; expect 0 until Phase 2 |
| Agent diversity (5-loop distinct implementers) | 4 | ≥ 3 | hold the MR-001 gain |
| Follow-up closure ratio (10-loop window) | 0/12 | ≥ 0.4 | policy target |
| Follow-up density trigger responses | 0 / 3 opportunities | 3 / 3 (post Change A) | policy compliance |
| Open follow-up pool size | 8 (formally tracked) | ≤ 6 by iter 014 | arrest the accumulation |
| Autonomous-selection ratio (5-loop) | 0–1 / 5 (iter 009 only) | ≥ 2 / 5 | exercise the formula |
| Scope-expansion events with protocol compliance | 1 / 1 (iter 011, informal) | all cited per Change D | protect against drift |

---

## Concrete changes summary (for coordinator to apply)

| # | Change | File(s) | Mandatory? | Diff size |
|---|--------|---------|------------|-----------|
| A | Density-trigger enforcement (density-response log line) | CLAUDE.md | MANDATORY | ~10 lines |
| B | Birth-iter + staleness countdown on follow-ups | CLAUDE.md + IMPROVEMENT_BACKLOG.md | MANDATORY | ~8 lines CLAUDE.md + schema edit on 11 backlog rows |
| C | Pool-size density ceiling rule (force burn-down when pool > 8) | CLAUDE.md | MANDATORY | ~4 lines |
| D | Scope-expansion protocol | CLAUDE.md | OPTIONAL | ~15 lines |
| E | Autonomous-vs-directed ratio health metric | SYSTEM_HEALTH.md | OPTIONAL | ~3 lines |
| F | Phase-aware rewrite of "0 blockers in 5 loops" early trigger | CLAUDE.md | MANDATORY (prevent mis-fire) | 6 words |

Total mandatory CLAUDE.md diff: ~28 lines. Total optional: ~18 additional lines. IMPROVEMENT_BACKLOG.md schema addition: one-time bulk edit.

### One-time iter 012 operational directive

Iter 012 MUST select from the follow-up pool. Candidates (ranked by current score):

1. **#22** Invariant I1 cross-path assertion (score 13) — pure test add, zero risk, closes design-doc debt from iter 011
2. **#4 standard backlog** Artifact/system-health refresh process (score 13) — not strictly a follow-up but a governance enabler that supports Changes A, B, E
3. **#25** Full-pipeline golden fixture (score 11) — invariant coverage; pairs naturally with #22

Recommended pairing for iter 012 under the scope-expansion protocol (§7 Change D): **#22 + #25** (same Area: invariants / testing; same logical outcome: "extend invariant coverage to cross-path and full-pipeline cases"). Both are test-only, both pure-additive, both zero-risk. This burns down 2 of 8 open follow-ups in one loop. If the coordinator prefers to stay strict 1-item, #22 alone is the top recommendation.

---

## What is working (carry forward)

- The refined scoring formula discriminated correctly on its one test case (iter 009).
- The saturation penalty cleared the SOP saturation without collateral damage.
- The Delegation Decision Rubric produced three distinct primary agents across three loops.
- Mode 5 executed cleanly on its first real sequence — all 6 guardrails respected, one justified scope expansion well-documented.
- Release-blocker closure went from 0 / 5 (pre-MR-001) to 3 / 3 in the MR-001 window. All Phase-1 blockers resolved.
- Agent orchestration rotated through system-architect for the first time in project history.
- Validation discipline held: zero failed validations across iter 009–011; all typecheck and test gates green pre-commit.

## What is not working (address in this MR)

- **Follow-up density trigger ignored three consecutive times.** Change A is the remediation.
- **Follow-up pool grew from ~6 to 8+ with zero closures.** Changes B + C are the remediation.
- **Early-trigger "0 blockers in 5 loops" will mis-fire in post-blocker phase.** Change F is the remediation.
- **Autonomous scoring formula exercised only once in 3 loops.** Change E provides visibility; no policy enforcement needed yet.
- **Scope-expansion decision was correct but un-protocolized.** Change D codifies the protocol before it is abused.

## Pattern analysis

- **Recurring success pattern**: when the coordinator delegates to a specialist agent early in a high-complexity loop (architect in iter 011, qa in iter 009), the loop produces durable design artifacts alongside the code — design docs, regression harnesses, convergence maps. These compound across future loops.
- **Recurring friction pattern**: the coordinator treats qualitative policy clauses ("invoke root-cause-analyst" in density trigger; "re-scope or RCA") as advisory rather than enforced. Mechanization (hooks, required log lines) is the only reliable fix.
- **Recurring blocker pattern**: NONE in this window — all three blockers closed. But the *follow-up* pool is now the analog of what release-blockers were in MR-001's window: a growing pile of items the system keeps deferring. The pattern may migrate from one pool to another.

---

## Escape conditions

Do not run MR-003 prematurely. Base cadence is 3 loops. Expected MR-003 trigger: after iter 014 (iter 012 + iter 013 + iter 014 = 3 since MR-002), unless an early trigger fires. Early-trigger candidates most likely to fire before iter 014: (4) follow-up pool > 10 — currently at 8, so one more large loop generating 3+ items crosses the threshold. If Change C is adopted, this should NOT happen, because iter 012 will be a forced burn-down reducing the pool below 8.

Apply Changes A, B, C, F mandatorily. Apply D and E if time permits. Do not change multiple control variables more often than every 3 loops.

---

## Appendix A — Raw change inventory (for the coordinator to apply)

Files to edit when applying this review:

1. `C:\Users\philk\ledgerium\CLAUDE.md` — Changes A, B, C, D (optional), F (§ Follow-Up Debt Policy new clauses 4, 5, 6; § Operating Modes Mode 5 guardrail 7; § Meta-Review Cadence trigger #2 rewrite)
2. `C:\Users\philk\ledgerium\IMPROVEMENT_BACKLOG.md` — Change B schema edit: add `Birth iter` column; populate for follow-up rows (#7 → 008; #14 → 007; #15 → 006; #18–#21 → 010; #22–#25 → 011); consider `Loops open` computed column
3. `C:\Users\philk\ledgerium\SYSTEM_HEALTH.md` — Change E: add autonomous-selection-ratio row to the scorecard; update Meta-Review Status block to reference MR-002
4. `C:\Users\philk\ledgerium\.claude\agents\coordinator.md` — no change required (Delegation Decision Rubric continues as-is; density-trigger response logging is covered by CLAUDE.md Change A)

Files NOT to edit (per meta-review stop condition):
- No product code changes.
- No test changes.
- No package changes.

---

## Appendix B — Open follow-up pool as of MR-002 close

| # | Title | Area | Birth iter | Loops open | Score | Recommended disposition |
|---|-------|------|-----------|-----------|-------|-------------------------|
| 7 | Widen policy-engine credit_card regex | policy coverage | 008 | 4 | 11 | hold; small but not urgent |
| 14 | Wire validateRenderedSOP into pipeline | SOP quality gate | 007 | 5 | 11 | hold; dev-throws decision still pending |
| 15 | Extract confidence thresholds | code hygiene | 006 | 6 | 10 | hold; approaching staleness mid-zone |
| 18 | Surface persistenceTruncated in review UI | UX resilience | 010 | 1 | 11 | eligible for iter 012 burn-down |
| 19 | GC stale session_events keys | session durability | 010 | 1 | 11 | eligible for iter 012 burn-down |
| 20 | loadFromStorage cross-validation | session durability | 010 | 1 | 10 | eligible; lower priority |
| 21 | Real-extension launchPersistentContext E2E | quality assurance | 010 | 1 | 9 | defer to iter 013 (named in iter-010 log) |
| 22 | Invariant I1 cross-path assertion | invariants / testing | 011 | 0 | 13 | **top candidate for iter 012** |
| 23 | SEGMENTATION_RULE_VERSION doc drift | docs / invariants | 011 | 0 | 9 | low-cost cleanup; pair with #22? |
| 24 | LiveStep type tightening | type safety | 011 | 0 | 10 | defer |
| 25 | Full-pipeline golden fixture | invariants / testing | 011 | 0 | 11 | **pair with #22** (same Area, same outcome) |

Staleness watch: #15 is at 6 loops open. Per policy, it will require MR-003 triage at 10 loops (approximately iter 016). Earliest burn-down pairing: #15 could be grouped with any SOP-area follow-up loop if saturation allows.

---

Ready for coordinator to apply diffs: **yes — Changes A, B, C, F are mandatory and well-evidenced; Changes D and E are optional but low-cost; no control-variable cluster-change risk because the changes target different policy clauses and different failure modes rather than competing tuning knobs.**
