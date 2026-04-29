# Ops Plan: User-Uploaded Workflow & SOP Templates

**Feature:** Custom Template Upload
**Author:** DevOps Agent
**Date:** 2026-04-18
**Status:** Planning — no IaC code this pass
**Upstream refs:** ARCHITECTURE.md, PRD.md, apps/web-app/prisma/schema.prisma, apps/web-app/src/lib/plans.ts, .github/workflows/deploy.yml, .github/workflows/e2e-extension.yml

---

## 1. Storage Decision

**Decision: Postgres TEXT column inside `UserTemplateVersion.body` — no S3/MinIO for MVP.**

### Sizing math

- Conservative ceiling: 10,000 users × 3 templates/user × 3 versions/template × 20 KB/version = **1.8 GB** raw template body storage.
- Realistic at MVP launch (100–500 active users): 500 × 3 × 2 × 20 KB = **60 MB**.
- Architecture doc caps body at 64 KB and token count at 2,000. At the hard cap: 10K users × 3 templates × 5 historical versions × 64 KB = **9.6 GB** — still within managed Postgres comfortably.

### Why Postgres wins over S3/MinIO at this scale

1. The render path reads `body` from `UserTemplateVersion` for every on-demand render. An in-DB TEXT column avoids an extra network round-trip to object storage on every render call.
2. Backup is already solved: Postgres backup includes template bodies at zero additional operational cost. No S3 lifecycle policy to configure or forget.
3. Querying by `bodyHash` for dedup (architecture §3) is a simple indexed lookup — trivial in Postgres, impossible in S3 without a separate index table anyway.
4. Templates at 64 KB hard cap are not "large files" by any definition. The row-level bloat on a 10K-user platform is under 2 GB before aggressive version pruning — acceptable for managed Postgres (Railway/Render both handle this without tuning).

### What would trigger a move to S3

If average template size grows beyond 128 KB (e.g., image-embedded templates), or if total body storage exceeds 10 GB in production Postgres, migrate `body` to S3 paths at that point. This is a schema-additive change: add `bodyPath TEXT`, write new versions to S3, backfill old rows, then drop `body`. No decision to pre-empt today.

### Compiled AST cache (deferred)

Architecture §7 shows body is already compile-validated on write (`compiledOk`, `compileErrors`). Caching a pre-parsed AST in Redis is not warranted at MVP render volumes (sub-300 ms per render, lazy path). Revisit if p95 render time exceeds 500 ms in production at scale.

---

## 2. Limits and Quotas

All limits keyed to `PlanType` from `apps/web-app/src/lib/plans.ts`. Enforced at the API layer before any DB write.

### Template count per user/team

| Plan | Max templates (personal) | Max templates (team-scoped) | Max versions retained per template |
|---|---|---|---|
| free | 0 (feature blocked) | 0 | — |
| starter | 0 (feature blocked) | 0 | — |
| team | 5 | 5 shared per team | 10 |
| growth | 25 | 25 shared per team | 25 |
| enterprise | 100 | 100 shared per team | unlimited (soft limit: 50 before UI warning) |

Free and starter tiers do not access this feature. The feature flag `customTemplates` should be added to `plans.ts` as a new `FeatureKey` gating `team` and above, consistent with the existing pattern.

### Per-template size limits

| Plan | Max body size |
|---|---|
| team | 32 KB |
| growth | 64 KB |
| enterprise | 64 KB |

Architecture §6 sets the absolute hard cap at 64 KB regardless of plan. The team-tier 32 KB limit is a product constraint below the security cap.

### Rate limits — upload endpoints

POST /api/templates and PATCH /api/templates/[id] (body update):

| Plan | Uploads per minute | Uploads per hour |
|---|---|---|
| team | 5 | 30 |
| growth | 15 | 100 |
| enterprise | 30 | 200 |

### Rate limits — render endpoints

POST /api/templates/[id]/render-preview and POST /api/workflows/[id]/render:

| Plan | Renders per minute | Renders per day |
|---|---|---|
| team | 10 | 200 |
| growth | 30 | 500 |
| enterprise | 60 | unlimited (circuit-break at 2,000/day per org) |

