# MR-034 — meta-review (Mode 4, `meta-coordinator`, NON-counting)

**Window:** loops 51, 52, 53. **Prior:** MR-033 closed at loop 50.
**Date:** 2026-09-28. **Product code changed:** none.

**A loop 54 landed while this review was in flight** (`56af698`, 2026-09-28 07:48). It corrects the
loop-53 security inference — the subject of question 1 — and it reached the same conclusion I reached
independently, from the files as they stood when this review opened. Sections 2 and 3 record both,
and section 3 attacks the correction rather than accepting it.

---

## 1. Lead: what is wrong, in order of consequence

1. **The loop-53 inference was unsound, and wrong in the direction that causes an outage.** Not
   merely "stated with its limit" — the limit it stated was the wrong limit. The runbook was
   actively instructing the CEO toward the unsafe value. **Corrected at loop 54 before any harm.**
   §2.

2. **The correcting commit reintroduced the loop-53 defect class in miniature.** Two JSDoc comments
   in `proxy-observation.ts` still describe the **minimum** as the gated quantity, in the file whose
   entire lesson was that the minimum is the wrong estimator. §3.2. **Strike S-2.**

3. **The corrected estimator is sound against accident and still reachable by an attacker.** The
   90% dominance gate raises the cost of poisoning the suggestion from **one request** to **nine
   times the honest volume**. On a pre-launch app that is cheap. §3.1.

4. **The head is clean of phantoms and staler than MR-033 measured.** 17 rows re-sampled, weighted
   to the 13+ band: **0 confirmed phantoms** (MR-033: 1 in 30), but **6 of 17 — 35% — where the row
   text does not match the code** (MR-033: 17%). Two are load-bearing: **#150** and **#90**, both
   score 13, both in the band where selection happens. §6.

5. **P-6's hard stop is now five loops overdue.** MR-033 asked for it to be enforced or retired.
   Loops 51, 52 and 53 each logged a self-written drift ack and none stopped. §9. **Strike S-3.**

6. **Eight open rows have an unreadable score cell** — including #110, which MR-033 endorsed as
   PRIMARY "score 13". No positional parser can rank them; a sweep reads #110 as 2. §6.3.

**Not wrong, and worth saying:** D-1's structural claim holds under independent verification, by
evidence this time rather than by luck (§5). The `207 occurrences` figure behind loop 53's rejection
of #8 **reproduces exactly** (§8) — the opposite of the stale-ref class that cost loops 47 and 48.

---

## 2. Q1 — the loop-53 inference is **not sound**, and the error was in the unsafe direction

The claim under test, from `proxy-observation.ts` as it stood at loop 53 and repeated verbatim in
`docs/runbooks/TRUSTED_PROXY_HOPS.md` and in `compose.hostinger.yaml:33-38`:

> Proxies append and never remove, so **no caller can produce a chain shorter than the true hop
> count** — the minimum is safe from below, which is the direction that matters.
> … Guess **too high** and every request resolves to the proxy's own address. All users collapse
> into a single rate-limit bucket.

I did not reason about this in prose. I re-implemented `getClientIp` lines 103-137 and enumerated the
outcomes. With **D** appending proxies, an honest request arrives carrying D entries, client at
index 0; a spoofing client prepends k, giving D+k.

| true D | hops set | honest Alice | honest Bob | verdict | spoofed request resolves to |
|---|---|---|---|---|---|
| 1 | 0 | ALICE | BOB | distinct | **FAKE0** — bypassable |
| 1 | 1 | ALICE | BOB | distinct | ALICE — correct |
| 1 | 2 | ALICE | BOB | distinct | **FAKE0** — bypassable |
| 2 | 1 | **PROXY1** | **PROXY1** | **COLLAPSE** | PROXY1 |
| 2 | 2 | ALICE | BOB | distinct | ALICE — correct |
| 2 | 3 | ALICE | BOB | distinct | **FAKE0** — bypassable |
| 3 | 1 | **PROXY2** | **PROXY2** | **COLLAPSE** | PROXY2 |
| 3 | 2 | **PROXY1** | **PROXY1** | **COLLAPSE** | PROXY1 |
| 3 | 3 | ALICE | BOB | distinct | ALICE — correct |

The mechanism is the clamp at `client-ip.ts:129-131`: `hops > length` makes the index negative and
clamps to `entries[0]`, which for honest traffic **is** the client. So:

- **`hops > D` is not an outage.** It degrades to today's exact behaviour, plus spoofability.
- **`1 ≤ hops < D` is the outage.** It selects a proxy address, identical for every user.

**The documented direction was inverted, in all three places.** And because the minimum is precisely
the estimator that under-reports, the loop-53 design pointed at the outage.

### 2.1 The three attacks the question asked for, answered

