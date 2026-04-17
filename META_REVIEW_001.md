# Meta-Review 001 — Iterations 004–008

Date: 2026-04-17
Triggered by: overdue meta-review (5 loops since last, threshold 3)
Scope: iterations 004–008 + the user-directed 006/007/008 batch pattern

---

## Executive Summary

The improvement loop is **executing cleanly but selecting narrowly**. Iterations 004–008 shipped a cohesive, high-quality SOP trust-signal trifecta (iter 004/005/006) followed by a quality gate (iter 007) and a deferred capture-pipeline fix (iter 008) — all additive, all reversible, all passing validation on the first run. The product is measurably better on customer-visible SOP output. **But the system has not moved the Phase 1 release-blocker needle in five loops.** Session recovery, E2E tests, and LiveStepBuilder duplication — the three items SYSTEM_HEALTH.md has named as release blockers since iter 000 — remain open, and the current scoring formula structurally deprioritizes them (high effort + high risk mathematically losing to low-effort additive SOP work). Secondarily, the coordinator is using `backend-engineer` for 100% of implementation despite 15+ specialist agents being available. **Headline recommendation: introduce a release-blocker multiplier (`×1.5` when an item is on the SYSTEM_HEALTH blocker list) and a 1-in-5 forced-rotation rule so at least one blocker-adjacent iteration lands per 5-loop window.**

System state: **Drifting** (not in crisis, but compounding narrow wins while release-blocking debt stays static).

---

## Scoring formula diagnosis (Question A)

**Current formula:** `impact + alignment + learning + confidence − effort − risk`
**Range observed:** 10–16 (iter 001 = 16, iters 004–008 = 13, 14, 15, 13, 13)

### Evidence of dominance and compression

Looking at the 5 iterations' scorecards verbatim from `ITERATION_LOG.md`:

| Iter | Impact | Align | Learn | Conf | Effort | Risk | Score |
|------|--------|-------|-------|------|--------|------|-------|
| 004  | 5      | 5     | 3     | 5    | 2      | 1    | 15    |
| 005  | 5      | 5     | 3     | 5    | 2      | 1    | 15    |
| 006  | 4      | 5     | 2     | 5    | 2      | 1    | 14    |
| 007  | 4      | 5     | 4     | 4    | 2      | 2    | 13    |
| 008  | 4      | 5     | 3     | 5    | 2      | 2    | 13    |

Compare with release blockers sitting in the backlog:

| Backlog item               | Impact | Align | Learn | Conf | Effort | Risk | Score |
|----------------------------|--------|-------|-------|------|--------|------|-------|
| Session event persistence  | 5      | 5     | 4     | 4    | 4      | 3    | 11    |
| E2E Playwright tests       | 4      | 5     | 4     | 4    | 3      | 2    | 12    |
| Invariant regression suite | 4      | 5     | 4     | 4    | 3      | 2    | 12    |

**Three observations with evidence:**

1. **Alignment is saturated at 5 for every iteration since iter 003.** Everything "aligns with Phase 1" because Phase 1 is defined broadly. Alignment has zero discriminating power — it is effectively a constant.
2. **Confidence is near-saturated at 5 for low-risk additive work.** Any "add an optional field + render it" task scores 5. Any unfamiliar/risky refactor gets 3–4. This creates a structural bias toward additive polish.
3. **Effort and risk are under-resolved.** A 1-point effort delta (2 vs 3) offsets a 1-point impact or confidence point. This makes any medium-effort work uncompetitive with small additive work even when its strategic value is far higher. Session recovery (impact 5) loses to SOP glyph (impact 4) purely because effort is 4 vs 2.

### ROI analysis (impact-per-effort proxy)

| Iter | Impact/Effort | Test delta | Release-blocker movement |
|------|---------------|------------|--------------------------|
| 004  | 2.5           | +26        | none                     |
| 005  | 2.5           | +17        | none                     |
| 006  | 2.0           | +25        | none                     |
| 007  | 2.0           | +31        | none                     |
| 008  | 2.0           | +20        | closed 1 secondary item (capture-pipeline dedup, not on blocker list) |

Best ROI: iters 004/005 (2.5 impact/effort, visible customer quality lift). Worst leverage: iter 006 — it shipped the third SOP trust signal, but the backlog already contained higher-impact release blockers that were not considered because the formula scored them lower.

