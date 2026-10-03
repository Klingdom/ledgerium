# MR-071 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 174-176, 2026-10-03 01:00 → 01:40 (−0600). Commits `9286fc2` (loop 174, #373), `35dba81`
(loop 175, #372), `550fc6e` (loop 176, #362). Previous review MR-070 at `5ebcc4c`. Rows closed: #373, #372, #362.
Rows filed by loops: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-070 (`ITERATION_LOG.md`, loop 176 Controls).
**Date:** 2026-10-03
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code, not even temporarily. No commit, no `git add`. Every
row, strike or annotation below is a recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `probe071.config.ts` + `probe071.spec.ts`: a Playwright config outside the repo (same pattern as MR-069/070: repo
  global setup, auth setup, dev server on port 3098) running 12 probes against the real preferences API and the real
  drawer (`probe071.txt`, `probe071b.txt`);
- `mut071/`: copies of `savedViewsSync.ts`, `ColumnPicker.tsx`, `utm-sanitize.ts` and their tests, a scratch vitest
  config aliasing `@/` to the repo, and `mut071.mjs`, which mutates the **copies** only (11 mutants, `mut071.txt`);
- `utm071.ts`: 28 adversarial inputs and a timing run through the real `sanitizeUtm` (`utm071.txt`);
- `ph071.mjs`: the installed posthog-js 1.367.0 in jsdom with the repo's `posthog.init` options and a fake transport
  (`ph071.txt`);
- `val071.txt`, `guard071.txt`, `root071.txt`, `web071.txt`, `tc071.txt`, `e2e071.txt`, `status_before.txt`,
  `status_mid.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing),
apart from this file. Every Playwright run started and stopped its own dev server; `netstat` shows nothing listening
on 3098 (or 3097) afterwards. The e2e global setup re-seeded the local SQLite test DB (normal); the probes snapshot
the test user's preferences and restore them (`restore 200` in both runs; 0 saved views before and after).

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 176 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6346 | **308 files, 6346 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4526 | **254 files, 4526 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 366 rows, 246 struck, **open 120** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| e2e `v2-a11y.spec.ts` + `saved-views-persistence.spec.ts` | 33 (loop 175) | **33 passed (1.8 min)**, 3 marked `x` (the known `test.fail`s) | matches |
| deltas | web 4488→4495→4503→4526; root 6318→6326→6346 | 174 +7 (jsdom `.tsx`, root unchanged), 175 +8, 176 +23 web / +20 root | consistent |

Pool arithmetic: MR-070 recorded 121 + #372 + #373 = 123. Loops 174, 175, 176 each struck one row and filed none:
**120**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), Firefox/WebKit, a screen reader, a real IME, PostHog with a real
key. Revert proofs ("6 of 7 fail on HEAD", "both new e2e fail on the old code", "the 3 UTMCapture tests fail with the
changes stashed") are agent-reported and were not re-run against the repo; the mutation runs on copies (§5) stand in
for them.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** 174 keeps focus inside the dialog on
   the three commit paths it was given (also at the 10-view limit); 175 sends one PUT at a time and coalesces
   correctly through abort, 500-then-500, rapid toggles and an unmount mid-flight; 176's sanitizer rejects every
   at-sign form in the row, including triple and quadruple encoding, and runs in linear time.
2. **Loop 175 turns one hung request into a session-wide stall (§3, N1).** `persist` has no timeout. With the first
   PUT held open, exactly one PUT was sent in 30 s; the UI showed both new views and "Saving…"; the server had none;
   after reload both were gone. Before 175 the second save went out on its own. Rare (needs a request that never
   settles), silent, and introduced by the fix's own design.
3. **#362's rule is right, but PostHog bypasses it (§4, N2).** With a key and full consent, posthog-js sends
   `utm_term: "john@example.com"` and the full query string in `$current_url` on every `$pageview`, measured with the
   installed 1.367.0 and the repo's init options. The same measurement shows **two `$pageview` per first load**
   (`capture_pageview: true` plus the provider's own). Dormant: production has no PostHog key (#278).
4. **One more sibling path in the drawer (§2, N3).** When a save fails, the rollback removes the new view whose Apply
   button 174 just focused; focus goes to `BODY` and Tab does not bring it back. Same when the computed neighbour is
   itself in delete confirmation.
5. **Smaller accuracy points, annotations not rows.** 174's stated limit (a mouse click on Confirm reaches `BODY`)
   does not reproduce: React reuses the Confirm button's DOM node as the rename trigger, so focus lands there by
   accident. 176's decode stops at the first malformed `%` anywhere in the value, so `john%2540example.com%` survives.
   Two sanitizer mutants survive the new tests. 175's "Saved" can appear while a later change is still in the
   400 ms debounce.
6. **The saved-views drawer has absorbed 6 of the last 8 loops (169-175), and each review has found the next
   sibling (§7).** The Area-saturation rule never fired because the work alternated between `web-app / a11y` and
   `web-app / dashboard` labels with 172 and 176 interleaved. This is a design gap, not a series of bad loops; a CEO
   note follows.
7. **Ratio, loops 167-176: 0.75** (9 closed / 12 created; 0.69 counting #368's promotion). Healthy.
8. **Push is still the first CEO action:** `main` is **35 ahead**; last deploy still loop 151; "Alerts check" still
   failing.

---

## 2. Loop 174 — #373 focus stays in the drawer (`9286fc2`): **HOLDS for the three named paths**

**Diff vs log:** matches. `commitRename(restoreFocus)` sets the row's pending focus on Enter and on the Confirm
button, not on blur; `handleDelete` computes the next, else previous, else Save target before removal; `handleSave`
targets the new view's Apply via `data-saved-view-apply`; a `savedViews`-keyed effect consumes the target; IME guard
(`nativeEvent.isComposing`) on the rename and new-name inputs. No copy. The limit ("a mouse click on Confirm…") is
stated.

**Probes** (`probe071.spec.ts`, Chromium, real API, seeded views):

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| F4 limit | 9 views; Enter-save "Tenth" | focus on "Apply saved view: Tenth", in dialog; Save trigger gone (10/10); then delete "View 0" → focus on "Apply saved view: View 1" | ✓ |
| F6 close at once | Enter-save, then Escape immediately | drawer closed; focus on "Customize columns" (the trigger); server has "Quick" | ✓ |
| F1 mouse Confirm | rename "Alpha" → click ✓ | committed (UI and server "Alpha-click"); editor closed; **focus on "Rename saved view: Alpha-click"**, in dialog | ✓ but by accident (below) |
| F2 Tab to Confirm | rename → Tab → Enter | Tab **commits** (blur) and focus lands on the rename trigger; Enter then **reopens the editor** | quirk; annotation |
| F3 neighbour confirming | Beta in delete confirmation; delete Alpha → Confirm | **focus on `BODY`** (target Beta's Apply does not exist); Tab returned into the dialog | **defect (N3, part 2)** |
| F5 failed save | Enter-save "Doomed", PUT answered 500 | focus on "Apply saved view: Doomed" until the rollback removes it; then **`BODY`; Tab stays on `BODY`**; Escape still closes the drawer | **defect (N3, part 1)** |

**Why F1 lands on the trigger.** The rename and normal branches of `SavedViewRow` both return the same `<div
role="listitem">`; children are reconciled by index, and index 2 is a `<button>` in both (Confirm in rename mode, the
rename trigger in normal mode), so React keeps the DOM node, and the focus that the mouse-down gave Confirm stays on
what is now the rename trigger. The log's limit is therefore inaccurate in Chromium, and the good outcome depends on
child order: adding an element before the trigger would turn it into the `BODY` case. Keyboard users cannot reach
Confirm at all, because Tab blur-commits first (F2); the rename is saved and focus is sensible, so this is a quirk,
not a defect.

**Screen-reader announcement.** Not run with a screen reader. By reading: focus moves are announced through the
target's label ("Apply saved view: Quarterly, button"), which implies success for save and rename; a delete is
announced only through the neighbour's label. The status bar's three `<p aria-live>` elements (`ColumnPicker.tsx:784-796`)
are each mounted with their text already in them, which many screen readers do not announce (a live region has to
exist before its content changes). One persistent live region would be the robust form. Noted, not filed: it needs a
real screen reader to grade.

**Mutants** (copies, §5): neighbour → always Save (2 fail), no IME guard (1), no restore on Enter-rename (1), no save
target (1). Each new behaviour is guarded by at least one jsdom test.

---

## 3. Loop 175 — #372 one save at a time (`35dba81`): **HOLDS for ordering; a hung PUT stalls everything**

**Diff vs log:** matches. `savedViewsSync.ts` gains `inFlight`, `dirty`, latest `columns`, `dueSave`, `takeQueued`;
`settleFailure` skips the rollback when `dirty`; the shell's `persist` (`DashboardV2Shell.tsx:532`) chains one
follow-up via `takeQueued` (`:579`) and sets "Saved" only when the chain ends (`:586`); `isMountedRef` guards state
after unmount.

**Pure logic, by reading.** `dueSave` defers while `inFlight`; `takeQueued` sends only when `dirty`; `startSend`
sends `columns` + `pending`. `settleSuccess` keeps identity semantics from 171. A failure with `dirty` leaves the UI
alone and lets the queued PUT (which carries the same or newer list) decide. Correct for every interleaving I traced.

**Probes:**

| Probe | Sequence | Result | Verdict |
|---|---|---|---|
| H1 hung PUT | create "Hung A" (PUT #1 never answered); create "Later B"; toggle a column; wait 30 s | **1 PUT sent**; UI `["Hung A","Later B"]`; status **"Saving…" for 30 s**; server `[]`; after reload **`[]`** | **defect (N1)** |
| H2 network abort | PUT #1 `route.abort('failed')`; then create another | rolled back to `[]` with the friendly message; the next save sends and shows "Saved"; server `["After abort"]` | ✓ |
| H3 failure, then queued failure | #1 held then 500; "F2" created meanwhile; #2 500 | while held "Saving…"; end: UI `[]`, friendly message, server `[]` | ✓ (honest rollback) |
| H4 rapid edits in a 3 s flight | 8 toggles at 120 ms, a create, 3 toggles at 500 ms | **3 PUTs total** (`#1 cols=8 views=1`, `#2 cols=7 views=2`, `#3 cols=7 views=absent`); UI and server equal before and after reload | ✓; status showed "Saved" while the last toggle was still in its debounce (annotation) |
| H5 unmount mid-flight | #1 held; "N2" queued; client-side nav to `/compare`; release | the queued PUT still went out after unmount; server `["N1","N2"]`; no console errors | ✓ |
| 400 ms debounce + full navigation | — | unchanged since 171 (MR-070 Q4); stated in 175's limits | stated |

**Why H1 happens.** `fetch` (`:536`) has no `signal` and no timer. Single-flight makes every later save wait for the
in-flight one to settle, so a request that never settles holds `inFlight` true for the rest of the page's life:
nothing else is sent, no error appears, and "Saving…" never clears. A browser fetch has no default timeout; a stalled
connection, a laptop resumed on another network or a hung server request can leave it pending for minutes. The same
mechanism has a milder form that is not rare: while a slow PUT is in flight, the queued save is not on the wire, so
leaving the page during the flight now drops it (before 175 it would already have been sent). The fix is local: abort
after a bounded time and treat it as the failure it is.

**Closure note accuracy.** "Saved shows only when the chain ends in success" is true of the chain but not of the
debounce: a change made inside 400 ms of a successful settle shows "Saved" before its own PUT is sent (H4; the old
code did the same). "A network abort takes the tested 500 path" is confirmed (H2). "The shell wiring is covered by
e2e only" is accurate.

**Mutants:** `dueSave` ignoring `inFlight` (6 of 16 fail), `settleFailure` ignoring `dirty` (2), `takeQueued` never
sending (5). All killed.

---

## 4. Loop 176 — #362 one rule for campaign tags (`550fc6e`): **HOLDS for the at-sign family; PostHog bypasses it**

**Diff vs log:** matches. New `lib/utm-sanitize.ts` (87 LOC: lone surrogates, up to 3 passes of NFKC +
`decodeURIComponent`, fail closed if still changing, strip `\p{Cc}\p{Cf}`, reject `@`/`%40`/U+FF20/U+FE6B, cap 64 code
points); `pricing-attribution.ts` re-exports it; `UTMCapture` sanitizes at capture; `getFirstTouchUTM` re-sanitizes
on read. 176's own limit flags `landing_path` / `referrer_domain`.

**Adversarial inputs** (`utm071.ts`, through the real function; the value is what `searchParams.get` returns):

| Input | Result | Verdict |
|---|---|---|
| `@`, `%40`, `%2540`, `%252540` (triple), `%25252540` (quad, fail-closed path) | null | ✓ |
| U+FF20, U+FE6B, `%EF%BC%A0`, fullwidth `％４０`, `@` + combining acute, ZWSP or ZWJ inside (`%4‍0`), RLO-wrapped address | null | ✓ |
| `%4o`, `%4O` (not an encoding) | kept as is (no at-sign) | ✓ not PII |
| **`john%2540example.com%`** and `john%2540example.com%ZZ` (URL `utm_term=john%252540example.com%25`) | **kept** | **bypass** (annotation) |
| tag character U+E0040 | stripped as `Cf`: `johnexample.com` | partial; annotation |
| `john at example dot com`, `john[at]example.com`, `&#64;`, `%u0040`, U+2E4F | kept | out of scope as written (row: at-sign family only) |
| `spring_sale-2026`, `summer+sale`, `+1 555 0100` | kept | ✓ benign (a phone number is out of scope) |
| 5,000,000 characters (plain, `%25` repeated, lone surrogates) | 60 / 43 / 38 ms | ✓ linear; the regexes have no nested quantifiers |

**The malformed-sequence bypass.** `decodeURIComponent` throws on any malformed sequence in the whole string, and the
`catch` (`utm-sanitize.ts:35-36`) keeps the text undecoded, so one stray `%` anywhere stops decoding of an encoded
address elsewhere in the value. It needs a doubly-encoded address plus a malformed sequence, so it is a deliberate
evasion rather than a likely accident. Rejecting every malformed value would fail an existing test (mutant M7), so the
targeted check is `/%(?:25)*40/i` on the undecoded remainder. Annotation on #362, not a row.

**Mutants:** dropping the control strip fails 2 tests; **one decode pass instead of three survives** (it drops benign
double-encoded values: `spring%2520sale` → null instead of "spring sale"); **removing NFKC inside the loop survives**
(fullwidth-encoded double encoding `％２５４０` then passes as `john%2540example.com`). Two missing test inputs, not
code defects.

**Is `landing_path` / `referrer_domain` a real PII risk?** Low. `landing_path` is `usePathname()` (no query string);
`referrer_domain` is a hostname. App paths are our own slugs and ids; the one sensitive segment is `/share/<token>`,
a capability token, and `signup_from_shared_sop` already sends that token on purpose (`SignupPageClient.tsx:63-68`).
Not filed. Where they go: `track()` sends to the first-party `/api/analytics/events` buffer and, when enabled, to
PostHog.

**PostHog (N2).** `lib/posthog.ts:40-49` initialises posthog-js with its defaults for campaign parameters and URLs:
`save_campaign_params` is on, there is no `before_send`, `mask_personal_data_properties` is off. `ph071.mjs` ran the
installed posthog-js 1.367.0 in jsdom with those options (plus two transport switches for the harness) on
`/pricing?utm_source=newsletter&utm_term=john%40example.com&utm_content=jane%252540corp.com`, then the provider's
manual `$pageview` (`PostHogProvider.tsx:37-41`). Result: **two `$pageview` payloads, each with
`utm_term: "john@example.com"`, `utm_content: "jane%2540corp.com"` and `$current_url` carrying the whole query
string.** Ledgerium's own events are clean after 176; the third-party copy is not, and page views on a first load are
counted twice. Today it is dormant (no key in production, per #278; capture needs `full` consent), so it belongs in
the "before PostHog is switched on" set with #355.

---

## 5. Mutation summary (copies in `mut071/`, never the repo)

| Mutant | Tests | Result |
|---|---|---|
| M1 `dueSave` ignores `inFlight` | savedViewsSync | 6/16 fail |
| M2 `settleFailure` ignores `dirty` | savedViewsSync | 2/16 fail |
| M3 `takeQueued` never sends | savedViewsSync | 5/16 fail |
| M4 one decode pass | utm-sanitize | **survives** (kill: `spring%2520sale` kept) |
| M5 no NFKC in the loop | utm-sanitize | **survives** (kill: `john％２５４０example.com` → null) |
| M6 no control strip | utm-sanitize | 2/20 fail |
| M7 malformed → reject (candidate fix) | utm-sanitize | 1/20 fail (an existing test keeps malformed text; use the targeted check) |
| M8 delete target always Save | ColumnPicker.escape | 2/10 fail |
| M9 no IME guard on rename | ColumnPicker.escape | 1/10 fail |
| M10 Enter-rename never restores focus | ColumnPicker.escape | 1/10 fail |
| M11 no save target | ColumnPicker.escape | 1/10 fail |

---

## 6. Governance

**Selection.**
- **174** `burn-down` #373 (11), MR-070's first pick. ✓
- **175** `burn-down` #372 (10), MR-070's second pick. ✓
- **176** `burn-down` #362 (10), MR-070's third pick; rotated `frontend-engineer` × 2 → `security-reviewer` (MR-070
  suggested `analytics`; either clears the agent rule; the row is a privacy rule, so the reviewer fits). ✓

All three followed MR-070 in order. The cool-off stayed armed (3/3 since 172) and unspent, correctly: burn-down
reached the top follow-up every time (MR-004 Change B logic).

**Density / follow-ups:** 0 created in all three; clause 3 did not fire. Each loop wrote a specific Limits list;
175's and 176's limits were accurate, 174's was not (§2).

**Ratio, loops 167-176** (same method as MR-069/070: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 9 | #361 (168), #105 (169), #367 (170), #369 (171), #360 (172), #370 (173), #373 (174), #372 (175), #362 (176); 167 partial |
| Created | 12 | MR-068 #361-#364; loop 169 #365-#367; MR-069 #369-#371; MR-070 #372-#373 |
| Ratio | **0.75** | above the ≥ 0.5 floor; 0.69 if #368's promotion counts |

This review files three rows. Window 168-177 then drops MR-068's four and, if 177 closes a row, reads 9 / 11 = 0.82.

**Validation line:** present in all three entries ("validator 0; guard runner 142/142") with named e2e runs and "no
port 3098 listener" in 174 and 175. Fifth consecutive window. #359 (enforce it in the validator) can stay at 9.

**Agents / Area.** 174 `frontend-engineer` (web-app / a11y), 175 `frontend-engineer` (web-app / dashboard), 176
`security-reviewer` (analytics / privacy). D-4 clause 1: no copy changed in any (175 kept 171's two strings). Clause 2:
`utm-sanitize.ts` 87 LOC, `savedViewsSync.ts` ~140 LOC, both under 200.

**D-1.** Last extension touch `871e29a`: **133 loops** at 176 (189 commits). "User-ack outstanding" logged every loop.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 35]`; every suite green at `550fc6e`. Loops 152-176 are not in production |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Alerts | scheduled "Alerts check" failing: `37099623595` (newest), `37079356379`, `37053616721` |
| #350 part 3, #351 item 5 | read production data | after the push |
| #225 | `TRUSTED_PROXY_HOPS` | open; still the only thing between a spoofer and every limiter |
| #278 / #355 / **N2** | PostHog keys absent; before enabling: identity reset (#355) **and** sanitized properties + one page view (N2) | N2 added to the precondition |
| #357 | signup disclosure decision | open |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | unchanged |
| **new** | saved-views design note (§7) | decision requested before #368 |

---

## 7. Pattern: the saved-views drawer (CEO note)

**The run.** 169 (#105, axe on the drawer; found #365-#367), 170 (#367, the PUT dropped saved views), 171 (#369, a
column click cancelled a saved-view save), 173 (#370, Escape closed the drawer), 174 (#373, commit paths lost focus),
175 (#372, two PUTs raced). This review: N1 (a hung PUT stalls every save) and N3 (rollback and missing targets lose
focus). Six of the last eight loops, one drawer and one endpoint, and every review since MR-069 has found the next
case. Each loop was correctly scoped and honestly validated; the loops are not the problem.

**The cause.** The feature (D+5, iter 062) was built without two things that would have named these cases up front:
1. **A persistence contract.** One debounced, whole-list-replace PUT shared by column toggles and saved-view edits,
   with no revision number, no timeout and no unload flush. Every defect in 170/171/175/N1 is a consequence of that
   shape, and two tabs editing views still clobber each other (accepted at MR-069).
2. **A focus map.** Which element receives focus after each of the drawer's actions, success and failure. 173, 174
   and N3 each filled one cell of that table.

**Why the controls did not catch it.** Area saturation counts labels, and the work alternated between
`web-app / a11y` and `web-app / dashboard`, with 172 and 176 interleaved, so "three in a row" never fired. The
follow-up density trigger never fired either, because the loops filed nothing; the reviews filed the siblings.

**Recommendation (one decision for the CEO).** Before #368 (saved views capture filters: a third payload dimension on
the same endpoint), spend one Define-phase slot on a one-page note owned by `system-architect` with `ux-designer`
adjacent: the save state machine (debounce, one in flight, timeout, failure, unload with `keepalive`, and whether to
add a revision to the PUT) and the drawer's focus table (every action × success/failure). Then let #368 and any
remaining sibling build against it. N1 is small and a regression, so it should not wait for the note. Practice for
the coordinator, no rule change: **count saturation by the primary file or component touched as well as by Area
label;** by that count 174, 175 and 177 would have been flagged.

---

## 8. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor, blocked/awaiting/parked statuses excluded (`top068.mjs`);
#113 restored by hand; #157, #127, #152, #159, #160 excluded as malformed or CEO-gated (MR-070 precedent). New rows
from §9 included. Verified at `550fc6e`:

| Rank | Row | Score | Kind | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | **N1** hung PUT stalls every save | 11 | follow-up | **true** | H1: 1 PUT in 30 s, "Saving…", server `[]`, lost on reload |
| 2 | **N2** PostHog sends raw tags, double page view | 11 | follow-up | **true** | `ph071.txt`: `utm_term: "john@example.com"` ×2 `$pageview` |
| 3 | #365 white on green-600 | 11 | follow-up | **true, 3 sites** | `ColumnPicker.tsx:587` (moved from `:555`), `PresetChipRail.tsx:176`, `UnifiedToolbar.tsx:211`; `test.fail` at `v2-a11y.spec.ts:883, :981` |
| 4 | #368 saved views capture and restore filters | 11 | audit | **true** | `DashboardV2Shell.tsx:1491` `currentFilters={[]}`; `handleApplySavedView` (`:673-675`) sets columns only |
| 5 | #113 pricing table semantics | 11 | audit | **true** | `pricing/page.tsx:258-273`: `<th>` without `scope`, no `<caption>` |
| 6 | #96, #103, #106, #114, #137, #174 | 11 | audit | per MR-067/068 | burn-down cannot reach these; cool-off only |
| 7 | **N3** focus after rollback / missing target | 10 | follow-up | **true** | F5 and F3 |
| 8 | #366 dimmed rows contrast | 10 | follow-up | true | `ColumnPicker.tsx:833` `opacity-60`; `test.fail` at `v2-a11y.spec.ts:772` |
| 9 | #355 identity reset | 10 | follow-up | true | `resetUser` (`lib/posthog.ts:78`) still has no caller |
| 10 | #371 preferences body and array caps | 9 | follow-up | true (MR-069/070) | unchanged route |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **A preferences PUT that never answers stops every later dashboard save for the rest of the session, with "Saving…" shown forever.** MR-071 §3. Loop 175 (#372) keeps at most one PUT in flight and holds later saves until it settles, but `persist` (`DashboardV2Shell.tsx:532-536`) calls `fetch` with no timeout or abort signal, so a request that never settles (a stalled connection, a laptop resumed on another network, a hung server request) is never followed by the queued save. Reproduced in Chromium against the real API with the first PUT held open: in 30 s exactly one PUT was sent; the UI showed both new views and "Saving…"; the server had none; after reload both views were gone. Before loop 175 the second save went out on its own and would have persisted. A slow (not hung) first PUT also means a queued save is not yet on the wire, so leaving the page during the flight drops it. Fix in the client: abort the PUT after a bounded time (for example 15 s, via `AbortController`) and treat the abort as a failure, so the existing path runs (send the queued save, or roll back and show the friendly message) and "Saving…" always ends. Tests: a unit or shell test that a timed-out flight releases the queue, and an e2e step in `saved-views-persistence.spec.ts` that holds the first PUT open (use `page.clock` to pass the timeout), creates a second view, and asserts a second PUT is sent and both views survive a reload. Follow-up of loop 175 (#372). | fix | web-app / dashboard | `frontend-engineer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| **N2** | **With PostHog switched on, every page view sends the raw campaign tags and the full query string, so the address #362 removes from Ledgerium's own events still reaches PostHog; the first page view is also counted twice.** MR-071 §4. `lib/posthog.ts:40-49` initialises posthog-js with its defaults for campaign parameters and URLs (`save_campaign_params` on, no `before_send`, `mask_personal_data_properties` off). Measured with the installed posthog-js 1.367.0 in jsdom, using the repo's init options and a landing URL `/pricing?utm_source=newsletter&utm_term=john%40example.com&utm_content=jane%252540corp.com`: each `$pageview` carried `utm_term: "john@example.com"`, `utm_content: "jane%2540corp.com"` and `$current_url` with the whole query string, and there were two `$pageview` events, because `capture_pageview: true` sends one at init and `PostHogProvider.tsx:37-41` sends another. Dormant today: production has no PostHog key (#278) and capture requires full consent. Fix before any key is set: a `before_send` hook that applies `sanitizeUtm` to every `utm_*` property (dropping rejected values) and removes the query string from `$current_url` and any other URL property it finds, and `capture_pageview: false` so the provider's page view (which also covers client-side navigation) is the only one. Tests: a unit test of the hook on the inputs above, and a jsdom test that initialises posthog-js with the repo options and a fake transport and asserts no at-sign in any payload and one page view per load. A precondition for enabling PostHog, alongside #355. Follow-up of loop 176 (#362). | fix | analytics / privacy | `analytics` | 2 | 4 | 2 | 5 | 1 | 1 | **11** |
| **N3** | **After a failed save rolls a new view back, focus is left on the page body and Tab cannot bring it back into the column picker drawer.** MR-071 §2. Loop 174 (#373) focuses the new view's Apply button after Enter-save; when the PUT then fails, loop 171's rollback removes that view and its button, and nothing chooses a new target. Reproduced in Chromium with the PUT answered 500: focus was on "Apply saved view: Doomed", then on `BODY` after the rollback; Tab left it on `BODY`; only Escape still worked. A second shape: when the delete target's neighbour is itself showing a delete confirmation (two rows confirming, reachable with the mouse), its Apply button does not exist, the target is dropped, and focus goes to `BODY`. Fix in `ColumnPicker.tsx`: when the list changes and the focused element has left the document, or the computed target is not found, focus the Save current view button (or the section heading when the list is at the limit) instead of dropping it. Tests: jsdom tests for both shapes, and a step in the `v2-a11y.spec.ts` saved-views test with the PUT answered 500 asserting focus inside the dialog. Follow-up of loops 171 and 174 (#369, #373). | fix | web-app / a11y | `frontend-engineer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |

**Annotations recommended:**
- **#373 closure note:** "[MR-071: holds for Enter-rename, delete (also at the 10-view limit) and Enter-save, and when
  the drawer closes right after a save. The stated limit does not reproduce in Chromium: a mouse click on Confirm
  leaves focus on the rename trigger, because React reuses the Confirm button's DOM node as the trigger (it depends on
  child order). Tab out of the rename input commits, so Confirm is never reached by keyboard and Enter then reopens the
  editor. A rolled-back create, and a delete whose neighbour is also confirming, leave focus on the page body (N3).
  The status messages are mounted with their text, which screen readers may not announce.]"
- **#372 closure note:** "[MR-071: holds; abort, 500-then-500, 11 edits in a 3 s flight (3 PUTs, UI equals server
  across reload) and an unmount mid-flight all behave. A PUT that never settles stalls every later save (N1).
  'Saved' can show while a change made just after a settle is still in its 400 ms debounce.]"
