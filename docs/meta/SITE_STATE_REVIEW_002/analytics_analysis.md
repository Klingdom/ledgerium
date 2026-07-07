# SITE_STATE_REVIEW_002 — Analytics Track

**Scope:** `apps/web-app/src/lib/analytics.ts`, `posthog.ts`, `analytics-server.ts`, `PostHogProvider.tsx`, `UmamiAnalytics.tsx`, `UTMCapture.tsx`, `TrackedLink.tsx`, `AnalyticsConsent.tsx`, footer cluster-link tagging (`Footer.tsx`), `/api/analytics/events`, `/api/analytics/retention`, `/analytics/product` dashboard, and event emission across the public SEO page engine (~124 pages: `ai-opportunities`, `alternatives`, `compare`, `competitors`, `departments`, `industries`, `software`, `sop-templates`, `use-cases/personas`, `use-cases/problems`, `workflow-library`) + app dashboard (v2).

**Method:** static code review only, no runtime PostHog/Umami config was inspected (cannot verify actual dashboards/insights/funnels configured in the PostHog or Umami cloud consoles — only what the codebase instruments and persists).

---

## 1. Is the public funnel instrumented end-to-end (page view → CTA click → signup → install → activation)?

**Partially.** Four of five stages are solid; one stage (install) is a near-total blind spot, and page-view coverage is inconsistent across page types.

