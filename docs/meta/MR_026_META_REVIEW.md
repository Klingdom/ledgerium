# MR-026 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-20 · **Trigger** base cadence: 3 counted loops (27, 28, 29) since MR-025 — **third consecutive on-time review**. · **Inputs** MR-025; ITERATION_LOG loops 27–29 and the MR-025 entry; backlog rows 185–218; SYSTEM_HEALTH; `git log --since=2026-09-18`; `.claude/hooks/`; `.github/workflows/`. Every count re-derived here, including MR-025's own.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Row-quality | **Failing — a systematic defect with one signature** | #217, filed from a wrapped grep line plus an unchecked audit sentence, was **wrong**: `support/page.tsx` says "screen **recordings**", which is accurate; the only live instance is `product/page.tsx:189`, a **competitor** cell. #208: filed as 2 names, actually 4 across 8 strings. #210: filed as pricing-only, actually every spec under `apps/web-app/`. #200: 45 → 42 → ~34 → ~24 as measurement improved. The stale "773 call sites" rode three rows and MR-025 itself — **actual 828**, re-confirmed here (MR-025's 825 is wrong; loop 27's 828 is right). **Signature: every defective row was filed from a *derived artifact* — a search-result line, an audit sentence, a remembered number — never from reading the cited file.** All err narrow or mislocated, never wide: a partial view can only show less than exists. **P-11.** |
| 2 | Subagent claim reliability | **Effective — verification is proportionate; it should narrow, not relax** | Checkable claims, loops 23–29: **right 9** — annotation_text unscreened (`normalizer.ts:190`); shadow-DOM bypass (`composedPath` = **0 hits** in `content/`, re-confirmed); devops-engineer's workflow (5 checks); the architect's `isHighVariation` ruling; MR-025's push-deny, hooks-unwired, 784-across-132, 5.52:1 recompute, 84/62 reconciliation. **Wrong 5** — MR-023's loop-14 extension credit; MR-025's 825; the store auditor's screen-content claim; the privacy auditor's *proposed fix* (reusing label-shaped `screenFreeText` would have silently destroyed any note over 12 words); growth-strategist's casing table. **~64%.** The pattern is sharp: **all 5 errors were locations or numbers, all 5 refutable in under two minutes by opening the file, and none catchable by any test.** So verify narrowly and always. **P-12.** |
| 3 | Extension drift, post-clearance | **Cleared genuinely; the cadence is a token** | Loop 28 is a real behavioural change under `src/background/`, harness 6/6 — D-1 honestly at **1**. But `git log` over the enumerated surfaces returns **3 commits in 29 loops** (c4bdbd5 L4, 7436b3e L8, e2d8d65 L28): ~10%, with a **19-loop gap**. One in twenty is a token. Worse, loop 28's row **did not exist** — the backlog held zero extension rows, so the loop commissioned two audits to find work. **Supply, not appetite, is the defect**, now partly self-fixed: #216 and #218 are open, and the gate is real — `real-extension` executed on a runner for the first time on 2026-09-18 (run 35353704615, "6 passed (21.3s)", not vacuous). **P-13.** |
| 4 | Follow-Up Debt ratio | **Effective — 0.68, flat on 0.69, and flat is right** | Table below; the base grew 29 → 34 rows and closure kept pace. |
| 5 | Validation depth (MR-025 §6) | **Real, not theoretical — but smaller than MR-025 framed it, and cheap to close** | It is live: `16678aa` is deployed. **It is not true that nothing rendered it** — `v2-a11y` 14/14 and `public/nav` axe green are real-browser runs, and 6 specs gate on push. Absent is any *appearance* check: `toHaveScreenshot` appears **0 times** in the whole e2e tree and no CI job is visual. Residual risk is what axe cannot see — tertiary moved toward secondary (hierarchy), `brand-700` on brand-tinted panels — across 784 text sites and **90** `.btn-primary` usages in 48 files. **The machinery exists and sits idle:** `documentation-screenshots.spec.ts` and `store-tiles.spec.ts` capture PNGs today. **P-9′.** |
| 6 | Decision backlog | **Effective — 6 items, only 2 load-bearing** | Below. One left the pile without a ruling: loop 27 found a **third option** for #212 — a CI cadence check, in git, touching none of the agent's controls. Not CEO-only; it should just ship. |

