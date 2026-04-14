# Ledgerium AI — Brand & Visual Identity Recommendations

**Date:** 2026-04-14
**Status:** Recommendations — awaiting decision
**Sources:** UX Audit, Competitive Research, Growth Strategy, Market Research
**Decision required from:** Phil

---

## Executive Summary

The team identified a **critical brand consistency problem** and a **major strategic opportunity**.

**The problem:** Ledgerium currently presents three different visual identities across its three surfaces — a dark/green marketing site, a light/blue web app, and a light/blue extension. A user clicking "Sign In" from the landing page experiences what feels like switching to a different product. Visual consistency score: **2 out of 5**.

**The opportunity:** Every direct competitor (Scribe, Tango, Loom, Guidde) occupies the same purple/consumer-friendly visual space. The "precision intelligence platform" tier — dark, authoritative, data-forward — is **completely unclaimed** in the workflow capture category. Ledgerium's positioning ("deterministic, evidence-linked, immutable") naturally belongs in this tier.

---

## 1. The Core Problem: Three Products, Three Identities

| Surface | Mode | Primary Color | Typography | Personality |
|---------|------|--------------|------------|-------------|
| Marketing site | Dark | Green `#20f2a6` | System sans | Premium AI platform |
| Web app | Light | Blue `#006fc7` | System sans + ds scale | Enterprise SaaS utility |
| Extension | Light | Blue `#2563EB` | Inter (fallback to system) | Internal tool |

The logo (green gradient diamond mark) appears only on the marketing site. The web app and extension render "Ledgerium AI" as plain text. Border radius, spacing, and component styles diverge across all three surfaces.

**Impact:** Users who convert from marketing → product experience a trust-breaking visual discontinuity. The premium impression created by the landing page is not carried into the product.

---

## 2. Competitive Landscape: A Purple Monoculture

| Competitor | Primary Color | Mode | Category Signal |
|-----------|--------------|------|----------------|
| **Scribe** | Purple `#7C3AED` | Light | Approachable documentation helper |
| **Tango** | Purple/Indigo `#6366F1` | Light | Approachable documentation helper |
| **Loom** | Purple `#7C3AED` | Light | Approachable communication tool |
| **Guidde** | Blue-violet gradient | Dark-capable | AI-adjacent documentation |
| **Celonis** | Navy + Green | Dark-first | Enterprise process intelligence |
| **Linear** | Dark + Indigo | Dark-first | Premium developer tool |
| **Vercel** | Black + White | Dark-first | Premium infrastructure |

**Key insight:** All four direct competitors use purple/indigo in light mode. They compete visually for the same "friendly helper tool" perception. The precision/intelligence tier is occupied only by enterprise analytics tools (Celonis) and developer platforms (Linear, Vercel) — neither of which is a workflow capture tool.

**Ledgerium's opening:** Own the "intelligence platform" visual position in workflow capture. No competitor occupies it.

---

## 3. Recommended Brand Direction

### 3A. Color System: Dark-Anchored Intelligence Palette

**Rationale:** "Deterministic, evidence-linked, immutable" maps to precision and authority, not warmth and approachability. A dark-anchored palette signals intelligence, depth, and technical credibility — and immediately differentiates from every direct competitor.

#### Proposed Palette

| Role | Color | Hex (approximate) | Rationale |
|------|-------|--------------------|-----------|
| **Surface (dark)** | Deep slate | `#0D1117` to `#111827` | Intelligence, depth — not pure black (too harsh) |
| **Surface (light)** | Cool off-white | `#F8FAFC` to `#F1F5F9` | Precision, not warmth — slate undertone |
| **Primary accent** | Precision green | `#20f2a6` / `#10B981` | Already used on marketing site — KEEP THIS. Evidence, accuracy, data |
| **Secondary accent** | Muted steel blue | `#64748B` to `#94A3B8` | Information hierarchy, navigation |
| **Data highlight** | Amber | `#F59E0B` | Signals, anomalies, attention — used sparingly |
| **Error/warning** | Red-amber | `#EF4444` / `#F97316` | Errors, limits reached |
| **Text (on dark)** | Near-white | `#E2E8F0` to `#F1F5F9` | High contrast, legible |
| **Text (on light)** | Near-black | `#0F172A` to `#1E293B` | Authority, readability |

#### Why green over blue?
- The marketing site **already uses green** (`#20f2a6`) — this is the brand's strongest existing visual asset
- Green signals precision, data, evidence, and accuracy in analytics contexts
- Blue is the most saturated SaaS color — it contributes zero distinctiveness
- Green differentiates from ALL direct competitors (purple) and adjacent tools (blue)
- The green/dark combination already works on the landing page — extend it everywhere

#### What to retire
- Web app blue (`#006fc7`) — replace with the green accent on dark/light surfaces
- Extension blue (`#2563EB`) — align to shared palette
- The current three-way split becomes ONE unified identity

### 3B. Typography

| Role | Recommendation | Rationale |
|------|---------------|-----------|
| **Headings** | Inter Display (bold/semibold) or a high-contrast geometric sans | Authority without being dated; Inter is already referenced in extension |
| **Body/UI** | Inter (regular/medium) | Clean, neutral, excellent readability at small sizes |
| **Mono** | JetBrains Mono or IBM Plex Mono | Use deliberately for data, evidence tokens, IDs — signals technical legitimacy |

