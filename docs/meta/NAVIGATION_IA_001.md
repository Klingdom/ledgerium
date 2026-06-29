# Marketing Navigation IA — Spec (v2)

**Status:** REVISED for CEO review after a 7-agent critique pass. No code changed. Build begins after sign-off.
**Date:** 2026-06-28
**Type:** Mode 3-adjacent multi-agent review → implementation-ready spec.
**Review panel (v2):** ux-designer · growth-strategist · product-manager · frontend-engineer · qa-engineer · analytics · competitive-researcher.

### Changelog v1 → v2 (what the critique changed)
- **"Library" menu removed.** Collapsed into a **4-item** bar (`Product · Solutions · Pricing · Resources`) — fixes the conversion-sequencing risk (content menu before Pricing) and the unrecognized-label problem ("Library" has no B2B precedent). The content clusters now live in a **Resources mega-menu**.
- **`/compare` hub will be built in v1** (it does not exist today — only `/compare/scribe` + dynamic `[slug]`). The v1 nav linking `/compare` without this would be a day-one 404.
- **Accessibility rewritten to a disclosure pattern** (was wrong `role="region"` + undefined focus). **Arrow-key roving tabindex deferred to v2-build** (Tab nav satisfies WCAG 2.1 AA).
- **New Interaction Model section** (§7): one-open-at-a-time, outside-click-close, route-change-close, CSS-hidden (crawlable) panels.
- **Analytics corrected** (§9): two-event schema with closed-union `item`; footer-click baseline; north star = **signup rate by entry cluster**; leading indicators; rollback threshold.
- **Acceptance criteria added** (§11) + **scope split into iterations A/B/C** (§10).
- **Deferred for now (per CEO):** "Book a demo" secondary CTA + a "Customers"/social-proof nav entry (the two-buyer additions). Logged in §14.

---

## 1. Problem
Current nav is flat — `Product · Pricing · Use Cases · Blog · Docs` — where "Use Cases" points at a single page and the **124-page library across 11 clusters is nav-invisible** (footer-only), undiscoverable by humans and crawlers and starved of nav-level link equity. Pricing in slot 2 reads price-led.

## 2. Recommended navigation (target state)
```
[Ledgerium]   Product   Solutions ▾   Pricing   Resources ▾          Sign in   [ Start free → ]
```
**4 top-level items + 2 auth CTAs.** Sticky on scroll. Two mega-menus: **Solutions** (audience) and **Resources** (content + company).

## 3. Menu contents (verified routes)

### 3.1 Product — `[link]` → `/product`

### 3.2 Solutions — `[mega-menu]` — the audience layer
| Group (heading) | Items (curated; "View all →" to the hub) | Routes |
|---|---|---|
| **Popular use cases** | Operations teams · Compliance · AI implementation | `/use-cases/operations`, `/use-cases/compliance`, `/use-cases/ai-implementation` |
| **By role** | Operations Managers · Business Analysts · Process Excellence Leads · RevOps Managers · Consultants · *View all roles →* | `/use-cases/personas/{operations-managers, business-analysts, process-excellence-leads, revops-managers, consultants}` · `/use-cases/personas` |
| **By department** | Finance · Operations · IT · HR · Sales Operations · *View all departments →* | `/departments/{finance, operations, it, hr, sales-operations}` · `/departments` |
| **By industry** | Manufacturing · Healthcare · Banking · Insurance · SaaS · *View all industries →* | `/industries/{manufacturing, healthcare, banking, insurance, saas}` · `/industries` |
| **(panel footer link)** | See how we compare → | `/compare` |

Notes: "Operations teams" (not "Operations") disambiguates from the By-department "Operations" entry. The "See how we compare →" footer link surfaces evaluation intent without a top-level Compare item.

### 3.3 Pricing — `[link]` → `/pricing`

### 3.4 Resources — `[mega-menu]` — content clusters + company
| Group (heading) | Items | Routes |
|---|---|---|
| **Templates & guides** | Workflow Library · SOP Templates · AI Opportunities *(New)* · Software Guides → Salesforce · NetSuite · SAP · ServiceNow · Jira · *View all software →* | `/workflow-library`, `/sop-templates`, `/ai-opportunities`, `/software/{salesforce,netsuite,sap,servicenow,jira}`, `/software` |
| **Learn** | Blog · Docs · How-to guides · How we research this | `/blog`, `/docs`, `/use-cases/problems`, `/methodology` |
| **Company** | About · Security · Support · Compare tools | `/about`, `/security`, `/support`, `/compare` |

### 3.5 CTAs
Sign in `[text → /login]` · **Start free** `[button → /signup]`. (Secondary "Book a demo" deferred — §14.)

