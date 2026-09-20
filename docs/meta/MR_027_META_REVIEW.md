# MR-027 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-20 · **Trigger** base cadence: 3 counted loops (30, 31, 32) since MR-026 — **fourth consecutive on-time review**. · **Inputs** MR-026; ITERATION_LOG loops 30–32 and the MR-026 entry; backlog rows 185–220; SYSTEM_HEALTH; `git log` / `git log origin/main..main`; `.github/workflows/`. Every count re-derived here, including MR-026's own and the brief's.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Meta-review cadence | **Still earning its cost, but thinning — widen to 4 with a revert condition** | MR-022→027 span loops 14–32: **19 loops, 6 reviews**, intervals 7, 3, 3, 3, 3. Adoption is real: MR-024's P-6/P-7 adopted L25; MR-025's P-8 adopted (L31 stashed and re-ran rather than deriving **36 → 38**), P-9 → P-9′ → #220 → shipped L32; MR-026's P-11/P-12/P-13 adopted L30. **But novelty is falling: 3, 2, 1.** P-11 codified what L29 had already done unprompted; P-13's supply problem self-fixed *before* MR-026 ran (L28 filed #216/#218); P-12 narrows P-8. **Exactly one MR-026 proposal was unobtainable from inside a loop** — P-9′, after 30 loops with `toHaveScreenshot` at 0 uses repo-wide — and it is now discharged. Items 5 and 6 below are likewise invisible from inside a loop. Not yet confirmatory; the margin is one finding. **P-15.** |
| 2 | P-11 (locator triple) | **Working, fast, not over-applied** | Two loops, two saves. **L31**: opening `sensitivity.ts:13-20` refuted the row's binary (wire-in *or* delete) and surfaced two facts the row lacked — the constant is imported by nothing but its own test, and `ssn`/`credit-card` are not HTML input `type` values, so as set members they could never match. Re-scored **9 → 12**; shipped a third option. **L32**: three apparent dashboard defects investigated, **zero filed** — all read from server `stats.*` the mock omits. Three false rows prevented in one loop, against MR-026's finding that 5 of 5 defective rows came from derived artefacts. Cost: **zero extra loops**, both inside normal picks. Not over-applied — L32 logged the KPI-strip dual-source shape as an observation rather than forcing a row it could not evidence. |
| 3 | Self-caught errors | **Flat — and the brief mis-describes loop 30, which changes the answer** | **L30 disclosed a *limitation*, not a catch**: "I cannot run GitHub Actions, so the first push is this change's verification." Nothing was caught because nothing could be, and it is **still unverified** (unpushed — item 6). The real window: **L28** passed `'session-test'` where `blockedDomains: string[]` was expected — vitest green, **7 workspace typecheck errors** caught it; **L31** measured a test delta instead of deriving it (a *prevention* under P-8); **L32** produced two PNGs **byte-identical at 263,233 bytes** and its own size assertion passed — caught **only by opening the images**. So 2 errors + 1 prevention in 3 loops, against MR-025's 3-in-6: **flat, not rising**. Composition matters more than rate: MR-025's cluster was counting-and-reporting (4 of 5); L32's was a **verification too weak to fail** — a different defect than rushing, and fixed correctly (assert the applied `<html>` class before capture, not slow the loop). **No rushing signal.** |
| 4 | Follow-Up Debt ratio | **Effective — 0.72, up from 0.68** | Table below. Loops 30–32 created 2, closed 3. |
| 5 | Validation depth (P-9′) | **NOT discharged — one route in two themes is 3.7% of the surface and 0% of the defect that motivated the rule** | Re-counted under `apps/web-app/src`: `--content-tertiary` = **828 across 132 files** (MR-026 right; MR-025's 825 wrong). `components/dashboard-v2` holds **31** of them — **3.7%**; `app/(public)` holds **107**. `.btn-primary` = **90 call sites / 48 files**; `components/dashboard-v2` holds **0**. Loop 25's button fix (#207) was the **signup CTA at 3.76:1 on a public page** — the most-seen button in the product — and loop 32's evidence **cannot show it**. P-9′ is discharged for the tertiary-text arm on one route and **not at all for the button arm**. Also uncovered: public pages, the extension sidepanel (no render path exists), any second viewport. The machinery is built; a second route costs one `test()` block. **P-14.** |
| 6 | Unpushed work | **Failing — and carrying an ordering risk nobody has named** | **6 commits**; `origin/main` is at `5f40aed`. Oldest is `b8ee822` (2026-09-18 08:09), a docs/ops commit — **not** the privacy fix; `e2d8d65` is second, 11 minutes later. Age **2 days 4 hours**. **Exposure, plainly:** user-typed annotations containing SSNs, card numbers, emails or phone numbers are uploaded **verbatim from every installed extension** until `e2d8d65` ships. Live, ongoing, user-generated — the only active leak here; everything else unpushed is a guard, gate or test. **New risk:** `ec19afa` rewires `deploy.yml` (`build-and-push` needs 3 jobs; both E2E workflows converted to `workflow_call`; `push: main` removed) and **has never executed**. If branch protection required the old push-triggered check names, those checks stop appearing on main. **The push that stops the leak is also the first live test of the release pipeline.** |

## Debt ratio — rows 185–220, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 36 rows, 185–220 | 26 / 36 | **0.72** |
| MR-026's basis (185–218), restated | 24 / 34 | 0.71 (MR-026 read 0.68; #218 and #220 have since closed) |
| Excl. governance #190, #193, #202, #212 | 25 / 32 | 0.78 |
| Policy window, loops 23–32 | 12 / 8 | 1.50 |

Open: 189, 190, 191, 193, 198, 200, 211, 212, 214, 216 — **ten, four of them CEO-blocked**. Passes ≥0.5 on every basis.

## Proposed changes (NOT applied)

| ID | Target | Change |
|---|---|---|
| P-14 | Supersedes P-9′ | "A representative page" means one page **per surface class the change touches**, chosen from the token's own distribution rather than from convenience; a change across N sites attaches evidence covering the **largest cluster**. Loop 32 satisfied P-9′ as written while covering 31 of 828 tertiary sites and 0 of 90 button sites. |
| P-15 | Meta-review cadence | Interval **4 counted loops** (or immediately on any early trigger), from MR-028. **Revert to 3** the first time a review yields ≥2 findings unobtainable from inside a loop. A measured widening with a trip-wire, not a relaxation. |

## Loop 33 endorsement

**Saturation:** fine-grained window (28–32) = extension/privacy, web-app/copy, ci, extension/privacy, governance+web-app/qa — no Area reaches 3 of 5, **no −2**. Coarse `web-app` backstop stands at **1 of 6** (runs broken at L28, L30, L31). **D-1 is 1** — L31's `packages/policy-engine/src/sensitivity.ts` is an enumerated surface and a behavioural change. No drift ack needed. **P-13 caution:** #216 is the only open extension row and it is CEO-blocked, so extension supply is again effectively zero.

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **#200 — the public cluster** (`public/{landing,static-pages,auth-flow}`) | **9** (8 base, +1) | Closes E2E debt **and** item 5 in one loop: public pages hold **107** tertiary sites and every `.btn-primary` CTA, the specs already exist, and each file that turns green joins the gate in the same commit per the widening rule. The +1 is for discharging P-9′'s uncovered arm at no extra loop cost. |
| 2 | **#198** — dashboard filter state not in the URL | 7 | Coordinator-verified: **0** `searchParams` / `router.replace` / `history.replaceState` in `DashboardV2Shell.tsx`. Self-contained, user-visible, needs no decision. |
| 3 | **#214** — flaky `free-auth.setup.ts` | 6 | Take **only if #200's gate run reproduces it**; otherwise still guesswork, as the row itself says. Run `--retries=0` with a trace when it appears. |

Then **#189** (6, duplicate `/api/account` fetch). **#216 is not selectable** — `composedPath()[0]` changes which element every event is attributed to: a capture-semantics call under the Extension Reliability Invariant (D-B).

## CEO decisions requested

1. **Push `main` (6 commits) — then watch one deploy run.** `e2d8d65` stops a **live** PII leak in user-typed notes. `ec19afa` rides along and is an unverified deploy-pipeline rewire; if it wedges, `e2d8d65` is already on main and reverting `ec19afa` alone releases it. **Push first, in that order.** Highest-value action on this list.
2. **D-A — split #190, approve C1 alone.** Unchanged from MR-026, now two reviews old. **Until then** ~240 cold-pool items stay untriaged and § Current Phase loads 361 KB per session.
3. **D-B — #216 shadow-DOM.** A password inside a web-component login escapes detection silently. Blocks the last substantive extension defect — and with it, extension backlog supply under P-13.
4. **D-C — #212 P-5: yes, no, or the CI variant.** Third review running. Loop 27's CI cadence check gives the same control in git, touching none of the agent's config. If acceptable, P-5 retires.
5. **D-D — #191 pricing**, unchanged and the oldest open decision: a reverse-trial user can still be charged after a stacked 14-day card trial with no warning.
6. **P-15 — cadence to 4 loops.** A governance ruling, not a code change; declining costs one loop per cycle.
7. **Human-only, unchanged:** the Chrome Store Dashboard listing (`config.ts:16` is still a placeholder) and one real Chrome recording. Ranked #1 by five consecutive reviews; it gates every distribution channel.
