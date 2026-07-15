# SEO/AEO Expansion 001 — Page-Production Roadmap

**Type:** Mode 3-adjacent synthesis artifact (NON-counting; zero product code)
**Owner:** product-manager (synthesis of parallel market-research / competitive-researcher / growth-strategist / system-architect inputs)
**Date:** 2026-07-14
**Directive (CEO, verbatim intent):** "Create more landing pages for personas, products, processes, and anything else that gets people to ledgerium.ai — I want even better organic traffic."

**Current state (verified against `apps/web-app/src/content/registry.ts`):** 124 typed pages live across 11 types — persona 12, problem 22, workflow 18, software 10, industry 8, department 8, sopTemplate 12, aiOpportunity 8, alternatives 10, competitors 10, compare 6. This sits between the SEO_AEO_SUPERPROMPT_V2 Tranche 0 (~15) and Tranche 1 (150-300) gates. Category targets at full coverage: persona 75, problem 300, workflow 1,500, sopTemplate 750, aiOpportunity 500, industry 100, software 250, department 50, compare 100.

**Validated demand signal (real GSC, CEO-supplied):** impressions with **0 clicks** on competitor-alternative queries and document/approval-workflow queries, pages ranking on **page 2** (position 11-20). This is the single highest-confidence signal in this roadmap — it names a segment where demand is proven and the fix is cheaper than new-topic content: either a rank push (title/meta/schema/internal-links) or a CTR push (snippet quality) or both. Batch 1 is built around closing this exact segment first, before spending effort on net-new zero-history topics.

This document does not restate the market-research keyword-cluster lists, the competitive-researcher's "X vs Y" pattern spec, the growth-strategist's CTR copy fixes, or the system-architect's content-generation contract — it sequences and prioritizes their outputs into an executable, measurable production plan. Where this roadmap names a page, the exact copy/JSON-LD/schema is those agents' output, produced against the existing `SEO_AEO_SUPERPROMPT_V2.md` contract (data model, quality gate, CTA/tone rules) — this roadmap does not re-litigate that contract.

---

## 1. Prioritized page-production roadmap (batched, highest ROI first)

