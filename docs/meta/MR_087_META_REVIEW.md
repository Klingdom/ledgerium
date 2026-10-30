# MR-087 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 223-225, 2026-10-27 → 2026-10-29. Commit `8e7a0a6` (loop 223, #430 timeout half + #432 first half),
pushed by the CEO 2026-10-28. Loops 224 (#307) and 225 (#430 page-width half) are **uncommitted** in the working tree.
Previous review MR-086 at `611c21a` (its own artifact committed with `8e7a0a6`). Rows closed: #307. Rows filed by loops:
none. Rows filed by this review: #433. Promoted from a cold pool: none.
**Why now:** base cadence, 3 of 3 since MR-086 (loop 225 Controls: "MR-087 is due next"). Also discharges the
same-implementer early trigger: loop 225 counted itself the coordinator's fourth implementing loop in a row (§4).
**Date:** 2026-10-29
**Scope constraint honoured:** no product code changed, no extension file touched, no edit to `CLAUDE.md` or the agent
files. This review writes `docs/meta/MR_087_META_REVIEW.md` and edits `IMPROVEMENT_BACKLOG.md` (one row, three
appends), `ITERATION_LOG.md`, `SYSTEM_HEALTH.md` and `CHANGELOG.md`. All four Markdown files were LF in the working tree
before and after (`git ls-files --eol`: `i/lf w/lf`). No commit, no `git add`, no reset.
The authenticated project rewrote the tracked PNGs under `apps/web-app/public/docs/screenshots/`; restored with
`git checkout -- apps/web-app/public/docs/screenshots`, and `apps/web-app/test-results` removed. Scratch went only to
the session scratchpad: `qg087.sh` (quality gate, then `test:e2e` one project at a time) with outputs `install087.txt`,
`val087.txt`, `guard087.txt`, `tc087.txt`, `root087.txt`, `web087.txt`, `e2e087public.txt`, `e2e087api.txt`,
`e2e087authenticated.txt`, `port_before_*.txt`, `port_after.txt`, `status_before087.txt`, `summary087.txt`;
`ci_public_40729268906.log` (the failed CI leg's log).

**Validation run for this review (executed, not inferred), on `8e7a0a6` + uncommitted loops 224-225:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | not claimed | exit 0 | green |
| `node scripts/validate-backlog.mjs` | 225: clean, 425 rows, 296 struck | exit 0, **425 rows, 296 struck, open 129**, clean; after this review's row: 426 rows, open 130, clean | matches |
| guard runner (`--manifest`) | 224: 142/142 | **142/142**, 6 files, exit 0 (files are LF in this tree, so #431 does not bite today) | matches |
| `pnpm typecheck` | 224: 0 | exit 0 | matches |
| root `pnpm test` | 222: 6904 | **322 files, 6911 passed**, exit 0 | +7 (loop 224's metrics file 16 → 22 runtime tests accounts for 6; see §3.2) |
| `apps/web-app` vitest | 224: 5288 (278 files) | **278 files, 5288 passed**, exit 0 | matches |
| e2e `public` | 225: 183 = 180 + 3 failed on a hand-started server; the 3 passed on rerun | **183 passed** (11.0 min), exit 0 | green; the 3 `analytics-consent` failures loop 225 saw were its hand-started server |
| e2e `api` | 223: 15 alone, file deleted | **15 passed** (1.1 min), exit 0 | matches |
| e2e `authenticated` | 223: not re-run (MR-086: 224 + 1 flaky + 2 skipped) | **225 passed, 2 skipped** (227 run; 14.2 min), 0 flaky, exit 0 | green; MR-086 had 1 flaky |
| CI deploy run 40729268906 (`8e7a0a6`) | 224/225: public failed 4 page-width tests | **failure**: quality-gate, both extension jobs, `api`, `authenticated` success; `public` 179 passed, 4 failed (14.1 min); build-and-push, deploy skipped | confirmed (§2.2) |

**Not run:** the extension real-extension harness (no extension file changed since loop 222's 6/6; CI ran both
extension jobs green on `8e7a0a6`); Firefox/WebKit; a production build; the live site.

---

## 1. Lead

1. **Production is still on loop 151; 74 loops (152-225) are undeployed.** The CEO pushed loop 223 (`8e7a0a6`). Its
   run 40729268906 proved the timeout half of #430: no leg came near its limit (public 14m43s of 30, api 1m09s of 15,
   authenticated 15m29s of 40). It failed on 4 page-width tests that only overflow with the Linux runner's fonts. Loop 225
   fixed both pages and taught the test to see the overflow on Windows, but loop 225 is not committed. **The next step is
   a push, not a loop.**
2. **The local gate on the tree that would be pushed is green: quality gate clean, root 6911, web-app 5288, and `test:e2e` public 183, api 15, authenticated 225 + 2 skipped, 0 failed, 0 flaky (§2.1).**
3. **The three loops hold (§3).** Each fix has a guard shown failing on mutants and a Limits line that names what it does
   not cover. Loop 223's scope expansion (the `api` session dependency) was logged with its evidence and was necessary:
   without it the split would have turned a timeout into a red `api` leg.
4. **Two governance slips repeat (§4).** Selection labels: loops 223 and 225 logged `top-score` and `blocker-cadence`
   for #430, a follow-up picked with the pool above 8 and no cool-off, so both should read `burn-down` (third time
   since loop 219). Implementer concentration: the coordinator implemented 222, 223 (with devops), 224 and 225. **Loop
   226 must have a specialist as primary implementer.**
5. **One new row (§2.2):** **#433 (8)**, a light-theme flake on the deploy path (`<html>` lacked the `light` class on 2
   of 6 CI attempts), seen by loop 225 and not filed.
6. **Next pick (§7): #425 (10)**, `growth-strategist` + `qa-engineer`, after the CEO pushes. If that push's deploy run
   fails, #430 (17) takes loop 226 instead, with `devops-engineer` or `qa-engineer`.

---

## 2. The deploy gate, and what CI did with it

### 2.1 Local gate on `8e7a0a6` + uncommitted loops 224-225

Quality gate first (table above), then `test:e2e` one project at a time (`--reporter=line`, retries as configured),
each project starting Playwright's own server on port 3098; nothing was listening on 3098 before each project or after
the last (`port_before_*.txt`, `port_after.txt`). No dev server was started by hand.

| Project | Result | Time |
|---|---|---|
| public | **183 passed** (includes `page-width.spec.ts` 74, now 4 assertions each) | 11.0 min (11m14s wall) |
| api | **15 passed** (with its own `free-auth-setup`) | 1.1 min (1m20s wall) |
| authenticated | **225 passed, 2 skipped** (227 run), 0 flaky | 14.2 min (14m14s wall) |

**All three projects green, 0 failed, 0 flaky, on the exact tree the CEO would push.** Local total 26.3 min of Playwright time (11.0 + 1.1 + 14.2) against MR-086's 29.0 on `611c21a`. The counts match loop 223's `--list` per leg (183 / 15 / 227); they sum to 425, not the whole-suite 423, because the setup tests run once in a whole-suite run and once per leg here. The local run cannot reproduce the Linux fonts, so this is necessary but not sufficient for #430: only a CI run can close it. Two things it does show: loop 225's widened-text pass is green on both fixes, and loop 224's panel changed no e2e result.

**Rollback safety (MR-080).** `git diff --stat 611c21a -- apps/web-app/prisma apps/web-app/src/app/api` (committed
and working tree) is empty. The undeployed range since MR-086 is CI configuration and one Playwright dependency line
(223), a server-rendered analytics panel and its helper (224), and two class attributes plus a spec (225). MR-085 and
MR-086 found loops 152-222 rollback-safe. **The push stays rollback-safe.**

### 2.2 CI run 40729268906 (push of `8e7a0a6`, 2026-10-28)

| Job | Start → end (UTC) | Duration | Timeout | Used | Result |
|---|---|---|---|---|---|
| quality-gate | 16:46:35 → 16:49:38 | 3m03s | — | — | success |
| e2e-extension (static) | 16:46:35 → 16:47:12 | 0m37s | — | — | success |
| e2e-extension (real-extension) | 16:46:35 → 16:47:43 | 1m08s | — | — | success |
| e2e-web-app **public** | 16:46:35 → 17:01:18 | **14m43s** | 30 | 49% | **failure**: 179 passed, 4 failed (Playwright: 14.1 min) |
| e2e-web-app **api** | 16:46:35 → 16:47:44 | **1m09s** | 15 | 8% | success |
| e2e-web-app **authenticated** | 16:46:35 → 17:02:04 | **15m29s** | 40 | 39% | success |
| build-and-push, deploy | 17:02:05 | — | — | — | skipped |

The whole run took 15m35s, against 30m24s for the two cancelled runs before it. **The split worked; the timeouts have
roughly 2x headroom.** The api leg's 15-minute limit is far above need, but lowering it saves nothing and is not
proposed.

**The 4 failures** (`public-page-width`, `/docs` and `/use-cases/operations`, light and dark): `/docs @320: scrollWidth
326 > innerWidth 320` and `/use-cases/operations @320: scrollWidth 321 > innerWidth 320`, on the first try and both
retries. Deterministic, not flaky. Loop 225 reproduced exactly these two (and no other route) locally with widened text.

**The flake (#433).** In both light-theme tests, retry #1 failed earlier, at `expectThemeApplied`
(`e2e/helpers/theme.ts:59`, `<html>` "does not have the \"light\" class"), and retry #2 failed at width again: 2 of 6
light-theme attempts did not get the light theme. It did not decide this run (the width failures did), and retries will
usually absorb it once the tests are green. But a light-theme scan that sometimes runs on the dark page passes for the
wrong reason, which is what the helper exists to stop. Loop 225 named it in Limits and did not file it. Filed **#433
(8)**.

---

## 3. The three loops

### 3.1 Loop 223 — #430 timeout half, three-leg matrix (`8e7a0a6`): **HOLDS; label wrong**

`devops-engineer` wrote the matrix; the coordinator found that a split `api` leg would start without `free-user.json`
and added `free-auth-setup` to its dependencies, shown by a mutant (old line restored, file deleted → `ENOENT`). The
**scope expansion** is logged with clause 7 (a)-(e): evidence (row #432 + mutant), one outcome (a deploy reaches
`deploy`), same Area family, not touching loop 222's surface. Counts `--list` 183/15/227 = 423. Timeouts were sized from
a stated bound (4.2 s/test × 1.5) and CI then used 49%, 8% and 39% of them. Limits correctly said the loop proved
nothing in CI. The Undeployed line was read from `gh run list` (MR-086 proposal 1, followed before ratification).
**Selection label:** `top-score` with pool > 8 and the cool-off held. #430 is a follow-up (of loop 216 / MR-085), so the
pick was a valid `burn-down`; MR-086 §7 planned it as `burn-down`. The log's "blocker-cadence precedence" for the
ceiling bypass is not a rule: the 1-in-5 blocker rule was not forcing (no blocker had been missed in four loops), and
the release-blocker bonus is a score term, not a selection rule. Outcome unaffected. Guard-runner result not logged.

### 3.2 Loop 224 — #307, the #57 retirement panel (uncommitted): **HOLDS**

`indicativeNote` adds the trust review's required wording under each rate below 100 users; the pooled counts are
labelled as combined totals; the trust review gains the toward-target forgery bound. Mutants (3) fail the new tests.
Measured here: the metrics test file runs **22** tests (16 at HEAD; one `it` sits in a `for` over k = 3 and 10) and
`RetirementPanel.test.tsx` **4**, as claimed. Root vitest is 7 above MR-086's 6904; 6 are this file's, the seventh is
not traced to a file here (all 6911 pass). D-4 clause 1 correctly did not fire (2 strings). Step 7 was argued (no e2e
spec reads the panel text). The CEO question on the PRD's per-user bounce target is open (§8). Label `burn-down` ✓.
Implementer: coordinator, against a rubric default of `frontend-engineer`; the log gives a reason (a 19-line helper
and a mechanical extract), but see §4.

### 3.3 Loop 225 — #430 page-width half (uncommitted): **HOLDS; label wrong**

Diagnosis is measured, not guessed: every element reaching the right edge at 320 px was listed, and a widened-text
stylesheet (4% wider, Courier New for monospace) reproduced exactly the two CI failures among 37 routes. Fixes are
minimal (`[overflow-wrap:anywhere]` on `/docs`'s `Code`; the landing page's own `sm:whitespace-nowrap` pattern on
`/use-cases/operations`). Two mutants, each failing only the new widened assertion, which is the blind spot that let
CI find these first. Limits names the guard's limit honestly (it does not reproduce Linux fonts; an element needing
more than 4% could still slip) and the theme flake. **Validator line:** filled ("clean (425 rows, 296 struck)"), no
`VALIDATOR_RESULT` placeholder remains anywhere in `ITERATION_LOG.md` (grep: 0 hits); confirmed by this review's
validator run (425 / 296). **Guard-runner line:** absent. **Selection label:** `blocker-cadence`, but the 1-in-5 rule
was not forcing (loop 223 was a blocker pick); #430 is a follow-up, so `burn-down`. Its whole-public-project run used a
hand-started dev server and got 3 false failures; MR-087's run on Playwright's own server is the check of record (§2.1).
Agent diversity justified in the log, and it named the consequence: "Loop 226 should use a specialist."

---

## 4. Governance verdicts

| Rule | Verdict | Evidence |
|---|---|---|
| Selection, loop 223 | **label wrong**, pick sound | `top-score`; should be `burn-down` (follow-up, pool > 8, cool-off held) |
| Selection, loop 224 | ✓ | `burn-down`, #307 (follow-up of L124), re-scored at pick time over 219-223 |
| Selection, loop 225 | **label wrong**, pick sound | `blocker-cadence`; the rule was not forcing; should be `burn-down` |
| Selection-label recurrence | **failing as a practice** | 219, 223, 225: three of the last seven loops. Proposal 1 (§8); #359 append |
| Blocker cadence (1 in 5) | ✓ | blocker work at 223 and 225 |
| Burn-down cadence (1 in 5) | ✓ | 223, 224, 225 all picked follow-up rows |
| Pool ceiling (clause 6) | ✓ in substance | all three picks were follow-ups; only the labels were off |
| Cool-off | held **3/3** | not invoked since loop 206; no eligible non-follow-up row ≥ 10 that is unblocked |
| Meta-review cadence | ✓ | 3 of 3; this review is on time |
| Agent diversity | **early trigger fired** (4+ same implementer, by loop 225's own count) | implementers 222 coordinator, 223 devops + coordinator, 224 coordinator, 225 coordinator. Counting 223 as devops gives a run of 2; counting the coordinator's own fix there gives 4. Either way the coordinator implemented 4 of the last 4 counted loops in part and 3 in full. **Ruling: loop 226 MUST name a specialist as primary implementer; the coordinator may verify and apply only.** This review discharges the trigger |
| Area saturation (Step 2 rule 2) | ✓ | 223 infra/ci, 224 web-app/analytics, 225 web-app/public pages: not one Area three times |
| Saturation penalty for loop 226 | none | loops 221-225 by token: privacy 2, web-app 2, policy-engine 1, extension-app 1, infra 1, ci 1, analytics 1, public 1 (225's "public pages"). No token at 3. A web-app pick at 226 makes web-app 3 of 222-226, so a **227** web-app pick would take −2 |
| D-1 reverse drift | **3** | last extension-surface touch loop 222; 223, 224, 225 none. Loops 226 and 227 both off-extension would make 5 and fire the trigger at 227 close; MR-064's gate means that fire needs a CEO answer, not an extension pick |
| Ratio, loops 216-225 | **0.64** | closed 7 (#418, #251, #329, #422, #426, #429, #307); created 11 (218 #422; MR-085 #423-#424; 219 #425; 221 #426-#428; 222 #429; MR-086 #430-#432). Without the two filed-and-closed-in-loop rows: 5 / 9 = 0.56. Above 0.5 |
| Pool | 129 → **130** | validator; this review files #433 |
| Staleness (age > 10) | keep all | #411 (L209), #417 (L212), #419 and #421 (L215): `AnalyticsConsent.tsx`, `posthog.ts`, `DashboardV2Shell.tsx`, `ColumnPicker.tsx` have no commit since 2026-10-04 other than `d4bab73` (canvas only), so each defect is as filed. #17, #28, #38, #39, #43, #44: no change since MR-086, kept |
| Density | ✓ | 0 follow-ups in each loop |
| MR-079 / MR-082 | ✓ all three | each Limits line names the uncovered members and guard shapes |
| MR-080 | ✓ all three | each states no stored format changed; 224 also no API response change |
| MR-078 (full gate per review) | ✓ here | §2.1 |
| Log lines | **partly** | Undeployed ✓ 223-225 (from `gh run list`); validator ✓ 223-225; guard runner 224 only |
| CHANGELOG practice | ✓ | 223, 224, 225 each added a plain entry marked not yet deployed; true |
| SYSTEM_HEALTH | ✓ with one stale phrase | the #430 bullet still says "Loop 223 (uncommitted)"; 223 is pushed. Corrected by this review's line |

---

## 5. Audit intake

No audit artifact in the window. CAPTURE_DETAIL_PRIVACY_REVIEW_001's cold pool is unchanged; the path-1 slot opened by
#429's closure stays recorded for CDP-L3 pending the CEO's decision 5 (MR-086 §5). Cold-pool age 3 (under 10).

---

## 6. Patterns

1. **Reading the deploy every loop works.** MR-086's finding was a dropped line; loops 223-225 restored it from
   `gh run list`, and loop 224 recorded the page-width failure at its close, the day of the push. This is MR-086 proposal 1 operating
   unratified; ratifying it costs nothing.
2. **A guard that only sees one machine's fonts guards one machine.** Loop 225's widened-text pass is the right shape: it
   converts a CI-only failure into a local one. Its 4% margin is a guess; the Limits line says so.
3. **"Release blocker" is being used as a selection rule.** Twice in this window a blocker row was labelled by its
   bonus rather than by the rule that selected it. The pick was right; the log no longer says why it was allowed.
4. **The coordinator absorbs small loops.** Each of 224 and 225 had a reason to skip the specialist; together with 222
   and 223 they make four. The cost so far is zero defects, and the rule exists to stop the habit before it costs one.

---

## 7. Top open non-blocked rows and the next pick

Re-scored at pick time for loop 226 (penalty over loops 221-225: no token at 3, so none).

| Rank | Row | Score | Area | Status | Note |
|---|---|---|---|---|---|
| 1 | #430 deploy reaches `deploy` | 14 + 3 = **17** | infra / ci | open, release blocker | **no work left until a push**: both halves done (223 committed, 225 uncommitted) |
| 2 | **#425** unbacked claims on other public pages | **10** | public / positioning | open | 19 hits as filed; D-4 clause 1 will fire (≥3 strings) |
| 2 | #432 second half: the `.auth` dependency check | 10 | tooling / e2e | open (half done) | true today by inspection (§9); the check prevents a regression |
| 2 | #309 items (4)-(5) | 10 | web-app / a11y | open | |
| 2 | #81, #84 | 10 | dashboard-v2 | open | not re-checked since MR-077/MR-084 |
| 2 | #427 | 10 | extension-app / privacy | **CEO-gated** (MR-064; CDP decision 2) | do not pick |
| 2 | #278 | 10 | infra / deploy | CEO-gated (PostHog settings) | |
| — | #431, #428, #424, #421, #419, #417, #411, #359 | 9 | | | |
| — | **#433** (new) | 8 | tooling / e2e | open | |

**Endorsed (after the CEO commits and pushes loops 224-225 and this review):**

| Loop | Pick | Score | Rule | Agent | Why |
|---|---|---|---|---|---|
| **226** | **#425** remove the unbacked claims (audit-ready, "support SOC 2", the wait-time statistic, ramp outcomes) from the remaining public pages and widen the #422 guard to them | **10** | `burn-down` (follow-up of L219; pool > 8) | **`growth-strategist`** (replacement copy, D-4 clause 1) + **`qa-engineer`** (applies by exact-match script, widens `industryDepartmentClaims.test.ts` to the new pages, mutants) | highest impact of the 10s (I = 4): compliance claims that will go live with the next deploy; specialist primary as §4 requires; public token 1 in 221-225 |
| 2nd | #432 second half | 10 | `burn-down` | `qa-engineer` | small (E = 1); same CI area as #430; protects the split |
| 3rd | #309 items (4)-(5) | 10 | `burn-down` | `frontend-engineer` | |

- **Conditional:** if the deploy run of that push does not reach `deploy`, loop 226 is #430 again (17), with
  `devops-engineer` (a workflow cause) or `qa-engineer` (a test cause), and the Controls block records each leg's
  duration against its timeout.
- **#430 closes** only when a pushed run's `deploy` job succeeds; the closing entry records the three leg durations.
- **Do not pick** #427/#428 or any CDP item without the CEO's decision 2 or a directive.
- **Then:** #433 alongside or after #432 if one outcome; #81, #84, #431, #424, #419, #421; MR-088 after three counted loops.

---

## 8. Proposed changes (for CEO ratification; not applied)

**No change to `CLAUDE.md` or the agent files is applied.**

1. **`.claude/agents/coordinator.md`, Candidate Selection, add:** "With the pool above 8 and no `ceiling-cool-off:
   invoked`, a follow-up row is logged `burn-down`, including a release blocker. `blocker-cadence` is logged only when
   the 1-in-5 blocker rule forces the pick; the +3 release-blocker bonus is a score term, not a selection rule (MR-087)."
   Rationale: three mislabels (219, 223, 225) in seven loops; each pick was right, each log was wrong about why.
2. **`.claude/agents/coordinator.md`, Controls, add:** "Implementer run: the number of consecutive counted loops the
   coordinator implemented in full or in part. At 3, the next loop names a specialist primary (MR-087)." Rationale:
   loop 225 reached 4 and justified it in prose; a counter makes the threshold visible one loop earlier.
3. **MR-086 proposals 1 and 2** (Controls deploy line from `gh run list`; CI job durations against `timeout-minutes`)
   are being followed unratified at loops 223-225. Ratify as written.
4. **MR-086 proposal 3** (one directed fix may run ahead of a due review) and **proposal 4** (`CLAUDE.md` § Known
   Issues: "Release blocker (MR-086, #430): no deploy has run since loop 151") stand unchanged. When #430 closes,
   proposal 4's bullet should be dropped rather than added.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | **Commit and push loops 224-225 (and this review)** | the only step left for #430; local gate on that tree: public 183, api 15, authenticated 225 + 2 skipped, all green. Rollback-safe (§2.1) |
| — | Healthcare no-PHI claim | still live in production until a deploy succeeds |
| 2 | Loop 224's question: does the PRD's "bounce under 40%" target mean the per-user rate the panel shows? | open |
| 3 | Ratify proposals 1-4 above | open |
| 4 | Scheduled jobs: `CRON_SECRET` (alerts, purge) | unchanged from MR-086 |
| CDP 2-7 | allowlist policy, `observation` object, phase order, intake (decision 5: L3 into the open slot), purge after Stop, vendor-claim check | open |
| 21 | D-1 / MR-064 extension gate: lifted, or per-directive? | open; D-1 counter 3, would fire at 227 close |
| #399, #413/#278, stored data, Umami, Path E, `analytics` tooling, #225, #357, P-1 | unchanged | |

---

## 9. Finding → row map

| Finding | Row |
|---|---|
| §2.2 public leg failed 4 page-width tests; timeouts proven | #430 append (stays open; release blocker) |
| §2.2 `expectThemeApplied` failed on 2 of 6 light-theme CI attempts | **#433** (new) |
| §2.1 local gate on the tree to be pushed | #430 append |
| #432 second half: every `.auth` reader checked by hand | #432 append |
| §3.1, §3.3 selection labels; §4 guard-runner line absent at 223, 225 | #359 append; proposal 1 |
| §4 implementer run of 4 | ruling for loop 226; proposal 2 |
| §4 SYSTEM_HEALTH "Loop 223 (uncommitted)" stale | corrected in this review's SYSTEM_HEALTH line |
| loop 224 PRD bounce-target question | CEO queue 2 |

---

## 10. Verdict

On `8e7a0a6` + uncommitted loops 224-225: frozen install exit 0, validator clean (425 / 296; 426 / 296 after #433),
guard runner 142/142, typecheck 0, root 6911, web-app 5288, and `test:e2e` public 183, api 15, authenticated 225 + 2 skipped (0 failed, 0 flaky). CI run 40729268906 proved
the three-leg split (14m43s, 1m09s, 15m29s against 30, 15, 40) and failed only on the two page-width defects loop 225
fixed. All three loops hold. Push the tree; then loop 226 is #425 with a specialist primary, or #430 again if the
deploy run fails.

### Appendix — reproducing

```sh
S=<scratchpad>
sh $S/qg087.sh                                         # install, validator, guard, typecheck, root, web-app, then public, api, authenticated
gh run view 40729268906 --json jobs                    # per-job start/end; build-and-push and deploy skipped
gh run view --job 122960825903 --log > $S/ci_public_40729268906.log
grep -n "scrollWidth\|expectThemeApplied" $S/ci_public_40729268906.log
git diff --stat 611c21a -- apps/web-app/prisma apps/web-app/src/app/api   # empty
git checkout -- apps/web-app/public/docs/screenshots   # restore the PNGs
node -e "require('fs').rmSync('apps/web-app/test-results',{recursive:true,force:true})"
grep -c VALIDATOR_RESULT ITERATION_LOG.md              # 0
```
