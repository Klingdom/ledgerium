# MR-061 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 144-146, 2026-10-02 17:48 → 18:00 (−0600). Commits `e6a47e9` (loop 144, #332), `14e45d8` (loop 145,
#333), `ae44c81` (loop 146, #334). Rows closed: #332, #333, #334 (all three filed by the MR-060 recording). Rows filed
by loops: none.
**Why now:** base cadence, 3 of 3 since MR-060 (`ITERATION_LOG.md:13`). First review after the clause 9 amendment was
applied (`4a87223`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit. Everything below that needs a row, a strike or a
fix is a recommendation. Scratch files were written only to the session scratchpad (an extracted CI step, a fake HTTP
client, an empty-dir and a "hollow" script-test fixture).

**Where the checks ran.** Main checkout at `ae44c81`. The working tree differs from HEAD only in `.claude/*` and an
untracked `data/`, which no check reads; `git status --short` was byte-identical before and after all runs. Windows,
pnpm 10, Git Bash. `origin/main` is `dcf7f0e`; `main` is **13 commits ahead** (`git rev-list --count origin/main..main`).

**Validation run for this review. Every check below was executed at `ae44c81`; none is inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test`, **×2** | 6049 | **2 of 2: 291 files, 6049 passed, exit 0** | matches |
| `apps/web-app`: `pnpm exec vitest run`, **×2** | 4255 | **2 of 2: 235 files, 4255 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 327 rows, 208 struck, 13/13 baselined, **open 119**, "V4: parsed 125 closure claim(s)" | matches |
| `node --test scripts/*.test.mjs` | 37 | **tests 37, pass 37, fail 0, skipped 0, exit 0** | matches |
| CI step "Test all script guards", extracted verbatim from `deploy.yml:43-55` and run with bash | found 5, exit 0 | **"found 5 … (minimum 5)", 37/37, exit 0**; empty dir → `::error::` exit 1; 4 files → exit 1 | matches — but see §5: it passes a hollow suite |
| `pnpm --filter @ledgerium/web-app build` | — | **exit 0**, "Compiled successfully", `[assert-dynamic-api-routes] OK` | passes |
| Loop 146 "3 of 4 new tests fail on the old code" | 3 of 4 | **not re-run** (I did not revert the source) | **unverified here** |

**Not run:** Docker, Linux, any GitHub runner, Playwright, any browser, any screen reader, any HTTP request, the purge
against any database, `EXPLAIN` on the count queries. No `curl`/`wget` (the fake client below is a local shell script
on `PATH`, as loop 145's own test does).

---

## 1. Lead

**Every count reproduces and nothing needs reverting.** The window did what MR-060 asked, in the order asked, in 12
minutes, with zero rows filed. That is the first fully clean burn-down window in several reviews. But:

1. **"Nothing is deleted until someone says so" is false when the URL variable carries a query.** The script appends
   `&dryRun=1` to whatever `RETENTION_PURGE_URL` holds (`retention-purge.sh:40`); the route reads the **first**
   `dryRun` and `mode` values (`purge/route.ts:55,64`) and purges iff `mode=purge` and that first `dryRun` is not
   truthy (`:69`). Run through the real script with the arming variable **unset**, a URL ending
   `?mode=purge&dryRun=0` becomes `?mode=purge&dryRun=0&dryRun=1` → **real purge** (§3.1, executed). It needs an
   operator to paste a query into a variable — unlikely — but it is the one deletion path the loop's title promises
   cannot exist, and the fix is two lines.
2. **The CI script-test floor counts files, not tests.** Five files where one is empty and four contain only skipped
   tests pass the extracted step: "found 5 (minimum 5)", `tests 5, pass 1, skipped 4`, **exit 0** (§5). The floor
   catches a deleted guard, not a hollowed one. Loop 145's own guard file skips every test when `bash` is absent
   (`retention-purge-arming.test.mjs:17,41`) — fine on `ubuntu-latest`, silent anywhere else.
3. **Loop 146's busy state is invisible to a screen reader.** Both buttons carry an `aria-label`
   (`WorkflowRow.tsx:687,785`) that overrides the visible "Deleting…"/"Archiving…" text; there is no `aria-busy`, no
   live region. Escape is now swallowed silently (`:879-883`). A screen-reader user presses Escape, hears nothing and
   gets nothing. No keyboard trap (§4), but no feedback either.
4. **What is live.** Still `dcf7f0e`. Loops 137-146 (13 commits) are not in production.

---

## 2. Q2 — Clause 9 amendment

`git diff 4a87223^ 4a87223 -- CLAUDE.md` replaces exactly one line (clause 9). Both substitutions match MR-060 §2
verbatim: the new trigger text "…AND the pool is larger than it was when the sequence opened (net growth during the
sequence)…" and the new override sentence "…a second breach within the same sequence…An override logged at sequence
open covers every item…(MR-059: …closed 3 rows and filed 2.)". On disk: `grep -c "AND the pool is larger than it was
when the sequence opened" CLAUDE.md` = 1; `grep -c "a second pool > 15 breach" CLAUDE.md` = 0. `git log
4a87223..HEAD -- CLAUDE.md` is empty. **Text is exact.**

**Objection check.** No CEO objection is recorded in any window commit, `ITERATION_LOG.md` (`:81` records the
application) or `SYSTEM_HEALTH.md` (`:24` invites one: "tell me if you want it reversed"). I cannot see the chat.

**One governance hazard.** The `CLAUDE.md` copy injected into *this* agent's context still shows the **pre-amendment**
clause 9 ("If the open follow-up pool exceeds 15 … MUST halt"). The disk is correct; the session snapshot is stale. Any
subagent launched in this session sees the old rule. Harmless today (no Mode 5 is open); the coordinator should re-read
`CLAUDE.md` from disk before ruling on clause 9 rather than trusting the context copy.

---

## 3. Q3 — Loop 145, adversarially (the irreversible path)

### 3.1 Can anything purge without `RETENTION_PURGE_ARMED=true` AND `mode=purge`?

| Path | Evidence | Verdict |
|---|---|---|
| Schedule, variable unset / `""` / `1` / `TRUE` / `yes` / `false` | script `:35` requires exactly `true`; otherwise appends `dryRun=1`; test `:49-55` covers all five | **safe** |
| Schedule, armed | `RETENTION_PURGE_DRY_RUN` evaluates to `''` for `schedule` (`retention-purge.yml:61`) → `?mode=purge` | real, intended |
| Manual, `dry_run` ticked (default) | typed `inputs.dry_run` (not `github.event.inputs`, where `'false'` is truthy) → `'1'` → dry even when armed (test `:63-66`) | **safe** |
| Manual, `dry_run` unticked, unarmed | `''` + unarmed → dry | **safe** |
| Env quoting | `vars.*` is injected as an env value, not interpolated into the script body; `[ "$X" = "true" ]` is quoted | **safe** |
| Route, bare POST / `?dryRun=0` / `?mode=dryrun` / bad mode | default dry (`route.ts:69`); bad mode → 400 (`:66`); tests `route.test.ts` "#333" ×2 | **safe** |
| Route, `dryRun=1` + `mode=purge` | `dryRun` wins (`:69`) | **safe** |
| **URL variable already containing a query** | `?mode=purge&dryRun=0` → script yields `…&dryRun=0&dryRun=1`; `searchParams.get` returns `'0'`; route predicate → **dryRun false**. Executed through the real `retention-purge.sh` with a fake client on `PATH`, `RETENTION_PURGE_ARMED=` and the route predicate copied from `:55-69`; also `?dryRun=false&mode=purge` → **false** | **bypass** |
| Other callers | `git grep "retention/purge\|purgeExpiredWorkflows"` outside tests/docs: the script and the route only | none |
| `#fragment` in URL | the appended query lands in the fragment; server sees no `mode` → dry | fail-safe |

**Fix shape (one row, small):** the route should treat **any** truthy `dryRun` (`getAll`) as dry and reject a
duplicated `mode`; the script should refuse a `RETENTION_PURGE_URL` that already contains `?` (exit 2, like the
unconfigured case). Either half closes it; both make it impossible.

### 3.2 Are the uncapped counts correct and cheap?

- **Correct.** `eligibleTotal` uses the same predicate as the real path (`workflow-retention.ts:233` vs `:242-244`;
  `selectPurgeEligible` at `:88-89` adds nothing beyond status + cutoff). `eligible = min(total, limit)` equals the
  real `batch.length` absent races. `orphanCandidates` uses the sweep's predicate (`:237` vs `:327-328`).
- **Under-described, not wrong.** `orphanCandidates` is uncapped, but the real sweep takes 100 per run (`:330`), so it
  is a backlog, not "the next run". And the preview still does **not** count the uploads, files and process
  definitions removed *with* eligible workflows (those happen in-transaction, `:276-300`) — the dry run says how many
  workflows go, not how many recordings go with them.
- **Cost.** Both are single `COUNT` queries; no rows are fetched. The workflow count can use `@@index([status])`; the
  upload count can use `@@index([uploadedAt])`, but `workflows: { none: {} }` becomes an anti-join on
  `workflows.source_upload_id`, which has **no index** (schema: indexes on userId, status, userId+status, createdAt,
  processDefinitionId, variantId only). Expect one sequential pass over `workflows` per dry run. Cheap at Phase 1
  scale; not "no full scan". Not measured (`EXPLAIN` not run).

### 3.3 Do the operator steps match the code?

`retention-purge.yml:15-28`, `SYSTEM_HEALTH.md:17-19` and the code agree on the order: set secret + URL, manual dry run,
then `RETENTION_PURGE_ARMED=true`; delete the variable to disarm. Two drifts:
1. `SYSTEM_HEALTH.md:17` omits that `CRON_SECRET` must also be in the **web container** (the yml says "same value the
   web container has"; the script's 503 message says so too). An operator following SYSTEM_HEALTH alone gets a 503.
2. `retention-purge.sh:3-4` still says it "prints the HTTP status ONLY - never the body". It prints the dry-run body
   (`:60-61`). MR-060 §3.2.3 named this; loop 145 edited the same file and left it.

---

## 4. Q4 — Loop 146

**Trap?** No. The confirmation is an inline `role="region"` (`WorkflowRow.tsx:674,771`), not a modal; there is no focus
trap, so Tab, the browser's back button and reload all work while a request hangs. Escape is swallowed only on the
document listener for **this row** (`:879-883`); `stopPropagation` does not stop other listeners on `document`.

**Hang?** Unbounded. `fetch` has no `AbortSignal` or timeout (`:656`, `:748`). A request that never settles leaves the
row with both buttons disabled and Escape dead until reload. The browser's own network timeout eventually rejects,
which lands in `catch` and restores the buttons — but that is minutes, not seconds. The loop's reason for not aborting
("an abort cannot prove the server didn't apply it") is right; a client timeout that **reports** "No response — reload
to check whether it was deleted" without pretending to cancel is the honest escape hatch.

**Announced?** No (§1.3): the `aria-label` overrides the visible "Deleting…"; no `aria-busy`, no `role="status"`. And
when the focused button becomes `disabled`, Chromium moves focus to `body`, so the user loses their place silently.

**Smaller:** `confirmInFlightRef` is shared by both confirms (`:973`). If Archive and Delete confirms are both open
(possible since loop 141, MR-060 §3.1) and one settles, it writes `false` while the other is still in flight —
re-opening the original bug for that row. Edge case.

---

## 5. Q5 — Loop 144

- **Floor value.** 5 is right today: `ls scripts/*.test.mjs` = 5 files.
- **Gating.** The step is in `quality-gate` (`deploy.yml:15,43`); `build-and-push` needs `quality-gate` (`:114`) and
  `deploy` needs `build-and-push` (`:147`). It gates deploy.
- **Still passes on nothing:** (a) the floor counts **files**, so empty or all-skipped files pass — demonstrated above;
  (b) `node --test` reports skips as non-failures, and `retention-purge-arming.test.mjs` skips wholesale without bash.
  Fix: parse the `ℹ tests` and `ℹ skipped` lines and fail on `skipped > 0` in CI and on `tests < N_TESTS_MIN` (37
  today). Every other CI step checked: both vitest steps use `--no-passWithNoTests` (`:77,:86`); the `--filter` steps
  use `--fail-if-no-match`; the validator has its own V4 canary. The two Playwright jobs were not audited here beyond
  `test.skip` counts (one each in `admin-a11y.spec.ts` and `upload.spec.ts`).

---

## 6. Q6 — Practices

- **"New test file" briefs must require:** (1) the exact collector — config glob, CI step line — quoted; (2) any count
  floor raised in the same commit (loop 145 missed this; the coordinator caught it and logged it properly); (3) a
  canary proving the file actually runs in the CI-equivalent; (4) its skip conditions and a statement that skips = 0
  in CI. Item (4) is the class §5 still leaves open.
- **Loop 146 search failure — tooling, and reproducible.** Backlog IDs are keyed `| 334 |`; the file contains **zero**
  occurrences of `#334` (`grep -c "#334"` = 0) and is 829 KB, beyond one Read. Review sections are headed `## 3.`, not
  `§3`. An agent grepping `#334` or `§3` finds nothing. (I cannot see the agent's queries; this is the likely cause,
  not a proven one.) Fix: briefs quote `grep -n "^| 334 " IMPROVEMENT_BACKLOG.md` and the review's heading line; or the
  validator gains `--row N` to print one row.
- **Pace.** Three loops in 12 minutes, each with tests that fail on the old code (claimed; 145's I partly re-derived).
  Fast and real. What it did not do is walk the operator path adversarially (§3.1) — the same pattern MR-060 named.
- **Pool trend, loops 137-146.** Closed 10 (one per loop). Created 9: loops 4 (#326, #327, #330, #331) + MR recordings
  5 (#328, #329, #332, #333, #334). Ratio **1.11**; open **119** at both MR-060 and now. The window itself was
  3 closed / 0 created, but only because MR-060 pre-filed its work. Flat; the debt is being serviced, not reduced.

---

## 7. What the window got wrong

1. Loop 145's guarantee has a config-content bypass: a query in `RETENTION_PURGE_URL` purges unarmed (§3.1).
2. Loop 144's floor guards file deletion, not hollowing or skipping (§5).
3. Loop 146 made Escape silently dead without making the busy state audible or bounded (§4).
4. Loop 145's preview omits recordings/definitions removed with workflows; SYSTEM_HEALTH omits the container secret;
   the script header drift MR-060 named survived an edit to the same file (§3.2-3.3).
5. The session's context copy of `CLAUDE.md` is pre-amendment (§2).
6. Nothing needs reverting.

**Pattern:** each loop closed exactly the defect named in its row and nothing adjacent. That is the right scope
discipline; it means the reviewer, not the loop, must walk the adjacent paths — so the brief should name them.

---

## 8. Q8 — Loop 147 pick

Pool 119 > 8 ⇒ burn-down unless the cool-off is invoked. Cool-off **re-armed at 145** (`ITERATION_LOG.md:38`). Last
five Areas: path-e, path-e/architecture, test-infra/ci, security/data, web-app/data — none 3 of 5, no penalty.

| Rank | Pick | Score | Rule | Agent | Area |
|---|---|---|---|---|---|
| **1** | **New row (follow-up of #333): "A query in the purge URL cannot purge unarmed."** Route: any truthy `dryRun` wins, duplicate `mode` → 400; script: refuse a URL containing `?`. Plus the two §3.3 drifts. Test: the §3.1 URL through the real script. I5 A5 L2 C5 E1 R1. Must land before the CEO arms retention | **15** | `burn-down` | `backend-engineer` | security / data |
| 2 | **#331, re-scored with its MR-060 item (7)** (minimum support per condition value). The confidence model rewards per-run-unique text; P06 (#122) adds four more signal types on top of it. Fix the model before widening it. I4 A5 L4 C4 E2 R1 (was 10) | **14** | `burn-down` (follow-up of #121) | `backend-engineer` + `system-architect` | path-e |
| 3 | **#122 PATHE-P06 signals 4-7** — unblocked by P05 (#121, loop 142); its "requires user role in run metadata" note applies to one signal only | **14** | `top-score` via `ceiling-cool-off: invoked` | `backend-engineer` | path-e |

**Recommendation:** 147 = pick 1 (burn-down). 148 = #331 (burn-down; recharge stays charged). 149 = #122 with the
cool-off — resuming product work on a model that no longer overfits. Do not spend the cool-off on #122 before #331.
Then: a "CI fails on skipped/too-few script tests" row (I4 A5 L2 C5 E1 R1 = 14) and a "busy confirm is announced and
bounded" row (I3 A4 L3 C4 E1 R1 = 12). #325 (12) after those. MR-062 after loop 149 under the 3-loop floor.

---

## 9. Q9 — CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | **Push** loops 137-146 (13 commits; live is `dcf7f0e`) | open; no remaining code blocker | delete in v2, retention gate, CI glob, Escape fix, Dockerfile fix |
| 2 | **Watch the first CI image build** after push | open; `c91ffdd` never built as an image | Dockerfile runner (MR-060 §5.1) |
| 3 | **Enable retention** — 3 steps (`SYSTEM_HEALTH.md:17-19`) **plus `CRON_SECRET` in the web container**; enter the URL with **no query string** | open; safe to start step 1-2 now; arm after pick 1 lands | makes the Terms line true |
| 4 | **Enable alerts**: `CRON_SECRET` + `ALERTS_CHECK_URL` | open | alerting |
| 5 | Brand name "Ledgerium AI" (#327) | open | brand gap |
| 6 | Extension end screen `ProcessScreen.tsx:502` (#327) — real-extension gate | open; extension untouched 103 loops | — |
| 7 | Chrome Web Store listing check (#327) | open, manual | — |
| 8 | #318 GitHub Pages on? | open, 5 minutes | delete 16 root HTML pages |
| 9 | #320 PDF gating | open | pricing consistency |
| 10 | #316 viewer definition | not urgent | — |
| 11 | #308 React Flow Pro or attribution | open | store compliance |
| 12 | #191 Stripe trial stacking | open | real charges |
| 13 | #57 target; email verification | open | #57 evaluation |
| 14 | #225, #277, secret charset, squat query, Stripe price IDs | open (one ops batch) | 4-5 rows |
| 15 | #12 fail-loudly deploy | open | `deletedAt` (#326(3)) |
| 16 | #271, #216 extension capture semantics | open | extension |
| 17 | #281 | open, waits on push | — |
| 18 | Contract claims (SLA, dedicated support, "never used for training") | open, unchanged | — |
| 19 | **Clause 9 reversal option** | applied `4a87223`; text exact; no objection recorded; reversal = revert one line | — |

---

## 10. Verdict

Every number reproduces at `ae44c81`: root 6049 on 2 of 2, web-app 4255 on 2 of 2, typecheck 0, validator clean (open
119), 37/37 script tests, the extracted CI step passes and fails where it should, production build exit 0. The clause 9
text is exactly MR-060 §2. Loop 145 closes every purge path but one — a query string in the URL variable — and its
counts are correct, cheap and slightly under-described. Loop 146 removes the lie without adding a trap, but its busy
state is silent and unbounded. Loop 144's floor counts files, not tests. Nothing reverts.

### Appendix — reproducing

```sh
git rev-list --count origin/main..main                                    # 13
git diff 4a87223^ 4a87223 -- CLAUDE.md | grep -c '^[-+][0-9]'             # 2 (one line out, one in)
grep -n "searchParams.get" apps/web-app/src/app/api/admin/retention/purge/route.ts   # :55, :64 (first value only)
node -e "console.log(new URL('https://h/p?mode=purge&dryRun=0&dryRun=1').searchParams.get('dryRun'))"   # 0
grep -c "#334" IMPROVEMENT_BACKLOG.md                                     # 0
awk '/^model Workflow /,/^}/' apps/web-app/prisma/schema.prisma | grep -c sourceUploadId.*index   # 0
```
