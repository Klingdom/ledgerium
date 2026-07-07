# Frontend Rendering, Performance & Code-Health Analysis
## Track: Web rendering / performance / frontend code health
### Part of SITE_STATE_REVIEW_002 (Mode 3-adjacent, NON-counting, read-only)

Date: 2026-07-07
Scope: `apps/web-app/src/app/(public)/*` (~124 SEO pages), `components/seo/*`, `components/nav/*` + `PublicNav.tsx`/`Footer.tsx`, `app/(app)/*`, `components/dashboard-v2/*`, `admin-operations`, `workflow-view`, `sop-view`.

No code was modified. `pnpm --filter @ledgerium/web-app typecheck` run — **clean, zero errors**.

---

## 1. SSG restoration — CONFIRMED HELD

`apps/web-app/src/app/(public)/layout.tsx` no longer exports `dynamic = 'force-dynamic'`. Commit `c9e8912` removed it; commit history confirms the sequence `0ae7424` (added force-dynamic as blunt fix) → `c9e8912` (removed once root cause fixed). The in-file comment documents the correct root-cause fix: `PublicNav.tsx` uses a `mounted` hydration gate (`useState(false)` + `useEffect(() => setMounted(true), [])`) so server HTML and first client paint both render logged-out CTAs; the authenticated swap only happens post-mount. Combined with `suppressHydrationWarning` on `<html>` in the root layout (`app/layout.tsx:69`) and a hardcoded `dark` theme class, there is no remaining hydration-mismatch source.

Verified no regression: grepped the entire `app/` tree for `force-dynamic|no-store|revalidate = 0|fetchCache` — only two legitimate hits remain (`api/health/route.ts` — an API route, correctly dynamic; `llms.txt/route.ts` — `force-static`, correct). Zero `(public)/**/page.tsx` files export any dynamic/revalidate override. All 11 `[slug]` dynamic routes (`competitors`, `alternatives`, `industries`, `departments`, `software`, `sop-templates`, `compare`, `ai-opportunities`, `workflow-library`, `use-cases/personas`, `use-cases/problems`) implement `generateStaticParams()` sourced from the static in-memory `ALL_PAGES` registry (`content/registry.ts`) — no DB round-trip, fully SSG. **SSG restoration is intact; no new regression introduced by subsequent SEO/AEO or SopTemplate work.**

## 2. SopTemplate redesign — rendering correctness: CLEAN

`SopTemplatePageView.tsx` (234 LOC, largest PageView — expected given the "execution-style redesign") is a plain server component: no `'use client'`, no hooks, no browser APIs. It composes shared `Blocks.tsx` primitives plus two new local subcomponents (`ExecutionStep`, `SopReportPreview`), both pure/presentational. The only client boundaries anywhere in `components/seo/` are `SeoPageView.tsx` (analytics-only, returns `null`, tiny) and `FaqBlock.tsx` (accordion). This is the correct pattern — the redesign does not introduce hydration risk or leak client-side bundle weight into the 124-page SSG surface.

## 3. NEW regressions found: none in `(public)/`. Two real issues found elsewhere (below).

---

## Top 5 findings (severity-ranked)

### P1 — Recharts unconditionally bundled into the primary `/dashboard` shell, not code-split
`apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx:34,1116` statically imports `TopBand` → `apps/web-app/src/components/dashboard-v2/band/RecordedTrendChart.tsx:22-30` (`'use client'`, imports `recharts`). `TopBand` renders unconditionally for any user with ≥1 workflow (`!isFirstRun` guard only). Recharts (+ d3 sub-deps) is one of the heaviest common chart libraries; shipping it in the main dashboard's initial JS chunk inflates parse/hydration cost for every session, even though the chart is client-only, below-the-fold-ish, and not needed for first paint. The codebase already has the correct pattern in 8 files under `components/demo/` using `next/dynamic`, but it is not applied here or to `admin-operations/AdminOperationsDashboard.tsx` (5× `TimeSeriesChart` imports, same recharts dependency — lower severity since `/admin/operations` is a separate route chunk with a small audience).
**Fix sketch:** `const RecordedTrendChart = dynamic(() => import('./RecordedTrendChart'), { ssr: false, loading: () => <ChartSkeleton /> })` in `TopBand.tsx`; same for `TimeSeriesChart` in `AdminOperationsDashboard.tsx` if budget allows.

