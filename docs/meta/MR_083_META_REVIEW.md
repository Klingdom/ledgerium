# MR-083 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 210-212, 2026-10-03 23:51 → 2026-10-04 00:26 (−0600). Commits `dcecbc6` (loop 210, #381),
`d0c5be4` (loop 211, #402), `557313a` (loop 212, #406). Previous review MR-082 at `ed4859a`. Rows closed: #381, #402,
#406. Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-082 (`ITERATION_LOG.md`, loop 212 Controls). MR-082 also asked this review
to re-score the score-11 audit rows from the code.
**Date:** 2026-10-04
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike, re-score or annotation below is a recommendation for the coordinator.
Declared exceptions to "no repo file touched", as at MR-075…082: mutants that only the repo's own tests can judge were
applied **in place** one at a time and restored in a `finally` block, with the sha256 of every mutated file compared
before the first and after the last mutant (identical in every run): `components/dashboard-v2/savedViewsSync.ts` (12
mutants), `components/dashboard-v2/DashboardV2Shell.tsx` (13 mutants, 2 controls, one swap to the pre-loop-212 version
`557313a~1` for an A/B timing run, one mutant re-run under probe P7), `components/shared/AnalyticsConsent.tsx` (5
mutants, 1 control). The probes wrote rows into the e2e test database (`prisma/test.db`, untracked) and changed the
seeded user's dashboard preferences; the preferences were put back by the probe (`restore 200`, columns and range as
before) and every later Playwright run reseeds the database. The probes ran against a dev server I started on 3098
with the exact `webServer` environment of `playwright.config.ts`; no other run shared it. Scratch went only to
`…/scratchpad/`:
- `qg083.sh` (the quality gate, then `test:e2e` one project at a time), outputs `install083.txt`, `val083.txt`,
  `guard083.txt`, `other083.txt`, `root083.txt`, `web083.txt`, `tc083.txt`, `e2e083public.txt`, `e2e083api.txt`,
  `e2e083authenticated.txt`, `port_before_*.txt`, `port_after.txt`; `status_before083.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver083.log`;
- `probe083.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe083a.spec.ts`
  (P1-P9, save on leave) → `probe083a.raw.txt`; `probe083a3.spec.ts` (P3, reconcile, corrected) → `probe083a3.raw.txt`;
  `probe083a7.spec.ts` (P7, client navigation) → `probe083a7.raw.txt`; `probe083b.spec.ts` (B1-B4, consent banner) →
  `probe083b.raw.txt`; `probe083c.spec.ts` (range timing) → `probe083c.head.txt`, `probe083c.parent3.txt`;
- `mut083/sync.mjs` (`sync-results.txt`), `mut083/e2emut.mjs` (`e2e-leave-results.txt`, `e2e-range-results.txt`,
  `e2e-consent-results.txt`), `mut083/a7sh3.mjs` (`a7sh3.txt`), `mut083/parent2.mjs` (`parent.txt`);
  `audit083.mjs` (open audit-intake rows by score).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project and after stopping the dev server. Playwright ran one project at a time.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 212 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6523 | **319 files, 6523 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4755 | **273 files, 4755 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 407 rows, 285 struck, **open 122** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install) | not claimed | **exit 0**, "Done in 2.3s", no resolution | green |
| e2e `public` (whole project) | 146 (agent, 211) | **146 passed (7.2 min)** | matches |
| e2e `api` (whole project) | not claimed | **14 passed (21 s)** | green |
| e2e `authenticated` (whole project) | not claimed (dashboard directory: 109 at 210, 112 at 212) | **206 passed, 2 skipped (11.4 min)** | green |
| deltas | web 4748→4755→4755→4755; root 6516→6523; public 141→146; authenticated 201→206; dashboard dir 107→109→112 | 210 +7 unit +2 e2e, 211 +5 e2e, 212 +3 e2e | consistent |

The deploy gate is green at `557313a`: quality gate, then `test:e2e` **public 146, api 14, authenticated 206 + 2
skipped**. No flaky or retried test. The `batch rejected SyntaxError` teardown log appeared once in the authenticated
run, as at MR-078…082.

