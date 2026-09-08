# SEO/AEO Content Expansion — Product Scope Decision

**Author:** product-manager agent
**Date:** 2026-09-08
**Trigger:** CEO request — "a strategy to develop more content by use case, role, department, industry"
**Primary source:** `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` (2026-09-02, seo-aeo agent, CEO-supplied GSC export 2026-05-12→2026-08-11)
**Scope of this document:** product framing and gate design only. No product code modified. No content calendar produced.

---

## 1. Problem Statement

**What problem would more content actually solve?** Content on these four axes would, in principle, solve a *discovery* problem — a prospective buyer searching for "workflow SOP for [role/department/industry]" finds Ledgerium instead of a competitor. That is a real problem class.

**Is it the binding constraint right now? No.** — REASONED, built on VERIFIED inputs below.

Three facts make this an honest "no," not a hedge:

1. **The four requested axes are not new — they are already the most saturated part of the corpus, and they are the part that failed.** `industries` (9), `departments` (9), `personas/roles` (16), and `problems/use-cases` (22) = **56 of the existing 164 pages (34%)** are already built on exactly these axes. VERIFIED (page count from source review §0 corpus table).
2. **The mechanism that would make new pages on these axes succeed — organic ranking — is blocked upstream by an input more content cannot produce.** 82% of the corpus targets `commercial` intent (competitor-alternatives) queries; the site sits at average position 44; referring domains are ~0. Position is a function of off-page authority, not on-page content volume. VERIFIED.
3. **The prior attempt at this exact intervention is already measured and closed.** 136 pages added since June (the July 2026 expansion) produced impressions ×27 and clicks → **0**. VERIFIED, GSC export. More pages did not solve the discovery problem; it produced more invisible pages.

The company's actual binding constraints today, per the source review and independently confirmed by re-reading it: (a) zero off-page authority / referring domains, (b) the product is not installable outside Developer Mode (Chrome Web Store listing still `placeholder`), (c) zero testimonials or case studies exist to support outreach or review-site listings, (d) zero paying customers to date on the SEO channel. None of these four is solved by writing more pages on use-case/role/department/industry axes. Content volume is not the lever.

---

## 2. Re-Entry Gate Spec

The August re-entry criteria (source review, STOP list item 7) are directionally correct but were stated in prose, not as an enforceable artifact — which is exactly the failure mode that let the iter 098 health gate (≥80% indexed AND <30% zero-impression before scaling) get "written down, assigned an ID, and scaled past anyway" (REPORTED, per `FUNNEL_AND_SOP_REVIEW_001`, 2026-07-19 — not independently re-verified in this document, cited as-is).

The gate below is designed so a repeat of that failure requires an explicit, logged, attributable override — not a silent scale-past.

### Conditions (all three must be simultaneously TRUE)

| # | Condition | Threshold | Data source | Scope |
|---|---|---|---|---|
| A | Average organic position | **< 20** | Google Search Console → Search Results report, trailing 28-day window | Per-cluster, filtered by page-path prefix (e.g. `/sop-templates/*`). **Not** blended across all 164 pages — a portfolio-wide average masks cluster signal, which is the exact measurement error that let iter 098 scale past a healthy-looking blended number. |
| B | Referring domains | **> 0** | GSC → Links report → "Top linking sites" count (free, already available — no new tool required) | Sitewide is sufficient for condition B; note in the gate-status file if cross-checked against a paid tool (Ahrefs/Moz). |
| C | Non-brand clicks | **≥ 1** in trailing 90 days | GSC → Search Results report, Query dimension, filtered to exclude "ledgerium" and brand variants | Per-cluster, same page-path filter as condition A. |

### Enforcement mechanism (the part that prevents another iter 098)

