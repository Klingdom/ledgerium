# MR-072 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 177-179, 2026-10-03 02:01 → 02:35 (−0600). Commits `9518733` (loop 177, #374), `00df0eb`
(loop 178, #375), `4849da6` (loop 179, #365). Previous review MR-071 at `be0b03f`. Rows closed: #374, #375, #365.
Rows filed by loops: #377 (loop 179). Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-071 (`ITERATION_LOG.md`, loop 179 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code, not even temporarily. No commit, no `git add`. Every
row, strike or annotation below is a recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `probe072.config.ts` + `probe072.spec.ts`, `probe072c.config.ts` + `probe072c.spec.ts`: Playwright configs outside
  the repo (MR-069/070/071 pattern: repo global setup and auth setup, dev server on port 3098), 11 probes against the
  real preferences API and the real dashboard (`probe072.raw.txt`, `probe072c.raw.txt`). The 15 s abort is scaled to
  1.5 s **in the page only**, by an init script that maps `setTimeout(…, 15000)` to 1500 ms; everything else runs on
  the real wall clock (no `page.clock`);
- `ph072/`: the installed posthog-js 1.367.0 in jsdom with the repo's own `buildPostHogConfig`, stubbed fetch/XHR/beacon
  (`ph072.txt`);
- `mut072/`: copies of `savedViewsSync.ts`, `posthog-privacy.ts` and their tests, mutated on the **copies** only
  (14 mutants, `mut072.txt`);
- `val072.txt`, `guard072.txt`, `tc072.txt`, `root072.txt`, `web072.txt`, `e2e072.txt`, `status_before072.txt`,
  `status_mid072.txt`: run outputs.

`git status --short` before, mid-way and after is identical (`.claude/*` modified, `data/` untracked; both
pre-existing), apart from this file. Every Playwright run started and stopped its own dev server; `netstat` shows
nothing listening on 3000, 3097 or 3098 afterwards. The e2e global setup re-seeded the local SQLite test DB (normal);
the probes snapshot the test user's preferences and restore them (`restore 200` in both probe runs; 0 saved views
before and after).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 179 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6360 | **310 files, 6360 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4540 | **256 files, 4540 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 370 rows, 249 struck, **open 121** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `v2-a11y.spec.ts` + `saved-views-persistence.spec.ts` | 34 (177) + 1 badge test (179) | **35 passed (1.9 min)**; one `x` (#366's remaining `test.fail`, `v2-a11y.spec.ts:772`) | matches |
| deltas | web 4526→4531→4540→4540; root 6346→6351→6360→6360 | 177 +5, 178 +9 (7 unit + 2 integration), 179 e2e only | consistent |

Pool arithmetic: MR-071 recorded 120 + #374 + #375 + #376 = 123. Loops 177-179 struck three and filed one (#377):
**121**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader, PostHog with a real key and a real
remote config, mutation of `DashboardV2Shell.tsx` (shell wiring has no unit tests; checked by probe T4 instead). The
revert proofs in all three entries are agent-reported; the mutation runs on copies (§5) stand in for them.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** 177's timeout ends "Saving…" in every
   shape I could build on a real clock (hung then hung, hung with edits in each window, three hangs in a row, an
   unmount mid-flight); 178's hook strips what the row named; 179's three sites render white on `rgb(4, 120, 87)`
   at 5.48:1 in the real page.
2. **PostHog still receives an email and full link URLs, through autocapture (§3, N1).** Autocapture is on by
   default and `mask_all_text` is false, so a click sends the element's text (`$el_text: "john@example.com"`) and
   every link's `href` with its query string inside `$elements` and `$elements_chain`, which `before_send` never
   inspects (it reads top-level string values only). Nested objects, arrays and the `$set` event's own properties pass
   through the same way. And the raw landing URL, email included, is written to the `ph_<key>_posthog` cookie, so 178's
   limit "never transmitted" is not accurate: the cookie goes to Ledgerium's own servers on every request. Dormant (no
   key, consent-gated).
3. **After a timeout, a definite failure can claim a restore that did not happen (§2, annotation).** If the server
   applied the PUT whose reply timed out and the re-send gets a 500, the UI rolls back to `[]` and says "Saved views
   were restored to your last saved list"; the server keeps the new list and a reload shows it. 177's limit names only
   "two timeouts". Rare; it belongs to the design note (§7), not a row.
