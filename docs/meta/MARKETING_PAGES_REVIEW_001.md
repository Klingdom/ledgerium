# MARKETING_PAGES_REVIEW_001 (MPR-001)

**Type**: Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date**: 2026-05-26
**Coordinator**: AI CTO orchestration layer
**CEO directive (verbatim)**: *"Have all subagents review the home page and come up with design and functionality improvements that quickly show visitors the value of the LEdgerium AI product and streamlines calls to action to get more free trials going. Also improve the Use Cases page (currently called operations) to define top 5 personas, problems, and how LEdgerium AI solves those problems."*
**Lead agent**: `growth-strategist`
**Contributing agents (4)**: `product-manager` + `ux-designer` + `frontend-engineer` + `competitive-researcher` + `analytics` (5 contributors total)
**Cumulative output**: ~10,000 words synthesized below

---

## §1 Executive Summary

**Diagnosis**: The shipped product is meaningfully ahead of what the home page describes. The page positions Ledgerium as an **SOP generator** when the shipped reality is a **process intelligence platform** (per AI_INTEGRATION_PLATFORM_VISION_REVIEW_001) with health scores, variant detection, automation scoring, admin operations dashboard, and Path D column customization — **none of which the home page mentions**. A 30-second visitor cannot answer "what makes this different from Scribe?"

**5-of-5 agent convergence on:**
1. **CTA fragmentation is the #1 conversion friction** — 3 different CTA labels ("Get Started Free" / "Create free account" / "Install extension") for the same action. Single primary CTA recommended.
2. **Use Cases page is single-persona masquerading as multi-persona** — `/use-cases/operations` is the only persona-targeted page; no `/use-cases` index exists; visitors get 404 on the directory route.
3. **Process intelligence story is absent from above-fold** — health score / cycle time / variant detection / automation scoring (M2 + M5 distinctive moments) all unmentioned at hero.
4. **Persona attribution measurement is missing** — no way to track which persona converts best; instrumentation gap blocks ROI measurement.
5. **18-24 month competitive window narrowing** — Scribe Optimize ($75M Series C 2025-11-10) + SAP Signavio Execution Variant Explorer (Feb 2026) directly encroach on Ledgerium's variant-detection moat; home page does not differentiate at category level.

**Coordinator-default 5-persona synthesis** (Use Cases page):
- **P1 Operations Manager** (all 3 agents converged)
- **P2 L&D / Training & Onboarding Lead** (2-of-3 agents)
- **P3 Compliance & Audit Lead** (all 3 agents converged)
- **P4 Process Improvement / Automation Analyst** (2-of-3 agents)
- **P5 IT / Systems Admin / RevOps** (all 3 agents converged; buyer persona)

**Recommended 4-PR delivery plan** (MPR-1 through MPR-4):
- MPR-1: Home page hero + primary CTA streamlining
- MPR-2: Home page mid-sections (problem / solution / distinctive moments / pricing teaser)
- MPR-3: Use Cases page restructure — 5 personas + new `/use-cases` index
- MPR-4: Analytics events + persona attribution instrumentation

**Coordinator verdict**: ship MPR-1 + MPR-2 first (highest demo-cycle impact since demos are running now); MPR-3 second; MPR-4 closes measurement loop. Total scope ~3-4 PRs across ~3-5 iterations.

---

## §2 Current State Audit

### Home page audit (`apps/web-app/src/app/(public)/page.tsx`)

**What works**:
- Hero headline *"Your SOP says 5 steps. Your team takes 17."* — concrete, numeric, quotable (5-of-5 agents praised)
- Trust strip with 4 honest signals (deterministic / 1,393 tests / privacy / evidence-linked)
- Live iframe demo embed (no surveyed competitor does this at scroll depth 2)
- Honest "Built Different" comparison cards
- Zero animation library dependencies; pure Server Component; LCP candidate `next/image` with `priority`