## 4. Route → placement coverage (every route has a home)
| Route / cluster | Placement |
|---|---|
| `/` | Logo |
| `/product` | Product [link] |
| `/pricing` | Pricing [link] |
| `/use-cases/operations \| compliance \| ai-implementation` | Solutions · Popular use cases |
| `/use-cases/personas` (+12) | Solutions · By role |
| `/departments` (+8) | Solutions · By department |
| `/industries` (+8) | Solutions · By industry |
| `/compare` **(hub — built in v1)** + `/compare/[slug]` | Solutions panel-footer link + Resources · Company ("Compare tools") |
| `/workflow-library` (+18) | Resources · Templates & guides |
| `/sop-templates` (+12) | Resources · Templates & guides |
| `/ai-opportunities` (+8) | Resources · Templates & guides (New badge) |
| `/software` (+10) | Resources · Templates & guides |
| `/blog` · `/docs` | Resources · Learn |
| `/use-cases/problems` (+22) | Resources · Learn ("How-to guides") |
| `/methodology` | Resources · Learn ("How we research this") |
| `/about` · `/security` · `/support` | Resources · Company |
| `/alternatives` (+10) · `/competitors` (+10) | **Footer-only** — evaluation/SEO; reached via `/compare` + in-body hub links |
| `/privacy` · `/terms` · `/privacy/extension` | **Footer-only** — legal/compliance (verify `/privacy/extension` is footer-linked; it is Chrome-store-referenced) |
| `/install` · `/install-extension` | In-page CTA on `/product` + post-signup; footer |
| `/demo` | Homepage hero + `/product` |
| `/login` · `/signup` · `/forgot-password` · `/reset-password` · `/share/[token]` | Auth/utility — no nav entry |

Spoke pages (124 leaves) are never in nav — only hub links are.

## 5. Labels — decided
| Slot | Chosen | Rejected (why) |
|---|---|---|
| Audience menu | **Solutions** | "Use Cases" (mirrors slug, dev-adjacent) |
| Content+company menu | **Resources** | a separate "Library"/"Explore" menu (no B2B precedent; pulls intent pre-Pricing) |
| `/methodology` | **How we research this** | "Methodology" (academic at scan speed) |
| `/use-cases/problems` | **How-to guides** | "Problems" (negative) |
| `/compare` | **Compare tools** + "See how we compare →" | a top-level Compare item (signals defensiveness) |

Surfaced for sign-off (silent v1 decisions): nav label "Solutions" while URLs stay `/use-cases/*` (acceptable — nav labels are wayfinding, not URL mirrors); `/demo` stays nav-invisible (homepage/product only).

## 6. Accessibility — **disclosure pattern** (mandatory)
- Trigger = `<button aria-haspopup="true" aria-expanded={open} aria-controls={panelId}>`. Panel = a plain `<div id={panelId}>` containing `<ul>` of links — **no `role="region"`/`role="menu"`** (disclosure, not a menu widget).
- **On open, move focus to the first link in the panel.** **Escape** closes and **returns focus to the trigger** (simple document `keydown` listener — do NOT try to import `useEscapeDispatch`; it is coupled to `WorkflowRow`).
- **Tab** flows through panel links then to the next top-level item; Tab leaving the last panel link closes the panel.
- `aria-current` via **prefix match** behind the existing `mounted` gate. Prefix→trigger map:
  - Solutions ← `/use-cases/`, `/departments/`, `/industries/`, `/compare`
  - Resources ← `/workflow-library`, `/sop-templates`, `/ai-opportunities`, `/software`, `/blog`, `/docs`, `/methodology`, `/about`, `/security`, `/support`
  - Use `pathname === href || pathname.startsWith(href + '/')` (guards against `/productfoo` false-positives).
- Visible focus ring (`focus-visible:ring-2 focus-visible:ring-green-500`); transitions respect `prefers-reduced-motion`.
- **Deferred to v2-build:** Arrow Left/Right roving tabindex between triggers (Tab navigation already meets WCAG 2.1 AA for a nav landmark; roving tabindex ~doubles keyboard complexity).

