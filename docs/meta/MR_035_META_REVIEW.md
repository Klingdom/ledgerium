# MR-035 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 55, 56, 57, 58, 59.
**Cadence:** MR-034 closed at loop 54. This review was commissioned at loop 59 — **one loop overdue**
against the 3-loop floor. During the review, **loop 60 executed concurrently** (`6114512`,
2026-09-30T14:43Z), so at the moment of writing it is **two loops overdue**. Loop 60 is outside the
window and is treated as context, not as subject, except where it changes a counter or pre-empts an
endorsement.

**No product code changed. No `CLAUDE.md` edit is proposed anywhere in this document.**

---

## 1. Lead — what is wrong, in order of consequence

1. **Loop 59 left the top of the file it was correcting describing the behaviour it removed.**
   `global-setup.ts:3` still reads *"1. Creates a fresh test SQLite database"*. Not creating a fresh
   database **is the entire content of loop 59**. Twenty-two lines of new rationale were written three
   lines below it. This is MR-034's S-2 — *the correcting commit left the old rule in two comments* —
   recurring **one governance cycle later**, in the same shape. **S-1.**

2. **Loop 57 wrote a rule about vacuous tests and broke it three lines later.** `openSop`'s docstring
   says it waits for real content *"rather than a fixed sleep — a timeout that is too short silently
   turns this into a skeleton test that always passes."* Tests 2 and 3 then switch mode behind
   `if ((await x.count()) > 0)` with **no assertion that the mode changed**, followed by
   `waitForTimeout(400)`; test 4 loops over `getByRole('checkbox')` with **no assertion that any
   checkbox was found**, followed by `waitForTimeout(200)`. The buttons exist today, so nothing is
   vacuous *now* — but three of the four tests will silently degrade into duplicates of the first if
   the switcher is renamed or gated, and still report green. **S-2.**

3. **The D-1 counter no longer counts the thing it reports.** Last commit touching any tracked
   extension surface is `871e29a` (loop 42). Loops 43–60 inclusive is **18 iterations**. The log
   reports **14**. MR-034 §5(c) reported *"Ten loops"* at loop 54, when the figure was 12. The gap has
   been ~4 for at least six loops and I could find no written definition of the increment convention.
   Either the number is wrong or the convention is undocumented and therefore unauditable. **S-4**, and
   it changes the answer to Q5.

4. **The loop-59 fix holds under attack — but it removed a guard that was still covering a live case.**
   The stranded-server guard was useless against a *busy* server, which loop 58 proved. It was never
   useless against an *idle* one, and the idle reused server with a stale Prisma client is the
   remaining hazard (§5(d)). Loop 59 removed it on the stated ground that its rationale was the
   deletion; that is true of its comment and false of its coverage.

5. **Nothing in the backlog moved.** Open rows **101 → 99** across five loops, on a 99-row pool. The
   Follow-Up Debt ratio reads **3.00** on the window and **4.00** trailing-10 against a 0.5 floor. Both
   numbers are true and neither measures anything (§9).

**What is not wrong:** the loop-59 mechanism is correct, and I verified it by running it rather than
reading it (§5). The two counts I most expected to be inflated — loop 57's *"17/17"* and loop 59's
*"21/21"* — are **exactly right**, and I nearly manufactured a strike before checking (§13).

---

## 2. Strikes

**S-1 — SHIPPED. `global-setup.ts` header contradicts the change loop 59 made to the same file.**

```
 * 1. Creates a fresh test SQLite database      <- no longer true; this is what loop 59 removed
 * 2. Runs Prisma migrations                    <- runs `prisma db push`, not migrations
```

Lines 3–4, untouched by `8681aef` (its hunk starts at line 14). The file now carries a 22-line comment
explaining in detail why the database is *not* recreated, sitting under a summary saying it is. MR-034
struck exactly this at loop 54 and the loop-55 entry accepted it as *"the uncomfortable one."* Second
occurrence. The mechanical trace that would have caught it is still in the file: `TEST_DB_PATH` at
line 14 now has **no reader** — it existed only to be unlinked. **S-3 (minor):** that dead constant.
`tsconfig.base.json` sets `strict` but not `noUnusedLocals`, so the *"typecheck 0"* claim is true and
the constant survives.

**S-2 — SHIPPED. Three of four SOP a11y tests assert nothing about the state they are named for.**

