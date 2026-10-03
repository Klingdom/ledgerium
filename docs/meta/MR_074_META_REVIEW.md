# MR-074 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 183-185, 2026-10-03 10:00 → 11:12 (−0600). Commits `d8bb782` (loop 183, #384), `7ccd086`
(loop 184, #376), `40b2fdc` (loop 185, #380). Previous review MR-073 at `bcc1dd4`. Rows closed: #384, #376, #380.
Rows filed by loops: none. Rows amended: #377 (loop 184), #376 (loop 183). Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-073 (`ITERATION_LOG.md`, loop 185 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the design note or code, not even temporarily. No commit, no
`git add`. Every row, strike or annotation below is a recommendation for the coordinator. Scratch went only to
`…/scratchpad/`:
- `probe074.config.ts` + `probe074.spec.ts`, `probe074b.config.ts` + `probe074b.spec.ts`: Playwright configs outside
  the repo (MR-069…073 pattern: repo global setup and auth setup, dev server on port 3098), 18 probes against the real
  preferences API and the real dashboard (`probe074.raw.txt`, `probe074b.raw.txt`). Probes C1-C3 scale the 15 s abort
  to 1.5 s **in the page only** (init script mapping `setTimeout(…, 15000)` to 1500 ms); everything else runs on the
  real wall clock. Probe C3c's final reload timed out on its own never-answered PUT after all its measurements were
  logged (1 of 18 marked failed for that reason only). The first run's light-theme probe did not take (the app resets
  the `<html>` class); the light figures come from the second run, which sets `ledgerium-theme` as the repo's e2e does;
- `mut074/`: copies of `savedViewsSync.ts` and `savedViewsSync.test.ts`, mutated on the **copies** only (23 mutants,
  `mut074.txt`). The copy was restored and `cmp`-checked against `mut074/orig/`;
- `val074.txt`, `guard074.txt`, `tc074.txt`, `root074.txt`, `web074.txt`, `e2e074.txt`, `status_before074.txt`: run
  outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing),
