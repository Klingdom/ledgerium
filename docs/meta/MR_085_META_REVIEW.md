# MR-085 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 216-218, 2026-10-04 03:55 → 04:40 (−0600). Commits `b531777` (loop 216, #418), `d28e9e3` (loop 217,
#251), `38edcf6` (loop 218, #329). Previous review MR-084 at `78dbff3`. Rows closed: #418, #251, #329. Rows filed by
loops: #422 (loop 218). Rows amended: none. Rows promoted: none.
**Why now:** base cadence, 3 of 3 since MR-084 (`ITERATION_LOG.md`, loop 218 Controls).
**Date:** 2026-10-04
**Scope constraint honoured:** no product code changed by this review. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md`, the agent files or the design notes.
No commit, no `git add`. Every row, strike, re-score, annotation and doc change below is a recommendation for the
coordinator.
Declared exceptions to "no repo file touched", as at MR-075…084: mutants that only the repo's own tests can judge were
applied **in place** one at a time and restored in a `finally` block, with the sha256 of every mutated file compared
before the first and after the last mutant (identical in every run): `lib/analytics-delivery.ts` (11 unit mutants + control;
3 e2e mutants + control; 1 real-navigation mutant), `lib/analytics.ts` (4 unit mutants; 1 e2e mutant),
`app/(public)/docs/page.tsx` (2 e2e mutants + control), `app/(public)/about/page.tsx` (1 e2e mutant),
`public/samples/workflow-sample.html` and the repo-root `index.html` (1 scan mutant each + control). The probes wrote
analytics rows into the e2e test database (`prisma/test.db`, ignored) and toggled the seeded user's lens; every later
Playwright run reseeds it. The probes and the e2e mutants ran against one dev server I started on 3098 with the exact
`webServer` environment of `playwright.config.ts`, after the deploy gate had finished; I stopped it at the end. Scratch
went only to `…/scratchpad/`. Files:
- `qg085.sh` (the quality gate, then `test:e2e` one project at a time), outputs `install085.txt`, `val085.txt`,
  `guard085.txt`, `other085.txt`, `root085.txt`, `web085.txt`, `tc085.txt`, `e2e085public.txt`, `e2e085api.txt`,
  `e2e085authenticated.txt`, `port_before_*.txt`, `port_after.txt`; `status_before085.txt`;
- `devserver.sh` (MR-078's), log `devserver085.log`; `flaky085_bounce_{1,2,3}.txt`, `flaky085_a11y_{1,2}.txt`;
- `mut085/mut.mjs` (`unit-results.txt`, `scan-results.txt`), `mut085/e2emut.mjs` (`e2e-a11y-results.txt`,
  `e2e-bounce-results.txt`), `mut085/realnav.mjs` (→ `probe085b3.raw.txt`);
- `probe085.config.ts` (the repo's global setup and auth setup, testDir in scratch) with `probe085a.spec.ts` (the 18
  department and industry pages and two pages of every other dynamic template, both themes) → `probe085a.raw.txt`;
  `probe085b.spec.ts` (real navigations, requeue in the browser) → `probe085b.raw.txt`, `probe085b2.raw.txt`;
  `probe085c.spec.ts` (every sitemap URL, dark) → `probe085c.raw.txt`; `probe085d.spec.ts` (/pricing nodes by region) →
  `probe085d.raw.txt`; `dbcount.cjs` (stored-row counts, the delivery ground truth); `ingest085.mjs` (malformed bodies);
  `oldest085.mjs`.

`git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both pre-existing), apart
from this file. The authenticated project rewrote 12 tracked PNGs under `apps/web-app/public/docs/screenshots/`; they
were restored with `git checkout --` and `git status` shows none. `netstat` shows nothing listening on 3000, 3097 or
3098 before each Playwright project, after the gate, and after stopping the dev server. Playwright ran one project at a
time.

**Validation run for this review (executed, not inferred). Every vitest baseline below exited 0 with no "Errors"
line, checked before any mutation run:**

