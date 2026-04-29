# User-Uploaded Workflow & SOP Templates — Architecture

**Status:** Draft v1
**Owner:** System Architect
**Scope:** MVP for user-authored templates that render `ProcessOutput` into Markdown-ready artifacts alongside the existing 6 hardcoded variants.
**Upstream references:**
- `packages/process-engine/src/templates/` (existing renderers)
- `packages/process-engine/src/types.ts` (`ProcessOutput`, `SOP`, `ProcessMap`)
- `apps/web-app/src/lib/ingestion.ts` (`renderAllTemplates`)
- `apps/web-app/src/app/api/workflows/[id]/export-markdown/route.ts`
- `apps/web-app/prisma/schema.prisma` (`WorkflowArtifact`)

---

## 1. Template format decision

**Decision: Markdown body + Mustache-style logic-less tokens (`{{ path }}`, `{{#each}}`, `{{#if}}`).** Rendered via an in-process, sandboxed implementation (custom minimal interpreter OR vetted dependency pinned to logic-less mode, e.g. `mustache.js`). No Handlebars helpers, no partials from URLs, no file I/O.

| Criterion | Markdown+Mustache | JSON schema bindings | Custom DSL | Liquid/Jinja |
|---|---|---|---|---|
| Determinism | High (pure string interp) | High | High if constrained | Medium (filters, tags) |
| Security | High (no eval, no I/O) | Highest (no text eval) | Depends | Low without heavy sandboxing |
| Authoring ergonomics | High (users know Markdown) | Low (JSON auth is painful) | Low | Medium |
| Rendering complexity | Low | Medium (schema + merge) | High | High |
| Portability of output | Direct Markdown | Needs downstream renderer | Bespoke | Needs engine |

**Justification:** Ledgerium already serves Markdown as the terminal artifact. Logic-less Mustache preserves determinism (no arbitrary expressions), is XSS-safe by default when HTML-escape is enforced, and matches the way users already think about SOPs (they paste Markdown). A structured JSON form is available as an internal representation for validation (see §7), but the authored surface is Markdown-with-tokens. We explicitly reject Handlebars helpers, Liquid filters, and any feature that admits computed values — determinism forbids them.

---

## 2. Variable binding model

User templates bind against a **frozen, versioned projection** of `ProcessOutput` named `TemplateContext v1`. The projection is built once per render by a pure function `buildTemplateContext(output: ProcessOutput): TemplateContext` in `packages/process-engine/src/templates/userTemplateContext.ts`. It exposes only derived, stable fields — never raw events, never PII-bearing strings that bypassed the policy engine.

### Bindable (allow-list)

Top-level namespaces (read-only):

- `workflow.title`, `workflow.description`, `workflow.generatedAt`, `workflow.durationLabel`, `workflow.stepCount`, `workflow.phaseCount`, `workflow.engineVersion`, `workflow.completionStatus`
- `sop.title`, `sop.purpose`, `sop.scope`, `sop.trigger`, `sop.estimatedTime`
- `sop.inputs[]`, `sop.outputs[]`, `sop.prerequisites[]`, `sop.systems[]`, `sop.roles[]`, `sop.completionCriteria[]`, `sop.notes[]`
- `sop.steps[]` → `{ ordinal, title, action, detail, system, expectedOutcome, confidence, confidenceLabel, durationLabel, isDecisionPoint, decisionLabel }`
- `sop.frictionSummary[]` → `{ type, label, severity, stepOrdinals }`
- `sop.commonIssues[]`, `sop.quality` → `{ averageConfidence, lowConfidenceStepCount, badge }`
- `processMap.phases[]` → `{ id, name, system, stepCount, stepOrdinals }`
- `processMap.nodes[]` → `{ ordinal, title, system, durationLabel, actor, isDecisionPoint }`
- `processDefinition.name`, `processDefinition.description`, `processDefinition.systems[]`

### Not bindable (deny-list, enforced by projection)

- `normalizedEvents`, `derivedSteps`, `source_event_ids`, any `event_id`
- Raw DOM selectors, URLs beyond `routeTemplate`, screenshot blobs
- User PII, `email`, `userId`, auth tokens
- Unversioned engine internals (`processRun.schemaVersion` is exposed; nothing else from internal enrichment state)

### Token syntax (normative)

