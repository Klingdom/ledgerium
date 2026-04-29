# Backend Implementation Plan: User-Uploaded Workflow and SOP Templates

**Status:** Design only — no code  
**Date:** 2026-04-18  
**Upstream artifacts:** `PRD.md`, `ARCHITECTURE.md` (both in this directory)  
**Implementing agent:** Backend Engineer

---

## 1. Integration Surface

**Table recommendation: new `UserTemplate` + `UserTemplateVersion` tables (do NOT extend `WorkflowArtifact`).**

`WorkflowArtifact` is an append-only artifact store keyed by `(workflowId, artifactType)`. Extending it to carry template source, status, version history, and ownership would corrupt its single-responsibility contract. User templates are a separate first-class resource owned by users/teams, not by individual workflows.

The integration point with `WorkflowArtifact` is narrow and one-directional: a rendered output is _written_ to `WorkflowArtifact` as `artifactType = template_user_<templateId>_v<versionNum>`. The template definition itself never lives there.

**Render timing recommendation: lazy, persisted on first request.**

| Approach | Latency | Storage | Complexity |
|---|---|---|---|
| Eager (at ingestion) | +100–300 ms per template per workflow | Pre-populated, instant export | Couples ingestion to template count; breaks if template is unpublished post-ingestion |
| Lazy, in-memory only | 0 storage | Re-renders every request | No audit trail; non-determinism risk if template version changes |
| Lazy, persisted on first request (recommended) | ~100–300 ms on first export only | One artifact row per (workflow, templateId, versionNum) | Decoupled from ingestion; cached for all subsequent exports; version-pinned |

The lazy approach is consistent with the architecture decision in `ARCHITECTURE.md §5`. `renderAllTemplates` in `apps/web-app/src/lib/ingestion.ts` is unchanged; the 6 hardcoded artifacts still fan out eagerly.

---

## 2. New / Changed Tables

Prisma schema additions to `apps/web-app/prisma/schema.prisma`. No existing tables are modified.

```prisma
model UserTemplate {
  id                   String   @id @default(uuid())
  ownerUserId          String   @map("owner_user_id")
  ownerTeamId          String?  @map("owner_team_id")     // null = personal workspace
  kind                 String                              // "sop" | "process_map"
  status               String   @default("draft")          // draft | published | archived
  name                 String
  description          String?
  currentVersionId     String?  @unique @map("current_version_id")
  contextSchemaVersion String   @default("1") @map("context_schema_version")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  owner    User                  @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  team     Team?                 @relation(fields: [ownerTeamId], references: [id], onDelete: Cascade)
  versions UserTemplateVersion[] @relation("TemplateVersions")
  current  UserTemplateVersion?  @relation("CurrentVersion", fields: [currentVersionId], references: [id])

  @@index([ownerUserId, status])
  @@index([ownerTeamId, status])
  @@index([kind, status])
  @@map("user_templates")
}

model UserTemplateVersion {
  id            String   @id @default(uuid())
  templateId    String   @map("template_id")
  versionNum    Int      @map("version_num")       // monotonically increasing per template
  body          String                              // Markdown + Mustache source text
  bodyHash      String   @map("body_hash")          // SHA-256 of body, for dedup and cache keys
  sizeBytes     Int      @map("size_bytes")
  compiledOk    Boolean  @default(false) @map("compiled_ok")
  compileErrors String?  @map("compile_errors")     // JSON array of error strings
  createdBy     String   @map("created_by")         // userId
  createdAt     DateTime @default(now()) @map("created_at")

  template   UserTemplate  @relation("TemplateVersions", fields: [templateId], references: [id], onDelete: Cascade)
  currentFor UserTemplate? @relation("CurrentVersion")

  @@unique([templateId, versionNum])
  @@index([bodyHash])
  @@map("user_template_versions")
}
```

**Key design notes:**
- `currentVersionId` uses `@unique` so Prisma can traverse the self-referential relation. The pointer is reseated atomically when a new version is published.
- `ownerUserId` and `ownerTeamId` are mutually exclusive at the application layer (enforced in service, not DB-level, because SQLite lacks check constraints). A migration comment documents this.
- Soft delete only: `status = archived`. Hard deletes occur only on parent User/Team cascade.
- `WorkflowArtifact` gains no new columns. The new artifact types (`template_user_<id>_v<n>`) are written to the existing `artifact_type` column; no schema change needed there.

---

## 3. Render Engine Choice

**Recommendation: `mustache` npm package (mustache.js v4.x), pinned to exact version, imported in logic-less mode.**

