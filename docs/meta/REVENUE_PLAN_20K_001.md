# Revenue Plan 001 — Path to $20,000/month

**Date:** 2026-08-18
**Directive (CEO):** *"develop a plan for ledgerium.ai to make $20,000 per month via content, apps, and subscriptions."*
**Panel (6):** `product-manager` · `growth-strategist` · `market-research` · `analytics` · `qa-engineer` (team-workspace audit) · coordinator synthesis
**Sub-artifacts:** `docs/meta/REVENUE_PLAN_20K/{pm,growth,market,analytics,team_workspace_status}_analysis.md`
**Evidence base:** CEO-supplied Google Search Console export (3 months), full live-site crawl, and direct source verification. Every load-bearing claim below was checked in code or against live production, not inferred.

---

## 1. The verdict

**Ledgerium is not traffic-limited. It is monetization-limited.**

The instinct to fix revenue with more content is treating the one part of the system that is not broken. The content engine works — 164 well-built pages, indexed, matching the right queries, passing a real quality gate. It produces almost no revenue because of what sits *downstream* of it, not because there isn't enough of it.

**The single fact that determines everything:** the tiers that make $20k arithmetically reachable **cannot be purchased**.

| Path to $20k | Customers required | Purchasable today |
|---|---|---|
| All Starter @ $49 | **408** | ✅ yes |
| All Team @ $249 | **80** | ❌ waitlist |
| All Growth @ $799 | **25** | ❌ waitlist |
| Realistic mix (40/60/5) | **~105** | ❌ 57% on unsellable tiers |

`checkout/route.ts:30` returns HTTP 402 for any non-Starter plan. `pricing/page.tsx` routes Team and Growth to a `mailto:` waitlist.

---

## 2. Why the Team tier is unsellable (verified today)

This is not caution or a missing flag. Three prior multi-agent reviews closed 6 P0 + 7 P1, then 5 more P0, then found 8 more. **7 of those 8 are genuinely closed in code today** — the reviews were right and the fixes landed.

But all three missed something more fundamental, found in this audit and independently verified by me:

- **`Workflow` and `Portfolio` have no `teamId`.** There is no team ownership of content in the data model.
- **`WorkflowShare` is never consulted by any read path.** Sharing returns 200 OK; the recipient gets 404.
- **`effectivePlanFor()` — the workspace-aware plan lookup — is wired into 2 route files against 17 `.plan` reads across the API.** An invited teammate's quotas and every feature gate (`intelligenceLayer`, `sharedLibrary`, `agentComposition`) resolve to *their own solo plan*.

**Plainly: if you sold a $249 Team subscription today and invited five colleagues, each would get their existing Free-tier experience.** The core value proposition was never built at the data-access layer.

The waitlist was the honest call. Selling this would have been selling something that does not work.

**Estimate: 3–5 weeks of engineering** to make Team/Growth honestly sellable. Full ordered breakdown in `team_workspace_status.md` §6.

One false closure worth noting: P0-F ("Free user Create Team upgrade CTA") was marked closed because the backend returns the right error — but `teams/page.tsx handleCreate()` has no `else` branch to consume it, and that file has not been touched since 2026-04-15, *before* the TEAM build began.

---

## 3. What is actually blocking revenue, in dependency order

Note that **items 1–4 are monetization and measurement. None are acquisition.**

| # | Blocker | State | Effort | Owner |
|---|---|---|---|---|
| 1 | **Team/Growth not sellable** | Data layer incomplete | **3–5 weeks** | Engineering |
| 2 | **Stripe not operationalized** | All `STRIPE_*` default empty → checkout 503 | **~45 min** | CEO |
| 3 | **MRR measurement wrong** | ✅ **FIXED 2026-08-18** | done | — |
| 4 | **Attribution broken (2 independent breaks)** | `visitorId` in unindexed blob; `trackServer()` has no `visitorId` param at all | ~1 week | Engineering |
| 5 | **Chrome Store listing** | 7/8 blockers closed; screenshots in progress | days | Design |
| 6 | **Off-page authority** | Zero third-party citations | 6–12 months | CEO / outsourced |

**`DEMO_MODE_DISABLE_TEAMS` defaults to `'true'` in `deploy.yml`** — a flag whose own runbook says it is for the *demo environment* and should default unset. If the GitHub repo variable is not overriding it, team creation and invites are returning 404 in production right now. One line, worth checking first.

---

## 4. The traffic question, answered

Scaling the company's own prior 1,000-subscriber analysis down to 105 customers yields **~250–1,300 pricing-page views/month — roughly 40/day at the conservative end**.

That is a tenth of the traffic problem previously assumed. **You do not need a large audience. You need ~40 qualified visitors a day and a product they can buy.** Today they can buy the commodity tier.

For contrast, current organic: 1,979 impressions → **25 clicks in three months**, 22 of them to the homepage, average position 44.

---

## 5. The pricing problem

Three independent internal audits (April, May, June 2026) converge on the same finding, and this panel confirms it:

- **Starter ($49) ships zero intelligence-layer features.** The differentiated product — the thing no competitor has — only activates at Team+. The one tier you can sell is, in the words of those audits, *"an expensive Scribe."*
- **The $49 → $249 gap is 5.1×**, stranding solo power users with nowhere to go.

