# Ledgerium AI — Performance Review
**Date:** 2026-06-14
**Reviewer:** devops-engineer (read-only analysis)
**Build reference:** bC-build.log (Next.js 14.2.35, 4 consecutive identical builds confirm reproducibility)

---

## 1. Build / Bundle Summary

### Route weight table (First Load JS = gzipped, from bC-build.log)

| Route | Route-specific | First Load JS (total gzip) | Render |
|---|---|---|---|
| `/workflows/[id]` | 118 kB | **278 kB** | Dynamic (SSR on demand) |
| `/dashboard` | 59.7 kB | **313 kB** | Static (prerendered) |
| `/admin/operations` | 13.5 kB | **201 kB** | Dynamic |
| `/pricing` | 6.75 kB | 165 kB | Dynamic |
| `/analytics/process/[id]` | 11.3 kB | 165 kB | Dynamic |
| `/share/[token]` | 9.79 kB | 164 kB | Dynamic |
| `/login` | 3.22 kB | 161 kB | Dynamic |
| `/` (home) | 1.57 kB | 161 kB | Dynamic |
| Static marketing pages | ~258 B | ~96.7 kB | Dynamic |

**Shared JS injected on every page:** 87.7 kB gzipped
- `chunks/3757b3f8-*.js` — 53.7 kB (framework + next-auth + posthog client)
- `chunks/5561-*.js` — 31.9 kB
- other shared chunks — 2.07 kB

**Middleware edge bundle:** 25 kB gzipped (749 kB uncompressed; next-auth v5 beta pulled into edge runtime)

### Uncompressed client-side chunk sizes (from `.next/static/chunks/`)

| Chunk | Uncompressed size |
|---|---|
| `(app)/dashboard/page.js` | **8.68 MB** |
| `(app)/workflows/[id]/page.js` | **7.46 MB** |
| `main-app.js` (shared) | 6.17 MB |
| `app/layout.js` | 829 kB |
| `(app)/layout.js` | 677 kB |
| `(public)/layout.js` | 626 kB |
| `(public)/login/page.js` | 1.10 MB |

Note: uncompressed sizes include source maps (see issue below). Gzipped First Load JS numbers from the build output are the wire sizes users receive.

### Server-side bundle sizes (from `.next/server/`)

| Route handler | Uncompressed |
|---|---|
| `workflows/[id]/page.js` | 4.28 MB |
| `dashboard/page.js` | 2.50 MB |
| `api/sample-variants/route.js` | 2.00 MB |
| `api/workflows/[id]/route.js` | 1.09 MB |
| `api/workflows/[id]/analyze/route.js` | 1.01 MB |

---

## 2. Top Performance Opportunities

### P1 — Dynamic-import React Flow on `/workflows/[id]` (estimated savings: ~60-80 kB gzip off route chunk)

`WorkflowPageShell` statically imports `WorkflowCanvas`, `WorkflowSwimlaneCanvas`, `WorkflowVariantsMap`, and `WorkflowSystemsMap` at the top of the module, and all four pull `@xyflow/react` into the page bundle unconditionally. React Flow is only needed when the user is on the Workflow tab and has clicked into a canvas mode. The SOP tab and Report tab do not need it.

The workflow `page.tsx` already conditionally renders tabs (`activeTab === 'workflow' && ...`), so the runtime JavaScript is not executed until the tab is active — but the bundle is still downloaded on initial page load because the import is static.

Changing to `next/dynamic(() => import('./WorkflowPageShell'))` with `{ ssr: false }` would defer the entire React Flow dependency tree until the user requests the Workflow tab. Given that `@xyflow/react` is the dominant contributor to the 118 kB route-specific portion, this is the highest-yield single change.

### P2 — Disable `productionBrowserSourceMaps` (eliminates ~3 MB of source maps served to browsers)

`next.config.js` line 6 sets `productionBrowserSourceMaps: true`. This was added for hydration debugging (per the comment: "Remove after the root cause is identified"). The setting causes Next.js to generate and serve `.js.map` files to every browser in production. Source maps are large (the main-app chunk alone is ~6 MB uncompressed before maps), they add HTTP round-trips for browser DevTools, and they expose your internal source tree paths to any user who opens DevTools on the production site.

