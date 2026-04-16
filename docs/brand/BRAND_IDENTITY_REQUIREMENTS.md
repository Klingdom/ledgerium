# Brand Identity Requirements — Ledgerium AI
Version: 1.0
Date: 2026-04-15
Owner: Product (PM Agent)
Status: APPROVED FOR DESIGN

---

## 1. What This Document Is

This is the product definition for Ledgerium AI's visual identity system.

It defines:
- what the brand must communicate
- logo format and size requirements
- three distinct logo directions with rationale
- all remaining visual identity decisions at this stage of the product

It does NOT define:
- final visual executions (that is design's job)
- code implementation (that is engineering's job)
- marketing copy (that is content's job)

---

## 2. What the Brand Must Communicate

### Core Attributes (in priority order)

1. **Precision** — This product produces structured, deterministic outputs. The brand must feel exact, not approximate. No organic, hand-drawn, or casual aesthetics.

2. **Trust / Evidence** — The product is a record of truth. "Ledgerium" evokes a ledger — immutable, auditable, authoritative. The brand must signal credibility, not hype.

3. **Intelligence without artificiality** — This is an AI product, but the value proposition is evidence-based, not generative. The brand must not lean on generic "AI blue" or sci-fi aesthetics. It should feel grounded and systematic.

4. **Operational clarity** — The buyer is an ops team, not a developer or executive. The visual language must feel organized and actionable, not abstract or conceptual.

### What the Brand Must NOT Feel Like
- Startup-generic (gradients, purple-blue, sparkle icons)
- Security/fintech (heavy, cold, corporate gray)
- Analytics-generic (chart bars, upward arrows)
- "AI magic" (floating neural nodes, glowing orbs)

### Brand Position in One Sentence
Ledgerium AI is the platform that turns observed work into structured truth — and that idea must be visible in the mark.

---

## 3. Current State Audit

What exists today:

| Asset | Location | Status |
|---|---|---|
| SVG logo mark (3 stacked diamonds, green stroke) | `assets/img/logo.svg` | Functional, needs design evaluation |
| React LogoMark component (inline SVG) | `apps/web-app/src/components/shared/LogoMark.tsx` | In production |
| React LogoFull component (mark + wordmark) | same file | In production |
| og:image SVG | `assets/img/og.svg` | Exists, uses system fonts (risky for rendering) |
| Extension icon | `apps/extension-app/icons/icon-128.png` | Single size only — insufficient |
| Primary logo PNG | `apps/web-app/public/img/ledgerium_primary_logo.png` | Exists, provenance unknown |
| Recorder logo PNG | `apps/web-app/public/img/ledgerium_recorder_logo.png` | Exists, provenance unknown |

Gaps identified:
- No favicon `.ico` or multi-size favicon set
- No SVG favicon (modern browsers)
- Extension icon exists at 128px only — Chrome Web Store requires 16, 48, 128
- og:image uses system-ui font stack — rendering varies by platform
- No dark/light logo variants documented
- No brand color usage rules documented
- No minimum size rules documented
- No clear file naming or export conventions

---

## 4. Logo Requirements

### 4.1 What the Logo Must Do

The logo is used in 6 distinct contexts. Each has different constraints.

| Context | Constraints |
|---|---|
| App nav (web) | Dark background, small size (24–32px height), must be legible at that size |
| Favicon (browser tab) | 16x16 and 32x32 — mark only, no wordmark possible |
| Chrome extension icon | 16x16, 48x48, 128x128 — must work on both light and dark OS chrome |
| Chrome Web Store listing | 128x128 icon + promotional tile (440x280) |
| og:image / social card | 1200x630 — wordmark + tagline, designed for link previews on dark background |
| Printed / exported SOPs | Must work in grayscale and at small sizes in document headers |

### 4.2 Required Deliverables — Logo Formats

All of the following must be produced:

**Vector source**
- `logo-mark.svg` — mark only, no background, no wordmark
- `logo-full-dark.svg` — mark + wordmark, optimized for dark backgrounds
- `logo-full-light.svg` — mark + wordmark, optimized for light backgrounds
- `logo-mark-on-dark.svg` — mark with rounded-rect dark background (for use on white pages, print)
- `logo-mark-mono.svg` — single-color version for grayscale print / embossing

**Raster exports from vector source (not designed separately)**
- `favicon-16.png`
- `favicon-32.png`
- `favicon-180.png` (Apple touch icon)
- `icon-16.png` (extension)
- `icon-48.png` (extension)
- `icon-128.png` (extension)
- `og-image.png` — 1200x630, rendered from designed template (not from SVG with system fonts)
- `social-card-twitter.png` — 1200x600 variant if proportions differ

**React component (existing, update after final mark)**
- `LogoMark.tsx` — inline SVG, accepts `size` prop
- `LogoFull.tsx` — mark + wordmark, accepts `size` and `variant` (dark/light) props

### 4.3 Size Constraints

| Minimum size | Context | Requirement |
|---|---|---|
| 16x16 | Favicon, extension | Mark must remain distinct — not an indistinct blob |
| 24px height | App nav | Wordmark readable at this size |
| 32px height | App nav (wide screens) | Standard nav usage |
| 128px | Extension store, large contexts | Full fidelity |

### 4.4 Color Rules

| Context | Color behavior |
|---|---|
| Dark background | Brand green stroke (#20f2a6 to #0adf92 gradient) on transparent background |
| Light background | Either: (a) same green on white if contrast passes, or (b) dark (#070a09) mark |
| Grayscale / print | Mono version required — must not rely on color to be recognizable |
| Active / hover states in UI | No animation on logo mark — static only |

Current brand colors in use:
- Accent bright: `#20f2a6`
- Accent standard: `#059669` (Tailwind brand-600)
- Background dark: `#0D1117`
- Background elevated: `#1C2128`

These must be confirmed as canonical before the logo is finalized against them.

---

## 5. Logo Direction Recommendations

Three directions are provided. These are not visual executions — they are design briefs with rationale. The design agent should treat these as starting hypotheses to explore, not mandates.

---

### Direction A — Refined Diamond Stack (Evolve What Exists)

**Concept:** Retain the three-diamond motif but treat it as a deliberate record/layer metaphor rather than a generic geometric shape. Each diamond represents a layer: raw event → structured process → intelligence output. The stacking communicates determinism — one thing leads to the next.

**What changes from current state:**
- Current diamonds are stroke-only at 12px weight, which renders poorly at small sizes. Redesign as filled shapes with outline treatment, or adjust proportions so the form survives at 16px.
- The three shapes are too evenly spaced — no visual hierarchy. The top diamond should be the most prominent (the "record"), fading slightly toward the bottom.
- The gradient direction and values should be reviewed for WCAG contrast against both dark and light backgrounds.

**Why this direction:**
- Continuity — existing users and marketing materials recognize the form
- The layering metaphor is genuinely on-brand (ledger = stacked entries)
- Diamonds are already used in the domain (process maps often use diamond decision nodes — a subtle resonance)

**Risk:**
- Diamonds are common in fintech, crypto, and generic SaaS — requires strong execution to feel distinctive
- At 16px, three stacked shapes become unreadable regardless of refinement — may require a single-diamond favicon variant

**Favicon strategy:** Use a single diamond at 16px.

---

### Direction B — The Ledger Mark (New Direction, On-Name)

**Concept:** Abstract the word "ledger" visually. A ledger is a ruled book of records — horizontal lines, structure, entries. The mark uses 3–4 horizontal bars of decreasing width (like ledger lines), where the top bar is full-width and each subsequent bar is slightly shorter — suggesting a list of entries being recorded, or a process narrowing toward a single truth.

This reads as: recording → structuring → precision output.

**What this communicates:**
- Structure and precision without being a chart or graph
- Directly tied to the product name's etymology
- Clean at all sizes because it reduces to lines (not shapes)
- Looks like documentation — the product's core output

**Why this direction:**
- Highly distinctive in the process intelligence space
- Works at 16px (3 horizontal lines are legible even as a favicon)
- Creates a visual system — the bar motif can extend into UI patterns (progress indicators, step markers, data rows)
- Feels like a tool for ops people, not a startup logo

**Risk:**
- Horizontal bars can read as a hamburger menu icon or loading indicator at small sizes
- Requires careful proportioning to avoid confusion with generic "list" icons
- Less "AI" feeling — but that may be a feature, not a bug, given the positioning

**Favicon strategy:** 3 bars, the brand green, on dark square — clearly distinct from hamburger menus due to bar widths and proportions.

---

### Direction C — The Process Node (New Direction, Product-First)

**Concept:** A single geometric node — circle or rounded square — with a connecting line or path fragment entering and exiting. This represents a step in a process: one node in a workflow graph, the fundamental unit of what Ledgerium records.

Think: the "start/end" node from a flowchart, reduced to its simplest form. The brand green fills the node; the connecting paths are thin strokes.

**What this communicates:**
- The product is about process — and this is the atom of a process
- "We capture the nodes" — we record individual steps, not just outcomes
- Clean, modern, works in tech contexts without being generic
- Immediately legible at 16px because it reduces to a single filled shape

**Why this direction:**
- Strongest at small sizes — a single node is immediately recognizable
- Most differentiated from current logo — clear reset signal if positioning is evolving
- Flexible — can show 1 node (mark), 2 connected nodes (extended mark), or a small graph (marketing illustrations)
- Connects to the process map output the product generates

**Risk:**
- "Node" metaphors are common in workflow tools (Zapier, n8n, Make) — must be executed distinctively
- Less connection to the "ledger/record" etymology of the name
- May require strong wordmark typography to carry the brand weight the mark alone doesn't establish

**Favicon strategy:** Filled circle/node with no connecting lines — pure filled shape at 16px.

---

## 6. Recommended Direction

**Direction A (Refined Diamond Stack) as the conservative path. Direction B (Ledger Mark) as the bold path.**

Rationale:
- Direction A preserves continuity and invests in refining what already exists in production code and marketing assets. The risk is execution quality.
- Direction B is more differentiated, more legible at small sizes, and more tightly tied to the product's core metaphor. It requires a full rebrand of existing assets but produces a more defensible visual identity.
- Direction C is viable but enters more crowded visual territory in the workflow tool space.

**This recommendation requires a design decision from stakeholders before design work begins. Both A and B should be explored at the sketch stage before one is committed.**

---

## 7. All Remaining Visual Identity Decisions

This section catalogs every visual/brand decision not yet made or documented. These are not all PM responsibilities — they are listed so no decision falls through the cracks.

### 7.1 Typography

**Status: Partially decided (Inter is in use). Not formally documented.**

Decisions needed:
- Is Inter the permanent brand typeface for all contexts, or only the web app?
- What typeface is used in the wordmark specifically? (Currently a CSS text element — not a true typographic mark)
- Is there a display typeface for marketing headers or is Inter used everywhere?
- What is the type scale for marketing pages vs. app UI vs. exported documents?

Current state: Inter is loaded via `next/font/google`. No font pairing, no display face, no explicit type rules beyond the Tailwind ds-* scale.

### 7.2 Color System

**Status: Partially decided. Not formally documented as a brand spec.**

Decisions needed:
- Confirm canonical brand colors as a named set (currently split between Tailwind config and CSS vars — they do not fully align)
- Define which color is "the brand color" for external usage (og:image uses `#20f2a6`, app uses `#059669` as primary button — these are different)
- Define semantic color rules for success, warning, error, info states
- Define color rules for the extension popup specifically (it operates outside app context)
- Define rules for light mode brand expression — currently light mode surfaces exist in CSS vars but no light-mode marketing page or logo usage has been tested

Missing canonical decisions:
- Primary brand color: `#20f2a6` (accent bright) or `#059669` (brand-600)?
- Background canonical color for brand usage: `#0D1117` or `#070a09`? (currently inconsistent between logo.svg and globals.css)

### 7.3 og:image / Social Card System

**Status: One og.svg exists. Not a complete system.**

Decisions needed:
- The current og.svg uses `system-ui, -apple-system, Segoe UI, Roboto, Arial` — this renders differently per platform. Must be replaced with a rasterized image or Satori-generated PNG with embedded fonts.
- Per-page og:image strategy: does every page get a unique og:image or is one shared?
- Twitter card type: `summary_large_image` or `summary`?
- LinkedIn and Slack preview behavior (these use og: tags — same asset, but proportions differ)

Required og:image variants:
- Default (homepage / app)
- Pricing page variant
- Docs page variant
- Shared workflow variant (dynamic — shows workflow name, step count, team name)

The shared workflow variant is a product feature, not just a brand asset. It needs a PM specification of its own.

### 7.4 Chrome Web Store Assets

**Status: Not produced.**

Required by Chrome Web Store:
- Extension icon: 128x128 PNG (exists — needs quality review)
- Store listing screenshot: 1280x800 or 640x400 (minimum 1 required, up to 5 recommended)
- Promotional tile small: 440x280 PNG
- Promotional tile large: 920x680 PNG (optional but needed for featured placement)

These are not marketing judgment calls — they are store submission requirements.

### 7.5 Email Templates

**Status: No email templates exist in the codebase.**

The product sends transactional emails. The brand must be present in those emails.

Decisions needed:
- Email provider (not yet identified in codebase)
- Template structure: header (logo + wordmark), body, footer (unsubscribe, legal)
- Required transactional emails: welcome, verification, password reset, workflow shared (notification), plan upgrade/downgrade, billing receipt, trial expiry warning
- HTML email vs. plain text fallback strategy

This is a product requirement gap. Transactional email templates do not exist.

### 7.6 In-App Illustration and Empty State System

**Status: No illustration system defined.**

The app has empty states (no workflows recorded, no team members, etc.). These need a visual treatment.

Decisions needed:
- Illustration style: icon-based (Lucide icons at large size), custom SVG illustrations, or photography?
- Empty state pattern: consistent layout (icon + headline + CTA) or per-context variation?
- Loading/skeleton state visual language

Current state: Lucide icons are used throughout the app. Using oversized Lucide icons for empty states is a defensible low-cost approach for now.

### 7.7 Documentation Visual System

**Status: A docs page exists. No distinct docs visual system defined.**

The docs page at `/docs` uses the same marketing nav and site chrome. At this stage that is acceptable, but decisions are needed:

- Does documentation stay in the main app or move to a dedicated subdomain (docs.ledgerium.ai)?
- Does documentation have its own typography and layout system or inherit from marketing?
- Are code blocks styled to match the brand?
- Are screenshots in docs standardized (same window chrome, same screen size, same annotation style)?

### 7.8 Exported Document Branding

**Status: Print styles exist in globals.css. No brand treatment for exported PDFs defined.**

The product generates SOPs and process maps. These are exported by users and shared with colleagues, auditors, and stakeholders. They are the primary brand touchpoint with non-users.

Decisions needed:
- Does the logo appear in exported PDF headers?
- Is there a "Generated by Ledgerium AI" attribution in the footer (currently `ds-attribution` component exists but is not specified)?
- On the Free plan: is a watermark added? (Referenced in pricing FAQ but not designed)
- What is the watermark design? Location, size, opacity?
- What font is used in exported documents — system fonts or embedded?

This is a product feature with brand implications, not just a design decision. It requires PM sign-off.

### 7.9 Marketing Collateral

**Status: Not produced. Deferred until appropriate.**

For the current stage (pre-Series A, direct/PLG motion), the following are low priority but should be tracked:

- One-pager / leave-behind (PDF) — for sales-assisted deals
- Pitch deck template — for investor conversations
- Case study template — when first customer stories are available

These are explicitly deferred. Flag when a sales motion requires them.

### 7.10 Brand Usage Rules (Internal Document)

**Status: Does not exist.**

As the number of people and agents touching brand assets grows, a brief brand usage document is needed. It does not need to be a full brand guidelines PDF. It must cover:

- Logo do's and don'ts (minimum size, clear space, background rules)
- Canonical color values (not Tailwind class names — actual hex values)
- Typography rules (which font, which weights, which sizes for which contexts)
- What "Ledgerium AI" looks like in prose (capitalization, spacing — is it "Ledgerium AI" or "LedgeriumAI" or "Ledgerium"?)
- Asset file naming conventions and storage location

This document should live at `docs/brand/BRAND_USAGE.md` and be maintained by design.

---

## 8. Open Assumptions (Must Be Resolved Before Design Starts)

| # | Assumption | Required Decision | Owner |
|---|---|---|---|
| 1 | Direction A vs Direction B is not decided | Stakeholder must select direction before design begins | Founder / PM |
| 2 | Canonical primary brand color is ambiguous (#20f2a6 vs #059669) | Pick one as the "brand color" for external representation | PM + Design |
| 3 | Background canonical dark color inconsistent (logo.svg uses #070a09, globals.css uses #0D1117) | Align to one value | Design + Engineering |
| 4 | "Ledgerium AI" vs "Ledgerium" — product name in prose | The og:image, homepage, and app use both. Decide the canonical short name | Founder |
| 5 | Exported document watermark (Free plan) — not designed | Define before watermark is built | PM |
| 6 | og:image must be rasterized | Current SVG with system fonts is not reliable — engineering must implement Satori or similar | Engineering |
| 7 | Extension icon set is incomplete | 16px and 48px PNGs do not exist — Chrome Web Store will reject submission | Design + Engineering |

---

## 9. Priority Sequence

Work should happen in this order to unblock the most downstream agents:

1. Resolve logo direction decision (stakeholder)
2. Produce logo mark at all required sizes (design)
3. Update LogoMark.tsx and LogoFull.tsx with final SVG paths (engineering)
4. Produce og:image as a rendered PNG (design + engineering — Satori implementation)
5. Produce extension icon set at 16, 48, 128px (design)
6. Define canonical color values and update both Tailwind config and CSS vars to match (engineering)
7. Define typography rules (design)
8. Produce email templates — welcome and verification as P1 (design + engineering)
9. Define exported document header/footer/watermark (PM spec → design → engineering)
10. Produce Chrome Web Store listing assets (design)

---

## 10. Success Criteria for This Phase

Brand identity work at this stage is complete when:

- Logo renders correctly at 16px (favicon), 24px (app nav), 128px (extension store)
- og:image renders correctly on Twitter, LinkedIn, Slack, and iMessage previews — verified by test
- Chrome Web Store submission is accepted (requires complete icon set and store assets)
- LogoMark.tsx and LogoFull.tsx reflect the final mark with no gradient ID conflicts
- Canonical color values are documented in one place and applied consistently across tailwind.config.ts and globals.css
- A brief brand usage document exists at docs/brand/BRAND_USAGE.md

These are observable and verifiable. Brand work is not complete until they pass.
