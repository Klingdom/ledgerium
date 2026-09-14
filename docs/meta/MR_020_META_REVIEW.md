# MR-020 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-14 · **Trigger** cadence overdue ~16 weeks (MR-019 = 0a520c4, 2026-05-18) + 4 autonomous loops today · **Inputs** ITERATION_LOG loops 1–4, CHANGELOG/SYSTEM_HEALTH top, `git log --since=2026-05-18` (238 commits), CLAUDE.md policy sections.

**The gap is the headline finding.** MR-020 fell due at iter ~087 (2026-05-25). The log then says "DEFERRED per CEO Option B post-TEAM-001" four times, and the deferral never lifted. After iter 098 (2026-06-26), ITERATION_LOG has **no entries** until today, across 125 commits (coordinator-verified; an earlier draft said ~190). By count those were mostly product work (~112: dashboard/report/SOP/workspace), then SEO/content 37, billing 29, extension 17, admin/ops 11.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1a | Loops 1–2 `top-score` | Effective | Closed TRIAL_REVIEW_001 P0s in rank order. Loop 2 rejected the review's false "Starter removes the cap". |
| 1b | Loop 3 `saturation-rule` | Effective | Last 3 logged items were web-app (098, L1, L2). It counted unlogged bb0d5c9 instead of 098; same result. |
| 1c | Loop 4 "D-1 forced extension" | Effective outcome, mis-cast rule | D-1 is a meta-review trigger that needs a user-ack, not a rule that forces a pick. The count was also ambiguous: 4 logged items vs 7 commits since e625893. The pick avoided the trigger; "forced" overstates it. |
| 2 | D-4 clause 1 copy review | Effective | 2 of 3 fires caught **factual** defects ("every paid feature"; "History" naming a screen that does not exist). Loop 2 was 5/5 KEEP at ≤30 min. It works as a claim-truth check. |
| 3 | Real-extension harness, loop 4 | Insufficient-evidence | 5/5 shows no capture regression, but the spec has no `/api/sync` route, so the changed path is unit-tested only. The sidepanel is not in rule 1's path list, so the run was a precaution. **A 403 fixture is warranted — scope it into (a)**, where `uploader.ts` *is* protected. |
| 4 | Meta-review cadence | Failing (silently dead) | The counter measures counted loops. Directed programs and unlogged commits never moved it, and the deferral had no expiry. **Reshape** (C2). |
| 5 | Claims not bound to behavior | Failing (no structural control) | 7 instances: c9e6c5b $29/$49; 0da54d8 privacy; 37f37e2 llms plans that cannot be bought; 65cf278+3fa5a26 data claimed from real recordings; "every paid feature"; "Starter". "No credit card required" per coordinator, not re-verified. Each fixed one at a time. Only `quota-meter.test.ts` binds copy to `plans.ts`. |
| 6 | Governance overhead | Failing | CLAUDE.md is 404 KB; **§ Current Phase ≈ 361 KB (89%)** (coordinator-measured), loaded into every agent context, and it still says "Active work: ITERATION 074". The recovery protocol reads CLAUDE.md first, so recovery is now misled. Today's ~10-line log entries show the short format works. Today's follow-ups also skipped IMPROVEMENT_BACKLOG, so the debt ratio cannot be computed. |

## Recommended changes (PROPOSED — not applied; CLAUDE.md edits need CEO approval)

| ID | Target | Change | Rationale |
|---|---|---|---|
| C1 | CLAUDE.md § Current Phase (+ § Known Issues) | Cut to ≤25 lines: phase, open blockers, CEO decision queue, pointer to top of `SYSTEM_HEALTH.md`. Archive the existing text as-is to `docs/meta/CURRENT_PHASE_ARCHIVE_2026-05.md`. | A stale 370 KB narrative in every session is the largest cost and recovery hazard in the repo. |
| C2 | CLAUDE.md § Meta-Review Cadence | Due at 3 counted loops **or** 21 days with ≥10 commits since the last MR, whichever is first. Every deferral names an expiry date; when it expires, the review becomes a hard trigger. | Loop counting cannot see directed or unlogged work, which is how 4 months passed unobserved. |
| C3 | CLAUDE.md § Coding Standards (new "Claim binding") | Any user-visible price, plan name, limit, trial term, or plan capability must come from, or be test-asserted against, `plans.ts` / `PRICING_CONFIG`. Reference: `quota-meter.test.ts`. | 5 of 7 defects were plan/price claims; a failing test outlasts a human catch. Privacy and content claims stay with D-4. |

Not proposed: D-1 or saturation changes (one mis-cast log line is not enough evidence).

## Loop 6 endorsement

Area sequence: web, web, docs, extension. No saturation block. The −2 penalty applies to web-app (3 of the last 5). D-1 is clear.

| Rank | Candidate | Driver | Rationale |
|---|---|---|---|
| **Top** | **(c)** `stats.userPlan` → effective plan | `burn-down` (loop 4 follow-up); top score even after −2 | The reverse trial is live today. Every trial signup is being recorded as `free`, which corrupts the conversion baseline from the first cohort. Small, reversible, unit-testable. |
| Alternate | **(a)** `uploader.ts` quota 403 | `burn-down` | Protected surface. Scope must include a harness 403 fixture; first check whether `context.route` intercepts service-worker fetches, else use a local stub server. Needs a human Chrome check before the Store. |
| Deferred | (b) last-day notice | lower score after −2 | Ship before the first cohort's final trial day. |
| Not selectable | (d) R-2 canonical hash | CEO decision queue #2 | The coordinator must not self-authorize. |