The root hydration issue (`#418/#425`) should be resolved via staging/dev tools. This flag should not be on in production. Disabling it requires one line change and a rebuild. No code change is needed.

### P3 — Dynamic-import Recharts on `/dashboard` (estimated savings: ~30-40 kB gzip off shared chunk)

`DashboardV2Shell.tsx` statically imports `TopBand`, which statically imports `RecordedTrendChart`, which imports six named exports from `recharts`. This means the full Recharts library is bundled into the dashboard page's client chunk even though the trend chart is only visible in a small top-band component that renders below the fold.

A `next/dynamic(() => import('./band/RecordedTrendChart'), { ssr: false })` call in `TopBand.tsx` would defer Recharts until the component is actually needed. Recharts is also imported by `TimeSeriesChart` in the admin operations page. In that route it is already isolated — the admin route's 13.5 kB route-specific chunk confirms Recharts is not leaking globally. The risk is on `/dashboard` where it contributes to the 313 kB First Load JS total.

### P4 — Remove or externalize `elkjs` from the dependency manifest (dead weight)

`package.json` declares `"elkjs": "^0.11.1"` as a production dependency. A full codebase search (`grep -rn "elkjs"`) finds it referenced only in `package.json` — no import anywhere in `apps/web-app/src/`. The package is not used. It is not appearing in the client chunk output (confirmed: `grep` finds no elkjs references in `.next/static/chunks/`), which means Next.js tree-shook it from client bundles. However it still occupies space in `node_modules`, bloats the Docker image, and adds attack surface. Moving it to `devDependencies` or removing it entirely reduces image size.

A future concern: if a developer introduces an elkjs import (e.g., for React Flow layout), it would silently land in the bundle at ~300 kB+ uncompressed. That risk is better managed by keeping elkjs declared but behind a `webpackExternals` entry or a dynamic import guard.

### P5 — Add `sharp` for image optimization (~6.6 MB of unoptimized PNG images in `/public`)

`next/image` falls back to the squoosh WebAssembly optimizer when the `sharp` native module is absent. The build logs (and all four build log files) consistently show `[admin/alerts/check] CRON_SECRET env var is not set` but no sharp warning. However, `sharp` is absent from `package.json` (both `dependencies` and `devDependencies`), confirming Next.js is using the WASM fallback.

The public directory contains **55 image files totaling approximately 6.6 MB**, all PNG. The largest single file is `img/ledgerium_recorder_logo.png` at **910 kB** — a logo image served on marketing pages. Multiple docs screenshots are in the 120-260 kB range. With `sharp` installed, Next.js would:
- Serve WebP or AVIF instead of PNG on browsers that support them
- Apply responsive `srcset` sizing
- Lazy-load offscreen images with native dimensions

Install: `pnpm --filter @ledgerium/web-app add sharp` and rebuild the Docker image. No code changes needed.

Additionally, the `/docs` page (`src/app/(public)/docs/page.tsx`, 2151 lines) passes `unoptimized` on 8 `<Image>` components, bypassing Next.js image optimization entirely. These should use proper `width`/`height` props and rely on the `sharp`-powered optimizer instead of `unoptimized`.

### P6 — Split or server-component-ify the 2369-line `dashboard/page.tsx` client component

The entire `/dashboard` page is marked `'use client'` and is a single 2369-line module. This causes the full component tree — including `ProcessGroupsExplorer` (1435 lines), `PortfolioSidebar`, `OnboardingChecklist`, `CreatePortfolioDialog`, `DashboardV2Shell` (788 lines), `WorkflowList` (775 lines), and `WorkflowRow` (1177 lines) — to be included in the page's client bundle with no opportunity for tree-shaking by tab or section.

The dashboard page could be refactored as a Server Component shell that passes pre-fetched data to targeted Client Components. The `DashboardV2Shell` already encapsulates the interactive workflow list; only it needs to be a client component. The portfolio sidebar, onboarding checklist, and extension status toast are secondary surfaces that could be independently dynamically imported. This is a significant refactor but would meaningfully reduce First Load JS below the current 313 kB.

