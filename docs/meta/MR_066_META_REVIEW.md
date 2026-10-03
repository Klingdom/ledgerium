# MR-066 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 159-161, 2026-10-02 22:06 → 22:17 (−0600). Commits `6106d36` (loop 159, #350), `81276fb` (loop 160,
#349), `710b95c` (loop 161, #94). Also in scope: the Mode 3 fix `5820f20` (MR-065 N1), committed before `a9a9d1a`
(MR-065 recorded). Rows closed: #350, #349, #94. Rows filed by loops: none.
**Why now:** base cadence, 3 of 3 since MR-065 (`ITERATION_LOG.md:13`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Every row, strike or fix below is a
recommendation for the coordinator. Scratch went only to `…/scratchpad/`:
- `probe.mjs`: header probes against a local `next start` of the existing loop-159 `.next` build, port 3917, stopped
  afterwards;
- `guard-tamper.mjs` and `g/`: Docker-guard tamper roots;
- `wr/probe160.test.tsx`: WorkflowRow probes through the MR-065 `node_modules` junction;
- `rows066.mjs`, `top066.mjs`, `fu066.mjs`: backlog readers.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file.

**Validation run for this review (executed, not inferred):**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6177 | **298 files, 6177 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4322 | **240 files, 4322 passed, exit 0** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**, 343 rows, 233 struck, **open 110**, 28 strict-checked lines, 140 claims | matches |
| guard runner (`run-guard-tests.mjs --manifest …`) | 142/142 (loop 159) | **files=6 tests=142 real_pass=142 fail=0** | **green** (MR-065 N1 fixed) |
| `node scripts/check-dockerfile-workspace.mjs` | 0 | **exit 0** | matches |
| loop 160 "22 tests" | 22 | `WorkflowRow.unknown.test.tsx`: 3 + 3 + 1 + 6 + 9 single = **22** | matches |
| loop 161 "10 tests" | 10 | `useAnalyticsPlan.test.tsx`: **10** `it()` | matches |
| deltas 159/160/161 | root 6173→6177; web 4290→4312→4322 | consistent with the files above | matches |

**Not run:** Docker (no image build), any real browser or screen reader, Playwright, any request to production. The
revert proofs ("2 of 4", "14 of 22", "2 wiring") are agent-reported and were not re-run.

---

## 1. Lead

1. **All three loops hold on their primary claims, and the guard suite is green again.**
   - **159:** the four headers are on every response class I could reach on a live server: pages, API, 401/400/500, 404,
     `_next/static`, `public/` files, middleware redirects, NextAuth routes, HEAD and OPTIONS (26 requests, §2). That is
     stronger than the log's own limit ("pinned at config level, not on a live response").
   - **160:** every residue MR-065 named is fixed under adversarial probes (§3).
   - **161:** the claimed "one request, one writer, never queued, PII-free" behaviour holds.
2. **Loop 161 moved the plan signal in a way its tests do not see (§4). Filed as N1 (11), recommended for loop 162.**
   - **Lost on public pages.** The hook **clears** the plan when `AppShell` unmounts. A client-side navigation from any
     `(app)` page to a `(public)` page (for example `/upload` → `<Link href="/pricing">`, `upload/page.tsx:206,288`)
     unmounts `AppShell`. The pricing page's `upgrade_clicked` and `checkout_started` (`UpgradeButton.tsx:47,61`) now
     carry `'unknown'`. Before loop 161 they carried the plan the dashboard had set earlier in the session. These are
     the funnel events that most need the plan.
   - **Racy on the dashboard.** `dashboard_v2_viewed` used to be emitted strictly after the dashboard had set the plan
     from its own response. It now depends on `/api/account` winning a race against `/api/workflows`. That race is most
     likely lost when `/api/workflows` is fast, which is the 0-workflow first-run cohort that #57 reads. The 10 tests
     cover `sop_viewed` and `upload_failed`, but not the dashboard view.
3. **Loop 160 has one small regression (§3, N2, 8).** MR-065 P3 found that a mid-flight unmount cleared the status
   region. It now leaves "Deleting workflow…" in the region indefinitely, because the `catch` returns on `aborted`
   before anything clears it.
4. **Loop 159's guard is narrower than its message (§2, N3, 9).**
   - It reads only `next.config.js`'s own literal relative requires, so it misses requires nested inside
     `security-headers.js`, template literals, `path.join(__dirname, …)`, `require.resolve` and `fs` reads.
   - It also false-fails two valid Dockerfile spellings (it fails safe).
   - The exemption hook's comment says X-Frame-Options is omitted for exempt paths, but the code sets `SAMEORIGIN`.
   - Latent until #137; do it with #137.
5. **MR-065's "the true top is #94 at 12" was a tie, not a lead (§6).** 14 other rows list 12. On inspection almost all
   of them are blocked in fact (Path E, BullMQ, a missing ADR, a CEO gate) or superseded. §6 re-statuses 15 rows. After
   that, the real top is **#116 (12)**, pricing-page analytics, which N1 also unblocks.
6. **Push is unblocked.** `main` is **15 ahead** of `origin/main`. The last CI run is loop 151 (`a14c5e8`, success).
   The loop-159 Dockerfile `COPY` has never been built into an image. Push, watch the image build, then run the
   loop-159 header check against production (CEO item 1 plus the #350 part-3 check).

---

## 2. Loop 159 — #350 security headers (`6106d36`): **HOLDS; guard narrower than stated**

**Diff vs log:** matches.
- `security-headers.js` exports `BASE_HEADERS`, `FRAME_DENY_HEADERS`, an empty `FRAME_EXEMPTIONS` and
  `buildSecurityHeaders()`.
- `next.config.js` requires it and returns it from `headers()`.
- The runner gets an explicit `COPY` (`Dockerfile:102`).
- The guard gains a runner-stage parse and 5 tests.
- HSTS is deliberately absent.

**Live response check.** I ran `next start` on the existing `.next` (BUILD_ID 22:03, the loop-159 build; its
`routes-manifest.json` carries the 4-header `/:path*` entry), with a scratch `DATABASE_URL`.

| Request class | Examples | Status | Four headers |
|---|---|---|---|
| public pages | `/`, `/pricing`, `/login`, `/share/abc` | 200 | ✓ |
| `(app)` pages with a bogus session cookie | `/dashboard`, `/workflows/123`, `/account/purchase-success` | 200 | ✓ |
| middleware redirect | `/dashboard` with no cookie | 307 → `/login?callbackUrl=…` | ✓ |
| API | `/api/health` 200; `/api/account` 401; `/api/billing/webhook` POST 400; `/api/share/abc` **500** | — | ✓ on all, including the 500 |
| NextAuth | `/api/auth/session` 200; `/api/auth/signin` 302 | — | ✓ |
| static | `_next/static/chunks/*.js` 200; a missing chunk 404; `public/dashboard.html` 200; `/llms.txt` 200; `_next/image` 400 | — | ✓ |
| not found | `/nope-404`, `/sop-templates/x/download.md` | 404 | ✓ |
| methods | HEAD `/pricing` 200; OPTIONS `/api/health` 204 | — | ✓ |
| **`next.config` redirects** | `/demo`, `/docs.html` | **308** | **none** |

- **The 308s carry no headers.** That is Next 14 behaviour: config redirects are resolved before header entries are
  applied. It is harmless, because a redirect has no body to frame and the target page carries the headers. It is
  recorded so nobody "fixes" it.
- **Merge semantics.** Later entries overwrite by key (`next/dist/server/lib/router-utils/resolve-routes.js:493-509`),
  so the exemption design works as described.
- **Nothing frames the app.** No `<iframe>` exists in web-app `src`/`public`. The print/PDF paths use `window.print()`
  and `window.open(…, '_blank')`, which are top-level. Stripe and OAuth are redirects. `frame-ancestors 'none'` breaks
  nothing reachable.

**Other runtime files outside the runner `COPY` set:** none found.
- `src/` has no runtime `readFileSync`/`readdirSync`; content is imported at build time.
- `storage.ts` writes to `DATA_DIR` or `cwd/data`, which is a volume.
- `start.sh` needs `validate-secrets.sh` (copied) and `prisma/` (copied).
- Middleware and any instrumentation compile into `.next`.

**Docker-guard tamper results.** Each case is a copy of the real `Dockerfile`, `next.config.js`, `security-headers.js`
and package manifests in a scratch root (`CHECK_DOCKERFILE_ROOT`).

| Tamper | Exit | Should be |
|---|---|---|
| unmodified | 0 | ✓ |
| runner `COPY` of `security-headers.js` removed | 1 | ✓ |
| `COPY` moved to a later non-runner stage | 1 | ✓ |
| `security-headers.js` itself requires an uncopied `./extra` | **0** | FAIL (not recursive) |
| `` require(`./extra`) `` (template literal) | **0** | FAIL |
| `require(path.join(__dirname, 'extra.js'))` | **0** | FAIL |
| `require.resolve('./extra')`; `fs.readFileSync(__dirname + '/extra.json')` | **0** / **0** | FAIL |
| config renamed to `next.config.mjs` importing `./extra.mjs` | **0** (the config check is skipped entirely) | FAIL (the image build would fail loudly on the old `COPY`, so low) |
| valid multi-line `COPY --from=builder \` continuation | **1** | false positive (fails safe) |
| valid JSON-array `COPY --from=builder ["src", "dest"]` | **1** | false positive (fails safe) |

The log discloses "only `next.config.js`'s own relative requires". The nested-require case is the realistic one: #137
will plausibly move `FRAME_EXEMPTIONS` into its own file.

**Exemption hook.**
- The comment at `security-headers.js:17-18` says "X-Frame-Options is OMITTED for exempt paths". The code sets
  `X-Frame-Options: SAMEORIGIN` (`:48`).
- Modern browsers obey CSP `frame-ancestors` over XFO, so a partner embed works in them. Browsers without
  `frame-ancestors` support would refuse it.
- The test (`security-headers.test.ts:39-47`) asserts only the CSP entry. It does not check the merged result for an
  exempt path (XFO and CSP after the catch-all).
- Latent while the list is empty → N3.

**Claims.**
- "caught before commit": the commit message and log agree, and the shape is pinned by a guard test. ✓
- "runtime load with only the two files": consistent with the live server.
- "Docker unavailable": true. The `COPY` has still never run.

---

## 3. Loop 160 — #349 unknown means unknown (`81276fb`): **HOLDS; one regression**

Probes: `wr/probe160.test.tsx` imports the real `WorkflowRow.tsx`, with fake timers and a stubbed `fetch`.

| # | Probe | Result | Assessment |
|---|---|---|---|
| P1 | Delete status matrix: 500 / 404 / 401 / 429 / 408 / 520 | all "Delete failed — workflow not deleted."; focus on Cancel | 500 kept definite: **correct for this route**. `handleDELETE` has one write as its last statement (`[id]/route.ts:310`), so any throw is pre-commit; `withApiRoute` converts throws to 500. 520 (a Cloudflare-style edge code) is not in `{502,503,504}`, but the edge is not in the repo, so this is unverified, not a defect |
| P1 | Archive matrix: 500 / 401 / 404 / 409 / 520 | shows the server's `error` string ("Internal server error", "Unauthorized", "Workflow not found", "Workflow is deleted"); focus on Cancel | definite and true. "Unauthorized" is raw and not actionable (pre-existing; N2 item 2) |
| P2 | rejected fetch (`TypeError`) | "Delete status unknown — refresh the page to check."; focus on Close | ✓ |
| P3 | A delete and B archive both busy; A gets 502, then B gets 200 | region stays "Archiving workflow…" after A's settle; then "Workflow archived."; A's focus on Close | ✓ owner scoping works |
| P4 | A times out while B (started later) is busy | region "Archiving workflow…" | ✓ (the MR-065 P4 bug is fixed) |
| **P5** | **A's row leaves the list mid-flight** | region **"Deleting workflow…"** (owner 16), unchanged 20 s later; cleared only when another row next announces | **regression vs MR-065 P3** (which measured `""`). The `catch` returns on `controller.signal.aborted`, and the unmount cleanup aborts but never calls `clearStatus(owner)`. Stale text is not re-announced, but a screen-reader user who reaches the region reads a busy state that will never end. N2 item 1 |
| P6 | Close after unknown | focus on Close, then on the row's "Actions for …" trigger | ✓ |
| P7 | Escape after unknown (delete and archive) | confirm closes; focus on the trigger | ✓ |
| P8 | two definite failures in a row | focus returns to Cancel both times; 2 fetches | ✓ |

**Owner counter.**
- `nextStatusOwner` is module-level and monotonic, so ids never collide across remounts within a page.
- On SSR the counter increments on the server, but the owner is never rendered, so there is no hydration mismatch.
- React 18 StrictMode may assign two ids to one instance in dev. Harmless, because only uniqueness matters.

**Claims.**
- "Other non-2xx keep definite copy (400, 401, 403, 404, 409, 429, 500)": holds.
- "Delete on 404 … arguably untrue": disclosed; DELETE returns ok for an already-deleted row, so 404 means not owned
  or hard-purged. Low.
- "Focus still falls to `<body>` while busy": disclosed.
- One existing timeout-test assertion was flipped to the unknown copy. That is a deliberate semantic change, named in
  the commit. ✓

---

## 4. Loop 161 — #94 the plan on every page (`710b95c`): **HOLDS as written; two consequences untested**

**Diff vs log:** matches.
- `useAnalyticsPlan` reads `useAccount()` (shared cache with `TrialStatusChip`) and sets the side-channel when the plan
  is a non-empty string.
- Its cleanup sets `undefined`.
- `AppShell` mounts it, and `DashboardV2Shell` no longer calls the setter.
- The only remaining caller is the hook.

**What holds:**
- No new request (`TrialStatusChip.tsx:29` already uses `useAccount`).
- Events are never queued or blocked; `'unknown'` is used until the plan resolves.
- Only `user.plan` (a tier string) is published. ✓ PII-free.
- Webhook-lag staleness is disclosed in the hook header.
- The stale comment at `api/workflows/route.ts:833` ("Allows DashboardV2Shell to call setUserPlanForAnalytics()") is
  disclosed as harmless. It is folded into N1 so it does not outlive the fix.

**Layout coverage.**
- `(app)/layout.tsx` wraps every `(app)` page in `AppShell`.
- `(app)/admin/operations/layout.tsx` claims to "override the (app) AppShell wrapper". App Router nests layouts; a
  child cannot remove its parent's. `AppShell` has no pathname skip for admin, so `/admin/operations` **is** inside
  `AppShell` and does get the plan.
- Its `layout.test.tsx` tests the child layout alone, so it passes regardless.
- This is a stale-intent comment, outside #94's scope. Filed as N4 (7) so the admin "full-width" intent gets a decision.

**Pages outside `(app)`:**
- `(public)` pages that emit events: `PricingCards`/`UpgradeButton`, `PublicNav`, `share/[token]`, login, signup, SEO
  views, `TrackedLink`, `ExtensionInstallButton`.
- For logged-out visitors `'unknown'` is correct.
- For **signed-in visitors arriving by client navigation**, the plan was present before loop 161 and is now
  `'unknown'`. The hook's unmount cleanup runs when `(app)/layout` unmounts on a group change. (The root layout is the
  only `<html>`, so this is a soft navigation.)
- Client links from `(app)` to public pages exist: `/pricing` (`upload/page.tsx:206,288`), `/install`
  (`FirstRunTutorial.tsx:117`, `WorkflowList.tsx:869`), `/docs` (`AppShell.tsx:90` and 6 pages).
- The cleanup's stated purpose, not leaving a user's plan behind, is already served by `signOut({ callbackUrl })`
  (`AppShell.tsx:97`), which is a full navigation.

**The dashboard view race.**
- Before: `fetchWorkflows` set the plan synchronously, then the `isLoading` effect emitted `dashboard_v2_viewed`, so
  the view always carried the plan.
- Now `/api/account` (`auth` + `findUnique` + `buildFeatureFlagsWithUsage`) and `/api/workflows` start in the same
  commit. Whichever resolves first decides whether the view is `'unknown'`.
- `/api/workflows` is cheapest for users with few or no workflows, exactly the first-run cohort the #57 free-tier
  reading segments.
- I could not measure the race without a database. It is ordering-dependent where it used to be deterministic.

**Admin semantics.**
- Admin-unlimited accounts now report `'enterprise'` (`feature-gating.ts:426`), where the workflows route reported
  their effective plan (`route.ts:333`).
- Disclosed. With no self-serve Enterprise customers this mostly relabels admin traffic, which is arguably useful.
- But `/api/account` and `/api/workflows` should agree on one plan semantics. That is the clean way to restore a second
  same-valued writer (N1 item 2).

**Pre-hook events.** Child effects run before `AppShell`'s, and the account fetch is async in any case. Events fired on
mount are `'unknown'` unless the cache is warm. Disclosed in `analytics.ts:855-862`. ✓

---

## 5. Governance

**Selection.**
- 159 `burn-down` #350 (12) and 160 `burn-down` #349 (10): MR-065's sequence exactly.
- 161: `ceiling-cool-off: invoked` → `top-score` #94 (12), MR-065's endorsed use of the charge.
- **Cool-off accounting verified:**
  - consumed at 149;
  - re-armed 3/3 by 150-152 (burn-downs);
  - unspent 153-160 (it does not stack);
  - invoked at 161 → **0/3**.
  - The next three counted `burn-down` loops (162-164) re-arm it.
  - Correct.
- Caveat: "#94 is the top non-blocked row" was a tie with 14 rows (§6), so the cool-off produced weaker
  formula-validation evidence than claimed. It was not wrong.

**Agents / Area.**
- Last 6: 156 FE, 157 FE, 158 QA, 159 security + devops, 160 FE, 161 FE (the row named `analytics`; that agent cannot
  run tests; disclosed).
- Areas: trust, a11y, tooling, security, a11y, analytics. No saturation trip.
- **Tooling share fell to 1 of the last 6** (it was 5 of 9 at MR-065).
- D-4 clause 1 correctly did not fire (160: 2 strings removed, 0 added).

**Ratio, loops 152-161.**

| | Count | Source |
|---|---|---|
| Closed | 10 | #325, #343, #342, #344, #324, #336, #345, #350, #349, #94 |
| Created | 9 | MR-063 #342-#344; MR-064 #345, #346; loop 156 #347; MR-065 #348-#350 |
| Ratio | **1.11** | passes ≥ 0.5 |

- 9 of 10 closures were MR-filed. The exception is #94, a PIB audit row, the first non-review closure since #122.
- Pool: 113 at the MR-065 record → **110** (validator).

**Product value.**
- 159: production clickjacking exposure, pending the edge check.
- 160: the truthful-outcome promise of #336, now true on gateway errors, plus focus.
- 161: plan segmentation app-wide, with the regressions in N1.
- **Three consecutive non-tooling loops**, the longest run since 146.

**D-1.** The last extension touch is still `871e29a` (118 loops at 161), logged "user-ack outstanding" every loop.
Unchanged; CEO item 21.

**Recording practice.**
- MR-065 asked for two things: the guard runner after the strike, and hand-off rows that enumerate everything.
- 159: guard runner 142/142 recorded ✓.
- 160: "validator and guard runner run after recording" ✓.
- **161: the validation list names web-app, root and typecheck only. No guard runner or validator line.** One slip; it
  passes at HEAD (verified above).
- Disclosure quality is high in all three. Every residue I found in 160, and two of the four in 161 (admin
  `'enterprise'`, the stale comment), were already in the log's Limits. The route-group clearing and the view race were
  not.

**Cadence observation.** The three loops landed 5-6 minutes apart, 22:06, 22:11, 22:17. Quality held this window, but
the 161 gaps are of the kind a dashboard-view test would have caught. **Practice, no rule:** when a loop moves an
analytics side-channel or emitter, test the event the metric depends on (here `dashboard_v2_viewed`), not only
convenient ones.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 15]`. **Unblocked**: every suite green at `710b95c`. The push runs the first image build containing the #350 `COPY`, so watch it |
| 2 | Last CI | `a14c5e8` (loop 151) run `37088974348` success, 2026-10-03 02:12Z. Loops 152-161 have never run on GitHub |
| 4 | Alerts | scheduled "Alerts check" still **fails** (`37079356379`, `37053616721`) |
| 19 | Path E direction | open. §6 shows it now blocks 8 more rows that read as pickable |
| 21 | D-1 | open (118 loops) |
| 22 | TanStack / BullMQ | open. #149 assumes BullMQ |
| #347 | plan-table library rows | open |
| #350 part 3 | read production response headers once | open. Ready to run after the push; the command is in the loop-159 log |

---

## 6. Part C — top non-blocked rows re-checked

**Selection:** unstruck rows above the historical anchor, with status not matching `blocked|awaiting CEO|parked`, sorted
by the bold total. Excluded as known-malformed cells: #223 (true 8), #110 (MR-065 → 8, unapplied), #157 (MR-065 → 7,
unapplied), #127 and #152 (unreadable). **15 rows list 12** (#94 was the 16th). Checked at `710b95c`:

| Row | Listed | Verdict | Evidence |
|---|---|---|---|
| #91 PIB-P05 Postgres trigger ADR | 12 | **re-status → blocked (Path C R+1 not opened)** | `docs/features/INFRASTRUCTURE_DECISIONS.md` absent: true. Value exists only before an R+1 that has no date; same class as #90 at MR-065 |
| #116 PRICING-P06 pricing-page analytics | 12 | **keep; re-scope to the P1 foundation** | `pricing_page_viewed` and `pricing_tier_selected`: 0 hits in `analytics.ts`: true. Drop the admin Billing section (overlaps #151/#175) and P3. Its `userPlan` field needs N1 item 1 first. **True top after this table** |
| #127, #128, #130, #131, #136 (PATHE-P11/12/14/15/20) | 12 | **re-status → blocked (CEO item 19)** | no `ProcessMapSidePanel`/`VariantExplorer`; 2 `process_map_*` hits in `analytics.ts` vs 12 specified. Same class as #124/#125/#129 at MR-065. **#132, #133, #134 (11) likewise** |
| #146 TEAM-P08 gate removal + E2E | 12 | **re-status → blocked (CEO)** | `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` still at `checkout/route.ts:67`. Lifting a billing gate is a business decision and depends on #347 |
| #149 ADMIN-P03 snapshot + BullMQ job | 12 | **re-status → blocked (CEO item 22)** | no `bullmq` in any `package.json` |
| #151 ADMIN-P05 admin UI expansion | 12 | **re-status → blocked** | depends on ADMIN-P04 (#150, re-scoped to 6) and #149's snapshots |
| #159, #160 account-page user management | 12 | **re-scope → 6** | invite, roles, pending invites and members already ship at `(app)/teams/[id]/page.tsx:47-86`. The residual is an account-page entry point (CEO directive 2026-05-23), not two 180-LOC builds |
| #169 PR-9 extend-trial endpoint | 12 | **re-status → blocked (prerequisite ADR)** | `ADR-ADMIN-AUDIT` exists only as a table row in `ADMIN_DASHBOARD_REVIEW_002.md:104`, with no ADR file. The row names `trialEndsAt`; the schema has `reverseTrialEndsAt` (`schema.prisma:54`). Re-scope when unblocked |
| #212 MR-024 P-5 | 11 | **re-status → awaiting CEO** | its own text says P-5 is "deliberately NOT self-approved" |

**Effective top 10 after these verdicts** (non-blocked, by listed score):

| Rank | Row | Score | Still true? |
|---|---|---|---|
| 1 | #116 pricing-page analytics (P1) | 12 | yes (above) |
| 2 | #85 API envelope `{data, error, meta}` | 11 | yes: `/api/workflows` returns a bare object (`route.ts:797`) |
| 3 | #103 time-range persistence v2 | 11 | yes: `defaultTimeRange` 0 hits in `lib/` or `api/` |
| 4 | #105 ColumnPicker/PresetChipRail/SavedView axe | 11 | yes: no ColumnPicker, PresetChipRail or SavedView in `e2e/app/dashboard/v2-a11y.spec.ts` |
| 5 | #113 pricing table semantics (MR-065 re-scope) | 11 | yes: no `scope`, no `<caption>`, row labels are `<td>` (`pricing/page.tsx:297`), "—" has no text alternative (`:114`), svg `aria-label` without `role="img"` (`:111`). Category rows are already `<td colSpan>` (`:284`), so drop that item |
| 6 | #137 embed iframe map | 11 | yes; now unblocked by #350's hook (do it with N3) |
| 7 | #96 category noun unification | 11 | not re-checked; needs a growth consult |
| 8 | #106 workflow detail slide-in | 11 | not re-checked; large (E4) |
| 9 | #114, #142, #145, #174, #175 | 11 | not re-checked (TEAM/ADMIN chains; several depend on blocked rows) |
| 10 | follow-ups at 10: #290, #249, #251, #252, #299, #307, #309, #329, #346, #278 | 10 | #290 re-verified: `lib/auth.ts:47-48` returns before `compare` for unknown users |

Record all verdicts as **MR-066 triage** (no ratio credit). Open stays 110 (re-statuses, no strikes).

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Loop 161 dropped the plan from signed-in public-page events and made the dashboard view race for it.** MR-066 §4. (1) `useAnalyticsPlan` clears the side-channel on unmount; a client navigation from any `(app)` page to a `(public)` one (e.g. `upload/page.tsx:206` Link to `/pricing`) unmounts `AppShell`, so `upgrade_clicked` and `checkout_started` on the pricing page (`UpgradeButton.tsx:47,61`) now carry 'unknown' where they carried the plan before loop 161. Do not clear on unmount; clear when the session user changes (sign-out is already a full navigation, `AppShell.tsx:97`). (2) `dashboard_v2_viewed` used to fire strictly after the dashboard set the plan; it now depends on `/api/account` beating `/api/workflows`, which is least likely for the 0-workflow first-run cohort that #57 reads. Make `/api/workflows` stats report the same plan semantics as `/api/account` (admin-unlimited reads 'enterprise', `feature-gating.ts:426` vs `route.ts:333`), then let the dashboard set the plan only when the side-channel is still empty, so there is one value and two sources. (3) Tests: `dashboard_v2_viewed` carries the plan when `/api/workflows` resolves first; a public-page event after an `(app)` to `(public)` navigation carries the plan; sign-out clears it. (4) Update the stale comment at `api/workflows/route.ts:833`. (5) After the push, read the 'unknown' share of `dashboard_v2_viewed` and `upgrade_clicked` for one week and record it. | fix | analytics | `frontend-engineer` (with `analytics` constraints) | 3 | 4 | 3 | 4 | 2 | 1 | **11** |
| **N2** | **A delete or archive whose row leaves the list mid-flight leaves "Deleting workflow…" in the status region for good; archive shows a raw "Unauthorized".** MR-066 §3 P5. (1) The unmount cleanup in `useConfirmRequest` aborts but never calls `clearStatus(owner)`, and the `catch` returns on `signal.aborted`, so the shared region keeps the busy text until another row announces (MR-065 measured an empty region before loop 160). Clear the owner's message in the unmount cleanup. (2) Archive surfaces the server's `error` verbatim; a 401 reads "Unauthorized". Map 401 to "Session expired — sign in again." for delete and archive, keeping "not archived" or "not deleted" (a 401 is definite). Testing Library tests for both. | fix | web-app / a11y | `frontend-engineer` | 2 | 3 | 1 | 4 | 1 | 1 | **8** |
| **N3** | **The Docker runner guard checks only `next.config.js`'s own literal requires, and the frame-exemption hook contradicts its comment.** MR-066 §2. (1) Follow relative requires transitively from `next.config.js` (a require inside `security-headers.js` passes today); fail on any non-literal `require`, `import()` or `require.resolve` argument and on `fs` reads in those files, so they cannot be silently missed; treat `next.config.mjs` like `.js`. (2) Parse multi-line `\` continuations and JSON-array `COPY` (both currently false-fail). (3) `security-headers.js:17-18` says X-Frame-Options is omitted for exempt paths, but `:48` sets `SAMEORIGIN`, which blocks a partner embed in browsers without `frame-ancestors`: make code and comment agree and test the merged headers for an exempt path, not only its CSP entry. A tamper test per item. **Do with #137, not before.** | fix | ci / security | `devops-engineer` | 2 | 3 | 2 | 4 | 1 | 1 | **9** |
| **N4** | **The admin operations layout says it removes the app shell, but App Router cannot do that.** MR-066 §4. `(app)/admin/operations/layout.tsx:2-9` claims to override `(app)/layout.tsx`'s `AppShell`; nested layouts compose, and `AppShell` has no admin path skip, so `/admin/operations` renders inside the sidebar shell. `layout.test.tsx` tests the child layout alone and passes regardless. Decide the intent: either move the route to a group without `AppShell` (keep `useAnalyticsPlan` coverage there explicitly) or delete the claim and the tautological test. | fix | admin / web-app | `frontend-engineer` | 1 | 3 | 1 | 4 | 1 | 1 | **7** |

**Annotations recommended:**
- **#94 closure note:** "[MR-066: holds as written. Clearing on unmount drops the plan on public pages reached by
  client navigation, and `dashboard_v2_viewed` now races `/api/account`. See N1.]"
