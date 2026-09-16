# MR-022 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-16 · **Trigger** cadence overdue — MR-021 closed at loop 8 (09-15); loops 9–13 ran since, 5 counted against a 2–3 loop cadence · **Inputs** MR-021; ITERATION_LOG loops 9–13; backlog rows 185–201; SYSTEM_HEALTH top; `git log --since=2026-09-15` (7 commits); CLAUDE.md control rules.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Area saturation, loops 11–13 | **Not-applied — outcome defensible** | No literal breach — Areas were `web-app / qa`, `web-app / qa`, `ci / qa`, so the 3-consecutive test never tripped. But none of loops 11–13 logged a saturation check (loop 6 did), and grouping the `/ qa` suffix the −2 "3 of last 5" penalty was due at loop 13, dropping #199 from 9 to 7 — behind #194/#196. The chain was real (#195 exposed #200; loop 12 cleared 3; loop 13 gated them), so pivoting at 13 would have left the green subset unenforced — the exact rot being fixed. Loop 14 is the right pivot; the fix is declaration, not a carve-out (P-3). |
| 2 | Loop-12 sequencing | **Effective** | Not score-gaming: the deferral was logged as a sequencing decision, #199 shipped one loop later, and loop 12 claimed no closure (#200 still open). One spec file, zero `src/`. A red-on-arrival gate is the documented cause of the rot being fixed. |
| 3 | Loop-13 gate scope (22 of 229) | **Effective; widening rule will rot** | Honest — partial scope and reason stated in log, row and SYSTEM_HEALTH. Useful — the 22 cover plan gating, rewritten twice in a week (9b0fb72, 60ccfb3) with zero coverage. Two defects: the job is named suite-wide while covering 10%, and "add a file once green" now lives only in prose in a **closed** row (#199). An obligation with no enforcement point is how this suite rotted. |
| 4 | Self-correction (13 → 8) | **Effective** | Loop 11 named the error and its mechanism (13 = raw `test.skip` occurrences incl. 4 guards + a docblock), reversed it across 4 records, and stated "the agent's figure was correct and my correction of it was not." Does **not** recur — loops 9, 11, 12, 13 each re-derived independently (IHDR pixel decode; `HEAD` check proving 3 failures pre-existing; file:line per stale assertion; local CI-command run). One failure mode, not a habit of overriding agents. |
| 5 | Follow-Up Debt ratio | **Failing (0.41) — refill-explained** | Table below. |
| 6 | CEO-decision stall | **Effective — keep asking** | Principle is right: MR-021 upheld that silence-as-accept cannot apply to C1–C3, since every prior use (MR-008, MR-016/017, MR-018/019) declared its window at proposal while MR-020 asked for explicit approval; retrofitting manufactures consent. The real mismatch is velocity — #190/#191/#193 are ~6 loops but only **2 calendar days** old. Gap: three re-asks per turn, none pricing cost of delay (P-4). Default-with-notice rejected — #190/#193 edit CLAUDE.md, and #191's option (a) is itself a pricing decision, not mere harm reduction. |

## Debt ratio — rows 185–201

| Basis | Closed / created | Ratio |
|---|---|---|
| All 17 rows | 7 / 17 | **0.41** |
| Excl. governance #190, #193 | 7 / 15 | 0.47 |
| Built fixes only (excl. #187 `closed-redundant`) | 6 / 15 | 0.40 |

Window: loops 4–13 (10 counted); births span loop 2 → loop 11 plus two audit-intake batches. Closed: 185–188, 192, 195, 199. All readings sit below the 0.5 floor, down from MR-021's 0.57 — loops 10–11 created 7 rows (#195–#198 promoted, #199–#201 discovered) against 3 closures. **That growth is the refill MR-021 demanded** when it rated the pipeline Failing with only #189 selectable, so a sub-floor reading straight after a mandated refill measures the refill, not the burn-down. Exactly 1 of 7 closures was redundant — P-2(b)'s split is cheap but low-signal today (0.41 vs 0.40).

## P-1 / P-2 / C1–C3 status

| ID | Status | MR-022 ruling |
|---|---|---|
| C1–C3 (#190) | Awaiting CEO | Unchanged; not re-proposed. |
| P-2 (#193) | Awaiting CEO | Unchanged. (a) was effectively exercised by loop 10's refill; (b) validated as cheap, currently low-signal. |
| P-1 (#193) | Awaiting CEO | **Do not approve as written — re-scope.** Loop 10 is decisive: of 16 DV2 items 4 (25%) were noise, but 5 were live defects including the dark plan-gating suite that produced #195, #199, #200, #201 and the CI gate — the highest-yield finding of loops 9–13. Blanket `archive-stale` would have discarded it, and P-1's premise that per-item verdicts go stale is refuted. The cost is real; the answer is **pacing** — one pool per cycle (~8 loops, affordable per loop 10), archiving by default **only** items that do not reproduce against current source, with individual verification mandatory for any item citing a test/CI gap or user-visible defect. |

## Proposed changes (NOT applied)

| ID | Target | Change | Rationale |
|---|---|---|---|
| P-3 | CLAUDE.md § Selection Policy, Step 3 | When a pick is chosen because it unblocks the next intended pick, log `chain: N of M — unblocks #<row>`. Area saturation and its −2 penalty are suspended for the declared length; the chain must terminate at M or be re-declared. | Loops 11–13 were a genuine dependency chain, but nothing distinguishes it from drift in the record and no saturation check was logged. Declaring up front makes the exception auditable, not inferred afterwards. |
| P-4 | New `docs/meta/CEO_DECISION_QUEUE.md`, linked from SYSTEM_HEALTH § Awaiting CEO | One row per open decision: question as yes/no, recommended default, **cost of delay**, and whether it edits CLAUDE.md. Loops link to it instead of restating three asks. No default ever self-applies. | Three decisions re-asked for 5 loops with no change in framing. #191 has a live chargeback path never priced into the ask. Raises signal without weakening no-assumed-consent. |

## Loop 14 endorsement

| Rank | Pick | Selection rule | CEO gate? |
|---|---|---|---|
| **Top** | **#194** — correct optional promo-tile copy (`promo-large-920x680.html`: "Understand everything.", plan-gated "health scoring" / "variant detection", unmeasured "Instant SOP generation") | `top-score` (10) among Area-eligible rows after the item-1 pivot out of QA, and the only candidate that also clears **D-1** (loops 10–13 are 4 consecutive non-extension; any non-extension pick trips N=5, forcing a user-ack at loop 15). **D-4 clause 1 fires** (≥3 strings) → `growth-strategist`. Files are `public/samples/` + `scripts/`, **not** on the Extension Invariant forbidden list — no harness run required; do not repeat loop 8's 4× over-spend. | **No** |
| Alternate | **#196** — create-portfolio silent no-op at `DashboardV2Shell.tsx:1176-1179` | `top-score` (10); pivots Area to `web-app / dashboard`; the only shipped, user-visible broken affordance in the pool. Cost: leaves D-1 at 5, so loop 15 needs `reverse-portfolio-drift: user-ack`. | **No** |

**Not endorsed at loop 14:** #200 (a 4th consecutive QA loop — pace it, pairing each triage slice with the gate widening); #201 (cheap at E=1/R=1 and highest raw score 11, but `security / qa` extends the same run and its risk is verified low — expired, localhost).
