# MR-049 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 107-109, 2026-10-02. Commits `0e2d134` (loop 107, #289), `6fcde8b` (loop 108, #288),
`ccfb633` (loop 109, #282). Row filed in the window: #290.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `ccfb633`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node is v24; CI pins Node 20.

**Validation run for this review — all executed at `ccfb633`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && pnpm exec vitest run`, **×3** | 3846 (loop 109) | **3 of 3: 212 files, 3846 passed, 0 failed, 0 skipped, exit 0** (13.2-14.0 s) | matches; **no intermittent failure in 3 runs**. The stack traces in the output are logged errors from error-path tests, not failures |
| workspace `pnpm test`, **×2** | not claimed | **2 of 2: 272 files, 5635 passed, exit 0**. No Prisma napi crash this time (MR-048 saw 1 in 3) | reconciles: 5589 + 9 + 6 + 31 = 5635; web-app 3800 + 46 = 3846 |
| `pnpm -r typecheck` | 0 | **exit 0**, "Scope: 11 of 12 workspace projects", 0 lines containing `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **283 rows, 169 struck, 19/19 budget, clean, exit 0; open 114**; oldest open non-blocked #13 (~207 loops) | reconciles: 114 at MR-048 + #288 + #289 filed at the recording = 116; −#289 +#290 −#288 −#282 = **114** |
| `account-throttle.ts`, executed in isolation | backoff, cap, "refused attempts do not extend", "memory bounded" | §3: a copy in scratch with only the `@/` import inlined, run under `node --experimental-strip-types` | schedule and non-extension **hold**; **the memory bound and the guessing limit do not** (§3.3) |
| audit log timeline | delegation | `.claude/audit/tool-events.jsonl` 15:01-15:25Z read in full | §0 |

**Not run:** Playwright (so the e2e auth setup was read, not run — §3.6), no `next build`, no Docker
image build, no busybox shell, no dev server, no HTTP request to any route, no GitHub Actions run, no
VPS access, no production data, no secret values. No `curl`/`wget`. No timing measurements of any
route (the oracles in §3.5 are read from the code).

**Delegation evidence — and a correction to MR-048.** The audit log has no session or agent id, and it
**does record sub-agent tool calls**: this review is a sub-agent, and its own commands appear in it
(e.g. 15:24:56Z, `wc -l docs/meta/MR_048_META_REVIEW.md`). So MR-048's reading — "no main-session
write of these files … consistent with real sub-agents" — was built on a premise that is false: the
log does not separate main session from sub-agents, so the absence of a write is not evidence of
delegation and its presence is not evidence against. What the log does show is a single uninterrupted
stream per loop:

| Loop | First read of the row | Module written | Commit | Elapsed |
|---|---|---|---|---|
| 107 | 15:01:30Z | 15:02:14Z (`cat > lib/rate-limit/account-throttle.ts`, 139 lines, **44 s after the first read of `auth.ts`**) | 15:06:38Z | ~5 min |
| 108 | 15:07:03Z | 15:07:41Z (`validate-secrets.sh`) | 15:18:10Z | ~11 min |
| 109 | 15:18:33Z | 15:19:15Z (`cron-auth.ts`) | 15:24:36Z | ~6 min |

Each log entry says a named agent ran the suite and the coordinator "re-ran" it. Loop 107 has one
full-suite run in its window (15:05:29Z) plus two chained ones at 15:03:24Z/15:04:20Z; nothing
distinguishes "the agent's run" from "my re-run". **Attribution in this window is unverifiable, and
"a real rotation" is asserted three times without evidence either way.** Recommend: stop asserting
"real"; cite the timestamp range of the work, which the log does support.

---

## 1. Lead

**Loop 107's throttle can be switched off by other traffic. Its eviction rule lets an attacker who
locks ~50,000 junk addresses stop any new address — including an admin's — from ever counting past one
failure; in an executed copy of the module, 905 of 1,000 sequential guesses at a fresh address were
evaluated after saturation, against 10 without it. The same window told the CEO, and the public
CHANGELOG, that "responses never reveal whether an account exists", which the code's own row (#290)
contradicts.**

Three things the code says that the window's summaries do not:

1. **The bound is not a bound, and the limit is not a limit (§3.3).** `trim()` evicts the oldest
   *unlocked* entry when the map is full (`account-throttle.ts:69-74`). Locked entries are never
   evicted. A key on its first failure is unlocked, so once the map is full of locked junk, that key
   is the only eviction candidate, and it is evicted on its own next failure (`:104` then re-starts
   it at 1). Junk addresses are cheap: a non-existent account costs one or two `findUnique` calls and
   **no bcrypt** (`auth.ts:50-52`). Rotating `X-Forwarded-For` defeats the per-IP limit (`auth.ts:38`),
   which is the premise loop 107 was built on. Upkeep is about one request per junk address per
   15 minutes (~56/s). "Memory is bounded by MAX_ENTRIES" (`:35`) is also false in this state: the
   locked entries are retained (49,999 of 60,000 kept in my run), and every failure at the cap scans
   the whole map twice (`:70-74`; ~1.3 ms per call measured).
2. **Concurrency defeats the backoff anyway (§3.2).** The check (`auth.ts:47`) happens before the
   awaited bcrypt compare (`:55`), and the failure is recorded after it. Every request that arrives
   while the address is unlocked is evaluated: 200 parallel attempts in my run, all 200 evaluated. "About
   four guesses an hour" (`account-throttle.ts:22-23`, #290) holds for a sequential guesser only.
3. **The shell-rewrite class was closed for one secret out of about twenty (§4.3).** Loop 108 restricts
   `NEXTAUTH_SECRET`. The same shell-evaluated block carries `SMTP_PASSWORD` (`deploy.yml:161`),
   `CRON_SECRET` (`:166`), `UMAMI_DB_PASSWORD`, `STRIPE_WEBHOOK_SECRET` and others. `SMTP_PASSWORD` is a
   human-chosen mailbox password, the likeliest of all to contain `$`. Nothing names this residual.

Nothing in the window needs reverting. Loop 107 is strictly better than no per-account throttle for an
unsophisticated guesser, and loops 108 and 109 are correct as built.

---

## 2. Q1 — Re-run the claims

All numbers reproduce (table). Web-app 3846 three times running; workspace 5635 twice; typecheck 0;
validator clean at 114 open. The window closed 3 rows and created 1 (plus the 2 filed at the MR-048
recording).

**Flakes.** None in 3 web-app or 2 workspace runs. MR-048's Prisma napi crash did not recur in 2 runs.
That is not evidence it is gone; it is evidence of nothing at n=2.

---

## 3. Q2 — Loop 107: the per-account throttle

### 3.1 Backoff math and cap — correct, with one wording problem

Executed schedule (failure number : lock seconds): `1:0 2:0 3:0 4:0 5:30 6:60 7:120 8:240 9:480
10:900 11:900 12:900`. The formula `30 s × 2^(n−5)` capped at 900 s (`:107`) does what it says. The
**5th failure itself locks**: five attempts are free and the 6th waits. The header (`:16-17`) says "the
first 5 consecutive failures are not delayed; failure n ≥ 5 refuses further attempts", which is the
same thing said twice in tension. The CEO line ("five free failures") is correct.

### 3.2 "Refused attempts do not extend the lock" — true sequentially, irrelevant in parallel

True: the refusal returns at `auth.ts:47` before `recordLoginFailure`, and 100 refused checks left
`retryAfterSeconds` unchanged in my run. But the decision is a check-then-await-then-record sequence
with no reservation: any number of requests that pass the check before the first failure is recorded
are all evaluated. At each unlock an attacker sends a burst; its size is limited only by server CPU
for bcrypt (cost 12, `signup/route.ts:79`). The test file has no concurrency case
(`auth.login-throttle.test.ts:60-106`).

### 3.3 Memory abuse and eviction — the finding

Executed, scratch copy of the module (logic unchanged):

| Scenario | Result |
|---|---|
| CEO address 4 failures → 50,000 junk failures → CEO 5th failure | **not locked** — the CEO's record was evicted and the count reset (*the question asked*: yes, an attacker can evict the CEO's entry) |
| 50,000 junk addresses × 10 failures, then 1,000 sequential guesses at a fresh address over 1,000 s | **905 evaluated**; the control without saturation: **10**. The 95 refused came after the junk locks expired at 900 s; the attacker refreshes them to prevent that |
| 60,000 addresses × 5 failures | **49,999 locked records retained**; the map does not shrink below the cap while entries are locked |
| one failure when over the cap | **~1.3 ms** (two full scans per call) |