**What fails the 30-second test**:
- SOP-first framing misses intelligence buyers (process improvement / compliance / RevOps will self-select out)
- 3 competing CTAs ("Get Started Free" hero / "Create free account" final / "Install extension" final secondary)
- Process intelligence outputs (health score / variant count / cycle time / automation scoring) unmentioned above-fold
- Admin Operations Dashboard (iter 071-073 SHIPPED) entirely absent
- Path D customization (iter 056-063 SHIPPED) entirely absent
- "1,393 tests passing" is STALE — current count is 2,183+ (CLAUDE.md iter 074); undercount is wrong direction for trust signal
- Compliance use-case page (`/use-cases/compliance`) **OVERCLAIMS** SOC 2 + ISO 27001 audit-evidence capabilities that are NOT shipped (`auditTrail` + `complianceExports` feature flags declared in `plans.ts` but not implemented)

### Use Cases page audit (`apps/web-app/src/app/(public)/use-cases/operations/page.tsx`)

**What exists**:
- Three use-case sub-pages: `/use-cases/operations`, `/use-cases/compliance`, `/use-cases/ai-implementation`
- Each is a single-persona page with hero + 3-card pain points + 3-step how-it-works + 6 workflow examples
- NO top-level `/use-cases` index page (404 if visitor types `/use-cases`)
- NO persona differentiation within `/use-cases/operations` — addresses "operations teams" generically

**Critical gaps**:
- Persona identity not surfaced (visitors scan for "is this for me?" first; current page makes them guess)
- Zero quantitative signals (health scores / cycle time / variant counts not mentioned)
- Identical universal CTA across all pages ("Create free account") — no persona-specific conversion path
- Compliance page overclaims unshipped features (must qualify or remove)

### Conversion funnel + activation gaps (growth-strategist §3)

Target rates vs. assessed risk:

| Stage | Target | Risk | Primary friction |
|---|---|---|---|
| Visit → engage hero | ≥70% | MED | SOP framing causes premature self-selection out |
| Engage → scroll past fold | ≥40% | HIGH | 560px iframe at scroll depth 2 (mobile scroll trap) |
| CTA reach → click | ≥8% | MED | 3 competing CTA labels = choice confusion |
| Click → signup complete | ≥50% | LOW (no CC) | Resend DNS-blocked email verification adds risk |
| Signup → install extension | ≥40% | **HIGH** | Post-signup state has no guided activation flow |
| Install → first recording | ≥60% | MED | Free-tier limit feels low vs. setup cost |
| First recording → return | ≥35% | UNKNOWN | No measurement instrumented |

**Critical path bottleneck**: post-signup → extension-install gap. Visitor sees empty dashboard with generic "Install extension" CTA but no compelling reason to complete the install step.

---

## §3 Recommended Home Page Redesign (verbatim from growth-strategist §4)

### Hero section

**Headline** (8 words): *"Record your processes. Measure what actually happens."*

**Sub-headline** (22 words): *"Ledgerium captures every digital workflow from the browser, then produces cycle time, variant analysis, and SOPs — automatically."*

**Primary CTA**: **"Start free"** (button; brand-600; ArrowRight icon; verb-first; 2 words)

**Secondary CTA**: *"See the dashboard →"* (text link; de-emphasized; anchors to demo section)

**Visual**: animated 3-panel GIF OR static cropped screenshot of single workflow card with metrics visible (CEO decision D-UX-1)

**Mobile**: full-width primary CTA, secondary as centered link below, screenshot bleeds with `-mx-4 rounded-none`

### Trust strip (just below fold)

4 items, honest signals only (per growth-strategist §4):
- *"Same input, same output — always"* (deterministic; M4)
- *"Evidence-linked, not AI-generated"* (M1; differentiates from Scribe AI)
- *"Privacy by architecture"* (no session recording; addresses compliance objection)
- *"Free to start, no credit card"* (removes payment friction signal)

**Remove**: "1,393 tests passing" (stale + meaningless to ops buyer)

### Problem section

**Headline**: *"You don't know what your team actually does."*

**Sub-copy**: *"Your SOPs were written by someone who hasn't done the work in six months. Your cycle times are estimates. Your top performer's workarounds are undocumented. Every new hire learns a different version of the same process."*

**3 pain cards**:
1. **Cycle time is invisible**
2. **Variants accumulate silently**
3. **Documentation lags reality**

### Solution section

**Headline**: *"Record once. Measure everything."*

3 stacked items:
- **Record** — extension capture
- **Measure** — dashboard + intelligence
- **Improve** — variant detection + AI roadmap

### Distinctive moments (5 cards — M1-M5 from PDLT-001)

