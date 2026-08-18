# Revenue Plan — $20k MRR — Growth Track: Acquisition & Conversion

**Author:** growth-strategist
**Type:** Read-only analysis. Zero product code changed.
**Date:** 2026-08-18
**Track:** How customers actually arrive and convert.
**Grounding:** `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW_001.md` + panel artifacts in `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/` (analytics, competitive, market, growth, pm, qa, architect); `apps/web-app/src/lib/plans.ts`; `apps/web-app/src/lib/config.ts` (`PRICING_CONFIG`, `EXTENSION_CONFIG`); `docs/meta/CHROME_STORE_REVIEW_002.md`; `docs/runbooks/CHROME_STORE_SUBMISSION.md`.

**A note on what changed since the SEO/AEO review was written (2026-08-13):** that review's growth track found Team and Growth routed to a waitlist with no self-serve checkout. Reading `apps/web-app/src/lib/plans.ts` and `config.ts` today shows `PRICING_CONFIG` now carries a `stripePriceId` for Starter, Team, and Growth, and CTA copy reads "Start Team Trial — Full intelligence included" / "Start Trial — Automation scoring + AI tools" — i.e., self-serve trial checkout for all three paid tiers appears to be code-complete. I could not verify from a read-only pass whether Stripe is fully operational in production (real price IDs set as env vars, webhooks live, a card-to-cash test actually completed). **This is the single highest-priority verification item in this whole plan** — every dollar of the $20k target routes through it, and prior project history elsewhere in this repo notes Stripe work has previously been "code-complete" while remaining "operational deps on CEO action." Treat as unverified-but-promising, not as fact, until confirmed with a real test transaction.

---

## 0. The math, stated plainly

$20,000 MRR at the CEO's own illustrative mix (40 Starter × $49 + 60 Team × $249 + 5 Growth × $799) = $1,960 + $14,940 + $3,995 = **$20,895/mo**, ≈105 customers.

Two things follow directly from this mix that shape everything below:

1. **57% of the customer count (60 of 105) has to be Team, not Starter.** Team is a $249/mo, 5-seat, "full intelligence layer" purchase — a materially harder sell than a $49 solo tool. A mix that were instead 80 Starter / 20 Team / 5 Growth would need roughly 160+ customers at a lower average deal size and a much easier individual sale. The CEO's stated mix is Team-heavy on purpose or by default — either way, **the conversion-path fix in §3 is not optional polish, it is load-bearing for the revenue target as stated.**
2. **Zero of these 105 customers can plausibly come from organic search in the current window.** Position ~44, 25 clicks in 3 months, 22 of them to the homepage on brand queries, zero third-party citations. Organic is a 12-month rebuild, not a Q3 channel. Every dollar of the $20k target has to come from somewhere else first.

---

## 1. Acquisition channels, ranked by realistic yield at this stage

Ranked by "will this plausibly produce a paying customer in 90 days," not by long-run potential.

### 1. Founder-led outbound and direct selling into the ICP — highest near-term yield, zero cash cost, bounded by founder hours

This is the channel most young B2B SaaS companies underuse because it doesn't scale and doesn't feel like "growth." At 105-customers-needed, it doesn't need to scale — it needs to produce the first 10-20 customers while the compounding channels (§2, §4) build.

