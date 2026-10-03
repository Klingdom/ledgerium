# MR-069 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 168-170, 2026-10-02 23:49 → 2026-10-03 00:13 (−0600). Commits `3e0c694` (loop 168, #361),
`4180643` (loop 169, #105), `a5eed1f` (loop 170, #367). Previous review MR-068 at `bf2a45b`. Rows closed: #361, #105,
#367. Rows filed by loops: #365, #366, #367 (loop 169). Row promoted: #368 (loop 170, Audit-Intake clause 4).
**Why now:** base cadence, 3 of 3 since MR-068 (`ITERATION_LOG.md`, loop 170 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Every row, strike or annotation below is a
recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `lru069.mjs`, `touch069.mjs`, `touch069b.mjs`: `BoundedLru` mirror at `a5eed1f`, heap after GC (`--expose-gc`), keys
  derived as `getClientIp` derives them; `%DebugPrint` of stored keys;
- `probe069.config.ts` + `probe069.spec.ts`: a Playwright config outside the repo (absolute paths; reuses the repo's
  global setup, auth setup and dev-server command on port 3098) running 5 probes against the real preferences API and
  the real drawer;
- `e2e1.txt`, `probe069.txt`, `val069.txt`, `guard069.txt`, `root069.txt`, `web069.txt`, `tc069.txt`,
  `status_before.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. Both Playwright runs started and stopped their own dev server; `netstat` shows nothing listening on
3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal); the probes snapshot the test user's
preferences and restore them (`restore 200`).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 170) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6282 | **303 files, 6282 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4449 | **247 files, 4449 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 361 rows, 240 struck, **open 121** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `v2-a11y.spec.ts` + `saved-views-persistence.spec.ts` | 26 + 3 expected failures; 4 passed | **28 passed (1.5 min)**: 2 setup, 2 persistence, 21 a11y passes, 3 marked `x` (expected failures) | matches |
| deltas | web 4431→4435→4436→4449 | 168: +4; 169: +1 (E7); 170: **+13** (6 `it` + one 7-case `it.each`; the log says "12 new") | consistent; one miscount |

Pool arithmetic: MR-068 recorded 116 and filed #361-#364 (+4) = 120; loop 168 struck #361 = 119; loop 169 filed
#365-#367 (+3) and struck #105 = 121; loop 170 struck #367 and promoted #368 = **121**. Matches the validator.

**Not run:** CI (nothing has been pushed since loop 151), Node 20 (CI's version; only Node 24 is installed here),
Firefox/WebKit, a screen reader. Revert proofs ("old LRU fails 3", "12/23 route tests fail", "removing the guard fails
E4") are agent-reported and were not re-run.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** 168 really bounds key memory; 169
   really scans the drawer, rail and saved views in Chromium; 170 really persists saved views on the server.
2. **Loop 170's feature still loses saved views, through the client (§4, N1).** `scheduleSave` debounces every PUT by
   400 ms and cancels the pending one. Creating, renaming or deleting a view and then, within 400 ms, toggling a column,
   applying a preset or applying a saved view replaces the pending PUT with one that has **no `savedViews` field**, which
   the server (correctly, by design) treats as "keep the stored list". Probed in a real browser: one PUT sent, without
   `savedViews`; the UI shows the view; the server has `[]`; after reload the view is gone. The route-level fix is right;
   the row's user outcome ("saved views stay saved") holds only when the user pauses.
3. **Escape inside the drawer's inner editors closes the whole drawer (§3, N2).** The rename input, the new-view name
   input and the delete confirmation each handle Escape with `preventDefault()` only; the drawer's document listener
   ignores `defaultPrevented` and closes. Probed: drawer open count 0 after Escape in all three. Loop 169's own test
   works around it ("Escape above may have closed the whole drawer … reopen if needed") instead of filing it: the
   MDR-P08 double-dismiss class, again, in a new component.
4. **#368 is half stale (§5).** Its preset half shipped at `db5959d` (2026-06-16, `handleApplyPreset` →
   `setPresetFilters`). Its saved-view half is a no-op as written: the shell passes `currentFilters={[]}` to the picker
   (`DashboardV2Shell.tsx:1427`), so every saved view is created with empty filters, and restoring them on apply
   restores nothing. The capture half is cold-pool item WDC2-R36, which was not promoted. Amend before scheduling.
5. **Loop 168 holds, and the copy is flat.** `Array.from(key).join('')` produces a flat sequential string in V8 (Node
   24): 20k keys cut from 12 KB headers hold 2.7-3.2 MB, against 232 MB uncopied. `touch` does copy, and must: without
   the copy the touch path alone retains 230 MB. **No test covers the touch path**, so that copy can be deleted with
   every test green (annotation on #360). Cost: ~0.8 µs per 64-character key, ~0.2 µs per IPv4.
6. **Loop 169's `test.fail` pins hold today, loosely.** All three expected failures are `color-contrast` (serious) and
   nothing else (drawer 7 nodes, save form 1, active chip 1), so they flip when fixed. But `test.fail` passes on *any*
   failure, and in "3b" it is declared before the preconditions, so a renamed button would also pass silently.
7. **Ratio for loops 161-170 is 0.47: below the 0.5 floor for the first time since MR-011 (§6).** 8 closed / 17
   created. Reviews filed 13 of the 17. MR-068 predicted this.
8. **Push is still the first CEO action.** `main` is **27 ahead**; the last deploy is loop 151 (`37088974348`); the
   "Alerts check" is still failing (`37099623595` newest). None of 165-170 has run in CI, including 168's heap tests,
   which use `v8.setFlagsFromString('--expose-gc')` and will meet Node 20 there for the first time.

---

## 2. Loop 168 — #361 limiter key memory (`3e0c694`): **HOLDS**

**Diff vs log:** matches. `normalizeKey` maps any key over 64 characters to `OVERLONG_KEY = '__overlong__'`; every
stored key goes through `flatCopy` on `set` and on `touch`; the comment in `analytics-ingest-buckets.ts` is corrected.
Both of the row's options were taken, with a reason (short keys cut from a huge header also leak), which the
measurement below confirms.

**Is the copy flat?** `lru069.mjs`, Node 24.20, heap after two GCs, 20,000 keys at capacity, map kept live:

| Key shape (all through `split(',')` → `trim()` → first entry) | Heap |
|---|---|
| A. 40-char entry, 12 KB tail (shipped `flatCopy`) | 2.7 MB |
| B. 64-char entry, 12 KB tail (shipped) | 3.2 MB |
| C. 40-char entry padded by 6 KB of spaces each side, trimmed (shipped) | 2.7 MB |
| D. Latin-1 `é` entry inside a 12 KB `é` header (shipped) | 2.7 MB |
| E. two-byte U+4E00 entry (not reachable through Node headers; control) | 3.5 MB |
| F. **no copy** (control) | **232.4 MB** |
| H. 12 KB entries (overlong bucket) | 0.0 MB, size 1 |

`%DebugPrint` on stored keys confirms the uncopied case stores the 40-character key while retaining the 12 KB parent
(`touch069b.mjs`: 231.6 / 230.5 MB for set-new and delete-then-set). `Array.from(...).join('')` preserves identity
(lone surrogates included), so no key changes meaning.

**Does `touch` copy?** Yes: `delete(k)` then `set(flatCopy(k), v)`. It has to: after `delete`, a plain `set(k)` stores
the request's sliced key. Mutation in the mirror (`touch069.mjs`): copy on touch 0.9 MB, no copy on touch **230.5 MB**.
The heap tests in `analytics-ingest-buckets.test.ts` call only `lru.set`; the touch test uses short literals. So the
touch copy is unguarded (annotation on #360, which will reuse this module and add tests anyway).

**Cost.** `flatCopy`: ~830 ns for a 64-character key, ~230 ns for an IPv4 string, measured over 100k keys. The full
`touch`+`set` path with evictions averaged ~10 µs per op including GC. Negligible per request.

**Heap tests in CI.** Three runs here: 16/16 each, ~1.4 s of test time, the heap cases ran (not skipped). Robustness:
- vitest uses `pool: 'forks'` (both configs), so each file's heap is its own process. ✓
- The threshold is 25 MB against a measured 2-5 MB and a 230 MB failure: a 5× margin, wide enough for GC noise. ✓
- `lru` is used after the measurement, so it cannot be collected early. ✓ (MR-069 made exactly that mistake in its
  first mirror run and got −2.5 MB.)
- `it.skipIf(!gc)` means that if the flag trick stops working (a Node upgrade, `--no-expose-gc` hardening) the tests
  **skip silently** rather than fail. Acceptable, but worth one line in the guard manifest or a test that asserts `gc` is
  available under the repo's own config.
- Not yet run on Node 20 (CI). The trick works there in principle; it is unverified.

**Limits stated by the loop** (transient allocation per hostile request; literal `__overlong__` shares the bucket) are
accurate.

---

## 3. Loop 169 — #105 axe coverage (`4180643`): **HOLDS; one defect worked around, not filed**

**Diff vs log:** matches. Eight new e2e tests, `assertAxeCompliance` gains a scope parameter (default `'main'`, so the
older scans are unchanged), `detectActivePreset` moves to `presets.ts` (byte-identical logic) with the mirror deleted
and E7 added, and three structural fixes in `ColumnPicker.tsx`.

**Run:** 28 passed, three of them `x` (expected failure). The twin test (all rules except contrast, scoped to the
dialog) passes, so the three structural violations really are gone.

**Structural fixes, semantics.**
- The column container is now `role="group"` named "Available columns", holding one `<section aria-label="… columns">`
  per column group, each holding an unnamed `role="list"` of `role="listitem"` rows. That is valid ARIA and reads
  better than before (a list whose children were sections). Nit: the inner lists could take `aria-labelledby` from the
  group's `h3`; the seven named `<section>`s become region landmarks inside a modal, which some screen readers announce
  as noise. Not filed.
- The lock indicator is `role="img"` with `aria-label` and `title`; its icon is `aria-hidden`. ✓
- No test or selector elsewhere depended on the old `role="list"` (grep: only the saved-views list and the new group
  are queried by role).

**`test.fail` pins.** Probe P5 ran the same three scans and listed every critical/serious/moderate violation:

| Scan | Violations |
|---|---|
| drawer open, scope `main` (#366) | `color-contrast` (serious) × 7 nodes, nothing else |
| save form, scope Saved views (#365) | `color-contrast` (serious) × 1 |
| active chip, scope `main` (#365) | `color-contrast` (serious) × 1 |

So each expected failure is exactly the tracked defect, and each will flip red when it is fixed. Weaknesses:
- `test.fail` accepts any failure. In tests 1 and 2c it is declared after the structural expectations, which therefore
  still fail the test if broken. In **3b it is the first statement**, so a broken locator, a disabled Save button or a
  timeout would all count as the "expected" failure.
- The 2c and 3b scans have no contrast-disabled twin, so a new non-contrast violation in the rail or the save form
  would hide behind the expected failure until #365 lands. The drawer has a twin; these two do not.
- The code TODOs say "row #105a" / "#105b"; the rows are #365 / #366. The test titles carry the link; the tags do not.
- `#365` lists two instances; there is a third white-on-green-600 badge, the active-filter count in
  `UnifiedToolbar.tsx:211` (10 px), which no axe test reaches because it only renders with active filters.
All four go into the #365/#366 annotations (§8), not new rows.

**`detectActivePreset` + E7.** Logic unchanged; one implementation now. E7 reverses `automation_candidates`'s column
order with the same visible set and expects `null`; with the order comparison removed the function would return the
preset, so E7 does catch that mutation (by reading; the agent's mutation result not re-run).

**Escape (N2).** `ColumnPicker.tsx:223-233` (rename) and `:431-440` (new-view name) handle Escape with
`e.preventDefault()` and close only their editor; the drawer's document listener (`:589-601`) calls `onClose()` for
every Escape without checking `e.defaultPrevented`. Probe P4 in Chromium: Escape in the rename input → drawer closed;
Escape in the name input → drawer closed; Escape on the delete confirmation → drawer closed. The intended behaviour,
by the project's own MDR-P08 rule ("innermost first"), is to cancel the inner editor and keep the drawer. Loop 169's
saved-views test contains the comment "Escape above may have closed the whole drawer (document-level Escape handler),
so reopen if needed": it observed the defect and routed around it. That is the one process miss in an otherwise
strong loop.

**#367 discovery.** Credit where due: 169 found the persistence bug because it read the route instead of trusting the
mocked PUT. That is the most valuable output of the window.

**density-response.** Three rows created, so clause 3 fired; `scope-guard-adjacent` with a reason per row (design token
decision for #365/#366, a different route and outcome for #367). Valid under clause 4. The loop also fixed three
structural violations in product code outside the row's stated touch set and flagged it: same Area, same outcome
("the drawer passes axe"), allowed.

---

## 4. Loop 170 — #367 saved views persist (`a5eed1f`): **HOLDS at the route; the client can still drop the write**

**Diff vs log:** matches, except the test count (13, not 12). The route accepts optional `savedViews`, validates it, and
replaces the list only when the field is present; `createdAt` is server-owned; writes are keyed by session user.

**Route probes** (P1, real dev server, real DB, authenticated test user):

| Input | Result | Assessment |
|---|---|---|
| 10 views / 11 views | 200 / **400** "At most 10 saved views are allowed" | ✓ |
| name 64 / 65 chars | 200 / **400** | ✓ |
| 64 chars plus surrounding spaces | 200, stored trimmed (64) | ✓ |
| 32 emoji (64 code units) / 33 emoji (66) | 200 / 400 | limit is in UTF-16 code units |
| 6 family emoji (6 graphemes, 66 code units) | **400** | a short-looking name is rejected; the client's `maxLength` counts code units too, so the user cannot type it either. Consistent; not filed |
| lone surrogate, RLO + zero-width, zero-width only | 200 each | a name that renders empty or reversed is accepted; cosmetic, own row only. Not filed |
| whitespace only | 400 | ✓ |
| `<img onerror>` | 200, stored as text | React escapes on render ✓ |
| duplicate ids / duplicate names | 400 / 200 | ✓ / acceptable |
| unknown column key inside a view | 200, key dropped | as documented |
| empty or duplicated columns inside a view | 200, stored as sent | applying such a view sets the dashboard to it; low |
| unknown top-level key, missing `columnOrder`, missing view fields, `savedViews: null` | 400 each | ✓ |
| bad operator, extra key, 257-char string, object as scalar | 400 each | ✓ strict filters work |
| range `min > max`, `startIso: "not-a-date"` | 200 | stored; evaluation treats them as no-match. Low |
| client `userId` | ignored | ✓ |
| `createdAt` in 2999, new id | replaced by server time | ✓ |
| `__proto__` and `constructor` keys inside a view | 200, keys stripped (zod) | ✓ |
| `__proto__` inside a strict filter value | 400 unrecognized key | ✓ |
| 100,000-deep nested array in an extra key | 200 (parsed, then stripped) | V8's JSON parser is iterative; no crash ✓ |
| **largest legal saved-views payload** (10 × 50 filters × 100 × 256 chars) | **200, 12.4 MB stored**, GET returns 12.4 MB | bounded, but large (N3) |
| **top-level `visibleColumns` of 200,000 valid keys** | **200, all 200,000 stored** and returned on every dashboard load | unbounded; no dedupe (N3) |
| **30 MB body** (valid shape plus one extra key) | **200** | the route reads the body with no cap (N3) |
| two PUTs at once with different lists | last one wins (`["tab B view"]`) | whole-list replace; clobbers only when two tabs both edit views. Acceptable; noted |

The server response shape is the GET shape (`{data:{preferences,droppedKeys,warnings},error,meta}`); 400s are
`{error, data:null, meta:{}}` with zod messages joined. ✓

**Client on a 400.** `scheduleSave` reads `err.error` and shows it as the picker's save error ("Invalid request: At most
10 saved views are allowed"), and the local list keeps the rejected change. The client already stops at 10 views and
64 characters, so an honest user cannot reach these 400s; the raw message and the missing rollback matter only after
a schema drift. Noted in N1.

**The client drops writes (N1).** Probe P3, real server, real drawer:
1. create view "Race view" (handler calls `scheduleSave(visible, nextViews)`);
2. within 400 ms toggle a column (handler calls `scheduleSave(next)`, no views);
3. result: **one PUT sent, without `savedViews`**; UI still lists the view; server `savedViews: []`; after reload the
   view is gone.

The same applies to rename or delete followed by a toggle, a preset click (`handleApplyPreset` →
`scheduleSave(cols, undefined)`) or applying a saved view, inside 400 ms. The comment above `handleSavedViewsChange`
says "Persist immediately (no debounce needed …)" but the call goes through the debounce. Loop 170 made "absent means
keep" the server contract, which is right, and the client's debounce is what turns a pending "present" into an
"absent". The e2e waits for each PUT before acting again, so it cannot see this.

**WDC-002 #367 closure:** holds for the route. N1 is the client half of the same user outcome; file it as a follow-up
of loop 170 rather than reopening #367.

---

## 5. #368 promotion (Audit-Intake clause 4)

**Procedure:** valid. #105 is WDC-002 P0 WDC2-P06; its closure at 169 creates one promotion slot; WDC2-R01 is a WDC-002
cold-pool P1; the row carries `audit-intake-WDC-002` and cites the slot. Promoting in 170 rather than 169 is fine.

**Content:** not verified against code, which is the MR-012 Change A lesson applied to coordinator promotions.
- "`handleApplyPreset` … apply columns only and drop `filters`. Clicking 'Automation Candidates' … filters no rows":
  **false since `db5959d` (2026-06-16).** `DashboardV2Shell.tsx:630-643` calls `setPresetFilters(preset.filters)`,
  which feeds `applyFilters` (`:838`). The review artifact predates that commit.
- "a saved view's filters (now persisted since loop 170) are not restored on apply": true but empty. Views are created
  from `currentFilters`, which the shell hard-codes to `[]` (`:1427`); the review artifact itself records that as
  **WDC2-R36** ("cannot be fixed without WDC2-R01"). Restoring filters that are never captured changes nothing.
- The rest of the row ("bridge FilterSet on apply", "keep no-op semantics for unavailable columns") is right for the
  saved-view path.

Recommended amendment (§8): rescope #368 to "saved views capture and restore row filters" (pass the active
`presetFilters` and the ad-hoc filters as a `FilterSet` into the picker; restore them in `handleApplySavedView`), cite
`db5959d` for the preset half, and absorb WDC2-R36 into it (it is the same outcome). Score unchanged at 11. Do not
consume the cool-off on it until amended.

---

## 6. Governance

**Selection.**
- **168** `burn-down` #361 (12, review-filed follow-up, MR-068's first pick). Cool-off recharge 166, 167, 168 → 3/3,
  re-armed. ✓
- **169** `top-score` via `ceiling-cool-off: invoked` for #105 (11). #105 is an audit-intake row that burn-down cannot
  reach, the charge was armed, and the rationale is logged. 3/3 → 0/3. ✓ This is the use MR-068 recommended.
- **170** `burn-down` #367 (14) in place of MR-068's #360 (11). Justified: a shipped feature that never persisted, the
  highest-scoring follow-up, filed one loop earlier with evidence; MR picks are recommendations. Recharge 0/3 → 1/3. ✓
  One caveat: a follow-up aged one loop jumping the queue is right for a live data-loss defect, and should stay rare;
  #360's limiter that never forgets (`invites/accept`) has now waited four loops.

**Density-response at 169:** correct option and format (§3).

**Partial-row practice (MR-068):** not exercised: 168, 169 and 170 each closed a whole row. #251 and #290 remain as they
were by the coordinator's choice (forward-only).

**Validation line:** present in all three entries ("validator 0; guard runner 142/142"), plus a named e2e command and
"no server left listening" in 169 and 170. Third consecutive window with the line. #359 can stay at 9.

**Ratio, loops 161-170** (same method as MR-068: review-filed rows count as created; the window opens at MR-066):

| | Count | Source |
|---|---|---|
| Closed | 8 | #94 (161), #351 (162), #249 (164), #116 (165), #299 (166), #361 (168), #105 (169), #367 (170). 163 and 167 partial |
| Created | 17 | MR-066 #351-#354; MR-067 #355-#359; loop 166 #360; MR-068 #361-#364; loop 169 #365-#367 |
| Ratio | **0.47** | **below the ≥ 0.5 floor**; 0.44 if #368's promotion is counted as creation |

Diagnosis: loops created 4 of 17; reviews 13, all true defects. The floor is breached by review yield, not by loop
spill. Recovery path: 171-173 each close a row and this review files three; window 164-173 then reads 9 / 16 = 0.56. To
help, this review files only defects that lose user data or break a stated rule, and puts the rest into annotations.

**Pace and coverage.** Loops landed 15 and 9 minutes apart. The two new defects are again "a path the tests did not
model": a second action inside the debounce window (170), Escape inside a nested editor (169, actually observed and
routed around). Practice for the template, no rule: **a test that has to work around product behaviour files a row for
that behaviour in the same loop.**

**Agents / Area.** 168 security-reviewer (security/web), 169 qa-engineer (dashboard a11y/test), 170 backend-engineer
(web-app/dashboard). Rotation clean. 169 and 170 are both dashboard; a third dashboard loop at 171 makes 172 leave the
Area. D-4 clause 1: no user-visible copy changed in any loop. Clause 2: no new module ≥ 200 LOC (`presets.ts` +32).

**D-1.** Last extension touch `871e29a`, **127 loops** at 170 (181 commits). "User-ack outstanding" logged every loop.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 27]`; every suite green at `a5eed1f`. Loops 165-170 (pricing events, limiter, bounce, saved views) are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success. 168's heap tests have never run on Node 20 |
| 4 | Alerts | scheduled "Alerts check" failing: `37099623595`, `37079356379`, `37053616721` |
| #350 part 3, #351 item 5 | read production data | after the push |
| #225 | `TRUSTED_PROXY_HOPS` | open; also bounds the #360 sites |
| #278 / #355 | PostHog keys absent; identity reset first | unchanged |
| #357 | signup disclosure decision | open |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | unchanged |

---

## 7. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor (`top068.mjs`), blocked/awaiting/parked statuses excluded by
reading each status; #113 restored by hand (its status contains "CEO directive-driven"); #157, #127, #152, #159, #160
excluded as malformed or CEO-gated. Verified at `a5eed1f`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** (below) client drops saved-view writes | 13 | follow-up | **true** | probe P3 |
| 2 | **N2** (below) Escape closes the drawer | 12 | follow-up | **true** | probe P4; `ColumnPicker.tsx:589-601` |
| 3 | #360 sibling limiters | 11 | follow-up | **true** | `auth-buckets.ts:34/58`, `extension-telemetry-buckets.ts:36/56`, `invite-buckets.ts:28/46` still Map + scan; `invites/accept/route.ts:77` sets, never deletes (only `:145` clears in tests). Row text "keys truncated to 64" is stale since 168 |
| 4 | #365 white on green-600 | 11 | follow-up | **true, one more site** | `ColumnPicker.tsx:514`, `PresetChipRail.tsx:176`, plus `UnifiedToolbar.tsx:211` badge |
| 5 | #113 pricing table semantics | 11 | audit | **true** | `pricing/page.tsx:258-273`: `<th>` without `scope`, no `<caption>` |
| 6 | #368 filters on apply | 11 | audit | **half stale** | §5 |
| 7 | #366 dimmed rows contrast | 10 | follow-up | true | P5: 7 contrast nodes in the drawer |
| 8 | #362 one UTM sanitizer | 10 | follow-up | true | `UTMCapture.tsx:20-24` raw; `SignupPageClient.tsx:60` spread |
| 9 | #355 identity reset | 10 | follow-up | true (MR-068) | unchanged |
| 10 | #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | #114 after #137; #174 reuse the product-page alerts fetch |

---

## 8. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **A saved-view change is lost if any other column change follows within 400 ms.** MR-069 §4. `DashboardV2Shell.scheduleSave` debounces every preferences PUT by 400 ms and cancels the pending one. `handleSavedViewsChange` calls `scheduleSave(visible, nextViews)`; a column toggle, `handleApplyPreset` or `handleApplySavedView` inside the window calls `scheduleSave(cols, undefined)`, so the PUT that is finally sent has no `savedViews` field and the server keeps the old list (absent means keep, by design since loop 170). Reproduced in Chromium against the real API: create a view, toggle a column, one PUT without `savedViews`, the UI shows the view, the server has none, and it is gone after reload. Same for rename and delete. Fix in the client: carry the latest pending `savedViews` into the next scheduled save when the new call omits it (or flush saved-view changes immediately, as the code comment already claims), and roll back or mark the list unsaved when the PUT fails instead of showing the raw server message. Tests: a unit test on the merge, and an e2e step in `saved-views-persistence.spec.ts` that toggles a column right after creating a view and asserts the view survives a reload. Follow-up of loop 170 (#367). | fix | web-app / dashboard | `frontend-engineer` | 4 | 4 | 2 | 5 | 1 | 1 | **13** |
| **N2** | **Escape inside the column picker's saved-view editors closes the whole drawer.** MR-069 §3. The rename input (`ColumnPicker.tsx:223-233`), the new-view name input (`:431-440`) and the delete confirmation handle Escape with `preventDefault()` only, and the drawer's document listener (`:589-601`) calls `onClose()` for every Escape without checking `defaultPrevented`. Reproduced in Chromium: Escape in each of the three closes the drawer instead of cancelling the edit, against the MDR-P08 innermost-first rule. Loop 169's `v2-a11y.spec.ts` saved-views test works around it ("reopen if needed"). Fix: the drawer handler returns early when `e.defaultPrevented` (or the inner handlers stop propagation); give the delete confirmation an Escape that cancels it. Tests: replace the workaround with assertions that after Escape the drawer is still open, the editor is closed and focus is back on the row. No copy change. | fix | web-app / a11y | `frontend-engineer` | 3 | 4 | 2 | 5 | 1 | 1 | **12** |
| **N3** | **The preferences PUT bounds saved views but nothing else: column lists and the body are unbounded.** MR-069 §4. Probed against the real route: top-level `visibleColumns` and `columnOrder` of 200,000 valid keys are accepted, stored and returned on every dashboard load (no length cap, no dedupe); a 30 MB body is read in full (`req.json()` with no cap); the largest legal saved-views list stores 12.4 MB in one row. Authenticated users only, own row, so this is resource abuse and self-harm rather than a cross-user leak. Fix: cap and dedupe the column arrays (at most the registry size, unique keys), read the body through `readBodyWithLimit` with a cap such as 256 KiB, and lower the per-view filter budget so the worst legal document fits under it. Tests: each cap gives 400 with no write. | fix | security / web | `backend-engineer` | 2 | 3 | 1 | 5 | 1 | 1 | **9** |

**Amendment to #368 (replace the row text; score unchanged at 11):** "**WDC2-R01 + WDC2-R36 Saved views capture and
restore row filters.** Promoted from the WORKFLOWS_DASHBOARD_REVIEW_002 cold pool at loop 170 through the slot created
when audit P0 #105 (WDC2-P06) closed at loop 169 (Audit-Intake clause 4). (MR-069 rescope) The preset half of WDC2-R01
already shipped at `db5959d` (`handleApplyPreset` calls `setPresetFilters`, which feeds `applyFilters`). What remains:
the shell passes `currentFilters={[]}` to the picker (`DashboardV2Shell.tsx:1427`, WDC2-R36), so every saved view is
stored with empty filters, and `handleApplySavedView` applies columns only. Pass the active preset filters and the
ad-hoc filters as a `FilterSet` when a view is created, and restore them on apply through the same pipeline a preset
uses; keep no-op semantics for filters on unavailable columns. Tests: a view saved with an active filter restores it
after reload and apply. Copy is unchanged." Keep `audit-intake-WDC-002`.

**Annotations recommended:**
- **#360:** "(MR-069) Since loop 168 the LRU maps keys over 64 characters to one overlong bucket and copies stored keys
  flat; drop 'keys truncated to 64 characters' from the fix text. When reusing it, add a heap test that goes through
  `touch` (the current heap tests only call `set`; deleting the copy in `touch` keeps every test green and retains
  ~230 MB at 20k keys in a mirror). Make `it.skipIf(!gc)` visible (a test asserting gc is available under the repo
  config) so a Node change cannot turn the heap tests into silent skips."
- **#365:** "(MR-069) Third instance: the active-filter count badge, `UnifiedToolbar.tsx:211` (10 px white on
  green-600), which no axe test reaches. In test 3b move `test.fail` after the preconditions, as in tests 1 and 2c;
  add contrast-disabled twins for 2c and 3b, or fix them quickly; the code TODOs say #105a, which is this row."
- **#366:** "(MR-069) Probe confirms the drawer's only violation is `color-contrast`, 7 nodes. The TODO tag #105b is
  this row."
- **#367 closure note:** "[MR-069: holds at the route. Probed 30 cases (limits, unicode, prototype keys, strict
  filters, ownership, server-owned createdAt) with the expected results. The client can still drop a saved-view write
  when another column change follows within 400 ms (N1), and the route has no body or column-array cap (N3). Loop log
  says 12 new route tests; there are 13.]"
- **#105 closure note:** "[MR-069: holds; 28 pass, the three expected failures are colour contrast only. Escape inside
  the drawer's editors closes the drawer; the new test routes around it instead of filing it (N2).]"
- **#361 closure note:** "[MR-069: holds; flat copy measured at 2.7-3.2 MB for every reachable header shape, 232 MB
  without it. The touch-path copy is correct and untested (annotation on #360).]"

---

## 9. Finding → row map

| Finding | Row |
|---|---|
| §4 debounce replaces a pending saved-view PUT | N1 |
| §3 Escape in nested editors closes the drawer; test works around it | N2 |
| §4 unbounded column arrays and body; 12.4 MB legal document | N3 |
| §5 #368 preset half shipped; capture half (WDC2-R36) missing | #368 amendment |
| §2 touch copy untested; silent skip on missing gc; stale #360 text | #360 annotation |
| §3 third green-600 site; `test.fail` placement in 3b; missing twins; tag names | #365 / #366 annotations |
| §4 test count 12 vs 13; 400 message shown raw | #367 note / N1 |
| §6 ratio 0.47 | governance: three closures in 171-173 |

---

## 10. Loop 171-173 picks

**Before 171: push** (CEO item 1).

Pool 121 > 8, so burn-down unless a cool-off is invoked. Cool-off recharge is 1/3 after 170.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **171** | **N1** saved-view writes survive the debounce | **13** | `burn-down` (follow-up of loop 170) | `frontend-engineer` | web-app / dashboard | live data loss in the feature 170 just repaired; E1; recharge 2/3 |
| **172** | **#360** four limiters onto the LRU, including `invites/accept` | **11** | `burn-down` | `security-reviewer` | security / web | waited four loops; the LRU is now safe to reuse; leaves the dashboard Area after 169-171; recharge 3/3 (re-armed) |
| **173** | **N2** Escape keeps the drawer open | **12** | `burn-down` | `frontend-engineer` | web-app / a11y | the top remaining follow-up; burn-down reaches it, so the re-armed cool-off is kept |

- **Area check:** 169 and 170 dashboard, 171 dashboard → 172 must leave the Area (it does); 173 returns.
- **Cool-off:** do not spend it on #368 until the amendment lands; after that, #368 (11, audit-intake) or #113 (11,
  E1/R1) are the natural cool-off picks at 174+.
- **Alternatives:** 173 → **#365 + #366** as one loop (one outcome: the drawer and rail meet 4.5:1; one token decision,
  `ux-designer` adjacent; removes three `test.fail`s); 172 → #362 (10) if a privacy pass is preferred.
- **Ratio:** three closures here and three filed rows bring the 164-173 window to about 0.56.
- **Do not pick:** #368 unamended; #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO).
- **Then MR-070** (base cadence after 173).

---

## 11. Verdict

Every count reproduces at `a5eed1f`: root 6282, web-app 4449, typecheck 0, validator clean (open 121), guard runner
142/142, e2e 28 passed with three expected failures.

- **Loop 168 holds.** The copy is flat for every header shape Node can deliver, `touch` copies, and the cost is under a
  microsecond. The touch copy has no test.
- **Loop 169 holds.** The drawer, rail and saved views are scanned in a real browser, the expected failures are exactly
  the two contrast defects, and the review found the persistence bug. It also found an Escape defect and stepped
  around it.
- **Loop 170 holds at the route**, which validates well under hostile input. The client debounce can still discard a
  saved-view change, and the route caps saved views but not the column arrays or the body.

Selection and cool-off accounting are correct (re-armed 168, spent 169, 1/3 at 170), the validation line is in every
entry, no partial loops occurred, and #368 was promoted by the right procedure with the wrong content. The ratio is
0.47, below the floor, driven by review yield. Push now.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 121
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6282 / 4449 / 0
node --expose-gc $S/lru069.mjs        # flat copy 2.7-3.2 MB at 20k; no copy 232 MB; flatCopy ~0.8 us
node --expose-gc $S/touch069.mjs      # touch without copy: 230.5 MB
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/v2-a11y.spec.ts e2e/app/dashboard/saved-views-persistence.spec.ts)   # 28 passed, 3 x
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe069.config.ts)
   # P1 route edges; P2 last-write-wins; P3 debounce loses the view; P4 Escape closes drawer; P5 contrast only
grep -n "currentFilters={\[\]}" apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx   # :1427
grep -n "setPresetFilters(preset.filters" apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx
git log origin/main..main --oneline | wc -l                                        # 27
```
