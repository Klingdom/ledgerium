# MR-060 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 141-143, 2026-10-02 16:52 → 17:40 (−0600). Commits `5334f37` (loop 141, #328), `3d7179d`
(loop 142, #121, `ceiling-cool-off: invoked`), `c91ffdd` (loop 143, #330). Rows closed: #328, #121, #330. Rows filed:
#330, #331 (plus #328, #329 filed by the MR-059 recording commit `fb59115`).
**Why now:** base cadence, 3 of 3 since MR-059 (`ITERATION_LOG.md` loop 143 Controls). Also the date the clause 9
amendment proposed by MR-059 §2 falls due under silence-as-accept.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit. Everything below that needs a row, a strike,
a fix or a correction is a recommendation. One scratch file was written outside the repo (scratchpad `de/spot.test.ts`).

**Where the checks ran.** Main checkout at `c91ffdd`. The working tree differs from HEAD only in `.claude/*` and an
untracked `data/`, which no check reads; `git status --short` was identical before and after every run (the build
writes `.next/`, which is ignored). Windows, pnpm 10. `origin/main` is `dcf7f0e`; `main` is **9 commits ahead**
(`git rev-list --count origin/main..main`). `gh run list` shows no run newer than `37069729009` (deploy of `dcf7f0e`).

**Validation run for this review. Every check below was executed at `c91ffdd`; none is inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test`, **×2** | 6043 | **2 of 2: 291 files, 6043 passed, exit 0** | matches |
| `apps/web-app`: `pnpm exec vitest run`, **×2** | 4245 | **2 of 2: 235 files, 4245 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 324 rows, 205 struck, 13/13 baselined, **open 119**, "V4: parsed 122 closure claim(s)" | matches |
| `node --test scripts/*.test.mjs` | 33 | **tests 33, pass 33, fail 0, exit 0** | matches — but see §5.2: one of the four files runs nowhere in CI |
| `node scripts/check-dockerfile-workspace.mjs` | OK | **exit 0**: agent-intelligence, intelligence-engine, process-engine, process-graph, schema-events | matches |
| `pnpm --filter @ledgerium/web-app build` | exit 0 | **exit 0**, "Compiled successfully", `[assert-dynamic-api-routes] OK` | matches |
| `docker build` | not run (loop 143) | **not run.** Docker client 29.2.1 is installed; the daemon is not (`npipe:////./pipe/dockerDesktopLinuxEngine` not found) | **unverified** |

**Not run:** a Docker image build, Linux, any GitHub runner, Playwright, any browser, any HTTP request, the purge
against any database, a screen reader. No `curl`/`wget`.

---

## 1. Lead

**Every count reproduces and nothing needs reverting.** Loop 141 made the Terms line reachable. Loop 143 caught a
deploy-breaking Dockerfile gap before push — the best catch of the last five reviews. But:

1. **The guard loop 143 advertises runs nowhere.** The commit says "a guard forbids packages/* importing apps/*"
   (`c91ffdd` message). That guard is `scripts/check-no-app-imports.test.mjs` — a `node --test` file. CI runs three of
   the four `scripts/*.test.mjs` files by name (`deploy.yml:39,47,80`); this one is not among them, and the root vitest
   config only collects `*.test.ts`. It runs only when someone types `node --test scripts/*.test.mjs` by hand. It is a
   guard in name only — the exact class MR-052 (#300, `passWithNoTests`) and #53 (`.test.tsx` gating nothing) fixed.
2. **The retention preview cannot preview the first purge, and the schedule arms itself.** The dry run returns before
   the orphan sweep (`workflow-retention.ts:232` returns; the sweep is at `:308`) and caps `eligible` at the batch of
   100 with only a `hasMore` boolean (`:228-231`). So the dry run cannot say how many pre-policy deletions the
   retroactive purge will take, nor how many upload rows and files the sweep will delete. And `dry_run` only governs
   manual runs; the 03:41 UTC schedule is always real (`retention-purge.yml:21,49`). **Setting `RETENTION_PURGE_URL`
   arms a real purge at the next 03:41 UTC whether or not anyone ran the preview.** Item (2) of #326 records the
   sweep half; the arming and the 100-cap are not recorded anywhere.
3. **The decision engine reports anecdotes as high-confidence observations.** Two runs that differ by a free-text UI
   string ("Welcome back, Jane Doe" / "Welcome back, Bob Lee") produce two `observed` conditions and confidence
   **0.85**, `isInferred: false` (§4.1 case B). A 3:1 split over four runs scores **1.0**. The P01 IFF holds in
   letter (the cap fires only when *every* condition is inferred) and fails in purpose: any per-run-unique value
   "explains" its outcome. Neither the architect review nor #331 records this.
4. **What is live.** Still `dcf7f0e`. Loops 137-143 are not in production.

---

## 2. Q2 — Clause 9 amendment (silence-as-accept, due now)

**Objection check.** I searched every commit in the window and `ITERATION_LOG.md`/`SYSTEM_HEALTH.md` for a CEO response
to MR-059 §2: none is recorded, and `CLAUDE.md` is unchanged since `fb59115` (`git log fb59115..HEAD -- CLAUDE.md` is
empty). I cannot see the chat. **The silence window was 48 minutes** (`fb59115` 16:52 → `c91ffdd` 17:40, one working
session). That satisfies the MR-008 precedent's letter ("applies at MR-N+1") but is thin as evidence of considered
acceptance. Recommendation: apply it, and name it on the first line of the CEO summary for the MR-060 recording so a
reversal costs one sentence. Whether to edit `CLAUDE.md` is the CEO's call through the permission system; this review
does not authorise it.

**Is it still the right rule?** Yes, and loops 141-143 add no contrary evidence: no Mode 5 sequence ran, so neither
the trigger nor the override was exercised. The two-part change touches one control variable (when the ceiling
fires), not clause 6 or 7. One clarification belongs in the commit message, not the rule: "the pool" is the
validator's `open N` at the sequence-opening commit.

**Exact edit.** `CLAUDE.md` line **106**, § Operating Modes → Mode 5 guardrails, clause 9 ("Mode 5 hard-stop ceiling
(MR-005 Change D-2)"). Each old string occurs exactly once in the file (`grep -c` = 1 for both).

Replace (old, verbatim):

> `If the open follow-up pool exceeds 15 at the start of any iteration within a Mode 5 sequence in progress, the coordinator MUST halt`

with (new, verbatim from MR-059 §2):

> `If the open follow-up pool exceeds 15 at the start of any iteration within a Mode 5 sequence in progress AND the pool is larger than it was when the sequence opened (net growth during the sequence), the coordinator MUST halt`

and replace (old, verbatim):

> `a second pool > 15 breach within the same sequence is a mandatory stop with no override.`

with (new, verbatim from MR-059 §2):

> `a second breach within the same sequence is a mandatory stop with no override. An override logged at sequence open covers every item the user named in the same directive; it is not re-consumed per item. (MR-059: at a standing pool of ~118 the absolute trigger fired on every multi-item directive and was overridden every time; loops 138-140 closed 3 rows and filed 2.)`

The rest of line 106 (the burn-down substitution, the `hard-ceiling-override: user-ack` log line, the Rationale
sentence) is unchanged.

---

## 3. Q3 — Loop 141, adversarially

### 3.1 Is the v2 Delete safe?

| Property | Evidence | Verdict |
|---|---|---|
| Confirmation | Menu item only opens an inline confirm (`WorkflowRow.tsx:510-512`); nothing is called until Delete is pressed (test "confirmation states the 30-day consequence; nothing is called yet") | **safe** |
| Safe default focus | Cancel focused on mount (`InlineDeleteConfirm`, `cancelBtnRef` effect) | **good** |
| Keyboard | Delete is a `role="menuitem"` button like Archive; Escape routes through the single dispatcher, priority 1b (`:870-876`) | **good** |
| Double submit | Both buttons `disabled={isBusy}` (`:680,:690`); React 18 flushes discrete click updates, so a second click lands on a disabled button. Server is idempotent anyway (`workflows/[id]/route.ts:305`) | **safe** |
| Optimistic removal | **None** — the row leaves only after `res.ok` (`:648-658`); failure keeps the row and shows `role="alert"` (test "failure shows an error and does not remove the row") | **correct** |
| Escape **while busy** | Escape is not gated on `isBusy`; it unmounts the confirm while the `fetch` continues. On success `onConfirm` still fires and the row is deleted (`:658`, `:1126`) — **the user pressed Cancel and the workflow was deleted**. On failure the error is lost with the unmounted component, silently. Same pre-existing shape in Archive (`:749`) | **defect, small** |
| Both confirms at once | `onStartDeleteConfirm` does not clear `isConfirmingArchive`; both can render. Each still needs its own click | cosmetic |

### 3.2 Do deletion/archive statements match behaviour?

Five public statements (`terms/page.tsx:52`, `privacy/page.tsx:172`, `privacy/extension/page.tsx:212`,
`security/page.tsx:112`, `docs/page.tsx:2004`) now describe a path that exists in the default UI. The docs line and both
confirmations agree: Delete → not restorable in-app → purged after 30 days; Archive → kept, never purged, not
restorable in-app (no restore/unarchive anywhere: grep of `src` for `restore` and `'archived'` writers). `terms:150`
("request deletion … by contacting us") and `terms:207` ("may be permanently deleted" after account end) are hedged
and not contradicted. **Remaining mismatches:**
1. **"Permanently removed after 30 days" is still false until retention is configured** — unchanged from MR-059
   §1.3; the push and the variable must go together (§9 #1-#3).
2. **A deleted workflow stays fully readable to its owner for 30 days.** `GET /api/workflows/[id]` selects by
   `id, userId` with no status filter (`route.ts:43`), and so do export, share and ask routes. Nothing public promises
   otherwise, so this is not false copy — but a user who deletes and then opens the bookmarked URL sees the workflow
   as if nothing happened. Not filed by loop 141's truth table.
3. `retention-purge.sh:4` still says it "prints the HTTP status ONLY — never the body"; since loop 141 it prints the
   dry-run body (counts only, `:47-50` of the script). Comment drift, harmless.

### 3.3 Is the dry-run default right, and can it be bypassed by accident?

The expression `github.event_name == 'workflow_dispatch' && inputs.dry_run && '1' || ''` is correct: it uses the typed
`inputs` context (not `github.event.inputs`, where `'false'` is truthy), defaults to `true` for UI and `gh workflow run`
dispatches, and the route rejects a malformed `dryRun` with 400 rather than purging (`purge/route.ts:51-57`). **Manual
runs are safe. The accidental bypass is the schedule** (§1.2): it needs no dispatch and ignores the input. Fix shape:
gate the scheduled run on a second variable (`RETENTION_PURGE_ARMED=1`) set only after a reviewed dry run, and make the
dry run report the full eligible count and the sweep candidates.

---

## 4. Q4 — Loop 142, decision engine

### 4.1 Three hand-built inputs (scratch vitest file importing `packages/decision-engine/src/index.ts`)

| Case | Input | Output | Verdict |
|---|---|---|---|
| A | 4 runs "Open invoice" → Approve ×3 / Reject ×1; uiState "Amount < 1000" on the Approve runs, "Amount >= 1000" on the Reject run | `approval_decision`, "Is the request approved or rejected at "Open invoice"?", both conditions `observed`, **confidence 1.0** | correct structure; **1.0 on one counter-example run is overconfident** |
| B | 2 runs "Search customer" at route `/customers/jane.doe@acme.com`; uiState "Welcome back, Jane Doe" / "…, Bob Lee"; outcomes Create / Open existing | `data_condition`; conditions "When "Welcome back, Jane Doe" is shown … users take "Create""; **confidence 0.85, isInferred false**; `decisionId` = `bp:["Search customer\|/customers/jane.doe@acme.com"]` | **spurious and PII-bearing** |
| C | 3 runs; "Café" as NFC and NFD; a step literally labelled `__end__` | three outcomes, two both displayed "Café"; `__end__` step does not collide with the END sentinel; all `inferred`, confidence 0.54 (raw 0.8) | sentinel safe; **Unicode split is a false branch** |

**Determinism:** case A reversed gives a byte-identical `JSON.stringify` result. Matches the 5-permutation test.

**Root cause of A/B.** `analyzeConditions` treats a value as explaining an outcome if it appears under that outcome
alone (`conditions.ts`, "value seen under >1 outcome is conflicting"). A value seen in **one run** trivially qualifies.
Free-text UI state (names, dates, counts, ids) is unique per run, so every outcome is "explained", `consistency` = 1,
and `computeConfidence` adds 0.15 + 0.1 + 0.1 to a run term that already reaches 0.5 at two runs (`confidence.ts`).
Fix: a minimum support per condition value (≥2 runs, or ≥ MIN_RUNS_FOR_BRANCH) before it counts as `observed`.

### 4.2 Is the trie-key fix complete?

**Yes for injectivity.** `escapePart` escapes `\` and `|` (`trie.ts`); keys `a\|b|c`, `a|b\|c`, `a\\|\|c`, `a\\\||c` are
all distinct (printed by the scratch run). Every step key contains exactly one unescaped `|`, so it can never equal the
sentinels `__end__`/`__root__`; `decisionId` is `JSON.stringify` of the key path, also injective. **Not covered, and
correctly out of the trie's scope:** Unicode normalisation, case and whitespace (case C) — these belong to P02
`normalizedLabel`, which must NFC-normalise. Record it as a P02 input contract, not a trie bug.

### 4.3 PII paths

`types.ts` header: "StepInput must be PII-sanitized upstream". Nothing enforces it, and the raw strings travel in
more fields than #331 names: `nodeLabel`, every `outcome.label`, `outcomeKey`, `prefixKeys` and `decisionId` all carry
`normalizedLabel` + `routeTemplate` verbatim; condition `description`s carry `uiState`, `actorRole` and
`offeredOptions` verbatim. #331(2) hashes `decisionId` only. If `routeTemplate` is not actually templated (case B's
email route), hashing the id leaves the email in `prefixKeys` and `outcomeKey`. Not live: the package is wired to
nothing (`grep` of `apps/web-app/src` for `decision-engine` finds only a comment). Must be closed before P01 assembly.

---

## 5. Q5 — Loop 143

### 5.1 Is the runner stage complete? What does the runtime import?

The runner copies all five packages (`Dockerfile:106-110`). **At runtime it needs none of them by name**: after the
local build, `grep -rE "@ledgerium/|ledgerium/(process-engine|…|process-graph)" apps/web-app/.next/server` finds
**zero** matches. Workspace packages resolve outside `node_modules`, so webpack bundles their source into `.next`;
`next start` (`docker-start.sh:72`) loads the bundles, plus Prisma and npm deps from `node_modules`. So the runner is
a superset — harmless dead weight, not a gap. **Unverified without an image:** that nothing in `node_modules` symlinks
into a package directory the runner lacks. The first CI image build (`deploy.yml:122`) is the real test.

### 5.2 What does the guard cover?

- `check-dockerfile-workspace.mjs` checks the **deps** and **builder** stages only (it skips `COPY --from`), for the
  web app's transitive workspace deps only (`APP = 'apps/web-app'`). Given §5.1 that is the right boundary.
- The repo has **one** image (`Dockerfile`; the three `compose*.yaml` files consume it). The extension is built by
  Vite on a full CI checkout, so it needs no Dockerfile guard.
- **`check-no-app-imports.test.mjs` is not run by CI** (§1.1). It also scans `packages/*/src` only, not package-root
  configs. One line fixes both the instance and the class: replace the three named `node --test` steps in
  `deploy.yml` with `node --test scripts/*.test.mjs`, so the next guard cannot be forgotten.

### 5.3 Was the exclusion of intent-inference and decision-engine correct?

**Yes.** `apps/web-app/package.json:30-33` depends on agent-intelligence, intelligence-engine, process-engine and
process-graph; schema-events arrives transitively via agent-intelligence. No web-app source imports
`intent-inference` or `decision-engine` (one comment in `entities.ts:91`). The guard computes the closure, so when
decision-engine is wired the check will demand it — which is the point.

---

## 6. Q6 — Practices

- **Package-boundary briefs.** The 143 catch came from the coordinator's review, not the brief. Any brief that adds,
  moves or links a workspace package must require, up front: (1) the list of consumers of the package graph — Dockerfile
  stages, `transpilePackages`, `check-typecheck-coverage`, vitest roots, CI jobs; (2) `check-dockerfile-workspace` and
  `pnpm --filter @ledgerium/web-app build` exit codes; (3) **every new guard wired into CI in the same commit, with the
  CI line quoted** — 143 shows a guard can be written, tested and claimed without ever being scheduled; (4) the
  explicit line "real image build not run" when Docker is unavailable (143 did this well).
- **Cool-off.** Logged correctly at 142 with the required `ceiling-cool-off: invoked; rationale:` line; first use since
  loop 128 re-arm. 143 is a `burn-down` of a follow-up (#330, born L142): **recharge 1/3**, correctly logged.
- **Pace.** Three loops in 48 minutes; the 1,000-line decision engine and its D-4 review sit inside 17 minutes
  (`5334f37` 17:14 → `3d7179d` 17:31). The review found a real bug, so it was not perfunctory, but the overfit in §4.1
  is the kind of finding three hand-built inputs surface in ten minutes. For pure engines, a brief should require the
  reviewer to run adversarial inputs, not only read code.
- **Pool trend.** 118 (MR-059) → +2 filed by MR-059 recording (#328, #329) → loop 141 −1 → loop 142 −1 +2 → loop 143 −1
  = **119** (validator). Window loops: 3 closed, 2 filed. Flat again; the MR-059 fall was decision-driven, not
  burn-down-driven.

---

## 7. What the window got wrong

1. Loop 143 claims a guard that CI never runs (§1.1, §5.2).
2. Loop 141's retention preview cannot preview the purge it gates, and the schedule arms the moment the URL is set
   (§1.2, §3.3).
3. Loop 141's Escape-while-busy deletes after the user cancelled (§3.1).
4. Loop 142 ships confidence that rewards per-run-unique UI text; #331 and the architect review miss it (§4.1).
5. #331(2) under-scopes the PII path: `prefixKeys`/`outcomeKey`/labels carry the same raw text as `decisionId` (§4.3).
6. Loop 141's truth table missed that deleted workflows remain readable by URL for 30 days (§3.2.2).
7. Nothing needs reverting.

**Pattern:** the MR-059 lesson (walk the promise from the user's path) was applied to the UI and not to the operator's
path — the CEO's path to "enable retention" was never walked; nor was the guard's path to CI.

---

## 8. Q8 — Loop 144 pick

Pool 119 > 8 ⇒ burn-down (cool-off spent; recharge 1/3). Last five Areas: security/data, web/positioning, web/data,
path-e, path-e/architecture. No Area has 3 of 5, so no −2 penalty today; **a third path-e pick (#331) would make three
consecutive and force a pivot at 145** — avoid. Each pick below is a follow-up, so it advances recharge to 2/3.

| Rank | Pick | Score | Rule | Agent | Area |
|---|---|---|---|---|---|
| **1** | **New row (follow-up of #330, born L143): "CI runs every `scripts/*.test.mjs`."** Replace `deploy.yml:39,47,80` with one `node --test scripts/*.test.mjs` step, keeping the two non-test checks; prove it by running CI-equivalent locally against an injected `packages/x/src` → `apps/` import. I4 A5 L2 C5 E1 R1 | **14** | `burn-down` | `devops-engineer` | ci / tooling |
| 2 | **New row (follow-up of #328/#319, born L141): "The purge schedule waits for a reviewed dry run, and the dry run shows the whole purge."** Gate the schedule on `RETENTION_PURGE_ARMED`; report uncapped `eligible` and sweep candidates in dry run; gate Escape on busy in both confirms. Fold #326(2) in. I5 A5 L2 C4 E2 R1. **Should land before the CEO sets `RETENTION_PURGE_URL`.** | **13** | `burn-down` | `backend-engineer` (+`devops-engineer`) | security / data |
| 3 | **#325** V4 live-log recency canary | **12** | `burn-down` | `backend-engineer` | tooling / governance |

Then #324 (11). Amend #331 with §4.1 (minimum support per condition value) and §4.3 (all raw-text fields), and record
NFC as a P02 input contract. MR-061 after loop 146 under the 3-loop floor.

---

## 9. Q9 — CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | **Push** loops 137-143 (9 commits; live is `dcf7f0e`) | open — **#328 no longer blocks it; pair with #3** | delete in v2, invite fix, maps off, positioning, Dockerfile fix |
| 2 | **Watch the first CI image build** after push | new; the Dockerfile change (`c91ffdd`) has never been built as an image | confirms §5.1 |
| 3 | **Enable retention**: set `RETENTION_PURGE_URL` **only after** a manual dry run the same day, before 03:41 UTC — or wait for pick 2's arming gate. Decide whether pre-policy deletions are purged | open; the preview understates the first run (§1.2) | makes the Terms line true |
| 4 | **Enable alerts**: `CRON_SECRET` + `ALERTS_CHECK_URL` | open | alerting |
| 5 | **Clause 9 amendment** (§2) | silence-as-accept now; 48-minute window; say so in the recording | — |
| 6 | Brand name "Ledgerium AI" (#327) | open | brand/product gap |
| 7 | Extension end screen `ProcessScreen.tsx:502` (#327) — needs real-extension gate | open; extension untouched 100 loops | — |
| 8 | Chrome Web Store listing check (#327) | open, manual | — |
| 9 | #318 GitHub Pages on? | open, 5 minutes | delete 16 root HTML pages |
| 10 | #320 PDF gating | open | pricing consistency |
| 11 | #316 viewer definition | not urgent | — |
| 12 | #308 React Flow Pro or attribution | open | store compliance |
| 13 | #191 Stripe trial stacking | open | real charges |
| 14 | #57 target; email verification | open | #57 evaluation |
| 15 | #225, #277, secret charset, squat query, Stripe price IDs | open (one ops batch) | 4-5 rows |
| 16 | #12 fail-loudly deploy | open | `deletedAt` (#326(3)) |
| 17 | #271, #216 extension capture semantics | open | extension |
| 18 | #281 | open, waits on push | — |
| 19 | Contract claims (SLA, dedicated support, "never used for training") | open, unchanged | — |
| 20 | Archive vs delete (MR-059 #4) | **closed by loop 141**: Archive kept, Delete purged | — |

---

## 10. Verdict

Every number reproduces at `c91ffdd`: root 6043 on 2 of 2, web-app 4245 on 2 of 2, typecheck 0, validator clean
(open 119), 33/33 script tests, Dockerfile guard OK, production build exit 0. Docker was not available; the image is
unbuilt. Loop 141's Delete is safe except Escape-while-busy, and the copy now matches the default UI; the retention
preview is safe for manual runs but cannot preview the first real purge, which the schedule triggers on its own. Loop
142 is deterministic and its key fix is complete, but its confidence rewards per-run-unique text and its raw strings
reach more fields than #331 names. Loop 143's Dockerfile fix is right and the runner is a superset; its import guard
runs nowhere. Apply the clause 9 amendment, flagged.

### Appendix — reproducing

```sh
git rev-list --count origin/main..main                                   # 9
grep -n "scripts/.*test.mjs" .github/workflows/deploy.yml               # 3 files; check-no-app-imports absent
ls scripts/*.test.mjs                                                    # 4 files
grep -n "if (dryRun) return summary" apps/web-app/src/lib/workflow-retention.ts   # :232, before the sweep
grep -n "cron\|RETENTION_PURGE_DRY_RUN" .github/workflows/retention-purge.yml      # :21, :49
grep -rE "@ledgerium/" apps/web-app/.next/server | wc -l                 # 0 after a local build
grep -c "a second pool > 15 breach within the same sequence" CLAUDE.md   # 1 (line 106)
```
