# MR-031 — Meta-Review (Mode 4, governance)

**Date:** 2026-09-24 · **Agent:** `meta-coordinator` · **Counting:** NON-counting
**Window:** loops 42, 43, 44 (MR-030 closed at loop 41) plus two out-of-loop commits.
**Scope guard:** this artifact is the only file created. No product code. `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` untouched.

**Method.** Every load-bearing claim below was checked against the file or against git. Where a
claim could not be verified it is marked **UNVERIFIED** in §12 rather than asserted. Counts were
produced by parsing `IMPROVEMENT_BACKLOG.md` and by re-running the parse against six historical
commits, not by reading narrative.

---

## 1. Lead: three things wrong in this window

**W-1 — Loop 44 labelled a self-filed row as `top-score`, and it was not the top score.**
The entry reads: *"`top-score` among genuinely-open rows — #225 (9)."* Verified against the backlog:
**#225 scores 9**. **#95 scores 15** and **#171 scores 15**; both were verified genuinely open at
loop 41 with file:line evidence, neither is CEO-blocked, and nothing since has disturbed them
(re-verified in §13). Eight further rows score 13. #225 was **filed by loop 42** (`Birth iter:
2026-09-24 L42`) and selected two loops later under a label asserting the scoring rule chose it.

This is the exact criticism MR-028 made of loop 34 and that MR-029 converted into a required label
(`directed — self-filed`), which **loop 39 honoured correctly**. Loop 44 regressed on a discipline
that had already been adopted and demonstrated. Loop 37 shows what the honest move looks like:
*"re-scored, and I am saying so rather than claiming `top-score`."* Loop 44 neither re-scored #225
nor used the directed label.

The work itself is defensible — auth rate limits keyed on a spoofable header is worth elevating.
The **label** is not, and the label is what the control plane reads.

**W-2 — A tenth commit shipped after loop 44 closed and appears in no artifact.**
`074140a chore(deploy): make the TRUSTED_PROXY_HOPS switch actually reachable` — 2026-09-24
13:36:34, three minutes after loop 44's commit `856b384` (13:33:55). It adds one line to
`.github/workflows/deploy.yml` and nine to `compose.hostinger.yaml`. `grep TRUSTED_PROXY_HOPS`
across `CHANGELOG.md`, `ITERATION_LOG.md` and `SYSTEM_HEALTH.md` returns **two** hits, both from
loop 44's own entry, both describing the switch as *not yet wired*: *"a deploy-env change with no
code edit"* (log) and *"then set the var — no code change"* (health). Both are now stale in the
**understating** direction — the plumbing already exists.

This is the second instance of the same mechanism. MR-029 found the first: `e8c1047` shipped 12
screenshots and filed a row one minute after loop 38 closed, while loop 38's entry read "0 created".
Both were disclosed in the commit message and in neither case was anything hidden — but a loop's
accounting that stops at the loop's own commit is not an accounting.

**W-3 — A delegated WCAG conformance ruling is load-bearing in CI and still has no primary source.**
Loop 38 accepted `a11y-architect`'s ruling that SC 1.4.11 and 1.4.1 do not apply to the health rail,
and locked that exemption into three Playwright tests. MR-029 flagged the risk: *"If the 1.4.11
ruling is wrong, those tests manufacture evidence of compliance — worse than an untested defect. No
primary-source citation appears anywhere."* Verified today at `apps/web-app/e2e/app/dashboard/
v2-a11y.spec.ts:543-595`: the block cites SC **numbers** (`1.4.11`, `1.4.1`) and explains the
reasoning in comments, but contains **no `w3.org` URL, no quoted SC text, no Understanding-doc
reference**. The finding has now survived MR-029 and MR-030 unaddressed. Cost to close: one citation
line. See §7.

---

## 2. What the window got right, briefly

Recorded so the criticism above is not read as a verdict on the work.

- **Loop 43 is the best loop in this review's history on the dimension the product exists for.** It
  selected the genuine top score (#108, 16), verified the premise, found it false, and **stopped
  before writing a line**. Verified: `buildSOP(input: ProcessEngineInput)` takes one session;
  `grep -rn runCount packages/process-engine/src` → **0 hits**; `generatedAt?` is optional at
  `packages/process-engine/src/templateTypes.ts:245` and `:351`. Building the row as written would
  have printed *"Based on 47 runs"* on a customer-facing SOP with no such number in existence.
- **Loop 43 then narrowed its own published claim the same day** (`547493c`). The renderer fix is
  real and verified — `markdownRenderer.ts:316` and `:602` now spread `generatedAt` conditionally and
  the only surviving `new Date()` matches are the two explanatory comments — but the "reachable"
  framing was too strong, and the writer side (`ingestion.ts:147` → `sopTemplates.ts:155,277,424`,
  `types.ts:592` where the field is **required**) means fresh artifacts never hit the fallback. The
  correction is in the log, in `CHANGELOG.md` and in its own commit.
- **Loop 42 cleared D-1 with work rather than an acknowledgement**, after seven loops of treating a
  correctly-firing signal as noise. Verified shipped: `analytics.ts:630,636`
  (`extension_installed` / `extension_session_active`), `api/analytics/extension/route.ts`,
  `background/index.ts:539` `onInstalled` → `initTelemetryAlarm()` + `recordInstall(details)`,
  dedicated `ledgerium-telemetry-daily` alarm at 1440 min.
- **Loop 44's deliberate non-fix is the right call and is argued on evidence, not caution.** Six
  call sites confirmed centralised (`admin/bootstrap`, `analytics/extension`, `auth/forgot-password`,
  `auth/signup`, `invites/accept`, `lib/auth`); zero raw `x-forwarded-for` reads remain outside
  `lib/client-ip.ts` and test files; three of those (`lib/auth.ts:33`, `signup:52`,
  `forgot-password:25`) key `checkAuthRateLimit` on the value.

---

## 3. The write-path defect: two mechanisms, one symptom — and why a rule is the wrong answer

**Mechanism 1 (MR-030):** rows closed in the narrative, never struck in the backlog. Nine found.
**Mechanism 2 (this window, `6429bd0`):** rows struck correctly, but the closure script **appended**
a status cell instead of replacing one, leaving a duplicated tail whose last cell read `open`. Nine
found, none of them the same rows.

MR-030 proposed rule (a): *a loop cannot close while its iteration-log entry names a row that is not
struck.* **That rule would not have caught mechanism 2** — those nine rows *were* struck. It
addresses one of two mechanisms.

**Verdict: no new rule. The honest root cause is ad-hoc markdown mutation by script against a file
with no schema, and the correct answer is a validator.** A rule asks the agent to be careful; the
agent has now been careful and produced the defect twice by two different routes. Below is a
specification I ran against the live file before proposing it.

### 3.1 Validator specification — tested, with measured false-positive rates

Rows are the lines in `### Standard Backlog` whose first cell matches `^~*\s*\d+\s*~*$`.
Today: **219 rows, 108 struck, 111 open.**

