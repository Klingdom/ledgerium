# MR-053 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 119-121, 2026-10-02. Commits `3e9f1fe` (loop 119, #298), `21384ad` (loop 120, #300),
`3eb9156` (loop 121, #297). Rows filed in the window: none. Rows closed: #298, #300, #297.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `3eb9156`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads. Local Node v24 and **pnpm 10.32.1** on Windows. CI pins Node 20,
**pnpm `version: 9`** (`deploy.yml:30-32`, resolves to 9.15.9 today), Linux. Local `main` is **33 commits
ahead of `origin/main`**, so nothing in this window has run in CI or reached production.

**Validation run for this review — all executed at `3eb9156`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 3955 (loop 121) | **3 of 3: 221 files, 3955 passed, exit 0** (15.6-16.0 s) | matches |
| root `pnpm test`, **×2** | 5741 | **2 of 2: 280 files, 5741 passed, exit 0** (18.9-19.1 s) | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 293 rows, 180 struck, 19/19 budget, **open 113** | reconciles: 113 (MR-052) + #298 + #299 + #300 (filed at MR-052 recording) − #298 − #300 − #297 = **113** |
| Validator on each window commit's own backlog (`git show <c>:…`) | — | `07fec52` 116 open · `3e9f1fe` 115 · `21384ad` 114 · `3eb9156` 113, **all exit 0** | no corruption slipped in the window |
| **CI test steps exactly as `deploy.yml:49,58` write them, local pnpm 10.32.1** | "exit 0 (5727 / 3941)" | `pnpm test --no-passWithNoTests` → exit 0, 5741; `pnpm --filter @ledgerium/web-app test --no-passWithNoTests` → exit 0, 3955; empty filter → exit 1 on both | matches the claim — **on the wrong pnpm** |
| **Same two commands under pnpm 9.15.9** (`npx -y pnpm@9`, the version CI installs) | — | **both exit 1 with `ERROR Unknown option: 'passWithNoTests'` — zero tests run** | **loop 120 breaks the quality gate (§4)** |
| Version-independent form `pnpm exec vitest run --no-passWithNoTests` (root) and `pnpm --filter @ledgerium/web-app exec vitest run --no-passWithNoTests` | — | **pnpm 9 and 10: real runs exit 0 (5741 / 3955); empty filter exits 1** | the fix (§4) |
| Emitter scan, independent cross-check | — | every `event: '<literal>'` in non-server, non-test `src` is on the allowlist; no double-quoted literals; no `.track(`, no aliased `track` import | the scan is complete **today** (§3.1) |
| #57 metrics, one signed-in forger | — | `dashboard-v2-retirement-metrics.ts` copied, `node --experimental-strip-types` | **one row flips a criterion** (§3.3) |
| Alert state machine | "48 h flapping still gives 2 pages" | `alerts/state-machine.ts` copied verbatim; per hour: `reduceAlertStates` → `decideAlertSends` → the route's write order (`check/route.ts:148-152`) | true for period-2 flapping only (§5.1) |
| Prisma `contains` on the real engine | "LIKE, `_` wildcard, case-insensitive" | scratch SQLite via `prisma db push`, Prisma 6.19.2, the store's query shape copied | **confirmed**; key-order fix holds; cost 180 ms (§5.2) |

**Not run:** Linux, Node 20, a GitHub runner, Playwright, `next build`, Docker, any HTTP request, production
data, secret values. No `curl`/`wget`. pnpm 9 was fetched with `npx -y pnpm@9` and run on this Windows
machine, not on Linux; pnpm's option parser is not platform-specific, but that is a reading, not a run. I
could not obtain `EXPLAIN QUERY PLAN` (my raw query used model field names, not the mapped column names;
not retried).

---

## 1. Lead

**Loop 120's fix does not run in CI. Under pnpm 9 — the version `deploy.yml:32` installs — `pnpm test
--no-passWithNoTests` is parsed by pnpm, not forwarded, and exits 1 with `Unknown option:
'passWithNoTests'` before vitest starts. Both test steps fail on every push; `build-and-push` needs
`quality-gate` (`deploy.yml:86`), so the first push of `main` deploys nothing — not loops 116-121, not the
alerts, not #298.** Every proof in loop 120's entry is real and ran on pnpm 10.32.1, which forwards the
flag. Nothing in the repo pins pnpm (`package.json` has no `packageManager`), so every local "CI command"
proof in this project runs a different package manager from CI.

This lands on top of my own advice: MR-052 §10 told the CEO that **"a red first run there is the step
working, not the push breaking."** With loop 120 in, a red first run is the push breaking, and my sentence
tells the reader to accept it. Corrected in §10.

Second: **loop 119's `userId not null` closes anonymous forgery of the #57 metrics and leaves them forgeable
by any signed-in user — and signup is free.** The metrics count events, not users, and trust a
client-supplied `chipsRenderedCount` with no upper bound. Executed: 40 honest users at bounce 0.25 /
chip-click 0.15; **one** forged `dashboard_v2_viewed` row with `chipsRenderedCount: 1e9` from one account
→ chip-click **1.2e-7** (criterion ≥10% fails); 300 forged views in three POSTs → bounce **0.10** (criterion
<40% passes). Loop 119's residual list says a signed-in user can forge "their own engagement, retention and
funnel rows" — the #57 rates are not anyone's own. The fix shape was mine (MR-052 §3.1: "`userId: { not:
null }` costs nothing legitimate") and the loop implemented it exactly. Third window running in which the
meta-review's fix shape is the defect's origin.

Third, smaller: loop 121's re-arm turns any flap with ≥2 consecutive firing runs back into repeated pages —
a 2-on/2-off P1 pages **12 times in 48 h** (was 2). The D-4 review states it ("as designed"); the log and
CHANGELOG state only the period-2 case.

Nothing needs reverting. Loop 120 needs a two-line follow-up before `main` is pushed.

---

## 2. Q1 — Re-run the claims

Every count reproduces (table). The window's two claims that did not hold are claims about CI, made from a
machine that is not CI.

---

## 3. Q2 — Loop 119, adversarially

### 3.1 Is the emitter scan sound? Today yes; three silent-miss shapes remain

`analytics-event-names.test.ts:96-146` resolves `track({...})` literals, `track(factory())` through the
factory's body, `trackActivation('<literal>')` through the milestone switch, and static `<TrackedLink
event="…">`; anything else fails loudly (`unresolved`, `dynamicLinks`). My independent grep of every
`event: '<literal>'` in client source found no name outside the 87, no double-quoted literal, no `.track(`
call, no aliased import of `track`. `useUpgradePromptViewed` emits a literal (`hooks/useUpgradePromptViewed.ts:39`,
in the table). `client_error` from `app/error.tsx:25` / `global-error.tsx:39` is covered. Server components
calling `track` are a no-op (`IS_BROWSER`), so not emitters.

Shapes the scan would miss **silently** (each yields "a real client event dropped in production with a
`console.warn`", i.e. data loss, not a security hole; zero instances today):

| Shape | Why silent |
|---|---|
| `import { track as t }` / `t({ event: 'x' })` | the regex is the literal token `track(` (`:105`) |
| `analytics.track(…)`, `foo.track(…)` | the lookbehind excludes a preceding `.` (`:105`) |
| `trackActivation(milestone)` with a variable | only `trackActivation\(\s*'(\w+)'` is matched (`:126`); a non-literal call is neither resolved nor reported |

Cheap hardening: fail on any `track as`, `.track(`, or `trackActivation(` whose argument is not a literal.

### 3.2 Removed names and deployed browsers

The 34 removed names (`121 − 87`, verified against `3e9f1fe^`) are 16 server-only + 18 with no emitter. A
cached pre-116 page still posts client `workflow_uploaded`: the batch filter drops it per event, keeps the
rest, returns 200 with `dropped`, and logs one `console.warn` per batch (`events/route.ts:70-76`). Harmless
drop, no error surfaced to the user; the server row now carries the fact. Production today is `origin/main`
(pre-116), so this applies on the first deploy and fades as tabs reload.

### 3.3 Does `userId not null` bias #57? Down, negligibly — and it was the wrong bias to worry about

`/dashboard/:path*` is behind the session-cookie middleware (`middleware.ts:31-32`); `sendBeacon` is
same-origin and carries the cookie, so real rows keep their `userId`. The stated downward bias (a session
expiring mid-visit) is real and small. The material problem is the other direction (§1):
`dashboard-v2-retirement-metrics.ts:87-103` counts every row, any number per user, and
`readChipsRenderedCount` accepts any finite non-negative number (`:73-75`) although the producer caps chips
at 5 (`workflow-metrics.ts:811`, sent as `insightChips.length` at `DashboardV2Shell.tsx:429`).

**Fix shape** (and the "is it true of every member?" question MR-052 adopted, which loop 119 did not ask
of its own filter): aggregate per user before rating (each user's views/bounces/clicks capped, or rates as
distinct users); clamp `chipsRenderedCount` to the producer's maximum; count a bounce only against a
same-user view. Sybil signups still move it, at the cost of N accounts — state that residual.

### 3.4 Is the writers × readers table accurate? Writers yes; readers partly

Fourteen sampled citations: 10 point at the line containing the name; 4 point at the `track({` line with the
literal on the next line (a consistent convention, fine). **The `compute-alerts.ts` reader citations are
stale at their own commit**: the table cites `:76`, `:93`, `:112`, `:116`; at `3e9f1fe` those lines are
`};`, `checkedAt,`, a comment, and `Promise.all([` — the queries are at `:82`, `:99`, `:118`, `:122` (the same
commit added six comment lines above them). And the Readers column omits readers that read *every* name:
first-touch attribution (`attribution.ts:184`, any event by `visitorId`) and the events GET totals and
`dailyCounts`. "-" in that column means "no name-specific reader", not "no reader".

---

## 4. Q3 — Loop 120

| Command (exact) | pnpm 10.32.1 (local) | pnpm 9.15.9 (CI's) |
|---|---|---|
| `pnpm test --no-passWithNoTests` | exit 0, 5741 | **exit 1, `Unknown option: 'passWithNoTests'`, 0 tests** |
| `pnpm --filter @ledgerium/web-app test --no-passWithNoTests` | exit 0, 3955 | **exit 1, same error** |
| `pnpm test` (pre-120 form) | exit 0 | exit 0, 5741 |
| `pnpm test -- --no-passWithNoTests <empty filter>` | **exit 0** (pnpm 10 forwards the literal `--`; vitest ignores the flag) | exit 1 |
| `pnpm exec vitest run --no-passWithNoTests` (+ empty filter) | exit 0, 5741 (exit 1) | exit 0, 5741 (exit 1) |
| `pnpm --filter @ledgerium/web-app exec vitest run --no-passWithNoTests` (+ empty filter) | exit 0, 3955 (exit 1) | exit 0, 3955 (exit 1) |

The `--` form is version-dependent in the opposite direction, so it is not a fix. The `exec` form behaves
identically on both. Also pin the package manager (`"packageManager": "pnpm@<x>"`, or CI `version:` equal to
local), or this class recurs: MR-052 caught Node 20 and Linux as unrun; nobody — the loop, the agent, me —
listed the pnpm major.

**Other steps that can pass on zero tests:** none found. The e2e jobs run `playwright test` with no
`--pass-with-no-tests` (Playwright fails on "no tests found" by default; not executed here) — they can pass
with every test skipped, which is a different hazard. No other CI step passes arguments after a script name
(`grep run: .*pnpm` over `.github/workflows/`).

---

## 5. Q4 — Loop 121

### 5.1 Patterns, executed against the real state machine

| Pattern | Hours | Pages | Note |
|---|---|---|---|
| f/o | 48 | **2** (h0, h24 reminder) | the stated case |
| **f/f/o** | 48 | **9** (every ~6 h) | D-4 states it; log does not |
| **f/f/o/o** | 48 | **12** (every 4 h) | D-4 "as designed"; log does not |
| f/f/f/o/o | 48 | 10 | — |
| f/i | 48 | 2 | never re-arms |
| f/i/f/f, then steady | 24 | 2 (h0, h4) | stated duplicate (F1) |
| f, i×5, f… | 26 | 2 (h0, h7) | re-arm path |
| f, i×30, f… | 51 | 2 (h0, h31) | quiet-new path; long insufficient spell fine |
| f, o, o, f×23 (MR-052's merge case) | 26 | **2 (h0, h4)** — was h0, h24 | **the fix works** |
| steady f | 48 | 2 | unchanged |

Legacy `continued` rows without `firingRuns` never re-arm (`state-machine.ts:124`) and are replaced at the
next `clear` — correct. No lost page found. The cost: re-arm cannot tell "second outage" from "flap with
duty ≥ 2"; one-incident-one-page (loop 118's purpose) now holds only for period-2 flaps. Defensible
(duplicate over loss); it belongs in the CEO's enable notes, not only in a D-4 file.

### 5.2 `contains` under the real engine (executed)

Prisma 6.19.2 on SQLite (production is SQLite: `schema.prisma:6`, `compose.hostinger.yaml:25`), the
store's `findFirst` shape copied:

- `alertId "a_b"` returned **`axb`'s row** — `_` is a wildcard, unescaped. `"abc"` returned `"ABC"`'s row —
  case-insensitive. M2's test (`store.like.test.ts:31-42`) holds for today's ids; the hazard is real for a
  future id, exactly as stated.
- A firing row stored `{"state":"firing","alertId":…}` is found by the two-needle `AND` — **M1 holds**.
- **Cost:** 200k rows (20k `alert_notified`), 8 alerts, up to 16 `findFirst`: **179-187 ms** per run, ×3.
  Hourly, fine. State rows are written only on change, so the 8-day window stays small.

### 5.3 `like-test-support.ts`

Imported only by three test files (`grep`); no production import, so Next does not bundle it (I did not run
`next build` to confirm). It **is** in coverage: the root `coverage.include` is `apps/*/src/**/*.ts` and
excludes only `*.test.ts` (`vitest.config.ts:28-33`), so a test helper counts as covered source. The
emitter scan also walks it (harmless). Rename to `*.test-support.ts` and exclude, or move under a test
directory.

---

## 6. Q5 — Practices

| Practice | Verdict |
|---|---|
| **Score over endorsement at loop 120** | Correct under the Selection Policy: no portfolio rule forced a pick, both candidates were burn-down, #300 (12) > #297 (10), the deviation was logged. The cost was not the deviation; it was that #300's confidence assumed a proof environment that was not CI's. |
| **D-4 persisted** (118 retroactively, 121 at the time) | Sufficient as an artifact: `D4_REVIEW_LOOP121_ALERTS.md` gives the machine, the must-fixes and follow-ups, and the must-fixes are traceable to tests. Gap: the flapping cost it found never reached the log or CHANGELOG. |
| **Recording scripts run the validator** | Confirmed in history: each window commit's own backlog validates, exit 0, open count monotone 116 → 113. The budget is at 19/19 — the next malformed row fails, by design. |
| **Writers × readers brief** | Working for writers: it moved the answer (16 server-only and 18 dead, against my 19) with **0 handbacks** at 119. It does not ask the reader-side question that mattered: *which readers aggregate across users, and can one user move them?* The `(userId not null)` annotations read as "safe" when they mean "attributable". |
| **"Second agent asks what the list claims"** (adopted MR-052) | **Did not fire at loop 119** — one agent (`security-reviewer`). The new trust boundary in that loop was `userId not null`, and it was untrue of its members in exactly the way the practice targets. |
| **Handback at 121** (1) | The D-4 must-fixes went back; the rule worked. |

---

## 7. Q6 — What the window got wrong

1. **Loop 120's flag breaks the CI gate under pnpm 9** (§4). Every push fails `quality-gate`; nothing
   deploys. Proven on pnpm 10 only; no `packageManager` pin. Not yet harmful only because nothing is pushed.
2. **`userId not null` ≠ trustworthy** (§3.3): one free account sets the #57 chip-click rate with one row and
   the bounce rate with three POSTs. Origin: MR-052 §3.1's fix shape. Residual list understates it — the
   same failure as MR-052 §7.2, one window later.
3. **MR-052 §10 told the CEO a red first CI run is expected.** Now false and dangerous; corrected in §10.
4. **Re-arm's flapping cost** (§5.1) stated in the D-4 file, not in the log.
5. **Writers × readers: stale `compute-alerts` lines and missing all-name readers** (§3.4).
6. **The adopted second-agent practice did not fire** at the loop it was adopted for.
7. Nothing to revert.

---

## 8. Q7 — Next pick (loop 122) and the portfolio

Pool 113 > 8 → `burn-down`. Last five: 117 test-infra/ci, 118 infra/monitoring, 119 security/analytics,
120 test-infra/ci, 121 infra/monitoring. No Area 3-consecutive.

| Candidate | Score | Notes |
|---|---|---|
| **New: CI test steps fail under pnpm 9** — `exec` form + pin pnpm | **~16** (I5 A5 L3 C5 E1 R1) | §4. Blocks the push, and the push blocks every CEO item in §10. Two lines + a pin; prove under **both** pnpm majors |
| **New: #57 metrics forgeable by one signed-in user** | **~12** (I4 A5 L3 C4 E2 R1) | §3.3. Per-user aggregation, chip clamp, same-user bounce. Before the CEO reads #57 |
| **AUTHZ P2-3 → promote** (`MR-053-promoted`) | **~11** (I3 A4 L1 C5 E1 R1) | `teams/route.ts:30-31` still selects by `userId` only: a removed member receives every active member's email, name, role. Audit-intake ~36 commits ago, past the 10-loop cold-pool cap, not a live row |
| #299 | 10 | bounded limiter table |
| #290 / #278 / #252 / #249 / #251 | 10 | #249/#251 untestable today; #278 partly CEO-bound |
| #294 / #287 / #268 | 9 | #268: unmeasured contrast on three user-facing map views |
| #270 / #265 / #275 | 8 | — |
| #216 / #271 (extension) | 8 / 9 | **blocked — CEO decision**; not selectable |

**Pick: the pnpm-9 CI row at loop 122** (`devops-engineer`; precedent: rows filed at a meta-review and
picked next). Brief requirement: run the exact `deploy.yml` lines under the CI's pnpm major and Node major
where possible, and record which were not run. Loop 123: the #57 per-user row (`security-reviewer` **plus**
a second agent asked "what does this filter claim about each row it admits?"). Loop 124: AUTHZ P2-3.

**Portfolio recommendation: pause the alert/analytics arc after loop 124.** Loops 109-121 are thirteen
loops of alerts, analytics ingest and CI — all of it invisible to a user, none of it deployed, and the last
three loops each fixed the previous meta-review's fix. The arc's returns are now mostly corrections of
itself. From loop 125, prefer user-visible product work (#268 map contrast first; #287 next). The extension
pause (~78 loops since `871e29a`) is **not** a selection-policy failure: both extension rows are CEO-blocked
and Chrome Web Store submission is a human step (`config.ts:16` still `…/placeholder`). No loop can move it;
only the decisions in §10 can.

---

## 9. Pattern — what this window adds

1. **"Proven locally" is a claim about the local toolchain.** Node 20 and Linux (MR-052), now the pnpm
   major. A CI change is proven only under CI's versions; list them, or say which were not run.
2. **"Attributable" is not "trustworthy".** A session id says who wrote a row, not that one writer cannot
   move a population metric. Ask of every aggregate: can one actor move it?
3. **The meta-review's fix shape is now the most common origin of the next defect** (MR-051 → 116 → MR-052;
   MR-052 → 119). Meta-review fix shapes need the same second-agent question as any trust boundary.
4. **A cost found in review must reach the log.** D-4 found the flapping cost; the entry claimed the opposite
   by stating only the friendly case.

No control-rule change proposed. Practice notes: CI-version line in any CI-touching brief; extend the
writers × readers brief with a reader-side column "can one actor move it?"; apply the second-agent question
to meta-review fix shapes before endorsing them.

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **Hold until the loop-122 CI fix lands** | 33 commits local (34 with this review). **Correction to MR-052 §10:** a red `quality-gate` on the first push is **not** "the step working" — with loop 120 in, both test steps fail under CI's pnpm 9 before any test runs (§4), and `build-and-push` will not run. After loop 122, a red `quality-gate` is again a real signal: read the failing test, do not override |
| **Alerts — ready to enable** | Repo side done; blocked by the push | Steps unchanged from MR-052 §10 (`CRON_SECRET`, `ALERTS_CHECK_URL`, a channel, re-run deploy, Run workflow). New caveats: a second outage now pages at ~h4 (fixed); **a P1 that flaps 2 h on / 2 h off pages every 4 h** (§5.1); a restart between a failed write and the next run still silences up to ~20 h |
| **#57 retirement decision** | **Not valid from deploy** | MR-052 said "do not read until loop 119 ships". Loop 119 shipped; **still do not read**: one free account flips chip-click with one row (§3.3). Wait for the per-user row |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Unchanged; protects four things (login/signup/reset per-IP limits, #290 lockout, silent reset denial, analytics ingest limit) |
| **#277 values** | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | Partly answerable | Heartbeat answers it once alerts are on — after the push |
| **#216** extension untouched | **~78 loops** (`871e29a`) | Unchanged; with #271 the only extension work, both waiting on you. Chrome Web Store submission is engineering-clear and human-only |

---

## 11. Verdict

Every number reproduces at `3eb9156`: web-app 3955 on 3 of 3, root 5741 on 2 of 2, typecheck 0, validator
clean at 113 open and clean at every window commit. Loop 119's emitter scan is complete for today's code and
closes anonymous forgery. Loop 121 fixes the merged-incident gap; its LIKE assumptions hold on the real
engine at 180 ms an hour.

The window's misses: loop 120's flag is unknown to pnpm 9, so the CI gate cannot pass and `main` cannot
deploy; and loop 119's session filter lets one signed-in user set both #57 rates — a fix shape I wrote. Do
next: the `exec` form plus a pnpm pin (loop 122) before any push; then per-user #57 metrics; then AUTHZ
P2-3; then leave the alert/analytics arc for user-visible work.

---

### Appendix — reproducing §3.3, §4, §5

```sh
# §4 — CI's pnpm major
npx -y pnpm@9 test --no-passWithNoTests                                   # exit 1: Unknown option
npx -y pnpm@9 exec vitest run --no-passWithNoTests                        # exit 0, 5741
npx -y pnpm@9 --filter @ledgerium/web-app exec vitest run --no-passWithNoTests zz_none   # exit 1
pnpm test -- --no-passWithNoTests zz_none                                 # pnpm 10: exit 0 (flag lost)
```

```ts
// §3.3  dashboard-v2-retirement-metrics.ts copied; 40 users: 200 views (4 chips), 50 bounces, 120 clicks
//   honest                         bounceRate 0.25, chipClickRate 0.15
//   + 1 view {chipsRenderedCount:1e9} from 'attacker'   chipClickRate 1.2e-7
//   + 300 views from 'attacker'                          bounceRate 0.10

// §5.1  alerts/state-machine.ts copied; hourly: reduceAlertStates(rows) -> decideAlertSends -> write
//   firing (if sent), resolved, clear, continued  (check/route.ts:148-152)
//   'ffoo' x12 -> pages h0 h5 h9 h13 ... h45 (12)

// §5.2  prisma db push to a scratch SQLite file; rows {"alertId":"a_b"} (5 h ago), {"alertId":"axb"} (1 h ago)
//   findFirst({ AND:[{properties:{contains:'"alertId":"a_b"'}}], orderBy:{createdAt:'desc'} }) -> the axb row
```
