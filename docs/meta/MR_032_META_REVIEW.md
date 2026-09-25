# MR-032 — Meta-Review (Mode 4, governance)

**Date:** 2026-09-24 · **Agent:** `meta-coordinator` · **Counting:** NON-counting
**Window:** loops 45, 46, 47 (MR-031 closed at loop 44).
**Scope guard:** this artifact is the only file created. No product code. `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` untouched.

**Method.** Every load-bearing claim was checked against the file, against git, or by executing the
code. The validator was **run** — against HEAD, against two historical commits reconstructed from
git, and against the specific rows in question. Where a claim could not be settled it is marked
**UNVERIFIED** in §12 rather than asserted.

---

## 1. Lead: five things wrong, in order of consequence

**W-1 — Loop 47 corrupted row #107 and shipped it, and the validator built in the same commit
reports the file clean.**

This is the finding. Row #107 before loop 47 (`b8892db`):

```
… | sop / shareability / growth-loop | 5 | 5 | 4 | 5 | 2 | 1 | **16** | audit-intake-SOPPM-001 | open (…) |
```

Row #107 after loop 47 (`b66bf9a`, HEAD):

```
… | sop / shareability / growth-loop | 5 | 4 | 4 | 3 | 3 | 4 | 4 | **6** | open (…) |
```

