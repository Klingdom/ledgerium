# MR-023 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-17 · **Trigger** (a) cadence overdue for the second review running: MR-022 closed after loop 13, and loops 14–20 make 7 counted loops against a 2–3 loop cadence. (b) Loops 18, 19 and 20 were all `web-app / qa`. · **Inputs** MR-022; ITERATION_LOG loops 14–20 plus the MR-022 entry; backlog rows 185–207; SYSTEM_HEALTH top; `git log --since=2026-09-14` (23 commits; `origin/main` = 1f0c531).

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Area saturation, loops 18–20 | **Effective. Loop 20 was defensible but mislabelled. D-1: Not-applied** | **The check is now logged:** loop 18 (ITERATION_LOG.md:43) and loop 20 (:10). **Rule reading:** when loop 20 was selected, the last 5 loops were 15–19, and only 18 and 19 were `web-app / qa`, so the rule did not strictly bind. Under MR-022's `/ qa` grouping (loop 15 = `security / qa`) the −2 penalty did apply, and #200 at 6 would have lost to #204 at 9. **Why finishing was still right:** the edits sat uncommitted across a session boundary, the dirty-index hazard loop 15 had just disclosed (:98). **Defect:** the entry is labelled `top-score` (:9) while saying it was not a score call (:10). **D-1:** loop 14 touched `apps/extension-app/` (a393e1a). Loops 15–20 touched no extension surface, so reverse drift tripped at loop 19, and no `user-ack` was logged ("D-1" occurs only at :107). **Pivot:** loop 21 leaves `web-app / qa`, and preferably `web-app` altogether. |
| 2 | Cadence slipped right after MR-022 | **Failing** | Only loop 20 checked the cadence (:22). **Cause is structural:** the cadence exists only as prose in CLAUDE.md, with no enforcement point. The "work autonomously through the next 4 hours" directive (:96) chains loops with no checkpoint. MR-020's rule fix C2 (#190) still waits on the CEO. Reminders have now failed twice in a row. **Control P-5 below.** |
| 3 | Follow-Up Debt ratio | **Recovering: 0.48 on the cohort, passes the 10-loop test** | Table below. |
| 4 | "Left red on purpose" pile | **Failing trend: the stall risk is real** | Keeping the tests red was right; raising the axe baselines would have gutted the ratchet (:33). But CEO-gated rows rose **4 → 7** since MR-022. SYSTEM_HEALTH's "Awaiting CEO" list still names only #190/#191/#193, and the fix for the pile (P-4 queue, #202) is itself waiting in it. **Cost:** `v2-a11y` and `public/nav` stay out of the gate, and the signup CTA fails AA. |
| 5 | Loop-21 pipeline | **Effective but thin** | 4 unblocked rows: #189, #198, #203, #204. Rows below #185 are still unselectable per MR-021, and are demonstrably stale: :255 lists #102 as open, but CLAUDE.md records it closed at iter 067. |
| 6 | Unpushed delta | **Failing: there is no push cadence** | **Size:** 8 commits, +766/−128 across 28 files. **Oldest unpushed:** 51af612, the E2E gate itself, which loops 18 and 20 widened, so it has **never run on GitHub** (:155). **It cannot block its deploy:** `deploy.yml:47` depends on `quality-gate`, not on the E2E workflow. **Only the CEO can push:** agents are denied `git push` (`.claude/settings.json:53`). |

## Debt ratio — rows 185–207 (recounted from the row text)

