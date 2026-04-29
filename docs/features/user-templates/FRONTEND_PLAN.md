# Frontend Implementation Plan: User-Uploaded Workflow and SOP Templates

**Feature:** Custom Template Upload  
**Author:** Frontend Engineer Agent  
**Date:** 2026-04-18  
**Status:** Design-only pass — no code. Blocked on API_SPEC.md and ARCHITECTURE.md (see Section 12).

---

## 1. New UI Surfaces

### Pages

| Route | Purpose |
|---|---|
| `/templates` | Template gallery: lists all uploaded templates for the workspace with status, type, and actions (activate, deactivate, delete). |
| `/templates/[id]/edit` | Template editor: loads the stored template JSON, provides an editor with token autocomplete and a live preview panel. Also handles the "upload new" entry path via a modal trigger. |

### New Components

| Component | Location |
|---|---|
| `TemplateGalleryPage` | `apps/web-app/src/app/(app)/templates/page.tsx` |
| `TemplateEditorPage` | `apps/web-app/src/app/(app)/templates/[id]/edit/page.tsx` |
| `TemplateCard` | `apps/web-app/src/components/templates/TemplateCard.tsx` |
| `TemplateUploadModal` | `apps/web-app/src/components/templates/TemplateUploadModal.tsx` |
| `TemplateEditor` | `apps/web-app/src/components/templates/TemplateEditor.tsx` (lazy) |
| `TemplatePreviewPanel` | `apps/web-app/src/components/templates/TemplatePreviewPanel.tsx` |
| `TemplateGateGuard` | `apps/web-app/src/components/templates/TemplateGateGuard.tsx` |
| `TemplateFallbackNotice` | `apps/web-app/src/components/templates/TemplateFallbackNotice.tsx` |

### Integrations with Existing Components

- `SOPPageShell.tsx` — format switcher gains a "Custom" option when a `template_sop_custom` artifact is present.
- `SOPTab.tsx` — same.
- `WorkflowTab.tsx` — format switcher gains a "Custom" option when a `template_process_map_custom` artifact is present.
- `apps/web-app/src/app/(app)/workflows/[id]/page.tsx` — reads the custom artifact from the existing `artifacts` array; no structural change required.

---

## 2. Editor Technology Decision

**Selected: CodeMirror 6** — package `@codemirror/next` is now the stable v6 bundle; practical entry point is `codemirror@6.x` (currently `6.0.1`) plus `@codemirror/lang-markdown`, `@codemirror/autocomplete`, and a custom Handlebars extension.

**Justification:**

- Syntax highlighting for Markdown is first-class via `@codemirror/lang-markdown`. A thin language extension can layer Handlebars `{{ }}` token highlighting on top using CodeMirror's composable language support.
- Autocomplete for token bindings uses CodeMirror's `autocompletion()` extension, fed a static list of `ProcessOutput` token paths (see Section 3). This is well-documented and does not require custom parsing infrastructure.
- Bundle size: CodeMirror 6 tree-shakes cleanly. The editor chunk (markdown + autocomplete + our extension) lands around 120–150 kB gzipped when lazy-loaded. Monaco adds 2–5 MB and is unjustified for JSON + Markdown editing at this scope.
- Accessibility: CodeMirror 6 has full ARIA roles for the editor region, screen-reader-compatible cursor announcements, and keyboard-only navigation. Monaco's ARIA support is weaker and requires additional configuration.
- Maintenance: CodeMirror 6 is actively maintained, has a clear extension API, and the existing repo has no Monaco dependency to harmonize with. Adding Monaco as a new first-party dependency is a higher ongoing maintenance cost.
- The plain textarea option would require building syntax highlighting and autocomplete from scratch; ruled out.
- `react-json-schema-form` targets form-based JSON input, not template authoring; does not apply.

The `TemplateEditor` component is lazy-loaded via Next.js `dynamic()` with `ssr: false` so CodeMirror never ships in the server bundle.

---

## 3. Token Autocomplete Strategy

**Approach: static JSON schema file generated from `packages/process-engine` types.**

A build-time script (run as part of `pnpm build`) reads the `ProcessOutput` TypeScript type from `packages/process-engine/src/types.ts` and emits `apps/web-app/src/lib/templates/processOutputTokens.json`. Each entry has the shape:

```
{ token: string, path: string, description: string, example: string }
```

