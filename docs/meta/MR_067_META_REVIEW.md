# MR-067 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 162-164, 2026-10-02 22:38 → 22:55 (−0600). Commits `5e1d3b2` (loop 162, #351), `4e4391f` (loop 163,
#290 items 2 and 4), `7248e17` (loop 164, #249). Previous review MR-066 at `2b4bf07`. Rows closed: #351, #249. Row
partially closed: #290 (stays open). Rows filed by loops: none.
**Why now:** base cadence, 3 of 3 since MR-066 (`ITERATION_LOG.md:13`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. No local server was started. Every row,
strike or annotation below is a recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `bc.cjs`: bcryptjs probe of the loop-163 dummy hash (cost, regex, long and malformed inputs);
- `top067.mjs`: backlog reader for Part C;
- `root.txt`, `web.txt`, `tc.txt`, `val.txt`, `status_before.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file.

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 164) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6210 | **300 files, 6210 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4363 | **242 files, 4363 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | not recorded | **exit 0**, 347 rows, 235 struck, **open 112**, 31 strict-checked lines, 142 claims | clean |
| guard runner | not recorded | **files=6 tests=142 real_pass=142 fail=0** | green |
| deltas | web 4322→4333→4349→4363; root 6177→6180→6196→6210 | 162: 13 `it()` added, 2 removed (+11 web); 163: 8 forgot-password + 5 timing + one `it.each` (+16); 164: 14 in `analytics-terminal.test.ts` | consistent |

Pool arithmetic: MR-066 recorded 114 open; #351 and #249 struck → **112**. #290 correctly not struck.

**Not run:** any real browser or phone, Playwright, Docker, any request to production. The revert proofs ("11 of 16
fail on HEAD", "7 of 14 fail on the originals") and loop 162's mutation check are agent/coordinator-reported and were
not re-run.

---

## 1. Lead

1. **All three loops hold on their primary claims. Every count reproduces.** None of the three is a shallow win:
   162 repairs the measurement regression MR-066 found in the window it was made; 163 removes two real timing oracles;
   164 gives the bounce a delivery path after `pagehide`.
2. **Loop 162's "cleared on user change or sign-out" is true only for the sign-out button (§2).** Session expiry is a
   soft navigation in this app (7-day JWT; middleware 307 to `/login` during a client navigation), so the previous
   user's plan stays on every later event in that tab: `/login`, `/signup`, `/pricing`. If someone else then signs in
   (also soft: `router.push`), the dashboard's new fill-if-unset **refuses** the new user's plan because the slot is
   occupied, so `dashboard_v2_viewed` can carry the previous user's plan until `/api/account` resolves. The same
   device-level identity gap is larger in PostHog: `posthog.reset()` is defined and never called, and `identify` uses
   the raw email as distinct id. PostHog is not configured in any deploy file today (#278), so that half is latent.
   Filed as **N1 (9)**.
3. **Loop 162 also changed a client gating input, not only analytics (§2, N2, 9).** `stats.userPlan` now goes through
   `analyticsPlanFor`, and the dashboard passes it to `PresetChipRail` for preset unlocking. For an admin-unlimited
   account the client now unlocks every preset as `'enterprise'`, while the same route still gates health scores on
   the raw effective plan (`route.ts:333-334`). Internal accounts only; the commit's "feature gating keeps using the
   raw plan" covers the server side only.
4. **Loop 163 holds, but the enumeration it closes is still open next door (§3).** Signup answers 409 "An account with
   this email already exists" (`signup/route.ts:72-75`), by design, behind a per-IP limit that is spoofable until #225.
   That is a direct oracle, louder than any timing one. Not a loop-163 defect; it is a decision nobody has recorded
   (N3, 7). Also: every unknown-address login now costs one cost-12 bcrypt compare (232-390 ms of CPU here); with
   `X-Forwarded-For` spoofable, that is the same unauthenticated CPU lever signup already offered. Both close with
   #225 (CEO/ops). Annotation, no row.
5. **Loop 164 holds for the exit it can see. It cannot see OS discard (§4).** A page that is backgrounded and then
   discarded by the OS receives no `pagehide` at all, so the fix covers "closed while still alive", not "killed". The
   real-phone check remains with the CEO, as the log says. Two hazards already filed in #251 got sharper: a back-forward
   cache return now **reliably** delivers a second bounce (item 3), and the bounce is appended last, which is the
   position the server's first-100 slice drops (item 4).
6. **Recording slip, four loops running.** MR-066 logged loop 161 for omitting the guard-runner and validator lines.
   Loops 162, 163 and 164 omit them too. Both pass at HEAD. A practice note did not change behaviour, so this review
   recommends a mechanism (N5, 9).
7. **Push is still the first CEO action.** `main` is **19 ahead** of `origin/main`; the last CI run is still loop 151
   (`37088974348`). Loops 152-164, including the never-built loop-159 Dockerfile `COPY`, have not run on GitHub.

---

## 2. Loop 162 — #351 plan across the doorway (`5e1d3b2`): **HOLDS for the button path; two consequences**

**Diff vs log:** matches.
- `useAnalyticsPlan` has no unmount cleanup; it remembers `publishedForUserId` in module memory and clears before
  publishing a different user's plan.
- `AppShell`'s sign-out button calls `setUserPlanForAnalytics(undefined)` before `signOut({ callbackUrl })`.
- `analyticsPlanFor(email, plan)` in `feature-gating.ts:415` is used by `buildFeatureFlagsWithUsage` (`/api/account`)
  and by `/api/workflows` `stats.userPlan`.
- `setUserPlanForAnalyticsIfUnset` fills only when the slot is `null`/`undefined`; the dashboard calls it right after
  stats arrive.
- The stale route comment MR-066 named is rewritten.

**What holds:**
- `(app)` → `(public)` client navigation keeps the plan: the cleanup is gone and the test that pins it fails if it is
  re-added (coordinator's mutation check, consistent with the code).
- Sign-out by the button: the explicit clear is belt-and-braces; next-auth v5 `signOut` with `redirect` defaulted is a
  full navigation, which resets `window.__ledgerium_userPlan` and the module-level owner anyway.
- `dashboard_v2_viewed` no longer depends on `/api/account` winning when the slot is empty.
- Plan semantics agree on both routes for analytics purposes. No other analytics reporter carries a plan that could
  disagree: `plan_limit_hit` (`upload/route.ts:33`, `sync/route.ts:70`) has no plan field and admins never hit limits;
  the webhook's `subscription_updated` reports the Stripe plan, which admins do not have. PostHog `identify` carries no
  plan.

**Probes (by code reading; no browser):**

| # | Path | Result |
|---|---|---|
| P1 | Sign-out button | cleared, then full navigation ✓ |
| P2 | **Session expiry** (7-day JWT, `auth.ts:89`): cookie gone, user clicks a link to `/dashboard` | middleware 307 to `/login` (`middleware.ts:20-24`); App Router follows it as a **soft** navigation; the slot still holds the previous user's plan; `login_failed`/`login_completed` and any `/pricing`, `/signup` event in that tab carry it. Same as before loop 161 (the dashboard never cleared), so not a regression, but the loop's claim does not cover it |
| P3 | P2, then a **different** user signs in (`LoginPageClient.tsx:46`, `router.push`) | slot still holds user A's plan → the dashboard's fill-if-unset is a no-op → `dashboard_v2_viewed` for B carries **A's plan** whenever `/api/workflows` beats `/api/account` (the race #351 set out to remove), until the hook sees B's id and replaces it |
| P4 | P3 within 30 s of A's last `/api/account` fetch | `accountCache` is module-level with a 30 s TTL and is never cleared on user change (`useAccount.ts:72-79`); `useAccount` returns A's cached account, the hook sees A's id, and A's plan stays for B's whole soft-navigation session. Also shows A's trial in `TrialStatusChip`. Narrow window |
| P5 | Two tabs: tab 2 signs out and in as B; tab 1 stays open | tab 1 keeps A's plan while its requests now carry B's cookie; the ingest route takes `userId` from the session, so tab-1 events are stored as B with A's plan. Pre-existing SPA behaviour |
| P6 | Account deletion | no self-serve deletion route exists; n/a |
| P7 | PostHog identity | `identifyAnalyticsUser(email, { email })` at login and signup (`LoginPageClient.tsx:42`, `SignupPageClient.tsx:78`): the raw email is the distinct id and a person property. `resetUser()` (`posthog.ts:78`) has **no caller**, and persistence is `localStorage+cookie`, so after sign-out every anonymous event on that browser is attributed to the previous person. `analytics.ts` claims "no PII". **Latent:** no deploy file sets `NEXT_PUBLIC_POSTHOG_KEY` (no hit in `.github/`, `Dockerfile`, `compose*.yaml`; see #278), so PostHog is off in production builds today |

→ **N1**: one outcome, "analytics identity resets when the session user changes or ends", covering P2-P5 and P7.

**Client gating side effect (N2).** `DashboardV2Shell.tsx:375-377` stores `stats.userPlan` in React state and passes it
to `PresetChipRail` (`:1352`), which unlocks presets with `isPresetUnlockedForPlan` (`presets.ts:511`). Before loop 162
that value was the raw effective plan, the same plan the route uses for `canSeeHealthScores`. It is now `'enterprise'`
for admin-unlimited accounts, so an admin with a free stored plan gets every preset unlocked but health scores gated.
Admin accounts only. The fix is a decision: either admins are unlimited in the route's health gate too (consistent
with `/api/account`), or `stats` carries the gating plan and the analytics plan separately.

---

## 3. Loop 163 — #290 items 2 and 4 (`4e4391f`): **HOLDS**

**Diff vs log:** matches. `DUMMY_PASSWORD_HASH` plus `isUsableBcryptHash` in `lib/auth.ts`; `processResetRequest`
detached in `forgot-password/route.ts`.

**Dummy compare probes** (`bc.cjs`, the app's `bcryptjs`):

| Probe | Result | Assessment |
|---|---|---|
| dummy hash shape | 60 chars, matches the app's regex | real cost-12 hash ✓ |
| compare, 1-char / 72-char / 5000-char password | false; 391 / 382 / 356 ms (machine was also running the test suite) | same work regardless of length; bcrypt truncates at 72 bytes, so very long passwords cannot shortcut ✓ |
| compare against `$2a$12$short`, `''`, `plaintext` | false in 0 ms | confirms why `isUsableBcryptHash` routes unusable stored hashes to the dummy ✓ |
| empty email or password | `authorize` returns at `auth.ts:33` before lookup, for both existing and unknown addresses | no oracle ✓ |
| IP limit and per-account reserve | both before the lookup, keyed by IP or address, not by existence | no oracle ✓ |
| `isValid` | `storedHash !== null && user !== null && compareResult === true` | the dummy cannot grant even if `compare` were mocked true (tested) ✓ |
| residual | an unknown mixed-case address does a second `findUnique` (`auth-user-lookup.ts`) | disclosed; ~1 ms against bcrypt jitter; attacker controls case, so no practical oracle |

**Other existence oracles in the auth surface:**
- **Signup 409** (`signup/route.ts:72-75`): explicit, deliberate (the comment makes the admin-allowlist refusal identical
  to it), behind a spoofable per-IP limit. Timing on signup also differs (existing returns before the cost-12 `hash`).
  This is the louder oracle and makes 163's value "defence in depth" rather than "enumeration closed". → **N3**
  (decision row; usual remedy is verify-email-first signup, which is a product change).
- **Reset-password**: requires a valid token; every failure is the same 400 copy. No oracle.
- **Forgot-password 429**: per IP, independent of existence ✓. Per-address throttle returns the same success body ✓.
- No magic link or OAuth provider is configured, so no account-linking oracle.

**Detached task:**
- No unhandled rejection: the whole body is in `try/catch`; `sendEmail`'s SMTP race already swallows the loser
  (`email.ts:146`). ✓
- Throttles count **before** detachment (`route.ts:36-53`), so rapid repeats are bounded as before. Concurrent
  requests for one address can still interleave `updateMany`/`create` and leave two live tokens; that race existed
  before and the per-address throttle bounds it. Not filed.
- **PII in logs:** `console.error('[forgot-password] email delivery failed for', user.email)` logs the full address,
  and `email.ts:150` logs the raw SMTP error object, which for a rejected recipient typically includes the address.
  `email.ts` itself deliberately logs only the domain in its no-provider branch. Pre-existing, moved not added by 163.
  → **N4**.
- Trade-off disclosed by the loop and accepted here: a DB outage now answers "sent" with the failure only in logs.

**CPU lever.** Before 163, an unknown address cost a DB lookup; now it costs one cost-12 compare. Per-account throttling
does not bound random addresses, and the per-IP limit is spoofable until #225. Signup already had the same lever (a
cost-12 `hash` per new address). Standard practice accepts the dummy compare; the remedy is #225. Recorded as an
annotation on #290 and #225.

**Row #290 coherence.** Its title still says "login timing still reveals whether an account exists", which is now
false. Remaining items (1), (3), (5)-(8) are mostly gated by #225 or multi-instance, except (8), a one-test gap. The
log line "0 created, 0 closed" is accepted by the validator (V4 ignores `0 closed`) and is accurate.

---

## 4. Loop 164 — #249 terminal bounce (`7248e17`): **HOLDS for close-while-alive**

**Diff vs log:** matches. `track(payload, { terminal: true })` pushes the event, then `deliverBufferedEvents(true, true)`
drains the whole buffer into one beacon, falls back to a `keepalive` fetch if the beacon is missing or refused, and
re-buffers only if `fetch` throws synchronously.

**Event orders:**

| Order | Deliveries | Duplicate? |
|---|---|---|
| desktop close: `beforeunload` → `pagehide` → `hidden` | buffer drained at `beforeunload`; bounce alone at `pagehide`; empty drain at `hidden` | no ✓ |
| mobile close-while-alive: `hidden` → `pagehide` | buffer at `hidden`; bounce at `pagehide` | no ✓ (the case the loop fixes) |
| background → OS discard | no `pagehide` fires on discard | **not delivered**; the commit's "dominant mobile exit, now delivers it" overstates. Needs the real-phone check already queued |
| freeze → resume | no `pagehide`, nothing emitted | ✓ |
| back-forward cache: `pagehide` (persisted) → `pageshow` (persisted) → leave again | bounce delivered at the first `pagehide`; no once-flag, no `pageshow` handler; second `pagehide` delivers a second bounce, and a user who returned and clicked was already counted as a bounce | **yes**; #251 item (3), now certain rather than possible. Dynamic pages here are likely `no-store`, which keeps them out of Chrome's cache, so the exposure is mostly Safari/Firefox |

**Other checks:**
- **Payload size.** Bounce sessions have no clicks, so the buffer is normally 1-10 events (batch threshold 10). Only
  repeated refused beacons grow it. If it ever exceeds ~64 KB, the beacon and the keepalive fetch share the same quota
  and both fail; the drained events are then lost (previously they were put back for a drain that would not come:
  equivalent). And the server keeps the **first** 100 (`events/route.ts:56-70`) while the bounce is appended **last**,
  so the bounce is the first event a long batch drops. #251 item (4).
- **Event-name scanner (#298):** `dashboard_bounced` is still in `analytics-event-names.ts:37`, and the scanner test
  passes in the 4363 run. The option form was chosen for this. ✓
- **Ingest shape:** body is still `{ events: [...] }` as `application/json`. ✓
- **PostHog:** forwarding is unchanged and happens once per `track`; PostHog is off in production builds (§2 P7).
- **Coverage:** the real Shell handler is not executed (disclosed); a listener built from the exported `BOUNCE_TRIGGER`
  and `shouldEmitBounce` stands in. The terminal refusal fallback is now unit-covered, which partly answers #251 item (2).

---

## 5. Governance

**Selection.** 162 #351 (11), 163 #290 (10), 164 #249 (10): MR-066's sequence exactly, all `burn-down` from the
follow-up pool (pool 112 > 8). 163's "items (2)+(4) only" is a legitimate one-outcome split (response timing must not
reveal registration); the row stays open with an accurate DONE note. ✓

**Cool-off accounting:** consumed at 161 (0/3) → 162 burn-down 1/3 → 163 2/3 → 164 3/3 **re-armed**. Correct. It is
single-use; the next invocation must be a `top-score` or `blocker-cadence` pick.

**Agents / Area.**
- Last 6: 159 security + devops, 160 FE, 161 FE, 162 FE, 163 security-reviewer, 164 FE.
- Areas: security, a11y, analytics, analytics, security/authz, web-app/analytics. **Analytics is 3 of the last 4.** No
  3-consecutive trip (163 broke it), but 165 = #116 (analytics) makes 164-165 analytics, so 166 should rotate.
- D-4 clause 1 did not fire (no user-visible strings changed). Clause 2 did not fire (no new ≥200-LOC contract).

**Ratio, loops 155-164.**

| | Count | Source |
|---|---|---|
| Closed | 9 | #344, #324, #336, #345, #350, #349, #94, #351, #249 |
| Created | 10 | MR-064 #345, #346; loop 156 #347; MR-065 #348-#350; MR-066 #351-#354 |
| Ratio | **0.90** | passes ≥ 0.5 |

Pool: 114 at MR-066 → **112**. Loops created nothing this window.

**Product value.** Measurement integrity (162), auth hardening (163), measurement completeness (164). Four
consecutive user-facing or user-protecting loops (161-164); tooling 0 of the last 4.

**D-1.** Last extension touch `871e29a`, **121 loops** at 164. Logged "user-ack outstanding" every loop. CEO item 21.

**Recording practice.**
- None of 162, 163, 164 records the guard runner or the validator; the "Validation (re-run by me)" lines name web-app,
  root and typecheck only. That makes four loops in a row since MR-066 named it as a practice.
- Disclosure quality is otherwise high: 162 disclosed the account-fetch-failure gap, 163 the DB-outage trade-off and the
  case-folding lookup, 164 the unmeasured caps and the unexecuted handler. Not disclosed: session-expiry and
  account-cache paths (162), the admin preset effect (162), OS discard (164).
- **Meta-learning:** a practice note did not change behaviour across three loops, so convert it to a check (N5).
  Candidate wording for the coordinator template meanwhile: "Validation: web-app N; root N; typecheck 0; validator
  exit 0 (open N); guard runner tests=N fail=0".

**Cadence.** Loops landed 6 and 11 minutes apart. The two misses in 162 are of the same kind as MR-066's 161 finding
(a path the tests did not model), which suggests the pace is costing scenario coverage on stateful client code.
Practice, no rule: for any change to identity or session-scoped client state, enumerate the session transitions
(sign-in, sign-out, expiry, user switch, second tab) in the loop's Limits before closing.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 19]`; every suite green at `7248e17`. Watch the first image build with the loop-159 `COPY` |
| 2 | Last CI | `a14c5e8` (loop 151) `37088974348` success. Loops 152-164 never ran on GitHub |
| 4 | Alerts | scheduled "Alerts check" still failing (`37079356379`, `37053616721`) |
| #350 part 3 | read production headers once | ready after the push |
| #351 item 5 | one-week read of the `'unknown'` plan share for `dashboard_v2_viewed` and `upgrade_clicked` | after the push |
| #249 premise | phone test: load dashboard, background, kill the app, look for the row | open; §4 says OS discard will not deliver |
| #225 | confirm proxy hops for `TRUSTED_PROXY_HOPS` | open; now also bounds the login CPU lever (§3) |
| #278 | PostHog keys absent from deploy | decide before enabling; N1 must land first |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | open, unchanged |

---

## 6. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor, status not matching blocked/awaiting CEO/parked/stale/done, sorted
by the bold total (`top067.mjs`). Excluded as known-malformed or already triaged: #157, #152, #127 (malformed cells),
#159 and #160 (MR-066 re-scope to ~6, pending CEO). Verified at `7248e17`:

| Rank | Row | Score | Verdict | Evidence |
|---|---|---|---|---|
| 1 | #116 pricing-page analytics | 12 | **true; worth it; re-scope to P1 → 13** | no `pricing_page_viewed`, `pricing_tier_selected` or `PricingPageTracker` anywhere in `src`; `upgrade_clicked` carries no tier or interval (`UpgradeButton.tsx:47`); `cancel_url` has no tier (`checkout/route.ts:209,406`). PostHog autocapture is off in production builds (no key), so the local table has **no** pricing page views at all. Since #351 every event already carries `userPlan`, so drop that field from the spec. Drop P2, P3 and the admin Billing section (overlaps #175). New names must be added to `analytics-event-names.ts` or ingest drops them (#295) |
| 2 | #105 ColumnPicker/PresetChipRail/SavedView axe | 11 | **true** | none of the three appears in `e2e/app/dashboard/v2-a11y.spec.ts` |
| 3 | #113 pricing table semantics (MR-065 re-scope) | 11 | **true** | `pricing/page.tsx:256-271` has `<th>` headers but no `scope` and no `<caption>` |
| 4 | #174 admin alerts strip | 11 | **true and unblocked** | its dependency PR-1 (#161) is struck; `computeAlerts` and `/api/admin/alerts` exist; `AdminOperationsDashboard.tsx` has no alerts UI (its two `role="alert"` are error banners). Pairs with CEO item 4 |
| 5 | #103 time-range persistence v2 | 11 | **true; value lower than scored** | `CURRENT_SCHEMA_VERSION = 1` (`persistence.ts:57`); no `defaultTimeRange`. The default has been `'all'` since iter 067, so the residual is a per-user override. Suggest re-score → 9 |
| 6 | #96 category noun unification | 11 | true in part | "Process Intelligence" in 14 files, "Workflow Library" 7, "Workflow Intelligence" 7, "Process Mining" 3. D-4 clause 1 will fire; needs `growth-strategist` |
| 7 | #106 workflow detail slide-in | 11 | not re-checked | E4, large |
| 8 | #137 embed iframe map | 11 | unchanged | do with #353 |
| 9 | #142 TEAM-P04 invite email | 11 | **true but blocked in fact** | no `sendEmail` under `app/api/teams`; needs Resend domain verification (CEO). Re-status → awaiting CEO |
| 10 | #170, #175 | 11 | **blocked in fact** | #170 needs `ADR-ADMIN-AUDIT` (no file, per MR-066); #175 needs Stripe keys in production. Re-status both |
| — | follow-ups at 10 | 10 | | #299 (verified: `analytics-ingest-buckets.ts:28,37` still a `Map` with a full scan; no body cap), #251 (sharpened by 164, §4), #290 (→ 9), #307, #309, #278, #329, #252, #346, #338 |

Record as **MR-067 triage** (no ratio credit; no strikes): #116 re-scope → 13; #103 → 9; #142, #170, #175 re-status;
#290 retitle and → 9.

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Analytics identity does not reset when the session user changes or ends, except via the sign-out button.** MR-067 §2. (1) Session expiry is a soft navigation (7-day JWT, `auth.ts:89`; middleware 307 to `/login` during a client navigation), so the previous user's plan stays on `window.__ledgerium_userPlan` for every later event in the tab (`/login`, `/signup`, `/pricing`). (2) If another user then signs in (`LoginPageClient.tsx:46`, `router.push`), `setUserPlanForAnalyticsIfUnset` refuses the new plan because the slot is occupied, so `dashboard_v2_viewed` can carry the previous user's plan until `/api/account` resolves. (3) `accountCache` (`useAccount.ts`, 30 s TTL) is never cleared on user change, so within 30 s the hook sees the old user's account and keeps the old plan (and `TrialStatusChip` shows the old trial). (4) PostHog: `identifyAnalyticsUser(email, { email })` uses the raw email as distinct id and person property, and `resetUser()` (`posthog.ts:78`) has no caller, so after sign-out every anonymous event on that browser is attributed to the previous person; latent while no deploy file sets `NEXT_PUBLIC_POSTHOG_KEY` (#278), but must land before PostHog is enabled. Fix as one outcome: clear the plan slot, the account cache and the PostHog identity whenever the session is unauthenticated or its user id differs from the published one (e.g. a root-level effect on `useSession`), identify by user id rather than email, and test expiry, user switch and a second tab. | fix | analytics / privacy | `frontend-engineer` (analytics constraints) | 2 | 4 | 2 | 4 | 2 | 1 | **9** |
| **N2** | **Loop 162 changed the dashboard's preset gate for admin accounts.** MR-067 §2. `/api/workflows` `stats.userPlan` now comes from `analyticsPlanFor` ('enterprise' for admin-unlimited), and `DashboardV2Shell.tsx:375-377,1352` passes it to `PresetChipRail`, which unlocks presets with `isPresetUnlockedForPlan` (`presets.ts:511`); the same route still gates health scores on the raw effective plan (`route.ts:333-334`). An admin with a free stored plan sees every preset unlocked but health scores gated. Decide one: admins are unlimited in the route's health gate too (consistent with `/api/account` flags), or `stats` carries `gatingPlan` and `analyticsPlan` separately and the preset rail reads the gating one. Test the admin case either way. | fix | web-app / plan-gating | `backend-engineer` | 1 | 3 | 2 | 5 | 1 | 1 | **9** |
| **N3** | **Signup discloses whether an address is registered; decide whether that is accepted.** MR-067 §3. `signup/route.ts:72-75` answers 409 "An account with this email already exists" (deliberately identical for admin-allowlisted addresses), behind a per-IP limit that is spoofable until #225; existing addresses also return before the cost-12 hash, so timing differs too. Loop 163 closed the login and forgot-password timing oracles, so this is now the only existence oracle in the auth surface, and the loudest. Options: (a) record it as an accepted product trade-off (most SaaS signup flows disclose), noting that #290's timing work is defence in depth; (b) verify-email-first signup that always answers "check your inbox". CEO decision; no code until decided. | decision | security / auth | `security-reviewer` + `product-manager` | 2 | 3 | 2 | 5 | 3 | 2 | **7** |
| **N4** | **Auth email failures log full addresses, against the email module's own policy.** MR-067 §3. `forgot-password/route.ts` logs `'[forgot-password] email delivery failed for', user.email`, and `email.ts:150` logs the raw SMTP error object, which for a rejected recipient usually contains the address. `email.ts`'s own no-provider branch deliberately logs only the domain. Log a domain or a user id instead, log SMTP errors by `code`/`responseCode` only, and add a test that the logged strings contain no `@`. | fix | security / privacy | `backend-engineer` | 2 | 3 | 1 | 4 | 1 | 1 | **8** |
| **N5** | **Loop entries keep omitting the guard-runner and validator results.** MR-067 §5. MR-066 recorded the slip at loop 161 as a practice; loops 162, 163 and 164 repeat it. Extend `scripts/validate-backlog.mjs` (V4 already parses each loop's Follow-ups line) to require, for each loop entry above the loop-165 anchor, a Validation line naming the validator result and the guard-runner counts; baseline older entries. Mutation-check by deleting the line from a scratch copy. | fix | tooling / governance | `qa-engineer` | 1 | 4 | 2 | 5 | 2 | 1 | **9** |

**Annotations recommended:**
- **#351 closure note:** "[MR-067: holds for the sign-out button and (app)→(public) navigation. Session expiry, user
  switch, the account cache and PostHog identity are not covered (N1). `stats.userPlan` now also drives the admin
  preset gate (N2).]"
- **#249 closure note:** "[MR-067: holds for close-while-alive (`hidden` → `pagehide`). OS discard fires no `pagehide`,
  so it is still not delivered there; the phone check stays with the CEO. Back-forward cache now reliably delivers a
  second bounce, and the bounce is the event the server's first-100 slice drops: #251 items (3) and (4).]"
- **#290:** retitle to "The login throttle can be used to keep an admin out, and its slot table can be filled; login
  and reset timing fixed at loop 163"; re-score I 3 → 2, total **9**; add "(MR-067) the dummy compare makes every
  unknown-address login cost one cost-12 bcrypt; bounded only once #225 lands, as signup already was."
- **#251:** "(MR-067) Loop 164 made item (3) certain rather than possible and put the bounce last in the batch that item
  (4) truncates; item (2) is now partly unit-covered by `analytics-terminal.test.ts`. Line numbers cited above predate
  loop 164."
- **#225:** "(MR-067) Also bounds the login CPU lever loop 163 accepted."
- **§6 verdicts** as MR-067 triage.

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §2 P2-P5, P7: identity survives expiry, user switch, cache, second tab; PostHog email id and no reset | N1 |
| §2 admin preset gate now 'enterprise' | N2 |
| §3 signup 409 oracle | N3 |
| §3 full addresses in auth logs | N4 |
| §3 login CPU lever | annotation on #290 and #225 |
| §4 OS discard not covered | #249 note; CEO phone check |
| §4 back-forward duplicate; bounce last in a truncated batch | #251 items (3), (4) |
| §5 validator/guard lines omitted ×3 | N5 |
| §6 stale scores and de-facto blocked rows | MR-067 triage |

---

## 9. Loop 165-167 picks

**Before 165: push** (CEO item 1).

Pool 112 > 8. The cool-off is armed 3/3 and MR-066 reserved it for #116, which §6 re-verifies as the true top.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **165** | **#116** P1 foundation only: `pricing_page_viewed` (referrer hostname, UTM, `isLoggedIn`, `returnedFromCheckout`) and `pricing_tier_selected` (`tierId`, `billingInterval`, `location`); tier and interval on `cancel_url`; names added to `analytics-event-names.ts` | **13** (re-scoped) | `top-score` via `ceiling-cool-off: invoked` | `frontend-engineer` (analytics constraints) | analytics / funnel | the top of the paid funnel is invisible in the local table, and PostHog is off in production. #351 already supplies the plan on these events |
| **166** | **#299** analytics ingest limiter: fixed-size table or O(1)-eviction LRU, plus a body size cap; check the sibling limiters | **10** | `burn-down` | `security-reviewer` | security / web | rotates off analytics after 164-165; verified true; a spoofed-IP flood is quadratic today |
| **167** | **#251** items (3)+(4) only: at most one bounce per view (once-flag, `pageshow` persisted handling), and a delivered batch never drops it (terminal event first, or chunk at the server cap) | **10** | `burn-down` | `frontend-engineer` | web-app / analytics | completes 164 in the same module while it is fresh |

- **Alternatives:** 167 → **N1** (9) if the CEO wants PostHog enabled soon (N1 must precede #278's PostHog decision);
  166 → #174 (11) is not burn-down-eligible, so it waits for the next cool-off.
- **Area check:** analytics → security → analytics. No 3-in-a-row.
- **Do not pick:** #353 before #137; #142, #170, #175 (blocked in fact); #159/#160 until the CEO answers MR-066.
- **Then MR-068** (base cadence after 167).

---

## 10. Verdict

Every count reproduces at `7248e17`: root 6210, web-app 4363, typecheck 0, validator clean (open 112), guard runner
142/142.

- **Loop 162 holds** for the paths it modelled and repairs MR-066's regression. It leaves identity unreset on session
  expiry and user switch (latent in PostHog) and quietly moved the admin preset gate.
- **Loop 163 holds.** The dummy compare is sound for every input that reaches it; the detached reset never rejects.
  Signup still answers the question both oracles asked.
- **Loop 164 holds** for close-while-alive. OS discard is out of its reach; back-forward return now double-counts.

Selection followed MR-066 exactly, the cool-off re-armed correctly, and the ratio is 0.90. The one thing the loop did
not learn is the recording line; make it a check. Push now.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 112
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6210 / 4363 / 0
(cd apps/web-app && node $S/bc.cjs "$(node -p "require.resolve('bcryptjs')")")    # dummy valid; same work at 1/72/5000 chars
grep -rn "resetUser()" apps/web-app/src --include=*.ts --include=*.tsx | grep -v posthog.ts   # no caller
grep -rn "POSTHOG" .github Dockerfile compose*.yaml                                # no hits
grep -n "userPlan" apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx   # :375-377 state, :1352 PresetChipRail
grep -n "already exists" apps/web-app/src/app/api/auth/signup/route.ts             # :74
git log origin/main..main --oneline | wc -l                                        # 19
```