Rate limit counters are sliding-window, stored in Redis (as specified in architecture §6). Key pattern: `ratelimit:render:<userId>:<window>`.

---

## 3. Rate Limiting and DOS Protection

### Edge enforcement

Rate limits are enforced in Next.js route handlers (not middleware) using an in-process sliding-window counter backed by Redis. Rationale: the deploy target (Hostinger VPS via Docker Compose, per `deploy.yml`) does not have an upstream WAF layer at MVP. Next.js middleware runs before auth and cannot read user plan; the route handler is the correct enforcement point where `userId` and `plan` are known.

If a dedicated reverse proxy (Nginx/Caddy) is added to the VPS stack, rate limiting for unauthenticated upload attempts can be moved to the proxy layer at that point.

### Render cost bounding

Architecture §6 defines hard renderer limits. Ops enforcement:

- Wall-clock budget: 250 ms enforced via `AbortSignal` / timer inside `renderUserTemplate`. Render that exceeds this returns HTTP 422 with `error.code = RENDER_TIMEOUT`.
- Output size cap: 2 MB per render — checked before streaming response.
- Loop iteration cap: 10,000 total `{{#each}}` expansions per render.
- Loop nesting cap: 4 levels.
- Token count cap: 2,000 tokens validated on save, not re-validated on render (saved `compiledOk = true` is the guard).

These caps are enforced in `packages/process-engine/src/templates/userTemplateRender.ts`. They are not configurable at runtime — no environment variable overrides. Changing them requires a code change and a CI pass.

### Upload endpoint hardening

- MIME allowlist: `text/plain`, `text/markdown`. No binary types. Content-type is validated server-side; client-supplied `Content-Type` header is not trusted alone — the body is also inspected for null bytes and non-UTF-8 sequences, both of which reject the upload.
- Maximum multipart body: 128 KB (covers 64 KB template + overhead). Enforced at the Fastify/Next.js body parser before route handler logic runs.
- No file-system write: template body goes directly to DB. No temp files created.

---

## 4. Deployment Sequencing

### Feature flag

The feature is gated by a new `FeatureKey` named `customTemplates` added to `apps/web-app/src/lib/plans.ts`. It is set to `false` on `free`, `starter`; `true` on `team`, `growth`, `enterprise`. The flag controls both API access (middleware check on all `/api/templates` routes) and UI visibility. This is the only gate; no separate environment variable flag is needed.

During canary rollout, the gate can be restricted further by checking an additional `isTemplatesBetaUser` boolean on the `User` row — added as a nullable column that defaults to `false` and is set manually for beta participants. This column is not required post-GA.

### DB migration plan

Two additive migrations, no changes to existing tables:

1. **Migration 1:** Add `UserTemplate` table and `UserTemplateVersion` table as specified in ARCHITECTURE.md §3. Both tables cascade-delete on `User` deletion.
2. **Migration 2 (if canary column is used):** Add `is_templates_beta BOOLEAN NOT NULL DEFAULT false` to `users` table.

Both migrations are additive. Rollback: drop the new tables/column. No existing query paths are affected.

Migration execution order: migrations run before the new image starts serving traffic. In the current `deploy.yml` pipeline, Prisma migrate is run as part of the container entrypoint (`prisma migrate deploy`) before the Next.js server starts. This is the existing pattern — no change needed.

### Rollback plan

If the render path misbehaves post-deploy:

1. Set `customTemplates: false` on all plans in `plans.ts` and redeploy. This gates the feature without a rollback of the image.
2. If a DB migration caused data corruption (unlikely given additive-only schema): redeploy the previous image SHA from GHCR (`ghcr.io/klingdom/ledgerium:<prior-sha>`) and run `prisma migrate resolve --rolled-back` on the problematic migration.
3. Rendered `WorkflowArtifact` rows with `artifactType` prefix `template_user_` can be bulk-deleted if they contain corrupt output: `DELETE FROM workflow_artifacts WHERE artifact_type LIKE 'template_user_%'`. Existing hardcoded-template artifacts are unaffected (different prefix).

### Canary strategy

