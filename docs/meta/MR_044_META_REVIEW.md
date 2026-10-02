# MR-044 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** the MR-043 recording commit and loops 91, 92, 93, all 2026-10-01. Commits `922efc5`
(MR-043 recorded; validator status-cell dating; #10/#261 re-scored; #265-#267), `84b5f93` (loop 91,
#255), `1f5d7eb` (loop 92, #10), `8044dda` (loop 93, #11). Rows filed in the window: #267, #268, #269,
#270.
**Date:** 2026-10-01
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. The extension was
read, not modified. Everything below that needs a row, a strike, a fix or a correction is a
recommendation.

**Validation run for this review — all executed, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && npx vitest run` | 3532 (loop 93) | **200 files, 3532 passed, exit 0** | matches |
| workspace `pnpm test` | 5314 (loop 92) | **261 files, 5319 passed, exit 0** | +5 = loop 93's five guard tests; consistent |
| `pnpm -r typecheck` | exit 0 | **exit 0**; "Scope: 11 of 12 workspace projects"; 0 lines containing `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **263 rows, 154 struck, 19/19 budget, clean, exit 0; `open 109 \| oldest open non-blocked: #12 (new (iter 001)), ~191 loops old \| median age-at-close, last 10: 4 loops (max 191) \| 5 closures not datable \| ages measured to loop 93`** | pool arithmetic reconciles (§2) |
| Generated Prisma client vs `prisma/schema.prisma` | "client confirmed current" | `node_modules/.prisma/client/schema.prisma` (written 23:19) differs from source **only** in whitespace and blank ` *` comment lines (`diff -w` after collapsing runs) | matches |
| `@xyflow/react` version and default `colorMode` | "adds a `light` class" | **12.10.1**; `ReactFlow({ … colorMode = 'light' … })` and `className: cc(['react-flow', className, colorModeClassName])` in `dist/esm/index.mjs:3586-3594`; no `colorMode` prop anywhere in `src/` | matches |

**Not run:** no `next build`, no Playwright, no dev server, no real extension in a real Chrome profile,
no upload or sync over HTTP. No `curl`/`wget` (deny-listed; not worked around). Chrome's behaviour
toward back/forward-cached documents (whether `chrome.tabs.sendMessage` reaches them, whether
`focus`/`visibilitychange` fire on restore before the background's `START_SESSION`) is marked
*derived* — known platform behaviour read against this code, not executed.

---

## 1. Lead

**The window did the most important thing it has done in thirty loops — it put the evidence-linkage
invariant at the door — and it proved one of its three checks where it claimed to have proved all
three.**

Loop 92's argument is: the extension derives steps from the same array it exports
(`bundle-builder.ts:78-80,111-112`, true since `ca3d0c6` — I checked, `ca3d0c6:…/bundle-builder.ts:178-180,211`),
so *a dangling reference is impossible*, so *no shipped build is rejected*. The first half is true and
covers check 1. Check 2 (duplicate ids) also holds, because the background mints every canonical id
with `crypto.randomUUID()` (`normalizer.ts:40`, `utils.ts:1-4`). **Check 3 does not follow from that
argument at all.** A canonical event's `session_id` is not the session's id: it is copied from the
*content script's* `raw.session_id` (`normalizer.ts:39`), and the background admits any raw event while
`sm.state === 'recording'` without comparing it to the active session (`background/index.ts:430-447`).
Steps and `sessionJson`, by contrast, carry `meta.sessionId` (`bundle-builder.ts:80`,
`batch-segmenter.ts:74`). So a stale capture engine — one still holding an earlier session id — writes
events the new bundle cannot pass. Before loop 92 that was a silent provenance blemish. **Since loop 92
it is a 422 that rejects the user's entire recording, deterministically, on upload, on sync and on
every retry** (§3).

Whether that path is common is unmeasured; that it exists is in the code. The coordinator's
"every producer passes all three checks" was established on fixtures whose session id the test
*derives from the events themselves* (`bundle-evidence-integrity.test.ts:154,173`), which cannot
disagree with the events by construction.

The other two loops are sound. Loop 91's React Flow finding is correct and has a consequence the log
did not draw: half the new tokens are dead (§4). Loop 93's "0 real mismatches" is credible for a
reason the log did not state (§5).

---

## 2. Q1 — Re-run the claims

All reproduce (table). Pool: 108 at MR-043 close → MR-043 recording +1 (#267) → loops 91/92/93 each
+1 −1 (#268/#255, #269/#10, #270/#11) → **109**, as the validator prints. Three closures, three
creations, one governance-filed row: burn-down ratio for the window 3/4. The pool did not shrink; the
three oldest-row closures were real.

Workspace: 5314 at loop 92 → **5319** now; loop 93's `typed-db-guard.test.ts` holds five `it()`
blocks (`:72,76,86,93,105`). Reconciles.

---

## 3. Q2 — Loop 92: can the shipping extension be rejected?

### 3.1 The three checks against every path that assembles a bundle

| Path | Check 1 (refs resolve) | Check 2 (ids unique) | Check 3 (session ids agree) |
|---|---|---|---|
| Normal stop → `buildBundle` (`bundle-builder.ts:72-116`) | **Holds by construction**: steps derived from `canonicalEvents`, the array exported; segmenter refs are `events.map(e => e.event_id)` (`batch-segmenter.ts:81`) | **Holds**: ids minted by `randomUUID` per message | Holds **iff** every content script that sent an event held `meta.sessionId` |
| Multi-tab | Holds (sort only reorders, `:78`) | Holds | Holds in the normal flow: every tab is started with `store.getMeta().sessionId` (`index.ts:248-252,504-522`) |
| SW restart → `loadFromStorage` → append (`session-store.ts:189-250`) | Holds: events restored, new ones appended, steps built at stop from the merged array | Holds: restore does not replay; new ids are fresh | `START_SESSION` after restore uses `persisted.sessionId` (`index.ts:134,147`), the bundle uses `meta.sessionId` — written together at `handleStart` and cleared together, so equal unless a stale `PersistedState` survives a crash. *Derived, low.* |
| `persistenceTruncated` (`session-store.ts:321-353`) | Holds: append-stop only, nothing deleted; post-restart steps derive from what was restored | Holds | Unaffected |
| Policy / blocked domains | Holds: a blocked event becomes a `system.capture_blocked` canonical event *before* segmentation (`normalizer.ts:44-60`); nothing drops events after steps are built | Holds | Unaffected |
| Annotations | Only content scripts emit `RAW_EVENT_CAPTURED` (`capture.ts:597`, sole sender) | — | Same as any event |
| History re-sync (`history-store.ts:14-27`, `ProcessScreen.tsx:564-570`) | Bundle stored and posted verbatim; the display copy that re-sorts events (`ProcessScreen.tsx:799-800`) is not what is synced | Holds | As stored |
| **Stale capture engine** | Holds | Holds | **Fails** — see 3.2 |

### 3.2 The failing path

`CaptureEngine` keeps `sessionId` and `isRecording` until it receives `STOP_SESSION`/`DISCARD_SESSION`
(`capture.ts:108-112`, `content/index.ts:62-65`). It emits `window_focused`, `window_blurred` and
`visibility_changed` from window listeners with no user action (`capture.ts:182-200`). On activation
of a tab the background calls `injectIntoTab`, waits **100 ms**, then sends `START_SESSION` with the new
id (`index.ts:512-522`); `startCapture` swaps ids only on receipt (`capture.ts:68-73`). Any event the
stale engine emits in that window is stamped with the old id and admitted (`index.ts:432-445`).

How a stale engine arises (*derived*): `STOP_SESSION` is fire-and-forget to every tab with errors
swallowed (`index.ts:200-208,291`); a document in Chrome's back/forward cache is not the tab's current
document and keeps its JS state; restored later during a new session, it resumes with the old id, and
restoring a page fires `focus`/`visibilitychange` before the background's delayed `START_SESSION`.
`transitionToError` (`index.ts`, after `handleDiscard`) does not broadcast a stop either, though
`error → idle` requires `handleDiscard`, which does.

Consequence: `sessionIdMismatches ≥ 1` → `/api/sync` and `/api/upload` return **422** for the whole
bundle (`sync/route.ts`, `upload/route.ts` as of `1f5d7eb`); the extension surfaces
`HTTP 422: Bundle evidence integrity check failed` with no recovery (`uploader.ts:55-67`); every retry
fails identically. The raw JSON is written to disk before the reject, so the data is recoverable
server-side — the user does not know that.

**Note what such an event is:** real, resolvable evidence of something the user did, carrying a stale
provenance tag. Checks 1 and 2 protect the invariant ("a step cites evidence that does not exist").
Check 3, as implemented, rejects bundles whose evidence *does* exist.

### 3.3 Other findings on the gate

- **The coordinator's two corrections were right** (422 matches the routes' parsed-but-invalid
  convention; the `status !== 400` test was vacuous and now asserts the property,
  `route.evidence-integrity.test.ts:92-102`). They did not catch the session-id overclaim, which was in
  the coordinator's own brief ("confirm real extension bundles … satisfy all three") and was answered
  with fixtures, not with the producer.
- **A step with zero `source_event_ids` passes** (`bundle-evidence-integrity.test.ts:76-80`, asserted
  `ok`). A step citing no evidence is the same class as a step citing missing evidence. The segmenter
  never emits one, so it is safe to reject; it is outside the stated residual and unfiled.
- `upload` does not `trackServer('upload_failed')` on an integrity reject; `sync` does. Minor
  asymmetry; the metric will undercount web uploads.
- `#269` correctly files the stored-upload re-check, the engine-level check and the missing sync route
  test. It does not file 3.2.

**Verdict:** checks 1 and 2 are sound and should stay. Check 3 should stop being a reject until the
producer is shown to satisfy it — record the count on the upload row, do not 422 (web-app only, no
extension change). The extension-side fix (drop or count events whose `raw.session_id !==
meta.sessionId` at `index.ts:432`) touches the `RAW_EVENT_CAPTURED` path on the Extension Reliability
Invariant's forbidden list and needs CEO approval and the real-extension gate.

---

## 4. Q3 — Loop 91: React Flow's `light` class

**Confirmed from the library, not just the probe.** `@xyflow/react` 12.10.1 defaults
`colorMode = 'light'` and puts the class on the wrapper (`index.mjs:3586-3594`); no canvas in `src/`
passes `colorMode`. The app's theme is `:root` = dark with a `.light` class override
(`globals.css:4,99`), so inside any `.react-flow` element the `.light` block wins in both page themes.

Consequences the log did not draw:

1. **The dark `--wf-*` values (`globals.css:79-88` and siblings) are dead in practice.** The only
   consumers are the three node components (`WorkflowTaskNode.tsx:101` via `categoryTextVar`,
   `WorkflowDecisionNode`, `WorkflowTerminalNode`), which render only as React Flow `nodeTypes`. The
   theme-contrast test asserts the dark pairs (passing), against a surface no user sees. Not wrong;
   it is untested-in-practice code that will become live, unreviewed, the day anyone sets
   `colorMode="system"`. Either delete them or state in `globals.css` why they are kept.
2. **In-app canvases:** `WorkflowCanvas`, `WorkflowSwimlaneCanvas`, `WorkflowVariantStoryMap` and
   `DfgFrequencyMap` are the only `<ReactFlow` users — all light in both themes. **`WorkflowVariantsMap`
   and `WorkflowSystemsMap` are not React Flow**: they sit on `--surface-*` tokens
   (`WorkflowVariantsMap.tsx:277,368,419`) and follow the page theme, dark by default. #268's numbers
   ("`#9ca3af` 2.54:1 on white") describe their *light*-theme failure; their default-theme state is
   different and unmeasured. #268's note says this in general terms; its per-site figures should say
   which theme.
3. `WorkflowLegend` is outside the canvas (absolute in `WorkflowPageShell`) on `--surface-elevated`.
   Its new edge swatches measure 3.63 / 3.58 / 5.43:1 on the dark surface (computed here) — above 3:1
   for graphics, barely. Fine; not asserted anywhere.
4. Authenticated `/workflows/[id]` remains unscanned, as the log honestly says.

**Verdict:** the fix is correct; the inference is now verified at the source. File or fold: dead dark
tokens (decide), and #268's per-theme labelling.

---

## 5. Q4 — Loop 93: 71 casts, "0 real mismatches"

**Credible, for a structural reason.** With the casts removed, every formerly-cast call is type-checked
against the generated client, and typecheck exits 0. That proves the calls match the *generated* client;
I confirmed the generated client matches `prisma/schema.prisma` modulo whitespace and comment lines.
Spot-reads (`invites/accept/route.ts` `teamInvite.findFirst` + typed `$transaction`;
`seat-management.ts` `teamMember.findMany/updateMany/count`, `teamInvite.count`; `compute-alerts.ts`
`analyticsEvent`) all name models and fields present in the schema — redundant once typecheck passes,
which is the point. What typing cannot catch: values in `String` columns standing in for enums
(`status`, `role`, `plan`) — a misspelt literal still compiles. Not in #11's scope; worth one line in
#270.

**Guard (`typed-db-guard.test.ts`):** non-vacuous (`> 200` files, `:73`; self-tests seven shapes,
`:76-84`; exact allowlist with reason, `:105-112`). Sound for today's tree — I grepped for
`as unknown as`, `as never` and aliased `any` near `db`/`prisma` and found only the singleton at
`db/index.ts:3`. Blind spots, same family as MR-043's §4.3: name-coupled (`db|prisma|tx|trx`, `:32-35`,
so `const c: any = db` passes); pattern 3's `[^)]*` stops at the first `)`, so
`db.x.findMany({ where: f(y) }) as any` passes; multi-line calls ending `}) as any` pass; only
full-line comments are stripped (`:46`). One cheap hardening: flag `as any`/`: any` on any line whose
expression starts from a `db`/`prisma` identifier or an alias assigned from one.

---

## 6. Q5 + Q6 — Practices, and what the window got wrong

### 6.1 Practices

| Loop | Residual scoped to class, read from code? | Delegation | Filed vs prose |
|---|---|---|---|
| 91 | **Yes, best yet** — scoped to the directory, unmeasured sites listed by file and count | `frontend-engineer`; coordinator's screenshot + computed-style probe caught a wrong inference | #268 filed |
| 92 | Residual "ingestion paths that silently accept unresolvable evidence, 2 → 0" is **true for check 1**. The class the commit claims ("no shipped build is rejected") was established on fixtures, not on the producer's provenance path | `backend-engineer`; two coordinator corrections real | #269 filed; 3.2 and zero-evidence steps unfiled |
| 93 | **Yes** — ~82 → 0 with the family enumerated | `build-error-resolver`, apt | #270 filed |

MR-042/043's ask to quote one line of the agent's own validation output per delegated loop is still
not applied and not declined — third window running.

### 6.2 What the window got wrong

1. **Loop 92 commit/log/backlog #10:** "every producer passes all three checks … so no shipped build
   can be rejected." True of checks 1-2; check 3 was not established on the producer, and a code path
   exists that fails it (§3.2).
2. **Loop 92:** "a bundle that fails them is corrupt or tampered, not truncated"
   (`bundle-evidence-integrity.ts:26-27`) — a session-id mismatch can be neither.
3. **Loop 92:** zero-evidence steps pass, unrecorded.
4. **Loop 91:** "dark theme … tokens" shipped with no consumer that can render them; not noted.
5. **#268's figures** give light-theme contrast for views that default to dark.
6. **Loop 93:** "0 real mismatches" stated as an investigation result; it is a typecheck result against a
   verified-current client — stronger than stated, and the log should say which.
7. **Nothing to correct:** `922efc5`'s validator change dates #12 correctly (iter 001 → ~191) and no
   longer misdates the ADM-002 rows; #10's MR-043 re-scope was exactly what loop 92 needed.

---

## 7. Next pick

**First, before loop 94 — Mode 3 correction (non-counting), web-app only:** stop rejecting on
`sessionIdMismatches` alone; keep 422 for unresolved refs and duplicate ids; record the session count
on the upload row and in `upload_failed`/a new counter so the production rate is measured. Add a
regression test with a bundle whose one event carries a different session id → accepted, count
recorded. File the extension-side filter as a new row **blocked on CEO approval** (forbidden-list
surface). This is a fix to loop 92's own change, which is what Mode 3 is for.

**Loop 94.** Pool 109 > 8 → `burn-down`. Areas 91 a11y, 92 evidence linkage, 93 type safety — no
saturation.

| Row | Score | Notes |
|---|---|---|
| **#12** | 10 (re-score) | Oldest open non-blocked (~191). **Read from code:** `prisma/migrations/` has 13 migrations starting `20260505…`, no baseline and no `migration_lock.toml`; production runs `prisma db push` (`scripts/docker-start.sh:58-61`) and on failure prints "database setup failed (DB preserved)" and starts the app against the old schema. The migrations are not the production mechanism at all. Re-score suggestion I4 A5 L4 C4 E3 R3 = **11**; re-scope to "make the production schema step deterministic and fail loudly" before "baseline". |
| #269 | 12 | Same area as 92; take after the Mode 3 fix, since its measurement (stored uploads) should report all three counts. |
| #261 | 11 | Still open member of class (a); overlaps #270(1). |
| #267 | 10 | Small; decision + guard widening. |
| #268 | 9 | Needs the per-theme correction above first. |
| #259, #265, #266, #249-#252 | 8-11 | Unchanged. |

**Pick: #12, re-scoped in the MR-044 recording commit.** Residual stated now: *"production schema
changes applied by a mechanism that can silently leave the app on an old schema: 1 → 0"*. Needs
`devops-engineer` or `backend-engineer`, a real SQLite copy of the production shape, and no
destructive step without CEO approval.

---

## 8. Pattern — what this window adds

1. **A guard's justification must be checked against the producer, not against the fixtures the
   producer once made.** Loop 92's test derives its expected session id from the events
   (`:154,173`); the extension derives events' session ids from a different source than its steps.
2. **"The same array" proves what the array decides.** Refs and ids are decided by the background;
   session tags are decided by the content script. One sentence covered three properties with two
   different owners.
3. **Fail-closed has a cost the loop did not price.** A reject that the user cannot fix and the
   extension cannot explain converts a provenance blemish into data loss. For checks that cannot be
   shown impossible on the producer, record first, reject later.

No new rule. Clarification to the `residual:` practice: *for a gate on shipped input, name for each
check who produces the field it checks.*

---

## 9. CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Extension session-id filter (new)** | Needs approval | Background admits events with any `raw.session_id` (`index.ts:432`); fixing it is on the forbidden-silent-changes list. Until then, recommend the server stops 422-ing on session mismatch (§7). |
| **Alert delivery (#256/#263)** | Repo side done; not live | Unchanged: `CRON_SECRET`, `ALERTS_CHECK_URL`, one channel (+ `SMTP_PASSWORD` if email), redeploy. Without a channel the job goes red most hours — intended. |
| **Alert fatigue** | Open | Unchanged (no de-duplication; `zero_uploads_24h` P1?). |
| **#12 production schema step** | New dimension | `db push` in production; any re-scope that changes the deploy step needs your sign-off. |
| **#260** stray compose files | Unchanged | Needs which of three files are used. |
| **#216** extension untouched | **50 loops**, tenth ask | Loop 92 read it closely; nothing modified. |
| **#57 criteria 1-3** | Not decision-grade (#249, #251) | Unchanged. |
| **#225** `TRUSTED_PROXY_HOPS` | Defaults `0` | Unchanged. |
| **#212** E2E deploy gating | Waits on a green `real-extension` run | Unchanged; note the harness does not exercise sync. |
| **#190 / #193** CLAUDE.md edits | Since MR-020/021 | Twenty-four reviews. Approve, reject or strike. |
| **#191** billing | Since loop 7 | Unchanged. |

---

## 10. Verdict

All numbers reproduce; nothing needs reverting outright. Loop 91 is correct and now verified at the
library; loop 93's result is credible and its guard sound with the usual name-coupling.

Loop 92 is the right change with one check too many enforced too early. Unresolved references and
duplicate ids are impossible from the shipping extension and should stay rejected. Session-id
agreement is not guaranteed by the producer — the content script stamps it, the background does not
check it — and a 422 on it discards a user's whole recording with no way back. Apply before loop 94:
the Mode 3 relaxation with a measuring counter; the extension-side row, CEO-blocked; zero-evidence steps
into #269; corrections §6.2 1-6 as notes; dead dark `--wf-*` tokens decided; #268's figures labelled by
theme. Then take #12, re-scoped from `docker-start.sh`.
