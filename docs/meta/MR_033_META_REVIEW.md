# MR-033 — Meta-Review (Mode 4, governance)

**Date:** 2026-09-27 · **Agent:** `meta-coordinator` · **Counting:** NON-counting
**Window:** loops 48, 49, 50 (MR-032 closed at loop 47).
**Scope guard:** this artifact is the only file created. No product code. `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` untouched.

**Method.** Every load-bearing claim was checked against the file, against git, or by executing the
validator in a sandboxed copy. The validator was **run** — clean baseline, then six deliberate
corruptions injected one at a time. Thirty backlog rows were audited against the code. Where a
claim could not be settled it is marked **UNVERIFIED** in §14 rather than asserted.

---

## 1. Lead: five things wrong, in order of consequence

**W-1 — Row #112 is a phantom, it scores 14, and it was explicitly "verified genuinely open" by
loop 41.**

`IMPROVEMENT_BACKLOG.md:373` carries `#112 PRICING-P02 … | **14** | … | open`. Commit
`dc92756` (2026-05-17) is titled *"feat(pricing): PRICING-P02 hero + outcome microcopy + Best For +
CTAs + users/workflows/outputs vocabulary refocus"* and its body opens:
*"Implements PRICING-P02 (row #112)"*. It is an ancestor of HEAD (`git merge-base --is-ancestor`
→ yes).

Checked against the live page rather than the commit message:

| Row prescribes | Live at `app/(public)/pricing/page.tsx` |
|---|---|
| `<h1>` → "Record Once. Know Everything." | `:143` — verbatim |
| 4-bullet output grid, mint check icons, UX §A | `:148-170` — comment reads *"4-bullet output grid (UX §A spec)"*; 4 `<Check>` items |
| risk-removal subtext "Free forever on 5 workflows. No credit card. No setup." | `:176` — verbatim |
| feature category hierarchy (#113's half) | `:71-91` — `category:` on every row, 4 categories |

The hero comment in the file literally reads `{/* Hero — PRICING-P02: … */}`.

**And `ITERATION_LOG.md:202` (loop 41) names #112 in its list of "Eleven others verified genuinely
open, with evidence".** That verification was wrong by four months. This is not the MR-030 silent-
closure mechanism; it is a P-11 sweep returning a false negative. **The sweep is not a backstop.**

---

**W-2 — D-1 is at 8, and loop 50 logged no acknowledgement. MR-032's W-5 recurred one loop after
you conceded it.**

Surfaces from `git show --stat`:

| Loop | Surfaces | Tracked extension surface? | Counter |
|---|---|---|---|
| 47 close | — | — | 5 (MR-032 W-5) |
| 48 | `scripts/`, 5 governance `.md` | no | **6** |
| 49 | `packages/process-engine/src/*` ×6 | **no** — process-engine is on the *forward*-drift list, not D-1's extension list (`extension-app`, `segmentation-engine`, `normalization-engine`, `policy-engine`) | **7** |
| 50 | `apps/web-app/src/lib/dashboard-columns/*`, `metrics-input-adapter.ts`, `workflow-metrics.ts` | no | **8** |

Loop 48 logged the ack. Loop 49 logged the ack. **Loop 50 logged nothing** — `grep
reverse-portfolio-drift` over the loop-50 entry returns 0. Two further drifts of detail: loop 49's
ack says *"D-1 is tripped at 5"* when loop 48 had already advanced it to 6; and P-6 (adopted at
loop 25, row #212: *"one inferred drift ack, then a hard stop"*) has now been passed twice without
the stop.

---

**W-3 — The claim "there is genuinely no unblocked extension row" is not supported, and one of the
two rows it rests on says `open` in the file.**

This is §7 in full. Summary: #216's **status cell reads the bare word `open`** — not `blocked`, not
`awaiting CEO decision`, unlike #107 / #108 / #191 / #225 which all carry explicit blocked statuses.
Its body argues for a design decision, and that argument is sound, but the blocker exists only in
your prose. And a second extension row was not considered: **#32** (`apps/extension-app/src/sidepanel/`,
score 7). #32 turns out to be a phantom — which means the conclusion survives, but it was reached
without the check. MR-031 caught this exact shape once already.

---

**W-4 — The hardened validator closes the #107 hole and leaves four corruption classes it cannot
see, one of which is the #107 shape itself on a different row layout.**

V3a fires correctly on the real re-injected corruption (§2). It cannot see: **row deletion**,
**duplicate IDs**, **arithmetic-preserving dimension transposition**, and — the sharp one —
**the #107 displacement shape applied to any of the 8 unstruck non-canonical rows**, which are
permanently routed to the pre-V3a relative scan. All four tested, all four return `exit 0, clean`.

---

**W-5 — The question loop 50 left open was answerable statically, and the version you left open is
not the one that matters.**

`packages/intelligence-engine/src/varianceAnalyzer.ts` has been modified by **exactly one commit in
repository history** (`77ef4fa`, the file's creation — `git log --follow` returns a single line).
`durationVariance: { stdDevMs, coefficientOfVariation }` is present in **that first version**, at
`:39` (empty case) and `:133` (computed case), both unconditional. `analyzePortfolio` calls
`analyzeVariance` unconditionally (`intelligenceEngine.ts:88`), and `intelligence.ts:292` builds
`extendedIntelligence` by spreading the whole object.

**There has never been a version of this engine that omitted the field. No stored row can predate
it.** One `git log -S` closes it, with a stronger answer than a DB sample would have given: a
sample describes this machine, the history describes every deployment. Three DB attempts were spent
on a question the repository already answered. See §9 for the question that *is* still open, and it
is a different one.

---

## 2. Q1(a) — the validator was tested, not read. V3a fires.

Sandbox: `scripts/validate-backlog.mjs` + `IMPROVEMENT_BACKLOG.md` + `ITERATION_LOG.md` copied to a
scratch tree; the live file is untouched.

Baseline: `219 rows, 115 struck, 19/19 malformed-row budget used — clean`, exit 0.

Then the **byte-exact** corrupted row #107 was extracted from `b66bf9a` (`git show
b66bf9a:IMPROVEMENT_BACKLOG.md | sed -n '260p'`) and written over line 260 of the copy:

```
validate-backlog: 219 rows, 115 struck, 19/19 malformed-row budget used

  ✗ V3a line 260  #107 has its score cell at index 12, not the canonical index 11. The row
    still has 15 cells, so V2 does not see this, but a cell has been displaced by position —
    the #107 shape.

1 violation(s).
EXIT=1
```

One violation, correct row, correct diagnosis, exit 1. **The hole is closed for that shape on a
canonical row.** Independently confirmed: the structural V1a check returns 2 hits at `b8892db`
(#62, #69 — both true positives) and **0 at HEAD**, so the loop-48 repairs landed.

---

## 3. Q1(b) — four corruption classes it still cannot see, each tested

Each was injected into a fresh copy of the live file and the validator run. All four returned
`exit 0, clean`.

**C-1 — Row deletion, and it is the worst of the four.** Delete `#107`'s line entirely:
`218 rows, 115 struck — clean`. No row-count floor, no ID-set check. Worse, it is
*self-concealing*: V4 skips any ID not in `knownIds` (`if (!knownIds.has(id)) continue;`), so
deleting a row **also suppresses the one check that would have flagged it as closed-but-unstruck**.
A closure script that drops rows instead of striking them defeats the whole file, silently.

**C-2 — The #107 shape on a non-canonical row.** V3a's absolute anchoring is gated on
`r.cells.length === CANONICAL_CELL_COUNT`; everything else falls back to `slice(s − 6, s)` — the
identical relative scan that validated #107 against itself. **Eight unstruck rows are permanently
in that fallback:** `#45 #223 #157 #152 #127 #126 #121 #110`. Injecting a positional off-by-one
rewrite into #157 (16 cells: seven dimensions written, score displaced one right, birth-iter
destroyed, last-six arithmetic self-consistent) → `clean`. Two of those eight — #121 and #110 —
score 14 and 13.

**C-3 — Budget-neutral score destruction.** Strip `#107`'s `**9**` to a bare `9` (scoreless +1) and
promote a bare number on `#190` to bold (scoreless −1) → `clean`. All three ratchets are counts, so
any corruption that trades one offender for another is invisible by construction.

**C-4 — Arithmetic-preserving dimension transposition.** Swap `#107`'s L and C values (both
additive) → `clean`. The sum is checked; the *assignment* is not. A re-scoring script that writes
the six dimensions in the wrong order produces a row that validates and means something else.

**C-5 — Duplicate IDs.** Two rows both `#107` → `220 rows … clean`. No uniqueness check.

**No rule is proposed for these.** C-1, C-2 and C-5 are each a few lines inside the existing script;
C-3 and C-4 are not cheaply checkable and may not be worth checking. Whether to spend a loop on them
is a scheduling call, and §13 puts it below the pool sweep.

---

## 4. Q1(c) — all three ratchets verified arithmetically. All three are exact.

MR-032 found `LEGACY_SCORELESS_BUDGET` at 62 against a live 58. Re-measured with an independent
re-implementation of the script's own parse (same END_MARKER cut, same `ROW_RE`, same
`**N**` cell test), rather than trusting the constants or the script's summary line:

| Ratchet | Constant | Live count | Slack |
|---|---|---|---|
| `MALFORMED_ROW_BUDGET` | 19 | **19** | **0** ✓ |
| `LEGACY_SCORELESS_BUDGET` | 58 | **58** | **0** ✓ |
| `SCORE_MISMATCH_BUDGET` | 13 | **13** | **0** ✓ |