```
{{ path.to.value }}                     — HTML-escaped by default
{{{ path.to.value }}}                   — raw (allowed only in Markdown output; see §6)
{{#each sop.steps}} {{ordinal}} {{/each}}
{{#if sop.quality.badge}} ... {{/if}}
{{^if ...}} ... {{/if}}                 — negation
```

Unknown paths render to empty string and emit a structured warning on the render result (not an exception). Missing required fields for a specific template kind are caught at validation time (§7).

---

## 3. Data model

New Prisma entities appended to `apps/web-app/prisma/schema.prisma`.

```prisma
model UserTemplate {
  id            String   @id @default(uuid())
  ownerUserId   String   @map("owner_user_id")
  ownerTeamId   String?  @map("owner_team_id")     // null = personal
  kind          String                              // "sop" | "process_map"
  status        String   @default("draft")          // draft | published | archived
  name          String
  description   String?
  currentVersionId String? @unique @map("current_version_id")
  contextSchemaVersion String @default("1") @map("context_schema_version")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  owner        User                @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  team         Team?               @relation(fields: [ownerTeamId], references: [id], onDelete: Cascade)
  versions     UserTemplateVersion[] @relation("TemplateVersions")
  current      UserTemplateVersion?  @relation("CurrentVersion", fields: [currentVersionId], references: [id])

  @@index([ownerUserId, status])
  @@index([ownerTeamId, status])
  @@index([kind, status])
  @@map("user_templates")
}

model UserTemplateVersion {
  id          String   @id @default(uuid())
  templateId  String   @map("template_id")
  versionNum  Int      @map("version_num")          // monotonically increasing per template
  body        String                                 // Markdown+Mustache source
  bodyHash    String   @map("body_hash")             // sha256, for dedup & cache keys
  sizeBytes   Int      @map("size_bytes")
  compiledOk  Boolean  @default(false) @map("compiled_ok")
  compileErrors String? @map("compile_errors")       // JSON
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")

  template    UserTemplate @relation("TemplateVersions", fields: [templateId], references: [id], onDelete: Cascade)
  currentFor  UserTemplate? @relation("CurrentVersion")

  @@unique([templateId, versionNum])
  @@index([bodyHash])
  @@map("user_template_versions")
}
```

**Ownership:** a template is owned by a user OR a team (exclusive). Team templates are visible to all team members; only `owner`/`admin` roles can publish/archive (§6, auth).
**Versioning:** append-only. Updating a published template creates a new `UserTemplateVersion`; `currentVersionId` is repointed atomically. Rendered artifacts record the exact `versionId` used.
**Size cap:** enforced at write time — see §6.
**Hard delete:** soft-delete via `status=archived`; cascade only on team/user deletion.

---

## 4. API surface

All endpoints under `apps/web-app/src/app/api/templates/`. Responses follow the repo standard `{ data, error, meta }`. All inputs validated with Zod. Auth required (session cookie); team-scoped routes require team membership.

### `POST /api/templates`
Create a template + initial version.
```ts
Request: { kind: "sop" | "process_map", name: string, description?: string, body: string, teamId?: string }
Response: { data: { id, currentVersionId, status: "draft", compiledOk: boolean, warnings: string[] } }
```
Compiles the body (parse tokens, validate paths against `TemplateContext v1`). Rejects on size violation (§6).

### `GET /api/templates?kind=&status=&scope=personal|team|all`
List templates visible to caller (own + team). Pagination via `?cursor=&limit=`.
```ts
Response: { data: UserTemplateSummary[], meta: { nextCursor?: string } }
```

### `GET /api/templates/[id]`
Read metadata + current version body.
```ts
Response: { data: { id, kind, status, name, description, currentVersion: { id, versionNum, body, bodyHash, compiledOk } } }
```

### `PATCH /api/templates/[id]`
Update name/description/status; OR provide `body` to create a new version.
```ts
Request: { name?, description?, status?: "draft"|"published"|"archived", body?: string }
Response: { data: { id, currentVersionId, status, compiledOk, warnings } }
```

### `DELETE /api/templates/[id]`
Soft-delete (`status=archived`). 204.

### `POST /api/templates/[id]/render-preview`
Renders the template against a fixture `ProcessOutput`. Never touches workflows.
```ts
Request: { fixture?: "default" | "minimal" | "decision_heavy", processOutput?: ProcessOutput }
Response: { data: { markdown: string, warnings: string[], unresolvedPaths: string[], renderMs: number } }
```