The two harms are different. Eviction of an *unlocked* record resets an attacker's own count against
the CEO (cost: ~50,000 cheap requests per 4 guesses — expensive, minor). **Saturation with locked
records disables counting for every address not already locked** — the throttle stops existing.

Mitigation already on file, unnoticed: #290(2)'s dummy-hash compare for non-existent accounts would
make each junk failure cost a bcrypt, which raises the upkeep to ~56 bcrypt/s — roughly 14 CPU-seconds
per second at cost 12. That is a side effect, not a fix. The fix is structural: never evict the key
being written, and never let a full table stop counting (a fixed-size counter array keyed by a hash of
the normalised address cannot be evicted; a collision only over-throttles). #225 (`TRUSTED_PROXY_HOPS`)
remains the other half: with a correct hop count, saturation needs real addresses.

### 3.4 Before or after bcrypt — before, so a refusal is cheap

`auth.ts:47` refuses before the lookup and the compare. Refused attempts cost a Map lookup. The DoS
cost of the throttle itself is the at-cap scan (§3.3), not bcrypt.

### 3.5 Enumeration — the throttle is indistinguishable; the routes are not

The throttle itself is fair: existing and non-existing addresses are counted identically
(`auth.ts:50-52, 56-58`; forgot-password counts before the lookup, `route.ts:53` then `:55-56`), and
a refusal is `return null` / the normal success body. But both routes still leak by **time**:

