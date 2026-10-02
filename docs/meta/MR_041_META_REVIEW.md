# MR-041 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 82, 83, 84, one non-counting Mode 3 correction to loop 80, the MR-040 recording
commit, and one after-the-fact backlog filing, all 2026-10-01. Commits `9f993be` (MR-040 recorded +
pool line), `bcb8a36` (Mode 3), `d48db86` (loop 82, #256), `d3dd164` (loop 83, #8/#253/#16),
`99a7436` (loop 84, #257), `53e7000` (#259 filed). Rows filed in the window: #256, #257 (by the
MR-040 commit), #258, #259.
**Date:** 2026-10-01
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike or a text correction is a recommendation for the coordinator to apply.

**Validation run for this review — all executed, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && npx vitest run` | 3346 (loop 84) | **191 files, 3346 passed, exit 0** | matches |
| `pnpm -r typecheck` | exit 0 | **exit 0** (all workspace packages report `Done`) | matches |
| `node scripts/validate-backlog.mjs` | open 107, oldest #9, median 3.5 | **252 rows, 145 struck, 19/19 budget, clean, exit 0; `open 107 \| oldest open non-blocked: #9 (proposed) \| median age-at-close, last 10: 3.5 loops (5 closures in older formats not dated)`** | matches what it prints; §2 is about what it computes |
| Pool line replayed at every window commit (the `9f993be` script against each commit's backlog + log) | MR-040 entry: "prints open 108" | **ef51119 108 · 9f993be 110 · bcb8a36 110 · d48db86 109 · d3dd164 107 · 99a7436 106 · 53e7000 107** | **the MR-040 entry's 108 is not what its own commit prints** (§2.1) |
| Wrapped handlers | 95 in 74 files | **95 `export const <METHOD> = withApiRoute(` in 74 `route.ts`; 93 of them in the 72 files under `app/api`** | count matches; guard scope does not (§3.3) |
| `text-brand-500` residual | 0 | **0** in `src` `.ts/.tsx` | matches |
| `text-brand-400` residual | 13 (#259) | **14** `.tsx` hits: 9 `hover:`/`group-hover:`, 4 bare, 1 `dark:` (`RealProductDemo.tsx:76`) | 13 if the dark-only variant is excluded — defensible, unstated |
| `await req.json()` sites behind #258 | 35 unguarded in 32 files | **35 calls in 32 files; 8 are `.json().catch(...)`, 7 sit in a `try` whose `catch` returns 400 → at most 20 unguarded** | **#258 overstates its own count** (§5 item 6) |

**Not run:** no `next build` (so every statement about build-time behaviour in §3 is read from
`node_modules/next/dist` 14.2.35 source and marked *derived*); no Playwright (loop 84's "public badge
scans 2/2" is taken from the log); no `curl`/`wget` (deny-listed; not worked around), so loop 82's
script was not exercised against any endpoint, stub or real. No production host, secrets or
GitHub settings were inspected; the deployment statements in §4 are from `compose.hostinger.yaml`
and `.github/workflows/deploy.yml` as committed.

---

## 1. Lead

**The window did the thing MR-040 asked for most — it read the pool — and the row it read was the
right one. Loop 83 retired #8, the oldest open row, with one mechanism that closed three rows. That
is the best selection decision in several reviews. Then the metric MR-040 installed to make that
visible reported the opposite.**

**The median age-at-close "improved" from 4.5 to 3.5 in the window that closed the two oldest rows
in the backlog.** `validate-backlog.mjs` dates a closure only from an `L<N>` birth cell
(`scripts/validate-backlog.mjs`, pool-line block); #8 and #16 have birth `—` and status
`new (iter 001)`, so the two ~82-loop closures were dropped as "older formats not dated" and the
median was taken over the young ones. The number is computed correctly by its definition and the
definition excludes, by construction, exactly the closures the number exists to show. That is the
MR-039/MR-040 shape again — an instrument whose blind spot is the thing it is meant to measure —
installed by the review that named the shape.

**Loop 82 closed #256 on a premise its own entry raised and then did not check.** The workflow is
correct as far as it goes. But production never receives `CRON_SECRET`: it is not in the web
service's environment in `compose.hostinger.yaml:22-70`, and not in the list `deploy.yml:132-181`
forwards. So `/api/admin/alerts/check` answers **500 "Server misconfiguration"** on every call
(`alerts/check/route.ts:33-37`) and will keep doing so after the CEO sets the two values the log
names. And if that were fixed, a firing alert would still go nowhere: `SLACK_ALERTS_WEBHOOK_URL` and
`ALERT_EMAIL_TO` are also absent from both files, and with neither set `sendAlertNotification` only
`console.log`s (`lib/notifications.ts:41-45`) while the route returns **200**. The entry's "Noted,
not filed: if `CRON_SECRET` is unset on the *server* …" is not a hypothetical. It is the committed
production configuration.

**Loop 83's wrapper is sound, and its stated hazard and its end-to-end proof are both wrong for this
Next version — in a way that does not hurt today and does hide a real, smaller hazard.** Next
14.2.35 does not write a prerender for a route-handler response with status ≥ 400 (≠ 404); it marks
the route `revalidate: 0` (`next/dist/export/routes/app-route.js:78-83`). A wrapper that swallowed
`DynamicServerError` would therefore also have shown "0 `/api` routes prerendered". The check the
coordinator ran cannot distinguish the correct wrapper from the dangerous one; the discriminating
evidence is the unit tests with Next's real errors. And the hazard the wrapper does introduce is
the inverse of the one described: for the two `force-static` routes, a genuine throw at build used
to fail the build (`app-route.js:108-109` re-throws non-dynamic errors); wrapped, it becomes a 500
response, Next quietly marks the route dynamic, and the build passes. *Derived from source; no build
run.*

**MR-040's two practices were applied, and both produced their first real results — a residual
taken from 21 to 0, a real agent rotation that caught its own errors.** Both also leaked in the way
MR-040 predicted for everything else: each residual was counted over the scope of the change, not
the class. Loop 82's residual counts callers under `.github`, not whether the alert can fire. Loop
83 filed #258 with a token count (35) that is roughly twice the defect count. Loop 84 recorded a
residual in prose and the log still says it created no follow-ups.

---

## 2. Q1 — Re-run the claims; does the pool line compute what MR-040 §7 specified?

### 2.1 The numbers

Test count, typecheck and the validator's printed line all reconcile (table above). The pool
trajectory, replayed commit by commit with the line's own code: **110 → 110 → 109 → 107 → 106 →
107**. Net −3 over the window, all from loop 83 (+1 −3) and loop 84 (−1, then +1 for #259 fourteen
seconds later). Loop 83's "pool down two" is correct.

**The MR-040 recording entry and commit message say the line "now prints `open 108` … It reproduces
MR-040's hand measurement exactly."** At `9f993be` it prints **110**: the same commit filed #256 and
#257. 108 is the value at `ef51119`, the review's measurement point. The arithmetic was not wrong —
the claim of having run the line and seen 108 is. A pool line is only useful if the number quoted
beside a commit is the number that commit prints.

### 2.2 Definitions against MR-040 §7

| Field | MR-040 §7 specified | Implemented | Verdict |
|---|---|---|---|
| open | unstruck rows above `END_MARKER` | same | **Sound**, with one inflation: unstruck rows whose status says they are not open still count — #144 `**SUPERSEDED by row #159**`, #110 `partially done`, one `DEFERRED post-MVP`. Small (≤3) and arguably correct to keep visible; say so in the comment. |
| oldest | "oldest open non-blocked", shown as `#8 (iter 001)` | lowest unstruck id whose status does not match `/blocked\|awaiting CEO/i`; prints the **status** when the birth cell is `—` | **Lowest id = earliest filed is sound** — ids are monotonic and unique (checked: no duplicates). But the output now reads `#9 (proposed)`, which states no age at all. The field exists to show how long the pool has gone untraversed; it no longer says. A superseded or deferred row can also be named "oldest". |
| median | age at close, last 10, closing loop from `ITERATION_LOG.md` (which V4 already reads) | closing loop parsed from `CLOSED (at )?loop N` **inside the struck row**; birth only from an `L<N>` birth cell; others skipped and counted | **Biased toward young closures.** Every row filed before the `L<N>` birth format is undatable, and those are the old rows. In this window the skipped closures are #8 and #16 (~82 loops each). The median moved 4.5 → 3 → 4 → 3.5 while the window closed the backlog's two oldest rows. |
| delta "vs 3 loops ago" | specified | not implemented (stated in the MR-040 entry) | acceptable; the review compares lines |

**The specific questions:**

- *Does "CLOSED loop N" pick the right loop in rows naming several loops?* It takes the **first**
  match. Only one struck row has two (`#109`: loops 57 and 63); it has no `L<N>` birth, so it is
  skipped anyway. Correct today by accident; brittle. Prefer the last match, or the log.
- *Rows closed by another row's loop (#253, #16 "by #8")?* Handled: each carries its own
  `CLOSED loop 83`, so the closing loop is right. #253 is dated (age 4). #16 is not — not because of
  the "by #8" phrasing, but because of its birth format. The failure is the same one as above.

**Recommendation (governance tooling, same commit that records this review, no loop):** date
`new (iter NNN)` rows using MR-039's convention (iter 001 ≈ loop 1) and print the maximum
age-at-close alongside the median — `median 3.5 (max 82)` this window. Show the oldest row's age,
not its status. Exclude `SUPERSEDED`/`DEFERRED` statuses from "oldest". Each is a few lines; the
first alone reverses the sign of this window's reading.

---

## 3. Q2 — Loop 83's wrapper (`apps/web-app/src/lib/with-api-route.ts`)

### 3.1 Is every Next 14.2 control-flow throw re-thrown?

**Yes, for this version.** `isDynamicUsageError` in 14.2.35
(`next/dist/export/helpers/is-dynamic-usage-error.js`) is exactly: `DYNAMIC_SERVER_USAGE`
(`client/components/hooks-server-context.js:23,28`), `BAILOUT_TO_CLIENT_SIDE_RENDERING`
(`shared/lib/lazy-dynamic/bailout-to-csr.js:29`), and navigation signals (`NEXT_REDIRECT;…`,
`NEXT_NOT_FOUND`, `client/components/not-found.js:27`). Plus `code: NEXT_STATIC_GEN_BAILOUT`. The
wrapper re-throws all four (`with-api-route.ts:46-58`) and any `NEXT_`-prefixed digest. React's
postpone signal is not covered, but PPR is off. The tests construct the real errors
(`with-api-route.test.ts:5-7,64-99`). This is the strongest part of the change.

### 3.2 Does any route depend on a throw propagating?

| Case | Finding |
|---|---|
| **NextAuth** `[...nextauth]` | `GET`/`POST` wrap `handlers.GET/POST` (`api/auth/[...nextauth]/route.ts:4-5`). Auth.js returns responses for its own errors; an escaping exception now becomes the project's JSON 500 instead of Next's default 500. Benign. |
| **Thrown `Response`** | `requireFeature` *throws* a `NextResponse` 403 by design, and its docstring shows calling it bare (`lib/feature-gating.ts:113-131`). Its one caller catches it locally (`workflows/[id]/export-json/route.ts:36-41`), so nothing breaks today. **Latent:** the next route that follows the docstring gets a **reported 500 instead of a 403** — a client entitlement check inflating the server-failure alert, #258's class. One line in the wrapper (`if (error instanceof Response) return error`) closes it. |
| **Streaming** | No route uses `ReadableStream`/`TransformStream`/`text/event-stream` (grep: 0). An error inside a stream after the `Response` is returned would bypass the wrapper; nothing does that today. |
| **HEAD / OPTIONS** | No route exports either (grep: 0). Next auto-implements HEAD from the exported (wrapped) GET, so HEAD inherits the wrapper. No change. |
| **Route segment config** | `dynamic`, `dynamicParams`, `generateStaticParams` remain separate exports (e.g. `download.md/route.ts:31-32,44`); unaffected. |
| **`force-static` routes** | **Changed.** `llms.txt` and `sop-templates/[slug]/download.md` execute at build. A genuine throw used to fail the build. Now it becomes a 500 response, which `app-route.js:78-83` treats as "not prerenderable" (`revalidate: 0`), so **the build passes and the route ships broken**, re-run per request. *Derived from source; not built.* |

### 3.3 Is guard D sound and non-vacuous?

**Non-vacuous: yes** — floor ≥ 90 wrapped (`api-error-coverage.test.ts:126-127`), per-method check,
and a file that exports no detectable method fails. **Sound for what it scans; it scans 72 of 74
files.** `API_ROOT = __dirname` (`:29`) — MR-040's G-3 blind spot, carried into a new guard. The two
unguarded files are the two `force-static` routes of §3.2, i.e. the only routes whose wrapping
changes build behaviour. The commit and log say "all 95 handlers in all 74 route files … Guard D
fails on any unwrapped handler"; the guard holds 93. Also latent: a file that exports a wrapped
`POST` and `export { x as GET }` passes, because the `export { … as … }` form is not parsed.

### 3.4 Is "0 /api routes prerendered, before and after" the right test?

**It is the right thing to look at and it is not sufficient — it is non-discriminating for the
stated hazard.** The log's hazard is "a wrapper that caught everything would have quietly turned
those into static routes serving a frozen 500". In 14.2.35 the export step refuses to write a ≥ 400
body (`app-route.js:78-83`), so both the correct wrapper and a swallowing one yield 0 prerendered
`/api` routes. The check confirms nothing regressed; it does not confirm the re-throw works. What
would: (a) the unit tests with real Next errors, which exist; and (b) a build-log assertion that no
`[api] unhandled error` line is printed during `next build` — a swallowed `DynamicServerError` logs
there (`with-api-route.ts:65`) even though `reportApiError` is suppressed at build. The coordinator
recorded "build-time `api_error` lines 0", which is suppressed by `NEXT_PHASE` regardless
(`api-error-reporting.ts:67`) and so also cannot fail. The `[api] unhandled error` count is the line
to add. The hazard description in `with-api-route.ts:25-27` and the log should be corrected to the
version actually installed: the frozen-500 mechanism is a real risk on upgrade, not today's.

---

## 4. Q3 — Loop 82's workflow

### 4.1 What remains unverified

1. **Real curl's `--config -` on the runner** and `actionlint` — stated plainly in the log. Honest.
2. **The production endpoint can succeed at all.** Not stated, and not true as committed (§1):
   `CRON_SECRET` is not forwarded to the container (`compose.hostinger.yaml:22-70`,
   `deploy.yml:132-181`). Setting the GitHub secret does not set the server's.
3. **Delivery of a firing alert.** A 200 means "evaluated", not "delivered":
   `Promise.allSettled` swallows channel failures (`alerts/check/route.ts:66-78`), and with no
   channel configured the notification is a console line (`notifications.ts:41-45`). Neither channel
   variable is forwarded in production. The workflow cannot see this by design (body never read),
   so it is invisible to every check in the window.
4. **Diagnostics.** The script's comment says `-S` shows transport errors (`alerts-check.sh:68`);
   `2>/dev/null` on the same command (`:77`) discards them. A failing run says "curl exit 6" and
   nothing else. Harmless to correctness, costly at 3 a.m.

### 4.2 Is "fail loudly when unconfigured" right?

**In principle, yes — the grey-skip argument is correct and well made.** In practice the CEO action
named in the log ("set `CRON_SECRET` and `ALERTS_CHECK_URL`") will not stop the hourly failures: the
job moves from exit 2 (unconfigured) to exit 1 (HTTP 500 from the misconfigured server), with a log
line that reads like an outage. The pressure is intended; pressure pointed at the wrong action is
noise that teaches its recipient to ignore it. Before the CEO is asked, the repo-side half must be
done: forward `CRON_SECRET`, `ALERT_EMAIL_TO`, `SLACK_ALERTS_WEBHOOK_URL` through `deploy.yml` and
`compose.hostinger.yaml` (same `${VAR:-}` pattern as Stripe). Also: each 500 is itself reported as
`api_error` — one per hour toward a threshold of > 10 (`compute-alerts.ts:177-183`). Small, but it
is the alert's own checker contributing to the alert.

### 4.3 "Nothing in the repo calls alerts/check"

**Correct.** Searched everything tracked except governance prose: callers are only the new workflow
and the route's tests. `Dockerfile:163-164` `HEALTHCHECK` probes `/api/health`, not alerts, and only
marks the container unhealthy. `compose.hostinger*.yaml` schedules only the backup sidecar
(`backup-cron-entrypoint.sh`). No `vercel.json`/`railway.json`/`render.yaml`/`fly.toml`. The other
six workflows do not reference it. `docs/reviews/website-state-2026-06-14/PERFORMANCE.md:136` had
already recommended adding `CRON_SECRET` to `deploy.yml` — three and a half months before the loop
that needed it.

---

## 5. Q4 + Q5 — MR-040's practices, and what the window got wrong

### 5.1 Were the practices applied, and did they change outcomes?

| Loop | Delegation rule | Residual line | Outcome |
|---|---|---|---|
| 82 | `devops-engineer` ran suite/typecheck/YAML, not the core cases. Logged as **"delegated-with-coordinator-verification, not a clean rotation"** — a third category the rule does not have. By the rule it is `coordinator (drafted by devops-engineer)`; the streak becomes **10**. The entry reports no streak number. | `callers of alerts/check under .github: 0 → 1` — **counts the change, not the class.** The class is "alerting is not live"; its residual would have read the server env and found §4.1(2). | Practice applied in form. Did not change the outcome. |
| 83 | `backend-engineer` ran suite, typecheck, two builds, prerender comparison; coordinator re-ran. **Real rotation by the rule.** Streak resets. | `unwrapped exported handlers 95 → 0` — true, but the guard that is meant to hold it at zero holds 93 (§3.3). | **Changed the outcome.** The agent caught its own sync-handler break and the `-s` typecheck flag hiding a failure. Independent value of the kind MR-040 said delegation had not produced. |
| 84 | Coordinator; correctly notes 83 reset the streak. | `text-brand-500: 21 → 0`, repo-wide, held by a source guard. | **Changed the outcome.** The best residual in the programme. |

**Loop 84's recorded residual.** It counted 13 `text-brand-400` uses and wrote them into prose;
`53e7000` filed #259 fourteen seconds after the loop commit. The filing is right and fast; the entry
was not amended, so `ITERATION_LOG.md` still reads *"Follow-ups: 0 created, 1 closed"* — the
follow-up count is wrong in the log of record. More substantively: **9 of the 14 remaining sites are
in files loop 84 edited** (`account/page.tsx`, `purchase-success/page.tsx`, `dashboard/page.tsx`,
`upload/page.tsx`, `DemoDashboard.tsx` ×2, `RealProductDemo.tsx`, `OnboardingChecklist.tsx`,
`ComparePageView.tsx`), and the entry fixed `hover:text-brand-400` *"on the lines this row touched"*.
The residual practice made the leftover visible — that is its job and it did it — but the scope
decision was still "my diff", one shade over. Defensible as scope discipline for a row named
`text-brand-500`; it should be said in those words rather than as "different class", because the
measured failure (1.84:1) is identical.

**Verdict:** the delegation rule worked as a measurement (one real rotation, honestly counted). The
residual rule worked where the class is a token (`text-brand-500`) and failed where the class is a
property (alerting live; malformed input handled), because a property cannot be grepped and the
loops grepped the nearest token instead. That is the refinement in §8.

### 5.2 What the window got wrong

1. **MR-040 entry, `ITERATION_LOG.md` (MR-040 section) and commit `9f993be`** — *"prints `open
   108` … reproduces MR-040's hand measurement exactly."* At that commit it prints 110. §2.1.
2. **Loop 82, entry and commit `d48db86`** — *"Not live until `CRON_SECRET` and `ALERTS_CHECK_URL`
   are set."* Also needs the server-side `CRON_SECRET` forwarded and an alert channel configured;
   neither is in the deploy config. **#256 was closed on a fix that cannot succeed in production as
   committed.** §4.1.
3. **Loop 82** — *"A dead database makes `computeAlerts` throw, the route returns 500, the job
   fails. That is the independent signal."* True, and today indistinguishable from the
   misconfiguration 500 the job will see every hour. The signal is not yet independent of the
   noise. §4.2.
4. **Loop 83, entry and `with-api-route.ts:25-27`** — the frozen-500 mechanism, and the prerender
   count offered as its end-to-end check. Neither holds for 14.2.35. §3.4.
5. **Loop 83** — *"all 95 exported handlers in all 74 route files … Guard D fails on any unwrapped
   handler."* Guard D scans 72 files. §3.3.
6. **Loop 83 / #258** — *"35 `await req.json()` calls across 32 route files have no parse guard."*
   8 use `.json().catch(...)`; 7 are in a `try` whose `catch` returns 400 (e.g.
   `admin/password-reset-link:152-155`, `analytics/compare:52-54`, `dashboard/preferences:118-122`);
   `analytics/events:15` returns 200 `ok:false` (`:96-100`). **At most 19-20 are unguarded.** The
   row counted the token, not the defect, and its impact/effort were scored on the larger number.
   This is the residual practice producing a confident wrong number.
7. **Loop 84** — *"Follow-ups: 0 created"* (§5.1); and "13" without stating that the 14th
   (`dark:text-brand-400`) was excluded as dark-only.
8. **Loops 82 and 84 — selection vocabulary, second review running.** Both log `top-score` with the
   pool at 109/107 against Follow-Up Debt Policy clause 6 (> 8 ⇒ `burn-down`). MR-040 §5.10 flagged
   it; nothing changed. Loop 83 correctly logged `burn-down`. Either clause 6 is retired in practice
   (a CEO-visible governance change) or two labels are wrong.
9. **Mode 3 `bcb8a36` — nothing to correct.** It verified both upward mechanisms in code before
   writing them into UI, rejected a brand-voice suggestion on accuracy grounds (the suggestion
   re-introduced the one-direction error), and named the missing render harness as the reason the
   class reached shipped UI twice. This is how a correction should read.

---

## 6. Staleness triage — the new oldest rows

With #8 gone, the "oldest" field names #9. Five oldest open, non-blocked, checked against code:

| Row | Text | Against code | Verdict |
|---|---|---|---|
| **#9** | structured error logging with session context | `withApiRoute` now logs every escaped exception with its endpoint (`with-api-route.ts:65`); no session/user context, no structure | **keep — re-scope** to "add request/session context to the wrapper's log line", which is now one place. Score likely rises. |
| #10 | event-bundle integrity checks (experiment) | not checked | keep-unverified |
| #11 | `(db as any)` casts | MR-040: 71 | keep |
| #12 | Prisma migrations baseline | MR-040: no baseline migration | keep |
| #17 | shared ingestion service | MR-040: two routes exist | keep-unverified |

Loop 83 also made #9 cheaper, which is the second time in two reviews that the oldest row turned out
to be adjacent to the work in hand.

---

## 7. Next pick (loop 85)

**Policy.** Last five Areas: 80 analytics, 81 a11y, 82 infra/monitoring, 83 api, 84 a11y. No
three-consecutive run; no Area at 3 of 5, so no saturation penalty. No release blockers open. Pool
107 > 8 → clause 6 `burn-down` (every candidate is a follow-up).

**File first (one row, from §4):** *"alerts/check cannot succeed in production: `CRON_SECRET`,
`ALERT_EMAIL_TO` and `SLACK_ALERTS_WEBHOOK_URL` are not forwarded to the web container
(`compose.hostinger.yaml:22-70`, `deploy.yml:132-181`); with no channel, a firing alert is a console
line behind a 200."* Reopening #256 is the more honest record; either works if the log says #256's
closure premise was wrong. Suggested score I5 A5 L3 C5 E1 R2 = **15**.

| Row | Score | Notes |
|---|---|---|
| **New row (alerts not deliverable in prod)** | **15** | Repo-side: forward three variables; make the misconfiguration answer distinguishable from an outage (e.g. 503, so the job can label it without reading the body); keep "fail loudly". Infra Area. |
| #258 ⊕ #254 | 10 / 12 | One outcome: *client input reported as a server failure*. A body helper does not cover #254's query param, so the row should be "input → 400" for body **and** query, with #258's count corrected to ≤ 20. Do after the alert is live, since that is when false `api_error`s start to page someone. |
| #259 | 11 | Finish the brand-400 class; extend #257's guard. |
| #9 (re-scoped) | 11+ | Session context in the wrapper log; small now. |
| #255 | 11 | MR-040's pick; still open. |

**Pick: the new alert-delivery row** (`burn-down` if filed as a follow-up of #256, which it is).
`devops-engineer` *only if it runs validation itself*. Validation must include a `residual:` line
over the **property**, not a token: *"variables the alerts path reads (`grep process.env` in
`alerts/check`, `notifications.ts`, `compute-alerts.ts`) that are absent from the deploy config: N →
0."* This is the first loop where the residual practice must be stated as a property check, and it
is a good test of whether it can be.

**Runners-up, in order:** #258⊕#254 (merged, recounted); #259; #9 re-scoped.

**Also recommend, small, no loop needed or folded into the above:** pass thrown `Response`s
through `withApiRoute` (§3.2); extend guard D's root to `app/` (§3.3); count `[api] unhandled error`
lines in the build log instead of `api_error` lines (§3.4); correct the hazard comment in
`with-api-route.ts:25-27`.

---

## 8. Pattern — what this window adds

1. **The pool was read, and it paid.** Loop 83 is direct evidence for MR-040 §2.4: the oldest row
   was the highest-leverage item, and the pool line's "oldest" field drove the selection. Keep it.
2. **A metric installed to expose a blind spot shipped with the blind spot.** The median excludes
   the old closures; the oldest field stopped stating age; the MR-040 entry quoted a number its
   commit did not print. Instruments need the same "does it measure the case it exists for?" test
   as code.
3. **Residuals were counted over tokens when the class was a property.** Grep is the right tool for
   `text-brand-500` and the wrong one for "alerting is live" or "malformed input is a 400". When the
   class is a property, the residual is a check of the property (config forwarded; parse guarded),
   and the count must be of defects, not of call sites.
4. **The hypothetical in "Noted, not filed" was the finding.** Loop 82 named the server-unset case
   and did not open the deploy config two directories away. Recommend: an entry may not write "if X
   …" about a fact the repository can answer; check it or file it.

None of these needs a new rule. (1)-(2) are fixes to the script; (3)-(4) are clarifications of the
`residual:` practice adopted at MR-040.

---

## 9. CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **NEW — #256 alert delivery** | Workflow shipped; not live. | **Three values, two places, in order:** (1) engineering forwards `CRON_SECRET` + an alert channel through `deploy.yml`/`compose.hostinger.yaml` (repo change, not a CEO action); (2) CEO sets `CRON_SECRET` as a deploy secret **and** as the Actions secret (same value), `ALERTS_CHECK_URL` as a repo variable, and **one channel** — `ALERT_EMAIL_TO` (SMTP already configured) or `SLACK_ALERTS_WEBHOOK_URL`. Until (1), doing (2) does not stop the hourly failure email. Decision also needed: accept the hourly failures as intended pressure (recommended, once (1) is done). |
| **#216** extension untouched | `871e29a`, **41 loops**, CEO-blocked. **Seventh ask.** | Nothing. |
| **#57 criterion 1** bounce < 40% | Not decision-grade (#249, #251). | Mode 3 `bcb8a36` now says so on the page. Definition (per view vs per user) still open. |
| **#57 criterion 3** chip-click ≥ 10% | Threshold is a CEO number; net bias direction unmeasured (now stated on the page). | Define the metric before setting the number. |
| **#57 criterion 2** | Not re-checked. | — |
| **#225** `TRUSTED_PROXY_HOPS` | Forwarded, defaults to `0` (`compose.hostinger.yaml:39`); auth rate-limits bypassable until set. | Unchanged. |
| **#212** E2E deploy gating | Waits on one green `real-extension` run. | Unchanged. |
| **#190 / #193** CLAUDE.md edits | Awaiting approval since MR-020/021. | Unchanged — twenty-one reviews. Approve, reject or strike. |
| **#191** billing | Awaiting decision since loop 7. | Unchanged. |
| ~~Ratio vs pool line~~ | Pool line implemented at MR-040. | **Closed** — but see §2.2: its median currently reports the opposite of this window. |
| **Selection vocabulary** (§5.2 item 8) | Clause 6 vs `top-score` labels. | Second review running. Either retire clause 6 explicitly or label `burn-down`. |

---

## 10. Verdict

All claimed numbers reconcile. The loop read its own pool for the first time in several reviews,
picked the oldest row on evidence, delegated to an agent that actually validated and caught its own
errors, and ran a class fix to zero with a guard that holds it there. Those are real changes in
behaviour, traceable to MR-040, and they should be kept.

But the window closed #256 on a fix that cannot succeed in production as committed — the server
never receives the secret, and a firing alert has no channel to go to — and the entry had named
exactly that case as a hypothetical. The wrapper is correct and its proof is not discriminating. The
pool line's median moved the wrong way in the window that retired the two oldest rows. #258's count
is roughly double the defect. Each is the residual practice applied to a token when the class was a
property.

Apply to the script now: date `iter NNN` rows, print max age, show the oldest row's age. File the
alert-delivery row and take it at loop 85. Correct the four log statements in §5.2 items 1, 2, 5
and 7, and #258's count.