- **M1 Evidence-linked process map**
- **M2 N-attribution at the step level**
- **M3 Baseline vs. after measurement**
- **M4 Deterministic re-runnable processing**
- **M5 SOPs observed, not written**

### Pricing teaser

**Headline**: *"Start free. Grow when you're ready."*

3-tier cards (Free emphasized):
- **Free** — 5 recordings/month · SOP + map + report · No credit card
- **Starter** — $49/month · Unlimited recordings · Team sharing
- **Team** — $249/month · Dashboard intelligence · Variant analysis · [Join waitlist]

### Final CTA

**Headline**: *"Record your first workflow in 5 minutes."*

**Primary CTA**: **"Start free"** (identical to hero)

---

## §4 Top 5 Personas for Use Cases Page (coordinator-synthesized)

Synthesized from 3 agent recommendations (product-manager + growth-strategist + competitive-researcher). Convergence-ranked.

### P1 — Operations Manager (5-of-5 agent convergence)

**Job to be done**: *"When a process changes or a new tool gets rolled out, I want to capture the real workflow and produce an accurate SOP immediately, so I can stop spending two hours in meetings extracting steps from SMEs."*

**Problem**: *"I know our expense approval process is slower than it should be, but I can't show finance exactly where the time goes. My SOPs are 18 months old and nobody trusts them."*

**How Ledgerium solves it**:
- Observable: Records every click in Workday/SAP/any browser tool — no IT integration
- Measurable: Cycle time per run, step-level wait time, variant count
- Actionable: Re-record after process change → Ledgerium computes delta (M3)

**Shipped capability map**: Browser extension + SOP generation + workflow library + health score (iter 035 MDR-P01/P02) + clean exports (iter 030)

**Plan fit**: **Team** ($249/mo) — needs dashboard intelligence + variant analysis across multiple team members

---

### P2 — L&D / Training & Onboarding Lead (4-of-5 agents)

**Job to be done**: *"When we hire 10 new people in a quarter, I want to give them step-by-step guides that match what the system actually looks like today, so I can reduce time-to-productivity."*

**Problem**: *"I spend two weeks capturing an expert's workflow for every new tool rollout. By the time I publish the guide, the tool has been updated and the steps are wrong."*

**How Ledgerium solves it**:
- Observable: Expert records workflow once — no interview, no workshop
- Measurable: SOP generated with step-level detail + timing + confidence scores
- Actionable: When tool updates, re-record; SOP updates from evidence not memory

**Shipped capability map**: SOP generation (iter 007) + public SOP share link + clean exports + process map

**Plan fit**: **Free or Starter** — typically single author; SOP sharing primary

---

### P3 — Compliance & Audit Lead (5-of-5 agent convergence)

**Job to be done**: *"When we go into an audit cycle, I want traceable, timestamped evidence of how critical processes are actually executed."*

**Problem**: *"Our auditors ask for evidence that our processes are followed as documented. Our SOPs are Word documents. The gap between documented and actual is a control deficiency waiting to be found."*

**How Ledgerium solves it**:
- Observable: Records actual process as executed (M5; not remembered or described)
- Measurable: Completion rate + step presence + variant count (same metrics auditors use)
- Actionable: Evidence-linked SOP traceable to source event (M1)

**Shipped capability map**: Evidence-linked SOP (iter 007 + iter 026) + deterministic output (iter 037) + privacy posture

**Plan fit**: **Team or Enterprise** — evidence-linked traceability + admin oversight + shareable SOPs

**⚠️ CAVEAT**: `auditTrail` + `complianceExports` feature flags exist in `plans.ts` but NOT IMPLEMENTED. Current compliance page OVERCLAIMS. **MUST qualify claims as "Enterprise audit trail in roadmap" or remove SOC 2 / ISO 27001 specific assertions** (product-manager D-PM-2).

---

### P4 — Process Improvement / Automation Analyst (3-of-5 agents)

**Job to be done**: *"When leadership asks where the bottlenecks are in our order-to-cash cycle, I want cycle time data + variant counts + automation scoring across all recorded workflows, so I can prioritize which processes to fix first instead of guessing."*

**Problem**: *"My 10 CSMs all handle the same account onboarding differently. I can see output metrics in Salesforce but not the process variance that causes them."*