- Login: a non-existent account skips bcrypt (`auth.ts:50-52`). In #290(2).
- **Forgot-password: an existing account awaits two DB writes and `sendEmail` (`route.ts:79`), up to
  the 20 s SMTP deadline; a non-existent one returns at `:56`.** That oracle is seconds wide, far
  louder than bcrypt's, and is not in #290. The new throttle makes it *quieter* (after 3 requests per
  hour both answer fast), which nobody claimed.

So "responses never reveal whether an account exists" (`CHANGELOG.md`, `SYSTEM_HEALTH`, loop 107) is
true of bodies and statuses and false of the responses. The commit message is careful ("Throttled
responses are indistinguishable"); the CEO-facing lines dropped the qualifier.

### 3.6 No `NODE_ENV=test` bypass — does Playwright break? No, by reading (not run)

Playwright runs `next dev` with `NODE_ENV: 'test'` (`playwright.config.ts:101-107`), `workers: 1`. The
only wrong-password attempt is `wrong@example.com` once (`e2e/public/auth-flow.spec.ts:26-31`; ≤3 with
CI retries), a different address from every setup user. Setup logins (`auth.setup.ts`,
`free-auth.setup.ts`, `smoke/auth.smoke.setup.ts`) succeed, which clears the record. Locally,
`reuseExistingServer` keeps the map across runs, so `wrong@example.com` will be locked after five local
runs — and that test still passes, because it expects an error. **One latent trap:** any future e2e
test that fails the *seeded* user's password five times will lock out every later test for 30 s+ in
that server process. Worth one line in the e2e README.

---

## 4. Q3 — Loop 108: charset, `AUTH_SECRET`, CI guard, chain test

### 4.1 Refusing to start when `AUTH_SECRET` is set — safe

Nothing sets it: the runner stage's `ENV`s are `NODE_ENV`, `NEXT_TELEMETRY_DISABLED`,
`AUTH_TRUST_HOST`, `PORT`, `DATA_DIR`, `DATABASE_URL`, `UPLOAD_DIR` (`Dockerfile:148-154`); the
builder's `NEXTAUTH_SECRET=build-time-placeholder` (`:73`) does not carry to the runner; `node:20-alpine`
sets no auth variables; `compose.hostinger.yaml` lists its environment explicitly with no `env_file`;
the deploy block (`deploy.yml:147-200`) has no `AUTH_SECRET`; `git grep AUTH_SECRET` outside
`NEXTAUTH_SECRET` finds only the new guard and its tests. NextAuth reads `process.env` at runtime and
does not write it. The one way it could appear is a variable saved in the Hostinger project's own
settings (MR-047 §3.1) — and then refusing is the right answer. **Safe.**

### 4.2 Charset applied consistently — yes, by construction

One script, run on the runner (`deploy.yml:121-124`) and in the container (`docker-start.sh:13`,
`Dockerfile:110`). `LC_ALL=C` is exported inside the child `sh`, so it does not leak into
`start.sh`. A useful unstated side effect: the three HMAC workflows (`email-test.yml:35`,
`mint-reset-link.yml:42`, `normalize-emails.yml:40`) sign with the GitHub-held value; with the
charset rule, that value and the container's are now guaranteed equal.

**What the CEO line understates:** the rule rejects everything outside `[A-Za-z0-9+/=_-]`, including
`@ . ! % ~ : ,` — not only "`$`, quotes, backticks, backslashes or spaces". A hand-typed secret with a
full stop will stop the deploy too. And rotating `NEXTAUTH_SECRET` signs every user out.

**A residual that the rule makes newly sharp:** `build-and-push` pushes `:latest` before the deploy
job validates (`deploy.yml:95-96`, `:104`). MR-048 called that harmless. It is harmless until the rule
rejects a secret that currently works: then the registry holds an image whose start script refuses the
running secret, and any "redeploy/restart project" from the Hostinger panel that pulls (`pull_policy:
always`, `compose.hostinger.yaml:15`) crash-loops the site. A container restart without a pull is safe.

### 4.3 The class is wider than the fix

Every secret in the block passes through the same shell (`deploy.yml:132-137` records it).
`SMTP_PASSWORD` (`:161`), `CRON_SECRET` (`:166`), `UMAMI_DB_PASSWORD`, `STRIPE_WEBHOOK_SECRET`,
`AWS_SECRET_ACCESS_KEY` and the rest are unchecked. Concrete failure: a `$` in the mailbox password
silently breaks all email; a `$` in `CRON_SECRET` makes both alert jobs answer 401 forever. Loop 109's
heartbeat would at least detect the first (424/207). The loop's residual statement ("the action's
source could not be fetched; busybox not run") is honest about *verification* and silent about the
*class*.

### 4.4 Does the chain test exercise `docker-start.sh` or a drifting copy? The real file, truncated

It reads `scripts/docker-start.sh` and `scripts/validate-secrets.sh` from the repo at test time
(`deploy-env-delivery.test.ts:410-411`) and writes them to a temp dir, cutting `docker-start.sh` at the
"Environment validated" line. The content cannot drift. What it does not exercise: the image's names
(`/app/start.sh`, `Dockerfile:109`), the exec-form `$0` (it runs `sh ./docker-start.sh`), busybox
`ash`, and anything after validation. All four were argued correct at MR-048; none is executed. MR-048
asked for exactly this test and got it.

Minor inconsistency: the first executed block treats `CI=false`/`CI=0` as not-CI (`:353`); the chain
block uses raw truthiness (`:407`). Both fail loud rather than skip, so it is harmless. Locally both
blocks ran (0 skipped).

---

## 5. Q4 — Loop 109: heartbeat and `cron-auth.ts`

### 5.1 Auth identical to `alerts/check`? Yes; and `alerts/check` is unchanged in behaviour

`verifyCronBearer` (`cron-auth.ts:21-34`) is the removed block verbatim: unset → `'unconfigured'`
(503, reported), regex `^Bearer\s+(.+)$/i` on the header only, length pre-check then
`crypto.timingSafeEqual`. `check/route.ts:71-90` maps the three results to the same 503 (same log line,
same `reportApiError`), 401 and continue. Order of evaluation is unchanged (secret presence first).
Query-string refusal: tested on both routes (`heartbeat/route.test.ts:77`, `check/route.test.ts:149`).
**Constant-time is preserved by reading, not by test:** replacing `timingSafeEqual` with `===` would
pass every test. That was true before the refactor too.

### 5.2 Is 412 sensible? Defensible, not standard

RFC 9110 §15.5.13 ties 412 to request preconditions (`If-Match` and friends). Here it means "server
configuration missing". It is distinct from 503 ("CRON_SECRET missing") and 424 ("configured but
broken"), and the script maps statuses, not names, so the only cost is a reader of raw logs. Keep it,
but say in the route header that the code is borrowed.

### 5.3 Two behaviours the loop did not state

- **The email leg has no deadline on Resend.** `sendEmailHeartbeat` calls `sendEmail`
  (`notifications.ts:183`); only SMTP has the 20 s deadline (`email.ts:72`). A hung Resend call makes the
  route hang until the script's 40 s `--max-time`, which reports **exit 3, "unreachable or timed out"** —
  a site outage label for an email-provider fault. This is #285(3), and it is now in the alert path.
- **Until alerts are configured, the job fails every day.** Unconfigured → `::error::` exit 2 by design
  (`alerts-heartbeat.yml`, "UNCONFIGURED"). With `alerts-check.yml` hourly, that is 25 red runs a day
  until the CEO sets the secret and variable.

### 5.4 Daily noise — acceptable

One fixed line per channel per day, no data, "no action needed". The 60-day schedule-disable caveat is
stated. **An unstated benefit:** a heartbeat 200 is the first in-repo signal that proves three variables
(`CRON_SECRET`, `SLACK_ALERTS_WEBHOOK_URL`, `ALERT_EMAIL_TO`; `deploy.yml:166-168` →
`compose.hostinger.yaml:87-89`) reached the running app — a partial answer to #281.

---

## 6. Q5 — Practices

| Loop | Env-var mitigation cites delivering line | Producer-per-field | Residual class-scoped | Delegation |
|---|---|---|---|---|
| 107 | n/a | **Yes** for the lookup path (reads `findUserByEmailForLogin`, normalisation shared) | **No.** #290 names lockout, bcrypt timing, per-instance — but not eviction/saturation, concurrency, or the forgot-password timing oracle; the "bounded memory" claim is in code | asserted `security-reviewer`; unverifiable (§0) |
| 108 | **Partly** — the deploy step and container are cited; the action's shell evaluation is cited as inferred (honest) | n/a | **No** — fixed for `NEXTAUTH_SECRET`, silent about the other ~20 secrets in the same block (§4.3) | asserted `devops-engineer`; unverifiable |
| 109 | **No**, and it matters less: the heartbeat's variables are delivered (`deploy.yml:166-168`, `compose.hostinger.yaml:87-89`) but the entry does not say so | n/a | **Yes** for the schedule-disable limit; silent on Resend (§5.3) | asserted `backend-engineer`; unverifiable |

**Prose-only findings this window:** the Resend hang (§5.3) was already prose in #285; loop 109 built
on it without noting it. **Unverified statistics that reached the CEO:** "responses never reveal
whether an account exists" (false by timing), "no longer gives unlimited attempts" (false under
saturation, §3.3). **MR-048's clarification (a)** — recommendations that ride with a fix are copied into
the row — was applied: #288 carried all three MR-047 items, and all three landed. That works.