Roll out to 10% of Growth-tier users in the first 48 hours post-deploy:

1. Set `is_templates_beta = true` on a random sample of Growth users (SQL UPDATE with `random() < 0.1`).
2. API route checks `is_templates_beta` in addition to `customTemplates` feature flag during canary window.
3. Monitor render failure rate and p99 latency (see §5) for 48 hours.
4. If failure rate < 1% and p99 < 400 ms: remove the beta check, open to all eligible plans.
5. If degraded: set `is_templates_beta = false` on all users (feature disabled without image rollback).

---

## 5. Observability

All metrics emitted as structured log lines and exposed via whatever APM tool is attached to the VPS (currently unspecified — substitute Datadog, Grafana Cloud, or log-aggregator as appropriate). Metric names use dot notation for compatibility with most ingest pipelines.

### Metrics and thresholds

| Metric | Description | Warning threshold | Critical threshold | Alert destination |
|---|---|---|---|---|
| `templates.render.duration_ms` (p95) | Render wall-clock p95 across all users | > 200 ms | > 400 ms | On-call / Slack ops channel |
| `templates.render.duration_ms` (p99) | Render wall-clock p99 | > 350 ms | > 500 ms | On-call |
| `templates.render.failure_rate` | Renders returning non-2xx or `compiledOk=false` / total renders, 5-min window | > 2% | > 5% | On-call |
| `templates.render.failure_rate_by_template` | Same, grouped by `templateId` | > 10% on a single template | > 25% | Ops channel (non-paging) |
| `templates.upload.failure_rate` | Upload attempts returning 4xx (size/MIME/auth) or 5xx / total attempts | > 5% | > 15% | Ops channel |
| `templates.upload.size_cap_rejections` | Uploads rejected for exceeding byte limit | > 20/hour | > 100/hour | Ops channel |
| `templates.storage.body_bytes_total` | Total bytes in `user_template_versions.body`, sampled hourly | > 2 GB | > 5 GB | Ops channel |
| `templates.storage.growth_rate_bytes_per_day` | Rolling 7-day average daily growth | > 500 MB/day | > 1 GB/day | On-call |
| `templates.render.timeout_rate` | Renders hitting the 250 ms wall-clock cap | > 0.5% | > 2% | On-call |

### Synthetic check

A scheduled job (cron: every 5 minutes) renders a pinned fixture template against a pinned `ProcessOutput` fixture and asserts the SHA-256 of the output matches the committed golden value. On mismatch: page on-call immediately (severity: critical). This is the determinism guard in production. The job runs as a GitHub Actions scheduled workflow or as a process-level health endpoint (`GET /api/health/template-render`) that the VPS monitor pings.

Metric name: `templates.synthetic.match` (1 = pass, 0 = fail).

---

## 6. Backup and Recovery

### Backup coverage

Template bodies live in Postgres alongside all other application data. The existing Postgres backup schedule covers them automatically. No separate backup mechanism is required.

Minimum backup schedule (to be confirmed against Railway/Render or VPS Postgres config):

- Continuous WAL archiving (point-in-time recovery) if supported by the hosting provider.
- Daily full snapshot retained for 30 days minimum.

### RPO and RTO

- RPO: 24 hours maximum (daily snapshot) with WAL enabled reducing this to minutes.
- RTO: 2 hours for full database restore from snapshot. Templates are not a higher-criticality data class than the rest of the application data — no differential recovery path is needed.

### Version snapshots

Every save to a template body creates a new `UserTemplateVersion` row (append-only, architecture §3). This provides application-level version history independent of DB backups. Users can revert to a prior version by repointing `currentVersionId` — no backup restore needed for accidental edits.

Version pruning: versions beyond the plan-tier retention limit (see §2) are eligible for hard-delete via a background job. The job runs at most once per day per user, deletes the oldest versions beyond the cap, and logs deletions for audit. Rendered `WorkflowArtifact` rows that reference a pruned `versionNum` retain their `contentJson` (the rendered output) even after the source version is deleted — the artifact is self-contained.

---

## 7. CI Pipeline Changes

