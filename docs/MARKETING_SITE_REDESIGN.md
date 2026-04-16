# Ledgerium AI — Marketing Site Redesign Plan

**Date:** 2026-04-16
**Status:** Proposed — Ready for Implementation
**Owner:** Coordinator
**Contributors:** UX Designer, Growth Strategist, Product Manager, Competitive Researcher

---

## Executive Summary

The current marketing site has strong bones — a clear value proposition, comprehensive documentation, and a polished interactive demo. However, it suffers from **navigation clutter (7 items), page overlap (two docs pages), stale content (/demo), and missing conversion elements (no social proof, no features page, no competitive positioning)**.

The `docs.html` and `dashboard.html` are the site's strongest assets but are poorly surfaced.

This plan proposes a redesigned marketing site with **4-item navigation**, a new **Product page**, consolidated documentation, and a futuristic design language matching the quality of the recently-created `docs.html`.

**All three specialist agents reached strong consensus on the core changes.** Where they disagreed, this document notes the decision and rationale.

---

## Team Consensus (What All 3 Agents Agreed On)

These recommendations had **unanimous agreement** across UX, Growth, and Product:

1. **Remove "Install" from the primary nav** — it presupposes commitment before a visitor understands the product
2. **Remove "About" from the primary nav** — low-traffic page for early-stage; move to footer
3. **Rename "How It Works"** — the label is generic and process-oriented; should communicate product value
4. **Promote `dashboard.html` aggressively** — it's the strongest marketing asset and is currently buried
5. **Consolidate `/docs` and `/docs.html`** — two documentation pages is confusing and a maintenance problem
6. **Add competitive positioning** — the site never addresses "how is this different from Scribe/Tango/Celonis"
7. **Social proof is critically missing** — no testimonials, logos, metrics, or case studies anywhere
8. **Create a dedicated Product page** — features are scattered across Home, Demo, and About; no single page shows what you get
9. **The AI agent intelligence feature is invisible** — the most differentiating paid feature isn't mentioned on any marketing page
10. **CTA "Record your first workflow" overpromises** — implies a 30-second experience but requires extension sideload

---

## Current State Assessment

### Page-by-Page Ratings (1-5 for launch readiness)

| Page | UX | Growth | PM | Avg | Key Issue |
|------|-----|--------|-----|-----|-----------|
| `/` (Home) | 3.5 | 4 | 3.5 | **3.7** | Missing social proof, dual demo CTAs cause confusion |
| `/demo` (How It Works) | 2 | 4 | 3 | **3.0** | Good copy but old screenshots, stops at free tier story |
| `/pricing` | 3.5 | 3 | 3.5 | **3.3** | 5 tiers is cognitively heavy, no feature comparison table |
| `/about` | 3 | 3 | 4 | **3.3** | Best narrative copy on the site but wasted on low-traffic page |
| `/install-extension` | 3 | 3 | 3 | **3.0** | Sideload process buried in fine print — biggest friction point |
| `/docs` (Next.js) | 3 | 2 | 2.5 | **2.5** | 1969 lines of text, no visual guide |
| `/docs.html` (Static) | 4.5 | — | — | **4.5** | Excellent but overlaps with /docs |
| `/dashboard.html` | 5 | 5 | 5 | **5.0** | **Best asset on the site. Unanimously rated highest.** |
| `/signup` | 3 | 3 | 3 | **3.0** | No post-signup expectation-setting |
| `/privacy`, `/terms` | 4 | 4 | 4 | **4.0** | Standard, adequate |

### Top Strengths (Consensus)
1. Hero headline "Your SOP says 5 steps. Your team takes 17." — universally praised
2. Interactive demo (`dashboard.html`) — strongest single marketing asset
3. Privacy/trust messaging — "No screenshots, no keystrokes" is genuinely differentiating
4. About page principles — "Observation over opinion, Evidence over interpretation" is sharp positioning
5. Demo page copy — "Get your first SOP in 60 seconds" with "no extension required" framing

### Top Weaknesses (Consensus)
1. **Extension sideload barrier is hidden** — the manual developer-mode install is the #1 conversion killer
2. **AI intelligence features invisible** — agent composition, process health, variant analysis not on any marketing page
3. **No product page** — visitors can't see what they get without signing up or finding the buried demo
4. **Upgrade story untold** — site positions as "free SOP tool" but doesn't show the Team/Growth intelligence layer
5. **Dual demo confusion** — hero has "See how it works" → /demo AND "Explore the live demo" → dashboard.html