`e2e/app/sop/sop-a11y.spec.ts:140`, `:152`, `:167`. Verified the buttons exist —
`SOPModeSwitcher.tsx:28` renders `<button>` per mode from `SOP_MODE_LABELS`, giving accessible names
`Execution SOP` / `Flow View` / `Analysis` — so the conditionals fire today and the tests are
**fragile, not vacuous**. That is the accurate reading and it is still a defect: the loop's claim that
the spec *"ratchets all three SOP modes … plus the criteria-checked state"* is stronger than the code
guarantees, and the guarantee degrades silently. One line each fixes it
(`await expect(...).toHaveAttribute('aria-pressed', 'true')` before the scan).

**S-4 — the D-1 figure in the iteration log understates the fact it reports.** Arithmetic in §1(3) and
§8. Hedged: if there is a convention that excludes correction, governance and non-acked loops, it is
not written down anywhere I could find, and loops 54, 55 and 57 omitted the ack entirely while loops
53, 56, 58, 59, 60 logged it — so the counter is tracking acks, not iterations, and the rule's own
words say iterations.

**Not struck:** loop 57's *"17/17"* and loop 59's *"21/21"*. `npx playwright test --list` on both specs
returns **"Total: 21 tests in 4 files"** — 15 in `v2-a11y` (12 top-level + 3 from the parameterised
`for (const band of …)` at `:517`), 4 in `sop-a11y`, plus 2 auth-setup dependencies. Both figures
reconcile exactly.

---

## 3. Q1 — loop 58 was discipline, and the narrative around it is the weak part

**Verdict: the no-code loop was the right call on the code. The loop-59 answer *was* available at loop
58 — loop 58 wrote it down verbatim — and loop 58 never argues the question it needed to argue.**

**It was not avoidance, and the strongest evidence is what loop 58 threw away.** It built a
TCP-connect replacement, proved it superior at the job the guard existed for, and then rejected it
because it false-positives against Playwright's own webServer and would block every legitimate local
run. Discarding your own working, proven code is the opposite of avoidance. The disproved rate-limit
hypothesis is the same quality: `auth-buckets.ts` short-circuits under `NODE_ENV === 'test'`, the
vitest proof failed, and the hypothesis died on evidence rather than on prose.

**But the answer was not missed — it was derived and deferred.** Loop 58's own entry, bullet 7, states
the loop-59 fix in full: *"stop deleting the file. Reset the data in place, preserving the inode."*
That is not a hint toward loop 59's change; it is loop 59's change.

**And the deferral is feasible to have reversed.** From the audit log, prompt-to-commit elapsed time:

| Loop | Prompt (UTC) | Commit (UTC) | Elapsed |
|---|---|---|---|
| 56 | 12:51:59 | 13:02:21 | ~10 min |
| 57 | 13:42:30 | 13:54:35 | ~12 min |
| **58** | **21:12:39** | **21:24:40** | **~12 min** |
| **59** | **03:05:15 (09-30)** | **03:15:44** | **~10.5 min** |

Loop 59 delivered the full fix, three consecutive back-to-back auth runs and a 21-test a11y pass in
**less wall-clock time than loop 58 spent producing the diagnosis.** Loop 59's own entry concedes the
point: *"ten minutes of implementation."*

**So the criticism that lands is rhetorical, not engineering.** Loop 58 frames the choice as *"recording
a correct diagnosis with a rejected fix is a better loop than shipping a confident wrong one — and I
would rather say that plainly than manufacture a code change to look productive."* That is a **false
binary**, and the third option is in the same entry seven bullets down: ship the correct fix. Loop 58
argues successfully that the *TCP fix* should not ship, and then lets that stand in for the claim that
*nothing* should ship. The two are not the same claim.

**Net:** one slot spent, wrong fix prevented, right fix specified. That is a defensible loop and not a
wasted one. What it is not is a loop where shipping nothing was *forced* — and the entry presents it
that way. Loop 59's *"That felt like a wasted loop at the time. It was not"* rebuts a charge nobody
made while leaving the real one untouched.

**Caveat, stated:** prompt-to-commit elapsed time is not effort. Loop 58 describes *"the most useful
hour of the loop"*; the audit log shows 12 minutes. I cannot reconcile those and do not treat the
discrepancy as a strike (§13).

---

## 4. Q2(a)(b) — the loop-59 clear, verified by execution

