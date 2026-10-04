# MR-080 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 201-203, 2026-10-03 18:53 → 19:49 (−0600). Commits `cfe6e53` (loop 201, #404), `b02160a`
(loop 202, #403), `3f0985f` (loop 203, #103). Previous review MR-079 at `0d99eee`. Rows closed: #404, #403, #103.
Rows filed by loops: #406 (loop 203). Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-079 (`ITERATION_LOG.md`, loop 203 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared
exception to "no repo file touched", as at MR-075…079: mutants that only the repo's own tests can judge were applied
**in place** one at a time, each restored in a `finally` block, with the sha256 of all five files compared before the
first and after the last mutant (identical): `lib/dashboard-columns/persistence.ts` (5 mutants),
`app/api/dashboard/preferences/route.ts` (1), `dashboard-v2/savedViewsSync.ts` (2), `dashboard-v2/DashboardV2Shell.tsx`
(5), `components/AppShell.tsx` (4). The probes wrote rows into the e2e test database (`prisma/test.db`, untracked; every
Playwright run reseeds it). The e2e mutants and probes ran against a dev server I started on 3098 with the exact
`webServer` environment of `playwright.config.ts`; no other run shared it. Scratch went only to `…/scratchpad/`:
- `qg080.sh` (the quality gate), outputs `root080.txt`, `web080.txt`, `tc080.txt`, `val080.txt`, `guard080.txt`,
  `other080.txt`; `e2e080pub.txt`, `e2e080api.txt`, `e2e080auth.txt`; `install080.txt`; `status_before080.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver080.log`;
- `probe080.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe080m.spec.ts` (W5 app
  routes not in the new spec, W6 `/admin/operations` as admin, M1 keyboard, M2 names, M3 close behaviour, M4 whole-page
  axe), `probe080c.spec.ts` (C1 header contrast by theme and width, C2 keyboard and current-page link) and
  `probe080t.spec.ts` (T1-T6 time-range break attempts, real database rows through `@prisma/client`); outputs
  `probe080*.raw.txt`;
- `mut080/run.mjs` (outputs `mut080/*.txt`, `mut080/results.txt`, `mut080/runEM.txt`, `mut080/hash_before_U.txt`,
  `mut080/hash_after.txt`).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project and after stopping the dev server. Playwright ran one project at a time; free
memory was 1.8 GB when the dev server started.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 203 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6490 | **317 files, 6490 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4720 | **270 files, 4720 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 399 rows, 276 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install, after #404 removed `posthog-node`) | exit 0 (201) | **exit 0**, "Lockfile is up to date, resolution step is skipped", "Already up to date" | matches |
| e2e `public` (whole project) | not claimed | **140 passed (7.5 min)** | green |
| e2e `api` (whole project) | 14 (agent, 201) | **14 passed (22 s)** | matches |
| e2e `authenticated` (whole project) | 179 + 2 skipped (agent, 202) | **182 passed, 2 skipped (10.3 min)**: 179 plus loop 203's three | consistent |
| deltas | web 4697→4696→4696→4720; root 6467→6466→6466→6490 | 201 −1 / −1, 202 +0 (e2e only), 203 +24 / +24 | consistent |

The deploy gate is green at `3f0985f`: quality gate, then `test:e2e` **public 140, api 14, authenticated 182 + 2
skipped**. No flaky or retried test. The `batch rejected SyntaxError` teardown log appeared once in the authenticated
run, as at MR-078/079.

Pool arithmetic: MR-079 recorded 125 after its rows (#403-#405 filed, #96 struck). Loops 201-203 struck three (#404,
#403, #103) and filed one (#406): **123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build, a real PostHog or Umami project,
a real screen reader (names come from the accessibility tree), the live site (no `curl`), the deployed code itself
(the rollback finding, §4, reads the production reader at `origin/main` and measures the same branch in this build).
The `.env.example` files are blocked from reading by project policy; a tracked-tree `git grep` for `POSTHOG_API_KEY`
(which covers them) is the evidence for §2.

---

## 1. Lead

1. **All three loops hold on their primary claims, and the deploy gate is green at `3f0985f`.** Every count
   reproduces, including `test:e2e` project by project (140 + 14 + 182) and CI's frozen offline install. 15 of 17
   mutants are killed; the two survivors are untested edges of #103 (§4).
2. **Loop 203 made the push one-way (§4, N1).** It bumped the stored preferences schema to version 2 for one optional
   field. The code in production treats any version above 1 as "newer client, reset to defaults", and its PUT then
   writes those defaults back. Measured here: a newer-version row with a saved view reads back with no views, and one
   column change erases the view from the row. After the push, a rollback would wipe every saved view and column
   choice changed since. A version bump was not needed (the field is additive). Fix before the push: one small loop.
3. **Loop 202 holds; the header it fixed has two more defects (§3, N2, N3).** On a phone, Tab past the menu's last
   item moves focus under the still-open panel, and following the current page's link leaves the panel open. In the
   default dark theme, the header's "Get Extension" label is 1.82:1 on every signed-in page at 1024 px and wider. The
   authenticated axe checks are scoped to `main` "because the AppShell nav has contrast issues tracked separately", but
   no open row tracks them. All 17 app routes measured here, including six the new spec does not list, fit at 320/375.
4. **Loop 201 holds (§2):** nothing imports `posthog-node`, and CI's install passes without it. Privacy section 9 is
   now accurate on PostHog. One design doc and three code comments still describe server forwarding (annotations; the
   doc needs a literal status line so no later agent re-adds it).
5. **#406 is real (§4):** with a stored 7d range and the preferences GET answering 1.5 s late, the first
   `dashboard_v2_viewed` carries `time_range: 'all'`.
6. **Selection was sound:** MR-079's three picks in order; the cool-off spent at 203 as planned (now 0/3). Ratio,
   loops 194-203: **0.92** (11 closed / 12 created). "Undeployed: N loops" is in all three Controls blocks.

---

## 2. Loop 201 — #404 server events stay home (`cfe6e53`): **HOLDS**

**Diff vs log:** matches (`trackServer` no longer calls PostHog; `lib/posthog-server.ts` and its test deleted;
`posthog-node` out of `package.json` and 18 lockfile lines; stale mocks removed; a new signup-route test).

**Measured:**

| Check | Observed | Verdict |
|---|---|---|
| `posthog-node` in apps/packages | only `vi.mock('posthog-node', …)` in `analytics-server.test.ts` and `signup/route.posthog.test.ts`; no import | ✓ |
| Any other server path to PostHog | `git grep -i posthog` over `app/api`, `lib`, `packages`, middleware: only the browser `before_send` filter (`posthog-privacy.ts`) and comments | ✓ |
| CI install | `pnpm install --frozen-lockfile --offline` exit 0 at `3f0985f`; `apps/web-app/node_modules` has no `posthog-node` link (an orphan store directory remains locally; a fresh CI install has none) | ✓ |
| `POSTHOG_API_KEY` in the tracked tree | two tests (`vi.stubEnv`) and `docs/ANALYTICS_ARCHITECTURE.md` (lines 546, 555, 566); none in `.env.example`, `.env.docker.example`, the Dockerfile, the workflows or the README | ✓ code; **doc stale** |
| Privacy section 9 | PostHog bullet ("Loaded only if you choose Accept. It receives page views and named product events …") is now true for the server path | ✓ |
| Unit and route tests | pass in the gate (4720); MR-079 counted 31 server event types, all now DB-only | ✓ |

**Docs and comments now misleading.** `docs/ANALYTICS_ARCHITECTURE.md` (Draft, 2026-04-16) still prescribes the
removed design: §3.2 "Install `posthog-node`", §6.3 "Server-side events … still fire but are not tied to a PostHog
distinct ID", Phase 1 task 1b "Install `posthog-node`, wire `trackServer()` to PostHog server SDK", and §9.3 "PostHog
Server SDK Contract" with `POSTHOG_API_KEY`. A later agent following that doc would re-open #404. Code comments:
`api/auth/signup/route.ts:117-119` ("written to the AnalyticsEvent blob AND forwarded to PostHog"),
`lib/analytics.ts:704-709` ("persisted / forwarded to PostHog via trackServer()"), and the `visitorId` JSDoc at
`lib/analytics.ts:755-758` (MR-079 already flagged it). Literal status line for the doc in §9; comments in the #404 note.

**Section 9, one omission (not false).** "Our own analytics" describes page addresses and the anonymous visitor id; it
does not say that server events (signup, billing, uploads, teams) are stored with the account id, and billing events
with the first-touch visitor id. That belongs to the consent-scope decision (#399 append).

**Step 7.** The loop changed `lib/analytics.ts` (one comment line) and ran only the `api` project; the literal rule
asks for the whole project the file affects. Harmless for a comment, and this review ran all three.

**Limits accuracy.** Accurate on code. Not stated: the design doc and the comments.

---

## 3. Loop 202 — #403 the app fits a phone (`b02160a`): **HOLDS; two header defects remain (N2, N3)**

**Diff vs log:** matches (disclosure below `sm` with `aria-expanded`/`aria-controls`, focus in, Escape back, close on
outside click and pathname change; labels always rendered; Help and Sign out labelled; dashboard table region;
`CommandHeader` and detail actions wrap; `page-width.spec.ts` over 11 routes).

**Widths beyond the spec** (`probe080m.raw.txt`, W5/W6), signed in, 320 and 375 px:

| Route | Result |
|---|---|
| `/account/purchase-success`, `/compare/diff` (with and without two ids), `/compare?ids=…`, `/teams/<unknown id>` | fit |
| `/analytics/product`, `/analytics/process/<id>` | redirect to `/dashboard` for this user (fits) |
| `/admin/operations` as the seeded admin | renders the 404 page **inside** AppShell (fits; `#app-nav` present). The admin dashboard itself needs the admin environment and was not measured. The admin layout's comment ("overrides the (app) AppShell wrapper") is false |
| `/sop/*` | no such route under `app/(app)`; the loop's Limits named a route that does not exist |
| `/docs` | public layout, fits |

**Keyboard and names at 375 px** (M1-M3, C2):

| Probe | Observed | Verdict |
|---|---|---|
| Enter / Space on "Toggle menu" | opens; focus to "Workflows"; Shift+Tab returns to the button | ✓ |
| Accessible names (aria snapshot, menu open) | all seven sections, "Switch to light mode", "Documentation", "Sign out", landmark "Primary" | ✓ |
| Tab past "Sign out" | focus moves to the first link in the page content (y 345) while the menu stays open (`aria-expanded` true) and the absolute panel (y 56-414) covers it: `elementFromPoint` at the link's centre is the panel. Every further Tab keeps the menu open | **WCAG 2.4.11 (N2)** |
| Link to the current page (Upload on `/upload`, Account on `/account`) | menu stays open over the content (closes only on a pathname change) | **N2** |
| `aria-current` on the active link | none at 375 or 1280 (colour only); `PublicNav` sets it | **N2** |
| Documentation by keyboard | navigates to `/docs` | ✓ |
| Focus trap? | none, and none is wanted: it is a non-modal disclosure, as in `PublicNav` (which also has no trap). The fix is to close when focus leaves, not to trap | — |

**Whole-page axe** (M4, no scope), `/dashboard`, `/account`, `/workflows/<id>`, `/upload`: at 375 px, menu closed or
open, nothing new versus desktop (only `heading-order`, moderate, on `/workflows/<id>` and `/upload`, present at every
width). At **1280 px** every page has one **serious** `color-contrast` in the header. C1 (`probe080c.raw.txt`) pins it:
`.lg:inline` ("Get Extension", 13 px), `#34d399` on `#ecfdf5`, **1.82:1**, dark theme (the default) at 1024 and 1280
px; light theme and 640 px pass. `ExtensionInstallButton` uses `text-[var(--brand-text)] bg-brand-50`: `--brand-text`
is the dark-surface token, but the chip's background is brand-50 in both themes (`brand-700` on brand-50 is 5.21:1).
`e2e/helpers/axe.ts` scopes every authenticated check to `main` because "the AppShell nav has pre-existing contrast
issues that are tracked separately"; no open row tracks them. Pre-existing, in production. **N3.**

**Mutations** (`mut080/results.txt`; `page-width.spec.ts`, 28 tests): **M1** no Escape → killed; **M2** no close on
navigate → killed; **M3** labels `hidden sm:inline` again → killed (2 tests; note the spec's name check reads
`textContent`, which ignores CSS, so it is axe that catches this); **M4** no focus into the menu → killed.

**CI time.** Local: public 7.5 min, api 0.4, authenticated 10.3 (was 9.1): about **18.2 min**. The last CI run of the
job took 11 min 9 s against `timeout-minutes: 30` (`e2e-web-app.yml`, `retries: 2`). Projected about 20-23 min. If a
run passes about 22 min, the cheapest cut is still one theme in the public `page-width.spec.ts`.

**Limits accuracy.** Accurate ("/admin and /sop not measured"; "axe covers only the open nav"), except that `/sop`
does not exist. Not stated: the obscured focus and the header contrast (outside `#app-nav`'s axe scope at 375).

---

## 4. Loop 203 — #103 the dashboard remembers its time range (`3f0985f`): **HOLDS on the row; rollback erases preferences (N1)**

**Diff vs log:** matches (schema v2 with optional `defaultTimeRange`; v1 → `'all'`; invalid → default with a warning;
route enum, absent keeps; range rides the whole-document PUT; pre-load choice held; URL at mount wins and is not
saved; +24 unit, 3 e2e; design-note status line).

**Break attempts** (`probe080t.raw.txt`; real rows written with `@prisma/client` into the e2e database):

| Probe | Observed | Verdict |
|---|---|---|
| T1 land on `?timeRange=7d` (stored `all`), then choose 90d | shows 7d, nothing saved; choosing 90d sends one PUT with `defaultTimeRange: '90d'` and the columns; stored 90d; a clean `/dashboard` shows 90d | ✓ (a user choice after a URL override is saved) |
| T2 two tabs | A chooses 7d (stored 7d; A's URL becomes `?timeRange=7d`). B, which never touched the range, toggles a column: its PUT has no `defaultTimeRange`, stored stays 7d ✓. B chooses 30d: stored 30d (last write wins). A reloaded with F5 shows **7d** (its own URL carries the range and wins); A at a clean URL shows 30d | ✓; the stored default applies only on clean arrivals (note) |
| T3 a real v1 row (`schemaVersion` 1, one saved view, no range) | GET answers schema 2, range `all`, the view kept, no warning; the row stays v1 until a write; a range-only change writes v2 with range 30d and the view kept | ✓ |
| T4 stored range `"yesterday"` | GET `all` with warning `defaultTimeRange is not a valid range (got: "yesterday"); using "all".`; page shows `all`; PUT `"yesterday"` → 400, PUT `null` → 400 | ✓ |
| T5 stored 7d, switch lens to LSS and back, apply a saved view | 7d throughout; the view's PUT carries no range; stored 7d | ✓ |
| T6 (#406) stored 7d, first `dashboard_v2_viewed` on `/api/analytics/events` | preferences GET on time: `'7d'`; GET delayed 1.5 s: **`'all'`** | #406 confirmed (a race) |
| Range change during a reconcile | not driven (needs an unknown PUT outcome); unit tests U7/U8 below cover the state machine | by unit test |
| **T3b a row at a newer schema version** (3, one saved view) | GET: **0 views**, range `all`, warning "Preferences from a newer client version (schemaVersion 3); resetting to defaults."; one column-only PUT: 200, the row now holds **0 views** | **data loss (N1)** |

**Why T3b matters: the production reader.** Every PUT since 203 writes `schemaVersion: 2`. The code in production
(`origin/main`, loop 151) has the same future-version branch (`persistence.ts` lines 242-250 at `origin/main`: any
`schemaVersion > 1` returns defaults), and its PUT builds the stored document from that result (`route.ts:153` at
`origin/main`: `savedViews: existing.preferences.savedViews`, the defaults' empty list). So if 203 is deployed and then
rolled back (redeploying an older commit is the only rollback the deploy workflow offers), each affected user first
sees default columns and no saved views, and their next column change makes it permanent. The production v1 reader
rebuilds a v1 document from known fields and ignores unknown ones, so an additive field under version 1 would have cost
only the range on rollback. `PERSISTENCE_SCHEMA.md` §3 prescribes a version bump for every field addition and still
says "Current: `1`" with no `defaultTimeRange`; the loop followed the protocol, and the protocol is the defect. Dormant
until the push. **N1.**

**Mutations** (`mut080/results.txt`): unit, persistence + route + sync tests (116): **U1** v1 migrates to 30d,
**U2** any string is a range, **U3** a stray range on a v1 document is honoured, **U4** v1 not migratable, **U5** an
absent range resets to `all`, **U6** range not serialised, **U7** a newer in-flight choice dropped on success, **U8**
reconcile keeps a pending range → **8 of 8 killed**. e2e, the five range tests: **E1** stored range overrides the
URL → killed; **E4** stored range beats a pre-load choice → killed; **E5** a range change is not saved → killed;
**E2** `popstate` without the param falls back to `all` instead of the stored range → **survived**; **E3** a reconcile
adopts the server range even when the user never touched it (replacing a URL override) → **survived**. Both survivors
are narrow (the URL is rewritten with the range, and a reconcile needs an unknown PUT outcome); annotation, no row.

**Hygiene:** the new comments in `savedViewsSync.ts` (header and three field comments) cite "#403" for this row
(#403 is the phone-width row).

**Limits accuracy.** Accurate (flash and view-event range filed as #406; range-only PUTs re-send columns; failed PUT
stays pending; shell e2e only). Not stated: rollback safety of the version bump, and the stale `PERSISTENCE_SCHEMA.md`.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| preferences migration, route, sync state (in place, unit) | 8 | 8 | — |
| time-range precedence in the shell (in place, e2e range tests) | 5 | 3 | E2 popstate fallback, E3 reconcile adopts untouched range |
| AppShell menu (in place, e2e `page-width.spec.ts`) | 4 | 4 | — |

---

## 6. Governance

**Selection.**
- **201** `burn-down` #404 (11), MR-079's first pick, `security-reviewer`. ✓
- **202** `burn-down` #403 (11), MR-079's second pick, `frontend-engineer` + `growth-strategist` (D-4: five labels). ✓
- **203** `top-score` #103 (11) via **`ceiling-cool-off: invoked`**, rationale logged, MR-079's third pick,
  `backend-engineer`. ✓ The cool-off is **0/3**; three consecutive `burn-down` loops re-arm it (earliest at 206).

**Agents.** `security-reviewer` → `frontend-engineer` → `backend-engineer`. No 4+ run. All three primaries have Bash.
`analytics` still has none (`analytics.md:4`; CEO queue).

**Step 7 bullets (MR-078, MR-079):** 202 changed a component on every page and ran the whole `authenticated` project
(179 + 2) ✓; 203 ran the whole dashboard directory (107) ✓ (not shared plumbing); 201 ran `api` only after a comment
change to `lib/analytics.ts` (§2). The class bullet worked: 202 tested 11 routes and named its uncovered ones; 201
named #389/#405 as the remaining egress.

**Directory saturation:** `lib/`, `api/` tests (201); `components/AppShell.tsx`, `dashboard-v2/`, `workflows/[id]`
(202); `dashboard-v2/`, `lib/dashboard-columns/`, `api/dashboard/` (203). `dashboard-v2/` in two consecutive loops;
clean. **Area** rolling five (199-203): dashboard, public-site, privacy, a11y, dashboard. No penalty for any area at 204.

**MR-079 annotations:** closure notes #400/#397/#401/#96, appends #98/#103/#399/#278 and the Step 7 class bullet are
all present; #403-#405 filed verbatim. Paste-ready text works.

**"Undeployed: N loops"** is in all three Controls blocks (50, 51, 52). MR-079's recommendation 1 is adopted.

**Primary-file and validation lines:** present in all three (exit codes, "no Errors line", e2e counts, port check).
Fourteenth consecutive window.

**Density / follow-ups:** one filed (#406, by 203); no trigger.

**Ratio, loops 194-203** (same method as MR-069…079: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 11 | #368 (194), #395 (195), #394 + #391 (196), #398 (197), #400 (198), #397 (199), #401 (200), #404 (201), #403 (202), #103 (203) |
| Created | 12 | MR-077 #395-#397, loop 196 #398-#399, MR-078 #400-#402, MR-079 #403-#405, loop 203 #406 |
| Ratio | **0.92** | above the ≥ 0.5 floor (MR-079's #96 strike, not a loop closure, is not counted) |

This review files three rows: **126 open** after them.

**D-1.** Last extension touch `871e29a`: **160 loops** at 203, zero commits under the extension surfaces since. Still
unanswered.

**Staleness (next oldest open non-blocked rows not checked since MR-070), at `3f0985f`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #39 | 6 | `UpgradeButton.tsx:94` still calls `setTimeout(() => { window.location.href = … }, 1500)` with no cleanup; a user who navigates away inside 1.5 s is still redirected | **keep; true** |
| #43 | 9 | `computeInsightChips(workflows, processInsights)` (`workflow-metrics.ts:725`) has no `staleCount`; the five chips include no stale chip | **keep; true** |
| #60 | 7 | still needs per-workflow history that does not exist (`needsAttention` has no delta arm); an architecture decision, overlapping Path C R+3 (`process_run_snapshot`) | **keep; mark awaiting architecture** |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **71 ahead** at `3f0985f` (72 once this review is committed); loops 152-203 (52) are not in production. The whole deploy gate passes locally. **Run N1 first (one loop), or push now and accept that a rollback past 203 erases preferences changed after the push** |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37160672933`, latest), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (160 loops) |
| #399 | Consent scope | unchanged; also decide whether section 9 says server events are stored by account id (§2) |
| — | Stored share tokens | delete/redact existing `AnalyticsEvent` rows with `/share/<token>`; rotate live links or not; proxy logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| #278 | PostHog keys | only `NEXT_PUBLIC_POSTHOG_KEY` (and host) are needed now; the server key does nothing (#404) |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**PostHog readiness.** Server path: gone (code, frozen install, unit and route tests, this gate). Browser path:
unchanged since MR-079's probe (no commits to `lib/posthog.ts`, `posthog-privacy.ts`, `analytics-consent.ts`,
`PostHogProvider.tsx` or the privacy page since `d826d08`; `lib/analytics.ts` changed one comment). Remaining before the
key: **#405** (campaign-tag sentence), **#389** (free text and page titles), the stored-token decision, #399, then the
key (#278). Not blocked by anything new.

---

## 7. Patterns

1. **MR-079's three recommendations were all applied, and each worked.** The Undeployed line is in every Controls
   block; 202 tested the whole class of app routes (and named the rest); the cool-off bought a verified audit row at
   203. The review again found the next door in each loop, but this time the doors were outside the class the loop was
   asked to fix (a design doc, a header contrast the axe scope hides, a rollback path), not more members of it.
2. **Nobody asks what production does with the new data.** 203 followed the schema protocol in `PERSISTENCE_SCHEMA.md`
   to the letter; the protocol assumes code only moves forward. With 52 loops queued for one push, the first rollback
   would be the first test of backward reading. A stored format change needs one question in Limits: what does the
   code in production do when it reads this? (§9 Step 7 bullet.)
3. **A narrowed scope with an untrue reason.** `e2e/helpers/axe.ts` scopes every authenticated axe check to `main`
   because the nav's contrast issues are "tracked separately"; they are not. A scope narrowing must name the row that
   tracks what it excludes. N3 fixes this one.
4. **Docs that prescribe removed code.** `ANALYTICS_ARCHITECTURE.md` still tells a reader to install `posthog-node`.
   Removal loops should mark the design doc that introduced the thing (literal text in §9).

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-079 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `3f0985f`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** a rollback past 203 erases saved views and columns | 12 | follow-up | true (dormant until the push) | T3b, `origin/main` code |
| 2 | **N3** header "Get Extension" 1.82:1 in dark theme | 11 | follow-up | true; in production | C1, M4 |
| 2 | #85, #106, #114, #137, #174 | 11 | audit | per MR-067/068/078 | cool-off only (0/3) |
| 4 | **N2** focus under the open app menu; current-page link; no `aria-current` | 10 | follow-up | true; not deployed | M1, M2, C2 |
| 4 | #405, #377, #381 | 10 | follow-up | true; unchanged | — |
| 6 | #389, #402, #406, #396 | 9 | follow-up | #406 confirmed (T6) | — |
| 7 | #393, #382, #223, #98 | 8 | follow-up / audit | unchanged | — |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **A rollback past loop 203 would erase every saved view and column choice that users changed after the deploy.** MR-080 §4. Loop 203 (#103) raised `CURRENT_SCHEMA_VERSION` to 2 for one optional field, so every preferences PUT now writes schemaVersion 2. The code in production (`origin/main`, loop 151) treats any schemaVersion above 1 as a newer client and returns defaults (`lib/dashboard-columns/persistence.ts`, future-version branch, lines 242-250 at origin/main), and its PUT builds the stored document from that result (`app/api/dashboard/preferences/route.ts:153` at origin/main keeps `existing.preferences.savedViews`, the defaults' empty list). Measured in this build, whose future-version branch is the same: a row at schemaVersion 3 with one saved view reads back with 0 views and the warning 'Preferences from a newer client version', and one column-only PUT rewrites the row with 0 views. So after the push, a rollback shows each affected user default columns and no saved views, and their next change makes the loss permanent. Dormant until the push (52 loops undeployed). The production v1 reader rebuilds a document from its known fields and ignores unknown ones, so an additive field under version 1 would cost only the range. Fix as one outcome, before the push: (1) store `defaultTimeRange` under schemaVersion 1 as an optional field: `CURRENT_SCHEMA_VERSION` back to 1, `migratePreferences` keeps a valid `defaultTimeRange` on a v1 document and resets an invalid one with a warning, and a schemaVersion 2 document (only local and test databases can hold one) is read as v1; (2) make the newer-version branch non-destructive from now on: read the known fields of a newer document instead of resetting, and never let a PUT replace a newer-version row with defaults (keep its saved views and columns, or answer 409). Update `docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md`: §2 still says Current: 1 with no `defaultTimeRange`, and the §3 protocol requires a version bump for any field; state that an additive optional field does not bump the version and that a bump must be readable by the code in production. Tests: unit, a v1 document with `defaultTimeRange` keeps its views and columns and the range; a newer-version document keeps its saved views through GET and through a column-only PUT (route test); the five range e2e tests still pass. Follow-up of loop 203 (#103). | fix | dashboard-v2 / persistence | `backend-engineer` | 4 | 4 | 3 | 5 | 2 | 2 | **12** |
| **N2** | **On a phone, Tab past the last item of the open app menu moves focus under the menu panel, and following a link to the current page leaves the panel open over the content.** MR-080 §3. Measured at 375 px, signed in, on /account: open 'Toggle menu', Tab through Workflows to Sign out, then Tab once more: focus moves to the first link in the page content (y 345) while the menu stays open (aria-expanded true) and its absolute panel (y 56 to 414) covers the link (elementFromPoint at the link's centre is the panel); every further Tab keeps it open. Choosing Upload on /upload or Account on /account also leaves it open, because it closes only when the pathname changes. The links have no aria-current at any width (the current page is shown by colour only), unlike `PublicNav`. WCAG 2.4.11 for the first; the others are usability. Introduced at loop 202 (#403); not deployed. Fix as one outcome, keeping a non-modal disclosure (no focus trap, as in `PublicNav`): in `components/AppShell.tsx` close the menu when focus moves outside both the panel and the button (focusout with a relatedTarget outside both), close it on any link activation including the current page, and set aria-current='page' on the active link. Tests in `e2e/app/page-width.spec.ts` at 375 px: Tab past the last item closes the menu and leaves focus on an element that is not covered; clicking the current page's link closes it; exactly one link has aria-current='page' on three routes; revert proof. AppShell is on every page, so run the whole authenticated project (Step 7). Follow-up of loop 202 (#403). | fix | web-app / a11y | `frontend-engineer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |
| **N3** | **In the default dark theme the app header's 'Get Extension' label measures 1.82:1 on every signed-in page at 1024 px and wider, and the authenticated axe checks cannot see it because they are scoped to main.** MR-080 §3. Measured with axe on the header of /account: dark theme at 1024 and 1280 px, the `.lg:inline` label (13 px) is #34d399 on #ecfdf5, ratio 1.82 (serious color-contrast); light theme and 640 px pass. Whole-page axe at 1280 px reports it on /dashboard, /account, /upload and /workflows/<id>, and nothing else serious. The chip is `ExtensionInstallButton` in `components/AppShell.tsx` with `text-[var(--brand-text)] bg-brand-50`: `--brand-text` is the token for dark surfaces, but the chip's background is brand-50 in both themes (brand-700 on brand-50 is 5.21:1). `e2e/helpers/axe.ts` scopes every check to main because 'the AppShell nav has pre-existing contrast issues that are tracked separately'; no open row tracks them. Pre-existing; in production. Fix as one outcome: give the chip a text and background pair that passes 4.5:1 in both themes (for example `text-brand-700 hover:text-brand-800` on `bg-brand-50`), add one authenticated axe check scoped to `header` on one route in both themes at 640, 1024 and 1280 px (and at 375 px with the menu open) with no critical or serious violations, and change the comment in `e2e/helpers/axe.ts` so it no longer claims separate tracking. Revert proof. AppShell is on every page, so run the whole authenticated project (Step 7). Follow-up of loop 202 (#403). | fix | web-app / a11y | `frontend-engineer` | 3 | 4 | 1 | 5 | 1 | 1 | **11** |

**Annotations recommended:**
- **#404 closure note:** "[MR-080: holds. Nothing in apps or packages imports posthog-node (only vi.mock in two tests); pnpm install --frozen-lockfile --offline exits 0 at 3f0985f; POSTHOG_API_KEY appears in the tracked tree only in two tests and docs/ANALYTICS_ARCHITECTURE.md, not in the env examples, Dockerfile, workflows or README; privacy section 9's PostHog bullet is now true for the server path. Stale text: the design doc (status line added at MR-080) and the comments at api/auth/signup/route.ts:117-119, lib/analytics.ts:704-709 and the visitorId JSDoc at lib/analytics.ts:755-758 still say server events go to PostHog; fix when next touching those files. The loop changed one comment in lib/analytics.ts and ran only the api project; MR-080 ran all three.]"
- **#403 closure note:** "[MR-080: holds. Six app routes the spec does not list fit at 320 and 375 px (purchase-success, compare/diff with and without ids, compare with ids, an unknown team id; analytics/product and analytics/process redirect to the dashboard). /admin/operations renders the 404 page inside AppShell for the seeded admin (the admin dashboard needs the admin environment; the admin layout comment saying it replaces AppShell is false), and there is no /sop route under app/(app). Keyboard and names pass; whole-page axe at 375 px finds nothing new versus desktop. Mutants no Escape, no close on navigate, labels hidden again and no focus into the menu are all killed (the hidden-labels mutant by axe; the name check reads textContent). Gaps: focus moves under the open panel after its last item, and a current-page link leaves it open (N2); the header's Get Extension label is 1.82:1 in dark theme at 1024 px and wider (N3).]"
- **#103 closure note:** "[MR-080: holds on the row. A URL range is shown and not saved, and a later user choice is saved; a tab that never touched the range does not send it; a real v1 row reads as schema 2 with range all and keeps its saved view; an invalid stored range resets with a warning and invalid PUTs answer 400; lens switches and applying a view leave the range alone. 11 of 13 mutants killed; untested: popstate without the param falling back to all instead of the stored range, and a reconcile adopting the stored range over a URL override the user never touched. Because the URL is rewritten with the range, a tab's own reload keeps its range; the stored default applies on a clean arrival. Comments in savedViewsSync.ts cite #403 for this row. Gap: the version bump makes a rollback erase preferences (N1).]"
- **#406 append:** "(MR-080) Confirmed at 3f0985f: with a stored 7d range, the first dashboard_v2_viewed delivered to /api/analytics/events carries time_range 7d when the preferences GET answers first and 'all' when it is delayed 1.5 s; the event fires on the workflows load, not on the preferences load."
- **#278 append:** "(MR-080) Since #404 (loop 201) the server key POSTHOG_API_KEY does nothing; only NEXT_PUBLIC_POSTHOG_KEY and its host are needed. Do not re-add posthog-node without a server-side consent record (#399)."
- **#399 append:** "(MR-080) Section 9's 'Our own analytics' bullet describes page addresses and the anonymous visitor id but does not say that server events (signup, billing, uploads, teams) are stored with the account id, and billing events with the first-touch visitor id. The decision should cover whether the page says so."
- **#39 append:** "(MR-080) Still true at 3f0985f: UpgradeButton.tsx:94 schedules the redirect with setTimeout and no cleanup, so a user who leaves within 1.5 s is still redirected."
- **#43 append:** "(MR-080) Still true at 3f0985f: computeInsightChips(workflows, processInsights) at workflow-metrics.ts:725 takes no staleCount and emits no stale chip."
- **#60 append:** "(MR-080) Still true at 3f0985f and still needs an architecture decision (per-workflow history does not exist); overlaps Path C R+3 (process_run_snapshot). Recommend status awaiting architecture."
- **`docs/ANALYTICS_ARCHITECTURE.md`, replace the line** `**Status:** Draft — requires Product and Engineering review before build` **with:** "**Status:** Draft, partly superseded. Server-side events are not sent to PostHog (row #404, loop 201): `trackServer` writes only the `AnalyticsEvent` row, `posthog-node` and `lib/posthog-server.ts` were removed, and `POSTHOG_API_KEY` is unused. Sections 3.2 (the PostHog server SDK), 6.3 (server-side events), 9.3 and Phase 1 task 1b describe that removed design; do not re-add it without a server-side consent record (#399)."
- **`.claude/agents/coordinator.md`, Step 7 — Validation, insert after the bullet that begins "- when the loop fixes one instance of a defect class" the bullet:** "- when the loop changes a stored format (a schema version, a persisted JSON document, a column), its Limits line states what the code now in production does when it reads the new format, and a test shows that reading it with the production rules loses no user data, so a rollback is safe (MR-080)"

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 no posthog-node import; frozen offline install; no POSTHOG_API_KEY outside tests and one doc; section 9 true | #404 note |
| §2 design doc and three comments still describe server forwarding | #404 note; doc status line (§9) |
| §2 section 9 omits server events stored by account id | #399 append |
| §2 server key now inert | #278 append |
| §3 six unlisted routes fit; /admin renders 404 in AppShell; no /sop route; admin layout comment false | #403 note |
| §3 focus under the open panel; current-page link; no aria-current | N2 |
| §3 Get Extension 1.82:1 in dark theme; axe scope claims tracking that does not exist | N3 |
| §3 four menu mutants killed | #403 note |
| §4 T1-T5 hold; 11 of 13 mutants; two survivors; #403 cited for #103 | #103 note |
| §4 newer-version row loses its views; production reader resets v2 | N1 |
| §4 #406 confirmed by a delayed GET | #406 append |
| §6 staleness #39, #43 keep; #60 awaiting architecture | #39, #43, #60 appends |
| §7 production never asked about new stored formats | coordinator.md Step 7 bullet |
| §7 push one-way after 203 | CEO item 1; N1 first |

---

## 11. Loop 204-206 picks

**Before the push: N1.** The whole deploy gate is green locally at `3f0985f`; 52 loops are undeployed. N1 is one
small loop and makes a rollback safe. Also `CRON_SECRET` and the job URLs (item 4), D-1 (item 21), #399, stored tokens.

Pool 123 + 3 = 126 > 8. The cool-off is **0/3**: every pick is `burn-down`.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **204** | **N1** preferences survive a rollback (schema back to 1; newer rows not destroyed) | **12** | `burn-down` (follow-up of 203) | `backend-engineer` | dashboard-v2 / persistence | highest open row; must precede the push; the author's context is fresh |
| **205** | **N3** header Get Extension contrast; axe on the header | **11** | `burn-down` (follow-up of 202) | `frontend-engineer` | web-app / a11y | highest follow-up after N1; in production on every signed-in page; whole `authenticated` project (Step 7) |
| **206** | **#405** privacy campaign-tag sentence | **10** | `burn-down` (follow-up of 198) | `security-reviewer` | analytics / privacy | tied at 10 with N2, #377, #381; a PostHog precondition; rotates the agent; one sentence plus one e2e |

- **Cool-off:** 204-206 all `burn-down` re-arms it to **3/3 at 206**. Do not spend it before then.
- **Then MR-081** (base cadence after 206), then **N2** (the menu; `frontend-engineer`), **#389** (`security-reviewer`;
  the last PostHog code precondition), **#381** then **#396** (separate loops), **#402**, **#406**, #377 with theme
  tokens, #223, #382 after #381, #393 if Umami is wanted.
- **Area check:** 204 persistence (dashboard, after 203's dashboard: 2 in a row, no rule), 205 a11y, 206 privacy.
- **Agents:** `backend-engineer` × 2 → `frontend-engineer` → `security-reviewer`; no 4+ run.
- **D-4:** N1 changes no copy and adds no new contract over 200 LOC; N3 changes no string; #405 changes one sentence
  (under the threshold; a short `growth-strategist` read is optional).
- **Do not pick:** #396 before #381 is decided; #382 before #381; #377 as written (theme tokens per MR-074); #89, #91
  (Path C); #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the D-1 answer; #393 while
  the CEO has not said Umami is wanted; #399 (CEO); #60 (architecture); any implementation row with a tool-less primary.
- **Practice:** the full deploy gate every review and whole projects on shared plumbing (Step 7); fix and test the
  class; a stored-format change says what production does with it (§9 bullet); a privacy sentence gets a check that
  would falsify it; annotations are final text.

---

## 12. Verdict

Every count reproduces at `3f0985f`: root 6490, web-app 4720 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **140 + 14 + 182 (2 skipped)**. 15 of 17 mutants killed.

- **Loop 201 holds:** no `posthog-node`, install clean, section 9 true; one design doc and three comments still
  describe server forwarding (status line and note).
- **Loop 202 holds:** 17 app routes fit, names and keyboard pass, four mutants killed. The header still lets focus
  slide under the open menu (N2, 10) and shows a 1.82:1 label in dark theme that the axe scope hides (N3, 11).
- **Loop 203 holds on the row:** precedence, two tabs, v1 rows, invalid values, lens and views behave; #406 is
  confirmed. The version bump makes a rollback erase saved views and columns (N1, 12).

Selection was sound, the cool-off was spent as planned (0/3), ratio 0.92, and MR-079's three recommendations took hold.
Asks for the CEO: **push after N1** (or now, accepting the rollback risk); configure `CRON_SECRET` and the job URLs;
answer D-1 and #399; decide stored tokens, Umami and the `analytics` agent's tools. For the coordinator: N1, N3, then
#405; the design-doc status line; the Step 7 stored-format bullet.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6490 / 4720 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 140 passed (7.5 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 182 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
pnpm install --frozen-lockfile --offline                                           # exit 0, lockfile up to date
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && pnpm exec playwright test -c $S/probe080.config.ts --project=probe-auth)   # W5-W6, M1-M4, C1-C2, T1-T6
(cd apps/web-app && node $S/mut080/run.mjs)               # 15/17 killed (E2, E3 survive), files restored identical
git show origin/main:apps/web-app/src/lib/dashboard-columns/persistence.ts | sed -n 242,250p   # production resets v2
git grep -n POSTHOG_API_KEY                               # two tests and docs/ANALYTICS_ARCHITECTURE.md
gh run list --limit 10; gh secret list                    # CRON_SECRET absent; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 71
```
