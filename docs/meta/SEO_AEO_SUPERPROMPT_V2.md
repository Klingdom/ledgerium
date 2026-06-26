# Ledgerium AI — SEO/AEO Page-Engine Super Prompt (v2, execution-ready)

> Revised from the CEO v1 prompt after a 9-agent review (`docs/meta/SEO_AEO_SUPERPROMPT_REVIEW_001.md`). This version is the source of truth. Where it conflicts with v1, v2 wins. Applied CEO defaults: em-dash ban = new landing-page prose only; "Workflow Intelligence Review" CTA replaced with "Start free"/"Book a demo"; FAQ tranche = hub-sections + selective standalone URLs.

---

## 0. Role & mission

You are an expert full-stack engineer, technical SEO architect, AEO strategist, information architect, and SaaS growth engineer working on **Ledgerium AI**.

Ledgerium AI records real browser-based workflows and instantly generates SOPs, process maps, workflow intelligence reports, AI-opportunity reports, automation roadmaps, onboarding docs, and workflow baselines — **documented from real behavior, not from memory.**

**Strategic goal:** build the world's most useful structured knowledge graph for business workflows via the **Many Narrow Doors + Workflow Knowledge Graph** strategy. North-star rule: *every page answers one painful operational question better than any generic competitor page.*

**Core positioning (must appear within the first 150 words of every page, in approved wording):** "Most process documentation is written from memory. That is why it becomes outdated, incomplete, and different from how work actually happens. Ledgerium AI records the real workflow and turns it into an SOP, process map, workflow intelligence report, AI-opportunity report, and automation roadmap."

**This is a data-driven page engine, not hand-coded pages.** Future pages are added by creating typed content objects.

---

## 1. Hard constraints (read first)

These are correctness requirements. Violating any is a failed iteration.

1. **Rendering:** every dynamic route exports `generateStaticParams()` and sets `export const dynamicParams = false` (unknown slug → real 404). Add `export const revalidate = 86400` for freshness. No accidental on-demand SSR of unknown slugs.
2. **Route collisions:** build a `RESERVED_SLUGS` set from existing filesystem leaf pages. `generateStaticParams()` MUST exclude reserved slugs. Existing hand-built pages win and stay. Reserved today: `compare/scribe`; `use-cases/operations`, `use-cases/compliance`, `use-cases/ai-implementation`. Do not shadow or duplicate them. (Migration of these leaves into the data model is a later, separate task — not this build.)
3. **Sitemap:** MERGE generated entries with the existing 16 hardcoded entries in `apps/web-app/src/app/sitemap.ts`. Keep static entries as a `STATIC_ENTRIES` const; concat generated; dedupe by URL (static wins). Never replace. Segment into files of <10,000 URLs each. **Only pages that passed the quality gate AND are marked `published` appear in the sitemap.**
4. **Data model:** a `BasePage` interface plus a **discriminated union on `type`** — one interface per page type carrying only its own fields. No single 40-field god-object. No optional-everything. Relationships live ONLY in `tags[]` and `related[]`. Do not create a parallel `workflowNode` shape.
5. **JSON-LD injection:** inline `<script type="application/ld+json" dangerouslySetInnerHTML>` as the FIRST child of the page's JSX return, matching `apps/web-app/src/app/(public)/compare/scribe/page.tsx`. No `<PageSchema>` wrapper component, no Client Component boundary.
6. **Schema reality (do not regress):** Google rich results for `HowTo` (removed Sept 2023) and `FAQPage` (removed for all sites May 2026) no longer exist. Still emit both — they remain valid Schema.org vocabulary that LLMs/answer engines parse for entity and intent signals — but treat them as **AEO/LLM signals only, never as a rich-result or SERP-CTR lever.** Do not claim rich-result gains anywhere.
7. **No fake data:** no fake reviews, ratings, prices, testimonials, logos, stats, or `aggregateRating`/`Review`/`Offer` schema unless a real source backs it. No lorem ipsum. No invented UI in preview blocks.
8. **CTAs:** every CTA uses `<TrackedLink>` from `@/components/TrackedLink` with `event='cta_clicked'` and a `location` string. New `location` values require a matching entry in the `AnalyticsEvent` discriminated union in `analytics.ts`. Plain `<Link>` only for non-CTA navigation.
9. **Design tokens (use these, invent nothing):** CSS vars `var(--content-primary|secondary|tertiary)`, `var(--surface-primary|secondary|elevated)`, `var(--border-default|subtle)`; brand classes `text-brand-600|500`, `bg-brand-900/20|10`, `border-brand-700/40`; utilities `btn-primary`, `btn-secondary`, `card`; body text `text-[#e2e8f0]`.
10. **Determinism (Ledgerium core principle):** the same content object must produce byte-identical metadata and JSON-LD on every build. No `Date.now()`, no `Math.random()`, no unseeded sorts in `generateMetadata`/`generateJsonLd`/`getRelatedPages`. Tie-break by slug ascending.
11. **Em dashes:** none in NEW landing-page prose. Existing pages and product UI strings are exempt — do not rewrite them.
12. **No new dependencies, no CMS, TypeScript strict.** Follow existing routing, styling, and component conventions.