Example entry: `{ token: "steps", path: "processDefinition.stepDefinitions", description: "Array of workflow steps", example: "{{steps}}" }`.

This file is imported directly into the `TemplateEditor` component and fed to CodeMirror's `autocompletion()` extension. When the user types `{{`, the completion list opens showing all available tokens. Tab or Enter inserts the selected token.

**Why not runtime-generated?** The `ProcessOutput` shape is defined in TypeScript types, not a JSON schema the browser can fetch. Generating at build time keeps the browser bundle self-contained and avoids a round-trip. The tradeoff is that the token list is stale if `ProcessOutput` changes without a rebuild — acceptable because `ProcessOutput` is declared stable as a build precondition for this feature (see PRD section 10).

The JSON file is also the source for the "Available Tokens" reference panel rendered beside the editor in the UI, so it serves double duty without duplicating data.

---

## 4. Live Preview

**Recommendation: server-side rendering via `POST /api/templates/[id]/render-preview`.**

The request body contains `{ draftContent: string, sampleWorkflowId?: string }`. The server runs the deterministic template renderer against either the specified workflow's `ProcessOutput` or a fixture `ProcessOutput` kept server-side. The response is `{ data: { renderedMarkdown: string } }`. The client renders the returned Markdown using a lightweight parser (`marked@^12` or the existing Markdown renderer already in the repo).

**Reasoning:**

- The template renderer (the mapping logic from `ProcessOutput` to template output) is defined in the backend and must remain there per the PRD non-goal ("no LLM, deterministic render"). Shipping a duplicate of that logic client-side via a browser Handlebars bundle creates a divergence risk: the preview would not match what the server actually renders.
- Bundle size: shipping Handlebars.js (`~80 kB` gzipped) plus a Markdown renderer client-side adds cost for a preview path that is only used in the editor. The server POST adds a network hop but eliminates the bundle cost and the correctness risk.
- The preview is debounced (500 ms after last keypress) to avoid flooding the server.
- Error paths (malformed template, missing token) return structured errors the client can display inline without a full re-render.

---

## 5. State Management

**Approach: TanStack Query mutation + local dirty flag.**

- Initial template content is loaded via `useQuery` against `GET /api/templates/[id]`.
- The editor maintains a local `draftContent` string in `useState`. This is the only client-side state needed.
- A `isDirty` boolean tracks whether `draftContent` differs from the last-saved value.
- Saving uses a `useMutation` calling `PATCH /api/templates/[id]` and resets `isDirty` on success.
- The preview is triggered by a separate `useMutation` (or a query with `enabled` logic) calling the render-preview endpoint, debounced.

**Unsaved-change warning:** The `useBeforeUnload` pattern (a `window.beforeunload` event listener) fires when the user closes the tab with `isDirty = true`. For in-app navigation, a `useRouter` `beforePopState` handler or a Next.js route change guard intercepts the navigation and shows a confirmation dialog. The exact API depends on Next.js 14 App Router's navigation interception — this needs confirmation from the architect (see Section 12).

The gallery page uses only `useQuery` (read-only list fetch) and `useMutation` for activate/deactivate/delete. No global state store is introduced.

---

## 6. Integration with Existing Format Switchers

**Recommendation: custom templates appear as additional buttons in the existing format-switcher row, not in a separate dropdown.**

The existing switcher in `SOPTab.tsx`, `SOPPageShell.tsx`, and `WorkflowTab.tsx` is a horizontal pill group that iterates over a label map. The change is:

1. Each switcher component receives an optional `userTemplates` prop of type `Array<{ id: string; name: string; artifactKey: 'template_sop_custom' | 'template_process_map_custom' }>`.
2. If `userTemplates` is non-empty, an additional button is appended to the pill group for each custom template. The MVP PRD caps this at one active custom template per type, so in practice at most one additional button appears.
3. The button label is the template's user-supplied name (truncated to 16 characters with a tooltip for the full name).
4. Selecting it sets `selectedFormat` to `'custom'` and the view renders the custom artifact via a new `CustomTemplateView` component that renders the server-returned Markdown.
5. No change to the existing system template buttons.

The `workflows/[id]/page.tsx` passes `userTemplates` down from the artifacts array (it already reads all artifacts). No new API call is needed at the detail page level — the custom artifact arrives in the existing artifacts fetch.

