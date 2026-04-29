# User-Uploaded Workflow & SOP Templates — MASTER PLAN

**Feature:** Custom Template Upload
**Owner (coordinator):** AI CTO / Coordinator
**Date:** 2026-04-18
**Status:** Design synthesis complete — awaiting user decisions on §11 before any build begins
**Scope of this document:** Synthesize the 11 agent artifacts in `docs/features/user-templates/` into a single unified plan. Reconcile contradictions. Name blockers. Produce a build order.

**Source artifacts (all in this directory):**
`PRD.md` · `MARKET_VALIDATION.md` · `COMPETITIVE_LANDSCAPE.md` · `ARCHITECTURE.md` · `UX_FLOWS.md` · `METRICS.md` · `BACKEND_PLAN.md` · `FRONTEND_PLAN.md` · `TEST_STRATEGY.md` · `OPS_PLAN.md` · `GROWTH_PLAN.md`

---

## 1. One-Page Summary

**What it is.** A Growth-tier capability that lets a user upload a Markdown template with Mustache-style tokens (`{{ workflow.title }}`, `{{#each sop.steps}}...{{/each}}`) and have every future recording render into that template automatically — alongside the existing six hardcoded templates. The rendered output is persisted, version-pinned, and traceable back to the recording's `ProcessOutput`.

**Why it exists.** Ledgerium's built-in SOP and process-map templates cover generic cases, but regulated-industry ops leads, BPO firms, and compliance teams have approved internal formats that no vendor default matches. Today they export from Ledgerium and manually reformat into Confluence/Word/internal systems. That manual reformatting erases the time savings Ledgerium promises. Custom templates remove the last step between a recording and a filed SOP.

**Why it fits Ledgerium.** The feature lives entirely in the presentation layer. `ProcessOutput` is unchanged. The deterministic pipeline is unchanged. The evidence-linkage contract is unchanged. Custom templates read from a frozen, versioned projection of `ProcessOutput` (`TemplateContext v1`), render via logic-less Mustache with no IO and no eval, and produce byte-stable output verified by snapshot + SHA-256 tests. This is the cleanest possible feature boundary for a deterministic product.

**Why it's defensible.** Per `COMPETITIVE_LANDSCAPE.md`: Scribe, Tango, and every adjacent capture tool hardcode their output. Notion/Confluence template ecosystems prove organizations will invest in enforcing their own format. No competitor in the workflow-recording category offers user-authored output templates with variable binding. The white space is deterministic + evidence-linked + user-defined structure.

**The one-line promise (per Growth Plan §1).** *"Record once. Render in your approved template. File without touching it."*

---

## 2. Go / No-Go Recommendation

**Recommendation: CONDITIONAL GO, contingent on §11 decisions.**

The design is build-ready. All ten specialist agents converged on a single coherent feature: Markdown + Mustache authoring, `TemplateContext v1` bindings, two new Prisma tables, lazy-rendered-and-persisted artifacts, Growth-tier gate. The architecture protects the deterministic core. The risks are known and mitigated.

The only reason this is not an unconditional GO is a sequencing question raised by `MARKET_VALIDATION.md`:

> *"Conditional go. Build after core loop is validated with beta users, not before. Trigger: 20+ validated paying Pro users, with at least 3–5 in regulated industries expressing the 'we need our format' friction in feedback."*

That is a product-strategy decision, not a technical blocker. Four options, explicit:

1. **Honor market-research gate.** Defer this build until 20 paying Pro users + 3–5 regulated-industry "format friction" signals are on record. Ship session-persistence (iter 010) and the other open blockers in the meantime.
2. **Override with build-now.** The feature is a differentiator in `COMPETITIVE_LANDSCAPE.md`, the design is clean, and the tier-revenue lift from Growth could be material. Build through closed beta (Week 1, 8–12 invited users) in parallel with iter 010+ blocker work.
3. **Design freeze + build when first reformatting-complaint support ticket arrives.** Formalize the artifacts in this directory, tag `UserTemplateSchema v1` as `v0.1-draft`, and hold. Build trigger = evidence-based demand signal from a real user.
4. **Ship a read-only "template gallery preview" in the Growth upgrade page now** (no build), measure click-through and upgrade intent, then decide.

Coordinator default recommendation: **Option 3**. It respects `MARKET_VALIDATION.md` without discarding the design work, and does not dilute the iter-010 release blocker that the selection policy has already queued (SW restart persistence, 9 loops unaddressed). Build cycles are currently owed to release blockers, not to new feature scope — see §9 for the tension.

**User must pick one.** The rest of this plan assumes the decision is "build it." Everything below is scoped for the build path.

---

## 3. Unified Feature Definition

### In scope (MVP / P0)

