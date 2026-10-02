# MR-040 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 79, 80, 81 and one non-counting Mode 3 correction to loop 79, all 2026-10-01.
Commits `3bf149c` (loop 79, #246), `3cad72c` (loop 80, #247), `5a2fe2d` (Mode 3), `ef51119`
(loop 81, #245). Rows filed in the window: #253, #254, #255.
**Date:** 2026-10-01
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike or a text correction is a recommendation for the coordinator to apply.

**Validation run for this review — all executed, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && npx vitest run` | 3333 passing (loop 81) | **189 files, 3333 passed, exit 0** | matches |
| `pnpm -s typecheck` (root) | 0 errors | **exit 0, no output** | matches |
| `node scripts/validate-backlog.mjs` | 248 rows, 140 struck, clean | **248 rows, 140 struck, 19/19 malformed-row budget — clean, exit 0** | matches |
| Route counts behind #253 | 72 routes, 20 with no `catch` | **72 `route.ts` under `app/api`, 20 with no `catch`**; 8 files with a `{ status }` helper | matches |

**Not run:** no Playwright suite (no dev server/auth in this session), so the loop-81 scan claims
(`sop-template` 2/2, `/product` held) are taken from the diff and spec, not re-executed. No
production build. No production data. Every magnitude below that is not a count of source lines is
derived from code and marked as such.

---

## 1. Lead

**The window's validation claims all reconcile against a fresh run, and the window's two
substantive fixes both reproduce the class they were closing — each one inside its own
verification.**

**Loop 79 moved `api_error` server-side because "the client pipeline can only subtract". The
server pipeline also subtracts, and it subtracts the largest failure population there is.**
`trackServer` persists `api_error` with `void db.analyticsEvent.create(...)` into the same database
(`lib/analytics-server.ts:66-76`), and `api_error_spike` counts it back out of that database
(`lib/compute-alerts.ts:174-180`). 39 of the 46 literal 5xx sites sit inside a `catch` that follows
database work. When the database is what failed, the report is a write to the thing that failed.
The sharpest instance is `/api/health`: it reports `503` only from the branch where `SELECT 1`
against the database has just thrown (`api/health/route.ts:36,87`) — **the one site in the
codebase whose report is lost by construction, every time it fires.** And loop 79's end-to-end
proof provokes the failure with `new Error('db unavailable')` while the mocked
`analyticsEvent.create` keeps succeeding (`lib/api-error-reporting.test.ts:22-34,101`). The fixture
names the scenario in which the report cannot be stored, and then stores it. That is MR-039 §5.1's
shape exactly: a test structurally incapable of running against the failure it claims to exercise.

**Loop 80 corrected its agent for claiming the bounce error runs one way — and then shipped the
same one-way claim for chip-click rate.** The contract says the rate is biased upward *"when
[`viewsMissingChipCount`] is > 0"* (`lib/dashboard-v2-retirement-metrics.ts:33`), and the page shows
its caveat only then (`analytics/product/page.tsx:802-806`). There are two further upward
mechanisms that operate when the count is zero (toggle-off clicks; the error→retry path) and one
downward mechanism (clicks are lost by the same delivery pipeline MR-039 audited). In the common
case the page shows the rate with no caveat at all.

**Loop 81 closed #245 on the instances axe could see, not the class the row described.** 21
`text-brand-500` text uses remain in 16 files. One of them is `PublicNav.tsx:368` — the same
`leaf.badge`, rendered with the same `text-brand-500 bg-brand-900/30` tint pair, in the same file
loop 81 edited, eight lines from a site it fixed. It is inside the nav dropdown panel, which is
closed during the scan.

**And the oldest open row in the backlog was the right fix for loop 79.** #8 (`new (iter 001)`,
~80 loops) prescribes *"ONE shared handler wrapper enforcing … a non-leaking 500, applied
mechanically — not 25 independent edits."* Loop 79 made 54 independent edits, compensated with a
regex guard, and filed #253 for the uncaught-exception gap — which is #8's own surface. #16
(`DELETE /api/keys`, also iter 001) and #254 (filed loop 80) are the same family. Four rows, one
outcome, and the loop that touched all of it never read the one that said so.

**MR-039 §7 said "Do not defer again." It was deferred again.** And measuring it now shows the
hand-grep it was meant to replace has been wrong for at least two reviews: the "open pool" MR-038
and MR-039 reported (122) includes the 19 rows of the *Completed (historical)* table. The real open
pool is **108**.

---

## 2. Q1 — Verify the window's claims independently

### 2.1 The headline numbers: all reconcile

See the table above. Test count, typecheck, validator output and the #253 route counts all match
exactly. Loop 80's arithmetic chain (3315 → 3328 → 3329 after the Mode 3 correction → 3333 after
loop 81's +4) is consistent with the final count.

### 2.2 Loop 79's coverage guard: what it actually enforces

`api-error-coverage.test.ts` enforces three properties over a set of files and a set of spellings.
Both sets are narrower than "every 5xx this codebase sends" (`:9-11`), and the docstring's single
named exclusion (escaped exceptions, #253) is not the only one.

| # | Blind spot | Evidence | Live today? |
|---|---|---|---|
| G-1 | **A variable status not named `status`.** Rule B detects a helper only by the shorthand `{ status }` (`:77-79`). `{ status: result.status }` matches neither A nor B. | `api/invites/accept/route.ts:303` — `NextResponse.json({ error: result.error }, { status: result.status })`. Every value `result.status` takes today is 4xx (`:218-249`), so nothing is missed *yet*. The first `status: 500` added to that transaction's return objects is invisible to the guard. | **Latent**, at a known site |
| G-2 | **Spelling.** Rule A matches `status: 5\d\d` with exactly one space (`:63`). `{status: 500}`, `status:  500`, `"status": 500`, `{ status: HTTP_500 }` and `status: ok ? 200 : 500` all pass. No formatter is configured (no prettier config at root or in `apps/web-app`), so single-space is convention, not invariant. | grep for each variant across `src/app/api`: zero hits today. | Latent |
| G-3 | **File scope.** `API_ROOT = __dirname` (`:29`) and `name === 'route.ts'` (`:36`). Two route handlers live outside `app/api`: `app/(public)/sop-templates/[slug]/download.md/route.ts` and `app/llms.txt/route.ts`. Neither is scanned. | Neither sends a literal 5xx today; both can throw, which is #253's class. | Latent |
| G-4 | **Responses built in `lib/`.** `lib/feature-gating.ts:124-131` throws a `NextResponse` from library code. Any 5xx built the same way is outside the scan. | Today it throws 403 only. | Latent |
| G-5 | **Rule B checks presence, not placement.** It requires the line `reportApiError('<endpoint>', status);` to exist *somewhere* in the file. A second `{ status }` response outside the helper passes. | Structural; no instance found. | Latent |

**Verdict on the guard:** it enforces what it says for the shapes it was written against, and it is
mutation-checked against those shapes. "Any unreported literal 5xx" in the commit message is true
only for one spelling in one directory. None of G-1…G-5 is a live miss today; G-1 is one edit
away from being one, at a known line. Every one of them disappears if #8's wrapper exists, because
then reporting is a property of the handler boundary rather than of each response literal — which
is the larger point of §2.4.

### 2.3 The population blind spot loop 79 did not ask about

Loop 79's stated reason for going server-side is good reasoning applied to the wrong comparison:
*"the client pipeline can only subtract … the server is also the only place that sees the
extension and API-key callers."* Both true. What it did not ask is **which failures the server
reporter loses**, and the answer is the dominant ones:

- `trackServer` writes through the application database, fire-and-forget, and swallows the
  failure to `console.error` (`lib/analytics-server.ts:66-76`).
- `api_error_spike` reads only that database (`lib/compute-alerts.ts:174`).
- I counted the 46 literal sites: **39 are inside a `catch`**, and the `try` they close is,
  in the routes I read, database work (e.g. `api/teams/route.ts:61-62`, the route the e2e test
  provokes). The other 7 are configuration/availability guards (`alerts/check:36`,
  `billing/checkout:159,340`, `bootstrap:171`, `invites/accept:336`, `sample-variants:25`,
  `sample-workflow:27`).
- `/api/health` is the limiting case: `reportApiError('/api/health', 503)` executes **only** after
  `db.$queryRaw\`SELECT 1\`` has thrown (`api/health/route.ts:36,87`). Its report is never stored.
- The health route reads a SQLite file path (`sqliteFilePath()`, `:42`) and computes a disk-full
  warning (`:61`). On a single-file SQLite store, disk-full and lock contention are plausible
  causes of a 500, and both also prevent the `INSERT` that reports it. *Derived from code; the
  production storage engine and failure mix were not checked.*

**So `api_error_spike` now fires for partial failures and stays green for a total one.** That is
the same flattering direction MR-039 named — a monitor whose numerator is a problem, losing
exactly the problems that are largest. It is a smaller blind spot than "fires for nothing", and
loop 79 was a real improvement. But the iteration entry presents the server side as having escaped
the subtraction property, and it has not; it has moved the subtraction from "page is failing" to
"store is failing". PostHog forwarding (`:79-80`) would still carry the event where configured, but
nothing alerts from PostHog.

**And the e2e proof encodes the blind spot.** `api-error-reporting.test.ts:101,112` provoke the
failure with `mockRejectedValue(new Error('db unavailable'))` on `teamMember.findMany`, while
`analyticsEvent.create` on the same mocked `db` keeps succeeding (`:22-29`). In the scenario the
fixture names, the assertion at `:107` cannot hold. "A real `GET /api/teams` failure" in the log is
a real handler against a mocked database whose failure is selective in the one way that makes the
test pass.

**What closes it** (for the row, not prescribed here in detail): the alert needs at least one
signal that does not depend on the store it monitors — e.g. a structured log line on every report
(already present, `:57-59`) consumed by the host's log alerting, or the cron caller treating a
non-200 from `/api/admin/alerts/check` as an alert in itself. Whether either exists outside the
repo I cannot see.

### 2.4 #8 was the fix, and nobody read it

`IMPROVEMENT_BACKLOG.md` row #8, status `new (iter 001)`, re-scoped at loop 47:

> *"25 of 72 `route.ts` files under `app/api` contain no `try {` at all … The fix is ONE shared
> handler wrapper enforcing the `{ data, error, meta }` envelope and a non-leaking 500, applied
> mechanically — not 25 independent edits."*

Loop 79's log: *"there is no shared client fetch … and no shared server error helper."* Correct —
because the row that specifies one has been open for ~80 loops. Loop 79 then did 46 + 8 hand edits,
wrote a regex guard to keep them honest, and filed #253 for "20 of 72 routes have no catch" — the
same surface #8 counts with a different predicate (`try` vs `catch`). A wrapper:

- closes #253 (an escaping exception passes through the wrapper's own `catch`);
- makes #16 (`DELETE /api/keys` — `await req.json()` unguarded at `api/keys/route.ts:60`, still
  true) a non-leaking error instead of an unobserved 500;
- gives #254 a place to map malformed input to 400 rather than 500;
- makes G-1…G-5 moot, because reporting happens once, at the boundary, regardless of how a status
  is spelled.

This is not hindsight about a better design; the better design was written down, in the backlog,
in the area loop 79 was working. It is the clearest evidence in this window for MR-039 §5.4: **the
loop works rows it filed recently and does not traverse the pool.** See §7.

---

## 3. Q2 — Loop 80's numbers

`computeDashboardV2RetirementMetrics` (`lib/dashboard-v2-retirement-metrics.ts:55-91`) is honest
arithmetic: unclamped, null on a zero denominator, order-independent. The questions are what the
arithmetic is *of*.

### 3.1 Can bounce rate exceed 100%, or double-count over 30 days?

**Yes, it can exceed 100%, and it is correct not to clamp.** Mechanisms:

1. **#251(3) bfcache re-fire** — a back-navigation restore and second `pagehide` emits a second
   bounce for one view. Real, already rowed.
2. **Window edge.** The client `timestamp` is stripped at ingest (`api/analytics/events/route.ts:207`),
   so `createdAt` is server receipt time, and the window `createdAt >= since` (`:120-126`) is
   applied to each row independently. A view received just before `since` whose bounce is received
   just after contributes a bounce with no view. Over 30 days this is negligible; the page also
   offers 7 days (`analytics/product/page.tsx:355`), where it is less so. The trailing edge runs the
   other way (views whose sessions are still open have no bounce yet). *Direction mixed; magnitude
   small; unmeasured.*
3. **Not a double-count:** a user who bounces on 30 separate views produces 30/30. That is
   per-view semantics, which is a definition, not an error — but it is an **unstated** definition.
   A criterion like "bounce < 40%" reads naturally as "of people", and per-view weighting lets a
   few heavy, non-bouncing users dilute many single-visit bouncers. The PRD wording should decide;
   the panel should say which it is.

**Two populations are included without comment:** error-state views (the view fires when
`isLoading` goes false *including* on failure, `DashboardV2Shell.tsx:399-403`, so a user who leaves
a failed dashboard is a bounce — cold-pool MDR-P1-19 named this gating gap long ago), and
internal/admin views (no user filter on the query, `events/route.ts:124-127`). *Unmeasured.*

### 3.2 Does `days` cut views and bounces unevenly?

Only at the edges (above), and symmetrically in mechanism. The uneven part is #254 itself: `days`
is unvalidated (`:120`), so `?days=abc` is a 500 (rowed), and `?days=0` or a negative value
silently returns an empty window, which the panel renders as *"No views recorded"* — a statement
about the product made from a malformed request. Fold into #254.

### 3.3 Is the chip-click bias statement correct and complete?

**Correct, and materially incomplete — and the incompleteness is the exact error loop 80 corrected
in its agent's bounce caveat.**

| Mechanism | Direction | Visible when `viewsMissingChipCount = 0`? | Evidence |
|---|---|---|---|
| Views without a valid count leave the denominator; their clicks stay | ↑ | no — this is the stated one | `:33`, `:69` |
| **Toggle-off clicks.** The chip is an `aria-pressed` toggle (`InsightsStrip.tsx:127`); `insight_chip_clicked` fires on every click (`:129-136`), including the click that *removes* the filter. One chip, filter on, filter off = 2 clicks / 1 chip. | ↑ | **yes, silently** | `InsightsStrip.tsx:127-136` |
| **Error → retry.** On a failed first load the view fires with `chipsRenderedCount: 0` — a *valid* zero (`DashboardV2Shell.tsx:399-426`). `handleRetry` refetches, chips render, and the view never re-fires (`dashboardViewFiredRef`, `:403`). Every click on those chips has no denominator. | ↑ | **yes, silently** | `DashboardV2Shell.tsx:388-393,403` |
| **Lost clicks.** Clicks are emitted later in a session than the view and ride the same buffer and drains MR-039 audited (#249, #251); anything that loses the tail of a session loses clicks preferentially. | ↓ | yes, silently | MR-039 §3 D-1, D-3 |

So the honest statement is the one loop 80 wrote for bounce: *the net direction is unknown.* The
type contract at `:31-37` and the page at `:802-806` both imply the rate is unbiased when
`viewsMissingChipCount` is 0. It is not, and the common case shows no caveat at all. The rate is
also clicks per impression, not "fraction of chips clicked"; it can exceed 100% on toggles alone.

### 3.4 Is #57 criterion 1 meaningfully "computable" while #249 is open?

**Computable as arithmetic; not computable as a criterion.** The loop 80 log says exactly this
(*"computable and still not trustworthy"*), and the bounce caveat on the page is accurate. The
problem is the layout: the panel prints the rate in metric-value type and, directly beneath it,
**`Target: under 40%`** (`analytics/product/page.tsx:785-786`). A number beside its threshold is a
pass/fail verdict to anyone who glances at it; the caveat is in tertiary type two lines lower. That
is a number that will be read as an answer.

And it is already being read as one elsewhere: **`SYSTEM_HEALTH.md:442` still states all three #57
criteria are "evaluable with shipped PostHog instrumentation."** That has been false since MR-038,
was not corrected by loop 80, and is the sentence a launch decision would quote.

**Recommendation:** until #249 and #251(3) close, the panel should not print the target beside the
bounce rate — print the numerator/denominator and the caveat as the primary content, or label the
value "not decision-grade (#249, #251)". Correct `SYSTEM_HEALTH.md:442`. Neither is large; both are
copy, so D-4 clause 1 would fire if ≥3 strings change.

---

## 4. Q3 — Delegation and the agent-diversity rule

### 4.1 What happened

- **Loop 80:** `analytics` agent, no shell. Wrote the 91-line pure function, tests and the page
  panel; said plainly it could run nothing. The coordinator ran everything, found the agent's
  claimed +13 matched, and made two honesty corrections. **Independent value delivered:** the
  function (accepted with corrections) and one finding the coordinator had not made — #254, logged
  as "found by the `analytics` agent". Real, if modest.
- **Loop 81:** `frontend-engineer` rate-limited mid-change, nothing run. Partial work failed 3 of 4
  scans, misstated one ratio (7.04 vs 7.67), and carried encoding damage in comments. The
  coordinator reviewed it line by line and finished it. **Independent value delivered:** typing,
  net of review cost. No finding the coordinator would not have made.

### 4.2 Is validation of delegated work adequate?

**It is adequate at checking that claims are true. It does not check that the class is closed,
and that is where both delegated loops leaked.** The coordinator re-ran tests, re-ran scans,
re-measured ratios — and each re-measurement was against the agent's own scope. So:

- loop 80's validation caught a wrong bounce caveat and missed the identical defect one panel to
  the right (§3.3), because the check was "is this caveat true", not "what else moves this rate";
- loop 81's validation re-ran the scans, which are blind to closed dropdown panels, and so missed
  `PublicNav.tsx:368` (§5 item 7). A `grep` for the row's own token would have found it.

This is not specific to delegation — loop 79 (coordinator-only) has the same shape (§2.3). But
delegation makes it worse in one specific way: the coordinator's review starts from the agent's
diff, which anchors it to the agent's scope.

### 4.3 Does the diversity rule produce independent work?

**As practised in this window, mostly a nominal rotation.** Two observations, both from the text:

1. **The rule as written is not "rotate".** `CLAUDE.md` § Meta-Review Cadence lists *"Same
   implementing agent used for 4+ consecutive loops"* as an **early trigger for a meta-review**.
   The coordinator implemented loops 73-79; the 4th consecutive was loop 76, which fell inside
   MR-039's concurrent window, and loops 77-79 fell inside the post-meta-review 3-loop lockout.
   Loop 79's entry does not mention the streak at all; loop 80 discovers it ("seven in a row, past
   the 4+ diversity rule") and responds with an action the rule does not prescribe. The trigger
   fired silently for four loops and was then answered by a different mechanism. Not a crisis —
   MR-039 and this review both landed on time — but the log should not describe loop 80's
   delegation as compliance with the rule.
2. **A delegate that cannot run anything cannot do the half of the work this programme has shown
   matters.** Every strike in MR-038, MR-039 and this review is a validation-scope failure, not a
   typing failure. An agent without a shell, or one cut off before running anything, contributes
   to the half that has not been the problem.

### 4.4 Recommendation (two small changes, no new control variable)

1. **Count honestly.** A loop counts as rotated *only if the delegated agent executed the
   iteration's validation commands itself*. Otherwise log `Agent — coordinator (drafted by
   <agent>)`, and it counts toward the coordinator's streak. Under this rule loops 80 and 81 are
   coordinator loops and the streak is 9. That makes the 4+ trigger measure what it was written to
   measure: one perspective doing all the work.
2. **Residual line in every Validation block that closes a defect class.** One line:
   `residual: <grep for the defect's token/pattern> → N before, M after`, run repo-wide, not
   scoped to the diff. For loop 81 that would have read `text-brand-500 (text): 21 → 21 outside
   the touched sites` and forced either a fix or a row. It is MR-039 §5.3's files-a-row clause
   made mechanical, and it costs one command. It applies to delegated and coordinator loops alike,
   which is the point: the gap is in validation scope, not in who typed.

I do **not** recommend more delegation, or a rule that forces it. The evidence of this window is
that delegation without execution capability adds review cost and no independence.

---

## 5. Q4 — What the window got wrong

1. **Loop 79, `ITERATION_LOG.md:53`** — *"Verified by provoking one, as the row asked: a real
   `GET /api/teams` failure stores an `api_error` row."* Real handler, mocked database, and the
   mock fails selectively: the error is `'db unavailable'` and the analytics insert to the same
   database succeeds (`api-error-reporting.test.ts:22-29,101`). §2.3.

2. **Loop 79, `ITERATION_LOG.md:49`** — *"it is on the server on purpose … the client pipeline can only
   subtract."* Implies the server pipeline does not. It subtracts the database-outage population,
   which is most of the 5xx surface (39 of 46 sites in a `catch`) and all of `/api/health`'s.
   **Decided without evidence:** the entry argues which side loses less without checking what
   either side loses. §2.3.

3. **Loop 79, `ITERATION_LOG.md:54` and commit `3bf149c`** — *"fails on any unreported literal
   5xx."* True for one spelling in one directory; five latent blind spots, one at a named line
   (`invites/accept/route.ts:303`). §2.2.

4. **Loop 79, `ITERATION_LOG.md:51`** — *"no shared server error helper."* True and incomplete:
   row #8 has specified one since iter 001, and the loop filed #253 on #8's own surface rather than
   finding it. §2.4.

5. **Loop 80, `ITERATION_LOG.md:36` and `lib/dashboard-v2-retirement-metrics.ts:31-37`** —
   *"The chip-click rate reads high whenever any view lacks a chip count."* Correct and presented
   as the bias; two further upward mechanisms and one downward operate with the count at zero, and
   the page shows no caveat then. **The loop corrected this exact error in its agent's bounce
   caveat and reproduced it one field over.** §3.3.

6. **Loop 80, `ITERATION_LOG.md:38`** — *"criterion 1 is now computable."* The log qualifies it;
   the page does not (`Target: under 40%` beside the value). And `SYSTEM_HEALTH.md:442` still says
   all three criteria are evaluable — not touched by the loop that most directly falsified it. §3.4.

7. **Loop 81, `ITERATION_LOG.md:12`** — *"The row's three defects are fixed."* The instances axe
   saw are fixed. Defect (2) as #245 states it is a class — *"`text-brand-500` on plain surfaces =
   2.42:1 in light"* — and **21 text uses remain in 16 files**, including:
   - `PublicNav.tsx:368` — `leaf.badge` in `PanelLink`, `text-brand-500 bg-brand-900/30`: the
     tint-pair shape the loop fixed at `:355` and the same `leaf.badge` it fixed at `:434`. Inside
     the dropdown panel, so the scan never renders it open. *Contrast not measured here; same token
     pair as the 1.06:1 nav item the loop did fix.*
   - `components/demo/RealProductDemo.tsx:157` — on the home page (`app/(public)/page.tsx:267`).
   - Five sibling SEO templates (`AlternativesPageView:42`, `AnswerPageView:86,115`,
     `ComparePageView:21,51`, `ProblemPageView:45`, `WorkflowPageView:42`) of the
     `SopTemplatePageView` the loop fixed — same layout family, unscanned.

8. **Loop 81 — #245's acceptance clause is half met.** The row says *"Return the held tests in the
   same commit as the fix"*, naming both `/product` and `/sop-templates/*` light scans. `/product`
   remains held (`badge-surfaces-a11y.spec.ts`, re-pointed at #255). The re-pointing is honest and
   the residual is a different component. But defect (2) was the `/product` one, so **the only
   defect whose page scan did not return is verified by token arithmetic alone** — the loop-57
   pattern (closing on partial coverage) the log itself warned about at loop 61.

9. **Loop 81, `ITERATION_LOG.md:10`** — *"The higher-scoring non-analytics rows are multi-iteration
   program items … several marked stale by MR-034 — not one-loop work."* Asserted, not shown, and
   carried forward loop to loop. Some are true (#108 re-scoped and blocked; #150 materially stale;
   #168 has an unresolved overlap flag). It is a standing exclusion of the entire upper half of the
   score distribution that no loop re-verifies, and it is one reason age-at-close keeps falling
   while the oldest row ages one loop per loop (§7).

10. **Loops 79 and 80 — selection-rule vocabulary.** Both log `top-score` with an open pool of 108
    against a pool-ceiling rule (Follow-Up Debt Policy clause 6) that mandates `burn-down` above
    8. The rows picked are follow-ups, so the effect is the same; but cool-off state has not been
    reported in any entry of this window. Either the ceiling rule is retired in practice — which
    is a CEO-visible governance change — or the label is wrong. Not material to outcomes; material
    to whether the log can be audited against `CLAUDE.md`.

11. **Mode 3 correction `5a2fe2d` — nothing to correct, and it is the best decision in the window.**
    The coordinator suspected a frozen prerendered 500, checked the prerender manifest, found it was
    not so, and shipped the smaller real fix with a build-level before/after (`1 → 0`). It also
    states plainly that loop 79's "production build clean" was an exit-code claim. That is the
    behaviour §4.4 asks for everywhere else.

### What I could not verify

- **The `/product` and `sop-template` scan results** — Playwright not run. Taken from the diff.
- **Contrast of `PublicNav.tsx:368`** in either theme — not measured; the claim is that it is the
  same token pair as a measured failure, not that it fails.
- **Whether any monitor outside the repo** (host log alerting, uptime checks on `/api/health`,
  cron-failure alerts) covers the database-outage case in §2.3. If one does, §2.3 is a
  documentation gap, not a monitoring gap.
- **Production storage engine and failure mix** — the SQLite reading of §2.3 is from the health
  route's code, not from the deployment.

---

## 6. Staleness triage — the five oldest open rows (Follow-Up Debt Policy clause 2)

Clause 2 escalates any row past the 10-iteration cap to meta-review for keep/downgrade/delete.
I triaged only the five oldest, because they are the ones the three-number line names, and checked
each against the code rather than its text.

| Row | Text | Checked against code | Verdict |
|---|---|---|---|
| **#8** | shared route-handler wrapper | 20 routes with no `catch` (my count; row says 25 with no `try`); loop 79 hand-wired 54 sites instead | **keep — and merge #253 and #16 into it** (one logical outcome: the boundary). Rescore; it should rank above #253 alone. |
| **#11** | `(db as any)` casts / regenerate Prisma client | **71** `db as any` occurrences in non-test `src`; loop 80 added a use (`events/route.ts:124`) | keep |
| **#12** | Prisma migrations baseline | 14 migrations, earliest `20260505000000_add_user_dashboard_preference`; no `init`/baseline migration | keep (appears still true; not exhaustively verified) |
| **#16** | `DELETE /api/keys` error handling | `await req.json()` unguarded at `api/keys/route.ts:60` | keep → **merge into #8** |
| **#17** | shared ingestion service (upload/sync) | `api/upload/route.ts` and `api/sync/route.ts` both exist separately | keep-unverified (did not diff the two) |

None is obsolete. All five are still true, and two are the same outcome as rows filed this week.

---

## 7. Q5 — The three-number pool line. **Not implemented. Fourth deferral.**

**Plainly:** MR-037, MR-038 and MR-039 each recommended replacing the follow-up ratio with three
numbers printed by `validate-backlog.mjs`. MR-039 §7 said *"Implement it. Do not defer again"* and
*"a fourth deferral should be treated as a decision to keep a metric that is known not to work."*
Loops 79-81 did not touch `scripts/validate-backlog.mjs` (last changed `89eac6b`; the script prints
one line and contains no pool, age or median logic). This is the fourth deferral.

**The numbers for this window, measured here:**

| Number | MR-039 (loop 75) as reported | Loop 75, corrected | **Loop 81** | Movement |
|---|---|---|---|---|
| Open pool | 122 | **103** | **108** (79: 108, 80: 108, 81: 108) | +5, all from loop 78's seven filings; flat across the window |
| Oldest open non-blocked | ~74 loops (#11, #12, #16, #17) | same | **~80 loops — #8, #11, #12, #16, #17**, all `new (iter 001)` (MR-039's convention: iter 001 ≈ loop 1) | +6, exactly the loops elapsed |
| Median age-at-close, last 10 | — (last 3 = 2) | — | **4.5 loops** (#234 6, #242 0, #240 5, #243 2, #235 10, #236 10, #244 5, #246 1, #247 2, #245 4); last 3 = **2** | last-3 unchanged |
| Externally-originated closures | 0 of 3 | | **0 of 3** (#246, #247 from MR-039; #245 from loop 77) | unchanged |
| Follow-up ratio (for completeness) | 1.00 | | **3 / 3 = 1.00** | passes, as always |

**The correction is the new evidence.** MR-038 and MR-039 measured the pool with
`grep -cE "^\| [0-9]+ \|"` over the whole file, which counts the 19 rows of the
`### Completed (historical)` table (`IMPROVEMENT_BACKLOG.md:407`). Every pool level those reviews
reported is 19 too high; the deltas were right only because the historical table did not change.
`validate-backlog.mjs` already stops at that marker (`END_MARKER`, `:72`). **Three reviews used a
hand definition; the validator already had the right one.** That is the strongest argument yet for
putting the line where MR-037 said to put it.

**Verdict.** The ratio passed again (1.00) in a window where the pool did not move, the oldest row
aged one loop per loop, and the loop that worked directly beside the oldest row did not read it
(§2.4). Recommend the coordinator apply it **in the same commit that records MR-040** — it is
governance tooling under `scripts/`, not a backlog item, and needs no loop:

```
validate-backlog: 248 rows, 140 struck, 19/19 malformed-row budget used — clean
                  open 108 (+0 vs 3 loops ago) | oldest open non-blocked: #8 (iter 001)
                  | median age-at-close, last 10: 4.5 loops
```

Inputs are all columns the validator already parses (status, struck, Birth iter, and the closing
loop from `ITERATION_LOG.md`, which V4 already reads). "Non-blocked" = status cell does not match
`/blocked|awaiting CEO/i`. If the coordinator again declines, that should be logged as an explicit
decision with a reason, and it becomes a CEO item (§9) — not a fifth silent deferral.

---

## 8. Pattern — what this window adds to MR-039

MR-039 found that the loop finds what it stands next to and never traverses. This window shows
three sharper versions:

1. **The verification is scoped like the fix, so it inherits the fix's blind spot.** Loop 79's
   fixture fails the database selectively; loop 80's caveat check was per-caveat; loop 81's scan
   cannot open a dropdown. In each case the instrument was chosen by the change, and it confirmed
   the change.
2. **Corrections do not propagate sideways.** Loop 80 fixed a one-direction claim and wrote a
   one-direction claim in the adjacent field; loop 81 fixed `leaf.badge` at `:434` and not at
   `:368`. A residual grep (§4.4) is the cheapest traversal that exists.
3. **The pool is not read.** #8 and #16 are the same outcome as #253 and #254; nobody looked,
   because selection never reaches rows that old (§7, median age-at-close 4.5 vs oldest 80).

None of these needs a new rule. The `residual:` line, honest agent counting, and the pool line are
all measurement changes to rules that already exist.

---

## 9. Next pick (loop 82)

**Policy computation.** Last five Areas: 77 a11y, 78 analytics, 79 analytics, 80 analytics, 81
a11y. No three-consecutive run, so no `saturation-rule` force. Saturation penalty (−2 for 3 of
last 5): **analytics rows −2**; a11y rows (2 of 5) no penalty. No release blockers open
(`SYSTEM_HEALTH.md:438-440`), so blocker cadence does not apply. Pool 108 > 8 → clause 6
`burn-down`; every candidate below is a follow-up, so it is satisfied.

| Row | Raw | Adjusted | Notes |
|---|---|---|---|
| **#255** WorkflowTaskNode hardcoded light-canvas colours | 11 | **11** | in-app workflow map, step labels **1.08:1 in the dark default theme**; holds the `/product` scans |
| #254 bad `?days=` → 500 | 12 | 10 | E=1; better absorbed by #8 |
| #248 funnel has no `location` dimension | 12 | 10 | |
| #8 ⊕ #253 ⊕ #16 (after merge) | 9 / 10 | rescore required | API safety, so no analytics penalty if area is set to the route boundary |
| #249 mobile bounce delivery | 10 | 8 | the blocker for #57 criterion 1 |

**Pick: #255** (`burn-down`, adjusted 11), `frontend-engineer` *only if it can run the scans
itself* — otherwise log it as coordinator (§4.4). Its Validation block should carry a `residual:`
line for inline hex colours in the workflow-map components, and return the `/product` scans in both
themes in the same commit, as #245 required.

**Runners-up, in order:**
1. **#8 ⊕ #253 ⊕ #16** — merge as one row first (coordinator backlog edit), then it is the highest-
   leverage item in the pool: one outcome, three rows closed, the oldest open row retired, and the
   §2.3 database-outage path given a single place to be fixed. I would take this at loop 83 and
   would not object to it at 82 with a logged rationale; it is a judgment the formula cannot make
   because the merge has not been scored.
2. **File-then-fix the #245 residual** — 21 `text-brand-500` text uses, `PublicNav.tsx:368` first.
   It is the unfinished half of a row closed yesterday.
3. **#249** — still the only path to a trustworthy #57 criterion 1.

**File before fixing** (per MR-038's precedent; none of these is rowed):
- §2.3 — `api_error` lost when the store is the failure; `/api/health` report lost by construction;
  e2e fixture fails the DB selectively.
- §2.2 G-1…G-5 — guard blind spots (or explicitly: "moot once #8 lands", in #8's row).
- §3.3 — chip-click: toggle-off clicks, error→retry zero denominator, lost-click downward bias;
  caveat shown only when `viewsMissingChipCount > 0`.
- §3.1/§3.4 — bounce definitional notes (per-view weighting, error-state and internal views) and
  the `Target:` layout; `SYSTEM_HEALTH.md:442` correction.
- §5 item 7 — the 21-instance `text-brand-500` residual.

---

## 10. CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **#216** extension untouched | `871e29a` (2026-09-24), **38 loops**, `blocked — CEO decision`. **Sixth ask.** | Nothing. No commit under `apps/extension-app` since. MR-039 asked whether the blocked status is still true; it has not been answered. The coordinator correctly does not invent extension work to reset the D-1 counter. |
| **#57 criterion 1** bounce < 40% | Computable (loop 80), not trustworthy (#249, #251(3)). | **New:** the panel prints the 40% target beside an unmeasured-direction value (§3.4); `SYSTEM_HEALTH.md:442` still says "evaluable". Also a definition question only the CEO/PRD can answer: per view or per user? |
| **#57 criterion 3** chip-click ≥ 10% | Computable (loop 80); **threshold still a CEO number.** | **New:** net bias direction is unknown, not "high" (§3.3), and the metric is clicks-per-impression including toggle-offs. The CEO number should be set against a defined metric, so define first. |
| **#57 criterion 2** free-tier p50 click < 60s | Loop 80: "unchanged". | Not re-checked here. |
| **#225** `TRUSTED_PROXY_HOPS` | One environment variable; auth rate-limits bypassable until set. | Unchanged — now ~25 loops since engineering finished. |
| **#212** E2E deploy gating | Waits on one green CI run of the `real-extension` job. | Unchanged. This window adds weight: all three loop-81 findings that escaped are in the browser-scan layer. |
| **#190 / #193** governance edits to `CLAUDE.md` | `awaiting CEO approval` since MR-020 / MR-021. | Unchanged. Twenty reviews old; either approve, reject, or strike. |
| **#191** billing | `awaiting CEO decision` since loop 7. | Unchanged. |
| **NEW — the follow-up ratio** | Three-number line recommended four times; not implemented. | If the coordinator will not implement it (§7), the CEO should decide explicitly between the ratio and the line, so the next review is not a fifth recommendation. |

---

## 11. Verdict

The window's claims reconcile exactly against a fresh run; the control rules mostly held (the
forced pivot at loop 81 happened, cadence was flagged on time, every new defect got a row); and the
Mode 3 correction is a model of how to check a suspicion before acting on it.

But the three loops each verified their change with an instrument scoped to the change, and each
instrument inherited the change's blind spot. Loop 79's alert now fires for partial failures and
stays green for a total one, and its proof fails the database in the one selective way that lets
the report through. Loop 80 fixed a one-direction bias claim and wrote one in the next field.
Loop 81 fixed what the scanner could see and left the same badge, in the same file, closed in a
dropdown.

And the thing loop 79 needed was in the backlog the whole time: row #8, iter 001, specifying the
shared boundary that would have made the regex guard, #253, #16 and most of #254 unnecessary. The
loop does not read the pool, the metric that should show that has been deferred four times, and the
hand measurement standing in for it has been 19 rows wrong. Implement the pool line, add a
`residual:` line to validation, count delegation honestly, and take #8 within two loops.