A separate dropdown was considered but rejected: it creates a two-tier hierarchy (system formats vs. user formats) that is visually inconsistent with the current flat switcher, adds interaction cost, and is unnecessary when the MVP only allows one custom template per type.

---

## 7. Tier-Gated UI

Uses `useFeatureGate('customTemplates')` from `apps/web-app/src/hooks/useFeatureGate.ts`.

- `TemplateGateGuard` wraps the `/templates` page. If `allowed === false` and `loading === false`, it renders a locked state: a blurred screenshot of the gallery UI (static image), a lock icon, the copy "Custom templates require the Growth plan", and a CTA button linking to `/pricing` with `?highlight=growth`. The `requiredPlan` value returned by the hook populates the CTA copy.
- During `loading`, the guard renders the same skeleton as the gallery page (prevents layout shift and avoids the locked state flashing).
- The format switcher integration in `SOPPageShell.tsx`, `SOPTab.tsx`, and `WorkflowTab.tsx` does not check the gate independently — if a `template_sop_custom` artifact exists in the workflow data, the button appears regardless of plan (it was rendered when the plan was valid). The gate matters at the management layer, not the view layer.
- The upload modal and "Manage templates" link in the nav are hidden (not rendered) for non-Growth users via the same `allowed` check at the parent level.

---

## 8. Error States

| Error | Component behavior |
|---|---|
| **Malformed template (upload validation failure)** | `TemplateUploadModal` shows an inline error below the file input. Error text is the server-returned `error.message` which identifies the failing field by path. The modal stays open; the file input resets. |
| **Render timeout (preview endpoint takes >8 s)** | `TemplatePreviewPanel` shows a yellow warning callout: "Preview timed out — template may be too complex. Try simplifying a section." The draft is not discarded. |
| **Binding missing at render time** | Server returns `{ error: { code: 'MISSING_BINDING', field: 'steps[].system' } }`. Preview panel renders an orange inline callout beneath the affected line (CodeMirror decoration via the error token) and in the preview panel: "Token `{{steps[].system}}` is missing in this workflow's data." |
| **File too large (over backend limit)** | `TemplateUploadModal` validates file size client-side before submitting (limit sourced from a constant; exact value to be confirmed in API_SPEC.md). If exceeded, an inline error: "File exceeds the 512 KB limit. Reduce the template size and try again." No server request is made. |

The `TemplateFallbackNotice` component is rendered inside `SOPPageShell.tsx` and `WorkflowTab.tsx` when the artifact metadata includes a `fallbackReason` field (set by the backend render pipeline per PRD P0.6). It appears as a dismissible amber callout above the format switcher.

---

## 9. Accessibility

- **Gallery keyboard nav:** `TemplateCard` action buttons (Activate, Deactivate, Delete) are focusable in DOM order. The delete action opens a confirmation dialog that traps focus using `role="dialog"` and `aria-modal="true"`. Escape closes it.
- **Editor:** CodeMirror 6 sets `role="textbox"` and `aria-multiline="true"` on the editor surface. The "Available Tokens" panel is a `<aside>` with `aria-label="Available template tokens"`. Token autocomplete items use `role="listbox"` / `role="option"` as provided by CodeMirror's built-in completion UI.
- **Template cards:** Each `TemplateCard` has an `aria-label` of `"[Template name], [type], [status]"` so screen readers announce the full card context without requiring the user to navigate into it.
- **Preview live region:** `TemplatePreviewPanel` wraps its rendered output in a `<div role="status" aria-live="polite" aria-label="Template preview">`. After a successful preview render, the live region content updates so screen reader users hear "Template preview updated."
- **Error highlighting:** CodeMirror error decorations use `aria-describedby` pointing to the error message element so the inline error is announced when the cursor moves to the affected token.
- **Color contrast:** All error/warning callouts use the existing `ds-callout-warning` and `ds-callout-danger` design-system tokens which are already tested for WCAG AA contrast. No new color values are introduced.

---

## 10. Performance

**Bundle-size budget:**

| Asset | Target (gzipped) |
|---|---|
| CodeMirror editor chunk (lazy) | <= 160 kB |
| `processOutputTokens.json` | <= 20 kB |
| `TemplatePreviewPanel` (including `marked`) | <= 30 kB (if `marked` not already in bundle) |
| Total new JS added to initial load | 0 kB (all editor surfaces are lazy) |

**Lazy loading:** `TemplateEditor` uses `next/dynamic` with `ssr: false` and a skeleton placeholder. The editor only loads when the `/templates/[id]/edit` route is active.

