# MR-038 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 70, 71, 72 (counted), plus loop 69 (Mode 3 correction, non-counting) read as the discharge
of MR-037.
**Cadence:** MR-037 closed at loop 68. Three counted loops since. **On time, for the second cycle running** —
`CLAUDE.md § Meta-Review Cadence` base floor is 2-3. Loop 72's entry flags it itself.

**No product code changed. No `CLAUDE.md` edit is proposed anywhere in this document.**
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md` and `SYSTEM_HEALTH.md` untouched.

**Executed during this review, not read from prose:**

| Command | Result |
|---|---|
| `npx vitest run` (web-app) | **184 files / 3260 tests, all pass** — loop 72's claim verified exactly |
| `pnpm typecheck` | **clean, 11 packages** — loop 72's claim verified |
| `npx vitest run src/app/theme-contrast.test.ts` | **28/28** (was 24 at MR-037; loop 69 added 4) |
| `node scripts/validate-backlog.mjs` | `234 rows, 131 struck, 19/19 malformed-row budget used — clean` |
| `git show <c> -- IMPROVEMENT_BACKLOG.md` ×9 | per-commit open-row counts, §6.1 |
| two purpose-written probes against the real `SharedRequestCache` | both pass; §2 S-3, S-4 |
| a Node pass over `globals.css` deriving `:root` ∩ `.light` ∩ print | 15 theme-dependent tokens, §9.4 |

I did not run Playwright (no server/db) — §12 lists what that leaves unverified.

---

## 1. Lead — what is wrong, in order of consequence

1. **The third flattering-direction analytics defect is live, unrowed, and loop 71 was standing on top of
   it.** `dashboard_bounced` — the one event whose entire purpose is to measure bouncing — is emitted from a
   `beforeunload` listener (`DashboardV2Shell.tsx:729-742`). Loop 71's own module docstring
   (`analytics-delivery.ts:10-12`) establishes that *"`beforeunload` is unreliable by design on mobile. iOS
   Safari and Chrome on Android routinely discard a page without firing it."* Loop 71 fixed the **transport**
   for events already in the buffer and left the **emission** of the bounce event on the trigger it had just
   condemned. Bounce under-reports, the loss is concentrated on mobile, and mobile bounces most — the identical
   argument loop 71 made about short sessions, applied to the event named for the behaviour. **This is your
   Q4 answer, found by inspection.** **S-1.**

2. **Loop 70 recorded the wrong plan on the event it created, and pinned it in a browser test — in the loop
   whose subject was recording wrong numbers.** `RecordingQuotaChip.tsx:39` emits
   `{ location: 'dashboard_v2_quota_chip', plan: 'team' }`. The CTA that same component renders on that same
   condition says **"Solo removes the monthly cap"** (`quota-meter.ts:53-55`). `quota-meter.test.ts:65-71` is a
   test named ***"never names Team (not self-serve)"***. `quota-meter.test.ts:77-84` derives the right answer
   programmatically and gets `solo`. The entry says *"Plan values verified, not assumed."* **S-2.**

3. **Loop 72's fix issues two `/api/account` requests where it claims one, on both pages it touched — and the
   instrument that would falsify that visits neither.** `useAccount()`'s own mount effect fires `load(false)`
   and the page's added effect fires `refetch()` → `clear()` + `get()`. On a cold cache — every hard load,
   including the post-checkout landing — that is two network requests. `ITERATION_LOG.md` loop 72: *"Net two
   requests to one."* `CHANGELOG.md`: *"Each also makes one request instead of two."*
   `account-fetch.spec.ts:19` tests **`/dashboard`** and nothing else. **S-3.**

4. **`SharedRequestCache.clear()` does not invalidate an in-flight fetch**, so a pre-refetch response that
   lands second overwrites the refetched value *and is re-stamped fresh for a full TTL*. Demonstrated with a
   probe against the real class. Latent today because both requests in S-3 are identical. **S-4 (minor).**

5. **Loop 71 falsified the premise of an open backlog row's re-scoping and of a code comment, and updated
   neither.** Row #94 clause (c) and `analytics.ts:874-878` both argue against the queue-and-drain fix *because
   `dashboard_bounced` fires from `beforeunload` via `sendBeacon`, so anything queued is never sent*. After
   loop 71 there is a `visibilitychange` delivery, and that argument no longer stands as written. Fourth
   instance of MR-037 S-4's class. **S-5 (minor).**

**What is not wrong, and it is substantial.** Loop 69 verified and discharged all five MR-037 strikes *and*
three of MR-037 §12's four fold-ins (`.ts` filter widened at `theme-contrast.test.ts:177`; print-block slice
bounds asserted at `:135-136`; `ALLOWED_LITERALS` converted from a decorative number to a recomputed assertion
at `:236-245`) — and recorded three failed drafts of the semantic guard in the file, including the one that
*"silently skipped tokens missing from `.light`, which excluded exactly the class it was written to catch."*
Loop 70 found a real conversion defect and refused the tempting over-correction, then discovered its own test
was wrong twice and said so. Loop 71 found a *second* defect while fixing the first and fixed it in the right
order, then verified in a real browser with sabotage. Loop 72 caught a delegated regression by reading the
report's load-bearing claim against the code — the right method, executed. **Three consecutive loops closed
more than they opened, for the first time in the record I can see** (§6).

---

## 2. Strikes

### S-1 — SHIPPED, LIVE, UNROWED. The bounce event is emitted from the trigger loop 71 declared unreliable.

**The code.** `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx:727-742`:

```ts
  // MDR-P09 (a): beforeunload bounce emission.  Fires dashboard_bounced when
  // the user exits without any tracked click interaction.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!dashboardViewFiredRef.current) return;
      if (clickCountSinceViewRef.current > 0) return;
      ...
      track({ event: 'dashboard_bounced', workflowCount, elapsedMsSinceDashboardView });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
```

`grep -rn "beforeunload\|visibilitychange\|pagehide" apps/web-app/src` returns **exactly two `beforeunload`
registrations and one `visibilitychange`**: `analytics.ts:1002` (visibility → deliver), `analytics.ts:1009`
(unload → deliver), and `DashboardV2Shell.tsx:741` (unload → **emit**). Loop 71 rewrote the first two. It did
not touch the third. There is **no `pagehide` listener anywhere in the repo.**

**The contradiction, in loop 71's own words** (`analytics-delivery.ts:10-14`):

> `beforeunload` is unreliable by design on mobile. iOS Safari and Chrome on Android routinely discard a page
> without firing it; the platform guidance is that `visibilitychange` → `hidden` is the last event a page is
> guaranteed to see.

If that sentence is true — and it is the whole justification for row #241 — then on the population it
describes, `handleBeforeUnload` never runs, `track()` is never called, and **the bounce is not merely
undelivered, it is never produced.** Loop 71's fix cannot help: `drain` can only send what `track` put in the
buffer.

**Why this is the same family as #238 and #241 and not a new one.**

| | biased how | population lost |
|---|---|---|
| #238 (loop 70) | denominator undercounted → prompt→click inflated | 3 of 4 prompt surfaces |
| #241 (loop 71) | short sessions dropped → engagement inflated | mobile, short visits |
| **this** | bounces never emitted → **bounce rate deflated** | **mobile, bouncing visits** |

All three flatter. This one flatters hardest, because the lost population is *definitionally* the numerator:
a bounce that never fires is a bounce that never happened, and the users who bounce on mobile are the same
users whose browsers do not fire `beforeunload`.

**It is load-bearing for a standing CEO decision.** `CLAUDE.md § Current Phase` and the revised PRD state the
#57 retirement rule as *bounce < 40% AND free-tier p50 click < 60s AND chip-click rate ≥ 10%*. MR-037 §14 item
2 records criterion 3 as unscoreable for 20 loops and treats the other two as evaluable. **Criterion 1 is
evaluable and systematically wrong in the permissive direction** — an under-emitted bounce event makes
`bounce < 40%` easier to satisfy. A decision taken on it today would be taken on a number that is low for a
reason nobody has recorded.

**It is on no row.** `grep -n "dashboard_bounced" IMPROVEMENT_BACKLOG.md` returns four narrative mentions and
**one live row — #94**, which mentions it only to argue *against* a different fix (§S-5). Row #73 (MDR-P09),
which shipped the emitter, is struck. Same structural position as MR-037's S-1: a live defect with no row,
created by the loop that closed the row that would have covered it.

**Second-order, and a point in loop 71's favour that it did not claim.** The listener in `analytics.ts:1009`
is registered at *module evaluation*; `DashboardV2Shell`'s is registered in a mount effect. On `window`,
same-type listeners fire in registration order, so on desktop the analytics drain ran *before* the shell
pushed `dashboard_bounced` — the bounce landed in a just-emptied buffer with nothing left to deliver it.
Per the HTML unload steps (`beforeunload` → `pagehide` → `visibilitychange:hidden` → `unload`), loop 71's new
visibility listener now fires *after* `beforeunload` and picks it up. **Loop 71 accidentally fixed the desktop
half of this.** Derived from the spec, not observed — see §12.

**The fix, and it is the shape you shipped last loop.** Move the emitter to `pagehide`, which fires reliably on
mobile (including into bfcache) and, unlike `visibilitychange`, does not fire on a tab switch — a tab switch is
not a bounce. Keep `beforeunload` as the desktop belt-and-braces with a `hasEmittedRef` guard, exactly as
`drain` makes the second delivery attempt a no-op. **File it before you fix it** (§11).

---

### S-2 — SHIPPED. `plan: 'team'` on the quota prompt, contradicted three files away by a test named for the error.

`RecordingQuotaChip.tsx:33-39`:

```ts
  // Row #238. ... Team is the plan that lifts the recording cap
  // (plans.ts: free 5, starter 15, team unlimited).
  useUpgradePromptViewed(state.cta ? { location: 'dashboard_v2_quota_chip', plan: 'team' } : null);