### Batch 1 — CTR recovery + validated-demand gap closure (new pages: ~20; CTR rewrites: ~14 existing pages)
**Why now:** cheapest possible organic-traffic lift available. These are pages Google already trusts enough to rank on page 2, or query clusters with proven impression volume — the fix is presentation and completeness, not building topical authority from zero. This is CTR-optimization of existing pages **plus** filling the immediately adjacent gap in the same validated cluster (more alternatives pages, since "competitor-alternative" queries are exactly what's showing impressions/0-clicks).
- **CTR-optimize (no new pages):** all 10 `alternatives` pages + the `how-to-document-approval-workflows`, `how-to-document-a-workflow-across-multiple-systems`, `how-to-document-a-finance-process`, `how-to-document-a-process-for-compliance` problem pages (14 pages). Growth-strategist rewrites metaTitle/metaDescription to front-load the exact query modifier + a number/verified-date signal; competitive-researcher supplies the freshness/verification updates; no `shortAnswer` or FAQ content is discarded, only tightened.
- **New pages, same clusters:** 4 `compare` + 5 `alternatives` + 5 `sopTemplate` + 3 `software` + 2 `persona` + 1 `industry` = 20 pages (exact list in §4).
- **New vs. CTR split:** roughly 60% new-page, 40% optimization-of-existing by effort, but the optimization work should ship first (days, not weeks) because it touches zero new topical risk and can show CTR movement inside a single GSC reporting cycle.

### Batch 2 — Coverage-parity + measurement-gap close (new pages: ~25-30; 1 adjacent engineering fix)
**Why now:** Batch 1 cannot be measured cleanly at the page level while two gaps stand: SEO hub/index pages fire zero page-view events, and there is no stable anonymous visitor ID to join `seo_page_viewed` to `signup_completed` (both flagged in `docs/meta/SITE_STATE_REVIEW_002/analytics_analysis.md` P1-5/P1-6, re-confirmed in the July 2026 site-state review). Close these before scaling further so Batch 2+ isn't flying blind.
- **Adjacent (not this roadmap's scope to design, but a hard sequencing dependency):** instrument the 10 hub/index pages with `seo_page_viewed` (reuse the existing typed-wrapper pattern), and populate `EnrichedEvent.sessionId` so anonymous SEO traffic joins to signup. Small, bounded, `analytics`/`frontend-engineer` owned.
- **New pages:** software cluster toward 20-25 (Microsoft Dynamics, Coupa, DocuSign already in Batch 1; add Slack, Asana-as-software-integration if distinct from the alternatives-cluster Asana entry, Concur, Oracle, Monday.com); department-adjacent workflow/sopTemplate pairs continuing the orphan-closure pattern from Batch 1 (workflow pages without a sopTemplate twin, and vice versa); persona toward 20 (IT Director, Shared Services Leader from Batch 1, plus Controller, VP Operations, Chief of Staff).
- **Exit gate (per the existing SEO_AEO_SUPERPROMPT_V2 tranche gate):** ≥80% of Batch 1 pages indexed within 14 days of publish AND <30% zero-impression at week 6 before Batch 2 pages go live.

### Batch 3 — AI-opportunity + industry depth (new pages: ~25)
**Why now:** `aiOpportunity` (8 pages) and `industry` (8 pages) are the thinnest clusters relative to category target (500 and 100 respectively) and sit closest to the highest-commercial-intent, highest-CPC-adjacent query space ("AI automation opportunities in X"). This is also where the AI-vision positioning tension (site-state review P0-5) is sharpest — every new aiOpportunity page must stay inside the shipped-product claim boundary (scoring/recommendation, not execution) until the CEO resolves the progressive-disclosure question (open decision, §5).
- New `aiOpportunity` pages cross-joining department × industry combinations not yet covered (e.g., AI opportunities in manufacturing quality control, AI opportunities in insurance claims processing).
- New `industry` pages: retail, logistics/supply-chain, energy/utilities — closing common-vertical gaps.
- **FAQ hub-section enrichment** (not new URLs): add clustered Q&A sections to existing hub/index pages per the SUPERPROMPT_V2 §6.2 restructure — this is the correct way to grow the "2,000+ FAQ" target without creating standalone thin URLs, and it directly targets the AEO entity-density lever competitive-researcher flagged (≥15 connected entities → measurable AI-Overview citation lift).

### Batch 4 — Tranche-1 close-out + Tranche-2 readiness (new pages: ~40-50)
**Why now:** by Batch 4 the program should be approaching the 150-300 Tranche-1 band. This batch is where category-target math starts to matter more than individual page ROI — problem (22→60+), workflow (18→50+), sopTemplate (12→40+) all need volume to reach their long-run targets, and by this point Batches 1-3 will have produced 4-8 weeks of real GSC data to re-rank which sub-clusters are actually converting, so Batch 4's exact composition should be re-derived from that data rather than pre-committed here.
- **Before Batch 4 opens:** re-run the Tranche-1 gate (≥80% indexed, <30% zero-impression) and a lightweight meta-review of which Batch 1-3 clusters outperformed forecast — reallocate Batch 4 page counts toward the winners.
- Open question for this batch: whether to introduce a new `feature`/`product` page type (CEO said "products" — today there is no dedicated product-capability page type; `software` pages are integration-framed, not feature-framed). This needs the system-architect's content-model sign-off before any pages are authored against it (see §5, decision 4).

**Cadence guardrail:** no batch opens until the prior batch's tranche gate (≥80% indexed within 14 days AND <30% zero-impression at 6 weeks) is met or explicitly overridden by the CEO with a stated reason — mirrors the existing SUPERPROMPT_V2 phased-ramp rule and prevents Scaled-Content-Abuse risk from outrunning Google's trust-building pace for the domain.

---

## 2. Success-metric model

### 2.1 Baseline (must be pulled fresh from GSC before Batch 1 ships; this roadmap does not fabricate numbers)
Required baseline snapshot, captured the day Batch 1 CTR rewrites go live:
- Total indexed pages (GSC Coverage report, `site:ledgerium.ai` cross-check).
- Total impressions, total clicks, site-wide average CTR, average position — trailing 28 days.
- **Page-2 opportunity segment size** (new metric this roadmap introduces): count of (query, page) pairs at position 11-20 with impressions > 0 and clicks = 0, filtered to the `alternatives`, `compare`, and `problem` (document/approval-workflow family) URL prefixes. This is the denominator Batch 1 is trying to shrink.
- Per-category coverage scorecard (already defined in `SEO_AEO_SUPERPROMPT_V2.md` §7 / `SEO_GSC_SETUP.md` §6): `target / authored / passed-gate / indexed / % indexed / zero-impression count`.

### 2.2 Targets per batch
| Signal | Instrument | Batch 1 target (8 weeks post-publish) | Batch 2+ target |
|---|---|---|---|
| Page-2 opportunity segment (CTR-rewrite cohort) | GSC Performance, filtered by URL + query | ≥30% of the cohort moves to position ≤10 OR shows a ≥1.5x absolute CTR lift at unchanged position | Re-baseline each batch |
| Net-new indexed pages | GSC Coverage | ≥80% of Batch-N pages indexed within 14 days | Same gate, every batch |
| Zero-impression rate | GSC Performance | <30% of Batch-N pages at week 6 | Same gate, every batch |
| Site-wide impressions→clicks (overall CTR) | GSC Performance | Directional lift vs. baseline; not a hard target in Batch 1 (too early, too few new pages) | Track monthly trend from Batch 2 on |
| SEO page engagement | `seo_page_viewed`, `seo_scroll_depth`, `seo_faq_expanded`, `seo_related_page_clicked` (existing typed events) | Reconcile `seo_page_viewed` organic-referrer volume against GSC clicks as an instrumentation sanity check (should track within the same order of magnitude) | Same, plus hub-page parity once Batch 2's instrumentation fix ships |
| SEO page → signup conversion | Blocked today (no stable visitor ID — SITE_STATE_REVIEW_002 P1-6) | Not measurable in Batch 1; use `landing_path` first-touch as a coarse proxy only | Becomes measurable after Batch 2's adjacent fix; set a real CVR target only then |

### 2.3 Reporting cadence
Weekly: coverage scorecard (authored/passed-gate/indexed) — cheap, always available. Every 4 weeks: GSC Performance pull against the page-2 opportunity segment + zero-impression rate — this is the tranche-gate check. Every 8 weeks: full baseline re-snapshot feeding the next batch's targets. Do not evaluate CTR movement before week 4 — GSC data is noisy at low query volume and the existing runbook already documents an equivalent minimum-wait convention for the health gate.

---

## 3. Quality guardrails (so scale doesn't create thin/duplicate content)

These extend, not replace, the existing blocking `pnpm validate:seo` gate (`SEO_AEO_SUPERPROMPT_V2.md` §6) and the build-time checklist in `SEO_AEO_SUPERPROMPT_REVIEW_001.md` §7. New guardrails specific to this expansion:

1. **Minimum unique-content bar (unchanged, restated because scale raises the temptation to violate it):** word-count floor (leaf ≥400 words, hub ≥200), near-duplicate cosine gate per type, ≥1 real `originalDataPoint`, `shortAnswer` and first FAQ answer hand-written per page — no slot-filling in those two fields even under production-velocity pressure.
2. **Cannibalization check before authoring, not after:** every new page's `primaryKeyword` + `searchIntent` must be diffed against all 124 existing pages before the slug is assigned. This expansion deliberately adds pages that are topically adjacent to existing ones (new `compare/celonis` next to existing `competitors/celonis`; new `sopTemplate` pages next to existing `workflow` pages) — the risk is real and must be checked, not assumed away. Rule: two pages may share a topic only if they carry genuinely different `searchIntent` (informational vs. commercial vs. transactional) and don't target the same primary keyword.
3. **Honest-claims rule for competitor-facing pages (`compare`, `alternatives`, `competitors`):** every competitive claim carries a `verifiedAsOf` date, is sourced to the competitor's public docs, and concedes at least one capability where the competitor is stronger — unchanged from the existing contract. **New this roadmap:** a **90-day mandatory re-verification SLA** for every `compare`/`alternatives`/`competitors` page, tracked as a recurring backlog item, not a one-time gate. Rationale: the July 2026 site-state review found the Scribe comparison pages had gone factually stale (missed a $1.3B raise and a major product launch) before anyone caught it — that is exactly the failure mode scaling the competitor cluster from 26 to 35+ pages will multiply if there's no forcing function.
4. **Freshness for evergreen operational pages (`workflow`, `sopTemplate`, `problem`):** 180-day re-verification SLA (lower urgency than competitor pages, since underlying business processes change slower than competitor product surfaces, but not zero — software vendors change their UI, ERP fields get renamed, etc.).
5. **Publish-gate discipline unchanged:** every new page ships `published: false` until it passes `validate:seo`; nothing enters the sitemap pre-gate. No exceptions for CEO-directed urgency — the gate is the thing that prevents this expansion from becoming a Scaled-Content-Abuse liability.
6. **No nav changes required for Batch 1-3.** The existing mega-menu (`NAVIGATION_IA_001.md`) links to per-type hub pages with "View all →"; new pages surface automatically once added to their type's registry array. Only escalate to a nav change if a new page type (e.g., a `feature`/`product` type, Batch 4 open question) is introduced.
7. **AI-positioning boundary guardrail (specific to Batch 3 `aiOpportunity` pages and any Batch-1 `compare/zapier`-style automation-platform comparison):** every new page must stay inside the shipped-product claim ("scores and recommends AI-automation opportunities," not "executes them") until the CEO resolves the AI-vision progressive-disclosure question flagged in the site-state review (P0-5). This is a content-authoring constraint, not a new technical gate — flag it explicitly to whichever agent drafts copy for these pages.

---

## 4. Recommended Batch 1 — exact pages (start production now)

All slugs verified against `apps/web-app/src/content/registry.ts` for zero collision with the 124 existing pages and zero `RESERVED_SLUGS` conflict. Slug format follows each type's existing convention (bare name where the route prefix supplies the semantic; explicit `-sop-template` suffix where that's the established pattern).

### New pages (20)

| # | Type | Slug | Route | Why this one |
|---|---|---|---|---|
| 1 | compare | `celonis` | `/compare/celonis` | Existing `competitors/celonis` profile has no head-to-head "Ledgerium vs Celonis" counterpart; closes SITE_STATE_REVIEW_002 P2-10 gap; high commercial intent |
| 2 | compare | `uipath` | `/compare/uipath` | Same rationale; UiPath Maestro/Agent Builder now ships agentic execution — comparison must be honest per guardrail 7 |
| 3 | compare | `sap-signavio` | `/compare/sap-signavio` | Enterprise BPM buyer segment with zero current comparison coverage |
| 4 | compare | `zapier` | `/compare/zapier` | Adjacent to the "AI opportunity"/automation query cluster; must be framed as documentation-vs-automation-building, not execution-vs-execution (guardrail 7) |
| 5 | alternatives | `sweetprocess` | `/alternatives/sweetprocess` | Direct SOP-tool alternative query; in the validated page-2/0-click cluster family |
| 6 | alternatives | `confluence` | `/alternatives/confluence` | High-volume "process documentation alternative to Confluence" query space |
| 7 | alternatives | `clickup` | `/alternatives/clickup` | Common SOP/process-doc-adjacent tool; unaddressed |
| 8 | alternatives | `iorad` | `/alternatives/iorad` | Direct screen-capture/SOP-tool competitor; same category as existing Guidde/Scribe entries |
| 9 | alternatives | `asana` | `/alternatives/asana` | Process/workflow-documentation-adjacent query volume |
| 10 | sopTemplate | `refund-processing-sop-template` | `/sop-templates/refund-processing-sop-template` | Pairs the orphaned `refund-processing-workflow` (workflow exists, template doesn't) |
| 11 | sopTemplate | `journal-entry-sop-template` | `/sop-templates/journal-entry-sop-template` | Pairs orphaned `journal-entry-workflow` |
| 12 | sopTemplate | `system-access-request-sop-template` | `/sop-templates/system-access-request-sop-template` | Pairs orphaned `access-provisioning-workflow` |
| 13 | sopTemplate | `sales-order-processing-sop-template` | `/sop-templates/sales-order-processing-sop-template` | Pairs orphaned `sales-order-processing-workflow` |
| 14 | sopTemplate | `incident-management-sop-template` | `/sop-templates/incident-management-sop-template` | Pairs orphaned `incident-management-workflow` |
| 15 | software | `microsoft-dynamics` | `/software/microsoft-dynamics` | Major ERP/CRM with zero current coverage (Salesforce/NetSuite/SAP/Workday covered) |
| 16 | software | `coupa` | `/software/coupa` | Procurement-suite gap; pairs naturally with existing procurement department/aiOpportunity pages |
| 17 | software | `docusign` | `/software/docusign` | High-frequency approval-workflow tool; pairs with the approval-workflow problem cluster driving the GSC signal |
| 18 | persona | `it-directors` | `/use-cases/personas/it-directors` | IT department hub exists (`departments/it`) with no matching persona; closes a hub-to-persona gap |
| 19 | persona | `shared-services-leaders` | `/use-cases/personas/shared-services-leaders` | Distinct buyer from Ops Manager/RevOps Manager; multi-department consolidation angle is under-served |
| 20 | industry | `retail` | `/industries/retail` | Common vertical with zero current coverage |

### CTR rewrites (existing pages, apply growth-strategist/competitive-researcher copy — this roadmap specifies target + intent only)

- **All 10 `alternatives` pages** (`scribe`, `tango`, `loom`, `guidde`, `whatfix`, `walkme`, `process-street`, `trainual`, `document360`, `notion`): front-load the query modifier in `metaTitle` (pattern: "`[Competitor]` Alternative: `[differentiator]` (`[verified month/year]`)"), tighten `metaDescription` to 120-160 chars with a concrete number or outcome, add/verify a dated freshness signal visible in the rendered page.
- **4 `problem` pages in the document/approval-workflow query family:** `how-to-document-approval-workflows`, `how-to-document-a-workflow-across-multiple-systems`, `how-to-document-a-finance-process`, `how-to-document-a-process-for-compliance`. Same title/meta tightening pattern; verify `shortAnswer` leads with the specific verb+object from the query (e.g., "document approval workflows") rather than generic framing.

**Total Batch 1 surface: 20 new pages + 14 CTR rewrites = 34 pages touched.** This is within one production cycle if new-page authoring and CTR rewrites run as parallel workstreams (they don't share files).

---

## 5. Open CEO decisions

1. **Approve or amend the exact Batch 1 list (§4).** In particular: the `zapier` compare page sits closest to the AI-execution positioning tension (P0-5) — confirm the documentation-vs-automation framing is acceptable, or drop it from Batch 1 and hold it for after the AI-vision progressive-disclosure decision.
2. **Sequencing of the analytics-instrumentation dependency (Batch 2).** Confirm the SEO-hub page-view instrumentation fix + stable anonymous visitor ID fix should land as an adjacent Mode 2 iteration before Batch 2's new pages ship, per the "can't measure Batch 1 cleanly without it" argument in §1/§2.2 — or accept measuring Batch 2+ on coarse first-touch `landing_path` data only.
3. **Tranche-gate discipline vs. speed.** Confirm the ≥80%-indexed/14-day AND <30%-zero-impression/6-week gate genuinely blocks the next batch (as it does today per `SEO_AEO_SUPERPROMPT_V2.md` and `SEO_GSC_SETUP.md`), or state an explicit override policy if organic-traffic urgency outweighs the Scaled-Content-Abuse risk this gate protects against.
4. **New `feature`/`product` page type (Batch 4).** CEO's directive named "products" explicitly; today no page type is framed around Ledgerium's own capabilities (SOP generation, process mapping, AI-opportunity scoring) as opposed to integrations (`software` type, vendor-framed) or competitors (`compare`/`alternatives`). Decide whether this warrants a new discriminated-union member (system-architect content-model sign-off required) or should be folded into an existing type.
5. **Competitor-page refresh SLA resourcing.** Confirm the 90-day mandatory re-verification cadence for `compare`/`alternatives`/`competitors` pages (guardrail 3) as a standing recurring commitment, not just a one-time fix — this is new ongoing work, not a one-time backlog item.
6. **Batch cadence commitment.** Confirm whether batches should be scheduled as Mode 1 bounded loops (page-count-driven, e.g., "ship N pages per iteration"), a Mode 5 directed sequence, or a standing CEO-directed program (per the MR-018 CEO-directed-multi-iteration-feature-program numerator-credit rule) — this affects how the coordinator sequences it against the existing improvement-loop backlog.
