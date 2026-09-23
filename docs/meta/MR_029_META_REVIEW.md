# MR-029 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-23 · **Trigger** base cadence: loops 36, 37, 38 since MR-028 — sixth consecutive on-time review. · **Inputs** MR-028; ITERATION_LOG 36–38; backlog rows 185–224; SYSTEM_HEALTH; `git log --since=2026-09-22`; `docs/ecc/README.md`; counts re-derived at `e8c1047`.

Same contract as MR-028: only what a loop could not have found alone.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | L37 & L38 headline claims | **Both hold; every statically checkable figure lands exactly** | **L37:** the guard is at `e2e/global-setup.ts:17-51` — fetches `localhost:3098/api/health` **before** the unlink, throws naming cause, row #214 and remedy, wrapped in `if (!process.env.CI)`. Its probe finding is consistent with the config: `globalSetup` runs before `webServer`. **L38:** fills recomputed independently from sRGB — `bg-red-500` **3.763**, `bg-amber-500` **2.147**, `bg-green-500` **2.279** on white; **4.302 / 7.538 / 7.103** on `#1C2128`. Six of six exact. The 3 lock tests exist (`v2-a11y.spec.ts:562-596`), parameterised over bands 30/70/90, asserting exactly the three claims: accessible name carries the verdict, the verdict is *visible*, the rail keeps `aria-hidden`. **The one figure that looks wrong is not:** static count is 12 → 15, not 14 → 17 — the `authenticated` project declares two setup dependencies, which Playwright counts as tests. Suite 156 → **159** ✓. **L36 re-verified too:** 157 deletions across 29 `src` files = the "157 sites", and `app/(public)/` really does hold **zero** literal-dark backgrounds, so the exception test was genuinely unambiguous there. |
| 2 | What L38 did not log | **A 13-file commit shipped outside its own record, and "0 created" is false** | `e8c1047`, one minute after L38's commit, refreshed **12 published `docs/screenshots/*.png`** and filed **#224**. L38 says "**Follow-ups:** 0 created" and never mentions it; CHANGELOG covers L37 and L38 but not this. The work is fine — `dashboard-list.png` was inspected, not committed blind. The defect is bookkeeping: customer-facing assets moved with no iteration-log line, and the debt count was reported from a superseded state. Structurally invisible to a loop, which writes its entry before its last commit. |
| 3 | The a11y arc, 34–38 | **Legitimate chain — but it has now saturated on this repo's own rule, and it is feeding itself** | Causally sound: 34 photographed → found the brand green failing as text → 35 fixed and gated dark → 36 cleared the public surface → 38 ruled and locked the last sub-items. Each finding came from the prior artefact. **Two things only visible from outside.** (a) Areas 34–38 = qa, a11y, a11y, qa, **a11y** — a11y is **3 of 5**, so **−2 fires at loop 39, first time**. It was *not* owed at 36 or 38 (2 of 5 each), so those `top-score` claims were clean. (b) **3 of the last 5 picks were rows the arc itself filed** (#221, #223, and now #224) — MR-028's loop-34 self-authorship finding turning structural. **#198 has been passed over five times** and is the highest-scoring row the arc did not author. |
| 4 | The ECC import | **Changed outcomes twice — and shadowed a working agent while reporting it had not** | **Not ceremony.** L36's mechanical exception test is a real method, and the loop measured that its ambiguity never arose, then overrode the architect's ordering on axe's node list and said so. L38 is stronger: the ruling turned "repaint" into "do not repaint, pin the reasoning", and corrected an input the coordinator had wrong. **Two risks.** (i) **A conformance ruling was delegated to an imported markdown prompt and is now locked into CI.** Mutation proves the locks bite; it does not prove the exemption is right. If the 1.4.11 ruling is wrong, those tests manufacture evidence of compliance — worse than an untested defect. No primary-source citation (SC text / Understanding doc) appears anywhere. (ii) `docs/ecc/README.md` claims **26 agents, "zero name collisions"**; `b92946c` added **29**, and **25 collide with user scope**. Mostly byte-identical — but **`product-manager` is not**: 134 lines at project scope now shadow **941** at user scope, and project scope wins. That is reason #2 the README gave for not copying wholesale; the check was run against `trading-*`, not against the set imported. Declining `hooks/` and `.mcp.json` was right and remains open. |
| 5 | D-1 | **The counter is 7, and the rule is now inert** | Verified per commit: `57b7f9c` (L31) is still the last touch of an enumerated extension surface; L32–38 have **zero** — seven loops, tripped at 5 (loop 36), uncleared for three. Loops 36–38 flag it without a number, so the drift MR-028 corrected has resumed. **The posture is right and the rule is broken.** Inventing extension work to reset a counter is worse than carrying it, and #216 is CEO-blocked, so no legal pick discharges it. But P-6 as adopted says *one inferred ack, then a hard stop*; the loops have taken a third path — no ack, no stop, a note — three times. A trigger that fires every loop and changes nothing has stopped being a control. **Replace, don't delete:** when N is exceeded and no *unblocked* row on a tracked surface exists, D-1 should discharge into a dated CEO escalation carrying its own age and re-arm when the blocker clears. Escalate the blocker; stop taxing the loop. |
| 6 | Debt ratio | **0.75, up from 0.74** | Table below. L36–38 created 1 (#224), closed 1 (#214). |
| 7 | MR-028's top ask | **Acted on — first time in three reviews** | `origin/main` is now `eb2fe91` (loop 36); `e2d8d65`, the PII fix ranked #1 by six consecutive reviews, is **shipped**. Four commits remain unpushed, ~1 day old. Recorded because a review that only escalates stops being read. |

## Debt ratio — rows 185–224, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 40 rows, 185–224 | 30 / 40 | **0.75** |
| MR-028's basis (185–223), restated | 29 / 39 | 0.74 (unchanged) |
| Excl. governance #190, #193, #202, #212 | 29 / 36 | 0.81 |
| Policy window, loops 29–38 | 8 / 6 | 1.33 |

Open: 189, 190, 191, 193, 198, 211, 212, 216, 223, 224 — **ten, four CEO-blocked**. Passes ≥0.5 on every basis.

**Artefact defect, cheap:** row `~~222~~` (line 310) carries a duplicated trailing cell block ending `| ... | open |` after its `**done (loop 35)**`. Any counter reading the last cell scores a closed row as open. Mine reads the strike-through, so 0.75 stands.

## Loop 39 endorsement

**Area rule applied.** 34–38 = qa, a11y, a11y, qa, a11y → **a11y 3 of 5: −2 on any a11y pick.** First loop where it bites, and it changes the answer: MR-028's endorsement (#223) is demoted. **D-1 = 7**; all three picks are web-app and none can clear it.

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **#224** — consent banner over the published docs screenshots | **9** | Customer-facing, one spec, set the consent cookie in `addInitScript` then regenerate. Area `web-app / docs`, no penalty. **Condition: it was filed by loop 38's own unlogged commit, so Candidate Selection must read `directed — self-filed`, not `top-score`** — MR-028's L34 finding applied before the fact rather than after. |
| 2 | **#198** — dashboard filter state not in the URL | 7 | Passed over five times. Self-contained, user-visible, no decision needed, different Area, and the only remaining row the arc did not author. If #224 is the 20-minute job it looks like, take both — logged as two loops. |
| 3 | **#223** — remaining in-app hardcoded dark-palette classes | 8 **− 2 = 6** | Still the row that lets light join `a11y.spec.ts`. Recovers its 8 after one non-a11y loop. Note the in-app surface lacks loop 36's safety property: `app/(public)/` had zero literal-dark backgrounds, the rest of `src` will not, so the exception test must actually be run rather than assumed. |

Not ranked: #189 (6), #211 (5) — real, not urgent. #216 (8) is the only extension row and stays blocked.

## CEO decisions requested

1. **`product-manager` is shadowed.** A 134-line imported agent now overrides the 941-line definition this loop has used for months. Delete, rename, or confirm intended. The other 24 collisions are byte-identical and harmless.
2. **ECC `hooks/` + `.mcp.json`** — still unwired, still awaiting the explicit decision the README asks for. No urgency; it should close rather than carry.
3. **D-1 — replace the rule (item 5).** Escalate the blocker with an age, re-arm on clear. Otherwise delete it: a control that fires every loop and moves nothing trains the loop to ignore triggers.
4. **D-B — #216 shadow-DOM.** Third review running, and the only lever that clears D-1.
5. **D-A — split #190, approve C1 alone.** Fourth review running; `§ Current Phase` is still 361 KB per session.
6. **D-C — #212 P-5:** yes, no, or the CI variant. Fifth review running.
7. **D-D — #191 pricing**, oldest open decision, unchanged.
8. **Human-only, unchanged:** Chrome Store listing (`config.ts:16` still a placeholder) and one real Chrome recording. Ranked #1 by seven consecutive reviews — the push moved, this has not.
