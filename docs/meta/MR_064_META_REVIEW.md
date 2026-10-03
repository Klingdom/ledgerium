# MR-064 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 153-155, 2026-10-02 20:36 → 20:47 (−0600). Commits `b64b6cc` (loop 153, #343), `82ea2b2` (loop 154,
#342), `9dc7ccc` (loop 155, #344). Rows closed: #343, #342, #344. Rows filed by loops: none.
**Why now:** base cadence, 3 of 3 since MR-063 (`ITERATION_LOG.md:12`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Everything below that needs a row, a strike
or a fix is a recommendation for the coordinator. Scratch files went only to `…/scratchpad/` (`g/` guard-runner probe
directories, `grev/` the pre-153 runner, `de/` decision-engine probes, `derev/` a copy of the engine with the pre-154
`detectDecisions.ts`, `v/` validator tamper copies of the live log, `validate-old.mjs` the pre-155 validator).
`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file.

**Where the checks ran.** Main checkout at `9dc7ccc`, Windows, Git Bash, node v24.20.0, plus **node 20** (via
`npx --yes node@20`) for every guard-runner probe, because CI pins `node-version: '20'` (`deploy.yml:24`).

**Validation run for this review (executed, not inferred):**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6167 | **296 files, 6167 passed, exit 0** | matches |
| `packages/decision-engine` vitest | 144 | **6 files, 144 passed** | matches |
| `node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json` | 80 | **files=6 tests=80 real_pass=80, exit 0** (4+2+10+6+23+35 = manifest) | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**, 337 rows, 217 struck, open **120**, 22 strict-checked lines | matches (log said 21 before loop 155 added its own line) |
| Loop 153 "first batch of new runner tests fail on HEAD" | 10 | pre-153 runner + post-153 tests: **13 of 23 fail** (12 of the 13 new `#343` tests + the rewritten skip test; `#343` test 18 passes on HEAD) | consistent |
| Loop 154 "8 of 14 fail on revert" | 8 | pre-154 `detectDecisions.ts` in a scratch copy: **8 fail / 136 pass**, all 8 in `hardening342.test.ts` | matches; see §3 for *which* 6 pass |
| Loop 155 "11 of 14 fail on HEAD (2 guard rails, 1 copy artifact)" | 11 | `VALIDATE_BACKLOG_SCRIPT=<pre-155 copy>`: **13 of 35 fail** = 12 of the 14 new (tests 27 and 31 pass) + test 13; test 33 is the copy-location artifact | matches |
| Production CI for `a14c5e8` (loop 151) | — | run `37088974348` **success** (quality-gate, both e2e jobs, build, deploy) | first full green run with the guard runner |

**Not run:** Docker, any browser, the web-app suite in isolation, Playwright, any HTTP request. Loops 152-155 have
never run on GitHub (§5).

---

## 1. Lead

**Every count reproduces, every revert proof reproduces, nothing reverts. Loops 153 and 154 hold. Loop 155's title
claim does not.**

1. **Loop 155, "no heading switches it off", is false in the case that matters.** One mistyped heading
   `(loop 133)` (for example, at loop 153's position) moves the anchor. The check then covers 2 of 22 lines and reports
   **clean** over a tampered loop-152 line (§4). The limit "the first loop-133 heading wins" is disclosed, but the
   title says the opposite. Lines in five common shapes are still invisible to it: italic `*Follow-ups:*`, numbered
   `1.`, blockquote `>`, a non-ASCII hyphen, and an em-dash separator. Two further gaps: text after the closed clause
   is unchecked, and a summary line can be deleted with no complaint.
2. **Root cause is the recording again, for the second review running.** MR-063's N3 had five items. Row #344 carried
   four of them in narrowed form and dropped three sub-items: numbered/blockquote recognition, "scanned = loops", and
   end-anchoring. The loop then fixed the row as written. This is the same transcription loss MR-063 §5 found for #339.
   The §7 finding→row map was written, but the coordinator did not copy it into the row.
3. **Loop 153 holds.** None of the 28 probes passed on nothing, on either node version (§2). The residue is small: an
   empty manifest with no files passes, duplicate JSON keys are silently last-wins, and the file floor is gone.
4. **Loop 154 holds for every `approval_decision`** (§3). Two caveats:
   - The cap is keyed on the label lexicon. "Approve" vs "Request changes", or a homoglyph "Аpprove", is typed as
     something else and still scores 1.00.
   - The retry test is vacuous. The fixture attaches no observed condition, and the test passes on revert. The log's
     "signal 6 (an approve retry)" path was not demonstrated.
5. **Portfolio.** 8 of the last 10 closures were MR-filed rows, at a median age of 2.5 loops. 9 of the 10 rows created
   in the window were MR-filed. The pool is flat at 120. Six consecutive loops (150-155) were CI, validator or engine
   work with no consumer. The last user-facing loop was 146. The oldest-rows triage (§6) clears 8 of the 20 oldest
   rows outright and re-statuses 5.

---

## 2. Loop 153 — #343 guard manifest (`b64b6cc`): **HOLDS**

Probes: one scratch directory per case, run through the real runner with `--dir <case> --manifest <case>/m.json`, on
node 24 **and** node 20. Results were identical on both versions unless marked.

| Probe | Exit | Caught as / assessment |
|---|---|---|
| file renamed, manifest stale (`old.test.mjs` listed, `new.test.mjs` present) | 1 | "new… is not in the manifest" **and** "lists old… but it was not run" ✓ |
| duplicate test names in one file | 0 | counted 2; correct: they are two executed tests |
| one test fails, and one was deleted (manifest 3, file has 2 incl. a failure) | 1 | failure **and** "2 deleted or not running". A failure cannot mask a deletion; the count is overstated by the failing test (disclosed limit) |
| test registered by `setTimeout(…, 200)` after load | 0 at 2 / 1 at 1 | late tests run and are counted ✓ |
| `test.only` with 2 siblings | 0 at 3 / 1 at 1 | `only` is ignored without `--test-only`; all 3 run and count ✓ |
| `a.test.mjs` imports sibling `b.test.mjs` | 0 (a=3, b=2) | **double counted** (b's tests run inside a too); deleting a b test fails **both** entries, so this fails safe. No real file does this (grep) |
| manifest lists an extra file that does not exist | 1 | "lists ghost… but it was not run" ✓ |
| count `-1`, `1.5`, `"1"`, `[]` | 1 | rejected ✓ |
| count `1.0` | 0 | JSON parses to integer 1, which is correct |
| **duplicate JSON key `{"e":5,"e":2}`** | **0** | **`JSON.parse` keeps the last value silently**, so a reviewer reading the first line sees 5 |
| key `./e.test.mjs` | 1 | not normalised; fails safe (unlisted + not run) |
| **manifest `{}` and no test files** | **0** | **passes**. With `--min-files` removed from CI (`deploy.yml:57`), deleting every `scripts/*.test.mjs` and emptying the manifest in one commit is green |
| `process.exit(0)` mid-file | 1 | zero-test + empty-file ✓ |
| top-level test named `x.test.mjs` | 1 | false "empty file"; fails safe (as at MR-063) |
| parent + 2 `t.test` children | 0 at 3 | parents count (consistent; undocumented, MR-063 N2(4) not carried) |
| un-awaited `t.test` children | node 24: 0 at 3; **node 20: 1** | version-dependent, but fails loudly on the CI version ✓ |

- **Wiring.** `deploy.yml:57` is in job `quality-gate`. That job is a `needs:` of `build-and-push` (`:116`), and
  `deploy` depends on `build-and-push`. Step order is guard tests → typecheck coverage → Dockerfile → Prisma → typecheck
  → vitest → web-app vitest → validator. Correct.
- **Not yet run on GitHub.** `origin/main` is `a14c5e8`; `b64b6cc` is local (§5). The loop says so.
- **Claims:**
  - "Deleted, added-unrecorded, unlisted or empty test files fail": **holds**.
  - "Verified on node 24 and 20 (66 tests)": holds for that commit. It is now 80 after loop 155.
  - "A count that cannot lag": **holds**, because exact equality replaced the floor.
- **Residue** (new row N2 below): the empty-manifest pass, duplicate keys, and the lost file floor. All three need a
  same-commit edit to the manifest, so they are reviewer-catchable, which is the loop's own stated limit. Low.

---

## 3. Loop 154 — #342 approval cap (`82ea2b2`): **HOLDS for the typed decision; one vacuous test**

The change (`detectDecisions.ts:150-155`) adds `decisionType === 'approval_decision'` to `allInferred`, after
`inferQuestion`. `inferQuestion` puts the approval pair **first** in precedence (`question-inference.ts:52`), using
the same `isApprovalLabel`/`isRejectionLabel` test as `isApprovalPair`. So a node with any approve **and** any reject
outcome is always typed `approval_decision`, and validation, exception and options signals cannot re-type it.

Probe harness: scratch vitest file importing `packages/decision-engine/src/*.ts` by absolute path, 4-run fixtures.

| # | Input | Result | Assessment |
|---|---|---|---|
| 1 | approve/reject, modal on approve | approval 0.54 (raw 1.00) | ✓ (MR-063 probe B closed) |
| 2 | approve/reject, `modalKind:'error'` | approval 0.54 | ✓ (precedence 1 beats exception) |
| 3 | approve/reject, consistent offered options | approval 0.54 | ✓ (MR-063 probe A closed) |
| 4 | approve / reject / escalate (3 outcomes), options + modal | approval 0.54 | ✓ multi-outcome |
| 5 | save / approve / reject, `uiState` differs | approval 0.54 (raw 0.90) | ✓; recall loss on the save branch, acceptable |
| 6 | approve/reject with differing `actorRole` | approval 0.54 | the observed role is suppressed too (was `business_rule`). This is a design choice for #340's review, not a defect |
| 7 | **approve vs "request changes"**, options | **user_choice 1.00**, not inferred | not an approval pair lexically; see N3 |
| 8 | **approve vs "send back"**, error modal | **exception_handling 1.00** | same |
| 9 | **"Аpprove" (Cyrillic А) vs reject**, options | **user_choice 1.00** | homoglyph defeats `APPROVAL_RE` (NFC does not fold) |
| 10 | full-width "ａｐｐｒｏｖｅ" vs reject | unknown_inferred 0.54 | fails safe (no signal) |
| 11 | rejection-only pair (reject / decline), options | user_choice 1.00 | by design: options are observed; not an approval |
| 12 | "approval" / "rejection" (nouns), options | user_choice 1.00 | the regex needs the verb forms. Recall, not honesty |
| 13 | non-approval `system_state` (uiState split) | **1.00** | still reachable legitimately ✓ |
| 14 | non-approval options (ship/hold) and error modal (save/retry) | 1.00 / 1.00 | ✓ |

- **P01** (`isInferred` ⇔ confidence < 0.55): **holds** by construction (`detectDecisions.ts:172` reads only
  `confidenceScore`), and in every probe above.
- **"8 of 14 fail on revert": reproduced.**
  - **The 8 that fail:** modal ×2, options, modal+options, error-modal+options, "evidence retained", and both P01
    tests. The two P01 tests fail only because they also assert approval ⇒ inferred, so their names under-describe
    them.
  - **The 6 that pass on revert:** the non-approval exception test, 3 shuffle tests, the 0.95 golden, and
    **"approve outcome retries (signal 6 observed)"**.
- **The retry test is vacuous.** On current code `retryOnApprove` gives `approval_status:inferred` on both outcomes,
  raw 0.90. Signal 6 attaches **no observed condition** for this fixture, so the cap was never needed there. The log's
  "Paths found … signal 6 (an approve retry)" and the commit's "or a retry can no longer lift" were not demonstrated.
  The claim is still true (nothing lifts an approval decision); the evidence for that path is missing. Annotation only.
- **The restored 0.95 golden** (`system_state`, full `confidenceTerms` equality) closes MR-063's lost-test finding ✓.
- **Lexicon dependence (N3).** The same evidence scores 0.54 or 1.00 depending on whether the other label contains a
  rejection word (probes 3 vs 7). Recommend appending this to #338 (lexicon) and #340 (architect review). Do not file
  a new engine row while the engine has 0 consumers.
- **Narrative drift found in passing.** #340's MR-063 append says "mask or hash [`runId`/`stepId`/`eventIds`] at the
  boundary". MR-063 N4 said "do **not** mask them; state that they must be opaque, and decide whether the boundary
  rejects non-opaque ids". Recommend correcting #340 to MR-063's wording, per the MR-012 source-verification rule.

---

## 4. Loop 155 — #344 strict Follow-ups check (`9dc7ccc`): **PARTIALLY — the title claim is false**

Harness: copies of the live `ITERATION_LOG.md`, with a single change each (usually loop 155's own summary line,
`:42`), run through `VALIDATE_ITERATION_LOG_FILE=<copy> node scripts/validate-backlog.mjs`.

| Tamper | Exit | Should be |
|---|---|---|
| unmodified copy; **CRLF** whole file | 0 / 0 (22 lines) | ✓ |
| anchor written `(Loop 133)` | 0 (22 lines) | ✓ (case-insensitive) |
| anchor renamed `(loop 133a)` | 1 "anchor … not found" | ✓ |
| `- **follow-ups:**`, `**FOLLOW-UPS:**`, `Follow-up:` | 1 "misspelt label" | ✓ |
| `0 created; closed #344`, missing `created` clause | 1 | ✓ |
| `1 closed (#344, #344)` | 1 "count 1 != 2" | ✓ |
| `1 closed (#9999)` (no such row) | 1 "not in the backlog" | ✓ |
| `1 closed (#13)` (open row) | 1 (V4 mismatch, not struck) | ✓ |
| struck clause + trailing `none` | 1 | ✓ |
| canonical line inside a code fence, malformed | 1 | ✓ (fences are scanned; fails safe) |
| `1 closed (#344 extended from #343)` | 1 | false positive; the disclosed known limit ✓ |
| `2 closed (#344, #344)` | **0** | FAIL (duplicate id counted twice) |
| `1 created (#13)` (an old open row claimed as created) | **0** | FAIL (created ids only need to exist) |
| `0 closed (#344)` | 0 | by design (N = 0 ignores the parenthetical) |
| **a newer heading `## 2026-10-02 (loop 133) …` at loop 153's position, tampered loop-152 line below it** | **0, "strict-checked 2 … clean"** | **FAIL — the kill switch survives in narrowed form** |
| **italic** `- *Follow-ups:* 0 created; closed #344` | **0** (21 lines) | FAIL |
| **numbered** `1. **Follow-ups:** …` | **0** | FAIL (MR-063 N3(3), dropped from #344) |
| **blockquote** `> - **Follow-ups:** …` | **0** | FAIL (MR-063 N3(3), dropped) |
| **`Follow‑ups` (U+2011)** / **`Follow–ups` (U+2013)** | **0** | FAIL (`[- ]?` is ASCII only) |
| **`**Follow-ups** — 0 created; closed #344`** (em-dash separator) | **0** | FAIL |
| line inside `<!-- -->` | 0 | acceptable (invisible when rendered) |
| **summary line deleted** | **0** (21 lines; claims 134 → 133) | FAIL: #344 is struck with no closing claim, and nothing notices |
| **three summary lines deleted (loops 153-155)** | **0, "strict-checked 19"** | FAIL (MR-063 N3(2) "scanned = loops", dropped) |
| `… 0 created, 0 closed. Also shut #13 quietly.` | **0** | FAIL (MR-063 N3(5) end-anchor, dropped) |
| second line `… 1 closed (#344); also closed #13` | **0** | FAIL; Form 1 reads only `#13 closed`, not `closed #13` |

- **Anchor logic.** `HEADING_OWN_LOOP = /^##\s+\S+\s+\(loop\s+(\d+)\)/i`, and `findIndex` takes the **first**
  match. A unique-anchor assertion would close the mis-typed-heading case in one line.
- **Reverse check missing.**
  - V4 checks that every claimed closure is struck. It does not check that every row struck as "CLOSED loop N" is
    claimed in loop N's summary line.
  - So the strongest tamper is the simplest: delete or disguise the line.
  - The aggregate "claims 134 → 133" is printed but not asserted.
- **Commit and log claims:**

| Claim | Verdict |
|---|---|
| Title "no heading switches it off" | **false**. One heading switches off 20 of 22 lines |
| "missing anchor / zero lines fail" | holds |
| "near-miss spellings fail" | **partly**. Case and singular/space variants fail; italic, numbered, blockquote, non-ASCII hyphen and em-dash shapes are not seen |
| "closed ids must exist and match the count" | holds, except duplicate ids |
| "only fully struck lines exempt" | holds |
| "first loop-133 heading wins" (limit) | true and disclosed; it is the same hole as the title |
| revert proof 11 of 14 | holds |

- **Third loop on this validator in four.** It keeps closing the probes it is given. The open gaps are regex
  enumeration of shapes. The structural fix is to parse **entries**: for each loop heading above the anchor, require
  exactly one canonical summary line, and require that its closed ids equal the rows struck "CLOSED loop N". That
  makes shape-guessing unnecessary. This is N1.

---

## 5. Governance

**Selection.**
- **153:** `burn-down` #343 (12).
- **154:** `burn-down` #342 (13). Path-e was 2 of the last 5 (149, 151), so no penalty. Correct.
- **155:** `burn-down` #344 (12).
- All three were MR-063's endorsed sequence. No driver errors.

**Is the pool being drained mainly by self-generated MR rows? Yes.** Window loops 146-155:

| | Count | Source |
|---|---|---|
| Closed | 10 | **8 MR-filed** (#334 MR-060; #335, #337 MR-061; #339 MR-062; #325 MR-058; #343, #342, #344 MR-063), 1 loop-filed (#331), 1 audit row (#122, via cool-off) |
| Created | 10 | **9 MR-filed** (MR-061 #335-337, MR-062 #339-341, MR-063 #342-344), 1 loop-filed (#338) |
| Ratio | **1.0** (≥ 0.5) | validator median age-at-close 2.5 loops; open pool 120 → 120 |

- **Reading.** The ratio passes, but it is now measuring the review→fix pipeline, not debt reduction. Neither term
  touches the 104 non-blocked open rows outside that pipeline.
- **Score table.** The top of the table is dominated by rows already flagged stale or overlapping: #108 (16,
  "premise unverified"), #168 (14, "POSSIBLE OVERLAP"), #90 and #150 ("MATERIALLY STALE"), #94 and #177. Those rows
  are never picked, so the scores are not discriminating.
- **Recommendation:**
  1. Apply §6.
  2. Extend the same keep/re-score/delete pass to the **top 15 rows by score** at MR-065, so `top-score` means
     something when the cool-off is spent.
  3. Record triage strikes as MR-064 triage, **not** as loop closures (no ratio credit).

**Cool-off.** It was consumed at 149, and loops 150-152 re-armed it to 3/3. Loops 153-155 burned down without spending
it, so it stays 3/3. Re-arming does not stack. Correct.

**Area / portfolio.**
- **Last 6 loops:** 150 ci, 151 path-e, 152 tooling, 153 ci, 154 path-e, 155 tooling.
- **Saturation rule:** never trips, because the labels alternate.
- **Effective concentration:** 4 of 6 loops on the repo's own guard/validator tooling, 2 of 6 on an engine with 0
  consumers and 0 producers.
- **Product-facing work:** last at loop 146 (web-app), 9 loops ago.
- **At 156, last 5 areas:** path-e 2/5, tooling 2/5, ci 1/5. No −2 penalty applies to any area.

**D-1.** Loops 153-155 log "**reverse-portfolio-drift: user-ack outstanding** (CEO queue item 21)". This is more
honest than MR-063's informal counter, but it is an explicit statement that the required ack is missing, now at **112
loops**. It is still CEO item 21. No row. The fact underneath is unchanged: extension rows are CEO-gated. #13 (§6) is
one that is not marked so.

**Recording fidelity (practice, no rule).** MR-063 introduced the finding→row map. #344 then lost 3 of N3's
sub-items, and #340 inverted N4's guidance. **Practice change:** when recording an MR, paste the MR's row text verbatim
as the row's scope. Closing loops cite every numbered item, as **fixed**, **dropped with reason**, or **split to #N**.

**CEO queue.**
- **Push:** `git status -sb` → `main...origin/main [ahead 6]`. `git log origin/main..main` = `b956c68`, `1fcf6b9`,
  `ad185b6`, `b64b6cc`, `82ea2b2`, `9dc7ccc`.
- **CI never run on the new checks:** the new `--manifest` CI step (153) and both validator rewrites (152, 155) have
  never run on GitHub. `origin/main` = `a14c5e8`. Its run `37088974348` is **success end to end** (quality-gate, e2e,
  build, deploy).
- **Alerts:** every scheduled "Alerts check" still **fails** (latest `37079356379`). This is CEO item 4, unchanged.

---

## 6. Part B — oldest-rows triage (20 oldest open, non-blocked)

Selection: the validator's own rule, the lowest-numbered unstruck rows above `### Completed (historical)` whose
status does not match `blocked|awaiting CEO` (104 of 120 open). Every verdict was checked against the current code at
`9dc7ccc`.

| Row | Score | Title (short) | Verdict | Evidence |
|---|---|---|---|---|
| #13 | 10 | recorder failure-state UX after service-worker interruption | **re-status** → blocked (extension, CEO gate) | still true: no interrupted/recovered UI in `apps/extension-app/src/sidepanel` (only `TruncationWarningBanner`, `HistoryDetailScreen.tsx:130`). It is the "oldest open" metric's anchor (~253 loops), but no loop can pick it |
| #17 | 9 | extract shared ingestion service (upload/sync) | **re-score / rewrite** (→ ~6) | the service exists: `lib/ingestion.ts` has been used by both `api/upload/route.ts:6` and `api/sync/route.ts:6` since `189b0fb` (2026-03-28). Residue: the two routes share 139 identical unique lines of persistence code. Rewrite as "dedupe upload/sync persistence" or delete |
| #27 | 9 | `account.spec.ts` asserts `plan='free'` vs seeded growth | **close-as-already-done** | `e2e/api/account.spec.ts:14-18` asserts `growth`, citing row #200 (loop 33) |
| #28 | 7 | non-free user without `stripeCustomerId` → contact-support path | **keep** | still true: `api/billing/portal/route.ts:24` returns 400 "No billing account found"; `account/page.tsx:442` shows it verbatim, with no support path |
| #29 | 9 | `pnpm --filter <pkg> test` finds no tests | **keep** | still true: `pnpm --filter @ledgerium/segmentation-engine test` → "No test files found, exiting with code 0" (6 test files exist). The same for normalization, policy, schema-events and shared-types. `--passWithNoTests` hides it. CI is unaffected (root run, `deploy.yml:79`) |
| #35 | 10 | Starter value story "clean exports" → outcome | **close-as-already-done** | the guidance strip now reads "Starter · Document solo, share cleanly" (`pricing/page.tsx:233`); "clean exports" survives only as a comparison-table feature row (`:86`), which is correct there |
| #37 | 6 | `PRO_PRICE_ID ?? ''` adds an empty-string key | **close-as-already-done** | `lib/stripe.ts:76` `if (PRO_PRICE_ID && !STRIPE_PRICE_TO_PLAN[PRO_PRICE_ID])`, so an empty string is never mapped |
| #38 | 7 | `APP_URL` hard-coded fallback | **keep** (fix locator) | still true, now at `lib/stripe.ts:155` `process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'`; consumed at `checkout/route.ts:208,405` |
| #39 | 6 | `UpgradeButton` `setTimeout` without cleanup | **keep** | still true: `UpgradeButton.tsx:87` |
| #41 | 7 | `admin_bypass` E2E contract test | **delete-as-stale** | the contract is pinned at route level: `checkout/route.subscription-readiness-gates.test.ts:314` asserts `code === 'admin_bypass'`; the E2E adds only an auth-fixture cost |
| #42 | 8 | retire `computeHealthScore()` v1 | **keep** | v1 is still live: `api/workflows/route.ts:6,605`, `api/workflows/[id]/route.ts:9,141` |
| #43 | 9 | `computeInsightChips` takes `staleCount` | **keep** | signature unchanged, `workflow-metrics.ts:725-728` |
| #44 | 9 | `sort=opportunity` / `sort=health_score` on `/api/workflows` | **re-score** (→ ~6) | still unsupported (`route.ts:416-423` falls back to `createdAt`). The dashboard **sends** `?sort=health_score&dir=asc` (`DashboardV2Shell.tsx:345`), which is silently ignored, and sorts client-side (`WorkflowList.tsx:136`). There is no pagination, so the impact is a dead parameter. Smallest fix: drop the param or 400 on unknown sort |
| #45 | — | system icon mapping for the Systems column | **keep + repair score cell** | still text pills (`WorkflowRow.tsx:1042`); the score cell is still unreadable (MR-034) |
| #46 | 5 | adopt TanStack Query | **delete-as-stale** (record the deviation) | not installed (`apps/web-app/package.json`); the fetch pattern is used everywhere; nothing has needed it in ~130 loops. CLAUDE.md's tech-stack line should note the deviation, which is a coordinator call |
| #55 | 9 | `.gitignore` monorepo paths for `e2e/.auth/`, `prisma/test.db` | **close-as-already-done** | `apps/web-app/.gitignore:15,32`; `git check-ignore -v` matches both paths |
| #56 | 7 | `docs/features/user-templates/` governance decision | **close-as-already-done** | the 12 files are tracked (`git ls-files … | wc -l` = 12), so the "present in working tree, undecided" premise is gone |
| #57 | 10 | post-soak `?v2=0` retirement | **re-status** → blocked-on-CEO | still true (`dashboard/page.tsx:319`); it sits in the CEO queue (MR-063 §9 items 5-18 list #57) but is not marked blocked |
| #58 | 9 | `growth-strategist` review of iter-024 chip labels | **delete-as-stale** | the reviewed labels no longer exist; rewritten by #208 (loop 23) and #209 (`workflow-metrics.ts:737-742`). Future copy review falls under D-4 clause 1 and #338 item (6) |
| #60 | 7 | per-workflow delta arm of `needsAttention` | **keep** | still excluded: `WorkflowList.tsx:259` "delta ≤ −10 excluded from v1" |

**Totals:**

| Verdict | Count | Rows |
|---|---|---|
| close-as-already-done | 5 | #27, #35, #37, #55, #56 |
| delete-as-stale | 3 | #41, #46, #58 |
| re-score / re-status | 5 | #13, #17, #44, #45, #57 |
| keep | 7 | #28, #29, #38, #39, #42, #43, #60 |

- **Pool effect:** 120 → 112 if all 8 strikes are applied.
- **Oldest metric:** after the re-statuses of #13 and #57, the oldest non-blocked row becomes **#28**.
- **Score distribution:** none of the 7 "keep" rows scores above 9. All are cheap (E1-2) product-correctness items:
  billing UX, test hygiene, a dead timer. They have aged because `burn-down` always found a younger MR row with a
  higher score. That is the selection effect behind §5.

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R.

| Id | Title and scope | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The strict Follow-ups check still misses deleted, disguised and mis-anchored lines.** §4. Replace shape-matching with entry parsing. (1) The anchor must be unique (fail on a second `(loop 133)` heading). (2) Every loop heading above the anchor must contain **exactly one** canonical `Follow-ups:` line (closes deletion, italic, numbered, blockquote, U+2011/U+2013 and em-dash shapes, and "scanned = loops"). (3) **Reverse check:** the closed ids in loop N's line must equal the rows struck "CLOSED loop N", in both directions. (4) End-anchor the grammar (closes `…; also closed #13`). (5) Reject duplicate ids. (6) Created ids must be rows born at that loop (`L<N>`). Tests for each §4 FAIL row, plus a real-log tamper per item. | tooling / governance | `qa-engineer` | 3 | 4 | 2 | 5 | 2 | 1 | **11** |
| N2 | **Guard manifest residue.** §2. (1) Reject an empty manifest. (2) Reject duplicate JSON keys (scan the raw text for repeated keys). (3) Restore `--min-files 6` beside `--manifest` in `deploy.yml`, or assert the manifest file count equals the glob count. (4) Document that parent tests count (MR-063 N2(4), never carried). | test-infra / ci | `devops-engineer` | 2 | 4 | 1 | 5 | 1 | 1 | **10** |
| N3 | **The approval cap depends on the label lexicon.** §3 probes 7-9, 12. Approve vs "request changes" / "send back" / "return to sender", the homoglyph "Аpprove", and the noun forms "approval"/"rejection" are not typed as approval, so they score 1.00. **Recommend appending to #338** as items (22)-(24) (lexicon, NFKC plus confusable folding, an approval-without-rejection rule). Put the question "should an observed actor role still lift an approval?" (probe 6) in #340's review. No new row while the engine has 0 consumers. | path-e / decision-detection | `security-reviewer` | 2 | 4 | 2 | 4 | 1 | 1 | **10** |

**Annotations recommended:**
- **#342 closure note:** "[MR-064: holds for every approval_decision. The retry fixture attaches no observed
  condition (raw 0.90, both outcomes inferred), and its test passes on revert, so the 'retry' path was not
  demonstrated. Lexicon bypasses: see #338 (22)-(24).]"
- **#344 closure note:** "[MR-064 correction: a second `(loop 133)` heading still narrows the check to the lines above
  it (2 of 22, clean over a tampered line). Italic, numbered, blockquote, non-ASCII-hyphen and em-dash lines, deleted
  lines, and trailing text pass. MR-063 N3 items 2, 3 (part) and 5 were not carried into the row. See N1.]"
- **#340:** restore MR-063 N4's wording: ids stay unmasked, are declared opaque, and the boundary decides whether to
  reject non-opaque ids.

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §4 mis-typed anchor, invisible shapes, deleted lines, no reverse check, trailing text, duplicate ids | N1 |
| §2 empty manifest, duplicate keys, lost file floor, parents undocumented | N2 |
| §3 lexicon/homoglyph bypass, noun forms; actor-role suppression | N3 → #338 (22)-(24); question → #340 |
| §3 vacuous retry test | #342 annotation |
| §3 #340 N4 inversion | #340 correction |
| §5 recording loses sub-items | practice change (paste MR row text verbatim) |
| §5 top-of-table stale scores | MR-065 agenda: triage the top 15 by score |
| §6 triage verdicts | coordinator applies; strikes recorded as MR-064 triage, no ratio credit |

---

## 9. Loop 156 pick and the next two

Pool 120 (112 after §6) > 8 ⇒ `burn-down`. Cool-off is 3/3.

**Do not spend the cool-off yet.** The product-value row is reachable without it. #324 (11) was filed by MR-058, so it
is a follow-up, and after #340 (12, waiting on CEO item 19) it is the highest burn-down candidate tied with N1. Spending
the cool-off now would point `top-score` at #108 (16, "premise unverified"), which is the stale-score problem in §5.
Spend it after MR-065 has re-scored the top of the table.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **156** | **#324** "shared workflow library" claims on live pages + Viewer-hint a11y | **11** | `burn-down` | `frontend-engineer` + `growth-strategist` (D-4 clause 1, ≥3 strings) | web-app / trust | Verified still true (`docs/page.tsx:1554`, `:1622`). A public claim about a feature that does not exist. First product-facing loop since 146 |
| 157 | **#336** hung delete/archive disables Escape; busy state silent to screen readers | **10** | `burn-down` | `frontend-engineer` | web-app / a11y | Product a11y; same surface family as loop 146. Second consecutive `frontend-engineer`, under the 4+ trigger |
| 158 | **N1** entry-parsing Follow-ups check | **11** | `burn-down` | `qa-engineer` | tooling / governance | Replaces shape-guessing with structure; ends the per-review validator cycle |

- **Area check:** 156-157 web-app ×2, 158 tooling. No 3-consecutive trip. The −2 penalty does not apply at 158
  (tooling 1/5).
- **Alternative at 158:** N2 (10, `devops-engineer`, E1).
- **Waiting:** #340 needs CEO item 19; #341 is CEO-blocked.
- **Then MR-065** (base cadence after 158). Agenda: the top-15-by-score triage, whether to spend the cool-off on the
  re-scored top row, and the governance-tooling share.

---

## 10. CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | **Push** | **open again**: 6 commits local (`b956c68` → `9dc7ccc`). The new manifest CI step and both validator rewrites have never run in CI | first live run of loops 152-155 |
| 2 | Watch the first CI build after push | `a14c5e8` (loop 151) passed **end to end**, run `37088974348` | — |
| 4 | Enable alerts | open; scheduled "Alerts check" still failing every run (`37079356379`) | alerting |
| 3, 5-18 | unchanged from MR-063 §9 (incl. #57 retirement; recommend marking #57 blocked so it stops reading as pickable) | open | — |
| 19 | Path E direction | open; engine ≈1017 production lines (1012 + net 5 at loop 154); 0 consumers, 0 producers | #340, #126 |
| 20 | #341 retention secret | open (row blocked) | least privilege |
| 21 | D-1: suspend formally while all extension rows are CEO-gated, or resume the ack | open; the log now says "user-ack outstanding" (112 loops) | honest control plane |

---

## 11. Verdict

All executed numbers reproduce at `9dc7ccc`: root 6167, package 144, guard tests 80 (= manifest), validator clean
(open 120). All three revert proofs reproduce (13/23, 8/144, 13/35). Nothing reverts.

- **Loop 153 holds.** Exact per-file equality cannot lag. The residue needs a same-commit manifest edit to exploit.
- **Loop 154 holds for every `approval_decision`, with P01 intact.** One of its six path tests is vacuous, and the cap
  is only as wide as the label lexicon.
- **Loop 155's proofs are true, and its title is not.** One heading still narrows the check to 2 lines, and five
  ordinary line shapes, a deleted line and trailing text all pass. Three of the gaps had been named in MR-063 and were
  lost in recording.

The loop now closes review rows in about 2.5 loops, at a 1.0 ratio, while 104 non-blocked rows age and the score table
ranks stale rows highest. The next lever is the §6 triage plus a product-facing pick at 156, not another rule.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json     # files=6 tests=80, exit 0
mkdir -p $S/e && echo '{}' > $S/e/m.json
npx -y node@20 scripts/run-guard-tests.mjs --dir $S/e --manifest $S/e/m.json      # exit 0: empty manifest, no files
printf "import {test} from 'node:test'; test('a',()=>{}); test('b',()=>{});\n" > $S/d/e.test.mjs
echo '{"e.test.mjs":5,"e.test.mjs":2}' > $S/d/m.json; node scripts/run-guard-tests.mjs --dir $S/d --manifest $S/d/m.json  # exit 0
git show 82ea2b2^:packages/decision-engine/src/detectDecisions.ts > <copy>/src/detectDecisions.ts   # 8 fail; retry test passes
grep -n "HEADING_OWN_LOOP\|findIndex" scripts/validate-backlog.mjs                # first (loop 133) heading wins
# copy of the log: loop-153 heading -> "(loop 133)", loop-152 line -> "0 created; closed #325"
VALIDATE_ITERATION_LOG_FILE=$S/dupbelow.md node scripts/validate-backlog.mjs       # "strict-checked 2 … clean", exit 0
pnpm --filter @ledgerium/segmentation-engine test                                 # "No test files found", exit 0 (#29)
git status -sb; git log origin/main..main --oneline | wc -l                       # ahead 6
```