1. **Single canonical status file:** `docs/meta/SEO_RE_ENTRY_GATE_STATUS.md`. Every check writes a dated entry: date, checker name, condition A/B/C values with raw numbers or a linked export, and explicit PASS/FAIL per condition. This file is versioned in git — any future decision to publish despite a FAIL becomes a visible diff with a commit message, not a silent decision.
2. **Separation of duties.** The gate may not be certified by the same agent/person proposing to resume publishing. Certification requires **product-manager or CEO sign-off**, citing the dated status-file entry. A growth or content-implementing agent recommending resumption is not a valid certifier of its own gate.
3. **PR-level enforcement.** Any pull request adding files under `apps/web-app/src/content/pages/` must cite the current status-file entry's date and PASS verdict in the PR description. If the status file is more than 30 days old, or shows FAIL on any condition, the PR is out of policy regardless of `validateContent` passing — this explicitly decouples the re-entry gate from `validateContent`, which the source review confirmed has no visibility into position, referring domains, or clicks (§1.4).
4. **Mandatory recheck cadence, independent of intent to publish.** The gate is rechecked monthly regardless of whether a publishing decision is pending, so a stale six-month-old PASS cannot be cited as current.
5. **Per-cluster, not portfolio-wide.** Re-entry is granted per cluster (e.g., "sop-templates cleared, industries not cleared"), never as a single "the site is cleared" verdict — this prevents one strong cluster from licensing expansion of a weak one, which is what happened when the July 2026 intervention treated the corpus as one undifferentiated pool.