| # | Capability | Source |
|---|---|---|
| 1 | Upload a Markdown + Mustache template body (≤ 64 KB) via a paste-first editor. File upload is a post-MVP option. | PRD §3, UX §3, ARCH §1, BACKEND §3 |
| 2 | Each template declares `kind: "sop" \| "process_map"`. At most one active custom template per kind per workspace. | PRD P0.3, ARCH §3 |
| 3 | Token bindings resolve against a frozen **`TemplateContext v1`** projection of `ProcessOutput`. Allow-list enforced. No arbitrary property access. | ARCH §2 |
| 4 | Compile-on-write: body is parsed at upload/PATCH time, path validity checked against `TemplateContext v1`, size/token/nesting caps enforced. Draft cannot publish if `compiledOk = false`. | ARCH §6, BACKEND §5 |
| 5 | Live preview in the editor against the user's most recent real recording (fallback: synthetic fixture). Server-rendered, 500 ms debounce, abortable. | UX §4–5, FRONTEND §4 |
| 6 | Rendering is **lazy + persisted**: first `export-markdown` or `POST /api/workflows/[id]/render?templateId=...` triggers a render; result is stored as `WorkflowArtifact` with `artifactType = template_user_<templateId>_v<versionNum>`. Subsequent reads short-circuit. | ARCH §5, BACKEND §1 |
| 7 | Existing `GET /api/workflows/[id]/export-markdown` extended to resolve `template_user_*` artifact types. System artifact paths unchanged. | BACKEND §4 |
| 8 | Template gallery at `/templates` (list, activate/deactivate, delete, edit). Tier-gated via `useFeatureGate('customTemplates')`. | UX §6, FRONTEND §1,7 |
| 9 | Integration with existing `SOPTab.tsx` / `SOPPageShell.tsx` / `WorkflowTab.tsx` format switchers: custom templates append as additional pills, separated by divider. | UX §5, FRONTEND §6 |
| 10 | Fallback: if a render references a path that is `null`/missing at render time, token expands to empty string and a structured warning is stored on the artifact. The workflow detail view shows a dismissible amber notice naming the missing field. | PRD P0.6, UX §7, BACKEND §6 |
| 11 | Version history: every body edit creates a new `UserTemplateVersion` row. `currentVersionId` is reseated atomically. Old rendered artifacts remain pinned to the version that produced them. | ARCH §3, BACKEND §2 |
| 12 | Analytics: 10 events following the snake_case taxonomy (`template_upload_started`, `..._completed`, `..._failed`, `template_saved`, `template_deleted`, `template_applied_to_workflow`, `template_render_succeeded`, `template_render_failed`, `template_edit_opened`, `template_preview_rendered`). | METRICS §3 |

### Out of scope (stretch / P1+)

Explicit non-goals. Do not design for these in MVP:

- No LLM anywhere in the render path. Ever.
- No WYSIWYG visual editor. Markdown + tokens only.
- No scripting, helpers, filters, or computed expressions in templates.
- No remote includes, partials, or URL fetches inside templates.
- No retroactive re-render of past recordings on publish. On-demand `?rerender=true` only.
- No cross-workspace template sharing in MVP.
- No template marketplace or public template library.
- No Word/PDF upload. Markdown text only.
- No re-render on `ProcessOutput` schema evolution — artifacts are pinned to the `versionId` that produced them.

### Deferred decisions (post-MVP)

- Partials / includes (attack surface, breaks single-file byte stability).
- Semver for template versions (monotonic integer is sufficient for traceability at MVP).
- Per-phase or per-section overrides within a recording view.
- Template "clone from built-in" — blocked on exposing a canonical Markdown export of each hardcoded renderer (currently implemented as TypeScript, not stored Markdown).

---

## 4. Unified Architecture (Single Source of Truth)

### 4.1 Template authoring format

**Resolved contradiction.** PRD §3 initially referred to a JSON field-mapping schema. ARCHITECTURE.md §1 evaluated four options and selected **Markdown body + logic-less Mustache tokens**, rendered via `mustache.js@4.x` pinned. Every downstream artifact (UX, Frontend, Backend, QA, Ops, Growth) adopted the Mustache path without objection. **The master plan adopts Markdown + Mustache.** JSON field-mapping is rejected.

### 4.2 Rendering engine

`mustache.js` v4, pinned exact version, imported in logic-less mode. Wrapped in `packages/process-engine/src/templates/userTemplateRender.ts` with the following guardrails (all enforced in the wrapper, not relied upon from upstream):

| Guard | Value | Enforcement point |
|---|---|---|
| Body size cap | 64 KB (UTF-8 bytes) | Upload + parse time |
| Token count cap | 2,000 distinct tokens | Parse time |
| Loop nesting cap | 4 levels | Parse time |
| `{{#each}}` expansion cap | 10,000 iterations per render | Render time |
| Wall-clock budget | 250 ms | `Promise.race` + timer |
| Output size cap | 2 MB | Render time (truncate-and-abort) |
| Path allow-list | `TemplateContext v1` only | Path resolver |
| Forbidden keys | `__proto__`, `constructor`, `prototype` | Path resolver |
| Forbidden tags | `{{> partial}}`, `{{=`, URL strings in token position | Parse time |
| HTML escape default | `{{ x }}` escaped; `{{{ x }}}` raw (Markdown only; HTML rendering layer must use `rehype-sanitize`) | Renderer + `docs/invariants.md` |

### 4.3 `TemplateContext v1` (the binding contract)

A pure function `buildTemplateContext(output: ProcessOutput): TemplateContext` in `packages/process-engine/src/templates/userTemplateContext.ts` builds the projection once per render. It is the **only** surface the template can see. Allow-list (condensed from ARCH §2):

- `workflow.*` — title, description, generatedAt, durationLabel, stepCount, phaseCount, engineVersion, completionStatus
- `sop.*` — title, purpose, scope, trigger, estimatedTime, inputs[], outputs[], prerequisites[], systems[], roles[], completionCriteria[], notes[], steps[], frictionSummary[], commonIssues[], quality
- `processMap.*` — phases[], nodes[]
- `processDefinition.*` — name, description, systems[]

Explicit deny-list: `normalizedEvents`, raw `event_id`, DOM selectors, screenshot blobs, PII, auth tokens, internal enrichment state.