**(a) Do proxies replace rather than append?** Yes, routinely. nginx with
`proxy_set_header X-Forwarded-For $remote_addr` (rather than `$proxy_add_x_forwarded_for`), Traefik
with no `trustedIPs` configured, Envoy with `skip_xff_append`, Caddy with
`header_up X-Forwarded-For {remote_host}` all overwrite. The "append and never remove" premise is a
convention, not an invariant. Direction of harm: a **replacing outermost** proxy is benign — every
request then carries exactly D and the estimate is exact. A **replacing inner** proxy is worse than
an estimator error: the client address is destroyed before the app ever sees it, no setting of
`TRUSTED_PROXY_HOPS` recovers it, and a confident suggestion would be silently meaningless.

**(b) Can a request reach the app without traversing the proxy?** **Yes, on this deployment, by
construction.** `compose.hostinger.yaml` publishes `ports: "${PORT:-3000}:3000"`. Anything that can
reach the VPS on 3000 bypasses the external proxy entirely and carries whatever header it chose.

**(c) Would such traffic drag the minimum below D?** **Yes** — and `entryCount === 0` being excluded
(the one defence loop 53 built) does not help, because a bypassing caller that sends
`x-forwarded-for: 1.2.3.4` produces `entryCount: 1`, not 0. One such request was sufficient. At
`HONEST_SAMPLE_THRESHOLD = 20`, twenty of them made `honestSampleLikely: true`.

**Verdict: the module comment and the runbook were both wrong, and the runbook's step-by-step
instructions would have produced the lockout they were written to prevent.** The runbook's
*procedure* was nonetheless safe — step 4's "confirm you can still log in / symptom is immediate
429s" is exactly the right check for the under-set case, and rollback is one variable. The
explanation was wrong; the operational guard was right.

### 2.2 What actually happened, stated plainly

**I did not catch a live defect.** The coordinator caught it in parallel, at loop 54, while this
review was open, and landed the fix. My derivation and its derivation are the same table and the
same published-port observation, reached independently. That is corroboration, and it is worth more
than either alone — but the review does not get to claim the find.

**Strike S-1 (loop 53).** The entry says *"The inference is stated with its limit, not asserted."*
The limit it stated ("if literally every request were spoofed, the minimum would overstate") is the
**benign** failure mode. The malign one — bypass traffic dragging the estimate down — was not
considered, and it was reachable on this deployment's own compose file. Loop 54's own summary is
the correct one and I endorse it verbatim: *"I verified the measurement was privacy-safe and the
plumbing worked, and did not verify the inference."*

---

## 3. Is the loop-54 correction sound? Mostly — two residuals

The estimator now reports the **mode** over header-bearing requests, gated on `requests ≥ 20` **and**
`share ≥ 0.90`. Verified against `proxy-observation.ts:135-176`.

**The direction is now right.** The mode is unmoved by a handful of bypass requests, and its residual
error is upward (inflating spoofers raise it), which the clamp makes safe. The test at
"500 at depth 2 plus 3 that skipped the proxy" encodes the exact near-miss. The corrections are
stated as corrections in all three files rather than quietly rewritten — that is the right call and
it is why this review could reconstruct what happened.

### 3.1 Residual: the 90% gate is a cost, not a barrier

`getClientIp` is called from six routes — `admin/bootstrap`, `analytics/extension`,
`auth/forgot-password`, `auth/signup`, `invites/accept`, and NextAuth `authorize`. None is a health
check, which materially limits accidental poisoning. But an attacker who can reach port 3000 can
send arbitrary volume to `/api/auth/forgot-password` with a one-entry header. To make the mode read
1 when D is 2 they need only to exceed 9× the honest header-bearing volume on those six routes.
**On a pre-launch app that is a small number.**

Three things bound this and I state them rather than alarm:
- the output is **advisory** — a human reads it and sets a variable;
- the runbook's step 4 catches the under-set case on first login attempt, and rollback is instant;
- the attacker gains a **denial of service**, not a bypass; to gain a bypass they would inflate,
  which is the safe direction.

**No change proposed.** The honest framing for the runbook is "this number is trustworthy if nothing
has been deliberately pointed at port 3000", and the cheap structural fix is not in this module at
all — it is whether the container port needs to be published to the host. **Surfaced to the CEO in
§13, not proposed here.**

### 3.2 Strike S-2 — the correcting commit left two comments describing the rule it removed

Verified by grep against the file at HEAD:

- **`proxy-observation.ts:84`**, documenting `honestSampleLikely`: *"Whether the **minimum** was
  observed on enough requests to act on."* The code assigns it `confident = enoughVolume &&
  shapesAgree`, where `enoughVolume` gates `dominant.requests` (`:162`).
- **`proxy-observation.ts:104`**, documenting `HONEST_SAMPLE_THRESHOLD`: *"How many requests must
  share the **minimum** before it is worth acting on."* Used at `:162` against the dominant shape.

Lines 31, 45, 48 and 72 also say "minimum" and are **correct** — they are deliberate historical
notes. 84 and 104 are not; they describe current behaviour and describe it wrongly.

This is the loop-53 class exactly: **a comment asserting a rule the code no longer implements**, in
the file whose correction was about that. It is two lines and it cost nothing to introduce, which is
the point — §4.

### 3.3 One unstated precondition

`counts` is module-level process state (`:117`). `/api/admin/operations` reports only the counts held
by the process that serves that request, and everything resets on redeploy. In a single-container
single-process Next.js standalone this is the whole picture; under any clustering it is one worker's
slice, and a slice can have a different mode than the whole. **Not stated in the module or the
runbook.** I could not verify the runtime's process model from the repository.

---

## 4. Q2 — edit mechanics are the weak link, and the safety net is working. Both.

Census of defects across loops 45-54, classified by **origin**, not severity.

**Originating in how a file was edited (8):**

| # | Loop | Defect | Escaped the loop? |
|---|---|---|---|
| 1 | 45 | drift guard derived a path via `new URL().pathname` + a regex drive-strip — a platform guess | no |
| 2 | 47 | **#8** corrupted by positional cell edit | no — *"only because I happened to print it"* |
| 3 | 47 | **#107** corrupted by positional cell edit | **yes — shipped** |
| 4 | 47 | validator V3 anchored dimensions relative to the score cell, so it validated the corruption against itself | **yes — shipped** |
| 5 | 52 | raw `0x08` written into a regex via an escaping slip | **yes within the loop — passed `pnpm test` in its broken form**; caught incidentally with `cat -A` |
| 6 | 53 | a second copy of `getTrustedProxyHops` written instead of importing | no |
| 7 | 53 | `if 'x' not in source` import guard #1 — matched a doc comment just written; import silently skipped | no (cost a re-run) |
| 8 | 53 | same guard mistake #2 | no (typecheck failure) |

**Originating in a decision or an unverified claim (5):** loop 47's *"V4 catches the MR-030
mechanism"* (shipped in a script header, 0 of 9 on re-run); loop 48's *"13 unpushed commits"* from a
stale ref, reported twice; loop 49's guessed output field name (`actionSummary` / actually
`operationalDefinition`); **loop 53's proxy inference** (shipped); MR-033 §8.1's *"16 of 18 keys
discarded"* over-reading (corrected by loop 52 — see §8).

### 4.1 The answer is (a) **and** (b), and the split is temporal

- **Loops 45-48:** 4 mechanics defects, **3 escaped the loop.**
- **Loops 49-54:** 4 mechanics defects, **0 escaped the loop** (the `0x08` escaped `pnpm test` but
  not the loop).

**The net is working, and it got better.** What did not get better is the **generation rate** —
loop 53 produced three mechanics defects in a single loop, the highest in the window.

### 4.2 The common root under six of the eight has a name

**A textual heuristic used as a structural test.** Positional cell slicing (#2, #3, #4) is "offset in
a string stands for structure". Substring import guards (#7, #8) are "presence of a substring stands
for an import". #6 is adjacent — "I did not check whether this symbol already exists". Only #1 and
#5 have other roots.

That root is already half-defended. `validate-backlog.mjs` defends the row-layout half, and it
works: it fires V3a on the real #107 corruption. The import half has **no** defence, which is why
guard #1 slipped silently — its skip produced code that still type-checked — and guard #2 only failed
because typecheck happened to catch that instance.

### 4.3 The practice change, and it is not a rule

**Assert the post-condition, not the pre-condition.** After a guarded insertion, verify that the
symbol *resolves* — not that a string was absent before. `grep -c "^import.*getTrustedProxyHops"`
costs nothing and converts a silent skip into a loud one. This needs no `CLAUDE.md` edit and no new
control; it is a habit, applied at the point where six of eight defects were born.

**One optional script, offered not proposed.** A control-character scan over changed files would have
caught the `0x08` at zero cost, in the same `quality-gate` slot as `validate-backlog.mjs`. Verified:
no such check exists, and `apps/*/src` + `packages/*/src` are currently clean, so it would go green
on day one. Whether one loop is worth one defect class is the CEO's call, not mine (§13).

---

## 5. Q3 — D-1: the claim holds, verified independently, and the rule is **not** ritual

**The verification the question asked for, done three ways.**

**(a) Backlog sweep.** Every unstruck row scanned for `extension-app`, `segmentation-engine`,
`normalization-engine`, `policy-engine`, plus `content/`, `background/`, `sidepanel`, `manifest.json`,
`chrome.`. 17 rows matched the pattern; 16 are false positives — "extension" used as a noun for
*extending* something (#59 `variationLabel` extension), or `api/analytics/extension/route.ts`, which
is **web-app** (#226), or "Side Panel" meaning the web app's panel (#128). **One genuine extension
row: #216**, and its status cell now reads `**blocked — CEO decision: shadow-DOM capture
semantics**` — loop 51's correction verified in the file, at `IMPROVEMENT_BACKLOG.md:302`.

**(b) Work not represented by any row — the half MR-033 could not close.** Three probes:

- **Skipped or disabled tests on extension surfaces: none.** The two `.skip()`s MR governance history
  records against `sidepanel-real.spec.ts` have been **re-enabled** — the file's own comment at
  `:490-499` records test 3 as *"RE-ENABLED … verified 3/3 consecutive passes (0 retries) with ZERO
  code changes, by removing `.skip()` alone."* `SYSTEM_HEALTH.md:14` confirms the CI `real-extension`
  job runs **6 tests, 6 passed**.
- **`TODO` / `FIXME` / `HACK` across all four extension surfaces: 0 occurrences.**
- **The Chrome Store placeholder**, the one open operational thread: already defended in code —
  `install.ts:33-51` detects the placeholder marker and routes accordingly. The remaining steps are
  human (a Dashboard listing), not code.

**(c) Last commit touching any extension surface:** `871e29a`, 2026-09-24 (loop 42). Ten loops.

**Ruling: D-1 is still doing useful work. It is not ritual, and I am not repeating MR-031's error in
either direction.** The rule's job is to report a true fact about the portfolio, and the fact is
true: a shipping Chrome extension under a hard reliability invariant has had no source change in ten
loops. D-1 correctly refuses to let that become invisible. What it **cannot** do is clear itself,
because the only lever is a CEO decision. That is not the rule malfunctioning — it is the rule
reporting a decision backlog, accurately, and the counter climbing is the correct behaviour.

**What is genuinely at risk is different, and larger:** ten loops without an extension change on a
product whose CLAUDE.md invariant records two prior capture-pipeline regressions means the invariant
is **untested by use**. `SYSTEM_HEALTH.md` shows the CI harness green, so it is not unguarded — but
green-and-unexercised is a weaker signal than green-and-exercised. That is worth a CEO decision on
#216, not a change to D-1.

---

## 6. Q4 — re-sample of the head: **phantoms gone, drift up**

17 rows re-sampled, **15 of them score ≥ 13** — deliberately weighted to the band MR-033 §5.1
predicted the failure concentrates in. Every verdict is a file check.

| Row | Score | Verdict | Evidence |
|---|---|---|---|
| **#150** | 13 | **MATERIALLY STALE ×3** | Row: *"extends `api/admin/operations/queries.ts` (iter 071 5-function baseline)"* with 11 new fns incl. `getUsersByPlan` / `getUsersBySubscriptionStatus` / MRR / plan distribution. Live: **that path does not exist** (code is at `lib/admin-operations/queries.ts`, **11** exported fns not 5), and `getSubscriptionBreakdown()` already returns `byPlan: Record<NormalizedPlan, number>`, `byStatus: Record<NormalizedSubscriptionStatus, number>` over **exactly the five statuses the row names**, and `mrr: MrrEstimate` (`types.ts:79-92`) |
| **#90** | 13 | **MATERIALLY STALE** | Row asks for an ADR deciding *"(a) XES vs OCEL 2.0 vs hybrid"*. `docs/features/process-variation/RESEARCH_PROCESS_MINING_STANDARDS.md` **§1 is headed "(decision)"** and rules: XES (IEEE 1849-2023) **ADOPT** as interchange; OCEL 2.0 **CONSIDER** post-MVP. Clauses (b) mapping and (c) export scope survive; the headline decision does not |
| **#177** | 13 | **STALE — 2 of 6** | Row: *"+6 component-level test files for LeaderboardTable / KpiTile / SectionCard / EmptyState / LoadingSkeleton / TimeSeriesChart"*. `LeaderboardTable.test.ts` and `TimeSeriesChart.test.ts` **exist**. The row's *other* claim — zero axe coverage on admin — **holds**: 0 admin references across all four axe specs |
| **#168** | 14 | **partial overlap — flagged** | Row's action menu *"opens trial-extension (PR-9)"*; `user-detail/UserDetailActions.tsx:32` already ships `data-testid="action-extend-trial"`, with 5 components + 5 test files. The badge half (*"10 workflows recorded — no upgrade"*) returns 0 hits and is open |
| **#113** | 13 | **partially shipped — unchanged since MR-033** | Feature hierarchy live at `pricing/page.tsx:69` on `COMPARISON_FEATURES`; the `PRICING_CATALOG` the row prescribes is still absent |
| **#125** | 13 | **partial overlap — flagged** | Co-occurrence matrix absent ✓, but the row's *"decision confidence calibration"* half overlaps live `intelligence-engine/src/calibration/calibrateThreshold.ts` |
| #108 | 16 | open ✓ | `runCount` → **0 hits** in `packages/process-engine/src`, exactly as the re-scope states |
| #122 | 14 | open ✓ | `APPROVAL_RE` / `REJECTION_RE` / `modal_opened` → 0 hits; `decision-detector.ts` implements retry only |
| #137 | 14 | open ✓ | no `embed/` route under `app/(public)/` |
| #138 | 14 | open ✓ | no deviation-alert job |
| #92 | 13 | open ✓ | ErrorBoundary exists only in `components/demo/`; none on `DashboardV2Shell` |
| #94 | 13 | open ✓ | `setUserPlanForAnalytics` at `analytics.ts:738`; no queue |
| #109 | 13 | open ✓ | `role="checkbox"` at `SOPExecutionMode.tsx:566` |
| #111 | 13 | open ✓ | `apps/web-app/src/lib/pricing/` does not exist |
| #124 | 13 | open ✓ | `variantDetector.ts` present, as the row's premise requires |
| #129 | 13 | open ✓ | `WorkflowMetricsOutputV3` → 0 hits |
| #143 | 13 | open ✓ | `components/workspace/` absent; row self-marks DEFERRED, consistent |

### 6.1 Rates, and why they are not directly comparable to MR-033's

**0 / 17 = 0% confirmed phantom. 6 / 17 = 35% text-vs-code drift.**

MR-033 measured 3.3% and 17% on 30 rows drawn by **position** (lines 283-378), regardless of score.
Mine are drawn by **score**, from the band MR-033 predicted would be worse. **The two numbers measure
different populations and I will not present the 35% as a deterioration.**

What the comparison does support:

1. **The strikes worked.** #112 sat at 14 and is gone; #23 and #32 are gone; #157 and #223 carry
   corrected text. I re-verified the head and found **no row describing work that is fully done.**
   The specific failure that made loop 41's "verified genuinely open" wrong is not present today.
2. **MR-033 §5.1's prediction is confirmed, and it was right for the reason it gave.** Drift
   concentrates at the top because that band accumulates re-scopes. At 35% the concentration is
   stronger than §5.1's extrapolation implied.
3. **The failure mode has changed shape and is less dangerous.** Selecting from the head today does
   not risk a wasted loop on finished work. It risks a loop that starts from a **wrong file path**
   (#150), a **wrong baseline count** (#150, #177), or a **decision already taken elsewhere** (#90).
   Those cost minutes at brief-writing time, not a loop — **provided P-11 is applied**, which is
   exactly what loop 53 did to #8 and got right (§8).

**So: the head is measurably healthier, and you are not selecting from fiction. You are selecting
from rows whose arithmetic and file paths have aged.**

### 6.2 Methodology limit, stated

Six "materially stale" verdicts rest on **symbol and path existence**, not on reading each
implementation end to end. #113, #125 and #168 in particular are partial-overlap judgements: I
verified that a live module covers part of the row's stated scope, not that it covers it to the
row's standard. A reader who disagrees with those three would get 3/17 = 18%, which is MR-033's
figure. #150, #90 and #177 do not depend on judgement — those are path-does-not-exist and
decision-already-written.

### 6.3 Eight open rows cannot be ranked at all

`#45 #223 #157 #152 #127 #126 #121 #110` carry an unescaped `|` and therefore a displaced score cell.
A positional parser reads **#110 as score 2** and **#121 as 14**. #110 is the row MR-033 endorsed as
PRIMARY "score 13" and loop 51 worked — correctly, because it was read by eye. The count has not
grown (the validator's 19-row budget reports `19/19 … clean`, and my own cell-count census is
identical at loop 50, loop 51 and HEAD, so loop 51 introduced none). **This is not a corruption. It
is a blind spot in any automated ranking**, and it overlaps the head.