---

## New Site Architecture

### Page Structure

| # | Route | Nav Label | Purpose | Status |
|---|-------|-----------|---------|--------|
| 1 | `/` | (logo) | Home / Landing | **Enhance** |
| 2 | `/product` | Product | Features + how it works + demo embed | **NEW** |
| 3 | `/pricing` | Pricing | Plans + feature table + FAQ | **Enhance** |
| 4 | `/docs` | Docs | Visual guide + full reference (merged) | **Merge & Enhance** |
| 5 | `/about` | — (footer) | Mission + team + differentiation | **Enhance, demote from nav** |
| 6 | `/install` | — (CTA target) | Extension install guide | **Rename, demote from nav** |
| 7 | `/demo` | — (redirect) | → `/product#demo` | **Redirect** |
| 8 | `/privacy` | — (footer) | Privacy policy | Keep |
| 9 | `/terms` | — (footer) | Terms of service | Keep |
| 10 | `/login` | — | Sign in | Keep |
| 11 | `/signup` | — | Create account | **Enhance** |

### Navigation

**Before (7 items):**
```
Logo | Live Demo | How It Works | Pricing | Install | About | Docs | [Sign in] [Start free]
```

**After (4 items):**
```
Logo | Product | Pricing | Docs | About | [Sign in] [Get Started →]
```

> **Decision note:** UX recommended dropping About entirely from nav. Growth recommended keeping it but moving it to the end. PM recommended replacing it with "Security" when that page exists. **Decision: Keep About in nav for now** (4 items is still clean), replace with Security later.

> **Decision note:** UX recommended "Demo" as a separate nav item pointing to dashboard.html. Growth recommended "Live Demo" as primary. PM recommended "Interactive Demo." **Decision: Embed the demo into the Product page** rather than giving it a separate nav slot. The Product page hero will feature the interactive demo prominently. A direct `/dashboard.html` link remains in the footer and in the Product page as a full-screen option.

### Footer

```
Product              Resources           Company            Legal
├─ Features          ├─ User Guide       ├─ About           ├─ Privacy
├─ Interactive Demo  ├─ Documentation    ├─ Contact         └─ Terms
├─ Pricing           └─ Install Extension
└─ Extension
```

---

## Page Specs

### 1. HOME (`/`) — Enhance

**Headline:** "Your SOP says 5 steps. Your team takes 17." (keep — unanimously praised)

**Changes from current:**

**a) Fix the hero CTAs** (all agents flagged this)
- Before: "Record your first workflow" (primary) + "See how it works" (secondary) + caption "Explore the live demo"
- After: "Get Started Free" (primary → /signup) + "See It In Action" (secondary → /product)
- Remove the duplicate caption demo link — it creates decision paralysis

**b) Add social proof strip** below hero (all agents flagged missing)
- Phase 1 (now): Metric strip — "Deterministic pipeline / Evidence-linked output / Privacy-by-architecture / 1,393 tests passing"
- Phase 2 (when available): "Used by ops teams at [N] companies" + logo bar
- Growth strategist note: "Record 5 canonical workflow SOPs for common use cases and show them as example outputs"

**c) Add inline example output** (PM flagged — "visitors can't see an SOP without signing up")
- Embed one pre-recorded SOP (use existing `/samples/sop-execution-sample.html`) via iframe or screenshot
- Caption: "This SOP was generated automatically from a 3-minute browser recording"

**d) Lift differentiation language from About page** (PM flagged — "best copy is wasted on low-traffic page")
- Add a "Built Different" section using the About page's strongest lines:
  - "Screen recorders give you annotated screenshots. Ledgerium gives you structured process data."
  - "Process mining requires IT integration. Ledgerium requires a Chrome extension."
  - "Documentation tools ask you to write. Ledgerium writes from what it observes."

**e) Reorder sections** (UX recommended)
1. Hero + CTAs
2. Social proof strip
3. How it works (3 steps — keep current, it's good)
4. Example output (NEW — inline SOP)
5. Feature highlights (3 cards with real screenshots)
6. Why Ledgerium is different (NEW — comparison section)
7. Who it's for (personas — move up, per UX recommendation)
8. Trust strip (move to directly precede final CTA)
9. Final CTA — single action: "Create free account"

**f) Remove** the "Why it matters / Your SOPs are already out of date" section (UX flagged — "repeats what the hero already says and delays arrival at product proof")