### 4.4 Data model

Two additive Prisma tables. **No changes to existing tables.** `WorkflowArtifact` gains no new columns — the new artifact types (`template_user_<id>_v<n>`) are written into the existing `artifact_type` column.

```prisma
model UserTemplate {
  id                   String   @id @default(uuid())
  ownerUserId          String   @map("owner_user_id")
  ownerTeamId          String?  @map("owner_team_id")     // null = personal
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
  versionNum    Int      @map("version_num")
  body          String                              // Markdown + Mustache source
  bodyHash      String   @map("body_hash")          // SHA-256, dedup + cache key
  sizeBytes     Int      @map("size_bytes")
  compiledOk    Boolean  @default(false) @map("compiled_ok")
  compileErrors String?  @map("compile_errors")
  createdBy     String   @map("created_by")
  createdAt     DateTime @default(now()) @map("created_at")

  template   UserTemplate  @relation("TemplateVersions", fields: [templateId], references: [id], onDelete: Cascade)
  currentFor UserTemplate? @relation("CurrentVersion")

  @@unique([templateId, versionNum])
  @@index([bodyHash])
  @@map("user_template_versions")
}
```

Storage decision (`OPS §1`): bodies live in Postgres TEXT columns. At 10K users the storage footprint is ~2 GB; at 50K users migrate `body` to S3 paths (additive schema change). No S3 in MVP.

### 4.5 API surface

New routes under `apps/web-app/src/app/api/templates/`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/templates` | Create + initial version. Compile-on-write. |
| GET | `/api/templates?kind=&status=&scope=` | List visible templates (own + team). |
| GET | `/api/templates/[id]` | Metadata + current version body. |
| PATCH | `/api/templates/[id]` | Update name/description/status, or create new version. |
| DELETE | `/api/templates/[id]` | Soft delete (`status=archived`). |
| POST | `/api/templates/[id]/render-preview` | Render against fixture or selected workflow. Rate-limited. |

Changed routes:

| Method | Path | Change |
|---|---|---|
| POST | `/api/workflows/[id]/render?templateId=&versionId=&persist=&rerender=` | NEW. Renders user template → persists `WorkflowArtifact`. |
| GET | `/api/workflows/[id]/export-markdown?artifactType=template_user_<id>_v<n>` | Extended to resolve user-template artifacts. System paths unchanged. |

All responses follow `{ data, error, meta }`. All inputs Zod-validated. Per-user rate limits: 30 renders/min, 500/day (Growth); see `OPS §2` for per-tier table.

### 4.6 Rendering lifecycle

Ingestion is **unchanged**. `renderAllTemplates` in `apps/web-app/src/lib/ingestion.ts` continues to emit exactly the 6 hardcoded artifacts. User templates do **not** fan out at ingestion — that would couple ingestion latency to per-workspace template count.

User-template render path (lazy):

```
First request for (workflowId, templateId)
  → load ProcessOutput artifact
  → buildTemplateContext(output)
  → renderUserTemplate(body, context)    // pure, in-process, 250 ms budget
  → persist WorkflowArtifact (template_user_<id>_v<n>)
  → return text/markdown

Subsequent request same (workflowId, templateId, versionNum)
  → load persisted artifact
  → return text/markdown (no re-render)

Publish new version
  → no backfill. Old artifacts remain pinned to old versionNum.
  → ?rerender=true forces a new artifact at the current version.