## 7. Interaction model (NEW)
- **Click-only** to open (no hover-open in v1 — avoids trackpad hover-traps).
- **One panel open at a time:** opening a second trigger closes the first.
- **Outside-click closes** all panels; **Escape closes** all panels.
- **Route change closes all panels:** `useEffect(() => setOpenMenu(null), [pathname])` — required because the sticky nav is mounted once and does not remount on client navigation.
- **Panels are CSS-hidden, not conditionally rendered** (`hidden`/`visibility:hidden` toggled), so all links exist in the server-rendered HTML and are crawlable — this directly serves the §1 discoverability goal.
- All dropdown state is client-only `useState`; preserve the existing `mounted` auth gate (no #418 hydration regression).

## 8. Mobile
- Hamburger → full-height drawer. Each menu = one **accordion**, **max 2 levels**.
- **Solutions on mobile shows only 6 items** (3 Popular use cases + 3 hub links: All roles / All departments / All industries) — NOT the ~18 desktop leaves (avoids an unusable wall).
- Resources accordion shows the group headings with their items; "View all →" as the last row of a group.
- **"Start free" pinned** with real `position: sticky`/`fixed` inside the drawer, verified in-viewport at 375×667 with all sections expanded. Scroll-lock the body when the drawer is open. ThemeToggle stays in the header bar.

## 9. Analytics (corrected — two events)
Add to `AnalyticsEvent` in `lib/analytics.ts`. PostHog (anonymous `distinct_id`) is the attribution join layer; the custom `/api/analytics/events` backend cannot join (its `sessionId` is unpopulated) and the 2s flush risks loss on unload — **PostHog is the source of truth for nav metrics**.

```ts
| { event: 'nav_menu_opened'; menu: 'solutions' | 'resources'; device: 'desktop' | 'mobile' }
| { event: 'nav_link_clicked';
    item: NavItemId;                 // CLOSED union of every nav link id (no open string)
    href: string;
    group: 'top_level' | 'solutions' | 'resources';
    column: 'popular' | 'by_role' | 'by_department' | 'by_industry'
          | 'templates_guides' | 'learn' | 'company' | null;
    interactionPath: 'direct' | 'via_menu';
    device: 'desktop' | 'mobile' }
```
Also tag the nav CTA: `cta_clicked { location: 'nav_cta' }`. **Instrument footer cluster-link clicks** (`cta_clicked { location: 'footer_nav', destination }`) so a pre-change baseline exists.

### Success definition (replaces the unmeasurable "+40% vs footer")
- **Instrumentation gate (before ship):** both events live; footer-click baseline running ≥2 weeks pre-launch.
- **North star (4-week, PostHog funnel):** signup conversion of nav-referred cluster-hub visitors (`nav_link_clicked → seo_page_viewed → signup_completed`) **≥ parity** with organic/direct arrivals to the same hubs. Higher = nav delivers qualified intent.
- **Menu health:** `nav_menu_opened → nav_link_clicked` > 30% per menu.
- **CTA guardrail:** nav `cta_clicked {location:'nav_cta'}` rate per session **no worse than** pre-launch.
- **Leading indicators (48h):** desktop menu-open rate; open→click by menu; nav-CTA rate.
- **Secondary:** absolute count of `seo_page_viewed` preceded by `nav_link_clicked` (drop the "+40%" ratio until footer baseline exists).

## 10. Phasing — three iterations (split per PM/frontend)
- **Iteration A — restructure + routing + analytics + `/compare` hub.** Build the missing `/compare` index page; rewrite `PublicNav.tsx` to the 4-item structure with click open/close (one-open, outside-click, route-change close), CSS-hidden crawlable panels, real routes, the two analytics events + footer baseline tagging. Basic keyboard (Enter/Space/Escape, focus into panel + return).
- **Iteration B — a11y hardening.** Full disclosure semantics, `aria-current` prefix match, focus management edges, `prefers-reduced-motion`, axe gate. (Arrow-key roving deferred.)
- **Iteration C — mobile.** Accordions, curated Solutions (6), sticky CTA + scroll-lock, 375px verification.

Each is independently shippable; A is the user-visible win.

## 11. Acceptance criteria / definition-of-done (v1 = iteration A unless noted)
**Blocking gates:**
1. **Every nav href returns 200** (route-existence test over all §3/§4 nav links, incl. the new `/compare`). No dead links.
2. All 4 items render + link correctly; Solutions/Resources open and close (Enter/Space/Escape/outside-click/route-change); one-open-at-a-time.
3. Keyboard: open moves focus into panel; Escape closes + returns focus to trigger; Tab traverses panel then exits.
4. `aria-current` cases: `/departments/finance`→Solutions; `/pricing`→Pricing only; `/product`→Product only; `/productfoo`→none.
5. Hydration: no #418 on a dynamic route (e.g. `/share/[token]`) with a stale session cookie; logged-out CTAs preserved.
6. `nav_link_clicked` fires with the exact closed-union shape on a panel link click; `nav_menu_opened` fires on open.
7. Mobile (iter C): drawer toggles `aria-expanded`; "Start free" in viewport at 375×667 with all accordions expanded.
8. axe scan on `/` with a panel open = 0 critical/serious (iter B).
**Warning (track):** Tab-out-closes-panel; mobile expand keeps focus on trigger; ThemeToggle present post-rewrite; reduced-motion honored.

## 12. Rollback
Numeric trigger: if week-1 nav `cta_clicked {location:'nav_cta'}` per-session rate drops **> 8%** vs the 4-week pre-launch `cta_clicked` baseline, revert `PublicNav.tsx` to the prior commit and investigate. State is client-only, so revert is a clean single-file rollback.

## 13. Risks → mitigations
1. CTA dilution with two dropdowns → 4-item bar keeps it lean; CTA never inside a menu; guardrail + rollback (§12).
2. Mega-menu a11y (highest) → disclosure pattern + acceptance gates; don't ship iter B without keyboard + axe.
3. Mobile depth → curated 6-item Solutions; max 2 levels.
4. Dead links → blocking route test (§11.1).
5. Crawlability → CSS-hidden panels (§7), links in SSR HTML.
6. Hydration → preserve `mounted` gate; client-only dropdown state.

## 14. Deferred (revisit after v1)
- **Two-buyer additions (CEO-deferred):** "Book a demo" low-weight secondary CTA + a "Customers"/social-proof nav entry. Strong rationale (the documented CIO/IT gatekeeper won't "Start free"; no nav path to proof today) — revisit once v1 lands and/or case studies exist.
- Mega-menu featured/visual cards + AI spotlight in Solutions.
- Sticky-compress-on-scroll height; in-nav search (useful for 124 pages).
- Arrow-key roving tabindex (a11y polish).

---

## 15. Build-readiness addenda (resolves the v2 review)
The second 7-agent pass confirmed v2 resolved the v1 P0s; these close the remaining build-readiness items.

- **`/compare` hub — minimal content (iter A).** New `(public)/compare/page.tsx` (the existing `(app)/compare` is the authed tool — different surface). H1 "Compare Ledgerium to other tools"; one honest intro paragraph ("documented from real work" framing); a grid linking every existing head-to-head page (`/compare/[slug]` — Scribe, Tango, process-mining, task-mining, screen-recording, Process Street) plus the `/alternatives` and `/competitors` hubs; standard SEO metadata + WebPage JSON-LD; reuse the existing hub-index component. This is the content gate behind §11.1 for `/compare`.
- **`NavItemId` definition.** A closed union co-located with the nav config as the **single source of truth**, exhaustiveness-checked (adding a nav link without an id is a compile error). §11.6 asserts the fired `item` equals the clicked link's configured id. Prevents config↔analytics drift.
- **§11 iteration assignment (resolves the "v1 = iter A" conflict).** **Iter A gates:** §11.1 (all routes 200, incl. `/compare`), §11.2 (open/close + one-open + route-change), §11.5 (hydration), §11.6 (events). **Iter B gates:** §11.3 full focus-return, §11.4 (aria-current prefix), §11.8 (axe). **Iter C gate:** §11.7 (mobile). Iter A ships basic Enter/Escape open/close; full keyboard a11y is the iter B gate.
- **`/compare` active state.** The `/compare` page highlights the **Resources** trigger (its formal home); add `/compare` to the Resources prefix list in §6.
- **`/compare` dual placement is intentional.** Solutions panel-footer "See how we compare →" = evaluation entry while browsing by audience; Resources › Company "Compare tools" = utility lookup. Same URL, distinguished in analytics by `group`/`column` so conversion-by-path is measurable. (Drop the Resources one if you prefer a single placement.)
- **`cta_clicked` shape.** Nav CTA fires `cta_clicked { location: 'nav_cta', destination: '/signup' }`; footer baseline fires `cta_clicked { location: 'footer_nav', destination }` (the existing variant requires `destination`).
- **Footer baseline ships first.** Footer-link tagging lands as a small standalone change BEFORE iter A, so the ≥2-week baseline accrues in parallel with the A/B/C build (no launch delay).
- **Company items stay discoverable in both places.** About/Security/Support live in Resources › Company (precedented — Hotjar/Asana run a Company sub-group in Resources) AND remain in the footer. Footer redundancy mitigates the content-menu-overload concern UX raised.
- **Templates & guides prominence.** Since featured cards are deferred (§14), build that group with a prominent heading and top visual weight on the four hub links so the surfaced library is scannable without cards.
- **Added warning-tier acceptance tests:** same-trigger click re-closes the panel; a cold SSR render of `/` contains the panel link hrefs (crawlability); mobile drawer applies body scroll-lock (restored on close); mega-menu does not clip at 200% zoom on a 1280px viewport.

---

*On sign-off, Iteration A begins: footer-baseline tagging (pre-A) → build `/compare` hub + rewrite `PublicNav.tsx` (4-item structure, crawlable panels, two analytics events), validate against §11 iter-A gates (typecheck + build + tests + route-existence + hydration), hand off for manual deploy.*