The 62 → 58 correction was right, and the other two were already right. **The script only prints
the malformed count**; scoreless and mismatch counts are silent unless over budget, which is why the
62 could sit wrong for a loop. That is a reporting gap, not a correctness one — the summary line
could carry all three. Noted, not proposed.

---

## 5. Q2 — the phantom rate in the unaudited region: **1 in 30 confirmed (3%), 5 in 30 materially wrong (17%)**

**Sample.** 30 open rows drawn from lines 283-378 of `IMPROVEMENT_BACKLOG.md` — the region below
#185 that MR-030 and MR-032 never swept. Each verdict is a file-level check, listed with its
evidence.

| Row | Score | Verdict | Evidence |
|---|---|---|---|
| **#112** | 14 | **PHANTOM** | `dc92756` *"Implements PRICING-P02 (row #112)"*; hero/grid/subtext verbatim in `pricing/page.tsx:143,148,176` |
| **#157** | 13 | **STALE — one sub-task shipped, two claims false** | Row: *"`RESEND_API_KEY` + `EMAIL_FROM` … currently MISSING from both"*. Live: `compose.hostinger.yaml:76-77` **and** `.github/workflows/deploy.yml:149-150`. Row cites `docker-start.sh:35` with `--accept-data-loss`; live `:51-52` reads *"NEVER `--accept-data-loss`; we never pass it"*, and the pre-migration backup it asks for exists at `:30-40`. Genuine residual: `db push` → `migrate deploy`, and `RESEND_WORKSPACE_SETUP.md` (absent) |
| **#223** | 8 | **STALE — magnitudes 4× off** | Row: `text-brand-400` **138** uses, `text-brand-500` **73**, `text-[#e2e8f0]` **153**. Live: **32**, **35**, **0** |
| **#113** | 13 | **partially shipped** | Feature-category hierarchy live at `pricing/page.tsx:71-91` (4 categories), but on `COMPARISON_FEATURES`, not the `PRICING_CATALOG` the row prescribes (#111 absent) |
| **#123** | 10 | **partial overlap — flagged** | `packages/agent-intelligence/src/decision-detector.ts` predates Path E (`99a473e`) and already implements retry detection (`:191-241`), one of the row's five signals |
| #189 | 6 | open ✓ | `TrialStatusChip.tsx:31` and `RecordingQuotaChip.tsx:26` each `fetch('/api/account')` |
| #191 | 10 | open ✓ | `billing/checkout/route.ts:380-387` grants `trial_period_days`; `webhook/route.ts:1091` reads `trial_end` |
| #211 | 5 | open ✓ | `api/workflows/route.ts:134` — `if (variationScore > 0.7)`, exact line |
| #212 | 11 | open ✓ | `.claude/settings.json` PreToolUse Bash matcher blocks `curl/wget/rm -rf/sudo/git reset --hard`; **no `git commit`** |
| #216 | 8 | open ✓ | `composedPath` → **0 hits** under `apps/extension-app/src/content/` |
| #225 | 9 | open ✓ (blocked in status) | `lib/client-ip.ts` exists; `TRUSTED_PROXY_HOPS` wired at `deploy.yml:154` |
| #226 | 8 | open ✓ | `api/analytics/extension/route.ts:13` — *"deliberately unauthenticated"*; no per-IP install cap |
| #110 | 13 | open ✓ | `workflowInterpreter.ts:161` `computedAt: new Date().toISOString()`; `sopSchemaVersion`/`migrateSOP` → **0 hits** repo-wide |
| #111 | 13 | open ✓ | `apps/web-app/src/lib/pricing/` does not exist |
| #114 | 11 | open ✓ | `PricingLiveOutput` — absent |
| #115 | 8 | open ✓ | `OutputThumbnailRow`/`SocialProofBlock` absent; the 3 screenshots it depends on **do** exist |
| #116 | 12 | open ✓ | `pricing_page_viewed` → **0 hits** |
| #130 | 12 | open ✓ | all **12** named events → 0 hits each |
| #142 | 11 | open ✓ | `apps/web-app/src/lib/email/` does not exist |
| #149 | 12 | open ✓ | `DailyMetricsSnapshot` → 0 hits in schema or src |
| #159 | 12 | open ✓ | `UserManagementSection*` absent |
| #135 | 10 | open ✓ | `mermaidRenderer*` absent |
| #126 | 10 | open ✓ | `packages/graph-merge-engine` absent |
| #138 | 14 | open ✓ | no deviation-alert job |
| #146 | 12 | open ✓ | `e2e/workspace/invite-lifecycle*` absent |
| #133 #150 #152 #143 #144 | 11-13 | open ✓ | path-existence sweep: cited NEW paths absent; #152 cites an existing spec it extends; #143/#144 self-marked deferred/superseded |

**Rate: 1/30 = 3.3% confirmed phantom; 5/30 = 17% where the row text does not match the code.**

