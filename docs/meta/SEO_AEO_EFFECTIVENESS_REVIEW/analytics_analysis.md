# SEO/AEO Effectiveness Review — Analytics Analysis

**Type:** Read-only audit (analytics agent). No product code changed.
**Date:** 2026-08-13.
**Scope:** Can the shipped measurement system answer "has SEO/AEO been effective?" — and if not, what specifically to pull from GA4/GSC to answer it manually.

---

## 0. Bottom line

**No.** The instrumentation captures decent event-level telemetry on-page, but the two things that actually answer "was this effective" — (a) indexation health against the gate the team itself committed to, and (b) SEO page → signup attribution — are **not computable from any shipped product surface today.**

- The indexation health gate (≥80% indexed AND <30% zero-impression, evaluated 4–6 weeks post-publish) is **~7 weeks overdue and appears never to have been evaluated**, and the live evidence (missing GSC verification tag) suggests it **cannot have been evaluated**, because Search Console was likely never receiving data to gate on.
- The `visitorId` "attribution unblock" (commit `7a7b8ff`) ships the **join key**, not the **join**. It correctly stamps every event — anonymous and authenticated — with a stable identifier, but zero code anywhere reads that identifier to connect a `seo_page_viewed` event to a `signup_completed` event. The dashboard that would show this (`/analytics/product`) computes funnels keyed on `userId` only, which is `null` on every anonymous SEO event by construction. The "dark funnel" flagged in `SEO_AEO_EXPANSION_001` §7 (open decision 5) is still dark.
- A structural delivery mechanism bug (documented in §1.4 below) means the browser-side event buffer for a typical SEO-page visit is not reliably flushed to the server at all when the visitor does the one thing you most want to measure: click the CTA. This is not a theoretical risk — it follows directly from how Next.js `<Link>` client-side navigation interacts with the `beforeunload`-only flush path.
- GA4, as far as I can determine from source, **receives none of this.** There is no `gtag.js`/Google Tag Manager wiring anywhere in the codebase. If GA4 is showing traffic, it is either installed out-of-band (not in this repo) or has default Enhanced Measurement only — in which case it can approximate landing-page traffic and channel mix, but has zero visibility into page type, referrer AI-classification, scroll depth milestones, FAQ engagement, or signup conversion.

None of the specific numbers below are fabricated — I have no traffic data and did not invent any. Everything stated as fact is either read directly from source or is the grounding fact you supplied.

---

## 1. Are the 5 (really 6) events wired correctly?

### 1.1 Inventory (source of truth: `apps/web-app/src/lib/analytics.ts`)

| Event | Fires from | Payload | Notes |
|---|---|---|---|
| `seo_page_viewed` | `SeoPageView.tsx`, mounted by all 12 leaf `*PageView.tsx` wrappers | `pageType`, `slug`, `referrerClass` | Fires once on mount via `useEffect`. |
| `seo_scroll_depth` | Same `SeoPageView.tsx` | `pageType`, `slug`, `depthPct` (25/50/75/90) | `requestAnimationFrame`-throttled scroll listener; also runs once on mount to catch short pages already past a milestone. |
| `seo_faq_expanded` | `FaqBlock.tsx` | `pageType`, `slug`, `questionIndex` | Fires only on **open**, not close. |
| `seo_related_page_clicked` | `Blocks.tsx` → `RelatedPagesGrid` | `fromType`, `fromSlug`, `toType`, `toSlug`, `linkRank` | Via `TrackedLink`. |
| `cta_clicked` | `Blocks.tsx` (`SeoHero`, `MidCta`, `FinalCta`) | `location`, `destination` | This is the **pre-existing generic marketing event**, reused — see §1.2 for what this costs you. |
| `seo_hub_viewed` | `HubPageView.tsx`, mounted by all 11 working hub pages (10 via `HubIndex.tsx` + hand-built `/comparisons`) | `hubType`, `pageCount`, `referrerClass` | **Not in the task's or the runbook's event list** — shipped later (SEO_AEO_EXPANSION_001 §2.2 Batch 2, "SEO attribution unblock, PART 2"). The runbook (`docs/runbooks/SEO_GSC_SETUP.md` §5) still lists only 5 events and is stale. |

**Verdict: wired correctly, on all 12 page types, for the 4 SEO-specific events + `cta_clicked`.** I traced every one of the 12 `*PageView.tsx` wrapper components (Department/Workflow/Competitors/Compare/SopTemplate/AiOpportunity/Answer/Alternatives/Software/Persona/Industry/Problem) and confirmed each mounts `<SeoPageView pageType={page.type} slug={page.slug} />`, and each is mounted from a real `app/(public)/.../[slug]/page.tsx` route. Hub coverage is 11 of 12 — the `answer` type's hub (`/answers`) has **no route file at all** (`apps/web-app/src/app/(public)/answers/` does not exist), which is the exact 404 you found live. Root cause: `apps/web-app/src/lib/seo/sitemap.ts`'s `HUB_TYPES` array unconditionally includes `'answer'` and emits a sitemap entry for `/answers` without checking a page.tsx exists — the sitemap generator and the App Router route tree are two independent systems with no cross-check. `seo_hub_viewed` can never fire for `hubType='answer'` because nothing renders there to fire it from.

