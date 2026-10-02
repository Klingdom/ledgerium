# MR-052 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 116-118, 2026-10-02. Commits `4a05b09` (loop 116, #295), `ac2f25a` (backlog row
repair), `24537f4` (loop 117, #53), `a276d2e` (loop 118, #296). Rows filed in the window: #297 (loop
118). Rows amended: #252 (loop 116).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `a276d2e`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node v24 on Windows; CI pins Node 20 on Linux. Local
`main` is **29 commits ahead of `origin/main`** (`e1a9af5`, last fetched ref), so nothing in this
window has run in CI or reached production.

**Validation run for this review — all executed at `a276d2e`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 3918 (loop 118) | **3 of 3: 219 files, 3918 passed, exit 0** (15.4-15.8 s) | matches |
| root `pnpm test`, **×2** | 5704 (loop 118) | **2 of 2: 278 files, 5704 passed, exit 0** (18.9 s) | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 290 rows, 177 struck, 19/19 budget, **open 113**; oldest open non-blocked #13 (~216 loops) | reconciles: 113 (MR-051) + #295 + #296 (filed at MR-051 recording) + #297 − #295 − #53 − #296 = **113** |
| Loop 117's CI step, off-machine-state | "first runner execution is the next push" | **clean `git worktree` at `a276d2e` with no `.env`/`.env.local` (both gitignored, present in the main checkout), `pnpm install --frozen-lockfile`, `prisma generate`, then `env -u DATABASE_URL pnpm --filter @ledgerium/web-app test`: 219 files / 3918, exit 0** | the step does not depend on local env files. Still Windows + Node 24 (§4) |
| Allowlist bypass probes | — | `analytics-event-names.ts` copied (type import stubbed), 18 probes + the route's batch filter verbatim (`route.ts:69-71`), `node --experimental-strip-types` | exact-match holds; **server-only names pass** (§3.1) |
| Rate-limit memory/CPU | — | `analytics-ingest-buckets.ts` copied verbatim, `NODE_ENV=production`, distinct keys inside one 60 s window | **30k 8 KB keys = 246 MB heap; 60k short keys: 1000 requests = 1.17 s of synchronous prune** (§3.2) |
| Alert state machine | "one incident, one page" | `alert-state.ts` copied (`@/db` and type import stubbed), in-memory row store, the route's write order copied from `check/route.ts:145-152` | 7 scenarios executed (§5); two silent-P1 shapes |

**Not run:** Playwright, `next build`, Docker, any HTTP request to a route (the §3 probes run at the
function layer with the route's own filter, not over HTTP), GitHub Actions, Node 20, Linux, VPS,
production data, secret values. No `curl`/`wget`. I read `.env` names only by trying: `sed` on `.env`
is denied, so I cannot list which variables the local suites saw — the clean-worktree run is the
substitute. The loop-118 architect sketch is **not in the repository** (§5.1), so I checked the code
against the module's own documented machine and the #296 row, not against the sketch.

---

## 1. Lead

**Loop 116's allowlist is "every name in the `AnalyticsEvent` union", and the union is not "names a
client emits". At least 19 allowlisted names have a server emitter and no client emitter — among them
`subscription_created`, `workflow_uploaded`, `payment_failed`, `plan_limit_hit` and `api_error`.
Executed: a batch of `[{event:'alert_notified'}, {event:'subscription_created'},
{event:'api_error'}]` is accepted as `["subscription_created","api_error"]`. Those rows are stored as
`source: 'client'`, so alerts no longer see them — loop 116's goal holds — but every other reader
counts them by name: the admin "Subscriptions" tile (`analytics/product/page.tsx:370` ←
`eventCounts['subscription_created']`, `events/route.ts:174-176`), "Workflows Created" (`:369`), the
admin error panel (`admin-operations/queries.ts:112`, `:417-421`, no source filter), and — the
highest-stakes consumer — the #57 retirement metrics (`dashboard-v2-retirement-metrics.ts:64-98`), which
count `dashboard_v2_viewed`, `dashboard_bounced` and `insight_chip_clicked` with no `userId` and no
source check. One anonymous 100-event POST sets the bounce rate and chip-click rate the CEO's #57
decision rule reads.**

The equivalence is asserted in the code as fact: "an anonymous caller may write only (a) names a
client actually emits — the AnalyticsEvent union" (`events/route.ts:62-63`). It is mine before it is
the loop's: **MR-051 §4.1 wrote the fix shape as "accept only event names in the client union" and
proved it with `alert_notified` "is not in the client `AnalyticsEvent` union"** — true of that one name,
and I generalised it without checking the other 120. The loop implemented exactly what the row said.

Two smaller things the code says that the window's summaries do not:

- **Loop 116 changed what a failed upload is.** Before, the upload page recorded `upload_failed` for
  every non-OK response except plan limits (`4a05b09^:upload/page.tsx:99-102`). Now the server records
  only validation, integrity, processing and 500 failures, and states that unparseable, oversized,
  wrong-type and auth refusals "are not upload attempts that failed" (`upload/route.ts:123-127`). A user
  whose file is rejected sees an error; no alert or panel now counts it. Defensible — but stated only in
  a code comment, not in the log, CHANGELOG or row.
- **Loop 118's hysteresis merges a second incident into the first for up to ~21 hours** (§5.2,
  executed): fire, two ok runs, fire again → one page at h0, the next at h24.