All new jobs plug into the existing `.github/workflows/deploy.yml` pipeline, gated by the `quality-gate` job that must pass before `build-and-push`.

### New CI steps added to `quality-gate` job

1. **Handlebars/Mustache token lint**
   Runs `pnpm --filter @ledgerium/process-engine exec tsc --noEmit` (already covered by existing typecheck step) plus a dedicated script `pnpm --filter @ledgerium/process-engine lint:template-tokens` that validates all fixture templates in `packages/process-engine/src/templates/__fixtures__/` parse without errors under the logic-less Mustache interpreter. Fails if any fixture fails to parse.

2. **Determinism test suite**
   Runs the golden test, byte-stability test, and no-IO test described in ARCHITECTURE.md §7 via `pnpm --filter @ledgerium/process-engine test --run userTemplateRender`. These are standard Vitest tests; they run within the existing `pnpm test` step but are called out explicitly here because snapshot drift must be a CI failure, not a warning.

3. **Render smoke tests**
   A new test file `apps/web-app/src/app/api/templates/__tests__/render-smoke.test.ts` exercises the three fixture types (`default`, `minimal`, `decision_heavy`) against the `render-preview` route in a test-mode server with SQLite (matching the pattern of existing web-app tests using `apps/web-app/prisma/test.db`). Asserts: HTTP 200, `compiledOk: true`, `warnings.length === 0` for well-formed fixtures, and render time < 300 ms.

### Relationship to existing workflows

- `e2e-extension.yml` (iter 009): unchanged — extension E2E tests are isolated to `apps/extension-app` and have no dependency on template infrastructure.
- Web-app Playwright tests (within `deploy.yml` quality-gate): if web-app E2E tests exist that exercise the template UI, they run in the same job. The render smoke tests above are unit/integration level, not Playwright — they do not require a browser.

### Snapshot update gate

If the determinism golden test fails due to an intentional render change, the developer must run `pnpm --filter @ledgerium/process-engine test --run userTemplateRender -u` locally to update snapshots, commit the updated snapshot file, and include it in the PR. CI will not auto-update snapshots.

---

## 8. Runbook Entries

### Scenario 1: Render errors spike after deploy

**Symptoms:** `templates.render.failure_rate` exceeds 5% within 15 minutes of a new image going live.

**Response:**
1. Check deploy logs for migration errors — a failed migration leaving `user_template_versions` in a partial state will cause all renders to fail on DB lookup.
2. If migration is healthy, check `templates.render.timeout_rate` — if elevated, a code change may have introduced a slow path. Roll back the image to the previous SHA in `deploy.yml` (`ghcr.io/klingdom/ledgerium:<prior-sha>`) via `workflow_dispatch`.
3. If the failure is plan-gated (only certain tiers), set `customTemplates: false` on affected plans in `plans.ts` and redeploy without reverting other changes.
4. After stabilizing, inspect the structured render log (`{ userId, templateId, versionId, renderMs, warnings.length }`) to identify the failing template pattern before re-enabling.

### Scenario 2: A user reports their template broke silently

**Symptoms:** User exports a workflow and receives empty output or missing sections with no error message.

**Response:**
1. Look up the `WorkflowArtifact` row for `(workflowId, artifactType LIKE 'template_user_%')`. Check `contentJson.warnings` — unresolved paths are recorded there, not surfaced as errors.
2. Check the `UserTemplateVersion` row for `compiledOk`. If `false`, the template saved with compile errors; check `compileErrors` JSON.
3. If `compiledOk = true` but output is empty, reproduce by calling `POST /api/templates/[id]/render-preview` with `fixture=default` from an admin session. Compare result warnings with the user's template body.
4. The template body is in `UserTemplateVersion.body` — read it directly from DB to verify token paths against the `TemplateContext` allow-list.
5. If the issue is a path that was valid in context schema v1 but has since been renamed, check `contextSchemaVersion` on the `UserTemplate` row and the current projection in `userTemplateContext.ts`.

### Scenario 3: Storage growth exceeds tier budget

**Symptoms:** `templates.storage.body_bytes_total` critical threshold exceeded, or a specific user/org is consuming disproportionate storage.

