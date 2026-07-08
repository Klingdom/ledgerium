# Site State Review 002 — Full-Website Current-State Review

**Type:** Mode 3-adjacent multi-agent review (NON-counting; read-only, ZERO product code changed)
**Date:** 2026-07-07
**Directive (CEO):** "Give me a current state review of the website using all subagents." (post computer-restart)
**Scope:** Full Ledgerium web presence — public marketing/SEO engine (~124 programmatic pages) + app dashboard surface + supporting API/data/security layers, on `main`.
**Agents (9, parallel):** frontend-engineer · qa-engineer · product-manager · ux-designer · system-architect · analytics · growth-strategist · competitive-researcher · security (general-purpose).
**Per-agent artifacts:** `docs/meta/SITE_STATE_REVIEW_002/{frontend,qa,pm,ux,architect,analytics,growth,security}_analysis.md` (competitive returned inline — no file-write tool).

---

## 1. Executive verdict

**Technical health: SHIP-READY / GREEN.** Typecheck clean; **2086/2086 web-app tests pass across 109 files**; process-engine 502/502; extension-app 301/301. Zero broken routes; all 124 SEO pages validate; all 11 dynamic `[slug]` families have correct `generateStaticParams` + `notFound()` guards. The prior review's P0 (`force-dynamic` defeating SSG) is **confirmed fixed and holding** (commit c9e8912; verified via `PublicNav` hydration gate, not a band-aid).

**Product/positioning health: AMBER.** The engineering is clean, but the website tells a **capture→SOP→AI-readiness** story while the company's stated strategy is **observe→recommend→execute**. The AI-integration "execute" narrative is absent from the public site, is actively *contradicted* by comparison copy, yet is *priced* on Team/Growth tiers — a live AI-washing risk and unclaimed 18–24-month competitive window.

**Two hard blockers to real-world adoption sit outside the tested code:** (1) the competitive comparison pages are **factually stale** (Scribe now ships agentic mining + hit $1.3B), and (2) extension activation still requires **manual Developer-Mode sideload**, not a Web Store install — the highest-intent funnel step is both broken UX and completely un-instrumented.

**No P0 security or data-integrity defects.** Server surface is well-hardened. Main gaps are rate-limiting and a GDPR claim-vs-reality gap.

---

## 2. Validation baseline (evidence)

| Command | Result |
|---|---|
| `pnpm --filter @ledgerium/web-app typecheck` | **GREEN** — 0 errors |
| `pnpm --filter @ledgerium/web-app test` | **GREEN** — 109 files / **2086/2086** |
| process-engine test | 502/502 (12 files) |
| extension-app test | 301/301 (14 files) — real-ext harness NOT run |
| SEO content validation (`lib/seo/content.test.ts`, 124 pages) | 0 errors |
| Nav dead-link guard (`navConfig.test.ts`) | 0 dead links |
| SSG restoration (`(public)/layout.tsx`) | `force-dynamic` removed — confirmed held |

---

## 3. Consolidated findings by severity

### P0 — Blockers to launch / real-world adoption

