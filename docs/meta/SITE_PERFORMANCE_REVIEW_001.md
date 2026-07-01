# Site Health & Performance Review 001

**Type:** Mode 3-adjacent multi-agent review (NON-counting; read-only, zero code changed)
**Date:** 2026-07-01
**Directive (CEO):** "Have subagents validate current site and database for health and performance."
**Scope:** The public marketing/SEO surface + web-app functional health on branch `feat/seo-aeo-page-engine` (SEO/AEO page engine + public nav redesign + uncommitted SopTemplate redesign).
**Agents (2, parallel):** frontend-engineer (web performance / rendering) · qa-engineer (functional health / validation).
**Companion artifact:** `DATABASE_HEALTH_REVIEW_002.md` (database track).

---

## 1. Executive verdict

- **Functional health: SHIP-READY.** Typecheck clean, **2086/2086 unit tests pass**, crash-point changes type-safe, no broken routes, all content cross-references resolve.
- **Web performance: AMBER with one critical defect.** The content model, JSON-LD wiring, and page-level SSG structure are correctly implemented — but a single line in the public layout (`force-dynamic`) defeats all static generation and forces every marketing page to SSR on every request. On an SEO-focused branch this is the highest-impact finding.

---

## 2. Validation results (qa-engineer)

| Command | Result |
|---|---|
| `pnpm --filter @ledgerium/web-app typecheck` | **GREEN** — `tsc --noEmit`, exit 0, zero errors |
| `pnpm --filter @ledgerium/web-app test` | **GREEN** — 109/109 files, **2086/2086 tests**, 10.7s |
| `pnpm --filter @ledgerium/web-app lint` | **BLOCKED** — ESLint never initialized (no config); `next lint` drops to interactive setup. Pre-existing debt, not from this branch. |

Relevant test subset: `navConfig.test.ts` 3✓ (dead-link guard + no-dup-ids + leaf-count) · `seo/content.test.ts` 6✓ · `dashboard-columns/registry.test.ts` 55✓. The stderr noise from `admin/operations` + `auth/signup` tests is intentional error-path mocks (both files show ✓ in the final tally).

---

## 3. Findings (ranked)

### P0 — critical

**P0-1 · `force-dynamic` defeats SSG across the entire public marketing surface.** `apps/web-app/src/app/(public)/layout.tsx:7` exports `dynamic = 'force-dynamic'`. In the App Router this SSRs the whole route (layout + page) on every request, for all `(public)/**` routes — the ~124 SEO pages across six dynamic route types (`sop-templates`, `workflow-library`, `industries`, `alternatives`, `competitors`, `compare`). `generateStaticParams()` still enumerates routes at build but produces **no cached static HTML**. Consequences for a text-dominant SEO surface where content is identical between requests:
- CDN edge-cache hit rate for HTML: **0%**
- Every marketing page request hits the Next.js origin
- TTFB is server-compute-bound, not CDN-latency-bound → materially higher LCP

