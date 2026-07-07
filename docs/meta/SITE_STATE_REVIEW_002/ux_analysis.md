# UX / IA / Accessibility Analysis — SITE_STATE_REVIEW_002

**Track:** UX, navigation, information architecture, empty/error states, accessibility, mobile
**Mode:** 3-adjacent read-only review (NON-counting). Zero code modified.
**Date:** 2026-07-07
**Scope:** `apps/web-app/src/app/(public)/*` (~124-page SEO surface + core marketing pages), `components/nav/navConfig.ts` + `PublicNav.tsx` + `Footer.tsx`, `apps/web-app/src/app/(app)/dashboard`, `components/dashboard-v2/`, `components/AppShell.tsx`.

---

## 1. Nav IA coherence — does the 4-item mega-menu map cleanly to the ~124-page surface?

**Mostly yes, with one real fragmentation gap.** `TOP_NAV` in `navConfig.ts` (Product / Solutions / Pricing / Resources) cleanly covers personas (`/use-cases/personas/*`), departments (`/departments/*`), industries (`/industries/*`), software guides (`/software/*`), workflow library, SOP templates, AI opportunities, blog, docs, about/security/support. Every registry-driven page type (`use-cases`, `departments`, `industries`, `software`, `sop-templates`, `workflow-library`, `ai-opportunities`) has a nav hub with a `viewAll` link, which is the correct pSEO pattern (hub → children reachable, not orphaned).

**Gap — "Compare" content is split across three unlinked systems, only one of which is in top nav:**
- `/comparisons` — the hub referenced in nav (`sol_compare` footer-link in Solutions menu, `res_compare` in Resources → Company). Hand-built `HAND_BUILT` array has exactly one entry (`/compare/scribe`); the rest come from `getPagesByType('compare')`.
- `/alternatives` + `/alternatives/[slug]` — a **separate hub family**, not in `TOP_NAV` or `MENU_PREFIXES` at all. Only reachable via a secondary CTA at the bottom of `/comparisons` (`apps/web-app/src/app/(public)/comparisons/page.tsx:104`) or via `Footer.tsx`'s "Use Cases" column.
- `/competitors` + `/competitors/[slug]` — same situation as alternatives.

Net effect: `/alternatives/[slug]` and `/competitors/[slug]` detail pages sit **3 clicks from the primary nav** (nav → `/comparisons` → hub → detail) and are invisible to `MENU_PREFIXES` active-state logic, so a visitor deep in an alternatives page gets no nav highlight telling them where they are. `Footer.tsx:24-31` also mis-files `/compare/scribe`, `/alternatives`, `/competitors` under a **"Use Cases"** heading alongside actual persona pages (Operations Teams, Compliance) — a taxonomy mismatch that will confuse users scanning the footer for a specific comparison. No pages are technically unreachable/orphaned (crawl-wise this is fine), but the *user-facing* IA around competitive content is incoherent relative to the rest of the nav's flat, one-hop structure.

---

## 2. Landing → install → dashboard journey friction

Signup flow is lean: `SignupPageClient.tsx` redirects straight to `/dashboard` on success (no email-verify gate, no forced intermediate step) — good, low friction. `DashboardV2Shell` renders `FirstRunTutorial` for the 0-workflow state, which is a genuinely strong activation surface (honest copy, 3-step record→measure→act, single primary CTA to `/install`).

**Friction found: two divergent, un-reconciled "install the extension" pages.**
- `/install` (`apps/web-app/src/app/(public)/install/page.tsx`) — the canonical, fully-built page (4-step sideload walkthrough, troubleshooting FAQ, sync instructions). Linked from homepage, `/product`, Footer, `/docs`, `FirstRunTutorial`'s primary CTA.
- `/install-extension` (`apps/web-app/src/app/(public)/install-extension/page.tsx`) — a shorter, thinner variant with different copy and no troubleshooting section. Linked only from `/demo`'s CTA and from `apps/web-app/src/lib/onboarding.ts:51` (`actionHref: '/install-extension'`), which drives `OnboardingChecklist`.
- `OnboardingChecklist` (the component that points at `/install-extension`) is **only rendered in the legacy v1 dashboard path** (`apps/web-app/src/app/(app)/dashboard/page.tsx:2044`, inside `EmptyDashboard`, reachable only via the `?v2=0` rollback escape hatch per `page.tsx:312-318`). `DashboardV2Shell` — the live default — never imports `OnboardingChecklist`. So the in-app onboarding path to `/install-extension` is effectively dead in production, while `/demo`'s CTA to the same page is live. Net result: real users land on two different "how to install" experiences depending on entry point, with no functional reason for the split.