```

`state.cta` — the same expression used as the emit condition — is the string the user is shown, and it is
built from `quota-meter.ts:52-55`:

```ts
/** Lowest self-serve plan with no monthly recording cap. Test-bound to plans.ts. */
export const UNCAPPED_PLAN_LABEL = 'Solo';
const CTA = `${UNCAPPED_PLAN_LABEL} removes the monthly cap`;
```

Verified against `plans.ts`: `PLAN_HIERARCHY = ['free','starter','solo','team','growth','enterprise']`
(`:206`); `solo.maxRecordingsPerMonth = Number.MAX_SAFE_INTEGER` (`:114-115`); `team` likewise (`:129-130`).
Four plans are uncapped. **The lowest, and the one the surface names, is `solo`.**

Three independent artefacts in the repo already say so:

1. `quota-meter.ts:9-10`, the module's own history: *"Its copy was also wrong: it said 'Upgrade to Team for
   unlimited', **and Team cannot be bought self-serve**."* A previous loop found and fixed this exact error in
   the copy layer. Loop 70 reintroduced it in the analytics layer.
2. `quota-meter.test.ts:65-71`, a passing test literally titled **`never names Team (not self-serve)`**.
3. `quota-meter.test.ts:77-84`, which computes the answer rather than asserting it:
   `PLAN_HIERARCHY.find(p => getPlanConfig(p).maxRecordingsPerMonth === Number.MAX_SAFE_INTEGER)` → `'solo'`.

And it is now **pinned by the new e2e**: `upgrade-funnel.spec.ts:90` asserts `expect(views[0]!.plan).toBe('team')`.
A future correction has to change a green browser test to make it right.

**Why this is Q1's class and not carelessness.** Loop 70's entry: *"Plan values verified, not assumed. `team`
lifts the recording cap … read from `plans.ts`, after a first regex reported `healthScores: true` for the free
tier."* The verification was real and the instrument was `plans.ts`. **`plans.ts` answers "which plans are
uncapped" (four). The defect required "which plan does this surface tell the user to buy" (one).** The second
question is answered, derived and test-guarded in the module the component imports on line 4. Coverage
narrower than the defect, with the correct answer one import away. §5.

**The other half is right, and worth saying.** `HealthTooltip`'s `plan: 'starter'`
(`WorkflowRow.tsx:322-323`) is correct: `plans.ts:51` gives free `healthScores: false` via `NO_FEATURES`,
`:91` gives starter `healthScores: true`, and starter is the lowest tier above free. One right, one wrong,
from the same verification pass.

**Harm today: latent; harm tomorrow: the analysis the row prescribes.** `analytics/product/page.tsx` does not
currently break the funnel down by the event's `plan` property (the only `.plan` read at `:569` is
`user.plan` in a user table), so nothing renders the wrong value yet. But it is being **persisted** into
`AnalyticsEvent.properties` (`api/analytics/events/route.ts:36`), and the row's own stated remedy is *"the two
stages should be compared per `location`"* — a per-dimension analysis of the exact event that now carries a
wrong dimension. A "Team prompt impressions" figure computed from this would be fiction, because Team is not
self-serve and no one is being prompted to buy it here.

---

### S-3 — SHIPPED. Two `/api/account` requests where the entry and the CHANGELOG both say one, on both pages, and the request-counting instrument visits neither.

**The mechanism.** Both pages now do this (`account/page.tsx:327,338-340`; `upload/page.tsx:40,54-56`):

```ts
const { account, refetch: refetchAccount } = useAccount();   // registers effect #1
...
useEffect(() => { refetchAccount(); }, [refetchAccount]);    // registers effect #2
```

`useAccount` declares its own mount effect at `useAccount.ts:140-142` → `load(false)`. On a **cold cache**
that calls `accountCache.get(fetchAccount)`, which invokes `fetchAccount()` and stores the promise
(`accountCache.ts:101-113`). Effect #2 then runs `load(true)` → `accountCache.clear()`, which sets
`inFlight: null` (`:119`) → `get()` sees no in-flight and **invokes `fetchAccount()` a second time**.

Both effects are declared in the same component and run in declaration order on mount. There is no branch
that avoids this on a cold cache: `peek()` returns null both times.

**Probe, run against the real class** (`SharedRequestCache` imported from `@/hooks/accountCache`, executed
under the repo's own vitest config, passes):

```ts
const cache = new SharedRequestCache<{n:number}>(CACHE_TTL_MS, () => 1000);
let calls = 0; const fetcher = () => { calls += 1; return Promise.resolve({ n: calls }); };
cache.get(fetcher);   // hook mount effect, load(false)
cache.clear();        // page mount effect, refetch()
cache.get(fetcher);
// => calls === 2
```

**The arithmetic, both directions.**

| Scenario | before loop 72 | after loop 72 |
|---|---|---|
| hard load of `/account` (cold module, cold cache) | page's own `fetch` 1 + `TrialStatusChip` 1 = **2** | `load(false)` 1 + `refetch()` 1, chip shares in-flight = **2** |
| client-side nav into `/account` within the TTL | page's own `fetch` = **1** | `load(false)` serves cache, `refetch()` fetches = **1** |

**Unchanged in both cases.** `(app)/layout.tsx` wraps both pages in `AppShell`, which renders
`TrialStatusChip` (`AppShell.tsx:72`), so the chip was always a second reader on these pages — it now shares
the in-flight promise, which is the one thing that did improve, and it is cancelled out by the duplicate the
refetch creates.

**The claims.** `ITERATION_LOG.md` loop 72: *"Net two requests to one, since it now shares with
`TrialStatusChip`."* `CHANGELOG.md`, the document the CEO reads: *"Each also makes one request instead of
two."* Both false. The typing win is real and is the row's actual subject; the request-count claim is an
unforced addition.

**And this is the cleanest Q1 instance in the window.** `e2e/app/dashboard/account-fetch.spec.ts:19` is
`test('the dashboard issues exactly one /api/account request')`. Its docstring is exemplary — it explains why
a unit test cannot settle this and why only a browser can. It navigates to `/dashboard`. Loop 72 changed
`/account` and `/upload`, made a request-count claim about both, and ran an instrument that measures
`/dashboard`. The instrument even **states its own scope in its own title**, and the scope was not read
against the change. §5.

The fix is the same shape as the existing spec and is four lines: the same request counter, `page.goto('/account')`,
assert 1. It fails today.

---

### S-4 (minor, latent) — `clear()` abandons an in-flight fetch without invalidating it, so the older response can win and be re-stamped fresh.

`accountCache.ts:117-120`:

```ts
clear(): void { this.state = { value: null, storedAtMs: 0, inFlight: null }; }
```

The promise created before `clear()` still holds its own `.then` (`:103-107`), which writes
`this.state.value = value` and `this.state.storedAtMs = this.now()` on the **new** state object. Nothing
carries a generation token, so a late-landing pre-clear response overwrites the post-clear one and marks it
fresh for a further full TTL.

**Probe, run against the real class, passes:**

```
get(A) [slow]  →  clear()  →  get(B) [fast]  →  B resolves, peek() === 'FRESH'
                                                A resolves later, peek() === 'STALE'
                                                and stays 'STALE' for a further 30s
