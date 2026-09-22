# MR-028 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-22 · **Trigger** base cadence: loops 33, 34, 35 since MR-027 — fifth consecutive on-time review. · **Inputs** MR-027; ITERATION_LOG 33–35; backlog rows 185–223; SYSTEM_HEALTH; `git log --since=2026-09-20`; class counts re-derived at `c892f34` (loop 35's parent).

**Deliberately short.** MR-027 measured novelty per review falling 3, 2, 1. This reports only what a loop could not have found alone.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Loop 35's numbers | **Accurate — every checkable figure lands exactly.** Nothing overstated, unlike MR-027 §5 | At `c892f34`: `text-brand-600` **156 / 45 files**; `hover:text-brand-500` **16**; `bg-brand-600`+`text-white` same line **20** (now 0); `text-[#e2e8f0]` **153 / 40 files**, **134** under `app/(public)`. Union of all three replacement sets = **51 files** — "~51" and "~40" both exact. All four classes now **0** in `src`. `--brand-text` is per-theme (`globals.css:28,61`). Contrast recomputed independently: `#047857` on white **5.48:1** ✓, `#34D399` on `#1C2128` **8.43:1** ✓, diagnostic `#059669` on `#1C2128` **4.30:1** (log said 4.29). 150→154→156 matches the specs added. **Caveat, not an overstatement:** dark 0/0 is now machine-enforced by the new spec; light 11/26 rests on a deleted probe, is ungated, and nothing stops it regressing. **Two stale numbers:** #223 cites `text-brand-500` at 89 — the pre-loop count; 16 were fixed, leaving **73**. And D-1 (item 3). |
| 2 | Scope expansion at L35 | **Right line, wrong axis — and it silently set CI coverage** | The distinction is principled, not volumetric: `#e2e8f0` is one token with one correct replacement; `text-brand-400` needs per-class judgement because some sites are legitimately dark. Guardrail 7 passes (evidence, same Area, logged, no overlap with L34's files). **What no loop can see:** the expansion line and the *gate* line were set by one act. Stopping at `#e2e8f0` is why `a11y.spec.ts` gates dark only. Not yet a rationalisation for sweeps — but the cost isn't scope, it's that the shipped gate protects exactly the theme the loop happened to finish. The guard worth having is "does the expansion line coincide with a gate line", not "how many sites". |
| 3 | The arc 33→35 | **Healthy chain, one self-fulfilling pick, one drifted counter** | Each finding came from the prior artefact and was measured: L33 refuted MR-027's own "#200 public cluster" by re-measuring (already 43/43 green). **But L34's `top-score` was self-authored** — it filed #221 at 13, above every pool row, then picked it. 2 of 3 picks were genuine. #198 (7) has been passed over three times and is the top row the arc did not create. **D-1 is 4, not 3:** `57b7f9c` (L31) is the last commit touching an enumerated extension surface; L32–35 touched none (verified per commit). L35 logged 3; L36 inherits it. At 4, **L36 on web-app trips N=5** — and #216, the only extension row, is CEO-blocked, so **no backlog pick can clear it**. |
| 4 | Debt ratio | **Effective — 0.74, up from 0.72** | Table below. L33–35 created 3, closed 3. |
| 5 | Cadence | **This review earned its slot, and MR-027's own trip-wire fires** | Three findings unobtainable inside a loop: the D-1 drift and its unclearable state; the expansion/gate coupling; and that **unpushed work grew 6 → 9 commits, age 2d4h → 4d**, `origin/main` still `5f40aed` — MR-027 ranked pushing it the #1 CEO action and **none of L33–35 mentions it**, because a loop reports its own work and does not re-audit standing decisions. P-15 proposed widening to 4 with "revert to 3 on ≥2 findings unobtainable from inside a loop". That condition is met on the first review after it was written. **Do not adopt P-15; hold at 3.** The 3-2-1 series was two points of noise, not a trend. |

## Debt ratio — rows 185–223, recounted from row text

| Basis | Closed / created | Ratio |
|---|---|---|
| All 39 rows, 185–223 | 29 / 39 | **0.74** |
| MR-027's basis (185–220), restated | 26 / 36 | 0.72 (unchanged) |
| Excl. governance #190, #193, #202, #212 | 28 / 35 | 0.80 |
| Policy window, loops 26–35 | 10 / 10 | 1.00 |

Open: 189, 190, 191, 193, 198, 211, 212, 214, 216, 223 — **ten, four CEO-blocked**. Passes ≥0.5 on every basis.

## Loop 36 endorsement

**D-1 = 4** (corrected). Any web-app pick trips N=5 and needs an explicit `reverse-portfolio-drift: user-ack`; #216 being blocked means the trigger cannot be discharged by selection. **Saturation:** fine-grained (31–35) = privacy, governance+qa, qa, qa, a11y — no Area at 3 of 5, **no −2**. Coarse `web-app` run is 4 consecutive.

| Rank | Pick | Score | Notes |
|---|---|---|---|
| **Top** | **#223** — remaining hardcoded dark-palette classes | **8** | The only row that unlocks something already built: light joins `a11y.spec.ts` the day it lands, closing the hole item 2 names. 138 + 73 sites needing per-class judgement — a loop, not a sweep. Web-app: **ack required**. |
| 2 | **#198** — filter state not in the URL | 7 | Passed over three times while the arc ran. Self-contained, user-visible, no decision needed. Take it if #223 looks like two loops. |
| 3 | **#214** — `free-auth.setup.ts` flake | 6 | Score understates it: the gate runs the whole suite (L33) and deploy depends on it (L30), so this **can block a release today**. L35 produced a falsifiable hypothesis (`reuseExistingServer` bound to a recreated `test.db`). Prove or kill it before changing anything. |

## CEO decisions requested

1. **Push `main` — 9 commits, 4 days old.** `e2d8d65` still stops a live PII leak in user-typed notes and is still unshipped; three loops are now stacked on `ec19afa`, an unverified deploy rewire. Larger than when MR-027 ranked it first.
2. **P-15 — decline; hold the interval at 3.** CLAUDE.md says 2–3 and needs no edit. Recorded so the proposal closes rather than carries.
3. **D-B — #216 shadow-DOM.** Now also the only lever that clears D-1; while blocked, every loop pays an ack.
4. **D-A — split #190, approve C1 alone.** Third review running; ~240 cold-pool items untriaged, § Current Phase still 361 KB per session.
5. **D-C — #212 P-5:** yes, no, or the CI variant. Fourth review running.
6. **D-D — #191 pricing**, oldest open decision, unchanged.
7. **Human-only, unchanged:** Chrome Store listing (`config.ts:16` still a placeholder) and one real Chrome recording. Ranked #1 by six consecutive reviews.
