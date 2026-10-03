# MR-078 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 195-197, 2026-10-03 15:03 → 16:19 (−0600). Commits `1253101` (loop 195, #395), `fc0fddf`
(loop 196, #394 + #391), `111fcb2` (loop 197, #398). Previous review MR-077 at `743eadd`. Rows closed: #395, #394,
#391, #398. Rows filed by loops: #398 (196), #399 (196, blocked decision). Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-077 (`ITERATION_LOG.md`, loop 197 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared
exception to "no repo file touched", as at MR-075/076/077: mutants that only the repo's own tests can judge were applied
**in place** one at a time, each restored in a `finally` block and hash-compared after every mutant: `posthog.ts`,
`PostHogProvider.tsx`, `useAnalyticsIdentity.ts`, `analytics-consent.ts` (6 mutants, vitest), the same files plus
`PublicNav.tsx` (4 mutants, e2e), `DashboardV2Shell.tsx` and `lib/analytics.ts` (3 mutants, e2e). One diagnostic was
also applied in place: a `console.error('[MR078-DIAG]', …)` line after the "batch rejected" log in
`api/analytics/events/route.ts` (request headers only, never the body), for three runs, restored each time
(`git hash-object` `b936581…` before and after). The e2e mutants ran against a dev server I started on 3098 with the
exact `webServer` environment of `playwright.config.ts` (stub PostHog key and host), so each mutant was picked up by
recompilation (4 s settle); no other run shared that server. Scratch went only to `…/scratchpad/`:
- `devserver.sh` (the `webServer` env), logs `devserver.log`, `devserver2.log`, `devserver3.log`;
- `probe078.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `ph078.ts` (route stub for
  `posthog.e2e.test` that decodes `/e/` bodies, gzip or base64) and the specs `probe078.spec.ts` (P1 accept / decline /
  re-accept / reload, P2 cross-tab, P3 sign-in identify, P4 footer keyboard, P5 drawer over banner, P6 /product width,
  P7 focus obscured), `probe078b.spec.ts` (P2b cross-tab, P1b device id, P6b overflow culprit), `probe078auth.spec.ts`
  (A1 account card, both themes), `probe078auth2.spec.ts` (B1-B3 empty and aborted analytics bodies),
  `probe078d.spec.ts` (D1 29 public routes at 320 px), `probe078e.spec.ts` (E1 culprits); outputs `probe078*.raw.txt`;
- `mut078/run.mjs` (outputs `mut078u.txt`, `mut078u2.txt`, `mut078c.txt`, `mut078b.txt`);
- `root078.txt`, `web078.txt`, `tc078.txt`, `val078.txt`, `guard078.txt`, `e2e078a.txt`, `e2e078b.txt`,
  `e2e078api.txt`, `e2e078pub.txt`, `e2e078auth.txt`, `diag1.txt`-`diag3.txt`, `status_before078.txt`.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 afterwards. Playwright was run one project or spec group at a time; free memory never fell below ~1 GB and the
dev server was restarted twice to release it.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 197 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6466 | **316 files, 6466 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4696 | **269 files, 4696 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 392 rows, 268 struck, **open 124** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| e2e `public` (whole project) | 65 | **65 passed (2.6 min)** | matches |
| e2e `api` (whole project) | 14 | **14 passed (20 s)** | matches |
| e2e `authenticated` (whole project) | 149 + 2 skipped | **149 passed, 2 skipped (9.0 min)** | matches |
| e2e `public` a11y + consent + nav (195/196) | 13 / 65 | **30 passed** (the four new width tests and the five consent tests among them) | consistent |
| deltas | web 4678→4678→4696→4696; root 6458→6458→6466→6466 | 195 +0 (one assertion), 196 +18 web / +8 root, 197 +0 | consistent |

Pool arithmetic: MR-077 recorded 126. Loops 195-197 struck four (#395, #394, #391, #398) and filed two (#398, #399):
**124**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (its inputs, `apps/extension-app`
and its six workspace packages, are unchanged since `a14c5e8`, whose deploy run `37088974348` passed; inferred green,
not run), Firefox/WebKit, a production build, a real PostHog or Umami project, a real screen reader, the live site
(no `curl`). The agents' revert proofs are taken from the log; the mutants below are mine.

---

## 1. Lead

1. **All three loops hold on their primary claims, and the deploy gate is green at `111fcb2`.** Every count
   reproduces, including the whole `test:e2e` project by project (65 + 14 + 149) and the rest of the quality gate. 6 of
   6 consent unit mutants and 3 of 3 bounce mutants are killed; 3 of 4 consent e2e mutants are killed.
2. **Declining PostHog does not give a fresh identity (§3, N1).** With the app's own posthog-js: after decline,
   reload and accept, events carry the **same `$device_id`** (`reset()` keeps it); and `track()` forwards the
   first-party `visitorId` on every named event, which no decline touches. Privacy section 9, added at loop 196, says
   Decline "clears its identity from this browser". Every other section 9 claim I could test is true.
3. **Consent itself works with real posthog-js (§3).** Accept starts capture without a reload; Decline stops it, the
   opt-out flag is stored and PostHog does not load after a reload; accepting again resumes (`opt_in_capturing` after
   `reset()` works, in the same document and after a reload); a withdrawal in one tab stops another; consent 'full'
   at load then sign-in sends exactly one `$identify`, by id, with no `$set`. The re-accept path has no browser test
   (mutant C3 survives the e2e; it is killed by a unit test).
4. **Two more public pages scroll sideways at 320 px (§2, N2).** A sweep of 29 public routes: 25 fit; `/install` is
   335 px wide (an unbreakable `chrome://extensions` in a flex item without `min-w-0`) and `/product` 328 px (383 at
   375; a decorative `-m-6` glow, not the demo widget). Both are already in production.
