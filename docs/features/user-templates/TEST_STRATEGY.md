# TEST STRATEGY: User-Uploaded Templates

**Feature:** Custom Markdown+Mustache template upload and rendering  
**Owner:** QA Engineer  
**Date:** 2026-04-18  
**Artifacts consumed:** PRD.md, ARCHITECTURE.md, UX_FLOWS.md (this dir), `packages/process-engine/src/templates/`, `apps/web-app/e2e/`  
**Status:** Planning-only. No test code in this pass.

---

## 1. Risk-Ranked Test Surfaces

Ordered by severity x likelihood. Severity assessed against customer-visible harm and data-integrity impact.

### CRITICAL

**1. Determinism**  
Same template body + same `ProcessOutput` must produce byte-identical Markdown across runs, processes, and OS. The entire product promise is "traceable, deterministic output." A non-deterministic render silently breaks audit trails. The `renderUserTemplate` function in `userTemplateRender.ts` must be a pure function with no access to `Date.now()`, `Math.random()`, `fetch`, or filesystem. Risk: any dependency that slips past the no-IO guard. Caught at: process-engine unit layer.

**2. XSS / injection via template body**  
User-authored template body is stored in the database and later rendered into Markdown-to-HTML in the in-app preview. Attack vectors:
- `<script>alert(1)</script>` in static text sections
- `javascript:` href in Markdown link syntax: `[click](<javascript:alert(1)>)`
- HTML event attributes: `<img src=x onerror=alert(1)>`
- Unicode homoglyphs and zero-width characters used to bypass sanitization patterns
- Triple-mustache `{{{ path }}}` injecting HTML into a Markdown render path that is later converted to HTML without rehype-sanitize

The ARCHITECTURE.md invariant states that downstream HTML rendering MUST use `rehype-sanitize`. If this is not enforced, stored XSS is trivially reachable. Caught at: integration (API) + E2E (preview render output).

### HIGH

**3. Binding robustness**  
`TemplateContext` paths that are missing, null, or structurally different from what the template author expected must degrade gracefully (emit warning, render empty string) rather than throw or produce partial/corrupt output. Edge cases: `sop.steps` empty array, `{{#each}}` over a null field, deeply-nested path beyond what `TemplateContext v1` exposes, circular-reference injection via crafted `ProcessOutput`, 500+ step workflows exhausting iteration caps. Caught at: process-engine unit layer.

**4. Render timeout enforcement**  
A template with deeply-nested `{{#each}}` blocks (4 levels deep x large arrays) must be aborted at 250 ms wall-clock with a structured error, not hang indefinitely. Timeout must not silently swallow the render result. Caught at: process-engine unit layer (mocked timer) + integration API layer.

**5. Plan-tier gating**  
`POST /api/templates` by a Free/Starter tier user must return 403. The `customTemplates` FeatureKey must be enabled only for Growth and Enterprise. Existing `feature-gating.spec.ts` pattern applies directly. Caught at: E2E API layer.

### MEDIUM

**6. Template size limits**  
Bodies >= 64 KB must be rejected at upload with HTTP 400 and a specific message. Token count > 2,000 and loop nesting > 4 must be caught at compile time, not at render time. Caught at: integration API layer.

**7. Upload flow: MIME, multi-file, zip bomb**  
API must reject non-text/markdown MIME types, multi-file submissions targeting a single template slot, and decompressed-size attacks (if the upload path accepts compressed input). Caught at: integration API layer.

**8. Draft vs. published isolation**  
A template in `draft` status must not be selectable for workflow rendering. Publishing a new version while a render is in flight must not produce a split artifact (half old version, half new). Caught at: integration API layer + unit concurrency test.

**9. Authorization**  
User A must not be able to read, patch, delete, or render-preview User B's template. Team-scoped templates must be visible only to team members. Re-validation of both template AND workflow ownership on every render call (ARCHITECTURE §6). Caught at: integration API layer.

---

## 2. Test Matrix

| Layer | Backend API | Process-Engine | Frontend UI |
|---|---|---|---|
| Unit | Zod schema validators; compile-on-write path resolver; size/token/nesting-cap enforcement; `buildTemplateContext` allow/deny list | `renderUserTemplate` pure function; all 5 determinism guards (§7 ARCH); binding edge cases; timeout abort; `formatEvidenceRow`/`formatConfidenceGlyph` unchanged | N/A (logic in process-engine) |
| Integration | CRUD lifecycle; render-preview endpoint; workflow render + artifact persistence; export-markdown route extension; auth ownership checks; rate-limit headers; fallback trigger | `TemplateContext` built from real `ProcessOutput` fixture; render pipeline called end-to-end without a DB | Template list state (TanStack Query); upload form Zod error surfacing; preview pane receiving render API response |
| E2E (Playwright) | `POST /api/templates` 403 for Free tier; `render-preview` XSS payload sanitized in response body | N/A — process-engine is a package, not a server | Full upload → gallery → apply → download flow; error and retry flow; feature gate UI; render failure fallback |

