# SEO / AEO Super-Prompt Review 001

**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product code)
**Date:** 2026-06-26
**Directive (CEO, verbatim intent):** "Engage all subagents to review this super prompt and improve it prior to initiating... Show me review results by all subagents and proposed updates to pursue perfect SEO AEO strategy." Follow-up: "I'd measure progress by coverage, not just traffic" with category page-count targets (~5,625+ pages).
**Subject:** A CEO-supplied super prompt directing construction of a data-driven SEO/AEO landing-page engine for Ledgerium AI under the "Many Narrow Doors + Workflow Knowledge Graph" strategy.
**Agents engaged (9, in parallel):** product-manager · system-architect · frontend-engineer · growth-strategist · competitive-researcher · market-research · analytics · ux-designer · qa-engineer.

---

## 1. Executive verdict — REVISE, then proceed in phases

The **strategy is sound.** "Many Narrow Doors + Workflow Knowledge Graph" is the correct play for Ledgerium: hundreds-to-thousands of narrow, high-intent pages, each a precise entry point, beats competing for a few broad keywords. Ledgerium's recorded-from-real-work moat (deterministic, evidence-linked, no-screenshots) is a genuine differentiator that no competitor can replicate on a generated page.

The **prompt as written has 5 P0 defects that would actively harm the domain at scale**, plus large measurement and quality-gate gaps. None are fatal; all are correctable before initiating.

The single most important finding: **the prompt's schema strategy is factually out of date, and "thousands of template pages" without uniqueness gates is the exact pattern Google's Scaled Content Abuse policy deindexes.** Fix those two and the rest is upside.

**Decision:** Do not initiate the v1 prompt. Initiate the revised **v2 super prompt** (`docs/meta/SEO_AEO_SUPERPROMPT_V2.md`), which folds in all P0 corrections, a phased coverage ramp, a measurement system, and a build-time quality gate.

---

## 2. Grounding facts (verified from `apps/web-app`)