### `POST /api/workflows/[id]/render?templateId=&versionId=`
Renders a specific user template against a real workflow's `ProcessOutput`. Returns Markdown inline (for download) and, when `persist=true`, writes a `WorkflowArtifact` row (§5).
```ts
Response: 200 text/markdown; optional `X-Template-Version-Id` header.
```

Existing `GET /api/workflows/[id]/export-markdown?artifactType=...` is extended to accept `artifactType=template_user_<templateId>` and resolve the rendered artifact. Unsupported user-template artifact types return 404 (unchanged contract).

---

## 5. Render pipeline integration

**Principle:** `renderAllTemplates` in `apps/web-app/src/lib/ingestion.ts` must remain deterministic and fixed-cardinality. We do **not** fan out user templates at ingestion time (that would couple workflow ingestion latency to user template count).

**Chosen approach — lazy render, persisted on first request:**

1. Ingestion continues to emit the 6 hardcoded artifacts (unchanged).
2. The first call to `POST /api/workflows/[id]/render?templateId=...` (or the extended `export-markdown` route) renders on demand using the stored `ProcessOutput` artifact as input.
3. Result is persisted as `WorkflowArtifact` with `artifactType = template_user_<templateId>_v<versionNum>`, `contentJson = { markdown, warnings, templateVersionId, renderedAt, engineVersion }`.
4. Subsequent requests for the same `(workflowId, templateId, versionNum)` short-circuit to the stored artifact.
5. Publishing a new template version does not invalidate old artifacts — they remain tied to the version used. A `?rerender=true` flag forces a new artifact at the current version.

The existing `export-markdown` route is extended: when `artifactType` starts with `template_user_`, it loads the artifact's stored Markdown directly (user templates render to Markdown, not to the intermediate `RenderedSOP`/`RenderedProcessMap` JSON). The system/user watermark logic remains unchanged.

A new pure function `renderUserTemplate(body: string, context: TemplateContext): { markdown: string, warnings: string[] }` lives in `packages/process-engine/src/templates/userTemplateRender.ts`. It has zero network/filesystem capability.

---

## 6. Security posture

**Threat model:**

| Threat | Vector | Mitigation |
|---|---|---|
| Stored XSS when Markdown is later rendered to HTML in-app | Template body contains `<script>` or malicious HTML | HTML-escape `{{ }}` by default. `{{{ }}}` raw is allowed only because Markdown is the terminal format; downstream HTML renderer MUST use a sanitizing Markdown pipeline (e.g. `rehype-sanitize`). Document this invariant in `docs/invariants.md`. |
| Code execution via template helpers | Using full Handlebars/Liquid | Logic-less Mustache; custom interpreter rejects unknown tag types. No `eval`. No dynamic property access via computed keys. |
| SSRF via template imports | `{{> partial}}` or URL fetches | Partials, includes, and remote references are disallowed at parse time. |
| ReDoS / parser DoS | Pathological template input | Hard size cap: **body ≤ 64 KB**, token count ≤ 2,000, loop nesting ≤ 4, `{{#each}}` expansion cap ≤ 10,000 iterations per render. Render wall-clock budget ≤ 250 ms enforced by timer; exceeding aborts with error. |
| Output size DoS | Huge loops producing GB of Markdown | Output size cap ≤ 2 MB per render. |
| Authorization bypass | User A renders template owned by User B | Template access requires owner match OR team membership (checked at API layer). Workflow render additionally requires workflow ownership. |
| Rate abuse | Spamming `render-preview` | Per-user rate limit: 30 renders / minute, 500 / day. Sliding-window counter in Redis. |
| PII leakage through bindings | Template reads `sop.notes` that contain unredacted content | `TemplateContext` is built from the already-policy-scrubbed `ProcessOutput`. No raw event fields are exposed. |
| Escape via prototype pollution | Token path traversal like `__proto__.x` | Path resolver walks a whitelist-only object; rejects `__proto__`, `constructor`, `prototype` keys explicitly. |
| Cross-tenant data leak | Team template rendered for another team's workflow | Render endpoint re-validates workflow AND template ownership/team scope on every call; no cached authorization. |

Logging: every render emits a structured log with `{ userId, templateId, versionId, workflowId?, renderMs, warnings.length, sizeBytes }`. No template body content is logged.

---

## 7. Determinism guard