**MR-048's (b)** — CEO-facing "safe" sentences carry the commit's "not verified" clause — was applied
to loop 108 ("the action's source could not be fetched") and not to loop 107's CHANGELOG line.

---

## 7. Q6 — What the window got wrong

1. **The throttle's memory bound and guessing limit** — false under saturation and concurrency
   (§3.2-3.3). The most serious item: it is the code that answers MR-048's lead finding.
2. **"Responses never reveal whether an account exists"** — public CHANGELOG and SYSTEM_HEALTH; the
   timing oracles are in the code, one of them in the window's own row (§3.5).
3. **Loop 109's selection.** "`saturation-rule` → #282 (10), the top non-security row" — **#277
   (infra/deploy, 11, open) outranks it**, and MR-048 named #277 as the loop-109 candidate. Also,
   "pivot required (107 and 108 were security)" overstates the policy: two in a row forces nothing;
   security at 3 of 5 carries a −2 penalty. The pick was not wrong in value, but the stated rule did not
   produce it.
4. **Loop 108's class scope** — one secret of ~20 (§4.3); and the CEO line lists five forbidden
   characters when the rule forbids every non-base64 one (§4.2).
5. **"A real rotation" × 3** — asserted, not evidenced; and MR-048's evidence reading was wrong (§0).
6. **`AUTHZ_AUDIT_001` still says P1-2 OPEN and P2-2 "OPEN, unchanged"** (`:28, :94, :109, :146`) —
   P1-2 was fixed at `801b5fd` (loop 105), P2-2 changed at `0e2d134`, P3-7 changed again at `6fcde8b`.
   **The fourth review in a row to report this.** It is now a pattern, not an oversight.