Concretely: `docs/ICP_DEFINITION.md` and `docs/MARKET_RESEARCH.md` (both already in the repo and already ranked) name Operations Manager / Process Lead / Sr. Analyst at 50-5,000-employee companies in financial services (#1 priority), healthcare admin / professional services (#2, tied), and SaaS operations (#3) as the ICP. That is a targetable list, not a demographic. The move is:

- Build a list of ~150-200 named people at named companies matching that profile (LinkedIn Sales Navigator or manual, ops/process-lead titles at mid-market financial-services, healthcare-admin, and professional-services firms).
- Personalized outreach with a specific, concrete offer — not "check out our tool" but *"record one of your team's real workflows live on a 15-minute call, and I'll show you the SOP, process map, and where the time actually goes."* This directly demonstrates the deterministic-capture differentiator (no screenshots, evidence-linked, computed not guessed) in the room, which is the one thing Ledgerium can say that no competitor in the third-party roundups can.
- Because the pitch is a live demo of a real feature (not a mockup), this doubles as qualification: only people who show up for a 15-minute call are worth pursuing, and the call itself is the product tour.
- This channel can target Team-tier buyers directly — a founder selling into a 5-50-person ops team can pitch the shared workspace and intelligence layer from the first conversation, rather than hoping a self-serve Free signup organically discovers it (see §3 — today, nothing in the self-serve product experience does that discovery work).

**Owner: CEO.** This is relationship and calendar work, not code.

### 2. Third-party roundup / listicle placement — dual-purpose: acquisition channel AND the fix for domain authority

People actively comparing SOP/process-documentation tools read "best Scribe alternatives" / "best Tango alternatives" lists (Waybook, Glitter AI, TheDigitalProjectManager, trycapture.ai currently carry every competitor but Ledgerium). Placement here is simultaneously a direct acquisition channel (readers click through to evaluate) and the single highest-leverage lever on organic position, because 90-95% of AI-citation and ranking authority is reported to come from third-party domains, not first-party pages. Full plan in §2 below — it belongs in both sections because it does both jobs.

### 3. Chrome Web Store search, once listed — a self-contained discovery channel independent of Google's ranking of ledgerium.ai

This is not "fixing the funnel," it is a distinct acquisition surface. See §4 for why it behaves as a growth loop, not just a distribution fix.

### 4. Niche communities and newsletters where ops/compliance people actually spend time

Not generic "content marketing" — specific, small, high-relevance venues: ops-focused LinkedIn groups, compliance/audit professional communities (the ICP's #1 vertical, financial services, has real regulatory bodies and communities — audit, SOC 2, DORA-adjacent compliance circles), fractional-COO and ops-consultant Slack/Discord communities, and 1-2 niche ops-focused newsletters with a sponsorship or guest-content slot. This is slow and founder-time-heavy, but it is close to zero cash cost, and — done as genuine participation (answering real questions, not dropping links) — it produces the same kind of earned trust that §2's roundup placements produce, at community scale rather than publication scale.

**Owner: CEO**, with a possible outsourced newsletter-sponsorship placement (a few hundred to low-thousands of dollars, one-time).

### 5. Partnerships with compliance / ops-consulting firms — slower to build, but matches deal size to Team/Growth tier

Fractional-COO shops, SOC 2 / audit-readiness consultants, and BPO/outsourcing-transition consultancies already have warm relationships with exactly the ICP, and the audit-evidence / regulatory-evidence framing (DORA, SOC 2 process-adherence evidence) is independently identified in the market research as the highest-willingness-to-pay signal on record — and it currently has no dedicated page or sales motion pointed at it. A handful of these firms recommending Ledgerium to clients mid-engagement could produce Team/Growth-tier deals directly, at a deal size the outbound motion in §1 also targets. Slower than outbound because it requires relationship-building before the first referral, but each partner can produce multiple customers, unlike one-to-one outbound.

**Owner: CEO** (early-stage partnership conversations are a founder job).

### 6. Paid acquisition — explicitly deprioritized until the funnel bottom is fixed

LinkedIn ads targeting ops titles, or Chrome-extension-install ad placements, are real options, but paying to send a click into an 18-step Developer-mode sideload and a quota-only upgrade trigger that biases toward the $49 tier (see §3) wastes cash on a broken conversion path. Sequence this after §3 and §4 ship, not before, and only if the earlier channels prove the message converts.

---

## 2. The off-page authority problem — a concrete, executable plan

**Root cause, restated:** Ledgerium appears in zero of the third-party "best-of" roundups that every competitor — including small ones (Glitter AI, Dubble, Supademo, Guidejar) — appears in repeatedly. No press, no analyst coverage, no earned mentions. This is reported (independently, by the review's competitive-research pass) to be the dominant factor in both traditional ranking and AI-answer citation. It is why position 44 exists and why CTR-title-rewrite work on those pages produced zero effect. It has been identified as the highest-leverage fix in three separate review passes now, and none of it has been executed.

**Named target sites (start here, ~10-15 total):**
- Waybook, Glitter AI, TheDigitalProjectManager, trycapture.ai, Guidejar's own comparison content — all confirmed to already rank for and cover this exact query space, all confirmed to currently exclude Ledgerium.
- G2, Capterra, Product Hunt, SaaSHub, AlternativeTo, Slant — general software-directory presence, free to claim, currently absent.
- 2-3 SOC 2 / audit-readiness-focused publications or directories, given the compliance-evidence wedge is the highest-WTP signal in the market research.

**The outreach asset — what makes an editor want to include Ledgerium, not just be asked to:**

1. **The differentiation hook, stated once, precisely:** every tool in these roundups is a screenshot-based capture tool. Ledgerium is the one that computes process metrics deterministically from structured interaction data — the same workflow recorded twice produces the same numbers, diffable and reproducible, traceable to the source event. That is a genuinely different mechanism, not a marketing adjective, and it is editorially interesting for a roundup author precisely because none of their other entries can make the claim. Lead outreach with this sentence, not with a generic "please consider adding us."
2. **A free, no-strings account for hands-on review** — the fastest way to get a roundup author to write an accurate, favorable entry is to let them use the product for five minutes, not to describe it to them. Offer a Team-tier trial explicitly for review purposes.
3. **An original data asset as a leave-behind / citable artifact.** Original, proprietary data is independently identified as the strongest single lever for both traditional citation and AI-citation. A short, honest report — something like "The State of SOP Documentation 2026," built from real, anonymized, aggregate statistics the product already computes (cycle-time variance across recorded workflows, time-to-first-SOP, common bottleneck categories) — gives roundup authors, journalists, and AI-answer engines something concrete and quotable that isn't available anywhere else. This is the one piece of net-new content worth producing in this 90-day window, and it should be built from real product telemetry, not invented.

**Outreach mechanics (this is not engineering work):**
- Identify the actual author or editor of each target roundup (usually named on the page or discoverable via the publication's About page).
- Personalized email or LinkedIn message per target — hook (1), offer (2), leave-behind (3). No mail-merge blast.
- Track responses in a simple spreadsheet; follow up once after ~7 days of silence.
- In parallel: claim and complete the G2 and Capterra listings (free), and seed 3-5 genuine reviews from real early users or the founder's outbound-call contacts once they've used the product. A live Product Hunt launch is worth scheduling once the Chrome Web Store listing is live (§4) so the launch has a real install path to point to.

**Owner: CEO**, with the outreach volume optionally handed to a freelance link-building/PR contractor for the systematic send-and-follow-up cadence (roughly one-time $1-3k range, or a few hours/week of contractor time) — the strategy and the differentiation hook should stay founder-authored, the mechanical outreach volume does not need to.

**The KPI this plan has been missing:** referring domains from relevant third-party sources. Currently effectively zero. Target: **≥8-10 quality referring domains by day 90.** This is the single number that, per the SEO review's own re-entry criteria, has to move before resuming any further on-domain SEO page production makes sense.

---

## 3. Conversion path: Free → paid, and whether packaging pushes the right tier

**The quota ladder is Free 5/mo → Starter 15/mo → Team unlimited.** The feature ladder is a *different* cliff: Starter adds clean exports, health scores, and a personal workspace; **the intelligence layer — bottleneck analysis, automation scoring, variant detection, shared team workspace — is entirely behind Team.** These are two independent upgrade triggers, and today only one of them is instrumented.

**What's live today (per prior shipped work referenced in this repo's history):** a usage-quota meter that nudges at 80% of the monthly cap and hard-blocks at 100%, with an upgrade link. This is a **scarcity trigger** — "you're running out of recordings" — and its natural resolution is the adjacent, cheaper tier: Starter. A solo Free user who hits the wall goes to Starter because it's the next rung on the same ladder they're already standing on.

**Nothing in the self-serve product experience currently triggers on a value signal that specifically points at Team.** The intelligence-layer capabilities (bottleneck detection, automation scoring, variant/rework detection, cross-run variation analysis) only become meaningful once a user has *multiple* recorded workflows to compare — which is a usage-pattern event, not a quota event, and a Free or Starter user can absolutely reach it (5/mo is enough to record the same process twice, or three related processes, well within the Free tier). That is exactly the moment a user would benefit from seeing "here's where your process breaks down" — and today, they can't see it, and nothing tells them it exists.

**Is the packaging wrong, or is the trigger wrong?** The packaging itself is defensible: Team ($249, 5 seats, full intelligence) is a real step-up in both capability and price that should feel earned, not given away at $49. The problem is that **the only in-product signal pointing a user toward an upgrade is the one that resolves at Starter, not the one that resolves at Team** — and the CEO's own target mix needs 60 of 105 customers to be Team. Left as-is, the funnel will structurally over-produce Starter upgrades and under-produce Team upgrades relative to what the revenue target requires.

**Recommendation — add a value-gated trigger alongside the existing quota-gated one:** once a Free or Starter user has ≥2-3 recorded workflows, show a locked/blurred preview of what the intelligence layer would tell them (e.g., a blurred bottleneck score, a "3 of your workflows share overlapping steps — see where they diverge" teaser) with an explicit "Upgrade to Team to unlock" CTA. This is a standard, proven pattern (locked-chart previews in BI/analytics tools) and it targets the $249 tier using a usage-pattern signal instead of a scarcity signal — which is the actual moment the product has something genuinely new to say to that user. This is a scoped, well-bounded engineering task (new conditional UI state on an existing dashboard surface plus the corresponding upgrade CTA/analytics event), not a repricing or repackaging exercise.

**One thing that is already right:** the Team card on the pricing page is visually highlighted and its CTA reads "Start Team Trial — Full intelligence included," and Growth's CTA leads with "Automation scoring + AI tools" — the pricing page itself already nudges toward Team. The gap is entirely inside the product, post-signup, where the only nudge that fires is the quota one.

**Second open item, higher priority than the trigger fix:** confirm Stripe checkout actually completes a real transaction end-to-end for Team and Growth in production before relying on either channel above to produce revenue. The pricing config is code-ready; whether it is operationally live has to be verified with an actual test charge, not assumed from reading the source.

---

## 4. The Chrome Web Store as a growth loop, not a distribution fix

Publishing to the Store closes the sideload gap, but that undersells it. Once live, the Store becomes a **second, independent acquisition channel with three properties the website cannot replicate at Ledgerium's current stage:**

1. **Search discovery inside a trusted directory, with zero domain-authority penalty.** The Chrome Web Store has its own internal search ("workflow recorder," "SOP generator," "process documentation") that is a completely separate ranking surface from Google — Ledgerium is not competing against position-44-on-ledgerium.ai here, it is a fresh entry in a directory where a small, well-tagged listing can be found by exactly the people already searching for this category of tool.
2. **Trust signals visible at the moment of decision.** Install counts and star ratings are third-party social proof exactly analogous to the roundup-listicle authority problem in §2 — except they render directly at the point where a user is deciding whether to install, which is the highest-intent moment in the entire funnel. This is the missing ingredient in the current sideload flow, where the only reassurance offered is copy explaining that Chrome's own security warning is safe to dismiss.
3. **Reviews compound back into both channels above.** Store reviews are themselves indexed content that can surface in Google results and are exactly the kind of independent, third-party mention that both traditional ranking algorithms and AI-answer engines weight heavily. A handful of genuine 5-star reviews from early Team users does double duty: it improves Store conversion, and it is free earned-media content that the §2 outreach can point to.

**The install-to-signup loop also gets structurally shorter.** Today: SEO/outbound content → `/signup` (web, account first) → `/install` (sideload) → record. Once listed, a chunk of demand can enter the other way: Chrome Store search → install directly → the extension itself becomes the first touchpoint, with account creation deferred to first export/upload rather than gating the install. That is a fundamentally different, more native activation path for anyone who discovers Ledgerium by browsing the Store category rather than arriving from a link — and it is demand this funnel currently cannot capture in any form, because there is no listing to be found by.

**Status:** per `docs/runbooks/CHROME_STORE_SUBMISSION.md`, 7 of 8 pre-submission blockers are closed; the remaining item is Store screenshots (5 images, 1280×800). This is a design/asset task, not an engineering task — cheap and fast to close (founder-produced with a screen-capture tool plus light editing, or outsourced for well under $200). Separately, `docs/meta/CHROME_STORE_REVIEW_002.md` (a deeper reviewer-posture audit) recommends a code cleanup pass (removing tangential capability surfaces — viewer app, HTML report builder, telemetry, sidebar map — and two manifest/permission fixes) to raise first-pass-approval probability from an estimated ~25-35% to ~85-92% and cut expected review time from 14-28 days to 3-7 days. **Verify whether that cleanup has shipped before submitting** — submitting without it risks a multi-week round-trip that directly delays every benefit described above.

---

## 5. What to stop

- **Stop authoring further SEO pages.** This is not a pace adjustment, it is a full stop until the re-entry criteria (average position <20 for target clusters, referring domains >0, at least one non-brand query recording clicks) are met. Three independent review passes now agree: content quality was never the constraint, and 164 pages of evidence confirm more pages at position 44 produce marginal impressions and zero clicks. This is a treadmill, not an investment.
- **Stop the 5,625-page ambition entirely**, not just pause it. The market research underlying the content engine itself reasons a defensible ceiling closer to 650-750 pages against real query demand — the larger figure was a content-engine capacity number, not a demand model. Continuing toward it does not lower CAC; it produces more unindexed or unread pages.
- **Stop treating the quota meter as the whole upgrade strategy.** As built, it systematically produces Starter upgrades and is silent on the value trigger that would produce Team upgrades — the tier the revenue math actually needs 60 of 105 customers from.
- **Stop CTR/title-level SEO micro-optimization on existing pages.** This was tried (title rewrites for "page 2" pages that were, in fact, position 70-95) and produced a 27× rise in impressions and a fall to zero clicks. CTR tuning does not work at position 44-95; it only works once ranking position improves, which is an off-page problem, not an on-page one.
- **Stop treating AEO structured-data investment as sufficient on its own.** The technical layer (Speakable, DefinedTerm, llms.txt, referrer classification) is genuinely ahead of most builds and worth preserving, but it is a necessary-not-sufficient condition — without third-party citations feeding the same authority signal, additional schema work has diminishing returns.
- **Hold paid acquisition spend** until the Web Store listing is live and the Team-tier value trigger ships — paying for clicks into a sideload wall and a Starter-biased upgrade path is spend without a return path today.

---

## 6. Sequenced 90-day plan

All milestones are checkable (yes/no or a count), not vibes. Owners: **CEO** (founder time — outreach, selling, listing submission, partnership conversations), **Engineering** (scoped product changes), **Outsourced** (clearly bounded, cheap, non-founder tasks).

### Weeks 1-2 (Days 1-14) — Unblock the funnel bottom
- **CEO/Outsourced:** produce the 5 Chrome Web Store screenshots (1280×800). *Milestone: screenshots ready.*
- **Engineering:** confirm whether the CHROME_STORE_REVIEW_002 cleanup pass (remove viewer app, HTML report builder, telemetry, sidebar map; two manifest fixes) has shipped; if not, ship it before submission. *Milestone: extension build passes the real-extension validation gate with the cleaned-up surface.*
- **CEO:** submit to the Chrome Web Store. *Milestone: submission filed.*
- **CEO:** build the first outbound target list (150-200 named ICP contacts) and send the first wave. *Milestone: 50 people contacted.*
- **CEO/Engineering:** verify Stripe checkout completes a real, end-to-end test transaction for Team and Growth in production. *Milestone: one real test charge succeeds on each paid tier.*

### Weeks 2-4 (Days 8-28) — Off-page authority sprint begins; conversion fix starts
- **CEO:** identify the 10-15 named target roundup/directory sites; draft the differentiation-hook outreach message and the free-review-access offer. *Milestone: outreach list finalized, first 5 sends out.*
- **CEO/Outsourced:** claim and complete G2 and Capterra listings. *Milestone: both listings live.*
- **Engineering:** build the value-gated Team-tier upsell surface (locked/blurred intelligence-layer preview once a user has ≥2-3 recorded workflows, with an "Upgrade to Team" CTA and a corresponding analytics event). *Milestone: shipped and instrumented.*
- **CEO:** continue outbound; target first 5-10 discovery/demo calls booked. *Milestone: 5 calls held.*

### Weeks 4-6 (Days 22-42) — Store live; outreach compounds
- **CEO:** expect Chrome Web Store review to resolve in this window (3-7 days at the reviewed-and-cleaned-up state; longer if not). *Milestone: listing approved and live, searchable in the Store.*
- **CEO:** finish first full round of roundup outreach (all 10-15 targets contacted, follow-ups sent). *Milestone: at least 1 roundup mention published or explicitly confirmed in progress.*
- **CEO:** schedule a Product Hunt launch now that there is a real install path to point to. *Milestone: launch date set.*
- **CEO:** first paying customers from outbound. *Milestone: first 3-5 paying customers closed.*

### Weeks 6-9 (Days 36-63) — Communities and partnerships
- **CEO:** identify and begin genuine participation in 3-5 relevant ops/compliance communities; place one newsletter sponsorship or guest slot if budget allows. *Milestone: active in 3 communities; 1 newsletter placement live.*
- **CEO:** open partnership conversations with 5-10 compliance/ops-consulting firms. *Milestone: 2+ conversations progressed to a pilot discussion.*
- **CEO/Outsourced:** build the original-data leave-behind asset (aggregate, anonymized product statistics — cycle-time variance, time-to-first-SOP, common bottleneck categories) to support ongoing outreach and the Product Hunt launch. *Milestone: asset published, used in at least 3 outreach sends.*

### Weeks 9-13 (Days 57-90) — Compound and check in
- **CEO:** Product Hunt launch executes. *Milestone: launch day complete, signups/installs tracked.*
- **CEO:** referring-domains count checked against the target. *Milestone: ≥8-10 quality referring domains, up from ~0.*
- **CEO:** revenue checkpoint against the $20k/105-customer target, broken out by channel (outbound, Store, roundup-referred, community/partnership). *Milestone: MRR and customer count reported by source, so the channel mix can be re-weighted for the next 90 days based on what actually converted — not on this plan's ranking, which is a starting hypothesis, not a guarantee.*

**Explicitly not a forecast:** this plan does not assert a specific number of customers or MRR dollars by day 90. The $20k/105-customer figure is the CEO's own target, stated at the start of this document as a given, not derived here. Everything in this 90-day sequence is designed to produce the first real, channel-attributed data on which of these levers actually converts — that data, not this plan, should drive the next 90-day allocation.

---

## Appendix — Sources

- `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW_001.md` (consolidated verdict, GSC data, technical defects)
- `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/growth_analysis.md` (conversion-architecture findings; note the Team/Growth waitlist finding there is superseded — see the note at the top of this document)
- `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/competitive_analysis.md` (third-party citation research, brand-collision finding, competitor posture)
- `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/market_analysis.md` (ICP/vertical ranking, page-count ceiling reasoning)
- `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/pm_analysis.md` (gate-violation history, activation-path bottleneck)
- `apps/web-app/src/lib/plans.ts`, `apps/web-app/src/lib/config.ts` (current pricing/feature/Stripe configuration, verified by direct read)
- `docs/meta/CHROME_STORE_REVIEW_002.md`, `docs/runbooks/CHROME_STORE_SUBMISSION.md` (Chrome Web Store blocker status, verified by direct read: 7 of 8 closed, screenshots remain)

**No traffic, conversion-rate, or revenue figures in this document are measured or fabricated as fact.** Every number used above (the $20,895 mix math, the 105-customer count, the 60-Team/40-Starter/5-Growth split, the 8-10 referring-domains target, the weekly outreach counts in §6) is either the CEO's own stated target, simple arithmetic on that target, or an explicitly-labeled planning target this document is proposing — not a measured outcome or a traffic/conversion-rate prediction.
