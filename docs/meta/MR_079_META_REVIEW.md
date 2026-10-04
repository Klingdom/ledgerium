# MR-079 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 198-200, 2026-10-03 17:09 → 18:11 (−0600). Commits `ce0c70f` (loop 198, #400), `4aab8d1`
(loop 199, #397), `d826d08` (loop 200, #401). Previous review MR-078 at `10abf8b`. Rows closed: #400, #397, #401.
Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-078 (`ITERATION_LOG.md`, loop 200 Controls). Loop 200 is also the
milestone for the loop 171-200 retrospective (§7).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared
exception to "no repo file touched", as at MR-075…078: mutants that only the repo's own tests can judge were applied
**in place** one at a time, each restored in a `finally` block, with `git hash-object` of all four files compared
before and after the whole run (identical): `DashboardV2Shell.tsx` (2 mutants), `app/(public)/product/page.tsx` (1),
`lib/posthog.ts` (1), `lib/analytics.ts` (1), all e2e. The mutants and probes ran against a dev server I started on 3098
with the exact `webServer` environment of `playwright.config.ts` (stub PostHog key and host); no other run shared it.
Scratch went only to `…/scratchpad/`:
- `qg079.sh` (the quality gate), outputs `root079.txt`, `web079.txt`, `tc079.txt`, `val079.txt`, `guard079.txt`,
  `other079.txt`; `e2e079pub.txt`, `e2e079api.txt`, `e2e079auth.txt`; `status_before079.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver079.log`;
- `probe079.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `ph079.ts` (MR-078's
  `posthog.e2e.test` route stub plus the raw decoded body of every request) and the specs `probe079p.spec.ts` (P1
  decline / re-accept device id, stored state, `visitorId` in any body; P2 campaign tags), `probe079w.spec.ts` (W1 two
  real slugs per dynamic public route; W2 authenticated pages at 320/375), `probe079x.spec.ts` (W3 overflow culprits),
  `probe079y.spec.ts` (W4 header accessible names), `probe079v.spec.ts` (V1-V4 view chip break attempts); outputs
  `probe079*.raw.txt`;
- `mut079/run.mjs` (outputs `mut079/*.txt`, `mut079/results.txt`, `mut079/hash_before.txt`).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 afterwards (checked before each Playwright project and after stopping the dev server). Playwright ran one project
at a time; free memory was 3.4 GB when the dev server started.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 200 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6467 (198) | **317 files, 6467 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4697 | **270 files, 4697 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 395 rows, 272 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| e2e `public` (whole project) | 140 (agent, 200) | **140 passed (6.8 min)** | matches |
| e2e `api` (whole project) | not claimed | **14 passed (20 s)** | green |
| e2e `authenticated` (whole project) | 149 + 2 skipped (agent, 198) | **153 passed, 2 skipped (9.1 min)**: 149 plus loop 199's four | consistent |
| deltas | web 4696→4697→4697→4697; root 6466→6467 | 198 +1 web / +1 root, 199 +0 (e2e only), 200 +0 (e2e only) | consistent |

The deploy gate is green at `d826d08`: quality gate, then `test:e2e` **public 140, api 14, authenticated 153 + 2
skipped**. The `batch rejected SyntaxError` log appeared once in the authenticated run, as at MR-078 (teardown artifact).

Pool arithmetic: MR-078 recorded 126 after its rows. Loops 198-200 struck three (#400, #397, #401) and filed none:
**123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (its inputs, `apps/extension-app`
and the extension workspace packages, are unchanged since `871e29a`; zero commits touch them since; inferred green, not
run), Firefox/WebKit, a production build, a real PostHog or Umami project, a real screen reader, the live site (no
`curl`). Server-side PostHog forwarding (§2, N2) is from code reading; MR-075 measured posthog-node's send path with a
fake fetch.

---

## 1. Lead

1. **All three loops hold on their primary claims, and the deploy gate is green at `d826d08`.** Every count
   reproduces, including `test:e2e` project by project (140 + 14 + 153). 5 of 5 mutants are killed.
2. **Loop 198's fix is real with the app's posthog-js (§2).** Decline stores a new device id; accepting again resumes
   under that new id; no PostHog body (raw, decoded) contains the `visitorId` key or value. The reworded privacy
   sentence matches localStorage after a decline.
3. **Two other PostHog sentences in privacy section 9 are not true (§2, N2, N3).** (a) Server-side events (31 types:
   signup, checkout, billing, extension, teams, uploads) go to PostHog through posthog-node keyed by the user id
   whatever the browser choice, because the choice lives only in the browser; the page says PostHog is "loaded only if
   you choose Accept" and that Decline "stops PostHog". Dormant until `POSTHOG_API_KEY` is set. (b) "we remove query
   strings and campaign tags": utm values are sent as event properties on `$pageview` and `pricing_page_viewed`. MR-078
   marked (b) true after checking only `$current_url`; that was my error.
4. **Every authenticated page scrolls sideways on a phone, and its main navigation loses its names (§4, N1).** At 320
   and 375 px, all 13 app pages probed are 582 px wide (dashboard 878): the `AppShell` header nav does not wrap or
   collapse. Below 640 px its seven nav links are an icon with no accessible name (the label is `hidden`). Loop 200's
   "every public page" is accurate; the class extends past it.
5. **Loop 199 holds against the break attempts (§3):** lens switch, failed rename and delete-then-re-create behave;
   the delete effect's two mutants are killed. One edge: a delete whose save fails restores the view to the list but
   not to the page (filters cleared, chip gone, while the message says "restored").
6. **Loop 200 holds:** 24 dynamic public pages (two real slugs for each of 12 routes) fit at 320/375; reverting the
   `/product` glow fails the spec. The spec added 4.2 min to the `public` project; the CI job should still fit its
   30-minute limit (§4).
7. **Selection was sound:** all three followed MR-078's order, all `burn-down`; cool-off 3/3 unspent. Ratio, loops
   191-200: **0.92** (11 closed / 12 created).

---

## 2. Loop 198 — #400 a decline really starts PostHog over (`ce0c70f`): **HOLDS; two other section 9 claims are false (N2, N3)**

**Diff vs log:** matches (`posthog.reset(true)` before `opt_out_capturing()`; `track()` drops `visitorId` from the
PostHog properties; one privacy sentence; one unit test file, one assertion, one e2e test).

**Measured with the app's posthog-js and the e2e stub key** (every request to `posthog.e2e.test` intercepted; bodies
kept raw and decoded; `probe079p.raw.txt`):

| Check | Observed | Verdict |
|---|---|---|
| Device id before decline | `$device_id` `01a10452-3875…` | — |
| After decline (footer) | no request; `ph_phc_e2e_stub_key_posthog` holds a **new** `distinct_id` = `$device_id` `01a10452-5726…`, `$last_posthog_reset`; `__ph_opt_in_out_…` = "0"; the old id is gone | ✓ |
| Re-accept, then client navigation | `$pageview`, `nav_link_clicked`, `pricing_page_viewed`, `$pageview`, all with `$device_id` and `distinct_id` `01a10452-5726…` (the id stored at decline) | ✓ resumes under the new id |
| `visitorId` in any PostHog body | key absent, value (`b5306c56…`) absent in 9.7 KB of raw decoded bodies | ✓ |
| Section 9 sentence vs storage | "removes its previous identifier …; what stays is a note that you declined and a fresh random identifier that is used only if you accept again": matches (`ph_debug` is also stored, dev-only, from `buildPostHogConfig(…, debug)`) | ✓ |
| `$identify`, `$set` | no `$set`/`$set_once` in any body; MR-078 measured one `$identify` by id | ✓ |
| Server path (`trackServer` → `captureServerEvent`) | `visitorId` is stripped before posthog-node (`analytics-server.ts:63`, unit-tested) | ✓ for `visitorId`; **but see N2** |
| **Campaign tags** (`/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=fall_launch&gclid=abc123`, consent full) | `utm_source`, `utm_medium`, `utm_campaign` and `$session_entry_utm_*` on `$pageview`; the same plus `utmSource`… on `pricing_page_viewed`; `gclid` "&lt;masked&gt;"; no query string in `$current_url` | **"we remove … campaign tags" is false (N3)** |

**Server-side events ignore the choice (code reading).** `trackServer` (`lib/analytics-server.ts`) forwards every
server event to `captureServerEvent` (`lib/posthog-server.ts`, posthog-node) with `distinctId = userId` or
`'anonymous'`, whenever `POSTHOG_API_KEY` is set. The consent value lives only in
`localStorage['ledgerium_analytics_consent']`; no route reads it. 31 event types across 17 files: `signup_completed`,
`checkout_started`, `subscription_*`, `payment_*`, `dispute_*`, `trial_will_end`, `workspace_*`, `extension_*`,
`team_*`, `workflow_uploaded`, `workflow_created`, `workflow_shared_with_*`, `shared_workflow_viewed`, `plan_limit_hit`,
`upload_failed`, `api_error` and others. A signed-in user who chose Decline is still sent to PostHog by id on every
billing, upload and team action. Section 9 says PostHog is "Loaded only if you choose Accept" and "Choosing Decline
PostHog stops PostHog". `POSTHOG_API_KEY` is not set by any deploy file (#278), so nothing is sent today. **N2.**

**Mutations** (`mut079/results.txt`; consent spec 6 tests): **P1** `reset()` without `true` → killed; **P2**
`visitorId` forwarded again → killed. Both fail the new e2e test (`… body carries visitorId (#400)`).

**Hygiene:** the JSDoc on `visitorId` (`lib/analytics.ts`, around line 755) still says it is sent "(when configured)
PostHog"; false since this loop (annotation).

**Limits accuracy.** Accurate on what was built. Not stated: the server path and campaign tags (both outside the row).

---

## 3. Loop 199 — #397 the view chip follows the view (`4aab8d1`): **HOLDS; one rollback edge**

**Diff vs log:** matches (`appliedViewName` → `appliedViewId`; label looked up by id; an effect clears filters and
chip when the id leaves `savedViews`; comment fix; four e2e tests).

**Break attempts** (`probe079auth.raw.txt`; views seeded through the preferences API and restored after each test):

| Probe | Observed | Verdict |
|---|---|---|
| V1 apply view, switch lens to Time & Impact and back | one row, chip "View: Automate" throughout | ✓ |
| V2 delete the applied view, PUT answers 500 | message "Couldn't save your changes. Saved views were restored to your last saved list."; the view is back in the list; **all three rows shown, no chip** | edge: list restored, application not (annotation) |
| V3 rename the applied view, PUT answers 500 | after rollback chip "View: Automate", one row | ✓ (by id) |
| V4 delete, then re-create the same name | delete: all rows, no chip; server list `[]` ✓. Re-create not driven (the picker's name box was not found by my locator) | partial |
| Server list without the view (reconcile adoption) | not driven; the effect keys on id, and V2 exercises the same path (a rollback list) | by code + V2 |

**Mutations** (`mut079/S1…`, `S2…`; the rename/delete test): **S1** effect removed → killed; **S2** effect clears the id
but not the filters → killed. The agent's S2/S4/S7, name-snapshot and delete mutants are taken from the log.

**Limits accuracy.** Accurate ("no shell-level unit test"; #396). Not stated: V2.

---

## 4. Loop 200 — #401 every public page fits a phone (`d826d08`): **HOLDS; the app pages do not (N1)**

**Diff vs log:** matches (`min-w-0` on three step columns and `break-all` on six code spans in `/install`; `-m-3
sm:-m-6` on the `/product` glow; `page-width.spec.ts` over 37 static routes, both themes, 320 and 375 px).

**Measured.** The spec passes inside the whole `public` run (140). **W1** (`probe079w1.raw.txt`): for each of the 12
dynamic public routes (ai-opportunities, alternatives, answers, compare, competitors, departments, industries,
software, sop-templates, personas, problems, workflow-library) the longest and the shortest real slug from its hub, at
320 and 375 px (dark): **24 of 24 fit**. The spec itself would not catch a regression there (dynamic routes are excluded;
the hubs list their slugs, so a constant list is available). **Mutation W1** (`/product` glow back to `-m-6`) →
killed in both themes.

**Authenticated pages** (W2, W3, W4; `probe079auth.raw.txt`, `probe079x.raw.txt`, `probe079y.raw.txt`). At 320 and
375 px, `scrollWidth` is 582 on `/account`, `/teams`, `/teams/join`, `/analytics`, `/analytics/time-sinks`,
`/recommendations`, `/upload`, `/compare`, `/workflows/<id>` and the 404 page, and **878** on `/dashboard`. At 1280 px
all fit. The common culprit is the header (`components/AppShell.tsx:51`, `nav.flex items-center gap-ds-1`, from x 141
to 582): seven icon links plus the trial chip, theme toggle, help and sign-out in one non-wrapping row. The dashboard is
wider still (the preset chip rail and a `flex-shrink-0` header group extend past the nav). Below 640 px each nav label
is `<span className="hidden sm:inline">`, so the seven links (`/dashboard`, `/compare`, `/analytics`,
`/recommendations`, `/teams`, `/upload`, `/account`) have **no accessible name**: the aria snapshot shows `link` with
only `img`. That fails WCAG 1.4.10 (also at 400 % zoom on a 1280 px window) and 2.4.4/4.1.2 below `sm`. Pre-existing,
in production. The authenticated axe tests run at desktop width, so they never see it. **N1.**

**CI time.** `public` went from 2.6 min (MR-078) to 6.8 min locally; the local deploy gate is now about 16.2 min
(6.8 + 0.3 + 9.1). The last CI run of the job (loop 151, `37088974348`) took 11 min 9 s including setup, against a 30
min `timeout-minutes` (`e2e-web-app.yml`). Projected about 17-20 min: acceptable, with less headroom for retries
(`retries: 2` in CI). If the job passes about 22 min, the cheapest cut is one theme in `page-width.spec.ts` for routes
whose theme only changes colours; not now.

**Limits accuracy.** Accurate ("dynamic routes are not covered"; "about 4 minutes").

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| PostHog decline and forwarding (in place, e2e `analytics-consent.spec.ts`) | 2 | 2 | — |
| view-delete effect (in place, e2e `saved-views-persistence.spec.ts` rename/delete test) | 2 | 2 | — |
| `/product` glow (in place, e2e `page-width.spec.ts`) | 1 | 1 | — |

---

## 6. Governance

**Selection.**
- **198** `burn-down` #400 (12), MR-078's first pick, `security-reviewer`. ✓
- **199** `burn-down` #397 (10), MR-078's second pick, `frontend-engineer`. ✓
- **200** `burn-down` #401 (10), MR-078's third pick, `frontend-engineer`. ✓
The cool-off stayed 3/3: correct, a follow-up (12, then 10s) was always the best open row or tied with the audit tier.

**Agents.** `security-reviewer` → `frontend-engineer` × 2. No 4+ run. All primaries have Bash. `analytics` still has
none (`analytics.md:4`; CEO queue).

**Step 7 (MR-078's bullet) honoured:** 198 touched `lib/analytics.ts` and ran public 66 and authenticated 149; 200 ran
the whole `public` project (140); 199 touched only the shell and ran its specs.

**Directory saturation:** `lib/` and the privacy page (198); `dashboard-v2/` (199); `(public)/install`,
`(public)/product`, `e2e/public/` (200). Clean. **Area** rolling five (196-200): privacy, ci, privacy, dashboard,
public-site. Privacy is 2 of 5: no penalty for a privacy pick at 201.

**MR-078 annotations:** closure notes #395/#394/#391/#398, appends #399/#389/#85/#89, #88 struck, Step 7 bullet;
#400-#402 present (validator counts them). Paste-ready text works.

**Primary-file and validation lines:** present in all three (exit codes, "no Errors line", e2e counts, port check).
Thirteenth consecutive window.

**Density / follow-ups:** zero filed by loops; no trigger.

**Ratio, loops 191-200** (same method as MR-069…078: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 11 | #355 (191), #392 (192), #390 (193), #368 (194), #395 (195), #394 + #391 (196), #398 (197), #400 (198), #397 (199), #401 (200) |
| Created | 12 | loop 191 #391, MR-076 #392-#394, MR-077 #395-#397, loop 196 #398-#399, MR-078 #400-#402 |
| Ratio | **0.92** | above the ≥ 0.5 floor (MR-078's #88 strike, not a loop closure, is not counted) |

This review files three rows and recommends one strike (#96): **125 open** after them.

**D-1.** Last extension touch `871e29a`: **157 loops** at 200, zero commits under the extension surfaces since. Still
unanswered.

**Staleness (next oldest open non-blocked rows after MR-078's set), checked at `d826d08`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #96 | 11 | premise ("Process Intelligence" / "Workflow Library" / "Process Discovery" / "Process Mining" used interchangeably in hero, sidebar, nav) no longer holds: "Process Discovery" 0 files; "Process Mining" only as the contrast "vs. Process Mining" (`page.tsx:417`, `about/page.tsx:209`, `product/page.tsx:552`); "Workflow Intelligence" only in code comments; "Workflow Library" is the name of the `/workflow-library` page | **strike as resolved** (re-file only if a growth-strategist copy audit finds a live conflict) |
| #98 | 8 | no `/dashboard/portfolio` route (`app/(app)` has none) | **keep** |
| #103 | 11 | `CURRENT_SCHEMA_VERSION = 1` (`dashboard-columns/persistence.ts:57`); no `defaultTimeRange` anywhere in `src` | **keep; true** (candidate for the cool-off, §11) |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **67 ahead** at `d826d08` (68 once this review is committed); loops 152-200 (49 loops) are not in production. The whole deploy gate passes locally (validation table); `e2e-extension` inputs unchanged since the last green deploy. **Nothing blocks a push** |
| 2 | Last CI/deploy | `37088974348` (loop 151) success, `e2e-web-app` job 11 min 9 s |
| 4 | Scheduled jobs | `Alerts check` (`37160672933`, 23:06Z, latest), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail: `CRON_SECRET` and `ALERTS_CHECK_URL` are empty in the job log; no `CRON_SECRET` repository secret exists. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (157 loops) |
| #399 | Consent scope | unchanged; N2 adds a fourth path (server events) that the decision must cover |
| — | Stored share tokens | delete/redact existing `AnalyticsEvent` rows with `/share/<token>`; rotate live links or not; proxy logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| #278 | PostHog keys | see the readiness list below; **do not set `POSTHOG_API_KEY` (server) before N2** |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**PostHog readiness (probed here, not claimed ready).** Working with the real posthog-js: consent gate, accept without
reload, decline (stops, persists, survives reload, new device id), re-accept under the new id, cross-tab withdrawal,
one `$identify` by id with no person properties, no `/flags`, queries stripped from URLs, paths templated, autocapture,
recording and heatmaps off, no `visitorId`. Remaining before keys: **N2** (server events ignore the choice; blocks the
server key), **N3** (campaign-tag sentence), **#389** (free text and page titles), the stored-token decision, #399,
then the keys (#278).

---

## 7. Patterns, and the loop 171-200 retrospective

**What the improvement system produced (loops 171-200, 30 loops).** 31 rows closed, 31 rows created (#372-#402; 23 of
them filed by meta-reviews, 8 by loops); 23 of the 31 new rows are already closed. Pool 123 at 200, about where it was
at 170. Selection: 28 `burn-down`, 2 `top-score` (188 and 194, both on the cool-off). Agents: `frontend-engineer` 19,
`security-reviewer` 8, `analytics`, `qa-engineer`, `system-architect` 1 each.

| Area | Loops | Rows closed |
|---|---|---|
| web-app / dashboard (saved views, persistence, lenses) | 11 | 11 (#369, #372, #374, #379, #383, #384, #380, #386, #387, #368, #397) |
| analytics / privacy (PostHog and first-party egress, consent) | 9 | 10 (#362, #375, #378, #385, #388, #355, #392, #394, #391, #400) |
| web-app / a11y (focus, contrast) | 4 | 4 (#370, #373, #365, #376) |
| public site / pricing a11y | 4 | 4 (#113, #390, #395, #401) |
| security / web | 1 | 1 (#360) |
| ci | 1 | 1 (#398) |

**Recurring failure modes.**
1. **The row text is the fix's boundary, and the review finds the next door.** Of loops 171-197, every one held on its
   own claim, but 19 of 27 reviews added "holds for X; Y remains". The privacy arc shows it most: 176 (campaign tags;
   PostHog bypassed it), 178 (autocapture and storage), 182 (paths), 186 (server-side and taxonomy), 189 (first-touch),
   191 (consent), 196 (identity), 198 (this review: server events and campaign tags). Saved views went the same way
   (171 ordering → 175 a hung PUT stalls everything → 177 → 180 note stale in four places → 183 column half → 185 stale
   GET wins → 190 …). Reviews filed 23 of the 31 new rows.
2. **Closure claims that were false, including mine.** Loop 175 shipped a regression fixed at 177; loop 196's
   "clears its identity" (MR-078); MR-078 marked "remove … campaign tags" true after checking only `$current_url`
   (this review, N3). User-facing claims were checked by reading config, not by trying to falsify them in a browser.
3. **The deploy-gate blind spot.** A broken e2e test stayed red for 33 loops (164-197) because no one ran the whole
   gate and nothing has been pushed since loop 151. MR-078's Step 7 rule now closes the detection gap (this review
   ran it: green). The deployment gap remains: 49 loops undeployed.
4. **Agent tooling gaps.** `analytics` cannot run tests (no Bash), so analytics work goes to `security-reviewer` or
   `frontend-engineer`; `security-engineer` does not exist. Selection works around it every time.
5. **A defect class fixed one instance per loop.** Width: 193 (pricing table) → 195 (pricing page) → 200 (public) →
   N1 (app pages): four loops and four reviews for one class. Loop 200 was the first to test the class, and only on
   the public half.
6. **The old pool does not move.** The oldest open non-blocked row (#17) is about 298 loops old; the audit tier (11)
   was selected twice in 30 loops.

**Three recommendations for loops 201-230.**
1. **Ship.** The CEO pushes now, and every loop's Controls block adds one line, "Undeployed: N loops (M commits since
   `origin/main`)", so the cost is visible each loop. No new rule; reporting only.
2. **Fix the class, not the instance.** A loop that fixes one instance of a defect class tests the whole class (every
   route in a constant list, every call site that sends data out) or names the uncovered members in Limits. For
   privacy, that means one egress inventory (posthog-js, posthog-node, Umami, logs, the first-party table) with a test
   at each exit, so section 9 is checked against the inventory, not against the row. Literal text in §9 annotations.
3. **Spend the cool-off on verified audit rows when they lead.** The audit tier stalled because a follow-up almost
   always tied or led. When the best follow-up is below the best verified-true audit row, spend the charge (first
   chance: 203, §11), and verify the audit row's premise in the same review, as #96 shows some no longer hold.

**A privacy sentence is a test case (again).** MR-078 named it; this review shows the reviewer needs it too. Section 9
has now been wrong three times (identity, server events, campaign tags); each time the false sentence was the one
nobody tried to falsify. N2 and N3 each carry a browser or unit check that would fail if the sentence were false.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-078 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included; #96 excluded (recommended strike). Verified at `d826d08`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** app header overflows on phones; nav links unnamed | 11 | follow-up | true; in production | W2, W3, W4 |
| 1 | **N2** server events reach PostHog whatever the choice | 11 | follow-up | true (dormant until `POSTHOG_API_KEY`) | §2, code |
| 3 | #85, #103, #106, #114, #137, #174 | 11 | audit | #103 rechecked true; others per MR-067/068/078 | cool-off only (3/3 armed) |
| 4 | **N3** campaign tags sent; section 9 says removed | 10 | follow-up | true (dormant until a key) | P2 |
| 5 | #377, #381 | 10 | follow-up | true | unchanged |
| 6 | #389 free text; #396 view/preset filters lost on Back; #402 banner focus | 9 | follow-up | true | unchanged |
| 7 | #393 Umami, #382 revision/409, #223 light theme, #98 | 8 | follow-up / audit | #98 rechecked true | — |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Every authenticated page scrolls sideways on a phone or at 400 % zoom, and below 640 px the seven main navigation links have no accessible name.** MR-079 §4. Measured in Chromium at 320 and 375 px, signed in: /account, /teams, /teams/join, /analytics, /analytics/time-sinks, /recommendations, /upload, /compare, /workflows/<id> and the 404 page are 582 px wide; /dashboard is 878 px; all fit at 1280. Culprit on every page: the `AppShell` header nav (`components/AppShell.tsx:51`, `nav.flex items-center gap-ds-1`, x 141 to 582) holds seven icon links plus the trial chip, theme toggle, help and sign-out in one row that neither wraps nor collapses; on /dashboard the preset chip rail and a `flex-shrink-0` header group extend further. Below the `sm` breakpoint each link's label is `<span className="hidden sm:inline">`, so /dashboard, /compare, /analytics, /recommendations, /teams, /upload and /account render as a link containing only an icon (aria snapshot: link > img, no name); WCAG 1.4.10 and 2.4.4/4.1.2. The authenticated axe tests run at desktop width, so they do not see it. Pre-existing; in production. Fix as one outcome, header first: below `sm` the nav collapses into a menu button (or scrolls inside its own `overflow-x-auto` region with `min-w-0`), the labels become `sr-only` instead of `hidden` (or each link gets `aria-label`), and the dashboard's own overflow is removed. Tests: an authenticated e2e over a constant list of app routes at 320 and 375 px asserting `scrollWidth <= innerWidth` (loop 200's assertion), and a check at 375 px that every header link has a non-empty accessible name; revert proof. `AppShell` is mounted on every page, so run the whole `authenticated` project (Step 7). Follow-up of loop 200 (#401). | fix | web-app / a11y | `frontend-engineer` | 4 | 4 | 2 | 5 | 2 | 2 | **11** |
| **N2** | **Server-side analytics events reach PostHog whatever the user chose in the consent banner, contradicting privacy section 9.** MR-079 §2. `trackServer` (`lib/analytics-server.ts`) forwards every server event to `captureServerEvent` (`lib/posthog-server.ts`, posthog-node) with distinct id = the user id (or 'anonymous') whenever `POSTHOG_API_KEY` is set. The choice is stored only in the browser (`localStorage['ledgerium_analytics_consent']`); no route reads it. 31 event types in 17 files are affected, among them signup_completed, checkout_started, subscription_*, payment_*, dispute_*, trial_will_end, workspace_*, extension_installed / extension_session_active / extension_signin_linked, team_created / team_invite_*, workflow_uploaded / workflow_created / workflow_shared_with_*, shared_workflow_viewed, plan_limit_hit, upload_failed and api_error. Section 9 says PostHog is 'Loaded only if you choose Accept' and 'Choosing Decline PostHog stops PostHog'. Dormant: no deploy file sets `POSTHOG_API_KEY` (#278), so nothing is sent today; setting it would start this. Fix as one outcome (default): stop forwarding server events to PostHog (drop the `captureServerEvent` call in `trackServer`; the `AnalyticsEvent` row is unchanged), so PostHog only ever receives what the consented browser sends. If the CEO wants server events in PostHog, the account card's choice must first be stored server-side (additive column) and forwarding gated on it; that is a separate row. Tests: `analytics-server.test.ts` asserts `captureServerEvent` is never called and the database row is still written; one route test (signup) asserts the same end to end with posthog-server mocked. Follow-up of loop 198 (#400); relates to #399 and #278. | fix | analytics / privacy | `security-reviewer` | 3 | 4 | 2 | 4 | 1 | 1 | **11** |
| **N3** | **Privacy section 9 says campaign tags are removed before PostHog, but utm values are sent as event properties.** MR-079 §2. Measured with the app's posthog-js and the e2e stub key, consent full, landing on /pricing?utm_source=newsletter&utm_medium=email&utm_campaign=fall_launch&gclid=abc123: `$pageview` carries utm_source, utm_medium, utm_campaign and $session_entry_utm_*; `pricing_page_viewed` carries the same plus utmSource, utmMedium, utmCampaign; gclid arrives masked; `$current_url` has no query string. The values are sanitised (#362: at most 64 characters, dropped if they contain an at-sign form) but not removed. MR-078 marked the sentence true after checking only `$current_url`. Fix (copy, default; attribution is the purpose of #362): in `app/(public)/privacy/page.tsx` replace 'Before sending, we remove query strings and campaign tags and replace record ids and share tokens in page addresses with placeholders.' with 'Before sending, we remove query strings from page addresses and replace record ids and share tokens in them with placeholders. Campaign tags from the link you arrived by (such as utm_source, utm_medium and utm_campaign) are sent as separate values, shortened to 64 characters and dropped if they contain an email address; ad-click ids are masked.' Alternative (code): drop utm_* in `sanitizePostHogEvent`; then the sentence stays. Test: extend `e2e/public/analytics-consent.spec.ts` with a utm landing that asserts what the chosen sentence says (utm present and gclid masked, or utm absent). Follow-up of loop 198 (#400) and MR-078's error. | fix | analytics / privacy | `frontend-engineer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |

**Annotations recommended:**
- **#400 closure note:** "[MR-079: holds with real posthog-js and the stub key. After a decline the stored PostHog entry holds a new distinct id and device id and the old one is gone; accepting again resumes under that new id ($pageview, nav_link_clicked, pricing_page_viewed); no PostHog body contains the visitorId key or value (9.7 KB of raw decoded bodies); the reworded section 9 sentence matches localStorage. Mutants reset() without true and visitorId forwarded again are both killed by the e2e. Gaps outside the row: server-side events reach PostHog whatever the choice (N2) and campaign tags are sent (N3). Hygiene: the JSDoc on visitorId in lib/analytics.ts still says it is sent to PostHog when configured; fix when next touching the file.]"
- **#397 closure note:** "[MR-079: holds. A lens switch and back keeps the view and its chip; a rename whose save fails rolls back to the old name with the filter kept; removing the delete effect, or clearing only the id, fails the rename/delete test. Edge: a delete whose save fails restores the view to the list but not to the page (filters cleared, chip gone) while the message says the saved views were restored; minor, no row.]"
- **#401 closure note:** "[MR-079: holds. The spec passes inside the whole public project (140); reverting the /product glow fails it in both themes. Two real slugs for each of the 12 dynamic public routes fit at 320 and 375 px (24 of 24), but the spec would not catch a regression there; the hubs list their slugs, so one slug per route could be added when the spec is next touched. The spec took public from 2.6 to 6.8 min locally; the CI job is projected at 17-20 of its 30 minutes. Authenticated pages are 582 px wide at 320 and 375 (dashboard 878) and the header links lose their names below 640 px (N1).]"
- **#96 closure note:** "[MR-079: resolved; strike. The premise no longer holds at d826d08: no file uses 'Process Discovery'; 'Process Mining' appears only as the contrast 'vs. Process Mining' on the home, about and product pages; 'Workflow Intelligence' appears only in code comments; 'Workflow Library' is the name of the /workflow-library page, not a category noun. Re-file only if a growth-strategist copy audit finds a live conflict.]"
- **#98 append:** "(MR-079) Still open at d826d08: app/(app) has no /dashboard/portfolio route."
- **#103 append:** "(MR-079) Still true at d826d08: CURRENT_SCHEMA_VERSION = 1 (dashboard-columns/persistence.ts:57) and no defaultTimeRange anywhere in src. Recommended for the cool-off at 203 (MR-079 §11)."
- **#399 append:** "(MR-079) A fourth path the decision must cover: server-side events go to PostHog by user id whatever the browser choice (N2), because the choice is stored only in the browser."
- **#278 append:** "(MR-079) Do not set POSTHOG_API_KEY (the server key) before N2: every server event would go to PostHog by user id regardless of the consent choice."
- **`.claude/agents/coordinator.md`, Step 7 — Validation, insert after the bullet that begins "- run the whole Playwright project" the bullet:** "- when the loop fixes one instance of a defect class (one page that overflows, one path that sends data to a third party, one control that loses focus), its test covers the whole class (every route in a constant list, every call site that sends data out) or the Limits line names each member it does not cover"

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 new device id at decline; re-accept under it; no visitorId; sentence matches storage; P1/P2 killed | #400 note |
| §2 server events forwarded by user id whatever the choice | N2; #399 append; #278 append |
| §2 utm values sent; section 9 says removed; MR-078's error | N3 |
| §2 stale visitorId JSDoc | #400 note |
| §3 lens, rename rollback, delete effect mutants | #397 note |
| §3 failed delete restores the list but not the applied view | #397 note (no row) |
| §4 24 dynamic slugs fit; glow mutant killed; CI time | #401 note |
| §4 app pages 582/878 px; header links unnamed below 640 px | N1 |
| §6 staleness #96 resolved, #98 keep, #103 keep | #96 note, #98 append, #103 append |
| §7 class-not-instance failure mode | coordinator.md Step 7 bullet |
| §7 undeployed loops; ship | CEO item 1; Controls "Undeployed" line (practice) |
| §7 audit tier stalled | §11 cool-off at 203 |

---

## 11. Loop 201-203 picks

**Before 201: push.** The whole deploy gate is green locally at `d826d08`; 49 loops are undeployed. Also `CRON_SECRET`
and the job URLs (item 4), D-1 (item 21), #399, stored tokens.

Pool 123 + 3 − 1 = 125 > 8. The cool-off is **3/3**.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **201** | **N2** server events stop going to PostHog | **11** | `burn-down` (follow-up of 198) | `security-reviewer` | analytics / privacy | tied highest; small; must precede the server key (#278); rotates off `frontend-engineer` × 2 |
| **202** | **N1** app header fits a phone; links named | **11** | `burn-down` (follow-up of 200) | `frontend-engineer` | web-app / a11y | tied highest; every signed-in page; a test over the whole class; whole `authenticated` project (Step 7) |
| **203** | **#103** time-range persistence (schema v1 → v2) | **11** | `top-score` via **`ceiling-cool-off: invoked`** | `backend-engineer` | web-app / dashboard | after 201-202 the best follow-up is 10 (N3, #377, #381) and a verified-true audit row is 11; first use of the charge since 194; clean rotation |

- **Spend the cool-off at 203, not before:** at 201-202 a follow-up ties the audit tier, so `burn-down` already takes
  the best item. At 203 the audit row leads and was re-verified here (§6). Log
  `ceiling-cool-off: invoked; rationale: audit row #103 (11, verified at MR-079) outranks every open follow-up (10)`.
  If the CEO prefers every PostHog precondition first, 203 = **N3** (10, `burn-down`) and the charge waits.
- **Then MR-080** (base cadence after 203), then **N3**, **#389** (`security-reviewer`; free text, the last PostHog code
  precondition), **#402**, **#381** then **#396** (separate loops), #377 with theme tokens, #223, #393 if Umami is
  wanted, #382 after #381.
- **Area check:** 201 privacy, 202 a11y, 203 dashboard: privacy is 2 of the last 5 at 202's and 203's selection
  (198, 201). No penalty.
- **Agents:** `security-reviewer` → `frontend-engineer` → `backend-engineer`; no 4+ run.
- **D-4:** N2 changes no copy; N1's labels are existing strings (no new copy) unless a menu button adds one; #103 none.
  N3 (later) changes one sentence, under the threshold; a short `growth-strategist` read is optional.
- **Do not pick:** #96 (resolved; strike); #396 before #381 is decided; #382 before #381; #377 as written (theme tokens
  per MR-074); #89, #91 (Path C); #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the
  D-1 answer; #393 while the CEO has not said Umami is wanted; #399 (CEO); any implementation row with a tool-less
  primary agent.
- **Practice:** the full deploy gate every review and whole projects on shared plumbing (Step 7); fix the class, not
  the instance (§9 bullet); a privacy sentence gets a check that would falsify it; Controls carry "Undeployed: N loops";
  annotations are final text.

---

## 12. Verdict

Every count reproduces at `d826d08`: root 6467, web-app 4697 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, the rest of the quality gate, and `test:e2e` project by project **140 + 14 +
153 (2 skipped)**. 5 of 5 mutants killed.

- **Loop 198 holds** with real posthog-js: new device id at decline, re-accept under it, no `visitorId` anywhere, and
  the new sentence is true. Two other section 9 sentences are not: server events ignore the choice (N2, 11) and
  campaign tags are sent (N3, 10; MR-078 missed it).
- **Loop 199 holds:** lens switch, rename rollback and both delete-effect mutants; a failed delete restores the list
  but not the applied view (note).
- **Loop 200 holds:** 24 dynamic public pages fit; the glow mutant is killed; the spec costs 4.2 min. Every
  authenticated page overflows on a phone and its nav links lose their names (N1, 11).

Selection was sound, the cool-off is armed, ratio 0.92. The 30-loop retrospective: 31 closed, 31 created, mostly
by reviews finding the next door; the remedy is to fix and test the class, to ship, and to spend the cool-off when a
verified audit row leads. Asks for the CEO: **push now**; configure `CRON_SECRET` and the job URLs; answer D-1 and
#399; decide stored tokens, Umami and the `analytics` agent's tools; do not set `POSTHOG_API_KEY` before N2. For the
coordinator: N2, N1, then #103 on the cool-off; strike #96; add the Step 7 bullet.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6467 / 4697 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 140 passed (6.8 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 153 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && pnpm exec playwright test -c $S/probe079.config.ts --project=probe)       # P1, P2
(cd apps/web-app && pnpm exec playwright test -c $S/probe079.config.ts --project=probe-w1)    # W1 24/24 fit
(cd apps/web-app && pnpm exec playwright test -c $S/probe079.config.ts --project=probe-auth)  # V1-V4, W2-W4
(cd apps/web-app && node $S/mut079/run.mjs)               # 5/5 killed, files restored identical
grep -rno "trackServer('[a-z_]*'" apps/web-app/src --include=*.ts | grep -v '\.test\.ts'   # 31 server event types
gh run list --limit 8                                     # CRON_SECRET failures; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 67
```
