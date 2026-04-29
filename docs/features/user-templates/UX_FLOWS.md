# UX Flows — User-Uploaded Workflow and SOP Templates

**Version:** 1.0
**Date:** 2026-04-18
**Status:** Design draft — pending architect sign-off on Handlebars binding contract
**Scope:** MVP only. Stretch items are explicitly called out.

---

## 1. Primary User Journey

**Trigger:** Dana has recorded five workflows. The generated SOPs use Ledgerium's Operator format. Her company requires a Confluence-compatible heading structure with a mandatory "Owner" field and a revision table. The built-in formats don't match.

**Moment 1 — Friction:** Dana exports a SOP from the SOP tab, pastes it into Confluence, and spends 15 minutes reformatting it. She does this for the third time.

**Moment 2 — Discovery:** She notices "Manage Templates" in Settings > Templates. A banner on the SOP tab's format switcher also reads "Using built-in formats — add your own in Settings."

**Moment 3 — Upload:** She opens Settings > Templates, clicks "New SOP Template," pastes her Confluence-structured Markdown with `{{title}}`, `{{steps}}`, and `{{owner}}` tokens, sees a live preview against her most recent recording, fixes one token mismatch flagged by the validator, and saves.

**Moment 4 — Apply:** She sets the new template as her default SOP template. The next time she opens any recording's SOP tab, her format is active. The format switcher shows her template alongside the three built-in options.

**Moment 5 — Value confirmed:** She exports the SOP, pastes it into Confluence. Zero reformatting required.

**Key value moments:** The live preview (seeing real data, not lorem ipsum) and the default-template setting (zero per-recording overhead going forward) are the two moments where the feature earns retention.

---

## 2. Entry Points

Ranked by discoverability vs. friction:

**Rank 1 — Settings > Templates (primary home)**
Path: top-nav avatar menu → Settings → Templates tab. This is the management surface. All CRUD lives here. A user who is actively looking for template customization will navigate here. Landing page shows the template gallery with built-in templates listed (read-only) and a prominent "New Template" button.

**Rank 2 — SOP tab format switcher (contextual nudge)**
The format switcher row in `SOPTab.tsx` (the `Format` pill group) gains a trailing `+` icon button labeled "Add template." This is the highest-traffic discovery surface because it appears when the user is already feeling the format mismatch. Clicking it deep-links into Settings > Templates > New with the template type (SOP or Process Map) pre-selected.

**Rank 3 — Export success state (reactive nudge)**
After a successful Markdown export from `SOPPageShell.tsx`, a one-time tooltip reads: "Exported in Operator format. Want to use your own structure? Add a template." Appears once per user, not per export.

**Rank 4 — Empty state on first open of Settings > Templates**
If the user navigates to Settings > Templates before discovering it contextually, an illustrated empty state explains the feature in two sentences and surfaces the primary CTA.

---

## 3. Upload Flow — MVP Path

**Decision: Paste Markdown-with-tokens into a code editor.**

Rationale: File upload is a two-step operation (pick file, review content) with no preview benefit over paste. URL import adds an unscoped fetch dependency. Clone-and-edit is only useful after a user already has a custom template. Paste-first means the user is looking at their template immediately, which is required for the preview to be useful. File upload can be added as a secondary option in the same modal once the paste path is validated.

**Steps:**

1. User clicks "New SOP Template" (or "New Process Map Template") in Settings > Templates, or clicks the `+` in the format switcher.
2. A full-screen modal opens (not a drawer — the editor and preview need horizontal space).
3. Modal layout: left pane = code editor (60% width), right pane = live preview (40% width).
4. Left pane has a name field at top ("Template name — required") and the code editor below it.
5. User types or pastes Markdown containing `{{token_name}}` bindings.
6. Right pane updates on a 400ms debounce against the most recent recording the user has access to (or a synthetic sample if no recordings exist yet).
7. Validation runs inline — binding errors appear as inline annotations on the affected line and in a summary panel below the editor.
8. User clicks "Save Template."
9. A confirmation step asks: "Set as your default for [SOP / Process Map] templates?" with Yes / Not yet options.
10. Template becomes available immediately in the format switcher on all recordings.

**Assumption for architect:** Handlebars-style `{{token}}` is the binding syntax. Dot notation for nested paths is required: `{{processDefinition.title}}`, `{{steps.0.action}}`. Array iteration uses `{{#each steps}}...{{/each}}`. This needs arch confirmation before build.

---

## 4. Template Editor

The editor is a code editor, not a rich text editor. It must:

- Syntax-highlight Markdown (headings, bold, lists, code blocks)
- Highlight `{{tokens}}` in a distinct color (amber, distinct from Markdown syntax)
- Provide token autocomplete: typing `{{` opens a dropdown of valid `ProcessOutput` binding paths, searchable by name. Selecting inserts the full path.
- Show inline red underlines on unrecognized tokens with a tooltip: "Unknown binding — this field is not in ProcessOutput. Check spelling."
- Show inline amber underlines on valid but nullable tokens with tooltip: "This field may be empty for some recordings."
- The right pane live preview renders the template as HTML (same styling as the `ds-document` class used in `SOPTab.tsx`) using real data from the sample recording.
- Below the editor: a "Bindings inspector" collapsible panel listing all detected `{{tokens}}` with their resolution status (green = resolved, red = unknown, amber = nullable).

The editor does NOT need: version history, multiple files, git integration, or collaborative editing (all stretch).

---

## 5. Preview and Apply Flow

**Preview (inside the editor modal):**
The right pane renders a live preview on every keystroke (debounced 400ms). A "Preview recording" dropdown at the top of the right pane lets the user switch between their last 5 recordings. The default is the most recent recording. If no recordings exist, a synthetic fixture is used with a "Sample data — record a workflow to preview with real data" label.

A toggle at the top of the right pane switches between "Rendered" (HTML view) and "Raw" (the Markdown output as a string). This lets users verify the export will paste correctly.

**Apply controls:**
- Primary: "Save Template" button at top-right of modal. Disabled until the template has a name and zero red-underline (unrecognized) binding errors.
- On save: "Set as default?" confirmation (described in section 3, step 9).
- Secondary: "Save as draft" — saves the template in a Draft state, not available in the format switcher, visible only in Settings > Templates.

**Where apply lives in the recording view:**
In the format switcher in `SOPTab.tsx` and `WorkflowTab.tsx`, the user's custom templates appear after the built-in options, separated by a thin divider. The currently active template has a filled dot indicator. The default template has a star badge (matching the existing `Sparkles` icon pattern already used in `SOPTab.tsx`).

---

## 6. Template Gallery and Management

**Location:** Settings > Templates. Two sub-tabs: "SOP Templates" and "Process Map Templates."

**Layout (per tab):**

```
[ Built-in templates ]
  ┌─────────────────────────────────────────────────────┐
  │  Operator-Centric   [Default ★]   [Preview]         │
  │  Enterprise                        [Preview]         │
  │  Decision-Based                    [Preview]         │
  └─────────────────────────────────────────────────────┘

[ Your templates ]
  ┌─────────────────────────────────────────────────────┐
  │  Confluence SOP    [Default ★]  [Edit] [Duplicate] [Delete]  │
  └─────────────────────────────────────────────────────┘

  [ + New SOP Template ]
```

**Built-in templates** are read-only. "Preview" opens the editor modal in read-only mode so the user can inspect the token structure (useful for cloning, which is stretch).

**Custom templates** show: name, default badge if active, last modified date, Edit / Duplicate / Delete actions.

**Naming:** Template name is a plain text field, max 40 characters, required. No slugs visible to the user.

**Deleting:** If the template being deleted is the current default, the system automatically reverts to the appropriate built-in default (operator_centric for SOP, swimlane for process map) and shows an inline notice: "Reverted to Operator-Centric as your default."

**Duplicate (stretch):** Creates a copy with name "Copy of [original name]" and opens the editor. Not in MVP.

**Clone from built-in (stretch):** "Duplicate" on a built-in template copies its Markdown source into a new custom template. Not in MVP because the built-in templates are rendered by TypeScript functions, not stored Markdown. This requires architect work to expose a canonical Markdown export of each built-in template.

---

## 7. Applying a Template to a Recording

**Default behavior:** The user's active default template applies to every recording automatically. No per-recording selection is required. This is the zero-friction path.

**Per-recording override:** In the format switcher on `SOPTab.tsx` / `WorkflowTab.tsx`, the user can switch to any available template (built-in or custom) for the current recording. This selection is not persisted across sessions in MVP — it resets to the default on next load.

**Template break — missing bindings:**
When a custom template is applied to a recording and one or more bindings resolve to null/undefined, the rendered output replaces the token with a visible placeholder: `[missing: steps.0.action]` styled in amber. The format switcher shows an amber warning dot next to the template name. A tooltip on the dot reads: "Some fields are empty for this recording — see bindings below." The SOP is still rendered and usable; it is not blocked.

**Template break — syntax error (invalid Handlebars):**
The render fails entirely. The content area shows: "Template could not be rendered — syntax error on line N. [Open template editor]." The raw built-in view is not automatically substituted, because substituting silently would obscure the error.

---

## 8. Sharing

**Not in MVP.** Explicit non-goal.