### 1.2 Is the data model sufficient to attribute a signup back to an SEO page?

**Partially — and only if someone builds a query nobody has built.** Walking the payloads:

- `seo_page_viewed` carries `pageType` + `slug` (the SEO taxonomy) but **no `visitorId` in its typed payload** — `visitorId` is added transparently by `track()`'s enrichment step (see §2), so it *is* on the wire, but it lives inside the untyped `EnrichedEvent` extension, not the `AnalyticsEvent` union. Anyone querying the raw event needs to know to look for it.
- `cta_clicked` carries only `location` + `destination` — **not `pageType`, not `slug`, not a `cta_type`**. The originally committed contract (`SEO_AEO_SUPERPROMPT_V2.md` §5) specified a *dedicated* `seo_cta_clicked` event with `{cta_type, page_type, page_slug, location}`. What shipped instead is a reuse of the pre-existing generic `cta_clicked` event. This means: to know which SEO page type a given CTA click came from, you must fall back to `EnrichedEvent.url` (the pathname, auto-captured, e.g. `/software/salesforce`) and reverse-map it to a page type via the route-prefix table — doable, but it's string parsing against 12 route prefixes, not a first-class field, and nobody has written that mapping in code either.
- `signup_completed` carries UTM data from `getFirstTouchUTM()` (localStorage-persisted first-touch UTM params) — this is **unrelated to the SEO page taxonomy**; organic SEO visits normally carry no UTM params at all, so this field will be empty for exactly the traffic you care about.

**The only usable join key is `visitorId`,** and it does work end-to-end at the data level (see §2) — but the CTA-click event itself is the weakest link in the chain: it doesn't self-describe which SEO page or page type it came from as a structured field.

### 1.3 Referrer classification correctness

`classifyReferrer()` (`apps/web-app/src/components/seo/referrerClassification.ts`) is a pure, well-tested function: reads `document.referrer`, checks against a 10-domain `AI_REFERRERS` allowlist (chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com, grok.com, you.com, phind.com, meta.ai, poe.com) for `'ai'`, a regex for google/bing/duckduckgo/yahoo/ecosia for `'organic'`, empty referrer for `'direct'`, else `'other'`. This is sound as far as it goes, with one structural limitation worth naming: **it is a client-side, document.referrer-based heuristic, not GSC/GA4's server-side attribution model** — it will misclassify any AI engine not on the 10-domain list (the list is a point-in-time snapshot; AI answer engines multiply monthly), and it cannot see anything once a referrer header is stripped (increasingly common — many AI assistants open links via mechanisms that don't set `document.referrer`, which this code correctly buckets as `'direct'`, silently understating AI referral share).

### 1.4 Delivery-mechanism gap (not asked for, but material to "wired correctly")