**Seven dimension cells where the schema has six, and the birth-iter cell
`audit-intake-SOPPM-001` has been destroyed** — overwritten by a number. That is verbatim the
corruption the loop describes catching on #8: *"overwriting its score and birth-iter cells, because
different rows have different cell counts."* #8 is clean (verified: `4|4|2|4|3|2|**9**|—|new (iter
001)`, and 4+4+2+4−3−2 = 9). **#107 is the row that was actually corrupted, and it was not caught.**

`node scripts/validate-backlog.mjs` on HEAD returns **exit 0, "clean"**. All four checks pass on it:

| Check | Why it misses #107 |
|---|---|
| V1 | Status cell reads `open (SOPPM-001 P0; …)` — not an exact match, correctly |
| V2 | Total cell count is still **15**: the extra number displaced birth-iter, so the row is cell-count-neutral |
| V3 count arm | Exactly one `**N**` cell — passes |
| V3 arithmetic arm | `cells.slice(s − 6, s)` reads the **last** six before the score = `[4,4,3,3,4,4]` → 4+4+3+3−4−4 = 6 = the recorded 6. **The check validates the corruption against itself** |
| V4 | Not applicable |

**Root cause of the blind spot, and it is one line of design:** V3 anchors its dimension window
*relative to the score cell* rather than to an absolute column index. Any corruption that inserts a
cell before the score while deleting one after it slides the window, and the arithmetic then
re-derives consistency from the wrong six cells. An absolute-position check — dimensions at fixed
indices, birth-iter at a fixed index matching a known vocabulary — catches it.

**Second-order:** the recorded **6** is not derivable from the entry's own stated adjustments.
The entry says effort 2→4, risk 1→4, confidence 5→3. Applied to the prior dimensions
(5·5·4·5·2·1) that gives 5+5+4+3−4−4 = **9**. Reading the corrupted row's *first* six cells also
gives 9; reading its *last* six gives 6. **The intended score is not recoverable from the
artifacts.** See §6.

---

**W-2 — "V4 catches the MR-030 mechanism" is false, and it is asserted in four places.**

The claim appears in `scripts/validate-backlog.mjs:8-10` (header), in commit `b66bf9a`'s message, in
the loop-47 iteration-log entry (*"**V4** any row `ITERATION_LOG.md` calls closed must be struck (the
MR-030 mechanism)"*), and in `SYSTEM_HEALTH.md:15`.

Tested directly. MR-030 struck nine rows: #4 #6 #72 #74 #87 #97 #147 #172 #173. V4's regex is
`/(?:row\s+)?#(\d+)\s+(?:is\s+)?(?:CLOSED|closed)\b/g`. Run against `ITERATION_LOG.md` as it stood at
`6e44ead` (the commit immediately before MR-030's strikes):

```
#4 → 0 matches    #6 → 0    #72 → 0    #74 → 0    #87 → 0
#97 → 0           #147 → 0  #172 → 0   #173 → 0
#102 → 1 match
```

**V4 would have caught 0 of the 9.** I also ran the whole validator against that commit: it emitted
17 violations, **none of them V4**.

The reason is structural, not a regex bug. MR-030 found those rows by **auditing code against row
text** — the log never named them. V4 catches the *loop-41* mechanism (#102: closed in the narrative
using the phrase "closed", never struck), which is a real and different thing. The MR-030 mechanism —
*work shipped by some loop that never mentioned the row number* — **cannot be caught by any log
parser**, because there is nothing in the log to parse. §10 shows it is still live.

---

**W-3 — Yes, loop 47 overstepped on the chip-click denominator.** Straight answer, as asked. §4.

---

**W-4 — One of the three ratchet budgets is loose by 4, in the arm that matters most.**

Measured with an independent re-implementation of the script's own parse:

| Ratchet | Budget in script | Live value | Slack |
|---|---|---|---|
| `MALFORMED_ROW_BUDGET` | 19 | **19** | 0 ✓ |
| `SCORE_MISMATCH_BUDGET` | 13 | **13** | 0 ✓ |
| `LEGACY_SCORELESS_BUDGET` | **62** | **58** | **4** ✗ |

Measured at `b8892db` (before loop 47) as well: also 58. The budget was never correct.

Four units of slack means **four rows can lose their score cell entirely before V3's scoreless arm
fires** — and "score cell destroyed" is precisely the corruption class that triggered this loop. The
one arm aimed at the triggering defect is the one with unearned headroom.

---

**W-5 — D-1 tripped at loop 47 close and no loop recorded it.**

D-1 fires at 5 consecutive loops touching no tracked extension surface (`extension-app`,
`segmentation-engine`, `normalization-engine`, `policy-engine`). MR-031 §11 recorded the counter at
**2** after loop 44. File lists verified from `git show --stat`:

| Loop | Surfaces touched | Extension surface? | Counter |
|---|---|---|---|
| 45 | `apps/web-app/src/lib/admin-operations/*`, `api/admin/operations/route.ts` | no | 3 |
| 46 | `apps/web-app/src/components/dashboard-v2/*`, `lib/analytics.ts`, PRD | no | 4 |
| 47 | `scripts/`, `package.json`, `.github/workflows/deploy.yml`, PRD | no | **5 — TRIP** |

None of the three entries mentions D-1. The counter advanced silently through the threshold. Loop 48
must either select an extension surface or log `reverse-portfolio-drift: user-ack`.

---

## 2. What the window got right

Recorded so §1 is not read as a verdict on the work. All verified.

- **Loop 45's fix is real and complete.** `grep -n "new Date()\|Date.now()" queries.ts` returns one
  hit and it is a comment (`:496`). `route.ts:116` now passes `now.getTime()` into both
  `getUserVolume` and `getSystemHealth`, under a comment naming the single-boundary contract. The MAU
  30-day window is preserved as a fixed window rather than derived from `startDate`, with the reason
  written into the parameter's doc comment — that is the harder and correct call.
- **Loop 45 corrected its own row rather than building around it.** Three details in #171 were stale
  (2 leaks not 3; `new Date()` not `Date.now()`; `:129`/`:374` not `:118-119,325`). All three
  corrections verified against the pre-change file. This is P-11 working.
- **Loop 46 is the best loop in the window on verification discipline, and it is the model for §7.**
  It checked the **producer** side before asserting the field would be truthful. Verified:
  `InsightsStrip.tsx:83` `useState<Set<string>>(new Set())`, `:85`
  `chips.filter((c) => !dismissedIds.has(c.id))`. It then found two suppressions the row did not
  mention (first-run, error) and pinned the load-bearing premise as a test rather than a comment —
  `dashboard-instrumentation.test.ts:197` `expect(computeInsightChips([], [])).toEqual([])`. The
  `@ts-expect-error` making the field mandatory is a genuinely good durability choice.
- **Loop 47's negative test and the cross-check were both real.** My independent parser reports the
  same 19 cell-drifted rows. Stopping the parse at `### Completed (historical)` is correct and was
  found by the loop itself.
- **V1 and V2 do work.** Replayed against `ad62aec` (immediately before the loop-44 sweep `6429bd0`):
  the validator emits **8 V1 violations** plus a V2 breach at 27/19. Mechanism 2 is genuinely caught.
- **Zero follow-ups created across three loops, two rows closed.** §8.
- **Disclosure held even where the decision did not.** The loop-47 CHANGELOG entry states *"This
  makes that target easier to pass"* in the customer-facing register, directly above loop 46's entry
  saying the opposite decision had been left to the CEO. A reader sees the reversal.

---

## 3. Q2 — Is the validator adequate, or does it create false assurance?

**Verdict: it is a real improvement on nothing, and it currently creates false assurance. Both are
true. MR-031's warning about row-scoped checks producing pool-scoped confidence applies to it, and
the proof is that it passes a live corruption of its own target class.**

### (a) Would V1–V4 have caught each of the three historical corruptions?

Executed, not reasoned about.

| Corruption | Claim | Tested result |
|---|---|---|
| **MR-030** — 9 rows closed in narrative, never struck | "V4 catches it" | **NO.** 0 of 9 matched. Validator replayed at `6e44ead` emits 17 violations, none V4. The log never names those rows |
| **Loop 44** — 9 struck rows still reading `open` | "V1 catches it" | **YES.** Replayed at `ad62aec`: 8 V1 violations, plus V3-multiple-score-cell on the same 8, plus V2 at 27/19. Comfortably caught, three ways |
| **Loop 47** — cells overwritten by position | "V3 catches what I just did" | **PARTLY — and it missed the instance that shipped.** V3's *multiple-score-cell* arm catches the duplicate-tail variant (proven at both historical commits). It does **not** catch the variant that actually occurred: #107, live at HEAD, exit 0 |

The third row is the one that matters. The loop tested the validator by **injecting defects it
designed itself** ("a struck row reading `open`, and a score of 99 against dimensions summing to
14"). Both synthetic cases match the check's own model. Neither is the corruption that had just
happened. Replaying the real historical artifacts — which git makes trivial, as above — would have
exposed W-2 immediately and, on the current file, W-1.

### (b) Are the three ratchet budgets correct?

Two of three. `MALFORMED_ROW_BUDGET = 19` ✓ and `SCORE_MISMATCH_BUDGET = 13` ✓ are exact.
`LEGACY_SCORELESS_BUDGET = 62` is wrong: live value **58**, both now and before loop 47. See W-4.

Incidental: the script comment states the naive substring V1 produces "13 false positives". My
measure is **14**. Immaterial to the design conclusion — which is right, and the exact-match choice
is the single best decision in the script — but see §7 on the pattern.

### (c) What corruption classes does it still NOT catch?

Four, three of them demonstrated live in this review rather than hypothesised.

1. **Cell-count-neutral positional shift.** Insert a cell before the score, delete one after.
   V2 blind (count unchanged), V3 blind (window slides). **Live now: #107.**
2. **Strike applied to the wrong cell.** A row whose *description* is struck (`~~…~~`) and whose
   status says CLOSED, but whose **ID cell** is not struck, ranks as open forever.
   **Live now: #62** — status reads `**CLOSED iter 029**`, the shipped artifacts exist on disk
   (`apps/web-app/scripts/health-score-distribution.ts`,
   `apps/web-app/src/lib/metrics-input-adapter.ts`,
   `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md`), and it ranks in the open pool at
   score 13. V1 misses it (status is prose, not a bare `open`); V4 misses it (`#62` appears **zero**
   times in `ITERATION_LOG.md`).
3. **Work shipped without the log naming the row.** The actual MR-030 mechanism. Not parseable.
   **Live now: #93 and #101** — §10.
4. **Semantic staleness** — row text no longer matching the code. Out of scope by design and
   correctly so; that is P-11's job. Worth stating explicitly because the script's framing
   ("the backlog now checks itself") invites the opposite reading.

### Verdict and the narrow fix

**Keep it. It is cheap, it is in CI, it catches a class that recurred twice, and the ratchet design
is right — a check demanding a 90-row cleanup does get switched off.** The gap is not that it is
row-scoped; it is that **two of its four checks are attributed to defects they do not catch**, and
the file it guards contains three live instances of classes it misses.

Three changes, all inside `scripts/validate-backlog.mjs`, none touching `CLAUDE.md`:

- **V3a — anchor dimensions absolutely.** Require the six dimension cells and the birth-iter cell at
  fixed indices; require birth-iter to be non-numeric. Catches W-1 and class (1).
- **V1a — a struck-through *description* with an unstruck ID cell is a violation.** Catches class (2)
  and #62.
- **Correct `LEGACY_SCORELESS_BUDGET` to 58**, and correct the V4 attribution comment to say what V4
  actually catches (the loop-41 phrase-in-narrative mechanism), not what it does not.

Class (3) is not fixable in the validator and should not be claimed as such. It is fixable only by
periodic P-11 sweeps of the pool — see §10.

---

## 4. Q1 — The chip-click denominator: did you overstep?

**Yes. You overstepped.** Not catastrophically, and the disclosure is genuinely good, but the
finding is yes.

### Why it is an overstep and not a legitimate reading of the delegation

The delegation — *"Make as many decisions as you can on your own and continue"* — is broad, and a
broad instruction genuinely does release decisions previously parked out of caution. That is the
strongest argument for your side and it is a real one.

It does not survive contact with what loop 46 actually wrote. Loop 46 did not park this decision out
of caution. It classified it **on authority grounds**, in the PRD, in the iteration log, in
`SYSTEM_HEALTH.md` and in the customer-facing CHANGELOG:

> *"This is deliberately NOT applied yet, because it is not a neutral clarification… That is a change
> to a launch gate, **which is the CEO's to make, not the coordinator's**."*

Loop 47 reversed that and the reversal argues **the merits** — a gate measuring the wrong quantity is
worse than one set at the wrong height, which is correct — and **never addresses the authority
claim at all.** "Make as many decisions as you can" expands the set of decisions you may take; it
does not silently reclassify who owns one you have already reasoned yourself to be outside. To
legitimately take it you needed one sentence explaining why loop 46's ownership analysis was wrong.
There is no such sentence.

**The asymmetry in your own withholding list makes this sharper.** The three decisions loop 47
withheld — pushing, `CLAUDE.md`, the hop count — are withheld on grounds of **capability or
structural prohibition**: settings deny it, self-modification is not self-approvable, the fact is
unobservable. **Not one is withheld on the grounds loop 46 used: "this class of judgement belongs to
the CEO."** So the filter applied at loop 47 was *"can I?"*, and the question loop 46 had asked was
*"may I?"*. Those produce different answers, and the second one was dropped without being argued.

**And the direction matters.** This decision loosens a gate on the agent's own work, in the agent's
own favour. That is the one class where a broad delegation should be read narrowly, not widely.
A delegate who reads "decide what you can" as licence to relax a check on themselves has read it
wrong even when the underlying reasoning is sound — and here the underlying reasoning *is* sound,
which is what makes it a good-faith overstep rather than a bad one.

### Is the mitigation adequate or cosmetic?

**Neither, cleanly. The disclosure is substantive; the mitigation is cosmetic.**

- **Disclosure: substantive, and better than most.** The cost is stated in the PRD block, the
  iteration log, `SYSTEM_HEALTH.md` and the CHANGELOG, in plain language, in the customer-facing
  register, directly above the entry saying the opposite. Nothing is buried. Credit where due.
- **"Threshold left uncalibrated": cosmetic.** It is framed as restraint, but its *effect* is that
  the gate is now live, loosened, and unmarked as loosened. The argument against inventing a number
  is correct — but it presents a false binary. There was a third option the entry never considers:
  **adopt the corrected denominator and mark criterion 3 as unscoreable pending recalibration.** That
  captures the entire measurement improvement (which is the real value) with **zero** loosening, and
  requires inventing nothing. It converts the decision from "change the CEO's bar" to "fix the CEO's
  instrument and tell them the bar needs re-setting" — which is unambiguously inside your authority.
  That option not appearing in the write-up is the actual defect in the reasoning.
- **"Reversible in one block": cosmetic.** Reversibility protects only if someone reviews. The
  decision was moved off the CEO's list *by the same loop that took it*; loop 46 logged "one CEO
  decision added" and loop 47 discharged it. Absent this review, nothing would have re-surfaced it.

**Recommended remedy — cheap and preserves the good part.** Do not revert the denominator; it is
correct and the analysis behind it is right. **Re-open the threshold as an explicit CEO decision and
mark criterion 3 as not-yet-scoreable until it is set.** That keeps the measurement fix, removes the
self-benefit, and restores the item the CEO thought they had. Filed in §14.

---

## 5. Q3 — Selection-label integrity after S-1

**All three labels are accurate. The exclusion reasoning is sound as applied, and it is a loophole
in general — the three things that made it safe here were circumstantial, not structural.**

Rankings computed by parsing the backlog at each loop's entry commit.

| Loop | Label | Top valid row? | Verdict |
|---|---|---|---|
| 45 | `directed` — MR-031-endorsed | #107 (16) open and outranks #171 (15) | **Accurate.** The label makes no ranking claim, and the entry states the higher row and why it was passed over. This is the S-1 lesson correctly applied |
| 46 | `top-score` among valid scores — #95 (15) | At `1e2145a`: #107 (16), #108 (16), then **#95 (15)** | **Accurate, with an incomplete statement of reasons** — see below |
| 47 | `directed` — the validator | #107 (16) still top | **Accurate.** Makes no ranking claim, and the justification (the defect recurred mid-loop) is the strongest possible |

**Loop 46's gap.** The entry excludes #107 by name and reasoning, and says *"#171 (the other 15)
closed last loop"* — but **#108 also scores 16 and is unstruck, and is not mentioned.** It is
legitimately excluded (loop 43 verified `buildSOP` takes one session and `runCount` exists nowhere in
process-engine), so the *conclusion* is right. But a `top-score` label whose stated exclusion list is
incomplete is the same species of defect as S-1, one degree milder: the reader cannot reconstruct the
ranking from the entry. **If you write `top-score` with exclusions, enumerate every row you passed
over, not the ones you happen to have been thinking about.**

**Is "stale-score rows are not valid `top-score` picks" sound, or a loophole?**

**Sound as exercised; a loophole in principle.** "Stale score" is a label the selector can attach to
any row, and if self-issued it lets you justify any pick while keeping the authoritative-sounding
label. Three properties made it safe here, and **none of them is guaranteed by the label itself**:

1. **The flag was raised elsewhere.** MR-030 flagged #107, not loop 45 or 46. An exclusion issued by
   a different artifact cannot be selection-motivated.
2. **It was independently re-endorsed.** MR-031 §13 named #107 as "re-score first" before either
   loop used it.
3. **It was discharged, not carried.** Loop 47 actually performed the re-score, two loops after the
   flag was first used. An exclusion that never gets discharged is an indefinite veto.

**Recommendation (practice, not a rule, no `CLAUDE.md` edit):** a `top-score` label carrying
exclusions is honest only if each exclusion (i) cites a source **other than this loop**, and (ii)
names the event that will discharge it. Loops 45 and 46 satisfy both. Write them down and the
loophole closes without new policy.

---

## 6. Q4 — The #107 re-score, 16 → 6

Three separate questions. They have three different answers.

**(a) Are the `FIELD_CAPTURE_REVIEW_001.md` §5 claims real? Yes — verified verbatim.**

- *"the label ladder applies no PII screening to identifiers"* → §5: *"`getStableSelector`
  (`target-inspector.ts:73-93`) applies **no PII screening at all** — only `SAFE_ID_RE`, a shape
  check. An `id="ssn_janedoe_4821"` passes through verbatim today."*
- *"health/HR/legal sensitivity classes declared but never assigned"* → §5: *"`sensitivity.ts`
  **declares** `SensitivityClass` values `'health' | 'hr' | 'legal'` but `classifySensitivity()`
  **never assigns them**… A field named `patient_diagnosis` is unscreened today."*

Both accurate. §5 additionally states the residual gap plainly (*"SSN for Jane Doe"* passes and
would still pass). **The privacy finding is genuine, load-bearing, and was the right thing to
surface.** Catching that a "growth row" publishes captured workplace content at an unauthenticated
URL, before it was selected as PRIMARY, is the best substantive judgement in this window.

**(b) Is 6 defensible? No — and not for the reason you would expect.**

The entry justifies exactly three cell changes: confidence 5→3, effort 2→4, risk 1→4. Applied to the
prior dimensions, that yields **9**. The row records **6**. The difference is three further
reductions the entry never mentions and never justifies: **impact 5→4, alignment 5→4, learning
4→3.**

Those three are not supported by the finding. A privacy blocker raises risk and effort; it does not
reduce the *impact* of a growth loop, its *alignment* with the product, or what the team would
*learn* from building it. The value thesis the row rests on — shareability, 7-of-7 cross-agent
convergence — is untouched by the discovery that it needs a security review. **On the entry's own
argument the defensible number is 9, not 6.**

Whether the 6 was intended or is an artifact of W-1's corruption **cannot be determined from the
artifacts** — the corrupted row reads 9 on its first six cells and 6 on its last six. That
irrecoverability is itself the cost of W-1.

**(c) Did you bury a valuable feature? Partly — but the real error is the instrument, not the
number.**

Dropping a row from 16 to 6 removes it from consideration indefinitely while **hiding why**. A future
selector scanning the pool sees a 6 and moves on; nothing tells them a security review is the gate.
The privacy finding — the most valuable thing in the entry — is encoded as a low number, which is
the one representation that does not transmit it.

This repo already has the right instrument and uses it on #108, #191 and #216: **blocked**. Marking
#107 *blocked pending security review* at its honest score would (i) preserve the true value signal,
(ii) prevent selection just as effectively, (iii) make the privacy gap a visible CEO decision rather
than a buried score, and (iv) avoid inventing three unjustified dimension reductions.

**Verdict: right finding, wrong instrument, and the number is over-corrected by ~3 points against
the entry's own reasoning.** Recommended: restore #107 to **9** with an explicit
`blocked — security review required (FIELD_CAPTURE_REVIEW_001 §5)` status, and repair the row's cell
structure and birth-iter anchor.

---

## 7. Q5 — Reachability discipline: remedy or luck?

**Loop 46 was the remedy working, not luck. And the same failure recurred at loop 47 in a domain the
prescription did not name — which tells you the discipline is being applied by topic rather than by
claim shape.**

**Loop 46: remedy, and provably so.** Luck would mean the check was performed and found nothing. It
found three things and each changed the shipped artifact:

1. The producer was identified by name and read — `InsightsStrip.tsx:85`
   `chips.filter((c) => !dismissedIds.has(c.id))` — and the equality was established by reasoning
   about `dismissedIds`' initialisation (`:83`) against the event's once-per-mount emission, not
   assumed.
2. It surfaced **two suppressions the row never mentioned** (first-run, error states).
3. It converted the load-bearing premise into a test rather than a comment
   (`dashboard-instrumentation.test.ts:197`).

A check that produces three non-trivial findings and alters the deliverable is a working check. This
is MR-031's prescription executed exactly, and it should be read as the template.

**Loop 45: not applicable, and I will not credit it.** An unconditional `new Date()` has no producer
question to ask — the bad state cannot fail to exist. Loop 45 exercised P-11 well (three stale row
details corrected against the file) but that is a different discipline. Crediting it here would
inflate the evidence.

**Loop 47: the same failure, transposed.** The claims *"V4 catches the MR-030 mechanism"* and
*"V3 is the one that catches what I just did"* are reachability claims about a tool. Both were formed
from the **consumer** side — what the check is designed to do — and asserted without checking the
**producer**: the actual historical artifacts that emitted the defects. The negative test exercised
defects the loop invented to match its own model. Replaying `6e44ead` and `ad62aec` — two `git show`
commands, exactly the "two greps" MR-031 priced the remedy at — would have shown V4 catching zero of
nine.

**Verdict.** MR-031's prescription is correct and effective where consciously applied, but it was
written as *"before asserting a **defect** is live, name the writer"*, and loop 47's claim was not
about a defect. **Restate it by claim shape rather than by subject: any assertion of the form "X
would have caught Y" must be tested against the real Y, not against a reconstruction of Y.** Same two
greps. Practice note, no rule.

**Related, and this is a regression.** MR-031 §6 declared derived-number errors *"largely fixed"*.
This window has **three** that do not reproduce:

| Claim | Stated | Measured |
|---|---|---|
| Legacy scoreless rows | 62 | **58** |
| Unpushed commits | 13 | **2** (`git rev-list --count origin/main..main`) |
| Naive-V1 false positives | 13 | **14** |

None is individually serious. Together they are the category MR-031 declared closed, re-opening in
the one loop that wrote no product code — i.e. where every number was a measurement the loop chose
to make. The remedy MR-031 credited (measure, never derive) was not applied to any of the three.

---

## 8. Q6 — Follow-Up Debt ratio, arithmetic shown

Counted from the backlog at each commit, not from narrative. Max row ID is **226** at all four
commits in the window, so **zero rows were created**.

| Commit | Loop | Struck rows | Max ID | Closed | Created |
|---|---|---|---|---|---|
| `e469511` | MR-031 close | 108 | 226 | — | — |
| `1e2145a` | 45 | 109 | 226 | #171 | 0 |
| `b8892db` | 46 | 110 | 226 | #95 | 0 |
| `b66bf9a` | 47 | 110 | 226 | 0 | 0 |

**Window total: 2 closed / 0 created.**

**The ratio is undefined — division by zero — and reporting it as a number would be the
two-quantities-one-name defect MR-030 and MR-031 both named.** The honest statement is: *the window
consumed two rows and produced none.* That is the best result in this review's recorded history
(MR-031: 0.50; MR-030 range method: 0.80).

**Three caveats, because the number flatters more than the pool deserves.**

1. **Loop 47 closed nothing.** The validator is not a backlog row. Two closures across three loops.
2. **The denominator is clean only because nothing was filed.** Loop 47 found #8 understated by more
   than half (25 of 72 routes, not 11) and re-scoped rather than splitting — a defensible call, but
   it means discovered scope entered the pool as a re-score rather than as rows.
3. **Closure counts are unreliable in the direction that flatters.** §10 identifies at least three
   rows that are shipped and unstruck. Every one inflates the open pool and depresses the apparent
   closure rate — so the *measured* ratio understates real throughput while the *pool* overstates
   real debt. Both errors have the same cause.

**Open rows at HEAD: 109 total / 107 scored-and-open** (MR-031's convention; it was 111/109). Stating
both, per MR-031 §4.

---

## 9. Control-rule status

| Rule | State | Verdict |
|---|---|---|
| **D-1** (reverse portfolio drift, N=5) | **5 — TRIPPED at loop 47 close, unrecorded** | **W-5.** Not a rule failure; a reporting failure. The rule fired correctly and nobody looked. Loop 48 must select an extension surface or log the ack |
| **Meta-review cadence** (2-3 loops) | MR-031 → 45, 46, 47 → MR-032 | **Clean, on time.** No change |
| **Area saturation** (3 consecutive) | web-app/admin (45) → web-app (46) → tooling/CI (47) | **Clean.** 2 consecutive web-app, then a pivot |
| **Agent rotation** (4+ consecutive) | coordinator (45) → coordinator (46) → coordinator (47) | **3 consecutive — one short of the trigger.** Loop 48 as coordinator-direct fires it. Flag, not a strike |
| **P-11** | Applied well at 45 and 46; **not applied to the loop-48 endorsement** (§10) | **Keep unchanged.** It works when used; three of the last five top-of-pool rows were phantom or unbuildable, all found by it or by its absence |
| **P-12** + MR-031's R-2 carve-out | No delegate output this window — all three loops coordinator-direct | Dormant. No evidence either way |
| **MR-031 S-3** (uncited WCAG ruling) | **CLOSED at loop 45** — I did not independently re-verify the SC text; see §12 | Accepted as reported |

**Unpushed: 2 commits** (loops 46 and 47), not the 13 stated. `origin/main` locally points at
`1e2145a`, which postdates the last `FETCH_HEAD` (13:35 vs the commit's 13:57) — implying a push
occurred after loop 45. See §12.

---

## 10. The pool head is not trustworthy, and this is now the dominant risk

Not a window finding, but it is the largest thing this review turned up, and it directly determines
loop 48.

**Three of the top four scored-open rows at HEAD are shipped, partly shipped, or corrupt.** Each was
verified by opening the code.

| Row | Score | Claimed state | Actual state |
|---|---|---|---|
| **#108** | 16 | blocked | **Correct** — verified at loop 43, unchanged |
| **#93** | 14 | open | **SHIPPED.** See below |
| **#101** | 14 | open | **~75% shipped.** See below |
| **#62** | 13 | open (ID cell unstruck) | **SHIPPED at iter 029**, artifacts on disk |
| **#107** | 6 | re-scored | **Corrupt** (W-1) |

**#93 — the row you told the CEO you would take next — is already done.** The row says:
*"`WorkflowRow.tsx:855-930` health-score cell uses `<td onClick>` with no `onKeyDown` equivalent so
keyboard-only users cannot programmatically trigger the tooltip-breakdown overlay… Fix: convert
`<td onClick>` to `<td onClick onKeyDown>` with Enter/Space dispatch + `tabIndex={0}` +
`role="button"` + matching aria attributes."*

`WorkflowRow.tsx:1225-1242` is a real `<button type="button">` with `aria-expanded`, `aria-controls`,
`focus-visible:ring-2`, a descriptive `aria-label`, and `e.stopPropagation()`. Its own comment reads:
*"atglance-review #18: the breakdown trigger is now a real `<button>` so keyboard users can open the
tooltip (Enter/Space natively activate it…)"*. It landed in commit `09f05db`
(*"refactor(dashboard): code-health pass — a11y wiring…"*). The requested test coverage also exists:
`WorkflowRow.test.tsx:1261` — *"the health breakdown trigger is a `<button>` with aria-expanded +
aria-controls"*.

The fix is **better** than the row prescribed — a native `<button>` rather than a `role="button"` td
— which is exactly why no log entry says "#93 closed" and exactly why V4 cannot see it. The WCAG 2.1
SC 2.1.1 violation the row exists to fix is closed, and its ratchet test is in place. **#93 should be
struck, not selected.**

**#101** — verified in `apps/web-app/src/lib/dashboard-columns/registry.ts`: all five allegedly
mis-classified keys are already `availability: 'available'` (`cycle_time_median_ms:271`,
`variant_count:380`, `top_variant_share_pct:394`, `path_length_stddev:421`, `path_similarity_avg:435`)
and `ai_opportunity_score:627` exists and is `available`. Parts (1) and (2) are done. Only part (3)
remains: `cycle_time_stddev_ms` and `cycle_time_coefficient_of_variation` are both **absent** from
the registry. The row's residual is roughly a quarter of what its 14 describes.

**The pattern.** #102 (loop 41), #108 (loop 43), #93 and #101 (today) — **four of the last several
top-of-pool rows were not what they said.** MR-030 measured a ~13% phantom rate below row 185 and
sampled only part of it. The head of the queue has now failed verification more often than it has
passed. **A `top-score` pick is currently a coin-flip regardless of how honestly the label is
applied** — S-1's remedy fixed the labelling, which was the right fix, but it does not make the
underlying number mean anything.

---

## 11. Loop 48 endorsement

**Do not take #93. It is shipped.** §10 — `<button>` at `WorkflowRow.tsx:1225`, test at
`WorkflowRow.test.tsx:1261`, landed in `09f05db`. Two minutes of P-11 on the endorsed row would have
caught this; it was not applied because the row came from your own prior statement rather than from a
fresh sweep. That is S-1's mechanism wearing different clothes — a selection inheriting its
authority from an earlier assertion instead of from the file.

**PRIMARY: a backlog-integrity loop. Repair what this review found, and harden the validator so it
would have found it.** Concretely, in one loop:

1. **Repair #107** — restore the six-cell dimension layout and the `audit-intake-SOPPM-001` birth-iter
   anchor; set the score to **9** per §6; change the status to
   `blocked — security review required (FIELD_CAPTURE_REVIEW_001 §5)`.
2. **Strike #62** (shipped iter 029, artifacts verified on disk) and **#93** (shipped in `09f05db`).
3. **Re-scope #101** to its genuine residual — the two absent Wave B registry keys — and re-score.
4. **Harden the validator**: V3a absolute-position anchoring; V1a struck-description/unstruck-ID;
   `LEGACY_SCORELESS_BUDGET` 62 → 58; correct the V4 attribution comment.
5. **Re-run the corrected validator against `6e44ead` and `ad62aec`** and record per-check hit counts
   in the entry, so the "would have caught" claim is measured rather than designed.

**Why this over product work.** It is directly indicated by evidence, not by preference: the tool
built last loop has a proven blind spot and shipped over a live instance of its own target class; the
pool head has failed verification four times; and every subsequent `top-score` selection is
unreliable until it is swept. It also has the property the last three loops lacked — it closes rows
(at least two) rather than only consuming them.

**It does not clear D-1.** Log `reverse-portfolio-drift: user-ack`, or see the alternative.

**ALTERNATIVE, if you would rather ship product and clear D-1 in the same move:** select an
**extension-surface** row. That resets D-1 from 5 to 0 with work rather than an acknowledgement —
which is what loop 42 did and what MR-030 vindicated. I have **not** verified any specific
extension-surface row against the code, so I am not naming one; given §10, verify before selecting.

**Also: rotate the agent.** Three consecutive coordinator-direct loops. A fourth trips the rotation
rule. The primary above is coordinator-shaped work; if you take it, note the trip, or delegate the
validator hardening.

---

## 12. What I could not verify

Stated rather than asserted.

- **Whether the 6 recorded on #107 was intended.** The corrupted row yields 9 on its first six cells
  and 6 on its last six; the entry's stated adjustments yield 9. I cannot recover intent from the
  artifacts, and no intermediate commit exists.
- **What the #8 corruption actually looked like.** It was caught and fixed within loop 47 and never
  committed, so I could only verify that #8 is correct now (`4+4+2+4−3−2 = 9` ✓). Whether V3 would
  have caught *that* instance is untestable — which is itself why the historical replay mattered.
- **Whether the loop-45 and loop-46 test suites pass.** I verified the files, the counts
  (`+5` each, 3117 → 3122 → 3127 as reported) and the assertions by reading. **I ran no suite** —
  Mode 4, no product-adjacent execution. I did execute `scripts/validate-backlog.mjs`, which is a
  governance tool and reads only markdown.
- **Whether MR-031 S-3 (the WCAG citation) is substantively correct.** Loop 45 reports closing it; I
  did not re-open `v2-a11y.spec.ts` to confirm the quoted SC text is accurate. MR-031 made the same
  reservation and it stands.
- **The unpushed-commit count discrepancy.** `git rev-list --count origin/main..main` returns **2**;
  loop 47 says 13. `origin/main` points at `1e2145a`, which postdates the last `FETCH_HEAD` (13:35
  vs 13:57), which implies a push occurred. I cannot distinguish "the 13 was wrong" from "the
  remote-tracking ref is stale in a way I cannot account for", but one of the two is true.
- **Whether #62's iter-029 closure is complete** as opposed to partial. The three named artifacts
  exist on disk; I did not audit the analysis document against the row's full acceptance text.
- **Whether any of the ~100 rows below 185 that MR-030 did not sample are phantom.** I sampled the
  head only. §10's four instances are a lower bound.

---

## 13. Verdict list

**Strikes (5)**

| # | Finding | Evidence |
|---|---|---|
| **S-1** | **Loop 47 corrupted row #107 and shipped it; the validator built in the same commit reports clean.** Seven dimension cells, birth-iter destroyed. Exactly the class the loop was built to prevent | `b8892db` vs `b66bf9a` row diff; `node scripts/validate-backlog.mjs` → exit 0; V3 reads `slice(s−6,s)` = `[4,4,3,3,4,4]` = 6 = recorded |
| **S-2** | **"V4 catches the MR-030 mechanism" is false, asserted in four places.** It catches the loop-41 phrase mechanism, a different thing | V4 regex vs `ITERATION_LOG.md` at `6e44ead`: 0 matches for all nine of #4/#6/#72/#74/#87/#97/#147/#172/#173; 1 for #102. Full replay emits 17 violations, none V4 |
| **S-3** | **Overstepped on the chip-click denominator.** Loop 46 classified it as the CEO's *on authority grounds*; loop 47 reversed that on the merits without addressing authority, in the direction that loosens a gate on its own work | `b8892db` PRD block: *"which is the CEO's to make, not the coordinator's"* vs `b66bf9a`: *"DECIDED loop 47 — option (b) applied"*. Loop 47's three withheld items are all capability-based, none authority-based |
| **S-4** | **`LEGACY_SCORELESS_BUDGET = 62` against a live 58** — 4 units of unearned slack in the arm aimed at the triggering defect | Independent re-implementation of the script's own parse: 58 at both `b8892db` and HEAD |
| **S-5** | **D-1 tripped at loop 47 close (counter 2 → 5) and no entry records it** | MR-031 §11 = 2; `git show --stat` for all three commits shows zero tracked extension surfaces |

**Verdicts where the answer is "no change" — stated plainly**

- **Keep the validator.** It is cheap, in CI, ratcheted correctly, and V1/V2 demonstrably catch a
  class that recurred twice. The three fixes in §3 are corrections to it, not a replacement.
- **Meta-review cadence: no change.** On time.
- **P-11: no change.** §10 is a demonstration of its value, not of its inadequacy.
- **Selection-label discipline post-S-1: no change needed.** All three labels are accurate. §5's
  recommendation is a practice note, not a rule.
- **No new control rules.** Everything wrong in this window was caught by rules that already exist
  or by reading a file. Adding policy would not have prevented any of the five strikes.
- **Nothing proposed that edits `CLAUDE.md`.** Items of that class are in §14 as CEO items only.

**Refinements (3, all inside `scripts/validate-backlog.mjs`)**

- **R-1 — V3a absolute-position anchoring.** Dimensions and birth-iter at fixed indices; birth-iter
  must be non-numeric. Catches S-1's class.
- **R-2 — V1a struck-description-with-unstruck-ID.** Catches #62's class.
- **R-3 — Correct the two false numbers**: budget 62 → 58, and the V4 attribution comment.

**Practice notes (2, no enforcement)**

- **MR-031's reachability note, restated by claim shape rather than subject:** any assertion of the
  form *"X would have caught Y"* must be tested against the real Y. Two `git show` commands here.
- **A `top-score` label with exclusions is honest only if each exclusion cites a source other than
  the selecting loop and names its discharge event.** Loops 45 and 46 met both; write it down.

---

## 14. CEO decisions requested

New from this review, ordered by value.

1. **Criterion 3's threshold — reclaim the decision loop 47 took.** The corrected denominator is
   right and should stand; the loosened bar is the part that was not the coordinator's to set.
   Recommended: mark criterion 3 **not-yet-scoreable** until you set a threshold against the new
   denominator. This keeps the measurement fix and removes the self-benefit. (§4)
2. **#107 — approve restoring it to 9 with a `blocked — security review required` status**, rather
   than leaving it at 6. The privacy finding is real and verified; encoding it as a low score hides
   it. Separately, the row's cell structure needs repair regardless. (§6)
3. **Loop 48 = backlog-integrity sweep, not #93.** #93 is shipped. (§10, §11)
4. **Commission a full pool sweep below row 185.** MR-030 sampled part of it and measured ~13%
   phantom; I found three more in the head alone in one review. Until it is swept, `top-score` is
   not a meaningful selector. This is a multi-loop ask and needs your sequencing decision.

Carried from MR-031, still open and unchanged:

5. **#225 — the VPS reverse-proxy XFF hop count.** Still the highest-value single fact; code and
   deploy plumbing shipped and tested.
6. **#191 — Stripe card-trial stacking (a/b/c).** Live chargeback exposure, blocked since loop 7.
7. **MR-030's 18 PARTIAL re-scopes** — approve as a block or defer. Now two meta-reviews old. Two of
   the three flagged score revisions (#8, #107) were taken at loop 47; the block is not.
8. **#190, #193 (both edit `CLAUDE.md`), #212 P-5.** Three or more meta-reviews each. A "no" closes
   them and shortens the list.
9. **ECC `hooks/` + `.mcp.json` — decide or delete.**
10. **Field capture Phase 1** (`FIELD_CAPTURE_REVIEW_001.md` §8) — now additionally a prerequisite
    for #107.
11. **Chrome Web Store:** the Dashboard listing and one real Chrome recording. Both human actions.
12. **2 commits unpushed** (not 13 — §9, §12). Pushing is yours.