**Key move:** Use monospace elements as a brand signal. Display evidence IDs, confidence scores, and timestamps in mono. No competitor does this — it visually reinforces "every output is traceable."

### 3C. Logo & Brand Mark

**Current state:** Green gradient diamond mark exists but is only used on marketing site. Web app and extension use text-only.

**Recommendation:**
- **Keep the diamond/layers mark** — it communicates depth, structure, and process layering well
- Use it consistently across all three surfaces (marketing, web app nav, extension header)
- At 16x16 (extension icon): simplified mark in green on dark slate circle
- At larger sizes: mark + "Ledgerium" wordmark in mixed case (authoritative, not playful)
- Retire "Ledgerium Recorder" as a sub-brand — one product, one mark

### 3D. Mode Strategy

| Approach | Recommendation |
|----------|---------------|
| **Marketing site** | Dark-first (already is — keep it) |
| **Web app** | Light default with dark mode option |
| **Extension sidebar** | Match web app mode preference |

**Rationale:** The marketing site's dark mode creates the premium impression that draws sign-ups. The web app should default to light (non-technical ops buyers prefer it) but offer dark mode. The critical fix is **visual continuity** — same colors, same components, same brand feel regardless of mode.

---

## 4. Visual Component Priorities

Ranked by conversion impact:

### Priority 1: Real Product Screenshots (CRITICAL)
The single highest-conversion-impact change. The demo page has placeholder boxes. No visitor can see what Ledgerium actually produces without signing up.

**Action:** Capture and publish:
- A real rendered SOP (4-5 steps with timing and confidence)
- A real process map visualization
- The dashboard with workflows listed
- Place on: homepage hero, demo page, pricing page

### Priority 2: Surface the Sample Workflow on Landing Page
The "Create Purchase Order" sample workflow exists in the backend. Export the rendered SOP output and embed it visually in the hero or "Every recording produces real output" section. One real example outperforms six feature bullets.

### Priority 3: Trust Signal Placement
Move these from buried/missing to prominent at decision points:
- "No screenshots. No keystrokes. Your data is private." — above signup form
- "SOC 2 in progress. Data never used for training." — next to pricing CTAs
- Link security.html from the signup and pricing pages

### Priority 4: Visual Comparison with Alternatives
Add a two-column layout showing:
- What screenshot tools produce (annotated screenshots, click guides)
- What Ledgerium produces (structured events, evidence-linked steps, process maps)
- Don't name competitors — let the output difference speak

### Priority 5: Evidence-Chain Visual Motifs
Build subtle brand texture from evidence concepts:
- Connecting lines between data points
- Hash/fingerprint visual elements
- Provenance trail graphics
- NOT: neural networks, robot mascots, AI brain imagery (undermines "deterministic, not magical")

---

## 5. Anti-Patterns to Avoid

| Don't | Why |
|-------|-----|
| Rainbow AI gradients | Reads as hype-chasing; contradicts precision positioning |
| Robot/AI mascot | Undermines "deterministic, not magical" |
| Stock photos of people on laptops | Signals low investment |
| Pure black backgrounds (#000) | Too harsh; use deep slate instead |
| Dark mode as ONLY option | Non-technical ops buyers may resist; offer light default |
| "Powered by AI" as a headline | Table-stakes noise in 2026, not differentiation |
| Rounded/playful fonts | Undercuts authority and precision |
| Decorative illustrations | Show the actual product; illustrations signal immaturity |

---

## 6. Implementation Sequence

### Phase 1: Unify (1-2 days)
- Define shared color tokens in one place (Tailwind config)
- Replace web app blue with green accent
- Add logo mark to web app nav and extension header
- Align border radius across surfaces

### Phase 2: Polish (2-3 days)  
- Capture real product screenshots
- Add to homepage, demo page, pricing page
- Add trust signals to signup and pricing CTAs
- Add evidence/comparison section to landing page

### Phase 3: Elevate (3-5 days)
- Implement proper type system (Inter + mono for data)
- Add dark mode toggle to web app
- Build evidence-chain visual motifs for brand texture
- Redesign extension sidebar to match unified brand

### Phase 4: Refine (ongoing)
- Add social proof as it becomes available (beta user quotes)
- A/B test dark vs light defaults for web app
- Build tier-specific visual treatments (Free watermark vs premium clean)

---

## 7. Decision Points for Phil

1. **Green or something else?** The marketing site already uses green (`#20f2a6`). All four specialists recommend keeping it and extending it to the web app/extension. Do you agree, or do you want to explore other accent colors (amber, teal, cyan)?

2. **Dark-first web app or light-first with dark option?** Marketing site is dark. Competitive research says dark-first differentiates. Growth strategy says light default is safer for ops buyer ICP. Recommendation: light default + dark option. Your call.

3. **Typography investment?** Loading Inter as a web font (vs. system stack) adds ~20KB but creates consistency. Worth it?

4. **Logo consistency:** Use the existing diamond mark everywhere, or commission a refresh?

5. **Timing:** Unify colors now (Phase 1) before or after committing the F1+F2+F3 feature gating work?

---

## Appendix: Sources

- **UX Designer:** Full codebase audit — exact hex values, file paths, consistency analysis
- **Competitive Researcher:** 9-competitor analysis — color palettes, typography, design patterns, unclaimed territory
- **Growth Strategist:** Conversion-focused assessment — trust signals, screenshots, CTA placement, ICP alignment  
- **Market Research:** B2B SaaS best practices — color psychology, hero patterns, extension branding, anti-patterns