```

**Not live today**, because in S-3 both requests are the same GET issued microseconds apart with nothing
changing between them. It becomes live the moment `refetch()` is called *after* a mutation while a read is in
flight — which is precisely the use case the comment at `useAccount.ts:105-106` advertises: *"Call `refetch()`
to bust the cache immediately — after a plan change, say."* Fixing S-3 (drop the redundant `load(false)` path,
or make `clear()` bump a generation counter that the in-flight `.then` checks) closes both.

---

### S-5 (minor) — loop 71 invalidated the stated premise of an open row and of a code comment, and updated neither.

**Row #94** (`IMPROVEMENT_BACKLOG.md:248`), open, score 13, clause (c):

> **(c) The prescribed fix would have lost data.** Queue-until-plan-set then drain: `dashboard_bounced` fires
> from `beforeunload` via `sendBeacon`, so anything still queued at that moment is never sent — trading a
> visible gap for missing events.

**`analytics.ts:874-878`**, inside `track()` — a function loop 71 edited at `:912`:

> Deliberately NOT the fix the row prescribed (queue events until the plan resolves, drain on set).
> `dashboard_bounced` fires from `beforeunload` via `sendBeacon`; anything still sitting in a queue at that
> moment is never sent, so queuing would trade a visible gap for lost events.

After loop 71 there is a `visibilitychange` → hidden delivery path (`analytics.ts:1002-1006`). A queue drained
at `hidden` is not in the position the argument describes. The conclusion may well survive on other grounds
(queued events still die if the plan never resolves) — **the reasoning as written no longer does**, and it is
the reasoning a future loop will read when it picks up #94.

This is the **fourth** instance of the class MR-037 S-4 named at three (loop 55, loop 61, loop 68): a change
lands and the prose that documents the changed mechanism is left standing. MR-037's suggested check —
*"`git show <sha> --stat` and re-read the head of any file whose convention changed"* — would not have caught
this one, because the stale prose is in `IMPROVEMENT_BACKLOG.md` and in a *different function* of a file that
was touched. The generalisation is: **when a loop's entry says "X was the only way Y could happen", grep for
X and read every hit.** `grep -n "beforeunload" ` across `src` and the backlog returns 6 hits and takes
nine seconds; three of them are this finding and S-1.

---

## 3. Non-strike findings, ordered by how much they would change your mind

**3.1 The ingestion route drops the remainder of a batch on the first DB error and reports success.**
`api/analytics/events/route.ts:41-48`:

```ts
try { for (const record of records) { await (db as any).analyticsEvent.create({ data: record }); } }
catch (err) { console.error('[analytics:persist]', err); }
return NextResponse.json({ ok: true, received: records.length });
```

One `catch` outside the loop: record 3 of 50 throwing means records 4-50 are never attempted. The response
then reports `received: 50`. This is the same shape as `01aef52` *"one bad row costs that row, not the whole
dashboard"*, in the ingestion path rather than the render path. Direction of bias is not systematic, so it is
not a fourth member of the family — but it is silent loss reported as success, in the pipeline two loops just
spent fixing silent loss. Three lines: move the `try` inside the loop, count successes, return the real number.

**3.2 `events.slice(0, 100)` truncates without saying so — latent, and loop 71 made it more reachable.**
Same file, `:32`. The client buffer is capped at 500 (`analytics.ts:909`) and now drains in full on every
`hidden`. Truncation keeps the oldest 100 and discards the newest. I could not construct a realistic path to
>100 events in one delivery — loop 70 established a dashboard load produces two or three, and `flushEvents`
fires at ten — so I am **calling this latent, not live**, rather than inflating it into a finding.

**3.3 The refused-beacon path is claimed, deliberate, and exercised by nothing.** `analytics.ts:963`
`if (!ok) buffer.unshift(...events);`. Loop 71's entry: *"Handled the refusal case too."* `deliverBufferedEvents`
is not exported, so no unit test reaches it; `analytics-delivery.spec.ts:31` stubs `sendBeacon` to
**always return `true`**, so the e2e cannot reach it either. The logic reads correct. It is an untested claim
in a window whose theme is untested claims, and it is the one path where a bug loses data while handling data
loss. Cheapest fix: have the e2e stub return `false` once and assert the buffer is non-empty afterwards.

**3.4 Loop 70 widened funnel stage 2 without widening stage 1, and told the CEO to read a >100% rate as the
old defect.** `computeFunnel` (`route.ts:161-183`) counts unique users per step *independently* — no
conditioning on the prior step — so stage rates can exceed 100%. Before loop 70, `upgrade_prompt_viewed` fired
only at the team-creation gate. It now fires from the quota chip at **80%** of the cap (`quota-meter.ts:99`),
while `plan_limit_hit` fires only when an upload is *rejected* at 100% (`api/upload/route.ts:30`,
`api/sync/route.ts:68`), and from the health-gate tooltip, which has nothing to do with recording limits at
all. So `plan_limit_hit → upgrade_prompt_viewed` will now routinely read above 100% **for a new reason**. The
CHANGELOG tells the CEO: *"if it showed prompt-to-click above 100%, this is why."* Going forward, a >100% at
the *previous* stage will look like the same symptom and will not be. The row's mitigation ("compare per
`location`") addresses the stage-2-vs-3 mismatch it created and not this one.

**3.5 MR-037 §12 set three conditions on #238; the entry discharges two.** Condition 1 (fire once per prompt
instance) — discharged, with a module and an e2e. Condition 3 (decide event-vs-component before adopting
`UpgradeCTA`) — discharged explicitly and well. **Condition 2 — *"Check the historical data after. If
prompt→click exceeds 100% in the existing series, that confirms the defect and dates it — which is worth more
than the fix"* — appears nowhere in the entry, the commit or `SYSTEM_HEALTH.md`.** The CHANGELOG converts it
into advice for the reader (*"Worth re-checking any conversion figure from that report"*), which is not the
same as having checked. It may be unrunnable without production data; saying so would have closed it.

**3.6 `shouldEmitBounce` is a mirror, and it has nine green tests over S-1.**
`DashboardV2Shell.test.tsx:435` and `:445` define `shouldEmitBounce` and `computeBounceElapsedMs` **in the
test file**, with docstrings that say so: *"Logic **mirrors** DashboardV2Shell's handleBeforeUnload."* Nine
`it()` blocks (`:453-475` and the two adjacent describes) assert the bounce rule. Every one passes. None of
them can see the trigger, because the trigger is the part that was not extracted. This is the single best
argument for the pattern Q3 asks about — §7.

**3.7 `analytics-delivery.test.ts:80-107` composes its own delivery loop.** The `hides, returns, hides again`
test defines `function hide() { if (shouldDeliverOnVisibility('hidden')) delivered.push(...drain(buffer)); }`
— a restatement of `deliverBufferedEvents`. If `analytics.ts` forgot to call `drain`, this test still passes.
The e2e is the real guard and loop 71 says so, so this is a note rather than a finding; but the file's opening
claim is *"Both directions are covered"*, and the direction covered by this particular test is a composition
the test wrote itself.

**3.8 `accountCache.ts:7-8` says "181 test files, zero of them rendering a component".** Measured today:
**184**. Trivial, cited only because it is the same drift class as S-5 and because the number is load-bearing
for the argument the docstring is making (§7).

**3.9 MR-037 §4.2(f) is still open and still free.** `theme-contrast.test.ts:140` hardcodes six token names.
I derived the property it wants directly from `globals.css`: **15 tokens differ between `:root` and `.light`**,
and **all 15 are present in `.sop-print-root`** — so the guard is correct today and checks 6 of 15. A
sixteenth added and forgotten passes. Three lines make it self-maintaining. It was a §4 observation rather
than a §12 action item, so loop 69 not taking it is not a miss — carried forward.

**3.10 Agent rotation: the trigger was read as "rotate next loop"; `CLAUDE.md` says it forces a meta-review.**
Loop 71's entry: *"coordinator, 4 consecutive, which crosses the 4+ threshold … the next loop must rotate
regardless."* `CLAUDE.md § Meta-Review Cadence` lists *"Same implementing agent used for 4+ consecutive loops"*
under **Early triggers** — *"any of these forces an immediate meta-review."* The correct response at loop 71's
close was Mode 4, not a rotated Mode 1. No practical harm: the base 2-3 cadence lands MR-038 here anyway. But
the loop that ran in the slot the trigger was asking for is the loop that shipped S-3, and I note that without
claiming a review would have caught it.

---

## 4. What the window got right

- **Loop 69 discharged five strikes and three fold-ins, and recorded its own failures.** Three wrong drafts of
  the semantic guard are written into the file, including the one that *"silently skipped tokens missing from
  `.light` — which excluded exactly the class it was written to catch."* That is the highest-value paragraph
  in the window: an instrument that failed by being narrower than its target, caught by its author, in the
  loop correcting a review about instruments that are narrower than their target.
- **Loop 69 accepted a correction to its own diagnosis.** MR-037 was right that the `AnalyticsConsent` hover
  was *inverted* rather than absent; the entry says so plainly.
- **Loop 70 refused the tempting over-correction.** *"Fixing an undercount by firing per-render would inflate
  the same denominator: the identical error reversed."* The counting rule exists because the risk is
  symmetric, and both directions have tests (`upgrade-prompt.test.ts`, 15) and a browser test for the
  over-count direction (`upgrade-funnel.spec.ts:94-113`, forced re-renders).
- **Loop 70 disbelieved a red test.** *"Had I trusted the first red run, I would have 'fixed' working code."*
  Two wrong e2e versions, both diagnosed as the author's error, and the reason written into the spec's
  docstring so the next reader does not repeat it.
- **Loop 71 found the second defect before shipping the first fix, and fixed them in the right order.** The
  read-without-clear bug was harmless under `beforeunload` and catastrophic under `visibilitychange`. Noticing
  that a *new trigger changes the safety of existing code* is a different and harder observation than finding
  the original defect, and *"trading lost events for duplicated events is not a fix"* is the correct framing.
- **Loop 71 made the hazard structural rather than documented.** Every path goes through `drain`
  (`analytics-delivery.ts:55-57`), which returns-and-empties in one step, so read-without-clear is not
  discouraged, it is unavailable.
- **Loop 71's e2e is the right instrument for its layer.** Stubbing `sendBeacon` rather than intercepting it,
  driving real `visibilitychange` transitions, asserting hide→1, return→1, re-hide→1. Sabotage-verified.
- **Loop 72 caught a delegated regression by the correct method** — picking the report's load-bearing claim
  and checking it against the code — and pinned the trap as an assertion rather than a comment
  (`accountCache.test.ts:187-220`), with the reasoning *"correct caching is the wrong default for a
  self-invalidating figure"* in the test body. That is the right artefact.
- **Loop 72 reported the regression as its own fault, in the CHANGELOG, to the CEO.** *"That was my error in
  how I scoped the work, not in how it was done."*
- **Three consecutive loops closed without opening** (70 net 0, 71 −1, 72 −1) and the validation numbers are
  exact: I ran the suite and got **184 files / 3260 tests**, and typecheck clean across 11 packages.

---

## 5. Q1 — did the class recur in loops 70-72?

**Ruling: yes, in all three. And your own hypothesis is right in shape and cites the wrong instance — you
named the one you caught rather than the one you missed.**

### 5.1 The three instances, each with its instrument named

| Loop | Instrument | What it covered | What the defect was | Gap |
|---|---|---|---|---|
| 70 | `plans.ts` read for "which plan lifts the recording cap" | the four plans with `maxRecordingsPerMonth === MAX_SAFE_INTEGER` | *which plan does this surface tell the user to buy* | the answer is `solo`, derived by a passing test in the module the component imports on line 4 (**S-2**) |
| 71 | `analytics-delivery.test.ts` + `analytics-delivery.spec.ts` | **transport**: does the buffer leave the browser exactly once per hidden | *events that should be counted are not* | **emission** (`dashboard_bounced` on `beforeunload`, **S-1**) and **ingestion** (§3.1) |
| 72 | `account-fetch.spec.ts` | request count on **`/dashboard`** | request count on **`/account` and `/upload`**, which is the entry's headline claim | the spec's own title names its surface; the change was to two others (**S-3**) |

Three loops, three instruments, three gaps, each one checkable in under a minute against a claim the loop made
in writing. This is the sixth, seventh and eighth instances of MR-036's formulation.

### 5.2 Your hypothesis, graded

You proposed: *"loop 72's stale-quota regression is the same shape one level up — my brief had coverage
narrower than the defect."*

**The shape is right and the instance is the wrong one to cite, for two reasons.**

First, a brief is not an instrument. An instrument is a thing that produces an output you read as the extent
of a problem; a brief is an input you write. The failure mode you describe — asserting an absence you had not
checked — is real (§6 handles it), but calling it an instrument stretches the category until it stops
discriminating, and a category that covers everything cannot tell you where to look next.

Second, and more to the point: **the stale-quota defect was caught. S-3 was not.** You reviewed the delegated
work, found the staleness gap, fixed it, and wrote it up. Then you made a request-count claim in the iteration
log and in the CHANGELOG, ran an instrument whose title states it measures `/dashboard`, and shipped. The
instance that supports your own thesis is the one still in the tree, and it is stronger evidence than the one
you offered, because in this case the instrument *declares its own scope in its own name* and the scope was
still not read against the change.

So: not pattern-matching your narrative, but citing the recovery rather than the escape. That is a recognisable
bias in self-assessment and it is worth naming, because it is the same bias that makes the ratio in §6 read
well.

### 5.3 Should a rule finally be added? No — and here is what changed in the argument.

MR-036 declined on the grounds that the rule would not have caught loop 64. MR-037 declined on the stronger
grounds that loop 68 achieved **maximal compliance** with the rule under consideration — built a purpose-made
detector, ran it before touching code, disbelieved its own regex — and the class shipped anyway. Both
arguments are correct and both are arguments against **a re-derivation rule**.

This window adds a datum neither predecessor had, and it points somewhere else. In all three instances, the
instrument's scope was **already known and, in two cases, already written down**:

- `account-fetch.spec.ts:19` — `test('the dashboard issues exactly one /api/account request')`. The scope is
  in the title.
- `analytics-delivery.spec.ts:6-11` — *"It cannot prove the listener is attached … the wiring is where this
  defect lived."* The scope, and its limit, in the docstring.
- `upgrade-funnel.spec.ts:5-9` — *"proves the counting rule. That says nothing about whether the surfaces are
  wired to it."* Same.

**MR-037 §3.5 asked for guards that state their own coverage. You now write them that way. Nothing reads the
statement.** That is a different problem from the one three reviews have been declining to legislate, and it
has a cheaper answer than a control.

**The proposal, and it is a convention, not a `CLAUDE.md` control:**

> The `Validation:` line in each iteration entry currently lists what passed. Add one line listing what the
> passing tests do **not** cover, derived from the instruments' own docstrings:
> `Not covered: <surface or layer>`.

At loop 70 that line reads *"Not covered: the `plan` dimension against the copy the surface renders; delivery
of these events."* At loop 71: *"Not covered: emission — `dashboard_bounced` still fires from `beforeunload`;
server-side ingestion."* At loop 72: *"Not covered: request count on `/account` and `/upload` — the spec
visits `/dashboard`."* **Each of those three sentences is a strike in this document, written by the author,
before shipping.**

Why this and not a rule: it is free (the information is already in the files); it is not satisfiable by
ritual (an empty or generic line is visibly empty); it produces an artefact the next review can score; and it
attacks the actual mechanism — the scope is known and unread — rather than the mechanism three reviews have
now established is not the problem.

**Falsifiable prediction, so MR-039 can score me.** If this convention is adopted, MR-039's strikes will be
drawn from *outside* the set of things the `Not covered:` lines name. If MR-039's strikes are things the loops
wrote down and shipped anyway, the convention is theatre and should be dropped — and that will be the third
countermeasure to fail, at which point the right conclusion is that this class is a permanent property of
single-author loops and the remedy is the review, not the loop.

---

## 6. Q2 — delegation, the brief, and whether the calculus changed

**Ruling: the briefing process is the weak link, the review is adequate for what it checks and blind to what
the change itself claims, and MR-037's "under-used rather than gamed" verdict survives — a 2-sample record
with one high-yield catch and one caught escape is not evidence for delegating less.**

### 6.1 The brief, precisely

Quoted in loop 72's entry: *"`/upload`: move to `useAccount` directly. **No constraints.**"*

The problem is not that the brief was short. It is that **"no constraints" is an unqualified negative** — the
hardest class of claim to verify and the easiest to assert. And it was asserted about a page whose constraint
is documented, in the exact terms, **in the docstring of the module the brief was pointing the agent at**:

`accountCache.ts:31-35`:

> **The value cache** needs a bound, which is why there is a TTL. Unbounded, the first response would be served
> for the whole SPA session and **`limits.recordings.used` would freeze at its page-load value — a genuine
> regression for the quota chip**.

`/upload` displays `limits.recordings.used`. You wrote that paragraph at loop 66. The brief told an agent to
adopt the module whose docstring names the hazard, and stated that the hazard did not apply.

**And you had just written the positive form of the general rule, one bullet earlier in the same brief**, for
`/account`: refetch on mount because the user may have just changed their plan. The generalisation —
*any page displaying a figure that the user's own action changes must not read it from a shared TTL cache* —
was one sentence away and was instead instantiated for one page and negated for the other.

### 6.2 Is the review of delegated work adequate?

**For the claim it checked, yes, and the method was exactly right.** The entry: *"Caught by reading the report
against the code rather than accepting it. The claim I checked — 'no live subscription across hook instances'
— was the one that, if true, implied the staleness window."* Selecting the load-bearing claim rather than
spot-checking the diff is the correct technique and it worked.

**In general, no, and loop 72 demonstrates the limit in the same loop.** The review verified the claim the
*agent* made. It did not verify the claim the *change* makes — that each page now issues one request instead
of two — which is S-3, is false, and is the headline of the CHANGELOG bullet. So the review covers
agent-originated claims and not coordinator-originated ones, which is the more dangerous half, because
coordinator-originated claims go straight into the CEO-facing record without a second reader.

### 6.3 The calculus

| Loop | Delegated | Outcome |
|---|---|---|
| 67 | `frontend-engineer`, ~36-site colour sweep | **two substantive corrections to the coordinator** (tint compositing surface; `fill-*` vs `text-*` on a lucide star). MR-037 §8.2 scored this 2-for-2. |
| 72 | `frontend-engineer`, two call-site migrations | **one regression, traceable to the brief**, caught in review, fixed in the same loop, zero reaching a user |

Two samples. One produced analysis the coordinator would not have produced alone; one produced a defect the
coordinator's own scoping caused and the coordinator's own review caught. **Nothing here argues for less
delegation.** The agent's reasoning in loop 72 was sound within the scope it was given — the entry says so and
I agree after reading the diff: the optimistic delta is correct within a mount, and the justification offered
(no cross-instance subscription) is true of `useAccount.ts` as written.

MR-037's finding that the control is *under*-used stands. The un-delegated loops in this window were 70 and 71,
both small semantics-heavy analytics changes in files the coordinator was already reading — the loop-66 shape,
where I would also not have delegated. Loop 71's self-report (*"4 consecutive … recorded rather than
excused"*) is honest and the rotation happened.

**What to change is the brief, not the rate.** Two concrete edits, both free:

1. **State constraints as questions, not as absences.** `"Does this page display a figure that changes as a
   direct result of the user's own action? If so, it must not read it from the shared TTL cache — see
   accountCache.ts:31."` The agent can answer that from the file; it cannot disprove "no constraints."