---

## 7. Q5 — selection under a standing directive: good judgement on outcomes, one real hazard

Three picks, none by score: #110's residual (13, **MR-033-endorsed** — externally verified), #227
(13, **self-filed at loop 51, worked at loop 52**), #225-support (9, with #8 rejected at the same 9).

**The two picks I have no concern about.** #110 came with an external endorsement and verified
residual. #225-support was taken against MR-032's and MR-033's repeated framing of #225 as the
highest-value blocked row, and the **rejection of #8 was the strongest single act of selection
discipline in the window** — see §8.

### 7.1 Is filing #227 and immediately working it legitimate?

**Legitimate in this instance; a hazard as a pattern. Both halves matter.**

**Why it was legitimate here.** #227 was not invented. It came out of a directed audit of a real
question ("is *the value existed and the consumer discarded it* a class?"), and the log records the
first framing being **wrong and corrected before filing** — *"My first framing … was wrong and I
checked before filing"*. The defect it names is the MDR-P05 pattern: two sources of truth for one
statistic, one loop after loop 50 wired a column to one of them without knowing the other existed.
That is discovery, not manufacture.

**Why it is a hazard as a pattern.** A self-filed row worked one loop later is verified **by the
person who intends to work it, at the moment they intend to work it**. That is precisely the blind
spot MR-033 §5.1 named — *"verification performed at selection time, on the row you already intend
to take, inherits the same blind spot as the selection"* — and a self-filed row inherits it twice:
once at filing, once at selection. Its score is self-assigned and never crossed by anything. #227
was scored **13**, which put it exactly at the top of the unblocked, actionable band. Nothing
checked that.

