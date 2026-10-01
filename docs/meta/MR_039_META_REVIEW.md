# MR-039 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 73, 74, 75 since MR-038. Loop 73 also absorbed MR-038's five strikes.
**Date:** 2026-09-30
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`.
No reads-with-intent-to-edit under `apps/web-app/src/components/shared/`,
`apps/web-app/src/hooks/useFeatureGate.ts`, `apps/web-app/src/app/(app)/teams/`
(the `teams/page.tsx` finding at §3 M-1 is read-only and is **not** actioned here).

**Validation run for this review:** `pnpm test` in `apps/web-app` — **185 files, 3278 passed,
exit 0**. Matches loop 75's claimed 3278 exactly. `node scripts/validate-backlog.mjs` —
*237 rows, 135 struck, 19/19 malformed-row budget used — clean.* Matches loop 75's entry.

---

## 1. Lead

**The pipeline audit found eleven live defects and three latent ones. Eight of the eleven are in
layers no loop in this window touched, and the two highest-consequence ones are alerts that
cannot fire.** `activation_rate_drop` divides a population by a different population and will
read above 100% for any product with more active users than weekly signups. `api_error_spike`
watches an event with **zero emitters anywhere in the repository** — so does `client_error`. Both
render as green.

**The flattering bias is not a coincidence of four samples; it is structural.** Every loss
mechanism in this pipeline — unfired triggers, undrained buffers, discarded batches, dropped
rows — removes events. Every event removed is a thing that did not happen. There is no
corresponding mechanism that invents events. A pipeline whose only failure mode is subtraction
will flatter every rate whose numerator is a problem, and that describes bounce, errors, limits
and drop-off. #238, #241, #242 and #243 were not four unlucky draws from a neutral distribution.

**And the fourth repeat of the class is already in the tree, shipped by loop 73.** `dashboard_bounced`
is now emitted on `pagehide`. The buffer it is emitted into is drained on `visibilitychange`→hidden
and `beforeunload`, and on nothing else — a lone event never reaches the ten-event flush
threshold. So the bounce leaves the browser **only if a drain fires strictly after `pagehide`**,
which is to say only if the document was still visible when the user left. On the background-then-
discard path — the mobile exit path that motivated #241 and #242 — the drain has already run and
the bounce sits in an empty buffer until the page is destroyed. Same subsystem, same population,
same direction, third loop running.

**Two loops were spent on an event nothing reads.** `dashboard_bounced` has exactly one reference
in the codebase: its own emission. `chipsRenderedCount` has exactly one: its own assignment.
#57 criteria 1 and 3 are both un-computable, and criterion 3's blocker was already known.

**On MR-038's falsifiable prediction: it resolves against the convention.** Three of my strikes
(§3 D-1, D-2, D-4) are inside what a `Not covered:` line derived from the instruments' own
docstrings would have named — `bounce.ts:28` names bfcache in the sentence choosing `pagehide`.
By MR-038's stated test that makes it theatre. I think the test was the wrong one and §5 argues
for a strictly stronger version, but the prediction as written has failed and I am not going to
reinterpret it to save it.

---

## 2. How the pipeline is wired, so the findings below are checkable

```
track(payload)                        analytics.ts:848
  └ enrich: timestamp, url, userPlan, visitorId      :851, :854, :887, :891
  └ PostHog forward (strips url)                     :900-909
  └ push to window.__ledgerium_events                :913-915
  └ cap at 500, dropping the OLDEST                  :916
  └ schedule flush iff length >= 10, debounce 2000ms :919 / delivery.ts:36,39

deliverBufferedEvents(useBeacon)      analytics.ts:957
  └ drain() — empties the buffer BEFORE the outcome is known   :960
  └ sendBeacon → if refused, unshift back                      :965-971
  └ fetch   → .catch(() => {}) — drained events are gone       :974-980

triggers (module scope, every page that imports analytics.ts)
  └ visibilitychange → hidden   :1009-1013
  └ beforeunload                :1016-1018

bounce emitter (component scope, dashboard only)
  └ pagehide                    DashboardV2Shell.tsx:750

POST /api/analytics/events      route.ts:10
  └ slice(0, 100), report `truncated`     :39-42
  └ per-row try, report `received`        :68-75
  └ userId = POST-time session, for the whole batch  :19-25, :43
  └ timestamp DISCARDED — no column       :42-49, :202, schema.prisma:508-528

consumers
  └ GET /api/analytics/events     route.ts:105  → product/page.tsx
  └ computeAlerts                 compute-alerts.ts:36
  └ GET /api/analytics/retention  retention/route.ts
  └ GET /api/analytics/engagement engagement/route.ts
```

The structural point, which is the mechanism behind D-1: **the drain triggers live at module
scope and the bounce trigger lives at component scope.** No single file sees both. That is why a
defect in their composition is invisible to every test either file could reasonably carry.

---

## 3. Findings

Ranked by whether a human would act on the wrong number. Direction given as **flattering**
(makes the product look better), **unflattering**, or **indeterminate**.

### A — Aggregation

#### A-1 · LIVE · flattering · **the activation alert compares two different populations**

`apps/web-app/src/lib/compute-alerts.ts:103-140`

```
activationRate = sopViewUsers7d / signupUsers7d          :130
  numerator   — distinct userIds with sop_section_viewed in the last 7d, ANY tenure   :110-113
  denominator — distinct userIds with signup_completed in the last 7d                 :106-109