**Response:**
1. Run: `SELECT owner_user_id, COUNT(*), SUM(size_bytes) FROM user_template_versions GROUP BY owner_user_id ORDER BY SUM(size_bytes) DESC LIMIT 20;` — identify top consumers.
2. Check if the version pruning job has run recently. If not, trigger it manually: `pnpm --filter @ledgerium/web-app exec ts-node scripts/pruneTemplateVersions.ts --dry-run` then without dry-run after inspection.
3. If a single user has versions far beyond their plan cap, check for a bug in the pruning job's cap enforcement.
4. If overall growth is structurally above projections, escalate to product: either lower version retention caps or move large bodies to S3 paths (the additive migration path described in §1).

### Scenario 4: Preview endpoint p99 exceeds 5 seconds

**Symptoms:** `templates.render.duration_ms` p99 > 5,000 ms on the `render-preview` route.

**Response:**
1. The 250 ms render wall-clock cap means a render itself cannot exceed 250 ms + overhead. A p99 of 5 s implies the request is queuing, not rendering slowly. Check Redis connectivity — if the rate-limit counter read is blocking, all requests to the endpoint queue.
2. Check Postgres query time for `SELECT body FROM user_template_versions WHERE id = ?`. Index on `bodyHash` and `(templateId, versionNum)` should make this sub-millisecond. If query time is elevated, check for lock contention on the `user_template_versions` table (unlikely given append-only writes, but possible during bulk version creation).
3. If the render itself is slow (check `renderMs` in structured logs), a template body may be hitting near-cap token count (2,000 tokens) or loop iteration count (10,000). Log the `templateId` and inspect the body.
4. If Redis is unavailable, the rate-limit check should fail open (allow the request) rather than block — verify the rate-limit code path has a timeout and fallback. If it does not, that is a bug.

### Scenario 5: Synthetic check fires (golden output mismatch)

**Symptoms:** `templates.synthetic.match = 0` alert fires — the production render of the pinned fixture no longer matches the committed SHA-256.

**Response:**
1. This is a severity-1 determinism regression. Do not dismiss as flaky.
2. Pull the actual output from the failing synthetic job and diff against the committed golden file in `packages/process-engine/src/templates/__fixtures__/`.
3. Check recent deploys for changes to `userTemplateRender.ts`, `userTemplateContext.ts`, or any dependency version bump in `packages/process-engine/package.json`.
4. If the mismatch is in a field value (not structure), check whether the `TemplateContext` projection has a non-deterministic source (e.g., `Date.now()` was introduced). Run the byte-stability test locally.
5. Do not update the golden snapshot without a documented explanation of the intentional change and a review of what rendered output changed for end users.

---

## 9. Security Posture

### Render isolation

Template rendering runs in-process within the Next.js API route handler. There is no subprocess, no VM sandbox, and no network call. This is safe because the renderer is a pure function (architecture §6, §7) with:
- No `eval` or `Function()` constructor
- No filesystem access
- No network access (`fetch`, `http`, `XMLHttpRequest` forbidden by the no-IO test in CI)
- Path resolver restricted to an allow-list object — prototype pollution vectors (`__proto__`, `constructor`, `prototype`) rejected explicitly

The security boundary is the renderer's own code correctness, not OS-level isolation. This is acceptable because the template format is logic-less Mustache — there is no general-purpose expression evaluator to escape from.

If the template format is ever extended to include computed expressions or external data sources, the renderer must move to a subprocess with resource limits (e.g., Node.js `vm.runInNewContext` with a timeout, or a worker_thread with a message-passing protocol). That is a breaking change to the security model and requires a separate security review.

### Upload endpoint hardening

- MIME allowlist: `text/plain`, `text/markdown` only. Server-side check; client-supplied Content-Type is not trusted without body inspection.
- Body parser limit: 128 KB maximum request body. Configured at the framework level, before route handler.
- Content scan: body scanned for null bytes and non-UTF-8 sequences. Rejection returns HTTP 400 with `error.code = INVALID_CONTENT`.
- No server-side file write: body goes directly to a Zod-validated string field, then to a parameterized SQL insert.