### Recommendation: **modify the formula** (do not replace)

**New formula:**
```text
priority_score =
  impact
  + alignment
  + learning
  + confidence
  − effort
  − risk
  + release_blocker_bonus
  − saturation_penalty
```

Where:
- `release_blocker_bonus = +3` if the item is listed in `SYSTEM_HEALTH.md` Release Blockers section, else 0
- `saturation_penalty = +2 penalty (i.e. subtract 2)` if 3 of the last 5 iterations landed in the same `Area` field (currently "SOP presentation" accounts for 3 of 5)
- `effort` is now double-weighted if `effort >= 4` (i.e. subtract `2*effort` when effort >= 4) — **rejected, too punishing**; keep as-is but rely on blocker bonus to rescue high-effort strategic work

**Testable metric:** after 5 more iterations, at least 2 should be release-blocker items. If 0 out of 5, the formula still isn't working and we escalate to forced rotation.

---

## Release-blocker vs. polish tension (Question B)

### Quantification

Over iterations 004–008:
- Total test delta: +119 (+26, +17, +25, +31, +20)
- Share from SOP-presentation iterations (004/005/006): 68/119 = **57%** (note: spec said 88%, actual is 57%; the spec figure appears to aggregate differently)
- Files modified in SOP-presentation iterations: 14 of 21 modified files across the 5 loops = **67%**
- Release blockers closed: **0 of 3** (session recovery, E2E tests, LiveStepBuilder duplication all still listed in SYSTEM_HEALTH.md line 94–96)
- Release blockers resolved in-scope: 1 non-blocker item — "shared capture-policy enforcement" (iter 008) was a Known Issue but not a named release blocker in SYSTEM_HEALTH.md

**Verdict: the system drifted sideways into polish.** Customer-visible SOP quality improved measurably, which is real value — but Phase 1 release readiness (SYSTEM_HEALTH.md line 33: "moderate 3") did not move. Test count is not the right metric here — release-blocker count is. 3/3 blockers remain.

### Why it happened (root cause)

Every time the coordinator selected the top-scored item, it picked the smallest, safest, most-additive work because the formula rewards that. The backlog was never "broken" — but the selection policy was blind to portfolio mix and release criticality.

### Recommendation

1. **Add release-blocker bonus** to scoring formula (see Question A).
2. **Add explicit SOP-saturation check** to the coordinator pre-selection step: if the last 3 iterations all land in the same `Area` field, the next iteration MUST select from a different area.
3. **Add "release-blocker minimum cadence" rule**: at least 1 of every 5 iterations must address a current release blocker (as listed in SYSTEM_HEALTH.md). If none was selected in the last 4, the 5th is forced to select from that list.
4. **Reject the "just pick top score" rule as sole selection policy.** Top score becomes one input; portfolio balance and release criticality are co-equal inputs.

---

## User-directed batch execution mode (Question C)

### Evidence

Iterations 006, 007, 008 were executed as a single user-directed sequence ("complete these 3 items"). The coordinator correctly preserved:
- One commit per iteration (`f219ac1`, `6eda034`, `796d132`)
- Independent validation run per iteration (process-engine typecheck + monorepo typecheck + monorepo test at each step)
- Independent artifact update per iteration (ITERATION_LOG, IMPROVEMENT_BACKLOG, SYSTEM_HEALTH, CHANGELOG all updated three times)
- One-item-per-loop rule (confirmed by the scope-discipline notes in iter 007 — "`processSession.ts` integration explicitly deferred" — and iter 008 — "refactored ONLY `target-inspector.ts`")

This is a valid, well-executed variant of the standard loop. It does NOT violate the one-item-per-loop rule, but it DOES bypass the usual meta-review cadence check (three loops executed before the meta-review that should have preceded loop 006).

### Recommendation: **formalize it as Mode 5: Directed Sequence**

Add to CLAUDE.md:

