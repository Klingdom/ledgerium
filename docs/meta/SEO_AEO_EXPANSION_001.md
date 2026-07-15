# SEO / AEO Expansion Review 001 — Organic Traffic Growth via New Landing Pages

**Type:** Mode 3-adjacent multi-agent design review (NON-counting).
**Date:** 2026-07-14.
**Directive (CEO):** "Create more landing pages for personas, products, processes, and anything else that gets people to ledgerium.ai — I want even better organic traffic."
**Trigger data:** GSC 7-day — impressions but **0 clicks** on competitor-alternative + document/approval-workflow queries.
**Panel (5):** market-research · competitive-researcher · growth-strategist · system-architect · product-manager.
**Per-agent artifacts:** `docs/meta/SEO_AEO_EXPANSION_001/{market_research,competitive,growth,architecture,roadmap}.md`.

---

## 1. Executive verdict

The SEO engine is **working** — 124 typed pages already earn impressions for competitor-alternative + document-workflow intent — but most are **parked on page 2 (impressions, 0 clicks)**. The growth job is two-pronged: **(a) convert existing page-2 pages** (CTR titles + internal linking to climb) and **(b) fill validated intent gaps** with new pages. The engine can absorb **100+ new pages with zero architecture change** (append typed objects to `content/pages/*.ts`). One genuine architecture add is needed (the `versus` page type). The one real risk is **scaled-content-abuse**: the existing alternatives template is ~70% boilerplate, so every new page must carry ≥1 distinct, dated, tool-specific fact.

## 2. Confirmed structural gaps
- **"document workflow" = 0 of 124 pages**, yet drives 2 GSC signals — the single highest-leverage new cluster.
- **No "X vs Y" (Ledgerium-is-neither) page type** — `ComparePage` is hardwired Ledgerium-vs-Y. "tango vs loom" demand can't be served today.
- **Page-2 pages are never internal-link *recipients*** — they're only link targets; nothing links *to* them via the curated `related` field, starving their climb.
- **`/alternatives` + `/competitors` index (hub) pages don't exist** (the `libraryIndex` type is declared but unused).

## 3. Wrong-fit traps (do NOT chase)
- **"ledger approval workflow" / "ledger app with approval workflow"** — bookkeeping-ledger intent colliding with the *Ledgerium* brand name. Capture adjacent value via a `bill-com` software page instead.
- **"whatfix vs productled"** — "ProductLed" is a PLG methodology brand, not a product; no honest comparison exists.

## 4. Shipped now (fastest, safest win) — CTR title rewrites
Applied to the exact 0-click pages (honest; each surfaces a differentiator already in the page's own copy; all ≤60 chars):
| Page | Before → After |
|---|---|
| `/alternatives/walkme` | Best WalkMe Alternatives in 2026 → **WalkMe Alternatives in 2026: 6 Options Compared by Fit** |
| `/alternatives/guidde` | Best Guidde Alternatives in 2026 → **Guidde Alternatives in 2026: Beyond How-To Video** |
| `/alternatives/scribe` | Best Scribe Alternatives in 2026 → **Scribe Alternatives in 2026: Deterministic vs AI-Inferred** |
| `/competitors/kissflow` | Kissflow Competitors: The 2026 Landscape → **Kissflow Competitors in 2026: 5 Workflow Tool Categories** |

## 5. Batch roadmap (PM synthesis)

**Batch 1 (highest ROI / fastest — ~20 new + the 4 CTR rewrites above):** stay in clusters with proven demand.
- **compare** (Ledgerium vs): celonis, uipath, sap-signavio, zapier
- **alternatives**: sweetprocess, confluence, clickup, iorad, asana (+ Supademo, Kissflow-as-alternatives from competitive)
- **software**: microsoft-dynamics, coupa, docusign (+ box, bill-com)
- **sopTemplate**: refund-processing, journal-entry, system-access-request, sales-order-processing, incident-management (pair orphaned workflows)
- **persona**: it-directors, shared-services-leaders (+ insurance-claims-managers, legal-operations-managers)
- **industry/department**: retail industry; legal department
- **workflow**: procure-to-pay, order-to-cash, employee-offboarding

**Batch 2 — the "document workflow" cluster** (absorb into existing types, linked as one topic cluster under `/use-cases/problems`): a document-approval-workflow pillar (`problem`) + `insurance-claims-processing-workflow` (`workflow`) + docusign/box (`software`) + legal trio.

**Batch 3 — new `versus` page type** (needs architecture): ship tango-vs-loom, scribe-vs-tango, walkme-vs-whatfix first; neutral A/B comparison + a short honest "third option" close. Requires new interface + `VersusPageView` + `/vs/[slug]` route + registry/sitemap/llms wiring + the `proseSources()` branch in the validator (critical seam or every versus page fails the 400-word floor).

**Batch 4 — AEO answer-pages**: own "how to document a process", "what is process intelligence", "SOP vs recorded workflow" with answer-first FAQPage/Speakable content (freshness ≤6–12mo is now a primary AI-citation signal).

**Cross-cutting (from growth):** internal-linking — triangle-link compare↔alternatives↔competitors; make page-2 pages link *recipients*; build the `/alternatives` + `/competitors` index hubs.

## 6. Quality guardrails (scale without penalty)
- ≥1 distinct, **dated** (`verifiedAsOf`), tool-specific fact per new page — no name-swap boilerplate (Google 2026 scaled-content-abuse).
- Honest competitor treatment; both parties fairly + sourced on `versus` pages.
- Cross-type near-dup + `shortAnswer`/`originalDataPoint` uniqueness checks.
- 90-day re-verification SLA for competitor pages (the Scribe-staleness lesson); 180-day for workflow/SOP pages.

## 7. Open CEO decisions
1. Approve the **`versus` page type** (Batch 3 — new architecture)?
2. Zapier compare-page AI positioning (partner vs competitor framing)?
3. A `feature`/`product` page-type for Batch 4 product-led pages?
4. Priority order: document-workflow cluster (Batch 2) before or after the Batch 1 demand-clusters?
5. Measurement: wire the SEO-page→conversion join (prior review's dark funnel) so batch ROI is measurable.

## 8. Success metrics
Baseline from GSC (impressions/clicks/CTR/position) + a new "page-2 opportunity segment" (impressions>0, clicks=0, position 11–20) as the Batch-1 denominator; net-new indexed pages; impressions→clicks conversion; reconciled against `seo_page_viewed`.