apart from this file. Every Playwright run started and stopped its own dev server; `netstat` shows nothing listening
on 3000, 3097 or 3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal). The probes seed the
test user's preferences in `beforeEach` and restore the snapshot in `afterAll` (`restore 200 views=0
cols-equal=true` in both runs; the user had 8 columns and 0 saved views before and after).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 185 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6386 | **311 files, 6386 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4582 | **259 files, 4582 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 378 rows, 255 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `saved-views-persistence.spec.ts` + `v2-a11y.spec.ts` | 41 passed | **41 passed (2.4 min)**, #366's `test.fail` (`v2-a11y.spec.ts:772`) counted as an expected failure | matches |
| deltas | web 4551→4563→4574→4582; root 6371→6378→6378→6386 | 183 +12 (7 unit + 5 picker), 184 +11 (`.tsx` only), 185 +8; e2e 36→39 (183 A-C), 39 (184 adds a step), 41 (185 two tests) | consistent |

Pool arithmetic: MR-073 recorded 126. Loops 183, 184 and 185 each struck one and filed none: **123**. Matches the
validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader (the NBSP re-announcement is checked
in the DOM only), a production build (dev runs React StrictMode, which loads the preferences twice; production loads
once), mutation of `DashboardV2Shell.tsx` and `ColumnPicker.tsx` (no shell unit tests; the call-site mutants in §5 are
judged against the e2e and picker tests by reading, and the behaviour is checked by probes instead). The revert proofs
in 183-185 are agent-reported.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** No saved-view PUT can be built
   before the baseline (183); F0 keeps focus in the drawer in every shape I built in Chromium, and the regions are the
   same DOM nodes before and after a rollback (184); the T2-500 reconcile adopts the server's list honestly, also under
   the LSS lens (185).
2. **A column edit made before the preferences GET succeeds still replaces the user's stored library pack (§2, N1).**
   183 made such an edit "win". Before the load the visible pack is the default one, so the winner is the default pack
   plus one toggle. Held GET (library), lens switch before the load, and toggle-in-error-then-Retry all replaced a
   stored 3-column pack with 7 columns; 183's own e2e C asserts the replacement. A 2xx without a list also re-opens the
   #384 loss in full (views and pack), and dev StrictMode's second load leaves UI ≠ server.
3. **A reconcile GET can adopt a state older than a change saved while it was out (§4, N2).** After a column-only
   unknown outcome, a view created during the GET vanished from the UI under "Showing what's saved", and the next save
   deleted it on the server. Narrow (it needs a 15 s hang, a failed re-send and a slow GET), but silent. Two sync
   mutants survive next to it (M10, M13).
4. **The agent was right about brand-700, and so was axe (§3).** The default theme is **dark** (`#0D1117`): the old
   hover colour green-700 measures **3.77:1** and `text-brand-700` **3.45:1** there, both axe violations when settled,
   with no transition involved. My MR-073 note on #377 ("implausible", "likelier mid-fade") was wrong, and so is #377's
   prescription (`text-brand-700`), which would break the default theme. The repo already has the right tokens:
   `--brand-text` / `--brand-text-hover` (row #222; 9.84 / 12.42 dark, 5.24 / 7.34 light). The Retry link that 183
   added carries the same `hover:text-green-700` (3.77:1, axe-flagged on hover).
5. **Ratio, loops 176-185: 0.83** (10 closed / 12 created, review-filed rows counted). Unchanged from MR-073.
6. **Governance needs two decisions now:** `frontend-engineer` has run 183-185, so **186 must rotate** or the 4+
   trigger forces an unscheduled review; and the cool-off, armed and unspent since 172 (13 loops), should be **spent at
   188 on #113** (§6).
7. **Push is still the first CEO action:** `main` is **47 ahead**; last deploy still loop 151. Alerts check failed
   again (`37136811293`); retention purge is still not running (`CRON_SECRET`).

---

## 2. Loop 183 — #384 nothing saved before the load (`d8bb782`): **HOLDS for saved views; the column half replaces the pack**

**Diff vs log:** matches. `baselineLoaded` in the sync state; `startSend` refuses before it, and both `dueSave` and
`takeQueued` go through `startSend`, so no PUT path can fire early (`persist` is reachable only from those two;
`reconcileFromServer` only after a PUT). Shell: a failed load sets `error` (`DashboardV2Shell.tsx:490-534`); saved-view
changes are refused in `scheduleSave` (`:544-546`) and in `handleSavedViewsChange` (`:782`); the drawer disables Save
and shows "Couldn't load your saved views." with Retry. Note §2 gains BaselineUnknown and T12-T14.

**Probes** (Chromium, real API; stored pack `workflow_title, health_score, run_count` and views Alpha, Beta):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| A1 | library lens, both preferences GETs held (dev StrictMode sends two); drawer shows 6 default columns; toggle one; release | 0 PUTs while held ✓; then one PUT of **7 columns** (defaults + toggle), views omitted; server pack **replaced**; views kept; the UI then showed the **old** 3-column pack (the second GET overwrote it), so UI ≠ server | **pack lost (N1)**; dev-only UI ≠ server |
| A2 | LSS restored; switch to library before the GET; toggle; release | one PUT of 7 columns; stored pack replaced | **pack lost (N1)** |
| A3 | GET slow (1.5 s) then 500; toggle in the error state; Retry | 0 PUTs in error ✓; after Retry one PUT of 7 columns; stored pack replaced; focus on Save current view ✓ | **pack lost (N1)** |
| A4 | GET held; toggle; Escape; client navigation to `/compare`; release | 0 PUTs; stored pack and views intact | ✓ |
| A5 | GET answered 200 `{"data":null,…}`; create "Zed" | drawer says "No saved views yet.", Save enabled; PUT `["Zed"]` + 8 default columns; server lost Alpha, Beta and the pack | **#384 re-opened by a 2xx without a list (N1)** |
| A6 | GET answered 200 with an HTML body | error + Retry; Save disabled; 0 PUTs | ✓ |

**Why A1-A3 happen.** The loop's column rule (T13: "a library-lens column edit made before the load wins") stores the
whole visible pack, and before the load that pack is `DEFAULT_VISIBLE_KEYS`, not the user's. The user saw defaults,
clicked once, and lost a curated pack they could not see. #384's text asked that "adopting it releases a queued column
change"; it did not ask that the change replace the pack. 183's e2e C asserts exactly this
(`expect(prefs.visibleColumns).toEqual(puts[0].visibleColumns)` over a seeded 3-column pack), and its
`isChecked() === !before` passes only because the toggled column is absent from the seeded pack while the second dev
GET shows the old pack. The fix is a delta (replay "column X on/off" onto the adopted pack) or disabled checkboxes until
the baseline is known; a preset or saved-view apply stays a whole-pack choice.

**The other questions asked:**
- *GET slow then 500 then Retry:* status goes `loading → error → loading → ready`; focus stays on Retry while loading
  and moves to Save on success (A3). ✓
- *Retry while a toggle is queued:* the toggle is released after the Retry's adoption, as a whole pack (A3, N1).
- *Lens switch before load:* switching to library shows the default pack; an edit there wins (A2, N1). Switching from
  library to LSS snapshots the queued edit and it still goes out correctly.
- *Unmount before load:* nothing is sent (A4). ✓
- *Malformed 2xx:* an unparsable body is an error (A6) ✓; a parsable body without a list is adopted as `[]` (A5). The
  real route always returns a list (`deserializePreferencesFromDb(null)` gives defaults), so this needs a proxy or a
  future route change, but it re-opens the whole #384 loss when it happens.
- *StrictMode double load:* two GETs; the second answer, arriving after the first has adopted, takes the "server pack"
  branch and overwrites the visible columns with the pre-edit pack (A1). Production loads once, but the e2e runs in dev,
  which is how test C passes by coincidence. The load should ignore a response once the baseline is loaded.
- *Can any PUT fire before the baseline?* No (A1-A6 and the mutants below).
- *Can a library edit before load be lost or wrongly win?* It wrongly wins (A1-A3).

**Limits accuracy.** "The shell's load and release path is covered by e2e only": accurate. "Retry success is not
announced": fixed at 184. The column rule is stated in the log as intended behaviour; its cost is not.

---

## 3. Loop 184 — #376 focus stays in the drawer; announcements always mounted (`7ccd086`): **HOLDS; the hover call was right**

**Diff vs log:** matches. `focusFallback` (Save current view if enabled, else the first `[data-saved-view-apply]`,
else the dialog); a list-change effect that acts only when focus is on `BODY`, null or disconnected; Cancel sets
`shouldRestoreSaveFocusRef`; `LiveRegions` renders one `role=status` and one `role=alert`, text withheld for one tick;
`announce` alternates a trailing NBSP for repeats; "Saving…" renders outside both regions.

**Probes (Chromium, real API):**

| Probe | Result | Verdict |
|---|---|---|
| B1 rolled-back create (PUT held, then 500) | at open: 1 status + 1 alert, both empty; during the flight "Saving…" is a `P` with no live ancestor; after the rollback the **same** two nodes (marked before) hold "Couldn't save your changes. Saved views were restored to your last saved list." in the alert; focus on Save current view | ✓ F0; ✓ text change on a mounted node; ✓ no "Saving…" announcement |
| B2 apply Alpha three times, then Beta | status `"Applied view: Alpha"` → `"…Alpha "` → `"…Alpha"` → `"Applied view: Beta"`; ~1 s later "Saved" (the library-lens apply PUT) | ✓ repeats change the text; whether a reader re-reads an NBSP-only change is not verified (no screen reader) |
| B3 delete Alpha while Beta shows its delete confirmation | focus on Save current view | ✓ F0 |
| B4 Save form, Cancel | focus on Save current view | ✓ |
| C2 (185 surface) reconcile removes a row with an open rename | focus on Save current view; the draft is dropped | ✓ F0; see §4 |

**NBSP:** acceptable. It is the common technique; Chromium fires a text-change event for it because NBSP does not
collapse. It needs a screen-reader spot check once (JAWS and VoiceOver de-duplicate inconsistently), not a row.

**The hover change and the contrast claim.** The drawer's background is `var(--surface-primary)`. The **default theme
is dark** (`globals.css:1-6`, `#0D1117`); light needs `ledgerium-theme=light`. Measured on the live node, settled (400 ms
after hover, so no transition), and with axe's `color-contrast` rule on the saved-views section:

| Colour on the 11 px link | Dark (`#0D1117`, default) | Light (`#F8FAFC`) |
|---|---|---|
| green-600 `#16a34a` (rest) | **5.74** pass (axe 0) | **3.15** fail (axe 3.14 on Save current view) |
| green-700 `#15803d` (old hover) | **3.77** fail (axe-flagged) | 4.79 pass |
| brand-700 `#047857` | **3.45** fail (axe-flagged) | 5.24 pass |
| `var(--brand-text)` / `var(--brand-text-hover)` | 9.84 / 12.42 | 5.24 / 7.34 |

So axe's flag after the rollback was real (the mouse rested on the re-mounted trigger: green-700, 3.77:1), not a
mid-fade sample, and the agent's "`text-brand-700` fails there" was **true** in the theme the e2e runs. My MR-073 note
appended to #377 ("implausible… likelier mid-fade") was wrong: it assumed a white surface. `hover:underline` was the
correct local fix. #377 itself is written for a white surface ("3.30:1 on white", "move to `text-brand-700`"); followed
literally it would fail the default theme. The repo solved this at row #222 with per-theme tokens. Two more instances
on the same drawer: the **Retry** link added at 183 (`ColumnPicker.tsx:719`, `hover:text-green-700`, axe 3.77:1 on hover
in dark; 3.15:1 at rest in light), and the visual "Saved" span (`:780`, 3.15:1 in light). All go to #377 (annotation).
Nothing in the e2e scans the drawer in the light theme, which is why the light failures never surfaced.

**Limits accuracy.** Accurate: rename-failed and delete-failed focus are by construction, errors use the alert region.
The hover limit ("not verified… implausible") is the part that was wrong, and it was mine.

---

## 4. Loop 185 — #380 an unknown outcome asks the server (`40b2fdc`): **HOLDS for T2-500 and the lens; a stale GET can still win**

**Diff vs log:** matches. `settleFailure` and `settleTimeout` route a failure while `reconciling` to `settleUnknown`
(no rollback; GET unless something newer is queued); `reconcileAdopt` adopts the server's list and columns unless
`dirty`, a flight, an armed timer or `pending !== sent`; `reconcileFailed` keeps the UI. The shell adopts the library
pack always and the visible pack on the library lens only (`DashboardV2Shell.tsx:584-624`).

**Probes** (Chromium, real API, 1.5 s abort in the page):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| C1 | LSS lens; create "LensView"; PUT 1 applied by the server but never answered; re-send 500 | alert "Couldn't confirm your last change. Showing what's saved."; views Alpha, Beta, LensView; LSS still selected, visible columns still the LSS pack; both PUTs carried the library pack; back on library the stored pack shows | ✓ lens rule holds (the variant the log lists as untested) |
| C2 | create "Ghost"; PUT 1 never reaches the server; open Ghost's rename and type before the re-send's 500 | the reconcile drops Ghost; the rename input unmounts with its draft; focus on Save current view | ✓ F0; the draft is lost (see below) |
| C3-view | toggle a column; PUT 1 never applied; re-send 500; the reconcile GET reads the server and is held; create "New" (PUT 200: server Alpha, Beta, New); release the held answer; create "After" | UI views become Alpha, Beta (**"New" gone**), columns revert to the old pack, under "Showing what's saved"; the next PUT sends Alpha, Beta, After: **server loses "New"** | **data loss (N2)** |
| C3c | same, but the newer change is a second column toggle | server holds 5 columns; UI shows the old pack under "Showing what's saved" | **UI ≠ server (N2)** |

**Why C3 happens.** The "newer change" test runs when the GET returns. A change that was sent and confirmed while the
GET was out leaves `dirty`, the flight and the timer clear, and when the failed PUT was column-only, `sent` and
`pending` are both `undefined`, so `pending !== sent` is false too. (When the failed PUT carried views, `pending !==
sent` happens to catch it, because `settleSuccess` clears `pending`; that guard is the one mutant M13 shows untested.)
A counter bumped by every `queueSave`, recorded before the GET and compared after, catches every order.

**The other questions asked:**
- *A list lacking a view whose rename is open:* the row unmounts and the draft is lost (C2). The note's §4 says a
  reconcile "must not replace a row whose rename input is focused with unsaved text; defer it until the editor closes";
  185 marked the cell built with "no new code". The view did not exist on the server, so dropping it is honest; losing
  the typed name is minor. Amend the note's sentence (annotation) rather than file a row.
- *A newer local change during the GET:* caught when it is still queued, in flight or a different pending list; missed
  when it already completed and the failed PUT was column-only (C3, N2).
- *Reconcile on the LSS lens:* holds (C1).
- *Column-only unknown outcome reverts visible columns:* acceptable with a decision recorded. §3(iv) rejects rolling
  back columns after a **definite** failure because the UI still holds the user's intent; after an **unknown** outcome
  the server may or may not have the columns, and showing the server's state with "Showing what's saved" is the honest
  choice (when the server applied the PUT, which is the likely timeout case, nothing visibly changes). Recommend
  recording it in §3(iv) as an explicit exception rather than changing code. The message is only true once N2 lands.
- *Two reconciles back-to-back:* while a GET is out, `reconciling` stays set, so a new PUT's 500 is also unknown and
  starts a second GET; each GET's adoption is guarded by its own `sent`. Correct when views are involved, stale in the
  column-only case for the same reason as C3; N2 covers both.
- *Reconcile then save-on-leave (#381):* #381 is not built. Its flush must send the UI state even while a reconcile
  GET is out, and the late GET must not overwrite after return; the counter from N2 gives both (annotation to #381).

**e2e accuracy.** The GET-fail test asserts `getByText('Saved views are not loaded yet')` has count 0. That string
exists nowhere in `src/`, so the line can never fail; the next line (`Save` enabled, then a create that saves) is
what actually proves the baseline stayed loaded. Replace it with a check on the real error text.

**Limits accuracy.** Accurate: the lens variant and the removed-row rename were untested (both now probed above), and
the column tension with §3(iv) is named.

---

## 5. Mutation summary (copies in `mut074/`, never the repo)

| Mutant | Tests | Result |
|---|---|---|
| M0 baseline | `savedViewsSync.test.ts` | 72/72 pass |
| M1 `startSend` without the baseline guard | sync | 2 fail (and #384 e2e C by reading) |
| M2 adoption never releases a queued column | sync | 2 fail |
| M3 adoption releases even when already loaded | sync | **survives** (only matters for a second adoption: one extra PUT) |
| M4 `baselineLoaded` never set | sync | 18 fail |
| M5 `settleFailure` without the reconciling branch | sync | 3 fail |
| M6 `settleTimeout` without the reconciling branch | sync | 1 fail |
| M7 unknown outcome always GETs | sync | 1 fail |
| M8 unknown: "newer" ignores `pending !== sent` | sync | **survives** (`reconcileAdopt` re-checks the timer; equivalent) |
| M9 unknown: "newer" ignores `dirty` | sync | **survives** (a deferred column change would be dropped: the GET path never calls `takeQueued`) |
| M10 unknown: `reconciling` cleared | sync | **survives** (a failure of the queued newer PUT becomes a definite failure: rollback + "restored", the MR-072 T2-500 bug again) |
| M11 adopt: ignores in-flight | sync | 1 fail |
| M12 adopt: ignores armed timer | sync | 1 fail |
| M13 adopt: ignores `pending !== sent` | sync | **survives** (the only guard for a view saved while the GET was out) |
| M14 adopt: ignores `dirty` | sync | **survives** (equivalent: `dirty` without a flight does not persist) |
| M15 adopt: server columns ignored | sync | 1 fail |
| M16 adopt: `pending` kept | sync | 1 fail |
| M17 newer: `confirmed` not refreshed | sync | 1 fail |
| M18 newer: `reconciling` kept | sync | **survives** (harmless: one more GET on the next failure) |
| M19 adopt: `reconciling` kept | sync | 1 fail |
| M20 `reconcileFailed` keeps `reconciling` | sync | 1 fail |
| M21 column-only success keeps `reconciling` (= MR-072 S6) | sync | 1 fail: **185's "S6 killed" holds** |
| M22 adopt always | sync | 2 fail |
| shell: no `scheduleSave` pre-baseline guard | e2e + picker tests (by reading) | **survives** (every caller is guarded upstream: `handleSavedViewsChange`, the disabled picker, `shouldPersistColumnEdit`) |
| shell: no `handleSavedViewsChange` guard | by reading | **survives** (the picker disables Save) |
| picker: Save not disabled before the baseline | e2e A/B `toBeDisabled`, `ColumnPicker.baseline.test.tsx` | killed |
| shell: a failed load adopted instead of `error` | e2e B (error text) | killed |
| shell: reconcile adopts visible columns on a lens | none (by reading) | **survives** (probe C1 shows the code is right; no test pins it) |

The two that matter are M10 and M13; both go into N2's tests. M9 shows the GET path relies on `settleUnknown` never
returning `reconcile` with a deferred save; a comment or a test there would pin it.

---

## 6. Governance

**Selection.**
- **183** `burn-down` #384 (11), MR-073's first pick, `frontend-engineer`. ✓
- **184** `burn-down` #376 (10), MR-073's second pick, taken over #385 (11) on the note's dependency, as MR-073 §11
  planned and logged. `ux-designer` not re-invoked because the build follows the UX-edited table: acceptable. ✓
- **185** `burn-down` #380 (11), MR-073's third pick, with the lens clause. ✓
- The cool-off stayed at 3/3 in all three (an 11 follow-up was open each time), as MR-073 §11 instructed.

**Agents / Area.** `frontend-engineer` at 183, 184 and 185: **three in a row**. A fourth at 186 fires the
"same implementing agent 4+" early trigger and forces an unscheduled review, so **186 must use another agent**. Area
labels were `web-app / dashboard`, `web-app / a11y`, `web-app / dashboard`, which keeps the three-in-a-row rule from
firing, but all three loops' primary files are in `components/dashboard-v2/` (`savedViewsSync.ts`, `ColumnPicker.tsx`,
`savedViewsSync.ts`), and so were 181, 177, 175 and 174: **7 of the last 12 loops.** MR-073 flagged exactly this
relabelling risk. Practice (no CLAUDE.md change): for the saturation check, count the primary directory as well as the
label; three consecutive primaries in one directory means the next loop leaves it. 186 leaves it anyway.
D-4: clause 1 not reached (183: 1 string; 184: 2 screen-reader strings; 185: 1). Clause 2: no module ≥ 200 LOC.

**The cool-off (watch item from MR-073): spend it.** Armed since 172, unspent for 13 loops, because the rule "do not
spend it while an 11 follow-up is open" never clears: every review files 11s (this one too). That makes the resource
dead and leaves the audit 11s (#113, #85, #96, #103, #106, #114, #137, #174) without a path. MR-004 Change B's concern
was spending it on a pick burn-down would have made anyway; a tie at 11 between an audit row and a follow-up is not
that case, because burn-down would never pick the audit row. **Verdict: spend it at 188 on #113** (pricing table
semantics, 11, `frontend-engineer`): it ties the top follow-ups, is live for every screen-reader user of the public
pricing page, and moves the work off the dashboard drawer. Practice going forward: once the cool-off has been armed
for 10 loops, a tie between the top audit row and the top follow-up may be broken in the audit row's favour.

**Primary-file and validation lines:** present in all three entries, with e2e run, port check and stash restore named.
Eighth consecutive window.

**Density / follow-ups:** none filed by 183-185.

**Ratio, loops 176-185** (same method as MR-069…073: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #362 (176), #374 (177), #375 (178), #365 (179), #379 (180), #383 (181), #378 (182), #384 (183), #376 (184), #380 (185) |
| Created | 12 | MR-071 #374-#376 (filed after 176), loop 179 #377, MR-072 #378-#379, loop 180 #380-#383, MR-073 #384-#385 |
| Ratio | **0.83** | above the ≥ 0.5 floor. From the canonical Follow-ups lines alone: 10 / 5 = 2.0 |

This review files two rows; if 186-188 close three, window 179-188 reads about 0.9.

**D-1.** Last extension touch `871e29a` (2026-09-24): **142 loops** at 185. Every entry logs "user-ack outstanding
(CEO queue item 21)". The line has become boilerplate, and boilerplate trains readers to skip it. Recommendation: ask
the CEO one binary question and stop repeating the line until it is answered. (a) **Ack the freeze**: log the counter
only, with no ack line, until MR-064's gate lifts. (b) **Authorize one config-only loop** under
`packages/segmentation-engine` (row #29: `pnpm --filter` reports "No test files found" and exits 0), validated by the
real-extension harness as the invariant requires; that clears D-1 without touching runtime code. Put it in the CEO
queue as item 21 with those two options.

**Staleness (next oldest open rows after MR-073's set), checked at `40b2fdc`:**

| Row | Score | Born | Check | Verdict |
|---|---|---|---|---|
| #38 | 7 | M3@016→17 | the hard-coded fallback moved: `lib/stripe.ts:155` `APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'`; still true | **keep** at 7; update the location |
| #39 | 6 | M3@016→17 | `UpgradeButton.tsx:94` still sets a 1.5 s redirect timer with no cleanup, so a user who leaves is pulled back | **keep** at 6 |
| #42 | 8 | iter 020 | v1 `computeHealthScore` still has two consumers (`api/workflows/route.ts:605`, `api/workflows/[id]/route.ts:141`), and the v1 dashboard (`?v2=0`) exists until #57, which is CEO-gated | **re-status: blocked on #57** |
| #43 | 9 | iter 020 | `computeInsightChips` (`workflow-metrics.ts:725`) still has no stale input and emits no stale chip | **keep** |
| #44 | 9 | iter 020 | MR-064's "re-score pending rewrite (~6)" is still unapplied ten reviews later. The shell's `?sort=health_score` (`DashboardV2Shell.tsx:370`) is silently ignored (`route.ts:416-423`) and the list sorts client-side | **rewrite and downgrade to 6**: "drop the dead `sort` parameter from the shell's request, or support it" |

Pool-level cold-pool triage remains deferred on the CEO's P-1 ruling; unchanged.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 47]`; every suite green at `40b2fdc`. Loops 152-185 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Alerts check` (`37136811293`, `37120578937`), `Alerts heartbeat` (`37126465679`) and `Retention purge` (`37112966310`) fail on the missing `CRON_SECRET` and URL variables; deleted workflows are not purged |
| 21 | D-1 | the binary question above |
| #278 / #355 / #385 | PostHog before a key | unchanged |
| #225, #357, 19 / 22 / #347, P-1 | unchanged | |

---

## 7. Two patterns worth naming

**A contrast claim names its theme.** #377 (loop 179) measured "3.30:1 on white"; MR-072 corrected it on the same
assumption; MR-073 and loop 184's coordinator note called the agent's dark-theme observation "implausible". Three
reviews reasoned about a white surface in a product whose default is dark, and the one party that measured (axe, on
the live dark page) was overruled by arithmetic. Practice: any contrast figure in a row, log or review states the theme
and the surface token, and a recommended colour is a theme token (`--brand-text`), not a palette step, unless both
themes are measured.

**"Wins" and "adopts" are where the save machine keeps losing data.** #384 (a save before the load), N1 (an edit
before the load wins), A5 (a list-less 2xx adopted), N2 (a stale GET adopted) and MR-072's T2-500 are the same mistake:
writing or adopting a whole document whose base is unknown or stale. The note's state machine lists states but not the
rule that would have caught all five. Recommend adding one line to the design note's §2: "Never send or adopt a whole
pack or list unless its base is known and nothing local changed since that base was read (baseline flag + local edit
counter)." N1 and N2 then implement one rule, not two patches.

---

## 8. Part C — top open non-blocked rows

**Method:** as MR-073 (blocked/awaiting/parked excluded; #157, #127, #152, #159, #160 excluded as malformed or
CEO-gated). New rows from §9 included. Verified at `40b2fdc`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** a pre-load column edit replaces the stored pack | 11 | follow-up | **true** | probes A1-A3, A5 |
| 2 | **N2** a stale reconcile GET adopted | 11 | follow-up | **true** (rare) | probes C3-view, C3c; M10, M13 |
| 3 | #385 PostHog path tokens | 11 | follow-up | true (dormant) | `posthog-privacy.ts` unchanged since `49137a1` |
| 4 | #368 saved views capture filters | 11 | audit | true; **order after N1 and N2** (filters would ride the same adoption paths) | `currentFilters={[]}` at `DashboardV2Shell.tsx:1624` |
| 5 | #113 pricing table semantics | 11 | audit | true | cool-off pick (§6) |
| 6 | #85, #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only |
| 7 | #377 green text after the brand move | 10 | follow-up | **true, prescription wrong** (§3) | needs the theme-token rewrite |
| 8 | #381 save on leave | 10 | follow-up | true | unmount still clears the timer |
| 9 | #366, #355 | 10 | follow-up | true | unchanged |
| 10 | #371 | 9 | follow-up | true | route unchanged |
| 11 | #382 revision/409 | 8 | follow-up | true; last | read-then-upsert unchanged |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **A column edit made before the preferences GET has succeeded replaces the user's stored library column pack with the default pack plus that edit.** MR-074 §2. Loop 183 (#384) stopped saved-view writes before the baseline, but its rule "a library-lens column edit made before the load wins" (`DashboardV2Shell.tsx:499-503`, design note T13) stores the whole visible pack, and before the load the visible pack is `DEFAULT_VISIBLE_KEYS`, not the user's. Measured on the real API with a stored 3-column pack and two views: (A1) library lens, GET held, one checkbox toggled: one PUT after the load carried 7 columns (the 6 defaults plus the toggle) and the stored pack was gone; (A2) LSS lens restored, switched to library before the GET, toggled: same; (A3) GET 500, toggled in the error state, Retry: same. Views were kept in all three. Loop 183's own e2e (`saved-views-persistence.spec.ts`, #384 test C) asserts this replacement as intended. Two smaller holes on the same path: a 2xx whose body has no `data.preferences` is adopted as `[]` with the default pack (probe A5: creating 'Zed' left the server with only 'Zed' and the default columns, the full #384 loss), and a second load answer after the first has adopted (dev StrictMode loads twice) overwrites the visible columns with the pre-edit pack, so UI and server disagree (A1). Fix: record a pre-load toggle as a delta (column on or off) and replay it onto the adopted pack, or disable the column checkboxes until the baseline is known as the saved-view controls are; a preset or saved-view apply stays a whole-pack choice. Treat a 2xx without a `savedViews` array as a load error. Ignore a load answer once the baseline is loaded, and abort the load on unmount. Tests: rewrite #384 test C to expect the stored pack plus the toggle; unit tests for the delta replay; e2e for the list-less 2xx. Update the design note's T13. Follow-up of loop 183 (#384). | fix | web-app / dashboard | `frontend-engineer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| **N2** | **A reconcile GET can adopt a server state older than a change saved while the GET was out: the UI drops a new saved view under "Showing what's saved", and the next save deletes it on the server.** MR-074 §4. `reconcileAdopt` (`savedViewsSync.ts:215-236`) detects a newer local change by `dirty`, a flight, an armed timer or `pending !== sent`, checked when the GET returns. A change that was sent and confirmed while the GET was out leaves all four clear when the failed PUT was column-only (`sent` and `pending` both undefined). Measured in Chromium on the real API: a column toggle whose PUT never answered and whose re-send got a 500 started the reconcile GET; its answer was read and held; meanwhile 'New' was created (PUT 200, server views Alpha, Beta, New); the held answer then replaced the UI list with Alpha, Beta and the columns with the old pack; the next create sent Alpha, Beta, After, and the server lost 'New' (probe C3-view). With a second column toggle instead, the UI showed the old pack while the server held 5 columns (C3c). Rare (a 15 s hang, a failed re-send and a slow GET), but silent. Fix: a local edit counter in the sync state, bumped by every `queueSave`; `reconcileFromServer` records it before the GET and adopts only if it is unchanged and nothing is in flight, otherwise it refreshes `confirmed` only. Tests: unit tests for the counter; the two surviving mutants of MR-074 §5, M10 (clearing `reconciling` in `settleUnknown` fails nothing: a failure of the queued newer PUT must not roll back or say restored) and M13 (dropping `pending !== sent` in `reconcileAdopt` fails nothing); e2e for C3-view. Record in the design note's §3(iv) that an unknown column-only outcome shows the server's columns (an explicit exception to no column rollback). Follow-up of loop 185 (#380). | fix | web-app / dashboard | `frontend-engineer` | 2 | 4 | 2 | 5 | 1 | 1 | **11** |

**Annotations recommended:**
- **#384 closure note:** "[MR-074: holds for saved views: no PUT before the baseline in any probe (held GET on library and LSS, 500 then Retry, unmount before load, HTML 2xx). The column rule does not hold: a pre-load toggle replaces the stored pack with the default pack plus the toggle (held GET, lens switch, error then Retry), and test C asserts it (N1). A 2xx without a list is adopted as an empty baseline and re-opens the loss (N1). The new Retry link uses hover green-700, 3.77:1 in the default dark theme (#377).]"
- **#376 closure note:** "[MR-074: F0 verified in Chromium for the rolled-back create, the neighbour-confirming delete, Cancel and a reconcile-removed row. Both regions are mounted empty at open and are the same nodes after a rollback; 'Saving…' has no live ancestor; repeat applies alternate an NBSP (screen reader not checked). The hover change was right: axe's flag was real (green-700 on the dark default, 3.77:1, settled), and brand-700 is 3.45:1 there, so the agent's claim was correct and the coordinator's 'implausible' note was not.]"
- **#380 closure note:** "[MR-074: T2-500 and the LSS-lens variant hold on the real API (lens pack kept, library pack adopted). A reconcile GET can adopt a state older than a change saved while it was out: a new view vanished and was deleted by the next save (N2). A reconcile-removed row drops an open rename draft, against the note's defer sentence. The GET-fail e2e line asserting 'Saved views are not loaded yet' is vacuous (no such text exists). Mutants M10 and M13 survive.]"
- **#377 append:** "(MR-074) Correction to the loop 184 note and to (1): the default theme is dark (`#0D1117`). There green-600 passes (5.74:1) while green-700 (3.77:1) and brand-700 (3.45:1) fail, axe-confirmed; in light (`#F8FAFC`) green-600 fails (3.15:1) and green-700 (4.79:1) and brand-700 (5.24:1) pass. So the agent was right and `text-brand-700` is the wrong fix. Use the per-theme tokens from row #222: `text-[var(--brand-text)] hover:text-[var(--brand-text-hover)]` (9.84 and 12.42 dark, 5.24 and 7.34 light). Add the Retry link (`ColumnPicker.tsx:719`, hover green-700 added at loop 183) and the visual Saved span (`:780`). Run the computed-contrast and axe checks in both themes; nothing scans the drawer in light today."
- **#381 append:** "(MR-074) During a reconcile GET the leave flush should send the UI state (the intent), and a GET answering after the user returns must not overwrite a newer state; reuse N2's edit counter for both. With N1, compare against the adopted pack, not the pre-load default."
- **#368 append:** "(MR-074) Current line `DashboardV2Shell.tsx:1624`. Pick after N1 and N2: filters would ride the same load-adoption and reconcile-adoption paths."
- **Design note (`SAVED_VIEWS_DESIGN.md`) header:** add a "Status after loop 185" paragraph: T7 built; the F0 sentence on deferring a reconcile while a rename is open does not match the built behaviour (decide: defer, or delete the sentence); T13's column rule is replaced by N1; add the §7 one-line rule (no whole send or adoption without a known, unchanged base); record the unknown-outcome column exception in §3(iv) (N2).
- **#44:** rewrite to one sentence ("drop the dead `sort` parameter from the shell's `/api/workflows` request at `DashboardV2Shell.tsx:370`, or support it in the route") and downgrade 9 → 6 (I 2→1, A 4→3, L 1, C 5, E 2, R 1→2).
- **#42:** re-status "blocked on #57 (v1 consumers at `api/workflows/route.ts:605` and `[id]/route.ts:141`)".
- **#38:** update the location to `lib/stripe.ts:155`; keep at 7.

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 probes A1-A3: a pre-load toggle replaces the stored pack; test C asserts it | N1 |
| §2 probe A5: a list-less 2xx adopted as the baseline | N1 |
| §2 StrictMode's second load overwrites the visible pack | N1 |
| §4 probes C3-view and C3c: a stale reconcile GET adopted | N2 |
| §5 M10 and M13 survive | N2 |
| §3 dark-theme contrast: the agent was right; #377's fix is wrong for the default theme; Retry and Saved span | #377 append, #384 and #376 notes |
| §4 rename draft dropped vs the note's defer sentence; vacuous e2e line | #380 note, design-note header |
| §4 the column exception to §3(iv) | N2, design-note header |
| §4 reconcile and leave flush | #381 append |
| §8 #368 order | #368 append |
| §6 staleness: #38, #42, #44 | location, re-status, rewrite and downgrade |
| §6 D-1 boilerplate | CEO queue item 21 (no row) |
| §6 cool-off verdict, directory saturation | practice (no row) |
| §7 contrast names its theme; one adoption rule | practice; design-note header |

---

## 11. Loop 186-188 picks

**Before 186: push** (CEO item 1), set `CRON_SECRET` and the URL variables (item 4), and answer the D-1 question
(item 21).

Pool 123 + 2 = 125 > 8, so burn-down, except where the cool-off is spent.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **186** | **#385** PostHog: share token and email path segments | **11** | `burn-down` (follow-up of 182) | `analytics` | analytics / privacy | **forced rotation**: a fourth `frontend-engineer` loop fires the 4+ trigger; also leaves `dashboard-v2/` after three primaries there. Dormant harm, but it is the PostHog precondition and the only 11 with another agent |
| **187** | **N1** a pre-load column edit replaces the stored pack | **11** | `burn-down` (follow-up of 183) | `frontend-engineer` | web-app / dashboard | live, more likely than N2 (any toggle during a cold start or the error state), small; rewrites a test that currently asserts the loss |
| **188** | **#113** pricing table semantics (the MR-065 re-scope: `scope`, caption, category rows, text for "—", `role="img"`) | **11** | `top-score` via `ceiling-cool-off: invoked` | `frontend-engineer` | pricing-page / a11y | §6 verdict: armed 13 loops, ties the top follow-ups, live for every screen-reader user of the pricing page, and moves the work off the drawer. Log `ceiling-cool-off: invoked; rationale: armed since 172; audit row ties the top follow-up at 11` |

- **Then MR-075** (base cadence after 188), then **189: N2** (`frontend-engineer`, 11; rare but silent loss; must
  precede #368), then #368 (`growth-strategist` adjacent), #377 rewritten with theme tokens, #381, #382.
- **Agents:** 186 `analytics`; 187-188 `frontend-engineer` (2 in a row); 189 makes 3, so 190 must rotate.
- **Area:** 186 analytics, 187 dashboard, 188 pricing: no repeat. By directory, 187 is the only `dashboard-v2/`
  primary in the window.
- **Alternative:** if the CEO prefers live dashboard data over the pricing page, N2 at 188 and #113 (cool-off) at 189;
  the agent count is the same.
- **Do not pick:** #368 before N1 and N2; #377 as written (use the theme tokens); #382 before #381; #145, #142, #170,
  #175 (blocked); #114 before #137; #159/#160 (CEO); #29 without the CEO's D-1 answer (extension surface).
- **Practice:** a contrast figure names its theme (§7); count the primary directory in the saturation check (§6).

---

## 12. Verdict

Every count reproduces at `40b2fdc`: root 6386, web-app 4582, typecheck 0, validator clean (open 123), guard runner
142/142, e2e 41 passed (one of them #366's expected failure).

- **Loop 183 holds for saved views.** No PUT before the baseline in any order I could build. Its column rule replaces
  the stored pack with defaults plus the edit, and its test asserts that; a list-less 2xx re-opens the full loss (N1, 11).
- **Loop 184 holds.** F0 and the always-mounted regions work in Chromium. The hover fix was right and the coordinator's
  doubt was wrong: in the default dark theme green-700 and brand-700 both fail; #377 needs theme tokens.
- **Loop 185 holds for T2-500 and the lens.** A reconcile GET that answers after a newer save can still adopt stale
  state and delete a view (N2, 11); two sync mutants survive next to it.

Selection followed MR-073's order exactly; validation and primary-file lines are in every entry; ratio 0.83. Asks for
the CEO: push; configure `CRON_SECRET` and the job URLs; answer D-1 once (ack the freeze, or allow one config-only
loop for #29). For the coordinator: rotate at 186, spend the cool-off at 188.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6386 / 4582 / 0
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/saved-views-persistence.spec.ts e2e/app/dashboard/v2-a11y.spec.ts)   # 41 passed
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe074.config.ts)
   # A1-A3: pre-load toggle -> PUT of 7 columns, stored pack replaced; A5: list-less 2xx -> ["Zed"] + defaults
   # B1-B4: F0, same region nodes, NBSP; B5: green-700 3.77 and brand-700 3.45 on #0D1117 (axe-flagged)
   # C1: lens reconcile holds; C2: rename draft dropped; C3-view: "New" lost after a stale reconcile GET
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe074b.config.ts)
   # light theme: green-600 3.15 (axe 3.14); Retry hover 3.77 in dark; C3c: UI old pack, server 5 columns
node $S/mut074/run.mjs $S/mut074                                                   # 23 mutants; M3 M8 M9 M10 M13 M14 M18 survive
gh run list --limit 8                                                              # CRON_SECRET failures
git log origin/main..main --oneline | wc -l                                        # 47
```