- **P0-1 (competitive, factual risk) — Scribe comparison pages are materially stale. [RESOLVED 2026-07-07]** `compare/scribe/page.tsx` + `content/pages/alternatives.ts` + `content/pages/competitors.ts` still framed Scribe as screenshot-only ("Process intelligence: false"). **Fixed:** all three surfaces now honestly acknowledge Scribe's Optimize AI-mining layer (launched 2025) and re-anchor Ledgerium's differentiation on the durable moat — deterministic, evidence-linked, reproducible output vs Optimize's AI-inferred maps. Dated fields bumped to July 2026. `growth-strategist` rewrite; validated typecheck clean + 2086/2086 tests pass (content-contract validator held); no unsourced competitor facts introduced. Since late 2025 Scribe shipped **Optimize** (AI agents that mine cross-app activity, map processes, rank automation ROI) and reached **$100M ARR / $1.3B valuation / $75M Series C / 45% of Fortune 500**. `content/pages/compare.ts` explicitly mandates "dated, sourced, honest" claims — the current claims are now false and reputationally risky.
- **P0-2 (product/UX) — Extension activation requires manual Chrome Developer-Mode sideload. [SCAFFOLDED 2026-07-07 — gated on publish]** Root cause is that the extension is not yet on the Web Store (`config.ts` `chromeStoreUrl` is a placeholder). **Fixed structurally:** all install CTAs now route through `resolveInstallTarget()` (`lib/install.ts`) + `ExtensionInstallButton` — the moment `chromeStoreUrl` is set to a real listing, every button auto-switches to a one-click "Add to Chrome" store link (external tab, no download attr), no dead link in the interim. **Remaining gating action (CEO/ops):** submit the extension to the Chrome Web Store and replace the placeholder URL; then hide the sideload instruction sections on the two install pages (follow-up).
- **P0-3 (analytics) — Signup→install funnel is completely dark. [RESOLVED 2026-07-07]** The install buttons were bare `<a href download>` with zero click tracking. **Fixed:** added the typed `extension_install_clicked { method, location }` event; all 6 install CTAs (install hero/footer, install-extension hero/footer, dashboard footer, app nav) now fire it via `ExtensionInstallButton`, with a `location` dimension per surface and a `method` dimension (`direct_download` now, `web_store` on publish). Validated: typecheck clean, 2094/2094 tests (+8 pure-logic tests in `install.test.ts`). Downstream extension-load signal (post-install confirmation) remains a separate follow-up.
- **P0-4 (analytics) — PostHog is consent-gated opt-in** (`PostHogProvider` inits only on `localStorage` consent === `'full'`); "Essential Only" and pre-choice visitors generate zero PostHog data. First-party DB pipeline is unconditional but under-leveraged for marketing reporting.
- **P0-5 (growth/product) — AI-vision "execute" story absent AND contradicted while priced.** Home/product sell capture→SOP/map/scoring only; the approved positioning ("maps exactly where AI fits — and executes it when you're ready") appears nowhere, while `compare.ts` states Ledgerium "is not an execution platform" and `/use-cases/ai-implementation` frames Ledgerium as a data provider *for* n8n/Zapier. Yet pricing sells "AI agent composition" + "Integration risk assessment" on Team/Growth ($249/$799) with no product backing. AI-washing risk; top tiers priced ahead of demonstrable value.
- **P0-6 (qa, uncommitted WIP) — Extension `capture.ts` PII-title swap violates the Extension Reliability Invariant.** Uncommitted change swaps 15 `document.title` reads for `getSafePageTitle()` inside the forbidden capture pipeline; the originating artifact self-declares "CODE-COMPLETE, pending real-extension validation." Matches the exact iter-099 historical regression (unit tests passed, real capture broke). **Must not merge without the real-extension harness gate.**

### P1 — High priority