### WAF considerations

The VPS does not have a WAF at MVP (deploy target is a Docker container exposed via Nginx or direct port). Recommended additions for production hardening (not blocking for MVP, but should be in a follow-up iteration):

- Add Nginx `limit_req_zone` for the `/api/templates` upload path to rate-limit unauthenticated requests before they reach Next.js.
- Add `Content-Security-Policy` header to rendered Markdown preview pages to prevent XSS if Markdown is ever rendered to HTML in-app (the downstream `rehype-sanitize` invariant documented in ARCHITECTURE.md §6 is the primary guard; CSP is defense-in-depth).

### Secrets hygiene

Template bodies are user content — they must not be logged. The structured render log specification in ARCHITECTURE.md §6 explicitly excludes body content. Verify this in code review: the log statement in `renderUserTemplate` and in the API route must not include `body`, `template.body`, or `version.body` in any log field.

The `bodyHash` (SHA-256) is safe to log and index. It does not leak body content.

---

## 10. Cost Model

All figures are rough estimates. Infra cost delta is the incremental cost of the template feature on top of the existing deployment.

### At 1,000 active users (team/growth tier, MVP)

- Storage: 1,000 × 3 templates × 5 versions × 20 KB avg = 300 MB additional Postgres storage. Cost delta on managed Postgres: ~$0–$2/month (within existing plan headroom on Railway/Render).
- Compute: ~10 renders/user/day × 1,000 users × 250 ms/render = 2,500 render-seconds/day, or ~43 render-minutes/day. These are CPU-bound operations on the existing VPS. At current VPS sizing (assumed 2–4 vCPU), this is well under 1% additional CPU load. No cost delta.
- Redis: rate-limit counters add trivial memory overhead (< 1 MB for 1,000 users with sliding windows). No additional Redis tier needed.
- **Total delta at 1K users: < $5/month.**

### At 10,000 active users

- Storage: 10,000 × 3 × 5 × 20 KB = 3 GB additional Postgres. Cost delta: $5–$15/month depending on provider tier.
- Compute: 10 renders/user/day × 10,000 users × 250 ms = 25,000 render-seconds/day = ~417 render-minutes/day. Still CPU-bound, but now a measurable fraction of VPS capacity. At this scale, a second VPS instance or vertical scaling is likely warranted for the overall app (not specific to templates). Template-specific cost delta: $0–$20/month.
- Redis: still trivial. < 10 MB for 10,000 user rate-limit windows.
- **Total delta at 10K users: $10–$35/month.**

### At 100,000 active users

- Storage: 100,000 × 3 × 5 × 30 KB (growth users likely use larger templates) = 45 GB additional Postgres. This crosses the threshold where S3 body offload becomes economically justified. S3 cost for 45 GB: ~$1/month. Managed Postgres with 45 GB additional data: ~$50–$100/month incremental depending on provider. **Cost cliff: at ~50,000 users, migrate body to S3 paths.** S3 migration is additive (schema change described in §1).
- Compute: 10 renders/user/day × 100,000 × 250 ms = 250,000 render-seconds/day. At this scale, renders must be offloaded to a worker pool (BullMQ + Redis, already in the tech stack) rather than running in the API request handler. This is an architecture change, not an ops change — flag to engineering before 50K users.
- Bandwidth: rendered output is Markdown text, typically 5–50 KB per render. At 10 renders/user/day × 100,000 users × 25 KB avg = 25 GB/day outbound. At $0.09/GB (typical CDN/VPS egress): ~$2,250/month egress cost. This is the largest cost at scale. Mitigation: serve cached `WorkflowArtifact` output (already persisted on first render) rather than re-rendering on every download.
- **Total delta at 100K users: $500–$2,500/month. Primary driver is egress, not storage or compute.**

### Cost cliff summary

| Trigger | Action required |
|---|---|
| >50,000 users | Migrate `body` column to S3 paths (additive schema change) |
| >50,000 users | Move render calls to BullMQ worker queue |
| >100,000 users | Add CDN in front of rendered Markdown artifact downloads |

---

**End of document.**