**Two more phantoms found outside the sample**, incidentally, while checking §7's D-1 claim — both
in the head region, both missed by loop 41's score-ordered top-14:

- **#23** (score 9, *"`docs/invariants.md` L172 says `'1.0.0'`; code says `'1.1.0'`"*) — **the drift
  is closed.** `docs/invariants.md:192` and `:499` both read `'1.1.0'`, matching
  `packages/segmentation-engine/src/rules.ts:16`.
- **#32** (score 7, *"duplicated across `ReviewScreen.tsx` and `HistoryDetailScreen.tsx`"*) —
  **`ReviewScreen.tsx` does not exist.** `TruncationWarningBanner` is defined once, at
  `HistoryDetailScreen.tsx:5`. There is no duplication.

**Total phantoms this review: 3 (#112, #23, #32).**

### 5.1 What this implies about `top-score`

MR-032 wrote that a `top-score` pick *"is currently a coin-flip"*. **That is now measurably too
pessimistic, and the correction matters because it changes what to do.** The measured rate in the
unaudited region is 3%, not 50%. MR-032's 3-of-4 figure came from the *head*, which is exactly the
region that had been picked from repeatedly — a sample conditioned on having been selected. The
tail is much healthier, because most of it is roadmap rows whose NEW files simply do not exist yet.

But the correct inference is not "the pool is fine". It is narrower and worse:

1. **The failure is concentrated where selection happens.** The 14-and-above band is where phantoms
   cluster, because that band is where work gets taken and where re-scopes accumulate. #112 sits in
   that band today.
2. **A P-11 sweep is not a backstop.** Loop 41 explicitly cleared #112 "with evidence" and was
   wrong. Verification that is performed *at selection time, on the row you already intend to take*
   inherits the same blind spot as the selection.
3. **Extrapolation, stated as an estimate and not a fact:** 3.3% over the ~74 open rows this review
   did not sample is **2-3 further phantoms**, plus roughly 12 materially-stale rows at the 17%
   rate. That is a bounded cleanup, not a crisis.

**So: a `top-score` pick is not a coin-flip; it is a ~1-in-8 chance of landing on a row whose text
does not match the code, concentrated at the top of the score distribution.** The cheap mitigation
is not a new rule — it is to strike the three known phantoms and verify the specific row before
selecting it, which is P-11 exactly as written. The rule is fine. It was not applied to #112.

---

## 6. Q3 — delegation: the discovery did not stop, it tracks brief specificity

The premise of the question is that delegates have stopped discovering. **Measured across the three
loops, that is true of loop 50 and false of loops 48 and 49.**

**Loop 48 — `backend-engineer`, three independent contributions, one of them a defect you missed.**

- It found **#69**, a sixth corrupted row not on your repair list: struck description, unstruck ID,
  status `new`, on a shipped #57 release-blocker. Verified here: the structural check returns
  exactly `[62, 69]` at `b8892db`.
- **It rejected your brief with a measurement.** You specified V1a as a keyword scan for
  "closed/done/shipped". I re-implemented that scan against `b8892db` and the delegate's numbers
  reproduce: **14 description hits** (`59 60 62 69 89 176 216 223 193 159 225 133 132 110` — of
  which 2 are true positives, so 12 false), **3 status hits** (2 false: `#58`, `#110`). The
  structural check it built instead returns **2 hits, both true, zero false**. Your design would
  have shipped a check with a 6:1 false-positive ratio.
- It corrected a second false sentence in the script header that you had not flagged.

**Loop 49 — `growth-strategist`, changed the shipped scope.** `text`/`textarea`/`search` return
`undefined` and ship unchanged (verified: `stepPhrasing.ts:14`); `checkbox`/`radio` reclassified
from nicety to correctness fix and drop the "field" noun (`:59-60`). That is the gate doing the
thing gates are for. Its two safety flags were wrong in detail and right to raise.

**Loop 50 — `backend-engineer`, one original contribution.** The `durationVariance` stored-row
question. Everything else was execution against a five-layer brief you had already traced.

**Verdict: (a), with a correction to the premise.** The variable is not P-11 and not a decline in
delegate quality — it is **how much of the solution the brief already contains**. Loop 48's brief
said "harden the validator" and left the design open; the delegate found a row and overturned a
design decision. Loop 50's brief named the files, the lines and the five layers; the delegate
executed them. You got what each brief asked for.

The real finding is on the other side of it: **your upstream verification did not catch #69, and
neither of you caught #112, #23 or #32.** Moving verification upstream moved it, it did not make it
complete — both sweeps are bounded by the rows they choose to open. So "P-11 correctly moved
upstream" is the right description of loops 49-50, and it is **not** evidence that upstream
verification is sufficient.

**Practical consequence, offered not proposed:** when a loop's shape is "I know exactly what to
change", writing it yourself is cheaper and loses nothing. Reserve the delegate for briefs where
the design is genuinely open — that is where loop 48 got its return.

---

## 7. Q6 — the D-1 claim does not hold as stated

Your claim: *"the only extension row (#216) is blocked on the CEO shadow-DOM decision … There is
genuinely no unblocked extension row."*

**Verified independently.** I swept every unstruck row for the four D-1 surfaces (`extension-app`,
`segmentation-engine`, `normalization-engine`, `policy-engine`) plus `content/`, `background/`,
`sidepanel`, `manifest.json`, `chrome.`. Results:

1. **#216 is not marked blocked in the file.** Its status cell is the bare word `open`
   (`IMPROVEMENT_BACKLOG.md:302`). Compare #107 `**blocked — security review required (loop 48)**`,
   #108 `**re-scoped — premise unverified … blocked on cross-run aggregation**`, #191 `**awaiting
   CEO decision**`, #225 `**centralized … awaiting proxy confirmation**`. Four rows carry their
   blocker in the field that sweeps read; #216 does not. **The blocker exists only in your prose.**
   The substance of it — that `e.composedPath()[0]` changes event attribution and needs a design
   decision under the Extension Reliability Invariant — is sound and I am not disputing it. The
   traceability gap is: a row that every sweep will rank as available.

2. **#32 was not considered, and it is an extension row.** `apps/extension-app/src/sidepanel/`,
   score 7, status `new (iter 014 follow-up) — triage: MR-005 DOWNGRADE`. It was sitting in the
   pool, unblocked by anything.

3. **#32 is a phantom** (§5), so the *conclusion* survives: after striking it, there is no unblocked
   extension row that is not decision-blocked. **But the conclusion was asserted before the check.**
   MR-031 caught exactly this shape once — a D-1 claim asserted rather than verified — and
   withdrew MR-029's "inert" verdict over it. Being right by luck is the same process failure as
   being wrong.

4. **#23 and #29 do not clear D-1**, for the record: #23's fix lands in `docs/invariants.md` (and is
   already done); #29 adds per-package vitest config, which is not `src` coverage.

**So: your conclusion is correct and your evidence was not.** Two rows to fix in the file — strike
#32, and write #216's blocker into its status cell so the next sweep sees it without needing you.

---

## 8. Q4 — the discarded-value class is real, it is mechanically findable, and it is 16 of 18 at one boundary

Loop 49 (`elementType` captured, discarded by both SOP renderers) and loop 50 (`durationVariance`
computed, discarded by the adapter) are the **same defect**: a producer emits a field, a consumer's
narrowing type or schema omits it, and the value is dropped silently at an interface, a destructure
or a Zod object. Nothing errors. Nothing is untested. The field is simply never asked for.

**It is not a coincidence of selection, and here is the measurement.** At the boundary loop 50
touched — `apps/web-app/src/lib/metrics-input-adapter.ts` — the producer type
`PortfolioIntelligence` (`packages/intelligence-engine/src/types.ts:342-354`) declares **11
top-level keys**: `processTitle runCount ruleVersion computedAt metrics timestudy variance variants
bottlenecks drift standardPath`. `intelligence.ts:292-301` then spreads **7 more** into the stored
blob: `standardization outlierRuns recommendedPath sopAlignment documentationDrift recommendations
automationROI`. **Eighteen top-level keys are written to `intelligenceJson`.**

`IntelligenceJsonSchema` (`metrics-input-adapter.ts:59-83`) declares **two**: `variance` and
`variants`. `.passthrough()` means the other sixteen parse without complaint and are then dropped by
the explicit return object at `:116-121`.

**16 of 18 stored keys are discarded at one boundary.** Loop 50 recovered two leaves from inside one
of the two it already read. The remaining sixteen have never been looked at.

### 8.1 How to find the rest — concretely

Not a principle. A one-loop deliverable with a measurable output:

**A producer/consumer key-coverage report.** For each named pair below, enumerate the producer's
emitted key set (from its TypeScript interface or its literal return object) and the consumer's
declared key set (Zod shape, destructure, or interface), and print the delta. Ship it as a script
under `scripts/`, like `validate-backlog.mjs`, with a **ratchet** rather than an assertion — the
delta is large and legitimate in places, and a check that demands a full reconciliation before it
goes green is a check that gets switched off. Seed the budget at the measured value.

Four pairs, each with the evidence that makes it a candidate:

| # | Producer | Consumer | Why it is a candidate |
|---|---|---|---|
| 1 | `PortfolioIntelligence` + `extendedIntelligence` (18 keys) | `IntelligenceJsonSchema` (2 keys) | **Measured 16/18 dropped.** This is where loop 50's defect lived; the CLAUDE.md iter-049 note already flagged `.passthrough()` as unvalidated and it was never followed up |
| 2 | `inspectTarget` / `target-inspector.ts` | `sopBuilder` + `stepAnalyzer` | **This is where loop 49's defect lived.** `elementType` was one field; the inspector records more per target than the renderers consume |
| 3 | `StepIntelligence` (`packages/agent-intelligence/src/types.ts`) | `decision-detector.ts` + downstream renderers | Same shape: a rich per-step record, several narrow consumers |
| 4 | `WorkflowMetricsOutput` | `dashboard-columns/accessors.ts` (10 accessors) | The registry's `availability` field already encodes "computed but not surfaced" as a first-class state — which means this boundary can be *counted* rather than guessed |

**Start with pair 1.** It has a measured 16-key delta, it is a single file on each side, and one of
the sixteen is `runCount` — see §10, where it bears directly on two currently-blocked rows.

---

## 9. Q5 — stopping was right; the recorded gap is the wrong gap

**Two separate questions, and only one of them is open.**

**Presence: closed, statically, and the answer is "always".** §1 W-5 has the trace:
`varianceAnalyzer.ts` has one commit in its entire history; `durationVariance` with both leaf keys
is unconditional in that first version at `:39` and `:133`; `analyzePortfolio` calls it
unconditionally (`intelligenceEngine.ts:88`); `intelligence.ts:292` spreads the whole object. The
recorded worry — *"older rows may predate the field"* — **cannot be true**. One `git log --follow`
would have closed it, and would have closed it for every deployment rather than for one laptop.

**Value: open, and it is the question that matters.** `varianceAnalyzer.ts:39` returns
`{ stdDevMs: null, coefficientOfVariation: null }` for the empty case. So the honest open question
is **what fraction of stored rows have too few runs for the statistic to be non-null** — which is
a data question, is genuinely unanswerable statically, and is *also already answered in the
product*: both columns gate at `MIN_RUNS_STAT = 5` (`accessors.ts:203,215-254`), so a row with
fewer than five runs renders "—" by design whatever the blob contains. The failure mode you
described is the designed behaviour, not a risk.

**So: stopping was right, and for a better reason than the one given.** Three DB attempts were the
wrong instrument, not merely an expensive one. (For completeness — you tried `test.db`;
`apps/web-app/prisma/data/ledgerium.db` also exists, 1.6 MB. Irrelevant now, but it was not the
case that no path existed.)

**Is "shipped with a stated, unmeasured gap" a habit forming?** Loop 49 also shipped one
(`stepAnalyzer`'s instruction string carries no sensitivity annotation — verified accurate: the
analyzer surfaces `hasSensitiveEvents` and `sopBuilder` raises the step-level warning, and
`password` short-circuits at `sensitivity.ts:65-67` before reaching the new code, so nothing leaks).
**Two in a row is not a habit, and both disclosures are honest and precise.** The distinction that
matters is not "stated vs unstated" — you stated both — it is **"unmeasured because measurement is
expensive" vs "unmeasured because the cheap instrument was not tried"**. Loop 49's is the first
kind. Loop 50's is the second. One data point each way. **No rule. Watch it: if a third gap ships
where a `git log -S`, a `grep -c` or an existing constant would have closed it, that is the pattern
and it is worth naming then.**

---

## 10. Two findings that did not fit elsewhere, both on blocked rows

**#107's scope is understated, and it is understated in the direction that matters.**
`apps/web-app/src/app/(public)/share/[token]/page.tsx:1` is `'use client'`; it fetches
`/api/share/${token}` inside `useEffect` (`:27-34`). **A client component that resolves its data
client-side cannot carry `generateMetadata`** — the crawler unfurl needs server-rendered `<meta>`.
Loop 41's re-scope (*"that file contains no `generateMetadata`, no `openGraph`"*) is literally true
and reads as "add two things". The row actually requires converting the route to a Server Component
or adding a server-side token resolution path. The security block stands regardless; the effort
number behind it does not.

**#107's and #108's `runCount` premise is true where it is stated and narrower than it reads.**
Verified: `runCount` → **0 hits** in `packages/process-engine/src`. That is correct and the
conclusion drawn from it for the SOP renderer holds. **But `runCount` is a top-level key of
`PortfolioIntelligence`, it is stored in `intelligenceJson`, and it is already rendered to users**
at `analytics/page.tsx:214,418,517,576`. It is one of the sixteen keys §8 measured as discarded at
the adapter. **I have not verified whether the share token resolves to a `ProcessDefinition`
carrying it** — that is the check that would settle whether "recorded from [M] sessions" is
fabricable or merely unplumbed, and it is one file. Flagged, not claimed.

---

## 11. Q7 — Follow-Up Debt ratio, arithmetic shown

**Window (loops 48-50), from `git diff` on `IMPROVEMENT_BACKLOG.md` per commit, not from the log
prose:**

| Loop | Commit | Rows struck | Created |
|---|---|---|---|
| 48 | `678fd0a` | **#62, #69, #93, #176** (4) | 0 |
| 49 | `ddc488e` | 0 (backlog untouched) | 0 |
| 50 | `fe1813e` | **#101** (1) | 0 |

**Window: 5 closed / 0 created.** Ratio is `5/0` — undefined, unbounded, trivially above the 0.5
floor.

*Correction to the loop-48 entry:* it reports *"3 rows closed (#93, #176, #62)"*. The diff shows
**four** — #69 is struck in the same commit and is described in the entry's prose but omitted from
its own summary count. Undercount by one, in the safe direction.

**Trailing 10 (loops 41-50), which is the window the policy actually specifies:**

```
created:  41:0  42:2  43:0  44:0  45:0  46:0  47:0  48:0  49:0  50:0  =  2
closed:   41:1  42:1  43:0  44:0  45:1  46:1  47:0  48:4  49:0  50:1  =  9
ratio  =  9 / 2  =  4.50      (floor 0.5)
```

**Healthy by a factor of nine — and that number is misleading, so here is the honest split.** Of
the 9 closures, **5 were phantom corrections** (#102, #93, #176, #62, #69 — rows that were already
done and were struck as bookkeeping) and **4 were work** (#148, #171, #95, #101). On work alone:

```
4 closed / 2 created = 2.00      (floor 0.5)
```

Still comfortably clear. **The metric is not the constraint on this system and has not been for ten
loops.** Two observations follow from that, both stated rather than proposed: creation has been 0
for eight consecutive loops, which is either excellent scope discipline or an under-reporting of
residual work; and a ratio that counts phantom strikes as burn-down will read "healthy" precisely
when the pool is at its least trustworthy. Neither is worth a rule change today.

---

## 12. Control-rule status

| Rule | State | Verdict |
|---|---|---|
| **D-1** (reverse drift, N=5) | **8 — tripped since loop 47; ack logged at 48 and 49, absent at 50** | **W-2.** Rule fires correctly. Reporting failed at loop 50, one loop after MR-032 raised the identical failure |
| **P-6** (#212: one inferred ack, then a hard stop) | Passed twice without the stop | **W-2.** Adopted 2026-09-17; not honoured |
| **Meta-review cadence** (2-3 loops) | MR-032 → 48, 49, 50 → MR-033 | **Clean, on time** |
| **Area saturation** (3 consecutive) | tooling (48) → process-engine (49) → web-app (50) | **Clean.** Three distinct areas |
| **Agent rotation** (4+ consecutive) | coordinator+backend (48) → coordinator+growth (49) → backend (50) | **Clean** |
| **P-11** (verify before selecting) | Applied at 48/49/50; **returned a false negative on #112 at loop 41** | **Keep unchanged.** §5.1 — the failure is application coverage, not the rule |
| **P-12** | Loop 48's delegate overrode the brief with measurement and was right | **Working.** Best evidence in several windows |
| **Validator (V1/V1a/V2/V3/V3a/V4)** | V3a fires on the real corruption; 3 ratchets exact; 5 blind classes named (§3) | **Working as far as it goes.** No policy change |
| **Extension Reliability Invariant** | Loops 48-50 touched zero extension-app files | **Not exercised.** No evidence either way |

---

## 13. Loop 51 endorsement

**PRIMARY: #110 — score 13 — NOT decision-blocked.**

`IMPROVEMENT_BACKLOG.md:375`, *"partially done (loop 43) — 2/3 leaks closed"*. Residual verified
line by line, today:

- `packages/process-engine/src/workflowInterpreter.ts:161` — `computedAt: new Date().toISOString()`,
  the third determinism leak, exactly where the row says it is.
- `sopSchemaVersion` → **0 hits** repo-wide. `migrateSOP` → **0 hits** repo-wide. Both genuinely
  absent, as the row states.

**Why this one.** It is the highest-scoring row I could verify as fully open with no dependency and
no pending CEO decision. It closes a determinism leak, which is the invariant this repo has spent
five loops defending. It finishes something rather than starting something. Its residual is
precisely known, so the brief will be specific — which per §6 means **write it yourself; do not
delegate it**. And it is `packages/process-engine`, a tracked non-extension surface, so it holds
forward-drift at zero.

**It does not clear D-1.** D-1 will be 9. Per §7, nothing unblocked clears it: strike #32 and the
pool contains no unblocked extension row. **Log the ack — loop 50 did not — and note that P-6's
hard stop is now two loops overdue.**

**ALTERNATIVE: #109 — score 13 — NOT decision-blocked.** SOPPM-P03, sop-view ARIA fix plus axe
regression coverage. Premise verified: `role="checkbox"` on a `<button>` at
`apps/web-app/src/components/sop-view/SOPExecutionMode.tsx:566`, exactly as filed. Take this
instead if you would rather close an a11y blocker than a determinism one; both are clean.

**Bookkeeping to fold into whichever loop you take — minutes, not a loop.** Loop 48 established the
precedent: **strike #112** (`dc92756`), **strike #23** (`docs/invariants.md:192,499`), **strike
#32** (`ReviewScreen.tsx` does not exist). **Re-scope #157** (drop the false "MISSING from both"
claim and the `--accept-data-loss` claim; residual is `db push` → `migrate deploy` plus the
runbook) and **#223** (138/73/153 → 32/35/0). **Write #216's blocker into its status cell.**

**NOT endorsed, and why.** A third governance-shaped loop in five to sweep the remaining ~74
unaudited rows. §5.1 sizes that at 2-3 further phantoms — real, bounded, and not urgent enough to
displace product work when the last two governance loops already consumed 48 and (in effect) 47.
**Surfaced as a CEO scheduling decision in §15, not self-scheduled.**

### Standing CEO decisions, unchanged this window

| Decision | State |
|---|---|
| **#57 criterion-3 threshold** | **UNSCOREABLE** since loop 48. Blocks #57 flag retirement. Loop 48 re-opened it correctly; nothing has moved |
| **VPS proxy hop count** (#225) | Open. Unobservable from this repo. `TRUSTED_PROXY_HOPS` is wired (`deploy.yml:154`) and unset, so behaviour is today's exactly |
| **#216 shadow-DOM capture semantics** | Open. **Also needs writing into the row's status cell** (§7) |
| **Field-capture Phase 2** (new — is it worth its public-claim update?) | Open. See §15 |

---

## 14. What I could not verify

Stated rather than asserted.

- **Loop 50's test count (3127 → 3140) and loop 49's (596 → 652, workspace 4909).** Mode 4 — I ran
  no product suite. I verified the code exists and the assertions read correctly. I **did** execute
  `scripts/validate-backlog.mjs`, in a sandboxed copy, which reads only markdown.
- **Whether #223's underlying defect still exists.** Its counts are 4× stale (verified). Whether the
  light-theme axe violations it exists to fix are still present needs an axe run, which is a product
  execution I did not perform.
- **Whether #123's overlap is real.** `decision-detector.ts` implements retry detection and predates
  Path E. Whether PATHE-P07 intends to reuse it or to re-implement in a new package is a design
  question the row does not settle and I cannot settle by reading.
- **Whether `runCount` is reachable from the share token** (§10). It is stored and rendered
  elsewhere; whether the share route's `ProcessDefinition` carries it is one check I did not make.
- **Whether #112 is 100% or ~80% shipped.** Hero, output grid and subtext are verbatim. I found no
  "Best For" rows in the live page, though the commit claims them — possibly refactored away later.
  The commit names the row explicitly, so the strike is sound either way; the residual, if any, is
  small enough to re-file rather than keep a 14 open for.
- **The 74 open rows I did not sample.** §5's 3.3% and 17% are measured on 30. The extrapolation in
  §5.1 is an estimate and is labelled as one.
- **Whether the loop-48 delegate's "14 false positives" was meant as 14-flagged or 12-false.** My
  re-run gives 14 flagged of which 12 are false, and exactly 2 false in statuses (matching the log's
  "2"). Immaterial either way.

---

## 15. Recommendations to the CEO (not applied; several would edit `CLAUDE.md`)

Nothing in this review is applied. Per the brief, no `CLAUDE.md` edit is proposed — these are
surfaced for your ruling only.

1. **#57 criterion-3 threshold.** Unscoreable for three loops now. Until a number exists, #57 cannot
   retire and the chip-click instrumentation shipped at loop 46 sits inert. This is the oldest
   blocking decision in the set.
2. **Schedule the pool sweep, or decide not to.** ~74 open rows unaudited; §5.1 estimates 2-3
   phantoms and ~12 stale rows. It is one governance loop. I have **not** endorsed it for loop 51
   because it would be the third governance-shaped loop in five. Your call whether it goes at 52, at
   55, or never.
3. **Field-capture Phase 2 — is it worth its public-claim update?** Phase 1 shipped at loop 49 with
   no new capture, no schema change and no privacy-claim change, which is why it needed no decision.
   Phase 2 (format hints from `pattern`/`placeholder`, selected-option surfacing) requires new
   capture and therefore a public-claim update. Decide before it is scoped, not after.
4. **#216's status cell.** Whatever you decide on shadow-DOM, the row should say `blocked — CEO
   decision` in the field that sweeps read. Four other rows already do this.
5. **P-6's hard stop is overdue.** Row #212 records P-6 as adopted 2026-09-17: one inferred drift
   ack, then a hard stop. Loops 48 and 49 both acked; loop 50 did neither. Either enforce it or
   retire it — a rule that is passed twice and then forgotten is worse than no rule.
6. **The producer/consumer key-coverage script** (§8.1). One loop, ratcheted like
   `validate-backlog.mjs`, starting with the adapter boundary where 16 of 18 keys are measurably
   discarded. This is the only genuinely new proposal in the review and it is a script, not a rule.
