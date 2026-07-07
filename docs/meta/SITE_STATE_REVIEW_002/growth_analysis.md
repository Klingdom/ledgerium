# Site State Review 002 — Growth / Positioning / AEO Analysis

**Track:** Growth Strategist (positioning, messaging, SEO/AEO conversion strategy, brand voice, activation copy)
**Mode:** 3-adjacent, read-only, NON-counting. No code modified.
**Date:** 2026-07-07
**Scope read:** `apps/web-app/src/app/(public)/page.tsx` (home), `product/page.tsx`, `pricing/page.tsx`, `use-cases/ai-implementation/page.tsx`, `compare/[slug]/page.tsx` + `content/pages/compare.ts` (Process Street entry), `content/pages/competitors.ts`, `methodology/page.tsx`, `components/seo/{Blocks,FaqBlock,SeoPageView,ComparePageView}.tsx`, `lib/seo/jsonLd.ts`, `app/llms.txt/route.ts`, `app/layout.tsx`.

---

## 1. Is the hero/positioning coherent and differentiated?

**Coherent for today's shipped product; NOT the AI-vision positioning.** Home hero ("Your SOP says 5 steps. Your team takes 17.") and `/product` hero ("From recording to process intelligence in minutes") both sell **capture → SOP/process-map → AI-readiness scoring**. Evidence-linked determinism *is* visible and reinforced repeatedly ("Same input, same output — always," "Evidence-linked output," "No AI guessing," "Every step traces to observed evidence") — this part of the moat lands well and is a genuine differentiator vs. Scribe/Tango (screenshot tools) and Celonis-class process mining, both directly named in the "Built Different" comparison section.

What's **absent**: the AI-vision candidate positioning — *"the AI integration platform that... maps exactly where AI fits and executes it when you're ready"* — does not appear anywhere in the hero, value props, or "Built Different" section. Worse, the site **actively disclaims execution**: the Process Street compare page states "Ledgerium is not a checklist-execution platform" and lists "Teams that want a platform to execute, not just document, a workflow" as a reason to pick the *competitor*. `/use-cases/ai-implementation` ("Observe. Blueprint. Measure.") positions Ledgerium as a **data/blueprint provider for external tools** (n8n, Zapier, custom agent frameworks) — the opposite of Ledgerium executing the recommendation itself. This is a direct, publicly-committed contradiction of the internal AI-vision roadmap (BYOK, R0–R4 irreversibility tiers, dry-run/execute MVP gates) and is exactly the "AI-washing" risk the original AI-vision review flagged when it recommended progressive disclosure before repositioning.

## 2. AEO/SEO strategy soundness

**Technically strong, well above typical SaaS execution.** Confirmed via code read:
- `Speakable` JSON-LD (`cssSelector: ['.seo-answer', '.seo-datapoint']`) targets the hero direct-answer + the one-fact `DataPointCallout` — correct AEO extraction pattern.
- `KeyTakeaways` (3–5 self-contained bullets in the first-30% zone), `HonestLimitation`, and mandatory competitor-strength concession on every compare page (`competitorStrength` + `whenCompetitorFits`) are genuinely good citation-bait for answer engines that reward balanced sourcing over hype.
- `/methodology` is a proper E-E-A-T anchor: explains sourcing, review cadence, "how to cite this," author attribution — cited from every SEO page's byline.
- `/llms.txt` is a curated, registry-generated machine index (llmstxt.org convention) — a genuinely above-average AEO asset most competitors don't ship.
- `FAQPage`/`HowTo` JSON-LD correctly documented in `jsonLd.ts` as "no rich-result value, LLM-parsing only" — shows AEO literacy, not cargo-culting old schema.

**Gaps found:** (a) The root `Organization` schema (`layout.tsx`) declares `knowsAbout: [..., 'AI integration']` but **no page content substantiates that entity claim** — an answer engine cross-referencing entity claims against page content will find zero support, which can *reduce* confidence citing Ledgerium for AI-integration queries rather than help. (b) Pricing page hand-rolls its own `FAQPage` JSON-LD outside the shared `FaqBlock`/registry pipeline — inconsistent authoring path, functionally fine but a maintenance/consistency gap.

## 3. Conversion copy (CTAs, pricing, comparisons)

CTA copy is clear but largely generic and repeated verbatim ("Get Started Free" / "See how it works") across home, product, and use-case pages; the one page with sharper, outcome-specific copy is pricing's bottom CTA ("Map Your First Workflow Free. See exactly what your SOP looks like before you buy.") — that specificity should be the house style, not the exception.

Bigger issue: the pricing page's **multi-user waitlist notice sits directly beneath the hero**, telling prospects the two highest-ACV tiers (Team $249, Growth $799 — the tiers that also gate the AI-vision-adjacent "AI agent composition" and "Integration risk assessment" features) route to a waitlist rather than self-serve checkout. This is honest (good — avoids charging for unshipped seats) but it's placed at maximum-visibility, maximum-friction position for exactly the buyers most likely to convert on the roadmap story.

## 4. Does the observe→recommend→execute AI story land publicly?

**No — it is hidden, and where it's closest to surfacing (pricing table + `/docs`), it's a bare feature-row label with zero explanation.** `AI agent composition` and `Integration risk assessment` — the two live features that map directly onto the AI-vision "map exactly where AI fits" layer — appear only as checkmarks in the pricing comparison table (Growth+/Enterprise row) and a short docs mention. There is no product-page section, no screenshot, no dedicated use-case page, and no home-page value prop for either. The public narrative stops at "AI opportunity scoring" (a readiness score) and explicitly steers execution to third-party tools.

## 5. Top 5 findings, ranked

- **P0 — AI-vision "execute" story is absent from the hero/product surface and actively contradicted by compare-page copy.** Evidence: home/product heroes never mention execution; `compare.ts` Process Street page states Ledgerium "is not a...execution platform"; `/use-cases/ai-implementation` positions Ledgerium as upstream-of-execution only. Benefit of fixing: preserves the 18–24 month competitive window the AI-vision review identified and avoids a public reversal (AI-washing risk) once execution ships; the AI-vision review's own progressive-disclosure plan (trust-signal badge + category-identity copy before any repositioning) has not been started.
- **P1 — "AI agent composition" + "Integration risk assessment" are invisible on marketing surfaces.** Evidence: only occurrence outside `/docs` is a bare pricing-table row (`pricing/page.tsx:89-90`). Benefit: a named, screenshotted section on `/product` plus a short use-case example lets Growth/Enterprise prospects self-qualify today and pre-seeds market awareness of the roadmap direction without over-promising execution.
- **P1 — Pricing waitlist notice sits at maximum-friction position on the two highest-ACV tiers.** Evidence: `pricing/page.tsx:188-196`, directly under the hero, above the pricing cards. Benefit: relocating below the fold or softening placement protects conversion on exactly the tiers carrying the AI-vision-adjacent features.
- **P2 — Entity-schema/content mismatch on "AI integration."** Evidence: `layout.tsx` Organization `knowsAbout` includes `'AI integration'` with zero supporting page content. Benefit: either add supporting content or drop the claim — unsupported entity claims can weaken, not strengthen, AI-answer-engine trust.
- **P3 — CTA copy is generic/repetitive site-wide** ("Get Started Free" / "See how it works" reused almost everywhere) vs. the sharper, outcome-specific pricing-page pattern ("Map Your First Workflow Free"). Benefit: minor brand-voice consistency lift, not urgent.