**Price cuts are not recommended** — you rejected them twice (2026-05-17, 2026-06-20) on sound elasticity grounds and nothing here changes that.

**Additive Solo/Pro tier at $79–99** with intelligence-layer access is the proposed fix: it closes the gap, monetizes the differentiator for individuals, and — critically — is sellable *without* the team data-layer work.

---

## 6. The decision

**Option A — Build Team properly.** 3–5 weeks. Then 80 customers instead of 408, selling the differentiated product to the ICP that has budget. This is the path that makes $20k genuinely reachable.

**Option B — Monetize what is sellable now.** Ship the Solo/Pro tier at $79–99 with intelligence-layer access. Smaller, faster, no team data-layer dependency. $20k at $89 ≈ 225 customers — still hard, but it monetizes the moat instead of the commodity.

**These are not exclusive, and the recommended sequence is B-then-A**: B unblocks revenue in weeks and starts generating the conversion data that A's business case depends on, while A is built.

---

## 7. Sequenced plan with stage gates

Each gate is checkable. No gate is "we feel good about it."

**Phase 0 — Make revenue possible (this week)**
- Operationalize Stripe (runbook exists, ~45 min, CEO). **Gate: a real test-mode subscription completes end-to-end.**
- Check `DEMO_MODE_DISABLE_TEAMS` repo variable. **Gate: team endpoints return non-404 in production.**
- Finish Chrome Store screenshots and submit. **Gate: listing live.**

**Phase 1 — Monetize the moat (weeks 2–4)**
- Ship Solo/Pro tier at $79–99 with intelligence-layer access.
- Fix the attribution join (both breaks). **Gate: a signup can be traced to its acquisition source.**
- **Gate: first paying customer.** This is the single most important milestone in this document — everything before it is theory.

**Phase 2 — Build the tier that scales (weeks 3–8, parallel)**
- Team data layer: `teamId` on `Workflow`/`Portfolio`, `WorkflowShare` read paths, `effectivePlanFor()` across all 17 gating sites.
- **Gate: invite a colleague to a paid workspace and they actually receive the paid capability.** Verified end-to-end, not unit-tested.
- Remove the waitlist. **Gate: Team purchasable self-serve.**

**Phase 3 — Acquisition (month 2 onward, continuous)**
- Third-party roundup placement — the named targets in `growth_analysis.md`. **Gate: ≥8–10 referring domains by day 90, from ~0 today.**
- Founder-led outbound into financial services (the #1 ICP vertical, which still has no landing page while deprioritized verticals shipped).
- **Gate: 40 qualified pricing-page views/day.**

---

## 8. What to stop

- **Publishing SEO pages.** 136 pages since June produced 27× impressions and zero clicks at position 44. More pages produce more position-44 impressions.
- **The 5,625-page ambition.** Demand and architecture analysis independently converge on **~750** as the real ceiling.
- **CTR/title optimization at position 44–95.** You cannot CTR-optimize out of page five. This was already attempted in July and is why impressions rose while clicks fell to zero.
- **Paid acquisition**, until the funnel has a bottom and a sellable tier.

---

## 9. Honest timeline

**12 months to $20k MRR**, on the assumption that Phase 0–2 complete and acquisition compounds. **6 months is not supportable** from the evidence — there is no acquisition rate anywhere in the data to build a ramp from.

The risk is not technical. It is that this plan goes the way of `FUNNEL_AND_SOP_REVIEW_001.md`, which reached correct conclusions on 2026-07-19, proposed an 8-step remediation, and had **none of it executed 3.5 weeks later**. That review is why the SEO program kept scaling past its own health gate.

**The difference between a 12-month path and an indefinite one is whether Phase 0 happens this week.** It is ~45 minutes of dashboard work, one repo variable, and a set of screenshots.

---

## 10. Evidence status

| Claim | Status |
|---|---|
| GSC: 25 clicks / 1,979 impressions / position 44 | **VERIFIED** — CEO export |
| Team/Growth return HTTP 402; waitlist routing | **VERIFIED** — source + live |
| `Workflow`/`Portfolio` have no `teamId` | **VERIFIED** — schema |
| `effectivePlanFor` in 2 files vs 17 `.plan` reads | **VERIFIED** — grep |
| 7 of 8 systems-test P0s closed | **VERIFIED** — audit vs source |
| `DEMO_MODE_DISABLE_TEAMS` defaults true | **VERIFIED** — deploy.yml:141 |
| Stripe env vars default empty → 503 | **VERIFIED** — compose.hostinger.yaml |
| ~40 pricing-page views/day needed | **MODELLED** — from prior internal analysis, assumptions stated in `market_analysis.md` |
| Competitor pricing table | **PARTIALLY VERIFIED** — per-row confidence tags; verify before external use |
| 3–5 week Team estimate | **REASONED** — from ordered work breakdown, not measured |

**No revenue figures are projected in this document.** There is no MRR, no conversion rate and no customer count to project from. Every number above is either a requirement, a measurement, or an explicitly labelled model.
