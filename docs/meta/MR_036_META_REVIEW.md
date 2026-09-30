# MR-036 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 61, 62, 63, 64.
**Cadence:** MR-035 closed at loop 60. This review was commissioned at loop 64 — **four counted loops,
one past the 2-3 floor** in `CLAUDE.md § Meta-Review Cadence`. That is an improvement on MR-035, which
ran two loops over, and on the two-cycle trend the rule is recovering rather than failing. Loop 64's own
entry flags it: *"Meta-review cadence: 4 loops since MR-035 — MR-036 is due."*

**No product code changed. No `CLAUDE.md` edit is proposed anywhere in this document.**

Independently executed during this review: `pnpm typecheck` (clean, 11 packages — the claim loops 61-64
each make, verified), `node scripts/validate-backlog.mjs` (`225 rows, 124 struck, 19/19 malformed-row
budget used — clean`, matching loop 64's claim exactly), `git log`/`git show` per-commit backlog diffs,
and a dozen greps cited inline. I did not run Playwright or the unit suites (§12).

---

## 1. Lead — what is wrong, in order of consequence

1. **The light-theme axe tests do not guard the defect loop 64 fixed.** Your Q2 framing is *"the focus
   indicator is compliant in both themes, and a check exists that would notice if it regressed."* The
   second clause is false. `assertAxeCompliance` runs `new AxeBuilder({ page }).analyze()` with the
   default ruleset (`e2e/helpers/axe.ts:38-41`); axe-core has **no rule that evaluates focus-indicator
   contrast** — SC 1.4.11 focus appearance is a documented manual-review item. #230 was found by
   `a11y-architect`'s suggestion and by hand arithmetic, not by a scan, and nothing added in loop 64
   would find it again. **S-1.**

2. **Loop 64 left one focus ring at its own worst-measured value, by reading the source instead of the
   resolved value.** `LensSwitcher.tsx:125` still carries
   `focus-visible:ring-[var(--accent,#16a34a)]`. The entry records *"the `#16a34a` accent fallback
   3.15 … They pass"* and leaves it. But `--accent` **is defined** — `globals.css:52`, `--accent:
   #20f2a6`, in `:root`, with no `.light` override — so the fallback is dead and that ring renders
   `#20f2a6`, which the same entry measures at **1.40:1** and calls *"essentially not there."* This is
   the Q1 failure mode recurring **inside the loop that named it**, one abstraction level down. **S-2.**

3. **Two live selection controls were not checked in any of the four loops, while the one control that
   cannot move was acknowledged in all four.** Loops 61-64 each log
   `reverse-portfolio-drift: user-ack`. None logs an Area-saturation check or an agent-rotation check
   (`grep -in "area\|saturat\|rotat\|agent"` over `ITERATION_LOG.md:7-76` returns nothing). Meanwhile
   **Area saturation has tripped** — loops 62, 63, 64 are all `web-app / a11y`, three consecutive — and
   **agent rotation is at 12 consecutive coordinator-primary loops** (53→64; last non-coordinator
   primary is loop 52, `backend-engineer`), against a 4+ trigger. That is the real answer to Q5 (§7).
   **S-3.**

4. **The corrected count in loop 64 mixes two units, in the direction it was correcting.** The entry and
   row #230's closure text both say **"68 failing usages across 7 colours … including the
   component-layer `.btn-primary` / `.btn-secondary` / `.input-field` rings."** The 68 is a count of
   `.tsx` className usages (51 green-500 + 8 brand-500 + 4 emerald-500 + emerald-400 + brand-400 +
   amber-500 + accent = 7 colours; 67 such sites now carry the token). The component-layer rings are the
   other 3 of the "all 70 replaced" — and `.btn-primary` alone is **91 occurrences**
   (`grep -c btn-primary` over `src/**/*.tsx`). So the class-layer sites are *not* "included" in the 68,
   and if they were counted in the same unit the figure would be ~190, not 68. **S-4 (minor).**

5. **Nothing was added to guard the tokens either loop introduced.** No test in the repo reads
   `globals.css` (`grep -rln "globals.css" src/ e2e/` returns only `layout.tsx` and
   `SOPPageShell.tsx`, both imports). `--focus-ring` and `--status-info` each live in three places —
   `:root`, `.light`, and the SOP print block — and loop 63's entry says outright *"a token missing
   from it would have printed light-blue figures on white at roughly 2:1. That block exists because of
   an earlier bug of exactly this shape."* The loop identified a repeat bug class and did not add the
   ten-line drift guard this codebase uses everywhere else (loop 31's membership lock, loop 51's
   package-wide clock guard). §9 R-2.

**What is not wrong, and it is most of the window.** Loop 62's rebuilt spec is the best piece of work in
five windows and every assertion MR-035's S-2 demanded is present and then some (§9). The hold-back
convention is verified end-to-end with exact counts (§5). The pool grew by 2 and the debt ratio still
reads healthy, which is the third consecutive review to find the metric uninformative (§6). And the
three instances behind your Q1 were **all caught inside their own loops** — which is the reason my Q1
ruling goes against the rule you are considering (§3).

---

## 2. Strikes

**S-1 — SHIPPED. The new light-theme coverage does not cover the thing it was shipped alongside.**

`e2e/helpers/axe.ts:38-41` builds `new AxeBuilder({ page }).include('main').analyze()` — default rules,
no custom focus-contrast check. axe-core evaluates `color-contrast` on **text**; focus-indicator
contrast (SC 1.4.11 / 2.4.11) is not in its automatic ruleset. The two new tests at
`sop-a11y.spec.ts:124` and `:135` therefore assert that *light-theme text* is compliant — genuinely new
and genuinely valuable, and it is exactly what caught #232 — but a revert of `--focus-ring: #15803D`
(`globals.css:80`) would leave all 70 sites at 2.18:1 and all 23 a11y tests green.

The spec's own header says the right thing about a different risk — *"if the page stops rendering a SOP,
these fail instead of quietly passing"* (`:20`) — and the theme helper says *"a green tick for a check
that never happened"* (`theme.ts:47-50`). Both are true about the theme applying. Neither is true about
the ring. The gap is between "we now scan light" and "we now guard the ring", and the entry, the
CHANGELOG and `SYSTEM_HEALTH.md:15` all read as the second.

**S-2 — SHIPPED. One focus ring left at 1.40:1, excluded on the strength of a fallback CSS never uses.**

```
globals.css:52        --accent: #20f2a6;          /* :root; no .light override */
LensSwitcher.tsx:125  focus-visible:ring-[var(--accent,#16a34a)]
loop 64 entry         "the #16a34a accent fallback 3.15. They pass."
loop 64 entry         "focus-visible:ring-[var(--accent,#20f2a6)] at 1.40:1 — essentially not there"
```

Two sites carrying the `#20f2a6` spelling of the same fallback were replaced (`LeaderboardTable.tsx:91`,
`UserDetailDrawer.tsx:228`, both visible in `git show 8293292`). The third, spelled with a different
dead fallback, was measured *as its spelling* and kept.

**The trap is general, not a one-off.** `--accent` is defined once and used with a fallback **21 times**
across `src`, and the fallbacks disagree with each other and with the definition — `band-colors.ts:6`
even documents the disagreement as a convention (*"matching the admin-operations `var(--accent,
#20f2a6)` convention"*) rather than as dead code. The inverse also exists: `--accent-subtle` is defined
**zero** times and used with a fallback once, so there the fallback is the only thing rendering.
`--content-primary` (5) and `--surface-elevated` (4) have dead fallbacks too. One grep separates the two
cases, and it is the cheapest available answer to your Q1 (§3.4).

**S-3 — Two selection controls went unchecked for four loops while a third was acknowledged four times.**

- **Area saturation.** `CLAUDE.md § Selection Policy` Step 2: *"if the last 3 iterations all landed in
  the same `Area`, the next iteration MUST select from a different `Area`."* Row #230's Area cell reads
  `web-app / a11y`; #229 and #232 are the same. Loops 62, 63, 64 = three consecutive. Under the coarse
  backstop the CEO settled at loop 25 (*"Area = fine-grained with a 6-loop coarse backstop"*,
  `SYSTEM_HEALTH.md:58`), loops 55-64 are **ten consecutive `web-app`**.
- **Agent rotation.** `CLAUDE.md § Meta-Review Cadence` early trigger: *"Same implementing agent used
  for 4+ consecutive loops."* Coordinator is primary at loops 53-64 = **12**. MR-034 §9 flagged it at
  *"2 consecutive entering loop 55. A third makes it 3."* MR-035's control table (§11) **omits the rule
  entirely**. Nobody has stated the number since.

I am not claiming the work was wrong: an a11y run that stays on a11y is coherent, and `a11y-architect`
was consulted at loop 63 and changed the outcome. I am claiming that **of the three controls, the one
logged every loop is the one that cannot change, and the two that have actually tripped are the two
nobody writes down.** That is what ritual looks like from the outside.

**S-4 (minor) — "68 failing usages … including the component-layer rings."** Arithmetic in §1(4). The
number is right for className sites and wrong about what it includes, in the row-closure text that
future readers will treat as the record.

**Not struck, and I checked.** I had a strike drafted against loop 63 for leaving three-band colour
ramps using the same `#059669` / `#d97706` literals in `SOPIntelligenceMode.tsx:155,373,380` — the file
it had just converted to `confidenceColor.ts`. They are applied to `<Icon style={{ color }}>` and to
`color`+`bg` chip pairs (`:395`, `:451-453`), i.e. non-text at a 3:1 floor and self-consistent
light-on-light pairs that are theme-independent. **Different class. Not a defect.** The two-minute check
that killed that strike is the same check §3 is about.

---

## 3. Q1 — the failure mode, named; and **no, do not add the rule**

### 3.1 The three instances, and what is actually common to them

| # | Loop | Instrument | What it reported | What was true |
|---|---|---|---|---|
| 1 | 62 (via 61) | a Playwright spec | *"4/4 pass … across all three SOP modes"* (loop 57) | the spec never rendered a SOP; `activeTab` is React state initialised to `'workflow'` and the mode switches sat behind `if (count > 0)` |
| 2 | 63 | an axe scan | one `color-contrast` band failing | **three** bands failing — green 4.29 dark / 3.77 light, blue 3.13 dark, amber 3.19 light — the fixture rendered a single confidence value |
| 3 | 64 | a backlog row's count | 53 usages, 2 colours | 68 usages, 7 colours, and the largest group in `@layer components` invisible to any `ring-` grep of `.tsx` |

Your proposed rule is *"before closing a row that cites a count or a location, independently re-derive
it."* That is a fair reading of instance 3. It is **not** a reading of 1 or 2, and that matters.

The thing common to all three is narrower and more useful: **an instrument's output was read as the
extent of the defect, when the instrument's coverage was narrower than the defect.** In (1) the
instrument was a test whose coverage was zero; in (2) an axe scan whose coverage was bounded by the
fixture's single data value; in (3) a grep whose coverage was bounded by its shape. Re-deriving a
*count* addresses only (3).

### 3.2 The evidence against adding a rule is that the practice already fires 3/3

All three were caught **inside their own loop, by the coordinator, before anything shipped**:

- Loop 61/62 found the vacuity by *strengthening the assertions MR-035 asked for* and watching all three
  mode tests fail. The entry is explicit: *"Strengthening them as instructed made all three mode tests
  fail, and the reason is worse than the review could see."*
- Loop 63 found bands 2 and 3 by *doing the arithmetic instead of trusting the scan*: *"The scan found
  one band; the arithmetic found three … Fixing the band the fixture rendered would have left two live
  failures that no ratchet could ever surface."*
- Loop 64 found 68/7 by *enumerating rather than searching*: *"Searching for the shape of a defect only
  finds it where you already expect it to live."*

A rule that mandates behaviour exhibited three times out of three, unprompted, is ceremony by your own
definition. It would also duplicate **P-11** (verify the row before building it), which MR-034 §9 and
MR-035 §11 both scored as holding and earning its keep, and which already covers the row-count half.

### 3.3 The decisive argument: the rule would not have caught the one instance that escaped

S-2 escaped. And it escaped *despite* re-derivation: loop 64 **did** independently re-derive the count —
that is how 53 became 68. What it did not re-derive was **what the value resolves to at runtime**. A
rule worded *"re-derive the count or location"* is satisfied by loop 64's own behaviour and still lets
`LensSwitcher.tsx:125` through at 1.40:1.

So the rule you are considering is simultaneously redundant against the three catches and insufficient
against the single escape. **Ruling: do not add it.**

### 3.4 What to record instead — one practice, already in the codebase's idiom

Loop 64 did the right thing once and did not generalise it. From its own entry:

> **Verified in the compiled CSS, not just the build exit code.** `@apply` with an arbitrary `var()` is
> the kind of thing that can silently emit nothing; my first grep found zero matches and I nearly
> believed it.

That is the general practice: **measure at the layer that renders, not the layer that authors.**
Compiled CSS, not the className. Rendered DOM, not the spec's intent. The enumerated set, not the row's
count. The *resolved* custom property, not the fallback literal next to it. Loop 64 applied it to
emission and to the count, and not to colour resolution — which is precisely where it lost one site.

Recorded here as an MR-level practice, **not** proposed as a `CLAUDE.md` control. It needs no rule
because it needs no compliance: it is a habit, in the same family as MR-034 §4.3's *"assert the
post-condition, not the pre-condition."*

**One optional mechanical check, offered not proposed.** For the CSS half specifically, the failure has
a detector that costs one grep: **flag `var(--X, fallback)` where `--X` is defined** (the fallback is
dead and invites exactly this mismeasurement) **and where `--X` is not defined** (the fallback is the
only thing rendering, and nobody knows it). On the current tree that is 21 `--accent` sites, 5
`--content-primary`, 4 `--surface-elevated`, and 1 live-fallback `--accent-subtle`. It would have caught
S-2. Whether that is worth a script in `quality-gate` is your call, not mine (§13).

---

## 4. Q2 — loop 64 was **one outcome**, but two of your three reasons are wrong

**Verdict: one outcome. Your conclusion is right. Your argument is not the one that carries it, and one
half of it is factually false.**

### 4.1 The reason that actually settles it — and you did not use it

**Row #230 filed both halves as one item.** Verbatim from the row as it stood before loop 64
(`git show 25cc7bd:IMPROVEMENT_BACKLOG.md`):

> **Fix:** a per-theme ring token following the #206/#222 convention, not another literal … **Worth
> adding a light-theme axe pass, since no ratchet currently exercises `.light` at all — that gap is the
> reason this went unseen, and is arguably the more valuable half of this row.**

The row states that the missing light ratchet **is the root cause of the defect**, and scopes the pass
as *"the more valuable half of this row."* Shipping both is not stretching the one-outcome test; it is
**delivering the row as written**. That argument is decisive, it was available in the row the loop was
closing, and neither the iteration entry nor your question uses it.

### 4.2 The half of your argument that is false

*"(a) without (b) is unverifiable."* No — (a) was verified, arithmetically, in the loop itself: seven
colours measured against two surfaces, `#15803D` at 4.79:1, the four passing colours enumerated with
their ratios. That is the same WCAG relative-luminance method loops 25, 35 and 62 used. (a) without (b)
is **unguarded against regression**, which is a different and weaker claim.

And per S-1, (b) does not actually guard (a) anyway — so the claim is not merely overstated, it is
inverted. What (b) guards is light-theme *text* contrast, which is real, new, and the thing that
produced #232.

### 4.3 The half that holds

*"(b) without (a) ships red"* is true and is the reason a split in that order is impossible. It is also
the reason the split in the *other* order — (a) at 64, (b) at 65 — is unattractive but not illegitimate:
once (a) lands, (b) is green, so holding it buys nothing and costs a window in which the fix is
unguarded. Your own hold-back convention (§5) exists for tests that go **red**; it has no application to
a test that goes green the moment its companion lands.

### 4.4 Did you stretch the test to avoid splitting?

**No, and the diff supports that.** `git show --stat 8293292`: 29 files, +219/−76. Of those, 26 are
one-to-four-line className substitutions, `globals.css` is +16/−? for three token lines and a comment,
and the entire (b) half is `e2e/helpers/theme.ts` (60 LOC, new) plus 37 lines in `sop-a11y.spec.ts`.
This is not two features wearing one commit; it is a mechanical sweep plus the check for the sweep.
Compare loop 63, which **did** split — *"Two things were deliberately not folded in (#231)"* — on a
smaller surface. The instinct is calibrated; the write-up over-argued a case that was already won.

---

## 5. Q3 — the hold-back convention is real, it is verified, and its failure mode is visible in loop 64

### 5.1 It is established, and I verified the round trip by counting tests per commit

| Loop | Spec top-level tests | Event |
|---|---|---|
| 62 (`b2546ec`) | **1** | 3 tests held; #229 filed with measurements |
| 63 (`25cc7bd`) | **4** | the 3 held tests ship green with their fix; #229 struck |
| 64 (`8293292`) | **6** | 2 light tests ship; dashboard light held; #232 filed |

`grep -c "^test(" e2e/app/sop/sop-a11y.spec.ts` at each commit. Loop 62 said *"The three tests covering
those states are omitted"*; loop 63 said *"The three tests loop 62 held back are now shipped green."*
**Both statements are exactly true — three held, three shipped, one loop later.**

### 5.2 The structural property that makes it a convention rather than a promise

**The hold is recorded in the artefact that would carry the test, not only in the log.** Loop 62 put the
rationale in the spec file; loop 64 did it again at `sop-a11y.spec.ts:108-123`:

> Only the SOP surface is covered in light for now. The dashboard is NOT, and that is a measured
> decision rather than an oversight: probing it found a real `color-contrast` failure on
> `text-green-400` / `text-red-400` health figures … filed as row #232 … **It goes in with its fix.**

That is what answers your worry. A held test whose absence is documented *in the spec that lacks it*,
with a row number, is discoverable by the next person who opens the file — which a log entry four
thousand lines down is not. It is also why the rejected alternative is correctly rejected: loop 62's
*"a baseline that tolerates serious violations is precisely how a zero-tolerance policy becomes
decorative"* is the same argument loop 19 made when it kept `v2-a11y` out of the CI gate rather than
raise its ratchet (`SYSTEM_HEALTH.md:67`). This is house style, consistently applied for forty loops.

### 5.3 The failure mode you are not seeing — and it is present, in loop 64

**A hold is only safe if it is recorded. In loop 64 one was not.**

Three SOP modes exist. **Two got light-theme scans — Execution (`:124`) and Analysis (`:135`). Flow View
did not.** The comment quoted above explains why the *dashboard* is absent; it says nothing about Flow
View. The entry's *"light-theme axe coverage is now live on the SOP surface"* and
`SYSTEM_HEALTH.md:15`'s *"first light-theme coverage this repo has ever had"* both read as surface-wide.

Flow View is the mode that carried #229's `scrollable-region-focusable` failure, that loop 63
restructured (`role="img"` → `role="group"`, `tabIndex={0}`), and that still carries #231's hardcoded
light scrollbar (`SOPVisualMode.tsx:202`, `scrollbarColor: '#e2e8f0'`). It is the least-settled of the
three and the one without light coverage.

**I do not know whether Flow View light passes** (§12) — most of its palette is hardcoded
`bg-amber-50`/`text-amber-700`-style pairs that are theme-independent, so it may well be green. If it is
green, this is an unrecorded omission of a cheap test. If it is red, it is an **unrecorded hold** — which
is the exact thing you are worried about, in the loop that best demonstrates the good version.

**Ruling: the convention is worth writing down, and the clause that makes it safe is the one loop 64
broke.** The convention is *"when a new check goes red outside the current row: hold the test, file the
finding with measurements, ship the test with its fix — and record the hold in the file the test would
live in, naming the row."* Without the last clause it is indistinguishable from never having written it,
exactly as you suspect. With it, it is self-auditing. I am recording that as an MR-level convention
statement, **not** proposing a `CLAUDE.md` control: it has been followed unprompted for three loops and
has one omission, which is a correction, not a rule gap.

---

## 6. Q4 — follow-up debt: the ratio is 0.75, the pool grew by 2, and the second number is the real one

Derived from `git show <commit> -- IMPROVEMENT_BACKLOG.md` per loop, not from log prose.

| Loop | Commit | Struck | Created | Note |
|---|---|---|---|---|
| 61 | `89eac6b` | 0 | 0 | **#109 UN-struck** — a closure reversal |
| 62 | `b2546ec` | 0 | **#229** | |
| 63 | `25cc7bd` | **#229, #109** | **#230, #231** | |
| 64 | `8293292` | **#230** | **#232** | |

```
Window (61-64):   3 closed / 4 created  =  0.75          (floor 0.5)
```

**Trailing 10 (loops 55-64), the window the policy specifies:**

```
created:  55:0 56:0 57:1 58:0 59:0 60:0 61:0 62:1 63:2 64:1  =  5   (#228,#229,#230,#231,#232)
closed:   55:0 56:1 57:1 58:0 59:1 60:0 61:-1 62:0 63:2 64:1  = 6   (#92,#109,#228,#229,#109,#230)
ratio  =  6 / 5  =  1.20                                       (floor 0.5)
```

**Two honesty deductions, and they are large.**

1. **#109 is counted twice.** It was struck at loop 57, un-struck at loop 61 (*"RE-OPENED at loop 61 — I
   closed this on evidence that did not exist"*), and struck again at loop 63. Both strikes fall inside
   the trailing window. Counting the row once gives **5 closed / 5 created = 1.00** — and the honest
   reading is that #109 contributed **zero net** against its loop-57 state while consuming three loops.
2. **Two of the three window closures are rows the coordinator filed inside the same window.** #229 was
   filed loop 62 and closed loop 63; #230 was filed loop 63 and closed loop 64. Counting only work that
   originated outside the window: **1 closed (#109) / 4 created = 0.25** — below the floor, and the same
   degenerate case MR-034 §10 and MR-035 §9 both hit.

**The number that is not in the policy and should be read instead.** Parsing unstruck rows at each
commit:

```
loop 55: 120 open   loop 59: 118   loop 60: 118   loop 61: 119   loop 62: 120   loop 63: 120   loop 64: 120
```

**The pool is exactly where it was ten loops ago, and it grew by 2 across this window** (118 → 120).
MR-035 measured 101 → 99 by a different parse and called it *"net −2 across five loops."* On my parse
the equivalent figure is **net +2 across four loops**. Direction reversed; magnitude equally
uninformative. Fourth consecutive review to say the ratio is not the constraint.

### 6.1 Your specific question: should found-by-the-work findings count differently?

**Yes in interpretation, no in arithmetic — and here is the distinction that matters.**

Of the four creations, **all four were found by the work rather than deferred from it**: #229 and #232
by a scan that had never run before, #230 by a specialist's caveat during a consult, #231 by scoping
discipline on an adjacent defect. Loop 63's entry claims exactly this and I verified it: *"Net zero, and
the two created are both real findings rather than deferred work."*

That is a materially different thing from debt. Deferred work is a loop electing not to finish; a
finding is a loop making the product's true state visible. **A ratio that cannot tell them apart will
read worst precisely when a loop is doing its most valuable thing** — which is what happened here: the
window that ran the repo's first light-theme probe is the window that drove the ratio from 4.00 to 1.20.

But I will not propose splitting the numerator, for one reason: **the split is unfalsifiable by the
person making it.** Every row can be narrated as a finding. The only reader who can adjudicate is a
meta-review, retrospectively, which is what this section is. MR-034 and MR-035 both reached the same
place from the other direction — they found the numerator inflated by *bookkeeping* strikes and declined
to amend the metric.

**Ruling: the trend is healthy and the metric is not measuring it.** Three of four loops shipped a real
defect fix; the fourth (61) shipped a correction that removed a false claim from the record. Four new
rows, all evidence-bearing, two of them already closed. The pool did not move because the pool has 120
rows and this window touched five. **Read the pool count and the origin of each creation; the ratio has
now been uninformative for four consecutive reviews and I am not proposing to fix it, because the fix
would be a number the coordinator grades itself on.**

---

## 7. Q5 — D-1 has become ritual, and the specific harm is that it **displaced** the two live controls

### 7.1 The arithmetic, updated

- Last commit touching `apps/extension-app`, `packages/segmentation-engine`,
  `packages/normalization-engine` or `packages/policy-engine`: **`871e29a`, 2026-09-24, loop 42**
  (`git log -1 -- <the four paths>`). Unchanged since MR-035.
- Iterations since: loops 43–64 = **22**.
- Figure reported in the log: loop 60 said **14**. Loops 61, 62, 63 and 64 say **"D-1 unchanged"** —
  **no number at all.**

MR-035 §8 found the counter understated the fact by ~4 and that the increment convention was unwritten.
The response across four loops was to **stop reporting the number** while continuing to report the
acknowledgement. That is the worst of both: the ack still costs a line every loop, and the fact it was
supposed to carry is now absent. The true figure is 22 and no entry states it.

### 7.2 The new evidence, and it converts MR-035's verdict into something actionable

MR-035 ruled D-1 *"no longer reporting the fact — performing the report."* I can now name the cost,
which MR-035 could not:

**In loops 61-64 the coordinator logged the one control that cannot be cleared, four times, and logged
neither of the two controls that had actually tripped, zero times.** Area saturation trips at loop 64
(three consecutive `web-app / a11y`); agent rotation is at 12 against a threshold of 4. Both are in
`CLAUDE.md`. Neither appears in any of the four entries (§2, S-3).

This is not a coincidence of omission. The per-loop governance line has a budget — one or two bullets at
the top of an entry — and D-1 occupies it by convention. A ritual does not merely waste a line; **it
teaches that the governance line is a formality, and the next control to need that line does not get
it.** That is the harm, and it is measurable here: two tripped controls, four loops, zero mentions.

### 7.3 What should replace it

**Replace the per-loop D-1 ack with a per-loop selection-controls line that states all three as facts,
computed rather than carried:**

```
controls — Area: web-app/a11y ×3 (TRIPS; next loop must pivot)
           agent: coordinator ×12 (threshold 4)
           extension: 22 loops since 871e29a; #216 CEO-blocked, no clearable row
```

Three properties matter. It is **derived**, so it cannot drift the way the hand-incremented 14 did — one
`git log -1` and a scan of the last three Area cells. It is **complete**, so no control can be crowded
out. And it turns D-1 from an acknowledgement (which implies a choice) into a **standing fact with a
date** (which is what it is), which is precisely MR-035 §8's recommendation — *"better stated as a date
than a counter"* — made operational.

**This is a change to how an entry is written, not to a rule, so it needs no `CLAUDE.md` edit and I
propose none.** If you would rather formalise it, that is #190/#212 territory and it is yours (§13).

---

## 8. Q6 — what I think you got wrong, including the deliberate calls

Beyond S-1 through S-4, which are the substantive ones:

**8.1 Loop 61's spec deletion was right; the entry's framing of the alternatives was not.** The entry
gives two rejected options: *"Reverting restores a vacuous green, which is worse than no coverage
because it is believed. Keeping it red blocks the deploy gate for everyone."* There is a third, and it
is the one this codebase uses: `test.skip()` with the row number in the skip reason. That keeps the
fixture requirements *in the file where the next attempt will look*, which the entry itself identifies
as the need — *"What a working spec needs, recorded so the next attempt starts where this one stopped."*
It then records those requirements in the log and the backlog row instead. Loop 62 found them there and
rebuilt successfully in one loop, so **no harm resulted** — but the codebase re-enabled two `.skip()`s on
`sidepanel-real.spec.ts` by *"removing `.skip()` alone"* (MR-034 §5(b)), so the pattern was available and
proven, and the entry presents a binary where a third option existed.

**8.2 Loop 63's `#109 closes at a genuine 3-of-3` is true of modes and not of themes.** The row asked for
axe regression coverage on the sop-view surface. At loop 63 that was three modes, dark only. One loop
later the same surface gained light coverage on two of three modes and the *dashboard* light coverage was
found to be blocked. So the closure was correct against the row's text and the surface was less covered
than "3-of-3" conveys. Small, and loop 62's refusal to round up one loop earlier is the reason I am
willing to read this generously.

**8.3 Loop 64 measured four colours to declare them passing and did not record where they are.** The
entry lists *"red-500 3.60, brand-600 3.60, blue-500 3.52, the `#16a34a` accent fallback 3.15"*. Three of
those sit between 3.0 and 3.6 against a 3:1 floor — a margin of 0.5 or less. They are now the only
focus rings not on the token, they are unenumerated (my grep: red-500 ×5, brand-600 ×4, blue-500 ×1,
accent ×1), and if any surface behind them darkens or lightens they cross the floor with nothing
watching. *"Rewriting them would have been tidying"* is a defensible call; leaving them without the site
list is not, given the entry's own lesson about counts.

**8.4 The `#232` row and the held test are now a promise with no owner.** Loops 62→63 closed the loop in
one iteration. Loop 64's held test depends on #232 being picked, and #232 is score 11 in a 120-row pool
where the highest scores are 14-16. The convention's credibility rests on the return happening; §11
endorses accordingly.

**8.5 A prediction, so it can be checked against me at MR-037.** The next instance of the Q1 pattern
will be in the `@layer components` / design-token layer again, not in a backlog count — because that is
where authoring and rendering are furthest apart, and because §2's census shows 31 dead-or-live-fallback
sites still standing. If MR-037 finds it somewhere else, my §3 root-cause naming was too narrow.

### 8.6 What I am charging to the meta-review layer, not to you

**MR-035 dropped two standing CEO decisions between cycles.** MR-034 §13 listed nine recommendations
including *#57 criterion-3* (*"UNSCOREABLE since loop 48 — six loops, now the oldest blocking decision
in the set"*) and *P-6: enforce or retire* (*"This is the second meta-review to ask"*). MR-035 §14 lists
four, and neither appears. #57 criterion-3 is now **16 loops** unscoreable and was surfaced in neither of
the last two reviews. **MR-035's control table also omits agent rotation**, which is how a 4+ threshold
reached 12 without comment (§2, S-3). The CEO-decision list is not being carried forward reliably, and
that is a defect in this document's lineage, not in yours. §13 restates the full list.

---

## 9. What the window got right, named because it is why the strikes are small

- **Loop 62's rebuilt spec is the best single artefact in five windows, and it over-delivered on the
  instruction.** MR-035 §12 required *"every state transition must assert that it happened."* The spec
  does that (`switchMode` awaits `aria-pressed="true"`, `:57`) **and** adds the assertion MR-035 did not
  think to ask for: `await expect(page).toHaveURL(...)` before anything else (`:43`), *"so the failure
  names the real problem"* rather than presenting a redirect as a missing button. It also removed the
  mock entirely and seeded a real SOP artifact (`e2e/seed-test-db.js`, +72 at `b2546ec`), which is the
  harder and correct route — and is the one loop 61 predicted (*"a seeded workflow with a real SOP
  artifact is probably a better route than mocking one"*).
- **Loop 61 deleted its own shipped spec and corrected a CEO-facing claim in place.** *"Loop 57 reported
  '4/4 pass, zero critical or serious violations across all three SOP modes'. That was false."* Struck
  in the log rather than edited to look right. It also fixed the validator rather than reword the
  correction the validator had flagged — *"a validator that cannot distinguish a statement from a
  quotation of it is a validator that punishes writing the correction down"* — and I verified the fix at
  `validate-backlog.mjs:245-251`, where retracted claims are stripped before the closure scan.
- **Loop 63 changed its mind on a specialist's evidence, in the specialist's favour, against its own
  prior.** *"I had assumed `role="img"` was suppressing per-step detail that keyboard users would
  otherwise reach. It is not."* And it took the caveat seriously enough to file #230, which became the
  most valuable row of the window.
- **Loop 63 fixed the source, not the call site.** Five duplicated copies of one colour triple became
  `confidenceColor.ts` returning `var()` references *"deliberately returning `var()` rather than hex so
  it cannot be captured at module scope and frozen to one theme."* That is the MDR-P05 lesson applied
  pre-emptively, and the third time in a fortnight this codebase has collapsed a duplicate rather than
  patched one copy.
- **Loop 63 got `--status-info` into three places, not two**, including the SOP print block — *"a token
  missing from it would have printed light-blue figures on white at roughly 2:1."* Verified:
  `globals.css:37`, `:79`, `:484`. The same discipline applied to `--focus-ring` at loop 64 (`:45`,
  `:80`, `:485`). Both correct.
- **Loop 64 disbelieved its own grep.** *"my first grep found zero matches and I nearly believed it,
  then noticed I was searching the wrong chunk."* That is §3.4's practice, recorded in the entry, in a
  loop that could have reported a clean build and moved on.

---

## 10. Control-rule status

| Rule | Status across 61-64 |
|---|---|
| Meta-review cadence (2-3 loops) | **Over by one, and improving** — MR-034 clean, MR-035 two over, MR-036 one over. Flagged by loop 64 itself. |
| **Area saturation (3 consecutive)** | **TRIPPED and unreported.** `web-app / a11y` at 62, 63, 64. Coarse `web-app` at 10 since loop 55. **Zero checks logged.** S-3. |
| **Agent rotation (4+ consecutive)** | **BREACHED 3× over and unreported.** Coordinator primary at loops 53-64 = 12. Absent from MR-035's table. S-3. |
| D-1 reverse-portfolio drift | **Ritual, and now numberless** — acked 4/4 loops; the figure (14, true value 22) was dropped after loop 61 rather than corrected. §7. |
| Backlog validator | **Clean at zero headroom** — I ran it: `225 rows, 124 struck, 19/19 malformed-row budget used`. Budget still fully consumed; the next stray `\|` fails CI. Unchanged from MR-035. |
| P-11 (verify the row before building) | **HOLDING, and it is the window's engine** — fired at 62 (row's spec was vacuous), 63 (scan understated by 2 bands), 64 (count understated by 15 and one whole layer). Also fired for me, on #189 (§11). |
| Follow-Up Debt ratio ≥ 0.5 | **Passing at 0.75 / 1.20 and measuring nothing** — pool flat at 120 over ten loops. §6. Fourth consecutive review. |
| One-logical-outcome per loop | **Held.** Loop 63 split explicitly (#231); loop 64 bundled and the bundle is defensible (§4). |
| Selection driver logged | **Held 4/4** — `directed` ×3, `top-score` ×1, each with a stated reason. |
| Hold-the-test convention | **Followed 3/3, with one unrecorded omission** (Flow View light). §5. |
| Extension Reliability Invariant | **Guarded but unexercised, 22 loops.** No source change since `871e29a`. §7. |

---

## 11. Loop 65 endorsement

**Two constraints bind before merit.** Area saturation has tripped (three consecutive `web-app / a11y`),
so loop 65 must pivot Area. And loop 64 holds a test that returns with its fix, so **#232 must be taken
at loop 66 at the latest** or the convention in §5 becomes the thing you are worried about.

### PRIMARY: **#189 — `/api/account` fetched twice per dashboard load — `web-app / perf`**

**One line:** it pivots the Area the saturation rule requires, it is the smallest unblocked row in the
pool, and **the fix it asks for is already written and unused** — so it is roughly two imports rather
than the architecture consult MR-035 assumed.

**Premise re-derived now, per P-11 — and it is a fourth instance of §3's pattern, in the row I am
recommending.** The row says *"fetched twice per dashboard load (`TrialStatusChip` +
`RecordingQuotaChip`, each self-fetching)."* True, and understated. `grep -rn "api/account" src` gives
**five distinct client call sites**: `account/page.tsx:353`, `upload/page.tsx:40`,
`RecordingQuotaChip.tsx:26`, `TrialStatusChip.tsx:31`, and `hooks/useAccount.ts:42`.

**And `useAccount` already implements the fix.** `hooks/useAccount.ts:33-36`:

> **Module-level cache.** All hook instances share the same request and cached result so that mounting
> multiple gated components on one page issues only one fetch.

Verified: module-level `cache` and `fetchPromise`, dedup at `:88`, `refetch()` busts at `:71-74`. Its
only consumer is `useFeatureGate.ts:61`. **The two chips bypass a hook built for exactly their problem.**

**This corrects MR-035's endorsement of the same row.** MR-035 §12 wrote: *"it is a real decision about
where the plan lives (NextAuth session vs a shell fetch) … **Consult `system-architect` first**, then
write it. That is the one place in the current pool where delegation buys something."* That describes
**#94's remaining half**, not #189. #189's dedup is settled in the repo. **Do not delegate it** — and
note that following MR-035's instruction would have bought a design consult for a decision already taken
at `useAccount.ts:33`.

**Condition, and it is the whole risk of the pick.** `useAccount`'s cache lives for the module's
lifetime and is busted only by `refetch()`. `RecordingQuotaChip` displays a quota that changes when a
recording lands, so moving it onto the shared cache **changes staleness semantics within an SPA
session**. Either wire a `refetch()` at the point recordings change, or leave that chip alone and dedup
only `TrialStatusChip` (trial state does not move mid-session). **State which, and why, in the entry.**
Doing the two imports without deciding this is precisely the §3 failure mode — the row's count is right,
the row's scope is not.

**Secondary benefit:** #94's remaining half is decision-coupled to #189 by loop 60's own entry
(*"adding a third is the wrong direction"*). Closing #189 removes that coupling from a score-13 row.

### NEXT (loop 66, not later): **#232 — light-theme status colours — closes the held test**

`text-green-400` / `text-red-400` health figures, 20 usages, with `WorkflowRow.tsx:263` documenting the
ratio **for dark only** — the blind spot written into the source. It carries loop 64's held dashboard
light-theme test and the convention's credibility with it. It returns to `web-app / a11y`, which by then
will have had one loop's pivot.

**Fold in, minutes not a loop:**
1. **`LensSwitcher.tsx:125`** — S-2. `focus-visible:ring-[var(--accent,#16a34a)]` → the `--focus-ring`
   token. One line, and it is currently the worst focus ring in the app.
2. **Flow View light scan** — S-5/§5.3. Either add the third light test or record why it is absent, in
   the spec, beside the comment that records the dashboard's absence.
3. **Correct row #230's closure text** — S-4. The 68 counts className sites; the component-layer rings
   are the other 3 of 70, and `.btn-primary` alone is 91 usages.

### NOT endorsed, with reasons
- **#105 (WDC2-P06 ColumnPicker axe coverage)** — MR-035's PRIMARY, passed over for four loops. Premise
  re-verified today: `grep -c "Customize columns\|ColumnPicker\|PresetChip\|SavedView"
  e2e/app/dashboard/v2-a11y.spec.ts` = **0**, and the file is 558 lines / 12 top-level tests (the row's
  *"12 tests; 360→503 LOC"* is stale on LOC). It is still valid and still worth doing — but it is
  `web-app / a11y`, so it cannot be loop 65, and #232 outranks it for loop 66 because #232 has a held
  test attached.
- **The 14s and 16** — unchanged from MR-035: #108 blocked (`runCount` → 0 hits in
  `packages/process-engine/src`, re-verified), #168 carries MR-034's still-unresolved overlap flag,
  #137/#138/#122 are multi-iteration roadmap rows.
- **A non-`web-app` pivot for the coarse backstop** — ten consecutive `web-app` loops wants one, and
  there is almost nothing available: #216 is CEO-blocked, #108 is blocked, and #110's residual
  (`sopSchemaVersion` / `migrateSOP`, **0 hits** in `packages/process-engine/src` and
  `apps/web-app/src`, so genuinely open) is design work on a row whose score cell no parser can read.
  **Flagged for you, not endorsed** — it is a consequence of the decision backlog, not of selection.

---

## 12. What I could not verify

1. **Test counts.** *"web-app 3195"* (loops 62, 63, 64, unchanged from loop 60's 3188 → 3195) and
   *"a11y specs 23/23 (dashboard 15 + SOP 8)"*. Mode 4 — I ran no product suite. I **did** verify SOP =
   6 top-level tests by reading the file, which reconciles to 8 with the two auth-setup project
   dependencies exactly as MR-035 §2 established, and dashboard = 12 top-level + 3 parameterised = 15.
   The arithmetic checks; the run does not.
2. **`pnpm typecheck` — verified clean**, 11 packages, by execution. This is the one repeated claim in
   the window I could and did check directly.
3. **Whether Flow View passes axe in light theme.** §5.3 turns on this and I could not run Playwright
   (needs a live Next server, and a run would mutate `test.db` mid-review). Reading
   `SOPVisualMode.tsx` suggests it probably would — most of its palette is self-consistent
   light-on-light `color`+`bg` pairs (`:242`, `:248`, `:441`, `:451-453`, `:550-552`) that are
   theme-independent — but "probably" is the word, and the point stands either way: the omission is
   unrecorded.
4. **Whether the four passing focus-ring colours are still passing on every surface they appear on.**
   §8.3. I enumerated the sites (red-500 ×5, brand-600 ×4, blue-500 ×1, accent ×1); I did not re-measure
   each against its actual adjacent background.
5. **Whether the 21 dead `--accent` fallbacks cause visible defects beyond the focus ring.** Most render
   chart fills and icon tints (`band-colors.ts`, `TimeSeriesChart.tsx`, `SubscriptionPlanBar.tsx`),
   which sit at the 3:1 non-text floor and are complex to adjudicate. **I verified the divergence
   exists; I did not verify its consequences**, and I have deliberately not filed a row for it.
6. **The exact D-1 increment convention.** Same as MR-035 §13.4 — still unwritten. My figure of 22 is
   `git log`-derived iterations since `871e29a`, which is what the rule's text says.
7. **A near-miss worth recording, in the same spirit as MR-035 §13.7.** I had an S-class strike drafted
   against loop 63 for leaving `#059669`/`#d97706` colour ramps in the very file it converted to
   `confidenceColor.ts`. Reading `SOPIntelligenceMode.tsx:395` and `:451-453` showed they style icons
   and self-consistent chip pairs — a different WCAG floor and a different class. **Killed the strike.**
   Two minutes, and it is the same check §3 is about, aimed at myself.

---

## 13. CEO decisions — surfaced only, nothing applied, no `CLAUDE.md` edit

Ordered by staleness. **Items 3 and 6 were on MR-034's list, absent from MR-035's, and are restored
here** (§8.6).

1. **#216 — shadow-DOM capture semantics. 36 loops blocked.** Still the only extension row and the only
   lever that can clear D-1. The standing fact, stated as a date rather than a counter: *a shipping
   Chrome extension, under a hard `CLAUDE.md` reliability invariant that records two prior
   capture-pipeline regressions, has had no source change since 2026-09-24, and is green in CI but
   unexercised by use.* **Decide it, or declare the extension frozen for this phase and record that.**
   Third consecutive review to ask.
3. **#57 criterion 3 — the chip-click-rate threshold. UNSCOREABLE since loop 48 = 16 loops.** MR-034
   called it *"the oldest blocking decision in the set"* at six. It blocks #57 retirement and leaves
   loop 46's instrumentation inert. **Not surfaced by MR-035 at all** — restored here.
4. **#190 / #193 — MR-020 C1-C3 and MR-021 P-1/P-2.** Both `awaiting CEO approval (edits CLAUDE.md)`
   since mid-September. C2 in particular is the cadence control this document keeps running over.
5. **#191 — Stripe card trial stacking on the reverse trial, charging with no in-app warning.** Awaiting
   a pricing decision; unchanged for ~50 loops.
6. **#212 — P-6: enforce or retire.** MR-033 asked, MR-034 asked (*"This is the second meta-review to
   ask"*), MR-035 did not. **Third ask.** A rule silently overridden by your standing "don't stop until
   complete" directive is worse than no rule.
7. **#225 — `TRUSTED_PROXY_HOPS`.** The measurement shipped at loop 53 and was corrected at loop 54; the
   remaining step is reading a number off `/api/admin/operations` and setting a variable. Auth rate
   limits remain header-bypassable until then.
8. **#107 — blocked, security review required** since loop 48.
9. **Optional, arising from this review:** the dead-CSS-fallback grep in §3.4. It would have caught S-2,
   it is one script, and it is green-or-noisy on day one depending on whether you want the 31 existing
   sites reported or budgeted. **Not endorsed for a loop of its own** — fold it in or decline it.

**Two governance observations, stated rather than proposed** (both are entry-writing habits, not rules):
the per-loop D-1 ack should become a three-control derived line (§7.3), and a held-back test should be
recorded in the file that lacks it, naming the row (§5.3). Neither needs a `CLAUDE.md` edit.

---

## 14. Verdict

**This was the most productive window in five reviews, and its defects are all the same defect one level
below where it was caught.**

Four loops found a vacuous spec that had reported 4/4 while rendering nothing, a contrast defect three
times larger than the scanner could see, and a focus-ring defect fifteen usages and one entire CSS layer
larger than the row that filed it. Each was found by refusing the instrument's answer: strengthen the
assertion, do the arithmetic, enumerate instead of grep. That is the loop working, and it is why my
answer to Q1 is **no rule** — a control that mandates what already happens three times out of three is
ceremony, and the one instance that *did* escape (S-2, a focus ring left at 1.40:1 because its dead
fallback was measured instead of its resolved value) is outside the reach of the rule as you worded it.

**The two things worth changing are both about what gets written down, not about what gets done.** The
claim that a check now exists for the focus ring is false — axe has no focus-contrast rule, and the new
light-theme tests guard text, not indicators (S-1). And the per-loop governance line has been spent four
times on the one control that cannot move, while Area saturation tripped and agent rotation ran to
twelve without a single mention (S-3). D-1 is not just ritual; it is **crowding out** the controls that
are live, and that is a sharper answer to Q5 than MR-035 could reach.

**On loop 64: one outcome, and the row says so.** Row #230 scoped the light ratchet as *"arguably the
more valuable half of this row."* You did not stretch the test — you delivered the row and then argued
for it with a reason ("unverifiable") that is not true and without the reason that settles it.

**Four strikes, none shipped to a user, one live in code** (S-2, one line). **No rule change proposed,
and none is needed.** The control plane is not what failed here. What failed is that the layer a value is
*authored* in kept being mistaken for the layer it *renders* in — in a spec, in a scan, in a grep, and
finally in a CSS variable, inside the loop that had just written the lesson down.

---

*MR-036. Mode 4, governance only, NON-counting. No product code changed. No `CLAUDE.md` edit proposed.
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md` and `SYSTEM_HEALTH.md` untouched.*