**The mitigating fact, which I verified rather than assumed.** Of the 17 rows at score ≥ 13, my
sample found 6 materially stale, #108 blocked, #143 deferred, and most of the remainder
(`PATHE-*`, `ADMIN-*`, `PRICING-*`) are multi-iteration roadmap rows, not one-loop items. **The set
of "score ≥ 13, unblocked, verified-open, completable in one loop" was close to empty.** Filing what
you found is a better response to an empty band than forcing a roadmap row into a loop it does not
fit.

**Verdict: not drift.** The standing "don't stop until complete" directive makes coordinator-chosen
picks the expected mode, and the outcomes are defensible one by one. The guard needed is not a rule
and not an approval step — it is that **a self-filed row should not be worked in the immediately
following loop without the score being checked by something other than its author**, and the
cheapest something is the next meta-review. For #227 that check happens here, retrospectively: the
work shipped, closed a real duplicate, and generated no follow-ups. **Retrospectively sound.**

---

## 8. Two things the window got right that are worth naming

**Loop 53's rejection of #8 is the model.** The row assumed a `{data, error, meta}` envelope; the
coordinator counted the actual convention before rejecting. **I re-ran it: `NextResponse.json({ error`
returns exactly `207`.** Reproduces to the digit. This is the direct inverse of loop 48's "13
unpushed commits, twice" — a derived number, checked at the point of use, that survives independent
re-derivation. (Loop 47's related "25 of 72 route.ts files with no `try {`" now reads **27 of 74** —
drift from routes added since, not an error.)