As an incremental step, `WorkflowRow` should be wrapped in `React.memo()`. It is not currently memoized (confirmed: `grep` finds no `memo` call in `WorkflowRow.tsx`). On a dashboard with 50 workflows, every state update to `DashboardV2Shell` (filter state changes, sort changes, time-range changes) re-renders all 50 `WorkflowRow` instances. Memoization with stable `rowData` and `visibleColumns` props would prevent this.

### P7 — Reduce the `WorkflowReportPage` render cost (3093-line monolithic client component)

`WorkflowReportPage.tsx` is 3093 lines and is a `'use client'` component imported statically by `workflows/[id]/page.tsx`. It mounts synchronously even on the Workflow tab (which the user sees first). The Report tab is only displayed when `activeTab === 'report'`, but because all imports are static at the module level, the entire report component including its `useScrollSpy`, `useCountUp`, `deriveDistribution`, `rankBottleneckContributions`, `deriveDivergence`, and `buildReportVerdict` calculation trees are bundled and available from first paint.

Converting the Report tab content to a lazy-loaded boundary (`next/dynamic(() => import('./WorkflowReportPage'), { ssr: false, loading: () => <Skeleton /> })`) would defer this cost to the first time the Report tab is clicked. Given that most users start on the Workflow tab (the process map), this is pure first-paint savings.

---

## 3. Deploy / Runtime Reliability Notes

### Pipeline soundness

The deploy pipeline (`deploy.yml`) follows a clean three-job sequence: `quality-gate` (typecheck + test) → `build-and-push` (Docker image to GHCR) → `deploy` (Hostinger VPS pull). The `GITHUB_TOKEN` scoped packages write is correct. `NEXT_PUBLIC_*` variables are correctly passed as Docker `ARG`s at build time so Next.js inlines them (RCA-5 fix comment confirmed in Dockerfile).

### `pull_policy: always` — correct but slow on cold VPS pulls

`compose.hostinger.yaml` correctly sets `pull_policy: always` on the `web` service. The comment explains the rationale well. The operational implication is that every deploy incurs a full Docker image pull to the VPS before `docker compose up -d` can start. The image includes the full node_modules tree, all workspace packages, and the Next.js build output. Until `output: 'standalone'` is enabled in `next.config.js` (which would produce a self-contained `.next/standalone` folder with only required dependencies), the image is heavier than necessary. Deploy time is a function of image size and VPS bandwidth.

### No `output: 'standalone'` in `next.config.js`

The Dockerfile copies all `node_modules` into the runner stage (`COPY --from=builder /app/node_modules ./node_modules` and `COPY --from=builder /app/apps/web-app/node_modules ./apps/web-app/node_modules`). This means the Docker image includes every devDependency installed during the `pnpm install --frozen-lockfile` step (including Playwright, testing libraries, TypeScript compiler, etc.) that made it into `node_modules` even though devDependencies were installed in the deps stage.

Enabling `output: 'standalone'` in `next.config.js` would cause Next.js to trace exactly which server files and node_modules are required at runtime and emit a minimal `standalone` folder. This typically reduces image size by 60-70% for monorepo setups.

### Database single-point-of-failure

The database is SQLite at `file:/app/data/ledgerium.db` on a volume attached to a single container on a single VPS. This is appropriate for early stage but is a single point of failure — VPS downtime = full application downtime. The `docker-start.sh` backup logic (best-effort `cp` before `prisma db push`) is a meaningful safety net for schema migrations, as is the `HEALTHCHECK` at `GET /api/health`.

### `CRON_SECRET` not set at build time

All four builds log `[admin/alerts/check] CRON_SECRET env var is not set` during static page generation. This is non-fatal (the route refuses to execute without the secret, by design), but the noise in build logs suggests `CRON_SECRET` should be added to the deploy workflow's `environment-variables` block in `deploy.yml` to fully activate the alerting endpoint.

### Umami sidecar on same VPS

The Hostinger compose file runs Umami + its Postgres (`umami-db`) as sidecars on the same VPS as the main app. Under load, Umami's Postgres can contend for memory with the Next.js process. The Traefik label block is commented out with a note to uncomment depending on which proxy Hostinger provisions — this should be explicitly resolved so the analytics subdomain has a defined routing path.

### `productionBrowserSourceMaps: true` in production (security concern)