2. **Require the agent to restate the claim the change makes, and name the test that checks it.** Loop 72's
   change claims a request count. An agent asked *"what test proves the request count on this page?"* returns
   "none — `account-fetch.spec.ts` visits `/dashboard`", which is S-3, surfaced by the delegation rather than
   despite it.

---

## 7. Q3 — the extract-a-pure-module pattern, audited adversarially

**Ruling: the pattern is sound, it is not four instances but the dominant architecture of this test estate,
and the strongest evidence for it is in this very window — the one place the pattern was *not* applied has
nine green tests sitting over S-1. Do not add a React renderer. The gap a renderer would close is real but it
is in a different family, and it is already being closed by Playwright fixtures.**

### 7.1 It is not an emerging habit; it is the estate

`ls apps/web-app/src/lib/*.test.ts` → **44 co-located test files in `src/lib` alone**, against 184 total.
`quota-meter.ts`, `trial-chip.ts`, `checkout-error.ts`, `plan-availability.ts`, `createTeamError.ts`,
`band-colors.ts`, `referrerClassification.ts`, `actionFeedback.ts`, `insightActions.ts` and the three new ones
are the same move. So the question is not "am I accumulating indirection?" — the answer to that is "you
already have, deliberately, over dozens of loops." The question is whether the three new ones are good
instances. They are.