**Current status (VERIFIED, re-checked today 2026-09-08 against the source review's evidence): Condition A fails (position 44, portfolio; no cluster below 20). Condition B fails (referring domains ~0). Condition C fails on a portfolio basis (2–3 non-brand clicks total in 3 months, both single-digit-impression noise). Gate: FAIL, all three conditions.**

---

## 3. Scope of Work Right Now (gate not met)

Three options were posed. Evaluated honestly:

**(a) Zero net-new pages; improve existing only.**
Cost: near-zero. Preserves the 164-page asset (VERIFIED as genuinely good quality — schema, freshness, argumentation), keeps it fresh via the existing `verifiedAsOf` SLA, and stops the one action already proven not to work. Directly matches the source review's own STOP list item 1 and item 7.

**(b) A strictly bounded pilot of N pages on the single highest-signal cluster.**
Real option in principle, but two problems disqualify it as *current* action: (i) it directly contradicts the source review's explicit instruction not to resume publishing until the gate is met — treating it as current scope would itself be a scale-past event of the kind this document exists to prevent; (ii) the only positive signal in the entire corpus is two pages with 1 and 3 total impressions — statistically noise, not evidence a pilot could validate faster than the actual constraint (referring domains) resolves.

**(c) Non-SEO content assets only.**
Directionally right but presently blocked upstream: the highest-value non-SEO content (testimonials, case studies, review-site collateral) requires paying customers with an outcome to describe, and there are zero today (VERIFIED, source review §5.2 — no testimonial/case-study surface exists in `(public)`). What *is* available now without that dependency — a founder-outreach one-pager, a Chrome Web Store listing description, a demo script — is legitimate, small, and not gated by SEO re-entry because it is not indexed programmatic content.

### Recommendation: **(a), with a narrow, explicitly-scoped parallel track drawn from (c).**

Primary scope: zero net-new SEO pages. Maintain the 164-page asset (freshness SLA only). Redirect the content-production capacity the CEO is trying to allocate toward the two highest-leverage items in the source review that are gated by content, not by authority: the Chrome Web Store listing copy/screenshots (§5.1 of source review — technical blockers already closed 2026-08-19, submission still not made) and founder-outreach collateral supporting §5.2/§5.3. Neither is a "content expansion program" and neither requires re-opening the four requested axes.

**(b) is not recommended today.** A disciplined contingency spec is provided in §4 in case the CEO explicitly overrides this recommendation — that override must be logged, not silent, per the enforcement mechanism in §2.

---

## 4. Contingency: Bounded Pilot Spec (NOT recommended — for use only under an explicit, logged CEO override of §3)

If the CEO elects to override the §3 recommendation, this is the disciplined form that override must take. Note explicitly: **this pilot does not touch the four axes originally requested (industries/departments/roles/use-cases).** Those axes carry zero page-1-adjacent evidence; the only cluster with any is `sop-templates`.

| Parameter | Value |
|---|---|
| **N** | 5 pages maximum |
| **Cluster** | `sop-templates` only — the sole cluster with any organic signal (`/sop-templates/vendor-setup-sop-template` position 5.0; `/sop-templates/system-access-request` position 12.3 — VERIFIED, both n=1–3 impressions, stated by source review as signal-not-proof) |
| **Selection filter for the 5 topics** | Long-tail, specific, low-competition, transactional-adjacent queries only — explicitly excluding any competitor-alternatives, broad persona, department, or industry framing (the pattern the source review identifies as the 82%-of-corpus failure mode) |
| **Pre-publish gate** | Existing `validateContent` (word floor, near-dup distance, `verifiedAsOf`) — necessary, explicitly **not sufficient** per source review §1.4 |
| **Measurement window** | 90 days post-publish (index + rank stabilization lag) |
| **KILL criterion (pre-committed, written before the pilot starts)** | At day 90: fewer than 2 of 5 pages indexed **and** ranking ≤ position 50, **or** zero clicks across all 5 pages → pilot is killed. No further `sop-templates` pages authored for at least 2 quarters. This criterion may not be reinterpreted after the fact. |
| **Result that justifies scaling** | ≥3 of 5 pages reach position < 20 **and** ≥1 records a non-brand click by day 90 → triggers a re-test of the §2 gate against the wider corpus using the pilot as evidence. It does **not** automatically license expansion of the industries/departments/roles/use-cases axes — those remain separately gated. |
| **Owner** | Named individual distinct from whoever authored the pilot pages, per the §2 separation-of-duties rule |

---

## 5. Success Metrics

| Metric | Baseline (today) | Day-90 target | Status |
|---|---|---|---|
| Referring domains | ~0 | ≥8–10 | REPORTED target from source review §7; owned by the off-page authority workstream, not this content decision |
| Non-brand clicks (portfolio, trailing 90d) | 2–3 (VERIFIED, GSC) | **Will not move meaningfully from any action in this document's scope** — stated honestly | Content is not the lever for this metric |
| Average organic position (target clusters) | 44 (VERIFIED, portfolio-blended) | **44 — no change expected; explicitly do not act on its absence of movement** | Per source review §7, this is the metric most likely to be misread as failure and trigger a repeat of the mistake this document exists to prevent |
| `verifiedAsOf` freshness SLA compliance across 164 pages | not currently tracked as a KPI | 100% within SLA | The one metric this workstream can actually move, cheaply |
| Chrome Web Store: live listing | absent (`config.ts:16` = `placeholder`) | Live, installs accruing | Outside "content" scope strictly, but the single highest-leverage item touching the same capacity this document is arbitrating |
| Paying customers (any channel) | 0 | ≥1 | The only milestone that matters, per source review §7 |
| AEO citation rate (10-prompt panel, 4 assistants) | not run | Run monthly; not expected to register a hit | Will read as a false zero at current volume (source review §4.3) — do not treat a zero here as new information |

**What will not move, stated in advance so it cannot later be read as failure:** organic position, click volume attributable to content, and AEO citation rate. All three are gated on off-page authority and product accessibility, not on page count.

---

## 6. Out of Scope

- A content calendar or editorial production schedule.
- Any new page template, page type, or expansion of the axis taxonomy.
- Publishing on the industries / departments / personas-roles / problems-use-cases axes beyond the existing 164 pages, under any framing, until the §2 gate passes for that specific cluster.
- Execution of the off-page authority workstream itself (outreach, PR, review-site solicitation) — tracked as a growth/founder workstream; referenced here only as a gate input.
- Chrome Web Store submission engineering and the Solo-tier `llms.txt` fix — separate, already-scoped items in the source review (§5.1, §5.6); not decided or re-scoped here.
- Testimonial/case-study collection process design — depends on §5.2 producing a customer first; premature to scope now.
- Evaluation or purchase of paid keyword/backlink tooling (Ahrefs/Moz) — a plausible future need, not decided in this document.
- Any modification to `validateContent`, the content registry, or page architecture — no product code is touched by this document.
- The bounded pilot in §4 — specified as a contingency only, not authorized by this document.

---

## 7. Handoff

- **To CEO:** decision needed on §3 (accept recommendation (a) + narrow parallel track, or explicitly override to §4's bounded pilot — override must be logged per §2's enforcement mechanism, not verbal).
- **To growth-strategist / founder:** §5.1 (Chrome Web Store submission) and §5.2 (founder outreach) remain the highest-leverage open items and are unaffected by this decision either way.
- **To analytics:** own the monthly §2 gate recheck and the `docs/meta/SEO_RE_ENTRY_GATE_STATUS.md` artifact; own the monthly AEO prompt panel per source review §4.3.
- **To engineering:** no work generated by this document.