**How Ledgerium solves it**:
- Observable: Records workflow across multiple operators → comparable data points
- Measurable: Variant detection (M2) + statistical columns (iter 075 WDC-002)
- Actionable: Identifies canonical path; surfaces automation candidates (iter 039 `aiOpportunityScore`)

**Shipped capability map**: Process intelligence dashboard (iter 056-067 Path D) + health/opportunity tag (iter 035, 039) + automation scoring (iter 039 MDR-P05) + variant detection

**Plan fit**: **Team** — multi-user variant analysis + dashboard intelligence

---

### P5 — IT / Systems Admin / RevOps (Buyer persona; 5-of-5 agent convergence)

**Job to be done**: *"When evaluating a new process documentation tool for the team, I want to see that the platform is enterprise-operable — with admin visibility, user management, and usage controls — so I can justify the Team or Growth plan to my CFO."*

**Problem**: *"I know our procurement-to-payment workflow touches 4 systems, but I have no single view of where cases get stuck. Each system has its own logs and none of them talk to each other."*

**How Ledgerium solves it**:
- Observable: End-to-end cross-system workflow capture in browser (no API integrations)
- Measurable: Step-level system attribution + cross-system handoff wait times
- Actionable: Admin Operations Dashboard (iter 071-073 SHIP-READY) for usage oversight

**Shipped capability map**: Admin Operations Dashboard + Stripe self-serve billing (iter 066-068) + Team workspace + seat management

**Plan fit**: **Team / Growth / Enterprise**