```markdown
## Operating Modes

- **Mode 1: Standard bounded loop** — coordinator selects highest-priority item, executes one iteration, updates artifacts.
- **Mode 2: Targeted fix** — user names a specific item; coordinator validates scope and executes as a single iteration.
- **Mode 3: Debugging** — bug-fix work that does not count toward improvement-loop cadence (e.g., commit 6fe0795 SOP export bug).
- **Mode 4: Meta-review** — coordinator invokes the meta-coordinator agent; no product code changes.
- **Mode 5: Directed sequence** — user names 2+ specific items to execute sequentially.

### Mode 5 guardrails
1. Each item executes as its own independent iteration (own commit, own validation, own artifact updates).
2. One-item-per-loop rule is preserved: no cross-item refactors; no sneaked-in follow-ups.
3. Scope discipline must be explicitly stated in each iteration's "Candidate Selection" block.
4. If the sequence contains 3+ items, a meta-review is MANDATORY before the next non-directed loop.
5. Meta-review cadence counter increments by N (one per item), not by 1 (one per batch).
6. If the selected items are all in the same `Area` field, the coordinator must flag the saturation risk to the user before beginning.
```

**Testable metric:** if the user requests a 4-item sequence, does the coordinator flag saturation and trigger meta-review before item 5? That behavior proves Mode 5 is installed.

---

## Agent orchestration under-utilization (Question D)

### Evidence