**Mechanism:** the user-template render path is implemented in `packages/process-engine`, which has no dependency on `fetch`, LLM clients, database, filesystem, or `Date.now()` beyond a single injected `generatedAt` string threaded through `TemplateContext`.

**Automated checks (all CI-enforced):**

1. **Frozen-fixture golden test** — `packages/process-engine/src/templates/userTemplateRender.test.ts` renders a curated fixture template against a frozen `ProcessOutput` JSON fixture and asserts `expect(markdown).toMatchSnapshot()`. Snapshot is committed. Any change requires an explicit snapshot update.
2. **Byte-stability test** — render the same fixture twice in the same process and once after `JSON.parse(JSON.stringify(...))` round-trip; assert SHA-256 equality of all three outputs.
3. **No-IO test** — at package build time, grep the compiled `userTemplateRender.js` bundle for forbidden symbols: `fetch`, `require('http')`, `require('fs')`, `import('fs')`, `XMLHttpRequest`, `child_process`. CI fails on any match.
4. **Dependency allowlist** — `userTemplateRender` module declares its allowed imports in a header comment; a pre-commit hook (extension of the existing `.claude/hooks/`) validates the import graph is a subset.
5. **Runtime sentinel** — render function is called with a `Proxy` wrapping `globalThis` that throws on access to `fetch`, `setTimeout` (beyond the timeout timer, which is set before entering the renderer), etc. Enabled in test mode.

Result: any accidental introduction of non-determinism (network call, `Date.now()`, LLM helper) fails CI before merge.

---

## 8. Implementation sequencing

Ordered work items. Each item is a single iteration candidate.

1. **`packages/process-engine`: TemplateContext projection**
   Add `userTemplateContext.ts` exporting `buildTemplateContext(output): TemplateContext` and the `TemplateContext` type. Unit tests covering allow-list vs deny-list.

2. **`packages/process-engine`: userTemplateRender**
   Add `userTemplateRender.ts` with logic-less Mustache interpreter, path-safety guards (§6), size/iteration caps. Golden + byte-stability tests (§7).

3. **`apps/web-app/prisma/schema.prisma`: schema migration**
   Add `UserTemplate`, `UserTemplateVersion`. Generate migration. No changes to existing tables.

4. **API: CRUD endpoints** (`/api/templates`, `/api/templates/[id]`)
   Zod schemas, ownership checks, size cap enforcement, compile-on-write.

5. **API: render-preview** (`/api/templates/[id]/render-preview`)
   Fixture loader + render pipeline. Rate limits.

6. **API: workflow render** (`/api/workflows/[id]/render`)
   Artifact persistence using `template_user_<id>_v<n>` prefix.

7. **Extend `export-markdown` route** to resolve `template_user_*` artifact types.

8. **UI**: template list page, editor (textarea + live preview via `render-preview`), attach-to-workflow action. *(Out of scope for this doc — separate UX flow spec required.)*

9. **Observability**: dashboards for render volume, failure rate, p95 latency, size-cap rejections; alert on warnings/render ratio > 20%.

10. **Docs**: add template authoring guide and binding path reference to `docs/`; add rehype-sanitize invariant to `docs/invariants.md`.

---

## 9. Open trade-offs

1. **No partial/include system.** Deferred. Users will duplicate header/footer text across templates. Accepted because partials introduce a new attack surface (remote includes) and break single-file byte-stability guarantees. Revisit once >50 templates exist per org.

2. **No computed values / filters** (e.g. `{{ sop.steps.length }}`, date formatting). Deferred. Expose precomputed fields on `TemplateContext` instead (e.g. `sop.stepCount`, `workflow.generatedAtFormatted`). Pro: zero expression evaluator to secure. Con: we will keep extending the context; acceptable cost.

3. **Team sharing model is flat.** No folders, no per-template ACLs beyond owner-user/owner-team. Deferred because MVP does not have evidence of need. Reassess after usage data.

4. **Lazy render vs eager fan-out.** Chose lazy (§5). Trade-off: first export is slower (~100–300 ms), and workflow-level "rebuild all artifacts" does not propagate to user templates automatically. Accepted because it keeps ingestion latency bounded and template count decoupled from workflow processing time.

5. **Versioning is monotonic-integer, not semver.** Users cannot pin "v1.x". Deferred because SOP authors do not think in semver; rendered artifacts record the exact `versionNum` which is sufficient for traceability. Revisit if programmatic consumers appear.

---

**End of document.**
