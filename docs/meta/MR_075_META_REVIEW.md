# MR-075 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 186-188, 2026-10-03 11:52 → 12:22 (−0600). Commits `faf7755` (loop 186, #385), `21e4b13`
(loop 187, #386), `df539f8` (loop 188, #113). Previous review MR-074 at `98c1b54`. Rows closed: #385, #386, #113.
Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-074 (`ITERATION_LOG.md`, loop 188 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or the design note. No commit, no
`git add`. Every row, strike or annotation below is a recommendation for the coordinator. One exception to "no repo
file touched", declared: the loop 187 shell mutants (§3) were applied **in place** to `DashboardV2Shell.tsx` one at a
time, each restored in a `finally` block and byte-compared with a saved original after every mutant (the shell has no
unit tests, so only the repo's own e2e can judge it); `git status` and `cmp` show the file identical afterwards.
Scratch went only to `…/scratchpad/`:
- `ph075/`: a vitest probe with the real posthog-js 1.367.0 and the repo's `buildPostHogConfig` and
  `sanitizePostHogEvent` (`ph075.txt`); `pn075.mjs`: posthog-node 5.29.2 with a fake `fetch` (`pn075.txt`);
- `mut075p/`: copies of `posthog-privacy.ts`, `posthog.ts` and both test files (the walk test's app path pointed at
  the repo), 28 mutants on the **copies** (`mut075p.txt`); `mut075s/`: copies of `savedViewsSync.ts` and its test, 13
  mutants (`mut075s.txt`); `mut075e/`: the in-place shell mutants above, 9 runs of the `#38[46]` e2e group
  (`mut075e.txt`, `mut075c.txt`);
- `probe075.config.ts` + `probe075.spec.ts` and `probe075c.*`: Playwright configs outside the repo (MR-069…074
  pattern: repo global and auth setup, dev server on 3098), 12 + 1 probes (`probe075.raw.txt`, `probe075c.raw.txt`);
- `root075.txt`, `web075.txt`, `tc075.txt`, `val075.txt`, `guard075.txt`, `e2e075a.txt`, `e2e075b.txt`,
  `status_before075.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing),
apart from this file. Every Playwright run started and stopped its own dev server; `netstat` shows nothing listening
on 3000, 3097 or 3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal). The probes seed the
test user's preferences in `beforeEach` and restore the snapshot in `afterAll` (`restore 200 views=0 cols-equal=true
order-equal=true`; 8 columns and 0 saved views before and after).

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run (the loop 186 lesson):**

| Check | Claimed (loop 188 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6416 | **311 files, 6416 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4618 | **260 files, 4618 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 380 rows, 258 struck, **open 122** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `saved-views-persistence.spec.ts` + `v2-a11y.spec.ts` | 44 (loop 187) | **44 passed (2.6 min)**, #366's `test.fail` counted as expected | matches |
| e2e public `a11y.spec.ts` + `pricing.spec.ts` | 7 | **7 passed (21.9 s)** | matches |
| deltas | web 4582→4604→4611→4618; root 6386→6408→6415→6416 | 186 +22 (both suites), 187 +7, 188 +7 web / +1 root (`.tsx` tests are web-only; the root +1 is the `pricing-copy` scan, as the log traced) | consistent |

Pool arithmetic: MR-074 recorded 123 and filed two (#386, #387): 125. Loops 186, 187 and 188 each struck one and filed
none: **122**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader (rowgroup headers and the "Roadmap"
badge are judged from Chromium's accessibility tree), a production build (dev runs StrictMode, which loads the
preferences twice), a real PostHog project (the browser path uses posthog-js with a stubbed transport; the server path
uses posthog-node with a fake `fetch`). The revert proofs in 186-188 are agent- or coordinator-reported.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** No share token survives in any
   posthog-js body (186); a pre-load toggle now replays onto the stored pack in every order I built, and UI and server
   agree after load (187); the comparison table is a named table with column, row and rowgroup headers (188).
2. **The share token still leaves the app through three doors #385 did not cover (§2, N1).** `trackServer
   ('shared_workflow_viewed', { token })` (`api/share/[token]/route.ts:44-48`) (a) forwards the raw token to PostHog
   through posthog-node, which has no `before_send` (measured: the batch body carries `"token":"<value>"`); (b) prints
   it in production logs (`analytics-server.ts:53`, `console.log` of every property); (c) stores it in
   `AnalyticsEvent.properties`. The client adds (d): every `track()` on `/share/<token>` stores `url:
   '/share/<token>'` in `AnalyticsEvent.url` (`analytics.ts:910`), and `shared_workflow_viewed` / `signup_from_shared_sop`
   carry `token` too. (b)-(d) are **live today**, without any PostHog key. The browser-side `token` property is
   overwritten by posthog-js's own project token, by accident (re-measured), and loop 186's integration test models
   `shared_workflow_viewed` with `page_url`, not the app's real `{ token }` payload.
3. **Free text still reaches browser PostHog by key name (§2, N2):** `tag_created.tagName` (user-typed),
   `dashboard_v2_filter_applied.filterValue` for systems (hostnames seen on the user's screen), and posthog-js's own
   `title` (`document.title`) on every `$pageview`. Titles are static today (`app/layout.tsx`), so `title` is latent.
   Dormant until a browser key is set.
4. **The comparison table scrolls but cannot be reached by keyboard at narrow widths (§4, N3).** At 375 px the
   wrapper scrolls (700/341 px) with no `tabindex`, role or name: axe `scrollable-region-focusable`, serious, the only
   serious violation on the page at that width. In light, the table has 7 serious contrast nodes (category headers
   2.71:1, "Roadmap" badges 3.42-3.56:1); loop 188's "light was checked once (0 serious)" does not hold. They are
   pre-existing classes in the #223 family, not a regression.
5. **Loop 187's late-answer guards are three overlapping defences, and no single one is tested (§3).** Removing any
   one, or both aborts, fails nothing; only removing all three fails A1. The pre-load **preset** path is untested in
   the shell (mutant S7 survives). Acceptable as defence in depth; recorded in the closure note, not a row.
6. **MR-074's design-note instruction was pasted, not carried out (§6).** The note's "Status after loop 185" line reads
   "add a 'Status after loop 185' paragraph: …"; the F0 defer sentence, the §3(iv) exception and the base rule are
   unchanged. #368 needs that rule first. This review gives paste-ready text instead of an instruction.
7. **Routing fault, mine (MR-074): #385 went to `analytics`, which has no shell** (§6). Ratio, loops 179-188: **0.91**
   (10 closed / 11 created). Cool-off spent correctly at 188; **189-191 must all be `burn-down`**.

---

## 2. Loop 186 — #385 paths templated before PostHog (`faf7755`): **HOLDS for posthog-js; three server-side and taxonomy doors remain**

**Diff vs log:** matches. `templatePath` driven by `ROUTE_PATTERNS` and `DYNAMIC_ROUTE_DECISIONS` (27 entries;
the walk test fails on an undecided `[param]` folder); URL keys `…url|uri|href|referrer|referer` with or without `$`,
path keys `path|…pathname`, absolute, protocol-relative and root-relative values, at any depth incl. `$set`,
`$set_once`, `$initial_*`; email segments → `[email]`; `mailto:` and userinfo dropped; nine config flags forced off.

**DYNAMIC_ROUTE_DECISIONS:** correct. The only bearer capabilities in a path are `/share/[token]` and
`/api/share/[token]` (secret). `/api/teams/[id]/invite/[inviteId]` is owner/admin-authorized (`route.ts:21-31`) and
invites are accepted by a query token (`/teams/join?token=`), so `id` is right. Slugs are marketing content. Note: the
"id" rationale ("joins to titles / owners") is undercut by the taxonomy itself, which sends `workflowId` / `teamId` as
properties on 30+ events; the real reason that holds is cardinality. Annotation, not a row.

**Edge inputs** (`sanitizePostHogEvent` on the repo copy, `ph075.txt`):

| Input | Output | Verdict |
|---|---|---|
| `/%73hare/<t>`, `/SHARE/<t>`, `/x/../share/<t>`, `/api/share/<t>/download` | `[token]` | ✓ |
| `/inbox/john%40example.com`, `…%2540…`, `/u/john+x@example.co.uk` | `[email]` | ✓ |
| `https://john@example.com:pw@host/a`; `$set_once.$initial_current_url` / `$initial_referrer` | userinfo gone; `[token]`, `[email]` | ✓ |
| `//share/<t>` (path key or value) | parsed as host `share`: **token kept** | edge; Next.js redirects repeated slashes before a page renders |
| `/share;x=1/<t>`, `/share/\t<t>`, `/share%2F<t>`, `' /share/<t>'` (leading space, non-URL key) | **token kept** | edge; no browser `location` produces them |
| `ftp://…/share/<t>`, `blob:https://…/share/<t>` | **token kept** | edge |
| `ws_url: 'see https://h/share/<t> now'` | `see https:/h/share/[token]` (one slash eaten) | cosmetic |
| `token: <t>`, `email: 'john@example.com'`, `$title: 'Payroll for john@…'` | **unchanged** | by design (key-based); see N1, N2 |

**Real posthog-js** (land on `/share/<t>`, `document.title = 'Payroll for john@example.com'`, then the app's own
payloads): `$pageview` carries `title: "Payroll for john@example.com"` (posthog-js adds it for `$pageview`, module
`h.title = r.title`); `shared_workflow_viewed` has `token: phc_probe` (the project key overwrites the app's property);
`tag_created` carries `tagName: 'Client: john@example.com'`; `$host` and `$device_id` are present (harmless). App titles
are the static `'Ledgerium AI — Workflow Workspace'` on `/workflows/[id]` and `/share/[token]` (no `generateMetadata`,
no `document.title` writes), so `title` is latent.

**Server path** (`pn075.txt`): `posthog-node` `capture({ properties: { token } })` → `POST /batch/` body
`{"api_key":…,"batch":[{"event":"shared_workflow_viewed","properties":{"token":"shrTOKENsecret123",…}}]}`. No hook
exists on that path (`posthog-server.ts:28-41`). `trackServer` also `console.log`s the full property bag in every
environment but `test` (`analytics-server.ts:52-54`) and writes it to `AnalyticsEvent.properties`. A repo-wide grep
shows a developer `.env.local` that sets `POSTHOG_API_KEY` (name only; the file is deny-listed and was not read
further), so `next dev` outside the e2e harness (which runs with `NODE_ENV=test`, where Next skips `.env.local`)
already forwards server events to a real project.

**Identity (#355):** both `identifyAnalyticsUser` callers pass the email as distinct id and as a property
(`LoginPageClient.tsx:43`, `SignupPageClient.tsx:78`); `resetUser` still has no caller. Unchanged; still the PostHog
precondition.

**Mutations** (copies, `mut075p.txt`; baseline 39/39, exit 0, no Errors line):

| Group | Mutants | Result |
|---|---|---|
| Loop 186's eight (URL-key branch = MR-072 P1, https-only, `?`-only, path-key branch, `/teams/join` exception, depth 2, no depth cap, dead clicks on) | 8 | **8 killed** (P1: 3 tests) |
| New: email segment off; userinfo kept; no percent-decoding; secret matched at start only; secret tail kept; case-sensitive literals; `PATH_KEY` exact `path`; `$set_once` unsanitized; `mailto:` branch off; `..` not resolved; root-relative branch off; exceptions / surveys / heatmaps / performance / web experiments on; `/share` pattern removed; schemeless host path untemplated | 18 | **17 killed** |
| `$`-prefix strip off | 1 | survives: **equivalent** (both key regexes are suffix-anchored, so `$current_url` and `$pathname` match without the strip) |

The suite is strong for what it covers. What it does not cover is the app's own payload keys (`token`, `tagName`,
`filterValue`, `title`) and the server path; the integration test's `shared_workflow_viewed` sends `page_url` and
`from`, not the real `{ token }`.

**Limits accuracy.** Accurate and useful: `$title`, free-text emails and #355 were named. The server path, the
`AnalyticsEvent` store and the logs were not.

---

## 3. Loop 187 — #386 a pre-load toggle replays onto the stored pack (`21e4b13`): **HOLDS**

**Diff vs log:** matches. `recordPreloadToggle` (last write per key), `recordPreloadPack` (whole-pack base, earlier
deltas dropped), `replayPreloadColumns` (pure), `adoptServerList(state, list, serverPack)` resolves `preload` into
`columns` on the first adoption only. Shell: an `AbortController` per load, aborted by a new load and on unmount;
`isStale()` (aborted or baseline loaded) checked after `fetch` and after `json()`; a 2xx without a `savedViews` array
is `error`; the toggle handler records a delta while the baseline is unknown; `scheduleSave` records a preset as a base.

**Probes** (Chromium, real API; stored pack `workflow_title, health_score, run_count`, views Alpha and Beta; default
pack has 6 columns). In all six the drawer's checked count was the server count minus the two locked columns, so the
UI matched the server after load:

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| P1 | GETs held; untick then re-tick Systems (in the default, not stored); release | 0 PUTs while held; one PUT `[…stored, systems]`, views omitted; stored views kept | **by design**: the last write was "Systems on" and the user saw it on; the stored pack gains a column the user never had (see note) |
| P2 | GETs held; preset "Automation Candidates"; toggle; release | one PUT of the preset pack plus the toggle; views kept | ✓ |
| P3 | LSS lens; toggle (lens-local); switch to library before the GET; release | **0 PUTs**; stored pack kept; library shows it | ✓ |
| P4 | GET 500; toggle in the error state; Retry → 500 (focus stays on Retry); Retry → 200 | 0 PUTs until success; then one PUT (stored pack minus Systems, i.e. unchanged); views kept | ✓ (a no-op PUT is sent) |
| P5 | GETs held; toggle; navigate away (unmount); Back (remount); release | 0 PUTs; stored pack and views kept | ✓ (the pre-load toggle is dropped, as T10 drops an unsent change) |
| P6 | hold only the first (StrictMode) GET; second answers; toggle after load; release the first | one PUT `[…stored, systems]`; the late answer does not overwrite | ✓ |

**Note on P1:** a net-zero click sequence on a column whose default and stored membership differ changes the stored
pack. It matches what the user last saw, and a "net change versus what was shown" rule would need the shown pack as
well; record it in the design note's T13 as accepted, no row.

**Mutations.** Sync copies (`mut075s.txt`; baseline 86/86, exit 0): 13 mutants, **11 killed**; U5 (deltas appended,
not deduped) and U10 (replay on any adoption) survive as **equivalent** (replay order yields last-write; `preload` is
cleared at the first adoption and the shell calls `adoptServerList` once). Shell, in place and restored, against the
8 tests matching `#38[46]` (`mut075e.txt`, `mut075c.txt`; baseline 8/8):

| Mutant | Result |
|---|---|
| S1 `isStale` ignores `baselineLoaded`; S2 `isStale` always false; S3 no abort on unmount; S4 no abort of a superseded load | **all survive** individually |
| C34 no aborts at all | survives (the `baselineLoaded` check still drops the late answer) |
| C234 no aborts and no stale check | **killed** (A1: the late StrictMode answer unticks the replayed column) |
| S5 a list-less 2xx adopted as `[]` | killed (A5) |
| S6 pre-load toggle sent as a whole pack (the loop 183 rule) | killed (C, A1, A3) |
| S7 pre-load preset not recorded | **survives** (a preset applied before the load silently reverts to the stored pack; no test) |

The three late-answer guards are redundant with each other, which is fine (production loads once; Retry exists only
in the error state); "fail on revert" holds for the whole change, not for each guard. S7 is a real coverage gap on a
rare path (closure note).

**Limits accuracy.** Accurate ("abort and stale-answer paths are covered by e2e only"; the pre-load preset UI/server
gap). It should also say the preset path has no shell test.

---

## 4. Loop 188 — #113 the pricing table reads as a table (`df539f8`): **HOLDS for semantics; a scroll region and light-theme contrast remain**

**Diff vs log:** matches. Mechanical extraction to `ComparisonTable.tsx`; sr-only `<caption>Plan comparison</caption>`;
`th scope=col` × 7; `th scope=row` per feature; one `tbody` per category with a `th scope=rowgroup colSpan=7`; check
svg `aria-hidden` plus sr-only "Included"; "—" `aria-hidden` plus sr-only "Not included". Cool-off logged
(`ceiling-cool-off: invoked; rationale: …`).

**Chromium accessibility tree** (`Accessibility.getFullAXTree`): table named "Plan comparison"; 1 caption, 26 rows,
7 `columnheader`, 25 `rowheader` (21 features + 4 categories), 126 `cell`. `scope="rowgroup"` on a `th` inside its
`tbody` is valid HTML (the table model assigns it to the remaining cells of that row group); Chromium exposes it as a
`rowheader` in a row of its own and does not add it to the cells' header set, so a reader announces the category when
the user reaches that row, and each cell with its feature and plan. That is the expected outcome; `colgroup` would
have been wrong, as the log says. The caption is a sound name.

**axe** (`probe075.raw.txt`, `probe075c.raw.txt`):

| Scope | Dark (default) | Light (`ledgerium-theme=light`) |
|---|---|---|
| table | 0 | **7 serious `color-contrast`**: 4 category headers `#047857` on `#a1bcb6` **2.71:1** (`bg-brand-900/20`); 3 "Roadmap" badges `#b45309` on `#ded3cd` / `#e4d7cf` **3.42 / 3.56:1** (`bg-amber-900/20`) |
| page, 1280 px | 1 moderate (`heading-order`) | 10 serious: the 7 above + 3 "Heads up" nodes `#b45309` on `#d4cdca` 3.2:1 |
| page, 375 px | **1 serious `scrollable-region-focusable`** + 1 moderate | not run |

Both light patterns are the old category-row classes (identical in `df539f8^`) and the badge; they belong to #223
(dark-palette translucent tints on a light surface). The loop's "light was checked once (0 serious)" is not
reproducible. #223's pricing figure (26) is stale: the whole page is now these 10 nodes in three class patterns.

**Mobile scroll container** (N3): `div.overflow-x-auto` around a `min-w-[700px]` table; at 375 px scrollWidth 700 /
clientWidth 341; no `tabindex`, role or label, and the table has no focusable content, so a keyboard user cannot
scroll to the Growth and Enterprise columns. The same happens at 400 % zoom on a 1280 px screen (WCAG 1.4.10 reflow
width). Fix: `tabIndex={0} role="region" aria-labelledby` the caption's id (or `aria-label="Plan comparison"`) with a
visible focus ring.

**Other icons and dashes on the page:** 39 of 102 svgs in `main` lack `aria-hidden`, mostly the plan cards' check
icons (`PricingCards.tsx:298`); unnamed svgs are skipped by Chromium, so this is hygiene. The cards' limit items
start with a bare `&mdash;` span (`PricingCards.tsx:310`, 8 on the page), which some readers announce as "em dash"
before each limit. Neither is in #113's scope; noted in the closure annotation, no row.

**"Roadmap":** 9 cells; read as "SSO, Enterprise, Roadmap". Understandable; growth's optional sr-only "not yet
available" suffix is reasonable but not needed.

**Limits accuracy.** Accurate on rowgroup support. Inaccurate on light (see above). The scroll container was not
considered.

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| `posthog-privacy.ts` / `posthog.ts` (copies) | 26 | 25 | `$`-strip off (equivalent) |
| `savedViewsSync.ts` (copies) | 12 | 10 | U5, U10 (both equivalent) |
| `DashboardV2Shell.tsx` (in place, restored) | 9 | 3 (S5, S6, C234) | S1-S4, C34 (redundant guards), **S7** (pre-load preset untested) |

---

## 6. Governance

**Selection.**
- **186** `burn-down` #385 (11), MR-074's first pick, forced rotation. ✓ Routed to `analytics`, as MR-074 told it to.
- **187** `burn-down` #386 (11), MR-074's second pick. ✓
- **188** `top-score` #113 (11) with `ceiling-cool-off: invoked; rationale: armed but unspent for 16 loops …`, per
  MR-074 §6. ✓ The cool-off is **0/3**; it re-arms after three consecutive `burn-down` loops, so **189, 190 and 191
  must all be `burn-down`** (pool 122 > 8), and it is armed again at 191's close.

**Agents.** `analytics` → `frontend-engineer` → `frontend-engineer` + `growth-strategist`. `frontend-engineer` is at
2 consecutive, so 189 should rotate (a third is allowed, a fourth fires the trigger). D-4 clause 1 fired correctly at
188 (3 strings, growth consulted, caption polished).

**Agent tooling gap (my routing error at MR-074).** `analytics.md` declares `tools: Read, Grep, Glob, Edit, Write`: no
shell. The agent wrote the code and tests but could not run them; the coordinator caught a wrong assertion, an
unhandled error that made Vitest exit 1, and two test gaps the first (invalid) mutation pass hid. Eight other agents
have the same tool list and are routinely named as primaries: `system-architect`, `ux-designer`, `growth-strategist`,
`product-manager`, `billing-pricing`, `a11y-architect`, `market-research`, `sop-expert`. Practice (no CLAUDE.md
change): **an implementation loop's primary agent must have Bash**; a tool-less agent is a design primary or an
adjacent reviewer only. For privacy rows use `security-reviewer` (Bash; it closed #375 and #378). Whether to add Bash
to `analytics.md` is a configuration decision for the CEO, not the coordinator.

**Directory saturation:** `lib/` (186), `dashboard-v2/` (187), `pricing/` (188). Clean.

**Design note, MR-074 annotation not executed.** `SAVED_VIEWS_DESIGN.md:8` now reads "**Status after loop 185
(MR-074, coordinator edit; no decision changed):** add a 'Status after loop 185' paragraph: T7 built; …": the
instruction was pasted as the status. The F0 defer sentence (`:72`), §3(iv) (`:68`) and the base rule are unchanged.
Cause: MR-074 wrote the bullet as an instruction while the coordinator's parser pastes annotations verbatim. From this
review on, every annotation is the final text; §9 gives the replacement line.

**Primary-file and validation lines:** present in all three entries, with exit codes and "no Errors line" (187), e2e
counts, port check and stash state. Ninth consecutive window.

**Density / follow-ups:** none filed by 186-188 (each logged "0 created").

**Ratio, loops 179-188** (same method as MR-069…074: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #365 (179), #379 (180), #383 (181), #378 (182), #384 (183), #376 (184), #380 (185), #385 (186), #386 (187), #113 (188) |
| Created | 11 | loop 179 #377, MR-072 #378-#379, loop 180 #380-#383, MR-073 #384-#385, MR-074 #386-#387 |
| Ratio | **0.91** | above the ≥ 0.5 floor |

This review files three rows; if 189-191 close three, window 182-191 stays near 0.9.

**D-1.** Last extension touch `871e29a`: **145 loops** at 188. The loops stopped repeating the ack line and point at
CEO queue item 21, as MR-074 recommended. Still unanswered.

**Staleness (next oldest open rows after MR-074's set), checked at `df539f8`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #17 | 8 | `upload/route.ts:235` and `sync/route.ts:243` still each `db.workflow.create` inline; `lib/ingestion.ts` shares only validation and rendering | **keep** |
| #28 | 7 | `billing/portal/route.ts:24-26` returns 400 "No billing account found"; `account/page.tsx:442` shows it with no support path | **keep** |
| #29 | 9 | extension-adjacent tooling; the D-1 question (CEO item 21) decides it | **keep, CEO-gated by item 21** |
| #45 | 8 | malformed-cell row, baselined by the validator (13/13) | **keep** |
| #59 | 7 | `'very_high'` absent from `workflow-metrics.ts`; the threshold needs production distribution data, which needs a key and users | **re-status: blocked on post-launch data** |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **51 ahead**; every suite green at `df539f8`. Loops 152-188 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37136811293`), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail on `CRON_SECRET` and URL variables; nothing is purged, which now includes share tokens in `AnalyticsEvent` (N1) |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 |
| new | Share tokens already stored | after N1 lands, decide whether to delete or redact existing `AnalyticsEvent` rows holding `/share/<token>` (`url`) or a `token` property, and whether to rotate live share links (an ops decision, not a loop) |
| new | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only (§6) |
| #278 / #355 / N1 / N2 | PostHog before a key | the browser hook is done; identity (#355), the server path (N1) and payload text (N2) remain |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

---

## 7. Two patterns worth naming

**A privacy filter covers the channel it was written for.** #375, #378 and #385 hardened posthog-js step by step and
each review found the next door in the same browser channel. N1 is the same token through a parallel channel (the
server SDK, the logs, the app's own store) that no row ever listed. Practice: a privacy row about a value names every
sink that value reaches (grep the value's producers, not the SDK), and its test uses the app's real payload, not a
model of it.

**An annotation is the final text, never an instruction.** MR-074's design-note bullet ("add a … paragraph") was
pasted verbatim, so the note now records a to-do as a status, and the rule #368 depends on is still missing. Reviews
write paste-ready text; anything that is work becomes a row or a pick.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-074 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `df539f8`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** share token in server PostHog, logs and the app's store | 11 | follow-up | **true, live** (logs, DB) | `pn075.txt`; `route.ts:44-48`; `analytics-server.ts:52-73`; `analytics.ts:910` |
| 2 | #387 stale reconcile GET | 11 | follow-up | true | `savedViewsSync.ts` reconcile unchanged since `40b2fdc` |
| 3 | #368 saved views capture filters | 11 | audit | true; **after #387 and the note's base rule** | `currentFilters={[]}` still passed |
| 4 | #85, #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only (0/3) |
| 5 | **N3** pricing scroll region not keyboard-reachable | 10 | follow-up | true | 375 px axe, serious |
| 6 | #355 PostHog identity | 10 | follow-up | true | two `identifyAnalyticsUser(email, { email })` callers; no `resetUser` caller |
| 7 | #377 green text, theme tokens | 10 | follow-up | true (prescription per MR-074) | unchanged |
| 8 | #381 save on leave, #366 | 10 | follow-up | true | unchanged |
| 9 | **N2** free text in browser PostHog payloads | 9 | follow-up | true (dormant) | `ph075.txt` |
| 10 | #371 | 9 | follow-up | true | route unchanged |
| 11 | #382 revision / 409 | 8 | follow-up | true; last | unchanged |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The share token still leaves the app outside posthog-js: in server-side PostHog events, in production logs and in the app's own analytics table.** MR-075 §2. Loop 186 (#385) templated paths in posthog-js only. `api/share/[token]/route.ts:44-48` calls `trackServer('shared_workflow_viewed', { token: params.token, workflowId, ownerId })`, and `trackServer` (`lib/analytics-server.ts`) (a) forwards the properties to PostHog through posthog-node, which has no `before_send` (measured with posthog-node 5.29.2 and a fake fetch: the `/batch/` body carried `"token":"<value>"`); (b) prints every property with `console.log('[analytics:server]', …)` in every environment except test, so production logs hold the token; (c) stores it in `AnalyticsEvent.properties`. In the browser, `track()` stores `url: window.location.pathname` (`lib/analytics.ts:910`) in `AnalyticsEvent.url` for every event, which on the share page is `/share/<token>`, and `shared_workflow_viewed` and `signup_from_shared_sop` carry `token` in their properties. (a) needs `POSTHOG_API_KEY` (unset in deploy files, #278); (b) to (d) are live today. The token is a bearer capability for the shared workflow, and retention purge is not running (CEO item 4). Fix as one outcome: drop `token` from both event types (the server fact keeps `workflowId` and `ownerId`; the signup attribution needs only `source: 'shared_sop'`); pass `url` through `templatePath` in `track()` before buffering; run the server-side PostHog properties through the same sanitizer as the browser; log the event name, not the property bag. Tests: the share route test asserts no token in the stored properties, the PostHog capture arguments or the log call; a `track()` test on `/share/<t>` asserts `url` is `/share/[token]`; a posthog-node fake-fetch test asserts no token in the batch body; replace the integration test's modelled `shared_workflow_viewed` payload with the real one. Existing rows holding tokens are an ops decision (CEO queue). Use a Bash-capable agent. Follow-up of loop 186 (#385). | fix | analytics / privacy | `security-reviewer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| **N2** | **Free text still reaches browser PostHog through named event properties and posthog-js's page title.** MR-075 §2. Measured with posthog-js 1.367.0 and the repo's `buildPostHogConfig`: `tag_created` sends `tagName` as typed by the user (`app/(app)/dashboard/page.tsx:537`; a tag 'Client: john@example.com' went out verbatim), `dashboard_v2_filter_applied` sends `filterValue` = the system name for the systems filter (`WorkflowListFilterBar.tsx:86`; system names are hostnames and app names seen on the user's screen), and posthog-js adds `title: document.title` to every `$pageview`, which `before_send` passes because it filters by key and value shape. Titles are static today (`app/layout.tsx`), so `title` is latent until a page sets a dynamic title. The taxonomy's own rule (`analytics.ts`: no titles, labels or content strings in any payload) is broken by `tagName`. Dormant until `NEXT_PUBLIC_POSTHOG_KEY` is set (#278). Fix: send no free text (drop `tagName` or send its length; send `filterType` without the system value, or a fixed bucket); drop `title` and `$title` in `sanitizePostHogEvent`; add a guard test that walks the `AnalyticsEvent` union and fails on a string property whose name is not on an allowlist of enum-like keys. Tests: integration test with the real `tag_created` and filter payloads and a dynamic `document.title`, asserting none reach a body. A precondition for enabling PostHog, with #355 and N1. Follow-up of loop 186 (#385). | fix | analytics / privacy | `security-reviewer` | 2 | 4 | 1 | 4 | 1 | 1 | **9** |
| **N3** | **The pricing comparison table cannot be scrolled by keyboard at narrow widths.** MR-075 §4. `ComparisonTable.tsx` wraps a `min-w-[700px]` table in `div.overflow-x-auto` with no `tabindex`, role or name, and the table holds nothing focusable. At 375 px the wrapper scrolls (scrollWidth 700, clientWidth 341) and axe reports `scrollable-region-focusable` (serious), the page's only serious violation at that width; the same applies at 400 % zoom on a 1280 px screen (WCAG 1.4.10). A keyboard user cannot reach the Team, Growth and Enterprise columns. Fix: `tabIndex={0}`, `role="region"` and a name tied to the caption (`aria-labelledby` the caption's id, or `aria-label="Plan comparison"`), plus a visible focus ring (`focus-visible:ring-2`). Tests: a unit test for the attributes; extend the table e2e in `e2e/public/a11y.spec.ts` with a 375 px viewport scan scoped to the wrapper, and a keyboard check that focusing the region and pressing ArrowRight changes `scrollLeft`. No copy beyond the existing caption. Follow-up of loop 188 (#113). | fix | pricing-page / a11y | `frontend-engineer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |

**Annotations recommended:**
- **#385 closure note:** "[MR-075: holds for posthog-js. No token in any body with the real SDK; the eight loop mutants are killed on a clean baseline (39/39, exit 0) and 17 of 18 new ones too (the survivor is equivalent). Edge inputs that keep the token (`//share/x`, `;` matrix segments, `%2F`, `ftp:` and `blob:` URLs) do not occur in a browser location. Not covered: the server SDK, logs and the app's own analytics table (N1); free text by key name and `document.title` (N2); `identify(email)` (#355). The integration test models `shared_workflow_viewed` with `page_url`, not the real `token` payload.]"
- **#386 closure note:** "[MR-075: holds on the real API. Net-zero toggles, preset then toggle, an LSS toggle then a lens switch, two failed Retries, unmount then remount and a late StrictMode answer all left UI and server in agreement with views kept. A net-zero click on a column whose default and stored membership differ adds or removes it (the last write wins), and a no-op change still sends one PUT; both accepted. The three late-answer guards overlap: no single one, nor both aborts, is pinned by a test; removing all three fails A1. The pre-load preset path has no shell test (mutant S7 survives). Sync mutants: 10 of 12 killed, two equivalent.]"
- **#113 closure note:** "[MR-075: semantics hold in Chromium: table named Plan comparison, 7 column headers, 21 row headers, 4 rowgroup headers exposed as row headers in their own rows, cells announced with feature and plan. Dark: 0 axe violations in the table. Light: 7 serious contrast nodes (category headers 2.71:1, Roadmap badges 3.42-3.56:1), pre-existing classes in #223's family; the loop's light claim of 0 does not reproduce. At 375 px the scroll wrapper is not keyboard-reachable (N3). Outside scope: the plan cards' check icons lack aria-hidden and their limit items start with a bare em dash.]"
- **#223 append:** "(MR-075) Pricing in light is now 10 serious nodes in three patterns, not 26: category headers `text-[var(--brand-text)]` on `bg-brand-900/20` (4 nodes, #047857 on #a1bcb6, 2.71:1), Roadmap badges `text-[var(--status-warning)]` on `bg-amber-900/20` (3 nodes, 3.42-3.56:1) and the Heads up note (3 nodes, #b45309 on #d4cdca, 3.2:1). All are dark-palette translucent tints over a light surface; a per-theme tint token fixes all three."
- **#355 append:** "(MR-075) Unchanged at `df539f8`: `LoginPageClient.tsx:43` and `SignupPageClient.tsx:78` call `identifyAnalyticsUser(email, { email })`, and `resetUser` has no caller. Server-side events already use the user id as distinct id (`analytics-server.ts`). With #385 done, this, N1 and N2 are the PostHog preconditions. Route to a Bash-capable agent."
- **#368 append:** "(MR-075) Pick only after #387 and after the design note carries the base rule (the MR-074 line at the top of the note is an unexecuted instruction; MR-075 §9 gives the replacement)."
- **#387 append:** "(MR-075) Unchanged at `df539f8`. The design note's §3(iv) exception and base rule are still unwritten; write them in the same loop."
- **#59:** re-status "blocked: needs post-launch variation distribution data (no production key or users yet); MR-075".
- **Design note (`SAVED_VIEWS_DESIGN.md`) line 8, replace the whole line with:** "**Status after loop 187 (MR-075, coordinator edit; no decision changed):** (1) T7 is built. (2) Base rule for every send and adoption: never send or adopt a whole pack or list unless its base is known and no local change happened since that base was read (baseline flag for the load, which #386 implements; a local edit counter for reconciles, which #387 implements). (3) T13's column rule is now loop 187's (pre-load toggles replay as deltas; a pre-load preset is a whole-pack base); a net-zero click sequence on a column whose default and stored membership differ is applied as its last write, accepted. (4) §3(iv) exception: after an unknown outcome on a column-only PUT, the reconcile shows the server's columns under 'Showing what's saved'; this is not a rollback. (5) §4 F0: a reconcile that removes a row with an open rename drops the draft (built behaviour, loop 185); the defer sentence below is withdrawn."
- **Design note line 72:** delete the final sentence "A reconcile must not replace a row whose rename input is focused with unsaved text; defer it until the editor closes (UX review loop 180)." (item 5 above records the decision).

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 server SDK, logs, `AnalyticsEvent.properties` and `url` carry the share token; modelled test payload | N1 |
| §2 `tagName`, systems `filterValue`, `document.title` reach browser PostHog | N2 |
| §2 identity by email, no reset caller | #355 append |
| §2 edge inputs, decisions table, mutants | #385 note |
| §3 probes P1-P6, net-zero toggle, no-op PUT | #386 note, design-note line |
| §3 late-answer guards redundant; S7 preset path untested | #386 note |
| §4 scroll wrapper not keyboard-reachable at 375 px | N3 |
| §4 light-theme contrast in the table and page; loop claim not reproduced | #113 note, #223 append |
| §4 card icons and dashes | #113 note (no row) |
| §6 MR-074 design-note instruction pasted, not executed | design-note line 8 and line 72; #368 and #387 appends |
| §6 tool-less primary agent | practice; CEO queue |
| §6 staleness: #17, #28, #29, #45 keep; #59 | #59 re-status |
| §6 stored tokens and live links | CEO queue (no row) |
| §7 every sink of a value; annotations are final text | practice |

---

## 11. Loop 189-191 picks

**Before 189: push** (CEO item 1), set `CRON_SECRET` and the job URLs (item 4), answer D-1 (item 21).

Pool 122 + 3 = 125 > 8 and the cool-off is **0/3**: all three loops are `burn-down`, which re-arms it at 191's close.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **189** | **N1** share token out of server PostHog, logs and the analytics table | **11** | `burn-down` (follow-up of 186) | `security-reviewer` | analytics / privacy | live today in production logs and the DB without any key; small; rotates off `frontend-engineer` (2 consecutive); Bash-capable, unlike `analytics` |
| **190** | **#387** stale reconcile GET (edit counter; M10, M13; design-note line 8 and line 72 in the same loop) | **11** | `burn-down` (follow-up of 185) | `frontend-engineer` | web-app / dashboard | silent loss of a saved view; must precede #368; writes the base rule #368 needs |
| **191** | **#355** PostHog identity reset and user-id identity | **10** | `burn-down` (follow-up, MR-067) | `security-reviewer` | analytics / privacy | with N1 done, the last live-path PostHog precondition except N2; not consecutive with 189 |

- **Then MR-076** (base cadence after 191; the cool-off is armed again), then #368 (`frontend-engineer`,
  `growth-strategist` adjacent, after #387), N3 (`frontend-engineer`), #377 with theme tokens, N2, #381, #382.
- **Agents:** `security-reviewer` → `frontend-engineer` → `security-reviewer`; no run of three.
- **Area / directory:** privacy (`lib/`, `api/share/`), dashboard (`dashboard-v2/`), privacy (`lib/`, login and
  signup clients): no three in a row by label or directory.
- **Alternative for 191:** N3 (`frontend-engineer`, 10, a live public-page a11y defect) if the CEO wants a visible
  fix before more dormant PostHog work; `frontend-engineer` would then be two in a row, still allowed.
- **Do not pick:** #368 before #387 and the note's base rule; #377 as written (theme tokens per MR-074); #382 before
  #381; #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the D-1 answer; any
  implementation row with a tool-less primary agent.
- **Practice:** name every sink of a value in a privacy row (§7); annotations are final text (§7); implementation
  primaries have Bash (§6).

---

## 12. Verdict

Every count reproduces at `df539f8`: root 6416, web-app 4618 (both exit 0, no Errors line), typecheck 0, validator
clean (open 122), guard runner 142/142, e2e 44 + 7.

- **Loop 186 holds** for posthog-js: all eight loop mutants and 17 of 18 new ones are killed on a clean baseline. The
  share token still leaves through the server SDK, production logs and the app's own analytics table, three of them
  live now (N1, 11); free text goes out by key name (N2, 9).
- **Loop 187 holds.** Six adversarial orders left UI and server in agreement with views kept. The late-answer guards
  overlap and are pinned only together; the pre-load preset path is untested.
- **Loop 188 holds** for table semantics in Chromium. The scroll wrapper is not keyboard-reachable at narrow widths
  (N3, 10); the light-theme contrast nodes are #223's, and the loop's light claim does not reproduce.

Selection followed MR-074 exactly and the cool-off was spent as directed; ratio 0.91. MR-074's own routing (#385 to a
shell-less agent) and its instruction-style design-note bullet were faults; both are corrected as practice here.
Asks for the CEO: push; configure `CRON_SECRET` and the job URLs; answer D-1; decide on stored share tokens; decide
the `analytics` agent's tools. For the coordinator: three `burn-down` loops, N1 first.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 122
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6416 / 4618 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/saved-views-persistence.spec.ts e2e/app/dashboard/v2-a11y.spec.ts)   # 44 passed
(cd apps/web-app && pnpm exec playwright test --project=public e2e/public/a11y.spec.ts e2e/public/pricing.spec.ts)  # 7
pnpm exec vitest run --root $S/ph075 --config $S/ph075/vitest.config.mts           # edge inputs; title, tagName via real posthog-js
node $S/pn075.mjs                                                                  # posthog-node batch body: TOKEN PRESENT
node $S/mut075p/run.mjs $S/mut075p; node $S/mut075p/q.mjs $S/mut075p               # 26 mutants; $-strip survives (equivalent)
node $S/mut075s/run.mjs $S/mut075s                                                 # 12 mutants; U5, U10 survive (equivalent)
node $S/mut075e/run.mjs; node $S/mut075e/runc.mjs                                  # shell in place, restored: S1-S4, C34, S7 survive
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe075.config.ts)
   # P1-P6 pre-load orders: UI = server, views kept; Q1 light 7 table nodes; Q2 375 px scrollable-region-focusable
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe075c.config.ts)   # light nodes
gh run list --limit 8                                                              # CRON_SECRET failures
git log origin/main..main --oneline | wc -l                                        # 51
```
