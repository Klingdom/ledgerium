# MR-068 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 165-167, 2026-10-02 23:16 → 23:30 (−0600). Commits `f335fd0` (loop 165, #116 P1), `5cee911`
(loop 166, #299), `d8b6b8c` (loop 167, #251 items 3 and 4). Previous review MR-067 at `ec265b6`. Rows closed: #116,
#299. Row partially closed: #251 (stays open). Rows filed by loops: #360 (loop 166).
**Why now:** base cadence, 3 of 3 since MR-067 (`ITERATION_LOG.md`, loop 167 Controls).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. No local server was started. Every row,
strike or annotation below is a recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `probe068.mjs`: mirror of `pricing-attribution.ts` driven with hostile UTM and referrer inputs;
- `lru068.mjs`, `lru068b.mjs`: `BoundedLru` mirror, heap measured with `--expose-gc`, keys derived the way
  `getClientIp` derives them (header → `split(',')` → `trim()` → first entry);
- `bb_src.ts` (copy of `bounded-body.ts`) + `bb2.mts`: body-cap probes run against the real source under Node 24;
- `top068.mjs`: backlog reader for Part C;
- `val.txt`, `guard.txt`, `tc.txt`, `root.txt`, `web.txt`, `status_before.txt`: run outputs.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file.

**Validation run for this review (executed, not inferred):**

| Check | Claimed (loop 167) | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6264 | **303 files, 6264 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4431 | **247 files, 4431 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 353 rows, 237 struck, **open 116**, 34 strict-checked Follow-ups lines, 144 claims | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| deltas | web 4363→4397→4420→4431; root 6210→6230→6253→6264 | 165: +34 web, +20 root (14 of the 34 are `.tsx`, which root does not run); 166: +23 both; 167: +11 both | consistent |

Pool arithmetic: MR-067 recorded 112; MR-067 filed #355-#359 (+5) = 117; #116 and #299 struck (−2) = 115; loop 166
filed #360 (+1) = **116**. Matches the validator. #251 correctly not struck.

**Not run:** any real browser or phone, Playwright, Docker, any request to production. The revert proofs ("6 fail on
the old code, one in 56 s", "4 fail with `analytics.ts` and `bounce.ts` reverted", "removing the names fails the #298
scanner") are agent/coordinator-reported and were not re-run.

---

## 1. Lead

1. **All three loops hold on their primary claims, and every count reproduces.** 165 makes the top of the paid funnel
   measurable; 166 puts a ceiling on a quadratic, unbounded limiter; 167 removes the duplicate bounce and the server
   truncation of the bounce.
2. **Loop 166's memory ceiling is real but about 50 times higher than stated (§3).** `BoundedLru.normalizeKey` uses
   `key.slice(0, 64)`. In V8 a slice of a long string is a *sliced string* that keeps the whole parent alive, and the
   key reaches the limiter as a substring of the raw `X-Forwarded-For` header. Measured with the `getClientIp`
   derivation: 20,000 keys whose header entry is 12 KB hold **244 MB**, 12.2 KB per entry; the same keys copied flat
   hold 5 MB. The commit's "~4-7 MB measured ceiling" measured keys built at 64 characters, never a truncated one. The
   bound now scales with the header-size limit (≈16 KB → ~330 MB per process), not with 64. Still bounded, so the loop's
   outcome stands; the claim and the test do not. → **N1 (12)**.
3. **Loop 166's sibling row #360 misses the worst sibling (§3).** `api/invites/accept/route.ts:77` keeps its own
   `rateLimits` Map, keyed by unauthenticated `getClientIp`, and **never deletes an entry** (only a test reset clears it),
   so it grows for the life of the process under a spoofed header, with keys up to header size. #360 lists
   `invite-buckets.ts` (keyed by `teamId`) and not this one. → amend #360 (annotation, re-score 10 → 11).
4. **Loop 165's email guard is narrower than its comment, and an older path ignores it altogether (§2).** The `@` check
   misses `%2540` (double encoding, which redirect chains produce), U+FF20 `＠` and U+FE6B `﹫`. Separately,
   `signup_completed` spreads the **raw** first-touch UTMs (`UTMCapture.tsx` stores five `utm_*` fields uncapped, including
   `utm_content`/`utm_term`, the usual carriers of merge-tag emails) through `SignupPageClient.tsx:60-61`. The rule loop
   165 wrote for one event is not the rule for the event that matters most. → **N2 (10)**.
5. **Loop 167 holds; its stated limit understates the remaining risk (§4).** The in-flight quota (~64 KB) that refuses a
   large beacon is shared by every beacon and keepalive request the page has in flight, so a terminal drain that splits
   into two or more chunks puts the bounce, which is last, in the request most likely to be refused, and a refused
   keepalive `fetch` rejects asynchronously and is swallowed. Byte-based chunking (#251 item 5) does not fix that;
   sending the terminal event first, alone, does. Annotation on #251.
6. **The recording practice changed (§5).** 165, 166 and 167 each record "validator 0; guard runner 142/142", the first
   three loops to do so since MR-066 named the slip. Learning through review narrative worked this time; #359 is still
   the durable form.
7. **Partial loops are now 2 of the last 5 (163, 167) (§5).** They do not hide ratio cost (a zero closure shows), but they
   let omnibus rows live for a long time: #251 was born at loop 78 and #290 at loop 107. Ratio for loops 158-167 is
   **0.62** (8 / 13), down from 0.90. Proposal in §5.
8. **Push is still the first CEO action.** `main` is **23 ahead**; the last deploy is still loop 151 (`37088974348`).
   Loop 165's events produce no data in production until it ships.

---

## 2. Loop 165 — #116 P1 pricing funnel (`f335fd0`): **HOLDS; one guard gap, one inconsistent sibling path**

**Diff vs log:** matches. `PricingPageTracker` (once per mount, waits for `useSession` to leave `loading`),
`lib/pricing-attribution.ts` (pure), `pricing_tier_selected` on every card CTA via `trackTierSelected` and a new
`UpgradeButton.onSelect`, `cancel_url` with `tier` and `interval`, both names in `analytics-event-names.ts`
(`:63-64`), two rows in `WRITERS_READERS.md`. `SessionProvider` wraps the root layout (`app/layout.tsx:64`
`AuthProvider`), so `isLoggedIn` resolves on public pages.

**Probes** (`probe068.mjs`, mirror of the source; `URLSearchParams` decodes once, as in the browser):

| # | Input | Result | Assessment |
|---|---|---|---|
| U1 | `utm_source=a%40b.com` | dropped | ✓ |
| U2 | `utm_source=jane%2Bnews@x.io` | dropped | ✓ |
| U3 | `utm_source=a%2540b.com` (double-encoded) | **kept: `a%40b.com`** | an email survives; redirectors and some ESP link wrappers double-encode |
| U4 | `utm_source=a%EF%BC%A0b.com` (U+FF20) | **kept: `a＠b.com`** | email-shaped; rare |
| U5 | U+FE6B small commercial at | **kept** | email-shaped; rare |
| U6 | `jane.doe+at+example.com` | kept | not machine-detectable; accepted |
| U7 | 5,000 chars | capped at 64 | ✓ |
| U8 | `'a' + 40 emoji` | capped at 64 code units, **ending in a lone surrogate** `\ud83d` | stored as an escape in the TEXT `properties` column; cosmetic |
| U9 | `%00` | kept as U+0000 | harmless with SQLite TEXT; would fail a Postgres `jsonb` column |
| U10 | `+15551234567` | kept | a phone number passes; a whitelist would stop it |
| R1 | `https://user:pass@evil.com:8443/p?q=1` | `evil.com` | credentials, port, path dropped ✓ |
| R2 | `http://192.168.1.20:3000/x`, `http://[::1]:80/` | `192.168.1.20`, `[::1]` | internal IPs kept as hosts; low value, not PII in practice |
| R3 | `https://jane-doe.github.io/cv` | `jane-doe.github.io` | a personal subdomain is a host; accepted |
| R4 | `android-app://com.google.android.gm/` | `com.google.android.gm` | useful (Gmail app) ✓ |
| R5 | `file:`, `javascript:`, `about:blank` | null | ✓ |
| R6 | IDN `BÜCHER.example` | `xn--bcher-kva.example` | normalised ✓ |

**Checkout `cancel_url`.** Built only from `requestedPlan`/`requestedInterval`, which start as `'starter'`/`'monthly'`
and are replaced only by `VALID_PLANS.includes(body.plan)` / `VALID_INTERVALS.includes(...)` (`checkout/route.ts:271-285`),
an exact-string match; `encodeURIComponent` is belt-and-braces. A crafted body (`plan: "team&x=y"`, an object, a
number) falls back to the defaults, so it cannot inject a parameter. ✓ The one-time SKU checkout (`:209`) still returns
`/pricing?billing=canceled` with no tier, so `returnedFromCheckout: true` with `checkoutTier: null` means "a service-offer
cancel or a hand-made link". Decodable by a reader; worth one sentence in the event's doc comment.

**Spoofing.** `returnedFromCheckout` is set by any link carrying `billing=canceled`, and ingest has no per-event schema,
so any anonymous client can post any field values. Disclosed in the loop's Limits. Acceptable: these are rates read in
aggregate, not facts the server acts on.

**Emission counts.**
- Strict mode: the ref guard holds (tested).
- Client navigation away and back to `/pricing`: the island remounts and fires again. That is a new view, as the code
  comment says; `referrerHost` is still the entry referrer, so a second view looks external (disclosed).
- Signed-in CTA: `onSelect` then `upgrade_clicked` then, on success, `checkout_started` and an immediate
  `window.location.href` change. The events sit below the 10-event flush threshold, so they leave by the
  `visibilitychange`/`beforeunload` beacon (`analytics.ts:1104-1113`); the button is disabled while loading, so a
  double click gives one selection. ✓
- Signed-in vs signed-out: the ingest route takes `userId` from the session (`events/route.ts:49-55`), so the same event
  is stored with or without a user. ✓
- **Interaction with #355:** after a soft session expiry the tab keeps the previous user's plan, so
  `pricing_page_viewed` can carry `isLoggedIn: false` together with `userPlan: 'starter'`. That makes #355 visible in
  the very event this loop added; §6 re-scores #355 for it.

**The older UTM path (N2).** `UTMCapture.tsx` stores `utm_source/medium/campaign/content/term`, raw and uncapped, plus
referrer domain and landing path, in `localStorage`; `getFirstTouchUTM()` returns every string value; and
`SignupPageClient.tsx:60-61` spreads them into `signup_completed`. None of loop 165's rules (cap, `@` drop) apply there,
and `utm_term`/`utm_content` are the fields most likely to hold an address. Pre-existing, not a loop-165 regression, but
165 established the project's rule and this is the conversion event. One sanitizer for both paths is one outcome.

**Readers.** `WRITERS_READERS.md` is right that no named reader exists. The generic events GET (`events/route.ts`, events
by name and by day) does count both names, so totals are visible; tier, interval, UTM and `returnedFromCheckout`
breakdowns are not. That is acceptable **for now**: nothing is collected in production until the push, and a reader
built before data exists would be designed blind. Promotion trigger for the PRICING_PAGE_REVIEW_001 cold-pool reader
(the admin Billing section): two weeks of production rows. Not filed.

**`WRITERS_READERS.md` accuracy.** Both new rows are correct (emitter file and symbol). The section header still says
**"Allowed names (client-emitted): 87"**; the table has 89 rows and `analytics-event-names.ts` lists 89 names. Small,
and the kind of drift a one-line test prevents (N4).

---

## 3. Loop 166 — #299 analytics ingest limiter (`5cee911`): **HOLDS for time and order; the memory figure is wrong**

**Diff vs log:** matches. `BoundedLru` (Map insertion order; `touch` = delete + set; eviction = `keys().next()`),
`readBodyWithLimit` (declared `Content-Length` fast reject, then a counted read that cancels past the cap), the route
reads the body through it and parses with `JSON.parse`, and two allowlist entries leave `api-error-coverage.test.ts`.

**What holds:**
- **O(1) per request.** No operation iterates; a 100k distinct-key flood ran in ~0.9 s in the mirror; 200k IPv4 keys in
  2.4 s including GC calls.
- **Window/limit unchanged** (60 s, 120). Expired entries are replaced on touch. ✓
- **Order: limit first, then body.** A 413 is counted against the caller's window, which is right (an oversized sender
  should not get free attempts). A 429 returns before the body is read. ✓

**Body cap probes** (`bb2.mts`, the real `bounded-body.ts`):

| Probe | Result |
|---|---|
| body exactly 256 KiB with matching `Content-Length` | accepted ✓ |
| 256 KiB + 1 byte, no `Content-Length` (chunked) | `too_large` ✓ |
| `Content-Length: 10`, 300 KB body | `too_large` after reading past the cap ✓ |
| `Content-Length: " 999999999999 "` | rejected unread ✓ |
| `Content-Length: +300000` (not digits) | header ignored, body read with the counted cap ✓ |
| stream errors mid-read | `unreadable` → route `catch` → 200 `ok:false` (the #243 contract) ✓ |
| gzip bomb (50 MB of spaces → 48.6 KB) with `Content-Encoding: gzip` | read raw, **not decompressed**; `JSON.parse` fails → 200 `ok:false` ✓. Neither Node nor the route inflates request bodies |
| multipart | not parsed; same `ok:false` ✓ |

At most `maxBytes + one chunk` is held. ✓

**Memory (N1).** `lru068b.mjs`, heap after GC, 20,000 keys at capacity:

| Key source | Heap | Per entry |
|---|---|---|
| IPv4 header (`10.0.x.y, 172.16.0.1`) | 3.3 MB | 165 B ✓ matches the commit |
| first XFF entry 12 KB, unique per request | **243.9 MB** | **12,196 B** |
| same, key copied flat before storing | 5.0 MB | 252 B |

Cause: `normalizeKey` returns `key.slice(0, 64)`. V8 represents a slice of 13+ characters of a long string as a
*sliced string* pointing at the parent, so the stored 64-character key retains the whole header entry (which is itself a
slice of the raw header). The test that measured "342 B/entry with 64-char keys" built 64-character keys directly; no
test truncates a long key and measures. Header bytes are Latin-1 in Node, so the two-byte-character question in the
brief does not arise in practice; code-unit vs byte truncation is equivalent there.

Consequences:
- The ceiling is ~capacity × header-entry size: with Node's default 16 KB header limit, ~330 MB per process, against the
  commit's "4-7 MB". Before 166 it was unbounded, so 166 still moved the bound from none to some.
- The same `normalizeKey` is what #360 will reuse for three more limiters, so fix it before #360 copies it.
- Fix options (one outcome): map any key longer than 64 to a single shared `'overlong'` bucket (junk keys are
  over-throttled together, which the module already accepts), or copy flat; add a heap test with 12 KB header-derived
  keys. A stricter `getClientIp` (reject entries that are not IP-shaped) would also help every caller, but that is #225's
  territory.

**Truncation semantics.** Two attacker keys sharing their first 64 characters merge (over-throttling only junk). An
honest key cannot be targeted any more easily than by spoofing the honest IP itself, which #225 already covers. ✓

**Eviction semantics.** Disclosed: past 20k live keys an honest key's window restarts. Correct and inherent.

**Scanner gap (N3).** `api-error-coverage.test.ts` §#258 (malformed body) and §#261 (body shape) detect a body read with
`BARE = /\b(?:req|request)\.json\(\)/`. Removing the two entries was correct, but it means the scanners now see nothing of
this route; and they already missed three others that parse request text themselves: `analytics/process-diff/route.ts:106`,
`analytics/time-sinks/route.ts:82`, `upload/route.ts:84`. All four have their own `try` today, so this is a guard gap,
not a live defect. Small row.

**#360 accuracy.** Its three sites are correct (`auth-buckets.ts:34` with the scan at `:58`; `extension-telemetry-buckets.ts:36`/`:56`;
`invite-buckets.ts:28`/`:46`). It misses `api/invites/accept/route.ts:77`:
- an unauthenticated POST (the token is checked before rate limiting, but any non-empty string passes that check);
- keyed by `getClientIp(req)`, uncapped length;
- `recordRequest`/`recordFailure` only ever `set`; nothing deletes; `_resetRateLimitsForTesting` is the only `clear()`.
So it grows by one entry per spoofed address for the life of the process. That is worse than the three listed sites,
which at least prune on scan. Amend #360 (§7) rather than file a duplicate.

---

## 4. Loop 167 — #251 items (3)+(4) (`d8b6b8c`): **HOLDS**

**Diff vs log:** matches. `shouldEmitBounce` takes `alreadyEmitted`; `bounceEmittedRef` is set before `track`;
`ANALYTICS_MAX_EVENTS_PER_REQUEST = 100` in `analytics-delivery.ts`, imported by the route's `MAX_BATCH`;
`deliverBufferedEvents` splits the drain with `chunkEvents` and, if a chunk cannot start, puts it and every later chunk
back at the front in order.

**One bounce per view:**

| Path | Refs | Result |
|---|---|---|
| bfcache: `pagehide` (persisted) → restore → `pagehide` | instance and refs survive; `bounceEmittedRef` true | one bounce ✓ |
| restore, click, leave | refs survive; already emitted | one bounce (the first is now a known false positive of the definition, not of the code) |
| client navigation away from the dashboard and back | `DashboardV2ShellInner` unmounts; refs are new on remount; a new `dashboard_v2_viewed` fires once data loads | new view, new `bounceEmittedRef = false` ✓ |
| leave via the AppShell sidebar (outside the shell root) without a click inside it | the click is not counted, but the listener is removed on unmount and no `pagehide` fires on a soft navigation | no bounce. Pre-existing definition ("a bounce leaves the page"); not a 167 change |
| failed load | `dashboardViewFiredRef` unset | no bounce ✓ |

**Chunking:**
- **Server truncation is unreachable from the current client**: no request carries more than 100 events. Cached bundles
  from before the deploy can still send more, and the server still reports `truncated`. ✓
- **Refused middle chunk:** chunks before it are sent; it and all later chunks go back in order. On the terminal path a
  refused beacon falls to a keepalive `fetch` instead; only a synchronous throw re-buffers. ✓
- **Shared quota (annotation on #251 item 5).** The ~64 KB in-flight budget in Chromium is shared by every beacon and
  keepalive request outstanding for the page, not per request. With two or more chunks on the terminal path, the last
  chunk (the one holding the bounce) is the most likely to exceed it; its keepalive fetch then rejects asynchronously and
  the `.catch` swallows it, so the bounce is lost and not re-buffered. The buffer only reaches 100 after repeated refused
  beacons, which is exactly the quota-exhausted state, so the cases correlate. Byte-sized chunks alone do not fix this;
  sending the terminal event first, in its own request, does. Low frequency; same module; fold into #251 (5).
- **Ordering** within the stored table is by request arrival, not chunk index; readers order by timestamp. ✓

**Coverage.** The shell wiring is checked by source text plus a mirrored listener (disclosed). The bfcache behaviour
relies on React not re-running effects on restore, which is true and untested in a browser.

---

## 5. Governance

**Selection.**
- 165 `top-score` via `ceiling-cool-off: invoked` for #116 (12 in the cell; MR-067 triage "~13", score left unchanged
  until rewritten). It was the top selectable row either way, and the charge was re-armed at 164 (161 consumption →
  162/163/164 burn-downs). Correct use: a `top-score` pick that burn-down could not reach. ✓
- 166 #299 and 167 #251 `burn-down`. Both MR-067's picks. ✓
- **Cool-off:** 0/3 after 165 → 1/3 (166) → 2/3 (167). Logged correctly in both entries. 168 as burn-down re-arms it.

**Partial-row loops.** 163 (#290) and 167 (#251) closed nothing.
- They do not hide ratio cost: a loop that closes nothing reads as zero.
- What they hide is age. Both rows are omnibus "hazards found by review X" rows with independent items; each partial
  loop leaves a row that is older, longer and harder to finish (#251: 5 items now, born loop 78; #290: 8 items, born 107).
- **Proposal (practice, not a CLAUDE.md change):** when a loop takes a subset of an omnibus row, the loop strikes the row
  and files the remainder as a new row in the same commit, citing the original. Ratio-neutral (one closed, one created),
  and the residual row's age starts honestly. This is the live-backlog analogue of the audit-intake split rule
  (§Audit-Intake clause 8). Apply first to #251 (residual: items 1, 2, 5) at loop 167's record, and to #290.

**Ratio, loops 158-167.**

| | Count | Source |
|---|---|---|
| Closed | 8 | #345 (158), #350 (159), #349 (160), #94 (161), #351 (162), #249 (164), #116 (165), #299 (166) |
| Created | 13 | MR-065 #348-#350; MR-066 #351-#354; MR-067 #355-#359; loop 166 #360 |
| Ratio | **0.62** | passes ≥ 0.5; down from 0.90 (MR-067) |

Most creation is reviews filing true defects, not loops spawning debt (loops created 1 in 10). The trend matters: if
MR-068's rows below are all filed and 168-170 close one each, the window ratio approaches the floor.

**Recording practice.** 165, 166 and 167 each record "validator 0; guard runner 142/142", and each entry also has a
Limits section that names what was not modelled. **Fixed by practice after two reviews.** #359 (mechanism) remains
worth doing, cheaply, but is no longer urgent (§6).

**Pace and scenario coverage.** Loops landed 9 and 5 minutes apart. The three gaps this review found are all "a path
the tests did not model": a long key truncated rather than a short key (166), a second UTM path (165), concurrent
in-flight requests rather than one (167). MR-067 made the same observation about identity transitions. Practice for
the coordinator template, no rule: a resource-bound claim (bytes, keys, ms) names the *input shape* it was measured
with, and the worst input shape is measured too.

**Agents / Area.** 165 FE (analytics/funnel), 166 security-reviewer (security/web), 167 FE (web-app/analytics). No
3-in-a-row; analytics 2 of 3. D-4 clause 1 did not fire (no user-visible copy). Clause 2: 165 added
`pricing-attribution.ts` (62 LOC) and 166 `bounded-lru.ts` + `bounded-body.ts` (127 LOC); both under 200, neither fires.

**D-1.** Last extension touch `871e29a`, **124 loops** at 167. "User-ack outstanding" logged every loop. CEO item 21.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 23]`; every suite green at `d8b6b8c`. Loop 165's instrumentation collects nothing until this lands. Watch the first image build (loop-159 `COPY`) |
| 2 | Last CI/deploy | `37088974348` (loop 151) success. Loops 152-167 never ran on GitHub |
| 4 | Alerts | scheduled "Alerts check" still failing: `37099623595` (newest), `37079356379`, `37053616721` |
| #350 part 3 | read production headers once | after the push |
| #351 item 5 | `'unknown'` plan share, one week | after the push |
| #249 premise | phone test (OS discard) | open |
| #225 | `TRUSTED_PROXY_HOPS` | open; now also bounds N1 and the #360 sites |
| #278 | PostHog keys absent | #355 must land first |
| #357 | signup disclosure decision | open |
| 19 / 21 / 22 / #347 | Path E; D-1; TanStack/BullMQ; plan-table rows | unchanged |

---

## 6. Part C — top open non-blocked rows

**Method:** unstruck rows above the historical anchor (`top068.mjs`), statuses that are blocked / awaiting CEO / parked
excluded by reading each status (the script's keyword filter wrongly dropped #105 and #113, whose statuses contain
"BLOCKER 1" and "CEO directive-driven"; restored by hand). Excluded as known-malformed or pending CEO: #157, #127, #152,
#159, #160. Verified at `d8b6b8c`:

| Rank | Row | Score | Verdict | Evidence |
|---|---|---|---|---|
| 1 | #105 ColumnPicker/PresetChipRail/SavedView axe | 11 | **true** | 0 matches for any of the three in `e2e/app/dashboard/v2-a11y.spec.ts` |
| 2 | #113 pricing table semantics | 11 | **true** | `pricing/page.tsx:258-264`: `<thead>`/`<th>` with no `scope` and no `<caption>`; loop 165 touched this file only to mount the tracker |
| 3 | #174 admin alerts strip | 11 | **true, smaller than written** | `AdminOperationsDashboard.tsx` has no alerts UI (its `role="alert"` at `:345,:378` are error banners); but `analytics/product/page.tsx:274` already fetches `/api/admin/alerts`, so the work is reuse, not build. Pairs with CEO item 4 |
| 4 | #96 category noun unification | 11 | true in part (MR-067 counts) | D-4 clause 1 will fire |
| 5 | #114 live output embed above tier cards | 11 | **true** | no embed or map preview in `pricing/page.tsx`. E3; better after #137 |
| 6 | #103 time-range persistence v2 | 11 (MR-067: ~9) | true, low value | unchanged since MR-067 |
| 7 | #106 workflow detail slide-in | 11 | not re-checked | E4 |
| 8 | #145 TEAM-P07 invite landing + CSV + feed | 11 | **partly built, effectively blocked** | `app/(app)/teams/join/page.tsx` exists; team plans are waitlist-only and #142 (invite email) awaits Resend. Re-status → blocked on #142 |
| 9 | #137 embed iframe map | 11 | unchanged | with #353 |
| 10 | #360 sibling limiters | 10 (→ 11 amended) | **true, incomplete** | §3 |
| — | follow-ups at 10 | | | #251 (residual), #252, #278, #307, #309, #329, #338 |
| — | #355 identity reset | 9 (→ 10) | **true, sharper** | loop 165's event now carries the stale plan with `isLoggedIn: false` (§2) |
| — | #359 validation-line check | 9 | true, less urgent | practice followed 3 of 3 since MR-067 |

Record as **MR-068 triage** (no ratio credit; no strikes): #360 amend + re-score 11; #355 L 2→3, total 10; #145
re-status; #174 note "reuse the product-page alerts fetch".

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The bounded limiter's 64-character key cap does not bound memory: each stored key keeps the whole header alive.** MR-068 §3. `BoundedLru.normalizeKey` (`rate-limit/bounded-lru.ts`) returns `key.slice(0, 64)`; in V8 that is a sliced string retaining its parent, and the key arrives as a substring of the raw `X-Forwarded-For` header (`client-ip.ts` split and trim). Measured with that derivation: 20,000 keys from 12 KB header entries hold 244 MB (12.2 KB each); copied flat, 5 MB. Loop 166's "~4-7 MB ceiling" measured keys built at 64 characters. The real ceiling is about capacity times the header limit (~330 MB per process at 16 KB). Fix in one place before #360 reuses it: map every key longer than 64 to one shared overlong bucket (junk is over-throttled together, as the module already accepts) or store a flat copy; add a heap test using 12 KB header-derived keys; correct the figure in `analytics-ingest-buckets.ts`. | fix | security / web | `security-reviewer` | 3 | 4 | 2 | 5 | 1 | 1 | **12** |
| **N2** | **One UTM rule for every analytics path: the signup event sends raw first-touch UTMs, and the pricing guard misses encoded at-signs.** MR-068 §2. (1) `UTMCapture.tsx` stores `utm_source/medium/campaign/content/term` raw and uncapped; `getFirstTouchUTM()` returns them; `SignupPageClient.tsx:60-61` spreads them into `signup_completed`, so an address in `utm_term` or `utm_content` (the usual merge-tag carriers) is stored as is. (2) Loop 165's `sanitizeUtm` (`lib/pricing-attribution.ts`) drops values containing `@` after one decode only: `%2540` survives as `a%40b.com`, and U+FF20 and U+FE6B pass; the 64-unit cap can end in a lone surrogate. Fix as one outcome: one exported sanitizer (trim, decode once more, reject `@`, `%40`, U+FF20, U+FE6B, cap on a code-point boundary, optionally a character whitelist) used by both `UTMCapture` and the pricing tracker; tests for each input above and for the signup spread. | fix | analytics / privacy | `frontend-engineer` (analytics constraints) | 2 | 4 | 2 | 4 | 1 | 1 | **10** |
| **N3** | **The malformed-body and body-shape guards only see `req.json()`, so four routes that parse request text themselves are invisible.** MR-068 §3. `api-error-coverage.test.ts` §#258 and §#261 match `BARE = /\b(?:req\|request)\.json\(\)/`. `analytics/events/route.ts` (since loop 166, via `readBodyWithLimit` + `JSON.parse`), `analytics/process-diff/route.ts:106`, `analytics/time-sinks/route.ts:82` and `upload/route.ts:84` parse with `JSON.parse` and are not scanned. All four have their own `try` today. Extend the detector to `JSON.parse(` on request-derived text and to `readBodyWithLimit`/`req.text()`, give the four routes allowlist entries with reasons, and mutation-check by removing one route's `try` in a scratch copy. | fix | tooling / web | `qa-engineer` | 1 | 3 | 2 | 4 | 2 | 1 | **7** |
| **N4** | **`analytics-event-names.WRITERS_READERS.md` states 87 allowed names; there are 89.** MR-068 §2. Loop 165 added two table rows and left the section header at 87, matching neither the table nor `analytics-event-names.ts`. Correct the header and add one assertion to `analytics-event-names.test.ts` that the header count equals the list length and the table row count. | fix | analytics / docs | `qa-engineer` | 1 | 2 | 1 | 5 | 1 | 1 | **7** |

**Amendment to #360 (annotation; re-score I 3→4, total 11):** "(MR-068) Missing a fourth and worse site:
`api/invites/accept/route.ts:77` keeps its own `rateLimits` Map, keyed by unauthenticated `getClientIp` with no length
cap, and never deletes an entry (`recordRequest`/`recordFailure` only `set`; only the test reset clears), so it grows for
the life of the process under a spoofed header. Move it to the shared LRU with the other three. Do N1 first: the LRU's
key cap does not bound memory yet."

**Annotations recommended:**
- **#116 closure note:** "[MR-068: holds. `cancel_url` takes only allow-listed values (crafted bodies fall back to
  starter/monthly). Email guard misses double-encoded and full-width at-signs, and `signup_completed` still sends raw
  first-touch UTMs (N2). The one-time SKU cancel also returns `billing=canceled` with no tier, so `returnedFromCheckout`
  with a null tier means a service-offer cancel or a hand-made link. `WRITERS_READERS.md` header count left at 87 (N4).
  No production data until the push.]"
- **#299 closure note:** "[MR-068: O(1), body cap and ordering hold, including a 48 KB gzip bomb (read raw, not
  inflated). The 4-7 MB ceiling is wrong for long header-derived keys: V8 sliced strings retain the header (244 MB at
  20k keys of 12 KB); N1. The api-error-coverage scanners no longer see this route (N3).]"
- **#251:** "(MR-068) Loop 167 holds for items (3) and (4). Item (5) needs more than byte chunking: the ~64 KB in-flight
  quota is shared by all outstanding beacons and keepalive fetches, so with two or more chunks the last one (holding the
  bounce) is the likeliest refused, and a refused keepalive rejects asynchronously and is lost. Send the terminal event
  first, alone. Consider splitting the residual (1), (2), (5) into a new row (§5)."
- **#355:** "(MR-068) Now visible in loop 165's event: after a soft session expiry `pricing_page_viewed` can carry
  `isLoggedIn: false` with the previous user's `userPlan`. L 2→3, total 10."
- **#145:** re-status "blocked — depends on #142 (Resend) and team plans leaving the waitlist; `/teams/join` already
  exists (MR-068)".
- **#174:** "(MR-068) `analytics/product/page.tsx:274` already fetches `/api/admin/alerts`; reuse it."
- **#225:** "(MR-068) Also bounds N1 and the #360 sites."

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §3 sliced-string key retention; ceiling claim ~50× low | N1 |
| §3 `invites/accept` Map never evicts; missing from #360 | #360 amendment |
| §2 raw UTMs on `signup_completed`; `%2540`/U+FF20/U+FE6B pass; lone surrogate | N2 |
| §3 scanners blind to `JSON.parse` routes | N3 |
| §2 WRITERS_READERS header count | N4 |
| §2 SKU cancel indistinguishable by flag | #116 note |
| §2 stale plan on `pricing_page_viewed` after expiry | #355 annotation and re-score |
| §4 shared in-flight quota on multi-chunk terminal drain | #251 annotation |
| §5 omnibus partial loops | practice proposal; #251/#290 split |
| §6 #145 de-facto blocked; #174 smaller | MR-068 triage |

---

## 9. Loop 168-170 picks

**Before 168: push** (CEO item 1).

Pool 116 > 8, so burn-down unless a cool-off is invoked. Cool-off is 2/3; a burn-down at 168 re-arms it for 169.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **168** | **N1** (limiter key memory) | **12** | `burn-down` (review-filed follow-up of loop 166) | `security-reviewer` | security / web | fixes a wrong published bound in the module #360 is about to reuse; E1; re-arms the cool-off (3/3) |
| **169** | **#105** axe coverage for ColumnPicker, PresetChipRail, SavedView | **11** | `top-score` via `ceiling-cool-off: invoked` | `qa-engineer` | web-app / a11y | true top, burn-down cannot reach it; test-only, low risk; rotates agent and Area off analytics/security |
| **170** | **#360** amended (four limiters onto the fixed LRU, including `invites/accept`) | **11** | `burn-down` | `security-reviewer` | security / web | after N1 the LRU is safe to reuse; closes the unbounded-forever site |

- **Alternatives:** 169 → #113 (11, E1/R1, pricing a11y) if the CEO prefers the conversion page; 170 → **#355** (10
  re-scored) if PostHog enablement (#278) is about to be decided, since #355 must precede it; N2 (10) is the next
  analytics pick.
- **#359:** keep open at 9. The practice held for three loops; schedule it the first time an entry omits the line, or
  bundle it into the next tooling loop with N3/N4. Not before 170.
- **Area check:** security → a11y → security. No 3-in-a-row.
- **Do not pick:** #145 (blocked in fact), #114 before #137, #142/#170/#175 (blocked), #159/#160 (CEO).
- **Then MR-069** (base cadence after 170).

---

## 10. Verdict

Every count reproduces at `d8b6b8c`: root 6264, web-app 4431, typecheck 0, validator clean (open 116), guard runner
142/142.

- **Loop 165 holds.** The URL cannot be crafted through checkout, and referrers reduce to hosts. The `@` guard is
  narrower than its comment, and the signup event never got the rule at all.
- **Loop 166 holds** for time, order and the body cap. Its memory ceiling is ~50× the stated figure for long keys, and
  its sibling row misses the one limiter that never forgets.
- **Loop 167 holds.** One bounce per view, and no server truncation from the current client. The last-chunk loss under
  a shared quota remains, and byte chunking alone will not fix it.

Selection followed MR-067 exactly, cool-off accounting is right (0 → 1 → 2), the ratio is 0.62 and falling, and the
recording line is now in every entry. The pattern to break is partial loops on omnibus rows, and resource claims
measured on the friendliest input. Push now.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/validate-backlog.mjs                                                  # exit 0, open 116
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
pnpm test; (cd apps/web-app && pnpm test); pnpm typecheck                          # 6264 / 4431 / 0
node --expose-gc $S/lru068b.mjs     # 12 KB header-derived keys: ~244 MB at 20k; flat copy ~5 MB
node $S/probe068.mjs                # %2540, U+FF20, U+FE6B survive sanitizeUtm
(cd $S && node bb2.mts)             # body cap: exact cap ok, +1 too_large, gzip read raw
grep -n "rateLimits\." apps/web-app/src/app/api/invites/accept/route.ts          # set only; no delete
grep -n "getFirstTouchUTM" "apps/web-app/src/app/(public)/signup/SignupPageClient.tsx"   # :60-61 raw spread
grep -n "Allowed names" apps/web-app/src/lib/analytics-event-names.WRITERS_READERS.md   # 87 (list has 89)
git log origin/main..main --oneline | wc -l                                        # 23
```
