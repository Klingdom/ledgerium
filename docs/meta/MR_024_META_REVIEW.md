# MR-024 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-17 · **Trigger** base cadence: 3 counted loops (21, 22, 23) since MR-023 — the first on-time review in three cycles. · **Inputs** MR-023; ITERATION_LOG loops 21–23 and the MR-023 entry; backlog rows 185–211; SYSTEM_HEALTH top; `git log` (`origin/main` = 3e45fbf, 2 unpushed). Every count below was re-run or re-derived, not copied.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Cadence held | **Effective — but it was memory, not the rule** | Each loop hand-wrote a counter ("1 loop since MR-023", "2", "3 — MR-024 is due"), primed by MR-023 naming the failure. The rule still has no enforcement point. All three loops ran inside **26 minutes** of wall clock (3e45fbf 10:59 → 34eed78 11:25), so C2's "21 days" arm would never have fired — only a loop-count trigger bites. One compliant cycle under direct observation, against two overdue ones, is not evidence a prose rule works. **P-5 UNCHANGED: approve.** |
| 2 | Inferred "continue" ack chain | **Failing — and the drift is worse than recorded** | Loop 21's ack was anchored to MR-023 explicitly asking for one; loops 22–23 re-derived it from a bare "continue" to a report disclosing the inference. Disclosure then silence is not consent — silence-as-accept governs meta-review amendment windows, not per-loop acks. **Record correction:** MR-023 credited loop 14 with an extension touch; those files are `apps/extension-app/public/samples/promo-*.html`, static markup. The last commit touching extension **behaviour** is 7436b3e (loop 8) — real drift is **15 loops**, not 9. **Bound (P-6): an inferred ack is valid for one loop; a second consecutive one is a hard stop.** No unblocked extension row exists in 185–211, so D-1 cannot be cleared by selection — which makes the refill (P-2, in #193) load-bearing. |
| 3 | Scope under re-scoping | **#209's split Effective; the filing pattern Failing** | **#209 was right:** architect ruling first (read-only), prerequisite scope, one logical outcome, `scope-expansion: approved` logged, #208 left as a pure copy call, leftovers pushed to #211 not dropped. **But three rows running were filed narrower than the defect:** #208 said two names, loop 23 found four across 8 strings; #205 was a dashboard token until loop 20 widened it and split off #207; and **#210 understates itself** — verified today, `authenticated`'s `/app\/.+\.spec\.ts/` matches *every* spec under `apps/web-app/`, so `e2e/api/*` and `e2e/smoke/*` double-run too. Rows are written from the one surface that surfaced them, with no repo-wide sweep at filing. **P-7.** |
| 4 | Copy churn | **Failing — no control exists** | "High Variation" → "Inconsistent" (loop 17) → "High Variation" (loop 23): net label change over 3 loops and 2 consults, **zero**. Both consults were compliant; D-4 clause 1 fired each time. The failure is the **input**, not the gate — loop 17's consult saw 1 string, loop 23's saw 8. "Forbid single-string consults" is the right instinct, wrong lever: D-4 already compels the consult; the missing control is a mandatory inventory. **P-7.** |
| 5 | Follow-Up Debt ratio | **Effective — 0.52, up from 0.48** | Table below. |
| 6 | The blocked pile | **Failing — the record undercounts it** | **8 rows**, not 7: #190, #191, #193, **#202**, #203, #205, #206, #207 — plus unfiled P-5 = **9 decision items**. #202 is missing from SYSTEM_HEALTH's "Awaiting CEO" block, which still names only #190/#191/#193 and the Chrome recording. |
| 7 | Deploy state | **Failing, partially recovered** | The CEO pushed 10 commits after MR-023 — recommendation 1 worked once — and **re-accumulation began in the same session**: 2 unpushed (loops 22–23; 19 files, +258/−30). Agents are denied `git push` (`.claude/settings.json:53`), so the risk is not a coordinator that commits and forgets; it is that the only actor who can push holds 9 other decisions. **Structural defect stands:** `deploy.yml:47` `build-and-push` needs only `quality-gate`, so a push deploys production with the E2E gate never having run as widened. |

