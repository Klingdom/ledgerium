# MR-073 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 180-182, 2026-10-03 03:00 → 09:58 (−0600). Commits `20ec611` (loop 180, #379), `e1d0ca4`
(loop 181, #383), `49137a1` (loop 182, #378). Previous review MR-072 at `d6e9f32`. Rows closed: #379, #383, #378.
Rows filed by loops: #380, #381, #382, #383 (loop 180). Rows amended: #368, #376, #371 (loop 180). Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-072 (`ITERATION_LOG.md`, loop 182 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the design note or code, not even temporarily. No commit, no
`git add`. Every row, strike or annotation below is a recommendation for the coordinator. Scratch went only to
`…/scratchpad/`:
- `probe073.config.ts` + `probe073.spec.ts`: Playwright config outside the repo (MR-069…072 pattern: repo global setup
  and auth setup, dev server on port 3098), 6 lens probes against the real preferences API and the real dashboard
  (`probe073.raw1.txt` for A-C, `probe073.raw2.txt` for D-F). Probe F scales the 15 s abort to 1.5 s **in the page
  only** (init script mapping `setTimeout(…, 15000)` to 1500 ms); everything else runs on the real wall clock;
- `ph073/`: the installed posthog-js 1.367.0 in jsdom with the repo's own `buildPostHogConfig`, stubbed
  fetch/XHR/beacon, landing on `/share/<token>` with a referrer whose path holds an email (`ph073.txt`);
- `mut073/`: copies of `posthog-privacy.ts`, `posthog.ts` (import re-pointed to the copy), `lensPersistence.ts` and
  their unit and integration tests, mutated on the **copies** only (24 mutants, `mut073.txt`). Every copy was restored
  and `cmp`-checked against `mut073/orig/`;
- `val073.txt`, `guard073.txt`, `tc073.txt`, `root073.txt`, `web073.txt`, `e2e073.txt`, `status_before073.txt`: run
  outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing),
apart from this file. Every Playwright run started and stopped its own dev server; `netstat` shows nothing listening
on 3000, 3097 or 3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal). The probes seed the
test user's preferences in `beforeEach` and restore the snapshot in `afterAll` (`restore 200 views=0
cols-equal=true` in both runs; the user had 8 columns and 0 saved views before and after).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 182 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6371 | **311 files, 6371 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4551 | **257 files, 4551 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 376 rows, 252 struck, **open 124** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `saved-views-persistence.spec.ts` + `v2-a11y.spec.ts` | 36 passed (181) | **36 passed (2.8 min)**, #366's `test.fail` (`v2-a11y.spec.ts:772`) counted as an expected failure | matches |
| deltas | web 4540→4540→4543→4551; root 6360→6360→6363→6371 | 180 docs only, 181 +3, 182 +8 (6 unit + 2 integration) | consistent |

Pool arithmetic: MR-072 recorded 123. Loop 180 filed four and struck one (126), 181 struck one (125), 182 struck one:
**124**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader, PostHog with a real key and a real
remote config, mutation of `DashboardV2Shell.tsx` (no shell unit tests; the call-site mutants in §3 are judged against
the e2e by reading, and the behaviour is checked by probes A-F instead). The revert proofs in 181 and 182 are
agent-reported.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** The design note's citations match the
   code at `d6e9f32`; 181's lens rule held in every lens sequence I could build on the real API (rename, delete, apply
   view, apply preset, toggle-then-switch inside the debounce, a hung PUT across a lens switch); 182's config is what
   real posthog-js runs (autocapture off, cookie empty, only `/e/` requested).
2. **A save made before the preferences GET has answered destroys the user's saved views (§3, N1).** The sync state
   starts with `confirmed: []` and only `adoptServerList` on a successful GET fills it. With the GET slowed to 4 s
   (probe A, LSS lens) or answered 500 (probe B, library lens), creating one view sent `savedViews: ["Early"]`; the
   server replaced the user's two stored views with it. On the LSS lens the same PUT also wrote
   `DEFAULT_VISIBLE_KEYS` as the library pack, because `libraryColumnsRef` still holds its initial value. Not caused by
   181 (before it, the PUT carried the LSS pack: also wrong), and not in the design note's state machine.
3. **The share token still reaches PostHog through the URL path (§4, N2).** 182 strips queries and fragments, but
   `/share/<token>` is a path. With a key set and full consent, the token went out in `$current_url`, `$pathname`,
   `path`, `$session_entry_url`/`_pathname`, `$prev_pageview_pathname` and, as person properties, in
   `$initial_current_url`/`$initial_pathname`. The token is a bearer capability for a customer's workflow. So "#355 is
   the last known prerequisite" (182) is wrong for the second time running. An email in the referrer's **path** also
   went out (`$referrer`). The explicit `token` property of `shared_workflow_viewed` is overwritten by PostHog's own
   `token` field (the project key), by accident, so that one does not leak.
4. **182's "kills MR-072 mutant P1" does not hold (§5).** Removing the URL-key branch again fails no test: every
   URL-key test value is also caught by the new value-shape regex. Untested too: `http://` (not `https://`) by value
   shape, a fragment-only relative URL, and the depth cap.
5. **The design note is sound but already stale in four places after 181 (§2, annotation),** and two of its follow-up
   rows need a lens clause: #380's reconcile must not adopt server columns into the visible pack on a lens, and #381's
   "unsent columns" test must compare persisted columns, not visible ones. #381's 60 KiB guard ignores that the
   keepalive quota is shared with the app's own `sendBeacon` analytics flush on the same page-hide.