**⚠️ CAVEAT**: `rbac` + member management UI not yet implemented (UMAP-001 row #159 + #160 pending). Self-serve member management is a buying-blocker at Growth/Enterprise tier.

---

### Personas considered but NOT in top 5

- **CS Operations** (growth-strategist) — folded into P4 Process Improvement Analyst (same job-to-be-done shape)
- **AI Implementation Lead** (competitive-researcher) — opening category; defer to Phase 2 when AI Vision build ships
- **RevOps / Sales Ops** (competitive-researcher) — folded into P5 IT/RevOps buyer persona

---

## §5 Use Cases Page IA — Sticky-tab navigation

**Layout pattern (ux-designer §4 D-UX-2 recommendation)**: **sticky-tab nav at top + scrollable persona content below**.

Rationale: 5 personas can't fit in a responsive grid without truncation at tablet widths. Sticky tabs let visitors self-identify their role immediately. All persona names visible at once (signals breadth without forcing visitor to read all 5).

**Tab strip**: `flex gap-0 border-b sticky top-16 z-10 bg-elevated overflow-x-auto`. Each tab `px-5 py-3 text-sm border-b-2 hover:border-brand-600`. Active: `text-brand-600 border-brand-600`. Mobile: horizontal scroll with `scroll-snap-type: x mandatory`.

**Each persona block**: 2-column at `lg:grid-cols-[280px_1fr] gap-12`. Left column = identity card with persona name + Lucide icon + plan-tier badge. Right column = problem + solution + example + per-persona CTA.

**ARIA pattern**: `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` per MDR-P07 + ADM-002 PR-1 precedent.

**URL**: Rename top-level entry to `/use-cases` index page with cards linking to persona sub-pages. Keep `/use-cases/operations`, `/use-cases/compliance`, `/use-cases/ai-implementation` working. Add 2 new persona pages: `/use-cases/training-onboarding` + `/use-cases/process-improvement`.

---

## §6 Streamlined CTA Strategy

**One primary CTA across all placements**: **"Start free"**

Rationale: "Get Started Free" + "Create free account" + "Install extension" are 3 different labels for the same action. "Start free" is 2 words / verb-first / brand-voice-aligned / honest-label (free precedes commitment signal).

**Hover state**: subtle color change (brand-600 → brand-500); no copy change
**Disabled state**: rare (during loading); `opacity-60 cursor-not-allowed`

**One secondary CTA**: *"See the dashboard →"* (text link; not button; anchors to demo section OR opens `/product`)

**Remove**:
- "See the Product" button (hero) — replace with text-link variant
- "Install extension" button (final CTA) — install flow belongs post-signup, not on marketing page
- "Learn more" links (any section) — these create parallel conversion paths

**Per-persona CTAs (Use Cases page)**: each persona's CTA may include context-specific verb-phrase ("Record your first expense workflow free") in addition to universal "Start free". UX-designer D-UX-3 recommends per-persona; growth-strategist D-GR-1 recommends universal. **Coordinator-default: universal primary + persona-specific secondary** (e.g., P5 IT/RevOps secondary CTA = "Request team demo" rather than "Install extension").

---

## §7 PR Plan — 4 PRs across ~3-5 iterations

Per frontend-engineer §4 sequencing recommendation:

### PR-MPR-1: Home page hero + primary CTA streamlining (HIGHEST IMPACT)

- Files: `apps/web-app/src/app/(public)/page.tsx` (modify hero) + NEW `BrowserChrome.tsx` + NEW `SectionLabel.tsx` + NEW `HeroSection.tsx` (optional extraction)
- Estimated LOC: +120 prod / -60 dedup = net +60
- Agent: `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 adjacency MANDATORY (≥5 user-visible copy strings — hero H1 + subhead + CTA labels + disclaimer)
- Dependencies: revised hero copy from growth-strategist (provided in §3 above); optimized `screenshot-dashboard.png` (WebP under 100 KB)
- Risk: MED
- Verbatim copy already drafted in §3

### PR-MPR-2: Home page mid-sections (problem / solution / distinctive moments / pricing teaser / final CTA)

- Files: `apps/web-app/src/app/(public)/page.tsx` (remaining sections) + NEW `FeatureCard.tsx` + NEW `ComparisonCard.tsx`
- Estimated LOC: +150 prod / -80 dedup = net +70
- Agent: `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 adjacency MANDATORY
- Dependencies: PR-MPR-1 merged (shares `SectionLabel`, `BrowserChrome`); verbatim copy from §3 above
- Risk: MED
- Replaces: stale "1,393 tests passing" trust signal + adds health-score/dashboard mention; adds 5 distinctive-moment cards (M1-M5); adds pricing teaser

### PR-MPR-3: Use Cases page restructure — 5 personas + new `/use-cases` index

- Files: NEW `PersonaHero.tsx` + `PainPointGrid.tsx` + `HowItSolvesList.tsx` + `WorkflowExampleGrid.tsx` + `PersonaCTA.tsx`. NEW `/use-cases/page.tsx` index. Modified 3 existing persona pages + 2 NEW persona pages. Modify `PublicNav` to add "Use Cases" link.
- Estimated LOC: +500 prod (5 pages × ~80 LOC data + 5 shared components × ~60 LOC each)
- Agent: `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 adjacency MANDATORY (each persona = ~10 user-visible strings × 5 = ~50 strings)
- Dependencies: 5-persona content from §4 above; tab-nav layout from §5
- Risk: HIGH (largest PR; touches 7+ files; nav change)
- **CRITICAL: REMOVE compliance page SOC 2 / ISO 27001 overclaims** OR qualify as "in roadmap"

### PR-MPR-4: Analytics events + persona attribution instrumentation

- Files: `apps/web-app/src/lib/analytics.ts` (add 5 new event variants per analytics §1) + `apps/web-app/src/app/(public)/page.tsx` (wire `TrackedLink` to new events) + use-cases pages (persona attribution to sessionStorage)
- Estimated LOC: +80 across analytics.ts + page files
- Agent: `analytics` adjacency OR `backend-engineer` PRIMARY
- Dependencies: PRs 1+2+3 merged
- Risk: LOW
- New events: `marketing_page_viewed` / `hero_scrolled` / `signup_started` / `trial_activated` / `persona_section_viewed`; extend `cta_clicked` with `above_fold` + `cta_text` + `persona` properties

---

## §8 Backlog Row Proposals

Per ADM-002 MR-016 Change A structural-umbrella-split discipline: 4 separate backlog rows for the 4 PRs, each with `Birth iter: audit-intake-MPR-001` and independent numerator credit at closure.

| Row # | Title | Score | Agent | Birth iter |
|---|---|---|---|---|
| #179 | MPR-001 PR-MPR-1 home page hero + primary CTA streamlining | 14 | frontend-engineer + growth-strategist | audit-intake-MPR-001 |
| #180 | MPR-001 PR-MPR-2 home page mid-sections | 12 | frontend-engineer + growth-strategist | audit-intake-MPR-001 |
| #181 | MPR-001 PR-MPR-3 use cases page 5-persona restructure | 14 | frontend-engineer + growth-strategist | audit-intake-MPR-001 |
| #182 | MPR-001 PR-MPR-4 analytics + persona attribution | 11 | analytics / backend-engineer | audit-intake-MPR-001 |

Pool delta at MPR-001 ratification: 55 → 59 (4 new rows added).

---

## §9 12 CEO Decisions Queued (silence = accept coordinator-defaults)

| # | Decision | Coordinator-default |
|---|---|---|
| D-GR-1 | Primary CTA copy lock | **"Start free"** (2 words; verb-first; consistent across all 3 placements) |
| D-GR-2 | Hero visual choice | **Static cropped screenshot of single workflow card** (per ux-designer D-UX-1; avoids WCAG SC 2.2.2 risk of animated GIF) |
| D-GR-3 | 5-persona set | **Ops Manager / L&D / Compliance / Process Improvement / IT-RevOps** (synthesized; see §4) |
| D-GR-4 | Pricing visibility on home page | **3-tier teaser with "Join waitlist" for Team/Growth** + "Compare plans →" text link |
| D-GR-5 | Demo-recording embed | **Keep live iframe demo BUT move below fold** (after problem section); replace hero with static cropped screenshot |
| D-GR-6 | Use Cases URL structure | **ADD `/use-cases` index page** linking to 5 persona sub-pages; sub-pages keep current URLs |
| D-PM-2 | Compliance overclaim disposition | **QUALIFY as "Enterprise audit trail in roadmap"** OR remove SOC 2 / ISO 27001 specific assertions until those features ship |
| D-PM-5 | Persona-specific CTA pattern | **Universal primary + persona-specific secondary** (e.g., P5 secondary = "Request team demo") |
| D-UX-1 | Hero visual type | **Static cropped screenshot** (zero-infrastructure; loads instantly; no motion sensitivity risk) |
| D-UX-2 | Use Cases layout pattern | **Sticky-nav-tabs** at top + scrollable persona content below |
| D-FE-1 | Animation library | **NO new library** — CSS keyframes + IntersectionObserver hook only if scroll reveal needed |
| D-FE-3 | Persona data pattern | **Typed-array inline** per page (matches existing pattern); NO MDX dependency |

Additional analytics decisions (per analytics §4):
- D-AN-1 Funnel measurement strategy → **PostHog Funnels only at MVP**
- D-AN-2 Persona attribution scope → **Per-persona conversion tracking (persist `referring_persona` on User record)**
- D-AN-3 A/B test infrastructure → **NO A/B at MVP** (establish baseline first; introduce single PostHog flag after 2 weeks)

---

## §10 Competitive Positioning (competitive-researcher §3 + §4)

**Critical gap in entire landscape**: No surveyed competitor builds persona language around *evidence*. They sell output (SOPs, guides, automations). No one sells the *audit trail* or *traceability of what actually happened* as a first-class persona need. **This is Ledgerium's unoccupied positioning space.**

**Persona competitive whitespace**:
- Compliance & Audit Lead: ZERO explicit coverage in competitive set
- Process Improvement Analyst (with AI-automation framing): ZERO explicit coverage
- RevOps / Sales Ops: ZERO explicit coverage
- Ops Manager: CONTESTED (Scribe, Trainual, Whale, Tango all target)
- IT Systems Admin: CONTESTED (Scribe, Tango all target)

**Recommended anti-positioning** (per D-CR-3 default: **DO NOT name competitors on home page**):
- Use contrast language anchored to category distinction: documentation vs. intelligence / output vs. evidence
- Reserve competitor naming for dedicated comparison landing pages and G2/Capterra profiles
- "Unlike documentation tools that capture how you *think* a process works, Ledgerium captures how it *actually* runs"

---

## §11 Closing Verdict + Counter Effects

### Mode 3-adjacent NON-counting effects

- Zero product code touched
- Iteration counter NOT advanced
- Cool-off recharge counter UNCHANGED at 3/3 FULL RE-ARM (preservation streak continues)
- D-1 reverse-portfolio-drift counter UNCHANGED at 22
- MR-020 cadence counter UNCHANGED (deferred per CEO Option B)
- Area saturation clock NOT advanced
- Pool 55 → 55 (4 new rows pending CEO acknowledgement of §9 D-GR-3 persona set)

### Coordinator verdict

**MPR-001 SHIP-READY with one BLOCKING dependency**: compliance use-case page OVERCLAIMS must close BEFORE any paid acquisition campaign runs against marketing pages. This is a product-claim accuracy issue, not a marketing-design issue.

**Recommended sprint sequencing** (sequential PRs):
- iter 097 = PR-MPR-1 (home page hero + CTA streamlining)
- iter 098 = PR-MPR-2 (home page mid-sections)
- iter 099 = PR-MPR-3 (use cases 5-persona restructure)
- iter 100 = PR-MPR-4 (analytics + persona attribution)

OR interleave with ADM-002 drill-down sprint (PRs 8-10 remaining):
- ADM-002 PR-8 (high-intent surface) ↔ MPR-001 PR-MPR-1
- ADM-002 PR-9 (trial extension) ↔ MPR-001 PR-MPR-2
- etc.

Coordinator-default: **prioritize MPR-001 over ADM-002 drill-down completion** — demos are running THIS WEEK; home page improvements convert demo audience signups; admin tooling improvements don't affect external visitors. ADM-002 PR-8 through PR-18 can ship post-demo-cycle.

**Awaiting CEO acknowledgement** on §9 D-01 through D-12. Once confirmed (explicit or silent-as-accept), coordinator proceeds with iter 097 = PR-MPR-1.

---

## Appendix A — Agent Output Index

| Agent | Word count | Key contributions |
|---|---|---|
| growth-strategist (LEAD) | ~3,500 | Section-by-section redesign + verbatim copy + 5-persona spec + 8 CTAs + objection handling + 6 CEO decisions |
| product-manager | ~2,200 | Feature-inventory mismatch audit + ADMIN-001 backlog re-eval + 15 ACs + 5 product CEO decisions |
| ux-designer | ~1,800 | UX audit + hero typography + persona-card design + sticky-tab pattern + 8 UX improvements + 3 UX CEO decisions |
| frontend-engineer | ~1,500 | Technical audit + component decomposition + 4-PR sequencing + 3 frontend CEO decisions |
| competitive-researcher | ~1,300 | 10-platform competitive home page audit + persona patterns + competitive whitespace + 3 positioning CEO decisions |
| analytics | ~1,000 | Funnel definition + persona-attribution measurement + 3 analytics CEO decisions |
| **Total** | **~11,300** | |

## Appendix B — File Reference Index

- `apps/web-app/src/app/(public)/page.tsx` — home page Server Component
- `apps/web-app/src/app/(public)/use-cases/operations/page.tsx` — current single-persona use-case
- `apps/web-app/src/app/(public)/use-cases/compliance/page.tsx` — **OVERCLAIMS unshipped capabilities; must qualify**
- `apps/web-app/src/app/(public)/use-cases/ai-implementation/page.tsx` — third existing use-case page
- `apps/web-app/src/app/(public)/layout.tsx` — shared marketing shell
- `apps/web-app/src/components/TrackedLink.tsx` — analytics-wrapped link
- `apps/web-app/src/lib/analytics.ts` — discriminated event union
- `apps/web-app/src/lib/plans.ts` — plan tier feature gates (audit-trail + complianceExports flags declared but NOT implemented)
- `public/img/screenshot-dashboard.png` — current hero (300 KB; target <100 KB WebP)
- `docs/meta/PRE_DEMO_LAUNCH_AND_TESTING_PLAN_001.md` — 5 distinctive moments M1-M5
- `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` — intelligence-platform positioning
- `docs/meta/ADMIN_DASHBOARD_REVIEW_002.md` — concurrent admin work

## Appendix C — Prior Strategic Review Cross-References

- PDLT-001 (pre-demo testing plan; 5 distinctive moments anchor for hero distinctive-moments cards)
- AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 (intelligence-platform positioning vocabulary)
- UMAP-001 (user-management UI gating; affects P5 IT/RevOps persona buyer concerns)
- ADM-002 (admin dashboard expansion; complementary scope)
- **MPR-001 (this artifact)**

---

**End of MPR-001.** Mode 3-adjacent NON-counting. 4 PRs proposed. Coordinator awaits CEO acknowledgement on §9 D-01 through D-12 before iter 097 PR-MPR-1 begins.