Pool arithmetic: MR-082 recorded 125 after its rows (#411-#414 filed). Loops 210-212 struck three (#381, #402, #406)
and filed none: **122**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build, a real screen reader (the
banner was checked through Chromium's accessibility tree over CDP, §3), production latency or any field data for §4
(the PostHog key is unset and loops 152-212 are not deployed), the live site (no `curl`).

---

## 1. Lead

1. **The three loops hold, and the push stays rollback-safe (§5).** No Prisma, API-route or `lib/` change in
   `ed4859a..557313a`; the save-on-leave PUT is the same whole-document body as the normal PUT; loops 211 and 212 store
   nothing new.
2. **Save on leave works on every path I tried, but its tests protect only one (§2).** A flight, a pending range, a
   reconcile in progress, two quick hides and a 450-event analytics buffer all end with the change on the server. The
   most common way to leave, an in-app link, is covered only by the unmount flush, and deleting that flush passes every
   test while a probe then loses the change. 5 of 6 shell mutants and 6 of 12 unit mutants survive (**N1**).
3. **The range wait costs nothing at normal latency and up to 4.5 s in the tail (§4).** Locally the preferences GET
   (~63 ms) ends ~50 ms before `/api/workflows` (~115 ms), so rows and the view event appear exactly when they did
   before loop 212. Each second the preferences GET runs past the workflows response is a second everyone waits for
   the rows, and a visitor who leaves in that window records no view and no bounce, capped at 5 s from mount.
   **Recommendation: keep the gate, cap it at 1 s after the workflows response, and put the wait on the view event so
   production shows its size (N2).** Do not emit a "pending" view plus a correction event.
4. **The reopened banner passes a keyboard and accessibility-tree pass; two gaps (§3).** A footer request while the
   first-visit banner is up drops focus to the body after the choice, and the dialog has no description, so a screen
   reader hears "Analytics consent, What is sent, link" without the sentence (**N3**).
5. **None of the five score-11 audit rows survives a re-score from the code (§6.1).** Four fall to 5-6, #174 is
   already built on /analytics/product (strike), and two score-10 PATHE rows belong with their blocked siblings. The
   cool-off has nothing to buy: **hold it**.
6. **Part C has been hiding rows.** Since MR-072 it skipped "older rows outside this window's area"; nine open,
   non-blocked rows at 10 (#251, #252, #307, #309, #329, #338, #346, #366, plus #81/#84 since MR-078) have not been
   ranked for ten reviews, while five stale 11s headed it (§8).
7. **Selection was mostly sound.** 212's departure from MR-082's plan was correct; the plan's arithmetic was wrong
   (§6). Ratio, loops 203-212: **1.11** (10 closed / 9 created). 213 must rotate off `frontend-engineer`.

---

## 2. Loop 210 — #381 a change survives leaving the page (`dcecbc6`): **HOLDS; its tests cover one path (N1)**

**Diff vs log:** matches (`flushOnLeave` on `visibilitychange` (window, capture), `pagehide` and unmount; `planLeaveFlush`
/ `hasUnsent` / `settleLeaveSuccess` / `buildPreferencesBody` in `savedViewsSync.ts`; `confirmedColumns`; 60 KiB cap;
7 unit tests; 2 e2e).

**Breaking it** (`probe083a*.raw.txt`; workflows stubbed, real preferences route, seeded user):

| Probe | Observed | Verdict |
|---|---|---|
| **P1** leave during a flight: toggle, wait 700 ms (the PUT is sent, its answer held 1.5 s), toggle again, leave | the flush carries both toggles; the server holds both | ✓ |
| **P2** leave with a pending range (choose 7d, leave at once) | one PUT; server range `7d` | ✓ |
| **P3** leave during a reconcile (first PUT hangs to the 15 s timeout, the re-send gets 500, the reconcile GET is held 3 s; toggle in the hold; leave) | flush at +17.4 s with both toggles; the server holds both; the late GET answer is not adopted | ✓ |
| **P4** leave right after a reconcile adopted the server's state | no PUT; server unchanged (the unsaved toggle had been rolled back with it) | ✓ |
| **P5** hide, show, hide with one state | one keepalive PUT (the second hide is deduped), then the armed timer's identical PUT 384 ms later, **while still hidden** | ✓; duplicate measured |
| **P6** hide, show, change, hide | two keepalive PUTs with different bodies 61 ms apart (both 200), then the timer's PUT equal to the second | ordering race possible (below) |
| **P7** client-side navigation: toggle, click the in-app Upload link inside 400 ms | one PUT; the change is stored. **With the unmount flush deleted: 0 PUTs, the change is lost** | ✓ at HEAD; **no test (N1)** |
| **P8** keepalive quota on a real navigation: a bounce visit (a range chosen by `selectOption`, no click) with 0 / 60 / 150 / 450 extra buffered events (~300 B each) | 0 and 60 (30 KB): all events and the bounce delivered. 150 (75 KB) and 450: one 49 KB chunk delivered, **the bounce lost**. The preferences PUT (~0.7 KB) reached the server in all four | PUT ✓; the bounce loss is #251 item (5), pre-existing |
| **P9** quota on a tab hide (page alive), 450 extra events | the preferences PUT goes first (200, as claimed: window capture beats the analytics document listener); then beacon 48.7 KB accepted, 49.6 KB refused, 353 events kept in the buffer for a later drain | ✓ |

**The keepalive quota.** On a real navigation the order is `beforeunload` (the analytics drain), `pagehide`
(preferences flush, then the bounce), `visibilitychange`. So the loop's "the preferences listener takes the shared quota
before the analytics flush" holds for a tab hide (P9) but not for a navigation, where the analytics buffer drains first
in `beforeunload`. It did not matter in any probe: the preferences body is small and was stored every time. A normal
buffer holds at most 10 events (~3 KB; it flushes at 10 or after 2 s), so the bounce is lost only when the buffer is
already far larger than one chunk, which is #251 item (5): send the terminal event first, alone. The flush adds ~0.7 KB
to that budget, not a new hazard. **#251 append.**

**Is the duplicate PUT harmful?** No. It is the same whole document; the route replaces it idempotently. If another tab
wrote in between, the duplicate overwrites that write, but the timer's PUT would have done the same without the flush
(last-write-wins, #382). P6's two in-flight keepalive PUTs with different bodies can land in either order; in P6 the
timer's PUT 390 ms later repeats the newer body and repairs a wrong order, but after a real navigation no timer runs.
**#382 append.**

**Mutants** (`mut083/sync-results.txt`, `e2e-leave-results.txt`):

| Mutant | Judged by | Observed | Verdict |
|---|---|---|---|
| U4 `hasUnsent` ignores the armed timer | unit | 1 fails | killed |
| U6 `settleLeaveSuccess` does not confirm columns | unit | 1 fails | killed |
| U7 no `edits` bump | unit | 1 fails | killed |
| U8 size cap ×100 | unit | 1 fails | killed |
| U10 `settleSuccess` ignores the sent columns | unit | 1 fails | killed |
| U12 `settleLeaveSuccess` clears a newer pending list | unit | 1 fails | killed |
| **U1** `hasUnsent` ignores a pending range | unit | passes | **survived** |
| **U2** … ignores a pending list | unit | passes | **survived** |
| **U3** … ignores `dirty` | unit | passes | **survived** |
| **U5** `settleLeaveSuccess` keeps the range pending | unit | passes | **survived** |
| **U9** `adoptServerList` forgets the server pack | unit | passes | **survived** |
| **U11** `reconcileAdopt` does not confirm server columns | unit | passes | **survived** |
| SH1 no `keepalive` flag | save-on-leave e2e | 1 fails | killed |
| **SH2** visibility listener without capture | e2e | passes | **survived** (the order claim is untested) |
| **SH3** no unmount flush | e2e | passes; P7 then loses the change | **survived** |
| **SH4** no `pagehide` listener | e2e | passes | **survived** (`visibilitychange` covers a navigation) |
| **SH5** no in-flight dedupe | e2e | passes | **survived** |
| **SH6** a rejected keepalive treated as sent | e2e | passes | **survived** |

U1-U3 survive because the unit test that says "a column change, a pending list or a range **each** make the flush send"
builds one state with all of them. **N1** (10).

**Limits accuracy.** Accurate (last-write-wins; rejected unmount flush lost; unsaved columns not shown). Two
corrections: the duplicate PUT follows while the tab is still hidden, not only "on return"; and the quota-order claim
holds for a hide, not for a navigation. Not stated: the unmount path, the rejection path and the dedupe have no test.

---

## 3. Loop 211 — #402 the reopened consent banner takes and returns focus (`d0c5be4`): **HOLDS; two gaps (N3)**

**Diff vs log:** matches (requester stored on request; first focusable element focused with `preventScroll`; every
close path restores; fallback `[data-analytics-preferences]`; first visit never focused; 5 e2e).

**Keyboard and accessibility tree on /pricing** (`probe083b.raw.txt`; Chromium's AX tree over CDP):

| Probe | Observed | Verdict |
|---|---|---|
| B1 Enter on the footer "Analytics preferences" (a choice stored) | focus on "What is sent" inside the banner | ✓ |
| B1 AX tree | dialog "Analytics consent": paragraph with the sentence and link "What is sent", then buttons Keep current choice, Decline PostHog, Accept. **Dialog description: none** (no `aria-describedby`); `aria-live=polite`, not modal | **gap (N3)** |
| B1 Tab from the first control | Keep current choice → Decline PostHog → Accept → body → top of the page; the banner stays open (non-modal) | ✓ |
| B1 Escape | closes; focus back on the footer button | ✓ |
| B2 requester removed from the DOM, then Accept | focus on `body` (the fallback finds nothing: the footer button was the only requester) | expected; no better target exists |
| B2b "What is sent" → client navigation to `/privacy#analytics` → Escape | the banner survives the navigation; Escape returns focus to the footer button of the new page | ✓ |
| **B3** no choice yet: the first-visit banner is up (focus stays on the page, ✓); Enter on the footer | focus moves into the banner; Escape does nothing (by design: a first choice is required); **after Decline PostHog focus is on `body`** | **✗ (N3)** |
| B4 375 px: reopen from the footer, open the phone drawer by keyboard, Tab into it, Escape once | the drawer closes with focus on its toggle **and** the banner closes (Keep current choice) | acceptable (no data changes; focus lands on the top layer's trigger) |

**B3 cause.** `close()` restores focus only when `reopened`, and `reopened` is `getAnalyticsConsent() !== null`, false
before the first choice; the requester was recorded and focus was moved anyway.

**Screen reader.** The loop kept focus on the link "because it is read before the choice". In the AX tree the focused
node is the link with no description, and the dialog has none either, so on focus a screen reader announces the
dialog's name and "What is sent, link"; the sentence before it is read only by moving back. `aria-describedby` on the
dialog fixes that.

**Mutants** (`e2e-consent-results.txt`, the whole `analytics-consent.spec.ts`, 12 tests with setup):

| Mutant | Observed | Verdict |
|---|---|---|
| C1 `close()` does not restore focus | 2 fail (Escape, Keep current choice); Accept and Decline still pass because the same-tab consent subscriber also restores | killed |
| C5 no focus move on reopen | 4 fail | killed |
| C2 no fallback when the requester is gone | passes | survived (untested; B2 shows it rarely has a target) |
| C3 first-visit guard removed | passes | equivalent: the banner is not mounted when that effect first runs |
| C4 the consent-subscriber restore removed | passes | survived (covered by `close()`; two restore paths) |

**Step 7.** `AnalyticsConsent` is mounted on every page (through `PostHogProvider`), so the whole `public` and
`authenticated` projects apply; the loop ran `public` (146), this review ran both.

**Limits accuracy.** Accurate (focus on the link; only the footer requester covered). Not stated: the first-visit
footer request, the missing description.

---

## 4. Loop 212 — #406 the dashboard shows and reports the range you chose (`557313a`): **HOLDS; the trade-off measured (N2)**

**Diff vs log:** matches (`rangeSettled` set by an explicit `?timeRange=`, the preferences GET loaded or failed, a user
choice, or `RANGE_SETTLE_MAX_MS` 5 s from mount; the list shows loading and `dashboard_v2_viewed` waits until then;
3 e2e). **Revert proof reproduced:** with the pre-212 shell (`557313a~1`) in place, `range-view-event.spec.ts` fails
1 (the held-GET test).

### 4.1 What the wait costs

Seeded user, real `/api/workflows` and `/api/dashboard/preferences`, warm dev server; first rows detected by a
MutationObserver; view time from the event's own timestamp (`probe083c.head.txt`, `probe083c.parent3.txt`). The same
probe ran against HEAD and against the pre-212 shell swapped in place:

| Preferences GET held | Pre-212: rows after the workflows response (median) | HEAD: same | Added by loop 212 |
|---|---|---|---|
| no hold (12 loads) | 281 ms | 273 ms | **0** (the GET, ~63 ms, ends 43-67 ms before workflows, ~115 ms) |
| +0.5 s (4 loads) | 309 ms | 529 ms | +0.22 s |
| +1.5 s | 305 ms | 1528 ms | +1.22 s |
| +3 s | 309 ms | 3019 ms | +2.71 s |
| +7 s (the 5 s cap fires) | 311 ms | 4784 ms | +4.47 s |

The view event fires 10-25 ms after the rows in both versions. So:

- **Time to rows for everyone:** unchanged while the preferences GET finishes within ~270 ms after the workflows
  response (the skeleton floor and render absorb it). Beyond that, every millisecond is added to every user's wait,
  up to ~4.5 s when the GET hangs. Both routes hit the same server and database, and preferences is a one-row read, so
  the normal case is the first row of the table; the tail is a slow or locked preferences query.
- **Views and bounces lost:** a visit counts only if it outlasts the wait, so the loss is the share of visits that end
  inside `max(0, preferences end − workflows end − ~270 ms)`. Locally that window is 0, so nothing is lost. No field
  data exists to size it in production (the PostHog key is unset, our table there is not readable from here, and loop
  212 is not deployed).
- **Bias:** a dropped visit removes one view and, if it was a bounce, one bounce from `lib/dashboard-v2-retirement-metrics.ts`
  (paired bounces / views per user). Fast leavers are mostly bounces, so the rate can only be biased **down**, and only
  by visits in the window above. This matches `lib/bounce.ts`'s own definition ("a page that never finished loading is
  not a bounce"): a visitor who left during the hold saw a loading list. `elapsedMsSinceDashboardView` now starts at the
  rows, which is what the #57 click-time reading should use.

### 4.2 Mutants (`e2e-range-results.txt`, the whole spec)

| Mutant | Observed | Verdict |
|---|---|---|
| R1 view not gated / R2 list not gated / R3 cap 0 ms | the held-GET test fails | killed |
| R5 an explicit URL range does not settle | the URL test fails | killed |
| **R4** a preferences error does not settle (falls to the cap) | passes (rows after 5 s still beat the test's timeout) | **survived** |
| **R6** a user choice during the hold does not settle | passes | **survived** |
| **R7** cap 60 s | passes | **survived** |

### 4.3 Recommendation: keep the gate; cap it at 1 s after the workflows response; measure the wait

- **Keep** the gate: without it the list shows the default range for the length of the preferences GET and the view
  event reports it (the pre-212 shell fails the held-GET test; that is the defect #406 recorded).
- **Shorten and re-anchor the cap:** settle at the preferences answer or **1000 ms after the workflows response,
  whichever comes first** (now: 5 s from mount). Worst-case extra wait for everyone falls from ~4.5 s to 1 s, and so
  does the window in which a view can be lost; a stored range that arrives later still replaces the default (the
  logged Limit), now tagged.
- **Measure instead of guessing:** add `rangeWaitMs` (a number: workflows response to settle, 0 when nothing waited)
  and `rangeSettledBy` (closed union: url, stored, failed, user, cap) to `dashboard_v2_viewed`. Read both after 14 days
  of production data; if `rangeWaitMs` p95 is above 300 ms, look at the preferences query, not the gate.
- **Reject "emit the view at once tagged pending, then a correction":** it doubles view events, every reader (the
  retirement metrics pair one bounce with one view) would need new pairing logic, and the pending event would still
  carry a range the user may never see.
- Add tests for the three survivors (error settles at once, a choice settles, the cap fires). **N2** (10).

**Limits accuracy.** Accurate (the select reads "All time" during the hold; a late GET after the cap; no unit test).
Not stated: the cap is measured from mount, not from the data, and the error, choice and cap exits are untested.

---

## 5. Rollback safety and mutation summary

**Rollback (210-212).** `git diff --stat ed4859a..557313a -- apps/web-app/prisma apps/web-app/src/app/api apps/web-app/src/lib`
is empty. 210's keepalive PUT is `buildPreferencesBody`, the body the normal PUT already sent; 211 stores nothing;
212 changes when an existing event fires, not its shape. **Verdict: rollback-safe; the push stays rollback-safe.** One
consequence to state: 212 changes the view and bounce series at the push (views of visitors who leave during the wait
disappear), so a before/after bounce comparison across the deploy is not like-for-like until N2's `rangeWaitMs`
exists. The PostHog key rule of MR-082 is unchanged.

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| `savedViewsSync.ts` vs its unit file | 12 | 6 | U1, U2, U3, U5, U9, U11 (N1) |
| `DashboardV2Shell.tsx` save on leave vs its e2e | 6 + control | 1 | SH2-SH6; SH3 loses a change in P7 (N1) |
| `DashboardV2Shell.tsx` range gate vs its e2e | 7 + control | 4 | R4, R6, R7 (N2) |
| `AnalyticsConsent.tsx` vs the consent e2e | 5 + control | 2 | C2 (untested), C4 (redundant path); C3 equivalent |

---

## 6. Governance

**Selection.**
- **210** `burn-down` #381 (10), MR-082's first pick, `frontend-engineer`. ✓
- **211** `burn-down` #402 (9 → **7** with the privacy penalty the coordinator applied), MR-082's second pick. The log
  says nothing else at 9+ was ready outside the area; #406 (9) was, and was taken at 212. Picking a 7 over a 9 because
  the plan said so is the error. Small, self-corrected next loop.
- **212** `burn-down` #406 (9) instead of MR-082's #411. **Sound.** With 211 labelled privacy, #411 at 212 was privacy
  3 of 5 (209, 211, 212) → 7. MR-082's "privacy is back to 1 of 5 by 212" assumed 211 would be labelled a11y. The
  plan's arithmetic was wrong, not the departure, and the departure was logged with its reason.
- **Rule from both:** a review's planned pick is re-scored at pick time with the penalties as they then stand; the
  higher net score goes first and the departure is logged (§9 text for `coordinator.md`).

**Agents.** `frontend-engineer` × 3 (210-212): **213 must rotate** (the 212 Controls say so). No 4+ run.

**Cool-off.** Held at **3/3** since 206. It buys a `top-score` pick over the burn-down rule, and no re-scored audit row
is worth it (§6.1; best is #168 at 8). Hold; it does not expire.

### 6.1 Re-score of the open audit-intake rows at ≥ 10 (verified at `557313a`)

`audit083.mjs` lists 31 open rows with Birth `audit-intake*` and score ≥ 10, plus #85 (`MR-013-promoted`, one of
MR-082's five). 22 are marked blocked; their blockers still hold (no ADR-ADMIN-AUDIT file under `docs/`, no `bullmq`
in `apps/web-app/package.json`, CEO item 19 open): #91, #108, #124, #125, #128-#134, #136, #138, #142, #143, #145,
#146, #149, #151, #169, #170, #175. Not re-scored. The ten others:

| Row | Was | Check at HEAD | Now |
|---|---|---|---|
| #85 envelope ratchet | 11 (dimensions give 9) | `route.ts:797` still returns the bare shape; 62 of 74 route files never return `error: null`; one consumer; reason is Path C R+4 consistency | **6**, blocked on #91 |
| #106 workflow detail panel | 11 | no panel; a row opens `/workflows/[id]`, which shows the detail; 400-600 LOC; driver (AI landing zone) waits on AI Vision D-01…04 | **5**, park for a ux decision |
| #114 live output on /pricing | 11 | none on /pricing; /product already renders a full demo report from a fixture; no conversion data | **5** |
| #137 embeddable map | 11 | no `/embed` route; the #350 exemption hook exists; needs the share-token/stored-data decision, a frame-ancestors origin policy and the Path E map (only `DemoProcessMap` exists) | **5**, blocked (CEO) |
| #174 alerts strip | 11 | **already built** on /analytics/product (`page.tsx:271-471`: firing count, Show all / Hide ok alerts; admin-gated) | **strike** |
| #168 high-intent badges | 10 | no badges; the action half opens #169/#170's modals (both blocked) | **8** (badges only) |
| #178 demo reset | 10 | no endpoint; reuses the PR-9 audit pattern, which does not exist | **6**, blocked on #169 |
| #135 Mermaid + agent spec | 10 | no Mermaid renderer (BPMN only); consumes the Path E merged graph | 10, **blocked (CEO item 19)** like its siblings |
| #123 decision signals 8-12 | 10 | `decision-detector.ts` has human_judgment and retry from other signals, not 8-12; Path E scope | 10, **blocked (CEO item 19)** |

Every intake 11 was an estimate of a feature's distinctiveness, not of a defect's cost; checked against the code, none
outranks the follow-ups. Re-score bullets in §9.

**Agents' tools.** All primaries in the window have Bash. `analytics` still has none (CEO queue).

**Step 7 bullets:** 210 ran the dashboard directory (109) ✓ (not every page); 211 changed a component on every page and
ran the whole `public` project (146), not `authenticated`; this review ran it (206). 212 ran the dashboard directory
(112) ✓. The MR-080 stored-format bullet: no stored format changed in the window; the 210 Limits line says so ✓. The
MR-082 class bullet: 210 fixed one leave path's class ("any leave") and tested one member (hard navigation); its
Limits line did not name the in-app link, the rejection or the dedupe as untested (N1).

**Directory saturation:** `components/dashboard-v2/DashboardV2Shell.tsx` (210, 212), `savedViewsSync.ts` (210),
`components/shared/AnalyticsConsent.tsx` (211), `e2e/app/dashboard/` (210, 212), `e2e/public/analytics-consent.spec.ts`
(211). The shell has been changed by 203, 210 and 212. **Area** rolling five (208-212): a11y, privacy, dashboard,
privacy/a11y, web-app/analytics. For 213 the window is 209-213: privacy already 2 (209, 211), so a privacy pick at 213
takes −2; at 214 (window 210-214) it does not.

**MR-082 annotations:** closure notes #410/#408/#389 and appends #278/#17/#38/#44 present; the
`ANALYTICS_ARCHITECTURE.md` status line and the `coordinator.md` Step 7 bullet are applied; #411-#414 filed verbatim at
9/8/9/8.

**"Undeployed: N loops"** in all three Controls blocks (59, 60, 61); Extension 167-169. **Primary-file and validation
lines** present in all three (exit codes, "no Errors line", e2e counts, port check, validator, guard runner).
Seventeenth consecutive window.

**Density / follow-ups:** none filed by loops; no trigger.

**Ratio, loops 203-212** (same method as MR-069…082: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #103 (203), #407 (204), #409 (205), #405 (206), #410 (207), #408 (208), #389 (209), #381 (210), #402 (211), #406 (212) |
| Created | 9 | loop 203 #406, MR-080 #407-#409, MR-081 #410, MR-082 #411-#414 |
| Ratio | **1.11** | above the ≥ 0.5 floor |

This review files three rows and recommends one strike: **125 open** after the rows, **124** if #174 is struck.

**D-1.** Last extension touch `871e29a`: **169 loops** at 212, zero commits under the extension surfaces since. Still
unanswered.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **83 ahead** at `557313a` (84 once this review is committed); loops 152-212 (61) are not in production. The whole deploy gate passes locally; the push is rollback-safe (§5). Nothing blocks it |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (latest `37171882884`), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (169 loops) |
| #399 | Consent scope | unchanged |
| #413 / #278 | PostHog | choose the project region, "discard client IP data" / GeoIP and retention; then, after the push and #411, the key and a rebuild (MR-082 order) |
| — | Stored data | share tokens, tag names, system names in `AnalyticsEvent`: delete or redact; rotate live links or not (also gates #137) |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**CI time.** Local: public 7.2 min, api 0.4, authenticated 11.4: about **19.0 min** (was 18.2). The last CI run of the
job took 11 min 9 s against `timeout-minutes: 30`; watch the first run after the push.

---

## 7. Patterns

1. **Tests follow the path the author exercised, not the paths users take.** 210 tested a hard navigation to
   `about:blank`; users leave by in-app links, which only the unmount flush covers. 212 tested the URL and the
   stored-range exits, not the error, choice and cap exits. 211 tested a reopen, not a first-visit request. Each loop's
   revert proof was real; each guard covered the member its author pictured (MR-082 §7.2, again).
2. **Inherited filters hide work.** Part C's "outside this window's area" exclusion (MR-072) silently removed nine
   score-10 rows from every later ranking, while five intake 11s that no review had checked stayed on top. A ranking
   that does not list a row is a decision nobody made.
3. **A plan is a forecast; the rules decide at pick time.** MR-082's plan assumed an Area label the coordinator then
   chose differently; 211 followed the plan into a −2, 212 corrected it. §9 makes the pick-time re-score explicit.

---

## 8. Part C — top open non-blocked rows

**Method (changed):** every open row whose status is not blocked, awaiting, parked or CEO-gated, ranked by recorded
score with the re-scores of §6.1 and the new rows of §9; no window or area filter; a "last checked" column so an
unchecked row is visible as such. #157, #127, #152, #159, #160 excluded as malformed or CEO-gated, as before.

| Rank | Row | Score | Kind | Last checked | Verdict / evidence |
|---|---|---|---|---|---|
| 1 | **N1** save-on-leave test gaps | 10 | follow-up | MR-083 | true (§2) |
| 1 | **N2** range-wait cap and measurement | 10 | follow-up | MR-083 | true (§4) |
| 1 | #366 dimmed picker rows fail contrast | 10 | follow-up | MR-083 | true: `ColumnPicker.tsx:1031` `opacity-60`; `test.fail` at `v2-a11y.spec.ts:772` |
| 1 | #251 delivery hazards (1), (2), (5) | 10 | follow-up | MR-083 (item 5) | true: P8 loses the bounce once the buffer passes one chunk |
| 1 | #377 green-600 (theme-token scope, MR-074) | 10 | follow-up | MR-082 | unchanged |
| 1 | #346 guard manifest residue | 10 | follow-up | MR-067 | **not re-checked since** |
| 1 | #252, #307, #309, #329, #338 | 10 | follow-up | MR-072 | **not re-checked since** |
| 1 | #81, #84 | 10 | MR-promoted | MR-078 | unchanged then |
| 13 | #411, #396, #371, #359, #356, #326, #294, #290, #287, #260, #237, #43; **N3** | 9 | follow-up | mixed | #411 true (MR-082); #396 now unblocked (#381 shipped); N3 true (§3) |
| — | #168 | 8 | audit | MR-083 | re-scored (§6.1) |

MR-084 should re-check the six rows marked "not re-checked since" before any of them is picked.

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The save-on-leave flush (loop 210, #381) has no test for its most common path, a client-side navigation, nor for a rejected keepalive or the one-flush-per-body dedupe, and its unit tests never isolate a single trigger.** MR-083 §2. Mutants on `DashboardV2Shell.tsx` judged by the save-on-leave e2e: deleting the unmount flush passes every test, and a probe that toggles a column and clicks the in-app Upload link inside 400 ms then finds the change lost (0 PUTs; at HEAD 1 PUT and the change stored); treating a rejected keepalive as sent, dropping the `pagehide` listener, dropping the in-flight dedupe and registering the visibility listener without capture each pass too; only removing `keepalive` fails. Mutants on `savedViewsSync.ts`: `hasUnsent` ignoring a pending range, a pending list or `dirty`, `settleLeaveSuccess` keeping the range pending, `adoptServerList` forgetting the server pack and `reconcileAdopt` not confirming the server columns each pass the unit file, because the test that says each trigger makes the flush send builds one state holding all of them. Fix as one outcome, tests only: an e2e that changes a column, follows an in-app link inside 400 ms and finds the change stored; an e2e that aborts the keepalive on a tab hide and shows the next hide sends it again; an e2e that two hides of one state send one flush; unit cases with exactly one trigger each (armed timer, dirty, pending list, range, columns) and for the adopt and reconcile confirm paths. Mutation proof for each. Run the whole dashboard directory (Step 7). Follow-up of loop 210 (#381). | test | dashboard / test | `qa-engineer` | 2 | 4 | 2 | 5 | 2 | 1 | **10** |
| **N2** | **The dashboard's range wait (loop 212, #406) is capped at 5 s from mount, so a slow preferences GET delays the rows for every user by up to ~4.5 s and drops the view (and any bounce) of a visitor who leaves meanwhile; the wait is not measured, and three of its exits have no test.** MR-083 §4. Measured locally on the seeded user (real routes): the preferences GET (~63 ms) ends 43-67 ms before `/api/workflows` (~115 ms), so at normal latency the gate adds 0 ms (rows 273 ms after the workflows response; the pre-212 shell 281 ms). With the GET held 0.5, 1.5, 3 and 7 s, rows and the view come 0.22, 1.22, 2.71 and 4.47 s later than with the pre-212 shell, whose rows never waited. Mutants judged by `range-view-event.spec.ts`: a preferences error that no longer settles (falls to the cap), a user choice that no longer settles, and a 60 s cap each pass. Fix as one outcome: settle at the preferences answer or 1000 ms after the workflows response, whichever comes first (not 5 s from mount); add `rangeWaitMs` (a number: workflows response to settle, 0 when nothing waited) and `rangeSettledBy` (a closed union, not `string`: url, stored, failed, user, cap) to `dashboard_v2_viewed`, accepted by the payload guard; keep the gate itself. Tests: a preferences 500 shows rows within 1 s; a choice during a held GET shows rows at once and is kept; a hung GET shows rows 1 s after the workflows response, tagged cap. After 14 days of production data read `rangeWaitMs`: if its p95 is above 300 ms, look at the preferences query. Do not emit a pending view plus a correction event. Follow-up of loop 212 (#406). | fix | dashboard / analytics | `frontend-engineer` | 2 | 4 | 3 | 4 | 2 | 1 | **10** |
| **N3** | **A footer request while the first-visit consent banner is showing moves focus into the banner but drops it to the page body after the choice, and the banner's explanation is not announced when focus enters it.** MR-083 §3. Measured on /pricing with no stored choice: Enter on the footer 'Analytics preferences' moves focus to 'What is sent'; after Decline PostHog focus is on `body`, because `close()` restores only when `reopened`, which is false before the first choice. On every reopen Chromium's accessibility tree shows dialog 'Analytics consent' with no description and focus on the link 'What is sent', so a screen reader announces the dialog name and the link but not the sentence before it (no `aria-describedby`). Fix as one outcome in `AnalyticsConsent.tsx`: restore focus whenever a requester was recorded, not only when reopened; give the paragraph an id and the dialog `aria-describedby` pointing at it. Tests: an e2e for the first-visit footer request returning focus after each choice; an assertion that the dialog's accessible description is the sentence. Run the whole public and authenticated projects (the banner is on every page, Step 7). Follow-up of loop 211 (#402). | fix | a11y | `frontend-engineer` | 2 | 3 | 1 | 5 | 1 | 1 | **9** |

**Annotations recommended:**
- **#381 closure note:** "[MR-083: holds on every path probed. Leave during a flight, with a pending range, during a held reconcile GET, and right after a reconcile adopted: the server ends with the latest state each time (no PUT in the last case). Two hides of one state send one flush; the armed timer then sends an identical PUT 384 ms later while still hidden (harmless: same document). On a tab hide the preferences PUT takes the keepalive quota before the analytics beacon; on a navigation the analytics drain runs first in beforeunload, and the ~0.7 KB PUT was stored even with 450 buffered events. An in-app link inside 400 ms saves the change through the unmount flush, but deleting that flush passes every test, as do a rejected keepalive treated as sent, no pagehide listener, no dedupe and a non-capture listener; 6 of 12 unit mutants survive because one test combines all triggers (MR-083 N1).]"
- **#402 closure note:** "[MR-083: holds. Footer, Enter: focus on What is sent; Tab runs Keep current choice, Decline PostHog, Accept, then out (non-modal); Escape returns focus to the footer, also after a client navigation to /privacy. Accept and Decline restore through both close() and the same-tab consent subscriber. Gaps: a footer request while the first-visit banner is up drops focus to body after the choice, and the dialog has no description, so a screen reader hears the link but not the sentence (MR-083 N3). At 375 px one Escape closes the phone drawer and the reopened banner together; focus lands on the drawer toggle.]"
- **#406 closure note:** "[MR-083: holds; revert proof reproduced (the pre-212 shell fails the held-GET test). Measured locally: the preferences GET (~63 ms) ends before /api/workflows (~115 ms), so rows and the view appear when they did before (273 vs 281 ms after the workflows response). Held 0.5, 1.5, 3 and 7 s, rows and the view come 0.22, 1.22, 2.71 and 4.47 s later, for every user, and a visitor leaving in that window records no view and no bounce. A preferences error that falls to the cap, a choice during the hold and a 60 s cap all pass the tests. Recommended: keep the gate, cap it 1 s after the workflows response, add rangeWaitMs and rangeSettledBy to the view (MR-083 N2).]"
- **#251 append:** "(MR-083) Item (5) measured on a real navigation with a bounce visit: with 60 extra buffered events (30 KB) all events and the bounce were delivered; with 150 (75 KB) or 450 only one 49 KB chunk went out and the bounce was lost. The loop-210 preferences PUT (~0.7 KB, sent on pagehide before the bounce) was stored in every case, so it is not the cause; a normal buffer holds at most 10 events (~3 KB). The fix stands: send the terminal event first, alone."
- **#382 append:** "(MR-083) Loop 210 adds a second writer per tab: two hides with a change between send two keepalive PUTs with different bodies 61 ms apart, outside the single-flight queue, and they can land in either order. In a live tab the armed timer re-sends the newer body ~390 ms later and repairs it; after a navigation nothing does. The revision and 409 should cover the leave flush too."
- **#366 append:** "(MR-083) Still true at 557313a: ColumnPicker.tsx:1031 dims disabled rows with opacity-60 and v2-a11y.spec.ts:772 still carries test.fail for it. Missing from Part C since MR-077; restored."
- **#85 re-score:** "I/A/L/C/E/R = 2/3/2/4/3/2; total 6; reason: still true at 557313a (route.ts:797 returns the bare shape), but 62 of 74 route files never return error null, the only consumer is DashboardV2Shell, and the stated reason is Path C R+4 consistency, which is blocked with #91; the recorded 11 does not match its own dimensions (9). Mark blocked on Path C R+4 (#91) (MR-083)."
- **#106 re-score:** "I/A/L/C/E/R = 3/3/2/3/4/2; total 5; reason: still absent at 557313a; a row opens /workflows/[id], which already shows the detail; 400-600 LOC with architect and growth reads; its stated driver, a landing zone for AI recommendations, waits on the AI Vision decisions D-01 to D-04. Park until ux-designer decides a panel beats the workflow page (MR-083)."
- **#114 re-score:** "I/A/L/C/E/R = 3/3/2/2/3/2; total 5; reason: no live output on /pricing at 557313a, but /product already renders a full demo report from a fixture (DemoAnnotatedReport), and no conversion data shows the pricing page needs a second copy; if built, reuse that fixture with report analytics off (#412) and no invented figures (MR-083)."
- **#137 re-score:** "I/A/L/C/E/R = 3/3/2/3/3/3; total 5; reason: no /embed route at 557313a; security-headers.js has the exemption hook #350 left for it, but a frameable public map needs the CEO's share-token and stored-data decision, a frame-ancestors origin policy, and the interactive map, which exists only as DemoProcessMap until Path E. Mark blocked on the stored-data decision and CEO item 19 (MR-083)."
- **#168 re-score:** "I/A/L/C/E/R = 2/3/2/4/2/1; total 8; reason: still no badges at 557313a; the action-menu half opens the trial-extension and quota-boost modals of #169 and #170, both blocked (no ADR-ADMIN-AUDIT file); admin-only. The badge half stands at 8; the action half waits with #169 (MR-083)."
- **#178 re-score:** "I/A/L/C/E/R = 2/3/1/3/2/1; total 6; reason: no demo-reset endpoint at 557313a; it reuses the PR-9 audit pattern, which does not exist (#169 blocked, no ADR-ADMIN-AUDIT file), and scripts/seed-demo-account.ts already re-seeds. Mark blocked on #169 (MR-083)."
- **#135 re-score:** "I/A/L/C/E/R = 3/4/2/4/2/1; total 10 (unchanged); reason: no Mermaid renderer at 557313a (BPMN export only); it consumes the Path E merged ProcessGraph, so it belongs with its PATHE siblings. Mark blocked on CEO item 19 (MR-083)."
- **#123 re-score:** "I/A/L/C/E/R = 4/5/3/3/3/2; total 10 (unchanged); reason: decision-detector.ts emits human_judgment from automation classes and retry from friction, not signals 8-12; Path E scope like its blocked siblings. Mark blocked on CEO item 19 (MR-083)."
- **#174 strike:** "(MR-083) Already built: /analytics/product (app/(app)/analytics/product/page.tsx:271-471, admin-gated) fetches /api/admin/alerts and renders the firing count with an expandable list (Show all, Hide ok alerts). The row's premise that an admin must hit the API manually is stale; a copy on /admin/operations would be a link, not a row."
- **`.claude/agents/coordinator.md`, Step 5, append to the end of the line that begins** `The iteration log's "Candidate Selection" block MUST state which rule drove the selection` **(after** `or` `` `directed`. `` **) the sentence:** "A meta-review's planned pick is re-scored at pick time with the saturation penalty and rotation as they then stand; if another eligible row now nets higher, take it and log the departure with both scores (MR-083)."

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 P1-P4: flight, pending range, reconcile in progress, after reconcile; all end with the latest state | #381 note |
| §2 P5/P6: dedupe holds; timer duplicate while hidden; two keepalive PUTs can reorder | #381 note; #382 append |
| §2 P7 + SH3: in-app link saved only by the unmount flush, which no test protects | N1 |
| §2 SH2, SH4-SH6 and U1-U3, U5, U9, U11 survive | N1 |
| §2 P8/P9: quota order holds for a hide, not a navigation; PUT always stored; bounce lost beyond one chunk | #381 note; #251 append |
| §3 B1, B2b, B4: keyboard pass; Escape; client navigation; drawer and banner close together | #402 note |
| §3 B3: first-visit footer request drops focus | N3 |
| §3 no dialog description | N3 |
| §3 C2/C4 survive, C3 equivalent | #402 note |
| §4.1 wait costs 0 at local latency, up to 4.5 s in the tail; views lost only in that window; bias down | #406 note; N2 |
| §4.2 R4, R6, R7 survive | N2 |
| §4.3 keep, 1 s cap after workflows, rangeWaitMs / rangeSettledBy; reject pending + correction | N2 |
| §5 no prisma/api/lib change; rollback-safe; bounce series shifts at the push | CEO item 1; N2 |
| §6 211 picked 7 over 9; 212 departure sound; plan arithmetic wrong | coordinator.md text (§9) |
| §6.1 audit rows re-scored | #85, #106, #114, #137, #168, #178, #135, #123 re-scores; #174 strike |
| §8 Part C hid nine score-10 rows | Part C method (§8); #366 append; MR-084 re-check list |

---

## 11. Loop 213-215 picks

**The push is still unblocked.** The whole deploy gate is green locally at `557313a` and the push is rollback-safe (§5);
61 loops are undeployed. Also `CRON_SECRET` and the job URLs (item 4), D-1 (item 21), #399, the stored-data decision,
and the PostHog project settings (#413).

Pool 122 + 3 = 125 > 8. The cool-off stays **3/3**, held (§6). 213 must leave `frontend-engineer`.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **213** | **N1** save-on-leave test gaps | **10** | `burn-down` (follow-up of 210) | `qa-engineer` | dashboard / test | rotation; protects the in-app leave path that a deleted line silently breaks |
| **214** | **#411** sign-out resets PostHog with a new device id, before the page view | **9** | `burn-down` (follow-up of 209) | `security-reviewer` | analytics / privacy | privacy is 1 of 5 in 210-214, no penalty; recommended before the key |
| **215** | **N2** range-wait cap 1 s after workflows; `rangeWaitMs`, `rangeSettledBy` | **10** | `burn-down` (follow-up of 212) | `frontend-engineer` | dashboard / analytics | the measurement should exist before the push starts the #57 soak data |

- **Alternates:** 213 `#346` (10, `qa-engineer`, test-infra) after MR-084's re-check; 215 `N3` (9, a11y) or `#366`
  (10, a11y) if the coordinator counts 214 as analytics and N2 would take −2.
- **Then MR-084** (base cadence after 215), then **#366**, **N3**, **#396** (unblocked by #381), **#251** item (5),
  **#382** (with the 409 handling and the leave flush), **#414**, **#412**, **#377** with theme tokens, #413 once the
  CEO sets the PostHog project.
- **Area check:** 213 dashboard/test, 214 privacy, 215 dashboard/analytics.
- **Agents:** `qa-engineer` → `security-reviewer` → `frontend-engineer`; no 4+ run.
- **D-4:** N1 and #411 change no copy; N2 adds two event properties, no copy.
- **Do not pick:** #85, #135, #123, #137, #178 (blocked per §6.1); #174 (strike); #106, #114 at 5; #413 before the
  CEO's PostHog settings; #89, #91 (Path C); #145, #142, #170, #175 (blocked); #159/#160 (CEO); #29 without the D-1
  answer; #393 while Umami is not wanted; #399 (CEO); #60 (architecture); #45 (icon decision); #61 (production data);
  #252, #307, #309, #329, #338, #346 before MR-084 re-checks them; any implementation row with a tool-less primary.
- **Practice:** the full deploy gate every review and whole projects on shared plumbing (Step 7); test each exit and
  each path users take, not the one the author used; a guard is shown failing on each shape it claims; re-score a
  planned pick at pick time; annotations are final text.

---

## 12. Verdict

Every count reproduces at `557313a`: root 6523, web-app 4755 (both exit 0, no Errors line), typecheck 0, validator
clean (open 122), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **146 + 14 + 206 (2 skipped)**. 13 of 30 mutants killed (plus one equivalent); the survivors are
N1, N2 and two untested restore paths.

- **Loop 210 holds:** every leave I tried ends with the latest state on the server, including a 450-event analytics
  buffer; the in-app link path, the rejection path and the dedupe have no test (N1, 10).
- **Loop 211 holds:** keyboard and accessibility-tree pass on the reopened banner; a first-visit footer request loses
  focus and the dialog has no description (N3, 9).
- **Loop 212 holds, and its cost is zero at normal latency:** the preferences GET ends before the workflows GET.
  In the tail it delays everyone up to ~4.5 s and drops views in that window. Keep the gate, cap it 1 s after the
  workflows response, and measure the wait on the view event (N2, 10).
- **The push stays rollback-safe.** No stored format changed.
- **The audit 11s were estimates:** re-scored from the code, none stays above 8; #174 is already built. Part C's area
  filter hid nine score-10 rows; the method is fixed here.

Selection was sound apart from 211 following the plan into a penalty; 212's departure was right. Cool-off held (3/3),
ratio 1.11. Asks for the CEO: **push now**; PostHog project settings, then the key after #411; `CRON_SECRET` and the job
URLs; D-1, #399, stored data, Umami and the `analytics` agent's tools. For the coordinator: N1, #411, N2; the three
rows, the re-scores, the #174 strike, the five appends and the `coordinator.md` Step 5 text; MR-084 re-checks the six
unranked score-10 rows.

### Appendix — reproducing

```sh
S=<scratchpad>
pnpm install --frozen-lockfile --offline                                           # exit 0
node scripts/validate-backlog.mjs                                                  # exit 0, open 122
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6523 / 4755 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 146 passed (7.2 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 206 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
(cd apps/web-app && node $S/mut083/sync.mjs)                                       # 6 of 12 killed; file identical
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && node $S/mut083/e2emut.mjs leave)                               # SH1 killed; SH2-SH6 survive
(cd apps/web-app && node $S/mut083/e2emut.mjs range)                               # R1-R3, R5 killed; R4, R6, R7 survive
(cd apps/web-app && node $S/mut083/e2emut.mjs consent)                             # C1, C5 killed; C2-C4 pass
(cd apps/web-app && pnpm exec playwright test -c $S/probe083.config.ts --project=probe-leave)   # P1-P9
(cd apps/web-app && node $S/mut083/a7sh3.mjs)                                      # P7 without the unmount flush: 0 PUTs
(cd apps/web-app && pnpm exec playwright test -c $S/probe083.config.ts --project=probe-timing)  # HEAD timings
(cd apps/web-app && node $S/mut083/parent2.mjs)                                    # pre-212 shell: held-GET test fails; timings
(cd apps/web-app && pnpm exec playwright test -c $S/probe083.config.ts --project=probe-banner)  # B1-B4
node $S/audit083.mjs audit                                                         # open audit-intake rows >= 10
gh run list --limit 10; gh secret list                    # CRON_SECRET absent; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 83
```