I ran the seed's own enumeration and PRAGMA sequence against a **copy** of `prisma/test.db` through
the same Prisma client (6.19.2) and the same datasource override. Results:

```
foreign_keys BEFORE:      [{"foreign_keys":1}]
foreign_keys AFTER  OFF:  [{"foreign_keys":0}]
tables matched by filter: 33
EXCLUDED tables:          []
rows before delete — users: 3  workflows: 10
after DELETE FROM "users" — workflows remaining: 10   (cascade did NOT fire => FK genuinely OFF)
```

**(a) Nothing survives the clear that can break a later `create()`.** The filter matched **33 tables —
exactly the 33 `model` declarations in `schema.prisma` — and excluded zero.** There is no
`_prisma_migrations` table in `test.db`, because the setup uses `db push`, not `migrate deploy`. There
is no `sqlite_sequence`, because **`schema.prisma` contains no `autoincrement()`** (grep: 0 hits), so
there is no high-water mark to survive. Views are excluded by `type='table'` and none exist.

One latent flaw, not a defect today: in SQL `LIKE`, `_` is a single-character wildcard, so
`NOT LIKE '_prisma%'` also excludes any table matching `?prisma*` and `NOT LIKE 'sqlite_%'` excludes
`sqlite?*`. No current table is affected. `LIKE '\_prisma%' ESCAPE '\'` would close it. One line, no
loop.

**(b) Disabling foreign keys is safe here — and, usefully, it is not load-bearing.** Three findings:

- **The PRAGMA takes effect.** This was the real doubt: `PRAGMA foreign_keys` is a documented **no-op
  inside a transaction**, and a pooled connection could route the pragma and the `DELETE`s separately.
  Neither happens — the read-back returns 0 and the parent delete demonstrably did not cascade. The
  loop is transaction-less, which is what makes this work.
- **It cannot leak.** `foreign_keys` is per-connection, not persisted to the file. The `BEFORE` read
  returned **1** on a fresh connection to the database loop 59 had already cleared with the PRAGMA
  off — so even a crash between the `DELETE` loop and the `finally` cannot leave the app server
  running with enforcement disabled. The `try/finally` is belt to that braces.
- **It is not required.** Every relation in the schema declares `onDelete: Cascade` or `SetNull`, and
  the one relation without an explicit action — `schema.prisma:203`, `upload Upload?` — is optional
  and so defaults to `SetNull`. With enforcement on, the delete loop would still succeed; it would
  merely cascade. The PRAGMA is insurance against a future `Restrict`, which is a reasonable thing to
  buy at this price.

**No `VACUUM`:** pages are freed but not returned, so `test.db` grows monotonically across runs. It is
696 KB. Noted, not a problem.

---

## 5. Q2(c)(d) — where the fix is still exposed

**(c) `db push` runs first, so the clear never runs against a stale schema — and that fixes the wrong
half.** Verified by reading the file: step 2 is `npx prisma db push --skip-generate
--accept-data-loss`, step 3 is the seed. The ordering is correct and the log's claim that *"prisma db
push already reconciled the schema in the same file"* holds.

The exposure inverts. Previously the file was **deleted first**, so `db push` always ran against a
fresh file with no readers. It now runs against a file a reused server may hold open. SQLite cannot
`ALTER` most column changes, so Prisma rebuilds the table — create, copy, drop, rename — under an
exclusive lock. Against an actively-querying server that surfaces as `SQLITE_BUSY`. That is a **loud**
failure and strictly better than the silent one loop 59 removed, but it is a new failure mode and it
appears neither in the file nor in the log.

**(d) Yes — one scenario remains, and it is the one the removed guard actually caught.**

`playwright.config.ts:104` sets `reuseExistingServer: !process.env.CI`. A reused local server loaded
`@prisma/client` at boot, and `db push --skip-generate` **deliberately does not regenerate it**. If
`schema.prisma` changed since that server started, the database is reconciled to the new shape while
the server keeps querying with the old client: a dropped or renamed column becomes a runtime SQL
error, an added model is invisible, an added column is silently unselected. The file is no longer
deleted, so this is not the old stranding bug — it is a schema-vs-client mismatch, and nothing now
detects it.

