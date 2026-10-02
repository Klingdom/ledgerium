# MR-042 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 85, 86, 87, one non-counting Mode 3 correction to loop 83, the MR-041 recording
commit and one governance-tooling fix, all 2026-10-01. Commits `bfc270d` (MR-041 recorded, #256
reopened, validator dating), `3f7465a` (Mode 3: `Response` pass-through, build-phase re-throw, guard
D over `app/`), `581767f` (loop 85, #256), `b64c35b` (validator: last `CLOSED loop` match),
`7f8b60d` (loop 86, #258 + #254), `a64c365` (loop 87, #248). Rows filed in the window: #260, #261.
**Date:** 2026-10-01
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike or a text correction is a recommendation for the coordinator to apply.

**Validation run for this review — all executed, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && npx vitest run` | 3380 (loop 87) | **195 files, 3380 passed, exit 0** | matches |
| `pnpm -r typecheck` | exit 0 | **exit 0**; "Scope: 11 of 12 workspace projects", 11 `Done`, 0 error lines | matches. Loop 86's transient `ERR_PNPM_JSON_PARSE` "outside this repo" was **not reproduced and not verifiable** from here |
| `node scripts/validate-backlog.mjs` | open 106, oldest #9, median 4, max 82 | **254 rows, 148 struck, 19/19 budget, clean, exit 0; `open 106 \| oldest open non-blocked: #9 (proposed) \| median age-at-close, last 10: 4 loops (max 82; all-time max 82) \| 3 closures not datable \| ages measured to loop 87`** | matches what it prints; §2 is about what it computes |
| Dated closures (validator instrumented in scratch, not edited) | — | 28 dated; only **#8 and #16** are dated via `iter NNN`; last-10 ages 2,3,3,4,4,4,6,9,82,82 → median 4 | arithmetic correct; **the `iter` → loop mapping is not** (§2.2) |
| `req.json()` sites in `app/**/route.ts` | "35 sites, 13 unguarded, 12 routes → 0" | **35 at `7f8b60d^`; 20 now (8 `.catch` + 12 allowlisted); 15 converted to `readJsonBody` in 13 files** | **the loop's count is wrong a third time** (§3.1) |
| Thrown `Response` sites in `src` (non-test) | — | **3**: `feature-gating.ts:124` (403), `read-json-body.ts:50,53` (400) | none ≥ 500 today (§3.3) |
| Wrapped handlers / route files | 95 / 74 | **95 in 74; 74 `route.ts` under `app/`** | matches; guard D now scans `APP_ROOT` (`api-error-coverage.test.ts:30,43`) |

**Not run:** no `next build`; no Playwright; no browser render of `/analytics/product` (no web-app
render harness exists — loop 87 says so too). No `curl`/`wget` (deny-listed; not worked around), so
neither `alerts-check.sh` nor any route was exercised over HTTP. No production host, GitHub secrets,
variables or the external reverse proxy were inspected; §4 traces the committed files only. Every
statement below about what Prisma or the Hostinger action does at runtime is marked *derived*.

---

## 1. Lead

**Loop 85 did what MR-041 asked, the right way. The repo-side half of #256 is done, it travels by
the same mechanism as every other production variable, and its residual was stated as a property.
That is the first time the practice has been applied as designed on the class it was written for.**

**Loop 86 is the window's headline, and it is the MR-041 headline again one level up.** The loop
declared that "only reading each enclosing block got it right" — and its count is still wrong: it
converted **15** body-parse sites in **13** files and reports "13 sites, 12 routes" (§3.1). More
consequentially, it merged #254, whose row text ends *"Class worth checking once: any other route
that can 500 on malformed input now misreports it the same way"*, and then stated its residual over
**bodies only**. The busiest endpoint in the product still turns a malformed query string into a
reported 500 (`/api/workflows?dir=x`, `workflows/route.ts:316,388`, *derived*), and `/api/upload`
turns a non-multipart body into a reported 500 that also returns the raw `err.message` to the client
(`upload/route.ts:48,272-276`). The commit is titled *"a client's mistake is not a server failure"*;
the CHANGELOG's "Known gap" names only the wrong-shape JSON case. The residual was a property — the
wrong one, narrowed to what the helper fixes.

**Loop 87's module is honest; its residual missed the line beside the one it fixed.**
`computeFunnel` still returns `rate: 0` when the previous stage has no users
(`analytics/events/route.ts:259`) — an absence rendered as 0%, the exact thing the new module's own
docstring forbids (*"no views is not 0%"*, `upgrade-prompt-by-location.ts:21-22`).

**And this review must correct MR-041.** MR-041 told the coordinator to date `iter NNN` rows with
"MR-039's convention: iter 001 ≈ loop 1". That convention is false: iteration numbering ran to 098
(`ITERATION_LOG.md:1688`, 2026-06-26) before loop numbering restarted on 2026-09-14
(`ITERATION_LOG.md:1663`). #8 and #16 were ~180 cycles old at close, not 82. The validator now prints
a number MR-041 recommended and that is wrong by roughly half.

---

## 2. Q1 — Re-run the claims; is the validator's newest logic right?

### 2.1 The numbers

All three reconcile (table). Pool: 107 at MR-041 → 108 (#256 reopened) → 106 now: loop 85 +1 −1,
loop 86 +1 −2, loop 87 −1. Net −1 across three counted loops.

### 2.2 The validator

| Change | Verdict |
|---|---|
| **Last-match closure** (`b64c35b`, `validate-backlog.mjs:319-320`) | **Sound.** Closure notes are appended; #256 now dates from loop 85 (age 4), #109 from 63. Checked: only #256 and #109 carry more than one match, both reopen-then-close, as the commit says. Correct, and found by the coordinator, not by a review. |
| **`iter NNN` birth dating** (`birthLoop`, `:303-309`) | **Parses correctly, maps wrongly.** It reads `iter 001` as loop 1. Iteration and loop are different counters; the second restarted at 1 after iteration 098. Only #8 and #16 are dated this way today, so the **median is unaffected (4 either way)**, but **max/all-time max 82 is understated by ~100**. The regex also reads `iter` anywhere in the *status* cell, so any future struck row whose status cites an iteration ("re-scoped at iter 064") would be dated from that citation. Not happening today (checked: 0 rows); latent. |
| **Oldest row's age** (MR-041 §2.2 recommendation; `bfc270d` message: *"the oldest open row's age printed"*) | **Not delivered for the row it exists for.** The age suffix is printed only when the oldest row is datable (`:337`). #9's birth is `—` and status `proposed`, so the line reads `#9 (proposed)` — no age — exactly as MR-041 complained. The commit message overstates. |
| Exclude `SUPERSEDED`/`DEFERRED` from "oldest" (MR-041 §2.2) | **Not applied.** `BLOCKED_RE = /blocked\|awaiting\s+CEO/i` (`:290`). Harmless today (#9 is genuinely open), unrecorded as declined. |

**Recommendation (tooling, in the commit that records this review):** map `iter NNN` to
`NNN − 98 − 1` on a shared axis (or simply print iteration-era ages as `≥ 98 + closing loop` and
label them), restrict the `iter` match to the birth cell or to `new (iter NNN)` / `born iter NNN`
forms, and print `#9 (no birth date — filed before iteration 001's format)` rather than its status.
Correct MR-041 §2.2 and §5.2 item 1's convention in the MR-041 recording entry by a note, not a
rewrite.

---

## 3. Q2 — Loop 86: `readJsonBody`, the trap routes, and the pass-through

### 3.1 The count, a third time

Before `7f8b60d`: 35 `req|request.json()` calls in `app/**/route.ts`. After: 20 (8 `.catch`, 12 on
the allowlist). **15 sites in 13 files were converted**, every one previously bare
(`git show 7f8b60d`: `auth/signup`, `insights/[id]`, `keys`, `portfolios` ×1, `portfolios/[id]`,
`portfolios/[id]/workflows` ×2, `tags`, `tags/[id]`, `teams`, `teams/[id]/invite`,
`teams/[id]/members`, `workflows/[id]`, `workflows/[id]/share` ×2). The log and row say "13 sites,
12 routes". Each of the 15 previously reached a reported 500 on `{not json` — through
`withApiRoute` or through its own catch. The *method* was right this time; the arithmetic was not
re-checked against the diff it produced. The loop's "both earlier numbers were wrong" is true; so is
the third.

### 3.2 Allowlisted sites — reasons checked one by one

All 12 reasons are true as stated: four fall back on any throw (`admin/alerts:70-77`,
`admin/email-test:56-61`, `admin/normalize-emails:134-139`, `agent-intelligence/portfolio:41-48` —
the null-body `TypeError` is caught by the same `catch`), seven return 400 from a parse-only `try`,
and `analytics/events` POST answers 200 `ok:false`. The guard's `BARE` regex only sees `req`/`request`
receivers; checked: no route uses another name. **Sound.**

### 3.3 `if (err instanceof Response) return err` and the wrapper pass-through

- **The six placements** (`signup:121`, `teams:139`, `invite:253`, `members:155`, `share:170,208`):
  the only things that throw a `Response` anywhere in `src` are a 400 and a 403 (table). Nothing in
  those `try` blocks calls `requireFeature`. **None can return a Response that should have been a
  500 today.**
- **The wrapper** (`with-api-route.ts:75`) passes through *any* thrown `Response`, including a 5xx,
  unreported and before the build-phase re-throw. No 5xx `Response` is thrown today, so nothing is
  hidden now. It is the same latent shape MR-041 found in `requireFeature`, inverted: a future helper
  that throws `NextResponse.json(..., { status: 503 })` would produce a real server failure the alert
  never sees. **One condition closes it:** pass through only `status < 500`; for ≥ 500, report with
  that status and return it.

### 3.4 Remaining paths where client input yields a reported 5xx (the class the loop names)

| Path | Mechanism | Status |
|---|---|---|
| `GET /api/workflows?dir=<anything but asc/desc>` | `sortDir` is a bare cast (`workflows/route.ts:316`) into `orderBy` (`:388`); no local `try`, so the Prisma validation throw reaches the wrapper → reported 500 | *derived*, not executed. The dashboard's main data route. |
| `GET /api/workflows?minSteps=abc` (and `maxSteps`) | `parseInt` → `NaN` (`:328-329`) into an `Int` filter (`:367-368`) | *derived*; Prisma's handling of `NaN` for `Int` not run |
| `POST /api/upload` with a non-multipart or malformed body | `req.formData()` throws (`upload/route.ts:48`) → outer catch reports 500 **and returns `detail: err.message`** (`:272-276`) — the message leak `with-api-route.ts:16-18` exists to prevent | read from code |
| Well-formed JSON of the wrong shape | filed as #261 | filed |

**Verdict on Q2:** the helper, the trap fixes and the allowlist are correct for request **bodies
parsed as JSON**. The class the loop claimed closed — client input reported as server failure — is
not closed, and #254's own text asked for exactly this check. File one row (§7).

---

## 4. Q3 — Loop 85's deploy change

### 4.1 Does the variable reach the container the way existing ones do?

**Yes, by the same mechanism, end to end as committed:** `deploy.yml:152-154` adds three lines to the
`environment-variables` block of `hostinger/deploy-on-vps@v2`, alongside `SMTP_PASSWORD`, Stripe and
`TRUSTED_PROXY_HOPS`; `compose.hostinger.yaml:84-86` interpolates them into the `web` service with
the same `${VAR:-}` pattern; `deploy.yml:131` deploys exactly that compose file. Every variable the
alert path reads (`alerts/check/route.ts:33`, `notifications.ts:30,36`, `email.ts` SMTP/Resend) is now
provided. The residual "3 → 0" is a property and is true. What the action does with the block on the
VPS is third-party and not inspectable here.

Two things the residual does not cover, and the entry should say:

1. **Setting the secret does nothing until the next deploy.** The env is written at deploy time; the
   CEO action list in the #256 closure omits "then re-run the deploy".
2. **"Provided" is not "delivered."** `sendSlackAlert` never checks `res.ok`
   (`notifications.ts:54-60`) — a revoked webhook returns 4xx, `fetch` resolves, nothing is logged;
   `Promise.allSettled` swallows the rest. MR-041 §4.1(3) said this; it was not filed (§6).

### 4.2 Secret exposure (public repo)

- Triggers are `push` to `main`/`feature/recorder-v2` and `workflow_dispatch` (`deploy.yml:3-8`);
  `alerts-check.yml` is `schedule`/`workflow_dispatch`. No `pull_request` path exposes secrets to
  forks. `SLACK_ALERTS_WEBHOOK_URL` is correctly a *secret* (it is a credential); `ALERT_EMAIL_TO` is a
  variable — not secret, acceptable.
- **The real exposure is character set, not leakage.** `deploy.yml:118-124` records that the action
  interpolates this block into a shell script and that `` ` ``, `${…}` and `(` broke a deploy. A
  `CRON_SECRET` containing shell metacharacters would be mangled on the server but used verbatim by
  `alerts-check.sh` — a permanent hourly 401 that reads as "wrong secret". Loop 82 escaped `"`/`\` on
  the curl side; nothing constrains the deploy side. (Also unexplained: lines 138-139 of the same block
  contain `(` inside `#` comments and predate the 2026-08-18 fix, so the recorded mechanism is not
  fully understood.) **Recommendation:** the CEO instruction should say `openssl rand -hex 32`.

### 4.3 Is the 503 wording honest?

**Yes, and the reasoning is the window's best piece of judgement:** the coordinator rejected an agent
message that would have labelled every proxy 503 as a config gap. One refinement: whether *this*
proxy answers 503, 502 or 404 for a down app is unknown (the proxy lives outside the repo,
`compose.hostinger.yaml:194-198`); the hedge covers it.

**But the stated reason for not building "no channel configured" is false.** The entry says it
*"needs the response body"*. It does not: the loop had just encoded "server has no `CRON_SECRET`" in a
status code; "server has no channel" can be encoded the same way (e.g. 503 with a distinct
`alerts-check.sh` branch, or 424). The constraint recorded is not the real one, and the residual gap
— a 200 that delivers to nobody — is recorded only in prose.

---

## 5. Q4 — Loop 87's per-location breakdown

| Question | Finding |
|---|---|
| **Units** | Declared: events, not users (`upgrade-prompt-by-location.ts:12-15`); the aggregate funnel above it counts users (`route.ts:241-250`). Correct and documented in code; **the page labels neither** — two adjacent tables, two units, one heading style. |
| **"Repeat exposure is defined by `shouldEmitPromptView`"** (`:14-15`) | **False for one of the four surfaces.** `teams/page.tsx:77` emits `upgrade_prompt_viewed` directly, once per failed create — #252(2). `teams_create` views are inflated and its clicks-per-view understated. The table carries no caveat. |
| **Location normalisation** | Trim only; non-string/blank → counted in `missingLocation*`, never dropped. Case-sensitive. **Sound.** Locations in code: `teams_create`, `dashboard_v2_health_gate`, the quota chip's `promptLocation`, `upgrade_button` — views and clicks pair on the first three (checked; agrees with the loop's correction of its agent). |
| **"Not recorded by design" for `upgrade_button`** | **True.** `UpgradeButton.tsx:47` is its only emitter; `UpgradeButton` is rendered only by `PricingCards` (`PricingCards.tsx:188`), which is rendered only on `/pricing` (`account/page.tsx` mentions it in a comment only, `:361`). `upgrade-prompt.ts:30-37` documents the exclusion. Only signed-in clicks are tracked (signed-out render a plain `Link`). |
| **Residual "clamped or suppressed rates, 2 → 0"** | **3 → 1.** `rate = prevCount > 0 ? … : 0` (`route.ts:259`) renders a stage after an empty stage as **0%**, and the new "↑ N more users than the step above (0%)" line prints that 0. |

**Verdict:** the module is honest and the label is true. The residual was narrowed to the two
symptoms the row named, not the property ("a rate the page shows is a measured rate").

---

## 6. Q5 + Q6 — Practices, and what the window got wrong

### 6.1 Practices

| Loop | Residual stated as property, by reading code? | Delegation by the MR-040 test | Filed vs prose |
|---|---|---|---|
| 85 | **Yes** — "variables the alert path reads that the deploy does not provide, 3 → 0". True. | `devops-engineer` "ran the suite, typecheck, YAML, `docker compose config`, stub" — real **as logged**; agent transcripts are not in the repo, so not verifiable here. | #260 filed. **"No channel → invisible" kept in prose, with a wrong reason.** |
| 86 | **Property, wrong scope, wrong count** — bodies only (#254 asked for the class); 13 vs 15. | `backend-engineer` incl. mutation check — real as logged. | #261 filed. **#254's unbounded event load "noted in #261's context"** — a distinct defect parked in another row's prose. |
| 87 | Property, narrowed to the two named symptoms; misses `route.ts:259`. | `frontend-engineer` — real as logged; the coordinator corrected one agent claim by reading callers. | None needed beyond the above. |
| MR-041 recording | — | — | **MR-041 §4.1(3) (delivery failures swallowed) and §6 (#9 re-scope) not applied, not declined.** |

Three consecutive "real rotations" is a genuine change from the nine-loop coordinator streak MR-040
measured. It is also, by construction, self-reported. **Recommendation:** each delegated loop's
entry quotes one line of the agent's own validation output (test count + exit code) so the claim is
checkable against the coordinator's re-run.

### 6.2 What the window got wrong

1. **MR-041 §2.2 (this reviewer's predecessor) and `bfc270d`** — "iter 001 ≈ loop 1". False; ~98
   iterations precede loop 1. Max age 82 is understated by about half. §2.2.
2. **`bfc270d` message** — *"the oldest open row's age printed"*. Not for #9. §2.2.
3. **Loop 86, entry and #258 closure** — "13 sites / 12 routes → 0"; the diff converts 15 / 13.
4. **Loop 86, commit title, CHANGELOG** — "a client's mistake is not a server failure" while query
   parameters (`/api/workflows`) and multipart (`/api/upload`, which also leaks `err.message`) still
   report 500. #254's "class worth checking once" was merged and not checked. §3.4.
5. **Loop 86** — "Six routes" are six handlers in five files. Minor.
6. **Loop 85** — "surfacing no channel needs the response body". It needs a status code. §4.3.
7. **Loop 85, #256 closure CEO action** — omits that a redeploy is required after setting the secret,
   and the secret's character set. §4.1-4.2.
8. **#256's Area cell** reads `web-app / analytics`; the loop logged `infra / deploy`. The saturation
   tally reads the log; the backlog says otherwise. Pick one.
9. **Loop 87** — residual "2 → 0"; `route.ts:259` still renders an empty denominator as 0%. And the
   module docstring's claim that `shouldEmitPromptView` governs every view. §5.
10. **Nothing to correct:** the Mode 3 commit `3f7465a`. It replaced a non-discriminating check with
    one that can fail (17 + `llms.txt` still prerender), found a defect in its own guard by widening
    it, and mutation-checked the form MR-041 said was invisible. `b64c35b` likewise — a validator bug
    found by the coordinator, unprompted.

---

## 7. Next pick (loop 88)

**Policy.** Pool 106 > 8 → Follow-Up Debt Policy clause 6: `burn-down`. Areas: 83 api, 84 a11y,
85 infra, 86 api, 87 analytics — no Area at 3 of 5, no saturation penalty, no three-consecutive run.
No release blockers open. Extension untouched 44 loops (#216 CEO-blocked).

**File first (one row, from §3.4):** *"Client input still reaches a reported 500 outside JSON bodies:
`/api/workflows` passes `?dir=` unvalidated into `orderBy` and `NaN` from `?minSteps/maxSteps` into an
Int filter; `/api/upload` turns a non-multipart body into a 500 and returns `err.message`. Residual
property: request inputs (query, multipart, JSON) that reach a 5xx without a server fault."*
Suggested I4 A5 L3 C4 E2 R1 = **13**. Born L87 (found reviewing loop 86).

| Row | Score | Notes |
|---|---|---|
| **#9 (re-scoped per MR-041 §6)** | 11 → ~13 re-scored | **Oldest open non-blocked row.** Re-scope to "the wrapper's `[api] unhandled error` line carries endpoint, method, a request id and the user id (not email); same id on the 500 response header so a user report can be joined to the log". One file, one guard. Loop 83 showed the oldest row is where the leverage was; this is the same shape. Area `observability` — fresh. |
| New row (client input → 5xx, non-body) | 13 | Finishes #254's class. Area api (86 was api; no rule breached). Picking a row filed one loop earlier is the pattern MR-040 warned about; take it at 89. |
| #255 | 11 | Workflow-map labels 1.08:1 in the default theme; MR-040's pick, skipped four times. Highest impact of the a11y rows. |
| #250 | 10 | Its item (1) — the activation alert is permanently green — sits on the alert path loop 85 just made able to reach a person. Re-score impact now that delivery is live. |
| #259 | 11 | Bounded; finish the brand-400 class. |
| #261, #260, #249, #251, #252 | 9-10 | #260 needs a CEO/ops fact (which compose files are live) before it is a loop. |

**Pick: #9, re-scoped and re-scored in the MR-042 recording commit** (state the new I/A/L/C/E/R; the
re-score is MR-041's recommendation, not the selecting loop's). Validation must carry a property
residual: *"exception paths in `withApiRoute` whose log line cannot be joined to a request: 1 → 0"*,
and a test that the user id appears and the email does not. If the re-score is not accepted, take
#255 on impact among the 11s.

**Also small, no loop or folded into the above:** `withApiRoute` passes through only `status < 500`
(§3.3); `computeFunnel` returns `null`, not 0, for an empty denominator (§5); validator fixes (§2.2).

---

## 8. Pattern — what this window adds

1. **The residual practice moved from tokens to properties, and the property is now chosen by the
   fix.** Loop 85 picked the property the row was about. Loops 86 and 87 picked the property their
   change could make zero — "malformed *JSON body*", "*clamped* rates" — one notch narrower than the
   class named in the row. The test that would have caught both: *state the residual from the row's
   text before reading the diff.*
2. **Counts are still not re-derived from the diff.** Three counts of one defect in three entries,
   each correcting the last, the third still wrong. A count in a closure should be reproducible from
   `git show`; say how.
3. **Reasons for not building are recorded without being checked.** "Needs the response body" was
   accepted because it sounded like the public-repo rule. It is the "Noted, not filed" hypothetical of
   MR-041 §8.4 in another form: a claim about the code the code can answer.
4. **Reviews are instruments too.** MR-041 installed a dating convention that halves the age it was
   meant to expose. The coordinator applied it faithfully. A review recommendation that sets a number
   needs the same "does it measure the case it exists for" check as the code.

None needs a new rule. (1) and (2) are clarifications of the `residual:` practice; (3) extends
MR-041 §8.4 to "not built because …"; (4) is this correction.

---

## 9. CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **#256 alert delivery** | Repo side **done** (loop 85). Not live. | **In order:** set Actions secret `CRON_SECRET` (one secret now serves both the deploy and the check — generate with `openssl rand -hex 32`, no shell metacharacters); set variable `ALERTS_CHECK_URL`; set **one** channel (`ALERT_EMAIL_TO` variable — SMTP is already wired — or `SLACK_ALERTS_WEBHOOK_URL` secret); **then re-run the deploy** — nothing reaches the container until it does. Accept the hourly failure until then (recommended). |
| **#260** stray compose files | Filed loop 85. | Needs one fact only ops has: which of `compose.hostinger-deploy.yaml`, `hostinger-paste.yaml`, `compose.yaml` are still used to deploy. Then it is a deletion loop. |
| **#216** extension untouched | `871e29a`, **44 loops**, CEO-blocked. **Eighth ask.** | Nothing. |
| **#57 criteria 1-3** | Not decision-grade (#249, #251; chip-click net bias unmeasured). | Loop 87 makes the per-location upgrade comparison possible; it is not a #57 criterion. Definitions still open. |
| **#225** `TRUSTED_PROXY_HOPS` | Forwarded, defaults `0` (`deploy.yml:157`). | Unchanged. |
| **#212** E2E deploy gating | Waits on one green `real-extension` run. | Unchanged. |
| **#190 / #193** CLAUDE.md edits | Awaiting since MR-020/021. | Unchanged — twenty-two reviews. Approve, reject or strike. |
| **#191** billing | Awaiting since loop 7. | Unchanged. |
| ~~Selection vocabulary~~ | Resolved in practice: loops 85-87 labelled `burn-down`. | **Closed.** Retiring clause 6 remains available as a CEO choice; no longer a labelling error. |

---

## 10. Verdict

All three claimed numbers reconcile. Loop 85 closed the gap MR-041 found with the right residual,
the right mechanism and an honest refusal to mislabel a 503; the Mode 3 correction is a model of
how to answer a review. Delegation is now real by the log's own account, three loops running.

But the window's flagship claim — client mistakes are no longer server failures — is true for one
input channel out of three, on a row whose text asked for the class. Its count is wrong a third time.
Loop 87's residual missed the line beside the one it fixed. A reason for not building was false. And
the dating convention MR-041 handed the validator understates the oldest closures by half.

Apply in the recording commit: the validator mapping and the oldest-row label (§2.2); #9 re-scope and
re-score; the new client-input row; corrections to §6.2 items 1-9 as notes; a row or a decline for
MR-041 §4.1(3) delivery failures. Take #9 at loop 88.