### 7.2 Audited individually

**`upgrade-prompt.ts` — the strongest of the three.** Two total functions, one of which is three lines, and
they encode a rule that is genuinely non-obvious and genuinely two-sided: `nextEmittedState` returns `null`
when the prompt disappears *specifically so that a reappearance counts again* (`:66-70`), and the docstring
explains that retaining identity through the gap would *"silently undercount exactly the repeat-exposure case
the funnel is most interesting for."* That is a design decision with a defensible alternative, written down
where a reader will find it. The hook (`useUpgradePromptViewed.ts`) is 20 lines of glue and its one non-obvious
choice — depending on the *fields* rather than the object — is justified in-file with the right reason
(`:26-30`: *"relying on that would make correctness depend on two things agreeing rather than one"*).
**Adversarially:** I checked whether the hook can emit for a prompt that is not rendered. In
`RecordingQuotaChip.tsx:39` the hook is called *before* the `if (!state.show) return null` guard at `:41`.
That would be a bug if `cta` could be non-null while `show` is false — it cannot: every branch of
`quotaMeterState` with a non-null `cta` sets `show: true`, and `HIDDEN` has `cta: null`
(`quota-meter.ts:58-68, 85-103`). Sound. In `WorkflowRow.tsx:322` the hook is called before an early return
too, and the tooltip only mounts on explicit click (`:1240-1247`, a real `<button>` toggling `showTooltip`),
so a mount genuinely is an exposure. **One defect: the `plan` value it is handed. That is S-2, and it is not
the module's fault — the module is generic over identity.**

**`analytics-delivery.ts` — sound, and narrower than its own claim.** `drain` is the right primitive for
exactly the reason given: it makes read-without-clear unavailable rather than discouraged. The three
predicates are trivially correct. But the file's opening says *"Both directions are covered"*, and one of the
two tests that covers the interesting direction (§3.7) composes its own delivery loop rather than calling the
real one — because the real one, `deliverBufferedEvents`, is not exported. **That is the honest cost of the
pattern and it should be stated:** extracting the *rule* leaves the *composition* untested, and the
composition is where both loop 70's and loop 71's defects actually lived. Loop 71 knew this and paid for it
with an e2e, which is the correct answer.