| ID | Assertion | Measured today | Would it have caught the nine? |
|---|---|---|---|
| **V1** | A struck row's **final** cell must not exact-match `/^\*{0,2}\s*(open\|new)\s*\*{0,2}$/i` | **0 violations** | **Yes** — every stale tail ended in a bare `open` cell |
| **V2** | Every row has exactly **13** cells | **19 violations** (7×14, 4×15, 7×16, 1×17) | **Yes** — the nine had ~24 |
| **V3** | No cell except the last may exact-match the status vocabulary | **0 violations** | Yes (redundant with V1) |
| **V4** | Every row number named in an `ITERATION_LOG.md` `**Follow-ups:** … closed (#N)` clause must be struck | not run — needs the log parser | **This is the one that catches mechanism 1** |
| **V5** | Every open row carries a parsable `**score**` cell | **2 violations** (#190, #193) | n/a — see §4 |

**Exactness matters more than it sounds.** The naive version of V1 — *substring* `open` in the last
cell — produces **13 false positives** on today's file, because status cells contain prose like
*"DOM node when sidebar is open"* and *"one logical outcome"*. A grep-shaped validator would have
been abandoned within a week. V1 must be an anchored exact match after stripping bold markers.

**V2 must ship as a ratchet, not a gate.** The 19 current offenders are legacy rows whose
descriptions contain a literal `|` from TypeScript union types (`'full' | 'essential'`), which splits
the cell. That is the confirmed root cause named in `6429bd0`'s own message for #148 and #224. Either
escape those 19 to `\|` first, or allowlist them by row number and fail only on new ones.

**V5 should warn, not fail.** #190 and #193 are unscored on purpose — they are governance rows
awaiting CEO approval. See §4, where their unscored status turns out to explain a reporting
discrepancy.

### 3.2 Where it runs

**Recommended: `scripts/validate-backlog.mjs`, invoked as a step in the `quality-gate` job of
`.github/workflows/deploy.yml`, before `pnpm test`.** `scripts/` already exists; `quality-gate`
already gates `build-and-push` (verified: `deploy.yml:65` `needs: [quality-gate, e2e-web-app,
e2e-extension]`). This puts the check in git history and in the release path, and touches no
permission config.

**Rejected: a vitest test at repo root.** Verified `vitest.config.ts:6-9` includes only
`packages/*/src/**/*.test.ts` and `apps/*/src/**/*.test.ts`. A root-level `tests/*.test.ts` would be
silently collected by nothing — adding a gate that never executes, which is the failure mode this
whole line of work exists to prevent.

**Rejected without CEO approval: the `PostToolUse` hook chain.** `.claude/settings.json:121-141`
already runs three inline `Edit|Write` hooks and would host this cleanly, but it is the agent's own
control config — the same class as #212 P-5. Not self-approvable. Offered as an option, not taken.

**Not proposed: any edit to `CLAUDE.md`.** V4 makes MR-030's proposed rule (a) enforceable in CI
without writing it into the operating rules at all. That is strictly better: it fails loudly, it is
diffable, and it does not add a clause the agent must remember.

**Incidental finding while checking hook wiring — an apparent contradiction, resolved, no strike.**
Loop 27 reported *"`.claude/hooks/` holds 7 scripts and settings.json references none of them"*;
MR-030 struck row #4 citing *"PostToolUse audit hooks `.claude/settings.json:92+`"*. Both are
correct about different things: the hooks **are** wired, as **inline commands**; the seven
`.claude/hooks/*.sh` **script files** are referenced by nothing and are dead code. MR-030's `:92+`
points at the `PreToolUse`/Bash block (PostToolUse begins at `:121`), which the `+` makes loose
rather than wrong.

---

## 4. Open-row count: MR-030's numbers reconcile — under a definition nobody stated

I expected to find an arithmetic error here and did not. Re-running the parser against six commits:

| Commit | Point in time | Open (parsed) | Reported |
|---|---|---|---|
| `6e44ead` | after loop 41 | **119** | 117 |
| `d20af8a` | after MR-030's 9 strikes | **110** | 108 |
| `871e29a` | after loop 42 | **111** | — |
| `HEAD` | now | **111** | — |

The **delta** is exactly 9, so the strike count was right. Both endpoints are **exactly 2 higher**
than reported — and exactly **2 open rows carry no parsable score (#190, #193)**. 119 − 2 = 117;
110 − 2 = 108. The fit is perfect at both ends.

**Verdict: not an error. An unstated definition** — "open rows" meant "open rows the scoring rule can
reach". That is a defensible definition and arguably the more useful one. But it is the same defect
MR-030 itself named in its §5 about the debt ratio: *"two different quantities are being reported
under one name."* Today's figures are **111 open / 109 scored-and-open**. Whichever is used, say
which.

---

## 5. Q1 — Is P-11 earning its cost?

**No, it is not rarely useful. It changed the outcome in roughly half of all loops since it was
adopted, and its two biggest saves were catastrophic-class.**

P-11 (*verify a row against the file before selecting it*) was proposed at MR-026 and adopted as
practice at **loop 30**. Loops 30-44 = **15 loops**.

**Outcome changed (7 of 15 = 47%):**

| Loop | What verification changed | Class |
|---|---|---|
| 31 | Row offered a binary (wire in / delete); reading `sensitivity.ts` found a third and better option, plus that `ssn`/`credit-card` are not HTML input types — a category error, not a missing screen | re-scoped the work |
| 32 | Three apparent dashboard defects investigated and dismissed as fixture artefacts (server `stats.*` omitted by the mock) | **3 false rows prevented** |
| 37 | A probe inside `globalSetup` disproved loop 36's own single-run-race diagnosis; the real cause was `reuseExistingServer` | wrong fix prevented |
| 38 | Measuring first (amber 2.15:1, green 2.28:1) then applying the applicability test turned "repaint" into "do not repaint, pin the reasoning" | **157-site repaint prevented** |
| 41 | #102 (16) was already shipped in full; the top-score rule was pointing at finished work | **re-doing shipped work prevented** |
| 43 | #108 (16) could not be built as written; `runCount` exists nowhere in process-engine | **fabricated evidence on a customer document prevented** |
| 44 | A sixth call site the row did not name, carrying its own `split(',')[0]!` | scope corrected |

**Verification performed, outcome confirmed (loops 30, 33, 35, 36, 39, 40, 42):** 7 loops where the
check cost time and found nothing wrong. Loop 40 is the honest worst case — the coordinator's two
greps looked like contradictions of the delegate's report and both turned out to be the coordinator's
own bluntness, with the report accurate throughout.

The same discipline pre-dates the rule and fired at **loops 27, 28 and 29** — loop 29 (#217 filed off
a wrapped grep line; implementing it would have "fixed" correct copy) is the evidence that produced
P-11 in the first place. Over loops 25-44 the rate is **10 of 20 = 50%**.

**Cost, stated plainly.** Loop 41 and MR-030 were consumed almost entirely by verification — roughly
2 of 20 slots, ~10% overhead. Against a ~47% outcome-change rate with two catastrophic-class saves,
that is not close.

**The one real weakness, and it is a scope weakness not a value weakness.** P-11 is **row-scoped** and
produces **pool-scoped false assurance**. Loop 41 applied it faithfully to 14 of 117 rows, declared
the head clean, and MR-030 then found nine more phantoms in the other 88%. P-11 tells you the row you
are about to select is real; it says nothing about the queue you selected it from, and the loop-41
entry reads as if it did. **Recommendation (practice, not a rule): when P-11 disqualifies a row,
treat that as evidence about the pool, not about the row, and either finish the sweep or state the
sample size in the same sentence as the conclusion.** Loop 41 did state it; MR-030 still had to do
the work.

---

## 6. Q3 — Self-correction: rate, direction, and the category still slipping

**The rate is flat-to-rising; the *latency* is improving sharply; and one claim category is still
slipping.**

**Self-caught, in-loop (12 events):** loop 26 (arithmetic corrected pre-commit), 27 (three record
claims corrected: `git push` is in the deny list, hooks unwired, 828 ≠ 773), 28 (own typecheck error),
29 (#217 premise), 31 (test count measured by stash rather than derived), 32 (two PNGs byte-identical
at 263,233 bytes and the size assertion passed — caught by opening the images), 37 (own loop-36
diagnosis), 40 (own greps), 41 (#102), MR-030 (own #172/#173 citations, corrected at strike time),
43 ("reachable" narrowed same day), plus the out-of-loop nine-row sweep.

**Caught by someone else (4 events):** loop 32's coverage claim (by **MR-027**), loop 34's self-filed
`top-score` (by **MR-028**), loop 38's undisclosed commit + row (by **MR-029**), loop 41's 12% sample
(by **MR-030**).

*Correction to the framing in the brief: the overstated coverage claim was **loop 32's**, not loop
34's. MR-027 §5 measured it — `components/dashboard-v2` holds 31 of 828 `--content-tertiary` uses
(3.7%) and **0 of 90** `.btn-primary` call sites, so the visual evidence could not show the button
fix at all. Loop 34 was the remediation, and its own entry says so.*

**Direction.** Externally-caught events cluster at loops 32, 34, 38 and 41 — one per meta-review,
MR-027 through MR-030. In loops **42-44 the meta-review found no claim the loop had not already
corrected itself**; the only external catch in this window was of a *delegate's* number, not the
coordinator's. The detection point has also moved earlier: loop 29 caught its error before
implementing, loop 41 before selecting, loop 43 before writing a line. **Improving.**

**The pattern in *which* claims get overstated — three categories, only one still live.**

1. **Derived numbers** (test counts, LOC, usage counts): 773→828, +11→+10, "13 skips"→8, "89"→73,
   "five call sites"→six. **Largely fixed.** The remedy was adopted at loop 31 — measure by
   `git stash` and re-run, never derive — and loops 43 and 44 both did exactly that.
2. **Coverage claims** ("this is now tested"): loop 32. **Caught once, remediated once, not recurring.**
3. **Reachability / exposure claims** ("this defect fires in production"). **Still live.** Loop 29
   (#217 "survives on the support page"), loop 36→37 (flake diagnosis), loop 43 ("reachable"). The
   failure shape is identical every time: the claim is formed by reading the **consumer** side — the
   renderer, the exporter, the type declaring a field optional — and asserted without checking the
   **producer** side that decides whether the bad state can exist. Loop 43 did check the writer, and
   found the fallback was not firing on fresh artifacts — one day after publishing.

**Cheap discipline that would catch category 3 earlier, and it is one sentence, not a process:**
*before asserting a defect is live, name the writer that would have to emit the bad state, and cite
it.* Loop 43's own correction is the template — `ingestion.ts:147` → `sopTemplates.ts:155,277,424` →
`types.ts:592` (required). That is two greps. Recommended as practice; **no rule, no CLAUDE.md edit.**

---

## 7. Q4 — Delegate verification: adequate for numbers, lucky-adjacent for rulings

**Split verdict.**

**Adequate, and cheaply so, for arithmetic and locators.** Loop 44's catch required only noticing
that the delegate's report contradicted *itself* — "27 test cases" against its own "+24". Verified
independently: `apps/web-app/src/lib/client-ip.test.ts` contains exactly **24** `it(` blocks, and the
suite moved 3093 → 3117. That is not luck; internal inconsistency is the cheapest possible signal and
the coordinator read for it. Loop 42 is stronger: the delegate **ran unit tests only**, and the
coordinator ran the real-Chrome harness (6/6) itself because the Extension Reliability Invariant
requires it. That is a caught **validation gap**, not a caught false claim — a harder thing to notice.
The field-capture review is the largest sample: **2 of 5 specialists made factual errors** (the
architect reported the golden fixtures missing — 12 exist on disk; the PM reported a renderer the
architect did not mention), both reconciled by the coordinator reading files.

**Not adequate for rulings, by explicit design, and it has already cost something.** P-12 as adopted
at loop 30 says: keep verifying subagent locators and numbers, **stop re-deriving their reasoning**.
That is a sensible economy for most work and a bad one for conformance judgements. Loop 38 delegated
a WCAG applicability ruling to an imported markdown prompt and locked the result into three CI tests.
The locks were mutation-tested, which proves they bite — it does not prove the exemption is correct.
Three meta-reviews have now flagged it (§1 W-3) and nobody has spent the one line it would take.

**Refinement, narrow and testable: when a delegate's output is a *conformance or applicability
ruling* — not an implementation — the loop must record a primary source (spec text, SC URL,
Understanding doc) alongside it.** This is an exception carved out of P-12, not a reversal of it. It
would have applied to exactly one loop in twenty.

---

## 8. Q5 — The blocked-decision pile, counted

Counted from the artifacts, not from memory.

**A. Backlog rows unselectable without a CEO judgement — 5**

| Row | Blocked on | Verified |
|---|---|---|
| #190 | MR-020 C1–C3 — edits `CLAUDE.md` | status cell: *"awaiting CEO approval (edits CLAUDE.md)"* |
| #191 | Stripe card-trial stacking; pricing decision (a/b/c) | status cell: *"awaiting CEO decision"*; defect confirmed at `billing/checkout/route.ts:376-387` |
| #193 | MR-021 P-1/P-2 — edits `CLAUDE.md` | status cell: *"awaiting CEO approval (edits CLAUDE.md)"* |
| #212 | P-5 — edits `.claude/settings.json` | verified still unapplied: the `PreToolUse`/Bash blocklist covers `curl`, `wget`, `rm -rf`, `sudo`, `git reset --hard`; **`git commit` absent** |
| #216 | shadow-DOM capture semantics, under the Extension Reliability Invariant | row text; `composedPath()` absent from `content/` |

**B. Rows blocked on a fact or a ruling rather than a judgement — 2**

| Row | Blocked on |
|---|---|
| #225 | **The VPS reverse-proxy XFF hop count.** Blocks a real auth fix — login, signup and password-reset limits remain header-bypassable. Note §1 W-2: the env var is **already threaded through deploy** by `074140a`, so this is now a one-value decision with zero code and zero deploy work. |
| #108 | Cross-run aggregation (architecture), **plus** the banked `growth-strategist` ruling that `Confidence: 82%` is per-step *label* confidence (`contentEnricher.ts:918-920`), not a run share, and should be relabelled |

**C. MR-030 carry-over — 2 blocks**

- The **18 PARTIAL re-scopes** (approve as a block, or defer to the selecting loop).
- **2 score revisions flagged inside that block**: #8 (11 unguarded routes → **25**) and #107
  (16 is too high after loop 41's re-scope).

**D. Non-backlog decisions — 3 blocks, 8 individual decisions**

- **ECC `hooks/` + `.mcp.json` wiring.** Verified: `.mcp.json` does not exist; the 7
  `.claude/hooks/*.sh` scripts are referenced by nothing. MR-029 §47: *"still unwired, still awaiting
  the explicit decision… No urgency; it should close rather than carry."* Open since MR-029.
- **Chrome Web Store: 2 human actions.** Create the Dashboard listing —
  `apps/web-app/src/lib/config.ts:16` still reads
  `'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder'` — and one real Chrome
  recording under Invariant rule 6.
- **Field capture: 6 decisions**, `docs/features/field-capture/FIELD_CAPTURE_REVIEW_001.md` §8 —
  Phase 1 approval; the public-claim update for phases 2-4; the health/HR/legal lexicons in
  `sensitivity.ts`; accepting the bare-personal-names residual gap; baseline-first measurement; and
  sequencing against #148.

**Total: 12 decision blocks / 17 individual decisions.**

---

## 9. Is the loop drifting to low-value work because the high-value work is blocked?

**No — and the evidence points somewhere less comfortable.**

Of the top of the queue: #108 (16) **is** blocked; #107 (16) needs re-scoring before anyone touches
it (MR-030). But **#171 (15) and #95 (15) are neither blocked nor unverified** — both were checked at
loop 41 and both re-verified by me today (§13). Below them, eight rows at 13 are open: #110, #124,
#125, #129, #143, #150, #157, #177.

So when loop 44 selected a **9**, the two 15s and eight 13s were all available. **The blocked pile
did not cause that pick; the self-filed label did** (§1 W-1). Attributing it to decision-blockage
would let the real cause through.

The blocked pile is nonetheless real and it is growing — 12 blocks, three of which (#190, #193,
ECC wiring) have been open across multiple meta-reviews with no movement, and one of which (#212)
has been open since MR-024.

**The single decision that unblocks the most value is #225 — the VPS reverse-proxy XFF behaviour.**
It is one fact, not a judgement; the code and the env plumbing are already shipped and tested; and it
closes a bypassable rate limit on **login, signup and password reset** — the three highest-consequence
auth paths in the product. Nothing else on the list converts a single answer into a live security fix
with zero further engineering.

**Second: #191.** Confirmed real at `checkout/route.ts:376-387`, it is live chargeback exposure, and
it has been blocked since loop 7.

---

## 10. Q6 — Follow-Up Debt ratio, with the arithmetic shown

Three readings, because the ratio means different things depending on the window, and MR-030's §5
caveat about that still applies.

**(a) Window-local (loops 42-44), created vs closed:**
- loop 42: closed **#148**; created **#225, #226** → 1 closed / 2 created
- loop 43: 0 / 0 (#110 advanced to partial, #108 re-scoped — neither closed)
- loop 44: 0 / 0 (#225 centralised, explicitly **not** closed)

**1 closed / 2 created = 0.50**

**(b) Trailing 10 counted loops (35-44):**
closed 1+0+1+0+1+1+1+1+0+0 = **6**; created 1+0+0+0+0+0+0+2+0+0 = **3** → **6 / 3 = 2.00**
Including MR-030's 9 strikes (Mode 4, non-counting): **15 / 3 = 5.00**

**(c) MR-030's row-range method, extended to today:**

| Range | Total | Closed | Open | Ratio |
|---|---|---|---|---|
| 185–224 (MR-030's window) | 40 | 32 | 8 | **0.800** |
| 185–226 (same window + this window's 2 new rows) | 42 | 32 | 10 | **0.762** |
| 203–226 (the loop 26-44 era) | 24 | 18 | 6 | **0.750** |

Open in 185–226: #189, #190, #191, #193, #211, #212, #216, #223, #225, #226.

**Reading.** (b) is flattering and nearly meaningless — it is high because loops 43 and 44 created
nothing and MR-030 struck nine legacy rows. (c) declines from 0.80 to 0.76 for the arithmetically
trivial reason that #225 and #226 entered the range and neither closed. (a) at 0.50 is the honest
number for this window: **the window consumed one row and produced two.**

MR-030's structural caveat stands unchanged and I will not repeat it at length: rows 185+ are
self-filed during the recent series and close fast by construction. The ~100 legacy rows below 185 —
where MR-030 measured a **~13% phantom rate** — are in none of these denominators.

---

## 11. Control-rule status — all clean, no changes proposed

| Rule | State | Verdict |
|---|---|---|
| **D-1** (reverse portfolio drift, N=5) | **2.** Loop 42 cleared it on the extension surface; loop 43 touched `packages/process-engine`, which is **not** a D-1 surface (the D-1 list is extension-app, segmentation-engine, normalization-engine, policy-engine); loop 44 was web-app | **No change.** MR-030's withdrawal of MR-029's "inert" verdict is vindicated — the rule cleared as soon as someone looked for clearing work |
| **Meta-review cadence** (3 loops) | MR-030 after loop 41; loops 42, 43, 44; MR-031 on time | **No change.** MR-028 declined P-15 and the cadence has held since without a control enforcing it. V4/§3.2 would incidentally make the *backlog* half enforceable; the cadence half still runs on memory |
| **Area saturation** (3 consecutive) | extension (42) → process-engine (43) → web-app (44) | **Clean.** Coarse 6-loop backstop at 1 |
| **Agent rotation** | `backend-engineer` (42) → coordinator + `growth-strategist` (43) → `backend-engineer` (44) | **Clean**, 4+ trigger distant |
| **P-11** | See §5 | **Keep.** One practice refinement (pool-scope), no rule |
| **P-12** | See §7 | **Keep**, with one narrow carve-out for conformance rulings |

**Unpushed backlog: 10 commits**, `main` ahead of `origin/main` by 9 at the last measurement plus
`074140a`. MR-028 flagged this exact condition at 9 commits / 4 days *"with no loop mentioning it"*.
It is mentioned here. Pushing is a CEO action (`Bash(git push *)` is in the settings deny list, per
loop 27's correction) — this is a note, not a criticism of the loop.

---

## 12. What I could not verify

Stated rather than asserted.

- **Whether loop 44's `+24 tests` corresponds to 24 *passing* tests in a clean run.** I verified the
  file contains 24 `it(` blocks and that the reported totals (3093 → 3117) differ by 24. **I did not
  run the suite** — this is a Mode 4 review and running it is a product-adjacent action I chose not
  to take. The arithmetic is consistent; the execution is unverified here.
- **Whether the `a11y-architect`'s 1.4.11 / 1.4.1 exemption is substantively correct.** I verified
  only that no primary source is cited. Ruling on WCAG applicability is outside what I can settle by
  reading this repository.
- **The real hop count in front of the production app.** Confirmed unknowable from the repo, which is
  loop 44's own claim and the reason #225 is blocked.
- **Why my parse of the open-row count differs from the reported figure.** §4 shows a definition that
  fits both endpoints exactly; I could not confirm that was the intended definition, only that it is
  the one consistent with the numbers.
- **The exact provenance of commit `074140a`.** Its reflog entry and timestamp (13:36:34, three
  minutes after loop 44's commit) are verified; whether it was intended as part of loop 44 or as a
  separate out-of-loop correction is not recorded anywhere I could find.

---

## 13. Loop 45 endorsement

**PRIMARY: #171 (score 15) — ADM-002 PR-11, inject `referenceNowMs` into `lib/admin-operations/
queries.ts`. NOT decision-blocked.**

Re-verified today, not taken from loop 41:
- `queries.ts:129` — `const now = new Date();` inside `export async function getUserVolume(...)`
- `queries.ts:374` — `const now = new Date();` inside `export async function getSystemHealth()`

Two determinism leaks in exported functions, on a shipping admin surface. It is the
`referenceNowMs` single-upstream-clock-boundary pattern that iter 037 established and that loop 43
just applied to the SOP renderer — a precedent, not an invention. It is a prerequisite for #150 (13,
open) and adjacent to #177 (13, open), so it unblocks rather than merely closes. Area `web-app/admin`
makes loop 45 the second consecutive web-app loop — under both the 3-consecutive rule and the
6-loop coarse backstop. D-1 advances 2 → 3, under N=5, no acknowledgement required.

**Required correction before work starts (a P-11 exercise, not a blocker):** the row cites
`queries.ts:118-119,32…`. Those line numbers have drifted; the live sites are **:129** and **:374**.
Correct the row when selecting it.

**ALTERNATIVE: #95 (score 15) — PIB-P09 `chipsRenderedCount` in `dashboard_v2_viewed`. NOT
decision-blocked.** Re-verified: `grep -rn chipsRenderedCount apps/web-app/src` → **0 hits**;
`dashboard_v2_viewed` is declared at `analytics.ts:262` without the field. ~10 LOC, and it makes the
chip-click-rate denominator stable, which is one of the external-launch gates. Equal score; I rank it
second only because #171 closes a core-invariant leak and #95 is instrumentation.

**Explicitly not endorsed, with reasons:**
- **#108 (16)** — blocked (§8).
- **#107 (16)** — MR-030 flagged the score as too high after loop 41's re-scope. Re-score first.
- **#110 (13)** — tempting, because loop 43 closed 2 of its 3 leaks and the third is verified open
  (`workflowInterpreter.ts:161` `computedAt: new Date().toISOString()`). But the remainder also
  contains the `sopSchemaVersion` closed union and `migrateSOP`, and `grep -rn "sopSchemaVersion\|
  migrateSOP" packages/process-engine/src` → **0 hits** — that is a schema-versioning design, not a
  one-line injection. It is not the cheap finish it looks like. Worth saying so the next loop does
  not select it expecting an hour's work.

---

## 14. Verdict list

**Strikes (3)**

| # | Finding | Evidence |
|---|---|---|
| **S-1** | **Loop 44 labelled a self-filed row as `top-score` and it was not the top score.** Regression on a discipline adopted at MR-028/MR-029 and honoured at loop 39 | #225 = 9, filed `L42`; #95 = 15 and #171 = 15 open and unblocked; 8 rows at 13 |
| **S-2** | **Commit `074140a` is in no artifact.** Second occurrence of the loop-invisible-commit pattern (first: `e8c1047` at loop 38, found by MR-029) | reflog + timestamp; `grep TRUSTED_PROXY_HOPS` across all four artifacts returns only loop 44's own lines, which describe the switch as not yet wired |
| **S-3** | **A delegated WCAG conformance ruling is locked into CI with no primary source**, flagged by MR-029 and unaddressed through MR-030 and MR-031 | `v2-a11y.spec.ts:543-595` — SC numbers, no `w3.org`, no quoted text |

**Verdicts where the answer is "no change" — stated plainly rather than dressed as a finding**

- **P-11: keep, unchanged.** 47% outcome-change rate over 15 loops. One practice note on pool-scope
  (§5), not a rule.
- **Meta-review cadence: keep at 3 loops.** On time again; MR-028's decline of P-15 holds.
- **D-1: keep, unchanged.** It cleared the moment someone looked for clearing work.
- **Area saturation, agent rotation: clean, no action.**
- **The write-path defect: no new rule.** MR-030's proposed rule (a) addresses one of two mechanisms
  and would not have caught this window's. A validator replaces it (§3).

**Refinements proposed (2, both narrow)**

- **R-1 — Backlog validator**, V1/V2/V4 as specified in §3.1, run from `scripts/validate-backlog.mjs`
  in the `quality-gate` job. Tested against the live file; false-positive rates measured. No
  `CLAUDE.md` edit, no `.claude/settings.json` edit.
- **R-2 — Carve-out from P-12:** when a delegate's deliverable is a *conformance or applicability
  ruling* rather than an implementation, record a primary source with it. Would have applied to one
  loop in twenty.

**Practice note (1, no enforcement)**

- Before asserting a defect is live, name and cite the **writer** that would have to emit the bad
  state. Two greps. Addresses the one overstatement category still slipping (§6).

---

## 15. CEO decisions requested

1. **#225 — what sits in front of the app on the VPS, and does it append or replace
   `x-forwarded-for`?** One fact. The code and the deploy env plumbing are already shipped and
   tested; the answer sets `TRUSTED_PROXY_HOPS` and closes a bypassable rate limit on login, signup
   and password reset. **This is the single highest-value unblock available** (§9).
2. **#191 — the Stripe reverse-trial + card-trial stacking (a / b / c).** Confirmed real at
   `checkout/route.ts:376-387`; live chargeback exposure; blocked since loop 7.
3. **R-1, the backlog validator — approve?** It is ~80 lines in `scripts/`, one step in
   `quality-gate`, and it subsumes MR-030's proposed write-path rule without editing `CLAUDE.md`. If
   you would rather it run as a `PostToolUse` hook instead, that edits `.claude/settings.json` and
   needs the same approval as #212 P-5 — I have not assumed it.
4. **MR-030's 18 PARTIAL re-scopes — approve as a block, or defer to the selecting loop?** Still
   open, now one meta-review old. Includes the two flagged score revisions (#8 → 25 routes;
   #107 re-score).
5. **The three long-stale governance blocks: #190, #193 (both edit `CLAUDE.md`), #212 P-5.** Each has
   survived two or more meta-reviews. A "no" closes them and shortens the list; carrying them costs
   more than declining them.
6. **ECC `hooks/` + `.mcp.json` — decide or delete.** `.mcp.json` does not exist; the 7
   `.claude/hooks/*.sh` scripts are referenced by nothing. MR-029 said this should close rather than
   carry; it has carried.
7. **Field capture Phase 1** (`FIELD_CAPTURE_REVIEW_001.md` §8, decision 1) — and the five other
   decisions in that section if you want the later phases sequenced.
8. **Chrome Web Store:** the Dashboard listing (`apps/web-app/src/lib/config.ts:16` is still a
   literal `placeholder` URL) and one real Chrome recording. Both are human actions; neither can be
   done from here.
9. **10 commits are unpushed** (`main` ahead of `origin/main`). Pushing is yours — `Bash(git push *)`
   is in the settings deny list.