`backend-engineer` executed implementation in 100% of iters 004–008 (confirmed by every iteration's "Agents Used" block). Other specialists never ran during implementation. Supporting agents (sop-expert, Explore) appeared in planning-only roles.

### Where other agents should have been invoked

1. **Iter 006 (circular import smell surfaced)** — should have called `system-architect` either at design time (to prevent the circular) or in response (to propose the extraction). Instead the coordinator noted it as a follow-up and moved on. This is how debt accumulates.
2. **Iter 007 (sopValidator test design)** — writing 31 tests for a 6-rule quality gate is exactly `qa-engineer` territory. `backend-engineer` did it, which worked, but a `qa-engineer` would have also proposed property-based tests for the banned-string scanner and equivalence-class coverage for the rule-ordering contract.
3. **Iter 007 (dev-throws/prod-logs wiring decision)** — this is a `devops-engineer` / `system-architect` call, not `backend-engineer`. It was deferred as a follow-up, which is actually the correct call given one-item-per-loop, but the decision of where/how to wire should be pre-designed by the right role before the wiring iteration.
4. **Iter 008 (policy-engine regex gap surfaced)** — `security-engineer` should be consulted when sensitivity classification changes. Narrow regression ("Credit card number" with spaces no longer caught) is a security-relevant decision, not a performance decision.
5. **Strategic backlog items** (Playwright E2E, session recovery) — these have been in the backlog for 5 loops untouched. `qa-engineer` / `system-architect` should have been asked "why aren't we picking these up?" after loop 3. They never were.

### Delegation-decision rubric for the coordinator

Add to `.claude/agents/coordinator.md`:

```markdown
## Delegation Decision Rubric

Before defaulting to backend-engineer, check these triggers:

| Signal | Delegate to |
|--------|-------------|
| Design smell in prior iteration (circular import, duplicate logic, leaky abstraction) | system-architect |
| New validation / quality-gate work, or test count delta > 20 expected | qa-engineer |
| Infrastructure wiring, pipeline integration, build/CI configuration | devops-engineer |
| Input-validation changes, sensitivity/auth logic, regex or policy changes | security-engineer |
| Observability, logging, tracing, metrics instrumentation | backend-engineer + analytics |
| Customer-visible copy, positioning, UX flow changes | growth-strategist + product-manager |
| UI component work in web-app | frontend-engineer |
| Schema or migration changes | database-engineer (or system-architect if absent) |
| Experiment design (A/B, baseline-vs-new) | experiment-designer |
| Root cause of repeated issue | root-cause-analyst |

Default: backend-engineer for pure code logic changes with no secondary signal.

Rule: if 3 consecutive iterations used the same implementing agent, the 4th must use a different one OR the coordinator must explicitly justify the repetition in the iteration log.
```

**Testable metric:** after 5 more iterations, count the distinct implementing agents. If still 1/1, the rubric was ignored; if 3+/5, it's working.

---

## Follow-up debt burndown policy (Question E)

### Evidence — accumulated follow-ups across iters 004–008

| Source iter | Follow-up item                                    | Backlog score | Status |
|-------------|---------------------------------------------------|---------------|--------|
| 006         | Extract confidence thresholds (circular import)   | 10            | open   |
| 007         | Wire validateRenderedSOP into processSession.ts   | 11            | open   |
| 007         | Fix IMPLEMENTATION_NOTES.md Gap #8 doc sync       | unscored      | open   |
| 008         | Widen policy-engine `/credit\s*card/i` regex      | 11            | open   |
| 008         | Extension content layer untested modules          | unscored      | open   |
| 005         | Adjacent SOP fields (durationLabel, risks, etc.)  | unscored      | open   |

**Rate:** 1.0–1.4 follow-ups per iteration. Burn-down rate: 0 per iteration (none of these have been selected in a later loop).

**Net accumulation: +5 to +7 items over 5 loops with zero burn-down.** This is unsustainable. At this rate, by iter 020 the backlog has ~15 stale follow-ups, most of them low-cost-but-never-urgent.

### Recommendation: **1-in-5 burn-down rule**

Add to CLAUDE.md:

```markdown
## Follow-Up Debt Policy

Every iteration may generate follow-up backlog items. To prevent unbounded accumulation:

1. **Burn-down cadence:** at least 1 of every 5 iterations must select its target from the follow-up pool (items tagged "follow-up (iter N)" in IMPROVEMENT_BACKLOG.md).
2. **Staleness cap:** any follow-up item not addressed within 10 iterations of its creation is escalated to the next meta-review for explicit "keep / downgrade / delete" triage. No item sits ignored forever.
3. **Follow-up density trigger:** if a single iteration generates 3+ follow-ups, the coordinator must either (a) re-scope the iteration into multiple loops, or (b) run a root-cause review on why one loop is spawning that much residual work.
```

**Testable metric:** over the next 10 iterations, count (follow-ups closed / follow-ups created). Target ratio: ≥ 0.4 (i.e. at least 4 follow-ups closed per 10 iterations). Current: 0/6.

---

## Recommended iter 009 selection (Question F)

### Applying the refined logic

Candidates with the new formula (applying release-blocker bonus +3 and saturation penalty −2 where SOP-presentation Area has saturated):

| Item                                                                    | Old score | Blocker bonus | Saturation penalty | **New score** |
|-------------------------------------------------------------------------|-----------|---------------|--------------------|----|
| Add Playwright E2E tests for recording lifecycle                        | 12        | +3            | 0                  | **15** |
| Persist full session event stream                                       | 11        | +3            | 0                  | **14** |
| Wire validateRenderedSOP into processSession.ts                         | 11        | 0             | −2 (SOP area)      | **9**  |
| Widen policy-engine credit_card regex                                   | 11        | 0             | 0                  | **11** |
| Add try/catch to 11 unguarded API routes                                | 11        | 0             | 0                  | **11** |
| Extract confidence thresholds (circular)                                | 10        | 0             | −2 (SOP area)      | **8**  |
| Add structured error logging                                            | 11        | 0             | 0                  | **11** |

### Selection: **Add Playwright E2E tests for recording lifecycle** (new score 15)

**Rationale:**
1. **Highest new score (15).** Release blocker since iter 000. Directly addresses SYSTEM_HEALTH.md line 74 ("Missing E2E coverage for the extension recording lifecycle") and line 95 ("E2E lifecycle testing missing").
2. **Breaks the SOP-presentation streak.** Next iteration must pivot out of the `SOP presentation / trust` area per the saturation rule.
3. **Unblocks multiple downstream items.** Session-recovery work (the next release blocker) is much harder to validate without E2E infrastructure. Playwright also gives the extension content layer its first real integration coverage (addresses iter 008's "untested modules" follow-up indirectly).
4. **Correct agent for the job:** `qa-engineer` (primary) + `devops-engineer` (CI wiring). First iteration in 6 loops that should NOT default to `backend-engineer`.
5. **Phase 1 release is the actual strategic goal.** We will not ship Phase 1 with no E2E tests. This has been true for 8 loops. Stop deferring.

**Scope discipline for iter 009:** install Playwright + write 1–3 lifecycle tests (record → stop → upload OR record → restart → recover). Do NOT try to cover every scenario. Target: green CI run with meaningful lifecycle assertions.

**Do not select:** the credit_card regex fix (11 points but tiny leverage), the circular-import extract (8 after saturation penalty, purely hygiene), or more SOP polish (blocked by saturation).

---

## Concrete changes to CLAUDE.md

### Diff 1 — Add Operating Modes section (new, insert after "Operating Model (Agentic Team)")

**Insert new section at line ~56, between "Operating Model" and "Standard Delivery Flow":**

```markdown
## Operating Modes

Each improvement-loop invocation runs in one of these modes:

- **Mode 1: Standard bounded loop** — coordinator selects highest-priority item, executes one iteration, updates artifacts.
- **Mode 2: Targeted fix** — user names a specific item; coordinator validates scope and executes as a single iteration.
- **Mode 3: Debugging** — bug-fix work that does not count toward improvement-loop cadence.
- **Mode 4: Meta-review** — coordinator invokes the meta-coordinator agent; no product code changes.
- **Mode 5: Directed sequence** — user names 2+ specific items to execute sequentially.

### Mode 5 guardrails
1. Each item executes as its own independent iteration (own commit, own validation, own artifact updates).
2. One-item-per-loop rule is preserved.
3. Scope discipline must be explicitly stated in each iteration's "Candidate Selection" block.
4. If the sequence contains 3+ items, a meta-review is MANDATORY before the next non-directed loop.
5. Meta-review cadence counter increments by N (items), not by 1 (batch).
6. If selected items are all in the same Area field, the coordinator must flag saturation risk to the user before beginning.
```

### Diff 2 — Replace the Scoring Formula block (currently in IMPROVEMENT_BACKLOG.md; add reference in CLAUDE.md)

**Add new section after "Quality & Scoring":**

```markdown
## Selection Policy

The bounded-loop selection policy is NOT just "pick the highest score". It is:

### Step 1 — Compute score
```text
priority_score =
    impact + alignment + learning + confidence
  − effort − risk
  + release_blocker_bonus      # +3 if item is in SYSTEM_HEALTH.md Release Blockers
  − saturation_penalty          # −2 if 3 of last 5 iterations landed in the same Area
```

### Step 2 — Apply portfolio rules (any of these OVERRIDES top-score)
1. **Release-blocker minimum cadence:** at least 1 of every 5 iterations must address a current release blocker. If none in the last 4, iteration 5 MUST select from the blocker list.
2. **Area saturation rule:** if the last 3 iterations all landed in the same Area, the next iteration MUST select from a different Area.
3. **Follow-up burn-down:** at least 1 of every 5 iterations must target a follow-up item generated by a prior loop.

### Step 3 — Document the choice
The iteration log's "Candidate Selection" block must explicitly state which rule (top-score, blocker cadence, saturation rule, or burn-down rule) drove the selection.
```

### Diff 3 — Add Follow-Up Debt Policy section (new)

**Insert after "Required Artifacts":**

```markdown
## Follow-Up Debt Policy

Every iteration may generate follow-up items. To prevent unbounded accumulation:

1. **Burn-down cadence:** at least 1 of every 5 iterations must select its target from the follow-up pool.
2. **Staleness cap:** any follow-up not addressed within 10 iterations of its creation is escalated to the next meta-review for explicit "keep / downgrade / delete" triage.
3. **Follow-up density trigger:** if a single iteration generates 3+ follow-ups, the coordinator must either re-scope into multiple loops or invoke root-cause-analyst.
```

### Diff 4 — Update "Current Phase" block

**Replace lines 267–276 of the current CLAUDE.md ("Current Phase" section):**

**OLD:**
```markdown
## Current Phase

Phase 1 in progress.

Priorities:
- remove duplicated logic
- integrate policy engine
- add E2E tests
- implement session recovery
- add structured logging
```

**NEW:**
```markdown
## Current Phase

Phase 1 in progress.

Priorities (ordered by release-blocker status):
- **[BLOCKER]** add Playwright E2E tests for recording lifecycle
- **[BLOCKER]** implement full session event persistence for service worker restart recovery
- **[BLOCKER]** converge LiveStepBuilder with StreamingSegmenter (last remaining duplication)
- add structured error logging with session context
- extract confidence thresholds (remove circular import)
- widen policy-engine credit_card regex to accept whitespace

Resolved (do not re-list):
- ✅ remove duplicated background logic (iter 003)
- ✅ integrate policy engine into normalizer (iter 003) and content capture (iter 008)
- ✅ SOP metadata strip + trust-signal trifecta (iters 004/005/006)
- ✅ SOP release-readiness validator (iter 007)
```

### Diff 5 — Add Meta-Review Cadence section

**Insert before "What Not To Do":**

```markdown
## Meta-Review Cadence

- **Base cadence:** every 3 completed improvement loops.
- **Increment rule:** Mode 5 directed sequences increment the counter by N (one per item), not by 1 (per batch).
- **Early triggers** (any of these forces an immediate meta-review):
  - 3+ consecutive iterations in the same Area field
  - 0 release-blocker items selected in 5 loops
  - Same implementing agent used for 4+ consecutive loops
  - Follow-up accumulation > 10 open items
  - 2+ iterations fail validation in a row
  - A named release blocker has survived 8+ loops
```

---

## Concrete changes to SYSTEM_HEALTH.md

### Diff 1 — Update "Meta-Review Status" block (current lines 113–119)

**OLD:**
```markdown
## Meta-Review Status

- Completed loops since initialization: **8 (iter 001–008)**
- Completed loops since last meta-review: **5 (iter 004–008)**
- Status: **OVERDUE — meta-coordinator invocation is the next required action**

The 006/007/008 batch demonstrated a new execution mode: user-directed multi-iteration sequencing with the coordinator enforcing one-commit-per-iteration discipline. This is itself a pattern worth reviewing in the next meta-level pass.
```

**NEW:**
```markdown
## Meta-Review Status

- Completed loops since initialization: **8 (iter 001–008)**
- Last meta-review: **Meta-Review 001 (2026-04-17, covering iter 004–008)**
- Next meta-review trigger: after iter 011 OR on any early-trigger condition (see CLAUDE.md § Meta-Review Cadence).
- Status: **current**

### Meta-Review 001 headline findings
1. Scoring formula deprioritizes release blockers — added `release_blocker_bonus` and `saturation_penalty` terms.
2. Agent orchestration collapsed to `backend-engineer` for 5 consecutive loops — delegation rubric added.
3. Zero release blockers closed in 5 loops — 1-in-5 forced rotation rule added.
4. Follow-up debt accumulating at ~1.2 per loop with 0 burn-down — 1-in-5 burn-down rule added.
5. Mode 5 (Directed Sequence) formalized.

### Key behavior changes enacted
- Iter 009 selection: **Playwright E2E tests** (release-blocker bonus + SOP saturation penalty forced the pivot)
- Iter 009 implementer: **qa-engineer + devops-engineer** (first non-backend-engineer loop since iter 003)
```

### Diff 2 — Update "Recommended Next Iteration" block (current lines 102–111)

**OLD:**
```markdown
## Recommended Next Iteration

**Mandatory meta-review before iter 009.** Per CLAUDE.md Meta-Review Trigger, the meta-coordinator must be invoked every 3 loops — we are at 8 completed loops with 5 loops since the last meta-review. The user-directed 006/007/008 batch is now closed.

After meta-review refines scoring weights, candidate items for iter 009+:
- **Wire `validateRenderedSOP` into `processSession.ts`** (score: 11, iter 007 follow-up) — dev-throws/prod-logs policy
- **Widen policy-engine `credit_card` regex to accept whitespace separators** (score: 11, iter 008 follow-up) — quick coverage fix
- **Add Playwright E2E tests for recording lifecycle** (score: 12) — remaining release blocker
- **Connect PostHog** — configure env vars to enable cloud analytics alongside internal DB
- **Extract confidence thresholds to shared constants module** (score: 10, iter 006 follow-up) — remove benign circular import
```

**NEW:**
```markdown
## Recommended Next Iteration

**Iter 009: Add Playwright E2E tests for recording lifecycle** (new score 15 under refined formula; old score 12 + 3 release-blocker bonus).

Rationale: release blocker since iter 000 (8 loops unaddressed); highest new score after applying the SOP-saturation penalty (−2) to competing SOP-area items; unblocks session-recovery validation in iter 010+.

Primary agent: `qa-engineer`. Secondary agent: `devops-engineer` (CI wiring).

Scope: install Playwright + 1–3 lifecycle tests (record → stop → upload; record → restart → recover). Do NOT aim for full coverage in one loop.

### Post-009 candidate queue (preliminary ordering)
- Iter 010: **Session event persistence** (blocker, score now 14) — natural pairing with E2E harness from iter 009.
- Iter 011: **LiveStepBuilder / StreamingSegmenter convergence** (last remaining duplication blocker).
- Iter 012: **Follow-up burn-down loop** (per 1-in-5 rule; candidate: wire validateRenderedSOP into processSession, or extract confidence thresholds).
```

### Diff 3 — Update Release Blockers section (current lines 90–98)

**OLD:**
```markdown
## Release Blockers

These should be assumed to block a high-confidence release until resolved:

- full session restart recovery not complete
- E2E lifecycle testing missing
- some duplicate logic still present (LiveStepBuilder vs StreamingSegmenter)

**Resolved in iter 008**: shared capture-policy enforcement was outstanding — now integrated via `classifySensitivity` in `target-inspector.ts`.
```

**NEW:**
```markdown
## Release Blockers

These block a high-confidence Phase 1 release. Scoring bonus `+3` applies to items in this list.

| # | Blocker | Opened | Loops unaddressed | Next action |
|---|---------|--------|-------------------|-------------|
| 1 | E2E Playwright lifecycle tests missing | iter 000 | 8 | **iter 009** |
| 2 | Session event persistence for SW restart recovery | iter 000 | 8 | iter 010 (after E2E harness) |
| 3 | LiveStepBuilder ↔ StreamingSegmenter duplication | iter 003 | 5 | iter 011 |

**Resolved in iter 008**: shared capture-policy enforcement via `classifySensitivity` in `target-inspector.ts`.
**Resolved across iter 003**: extension background logic deduplicated (normalization-engine, segmentation-engine, policy-engine imports).
```

---

## Meta-review cadence going forward

**Next scheduled meta-review:** after iter 011 (3 loops from now, per base cadence).

### Early-warning signals worth watching

The coordinator should trigger an immediate meta-review (bypassing the 3-loop cadence) if ANY of these occur:

| Signal | Threshold | Current state |
|--------|-----------|---------------|
| Same Area field | 3 consecutive iterations | SOP-presentation hit this at iter 006; corrected for iter 009 |
| Release blocker untouched | 5 loops since last blocker selection | Was at 5 (triggered this review); resets if iter 009 lands |
| Same implementing agent | 4 consecutive loops | Was at 5 (backend-engineer); iter 009 must break this |
| Open follow-ups | >10 items accumulated | Currently ~6; watching |
| Validation failures | 2+ in a row | Zero so far; good |
| Single blocker survives | 8+ loops | E2E tests hit this; iter 009 addresses |

### Metrics to track forward

1. **Release-blocker burn rate:** blockers closed / blockers opened per 5-loop window. Current: 0/0 (none opened, none closed). Target after iter 011: ≥ 1 closed.
2. **Agent diversity:** distinct implementing agents per 5-loop window. Current: 1. Target: ≥ 3.
3. **Area diversity:** distinct Area fields per 5-loop window. Current: 2 (SOP presentation, capture pipeline). Target: ≥ 3.
4. **Follow-up burn ratio:** (follow-ups closed) / (follow-ups created) per 10-loop window. Current: 0/6. Target: ≥ 0.4.
5. **Score discrimination:** stdev of top-5 backlog scores. Currently compressed in 10–15 band (stdev ~1.6). Target after formula update: stdev ≥ 2.5.

### Escape conditions

Do NOT run this meta-review again prematurely. Run the 3 new rules (release-blocker bonus, saturation penalty, 1-in-5 rotation) for at least 3 loops before re-evaluating their effectiveness. Changing multiple control variables more often than that makes measurement impossible.

---

## Appendix A — Raw change inventory (for the coordinator to apply)

Files to edit when applying this review:

1. `C:\Users\philk\ledgerium\CLAUDE.md` — Diffs 1–5 from the "Concrete changes to CLAUDE.md" section above
2. `C:\Users\philk\ledgerium\SYSTEM_HEALTH.md` — Diffs 1–3 from the "Concrete changes to SYSTEM_HEALTH.md" section above
3. `C:\Users\philk\ledgerium\IMPROVEMENT_BACKLOG.md` — recompute scores under the new formula; re-rank; move Playwright E2E to rank 1; move saturation-penalty items down
4. `C:\Users\philk\ledgerium\.claude\agents\coordinator.md` — add the Delegation Decision Rubric from Question D

Files NOT to edit (per meta-review stop condition):
- No product code changes.
- No test changes.
- No package changes.