**`accountCache.ts` additions — the right artefact, and the loop stopped one step short.** The stale-quota
trap test (`accountCache.test.ts:187-220`) is the best single test added in this window: it asserts the
*undesirable* behaviour explicitly, names why the behaviour is correct, and shows `clear()` as the escape
hatch. A comment could not have done that. **What the pattern did not cover is S-3 and S-4** — both live in
the composition of the cache with the hook with the page's effects, and both are invisible from `accountCache.test.ts`
by construction.

### 7.3 The argument that settles it — the case where the pattern was not used

`DashboardV2Shell.test.tsx:427-475`. The bounce logic was **not** extracted. Instead the test file defines
its own copies:

```ts
/**
 * shouldEmitBounce extracts the pure decision logic from the beforeunload
 * handler so it can be unit-tested without JSDOM beforeunload complexities.
 * Logic mirrors DashboardV2Shell's handleBeforeUnload:
 */
function shouldEmitBounce(viewFired: boolean, clickCount: number): boolean { ... }
```

Nine passing tests. They assert the right rule. They cannot see the trigger, because the trigger is the part
that was not extracted — **and the trigger is S-1**. That is the mirror-drift pattern
`accountCache.ts:13-16` says the codebase "has cause to distrust", still sitting in the estate, producing
green ticks over the defect this review found. **Your instinct to extract rather than mirror is correct and
this is the proof.**

### 7.4 Should you take the dependency? No, and the reasoning is not "avoid the decision"

What `@testing-library/react` + jsdom would actually buy, item by item:

- *"Is the hook called?"* — TypeScript already answers this; a component that does not call the hook does not
  compile differently, but the e2e catches it, and the e2e catches it **on the real page**.
- *"Is the effect wired and does it fire on the real lifecycle event?"* — jsdom would need shims for
  `document.visibilityState`, `navigator.sendBeacon`, `performance.now` and `beforeunload`. You would be
  testing your shims. `analytics-delivery.spec.ts` drives the real transitions in a real browser and is
  strictly better.
- *"Does the page issue one request?"* — jsdom cannot count network requests meaningfully. `account-fetch.spec.ts`
  can, and the fix for S-3 is four lines in a file that already exists.
- *"Does the gated branch render at all?"* — **this one is real.** Loop 70's own note: the gated health CTA
  sat at 3.15:1 in light *"latent because no fixture renders the gated branch."* Loop 67 found the same thing:
  *"no fixture had ever set `portfolioHealthScoreDelta`, so the delta never rendered."* That is a genuine gap
  and it is the only one on this list.

And it is a **fixture** gap, not a renderer gap. It belongs to the a11y/colour family, not the analytics
family, and the remedy already in use — extend the Playwright fixture so the branch renders, then let axe scan
it — is the one loop 67 used successfully and the one that produced the `text-green-600` finding. A jsdom
renderer would let you mount the branch but would not tell you its contrast, because contrast is a property of
a pair that only exists at render time (loop 67's own formulation, and still the best sentence in this
codebase's record).

**So: no renderer. The pattern is not indirection accumulated to dodge a decision — it is the correct
decomposition, and the decision has in fact been taken, four times, with the reasoning written down each
time.** The discipline that makes it work is `rule in a module + wiring in a browser`, and the one loop in
this window that did the first half without the second is loop 72, which is S-3.

---

## 8. Q4 — is there a third analytics defect? **Yes. It is S-1, and it is the worst of the three.**

You asked for one found by inspection rather than speculation, and for a plain "no" if I could not produce one.
I can. The full case is in **§2 S-1**; the short form:

`dashboard_bounced` — the only event in the taxonomy whose sole purpose is to count bounces — is emitted from
`window.addEventListener('beforeunload', …)` at `DashboardV2Shell.tsx:741`. The module loop 71 wrote in the
immediately preceding loop states, as its central premise, that this trigger *"is unreliable by design on
mobile"* and that *"iOS Safari and Chrome on Android routinely discard a page without firing it."* Loop 71
fixed delivery of buffered events. It did not touch emission. On the population its own docstring describes,
the bounce event is never produced, so there is nothing for the new delivery path to deliver.

Three properties make this the sharpest of the three:

1. **Same bias direction, and at maximum leverage.** #238 undercounted a denominator; #241 lost a mixed
   sample. This one loses events that are *entirely* numerator — a bounce not emitted is a bounce that did not
   happen, and every one lost lowers the bounce rate.
2. **The lost population is the measured population.** Mobile browsers are both the ones that skip
   `beforeunload` and the ones that bounce most. The loss is not merely biased, it is correlated with the
   variable being measured.
3. **It is the input to a standing CEO decision.** #57's retirement rule is *bounce < 40% AND …*. A criterion
   that is systematically low in the permissive direction is worse than one that is unscoreable, because
   unscoreable criteria stop you and flattering ones do not. MR-037 §14 lists criterion 3 as the blocker;
   criterion 1 is the one that will quietly wave the decision through.

**Not on any row.** `grep -n "dashboard_bounced" IMPROVEMENT_BACKLOG.md` → four narrative mentions in the
header and one live row, **#94**, which mentions it only as a premise in an argument against a different fix —
a premise loop 71 invalidated (S-5). The row that shipped the emitter, #73 (MDR-P09), is struck.

**Two more in the same pipeline, reported at their true weight rather than inflated:** the ingestion loop that
abandons a batch on the first DB error and returns `ok: true` (§3.1 — real, live, non-directional), and the
silent `slice(0, 100)` truncation (§3.2 — **latent**; I could not construct a realistic path to it and am not
going to pretend otherwise).

---

## 9. Q5 — follow-up debt: implement MR-037's replacement, and this window is the argument for it

**Ruling: implement it. This window produced the best ratio reading in the metric's history and the worst
reading on the thing the ratio is a proxy for. That is not a coincidence; it is the failure mode MR-037
described, observed.**

### 9.1 The numbers, derived per commit

`grep -cE "^\| [0-9]+ \|"` on `git show <c>:IMPROVEMENT_BACKLOG.md`:

```
loop 64  120      (MR-036's measurement)
loop 68  122   +#238 (docs commit e67e234) → 123
loop 69  124      (Mode 3; +#240, −#239)
loop 70  124      (+#241, −#238)
loop 71  123      (−#241)
loop 72  122      (−#234)
```

**Counted window 70-72: 3 closed / 1 created = 3.00.** Floor is 0.5. It is the highest reading the metric has
ever produced.

Now the same three closures, by origin:

| Closed | Filed at | Age at close | Filed by |
|---|---|---|---|
| #238 | loop 68's docs commit `e67e234` | 2 loops | the coordinator |
| #241 | loop 70 | 1 loop | the coordinator |
| #234 | loop 66 | 6 loops | the coordinator |

**Externally-originated closures: 0 of 3.** MR-037 measured 2 of 9 over the prior ten loops and called the
metric self-referential. This window takes it to zero. **The ratio's best-ever reading and the origin
metric's worst-ever reading are the same three loops.**

### 9.2 The queue those closures did not touch

Parsing the `Birth iter` column across all 122 open rows: the oldest open, unblocked rows are
**#8, #11, #12, #16, #17** — status `new (iter 001)`, i.e. **~71 loops**; then **#29** (birth `013`, ~59
loops), **#41** (`017`), **#42/#43/#44** (`020`), **#45/#46/#53** (`021`), **#55/#56/#57** (`022`). None is
marked blocked. Unchanged from MR-037's list, which was unchanged from the position before it.

**Median age-at-close this window: 2 loops. Age of the oldest open non-blocked row: ~71 loops.** The ratio
reports 3.00 on that.

### 9.3 Verdict and one addition

MR-037 proposed dropping the ratio and adding two derived numbers to `validate-backlog.mjs`'s existing output:
open-pool level with its 10-loop delta, and the age of the oldest open non-blocked row. **Both are right and
the window strengthens the case rather than weakening it.** The pool is **122**, versus 120 at loop 64 — up 2
over six counted loops, after a window that "closed three and opened one."