Fix direction: retire `/install-extension` (or 301/redirect it to `/install`), update the `/demo` CTA to point at `/install`, and delete the dead `OnboardingChecklist` v1 code path once the `?v2=0` flag is formally retired (already tracked as a long-open follow-up per `CLAUDE.md`).

---

## 3. Empty-state / first-run guidance on the app dashboard

`FirstRunTutorial.tsx` (v2, live) is a strength: labelled `<section>`, ordered 3-step list, single clear primary CTA with a visible focus ring, honest zero-fabrication copy consistent with the product's stated positioning. This should be held up as the pattern for other empty states.

**Finding:** the legacy v1 `EmptyDashboard` component (`apps/web-app/src/app/(app)/dashboard/page.tsx:2022-2090`) is still fully present in the codebase with **different empty-state copy** ("Your process intelligence center is empty" / raw `<a>` direct-download button instead of a routed `/install` CTA) and is still reachable via `?v2=0`. This is dead-weight duplication rather than an active bug (default traffic never sees it), but it's ~2000 lines of legacy dashboard code sharing a file with the still-used API/type definitions, which increases the risk that a future edit to shared helpers accidentally regresses the live v2 path. Low urgency, but worth flagging as technical/UX debt now that the "14-day soak" gate referenced throughout `CLAUDE.md`'s iteration history is almost certainly long past given today's date.

---

## 4. Accessibility posture — did the mobile a11y hardening reach beyond the nav?

**No — it is scoped tightly to `PublicNav.tsx`/`navConfig.ts` and does not extend to the authenticated app shell or the SEO page templates.**

