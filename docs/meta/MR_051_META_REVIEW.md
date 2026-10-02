# MR-051 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 113-115, 2026-10-02. Commits `344c50a` (loop 113, #285), `3d58482` (loop 114,
#292), `c0924ef` (loop 115, #293). Rows filed in the window: #294 (loop 113). Rows amended: #53
(loop 115).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `c0924ef`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node v24 on Windows; CI pins Node 20 on Linux.

**Validation run for this review — all executed at `c0924ef`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×5** | 3887, zero crashes (loop 115) | **5 of 5: 216 files, 3887 passed, exit 0** (17-18 s each) | matches |
| root `pnpm test`, **×3** | 5676 (loop 115) | **3 of 3: 276 files, 5676 passed, exit 0** (20-21 s) | matches |
| `pnpm -r typecheck` | 0 | **exit 0**, 0 lines matching `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **287 rows, 174 struck, 19/19 budget, clean, exit 0; open 113**; oldest open non-blocked #13 (~213 loops) | reconciles: 113 (MR-050) + #292 + #293 (filed at MR-050 recording) + #294 − #285 − #292 − #293 = **113** |
| web-app arithmetic | 3860 → 3867 → 3887 → 3887 | +7 (#285) / +20 (#292) / +0 (#293, config only) | reconciles |
| `alert-state.ts`, executed in isolation | "duplicate over loss"; state survives restarts | scratch copy (only the `@/db` and type imports stubbed), `node --experimental-strip-types`, rows built with the analytics POST route's own mapping copied verbatim (`analytics/events/route.ts:47-54`, `:230-236`) | **an anonymous client can silence every alert** (§4.1) |
| Next.js `NODE_ENV` handling | "any other NODE_ENV (production, test, unset)" | read `next@14.2.35` `dist/bin/next:42-60` and `define-env-plugin.js:109` | gate holds — for a different reason than stated (§3.1) |
| nodemailer 9.0.3 error shape | — | read `smtp-connection/index.js:946`, `:1863-1864` | SMTP errors carry `response` and `rejected` recipient addresses (§3.2) |

**My own false negative while running the table:** the first web-app loop printed blank summaries
because I grepped `Tests` in output that still carried ANSI colour codes. Exit codes were 0; the
counts above were re-read after stripping the codes. Same family as loop 114's false alarm (§6.2).

**Not run:** Playwright, `next build`, Docker, any HTTP request to a route (the §4.1 forgery is
executed at the pure-function layer with the route's own record mapping, not over HTTP), GitHub
Actions, VPS, production data, secret values. No `curl`/`wget`. No mutation testing of product files.
I did not reproduce the pre-fix crash rate under `worker_threads` (§5); the loop's before/after
numbers are taken as reported.

---

## 1. Lead

**Loop 114 put alert memory in a table that any anonymous browser can write to. `POST
/api/analytics/events` takes `eventName`, `source` and (with no session) `userId` straight from the
request body with no allowlist (`analytics/events/route.ts:48-53`), the route is outside the
middleware matcher (`middleware.ts:31-38` lists no `/api/*` path) and has no rate limit, and
`loadAlertStates` reads every `alert_notified` row regardless of source (`alert-state.ts:109-113`).
Executed: one forged batch of eight `{"event":"alert_notified","alertId":<id>,"state":"firing"}`
every 23 hours produces 0 notifications over 72 hours for eight alerts that are all firing, against
24 in the control. The forged row is byte-identical to the server's, including `source: "server"`.
The reverse also works: a forged `resolved` row each hour re-pages a firing alert every hour (24 sends
in 24 h, against 1).** Alert ids are in the source of a public repo.

This is the most important finding of the window, and it is two-sided:

1. **The state is forgeable (new in loop 114).** Silence is free, permanent, and indistinguishable
   from "nothing new" — which is exactly what a green hourly run now means (loop 114's own contract
   change). The fix for "pages hourly" created "never pages, on request". MR-050's pattern 1, again.
2. **The inputs were always forgeable (pre-existing, unfiled).** Every query in `computeAlerts` reads
   `AnalyticsEvent` by `eventName` alone (`compute-alerts.ts:45-46`, `:112`, `:116`, `:148`, `:164`,
   `:178`, `:192`). Five forged `upload_failed` rows page a P1 (the new minimum is attacker-reachable);
   forged `workflow_uploaded` rows mask a real upload outage; forged `signup_completed` rows silence
   `no_signups_48h`; forged `api_error` rows page. The anonymous `userId` passthrough
   (`route.ts:48`) also lets anyone attribute events to any user — the activation numerator included.

Neither is in the backlog. `grep` for forgery/spoof/allowlist of event names across
`IMPROVEMENT_BACKLOG.md` finds only the session-secret and `X-Forwarded-For` rows.

Two smaller things the code says that the window's summaries do not:

- **The `NODE_ENV` gate holds because Next inlines `process.env.NODE_ENV` at build time** (§3.1), not
  because of the runtime value the comment lists. A built image always denies.
- **The commit message of loop 115 states as fact what its log calls inferred** (§5.2).

Nothing needs reverting. Loop 113 is correct; loop 115 is correct; loop 114 is correct against the
problem it was given and opens a worse one beside it.

---

## 2. Q1 — Re-run the claims

Every count reproduces (table). No crash in 8 local suite runs, against 2 in 14 before the fix
(MR-048 to MR-050). Combined with the loop's 40 + 15, the fix looks real; 8 more runs here add
little statistically and are reported as such.

Duration: web-app 17-18 s here against 14.5-14.7 s at MR-050 on the same machine — roughly +20%.
Root 20-21 s. Acceptable for a gate whose exit code now means one thing.

---

## 3. Q2 — Loop 113

### 3.1 Is `NODE_ENV === 'development'` the right gate? Yes — for a build-time reason

- `next dev` sets `NODE_ENV` to `development` only if unset; `next start` and `next build` default to
  `production` (`next/dist/bin/next:42,60`). An explicit `NODE_ENV=development next start` warns
  (`:50-57`) but keeps the value.
- **What decides it:** webpack's define plugin replaces `process.env.NODE_ENV` in compiled server code
  with `dev ? "development" : "production"` (`define-env-plugin.js:109`). In a `next build` image the
  check at `email.ts:335` compiles to `false` whatever the container's environment says. Read, not
  built.
- Deploy surfaces all say `production` anyway: `Dockerfile:72,148`, `compose.yaml:27`,
  `compose.hostinger.yaml:23`, `compose.hostinger-deploy.yaml:11`, `deploy.yml:147`. Production with
  `development` would need someone to run `next dev` on the server.
- **Playwright** starts `next dev` with `NODE_ENV: 'test'` (`playwright.config.ts:102-107`); the compiled
  value is `development`, so e2e runs *do* print bodies. Local and harmless; no e2e spec scrapes them.
- The comment's list "(production, test, unset)" (`email.ts:332-333`) describes vitest, where the
  runtime value is read. Correct in effect; the reason is wrong. One-line comment fix.

### 3.2 Do remaining log lines leak recipient or content?

- **SMTP failure** logs the whole error object (`email.ts:150`). nodemailer attaches the server
  `response` (`smtp-connection/index.js:946`) and, on recipient refusal, `rejected` and
  `rejectedErrors` — **recipient addresses** (`:1863-1864`). Not the body or the link. Personal data,
  same class as the forgot-password `user.email` line (`forgot-password/route.ts:109`) the loop accepted
  — but the loop narrowed the Resend path (`:179`, `:185`) and not this one, so the class was handled
  for one of two providers. The diagnostic path does the same (`email.ts:307`, in #294's scope).
- **Skipped send** logs recipient domain and subject (`:345`). Subjects are fixed strings for reset and
  heartbeat; for alerts the subject is `[P1] <alert id>` — no content. Fine.

### 3.3 Is `success: true` from the no-provider fallback still right?

- **Alerts / heartbeat:** they never reach it — both check `isEmailDeliveryConfigured()` first and
  return undelivered (`notifications.ts:111`, `:181`). Correct.
- **Forgot-password:** the only other caller. `success: true` means the route's "delivery failed" line
  (`:108-110`) never fires; the `send skipped` warn at `email.ts:345` is the only trace. The user gets
  the enumeration-safe success either way. Acceptable, but the return value is a lie that only one
  remaining caller tolerates; a future caller will trust it. Recommend `{ success: false, skipped: true }`
  at the next touch.

---

## 4. Q3 — Loop 114, adversarially

### 4.1 Who can write `alert_notified`? Anyone (executed)

Covered in §1. The rows the POST route builds (`route.ts:47-54`): `userId: userId ?? event.userId`,
`eventName: event.event ?? 'unknown'`, `source: event.source ?? 'client'`, properties = the body minus
six keys (`:230-236`) — so `alertId` and `state` survive into `properties` exactly as
`recordAlertState` writes them (`alert-state.ts:131`). `reduceAlertStates` keeps the latest row per id
(`:103`). The route has no auth (`:24-30` treats no session as normal), no event-name allowlist, no
cap beyond 100 events per batch (`:44`), and no rate limit (the rate-limit modules are login, invite
and extension telemetry only).

Additional levers from the same table:

- **Crowding:** `take: 1000` newest-first (`:115-116`). 1000 junk `alert_notified` rows (ten
  requests) push the real state out of the read → every firing alert re-sends hourly.
- `alert_notified` has **no client emitter** (0 files outside `alert-state.ts`) and is not in the client
  `AnalyticsEvent` union, so a server-side allowlist derived from that union rejects it with no product
  cost.

**Fix shape (for the row):** (1) at ingestion, accept only event names in the client union, force
`source: 'client'`, ignore body `userId` (session only); (2) `loadAlertStates` and every
`computeAlerts` query filter `source: 'server'` (defence in depth; only meaningful after (1), since
`source` is client-settable today); (3) rate-limit the POST; (4) a test that POSTs
`{event:'alert_notified'}` and asserts nothing is persisted. Note (2) changes alert semantics where
inputs are emitted on both sides (`workflow_uploaded`, `upload_failed`, `signup_completed` each have a
client and a server emitter) — the row must say which side each alert counts.

### 4.2 The rest of the adversarial list

| Scenario | Code | Verdict |
|---|---|---|
| Two overlapping runs (schedule + `workflow_dispatch`; no `concurrency:` in `alerts-check.yml`) | both read before either writes (`route.ts:113`, `:145-151`) | duplicate send; within the stated bias |
| Clock skew | state rows and `nowMs` both from the app clock (`alert-state.ts:133`, `route.ts:105`); a backward jump suppresses until real time passes the row + 24 h — tested (`alert-state.test.ts:45`) | stated by test, not by prose |
| State read fails | falls back to `{}` (`route.ts:111-116`) | duplicate; correct |
| **Flapping** firing/ok each hour | firing → send; ok → `resolved`; firing → `new` | **executed: 12 pages in 24 h** against 1 for steady firing. No hysteresis. Not stated |
| insufficient_data ↔ firing | `insufficient_data` keeps firing state (`alert-state.ts:22-23`) | **executed: fire at h0, insufficient h1-13, fire h14 → 1 send.** A new incident after a quiet night (upload volume < 5 in 2 h) is not announced until the 24 h reminder. Stated as a rule, not as this consequence |
| Resolve write fails, then re-fire within 24 h | `recordAlertState` swallows (`:137-139`); prev stays `firing` | suppressed — the one **loss**-shaped failure path, contrary to "duplicate over loss". Narrow |
| Partial delivery | recorded as sent (`route.ts:148`) | stated; heartbeat covers it |
| Retention | cleanup at 90 d (`cleanup-events/route.ts:91`), lookback 8 d | fine |
| Analytics pollution | raw counts in `GET /api/analytics/events` | stated, cosmetic |

### 4.3 Is `AnalyticsEvent` sound as a state store?

Durability and indexing: yes. Trust boundary: no — it is the one table in the schema that an
unauthenticated client writes by design. "No schema change, given #12" was the stated reason; the
cost of that choice was not asked. A separate table needs a migration (#12 risk); keeping the table but
closing ingestion (§4.1 (1)) does not. Do the latter.

---

## 5. Q4 — Loop 115

### 5.1 `pool: 'forks'` vs. mocking the 13 suites — the right first fix

Forks fixes the class (any suite that loads a native module) at the gate, in two lines, and makes the
exit code mean "a test failed". Mocking the 13 would be better isolation but is 13 edits and leaves the
next suite that imports `@/db` exposed. Keep forks; a follow-up to stop unit suites loading the real
client is optional hygiene, not a fix.

### 5.2 Evidence — adequate for the fix, overstated in the commit

The log is honest: "the mechanism is inferred from the correlation with the pool, not proven"
(`ITERATION_LOG.md`, loop 115). The commit message says "13 suites load the real Prisma client and its
native engine crashed under worker_threads" — fact, not inference. The streak arithmetic is right
(0.9^40 ≈ 1.5%). The root soak cannot show a fix (0 crashes in 3 before); the log says so.

### 5.3 #53's consequence — should it outrank other rows? Yes

Verified: CI's only vitest step is `deploy.yml:44` `pnpm test`; root include is `*.test.ts`
(`vitest.config.ts:6-9`); no workflow runs the web-app config; 12 `.test.tsx` files exist, all in
`apps/web-app`. Those are the dashboard component suites (MDR-P08 Escape dispatch, the v2 shell
analytics, `WorkflowRow`) — dozens of regression locks that have never gated a deploy. The row is still
scored **9**, as written at iter 021. The fix is now one CI step (`pnpm --filter @ledgerium/web-app
test`, ~18 s), E=1. Rescore to ~12.

---

## 6. Q5 — Practices

### 6.1 The MR-050 coordinator clarification — followed

Loop 115: "The second pass extended the fix to the root config, which I had found in review — handed
back per MR-050 rather than edited by me." Loops 113 and 114 report no coordinator product edits. The
audit log has no actor field (MR-049 §0) and does not record Bash-made edits — the loop-115
`db/index.ts` probe and both `vitest.config.ts` edits are absent from it — so attribution cannot be
verified from the log; it is taken from the entries. The probe sentence is passive ("a temporary probe
… showed"); say who.

### 6.2 Validation methods that can produce false results

| Method | Seen | Failure |
|---|---|---|
| grep "failed" in test output | loop 114 | false positive on log text from a passing test |
| grep `Tests` in coloured output | this review | false negative (ANSI codes) |
| "0 lines matching `error`" on typecheck | MR-050, here | false positive if a file or symbol is named `error`; harmless only because exit code is also read |
| "N of N runs" counted by eye | MR-049 draft | caught before commit |

Rule worth adopting as practice (not a control change): **the verdict of a test run is its exit code
plus the summary line after stripping ANSI; never a substring of the body.**

### 6.3 Claims before evidence in committed text

| Claim | Where | Code |
|---|---|---|
| "native engine crashed under worker_threads" (as fact) | `c0924ef` message | log says inferred |
| "any other NODE_ENV (production, test, unset)" decides | `email.ts:332-333` | build-time inlining decides (§3.1) |
| "a duplicate … is acceptable, a lost one is not" / "duplicate over loss" | loops 113-114, `route.ts:110` | one loss path (§4.2) and an anonymous silence path (§4.1) |
| "recorded only after a delivery reached a channel" | `3d58482` message | true of the server; any client can record it too |

### 6.4 Class-scoped residuals

Loop 113 scoped its residual well (#294 filed for the other unbounded send) but narrowed logging for
one provider of two (§3.2). Loop 114 listed four residuals "ways a human is not told" — and missed the
largest, because it never asked who else writes the table. Loop 115 found the #53 consequence: good.

---

## 7. Q6 — What the window got wrong

1. **Alert state in an anonymously writable table** (§4.1) — silence or hourly pages on request. New.
2. **Alert inputs anonymously forgeable** (§1.2) — pre-existing and unfiled through every alert loop since #256.
3. **Flapping pages every two hours; a new incident after a quiet spell is not announced** (§4.2).
4. **SMTP failure logs recipient addresses**; Resend narrowed, SMTP not (§3.2).
5. **#53 left at 9** after the loop found it ungates a deploy (§5.3).
6. Four sentences ahead of the code (§6.3).
7. Nothing to revert.

---

## 8. Q7 — Next pick (loop 116)

Pool 113 > 8 → `burn-down`. Last five: 111 infra/deploy, 112 web-app/analytics, 113 security/web,
114 infra/monitoring, 115 test-infra. Security 1 of 5, monitoring 1, analytics 1 → no penalty on
any; no Area 3-consecutive.

| Candidate | Score | Notes |
|---|---|---|
| **New: analytics ingestion trusts event name, source and userId from anonymous clients; alert state and inputs forgeable** | **~14** (I5 A5 L4 C5 E2 R3) | §4.1; must land before alerts are relied on |
| **#53** rescored | ~12 (from 9) | one CI step; 12 ungated suites |
| #290 | 10 | gated on #225 |
| #249 / #251 / #252 | 10 | #252 now also bounded by the new row (forged numerator) |
| #278 | 10 | partly CEO-bound |
| #294 | 9 | admin diagnostic SMTP deadline; admin-only path |
| #287 / #268 | 9 | a11y |
| #270 / #265 / #275 | 8 | — |
| New: flapping hysteresis + "new incident after insufficient_data" | ~9 | §4.2; small; could fold into the new row's scope only if same file — it is not; separate |

**Pick: the new ingestion row at loop 116** (`burn-down` precedent: #292 was filed at MR-050 and
picked as burn-down at loop 114). Agent `security-reviewer`, with `backend-engineer` for the
`computeAlerts` source split. **Then #53 at loop 117** (`devops-engineer` or `qa-engineer`; expect some
of the 12 suites to fail when first gated — budget for it).

---

## 9. Pattern — what this window adds

1. **Before storing state, ask who else can write the store.** Loop 114 asked whether the table was
   durable and indexed; it did not ask whether it was trusted. The cheapest store was the only
   anonymously writable one.
2. **A fix for a lever can create the next lever** (MR-050 pattern 1) — third window running. Loop
   114's suppression is exactly the lever: silence on demand.
3. **A green run's meaning changed in loop 114; the threat model did not change with it.** When "green"
   starts meaning "nothing new", anything that can fake "already sent" fakes "green".
4. **Grep is not a verdict** (§6.2). Two false results in two consecutive reviews/loops.
5. **MR-050's handback rule worked** on its first application.

No control-rule change proposed.

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Alerts — ready to enable** | Repo side done | **Set:** GitHub secret `CRON_SECRET` (`A-Z a-z 0-9 + / = _ -` only) and variable `ALERTS_CHECK_URL` = `https://<host>/api/admin/alerts/check`; at least one channel — secret `SLACK_ALERTS_WEBHOOK_URL` and/or variable `ALERT_EMAIL_TO` plus `SMTP_PASSWORD` (or `RESEND_API_KEY`); then redeploy (`deploy.yml:161-168` pass them through). **Caveat:** until the loop-116 row ships, anyone can silence or spam these alerts (§4.1). Enabling is still better than not — the forged state can make it no quieter than today's off — but treat a green run as weak evidence, and an alert storm as possibly forged |
| **#277 values** — `DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE` | Blocked on you | Unchanged. Passing `DEMO_MODE_DISABLE_TEAMS` through as written switches teams off |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Unchanged; still load-bearing for per-IP limits, #290's login lockout and silent reset denial. Will also matter for the loop-116 rate limit |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` above |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)`; admin view badges every allowlisted row |
| **#12** schema step fails quiet | Blocked on you | Was the stated reason loop 114 avoided a table; the loop-116 fix does not need a migration |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | Partly answerable | The heartbeat answers "can the channel deliver" once alerts are on |
| **#216** extension untouched | **~72 loops** (`871e29a`) | Unchanged |
| **Activation alert** | Now needs 10 signups 7-14 days ago | Below that it reports `insufficient_data` and never pages |

---

## 11. Verdict

Every number reproduces at `c0924ef`: web-app 3887 on 5 of 5, root 5676 on 3 of 3, no crash in 8;
typecheck 0; validator clean at 113 open. Loop 113 keeps reset links out of production logs — robustly,
because the build inlines the gate. Loop 115 makes the deploy gate's exit code honest and finds that the
gate never covered the component suites.

Loop 114 does what it was asked and opens the window's worst hole beside it: alert memory lives in a
table any anonymous client can write, so the hourly check can be silenced or made to page on request,
and the alert inputs were already forgeable. Do next: close analytics ingestion (loop 116), then gate
the 12 component suites (#53, loop 117). File flapping hysteresis; narrow the SMTP error log; correct
the four sentences.

---

### Appendix — reproducing §4.1 and §4.2

Copy `apps/web-app/src/lib/alert-state.ts` to a scratch directory; replace the `@/db` import with
`const db: any = {};` and the `AlertResult` type import with `type AlertResult = any;`. Run under
`node --experimental-strip-types`:

```ts
// verbatim from api/analytics/events/route.ts:230-236 and :47-54
function filterProperties(e: any) { const { event: _n, timestamp: _t, url: _u, source: _s, userId: _i, visitorId: _v, ...rest } = e; return rest; }
const toRecord = (e: any, uid?: string) => ({ userId: uid ?? e.userId ?? null, eventName: e.event ?? 'unknown',
  properties: JSON.stringify(filterProperties(e)), source: e.source ?? 'client' });
// 8 firing alerts, 72 hourly runs; attacker posts one forged 'firing' row per id every 23 h
//   -> sends 0   (control without the forged rows: 24)
// one firing alert, forged 'resolved' row every hour for 24 h -> sends 24 (control: 1)
// flapping firing/ok each hour for 24 h -> sends 12
// firing h0, insufficient_data h1-13, firing h14 -> sends 1
```