| Stage | Mechanism | Coverage |
|---|---|---|
| Page view | `seo_page_viewed` (via `SeoPageView` + 11 typed wrappers: `DepartmentPageView`, `IndustryPageView`, `SoftwarePageView`, `ComparePageView`, `CompetitorsPageView`, `AlternativesPageView`, `AiOpportunityPageView`, `SopTemplatePageView`, `WorkflowPageView`, `PersonaPageView`, `ProblemPageView`) | **Templated `[slug]` detail pages only.** Hub/index pages (`/departments`, `/industries`, `/software`, `/workflow-library`, `/sop-templates`, `/ai-opportunities`, `/use-cases/personas`, `/use-cases/problems`, `/alternatives`, `/competitors`, homepage, `/product`, `/pricing`, `/blog/*`) have **zero custom event instrumentation** — no `seo_page_viewed`, no `page_viewed` (that taxonomy is reserved for in-app pages only: dashboard/upload/teams/recommendations/analytics). These pages rely solely on PostHog `$pageview` autocapture (consent-gated, see §5 P0) and/or Umami script pageviews (if `NEXT_PUBLIC_UMAMI_SCRIPT_URL` is configured — cannot verify from repo whether it is set in prod). |
| CTA click | `TrackedLink` → `cta_clicked{location, destination}` | Good coverage on homepage sections, footer (all 24 links, confirmed via commit tagging `location: 'footer_nav'`), pricing page, nav, and in-page SEO CTAs (`MidCta`/`FinalCta`/`SeoHero` blocks in `Blocks.tsx`). |
| Signup | `signup_completed` fires after `signIn()` resolves, merges `getFirstTouchUTM()` (utm_source/medium/campaign/content/term + `landing_path` + `referrer_domain`, all first-touch, localStorage-persisted) | Solid — userId is resolvable server-side at flush time since signIn already completed. |
| **Install** | **None.** The `/install` page's primary "Download Chrome Extension" button (`apps/web-app/src/app/(public)/install/page.tsx:59-66`) is a bare `<a href download>` — not a `TrackedLink`, no `onClick`, no `track()` call anywhere on the page. There is also no signal anywhere in the web app of the extension actually loading/pairing (no ping-on-load, no `chrome.runtime` handshake event). | **Dark.** The only proxy for "did they install" is `first_workflow_uploaded`, which fires several steps downstream (download → unzip → load-unpacked → record a session → upload) and conflates "installed but never recorded" with "never installed." |
| Activation | `first_workflow_uploaded`, `first_sop_viewed`, `first_process_map_viewed`, `first_export` (dedup'd via localStorage keys in `trackActivation()`); `dashboard_v2_viewed`, `dashboard_bounced`, `dashboard_empty_state_cta_clicked` | Strong. This is the best-instrumented segment of the funnel. |

**Net:** the funnel is instrumented at both ends (marketing page views on detail pages, and post-signup activation) but has a genuine dark zone in the middle — you cannot currently tell how many `/install` page visitors actually click download, nor distinguish "downloaded, never loaded" from "never downloaded" from "loaded, never recorded a session."

---

## 2. UTM capture + attribution coverage across the ~124 SEO pages

- `UTMCapture` (mounted globally in `PostHogProvider`, itself mounted in root `layout.tsx`) captures first-touch `utm_source/medium/campaign/content/term` + `landing_path` + `referrer_domain` on **every** page, including all SEO pages, and **now also captures organic/AI/direct visitors with no UTM params** (this bail-out was explicitly removed — comment at `UTMCapture.tsx:62-64` — a good fix; previously organic/AI-referral traffic, the primary channel for a programmatic-SEO play, was silently unattributed).
- This first-touch record is attached wholesale to `signup_completed` via `getFirstTouchUTM()`.
- **Gap: no stable anonymous visitor ID.** `EnrichedEvent.sessionId?: string` is declared in the type but **never populated anywhere** in `track()`. This means the internal (`analyticsEvent` DB table) pipeline has no join key between an anonymous `seo_page_viewed` event row and a later `signup_completed` row — only the coarse `landing_path` string (first page only, no multi-touch, no pageType/slug taxonomy) survives the anonymous→identified handoff. If a visitor reads 3 SEO pages before signing up, only the first landing path is known; which specific pages/pageTypes drove conversion is not reconstructable from first-party data.
- `seo_related_page_clicked` (with `fromType/fromSlug/toType/toSlug/linkRank`) is well-instrumented for internal SEO-cluster navigation — this can measure cross-linking effectiveness within the SEO cluster, independent of the attribution gap above.
- PostHog, if consent is granted, natively solves this via persistent `distinct_id` + `posthog.identify()` on signup — but that capability is (a) consent-gated (§5 P0) and (b) unverifiable from the repo whether any funnel/insight has actually been built in the PostHog project to use it.

---

## 3. App-side activation/retention instrumentation state

Strong. `dashboard_v2_viewed` (with `time_range`, `lens`, `hasActiveFilters`, `portfolioFilterActive`), `dashboard_bounced` (beforeunload, gated on zero-click sessions), `workflow_row_clicked`, `dashboard_kpi_tile_clicked`, `dashboard_opportunity_segment_clicked`, `dashboard_column_picker_opened`, `dashboard_empty_state_cta_clicked`, `dashboard_pareto_bar_clicked`, `dashboard_lens_changed`, plus the SOP/Variants/Report engagement clusters (`sop_viewed`, `sop_step_expanded`, `variant_map_viewed`, `report_viewed`, `report_scroll_depth`, etc.) are comprehensive, PII-free by design (taxonomy/counts only, documented inline), and cover discovery → engagement → export.

Retention is computed server-side from `User.createdAt` + `workflow_uploaded` cohorts (`/api/analytics/retention`) — this is DB-native and does **not** depend on the client analytics pipeline being reachable (robust against ad-blockers on the events endpoint, though `workflow_uploaded` itself is a client-fired event, so retention is only as good as that single client-side emission surviving).

`userPlan` side-channel enrichment (`setUserPlanForAnalytics`) means every dashboard-era event can be segmented by plan tier without each event variant declaring the field — good design, applied consistently since iter-038.

---

## 4. Can the business currently measure SEO-page → conversion, and trial → paid?

**Trial → paid: yes, robustly.** `plan_limit_hit → upgrade_prompt_viewed → upgrade_clicked → checkout_started → subscription_created` all carry `userId` (client events resolve session server-side at flush; server events — `checkout_started`, `subscription_created` — carry `userId` directly from the authenticated request). The `/analytics/product` dashboard already computes and renders this exact funnel with per-step count/dropoff/rate (`computeFunnel()` in `/api/analytics/events` GET). This is a genuine strength and the clearest "measurable outcome" surface in the codebase.

**SEO-page → conversion: not really, not today.** The raw ingredients exist (per-page-type `seo_page_viewed` events are persisted to the DB with `pageType`/`slug`/`referrerClass`; `signup_completed` carries first-touch `landing_path`), but:
1. There is **no join key** connecting a specific anonymous `seo_page_viewed` row to the eventual signup (see §2) — only a coarse first-touch landing-path string.
2. The `/analytics/product` dashboard has **zero UTM/referrer/SEO-page breakdown** — no chart, no query, no funnel step for `seo_page_viewed`. `topPages` in the GET handler is computed only from the in-app `page_viewed` event, which (per §1) is never fired on any public/SEO page — so `topPages` is structurally empty for marketing traffic today.
3. Answering "which SEO page type converts best" currently requires ad-hoc SQL against the raw `AnalyticsEvent` table joining on `landing_path` string-prefix matching against known route patterns — not a built capability.

PostHog *could* answer this natively (anonymous distinct_id stitched to identified user via `identify()`) for the subset of visitors who accept full consent, but that is an unverified-from-repo, consent-gated, partial-coverage path, not a built/relied-upon reporting surface.

---

## 5. Top 5 findings, ranked

**P0-1 — PostHog analytics is opt-in-gated and initializes on `consent === 'full'` only** (`PostHogProvider.tsx:29-34`, `posthog.ts:32-38`). Given the two-button consent banner (`Accept` vs `Essential Only`), any visitor who chooses "Essential Only" or does not interact before leaving generates **zero** PostHog `$pageview`/autocapture data — including SEO organic traffic, the primary channel this site is built to capture. This directly undermines §2 and §4's SEO-attribution answer for any analysis that depends on PostHog rather than the first-party DB pipeline. Evidence: `getAnalyticsConsent()` returns `null` for "unset" and the banner is opt-in; only `'full'` triggers `initPostHog()`.

**P0-2 — The single highest-leverage conversion action on the entire site, the `/install` page's "Download Chrome Extension" button, has zero click instrumentation.** It is a plain anchor (`install/page.tsx:59-66`), not wrapped in `TrackedLink`, with no `track()` call anywhere on the page. There is no downstream signal of successful extension load either. This means the business cannot currently measure install-intent-to-install-attempt conversion, nor distinguish drop-off at "clicked download" vs. "downloaded but never loaded the unpacked extension" vs. "loaded but never recorded a session." This is the exact "install" stage called out in the task's funnel and it is fully dark.

**P1-1 — SEO hub/index pages carry zero custom analytics instrumentation.** `/departments`, `/industries`, `/software`, `/workflow-library`, `/sop-templates`, `/ai-opportunities`, `/use-cases/personas`, `/use-cases/problems`, `/alternatives`, `/competitors` (the listing/hub pages, as distinct from their `[slug]` detail pages, which are well-instrumented) fire no `seo_page_viewed`, no `page_viewed`. These are important top-of-funnel discovery surfaces for the ~124-page programmatic SEO play; their traffic and engagement is invisible to the first-party pipeline and to the `/analytics/product` dashboard.

**P1-2 — No stable anonymous visitor ID; SEO-page-level attribution cannot be reconstructed.** `EnrichedEvent.sessionId` is declared but never set. The only pre/post-signup linkage is the coarse first-touch `landing_path` string carried via `getFirstTouchUTM()`. Multi-page SEO journeys, pageType-level conversion rates, and true last-non-direct-touch attribution are not computable from first-party data today. Compounds directly into the §4 "SEO-page → conversion" answer.

**P2-1 — The internal product-analytics dashboard has no SEO/UTM reporting surface at all**, despite the underlying events (`seo_page_viewed`, `seo_scroll_depth`, `seo_faq_expanded`, `seo_related_page_clicked`, and the UTM properties nested inside `signup_completed`) already being persisted to the `AnalyticsEvent` table. `topPages` in `/api/analytics/events` GET is computed only from the `page_viewed` taxonomy, which (per P1-1's sibling finding in §1) is never emitted on public pages — so this widget is structurally empty for marketing traffic. Closing this is a reporting/query-layer gap, not an instrumentation gap — the data already exists to build it.

---

## Summary for parent agent

Ranked P0→P2: **(P0)** PostHog is consent-gated opt-in, so a meaningful share of SEO/organic traffic never reaches PostHog at all — the first-party DB pipeline (unconditional, not consent-gated) is the more reliable source of truth but is under-leveraged for marketing analysis. **(P0)** the `/install` page's primary download CTA has zero click tracking — the single most important funnel step (signup → install) is fully dark, with no downstream "extension loaded" signal either. **(P1)** SEO hub/index pages (as opposed to their `[slug]` detail pages) have zero page-view instrumentation. **(P1)** no stable anonymous visitor ID exists in the first-party pipeline, so SEO-page-level attribution to signup can't be reconstructed beyond a single first-touch landing path. **(P2)** the internal analytics dashboard has no UTM/SEO reporting view despite the raw event data already being persisted.

Bottom line: **trial→paid conversion is well-instrumented and already visualized** (funnel with dropoff/rate per step). **SEO-page→conversion is not measurable today** in any built/usable way — the data exists in raw form but lacks a join key and a reporting surface. Activation instrumentation (post-signup) is comprehensive and strong. The weakest link is the signup→install handoff, which is completely unmeasured.

Full detail: `docs/meta/SITE_STATE_REVIEW_002/analytics_analysis.md`.
