# MR-059 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 137-140, 2026-10-02. Commits `73b337f` (loop 137, #323), `8caab18` (CEO decisions recorded,
Mode 5 N=3 opened), `b933124` (loop 138, #283), `bbd47ba` (loop 139, #319), `5f66aa0` (loop 140, #314).
Rows closed: #323, #283, #319, #314, and #273 by decision. Rows filed: #326, #327.
**Why now:** mandatory. A Mode 5 sequence of N=3 closed at loop 140 (CLAUDE.md Mode 5 clause 4).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit. Everything below that needs a row, a strike,
a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `5f66aa0`. The working tree differs from HEAD only in `.claude/*` and an
untracked `data/`, which no check reads. `git status --short` was identical before and after every run. Windows,
pnpm 10. `origin/main` is `dcf7f0e`; `main` is **5 commits ahead** (`git rev-list --count origin/main..main`).

**Validation run for this review. Every check below was executed at `5f66aa0`; none is inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 4238 | **3 of 3: 234 files, 4238 passed, exit 0** | matches |
| root `pnpm test`, **×2** | 6008 | **2 of 2: 290 files, 6008 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 320 rows, 202 struck, 14/14 baselined, **open 118**, "V4: parsed 119 closure claim(s)" | matches |
| `node --test scripts/*.test.mjs` | 27 | **tests 27, pass 27, fail 0, exit 0** | matches |
| `gh run view 37069729009` | deploy succeeded | **success**; all 6 jobs green (quality-gate; web e2e 185 passed / 2 skipped; real-extension 6 passed; extension e2e; build-and-push; deploy). **headSha `dcf7f0e`** (the MR-058 commit) | see §1.4 |
| `gh run list --workflow "Alerts check"` | fails until configured | **one run ever: `37053616721` (19:21Z, schedule), failure.** Log: "Secret CRON_SECRET is not configured" and "Repo variable ALERTS_CHECK_URL is not configured", exit 2 | that is the only failure reason |
| Retention job | fails until configured | **has never run.** `retention-purge.yml` is not in `dcf7f0e` (`git show dcf7f0e:.github/workflows/retention-purge.yml` fails) | not on the remote yet |
| `alerts-heartbeat.yml` runs | — | none listed | — |

**Not run:** Linux, a GitHub runner of my own, `next build`, Docker, Playwright, any browser, any HTTP request, the
purge against any database. No `curl`/`wget`. I could not see whether a scheduled alerts run fired after the push
(22:17Z would be the first; none was listed at 22:45Z — GitHub delays schedules, so this is not evidence of anything).

---

## 1. Lead

**Every count reproduces and nothing needs reverting.** Loops 137 and 138 are clean. Loop 139's purge code is
sound on the questions it was asked. **But loop 139 promises a deletion that the default product does not offer,
and loop 140 removed true answers along with false ones.**

1. **The default dashboard cannot delete a workflow.** The only UI that sets `status: 'deleted'` is the v1 dashboard
   (`dashboard/page.tsx:614`), which renders only with `?v2=0` (`dashboard/page.tsx:316-320`). The default v2 shell's
   only removal is **Archive**, which PATCHes `status: 'archived'` (`WorkflowRow.tsx:635-638`). The purge selects
   `status === 'deleted'` only (`workflow-retention.ts:89,223,253`), so **archived workflows are kept forever**. The
   new Terms line says "You can export your data **and delete workflows at any time**; deleted workflows are permanently
   removed after 30 days" (`terms/page.tsx:52`), and the docs' how-to is the v1 instruction: "Hover over the card and
   click the trash icon" (`docs/page.tsx:2004`). Three reviewers (security, architect, growth) checked the purge;
   none walked the user's path to it.
2. **The decision record misstates the decision.** `8caab18` records the CEO-delegated choice as "purge **archived**
   workflows 30 days after deletion". The code purges **deleted** workflows and never touches archived ones. If the
   CEO reads the record, they believe Archive leads to removal. It does not.
3. **The legal copy and the job that makes it true ship separately.** The copy goes live on the next deploy; the purge
   runs only after `RETENTION_PURGE_URL` is set. Push without it and the Terms say "permanently removed after 30 days"
   while nothing is removed. Separately: the workflow has no dry-run input (`retention-purge.yml` has a bare
   `workflow_dispatch:`), so **the first configured run permanently removes every workflow deleted more than 30 days
   ago — including deletions made before the policy existed** — at 100 per day, with no preview. Neither the
   retroactivity nor the absence of a dry run was put to the CEO.
4. **What is live.** Run `37069729009` deployed `dcf7f0e`. **Loops 137-140 are not in production.** The CEO's push
   (recorded in `8caab18`) covered through MR-058 only.

---

## 2. Q2 — Clause 9 ruling

**What happened.** `8caab18` logged one override for the sequence and said: "The coordinator is asking the CEO to
confirm the override covers the whole sequence; **without that confirmation the sequence stops after item 1**."
Loop 139 then proceeded "on the CEO's explicit instruction … The CEO was told and can stop the sequence"
(`ITERATION_LOG.md`, loop 139 Candidate Selection). Loop 140 cited the same. **No confirmation is recorded.** I cannot
see the chat; if the CEO did confirm, the log omits it.

**Ruling.**
- **Substance: proceeding was right.** The CEO named all three items in one message ("Turn off diagnostic build. Update
  retention policy. … Fix positioning."). That message is explicit consent to each item, not an inferred ack. And the
  rule's purpose — stop a sequence that is growing debt — was not engaged: the sequence closed 3 rows and filed 2
  (pool 119 at sequence open → 118 now, validator).
- **Procedure: wrong.** The coordinator set its own stop condition, then proceeded on opt-out ("can stop the
  sequence"). MR-024 ruled that inferred acks are not consent; "told and can stop" is the same pattern. Either get the
  confirmation or do not write the stop condition.
- **Is clause 9 workable?** No. Its trigger is absolute (pool > 15). The pool has been 113-121 for 15+ reviews. At that
  size every multi-item CEO directive breaches it at item 2, so the rule can only ever be overridden, never satisfied —
  a rule that always fires carries no information. Re-scoping to "follow-up rows only" does not help: loop-born
  follow-ups alone exceed 15 (MR-058 §5.3 counted ~19 unblocked plus ~19 iteration-era).

**Proposed amendment (silence-as-accept; applies at MR-060 absent CEO override).** One control variable: the trigger.
Replace in `CLAUDE.md` (Mode 5 guardrails, clause 9, line 106) the text

> `If the open follow-up pool exceeds 15 at the start of any iteration within a Mode 5 sequence in progress, the coordinator MUST halt`

with

> `If the open follow-up pool exceeds 15 at the start of any iteration within a Mode 5 sequence in progress AND the pool is larger than it was when the sequence opened (net growth during the sequence), the coordinator MUST halt`

and replace

> `a second pool > 15 breach within the same sequence is a mandatory stop with no override.`

with

> `a second breach within the same sequence is a mandatory stop with no override. An override logged at sequence open covers every item the user named in the same directive; it is not re-consumed per item. (MR-059: at a standing pool of ~118 the absolute trigger fired on every multi-item directive and was overridden every time; loops 138-140 closed 3 rows and filed 2.)`

Everything else in clause 9 stays. Clause 6 (pool > 8 ⇒ burn-down) has the same always-on property, but cool-off
(clause 7) already gives it a release valve; I am not changing two controls at once.

---

## 3. Q3 — Loop 139, adversarially

### 3.1 Can the purge select a non-deleted or recently deleted row?

**No.** Three independent gates, each requiring both conditions:
- query: `where: { status: 'deleted', updatedAt: { lte: cutoff } }` (`workflow-retention.ts:223`);
- pure re-filter: `r.status === 'deleted' && r.updatedAt.getTime() <= cutoff` (`:89`);
- inside the per-workflow transaction: `deleteMany({ where: { id, status: 'deleted', updatedAt: { lte: cutoff } } })`
  (`:253`); a restore or touch between select and delete gives `count 0` → `skipped` (`:255,:286-288`).

A recent deletion cannot be early: `DELETE` stamps `updatedAt` via `@updatedAt` (`workflows/[id]/route.ts` DELETE
handler); a second DELETE is a no-op (`if (workflow.status === 'deleted') return { ok: true }`); PATCH on a deleted row
409s unless it restores (`:216-218`, checked before the tag writes); GET skips the view bump (`:67-70`). The writer
census (`workflow-writers.census.test.ts:18-22`) covers `update/updateMany/upsert` and raw SQL in `src`. I grepped
`scripts/`, `prisma/`, `packages/` and nested `workflows: { update… }` writes from other models: only `workflow.create`
in seed/upload/sync paths, none of which creates a deleted row. **The only clock risk is late, not early** (the two
allowlisted unfiltered writers, tracked in #326). `resolvePurgeAfterDays` refuses anything but 1-365 (`:54-61`).

### 3.2 Can the orphan sweep delete an upload in use?

**No, on today's code.** An upload is "in use" only through `Workflow.sourceUploadId` (`schema.prisma:154-171,203`);
the sweep requires `workflows: { none: {} }` (`:309`), which counts workflows of **any** status, so a deleted-but-
not-yet-purged workflow still protects its file. Each upload has its own file (`${uploadId}.json`, `upload/route.ts`
and `sync/route.ts`), so no two rows share a path. No code path attaches a workflow to an existing upload, and the
30-day age guard (`:309`) covers in-flight processing. Two caveats the reviews did not record:
- the sweep is **not transactional** — find, unlink, then delete (`:308-331`). Safe only because no re-attach path
  exists. A future "reprocess upload" feature would make it a TOCTOU; say so in the comment at `:301-307`.
- it also deletes the raw file of every **failed** upload older than 30 days. That is more deletion than the copy
  promises, which is the safe direction, but no public text mentions it.

### 3.3 Does the copy match behaviour exactly?

Five places say "deleted workflows are permanently removed after 30 days" (`terms:52`, `privacy:172`,
`privacy/extension:212`, `security:112`, `docs:2004`). The 30-31-day window matches "after". **Three mismatches:**
1. "delete workflows at any time" — not available in the default UI (§1.1);
2. "permanently removed" — false until `RETENTION_PURGE_URL` is set (§1.3);
3. the docs' "trash icon" instruction describes v1 only.

### 3.4 Is the audit log PII-free?

**Yes.** It logs `sha256(id)` and the deletion timestamp (`:291,:333-336`); the HTTP body carries counts only
(`purge/route.ts:65-72`); per-workflow errors are counted, not logged (`:296-298`). The top-level `catch` logs the raw
error (`purge/route.ts:74`); a Prisma error can echo query arguments, which here are ids and dates, not PII.

### 3.5 Missed by the three reviews

§1.1 (no delete in default UI), §1.2 (record says archived), §1.3 (copy-before-config; no dry run; retroactive purge),
and one measurement side effect: the purge and the sweep remove `Upload` rows that the admin operations dashboard
counts (`lib/admin-operations/queries.ts:189,254,264,275`), so historical upload totals will fall once retention runs.

---

## 4. Q4 — Loop 140

### 4.1 Eight strings against code

| String (file:line) | Code truth | Verdict |
|---|---|---|
| "No AI model runs on your data." (`(public)/page.tsx:361`) | no LLM SDK or provider call in `apps/web-app/src` or `packages/*/src` (grep: anthropic/openai/@ai-sdk/bedrock — 0 files) | **true** |
| "Rule-based and repeatable: the same recording always gets the same score" (`page.tsx:361`, `organization.ts:133`, `llms.txt/route.ts:33`) | `computeAiOpportunityScore` is a pure function of stepCount, durationMs, toolsUsed (`workflow-metrics.ts:525-556`) | **true**, while the formula is unversioned — "always" breaks the day the formula changes |
| "Automation agent composition" (`config.ts:183`) | `packages/agent-intelligence/src/index.ts:14` "deterministic and rule-based (no LLM calls)" | **true** |
| "Start Trial — Automation scoring + agent opportunity analysis" (`config.ts:174`) | rule-based composition exists | **true** |
| Export watermark "from an observed recording" (`export-markdown/route.ts:11,14`) | export is built from captured events | **true** |
| "AI readiness: 72" (`WorkflowRow.tsx:410`) | same score | **true** |
| Home/OG title "…AI-Readiness Scores" (`layout.tsx`) | score exists on every workflow | **true** |
| Department Q&A: "Ledgerium measures where AI could fit." (`department.ts:72,151`, same in `industry.ts`) | the score rates a **whole workflow** on three magnitudes; nothing locates *where* in it AI fits | **overclaim (mild)** |

### 4.2 Remaining AI overclaims on the built surface

The authorship scan (`pricing-copy.test.ts:424-484`) finds none, and my own grep agrees for `src`, `public/*.html`,
`public/samples/*.html` and the 16 root `*.html`. Remaining "AI" is the brand, "readiness for AI", negations,
competitor descriptions, and "AI agents" as the *downstream target* (`use-cases/ai-implementation`, blog). Two gaps:
the scan reads `public/*.html` but not `public/samples/` (`:458`, `readdirSync` is not recursive) or the repo-root
HTML (#318); `public/dashboard.html:648,653,686,1479` still says "AI Opportunities" against the new canonical
"AI readiness" — inconsistent, not false.

### 4.3 Did the SEO Q&As stay true — and did they lose value?

The questions kept their search phrasing. **The answers no longer answer them.** The old answers ("In the repetitive,
rule-based steps like matching, coding, and drafting recurring entries. Approvals and judgment calls should keep a human
involved.") were domain advice, not product claims, and were true. They were replaced by a product description that
does not answer "Where can AI help in finance workflows?" — an underclaim that also weakens the page for the query it
targets. Recommend: restore the domain answer, then append the product sentence without "measures where AI could fit".
No other underclaim found; "Most Popular" removal is honest until Team is buyable.

---

## 5. Q5 — Loop 138: other stack-trace paths

None found.
- `src/app/error.tsx` renders `safeErrorName` and the digest only (`error.tsx:24,54-55`); `global-error.tsx` now
  renders no name, message or stack. There are no per-segment `error.tsx` files.
- API routes: `withApiRoute` returns `{ error: 'Internal server error', requestId }` and never the message
  (`with-api-route.ts:16-19`). Grep of `src/app/api` for returned `.message`/`.stack`/`String(err)` finds only Zod
  validation messages (input-shape text) and two `validationErrors: JSON.stringify([String(err)])` writes
  (`upload/route.ts:173`, `sync/route.ts:201`) stored in the DB and never returned by any route.
- `NODE_ENV=production` in both Dockerfile stages (`Dockerfile:72,148`) and `deploy.yml:171`, so no dev overlay.
- No other map emitter: extension `vite.config.ts:13` `sourcemap: false`; no `*.map` in `public/`.

---

## 6. Q6 — Practices

- **Review weight.** Loop 138 used one agent, loop 140 two, loop 139 four. Four on an irreversible deletion is
  proportionate. The miss was **scope, not count**: all three reviewers read the purge; none traced "how does a user
  get a workflow into `deleted`". For any feature that makes a promise, one reviewer should walk the promise from the
  default UI.
- **CEO-delegated choices.** 30 days, "after" not "within", badge removal and footer are each stated in the log with a
  reason — good. **Not surfaced:** retroactive purge of pre-policy deletions; first run without a dry run; that Archive
  is never purged. **Misstated:** "purge archived workflows" (`8caab18`).
- **Pool trend.** 119 (MR-058) → +3 filed by MR-058 (#323-#325) − 1 struck (#144) = 121 → 5 closed, 2 filed → **118**.
  The first real fall in eight reviews, driven by CEO decisions (#273 closed by decision; three CEO-blocked rows
  closed by the directive). Burn-down alone still runs flat.

---

## 7. What the window got wrong

1. Loop 139 promises deletion the default UI does not offer; archived workflows are kept forever (§1.1).
2. The CEO-decision record says archived workflows are purged; they are not (§1.2).
3. Legal copy ships before the job that makes it true; no dry run; retroactive purge not put to the CEO (§1.3).
4. Clause 9: the log set a stop condition and then proceeded on opt-out (§2).
5. Loop 140 replaced true domain answers with non-answers, one of them a mild overclaim (§4.3).
6. The authorship scan does not recurse into `public/samples/` or cover root HTML (§4.2).
7. MR-058's plan (#324 at 138, #121 at 139) was displaced by the directive — correctly — but #121's unreadable score
   cell is still unrepaired, now 85 loops after MR-034 flagged it, and cool-off has been armed since loop 128.
8. Nothing needs reverting.

**Pattern:** same as MR-055 through MR-058, one level up. The fix covered every *code* reader of the fact (loop 137
did this well: the invite inventory is complete) but not every *user* path to the promise.

---

## 8. Q8 — Loop 141 pick

Pool 118 > 8 ⇒ burn-down unless cool-off is invoked. Last five Areas: security/authz, security/authz, security/web,
security/data, web/positioning — **security is 4 of 5, so any security pick takes the −2 saturation penalty**; the
last three are not identical, so no forced pivot. None of the three picks below is security.

| Rank | Pick | Score | Rule | Agent | Area |
|---|---|---|---|---|---|
| **1** | **New row (follow-up of #319): "Deletion is reachable from the default dashboard, and the copy says how."** Add a Delete action (with confirm) to the v2 kebab next to Archive, or have Archive's confirm say archived workflows are kept; fix the docs' trash-icon instruction; add a `dryRun` input to `retention-purge.yml`; correct the `8caab18` "archived" wording in SYSTEM_HEALTH. I5 A5 L3 C4 E2 R2 | **13** | `burn-down` | `frontend-engineer` + `growth-strategist` if ≥3 strings | web-app / trust |
| 2 | **#121 PATHE-P05**, repairing its `\|` in the same commit, after a 15-minute staleness check | **14** (true) | `ceiling-cool-off: invoked` (armed since loop 128) | `system-architect` (D-4 clause 2) | process-graph |
| 3 | **#325** V4 live-log recency canary + "closed #id" non-canonical rejection | **12** | `burn-down` | `backend-engineer` | tooling |

Rank 1 should land before, or in the same push as, loops 137-140 — it is the cheapest way to make the Terms line true.
Then #121 at 142, #325 or #324 (11) at 143. MR-060 after 143 under the 3-loop floor.

---

## 9. Q9 — CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | **Push** loops 137-140 (5 commits; live is `dcf7f0e`) | open — **pair with #3** | invite seat fix, source maps off, retention, positioning |
| 2 | **Enable alerts**: secret `CRON_SECRET` + variable `ALERTS_CHECK_URL` | open; confirmed the only failure reason | alerting |
| 3 | **Enable retention**: variable `RETENTION_PURGE_URL`; **first** a dry run (`POST …?dryRun=1`), and decide whether pre-policy deletions are purged | open; new sub-decision | makes the Terms line true |
| 4 | **Archive vs delete**: should Archive stay "kept", with a separate Delete? | **new** | §1.1 |
| 5 | Brand name "Ledgerium AI" (#327) | open | largest brand/product gap |
| 6 | Extension end screen `ProcessScreen.tsx:502` (#327) — needs CEO approval + real-extension gate | open | — |
| 7 | Chrome Web Store listing check (#327) | open, manual | — |
| 8 | #318 GitHub Pages on? | open, 5-minute check | delete 16 root HTML pages |
| 9 | #308 React Flow Pro or attribution | open | store compliance |
| 10 | #191 Stripe trial stacking | open | real charges |
| 11 | #320 PDF gating | open | pricing consistency |
| 12 | #277, #225, secret charset, squat query, Stripe price IDs | open (one ops batch) | 4-5 rows |
| 13 | #12 fail-loudly deploy | open | also unblocks `deletedAt` (#326) |
| 14 | #57 target; email verification | open | #57 evaluation |
| 15 | #271, #216 extension capture semantics | open | extension (97 loops untouched) |
| 16 | #281 | open, waits on push | — |
| 17 | Contract claims (SLA, dedicated support, "never used for training") | open, unchanged | — |
| 18 | #316 viewer definition | not urgent | — |
| 19 | **Clause 9 amendment (§2)** | silence-as-accept at MR-060 | — |

Closed this window: #273 (by decision), #283, #319, #314 (#327 carries its leftovers).

---

## 10. Verdict

Every number reproduces at `5f66aa0`: web-app 4238 on 3 of 3, root 6008 on 2 of 2, typecheck 0, validator clean
(open 118), 27/27 script tests. The deploy succeeded but shipped `dcf7f0e`; loops 137-140 are not live. Alerts fail
only for missing configuration; retention has never run. The purge cannot take a live or recent row and the sweep
cannot take an upload in use. The problem is the promise around it: the default UI cannot delete, Archive is kept
forever, the record says otherwise, and the first configured run would purge retroactively with no preview. Clause 9
was right to override and wrong to log as conditional; its absolute trigger should become a net-growth trigger.

### Appendix — reproducing

```sh
git rev-list --count origin/main..main                          # 5
gh run view 37069729009 --json headSha                          # dcf7f0e…
gh run view 37053616721 --log-failed | grep "not configured"    # CRON_SECRET, ALERTS_CHECK_URL
git show dcf7f0e:.github/workflows/retention-purge.yml          # fails: not deployed
grep -n "status: 'archived'" apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx   # :638
grep -n "v2') !== '0'" "apps/web-app/src/app/(app)/dashboard/page.tsx"                 # :319
grep -n "status === 'deleted'" apps/web-app/src/lib/workflow-retention.ts              # :89
```
