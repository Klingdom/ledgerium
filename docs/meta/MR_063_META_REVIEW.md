# MR-063 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 150-152, 2026-10-02 18:45 → 20:16 (−0600). Commits `7dc7f18` (loop 150, #337), `a14c5e8` (loop 151,
#339), `b956c68` (loop 152, #325). Rows closed: #337, #339, #325. Rows filed by loops: none (#338 extended at 151).
**Why now:** base cadence, 3 of 3 since MR-062 (`ITERATION_LOG.md:13`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Everything below that needs a row, a strike
or a fix is a recommendation. Scratch files (guard-runner probe files, a vitest probe of the decision engine, a copy of
the engine with the pre-151 sources restored, a validator fixture harness, two tampered copies of the live log, the CI
job log) went only to `…/scratchpad/g` and `…/scratchpad/mr063`. `git status --short` before and after is identical
(`.claude/*` modified, `data/` untracked; both pre-existing).

**Where the checks ran.** Main checkout at `b956c68`, Windows, Git Bash, node v24.20.0, plus **node v20.20.2** (via
`npx node@20`) for the guard runner, because CI pins `node-version: '20'` (`deploy.yml:24`) and loop 150 tested only on
24. `origin/main` is now `a14c5e8`: loops 137-151 were pushed; only `b956c68` is local.

**Validation run for this review (executed, not inferred):**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6153 | **6153 passed, exit 0** | matches |
| `packages/decision-engine` vitest | 130 | **5 files, 130 passed** | matches |
| `node scripts/run-guard-tests.mjs --min-tests 49 --min-files 6` | 53 | **files=6 tests=53 real_pass=53, exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**, 334 rows, 214 struck, open **120**, 20 strict-checked lines | matches |
| Production CI, run `37088974348` (push of `a14c5e8`), job `quality-gate` | — | **success**. Node 20.20.2 linux: `[guard-tests] files=6 tests=49 real_pass=49 … (floors: tests>=49, files>=6)`; validator clean | **first live run of the new runner passes** |
| Loop 151 "20 of 35 new tests fail on revert" | 20 | pre-151 sources restored in a scratch copy, post-151 tests: **26 fail / 104 pass**; of these, **20 in `hardening339.test.ts`** (+6 in rewritten existing tests) | matches |
| Loop 152 "malformed-line test fails on revert, other 3 pass by design" | 1 of 4 | `VALIDATE_BACKLOG_SCRIPT=<8f15680 copy>`: **1 fail, 3 pass** | matches |
| Loop 152 tamper test on the real log | exit 1 | copy of live log, a line rewritten to `0 created; closed #316`: **exit 1, names the line** | matches |

**Not run:** Docker, any browser, the web-app suite (no web-app code changed in the window), Playwright, any HTTP
request. The CI run's `e2e-web-app` job was still in progress when this review was written, so the deploy outcome is
unknown.

---

## 1. Lead

**Every count reproduces, every revert proof reproduces, nothing reverts, and the guard runner works in production CI.**
The defects are in the claims:

1. **Loop 151, "approval capped to inferred", is false for an approval pair where one side opens a modal.** This is the
   exact case MR-062 §5 reported ("Approve (+ modal event) vs Reject → approval_decision **1.00**"). It is still 1.00,
   now with the condition *"A modal dialog opens on this path"* as the observed evidence (§3, probe B). The limits list
   in loop 151 and #338 (16) mention only the offered-options path. **Root cause is the recording, not only the loop:**
   MR-062 §5 found the stacking, but #339's five items never named it, so the loop fixed the row and stated the general
   claim.
2. **Loop 152, "every Follow-ups summary line from loop 133 on must parse canonically", is false in general.** A single
   newer heading that ends in `(loop 12)` switches the strict check off for the whole file. On a copy of the real log
   this gave "strict-checked **0** lines … clean" over a tampered line (§4). Near-miss spellings (`Follow-ups :`,
   `Follow-up:`, numbered list, blockquote) are not seen. Closure ids that do not exist pass.
3. **Loop 150 holds.** Every attempt to pass on nothing failed on node 24 and node 20. Two gaps remain. The floor (49)
   now lags the count (53), and the 4 unprotected tests are exactly the ones loop 152 added. A file with only a
   `describe` (zero tests) is caught by the aggregate floor, not as an empty file.
4. **Portfolio.** In the last 10 loops, 7 of the 10 closures were rows filed by meta-reviews, at a median age of 2
   loops. The loop is now mainly a pipeline from review to fix. That is good for quality, but the 120-row pool is flat
   and its oldest row is about 250 loops old (§6).

---

## 2. Loop 150 — #337 guard runner (`7dc7f18`): **HOLDS**

Probes (scratch files, run through the real runner; true exit codes):

| Probe | node 24 | node 20 | Caught as |
|---|---|---|---|
| file imports `node:test` and registers no test | exit 1 | exit 1 | "registers no tests" |
| file registers tests, then `process.exit(0)` before they run | exit 1 | exit 1 | "registers no tests" |
| `describe('x', () => {})` only | exit 1 *only via floor* | **exit 0 at `--min-tests 0`** | **not** flagged as empty |
| `it(..., { skip: true })` nested two suites deep | exit 1 | — | unexplained SKIP |
| runtime `t.skip()` | exit 1 | exit 1 | unexplained SKIP |
| `describe.skip` suite (summary `skipped=0`) | exit 1 | exit 1 | unexplained SKIP (by name) |
| `{ todo }`, failing test, below floors | exit 1 | — | (loop's own tests) |
| top-level test named `…file.js` | exit 1 | — | false "empty file" (fails safe) |
| parent with 5 `t.test` children | exit 0, counted **6** | — | parents count toward the floor |

- **Parsing** is sound on both node versions: TAP to a file, spec to the log, summary taken from `# pass` minus
  empty-file pseudo-tests, skips identified by name, and a "counted but not named" check.
- **CI wiring** is correct (`deploy.yml:53`) and ran green on the runner: 49/49 at floors 49/6.
- **Gaps (row N2):**
  - The floor is 49 while 53 run. Any 4 tests can be deleted silently, and the unprotected margin is precisely #325's
    4 validator tests.
  - Floors are hand-maintained ("raise it, never lower it") with nothing that fails when they lag.
  - Zero-test detection is aggregate, not per file.
  - Parents count as tests. This is consistent with how the floor was set, but worth one comment.
- **Commit claim:** "fails on … empty test files" is true for files that register nothing at top level, but not for a
  describe-only file. Minor.

---

## 3. Loop 151 — #339 decision engine (`a14c5e8`): **PARTIALLY — one false claim**

Probe harness: scratch vitest file importing `packages/decision-engine/src/*.ts` by absolute path; 4-run fixtures.

| # | Input | Result | Assessment |
|---|---|---|---|
| A | approve/reject pair, every run offered `["Approve","Reject"]` | approval_decision **1.00**, `isInferred:false`, observed `user_input` | disclosed (#338 item 16) |
| **B** | **approve/reject pair, approve runs open a modal (no `modalKind`)** | **approval_decision 1.00**, `isInferred:false`, observed "A modal dialog opens on this path" | **undisclosed; MR-062 §5 finding still live** |
| A2 | `"Approve for Jane Doe"` / `"Reject for Jane Doe"` | 0.54 inferred; name quoted in `label` and the `approval_status` description | known (#338 item 10: names in labels) |
| H | non-approval: `uiState "Account Of Jane Doe"` | `system_state` **1.00**, name quoted | disclosed (#338 item 14) |
| D | `runId: "jane.doe@example.com"` | email appears verbatim in `runIds` / `evidence.runId` | **undisclosed** — ids are echoed raw |
| G | email in `routeTemplate` | masked in `prefixKeys` / `outcomeKey` | holds |
| L/M | `modalKind: "Error"` (casing), or mixed error/confirm | generic "dialog", 0.54 | holds (fails safe) |
| N | `"Send to a@x.com"` vs `"Send to b@y.com"` | outcomes merge, no decision | privacy over recall; acceptable |

Text patterns (`sanitizeText`):
- **Masked:** `NL91 ABNA 0417 1643 00`, `FR14 … 3M02 606`, `07700 900123`, `+44 7700 900123`, `jane@example`,
  `/users/jane@x.com/edit`.
- **Not masked:**
  - `555-1234` and `5551234`: 7-digit local numbers; the digit rule needs ≥ 9 characters.
  - `ＪＡＮＥ＠ＥＸＡＭＰＬＥ．ＣＯＭ`: full-width; NFC does not fold it.
  - `gb82 west [number]` and `nl91abna[number]`: the lowercase IBAN prefix survives (disclosed as #338 item 15).
- **Over-masked:** `Invoice 2026-10-02` → `Invoice [number]`. Dates read as numbers, so outcomes that differ only by
  date merge.

Label patterns:
- Correctly neither approval nor rejection: "Accept all cookies", "Approve cookies", "Accept cookie policy",
  "Sign off", "Log off".
- **Read as approval:** "Accept & continue" and "Accept and continue", the usual onboarding/consent button. It is capped
  at 0.54 unless it is paired with signal 3 or 7.
- "Accept terms and approve" now matches neither, a small recall loss.

Claim-by-claim:

| Claim (commit / log) | Verdict | Evidence |
|---|---|---|
| "mask every text-carrying output field" | **holds for label, outcomeKey, nodeLabel, prefixKeys, descriptions, questions, offered options**; `runId`/`stepId`/`eventIds` are echoed raw (probe D). They are identifiers, but the input contract never says they must be opaque | `detectDecisions.ts:126` `runIds: d.runIds`; `conditions.ts:41` `refOf` |
| "decisionId unchanged and order-stable" | **holds as a formula** (same hash, same `dec1` prefix, order-stable, tested). Ids *do* change for any input the new patterns now mask (e.g. `ops@localhost`), and `DECISION_ID_VERSION` was not bumped. Harmless today because nothing persists ids | `detectDecisions.ts:35,157` |
| "approval … capped to inferred" | **false** for probe B (undisclosed) and probe A (disclosed). The code adds `excludeStateText`, but never caps an approval decision; it relies on all conditions being inferred, and signals 3 and 7 add observed ones | `detectDecisions.ts:146-149`; `conditions.ts:113-133` |
| "no state text quoted" | **holds** for approval pairs (uiState/actorRole loop skipped) | `conditions.ts:69` |
| "validation_result requires retry+pass" | **holds** | `question-inference.ts:58` |
| "signal 7 says 'dialog' and is inferred unless modalKind is error" | **holds** for `exception_handling`. Its conditions are still marked `observed` under a capped decision, which is consistent with "a modal opened" being observed | probes L/M |
| "cookie/consent/sign-off excluded" | **holds** | §3 patterns |
| P01 contract (`isInferred` ⇔ confidence < 0.55) | **holds** by construction: `isInferred` is computed from `confidenceScore` and nothing else | `detectDecisions.ts:166` |
| "20 fail on revert" | **holds** (reproduced) | validation table |

**Test-change audit.** The rewritten existing tests asserted the forbidden behaviour, and the rewrites are legitimate.
One loss: the only end-to-end golden for the named confidence terms (`0.30+0.30+0.15+0.10+0.10 = 0.95`, full
`confidenceTerms` equality) was repurposed into the approval-cap test, and no non-approval replacement was added.
`computeConfidence` keeps unit tests, but no test now pins the five terms on an observed decision end to end. This is
folded into row N1.

**Engine size and wiring.** 958 → **1012** production lines (MR-062 method) with zero consumers (`git grep
decision-engine -- apps`: none) and zero input producers. #340 (architect review plus first producer) is open and
waiting on CEO direction (#19 below).

---

## 4. Loop 152 — #325 strict Follow-ups check (`b956c68`): **PARTIALLY — the general claim is false**

Fixture harness through the script's `VALIDATE_*` env seams (`PASS` = validator exit 0):

| Input line (under a `(loop 200)` heading unless stated) | Result | Should be |
|---|---|---|
| `**Follow-ups**: 0 created; closed #9002`, `**FOLLOW-UPS:** …` | FAIL | FAIL ✓ |
| `-   **Follow-ups:**   0  created ,  1  closed  (#9002).` | PASS | PASS ✓ |
| `… 1 created, 1 closed (#9002` (unclosed paren) | FAIL (old V4 rule) | FAIL ✓ |
| `… 1 closed (#9001)` where #9001 is open | FAIL (V4 mismatch) | FAIL ✓ |
| malformed line under an MR heading above loop 133 | FAIL | FAIL ✓ |
| `### note (loop 9)` sub-heading | ignored (`##\s` needs a space) | ✓ |
| **`**Follow-ups :** 0 created; closed #9002`** | **PASS** | FAIL |
| **`**Follow-up:** …`, `**Followups:** …`** | **PASS** | FAIL |
| **`1. **Follow-ups:** …`, `> - **Follow-ups:** …`** | **PASS** | FAIL |
| **`… 0 created, 1 closed (#7777)`, no such row** | **PASS** | FAIL |
| **`… 0 created, 3 closed (#9002)`** (count ≠ ids) | **PASS** | FAIL |
| **`… 0 created, 0 closed. Also closed #9001 quietly.`** | **PASS** | FAIL (trailing text unchecked) |
| **`… ~~0 created, 1 closed (#9002)~~ none filed; shut #9001`** | **PASS** | FAIL (strike-through exemption) |
| **newest heading `… (loop 12)` above everything** | **PASS, "strict-checked 0 lines"** | FAIL |

**Anchor logic.**
- **How it works:** `LOOP_HEADING` is `^##\s+.*\(loop\s+(\d+)\)`. The greedy `.*` takes the *last* `(loop N)` in a
  heading, and the scope is a one-way latch: the first heading below 133 turns it off for the rest of the file.
- **Headings without a loop number** (MR records, "CEO decisions recorded") are handled correctly. They inherit the
  current scope, so MR entries above loop 133 are checked and those below are not.
- **Two failure modes:**
  - **(a)** One misplaced or cross-referencing heading disables the check silently. Executed on the real log: heading 7
    changed to `(loop 152) re (loop 12)` plus a tampered line gave **"strict-checked 0 … clean", exit 0**.
  - **(b)** Nothing asserts that the number of scanned lines matches the number of counted loops. Today it is 20 lines
    for 20 loops (133-152), which is correct but unasserted.
- **The log's stated limit is understated.** It says only "a summary line without a colon is not detected".

**Commit/log claims:**
- "Live log passes; tamper test exits 1": **holds**.
- "4 tests (49 → 53)": **holds**.
- "every Follow-ups summary line from loop 133 on must parse canonically": **false** as written (the table above).
- Revert proof: **holds** (1 of 4 by design).

---

## 5. Governance

**Selection.**
- **150:** `burn-down` #337 (12). Pool 120 > 8; the area rule forbade a third path-e loop. Correct.
- **151:** `burn-down` #339 (15), the highest open row. The last 5 areas (146 web-app, 147 security, 148-149 path-e,
  150 ci) gave path-e 2 of 5, so no penalty. Correct.
- **152:** `burn-down` #325 (12). At 152, path-e was 3 of the last 5 (148, 149, 151), so #340's −2 is correctly
  applied (12 → 10). Correct.
- All three were follow-up picks. No driver errors.

**Cool-off.** Consumed at 149 and recharged by 150-152 (three consecutive post-consumption burn-downs), so it is
**3/3 re-armed** per MR-006 Change A. Correct.

**Area saturation.** No rule trips. But 150 (`test-infra / ci`), 152 (`tooling / governance`) and a 153 tooling pick
would make 3 of 4 loops self-referential governance tooling under different Area labels. This is an observation, not a
rule change; one control variable at a time. MR-064 should check it.

**D-4 at 151.**
- **Clause 2:** +74/−27 production lines, net about +47, and a narrowing of an existing contract (one optional
  `modalKind` field, one optional parameter), not a new ≥200-line surface. It does not fire per loop. The cumulative
  question (958 → 1012 since the loop-142 review) is already #340.
- **Clause 1:** loop 151 changed or added at least 4 strings: the dialog question, the non-error/error question split,
  the masked option list and the approval description. These are engine templates with no UI consumer; the rule's
  trigger is *user-visible* strings. **Not required.** #338 item (6) already makes a `growth-strategist` review a
  precondition "before any UI shows them". Recommend the recording state that item (6) **blocks** any wiring row
  (#340 part 2, #126), so it cannot be deferred again.
- **Agent:** `security-reviewer` for PII and regex work was a correct rubric choice.

**D-1 (extension).** The loops log "Extension: `871e29a`, 109 loops untouched" in place of the
`reverse-portfolio-drift: user-ack; rationale:` line `CLAUDE.md` requires. The last such ack in the log is at
`ITERATION_LOG.md:2449`. The underlying fact (every extension row is CEO-blocked) is unchanged, and the ack requirement
is now decorative. This is a CEO/coordinator decision (new item 21), not a defect row: either formally suspend D-1
while every extension row is CEO-blocked, or resume the ack line.

**Follow-up ratio, trailing 10 loops (143-152).**
- **Closed 10** (one per loop).
- **Created 7:** loop 148 filed #338. The MR-061 recording filed #335-#337 and the MR-062 recording filed #339-#341,
  all inside the window.
- **Ratio 1.43** (≥ 0.5); loop-only ratio 10/1.
- Open pool: 120 (MR-062, before its filings) → **120** (rows 331 → 334, struck 211 → 214). Flat.

**Where the closures come from.**
- **Window closures:** #330 (loop 142), #332/#333/#334 (MR-060), #335/#337 (MR-061), #331 (loop 142), #122 (audit,
  cool-off), #339 (MR-062), #325 (MR-058).
- **7 of 10 were filed by meta-reviews.** The validator reports a median age at close of 2 loops.
- **Meanwhile:**
  - The oldest open non-blocked row (#13) is about 250 loops old.
  - Several rows are tagged "STALE", "PARTIALLY STALE" or "POSSIBLE OVERLAP" and still score 13-14 (#94, #168, #177).
  - Eight rows have unreadable score cells (MR-034).
- Clause 2 of the debt policy (keep/downgrade/delete at age > 10) is not being applied at pool scale.
- **Recommendation:** MR-064 triages the 20 oldest open rows (keep/downgrade/delete), in place of a new rule.

**Commit-message accuracy.**

| Commit | Title / body claim | Verdict |
|---|---|---|
| `7dc7f18` | fails on failure, < 49 tests, < 6 files, unlisted skip/todo, empty files | holds (describe-only file is caught only by the floor) |
| `a14c5e8` | mask every text-carrying field; decisionId unchanged; approval capped to inferred; … | **"approval capped to inferred" false** (probe B); id fields unmasked; "decisionId unchanged" true as formula only |
| `b956c68` | every Follow-ups line from loop 133 on must parse canonically | **false as a general statement** (§4); proofs true |

**Pattern, fourth consecutive review.** A Path E closure claim fails adversarial review (MR-060, MR-061, MR-062, now
MR-063). This time the gap came from the recording: an MR finding (§5 evidence stacking) was not transcribed into the
row. **Practice change (no rule):** every meta-review ends with a *finding → row item* map (§7 below), and the closing
loop cites each mapped fixture as a test.

---

## 6. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R.

| Id | Title and scope | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **An approval decision still reaches 1.00 through an unrelated observed signal.** Probe B (approve side opens a modal, no `modalKind`) gives `approval_decision` 1.00, `isInferred:false`. The same happens with consistent offered options (#338 item 16; absorb it). Make the approval cap explicit in `detectDecisions.ts` (`decisionType === 'approval_decision'` ⇒ inferred), or drop non-approval observed conditions from approval branches. Fixtures: MR-062 §5 "Approve (+ modal)" and MR-063 probes A and B. Also restore an end-to-end named-terms golden (0.95, full `confidenceTerms`) on a non-approval observed fixture, which loop 151 removed. | path-e / decision-detection | `security-reviewer` or `backend-engineer` | 3 | 5 | 2 | 5 | 1 | 1 | **13** |
| **N2** | **The guard-test floor lags the count, and a zero-test file is caught only in aggregate.** (1) Raise `--min-tests` to 53. (2) Add a guard test that fails when `deploy.yml`'s `--min-tests`/`--min-files` differ from the executed counts, so the floor cannot lag again. (3) Fail any file that executes zero tests (describe-only), e.g. run or parse per file. (4) Document that parent tests count. | test-infra / ci | `devops-engineer` | 3 | 4 | 2 | 5 | 1 | 1 | **12** |
| **N3** | **The strict Follow-ups check can be switched off by one heading and misses near-miss lines.** (1) Scope each section by its own heading's loop number (first `(loop N)`, not last), with no one-way latch. (2) Assert one summary line per counted loop ≥ 133 (scanned = loops). (3) Treat `/^\W*(?:\d+\.\s*)?\**\s*follow[- ]?ups?\s*\**\s*:/i` (any marker, singular, space before colon, blockquote) as a summary line. (4) Ids in a closed list must exist as struck rows, and `N closed` must equal the number of ids unless an id is annotated (e.g. "blocked"). (5) Anchor the grammar to the end of the clause and remove the strike-through exemption, or require that it leave a canonical line behind. Tests for each §4 bold row. | tooling / governance | `qa-engineer` | 3 | 4 | 3 | 5 | 2 | 1 | **12** |
| N4 | **Decision output echoes `runId`/`stepId`/`eventIds` verbatim.** An email-shaped `runId` reaches `runIds` and `evidence` (probe D). These are identifiers needed for traceability, so do not mask them. State in `types.ts` that they must be opaque, and decide in the #340 architect review whether the boundary rejects non-opaque ids. **Recommend appending to #340**, not a new row. | path-e / decision-detection | `system-architect` | 2 | 4 | 2 | 4 | 1 | 1 | **10** |
| N5 | **Masking and pattern residue.** 7-digit local phones (`555-1234`, `5551234`); full-width email (NFC, not NFKC); dates over-masked as `[number]`, merging outcomes; "Accept & continue" / "Accept and continue" read as approval. **Recommend appending to #338** as items (18)-(21); prefer the upstream structural signal (#338 item 10) over more regexes. | path-e / decision-detection | `security-reviewer` | 2 | 4 | 2 | 4 | 1 | 1 | **10** |

**Annotations recommended:**
- **#339 closure note:** "[MR-063 correction: 'capped to inferred' is false when an approval branch also carries an
  observed signal-7 or signal-3 condition; see N1.]"
- **#325 closure note:** "[MR-063 correction: one heading ending '(loop N<133)' disables the check; near-miss
  spellings and nonexistent ids pass; see N3.]"

---

## 7. Finding → row map (new practice; see §5)

| Finding | Row |
|---|---|
| §1.1 / §3 probe B approval via modal; probe A approval via options; lost 0.95 golden | N1 (absorbs #338 item 16) |
| §2 floor lag, per-file zero tests, floor ratchet | N2 |
| §4 latch, near-miss lines, nonexistent ids, count mismatch, trailing text, strike exemption | N3 |
| §3 probe D raw ids | N4 → #340 |
| §3 7-digit phones, full-width email, date over-masking, "Accept & continue" | N5 → #338 |
| §5 D-4 clause 1 growth review must block wiring | annotation on #338 item (6), #340 |
| §5 D-1 ack replaced by informal counter | CEO item 21 |
| §5 stale pool not triaged | MR-064 agenda |

---

## 8. Loop 153 pick and the next two

Pool 120 > 8 ⇒ `burn-down`. **Cool-off is re-armed (3/3); do not spend it at 153.** Burn-down supply at ≥ 12 exists
(N1, N2, N3). The rows a cool-off would reach are Path E feature rows with no consumer (#137, #138) or rows tagged stale
or overlapping (#168, #94, #177), so MR-062 §6's advice stands. Keep it for a product-value row once #340 or #341 is
unblocked.

Last 5 Areas at 153: 148 path-e, 149 path-e, 150 ci, 151 path-e, 152 tooling. Path-e is 3/5, so −2 applies to path-e
rows at 153.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **153** | **N2** guard floor + per-file + ratchet | **12** | `burn-down` | `devops-engineer` (rotates off `qa-engineer`) | test-infra / ci | The 4 unprotected tests are #325's own; the gate is now live in production CI; E1 |
| 154 | **N1** approval cap against every co-signal + golden | **13** (path-e 2/5 at 154, so no penalty) | `burn-down` | `security-reviewer` | path-e | Corrects a false closure claim; small |
| 155 | **N3** strict-check scope and near-misses | **12** | `burn-down` | `qa-engineer` | tooling / governance | Restores the #325 claim |

Then MR-064 (base cadence after 155): agenda includes the 20-oldest-row triage and the governance-tooling share.
- **Product-facing alternative:** if the CEO prefers product over tooling at 153 or 155, take **#324** (11). It covers
  live public-site claims of a "shared workflow library" that does not exist, plus a Viewer-hint a11y defect.
  D-4 clause 1 makes `growth-strategist` mandatory.
- **#340 (12)** should wait for CEO item 19 (Path E direction); its part 2 (first producer) depends on it.
- **#341** is CEO-blocked.

---

## 9. CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | Push | **largely done**: `origin/main` = `a14c5e8` (loops 137-151); `b956c68` (loop 152) local | — |
| 2 | Watch the first CI build after push | **quality-gate passed** (run `37088974348`: guard tests 49/49 on node 20, validator clean); `e2e-web-app` and deploy were still running at review time | runner image |
| 3 | Enable retention | open; safe to follow; #341 caveat stands | Terms line |
| 4 | Enable alerts | **open, and visibly failing**: every scheduled "Alerts check" fails with "Secret CRON_SECRET is not configured … ALERTS_CHECK_URL is not configured" (fails loudly by design) | alerting |
| 5-18 | (unchanged from MR-062 §9: brand name, extension end screen, store listing, #318, #320, #316, #308, #191, #57, ops batch, #12, #271/#281/#216, contract claims, clause-9 option) | open | — |
| 19 | Path E direction: wiring row first, or more engine | open; engine 1012 lines, 0 consumers, 0 producers | #340, #126 |
| 20 | #341 dedicated retention secret or server-side arming | open (row blocked) | least privilege |
| 21 | **NEW: D-1.** Suspend it formally while all extension rows are CEO-blocked, or resume the `reverse-portfolio-drift: user-ack` line (109 loops) | open | honest control plane |

---

## 10. Verdict

All executed numbers reproduce at `b956c68`: root 6153, package 130, guard tests 53, validator clean (open 120). Both
revert proofs reproduce (26/130 and 1/4). The new guard runner ran green in production CI on node 20. Nothing reverts.

- **Loop 150 holds.** Its only gaps are a floor that already lags by exactly the next loop's tests and aggregate-only
  zero-test detection.
- **Loop 151 fixed everything #339 listed**, and the P01 contract holds. But "approval capped to inferred" is false
  for the modal-stacking case MR-062 found and the row never named.
- **Loop 152's proofs are true**, but its general claim is defeated by one heading and by near-miss spellings.

The loop is closing review findings within about 2 loops. The next lever is triage of the dormant pool, not more rules.

### Appendix — reproducing

```sh
node scripts/run-guard-tests.mjs --min-tests 49 --min-files 6          # files=6 tests=53 real_pass=53, exit 0
printf "import { describe } from 'node:test';\ndescribe('s', () => {});\n" > $T/d.test.mjs
npx -y node@20 scripts/run-guard-tests.mjs --min-tests 0 $T/d.test.mjs  # exit 0: zero-test file not flagged
grep -n "isInferred:\|allInferred" packages/decision-engine/src/detectDecisions.ts   # no approval-specific cap
grep -n "excludeStateText ? \[\] : attrs" packages/decision-engine/src/conditions.ts # signals 3 and 7 still apply
grep -n "LOOP_HEADING =\|if (h && Number" scripts/validate-backlog.mjs               # greedy match, one-way latch
sed '7s/(loop 152)/(loop 152) re (loop 12)/' ITERATION_LOG.md > $T/l.md
sed -i '31s/.*/- **Follow-ups:** 0 created; closed #316/' $T/l.md
VALIDATE_ITERATION_LOG_FILE=$T/l.md node scripts/validate-backlog.mjs  # "strict-checked 0 …", clean, exit 0
gh api repos/klingdom/ledgerium/actions/jobs/111105028303/logs | grep "guard-tests\]"  # 49/49 on node 20.20.2
```