- **#362 closure note:** "[MR-071: holds for the at-sign family (28 inputs incl. triple and quadruple encoding,
  fullwidth, combining marks, ZWJ, RLO; linear on 5 M characters). Decoding stops at the first malformed sequence, so
  `john%2540example.com%` survives; a `/%(?:25)*40/i` check on the undecoded remainder closes it. Tests miss two
  mutants: one decode pass (`spring%2520sale`) and no NFKC inside the loop (fullwidth `％２５４０`). `landing_path`
  is a pathname and `referrer_domain` a hostname: low risk. PostHog receives the raw tags (N2).]"

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §3 H1 hung PUT stalls every save | N1 |
| §4 PostHog raw `utm_*`, full `$current_url`, double `$pageview` | N2 |
| §2 F5 rollback focus; F3 missing target | N3 |
| §2 F1 limit inaccurate, F2 keyboard Confirm quirk, live-region mounting | #373 note |
| §3 H4 "Saved" during a pending debounce | #372 note |
| §4 malformed-sequence bypass, U+E0040, M4/M5 survivors, landing_path assessment | #362 note |
| §7 saved-views pattern | CEO note (decision before #368) |

---

## 11. Loop 177-179 picks

**Before 177: push** (CEO item 1).

Pool 120 + 3 = 123 > 8, so burn-down unless a cool-off is invoked. The cool-off is armed (3/3 since 172).

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **177** | **N1** abort a hung preferences PUT | **11** | `burn-down` (follow-up of loop 175) | `frontend-engineer` | web-app / dashboard | a regression introduced by 175's design; same module while it is fresh; E2 |
| **178** | **N2** PostHog properties and one page view | **11** | `burn-down` (follow-up of loop 176) | `analytics` | analytics / privacy | rotates agent and Area; finishes #362's intent before keys are switched on |
| **179** | **#365** white on green-600 (3 sites) | **11** | `burn-down` | `frontend-engineer`, `ux-designer` adjacent (token choice) | web-app / a11y | removes two `test.fail`s; leaves the persistence path alone |

- **Cool-off: do not spend it at 177.** Burn-down already reaches 11 (N1, N2, #365), the same score as #368 and #113,
  so spending it buys nothing and yields no formula evidence (MR-004 Change B). Spend it at 180+ when the top
  follow-up drops to 10: on **#113** (11, E1/R1, pricing, a different surface). **Not on #368** until the §7 design
  note exists: #368 adds filters to the same whole-list payload.
- **Alternatives:** 179 → **N3** (10) if the coordinator prefers to finish the drawer's focus table while 174 is fresh;
  then #365 at 180. Do not put #365 and #366 in one loop unless one token decision covers both (they are separate
  rows).
- **Do not pick:** #368 before the design note; #371 alone (9) while N1 is open in the same flow; #145, #142, #170,
  #175 (blocked); #114 before #137; #159/#160 (CEO).
- **Then MR-072** (base cadence after 179).

---

## 12. Verdict

Every count reproduces at `550fc6e`: root 6346, web-app 4526, typecheck 0, validator clean (open 120), guard runner
142/142, e2e 33 passed with three expected failures.

- **Loop 174 holds** for its three paths and at the view limit. Its stated mouse limit is inaccurate (focus lands on
  the trigger by DOM reuse); a rollback or a missing target still drops focus (N3).
- **Loop 175 holds** for ordering, abort, failures and unmount. A PUT that never settles now stalls every later save
  (N1).
- **Loop 176 holds** for the at-sign family in Ledgerium's own events. PostHog, when enabled, receives the raw tags
  and the full URL, and counts the first page view twice (N2).

Selection followed MR-070 exactly, the cool-off was correctly kept, the validation line is in every entry, no loop
filed a row, and the ratio is 0.75. Two asks for the CEO: push, and a one-page saved-views design note before #368.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 120
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6346 / 4526 / 0
(cd apps/web-app && pnpm exec playwright test --project=authenticated \
   e2e/app/dashboard/v2-a11y.spec.ts e2e/app/dashboard/saved-views-persistence.spec.ts)   # 33 passed, 3 x
(cd apps/web-app && NODE_PATH=$PWD/node_modules pnpm exec playwright test --config $S/probe071.config.ts)
   # H1 1 PUT in 30 s, lost on reload; H2-H5 ok; F1 trigger; F2 reopens; F3/F5 BODY; F4/F6 ok
(cd apps/web-app && npx tsx $S/utm071.ts)       # 28 inputs; john%2540example.com% kept; 5 M chars ~60 ms
node $S/ph071.mjs                               # 2 x $pageview, utm_term "john@example.com", full $current_url
node $S/mut071.mjs $S/mut071                    # 11 mutants on copies; M4, M5 survive
git log origin/main..main --oneline | wc -l                                        # 35
```
