# MR-081 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 204-206, 2026-10-03 20:45 → 21:23 (−0600). Commits `90b0d46` (loop 204, #407), `ddd0a7d`
(loop 205, #409), `76e2d8d` (loop 206, #405). Previous review MR-080 at `95e0d8a`. Rows closed: #407, #409, #405.
Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-080 (`ITERATION_LOG.md`, loop 206 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared
exception to "no repo file touched", as at MR-075…080: mutants that only the repo's own tests can judge were applied
**in place** one at a time, each restored in a `finally` block, with the sha256 of every mutated file compared before
the first and after the last mutant (identical): `lib/dashboard-columns/persistence.ts` (5 mutants),
`app/api/dashboard/preferences/route.ts` (3), `components/AppShell.tsx` (1), `lib/utm-sanitize.ts` (1). The probes
wrote rows into the e2e test database (`prisma/test.db`, untracked; every Playwright run reseeds it; the 409 probe
restored the user's row in `finally`). The e2e mutants and probes ran against a dev server I started on 3098 with the
exact `webServer` environment of `playwright.config.ts`; no other run shared it. Scratch went only to `…/scratchpad/`:
- `qg081.sh` (the quality gate), outputs `root081.txt`, `web081.txt`, `tc081.txt`, `val081.txt`, `guard081.txt`,
  `other081.txt`; `e2e081pub.txt`, `e2e081api.txt`, `e2e081auth.txt`; `install081.txt`; `status_before081.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver081.log`;
- `prod-persist081.ts` (`git show origin/main:…/persistence.ts`), `prodA.ts` / `frozenB.ts` (the Group H diff),
  `prodp081.ts` + `rollsim081.ts` → `rollsim081.txt` (production's GET and PUT logic over a row written by HEAD);
- `probe081.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe081h.spec.ts` (H1
  header-scoped axe on three routes, both themes, 375/640/1024/1280 px, menu open, hover and focus of every header
  control; H2 whole-page axe at 1280), `probe081p.spec.ts` + `ph081lib.ts` (P1 signed-out campaign landing and later
  events), `probe081a.spec.ts` (A1 signed-in landing, identify and later events), `probe081r.spec.ts` (R1 the shell on a
  real schemaVersion 3 row); outputs `probe081*.raw.txt`;
- `mut081/run.mjs` (unit, `mut081/results.txt`), `mut081/e2e.mjs` (`mut081/e2e-results.txt`).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project and after stopping the dev server. Playwright ran one project at a time.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 206 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6499 (204) | **318 files, 6499 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4729 | **271 files, 4729 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 402 rows, 279 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install) | not claimed | **exit 0**, "Lockfile is up to date, resolution step is skipped", "Already up to date" | green |
| e2e `public` (whole project) | 141 (agent, 206) | **141 passed (8.4 min)** | matches |
| e2e `api` (whole project) | not claimed | **14 passed (30 s)** | green |
| e2e `authenticated` (whole project) | 192 + 2 skipped (agent, 205) | **192 passed, 2 skipped (11.1 min)** | matches |
| deltas | web 4720→4729→4729→4729; root 6490→6499→6499→6499; public 140→141; authenticated 182→192 | 204 +9 / +9 unit, 205 +10 e2e, 206 +1 e2e | consistent |

The deploy gate is green at `76e2d8d`: quality gate, then `test:e2e` **public 141, api 14, authenticated 192 + 2
skipped**. No flaky or retried test. The `batch rejected SyntaxError` teardown log appeared once in the authenticated
run, as at MR-078…080.

Pool arithmetic: MR-080 recorded 126 after its rows (#407-#409 filed). Loops 204-206 struck three (#407, #409, #405)
and filed none: **123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build, a real PostHog or Umami project,
a real screen reader, the live site (no `curl`), the deployed code itself (the rollback verdict, §2, reads production's
reader and route at `origin/main` and runs them over rows written by this build).

---

## 1. Lead

1. **The push is rollback-safe (§2).** Every count reproduces and the deploy gate is green at `76e2d8d`. The Group H
   frozen reader is code-verbatim to production's. Production's own GET and PUT logic, run over a row written by this
   build, keeps every column, saved view and saved-view filter byte-identical; only the stored time range is lost.
   Nothing else stored changes shape: there are no Prisma changes, and the consent values, the first-touch keys and the
   reset-token format are the same. **Nothing blocks the push.**
2. **Loop 204 holds (§2):** 8 of 8 unit mutants killed. On a newer row the shell keeps the data (the row stays
   byte-identical and a deleted view is restored), but the message says "Please try again", which can never succeed,
   and a toggled column stays ticked until reload. That only matters after a future version bump and rollback
   (annotation on #382). One test-design gap: Group H uses today's column registry, not production's (doc text in §9).
3. **Loop 205 holds (§3):** the header is clean in both themes at 375 to 1280 px on /dashboard, a workflow page and
   /upload, including the open menu, hover and focus of every header control. Whole-page axe at 1280 now finds nothing
   serious. The revert mutant is killed. #408 (the menu's focus) is still open and still true.
4. **Loop 206 holds on the utm values and the signed-in path, but one clause is false (§4, N1).** posthog-js also
   collects `mc_cid` and `gad_source`, which our sanitizer does not cover. On a signed-out landing, an email in
   `mc_cid` (`bob@example.org`) and a 90-character `gad_source` are sent unchanged on every event of the session. Signed
   in, PostHog gets the account id only, and later events carry the sanitized utm values.
5. **Selection was sound:** MR-080's three picks in order, all `burn-down`; the cool-off is **re-armed at 3/3**.
   Ratio, loops 197-206: **1.00** (10 closed / 10 created).

---

## 2. Loop 204 — #407 a rollback keeps every saved view (`90b0d46`): **HOLDS; the push is rollback-safe**

**Diff vs log:** matches (`CURRENT_SCHEMA_VERSION` back to 1; `LAST_COMPATIBLE_SCHEMA_VERSION = 2` so a local v2 row
reads as v1; the newer-version branch reads known fields and sets `isNewerVersion`; GET never writes a newer row back;
PUT answers 409 before the upsert; `PERSISTENCE_SCHEMA.md` §2/§3 updated; Group H; `route.newer-version.test.ts`, 6
tests).

**The frozen copy is verbatim.** Applying the test's renames (`prod` prefix, `PROD_SCHEMA_VERSION`, `export` dropped)
to lines 178-362 of `git show origin/main:apps/web-app/src/lib/dashboard-columns/persistence.ts` and diffing them against
`persistence.test.ts` lines 357-541 gives one difference: a section-divider comment that keeps the name
`migratePreferences`. The JSDoc above `getDefaultPreferences` is omitted, which is also only a comment. The code is
identical.

**Route-level, not just `migratePreferences`** (`rollsim081.txt`). The production reader and route logic were run over a
row written by this build (columns, one saved view with a range filter and a multi filter, range 30d):

| Step | Observed | Verdict |
|---|---|---|
| production GET (`deserializePreferencesFromDb`, write-back only if keys dropped) | 1 view, all 3 columns, no warnings, no write-back | ✓ |
| production column-only PUT (`origin/main` `route.ts:153`: Zod strips unknown body keys; the document is rebuilt from `existing.preferences.savedViews` and `filters`) | writes schemaVersion 1; the saved view (filters included) is **byte-identical**; `defaultTimeRange` is gone | ✓ (range lost, as documented) |
| roll forward again: this build reads production's row | 1 view, range `all`, no warning, not "newer" | ✓ |

**Other stored formats in the push** (`origin/main..HEAD`, 75 commits):

| Store | Change | Production reads it? |
|---|---|---|
| Prisma schema / migrations | none | — |
| `UserDashboardPreference.payload` | additive `defaultTimeRange`, saved views server-validated (#367) | yes (above) |
| `localStorage['ledgerium_analytics_consent']` | same key, same values `'full'` / `'essential'` | yes |
| `localStorage['ledgerium_first_touch_utm']` | same keys; values sanitized, `landing_path` templated (#392) | yes (strings) |
| `localStorage['ledgerium_ph_identified_user']` | new key | ignored (orphaned, harmless) |
| PostHog persistence | `localStorage+cookie` → `localStorage` (#378) | yes; production re-creates its cookie (the #378 fix is simply absent again) |
| `PasswordResetToken` | same sha256 `tokenHash` and 1-hour expiry; only the work moved off the response path | yes |
| column registry (`types.ts`, `registry.ts`) | unchanged | — |

**Verdict: the push is rollback-safe.** A rollback to `origin/main` loses only each user's stored time range (dropped
at their first column change under the old code; this build then reads `all`). The cost of rolling back is the fixes
themselves, not the data.

**The 409, as the user sees it** (R1, a real schemaVersion 3 row with one view, `probe081r.raw.txt`). The range and the
view load (known fields). Toggling Systems sends a PUT that gets 409, and the alert reads "Couldn't save your changes.
Please try again." The column stays ticked. Deleting the view gets 409, the view is restored, and the alert reads
"Couldn't save your changes. Saved views were restored to your last saved list." The row is byte-identical
afterwards. After a reload the column is unticked and the view is still there. **User-safe** (nothing is lost). Two
weaknesses: "try again" will fail on every retry, and the columns are not rolled back on screen. This happens only
after a future version bump and rollback; #382 (a conditional write that also answers 409) must distinguish its
conflict anyway. Annotation, no row.

**Mutations** (`mut081/results.txt`; persistence, route and newer-version tests, 67): **M1** version back to 2 (11
fail), **M2** v2 treated as newer (2), **M3** newer version resets to defaults (3), **M4** serialize drops the range (3),
**M5** an invalid range kept (1), **M6** no 409 (2), **M7** GET writes back a newer row (1), **M8** 409 becomes 200 (2)
→ **8 of 8 killed**.

**Group H's blind spot.** The frozen reader calls `listColumnKeys()` and `getDefaultVisibleColumns()` from the
*current* registry. The registry is unchanged since `origin/main`, so the proof holds today. But if a future loop adds
a column, production would drop that key from the top-level columns, and its GET would write the cleaned document
back. Group H would not see this. The doc should say so (literal text in §9).

**Step 7.** The loop ran `saved-views-persistence.spec.ts` (29), not the whole dashboard directory as 203 did. This
review ran the whole authenticated project.

**Limits accuracy.** Accurate ("the shell's reaction to a 409 was not checked": now checked, above). Not stated: the
registry dependence of Group H.

---

## 3. Loop 205 — #409 the header reads in the dark (`ddd0a7d`): **HOLDS**

**Diff vs log:** matches (chip `text-brand-700 hover:text-brand-800 bg-brand-50`; new `e2e/app/header-a11y.spec.ts`,
10 tests; the `axe.ts` comment now points to it).

**Beyond /account** (`probe081h.raw.txt`), header-scoped axe, signed in:

| Probe | Observed | Verdict |
|---|---|---|
| /dashboard, /workflows/e2e-wf-growth-automate, /upload × dark, light × 375, 640, 1024, 1280 px (html class confirmed) | no critical or serious violation (24 scans) | ✓ |
| 375 px, menu open, on all three routes, both themes; then hover each of the 10 menu controls | none | ✓ |
| 1024 and 1280 px: hover each of the 12 header controls, then focus each | none (all three routes, both themes) | ✓ |
| whole-page axe at 1280 px, all three routes, both themes | **no serious or critical violation** (MR-080 found the chip on every page) | ✓ |

**Mutation** (`mut081/e2e-results.txt`): **E1** chip back to `text-[var(--brand-text)]` → killed (3 of 10 tests fail:
dark 1024, dark 1280, dark hover).

**#408 still true at `76e2d8d`:** `AppShell.tsx` has no focusout handler and no `aria-current`; 205 changed one class.

**Limits accuracy.** Accurate ("only /account is scanned"; the header is one component, and the three other routes
measured here agree).

---

## 4. Loop 206 — #405 the privacy page says what is sent (`76e2d8d`): **HOLDS on utm and the signed-in path; one clause false (N1)**

**Diff vs log:** matches (one sentence in section 9; a "campaign landing (#405)" test in `analytics-consent.spec.ts`).

**Each clause against measured bodies** (P1 signed out on `/pricing`, A1 signed in on `/dashboard`; the posthog-js
stub; `probe081p.raw.txt`, `probe081a.raw.txt`):

| Clause | Observed | Verdict |
|---|---|---|
| "remove query strings from page addresses" | `$current_url` `…/pricing`, `…/dashboard`; no body contains `/pricing?` or `/dashboard?` | ✓ |
| "replace record ids and share tokens in them with placeholders" | not re-measured; `posthog-privacy.ts` unchanged since MR-079's probe | — |
| campaign tags "sent as separate values" | `utm_*`, `$session_entry_utm_*` and `$set_once.$initial_utm_*` present | ✓ |
| "shortened to 64 characters" | `utm_campaign` (100 sent) and `utm_term` (70) arrive at 64 in every copy. **`gad_source` (90) arrives at 90**, as `gad_source` and `$session_entry_gad_source` | **false for gad_source (N1)** |
| "dropped if they contain an email address" | `utm_content=jane%40example.com` absent everywhere. **`mc_cid=bob@example.org` is sent unchanged** as `mc_cid` and `$session_entry_mc_cid` on every event, including later pages | **false for mc_cid (N1)** |
| ad-click ids "replaced with the word masked" | `gclid`, `ttclid`, `li_fat_id` = `<masked>` (raw values absent); fbclid/msclkid are covered by the loop's test | ✓ |
| signed in: "account id only" | `$identify` distinct_id = the user id with `$anon_distinct_id`; `$set_once` holds only referrer, URL, path and campaign keys; the e2e email appears in no body | ✓ |
| later events in the session | `$pageleave`, `$pageview`, `nav_link_clicked`, `page_viewed`, `dashboard_v2_viewed`: utm values capped at 64 and the email-bearing utm absent, signed out and in | ✓ for utm_* |

**Why.** posthog-js 1.367.0 collects campaign params `utm_*`, `gad_source` and `mc_cid` plus 17 click ids, and masks only
the click ids. `sanitizePostHogEvent` sanitizes keys matching `/^(?:\$initial_|\$session_entry_)?utm_/i`
(`posthog-privacy.ts:275`), so `gad_source` and `mc_cid` pass through untouched. The loop's test inspects only
`/utm_/` keys and never lands with these two. Neither name appears anywhere in `apps/web-app/src` or `e2e`. Dormant
until the browser key is set (#278). A code fix keeps the sentence as written. **N1.**

**Local only.** posthog-js stores the raw landing values (the 100-character campaign, the email) in
`localStorage['ph_phc_…_posthog']`; the sanitizer runs on send. The page says "before sending", which is accurate.

**Mutation:** **E2** `UTM_MAX_LENGTH` 64 → 100 → killed (the campaign-landing test fails).

**Limits accuracy.** Accurate ("the signed-in identify path is not measured": now measured, it holds; "only the first
two events are asserted": the later ones hold too, for utm). Not stated: the campaign params outside `utm_*`.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| preferences version, newer-version read, route 409 and GET write-back (in place, unit) | 8 | 8 | — |
| header chip contrast (in place, e2e `header-a11y.spec.ts`) | 1 | 1 | — |
| utm length cap (in place, e2e `analytics-consent.spec.ts`) | 1 | 1 | — |

---

## 6. Governance

**Selection.**
- **204** `burn-down` #407 (12), MR-080's first pick, `backend-engineer` (consecutive 2: 203, 204). ✓
- **205** `burn-down` #409 (11), MR-080's second pick, `frontend-engineer`. ✓
- **206** `burn-down` #405 (10), MR-080's third pick, `security-reviewer`. ✓ The cool-off is **3/3, re-armed at 206**,
  as MR-080 planned.

**Agents.** `backend-engineer` → `frontend-engineer` → `security-reviewer`. No 4+ run. All three primaries have Bash.
`analytics` still has none (CEO queue).

**Step 7 bullets (MR-078…080):** 205 changed a component on every page and ran the whole `authenticated` project (192 +
2) ✓; 206 ran the whole `public` project (141) ✓; 204 changed dashboard plumbing and ran one spec (29), narrower than
203's directory run (§2). The stored-format bullet (MR-080) worked: 204's Limits states what production does, with a
test that proves it.

**Directory saturation:** `lib/dashboard-columns/`, `api/dashboard/` (204, as at 203); `components/AppShell.tsx`,
`e2e/app/` (205); `app/(public)/privacy/`, `e2e/public/` (206). Clean. **Area** rolling five (202-206): a11y, dashboard,
dashboard, a11y, privacy. No penalty for any area at 207.

**MR-080 annotations:** closure notes #404/#403/#103 and appends #406/#278/#399/#39/#43/#60 are present. The
`ANALYTICS_ARCHITECTURE.md` status line and the coordinator Step 7 stored-format bullet are applied. #407-#409 were
filed verbatim. The #60 append recommends "status awaiting architecture", but its status cell still says "new".

**"Undeployed: N loops"** is in all three Controls blocks (53, 54, 55); Extension 161-163.

**Primary-file and validation lines:** present in all three (exit codes, "no Errors line", e2e counts, port check).
Fifteenth consecutive window.

**Density / follow-ups:** none filed by loops; no trigger.

**Ratio, loops 197-206** (same method as MR-069…080: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #398 (197), #400 (198), #397 (199), #401 (200), #404 (201), #403 (202), #103 (203), #407 (204), #409 (205), #405 (206) |
| Created | 10 | MR-078 #400-#402, MR-079 #403-#405, loop 203 #406, MR-080 #407-#409 |
| Ratio | **1.00** | above the ≥ 0.5 floor |

This review files one row: **124 open** after it.

**D-1.** Last extension touch `871e29a`: **163 loops** at 206, zero commits under the extension surfaces since. Still
unanswered.

**Staleness (next oldest open non-blocked rows not checked since MR-070), at `76e2d8d`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #28 | 7 | `api/billing/portal/route.ts:24` still answers 400 "No billing account found" to a paid user without `stripeCustomerId`; the account page shows that error (`account/page.tsx:443`), with no contact-support path | **keep; true** |
| #45 | 8 | the Systems cell still renders text pills (`WorkflowRow.tsx`, `toolsUsed.slice(0, MAX_SYSTEMS)`); there is no tool-to-icon map | **keep; true; needs an icon-source decision** |
| #61 | 7 | `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` (`workflow-metrics.ts:113`) unchanged; calibration needs production data | **keep; mark awaiting production data** |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **75 ahead** at `76e2d8d` (76 once this review is committed); loops 152-206 (55) are not in production. The whole deploy gate passes locally, and **the push is rollback-safe (§2)**. Nothing blocks it |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (latest `37171882884`), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (163 loops) |
| #399 | Consent scope | unchanged |
| — | Stored share tokens | delete/redact existing `AnalyticsEvent` rows with `/share/<token>`; rotate live links or not; proxy logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| #278 | PostHog keys | only `NEXT_PUBLIC_POSTHOG_KEY` (and host); not before N1 and #389 |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**PostHog readiness (probed).** Server path: gone (MR-080). Browser path: signed-out and signed-in landings measured
here; query strings stripped, utm capped and email-filtered in every copy, click ids masked, account id only. Two
campaign params escape the sanitizer (**N1**). Remaining before the key: **N1**, **#389** (free text and page titles),
the stored-token decision, #399, then the key (#278).

**CI time.** Local: public 8.4 min, api 0.5, authenticated 11.1: about **20.0 min** (was 18.2). The last CI run of the
job took 11 min 9 s against `timeout-minutes: 30` (`retries: 2`). If the first CI run after the push passes about 22
min, the cheapest cut is still one theme in the public `page-width.spec.ts`.

---

## 7. Patterns

1. **MR-080's stored-format bullet worked the first time it was used.** 204 answered "what does production do with
   this?" with a frozen copy of production's reader and a control that shows the old defect. The 55-loop push went
   from one-way to rollback-safe in one loop. The remaining gap is that the proof froze the reader but not its
   inputs (the registry); §9 adds one sentence to the doc.
2. **A privacy sentence tested against the keys we know, not the keys the library sends.** 206's sentence and test cover
   `utm_*` and three click ids. posthog-js's own campaign list has two more keys that our sanitizer misses. N1's test
   takes its key list from posthog-js's list, so a key added by a posthog-js upgrade is checked too.
3. **Every review since MR-077 found the next door in each loop. This window found the first loop with none (205).**
   The header class is clean across routes, themes, widths, hover, focus and the open menu. Testing the whole class
   (MR-079) and naming the scope (MR-080) are paying off.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-080 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `76e2d8d`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | #85, #106, #114, #137, #174 | 11 | audit | per MR-067/068/078 | cool-off only (3/3) |
| 2 | **N1** `mc_cid` and `gad_source` reach PostHog unsanitized | 10 | follow-up | true (dormant until the key) | P1 |
| 2 | #408 | 10 | follow-up | true; not deployed | `AppShell.tsx` (§3) |
| 2 | #381, #377 | 10 | follow-up | true; unchanged | — |
| 6 | #389, #402, #406, #396 | 9 | follow-up | unchanged | — |
| 7 | #393, #382, #223, #98 | 8 | follow-up / audit | unchanged | — |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Two campaign parameters that posthog-js collects, `mc_cid` and `gad_source`, reach PostHog unsanitized, so privacy section 9's 'shortened to 64 characters and dropped if they contain an email address' is false for them.** MR-081 §4. Measured with the app's posthog-js 1.367.0 and the e2e stub key, consent full, landing on /pricing with mc_cid=bob%40example.org and a 90-character gad_source (plus utm values and click ids): every event of the session ($pageview, pricing_page_viewed, $pageleave, nav_link_clicked, and the next pages) carries `mc_cid` = bob@example.org and `$session_entry_mc_cid` = bob@example.org, and `gad_source` / `$session_entry_gad_source` at 90 characters; on a signed-in landing the same keys would also go into `$set_once` as `$initial_mc_cid` / `$initial_gad_source`. The utm values in the same bodies are capped at 64 and the email-bearing utm_content is absent, as section 9 says. Cause: posthog-js's campaign list is utm_source, utm_medium, utm_campaign, utm_content, utm_term, gad_source, mc_cid plus 17 click ids, and it masks only the click ids; `sanitizePostHogEvent` sanitizes only keys matching `^(?:$initial_` or `$session_entry_)?utm_` (`lib/posthog-privacy.ts:275`). The loop 206 test checks only utm-named keys. Dormant until the browser key is set (#278). Fix as one outcome, in code (the sentence then stays true): pass `gad_source` and `mc_cid` (bare, `$initial_` and `$session_entry_` forms, in properties, `$set` and `$set_once`) through `sanitizeUtm`, dropping a rejected value. Tests: a unit test in the posthog-privacy tests for each form; extend the 'campaign landing (#405)' e2e with mc_cid holding an email and a 90-character gad_source, asserting mc_cid absent and gad_source at 64 in every body; take the list of campaign keys asserted from posthog-js's own campaign list rather than a hand-written one, so a key added by a posthog-js upgrade fails the test until it is sanitized or masked. Revert proof. Run the whole public project (Step 7). Follow-up of loop 206 (#405). | fix | analytics / privacy | `security-reviewer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |

**Annotations recommended:**
- **#407 closure note:** "[MR-081: holds; the push is rollback-safe. The Group H copy is code-verbatim to production's reader (git show origin/main, renames applied; one comment differs). Production's GET and column-only PUT logic, run over a row written by this build, keep every column, saved view and saved-view filter byte-identical and drop only defaultTimeRange; this build then reads range all. No other stored format in origin/main..HEAD changed shape (no Prisma change; consent values, first-touch keys and the reset-token hash unchanged; ledgerium_ph_identified_user is new and ignored by production). 8 of 8 unit mutants killed. On a real schemaVersion 3 row the shell keeps the data (row byte-identical, a deleted view restored) but says 'Please try again', which cannot succeed, and leaves a toggled column ticked until reload (see #382). Group H reads column keys from the current registry, not production's; see PERSISTENCE_SCHEMA.md. The loop ran one e2e spec; MR-081 ran the whole authenticated project.]"
- **#409 closure note:** "[MR-081: holds. Header-scoped axe on /dashboard, a workflow page and /upload, dark and light, at 375, 640, 1024 and 1280 px, with the menu open at 375 and every header control hovered and focused at 1024 and 1280: no critical or serious violation. Whole-page axe at 1280 px on the same routes now finds nothing serious in either theme. Reverting the chip classes fails 3 of the 10 header tests.]"
- **#405 closure note:** "[MR-081: holds for utm values, click ids and the signed-in path. Query strings are stripped; utm_campaign and utm_term arrive at 64 characters in properties, $session_entry_ and $set_once copies; an email-bearing utm_content is absent; gclid, ttclid and li_fat_id arrive as <masked>; signed in, $identify carries the account id only and no body contains the email; later events in the session carry the same sanitized values. Changing the 64 cap fails the new test. Gap: posthog-js also collects mc_cid and gad_source, which are sent unsanitized (an email in mc_cid and a 90-character gad_source were sent), so the sentence is false for them (N1). posthog-js keeps the raw landing values in its localStorage entry; the sanitizer runs on send, which the page's 'before sending' covers.]"
- **#382 append:** "(MR-081) The shell treats every non-2xx PUT the same: on a 409 from a newer-version row (row #407) it says 'Couldn't save your changes. Please try again.', which cannot succeed, rolls back saved views but leaves toggled columns ticked until reload. This row's conflict 409 needs its own handling (reconcile from the server and say so), and the newer-version 409 should say the preferences were saved by a newer version of the app."
- **#408 append:** "(MR-081) Still true at 76e2d8d: AppShell.tsx has no focusout handler and no aria-current; loop 205 changed only the chip classes."
- **#28 append:** "(MR-081) Still true at 76e2d8d: api/billing/portal/route.ts:24 answers 400 'No billing account found' to a paid user without stripeCustomerId, and the account page shows that error with no contact-support path."
- **#45 append:** "(MR-081) Still true at 76e2d8d: the Systems cell renders text pills and no tool-to-icon map exists; needs an icon-source decision before it can be built."
- **#61 append:** "(MR-081) Still true at 76e2d8d: PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3 (workflow-metrics.ts:113). Calibration needs production data; recommend status awaiting production data."
- **`docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md`, §3, replace the whole bullet that begins** `- **A bump is allowed only when the code already in production can read the new` **with:** "- **A bump is allowed only when the code already in production can read the new version without data loss (rollback-safe).** Check the deployed reader (`git show origin/main:apps/web-app/src/lib/dashboard-columns/persistence.ts`) before incrementing. Group H in `persistence.test.ts` holds a frozen copy of that reader and asserts a document written by the current code loses nothing except the range; extend it when the wire format changes. The frozen copy reads column keys from the current registry, not production's: when a loop adds, renames or removes a column key, also freeze production's key list (`git show origin/main:apps/web-app/src/lib/dashboard-columns/registry.ts`) in Group H, because production drops a key it does not know from the top-level columns and its GET writes the cleaned document back."

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 frozen copy verbatim; production GET/PUT keep views, columns and filters; range lost | #407 note |
| §2 no other stored format changed shape; push rollback-safe | #407 note; CEO item 1 |
| §2 409 says "try again" and leaves columns ticked; user-safe | #407 note; #382 append |
| §2 Group H uses the current registry | #407 note; doc text (§9) |
| §2 8 of 8 unit mutants; 204 ran one spec | #407 note |
| §3 header clean on three routes, both themes, all widths, hover, focus, menu open; whole page clean | #409 note |
| §3 #408 still true | #408 append |
| §4 utm, click ids, signed-in identify and later events hold | #405 note |
| §4 mc_cid and gad_source sent unsanitized | N1 |
| §4 raw landing values kept in posthog-js localStorage (local only) | #405 note |
| §6 staleness #28, #45 keep; #61 awaiting production data | #28, #45, #61 appends |
| §6 #60 status cell not updated after MR-080 | coordinator (status awaiting architecture) |
| §7 privacy tests should derive keys from the library's list | N1 test clause |

---

## 11. Loop 207-209 picks

**The push is unblocked.** The whole deploy gate is green locally at `76e2d8d`, and the push is rollback-safe (§2).
55 loops are undeployed. Also `CRON_SECRET` and the job URLs (item 4), D-1 (item 21), #399, stored tokens.

Pool 123 + 1 = 124 > 8. The cool-off is **3/3**. **Hold it:** the score-11 audit rows are one point above the best
follow-ups, and the PostHog code preconditions (N1, #389) are the shortest path to the key. All three picks are
`burn-down`.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **207** | **N1** sanitize `mc_cid` and `gad_source` before PostHog | **10** | `burn-down` (follow-up of 206) | `security-reviewer` | analytics / privacy | makes 206's sentence true; small; a PostHog precondition; the author's context is fresh |
| **208** | **#408** app menu: close on focus out and on any link, `aria-current` | **10** | `burn-down` (follow-up of 202) | `frontend-engineer` | web-app / a11y | not deployed yet (lands with the push); rotates the agent; whole `authenticated` project (Step 7) |
| **209** | **#389** free text and page titles out of PostHog | **9** | `burn-down` (follow-up of 188) | `security-reviewer` | analytics / privacy | the last PostHog code precondition; then only CEO decisions stand before the key |

- **Cool-off:** stays 3/3 through 209 unless the CEO wants an audit row (#174, #85, #106, #114, #137 at 11).
- **Then MR-082** (base cadence after 209), then **#381** then **#396** (separate loops), **#377** with theme tokens,
  **#402**, **#406**, #223, #382 after #381 (with the 409 handling in its #382 append), #393 if Umami is wanted.
- **Area check:** 207 privacy (after 206 privacy: 2 in a row, no rule), 208 a11y, 209 privacy.
- **Agents:** `security-reviewer` × 2 (206, 207) → `frontend-engineer` → `security-reviewer`; no 4+ run.
- **D-4:** N1 changes no copy and no contract; #408 adds no strings (an attribute); #389 changes no copy unless section 9
  needs a clause (then a short `growth-strategist` read).
- **Do not pick:** #396 before #381 is decided; #382 before #381; #377 as written (theme tokens per MR-074); #89, #91
  (Path C); #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the D-1 answer; #393 while
  the CEO has not said Umami is wanted; #399 (CEO); #60 (architecture); #45 (icon decision); #61 (production data); any
  implementation row with a tool-less primary.
- **Practice:** the full deploy gate every review and whole projects on shared plumbing (Step 7); fix and test the
  class; a stored-format change says what production does with it, with its inputs frozen too; a privacy sentence
  gets a check whose key list comes from the library; annotations are final text.

---

## 12. Verdict

Every count reproduces at `76e2d8d`: root 6499, web-app 4729 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **141 + 14 + 192 (2 skipped)**. 10 of 10 mutants killed.

- **Loop 204 holds, and the push is rollback-safe:** the frozen reader is verbatim, and production's own GET and PUT keep
  views, columns and filters (only the range is lost). No other stored format changed. The 409 is user-safe but says
  "try again" (#382 append); Group H should also freeze the registry (doc text).
- **Loop 205 holds:** the header is clean on three routes, both themes, every width, hover, focus and the open menu;
  whole-page axe is clean. #408 is still open.
- **Loop 206 holds for utm values, click ids and the signed-in path:** `mc_cid` and `gad_source` escape the sanitizer
  (N1, 10).

Selection was sound, the cool-off is re-armed (3/3), ratio 1.00, and MR-080's Step 7 bullet worked on its first use.
Asks for the CEO: **push now** (it is rollback-safe); configure `CRON_SECRET` and the job URLs; answer D-1 and #399;
decide stored tokens, Umami and the `analytics` agent's tools. For the coordinator: N1, #408, then #389; the
`PERSISTENCE_SCHEMA.md` bullet; #60's status cell.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6499 / 4729 / 0, no Errors line
pnpm install --frozen-lockfile --offline                                           # exit 0, lockfile up to date
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 141 passed (8.4 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 192 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
git show origin/main:apps/web-app/src/lib/dashboard-columns/persistence.ts > $S/prod-persist081.ts
sed -n 178,362p $S/prod-persist081.ts | <prod renames> | diff - <(sed -n 357,541p apps/web-app/src/lib/dashboard-columns/persistence.test.ts)  # one comment line
(cd apps/web-app && ./node_modules/.bin/tsx $S/rollsim081.ts)                      # view byte-identical after production's PUT
git diff --stat origin/main..HEAD -- '*.prisma' '**/migrations/**'                 # empty
(cd apps/web-app && node $S/mut081/run.mjs)                                        # 8/8 killed, files identical
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && pnpm exec playwright test -c $S/probe081.config.ts --project=probe-pub)    # P1
(cd apps/web-app && pnpm exec playwright test -c $S/probe081.config.ts --project=probe-auth)   # H1-H2, A1, R1
(cd apps/web-app && node $S/mut081/e2e.mjs)                                        # E1, E2 killed, files identical
gh run list --limit 10; gh secret list                    # CRON_SECRET absent; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 75
```