| Basis | Closed / created | Ratio |
|---|---|---|
| All 23 rows | 11 / 23 | **0.48** |
| Excl. governance #190, #193, #202 | 11 / 20 | 0.55 |
| Built fixes only (excl. #187 `closed-redundant`) | 10 / 20 | 0.50 |
| Policy window, loops 11–20 | 6 / 9 | 0.67 |
| Loops 18–20 only | 0 / 3 | 0.00 |

Closed: 185–188, 192, 194–197, 199, 201. The cohort is up from 0.41. The weak spot is loops 18–20: they fixed 21 tests and two real a11y defects under one open umbrella row (#200), earning no credit while creating three decision rows. MR-016 clause 8 describes this pattern. **Next time #200 is touched, split the unmeasured clusters (`public/*` remainder, `api/*`) into per-file rows.**

**Record defects found while recounting:**
- Six closed rows still read `open` in the status column (IMPROVEMENT_BACKLOG.md:290, 292, 293, 295, 296, 303). Counting that column gives 0.22.
- #194 and #201 have their Area, score and Birth cells swapped (:292 vs :303; births at ITERATION_LOG.md:221 and :191).
- `#64748B` on `#0D1117` computes to **3.98:1**, not the recorded "≈4.4:1" (ITERATION_LOG.md:31, IMPROVEMENT_BACKLOG.md:300, SYSTEM_HEALTH.md:15). The light theme is worse and unrecorded: `#94A3B8` on `#F8FAFC` is 2.45:1 (`globals.css:33`).
- Loop 14 cites the pre-amend hash `0401436` (:98); the reachable commit is a393e1a.
- Gate size: loop 18 logged 32 tests (:55), but loop 20 counts 34 dashboard tests (:20). **Insufficient evidence;** one `--list` run settles it.

## Proposed change (NOT applied)

| ID | Target | Change | Rationale |
|---|---|---|---|
| P-5 | `.claude/settings.json` `hooks.PreToolUse` (matcher `Bash`), plus new `.claude/hooks/check_meta_review_due.sh` | On any command containing `git commit`: count the `## … (loop N)` headings above the first `## … MR-0NN meta-review` heading in ITERATION_LOG.md (newest-first, so deterministic). If the count is **≥ 4** and the command contains neither `governance(meta-review)` nor `mr-override:`, exit 2 with "Meta-review due: N loops since MR-0NN". | **Where it bites:** every loop ends in a commit, and loop headings are written before that commit, so loop 3 passes and loop 4 is blocked. **Tested on today's log:** it returns 7, and would have blocked a650633 (loop 17). **Why not CI:** pushes are batched, so CI would fire too late. **Why not silent:** an override lands in git history. **Scope:** it enforces C2 (#190) rather than replacing it, and it edits config, so CEO approval is needed. |

## Palette decision — one request covering #205, #206 and #207

**"Approve one AA palette commit?"** Show before/after screenshots of the dashboard, the public nav with Solutions open, and the pricing CTA. Values below are computed; the final choice is a design call.
1. `--content-tertiary`: at least 4.5:1 on both surfaces in both themes. Dark example: `#8B949E` gives 6.15:1 and 5.26:1. Light needs its own value.
2. `.btn-primary`: `brand-600` → `brand-700` (5.48:1), with hover moving to `brand-800`.
3. "Poor" verdict word: `red-600` (3.92:1) → `red-500` (5.03:1), with the amber and green bands checked in the same pass.

**Acceptance:** `v2-a11y` and `public/nav` pass with baselines untouched and join the gate in the same commit. **If rejected:** record the 4 red tests as accepted exceptions so the rows stop waiting.

## Loop 21 endorsement

**Not ranked (blocked):** #190, #193, #202 (CLAUDE.md edits); #191 (pricing); #205–#207 (palette); #200 (excluded by Area).

| Rank | Pick | Score | Notes | CEO gate? |
|---|---|---|---|---|
| **Top** | **#204** — "High Variation" on analytics, v1 dashboard and public docs | 9 | `saturation-rule`. One `web-app / copy` loop in the last 5, so no penalty. 4 strings (`analytics/page.tsx:358`, `dashboard/page.tsx:215,1138`, `docs/page.tsx:1454`), so D-4 clause 1 fires and `growth-strategist` is required. | No |
| 2 | **#203** — the demo password is a published default | 8 | The only pick that leaves `web-app`. `seed-demo-account.ts:44` has no environment guard, and whether production was seeded with the default is unverified. **Run that read-only check first; if production holds the default, #203 becomes top.** | Only for the "disposable by design" option |
| 3 | **#198** — filter state is not in the URL | 7 | One `web-app / dashboard` loop in the last 5, so no penalty. | No |

None of the three touch an extension surface, so loop 21 must log `reverse-portfolio-drift: user-ack`.

## CEO decisions requested

1. **Push `main`** (8 commits; triggers a production deploy). Recommended now, plus a standing cap such as a push at every meta-review close.
2. **Palette package (#205–#207):** approve, change values, or accept as exceptions.
3. **P-5 commit hook:** approve or reject.
4. **Loop 21:** acknowledge the reverse drift; confirm #204, or #203 if production holds the default password.
5. **Unchanged:** #190, #191, #193, #202, and one human Chrome recording.
