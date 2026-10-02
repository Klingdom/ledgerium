# MR-054 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 122-124, 2026-10-02. Commits `3493e8e` (loop 122, #301), `321d74d` (loop 123, #302),
`49f8628` (loop 124, #304). Rows filed in the window: none (MR-053 filed #301-#304 at `76256d9`). Rows
closed: #301, #302, #304.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `49f8628`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node v24.20.0, pnpm 10.32.1, Windows. CI pins Node 20
(`deploy.yml:27`) and, since loop 122, takes pnpm from `packageManager` (`package.json:4`), Linux.
`origin/main` is `e1a9af5`; local `main` is **37 commits ahead** (38 once this review is recorded).
`gh run list` (read-only) shows the last `deploy.yml` run green at `e1a9af5`, so nothing in this window
or the previous four has run in CI.

**Validation run for this review — all executed at `49f8628`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 3968 (loop 124) | **3 of 3: 222 files, 3968 passed, exit 0** (15.0-15.4 s) | matches |
| root `pnpm test`, **×2** | 5754 | **2 of 2: 281 files, 5754 passed, exit 0** (18.8-18.9 s) | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 297 rows, 183 struck, 19/19 budget, **open 114** | reconciles: 113 (MR-053 entry) + #301..#304 − #301 − #302 − #304 = **114** |
| Validator on each window commit's own backlog + log + script (`git show <c>:…`) | — | `76256d9` 117 · `3493e8e` 116 · `321d74d` 115 · `49f8628` 114, **all exit 0**, 297 rows each | no corruption; each window commit's backlog diff is exactly one strike |
| `deploy.yml:47` exactly, `npx -y pnpm@9.15.9` | — | **exit 0, 281 files / 5754** | holds on the old major |
| `deploy.yml:47` exactly, `npx -y pnpm@10.32.1` | — | **exit 0, 281 / 5754** | holds on the pinned major |
| `deploy.yml:56` exactly, pnpm 9.15.9 / 10.32.1 | — | **exit 0, 222 / 3968 on both** | holds |
| Same two commands + nonexistent test filter `zz_none_filter` | "exit 1" | **exit 1 on both majors, both steps** ("No test files found") | holds |
| `pnpm --filter <nonexistent package> exec vitest run --no-passWithNoTests` | not claimed | **exit 0 on both majors**, "No projects matched the filters" | **new hazard (§2.3)** |
| Same with `--fail-if-no-match` | — | **exit 1 on both majors** | the fix |
| #57 trust-review table, 2 rows recomputed | N=200/k=10: 0.365 / 0.153; N=20/k=10: 0.556 / 0.407 | module copied, `node --experimental-strip-types`: **0.365 / 0.153** and **0.556 / 0.407** | reproduces (§3) |

**Not run:** Linux, Node 20, a GitHub runner, `pnpm/action-setup`, Playwright, `next build`, Docker, any
HTTP request, production data. No `curl`/`wget`. `npx -y pnpm@<v>` ran on this Windows machine. I did not
run the new teams test file separately (it is inside the 3968).

---

## 1. Lead

**The window holds. Nothing reverts.** Loop 122's CI fix is correct on both pnpm majors, every count
reproduces, and the two security fixes do what they say for the rows they target. The misses are
smaller than MR-052's and MR-053's, and none of them is in a meta-review fix shape — the first window in
three where that is true.

What the window got wrong is mostly **claims a step wider than the evidence**:

1. Loop 124's log says invite accept authorises "on the invitee's email **plus an active inviter**"
   (`ITERATION_LOG.md:16`). It re-checks the inviter only for `owner` invites
   (`invites/accept/route.ts:248-254`); AUTHZ P2-4 is still OPEN and the audit says so. The log
   contradicts the audit it updated.
2. Loop 123's trust review requires the page to say "N < 100 is indicative only; N < 30 can be set by a
   few free accounts" (`TRUST_REVIEW_LOOP123_57_METRICS.md`, *Required wording*). The page shows N; the
   guidance is only in the log and SYSTEM_HEALTH. And the page now prints **pooled** counts next to a
   **per-user** rate, so the CEO can divide the line under the number and get a different number (§3.2).
3. CI's `--filter` steps pass green on a package that does not exist (§2.3) — the same "passes on
   nothing" class #300 fixed for test filters, one level up. Latent; nothing is misnamed today.

The bigger finding is outside the window: **the public pricing page promises "Multi-user invites are
launching Q3 2026"** (`pricing/page.tsx:30`, `:194`) and so does the checkout API's refusal
(`checkout/route.ts:313`). Today is 2026-10-02; that promise lapsed two days ago, on the page every
paying customer reads. No row tracks it, no test binds it, and sixteen loops of security/CI work and three
meta-reviews (mine included) walked past it. It leads the portfolio turn (§6).

---

## 2. Q1 — Loop 122 re-run

### 2.1 Counts and the exact CI lines

Table above. Both `deploy.yml` test lines (`:47`, `:56`) exit 0 with real counts on pnpm 9.15.9 and
10.32.1 and exit 1 on an empty test filter. `npx -y pnpm@9.15.9` did not self-switch to the
`packageManager` version (`--version` printed 9.15.9). The loop's proof is sound.

### 2.2 Does `pnpm/action-setup@v4` read `packageManager` when `version` is omitted?

**Cannot be verified offline.** The action is not vendored: nothing under `node_modules/` or the repo
contains its source, and `curl` is denied. From recall, not from a run: v4 reads `packageManager` when
`version` is absent, and **errors when both are set and differ** — so removing `version: 9` was required,
not optional; leaving it would have failed the setup step once `packageManager` landed. Loop 122 states
the residual honestly ("the first push is the confirmation"), and its contingency (`version: 10.32.1` in
the action) is the right one.

Indirect evidence that pnpm 10.32.1 works on Linux / Node 20 with this lockfile: the production Docker
image has pinned it since `4a3fd2d` (2026-05-17; `Dockerfile:16,50`, `FROM node:20-alpine`), and the last
deploy run built that image green at `e1a9af5`. That covers `pnpm install --frozen-lockfile`
(`Dockerfile:43`), not the action.

**pnpm 10 changes one install behaviour CI never had:** dependency build scripts run only for
allow-listed packages. The repo has **two** allow-lists that disagree — `package.json:22`
(`better-sqlite3`, `esbuild`) and `pnpm-workspace.yaml:4` (`@prisma/client`, `prisma`). Which one pnpm
10.32.1 honours I did not determine. It is low risk here: `better-sqlite3` is not installed, esbuild ships
platform binaries as optional dependencies, and both workflows run `prisma generate` explicitly
(`deploy.yml:36`, `e2e-web-app.yml:70`). Local and Docker already install under the same rule, so CI now
matches them. Worth one line when the first run is read.

**Dockerfile corepack vs `packageManager`:** no conflict today — both say `pnpm@10.32.1`. Corepack's shim
honours the project's `packageManager` over the globally prepared version, so the Dockerfile pin is now
redundant rather than authoritative: if the two ever diverge, Docker silently follows `package.json`
(downloading that version at build) and the `Dockerfile:14-16` comment becomes wrong, not the build.
A conflict would require `packageManager` to name a different manager, which nothing does.

### 2.3 New hazard: a filtered step on a missing package exits 0

`pnpm --filter @ledgerium/no-such-app exec vitest run --no-passWithNoTests` → "No projects matched the
filters", **exit 0**, on both majors. Every CI test step that selects by package name inherits this:
`deploy.yml:56`, `e2e-web-app.yml:100`, `e2e-extension.yml:56`, `:139`. A package rename turns each into a
green no-op. `--fail-if-no-match` exits 1 on both majors (executed). Today's names resolve
(`--filter extension-app` matches `@ledgerium/extension-app` by unscoped name, executed on both majors).
Filing recommended at score ~9 (I3 A4 L2 C5 E1 R1 + nothing else).

### 2.4 Leftover

`deploy.yml:40-44` still explains the flag as overriding "the root script's own --passWithNoTests" — the
root script is no longer invoked. Comment only.

---

## 3. Q2 — Loop 123

### 3.1 The trust review's numbers

Two rows recomputed by executing the shipped module (`dashboard-v2-retirement-metrics.ts`, import of
`MAX_INSIGHT_CHIPS` replaced by its value 5 from `workflow-metrics.ts:26`): honest users 3 views / 1 bounce /
9 chips / 1 click each, forged users 1 view / 1 bounce / 1 chip / 1 click.

| N honest | k forged | review | measured |
|---|---|---|---|
| 200 | 10 | bounce 0.365, chip 0.153 | **0.365, 0.153** |
| 20 | 10 | bounce 0.556, chip 0.407 | **0.556, 0.407** |

Both reproduce, and so does the closed form k(1−r)/(N+k). **One omission:** the table forges bounce = 1,
which pushes bounce *away* from the retirement target (<40%). The attacker who wants retirement to pass
forges bounce 0 and chip 1 together. Executed: N=20, k=10 → **bounce 0.333 → 0.222, chip 0.111 → 0.407** —
both criteria pushed toward "retire" at once. The downward bound is k·r/(N+k); the review's formula covers
only the upward one. Conclusion unchanged (indicative below ~100 users); the table understates the
useful attack.

### 3.2 Is the min-10 + "indicative below ~100" guidance coherent with how the CEO reads the page?

**N is shown, as claimed** — "· N users" after each count line (`analytics/product/page.tsx:795`, `:810`).
Two problems remain:

- **The guidance is not on the page.** The page says "Insufficient data (fewer than 10 users)" below 10
  (`:792`, `:804`) and a bare percentage from 10 upward. At N = 12 the CEO sees "31.2%" with no hint that
  three free accounts can move it ten points. The trust review's *Required wording* asked for exactly that
  sentence; the loop put it in SYSTEM_HEALTH instead. The CEO reads the page, not SYSTEM_HEALTH, when the
  numbers arrive.
- **The count line now contradicts the rate.** The rate is a mean of per-user rates; the line beneath it
  is pooled `bounces / views` (`:795`). The module says "the rates are NOT ratios of them" (`:38-39`); the
  page does not. Executed: 9 users with one view and one bounce each, plus one user with 91 views and none →
  page shows **"90.0%"** above **"9 bounces / 100 views · 10 users"**. A reader checking the arithmetic
  concludes the page is broken.
- **The estimator changed under a fixed target.** "Under 40%" (`:793`) was written for an event-level
  rate. Per-user weighting up-weights one-visit users, who bounce more. The target may still be right; it
  has not been re-confirmed for the new estimator. That is a CEO line, not a code fix.

Recommended row (~10, I3 A4 L2 C5 E1 R1; copy ≥3 strings → `growth-strategist` adjacent): put the N<100 /
N<30 sentence on the page, label the count line "pooled, for context", and ask the CEO to re-confirm 40%.

---

## 4. Q3 — Loop 124

### 4.1 The audit table, three routes spot-checked

| Route | Audit row says | Code | Verdict |
|---|---|---|---|
| `GET /api/teams` | `where: { userId, status: 'active' }` (`:33`) | `teams/route.ts:33`; nested members `status: 'active'` `:39` | right |
| `GET/DELETE /api/teams/[id]/members` | active-member / active owner-admin guard | `members/route.ts:56-57`, `:147-151`; target looked up by `teamId_userId` `:154-156` | right |
| `PATCH …/members/[memberId]` | active owner-admin, elevation check | `[memberId]/route.ts:64-67`, `:75`; target scoped `{ id, teamId }` `:83-85` | right |

The table is right. **The log is not:** "or (for invite accept) on the invitee's email plus an active
inviter" (`ITERATION_LOG.md:16`). The inviter is re-checked only inside `if (invite.role === 'owner')`
(`invites/accept/route.ts:248-254`); an `admin`/`member` invite from a since-removed inviter is still
accepted. AUTHZ_AUDIT_001 keeps that as **P2-4 DEFECT** (`AUTHZ_AUDIT_001.md:70`). Correct the log line;
no code change implied by this review.

### 4.2 Team-scoped data reachable by a removed member outside `/api/teams`?

Searched every non-test `src` file for `teamId` / `teamMember` outside `api/teams` and `api/invites`:
`workflows/[id]/share`, `admin/*`, `billing/webhook`, `feature-gating`, `plans`, `workspace/*`,
`team-roles`, the teams page.

- **Read side: none found.** Workflows and portfolios carry no `teamId` (`plans.ts:103` says so); there is
  no team-scoped export; `WorkflowShare` rows of type `team` are written but no code reads them (only the
  share route itself, which resolves a team *name* for the sharer, `share/route.ts:67-72`). Plan
  entitlement from a team requires `status: 'active'` (`feature-gating.ts:304-307`). `ApiKey.teamId`
  exists (`schema.prisma:144`) but nothing authorises on it.
- **Write side: one, already known.** `POST /workflows/[id]/share`, team branch, checks membership with
  no `status` (`share/route.ts:152-157`): a removed member can still write share grants into the team.
  Inert today because nothing reads them; it is AUTHZ **P3-2**, which says whoever adds a reader must
  enforce it. Loop 124's "only defect of this shape" is scoped to teams/invites routes and is true as
  scoped; P3-2 is the same shape one directory over. It should be fixed **before** any team-sharing reader
  ships, not by the reader's author.

---

## 5. Q4 — Practices

| Practice | Verdict |
|---|---|
| Coordinator full re-run at loop 124 caught the agent's stale final run (it predated the agent's own typecheck fix) | Working. Keep it: the agent's last run is evidence about the agent's last tree, not the commit |
| "CI change proven under CI's versions" (adopted MR-053) | **Fired at loop 122**, both majors, exact lines. Missed the one-level-up case (§2.3), which no version check would catch |
| "Second agent on a new trust boundary" (adopted MR-052) | **Fired at loop 123** — and it found the limits that matter. It did not fire on loop 124's audit sweep, where the overclaim (§4.1) sits |
| Recording scripts run the validator | Confirmed: each window commit validates, exit 0, open 117 → 116 → 115 → 114, one strike per commit, 297 rows throughout. No corruption. Budget still 19/19 |
| Claims ahead of evidence | Three: §4.1 (inviter), §3.2 (guidance "for the CEO" not on the CEO's page), and loop 122's log scoring #301 "14" under Controls and "(16)" in Candidate Selection two lines later (`ITERATION_LOG.md:61,65`) — cosmetic, but it is the selection record |
| Backlog truth | **#82 (DV2-R13, score 9) is open and already done** — closed as #196 at loop 16 (`IMPROVEMENT_BACKLOG.md:372`; `DashboardV2Shell.tsx:216-217,1277,1298`). V4 cannot see a row closed under another number. Strike #82 as duplicate of #196 |

---

## 6. Q5 — The portfolio turn

### 6.1 What blocks the user-visible levers

- **Chrome Web Store submission:** engineering-clear; the rest is human. `config.ts:16` is still the
  placeholder, and `install.ts:41-48` switches the site from "download the zip and sideload" to "Add to
  Chrome" automatically once a real URL lands — so the single biggest activation-funnel friction (the
  PRD's signup → install → record → SOP, `PRD.md:257-259`) is one config line after submission. The
  checklist (`docs/features/chrome-store-submission/SUBMISSION_PACKAGE.md:144-151`) still has open human
  items: privacy-policy URL in the dashboard, Data Safety form, permission justifications, version `2.0.0`
  vs `1.0.0`, the manual capture certification, and **React Flow `hideAttribution: true`** — present in
  five places including the extension side panel (`SidebarProcessMap.tsx:194`). No backlog row tracks
  that checkbox. (From recall, unverified offline: React Flow is MIT-licensed and the attribution request is
  xyflow's ask of commercial users, not a licence term — the checklist's "requires paid license" should be
  checked before anyone pays or rips it out.)
- **#216 / #271:** both CEO-blocked, both on the protected capture path. No loop can move them.
  Extension untouched since `871e29a`, 81 loops.

### 6.2 Selection rules

Pool 114 > 8 → Follow-Up Debt clause 6 forces `burn-down`. #268 (born L91) and #231 (born L63) are
follow-ups and qualify directly. A row filed at this review is not a follow-up in the clause-1 sense;
two rules can admit it:

- **Ceiling cool-off (clause 7):** charged — the last invocation in `ITERATION_LOG.md` is iter 029
  (`:5495`), and loops 122-124 are three consecutive `burn-down` selections. It permits one `top-score`
  pick with `ceiling-cool-off: invoked; rationale: …`. This is the clean rule.
- Precedent (#301-#304 were filed at MR-053 and selected as `burn-down`). Workable, but it stretches
  "follow-up". Prefer the cool-off; it is the resource built for exactly this.

Area saturation: picks 2 and 3 are both `web-app / a11y`; with pick 1 in `copy / trust` no 3-consecutive
trip occurs. Release-blocker cadence: no open Phase-1 blockers.

### 6.3 The next three picks

| # | Pick | Score | Rule | Evidence |
|---|---|---|---|---|
| **125** | **New row (MR-054): the pricing page and checkout promise a launch date that has passed** — remove or replace "launching Q3 2026" (`pricing/page.tsx:30`, `:194`; `checkout/route.ts:313`), and in the same outcome fix **#34**, the same page contradicting itself on health scores (Starter "Basic process health scores", `config.ts:89`, vs FAQ "process health scores … Team plans and above", `pricing/page.tsx:38`). Bind both to a test (MR-020 found plan claims have none) | **13** (I4 A5 L2 C5 E1 R2) | `top-score` via **`ceiling-cool-off: invoked`** | One logical outcome: the public pricing page's claims match product state; one file family, one Area. ≥3 strings → `growth-strategist` adjacent (D-4 clause 1). The replacement *date* is a CEO line; "no date" ships without one |
| **126** | **#268** — three workflow-map views never measured for contrast | **9** | `burn-down` | Core product view. The row's known failures are all still at the cited lines: `WorkflowVariantsMap.tsx:160` `#fca5a5`, `:1012` and `:1039` `#9ca3af`, `DfgFrequencyMap.tsx:79,725` `#9ca3af` (verified). Loop 91's method (measured per-theme tokens) applies directly |
| **127** | **#231** — Flow View step detail is hover-only (SC 1.4.13) and the scrollbar is hardcoded light | **10** | `burn-down` | `SOPVisualMode.tsx:236` (`title` only), `:264` (`group-hover:opacity-100`, no focus path), `:202` (`scrollbarColor: '#e2e8f0 …'`) — all still present. The SOP view is the product's output |

Not picked, with reasons: **#287** (9) is ~80 `bg-brand-*/NN` sites (`grep`), too large for one loop
unless scoped to the install page's two (`install/page.tsx:40,117`, which sit on the activation path —
a good fourth pick). **#82** is already done (§5). **#13** (10, oldest open row) is "Define recorder
failure-state UX" — a Define artifact, and any build half touches the extension under the Reliability
Invariant. Path E / pricing-PRICING-001 / workspace rows score 11-14 but are multi-loop programmes on
audit-intake anchors with dependencies; they need a Define pass and a D-7 pre-check, not a bounded loop.
**#57 page wording** (§3.2, ~10) is user-visible to one user (the CEO); pick it before the push if the
CEO will read #57 numbers in the first week.

---

## 7. Q6 — What the window got wrong

1. **Log overclaims invite-accept authorisation** (§4.1) against an audit it edited in the same commit.
2. **Trust-review guidance did not reach the page**, and the page pairs pooled counts with a per-user rate
   (§3.2). The 40% target was not re-confirmed for the new estimator.
3. **Trust review tabulated only the attack that hurts the attacker** on bounce (§3.1).
4. **`--filter` on a missing package passes** (§2.3) — the #300 class one level up, unexamined.
5. **Two disagreeing `onlyBuiltDependencies` lists** went unmentioned in a loop that changed which pnpm
   major reads them (§2.2).
6. **Not this window's alone:** a lapsed public launch date on the pricing page (§1), untracked. MR-053 §8
   ranked user-visible work by backlog score and never looked at the live site. A portfolio turn toward
   users should start by reading what users read.
7. Nothing to revert.

---

## 8. Pattern — what this window adds

1. **The adopted practices fired** (CI versions at 122; second agent at 123). The misses moved to the
   edges of each practice: one level up from the version (package selection), and one step past the
   review (the review's sentence never reached the page).
2. **A finding's audience is part of the fix.** "Indicative below ~100 users" is a fix only if the person
   making the decision sees it where they make it.
3. **Score-ranked selection cannot see what was never filed.** The pricing date lapsed while sixteen loops
   ranked the backlog. When the portfolio turns to users, the first input should be the live surfaces, not
   the pool.

No control-rule change proposed. Practice notes: before a user-visible arc, one pass over public pages for
dated or conditional claims; trust-review "required wording" lands in the UI or is logged as not done;
CI steps that select by package carry `--fail-if-no-match`.

---

## 9. Q7 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **Unblocked** | 37 commits ahead (38 with this review). First CI run on pnpm 10. Watch three things in `quality-gate`: the *Install pnpm* step (if it errors, the fix is `version: 10.32.1` in the action — one line); the test steps print **5754** and **3968** (not "No projects matched"); and a red test step is now a real failure — read it, do not override |
| **Alerts — enable** | Repo side done; after the push | Steps unchanged (`CRON_SECRET`, `ALERTS_CHECK_URL`, a channel, redeploy, Run workflow). Caveat unchanged: a 2 h on / 2 h off flap pages every 4 h (#303) |
| **#57 reading** | **Readable with limits, from deploy** | Changed from "do not read". Only data after deploy; treat N < 100 as indicative, N < 30 as settable by a few free accounts — **the page does not say this yet** (§3.2). The rate is per-user; the count under it is pooled, so they will not divide. **Re-confirm the 40% bounce target for the per-user rate** |
| **Email verification at signup (AUTHZ P1-2)** | **Now load-bearing** | It is what makes #57 forgery cost more than a free signup. It also adds a step to the activation funnel the PRD measures. Your call: build it (with #225), or accept #57 as indicative only |
| **Lapsed "launching Q3 2026"** (new) | **Needs a date or "no date"** | On the pricing page twice and in the checkout refusal (§1). Loop 125 can ship "no date" without you |
| **React Flow attribution** (new) | Pre-submission checkbox, untracked | `hideAttribution: true` in five places incl. the extension. Subscribe, show the attribution, or confirm it is not required (§6.1) |
| **Chrome Web Store** | Human steps only | Privacy-policy URL, Data Safety, justifications, version 2.0.0 vs 1.0.0, manual capture certification. The site switches to "Add to Chrome" by itself once `config.ts:16` holds the real URL |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Now also sets the Sybil cost of #57 (signup's per-IP limit) |
| **#277 values** | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged; also user-visible (error page shows stacks) |
| **#281** delivery test | After the push | The heartbeat answers it once alerts are on |
| **#216** extension untouched | **81 loops** (`871e29a`) | Unchanged |

---

## 10. Verdict

Every number reproduces at `49f8628`: web-app 3968 on 3 of 3, root 5754 on 2 of 2, typecheck 0,
validator clean at 114 open and at every window commit. Loop 122's test lines pass on pnpm 9.15.9 and
10.32.1 and fail on an empty filter; the push is unblocked, with the action's `packageManager` behaviour
the one thing only the first run can confirm. Loop 123's per-user metrics and its trust review hold
(two rows recomputed exactly); the page needs the review's sentence. Loop 124's fix and audit table are
right; its log overclaims invite acceptance.

Turn to users with: the pricing page's lapsed launch date and self-contradiction (loop 125, cool-off),
then #268 and #231. Strike #82. Push.

---

### Appendix — reproducing §2.3 and §3

```sh
# §2.3 — package selection that matches nothing
npx -y pnpm@9.15.9  --filter @ledgerium/no-such-app exec vitest run --no-passWithNoTests   # exit 0
npx -y pnpm@10.32.1 --filter @ledgerium/no-such-app exec vitest run --no-passWithNoTests   # exit 0
npx -y pnpm@10.32.1 --filter @ledgerium/no-such-app --fail-if-no-match exec vitest run     # exit 1
```

```ts
// §3 — dashboard-v2-retirement-metrics.ts copied; MAX_INSIGHT_CHIPS inlined as 5
//   honest user: 3 views (3 chips each), 1 bounce, 1 click   -> bounce 1/3, chip 1/9
//   forged user: 1 view (1 chip), [bounce], 1 click
//   N=200 +10 forged (bounce 1)  0.365 / 0.153     N=20 +10 forged (bounce 1)  0.556 / 0.407
//   N=200 +10 forged (bounce 0)  0.317 / 0.153     N=20 +10 forged (bounce 0)  0.222 / 0.407
//   9 users x (1 view, 1 bounce) + 1 user x 91 views -> rate 0.900, line "9 bounces / 100 views · 10 users"
```
