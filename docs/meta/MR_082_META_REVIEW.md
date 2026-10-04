# MR-082 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 207-209, 2026-10-03 22:18 → 23:00 (−0600). Commits `a22010c` (loop 207, #410), `0728f5d`
(loop 208, #408), `b477e14` (loop 209, #389). Previous review MR-081 at `c438476`. Rows closed: #410, #408, #389.
Rows filed by loops: none. Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-081 (`ITERATION_LOG.md`, loop 209 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike or annotation below is a recommendation for the coordinator. Declared
exceptions to "no repo file touched", as at MR-075…081: mutants that only the repo's own tests can judge were applied
**in place** one at a time and restored in a `finally` block, with the sha256 of every mutated file compared before
the first and after the last mutant (identical): `apps/web-app/src/lib/analytics.ts` (9 mutants) and, outside the
repo, posthog-js's `lib/src/utils/event-utils.js` in `node_modules/.pnpm/posthog-js@1.367.0` (3 mutants; the original
was renamed aside and renamed back, so its inode and the pnpm store link are unchanged). The probes wrote rows into
the e2e test database (`prisma/test.db`, untracked): one signed-up account, one tag, a share token on
`e2e-wf-growth-automate`, a saved view (deleted again). The next Playwright run reseeded it ("Cleared 33 table(s)").
The probes ran against a dev server I started on 3098 with the exact `webServer` environment of
`playwright.config.ts`; no other run shared it. Scratch went only to `…/scratchpad/`:
- `qg082.sh` (the quality gate), outputs `root082.txt`, `web082.txt`, `tc082.txt`, `val082.txt`, `guard082.txt`,
  `other082.txt`; `e2e082pub.txt`, `e2e082api.txt`, `e2e082auth.txt`; `install082.txt`; `status_before082.txt`;
- `devserver.sh` (MR-078's, the `webServer` env), log `devserver082.log`;
- `probe082.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe082s.spec.ts` (S1: the
  end-to-end PostHog session, 21 stages) → `probe082s.bodies.json`, `probe082s.raw.txt`; `inventory082.mjs` →
  `inventory082.txt`; `detail082.mjs` (per-event identity); `probe082m.spec.ts` (M1-M7 phone menu, D1-D3 desktop nav)
  → `probe082m.raw.txt`; `probe082m2.spec.ts` (contrast detail) → `probe082m2.raw.txt`;
- `listprops082.cjs` → `listprops082.txt` (every plain-string property of the `AnalyticsEvent` union, the guard's
  method);
- `mut082/phguard.mjs` (`mut082/phguard-results.txt`), `mut082/tsguard.mjs` (`mut082/tsguard-results.txt`).

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project and after stopping the dev server. Playwright ran one project at a time.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 209 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6516 | **319 files, 6516 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4748 | **273 files, 4748 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 403 rows, 282 struck, **open 121** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install) | not claimed | **exit 0**, "Done", no resolution | green |
| e2e `public` (whole project) | 141 (agent, 207 and 209) | **141 passed (7.2 min)** | matches |
| e2e `api` (whole project) | not claimed | **14 passed (26 s)** | green |
| e2e `authenticated` (whole project) | 201 (agent, 208) | **201 passed, 2 skipped (10.6 min)** | matches |
| deltas | web 4729→4736→4736→4748; root 6499→6506→6506→6516; public 141→141→141; authenticated 192→201 | 207 +7 / +7 unit, 208 +9 e2e, 209 +12 / +10 unit | consistent |

The deploy gate is green at `b477e14`: quality gate, then `test:e2e` **public 141, api 14, authenticated 201 + 2
skipped**. No flaky or retried test. The `batch rejected SyntaxError` teardown log appeared in the authenticated run,
as at MR-078…081.

Pool arithmetic: MR-081 recorded 124 after its row (#410 filed). Loops 207-209 struck three (#410, #408, #389) and
filed none: **121**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build (so React StrictMode's doubled
effects in dev are not judged, §4), a real PostHog project (IP, GeoIP and storage are project-side and invisible to a
stub), a real screen reader (the menu was checked through the accessibility tree and keyboard, §3), the live site (no
`curl`).

---

## 1. Lead

1. **The PostHog payload is clean end to end (§4).** One realistic session with the real posthog-js 1.367.0 and the
   production `buildPostHogConfig` (campaign landing, pricing, signup, two accounts, dashboard filters, lens, saved
   view, tag, workflow page, share page, sign-out, decline, accept): 63 events in 34 bodies. No email, name, workflow
   title, tag text, system name, view name, page title, share token, query string or raw click id appears in any
   body; campaign values are at most 64 characters; `mc_cid` with an email is absent; Decline sends nothing and Accept
   starts a new anonymous identity.
2. **Verdict: ready to set the browser key after the push, not before it.** Production (`origin/main`) still runs the
   old config: autocapture on, `mask_all_text: false`, no `before_send`, cookie persistence. Order: push, confirm the
   deployed commit is at or after `b477e14`, set the PostHog project settings (region, IP, GeoIP, retention) and the
   matching privacy sentence (**N3**), then the key; a rollback to a commit before `a22010c` must unset the key first.
   One fix recommended before the key: sign-out keeps the device id and sends one page view under the old account
   (**N1**).
3. **The push stays rollback-safe (§4).** The changed event properties (`tagNameLength`, the closed `filterValue`)
   live in `AnalyticsEvent.properties`; no production reader parses either, and production's ingest stores the blob
   verbatim. No Prisma change. Production keeps writing tag names and system names to our own table until the push.
4. **Each loop holds.** 207's upgrade guard fails on a simulated new key and on a click id posthog-js stops masking.
   208's menu passes a keyboard and accessibility-tree pass; desktop is unchanged. 209's guard kills 5 of 5 flat
   string mutants but misses nested objects, `Record`s and index signatures (**N4**). One new analytics-accuracy
   defect: the /product demo report sends report events (**N2**).
5. **Selection was sound:** MR-081's three picks in order, all `burn-down`; the cool-off is held at **3/3**. Ratio,
   loops 200-209: **1.25** (10 closed / 8 created).

---

## 2. Loop 207 — #410 every campaign key PostHog collects is handled (`a22010c`): **HOLDS**

**Diff vs log:** matches (`SANITIZED_CAMPAIGN_KEYS = ['gad_source', 'mc_cid']` folded into the campaign-key regex for
bare, `$initial_` and `$session_entry_` forms; 6 unit tests; the upgrade guard; the e2e campaign landing extended).

**In the end-to-end session (§4):** `gad_source`, `$session_entry_gad_source`, `$set_once.gad_source` and
`$set_once.$initial_gad_source` arrive at 64 characters; `mc_cid` (an email) is in no body; `fbclid` and `gclid` are
`<masked>` in every form.

**The upgrade guard, simulated** (`mut082/phguard-results.txt`; posthog-js's `event-utils.js` edited and restored):

| Mutant | Observed | Verdict |
|---|---|---|
| **G1** a new key `hsa_kw` in `CAMPAIGN_PARAMS` | the guard fails: "unhandled posthog-js campaign key hsa_kw" | ✓ killed |
| **G2** `_kx` removed from `PERSONAL_DATA_CAMPAIGN_PARAMS` (collected, no longer masked) | fails: "unhandled … _kx" | ✓ killed |
| **G3** a new `utm_id` (control) | passes, as it should (the utm rule covers it) | ✓ |

**What the guard reads.** It reads `lib/src/utils/event-utils.js`; the browser runs `dist/module.js`. In 1.367.0 both
hold the same 24 keys (checked key by key), and both are built from one source, so the proxy is sound.

**The e2e half of the claim is weaker than stated.** The landing URL is written by hand, so a key added by an upgrade
never appears in a body and the "any other key throws" branch cannot fire. Only the unit guard catches an upgrade.
Annotation, no row.

**Limits accuracy.** Accurate ("not seen failing on a real new key": now seen failing on two simulated ones). Not
stated: the e2e cannot see a new key.

---

## 3. Loop 208 — #408 the phone menu gets out of the way (`0728f5d`): **HOLDS**

**Diff vs log:** matches (`closeIfFocusLeft` on the toggle and the nav, a nav click handler that closes on any link,
`aria-current="page"` on the active link; 9 e2e tests in `page-width.spec.ts`).

**Keyboard and accessibility tree at 375 px on /account** (`probe082m.raw.txt`):

| Probe | Observed | Verdict |
|---|---|---|
| M1 Enter on "Toggle menu" | `aria-expanded` true; focus on "Workflows" | ✓ |
| M1 accessibility tree of `#app-nav` | navigation "Primary": 7 named links, "Switch to light mode", "Documentation", "Sign out" | ✓ |
| M1 Tab through the panel | Workflows … Account, theme, Documentation, Sign out, then the page: menu closes on that Tab | ✓ |
| M2 Escape | closes; focus on "Toggle menu" | ✓ |
| M3 Enter on the current page's link | closes; focus falls to `body`; the next Tab continues into the page content | ✓ closes; focus not returned (note) |
| M4 Enter on Upload | navigates and closes; focus on `body` (Next.js route change) | ✓ |
| M5 Shift+Tab from the first link, then again | toggle (stays open), then the logo (closes) | ✓ |
| M6 click the theme button inside the panel | stays open | ✓ |
| M7 header-scoped axe, menu open, light and dark | none | ✓ |

**Desktop, 640 / 1024 / 1280 px on /upload:** the toggle is hidden; exactly one `aria-current` link ("Upload", then
"Workflows" after a click); the Tab order is unchanged (seven links, Get Extension, theme, Documentation, Sign out);
the nav stays visible after a link click. A header axe scan taken in the same tick as a client navigation reported
`color-contrast` at 1024 and 1280 px; settled scans 1.5 s later on /dashboard, /upload and /account at both widths find
nothing. That is the 150 ms `transition-colors` in flight, not a defect.

**M3.** Activating the current page's link hides the focused link, so focus drops to `body`. Chrome continues
sequential navigation from that point, so a keyboard user is not sent back to the top; returning focus to the toggle
would be tidier. Note on the closure, no row.

**Limits accuracy.** Accurate ("Tab out to browser chrome leaves the menu open"; the Sign-out-last assumption). Not
stated: focus after the current-page link.

---

## 4. Loop 209 — #389 no free text in analytics (`b477e14`): **HOLDS; the PostHog payload is clean; four rows**

**Diff vs log:** matches (`tag_created` sends `tagNameLength`; `filterValue` a 13-member closed union, systems send
`added`/`removed`; `TITLE_KEY` drops every title form at any depth; `analytics-payload-guard.test.ts`).

### 4.1 The TS-compiler guard

**Mutants** (`mut082/tsguard-results.txt`, guard file only, 4 tests):

| Mutant on `lib/analytics.ts` | Observed | Verdict |
|---|---|---|
| **T1** new variant property `note: string` | 1 test fails | killed |
| **T2** optional `comment?: string` on `tag_deleted` | 1 fails | killed |
| **T3** `labels: string[]` | 1 fails | killed |
| **T4** `tagName: string` re-added to `tag_created` | 2 fail | killed |
| **T5** template literal `` `x-${string}` `` | 1 fails | killed |
| **T6** `meta: { note: string }` | passes | **survived** |
| **T7** `extra: Record<string, string>` | passes | **survived** |
| **T8** index signature `[k: string]: unknown` | passes | **survived** |
| **T9** `sectionLabel: string` on a new variant (an allowlisted name) | passes | survived by design (stated limit) |

T6-T8 are shapes the guard does not inspect (it walks a variant's own properties and arrays only). One exists today:
`signup_completed` has `[utm: string]: unknown` and spreads the first-touch record. Two call sites bypass the type:
`TrackedLink` passes `properties: Record<string, unknown>` through `as AnalyticsEvent`, and `trackActivation` spreads
`metadata` through `as any`. Their call sites are bounded today (checked: `location`/`destination` constants, catalog
slugs, ids and counts), but the guard cannot see them. **N4.**

**The allowlist** (`listprops082.txt`): the union has 123 variants and 48 plain-string property names plus `event`;
the allowlist holds exactly those 49 (the log's "40 allowlisted" counts differently; no stale or missing name).
Emit sites spot-checked at `b477e14`:

| Property | Emit site | Bounded? |
|---|---|---|
| `sectionLabel` | `WorkflowReportPage.tsx:3148` `SECTION_LABELS[sectionId] ?? sectionId` | yes (static headings) |
| `personaKey` | `compare/page.tsx:208`, `RoiSection.tsx:54` (custom → null) | yes (catalog) |
| `endpoint` | `reportApiError` via `withApiRoute('<literal>')`; no non-literal caller | yes |
| `destination` | `cta_clicked` literals; `TrackedLink` constants | yes |
| `reason` | `login_failed` `'invalid_credentials'` only | yes |
| `error` | `upload_failed` `'Network error'` and server codes | yes |
| `tab` | `'workflow'`; `` `process_group_${group.id}` `` (`ProcessGroupsExplorer.tsx:193`) | yes, an opaque id (joins to content in our DB) |
| `errorName` | `safeErrorName(error)` | yes |
| `referrerHost` | `referrerHostOf(referrer)` | yes (a host) |
| `alignmentLevel` | `SOPPageShell.tsx:108` enum or kind | yes |
| `preset` | `dashboard/page.tsx:781` `view.label` of the constant `PRESET_VIEWS`; `DashboardV2Shell.tsx:952` `preset.id` | yes (not user-saved names) |
| `path` | `page_viewed` literals and `` `/analytics/process/${id}` `` (templated before PostHog and at ingest) | yes |
| `href` | `PublicNav` config constants | yes |
| `slug`, `toSlug` | catalog slugs; `r.path.split('/').pop()` | yes |

No allowlisted property carries user-typed text at any checked site. Ids are the remaining class (§4.3).

### 4.2 Rollback safety of the stored change

`tagNameLength` and the new `filterValue` values are written into `AnalyticsEvent.properties` (JSON). At `origin/main`,
`analytics-event-names.WRITERS_READERS.md` lists no reader for `tag_created` or `dashboard_v2_filter_applied`; the
events GET parses `properties` only for `page_viewed.path`; the engagement, retention, retirement and upgrade readers
do not read either event (grep at `origin/main`). Production's ingest stores the blob verbatim (`filterProperties`),
and both event names are in both versions' name lists. No Prisma change in 207-209; 207 and 208 store nothing.
**Verdict: rollback-safe.** Two consequences to state: production writes typed tag names and system names to our own
table until the push (old rows keep them; the retention purge is not running, CEO item 4), and once the PostHog key is
set a rollback to a commit before `a22010c` ships production's old PostHog config with the key (§4.3).

### 4.3 PostHog end-to-end readiness probe

**Setup.** posthog-js 1.367.0, `buildPostHogConfig` as shipped, key `phc_e2e_stub_key`, host
`http://posthog.e2e.test` intercepted; consent by the banner, not preset. 21 stages
(`probe082s.raw.txt`): landing on `/` with `utm_source`, `utm_medium`, a 100-character `utm_campaign`,
`utm_content=jane%40example.com`, `utm_term`, `gclid`, `fbclid`, `mc_cid=bob%40example.org`, a 90-character
`gad_source`; Accept; /pricing; signup of a new account (name and email typed); its dashboard; sign out; sign in as the
seeded user; time range 7d → all; systems, opportunity and health filters; an insight chip; lens LSS → Library; a saved
view "Acme Secret View" created, applied, deleted; a row click; a tag "Client: john@example.com" (`?v2=0`); a workflow
page scrolled; a share link created; the share page; sign out; Decline PostHog; /product and /pricing; Accept; /product
and the Pricing link. **34 bodies, 63 events, 19 event names**; 16 first-party bodies.

**Property inventory** (`inventory082.txt`; every key in `properties`, `$set`, `$set_once` and the top level):

| Class | Keys | Value class (sample) | Flag |
|---|---|---|---|
| our event properties | `filterType`, `filterValue`, `lens`, `time_range`, `workflowCount`, `hasActiveFilters`, `portfolioFilterActive`, `chipsRenderedCount`, `visibleColumnCount`, `healthBand`, `originSurface`, `elapsedMsSinceDashboardView`, `tab`, `tagNameLength`, `runCount`, `sectionCount`, `hasAgentIntelligence`, `item`, `href`, `group`, `column`, `interactionPath`, `device`, `isLoggedIn`, `returnedFromCheckout`, `checkoutTier`, `checkoutInterval`, `referrerHost`, `utmSource/Medium/Campaign`, `userPlan`, `path`, `landing_path`, `referrer_domain`, `captured_at` | literals (`added`, `automate`, `lss`, `all`), counts, booleans, null, templated paths, ISO time | none |
| record ids | `workflowId` (5 event names here) | opaque id (`e2e-wf-growth-automate`; real ones are cuids) | **joins to titles in our DB**; anonymous /product visitors send the demo id (N2) |
| identity | `distinct_id`, `$user_id`, `$anon_distinct_id`, `$device_id`, `$session_id`, `$window_id`, `$pageview_id`, `$prev_pageview_id`, `uuid`, `$insert_id`, `token` | uuid; the account id when signed in | account id as disclosed; **`$device_id` survives sign-out (N1)** |
| URLs and paths | `$current_url`, `$pathname`, `$host`, `$referrer`, `$referring_domain`, `$prev_pageview_pathname`, `$session_entry_url/_pathname/_host/_referrer/_referring_domain`, `$set_once` `$initial_*` and bare forms | no query string; `/workflows/[id]`, `/share/[token]` | none |
| campaign | `utm_*`, `gad_source` (bare, `$session_entry_`, `$set_once` bare and `$initial_`); 17 click ids | ≤ 64 characters; `<masked>` or null | none |
| device and browser | `$raw_user_agent` (full string), `$browser`, `$browser_version`, `$os`, `$os_version`, `$device_type`, `$browser_language(_prefix)`, `$timezone`, `$timezone_offset`, `$screen_*`, `$viewport_*` | `Mozilla/5.0 (Windows NT 10.0; …) Chrome/124…`, `America/Denver` | standard posthog-js; **not disclosed (N3)** |
| page-leave | `$prev_pageview_duration`, `_last/_max_scroll(_percentage)`, `_last/_max_content(_percentage)` | numbers | none |
| SDK | `$lib`, `$lib_version`, `$lib_custom_api_host`, `$config_defaults`, `$configured_session_timeout_ms`, `$sdk_debug_*`, `$recording_status` (`disabled`), `$process_person_profile`, `$is_identified`, `$initialization_time`, `$last_posthog_reset`, `$time`, `timestamp`, `offset`, `$lib_rate_limit_remaining_tokens` | constants, times | none |

**Absent from every body:** both account emails and the probe email's local part, both names, the tag text and
"john@", the view name, three workflow titles, "Salesforce" and "Outlook", the share token and `/share/<token>`,
`?utm` and `ref=probe`, any value over 64 characters, `abc123`/`fb456`, `bob@`, `jane`, `title`/`$title`, `$ip`,
`$geoip_*`. `$identify` carries `$set: {}`; `$set_once` holds only URL, referrer, host and campaign keys. The share
page's own events carry no workflow id. First-party bodies: `tag_created` has `tagNameLength: 24` and no text; the
systems filter sends `added`/`removed`.

**Identity across the session** (`detail082.mjs`):

| Moment | Observed | Verdict |
|---|---|---|
| signup | `$identify` with distinct_id = the new account id, `$anon_distinct_id` the visitor | ✓ |
| sign out, then the /login page view | the `$pageview` of /login still has distinct_id = the account just signed out (`$is_identified` true); the next event has a new anonymous id | **✗ one event mis-attributed (N1)** |
| anonymous → account A → account B | every event carries the same `$device_id` | **✗ two accounts linked on one browser (N1)** |
| Decline, then /product and /pricing | no body | ✓ |
| Accept again | new distinct_id and new `$device_id`, not identified | ✓ (#400) |

**Not judged:** `shared_workflow_viewed`, `workflow_viewed` and `page_viewed` appear twice for one load; this is a dev
server, where React StrictMode runs effects twice, so a production build is needed before calling it a defect. IP and
GeoIP: no body carries them; PostHog derives them from the connection unless the project discards client IP data.

**N1** (sign-out). `useAnalyticsIdentity` resets only after the next page sees an unauthenticated session, after
`PostHogProvider` has sent the `$pageview`, and `resetAnalyticsUser` calls `posthog.reset()` without `true`, which keeps
`$device_id`; Decline uses `reset(true)` since #400. **N2** (demo report). `DemoAnnotatedReport` renders
`WorkflowReportPage`, whose seven `track` calls fire for the fixture workflow `8a7f3a48-3b9a-4790-92a4-6ba5ce59db08`
(`report_viewed` with runCount 16, sectionCount 20, sent by an anonymous visitor on /product, to PostHog and our table).
**N3** (disclosure). Section 9 says PostHog "receives page views and named product events"; it does not name the device
data above, the IP address or the storage region (default host `us.i.posthog.com`).

**Verdict: the code is ready; set the browser key only after the push, the CEO's PostHog project settings and N3.**
N1 is recommended first (it is small and the data it links cannot be unlinked later). The full list before the key:
push; deployed commit at or after `b477e14`; PostHog project region, "discard client IP data" / GeoIP and retention
(CEO); N3's sentence; #399 (consent scope, CEO); the stored-data decision (share tokens, tag names, system names);
N1; then the key (#278) and a rebuild (`NEXT_PUBLIC_*` is inlined at build time); the rollback runbook unsets it.

**Limits accuracy.** Accurate (names and types, not values; old rows keep their text). Not stated: the shapes the guard
does not inspect and the cast call sites (N4). "40 allowlisted" is 48 names plus `event`. The loop ran the whole
`public` project and the dashboard directory; this review ran the whole `authenticated` project too (201 passed).

---

## 5. Mutation summary

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| posthog-js campaign lists vs the #410 unit guard (simulated upgrade) | 2 + 1 control | 2 (control passes, correctly) | — |
| `AnalyticsEvent` union vs the #389 TS guard (in place) | 9 | 5 | T6 nested object, T7 `Record`, T8 index signature (N4); T9 allowlisted name (by design) |

---

## 6. Governance

**Selection.**
- **207** `burn-down` #410 (10), MR-081's first pick, `security-reviewer` (consecutive 2: 206, 207). ✓
- **208** `burn-down` #408 (10), MR-081's second pick, `frontend-engineer`. ✓
- **209** `burn-down` #389 (9), MR-081's third pick, `security-reviewer`. ✓ The cool-off is **3/3, held 207-209** as
  MR-081 planned.

**Cool-off.** Holding a charge is not a defect; it does not expire. But the five score-11 audit rows (#85, #106, #114,
#137, #174) have outranked every follow-up since MR-067 and have been "cool-off only" in every Part C since: their 11
is an audit-intake estimate that no review has re-scored from the code. Recommendation: MR-083 re-scores them (keep,
downgrade or split) instead of carrying them forward again.

**Agents.** `security-reviewer` → `frontend-engineer` → `security-reviewer`. No 4+ run. All primaries have Bash.
`analytics` still has none (CEO queue).

**Step 7 bullets (MR-078…081):** 207 ran the whole `public` project (141) ✓; 208 changed a component on every page and
ran the whole `authenticated` project (201) ✓; 209 changed `lib/analytics.ts` and ran the whole `public` project plus
the dashboard directory (107), not the whole `authenticated` project; this review ran it (201). The MR-080 stored-format
bullet did not fire in its Limits line for 209's property change (it is a stored JSON shape); §4.2 answers it.

**Directory saturation:** `lib/posthog-privacy.ts` (207, 209), `e2e/public/analytics-consent.spec.ts` (207);
`components/AppShell.tsx` (208; also 202 and 205), `e2e/app/page-width.spec.ts` (208); `lib/analytics.ts`,
`components/dashboard-v2/WorkflowListFilterBar.tsx`, `app/(app)/dashboard/page.tsx` (209). Clean. **Area** rolling five
(205-209): a11y, privacy, privacy, a11y, privacy: **privacy 3 of 5, so a privacy row at 210 takes the −2 saturation
penalty**.

**MR-081 annotations:** closure notes #407/#409/#405 and appends #382/#408/#28/#45/#61 are present; #61 and #60 are
`blocked`; the `PERSISTENCE_SCHEMA.md` §3 bullet is applied; #410 was filed verbatim.

**"Undeployed: N loops"** is in all three Controls blocks (56, 57, 58); Extension 164-166.

**Primary-file and validation lines:** present in all three (exit codes, "no Errors line", e2e counts, port check).
Sixteenth consecutive window.

**Density / follow-ups:** none filed by loops; no trigger.

**Ratio, loops 200-209** (same method as MR-069…081: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #401 (200), #404 (201), #403 (202), #103 (203), #407 (204), #409 (205), #405 (206), #410 (207), #408 (208), #389 (209) |
| Created | 8 | MR-079 #403-#405, loop 203 #406, MR-080 #407-#409, MR-081 #410 |
| Ratio | **1.25** | above the ≥ 0.5 floor |

This review files four rows: **125 open** after it.

**D-1.** Last extension touch `871e29a`: **166 loops** at 209, zero commits under the extension surfaces since. Still
unanswered.

**Staleness (next oldest open non-blocked rows not checked since MR-070), at `b477e14`:**

| Row | Score | Check | Verdict |
|---|---|---|---|
| #17 | 8 | `api/upload/route.ts` (`db.upload.create` :105, `db.workflow.create` :235) and `api/sync/route.ts` (:130, :243) still repeat the persistence block; `lib/ingestion.ts` exports validation, processing and rendering only | **keep; true** (validator: oldest open non-blocked row) |
| #38 | 7 | `lib/stripe.ts:155` `APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'` unchanged | **keep; true** |
| #44 | 6 | `DashboardV2Shell.tsx:390` still requests `/api/workflows?sort=health_score&dir=asc`; the route's sort map (`route.ts:417-424`) has no `health_score`, so it falls back to `createdAt` | **keep; true** |

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **79 ahead** at `b477e14` (80 once this review is committed); loops 152-209 (58) are not in production. The whole deploy gate passes locally; the push is rollback-safe (§4.2). Nothing blocks it |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (latest `37171882884`), `Alerts heartbeat` (`37126465679`), `Retention purge` (`37112966310`) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (166 loops) |
| #399 | Consent scope | unchanged |
| — | Stored data | `AnalyticsEvent` rows with `/share/<token>`, and with typed tag names and system names (production writes these until the push): delete or redact; rotate live links or not; proxy logs |
| — | `analytics` agent tooling | add Bash to `analytics.md`, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| #278 | PostHog key | **code-ready (§4.3).** Decide the PostHog project region, "discard client IP data" / GeoIP and retention (N3 needs them); then, after the push and N1, set `NEXT_PUBLIC_POSTHOG_KEY` (and host) and rebuild. Never with production's current code; a rollback past `a22010c` unsets it first |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

**PostHog readiness (probed).** Payload: clean end to end (§4.3). Remaining: the push, the CEO's project settings,
N3, #399, the stored-data decision, N1 (recommended), then the key.

**CI time.** Local: public 7.2 min, api 0.4, authenticated 10.6: about **18.2 min** (was 20.0). The last CI run of the
job took 11 min 9 s against `timeout-minutes: 30` (`retries: 2`); watch the first run after the push.

---

## 7. Patterns

1. **The privacy run converged on content and moved to identity and disclosure.** The end-to-end walk found no
   user content in any body. What remains comes from the library and the PostHog project, not from our events: the
   device id across accounts (N1), device data, IP and region (N3). The next privacy work is a small identity fix,
   settings and one sentence, not more sanitizing.
2. **Each guard caught the shapes its author pictured and nothing else.** 207's unit guard fails on a new key and an
   unmasked click id, but its e2e half cannot see a new key; 209's guard kills every flat string shape and misses
   objects, `Record`s, index signatures and casts. A guard is only as wide as its mutants. §9 extends the MR-079
   practice bullet: show a guard failing on each shape it claims.
3. **The push and the key are now coupled.** Stored data is rollback-safe, but production's PostHog config is the
   unsafe one, so the key must follow the push and leave before any rollback. §9 puts that rule in the analytics
   architecture status line, where the next person setting the key will read it.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-081 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `b477e14`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | #85, #106, #114, #137, #174 | 11 | audit | not re-scored since intake; MR-083 to re-score | cool-off only (3/3) since MR-067 |
| 2 | #381, #377 | 10 | follow-up | true; unchanged (#377 needs the theme-token scope, MR-074) | — |
| 4 | **N1** sign-out keeps the device id | 9 | follow-up | true (dormant until the key) | §4.3 |
| 4 | #402, #406, #396 | 9 | follow-up | unchanged (#396 after #381) | — |
| 4 | **N3** privacy section 9 omits device data, IP, region | 9 | follow-up | true; awaits the CEO's project settings | §4.3 |
| 8 | **N2** demo report events, **N4** guard shapes | 8 | follow-up | true | §4.1, §4.3 |
| 8 | #393, #382, #223, #98 | 8 | follow-up / audit | unchanged | — |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Signing out keeps PostHog's device id, so the next account used in the same browser is linked to the previous one, and the first page view after sign-out is still sent under the old account id.** MR-082 §4.3. Measured with posthog-js 1.367.0, the production buildPostHogConfig and the e2e stub key, consent full: an anonymous visit, signup of account A, sign-out, sign-in as account B. Every event of the visit, of A and of B carries the same `$device_id`, and the /login `$pageview` after each sign-out carries distinct_id = the account that just signed out (`$is_identified` true); the next event has a fresh anonymous distinct_id. Cause: sign-out reaches PostHog only through `useAnalyticsIdentity` once the next page sees an unauthenticated session, after `PostHogProvider` has sent the `$pageview`, and `resetAnalyticsUser` calls `posthog.reset()` without `true`, which keeps `$device_id` (Decline uses `reset(true)` since #400). Privacy section 9 promises the account id only, which stays true, but on a shared computer PostHog can join two people's activity by device id, and that cannot be undone once sent. Dormant until the browser key is set (#278). Fix as one outcome: in the Sign out handler reset PostHog with a new device id before `signOut` navigates, and make `resetAnalyticsUser` use `reset(true)`; a visitor who never signed in is still never reset. Tests: an integration test with real posthog-js (identify A, sign-out reset, identify B gives two different `$device_id` values); an e2e that the first `$pageview` after sign-out has a non-account distinct_id and a new `$device_id`. Run the whole public and authenticated projects (Step 7). Follow-up of loop 209 (#389). | fix | analytics / privacy | `security-reviewer` | 2 | 4 | 1 | 5 | 1 | 2 | **9** |
| **N2** | **The /product page's demo report sends `report_viewed`, `report_section_viewed` and the other report events with the demo workflow id, as if the visitor had opened their own report.** MR-082 §4.3. Measured: an anonymous visitor on /product sends `report_viewed` with workflowId `8a7f3a48-3b9a-4790-92a4-6ba5ce59db08` (`components/demo/fixtures/demoReportWorkflow.json`), runCount 16, sectionCount 20, to PostHog and to our `AnalyticsEvent` table. `DemoAnnotatedReport` renders `WorkflowReportPage`, whose seven `track` calls have no demo switch. No reader uses report events today (`analytics-event-names.WRITERS_READERS.md`), so no number is wrong yet, but any report-engagement metric will count marketing views of the demo as product use. Fix as one outcome: an analytics switch on `WorkflowReportPage` (off, or tagging events `surface: 'demo'`) set by `DemoAnnotatedReport`. Tests: a component test that the demo mount sends no report event (or only demo-tagged ones); an e2e on /product asserting no `report_viewed` in the first-party body. Run the whole public project (Step 7). Follow-up of loop 209 (#389). | fix | analytics | `frontend-engineer` | 1 | 3 | 1 | 5 | 1 | 1 | **8** |
| **N3** | **Privacy section 9 does not say that PostHog also receives browser, operating system, screen, language, time zone and the full user-agent string, nor that PostHog sees the IP address (and, unless the project discards it, stores it and derives a location), nor where PostHog stores the data.** MR-082 §4.3. Measured with posthog-js 1.367.0 and the production config: every event carries `$raw_user_agent`, `$browser`, `$os`, `$screen_width`, `$screen_height`, `$browser_language`, `$timezone`; no body carries `$ip` or `$geoip_*`, so IP and location handling is a PostHog project setting, and the default host is `us.i.posthog.com` (`lib/posthog.ts`). Section 9 says only that PostHog 'receives page views and named product events'. Awaits the CEO's PostHog project settings (region, discard client IP data, GeoIP, retention). Fix as one outcome after that decision: one sentence in the PostHog paragraph naming the device data, the IP handling and the storage region as configured, read by `growth-strategist` (D-4); a test in `analytics-consent.spec.ts` that the paragraph names them. A precondition for the browser key (#278). Follow-up of loop 209 (#389). | fix | privacy / copy | `security-reviewer` + `growth-strategist` | 2 | 4 | 1 | 4 | 1 | 1 | **9** |
| **N4** | **The analytics payload guard (loop 209) does not see a free-text string inside a nested object, a `Record` or an index signature, nor payloads passed through a cast.** MR-082 §4.1. Mutants on `lib/analytics.ts`: a new `note: string`, an optional `comment?: string`, `labels: string[]`, a template-literal type and re-adding `tagName` each fail the guard; `meta: { note: string }`, `extra: Record<string, string>` and `[k: string]: unknown` each pass it. `signup_completed` already has an index signature (it spreads the first-touch record), `TrackedLink` passes `properties: Record<string, unknown>` through `as AnalyticsEvent`, and `trackActivation` spreads `metadata` through `as any`; today's call sites are bounded (checked), but the guard cannot see them. Fix as one outcome in `analytics-payload-guard.test.ts`: recurse into object-typed properties; fail on an index signature or `Record` unless the event is on a short allowlist with a reason (`signup_completed`: sanitized first-touch keys); add a source scan that fails on `as any` or `as AnalyticsEvent` inside a `track(` argument outside an allowlisted file list; narrow `TrackedLink`'s `properties` to the named event's own property type. Mutation proof for each shape. Follow-up of loop 209 (#389). | fix | analytics / privacy | `security-reviewer` | 1 | 3 | 1 | 5 | 1 | 1 | **8** |

**Annotations recommended:**
- **#410 closure note:** "[MR-082: holds. In an end-to-end session gad_source arrives at 64 characters in every form (properties, $session_entry_, $set_once bare and $initial_) and mc_cid with an email is in no body. Simulated upgrades: adding a key to posthog-js's CAMPAIGN_PARAMS, or removing _kx from its masked list, fails the unit guard; adding utm_id passes, as it should. The guard reads lib/src/utils/event-utils.js while the browser runs dist/module.js; both hold the same 24 keys in 1.367.0. The e2e half cannot see a key added by an upgrade (its landing URL is written by hand), so only the unit guard catches one.]"
- **#408 closure note:** "[MR-082: holds. At 375 px on /account: Enter opens the menu with focus on Workflows; the accessibility tree is navigation Primary with 7 named links, theme, Documentation and Sign out; Tab past Sign out closes it; Escape closes and returns focus to the toggle; Shift+Tab to the toggle keeps it open and on to the logo closes it; a button inside the panel keeps it open; header axe with the menu open is clean in both themes. At 640, 1024 and 1280 px the toggle is hidden, one link has aria-current and the Tab order is unchanged. On the current page's link the menu closes but focus drops to body (the next Tab continues into the content); returning it to the toggle would be tidier.]"
- **#389 closure note:** "[MR-082: holds. In an end-to-end session with real posthog-js (34 bodies, 63 events) no email, name, workflow title, tag text, system name, view name, page title, share token or query string reached PostHog; tag_created carries tagNameLength and the systems filter added or removed, in PostHog and our own table. The TS guard kills 5 of 5 flat string mutants (new, optional, array, template literal, tagName re-added) but passes a nested object, a Record and an index signature, and casts bypass it (TrackedLink, trackActivation): N4. The allowlist holds all 48 string property names of the union plus event; 14 emit sites checked carry no user text. Rollback-safe: no production reader parses tagName or filterValue.]"
- **#278 append:** "(MR-082) The payload is clean end to end with the production config (MR-082 §4.3). Do not set NEXT_PUBLIC_POSTHOG_KEY before the push: origin/main has autocapture on, mask_all_text false and no before_send. Order: push; confirm the deployed commit is at or after b477e14; choose the PostHog project region, discard client IP data / GeoIP and retention; the privacy sentence (N3); N1; then set the key and host and rebuild (NEXT_PUBLIC_ values are inlined at build time). A rollback to a commit before a22010c must unset the key first."
- **#17 append:** "(MR-082) Still true at b477e14: api/upload/route.ts (db.upload.create :105, db.workflow.create :235) and api/sync/route.ts (:130, :243) repeat the persistence block; lib/ingestion.ts exports validation, processing and rendering only."
- **#38 append:** "(MR-082) Still true at b477e14: lib/stripe.ts:155 APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'."
- **#44 append:** "(MR-082) Still true at b477e14: DashboardV2Shell.tsx:390 requests sort=health_score, which the route's sort map (route.ts:417-424) does not handle, so it falls back to createdAt."
- **`docs/ANALYTICS_ARCHITECTURE.md`, line 5, replace the whole line that begins** `**Status:** Draft, partly superseded.` **with:** "**Status:** Draft, partly superseded. Server-side events are not sent to PostHog (row #404, loop 201): `trackServer` writes only the `AnalyticsEvent` row, `posthog-node` and `lib/posthog-server.ts` were removed, and `POSTHOG_API_KEY` is unused. Sections 3.2 (the PostHog server SDK), 6.3 (server-side events), 9.3 and Phase 1 task 1b describe that removed design; do not re-add it without a server-side consent record (#399). **Browser key:** set `NEXT_PUBLIC_POSTHOG_KEY` only on a build at or after commit `b477e14` (the privacy filter, autocapture off, localStorage persistence); production before the push has autocapture on and no `before_send`. A rollback to a commit before `a22010c` must unset the key first (MR-082)."
- **`.claude/agents/coordinator.md`, Step 7, replace the whole bullet that begins** `- when the loop fixes one instance of a defect class` **with:** "- when the loop fixes one instance of a defect class (one page that overflows, one path that sends data to a third party, one control that loses focus), its test covers the whole class (every route in a constant list, every call site that sends data out) or the Limits line names each member it does not cover (MR-079); a guard that reads a list or a type to cover a class is shown failing on a mutant of each shape it claims, and the Limits line names the shapes it does not inspect (MR-082)"

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 gad_source capped and mc_cid absent end to end; upgrade guard fails on G1, G2; control G3 passes | #410 note |
| §2 guard reads lib/src, browser runs dist; same 24 keys | #410 note |
| §2 the e2e half cannot see a new key | #410 note |
| §3 keyboard pass and accessibility tree at 375 px; desktop unchanged at 640-1280 | #408 note |
| §3 focus to body after the current page's link | #408 note |
| §3 contrast hit mid-transition; settled scans clean | none (not a defect) |
| §4.1 guard kills flat shapes; misses object, Record, index signature, casts | #389 note; N4 |
| §4.1 allowlist complete; 14 emit sites bounded | #389 note |
| §4.2 no production reader of tagName or filterValue; rollback-safe | #389 note; CEO item 1 |
| §4.2 production writes tag and system names to our table until the push | CEO stored-data item |
| §4.3 no content in any PostHog body; Decline sends nothing; Accept starts fresh | #389 note; #278 append |
| §4.3 production's PostHog config unsafe; key after push, unset before rollback | #278 append; doc text (§9) |
| §4.3 device id survives sign-out; /login page view under the old account | N1 |
| §4.3 /product demo report sends report events | N2 |
| §4.3 device data, IP, region not disclosed | N3; #278 append |
| §4.3 doubled events in dev | not judged (needs a production build) |
| §6 score-11 audit rows never re-scored | MR-083 agenda |
| §6 staleness #17, #38, #44 keep | #17, #38, #44 appends |
| §7 guards cover only the shapes pictured | coordinator Step 7 text (§9) |

---

## 11. Loop 210-212 picks

**The push is unblocked and is now the gate for the key.** The whole deploy gate is green locally at `b477e14`, and
the push is rollback-safe (§4.2). 58 loops are undeployed. Also `CRON_SECRET` and the job URLs (item 4), D-1 (item
21), #399, the stored-data decision, and the PostHog project settings (N3).

Pool 121 + 4 = 125 > 8. The cool-off is **3/3**. **Hold it** for one more window: MR-083 re-scores the five audit rows
first, so the charge is spent on a verified 11, not an intake estimate. The privacy code run is complete, so rotate:
all three picks are `burn-down`.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **210** | **#381** save on leave (keepalive PUT, size guard, `confirmedColumns`) | **10** | `burn-down` (follow-up of the #379 note) | `frontend-engineer` | dashboard / persistence | highest follow-up; unblocks #396 and #382; rotates off privacy (3 of 5) |
| **211** | **#402** the reopened consent banner takes and returns focus | **9** | `burn-down` (follow-up of MR-078) | `frontend-engineer` | web-app / a11y | small; lands with the push and the key; a11y |
| **212** | **N1** sign-out resets PostHog with a new device id, before the page view | **9** | `burn-down` (follow-up of 209) | `security-reviewer` | analytics / privacy | recommended before the key; privacy is back to 1 of 5 by 212, no penalty |

- **Cool-off:** stays 3/3 through 212; MR-083 re-scores #85, #106, #114, #137, #174 from the code.
- **Then MR-083** (base cadence after 212), then **#406**, **#396** (after #381), **N4**, **N2**, **#377** with theme
  tokens, #223, #382 after #381 (with the 409 handling in its #382 append), **N3** once the CEO sets the PostHog
  project, #393 if Umami is wanted.
- **Area check:** 210 dashboard, 211 a11y, 212 privacy.
- **Agents:** `frontend-engineer` × 2 → `security-reviewer`; no 4+ run.
- **D-4:** #381 adds an unsaved-columns status; if it touches 3 or more strings, a short `growth-strategist` read; #402
  and N1 change no copy.
- **Do not pick:** #396 before #381; #382 before #381; #377 as written (theme tokens per MR-074); N3 before the CEO's
  PostHog settings; #89, #91 (Path C); #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without
  the D-1 answer; #393 while the CEO has not said Umami is wanted; #399 (CEO); #60 (architecture); #45 (icon decision);
  #61 (production data); any implementation row with a tool-less primary.
- **Practice:** the full deploy gate every review and whole projects on shared plumbing (Step 7); fix and test the
  class; a guard is shown failing on each shape it claims; a stored-format change says what production does with it;
  annotations are final text.

---

## 12. Verdict

Every count reproduces at `b477e14`: root 6516, web-app 4748 (both exit 0, no Errors line), typecheck 0, validator
clean (open 121), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **141 + 14 + 201 (2 skipped)**. 7 of 11 mutants killed; the three real survivors are N4.

- **Loop 207 holds:** the upgrade guard fails on a new key and on an unmasked click id; the e2e half cannot see an
  upgrade (note).
- **Loop 208 holds:** keyboard and accessibility-tree pass at 375 px; desktop unchanged; focus after the current
  page's link drops to body (note).
- **Loop 209 holds, and the push stays rollback-safe:** no production reader of the changed properties. The guard
  misses nested, `Record`, index-signature and cast shapes (N4, 8).
- **PostHog: the code is ready, the deployment is not.** No user content in any body across a full session. Set the
  key only after the push, the CEO's project settings and N3, with N1 first; never on production's current code.
  Two new rows from the walk: N1 (9), N2 (8).

Selection was sound, the cool-off is held (3/3), ratio 1.25. Asks for the CEO: **push now**; then PostHog project
settings (region, IP, GeoIP, retention) and the key in that order; configure `CRON_SECRET` and the job URLs; answer D-1
and #399; decide stored data (share tokens, tag and system names), Umami and the `analytics` agent's tools. For the
coordinator: #381, #402, N1; the four rows; the `ANALYTICS_ARCHITECTURE.md` status line and the Step 7 bullet; MR-083
re-scores the audit rows.

### Appendix — reproducing

```sh
S=<scratchpad>
pnpm install --frozen-lockfile --offline                                           # exit 0
node scripts/validate-backlog.mjs                                                  # exit 0, open 121
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6516 / 4748 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 141 passed (7.2 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 201 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
(cd apps/web-app && node $S/mut082/phguard.mjs)                                    # G1, G2 fail the guard; G3 passes; file identical
(cd apps/web-app && node $S/mut082/tsguard.mjs)                                    # T1-T5 killed, T6-T9 pass; file identical
node $S/listprops082.cjs                                                           # 48 string props + event; signup_completed index signature
git show origin/main:apps/web-app/src/lib/posthog.ts | sed -n 40,62p              # autocapture default, no before_send
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && pnpm exec playwright test -c $S/probe082.config.ts --project=probe-session)  # S1, 34 bodies
node $S/inventory082.mjs; node $S/detail082.mjs                                    # inventory, needles, identity
(cd apps/web-app && pnpm exec playwright test -c $S/probe082.config.ts --project=probe-menu)     # M1-M7, D1-D3, contrast detail
gh run list --limit 10; gh secret list                    # CRON_SECRET absent; last deploy 37088974348
git log origin/main..main --oneline | wc -l               # 79
```