`track()` buffers events in a window-scoped array and only auto-flushes to `/api/analytics/events` when **either** (a) the buffer reaches 10 unflushed events in the same page load, **or** (b) a `beforeunload` listener fires and uses `sendBeacon`. There is **no interval-based or debounce-based background flush** independent of those two triggers (`flushEvents()`'s own 2-second debounce is only ever scheduled from inside the `buffer.length >= 10` branch — it never runs on its own).

A typical single-page SEO visit generates 2–5 events (`seo_page_viewed` + 0–4 `seo_scroll_depth` + maybe `cta_clicked`) — well under the 10-event auto-flush threshold. That leaves `beforeunload` as the only realistic delivery path. But `TrackedLink` (`apps/web-app/src/components/TrackedLink.tsx`) uses `next/link`, which performs a **client-side soft navigation** for internal routes like `/signup` — this does **not** fire `beforeunload`. So the most important action on the page (clicking the CTA to `/signup`) does not, by itself, flush the buffer.

In practice this is partially self-healing: because the SPA session continues (window object survives the client-side route change), the same buffer carries forward through `/signup` and into `/dashboard`, and will eventually flush once either the 10-event threshold is crossed by later in-app activity or the tab is finally closed/reloaded (which does fire `beforeunload`). But it is not guaranteed, and `beforeunload` itself is a known-unreliable signal on mobile browsers (mobile Safari in particular often suspends/discards background tabs without firing it — the modern recommended pattern is `visibilitychange`/`pagehide`). Given organic search traffic skews mobile-heavy, this is a real, not theoretical, source of undercounted `seo_page_viewed` / `cta_clicked` events specifically for visitors who bounce (close the tab) rather than click through — which is a large share of any top-of-funnel SEO landing page.

---

## 2. `visitorId` attribution — does the join actually work?

**The identifier is sound. The join does not exist anywhere in the codebase.**

Traced `apps/web-app/src/lib/analytics.ts` (the visitorId machinery lives entirely in this one file, no separate commit-specific file):

- `getOrCreateVisitorId()`: generates a `crypto.randomUUID()` (with `getRandomValues`/`Math.random` fallbacks), persists it in `localStorage['ledgerium_visitor_id']`, caches it module-scoped for the page load. Every call to `track()` enriches the outgoing event with `base.visitorId = visitorId` when in a browser context — **this means `visitorId` is stamped on every single event, anonymous or authenticated**, including `seo_page_viewed`, `cta_clicked`, and `signup_completed`.
- Server side (`apps/web-app/src/app/api/analytics/events/route.ts` `POST`): persists each event to the `AnalyticsEvent` Prisma model with `userId` resolved from the current session (`null` for anonymous events), and `properties: JSON.stringify(filterProperties(event))`. `filterProperties()` strips `event`, `timestamp`, `url`, `source`, `userId` from the top level but **does not strip `visitorId`** — so `visitorId` survives, embedded inside the `properties` JSON string.
- Prisma schema (`apps/web-app/prisma/schema.prisma`, `model AnalyticsEvent`): `properties String?` — a plain text column, **not** a native `Json`/`Jsonb` column, and **no index of any kind touches it** (only `userId`, `eventName`, `createdAt` are indexed). `visitorId` is therefore queryable only by parsing this text blob at query time (e.g. Postgres `properties::jsonb ->> 'visitorId'`), row by row, with no index acceleration.
- Signup flow (`SignupPageClient.tsx`): `signIn('credentials', ...)` completes (session cookie set) **before** `track({ event: 'signup_completed', ... })` is called — so by the time that event is eventually flushed to `/api/analytics/events`, `auth()` will resolve a real `session.user.id`, and the persisted `signup_completed` row **will** have a populated `userId` column. Good — this is the piece that lets you walk *forward* from signup to later authenticated activation events (`first_workflow_uploaded`, etc.) via the normal `userId` index.

**So the theoretical chain is:**
```
seo_page_viewed (userId=null, properties.visitorId=X)
  ⋈ visitorId  →  signup_completed (userId=Y, properties.visitorId=X)
                        ⋈ userId    →  first_workflow_uploaded (userId=Y)
```
This is *possible* to compute, and every piece of data needed to compute it is genuinely being persisted. **But nothing computes it.** I checked the one place that would plausibly do this — `GET /api/analytics/events` (backs the internal `/analytics/product` admin dashboard) — and its `computeFunnel()` helper only counts events where `evt.userId` is truthy, grouped by `eventName`, for two hardcoded funnels (`signup_completed → workflow_uploaded → first_sop_viewed → first_process_map_viewed`, and a billing funnel). Neither funnel includes any `seo_*` event, and the funnel logic has no visitorId-join step. There is no other admin surface, script, or scheduled job in the repo that touches `visitorId`. **This is the "dark funnel" `SEO_AEO_EXPANSION_001` §7 open decision 5 flagged on 2026-07-14 ("wire the SEO-page→conversion join... so batch ROI is measurable") — it is still unresolved.** The visitorId commit closed the *prerequisite* (a stable join key existed nowhere before), not the deliverable (a working attribution report).

Two structural caveats even once someone writes this query:
1. **Cross-device/cross-browser breaks the join** — `visitorId` lives in `localStorage`; a visitor who reads on their phone and signs up later on a laptop, or clears storage, or uses a private window, produces two unlinked `visitorId`s. There is no fallback identity resolution (no email-based backfill, no fuzzy matching).
2. **§1.4's flush gap directly undermines this** — if the `seo_page_viewed` event for the visit that led to signup was never flushed (bounced-tab / mobile-suspend case), the join has nothing to match against even with a correct query.

**Bottom line for this section: no, end-to-end SEO page → signup → activation attribution does not "actually work" today.** It is buildable as a one-off SQL script against existing data (I sketch it in §5.4), but it does not exist as running code, a report, or a dashboard, and even once built it will undercount due to §1.4.

---

## 3. What was committed vs. what shipped

Read in order: `SEO_AEO_SUPERPROMPT_REVIEW_001.md` (2026-06-26) → `SEO_AEO_SUPERPROMPT_V2.md` (2026-06-26, the execution contract) → `SEO_AEO_EXPANSION_001.md` + `roadmap.md` (2026-07-14) → `docs/runbooks/SEO_GSC_SETUP.md` (iter 098, "code wiring complete").

### 3.1 Measurement plan committed in `SEO_AEO_SUPERPROMPT_V2.md` §5 ("Measurement — required, instrument from day 1")

| Committed | Shipped? |
|---|---|
| North-star: organic-attributed free signups/month, baseline 0, phased targets P1=10 (mo 1–3) / P2=50 (mo 4–6) / P3=200 (mo 7–12) | **Not computable** — no attribution join exists (§2). |
| Coverage KPI: pages passed-gate AND indexed per category, % indexed, zero-impression count | **Partially** — "passed-gate" (authored + validated) is computable today (`pnpm validate:seo`); "indexed" and "zero-impression" require GSC, and GSC verification status is in doubt (§4/§5). No coverage scorecard dashboard/report exists in the repo — this was always meant to be assembled by hand from `validate:seo` output + a GSC pull. |
| 5 typed events incl. `seo_cta_clicked` with `{cta_type, page_type, page_slug, location}` | **Shipped differently** — got `seo_page_viewed`, `seo_scroll_depth`, `seo_faq_expanded`, `seo_related_page_clicked` as specified, but the CTA event was **not** built as its own typed event; the pre-existing generic `cta_clicked` was reused instead (loses `cta_type`/`page_type`/`page_slug` as structured fields — see §1.2). |
| `referrer_class='ai'` derived client-side | **Shipped**, faithfully, as `classifyReferrer()`. |
| Funnel 1: SEO page → CTA → /signup → account → first recording | **Not shipped as a computed funnel anywhere.** The events exist to reconstruct it manually; no code does. |
| Funnel 2: internal-link traversal (mean pages/session by entry page_type) | **Not shipped.** `seo_related_page_clicked` fires with the right fields to reconstruct this, but no report computes it. |
| GSC verified + sitemap submitted **before first publish** | **In doubt / likely violated** — per your live crawl, the `google-site-verification` meta tag is absent from production and `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is unset in all local env files. Content has been publishing since 2026-06-26. Runbook step 1 ("Redeploy, then click Verify in GSC") is a manual console action with no code-level proof it happened — see §5.2 for how to confirm. |
| 10% delayed-publish holdout (publish 90 days late on matched intent) for causal attribution | **No evidence in content data.** I did not find any `published: false`-with-a-future-release-date pattern or holdout flag in the page registry; this appears to have been a plan-level recommendation that was not operationalized. |
| Thin-page policy: 0 GSC impressions after 8 weeks → review/noindex | **Not evaluated** — requires GSC data; no evidence of any review cycle having run. |

### 3.2 `SEO_AEO_SUPERPROMPT_V2.md` §7 — Tranche gates

- **Tranche 0 exit gate:** ≥80% indexed within 14 days of publish **AND** ≥1 organic-attributed signup within 60 days. Publish was 2026-06-26; 14 days elapsed 2026-07-10, 60 days elapsed 2026-08-25. **You are ~5 weeks past the 14-day indexation check-in and it appears never to have been evaluated.** The 60-day signup gate lands 2026-08-25 — 12 days from today — and given §2's finding, there is currently no way to produce that number even if you wanted to hit the deadline.
- **Tranche 1 gate (also restated in `SEO_GSC_SETUP.md` §4):** ≥80% indexed AND <30% zero-impression, monitored 4–6 weeks. Content additions continued through 2026-07-19 (per your grounding), which is ~4 weeks ago — the monitoring window for whatever was published by then has technically elapsed. **No evidence this gate has been checked either.**

### 3.3 `SEO_AEO_EXPANSION_001.md` (2026-07-14) — confirms the gap was already known

This review's own trigger data was "GSC 7-day — impressions but 0 clicks" — meaning GSC *was* delivering some data as of mid-July (or someone had access to a GSC view; this doesn't confirm the *production* domain property is verified today, only that GSC data existed at that point for *some* property/timeframe). Its §7 explicitly lists as **open decision 5**: *"Measurement: wire the SEO-page→conversion join (prior review's dark funnel) so batch ROI is measurable."* This is the same gap identified in §2 of this document, one review cycle earlier, still unresolved by the visitorId commit that came after it. Its own §2.2/Batch-2 sequencing correctly flagged the hub-instrumentation gap and the missing-visitor-ID gap as **prerequisites that should land before Batch 2 pages ship** — the visitorId + hub-instrumentation commit did ship (confirmed in §1/§2 above), but the actual reconciliation report it was meant to unblock (§2.2's own stated goal: "reconcile `seo_page_viewed` organic-referrer volume against GSC clicks... should track within the same order of magnitude") was never built either.

### 3.4 `docs/runbooks/SEO_GSC_SETUP.md` — accuracy check

- §1 (GSC verification via env var) and §4 (health gate) are the authoritative, correct restatement of the committed plan.
- §5's event table is **stale** — it lists 5 events and omits `seo_hub_viewed` (shipped after this runbook was written).
- §5's claim "Client events fire from the SEO pages (**PostHog + Umami** via `track()`)" is **factually wrong about Umami.** I checked: Umami is loaded as a fully separate, decoupled `<script>` tag (`apps/web-app/src/components/UmamiAnalytics.tsx`), configured only via `NEXT_PUBLIC_UMAMI_SCRIPT_URL`/`NEXT_PUBLIC_UMAMI_WEBSITE_ID`. It auto-tracks its own generic pageviews (if those env vars are set) and is never called from `track()` — there is no `umami.track(...)` call anywhere in `analytics.ts` or any component. Umami, if enabled, captures raw URL pageviews only, with zero knowledge of `pageType`, `slug`, `referrerClass`, or any of the typed SEO events.
- §7's holdout recommendation was never operationalized (§3.1 above).

---

## 4. The measurement model (reusing the committed gate — not inventing new thresholds)

Everything below is either a threshold your own team already committed to (cited by source doc) or a metric explicitly named in the plan. Nothing here is a new target I invented.

| # | Metric | Definition | Source of the target | Threshold | Computable today? |
|---|---|---|---|---|---|
| 1 | **GSC-verified + submitted** | Property shows verified in GSC; sitemap.xml submitted and processed without errors | `SEO_AEO_SUPERPROMPT_V2.md` §5, `SEO_GSC_SETUP.md` §1–2 | Must be true **before** the other gates mean anything | **Unknown — verify first (§5.2).** Live evidence (missing meta tag, unset env var) suggests this may not be true. |
| 2 | **% indexed (Tranche-0/1 gate)** | Indexed pages ÷ published+submitted SEO pages | `SEO_AEO_SUPERPROMPT_V2.md` §7; `SEO_GSC_SETUP.md` §4 | ≥ 80%, checked at 14 days (Tranche 0) / 4–6 weeks (Tranche 1) | **No — requires GSC (§5.2).** Gate window has passed without evaluation. |
| 3 | **Zero-impression rate** | Share of published pages with 0 GSC impressions in the trailing window | `SEO_AEO_SUPERPROMPT_V2.md` §7; `SEO_GSC_SETUP.md` §4 | < 30% at 4–6 weeks | **No — requires GSC (§5.2).** |
| 4 | **Thin-page policy** | Per-page: 0 impressions after 8 weeks → review/`noindex` | `SEO_AEO_SUPERPROMPT_V2.md` §5 | Individual page review trigger | **No — requires GSC, per-page.** |
| 5 | **Organic-attributed signups/month (north-star)** | Signups where the visitor's first (or any) touch was a `seo_page_viewed` event, joined via `visitorId` | `SEO_AEO_SUPERPROMPT_V2.md` §5 | Baseline 0 → P1 10/mo → P2 50/mo → P3 200/mo | **No — join not built (§2).** Approximable only via GA4 landing-page cohort analysis (§5.3), which is coarser (session-level, not visitor-level) and depends on a conversion event that likely doesn't exist in GA4 either (§5.3). |
| 6 | **Tranche-0 exit gate: ≥1 organic-attributed signup within 60 days** | Subset of #5, binary | `SEO_AEO_SUPERPROMPT_V2.md` §7 | ≥ 1 by 2026-08-25 | **No — same blocker as #5.** Deadline is 12 days out as of this writing. |
| 7 | **`seo_page_viewed` vs GSC clicks reconciliation** | Internal event count (organic `referrerClass`) vs GSC organic clicks, same page/date range — sanity-check they're the same order of magnitude | `SEO_AEO_SUPERPROMPT_V2.md` §5; `SEO_AEO_EXPANSION_001.md` §8 | "Same order of magnitude" (no hard number committed) | **Partially — internal side is queryable today (§5.4); GSC side needs §5.2.** Never actually run. |
| 8 | **Page-2 opportunity segment (query,page) at position 11–20, impressions>0, clicks=0** | GSC-only metric, `alternatives`/`compare`/`problem` URL prefixes | `SEO_AEO_EXPANSION_001/roadmap.md` §2.1 | Batch-1 target: ≥30% of cohort moves to position ≤10 OR ≥1.5× absolute CTR lift, checked at 8 weeks | **No — GSC only (§5.2).** |
| 9 | **Engagement quality** (scroll depth distribution, FAQ expand rate, related-link CTR) | `seo_scroll_depth` milestone distribution; `seo_faq_expanded` count ÷ `seo_page_viewed` count; `seo_related_page_clicked` count ÷ `seo_page_viewed` count | Implicit in the 5-event instrumentation plan (no hard target committed) | None committed — directional only | **Yes, in principle** — the raw events exist in the internal DB (subject to the §1.4 delivery-gap caveat). No report computes it; would need a one-off query (§5.4) since PostHog dashboards aren't confirmed configured and GA4 never receives these events at all. |

---

## 5. What to pull from GA4 and GSC — copy-pasteable

**Read §5.1 first — it changes what the rest of this section can tell you.**

### 5.1 Step 0 — confirm what GA4 is actually receiving (do this first, takes 2 minutes)

I found **zero** `gtag.js`, Google Tag Manager container, or any `G-XXXXXXX` measurement ID anywhere in the `apps/web-app` source tree. The only analytics wiring in the codebase is PostHog (env-key-gated, unknown production status) and Umami (separate auto-pageview script, env-var-gated). If GA4 is showing you data, the tag is either (a) injected outside this repo — e.g., pasted into a hosting/CDN layer, added via a GTM container that itself isn't in source, or configured through some integration I can't see from source — or (b) not actually receiving traffic at all.

**Do this now:**
1. In GA4, go to **Reports → Realtime**. Open `ledgerium.ai` in a new private/incognito browser tab and click through a couple of SEO pages (e.g. `/software/salesforce`, `/alternatives/scribe`).
2. If you see yourself show up in Realtime within ~60 seconds (as an active user, with `page_view` events under "Event count by Event name"), GA4 **is** live and capturing at least default automatic events. Continue to §5.2 onward.
3. If nothing appears, GA4 is not receiving traffic from this app at all, and none of the GA4 instructions below will return data — the property needs a tag installed before it can answer anything. (This would also mean the GA4 access you have is currently showing you either test/other-property data, or nothing.)
4. Separately, in GA4 **Admin → Data display → Events** (or the Events report), check whether any of these appear: `sign_up`, `form_submit`, `form_start`. This tells you whether GA4 has *any* signal resembling a signup, even a crude one. Given no custom `gtag('event', ...)` call exists in source for signup, the honest expectation is that **none of GA4's custom events exist** — at most you may see the generic Enhanced Measurement `form_submit`/`form_start` events firing on the real `<form>` at `/signup` (`SignupPageClient.tsx` uses a genuine HTML `<form>`, which Enhanced Measurement can auto-detect if that setting is on). If `form_submit` is present, it is a coarse proxy for "attempted signup," not "signup succeeded," and it carries no page-type/SEO context of its own — only the standard GA4 session/landing-page dimensions can be layered on top of it.

### 5.2 What ONLY Google Search Console can answer

GA4 has **no visibility into search impressions, queries, average position, or Google's indexation status** — this data does not exist anywhere in Analytics. It is exclusively in Search Console.

1. **Verification status.** Open GSC → confirm `ledgerium.ai` (or `sc-domain:ledgerium.ai`) shows as **Verified**, not pending/unverified. If it shows unverified, or if the property doesn't exist at all, stop here — none of the numbers below exist yet and this is priority #0 to fix (see `docs/runbooks/SEO_GSC_SETUP.md` §1).
2. **Sitemap status.** GSC → **Sitemaps** → confirm `sitemap.xml` is listed as "Success" and check the "Discovered URLs" count against the live count (194 per your crawl). A mismatch, or a status other than Success, means submission either didn't happen or is stale.
3. **Indexation coverage (answers metric #2 in §4 above).** GSC → **Indexing → Pages** (the "Page indexing" report):
   - Note the **"Not indexed"** total and expand the reason breakdown (common ones to look for: "Crawled — currently not indexed," "Discovered — currently not indexed," "Excluded by 'noindex' tag," "Not found (404)" — the last of these should include `/answers`).
   - Note the **"Indexed"** total.
   - Compute: `Indexed ÷ (Indexed + Not indexed, excluding pages you deliberately excluded/noindexed)`. Compare against the ≥80% gate.
   - Export the full URL-level list (there's an export button) if you want a page-by-page view, cross-referenceable against the 12 route prefixes to get a per-page-type % indexed (nothing in GSC groups by your internal page-type taxonomy — you'd bucket the exported URLs by prefix yourself in a spreadsheet).
4. **URL Inspection on `/answers`.** GSC → **URL Inspection** → paste `https://ledgerium.ai/answers` → check its current status (this will likely explain, from Google's side, how the 404 has been handled — "Not found (404)," "Crawled - currently not indexed," or "URL is unknown to Google" if it hasn't been crawled yet).
5. **Performance report (impressions/clicks/CTR/position — answers metrics #3, #7, #8 in §4 above).** GSC → **Performance → Search results**:
   - **Date range:** set a custom range from **2026-06-26** (Tranche-0 publish date) to today, and separately pull the **trailing 28 days** for a recency view.
   - **Dimensions to add:** Query, Page (both available as columns/tabs in the Performance UI).
   - **Filter by page:** use the "Page" filter → "Custom (regex)" → enter a pattern matching the 12 SEO route prefixes, e.g.:
     ```
     ^https://ledgerium\.ai/(compare|workflow-library|software|use-cases/personas|use-cases/problems|sop-templates|ai-opportunities|departments|industries|alternatives|competitors|answers)/
     ```
   - **Metrics shown:** Total clicks, Total impressions, Average CTR, Average position — all four, per page and per query.
   - **Compute zero-impression rate (metric #3):** export the Pages tab with this filter applied; count how many of your 164 published SEO page URLs do **not** appear in the export at all (0 impressions = the page doesn't show up in Performance data). `count(missing) ÷ 164`. Compare against <30%.
   - **Compute page-2 opportunity segment (metric #8):** in the same Performance view, add Position as a column, then filter/sort for `Position` 11–20 AND `Clicks = 0` AND `Impressions > 0`, further filtered to the `alternatives`/`compare`/`problem` (document/approval-workflow family) prefixes specifically, per `SEO_AEO_EXPANSION_001/roadmap.md` §2.1. This has to be done via export + spreadsheet filtering — GSC's UI doesn't support a compound "clicks=0 AND impressions>0 AND position between" filter directly.
6. **AI Overview / AI-referral visibility (best-effort, verify it still exists in your GSC UI):** Google added an "AI overviews" option to the **Search Appearance** filter in the Performance report during 2025. If present in your account, filter Search Appearance → "AI overview" to see impressions/clicks where your pages were cited inside an AI Overview. I cannot confirm this filter is present or named identically in your account from here — check the Search Appearance filter dropdown. This is the **only** GSC-native signal for AI-answer-engine visibility; it does not overlap with, and cannot validate, the app's own client-side `referrerClass: 'ai'` classification (§1.3), which measures a different thing (referral traffic that already arrived, not citation/impression inside an AI answer).

### 5.3 What GA4 can answer (with the caveats from §5.1)

All of these assume GA4 is confirmed live per §5.1 step 1–3. None of these can see `pageType`, `slug`, `referrerClass`, scroll milestones, FAQ engagement, or related-link clicks — those fields exist only in the app's own internal DB (§5.4) and, if configured, PostHog.

1. **Landing-page traffic volume by SEO section.** Reports → **Engagement → Pages and screens**, or build a **Report → Explore → Free form** exploration:
   - Dimension: **Page path** (not "Page path + query string" — you don't need query params here).
   - Metrics: **Views, Active users, Sessions, Engaged sessions, Average engagement time per active user, Engagement rate**.
   - Date range: **2026-06-26 to today** (custom).
   - Filter: apply a "Page path" **contains** filter once per prefix (GA4's UI filter doesn't support full regex in the standard report, only in Explorations) — run it 12 times, once per prefix: `/compare/`, `/workflow-library/`, `/software/`, `/use-cases/personas/`, `/use-cases/problems/`, `/sop-templates/`, `/ai-opportunities/`, `/departments/`, `/industries/`, `/alternatives/`, `/competitors/`, `/answers/`. Export each and stack them in a spreadsheet with a manually-added "page type" column — this reconstructs your internal taxonomy from the URL, since GA4 doesn't know it natively.
   - If you'd rather do this once instead of 12 times, use **Explore → Free form**, set the Page path dimension, and add a **regex filter** (Explorations support regex): `^/(compare|workflow-library|software|use-cases/personas|use-cases/problems|sop-templates|ai-opportunities|departments|industries|alternatives|competitors|answers)/` — one pull, all 12 prefixes together, with Page path still broken out per row so you can bucket afterward.
2. **Session source/medium and channel mix for SEO landing traffic.** Reports → **Acquisition → Traffic acquisition**, or an Exploration with:
   - Dimension: **Session default channel group** and/or **Session source/medium**.
   - Secondary dimension / filter: **Landing page** matching the same regex as above (this is the closer proxy to "arrived via an SEO page," vs. "Page path" which counts any pageview regardless of entry point).
   - Metrics: Sessions, Engaged sessions, Engagement rate, Average session duration.
   - This tells you: organic search vs. direct vs. referral mix specifically for sessions that *entered* the site through an SEO page. Check whether "Organic AI"/"AI channel" appears as a value in "Session default channel group" — Google introduced this default channel grouping category in 2025 for AI-chatbot referrals; I cannot confirm its exact label or presence in your account from source code, verify in the dimension's value list.
   - To approximate the app's own `referrerClass: 'ai'` bucket manually (in case the above channel doesn't exist or under-classifies), add a **Session source** filter matching the same 10 domains the app uses: `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com`, `grok.com`, `you.com`, `phind.com`, `meta.ai`, `poe.com`. This will not match exactly (GA4's own bot/referrer classification differs from the app's `document.referrer`-based logic), but it's the closest apples-to-apples cross-check available.
3. **Signup conversion by landing page (only if a real conversion signal exists — see §5.1 step 4).** If `form_submit` appears as an event in GA4 and is marked as a Key Event (Admin → Events → toggle "Mark as key event"), build an Exploration:
   - Dimension: **Landing page** (regex-filtered to the 12 prefixes, as above).
   - Metric: **Key events** (or **Conversions**) for `form_submit`, plus **Sessions**, to compute a rough conversion rate per SEO entry cohort.
   - **Caveat, stated plainly:** this is session-scoped, not visitor-scoped, and `form_submit` fires on any form submission attempt (including failed validation) — it is not equivalent to `signup_completed` in the app's own event model, and it cannot be joined back to a specific `pageType`/`slug`, only to whatever URL was the session's landing page. Treat this as a directional proxy only, and only if it exists — do not present it as the north-star metric from §4 row 5.
4. **What GA4 flatly cannot give you, under any configuration short of adding custom event tracking:** per-page-type breakdown as a first-class dimension (must reconstruct from URL, as above); `referrerClass` exactly as the app defines it; scroll depth at 25/50/75/90% milestones (GA4's own Enhanced Measurement "Scrolls" event fires once, at 90%, and is a different event from the app's `seo_scroll_depth`); FAQ-expand engagement; related-page-click-through rate with `linkRank`; and the exact `visitorId`-based individual join described in §2 (GA4 has its own separate anonymous client ID system, entirely disconnected from the app's `localStorage` `ledgerium_visitor_id`).

### 5.4 What only the internal database (or PostHog, if configured) can answer

These require either direct DB access or a PostHog account with the SEO events flowing into it (unknown production status — `NEXT_PUBLIC_POSTHOG_KEY` presence could not be confirmed from this repo; ask whoever manages deploy secrets).

- **Raw counts per event, per page type, per day** — this is the data GA4 will never have. If you or an engineer has Postgres access, the `analytics_events` table (Prisma model `AnalyticsEvent`) holds every event; a query like:
  ```sql
  SELECT event_name, DATE(created_at) AS day, COUNT(*) 
  FROM analytics_events
  WHERE event_name IN ('seo_page_viewed','seo_hub_viewed','seo_scroll_depth','seo_faq_expanded','seo_related_page_clicked','cta_clicked')
  GROUP BY event_name, day
  ORDER BY day;
  ```
- **The reconciliation check `SEO_AEO_SUPERPROMPT_V2.md` §5 committed to** ("`seo_page_viewed` organic-referrer volume vs. GSC clicks, same order of magnitude"):
  ```sql
  SELECT DATE(created_at) AS day, COUNT(*) AS organic_seo_pageviews
  FROM analytics_events
  WHERE event_name = 'seo_page_viewed'
    AND properties::jsonb ->> 'referrerClass' = 'organic'
  GROUP BY day ORDER BY day;
  ```
  Compare this day-by-day against the GSC Performance "Clicks" number from §5.2, same date range, same page set. This is the single cheapest sanity check available and it has apparently never been run.
- **The attribution join itself (§2), as a one-off, not a shipped report:**
  ```sql
  WITH seo_visits AS (
    SELECT properties::jsonb ->> 'visitorId' AS visitor_id,
           properties::jsonb ->> 'pageType' AS page_type,
           properties::jsonb ->> 'slug' AS slug,
           created_at AS viewed_at
    FROM analytics_events
    WHERE event_name = 'seo_page_viewed'
  ),
  signups AS (
    SELECT user_id, properties::jsonb ->> 'visitorId' AS visitor_id, created_at AS signed_up_at
    FROM analytics_events
    WHERE event_name = 'signup_completed' AND user_id IS NOT NULL
  )
  SELECT s.page_type, s.slug, COUNT(DISTINCT g.user_id) AS attributed_signups
  FROM seo_visits s
  JOIN signups g ON g.visitor_id = s.visitor_id AND g.signed_up_at >= s.viewed_at
  GROUP BY s.page_type, s.slug
  ORDER BY attributed_signups DESC;
  ```
  This is the query that answers your north-star metric (§4 row 5). It does not exist today as running code. Running it retroactively against whatever data has already accumulated since 2026-06-26 is the fastest way to get a real (if imperfect, per §1.4/§2's caveats) number before the 60-day Tranche-0 gate lands on 2026-08-25.
- **PostHog**, if the API key is actually set in production, would receive the identical event stream (it's the same `track()` call) and could answer all of the above through its own UI (Insights, Trends, Funnels) without writing SQL — but only if `NEXT_PUBLIC_POSTHOG_KEY` is genuinely configured in the deployed environment, which I could not confirm from this repository (no `.env` files are present in the working tree to inspect).

---

## 6. Summary of what to do, in order

1. Confirm GSC verification status (§5.2 #1). This is the fastest, highest-leverage check — if it fails, the entire indexation-health-gate commitment has been unmeasurable since day one.
2. Confirm GA4 is actually receiving traffic (§5.1). If not, GA4 access is currently decorative for this question.
3. Pull the GSC indexation and impressions numbers (§5.2 #3, #5) and score them against the ≥80% indexed / <30% zero-impression gate the team already committed to — this alone answers "is the content being found by Google," independent of conversion.
4. Run the reconciliation SQL (§5.4) if DB access is available, to sanity-check the internal event volume against whatever GSC shows.
5. Run the attribution join SQL (§5.4) as a one-off before the 2026-08-25 Tranche-0 signup gate deadline — this is the only way to get a real answer to "has anyone signed up because of an SEO page" before that date, since no shipped code computes it.
6. Treat the `/answers` 404 as a data-quality issue for #3, not a separate investigation — it will show up in the GSC Page indexing export as a 404 reason, and its root cause (sitemap.ts unconditionally listing all `HUB_TYPES` without a route-existence check) is already identified above if an engineer wants to fix it.