6. **Ratio, loops 173-182: 0.83** (10 closed / 12 created, review-filed rows counted). Above the floor; down from 1.11
   because loop 180 filed four rows (justified, §2).
7. **Push is still the first CEO action:** `main` is **43 ahead**; last deploy still loop 151. Three scheduled
   workflows now fail for the same reason: `CRON_SECRET` and the URL variables are not configured, so alerts are not
   checked, alert channels are not tested, and **deleted workflows are not being purged** (`Retention purge`,
   `37112966310`).

---

## 2. Loop 180 — #379 the saved-views design note (`20ec611`): **HOLDS; stale in four places since 181**

**Diff vs log:** matches. One new file, `docs/features/dashboard-v3-metrics-engine/SAVED_VIEWS_DESIGN.md` (129 lines),
and the row/log/health edits. No code.

**§1-§2 accuracy (spot-checked at `d6e9f32`).** Route: body schema `:100-105`, keep-or-replace `:262-265`, the
non-atomic read then upsert `:249-276`, `filters` kept `:260`, server `createdAt` `:112-133`, and the column arrays
being uncapped at top level (`z.array(columnKeySchema)` without `.max`; 200 inside a view): all correct. Shell:
`saveDebounceRef :346`, `scheduleSave :513-525`, `pump(dueSave) :614`, abort `:540-544`, `settleTimeout` branch
`:574-576`, rollback message `:586-590`, "Saved" gate `:603-611`, unmount `:621-629`, `isMountedRef :356`: all correct.
Sync: `settleSuccess :111-124`, `settleFailure :132-144` (rollback only when `sent === pending` and `!dirty`),
`settleTimeout :155-164`: correct. ColumnPicker: focus effects `:454-475`, Escape `:500-505`, Cancel `:605` without
`shouldRestoreSaveFocusRef`, delete target `:520-531`, conditional live paragraphs `:785-797`: correct. The lens
contradiction (`:649`, `:682`, `:731-734`) was real; probe-confirmed by 181's revert proof.

**What the state machine misses.** There is no "baseline unknown" state: before the initial GET succeeds, `confirmed`
is `[]` and any saved-view change replaces the server list (§3, N1). The note's T-table starts at Idle as if the
baseline were always loaded.