- **P1-1 (ux) — App mobile nav is unlabeled and non-collapsing.** `AppShell.tsx:22-93` hides all 7 authenticated nav labels via `hidden sm:inline` below 640px with no `aria-label` and no hamburger. The marketing nav just got full mobile-drawer a11y hardening; the logged-in product nav never did.
- **P1-2 (ux) — Sitewide "dead" footer link. [RESOLVED 2026-07-07 — root cause re-diagnosed]** `Footer.tsx:10` "Interactive Demo" → `/dashboard.html`. **Correction to the original finding:** this is NOT a missing page — `apps/web-app/public/dashboard.html` is a real, git-tracked 103 KB interactive demo (no-signup), reachable by direct URL. The true defect: the footer routed it through `TrackedLink` (→ `next/link`), whose App-Router client navigation finds no matching route for a static asset and renders the not-found page — so the link appeared dead on click. **Fixed:** `TrackedLink` now renders a native `<a>` (real browser navigation, tracking preserved) for non-route hrefs — static `/public` assets (`.html/.pdf/.zip`) and external protocols (`http(s)`/`mailto`/`tel`); internal routes still use `next/link`. Also fixes the footer `mailto:` Contact link. New pure `lib/href.ts` + 8 unit tests. Validated: typecheck clean, 2102/2102 tests.
- **P1-3 (frontend, perf) — Recharts statically bundled into `/dashboard`.** `DashboardV2Shell.tsx` (via `TopBand`→`RecordedTrendChart`) unconditionally ships Recharts in the primary chunk for every session, despite `next/dynamic` already used for the same purpose in 8 `demo/` components.
- **P1-4 (growth) — AI-adjacent features are invisible.** "AI agent composition" + "Integration risk assessment" exist only as pricing-table checkmarks — no product-page section, screenshot, or use-case page.
- **P1-5 (analytics) — SEO hub/index pages fire no page-view events** (`/departments`, `/industries`, `/software`, `/workflow-library`, `/sop-templates`, `/ai-opportunities`, `/alternatives`, `/competitors`); only their `[slug]` detail pages are instrumented.
- **P1-6 (analytics) — No stable anonymous visitor ID.** `EnrichedEvent.sessionId` is declared but never populated, so `seo_page_viewed` can't be joined to later `signup_completed` — SEO-page→conversion is not measurable in any built way.
- **P1-7 (security) — No rate limiting on core auth/abuse endpoints:** login brute-force (`lib/auth.ts:15-33`), signup spam, password-reset email-bombing, upload. Bootstrap + invite-accept have limiters; the highest-value endpoints don't.
- **P1-8 (competitive) — Determinism/evidence-linkage under-leveraged as a moat.** Pages use soft "structured/measurable" language but never assert reproducibility ("same recording → byte-identical SOP") against LLM-agent competitors whose outputs are inherently non-deterministic — the most defensible claim, weakest exactly where it matters.

### P2 — Medium

- **P2-1 (product/pricing) — Same-page pricing contradiction:** Team/Growth route to a waitlist per the pricing banner, while the same page's FAQ claims all paid plans include an instant 14-day trial.
- **P2-2 (frontend) — Unbounded `/api/workflows` fetch + non-virtualized `WorkflowList`** (1344-LOC `WorkflowRow`, no `React.memo`) scales linearly with workflow count.
- **P2-3 (frontend) — Stale `productionBrowserSourceMaps: true`** debug flag in `next.config.js` (leftover from the hydration investigation) — build cost + source exposure.
- **P2-4 (architect) — API envelope inconsistency:** `{data,error,meta}` applied only on newest routes (admin/operations is the clean reference); 5 `{data}` vs 204 `{error}` across 54 files, no shared helper, no `meta`. Zod on only 11/63 routes (mutation-side); GET query params reach Prisma unvalidated (NaN/allow-list gaps).
- **P2-5 (architect) — `portfolios` GET loads all join rows to `.length`-count in JS** instead of `_count` (unbounded fan-out).
- **P2-6 (security) — Unauthenticated analytics ingestion with spoofable `userId`, no RL** → forged funnel data + unbounded-write DoS.
- **P2-7 (security) — Claim-vs-reality:** security page advertises GDPR data export/deletion, but no deletion endpoint exists (`api/account`, `api/me` are GET-only); "No PII storage" overreaches given stored emails + captures.
- **P2-8 (ux) — Compare/Alternatives/Competitors IA fragmentation:** only `/comparisons` is in top nav; `/alternatives` + `/competitors` are 3 hops deep, mis-filed under "Use Cases" in the footer.
- **P2-9 (qa, WIP) — process-engine WIP bugs:** curly-quote mismatch in `sopBuilder.buildAction()` pinned as *expected* in `svrVaguePath.test.ts`; `contentEnricher.ts` spreadsheet-cell stripper drops legit tokens ("Q3"/"P0"/"V2") with zero negative-test coverage. New 242-LOC `specificity.ts` bypassed the D-4 `system-architect` gate.
- **P2-10 (competitive) — Celonis/UiPath pages understate live agentic execution** (Celonis Context Model + MCP + Ikigai acquisition; UiPath Maestro/Agent Builder) — already shipping observe→recommend→execute at enterprise scale.

