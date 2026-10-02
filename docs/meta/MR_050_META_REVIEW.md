# MR-050 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 110-112, 2026-10-02. Commits `a8542cb` (loop 110, #291), `0492cc6` (loop 111, #277
parts 1-3), `e4c3218` (loop 112, #250). Row filed in the window: none (#291 was filed at the MR-049
recording and closed at loop 110).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `e4c3218`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node is v24 on Windows; CI pins Node 20 on Linux.

**Validation run for this review — all executed at `e4c3218`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×6** | 3860 (loop 112) | **5 of 6: 214 files, 3860 passed, 0 failed, exit 0** (14.5-14.7 s). **Run 3 aborted**: `thread '<unnamed>' panicked at query-engine\query-engine-node-api\src\engine.rs:52:1: failed to delete napi ref`, exit 127, after ~80 files reported, **no test assertion failed and no test name is attributable** — the process died | counts match; **1 intermittent crash in 6** (§2) |
| `auth.login-throttle.test.ts` alone, **×10** | "20 of 20" (loop 110) | **10 of 10: 13 passed, exit 0** (~10 s each — the slowest file in the suite) | matches |
| workspace `pnpm test`, ×1 | not claimed | **274 files, 5649 passed, exit 0** | reconciles: 5635 (MR-049) + 7 − 7 + 2 + 12 = 5649 |
| `pnpm -r typecheck` | 0 | **exit 0**, 0 lines matching `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **284 rows, 171 struck, 19/19 budget, clean, exit 0; open 113**; oldest open non-blocked #13 (~210 loops) | reconciles: 114 + #291 filed − #291 − #250 = **113** (#277 is blocked, still open) |
| web-app arithmetic | 3846 → 3853 → 3848 → 3860 | +7 (#291 tests) / −7 bootstrap + 2 badge / +12 (#250) | reconciles |
| `account-throttle.ts`, executed in isolation | "other traffic can never RESET or DISABLE counting"; "~10 MB login"; "expires normally, ≤ 24 h idle" | scratch copy (only the `@/` import inlined), `node --experimental-strip-types`, using the module's own `__setSlotOverrideForTests` to force a collision | reset/disable **holds**; the memory figure **is wrong by 2×**; the expiry claim **does not hold for an active victim** (§3.3) |
| audit log, 15:29-16:30Z | delegation, "this edit is mine" | read | §6 |

**Not run:** Playwright, `next build`, Docker, any HTTP request to a route, any timing measurement of a
route (the oracle in §3.2 is read from the code and shown structurally, not timed), GitHub Actions,
VPS, production data, secret values. No `curl`/`wget`. No mutation testing of the product files
(mutating them would be a product edit); the "key is untested" claim in §3.1 is by reading the 13
tests.

---

## 1. Lead

**Loop 110 fixed the throttle MR-049 broke open, and the fix holds against the attack it was built
for. But its fingerprint rule gives an attacker who finds one colliding address a new lever: become
the slot's holder once, and from then on the admin's own successful logins count against the admin
and never clear. Executed: a daily "typo, then the right password 20 s later" login is refused on 8
of 10 days after capture, against 0 of 10 without it — with no further attacker traffic, because the
victim's own attempts keep the record alive.** The prerequisite — finding a colliding address — is
not offline-computable (the key is secret), but the code gives an online oracle for it, and the whole
thing needs #225's header bypass. It is an availability residual on admins, not an authority bypass.

Three things the code says that the window's summaries do not:

1. **Mass over-throttle is stated for login only; the forgot-password table has the same shape and
   fails silently (§3.4).** Executed: 1M junk addresses × 3 requests fill the forgot table so that
   **61.8% of real addresses are refused a reset email while being told one was sent**
   (`forgot-password/route.ts:53`). #290(5) names login and "~700/s upkeep"; the forgot table needs no
   upkeep beyond 3 requests per address per hour and has no visible failure.
2. **The coordinator's hash swap is the edit that makes the key load-bearing, and nothing tests the
   key (§3.1).** Remove `.update(slotKey)` (`account-throttle.ts:98`) and all 13 throttle tests still
   pass by reading; the capture lever in the lead then needs ~2^20 offline hashes instead of an online
   search.
3. **The activation alert can now fire, and nothing stops it firing every hour (§5.4).**
   `admin/alerts/check/route.ts:94-110` notifies every firing P1/P2 on every run with no state or
   dedupe. A mature cohort of two signups who have not dwelt 30 s on a SOP reads 0% and sends a P2
   every hour for up to a week. The loop said "noisy at small cohort sizes"; it did not say "hourly".

Nothing needs reverting. Loop 110 is strictly better than loop 107; loops 111 and 112 are correct as
built.

---

## 2. Q1 — Re-run the claims

Every count reproduces (table). The throttle file is stable: 10 of 10 here, after loop 110's 20 of 20
— the ~5% collision flake the coordinator found is fixed by choosing a probe address outside the junk
slots (`auth.login-throttle.test.ts:140-154`), which is honest: it tests the property under test and
leaves collision behaviour to test (f).

**The Prisma napi crash is back: 1 of 6 web-app runs here.** History: MR-048 1 of 3 (workspace),
MR-049 0 of 5, MR-050 1 of 6. Two crashes in 14 local suite runs. It is a native-engine teardown panic,
not a test failure, so it has no test name and vitest reports nothing — the process exits 127. It is
local Windows + Node 24; whether CI (Linux, Node 20) sees it is unknown. **It is not in the backlog.**
Three reviews have reported it. Recommend a row (test-infra): record each occurrence with the last file
reported, and check whether any test file leaves a `PrismaClient` un-disconnected.

---

## 3. Q2 — Loop 110, adversarially

### 3.1 Key-prefixed SHA-256 instead of HMAC — sound here, and under-protected

`SHA-256(K ‖ m)` with a secret 32-byte `K` (`:92`, `:98`) is a secret-prefix MAC. Its known weakness
is length extension, which needs a known output. **Is any output observable?** Not directly:
`derive()` is private; `accountSlot` (`:104`) is exported but called in production only by
`checkForgotPasswordThrottle` (`:195`); no log line, response field or header carries a slot or
fingerprint; refusals are `return null` (`auth.ts:45`) or the normal success body. So the choice is
fine for the stated reason. Speed: measured by the loop at ~15× for `createHmac`; plausible, not
re-measured here.

What is observable is **lock state**, and through it, **collision** (§3.2). That leaks one bit per
probe about the slot function, not the key, and is not a length-extension vector.

**Nothing tests that the key is used.** Tests use `accountSlot()` and the override hook; none asserts
that slot or fingerprint differ from the unkeyed hash, or depend on the key. Deleting `.update(slotKey)`
reverts to exactly the "unsalted hash" the commit message says review caught, and the suite would stay
green. Recommend one test: derive the unkeyed SHA-256 slot for N addresses and assert it differs from
`accountSlot` for most of them.

### 3.2 The fingerprint rule — can an attacker become the holder? Yes, with a collision found online

Rule (`:177`, `:186`): the slot's fingerprint is set only when the slot is empty; only a matching
fingerprint's success clears. To *become* the admin slot's holder an attacker needs (a) an address J in
the same slot and (b) J's reservation to land when the slot is empty.

- **(a) finding J.** Offline: impossible without the key. **Online: the code gives an oracle.** Lock
  the admin slot with five failed guesses at the admin address (the accepted lever, #290(1)); then
  probe candidate addresses. A candidate in the locked slot is refused at `auth.ts:45` *before*
  `findUserByEmailForLogin`; a non-colliding non-existent candidate pays one DB lookup
  (`auth.ts:47-48`). Executed structurally: a colliding probe is refused (`true`). The timing gap is one
  DB round trip, small but repeatable; expected cost ~2^20 candidates × a few repeats, plus one
  request per 15 min to keep the admin locked, all behind the per-IP limit (#225). The key resets on
  every restart or deploy, which discards a found J.
- **(b) capturing.** The slot empties when the admin's success clears it. An attacker sending J at
  intervals wins the next empty moment. Before that, each J request counts against the admin's record
  (rule 1), which the admin's next success refunds.
- **Consequence, executed:** with J holding the slot, the admin's reservations increment J's record
  and the admin's successes do not clear it (`:186`). Every reservation refreshes `expiresAt` (`:178`),
  so **an active admin keeps the captured record alive indefinitely** — the header's "it expires
  normally, ≤ 24 h idle" (`:31`) and #290(5)'s "until that record clears or expires (24 h)" are true only
  for an idle victim. Result: 0/10 vs **8/10** refused correct-password logins over 10 days for a
  "typo then correct" pattern; a clean single login per day is never refused but leaves a 15-minute lock
  behind it each time.

**Does it let the attacker keep a victim's honest successes from clearing without a collision?** No.
Without a shared slot the victim is the holder of its own slot.

**Fix shapes (for the row, not now):** stop non-holder reservations from refreshing `expiresAt`, so a
captured record expires 24 h after the holder's last attempt (the attacker must keep paying); or two
candidate slots per address (two-choice hashing) so one collision is not enough. Either way, state the
residual with "active victim" in it.

### 3.3 Other claims in the header

- **Memory: "~10 MB login"** (`:19`, and #291's closure text) — the login table is
  `2^20 × (1 + 8 + 8 + 4)` = **22.0 MB**; forgot is 9.4 MB (correct). Bounded, yes; the number is
  wrong by 2×, and it is the second wrong memory claim in this module in two loops.
- **Mass over-throttle arithmetic (#290(5))** — correct. `2^20·(1−e^(−1))` = 63.2% at N = 2^20; 61.5%
  at N = 1M; 10 reservations reach the cap (`30 s × 2^5` = 960 s → 900 s); ~10M requests to lock with
  one address per slot (an over-estimate: colliding junk shares counts, so ~6.5M suffice); upkeep
  one request per locked slot per 15 min ≈ 716/s for 644k slots, because the count persists past the
  lock (record TTL 24 h). The executed forgot-table figure (61.8%) confirms the fill formula.

### 3.4 Does reserving before the lookup change #290(2)'s timing oracle? Not in kind; it adds one

The existence oracle is unchanged: refusal still precedes the lookup (it did at loop 107 too), and a
non-existent account still skips bcrypt (`auth.ts:47-48`). **What is new is cross-address
observability:** with a Map, locking A told you nothing about B; with shared slots, locking A is
visible through B. That is the oracle in §3.2. The forgot table uses the same slot index
(`accountSlot`, `:195`), so a login collision is a forgot collision.

### 3.5 Did the AUTHZ_AUDIT_001 edits stay status-only? Yes, with one inconsistency

P1-2: "Status: OPEN" → "CHANGED, 801b5fd", grade text untouched ("P1, conditional P0"); the claim is
true (`signup/route.ts:72` refuses allowlisted addresses). P2-2: status + scope note, no grade. P3-7:
status + one sentence. Header line updated. **Inconsistency:** the closing status line
(`AUTHZ_AUDIT_001.md:146`) still reads "P3-7 CHANGED (6700fb5)" without `6fcde8b`, while the finding
line says both. Pattern 4 worked — the first time in five reviews — and the coordinator correctly
wrote "grade unchanged" next to its own edit.

---

## 4. Q3 — Loop 111

**Does anything still display or act on `User.isAdmin`?** No. `grep isAdmin` over `src` (non-test):
`teams/[id]/page.tsx:127-218` is a team-role local variable; `admin/bootstrap/route.ts:7,11` and
`admin/users/[id]/route.ts:53` are comments; `auth.ts` no longer reads it; no admin list, export, CSV
or analytics route selects it. `scripts/seed-demo-account.ts:434` writes `false`. The Prisma column
stays (`schema.prisma:100`), stated. **One stale comment:** `admin-allowlist.ts:40` — "Bootstrap
endpoint may still set it" — is false since loop 98 (the route is a 410 stub) and contradicts the
loop's own sentence that every remaining `isAdmin` is a comment "asserting that the column confers
nothing".

**Blocked, not closed — right.** Parts 1-3 are done; part 4's remaining step is a CEO value, and the
row's status says exactly that. Closing it would have taken numerator credit for undone work. The loop
said "earns no closure credit"; correct.

**Mixed-case legacy emails.** `isAdminUnlimited` trims and lower-cases (`admin-allowlist.ts:27-30`),
identical to `normalizeEmail` (`email-normalize.ts:14-16`) and to `canAccessAdmin`, which receives the
stored email via the session (`auth.ts:56`). So the badge and the authority agree for a legacy
`Phil@Mediafier.ai` row: both say admin, because both *are*. That makes the badge useful for the CEO's
squat check — two rows for one allowlisted address will both show "Admin".

**Area label.** The row's Area (`infra / deploy`) describes part 4, which was not done; the work done
was admin-authority display and dead admin code. Penalty arithmetic is unaffected this time
(MR-049 itself endorsed #277 as the non-security break). Recommend: when only some parts of a row ship,
log the Area of the work shipped.

---

## 5. Q4 — Loop 112

### 5.1 Activation definition — correct in effect; the docstring overstates

The cohort is "first `signup_completed` **inside** [now−14d, now−7d]" (`activation-rate.ts:56-63`), not
"first ever" as the docstring says (`:13`). It matters little: the server emits `signup_completed`
once per account with a userId (`signup/route.ts:124`); the client duplicate (`SignupPageClient.tsx:61`,
#252(1)) is deduplicated by the per-user `Map`, and null-userId rows are skipped (`:58`, `:68`). A
user counts only if the *server* event landed — a fire-and-forget write (`analytics-server.ts:66`); a
lost write drops the user from both numerator and denominator, which is unbiased.

**Mixed transports bias it downward.** The denominator is server-emitted; the numerator,
`sop_section_viewed`, is a client event that fires only after 30 s continuous dwell on the SOP tab
(`workflows/[id]/page.tsx:81-92`) and travels the client buffer with #249/#251's known delivery
losses. The ratio is in [0,1] but low by construction. Against a 0.20 threshold that biases toward
firing.

### 5.2 Excluding immature signups — the right trade

A one-week lag on a P2, with `no_signups_48h` covering silence, is defensible. The alternatives
(per-user partial windows, survival curves) add complexity for a single threshold alert. Keep it.

### 5.3 Retention nulls — handled everywhere they reach

Only one consumer: `analytics/product/page.tsx:649-662` renders `null` as "—" and `retentionBg`
accepts null (`:176`). No export, CSV or e2e fixture reads `/api/analytics/retention`. Empty cohorts
now return all-null instead of zeros — also rendered "—". **One unstated effect:** each average column
is now over a different cohort set (week 1 over up to 7 cohorts, week 4+ over up to 3), so reading the
average row left to right mixes cohort composition with decay. Worth one line on the page.

### 5.4 No view on error — denominators stay consistent; one signal disappears

`shouldEmitBounce` requires `viewFired` (`bounce.ts:58-60`), so failed loads now leave both the bounce
numerator and the view denominator; chips cannot be clicked on a failed load. Consistent. Residual:
client-side load failures (network, timeout) are now invisible to analytics; only server 5xx are
reported. The loop said the wiring test is a source lock, not a render; correct and stated.

### 5.5 Will it page someone wrongly? Yes, once alerts are live — needs a minimum cohort

`computeAlerts` returns `firing` for any `rate < 0.20` with `cohortSize ≥ 1` (`compute-alerts.ts:118-136`);
`admin/alerts/check` sends every firing P1/P2 every hour (`route.ts:94-110`) with no memory of the last
send. At current signup volume a 7-day cohort is a handful of users. **Recommend before alerts go live:**
`cohortSize < 10` → `insufficient_data` (message states the size), and a send-on-transition or
once-per-day rule for P2s. Both are small; the second is the class (every alert, not just this one).

---

## 6. Q5 — Practices

**Coordinator writing production code.** The audit log (no actor field, MR-049 §0) shows one
uninterrupted stream; the entry says the hash swap at 16:13:11Z was the coordinator's ("This edit is
mine, not the agent's"). The probe-selection flake fix (scratch `fixflake.mjs`, 16:16:28Z) is not
attributed either way. CLAUDE.md § Operating Model: the coordinator sequences; implementing agents
implement. A crypto-construction change in a security module is outside the role. It was disclosed —
good — and it was validated as *tests*: full suite, 5 runs, 20 runs of the file. It was not validated
as *security*: no second `security-reviewer` pass on the swap, no test that the key is used (§3.1),
and the property it changed (unpredictability of the slot function) is the one the capture lever
depends on. **Verdict: outside the role; better tested than reviewed.** Recommend: when the
coordinator's review finds a defect, hand it back to the agent; if the coordinator does edit, the
iteration log says which property the edit is load-bearing for and which test protects it.

**Claims before evidence.** The "5 of 5" draft was caught by the coordinator before commit (log entry,
loop 110). Others that reached committed text:

| Claim | Where | Code |
|---|---|---|
| "~10 MB login" | `account-throttle.ts:19`, #291 closure | 22 MB (§3.3) |
| "expires normally, ≤ 24 h idle" / "until … expires (24 h)" | `:31`, #290(5) | not for an active victim (§3.2) |
| "cohort = users whose FIRST `signup_completed`" | `activation-rate.ts:13` | first in window (§5.1) |
| every remaining `isAdmin` "asserting that the column confers nothing" | loop 111 entry | `admin-allowlist.ts:40` says bootstrap may set it (§4) |

None is load-bearing for a decision; all four are the same failure — prose written from intent.

**Pattern 4 (audit status travels).** Applied at loop 110 — first time in five reviews. One stale
summary line (§3.5). Loop 111 touched no audit finding; nothing was owed.

**Class-scoped residuals.** Loop 110 stated mass over-throttle — for one of the two tables (§1.1).
Loop 112 stated "noisy at small cohorts" without the class (the check route has no dedupe for any
alert). Loop 111: stated.

---

## 7. Q6 — What the window got wrong

1. **The holder-capture lever** (§3.2) — introduced by the fix for the bypass review caught; unstated,
   and the stated residual ("expires 24 h") understates it.
2. **The forgot-password half of the mass over-throttle** (§3.4) — silent, and the larger harm.
3. **The coordinator's crypto edit has no test for the property it secures** (§3.1, §6).
4. **The activation alert will page hourly on tiny cohorts** once alerts are live (§5.5).
5. **Four committed sentences written from intent** (§6 table).
6. **The Prisma crash is still not a row** after three reviews (§2).
7. Nothing to revert.

---

## 8. Q7 — Next pick (loop 113)

Pool 113 > 8 → `burn-down`. Last five Areas: 108 security/deploy, 109 infra/monitoring, 110
security/authz, 111 infra/deploy (work shipped: admin/authz), 112 web-app/analytics. By row labels,
security = 2 of 5 → **no penalty**; counted by work shipped, 3 of 5 → −2. No Area 3-consecutive.

| Candidate | Score | Notes |
|---|---|---|
| **#285** reset links logged / Resend no timeout / SMTP deadline does not abort | **11** (9 if 111 counts as security) | Still true: `email.ts:286` logs the full HTML body (a working reset link); `email.ts:127` `fetch` has no signal. Now in the alert path (MR-049 §5.3). Stale since MR-047 |
| **New: activation-alert minimum cohort + per-alert send-on-transition** | ~11 (I3 A4 L2 C5 E1 R0) | §5.5. Must land before the CEO configures alerts; small |
| **#290 amended** with (6) capture lever, (7) forgot-table silent mass denial, key test, memory figure | 10 → ~11 | §3.2-3.4; behind #225 |
| #249 / #251 / #252 analytics | 10 | #252 matters more now: the activation numerator rides the client transport (§5.1) |
| #278 undelivered env vars | 10 | partly CEO-bound |
| Prisma napi crash (new, test-infra) | ~9 | §2 |
| #287, #268 a11y | 9 | — |
| #275, #270, #265 | 8 | — |
| AUTHZ P2-3 (`teams/route.ts:30`), P2-5 | cold | unchanged |

**Pick: #285 at loop 113** (`burn-down`, 11, highest open score under either Area reading's tie-break:
it carries a credential-in-logs leg and an alert-path hang). **Then the activation-alert guard at loop
114**, before alerts go live. Fold §3.2-§3.4 into #290 at the recording, not as a new security loop —
it is gated on #225 like the rest of #290.

---

## 9. Pattern — what this window adds

1. **A fix for a lever can create the next lever.** Loop 110's fingerprint closed "a colliding success
   clears the admin" and opened "a colliding creator owns the admin". Before shipping an ownership rule,
   ask who can become the owner and how long ownership lasts *while the victim is active*.
2. **A residual stated for one table is a class residual stated for one member.** The same structure
   backs login and forgot-password; only one was quantified. (MR-049 pattern 2, recurring.)
3. **Alerts need a minimum sample and a memory before they need a threshold.** A ratio alert that was
   impossible to fire for 34 loops becomes, when fixed, an alert that fires hourly on n = 2.
4. **Pattern 4 worked.** First application in five reviews; keep it.

No control-rule change proposed. One clarification to the coordinator role, mirroring §6: a defect
found in review goes back to the implementing agent; a coordinator edit is logged with the property it
secures and the test that protects that property.

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **#277 values** — `DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE` | **Blocked on you** | Everything else in #277 is done. The deploy sets both; neither reaches the app. Passing `DEMO_MODE_DISABLE_TEAMS` through as written would switch teams off in production |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | **Now load-bearing for three things:** the per-IP limits, the login mass-lockout (#290(5)), and a silent mass denial of password-reset emails (§3.4). The runbook and `/api/admin/operations` `proxyChain` give the number to set |
| **Alerts setup** (`CRON_SECRET`, `ALERTS_CHECK_URL`, a channel) | Repo side done; not live | Until set: ~25 red runs/day. **Before you set it**, the activation alert should get a minimum cohort and the check a send-once rule (§5.5) — otherwise expect a P2 every hour on small cohorts |
| **Activation alert** (newly able to fire) | Live in code, silent until alerts are configured | Now measures: of people who signed up 7-14 days ago, how many spent 30 s on a SOP in their first week. Lags one week; reads low because the SOP view is a browser event (§5.1) |
| **Secret charset** | Unchanged from MR-049 | Only `A-Z a-z 0-9 + / = _ -`; if a deploy stops on it, do not "redeploy" from the Hostinger panel |
| **Other secrets in the same shell block** | Unchanged | `SMTP_PASSWORD`, `CRON_SECRET`, etc. unchecked; the heartbeat (424) would reveal a broken email password |
| **Admin-account squat check** | Unchanged — and easier | `WHERE lower(trim(email)) IN (<allowlist>)`, one row per address, created by you. The admin user view now badges every allowlisted row, so a second row for your address will show "Admin" |
| **Prod `isAdmin` users** | Still open, now cosmetic | The flag confers nothing and nothing displays it; the column can stay |
| **Login lockout trade-off (#290)** | Decision pending | Adds: one colliding address, found online, can make your own logins lock you out for 15 min after a typo until the next restart (§3.2) |
| **#281 delivery test** | Partly answerable | Unchanged |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#216** extension untouched | 69 loops | Unchanged |

---

## 11. Verdict

Every number reproduces at `e4c3218`: web-app 3860 in 5 of 6 runs (one Prisma native crash, no test
failure), throttle file 10 of 10, workspace 5649, typecheck 0, validator clean at 113 open. Loop 110
does what MR-049 asked: other traffic cannot reset or disable an address's count, and parallel requests
are reserved. Loop 111 removes the last display of `isAdmin` and blocks the row honestly. Loop 112's
alert is now a ratio of one population.

The window's errors are second-order: the fingerprint rule hands a slot to its first claimant for as
long as the victim keeps logging in; the forgot-password table can be filled silently; the
coordinator's crypto edit is untested for the property it secures; and the newly-honest alert will
page hourly on tiny cohorts. Do next: #285 (loop 113); the activation-alert minimum cohort and
send-once rule before alerts go live (loop 114); amend #290 with §3.2-§3.4 and a key test; correct the
four intent-written sentences; file the Prisma crash.

---

### Appendix — reproducing §3.2 and §3.4

Copy `apps/web-app/src/lib/rate-limit/account-throttle.ts` to a scratch directory, replace the
`@/lib/email-normalize` import with `const normalizeEmail = (e: string) => e.toLowerCase().trim();`
(its whole body), run under `node --experimental-strip-types`:

```ts
// capture: J reserves the empty slot first; then the admin types one typo + the right password daily
__setSlotOverrideForTests(() => 777);
reserveLoginAttempt('junk@x.io', t);
for (let day = 0; day < 10; day++) {
  const now = t + day * D + 9 * H;
  reserveLoginAttempt('admin@x.io', now);                         // typo
  const r = reserveLoginAttempt('admin@x.io', now + 20_000);       // correct password
  if (r.allowed) recordLoginSuccess('admin@x.io'); else refused++;
}
// refused = 8 (control without the override: 0)

// forgot: 1,000,000 junk x 3, then 20,000 real addresses
// -> 61.8% refused (route answers "sent" without sending)
```
