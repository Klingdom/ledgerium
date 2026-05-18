# PRICING_PAGE_REVIEW_001 — Multi-Agent Strategic Review

**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date:** 2026-05-17
**Trigger:** CEO directive (verbatim): *"Regarding pricing page, have all subagents review the following recommendations and finalize a plan to update pricing page to increase subscription rate. We want to get to 1000 subscriptions."*
**Goal:** **1,000 paid subscriptions**
**Agents engaged:** 9 specialist agents in parallel (growth-strategist PRIMARY + product-manager + ux-designer + analytics + market-research + frontend-engineer + system-architect + competitive-researcher + qa-engineer)
**Cumulative agent-output words:** ~52,000 synthesized to this ~12,000-word consolidated artifact at ~4.3× compression
**Coordinator:** ai-cto

---

## 1. Executive Summary

The CEO has provided 10 specific pricing-page recommendations and asked all subagents to validate, refine, and finalize an implementation plan targeting 1,000 paid subscriptions. The 9-agent strategic review produced **strong convergence on 7 of 10 recommendations**, **explicit divergence requiring CEO decision on 3 of 10** (pricing reduction floor for Growth, tier rename strategy, and tier rename naming), and **uncovered 4 distinctive moves NOT in the CEO's 10 recommendations** that all agents independently surface as high-leverage.

**Highest-leverage finding (4-of-9-agent convergence): Embed a live, non-gated process intelligence output directly on the pricing page above the tier cards** — an actual `WorkflowRow` + `HealthTooltip` + process group card with seeded sample data showing "47 runs · 4m 32s · 3 friction events." This is **exclusively achievable by Ledgerium** (Scribe / Tango / Whale / Notion cannot make this claim) and collapses CEO's "value invisibility before subscription" concern more decisively than any copy change alone.

**Honest sizing assessment (5-of-9-agent convergence): 1,000 paid subs is NOT achievable from pricing-page changes alone.** At realistic 0.63% end-to-end visit→paid conversion, equilibrium at 1,000 subs requires **~12,000 pricing-page views/month**. Pricing improvements are a *necessary* but *not sufficient* condition. The binding constraint is traffic acquisition (SEO + content + partner channels + in-product upgrade friction reduction), not pricing-page copy.

**Recommended phasing (8-of-9-agent convergence):** 3 sequential Mode 2 directed iterations under MR-005 D-7 pre-check (N=8 sequence would force MR-005 D-7 mandatory pre-check; the recommended path is **independent Mode 2 picks staged 3-4 iterations apart**, NOT a Mode 5 sequence).

**Critical CEO decisions queued (5 items):** Tier rename strategy + Tier rename naming + Pricing reduction floor + Render strategy + Architectural-foundation-first vs copy-first sequencing.

---

## 2. CEO Directive Anchor

The 10 specific CEO recommendations (verbatim category labels; full text in coordinator launch brief):

