# MR-077 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 192-194, 2026-10-03 14:02 → 14:32 (−0600). Commits `15edd37` (loop 192, #392), `a2e9a66`
(loop 193, #390), `3cd600e` (loop 194, #368). Previous review MR-076 at `777ba55`. Rows closed: #392, #390, #368.
Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-076 (`ITERATION_LOG.md`, loop 194 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or the design note. No commit, no
`git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared exception to "no repo
file touched", as at MR-075/076: mutants that only the repo's own tests can judge were applied **in place** one at a
time, each restored in a `finally` block and compared with a saved original after every mutant: `captureFilterSet.ts`
and `activeFilters.ts` (19 mutants, vitest), `DashboardV2Shell.tsx` (7 mutants, e2e) and five loop 192 files
(7 mutants, vitest). `git hash-object` shows every file identical afterwards; no mutation ran while a dev server was up
for another run. Scratch went only to `…/scratchpad/`:
- `ph077/bag.test.ts`: vitest probe with the repo's `sanitizePropertyBag`, `sanitizeFirstTouchRecord`,
  `FIRST_TOUCH_FIELD_SANITIZERS` and `captureFilterSet` (output `ph077_bag.txt`);
- `probe077.spec.ts` / `probe077b.spec.ts` / `probe077c.spec.ts` with their configs (the MR-075 pattern: the repo's
  global setup and auth setup, a dev server on 3098 started and stopped by Playwright): pricing region at 375 and
  320 px in both themes, nine saved-view break cases, a navigate-away-and-back round trip, the page-overflow culprit
  (outputs `probe077.raw.txt`, `probe077b.raw.txt`, `probe077c2.raw.txt`);
- `mut077c/` (converter and chip mutants, `mut077c.txt`), `mut077e/` (shell mutants, `mut077e.txt`), `mut077p/`
  (loop 192 guard mutants, `mut077p.txt`);
- `root077.txt`, `web077.txt`, `tc077.txt`, `val077.txt`, `guard077.txt`, `e2e077a.txt`, `e2e077b.txt`,
  `status_before077.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. Every probe that wrote preferences saved the original first and restored it in `afterAll`/`finally`
(`restore 200 equal=true` both times); the repo's specs restore their own rows, and the global setup re-seeds the local
SQLite test DB (normal). `netstat` shows nothing listening on 3000, 3097 or 3098 afterwards.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 194 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6458 | **314 files, 6458 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4678 | **265 files, 4678 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 387 rows, 264 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `saved-views-persistence` + `v2-a11y` (authenticated) | 47 | **47 passed (2.7 min)**, #366's `test.fail` counted as expected | matches |
| e2e `public/a11y` + `public/pricing` (public) | 9 (193) | **9 passed (26.5 s)** | matches |
| deltas | web 4641→4648→4649→4678; root 6429→6432→6432→6458 | 192 +7 web / +3 root, 193 +1 web / +0 root (`.tsx`), 194 +29 web / +26 root | consistent |

Pool arithmetic: MR-076 recorded 123 and filed three (#392-#394): 126. Loops 192-194 struck three and filed none:
**123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a production build, a real PostHog or Umami project,
a real screen reader (the AX tree is Chromium's), the live site (no `curl`). The agents' revert proofs are taken from
the log; the mutants below are mine.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** 7 of 7 loop 192 guard mutants and 18
   of 19 converter/chip mutants are killed (the survivor is equivalent); the pricing region is reached by real Tab
   order, scrolls by keyboard and draws its ring in both themes (measured in pixels).
2. **The pricing page itself scrolls sideways on phones (§3, N1).** 106 `sr-only` spans inside the comparison table
   escape the scroll region (it is not a containing block), so `documentElement.scrollWidth` is 666 at a 375 px
   viewport (and at 320 px); once the region reaches its end, ArrowRight scrolls the window. `position: relative` on the
   region brings it to 375 (measured). Present since loop 188, not in production yet; loop 193's e2e measured the
   region, not the page.
3. **A saved view's filters do not survive opening a workflow and coming back (§4, N2).** Ad-hoc filters round-trip
   through the URL (`/dashboard?opportunity=automate` after Back, still filtered); an applied view's filters are
   session state, so the same round trip shows every row and no chip. Applying a view also clears the URL's ad-hoc
   filters, so the user trades a filter that survives navigation for one that does not. Presets behave the same.
4. **The view chip goes stale on rename and delete, and three apply rules are untested (§4, N3).** Renaming keeps
   "View: Automate"; deleting keeps the chip and the filter (stored views 0). Shell mutants that survive the e2e:
   apply keeping ad-hoc filters, an unrelated chip removal dropping the view, and the view not counting as an active
   filter (a no-match view would show the first-run empty state).
5. **Loop 192's ingest sanitizer changes one report, as intended but not as logged (§2).** The admin "Top pages" list
   reads `page_viewed.path`; new rows group `/analytics/process/<id>` as `/analytics/process/[id]` while older rows keep
   ids until they age out. No date, ratio or file name is mangled.
6. **Selection followed MR-076 exactly** (`burn-down`, `burn-down`, then `top-score` on the cool-off with the log line
   present), every primary had a shell. Ratio, loops 185-194: **1.11** (10 closed / 9 created).

---

## 2. Loop 192 — #392 first-touch attribution keeps placeholders (`15edd37`): **HOLDS**

**Diff vs log:** matches. `UTMCapture` stores `templatePath(pathname)`; `sanitizeFirstTouchRecord` is a whitelist
(`utm_*` plus `FIRST_TOUCH_FIELD_SANITIZERS`: `landing_path` templated, `referrer_domain` and `captured_at` passed);
`getFirstTouchUTM` passes the table; ingest `filterProperties` returns `sanitizePropertyBag(rest)`. Server-side
`trackServer` writes are not run through the bag sanitizer; no server event carries a URL or path value today (grep of
every `trackServer(` call), so no row.

**Mutations** (in place, restored, hashes identical; baseline 4 files, 71 tests, exit 0, no Errors line):

| Mutant | Result |
|---|---|
| G1 UTMCapture stores the raw path; G2 read-side `landing_path` passthrough; G3 whitelist lets unknown keys through; G4 ingest bag unsanitized; G5 read passes no field table; G6 bag sanitizer top-level only; G7 `referrer_domain` dropped | **7 of 7 killed** (1-3 tests each) |

**Collateral of sanitizing every ingested bag** (`ph077_bag.txt`, the repo's `sanitizePropertyBag`):

| Input | Stored | Reader / effect |
|---|---|---|
| `page_viewed.path` `/analytics/process/cmabc123` | `/analytics/process/[id]` | **`GET /api/analytics/events` "Top pages" (`route.ts:228-235`, shown on `analytics/product`)**: per-process rows now aggregate; rows stored before 192 keep raw ids, so the 30-day list mixes both until they age out. Desired (cardinality), but the log's "nothing in the app reads stored path properties" is inaccurate |
| `cta_clicked.destination` `/signup?plan=team` | `/signup` | no reader; the plan is in `pricing_tier_selected` |
| `nav_link_clicked.href` `mailto:support@…` | `mailto:[email]` | no reader; the company address is lost, harmless |
| `reportDate` `2026/10/03`, `note` `/2026/10/03`, `ratio` `1/2`, `fileName` `report/q3.pdf`, `filePath` `C:\Users\a\b.pdf`, `interactionPath` `direct`, `slug`, `tab`, `response` | unchanged | no false templating |
| `query` `/share/TOKEN123` / `comment` `see /share/TOKEN123 now` | `/share/[token]` / unchanged | prose with spaces is not templated (#389's scope) |
| nested `{ path: '/share/t1' }`, arrays of paths | templated | as intended |

`sop_usefulness_response.response`, `workflow_viewed.tab` and the alert-state rows (`alerts/store.ts`, written by the
server) are unaffected. **First-touch:** only `getFirstTouchUTM` (signup) reads `ledgerium_first_touch_utm`; a legacy
record `{landing_path: '/share/shrTOKEN…', gclid, landing_url}` reads as `/share/[token]` with the unknown keys dropped;
`/de/share/T/x` → `/de/share/[token]`. The raw value stays in the visitor's own `localStorage` (first touch is never
overwritten), which is their own browser. `ledgerium_signup_ref` likewise holds the raw token client-side and only its
truthiness is used; no sink.

**Limits accuracy.** Accurate, except the consumer claim above.

---

## 3. Loop 193 — #390 the pricing table scrolls by keyboard (`a2e9a66`): **HOLDS for the region; the page overflows**

**Diff vs log:** matches (`role="region"`, `tabIndex={0}`, `aria-labelledby` the caption id, `focus-visible` ring with
the token, `focus:outline-none` which in Tailwind 3 is a transparent outline, so forced-colors mode still shows one).

**Measured** (`probe077.raw.txt`, real keyboard, both themes, 375 px and 320×256 = 1280×1024 at 400%):

| Check | Dark | Light |
|---|---|---|
| Real Tab order from the top | reached after 9 presses; previous stop the Enterprise `mailto:` link, next stop the SOP calculator input; Shift+Tab returns | same |
| Name / AX tree | `region "Plan comparison"` > `table "Plan comparison"` > caption, 4 rowgroups, 26 rows, 7 column headers, 25 row headers: the region does not flatten the table (the caption names both, so the name is heard twice) | same |
| Ring | `box-shadow` `rgb(34,197,94) 0 0 0 2px`; **972** ring-coloured pixels in the 3 px outer band focused, **0** unfocused (796 / 0 at 320 px) | `rgb(21,128,61)`; 972 / 0 (796 / 0) |
| Keyboard scroll | Tab-focused, 5 × ArrowRight: `scrollLeft` 200 | same |
| Full-page axe | `heading-order` (moderate) only | + `color-contrast` serious ×6 (#223) |
| **Page width** | **`documentElement.scrollWidth` 666** at 375 and at 320 | **666** |

**The page overflow (N1).** With every non-table element excluded, nothing else overflows; hiding the table brings the
document to 375. The region contains 106 `position:absolute` `sr-only` spans; the region is not positioned, so their
containing block lies outside it and their static positions (up to x = 666) widen the document instead of the region.
Setting `position: relative` on the region in the page gives 375 (`probe077c2.raw.txt`). After the region is scrolled to
its end, ArrowRight chains to the window (`scrollX` 43): a keyboard user pans the whole page. The spans came with the
table extraction at loop 188 (`df539f8`), so production (loop 151) does not have this; it ships with the next push.
`/product` measures 383 at 375 px from its demo widget (observation only). WCAG 1.4.10 exempts the table's own
two-dimensional scroll, not the page's.

**Limits accuracy.** Accurate (`.focus()`, indirect ring check); both are now measured above. The scope missed the
document width, which the row's own criterion (1.4.10) is about.

---

## 4. Loop 194 — #368 saved views keep their filters (`3cd600e`): **HOLDS for create and apply; three gaps**

**Diff vs log:** matches. `captureFilterSet` (pure, 106 lines, under the D-4 clause 2 threshold); the shell passes
`currentFilters` and `filtersPartiallyCaptured`; apply sets `presetFilters`, clears ad-hoc filters, the chip and the
preset, keeps search; the "View: {name}" chip; `applyActiveFilterState` keeps the view unless its chip is removed; the
design note §5 status line. `growth-strategist` consulted (hint POLISH applied).

**Persistence and the reconcile paths.** The PUT schema (`preferences/route.ts:88`) validates each view's FilterSet
shape but not column keys (by design), `buildSavedViews` copies `filters` verbatim, `migratePreferences` passes views
through, and the sync machine (185/187/190) carries whole `SavedView` objects, so an adopted server list keeps each
view's filters. Rename maps `{...v, name}`, so filters survive a rename.

**Break cases** (`probe077.raw.txt`, `probe077b.raw.txt`; stubbed workflows automate 80 / healthy 90 / monitor 30):

| Case | Observed | Verdict |
|---|---|---|
| D1 apply, then toggle a column | rows still Automate; chip stays | fine: the chip describes filters, not columns |
| D2 apply, rename to "Renamed" | chip still **"View: Automate"** | **stale** (N3) |
| D2 then delete the view | chip and filter **stay**; stored views 0 | **stale** (N3) |
| D3 apply, reload | all rows, no chip; URL had no filter params | session-only by design, but see the next row |
| **Navigate to /analytics, Back** | ad-hoc filter: URL `?opportunity=automate`, still filtered. Applied view: URL `/dashboard`, **all rows, no chip** | **filter lost** (N2) |
| D4 `?health=healthy`, apply a view with `filters: []` | the health filter is cleared | by the design's rule; note that every view saved before 194 has `[]` (views have been saved since iter 062), so applying one now clears the user's filters |
| D5 view filtering on `cycle_time_p95_ms` (not available) | no rows, "No workflows match current filters", chip "View: Stale" | honest and removable; **not** the "no-op" that the design note and the shell comment say (it matches no row) |
| D6 apply under the LSS lens, switch to Library | filter and chip kept; library columns untouched | fine |
| D7 `?opportunity=monitor`, apply view | replaced by the view; URL cleared | fine (preset semantics) |
| D8 free plan, gated rows: `health=healthy` vs view `health_score gte 70` | both show Automate, Healthy | parity holds in the browser |
| D9 save a new view while one is applied; remove the chip | new view stores the applied FilterSet; chip removal shows all rows | fine |

**Converter edges** (`ph077_bag.txt`): band healthy + chip `healthScore_gte_70` dedupe to one filter; whitespace-only
search is not partial; the bottleneck chip is not partial; opportunity monitor + chip automate captures both (matches
nothing, as `applyFilters` does). Dedupe is by `JSON.stringify`, so key order matters; a view and an ad-hoc filter
cannot coexist (every ad-hoc change nulls `presetFilters`), so this cannot double a filter in practice, and a doubled
AND filter is idempotent anyway. The hint reads "Your search and some filters…" even when only a systems filter is
active (copy reviewed; minor).

**Mutations.** Converter and chip model in place (`mut077c.txt`; baseline 3 files, 51 tests, exit 0, no Errors line):
19 mutants, **18 killed** (both thresholds, the operator, dedupe, every partial flag including the trim and the
non-narrowing chip, preset filters, opportunity, monitor chip, chip shown, chip clear, chip label). Survivor A3
(`CLEARED_FILTER_STATE` without `viewName`) is **equivalent**: `undefined` is treated as `null`. Shell in place against
the two `#368` e2e tests (`mut077e.txt`; baseline 4 passed):

| Mutant | Result |
|---|---|
| S1 apply restores no filters; S3 no view name; S5 capture not passed (`currentFilters={[]}`); S6 hint flag not passed | killed |
| **S2** apply keeps the ad-hoc filters (they would AND with the view) | **survives**: the e2e clears the ad-hoc filter before applying |
| **S4** removing an unrelated chip (search, which coexists with a view) also drops the view | **survives**: the log's "no longer wipes" has no test |
| **S7** the view not counted in `anyFiltersActive` (a no-match view shows the first-run empty state and hides the analyst chrome) | **survives** |

**Limits accuracy.** Accurate as listed (systems etc. not saved; stubbed workflows). Not listed: the stale chip, the
navigation loss, and the "no-op" wording.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| loop 192 guards (5 files, in place, vitest) | 7 | 7 | — |
| `captureFilterSet.ts` + `activeFilters.ts` (in place, vitest) | 19 | 18 | A3 (equivalent) |
| `DashboardV2Shell.tsx` apply path (in place, e2e `#368`) | 7 | 4 | **S2, S4, S7** (untested rules, N3) |

---

## 6. Governance

**Selection.**
- **192** `burn-down` #392 (11 → 9 with the −2 privacy saturation penalty, logged), MR-076's first pick,
  `security-reviewer`. ✓ The cool-off stayed 3/3.
- **193** `burn-down` #390 (10), MR-076's second pick, `frontend-engineer`. ✓
- **194** `top-score` #368 (11) with `ceiling-cool-off: invoked; rationale: …` logged in Candidate Selection. ✓
  **Cool-off 0/3; 195, 196 and 197 must be `burn-down`** to re-arm at 197.

**Agents.** `security-reviewer` → `frontend-engineer` → `frontend-engineer` + `growth-strategist`. All primaries have
Bash. D-4 clause 1 at 194: the row required the consult and it ran (hint POLISH applied); clause 2 did not fire (106
lines).

**Directory saturation:** `lib/` + `api/analytics/` + `components/` (192), `pricing/` (193), `dashboard-v2/` (194).
Clean. **Area** rolling five (190-194): dashboard, privacy, privacy, pricing, dashboard. No penalty applies to 195.

**MR-076 annotations:** #388/#387/#355 closure notes, #391/#389/#38/#368 appends, rows #392-#394 present (validator
counts them). Paste-ready text works.

**Primary-file and validation lines:** present in all three entries with exit codes, "no Errors line", e2e counts,
port check and stash state. Eleventh consecutive window.

**Density / follow-ups:** none filed by 192-194. No trigger.

**Ratio, loops 185-194** (same method as MR-069…076: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #380 (185), #385 (186), #386 (187), #113 (188), #388 (189), #387 (190), #355 (191), #392 (192), #390 (193), #368 (194) |
| Created | 9 | MR-074 #386-#387, MR-075 #388-#390, loop 191 #391, MR-076 #392-#394 |
| Ratio | **1.11** | above the ≥ 0.5 floor |

This review files three rows (126 open after them).

**D-1.** Last extension touch `871e29a`: **151 loops** at 194. Still unanswered; loops point at the CEO queue.

**Staleness (next oldest open non-blocked rows after MR-076's set), checked at `3cd600e`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #61 | — | `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` (`workflow-metrics.ts:113`) unchanged; the row asks for a post-launch review and there is no post-launch data (nothing pushed since 151, no PostHog) | **keep** (data-gated) |
| #81 | — | `route.test.ts` still mocks `@/lib/metrics-input-adapter` (`:52`) and `@/lib/workflow-metrics` (`:69`); no unmocked route test exists | **keep** |
| #84 | — | `canSeeHealthScores` lives in `feature-gating.ts`, consumed by both workflow routes; `isGated` set once (`route.ts:541`); less scattered than the row says, but no registry | **keep** (row text partly stale; low) |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **59 ahead** at `3cd600e` (60 once this review is committed); every suite green. Loops 152-194 are not in production. **N1 ships with the next push** unless fixed first |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37149798726`, new), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail on `CRON_SECRET` and the URL variables; nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (151 loops) |
| — | Stored share tokens | delete/redact existing `AnalyticsEvent` rows with `/share/<token>` in `url`, a `token` property, or `signup_completed.landing_path`; rotate live share links or not; proxy access logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first, consent with #394 |
| #278 / #389 / #394 | PostHog before a key | body filter, server SDK, identity, first-touch (DB and PostHog copies) done; free text (#389) and consent/withdrawal/disclosure (#394, closes #391) remain |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

---

## 7. Two patterns worth naming

**Measure the page, not only the component.** Loop 193 asserted that the region overflows and scrolls; MR-075 checked
the table's semantics. Neither measured `document.documentElement.scrollWidth`, which is what reflow (1.4.10) is about,
and an absolutely positioned descendant escapes a scroll container that is not its containing block. For any scroll
container or responsive fix: assert the document width at 320 px, and put `relative` on scroll wrappers that hold
`sr-only` text.

**A reference to a user-editable object stores its id, and a session-only rule gets a round-trip test.** The applied
view is remembered by name, so rename and delete leave a stale chip; and "session state, as presets are" was written
without asking what happens on Back, where the URL-backed ad-hoc filters already survive. When a design note says
"session only", add the navigate-away-and-back case to the e2e before calling it done.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-076 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `3cd600e`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** pricing page overflows at 375/320 px | 11 | follow-up | **true; ships with the next push** | `probe077c2.raw.txt` (666 → 375 with `relative`) |
| 2 | #85, #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only (0/3 now) |
| 3 | **N3** stale view chip; three untested apply rules | 10 | follow-up | true | D2; S2/S4/S7 |
| 4 | #394 consent start, withdrawal, disclosure | 10 | follow-up | true (dormant for PostHog) | unchanged since MR-076 |
| 5 | #377, #381 | 10 | follow-up | true | unchanged |
| 6 | #389 free text | 9 | follow-up | true (dormant) | unchanged |
| 7 | **N2** view/preset filters lost on Back and reload | 9 | follow-up | true | `probe077b.raw.txt` |
| 8 | #391 late identify | 9 | follow-up | true; closed by #394 | — |
| 9 | #393 Umami, #382 revision/409, #223 light theme | 8 | follow-up | true | #223: 6 serious contrast nodes on light /pricing at 375 px |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The pricing page scrolls sideways on phones: 106 screen-reader-only spans in the comparison table escape its scroll region and widen the page to 666 px at a 375 px viewport.** MR-077 §3. `sr-only` is `position: absolute`; the scroll wrapper in `app/(public)/pricing/ComparisonTable.tsx` (the `role="region"` div from loop 193) is not positioned, so the spans' containing block lies outside it and their static positions (up to x = 666) count toward the document's scroll width instead of the region's. Measured in Chromium at 375 px and at 320x256 (1280x1024 at 400%), dark and light: `document.documentElement.scrollWidth` = 666 with or without focus; with the table hidden it is 375; with `position: relative` set on the region it is 375. Once the region is scrolled to its end, ArrowRight scrolls the window (scrollX 43), so a keyboard user pans the whole page. Present since the table extraction at loop 188 (`df539f8`); not in production (last deploy loop 151) but ships with the next push. WCAG 1.4.10 exempts the table's own scroll, not the page's. Fix: add `relative` to the region's classes. Tests: extend the loop 193 e2e (both themes) to assert `document.documentElement.scrollWidth <= window.innerWidth` on /pricing at 320 and 375 px; revert proof: it fails without `relative`. Measure /product at the same widths and record the result (383 at 375 px from its demo widget, observation only, not this row). Follow-up of loop 193 (#390). | fix | pricing-page / a11y | `frontend-engineer` | 2 | 4 | 2 | 5 | 1 | 1 | **11** |
| **N2** | **An applied saved view's (or preset's) filters are lost when the user opens another page and comes back, or reloads, while ad-hoc filters survive in the URL.** MR-077 §4. Measured with stubbed workflows: ad-hoc opportunity=automate, client navigation to /analytics and Back gives `/dashboard?opportunity=automate`, still filtered; applying the view 'Automate' and the same round trip gives `/dashboard` with every row and no chip; a reload likewise. `presetFilters`, `appliedViewName` and `activePresetId` are session state outside the four URL-synced fields (`urlState.ts`), and applying a view or preset clears the URL's ad-hoc filters, so applying a view trades a filter that survives navigation for one that does not. The design note's 'session state, as presets are' did not consider navigation. Fix as one outcome: add `view=<id>` and `preset=<id>` to the URL state (mutually exclusive; while one is present the ad-hoc fields stay empty, as on apply); on hydrate apply a preset at once and a view once the saved-views baseline has loaded; an unknown id drops the param silently; deleting the applied view drops it. Tests: urlState round-trip units; e2e apply a view, navigate away, Back: filtered list and chip; the same after reload; a preset likewise; an unknown id ignored. Update design note §5 'Applying a view keeps persisting columns only' with the URL rule. Pairs naturally with #381 (save on leave). Follow-up of loop 194 (#368). | fix | web-app / dashboard | `frontend-engineer` | 3 | 3 | 2 | 4 | 2 | 1 | **9** |
| **N3** | **The 'View: {name}' chip goes stale when the applied view is renamed or deleted, and three of the apply rules have no test.** MR-077 §4. Measured: apply 'Automate', rename it 'Renamed': the chip still reads 'View: Automate'; delete it: the chip and its filter stay while the stored list is empty. Cause: the shell remembers the view by name (`appliedViewName`), not by id. Shell mutants run against the `#368` e2e that survive: S2 apply keeps the ad-hoc filters (they would AND with the view; the e2e clears them first); S4 removing an unrelated chip (search, which coexists with a view) also drops the view (the log's 'no longer wipes' has no test); S7 the view not counted in `anyFiltersActive` (a view matching no rows would show the first-run empty state and hide the analyst chrome instead of 'No workflows match current filters'). Fix: keep `appliedViewId`; derive the chip label from `savedViews` so a rename shows; deleting the applied view clears its filters and chip; correct the `handleApplySavedView` comment ('stay no-ops' becomes 'match no row'). Tests that kill S2, S4 and S7 and cover rename and delete (shell unit or e2e). Follow-up of loop 194 (#368). | fix | web-app / dashboard | `frontend-engineer` | 2 | 3 | 2 | 5 | 1 | 1 | **10** |

**Annotations recommended:**
- **#392 closure note:** "[MR-077: holds. Seven guard mutants killed on a clean baseline (UTMCapture raw path, read-side passthrough, whitelist opened to unknown keys, ingest bag unsanitized, no field table on read, top-level-only bag sanitizer, referrer_domain dropped). Collateral measured: the admin Top pages list reads page_viewed.path, so /analytics/process/<id> now groups as /analytics/process/[id] for new rows while older rows keep ids until they age out (the log's 'nothing reads stored path properties' is inaccurate for this report); cta_clicked.destination loses its query (the plan is in pricing_tier_selected); a mailto href becomes mailto:[email]. Dates, ratios and file names are untouched; prose with spaces is not templated (#389). Only getFirstTouchUTM reads ledgerium_first_touch_utm.]"
- **#390 closure note:** "[MR-077: holds for the region. Real Tab order reaches it after the Enterprise mailto link and before the SOP calculator input, Shift+Tab returns, the name is Plan comparison, and the AX tree keeps region > table with caption, 26 rows, 7 column headers and 25 row headers. The ring is drawn in both themes (972 ring-coloured pixels in the outer band focused, 0 unfocused); Tab-focused ArrowRight scrolls 200 px. Missed: the page itself is 666 px wide at 375 and 320 px because sr-only spans escape the unpositioned region (N1), present since loop 188.]"
- **#368 closure note:** "[MR-077: holds for create and apply. 18 of 19 converter and chip mutants killed (one equivalent); gated-row parity holds in the browser; a view saved while another is applied keeps its filters; a lens switch keeps them; a URL filter is replaced. Gaps: the chip keeps the old name after a rename and survives a delete, and three shell rules have no test (N3); applied filters are lost on navigate-and-back and reload while ad-hoc filters survive (N2); a filter on an unavailable column matches no row (honest message and chip) rather than being a no-op; views saved before loop 194 carry empty filters, so applying one now clears the current ad-hoc filters (by design); the hint names search even when only a systems filter is active.]"
- **#394 append:** "(MR-077) With #392 done (first-touch templated in both the analytics table and PostHog), PostHog's remaining preconditions are this row and #389, then the CEO's stored-token decision and the key (#278). Closes #391 if it lands."
- **#223 append:** "(MR-077) Measured at 375 px on /pricing in the light theme: 6 serious color-contrast nodes on the full page (axe), none in dark."
- **#81 append:** "(MR-077) Still open at `3cd600e`: route.test.ts mocks metrics-input-adapter (:52) and workflow-metrics (:69); no unmocked route test exists."
- **#84 append:** "(MR-077) canSeeHealthScores now lives in lib/feature-gating.ts and is consumed by both workflow routes; isGated is set once (route.ts:541). Less scattered than written; the registry is still absent."
- **Design note `SAVED_VIEWS_DESIGN.md` line 111, replace the sentence** "Stale-column filters stay no-ops (`evaluateFilter` guard)." **with** "A filter on a column that is no longer available matches no row (`evaluateFilter` returns false), so such a view shows 'No workflows match current filters' with its View chip, and removing the chip clears it (MR-077, measured)."

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 seven guard mutants; collateral on Top pages, destination, mailto; no false templating | #392 note |
| §3 Tab order, AX tree, ring pixels, keyboard scroll | #390 note |
| §3 page 666 px wide at 375/320 px (sr-only spans escape the region) | N1 |
| §3 light-theme contrast count on /pricing | #223 append |
| §4 applied filters lost on Back and reload | N2 |
| §4 stale chip on rename/delete; S2, S4, S7 survive | N3 |
| §4 unavailable-column filter matches no row, not a no-op | design note line 111; N3 (shell comment) |
| §4 converter mutants, parity on gated rows, reconcile paths keep filters, legacy empty-filter views, hint wording | #368 note |
| §6 PostHog preconditions after #392 | #394 append |
| §6 staleness: #61 keep (data-gated); #81 keep; #84 keep, text partly stale | #81 and #84 appends |
| §7 page-width assertion; ids and round-trip tests for session state | practice |

---

## 11. Loop 195-197 picks

**Before 195: push** only after N1 (or accept shipping it), set `CRON_SECRET` and the job URLs (item 4), answer D-1
(item 21), decide stored tokens.

Pool 123 + 3 = 126 > 8. The cool-off is **0/3**: all three loops are `burn-down`, which re-arms it at 197.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **195** | **N1** pricing page overflow | **11** | `burn-down` (follow-up of 193) | `frontend-engineer` | pricing-page / a11y | highest follow-up; a regression that ships with the next push; one class and one assertion |
| **196** | **#394** consent start, withdrawal, disclosure | **10** | `burn-down` (follow-up of 191) | `frontend-engineer` (`growth-strategist` adjacent, D-4 clause 1) | analytics / privacy | PostHog precondition; closes #391 in the same loop (strike both) |
| **197** | **N3** view chip by id; S2/S4/S7 tests | **10** | `burn-down` (follow-up of 194) | `frontend-engineer` | web-app / dashboard | live (stale chip), small; locks the apply rules before N2 builds on them |

- **Then MR-078** (base cadence after 197), then **#389** (`security-reviewer`), **N2** with **#381** (both about leaving
  the page; separate loops), #377 with theme tokens, #223, #393 if the CEO wants Umami, #382 after #381.
- **Agents:** `frontend-engineer` three in a row (allowed; the 4+ trigger fires at a fourth), so the first loop after
  MR-078 must rotate: #389 (`security-reviewer`) is the natural one.
- **Alternative for 197:** #389 (9, `security-reviewer`) if the CEO wants PostHog readiness before dashboard polish;
  then N3 after MR-078.
- **Area / directory:** pricing (`pricing/`), privacy (`components/`, privacy page, `hooks/`), dashboard
  (`dashboard-v2/`): no three in a row.
- **Do not pick:** #391 alone (#394 closes it); #382 before #381; N2 before N3 (N2 adds a view id to the URL; N3
  introduces the id); #377 as written (theme tokens per MR-074); #145, #142, #170, #175 (blocked); #114 before #137;
  #159/#160 (CEO); #29 without the D-1 answer; #393 while the CEO has not said Umami is wanted; any `top-score` audit
  row until the cool-off re-arms; any implementation row with a tool-less primary agent.
- **Practice:** a responsive or scroll fix asserts the document width at 320 px; a reference to an editable object is
  stored by id; a session-only rule gets a navigate-away-and-back test (§7); annotations are final text.

---

## 12. Verdict

Every count reproduces at `3cd600e`: root 6458, web-app 4678 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, e2e 47 + 9.

- **Loop 192 holds:** 7 of 7 guard mutants killed; ingest templating changes the admin Top pages grouping (desired,
  mislogged) and mangles nothing that is not a path.
- **Loop 193 holds for the region** (Tab order, name, AX tree, ring in both themes, keyboard scroll), but the page
  overflows to 666 px at 375 and 320 px because `sr-only` spans escape the region (N1, 11; since loop 188).
- **Loop 194 holds for create and apply:** 18 of 19 converter mutants killed, parity on gated rows, reconcile paths keep
  filters. The chip goes stale on rename/delete and three apply rules are untested (N3, 10); applied filters are lost on
  Back and reload while ad-hoc filters survive (N2, 9); the "no-op" wording is wrong (design note text above).

Selection followed MR-076 exactly, the cool-off was spent with its log line, ratio 1.11. Asks for the CEO: push (after
N1, or knowingly with it); configure `CRON_SECRET` and the job URLs; answer D-1; decide stored tokens; say whether
Umami is meant to be on; decide the `analytics` agent's tools. For the coordinator: N1, #394, N3, all `burn-down`.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6458 / 4678 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/saved-views-persistence.spec.ts e2e/app/dashboard/v2-a11y.spec.ts)          # 47 passed
(cd apps/web-app && pnpm exec playwright test --project=public \
   e2e/public/a11y.spec.ts e2e/public/pricing.spec.ts)                             # 9 passed
pnpm exec vitest run --root $S/ph077 --config $S/ph077/vitest.config.mts bag       # collateral table, converter edges
(cd apps/web-app && pnpm exec playwright test -c $S/probe077.config.ts --project=probe)   # pricing + D1-D9
(cd apps/web-app && pnpm exec playwright test -c $S/probe077b.config.ts --project=probe)  # Back round trip
(cd apps/web-app && pnpm exec playwright test -c $S/probe077c.config.ts --project=probe)  # 666 -> 375 with relative
node $S/mut077p/run.mjs        # loop 192 guards in place, restored: 7/7 killed
node $S/mut077c/run.mjs        # converter + chip in place, restored: A3 survives (equivalent)
node $S/mut077e/run.mjs        # shell in place, e2e -g "#368", restored: S2, S4, S7 survive
gh run list --limit 6                                                              # CRON_SECRET failures
git log origin/main..main --oneline | wc -l                                        # 59
```