---

### 2. PRODUCT (`/product`) — NEW PAGE

**This is the #1 priority new page.** All three agents independently recommended it.

**Purpose:** Show everything the product does, tell the upgrade story, embed the interactive demo.

**Headline:** "From recording to process intelligence in minutes"

**Sections:**

1. **Hero with embedded demo**
   - Headline + subhead
   - Embedded dashboard.html iframe (80% width, framed with dark chrome)
   - Caption: "Explore with real sample data — no signup required"
   - Full-screen link: "Open full demo →"

2. **Product tour** (replaces stale /demo walkthrough)
   - 4-phase horizontal timeline with real screenshots:
   - **Record** → Extension screenshots (from docs/extension-screenshots/)
   - **Process** → Engine explanation with determinism callout
   - **Analyze** → SOP, process map, health scores
   - **Act** → AI agents, sharing, export
   - Use alternating text/screenshot layout from current /demo but with REAL screenshots

3. **What every recording produces** (keep from current /demo — it's good)
   - 4 cards: Workflow Steps, SOP Document, Process Map, Workflow Report

4. **The intelligence layer** (NEW — PM and Growth both flagged this gap)
   - "What happens when your library grows"
   - Process health scores, bottleneck detection, variant analysis, automation scoring
   - This is the Team/Growth upgrade story
   - Screenshots from the dashboard showing health scores and intelligence

5. **AI agent composition** (NEW — PM flagged: "highest-value feature is invisible to first-time visitors")
   - Show the agent intelligence output
   - "Ledgerium identifies which steps an AI agent could handle and generates implementation-ready compositions"

6. **Comparison table** (all agents recommended)
   - "How Ledgerium compares"
   - Columns: Ledgerium | Screenshot Tools (Scribe, Tango) | Process Mining (Celonis) | Manual Docs
   - Rows: Input method, Output type, Determinism, Evidence linking, Privacy, Time to value, IT required
   - Use checkmarks/x-marks for clarity

7. **CTA block**
   - Primary: "Get Started Free" → /signup
   - Secondary: "Install Extension" → /install

---

### 3. PRICING (`/pricing`) — Enhance

**Changes:**

1. **Add feature comparison table** below pricing cards (PM and Growth flagged)
   - Map every feature to its plan tier
   - Highlight the intelligence layer features in Team/Growth

2. **Add "Which plan is right for me?" guidance** (Growth flagged — "5 tiers creates decision paralysis")
   - One-liner framing: "Free: capture and document. Starter: clean exports. Team: understand and improve. Growth: automate."

3. **Add annual/monthly toggle** if not already visible at point of comparison (Growth flagged)

4. **Add "Most Popular" badge** on Team plan

5. **Add secondary CTA after FAQ:** "Still not sure? Explore the interactive demo first" → /product#demo

6. **Add competitive FAQ questions:**
   - "How is this different from Scribe or Tango?"
   - "How does this compare to process mining?"

7. **Flag unbuilt enterprise features** (PM flagged: "selling features that don't exist creates support problems")
   - Add "Coming soon" tags on SSO, custom retention, on-premise if not yet built

---

### 4. DOCS (`/docs`) — Merge & Enhance

**Problem:** Two competing docs pages — `/docs` (1969 lines, text-heavy) and `/docs.html` (visual, polished, screenshots)

**All agents agreed:** Consolidate to one URL.

**Implementation (recommended by UX):**

1. Make `/docs` the canonical URL (Next.js page with sidebar navigation)
2. Port the visual quality and screenshots from `docs.html` into the Next.js page
3. Structure: Visual guide as the hero/overview → detailed reference sections below
4. Add "Quick Start" section at the very top (3 steps: install → record → view SOP)
5. Redirect `/docs.html` to `/docs`

**Why not just use docs.html?** The Next.js page has sidebar navigation, section anchors, and can be server-rendered for SEO. The static HTML can't participate in the app's routing, auth, or analytics.

---

### 5. ABOUT (`/about`) — Enhance

**Keep:** Mission statement, 6 principles, "What makes Ledgerium different" — all agents praised this content.

**Add:**

1. **Competitive differentiation section** (explicit, not implicit)
   - "Unlike screenshot tools (Scribe, Tango)" → We capture structured events, not images
   - "Unlike process mining (Celonis)" → We work from the browser, not system logs
   - "Unlike documentation tools (Notion, Confluence)" → We observe, we don't interview
   - PM's suggested line: "Scribe shows what the screen looks like. Ledgerium captures what the workflow actually is."

2. **Team/founder section** (UX and PM flagged — builds trust for enterprise buyers)
   - Even "Founded in 2025" + founder note adds credibility
   - "Built by ops people, for ops people"

3. **CTA:** "See the product" → /product (UX: "visitors who came to about are researching, not converting — match their intent")

**Remove:** Redundant trust/compliance narrative that's better placed on homepage and pricing FAQ

---

### 6. INSTALL (`/install`) — Rename & Fix

**Route change:** `/install-extension` → `/install` (shorter, cleaner)
**301 redirect** from old URL.

**Critical fix** (Growth strategist's #1 priority):
> "The sideload process (developer mode, load unpacked) is the single biggest friction point in the product and the install page treats it as fine print."

- Make the developer-mode installation a **prominent numbered step-by-step UI element**, not a caption
- Add screenshots of each Chrome step
- Add "Already installed? Sign in →" link at the top (Growth flagged this gap)
- Add link to User Guide extension section for detailed walkthrough

**Not in primary nav** — accessible from:
- Product page secondary CTA
- Post-signup onboarding flow
- Footer under "Product"

---

### 7. SIGNUP (`/signup`) — Enhance

**Add "what happens next" preview** (Growth's #5 priority):

Below the signup form, add:
```
After signup:
1. Explore a sample workflow immediately — no extension needed
2. Install the extension when you're ready
3. Record your first workflow — SOP in under 5 minutes
```

This resolves the expectation gap between "Record your first workflow" and the reality of the sideload process.

**Key copy to add** (Growth flagged — currently on /demo but not on signup):
> "Sign up free, and explore a sample workflow SOP immediately — no extension install required."

---

### 8. SHARE PAGE (`/share/[token]`) — Minor Enhancement

**Add Ledgerium context for first-time viewers** (Growth flagged):
- "This SOP was generated automatically from a recorded workflow"
- "Create your own → Get Started Free"
- This is a high-leverage organic growth touchpoint

---

## Competitive Positioning (Synthesized)

### vs. Screen Recorders (Scribe, Tango, Guidde)

**Their approach:** Capture annotated screenshots as visual walkthroughs
**Ledgerium's edge:** Structured data with timing, system context, confidence scores, evidence traces
**Key line:** "Scribe gives you a screenshot walkthrough. Ledgerium gives you a process record."
**Proof point:** "You can't diff two screenshot SOPs. You can diff two Ledgerium recordings."

### vs. Process Mining (Celonis, Signavio)

**Their approach:** Analyze event logs from enterprise systems (SAP, Salesforce)
**Ledgerium's edge:** Works from the browser, no IT integration, captures the human layer
**Key line:** "Process mining tells you what your system recorded. Ledgerium tells you what your people actually did."
**Proof point:** "Enterprise process mining costs $200K and takes 6 months. Ledgerium gives you a process map in 5 minutes."

### vs. Documentation Tools (Notion, Confluence, Guru)

**Their approach:** Manual authoring — humans write and update documentation
**Ledgerium's edge:** Documentation from observation, not authoring
**Key line:** "Notion is where your SOPs go to become outdated. Ledgerium is where they stay current."

### Where to Surface This

- `/product` — dedicated comparison table section
- `/about` — "How we're different" section
- `/pricing` FAQ — "How is this different from Scribe?" question
- Homepage — "Built Different" section with 3 comparison chips

---

## Design Language

**Unify on the `docs.html` / `dashboard.html` aesthetic.** All agents noted these are the most polished pages on the site.

### Key Principles
- **Dark-first** with considered light mode support
- **Glass morphism** for nav and elevated surfaces (backdrop-blur, subtle borders)
- **Emerald accent** (#10b981) primary, violet (#8b5cf6) secondary
- **Large typography** for headlines (40-56px, tight tracking, weight 800)
- **Generous whitespace** — premium SaaS feel
- **Real product screenshots** everywhere — no illustrations, no stock photos
- **Subtle animations** — fade-in on scroll, smooth transitions

### Typography Scale
```
Hero H1:     40-56px / weight 800 / tracking -0.03em
Section H2:  28-32px / weight 700 / tracking -0.02em
Card H3:     18-20px / weight 600
Body:        14-16px / weight 400 / line-height 1.7
Caption:     11-12px / weight 500 / uppercase tracking
Mono:        13px / monospace / tabular-nums
```

### Component Patterns
- Feature cards: Dark surface, subtle border, rounded-xl, image top + content bottom
- Comparison tables: Dark header, alternating subtle row backgrounds
- Badges/chips: Rounded-full, transparent bg, colored text
- CTAs: Emerald primary (solid), ghost secondary (border only)
- Screenshots: Rounded-lg, subtle border, dark frame padding

---

## Implementation Priority

### Wave 1: Navigation & Routing (1-2 hours)
1. Update `PublicNav.tsx` — 4 items: Product, Pricing, Docs, About
2. Update `Footer.tsx` — new link structure
3. Add redirects: `/demo` → `/product`, `/install-extension` → `/install`
4. Create `/product` route (placeholder → full build in Wave 2)

### Wave 2: Product Page (4-6 hours) ← **Highest impact**
5. Build `/product` page with:
   - Embedded dashboard.html demo
   - Product tour with real screenshots
   - Intelligence layer showcase
   - Comparison table
   - Strong CTAs

### Wave 3: Home Page Enhancement (3-4 hours)
6. Fix hero CTAs (remove dual-demo confusion)
7. Add social proof strip
8. Add inline example SOP
9. Add "Built Different" comparison section
10. Reorder sections per UX recommendation

### Wave 4: Docs Merge (3-4 hours)
11. Port `docs.html` visual content into Next.js `/docs` page
12. Add Quick Start section
13. Redirect `/docs.html` → `/docs`

### Wave 5: Supporting Pages (2-3 hours each)
14. Enhance Pricing — feature table, annual toggle, competitive FAQ
15. Enhance About — competitive positioning, team section
16. Fix Install page — prominent sideload steps
17. Enhance Signup — "what happens next" preview

### Wave 6: Future Growth Pages
18. `/security` — dedicated privacy/trust page for enterprise
19. `/use-cases/operations` — persona landing page
20. `/use-cases/compliance` — persona landing page
21. Blog infrastructure
22. ROI calculator on pricing

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Primary nav items | 7 | 4 |
| Pages with social proof | 0 | 3+ |
| Pages with competitive positioning | 0 | 3+ |
| Signup conversion from /product | N/A (doesn't exist) | > 5% |
| Demo engagement (time on dashboard.html) | Low (buried) | > 90s avg |
| Docs confusion (two pages) | 2 URLs | 1 URL |
| Install page sideload visibility | Fine print | Prominent step-by-step |

---

## Open Questions for Founder

1. **Enterprise tier features** — Are SSO, custom retention, on-premise built or roadmap? (PM flagged: don't sell unbuilt features)
2. **SOP execution mode** — Is `SOPExecutionMode` component shipping? (PM: "if so, it's the strongest training use case and no competitor has it")
3. **Chrome Web Store timeline** — When will the extension be in the store vs. manual sideload? (Growth: "this is the #1 conversion killer")
4. **Founder story / team info** — Any content for the About page team section?
5. **Real usage metrics** — Can we surface "X workflows captured" as a live counter from the analytics DB?
6. **Budget for first paid campaign** — Growth strategy depends on whether we're doing organic-only or running ads to specific pages

---

## Files to Modify

### Navigation
- `apps/web-app/src/components/PublicNav.tsx` — reduce to 4 nav items
- `apps/web-app/src/components/Footer.tsx` — new 4-column link structure

### New Pages
- `apps/web-app/src/app/(public)/product/page.tsx` — NEW product page

### Enhanced Pages
- `apps/web-app/src/app/(public)/page.tsx` — homepage enhancements
- `apps/web-app/src/app/(public)/pricing/page.tsx` — feature table, competitive FAQ
- `apps/web-app/src/app/(public)/about/page.tsx` — competitive positioning, team section
- `apps/web-app/src/app/(public)/docs/page.tsx` — merge visual guide content
- `apps/web-app/src/app/(public)/signup/page.tsx` — post-signup expectation setting

### Routing
- `apps/web-app/src/app/(public)/demo/page.tsx` — redirect to /product
- `apps/web-app/src/app/(public)/install/page.tsx` — renamed from /install-extension
- `apps/web-app/next.config.js` — add redirects for old URLs

### Assets
- `apps/web-app/public/docs/screenshots/extension/` — extension screenshots (already captured)
- `apps/web-app/public/docs/screenshots/` — web app screenshots (already captured)
