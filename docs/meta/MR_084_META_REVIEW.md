# MR-084 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 213-215, 2026-10-04 01:53 → 02:30 (−0600). Commits `2bb173a` (loop 213, #415), `fd90615` (loop 214,
#416), `5e18bbf` (loop 215, #366). Previous review MR-083 at `ca2b767`. Rows closed: #415, #416, #366. Rows filed by
loops: none. Rows amended: #377 (loop-215 append). Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-083 (`ITERATION_LOG.md`, loop 215 Controls). MR-083 also asked this review
to re-check the six score-10 rows it could not rank (#252, #307, #309, #329, #338, #346).
**Date:** 2026-10-04
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike, re-score or annotation below is a recommendation for the coordinator.
Declared exceptions to "no repo file touched", as at MR-075…083: mutants that only the repo's own tests can judge were
applied **in place** one at a time and restored in a `finally` block, with the sha256 of every mutated file compared
before the first and after the last mutant (identical in every run): `components/dashboard-v2/savedViewsSync.ts` (12
mutants), `components/dashboard-v2/DashboardV2Shell.tsx` (6 save-on-leave mutants + control; 8 range mutants + control),
`lib/range-settle.ts` (5 mutants, 2 controls), `lib/analytics.ts` (2 mutants), `components/dashboard-v2/ColumnPicker.tsx`
(6 mutants + control). The probes wrote rows into the e2e test database (`prisma/test.db`, untracked) and changed the
seeded user's dashboard preferences; the probes put them back (`restore 200` after each file) and every later Playwright
run reseeds the database. The probes and the e2e mutants ran against one dev server I started on 3098 with the exact
`webServer` environment of `playwright.config.ts`, after the deploy gate had finished; I stopped it at the end. Scratch
went only to `…/scratchpad/`, with one slip: the first run of `probe084c.spec.ts` wrote its log through a POSIX path that
Node resolved to `C:\c\Users\…\scratchpad\`; I moved that one file into the scratchpad (the directory already existed and
holds two older files that are not mine; I left them). Files:
- `qg084.sh` (the quality gate, then `test:e2e` one project at a time), outputs `install084.txt`, `val084.txt`,
  `guard084.txt`, `other084.txt`, `root084.txt`, `web084.txt`, `tc084.txt`, `e2e084public.txt`, `e2e084api.txt`,
  `e2e084authenticated.txt`, `port_before_*.txt`, `port_after.txt`; `status_before084.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver084.log`; `run084.sh` (flake runs, then the e2e mutants);
- `flaky084_persist_{1,2,3}.txt`, `flaky084_range_{1,2,3}.txt`;
- `mut084/sync415.mjs` (`sync415-rerun.txt`), `mut084/e2emut415.mjs` (`e2e415-rerun-leave-results.txt`): the loop-213
  agent's scripts with only the output path changed; `mut084/mut.mjs` (`range-results.txt`, `unit-results.txt`,
  `types-results.txt`, `a11y-results.txt`);
- `probe084.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe084a.spec.ts` and
  `probe084a2.spec.ts` (range wait, real routes) → `probe084a.raw.txt`; `probe084b.spec.ts` (axe and computed contrast,
  both themes; label in name) → `probe084b.raw.txt`; `probe084c.spec.ts` (axe over the 37 public routes, both themes) →
  `probe084c.raw.txt`;
- `empty-manifest.json`, `dup-manifest.json` (#346 check).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project, after the gate, and after stopping the dev server. Playwright ran one project at a
time.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 215 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6537 (214) | **320 files, 6537 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4769 | **274 files, 4769 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 410 rows, 289 struck, **open 121** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install) | not claimed | **exit 0**, "Done in 2.4s", no resolution | green |
| e2e `public` (whole project) | not claimed | **146 passed (6.7 min)** | green |
| e2e `api` (whole project) | not claimed | **14 passed (20 s)** | green |
| e2e `authenticated` (whole project) | not claimed (dashboard directory: 117 at 213, 121 at 214 and 215) | **215 passed, 2 skipped (10.9 min)** | green |
| deltas | web 4755→4765→4769→4769; root 6523→6533→6537; dashboard dir 112→117→121→121 | 213 +10 unit +5 e2e, 214 +4 unit +4 e2e, 215 0 (one test deleted, one added); authenticated 206→215 | consistent |

The deploy gate is green at `5e18bbf`: quality gate, then `test:e2e` **public 146, api 14, authenticated 215 + 2
skipped**. No flaky or retried test. The `batch rejected SyntaxError` teardown log appeared once in the authenticated
run, as at MR-078…083.

Pool arithmetic: MR-083 recorded 125 after its rows, 124 with #174 struck (applied). Loops 213-215 struck three
(#415, #416, #366) and filed none: **121**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build (all timings below are from the
dev server, where React Strict Mode fetches `/api/workflows` and the preferences twice per load), a real screen reader
or voice-control software (§4.3 uses axe's rule), production latency or field data for §3 (the PostHog key is unset and
loops 152-215 are not deployed), the live site (no `curl`).

---

## 1. Lead

1. **The three loops hold, and the push stays rollback-safe (§5).** No Prisma or API-route change in `ca2b767..5e18bbf`;
   `lib/` gains a type and a 20-line pure module; the view event gains two additive JSON properties.
2. **Loop 213's claims reproduce (§2).** All 12 MR-083 survivors are killed when I run the agent's scripts on a clean
   baseline, and the spec passed 36/36 three times at `--retries=0`.
3. **Loop 214's cap works with real routes, and leaves one visible defect (§3).** At normal latency the view is
   `stored` with `rangeWaitMs` 0-10; a held GET gives `cap` at 1000-1005 ms. But a preferences answer that arrives after
   the cap still switches the list: 5 rows at "All time" become 0 rows at "7d", the URL changes, and nothing is sent; the
   view event still says `all`. **Not acceptable as is; the fix is one condition (N2).**
4. **Loop 215's picker is clean in both themes in every state I opened, but its tests open only one (§4.1).** Three of its
   four colour fixes can be reverted without a test failing (N4).
5. **The default theme fails axe on two public pages that no spec scans (§4.2).** A sweep of the 37 public routes in
   the dark theme finds /docs (a 2.53:1 button and 7 colour-only links) and /terms (2 links). The public scan covers /
   and /pricing only. **N1 (11), the top pick.**
6. **Of the six unranked score-10 rows, three stay at 10, three fall (§6.1).** #252 → 9 (its item 1 is done), #338 → 7
   and blocked (no consumer of the decision engine), #346 → 7 (an empty manifest already fails). #251 stays 10.
7. **Selection followed the new pick-time rule both times, with both scores logged (§6).** #411 lost twice to 10s,
   correctly; it should be tied to the CEO's PostHog step, not to its score. Ratio, loops 206-215: **1.25**.

---

## 2. Loop 213 — #415 save on leave is proven, path by path (`2bb173a`): **HOLDS**

**Diff vs log:** matches (tests only: 5 e2e in the save-on-leave block, 10 unit cases with one trigger each; no product
file).

**Mutants re-run by me** on a clean baseline with the agent's own scripts (`mut084/sync415-rerun.txt`,
`e2e415-rerun-leave-results.txt`):

| Mutant | Observed | Verdict |
|---|---|---|
| U1-U12 (`savedViewsSync.ts`, judged by its unit file) | each fails 1-6 tests | **12/12 killed** (U1-U3, U5, U9, U11 were MR-083's survivors) |
| SH0 control | 9 passed | clean baseline |
| SH1 no `keepalive` | 6 fail | killed |
| SH2 visibility listener without capture | 2 fail (rejected-keepalive, ordering) | killed |
| SH3 no unmount flush | 1 fails (in-app navigation) | killed |
| SH4 no `pagehide` listener | 1 fails | killed |
| SH5 no in-flight dedupe | 1 fails | killed |
| SH6 a rejected keepalive treated as sent | 1 fails | killed |

Every mutated file identical after (sha256). The log's "all 12 MR-083 survivors are now killed" is exact.

**Flakiness:** `saved-views-persistence.spec.ts`, whole spec, `--retries=0`, three runs: **36/36, 36/36, 36/36**
(2.0-2.1 min); the first run was on a cold dev server, so the in-app navigation test met a cold `/upload` and passed.
`range-view-event.spec.ts` the same way: **9/9 ×3**.

**The navigation test's limit** (logged): it asserts that the first PUT is the keepalive, so if `/upload` takes longer
than ~400 ms to render after its warm-up, the page's own timer wins and the test fails rather than passing vacuously.
CI retries twice and also runs `next dev`; watch the first CI run after the push.

**Limits accuracy.** Accurate (the navigation timing; synthetic visibility events for the dedupe and ordering tests).

---

## 3. Loop 214 — #416 the range wait is capped at a second, and measured (`fd90615`): **HOLDS; a late answer flips the list (N2)**

**Diff vs log:** matches (`settleRange` with first-settle-wins; the cap timer starts at the workflows answer, ok or
not; `lib/range-settle.ts` with `RANGE_SETTLE_MAX_MS = 1000` and `rangeWaitMs`; two fields on `dashboard_v2_viewed`).
One count is off: "5 new" tests are 4 new plus 1 extended (the spec went from 3 to 7 tests; the URL test gained the
`url` / 0 assertions).

### 3.1 Real routes (no stubs)

Seeded user, real `/api/workflows` and `/api/dashboard/preferences`, stored range set by PUT, the preferences GET held
by `route.fetch()` then a delay (`probe084a.raw.txt`):

| Case | Loads | `rangeSettledBy` | `rangeWaitMs` | Rows after the workflows response | Verdict |
|---|---|---|---|---|---|
| stored `all`, no hold | 8 | stored | 0-8 | 268-297 ms | ✓ (the GET ends 39-49 ms before workflows) |
| stored `7d`, no hold | 8 | stored | 0-10 | (7d shows the empty state) | ✓ |
| `7d`, held 0.5 s | 3 | stored | 524-555 | — | ✓ |
| `7d`, held 0.9 s | 3 | stored | 923-931 | — | ✓ (just under the cap) |
| `7d`, held 1.5 s | 3 | **cap** | 1000-1005 | 997-1006 ms | ✓ |
| `7d`, held 3 s | 3 | **cap** | 1001 | 993-1003 ms | ✓ |

So normal latency → `stored` with a small wait, held → `cap` at ≈1000, as claimed; the worst-case delay is 1 s.

### 3.2 The late answer after the cap

In every held-1.5 s and held-3 s load, the select read "All time" with **5 rows** when the view was sent (`time_range
all`, `cap`); when the GET answered 0.5 s or 2 s later the select switched to **7d**, the list dropped to **0 rows** (the
seeded workflows are older than 7 days) and the URL became `?timeRange=7d`. **No event was sent** (6 of 6 loads). A
choice made after the cap and before the answer is kept (90d stays and is saved, `choice-after-cap`), because a pre-
baseline choice is recorded as pending.

Is it acceptable? **No.** The user watches the list they were given change under them, possibly to empty, with no
action of theirs; and the only view event describes the range they no longer see, so the `cap` views are exactly the ones
whose `time_range` is wrong. It is rare (only when the preferences answer comes more than 1 s after the workflows
answer; locally it comes ~40 ms before), which is why it scores 9, not higher. The fix is one condition: once the range
has settled by `cap` (or `failed`), do not apply a late stored range to the list, and do not save the shown range over
the stored one; the next visit shows the stored range. Mutant R13 below is that fix; it passes every current test,
so neither behaviour is pinned today. Do not add a correction event (MR-083 §4.3's reason stands). **N2** (9).

### 3.3 Mutants (`range-results.txt`, `unit-results.txt`, `types-results.txt`)

| Mutant | Judged by | Observed | Verdict |
|---|---|---|---|
| R0 control | range spec | 9 passed | clean |
| R1 view not gated | range spec | 2 fail | killed |
| R4 a preferences error does not settle | range spec | 2 fail | killed (MR-083 survivor) |
| R6 a user choice does not settle | range spec | 1 fails | killed (MR-083 survivor) |
| R7 cap back to 5 s | range spec | 1 fails | killed (MR-083 survivor) |
| R8 cap 600 ms | range spec | 2 fail | killed |
| R9 `rangeSettledBy` always `stored` | range spec | 5 fail | killed |
| R10 `rangeWaitMs` always 0 | range spec | 1 fails | killed |
| **R11** first settle does not win | range spec | passes | survived (near-equivalent: the view fires once) |
| **R12** the cap timer starts at mount, not at the workflows answer | range spec | passes | **survived** (every test stubs workflows to answer at once) |
| **R13** a late stored range is not applied after a settle | range spec | passes | survived (the N2 fix; nothing pins either behaviour) |
| G1 `rangeWaitMs` not rounded / G2 negative allowed | `range-settle.test.ts` | 1 fails each | killed |
| G3 `rangeSettledBy` widened to `string` | payload guard | 1 fails | **killed: the guard covers the new field** |
| G5 the module's union loses `user` | `tsc` | exit 2 | killed |
| **G4** the event's union gains a member the module never sends | `tsc` | exit 0 | survived (one-way drift; harmless, noted) |

`rangeWaitMs: number` is not a string, so the guard has nothing to check there; the two unions are written twice
(`analytics.ts` and `range-settle.ts`) and only a narrowing of the event's side is caught. R12's survival is the
anchor claim untested; N2's test should use a slow workflows answer to pin it too.

**Step 7.** 214 changed `lib/analytics.ts`, which the Step 7 bullet lists as needing the whole Playwright project; the
loop ran the dashboard directory (121). The change is type-only, and this review's whole `authenticated` run (215)
covers it. Recorded, not escalated.

**Limits accuracy.** Accurate (the generous hung-GET bound; "a late preferences answer after the cap still adopts the
stored range"). Not stated: that the adoption is visible and can empty the list, and that the cap's anchor is untested.

---

## 4. Loop 215 — #366 the column picker reads in both themes (`5e18bbf`): **HOLDS; three fixes untested (N4)**

**Diff vs log:** matches (`opacity-60` removed; disabled labels on `--content-secondary`; four `text-green-600` sites
on `--brand-text`; the last `test.fail` and the #105b twin deleted; a light drawer test added).

### 4.1 Both themes, every state (`probe084b.raw.txt`; real seeded user)

| State | Dark | Light |
|---|---|---|
| v2 page (`main`), axe | 0 | 0 |
| drawer open, axe | 0 | 0 |
| disabled label, computed | **7.38:1** | **4.55:1** (as logged) |
| save form open, axe | 0 | 0 |
| just after a save: axe; visual "Saved" status | 0; 9.84:1 | 0; 5.24:1 |
| rename form open: axe; Confirm-rename icon | 0; 9.84:1 | 0; 5.24:1 |
| rename input border (`border-green-500`, `ColumnPicker.tsx:347`) | 8.31:1 | **2.18:1** (below 3:1 for an input boundary; #377 item 2) |
| enabled checkbox accent (`text-green-600`, `:1059`) | 5.74:1 | 3.15:1 (passes 3:1) |

The log's Limit "saved-view forms are not scanned in light" is now measured: clean. But the tests do not open them:

| Mutant (`a11y-results.txt`, the two drawer tests) | Observed | Verdict |
|---|---|---|
| A1 `opacity-60` back | both fail | killed |
| A2 Save current view back to `text-green-600` | light test fails | killed |
| **A3** Confirm-rename icon back to `text-green-600` | passes | survived (rename form never opened) |
| **A4** Retry link back to `text-green-600` | passes | survived (error state never shown) |
| **A5** "Saved" status back to `text-green-600` | passes | survived (no save in the test; green-600 is 3.15:1 in light, a text failure) |
| A6 disabled label on `--content-tertiary` | passes | equivalent (tertiary measures 5.52 dark, 7.24 light) |

**N4** (9): the light test should save a view, open rename and show the error state, each scanned.

### 4.2 The defect class beyond the picker: public pages in the default theme

Loop 215's light scan was the first on the drawer. The same blind spot exists one level up: `e2e/public/a11y.spec.ts`
scans only / and /pricing in full. An axe sweep of all 37 routes in `PUBLIC_STATIC_ROUTES` (`page-width.spec.ts`),
full page (`probe084c.raw.txt`):

| Theme | Clean | Failing (critical/serious) |
|---|---|---|
| **dark (default)** | 35 of 37 | **/docs**: color-contrast 1 node, "Get started free" white on `bg-brand-500` #10b981 **2.53:1** (`(public)/docs/page.tsx:2166`, #377 item 4); link-in-text-block 7 nodes (1.55:1 against the text, colour only). **/terms**: link-in-text-block 2 nodes (the `mailto:` links) |
| light | 19 of 37 | 18 routes, 73 contrast nodes: /docs 33, /pricing 10 (was 26), /install 9, /security 6, /support 2, and 11 SEO/use-case pages with one shared badge (an inline-block, #047857 on its tint, 3.71:1); / is clean (was 11). This is #223's scope |

**N1** (11): loop the dark full-page scan over the route list, fix /docs and /terms. The light loop waits for #223.

### 4.3 Label in name (WCAG 2.5.3)

The "Save current view" trigger has `aria-label="Save current column configuration as a named view"`, which does not
contain its visible text, so a voice-control user who says what they see does not reach it. axe's
`label-content-name-mismatch` rule (not in axe's default set, so none of our scans runs it) on the dashboard flags 5
controls in total: that button, the portfolio sidebar toggle (`aria-controls=portfolio-sidebar`), a KPI tile, and the
health-score cell of each of the 3 rows. **N3** (8).

### 4.4 #377: what remains

ColumnPicker text sites: all fixed. Still failing: the rename input border (2.18:1 light, above); white on emerald-500 at
`SOPUsefulnessSurvey.tsx:25`, `analytics/product/page.tsx:179` (admin only) and the `SOPExecutionMode.tsx:575` icon (not
re-measured in a browser); the /docs button moves to N1. Passing, off-brand only: `KpiTileStrip.tsx:144` selected
border and the checkbox accent (green-600: 5.74 dark, 3.15 light, both above 3:1; computed from the tokens, since my DOM
probe picked another pressed button). PresetChipRail has no green left. The `dashboard/page.tsx` icon buttons exist only
on the v1 dashboard (`?v2=0`), which fails axe in both themes with **3 `select-name` (critical)** and 3 contrast nodes;
fix them by retiring v1 (#57), not one by one. **#377: 10 → 9**, append in §9.

**Limits accuracy.** Accurate (thin light margin, guarded; forms unscanned in light). Not stated: three of the four
colour sites have no test.

---

## 5. Rollback safety and mutation summary

**Rollback (213-215).** `git diff --stat ca2b767..5e18bbf -- apps/web-app/prisma apps/web-app/src/app/api` is empty;
under `lib/` only `analytics.ts` (two type fields) and the new `range-settle.ts`. 213 is tests only; 215 is CSS. 214
adds `rangeWaitMs` and `rangeSettledBy` to `dashboard_v2_viewed`; the events route stores properties as a JSON blob
(`filterProperties`, `route.ts:286`), and the only reader (`dashboard-v2-retirement-metrics.ts`) reads the event name
and `chipsRenderedCount`, so code now in production would read the new rows unchanged. **Verdict: rollback-safe; the
push stays rollback-safe.** The view series changes again at the push: with 212 alone a visitor could wait up to ~4.5
s; with 214 at most 1 s, so fewer views are lost in the wait than MR-083 §5 described.

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| `savedViewsSync.ts` vs its unit file | 12 | 12 | — |
| `DashboardV2Shell.tsx` save on leave vs its e2e | 6 + control | 6 | — |
| `DashboardV2Shell.tsx` / `range-settle.ts` range gate vs its e2e | 10 + control | 7 | R11 (near-equivalent), R12, R13 (N2) |
| `range-settle.ts` / `analytics.ts` vs unit and guard | 3 + control | 3 | — |
| the two unions vs `tsc` | 2 + control | 1 | G4 (one-way drift) |
| `ColumnPicker.tsx` vs the drawer tests | 6 + control | 2 | A3, A4, A5 (N4); A6 equivalent |

31 of 39 killed, 1 equivalent.

---

## 6. Governance

**Selection.**
- **213** `burn-down` #415 (10), MR-083's first pick, re-scored at pick time (unchanged), `qa-engineer` (the required
  rotation). ✓
- **214** `burn-down` #416 (10) instead of MR-083's #411 (9). Re-scored at pick time: window 209-213 has dashboard 2
  (210, 213), analytics 2 (209, 212), privacy 2 (209, 211), so neither takes −2; 10 beats 9. Departure logged with both
  scores. **Sound; the new Step 5 rule as written.**
- **215** `burn-down` #366 (10) instead of #411 again. Window 210-214: dashboard 3 (210, 213, 214) would have cost a
  dashboard row −2; #366 (a11y, 1) and #251 (analytics, 2) net 10, #411 9. Both scores logged; the tie between #366 and
  #251 broken by size and area. **Sound.**
- **#411, deferred twice — watch, do not force by score.** Nothing reaches PostHog until the key is set, and the key
  waits on the push and the CEO's project settings, so a 9 losing to 10s is the rule working. Its value is ordering:
  it must land before the key. Tie it to that event (§9 append): the first loop after the CEO sets the PostHog settings
  takes #411 whatever its score. A third deferral after that event would be a selection error.
- **Area labels:** they are free text with two tokens ("web-app / dashboard", "dashboard / test"), so the 3-of-5 count
  depends on which token the coordinator reads. Both loops read them consistently; no change proposed.

**Agents.** `qa-engineer` → `frontend-engineer` × 2. No 4+ run. If 216 is `frontend-engineer` it is 3 and 217 must
rotate; §11 assigns 216 to `qa-engineer`.

**Cool-off.** Held at **3/3** since loop 206. N1 at 11 is the top row under `burn-down` anyway (a follow-up of loop
215's class), so the cool-off still buys nothing. Hold.

**Ratio, loops 206-215** (same method as MR-069…083: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #405 (206), #410 (207), #408 (208), #389 (209), #381 (210), #402 (211), #406 (212), #415 (213), #416 (214), #366 (215) |
| Created | 8 | MR-081 #410, MR-082 #411-#414, MR-083 #415-#417 |
| Ratio | **1.25** | above the ≥ 0.5 floor |

**Pool.** 121 open (validator). This review files four rows: **125**. No strike.

**D-1.** Last extension touch `871e29a`: **172 loops** at 215, zero commits under the extension surfaces since.
Unanswered.

**Step 7 bullets.** 213 ran the dashboard directory (117) ✓; 214 changed `lib/analytics.ts` and ran the directory, not
the whole project (§3.3; covered here); 215 ran the directory (121) ✓. Class bullet: 215 listed the other opacity sites
and named the unscanned forms ✓, but did not test the states its own colour fixes live in (N4). MR-082 guard bullet:
214's new field is shown caught by the guard when widened (G3) ✓. MR-080 stored-format bullet: 214's Rollback line
says the properties are additive and names the reader ✓.

**"Undeployed: N loops"** in all three Controls blocks (62, 63, 64); Extension 170-172. **Primary-file and validation
lines** present in all three. Eighteenth consecutive window.

**MR-083 annotations:** closure notes #381/#402/#406, appends #251/#382/#366, the eight re-scores (#85, #106, #114,
#137, #168, #178, #135, #123) and the #174 strike are applied; #415-#417 filed at 10/10/9; the `coordinator.md` Step 5
sentence is in place. #106 was not marked parked (it stays open at 5; harmless).

**CHANGELOG.md** was last written at loop 149 (`8dd9866`); Step 8 lists it, and loops 150-215 (including everything the
push will ship) have no entry. Before the push, one catch-up entry for loops 152-215 would double as release notes;
otherwise drop CHANGELOG from Step 8. Recommendation only.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **87 ahead** of `origin/main` at `5e18bbf` (`git ls-remote` confirms the remote at `a14c5e8`; 88 once this review is committed; not 91); loops 152-215 (**64**) are not in production. The whole deploy gate passes locally; the push is rollback-safe (§5). Nothing blocks it |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (latest `37171882884`, 02:42Z), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (172 loops) |
| #399 | Consent scope | unchanged |
| #413 / #278 | PostHog | project region, "discard client IP data" / GeoIP, retention; then #411 (§9), then the key and a rebuild |
| — | Stored data | share tokens, tag names, system names in `AnalyticsEvent`: delete or redact; rotate live links or not (also gates #137) |
| — | `analytics` agent tooling | still Read/Grep/Glob/Edit/Write, no Bash: add it, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| — | Path E (#340, item 19) | now also blocks #338 (§6.1) |
| #225, #357, 22 / #347, P-1 | unchanged | |

**CI time.** Local: public 6.7 min, api 0.3, authenticated 10.9: about **17.9 min** (was 19.0). N1 adds a 37-route scan
(~2 min locally). The last CI run of the job took 11 min 9 s against `timeout-minutes: 30`.

### 6.1 Re-check of the score-10 rows (verified at `5e18bbf`)

| Row | Was | Check at HEAD | Now |
|---|---|---|---|
| #252 emission-site defects | 10 | (1) **mostly done**: since #298 the events route counts `signup_completed` and `checkout_started` from the server row only (`countsAsServerFact`, `events/route.ts:192`); the one-time `sku` checkout still enters the subscription funnel. (2) `teams/page.tsx:77` still fires `upgrade_prompt_viewed` directly; (3) `durationMs: SOP_DWELL_MS` (30000, `workflows/[id]/page.tsx:87-92`); (4) the bounce click counter is on the shell root only (`DashboardV2Shell.tsx:1122-1125`); (5) "Workflows Created" from event counts (`analytics/product/page.tsx:369`) | **9** |
| #307 the #57 page | 10 | still true: Insufficient data below 10 users, no "indicative below ~100" line, pooled counts under per-user rates (`page.tsx:784-820`) | 10 |
| #309 canvases and maps | 10 | still true: `WorkflowCanvas` / `WorkflowSwimlaneCanvas` set no `colorMode`; 21 dark `--wf-*` lines unreachable; the insights strip shows severity by a dot only | 10 |
| #329 department answers | 10 | still true: all 8 answers begin "Ledgerium measures where AI could fit" (`department.ts:72` … `:625`); primary `growth-strategist` has no Bash | 10 |
| #338 decision-engine refinements | 10 | no app or package depends on `@ledgerium/decision-engine`; nothing reaches a user; Path E scope | **7**, blocked on #340 (CEO item 19) |
| #346 guard manifest residue | 10 | (1) an empty manifest already fails (measured: exit 1, 6 errors); (2) a duplicated key passes (measured); (3) a deleted file needs its manifest line removed, visible in review; (4) docs | **7** |
| #251 delivery hazards | 10 | still true: terminal event in the last chunk (`analytics.ts:1075-1081`); a non-terminal fetch failure is dropped by its `catch` (~1107); the refusal branch unit-only | 10 |
| #81 route integration test | 10 | `route.test.ts` still mocks `workflow-metrics`, `metrics-input-adapter`, `health-scores` | 10 (spot check) |

---

## 7. Patterns

1. **A new scan covers the state the author opened.** 215 added a light scan of the open drawer; the rename form, the
   saved status and the error state carry three of its four fixes and are never opened (N4). The public scan covers the
   two pages it was written for, and the one public page with a default-theme failure is a third (N1). Same lesson as
   MR-083 §7.1, now for a11y: list the states and routes, then scan each.
2. **A cap fixes the wait and leaves the late answer.** 214 bounded the wait correctly and logged that a late answer
   still applies; nobody looked at what applying it does to a list already on screen (§3.2). A Limit that names a
   behaviour should say what the user sees.
3. **The pick-time rule works, and it starves ordering-critical 9s.** #411 has no harm until a CEO event; scoring
   cannot express "must precede X". Tie such rows to the event (§9), not to a higher score.

---

## 8. Part C — top open non-blocked rows

**Method (as MR-083):** every open row whose status is not blocked, awaiting, parked or CEO-gated, ranked by recorded
score with the re-scores of §6.1 and the new rows of §9; no window or area filter. #157, #127, #152, #159, #160 excluded
as malformed or CEO-gated, as before.

| Rank | Row | Score | Kind | Last checked | Verdict / evidence |
|---|---|---|---|---|---|
| 1 | **N1** public dark-theme scan; /docs and /terms | 11 | follow-up | MR-084 | true (§4.2) |
| 2 | #251 delivery hazards (1), (2), (5) | 10 | follow-up | MR-084 | true (§6.1) |
| 2 | #307 the #57 page | 10 | follow-up | MR-084 | true |
| 2 | #309 canvases and maps | 10 | follow-up | MR-084 | true |
| 2 | #329 department answers | 10 | follow-up | MR-084 | true; tool-less primary |
| 2 | #81, #84 | 10 | MR-promoted | MR-084 (#81), MR-078 (#84) | true / unchanged |
| 7 | **N2** late answer flips the list | 9 | follow-up | MR-084 | true (§3.2) |
| 7 | **N4** picker states untested | 9 | follow-up | MR-084 | true (§4.1) |
| 7 | #377 remainder | 9 | follow-up | MR-084 | re-scored (§4.4) |
| 7 | #252 | 9 | follow-up | MR-084 | re-scored (§6.1) |
| 7 | #411 (tied to the CEO's PostHog step), #417, #396, #371, #359, #356, #326, #294, #290, #287, #260, #237, #43 | 9 | follow-up | mixed | #411/#417/#396 true (MR-082/083); the rest not re-checked since MR-072 or earlier |
| — | **N3** label in name; #223, #382, #393, #412, #414 | 8 | follow-up | MR-084 (N3, #223) | #223 re-measured (§4.2); #393 gated on Umami |
| — | #338, #346 | 7 | follow-up | MR-084 | re-scored; #338 blocked |

MR-085 should re-check the 9s marked "not re-checked" before any of them is picked over a checked row.

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The default (dark) theme fails axe on two public pages, and the public axe scan covers 2 of the 37 public routes.** MR-084 §4.2. A full-page axe sweep of the 37 routes in `PUBLIC_STATIC_ROUTES` (`e2e/public/page-width.spec.ts`), dark theme, finds 35 clean and two failing: /docs, color-contrast on 'Get started free' (white on `bg-brand-500` #10b981, 2.53:1, `(public)/docs/page.tsx:2166`) and link-in-text-block on 7 links (1.55:1 against the surrounding text, so the links are told apart by colour only); /terms, link-in-text-block on its 2 `mailto:` links. `e2e/public/a11y.spec.ts` scans only / and /pricing in full, so neither page has been scanned. Fix as one outcome: run the dark full-page scan over `PUBLIC_STATIC_ROUTES` (move the constant to an e2e helper that both specs import), give 'Get started free' a background token that passes in both themes, and give in-text links a non-colour cue (an underline). Show the new scan failing on the old /docs and /terms. The light theme joins the loop when #223 lands (18 of 37 routes fail there today, measured the same way). Closes the /docs item of #377 (4). Run the whole public project (Step 7). Follow-up of loop 215's class (#366). | fix | public / a11y | `qa-engineer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| **N2** | **After the 1 s range cap fires, a late preferences answer still switches the list to the stored range, so rows already on screen change or vanish with no event, and the view event reports a range the user no longer sees.** MR-084 §3.2. Real routes, seeded user, stored range 7d, preferences GET held 1.5 s and 3 s: rows show at 'All time' (5 rows) about 1000 ms after the workflows response and the view is sent with time_range all, rangeSettledBy cap, rangeWaitMs 1000-1005; when the GET answers, the select switches to 7d, the list drops to 0 rows, the URL becomes ?timeRange=7d, and nothing is sent (6 of 6 loads). A choice made after the cap is kept and saved. Mutant: not applying a late stored range once the range has settled passes every test, and so does starting the cap timer at mount instead of at the workflows answer; neither behaviour is pinned. Fix as one outcome: once the range has settled by cap or failed, do not apply a late stored range to the list and do not save the shown range over the stored one (the next visit shows the stored range); no correction event. Tests: a GET held past the cap and then released leaves the select, the rows and the stored value unchanged with no preferences PUT; a workflows answer held 2 s shows the cap firing 1 s after that answer, not after mount. Only visits whose preferences answer comes more than 1 s after the workflows answer are affected (locally it comes about 40 ms before). Follow-up of loop 214 (#416). | fix | dashboard | `frontend-engineer` | 2 | 4 | 1 | 4 | 1 | 1 | **9** |
| **N3** | **Five dashboard controls have an accessible name that does not contain their visible label (WCAG 2.5.3), so a voice-control user cannot activate them by what they read.** MR-084 §4.3. axe's `label-content-name-mismatch` rule, which is not in axe's default set so no scan of ours runs it, on the v2 dashboard with the seeded user: the column picker's 'Save current view' button (accessible name 'Save current column configuration as a named view', `ColumnPicker.tsx` about line 627), the portfolio sidebar toggle (`aria-controls=portfolio-sidebar`), one KPI tile button, and the health-score cell of each of the 3 rows. Fix as one outcome: start each accessible name with the visible text (keep any extra explanation in `aria-describedby`), and enable `label-content-name-mismatch` in the dashboard axe scans in `v2-a11y.spec.ts` so the class stays fixed; show the rule failing on the old names. | fix | web-app / a11y | `frontend-engineer` | 2 | 3 | 1 | 4 | 1 | 1 | **8** |
| **N4** | **The light-theme column-picker scan (loop 215) opens only the drawer, so three of loop 215's four colour fixes have no test.** MR-084 §4.1. Mutants on `ColumnPicker.tsx` judged by the two drawer tests in `v2-a11y.spec.ts`: restoring `opacity-60` fails both and putting 'Save current view' back on `text-green-600` fails the light one, but the Confirm-rename icon, the Retry link and the visual 'Saved' status each back on `text-green-600` pass, because no test opens the rename form, shows the saved-views error state or scans just after a save. In light, green-600 is 3.15:1 on the drawer, below 4.5:1 for the 11 px status text. Measured now in both themes: axe clean in all three states, 'Saved' and Confirm-rename 9.84:1 dark and 5.24:1 light. Fix as one outcome, tests only: in both theme tests, save a view and scan with the status visible, open rename and scan, and fail the saved-views load and scan the Retry link; mutation proof for each of the three. Run the whole dashboard directory (Step 7). Follow-up of loop 215 (#366). | test | web-app / a11y | `qa-engineer` | 2 | 4 | 1 | 5 | 2 | 1 | **9** |

**Annotations recommended:**
- **#415 closure note:** "[MR-084: holds. The 12 MR-083 survivors re-run on a clean baseline with the loop's own scripts: U1-U12 killed by the unit file, SH1-SH6 killed by the save-on-leave block (SH1 by 6 tests, SH2 by 2, SH3-SH6 by 1 each); files identical after. The spec passed 36 of 36 three times at retries 0, the first run on a cold dev server. The in-app navigation test needs /upload to render within about 400 ms of its warm-up and fails, not passes, when it does not; CI retries twice.]"
- **#416 closure note:** "[MR-084: holds with real routes. No stubs: at normal latency the preferences GET ends about 40 ms before /api/workflows and the view is tagged stored with rangeWaitMs 0-10 (16 loads); held 0.5 s and 0.9 s it is stored with 524-555 and 923-931; held 1.5 s and 3 s it is cap with 1000-1005, rows 993-1006 ms after the workflows response. The payload guard rejects rangeSettledBy widened to string. Killed: no gate, an error or a choice not settling, a 5 s or 600 ms cap, settledBy fixed, rangeWaitMs 0. Survived: first settle not winning, the cap anchored at mount, and not applying a late stored range. A late answer after the cap switches the shown list, possibly to empty, with no event (MR-084 N2). The 5 new tests are 4 new and 1 extended. The loop changed lib/analytics.ts and ran only the dashboard directory; this review's whole authenticated project passed (215).]"
- **#366 closure note:** "[MR-084: holds. Disabled labels measure 7.38:1 dark and 4.55:1 light, as logged; axe is clean on the drawer, the save form, just after a save and the rename form in both themes. Restoring opacity-60 fails both drawer tests and Save current view back on green-600 fails the light one; the Confirm-rename icon, the Retry link and the Saved status back on green-600 pass every test (MR-084 N4).]"
- **#377 append:** "(MR-084) Re-measured at 5e18bbf in both themes. Fixed by loop 215: every ColumnPicker text site. Still failing: the rename input border-green-500 (ColumnPicker.tsx:347) is 2.18:1 on the light drawer, below 3:1 for an input boundary (8.31 dark); white on emerald-500 at SOPUsefulnessSurvey.tsx:25, analytics/product/page.tsx:179 (admin only) and the SOPExecutionMode.tsx:575 icon (not re-measured). Passing but off-brand: the KpiTileStrip.tsx:144 selected border and the ColumnPicker.tsx:1059 checkbox accent (green-600 is 5.74 dark and 3.15 light, both above 3:1). PresetChipRail has no green left. The dashboard/page.tsx icon buttons render only on the v1 dashboard (?v2=0), which also fails axe in both themes with 3 select-name (critical) and 3 contrast nodes; retire them with v1 (#57) rather than fix them. The /docs Get started free button moves to MR-084 N1."
- **#377 re-score:** "I/A/L/C/E/R = 2/4/1/5/2/1; total 9; reason: loop 215 fixed the ColumnPicker text sites, the /docs button moves to MR-084 N1 and the v1 sites go with v1; what remains is one light-theme input border at 2.18:1, two white-on-emerald-500 text sites (one admin-only) and one icon (MR-084)."
- **#252 re-score:** "I/A/L/C/E/R = 3/3/2/4/2/1; total 9; reason: item (1) is mostly done at 5e18bbf (since #298 the events route counts signup_completed and checkout_started from the server row only, countsAsServerFact; the one-time sku checkout at billing/checkout route.ts:218 still enters the subscription funnel). Items (2) teams/page.tsx:77, (3) the constant SOP_DWELL_MS 30000 sent as durationMs (workflows/[id]/page.tsx:87-92), (4) the bounce click counter on the shell root only (DashboardV2Shell.tsx:1122-1125) and (5) Workflows Created from event counts (analytics/product/page.tsx:369) are still true; take (3) and (4) first, both bias numbers the #57 page or a dwell analysis would read (MR-084)."
- **#307 append:** "(MR-084) Still true at 5e18bbf: the RetirementPanel (analytics/product/page.tsx:784-820) shows Insufficient data below 10 users but no indicative-below-100 guidance, and prints pooled bounces over views under the per-user rate. Since loop 214 dashboard_v2_viewed carries rangeSettledBy, so the page can also show the share of views settled by cap, whose time_range may not be what the user saw (MR-084 N2). Score unchanged (10)."
- **#309 append:** "(MR-084) Still true at 5e18bbf: WorkflowCanvas.tsx and WorkflowSwimlaneCanvas.tsx pass no colorMode, so the 21 dark --wf-* lines in globals.css stay unreachable. DfgFrequencyMap and WorkflowVariantStoryMap set colorMode light explicitly (a white canvas in both themes, per mapColors.ts), so following them means fixing the other two to light and deleting the dead dark values, or else opting all four into the theme. WorkflowInsightsStrip still shows severity by a small dot only. Score unchanged (10)."
- **#329 append:** "(MR-084) Still true at 5e18bbf: all eight department answers (department.ts:72, 151, 230, 309, 388, 467, 546, 625) begin 'Ledgerium measures where AI could fit'. The primary, growth-strategist, has no Bash, so the coordinator runs the tests and the authorship scan. Score unchanged (10)."
- **#338 re-score:** "I/A/L/C/E/R = 1/3/3/3/2/1; total 7; reason: at 5e18bbf no app or package depends on @ledgerium/decision-engine (only its own tests use it), so none of the refinements reaches a user, and item (6) already waits for a UI. Mark blocked on the Path E direction (#340, CEO item 19), like #123 and #135 (MR-084)."
- **#346 re-score:** "I/A/L/C/E/R = 1/3/1/4/1/1; total 7; reason: checked at 5e18bbf. (1) An empty manifest already fails (measured: exit 1, one error per unlisted file); (2) a duplicated key is collapsed silently by JSON.parse (a duplicate passed, measured); (3) deleting a guard file needs its manifest line removed in the same commit, which review sees; (4) is documentation. Only (2) is a real gap, and it needs a hand-edited duplicate (MR-084)."
- **#251 append:** "(MR-084) Re-checked at 5e18bbf, still 10: the terminal event still goes in the last chunk (analytics.ts:1075-1081), a non-terminal fetch failure is dropped by its catch (about line 1107, item 1), and the beacon-refusal branch is still unit-covered only (item 2). Loops 213-215 add nothing to the buffer."
- **#223 append:** "(MR-084) Re-counted at 5e18bbf: text-brand-400 once (under dark:), and text-brand-500, text-[#e2e8f0], text-amber-400, text-red-400 and text-green-400 zero times. A light-theme full-page axe sweep of the 37 public routes: / is now clean (was 11), /pricing has 10 nodes (was 26), and 18 routes fail with 73 nodes, led by /docs 33, /install 9 and /security 6; 11 SEO and use-case pages share one badge (an inline-block, #047857 on its tint, 3.71:1). When it lands, add the light theme to the MR-084 N1 route loop. Escape the literal pipe in this row's text when it is next edited."
- **#411 append:** "(MR-084) Deferred at loops 214 and 215 by the pick-time rule (9 against 10s), correctly: nothing reaches PostHog until the key is set. It must land before the key, so take it in the first loop after the CEO sets the PostHog project settings, whatever its score then."

No change to `CLAUDE.md` or the agent files is recommended.

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 all 12 MR-083 survivors killed on a clean baseline; 36/36 ×3 and 9/9 ×3 at retries 0 | #415 note |
| §2 navigation test depends on /upload rendering within ~400 ms | #415 note |
| §3.1 real routes: stored 0-10 ms, held 0.5/0.9 s stored 524-931, held ≥1.5 s cap ≈1000 | #416 note |
| §3.2 late answer after the cap switches the list (5 → 0 rows), URL changes, no event | N2 |
| §3.3 R12, R13 survive; R11 near-equivalent; G3 guard covers the field; G4 one-way union drift | N2 (R12, R13); #416 note |
| §3 log says 5 new tests, 4 new + 1 extended; 214 skipped the whole project for `lib/analytics.ts` | #416 note |
| §4.1 picker clean in both themes in every state; A3-A5 survive | #366 note; N4 |
| §4.1 rename input border 2.18:1 light | #377 append |
| §4.2 dark: /docs and /terms fail; public scan covers 2 of 37 | N1 |
| §4.2 light: 18 of 37 routes, 73 nodes; / clean, /pricing 10 | #223 append |
| §4.3 five label-in-name mismatches; no scan runs the rule | N3 |
| §4.4 #377 remainder; v1 (`?v2=0`) critical select-name | #377 append and re-score |
| §5 no prisma/api change; additive JSON properties; rollback-safe | CEO item 1 |
| §6 #411 deferred twice, correctly; ordering not score | #411 append |
| §6 CHANGELOG last written at loop 149 | recommendation (§6) |
| §6.1 six score-10 rows and #251 re-checked | #252, #338, #346 re-scores; #307, #309, #329, #251 appends |

---

## 11. Loop 216-218 picks

**The push is still unblocked.** The whole deploy gate is green locally at `5e18bbf` and the push is rollback-safe
(§5); 64 loops are undeployed. Also `CRON_SECRET` and the job URLs (item 4), D-1 (item 21), #399, the stored-data
decision, the PostHog project settings (#413) and a CHANGELOG catch-up before the push.

Pool 121 + 4 = 125 > 8. The cool-off stays **3/3**, held (§6). Re-score each pick at pick time (Step 5).

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **216** | **N1** public dark-theme scan over 37 routes; fix /docs and /terms | **11** | `burn-down` (follow-up of 215's class) | `qa-engineer` | public / a11y | the only default-theme axe failures found; one scan guards 35 more routes; a11y is 2 of 5 in 211-215, no penalty |
| **217** | **#251** send the terminal event first, alone; cover the refusal branch | **10** | `burn-down` | `frontend-engineer` | web-app / analytics | analytics 2 of 5 in 212-216, no penalty; protects the bounce the #57 decision reads |
| **218** | **#309** items (1)-(3): canvas colour mode, dead dark values, one dark axe pass on the maps | **10** | `burn-down` | `frontend-engineer` | web-app / a11y | a11y 2 of 5 in 213-217 (215, 216), no penalty; items (4)-(5) stay on the row |

- **Alternates:** N4 (9, `qa-engineer`) if 216's scan work makes it cheap to add the picker states in the same week;
  #307 (10) at 218 if the coordinator prefers the #57 page before the soak data exists; **#411 the first loop after the
  CEO sets the PostHog settings**, whatever the plan says; N2 (9) before the push if the coordinator wants the view series
  clean from day one.
- **Then MR-085** (base cadence after 218), then N2, N4, #377 remainder, #417, #396, #252 items (3)-(4), #382 (with the
  leave flush), #414, #412, N3, #223 (then light joins N1's loop).
- **Area check:** 216 public/a11y, 217 analytics, 218 a11y (a11y would be 3 of 5 at 219 with 215, 216, 218: a 219 a11y
  pick takes −2).
- **Agents:** `qa-engineer` → `frontend-engineer` → `frontend-engineer`; no 4+ run.
- **D-4:** N1 changes no copy (one class and a link style); #251 and #309 change no copy.
- **Do not pick:** #338 (blocked, §6.1); #346 at 7; #85, #135, #123, #137, #178 (blocked per MR-083); #106, #114 at 5;
  #413 before the CEO's PostHog settings; #89, #91 (Path C); #145, #142, #170, #175 (blocked); #159/#160 (CEO); #29
  without the D-1 answer; #393 while Umami is not wanted; #399 (CEO); #60 (architecture); #45 (icon decision); #61
  (production data); the dashboard/page.tsx items of #377 (retire v1 instead); any implementation row with a tool-less
  primary unless the coordinator runs the tests (#329).
- **Practice:** the full deploy gate every review; scan every state and route a change lives in, not the one opened
  while writing it; a Limit that names a behaviour says what the user sees; re-score a planned pick at pick time; tie
  ordering-critical rows to their event.

---

## 12. Verdict

Every count reproduces at `5e18bbf`: root 6537, web-app 4769 (both exit 0, no Errors line), typecheck 0, validator
clean (open 121), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **146 + 14 + 215 (2 skipped)**. 31 of 39 mutants killed (plus one equivalent); the survivors are
N2's two, N4's three, one near-equivalent and one harmless type drift.

- **Loop 213 holds:** all 12 MR-083 survivors are killed on a clean baseline, and the spec is stable (36/36 ×3).
- **Loop 214 holds with real routes:** `stored` with a few ms at normal latency, `cap` at ≈1000 when held, and the guard
  covers the new field. A late answer after the cap switches the list on screen with no event (N2, 9).
- **Loop 215 holds in both themes in every state I opened;** its tests open one of them (N4, 9). One level up, the
  default theme fails on /docs and /terms, which no spec scans (N1, 11). Five controls fail label-in-name (N3, 8).
- **The push stays rollback-safe.** No stored format changed beyond two additive event properties.
- **The six unranked 10s:** #307, #309, #329 stay; #252 → 9; #338 → 7 and blocked; #346 → 7. #251 stays 10.

Selection followed the pick-time rule correctly twice; #411's deferral is the rule working, and it should be tied to the
CEO's PostHog step. Cool-off held (3/3), ratio 1.25. Asks for the CEO: **push now** (87 ahead, 64 loops); PostHog project
settings, then #411, then the key; `CRON_SECRET` and the job URLs; D-1, #399, stored data, Umami, Path E and the
`analytics` agent's tools. For the coordinator: N1, #251, #309; the four rows, the three re-scores, the eight appends
and the three closure notes; a CHANGELOG catch-up before the push.

### Appendix — reproducing

```sh
S=<scratchpad>
pnpm install --frozen-lockfile --offline                                           # exit 0
node scripts/validate-backlog.mjs                                                  # exit 0, open 121
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6537 / 4769 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 146 passed (6.7 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 215 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
(cd apps/web-app && node $S/mut084/sync415.mjs)                                    # 12 of 12 killed; file identical
(cd apps/web-app && node $S/mut084/mut.mjs unit)                                   # G1-G3 killed
(cd apps/web-app && node $S/mut084/mut.mjs types)                                  # G5 killed, G4 survives
sh $S/devserver.sh &                                                               # the webServer env on 3098
sh $S/run084.sh                                     # spec x3 at retries 0; SH1-SH6 killed; range R1-R10 killed, R11-R13 survive; A1-A2 killed, A3-A6 pass
(cd apps/web-app && pnpm exec playwright test -c $S/probe084.config.ts --project=probe-range)   # real-route range wait
(cd apps/web-app && pnpm exec playwright test -c $S/probe084.config.ts --project=probe-axe)     # both themes, all picker states, label in name
(cd apps/web-app && pnpm exec playwright test -c $S/probe084.config.ts --project=probe-sweep)   # 37 public routes, both themes
node scripts/run-guard-tests.mjs --manifest $S/empty-manifest.json                 # exit 1 (#346 item 1)
gh run list --limit 8; gh secret list; git ls-remote origin main                   # CRON_SECRET absent; remote a14c5e8
git log origin/main..main --oneline | wc -l                                        # 87
```