**§3 decisions.**
- **(i) GET reconcile:** sound; rollback is wrong whenever the server applied, as MR-072 T2-500 showed. After 181 the
  adopt step must be lens-aware: put the server's columns into `libraryColumnsRef` and only into `visibleColumns` on
  the library lens (annotation to #380).
- **(ii) keepalive PUT, 60 KiB guard, `sendBeacon` rejected:** the 64 KiB figure is right (Fetch spec in-flight
  keepalive quota) and `sendBeacon` is POST-only, which is the real reason to reject it. The second reason given, that
  it "cannot carry a revision", is weak: (iii) puts `baseRevision` in the body. Two gaps: the quota is per page and
  shared, and `analytics.ts:1053` flushes the app's event buffer with `sendBeacon` on the same page-lifecycle events,
  so a 40 KiB preferences body can be refused after a large analytics flush; and the note marks the flush "sent"
  without awaiting, so a refused keepalive would be silent. Annotation to #381: catch the rejection, keep the state
  dirty, and lower the guard or flush preferences first. "#371's 256 KiB server cap is still correct" refers to a cap
  that does not exist yet (#371 is open); "planned" is the right word.
- **(iii) revision/409:** sound and correctly ordered last; ≈1 loop (E=3) is fair. Gap: `updateMany where {userId,
  revision}` cannot create the row, so the first save for a user with no row needs a create path (base 0) whose
  unique-violation race maps to 409 (annotation to #382).
- **(iv) no column-only rollback:** sound.

**§4 focus table.** Consistent with the code and the UX edits are coherent (persistent `role=status`/`role=alert`,
"Saving…" visual only, F0 falls back to the first row's Apply because a 10-view list is never empty). Two corrections:
the "view limit reached" row says "verify it exists; add if not": it exists (`ColumnPicker.tsx:612-615`, "Delete a view
to save another (max 10)."), so the proposed new wording would be a copy change, not an addition. And the row label
"Save form open, view limit (10) reached" cannot occur (the form's trigger is absent at the limit). Missing cell: create
/ rename / delete while the baseline is unknown (N1); the right answer is "controls disabled with a retry", which then
needs a focus target.

**§5 #368 plan.** Feasible. The FilterSet limit is accurately stated: `systems` returns an array and every
`FilterValue` kind requires a string or number (`filters.ts:267-297`), so a systems filter would always evaluate false;
`healthy` → `health_score gte 70` and `needs_review` → `lt 40` match `WorkflowList.tsx` (`score >= 70`, `score < 40`).
Over-conservative in one place: three insight chips map exactly (`opportunityTag_automate`, `opportunityTag_monitor`,
`healthScore_gte_70`), so "insight chips" need not all be refused. String count disagrees with #368's amendment: the
note says 2 (hint, chip prefix), the row says about 4 including the limit message "if missing" (it is not missing), and
the two hint wordings differ. The honest count is 3 (chip prefix, hint, "Applied view: {name}"), still ≥ 3, so the
`growth-strategist` adjacency stands. #368's line reference is now `:1530`, not `:1511`.

**Did 181 make the note stale?** Yes, in four places: §5 "applying a view keeps persisting columns only (`:693-699`)"
is now library-lens only; §6 N-D and §7 step 3 are done (#383); T1 now maps the queued columns through
`columnsToPersist`; and every shell line number after `:520` moved by about 10-19 lines. Recommend a one-paragraph
"Status after loop 181" note at the top (annotation, §9).

**Four rows filed: justified.** The row asked for "a list of the rows it changes or creates"; #380-#382 are the three
§3 decisions, each independently shippable and the reason the note exists; #383 was a pre-existing live data bug with a
code anchor, confirmed at 181 by a failing revert. `density-response: scope-guard-adjacent` with a per-row anchor is
the correct option (clause 4). The note scored N-D at 10 and the row at 11 (C 3 → 4 after confirmation); fine.

---

## 3. Loop 181 — #383 a lens stays a lens (`e1d0ca4`): **HOLDS; one older hole found next to it**

**Diff vs log:** matches. New pure `lensPersistence.ts` (27 LOC): `columnsToPersist` and `shouldPersistColumnEdit`.
`scheduleSave` maps the queued columns through `columnsToPersist(activeLensRef.current, nextVisible,
libraryColumnsRef.current)`; `handleToggleColumn`, `handleApplySavedView` and `handleApplyPreset` call `scheduleSave`
only on the library lens. Because the mapping happens when the save is queued, the 15 s re-send and the coalesced send
carry the columns that were right at queue time.

**Probes** (Chromium, real API, real wall clock; library pack seeded to 7 columns, one fewer than the default 8, plus
views Alpha and Beta):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| C | library: toggle a column; switch to LSS inside the 400 ms window; rename Alpha, delete Beta under LSS; back to library; reload | PUT #1 = toggled library pack (views omitted); #2 and #3 = toggled library pack with `["Alpha2","Beta"]`, then `["Alpha2"]`; back on library the toggle is shown; server and reload agree | ✓ no library edit lost, no lens pack written |
| D | LSS: apply saved view; apply preset "Automation Candidates"; delete Alpha | apply view: 0 PUTs, LSS stays; preset: 0 PUTs, LSS stays; delete: one PUT with the library pack and `["Beta"]`; server library unchanged | ✓ |
| E | library: apply view V (3 columns); switch to LSS; create a view | PUT #1 = V (views omitted); #2 = V with `["Vee","OnLens"]`; server library = V | ✓ `libraryColumnsRef` correct (the lens switch snapshots it) |
| F | LSS: create a view whose PUT hangs; switch to library and toggle before the 1.5 s abort | PUT #1 (hung) = library pack + `["Alpha","Beta","Hung"]`; re-send = toggled library pack + same views; server = toggled pack, three views | ✓ re-send carries the newer library edit |
| A | reload with LSS stored; the preferences GET held 4 s; open the drawer and create "Early" before it answers | the drawer shows 0 views; PUT = **8 default columns** + **`["Early"]`**; server ends with `["Early"]` and the default pack; Alpha and Beta are gone, and the late GET then shows only "Early" | **data loss (N1)** |
| B | library lens; the preferences GET answered 500; create "AfterFail" | PUT = 8 default columns + `["AfterFail"]`; server views `["AfterFail"]` | **data loss (N1)** |

**Is `libraryColumnsRef` right on the library lens when a saved view is applied?** It is not updated there
(`handleApplySavedView` does not touch it; only `handleToggleColumn` does), but it is never read on the library lens
(`columnsToPersist` returns the visible columns), and `handleLensChange` snapshots `visibleColumns` into it when the
user leaves the library lens (`DashboardV2Shell.tsx:763-764`). Probe E confirms. The only way it is wrong is the one in
A: before the GET has answered, it still holds `DEFAULT_VISIBLE_KEYS`.

**Why A and B happen.** `createSyncState()` starts with `confirmed: []`; `loadPreferences` swallows a non-2xx GET and
a network error (`:480-505`); nothing marks the baseline as unknown, so `handleSavedViewsChange` builds the new list on
an empty UI list and the whole-list replace removes everything else. On the library lens with a failed GET the user
at least sees the default columns, but the stored views are invisible and deleted silently. A slow GET (cold start)
is enough; a failed one makes it permanent for the session. Neither the note nor any row covers it.

**Call-site mutants (by reading the e2e; the shell was not mutated):**
- remove the backstop in `scheduleSave`: the e2e's create PUT carries the LSS pack (`expect(puts[0].visibleColumns)
  .toEqual(original.visibleColumns)` fails): killed;
- remove the guard in `handleToggleColumn`: the toggle sends a PUT (with the library pack, via the backstop), and
  `expect(puts).toHaveLength(0)` fails: killed;
- remove the guard in `handleApplySavedView` or in `handleApplyPreset`: **survive** (no e2e or unit test applies a
  view or a preset under a lens). Effect: one extra PUT carrying the library pack; no data harm, because the backstop
  still holds. 181's limits say so.

**Helper mutants:** `columnsToPersist` always visible, always library, `shouldPersistColumnEdit` always true: each
killed by the three unit tests.

**Limits accuracy.** Accurate. "There is no component test of the shell call sites" is the reason two guards survive.

---

## 4. Loop 182 — #378 PostHog, closed at every door found (`49137a1`): **HOLDS for the row; the path door remains**

**Diff vs log:** matches. `autocapture: false` with both masks as backup; `persistence: 'localStorage'`;
`sanitizePostHogEvent` now recurses (nested objects, arrays, `properties.$set`/`$set_once`, event-level ones), strips
query and fragment by value shape (absolute `http(s)`, root-relative, protocol-relative) and under URL-named keys,
applies `sanitizeUtm` at any depth, drops cycles and depth ≥ 12, and leaves non-plain objects alone. A grep for
`$autocapture` readers finds none, as stated.

**Probe** (`ph073.test.ts`: real posthog-js 1.367.0 in jsdom, `buildPostHogConfig` unmodified, landing
`/share/shrTOKEN9f8e7d6c5b4a?utm_source=newsletter&utm_term=john%40example.com`, `document.referrer =
https://mail.example/inbox/john@example.com?u=john%40example.com`; then what `PostHogProvider` and `track()` send on a
share page, a client navigation to `/signup`, `register`, `identify`, and a page hide):

| Path | What reached the wire | Verdict |
|---|---|---|
| effective config | `autocapture: false`, `persistence: 'localStorage'`, `disable_session_recording: true`, `advanced_disable_flags: true`, `capture_pageleave: true`, `save_referrer: true` | as designed |
| requests made | only `/e/` (no `/flags`, no remote config, no surveys or heatmaps endpoint) | ✓ |
| extensions | heatmaps, dead clicks, exception autocapture, web vitals, surveys, replay: all inactive (remote config never loads) | ✓ |
| `document.cookie` | `""` | ✓ |
| queries anywhere (`?` in any value) | none, in every event | ✓ |
| `$pageview` / custom events on `/share/<token>` | token in **`$current_url`, `$pathname`, `path`, `$session_entry_url`, `$session_entry_pathname`** | **leak (N2)** |
| `$pageview` on `/signup` after it | **`$prev_pageview_pathname: /share/<token>`**; `$session_entry_*` still carry it on every later event in the session | **leak (N2)** |
| `$identify` | `$set_once` **`$initial_current_url` / `$initial_pathname` = the share URL** (person properties: kept forever) | **leak (N2)** |
| `$pageleave` | sent (`capture_pageleave: true`), sanitized; carries `$session_entry_*` with the token | covered by N2 |
| `$referrer` | `https://mail.example/inbox/john@example.com` (query stripped, **email in the path kept**) | **gap (N2)** |
| `shared_workflow_viewed` `{ token }` | `properties.token` = `phc_probe`: PostHog overwrites `token` with the project key | not a leak (by accident) |
| `register({ sup_url: '…?e=…' })` | stripped on every later event | ✓ |
| `identify('john@example.com', { email })` | `distinct_id` and `$set.email` = the email | #355 part (4), known |
| localStorage | `$initial_person_info.r` and `.u` raw (query and path) | device-local; 182's limit is accurate; its `u` and `r` are what `$initial_*` sends, sanitized for queries, not paths |

**Is the share token sensitive?** Yes. `/api/share/[token]` serves the workflow to anyone holding the token
(`route.ts:12-20`); it is a capability, the same thing MR-072 called out in `attr__href`. 182's limits do say "PII in URL
paths is not redacted", so the gap was stated; the conclusion "the last *known* prerequisite is #355" is what does not
follow, because the app's own share route is a known path token. Fix shape: in `before_send`, rewrite any value
(URL-keyed or URL-shaped, and `$pathname`/`path`/`*_pathname`) whose path starts with `/share/` to `/share/[token]`,
and replace email-shaped path segments in any URL (`$referrer`, `$initial_referrer`) with `[email]`. Dormant (no key,
consent-gated).

**Other doors asked about:** `$pageview` is sent once per route by `PostHogProvider` (`capture_pageview: false`
holds); `$pageleave` is on and goes through the hook; `$initial_person_info` is not sent as-is, only through the
`$initial_*` person properties above; session replay, surveys, heatmaps, dead clicks, exceptions and web vitals are off
in 1.367.0 because every one of them waits for remote config, which `advanced_disable_flags` suppresses (MR-072
verified the guard). That is a version-sensitive dependency: a posthog-js upgrade that ships any of them as a local
default would bypass it. N2's tests should assert the extension flags stay false.

---

## 5. Mutation summary (copies in `mut073/`, never the repo)

| Mutant | Tests | Result |
|---|---|---|
| Q0 baseline | unit + integration | 34/34 pass |
| Q1 `MAX_DEPTH` 12 → 2 | unit + integration | **survives** (over-drop, privacy-safe; depth not tested) |
| Q2 no depth cap | unit + integration | **survives** (cycles still guarded) |
| Q3 no cycle guard | unit + integration | 1 fail |
| Q4 no protocol-relative | unit + integration | 1 fail |
| Q5 no relative-URL branch | unit + integration | 4 fail |
| Q6 arrays not recursed | unit + integration | 3 fail |
| Q7 any object treated as plain | unit + integration | 1 fail |
| Q8 DROP symbol pushed into arrays | unit + integration | **survives** (array cycle untested; serializes as `null`) |
| Q9 `https` only, not `http` | unit + integration | **survives** (kill: `{ link: 'http://x.test/p?e=a@b.c' }` → `http://x.test/p`) |
| Q10 relative regex allows spaces | unit + integration | **survives** (over-strip of prose starting with `/`) |
| Q11 URL-key regex unanchored | unit + integration | **survives** (harmless widening) |
| Q12 / **Q20** URL-key branch never fires (= MR-072 P1) | unit + integration | **survives** (kill: `{ page_url: 'app.test/p?e=a@b.c' }`, a schemeless value under a URL key) |
| Q13 utm sanitized at top level only | unit + integration | 1 fail |
| Q14 event-level `$set_once` dropped | unit + integration | 2 fail |
| Q15 autocapture back on | integration | 2 fail |
| Q16 masks off | integration | 1 fail |
| Q17 cookie persistence | integration | 2 fail |
| Q18 `before_send` removed | integration | 3 fail |
| Q19 relative regex: `?` only, not `#` | unit + integration | **survives** (kill: `{ next: '/a#e=a@b.c' }` → `/a`) |
| L1 `columnsToPersist` always visible | lensPersistence | 1 fail |
| L2 `columnsToPersist` always library | lensPersistence | 1 fail |
| L3 `shouldPersistColumnEdit` always true | lensPersistence | 1 fail |
| shell: no backstop / no toggle guard | e2e (by reading) | killed |
| shell: no apply-view guard / no apply-preset guard | e2e (by reading) | **survive** (harmless extra PUT) |

The config mutants are all killed, which is the part that matters most. The survivors that could let something out
are Q9, Q12/Q20 and Q19; they go into N2's tests.

---

## 6. Governance

**Selection.**
- **180** `burn-down` #379 (12), MR-072's first pick, `system-architect` + `ux-designer` as the row asked. ✓
- **181** `burn-down` #383 (11; tied with #378 and #380). **Departure from MR-072's order (#378 at 181) and from the
  note's order (#376 first).** Rationale logged: #383 overwrote real users' library layout on every lens edit, #378 was
  dormant (no key) and #376 is focus polish. Sound: equal score, live harm beats dormant harm, and the note itself put
  #383 before #368 because it touches the same callers. The departure was logged with its reason, which is what the
  selection policy asks. ✓
- **182** `burn-down` #378 (11), `security-reviewer`. MR-072 planned the cool-off on #113 here. Not spending it was
  correct: an 11 follow-up (#378, also #380) was still open, so `top-score` via the cool-off would have bought nothing
  and produced no formula evidence (MR-004 Change B logic; MR-072 §11 said "do not spend the cool-off while an 11 or 12
  follow-up exists"). ✓

**The cool-off has now been armed for 10 loops (since 172) without use,** because every review keeps filing 11s.
That is the rule working, not failing, but it means the audit 11s (#113, #96, #103, #106, #114, #137, #174) have no
path in while reviews feed the follow-up pool. Watch item for MR-074: if it is still unspent after 185, spend it on
#113 the first time the top follow-up is 10.

**Agents / Area.** 180 `system-architect` + `ux-designer` (web-app / dashboard, docs), 181 `frontend-engineer`
(web-app / dashboard), 182 `security-reviewer` (analytics / privacy). No agent twice in a row; no Area three in a row.
D-4 clause 1: no copy changed. Clause 2: `lensPersistence.ts` 27 LOC; `posthog-privacy.ts` ~100 LOC; both under 200.

**Primary-file line:** present in all three entries (MR-072's practice adopted). `DashboardV2Shell.tsx` was the
primary file at 177 and 181; `dashboard-v2/` was the primary surface at 174, 175, 177 and 181 (4 of the last 8). Keep
the line.

**Density / follow-ups:** 180 filed four with `density-response: scope-guard-adjacent` and an anchor per row (§2,
justified); 181 and 182 filed none.

**Ratio, loops 173-182** (same method as MR-069…072: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #370 (173), #373 (174), #372 (175), #362 (176), #374 (177), #375 (178), #365 (179), #379 (180), #383 (181), #378 (182) |
| Created | 12 | MR-070 #372-#373 (filed after 173), MR-071 #374-#376, MR-072 #378-#379, loop 179 #377, loop 180 #380-#383 |
| Ratio | **0.83** | above the ≥ 0.5 floor. From the canonical Follow-ups lines alone: 10 / 5 = 2.0 |

This review files two rows; if 183-185 close two, window 176-185 reads about 0.9.

**Validation line:** "validator 0; guard runner 142/142" in all three entries; 181 has the named e2e run with "no port
3098 listener"; 180 changed no code and 182's surface has no e2e (its integration test runs in the root and web-app
suites). Seventh consecutive window.

**D-1.** Last extension touch `871e29a`: **139 loops** at 182. "User-ack outstanding" logged every loop; extension
changes stay frozen under MR-064's CEO gate. Expected.

**Staleness (open rows far past the 10-loop cap).** The validator reports the oldest open non-blocked row as #17
(iter 001, about 280 loops). Verdicts for the oldest few, checked at `49137a1`:

| Row | Score | Born | Check | Verdict |
|---|---|---|---|---|
| #12 | 11 | iter 001 | blocked on a CEO deploy decision | **keep** (CEO queue; not selectable) |
| #13 | 10 | iter 001 | CEO-blocked at MR-064 (extension UX) | **keep** (CEO gate) |
| #17 | 9 | iter 001 | the "re-score pending rewrite" note from MR-064 is still unresolved nine reviews later; `upload/route.ts` (350 lines) and `sync/route.ts` (328) still differ in 560 diff lines but share the persistence block | **rewrite or downgrade**: one-sentence scope ("move the shared persistence block into `lib/ingestion.ts`"), re-score E; otherwise downgrade to 7 |
| #28 | 7 | M3@012 | `billing/portal/route.ts:24` returns 400 "No billing account found"; whether the UI offers a contact-support path is unverified | **keep** at 7 (true; low) |
| #29 | 9 | iter 013 | `pnpm --filter @ledgerium/segmentation-engine test` still prints "No test files found" and exits **0** (a silent false green for anyone running one package) | **keep** (still true; the exit-0 makes it a little worse than "inconvenient") |

Pool-level cold-pool triage remains deferred on the CEO's P-1 ruling (`SYSTEM_HEALTH.md:12`); unchanged.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 43]`; every suite green at `49137a1`. Loops 152-182 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37120578937`), **`Alerts heartbeat`** (`37126465679`) and **`Retention purge`** (`37112966310`) all fail with "Secret CRON_SECRET is not configured" and the URL variable missing. The purge log says "Deleted workflows are NOT being purged" |
| #278 / #355 / **N2** | PostHog before a key | identity reset (#355) **and** path tokens (N2). 182 said #355 is the last known; it is not |
| #350 part 3, #351 item 5 | read production data | after the push |
| #225, #357, 19 / 21 / 22 / #347, P-1 | unchanged | |

---

## 7. Two patterns worth naming

**"The last blocker" has been wrong twice in a row.** 178 said #355 was the last PostHog blocker (MR-072 found
autocapture, nested values and the cookie); 182 said #355 is the last *known* one (this review finds path tokens). Each
claim was made from the doors the loop had just closed, not from a checklist of doors. Recommendation (practice, no
CLAUDE.md change): a privacy closure that states what remains must list what it probed, at minimum: config defaults
after `init`, every request URL, cookie and storage, the query, the **path** and the referrer of every URL-valued
property, person properties (`$set`, `$set_once`, `$initial_*`), and the app's own capability routes. "Last known"
is only allowed when that list is in the entry.

**The save machine keeps growing cells one review at a time; the note helped, but its first cell was missing.** 180
produced a good note, 181 fixed the bug it found, and the remaining rows are ordered. The missing cell (baseline
unknown, N1) is the one that loses the most data. Recommendation: when N1 lands, add it to the note's §2 as a state
("Unloaded": no PUT of `savedViews` until the GET has succeeded) so #380, #381 and #382 build on it.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-072 (`top068.mjs` logic; blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as
malformed or CEO-gated). New rows from §9 included. Verified at `49137a1`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** no saved-view write before the preferences GET has succeeded | 11 | follow-up | **true** | probes A and B: stored views replaced by one; LSS writes the default pack |
| 2 | #380 unknown outcome → GET reconcile | 11 | follow-up | **true** | `settleTimeout` → `settleFailure` rollback unchanged (`savedViewsSync.ts:155-164`) |
| 3 | **N2** PostHog: share token in URL paths; email path segments; P1 again | 11 | follow-up | **true** (dormant) | `ph073.txt` |
| 4 | #368 saved views capture filters | 11 | audit | true; **gate cleared** (the note exists) | `currentFilters={[]}` at `DashboardV2Shell.tsx:1530`; order after #376 and #380 |
| 5 | #113 pricing table semantics | 11 | audit | true | `pricing/page.tsx:258-264` `<th>` without `scope` |
| 6 | #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only |
| 7 | #376 focus after rollback (+ Cancel cell) | 10 | follow-up | **true** | `ColumnPicker.tsx` untouched since `4849da6`; Cancel at `:605` still without `shouldRestoreSaveFocusRef` |
| 8 | #381 save on leave | 10 | follow-up | true | unmount still clears the timer |
| 9 | #377, #366, #355 | 10 | follow-up | true (MR-072) | unchanged |
| 10 | #371 | 9 | follow-up | true | route unchanged |
| 11 | #382 revision/409 | 8 | follow-up | true; last | read-then-upsert unchanged |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **A saved-view change made before the preferences GET has succeeded replaces the user's stored saved views (and, on the LSS lens, their library columns).** MR-073 §3. `createSyncState()` starts with `confirmed: []`, `loadPreferences` swallows a non-2xx or network failure (`DashboardV2Shell.tsx:480-505`), and nothing marks the baseline as unknown, so the drawer shows no views and the next create/rename/delete sends a whole list built on that empty list. Measured on the real API with Alpha and Beta stored and a 7-column library pack: (A) LSS lens restored from localStorage, GET held 4 s, "Early" created before it answered: the PUT carried `savedViews: ["Early"]` and the 8 default columns (`libraryColumnsRef` still holds `DEFAULT_VISIBLE_KEYS`); the server lost Alpha, Beta and the library pack. (B) library lens, GET answered 500: creating "AfterFail" left the server with `["AfterFail"]` and the default columns. A slow cold-start GET is enough; a failed one makes it last for the session. Not caused by loop 181 (before it the PUT carried the LSS pack), and not a cell of `SAVED_VIEWS_DESIGN.md` §2. Fix: track a `baselineLoaded` flag in the sync state; until the initial GET has succeeded, never send `savedViews` and never send columns, keep create/rename/delete disabled in the drawer with "Couldn't load your saved views." and a Retry that re-runs the GET (focus on Retry); on success adopt the list and the library pack as today. Tests: unit tests that `dueSave` sends nothing before the baseline and that adopting it releases a queued column change; e2e for A (slow GET, LSS) and B (GET 500) asserting no PUT and the stored views intact. Add the state to the design note's §2. About 2 new strings, so a brief `growth-strategist` look (or keep one existing message). Follow-up of loops 170 and 181 (#367, #383). | fix | web-app / dashboard | `frontend-engineer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| **N2** | **With PostHog switched on, the share token and other path data still reach it: queries are stripped, paths are not.** MR-073 §4. Measured with posthog-js 1.367.0 in jsdom and the repo's own `buildPostHogConfig`, landing on `/share/<token>` with full consent: the token went out in `$current_url`, `$pathname`, `path` (sent by `PostHogProvider`), `$session_entry_url` and `$session_entry_pathname` (on every later event in the session), `$prev_pageview_pathname` (next page view), and as person properties `$initial_current_url` and `$initial_pathname` (on `$identify`, kept forever). The token is a bearer capability: `/api/share/[token]` serves the workflow to anyone holding it. A referrer whose path holds an email (`https://mail.example/inbox/john@example.com`) went out as `$referrer`. (The explicit `token` property of `shared_workflow_viewed` is overwritten by PostHog's own `token` field, by accident; do not rely on it.) Also, loop 182's claim that it kills MR-072 mutant P1 does not hold: removing the URL-key branch fails no test, because every URL-key test value also matches the value-shape regex. Fix in `posthog-privacy.ts`: rewrite `/share/<x>` to `/share/[token]` in any URL-keyed or URL-shaped value and in `$pathname`, `path` and every `*_pathname`; replace email-shaped path segments in any URL with `[email]`; keep it pure. Tests: a share-page landing in `posthog-privacy.integration.test.ts` asserting the token appears in no body, a referrer with an email path, a schemeless value under a URL key (`page_url: 'app.test/p?e=a@b.c'`), an `http://` value under a non-URL key, a fragment-only relative value (`'/a#e=a@b.c'`), a depth-13 object; and assert heatmaps, dead clicks, exception capture, web vitals and surveys stay inactive after `init` (they are off only because remote config never loads). A precondition for enabling PostHog, with #355. Follow-up of loop 182 (#378). | fix | analytics / privacy | `analytics` | 2 | 4 | 2 | 5 | 1 | 1 | **11** |

**Annotations recommended:**
- **#379 closure note:** "[MR-073: §2 citations verified at `d6e9f32`. The state machine has no 'baseline unknown'
  state: a save before the initial GET succeeds replaces the stored list (N1). Stale since loop 181: §5 'applying a view
  keeps persisting columns only' is library-lens only now, §6 N-D and §7 step 3 are done (#383), T1 maps the columns
  through `columnsToPersist`, and shell lines after `:520` moved. The limit message in §4 exists (`ColumnPicker.tsx:612-615`).
  The `sendBeacon` rejection stands on 'POST-only'; the revision rides in the body.]"
- **Design note (`SAVED_VIEWS_DESIGN.md`) header:** add a "Status after loop 181" paragraph listing the four stale
  points above and the N1 state (coordinator edit, no decision changes).
- **#383 closure note:** "[MR-073: holds on the real API: toggle-then-switch inside the debounce, rename/delete/apply
  view/apply preset under LSS, apply-then-switch, and a hung PUT across a lens switch all keep the library pack. The
  apply-view and apply-preset guards are untested (removing either fails nothing; the backstop still holds). Before the
  preferences GET answers, `libraryColumnsRef` is the default pack, so a lens save then writes defaults (N1).]"
- **#378 closure note:** "[MR-073: config, cookie and recursion verified with real posthog-js; only `/e/` requested.
  Path data is not sanitized: the share token reaches PostHog in `$current_url`, `$pathname`, `path`,
  `$session_entry_*`, `$prev_pageview_pathname` and `$initial_*` (N2). 'Kills MR-072 mutant P1' does not hold (the
  URL-key branch is untested again). #355 is not the last known prerequisite.]"
- **#380 append:** "(MR-073) After loop 181, adopt the server's columns into `libraryColumnsRef` and into
  `visibleColumns` only on the library lens. Build on N1's baseline flag (a failed reconcile GET leaves the baseline
  known but stale, not unknown)."
- **#381 append:** "(MR-073) Compare persisted columns (`columnsToPersist`), not visible ones, when deciding whether
  anything is unsent, or every lens session flushes on each tab hide. The keepalive quota is shared with the app's own
  `sendBeacon` flush on the same page-hide (`analytics.ts:1053`): catch a rejected keepalive and keep the state dirty
  rather than marking it sent; flush preferences before analytics or lower the guard. The reason to reject
  `sendBeacon` is POST-only; the revision would ride in the body."
- **#382 append:** "(MR-073) `updateMany where {userId, revision}` cannot create a row: the first save for a user with
  no row needs a create with base 0, and its unique-violation race must map to 409."
- **#368 append:** "(MR-073) Current line `DashboardV2Shell.tsx:1530`. Strings: 3, not 4 (the 10-view limit message
  exists at `ColumnPicker.tsx:612-615`); `growth-strategist` adjacency stands. Use one hint wording (the note and this
  row differ). Optional: three insight chips map exactly (`opportunityTag_automate`, `opportunityTag_monitor`,
  `healthScore_gte_70`)."
- **#371 append:** "(MR-073) The design note calls the 256 KiB cap current; it is this row's planned cap."
- **#17:** rewrite to one sentence and re-score, or downgrade to 7 (§6 staleness).

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §3 probes A/B: a save before the GET replaces stored views and the library pack | N1 |
| §4 share token and email path segments; P1 survives again; extension flags version-sensitive | N2 |
| §2 note stale after 181; missing baseline state; limit message exists | #379 note, design-note header |
| §3 apply-view / apply-preset guards untested | #383 note |
| §4 "#355 last known" wrong; P1 claim | #378 note |
| §2 reconcile must respect the lens | #380 append |
| §2 flush comparison and shared keepalive quota | #381 append |
| §2 conditional write cannot create | #382 append |
| §2 strings, line, hint wording | #368 append |
| §6 staleness: #17 | rewrite or downgrade |
| §7 "last blocker" claims | practice (no row) |

---

## 11. Loop 183-185 picks

**Before 183: push** (CEO item 1), and set `CRON_SECRET` + the three URL variables (item 4: the retention purge is not
running).

Pool 124 + 2 = 126 > 8, so burn-down. The cool-off stays armed (3/3 since 172): an 11 follow-up exists at every slot
below, so spending it buys nothing.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **183** | **N1** no saved-view write before the GET succeeds | **11** | `burn-down` (follow-up of 170/181) | `frontend-engineer` | web-app / dashboard | live, silent loss of a user's saved views; small (E2); every later save-machine row (#380, #381, #382) builds on the baseline flag |
| **184** | **#376** focus after rollback, against note §4 (F0 + three cells) | **10** | `burn-down` (follow-up of 171/174) | `frontend-engineer` + `ux-designer` | web-app / a11y | the note orders it before #380 because #380's reconcile reuses F0; N1's Retry adds one focus target to build with it. Taken over N2 (11) on that dependency, as 181 did with a logged reason |
| **185** | **#380** unknown outcome → GET reconcile (with the MR-073 lens clause) | **11** | `burn-down` (follow-up of 177) | `frontend-engineer` | web-app / dashboard | closes the known UI ≠ server cell before #368 adds filters to the PUT; kills MR-072 S6 |

- **Then 186:** N2 (rotates agent and Area; dormant, so it waits behind the live items), then #368 (gate cleared;
  `growth-strategist` adjacent), then #381, then #382.
- **Agents:** `frontend-engineer` at 183-185 is three in a row, under the 4+ trigger; 186 (N2, `analytics`) rotates.
- **Area:** 183 and 185 web-app / dashboard, 184 web-app / a11y; no three in a row. If the coordinator labels 184 as
  dashboard too, 186 must leave the area (N2 does).
- **Alternative:** if the CEO wants the PostHog list closed first, N2 at 183 and N1 at 184; then #376 at 185 and #380
  at 186.
- **Do not pick:** #368 before #376 and #380; #382 before #380 and #381; #145, #142, #170, #175 (blocked); #114 before
  #137; #159/#160 (CEO).
- **Practice:** keep the "Primary file" line; a privacy closure lists what it probed before saying "last known" (§7).
- **Then MR-074** (base cadence after 185). Watch item: the cool-off (unspent since 172).

---

## 12. Verdict

Every count reproduces at `49137a1`: root 6371, web-app 4551, typecheck 0, validator clean (open 124), guard runner
142/142, e2e 36 passed (one of them #366's expected failure).

- **Loop 180 holds.** Citations are accurate and the decisions are sound; four rows were justified. The note has no
  "baseline unknown" state and is stale in four places since 181 (annotations).
- **Loop 181 holds.** No lens sequence I could build wrote a lens pack or lost a library edit. Two call-site guards are
  untested (harmless). Next to it, an older hole: a save before the preferences GET succeeds replaces the stored views
  (N1, 11).
- **Loop 182 holds for the row.** Autocapture, cookie and recursion are right. The share token still reaches PostHog
  through URL paths, and the URL-key branch is untested again (N2, 11). #355 is not the last known prerequisite.

Selection was sound, including 181's logged departure and 182's decision not to spend the cool-off; agents rotated;
validation and primary-file lines are in every entry; ratio 0.83. Asks for the CEO: push; configure `CRON_SECRET` and
the job URLs (deleted workflows are not being purged); and note that the PostHog precondition list is #355 **and** N2.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 124
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6371 / 4551 / 0
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/saved-views-persistence.spec.ts e2e/app/dashboard/v2-a11y.spec.ts)   # 36 passed
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe073.config.ts)
   # A: slow GET on LSS -> PUT 8 default cols + ["Early"], stored views gone; B: GET 500 -> ["AfterFail"]
   # C-F: library pack kept, no lens pack written; afterAll restores the snapshot
(cd apps/web-app && npx vitest run --root $S/ph073 --config $S/ph073/vitest.config.mts)
   # token in $current_url/$pathname/path/$session_entry_*/$prev_pageview_pathname/$initial_*; cookie ""; only /e/
node $S/mut073/run.mjs $S/mut073; node $S/mut073/run2.mjs $S/mut073; node $S/mut073/run3.mjs $S/mut073
   # 24 mutants on copies; Q1 Q2 Q8 Q9 Q10 Q11 Q12/Q20 Q19 survive
gh run list --limit 6                                                              # CRON_SECRET failures
git log origin/main..main --oneline | wc -l                                        # 43
```