Beyond the performance impact described above, this setting exposes the full file paths, variable names, and internal structure of the production codebase to any user who opens browser DevTools. This is a security-adjacent concern that should be addressed before broader public launch.

---

## 4. What Cannot Be Measured Here

The following performance dimensions require live traffic data or a running production environment:

- **Core Web Vitals (LCP, CLS, FID/INP):** These require real browser measurements via Chrome UX Report, lab Lighthouse runs against the production URL, or RUM via the self-hosted Umami instance. The 313 kB First Load JS on `/dashboard` and 278 kB on `/workflows/[id]` are risk factors for LCP exceeding the 2.5 s threshold on 4G connections, but this cannot be confirmed without a live Lighthouse run.
- **Time to First Byte (TTFB):** Depends on VPS location relative to users, database query time, and Docker container warm-up state. The SQLite-on-local-volume setup eliminates network RTT to the DB but may be CPU-bound under concurrent requests.
- **Cache hit rates:** Next.js ISR/SSG cache behavior on the statically prerendered routes (`/dashboard`, `/account`, `/analytics`, `/teams`, etc.) depends on the reverse proxy in front of the VPS. If the proxy does not cache or does not respect `Cache-Control` headers, users will hit the Node.js process on every request for what could be served from a CDN edge.
- **Real-user bundle parse time:** The ~8.7 MB uncompressed dashboard chunk and ~7.5 MB workflow chunk have non-trivial JS parse/execution time on lower-end devices. Mobile Chrome on a mid-range Android phone typically parses ~1 MB/s of JavaScript. Without device-distribution data from Umami/PostHog, the practical impact is unknown.
- **Recharts hydration mismatch risk:** Recharts `RecordedTrendChart` uses `useId()` for gradient IDs (correctly added per iter-073 fix). But if the Umami self-hosted instance is not yet collecting, we have no visibility into whether hydration errors surface in production.

**Recommended additions to enable live measurement:**
1. Add `@next/bundle-analyzer` (`ANALYZE=true pnpm build`) to CI to emit a visual treemap — this would immediately quantify which packages drive the 59.7 kB dashboard route chunk.
2. Run `npx lighthouse https://ledgerium.ai/dashboard` against production (authenticated session via `--extra-headers`).
3. If PostHog or Umami is collecting sessions, filter on `dashboard_bounced` event (shipped at iter 038) for bounce rate and elapsed-ms as a proxy for perceived performance.

---

## 5. Overall Grade and Top Priorities

### Grade: C+

The application builds cleanly and consistently (four reproducible builds, zero compilation errors). The deploy pipeline is structurally sound. Route splitting is working — marketing pages are in the 96-161 kB range, which is acceptable. The dashboard (313 kB) and workflow detail page (278 kB) are above the 200 kB budget that keeps mobile performance healthy, driven by React Flow (xyflow), Recharts, posthog-js, and monolithic client components all bundled eagerly.

Two issues elevate to security/reliability concerns rather than pure performance: `productionBrowserSourceMaps: true` in production, and `elkjs` as an unused production dependency.

### Top 5 priorities, in order

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 1 | Disable `productionBrowserSourceMaps` in `next.config.js` | 1 line | Eliminates source map exposure to users; reduces payload; zero functional risk |
| 2 | Dynamic-import `WorkflowPageShell` (React Flow) on `/workflows/[id]` | ~2 hours | Defers @xyflow/react until Workflow tab is clicked; reduces initial JS download for SOP and Report tab users |
| 3 | Install `sharp` as a production dependency | 10 minutes | Enables WebP/AVIF output, responsive sizing, and proper optimization for the 6.6 MB PNG image library |
| 4 | Dynamic-import `WorkflowReportPage` on `/workflows/[id]` | ~1 hour | Defers 3093-line report component until Report tab is opened; first-paint cost for workflow tab users drops |
| 5 | Add `React.memo` to `WorkflowRow` and enable `output: 'standalone'` in Next config | ~2 hours | Prevents re-render of all rows on filter/sort changes; standalone output cuts Docker image size by ~60% |

Removing the `elkjs` unused dependency (`pnpm --filter @ledgerium/web-app remove elkjs`) is a housekeeping task with zero risk and should be done before any future developer accidentally adds an import.