**Preview debounce:** The render-preview mutation is triggered at most once per 500 ms of inactivity after the last keypress. In-flight requests are cancelled (AbortController) when a new debounce fires.

**Gallery:** Template list is a standard `useQuery` with `staleTime: 60_000`. No pagination in MVP (PRD does not specify a template count limit; assume < 20 per workspace).

---

## 11. Implementation Sequencing

Tasks are ordered by dependency. Each is sized for a single PR.

| # | Task | Size | Notes |
|---|---|---|---|
| 1 | Add `customTemplates` to `FEATURE_MINIMUM_PLAN` in `useFeatureGate.ts` and wire `TemplateGateGuard` shell | S | Unblocks all other work; no API needed yet |
| 2 | Build `TemplateGalleryPage` with loading/empty/error states against mock data | M | Use fixture JSON; real API hookup in task 5 |
| 3 | Build `TemplateUploadModal` with file validation and client-side size guard | S | No server call yet; validation only |
| 4 | Generate `processOutputTokens.json` build script | S | Requires `ProcessOutput` type to be stable |
| 5 | Wire gallery to real `GET /api/templates` + activate/deactivate/delete mutations | M | Blocked on API_SPEC.md |
| 6 | Build `TemplateEditor` with CodeMirror 6 (Markdown + Handlebars highlighting + token autocomplete) | L | Blocked on task 4; lazy-loaded |
| 7 | Build `TemplatePreviewPanel` with server-side render-preview integration and debounce | M | Blocked on render-preview endpoint (API_SPEC.md) |
| 8 | Wire `TemplateEditorPage` end-to-end (load draft, save, dirty-flag, unsaved-change guard) | M | Blocked on tasks 6, 7 |
| 9 | Integrate `userTemplates` prop + "Custom" button into `SOPTab.tsx`, `SOPPageShell.tsx`, `WorkflowTab.tsx` | M | Blocked on `template_sop_custom` artifact being returned from API |
| 10 | Add `TemplateFallbackNotice` to `SOPPageShell.tsx` and `WorkflowTab.tsx` | S | Blocked on backend fallback_reason field in artifact metadata |
| 11 | Accessibility audit pass (keyboard nav, ARIA live region, screen-reader test) | S | Last step before QA hand-off |

---

## 12. Risks and Dependencies

**Blockers — build cannot start until these are resolved:**

- `API_SPEC.md` is not yet written (PRD section 10). The frontend is blocked on: endpoint shapes for `POST /api/templates`, `GET /api/templates`, `PATCH /api/templates/[id]`, `DELETE /api/templates/[id]`, and `POST /api/templates/[id]/render-preview`. The response envelope must follow the repo standard `{ data, error, meta }`.
- `ARCHITECTURE.md` is not yet written (PRD section 10). The frontend needs to know: where templates are stored (DB row vs. blob), what `template_sop_custom` artifact metadata looks like (does it carry `fallback_reason`?), and whether `WorkflowArtifact` rows include a template reference ID.
- `UserTemplateSchema v1` must be published before the upload validation logic and the `processOutputTokens.json` build script can be written. The schema defines the valid token paths.
- `customTemplates` FeatureKey must be added to `plans.ts` by the backend engineer before the gate guard can be fully wired.

**Risks requiring UX input before build:**

- The unsaved-change warning for in-app navigation in Next.js 14 App Router does not have an official interception API equivalent to `router.beforePopState` from the Pages Router. The UX designer should confirm whether a route-change warning dialog is required or whether autosave on blur is acceptable (which would eliminate the need for the warning entirely).
- The PRD defers "multiple active templates per type" to P1. The format switcher integration plan (one additional button per type) is designed to extend to multiple without a structural rework, but the UX designer should confirm the intended gallery affordance if multiple templates are ever active simultaneously.

**Backend gaps discovered during design:**

- The `artifacts` array returned by `GET /api/workflows/[id]` must include `template_sop_custom` and `template_process_map_custom` as valid `artifactType` values for the format switcher integration to work. The page already reads the full artifacts array, so no new API call is needed — but the backend must persist these artifact types.
- Fallback behavior (PRD P0.6) requires the backend to set a `fallback_reason` field in artifact metadata. This field name must be confirmed in `API_SPEC.md` before `TemplateFallbackNotice` can be implemented.