---

## 3. Determinism Verification Plan

**Location:** `packages/process-engine/__tests__/template-determinism.spec.ts`

**Fixtures required (committed to repo):**
- `fixtures/process-output-frozen.json` — a single frozen `ProcessOutput` JSON produced by `processSession(complexWorkflow())`, serialized with `JSON.stringify(output, null, 2)` and committed. This file MUST NOT be regenerated automatically. Any change requires an explicit PR review.
- 3 hardcoded system template outputs: operator_centric, enterprise, decision_based rendered from the frozen fixture.
- 2 user-template seed fixtures:
  - `fixtures/user-template-minimal.md` — single `{{#each sop.steps}}` loop, minimal static text
  - `fixtures/user-template-complex.md` — all top-level `TemplateContext v1` paths exercised, nested `{{#if}}`, `{{^if}}` negation, 4-level nesting

**Protocol:**
1. Load the frozen `ProcessOutput` JSON via `JSON.parse(readFileSync(...))`.
2. Build `TemplateContext` via `buildTemplateContext(output)`.
3. Render each of the 5 templates (3 hardcoded system + 2 user-upload seeds) once. Commit the resulting strings as Vitest snapshots.
4. In the determinism test body, render all 5 templates 100 times in a tight loop (no async, no timer mocking), collecting each output. Assert all 100 outputs equal the committed snapshot using SHA-256 comparison, not string equality — avoids false negatives from Unicode normalization differences across OS.
5. Add a second pass: serialize `TemplateContext` to JSON and back (`JSON.parse(JSON.stringify(ctx))`), re-render once per template, assert SHA-256 equality with the snapshot. This catches object-identity bugs (e.g., rendering depends on `===` identity rather than value equality).
6. CI configuration: the spec runs in a separate Vitest worker with `--pool=forks` to cross-process isolate and detect any leaked global state.

**Pass criterion:** all 5 x 100 renders produce a SHA-256 hash identical to the committed snapshot. Any failure is a build-blocking determinism regression.

**Existing determinism test in `templates.test.ts`** covers 2 runs of `processSession` output, not `renderUserTemplate`. The new spec is additive and specifically targets the user-template render path plus the frozen-fixture long-run protocol. The existing test must remain green and unmodified as the regression baseline.

---

## 4. Security Test Plan

**Scope:** test payloads are exercised against three surfaces: (a) template source editor / upload API, (b) `render-preview` response body, (c) exported Markdown rendered to HTML in-app.

**OWASP categories:** A03:2021 Injection, A05:2021 Security Misconfiguration (missing sanitization headers), A01:2021 Broken Access Control.

**Payload inventory (one test case per payload):**

| # | Payload | Surface | Expected behavior |
|---|---|---|---|
| 1 | `<script>alert(1)</script>` in static text | (a) upload body, (b) render-preview output, (c) HTML preview | Escaped to `&lt;script&gt;` in all HTML contexts; rendered verbatim in raw Markdown output |
| 2 | `[click](<javascript:alert(1)>)` Markdown href | (b) render-preview markdown, (c) HTML preview | `javascript:` scheme stripped by rehype-sanitize; href becomes empty or omitted |
| 3 | `<img src=x onerror=alert(1)>` inline HTML | (b), (c) | Tag stripped or attributes removed by sanitizer |
| 4 | `<a href="data:text/html,<script>alert(1)</script>">x</a>` | (b), (c) | `data:` URI stripped |
| 5 | HTML event handlers: `<div onclick="alert(1)">` | (b), (c) | Event attributes stripped |
| 6 | Unicode RTL override: `\u202E` followed by XSS | (a) upload, (b) render output | Token normalized; no rendering bypass |
| 7 | Zero-width space in `<scri\u200bpt>` | (b), (c) | Sanitizer treats assembled tag correctly; confirm it is not bypassed |
| 8 | `__proto__` path in template token: `{{ __proto__.polluted }}` | (b) render-preview | Path resolver rejects; renders empty string; no prototype pollution |
| 9 | `{{ constructor.constructor('alert(1)')() }}` | (b) render-preview | Interpreter rejects non-allowlist path; no eval |
| 10 | Triple-mustache `{{{ sop.title }}}` containing HTML | (b) render-preview, (c) HTML export | Safe in raw Markdown context; downstream HTML renderer sanitizes |
| 11 | CSS injection: `</style><script>` in a static block | (b), (c) | Style tags stripped |
| 12 | Template size exactly 64 KB + 1 byte | (a) upload | HTTP 400, specific size error |