Criteria evaluation:

| Criterion | mustache.js | handlebars | Custom parser | Liquid |
|---|---|---|---|---|
| Deterministic output | Yes (pure string transform) | Yes but helper system adds risk | Yes if built carefully | Conditional (filters) |
| No arbitrary code execution | Yes — logic-less by spec | No — helpers run arbitrary JS | Yes | Partial |
| Size | ~10 KB | ~80 KB | Build cost | ~40 KB |
| Error surfacing | Structured throws | Structured throws | Depends on implementation | Moderate |
| Test-friendly | Yes — pure functions | Yes | Yes | Yes |
| Ecosystem stability | Stable, 12+ years | Stable | N/A | Stable |

`mustache.js` is the correct choice because its logic-less spec is a hard constraint, not a configuration option. It cannot be accidentally extended with helpers. The `{{#each}}` and `{{#if}}` block semantics cover all required iteration and conditional inclusion. Triple-mustache `{{{...}}}` raw output is a first-class spec feature — we allow it only in Markdown contexts (downstream HTML rendering must apply `rehype-sanitize`; document in `docs/invariants.md`).

Custom limits layered on top of mustache.js at the `userTemplateRender.ts` wrapper:
- Body size cap: 64 KB
- Token count: <= 2,000 distinct tokens (parse-time check)
- Loop nesting depth: <= 4
- `{{#each}}` expansion cap: 10,000 cumulative iterations per render
- Render wall-clock budget: 250 ms (enforced via `Promise.race` + flag; aborts with structured error)
- Output size cap: 2 MB

---

## 4. API Endpoints

New routes live under `apps/web-app/src/app/api/templates/`.