- **#349 closure note:** "[MR-066: holds; a mid-flight unmount now leaves the busy text in the region. See N2.]"
- **#350 closure note:** "[MR-066: all four headers are verified on a live `next start` across pages, API, 4xx/5xx,
  static files and middleware redirects; config 308s carry none (harmless). The guard is not transitive; the exemption
  hook comment contradicts the code. See N3.]"
- **§6 verdicts** applied as MR-066 triage.

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §4 plan cleared on `(app)` → `(public)` navigation; dashboard view race; stale route comment; plan semantics differ | N1 |
| §3 P5 stale busy text; raw "Unauthorized" | N2 |
| §2 guard non-transitive and literal-only; COPY false positives; XFO comment vs code | N3 (with #137) |
| §4 admin layout claim vs App Router nesting | N4 |
| §2 config 308s carry no headers | none (Next behaviour; harmless) |
| §5 loop 161 omitted the guard-runner/validator line | practice (§5) |
| §6 15 rows listed 12 but blocked or superseded | MR-066 triage |
| MR-065 §5 "#94 is the top" was a tie | this note; no row |

---

## 9. Loop 162-164 picks

**Before 162: push** (CEO item 1), then watch the image build and run the #350 part-3 header check.

The pool is 110 > 8, so `burn-down`. The cool-off is at 0/3; 162-164 as burn-downs re-arm it to 3/3.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **162** | **N1** plan on public pages + deterministic dashboard view | **11** | `burn-down` (MR-066-filed) | `frontend-engineer` (analytics constraints) | analytics | repairs a measurement regression in the window it was made. Prerequisite for #116's `userPlan` field. Small (E2) |
| **163** | **#290** items (2) + (4): login and forgot-password timing oracles | **10** | `burn-down` | `security-reviewer` | security / auth | re-verified true (`lib/auth.ts:47-48`; forgot-password awaits `sendEmail` only for existing accounts). A user-protecting fix that rotates the area |
| **164** | **#249** deliver the bounce synchronously at `pagehide` | **10** | `burn-down` | `frontend-engineer` | web-app / analytics | completes the #57 bounce signal after N1 completes its plan. The premise needs a real-phone check (CEO), but the fix does not depend on it |

- **Alternatives:**
  - 164: #309 (a11y, 10).
  - N2 (8), a quick a11y residue.
- **Not burn-down-eligible but next by score:** #116 (12) once N1 lands. It is the natural first spend of the
  re-armed cool-off at 165+.
- **Area check:** analytics → security → analytics/web. No 3-in-a-row trip. Agents rotate at 163.
- **Do not pick:** N3 before #137; #348 (parked); any row §6 re-statuses as blocked.
- **Then MR-067** (base cadence after 164).

---

## 10. CEO decisions

| # | Decision | Status | Unblocks |
|---|---|---|---|
| 1 | **Push** | 15 commits local; all suites green | first CI run and image build of loops 152-161 |
| #350 part 3 | read production headers once (loop-159 log command) | ready after the push | clickjacking verdict; HSTS at the edge |
| 4 | Enable alerts | still failing | alerting |
| 19 | Path E direction | open; blocks #124-#138 and #340, now 8 more by §6 | Path E rows |
| 21 | D-1: suspend formally or resume the ack | open (118 loops) | honest control plane |
| 22 | TanStack and BullMQ listed but not installed | open | #138, #149 |
| #347 | plan-table library rows | open | trust copy; #146 |
| new | #146: when to lift the Team/Growth checkout gate | open | TEAM-P08 |
| new | #159/#160: is the `/teams/[id]` page the user-management surface, or must it move to `/account` (2026-05-23 directive)? | open | re-scope to an entry point |

---

## 11. Verdict

Every count reproduces at `710b95c`: root 6177, web-app 4322, typecheck 0, validator clean (open 110), guard runner
142/142, Docker guard 0. MR-065's red suite is fixed.

- **Loop 159 holds, verified on a live server.** Its guard is narrower than its message, and its exemption comment
  disagrees with its code. Both are latent until #137.
- **Loop 160 holds.** Every MR-065 residue is fixed; a mid-flight unmount now leaves stale busy text.
- **Loop 161 holds as written.** It drops the plan on public-page funnel events and makes the dashboard view race for
  it. Fix that next, while the change is fresh.

Three consecutive user-facing loops is the best run in 15. The score table had a 15-way tie at 12 hiding behind
MR-065's "#94 at 12"; §6 re-statuses most of it, leaving #116 as the real next feature row. Push now.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json   # tests=142 real_pass=142 fail=0
node scripts/validate-backlog.mjs                                               # exit 0, open 110
# live headers: existing loop-159 .next build
(cd apps/web-app && NEXTAUTH_SECRET=… NEXTAUTH_URL=http://localhost:3917 DATABASE_URL=file:$S/none.db \
   node_modules/.bin/next start -p 3917) &
node $S/probe.mjs <chunk.js> dashboard.html          # 26 requests; only /demo and /docs.html (308) lack headers
node $S/guard-tamper.mjs $S                          # nested/template/path.join/require.resolve/fs/.mjs → exit 0
cd $S/wr && node <repo>/node_modules/vitest/vitest.mjs run --config vitest160.config.mjs   # P5: region "Deleting workflow…" after unmount
grep -n "return () => setUserPlanForAnalytics(undefined)" apps/web-app/src/hooks/useAnalyticsPlan.ts   # :52
grep -n 'Link href="/pricing"' "apps/web-app/src/app/(app)/upload/page.tsx"                           # :206, :288
git status -sb                                                                                          # ahead 15
```