**The old guard covered this.** Loop 58 proved the `/api/health` probe could not detect a **busy**
server. It was never unable to detect an **idle** one — an idle reused server answers `/api/health`
inside 2 seconds, which is precisely the server whose client is stale. Loop 59 removed the guard on
the ground that *"its entire rationale was 'we are about to delete the database'"*. That is true of the
guard's **comment** and false of its **coverage**, and the difference was not noticed.

**Severity: low, and I am not proposing a loop.** `schema.prisma` last changed 2026-09-14 — 18 loops
ago — so the trigger is rare, and CI is unaffected because `reuseExistingServer` is false there. If
anyone wants the cheap version later: it is **not** a port check. Hash `schema.prisma` at seed time
into a stamp file and warn when it moves while a server is up. That distinguishes the case loop 58
proved undetectable (whose server is this?) from the case that actually matters (did the schema move
under a running one?).

**Verdict on Q2 overall: the fix holds.** It removes a real failure class rather than guarding it, the
mechanism is correct under direct execution, and the two hazards it eliminated — the deleted inode and
the `-wal`/`-shm` removal under a live connection — were both genuine. The residuals are one loud new
failure mode and one quiet removed guard, neither of which invalidates it.

---

## 6. Q3 — file-then-immediately-work: ruling

**Plainly: yes. Rows the coordinator files get worked at lag 1. Rows filed by audits and reviews wait
months.** The data, from the `Birth iter` column:

| Row | Filed | Worked | Lag |
|---|---|---|---|
| #227 | loop 51 | loop 52 | **1 loop** |
| #228 | loop 57 | loops 58 **and** 59 | **1 loop** |
| #225 | loop 42 | loop 53 (support only; still open) | 11 loops |
| #101 | `audit-intake-WDC-002` | loop 50 | months |
| #171 | `audit-intake-ADM-002` | loop 45 | months |
| #92 | `audit-intake` (PIB) | loop 56 | months |
| #109 | `audit-intake-SOPPM-001` | loop 57 | months |

**The mechanism is not "filing", it is `directed`.** Both #227 and #228 were selected as `directed`,
not `top-score`. #228 scores **9** while **15 open rows score 13 or higher**. Self-filing plus
`directed` makes the score irrelevant to the pick — and the score is the only thing the 99 audit-filed
rows have to compete with.

**The honest counterweight, which matters:** #225 is also coordinator-filed (loop 42) and has waited
11 loops and is still open. So the discriminator is not *who filed it*. It is **"is it blocked, and
did I have the reproduction in hand."** Both fast rows were live defects reproduced minutes earlier;
#225 is blocked on a CEO fact. That is a defensible basis for prioritisation and I am not calling
either pick wrong — both were.

**But MR-034's warning has now converted.** Every coordinator-filed, unblocked row in this era has been
worked within one loop, at a 100% rate, while the pool moved by two rows in five loops. The structural
consequence is the one to name: **for audit rows the backlog is a record of intent; for coordinator
rows it is a receipt.** A receipt written before the work is not evidence of prioritisation, and the
iteration log currently reads as though it were — loop 58's entry cites its own filing of #228 as
context for selecting #228.

**No rule proposed.** The practice that costs nothing: when a row is filed and selected inside two
loops, state the highest-scoring open row it displaced and why. Loop 60 did exactly this unprompted —
*"#108 (16) is blocked on cross-run aggregation, #168 carries an unresolved overlap flag, and the 14s
are multi-iteration roadmap rows"* — and that one sentence is the whole answer. It was absent from
loops 52, 58 and 59.

---

## 7. Q4 — edit mechanics across 55-59: the trend held, and the escaping defects changed class

**Mechanics-origin defects in the window: 2. Escaped the loop: 0.**

| # | Loop | Defect | Escaped? |
|---|---|---|---|
| 1 | 56 | negative regex `/error/`-style assertion matched the **event name** `ui_error_boundary_triggered`; replaced with a positive assertion on the exact call | no — self-caught, self-reported |
| 2 | 59 | `PYTHONIOENCODING=utf-8 python - <<'PYEOF'` heredoc editing **`IMPROVEMENT_BACKLOG.md`** failed to parse | no — loud, 4 seconds |

Against MR-034's baseline (loops 45-48: 4 defects, 3 escaped; loops 49-54: 4 defects, 0 escaped), this
is **4 in 6 loops → 2 in 5 loops, escape rate still 0. The trend held.**

