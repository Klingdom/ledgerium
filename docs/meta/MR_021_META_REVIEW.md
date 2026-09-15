# MR-021 — Meta-Review (Mode 4, governance only, NON-counting)

**Date** 2026-09-15 · **Trigger** standard 3-loop cadence (MR-020 on 09-14, then loops 6, 7, 8) · **Inputs** MR-020; ITERATION_LOG loops 6–8; backlog rows 185–191; SYSTEM_HEALTH top; MR-017/018/019 cold-pool tables; CHROME_STORE_SUBMISSION_READINESS_001 §6.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1a | Loop-6 endorsement | **Effective** | The "analytics" row hid 3 feature gates: health scores on 2 routes and watermarked exports. Fixed in 9b0fb72, mutation-checked, deployed. |
| 1b | Loop-6 scope-expansion log | **Partially conforming** | Guardrail 7 is Mode 5-only, so applying it to Mode 1 was voluntary. The log covers criteria (b), (c) and (e). It lacks (a) a specialist evidence artifact and (d) a reference to one; the code evidence was sufficient anyway. Loop 6 also cites a "loop 5 (docs)" that has no entry. |
| 1c | Harness 403 fixture | **Effective, coverage caveat** | Test 6 uses an HTTPS 403 stub, fails under mutation, and passed 6/6 ×4. CI runs only the static harness, so it guards nothing unless run locally. No human Chrome run is logged. |
| 2 | #187 closed before build | **Effective — encourage** | Claims verified: the chip turns amber at ≤3 days (`trial-chip.ts:63,97`), and the reverse trial never charges. The investigation surfaced #191. Guard: count it apart from built fixes (P-2). |
| 3 | Coordinator re-verification | **Effective, slightly over-spent** | It caught the 3007-vs-4717 miscount and two overstated MR-020 figures. The only trim: loop 8 ran the harness 4×. After an agent reports 2 passes, 1 coordinator run on a fresh build is enough. |
| 4 | Follow-Up Debt ratio | **≥0.5 (indicative)** | Window: rows born 09-14/15 (185–191), loops 1–8. Closed 4 of 7 = **0.57**. Excluding #190 (not a follow-up): 0.67. Built fixes only: 3/6 = **0.50**. Caveats: 8 loops is under the 10-loop window, and loop 1–4 follow-ups never reached the backlog. |
| 5 | Silence-as-accept for C1–C3 | **Not applicable — agree: NO** | Every prior use (MR-008→011, 016→017, 018→019) declared its window when proposing. MR-020 and 989df79 said "need CEO approval" instead. C1 removes 361 KB of context. Silence cannot override an explicit ask. Nothing applied. |
| 6 | Pipeline + cold pools | **Failing** | Only #189 (score 6) remains selectable. The MR-006 Change D triage is **MANDATORY and overdue**:<br>• MR-019 queued DV2 and WDC-002 as "cannot defer"; MR-020 skipped both.<br>• MDR, WDC and PIB were last triaged at MR-017 (05-14).<br>• PRICING-001, SOPPM-001, TEAM-001 and PATHE-001 were never triaged.<br>Ages run about 30–40 iterations, with the artifacts unchanged since April–May against 244 commits. About 240 items do not fit this review. Readiness blocker **B-1** (the 440×280 promo tile PNG) is engineering work, still missing, and was never added to the backlog. |

### Loops 9+ sources

| Source | Selectable? | Why |
|---|---|---|
| Chrome B-1 promo tile | **Yes** | Run the existing `capture-promo-images.ts` and verify the PNG size. It is the last non-human blocker for CEO queue #1. |
| #189 | Yes | Low value, no CEO needed |
| R-2 canonical hash | No | Any hash change is the framing decision (CEO #2). A characterization test adds little beyond the existing 10/10 tamper-evidence check. |
| R-4 measurements | No | Blocked by the content gate and CEO #3; there are zero customers to measure |
| Chrome S-3 `sender.id` | No | Touches the message path on the Invariant's forbidden list |
| Aged cold pools | Pool-level only | Needs P-1 first |

## MR-020 C1–C3 status

Unapplied; tracked as #190, awaiting CEO. Re-ask as three separate yes/no questions: C2 and C3 are small, and C1 is the big one.

## Proposed changes (NOT applied)

| ID | Target | Change | Rationale |
|---|---|---|---|
| P-1 | CLAUDE.md § Audit-Intake Pattern, clause 7 | Allow a pool-level `archive-stale` verdict when an artifact has been unmodified for more than 90 days and its surface has changed. The pool closes, and items return only if re-audited. | Triaging about 240 items one by one against changed code yields stale verdicts. That cost is why two mandatory triages were skipped. |
| P-2 | CLAUDE.md § Selection Policy (new Step 0) + Follow-Up Debt numerator semantics | (a) If no unblocked row scores ≥8, refill first: promote verified blocker/P0 items from audits newer than 90 days, with file:line citations. (b) Log `closed-redundant` apart from built closures, and report both ratios. | B-1 sat outside the backlog while the pipeline ran dry. Redundant closures should not inflate the ratio. |

## Loop 9 endorsement

| Rank | Pick | Selection rule | CEO first? |
|---|---|---|---|
| **Top** | **Chrome B-1:** render and verify the 440×280 small promo tile. Promote first as `Birth iter: audit-intake` from the readiness doc §6. | `top-score`. Area is extension/store assets. Web was 2 of the last 5 loops, so no penalty; D-1 clear. | **No** for the asset; submission stays human. Check tile claims (see 11d0f6d). Add `growth-strategist` if ≥3 strings change. |
| Alternate | **#189:** one shared `/api/account` fetch for both chips | `burn-down`, score 6 | No |

A cold-pool triage is not endorsed for loop 9; it should wait for a CEO ruling on P-1.