```

The numerator is not a subset of the denominator and is not constrained to be. A user who signed
up in March and reads an SOP today counts against this week's signup cohort. The ratio is
unbounded above 1 and grows with the size of the active base, not with activation.

Threshold is `< 0.20` (`:133`). Once the weekly count of distinct SOP readers exceeds one fifth
of weekly signups — which happens the moment there is any returning usage at all — this P2 alert
is permanently `ok`. It renders green in the System Alerts panel at
`app/(app)/analytics/product/page.tsx:369`.

The message string makes it look rigorous: `"Activation rate is N% (last 7d, X/Y users)"` (`:134`).
A reader sees two counts and a percentage and has no way to see that the two counts are drawn
from different sets.

#### A-2 · LIVE · flattering · **`api_error` and `client_error` have no emitters, and one of them drives an alert**

```
apps/web-app/src/lib/analytics.ts:699-700   — declared in the taxonomy
apps/web-app/src/lib/compute-alerts.ts:175  — alert 7, api_error_spike, P2, threshold > 10/hour
apps/web-app/src/lib/admin-operations/queries.ts:112 — ERROR_EVENT_NAMES
```

Verified with `grep -rn "'api_error'\|'client_error'" apps/ packages/ --include=*.ts --include=*.tsx`
excluding tests: **four hits, all of them declarations or consumers. Zero producers.**

So `api_error_spike` reports `0 api_error event(s) in the last 1 hour`, status `ok`, forever. And
the admin operations error panel counts one of its three named error channels. "No API errors" and
"no instrumentation for API errors" render identically, and the rendering is the reassuring one.

This is the purest instance of the window's theme: a number that is wrong in the flattering
direction because the thing it counts was never wired.

#### A-3 · LIVE · flattering · **the conversion funnel compares stages from different populations, and the chart hides the evidence**

`apps/web-app/src/app/api/analytics/events/route.ts:206-228` and
`app/(app)/analytics/product/page.tsx:808, 821-825`

`computeFunnel` builds one `Set<userId>` per step and divides adjacent set sizes (`:222-227`).
There is no subset constraint and no time ordering: a user who clicked upgrade on day 1 and hit
the plan limit on day 20 counts in both steps as though they progressed.

The concrete live instance: `upgrade_clicked` fires from four locations —
`teams_create`, `dashboard_v2_quota_chip`, `dashboard_v2_health_gate`
(`teams/page.tsx:147`, `RecordingQuotaChip.tsx:66`, `WorkflowRow.tsx:358`) and
`upgrade_button` (`UpgradeButton.tsx:47`, the pricing page). `lib/upgrade-prompt.ts:30-37`
deliberately emits **no** `upgrade_prompt_viewed` for the pricing page and says so:

> *"That leaves `upgrade_clicked` from `upgrade_button` without a matching view event, which is
> correct rather than an oversight — the two should be compared per `location`, not in aggregate."*

**The aggregation compares them in aggregate.** There is no `location` dimension anywhere in
`computeFunnel`. Loop 70 fixed the emitter, documented the correct comparison, and the consumer
was never changed to perform it. Row #238 is closed; the number on the screen is still wrong,
and still in the flattering direction.

Then the renderer conceals it twice over:

- `route.ts:225` — `dropoff = Math.max(0, prevCount - count)`, so a step larger than its
  predecessor reports zero drop-off.
- `product/page.tsx:808` — `{i > 0 && step.rate < 100 && (...)}`. **When the rate is ≥ 100% the
  percentage is not rendered at all.** The one case that would reveal the population mismatch is
  the one case the chart omits.

A reader sees a step with a count and no rate and reads it as a rendering quirk.

**Credit where due:** row **#244** (open, filed loop 73 from MR-038 §3.4) already names the
stage-1→stage-2 version of this — the quota chip now emits a view at 80% of quota while
`plan_limit_hit` only fires at 100%. What is new here is (a) the stage-2→stage-3 version from
the un-prompted pricing surface, (b) that the module which created the asymmetry prescribes the
fix and the consumer never received it, and (c) the renderer's silent suppression of rates ≥100%,
which hides both #244's case and this one.

#### A-4 · LIVE · unflattering · **average retention averages cohorts that have not had time to retain**

`apps/web-app/src/app/api/analytics/retention/route.ts:145-152`

```js
const activeCohorts = cohortResults.filter((c) => c.signups > 0);   :145
const sum = activeCohorts.reduce((acc, c) => acc + (c.retention[i] ?? 0), 0);  :150
return Math.round(sum / activeCohorts.length);                       :151
```

A cohort that signed up three days ago has `retention[1..4] = 0` — not because it churned but
because weeks 1 through 4 have not happened. It is averaged in at face value. With five cohort
weeks displayed, the week-4 average is dominated by cohorts that structurally cannot have week-4
data.

The only filter is `signups > 0`. Maturity is never checked. This is the one major finding that
biases against the product, which is worth stating plainly: the pipeline is not uniformly
self-serving, it is uniformly subtractive, and subtraction happens to flatter in most places and
not here.

#### A-5 · LIVE · indeterminate · **the two headline tiles count events, not entities**

`app/(app)/analytics/product/page.tsx:364-365`

```jsx
<MetricCard label="Workflows Created" value={data.eventCounts['workflow_uploaded'] ?? 0} />
<MetricCard label="Subscriptions"     value={data.eventCounts['subscription_created'] ?? 0} />
```

`workflow_uploaded` is emitted from two independent transports with different loss profiles —
client-side on the upload page (`app/(app)/upload/page.tsx:94`, subject to every delivery defect
in §3 D) and server-side on extension sync (`api/sync/route.ts:260`, reliable). The count is a
blend of a lossy and a lossless channel labelled as a count of workflows. Ground truth is one
`db.workflow.count()` away and is not used.

`subscription_created` is sound — `api/billing/webhook/route.ts:409` sits behind the
`webhookEvent` idempotency claim at `:155-162`, so Stripe retries cannot double it. Noting it
because I checked and it holds.

#### A-6 · LIVE · flattering · **`signup_completed` and `checkout_started` are each emitted twice for one action**

| event | client | server |
|---|---|---|
| `signup_completed` | `(public)/signup/SignupPageClient.tsx:61` | `api/auth/signup/route.ts:113` |
| `checkout_started` | `components/UpgradeButton.tsx:61` | `api/billing/checkout/route.ts:412` |

The funnels dedupe by `userId` (`route.ts:217-219`), so funnel step counts are unaffected. The
raw `eventCounts` map does not (`route.ts:134`), so every surface reading `eventCounts` — the
category lists at `product/page.tsx:330-333` and the daily chart — shows roughly double.

Separately, `api/billing/checkout/route.ts:215` emits `checkout_started` for **one-time `sku`
purchases**, which then enter the subscription conversion funnel as though they were subscription
intent. Different product, same funnel.

### D — Delivery

#### D-1 · LIVE · flattering, mobile-weighted · **the bounce is emitted after the only thing that would have sent it**

This is the headline. Derived entirely from code; the one empirical step I could not take is
flagged at §8.

The bounce enters the buffer at `DashboardV2Shell.tsx:744-748`, on `pagehide`
(`:750`, via `BOUNCE_TRIGGER`). It then needs a delivery. The available deliveries are:

| path | line | fires when |
|---|---|---|
| batch flush | `analytics.ts:919` | buffer length ≥ 10, then a 2000 ms debounce |
| visibility drain | `analytics.ts:1009-1013` | `visibilitychange` → `hidden` |
| unload drain | `analytics.ts:1016-1018` | `beforeunload` |

A lone bounce is one event, so the batch flush is unreachable — and even if it were reached, a
2 s debounce during page teardown is not a delivery. `beforeunload` is excluded by premise: not
firing on mobile is the entire reason rows #241 and #242 exist.

**So the bounce is delivered if and only if `visibilitychange` → hidden fires strictly after
`pagehide`.**

- **Leaving a visible page** (navigate, close tab): the unload algorithm fires `pagehide` and
  *then* transitions visibility to hidden. The bounce is in the buffer when the drain runs.
  **Delivered.**
- **Background, then discard** (switch apps, lock the screen, OS reclaims the tab): visibility
  goes hidden **first** — the drain runs on a buffer that does not yet contain a bounce — and
  `pagehide` arrives later, on freeze or discard. There is no second visibility transition. The
  bounce is written into an empty buffer and the page is destroyed. **Lost.**

The second path is the dominant way a mobile session ends, and it is the same population, with
the same selection bias, that row #242 was written about: people who leave without engaging are
over-represented among people whose page is backgrounded and never returned to.

Loop 71 moved delivery to a reliable trigger. Loop 73 moved emission to a reliable trigger. The
two triggers were each correct in isolation and were never checked against each other, because —
per §2 — they live in different lifetimes and no file sees both.

#### D-2 · LIVE · inflating · **`pagehide` fires into bfcache and nothing resets the emitter on return**

`lib/bounce.ts:26-29` chooses `pagehide` and gives as part of the reason:

> *"`pagehide` — fires when the page is actually being navigated away from or discarded,
> **including into the back/forward cache**…"*

There is no `pageshow` handler anywhere in the codebase — verified with
`grep -rn "pageshow\|persisted" apps/web-app/src`: the only hits are the word "persisted" in
unrelated prose. On a bfcache restore the same component instance resumes with
`dashboardViewFiredRef` still true and `clickCountSinceViewRef` still 0
(`DashboardV2Shell.tsx:239`, `:402`). A user who leaves, presses back, and leaves again without
clicking emits **two** bounces for one view.

The docstring names bfcache in the sentence selecting the trigger and does not follow it to the
return trip. Opposite sign to D-1, in the same module, both unmeasured — which is worse than
either alone, because the net is now unknowable rather than merely wrong.

#### D-3 · LIVE · flattering · **every path drains before the outcome is known, so a failed delivery is permanent silent loss**

`analytics.ts:960` empties the buffer. Then:

- `:965-971` — `sendBeacon` returning `true` means *queued for transfer*, not delivered. Only the
  synchronous refusal (`ok === false`) restores the events. A beacon that is accepted and then
  fails on the wire is gone.
- `:974-980` — `fetch(...).catch(() => {})`. Any network error, any 5xx, offline — the drained
  batch is discarded with no retry and no record.

Loop 71 correctly identified read-without-clear as a duplication hazard and made clearing
unconditional. The inverse hazard — clear-before-confirm — arrived in the same change, is not
mentioned in `analytics-delivery.ts`'s long docstring, and is not tested. Note also that the
ingest route returns **HTTP 200 even when it persisted nothing** (`route.ts:86-92`, by design),
so `.catch` would not fire for a total write failure in any case.

#### D-4 · LATENT · loses events · **client cap 500, server cap 100, and the client discards the report**

- `analytics.ts:916` — `if (buffer.length > 500) buffer.splice(0, buffer.length - 500)` — drops
  the **oldest**.
- `route.ts:39-40` — `MAX_BATCH = 100`, `events.slice(0, MAX_BATCH)` — drops the **newest**.
- `drain` sends the entire buffer in one POST regardless of size, so a 400-event buffer produces
  one request of which 300 events are discarded server-side and are already gone client-side.

Loop 75 made that discard *reported* (`truncated`), which was the right call. But the route's own
comment is candid about the consequence:

> `route.ts:36-37` — *"The client is fire-and-forget today, so nothing acts on it; the point is
> that the information exists at all if anyone ever looks."*

Nobody looks, and the events are not deferred — they are destroyed. Neither constant references
the other, in either file, and no test in either package asserts the relationship. Reachable via
repeated beacon refusals (D-3's unshift path) plus a long session.

#### D-5 · LIVE as a coverage gap · **the beacon-refusal branch loop 71 wrote has zero coverage**

`analytics.ts:970` — `if (!ok) buffer.unshift(...events);`

- `analytics.test.ts` — covers `getOrCreateVisitorId` and visitorId enrichment only (20 `it`
  blocks, headings at `:113-295`). Does not import `deliverBufferedEvents`.
- `analytics-delivery.test.ts` — covers the three pure helpers only.
- `analytics-delivery.spec.ts:30-33` — the browser stub is
  `value: (url, data) => { calls.push(...); return true; }`. It returns `true` unconditionally,
  so the refusal branch is **unreachable in the browser suite by construction**.

Loop 71's defensive fix, in a loop whose subject was data loss, ships untested in both suites.

### E — Enrichment

#### E-1 · LATENT · mis-attribution · **`userPlan` is a window global that outlives the page it was set for**

`setUserPlanForAnalytics` (`analytics.ts:759-762`) has exactly one caller:
`DashboardV2Shell.tsx:373`. `analytics.ts:867-873` documents the consequence honestly — events on
every other page carry `'unknown'`.

What is not documented: `window.__ledgerium_userPlan` survives App Router soft navigation and is
never cleared. So (a) the same user's events in one session split between `'unknown'` and their
plan purely on navigation order — the `'unknown'` bucket is "did not start at the dashboard",
which correlates with entry point and therefore with acquisition source; and (b) it survives
logout, so after a user switch in one tab the next user's pre-dashboard events carry the previous
user's plan.

#### E-2 · LIVE · minor · **the client timestamp is produced on every event and discarded at ingest**

`analytics.ts:851` sets `timestamp`. `route.ts:202` strips it in `filterProperties`; the record
mapping at `:42-49` never writes it; `schema.prisma:508-528` has no column for it. All bucketing
uses `createdAt`, the receive time (`route.ts:139`).

A buffered event emitted at 23:58 and delivered at 00:02 lands in the next day's bucket, and at
rest a buffered event is indistinguishable from a real-time one. On the CEO's framing — *is
absence distinguishable from a value?* — the emission time is not absent, it is actively thrown
away.

#### E-3 · LATENT→LIVE · deflates activation · **`trackActivation` reads localStorage unguarded, in the file that documents why that is wrong**

`analytics.ts:1063-1066`:

```js
if (!IS_BROWSER) return;
const key = `ledgerium_activation_${milestone}`;
if (localStorage.getItem(key)) return;          // :1065 — unguarded
localStorage.setItem(key, new Date().toISOString());  // :1066 — unguarded
```

Two hundred lines above, `getOrCreateVisitorId` wraps every storage access in `try/catch` and
states the rule (`:816-846`):

> *"Analytics must never throw or break the page — this function never does."*

`trackActivation` does not meet that bar. In Safari private browsing or under a storage-blocking
policy, `:1065` throws out of `trackActivation` — and its caller at
`app/(app)/workflows/[id]/page.tsx:94` is inside a `setTimeout` callback, so it surfaces as an
uncaught error in a timer. The activation event is lost. Activation funnel steps 3 and 4 are also
keyed per browser profile rather than per user, so the same user on two devices fires twice and a
user on a shared profile never fires.

### M — Emission

#### M-1 · LIVE · deflates (teams only) · **the one surface the counting module was written about does not use it**

`app/(app)/teams/page.tsx:77` — read-only finding, not actioned:

```js
if (mapped.requiredPlan) {
  track({ event: 'upgrade_prompt_viewed', location: 'teams_create', plan: mapped.requiredPlan });
}
```

This is inside `handleCreate()`, in the failure branch. It fires **once per failed attempt**. A
user who clicks "Create team" three times against the same block emits three prompt views while
the prompt never disappeared.

`lib/upgrade-prompt.ts:19-27` exists precisely to prevent that:

> *"Get that wrong in the other direction and the denominator inflates on every re-render, which
> would swing the funnel from flattering to flattering-in-reverse and be just as hard to notice."*

Two of the three emitting surfaces use the hook (`RecordingQuotaChip.tsx:42`,
`WorkflowRow.tsx:322`). The third does not — and it is the surface the module's own docstring is
about (`upgrade-prompt.ts:10-11`: *"`upgrade_prompt_viewed` fired from **one** — team
creation"*). The rule was extracted from the surface that had it and applied to the two that did
not.

#### M-2 · LATENT · landmine · **`sop_section_viewed.durationMs` is a constant**

`app/(app)/workflows/[id]/page.tsx:87, 92` — `const SOP_DWELL_MS = 30_000;` then
`track({ event: 'sop_section_viewed', workflowId: id, durationMs: SOP_DWELL_MS })`.

It is the dwell threshold, not a measured duration. No consumer reads it today. The first
analysis of "average SOP dwell time" will return exactly 30000 ms with perfect consistency and no
indication that it is a definition rather than a finding.

#### M-3 · LIVE · deflates every per-view rate · **`dashboard_v2_viewed` fires on the error path**

`DashboardV2Shell.tsx:400-403`, comment at `:398`: *"Fires when loading completes (either success
or error)."* On the error path `setUserPlanForAnalytics` at `:373` is never reached — it sits
inside the `try` — so a failed load emits a view with `workflowCount: 0`,
`chipsRenderedCount: 0` and `userPlan: 'unknown'`.

Failed loads are therefore counted in the same denominator as genuine empty states, and are
indistinguishable from them. Every rate computed per dashboard view is diluted by server failures.

#### M-4 · LIVE · inflates bounce · **the click counter is scoped to the shell root, so nav clicks are not engagement**

`DashboardV2Shell.tsx:717` attaches to `shellRootRef.current`, which is the div at `:1168`. A
click on the application nav, the sidebar, or anything outside that subtree does not increment
`clickCountSinceViewRef`. A user who arrives, clicks a nav item and leaves is recorded as a bounce.

Loop 73 met this and read it as a test-authoring mistake —
`e2e/app/dashboard/bounce.spec.ts:56-60`: *"A first attempt clicked `main` at its top-left corner,
which is padding on an ancestor — the listener never saw it… Right answer, wrong reason."* The
observation is correct about the test and stops short of the product question it raises.

### C — Consumption: two events with no reader

#### C-1 · LIVE · **`dashboard_bounced` has no consumer, so #57 criterion 1 is not computable**

`grep -rn "dashboard_bounced" apps/web-app/src` excluding tests returns **one** hit:
`DashboardV2Shell.tsx:745`, its own emission. It is not in `computeFunnel`'s step lists
(`route.ts:145-158`), not in `computeAlerts`, not in the engagement or retention routes, and not
named on `product/page.tsx`. The GET route's `eventCounts` would contain it as a raw total, but
nothing divides it by views.

**#57 criterion 1 is "bounce < 40%".** That requires bounced-views ÷ views. Nothing computes it.
Loops 71 and 73 fixed delivery and emission for a number that cannot currently be read, and
neither entry noted that.

#### C-2 · LIVE · **`chipsRenderedCount` has no consumer, so #57 criterion 3 fails for a second reason**

Same grep: one hit, `DashboardV2Shell.tsx:426`, its own assignment. The field's doc comment
(`analytics.ts:280-300`) carefully explains that chip-click rate must divide by the **sum of this
field** and exclude zero-chip views. The GET route counts events by name (`:132-142`); it never
sums a property across events. There is no code path that performs that sum.

`SYSTEM_HEALTH.md` already records criterion 3 as *"UNSCOREABLE pending a CEO number"*. It is also
unscoreable pending an aggregation that was never written, which is a different blocker and the
one actually under engineering control.

### Layers I found nothing further in — stated as results, not omissions

- **PII posture.** I read the full `AnalyticsEvent` union (`analytics.ts:32-700`). Properties are
  counts, taxonomy labels and opaque ids. `ui_error_boundary_triggered` carries the error's
  constructor name only and the comment at `:303-312` gives the right reason. `admin_bootstrap_claimed`
  truncates email to domain and IP to two octets. `filterProperties` strips the metadata fields it
  promotes to columns. I found no path by which recorded user content reaches an event property.
  **Clean.**
- **The pure modules.** `drain`, `shouldScheduleFlush`, `shouldDeliverOnVisibility`
  (`analytics-delivery.ts:55-73`), `shouldEmitBounce`, `bounceElapsedMs` (`bounce.ts:58-74`),
  `shouldEmitPromptView`, `nextEmittedState` (`upgrade-prompt.ts:54-78`) each do exactly what
  their docstrings say, and the edge cases are handled. **Clean.** Every defect in this report is
  in the wiring between them, not inside them.
- **`getOrCreateVisitorId`** (`analytics.ts:822-846`). Three-tier generation fallback, every
  storage access guarded, in-memory cache with a documented degradation, and 11 tests covering
  all of it. The one consequence worth knowing — a storage-blocked browser generates a fresh id
  per page load, inflating distinct-visitor counts — is stated in the docstring at `:816-820`.
  This is the best-built thing in the pipeline. **Clean.**
- **The ingest POST, judged on its own terms** (`route.ts:10-99`). Per-row isolation, honest
  counts, benign status separated from honest body, malformed-body path returns `ok: false`. Its
  problems (D-4) are relational, not internal. **Clean internally.** One non-defect note: the
  `for` loop with `await` inside is now 100 serial round-trips for a full batch on a request path.
  That shape predates loop 75, which made it permanent; a chunked `createMany` with per-chunk
  fallback would keep the isolation. Performance, not correctness.

---

## 4. Summary table

| # | Layer | Finding | Direction | State | Acted on by a human? |
|---|---|---|---|---|---|
| A-1 | Aggregation | activation alert: incomparable populations | flattering | live | yes — alert panel |
| A-2 | Aggregation | `api_error`/`client_error` have no emitters | flattering | live | yes — alert panel |
| D-1 | Delivery | bounce emitted after the only drain, on the mobile path | flattering | live | blocks #57 c1 |
| C-1 | Consumption | `dashboard_bounced` has no reader | n/a | live | blocks #57 c1 |
| C-2 | Consumption | `chipsRenderedCount` has no reader | n/a | live | blocks #57 c3 |
| A-3 | Aggregation | funnel stage 2→3 cross-population; rate ≥100% hidden | flattering | live | yes — conversion funnel |
| A-4 | Aggregation | immature cohorts averaged as 0% retention | unflattering | live | yes — retention chart |
| D-3 | Delivery | drain-before-confirm: failed delivery is permanent | flattering | live | no (invisible) |
| M-3 | Emission | error-state views counted as views | deflates rates | live | indirectly |
| D-2 | Delivery | bfcache return re-fires the bounce | inflating | live | blocks #57 c1 |
| A-6 | Aggregation | signup/checkout double-emitted into raw counts | flattering | live | yes — tiles/lists |
| M-1 | Emission | `teams_create` bypasses the counting rule | deflates | live | yes — per-location funnel |
| M-4 | Emission | click counter scoped to shell root | inflates bounce | live | blocks #57 c1 |
| A-5 | Aggregation | tiles count events, not entities | indeterminate | live | yes — top of page |
| D-4 | Delivery | client cap 500 vs server cap 100, report discarded | loses | latent | no |
| E-3 | Enrichment | `trackActivation` unguarded localStorage | deflates | latent | no |
| E-1 | Enrichment | `userPlan` global outlives its page and its user | mis-attributes | latent | no |
| E-2 | Enrichment | client timestamp discarded at ingest | smears later | live | no |
| M-2 | Emission | `sop_section_viewed.durationMs` is a constant | fabricates | latent | not yet |
| D-5 | Coverage | beacon-refusal branch untested in both suites | n/a | live | no |

Eleven live, four latent, plus D-5 as a coverage gap. **Nine of the fourteen directional findings
are flattering or loss-shaped; one is unflattering.**

---

## 5. Q1 — did loops 73-75 recur the class, and should the `Not covered:` convention be adopted?

### 5.1 Yes, three times

| Loop | Instrument | What it covered | What it did not | My finding |
|---|---|---|---|---|
| 73 | `e2e/.../bounce.spec.ts` | the event is **produced** — it reads `window.__ledgerium_events` at `:43` | that the produced event is **delivered** | D-1 |
| 73 | `lib/bounce.test.ts:15-37` | the **value** of `BOUNCE_TRIGGER` | that the trigger composes with the delivery triggers; the bfcache return | D-1, D-2 |
| 75 | `api/.../route.test.ts:168-177` | the route **reports** truncation | that the client can send more than the route accepts | D-4 |

The first is the sharpest. `bounce.spec.ts` ends exactly where `#241`'s delivery work begins, and
it must: its assertion method is *read the buffer afterwards*, which only works because
`firePageHide` at `:33` dispatches `new Event('pagehide')` in isolation. If a real page teardown
ran, the real `visibilitychange` would drain the buffer and the test's own read would find
nothing. **The test is structurally incapable of running against the lifecycle it claims to
exercise**, and that is the same property that makes it blind to D-1.