Defect 1 is MR-034 §4.2's named root exactly — *a textual heuristic used as a structural test* — and
it was caught by the practice MR-034 recommended, inside the loop, and written up.

**The heredoc failure is verified, and the timing is the interesting part.** From the audit log:

```
03:14:39Z  pre_bash   PYTHONIOENCODING=utf-8 python - <<'PYEOF' ... P='IMPROVEMENT_BACKLOG.md'
03:14:43Z  tool_failure
03:15:18Z  file_change  ...\scratchpad\loop59_close.py
03:15:24Z  pre_bash   python "...\loop59_close.py"      <- succeeded
```

**So is the trend masked by the switch to Write-tool scripts? Partly — and the answer is more useful
than a yes or no.** The switch is **reactive, not standing**. On 2026-09-29 there were **14 heredoc
`pre_bash` invocations**, and the pattern throughout is `python - <<'PYEOF'` doing in-place string
surgery on product source: `analytics.ts`, `WorkflowList.tsx`, `DashboardV2Shell.tsx`,
`ErrorBoundary.tsx`. The scratchpad scripts appear **only after a heredoc fails** — `loop58_fix.py` at
21:18:53Z, `loop59_close.py` at 03:15:18Z. The generation opportunity is unchanged. What improved is
that the residual failures are **parse** failures, which are the loudest possible outcome, and the
file being edited when it failed was the one whose positional editing produced the shipped `#107`
corruption at loop 47.

**The finding that supersedes the question: the defects that escaped this window are not mechanics
defects at all.** S-1 (stale header) and S-2 (unasserted state transitions) are **claim and
verification** defects — the coordinator described what it had done more strongly than the file
supports, twice, in two different loops. MR-034's headline was *"edit mechanics are the weak link."*
Five loops later that is no longer true. The weak link is **the gap between the narration and the
artefact**, and both escapes in this window sit in it.

---

## 8. Q5 — D-1 has stopped being information. Surfaced for the CEO; no rule edit proposed.

**The arithmetic first, because it changes MR-034's answer.**

- Last commit touching `apps/extension-app`, `packages/segmentation-engine`,
  `packages/normalization-engine` or `packages/policy-engine`: **`871e29a`, 2026-09-24, loop 42**
  (`git log -1 -- <the four paths>`).
- Iterations since: loops 43–60 = **18** (`ITERATION_LOG.md` has one header per loop; all 18 present).
- Figure reported in the log at loop 60: **14**. At loop 59: 13.
- MR-034 §5(c) at loop 54: *"Ten loops."* Actual at loop 54: **12**.
- Loops 54, 55 and 57 logged **no ack at all**; 53, 56, 58, 59, 60 did. The counter increments per
  **ack**, not per iteration. The rule's text says *"5+ consecutive **iterations**."*

**MR-034's defence was that the rule "reports a true fact" and so is not ritual. That defence held on
the facts available then and does not hold now.** A counter earns the name *information* if it changes
a decision. This one:

- **cannot be cleared by any action available to the coordinator** — #216 is the only extension row
  and it is `blocked — CEO decision: shadow-DOM capture semantics`, re-verified in the file this
  review;
- **does not count accurately** — 14 against 18, a gap of ~4 sustained over at least six loops;
- **is not logged consistently** — three of the last eight loops omitted it entirely; and
- **has produced the same sentence** in eight consecutive entries.

The first bullet alone is compatible with MR-034's reading. All four together are not. A number that
nobody can move, that is computed by an undocumented convention, and that disagrees with the fact it
names, is no longer reporting the fact — it is performing the report.

**What is actually worth knowing has not changed and is better stated as a date than a counter:** a
shipping Chrome extension, under a hard CLAUDE.md reliability invariant that records two prior
capture-pipeline regressions, has had **no source change since 2026-09-24** and is **green in CI but
unexercised by use**. That is one sentence with a date in it, and it belongs in `SYSTEM_HEALTH.md` as
a standing fact.

**CEO recommendation (§12, R-1).** Decide #216, or declare the extension frozen for this phase and
record the decision. Either ends the question. What should not continue is asking the coordinator to
acknowledge, once per loop, a number it cannot move and is not computing correctly — that is the
ritual MR-034 was right to test for and that the evidence now supports.

---

## 9. Q6 — Follow-Up Debt ratio, arithmetic shown