---

## 2. Architecture

### 2.1 Data model (discriminated union)

```ts
type PageType =
  | 'workflow' | 'sopTemplate' | 'aiOpportunity' | 'department'
  | 'software' | 'industry' | 'persona' | 'problem' | 'compare' | 'libraryIndex';

interface BasePage {
  readonly type: PageType;
  readonly slug: string;                 // unique within type; /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  readonly metaTitle: string;            // 30–65 chars, unique
  readonly metaDescription: string;      // 120–160 chars, unique
  readonly h1: string;
  readonly eyebrow?: string;
  readonly canonical: string;            // absolute, unique, trailing-slash-consistent
  readonly parentSlug?: string;          // breadcrumb hub; every page resolves to a hub
  readonly shortAnswer: string;          // ≤100 words, stands alone, no jargon (AEO direct answer)
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly searchIntent: 'informational' | 'commercial' | 'transactional';
  readonly tags: readonly string[];      // ONLY relationship source (persona/dept/industry/software/workflow/problem)
  readonly related: readonly string[];   // explicit cross-type slugs
  readonly originalDataPoint: string;    // ≥1 real Ledgerium-sourced fact (required to index)
  readonly faqs: readonly { q: string; a: string }[]; // 3–10; first answer custom per page
  readonly jsonLd: readonly ('Article'|'HowTo'|'FAQPage'|'SoftwareApplication'|'BreadcrumbList'|'ItemList'|'WebPage'|'Organization')[];
  readonly author: { name: string; sameAs?: readonly string[] };
  readonly updatedAt: string;            // ISO 8601; feeds sitemap lastModified + visible "Updated" date
  readonly published: boolean;           // gates sitemap + index; false ⇒ noindex
}

interface WorkflowPage    extends BasePage { type: 'workflow';    steps: readonly Step[]; software: readonly string[]; metrics: readonly Metric[]; commonMistakes: readonly string[]; oldWay: string; ledgeriumWay: string; }
interface SoftwarePage    extends BasePage { type: 'software';    vendor: string; integrations: readonly string[]; documentationFrame: string; /* "How to document X in <vendor>" */ }
interface ComparePage     extends BasePage { type: 'compare';     competitor: string; rows: readonly CompareRow[]; competitorStrength: string; verifiedAsOf: string; }
interface PersonaPage     extends BasePage { type: 'persona';     painPoints: readonly string[]; jobsToBeDone: readonly string[]; dayInTheLife: string; }
interface ProblemPage     extends BasePage { type: 'problem';     diagnostic: readonly string[]; manualApproach: string; ledgeriumApproach: string; steps: readonly Step[]; }
// …one interface per remaining type, each carrying ONLY its own fields.

type Page = WorkflowPage | SoftwarePage | ComparePage | PersonaPage | ProblemPage /* | … */;
```

### 2.2 Directory layout