7. **Nothing to revert.**

---

## 8. Q7 — Next pick (loop 110)

Pool 114 > 8 → `burn-down`. Last five Areas: 105 security/authz, 106 web-app/a11y, 107 security/authz,
108 security/deploy, 109 infra/monitoring. Security = 3 of 5 → **−2 on security rows**. No Area in 3
consecutive, so no forced pivot.

| Candidate | Score (after penalty) | Notes |
|---|---|---|
| **New #291: per-account throttle can be reset or disabled by other traffic** (I5 A5 L3 C5 E1 R1 = 16) | **14** | Not a row yet. Follow-up of loop 107 (defect in shipped code). Scope: (1) the key being written is never evicted; (2) a full table never stops counting — fixed-size hashed counters, or refuse to evict locked *and* never evict the written key; (3) a concurrency reservation (count the attempt before the compare, refund on success); (4) correct the "bounded" header and the CEO lines. Tests: the three scenarios in §3.3 plus a parallel burst |
| #277 admin badge / dead bootstrap / stale docs | 11 | top non-security row; should have been loop 109 |
| #285 reset links logged / Resend timeout / deadline does not abort | 11 → **9** | now also in the alert path (§5.3) |
| #278 14 undelivered env vars | 10 | infra; CEO-bound in part |
| #249-#252 analytics | 10 | stale (~32 loops); a cluster pick, not a single one |
| #287, #268 a11y | 9 | — |
| #290 lockout / timing oracle | 10 → 8 | add the forgot-password oracle (§3.5); the dummy hash also raises #291's attack cost |
| #270, #265, #275 | 8 | — |
| AUTHZ P2-3 (`teams/route.ts:30`), P2-5 (`analytics/events/route.ts:47`) | — | cold; P2-5 feeds admin dashboards |