Rationale: Template sharing requires a template registry, access controls, version management, and discovery UI. These are non-trivial and not required for the primary user value. The MVP goal is one user, one workspace, own templates apply to own recordings.

Stretch path: A "Copy share link" action on a custom template that generates a one-time import URL. The recipient opens the URL, sees a preview modal, and clicks "Add to my templates." No accounts are linked.

---

## 9. Error States

**Malformed template (syntax error on save):**
The "Save Template" button remains disabled. An error banner at the bottom of the editor reads: "Template has syntax errors — fix highlighted lines before saving." Affected lines have red left-border indicators. The user cannot accidentally save a broken template.

**Missing required bindings on save:**
Warning (not blocking). A modal dialog: "This template references bindings that could not be resolved: `{{owner}}`. Save anyway?" Options: "Save anyway" / "Go back and fix." Saves in a Draft state if user confirms. Available in the format switcher with an amber warning badge.

**Render failure on recording view:**
Described in section 7. Inline error message in the content area, link to template editor, no silent fallback.

**Plan-tier lockout:**
If custom templates are a paid feature and the user is on a free plan, the "+ New Template" button is present but clicking it opens an upgrade prompt: "Custom templates are available on the Pro plan. You're currently on Free. [Upgrade] [Learn more]." The built-in templates remain fully accessible.

**File too large (if file upload is added in a later iteration):**
Inline error below the file input: "Template file must be under 50 KB. This file is [X] KB." The paste path has no file size UI concern; backend validates template string length (suggested limit: 20,000 characters) and returns a 400 with a clear message.

**Network error on save:**
Toast notification at bottom of screen: "Could not save template — check your connection and try again." The editor content is preserved in local state; the user does not lose their work.

---

## 10. Empty States

**New user, Settings > Templates, no custom templates yet:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   Your templates                                         │
│                                                          │
│   Use your own Markdown structure for every SOP          │
│   and process map you export. Templates use              │
│   {{tokens}} that bind to your recorded workflow data.   │
│                                                          │
│   [ + Create your first SOP template ]                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Built-in templates are still listed above this panel and are fully functional.

**New workflow with no custom templates (format switcher):**
No change to existing UI. The format switcher shows only the three built-in options. The trailing `+` icon persists as the discovery point.

**User has custom templates but none have been applied to the current recording (first time seeing a custom template applied):**
No special state required. The template renders normally. If the user set a default, it auto-applies. If not, they manually select it from the switcher.

---

## 11. Accessibility Notes

**Keyboard navigation:**
- The template gallery list items (Settings > Templates) must be navigable with Tab and actionable with Enter/Space.
- The code editor must support Tab key for indentation. Tab should not trap focus; pressing Escape then Tab must move focus out of the editor.
- The format switcher buttons in `SOPTab.tsx` and `WorkflowTab.tsx` already use `<button>` elements — custom templates append to the same structure and inherit the existing keyboard behavior.
- Modal (editor): focus must be trapped inside the modal while open. Close button (Escape key or X button) must return focus to the triggering element.

**Screen reader affordances:**
- Custom templates in the format switcher must have `aria-label` that includes the template name: `aria-label="Confluence SOP template"`.
- The "default" badge should include screen-reader text: `<span aria-label="Default template">★</span>`.
- Validation errors in the editor must be associated with the editor region via `aria-describedby` so screen readers announce error count on focus.
- The live preview pane should have `aria-live="polite"` so that screen readers announce when the preview updates (debounced to avoid noise).

**Color-blind safe indicators:**
- Binding status in the inspector uses color (green / amber / red) plus a text label and icon: a checkmark for resolved, a warning triangle for nullable, an X for unknown. Color is never the sole indicator.
- The amber warning dot on a broken template in the format switcher must also use a `!` text character inside the dot, not just color.

---

## Implementation Notes for Engineering

- New UI plugs into the existing format switcher in `SOPTab.tsx` (the `<div className="flex rounded-ds-md border...">` block, lines 49-78) and `WorkflowTab.tsx` (the parallel block, lines 75-111). Custom templates append after the built-in buttons, separated by a `<div role="separator">`.
- The template editor modal is a new component. Suggested path: `apps/web-app/src/components/templates/TemplateEditorModal.tsx`.
- Template management page: `apps/web-app/src/app/settings/templates/page.tsx`.
- Token autocomplete requires a static export of `ProcessOutput` field paths. Suggested: generate a JSON manifest at build time from the TypeScript types in `packages/process-engine/src/`.
- The Handlebars binding contract (token syntax, array iteration, nullable handling) must be agreed with the architect before the editor's autocomplete and validator are built. This is the primary pre-build dependency.
