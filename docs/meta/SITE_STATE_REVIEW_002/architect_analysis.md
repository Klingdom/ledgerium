# SITE_STATE_REVIEW_002 — Architect Track Analysis

**Mode:** Mode 3-adjacent read-only current-state review (NON-counting; zero code modified).
**Date:** 2026-07-07
**Scope:** `apps/web-app/src/app/api/**`, SEO content model (`src/content/**` + `src/components/seo/**` + `src/lib/seo/**`), `prisma/schema.prisma`, determinism/traceability invariants on metrics/SOP surfaces.
**Method:** static read of route handlers, content registry, schema, and pure-module adapters. No tests run, no code changed.

---

## 1. API envelope + input-validation consistency

### 1.1 `{ data, error, meta }` envelope — PARTIAL, age-correlated

The CLAUDE.md coding standard mandates `Response format: { data, error, meta }`. Actual adoption is **partial and correlated with route age**:

- Full-envelope adoption: only the newest routes. `api/admin/operations/route.ts` (iter 071) is the clean reference — `{ data, error: { code, message }, meta: { generatedAt, queryDurationMs } }`, including a typed `AdminOperationsApiResponse` and a `notFoundResponse()` helper. A handful of `[id]` intelligence routes also emit `{ data: ... }`.
- Measured surface: `NextResponse.json({ data ...})` appears **5 times across 4 files**. Domain-keyed success payloads dominate — `{ workflows, stats }` (`workflows/route.ts`), `{ portfolios }` / `{ portfolio }` (`portfolios/route.ts`), etc.
- Error side is a **de-facto convention but not the full envelope**: `.json({ error: '...' }, { status })` appears **204 times across 54 files**. Errors are a bare `{ error: string }` (sometimes `+ details`/`+ requiredPlan`), never `{ error: { code, message } }`, and there is **no `meta` anywhere on legacy routes**.

**Assessment:** Errors are reasonably uniform (a client can rely on `body.error` being a message). Success shape and `meta` are not standardized. This is a **traceability/operability gap, not a correctness bug** — it blocks a single shared error/telemetry envelope (request id, timing, error taxonomy) and makes client-side error handling per-route bespoke. No shared response helper module exists (`src/lib` has no `apiResponse`/`ok`/`err` primitive); each route hand-rolls `NextResponse.json`.

### 1.2 Input validation — Zod on mutation routes, thin on GET/query surfaces

- Zod is imported in **11 of ~63 route files** — concentrated on POST/PATCH bodies (`portfolios`, `tags`, `auth/signup`, `dashboard/preferences`, `workflows/[id]`, `baseline`, `ask`, `analytics/compare`). Those are solid: `safeParse` + `400 { error, details: flatten() }`, trimmed/bounded strings, enum + uuid guards, per-user limits.
- **Query-param surfaces are the gap.** `workflows/route.ts` parses filters ad hoc: `minConfidence = params.get('minConfidence') ? parseFloat(...) : null` — **no `isNaN` guard, no clamp** — so `?minConfidence=abc` yields `where.confidence = { gte: NaN }` flowing straight into Prisma. Same for `minSteps`/`maxSteps` (`parseInt`). `status` is taken directly into `where.status` with **no allow-list validation** (`?status=deleted` is honoured). Risk is bounded (own-tenant data), but it is unvalidated input reaching the query layer — a robustness defect and an inconsistency with the mutation-side rigour.

---

## 2. SEO content-model design — STRENGTH (data-driven, single source of truth)

The programmatic page engine is **exemplary and should be preserved as a reference pattern**:

- **Single source of truth:** `src/content/registry.ts` composes 11 per-type arrays into `ALL_PAGES`. Confirmed **exactly 124 authored pages** (grep of `slug:` across `content/pages/*`). Every dynamic route (`industries/[slug]`, `software/[slug]`, `compare/[slug]`, …) resolves via `getBySlug(type, slug)` + `generateStaticParams()` from `getPagesByType(type).filter(published)`. No hardcoded/duplicated page bodies — the `[slug]/page.tsx` files are ~30-line thin shells delegating to a typed `*PageView` component.
- **No god-object:** `content/types.ts` uses a discriminated union on `type` (`SeoPage = WorkflowPage | SoftwarePage | ...`), each interface carrying only its own fields. Relationships live only in `tags` + `related` (no parallel graph).
- **Derived, not authored:** `canonical` and `breadcrumbs` are derived in `lib/seo` from `type + slug` — removes a whole class of self-reference errors by construction.
- **Collision safety:** `RESERVED_SLUGS` + `isReservedSlug()` carve out hand-built leaf pages so the engine cannot shadow them; `ROUTE_PREFIX` documents the `/workflow-library` vs `/workflows` split that avoids Next.js parallel-dynamic-route conflicts.
- **Deterministic derivation:** `generateSeoSitemapEntries()` and JSON-LD emission are pure functions of the registry; `latestUpdatedFor()` sorts ISO-8601 strings (lexicographically safe). Same inputs → same sitemap/metadata output.

**Minor scale note (P3):** the registry is a flat in-memory array; `getBySlug`/`getPagesByType` are O(n) linear scans and `getPublishedPages`/sitemap filter the whole array per call. Fine at 124 pages and build-time static generation; would warrant a `Map<type, Map<slug,page>>` index only at ~thousands of pages.

---

## 3. Data-model health after index additions

### 3.1 Indexes — correct and targeted
Composite indexes are present and sensible: `Workflow @@index([userId, status])` (the hot dashboard filter), `TeamMember @@index([teamId, status])` (roster + effective-plan derivation), plus single-column indexes on all FKs. Retention/graph paths indexed (`retentionUntilMs`, `[workflowRunId, stepIndex]`, `[processGraphId]`). No missing-index on the primary tenant-scoped read paths.

### 3.2 Residual query risks
- **`portfolios/route.ts` GET — unbounded relation load (P2).** Uses `include: { workflows: { select: { workflowId: true } } }` then computes `workflowCount: p.workflows.length` in JS. This pulls **every** portfolio↔workflow join row for the user into the Node heap purely to take a `.length`. Should be Prisma `_count: { select: { workflows: true } }`. Fan-out grows with library size — the same class of heap-pressure the recent `workflows` P0-3 fix addressed, still open here.
- **Sort-index coverage gap (P3, scale-only).** `workflows` GET filters on `[userId, status]` (indexed) but `orderBy` spans 7 fields (`title`, `stepCount`, `lastViewedAt`, `viewCount`, `confidence`, `durationMs`, `createdAt`), none covered by a composite `[userId, status, <sortField>]`. SQLite does a filtered scan + sort. Acceptable at single-tenant Phase-1 volume; note for scale.
- **`GroupRelationship` polymorphic edges — integrity/traceability risk (P3).** `sourceId`/`targetId` are polymorphic with **no FK constraint** ("resolved at the application layer"). Deletes of referenced families/groups/workflows leave dangling edges silently; contradicts the traceability invariant. Needs an app-layer GC/validation guarantee or documented tolerance.
- **`workflows` GET — no LIMIT/pagination.** The handler loads the full active set, enriches every row, computes portfolio stats client-side of DB. Deliberate (stats need the full set) and well-optimized (insights pre-indexed into a `Map` for O(1) lookup — no N+1), but it is an unbounded row count per request; a power user with thousands of workflows loads all of them each dashboard hit. Flag for a future windowed-stats split.

---

## 4. Determinism / traceability invariant adherence — STRONG on metrics surface

The metrics path shows disciplined invariant adherence:

- **Single upstream clock boundary.** `workflows/route.ts` reads `Date.now()` exactly once per request (`referenceNowMs`) and injects it into every time-dependent pure function (`computeIsStale`, `computeHealthStatus`, `computePortfolioHealthScorePrior`, `computeActivityByWeek`, week/month cutoffs). No wall-clock reads inside the per-workflow `map()`. (MDR-P03/FOLLOWUP-037 lineage.)
- **TZ-invariance.** Month boundary via `Date.UTC(...)` (MDR-P04) — count identical across server timezones.
- **Single source of truth.** MDR-P05: v1 shadow score functions deleted; `variationScore`/`aiOpportunityScore`/`opportunityTag` and their aggregate counts all sourced from one `computeWorkflowMetrics` call, eliminating list-vs-stats threshold divergence.
- **I/O-free engine boundary.** `metrics-input-adapter.ts` keeps Prisma types out of the metrics module; `parseIntelligenceJson` is a pure, Zod-validated, never-throws adapter (all failure paths → `null`). Clean determinism contract.
- **Health probe** intentionally times a READ (`SELECT 1`), not a write, and observability failures never flip status — good operability design.

**Traceability caveat:** determinism rigour is concentrated in the request handler. Because there is no shared response envelope/`meta` (see §1.1), request-level trace fields (request id, `queryDurationMs`, engine version) are emitted only by the newest routes — the metrics `workflows` route returns none. SOP-surface determinism was out of direct web-app scope this pass (recent `process-engine` sopBuilder/specificity work sits in packages/, not reviewed here).

---

## 5. Top 5 architecture findings (ranked)

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| F1 | **P2** | **Query-param input validation gap.** GET filter params parsed with `parseFloat`/`parseInt` and no NaN-guard/clamp/enum allow-list; `NaN` and arbitrary `status` reach Prisma `where`. | `workflows/route.ts:325-328` (`minConfidence`/`minSteps`), `:317` (`status`), `:356-368`. Zod present on only 11/63 routes; all mutation-side, none on this query surface. |
| F2 | **P2** | **`portfolios` GET unbounded relation load.** Fetches all workflow-join rows to compute counts in JS instead of Prisma `_count`; heap fan-out with library size. | `portfolios/route.ts:66-85` (`include: { workflows: { select } }` → `.length`). Same class as the resolved `workflows` P0-3 heap fix. |
| F3 | **P2** | **API envelope inconsistency.** `{data,error,meta}` only on newest routes; legacy routes use domain-keyed success + bare `{error:string}`, no `meta`, no shared helper. Blocks unified error taxonomy + request-level telemetry. | 5 `{data` occurrences / 4 files vs 204 `{error}` / 54 files; `admin/operations` (iter 071) is the lone full-envelope reference; no `lib` response primitive. |
| F4 | **P3** | **`GroupRelationship` FK-less polymorphic edges.** `sourceId`/`targetId` unconstrained; dangling edges possible on referenced-entity delete — contradicts traceability invariant. | `schema.prisma:369-394` ("No FK constraint — resolved at the application layer"). |
| F5 | **P3** | **Scale-only ceilings (not urgent).** Registry O(n) linear lookups per page (124 today); `workflows` sort not index-covered across 7 sort fields; `workflows` GET has no pagination LIMIT. | `content/registry.ts:93-104`; `workflows/route.ts:373-414`. All acceptable at Phase-1 single-tenant SQLite volume. |

**No P0/P1 found in scope.** The metrics-surface determinism/traceability discipline and the SEO content-model design are both category strengths and should be treated as reference patterns rather than remediation targets.

### Recommended sequencing (if promoted)
1. F1 (input-validation) — smallest surface, closest to a correctness defect; add a shared `parseQueryNumber(clamp)` + `status` allow-list.
2. F2 (`_count` swap) — one-line-class fix, measurable heap win, mirrors the accepted P0-3 pattern.
3. F3 (envelope) — introduce a `lib/api-response.ts` `{ok,err}` helper + adopt incrementally on write; do NOT big-bang-rewrite 54 files.
4. F4/F5 — document as accepted scale/integrity debt; revisit at multi-tenant or ~1k-page horizon.
