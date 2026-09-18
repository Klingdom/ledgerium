# MR-025 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-18 · **Trigger** base cadence: 3 counted loops (24, 25, 26) since MR-024 — **second consecutive on-time review**. · **Inputs** MR-024; ITERATION_LOG loops 24–26 and the MR-024 entry; backlog rows 185–213; SYSTEM_HEALTH; `git log --since=2026-09-17`; `.claude/settings.json` + `.claude/hooks/`; `playwright.config.ts`. Every count re-derived from the files, not copied forward.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | The "figure it out" delegation | **Boundary right; the P-5 reason is wrong on the facts** | Refusing to push is correct and not even the coordinator's call — `settings.json:53` denies `Bash(git push *)`; the CEO set that. Refusing a pricing call (#191) and a production-fact call (#203) is correct. **But "not a licence to rewire my own controls" cuts the wrong way for P-5.** Line 53 is itself a CEO-installed self-restriction; P-5 only *narrows* the agent. The legitimate worry — a misfiring hook wedging the repo — is a reason to want a yes, not to abstain. **"Runnable script, not wired" is theatre, and the repo proves it:** `.claude/hooks/` holds **7 shell scripts** and **`settings.json` references none of them**; its 8 hook entries are all inline. CLAUDE.md:355 calls that directory "enforcement". An 8th unwired script joins a dead layer. P-5 is binary. |
| 2 | Blocked-pile burn-down | **Effective — 9 → 4, the best cycle recorded** | Closed since MR-024: #202 (adopted L25), #205/#206/#207 (L25), #203 (L26, question **withdrawn** — the fix holds under either answer, which is how an undecidable should retire). **Genuinely CEO-only: 4** — #190, #191, #193, #212 (P-5) — plus two standing human actions (the push; one real Chrome recording). **#190 is a bundle hiding shippable work:** C3 (test-bind plan/price copy to `plans.ts`) needs no CLAUDE.md edit and no decision. **P-10.** |
| 3 | Extension drift | **Failing — the number is 18, not 15 or 20** | `git log -1 -- apps/extension-app/src packages/{segmentation,normalization,policy}-engine` = **7436b3e, 2026-09-15 (loop 8)**. Loops **9–26 = 18**. By the letter of D-1 it is 12 (loop 14's `public/samples/promo-*.html` sits under `apps/extension-app/`); under P-6(a), adopted at loop 25, static assets do not reset — **18 governs**. Loop 24 was right to refuse credit. **The gate barely moves the risk:** it converts "untouched and unverified" into "untouched and *claimed* verified". The `real-extension` job **has never executed on a runner** — a84e93c is unpushed — and the 6/6 local pass was headed Chrome on Windows against `xvfb-run` on Linux in CI. Until one green run, the exposure is unchanged. |
| 4 | Self-caught error rate | **Healthy — every catch by process, none by luck. One misattribution corrected.** | **L21** shell-quoting failure (caught by `git status`); **L22** incomplete test run (caught by applying the known #53 defect) and an empty grep (caught by distrusting silence); **L26** counts written from arithmetic (caught by re-reading actual output) and an IPv6 guard bug (caught by a test written for that exact input). **Loop 25 disclosed no error** — it disclosed two refusals; the arithmetic correction is loop 26's. So 3 error-disclosing loops of the last 6, not 4 of 4. Every catch followed a deliberate re-verification. **The cluster is diagnostic: four of five are counting-and-reporting, not design.** The fix is a stated rule, not a slower cadence — the same 26-minute loops produced the catches. **P-8.** |
| 5 | Follow-Up Debt ratio | **Effective — 0.69, up from 0.52** | Table below. |
| 6 | Validation depth | **Failing — the repo already wrote the rule it is not applying** | Verified: `--content-tertiary` appears **825** times in `apps/web-app/src` across **132 files**, **784** as `text-[var(--content-tertiary)]` — the filed "773" is stale and low. `.btn-primary`: **90** usages / **48** files, exact. The dark value recomputes to **5.52:1** on `#0D1117`, matching loop 25 to two decimals; the untouched print override `#6b7280` computes **4.83:1** on white, so it correctly needed no change. The arithmetic is sound. What is missing is that **no loop has rendered a page** — hierarchy, hover states and 48 button sites are asserted, never seen. **CLAUDE.md § Extension Reliability Invariant rule 6 already says unit tests cannot certify a rendered surface; the web app has no equivalent.** **P-9.** |
| 7 | Gate widening | **Overstated — 84 executions, 62 unique tests** | Reconciles exactly: nav 16 + pricing 4 + a11y 12 + happy-path 14 + plan-gating 6 + states 10 = **62 unique**, +2 setup, **+20 duplicate** (both public specs re-run under `authenticated`) = 84. "`v2-a11y` 14/14" is 12 tests + 2 setup. Loop 25 widened a gate carrying a known double-run defect, so duplicates grew **4 → 20**. Coverage rose 40 → 64; the rest is CI time. |
| 8 | Deploy state | **Failing — re-accumulated to 4, and the riskiest commit is the unrun one** | Unpushed: `1282ee3`, `a84e93c`, `16678aa`, `85ed7d9`. `deploy.yml:47` still `needs: quality-gate` only. |

## Debt ratio — rows 185–213, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 29 rows, 185–213 | 20 / 29 | **0.69** |
| MR-024's basis (185–211), restated | 19 / 27 | 0.70 (was 0.52) |
| Excl. governance #190, #193, #202, #212 | 19 / 25 | 0.76 |
| Policy window, loops 17–26 | 11 / 10 | 1.10 |

Open: 189, 190, 191, 193, 198, 200, 210, 211, 212. Passes ≥0.5 on every basis. The jump is real closure, not filing — loops 24–26 created **one** row (#213) and closed it in the same loop.

## Proposed changes (NOT applied)

| ID | Target | Change |
|---|---|---|
| P-5 | `.claude/settings.json` + `.claude/hooks/check_meta_review_due.sh` | **Re-affirmed, objection answered.** It narrows the agent only, matching the existing `git push` deny. Wire it or decline it; an unwired script is not a partial yes. |
| P-8 | Coordinator practice | No number enters a log, row or artifact unless read from command output in the same session. Arithmetic-derived counts are marked *estimated* or omitted. |
| P-9 | CLAUDE.md § How to Work | A design-token, global-CSS or >20-call-site component change needs one screenshot assertion on a representative page **or** a logged human look before "done". The Playwright harness already runs. |
| P-10 | Backlog hygiene | Split #190 into C1 / C2 / C3; C3 needs no ruling and becomes unblocked work. |

## Loop 27 endorsement

**Saturation, under loop 25's definition:** fine-grained window (22–26) = dashboard, copy, extension/qa, a11y, security — no Area reaches 3 of 5, **no −2**. The coarse `web-app` run was broken twice (loops 24, 26), so the backstop stands at **0 of 6**. Nothing is penalised.

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **#210** — every spec under `apps/web-app/` also runs under `authenticated` | 11 | Confirmed at `playwright.config.ts:70`: `testMatch: /app\/.+\.spec\.ts/` is unanchored and every spec path contains `web-app/`. Its value **rose** at loop 25 — duplicates went 4 → 20, a quarter of the gate. Effort 1, confidence 5. Anchor on `/e2e[\\/]app[\\/].+\.spec\.ts$/`, check `api`, re-verify with `--list`. |
| 2 | **#200** — remaining red E2E clusters (`api/*`, `public/*` remainder) | 8 | Split into per-file rows on next touch, per MR-023. |
| 3 | **#198** — dashboard filter state is not in the URL | 7 | Verified: zero `searchParams` / `router.replace` in `DashboardV2Shell.tsx`. |

D-1 stands at **18**, no unblocked extension row exists, and under P-6 no inferred ack remains — **loop 27 needs an explicit drift ack or a named extension item.**

## CEO decisions requested

1. **Push `main` (4 commits) first, and watch one thing.** The push fires `real-extension` for the first time ever. **Expect that job to be the failure if anything fails, and expect it to be environmental** — `xvfb-run` / MV3 headed-load on Linux — not the harness. Also watch the widened web gate: 84 executions where 40 ran, `v2-a11y` and `public/nav` newly in, contrast fix live. Two greens make the extension's gate of record real and satisfy loop 25's own condition for deploy-gating.
2. **D-A — P-5, yes or no** (#212). Not "write the script": wire it or decline it. **Until then** cadence is held by memory, and two on-time cycles under observation are not a control.
3. **D-B — the governance batch** (#190, #193, plus P-8 / P-9 / P-10). **Split #190 first** — C3 ships as ordinary work. **Until then** ~240 cold-pool items stay untriaged, the pipeline cannot refill, and 361 KB of § Current Phase loads every session.
4. **D-C — #191 pricing**, now the oldest open decision: a reverse-trial user can still be charged after a stacked 14-day card trial with no warning.
5. **Loop 27** — confirm #210, and give an explicit extension drift ack or name an extension item. The counter is **18**.
6. **Cheap and overdue:** one human look at the live dashboard and signup CTA after the push. Two token lines moved 784 text usages and 90 buttons; nobody has seen them rendered.