**Loop 23's numbers, re-run here:** workspace **4742/4742** (231 files) and web-app package **3030/3030** (173 files) both confirmed, as is loop 22's correction of loop 20's gate reconciliation.

## Debt ratio — rows 185–211, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 27 rows, 185–211 | 14 / 27 | **0.52** |
| MR-023's basis (185–207), restated | 12 / 23 | 0.52 (was 0.48) |
| Excl. governance #190, #193, #202 | 14 / 24 | 0.58 |
| Policy window, loops 14–23 | 7 / 8 | 0.88 |

Closed: 185–188, 192, 194–197, 199, 201, 204, 208, 209. Passes ≥0.5 on every basis. Two of the four loop-22 creations (#210, #211) were found **by doing the work** — discovery, not inflation.

## Proposed changes (NOT applied)

| ID | Target | Change |
|---|---|---|
| P-5 | `.claude/settings.json` + new hook | **Re-affirmed unchanged.** Block `git commit` once ≥4 loop headings sit above the last meta-review heading. |
| P-6 | CLAUDE.md § Meta-Review Cadence, D-1 | (a) A non-executable asset under an extension path does **not** reset the reverse-drift counter — the substance test D-6 already applies to test-only touches. (b) An inferred ack is valid for **one** loop; a second consecutive one is a hard stop. |
| P-7 | CLAUDE.md § Selection Policy / D-4 | (a) A row naming a string, token or regex records its **repo-wide match count** at filing. (b) No copy consult without that inventory attached; its verdict must name every occurrence it rules on. (c) A one-line copy-decision register, so a reversal is visible before it is proposed. |

## Loop 24 endorsement

**Saturation:** loops 19–23 = qa, qa, copy, dashboard, copy. No Area reaches 3 of 5, so **no −2 fires** under the fine-grained reading used since MR-022. Under a coarse `web-app` reading, web-app is 5 of 5, every web-app row takes −2, and #203 ties #210 at 9. **This ambiguity has bitten three reviews; D-B should settle it.**

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **#210** — every spec under `apps/web-app/` also runs authenticated | 11 | Effort 1, confidence 5. Restores the gate's meaning before it is widened further. **Re-scope on selection:** the defect covers `api/` and `smoke/`, not only `public/` — apply P-7 before building. |
| 2 | **#203** — demo password is a published default | 9 | The only non-web-app pick; wins outright under the coarse reading. Ship the env guard now; the production fact is D-C. |
| 3 | **#200** — remaining red E2E clusters | 8 | Per MR-023, split the unmeasured clusters (`public/*` remainder, `api/*`) into per-file rows on next touch. |

All three are non-extension. Under P-6 the inferred ack is exhausted, so **loop 24 needs an explicit drift ack or a CEO-directed extension loop.**

## CEO decisions requested

The 9 blocked items package into three, each naming what stays unshippable until answered.

1. **D-A — one AA palette commit** (#205, #206, #207; values computed in MR-023). Approve, revalue, or record the 4 red tests as accepted exceptions. **Until then:** `v2-a11y` and `public/nav` stay out of the CI gate, and the "Start free" signup CTA ships below AA across 48 files.
2. **D-B — the governance batch** (#190, #193, #202, P-5, P-6, P-7) — all cheap, all editing CLAUDE.md or `.claude/settings.json`, apart only because they arrived in different cycles; rule also on whether `Area` is `web-app` or `web-app / qa`. **Until then:** cadence stays unenforced, the pipeline cannot refill (so D-1 stays unclearable), ~240 cold-pool items stay untriaged, and 361 KB of § Current Phase loads every session.
3. **D-C — billing and the demo account** (#191 pricing call; the production fact behind #203). **Until then:** a reverse-trial user can be charged after a stacked 14-day card trial with no warning, and if production was seeded with defaults, `demo@ledgerium.ai` is a publicly documented Team-plan login. #203's code half — refuse the default unless `DATABASE_URL` is local — needs no decision and should ship anyway.
4. **Push `main`** (2 commits) and adopt a push at every meta-review close. Add `e2e-web-app` to `deploy.yml` `build-and-push.needs` **only after D-A** — gating deploy on 4 deliberately-red tests would block every deploy.
5. **Loop 24** — confirm #210, and give an explicit drift ack or name an extension loop.