From `git show <commit> -- IMPROVEMENT_BACKLOG.md` per loop, MR-034's method, not from log prose.

| Loop | Commit | Struck | Created |
|---|---|---|---|
| 55 | `405dd82` | 0 (12 rows re-scoped / annotated) | 0 |
| 56 | `01aef52` | **#92** (1) | 0 |
| 57 | `bebd940` | **#109** (1) | **#228** (1) |
| 58 | `30c85d9` | 0 (#228 updated in place) | 0 |
| 59 | `8681aef` | **#228** (1) | 0 |

```
Window (55-59):   3 closed / 1 created  =  3.00        (floor 0.5)
```

**Trailing 10 (loops 50-59), which is the window the policy specifies:**

```
created:  50:0 51:1 52:0 53:0 54:0 55:0 56:0 57:1 58:0 59:0  =  2
closed:   50:1 51:3 52:1 53:0 54:0 55:0 56:1 57:1 58:0 59:1  =  8
ratio  =  8 / 2  =  4.00                                      (floor 0.5)
```

**The honest split, and it has improved on MR-034 while meaning no more than it did.** Of the 8
trailing closures, **3 are bookkeeping strikes** (#23, #32, #112 at loop 51) and **5 are work** (#101,
#227, #92, #109, #228) — **62% work, against MR-034's 36%.** Then the two deductions:

- **#227 and #228 were both filed inside the window by the coordinator.** Counting only work that
  originated outside the window: `3 closed (#101, #92, #109) / 0 created` — the same degenerate case
  MR-034 hit.
- **#109 closed *not as written*.** Loop 57 verified that **both** of its asserted "HARD WCAG 2.1 AA
  violations" were absent — I re-verified both independently (`AskThisProcessPanel` declares exactly
  one role, `role="alert"` at `:342`; the four `role="listitem"` occurrences are all `<div>`s in
  `ColumnPicker.tsx`). Real work shipped, but the row's premise evaporated and the row was closed
  anyway, so the numerator overstates by one row's worth of premise.

**The number that is not in the policy and should be read instead.** Parsing with the validator's own
column indices: **open rows 101 at loop 55 (`405dd82`) → 99 now.** Net **−2 across five loops** on a
99-row pool. Loop 60 closed none. At that rate the pool clears in roughly 250 loops.

**Verdict: unchanged from MR-033 and MR-034, now on a third consecutive sample. No rule change
proposed.** One addition worth recording: with **two creations in ten loops**, the denominator is small
enough that the ratio is noise — a single coordinator-filed row moves it by whole integers. A metric
whose value is dominated by whether the coordinator happened to file a row this fortnight is not
measuring throughput, and it reads healthiest at 4.00 while the pool moves 2%.

---

## 10. What the window got right, named because it is the reason the strikes are small

- **Loop 58 destroyed its own leading hypothesis with a proof rather than an argument.** The vitest
  proof of the rate-limit mechanism *failed*, and that is how the hypothesis died. Re-verified:
  `auth-buckets.ts` short-circuits under `NODE_ENV === 'test'`, which the Playwright webServer sets.
- **Loop 57 checked the row before building it, and the row was wrong twice.** Both independently
  re-verified here. Building what the row said would have been churn on a false premise.
- **Loop 56's reporting decision is the best judgement in the window.** `componentDidCatch` emits the
  surface and the error's **constructor name**, never the message — because messages in this codebase
  interpolate workflow titles and field names captured from a user's screen, and a crash report is the
  obvious path by which recorded content reaches analytics. Verified: `.message` appears nowhere in
  `ErrorBoundary.tsx` outside a doc comment. The cost is stated in the entry rather than hidden.
- **Loop 56's boundary placement claim is exactly true.** `DashboardV2Shell` is a thin exported wrapper
  around `DashboardV2ShellInner` (`:1415`), so the boundary really does wrap from outside its own
  render; the row boundary really is inside the `map` at `WorkflowList.tsx:917` with a `<tr>` fallback.
  Both were verified against the file, and both are the non-obvious choice.
- **Loop 57 extracted `assertAxeCompliance` instead of copying it**, citing two duplications this
  codebase paid for in a fortnight. That extraction is what makes §11's endorsement cheap.

---

## 11. Control-rule status

| Rule | Status in 55-59 |
|---|---|
| Meta-review cadence (3 loops) | **FAILING** — MR-034 closed at 54; this is loop 60. Two loops over. Flagged correctly by loops 58 and 59 in their own entries. |
| D-1 reverse-portfolio drift | **REPORTING INACCURATELY** — §8. Not cleared, not clearable, under-counted by ~4. |
| Backlog validator | **Clean, at zero headroom** — `221 rows, 122 struck, 19/19 malformed-row budget used`. The budget is a ratchet (fails only on growth), so it is working; it has no slack, and the next stray `|` fails CI. Worth knowing, not worth a loop. |
| P-11 (verify the row before building) | **HOLDING, and earning its keep** — fired at 56 (re-verified `ErrorBoundary` absence), 57 (both claims false), 60 (three corrections). |
| Follow-Up Debt ratio ≥ 0.5 | **Passing at 3.00 / 4.00 and not measuring anything** — §9. |
| One-logical-outcome per loop | **Held.** No bundling in the window. |
| Selection driver logged | **Held**, but `directed` carried 2 of 5 loops and both were self-filed rows (§6). |

---

## 12. Loop 61 endorsement — loop 60 pre-empted the slot

**Loop 60 ran during this review and took #94 (13) by `top-score`, with its displaced alternatives
stated.** That is the pick I was converging on and the reasoning is sound. Its remaining half is now
explicitly coupled to the #189 decision by loop 60's own entry, and should not be taken until that is
settled. The endorsement below is therefore for **loop 61**.

### PRIMARY: **#105 — WDC2-P06 — score 11 — NOT decision-blocked. Write it yourself.**

**Premise verified now, per P-11.** `grep -c "Customize columns\|ColumnPicker\|PresetChip\|SavedView"
e2e/app/dashboard/v2-a11y.spec.ts` returns **0**. The row's claim holds: the `role="dialog"` /
`aria-modal="true"` drawer shipped at iter-061 and the preset rail and saved-view list shipped at
iter-062 have **never been axe-scanned**, and the row classes this HIGH.

**Why now rather than a higher score.** The 13s and 14s above it do not survive contact:

- **#108 (16)** — blocked. Its premise is false as written: `buildSOP` takes one session, `runCount`
  appears nowhere in `packages/process-engine/src`. No aggregation layer exists.
- **#168 / #138 / #137 / #122 (14)** — multi-iteration roadmap rows from dormant audit programmes, and
  #168 still carries MR-034's **unresolved** overlap flag against #113 / #125. Taking any of the three
  without resolving that risks two loops re-implementing the third.
- **#90, #150, #177 (13)** — all flagged materially or partially stale by MR-034 and re-verified as
  such by the coordinator at loop 55. None is a valid pick until re-scoped.
- **#94 (13)** — half shipped at loop 60; the remaining half is decision-coupled to #189.

**The cost fell at loop 57 and this is the first row that spends it.** `assertAxeCompliance` is now
importable from `e2e/helpers/axe.ts`, so the new coverage is four call sites, not a copied ratchet.

**Two corrections to fold in before building — minutes, not a loop:**
- The row says *"12 tests; 360→503 LOC post iter-046."* The file is now **558 lines** and runs **15**
  tests (12 top-level + 3 parameterised at `:517`). Re-count before trusting any other number in it.
- The row frames this as blocking *"AI Vision Build entry"*, a programme that is dormant. The a11y gap
  is worth closing on its own merits; do not carry that gate into the entry.

**Condition, and it is the reason this row is the right one:** fix S-2's pattern in the same loop.
Every state transition must assert that it happened — `await expect(drawer).toBeVisible()` before the
scan — never `if (count > 0)` followed by a fixed `waitForTimeout`. Otherwise loop 61 ships four more
tests that can pass by scanning the page they started on, in the same family as the four loop 57
shipped.

**Write it yourself.** Four spec call sites against an existing helper. Delegation costs more in brief
than in build.

### ALTERNATIVE: **#189 — score 6 — NOT decision-blocked, and its score is now wrong.**

`/api/account` is fetched twice per dashboard load. Loop 60 rejected the `AppShell` route to
completing #94 **specifically because** adding a third fetch is the wrong direction — so a score-13
row's remaining half is gated on a score-6 row. That is a re-score justified by a dependency, not a
rule change. Small, self-contained, and it unblocks the larger item.

If #189 is taken: it is a real decision about where the plan lives (NextAuth session vs a shell
fetch), with a genuine trade-off between an extra login-path cost and staleness after an upgrade.
**Consult `system-architect` first, then write it.** That is the one place in the current pool where
delegation buys something.