**Validation method:** integration test per payload via `POST /api/templates` + `POST /api/templates/[id]/render-preview`, assert on (1) HTTP status, (2) response body does not contain the unescaped attack string, (3) for HTML-render cases, parse the rendered HTML and confirm no `<script>` tags and no `javascript:` hrefs survive. Playwright E2E covers surfaces (b) and (c) visually for payloads 1, 2, 5.

---

## 5. E2E Scenarios (Playwright, web-app)

All scenarios use the existing `auth.setup.ts` session state. Growth-tier user = `e2e@ledgerium.test`. A Free-tier user must be added to `seed-test-db.js` for scenario 6.

**Scenario 1 — Happy path: upload, activate, apply, render, download**  
Given I am authenticated as a Growth-tier user and on the `/templates` gallery page,  
When I upload `user-template-minimal.md` (valid Markdown+Mustache), activate it, navigate to an existing workflow detail, click "Export with custom template",  
Then I download a `.md` file whose content matches the render-preview output for that workflow's `ProcessOutput`.

**Scenario 2 — Malformed template: upload fails, error shown, retry succeeds**  
Given I upload a template body containing an unclosed `{{#each}}` block,  
When upload validation runs,  
Then I see an inline error identifying the malformed token. When I fix the body and re-upload, the template is accepted and appears in the gallery with status "draft".

**Scenario 3 — Feature gate: Free-tier user sees upgrade prompt**  
Given I am authenticated as a Free-tier user and navigate to `/templates`,  
When the page loads,  
Then I see an upgrade prompt (not a 404 or blank state), the upload button is either absent or disabled, and `POST /api/templates` returns 403.

**Scenario 4 — Render failure fallback: custom template applied but required field absent**  
Given a custom SOP template requiring `sop.trigger` is active, and a workflow whose `ProcessOutput` has `sop.trigger = undefined`,  
When that workflow's detail page loads,  
Then a visible notice reads "Custom template could not be applied: [reason]. System template used." and the system-selected artifact is displayed.

**Scenario 5 — Draft vs. published isolation**  
Given I have a template in draft status,  
When I navigate to a workflow and attempt to render with the draft template via the API (`POST /api/workflows/[id]/render?templateId=...`),  
Then the API returns a 422 or 400 indicating the template is not published.

**Scenario 6 — XSS payload does not execute in preview pane**  
Given I upload a template body containing `<script>alert(1)</script>` in a static text block,  
When I open the live preview pane,  
Then no JavaScript alert fires, the Playwright `page.on('dialog', ...)` listener receives no dialog events, and the raw `<script>` tag is escaped or absent in the rendered HTML.

**Scenario 7 — Template gallery lists, deactivates, and deletes correctly**  
Given I have two active templates (one SOP, one process map),  
When I deactivate the SOP template,  
Then its gallery status updates to "inactive" without a page reload, and a subsequent workflow render does not use the custom template.

**Scenario 8 — Size limit enforced in upload UI**  
Given I select a file >= 64 KB + 1 byte,  
When I attempt upload,  
Then I see a specific error message referencing the size limit before or immediately after submission, and no template row is created.

---

## 6. Regression Surface

The following existing tests and flows must remain passing without modification. Any change to their behavior is a regression, not a feature.

**Six hardcoded system templates (confirmed by `templates.test.ts`):**
- `swimlane` (renderProcessMap)
- `bpmn_informed` (renderProcessMap)
- `sipoc_high_level` (renderProcessMap)
- `operator_centric` (renderSOP)
- `enterprise` (renderSOP)
- `decision_based` (renderSOP)

The determinism test in `templates.test.ts` (`Determinism` describe block, line 587) renders the `complexWorkflow` fixture twice and asserts equality. This must remain green. The new `template-determinism.spec.ts` is additive.

**Export-markdown route:** `GET /api/workflows/[id]/export-markdown` with `artifactType` values for the six system templates must return unchanged behavior. The extension to accept `template_user_*` artifact types must not alter existing artifact resolution logic. Validated by extending the existing export integration test with a non-user-template artifact type assertion.

**Feature-gating spec (`apps/web-app/e2e/api/feature-gating.spec.ts`):** existing 403/200 assertions for analytics and teams endpoints must remain green. The new `customTemplates` FeatureKey must follow the same `{ data, error, meta }` error shape.

**Upload spec (`apps/web-app/e2e/app/upload.spec.ts`):** the `POST /api/upload` endpoint (workflow recording upload) is distinct from `POST /api/templates`. Both must continue to operate independently. The non-JSON rejection test (HTTP 400) and fixture upload test (HTTP 201) must remain green.