Nothing needs reverting. All three loops are correct against the problems they were given; loop 116
leaves the forgery class open wider than its residual list says, because its residual list was written
against the same wrong premise.

---

## 2. Q1 — Re-run the claims

Every count reproduces (table). Web-app 15.4-15.8 s, down from 17-18 s at MR-051 on the same machine
(not investigated; noise-sized). The clean-worktree run is the most useful extra: it removes the local
`.env` files the main checkout carries, and the gate step still passes, so loop 117's step does not lean
on a developer secret file. It does not remove Windows or Node 24.

---

## 3. Q2 — Loop 116, adversarially

### 3.1 Can the allowlist be bypassed? No. Is it the right list? No.

| Probe (executed) | Result |
|---|---|
| `Alert_Notified`, `ALERT_NOTIFIED`, `Workflow_Uploaded` | rejected — `Set.has` exact match (`analytics-event-names.ts:157-160`); Postgres `=` is case-sensitive, so no stored variant could collide either |
| leading/trailing space, zero-width space, full-width `ｗ`, trailing NUL | rejected |
| `event: ["workflow_uploaded"]`, an object with `toString`, `__proto__`, `constructor`, `hasOwnProperty`, `null`, `1` | rejected (`typeof name === 'string'`) |
| array element instead of object; `null`; string in `events[]` | dropped by `e !== null && typeof e === 'object'` + `e.event` undefined |
| batch mixing allowed and disallowed names | per-event filter; only allowed names stored, `dropped` counts the rest |
| `sendBeacon` / `text/plain` | not a bypass: `req.json()` ignores content type, and the client sends `application/json` anyway (`analytics.ts:957`) |
| **server-only names** | **accepted** — see below |

**Who can still poison what (anonymous unless noted):**

| Reader | Filter today | Poisonable by |
|---|---|---|
| Alerts `computeAlerts` / `loadAlertStates` | `source: 'server'` for 7 inputs and state (`compute-alerts.ts:45-46,76,92,112,148,164,178`; `alert-state.ts:189`) | nobody (closed by loop 116) |
| Activation alert numerator `sop_section_viewed` | `source: 'client'`, `userId not null` (`compute-alerts.ts:116`) | a logged-in user, self-attributed only (stated residual) |
| `sop_usefulness_low` | `source: 'client'` (`:194`) | anyone — P3, never sent (`alert-state.ts:110`) |
| **#57 retirement metrics** (bounce, chip-click) | **none** (`dashboard-v2-retirement-metrics.ts:64-98`) | **anyone**. Real dashboard rows always carry a session `userId` (the dashboard is behind auth), so `userId: { not: null }` costs nothing legitimate |
| `upgradePromptByLocation` | none (`upgrade-prompt-by-location.ts:77-78`) | anyone |
| Product page `eventCounts` ("Subscriptions", "Workflows Created", top pages) | none (`events/route.ts:164-176`) | anyone, incl. **server-only facts** |
| Funnels | `userId` required (`events/route.ts:280`) | logged-in, self only |
| Admin error panel (`upload_failed`, `api_error`, `client_error`) | none (`queries.ts:417-421`) | anyone; `api_error` has no client emitter |
| Engagement / retention | `userId in users` (`engagement/route.ts:61-66`, `retention/route.ts:55-57`) | logged-in, self only |
| Attribution first touch | earliest row per `visitorId` (`attribution.ts:132`, `:184`) | not by backdating — `createdAt` is server-set; needs a victim's random `visitorId` |

`client_error` *is* client-writable by design (two emitters); `api_error` is not and should not be.