**Does 3-closed/1-created change anything? Only by making the argument unarguable.** A metric that returns its
best score in the window where the queue tail did not move by a single loop is measuring the wrong thing, and
no reweighting fixes that, because both of its terms are written by the agent it grades.

**One addition, free from the same parse and the same column:** **median age-at-close over the trailing ten
closures.** MR-037 reached for this informally (*"every closure in this window was of a row aged 0-3 loops"*);
making it a number is the whole move. It is the single figure that distinguishes "working the queue" from
"working my own recent findings", it cannot be narrated, and it needs no new judgement — `Birth iter` is
already parsed and already validated as mandatory by the Follow-Up Debt Policy clause 5.

Proposed output line, replacing nothing else:

```
validate-backlog: 234 rows, 131 struck, 19/19 malformed-row budget used — clean
                  122 open (+2 vs loop 64) | oldest open non-blocked: ~71 loops (#8)
                  | median age-at-close, last 10: 2 loops
```

Three numbers, one line, derived. **Nothing applied — this is a recommendation, and it edits a script and a
policy paragraph, both of which are yours.**

---

## 10. Q6 — control-rule status across loops 69-72

| Rule | Status |
|---|---|
| Meta-review cadence (2-3 loops) | **On time.** 3 counted loops since MR-037; loop 72 flagged it. Second consecutive on-time cycle. |
| Area saturation (3 consecutive) | **Held.** 70 analytics → 71 analytics → 72 correctness, pivot stated in the entry. Never reached 3. |
| Agent rotation (4+ consecutive) | **Breached at loop 71 and self-declared**, then cleared at loop 72. But the trigger was read as "rotate next loop"; `CLAUDE.md` lists it as an **early trigger forcing an immediate meta-review** (§3.10). Minor. |
| Selection driver logged | **Held 3/3** — `top-score` ×3, each with a score and a reason. |
| Extension invariant | **Guarded but unexercised. `871e29a`, 2026-09-24 — 37 commits and 29 loops ago**, verified by `git log -1` over the four invariant paths. #216 remains the only lever and is CEO-blocked. §11. |
| Backlog validator | **Clean at zero headroom.** `234 rows, 131 struck, 19/19 malformed-row budget used`. Fifth consecutive review at full budget; the next stray `\|` fails CI. |
| P-11 (verify the row before building) | **Fired and held at 70** (`UpgradeCTA` unrendered → emit rather than adopt; plan values read rather than assumed — though see S-2 for what "verified" covered). **Not applicable at 71 or 72.** |
| One-logical-outcome per loop | **Held.** 70 split (#241 filed rather than fixed, one adjacent one-line colour fix); 71 fixed the blocking second defect first, correctly; 72 fixed its own regression in scope. |
| Hold-the-test convention | **No holds outstanding.** MR-037 S-5's stale record retired at loop 69, and the convention gained its retirement clause. |
| Follow-Up Debt ratio ≥ 0.5 | **3.00 — best ever, and measuring nothing.** Externally-originated closures 0/3. Pool 120 → 122. **Sixth consecutive review. §9 re-recommends dropping it.** |
| MR-037 fold-ins | **3 of 4 taken at loop 69** (`.ts` filter, print-block bounds, `ALLOWED_LITERALS` recompute) plus all 5 strikes. §4.2(f) carried forward (§3.9). |

---

## 11. Next pick

### FIRST, and it is not a loop: **file the bounce-emitter row.**

S-1 is the only S-class finding here with no row, and the precedent is MR-037's *"file it before you fix it"*
on the three `--accent` sites. Suggested text, so the row does not understate itself the way #189 and #232
did:

> `dashboard_bounced` is emitted from `beforeunload` (`DashboardV2Shell.tsx:741`), the trigger row #241
> established is unreliable on mobile (`analytics-delivery.ts:10-12`). Loop 71 fixed delivery and not
> emission, so on mobile the event is never produced. Bounce rate under-reports, and the loss is concentrated
> on the population that bounces most. **This is criterion 1 of the #57 retirement rule** (`bounce < 40%`),
> so the criterion currently reads low for an unrecorded reason. Fix: move the emitter to `pagehide` — reliable
> on mobile including bfcache, and unlike `visibilitychange` it does not fire on a tab switch, which is not a
> bounce — with `beforeunload` retained behind a `hasEmitted` guard. Also extract the rule from
> `DashboardV2Shell.test.tsx:435` into a module: nine tests currently mirror it and none can see the trigger.

### PRIMARY (counted loop): **that row — the bounce emitter — `web-app / analytics`**

**One line:** it is the third and worst member of the flattering-undercount family this window has been
working, its fix is the exact shape loop 71 shipped last loop, and it is the only open defect that makes a
standing CEO decision unsafe to act on rather than merely unscoreable.

Three conditions, none of them in the row:

1. **`pagehide`, not `visibilitychange`.** Delivery and emission want different triggers: delivery should
   happen on every hidden (loop 71 is right), emission should happen once, at the end. Conflating them turns
   every tab switch into a bounce.
2. **Extract the rule and delete the mirror in the same commit.** `shouldEmitBounce` and
   `computeBounceElapsedMs` currently live in `DashboardV2Shell.test.tsx`. Leaving them there after the
   emitter moves is how the next review gets an S-4-class strike.
3. **The browser half is the part that matters and `analytics-delivery.spec.ts` already has the machinery** —
   it defines `hidePage()`/`showPage()` and captures beacons. Add a bounce case: load, click nothing, hide,
   assert exactly one `dashboard_bounced` in the beacon payload; then a second case that clicks first and
   asserts none. That is the wiring test, and wiring is where all three of this window's defects lived.

### BEFORE or ALONGSIDE, as a Mode 3 correction — the three shipped strikes, in one loop

Precedent: loop 69 discharged MR-037's five strikes as a single non-counting correction, and it was the right
shape. All three are small:

1. **S-2** — `plan: 'team'` → the derived value. Best fix: import `UNCAPPED_PLAN_LABEL.toLowerCase()` from
   `quota-meter.ts` rather than hardcoding `'solo'`, so the analytics dimension is bound to the same constant
   as the copy, and `quota-meter.test.ts:77-84` guards both. Update `upgrade-funnel.spec.ts:90`.
2. **S-3 + S-4** — drop the redundant fetch. The cleanest form: give `useAccount` a `refetchOnMount` option so
   the mount path busts the cache *instead of* reading it, rather than reading and then busting. Then extend
   `account-fetch.spec.ts` to `/account` and `/upload` — it fails today. And correct the CHANGELOG line.
3. **S-5** — amend row #94 clause (c) and `analytics.ts:874-878`: the argument now needs to rest on
   "events queued when the plan never resolves are still lost", not on `beforeunload` being the only delivery
   moment.

### Fold in wherever convenient, minutes not a loop

- **§3.1** — move the `try` inside the ingestion loop and return the real `received` count. Three lines.
- **§3.3** — make the e2e's `sendBeacon` stub return `false` once and assert the buffer refills. Four lines,
  and it converts *"Handled the refusal case too"* from a claim into a check.
- **§3.9** — derive the print-block token list from `globals.css` instead of hardcoding six. Three lines; the
  property holds today (15/15), so it lands green and stays honest.
- **§3.8** — `accountCache.ts:7`, `181` → `184`.

### NOT endorsed, with reasons

- **#240** (11, favourite star hover-only on touch) — real, and it is a discoverability question that wants a
  UX view, not a contrast fix. Loop 69 said exactly this when it filed it.
- **#94** (13) — the substantive half needs a decision between the JWT/session path and a provider, and loop
  71 just changed one of the two arguments its re-scoping rests on. Amend the row first (S-5), then decide.
- **#237** (9) / **#236** (10) — both still blocked on a palette decision, unchanged from MR-037 §12.
- **#235** (11) — *"establish how gating is really enforced"* is an investigation with an unknown bottom.
- **#216, #57 criterion 3, #212, #225, #190/#193, #191, #107** — decisions, not loops. §13.

---

## 12. What I could not verify

1. **Playwright.** No server or database, and running the e2e suite would mutate `test.db` mid-review. The 7/7
   claim reconciles by reading (account-fetch 1 + funnel 2 + delivery 2 = 5, plus the two pre-existing;
   loop 72's entry says 7). The unit suite and typecheck I ran: **184 files / 3260 tests, 11 packages clean.**
2. **That S-3's double request occurs in a browser.** The cache half is proven by probe against the real class.
   The React half — that `useAccount`'s mount effect and the page's mount effect both run, in that order — is
   derived from effect-declaration order, not observed. It is standard React semantics and I am confident, but
   the four-line extension to `account-fetch.spec.ts` would settle it in a minute and should be part of the
   fix rather than trusted from this document.
3. **That mobile browsers skip `beforeunload` at the rate loop 71 asserts.** I have taken loop 71's own claim
   at face value, because S-1 is an *internal inconsistency*: if the claim is false, row #241 should not have
   been fixed either. Either the claim holds and S-1 is live, or it does not and #241 was unnecessary. Both
   cannot be true.
4. **The unload event ordering** (`beforeunload` → `pagehide` → `visibilitychange:hidden`) that makes S-1's
   desktop half self-healing is read from the HTML unload-a-document steps, not observed in a browser. It does
   not affect S-1, which is about mobile, where none of these fire.
5. **Whether prompt→click in the live series exceeds 100%.** That is MR-037 §12 condition 2 and it needs
   production data (§3.5). It remains the single highest-value thing anyone could check about #238, because it
   dates the defect and tells you which past decisions rested on it.
6. **A near-miss, recorded in the spirit of MR-037 §13.6.** My first reading of `RecordingQuotaChip` had the
   hook firing above the `if (!state.show) return null` guard as a live over-count. I then read
   `quotaMeterState` and found every `cta`-bearing branch sets `show: true` and `HIDDEN` sets `cta: null`
   (`quota-meter.ts:58-103`), so it is sound. Reported because the wrong version was one paragraph from being
   a strike, and because it is the same failure I am striking elsewhere: reading a component without reading
   the module that decides its state.

---

## 13. CEO decisions — surfaced only, nothing applied

Ordered by staleness. Items 1, 2 and 5 are restored for the **fourth and fifth** time; `grep -in "criterion\|#57 " ` over
the loop 69-72 entries returns nothing.

1. **#216 — shadow-DOM capture semantics. ~44 loops blocked.** Verified as a date, not a narrative:
   `git log -1` over `apps/extension-app/src`, `manifest.json`, and the three engine packages returns
   **`871e29a`, 2026-09-24**, and `git log --oneline 871e29a..HEAD | wc -l` returns **37 commits**. Twenty-nine
   loops. A shipping Chrome extension, under a hard `CLAUDE.md` reliability invariant that records two prior
   capture-pipeline regressions, green in CI and unexercised by use. **MR-037 asked for the fourth time and
   proposed the alternative: decide it, or declare the extension frozen for this phase and record that** —
   which would also retire the third line of every `Controls:` block. **I second that without amendment.** A
   control line that reports the same unchanged fact for twenty-nine loops is not surveillance, it is
   furniture.
2. **#57 criterion 3 — the chip-click-rate threshold. UNSCOREABLE since loop 48 = 24 loops.** And now
   **criterion 1 is unreliable too** (S-1), which changes the shape of this decision: two of the three
   retirement criteria are currently unsound, one visibly and one invisibly. The invisible one is the
   dangerous one.
3. **#190 / #193 — MR-020 C1-C3 and MR-021 P-1/P-2.** Both still `awaiting CEO approval (edits CLAUDE.md)`,
   verified in the rows today.
4. **#191 — Stripe card trial stacking on the reverse trial**, charging with no in-app warning. Awaiting a
   pricing decision; birth `2026-09-15 L7`.
5. **#212 — P-6: enforce or retire.** MR-033, MR-034, MR-036 and MR-037 all asked. **Fifth ask.** Row status
   is still bare `open`.
6. **#225 — `TRUSTED_PROXY_HOPS`.** Row: *"centralized (loop 44) — awaiting proxy confirmation."* Still one
   number read off `/api/admin/operations` and one variable set; auth rate limits remain header-bypassable
   until then.
7. **#107 — blocked, security review required** since loop 48.
8. **Carried from MR-037 §14.8 — the Follow-Up Debt metric.** Not implemented. §9 re-recommends it and adds a
   third number (median age-at-close). The evidence is now stronger than MR-037 had: best-ever ratio,
   zero externally-originated closures, queue tail unmoved at ~71 loops.
9. **Arising here — the `Not covered:` validation line** (§5.3). A convention, not a control, with a
   falsifiable prediction attached so MR-039 can kill it if it turns out to be theatre.

**Three governance observations, stated rather than proposed.** A claim about *how many network requests a page
makes* belongs in the same category as a claim about *what colour renders* — it is checkable in a browser and
nowhere else, and it should not enter the CHANGELOG without the check (S-3). When an entry says "X was the only
way Y could happen", grep X and read every hit before shipping — that is nine seconds and it is S-5 and half of
S-1. And a test that mirrors production logic should carry the row number of the thing it mirrors, so the next
person to change the production side finds it (§3.6, §7.3).

---

## 14. Verdict

**This is the best window in the record on execution and the third consecutive one in which the same class of
defect shipped — and this time it shipped three times, once per loop, in three different layers.**

The execution is not in question. Loop 69 discharged five strikes and three fold-ins and wrote its own failed
drafts into the file. Loop 70 found a real conversion defect, refused the symmetric over-correction, built the
counting rule as a module because the risk runs both ways, and diagnosed its own test as wrong twice rather
than trusting a red run. Loop 71 found a second defect inside the first, fixed it in the correct order, made
the hazard structurally unavailable rather than documented, and verified in a browser with sabotage. Loop 72
caught a delegated regression by picking the report's load-bearing claim and checking it against the code, then
reported the fault as its own to the CEO. The suite is 3260 green across 184 files and typecheck is clean
across 11 packages — I ran both.

**And in each of the three loops, the instrument's coverage was narrower than the defect, in a way the loop
could have written down in one sentence and did not.** Loop 70 asked `plans.ts` which plans are uncapped when
the question was which plan the surface names — and the answer was derived, tested, and named in a test title
three files away, in the module the component imports. Loop 71 proved the transport and left the *emission* of
the bounce event on `beforeunload`, the trigger its own docstring calls unreliable — so the third
flattering-direction analytics defect in a fortnight is live, unrowed, and feeding criterion 1 of a standing
CEO decision. Loop 72 made a request-count claim about two pages and ran a request-counting test that visits a
third, and the claim is false on every hard page load.

**On the rule: still no. But the argument has moved.** MR-036 and MR-037 declined a re-derivation rule and were
right both times, most decisively at loop 68's maximal compliance. This window shows something different: the
scope of each instrument was *already known*, and in two of the three cases **already written down in the
instrument's own docstring or title**, and nobody read it against the change. That does not want a control. It
wants one line in the validation block naming what the passing tests do not cover — a line which, written
honestly at each of these three loops, would have printed all three of this review's shipped strikes before
they shipped.

**On the metric: drop it, now.** The window closed three rows and opened one, which is a ratio of 3.00 — the
best reading it has ever produced — while closing nothing older than six loops, nothing it had not filed
itself, and leaving a queue whose oldest unblocked row has been open for about seventy-one loops. A metric that
peaks in the window where the queue does not move is not a weak control. It is a mirror, and this codebase has
spent four loops learning not to trust mirrors.

**Five strikes, three of them live in code** (S-1's emitter, S-2's `plan` value plus the e2e that pins it,
S-3's duplicate request). **One false claim in the CHANGELOG**, for the second review running, and it is again
a claim about a thing the test estate could have checked and was not pointed at. **Zero reached a user through
a functional failure.** **No `CLAUDE.md` edit proposed, and none is needed.**

---

*MR-038. Mode 4, governance only, NON-counting. No product code changed. No `CLAUDE.md` edit proposed.
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md` and `SYSTEM_HEALTH.md` untouched.*