---

## 7. Release Gates

All of the following must pass before shipping to Growth-tier users.

| Gate | Criterion | Validation method |
|---|---|---|
| Determinism | All 5 template x 100-run SHA-256 hashes match committed snapshots | CI: `template-determinism.spec.ts` green |
| XSS sanitization | All 12 OWASP payloads (§4) produce no unescaped attack strings in render output or HTML preview | Integration test suite + Playwright scenario 6 green |
| Render success rate | >= 95% on 100 synthetic `ProcessOutput` fixtures (ranging from 1-step minimal to 50-step complex with all field variants) | CI fixture sweep script emits failure count |
| Accessibility | Zero new blocking (critical/serious) axe-core violations on `/templates` gallery, upload modal, and preview pane | Playwright + `axe-playwright` assertion in new a11y spec |
| Plan-tier gating | Free-tier `POST /api/templates` returns 403 with `{ error: /requires|upgrade|plan/i }` | `feature-gating.spec.ts` extension green |
| Regression | All pre-existing Vitest and Playwright specs green | CI full test suite |
| No-IO guard | Compiled `userTemplateRender.js` contains none of: `fetch`, `require('http')`, `require('fs')`, `XMLHttpRequest`, `child_process` | CI grep check (per ARCHITECTURE §7) |

---

## 8. Manual Exploratory Test Scripts

These scenarios require human judgment and are not suitable for full automation.

**Explore 1 — Schema authoring friction**  
A tester with no prior knowledge of `TemplateContext v1` attempts to author a valid template using only the published path reference documentation. Goal: identify any path names that are confusing, undocumented, or produce silent empty-string renders without a clear warning. Record how many attempts are needed before the first successful render.

**Explore 2 — Preview pane live edit latency and error surfacing**  
With a large template body (40 KB), make rapid successive edits in the template editor and observe whether the preview pane debounce is appropriate, whether error overlays clear correctly when the syntax error is fixed, and whether the preview shows a stale result during a slow render (>250 ms mock). Confirm the loading state is visible and dismisses cleanly.

**Explore 3 — Team template visibility after role change**  
Create a team template as a team admin. Downgrade a second user from member to viewer (or remove from team). Observe whether the template immediately disappears from the second user's gallery. Check for any cached state or race condition where a removed member still sees the template for a short period.

**Explore 4 — Fallback notice usability**  
Trigger the fallback path by uploading a template requiring `sop.trigger` then processing a recording that does not detect a trigger. Read the fallback notice in the workflow detail view and assess whether the message is actionable (can the user understand what field was missing and how to fix the template?). This is a PRD acceptance criterion (Story 5) that requires human assessment.

**Explore 5 — Deactivation mid-render race**  
While a long-running `POST /api/workflows/[id]/render` is in flight (if artificially delayed in a dev environment), deactivate the template via the settings page. Observe whether the in-flight render completes successfully (it should — deactivation affects future renders only) and confirm the resulting artifact is correctly attributed to the template version that was active at render start.

---

## 9. Observability Hooks

The test environment must capture the following telemetry to support bug triage. Aligns with `docs/EVENT_TRACKING_PLAN.md` analytics events and ARCHITECTURE §6 structured logging.

| Signal | Where captured | Triage value |
|---|---|---|
| `renderMs` per template render | Structured log on every `POST render-preview` and `POST /api/workflows/[id]/render` response | Identify renders approaching the 250 ms timeout; catch performance regressions in the interpreter |
| `warnings.length` and `warnings[]` content | Response body + structured log | Distinguish "rendered with missing paths" from "rendered cleanly"; high warning rates indicate `TemplateContext` path documentation gap |
| `unresolvedPaths[]` | `render-preview` response body | Identify which template paths are most commonly mistyped; feeds schema documentation improvement |
| `sizeBytes` of render output | Structured log | Catch output-size DoS attempts approaching the 2 MB cap |
| Fallback events (`{ reason, templateId, workflowId }`) | Structured log + surfaced in workflow detail view | Track the PRD fallback-rate guard metric (target < 15%) |
| `compiledOk: false` rate at upload | API response + log | If > 30% of uploads fail compilation, schema UX needs improvement |
| Rate-limit header `X-RateLimit-Remaining` | All `render-preview` responses | Confirm rate limits are applied and visible to API consumers; test client can assert headers |
| axe-core violation count | Playwright a11y run output | Baseline accessibility state; any increase is a release blocker |

In CI, the Vitest determinism spec captures render durations for all 100 iterations and asserts `max(renderMs) < 250`. Any run where this assertion fails surfaces a performance regression before it reaches the timeout abort path.