### P2 — `/api/workflows` list query and `WorkflowList` render path are both unbounded (no pagination, no virtualization)
`apps/web-app/src/app/api/workflows/route.ts:385-414` — `db.workflow.findMany({ where, orderBy, include, ... })` has no `take`/`skip`. The prior DB-perf fix (comment at `:390-397`) narrowed the *selected fields* on `processDefinition` but did not bound *row count*. Client-side, `apps/web-app/src/components/dashboard-v2/WorkflowList.tsx:908-925` renders `sortedWorkflows.map(...)` → one `WorkflowRow` (1344 LOC) per workflow with no `react-window`/`react-virtual` (none found anywhere in `apps/web-app`). Both DOM node count and server payload size scale linearly with a user's total workflow count with no ceiling.
**Fix sketch:** add `take`/cursor pagination to the route (or a hard cap + "load more"), and virtualize `WorkflowList`'s `<tbody>` rendering once row counts are expected to exceed ~100-200.

### P2 — Stale debug flag `productionBrowserSourceMaps: true` left enabled in production config
`apps/web-app/next.config.js:3-6` — added at commit `1dd4772` ("debug(web): enable productionBrowserSourceMaps to resolve hydration error") explicitly as a TEMP measure with the comment "Remove after the root cause is identified." The root cause (PublicNav hydration mismatch) was subsequently fixed correctly (see §1). This flag now only adds build time and ships full source maps in the production output with no remaining diagnostic purpose, and is a minor unnecessary info-exposure surface (internal file/module structure visible via sourcemaps).
**Fix sketch:** remove the flag and the stale TEMP comment now that the underlying issue is resolved.

### P3 — `WorkflowRow` (1344 LOC, rendered per-row in a list) is not memoized
`apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx:785` exports `WorkflowRow` as a plain function (no `React.memo`). It's invoked from `WorkflowList.tsx:910-925` inside a `.map()` with several conditionally-spread prop objects (e.g. `{...(onWorkflowRename ? { onRename: onWorkflowRename } : {})}`), which construct new object references on every parent render regardless of whether the underlying values changed. Combined with no memoization at the row boundary, any parent-state change unrelated to a given row (search-box keystroke, hover state, sort toggle) risks a full re-render pass across every visible row.
**Fix sketch:** wrap the default export in `React.memo`, and stabilize the conditional-prop pattern (e.g. always pass the handler, or memoize the spread object) so memoization is actually effective.

### P3 — `TopBand`/`RecordedTrendChart` mount cost not gated behind visibility, only behind workflow-count
Related to the P1 above but distinct: even when the guard passes, `TopBand` (and its recharts tree) mounts synchronously with the rest of the shell rather than lazily once scrolled into view or after the toolbar/list have hydrated. This compounds the P1 bundle issue with an eager-mount cost on every dashboard load.
**Fix sketch:** covered by the same `next/dynamic` fix in P1; optionally combine with `loading="lazy"`-style intersection-observer gating if profiling shows it matters after code-splitting.

---

## Summary of what did NOT show problems
- Zero `force-dynamic`/`no-store`/unbounded-revalidate patterns introduced in `(public)/**`.
- All SEO dynamic routes have `generateStaticParams`; content source is a static in-memory array, not a DB call — build-time computable, no runtime DB dependency for the 124-page surface.
- `sitemap.ts` / `robots.ts` are plain sync functions — no dynamic export risk.
- SopTemplate redesign introduces zero client-side hooks/state; fully compatible with SSG.
- Icon imports (`lucide-react`) are named/tree-shakeable throughout; no barrel-import bloat found.
- `pnpm --filter @ledgerium/web-app typecheck` — clean.