**Loop 52 corrected its own meta-review, with evidence.** MR-033 §8.1 asserted that
`IntelligenceJsonSchema` declares 2 of 18 payload keys and the other 16 are *"discarded"*. Loop 52
checked all 18 and found every one has a real consumer — the true statement is the narrower
*"unavailable as columns"* — and **declined to build the producer/consumer coverage script MR-033
had proposed**, on the ground that it would flag 16 gaps that are not gaps. That is a delegate-grade
pushback aimed upward at the governance layer, and it is correct. **MR-033's §15 recommendation 6 is
withdrawn.**

---

## 9. Control-rule status

| Rule | State | Verdict |
|---|---|---|
| **D-1** (reverse drift, N=5) | **10.** Acked at 51, 52 **and** 53 | **Remediated.** MR-033's W-2 was a missing ack at loop 50; all three loops in this window logged one. Rule verified accurate in §5 |
| **P-6** (one inferred ack, then a hard stop) | Five acks, no stop | **Strike S-3.** MR-033 asked for "enforce or retire". Nothing moved, and three more acks accrued. The standing *"don't stop until complete"* directive is plausibly the intended override — if so, **retire P-6**; a rule silently overridden is worse than no rule. CEO's call (§13) |
| **Meta-review cadence** (2-3 loops) | MR-033 → 51, 52, 53 → MR-034 | **Clean, on time** |
| **Area saturation** (3 consecutive) | process-engine (51) → intelligence-engine (52) → web-app/security (53) | **Clean.** Three distinct areas |
| **Agent rotation** (4+ consecutive) | coordinator (51) → `backend-engineer` (52) → coordinator (53) → coordinator (54) | **Clean**, but **coordinator is at 2 consecutive entering loop 55.** A third makes it 3 |
| **P-11** (verify before selecting) | Applied at 51, 52, 53; **#8's rejection is the best instance in five windows** (§8) | **Keep unchanged.** §6 shows the residual is stale text, which P-11 catches at brief time |
| **Validator** (V1/V1a/V2/V3/V3a/V4) | `220 rows, 119 struck, 19/19 budget — clean`, run by me | **Working.** Blind to the 8 unreadable score cells (§6.3) — a ranking problem, not an integrity one |
| **Extension Reliability Invariant** | Zero extension source changes in 10 loops; CI harness **6/6** | **Guarded but unexercised.** §5 |

---

## 10. Q6 — Follow-Up Debt ratio, arithmetic shown

From `git diff` on `IMPROVEMENT_BACKLOG.md` per commit, not from the log prose.