**Root cause:** `PublicNav` is a `'use client'` component whose `useSession` auth-CTA swap produced React hydration mismatches (#418/#425) on statically prerendered pages; `force-dynamic` was the blunt workaround (documented in the layout comment). *(frontend)*

### P1 — significant

- **P1-1 · `PublicNav.tsx` is fully client-side on every public page** (`:1` `'use client'`). Activates `next-auth/react` (`useSession`), the analytics bundle, `ThemeToggle`, 5+ `useState`, 5+ `useEffect` (each registering `document.addEventListener` at hydration). This is the upstream cause of P0-1 and adds TBT + the next-auth client bundle to the critical path for unauthenticated marketing visitors. *(frontend)*
- **P1-2 · Post-hydration auth-CTA swap = CLS source** (`PublicNav.tsx:38-40` `mounted`/`useSession`). Masked today by `force-dynamic`, but will produce measurable nav CLS for authenticated visitors once SSG is restored. Must be fixed as part of P0-1. *(frontend)*
- **P1-3 · New `/api/health` route has no unit test.** `apps/web-app/src/app/api/health/route.ts` — happy-path 200 and 503 error-branch untested; uptime monitors depend on the contract. Add ~10 `it()` blocks mocking `db.$queryRaw` + `node:fs`. *(qa)*
- **P1-4 · Nav Playwright E2E gates not run this cycle.** `apps/web-app/e2e/public/nav.spec.ts` — 375px hamburger `aria-expanded`, body-scroll-lock, Escape→focus-return, panel crawlability, axe scan are server-dependent and vitest doesn't run them. Structural integrity is covered by `navConfig.test.ts` (passes). Run `playwright test e2e/public/nav.spec.ts` against a live server before merge (likely CI-covered). *(qa)*

### P2 — minor / informational

- **P2-1 · `WorkflowStep.system` chip is authoring-dead.** Field correctly typed (`content/types.ts:52-54`), guard safe (`SopTemplatePageView.tsx:60`), but **zero** `exampleProcedure` steps in `sop-template.ts` carry `system:` — the chip never renders in the current corpus and has no test. *(qa)*
- **P2-2 · `relatedWorkflowSlug` not type-checked.** Plain `string`, not a union. All 11 current values manually verified to resolve to real workflow pages; no dead links today, but no compile-time/runtime guard for future authors. Recommend a `seo/content.test.ts` integrity assertion. *(qa)*
- **P2-3 · Correct `'use client'` boundaries (no action):** `SeoPageView.tsx` (analytics-only, returns null), `FaqBlock.tsx` (accordion; answers stay in DOM via `hidden` for JSON-LD canonicality), `TrackedLink.tsx` (onClick island). *(frontend)*
- **P2-4 · Hardcoded hex** `text-[#e2e8f0]` vs token `text-[var(--content-secondary)]` at `SopTemplatePageView.tsx:66,174` — cosmetic. *(frontend)*
- **P2-5 · `backdrop-blur-sm` on sticky nav** — GPU compositor layer; possible mobile INP jank; monitor in field CWV. *(frontend)*
- **P2-6 · ESLint not initialized** (pre-existing). *(qa)*

---

## 4. Rendering status — are the SEO pages static?

- **Intent: YES.** All six dynamic route files export `generateStaticParams()`, are pure Server Components (no `'use client'`, no `dynamic`, no `revalidate`), read content from an in-memory registry (no render-time DB calls), and inject JSON-LD as `<script type="application/ld+json">`. Architecture is correct for SSG.
- **Reality: NO.** `(public)/layout.tsx:7` `force-dynamic` overrides it — pages are server-rendered per request, not statically served.

---

## 5. What's healthy (preserve)
- Typecheck green; 2086/2086 tests pass; crash-point `SopTemplatePageView.tsx` redesign clean (Server Component, no regressions, no raw `<img>`, JSON-LD preserved, `ExecutionStep`/`SopReportPreview` pure render fns). *(qa + frontend)*
- SEO page architecture correct by intent; content model + JSON-LD wiring sound.
- No raw `<img>` anywhere; demo page uses `next/image` correctly.
- `navConfig.ts` is pure typed data (187 lines, no bundle weight); dead-link guard passes.

---

## 6. Top recommended next actions (site track)

1. **Remove `force-dynamic`; isolate the auth-conditional piece into a client leaf** (`NavAuthCta` wrapping only sign-in / start-free CTAs). Keep the nav shell, mega-menus, logo, and links as Server Components. Resolving the hydration mismatch at the component level makes `force-dynamic` unnecessary → all ~124 SEO pages return to static HTML. *(closes P0-1 + P1-2)*
2. **Restructure `PublicNav` as Server shell + minimal client leaf** — removes next-auth + analytics + link markup from the client bundle on every public page; reduces TBT. *(P1-1)*
3. **Confirm edge caching once SSG is restored** — verify the deploy platform serves static output from CDN; if ISR, add `export const revalidate` to the public layout for correct cache-control. Final LCP lever for sub-100ms TTFB. *(P0-1 follow-through)*
4. Cleanup: add `/api/health` unit test (P1-3); run nav Playwright gates against a live server (P1-4); initialize ESLint (P2-6).

---

## 7. Evidence files
`apps/web-app/src/app/(public)/layout.tsx` · `apps/web-app/src/components/PublicNav.tsx` · `apps/web-app/src/components/nav/navConfig.ts` · `apps/web-app/src/components/nav/navConfig.test.ts` · `apps/web-app/e2e/public/nav.spec.ts` · `apps/web-app/src/components/seo/SopTemplatePageView.tsx` · `apps/web-app/src/components/seo/SeoPageView.tsx` · `apps/web-app/src/components/seo/FaqBlock.tsx` · `apps/web-app/src/components/seo/Blocks.tsx` · `apps/web-app/src/components/TrackedLink.tsx` · `apps/web-app/src/content/types.ts` · `apps/web-app/src/content/pages/sop-template.ts` · `apps/web-app/src/lib/seo/content.test.ts` · `apps/web-app/src/app/api/health/route.ts`