- **Next.js App Router**, `(public)` route group. Pages are hand-coded today with inline `export const metadata` and inline JSON-LD via `<script type="application/ld+json" dangerouslySetInnerHTML>` placed as the first child of the page return.
- **`sitemap.ts` is a manual hardcoded array** (16 entries) using `SITE_CONFIG.url`. `robots.ts` exists. **No CMS.**
- **No `output: export`** in `next.config.js` — SSG / ISR / SSR are all available. Has `transpilePackages`, a `.js`→`.ts` `extensionAlias`, and redirects (`/demo`→`/product`, `/install-extension`→`/install`, `/docs.html`→`/docs`).
- **Existing pages that collide/overlap** with the proposal: `/compare/scribe` (hand-built leaf) vs proposed `/compare/[slug]`; `/use-cases/operations|compliance|ai-implementation` (hand-built leaves) vs proposed `/use-cases/personas/[slug]` and `/use-cases/problems/[slug]`; existing `/blog`.
- **Design system:** dark theme; CSS-variable tokens (`var(--content-primary)`, `var(--surface-elevated)`, `var(--border-default)`…); brand classes (`text-brand-600`, `bg-brand-900/10`, `border-brand-700/40`); utility classes (`btn-primary`, `btn-secondary`, `card`); lucide-react icons; Inter font; body text `text-[#e2e8f0]`.
- **Analytics:** PostHog (`disable_session_recording: true`) + Umami, both wired in root layout. Typed `AnalyticsEvent` discriminated union with `track()`; CTA links use `TrackedLink` with a `location` property; `/signup` is the conversion route.
- **Real demo assets exist** at `/img/demo/{workflow,sop,report}-view.png` and `/docs/screenshots/extension/`.
- **357 em dashes** exist across the current public pages and product UI copy (conflicts with the prompt's no-em-dash rule).
- **Pricing:** Free (5 recordings/mo), Starter $49, Team $249, Growth $799.

---

## 3. Review results by subagent

| Agent | Verdict | Most material finding |
|---|---|---|
| product-manager | Re-scope | [P0] "Build all 10 types + 70 pages + engine" is one unbounded scope with **zero success metrics**. Phase it; define exit gates. |
| system-architect | Re-shape | [P0] 40-field god-model → discriminated union; **rendering strategy omitted**; **route collisions** unhandled; sitemap must **merge not replace**. |
| frontend-engineer | Align to conventions | [P0] `<PageSchema>` contradicts the inline `<script>` JSON-LD convention; **preview blocks must use real `/img/demo/*.png`**, not invented UI; CTAs must use `TrackedLink`. |
| growth-strategist | Tighten messaging | [P0] **"Book a free Workflow Intelligence Review" is a CTA for a service that doesn't exist** — fulfillment liability; uniqueness floor missing. |
| competitive-researcher | Correct the facts | [P0] **HowTo rich results dead (Sept 2023); FAQPage rich results dead (May 2026).** Emit for LLM parsing only. **Scaled Content Abuse** = deindexation risk. |
| market-research | Re-target seed | [P0] **No comparison cluster in seed** (highest-converting type); cut FileMaker + Power Platform personas; add RevOps / M&A integration / BPO; reframe software pages to dodge trademark risk. |
| analytics | Add measurement | [P0] **No KPIs, events, funnels, or baselines.** North-star = organic-attributed signups; GSC day 1; 10% publish holdout for causal attribution. |
| ux-designer | Operationalize "useful" | [P0] No minimum content-depth rule; CTA only at page end; comparison pages lead with the table before context. |
| qa-engineer | Add gates | [P0] **No validation step exists.** Needs build-time validation: unique slug/canonical/title-meta, dangling-link check, thin-content/near-dup gate, determinism test. |

### 3.1 Per-agent detail

**product-manager** — Strengths: dynamic routes, shared model, centralized JSON-LD, knowledge-graph moat. P0s: no measurable exit criteria; unbounded single scope; existing-page collision unresolved; thin-content doorway risk. Recommends a 3-phase plan (engine + ~10 pages → 50 pages + 3 more types → knowledge graph + AEO), each with a measurable exit gate.

**system-architect** — Replace the 40-field god-object with `BasePage & discriminated union on type`. Mandate `generateStaticParams()` + `dynamicParams = false` + `revalidate` (ISR). Content source-of-truth = typed TS modules, one file per record, per-type directory. Build a `RESERVED_SLUGS` carve-out from filesystem leaf pages. Sitemap = `STATIC_ENTRIES` ∪ `generateSitemapEntries()` deduped (static wins). `getRelatedPages` pure, tie-break by slug asc, no `Date`/random, cycle-safe. Eliminate parallel `workflowNode` shape — relationships live only in `tags[]`/`related[]`. CI guard on total static params (e.g. <5,000).

**frontend-engineer** — Remove `<PageSchema>` (keep inline `<script>` as first child). Anchor preview blocks to real `/img/demo/*.png`. Enforce one `<h1>`/hero, `<h2>`/section, `<h3>`/card. FAQ as `<dl>`. CTAs via `TrackedLink` + add new `location` to `AnalyticsEvent`. Name the actual tokens. Per-type templates, not a mega-renderer. EXTRACT existing inline blocks (Hero, ComparisonTable+Cell, card grid, FAQ `<dl>`, FinalCTA); BUILD new (DirectAnswerBlock, BeforeAfter, Breadcrumbs, RelatedPagesGrid/InternalLinkCluster).

**growth-strategist** — Gate/remove "Workflow Intelligence Review" CTA. Uniqueness floor (custom direct-answer + first FAQ per page). Core positioning must appear in first 150 words. Comparison claims dated + sourced + concede ≥1 competitor strength. Surface no-screenshots privacy moat on comparison pages. Add a "How Ledgerium captures this" 3-step mechanism section. Expand banned-phrase list (streamline, leverage-as-verb, robust, best-in-class, cutting-edge, game-changing, next-generation, holistic, "at scale" filler). Per-page-type intent→CTA mapping table provided.

**competitive-researcher** — HowTo rich results removed Aug–Sept 2023; FAQPage rich results removed for all sites May 7 2026 (GSC reporting removed June 2026). Keep emitting both for **LLM/AEO semantic parsing only**; remove rich-result success-metric claims. AEO levers that actually drive citations (2025–26): ≥1 original/proprietary data point per page (38–65% citation rate vs 6–15%), expert attribution + inline citations, self-contained extractable paragraphs in *every* section, visible freshness date (<90 days), entity density (≥15 connected entities → 4.8× AI-Overview citation boost), named author + `Person` schema + `sameAs`. Scaled Content Abuse guardrails: 300-word floor; `noindex` data-gap pages; segmented sitemaps <10k URLs; gradual rollout (index 100–500, monitor 4–6 weeks, then scale); three-level quality gates. Sources cited inline in the agent report (Google Search Central, Search Engine Journal, Frase, SurferSEO, Wellows, Animalz, et al., 2023–2026).

**market-research** — Strongest clusters: workflow-specific and software-specific (highest commercial intent; ERP/CRM whitespace). Add comparison cluster (missing). Cut FileMaker (declining TAM) and Power Platform Developer (wrong buyer). Add RevOps Manager, M&A Integration Lead, BPO/Outsourcing Ops. Reframe LSS Black Belt (persona, not buyer) toward process-excellence teams. Reframe software pages as "How to document [workflow] in [software]" (editorial, non-affiliation). Ship-first 12 list provided.

**analytics** — North-star = organic-attributed free signups/mo. KPI tree with baseline 0 + phased targets (impressions, indexed pages, ranking keywords, sessions, page→signup CVR, AI-referral sessions, thin-page %, pages/session). 5 new typed events. Client-side `referrer_class` for AI-engine referral capture. GSC day 1. 6-panel dashboard + per-page scorecard. 10% delayed-publish holdout for causal attribution. Thin-page policy (0 impressions after 8 weeks → review/noindex).

**ux-designer** — Minimum content depth: ≥1 real named example + ≥1 measurable outcome + ≥1 named mistake. "Useful without sign-up" gate: first 200 words stand alone. No placeholder previews. Comparison block order: problem framing → why it matters → quick answer → table → when-each-fits → example → FAQ → CTA. Mid-page CTA after steps. Index pages need ≥2 filter dimensions. Related-links = max 3 contextual cards each with a "why related" label. Breadcrumb parent resolution (no orphans). Canonical block order + per-type deltas provided.

**qa-engineer** — Build-time validation script (`pnpm validate:seo`) + Vitest suite + determinism test. Full blocking checklist (see §7). Per-@type JSON-LD required-props map; no fake `aggregateRating`/`Review`/`Offer`. Thin-content + near-duplicate (cosine) gate. axe scan one page per type, reusing the `assertAxeCompliance` pattern from `e2e/app/dashboard/v2-a11y.spec.ts`.

---

## 4. Consolidated P0 corrections (deduped)

1. **Fix the schema strategy.** Keep FAQPage/HowTo for LLM parsing only; delete rich-result claims and rich-result success metrics. Add `Organization` + author `Person` + `sameAs` entity schema.
2. **Add scaled-content-abuse guardrails.** 300-word floor; ≥1 original Ledgerium data point per indexed page; `noindex` data-gap pages; segmented sitemaps <10k URLs; gradual health-gated indexed rollout.
3. **Resolve route collisions + rendering.** `RESERVED_SLUGS` carve-out; `generateStaticParams` + `dynamicParams = false` + `revalidate`; merge generated sitemap with the 16 static entries (static wins).
4. **Discriminated-union data model.** `BasePage` + per-type interface; relationships only in `tags[]`/`related[]`; drop parallel `workflowNode`.
5. **Match frontend conventions (named).** Inline `<script>` JSON-LD; FAQ `<dl>`; `TrackedLink` CTAs + `AnalyticsEvent` union; named tokens; real `/img/demo/*.png` previews; per-type templates.
6. **Add the measurement system.** North-star + KPI tree + 5 typed events + `referrer_class` + GSC day 1 + 10% holdout + thin-page policy.
7. **Add the build-time quality gate (blocking CI).** §7 checklist.
8. **Fix the seed content.** Add comparison cluster; swap FileMaker/Power-Platform for RevOps/M&A/BPO; reframe software pages; gate the "Review" CTA; dated/sourced comparison claims.
9. **Operationalize "useful, not doorway."** Per-page real example + measurable outcome + named mistake; first 200 words stand alone; mid-page CTA; max 3 related cards with "why related"; breadcrumb hub for every page.

---

## 5. Conflicts resolved

- **FAQ rendering** — frontend (`<dl>` static) vs ux (`<button aria-expanded>` accordion). **Resolution: `<dl>`** for AEO crawlability + convention parity; interactivity only as progressive enhancement. Semantic `<dl>` satisfies a11y.
- **Em-dash ban vs 357 existing em dashes** — **CEO default applied: new generated landing-page prose only;** existing pages and product UI copy exempt.
- **Coverage ambition vs "index 100–500 first"** — not in conflict once *authored coverage* and *indexed coverage* are separated (§6).

---

## 6. Coverage as a first-class KPI (CEO follow-up)

CEO directive: measure by **coverage, not just traffic.** Endorsed — coverage is the correct way to measure a knowledge-graph land-grab and builds topical authority faster than competitors. Targets (~5,625+ pages):

| Category | Target | Deindex risk | Publish gate |
|---|---|---|---|
| Personas | 75 | Low | Standard editorial gate |
| Operational problems | 300 | Low | Standard |
| Workflows | 1,500 | Medium | +1 original data point each |
| SOP templates | 750 | Medium | Real editable structure, not stub |
| AI opportunity guides | 500 | Low-Med | +1 data point each |
| Industry | 100 | Low | Standard |
| Software integration | 250 | Med (trademark) | "How to document X in Y" frame |
| Department hubs | 50 | Low | These are the pillar/hub pages |
| Comparison | 100 | Low | Dated/sourced claims |
| FAQ | 2,000+ | HIGH | Hub-sections + selective standalone URLs |

**Three reframes make the target safe and real:**

1. **Measure "coverage that counts."** KPI = pages that **pass the editorial/data gate AND get indexed**, not pages emitted. A thin generated URL is *negative* coverage (cluster-level Helpful-Content demotion risk). 5,625 pages each carrying one real recorded-workflow data point = a moat no competitor can match.
2. **Restructure the 2,000+ FAQ tranche.** Two thousand near-identical standalone FAQ URLs is the textbook scaled-content-abuse signal. Author FAQ coverage as clustered Q&A *sections on hub pages* (fully indexable, FAQPage JSON-LD), and **promote an FAQ to its own URL only when it carries unique substance** (a real data point or a distinct long-tail intent). Likely converts "2,000 FAQ URLs" into ~300–500 standalone pages + thousands of indexed Q&A blocks. Coverage retained; risk removed.
3. **Ramp indexation in health-gated tranches** (build data for full coverage up front; publish gradually):
   - **Tranche 0 (Phase 1):** ~15 ship-first pages → validate engine, gates, indexation, first organic signup.
   - **Tranche 1:** 150–300 pages, monitor GSC 4–6 weeks. **Gate to next: ≥80% indexed AND <30% zero-impression.**
   - **Tranche 2+:** ~300–500/tranche, same gate each time, toward ~5,625 over 9–12 months.

**Coverage scorecard (dashboard):** per category — `target / authored / passed-gate / indexed / % indexed / zero-impression count`. Gives coverage progress *and* an early thin-content warning in one view.

---

## 7. Build-time quality gate (blocking unless noted)

Blocking: `assertUniqueSlugPerType`, `assertUniqueCanonicalPath`, `assertUniqueTitleMetaPair`, `assertRequiredFieldsPresent(page, type)`, `assertSlugFormat` (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), `assertRelatedPageIdsResolve` (no dangling links), `assertNoOrphanPages` (BFS from hubs reaches every leaf), `assertFaqCount(3..10)`, `assertShortAnswerFitsFirst100Words`, `assertLastUpdatedIsIso8601`, `assertJsonLdRequiredProps(type map)`, `assertNoFakeAggregateRating`, `assertWordCountFloor(leaf=400, hub=200)`, `assertNearDuplicateThreshold` (per-type cosine; FAQ uses the highest bar), `assertExactlyOneH1`, `assertCanonicalSelfReferential`, `assertMetaDescriptionLength(120..160)`, `assertTitleLength(30..65)`, `assertOgTagsPresent`, `assertPageInSitemap`, `assertNotNoindex` (indexable pages), `assertMetadataDeterminism` (double-call byte-identity), `assertNoSelfLinks`, `assertTrailingSlashConsistency`.
Warning-only: cosine 0.50–0.69 same-type; meta length off by <10; axe moderate >0; `relatedPages.length === 0`; competitor brand name in title/h1 (legal-review flag).

---

## 8. CEO decisions — defaults applied in v2

1. **Em-dash scope** → new generated landing-page prose only; existing pages + product UI exempt.
2. **"Workflow Intelligence Review" CTA** → replaced. Primary CTA "Start free" (→`/signup`); "Book a demo" only on bottom-funnel comparison/enterprise pages and only when a real booking flow exists.
3. **FAQ 2,000+** → hub-sections + selective standalone URLs (restructure per §6.2).

---

## 9. Outcome & next step

- Strategy: VALIDATED. Prompt: REVISED.
- Artifact (a): this review.
- Artifact (b): `docs/meta/SEO_AEO_SUPERPROMPT_V2.md` — the revised, execution-ready super prompt with all P0 corrections, phased coverage ramp, measurement system, and quality gate.
- Recommended first execution slice: **Phase 1 / Tranche 0** — the engine (discriminated-union model, 3 page types: `compare`, `workflow`, `software`), ~15 ship-first pages, validation gate, measurement instrumentation, GSC submission. Exit gate: ≥80% of Tranche-0 pages indexed within 14 days + ≥1 organic-attributed signup within 60 days, before scaling to Tranche 1.

**Mode 3-adjacent: NON-counting. Zero product code touched. Two artifacts created; zero source files modified.**
