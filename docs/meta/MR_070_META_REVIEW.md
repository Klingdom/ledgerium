# MR-070 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 171-173, 2026-10-03 00:37 → 01:00 (−0600). Commits `55995bc` (loop 171, #369), `0a4a351`
(loop 172, #360), `f0e9ef1` (loop 173, #370). Previous review MR-069 at `8742194`. Rows closed: #369, #360, #370.
Rows filed by loops: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-069 (`ITERATION_LOG.md`, loop 173 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Every row, strike or annotation below is a
recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `old070/` (the three limiter files at `0a4a351^` plus the old `invites/accept` functions copied out of the route)
  and `diff070.ts`: a differential run, old vs new, through `tsx`;
- `evict070.ts`: invites/accept lockout eviction at capacity;
- `probe070.config.ts` + `probe070.spec.ts`: a Playwright config outside the repo (same pattern as MR-069: repo
  global setup, auth setup and dev-server command on port 3098) running 5 probes against the real preferences API and
  the real drawer;
- `rl24.txt`, `rl20.txt`, `diff070.txt`, `probe070.txt`, `e2e070.txt`, `val070.txt`, `guard070.txt`, `root070.txt`,
  `web070.txt`, `tc070.txt`, `status_before.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. One mutation check (§3) edited `bounded-lru.ts` in place for one vitest run and was restored
byte-for-byte from a backup taken first (`git hash-object` equals `HEAD`; the index stat entry was refreshed so
`git status` shows it clean again). Both Playwright runs started and stopped their own dev server; `netstat` shows
nothing listening on 3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal); the probes
snapshot the test user's preferences and restore them (`restore 200`; the user had 0 saved views before and after).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 173) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6318 | **307 files, 6318 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4488 | **252 files, 4488 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 364 rows, 243 struck, **open 121** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `v2-a11y.spec.ts` + `saved-views-persistence.spec.ts` | 26 (173) and 7 (171), each including the 2 setup tests | **31 passed (1.7 min)**: 2 setup, 24 a11y (3 marked `x`, expected failures), 5 persistence | matches |
| rate-limit tests, Node 24 | — | **7 files, 64/64** | — |
| rate-limit tests, **Node 20.20.2** (`npx --yes node@20 node_modules/vitest/vitest.mjs run apps/web-app/src/lib/rate-limit`) | 64/64 | **7 files, 64/64** | matches |
| deltas | web 4449→4457→4485→4488 | 171 +8, 172 +28, 173 +3 (jsdom `.tsx`, so root unchanged at 173) | consistent |

Pool arithmetic: MR-069 recorded 124 (121 + #369-#371). Loops 171, 172, 173 each struck one row and filed none:
**121**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader, a real IME. Revert proofs ("the 3 new
e2e steps fail on the old shell", "15 failures with the original limiters", "3/3 jsdom tests fail on the old
component") are agent-reported and were not re-run, except the touch-copy mutation (§3), which reproduces.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces**, including 172's Node 20 run. Loop
   171 really carries a pending saved-view change through a later column-only save; 172's limiters are
   behaviour-identical to the old ones (80,000 differential operations, 0 mismatches); 173's drawer really survives
   an Escape inside each editor.
2. **Loop 171 fixed the debounce but not request ordering (§2, N1).** Two PUTs can be in flight at once, and the server
   keeps whichever arrives last. Probed in Chromium with the first PUT held back: PUT #2 (`["View A","View B"]`) lands,
   then PUT #1 (`["View A"]`) lands after it; the UI shows two views, the server has one, and after reload View B is
   gone. A second shape of the same cause: when the first PUT fails after a later PUT carrying the same list has gone
   out, the client rolls the UI back to `[]` while the server keeps the view; the error message is wiped by the later
   success. The UI and server then disagree silently, and the next saved-view edit made from the rolled-back list
   deletes the view on the server. Both need a slow first request, so they are rare, but they lose data quietly in
   the feature two consecutive loops just repaired. One fix closes both: never send a PUT while one is in flight.
3. **Loop 173 left focus outside the modal after three of the drawer's own actions (§4, N2).** Committing a rename
   with Enter, confirming a delete, and saving a new view with Enter each unmount the focused element, and focus falls
   to `<body>`, outside the `aria-modal` dialog. After a confirmed delete, Tab stayed on `<body>`. 173 fixed focus for
   the three cancel paths and not for the three commit paths.
4. **The friendly failure path renders (§2).** A forced 500 (with a "secret" error string in the body) shows "Couldn't
   save your changes. Saved views were restored to your last saved list.", rolls the list back, and does not show the
   server string. 171's "rollback covered by pure tests only" limit is now covered by a browser probe here.
5. **The navigation limit is real and narrow.** A navigation 0, 150, 300 or 380 ms after creating a view loses it;
   450 and 700 ms keep it. The exposure is the 400 ms debounce, and a user has to close the drawer and leave inside
   it. Leave it as 171's stated limit; do not file.
6. **Loop 172's semantics are unchanged within capacity, and the touch copy is now guarded.** Removing the flat copy
   in `touch` fails 3 of the 6 heap tests (reproduced). The lockout can be evicted after exactly 20,000 newer keys
   (reproduced: 19,999 keeps it, 20,000 drops it), as documented; with `TRUSTED_PROXY_HOPS` unset the key is the
   spoofable first `X-Forwarded-For` entry, so a spoofer never needs eviction anyway (#225).
7. **Ratio for loops 164-173 is 0.56: back above the 0.5 floor** (9 closed / 16 created; 0.53 if #368's promotion
   counts). MR-069's recovery projection held exactly: three closures, zero loop filings.
8. **Push is still the first CEO action.** `main` is **31 ahead**; the last deploy is still loop 151
   (`37088974348`); "Alerts check" still fails (`37099623595` newest). 172's heap tests now pass on Node 20 locally,
   which removes the specific CI risk MR-069 named.

---

## 2. Loop 171 — #369 saved-view writes survive the debounce (`55995bc`): **HOLDS for the debounce; ordering is open**

**Diff vs log:** matches. New pure module `savedViewsSync.ts` (`queueSave`, `payloadSavedViews`, `settleSuccess`,
`settleFailure`, `adoptServerList`); the shell queues every `scheduleSave`'s list, reads the pending list when the
timer fires, confirms on success, rolls back on failure unless a newer change is queued, and replaces the raw server
message with two fixed strings. The stale "Persist immediately" comment is corrected. 2 strings changed in an existing
failure path: under the D-4 clause 1 threshold, as logged.

**Pure logic, by reading.** A column-only call keeps `pending`; repeated saved-view changes keep the latest;
`settleSuccess` compares by identity (`state.pending === sent`), so a list queued while the PUT was in flight stays
pending. The 8 unit tests match those rules.

**Probes** (`probe070.spec.ts`, real dev server, real API, the drawer in Chromium):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| Q1 forced 500 | create a view; every PUT fulfilled 500 with `{"error":"Internal: prisma P2002 secret detail"}` | view shown, then rolled back to `[]`; friendly message shown and still visible 2 s later; raw string not rendered; server `[]` | ✓ |
| Q2 reordered PUTs | create View A (PUT #1 sent, held at the network); create View B (PUT #2 `["View A","View B"]` sent and answered); release #1 | server after #2: `["View A","View B"]`; after #1: **`["View A"]`**; UI `["View A","View B"]`; after reload **`["View A"]`** | **defect (N1)** |
| Q3 failure after a later send | create View C (PUT #1 held); toggle a column (PUT #2 carries `["View C"]`, held); #1 answered 500, then #2 continues and succeeds | server `["View C"]`; **UI `[]`**; **no message** (the later success reset the status); after reload `["View C"]` | **defect (N1)**: UI and server disagree silently |
| Q4 navigation | create a view, wait d ms, navigate | d = 0/150/300/380: **lost**; d = 450/700: kept | stated limit; not filed |
| race steps from 171 | create/rename/delete + immediate toggle + reload | pass (5 persistence tests, 31-run above) | ✓ |

**Why Q2 and Q3 happen.** `scheduleSave` only debounces the *start* of a PUT; nothing stops a second PUT from being
sent while the first is unanswered, and the route is whole-list replace (last arrival wins). In Q3 the first failure
runs `settleFailure` while `pending` still equals the sent list (the second PUT carried the same object), so it rolls
back; the second PUT then succeeds and confirms that list, but nobody restores the UI. In both cases the user sees one
list and the server holds another. A later saved-view edit is built from the UI's list, so in Q3 the next create sends
`[new]` and deletes View C on the server.

**Likelihood.** Both need the first PUT to stay unanswered for more than ~400 ms after the next edit (a slow network,
a cold server or a lock). Rare on a fast connection; silent when it happens. The fix is small and local: keep one PUT
in flight; when a save is due while one is pending, wait and send the latest state after it settles (the sync module
already tracks exactly that state). With a single in-flight request Q3 also resolves: the failure rolls back with
nothing else queued against it, or the queued save carries the newer list.

**Closure note accuracy.** "Remaining limit: a navigation within 400 ms still drops the pending save" is accurate
(Q4). "If the initial GET failed, the rollback baseline is empty" is accurate by reading. The note does not mention
concurrent requests.

---

## 3. Loop 172 — #360 sibling limiters onto the bounded LRU (`0a4a351`): **HOLDS**

**Diff vs log:** matches. Auth keeps one `BoundedLru` per purpose (20,000 each), keyed by the address after the first
`:`; extension telemetry 20,000; team invite 10,000; `invites/accept` moved verbatim to `invite-accept-buckets.ts`
(20,000) with `touch` on check and `peek` on record. The per-request full scans are gone. The route no longer keeps its
own Map.

**Semantics vs `0a4a351^`** (`diff070.ts`, `NODE_ENV=production`, 200 runs × 400 operations, time steps chosen to land
on and around every boundary: 0, 1, 5, 999, 1000, 59,999, 60,000, 300,000, 900,000, 3,600,000, 3,600,001 ms; IPv4,
IPv6, IPv4-mapped IPv6, `unknown`; for invites/accept a random mix of request, 404 failure and success):

| Limiter | Compared | Mismatches |
|---|---|---|
| auth (login / signup / forgot; allowed + `retryAfterSeconds`) | 80,000 | **0** |
| extension telemetry | 80,000 | **0** |
| team invite | 80,000 | **0** |
| invites/accept (blocked flag after request / failure / success sequences, lockout and window reset) | ~57,000 | **0** |

Overlong keys (> 64 characters) were excluded from the comparison on purpose: the old maps gave every overlong value
its own bucket, the new ones share one per limiter (per purpose for auth). No real address is that long.

**Per-purpose LRUs from input?** No. The three call sites pass literals (`forgot:`, `signup:`, `login:` in
`forgot-password/route.ts:36`, `signup/route.ts:56`, `auth.ts:48`). `MAX_PURPOSES = 8` caps the map anyway. One latent
wrinkle: past 8 purposes, `lruFor` falls back to one shared `__other__` LRU keyed by the address alone, so purposes 9+
would share buckets with each other. Unreachable today; a one-line comment or keying the fallback by the whole key
would remove it. Not filed.

**Lockout eviction** (`evict070.ts`): lock 9.9.9.9 with five 404s, then send N distinct addresses: N = 19,999 keeps the
lockout, N = 20,000 drops it. Exactly as documented. It does not weaken anything in practice: with
`TRUSTED_PROXY_HOPS` unset (`client-ip.ts`, hops 0 returns the first entry), a spoofer simply sends a new address per
request and never meets the lockout; with hops set correctly, producing 20,000 addresses means owning them.

**Heap tests.**
- Node 24 and **Node 20.20.2**: 64/64 each (MR-069's "never run on Node 20" closed).
- Mutation reproduced: `touch` storing `k` instead of `flatCopy(k)` fails **3 of 6** (`BoundedLru` re-touch,
  telemetry hit path, invites/accept hit path). The auth test cannot see it, as the log says (the key is rebuilt by
  concatenation and `slice`).
- `it.skipIf(!gc)` is gone: `gcIsAvailable()` is asserted by its own test and `requireGc()` throws.

**`gc-test-helper.ts` side effects.** Imported only by `bounded-lru-heap.test.ts` and
`analytics-ingest-buckets.test.ts` (grep over `src` and `e2e`); no production import. Both vitest configs use
`pool: 'forks'` with default isolation, so `v8.setFlagsFromString('--expose-gc')` reaches only the process running
that file; the main context gains no global `gc`. The full suites pass with it (above). Nit: it lives in `src/lib` with
a non-test filename; a `*.test-helper.ts` name or a `__tests__` folder would keep it out of any future coverage or
bundle sweep. Not filed.

---

## 4. Loop 173 — #370 Escape cancels the edit, not the drawer (`f0e9ef1`): **HOLDS for cancel; commit paths lose focus**

**Diff vs log:** matches. The drawer's document listener returns on `e.defaultPrevented`; rename Escape cancels,
sets `isCancellingRef` and returns focus to the rename trigger after re-render; the delete confirmation gets an Escape
(on the list item) and both Escape and Cancel return focus to the delete trigger; the new-name Escape returns focus to
"Save current view". The old `rowRef.focus()` (a div without `tabIndex`) is removed. The loop-169 e2e workaround is
replaced by assertions.

**Probes** (Q5, three seeded views):

| Step | Result | Verdict |
|---|---|---|
| rename, Escape | names unchanged, drawer open, focus on "Rename saved view: Alpha" | ✓ |
| rename again (guard reset), Tab | **commits** ("Alpha-tab" in UI and server); focus on the rename trigger | ✓ guard resets on the trigger click |
| rename, click elsewhere in the drawer | **commits** ("Beta-click"); focus on the dialog | ✓ |
| rename, **Enter** | commits; **focus on `BODY`, outside the dialog**; the next Tab happened to land in the dialog | **defect (N2)** |
| confirm a delete | deletes; **focus on `BODY`**; **Tab stays on `BODY`** | **defect (N2)** |
| new view, **Enter** | saves; **focus on `BODY`** | **defect (N2)** |
| IME composition (CDP `Input.imeSetComposition`) then Escape in the rename input | keydown `Escape`, `isComposing: true`; **the rename is cancelled**, the drawer stays | minor (below) |
| other inputs in the drawer | none besides the column checkboxes (no search box); Escape there closes the drawer, as intended | ✓ |

**`isCancellingRef`.** Set only on Escape, cleared only by the rename trigger's click, which is the only way into
rename mode. The probe confirms a later blur commits. Correct.

**Focus after commit (N2).** In each of the three commit paths the focused element unmounts and nothing chooses a new
target: `commitRename` sets `isRenaming=false` without `pendingFocusRef`; `onDelete` removes the row; `handleSave`
closes the form without `shouldRestoreSaveFocusRef`. The drawer's focus trap is a `keydown` handler on the drawer, so
once focus is on `<body>` it cannot contain Tab. Cancel paths now restore focus; commit paths, used more often, do not.
This is the 173 fix's own pattern applied to its siblings, so it is a follow-up, not a regression.

**IME.** Escape while composing (e.g. a Japanese or Chinese input method) is meant to cancel the composition only;
here it also cancels the rename. Before 173 it closed the whole drawer, so 173 improved it. Chromium's real IME may
deliver `key: "Process"` instead; Firefox delivers `Escape` with `isComposing`. A guard `if (e.nativeEvent.isComposing)
return;` in the three editors would settle it. Annotation on the #370 closure, not a row.

**Delete with the row gone.** Where focus should go after the deleted row disappears (next row's Apply button, or the
section heading) is part of N2.

---

## 5. Governance

**Selection.**
- **171** `burn-down` #369 (13), MR-069's first pick. Recharge 2/3. ✓
- **172** `burn-down` #360 (11), MR-069's second pick; it had waited four loops. Recharge **3/3, re-armed**. ✓
- **173** `burn-down` #370 (12), MR-069's third pick; the cool-off stays armed and unspent. ✓ Burn-down reached the
  top follow-up, so spending the charge would have been waste (MR-004 Change B logic).

All three followed the MR-069 recommendation in order; no deviation to justify.

**Density / follow-ups:** 0 created in all three; clause 3 did not fire.

**Ratio, loops 164-173** (same method as MR-069: review-filed rows count as created; the window opens at MR-067):

| | Count | Source |
|---|---|---|
| Closed | 9 | #249 (164), #116 (165), #299 (166), #361 (168), #105 (169), #367 (170), #369 (171), #360 (172), #370 (173). 167 partial |
| Created | 16 | MR-067 #355-#359; loop 166 #360; MR-068 #361-#364; loop 169 #365-#367; MR-069 #369-#371 |
| Ratio | **0.56** | **above the ≥ 0.5 floor**; 0.53 if #368's promotion counts as creation |

Recovered as MR-069 projected (0.56). This review files two rows. Window 165-174 then drops MR-067's five and, if 174
closes a row, reads about 9 / 13 = 0.69.

**Validation line:** present in all three entries ("validator 0; guard runner 142/142"), with named e2e runs and
"no port 3098 listener" in 171 and 173, and the Node 20 run in 172. Fourth consecutive window. #359 can stay at 9.

**Partial-row practice:** not exercised; each loop closed a whole row. Stated limits were honest and specific in all
three (171 navigation, 172 eviction, 173 focus targets), and each limit checked here reproduced as stated.

**What the probes keep finding.** MR-069 found "a path the tests did not model" twice; this window again: two requests
in flight (171), the commit side of a cancel fix (173). Both loops wrote good tests for the path they were given and
none for the sibling path. Practice for the template, no rule: **when a fix handles one branch of a symmetric pair
(cancel/commit, first/second request), the loop states what happens on the other branch.**

**Agents / Area.** 171 `frontend-engineer` (web-app / dashboard), 172 `security-reviewer` (security / web), 173
`frontend-engineer` (web-app / a11y). Rotation clean; no Area three in a row. D-4 clause 1: 171 changed 2 strings in an
existing failure path (exception applies); 172 and 173 none. Clause 2: `savedViewsSync.ts` 81 LOC,
`invite-accept-buckets.ts` 121 LOC (extracted, not new contract), both under 200.

**D-1.** Last extension touch `871e29a`, **130 loops** at 173 (185 commits). "User-ack outstanding" logged every loop.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 31]`; every suite green at `f0e9ef1`, rate-limit suite green on Node 20. Loops 152-173 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Alerts | scheduled "Alerts check" failing: `37099623595`, `37079356379`, `37053616721` |
| #350 part 3, #351 item 5 | read production data | after the push |
| #225 | `TRUSTED_PROXY_HOPS` | open; now the only thing between a spoofer and every limiter, including the invites/accept lockout |
| #278 / #355 | PostHog keys absent; identity reset first | unchanged (`resetUser` in `lib/posthog.ts` still has no caller) |
| #357 | signup disclosure decision | open |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | unchanged |

---

## 6. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor, blocked/awaiting/parked statuses excluded by reading
(`top068.mjs`); #113 restored by hand (its status contains "CEO directive-driven"); #157, #127, #152, #159, #160 excluded
as malformed or CEO-gated. Verified at `f0e9ef1`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N2** (below) focus leaves the drawer after commit | 11 | follow-up | **true** | Q5: `BODY` after Enter-rename, confirmed delete, Enter-save |
| 2 | #365 white on green-600 | 11 | follow-up | **true, 3 sites** | `ColumnPicker.tsx:555`, `PresetChipRail.tsx:176`, `UnifiedToolbar.tsx:211` |
| 3 | #368 saved views capture and restore filters | 11 | audit | **true** (as rewritten) | `DashboardV2Shell.tsx:1451` `currentFilters={[]}`; `handleApplySavedView` (`:633-639`) sets columns only |
| 4 | #113 pricing table semantics | 11 | audit | **true** | `pricing/page.tsx:258-273`: `<th>` without `scope`, no `<caption>` |
| 5 | **N1** (below) concurrent preferences PUTs | 10 | follow-up | **true** | Q2, Q3 |
| 6 | #366 dimmed rows contrast | 10 | follow-up | true | `ColumnPicker.tsx:801` `opacity-60`; still a `test.fail` |
| 7 | #362 one UTM sanitizer | 10 | follow-up | true | `UTMCapture.tsx` stores raw; `SignupPageClient.tsx:60-61` spreads into `signup_completed` |
| 8 | #355 identity reset | 10 | follow-up | true | `resetUser` has no caller |
| 9 | #371 preferences body and array caps | 9 | follow-up | true | `preferences/route.ts:226` `await req.json()`; top-level `visibleColumns`/`columnOrder` unbounded (`:100-101`) |
| 10 | #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | burn-down cannot reach these; cool-off only |

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Two preferences PUTs can be in flight at once, so the server can keep an older saved-view list than the UI shows.** MR-070 §2. Loop 171 (#369) carries a pending list through the debounce, but `scheduleSave` still sends a new PUT while an earlier one is unanswered, and the route replaces the whole list, so the last request to arrive wins. Reproduced in Chromium against the real API with the first PUT held back: PUT #2 with View A and View B lands, then PUT #1 with View A lands, the UI shows both, the server keeps one, and View B is gone after reload. Second shape: if the first PUT fails after a later PUT carrying the same list was sent, the client rolls the UI back to the old list while the server keeps the new one, and the later success wipes the error message, so a following saved-view edit made from the rolled-back list deletes the view on the server. Both need a slow first request. Fix in the client: keep at most one PUT in flight; when a save comes due while one is pending, send the latest state after it settles (the `savedViewsSync` state already holds it). Tests: unit tests on the queue (second save waits; failure then queued success leaves UI and confirmed list equal), and an e2e step in `saved-views-persistence.spec.ts` that holds the first PUT with `page.route`, creates a second view, releases the first and asserts both views survive a reload. Follow-up of loop 171 (#369). | fix | web-app / dashboard | `frontend-engineer` | 3 | 4 | 2 | 4 | 2 | 1 | **10** |
| **N2** | **Focus leaves the column picker drawer after a saved view is renamed with Enter, deleted, or saved with Enter.** MR-070 §4. Loop 173 (#370) returns focus to the trigger on every cancel path, but on the three commit paths the focused element unmounts and nothing receives focus: `commitRename` closes the editor without a focus target, `onDelete` removes the row, and `handleSave` closes the form without restoring focus. Reproduced in Chromium: `document.activeElement` is `BODY`, outside the `aria-modal` dialog, after each; after a confirmed delete, Tab also stayed on `BODY`, and the drawer's focus trap (a keydown handler on the drawer) cannot help once focus is outside it. Fix: after a rename commit focus the row's rename trigger; after a delete focus the next row's Apply button, or the previous one, or the section's Save current view button when the list is empty; after a save focus the new view's Apply button. Tests: extend `ColumnPicker.escape.test.tsx` (or a sibling) with the three commit paths, and assert focus inside the dialog in the `v2-a11y.spec.ts` saved-views test. No copy change. | fix | web-app / a11y | `frontend-engineer` | 3 | 4 | 1 | 5 | 1 | 1 | **11** |

**Annotations recommended:**
- **#369 closure note:** "[MR-070: holds for the debounce: create, rename and delete followed by a toggle all persist,
  and a forced 500 shows the friendly message and rolls back without the server string. Navigation inside the window
  loses the change at 0-380 ms and keeps it at 450 ms, as stated. Not covered: two PUTs in flight at once (N1).]"
- **#360 closure note:** "[MR-070: holds; 80,000 differential operations against `0a4a351^` per limiter with 0
  mismatches (windows, retry-after, lockout, success reset); Node 20 64/64 reproduced; the touch-copy mutation fails 3
  of 6 heap tests. Lockout eviction at exactly 20,000 newer keys, as documented. The `__other__` fallback past 8
  purposes would share buckets across purposes; unreachable (3 literal purposes).]"
- **#370 closure note:** "[MR-070: holds for the three cancel paths; the rename guard resets so a later Tab or
  click-away commits. The three commit paths leave focus on the page body (N2). Escape during IME composition also
  cancels the rename; checking `nativeEvent.isComposing` in the three editors would fix it.]"
- **#365:** "(MR-070) Still three sites at `f0e9ef1` (`ColumnPicker.tsx:555`, `PresetChipRail.tsx:176`,
  `UnifiedToolbar.tsx:211`); test 3b's `test.fail` is still the first statement."

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §2 Q2 reordered PUTs; Q3 rollback divergence with no message | N1 |
| §4 focus to `BODY` after three commit paths | N2 |
| §2 navigation inside 400 ms | none (171's stated limit; measured) |
| §3 `__other__` fallback; helper filename | #360 note / not filed |
| §4 IME Escape cancels the rename | #370 note |
| §5 ratio 0.56 | governance: recovered |

---

## 9. Loop 174-176 picks

**Before 174: push** (CEO item 1).

Pool 121 > 8, so burn-down unless a cool-off is invoked. The cool-off is armed (3/3 since 172).

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **174** | **N2** focus stays in the drawer after commit | **11** | `burn-down` (follow-up of loop 173) | `frontend-engineer` | web-app / a11y | the top follow-up; same file and pattern as 173 while it is fresh; E1 |
| **175** | **N1** one preferences PUT in flight | **10** | `burn-down` (follow-up of loop 171) | `frontend-engineer` | web-app / dashboard | silent data loss in a feature two loops repaired; uses the 171 sync module |
| **176** | **#362** one UTM sanitizer | **10** | `burn-down` | `analytics` | analytics / privacy | leaves the dashboard Area and rotates off `frontend-engineer` (173-175 would be 3 in a row; a 4th trips the agent rule) |

- **Cool-off:** keep it armed through 176; burn-down reaches everything above. Spend it at 177+ on **#368** (11, now
  verified true as rewritten, `frontend-engineer`, after a rotation) or **#113** (11, E1/R1, pricing, any agent).