### 5.2 Scoring MR-038's falsifiable prediction

MR-038 §5.3 committed to this:

> *"If this convention is adopted, MR-039's strikes will be drawn from outside the set of things
> the `Not covered:` lines name. If MR-039's strikes are things the loops wrote down and shipped
> anyway, the convention is theatre and should be dropped."*

The convention was not adopted, so run it counterfactually. Derive each line from the
instruments' own docstrings as MR-038 specified:

- Loop 73 from `bounce.spec.ts:4-17` → *"Not covered: delivery of the emitted bounce."*
  **Names D-1.**
- Loop 73 from `bounce.ts:26-29`, which says `pagehide` fires *"including into the back/forward
  cache"* → *"Not covered: the bfcache return path."* **Names D-2.**
- Loop 75 from `route.test.ts:1-14` → *"Not covered: whether the client can exceed the cap."*
  **Names D-4.**

Three of my strikes are inside what the convention would have named. **On MR-038's stated test,
it is theatre, and the prediction resolves against it.** I am not reinterpreting the criterion to
rescue the proposal.

### 5.3 But the criterion was the wrong test, and the right conclusion is different

A line that correctly names a defect and does not prevent it is not theatre. It is a **known-
unknown register that nothing acts on** — which is the exact mechanism MR-038 itself diagnosed
one paragraph earlier: *"MR-037 §3.5 asked for guards that state their own coverage. You now write
them that way. Nothing reads the statement."* The convention reproduces the diagnosed failure at
one remove: it moves the unread statement from the docstring into the iteration entry.

