# MR-062 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 147-149, 2026-10-02 18:14 → 18:31 (−0600). Commits `c908a09` (loop 147, #335), `6e7c09a` (loop 148,
#331 items 7/8/9/2/3), `8dd9866` (loop 149, #122). Rows closed: #335, #331, #122. Rows filed by loops: #338 (loop 148;
extended at 149). Rows filed by the MR-061 recording: #335, #336, #337.
**Why now:** base cadence, 3 of 3 since MR-061 (`ITERATION_LOG.md:13`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit. Everything below that needs a row, a strike or a
fix is a recommendation. Scratch files went to the session scratchpad only: a route-predicate replica, an esbuild bundle
of `packages/decision-engine/src/index.ts`, and two fixture harnesses.

**One self-inflicted incident, disclosed.** My first esbuild call passed a Git-Bash path inside `node -e`, so Windows
node wrote the bundle to a relative `c/Users/…/de.mjs` **inside the repo**. It was untracked, existed for under a
minute, was moved to the scratchpad and the empty directories removed with `rmdir`. It was created after the test run
had started; the root vitest glob (`packages/*/src`, `apps/*/src`) cannot reach `c/`. `git status --short` after cleanup
is byte-identical to the snapshot taken before any check ran.

**Where the checks ran.** Main checkout at `8dd9866`. Working tree differs from HEAD only in `.claude/*` and untracked
`data/`, which no check reads. Windows, pnpm 10, Git Bash, node v24.20.0. `main` is **17 commits ahead** of
`origin/main` (`git rev-list --count origin/main..main`).

**Validation run for this review. Every check below was executed at `8dd9866`; none is inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test`, **×2** | 6118 | **2 of 2: 294 files, 6118 passed, exit 0** | matches |
| `apps/web-app`: `pnpm exec vitest run`, **×2** | 4264 | **2 of 2: 235 files, 4264 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 331 rows, 211 struck, 13/13 baselined, **open 120**, "V4: parsed 128 closure claim(s)" | matches |
| `node --test scripts/*.test.mjs` | 39 | **tests 39, pass 39, fail 0, skipped 0, exit 0** | matches |
| `node scripts/check-dockerfile-workspace.mjs` | 0 | **exit 0**, "OK: agent-intelligence, intelligence-engine, process-engine, process-graph, schema-events" | matches — and see §5: `decision-engine` is absent because nothing in web-app imports it |
| `pnpm --filter @ledgerium/web-app build` | — | **exit 0**, "Compiled successfully", `[assert-dynamic-api-routes] OK` | passes |
| Loop 147 "7 web-app + 2 script tests fail on revert" | 9 | **not re-run** (no revert) | **unverified here** |
| Loop 148 "10 of 13 fail on revert"; SHA-256 = `node:crypto` on 24 vectors | — | **not re-run**; I did read `sha256.test.ts` exists and passes in the root run | **unverified here** |
| Loop 149 "9 new tests fail on revert" | 9 | **not re-run** | **unverified here** |

**Not run:** Docker, Linux, any GitHub runner, Playwright, any browser or screen reader, any HTTP request, the purge
against any database. No `curl`/`wget`. The route predicate in §3 is a verbatim copy of `route.ts:54-81` run under node's
WHATWG `URL`, not the Next.js handler; Next's `nextUrl.searchParams` is the same WHATWG class, but that equivalence is
asserted, not executed.

---

## 1. Lead

**Every count reproduces, nothing needs reverting, and the purge bypass MR-061 executed is closed.** But the two Path E
loops claimed more than they delivered:

1. **"No decision from a name" is false at confidence 1.00.** Two runs whose `uiState` is `"Account Of Jane Doe"` and two
   whose `uiState` is `"Account Of John Smith"` produce an `approval_decision` with **confidenceScore 1.00** and the
   condition text *When "Account Of Jane Doe" is shown…* (§4, executed). The Title-Case gap is documented
   (`text-safety.ts:13`, #338 item 10) — but documented as a *detection* limit, not as "the engine emits a fully
   confident decision whose only evidence is a person's name". Non-Latin names (`审批 张伟` / `审批 李娜`) do the same.
2. **"PII boundary across all text-carrying output fields" is narrower than it reads.** `outcomes[].label`,
   `outcomes[].outcomeKey`, `nodeLabel` and `prefixKeys` carry the *sanitized* label, not the *masked* one
   (`detectDecisions.ts:121,149,150`). Phone fragments under 9 characters (`555 0134`), IBAN prefixes (`GB82WEST1234`) and
   dotless emails (`ops@localhost`) survive verbatim into those fields. Only descriptions and questions are masked.
3. **Loop 149's log says "a lone validation-word label no longer qualifies". It still does.**
   `question-inference.ts:60-62`: `failLabelPair` = some label has a validation word AND some *other* label doesn't —
   which every ordinary branch satisfies. `"Correct address"` vs `"Ship order"` and `"Report error"` vs `"Continue"` both
   yield `validation_result` (§5, executed; capped at 0.54, so wrong but not confident).
4. **The decision engine has grown 606 → 958 production lines (+58%) since its only architect review (loop 142), in
   two sub-200-line steps, and has zero production consumers and zero input producers.** Signal 7 is not "the" dormant
   signal — the whole engine is dormant (§6).
5. **What is live.** Still `origin/main`; 17 commits (loops 137-149 and their MRs) are not in production.

---

## 2. Q1 — Re-run

See the table above. Six of six executed checks match their claims; three revert proofs are not re-run and are marked
so. Pool: open **119 → 120** (validator), rows 327 → 331, struck 208 → 211.

---

## 3. Q2 — Loop 147, adversarially

### 3.1 Can the route purge without the script arming?

Matrix run against a verbatim copy of `route.ts:54-81` (scratchpad `route_pred.mjs`):

| Query | Result | Note |
|---|---|---|
| `""` (bare POST) | DRY | default preserved |
| `?mode=purge&dryRun=0&dryRun=1` (MR-061 exploit) | 400 repeat | **closed** |
| `?mode=purge&dryRun=0&mode=purge`, `?mode=dryrun&mode=purge` | 400 repeat | closed |
| `?mode=purge&dryrun=1`, `?Mode=purge`, `?mode=purge&DryRun=1` | 400 unknown | keys are case-sensitive — fail-closed |
| `?mode=purge&dryRun`, `?mode=purge&dryRun=` | 400 dry | fail-closed |
| `?mode=+purge`, `?mode=purge+` (`+` → space) | 400 mode | fail-closed |
| `?mode=purge;dryRun=1` | 400 mode | `;` is not a separator; fail-closed |
| `?mode=purge%00`, `?mode%00=purge`, `?mode=purge&=1` | 400 | fail-closed |
| `?mode=purge&`, `?mode=purge&&` (trailing `&`) | REAL PURGE | empty pairs are dropped by WHATWG; still requires `mode=purge` |
| `?%6Dode=purge`, `?mode=purg%65`, `?mode=PURGE` | REAL PURGE | percent-decoding and lower-casing; still requires the word "purge" |
| `?mode=purge#x` | REAL PURGE | fragment never reaches a server |

**Every REAL row spells `mode=purge` in some form.** None purges without an explicit purge request. The script cannot
send any of them: it refuses `?` and `#` in `RETENTION_PURGE_URL` (`retention-purge.sh:32-36`) and builds exactly
`?mode=purge` or `?dryRun=1` (`:46,:49`). A `%3F`-encoded `?` lands in the path → 404/405 → exit 1. A trailing `/purge/`
→ Next's default 308 → `curl` without `-L` reports 308 → exit 1. Fail-safe in both cases (reasoned, not executed).

- **Body and headers:** the handler reads neither a body nor any header except `Authorization`
  (`route.ts:36-44`, via `verifyCronBearer`). No other channel exists.
- **Does the 400 break a legitimate caller?** `git grep "retention/purge"` outside tests and docs: the script and the
  route only. `alerts-check.yml` and `alerts-heartbeat.yml` POST to their own URLs. No health check POSTs. **No caller
  breaks.**

### 3.2 But "only the script decides" overclaims

Arming is a **GitHub repo variable**; the server has no arming state. Anyone holding `CRON_SECRET` purges with one
`POST …?mode=purge`. And `CRON_SECRET` is one secret shared by three workflows — `alerts-check.yml:87`,
`alerts-heartbeat.yml:61` and the retention job — plus the web container (`deploy.yml:208`). So the two *read-only*
alert jobs hold the capability to delete. That is defence in depth (MR-061's ask), not least privilege. It was true
before loop 147 and is not a regression. Recommended row (I4 A4 L2 C4 E2 R1 = **11**): either a server-side arming env
(`WORKFLOW_PURGE_ENABLED=true` in the container; absent ⇒ every request is dry) or a separate `RETENTION_SECRET`. The
server-side flag also makes the CEO's "disarm" a container change, not a GitHub setting.

**Retention enable steps are now safe to follow as written**, with the caveat above stated to the CEO.

---

## 4. Q3 — Loop 148: six adversarial inputs (executed)

Harness: four runs, shared first step `"Open request"`, branch at step 2; output JSON searched for the raw value.
Bundle: esbuild of `packages/decision-engine/src/index.ts` at `8dd9866`.

| # | Input | Decision | Raw value reaches |
|---|---|---|---|
| 1 | Name in label: `"Approve for Jane Doe"` vs `"Reject"` | 1 | `outcomes[].label`, `outcomeKey`, `condition.description` |
| 2 | Title-Case name in `uiState`: `"Account Of Jane Doe"` / `"Account Of John Smith"` | **approval_decision, 1.00** | `condition.description` — and is the *observed* evidence |
| 3 | Phone with spaces in label: `"Call 555 0134"` | unknown_inferred 0.54 | `outcomes[].label`, `outcomeKey` (description masked to `"Call # #"`) |
| 4 | IBAN-like: `"Pay GB82WEST1234"`, `"Pay DE89 3704 0044 0532 0130 00"` | 1 | `GB82WEST1234` in `label`/`outcomeKey`; the long DE IBAN became `[number]` |
| 5 | Non-Latin names in `uiState`: `"审批 张伟"` / `"审批 李娜"` | 1 (observed) | `condition.description` |
| 6 | Plus-addressing: `jane+billing@example.com`; dotless `ops@localhost` | 1 | plus-address → `[email]` (good); `ops@localhost` verbatim in `label`, `outcomeKey`, description |

**Verdict:** item 7 (free-text rule) works on digits and mid-sentence Latin names; it misses Title-Case and caseless
scripts, and *where it misses, the result is not merely a leak but a confident decision*. Item 8 (PII boundary) is
enforced on descriptions and questions; on structural fields it is `sanitizeText` only, whose digit rule needs ≥ 9
characters (`text-safety.ts:25`) and whose email rule needs a dot (`:24`). The upstream contract (`types.ts:11`) is the
real defence — and there is no upstream producer yet (§6), so the contract has never been exercised.

**SHA-256.** `sha256Hex` is called once, for `decisionId` (`detectDecisions.ts:148`). Not used for auth, integrity,
secrets or comparison. Its input is `JSON.stringify(prefixKeys)`, which escapes lone surrogates, so the
`unescape(encodeURIComponent(…))` path cannot throw (executed: label `"Approve \ud800"` → no exception). Note the id is
**not anonymising**: it is a hash of label text, so a low-entropy label is recoverable by dictionary. Fine for an id;
must never be described as redaction.

---

## 5. Q4 — Loop 149 (executed)

Fixture: four runs, branch at step 3, two runs per outcome.

| Fixture | Result | Assessment |
|---|---|---|
| Approve → `/done` vs Reject → `/edit` (approve also navigates) | approval_decision 0.54 | **correct**; approval outranks navigation |
| Approve vs a retry back to an earlier step | validation_result 1.00 | defensible (the retry label has no reject word) |
| `"Accept all cookies"` vs `"Reject all"` | approval_decision 0.54 | **wrong** — consent banner |
| `"Sign off"` (log out) vs `"Deny notifications"` | approval_decision 0.54 | **wrong** — `sign[ -]?off` (`signals.ts:24`) |
| `"Accepted"` vs `"Declined"` (status text) | approval_decision 0.54 | plausible |
| `"Submit"` vs `"Cancel"` | user_choice 0.54 | correct — neither word matches |
| `"Correct address"` vs `"Ship order"` | **validation_result** 0.54 | **wrong; contradicts loop 149's log** |
| `"Report error"` vs `"Continue"` | **validation_result** 0.54 | **wrong** |
| Approve (+ modal event) vs Reject | approval_decision **1.00** | an unrelated observed modal lifts a label-only decision to full confidence |
| `"Save"` vs `"Save and close"` (+ any modal event) | **exception_handling 1.00**, "Does an *error dialog* interrupt…" | any `system.modal_opened` is called an error |

- **Precedence** is sound on the realistic mixed case. **Regexes** are not over-broad on Submit/Cancel (the loop removed
  `confirm`/`return`), but are on consent and logout. All label-only mis-fires are capped at 0.54, so the P01 contract
  holds; the harm is a wrong question the UI would show.
- **Validation label rule:** the log's claim (`ITERATION_LOG.md`, loop 149, "Signal 6") is contradicted by
  `question-inference.ts:60-62` and by the two fixtures above. #338 item (1) is marked half-done on false evidence.
- **Lower-signal evidence stacking** ("a lower signal's evidence stays attached when a higher one wins") means an
  observed condition that has nothing to do with approval (a modal) promotes an approval guess to 1.00. Loop 149 states
  "a label alone never makes a confident decision" — true, but a label plus an irrelevant structural fact does.
- **Signal 7 dormancy** is tracked in #338 items (12)/(13), `types.ts` and the iteration log. It is **not** tracked as a
  UI gate: no row says the UI must not render `exception_handling` or the word "error". And when it wakes, it will call
  every confirm/share/upload modal an "error dialog" at 1.00 — `MODAL_OPENED_EVENT` (`signals.ts:21`) is any modal.

---

## 6. Q5 — Practices

- **Cool-off at 142 and 149.** Both are by-the-letter legal: consumed 142, recharged by three burn-downs (143-145),
  consumed 149. Not erosion of the *rule*. But both purchases bought features for a library with **no input producer**
  (nothing builds `StepInput`) and **no consumer** (`git grep decision-engine` in `apps/`: none;
  `check-dockerfile-workspace` does not list it). The cool-off exists to let the scoring formula pick product value
  above the burn-down floor; twice it picked shelf inventory. The 2-point margin (14 vs 12) is inside scoring noise.
  Recommendation: **the next cool-off may not go to a Path E engine row until a row that wires the engine into a user
  path is open and scored** (see §8).
- **D-4 review warranted — yes.** 606 → 780 → 958 lines across 148 and 149; each step measured under 200 by the loop,
  so clause 2 never fired. The contract changed both times (`eventTypes` on `StepInput`; a nine-tier precedence order;
  evidence stacking). Clause 2's own rationale — contract review *before downstream iterations build on the surface* —
  applies with more force now than at 142, because P10/P12/P15 will consume this output. Run a `system-architect` D-4
  on the accumulated surface before any further Path E engine loop. Also: **per-loop LOC is gameable by splitting**;
  propose measuring clause 2 cumulatively since the last architect review of the same module.
- **Claims vs code.** Three of this window's log claims are stronger than the code (§1.1-1.3). Pattern since MR-060:
  the reviewer, not the loop, finds the adjacent case. The brief should require **one adversarial fixture per claim
  in the commit title**, written before the fix.
- **Pool.** Open 119 (MR-060) → 119 (MR-061) → **120**. Window: 3 closed / 4 filed (#335-#337 by MR-061, #338 by
  loop 148) = **0.75**. Loop-only 3 / 1. Flat, slightly rising; Path E loops add refinements faster than they close
  them (#338 has 13 items).

---

## 7. What the window got wrong

1. Loop 148's title is false for Title-Case and caseless-script names: a confident (1.00) decision from a name (§4 #2, #5).
2. Loop 148's PII claim covers descriptions, not `label`/`outcomeKey`/`nodeLabel`/`prefixKeys` (§4 #1, #3, #4, #6).
3. Loop 149's "lone validation-word label no longer qualifies" is false (`question-inference.ts:60-62`).
4. Loop 149's signal 7 equates any modal with an error and its evidence stacking promotes label-only guesses to 1.00.
5. Loop 147's title overclaims: the server has no arming; the shared `CRON_SECRET` gives alert jobs purge capability.
6. Two cool-offs bought dormant engine surface; +352 lines without architect review.
7. Nothing needs reverting.

---

## 8. Q7 — Loop 150 pick

Pool 120 > 8 ⇒ burn-down; cool-off consumed at 149, recharge 0/3. Last five Areas: security/data, web-app/data,
security/data, path-e, path-e. **A third path-e loop would trip the 3-consecutive Area rule**, so no path-e row at 150.

**Which row wires the engine into the product?** None names it. The nearest is **#126 PATHE-P10** (graph merge +
canonical `ProcessDefinition` persistence, ~500-800 LOC, `audit-intake-PATHE-001`), whose score cell is unreadable
(MR-034 stray pipe). It is unblocked by code but blocked in practice: it needs a `StepInput` producer (intent
inference + route templating) that no row owns, and it exceeds one loop. Recommend the MR-062 recording file a
**"decision-engine D-4 + first producer"** row (architect review of the 958-line surface, the §4-§5 defects, and a
named upstream producer) before any further P06/P07 work.

| Rank | Pick | Score | Rule | Agent | Area |
|---|---|---|---|---|---|
| **1** | **#337** CI script-test floor counts files, not tests | **12** | `burn-down` | `qa-engineer` | test-infra / ci |
| 2 | **#325** V4 canary checks fixtures, not the live log | **12** | `burn-down` | `backend-engineer` | tooling / governance |
| 3 | **#324** "shared workflow library" claims + Viewer hint a11y (trust copy; D-4 clause 1 → `growth-strategist`) | **11** | `burn-down` | `frontend-engineer` | web-app / trust |

Then (151, path-e allowed again): the new D-4 + producer row (I4 A5 L4 C4 E2 R1 = **14**, `burn-down`,
`system-architect` primary), absorbing #338 items 1/10 and §4-§5. #336 (10) and the §3.2 server-side arming row (11)
after. MR-063 after loop 152.

---

## 9. Q8 — CEO decisions

| # | Decision | Status after this window | Unblocks |
|---|---|---|---|
| 1 | **Push** loops 137-149 (17 commits) | open; no code blocker | everything since `origin/main` |
| 2 | **Watch the first CI image build** after push (new `packages/` incl. process-graph; Dockerfile guard OK locally) | open; never built on a runner | runner image |
| 3 | **Enable retention** — `CRON_SECRET` in GitHub *and* the web container, URL with no query, manual dry run, then `RETENTION_PURGE_ARMED=true` | **now safe** (#335 closed); know that any `CRON_SECRET` holder can purge (§3.2) | Terms line |
| 4 | **Enable alerts** (`CRON_SECRET` + `ALERTS_CHECK_URL`) | open; note the shared secret | alerting |
| 5 | Brand name "Ledgerium AI" (#327) | open | — |
| 6 | Extension end screen (#327) | open; extension untouched 106 loops | — |
| 7 | Chrome Web Store listing (#327) | open, manual | — |
| 8 | #318 GitHub Pages | open | 16 root HTML pages |
| 9 | #320 PDF gating | open | pricing consistency |
| 10 | #316 viewer definition | not urgent | — |
| 11 | #308 React Flow Pro / attribution | open | store compliance |
| 12 | #191 Stripe trial stacking | open | real charges |
| 13 | #57 target; email verification | open | #57 evaluation |
| 14 | #225, #277, secret charset, squat query, Stripe price IDs | open (one ops batch) | 4-5 rows |
| 15 | #12 fail-loudly deploy | open | `deletedAt` |
| 16 | #271, #281, #216 | open | extension / post-push |
| 17 | Contract claims (SLA, support, "never used for training") | open | — |
| 18 | Clause-9 reversal option | applied `4a87223`; no objection recorded | — |
| 19 | **NEW: Path E direction** — keep spending cool-offs on the engine, or require a wiring row first (§6) | open | Path E sequencing |
| 20 | **NEW: separate retention secret or server-side arming** (§3.2) | open | least privilege |

---

## 10. Verdict

Every executed number reproduces at `8dd9866`: root 6118 ×2, web-app 4264 ×2, typecheck 0, validator clean (open 120),
39/39 script tests, Docker workspace guard OK, production build exit 0. Loop 147 closes the MR-061 bypass completely;
every remaining purge path requires an explicit `mode=purge` from a `CRON_SECRET` holder. Loops 148-149 are real,
tested and deterministic, but each overclaims: a confident decision from a Title-Case name, unmasked structural fields,
a validation rule that still fires on one word, and a modal signal that will call every dialog an error. The engine is
58% larger than its last architect review and reaches no user. Nothing reverts.

### Appendix — reproducing

```sh
git rev-list --count origin/main..main                                   # 17
sed -n 54,81p apps/web-app/src/app/api/admin/retention/purge/route.ts    # allowlist + predicate
grep -n "failLabelPair" packages/decision-engine/src/question-inference.ts   # :60, :62
grep -n "label: d.label\|prefixKeys: \[\|^    nodeLabel," packages/decision-engine/src/detectDecisions.ts  # :121 :149 :150 (unmasked)
grep -n "LONG_DIGITS_RE =\|EMAIL_RE =" packages/decision-engine/src/text-safety.ts   # :24 :25
for c in 3d7179d 6e7c09a 8dd9866; do t=0; for f in $(git ls-tree -r --name-only $c packages/decision-engine/src | grep -v test); do t=$((t+$(git show $c:$f | wc -l))); done; echo $c $t; done   # 606 780 958
git grep -l "decision-engine" -- apps                                     # (none)
```
