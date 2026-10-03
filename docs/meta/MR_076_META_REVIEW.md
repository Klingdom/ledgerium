# MR-076 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 189-191, 2026-10-03 13:04 → 13:37 (−0600). Commits `ec4662a` (loop 189, #388), `6f16ac8`
(loop 190, #387), `4e109ae` (loop 191, #355). Previous review MR-075 at `453ddd2`. Rows closed: #388, #387, #355.
Rows filed by loops: #391 (loop 191). Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-075 (`ITERATION_LOG.md`, loop 191 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or the design note. No commit, no
`git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared exception to "no repo
file touched", as at MR-075: mutants that only the repo's own tests can judge were applied **in place** one at a time,
each restored in a `finally` block and compared with a saved original after every mutant: `DashboardV2Shell.tsx`
(2 mutants, e2e), five loop 189 files (7 mutants, vitest) and `useAnalyticsIdentity.ts` (11 mutants, vitest).
`cmp` / `git hash-object` show every file identical afterwards. Scratch went only to `…/scratchpad/`:
- `ph076/`: vitest probes with the repo's modules, stubbed `next-auth/react` and `next/navigation`, real posthog-js
  1.367.0 with a stubbed transport (gzip bodies decoded): `landing.test.tsx` (UTMCapture → `signup_completed` → the real
  ingest route with a mocked `db`) and `ident.test.tsx` (`AnalyticsIdentitySync` through anonymous, sign-in, reload,
  user switch and expiry; output `ph076_ident.txt`);
- `mut076s/`: copies of `savedViewsSync.ts` and its test, 15 mutants (`mut076s.txt`); `mut076e/`: the in-place shell
  mutants (`mut076e.txt`, `X1.txt`, `X2.txt`); `mut076p/`: the in-place loop 189 guard mutants (`mut076p.txt`);
  `mut076i/`: the in-place identity mutants (`mut076i.txt`);
- `root076.txt`, `web076.txt`, `tc076.txt`, `val076.txt`, `guard076.txt`, `e2e076.txt`, `status_before076.txt`: run
  outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. No custom Playwright probe was run this time; every browser run was the repo's own e2e, which starts and
stops its own dev server and re-seeds the local SQLite test DB in its global setup (normal). `netstat` shows nothing
listening on 3000, 3097 or 3098 afterwards. No preference rows were written outside the repo's own specs.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 191 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6429 | **313 files, 6429 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4641 | **263 files, 4641 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 384 rows, 261 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `saved-views-persistence` + `v2-a11y` + `analytics-identity-reset` | 45 (190, first two) + 1 | **46 passed (2.7 min)**, #366's `test.fail` counted as expected | matches |
| deltas | web 4618→4624→4631→4641; root 6416→6422→6429→6429 | 189 +6 (both), 190 +7 (both), 191 +10 web / +0 root (`.tsx` tests are web-only) | consistent |

Pool arithmetic: MR-075 recorded 122 and filed three (#388-#390): 125. Loops 189-191 struck three and filed one
(#391): **123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a production build, a real PostHog or Umami project,
the live site (no `curl`). The agents' revert proofs are taken from the log; the mutants below are mine.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** All seven loop 189 guards I wrote
   as mutants are killed (§2); the edit counter is pinned by unit and e2e (§3); real posthog-js identifies by user id
   only and resets on switch and expiry, with no email in any body (§4).
2. **The share token still reaches the app's own analytics table, live, through first-touch attribution (§2, N1).**
   `UTMCapture` (mounted on every page, before consent) stores `landing_path: pathname`; a visitor whose first page is
   `/share/<token>` keeps `"/share/<token>"` in `ledgerium_first_touch_utm`, and `signup_completed` spreads it into
   its properties. Measured through the real ingest route: `AnalyticsEvent.properties` =
   `{"landing_path":"/share/shrTOKEN…"}`. PostHog's copy is templated (`landing_path` matches `PATH_KEY`), so this is
   the store, not PostHog. It is exactly the shared-SOP → signup funnel that `signup_from_shared_sop` measures.
3. **PostHog is not enable-ready on consent grounds, which no row lists (§4, N3).** Accept does not start PostHog
   until the next full load; consent cannot be changed or withdrawn anywhere in the app; the privacy page names neither
   PostHog nor Umami. #391 is a symptom of the first point.
4. **A second browser analytics tool has the same doors and no filter (§2, N2).** `UmamiAnalytics` loads the
   self-hosted Umami tracker on every page with no consent check and no `data-exclude-search`; Umami's tracker sends
   the page URL, so it would send `/share/<token>`, `/reset-password?token=` and `/teams/join?token=`. Dormant: the
   build variables are not set in GitHub (`gh variable list`), so no script loads in the deployed build.
5. **Two identity guards have no test (§4).** Removing the `loading` early return (a reset and re-identify on every
   reload of a signed-in page once PostHog is on) or storing the identity while PostHog is dormant (which would block
   the identify forever after a later consent) fails nothing. Recorded on #391, whose loop touches the same hook.
6. **Selection followed MR-075 exactly** (three `burn-down`, cool-off re-armed 3/3 at 191), every primary had a shell,
   and the MR-075 design-note text was pasted as written. Ratio, loops 182-191: **1.25** (10 closed / 8 created).

---

## 2. Loop 189 — #388 the share token stays home (`ec4662a`): **HOLDS for the paths it named; first-touch attribution is a further live door**

**Diff vs log:** matches. Both share events lose `token` (types and call sites); `track()` sets
`url = templatePath(pathname)`; `trackServer` logs the event name; `captureServerEvent` runs `sanitizePostHogEvent`;
ingest templates `url` and deletes a legacy `token` on the two share events. A `token` on the page-side `track` calls is
now a type error (`AnalyticsEvent` has no such field), so `pnpm typecheck` is the guard for the two client call sites.

**Mutations** (in place, restored, hashes identical; baseline 6 files, 50 tests, exit 0, no Errors line):

| Mutant | Result |
|---|---|
| G1 share route sends `token` again; G2 `track()` url untemplated; G3 server log prints the bag; G4 posthog-node unsanitized; G5 ingest url untemplated; G6 ingest keeps a legacy `token`; G7 ingest drops it on one event only | **7 of 7 killed** (1 test each) |

**Other bearer tokens and sinks, checked:**

| Path | Finding |
|---|---|
| `UTMCapture` → `getFirstTouchUTM` → `signup_completed` | **leak, live** (N1). `sanitizeFirstTouchRecord` cleans `utm_*` only; `landing_path` passes; ingest stores it in `properties`. Probe `landing.test.tsx`: `VERDICT TOKEN STORED`; the PostHog copy reads `/share/[token]` |
| Umami tracker (`UmamiAnalytics.tsx`) | **door, dormant** (N2). Loads `NEXT_PUBLIC_UMAMI_SCRIPT_URL` with only `data-website-id`, no consent gate, no `data-exclude-search` / `data-exclude-hash`; the self-hosted container runs (`compose.hostinger.yaml`), the repo variables are unset. Tracker behaviour is from Umami's documentation, not measured |
| `/teams/join?token=`, `/reset-password?token=` via `track()` | clean: `url` is the pathname only; no event property carries `location.search` |
| `AnalyticsEvent` columns | `url` is the only URL column (`schema.prisma:528`); nothing server-side reads the `Referer` header |
| `pricing_page_viewed` / `seo_*` referrer | host or class only (`referrerHost`, `referrerClass`) |
| server logs | `with-api-route` logs the route pattern, method, request id and user id; `email.ts` prints a reset link only when `NODE_ENV=development`. Residual: an unhandled Prisma validation error is printed whole and would include its query arguments (theoretical on the share route); the reverse proxy's access log holds every `/share/<token>` path (infrastructure, CEO queue) |
| Referer to third parties from `/share` | `Referrer-Policy: strict-origin-when-cross-origin` on `/:path*` (`security-headers.js`, test `security-headers.test.ts`): cross-origin requests carry the origin only. Config and unit test, not measured on a live response |
| `captureServerEvent` | if the sanitizer ever returned null the event would still be sent with `{}` (it cannot today: it returns null only for a null input); hygiene, no row |

**Limits accuracy.** Accurate (stored rows, key-based sanitizer, fake fetch). The loop did not grep the token's
producers beyond the share events, which is the MR-075 practice ("name every sink of a value") applied to sinks but not
to every producer of the path.

---

## 3. Loop 190 — #387 a reconcile adopts only an unchanged base (`6f16ac8`): **HOLDS**

**Diff vs log:** matches. `edits` in the sync state, bumped by `queueSave`, `recordPreloadToggle` and
`recordPreloadPack`; the shell reads it before the reconcile GET; `reconcileAdopt` adopts only if it is unchanged and
nothing is in flight, dirty or armed; on a skip `confirmed` is refreshed only while a send is still due;
`pending !== sent` removed. Design note: the §3(iv) exception and the base rule are written; MR-075's line 72 deletion
was carried out.

**Orders worked through against the code:**

| Order | Outcome | Verdict |
|---|---|---|
| Edit while the GET is out; its PUT succeeds before the GET returns (C3-view) | counter changed → no adoption; not busy → `confirmed` kept from `settleSuccess` | ✓ (unit and e2e) |
| Two overlapping reconciles A then B (an edit between them whose PUT fails while A is out) | A returns: counter changed → skip, clears `reconciling`; B returns with the counter unchanged since B started → adopts the newer answer. If B returns first, A's later answer is skipped by the counter | ✓ by construction |
| Pre-load delta then reconcile | cannot overlap: a reconcile follows a PUT, which follows the load | n/a |
| Lens-local toggle while the GET is out | not persisted, so no counter bump; an adoption then updates the **library** pack only (`libraryColumnsRef`), never the visible lens pack. The toggle is not a library change, so adopting the server's library pack is correct | ✓ |
| Lens switch to library while the GET is out | the switch shows the remembered library pack; the adoption then shows the server's pack | ✓ |

**Mutations.** Sync copies (`mut076s.txt`; baseline 50/50, exit 0): 15 mutants, **13 killed** (each of the three bumps,
the counter check, busy, inFlight, armed timer, both `confirmed` branches, pending, columns, `reconciling` on adopt, a
non-incrementing counter). Survivors: R6 `dirty` dropped from busy, **equivalent** (dirty is set only by a `dueSave`
after a counted `queueSave`, or by `settleTimeout` while a re-send is in flight); R11 a skip leaves `reconciling` set,
**untested** (a later definite failure would be handled as unknown, i.e. reconciled instead of rolled back; benign
direction). Shell, in place, against the 5 tests matching `#38[07]` (`mut076e.txt`; baseline 5/5): X1 reading the
counter when the GET answers instead of before it is **killed** by e2e C3-view; X2 reporting no armed timer
**survives**, equivalent at shell level (an armed timer always follows a counted `queueSave`).

**Limits accuracy.** Accurate (column variant unit-only, pre-fix C3-view not run, `page.clock`).

---

## 4. Loop 191 — #355 one identity, cleared on every change (`4e109ae`): **HOLDS; two guards untested; consent is the next precondition**

**Diff vs log:** matches. `useAnalyticsIdentity` in `AnalyticsIdentitySync` inside `AuthProvider`; clears the plan
slot and `clearAccountCache()`, resets PostHog only if an identity was published (ref or stored); identifies by id
with no properties; stores the id only when PostHog identified. Login and signup email identifies removed; the only
`identifyAnalyticsUser` caller passes `userId`.

**Real posthog-js** (`ph076_ident.txt`; key set, `initPostHog()` with the repo config, consent opted in):

| Step | distinct_id / stored key | Bodies |
|---|---|---|
| anonymous | `01a1034c-d5a4…` / null | `pricing_page_viewed` anonymous |
| sign in as A | `user_A` / `user_A` | `$identify` distinct `user_A`, `$anon_distinct_id` = the anonymous id (merge), `$set {}` |
| reload while signed in (remount) | `user_A` / `user_A` | **no** second identify, no reset |
| switch to B | `user_B` / `user_B` | reset, then `$identify user_B` from a **fresh** anonymous id (A and B not merged) |
| expiry, then a second unauthenticated render | new anonymous id / null | one reset only; later events anonymous |
| totals | `reset` ×2, `identify` calls `[user_A]`, `[user_B]` | **no `example.com` in any body**; the stored key holds the bare user id |

Sign-out by button (`AppShell.tsx:100-101`) clears the plan slot and calls `signOut({ callbackUrl: '/login' })`, a full
load; the stored id then triggers the reset on `/login`. Anonymous visitor → sign-up: identify merges the anonymous id
(row above). Second tab: posthog-js persistence and the stored key are shared `localStorage`; a stale tab converges on
focus (one extra reset and re-identify of the same user, harmless).

**Mutations** (in place, restored, hash identical; baseline 10/10, exit 0, no Errors line): 11 mutants, **7 killed**
(expiry reset, expiry clears, stored identity ignored on both paths, anonymous reset, switch reset, switch clears).
Survivors:
- **I9 the `loading` early return removed**: on every load of a signed-in page `status` starts as `loading`, so the
  stored identity would be reset and re-identified each time (a new anonymous id and an `$identify` per load once
  PostHog is on). The test "loading and anonymous first load never reset" has no stored identity. **Untested guard.**
- **I6 the id stored even when PostHog is dormant**: after a later consent the stored id would match and the identify
  would never run for that user. Test (d) does not assert the stored key. **Untested guard.**
- I4 identify on every same-user transition: posthog-js ignores a repeat identify of the current id; equivalent in
  effect. I10 the malformed-session guard: no realistic input.

**Consent (N3).** `PostHogProvider` reads consent once on mount (`:29-34`); `AnalyticsConsent.accept` writes
`localStorage` and hides the banner, nothing else. So: (a) Accept starts nothing until the next full load (#391 is the
identify half of this); (b) once chosen, the banner never returns and no control exists to change or withdraw consent,
nor any call to `opt_out_capturing`; (c) the privacy page names no analytics processor or consent choice.

**PostHog readiness, probed this window:** browser body filter (MR-075, loops 182/186), server SDK (loop 189 guards,
G4), identity (this section), first-touch (N1, PostHog copy clean). Remaining before a key: **#389** (free text),
**N3** (consent start/withdraw and disclosure), **#391** (measurement only; ideally solved by N3's start-on-accept), the
CEO's stored-token decision and the key itself (#278). Not probed: feature flags (disabled), `capture_pageleave`
payloads beyond the templated URL keys.

**Limits accuracy.** Accurate; "probed, not claimed as last" was the right framing. It missed that the late-consent gap
is part of a wider consent gap.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| loop 189 guards (5 files, in place) | 7 | 7 | — |
| `savedViewsSync.ts` (copies) | 15 | 13 | R6 (equivalent), **R11** (skip keeps `reconciling`, untested) |
| `DashboardV2Shell.tsx` reconcile (in place, e2e) | 2 | 1 (X1) | X2 (equivalent) |
| `useAnalyticsIdentity.ts` (in place) | 11 | 7 | **I9**, **I6** (untested guards); I4, I10 (equivalent / unreachable) |

---

## 6. Governance

**Selection.**
- **189** `burn-down` #388 (11), MR-075's first pick, `security-reviewer`. ✓ Recharge 1/3.
- **190** `burn-down` #387 (11), MR-075's second pick, `frontend-engineer`. ✓ 2/3.
- **191** `burn-down` #355 (10), MR-075's third pick, `security-reviewer`. ✓ **3/3, re-armed at 191's close.**

**Agents.** `security-reviewer` → `frontend-engineer` → `security-reviewer`. All three have Bash
(`security-reviewer.md`, `frontend-engineer.md`); the MR-075 practice held. No run of two.

**Directory saturation:** `lib/` + `api/` (189), `dashboard-v2/` (190), `hooks/` + `components/` + login/signup (191).
Clean. **Area:** privacy, dashboard, privacy; rolling five (188-192) would hold privacy three times if 192 is privacy,
which costs a −2 saturation penalty in the score (§11).

**MR-075 annotations:** design note line 8 pasted as given and extended by 190; line 72 sentence deleted; #387
append, #355 append, #59 re-status all present. Paste-ready text works.

**Primary-file and validation lines:** present in all three entries with exit codes, "no Errors line", e2e counts,
port check and stash state. Tenth consecutive window.

**Density / follow-ups:** 191 filed one (#391); 189 and 190 none. No trigger.

**Ratio, loops 182-191** (same method as MR-069…075: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #378 (182), #384 (183), #376 (184), #380 (185), #385 (186), #386 (187), #113 (188), #388 (189), #387 (190), #355 (191) |
| Created | 8 | MR-073 #384-#385, MR-074 #386-#387, MR-075 #388-#390, loop 191 #391 |
| Ratio | **1.25** | above the ≥ 0.5 floor |

This review files three rows (126 open after them).

**D-1.** Last extension touch `871e29a`: **148 loops** at 191. Loops point at the CEO queue instead of repeating the
ack. Still unanswered.

**Staleness (next oldest open non-blocked rows after MR-075's set), checked at `4e109ae`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #38 | 7 | the fallback now lives in `lib/stripe.ts:155` (`NEXTAUTH_URL ?? 'https://ledgerium.ai'`); both deploy files set `NEXTAUTH_URL` with the same default | **keep; path in the row is stale** (annotation) |
| #39 | 6 | `UpgradeButton.tsx:94` `setTimeout` redirect, no cleanup | **keep** |
| #43 | 9 | `computeInsightChips(workflows, processInsights)` still has no stale chip | **keep** |
| #44 | 6 | `DashboardV2Shell.tsx:372` still sends `sort=health_score&dir=asc`; the route reads `sort` but maps no `health_score` | **keep** |
| #60 | 7 | `needsAttention` still `health < 60 OR isHighVariation` (`WorkflowList.tsx:260`); the delta needs per-workflow prior data | **keep** |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **55 ahead** at `4e109ae` (56 once this review is committed); every suite green. Loops 152-191 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37136811293`), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail on `CRON_SECRET` and the URL variables; nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (148 loops) |
| — | Stored share tokens | decide delete/redact of existing `AnalyticsEvent` rows with `/share/<token>` in `url` or a `token` property, **and `signup_completed` rows whose `properties` hold `landing_path` `/share/<token>` (N1)**; whether to rotate live share links; the proxy's access logs hold the paths too |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | is it meant to be on (the container runs; the build variables are unset)? If yes, N2 first; consent/disclosure for it is a decision (N3) |
| #278 / #389 / N3 / #391 | PostHog before a key | identity and server path done; free text, consent and disclosure remain |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

---

## 7. Two patterns worth naming

**Name every producer of a value, not only every sink.** MR-075's practice made loop 189 cover four sinks of the share
token. N1 is the same token entering through a different producer (the landing path captured for attribution) into a
sink the loop had just cleaned. A privacy row about a value lists where the value is read (`pathname`,
`location.href`, `document.referrer`, `searchParams`) and follows each to its sinks.

**A precondition list is complete only when it includes the user's control.** Four reviews listed PostHog
preconditions as data shapes (paths, tokens, identity, free text). The consent start and withdrawal path (N3) is a
precondition of the same weight and was never listed. Before enabling any processor: what it receives, when it starts,
how the user stops it, and where it is disclosed.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-075 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `4e109ae`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** share token in `signup_completed.landing_path` | 11 | follow-up | **true, live** | `landing.test.tsx`; `UTMCapture.tsx:79`; `utm-sanitize.ts` `sanitizeFirstTouchRecord` |
| 2 | #368 saved views capture filters | 11 | audit | true; **prerequisites done** (#387 at 190, base rule in the note) | `currentFilters={[]}` still passed |
| 3 | #85, #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only |
| 4 | #390 pricing scroll region | 10 | follow-up | true | unchanged since MR-075 |
| 5 | **N3** consent start, withdrawal, disclosure | 10 | follow-up | true (dormant for PostHog; Umami-dependent) | `PostHogProvider.tsx:29-34`; `AnalyticsConsent.tsx:33-37`; privacy page |
| 6 | #377, #381 | 10 | follow-up | true | unchanged |
| 7 | #389 free text | 9 | follow-up | true (dormant) | unchanged |
| 8 | #391 late identify | 9 | follow-up | true; solved by N3's start-on-accept | loop 191 |
| 9 | **N2** Umami unfiltered URL | 8 | follow-up | true (dormant) | `UmamiAnalytics.tsx` |
| 10 | #382 revision / 409 | 8 | follow-up | true; after #381 | unchanged |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The share token still reaches the app's analytics table through first-touch attribution: `signup_completed` stores `landing_path` = `/share/<token>`.** MR-076 §2. `UTMCapture` (mounted on every page from `PostHogProvider`, before any consent) stores `landing_path: pathname` in `localStorage['ledgerium_first_touch_utm']` on a visitor's first page; `getFirstTouchUTM` passes every non-`utm_*` string through (`sanitizeFirstTouchRecord` cleans only `utm_*`); `SignupPageClient` sends `track({ event: 'signup_completed', ...utmData })`; the ingest route stores the property bag. Measured with the repo's `UTMCapture`, `getFirstTouchUTM` and the real ingest route (mocked db): `AnalyticsEvent.properties` = `{"landing_path":"/share/shrTOKEN…"}`. This is the shared-SOP to signup funnel, so every attributed signup from a share link stores a live bearer token; live today without any key. The PostHog copy is already templated (`landing_path` matches the path-key rule). Loop 189 (#388) cleaned `url` and the share events but not this producer. Fix as one outcome: store `templatePath(pathname)` in `UTMCapture`; template `landing_path` in `getFirstTouchUTM` on read (records already stored in browsers); in the ingest route, template any `path`- or `url`-named string property before storing (reuse the posthog-privacy key rules), as defence in depth. Tests: UTMCapture on `/share/<t>` stores `/share/[token]`; a legacy stored record is templated on read; the ingest route stores no token for `signup_completed` with a raw `landing_path`; a guard that fails if any first-touch field other than `utm_*`, `referrer_domain` and `captured_at` is a raw path. Existing rows are part of the CEO's stored-token decision. Use a Bash-capable agent. Follow-up of loop 189 (#388). | fix | analytics / privacy | `security-reviewer` | 3 | 4 | 1 | 5 | 1 | 1 | **11** |
| **N2** | **The Umami tracker, if its build variables are set, would send full page URLs (share tokens in the path, reset and invite tokens in the query) to Umami with no filter and before consent.** MR-076 §2. `UmamiAnalytics.tsx` injects `NEXT_PUBLIC_UMAMI_SCRIPT_URL` with only `data-website-id`: no `data-exclude-search`, no `data-exclude-hash`, no consent check, on every page from `app/layout.tsx`. Umami's tracker records the page URL and referrer on every pageview, so `/share/<token>`, `/reset-password?token=…` and `/teams/join?token=…` would be stored in the Umami database, which no retention job covers. The self-hosted container runs (`compose.hostinger.yaml`) but `gh variable list` shows no `NEXT_PUBLIC_UMAMI_*` repo variables, so no script loads in the deployed build today (not verified on the live site). Fix before the variables are set: `data-exclude-search="true"` and `data-exclude-hash="true"`, and either `data-auto-track="false"` with a manual pageview whose url is `templatePath(location.pathname)`, or Umami's before-send hook doing the same; decide consent for Umami with N3. Tests: a unit test on the injected script's attributes; an e2e that loads `/share/<t>` and `/reset-password?token=x` with a stub script URL and asserts no request carries either value. Behaviour of the tracker is taken from Umami's documentation; measure it with the pinned image when fixing. Follow-up of loop 189 (#388). | fix | analytics / privacy | `security-reviewer` | 2 | 4 | 1 | 3 | 1 | 1 | **8** |
| **N3** | **Analytics consent cannot be withdrawn, Accept does not start PostHog until a reload, and the privacy page discloses no analytics processor.** MR-076 §4. `AnalyticsConsent.accept` writes `localStorage['ledgerium_analytics_consent']` and hides the banner; `PostHogProvider` reads consent once on mount (`:29-34`), so a user who accepts is not tracked until the next full load (this is also why #391 exists). Once chosen, the banner never returns and no control exists to change the choice; nothing calls `posthog.opt_out_capturing()` or `reset()` on a downgrade. `privacy/page.tsx` names neither PostHog nor Umami nor the consent choice. Withdrawing consent must be as easy as giving it, so this is a precondition for setting a PostHog key, with #389. Fix as one outcome: a small consent store with a change event; Accept initialises PostHog immediately and lets `useAnalyticsIdentity` identify (closing #391); an "Analytics preferences" control (footer link reopening the banner, and the account page) that switches to essential, calling `opt_out_capturing()` and `reset()`; a privacy-page paragraph naming the processors, what is sent and how to change the choice. Tests: unit for the store and the opt-out; an e2e that accepts, sees PostHog initialised without a reload (stubbed key), withdraws, and sees capturing stop. User-visible copy, so `growth-strategist` adjacent (D-4 clause 1). Follow-up of loop 191 (#355). | fix | analytics / privacy | `frontend-engineer` | 3 | 4 | 2 | 4 | 2 | 1 | **10** |

**Annotations recommended:**
- **#388 closure note:** "[MR-076: holds for the paths it named. Seven guard mutants (share route token, track url, server log, posthog-node sanitizer, ingest url, ingest legacy token on both events) are each killed on a clean baseline (50/50, exit 0); the two page-side call sites are guarded by the event types. Missed producer: first-touch attribution stores landing_path /share/<token> in signup_completed properties (N1). Invite and reset tokens ride the query string, which no app event reads. Umami would send full URLs if enabled (N2).]"
- **#387 closure note:** "[MR-076: holds. The counter is read before the GET and pinned by unit tests and e2e C3-view (reading it when the GET answers fails C3-view). Overlapping reconciles adopt only the answer that started after the last edit; a lens-local toggle neither counts nor blocks, and an adoption under a lens updates only the library pack. Sync mutants: 13 of 15 killed; dropping dirty from busy is equivalent; a skip that leaves reconciling set is untested (benign: a later definite failure would reconcile instead of rolling back).]"
- **#355 closure note:** "[MR-076: holds with real posthog-js: identify by user id with an empty $set, merge from the anonymous id at sign-in, no re-identify on reload, reset then identify from a fresh anonymous id on a user switch, one reset on expiry, no email in any request body, the stored key holds the bare id. Seven of eleven mutants killed. Untested guards: the loading early return (without it every signed-in reload would reset and re-identify) and storing the id only when PostHog identified (without it a later consent never identifies). Consent itself is N3.]"
- **#391 append:** "(MR-076) Part of a wider gap: Accept does not start PostHog until a reload, so N3's start-on-accept closes this row too; pick N3 and strike this with it if it lands. Add the two missing hook tests in the same loop: a load with status loading and a stored identity must not reset; an identify while PostHog is dormant must leave the stored key empty."
- **#389 append:** "(MR-076) Still open at `4e109ae`. With #355 and #388 done, PostHog's remaining preconditions are this row and N3 (consent start, withdrawal, disclosure), then the key (#278)."
- **#38 append:** "(MR-076) The fallback moved to `lib/stripe.ts:155`; both deploy files set `NEXTAUTH_URL` with the same default, so it matters only for a deploy without that variable."
- **#368 append:** "(MR-076) Prerequisites met: #387 closed at loop 190 and the design note carries the base rule (status line for loop 187, item 2). Ready to pick."

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 `landing_path` `/share/<token>` stored via `signup_completed` | N1 |
| §2 Umami tracker sends full URLs, no consent, no filter (dormant) | N2 |
| §2 seven guard mutants, other tokens and sinks, Referrer-Policy, proxy logs | #388 note; CEO queue (stored tokens, access logs) |
| §3 orders, lens toggles, overlapping reconciles, mutants R6/R11/X1/X2 | #387 note |
| §4 real posthog-js identity, sign-out, second tab | #355 note |
| §4 untested `loading` guard and dormant-store guard | #391 append |
| §4 Accept starts nothing, no withdrawal, no disclosure | N3; #391 and #389 appends |
| §6 staleness: #38 path moved; #39, #43, #44, #60 keep | #38 append |
| §6 #368 prerequisites met | #368 append |
| §7 producers of a value; the user's control as a precondition | practice |

---

## 11. Loop 192-194 picks

**Before 192: push** (CEO item 1), set `CRON_SECRET` and the job URLs (item 4), answer D-1 (item 21), decide stored
tokens (now including N1's rows).

Pool 123 + 3 = 126 > 8. The cool-off is **armed (3/3)**: spend it once, on #368 at 194, the highest-value non-follow-up
row whose prerequisites were just met. 192 and 193 are `burn-down`.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **192** | **N1** first-touch `landing_path` templating | **11** (9 after the −2 saturation penalty: privacy is 3 of 188-192) | `burn-down` (follow-up of 189) | `security-reviewer` | analytics / privacy | the only live token leak; every share-link signup adds one; small; log the penalty and the reason (live leak over the 10s) |
| **193** | **#390** pricing scroll region | **10** | `burn-down` (follow-up of 188) | `frontend-engineer` | pricing-page / a11y | live serious axe violation on a public page; one file; rotates off security |
| **194** | **#368** saved views capture filters | **11** | `top-score` with `ceiling-cool-off: invoked; rationale: prerequisites (#387, base rule) met at 190; highest-value audit row; armed since 191` | `frontend-engineer` (`growth-strategist` adjacent for copy) | web-app / dashboard | user-visible feature value; the base rule it needs is now written |

- **Then MR-077** (base cadence after 194), then **N3** (`frontend-engineer`, `growth-strategist` adjacent; closes
  #391), **#389** (`security-reviewer`), #381, #377 with theme tokens, N2 if the CEO wants Umami on, #382.
- **Agents:** `security-reviewer` → `frontend-engineer` → `frontend-engineer` (two in a row, allowed).
- **Area / directory:** privacy (`components/`, `lib/`, `api/analytics/`), pricing (`pricing/`), dashboard
  (`dashboard-v2/`): no three in a row.
- **Alternative for 192:** #390 first if the CEO prefers no saturation penalty; then N1 at 193.
- **Do not pick:** #391 alone (N3 closes it); #382 before #381; #377 as written (theme tokens per MR-074); #145, #142,
  #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the D-1 answer; N2 while the CEO has not said
  Umami is wanted; any implementation row with a tool-less primary agent.
- **Practice:** a privacy row names every producer of the value and follows each to its sinks (§7); a processor's
  precondition list includes start, withdrawal and disclosure (§7); annotations are final text.

---

## 12. Verdict

Every count reproduces at `4e109ae`: root 6429, web-app 4641 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, e2e 46.

- **Loop 189 holds** for the sinks it named: all seven guard mutants are killed. The token still enters the analytics
  table through first-touch attribution (N1, 11, live); Umami would leak full URLs if switched on (N2, 8).
- **Loop 190 holds.** The counter is pinned by unit and e2e; overlapping reconciles and lens toggles behave; the two
  surviving sync mutants are equivalent or benign.
- **Loop 191 holds** with real posthog-js: identity by id, reset on switch and expiry, no email anywhere. Two guards
  are untested (#391 append); consent start, withdrawal and disclosure are the missing PostHog precondition (N3, 10).

Selection followed MR-075 exactly, the cool-off is re-armed, ratio 1.25. Asks for the CEO: push; configure
`CRON_SECRET` and the job URLs; answer D-1; decide stored tokens (including N1's rows); say whether Umami is meant to be
on; decide the `analytics` agent's tools. For the coordinator: N1, #390, then #368 on the cool-off.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6429 / 4641 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/saved-views-persistence.spec.ts e2e/app/dashboard/v2-a11y.spec.ts \
   e2e/app/dashboard/analytics-identity-reset.spec.ts)                             # 46 passed
pnpm exec vitest run --root $S/ph076 --config $S/ph076/vitest.config.mts landing   # VERDICT TOKEN STORED
pnpm exec vitest run --root $S/ph076 --config $S/ph076/vitest.config.mts ident     # ids by user id; no email in bodies
node $S/mut076p/run.mjs        # loop 189 guards in place, restored: 7/7 killed
node $S/mut076s/run.mjs $S/mut076s                                                 # 15 mutants; R6, R11 survive
node $S/mut076e/run.mjs        # shell in place, restored: X1 killed (C3-view), X2 survives (equivalent)
node $S/mut076i/run.mjs        # identity hook in place, restored: I4, I6, I9, I10 survive
gh run list --limit 6                                                              # CRON_SECRET failures
gh variable list                                                                   # no NEXT_PUBLIC_UMAMI_* variables
git log origin/main..main --oneline | wc -l                                        # 55
```