**Pick: file #291 and take it at loop 110** (`burn-down`; score 14 after the penalty). It is the
highest-scoring row once filed, it fixes code shipped two loops ago, and it voids a CEO-facing claim.
**Then #277 at loop 111** (non-security, breaks the security run).

---

## 9. Pattern — what this window adds

1. **A limit is a claim about the adversary's cheapest path.** Loop 107 modelled the attacker who
   guesses one address sequentially. The cheapest paths were to make *other* addresses (no bcrypt) and
   to arrive in parallel. Before shipping a limit, name the cheapest way to make it not apply.
2. **A fix to one member of a class must say the class's size.** Loop 108 fixed 1 of ~20 secrets
   behind the same shell. The residual statement should have read "N other secrets pass through the same
   block; unchecked".
3. **The audit trail cannot say who did the work.** Three reviews have reasoned about delegation from a
   log that has no actor field. Either add one (the hook could log `$CLAUDE_AGENT` or equivalent if
   exposed) or stop the inference in both directions.
4. **Status that does not travel to the audit has now failed four times.** A rule is warranted:
   closing a row promoted from an audit updates the audit's status line in the same commit.

No new control-rule change proposed beyond pattern 4's clarification (which mirrors MR-048's
recommendation-into-row clarification that worked).

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Secret charset before the next deploy** | **Check now** | Only `A-Z a-z 0-9 + / = _ -` is accepted — a `.`, `@` or `!` stops the deploy too, not only `$`/quotes/backticks/spaces. Stop is safe (before the server is touched). **If it stops: do not "redeploy" from the Hostinger panel** — `:latest` is already the new image, and a pull would crash-loop on the old secret (§4.2). Regenerate with `openssl rand -hex 32`; rotating signs every user out |
| **Other secrets in the same shell block** (new) | Needs a look | `SMTP_PASSWORD`, `CRON_SECRET`, `UMAMI_DB_PASSWORD` etc. are not checked. If the mailbox password contains `$` or a backtick, email has never worked in production — the heartbeat will show it (424) |
| **Admin-account squat check** | Unchanged — use the case-insensitive query | `WHERE lower(trim(email)) IN (<allowlist>)`, exactly one row per address, created by you |
| **Login throttle trade-off (#290)** | Decision pending | Plus: the throttle can currently be disabled by flooding (#291 recommended). With `TRUSTED_PROXY_HOPS` set correctly (#225), that flood needs real addresses |
| **Prod `isAdmin` users** | Still open | — |
| **Undelivered variable values** (`DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE`) | Unchanged | — |
| **Alerts setup, including the new heartbeat** | Repo side done; not live | Needs `secrets.CRON_SECRET`, `vars.ALERTS_CHECK_URL` (the heartbeat derives its URL), the same `CRON_SECRET` in the container, and at least one channel. **Until then both jobs fail: hourly + daily, ~25 red runs/day.** Once live, expect one "heartbeat — no action needed" message per channel per day; silence means the schedule or the app stopped |
| **#281 delivery test** | Partly answerable now | A heartbeat 200 proves `CRON_SECRET` and the channel variables reached the app |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace error page | Blocked on you | Unchanged |
| **#225** `TRUSTED_PROXY_HOPS` | Defaults `0` | Now load-bearing for both throttles |
| **#216** extension untouched | 66 loops | Unchanged |

---

## 11. Verdict

Every number reproduces at `ccfb633`: web-app 3846 three times, workspace 5635 twice, typecheck 0,
validator clean at 114 open. The `AUTH_SECRET` refusal is safe — nothing in the image, compose or
deploy sets it. The charset rule is applied identically on both hops, and the chain test reads the real
scripts. The `cron-auth.ts` refactor is byte-equivalent in behaviour for `alerts/check`.

The window's error is in loop 107 and is substantive, not narrative: the per-account throttle's
eviction rule lets cheap junk traffic reset it or switch it off, and parallel requests ignore it. Do
next: file and fix #291 (loop 110); add the forgot-password timing oracle to #290; extend loop 108's
class statement to the other secrets in the shell block; correct "never reveal" in CHANGELOG and
SYSTEM_HEALTH; correct the loop-109 selection rationale (#277 outranked #282); update
`AUTHZ_AUDIT_001` P1-2, P2-2 and P3-7 in the same commit as the next authz change; stop asserting "a
real rotation" without a timestamp.

---

### Appendix — reproducing §3.3

Copy `apps/web-app/src/lib/rate-limit/account-throttle.ts` to a scratch directory, replace the
`@/lib/email-normalize` import with `const normalizeEmail = (e: string) => e.toLowerCase().trim();`
(the function's whole body), and run under `node --experimental-strip-types`:

```ts
// saturation: lock 50,000 junk addresses, then guess a fresh address once per second
for (let i = 0; i < 50_000; i++) for (let j = 0; j < 10; j++) recordLoginFailure(`j${i}@x.io`, now);
for (let i = 0; i < 1000; i++) { now += 1000;
  if (checkLoginThrottle(target, now).allowed) { evaluated++; recordLoginFailure(target, now); } }
// evaluated = 905 (control without the junk: 10)
```