```

### 4.7 Determinism guarantees

Five guards, all CI-enforced (ARCH §7, BACKEND §7, QA §3):

1. Frozen-fixture golden test: render a committed template against a committed `ProcessOutput` fixture; compare `toMatchSnapshot()`.
2. Byte-stability: 100 renders in a forked Vitest worker; SHA-256 equality for all 100 outputs.
3. Round-trip stability: `JSON.parse(JSON.stringify(...))` the input; SHA-256 must still match.
4. No-IO grep guard: compiled `userTemplateRender.js` bundle checked for `fetch`, `require('fs')`, `require('http')`, `XMLHttpRequest`, `child_process`, `import('fs')`. CI fails on any match.
5. Runtime sentinel (test mode): render function called with a `Proxy` wrapping `globalThis` that throws on `fetch`, `Date.now()`, etc.

A production synthetic check (`OPS §5`) pings `/api/health/template-render` every 5 minutes and pages on-call if the pinned render SHA-256 drifts. This is the production determinism tripwire.

### 4.8 Security posture (summary; full threat model in ARCH §6)

- Stored XSS: `{{ }}` escapes; `{{{ }}}` raw output is safe in Markdown terminal format; HTML render layer MUST use `rehype-sanitize` — this invariant is mandatory and must be added to `docs/invariants.md`.
- No code execution: logic-less Mustache, no helpers, no `eval`, no dynamic property access.
- No SSRF: partials and URL fetches forbidden at parse time.
- ReDoS / DoS: size + token + nesting + iteration + wall-clock caps (§4.2).
- Authorization: template access requires owner match OR team membership; workflow render additionally requires workflow ownership; re-validated on every call — no cached authorization.
- Rate limits: per-tier (OPS §2), sliding-window in Redis.
- Prototype pollution: path resolver rejects `__proto__`, `constructor`, `prototype`.
- PII: `TemplateContext` is built from the already-policy-scrubbed `ProcessOutput`; raw events never reach a template.
- Log hygiene: template body content is never logged. `bodyHash` is safe to log.

### 4.9 Accessibility requirements (summary; full plan in UX §11, FRONTEND §9)

- CodeMirror 6 provides ARIA roles and keyboard navigation out of the box.
- Preview pane wrapped in `role="status" aria-live="polite"`.
- Color-independent indicators (checkmark/warning/X icons + text) for binding validation state.
- Modal focus trap + ESC close + focus return.
- Zero new blocking axe-core violations on `/templates` routes (CI-enforced via `axe-playwright`).

---

## 5. Scope Reconciliations (Contradictions Resolved)

The ten agents did not all agree. Coordinator resolutions:

| # | Conflict | Resolution | Driving reason |
|---|---|---|---|
| 1 | Template format: JSON schema (PRD) vs. Markdown + Mustache (ARCH, everything downstream). | **Markdown + Mustache wins.** | Architect explicitly evaluated the trade-off (ARCH §1); JSON field-mapping loses on authoring ergonomics with no offsetting determinism/security advantage. |
| 2 | Tier gating: Growth + Enterprise (PRD, Growth Plan) vs. Team + Growth + Enterprise with per-tier limits (OPS §2). | **Growth + Enterprise only for MVP.** Team sees the feature in Settings > Templates with an upgrade prompt. No upload/activate/render for Team tier. | Growth Plan §3 is the authoritative GTM call. OPS §2 was over-eager on tier support; its per-tier size/rate-limit table is applied only to Growth+Enterprise for MVP, Team row is dropped. Revisit if Team-tier upgrade conversion to Growth stalls. |
| 3 | Per-workspace template count limits: PRD is silent; OPS says 25 at Growth, 100 at Enterprise; Growth Plan is silent. | **Adopt OPS limits.** 25 at Growth, 100 at Enterprise. Version retention 25 (Growth), soft 50 then UI warning (Enterprise). | OPS is the only agent that did the storage math. Numbers are conservative and leave room to raise. |
| 4 | Pricing: Market Validation says $99–199/mo for Growth-tier-with-this-feature; Growth Plan does not price. | Pricing is NOT a build input. Existing Growth-tier price is unchanged by this feature. Price increase (if any) is a separate product decision post-launch. | This feature is not a separate SKU. |
| 5 | Upload surface: UX says paste-first; FRONTEND also paste-first; OPS hardening assumes file upload as well. | **Paste-first editor in MVP. File upload is P1.** OPS hardening rules still apply because the POST body goes through the same Zod + size + MIME checks regardless of UI path. | UX §3 reasoning holds: paste gives instant preview; file upload has no preview benefit and adds a step. |
| 6 | "File too large" error threshold: UX §9 mentions 50 KB; FRONTEND §8 mentions 512 KB; ARCH + OPS mandate 64 KB. | **64 KB hard cap from ARCH §6 wins.** UX and FRONTEND copy must be updated to reference "64 KB" before implementation. | Security architecture decision overrides UX copy. |
| 7 | Unsaved-change warning in Next.js 14 App Router: FRONTEND flags this as unresolved; UX doesn't address. | **Decision: autosave on blur, no warning dialog.** The template body is short (≤ 64 KB) and the editor is a single-purpose screen. Autosave eliminates the ambiguity and removes the navigation-intercept dependency the frontend agent flagged. | Simpler, matches the Ledgerium "no magic" principle. Final call needs user confirmation (§11). |
| 8 | Analytics event names: METRICS uses `template_render_succeeded`; OPS mentions `template_rendered`; Growth Plan uses `template_activated`. | **METRICS §3 is authoritative.** All other agents must use those exact event names. | Analytics taxonomy is owned by the analytics artifact; others default to it. |
| 9 | Fallback behavior: PRD P0.6 says "fall back to system template + notice"; BACKEND §6 says "render completes, empty-string token, warning stored"; UX §7 says "placeholder `[missing: path]` shown, SOP still usable." | **Layered fallback:** (a) token renders to empty string with warning (BACKEND §6), (b) workflow detail view shows an amber notice naming the missing field (UX §7 + PRD P0.6), (c) the user is not silently dropped to the system template unless the entire render fails (then and only then, system artifact is shown + explicit `fallback_reason` notice). | The three agents were describing three different failure modes, not the same one. This layering captures all three. |
| 10 | Growth Plan says system fallback; BACKEND says no system fallback at render failure (returns 422 + no artifact). | **BACKEND wins at the technical layer.** A render failure returns 422. The UX surfaces a "custom template did not render for this recording — here's why" notice and a link to the system template version, which is always available (it was rendered eagerly at ingestion). | System template is not the custom-template's "fallback" — it's the always-present baseline. Calling this "fallback" was causing confusion. |

---

## 6. Critical Dependencies and Blockers

Nothing below can be skipped. All must be resolved **before** any implementation PR opens.

### 6.1 Artifact blockers (existing docs that must be produced or updated)

| # | Artifact | Current state | Owner | Impact if missing |
|---|---|---|---|---|
| 1 | `API_SPEC.md` for this feature | Not started | system-architect | Frontend + QA blocked. BACKEND §4 is sufficient to begin but must be formalized. |
| 2 | Human-readable `ProcessOutput` field reference (for template authors) | Not started | product-manager + docs | Users cannot author templates. Autocomplete JSON is a developer artifact, not a user guide. |
| 3 | `UserTemplateSchema v1` publication | Implicit in ARCH §2 but not published as a standalone JSON Schema doc | system-architect | Upload validation, autocomplete, and `processOutputTokens.json` build script are all downstream of this. |
| 4 | `docs/invariants.md` — add `rehype-sanitize` invariant | Not done | system-architect | XSS guard is documented in ARCH §6 but not pinned in the invariants file. Any future HTML render layer change could violate it silently. |
| 5 | `customTemplates` added to `FeatureKey` in `apps/web-app/src/lib/plans.ts` | Not done | backend-engineer | Gate cannot function. Must be first PR before anything user-facing. |

### 6.2 Pre-build technical verifications

| # | Verification | Who |
|---|---|---|
| 1 | Confirm `ProcessOutput` schema is stable — no breaking changes in flight (PRD §10 row 1). | system-architect + backend-engineer |
| 2 | Confirm Prisma self-referential relation (`currentVersionId`) works in SQLite (dev) and Postgres (prod). SQLite needs `PRAGMA defer_foreign_keys = ON` for the reseating transaction (BACKEND §10 risk 2). | backend-engineer |
| 3 | Confirm Next.js 14 App Router API routes run on Node.js runtime (NOT edge) — render timeout uses `Promise.race` + `setTimeout` which differs on Edge (BACKEND §10 risk 3). Must set `export const runtime = 'nodejs'` on all render endpoints. | backend-engineer |
| 4 | Confirm `FeatureKey` remains a union type in `plans.ts`, not widened to `string` — TypeScript must enforce key completeness (BACKEND §10 risk 4). | backend-engineer |

### 6.3 Test-infrastructure blockers

| # | Item | Owner |
|---|---|---|
| 1 | Committed frozen `ProcessOutput` fixture at `packages/process-engine/src/templates/__fixtures__/frozen_process_output.json` (QA §3). | qa-engineer |
| 2 | Committed frozen user-template fixtures (`user-template-minimal.md`, `user-template-complex.md`) in the same directory. | qa-engineer |
| 3 | New test file `packages/process-engine/__tests__/template-determinism.spec.ts` runs in forked Vitest worker (`--pool=forks`). | qa-engineer |
| 4 | Free-tier seed user in `apps/web-app/scripts/seed-test-db.js` for feature-gate E2E tests (QA §5). | qa-engineer |
| 5 | Production synthetic check endpoint `/api/health/template-render` + monitor configuration (OPS §5). | devops-engineer |

---

## 7. Build Order (Authoritative Sequencing)

Each row is one PR. Do not merge out of order — downstream tasks assume upstream invariants. Size: S ≤ 0.5 day, M = 1–2 days, L ≥ 3 days.

### Phase 0 — Unblock (prerequisite artifacts)

| # | Task | Size | Owner | Blocks |
|---|---|---|---|---|
| 0.1 | Publish `API_SPEC.md` for `/api/templates/*` and extended `/api/workflows/[id]/render` and `/api/workflows/[id]/export-markdown`. | S | system-architect | 4.x, 5.x |
| 0.2 | Publish `UserTemplateSchema v1` as standalone JSON Schema doc in `docs/features/user-templates/`. | S | system-architect | 2.x, 6.x |
| 0.3 | Add `rehype-sanitize` invariant to `docs/invariants.md`. | S | system-architect | 6.x |
| 0.4 | Publish human-readable `ProcessOutput` field reference at `docs/process-output-fields.md`. | M | product-manager | Growth launch (closed beta) |
| 0.5 | Confirm `ProcessOutput` schema stability + document in this directory. | S | backend-engineer | 1.x |

### Phase 1 — Engine (deterministic core; no UI, no API)

| # | Task | Size | Package | Validation |
|---|---|---|---|---|
| 1.1 | `buildTemplateContext(output)` projection + `TemplateContext` type. Allow/deny list unit tests. | M | `packages/process-engine/src/templates/userTemplateContext.ts` | Unit tests green; deny-list leak test green. |
| 1.2 | `renderUserTemplate(body, context)` pure function via `mustache.js@4.x` pinned. Path allow-list, `__proto__`/`constructor`/`prototype` rejection, forbidden-tag rejection, size/token/nesting/wall-clock caps. | L | `packages/process-engine/src/templates/userTemplateRender.ts` | Byte-stability test × 100; round-trip test; no-IO grep; runtime sentinel; `toMatchSnapshot()` on 2 fixture templates. |
| 1.3 | Fixtures: `frozen_process_output.json`, `user-template-minimal.md`, `user-template-complex.md`. | S | `packages/process-engine/src/templates/__fixtures__/` | Committed; referenced by 1.2 tests. |
| 1.4 | Build-time token manifest generator → `apps/web-app/src/lib/templates/processOutputTokens.json`. | S | Build script + CI check | Manifest diff is clean; script idempotent. |

### Phase 2 — Schema + plan gate

| # | Task | Size | File | Validation |
|---|---|---|---|---|
| 2.1 | Add `UserTemplate` + `UserTemplateVersion` Prisma models. Run migration in dev SQLite + staging Postgres. | M | `apps/web-app/prisma/schema.prisma` + migration | Migration applies cleanly both engines; self-ref relation works. |
| 2.2 | Add `customTemplates` to `FeatureKey` in `plans.ts`. Enable at Growth + Enterprise; false at Free/Starter/Team. | S | `apps/web-app/src/lib/plans.ts` | TypeScript compile green across repo. |

### Phase 3 — API

| # | Task | Size | Route | Validation |
|---|---|---|---|---|
| 3.1 | `POST /api/templates` — Zod schema, auth, ownership, compile-on-write, size/MIME guards. | M | `app/api/templates/route.ts` | Integration test per Zod branch; 64 KB +1 byte rejection test. |
| 3.2 | `GET /api/templates`, `GET /api/templates/[id]`. | S | Same dir | List pagination; ownership scope. |
| 3.3 | `PATCH /api/templates/[id]` — name/desc/status + body-creates-new-version. At-most-one-active-per-kind archiving on publish. | M | `app/api/templates/[id]/route.ts` | Isolation test: draft cannot render; publishing a new version archives prior published of same kind. |
| 3.4 | `DELETE /api/templates/[id]` — soft delete. | S | Same | Active template delete reverts default. |
| 3.5 | `POST /api/templates/[id]/render-preview` — fixture + selected-workflow modes; rate limits. | M | `app/api/templates/[id]/render-preview/route.ts` | 12 OWASP XSS payloads sanitized (QA §4); rate-limit headers present. |
| 3.6 | `POST /api/workflows/[id]/render` — artifact persistence. `export const runtime = 'nodejs'`. | M | `app/api/workflows/[id]/render/route.ts` | Artifact written with correct `template_user_<id>_v<n>` type; rerender flag creates new row. |
| 3.7 | Extend `GET /api/workflows/[id]/export-markdown` to resolve `template_user_*`. | S | Existing file | System artifact paths unchanged (regression test). |

### Phase 4 — Frontend

| # | Task | Size | Component / Route | Validation |
|---|---|---|---|---|
| 4.1 | `customTemplates` gate hook + `TemplateGateGuard`. | S | `hooks/useFeatureGate.ts`, `components/templates/TemplateGateGuard.tsx` | Locked state for non-Growth; no layout shift. |
| 4.2 | `/templates` gallery with loading/empty/error states (mock data). | M | `app/(app)/templates/page.tsx`, `components/templates/TemplateCard.tsx` | Keyboard nav; axe clean. |
| 4.3 | `TemplateUploadModal` with client-side size/paste validation. | S | `components/templates/TemplateUploadModal.tsx` | 64 KB rejection before POST. |
| 4.4 | Wire gallery to real `GET`/activate/deactivate/delete via TanStack Query. | M | Gallery + mutations | Optimistic update + rollback on error. |
| 4.5 | `TemplateEditor` (CodeMirror 6 + Markdown + Mustache highlighting + autocomplete from `processOutputTokens.json`). `next/dynamic` with `ssr: false`. | L | `components/templates/TemplateEditor.tsx` | Bundle ≤ 160 KB gzip; autocomplete shows all allow-list paths. |
| 4.6 | `TemplatePreviewPanel` — server render-preview + 500 ms debounce + AbortController. | M | `components/templates/TemplatePreviewPanel.tsx` | Preview updates ≤ 800 ms p95 on local dev. |
| 4.7 | `TemplateEditorPage` — autosave on blur (no unsaved-change dialog; see §5 row 7). | M | `app/(app)/templates/[id]/edit/page.tsx` | Autosave fires on blur + on 5 s idle. |
| 4.8 | Format-switcher integration (`SOPTab.tsx`, `SOPPageShell.tsx`, `WorkflowTab.tsx`) — additional pill for custom template. | M | Existing files | Only appears when artifact present; `aria-label` includes name. |
| 4.9 | `TemplateFallbackNotice` in `SOPPageShell.tsx` + `WorkflowTab.tsx`. | S | `components/templates/TemplateFallbackNotice.tsx` | Appears only when `fallback_reason` on artifact metadata. |
| 4.10 | a11y audit pass: axe-playwright on `/templates`, upload modal, editor, preview. | S | `apps/web-app/e2e/` | Zero new blockers. |

### Phase 5 — Analytics + Ops

| # | Task | Size | Where | Validation |
|---|---|---|---|---|
| 5.1 | Wire 10 analytics events (METRICS §3) at correct trigger points. | M | Service + client layers | Event firing test in dev PostHog / internal DB. |
| 5.2 | Dashboard additions: Template Adoption Funnel, Render Health, Top Templates by Apply Count (METRICS §5). | S | Admin dashboard | Panels render with mock data. |
| 5.3 | Alert rules (METRICS §6 + OPS §5): render success < 85%, upload failure spike, fallback rate > 15%, synthetic SHA mismatch. | S | Alerting config | Test alerts fire in staging. |
| 5.4 | Production synthetic check endpoint + 5-minute ping (OPS §5). | S | `app/api/health/template-render/route.ts` | Pinned fixture golden SHA-256 stable across 10 runs. |
| 5.5 | Version-pruning background job (OPS §6). Retention: 25 versions (Growth), soft-50 (Enterprise). | S | `scripts/pruneTemplateVersions.ts` | Dry-run first; audit log entry per deletion. |

### Phase 6 — QA gates (release blockers for launch)

All seven release gates from `QA §7` must be green on main:
- Determinism: 5 templates × 100 runs, SHA-256 match.
- XSS sanitization: 12 OWASP payloads pass.
- Render success rate: ≥ 95% on 100 synthetic `ProcessOutput` fixtures.
- Accessibility: zero new blocking axe violations.
- Plan-tier gating: Free-tier `POST /api/templates` = 403.
- Regression: all pre-existing Vitest + Playwright green.
- No-IO guard: grep check on compiled bundle passes.

### Phase 7 — Launch (per Growth Plan §4)

- Week 1: closed beta, 8–12 invited Growth/Enterprise users. Gate exit: ≥ 3 participants with an active custom template, ≥ 1 successful new-recording render.
- Weeks 2–3: public beta for Growth + Enterprise, in-product message, feedback loop. Fallback rate > 15% → pause.
- Weeks 4–5: GA removal of beta badge, changelog email, tier page updated. No social announcement until a customer-quoted outcome is recorded.
- Week 6: single case study + $500 LinkedIn ad test against ops-manager persona. Contingent on hitting ≥ 4 of 5 success-bar metrics (Growth §9).

**Rough total effort (tasks 1.1 through 5.5, excluding Phase 0 artifacts and Phase 7 launch):** ~4–5 engineer-weeks spread across backend + frontend + QA + devops, assuming no parallelism penalties. Phase 1 (engine) is the tightest determinism constraint and should land first and in isolation.

---

## 8. Top Risks (Cross-Referenced)

Merged from Market §6, ARCH §6, QA §1, OPS §8–9, Growth §8. Ordered by severity × likelihood.

| # | Risk | Source(s) | Mitigation | Owner |
|---|---|---|---|---|
| 1 | **Determinism regression silently breaks audit traceability.** A future dependency bump or inline refactor introduces `Date.now()` / `fetch` into the render path. | QA §1, ARCH §7 | 5 determinism guards (§4.7) + production synthetic check pinging golden SHA-256 every 5 min. Any drift pages on-call as SEV-1. | qa + devops |
| 2 | **Stored XSS via template body reaching HTML render layer.** | QA §1, ARCH §6 | `{{ }}` default escape + `rehype-sanitize` invariant in `docs/invariants.md` + 12 OWASP payload integration tests + Playwright `page.on('dialog')` listener test. | qa |
| 3 | **Upload-to-activation rate stalls** (users upload but cannot figure out the schema). | Growth §8 risk 1, PRD §7 guard metric | Ship a downloadable starter template file + published `ProcessOutput` field reference (Phase 0.4) before closed beta exits Week 1. | pm + growth |
| 4 | **Fallback rate > 15%** (feature perceived as unreliable). | Growth §8 risk 2, PRD §7 guard | Name the exact missing field in the fallback notice. Monitor daily during closed + public beta. If > 10% pause GA. | qa + pm |
| 5 | **`TemplateContext v1` allow-list drifts from `ProcessOutput`.** A `ProcessOutput` rename silently produces empty-string renders. | BACKEND §10 risk 1 | TypeScript compile-time assertion that every allow-list path resolves against `ProcessOutput`. Frozen-fixture CI catches structural regressions. | backend |
| 6 | **Render timeout deployed to Edge runtime** (different `setTimeout` semantics). | BACKEND §10 risk 3 | Explicit `export const runtime = 'nodejs'` on every render route. Code-review checklist item. | backend |
| 7 | **Authorization bypass at cross-tenant render.** User A renders template owned by User B. | ARCH §6, QA §1 | Re-validate template AND workflow ownership on every call. No cached auth. Integration test per scenario. | backend + qa |
| 8 | **SQLite self-referential relation corruption.** Pointer reseating requires deferred FK. | BACKEND §10 risk 2 | `PRAGMA defer_foreign_keys = ON` on the reseating transaction. Unit test in SQLite; integration test in Postgres. | backend |
| 9 | **Storage growth blows past Postgres budget.** | OPS §1, §10 | Version retention caps + daily pruning job. Metric `templates.storage.body_bytes_total` alerts at 2 GB warning / 5 GB critical. Migrate to S3 at 50K users (additive). | devops |
| 10 | **Wrong-persona ticket flood.** Free/Starter users attempt to access the feature from marketing copy. | Growth §8 risk 3 | Zero marketing copy mentioning custom templates outside Growth/Enterprise surfaces. Upgrade prompt only visible on Settings > Templates page for Team tier. | growth |
| 11 | **Support burden from template authoring confusion.** | Market §6 risk 1 | Tight format (Markdown + Mustache only, no Word/PDF) + starter file + field reference. Manual exploratory test 1 (QA §8) runs this end-to-end before GA. | pm + qa |
| 12 | **Scope creep into WYSIWYG editor.** | Market §6 risk 2 | Explicit non-goal in §3 of this plan. PM owns backlog discipline on any post-launch request. | pm |

---

## 9. Portfolio Tension with Iter 010 (Release Blocker)

Per `SYSTEM_HEALTH.md` (2026-04-18):

- **Iter 010 is queued** with score 14 (11 base + 3 release-blocker bonus): session event persistence for service worker restart recovery. Blocker since iter 000, **9 loops unaddressed** — now the longest-standing open blocker.
- Per `CLAUDE.md § Selection Policy`: "Release-blocker minimum cadence: at least 1 of every 5 iterations must address a current release blocker. If none in the last 4, iteration 5 MUST select from the blocker list." Iter 010 is explicitly the next blocker iteration.
- Starting a multi-week user-templates build now defers iter 010. That extends a release blocker's age from 9 loops to ~30+ loops and violates the selection policy's intent.

**Coordinator's recommendation:** Do not start the user-templates build until iter 010 (and ideally iter 011, the LiveStepBuilder/StreamingSegmenter convergence blocker) closes. The user-templates design work is captured in this directory and does not decay; the release blockers do. This is consistent with §2 Option 3 (design freeze + build on evidence signal) and with the established iter-010 selection.

The user (Phil) explicitly asked for the parallel agent fan-out to determine *how* to build this feature, not *when*. The master plan is the answer to the "how." The "when" is a sequencing decision that must be explicitly overridden to happen before iter 010 + 011.

---

## 10. Phasing Recommendation

| Phase | Trigger | What ships | Effort |
|---|---|---|---|
| **P0 — Artifacts frozen (this doc)** | Today | 11 agent docs + this master plan. No code. | Done |
| **P1 — Blockers close first** | After iter 010 + iter 011 (SW persistence + LiveStepBuilder convergence) | No template work. Continue owed release-blocker burndown. | — |
| **P2 — Artifact unblock** | Demand signal: 3+ paying Growth/Enterprise or Pro users explicitly request a format they can author | Phase 0 tasks (API_SPEC, schema publication, field reference, invariants update). No code surfaces. | ~1 week |
| **P3 — Engine-only** | P2 complete | Phase 1 (engine + fixtures + determinism tests). No API, no UI. Ships determinism guards behind the scenes. | ~1.5 weeks |
| **P4 — Closed beta** | P3 complete + Phase 0 artifacts reviewed by 1–2 alpha users | Phases 2, 3, 4, 5. Closed beta to 8–12 Growth/Enterprise users. Growth Plan §4 Week 1 gate. | ~3 weeks |
| **P5 — Public beta** | Closed-beta exit gate passed (≥ 3 active, ≥ 1 successful render) | Opens to all Growth + Enterprise users. Beta badge on Settings > Templates. | Weeks 2–3 of Growth §4 |
| **P6 — GA** | ≥ 4 of 5 success-bar metrics green at Week 4 (Growth §9) | Badge removal, changelog, tier page update. No social yet. | Weeks 4–5 |
| **P7 — Paid launch** | Quotable customer outcome recorded | Case study + $500 LinkedIn ad test. | Week 6 |

Gate out of P6 to P7 is contingent on a customer quote citing a specific measured outcome (hours saved, compliance-team acceptance, etc.). Do not fabricate this.

---

## 11. Open Questions Requiring User Decision

Build cannot begin until these are answered. Coordinator will not pick defaults on user-facing product decisions.

| # | Question | Default (coordinator) | Why it matters |
|---|---|---|---|
| 1 | **Go / No-Go / Defer.** (§2) Override the market-research conditional gate, honor it, or freeze the design until a demand signal arrives? | **Option 3: freeze + build on evidence** | Commits or defers multi-engineer-week investment. |
| 2 | **Iter 010 precedence.** (§9) Do user-templates jump ahead of the session-persistence release blocker? | No. Run iter 010 + 011 first. | Breaks selection policy if yes; extends blocker age. |
| 3 | **Tier gate confirmation.** (§5 row 2) Growth + Enterprise only, with Team seeing a locked upgrade prompt? | Yes. | Drives plan-gate test cases and upgrade CTA placement. |
| 4 | **Unsaved-change warning.** (§5 row 7) Autosave on blur, no dialog? | Autosave. | Drives frontend §5 implementation; blocks task 4.7. |
| 5 | **Template body hard cap.** (§5 row 6) 64 KB for all tiers in MVP (per ARCH §6)? | 64 KB universal. | Drives UX copy, FRONTEND client-side validator, OPS parser limit. |
| 6 | **File upload in MVP.** (§3) Is paste-only authoring acceptable for closed/public beta? | Paste-only. File upload is P1. | Scope; defer if no. |
| 7 | **`ProcessOutput` field reference ownership.** (§6.1 row 2) PM + docs owns authoring this user-facing doc? | Yes. | Blocks Phase 0.4 and closed-beta launch. |
| 8 | **Starter template file to ship.** (Growth §8 mitigation 1) Approve shipping a downloadable starter template file with the upload UI at closed-beta start? | Yes. | Single biggest lever on upload-to-activation rate. |

---

## 12. Artifact Index

| File | Owner agent | Role in this plan |
|---|---|---|
| `PRD.md` | product-manager | Feature definition, user stories, success metrics, open questions |
| `MARKET_VALIDATION.md` | market-research | Demand evidence, ICP fit, pricing benchmarks, conditional go |
| `COMPETITIVE_LANDSCAPE.md` | competitive-researcher | White-space analysis, Scribe/Process Street/Whale/Trainual benchmarks |
| `ARCHITECTURE.md` | system-architect | Format decision, data model, security posture, determinism guard |
| `UX_FLOWS.md` | ux-designer | Entry points, editor design, error states, empty states, a11y |
| `METRICS.md` | analytics | 5 KPIs, 10 events, funnel, dashboards, alerts, experiment hook |
| `BACKEND_PLAN.md` | backend-engineer | Render engine, API routes, Zod schemas, build sequencing |
| `FRONTEND_PLAN.md` | frontend-engineer | CodeMirror choice, autocomplete manifest, preview strategy, bundle budget |
| `TEST_STRATEGY.md` | qa-engineer | Risk ranking, determinism protocol, 12 OWASP payloads, release gates |
| `OPS_PLAN.md` | devops-engineer | Postgres storage, per-tier limits, canary, cost model, runbooks |
| `GROWTH_PLAN.md` | growth-strategist | Positioning, tier gating, 6-week launch, 3 acquisition experiments, success bar |
| `MASTER_PLAN.md` (this doc) | coordinator | Synthesis, contradictions resolved, build order, open decisions |

---

**End of master plan.** This document supersedes implementation-level content in the individual artifacts where contradictions exist (see §5). The artifacts remain canonical for detail within their respective domains.