## Debt ratio — rows 185–218, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 34 rows, 185–218 | 23 / 34 | **0.68** |
| MR-025's basis (185–213), restated | 21 / 29 | 0.72 (MR-025 read 0.69) |
| Excl. governance #190, #193, #202, #212 | 22 / 30 | 0.73 |
| Policy window, loops 20–29 | 12 / 12 | 1.00 |

Open: 189, 190, 191, 193, 198, 200, 211, 212, 214, 216, 218. Passes ≥0.5 on every basis. Loops 27–29 created 5 and closed 3; the dip is arithmetic, not decay — loop 28's two audits filed four rows in one loop.

## Proposed changes (NOT applied)

| ID | Target | Change |
|---|---|---|
| P-11 | Backlog hygiene (Selection Policy) | A row is **selectable** only once it carries a first-hand locator triple: (a) file + line; (b) the text at that line **copied from reading the file**, not from a search-result line; (c) the command and hit count establishing its extent. Rows born from an audit, sweep or subagent report are filed `unverified` and cannot be picked until the triple is confirmed — verification belongs to the filing loop. Zero new cost: loop 29 did exactly this, and it is the only reason correct copy was not "fixed". |
| P-12 | Coordinator practice (narrows, not relaxes) | Re-read every **cited location and every number** from a subagent at source before use — where 5 of 5 errors lived. Judgement may be taken as written, **except** a proposal to reuse an existing function, which requires reading that function first (the annotation case). |
| P-13 | Backlog supply | Keep **≥1 open extension row at all times**. An empty extension backlog triggers an audit loop, not a licence to drift; while such rows are open, extension work runs ≥1 loop in 5. D-1 keeps counting behavioural commits only (P-6(a)). |
| P-9′ | Supersedes MR-025's P-9 | A design-token / global-CSS / >20-site component change attaches **one captured screenshot** via the existing capture specs. Drop the "logged human look" arm — it never happens. |

## Loop 30 endorsement

**Saturation:** fine-grained window (25–29) = a11y, security, qa, extension/privacy, copy — no Area reaches 3 of 5, **no −2**. Coarse `web-app` backstop stands at **1 of 6** (loop 28 broke the run). D-1 is **1**. Nothing is penalised; no drift ack is needed.

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **Deploy gating** — not yet a row; file it first under P-11 | 11 | Decided at loop 25; its precondition (one green `real-extension` CI run) was met **2026-09-18**. `deploy.yml:47` is still `needs: quality-gate` only, so a red E2E gate cannot block a deploy. Both E2E suites are separate workflows, so this needs a `workflow_run` trigger, not a `needs:` entry — which is why it earns its own loop. |
| 2 | **#218** — dead `SENSITIVE_INPUT_TYPES` | 9 | Verified: referenced **only by its own test**; `classifySensitivity` never consults it and returns `isSensitive: false` for `email`/`tel`. The "decide" framing is softer than filed — **deleting** the misleading constant needs no CEO call; only *wiring* it would be a behaviour change. Extension surface, so D-1 holds at 1; harness costs 21s. |
| 3 | **#200** — remaining red E2E clusters (`api/*` next) | 8 | Split per-file on touch, per MR-023. |

Then #198 (7). **Hold #214** (6): one flake, no trace; chasing it now is guesswork, and the row says so.

## CEO decisions requested

1. **Push `main` (3 commits).** `e2d8d65` is a **live privacy fix** — user-typed notes containing SSNs or card numbers are still uploaded verbatim in production until it ships. The only item here with an active exposure behind it.
2. **D-A — split #190, approve C1 alone.** C1 (trim § Current Phase, 361 KB loaded every session) needs no ruling on archive-stale, unlike C2/C3 and #193. **Until then** ~240 cold-pool items stay untriaged.
3. **D-B — #216 shadow-DOM.** A password inside a web-component login escapes detection silently. The fix (`composedPath()[0]`) changes which element **every** event is attributed to — a capture-semantics call under the Invariant. **It blocks the last substantive extension defect.**
4. **D-C — #212 P-5: yes, no, or take the CI variant.** Loop 27's CI cadence check gives the same control, lives in git, and touches none of the agent's config. If that is acceptable, P-5 retires.
5. **D-D — #191 pricing**, unchanged and now the oldest open decision: a reverse-trial user can still be charged after a stacked 14-day card trial with no warning.
6. **Human-only, unchanged:** the Chrome Store Dashboard listing (`config.ts:16` is still a placeholder) and one real Chrome recording. Ranked #1 by four consecutive reviews; it gates every distribution channel.