So the convention as written fails, and the fix is one clause, not a new control:

> Add `Not covered:` to the Validation block, derived from the instruments' docstrings. **If a
> `Not covered:` line names a layer that produces a number anyone reads, it files a row in the
> same commit.**

That is the whole difference between a confession and an obligation, it costs the same keystrokes,
and it is self-enforcing — the row either exists in the diff or it does not. Under it, loop 73
would have filed "bounce delivery is untested" and "bfcache re-fire is untested" before shipping,
and D-1 and D-2 would be open rows rather than MR-039 strikes.

### 5.4 And the harder point, which my own findings force

**Eight of my fourteen findings — A-1, A-2, A-3, A-4, A-5, A-6, C-1, C-2 — could not have been
named by any `Not covered:` line written in loops 73-75, because those loops never touched the
aggregation layer.** A convention bounded by what the loop looked at cannot find defects in
layers the loop never visited, and that is where the worst ones are.

MR-038 said that if a third countermeasure failed, *"the right conclusion is that this class is a
permanent property of single-author loops and the remedy is the review, not the loop."* The
third countermeasure has failed, and my evidence supports the conclusion more strongly than MR-038
anticipated — but with a correction to its shape. The remedy is not "the review" in general. It is
**the periodic whole-subsystem sweep**, which is a different activity from both a loop and a
meta-review. Four defects in six loops, every one found while standing adjacent, and then fourteen
found in one deliberate traversal. The loop finds what it is standing next to; nothing in the
current cadence ever traverses.