**Fix shape:** derive the ingest allowlist from names that have a client emitter, not from the union —
e.g. a `SERVER_ONLY_EVENT_NAMES` list excluded from `ANALYTICS_EVENT_NAMES`, with a test that every
excluded name has a `trackServer` call and no client `track` call (the scan in this review is a
starting point, not a proof: it found 19 server-only names and ~20 union names with **no emitter at
all** — `first_*`, `onboarding_*`, `variant_*`, `sop_step_*`). Plus `userId: { not: null }` on the
retirement and upgrade-prompt metrics. `trackServer` takes `event: string` (`analytics-server.ts:46-48`),
so the server never needed these names in the client union to type-check.

### 3.2 Is the rate limiter a memory or CPU lever? Bounded, but yes

`analytics-ingest-buckets.ts:28` is an unbounded `Map` keyed by the first `X-Forwarded-For` entry
(`client-ip.ts:128-131`, any length up to the header limit) and **pruned by a full scan on every
request** (`:37-39`). Executed, all keys inside one window:

- 30,000 distinct 8 KB keys → **+246 MB heap**.
- 60,000 short keys → the last 1,000 requests spent **1.17 s** in the prune loop: ~1.2 ms of blocked
  event loop per request. Live entries ≈ 60 × (distinct-key rate), so the scan cost grows with the
  square of the attack rate; around 1,000 distinct-key requests/s the prune alone saturates the single
  Node process — login included, not just analytics.

Bounded by attacker throughput × 60 s, not unbounded over time, and the sibling auth/invite/telemetry
buckets share the pattern (pre-existing). But #291 had already replaced this exact pattern with
fixed-size typed-array tables for this exact reason (`account-throttle.ts:11-20`), and loop 116 put the
old pattern on the busiest unauthenticated endpoint. The module header says "spoofable" (`:11-14`); it
does not say "and a header-rotating caller grows the map". Also unfiled and pre-existing: **no request
body size cap** on this POST — the limiter counts requests, not bytes, and `filterProperties` stores every
remaining key (`events/route.ts:261-266`).