| Loop | Commit | Struck | Created |
|---|---|---|---|
| 51 | `d6e137d` | **#112, #23, #32** (3) | **#227** (1) |
| 52 | `e6f10c7` | **#227** (1) | 0 |
| 53 | `7ae5c98` | 0 (#225 re-scoped in place) | 0 |
| *54* | *`56af698`* | *0 (backlog untouched)* | *0* |

```
Window (51-53):   4 closed / 1 created  =  4.00      (floor 0.5)
```

**Trailing 10 (loops 44-53), which is the window the policy specifies:**

```
created:  44:0 45:0 46:0 47:0 48:0 49:0 50:0 51:1 52:0 53:0  =  1
closed:   44:0 45:1 46:1 47:0 48:4 49:0 50:1 51:3 52:1 53:0  = 11
ratio  =  11 / 1  =  11.00                                    (floor 0.5)
```

**The honest split, continuing MR-033's practice — and it has got worse, not better.** Of the 11
trailing closures, **7 are phantom or bookkeeping strikes** (#93, #176, #62, #69 at loop 48; #112,
#23, #32 at loop 51) and **4 are work** (#171, #95, #101, #227):

```
work only:  4 closed / 1 created  =  4.00
```

Still clear by 8×. But **64% of trailing closures are now corrections rather than delivery**, up from
MR-033's 56%. And on the window alone, the single work-closure (#227) is a row the coordinator
**filed within the same window** — so counting only work originating outside the window gives
`0 closed / 1 created = 0.00`.

**Verdict unchanged from MR-033: the metric is not the constraint on this system and has not been
for eleven loops.** MR-033's warning is now the load-bearing observation rather than a caveat — *a
ratio that counts phantom strikes as burn-down reads healthiest precisely when the pool is least
trustworthy.* **No rule change proposed.** It is worth knowing that this number currently measures
bookkeeping, not throughput.

---

## 11. Loop 55 endorsement

**Loop 54 consumed the slot this section was asked to endorse**, and it was the right call: the
defect was live in shipped code and the runbook was actively pointing at the unsafe value. Waiting
for a meta-review to confirm a security flaw you have already derived is the wrong trade. **Endorsed
retrospectively.**

### PRIMARY: **#92 — score 13 — NOT decision-blocked.**

*PIB-P06: React ErrorBoundary on the dashboard surface.*

**Premise verified today.** `ErrorBoundary` appears in `apps/web-app/src` at exactly two places, both
under `components/demo/` (`DemoSOP.tsx:46`, `DemoVariantsMap.tsx:41`). **`DashboardV2Shell` has
none**, so an uncaught exception in any descendant takes the whole route to the Next.js 500 page,
exactly as filed.

**Why this one, over the alternatives:**

- It is the **highest-scoring row I verified as fully open, unblocked, with no stale text and no
  pending CEO decision.** #108 (16) is blocked; #168/#138/#137/#122 (14) are multi-iteration roadmap
  work; #150, #90, #177 (13) are the stale ones this review found; #109 (13) is clean but is the
  alternative below.
- The pattern is already in the codebase, twice, so the brief is short and the design is not open —
  which per MR-033 §6 means **write it yourself, do not delegate**. That also keeps the coordinator
  at 3 consecutive, which is inside the rotation rule but is the last loop that is.
- It is `web-app`, following `web-app/security` at loop 53 and 54. **Two consecutive — check the
  Area reading before loop 56.**
- **It does not clear D-1**, which will be 11. Nothing does; §5 verified that independently. Log the
  ack, and note that P-6's stop is now six loops overdue.

### ALTERNATIVE: **#109 — score 13 — NOT decision-blocked.**

`role="checkbox"` on a `<button>` at `SOPExecutionMode.tsx:566`, re-verified today. Take this instead
if closing an a11y blocker is worth more than a trust defect; both are clean and both are one loop.

### Bookkeeping to fold into whichever loop you take — minutes, not a loop

1. **`proxy-observation.ts:84` and `:104`** — replace "minimum" with "dominant shape" (§3.2). Two
   lines, in the file whose lesson this is.
2. **Re-scope #150** — correct the path to `lib/admin-operations/queries.ts`, correct "5-function
   baseline" to 11, and remove `getUsersByPlan` / `getUsersBySubscriptionStatus` / MRR / plan
   distribution from its scope; all three ship in `getSubscriptionBreakdown()`.
3. **Re-scope #90** — cite `RESEARCH_PROCESS_MINING_STANDARDS.md` §1 and reduce the row to clauses
   (b) mapping and (c) export scope; the XES-vs-OCEL decision is made.
4. **Re-scope #177** — `LeaderboardTable.test.ts` and `TimeSeriesChart.test.ts` exist; 4 files
   remain. Its axe claim is correct and should stay.
5. **Annotate #168, #113, #125** with their verified overlaps (§6). Not re-scopes — flags, so the
   next reader does not re-derive them.

**NOT endorsed:** a sweep of the ~84 remaining unsampled rows. MR-033 declined it for loop 51 and the
reason is stronger now — §6 shows the head is clean of phantoms, which is the region that matters.
**CEO scheduling decision, §13.**

---

## 12. What I could not verify

Stated rather than asserted.

- **Whether loop 54's correction was authored independently of this review.** Its opening line says
  *"I put the soundness of yesterday's inference to MR-034 as its first question, then attacked it
  myself rather than waiting."* So the question prompted it. **My derivation was made from the
  pre-loop-54 files and reached the same table**, but I cannot claim it was blind to the prompt, and
  I am not claiming the find (§2.2).
- **Test counts.** Loop 51's `652 → 657` / workspace `4927`, loop 52's `3140 → 3153` / `4940`, loop
  53's `3153 → 3167` / `4954`, loop 54's `3167 → 3169` / `4956`. Mode 4 — I ran no product suite. I
  **did** execute `scripts/validate-backlog.mjs` (markdown only) and it reports `220 rows, 119
  struck, 19/19 — clean`, and I re-implemented `getClientIp`'s selection in a scratch script.
- **The true proxy depth D.** Unobservable from this repository — that is the whole premise of #225.
  My §2 analysis is parametric in D and does not require knowing it.
- **The runtime process model** (§3.3). Whether `/api/admin/operations` sees all requests or one
  worker's share depends on how Next.js standalone is run in the container. Not readable here.
- **Whether the six routes calling `getClientIp` are, in practice, low-volume enough for the §3.1
  poisoning cost to be small.** That needs production traffic figures I do not have.
- **Whether #113, #125 and #168's overlaps are intended reuse or intended re-implementation.** Same
  limit MR-033 hit on #123: the rows do not settle it and reading cannot.
- **The ~84 open rows I did not sample.** §6's rates are measured on 17, drawn by score.
- **`CLAUDE.md` § Current Phase describes the extension harness as "tests 2 + 3 SKIPPED" and records
  an unresolved iter-099 capture regression.** The live code has those tests re-enabled and CI green
  at 6/6. Whether that block is stale narrative from an older numbering series, or an open issue, I
  could not determine — the loop numbering does not map. **Flagged, not resolved** (§13).

---

## 13. Recommendations to the CEO — surfaced only, nothing applied

Per the brief, no `CLAUDE.md` edit is proposed. Several of these would require one; they are yours.

1. **`TRUSTED_PROXY_HOPS` — the guidance is now correct, and the direction of danger has flipped.**
   If you read a suggestion before this correction landed, **discard it.** The runbook now says
   under-setting is the outage. Follow the current one, and keep step 4: if logins start returning
   429, unset and redeploy.
2. **Should the container port stay published?** `compose.hostinger.yaml` publishes `3000:3000`. That
   is the mechanism behind both the loop-53 near-miss and the §3.1 residual, and it is the only
   structural fix — closing it would make the measurement trustworthy by construction rather than by
   threshold. I do not know what else depends on it.
3. **#57 criterion-3 threshold.** UNSCOREABLE since loop 48 — **six loops**, now the oldest blocking
   decision in the set. It blocks #57 retirement and leaves loop 46's instrumentation inert.
4. **#216 shadow-DOM capture semantics.** The row's status cell now carries the blocker (loop 51), so
   it is machine-visible. It is also the **only** lever that can clear D-1, which will be 11 at loop
   55, and the extension has had no source change in ten loops (§5).
5. **Field-capture Phase 2** — unchanged since MR-033. Requires new capture and therefore a
   public-claim update. Decide before it is scoped.
6. **P-6: enforce or retire.** Five inferred acks, no stop. Your standing *"don't stop until
   complete"* directive is plausibly the intended override; if so, retiring P-6 is more honest than
   continuing to log against a rule nobody applies. **This is the second meta-review to ask.**
7. **Optional: a control-character scan in `quality-gate`.** One script, green on day one, catches
   the loop-52 `0x08` class (§4.3). Not endorsed for a loop of its own — fold it in or decline it.
8. **Optional: schedule the remaining pool sweep, or decide not to.** ~84 rows unsampled. §6 shows
   the head is clean of phantoms, so this is lower-value than when MR-033 raised it. My
   recommendation is **decline it** and let P-11 handle rows at selection time.
9. **`CLAUDE.md` § Current Phase is stale about the extension** (§12, last bullet). Whether that
   matters depends on whether anything still reads it as current.

---

## 14. Strikes

- **S-1 (loop 53) — the proxy-depth inference was unsound in the outage direction**, and was
  asserted as *"stated with its limit"* while the limit it stated was the benign one. Live in
  shipped code and in a runbook written to be followed. **Self-corrected at loop 54 before any
  harm**; recorded because the loop-53 entry claimed a rigour it did not have.
- **S-2 (loop 54) — the correcting commit left two JSDoc comments describing the removed rule.**
  `proxy-observation.ts:84` and `:104` still gate on "the minimum". Same class as the defect being
  corrected, in the same file. Two lines.
- **S-3 (control) — P-6's hard stop is five loops overdue** and was not addressed despite MR-033
  naming it. Either the standing directive overrides it, in which case retire it, or it binds, in
  which case it has been ignored five times.

**No strike on loop 51 or loop 52.** Loop 51 applied MR-033's action list and re-verified every item
before applying. Loop 52 corrected its own meta-review with evidence and declined a proposal on the
strength of that correction (§8). MR-033's §5 flags on **#113** and **#123** remain unactioned — that
is **MR-033's gap**, not loop 51's: those rows were sample findings and were never placed on the §13
action list. Carried forward to §11's bookkeeping.

---

## 15. Verdict

**The improvement loop is functioning, and its failure surface has moved.**

Two windows ago the pool was corrupting itself and phantoms were being selected at score 14. Today
the validator is clean, the head contains no phantoms across a 17-row score-weighted re-sample, and
the single worst defect in this window — a security inference that pointed at an outage — was found
and fixed **inside 24 hours, by the coordinator, on a question it had just handed to its own
reviewer.** That is the loop working.

What has not moved is upstream of the loop: **six standing CEO decisions, one of them unscoreable
for six loops, one of them the sole lever that can clear a control flag that has been climbing for
ten.** The debt ratio reads 11.00 and measures bookkeeping. The coordinator is choosing its own work
because the scored band is nearly empty of things that are simultaneously unblocked, verified, and
completable — and §6 shows that is an accurate reading of the pool, not an excuse.

**The constraint on this system is no longer pool hygiene or edit discipline. It is decision latency.**