---

## 13. What I could not verify

1. **Loop 59's validation runs.** *"Three consecutive back-to-back runs, 2/2 each, zero flaky"*,
   *"21/21"*, *"workspace 4975"*. I did not re-run Playwright — it needs a live Next server, takes
   minutes, and re-running would mutate `test.db` mid-review. I verified the **mechanism** by direct
   execution (§4) and the **test counts** by `--list` (§2), not the runs.
2. **Whether the PRAGMA behaves identically inside Playwright's `globalSetup` process.** Same Prisma
   version, same datasource override, same transaction-less shape — but my probe was a separate
   process and I did not prove it in situ.
3. **Loop 58's "an hour".** The audit log shows 12 minutes prompt-to-commit. Elapsed time is not
   effort and the log does not record model time. Not treated as a strike.
4. **The D-1 increment convention.** I searched `CLAUDE.md` and found only the rule text, which says
   *iterations*. If a convention exists that excludes governance and correction loops, it is not
   written down where I could find it — which is itself the finding in §8.
5. **Whether all four `role="listitem"` divs in `ColumnPicker.tsx` render inside a `role="list"`
   ancestor.** Two `role="list"` containers exist (`:553`, `:727`); I did not trace `:243`, `:284` and
   `:328` to their mount points. This is incidental to loop 57's claim, which was about the SOP row.