Conditional, unverifiable from the repo: if the proxy forwards neither `X-Forwarded-For` nor
`X-Real-IP`, every caller is `'unknown'` (`client-ip.ts:146`) and 120/min becomes a **site-wide** cap
any one client can exhaust. `/api/admin/operations` `data.proxyChain` (#225) answers this.

### 3.3 Did the upload-route events change user-visible analytics as intended and stated?

| Surface | Before | After | Stated? |
|---|---|---|---|
| "Workflows Created", engagement, retention | 1 client row per browser-observed web success | 1 server row per server success (`upload/route.ts:315`) — also counts uploads whose response the browser never read | yes ("one source per fact") |
| `upload_failed` (alerts, error panel) | every non-OK, non-plan-limit response, client | validation / integrity / processing / 500, server (`:129,148,180,344`) + client network errors | **code comment only** (`:123-127`) |
| `zero_uploads_24h` for 24 h after the first deploy | — | pre-deploy web uploads are `source: 'client'` and not counted | no — a transient false P1 is possible on a day with web uploads only |

---

## 4. Q3 — Loop 117

- **Will it run?** Prisma client is generated at `deploy.yml:37` before typecheck and both test steps;
  `pnpm --filter` runs in `apps/web-app`; `pool: 'forks'` is the Linux default-safe pool. The clean
  worktree shows no dependency on the local `.env` files. **Not shown:** Node 20 and Linux. The 13
  `.test.tsx` files have never run on either.
- **Windows-only assumptions:** the fs-reading tests (`api-error-coverage.test.ts`, `theme-contrast.test.ts`)
  are `.test.ts`, already run on Linux by the root step, and use `sep` / `\r?\n`. No `.test.tsx` reads a
  file. Import casing is typechecked on Linux (`tsconfig.json:20` includes tests); `vi.mock` strings are
  not — I scanned every `vi.mock` path in the newly gated files: no casing mismatch.
- **`scripts/**/*.test.ts`:** one file, `seed-demo-account.test.ts`, mocks Prisma; its `main()` is guarded
  by `argv[1]` (`seed-demo-account.ts:704`). No network, no real files.
- **A gate that cannot fail by vanishing — it can.** `passWithNoTests: true` (`apps/web-app/vitest.config.ts:10`)
  means a broken include glob, a wrong working directory or a filter typo exits 0 with zero files. The
  step's exit code proves "nothing failed", not "219 files ran". Assert a minimum file count, or drop
  the flag for this config.

---

## 5. Q4 — Loop 118

### 5.1 The machine, checked against its own documentation (the sketch is not saved)

The iteration log says the architect gave "a read-only verdict"; neither the sketch nor the verdict text
is in `docs/` (searched for the constants and "unconfirmed"). The review's output lives only as a
one-line summary — a traceability gap for a D-4 artifact. Against `alert-state.ts:14-34` and the #296 row
the code matches: N=3 ok runs, insufficient neutral (`:140-143`), ≥6 h quiet → new (`:124`), negative gap
→ send (`:122-127`), failed write → discarded state (`:209-214`).

### 5.2 Executed scenarios (24-48 h, one P1 alert)

| Scenario | Sends | Lost page? |
|---|---|---|
| firing/ok every hour, 48 h | h0, h24 | no — the intended fix |
| firing, 7 h `insufficient_data`, firing | h0, h8 | no — MR-051's case fixed |
| firing, ok, ok, ok, firing ×22 | h0, h4 | no |
| **firing, ok, ok, firing ×23** (a second, different outage 2 h after recovery) | **h0, h24** | **yes — 21 h of a firing P1 with no page.** Two ok runs and a fire inside 6 h is a "continuation" (`:128-130`), and the reminder clock runs from the first page |
| failed `resolved` write at h3, re-fire h4, same process | h0, h4 | no — unconfirmed set works |
| **same, process restarted (or another instance) between h3 and h4** | **h0, h24** | **yes — the stated restart residual, quantified: 20 h silent** |
| a `firing` row stamped 5 h in the future, steady firing | h0, h1, h2, h3, h4 | no — but **pages every hour for the length of the skew**; "a backwards clock sends" does not say for how long |

The merge row is not a bug against the spec — it is what hysteresis means — but its cost is set by the
24 h reminder, which was chosen when there was no hysteresis. A short re-arm (re-page a `continued`
P1 once it has been firing for, say, 2 runs after a `clear`) would bound it at ~2 h.

### 5.3 Multiple instances; the concurrency group

- **Instances:** the deploy is one container (`compose.hostinger*.yaml`, no replicas), so the
  process-local set is correct today. Any scale-out, or two containers overlapping during a deploy, turns
  the "restart residual" into "any run served by the other instance" (row above). Not stated.
- **Concurrency:** GitHub keeps one running and at most one pending run per group; a third arrival
  cancels the pending one. Each run recomputes from the database, so a cancelled pending run loses no
  alert — the next run makes the same decision. Not lossy. The only cost: a manual `workflow_dispatch`
  can be silently replaced by the next hourly one (shows "cancelled", not "failed").
- **Not paged on:** persistent state-write failure returns **200** with `stateWriteFailures`
  (`check/route.ts:156-160`, `:197`); the job logs only the status, so it stays green. The resulting
  hourly duplicate pages are the signal. Acceptable; say so.

---

## 6. Q5 — Practices

### 6.1 Masked exit codes

| Where | What | Verdict |
|---|---|---|
| Recording scripts (`l116.mjs`-`l118.mjs`, the coordinator's scratchpad) | splice `IMPROVEMENT_BACKLOG.md` by line and **never run the validator**; no local git hook runs it (`.git/hooks` has only samples); CI runs it only on push, and `main` is 29 commits ahead | the loop-116 error's root: the check is a separate manual step whose result is read by eye. Make the recording script run the validator and set a non-zero exit |
| Coordinator scratch `loop.sh:9` | captures `ec=$?` (good) but greps `Tests` **without stripping ANSI** | verdict safe, summary can be blank — MR-051's false-negative class, still in the tool |
| `scripts/docker-start.sh:52-56` | `prisma db push` failure → `prisma generate … \|\| true` → second failure `echo WARNING` → "Database ready" | this *is* #12; no new row |
| `.claude/hooks/post_edit_validation.sh:14,20,21` | lint and scoring `>/dev/null 2>&1 \|\| true` | advisory hooks; invisible by design, but nothing reads them either |
| `.github/workflows/*` `\| tail -n1` | extracts the HTTP code from `curl -w`, not an exit code | fine |

### 6.2 The D-4 gate

- **Loop 118:** fired, correctly in spirit. It was measured as whole-file LOC ("passed 200 LOC (236)"),
  not the canonical "exported interface + public function bodies" (MR-015 §5) — over-application,
  harmless. The output was not saved (§5.1).
- **Loop 116:** by the letter, clause 2 did not fire: `analytics-event-names.ts` is 159 lines, most of
  it a list; the bucket module is 55. **By substance it should have:** the module *is* a new trust
  contract ("names a client emits"), and its contract was wrong. A LOC threshold is the wrong trigger for
  a trust boundary. One occurrence; no rule change — practice: any new allowlist or trust boundary gets a
  second agent asked "what does this list claim, and is it true of every member?".

### 6.3 Three handbacks in loop 116 — the rule working, or thin briefs?

Both. The briefs are not recorded, so I judge from what came back:

1. **First pass** filtered alert inputs to `source: 'server'` without giving web uploads a server
   emitter. #295's own text required "state per alert which side it counts" — the brief evidently did
   not turn that into a checkable artifact.
2. **Second pass** added the server emitter without asking who else counts `workflow_uploaded` → double
   count. The brief omitted the consumers.
3. **Third pass** removed the client emitters. Nobody — three passes, the coordinator, or MR-051 — asked
   whether the other union names have client emitters (§3.1).

All three omissions are the same question: **for every event name this change touches, who writes it
and who reads it?** The handback rule caught two of three. A brief that required a writers × readers
table for each touched name would have caught all three before the first pass. That is MR-051's pattern
1 ("ask who else can write the store") applied one level down, to the names in the store.

---

## 7. Q6 — What the window got wrong

1. **Allowlist = union ≠ client-emitted** (§3.1): ≥19 server-only facts anonymously writable; the #57
   retirement metrics anonymously settable. Originates in MR-051's fix shape. New row.
2. **Loop 116's residual list understates the class**: it names "admin counts, engagement and
   retention" (two of which need a session) and not the #57 decision metrics or the server-only names.
   The forgery angle was amended into #252 (score 10, five unrelated sub-items) rather than filed — the
   score did not move when a security dimension was added.
3. **The rate limiter reuses the pattern #291 retired** (§3.2): 246 MB / 30k keys; quadratic prune.
4. **Upload-failure definition narrowed, stated only in code** (§3.3).
5. **Hysteresis merges a second incident for ~21 h; a restart after a failed resolve silences ~20 h**
   (§5.2) — the second is a stated residual, unquantified; the first is not stated.
6. **Loop 117's gate can pass on zero tests** (`passWithNoTests`).
7. **The D-4 review output was not persisted** (§5.1).
8. **The broken backlog commit** — owned in the log; root cause is structural (§6.1), not attention.
9. Nothing to revert.

---

## 8. Q7 — Next pick (loop 119)

Pool 113 > 8 → `burn-down`. Last five: 114 infra/monitoring, 115 test-infra, 116 security/analytics,
117 test-infra/ci, 118 infra/monitoring. No Area 3-consecutive; security/analytics 1 of 5.

| Candidate | Score | Notes |
|---|---|---|
| **New: ingest allowlist accepts server-only facts; #57 retirement and upgrade-prompt metrics count anonymous rows** | **~12** (I4 A5 L3 C5 E2 R1) | §3.1. Excludes server-only names (with an emitter test), `userId not null` on the two metrics, `source` on server facts in `eventCounts`. Lands before the CEO evaluates #57 on these numbers |
| #297 + the merged-incident cap (§5.2) | ~10 (from 9) | alert-correctness before more alerts build on the module |
| New: ingest bucket → bounded table; body size cap | ~9 | §3.2; siblings share it |
| #252 (remaining four parts) | 10 | split the forgery part out (above) |
| #294 | 9 | admin-only path |
| #249 / #251 | 10 | delivery; untestable today |
| #278 / #290 | 10 | partly CEO-bound (#225) |
| #287 / #268 | 9 | a11y |
| #270 / #265 / #275 | 8 | — |

**Pick: the new allowlist/metrics row at loop 119** (`burn-down` precedent: rows filed at a meta-review
and picked next, #292 and #295). Agent `security-reviewer`, with the brief carrying a **writers × readers
table for every name it removes or filters** (§6.3). Then #297 with the merge cap at loop 120 —
`infra/monitoring` would be 2 of the last 5, no penalty.

---

## 9. Pattern — what this window adds

1. **A list that is "derived from the type" inherits the type's meaning, not yours.** The union means
   "every event this codebase names", not "every event a browser sends". The check that proved the list
   matched the union proved the wrong thing exactly.
2. **Ask who writes and who reads each name, not just each table** (MR-051 pattern 1, one level down).
   Three handbacks and one review missed the same question.
3. **A hysteresis cost is set by the reminder interval it was bolted onto.**
4. **A manual check whose result is read by eye will eventually be read wrong** — the validator, the
   ANSI grep, `passWithNoTests`. Make the tool fail, not the reader notice.
5. **MR-050's handback rule** worked again (2 of 3).

No control-rule change proposed. Two practice notes (§6.2, §6.3).

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **New, prerequisite to everything below** | 29 commits are local. Scheduled workflows run from `origin`'s default branch, so loop 118's `concurrency` group and loops 116/118's server code do not exist outside this machine. The push also runs loop 117's step for the first time — **watch the `quality-gate` job; a red first run there is the step working, not the push breaking** |
| **Alerts — ready to enable** | Repo side done; forgery of state and inputs closed (§3.1 table) | Steps: (1) push; let `deploy.yml` deploy. (2) GitHub secret `CRON_SECRET` (`A-Z a-z 0-9 + / = _ -` only) and variable `ALERTS_CHECK_URL` = `https://<host>/api/admin/alerts/check`. (3) At least one channel: secret `SLACK_ALERTS_WEBHOOK_URL` and/or variable `ALERT_EMAIL_TO` + secret `SMTP_PASSWORD` (or `RESEND_API_KEY`). (4) Re-run the deploy so the container receives them (`deploy.yml:170-177`). (5) Actions → Alerts check → Run workflow. Expect 200, or 424 if a firing alert reached no channel. Caveats: a second outage within ~6 h of recovery pages at the next 24 h reminder (§5.2); for 24 h after the first deploy `zero_uploads_24h` can fire falsely on a web-only day (§3.3) |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | **Now protects four things:** per-IP login/signup/reset limits, #290's lockout, silent reset denial, and the analytics ingest limit (plus its map size, §3.2). If the proxy sends no XFF, the ingest limit is site-wide. `/api/admin/operations` → `proxyChain` gives the number |
| **#57 retirement decision** | Instrumented | **Do not read the bounce/chip-click numbers as evidence until the loop-119 row ships** — any anonymous POST sets them (§3.1) |
| **#277 values** — `DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE` | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged; `docker-start.sh:52-56` is the masked path (§6.1) |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | Partly answerable | Heartbeat answers it once alerts are on |
| **#216** extension untouched | **~75 loops** (`871e29a`) | Unchanged |

---

## 11. Verdict

Every number reproduces at `a276d2e`: web-app 3918 on 3 of 3, root 5704 on 2 of 2, typecheck 0,
validator clean at 113 open; loop 117's gate passes in a clean checkout with no local env files. Loop
116 closes alert forgery completely and exactly. Loop 117 makes the component suites gate a deploy —
once pushed. Loop 118 delivers one page per flapping incident, at the price of merging a second incident
for up to a day.

The window's miss is mine first: the allowlist is the union because MR-051 said so, and the union holds
19 names only the server emits — so the admin "Subscriptions" count, the error panel and the #57 decision
metrics remain writable by anyone. Do next: exclude server-only names and require a user on the
retirement metrics (loop 119); then #297 with a cap on merged incidents. File the bounded ingest table and
body cap. Make the recording script run the validator; drop `passWithNoTests` from the gate's config.

---

### Appendix — reproducing §3 and §5

Scratch copies, `node --experimental-strip-types`:

```ts
// §3.1  analytics-event-names.ts with `type AnalyticsEvent = { event: any }`
const batch = [['workflow_uploaded'], {event:'alert_notified'}, {event:'subscription_created'}, null, 'x', {event:'api_error'}];
batch.filter(e => e !== null && typeof e === 'object' && isAllowedAnalyticsEventName(e.event)).map(e => e.event);
//   -> ["subscription_created","api_error"]

// §3.2  analytics-ingest-buckets.ts verbatim, NODE_ENV=production, all calls within one window
//   30_000 keys x 8_000 chars -> heapUsed +246 MB
//   60_000 short keys          -> last 1000 calls: 1174 ms

// §5.2  alert-state.ts with `db` stubbed to an in-memory array; per hour:
//   loadAlertStates -> decideAlertSends(withoutUnconfirmed(prev)) -> record firing/resolved/clear/continued
//   'firing','ok','ok', then 'firing' x23               -> sends h0, h24
//   resolved write fails at h3, re-fire h4, set cleared  -> sends h0, h24   (same process: h0, h4)
//   a 'firing' row stamped +5 h, steady firing           -> sends h0..h4
```