5. **The reopened consent banner does not take focus, and Escape drops focus to `<body>` (§3, N3).**
6. **The `[analytics:persist] batch rejected SyntaxError` log is a teardown artifact, not a product bug (§4).**
   Reproduced: a browser killed while a 61 KB beacon uploads reaches the route with `content-length: 61505` and no
   body; `readBodyWithLimit` returns `''` and `JSON.parse('')` throws. It appeared once in the full authenticated run,
   right after `bounce.spec.ts`. No data the browser had finished sending is lost.
7. **Selection was sound:** 195 and 196 followed MR-077; 197 departed for #398 (15, a red deploy gate), which was
   right. The cool-off re-armed 3/3. Ratio, loops 188-197: **0.92** (11 closed / 12 created).

---

## 2. Loop 195 — #395 the pricing page fits the phone (`1253101`): **HOLDS; two other pages do not fit (N2)**

**Diff vs log:** matches (`relative` on the region; one class assertion; four e2e tests at 320/375 px in both themes
asserting `scrollWidth <= innerWidth` and `window.scrollX === 0` after ArrowRight to the region's end).

**Measured.** The four tests pass in my `public` runs (30 and 65). MR-077 measured 666 px without `relative` and 375
with it in the same layout, so the agent's revert proof (all four fail without it) matches an independent
measurement; I did not re-run that revert.

**/product (MR-077's observation, triaged).** `scrollWidth` 383 at 375 px and 328 at 320 px, both themes; a horizontal
wheel pans the window 8 px (`probe078.raw.txt` P6). The cause is not the demo widget (its overflowing badges are
clipped by `overflow` ancestors) but the four decorative glows behind the step screenshots,
`absolute inset-0 -m-6 rounded-3xl … blur-2xl` (`app/(public)/product/page.tsx:388`): the negative margin puts their
right edge 24 px past the column (`probe078b.raw.txt` P6b, `probe078e.raw.txt`). Nothing is hidden, but the page pans
on touch and at 400 % zoom. Real, small: **N2**.

**Sweep** (`probe078d.raw.txt`, 29 public routes at 320 px, consent preset to avoid the banner): 25 at 320;
`/demo` redirects to `/product` (328); `/install` and `/install-extension` (redirect) 335. The `/install` culprit is
step 2's card (`install/page.tsx:136`): the `flex-1 pb-8` column is a flex item whose minimum width is its min-content
width, and the `chrome://extensions` code span cannot wrap, so the card's right edge sits at 335. That is the extension
install page, which the Chrome Web Store listing will send people to. **N2.**

**Limits accuracy.** Accurate; "/product … left for MR-078" is answered above.

---

## 3. Loop 196 — #394 + #391 consent you can give and take back (`fc0fddf`): **HOLDS; identity survives a decline (N1); focus (N3)**

**Diff vs log:** matches (store with same-tab event, `storage` listener and prompt event; provider applies the choice
from the store listener and sends one `$pageview` on grant; `optOutPostHog` = `reset()` then `opt_out_capturing()`;
`optInPostHog` = `opt_in_capturing({ captureEventName: false })` if opted out; identity hook re-runs on consent;
footer button, account card, privacy section 9, `PublicNav` `z-[60]` while the drawer is open, stub key and host in
`playwright.config.ts`). `analytics-consent.ts` is 71 lines, under D-4 clause 2; clause 1 fired and
`growth-strategist` ran.

**Measured with the app's posthog-js and the e2e stub key** (every request to `posthog.e2e.test` intercepted and
decoded; Chrome UA and `webdriver` masked as in the repo spec):

| Check | Observed | Verdict |
|---|---|---|
| Before a choice | no request to the PostHog host | ✓ |
| Accept | one `/e/` with `$pageview` in the same document; `/flags` never requested | ✓ |
| Decline (footer) | `__ph_opt_in_out_phc_e2e_stub_key = "0"` stored; new `distinct_id`; client navigation + 5 s: **0** new events | ✓ |
| Accept again, same document | capture resumes (`$pageview`); opt-out flag `"1"` | ✓ (`opt_in_capturing` works after `reset()`) |
| Decline, reload | **0** requests in 5 s (PostHog not initialised on 'essential'); flag `"0"` kept | ✓ |
| Accept after that reload | capture resumes | ✓ |
| **Device id across decline + accept** | `$device_id` `01a103e3-c42e…` **before and after**; `distinct_id` and `$session_id` change; after a decline `ph_phc_…_posthog` still holds the device id | **identity kept (N1)** |
| **Properties on named events** | `visitorId` and `userPlan` on `login_completed`, `dashboard_v2_viewed`, `cta_clicked` (`track()` forwards its enriched bag); `title` on every `$pageview` (#389) | **`visitorId` links PostHog to the first-party table and survives a decline (N1)** |
| Cross-tab withdraw | decline in tab A; tab B navigates: **0** events; B's flag `"0"` | ✓ |
| Cross-tab grant | tab B's banner closes; B sends nothing until its next navigation (then `cta_clicked`, `$pageview`, …) | works; B's current page view is not sent (minor, no row) |
| 'full' at load, then sign in | one `$identify` with distinct id `e2e-test-user-001`, no `$set`/`$set_once`; one more after decline + accept on the account card | ✓ (#391 closed correctly) |
| Footer button, keyboard | Enter opens the banner, **focus stays on the button**; next Tab reaches "What is sent", then Keep current choice, Decline PostHog, Accept; **Escape: focus goes to `<body>`** | **focus lost (N3)** |
| Account card (dark + light) | axe on the card: 0 violations; Tab Decline → Accept; Space and Enter switch; `aria-pressed` follows; 2 px outline on focus | ✓ |
| Drawer over banner (375 px, `/product`) | drawer 56→374 px, banner card from 491 px: they do not overlap with accordions closed, both usable; with the drawer open Tab runs from the drawer items into the page behind it (the drawer does not trap focus; pre-existing, not the banner) | ✓ for the fix |
| Focus obscured by the banner (`/pricing`, 375 px, 43 Tab stops) | none fully or partly under the banner card | ✓ (WCAG 2.4.11) |
| Other fixed elements | the only other bottom-fixed element is `ExtensionStatusToast` (dashboard, z-50, transient); no sticky CTA on /pricing | no overlap found |

**Section 9 claims vs code.** True: "Loaded only if you choose Accept"; "remove query strings and campaign tags"
(`$current_url` arrives without a query; `before_send`); "record ids and share tokens … placeholders" (#385);
"internal account id only, not your email or name" (`$identify` carries no `$set`); "Session recording, autocapture and
heatmaps are off" (config; no `$autocapture`, `$snapshot` or heatmap traffic seen); first-party "query strings removed …
placeholders" (`templatePath(pathname)`); Umami's description. Incomplete: "page views and named product events" (also
`$pageleave` and `$identify`, and page titles, #389). **Not true:** "Choosing Decline PostHog … clears its identity from
this browser" (device id kept; `visitorId` re-attached after a later accept). **N1.**

**Mutations** (`mut078u*.txt`, `mut078c.txt`): unit baseline 5 files, 28 tests, exit 0; e2e baseline
`analytics-consent.spec.ts` 5 passed.

| Mutant | vitest | e2e consent spec |
|---|---|---|
| C1 opt-out order swapped (`opt_out` then `reset`) | killed | killed |
| C2 provider applies once on mount (no subscription) | killed (3 tests) | killed |
| **C3 `optInPostHog` a no-op** | killed | **survives** (no re-accept step) |
| I1 identity effect not re-run on consent | killed (2) | — |
| I2 withdrawal does not clear the stored identity | killed | — |
| S1 store ignores other tabs (no `storage` listener) | killed (2) | — |
| N1 drawer header not lifted (`z-40` always) | — | killed |

**Limits accuracy.** Accurate on what was built. Not stated: the device id and `visitorId` (N1), focus (N3), the
cross-tab page view.

---

## 4. Loop 197 — #398 the deploy gate is green again (`111fcb2`): **HOLDS**

**Diff vs log:** matches (init script wraps `navigator.sendBeacon` and `fetch`, records `/api/analytics/events`
bodies and calls through; assertions unchanged).

**Mutations** (`mut078b.txt`; baseline 4 passed incl. auth setup):

| Mutant | Result | Should it fail? |
|---|---|---|
| B1 bounce tracked without `{ terminal: true }` | **killed** | Yes. The event then waits in the buffer for the debounced flush; after a real `pagehide` no flush or drain comes, so a passing test would hide the loop 164 bug |
| B2 no `pagehide` listener | **killed** | yes |
| B3 the terminal path schedules a flush instead of delivering | **killed** | yes |

The spec dispatches a synthetic `pagehide` on a live page, so it proves the event is handed to the beacon at
`pagehide`, not that a real navigation's beacon arrives; that is the right boundary for an e2e.

**The `batch rejected SyntaxError` log** (`probe078c.raw.txt`, `diag*.txt`, `e2e078auth.txt`). Running the eleven
dashboard specs one at a time with a header-only diagnostic: no rejection. In the full authenticated project: one,
printed right after `bounce.spec.ts`. Reproduced directly: (B2) a browser closed right after a 61 KB beacon starts
reaches the route with `content-length: 61505`, `sec-fetch-mode: cors` and `req.body === null`, three times out of
three; `readBodyWithLimit` returns `{ ok: true, text: '' }` for a null body and `JSON.parse('')` throws "Unexpected end
of JSON input". (B1) an empty POST gives the same log. (B3) closing a context normally with one buffered event gives
no rejection. So the log is a test teardown closing the browser while a beacon is uploading; the route answers 200
`ok: false` as designed. Not a product bug and no row: the only product-side point is that an aborted upload is
reported as a parse error with a stack instead of "unreadable" (log hygiene; annotation on #398).

**Gate scope.** The log's "full deploy-gate suite" covered `e2e-web-app`; `deploy.yml` also needs `quality-gate`
(all reproduced here) and `e2e-extension` (inputs unchanged since the last green deploy; not run).

**Limits accuracy.** Accurate.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| consent store, provider, PostHog helpers, identity hook (in place, vitest) | 6 | 6 | — |
| same plus `PublicNav` (in place, e2e `analytics-consent.spec.ts`) | 4 | 3 | **C3** (re-accept untested in a browser; N1 adds it) |
| bounce emitter and terminal delivery (in place, e2e `bounce.spec.ts`) | 3 | 3 | — |

---

## 6. Governance

**Selection.**
- **195** `burn-down` #395 (11), MR-077's first pick, `frontend-engineer`. ✓
- **196** `burn-down` #394 (10), MR-077's second pick; struck #391 in the same loop as MR-077 asked. ✓
- **197** `burn-down` #398 (15), not MR-077's #397 (10). **Right call:** #398 was a follow-up (filed at 196), the
  highest open score, and a red deploy-gate test that would have blocked the next push; the departure and its reason
  are logged. **Cool-off re-armed 3/3** (195, 196, 197 all `burn-down`).

**Agents.** `frontend-engineer` (194, 195, 196) then `qa-engineer` (197): the rotation came one loop earlier than
MR-077 planned, cleanly. `growth-strategist` adjacent at 196 (D-4 clause 1: many strings) and its edits applied
("Essential Only" → "Decline PostHog", the unsupported "No workflow content is tracked" removed). All primaries have
Bash.

**Directory saturation:** `pricing/` (195); `lib/`, `components/`, `hooks/`, privacy page (196); `e2e/app/dashboard/`
(197). Clean. **Area** rolling five (193-197): pricing, dashboard, pricing, privacy, ci. No penalty for 198.

**MR-077 annotations:** #392/#390/#368 closure notes, #394/#223/#81/#84 appends, the design-note sentence; rows
#395-#397 present (validator counts them). Paste-ready text works.

**Primary-file and validation lines:** present in all three entries (exit codes, "no Errors line", e2e counts, port
check). 195 does not restate the root count (unchanged); 197's "unit suites unchanged" does not say whether they were
re-run. Twelfth consecutive window otherwise.

**Density / follow-ups:** 196 filed two (#398, #399), under the clause-3 threshold; its `density-response` line was
optional and present. No trigger.

**The process gap (a red gate test for 33 loops).** Root cause: `main` has not been pushed since loop 151, so CI, the
only place the whole gate runs, has not run for 46 loops; every loop and review ran selected specs. Two durable
changes, smallest first:
1. **Every meta-review runs the deploy gate as CI does** (quality gate plus `test:e2e` one project at a time) and
   records the three counts and the commit, as this review does. That bounds an undetected red gate to three loops
   without adding per-loop cost.
2. **A loop that touches shared delivery or test plumbing runs the whole affected project:** `lib/analytics.ts`,
   `lib/analytics-delivery.ts`, `playwright.config.ts`, `e2e/helpers/`, `e2e/global-setup.ts`, or a component mounted
   on every page (`PostHogProvider`, `AnalyticsConsent`, `PublicNav`, `Footer`, `AppShell`). Loop 164 changed
   `lib/analytics.ts`; this rule would have run `authenticated` and caught it.
Literal text for `.claude/agents/coordinator.md`, Step 7 — Validation, to insert after the bullet
"- ensure determinism is preserved":
"- run the whole Playwright project (`public`, `api` or `authenticated`, one at a time) whenever the loop changes `lib/analytics.ts`, `lib/analytics-delivery.ts`, `playwright.config.ts`, `e2e/helpers/`, `e2e/global-setup.ts` or a component mounted on every page; every meta-review runs the full deploy gate (quality gate, then `test:e2e` one project at a time), restores `public/docs/screenshots` and records the three counts and the commit"
A guard-runner check cannot know whether e2e passed, so none is proposed; the strongest guard is pushing (CEO item 1).

**Ratio, loops 188-197** (same method as MR-069…077: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 11 | #113 (188), #388 (189), #387 (190), #355 (191), #392 (192), #390 (193), #368 (194), #395 (195), #394 + #391 (196), #398 (197) |
| Created | 12 | MR-075 #388-#390, loop 191 #391, MR-076 #392-#394, MR-077 #395-#397, loop 196 #398-#399 |
| Ratio | **0.92** | above the ≥ 0.5 floor |

This review files three rows (127 open after them).

**D-1.** Last extension touch `871e29a`: **154 loops** at 197. Still unanswered.

**Staleness (next oldest open non-blocked rows after MR-077's set), checked at `111fcb2`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #85 | 11 | `/api/workflows` still returns the bare `{ workflows, stats, … }` (`route.ts:797`); the shell reads `data.workflows` | **keep** (audit; cool-off only) |
| #88 | 8 | premise "no detail view exists" is false: rows `router.push('/workflows/<id>')` (`WorkflowRow.tsx:1272`) to `app/(app)/workflows/[id]/page.tsx` (report, process map, SOP, variants) | **strike as superseded** (or re-scope to per-step duration distributions if still wanted) |
| #89 | 8 | per-row trend needs `metric_fact` (absent from `schema.prisma`, Path C R+1 not opened); `MiniSparkline` exists but only in the portfolio band | **keep; mark blocked on Path C R+1** (as #91) |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **63 ahead** at `111fcb2` (64 once this review is committed). Quality gate and `e2e-web-app` reproduced green here; `e2e-extension` inputs unchanged since the last green deploy. **Nothing blocks a push now.** Loops 152-197 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37149798726`, latest), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail on `CRON_SECRET` and the URL variables; nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (154 loops) |
| #399 | Consent scope | does "Decline PostHog" also stop first-party events and the visitor id? (a) keep, (b) gate both, (c) gate the visitor id. N1 is independent: it stops `visitorId` reaching PostHog either way |
| — | Stored share tokens | delete/redact existing `AnalyticsEvent` rows with `/share/<token>`; rotate live links or not; proxy logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first, then decide whether #399 covers it |
| #278 | PostHog key | see the readiness list below |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**PostHog readiness (probed here, not claimed ready).** Working with the real posthog-js: the consent gate, accept
without reload, decline (stops, persists, survives reload), re-accept, cross-tab withdrawal, one `$identify` by id with
no person properties, no `/flags`, queries stripped, paths templated (#385), autocapture/recording/heatmaps off.
Remaining before a key: **N1** (device id and `visitorId`), **#389** (free text; this review saw page titles on every
`$pageview`, e.g. "Process Intelligence Pricing — Ledgerium AI", "Ledgerium AI — Workflow Workspace"), the
stored-token decision, #399, then the key (#278). Minor: a grant in one tab does not send the other tabs' current page
views.

---

## 7. Two patterns worth naming

**A privacy sentence is a test case.** Section 9 was written to "describe only what the code does", and every sentence
but one was true; the false one ("clears its identity") is exactly the sentence nobody exercised (decline, then
accept, then compare ids). For any user-facing privacy or security claim, write the browser check that would make it
false, and put the forwarded property list under test, not only the config.

**The gate is a command, not a list of specs.** Loops ran the specs they touched and the review ran the specs the
loops named, so a test broken by a shared module (`lib/analytics.ts`) stayed red for 33 loops. Run the gate the way CI
runs it at least once per review, and the whole project whenever shared plumbing changes (§6).

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-077 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `111fcb2`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** PostHog identity survives a decline; `visitorId` forwarded | 12 | follow-up | true (dormant until a key) | P1b, P3 (`probe078*.raw.txt`) |
| 2 | #85, #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068; #85 rechecked | cool-off only (3/3 armed) |
| 3 | #397 stale view chip; three untested apply rules | 10 | follow-up | true (unchanged since MR-077) | MR-077 D2; S2/S4/S7 |
| 4 | **N2** /install and /product overflow at 320 px | 10 | follow-up | true; in production | D1, E1 |
| 5 | #377, #381 | 10 | follow-up | true | unchanged |
| 6 | #389 free text; #396 view/preset filters lost on Back | 9 | follow-up | true | titles seen on `$pageview` |
| 7 | **N3** reopened banner focus | 9 | follow-up | true | P4 |
| 8 | #393 Umami, #382 revision/409, #223 light theme, #88, #89 | 8 | follow-up / audit | #88 superseded, #89 blocked (§6) | — |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Declining PostHog and accepting again resumes the same PostHog identity: `reset()` keeps `$device_id`, and every named event carries the first-party `visitorId`, so privacy section 9's 'clears its identity from this browser' is not true.** MR-078 §3. Measured with the app's posthog-js and the e2e stub key (all requests intercepted): accept on /pricing, decline via the footer, reload, accept: the first event's `$device_id` equals the device id after re-accepting, while `distinct_id` and `$session_id` change; after a decline `localStorage['ph_phc_<key>_posthog']` still holds that device id. Separately, `track()` forwards its enriched properties to PostHog, so `visitorId` (the persistent first-party id from `getOrCreateVisitorId`, which a decline does not touch; see #399) and `userPlan` are on every named event (seen on `login_completed`, `dashboard_v2_viewed`, `cta_clicked`). PostHog can therefore rejoin activity before and after a decline, and join its data to the first-party table, which section 9 does not disclose. Fix as one outcome: `optOutPostHog` calls `posthog.reset(true)` (new device id) before `opt_out_capturing()`; `track()` drops `visitorId` from the properties it forwards to PostHog (PostHog has its own distinct id; nothing reads `visitorId` there). Tests: unit (reset called with true, order kept; forwarded properties exclude visitorId); extend `e2e/public/analytics-consent.spec.ts` with decline then accept in the same page: capture resumes (this kills MR-078's surviving mutant 'optInPostHog is a no-op'), the new `$device_id` differs from the first, and no PostHog body contains `visitorId`. If the CEO wants the join kept, replace the drop with a disclosure sentence in section 9 (copy; growth-strategist). Follow-up of loop 196 (#394). | fix | analytics / privacy | `security-reviewer` | 3 | 4 | 2 | 5 | 1 | 1 | **12** |
| **N2** | **Two public pages still scroll sideways at 320 px (400 % zoom): /install (335 px) and /product (328 px; 383 at 375 px), and no test measures any public page but /pricing.** MR-078 §2. Sweep of 29 public routes at 320 px in Chromium: 25 fit; /demo redirects to /product; /install-extension redirects to /install. /install: in step 2 (`app/(public)/install/page.tsx`, the `flex-1 pb-8` column) the unbreakable `chrome://extensions` code span sets the column's minimum width (a flex item's min width is its min-content width, and the step columns lack `min-w-0`), so the card's right edge is at 335. /product: the decorative glow `absolute inset-0 -m-6 rounded-3xl ... blur-2xl` behind each of the four step screenshots (`app/(public)/product/page.tsx:388`) extends 24 px past its column; a horizontal wheel pans the window 8 px. Both are already in production. Fix: `min-w-0` on the three step columns and `break-all` on their code spans; `-m-3 sm:-m-6` (or clip the glow) on /product. Test: one e2e that visits a constant list of public routes at 320 px and asserts `document.documentElement.scrollWidth <= window.innerWidth` (loop 195's assertion, generalised); revert proof on both pages. Follow-up of loop 195 (#395) and MR-077's /product observation. | fix | public-site / a11y | `frontend-engineer` | 2 | 4 | 2 | 5 | 2 | 1 | **10** |
| **N3** | **The reopened analytics consent banner does not take focus, and closing it drops focus to the page body.** MR-078 §3. Measured on /pricing with a stored choice: Enter on the footer 'Analytics preferences' button opens the banner and focus stays on the button (the banner follows the footer in DOM order, so the next Tab reaches it); Escape closes it and `document.activeElement` is `body`, so a keyboard user starts again from the top of the page. Choosing Accept, Decline PostHog or Keep current choice unmounts the focused button, with the same effect. Fix: when the banner opens on request, move focus to its first control; on any close return focus to the element that requested it; leave the first-visit banner's focus behaviour unchanged. Tests: e2e keyboard path footer button, Enter, focus inside the banner, Escape, focus back on the footer button; the same after a choice. Follow-up of loop 196 (#394). | fix | privacy / a11y | `frontend-engineer` | 2 | 3 | 1 | 5 | 1 | 1 | **9** |

**Annotations recommended:**
- **#395 closure note:** "[MR-078: holds. The four width tests pass in both themes at 320 and 375 px; MR-077 measured 666 px without relative, matching the agent's revert proof. The /product observation is triaged: the four -m-6 glows behind its step screenshots, not the demo widget, make it 383 px at 375 and 328 at 320; a 29-route sweep at 320 px also finds /install at 335 (N2). Both pages are already in production.]"
- **#394 closure note:** "[MR-078: holds with real posthog-js and the stub key. Nothing is sent before a choice; Accept sends a page view without a reload; Decline stores the opt-out flag, stops capture and survives a reload (PostHog not loaded); accepting again resumes in the same page and after a reload; a withdrawal in one tab stops another; the account card has no axe violations in either theme and works by keyboard; no focused element on /pricing at 375 px is hidden by the banner; the drawer fix is needed (mutant killed). 6 of 6 unit and 3 of 4 e2e mutants killed; the survivor is the re-accept path, which has no browser test. Gaps: the device id survives a decline and visitorId is forwarded to PostHog, so section 9's 'clears its identity' is false (N1); the reopened banner neither takes nor returns focus (N3); a grant in one tab does not send the other tabs' current page views.]"
- **#391 closure note:** "[MR-078: holds. Consent full at load, then sign in: exactly one $identify, distinct id the user id, no $set or $set_once; after decline and accept on the account card exactly one more. Unit mutants (identity effect not re-run on consent; withdrawal not clearing the stored id) are killed.]"
- **#398 closure note:** "[MR-078: holds. Removing terminal delivery, removing the pagehide listener, or scheduling a flush on the terminal path each fails the spec, as it should. The whole deploy gate reproduces at 111fcb2: public 65, api 14, authenticated 149 plus 2 skipped, and the quality gate; e2e-extension was not run (its inputs are unchanged since the last green deploy). The 'batch rejected SyntaxError' log is a teardown artifact: a browser closed during a beacon upload reaches the route with content-length set and no body, readBodyWithLimit returns an empty text, and JSON.parse throws; reproduced three times of three, and seen once in the full authenticated run, right after bounce.spec. Log hygiene only: an aborted upload could be reported as unreadable instead of a parse error.]"
- **#399 append:** "(MR-078) Independently of this decision, track() forwards visitorId to PostHog on every named event, so the visitor id also links PostHog activity before and after a decline; N1 stops that whichever option is chosen."
- **#389 append:** "(MR-078) Seen with the stub key: every $pageview carries title (for example 'Process Intelligence Pricing — Ledgerium AI' and 'Ledgerium AI — Workflow Workspace'); workflow and SOP pages whose titles include user content would send it."
- **#85 append:** "(MR-078) Still open at 111fcb2: /api/workflows returns the bare shape (route.ts:797) and DashboardV2Shell reads data.workflows."
- **#88 closure note:** "[MR-078: superseded. The premise 'no detail view exists' is false: a row click calls router.push('/workflows/<id>') (WorkflowRow.tsx:1272), which renders app/(app)/workflows/[id]/page.tsx with the report, process map, SOP and variants. If per-step duration distributions are still wanted, file that as a new row.]"
- **#89 append:** "(MR-078) Blocked on Path C R+1: per-row trend needs metric_fact, which is not in schema.prisma; MiniSparkline exists only in the portfolio band. Mark blocked as #91."
- **`.claude/agents/coordinator.md`, Step 7 — Validation, insert after the bullet "- ensure determinism is preserved" the bullet:** "- run the whole Playwright project (`public`, `api` or `authenticated`, one at a time) whenever the loop changes `lib/analytics.ts`, `lib/analytics-delivery.ts`, `playwright.config.ts`, `e2e/helpers/`, `e2e/global-setup.ts` or a component mounted on every page; every meta-review runs the full deploy gate (quality gate, then `test:e2e` one project at a time), restores `public/docs/screenshots` and records the three counts and the commit"

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 width tests pass; revert consistent with MR-077's 666 px | #395 note |
| §2 /product glow overflow; /install code-span overflow; 29-route sweep | N2 |
| §3 consent works with real posthog-js (accept, decline, reload, re-accept, cross-tab, card, banner overlap) | #394 note |
| §3 device id kept, visitorId forwarded; section 9 claim false; C3 survivor | N1 |
| §3 one $identify by id after sign-in and after re-accept | #391 note |
| §3 reopened banner focus | N3 |
| §3 titles on every $pageview | #389 append |
| §3 visitorId and the consent-scope decision | #399 append |
| §4 bounce mutants killed; full gate green; SyntaxError is a teardown artifact | #398 note |
| §6 staleness #85 keep, #88 superseded, #89 blocked | #85 append, #88 note, #89 append |
| §6 red gate for 33 loops | coordinator.md Step 7 bullet; CEO item 1 |
| §7 privacy sentence as test; gate as a command | practice |

---

## 11. Loop 198-200 picks

**Before 198: push.** The gate is green locally; every further loop adds to an undeployed stack (63 commits). Also
`CRON_SECRET` and the job URLs (item 4), D-1 (item 21), #399, stored tokens.

Pool 124 + 3 = 127 > 8. The cool-off is **3/3**. **Do not spend it:** the highest open row (N1, 12) is a follow-up and
outranks every audit row (11), so `burn-down` already selects the best item; keep the charge for a release blocker or
for an audit row once the follow-up tier drops below 11.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **198** | **N1** PostHog identity survives a decline | **12** | `burn-down` (follow-up of 196) | `security-reviewer` | analytics / privacy | highest open; makes a published privacy sentence true; adds the missing re-accept browser test; PostHog precondition |
| **199** | **#397** view chip by id; S2/S4/S7 tests | **10** | `burn-down` (follow-up of 194) | `frontend-engineer` | web-app / dashboard | live stale chip; deferred from 197; must precede #396 |
| **200** | **N2** /install and /product fit at 320 px, public-route sweep | **10** | `burn-down` (follow-up of 195) | `frontend-engineer` | public-site / a11y | the install page the store listing will link to; one generalised width test prevents the next one |

- **Then MR-079** (base cadence after 200), then **#389** (`security-reviewer`; free text, the last PostHog code
  precondition), **N3**, **#396** with **#381** (separate loops), #377 with theme tokens, #223, #393 if Umami is wanted,
  #382 after #381.
- **Alternative for 200:** #389 (9) if the CEO wants every PostHog code precondition done before the key; then N2
  after MR-079. **Area check for that order:** 196, 198 and 200 in analytics/privacy would be 3 of the last 5 at 200's
  selection only if 199 were also privacy; with #397 at 199 it is 2 of 5, no penalty.
- **Agents:** `security-reviewer` → `frontend-engineer` → `frontend-engineer`; no 4+ run.
- **D-4:** N1 changes no copy if the drop is chosen; if the CEO keeps the join, the disclosure sentence needs
  `growth-strategist` only if it reaches three strings. N2: no strings.
- **Do not pick:** #396 before #397; #382 before #381; #377 as written (theme tokens per MR-074); #88 (superseded);
  #89, #91 (Path C); #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the D-1 answer;
  #393 while the CEO has not said Umami is wanted; #399 (CEO); any implementation row with a tool-less primary agent.
- **Practice:** run the whole Playwright project when shared plumbing changes and the full gate every review (§6); a
  privacy claim gets a browser check that would falsify it; the width assertion covers every public route (N2);
  annotations are final text.

---

## 12. Verdict

Every count reproduces at `111fcb2`: root 6466, web-app 4696 (both exit 0, no Errors line), typecheck 0, validator
clean (open 124), guard runner 142/142, the rest of the quality gate, and `test:e2e` project by project 65 + 14 + 149
(2 skipped).

- **Loop 195 holds** (width tests pass; revert consistent with MR-077). Two other pages overflow at 320 px, both in
  production (N2, 10).
- **Loop 196 holds** with real posthog-js: consent starts, stops, persists, resumes and crosses tabs; identify is by id
  only and once; the account card and banner pass axe and keyboard. A decline keeps the device id and `visitorId` keeps
  flowing to PostHog, so one privacy sentence is false (N1, 12); the reopened banner loses focus (N3, 9).
- **Loop 197 holds:** three bounce mutants killed; the deploy gate is green; the SyntaxError log is a teardown
  artifact.

Selection was sound (the 197 departure was right), the cool-off is re-armed, ratio 0.92. Asks for the CEO: **push
now**; configure `CRON_SECRET` and the job URLs; answer D-1 and #399; decide stored tokens, Umami and the `analytics`
agent's tools. For the coordinator: N1, #397, N2, all `burn-down`; add the Step 7 bullet.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 124
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6466 / 4696 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 65 passed
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 149 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && pnpm exec playwright test -c $S/probe078.config.ts --project=probe)      # P1-P7, P2b, P1b, P6b, D1, E1
(cd apps/web-app && pnpm exec playwright test -c $S/probe078.config.ts --project=probe-auth) # A1, B1-B3
(cd apps/web-app && node $S/mut078/run.mjs unit)          # 6/6 killed, files restored identical
(cd apps/web-app && node $S/mut078/run.mjs e2e-consent)   # C3 survives
(cd apps/web-app && node $S/mut078/run.mjs e2e-bounce)    # 3/3 killed
gh run list --limit 8                                     # CRON_SECRET failures; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 63
```