6. **CI behaviour of the new `global-setup.ts`.** Verified local semantics only. `reuseExistingServer`
   is false in CI, so §5(d)'s hazard is local-only by construction — but I did not observe a CI run.
7. **A near-miss worth recording.** I had S-1-class strikes drafted against loop 57's *"17/17"* and
   loop 59's *"21/21"* on the arithmetic 12 + 3 ≠ 17. `--list` returned *"Total: 21 tests in 4 files"*
   — the auth-setup project dependencies are counted. Both figures are exact. The two-minute check
   that killed those strikes is the same check this review exists to demand.

---

## 14. Recommendations to the CEO — surfaced only, nothing applied, no `CLAUDE.md` edit

- **R-1 — Decide #216, or freeze the extension explicitly.** §8. Four CEO decisions are outstanding
  and this is the one that has been converted into a per-loop ritual. Either answer ends it; silence
  keeps a miscounted number in every entry.
- **R-2 — The D-1 figure should be recomputed from `git log` rather than carried forward.** It is
  14 against a true 18. This needs no rule change — it needs the number derived from the fact instead
  of incremented by hand. Stated as an observation because the fix belongs to whoever writes the
  entry, not to a control.
- **R-3 — Read the pool size, not the ratio.** 101 → 99 across five loops is the real signal; 3.00
  against a floor of 0.5 is not. Third consecutive review to say so.
- **R-4 — The `#105` endorsement carries a condition (§12) and it is the substantive one.** Four more
  axe tests written in loop 57's shape would double an existing defect rather than close a gap.

---

## 15. Verdict

**The window was competent engineering with a narration problem.**

Loop 56's boundary is the best-judged piece of work in five loops and every non-obvious claim in it
checks out. Loop 57 verified a row before building it and found both of its assertions false — that is
P-11 doing exactly what it exists for. Loop 58 disproved its own hypothesis with a failing test and
threw away a fix it had already proved, which is discipline whatever the entry says about it. Loop 59
removed a failure class instead of guarding it, and the mechanism holds when you run it rather than
read it.

**Both defects that escaped are the same defect.** The `global-setup.ts` header still describes the
behaviour loop 59 deleted; the SOP spec's docstring names the vacuity hazard that three of its four
tests then carry. In each case a careful, correct piece of work was written up more strongly than the
file supports, and the contradiction was left sitting three lines from the new text. MR-034 said edit
mechanics were the weak link. Five loops later, mechanics generated two defects and leaked none, while
narration leaked two — and one of them is MR-034's own S-2 recurring in the next cycle.

**Four strikes. No rule change proposed, and none is needed.** The control plane is not what failed
here. The thing that failed is re-reading the top of the file you just rewrote the bottom of.

---

*MR-035. Mode 4, governance only, NON-counting. No product code changed. No `CLAUDE.md` edit proposed.*