4. **The badge test catches the old colour, not every regression (§4, annotation).** Computed style ignores opacity
   and a transparent background parses as black, so `bg-transparent` scores 21:1 and `opacity: .4` still scores 5.48.
5. **One more white-on-green family outside 179's grep (§4).** White on `emerald-500` / `brand-500` (2.54:1) at four
   sites, one of them the docs page's "Get started free" button. Recommended as an addition to #377, not a new row.
   #377's part (1) also overstates: its icon buttons pass the 3:1 graphics rule at 3.30:1.
6. **Ratio, loops 170-179: 1.11** (10 closed / 9 created). Healthy, and the best of the last four windows.
7. **The saved-views design note has a gate (#368) but no slot.** Recommendation: file it as a row (12) and do it at
   180, then spend the armed cool-off on #113 at 182 (§7, §11).
8. **Push is still the first CEO action:** `main` is **39 ahead**; last deploy still loop 151; "Alerts check" still
   failing.

---

## 2. Loop 177 — #374 a save that cannot hang (`9518733`): **HOLDS**

**Diff vs log:** matches. `persist` gets an `AbortController` and a `PREFERENCES_PUT_TIMEOUT_MS = 15_000` timer,
cleared in `finally` (`DashboardV2Shell.tsx:538-567`); a timed-out PUT goes to the new `settleTimeout`
(`savedViewsSync.ts:155-164`), which marks the state dirty and `reconciling` without rolling back, so `takeQueued`
re-sends the latest full state once; with `reconciling` already set it falls through to `settleFailure`. "Saved" is
gated on `saveDebounceRef.current === null`, and the idle reset uses a functional update so it cannot clobber a newer
"Saving…". No copy changed. The row asked for "treat the abort as a failure"; the loop chose a single re-send first,
which is better for an unknown outcome and is stated in the closure note.

**Probes** (Chromium, real API, real wall clock, abort scaled to 1.5 s in the page):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| T1 hung, then hung re-send | create "HH"; PUT #1 and #2 never answered | #1 at t, #2 (`["HH"]`) at t+1.50 s; at t+3.4 s UI `[]`, status the friendly rollback message, "Saving…" gone; server `[]`; the next create sends #3 and shows "After" on both sides | ✓ |
| T2-ok reply lost after the server applied it | #1 applied server-side, its reply never arrives; #2 continues | "Saving…" → "Saved" → idle; UI, server and reload all `["Applied"]` | ✓ converges |
| T2-500 same, re-send answered 500 | #1 applied, reply lost; #2 → 500 | UI **`[]`** and "Saved views were restored to your last saved list"; server **`["Applied"]`**; reload shows **"Applied"** | **inaccurate message, UI ≠ server** (annotation) |
| T3b edits inside both windows | #1 and #2 hang; a column toggle inside #1's window, a second view inside #2's | #1 `cols=8 ["R1"]`, #2 `cols=7 ["R1"]`, #3 `cols=7 ["R1","R2"]` answered; UI = server = `["R1","R2"]`, 7 columns; "Saved" then idle | ✓ |
| T6 three hangs, an edit in each window | every PUT hangs; S1, S2, S3 created one per window | 4 PUTs (#2 = re-send, #3 = queued save, #4 = its re-send); then rollback to `[]` and the friendly message at ~6.5 s; server `[]` | ✓ ends (≈ 60 s at the real 15 s) |
| T4 "Saved" during a debounce | #1 held 1 s; a toggle 1.25 s after the first | no "Saved" when #1 settles; "Saved" only after #2 | ✓ (MR-071 minor fixed) |
| T5 unmount mid-flight | #1 hangs; Escape; client navigation to `/compare` | after the abort the re-send still went out; server `["Gone"]`; no console errors | ✓ |

**Why T2-500 happens.** The first timeout keeps `confirmed` at the pre-flight list because the outcome is unknown; the
re-send's 500 then reaches `settleFailure`, which rolls back to that `confirmed` and reports a restore. When the
server did apply the first PUT, the message is wrong and the UI disagrees with the server until a reload. The next
saved-views change re-sends the whole list and overwrites the server, so nothing is lost silently; a column-only
change does not (it omits `savedViews`), so "Applied" stays on the server and reappears after a reload. A GET after a
failed reconcile would settle it; that is the "unknown outcome" cell of the save state machine the design note (§7)
should define. Annotation, not a row.

**Mutants** (§5): `settleTimeout` always failing (2 fail), ignoring `reconciling` (1), not marking dirty (1),
`settleSuccess` or `settleFailure` keeping `reconciling` (1 each): killed. **Survivor:** `settleSuccess(undefined)`
(a column-only success) keeping `reconciling`. Effect: after a column-only re-send succeeds, the next unrelated timeout
rolls back at once instead of re-sending. Missing test, not a defect.

**Limits accuracy.** "After two timeouts the rollback may still be older than what the server has" is true but
narrow: one timeout followed by any failure does the same (T2-500). "The e2e drives timers with `page.clock`" is
accurate; T1-T6 confirm the behaviour on a real clock.

---

## 3. Loop 178 — #375 PostHog sees only what Ledgerium would (`00df0eb`): **HOLDS for the row; autocapture and storage bypass it**

**Diff vs log:** matches. `buildPostHogConfig` exported; `capture_pageview: false`; `before_send: sanitizePostHogEvent`
(new `posthog-privacy.ts`, 54 LOC); `mask_personal_data_properties: true`; `advanced_disable_flags: true`. I checked
the last one in the bundled source: `advanced_disable_flags` also returns true from the remote-config guard, so
`/array/<token>/config` is not fetched either. That switches off server-driven heatmaps, web vitals, exception
autocapture, surveys and dead clicks; none of those payloads can appear while it stays on.

**Probe** (`ph072.test.ts`: real posthog-js 1.367.0 in jsdom, `buildPostHogConfig` unmodified, landing
`/pricing?utm_source=newsletter&utm_term=john%40example.com&email=bob%40corp.com`, no
`disable_external_dependency_loading`):

| Path | What reached the wire | Verdict |
|---|---|---|
| `$pageview`, custom events: `utm_term`, `$current_url`, `$session_entry_url`, `$initial_*` in `$set_once` | dropped or stripped to `/pricing` | ✓ (the row) |
| requests made | only `/e/` (no `/flags`, no remote config) | ✓ |
| **autocapture on** (`config.autocapture` true by default) | click on `<button>john@example.com</button>`: **`$el_text: "john@example.com"`**, also inside `$elements_chain` (`text="john@example.com"`) | **leak (N1)** |
| click on `<a href="https://…/share/tok?e=john%40example.com">` and on `<a href="/settings?invite=jane@corp.com">` | full `href` with query in `$elements[].attr__href` and `$elements_chain`; also a `$rageclick` | **leak (N1)** |
| `change` on `<input name="email">` with a typed address | `$autocapture` with the element, **no value** | ✓ |
| `capture('custom', { meta: { link: 'https://…?e=n1@x.com' }, list: ['https://…?e=n2@x.com'], next: '/x?e=n3@x.com' })` | all three kept: nested object, array, relative URL under a non-URL key | **gap (N1)** |
| `target_url: '/rel?e=…'` (URL-named key, relative) | stripped to `/rel` | ✓ (but untested: mutant P1) |
| `identify('user-1', { last_url: 'https://…?e=…' })` | `$set.last_url` stripped | ✓ |
| `setPersonProperties({ home: 'https://…?e=…' })` | **kept**: the `$set` event carries it in `properties.$set`, which the hook does not recurse into | **gap (N1)**; no app caller today |
| `captureException(new Error('failed for n10@x.com …'))` | message and stack frames sent raw | out of scope (manual call; no app caller; autocapture off with remote config off) |
| `ph_phc_…_posthog` **cookie** | `$initial_person_info.u` = the full landing URL with `john%2540example.com` and `bob%2540corp.com` | **storage (N1)** |
| localStorage | same raw URL in `$initial_person_info` and `$client_session_props` | device-local; stated in 178's limits |

**Is the autocapture leak real in this app?** Where emails are rendered: `AppShell.tsx:87` puts the user's email in a
plain `<span>`, which autocapture does not capture on its own. Team member lists (`teams/[id]/page.tsx:222-253`) and the
admin user screens render emails next to buttons; autocapture captures the clicked element's own text and the
chain's attributes, so any clickable element whose text is an email, workflow title or SOP step goes to PostHog.
Workflow titles and SOP text are customer process content, which is the more likely exposure. Links: share links
(`/share/<token>`) put a capability token in `attr__href` on every click. The identify call
(`LoginPageClient.tsx:43`, `SignupPageClient.tsx:78`) sends the email as distinct id on purpose; that is #355's
part (4), not a new finding.

**Closure note accuracy.** "Strips query and fragment from every URL property in `properties`, `$set` and
`$set_once`" holds for top-level string values only. "No at-sign in any payload" holds for the pageview path the
test drives (no clicks, no nested values). The limit "raw values remain in the visitor's own storage (never
transmitted)" is wrong for the cookie: posthog-js sets it on the site's domain (cross-subdomain by default), so the
browser sends it with every request to Ledgerium's own servers. Not to PostHog.

**Mutants:** dropping the absolute-URL branch (1 fail), `$set` (1), `$set_once` (1), `?`-only strip (1), keeping
rejected UTMs (2), mutating the input (3): killed. **Survivor:** removing the URL-key branch (`URL_KEY`): every test
URL is absolute, so the relative-value case is untested. The `$initial_`/`$session_entry_` prefix is covered by test 5
(by reading; the sed mutant was malformed).

---

## 4. Loop 179 — #365 white on green, legible (`4849da6`): **HOLDS**

**Diff vs log:** matches. Three class swaps (`PresetChipRail.tsx:176` fill and border, `ColumnPicker.tsx:587-588` fill
and `hover:bg-brand-800`, `UnifiedToolbar.tsx:211`). Both `test.fail` lines removed; new e2e "UnifiedToolbar
active-filter count badge (row #365)" with a computed-contrast assertion. `brand-700` = `#047857` and `brand-800` =
`#065f46` in `tailwind.config.ts:16-17`, the same pair as `.btn-primary` (`globals.css:209-210`).

**Computed in the real page** (probe C1, Chromium):

| Site | Computed | Ratio |
|---|---|---|
| active preset chip (`automation_candidates`, `aria-pressed=true`), 12 px | `rgb(255,255,255)` on `rgb(4,120,87)`, border `rgb(4,120,87)` | **5.48** |
| filter badge (`aria-label="1 active filters"`), 10 px | same | **5.48** |
| enabled Save, 11 px; hover | same; hover on `rgb(6,95,70)` | **5.48**; **7.68** |
| badge with `<html class="dark">` | unchanged (no dark variant) | 5.48 |

Independent arithmetic agrees: green-600 3.30, brand-700 5.48, brand-800 7.68. The test was green in my e2e run
(35 passed).

**Would the badge test catch a regression?** Forcing the badge back to `#16a34a` gives **3.30** (fails, as the loop's
revert proof says). Two shapes it misses: a transparent background (a renamed or purged token, or `bg-transparent`)
computes as `rgba(0,0,0,0)`, which the helper reads as black, so white text scores **21** while the real result is
white on the white toolbar; and `opacity` does not change computed colours (`opacity: .4` still scores **5.48**). One
extra line closes the first: assert the background's alpha is 1 (or that it equals `rgb(4, 120, 87)`). Annotation.

**The grep's boundary.** 179 searched for white on `bg-green-*` and found exactly three; that is correct. The same
pattern on other green-family tokens: white on `emerald-500` or `brand-500` (both `#10b981`, **2.54:1**) at
`(public)/docs/page.tsx:2166` ("Get started free", 14 px semibold: fails 4.5:1), `SOPUsefulnessSurvey.tsx:25` (the
selected "Yes, as-is" answer: text fails), `(app)/analytics/product/page.tsx:180` (retention cells at 60-79 %: text
fails) and `SOPExecutionMode.tsx:575` (the white check on a completed step: graphic, fails 3:1). `emerald-600` at
`AskThisProcessPanel.tsx:413` is an icon at 3.77 (passes 3:1). These are the same token move as #377, so the
recommendation is an annotation adding them to #377 rather than a new row (§9).

**#377's own text.** Part (1) calls the icon buttons at `dashboard/page.tsx:1248, 1553, 1800` and
`PortfolioSidebar.tsx:218` "AA text failures"; they are icons (SC 1.4.11, 3:1), and 3.30:1 passes. Only
`ColumnPicker.tsx:548` and `:790` are text failures. The icon moves are consistency work, which is fine inside #377,
but the row should say so.

---

## 5. Mutation summary (copies in `mut072/`, never the repo)

| Mutant | Tests | Result |
|---|---|---|
| S1 `settleTimeout` always a plain failure | savedViewsSync | 2/21 fail |
| S2 `settleTimeout` ignores `reconciling` | savedViewsSync | 1/21 fail |
| S3 `settleSuccess(sent)` keeps `reconciling` | savedViewsSync | 1/21 fail |
| S4 `settleFailure` keeps `reconciling` | savedViewsSync | 1/21 fail |
| S5 `settleTimeout` does not mark dirty | savedViewsSync | 1/21 fail |
| S6 `settleSuccess(undefined)` keeps `reconciling` | savedViewsSync | **survives** (kill: a column-only reconcile succeeds, then a timeout re-sends) |
| P1 no URL-key branch | posthog-privacy | **survives** (kill: `target_url: '/x?e=a@b.c'` → `/x`) |
| P2 no absolute-URL branch | posthog-privacy | 1/7 fail |
| P3 `$set` not sanitized | posthog-privacy | 1/7 fail |
| P5 strip `?` only, not `#` | posthog-privacy | 1/7 fail |
| P6 rejected UTM kept raw | posthog-privacy | 2/7 fail |
| P7 `$set_once` not sanitized | posthog-privacy | 1/7 fail |
| P8 mutate the input bag | posthog-privacy | 3/7 fail |
| P4 prefix group | posthog-privacy | malformed mutant (added an alternative); covered by test 5 by reading |

---

## 6. Governance

**Selection.**
- **177** `burn-down` #374 (11), MR-071's first pick, `frontend-engineer`. ✓
- **178** `burn-down` #375 (11), second pick; `security-reviewer` (MR-071 suggested `analytics`; either clears the agent
  rule, and the reviewer fits a privacy row, as at 176). ✓
- **179** `burn-down` #365 (11), third pick, `frontend-engineer` with `ux-designer` adjacent as asked. ✓

All three followed MR-071 in order, for the second window running. The cool-off stayed armed (3/3 since 172),
correctly: burn-down reached an 11 every time, so spending it would have bought nothing (MR-004 Change B logic).

**Density / follow-ups:** 177 and 178 filed none; 179 filed one (#377, from the UX review, correctly kept out of
#365's scope). Clause 3 did not fire.

**Ratio, loops 170-179** (same method as MR-069/070/071: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #367 (170), #369 (171), #360 (172), #370 (173), #373 (174), #372 (175), #362 (176), #374 (177), #375 (178), #365 (179) |
| Created | 9 | MR-069 #369-#371 (filed after loop 170), MR-070 #372-#373, MR-071 #374-#376, loop 179 #377 |
| Ratio | **1.11** | above the ≥ 0.5 floor; MR-071's projection (0.82) was conservative |

This review files two rows. If loop 180 closes one, window 171-180 reads 10 / 8 = 1.25.

**Validation line:** "validator 0; guard runner 142/142" in all three entries; named e2e runs with "no port 3098
listener" in 177 and 179 (178 had no e2e surface). Sixth consecutive window. #359 can stay at 9.

**File-level saturation (MR-071 practice).** Applied once: 177 logged "Primary file: `DashboardV2Shell.tsx` (also
touched at 175; not consecutive)". 178 and 179 have no primary-file line. By directory, `components/dashboard-v2/` was
the primary surface at 174, 175, 177 and 179 (4 of the last 6). Not a violation (not three in a row), but the practice
only works if every entry carries the line. Recommendation: one "Primary file" line in every Controls block until the
next CLAUDE.md review decides whether to codify it.

**Agents / Area.** 177 `frontend-engineer` (web-app / dashboard), 178 `security-reviewer` (analytics / privacy), 179
`frontend-engineer` + `ux-designer` (web-app / a11y). D-4 clause 1: no copy changed in any. Clause 2:
`savedViewsSync.ts` ~165 LOC, `posthog-privacy.ts` 54 LOC, both under 200.

**D-1.** Last extension touch `871e29a`: **136 loops** at 179 (193 commits). "User-ack outstanding" logged every loop.
Extension changes stay frozen under MR-064's CEO gate, so this is expected.

**The #368 gate.** In place: the row text carries "(MR-071) Do not pick before a one-page saved-views design note
exists", and no loop picked it. `SYSTEM_HEALTH.md:20` mirrors it. What is missing is a slot (§7).

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 39]`; every suite green at `4849da6`. Loops 152-179 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Alerts | scheduled "Alerts check" failing: `37099623595` (newest), `37079356379`, `37053616721` (no newer run) |
| #350 part 3, #351 item 5 | read production data | after the push |
| #225 | `TRUSTED_PROXY_HOPS` | open |
| #278 / #355 / **N1** | PostHog keys absent; before enabling: identity reset (#355) **and** N1 (autocapture, nested values, cookie) | 178 said #355 is the last blocker; it is not |
| #357 | signup disclosure decision | open |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | unchanged |
| MR-071 §7 | saved-views design note | gate in place; recommend scheduling at 180 as a row (no CEO decision needed for an artifact) |

---

## 7. The design note: schedule it, as a row

MR-071 asked for a one-page note before #368. The gate held, but nothing schedules the note, and without a slot the
gate just parks #368 indefinitely while the drawer's siblings (#376 now, T2-500 above) keep arriving one review at a
time. This window adds two more cells the note should own: the unknown-outcome-then-failure case (T2-500) and
save-on-leave ("leaving the page during a slow flight still drops a queued save", 177's own limit).

**How.** File it as a backlog row (N2 in §9) owned by `system-architect` with `ux-designer` adjacent, deliverable
`docs/features/dashboard-v3-metrics-engine/SAVED_VIEWS_DESIGN_NOTE.md` (or beside `PERSISTENCE_SCHEMA.md`). As a row it
is scored, selectable by burn-down, counted in the ratio (created and closed: neutral) and traceable. Precedent: iter
055 shipped `SNAPSHOT_TABLE_DECISION.md` as a counted `burn-down` loop with zero code. A Mode 3-adjacent slot would also
work but leaves no row, no score and no closure trail; it is the weaker form here.

**Not the cool-off.** The note scores 12 as a follow-up, so burn-down reaches it; spending the cool-off on it would buy
nothing and yield no formula evidence.

**Order after the note.** #376 (focus after rollback) is one cell of the note's focus table, so do it after the note
and build it against the table. #368 stays gated until the note is merged; then it is the natural next drawer loop.

---

## 8. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor, blocked/awaiting/parked statuses excluded (`top068.mjs`);
#113 restored by hand; #157, #127, #152, #159, #160 excluded as malformed or CEO-gated (MR-070 precedent). New rows
from §9 included. Verified at `4849da6`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N2** write the saved-views design note | 12 | follow-up (MR-071 §7) | **true** | no note in `docs/`; #368 gated on it |
| 2 | **N1** PostHog autocapture, nested values, cookie | 11 | follow-up | **true** | `ph072.txt`: `$el_text: "john@example.com"`, `attr__href` with query, cookie with raw URL |
| 3 | #113 pricing table semantics | 11 | audit | **true** | `pricing/page.tsx:258-273`: `<th>` without `scope`, no `<caption>` |
| 4 | #368 saved views capture filters | 11 | audit | true, **gated** | `currentFilters={[]}` unchanged; wait for the note |
| 5 | #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | cool-off only |
| 6 | #376 focus after rollback | 10 | follow-up | **true** | `ColumnPicker.tsx:463-475`: the effect finds no Apply button and does nothing; no fallback |
| 7 | #377 green-600 sites (+ emerald, §9) | 10 | follow-up | **true, one overstatement** | `ColumnPicker.tsx:548, :790` text fail; `:331, :344, :861`, `band/KpiTileStrip.tsx:144`, `PortfolioSidebar.tsx:218`, `dashboard/page.tsx:1248, 1553, 1800` present; icons pass 3:1 |
| 8 | #366 dimmed rows contrast | 10 | follow-up | **true** | `ColumnPicker.tsx:833` `opacity-60`; `test.fail` at `v2-a11y.spec.ts:772` (the `x` in my run) |
| 9 | #355 identity reset | 10 | follow-up | **true** | `resetUser` has no caller (`grep resetUser(`: only its definition) |
| 10 | #371 preferences body and array caps | 9 | follow-up | true (MR-069/070) | route unchanged |

Below: #359 (9), #363 (7), #364 (7). #307, #309, #329, #251, #252, #278, #338 sit at 10 but are older non-follow-up
rows outside this window's area; unchanged since MR-070.

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **With PostHog switched on, autocapture still sends clicked text and full link URLs, nested values skip the privacy hook, and the raw landing URL sits in a cookie.** MR-072 §3. Loop 178 (#375) sanitizes top-level string properties only. Measured with posthog-js 1.367.0 in jsdom and the repo's own `buildPostHogConfig` (landing `/pricing?utm_term=john%40example.com&email=bob%40corp.com`): (1) autocapture is on by default and `mask_all_text` is false, so a click on a button whose text is an email sent `$el_text: "john@example.com"` (also inside `$elements_chain`), and clicks on links sent the full `href` with its query string (absolute and relative) in `$elements[].attr__href` and `$elements_chain`; in the app that means workflow titles, SOP text, emails in team and admin lists and `/share/<token>` links. Input values were not sent. (2) Nested objects and arrays (`{ meta: { link: 'https://…?e=…' } }`, `['https://…?e=…']`), relative URLs under keys not ending in `url` or `referrer`, and the `$set` event's `properties.$set` passed through unchanged. (3) The `ph_<key>_posthog` cookie holds `$initial_person_info.u`, the full landing URL with the encoded addresses, and the browser sends it with every request to Ledgerium's own servers (178's limit says "never transmitted"). Fix before any key is set: turn autocapture off (`autocapture: false`; the app sends its own named events) or keep it with `mask_all_text: true` and `mask_all_element_attributes: true`; make the hook recurse into nested objects, arrays and `properties.$set` / `$set_once`, and strip the query from any string value that is an absolute or root-relative URL; use `persistence: 'localStorage'` so the raw URL stays out of the cookie. Tests: extend `posthog-privacy.integration.test.ts` with a click on an email-text button and on a link with a query, a nested property, and a `setPersonProperties` call, asserting no at-sign and no `?` anywhere; assert `document.cookie` has no `?`; add a relative-URL case under a URL-named key (MR-072 mutant P1 survives today). A precondition for enabling PostHog, alongside #355. Follow-up of loop 178 (#375). | fix | analytics / privacy | `analytics` | 2 | 4 | 2 | 5 | 1 | 1 | **11** |
| **N2** | **Write the saved-views design note that #368 waits for.** MR-071 §7, MR-072 §7. One page, owned by `system-architect` with `ux-designer` adjacent, placed beside `docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md`. It must define (a) the save state machine of the preferences PUT as it stands after loops 170-177 (400 ms debounce, one flight, 15 s abort, one re-send after a timeout, rollback) and the cells still open: a re-send that fails after the server may have applied the first PUT (MR-072 T2-500: the UI rolls back and says "restored" while the server keeps the new list), save on leave (`keepalive` or `sendBeacon`), whether to add a revision to the PUT for two tabs, and whether column-only failures should roll back; (b) the drawer's focus table, every action (create, rename, delete, apply, close) × success and failure, including #376's two cells; (c) how #368's filters join the payload without a third independent save path. Output: the note, a list of the rows it changes or creates, and the order for #376 and #368. No code. Precedent: iter 055 `SNAPSHOT_TABLE_DECISION.md`. Follow-up of MR-071 §7. | design | web-app / dashboard | `system-architect` (+ `ux-designer`) | 3 | 4 | 4 | 4 | 2 | 1 | **12** |

**Annotations recommended:**
- **#374 closure note:** "[MR-072: holds on a real clock with the abort scaled to 1.5 s: hung then hung re-send rolls
  back and ends 'Saving…'; edits inside both windows converge; three hangs in a row end after four PUTs; unmount
  mid-flight still re-sends. One timeout followed by a 500, when the server applied the first PUT, rolls the UI back
  to the old list and says 'restored' while the server keeps the new one (reload shows it); the limit says 'two
  timeouts'. Untested: a column-only reconcile success clears `reconciling` (mutant S6).]"
- **#375 closure note:** "[MR-072: holds for top-level properties, `$set` and `$set_once`; `advanced_disable_flags`
  also disables remote config. Autocapture still sends clicked text and full hrefs, nested values and the `$set`
  event's `properties.$set` are not sanitized, and the raw landing URL is in the PostHog cookie, which is sent to
  Ledgerium's servers (N1). #355 is not the last blocker. The URL-key branch is untested (mutant P1).]"
- **#365 closure note:** "[MR-072: verified in the real page: chip, badge and Save are white on rgb(4,120,87),
  5.48:1; Save hover 7.68:1. The badge test fails at the old green (3.30) but would pass a transparent background
  (reads as 21:1) or reduced opacity; assert the background alpha too.]"
- **#377 append:** "(MR-072) (4) Same pattern, other tokens: white on `emerald-500` / `brand-500` (#10b981, 2.54:1) at
  `(public)/docs/page.tsx:2166` ('Get started free'), `SOPUsefulnessSurvey.tsx:25` (selected answer),
  `(app)/analytics/product/page.tsx:180` (retention 60-79 %), and the check icon at `SOPExecutionMode.tsx:575`
  (graphic, below 3:1). Move to `brand-700`. Correction to (1): the icon buttons at `dashboard/page.tsx:1248, 1553,
  1800` and `PortfolioSidebar.tsx:218` are graphics and pass 3:1 at 3.30:1; only `ColumnPicker.tsx:548` and `:790` fail
  as text. Score unchanged (10): E stays 2."

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §3 autocapture text and hrefs, nested values, `$set` event, cookie | N1 |
| §7 design note unscheduled; T2-500 and save-on-leave need an owner | N2 |
| §2 T2-500 message, limit wording, mutant S6 | #374 note (and N2 scope) |
| §3 closure accuracy, mutant P1 | #375 note |
| §4 badge test blind to transparency and opacity | #365 note |
| §4 emerald/brand-500 sites; icon overstatement | #377 append |
| §6 primary-file line missing at 178/179 | practice (no row) |

---

## 11. Loop 180-182 picks

**Before 180: push** (CEO item 1).

Pool 121 + 2 = 123 > 8, so burn-down unless a cool-off is invoked. The cool-off is armed (3/3 since 172).

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **180** | **N2** saved-views design note | **12** | `burn-down` (follow-up of MR-071) | `system-architect` + `ux-designer` | web-app / dashboard (docs) | top of the pool; unblocks #368 and orders #376; no code, so it breaks the dashboard-v2 code run |
| **181** | **N1** PostHog autocapture, nested values, cookie | **11** | `burn-down` (follow-up of loop 178) | `analytics` | analytics / privacy | rotates agent and Area; finishes #375's intent before keys are set |
| **182** | **#113** pricing table semantics | **11** | `top-score` via **`ceiling-cool-off: invoked`** | `frontend-engineer` | pricing / a11y | at 182 the top follow-up is 10 (#376, #377, #366, #355), #113 is 11: the first slot where the cool-off buys a point and yields formula evidence; E1/R1; a surface untouched for 20+ loops |

- **Then 183:** #376 against the note's focus table (or #377 with the §9 append), then #368 once the note is merged.
- **Alternatives:** if the CEO wants the note as a Mode 3-adjacent artifact instead of a row, 180 → N1, 181 → #113 via
  the cool-off (top follow-up 10 by then), 182 → #376. Do not spend the cool-off while an 11 or 12 follow-up exists.
- **Do not pick:** #368 before the note; #376 before the note (it is a cell of the focus table); #371 alone (9);
  #145, #142, #170, #175 (blocked); #114 before #137; #159/#160 (CEO).
- **Practice:** a "Primary file" line in every Controls block.
- **Then MR-073** (base cadence after 182).

---

## 12. Verdict

Every count reproduces at `4849da6`: root 6360, web-app 4540, typecheck 0, validator clean (open 121), guard runner
142/142, e2e 35 passed with one expected failure.

- **Loop 177 holds.** On a real clock every hung-PUT shape ends; edits inside both windows converge. One timeout then
  a 500 can show "restored" while the server kept the new list (annotation; N2 scope).
- **Loop 178 holds for the row.** Autocapture text and hrefs, nested values and the PostHog cookie still carry what the
  row meant to remove (N1). #355 is not the last PostHog blocker.
- **Loop 179 holds.** 5.48:1 measured in the page; the badge test misses transparency and opacity; four white-on-
  emerald sites belong in #377.

Selection followed MR-071 exactly, the cool-off was correctly kept, the validation line is in every entry, and the
ratio is 1.11. Asks for the CEO: push; and note that the PostHog precondition list is #355 **and** N1.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 121
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6360 / 4540 / 0
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/v2-a11y.spec.ts e2e/app/dashboard/saved-views-persistence.spec.ts)   # 35 passed, 1 x
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe072.config.ts)
   # T1 rollback at ~3.4 s; T2-500 UI [] vs server ["Applied"]; T4 no early "Saved"; T5 re-send after unmount; C1 5.48
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe072c.config.ts)
   # T3b converges; T6 four PUTs then rollback
(cd apps/web-app && npx vitest run --root $S/ph072 --config $S/ph072/vitest.config.mts)
   # $el_text "john@example.com"; attr__href with query; cookie with raw landing URL
node $S/mut072/run.mjs $S/mut072                # 14 mutants on copies; S6, P1 survive
git log origin/main..main --oneline | wc -l                                        # 39
```