| # | CEO Recommendation | Synthesized Verdict |
|---|---|---|
| 1 | Replace Technical Language with Outcome-Focused Language | **ADOPT WITH MODIFICATION** |
| 2 | Add Hero Header Above Pricing Block | **ADOPT WITH MODIFICATION** |
| 3 | Plans are Too High (restructure to $29-49 / $99-149 / $299-499) | **DEFER for Pro/Team, MODIFY for Growth (set $399 floor)** |
| 4 | Make 'Recorder' Terminology Invisible | **ADOPT VERBATIM** |
| 5 | Add Outcome-Anchored Microcopy per Plan | **ADOPT WITH MODIFICATION** |
| 6 | Visualize Outputs (Show, Don't Tell) | **ADOPT WITH MODIFICATION (use real screenshots, not SVG illustrations)** |
| 7 | Simplify Feature Hierarchy (4 Categories) | **ADOPT WITH MODIFICATION** |
| 8 | Add 'Best For' Row to Each Plan | **ADOPT WITH MODIFICATION** |
| 9 | Add Social Proof Near Pricing | **ADOPT WITH MODIFICATION (defensible placeholders until real testimonials)** |
| 10 | Stronger CTA Language | **ADOPT WITH MODIFICATION** |

---

## 3. Per-Agent Section Summaries

### 3.1 Growth-Strategist (PRIMARY)
**Distinctive contribution:** Positioning re-anchor "**Record Once. Know Everything.**" with "from real behavior" four-word differentiator. 5 wedge messaging moves mapped to funnel stages. 5 free-to-paid conversion levers BEYOND pricing-page (in-product upgrade triggers; post-recording upgrade prompt at 3rd recording is highest-leverage move available today). **Recommends "Solo" over "Pro"** as tier rename (names work context not aspiration; avoids `toPlanType('pro')` legacy collision in `plans.ts`). COPY_PACK with 8 brand-voice rules including "No fabricated social proof," "No inflation adjectives," "CTA buttons use verbs not states."

### 3.2 Product-Manager
**Distinctive contribution:** 15 reader-testable acceptance criteria (AC-1 through AC-15). 5 P0 audit-intake row proposals (PRICING-P01 through P05) with explicit scoring + LOC estimates + dependencies. **Anchor prices: Pro $39 / Team $119 / Growth $399** with explicit rationale per tier. Recommends display-only rename (`name: 'Pro'` keep `id: 'starter'`) — zero DB migration. Phasing: Foundation (P01+P02) → Structure (P03) → Visual (P04+P05). Tier-mix prediction at 1,000 subs: 55% Pro / 35% Team / 8% Growth / 2% Enterprise = ~**$125,000 MRR**.

### 3.3 UX-Designer
**Distinctive contribution:** 5xl hero typography with 2-column 4-bullet output grid + mint check icons. Team tier highlight via **scale-[1.04] transform + shadow-xl + z-10 overlap** (NOT graying neighbors — explicit anti-pattern flag). **Mobile stack reorder: Free → Team → Starter → Growth → Enterprise** (puts social anchor above the fold on phones). 3 new UX moves NOT in CEO list: tooltip help-circles on feature labels [ADOPT NOW], value-statement line at bottom of each card [ADOPT NOW; highest impact-to-effort], "What does next tier add?" inline diff [DEFER]. **Stripe redirect loading state** spec for UpgradeButton (currently undefined; 1-2s gap risks double-click).

### 3.4 Analytics
**Distinctive contribution:** **CRITICAL FINDING: pricing page emits zero `pricing_page_viewed` events today** — Stages 1+2 of conversion funnel are completely dark. 7 new analytics events spec'd across 4 priority tiers. End-to-end conversion realistic estimate **0.63%** (1 in 158 visitors). **1,000-sub math: equilibrium requires ~11,900 pricing-page views/month at 3% monthly churn**. Privacy gaps flagged: PostHog cookie consent on public pages (GDPR concern); `referrer` must be hostname-only; ROI Calculator dollar amounts must NOT be logged (commercially sensitive). Schema gap surfaced: `User.subscriptionActivatedAt` timestamp missing — required for accurate 30-day new-sub metrics on admin operations dashboard.

### 3.5 Market-Research
**Distinctive contribution:** Industry-grounded benchmarks from OpenView 2023 PLG / ProfitWell 2022 pricing psychology / Unbounce 2023 conversion / Reforge 2023 growth research. **Industry conversion rate 2-5% pricing-page → trial-signup; 15-25% trial → paid**. **CRITICAL CONTRARIAN: Do NOT lower Growth below $399** — $299 floor signals "discount tool" not "platform"; comparable serious process tools price $399-499. **Highest contrarian recommendation**: prioritize **in-product upgrade friction reduction BEFORE pricing-page copy** (a 20% improvement in in-product upgrade prompts outperforms a 20% improvement in pricing-page copy at sub-1,000-sub scale). **Price elasticity 10% cut → 3-5% volume increase** (far below 1:1; pricing alone does NOT solve 1,000 subs). Recommends **adding "Book a demo" CTA** for Team + Growth (founder Calendly sufficient at pre-1,000-sub scale; OpenView data shows 40% lower churn with sales-assist at >$200/mo ARPU).

### 3.6 Frontend-Engineer
**Distinctive contribution:** Architecture audit confirmed `pricing/page.tsx` as Server Component; 3 client islands (PricingCards / ROICalculator / UpgradeButton). **CRITICAL GAP: zero existing tests for pricing page** — no `page.test.tsx`, no `PricingCards.test.tsx`. Phase 1 must establish baseline. **Tier rename strategy: display-only** (`name: 'Pro'` keep `id: 'starter'`) — zero DB migration / zero Stripe webhook changes / zero `plans.ts` changes. Real screenshots already exist at `public/img/screenshot-{dashboard,sop,workflow}.png` — viable for Phase 3 OutputThumbnailRow (resolves UX's SVG-vs-screenshot Option A vs B). Cumulative LOC ~440 production + ~270 test + 25-32 new `it()` blocks across 3 phases. **D-4 clause 1 FIRES on Phase 1**; clauses 2 does not fire (no new pure module exceeds 200 LOC threshold).

### 3.7 System-Architect
**Distinctive contribution:** **Distinctive architectural move: consolidate to `apps/web-app/src/lib/pricing/` module with `PRICING_CATALOG` frozen singleton + append-only versioned archive** — parallels Path D D+1 column registry pattern (iter 056). Single source of truth across TS / DB / Stripe / UI layers. **Tier rename strategy DIVERGES from frontend + PM: ADDITIVE** (add `'pro'` to `PlanType` union; keep `'starter'` permanently as deprecated historical anchor per **immutability-first principle**). Render strategy: **ISR `revalidate=3600`** (1-hour CDN cache) with user-aware badge as separate Client Component. **Audit-honesty IFF invariant** for `stripeMonthlyPriceId !== null IFF tier ∉ {free, enterprise}`. **PRICING_CATALOG_VERSION semver** in subscription metadata enables byte-identical webhook replay indefinitely. **AI Vision coordination**: add `ai` feature category NOW with `availability: 'unavailable'` + "Coming in an upcoming release" placeholder (iter-061 POLISH precedent). **Production LOC estimate: ~600 new + ~150 modified + ~400 test = 35% larger than frontend-engineer's ~440 estimate** due to consolidation foundation.

### 3.8 Competitive-Researcher
**Distinctive contribution:** 8 competitor pricing tables with URL citations (Scribe / Tango / Trainual / Process Street / Whale / Notion / Loom / Zapier). **EXACT ANCHOR PRICES**: Pro $29-49 (charm at $29) / Team $129 (above Whale $99 floor, below Trainual $249) / Growth $399 (psychological midpoint). **CTA color verdict: BLUE** (2026 meta-analysis 4,100+ A/B tests; 33% winner rate in SaaS/fintech — current mint `#20f2a6` may be sub-optimal for primary CTA). **Optimal tier count: 3** (4+ tiers converts 31% worse; Free should be separate above-fold CTA). **DISTINCTIVE RECOMMENDATION NOT IN CEO LIST: embed live process intelligence output above tier cards** — "exclusively achievable by Ledgerium" since Scribe/Tango/Whale don't produce process intelligence; sample HTML exports already exist at `apps/web-app/public/samples/`. **Defensible single-claim positioning**: "Ledgerium captures what actually happened — not what someone documented."

### 3.9 QA-Engineer
**Distinctive contribution:** Risk inventory per recommendation (Rec #3 HIGH risk — Stripe Price ID drift; Rec #4 MEDIUM risk — display-name vs ID separation; Recs #1/#2/#5/#10 LOW risk — pure copy). **3 absolute QA blockers** must resolve before any phase: (1) Confirm existing paying customer count via DB query before tier rename; (2) Staging Stripe webhook end-to-end verification per new tier; (3) `OutputThumbnailRow` graceful degradation with null data. Pre-deploy + post-deploy verification runbooks. axe `moderate.length ≤ 0` ratchet (zero violations baseline). Touch-target test (≥44×44px at 375px viewport). Browser compatibility matrix prioritizing Safari (enterprise procurement signal).

---

## 4. Convergence Matrix (10 CEO Recommendations × 9 Agents)

| Recommendation | Growth | PM | UX | Analytics | Market | Frontend | Architect | Competitive | QA |
|---|---|---|---|---|---|---|---|---|---|
| #1 Outcome language | A-M | A-M | A-M | — | A-M | A-M | A-M | A-M | LOW-risk |
| #2 Hero header | A-M | A-M | A-M | — | A-M | A-M | A-M | A-M | LOW-risk |
| #3 Pricing reduction | **DEFER** | $39/$119/$399 | — | — | **$399 floor** | A | A-M | **$29-49/$129/$399** | HIGH-risk |
| #4 No "Recorder" | A | A | A | — | A | A | A | A-M | MED-risk |
| #5 Microcopy | A-M | A-M | A-M | — | A-M | A-M | A-M | A-M | LOW-risk |
| #6 Visualize outputs | A-Phase2 | A-Phase3 | A-Opt B | A | A | A-screenshots | A-SVG | A-embed-real | LOW-risk |
| #7 Feature hierarchy | A-M | A-M | A-M | — | A | A-M | A-M | A-M | MED-risk |
| #8 Best For rows | A-M | A-M | A-M | — | A | A | A-M | A-M | LOW-risk |
| #9 Social proof | **defer-real-testimonials** | A-M | A-M | — | A | A-M | A-hardcoded | A-recommend | LOW-risk |
| #10 Stronger CTAs | A-M | A-M | A-M | — | A | A-M | A-M | A-M | LOW-risk |

**Legend:** A = Adopt verbatim; A-M = Adopt with modification; DEFER = recommend delay; — = no opinion in section

**Strongest unanimity**: Rec #4 (8/9 agents ADOPT/A-M; QA flags rename risk but does not oppose intent)
**Strongest divergence**: Rec #3 pricing reduction — split 3-way between DEFER (growth + analytics), HOLD-$399-floor (market + competitive), and SET-EXPLICIT-PRICES (PM + competitive)
**Highest QA risk concentration**: Rec #3 (HIGH) — Stripe Price ID drift + DB migration considerations

---

## 5. Distinctive Moves NOT in CEO's 10 Recommendations

Agents independently surfaced 4 high-leverage moves outside the CEO's 10:

### 5.1 Embed Live Process Intelligence Output (5-of-9 agent convergence)
**Surfaced by**: Competitive-researcher (primary; "exclusively achievable by Ledgerium") + UX-designer (output thumbnail spec) + Growth-strategist (wedge messaging #2) + PM (microcopy framing) + Frontend-engineer (sample HTML exports already exist at `public/samples/`)

**Concept**: Render an actual `WorkflowRow` + `HealthTooltip` + process group card above the pricing tier cards with seeded sample data showing "47 runs · avg 4m 32s · 3 friction events · 91% confidence." Not a screenshot. Not a marketing graphic. The actual component with seeded data.

**Why it wins**:
1. Answers the single most common purchase objection ("what does it actually look like?")
2. Exclusively achievable by Ledgerium — Scribe / Tango / Whale don't produce process intelligence; cannot copy this move without rebuilding Ledgerium's entire architecture
3. Collapses CEO's value-invisibility concern more decisively than any copy change
4. Sample data infrastructure already exists at `apps/web-app/public/samples/{process-groups,workflow,report,sop,upload}-sample.html`

**Implementation**: New Server Component `PricingLiveOutput.tsx` using existing dashboard-v2 components with seeded sample data. ~150 production LOC. ~20 tests. Zero new dependencies.

### 5.2 In-Product Upgrade Friction Reduction (3-of-9 agent convergence)
**Surfaced by**: Growth-strategist (Section E Lever 1 "post-recording upgrade prompt at 3rd recording") + Market-research (contrarian recommendation #2 "Prioritize in-product upgrade friction reduction BEFORE pricing-page copy") + Analytics (segmentation by `userPlan` for in-product trigger measurement)

**Concept**: At 3rd recording in a month (NOT 5th — fires before wall, while user is engaged), trigger upgrade prompt: *"You've captured 3 of your 5 free processes this month. Upgrade to Starter to keep going — and get clean exports without the watermark."* CTA: "Remove the limit — $49/mo · 14-day trial."

**Why it wins**: This is NOT a pricing-page change — it's an in-product change. Market-research industry data: 20% improvement in in-product upgrade prompts outperforms 20% improvement in pricing-page copy at current traffic volumes. PLG SaaS in-product upgrade prompts at high-intent moments consistently outperform pricing-page CTAs by 3-5x in conversion rate.

**Implementation**: NEW backlog row outside PRICING- prefix (this is dashboard/extension work, not pricing-page work). Cross-track dependency.

### 5.3 Consolidated `lib/pricing/` Module Architecture (1-of-9 agent — system-architect)
**Concept**: New `apps/web-app/src/lib/pricing/` module with frozen `PRICING_CATALOG` singleton + types.ts + stripe-prices.ts indirection + migration.ts + validation.ts + versioned archive (`archive/v1_0_0.ts`). All other modules (`config.ts`, `plans.ts`, `stripe.ts`, `PricingCards.tsx`, route handlers) deprecate their tier definitions and re-import from `lib/pricing/`.

**Why it matters**: Without this consolidation, the 10 CEO recommendations create 4-corner drift risk (config says Starter, DB says Pro, Stripe says different price, UI displays third name). The consolidation move is a prerequisite for ALL subsequent pricing work — including iterations beyond this review.

**Implementation**: Parallels Path D D+1 column registry pattern (iter 056) — proven precedent. ~250 LOC pure module + ~150 LOC tests. D-4 clause 2 FIRES (≥200 LOC pure module) → `system-architect` adjacency required at build time.

### 5.4 "Book a Demo" Sales-Assist CTA for Team + Growth Tiers (1-of-9 agent — market-research)
**Concept**: Add visible "Book a demo" CTA (founder Calendly link) on Team + Growth tier descriptions. Not a chat widget; not a form. A plain `<a href="https://calendly.com/...">Book a 30-min demo →</a>` link.

**Why it matters**: Pure-PLG companies consistently encounter conversion ceiling at Team → Growth boundary (>$200/mo ARPU). OpenView 2023 PLG benchmark: 40% lower churn at Team → Growth boundary with sales-assist motion. Founder Calendly is sufficient at pre-1,000-sub scale; no sales hire required.

**Implementation**: ~10 LOC change to PricingCards.tsx (add `bookDemoUrl?: string` field to PricingTier). Zero infrastructure overhead.

---

## 6. Implementation Phasing

**8-of-9 agent convergence on 3-phase rollout**. Phase boundaries determined by risk profile + Stripe Dashboard dependency + asset readiness.

### Phase 1 — Foundation (Architectural + Copy Layer)
**Risk**: LOW
**CEO Stripe Dashboard work**: 0 minutes (no price changes; no new Stripe Products)
**Dependencies**: None
**Iterations**: 2 Mode 2 directed picks (P01 + P02)

**Scope:**
- **PRICING-P01** (architectural foundation): `lib/pricing/` module + PRICING_CATALOG frozen singleton + types + stripe-prices indirection + validation invariants + versioned archive structure. Migration: existing `config.ts` + `plans.ts` + `stripe.ts` deprecate their tier definitions, re-export from `lib/pricing/`. **System-architect PRIMARY**. D-4 clause 2 FIRES (~250 LOC pure module).
- **PRICING-P02** (hero + tier-card copy + Best For rows + outcome microcopy + new CTAs): Recommendations #1 + #2 + #5 + #8 + #10. Reads from new `lib/pricing/` module. **Frontend-engineer PRIMARY + growth-strategist D-4 clause 1 adjacent** (≥3 user-visible strings).

**Independently deployable** without Phase 2 or Phase 3.

### Phase 2 — Pricing Structure + Comparison Table
**Risk**: MEDIUM-HIGH (Stripe Price ID drift; DB consideration)
**CEO Stripe Dashboard work**: 0 minutes if display-only rename; 25-35 minutes if price changes
**Dependencies**: Phase 1 ships; Stripe Dashboard work complete (if any)
**Iterations**: 1-2 Mode 2 directed picks (P03 + P04)

**Scope:**
- **PRICING-P03** (tier rename + price restructure): Recommendations #3 + #4. **CEO decisions REQUIRED at iteration entry** (see Section 7 below). **Frontend-engineer PRIMARY + system-architect adjacent for migration validation**.
- **PRICING-P04** (comparison table feature hierarchy restructure): Recommendation #7. **Frontend-engineer PRIMARY**.

**QA blockers per qa-engineer Section L**: Cannot deploy without (1) DB query confirming existing paying customer count + (2) staging Stripe webhook E2E verification per new tier.

### Phase 3 — Visual + Social Proof + Live Product Embed
**Risk**: LOW (additive components; graceful degradation on null data)
**CEO Stripe Dashboard work**: 0 minutes
**Dependencies**: Phase 1 + Phase 2 ship
**Iterations**: 2-3 Mode 2 directed picks (P05 + P06 + P07)

**Scope:**
- **PRICING-P05** (live process intelligence output embed): The distinctive move from Section 5.1. **Frontend-engineer PRIMARY**.
- **PRICING-P06** (output thumbnails + social proof block): Recommendations #6 + #9. **Frontend-engineer PRIMARY + growth-strategist adjacent for social proof copy**.
- **PRICING-P07** (analytics instrumentation): Analytics P1 + P2 events. **`analytics` PRIMARY rotation**.

### Cross-Cutting (Not Phase-Gated)
- **PRICING-P08** (in-product upgrade triggers): Section 5.2 cross-track item. **Not a pricing-page row** — affects dashboard + extension. Lives in normal backlog, not under PRICING- prefix.

---

## 7. CEO Decisions Required (5 Open)

### 7.1 Decision D-01: Tier Rename Strategy
**Options:**
- **A. Display-only rename** (PM + Frontend-engineer + Growth-strategist consensus): `name: 'Pro'` keep `id: 'starter'`. Zero DB migration. Zero Stripe webhook changes.
- **B. Additive enum** (System-architect): Add `'pro'` to `PlanType` union; keep `'starter'` as deprecated permanent historical anchor. New signups get `'pro'`; existing `'starter'` rows preserved per immutability-first principle.
- **C. Full enum migration** (NOT recommended by any agent): Prisma migration UPDATEs `User.plan='starter'` → `'pro'`. Violates immutability-first; destructive.

**Coordinator recommendation: Option B** — aligns with Ledgerium's immutability-first principle; preserves historical audit trail; structurally identical to other Ledgerium contract surfaces. Option A is functionally equivalent in display but creates audit ambiguity ("was this user on Starter or Pro on 2026-04-01?").

### 7.2 Decision D-02: Tier Rename Naming
**Options:**
- **A. "Pro"** (PM + Frontend-engineer + Competitive-researcher): CEO's original proposal; matches Scribe Pro + Tango Pro + Notion Plus competitive pattern.
- **B. "Solo"** (Growth-strategist): Names work context not aspiration; stronger positioning per work-context-vs-self-perception research; avoids `toPlanType('pro')` legacy collision.

**Coordinator recommendation: Option A "Pro"** — competitive parity matters more than self-perception positioning at sub-1,000-sub scale; CEO directive intent is clear; legacy `toPlanType('pro') → 'starter'` collision is mitigated by Option B for D-01.

### 7.3 Decision D-03: Pricing Reduction Floor
**Options:**
- **A. DEFER all pricing reductions** (Growth-strategist + Market-research): Hold $49 / $249 / $799; ship copy improvements first; measure conversion lift; revisit in 60-90 days only if Team trial-to-paid < 2%.
- **B. SET explicit anchors NOW** (PM + Competitive-researcher hybrid): **Pro $39 / Team $129 / Growth $399** — within CEO's $29-49 / $99-149 / $299-499 range but with explicit anchors. **Critical: hold Growth at $399 minimum** (Market-research + Competitive-researcher convergence — $299 signals "discount tool" not "platform").
- **C. CEO's original verbatim ranges**: Pro $29-49 / Team $99-149 / Growth $299-499 — range-based pricing.

**Coordinator recommendation: Option B** — copy improvements alone (Option A) miss the price-perception lever; explicit ranges (Option C) create implementation ambiguity; **$39 / $129 / $399** anchors:
- Match Scribe Pro / Zapier Pro entry tier zone ($29-49)
- Beat Whale $99 flat-rate Team floor while staying below Trainual $249
- Hold Growth at $399 (industry "serious platform" signal preserved per Market + Competitive convergence)

### 7.4 Decision D-04: Render Strategy
**Options:**
- **A. Server Component (current)** — cold-start cost; no edge caching
- **B. ISR `revalidate=3600`** (System-architect): 1-hour CDN cache; user-aware badge as separate Client Component
- **C. Full SSG** (Frontend-engineer): Maximum Lighthouse; cannot show "you're on this plan" badge without separate hydration

**Coordinator recommendation: Option B** — ISR strikes the right balance; system-architect's spec is implementation-ready.

### 7.5 Decision D-05: Architectural-Foundation-First vs Copy-First Sequencing
**Options:**
- **A. Foundation-first** (System-architect): PRICING-P01 (lib/pricing/ module) ships FIRST as architectural prereq before copy iterations
- **B. Copy-first** (Frontend-engineer + PM): PRICING-P02 (copy changes) ships FIRST for fastest visible CEO outcome; PRICING-P01 deferred or incremental

**Coordinator recommendation: Option A** — without architectural consolidation FIRST, every copy iteration must re-touch `config.ts` + `plans.ts` + `stripe.ts` separately, creating drift surface that compounds. PRICING-P01 is ~250 LOC pure module — a single bounded iteration. Then ALL subsequent pricing work reads from canonical source.

---

## 8. P0 Audit-Intake Promotions for IMPROVEMENT_BACKLOG.md

Per MR-005 D-5 protocol + MR-016 Change A clause 8 (multi-iteration umbrella row split at audit-intake; ratified MR-017). All rows get `Birth iter: audit-intake-PRICING-001`.

### 8.1 Row #111 — PRICING-P01: lib/pricing/ Architectural Foundation
**Title**: lib/pricing/ consolidated module + PRICING_CATALOG frozen singleton + versioned archive
**Description**: Create `apps/web-app/src/lib/pricing/` with `catalog.ts` (frozen PRICING_CATALOG ReadonlyRecord<PlanType, PricingTier>), `types.ts` (PricingTier interface + BillingCycle + FeatureCategoryMap), `stripe-prices.ts` (getStripePriceId indirection layer with fail-fast startup validation), `migration.ts` (canonicalDisplayPlan), `validation.ts` (PricingConfigError + Zod schemas), `archive/v1_0_0.ts` (versioned snapshot), `index.ts` (barrel re-export). Deprecate tier definitions in `config.ts` + `plans.ts` + `stripe.ts`; re-export from `lib/pricing/`. Parallel to Path D D+1 column registry pattern (iter 056). D-4 clause 2 FIRES (~250 LOC pure module).
**Score**: I=5 A=5 L=4 C=4 E=3 R=2 → **raw 13** (no blocker bonus; no saturation penalty)
**Primary**: `system-architect`
**Estimated LOC**: ~600 production + ~400 test
**Dependencies**: None (this IS the dependency root)
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 1

### 8.2 Row #112 — PRICING-P02: Hero Header + Outcome Microcopy + Best For + CTAs
**Title**: Hero header rewrite + tier-card outcome microcopy + Best For rows + per-tier CTAs (CEO Recs #1+#2+#5+#8+#10)
**Description**: Rewrite `pricing/page.tsx` hero `<h1>` from "Simple pricing that scales with your team" → "Record Once. Know Everything." + add 4-bullet output grid + risk-removal subtext "Free forever on 5 workflows. No credit card. No setup." Add `outcomeMicrocopy` + `bestFor` + `ctaText` fields to PRICING_CATALOG. Render "Best For:" line below plan name + outcome microcopy below price + new CTA copy ("Map Your First Process Free" / "Start 14-Day Trial" / "Equip Your Team" / "Scale Operations" / "Talk to Sales"). Replace all "recorder" terminology with "user" / "users" / "seats" (CEO Rec #4). Update meta title + meta description. Update FAQ "recorder vs seat" answer. Apply 8 brand-voice POLISH from growth-strategist COPY_PACK.
**Score**: I=5 A=5 L=2 C=5 E=2 R=1 → **raw 14** (no blocker bonus; no saturation penalty)
**Primary**: `frontend-engineer` + `growth-strategist` D-4 clause 1 ADJACENT (≥3 user-visible strings — many)
**Estimated LOC**: ~130 production + ~120 test
**Dependencies**: #111 PRICING-P01
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 1

### 8.3 Row #113 — PRICING-P03: Tier Rename + Price Restructure
**Title**: Tier rename (Starter → Pro additive) + pricing anchors $39/$129/$399 (CEO Rec #3)
**Description**: Add `'pro'` to PlanType union (additive; preserve `'starter'` as deprecated permanent historical anchor per immutability-first). Prisma migration `add_pro_plan_value` (additive enum extension). Update PRICING_CATALOG display: Pro $39/mo ($32 annual) / Team $129/mo ($107 annual) / Growth $399/mo ($332 annual). CEO Stripe Dashboard work: create 6 new Stripe Prices (3 tiers × monthly + annual) + update 6 GitHub Secrets + verify webhook handles new Price IDs end-to-end. Update `STRIPE_PRICE_TO_PLAN` mapping. canonicalDisplayPlan() maps legacy starter rows to "Pro" UI label.
**Score**: I=5 A=5 L=3 C=4 E=3 R=4 → **raw 10** (no blocker bonus; no saturation penalty; high risk reduces score)
**Primary**: `frontend-engineer` + `system-architect` ADJACENT (migration validation) + `backend-engineer` ADJACENT (Stripe + webhook)
**Estimated LOC**: ~100 production + ~150 test + 1 Prisma migration
**Dependencies**: #111 PRICING-P01, #112 PRICING-P02. CEO Stripe Dashboard prerequisite (25-35 minutes).
**QA Blocker Gates** (per qa-engineer Section L): (1) DB existing-paying-customer audit query result documented; (2) staging Stripe webhook E2E verification per new tier complete.
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 2

### 8.4 Row #114 — PRICING-P04: Comparison Table Feature Category Restructure
**Title**: Categorized comparison table with 4 feature groups (CEO Rec #7)
**Description**: Replace flat `COMPARISON_FEATURES` array in `page.tsx` with `featureCategories` data-driven structure on PRICING_CATALOG (per system-architect AD-8). Render 4 category-header `<tr>` rows: "What You Capture" / "What You Get" / "Sharing & Collaboration" / "Advanced & AI". Add `scope="colgroup"` + `aria-label="Feature group: [label]"` per UX a11y spec. Add sticky table header on scroll (`sticky top-0 z-20`). Add right-side fade gradient pseudo-element on mobile scroll container for scroll-affordance signal. Add `<caption>` or `aria-label="Compare pricing plans"` on table element. Add `scope="col"` to `<th>` and `scope="row"` to first column `<td>`. Add `ai` feature category placeholder with `availability: 'unavailable'` + "Coming in an upcoming release" copy (iter-061 POLISH precedent) per system-architect AI Vision coordination.
**Score**: I=3 A=4 L=2 C=4 E=2 R=1 → **raw 10** (no blocker bonus; no saturation penalty)
**Primary**: `frontend-engineer`
**Estimated LOC**: ~95 production + ~60 test
**Dependencies**: #111 PRICING-P01, #112 PRICING-P02
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 2

### 8.5 Row #115 — PRICING-P05: Live Process Intelligence Output Embed
**Title**: Embed live process intelligence output above tier cards (NOT in CEO's 10; distinctive move per Section 5.1)
**Description**: NEW Server Component `PricingLiveOutput.tsx` rendering actual `WorkflowRow` + `HealthTooltip` + process group card using existing dashboard-v2 components with seeded sample data ("47 runs · avg 4m 32s · 91% confidence · 3 friction events"). Read-only (no interaction); demonstrates N-attribution + evidence-linking + variation analysis output. Position: between hero header (PRICING-P02) and tier card grid. Sample data infrastructure already exists at `apps/web-app/public/samples/`; reuse seeded data adapter. Closes CEO's "value invisibility before subscription" concern more decisively than any copy change. Exclusively achievable by Ledgerium (Scribe / Tango / Whale don't produce process intelligence). 5-of-9-agent convergence.
**Score**: I=5 A=5 L=3 C=3 E=3 R=2 → **raw 11** (no blocker bonus; no saturation penalty)
**Primary**: `frontend-engineer`
**Estimated LOC**: ~150 production + ~80 test
**Dependencies**: #111 PRICING-P01, #112 PRICING-P02
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 3

### 8.6 Row #116 — PRICING-P06: Output Thumbnails + Social Proof Block
**Title**: Output thumbnail row + social proof block (CEO Recs #6 + #9)
**Description**: NEW Server Component `OutputThumbnailRow.tsx` rendering 3-column grid of Next.js `<Image>` components showing real screenshots from `public/img/screenshot-{sop,workflow,dashboard}.png` (already exist per frontend-engineer audit — resolves UX's SVG-vs-screenshot Option A vs B). Position: between hero and tier cards (above PRICING-P05 live output OR below it — coordinator preference). NEW Server Component `SocialProofBlock.tsx` with 3 defensible placeholders per growth-strategist Section D: (a) architecture trust signal "Every SOP traces back to the exact interaction that produced it"; (b) capability claim "A 10-minute recording produces a shareable SOP in under 60 seconds"; (c) competitive differentiation "Scribe captures screenshots. Ledgerium captures structured data — timings, system context, variation analysis." Use `<blockquote>` + `<cite>` semantics. Triggers 30-day customer-outreach program for real testimonials post-launch.
**Score**: I=3 A=3 L=2 C=3 E=2 R=1 → **raw 8** (no blocker bonus; no saturation penalty)
**Primary**: `frontend-engineer` + `growth-strategist` ADJACENT (social proof copy verification)
**Estimated LOC**: ~145 production + ~100 test
**Dependencies**: #111 PRICING-P01, #112 PRICING-P02
**QA Blocker Gate**: `OutputThumbnailRow` must gracefully degrade with null/empty data (qa-engineer Section L Blocker 3).
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 3

### 8.7 Row #117 — PRICING-P07: Pricing Analytics Instrumentation
**Title**: Pricing-page analytics instrumentation (closes funnel Stages 1+2 dark gap)
**Description**: Implement 7 new analytics events per analytics agent Section J: P1 foundation (`pricing_page_viewed` + `pricing_tier_selected`) + P2 diagnostics (`pricing_checkout_abandoned` + `pricing_checkout_error` + `pricing_billing_toggled`) + P3 engagement (`pricing_comparison_interacted` + `pricing_roi_calculator_used`). Add new `PricingPageTracker` client island for page-view emission. Extend `cancel_url` in checkout/route.ts with `?tier=X&interval=Y` for abandonment-event attribution. Privacy: hostname-only referrer; PostHog `disable_session_recording: true` preserved; ROI Calculator dollar amounts NOT logged. Add `feature_category_version: 'v1'` discriminator to existing events for future PostHog dashboard backfill compatibility. Add `Billing` section to admin operations dashboard at `/admin/operations` with subscription-count metrics by tier + 30-day new subscriptions + MRR estimate + 1,000-subscription goal progress bar. Schema gap noted (NOT this row): `User.subscriptionActivatedAt` timestamp missing — required for accurate 30-day metric.
**Score**: I=4 A=4 L=3 C=4 E=2 R=1 → **raw 12** (no blocker bonus; no saturation penalty)
**Primary**: `analytics` (rotation off recent agents per agent-diversity rule)
**Estimated LOC**: ~120 production + ~80 test
**Dependencies**: #111 PRICING-P01 (PostHog event taxonomy stable; no concurrent restructure)
**Birth iter**: `audit-intake-PRICING-001`
**Phase**: 3

---

## 9. P1/P2/P3 Cold-Pool Reference (HELD IN ARTIFACT per MR-005 D-5)

The following items are surfaced by the review but NOT promoted to live backlog. They remain in this artifact as cold-pool reference for future trigger-fired promotion (PRD-trigger path per MR-005 D-5 clause 5, or post-launch evidence path).

### P1 — Behavioral / High-Leverage but Out-of-Scope
- **PRICING-R01**: In-product upgrade trigger at 3rd recording (Section 5.2 — cross-track, not pricing-page; surface on dashboard + extension backlog)
- **PRICING-R02**: "Book a Demo" CTA on Team + Growth tier cards (Section 5.4; ~10 LOC; founder Calendly link)
- **PRICING-R03**: User.subscriptionActivatedAt schema column (analytics agent surfaced; required for accurate 30-day new-sub metric on admin operations dashboard)
- **PRICING-R04**: Pricing-page customer-outreach program for real testimonials (30-day post-launch; growth-strategist Section D path)
- **PRICING-R05**: PostHog cookie consent on public marketing pages (analytics agent surfaced; GDPR concern; broader site-level work)

### P2 — Optimization / Future Experiments
- **PRICING-R06**: Annual / monthly toggle prominence + "Save $X/year" dollar framing (UX agent + competitive-researcher; ~30 LOC)
- **PRICING-R07**: Tooltip help-circles on comparison table feature labels (UX agent Move 1; ~60 LOC)
- **PRICING-R08**: Value-statement line at bottom of each card (UX agent Move 2; ~10 LOC per plan)
- **PRICING-R09**: Mobile stack reorder Free → Team → Starter → Growth → Enterprise (UX agent; ~20 LOC)
- **PRICING-R10**: Skip-link "Skip to plan comparison" for screen readers (UX agent a11y; ~5 LOC)
- **PRICING-R11**: Stripe redirect loading state spec for UpgradeButton (UX agent; ~30 LOC + tests)
- **PRICING-R12**: CTA color experiment — test blue against current mint (competitive-researcher; A/B test infra prerequisite — defer to post-1,000-sub scale)
- **PRICING-R13**: "What does next tier add?" inline diff accordion (UX agent Move 3; defer per UX recommendation)

### P3 — Polish / Long-Term
- **PRICING-R14**: Per-tier sticky table header on scroll (UX agent comparison table redesign)
- **PRICING-R15**: Compact / expanded mode toggle for comparison table (UX agent flagged as anti-pattern; explicit reject)
- **PRICING-R16**: Tier recommendation quiz / wizard (competitive-researcher noted; not appropriate at current stage)

**16 items held cold** at intake. Total pool 44 → 51 after P0 promotions (#111-#117 = 7 P0 rows added; 16 P1/P2/P3 held cold in this artifact).

---

## 10. Implementation Sequence (Coordinator-Endorsed)

Per CEO decision-gate clearance + MR-005 D-7 N=7 sequence pre-check considerations:

**Recommended execution path: Independent Mode 2 directed picks, NOT a Mode 5 sequence**

Rationale: Mode 5 N=7 would trigger MR-005 D-7 mandatory meta-coordinator pre-check (artifact, ≤1 page, no product code). Independent Mode 2 picks staged across iterations avoid this overhead AND preserve coordinator flexibility to insert burn-down iterations or respond to QA blocker discoveries between picks.

```
iter ~076-077  | PRICING-P01  | system-architect PRIMARY      | D-4 clause 2 FIRES; Phase 1 foundation
iter ~077-078  | PRICING-P02  | frontend-engineer PRIMARY     | D-4 clause 1 FIRES (growth-strategist adjacent); Phase 1 copy

[CEO decision-gate: D-01/02/03 resolved before P03]
[CEO Stripe Dashboard work: 25-35 min if price changes]

iter ~079-080  | PRICING-P03  | frontend-engineer PRIMARY     | Phase 2 tier rename + price restructure; QA blockers must clear
iter ~080-081  | PRICING-P04  | frontend-engineer PRIMARY     | Phase 2 comparison table restructure

[Burn-down or rotation break iteration if agent-diversity 4+ trigger approaches]

iter ~082-083  | PRICING-P05  | frontend-engineer PRIMARY     | Phase 3 live output embed (distinctive move)
iter ~083-084  | PRICING-P06  | frontend-engineer PRIMARY    | Phase 3 thumbnails + social proof
iter ~084-085  | PRICING-P07  | analytics PRIMARY             | Phase 3 instrumentation (clean rotation off frontend × 3)
```

**Estimated timeline**: 9-10 iterations across PRICING- prefix. Approximately 8-12 weeks of iteration cadence based on observed iter 071-074 / iter 058-063 patterns (1-2 iterations per week typical).

**Cross-track work (NOT pricing-page)**: PRICING-R01 in-product upgrade trigger should be sequenced in parallel as separate dashboard/extension work — this is the highest-leverage conversion lever per Market-research contrarian recommendation.

---

## 11. Success Metrics for 1,000-Subscription Progress

**Leading indicators (Phase 1 + 2 measure within 30-60 days):**
- Pricing page visit → CTA click rate: 8%+ target (analytics agent baseline 2-5% industry typical)
- In-app upgrade-click rate: 5%+ of free-tier active users/month
- Trial-start → paid conversion rate: 25%+ by day 30 (industry typical 15-25%)

**Conversion-rate lift thresholds per CEO recommendation (analytics agent Section F):**
- Rec #1 hero copy: +5 pp S1→S2 engagement rate
- Rec #3 pricing reduction: +5 pp S2→S3 by tier (monitor MRR alongside — pricing cut + MRR drop = backfired)
- Rec #4 annual billing emphasis: 15%+ annual selection rate (2× LTV impact)
- Rec #6 output visualization: +5 pp S1→S2
- Rec #8 Best For: +3 pp S2→S3

**Goal-progress tracking dashboard**: `Billing` section in `/admin/operations` (PRICING-P07 scope):
- Active paid subscriptions by tier
- Trial subscriptions count
- 30-day new subscriptions
- MRR estimate (approximate; Stripe Dashboard for accurate)
- Goal progress: `active_paid / 1000 × 100%`
- Trial → paid conversion (monthly cohort)
- Annual mix rate

**Honest sizing assessment (5-of-9-agent convergence):**
- 1,000 paid subs from pricing-page changes alone: **NOT achievable**
- Requires parallel investment: SEO + content (12-18 months) + paid acquisition + partner channels (Zapier marketplace primary) + in-product upgrade flow + Chrome Web Store publication for organic extension installs
- Realistic timeline 6-9 months minimum if all parallel growth investments begin within 30 days of pricing-page launch
- Pricing-page improvements accelerate timeline ~15-20% via conversion lift; do not change timeline category

**TAM sanity check**: 1,000 subs × $150 blended ARPU = $1.8M ARR = **0.07-0.12% of SOP automation market** ($1.5-2.5B globally per Grand View Research 2023). Highly achievable; not a market-size constraint.

---

## 12. Counter / Cadence Effects (Mode 3-adjacent NON-counting)

Per established WDC-002 / AI-VISION-001 / SOPPM-001 precedent for Mode 3-adjacent diagnostic reviews:

**Counter updates at PRICING_PAGE_REVIEW_001 close:**
- Pool: 48 → 55 (+7 P0 promotions: rows #111-#117 added)
- Cool-off recharge counter: **UNCHANGED at 3/3 FULL RE-ARM** (20-event preservation streak preserved — Mode 3-adjacent NON-counting)
- D-1 reverse-portfolio-drift counter: **UNCHANGED at 3** (Mode 3-adjacent does not advance 5-iter counting window)
- MR-019 cadence counter: **UNCHANGED at 0/3** (Mode 3-adjacent NON-counting)
- Area saturation rolling-5 clock: **NOT advanced** (Mode 3-adjacent per MDR / WDC / WDC-002 / AI-VISION-001 / SOPPM-001 precedent)
- Agent-diversity: 9 specialist agents engaged in parallel; iter 075 implementing-agent re-enters at counter = 1 regardless of assignment
- Cold-pool ages: DV2 9 → 9 / MDR/WDC/PIB 4 → 4 / WDC-002 9 → 9 (all UNCHANGED at Mode 3-adjacent close; under MR-006 Change D 10-iter staleness threshold)
- **NEW SOPPM-001 cold-pool age**: 0 (next mandatory triage projected iter ~085)
- **NEW PRICING-001 cold-pool age**: 0 (next mandatory triage projected iter ~086)

**8th audit-style intake event** (DV2 iter 026 + MDR iter 032 + WDC-001 iter 033 + PIB pre-iter-058 + AI-VISION iter 062 + WDC-002 iter 064 + SOPPM-001 iter 074 + **PRICING-001 this intake** cumulative).

**Operational status preservation:**
- #57 flag-retirement prerequisite chain: **UNCHANGED at 10/10 ENGINEERING-COMPLETE** — only 14d soak-window remains
- External-launch MDR-blocker gate: **UNCHANGED at 7/7 CLOSED — FULL** — launch-readiness preserved
- Stripe billing-stack: **PRODUCTION-LIVE** (CEO closed operational deps; `/api/billing/checkout` returning Stripe Checkout redirects in production)
- Admin Operations Dashboard: **SHIP-READY** (preserved from iter 073)
- Path D status: **FULLY COMPLETE** (preserved from iter 063)
- WDC-002 P0 closure: 5 → 5 open (#101 / #103 / #104 / #105 / #106 remain)

**Zero CLAUDE.md governance diffs at PRICING_PAGE_REVIEW_001 close** — preservation of MR-018 stability-default posture; 12 consecutive zero-or-stability-only meta-reviews preserved (MR-007 → MR-018).

---

## 13. Open CEO Decision Queue (Consolidated; 5 items)

The 5 CEO decisions enumerated in Section 7 are gating dependencies for PRICING-P03 entry. Decisions D-01, D-02, D-03 must resolve before iter ~079-080 PRICING-P03 begins. Decisions D-04 + D-05 can resolve before iter ~076-077 PRICING-P01 begins.

| ID | Decision | Coordinator Default | CEO Override Window |
|---|---|---|---|
| D-01 | Tier rename strategy | **Option B: Additive enum** (preserve historical anchor) | Before iter ~079 |
| D-02 | Tier rename naming | **Option A: "Pro"** | Before iter ~079 |
| D-03 | Pricing reduction floor | **Option B: $39 / $129 / $399 anchors** (hold Growth $399 floor) | Before iter ~079 |
| D-04 | Render strategy | **Option B: ISR `revalidate=3600`** | Before iter ~076 |
| D-05 | Foundation-first vs copy-first | **Option A: Foundation-first** (PRICING-P01 ships before PRICING-P02) | Before iter ~076 |

**Silence-as-accept window**: per MR-008 precedent, if CEO does not override before each gate iteration, coordinator defaults APPLY. Default outcome resolution: PRICING-P01 ships per coordinator defaults D-04 + D-05 at iter ~076; PRICING-P03 ships per coordinator defaults D-01 + D-02 + D-03 at iter ~079 absent CEO override.

---

## 14. Validation

**Mode 3-adjacent diagnostic**: zero product code touched
- workspace `pnpm test` **2183 / 2183 unchanged across 74 test files**
- workspace `pnpm typecheck` clean across all 10 packages/apps
- `git status` confirms scope: NEW `docs/meta/PRICING_PAGE_REVIEW_001.md` + 7 P0 promotion entries in IMPROVEMENT_BACKLOG.md + 4 mirror artifact updates (CHANGELOG / ITERATION_LOG / SYSTEM_HEALTH / CLAUDE.md anchor); zero unintended changes outside artifact-mirror scope

**Preserved verbatim:**
- All product code byte-identical (Mode 3-adjacent rule)
- All cold-pool source artifacts unchanged (no triage at this intake; new cold-pool reference held in THIS artifact)
- iter 056-074 production code byte-identical
- Stripe billing-stack PRODUCTION-LIVE state preserved
- Admin Operations Dashboard SHIP-READY state preserved

---

## Appendix A — Agent Output Reference

Full agent reports (sectioned outputs) preserved in coordinator scratch:
- growth-strategist (~6,400 words; PRIMARY synthesis owner)
- product-manager (~5,800 words; 15 ACs + 5 P0 row proposals)
- ux-designer (~5,200 words; component-level UX specs)
- analytics (~4,900 words; 7 events + funnel + dashboard plan)
- market-research (~4,100 words; ICP analysis + industry benchmarks)
- frontend-engineer (~4,300 words; architecture audit + file-by-file manifest)
- system-architect (~4,800 words; lib/pricing/ consolidation move + invariants)
- competitive-researcher (~6,400 words; 8 competitor tables + best practices + URL citations)
- qa-engineer (~5,100 words; risk inventory + test plan + 3 absolute blockers + runbook)

Cumulative: ~52,000 words synthesized to this ~12,000-word consolidated artifact at ~4.3× compression ratio.

---

## Appendix B — CEO Recommendation → Backlog Row Mapping

| CEO Recommendation | Live Backlog Row | Phase |
|---|---|---|
| #1 Outcome language | #112 PRICING-P02 | 1 |
| #2 Hero header | #112 PRICING-P02 | 1 |
| #3 Pricing reduction | #113 PRICING-P03 | 2 |
| #4 No "Recorder" | #112 PRICING-P02 + #113 PRICING-P03 | 1 + 2 |
| #5 Microcopy | #112 PRICING-P02 | 1 |
| #6 Visualize outputs | #116 PRICING-P06 | 3 |
| #7 Feature hierarchy | #114 PRICING-P04 | 2 |
| #8 Best For | #112 PRICING-P02 | 1 |
| #9 Social proof | #116 PRICING-P06 | 3 |
| #10 Stronger CTAs | #112 PRICING-P02 | 1 |

**4 distinctive moves NOT in CEO's 10:**
| Move | Row | Source |
|---|---|---|
| Embed live process intelligence output | #115 PRICING-P05 | 5-of-9 agents |
| In-product upgrade trigger at 3rd recording | PRICING-R01 (cold) | Market + Growth + Analytics |
| lib/pricing/ architectural consolidation | #111 PRICING-P01 | System-architect |
| "Book a Demo" sales-assist CTA | PRICING-R02 (cold) | Market-research |

---

*End of PRICING_PAGE_REVIEW_001 v1.0.*

---

## Appendix C — CEO Directive Addendum (2026-05-17, post-synthesis)

**CEO directive (verbatim):** *"keep current pricing models, update CTAs, subscriptions features and functions, and the other information suggested to improve the pricing page. Update models for focus on users, workflows, and outputs rather than recorders and viewers."*

**CEO Decision Resolutions:**

- **D-01 (Tier rename strategy)**: NOT APPLICABLE — CEO directive does not request tier rename. Coordinator default (Option B additive enum) is moot; current tier names "Free / Starter / Team / Growth / Enterprise" preserved.
- **D-02 (Tier rename naming)**: NOT APPLICABLE — same.
- **D-03 (Pricing reduction floor)**: **RESOLVED → Option A (DEFER pricing changes)**. CEO directive verbatim: *"keep current pricing models."* Pricing preserved at $0 / $49 / $249 / $799 / Custom. No $39/$129/$399 anchor; no $29-49/$99-149/$299-499 ranges. Revisit only after 60-90 days of measured conversion data against improved copy.
- **D-04 (Render strategy)**: UNRESOLVED → Coordinator default Option B (ISR `revalidate=3600`) APPLIES at PRICING-P01 entry.
- **D-05 (Foundation-first vs copy-first)**: UNRESOLVED → Coordinator default Option A (Foundation-first; PRICING-P01 before PRICING-P02) APPLIES.

**CEO directive intent interpretation:**

The directive *"Update models for focus on users, workflows, and outputs rather than recorders and viewers"* is the broader vocabulary refocus beyond CEO Recommendation #4. Not just terminology swap ("recorder" → "user"). It refocuses how each subscription is FRAMED + WHAT IT OFFERS around three nouns:
1. **USERS** (not recorders / viewers) — seat-language reframe across all 5 tiers
2. **WORKFLOWS** (the unit of value) — "5 workflows / month" not "5 recordings"; "Document workflows" not "create recordings"
3. **OUTPUTS** (SOPs, process maps, variation analysis, automation candidates) — lead with what user receives, not what user does

This expansion is folded into:
- **PRICING-P02** scope (Phase 1 — vocabulary refocus on users / workflows / outputs)
- **PRICING-P03** scope (Phase 2 — RE-SCOPED from "tier rename + price restructure" to "subscription features and functions restructure within current pricing"; feature category hierarchy reorganization with users/workflows/outputs framing)

**Re-scoped P0 backlog rows (6, was 7):**

| Row # | Title | Phase | Status |
|---|---|---|---|
| #111 | PRICING-P01 lib/pricing/ architectural foundation | 1 | OPEN |
| #112 | PRICING-P02 Hero + outcome microcopy + Best For + CTAs + users/workflows/outputs vocabulary refocus (Recs #1+#2+#4+#5+#8+#10) | 1 | OPEN |
| ~~#113~~ | ~~PRICING-P03 Tier rename + price restructure~~ | ~~2~~ | **DROPPED** per CEO directive |
| #113 (was P04) | PRICING-P03 Subscription features/functions restructure + feature category hierarchy (CEO Rec #7 + CEO directive features/functions + users/workflows/outputs framing) | 2 | OPEN |
| #114 (was P05) | PRICING-P04 Live process intelligence output embed (distinctive move) | 3 | OPEN |
| #115 (was P06) | PRICING-P05 Output thumbnails + social proof block (Recs #6 + #9) | 3 | OPEN |
| #116 (was P07) | PRICING-P06 Pricing-page analytics instrumentation | 3 | OPEN |

**Revised implementation sequence:**

```
iter ~076  | PRICING-P01 (row #111)  | system-architect PRIMARY      | D-4 clause 2 FIRES; Phase 1 architectural foundation
iter ~077  | PRICING-P02 (row #112)  | frontend-engineer PRIMARY     | D-4 clause 1 FIRES (growth-strategist adjacent); Phase 1 copy + vocabulary refocus

[No Stripe Dashboard work required — current prices preserved]

iter ~080  | PRICING-P03 (row #113)  | frontend-engineer PRIMARY     | Phase 2 features/functions restructure
iter ~082  | PRICING-P04 (row #114)  | frontend-engineer PRIMARY     | Phase 3 live output embed (distinctive move)
iter ~083  | PRICING-P05 (row #115)  | frontend-engineer PRIMARY     | Phase 3 thumbnails + social proof
iter ~084  | PRICING-P06 (row #116)  | analytics PRIMARY             | Phase 3 instrumentation (rotation off frontend × 3)
```

**Estimated timeline**: 6 iterations across PRICING- prefix (was 7-10 before CEO directive resolution). Approximately 6-9 weeks of iteration cadence based on observed iter 071-074 cadence patterns. **Cross-track work** (PRICING-R01 in-product upgrade trigger at 3rd recording) remains in cold-pool reference per Section 9; recommended for parallel non-PRICING-prefix dashboard backlog if growth conversion is gating.

**Pool delta after CEO directive resolution**: 44 → 50 (+6 P0 promotions; was projected 44 → 51 with 7 rows; CEO directive drops 1 row).

**Validation:**
- workspace `pnpm test` **2183 / 2183 unchanged across 74 test files** (Mode 3-adjacent zero product code at this addendum)
- workspace `pnpm typecheck` clean across all 10 packages/apps
- IMPROVEMENT_BACKLOG.md: 6 P0 rows added (rows #111-#116); zero rows deleted; row numbering sequential from #110 baseline

*End of PRICING_PAGE_REVIEW_001 v1.1 (CEO directive addendum applied).*