- **Alternatives:** 174 → **#365 + #366** as one loop (one outcome: the drawer and rail meet 4.5:1; one token
  decision with `ux-designer` adjacent; removes three `test.fail`s). Do not put it next to N2 if both are tagged
  `web-app / a11y` and 173 was too: that is three in a row.
- **Do not pick:** #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO); #371 alone (9) while N1 is open
  in the same route's client.
- **Then MR-071** (base cadence after 176).

---

## 10. Verdict

Every count reproduces at `f0e9ef1`: root 6318, web-app 4488, typecheck 0, validator clean (open 121), guard runner
142/142, e2e 31 passed with three expected failures, rate-limit 64/64 on Node 24 and Node 20.

- **Loop 171 holds for the debounce** and its failure message renders in a browser. Two requests in flight can still
  leave the server with an older list than the UI (N1).
- **Loop 172 holds.** The new limiters match the old ones on every boundary within capacity, the touch copy is now
  guarded, and the heap tests run on CI's Node version.
- **Loop 173 holds for cancel.** On commit, focus drops out of the dialog (N2).

Selection followed MR-069 exactly (burn-down ×3, cool-off re-armed at 172 and correctly kept), the validation line is in
every entry, no loop filed a row, and the ratio recovered to 0.56. Push now.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 121
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6318 / 4488 / 0
npx vitest run apps/web-app/src/lib/rate-limit                                     # 64/64 (Node 24)
npx --yes node@20 node_modules/vitest/vitest.mjs run apps/web-app/src/lib/rate-limit   # 64/64 (Node 20.20.2)
(cd apps/web-app && npx tsx $S/diff070.ts)     # mismatches {"auth":0,"tel":0,"inv":0,"acc":0}
(cd apps/web-app && npx tsx $S/evict070.ts)    # 19,999 keeps the lockout; 20,000 evicts it
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/v2-a11y.spec.ts e2e/app/dashboard/saved-views-persistence.spec.ts)   # 31 passed, 3 x
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe070.config.ts)
   # Q1 500 path; Q2 reordered PUTs lose View B; Q3 UI [] vs server [View C]; Q4 0-380 ms lost; Q5 focus to BODY
git log origin/main..main --oneline | wc -l                                        # 31
```