**New routes:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/templates` | Create template + initial version. Body: `{ kind, name, description?, body, teamId? }`. Compile-on-write; rejects if `compiledOk = false`. Returns `{ id, currentVersionId, status, compiledOk, warnings }`. |
| `GET` | `/api/templates` | List templates visible to caller. Query: `kind`, `status`, `scope=personal\|team\|all`, `cursor`, `limit`. |
| `GET` | `/api/templates/[id]` | Get metadata + current version body. |
| `PATCH` | `/api/templates/[id]` | Update `name`/`description`/`status`, or supply `body` to create a new version. Publishing (`status=published`) enforces at-most-one-active-per-kind-per-scope rule by archiving the previous published template of the same `kind`. |
| `DELETE` | `/api/templates/[id]` | Soft delete (`status=archived`). Returns 204. |
| `POST` | `/api/templates/[id]/render-preview` | Render template against a fixture `ProcessOutput` (never a real workflow). Body: `{ fixture?: "default"\|"minimal"\|"decision_heavy", processOutput?: ProcessOutput }`. Returns `{ markdown, warnings, unresolvedPaths, renderMs }`. Rate-limited: 30/min, 500/day per user (Redis sliding window). |

**Changed routes:**

`POST /api/workflows/[id]/render` — new endpoint under `apps/web-app/src/app/api/workflows/[id]/render/route.ts`.
- Query params: `templateId` (required), `versionId` (optional; defaults to `currentVersionId`), `persist=true|false` (default `true`), `rerender=true` (force re-render even if artifact exists).
- Validates: workflow ownership, template access (owner match or team membership), `status=published`.
- Loads the workflow's `process_output` artifact, builds `TemplateContext`, calls `renderUserTemplate`, persists result to `WorkflowArtifact` with `artifactType = template_user_<templateId>_v<versionNum>`.
- Returns `text/markdown` with header `X-Template-Version-Id`.

`GET /api/workflows/[id]/export-markdown` — existing route in `apps/web-app/src/app/api/workflows/[id]/export-markdown/route.ts`.
- Change: when `artifactType` query param starts with `template_user_`, load the stored `WorkflowArtifact` row directly and return its `contentJson.markdown` field as `text/markdown`. No re-render on export.
- Backward-compatible: all existing `template_sop_*` and `template_process_map_*` paths unchanged.

`GET /api/workflows/[id]` — no route change. The frontend already queries `WorkflowArtifact` rows for a workflow; the new `template_user_*` artifact types will appear in that list naturally once persisted.

---

## 5. Validation and Safety

**Zod schema for template upload (`POST /api/templates` body):**

```typescript
const CreateTemplateSchema = z.object({
  kind: z.enum(['sop', 'process_map']),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  body: z.string()
    .min(1, 'Template body is required')
    .max(65536, 'Template body must not exceed 64 KB'),
  teamId: z.string().uuid().optional(),
});
```

**Additional validation layers applied after Zod:**
1. Body UTF-8 byte count re-checked against 64 KB hard cap (Zod `.max` counts characters, not bytes).
2. Mustache token parse pass extracts all `{{ path }}` tokens; each path is validated against the `TemplateContext v1` allow-list. Unknown paths produce a structured warning (not rejection), logged to `compileErrors`.
3. Forbidden tag check: reject templates containing `{{> partial}}`, `{{=`, URL strings in token positions, or the strings `__proto__`, `constructor`, `prototype` appearing inside any `{{ }}` block.
4. `compiledOk = true` only if: parse succeeded + no forbidden tags found. Warnings (unknown paths) do not block compilation.

**XSS posture:**
- `{{ double }}` tokens: HTML-escaped by mustache.js by default. This is the correct default for all user-data fields.
- `{{{ triple }}}` tokens: raw, unescaped. Allowed in templates because the output format is Markdown, not HTML. The invariant that downstream HTML rendering uses `rehype-sanitize` must be documented in `docs/invariants.md`.
- We do NOT disable triple-mustache globally. Templates are user-authored documents; allowing raw Markdown formatting (e.g., bold, tables) is intentional. The threat is XSS at the HTML render layer, not at the Markdown generation layer.

---

## 6. Render Error Handling

**Render failures produce a structured result, never a silent partial render.**

Four error categories:

| Category | Behavior |
|---|---|
| Parse error (malformed Mustache) | Blocked at upload/PATCH time; `compiledOk = false`; error returned to user with specific position. Template cannot be published. |
| Missing binding (template references path absent in `TemplateContext`) | Path renders to empty string. Structured warning appended to `warnings[]`. Render completes. Warning surfaced in API response and stored in the `WorkflowArtifact.contentJson.warnings` field. |
| Render timeout (> 250 ms) | Render aborts. API returns 422 with `{ error: "render_timeout", renderMs: N }`. No artifact written. User sees: "This template timed out during rendering. Try reducing loop complexity." |
| Output size exceeded (> 2 MB) | Render aborts at the truncation point. API returns 422 with `{ error: "output_too_large" }`. |
| Fallback (custom template fails at ingestion-adjacent apply) | System template is applied instead. `WorkflowArtifact` row is written with the system `artifactType`. A `WorkflowArtifact` row with `artifactType = template_user_fallback_event` is written recording `{ templateId, versionId, reason, usedSystemTemplate }`. The workflow detail API surfaces this as a notice string. |

No dead-letter queue is needed at MVP: render failures are synchronous and user-initiated. There is no background fan-out of user templates during ingestion.

---

## 7. Determinism Verification

**Test location:** `packages/process-engine/src/templates/userTemplateRender.test.ts`

**Concrete test: byte-stability assertion**

```
Given: a committed frozen ProcessOutput fixture at
       packages/process-engine/src/templates/__fixtures__/frozen_process_output.json
And:   a committed frozen template source at
       packages/process-engine/src/templates/__fixtures__/frozen_user_template_sop.md.mustache

When: renderUserTemplate(body, buildTemplateContext(fixture)) is called three times:
  run1 — direct call
  run2 — same call, same process
  run3 — after JSON.parse(JSON.stringify(fixture)) round-trip on the input

Then: SHA-256(run1.markdown) === SHA-256(run2.markdown) === SHA-256(run3.markdown)
```

This test is committed as a snapshot test (`toMatchSnapshot()`). Any output change requires an explicit snapshot update with a justification comment.

Additional CI checks (per `ARCHITECTURE.md §7`):
- No-IO check on compiled `userTemplateRender.js`: `grep` for `fetch`, `require('fs')`, `import('fs')`, `XMLHttpRequest`, `child_process`. CI fails on any match.
- `generatedAt` is threaded as an injected parameter into `TemplateContext`; it is never read from `Date.now()` inside the renderer.

---

## 8. Backfill Strategy

**Recommendation: no retroactive re-render. Only workflows recorded after a template is published receive the custom artifact automatically.**

This is consistent with PRD P0.4 (explicit non-goal) and preserves the immutability-first principle. Existing workflow artifacts are not modified.

**On-demand re-render is available** via `POST /api/workflows/[id]/render?templateId=...&rerender=true`. This is a user-initiated action, not a system background job. No batch fan-out at MVP.

Rationale: retroactive fan-out during publish would require a background job that touches every workflow owned by the user/team, which introduces ingestion-scale latency, background job complexity, and the risk of overwriting artifacts a user may have manually annotated. The lazy-plus-rerender-on-demand model achieves the same functional result with zero background infrastructure.

---

## 9. Implementation Sequencing

Each task is a single shippable PR. Ordered by dependency.

| # | Task | Effort | File(s) / Packages |
|---|---|---|---|
| 1 | `TemplateContext` projection | S | `packages/process-engine/src/templates/userTemplateContext.ts` + unit tests |
| 2 | `renderUserTemplate` function with mustache.js, safety guards, size/timeout caps | M | `packages/process-engine/src/templates/userTemplateRender.ts` + golden tests + byte-stability test |
| 3 | Prisma migration: `UserTemplate`, `UserTemplateVersion` | S | `apps/web-app/prisma/schema.prisma` + migration file |
| 4 | Add `customTemplates` to `FeatureKey` in `plans.ts`; enable at `growth` + `enterprise` | S | `apps/web-app/src/lib/plans.ts` |
| 5 | Template CRUD API (`POST`, `GET`, `PATCH`, `DELETE /api/templates`) | M | `apps/web-app/src/app/api/templates/` + Zod schemas + auth + service layer |
| 6 | `render-preview` endpoint with fixture loader + rate limiting | M | `apps/web-app/src/app/api/templates/[id]/render-preview/route.ts` |
| 7 | Workflow render endpoint (`POST /api/workflows/[id]/render`) with artifact persistence | M | `apps/web-app/src/app/api/workflows/[id]/render/route.ts` |
| 8 | Extend `export-markdown` route to resolve `template_user_*` artifact types | S | `apps/web-app/src/app/api/workflows/[id]/export-markdown/route.ts` |
| 9 | Add `rehype-sanitize` invariant to `docs/invariants.md`; add `ProcessOutput` field reference to `docs/` | S | Docs only |
| 10 | Observability: structured render log + analytics events (`template_rendered`, `template_fallback`) | S | Service layer + analytics |

Total estimated effort: 2 M tasks + 5 S tasks + 3 M tasks = approximately 3 engineer-weeks for tasks 1–8 exclusive of frontend work.

---

## 10. Risks and Dependencies

**Risk 1 — `TemplateContext` allow-list maintenance.**
The `TemplateContext v1` allow-list defined in `ARCHITECTURE.md §2` must be kept synchronized with `ProcessOutput` changes in `packages/process-engine/src/types.ts`. A breaking change to `ProcessOutput` (e.g., a field renamed) will silently produce empty-string renders for templates using that path. Mitigation: the frozen-fixture CI test in §7 will catch regressions. Additionally, a TypeScript compile-time check should assert that every allow-list path resolves against the `ProcessOutput` type.

**Risk 2 — SQLite self-referential relation (`currentVersionId`).**
The `UserTemplate.currentVersionId` points to a `UserTemplateVersion` row, which itself has a back-reference `currentFor`. Prisma supports this pattern but requires careful handling in SQLite because of deferred foreign key constraint support. The migration must use `PRAGMA defer_foreign_keys = ON` for the pointer-reseating transaction. This is a known SQLite-specific concern that does not apply in production PostgreSQL.

**Risk 3 — Render timeout in synchronous Next.js API routes.**
The 250 ms render timeout uses `Promise.race` against a timer. In Next.js App Router, API routes run in the Node.js runtime, so this works. However, if the route is deployed to the Edge runtime, `setTimeout` semantics differ. The render endpoint must be explicitly annotated `export const runtime = 'nodejs'` to prevent accidental Edge deployment.

**Risk 4 — Plan gate misconfiguration.**
`customTemplates` is a new `FeatureKey` that must be added to `apps/web-app/src/lib/plans.ts` before any API endpoint is deployed. If the key is omitted from `NO_FEATURES` and plan configs, the TypeScript type check will catch it — but only if `FeatureKey` remains a union type (not a plain `string`). Do not widen the type.

**Risk 5 — Missing upstream artifacts before build can start.**
The following are required and not yet complete:
- `API_SPEC.md` for this feature (listed as "Not started" in `PRD.md §10`). The CRUD contract described in this document and in `ARCHITECTURE.md §4` is sufficient to begin implementation but should be formalized as a standalone spec before PR review.
- Human-readable `ProcessOutput` field reference for template authors. Without this, the `TemplateContext` allow-list cannot be documented for end users, and user-facing validation error messages will be insufficiently specific.
- Confirmation from the process-engine team that `ProcessOutput` is stable with no breaking schema changes in flight (PRD dependency table, row 1).