### P3 — Low / hygiene

- Duplicate install pages (`/install` vs `/install-extension`); no skip-to-content link (WCAG 2.4.1) across all pages; `WorkflowRow` prop-spread defeats memoization; SAP Signavio + Zapier/n8n have zero comparison pages; account-enumeration via signup 409; upload leaks internal error detail; JSON-LD `dangerouslySetInnerHTML` unescaped (low risk, static); generic repetitive CTA copy ("Get Started Free" everywhere).

---

## 4. Confirmed strengths (preserve)

- **SEO/AEO engine is reference-quality:** single source of truth (`content/registry.ts`, 124 pages), discriminated-union content model, `RESERVED_SLUGS` collision guard, deterministic sitemap/JSON-LD, Speakable + KeyTakeaways AEO blocks, `/methodology` E-E-A-T page, curated `/llms.txt`. Above typical SaaS baseline.
- **Determinism/traceability invariants intact:** single injected `referenceNowMs`, UTC month boundary, MDR-P05 single-source-of-truth, I/O-free engine adapter.
- **Security server surface well-hardened:** bcrypt-12, SHA-256 single-use reset tokens, Stripe webhook signature verification, admin 404-cloaking, tenant ownership + 128-bit share tokens (no IDOR), no hardcoded secrets, safe upload handling.
- **Activation ladder is sound:** `OnboardingChecklist` (install→record→view SOP→view map) + honest, accessible `FirstRunTutorial` empty state. Trial→paid conversion is well-instrumented and visualized as a dropoff funnel.
- **SSG restored correctly**; SopTemplate execution redesign rendering-correct (pure server component).

---

## 5. Recommended sequencing (coordinator view — awaiting CEO direction)

These are single-outcome bounded-loop candidates, ordered by impact ÷ effort. Not started (Mode 3-adjacent review only).

1. **P0-1 Scribe/competitor comparison refresh** (factual + reputational; content-only; `growth-strategist` + `competitive-researcher`) — highest impact, low effort.
2. **P0-3 + P0-2 install-funnel instrumentation + Web Store path** (`analytics` + `frontend-engineer`) — unblocks activation measurement and the biggest UX drop-off.
3. **P1-2 dead footer link** + **P1-1 app mobile nav a11y** (`frontend-engineer`) — trivial-to-moderate, sitewide.
4. **P0-5 AI-vision progressive disclosure** — resolve AI-washing by *either* removing unbacked AI-tier claims *or* shipping the honest "coming" framing per the AI-vision review's progressive-disclosure plan (`growth-strategist` + `product-manager`).
5. **P1-7 auth rate limiting** (`security-engineer`/`backend-engineer`) — abuse hardening before external launch.
6. **P1-3 Recharts dynamic-import** + **P2-3 source-map flag** (`frontend-engineer`) — dashboard TTI.

**WIP hold:** the uncommitted extension `capture.ts` change (P0-6) MUST pass the real-extension harness before merge per the Extension Reliability Invariant; process-engine WIP bugs (P2-9) should be fixed before their branch lands.

---

## 6. Governance notes

- **NON-counting** Mode 3-adjacent review; zero product code touched; zero improvement-loop cadence increment; zero CLAUDE.md governance diffs.
- No P0 promotions applied to the live backlog by this review. If the CEO elects to act, findings should enter via the Audit-Intake Pattern (P0-only live promotion; remainder cold-pool) per CLAUDE.md § Audit-Intake Pattern.
- Validation: `git status` scope is limited to `docs/meta/SITE_STATE_REVIEW_002.md` + `docs/meta/SITE_STATE_REVIEW_002/` artifacts + this consolidation; no `*.ts`/`*.tsx` product files modified.