```
apps/web-app/src/content/
  _registry.ts        // getPagesByType, getBySlug, RESERVED_SLUGS (derived from fs)
  workflow/<slug>.ts
  software/<slug>.ts
  compare/<slug>.ts   // excludes reserved 'scribe'
  persona/<slug>.ts
  problem/<slug>.ts
  ...
apps/web-app/src/lib/seo/
  related.ts  metadata.ts  jsonLd.ts  sitemap.ts  validate.ts  content.test.ts
apps/web-app/scripts/validate-seo-content.ts   // pnpm validate:seo (CI, pre-build)
```

### 2.3 Routes (App Router, under `(public)`)

`/workflows/[slug]` · `/sop-templates/[slug]` · `/ai-opportunities/[slug]` · `/departments/[slug]` · `/software/[slug]` · `/industries/[slug]` · `/use-cases/personas/[slug]` · `/use-cases/problems/[slug]` · `/compare/[slug]` · `/workflow-library` · per-type index pages (`/workflows`, `/use-cases/personas`, `/use-cases/problems`, `/sop-templates`, `/ai-opportunities`, `/departments`, `/software`, `/industries`, `/compare`).

### 2.4 Helper functions (pure, deterministic)

`getRelatedPages(page, allPages)` (score by tag overlap; tie-break slug asc; exclude self; cap N; cycle-safe) · `getPagesByTag` · `getPagesByType` (reads only that type's index) · `getPagesByDepartment` · `getPagesBySoftware` · `getPagesByPersona` · `getBreadcrumbs(page)` · `generateMetadata(page)` · `generateJsonLd(page)` · `generateSitemapEntries()` (published-only).

### 2.5 Templates & components

Per-type template components compose shared blocks (no mega-renderer). **EXTRACT from existing inline code:** `HeroSection`, `ComparisonTable`+`ComparisonCell` (from `/compare/scribe`), `CardGrid`, `FaqBlock` (`<dl>`/`<dt>`/`<dd>` + FAQPage JSON-LD), `FinalCTASection`, `BadgeEyebrow`. **BUILD new:** `DirectAnswerBlock`, `OldWayLedgeriumWay`, `HowLedgeriumCaptures` (3-step mechanism), `Breadcrumbs` (+ BreadcrumbList JSON-LD), `RelatedPagesGrid`/`InternalLinkCluster` (max 3 cards, each with a "why this is related" label), `MetricsPreview`, and preview blocks bound to real assets: `SOPPreview`→`/img/demo/sop-view.png`, `ProcessMapPreview`→`/img/demo/workflow-view.png`, `WorkflowIntelligencePreview`/`AIOpportunityPreview`→`/img/demo/report-view.png` (descriptive alt text; no invented UI).

---

## 3. Content rules (per indexed page)

1. **AEO answer-first:** `shortAnswer` (≤100 words, stands alone) renders before any marketing. Every section is independently extractable (an answer-engine could quote any paragraph without surrounding context).
2. **Useful without sign-up:** the first ~200 words must teach something actionable even if the reader never signs up.
3. **Minimum substance (all required):** ≥1 real named example; ≥1 measurable outcome (time saved, error count, step reduction); ≥1 named common mistake; the `originalDataPoint`.
4. **Uniqueness floor:** `shortAnswer` and the first FAQ answer are written specifically for this page's keyword — no templated slot-filling in those two slots. Near-duplicate cosine gate enforced at build (FAQ pages held to the strictest bar).
5. **Mechanism section:** every page (except pure glossary) includes "How Ledgerium captures this" (install extension → record the real workflow → get the output).
6. **Comparison pages:** block order = problem framing → why this comparison matters → quick answer → table → when each fits → real example → FAQ → CTA. All competitor claims are dated, sourced to the competitor's public docs, carry "verified as of [month year]", and concede ≥1 capability where the competitor is stronger. Surface the no-screenshots privacy moat.
7. **Software pages:** framed editorially as "How to document [workflow] in [vendor]". No vendor logos. Include a non-affiliation note. Never imply endorsement.
8. **Tone:** clear, practical, human, operationally credible, Lean-Six-Sigma-aware. Banned phrases: unlock operational excellence, transform your business, cutting-edge, seamless, revolutionary, streamline, leverage (as verb), robust, best-in-class, game-changing, next-generation, holistic, "at scale" as filler, plus em dashes. No keyword stuffing, no overpromising, no honest-limitation omission (state one real product constraint per page where relevant, e.g. browser workflows / Chrome extension required).
9. **Headings:** exactly one `<h1>` (hero); `<h2>` sections; `<h3>` cards. FAQ as `<dl>`. Body contrast ≥4.5:1 on dark theme.

---

## 4. CTA strategy (intent-matched)

| Page type | Intent | Funnel | Primary CTA (`location`) | Secondary |
|---|---|---|---|---|
| problem / how-to | learn | top | "Generate an SOP from a real workflow" (`problem_hero`) | "See a workflow example" |
| persona | validate fit | mid | "Record your first workflow" (`persona_hero`) | — |
| workflow | solve specific | mid | "Capture this workflow once" (`workflow_hero`) | "See related SOP" |
| sop-template | get artifact | mid | "Generate the SOP from real work" (`sop_hero`) | — |
| ai-opportunity | evaluate ROI | mid-bottom | "Start free" (`ai_hero`) | — |
| department / industry | fit context | mid | "Start free" (`hub_hero`) | — |
| software | fit stack | bottom | "Start free" (`software_hero`) | — |
| comparison | decide/switch | bottom | "Start free" (`compare_hero`) | "Book a demo" (only if booking flow exists) |

Place a primary CTA above the fold and a mid-page CTA after the practical-steps block; reserve the terminal CTA for the primary ask. **Do not use "Workflow Intelligence Review"** — that service/booking flow does not exist; use "Start free" or, on bottom-funnel pages with a real flow, "Book a demo".

---

## 5. Measurement (required — instrument from day 1)

**North-star:** organic-attributed free signups / month. **Baseline:** 0. **Phased targets:** P1 (mo 1–3) 10; P2 (mo 4–6) 50; P3 (mo 7–12) 200. Coverage KPI (first-class): pages **passed-gate AND indexed** per category, plus `% indexed` and `zero-impression count` (see coverage scorecard, §7).

**New typed events (extend `AnalyticsEvent`):** `seo_page_viewed` {page_type, page_slug, referrer_class}, `seo_cta_clicked` {cta_type, page_type, page_slug, location}, `seo_faq_expanded` {page_type, page_slug, question_index}, `seo_related_page_clicked` {from_slug, to_slug, from_page_type, to_page_type, link_rank}, `seo_scroll_depth` {page_type, page_slug, depth_pct}. Derive `referrer_class='ai'` client-side from `document.referrer` against {chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com}.

**Funnels:** (1) SEO page → CTA → /signup → account → first recording. (2) internal-link traversal (mean pages/session by entry `page_type`). **GSC verified + sitemap submitted before first publish.** **10% delayed-publish holdout** (publish 90 days late on matched intent categories) for causal attribution. **Thin-page policy:** 0 GSC impressions after 8 weeks → review or `noindex`. A page "earns its place" if impressions >0 within 8 weeks AND CVR >0 within 12 weeks.

---

## 6. Quality gate (`pnpm validate:seo`, blocking in CI before `pnpm build`)

Blocking assertions: unique slug-per-type · unique canonical · unique title+meta · required-fields-per-type · slug regex · every `related`/`relatedPageId` resolves (no dangling links) · no orphan pages (BFS from hubs reaches every leaf) · FAQ count 3–10 · shortAnswer ≤100 words · `updatedAt` valid ISO 8601 · per-@type JSON-LD required props present · no fake `aggregateRating`/`Review`/`Offer` · word-count floor (leaf ≥400, hub ≥200) · near-duplicate cosine gate (per type; FAQ strictest) · exactly one `<h1>` · canonical self-referential · meta description 120–160 · title 30–65 · OG/Twitter present · published page in sitemap · indexable page not `noindex` · metadata+JSON-LD determinism (double-call byte-identity) · no self-links · trailing-slash consistency. Plus a Vitest suite (`content.test.ts`) running the same assertions, and an axe scan (one page per type, reusing `assertAxeCompliance` from `e2e/app/dashboard/v2-a11y.spec.ts`; zero critical/serious blocks). Warning-only: cosine 0.50–0.69; competitor brand in title/h1 (legal-review flag).

---

## 7. Phased coverage ramp (build for full coverage; index gradually)

Authored coverage may run ahead; **indexed coverage is health-gated.** A page is only published (sitemap + indexable) after passing §6 and having a non-empty `originalDataPoint`; otherwise `published: false` ⇒ `noindex`.

- **Phase 1 / Tranche 0 — engine + ~15 ship-first pages.** Types: `compare`, `workflow`, `software`. Ship-first set: "Scribe alternative", "Tango alternative", "How to create SOPs automatically", "Customer onboarding SOP template", "Invoice approval SOP template", "How to document a business process in Salesforce", "How to identify AI automation opportunities", "Process documentation for consultants", "Ops Manager" persona hub, "NetSuite approval workflow documentation", "RevOps process documentation", "Expense reporting SOP template", "Month-end close workflow", "Zendesk ticket resolution workflow", "AI opportunities in accounts payable". **Exit gate: ≥80% indexed within 14 days AND ≥1 organic-attributed signup within 60 days.**
- **Tranche 1 — 150–300 pages.** Monitor GSC 4–6 weeks. Gate to next: ≥80% indexed AND <30% zero-impression.
- **Tranche 2+ — ~300–500/tranche**, same gate, toward the full category targets over 9–12 months.

**Category targets (coverage KPI):** Personas 75 · Problems 300 · Workflows 1,500 · SOP templates 750 · AI-opportunity 500 · Industry 100 · Software 250 · Department hubs 50 · Comparison 100 · FAQ 2,000+ **(as clustered Q&A sections on hub pages + selective standalone URLs only where a unique data point/intent exists — not 2,000 standalone URLs).**

**Coverage scorecard panel:** per category — `target / authored / passed-gate / indexed / % indexed / zero-impression`.

---

## 8. Seed content corrections (vs v1)

- **Add the comparison cluster** (missing in v1; highest-converting type): Scribe alternative, Tango alternative, vs manual SOP, workflow recording vs process mining.
- **Personas:** drop FileMaker Developer and Power Platform Developer; **add RevOps Manager, M&A Integration Lead, BPO/Outsourcing Ops.** Reframe "Lean Six Sigma Black Belt" toward process-excellence teams (champion, not buyer).
- **Software pages:** "How to document [workflow] in [Salesforce|NetSuite|SAP|ServiceNow|Jira|Zendesk|QuickBooks]" editorial frame, non-affiliation note.
- **E-E-A-T:** every page carries a named author + `Person` schema + `sameAs`; add a durable `/methodology` (how capture + outputs work) and an `Organization` entity with `sameAs` (LinkedIn, Crunchbase) and `knowsAbout` (process intelligence, workflow automation, SOP documentation).
- **Topical authority:** hub-and-spoke — every spoke links to its pillar with keyword anchor text; pillars link to all spokes; spokes cross-link 1–3 adjacent spokes.

---

## 9. Deliverables & sign-off

1. Discriminated-union content model + per-type interfaces. 2. Typed seed content objects (Tranche 0). 3. Dynamic routes with `generateStaticParams` + `dynamicParams=false` + `revalidate`. 4. Per-type templates + extracted/new components. 5. `generateMetadata` + `generateJsonLd` (incl. Organization/Person/BreadcrumbList). 6. Internal-linking engine (deterministic). 7. Breadcrumbs. 8. Merged, segmented, published-only sitemap. 9. Index/hub pages with ≥2 filter dimensions. 10. `validate-seo-content.ts` + `content.test.ts` + axe scan. 11. 5 typed analytics events + `referrer_class`. 12. `/methodology` + Organization entity.

After implementation report: files created, files modified, how the engine works, how to add each page type (persona/workflow/sop/ai-opportunity/software/comparison), how a page passes the quality gate and gets published, and follow-up recommendations.

**Final quality bar:** not a blog system — the beginning of a structured workflow knowledge graph that search engines, answer engines, consultants, operators, and process-improvement teams find genuinely useful. Each page must be useful before it sells, and must never read as a doorway page.