| Check | Claimed (loop 218 unless noted) | Measured here | Result |
|---|---|---|---|
| root `pnpm exec vitest run` | 6545 | **320 files, 6545 passed, exit 0**, no Errors line | matches |
| `apps/web-app` `pnpm test` | 4777 | **274 files, 4777 passed, exit 0**, no Errors line | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | "validator 0" | **exit 0**, 415 rows, 292 struck, **open 123** | matches |
| guard runner | 142/142 | **files=6 tests=142 real_pass=142 fail=0** | matches |
| rest of the CI quality gate | not claimed | `check-typecheck-coverage` OK (13 packages), `check-dockerfile-workspace` OK | green |
| `pnpm install --frozen-lockfile --offline` (CI's install) | not claimed | **exit 0**, "Done in 2.6s", no resolution | green |
| e2e `public` (whole project) | 183 (216, 217) | **183 passed (9.0 min)** | matches |
| e2e `api` (whole project) | not claimed | **14 passed (19.7 s)** | green |
| e2e `authenticated` (whole project) | 217 + 2 skipped (217) | **217 passed, 2 skipped (10.9 min)** | matches |
| deltas | web 4769→4769→4777→4777; root 6537→6545→6545; public 146→183; authenticated 215→217 | 216 +37 e2e, 217 +8 unit +2 e2e, 218 0 net unit (test widened) | consistent |

The deploy gate is green at `38edcf6`: quality gate, then `test:e2e` **public 183, api 14, authenticated 217 + 2
skipped**. No flaky or retried test (local retries are 1; none used). The `batch rejected SyntaxError` teardown log now
appears **twice** in the authenticated run (around the bounce spec), once before; see §3.4.

Pool arithmetic: MR-084 recorded 125 after its rows. Loops 216-218 struck three (#418, #251, #329) and filed one
(#422): **123**. Matches the validator.

**Not run:** CI (nothing pushed since loop 151), the `e2e-extension` deploy-gate job (zero commits under the extension
surfaces since `871e29a`; inferred green, not run), Firefox/WebKit, a production build (dev server only), a real screen
reader, iOS Safari or Chrome on Android (the browsers whose page-exit behaviour #251 exists for; §3 uses desktop
Chromium navigations), production latency or field data, the live site (no `curl`). FAQ answer panels on the
department and industry pages are collapsed (`hidden`) when axe runs, so their expanded state is not scanned.

---

## 1. Lead

1. **The three loops hold, and the push stays rollback-safe (§5).** No Prisma, API-route or stored-format change in
   `78dbff3..38edcf6`; 217 changes only the order and size of client requests to an unchanged endpoint.
2. **Loop 216's scan catches a regression on any of the 37 routes (§2).** A low-contrast line added to /about fails it,
   as do the old /docs button and links. Light is untouched. It costs 2.3 min locally.
3. **Loop 217 delivers the bounce in a real navigation, and the old code did not (§3).** With 150 buffered events and a
   real `page.goto` (no synthetic `pagehide`), the stored-row count shows the bounce arriving 15 of 15 times across five
   cases; the pre-217 delivery, put back as a mutant, loses it 4 of 4 times at 150 events. Requeue-once works in the
   browser. Two unit survivors (§3.3).
4. **The ingest route logs every malformed body as an error with a stack and answers 200 (§3.4).** The teardown log is
   an empty body; an aborted one logs a different error. **N1 (8).**
5. **Loop 218's 18 pages render, carry the new answers, fit 320 px and are axe-clean in both themes (§4).** The
   general-practice text is standard and hedged; "no AI model runs in Ledgerium" is true (no model SDK, key or provider
   call anywhere in the workspace). The sentence "records how the work is actually done" overreaches the browser-only
   capture, and the healthcare "no PHI" claim appears six times and is in production: **#422 → 11**.
6. **All 196 sitemap URLs pass dark axe and 320 px today; CI checks 37 of them (§4.3).** N2 (9).
7. **The CHANGELOG is now written every loop, but the catch-up entry overclaims in three places (§6).** Literal
   corrections in §9.
8. **Loop 218 read the saturation rule differently from MR-084 and loops 214-215 (§6).** The outcome was a tie and is
   fine; the coordinator file should pin one reading (§9).

---

## 2. Loop 216 — #418 every public page is scanned in the dark theme (`b531777`): **HOLDS**

**Diff vs log:** matches (shared `e2e/helpers/public-routes.ts`; one dark full-page axe test per route; /docs button
`bg-brand-500` → `bg-brand-700`; 8 /docs links and 3 /terms links underlined; no other page changed).

**Does it catch a regression on a route?** In-place mutants judged by the dark scan (`e2e-a11y-results.txt`, dev
server reused, `--retries=0`):

| Mutant | Observed | Verdict |
|---|---|---|
| E0 control (/docs, /about, /terms) | 3 passed | clean |
| E1 /docs button back to `bg-brand-500` | /docs fails | killed |
| E2 /docs links back to `hover:underline` | /docs fails | killed |
| E3 /about gains a `#3a3a3a` paragraph | /about fails | **killed: a page the loop never touched is guarded** |

**Light untouched.** The diff changes no light test; the light scans of / and /pricing are as before; the only light-side
effect is /docs losing one contrast node and its link failure (the log's spot check).

**Flakiness:** the 39 full-page tests (37 + / and /pricing), `--retries=0`, twice: **39/39, 39/39 (1.7 min each, warm)**.

**Runtime.** The public project went from 146 tests in 6.7 min (MR-084) to 183 in 9.0 min: +2.3 min for the 37
scans. The whole gate is now about **20.2 min locally** (9.0 + 0.3 + 10.9), against `timeout-minutes: 30` in
`e2e-web-app.yml`, where the job runs `test:e2e` (all projects, one job, retries 2). CI has not run the job since loop
151 (11 min 9 s, on a smaller suite), so CI time is not measured; even if CI were no faster than this machine, the margin
is ~10 min before retries. Margin is fine now; when #223 adds the light
loop (another ~2 min) and N2 adds the dynamic templates (~1 min), re-measure, and split the projects into parallel jobs
before the local total passes ~24 min.

**Hover in dark.** The /terms links use `hover:text-brand-700` (#047857), which is dark text on the dark page while
hovered; axe does not scan hover. It is the /privacy class the log names, pre-existing; noted, not filed.

**Limits accuracy.** Accurate (light waits on #223; / and /pricing scanned twice). Not stated: the list excludes every
dynamic route (165 of 196 sitemap URLs), see §4.3.

---

## 3. Loop 217 — #251 the bounce leaves first (`d28e9e3`): **HOLDS; two unit survivors; one server defect (N1)**

**Diff vs log:** matches (`chunkEventsBySize`, `planDelivery`, `requeueFailed` in `analytics-delivery.ts`; terminal event
first and alone; 100 events or 48 KB per request; failed ordinary fetch requeued once per event; recorder counts only
accepted beacons and completed fetches; 2 new e2e).

### 3.1 A real navigation, with the stored row as ground truth

Playwright cannot read a beacon's body, and the page is gone after a navigation, so the probe counts rows in the e2e
database before and after each visit (`dbcount.cjs`). Seeded user, `/dashboard?v2=1`, no click, then a real `page.goto`
away (`probe085b2.raw.txt`; 3 runs each):

| Case | Bounce stored | Backlog stored |
|---|---|---|
| no backlog → /pricing | 3 of 3 | — |
| 150 events (~75 KB) → /pricing | 3 of 3 | 84 of 150 each time |
| 150 events → `about:blank` | 3 of 3 | 84 of 150 |
| 300 events → /pricing | 3 of 3 | 84 of 300 |
| 150 events, `sendBeacon` refused → /pricing | 3 of 3 (keepalive fetch, first request, 1 event) | 84 of 150 |

The same cases with the **pre-217 delivery restored as a mutant** (terminal last, count-only chunks;
`probe085b3.raw.txt`): **150 events: bounce lost 2 of 2; refused: lost 2 of 2**; 300 events: delivered 2 of 2 (the
bounce happens to land in a chunk that fits); backlog stored 99 of 150. So the loop fixes a loss that real navigations
show, not only the synthetic `pagehide`. The order in Chromium is `beforeunload` (drains the backlog as ordinary
beacons; the second is refused and returns to the buffer), then `pagehide` (the bounce first, alone, then the tail by
keepalive fetch, which the quota refuses). The cost is visible: about 15 more backlog events lost per 150 than before
(84 against 99 stored), because chunks are smaller. The log's Limit ("tail chunks can still be refused") is right; it
does not say the tail loss grew. A 150-event backlog is far outside normal use (the buffer flushes at 10).

### 3.2 Requeue-once in the browser

12 events seeded before load, so the view's `track()` schedules a fetch flush; the first two ordinary fetches answered
500, later ones passed through (`probe085b.raw.txt`):

| Fetch | Status | Events | Seeded 12 + view | Later events |
|---|---|---|---|---|
| 1 | 500 | 13 | 13 | — |
| 2 | 500 | 24 | **13 again** (requeued once) | lens 1 + 10 |
| 3 | 200 | 22 | **0** (dropped after the second failure) | lens 1 + 10 (their first retry), lens 2 + 10 |
| 4, 5 | 200 | 11 each | 0 | new |

Buffer empty at the end. Exactly as claimed: once, at the front, no loop. Note that a requeued event waits for the
next flush trigger (another `track()` reaching 10, a hide, or leaving); nothing re-arms the timer.

### 3.3 Mutants

Unit (`unit-results.txt`, judged by `analytics-terminal.test.ts` and `analytics-delivery.test.ts`, 41 tests):

| Mutant | Observed | Verdict |
|---|---|---|
| D0 control | 41 passed | clean |
| D1 no byte bound / D2 no count bound | 3 fail each | killed |
| D3 envelope bytes not counted / D4 `>=` on the byte bound | pass | near-equivalent (13 bytes; a boundary) |
| **D5** size measured in characters, not UTF-8 bytes | passes | **survived** (no test has non-ASCII payloads) |
| D6 terminal last / D7 terminal also in the tail | 9 / 14 fail | killed |
| D8 requeue at the back / D9 requeue forever / D10 no cap on requeue | 1 / 3 / 1 fail | killed |
| **D11** the cap on requeue drops the newest, not the oldest | passes | **survived** (the docstring says oldest) |
| A1 non-2xx not requeued / A2 rejection not requeued / A3 a terminal failure requeued | 1 fails each | killed |
| A4 the shell never sends terminal-first | 9 fail | killed |

e2e (`e2e-bounce-results.txt`, the bounce spec): control 6 passed; terminal last, the full pre-217 delivery and the shell
never terminal-first each fail the 75 KB test; no byte bound alone passes the e2e (killed by the unit file). The spec
passed **6/6 three times** at `--retries=0` (16-19 s).

D5 and D11 are small: payloads are PII-stripped and mostly ASCII, and the buffer reaches 500 only after a long outage.
Recorded in the closure note; no row.

### 3.4 The "Unexpected end of JSON input" log

Measured against the dev server (`ingest085.mjs`): an **empty body**, a truncated body and `hello` each log
`[analytics:persist] batch rejected SyntaxError …` with a stack at error level and answer **200** `{ok:false}`; a body
**aborted mid-stream** logs a different error, `Error: request body unreadable`. So the teardown line is an empty body
(most likely a keepalive or beacon cut off when Playwright closes the context; inferred from the message, not traced),
not the aborted read; both lines in this run sit at the bounce spec, which has two more page exits since loop 217. Is it a product defect? **Yes, a small one:** the
endpoint is anonymous, so any client can write an error-level log line with a stack per request (bounded only by the
ingest rate limit), and the project's API rule is to validate input and answer the contract, not 200. The client never
sends malformed JSON, so a 400 costs nothing (an ordinary fetch would requeue once, a beacon ignores status). **N1 (8).**

**Step 7.** 217 changed `lib/analytics.ts` and `lib/analytics-delivery.ts` and ran both whole projects (183, 217) ✓.

**Limits accuracy.** Accurate (tail can be refused; synthetic `pagehide` in the 75 KB test). Not stated: the tail loss
grows slightly, and requeued events wait for the next trigger.

---

## 4. Loop 218 — #329 department and industry answers answer the question (`38edcf6`): **HOLDS; #422 → 11**

**Diff vs log:** matches (18 answers replaced, `updatedAt` bumped on 18 pages, claims scan widened to
`public/samples/*.html` (6) and root `*.html` (16) with membership assertions).

### 4.1 The 18 pages, rendered (`probe085a.raw.txt`)

| Check | Dark | Light |
|---|---|---|
| status | 18 × 200 | 18 × 200 |
| new answer in the page HTML (FAQ panel; on /departments/finance also checked in the FAQPage JSON-LD) | 18 of 18 | 18 of 18 |
| old phrase "Ledgerium measures where AI could fit" | 0 | 0 |
| width at 320 px (scrollWidth / innerWidth) | 320/320 on all 18 | 320/320 on all 18 |
| axe critical/serious | **0 on all 18** | **0 on all 18** |

The answer sits in a collapsed FAQ panel (`dd hidden` until opened), as do the other answers; axe scans it collapsed.

### 4.2 Are the claims true?

- **General practice.** Each answer lists the standard high-volume, rule-driven uses for that function (invoice matching,
  ticket triage, KYC extraction, first-pass contract review…) and says who keeps the judgment ("usually stay with
  people"). Hedged ("typically", "usually"), no statistics, no outcome promises. Healthcare adds "any tool touching
  patient data needs your own compliance review". Not overclaiming.
- **"scores how ready each recorded … workflow is for AI, from step count, run time and number of systems."** True:
  `computeAiOpportunityScore` (`workflow-metrics.ts:525`) uses `stepCount`, `durationMs` and `toolsUsed.length` plus a
  bonus from the same two inputs; per workflow, as the log says.
- **"The scoring is rule-based; no AI model runs in Ledgerium."** True at `38edcf6`: no `@anthropic-ai`, `openai`,
  `@ai-sdk`, Google generative, Ollama, ONNX or transformers import in any `package.json`, `apps/*/src` or
  `packages/*/src`; no `ANTHROPIC`/`OPENAI` key read; `pnpm-lock.yaml` has neither SDK. "Ask this process" is documented
  and built as NO-LLM (`lib/ask-this-process/index.ts`). The claim depends on that staying true; the #313 tripwire
  covers authorship copy, not the dependency list.
- **"Ledgerium records how the work is actually done"** (all 18) is broader than the product: capture is a Chrome
  extension and sees browser work only. Same class as #422 item (5); appended there.
- **Healthcare "no PHI".** The page says it six times (`industry.ts:90` meta description, `:124`, `:126`, `:128`,
  `:131`, and the FAQ at `:142-143` "No. … without exposing PHI"), and this text predates loop 152, so it is **live**.
  The extension records page titles (`getSafePageTitle`), sanitized URLs and element labels (`target_label`,
  `capture.ts:267` and others); in an EHR web app those can carry patient names. "No screenshots, no typed values" is
  checkable; "no PHI" is not. This raises #422: **11** (re-score in §9).

### 4.3 Extended scan coverage

Loop 218's Limit says the `[slug]` pages are rendered by no e2e. The probe swept **every URL in `/sitemap.xml` (196)**
in dark (`probe085c.raw.txt`): **196 × 200, axe clean on all 196, 320 px on all 196**. Two pages of each dynamic template
in light (`probe085a.raw.txt`): clean. So nothing is broken today; but CI's width and axe lists hold the 37 static
routes, and 165 pages under 13 templates (workflow-library 24, use-cases/problems 22, sop-templates 17, personas 16,
software 16, alternatives 15, compare 11, competitors 10, departments 9, industries 9, answers 8, ai-opportunities 8,
blog 4) have no guard. One representative per template keeps the class covered for about a minute. **N2 (9).**

The claims-scan widening works: an "AI-powered" line in `public/samples/workflow-sample.html` and an "AI-generated" line
in the root `index.html` each fail the scan (`scan-results.txt`). Nested HTML (`docs/demo/`, the extension's samples)
is unscanned, as logged; none of it contains a claim today (grep).

**Limits accuracy.** Accurate. Not stated: the pages are measured nowhere, which §4.1 now does once.

---

## 5. Rollback safety and mutation summary

**Rollback (216-218).** `git diff --stat 78dbff3..38edcf6 -- apps/web-app/prisma apps/web-app/src/app/api` is empty.
216 is CSS and tests; 218 is content and a test. 217 changes the client only: the envelope (`{events: [...]}`) and the
server's 100-event and 256 KB limits are unchanged, and a 48 KB chunk is well inside both; within one exit the bounce is
now stored before the backlog rows, and no reader orders by insertion within a visit (the #57 reader counts names).
Code now in production reads everything 217 sends. **Verdict: rollback-safe; the push stays rollback-safe.**

| Target | Mutants | Killed | Survived |
|---|---|---|---|
| `analytics-delivery.ts` / `analytics.ts` vs unit files | 15 + control | 11 | D3, D4 (near-equivalent), D5, D11 |
| delivery vs the bounce e2e | 4 + control | 3 | no byte bound (killed by unit) |
| pre-217 delivery vs a real navigation | 1 | loses the bounce 4 of 4 at 150 events | — |
| /docs, /about vs the dark scan | 3 + control | 3 | — |
| claims scan vs sample and root HTML | 2 + control | 2 | — |

19 of 24 killed (plus one killed elsewhere, two near-equivalent); the real survivors are D5 and D11, both small.

---

## 6. Governance

**Selection.**
- **216** `burn-down` #418 (11), MR-084's first pick, re-scored at pick time (unchanged), `qa-engineer`. ✓
- **217** `burn-down` #251 (10), MR-084's second pick, re-scored (unchanged), `frontend-engineer`. ✓
- **218** `burn-down` #329 (10) instead of MR-084's #309. The log reads the saturation penalty as "the pick would be the
  third in five" (window 214-218 including the candidate): #309 (a11y: 215, 216) and #307 (analytics: 214, 217) take −2.
  MR-084 (§11: "218 a11y 2 of 5 in 213-217, no penalty; a 219 a11y pick takes −2") and loops 214-215 read it as **the five
  loops before the pick**, which is also CLAUDE.md's wording ("3 of last 5 iterations landed"). Under that reading all
  three are 10 and #329 wins a tie on area diversity, so **the outcome is sound and the reasoning used a second rule.**
  Two readings of one penalty make planned picks unpredictable; pin it (§9, one sentence in `coordinator.md`). This
  review uses the literal reading.
- The positioning pick was also right on its merits: the push ships these pages.

**Agents.** `qa-engineer` → `frontend-engineer` → `growth-strategist` (copy, no Bash) + `frontend-engineer` (applied and
tested). D-4 clause 1 satisfied by the primary. Implementer run: frontend at 217 and 218, so 219 should not be a third
frontend-only loop unless 220 rotates (§11 assigns 219 to `qa-engineer` as implementer).

**CHANGELOG practice.** Now followed per loop: 216, 217 and 218 each added a plain, user-level entry marked "not yet
deployed". Accuracy:
- 217 and 218 entries: accurate.
- 216 entry: "**Every public page** is now checked for accessibility in the dark theme." CI checks the 37 static routes;
  165 dynamic pages pass today (§4.3) but are not checked. Correct the wording (§9).
- The MR-084 catch-up entry (loops 150-215), checked claim by claim against code: "View: name" label
  (`DashboardV2Shell.tsx:334`), pricing events (`pricing_page_viewed`, `pricing_tier_selected`), equal login timing
  (`auth.ts:16` dummy hash), bounded rate limiters (`bounded-lru.ts`), framing (`security-headers.test.ts`) all hold.
  Three do not: (a) "covers loops **150-215** … None of it is in production yet": loops 150 and 151 are deployed
  (`origin/main` is `a14c5e8`, loop 151); (b) "the header, **pricing table**, column picker and consent banner meet
  contrast … **in both themes**": in light the comparison table has **7 contrast failures** (group header rows #047857 on
  their tint, 2.71:1; three amber badges, 3.42-3.56:1; `probe085d.raw.txt`), dark is clean; (c) "no longer lost when a
  save … **races another save**": two tabs still overwrite each other (#382, accepted until it lands). Nothing claimed
  is unshipped code; these are scope words. Literal corrections in §9; apply before the push, since this entry is the
  release note.

**Cool-off.** Held at **3/3** since loop 206: twelve counted loops. Every row at 10 or above is a follow-up and
selectable under `burn-down`, so invoking it would pick the same rows; it buys nothing. Hold; do not change the rule
(holding is free, and it exists for the day a non-follow-up row outranks the pool).

**Ratio, loops 209-218** (same method as MR-069…084: review-filed rows count as created):

| | Count | Source |
|---|---|---|
| Closed | 10 | #389 (209), #381 (210), #402 (211), #406 (212), #415 (213), #416 (214), #366 (215), #418 (216), #251 (217), #329 (218) |
| Created | 12 | MR-082 #411-#414, MR-083 #415-#417, MR-084 #418-#421, loop 218 #422 |
| Ratio | **0.83** | above the ≥ 0.5 floor |

**Pool.** 123 open (validator). This review files two rows: **125**. No strike.

**Staleness triage (oldest open, non-blocked; verified at `38edcf6`).** All still true; **keep all, delete none**:
#17 (8; `upload/route.ts:235` and `sync/route.ts:243` each still create the workflow and its rows themselves), #28 (7;
`billing/portal/route.ts:24-25` still a bare 400), #38 (7; `lib/stripe.ts:155`), #39 (6; `UpgradeButton.tsx:94`
`setTimeout` with no cleanup), #43 (9; `computeInsightChips` still takes no stale count, `workflow-metrics.ts:725`), #44
(6; the request moved to `DashboardV2Shell.tsx:428`, still `sort=health_score`, still unmapped by the route's sort switch).
Of MR-084's "not re-checked" 9s, #43 is now checked; #290's text already records items (2) and (4) as done at
`4e4391f`. The others (#396, #371, #359, #356, #326, #294, #287, #260, #237) stay unchecked and are not planned below.

**D-1.** Last extension touch `871e29a`: **175 loops** at 218, zero commits under the extension surfaces since.
Unanswered.

**Step 7 bullets.** 216 changed `e2e/helpers/` and ran the whole public project (183) ✓; 217 changed both analytics
files and ran both whole projects ✓; 218 ran the public a11y, width and static specs (124) ✓ and named the unrendered
`[slug]` pages as a Limit ✓ (MR-079 by naming). MR-080: no stored format changed ✓. **"Undeployed: N loops"** in all
three Controls blocks (65, 66, 67); Extension 173-175. **Primary-file and validation lines** present in all three.
Nineteenth consecutive window.

**MR-084 annotations:** closure notes #415/#416/#366, the #377/#252/#338/#346 re-scores (#338 blocked), the
#307/#309/#329/#251/#223/#411 appends and rows #418-#421 at 11/9/8/9 are applied; the CHANGELOG catch-up was written.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main` **91 ahead** of `origin/main` (`git ls-remote`: `a14c5e8`; 92 once this review is committed); loops 152-218 (**67**) are not in production. The whole deploy gate passes locally; rollback-safe (§5). Apply the CHANGELOG corrections first; nothing else blocks it |
| 2 | Last CI/deploy | `37088974348` (loop 151) success |
| 4 | Scheduled jobs | `Retention purge` (`37194169547`, 10:04Z) and `Alerts check` (`37193513772`, 09:51Z) still fail; `gh secret list` has no `CRON_SECRET`. Nothing is purged |
| 21 | D-1 | ack the freeze, or allow one config-only loop for #29 (175 loops) |
| #399 | Consent scope | unchanged |
| #413 / #278 | PostHog | project region, IP and GeoIP settings, retention; then #411; then the key and a rebuild |
| — | Stored data | share tokens, tag names, system names in `AnalyticsEvent`: delete or redact; rotate live links or not (also gates #137) |
| — | `analytics` agent tooling | still no Bash: add it, or keep it review-only |
| — | Umami | meant to be on? If yes, #393 first |
| — | Path E (#340, item 19) | also blocks #338 |
| — | Healthcare "no PHI" claim | live in production six times (§4.2); #422 is the fix; the CEO may want it softened before or with the push |
| #225, #357, 22 / #347, P-1 | unchanged | |

---

## 7. Patterns

1. **A guard over a list covers the list, and the list is the static half.** 216's scan and the width spec both read
   37 static routes; 165 generated pages share 13 templates that neither reaches. They pass today (§4.3). A route list
   should include one instance of each template, which is how MR-079's "every route in a constant list" was meant.
2. **A synthetic event proves the handler, a real exit proves the delivery.** 217's 75 KB test dispatches `pagehide`
   and so skips `beforeunload`, which is what actually spends the quota first in Chromium. The real navigation agrees
   with the test here, and also shows a cost the test cannot (§3.1).
3. **Scope words in release notes.** "Every", "both themes" and "races" each claimed one step more than was measured.
   The per-loop entries are plain and mostly exact; the summary entry is where words grow.
4. **One rule, two readings.** The saturation penalty was read two ways in four loops; both are defensible, so it needs
   a sentence, not a debate.

---

## 8. Part C — top open non-blocked rows

**Method (as MR-084):** every open row whose status is not blocked, awaiting, parked or CEO-gated, ranked by recorded
score with the re-score of §9 and the new rows; no window or area filter. #157, #127, #152, #159, #160 excluded as
malformed or CEO-gated, as before.

| Rank | Row | Score | Kind | Last checked | Verdict / evidence |
|---|---|---|---|---|---|
| 1 | **#422** department and industry claims | 11 | follow-up | MR-085 | true; re-scored (§4.2) |
| 2 | #307 the #57 page | 10 | follow-up | MR-084 | unchanged since (no commit touches it) |
| 2 | #309 canvases and maps | 10 | follow-up | MR-084 | unchanged since |
| 2 | #81, #84 | 10 | MR-promoted | MR-084 (#81), MR-078 (#84) | unchanged |
| 5 | #419 late answer flips the list | 9 | follow-up | MR-084 | unchanged since; ships with the push |
| 5 | **N2** dynamic templates unguarded | 9 | follow-up | MR-085 | true (§4.3) |
| 5 | #421 picker states untested | 9 | follow-up | MR-084 | unchanged |
| 5 | #377 remainder, #252, #417, #43 | 9 | follow-up | MR-084 / MR-085 (#43) | true |
| 5 | #411 | 9 | follow-up | MR-084 | tied to the CEO's PostHog step |
| 5 | #396, #371, #359, #356, #326, #294, #290, #287, #260, #237 | 9 | follow-up | MR-072 or earlier | not re-checked |
| — | **N1** ingest logs malformed bodies; #420, #223, #382, #393, #412, #414, #17 | 8 | follow-up | MR-085 (N1, #17), MR-084 | #393 gated on Umami |

---

## 9. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **The analytics ingest route answers 200 to a malformed body and logs it as an error with a stack, on an anonymous endpoint.** MR-085 §3.4. Measured against the dev server: an empty body, a truncated JSON body and the text hello each log '[analytics:persist] batch rejected SyntaxError' with a stack at error level and return 200 with ok false; a body aborted mid-stream logs 'Error: request body unreadable' the same way. The empty-body case gives the 'Unexpected end of JSON input' line that the authenticated e2e run prints (twice at 38edcf6, both at the bounce spec), most likely from keepalive or beacon requests cut off when the context closes. Anyone can write one error line with a stack per request, bounded only by the ingest rate limit, and the response breaks the rule that inputs are validated and answered with the contract. Fix as one outcome in `app/api/analytics/events/route.ts`: answer 400 for a body that is not JSON or not an object with an events array, and do not log it above warn or with a stack (one short line with no body content); treat an unreadable or aborted body the same, quietly; keep 413 and 429 as they are. The client never sends malformed JSON, so nothing it does changes (an ordinary fetch would requeue once; a beacon ignores the status). Tests: route unit tests for empty, truncated, non-JSON and non-object bodies (400, no console.error), an aborted read (no console.error), a valid empty batch still 200. Follow-up of loop 217 (#251). | fix | analytics / api | `backend-engineer` | 1 | 3 | 1 | 5 | 1 | 1 | **8** |
| **N2** | **The width and dark axe checks cover the 37 static public routes, and none of the 165 generated pages under 13 dynamic templates.** MR-085 §4.3. `e2e/helpers/public-routes.ts` lists static routes only, so workflow-library (24 pages), use-cases/problems (22), sop-templates (17), use-cases/personas (16), software (16), alternatives (15), compare (11), competitors (10), departments (9), industries (9), answers (8), ai-opportunities (8) and blog posts (4) are guarded by nothing; loop 218 changed 18 of them with only vitest behind it. Measured now: all 196 sitemap URLs return 200, pass a dark full-page axe scan and fit 320 px, and two pages per template pass in light, so nothing is broken today. Fix as one outcome: add one representative of each dynamic template to the shared route list (or a second exported list both specs import), with a test that fails when a new dynamic folder under app/(public) has no representative; the departments and industries entries should be pages loop 218 changed. Show the width and dark scans failing on a mutated template. Run the whole public project (Step 7) and record the added time (about a minute). Follow-up of loop 216 (#418) and loop 218 (#329). | test | public / a11y | `qa-engineer` | 1 | 4 | 1 | 5 | 1 | 1 | **9** |

**Annotations recommended:**
- **#418 closure note:** "[MR-085: holds. The dark scan fails on the old /docs button and links and on a low-contrast line added to /about, a page the loop did not touch; light is untouched. The 39 full-page tests passed twice at retries 0. The public project grew from 146 tests in 6.7 min to 183 in 9.0 min locally; the whole gate is about 20 min against the job's 30-minute timeout. The list holds static routes only; the 165 generated pages are MR-085 N2.]"
- **#251 closure note:** "[MR-085: holds in a real navigation. With 150 buffered events and a real page.goto, the stored-row count shows the bounce arriving 15 of 15 times across five cases, including sendBeacon refused; the pre-loop-217 delivery restored as a mutant loses it 4 of 4 at 150 events. Chromium drains the backlog on beforeunload first, so the tail is lost either way: 84 of 150 backlog events stored now against 99 before, because chunks are smaller. Requeue-once measured in the browser: a batch failing twice is sent twice and then dropped; later events still go. Unit mutants: 11 of 15 killed; measuring chunk size in characters instead of UTF-8 bytes and a requeue cap that drops the newest both pass every test. A requeued event waits for the next flush trigger.]"
- **#329 closure note:** "[MR-085: holds. All 18 pages return 200, carry the new answer in the FAQ panel and the FAQPage JSON-LD, fit 320 px and are axe-clean in both themes. The scoring sentence matches computeAiOpportunityScore (step count, run time, number of systems, per workflow), and no AI model SDK, key or provider call exists in the workspace. The sentence 'records how the work is actually done' is broader than browser-only capture (MR-085 #422 append). The widened claims scan fails on a planted claim in a sample page and in the root index.html.]"
- **#422 append:** "(MR-085) Measured at 38edcf6. The healthcare page says no PHI is captured six times (industry.ts:90 meta description, :124, :126, :128, :131, and the FAQ at :142-143), and that text is already in production; the extension records page titles, sanitized URLs and element labels, which in an EHR web app can contain patient names, so no PHI is not a claim the product can make (no screenshots and no typed values are). Loop 218's own new sentence on all 18 pages, 'Ledgerium records how the work is actually done', has the same gap as item (5): say it records browser work. The finance FAQ 'Can Ledgerium help with audit readiness? Yes.' is item (3)."
- **#422 re-score:** "I/A/L/C/E/R = 4/4/2/4/2/1; total 11; reason: the healthcare no-PHI claim is live in production six times, including the meta description, and the capture records page titles, URLs and element labels that can carry patient data; a compliance claim the product cannot back is the highest-impact copy defect open (MR-085)."
- **#223 append:** "(MR-085) The light-theme /pricing nodes include 7 inside the comparison table: the group header rows (#047857 on their tint, 2.71:1) and three amber badges (#b45309, 3.42-3.56:1); the dark table is clean. The CHANGELOG catch-up claimed the pricing table passes in both themes (corrected by MR-085). Two pages of each dynamic public template measure clean in light. When this lands and light joins the 37-route loop, re-measure the e2e job time (about 20 min locally before it)."
- **#44 append:** "(MR-085) Still true at 38edcf6: the request moved to DashboardV2Shell.tsx:428 and still sends sort=health_score, which the route's sort switch does not map."

**Doc changes recommended (literal replacement text):**
- **`CHANGELOG.md`, catch-up entry, replace:** "This entry covers loops 150-215, which were recorded only in the iteration log. None of it is in production yet." **with:** "This entry covers loops 152-215, which were recorded only in the iteration log. None of it is in production yet (loops 150 and 151 shipped with the last deploy)."
- **`CHANGELOG.md`, catch-up entry, replace:** "- The header, pricing table, column picker and consent banner meet contrast and keyboard-access standards in both themes." **with:** "- The header, column picker and consent banner meet contrast and keyboard-access standards in both themes; the pricing table does in the dark (default) theme, and still has low-contrast labels in the light theme."
- **`CHANGELOG.md`, catch-up entry, replace:** "races another save," **with:** "races another save in the same tab,"
- **`CHANGELOG.md`, loop 216 entry, replace:** "Every public page is now checked for accessibility in the dark theme." **with:** "The 37 main public pages are now checked for accessibility in the dark theme."
- **`.claude/agents/coordinator.md`, Step 5 (line 452), append after "(MR-083).":** " The saturation penalty counts the five loops before the pick, not the pick itself, and a loop counts for each token of its `Area` label (MR-085)."

No change to `CLAUDE.md` is recommended.

---

## 10. Finding → row map

| Finding | Row |
|---|---|
| §2 dark scan kills /docs reverts and a planted /about regression; light untouched; 39/39 ×2 | #418 note |
| §2 public 146 → 183 tests, 6.7 → 9.0 min; gate ~20 min vs 30-minute timeout | #418 note; #223 append |
| §3.1 real navigation: bounce 15/15 now, 0/4 under the pre-217 delivery; tail 84 vs 99 of 150 | #251 note |
| §3.2 requeue-once measured in the browser | #251 note |
| §3.3 D5 and D11 survive | #251 note |
| §3.4 malformed or empty body: 200 and an error log with a stack | N1 |
| §4.1 18 pages render, answers present, 320 px, axe clean both themes | #329 note |
| §4.2 scoring sentence and "no AI model" true; "records how the work is done" overreaches | #329 note; #422 append |
| §4.2 healthcare "no PHI" six times, live | #422 append and re-score |
| §4.3 196 sitemap URLs clean; CI guards 37 | N2 |
| §4.3 claims scan widening killed both planted claims | #329 note |
| §6 saturation rule read two ways | coordinator.md sentence (§9) |
| §6 CHANGELOG 216 entry and catch-up overclaims; light pricing table 7 nodes | CHANGELOG replacements (§9); #223 append |
| §6 staleness triage: #17, #28, #38, #39, #43, #44 still true | keep; #44 append |
| §5 no prisma/api/stored-format change; rollback-safe | CEO item 1 |

---

## 11. Loop 219-221 picks

**The push is still unblocked.** The whole deploy gate is green locally at `38edcf6`, rollback-safe (§5); 67 loops are
undeployed. Apply the four CHANGELOG corrections first (they are the release notes). Also `CRON_SECRET` (item 4), D-1,
#399, stored data, the PostHog settings, and a decision on the healthcare claim if the CEO wants it before #422 lands.

Pool 123 + 2 = 125 > 8. The cool-off stays **3/3**, held (§6). Re-score each pick at pick time with the literal
saturation reading (the five loops before the pick, any token).

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **219** | **#422** remove or reword the claims on the department and industry pages; PHI sentence checked against capture | **11** | `burn-down` (follow-up of 218) | `growth-strategist` (copy) + `security-reviewer` (PHI) + `qa-engineer` (applies, extends the claims scan, runs the tests) | public / positioning | top row; a live compliance claim; ships with the push; positioning 1 and public 2 in 214-218, no penalty |
| **220** | **#309** items (1)-(3): canvas colour mode, dead dark values, one dark axe pass on the maps | **10** | `burn-down` | `frontend-engineer` | web-app / a11y | a11y 2 in 215-219 (215, 216), no penalty; items (4)-(5) stay on the row |
| **221** | **#307** the #57 page: indicative-below-100 line, per-user numerators, share of views settled by cap | **10** | `burn-down` | `frontend-engineer` (with `analytics` review) | web-app / analytics | analytics 1 in 216-220 (217); the page the soak decision reads |

- **Alternates:** #419 (9) before the push if the CEO pushes within the window (the range code ships with it); N2 (9,
  `qa-engineer`) if 219 finishes early, since it shares the route list with the claims work; #421 (9); #81/#84 (10)
  only after a fresh check. **#411 the first loop after the CEO sets the PostHog settings**, whatever its score.
- **Then MR-086** (base cadence after 221), then #419, N2, #421, #377 remainder, #417, #252 items (3)-(4), N1, #420,
  #414, #412, #223 (then light joins the route loop).
- **Area check:** 219 public/positioning, 220 a11y, 221 analytics; no token reaches 3 of the 5 before any pick.
- **Agents:** implementers `qa-engineer` → `frontend-engineer` → `frontend-engineer`; no 4+ run; the frontend run
  217-218 is broken at 219.
- **D-4:** #422 changes ≥3 user-visible strings and `growth-strategist` is its copy agent; #309 changes no copy;
  #307 (an admin page) needs the `growth-strategist` consult if it adds 3 or more strings (guidance line plus labels).
- **Do not pick:** #338 (blocked); #346 at 7; #85, #135, #123, #137, #178 (blocked); #106, #114 at 5; #413 before the
  CEO's PostHog settings; #89, #91 (Path C); #145, #142, #170, #175 (blocked); #159/#160 (CEO); #29 without the D-1
  answer; #393 while Umami is not wanted; #399 (CEO); #60 (architecture); #45 (icon decision); #61 (production data);
  the `dashboard/page.tsx` items of #377 (retire v1 instead); the unchecked 9s listed in §8 before a fresh check.
- **Practice:** the full deploy gate every review; a route list includes one page per template; prove delivery with a
  real exit, not only a synthetic event; keep scope words in release notes to what was measured; one reading of the
  saturation penalty.

---

## 12. Verdict

Every count reproduces at `38edcf6`: root 6545, web-app 4777 (both exit 0, no Errors line), typecheck 0, validator
clean (open 123), guard runner 142/142, the rest of the quality gate, CI's frozen offline install, and `test:e2e`
project by project **183 + 14 + 217 (2 skipped)**. 19 of 24 mutants killed (one more killed by another suite, two
near-equivalent); the real survivors are D5 and D11, both small.

- **Loop 216 holds:** the dark scan catches a regression on a page nobody touched, light is unchanged, and the gate
  stays well inside the CI timeout.
- **Loop 217 holds in a real navigation:** the bounce arrives 15 of 15 times, where the old delivery lost it every time
  at 150 events; requeue-once works in the browser. The server logs malformed bodies as errors and answers 200 (N1, 8).
- **Loop 218 holds:** 18 pages render, fit and pass axe in both themes; the answers are standard and hedged and "no AI
  model" is true. The pages still claim "no PHI" six times, live (#422 → 11, the top pick).
- **Coverage:** all 196 sitemap URLs pass today; CI guards 37 (N2, 9).
- **The push stays rollback-safe.** Fix four CHANGELOG phrases first.

Selection followed the pick-time rule; 218 used a different reading of the saturation penalty, harmlessly (pin it).
Cool-off held (3/3), ratio 0.83, pool 125. Asks for the CEO: **push now** (91 ahead, 67 loops) after the CHANGELOG
corrections; the healthcare claim; `CRON_SECRET`; PostHog settings, then #411, then the key; D-1, #399, stored data,
Umami, Path E and the `analytics` agent's tools. For the coordinator: #422, #309, #307; the two rows, one re-score, four
appends, three closure notes, four CHANGELOG replacements and one coordinator sentence.

### Appendix — reproducing

```sh
S=<scratchpad>
pnpm install --frozen-lockfile --offline                                           # exit 0
node scripts/validate-backlog.mjs                                                  # exit 0, open 123
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json      # tests=142 real_pass=142 fail=0
node scripts/check-typecheck-coverage.mjs; node scripts/check-dockerfile-workspace.mjs   # OK, OK
pnpm exec vitest run; (cd apps/web-app && pnpm test); pnpm typecheck               # 6545 / 4777 / 0, no Errors line
(cd apps/web-app && pnpm exec playwright test --project=public)                    # 183 passed (9.0 min)
(cd apps/web-app && pnpm exec playwright test --project=api)                       # 14 passed
(cd apps/web-app && pnpm exec playwright test --project=authenticated)             # 217 passed, 2 skipped
git checkout -- apps/web-app/public/docs/screenshots/                              # restore the 12 PNGs
(cd apps/web-app && node $S/mut085/mut.mjs unit)                                   # 11 of 15 killed; D3, D4, D5, D11 pass
(cd apps/web-app && node $S/mut085/mut.mjs scan)                                   # 2 of 2 killed
sh $S/devserver.sh &                                                               # the webServer env on 3098
(cd apps/web-app && node $S/mut085/e2emut.mjs a11y)                                # E1-E3 killed
(cd apps/web-app && node $S/mut085/e2emut.mjs bounce)                              # B1, B3, B4 killed; B2 passes
(cd apps/web-app && pnpm exec playwright test -c $S/probe085.config.ts --project=probe-bounce)  # real navigations, requeue
(cd apps/web-app && node $S/mut085/realnav.mjs)                                    # pre-217 delivery loses the bounce at 150
(cd apps/web-app && pnpm exec playwright test -c $S/probe085.config.ts --project=probe-slugs)   # 18 pages + templates, both themes
(cd apps/web-app && pnpm exec playwright test -c $S/probe085.config.ts --project=probe-sweep)   # 196 sitemap URLs, dark
(cd apps/web-app && pnpm exec playwright test -c $S/probe085.config.ts --project=probe-pricing) # light table nodes
node $S/ingest085.mjs                                                              # malformed bodies: 200 + error log
gh run list --limit 5; gh secret list; git ls-remote origin main                   # CRON_SECRET absent; remote a14c5e8
git log origin/main..main --oneline | wc -l                                        # 91
```
