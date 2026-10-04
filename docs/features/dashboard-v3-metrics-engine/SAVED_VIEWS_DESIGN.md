# Saved Views: Save Contract, Focus Map, Filters (design note)

**Status:** Decision note. No code. Owner `system-architect`; `ux-designer` adjacent (§4).
**Backlog:** row #379 (MR-071 §7, MR-072 §7). Gates #368; #376 builds against §4.
**Precedent:** `SNAPSHOT_TABLE_DECISION.md` (iter 055). Wire format: `PERSISTENCE_SCHEMA.md`.
**Ground truth read at:** `d6e9f32` (after loops 170-179). Line numbers refer to that commit.
**Status after loop 181 (MR-073, coordinator edit; no decision changed):** (1) §5 "applying a view keeps persisting columns only" now holds on the library lens only; under a lens it persists nothing (#383). (2) §6 N-D and §7 step 3 are done (#383, loop 181). (3) T1 now maps queued columns through `columnsToPersist`; shell line numbers after `:520` have moved. (4) The §4 10-view limit message already exists (`ColumnPicker.tsx:612-615`). Missing state: **baseline unknown** — a save before the initial preferences GET succeeds replaces the stored list and library pack (#384). The `sendBeacon` rejection stands on "POST-only" (a revision would ride in the body).
**Status after loop 187 (MR-075, coordinator edit; no decision changed):** (1) T7 is built. (2) Base rule for every send and adoption: never send or adopt a whole pack or list unless its base is known and no local change happened since that base was read (baseline flag for the load, which #386 implements; a local edit counter for reconciles, which #387 implements, built (loop 190): `edits` in the sync state is bumped by every `queueSave` and every pre-load toggle or pack choice; `reconcileFromServer` reads it before the GET and `reconcileAdopt` adopts only if it is unchanged and nothing is in flight, deferred or armed, otherwise the latest local state sends and a stale answer never replaces `confirmed` once everything has settled; the old `pending !== sent` test was redundant with the counter and was removed). (3) T13's column rule is now loop 187's (pre-load toggles replay as deltas; a pre-load preset is a whole-pack base); a net-zero click sequence on a column whose default and stored membership differ is applied as its last write, accepted. (4) §3(iv) exception: after an unknown outcome on a column-only PUT, the reconcile shows the server's columns under 'Showing what's saved'; this is not a rollback. (5) §4 F0: a reconcile that removes a row with an open rename drops the draft (built behaviour, loop 185); the defer sentence below is withdrawn.
**Status after loop 203 (row #103, build edit; save contract extended):** The default time range (`defaultTimeRange`, schema v2) rides the same save path: a user range choice counts as a local edit (`edits`), is held until `baselineLoaded`, is sent only when the user chose it (never a URL-set or server-adopted range), and is cleared by the PUT that confirms it unless a newer choice arrived; a reconcile adopts the server range only if the user chose one this session. It is independent of lens and of saved views. An explicit URL `?timeRange=` at mount wins over the stored range and is never saved.

---

## 1. Context and scope

The column picker drawer runs one debounced, whole-list-replace `PUT /api/dashboard/preferences` for column toggles, preset/view apply and saved-view create/rename/delete. Six of loops 169-177 each fixed one case of it. This note lists the cases before #368 adds filters to the same PUT.

**In scope:** the client save state machine (`DashboardV2Shell.tsx` + `savedViewsSync.ts`), the PUT contract (`route.ts`), focus inside the drawer (`ColumnPicker.tsx`), how saved views capture and restore filters.
**Out of scope:** the URL state (`urlState.ts`: timeRange, filters, search, sort), lens persistence (localStorage), PostHog, body-size caps (#371, referenced only).

**PUT contract as built** (`app/api/dashboard/preferences/route.ts`): body `{visibleColumns, columnOrder, savedViews?}` (`:100-105`). If `savedViews` is absent the server keeps the stored list; if present (even `[]`) it replaces it (`:262-265`). The route reads the row and then upserts it (`:249-276`), which is not atomic. Top-level `filters` is never sent and is always kept from the stored row (`:260`). The server stamps `createdAt` (`:112-133`). The client ignores the response body (`DashboardV2Shell.tsx:559-562`). Limits: 10 views, 64-char names, 50 filters per view; column arrays are uncapped (#371).

## 2. Save state machine (as implemented)

The state is the `SavedViewsSyncState` ref (`savedViewsSync.ts:26-39`: `pending`, `confirmed`, `inFlight`, `dirty`, `columns`, `reconciling`) plus the debounce timer `saveDebounceRef` (`DashboardV2Shell.tsx:346`).

| State | Definition | UI status |
|---|---|---|
| **Idle** | no timer, `!inFlight` | `idle` / `saved` (1.5 s) / `error` |
| **Debouncing** | timer armed, `!inFlight` | `saving` |
| **InFlight** | `inFlight`, `!dirty`, `!reconciling` | `saving` |
| **InFlight+Queued** | `inFlight` and (`dirty` or timer armed) | `saving` |
| **Reconciling** | `inFlight`, `reconciling` (re-send after a timeout) | `saving` |
| **BaselineUnknown** (loop 183) | `!baselineLoaded`: the initial preferences GET has not succeeded (in flight, or failed). Entry state of every page load. Nothing is ever sent from here | drawer saved-views section: loading (controls off) or "Couldn't load your saved views." + Retry |

| # | From | Event | Action / to | Cite |
|---|---|---|---|---|
| T1 | any | edit (`scheduleSave(cols, views?)`) | clear and re-arm the 400 ms timer; status `saving`; `queueSave` stores `columns`, and `pending` only if `views` is given (column-only keeps the pending list) | Shell `:513-525`; Sync `:64-71` |
| T2 | Debouncing | timer fires, `!inFlight` | `dueSave` → `startSend`: PUT `{columns, savedViews: pending}` (field omitted if `pending` is undefined) → InFlight | Shell `:614`; Sync `:77-103` |
| T3 | InFlight | timer fires | `dueSave` marks `dirty`, sends nothing → InFlight+Queued | Sync `:80` |
| T4 | InFlight* | 2xx | `settleSuccess`: `confirmed = sent`; `pending` cleared only if unchanged (`===`); `reconciling = false`; then `takeQueued` | Sync `:111-124`; Shell `:569-570, 596-601` |
| T5 | InFlight* | non-2xx or network error | `settleFailure`: roll back to `confirmed` only if `sent === pending` and `!dirty`; message only if `!dirty` | Sync `:132-144`; Shell `:574-592` |
| T6 | InFlight (not reconciling) | 15 s abort | `settleTimeout`: no rollback; `dirty = true`, `reconciling = true`; `takeQueued` re-sends the latest full state once → Reconciling | Sync `:155-164`; Shell `:540-544, 574-576` |
| T7 (built, loop 185) | Reconciling | non-2xx or abort | **unknown outcome, no rollback.** `settleUnknown`: if nothing newer is queued, one `GET /api/dashboard/preferences` (`reconcileFromServer`); success → `reconcileAdopt` adopts the server list and library columns (`libraryColumnsRef` always, `visibleColumns` only on the library lens) and shows "Couldn't confirm your last change. Showing what's saved."; a newer change (dirty, armed timer, a flight, or a different pending list) blocks adoption and still sends, and `reconciling` stays set so its failure is also unknown. GET failure → `reconcileFailed`: UI kept, generic "Couldn't save your changes. Please try again.", baseline stays loaded. A definite failure outside Reconciling (T5) is unchanged | Sync `:159` |
| T8 | after settle | `dirty` | one PUT with the latest state (coalesced) | Sync `:88-93`; Shell `:596-601` |
| T9 | after 2xx, nothing queued, no timer | — | `saved`, then `idle` after 1.5 s (a functional update never overwrites `saving`) | Shell `:603-611` |
| T10 | Debouncing | unmount | **timer cleared, change dropped** | Shell `:621-629` |
| T12 (loop 183) | BaselineUnknown | edit (`scheduleSave`) | a saved-views change is refused (the drawer controls are disabled and `handleSavedViewsChange` returns). A column edit on the library lens is queued in `columns`; on a non-library lens nothing is queued. The timer may fire, but `dueSave`/`takeQueued` send nothing (`startSend` guard) and the status returns to `idle` | Sync `startSend`; Shell `scheduleSave` |
| T13 (loop 183; column rule loop 187) | BaselineUnknown | GET 2xx (first load or Retry) | `adoptServerList`: `confirmed` = server list, `baselineLoaded = true`; a pre-load column edit marks the state `dirty` and is re-armed through `scheduleSave`, so the first PUT carries the resolved columns and omits `savedViews`. **Column rule (loop 187, #386; replaces the loop 183 rule "a pre-load library-lens column edit wins"):** the pre-load visible pack is only the default, so a toggle is recorded as a delta (column on/off, last write per key wins) and replayed onto the adopted pack (the stored pack, or the default when none is stored); the result becomes `libraryColumnsRef` and is sent once after load. A preset or saved-view apply before the load is a whole-pack choice: it becomes the base of the pre-load edit (earlier deltas dropped, later toggles replay on top) and is sent once after the load, like the same click after it. A non-library lens keeps its visible lens columns. **Load answer (loop 187):** a 2xx whose body has no `savedViews` list is a load ERROR (T14), not an empty baseline; an answer that arrives once the baseline is loaded (StrictMode's second load) or after unmount is ignored, and unmount aborts the load | Shell `loadPreferences` |
| T14 (loop 183) | BaselineUnknown | GET non-2xx, network or parse error | stay BaselineUnknown; drawer shows the error + Retry (focus stays on Retry on a repeat failure, moves to Save current view on success, F0) | Shell `loadPreferences`; Picker |
| T11 | InFlight | unmount | flight and follow-up continue; no setState (`isMountedRef`) | Shell `:356, 578, 603` |
| — | any | page hide / close | **nothing** (no leave flush) | — |

Columns are never rolled back: a failed column-only PUT keeps the UI columns and shows "Couldn't save your changes. Please try again." (`:589`). The next PUT of any kind re-sends the current columns.

## 3. Open cells: decisions

**(i) The re-send fails after the first PUT may have applied** (MR-072 T2-500). In Reconciling, T7 rolls back to `confirmed`, which is the list from before the first flight, and says "restored" while the server may hold the new list.
**Decision: reconcile with GET (built, loop 185).** A failure or abort in Reconciling, or any failure whose outcome is unknown, runs one `GET /api/dashboard/preferences`. The client then adopts the server's `savedViews` (`adoptServerList` + `setSavedViews`) and top-level columns, unless a newer local change is pending. In that case it keeps the local state, marks it dirty and lets the queued PUT carry it. Message: "Couldn't confirm your last change. Showing what's saved." If the GET also fails, keep the UI state, make no restore claim, and say "Couldn't save your changes. Please try again."; the next edit re-sends the whole state.
*Rejected:* rollback (wrong whenever the server applied the PUT); an "unknown" message alone (honest, but leaves UI ≠ server until a reload).

**(ii) Save on leave.** Today a change still in its 400 ms window is lost on navigation (T10) and on tab close (#369, #374 limits).
**Decision: flush with `fetch(..., {keepalive: true})`, method PUT, on `visibilitychange`→hidden and on `pagehide`, and on unmount instead of clearing the timer.** Flush only when something is unsent: a timer is armed, `dirty` is set, `pending` is set, or columns ≠ last-confirmed columns (track `confirmedColumns` in the sync state). The flush is the same payload builder as T2 (no second path), sent even if a flight is open. It is best-effort: skip it when the serialized body is over 60 KiB. Browsers cap in-flight keepalive bodies at about 64 KiB, and a normal document is a few KB. #371's 256 KiB server cap is still correct for normal PUTs. Mark the flush as "sent" without awaiting it.
*Rejected:* `sendBeacon`. It is POST-only, so it needs a POST alias on the route (a second write path), and it cannot carry an `If-Match`-style revision header. *Accepted risk until (iii) ships:* if a normal PUT is still in flight when the flush goes out, the two can arrive in either order.

**(iii) Two tabs.** Whole-list replace means a stale tab deletes views created in another tab. LWW was accepted at MR-069.
**Decision: add a revision, after (i) and (ii).** Add an integer `revision` column (additive migration, default 0). GET returns it in `meta`. The PUT carries `baseRevision`, and the server writes with one conditional statement (`updateMany where {userId, revision: base}` → `revision + 1`); this also removes the read-then-upsert race (`:249-276`). If 0 rows match, the server returns **409 with the current document**. The client handles a 409 exactly like (i): adopt the server document and keep any newer local change queued on top. A 409 also settles T2-500 exactly, because a re-send of an already-applied PUT is now a 409, not an overwrite. It also orders the leave flush against an open flight. Cost: route + migration + client ≈ 1 loop (E=3). *Until then:* last write wins, as documented in this note.
*Rejected:* `updatedAt` as the token (ms collisions, needs CAS anyway); per-view diff/merge endpoint (a second save path).

**(iv) Column-only failure.** **Decision: no rollback.** The columns are visible in place and cheap to redo. Rolling them back would reflow the table under the user and discard a deliberate choice. Every later PUT carries them, and (ii) flushes them on leave. Keep the message. With `confirmedColumns` from (ii), the status can say the columns are unsaved without a rollback. **Exception (loop 190, #387): an unknown outcome.** When a column-only PUT times out and its re-send also fails, nobody knows whether the server applied the columns. The reconcile GET answers that, and if no local edit happened meanwhile it is adopted whole: the UI shows the server's columns (and list) under "Couldn't confirm your last change. Showing what's saved." This is not a rollback to an older saved pack but a display of the server's actual state; it is the one place a column choice is replaced from outside. Any edit made while the GET is out (counted by `edits`) cancels the adoption, and the latest local state, columns included, sends instead.

## 4. Drawer focus table

Rule **F0 (new, general):** after any list change caused by a rollback or reconcile, or after a commit whose computed target does not exist: if the drawer is open and `document.activeElement` is `BODY`, null or disconnected, focus **Save current view**. When that button is absent (list at 10), focus the first row's Apply (the list is never empty when Save is absent, so no focusable heading is needed; last resort: the drawer itself, `tabIndex={-1}`). (UX review loop 180: replaces the `tabIndex=-1` heading proposal; a heading target announces a section name, an Apply button lands the user on a real control.) Never move focus that is already on a live element.

| Action | Outcome | Focus target | Status |
|---|---|---|---|
| Open drawer | — | drawer (`role=dialog`) | built `ColumnPicker.tsx:680-684` |
| Close: Escape (no editor open) / X / backdrop | — | Customize columns trigger | built `:663-676, 685-686, 691-698, 769` |
| Open save form | — | name input | built `:454-456` |
| Save form: Escape | cancel | Save current view | built `:500-505, 457-459` |
| Save form: **Cancel button** | cancel | Save current view | built (loop 184) |
| Create (Enter or Save button) | success | new view's Apply | built `:488, 463-472` |
| Create | PUT fails, row rolled back | F0 → Save current view | built (loop 184) |
| Create | reconcile (§3 i) removes the row | F0 | built (loop 185): the existing list-change effect applies `focusFallback`; no new code |
| Rename: Enter / Confirm click | success | that row's rename trigger | built `:231, 203-209`. Confirm works only because React reuses the DOM node (MR-071), so add a test |
| Rename: empty name + Enter | revert | rename trigger | built `:231-237` |
| Rename: blur | commit | unchanged (user moved focus) | built `:337` |
| Rename: Escape | cancel | rename trigger | built `:249-256` |
| Rename | PUT fails, old name restored | stays on rename trigger (same row key) | built by construction; untested |
| Delete trigger | — | Confirm delete | built `:219-224` |
| Delete confirm: Escape / Cancel | cancel | delete trigger | built `:268-275, 303-306` |
| Delete confirm | success | next row's Apply, else previous, else Save current view | built `:520-531` |
| Delete confirm | neighbour itself confirming (no Apply rendered) | F0 | built (loop 184) |
| Delete confirm | PUT fails, row re-added | stays on neighbour's Apply / Save | built by construction; untested |
| Apply saved view | success or failure | stays on Apply (button persists; drawer stays open) | built `:376` |
| Column checkbox | success or failure | stays on checkbox | built |
| Delete confirm | last remaining view deleted | Save current view (the list is empty, so the empty-state line shows) | built `:520-531`; add test (UX review loop 180) |
| Apply saved view | success | stays on Apply; **announce "Applied view: {name}"** in the status region (the "View: {name}" chip is behind `aria-modal`, so it is invisible to screen readers) | built (loop 184) |
| Rename / Create / Delete | PUT fails, row restored | stays; the error is announced via the status region, never silent | built (loop 184) |
| Save form open, view limit (10) reached | Save current view absent | show "You've reached 10 saved views. Delete one to save another." in place of the button | verify it exists; add if not (UX review loop 180) |
| Any rollback while drawer closed | — | no focus action; error shows on reopen (shell state) | built |

Announcements: the status `<p aria-live>` elements are mounted together with their text (`:785-797`), which some screen readers do not announce (MR-071). **Decision (UX review loop 180):** one persistent `role="status"` (polite) region and one persistent `role="alert"` region, both always mounted in the drawer (also while empty). Only their text changes. Announce `Saved`, errors, and the apply message. Do not announce `Saving…` (it fires on every edit and is noise); leave it visual only. Set text a tick after mount when the drawer opens with a pending error. Remove `aria-live` from the three conditional `<p>` elements (`:785-797`).

## 5. #368: filters in the same payload (built, loop 194)

**Built (loop 194).** `captureFilterSet.ts` (pure; parity tests against `applyFilters` for opportunity x5, both health bands incl. gated rows, and the three exact insight chips) feeds `currentFilters`; the shell passes `filtersPartiallyCaptured` so the picker shows "Your search and some filters won't be saved with this view." under the name input (`aria-describedby`) only while search, systems, needs-attention, high-variation, stale or another row-narrowing insight chip is active (the global bottleneck chip does not narrow rows, so it does not count). Apply sets `presetFilters` (the preset pipeline), clears ad-hoc filters and the insight chip, keeps search, and shows a "View: {name}" chip (truncated, full name in `title`) only when the view carries filters; any ad-hoc change, preset or chip-remove supersedes it. Filters stay session state; the PUT payload is unchanged except `filters` inside each view. The hint wording in the capture bullet below is superseded by this one.

- **No new save path.** Filters ride inside `SavedView.filters`, already validated and persisted (route `:88`, loop 170), through `handleSavedViewsChange` → `scheduleSave`. Applying a view keeps persisting columns only (`:693-699`); applied filters are session state, as presets are.
- **Top-level `filters`: stays reserved.** The client never sends it and the server keeps it. Ad-hoc filters already live in the URL (`urlState.ts`); persisting them too would be a third, competing store.
- **Capture (at create time).** A pure `captureFilterSet({presetFilters, filters, insightFilterKey})` replaces `currentFilters={[]}` (Shell `:1511`). It takes `presetFilters` verbatim, plus only the ad-hoc constraints that `FilterSet` expresses **exactly**: `opportunity` → `opportunity_tag in [t]`; `healthStatus` `healthy` → `health_score gte 70`; `needs_review` → `health_score lt 40`. Each mapping needs a parity test showing `evaluateFilterSet` agrees with `applyFilters` (`WorkflowList.tsx:227-324`) on fixtures, including gated health. Drop a mapping if parity fails. **Not capturable today:** `systems` (the accessor returns an array; every `FilterValue` kind needs a string or number, so it always evaluates false: `filters.ts:267-293`), `needsAttention`, `high_variation` and `stale` (run-gated or clock-relative), insight chips, and search (orthogonal, URL). If any of these is active at save time, show one line under the name input: "Search and some filters aren't saved with views." No silent partial capture.
- **Restore (apply).** Use the preset pipeline: `setPresetFilters(view.filters.length ? view.filters : null)`, clear the ad-hoc filters and the insight chip, keep search (`handleApplyPreset` `:714-728`). A filter on a column that is no longer available matches no row (`evaluateFilter` returns false), so such a view shows 'No workflows match current filters' with its View chip, and removing the chip clears it (MR-077, measured). The active-filters model gains a saved-view slot so the bar shows a chip "View: {name}" and Clear removes it. Without the chip the filter would be invisible.
- **Copy:** 2 new strings (hint, chip prefix). That is under the D-4 threshold of 3, but #368 says "copy unchanged", so this amends it.

## 6. Rows changed or created

Score = I+A+L+C−E−R.

| Row | Change | I/A/L/C/E/R | Score |
|---|---|---|---|
| #376 | Build against §4 F0 + cells "Create/PUT fails" and "Delete/neighbour confirming". Add the Save-form **Cancel button** cell (same file, same rule). | 2/4/1/5/1/1 | 10 (unchanged) |
| #368 | Implement §5: capture rule + parity tests, restore via preset pipeline, view chip, hint line. Copy amended (2 strings). | 4/4/2/4/2/1 | 11 (unchanged) |
| #371 | Note only: the leave flush is skipped above 60 KiB; the 256 KiB cap stands. | — | 9 (unchanged) |
| **new N-A** | Unknown outcome: failure or abort in Reconciling → GET reconcile + honest message (§3 i). Unit tests on the sync transitions; e2e T2-500. Also kill MR-072 survivor S6. | 3/4/3/4/2/1 | **11** |
| **new N-B** | Save on leave: keepalive PUT on hidden/pagehide/unmount, `confirmedColumns`, 60 KiB guard (§3 ii, iv). | 4/4/3/3/2/2 | **10** |
| **new N-C** | `revision` + conditional write + 409 → N-A reconcile (§3 iii). Additive migration. | 3/4/3/3/3/2 | **8** |
| **new N-D** | Verify, then fix: the save PUTs the visible pack even under a non-library lens (see §7). | 3/4/2/3/1/1 | **10** |

## 7. Order of work

1. **#376.** Focus only, independent of the save machine; F0 is reused by N-A.
2. **N-A.** Close the known UI ≠ server cell before more data rides the PUT.
3. **N-D.** One-line fix plus test (top-level columns must be the library pack); touches `scheduleSave` callers that #368 also touches.
4. **#368.** Filters, on a correct save machine.
5. **N-B.** Save on leave.
6. **N-C.** Revision. Last-write-wins is accepted until then.

Code contradiction found while writing (basis for N-D): `handleSavedViewsChange` sends the current `visibleColumns` as the top-level pack (`DashboardV2Shell.tsx:682`), and so do `handleToggleColumn` (`:649`), `handleApplyPreset` and `handleApplySavedView`. Under the LSS lens that is the lens override, while `:731-734` says a lens pack "MUST NOT persist… would regress the library default on reload". Saving a view under LSS would write the LSS pack as the library pack. Read from code, not reproduced.