- `PublicNav.tsx` (marketing nav, used on all ~124 SEO pages via `(public)/layout.tsx`) is well hardened: `aria-haspopup`/`aria-expanded`/`aria-controls` on menu triggers, Escape-to-close with focus return to trigger (`:66-77`), focus moved into the panel on open (`:80-83`), body-scroll lock while the mobile drawer is open (`:86-93`), Escape closes the mobile drawer with focus return to the hamburger (`:96-106`). This is genuinely solid pattern work.
- **`AppShell.tsx` (the authenticated app's top nav, rendered on every `/dashboard`, `/workflows/*`, `/sop/*`, `/analytics`, `/admin/*` page) received none of this.** Its 7 primary nav items (`NAV_ITEMS`, lines 22-30: Workflows/Compare/Intelligence/Actions/Teams/Upload/Account) render each `<Link>`'s visible label inside `<span className="hidden sm:inline">{label}</span>` (lines 46-61). Below the `sm` breakpoint, `hidden` is `display:none`, which removes the text from the accessibility tree entirely — the icon (a `lucide-react` SVG with no `aria-label`/`aria-hidden`/`title` on the parent `Link`) is the link's *only* content on mobile. Result: **on any viewport under 640px, all 7 primary in-app navigation links have no accessible name** — a WCAG 4.1.2 (Name, Role, Value) and 2.4.4 (Link Purpose) failure, and a real usability problem for sighted mobile users too (no visual label to explain "Actions" vs. "Intelligence" vs. "Compare" icons). Three secondary controls (Get Extension / Docs / Sign out) at least have a `title` attribute, which is a partial mitigation (not reliably announced, no visible affordance on touch), but the primary nav does not even have that.
- There is also **no responsive collapse** for this nav at all — 7 icon links + logo + extension button + user email + theme toggle + docs + sign-out are all rendered in a single `flex` row in a 56px-tall header (`h-14`) regardless of viewport. On a 375px screen this will wrap or force horizontal crowding of icon-only targets that are borderline for WCAG 2.5.5 target size. This is the sharpest contrast in the whole review: the marketing nav just got a full mobile-drawer treatment, but the actual logged-in product — which is where retained, converting users spend their time — did not.
- Content templates (`components/seo/WorkflowPageView.tsx` and siblings) were not part of the hardening pass either, but this is lower-stakes: they are largely static content with minimal interactive surface. The one interactive pattern reused across pSEO pages, `FaqBlock.tsx`, is well-built (`button` + `aria-expanded` + `aria-controls`, answers kept in the DOM via `hidden` rather than removed, so FAQ JSON-LD stays authoritative) — no action needed there.
- **No skip-to-content link exists anywhere in the codebase** (checked `app/layout.tsx`, `(public)/layout.tsx`, `(app)/layout.tsx`, `AppShell.tsx` — none). Every keyboard/screen-reader user must tab through the full header (including two mega-menu triggers on marketing pages) before reaching page content, on every one of the ~124+ public pages and every app page. This is a standard, low-effort WCAG 2.4.1 (Bypass Blocks) fix that would pay off site-wide.

---

## 5. Mobile / responsive concerns

- **`AppShell.tsx`** — see §4; this is the most concrete mobile defect found (no collapse, no accessible labels below `sm`).
- `dashboard-v2/WorkflowRow.tsx` and `WorkflowList.tsx` already progressively hide table columns at `sm`/`md` (`hidden sm:table-cell`, `hidden md:table-cell`) — this is a reasonable, already-shipped responsive pattern; no new issue found here.
- `PublicNav.tsx` mobile drawer is functionally solid but is an in-flow block (not a `position: fixed`/scrim overlay) — body scroll is locked while open, which mostly compensates, but there is no `aria-hidden`/`inert` applied to the rest of the page while the drawer is open, so assistive-tech users navigating by landmark/heading (rather than linear Tab order) could still reach backgrounded content. Minor; not blocking given the scroll-lock.

---

## Top 5 UX Findings (severity-ranked)

**P1 — AppShell (in-app) top nav has no mobile collapse and no accessible names below 640px.**
File: `apps/web-app/src/components/AppShell.tsx:22-93`. All 7 primary nav links lose their only text label via `hidden sm:inline` (removed from a11y tree) and have no `aria-label`; no hamburger/collapse behavior exists at all. Fix: give every `Link` an explicit `aria-label={label}`, and add a real mobile menu (reuse the `PublicNav` drawer pattern — focus trap, Escape-to-close, focus return — this codebase already has that pattern built once).

**P1 — Sitewide dead link: Footer "Interactive Demo" points to `/dashboard.html`, which does not exist.**
File: `apps/web-app/src/components/Footer.tsx:10`. No route, rewrite, or middleware maps `.html` paths (confirmed via grep across `next.config.js`, `middleware.ts`). Rendered in the footer of every public + app page. Fix: change `href` to `/demo` (the actual interactive-demo route) or `/dashboard`.

**P2 — No skip-to-content link anywhere in the app.**
Files: `apps/web-app/src/app/layout.tsx`, `(public)/layout.tsx`, `(app)/layout.tsx`. WCAG 2.4.1 gap affecting all ~124 SEO pages plus the full authenticated app; every keyboard/AT user must tab through the header (including mega-menu triggers) on every page. Fix: one shared `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` component + `id="main-content"` on each `<main>`.

**P2 — Compare/Alternatives/Competitors IA is fragmented and mis-labeled.**
Files: `navConfig.ts` (only `/comparisons` in nav), `comparisons/page.tsx:104-111` (secondary CTAs to `/alternatives` and `/competitors`), `Footer.tsx:24-31` (files these under "Use Cases" alongside persona pages). Three parallel comparison systems exist with inconsistent nav depth (1 hop vs. 3 hops) and no `MENU_PREFIXES` active-state coverage for two of them. Fix: fold `/alternatives` and `/competitors` into `MENU_PREFIXES.resources` (or give Solutions/Resources a "Compare" column with all three sub-hubs), and move the footer entries out of "Use Cases" into their own "Compare" column.

**P3 — Duplicate install-extension pages with a dead onboarding link.**
Files: `install/page.tsx` vs `install-extension/page.tsx`, `lib/onboarding.ts:51`, `dashboard/page.tsx:2044` (legacy `OnboardingChecklist`, only reachable via the long-stale `?v2=0` escape hatch). Two divergent install experiences exist for no functional reason, and one is fed by dead v1-only code. Fix: retire `/install-extension` (redirect to `/install`), repoint `/demo`'s CTA, and delete the v1 dashboard fallback once the flag-retirement follow-up finally lands.