**Recommendation on Q1: adopt the convention with the files-a-row clause (cheap, and it would have
caught three of this window's strikes), and separately schedule a whole-subsystem sweep as a
recognised loop shape.** The convention is a floor, not the answer.

---

## 6. Q2 — loop 73's `lib/bounce.ts` and loop 75's ingest changes, adversarially

### 6.1 Does exporting `BOUNCE_TRIGGER` close the mirror-test gap? **Half of it. The other half is relocated, not closed.**

**The half that genuinely closed.** `DashboardV2Shell.test.tsx:439` now imports
`shouldEmitBounce` and `bounceElapsedMs` from `@/lib/bounce` and adapts the signature at
`:442-446`. The nine tests that previously asserted against a local copy now assert against the
module the component imports. That is a real fix and the diagnosis behind it was correct.

**The half that was relocated.** The three new assertions in `bounce.test.ts`:

```js
expect(BOUNCE_TRIGGER).toBe('pagehide');            // :19
expect(BOUNCE_TRIGGER).not.toBe('beforeunload');    // :27
expect(BOUNCE_TRIGGER).not.toBe('visibilitychange');// :35
```

Each imports a constant and asserts its value. They are **tautologies against their own import**.
They can fail for exactly one reason — somebody edits line 41 of `bounce.ts` — and they assert
nothing about:

- whether `DashboardV2Shell` listens on `BOUNCE_TRIGGER` (it does, `:750`; no test checks it);
- whether `pagehide` is correct **in combination with** the delivery triggers (it is not — D-1);
- whether the emitter can fire more than once per view (it can — D-2).

The file's own docstring claims more than this delivers: *"`BOUNCE_TRIGGER` is exported from here
and consumed by the component… The thing that was wrong is now part of the tested surface."* The
*value* is part of the tested surface. The *use* is not, and the use is what was wrong.

**The precise characterisation:** a mirror test asserts a copy of the logic and gives false
comfort because the copy can diverge. A tautology test asserts a definition and gives false
comfort because it cannot diverge. Both produce green under the same defect. The second is
cheaper and more honest about its own shape, so this is an improvement — but it is not closure,
and the iteration-log claim that it is (ITERATION_LOG.md:45) should be narrowed.

**The strongest evidence that the gap is still open:** D-1 and D-2 are both live, both in this
exact module, and `bounce.test.ts` plus `bounce.spec.ts` are both green over both of them.

### 6.2 Loop 75's ingest changes

**The fix is correct and the reasoning is the best in the window.** The per-row `try`
(`route.ts:68-75`), `received` meaning written rather than built (`:88`), and the explicit
separation of *honest body* from *benign status* (`:61-63`) are all right, and the sabotage
verification is real — reverting either change fails four of the five new tests.

**Three adversarial notes.**

1. **The row's own premise is half-fixed and the entry reads as though it is fully fixed.**
   ITERATION_LOG.md:11 — *"A batch could lose most of itself and be told it had arrived intact."*
   After loop 75, a batch can still lose most of itself: 100+ events are truncated (`:39-42`) and
   failed rows are discarded with no retry or dead-letter (`:72-74`). What changed is that the
   response *says so*. To a caller the same file documents as not listening (`:36-37`). The
   information is honest and inert.

2. **`truncated` conflates two different faults into `ok: false`** (`:87`). Truncation is the
   client sending too much; failure is the server not writing. A reader of `ok` cannot tell which.

3. **The gap no test in either package can see is the one between the two caps** — 500 at
   `analytics.ts:916`, 100 at `route.ts:39`. Loop 75 made the symptom visible and did not ask why
   truncation is reachable at all. That is D-4, and it is the loop's own instance of the class the
   loop was closing.

---

## 7. Q3 — replace the follow-up ratio? **Yes. Implement it. Do not defer again.**

Measured for this window with the same command MR-038 used,
`git show <c>:IMPROVEMENT_BACKLOG.md | grep -cE "^\| [0-9]+ \|"`:

```
loop 64  120   (MR-036)
loop 70  123   e67e234
loop 71  123   db54394
loop 72  122   8425260
loop 73  124   8dcf7cb   (125 at the intermediate correction commit 7b9e798)
loop 74  123   93b56fd
loop 75  122   2cf6b73
```

**Window 73-75: 3 closed (#242, #240, #243), 3 created (#242, #243, #244) → ratio 1.00, twice the
0.5 floor.** Pool at loop 75: **122. Identical to loop 72. Up 2 from loop 64 — two rows over
eleven counted loops.**

MR-037's three replacement numbers, computed now:

| Number | MR-038 (loop 72) | MR-039 (loop 75) | Movement |
|---|---|---|---|
| Open pool | 122 | **122** | **0 over three loops** |
| Oldest open non-blocked | ~71 loops (#8) | **~74 loops** — #11, #12, #16, #17 all still read `new (iter 001)` | **+3, exactly the loops elapsed** |
| Median age-at-close, last 3 | 2 loops | **2 loops** (#242 = 0, #243 = 2, #240 = 5) | unchanged |
| Externally-originated closures | 0 of 3 | **0 of 3** | unchanged |

Verified: `grep -oE "^\| (11\|12\|16\|17) \|"` on the current `IMPROVEMENT_BACKLOG.md` returns all
four rows, status `new (iter 001)`.

**The verdict, and it is now unarguable.** Two consecutive windows have produced the two best
ratio readings in the metric's history — 3.00, then 1.00 — while all four diagnostic numbers were
flat. The ratio has returned a passing grade in every window since it was adopted and has never
once pointed at the thing that is wrong.

**My window adds one argument MR-038 did not have.** Row #242 was filed and closed **inside loop
73**. It is +1 to the numerator and +1 to the denominator. The metric cannot distinguish *working
the queue* from *writing a row about the bug you are about to fix* — and it awards the latter the
same credit. That is not a weighting problem; it is a definition problem, and both of its terms
are written by the agent it grades.

**Implement MR-038 §9.3 as specified.** Replace the ratio with the three-number line in
`validate-backlog.mjs`:

```
validate-backlog: 237 rows, 135 struck, 19/19 malformed-row budget used — clean
                  122 open (+0 vs loop 72, +2 vs loop 64) | oldest open non-blocked: ~74 loops (#11)
                  | median age-at-close, last 10: 2 loops
```

All three derive from columns the validator already parses. Nothing new to maintain. The
recommendation has now been made three times (MR-037, MR-038, MR-039) against four windows of
consistent evidence; a fourth deferral should be treated as a decision to keep a metric that is
known not to work.

---

## 8. Q4 — what loops 73-75 got wrong

1. **`ITERATION_LOG.md:45`** — *"the trigger is exported from it precisely so the thing that was
   wrong is part of the tested surface."* Overstated. `bounce.test.ts:19,27,35` assert the
   constant's value, not its use; no test asserts that `DashboardV2Shell` listens on it. The code
   is right (`DashboardV2Shell.tsx:750`); the claim about the test is not. §6.1.

2. **`ITERATION_LOG.md:47,50`** — *"Verified in a browser, which is the only place a page-lifecycle
   event is real"* / *"bounce e2e 2/2"*. The e2e dispatches a synthetic
   `new Event('pagehide')` (`bounce.spec.ts:33`) and asserts on the client buffer (`:43`). No
   page-lifecycle sequence runs, and the test's assertion method would break if one did. It
   verifies emission in a browser, not the lifecycle. §5.1.

3. **`ITERATION_LOG.md:42-44`** — the entry presents loops 71 and 73 as completing each other
   ("the new delivery path had nothing to deliver"). They do not compose: D-1. Nothing in either
   loop, and nothing in the suite, tests the composition.

4. **`ITERATION_LOG.md:12`** — *"Each row now gets its own `try`, so one bad event costs one
   event."* True. But it sits under a heading asserting the row's premise is resolved, and a batch
   can still lose most of itself to truncation (`route.ts:39-42`) and to permanently-discarded
   failures (`:72-74`). §6.2.

5. **`ITERATION_LOG.md:51`** — *"Follow-ups: 3 created (#242 closed same loop, #243, #244), 1
   closed."* Accurate as bookkeeping; the pool moved 122 → 125 → 124 across the loop's two
   commits. The same-loop file-and-close is a free +1 to both ratio terms. §7.

6. **Loop 74 — nothing to correct, and the durable half is the best thing in the window.**
   `ITERATION_LOG.md:29-30`: *"An allowlist keyed by file grants a reason written for one thing to
   everything that follows it"*, fixed by counting exemptions so a third use fails with *"a new
   use has inherited an exemption written for something else."* That is the first countermeasure in
   this programme that makes the failure mode structurally unreachable rather than merely
   documented. It is also, in form, exactly what §5.3 asks for: an unread statement converted into
   an enforced obligation.

7. **Not an error, but the mechanism worth naming.** The drain listeners are registered at module
   scope (`analytics.ts:1008-1018`) and the bounce listener at component scope
   (`DashboardV2Shell.tsx:750`). Different lifetimes, different files, no shared test surface.
   That asymmetry is why D-1 is invisible to any test either file could plausibly carry, and it is
   a stronger explanation for this window's escape than author attention.

### What I could not verify

- **The exact `pagehide` / `visibilitychange` ordering on a real iOS Safari and a real Chrome for
  Android**, on both the navigate-away path and the background-then-discard path. I have no device
  and Playwright's synthetic dispatch cannot settle it — that is precisely the property that made
  `bounce.spec.ts` blind. D-1 is derived from the code (the drain triggers are enumerable, the
  flush threshold is unreachable for one event, `beforeunload` is excluded by premise) plus the
  documented lifecycle; the delivered/lost split by path is the step that needs a device. **It is
  one measurement: load the dashboard on a phone, background the app, kill it, and check whether
  a `dashboard_bounced` row exists.**
- **Live magnitudes for anything.** No production data was consulted. Every direction in §3 is
  derived from code; none is quantified.

---

## 9. Next pick

**#242's successor — guarantee delivery of a page-lifecycle-emitted event (§3 D-1), `web-app /
analytics`.** It is the fourth repeat of the same mobile-flattering class in the same subsystem,
and until it is fixed loops 71 and 73 both deliver nothing on the path they were written for.

Runners-up, in order: **A-2** (two error channels with no emitters and a P2 alert that can never
fire — probably the cheapest correction in this document); **A-1** (the activation alert's
incomparable populations); **C-1 + C-2** as one row (neither #57 criterion is computable, which is
the reason to fix D-1 at all).

**File before fixing**, per MR-038's own recommendation and loop 73's precedent: A-1, A-2, A-3,
A-4, C-1, C-2, D-1, D-2, D-3 are all unrowed. #244 already covers the stage-1→2 half of A-3.

---

## 10. CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **#216** extension untouched | **32 loops, fifth ask.** `871e29a`, 2026-09-24. Status `blocked — CEO decision`. | Nothing. Loops 73-75 were all `web-app`. The row is correctly marked blocked and the coordinator correctly did not invent extension work to reset a counter. **This is the fifth consecutive review raising it; at five asks the question is no longer "what is the decision" but "is the row's blocked status still true".** |
| **#57 criterion 3** chip-click rate ≥ 10% | Recorded as *"UNSCOREABLE pending a CEO number"*. | **A second, independent blocker found: no code sums `chipsRenderedCount`** (§3 C-2). The CEO number is necessary and not sufficient. |
| **#57 criterion 1** bounce < 40% | MR-038 found it unsound; loop 73 fixed the emitter. | **Still not evaluable, for two new reasons:** `dashboard_bounced` has no consumer (C-1), and the event is lost on the dominant mobile path (D-1). **Two of three #57 criteria remain un-computable** — the status quo from MR-038, with the causes now specific and fixable. |
| **#225** `TRUSTED_PROXY_HOPS` | *"STILL OPEN — the var is the CEO's to set"*; auth limits bypassable until then. | Unchanged across three further loops. The engineering side was finished at loop ~56; this has been one environment variable for ~19 loops. |
| **#212** E2E deploy gating | P-6/P-7 adopted as practice; deploy gating waits on one green CI run of the `real-extension` job. | Unchanged. Note the interaction with this review: §3 D-5 and §5.1 show the browser suite is where the uncovered paths are, so the value of gating on it is higher than when #212 was filed. |

---

## 11. Verdict

The window shipped three correct fixes and one genuinely durable countermeasure (loop 74's counted
exemptions). The control rules held: saturation forced loop 74's pivot and it happened; cadence
was flagged on time at loop 75; validation claims reconcile exactly against a fresh run.

And the thing the window was about is worse than the window thought. Four defects in six loops
were not four draws from a neutral process — the pipeline's only failure mode is subtraction, so
it flatters by construction, and a deliberate traversal found eleven more live defects in one
pass. The two worst are alerts that cannot fire. The fourth repeat of the mobile-flattering bounce
class is already shipped, in loop 73's own fix. Two loops were spent making an event correct that
nothing reads.

Loop 75 wrote the right sentence: *"The pipeline was never audited as a whole; each defect was
found while standing next to it doing something else."* That is the finding, and it generalises
past analytics. The `Not covered:` convention is a floor worth having with the files-a-row clause,
and it would have caught three of this window's strikes and none of the other eight. The remedy
for the other eight is a loop shape that traverses a subsystem rather than visiting a row.
