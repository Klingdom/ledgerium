# SOP as a Publishable Document — World-Class Documentation Benchmark

**Date:** 2026-06-15
**Author:** docs-engineer
**Scope:** Read-only audit of `apps/web-app/src/components/sop-view/`, `packages/process-engine/src/sopBuilder.ts`, `packages/process-engine/src/types.ts`, `packages/process-engine/src/templates/markdownRenderer.ts`, and `docs/features/process-mapping/finalize/SOP_DISPLAY_REVIEW.md`. No code changes proposed. Downstream input for `frontend-engineer`.

---

## 1. Capability Matrix: Ledgerium SOP vs. World-Class Tools

The five reference tools are evaluated against the dimensions that determine whether a generated SOP is fit for stakeholder distribution, team training, and compliance submission. Each row states what the tool delivers and what the evidence source is.

### Reference tools

**Scribe** (scribe.how): Browser extension that auto-captures one screenshot per click, generating a step-by-step guide with element highlights. Exports to PDF, HTML, and embeds into Confluence/Notion via native integrations. Launched 2022; $75M Series C (November 2025 per competitive-researcher evidence in `WORKFLOWS_DASHBOARD_REVIEW_002.md`).

**Tango** (tango.us): Screenshot-first guide generator with in-app editing (crop, blur, callout overlays). Exports to PDF and shares via Tango public URL or iframe embed. No analytical layer.

**Document360** (document360.com): Structured knowledge-base and SOP publishing platform. Full version history, approval workflows, role-gated publishing, multi-format export (PDF, HTML, Markdown), and integrations with Slack, Zendesk, and Intercom. Designed for documentation teams, not individual workers.

**Confluence** (atlassian.com): Wiki/documentation platform. SOPs are authored as pages with rich formatting, inline images, tables, and attachments. Page history tracks every edit. Published pages can be sent to Confluence by Scribe, Tango, and Document360 via native integrations.

**SweetProcess** (sweetprocess.com): Dedicated SOP authoring and management tool with explicit procedure titles, purpose, role-per-step, image attachments per step, date-stamped version history, and an approval/publish workflow. Designed for operations teams.

---

### Capability matrix

| Capability | Scribe | Tango | Document360 | SweetProcess | Ledgerium (current) | Gap level |
|---|---|---|---|---|---|---|
| **Auto-generation from real behavior** | Yes (click-by-click screen capture) | Yes (click-by-click screen capture) | No (manual authoring) | No (manual authoring) | Yes — deterministic derivation from extension events via `buildSOP()` | Ledgerium leads |
| **Screenshot per step** | Yes — one per click, with element highlight overlay | Yes — one per click, with crop/blur/callout editing | No — author must manually attach images | Yes — manual image attachment per step | No — zero screenshots displayed anywhere in the SOP view | **Critical gap** |
| **Page URL / application context per step** | Yes — URL shown in thumbnail caption | Yes — page title shown in step header | No | No | Stored in `SOPInstruction.sourceEventId` → `CanonicalEventInput.page_context.pageTitle` and `applicationLabel`, but never rendered | **Critical gap** |
| **Role / actor per step** | No | No | Author-defined | Yes — explicit "Who does this" field per step | `SOPViewStep.actor` populated from inferred roles; never rendered in any step card | Gap |
| **Version history** | No | No | Full date-stamped revision history with diff view | Date-stamped versions; previous versions are viewable | `metadata.version` hard-coded to engine schema version "2.0"; `metadata.createdAt` exists but not rendered | Gap |
| **Approval / publish workflow** | No | No | Yes — draft → review → approved → published states | Yes — explicit approve-before-publish step | No — no approval or publish state in the SOP model or UI | Gap |
| **Export: PDF** | Yes — one-click, screenshots embedded, print-ready | Yes — one-click | Yes | Yes | No — `SOPPageShell` has a Printer icon wired to nothing; no `@media print` stylesheet | **Critical gap** |
| **Export: HTML** | Yes — shareable public link renders as styled HTML | Yes — Tango public URL | Yes — hosted knowledge-base page | Yes — published procedure URL | No — the SOP tab is behind auth; no public HTML render | Gap |
| **Export: Markdown** | No | No | No | No | Yes — `renderSOPMarkdown()` in `markdownRenderer.ts` produces clean Markdown via `handleExportMarkdown` in `SOPPageShell` | Ledgerium leads |
| **Export: embed (iframe)** | Yes — embed code for Confluence/Notion/website | Yes — embed URL | Yes — embed snippet | No | No | Gap |
| **Push to Confluence** | Yes — native integration | Yes — native integration | Yes — native integration | No | No | Gap |
| **Push to Notion** | Yes — native integration | Yes — native integration | Yes — native integration | No | No | Gap |
| **Push to Slack** | Yes — share link sends rich preview | No | Yes — integration | No | No | Gap |
| **Branding / logo on export** | Scribe branding on free; custom on paid | Tango branding on free; custom on paid | Customer logo/colors on all tiers | Customer logo on PDF | No — Markdown export has no logo or header branding; "Generated by Ledgerium AI" footer only | Gap |
| **Search within SOP** | Via hosting platform (Confluence/Notion) | Via hosting platform | Yes — full-text search in Document360 | Yes — procedure library search | No — the SOP tab has no in-page search | Gap |
| **Friction / bottleneck indicators** | No | No | No | No | Yes — `frictionIndicators` per step, `frictionSummary` aggregate, Intelligence mode recommendations | Ledgerium leads |
| **Confidence / quality scoring** | No | No | No | No | Yes — `metadata.confidence`, step-level `confidence`, `qualityIndicators`, `qualityAdvisory` | Ledgerium leads |
| **Decision point detection** | No — linear list only | No | Author-defined | Author-defined | Yes — `isDecisionPoint`, `decisionLabel`, inline decision blocks in Execution mode | Ledgerium leads |
| **Multi-run variance / process variants** | No | No | No | No | Yes — `ProcessDefinition.variantCount`, `sequenceStability`, drift score via `analyzeSopAlignment()` (computed but not yet surfaced in SOP tab) | Ledgerium leads (compute present; display gap) |
| **SOP-only share link** | Yes — public Scribe link shows only the guide | Yes | Yes | Yes | No — workflow Share button shares the full workflow detail view (process map + report + SOP tab) | Gap |
| **Interactive completion checklist** | No | No | No | No | Yes — `CompletionSection` with toggling checkboxes and "All criteria met" state | Ledgerium leads |
| **Alignment / drift detection** | No | No | No | No | Computed by `analyzeSopAlignment()` / `computeDocumentationDriftScore()` in intelligence engine; stored in `PortfolioIntelligence`; not rendered in SOP tab | Ledgerium leads (compute present; display gap) |

### What this matrix means for the product position

Ledgerium leads on every analytical dimension that matters for process intelligence: confidence, friction, variants, decisions, drift detection. Ledgerium is behind on every distribution dimension that matters for adoption: screenshots per step, PDF export, public share link, Confluence push, and version display. The product earns the analytical lead from real observed data. It loses the distribution race because the SOP never leaves the platform in a form that non-Ledgerium users can consume. A user who generates a valuable SOP in Ledgerium and then needs to email it to a colleague, put it in their company wiki, or include it in a training document currently has one option: copy-paste from a Markdown file. Scribe's user experience for that same need is: click "Export to PDF", done.

---

## 2. The Screenshots Gap

### What the engine has

Every `SOPInstruction` in `packages/process-engine/src/types.ts` carries `sourceEventId` (line 348 in the engine types). That ID maps to a `CanonicalEventInput` record, which carries:

- `page_context.pageTitle` — the document title of the page at the moment of the event (e.g., "Opportunities — Salesforce")
- `page_context.applicationLabel` — the human-readable application name inferred from the domain (e.g., "Salesforce")
- `page_context.url` — the full URL at event time
- `page_context.routeTemplate` — the normalized URL pattern (e.g., `/opportunities/:id`)
- `target_summary.label` — the UI element label the user interacted with (e.g., "Save button", "Account Name field")
- `t_wall` — the ISO timestamp of the event

This is richer evidence than Scribe captures per step. Scribe captures a screenshot. Ledgerium captures the page identity (title + app), the element identity (label + role), the timestamp, and the event type. Scribe does not know whether the click was on a "Save" button or a navigation link. Ledgerium knows both.

### Why no screenshots are displayed

The extension does not capture screenshots. The Extension Reliability Invariant (CLAUDE.md, 2026-05-28) states: "It MUST continue to capture user behavior events end-to-end at all times." The invariant applies to the `RAW_EVENT_CAPTURED` message bus path and the `normalizeRawEvent()` → `liveBuilder.processEvent()` → `store.appendEvent()` pipeline. Adding screenshot capture to the extension would require:

1. Adding `chrome.tabs.captureVisibleTab()` calls in the content or background script — a new MV3 API call that does not currently exist in the extension.
2. Adding `tabs` to `manifest.json` permissions if not already present — a forbidden silent change per the Extension Reliability Invariant.
3. Handling the significant storage and privacy implications of storing full-page screenshots per event.

This is not a zero-cost addition. It is a new extension capability that requires explicit CEO approval under the Extension Reliability Invariant hard rules. Any new capture must pass the real-extension validation gate (`playwright.real-ext.config.ts` + `e2e/real-extension/sidepanel-real.spec.ts`) before shipping.

### What is honest near-term without new screenshot capture

The evidence signals already in the data can produce a meaningful "evidence snippet" per step without any extension changes. The near-term version is a structured provenance line inside each expanded step card:

> **In Salesforce · Opportunities · /opportunities/:id**
> Action: Click on "Save" button
> Observed 7 times · Last: 2026-05-14

This is built entirely from:

- `SOPInstruction.system` → application name
- `CanonicalEventInput.page_context.pageTitle` → page title (reachable via `sourceEventId` → `eventById.get(id)`)
- `CanonicalEventInput.page_context.routeTemplate` → normalized route
- `SOPInstruction.targetLabel` → the element label
- `DerivedStepInput.source_event_ids.length` → rough proxy for observation count
- `SOPInstruction.system` and `CanonicalEventInput.t_wall` → timestamp

The `sopViewModel.ts` adapter builds `SOPViewInstruction` from `SOPInstruction` but strips the `sourceEventId` (the field is in `SOPInstruction` type but not copied to `SOPViewInstruction`). Adding it to `SOPViewInstruction` and passing the relevant `page_context` fields through the adapter is the engineering path. No extension changes required.

### What true per-step screenshots would require

For a Scribe-parity screenshot experience:

1. The extension must call `chrome.tabs.captureVisibleTab()` at the moment of each user event (click, input, navigation).
2. The captured image must be stored — either locally in `chrome.storage.local` (impractical for more than a few events due to storage limits) or uploaded immediately to S3/MinIO.
3. Each screenshot must be linked to a `CanonicalEventInput` via `sourceEventId`.
4. The SOP display must retrieve and render the screenshot for each instruction using the `sourceEventId` linkage.

This is a substantial engineering effort touching both the extension (capture) and the backend (storage, retrieval). It is the right long-term direction and would close the most significant gap against Scribe and Tango. It should be treated as a separate feature program, not a quick addition, and must go through the Extension Reliability Invariant pre-change verification gate before any implementation work begins.

The honest near-term sequence is:

1. **Now (no extension changes):** Render the page title, application name, route template, and target label per step from already-stored data. This makes the evidence moat visible without capturing anything new.
2. **Medium term (extension change gated by CEO approval and real-ext validation):** Add thumbnail capture via `captureVisibleTab()`, linked per event to S3. Render thumbnails in the SOP at 320×200 inline per step.
3. **Long term:** Add element highlight overlay (red box on the clicked element) in the thumbnail, matching Scribe's visual convention.

---

## 3. Export and Publish Strategy

### Current state

The SOP currently exports one format: Markdown. `renderSOPMarkdown()` in `markdownRenderer.ts` supports three template types — `operator_centric`, `enterprise`, and `decision_based` — and produces clean, readable Markdown with numbered steps, bold actors, confidence glyphs, evidence event lines, and a provenance footer. The export is initiated from `SOPPageShell`. This is a genuine strength: the Markdown is well-structured and would render correctly in GitHub, VS Code, Obsidian, and any Markdown viewer.

What the Markdown export lacks:
- Per-step screenshots (no image paths to reference — images don't exist yet)
- Ledgerium logo or header branding in the output
- A "Generated on" date line at the document top (the footer has `generatedAt` but it is the session start time, not the export date)
- Version number visible in the first page (it is in the Markdown body for Enterprise template; not in Operator or Decision templates)

### Priority 1: PDF export

PDF is the stakeholder deliverable. When a manager, auditor, compliance officer, or trainer receives an SOP, they receive a PDF. No other format is accepted as a formal procedure document in most organizations. Scribe's single biggest adoption driver is its one-click PDF export: the SOP is immediately shippable to anyone who has never heard of Scribe.

The fastest path to PDF for Ledgerium is browser print-to-PDF via `window.print()`. The Printer icon is already imported in `SOPPageShell` via lucide-react but is not wired to anything. The missing piece is a `@media print` stylesheet that:

- Expands all collapsed step cards (`display: block !important` on the expanded body)
- Hides navigation, the mode switcher tab rail, the share button, the export button, and the step-rail sidebar
- Applies print-safe font sizes (minimum 11pt body, 14pt step headings)
- Removes background colors and gradients (or converts them to print-safe equivalents)
- Sets page margins to 1 inch
- Adds a print header with the SOP title and "Generated by Ledgerium AI · [date]"
- Adds page numbers via CSS `counter(page)`

This does not require any backend work and adds no new dependencies. It produces a PDF that looks like the web UI, screenshot-free, which is still a dramatic improvement over the current Markdown export for most recipients.

The Export button label should be changed from unlabeled (icon only) to "Export Markdown" to distinguish it from the forthcoming "Print / PDF" button.

### Priority 2: HTML embed and public SOP link

An embeddable SOP — an iframe that can be dropped into Confluence, Notion, or a company intranet — is the second-highest distribution win. The mechanism requires a public-facing SOP URL that renders without requiring a Ledgerium login.

The workflow-level Share button in `page.tsx` already creates a share token and a shareable URL. The shared URL goes to the full workflow detail view. Adding a `?view=sop` query parameter that deep-links to the SOP tab is a minimal change. A `?embed=true` parameter could strip the navigation shell and render only the SOP content for iframe use.

This creates the `<iframe src="https://app.ledgerium.ai/share/{token}?view=sop&embed=true" width="100%" height="800"></iframe>` embed pattern that Document360, Scribe, and Tango all support.

### Priority 3: Confluence and Notion push

Confluence push via Atlassian's REST API (POST to `/wiki/rest/api/content`) accepts HTML or Confluence storage format. The Markdown output from `renderSOPMarkdown()` could be converted to Confluence storage format via a simple serializer, or the HTML render of the SOP page could be POSTed directly. The user would need to provide a Confluence API token and space key — a settings-level integration, not a per-export credential entry.

Notion push via Notion's public API (POST to `/v1/pages`) accepts Notion block format. Conversion from the SOP's structured data model (which is already hierarchical: metadata → steps → instructions) is cleaner than Markdown-to-Notion conversion.

Both are valid medium-term integrations. Confluence is the higher-priority target because enterprise process teams use Confluence as the canonical home for SOPs and policies. A Ledgerium SOP that can be pushed to Confluence with one click competes directly with Scribe's most-used feature.

### Priority 4: Structured JSON export as a developer surface

The workflow detail page in `page.tsx` already exports raw JSON via `handleExport('sop')`. This is the complete `SOP` object from the process engine. It is not human-readable but it is the most information-rich export. Documenting this format and making it accessible as a first-class export ("Export JSON (developer)") would enable API-based integrations — pushing to custom internal systems, feeding into LLM pipelines, or integrating with process mining tools.

### Export format roadmap

| Format | Effort | Audience | Priority |
|---|---|---|---|
| Print / PDF (via browser print) | Low — CSS-only | Managers, compliance, training teams | P0 |
| Markdown (already shipped) | — | Technical teams, GitHub, Obsidian | Current |
| SOP-only public share link | Low — URL routing | Anyone the user shares with | P0 |
| HTML embed (iframe) | Medium — public render route | Confluence/Notion/intranet editors | P1 |
| Confluence push (REST API) | Medium — integration + auth | Enterprise teams on Confluence | P1 |
| Notion push (API) | Medium | Notion-native teams | P2 |
| JSON (documented developer export) | Low — labeling only | Developers, integrators | P2 |
| Branded PDF (server-side, with Ledgerium logo) | High — server-side rendering | Enterprise / compliance customers | P2 |

---

## 4. Versioning and Freshness

### Current state

`SOPMetadata.version` is set to the engine schema version (`rawSop.version ?? '1.0'`), which in practice is always "2.0" (the value hard-coded in `buildSOP()` at `version: '2.0'`). This is an engine schema version, not a human revision number. A user reading "v2.0" on an SOP cannot determine whether this is the first version of this SOP or the twentieth. `metadata.createdAt` holds the session start time but is never rendered anywhere in the SOP view.

The `SOPEnterpriseData.revisionMetadata` field exists and is rendered in the Enterprise Markdown template as `Generated: [date] · Engine: [version] · Source: [recording]`. This is good metadata in the Markdown export but has no display counterpart in the web UI.

### What world-class tools do

**Document360** maintains a full version history for every article: date, editor, summary of changes. Any version can be restored. A "Version N" badge appears on the published article. The current version has an explicit "Approved by [name] on [date]" line.

**SweetProcess** shows the procedure's "Last edited" date prominently at the top of every procedure. Each revision is date-stamped. The procedure has an explicit status: Draft, Active, or Archived. The "Active" status means it has been approved for use; "Draft" means it has not.

**Confluence** shows "Last edited by [user] [date]" on every page. Page history shows every change in a diff view.

### What Ledgerium needs

Ledgerium's versioning model is fundamentally different from the above tools, because the SOP does not change when a human edits it — it changes when a new recording is processed. This is the correct model, but it needs to be made visible. The version display should communicate:

1. **When this SOP was generated** — the session date, not the engine version number.
2. **How many recordings it is based on** — the run count from the workflow record.
3. **When the most recent recording was processed** — the `workflowRecord.createdAt` or the latest run timestamp.
4. **Whether the SOP is aligned with recent runs** — the drift score from `computeDocumentationDriftScore()` in the intelligence engine (currently computed but not surfaced in the SOP tab).

The specific elements to add to the SOP header and in the exported document:

**SOP header addition (web UI):**
```
SOP · v1.0 · Generated 2026-05-14 · Based on 3 recordings · 84% aligned
```

Where:
- "v1.0" is a human revision counter incremented each time the SOP is regenerated from a new batch of recordings (not the engine schema version)
- "Generated 2026-05-14" is `metadata.createdAt` formatted as a date
- "Based on 3 recordings" is the workflow's run count
- "84% aligned" is the drift/alignment score when available

**For single-recording SOPs:**
```
SOP · v1.0 · Generated 2026-05-14 · Based on 1 recording — review before distributing
```

The "review before distributing" label matches the audit-honesty principle from `SOP_DISPLAY_REVIEW.md` section 3.1.

**Approval / publish state (medium term):**

The SOP should support three explicit states: Draft (generated but not reviewed), Reviewed (a team member has confirmed accuracy), and Published (approved for distribution). This maps directly to SweetProcess's Draft/Active/Archived model. The state is stored at the workflow record level, not regenerated each time. The SOP header shows the state as a badge:

- Draft: amber badge "Draft — not approved for distribution"
- Reviewed: blue badge "Reviewed [date] by [user]"
- Published: green badge "Published [date]"

This is a backend concern (adding a `sopStatus` field to the workflow record) and a display concern (rendering the badge in `SOPHeader`). It requires no engine changes.

**In the Markdown export:**

The Operator Markdown template currently renders a metadata strip via `renderMetadataStrip()` that includes version and confidence but not the generation date or run count. The Enterprise template renders a full metadata table. Both should include "Generated on [date]" and "Based on [N] recording(s)" as standard header fields in every export format.

---

## 5. The 6–10 Highest-Impact Documentation Moves

The items below are ranked by impact on the SOP's ability to serve as a publishable, distributable, credible work instruction. Each is rated P0, P1, or P2 and characterized honestly against the capture boundary established in section 2.

---

### Move 1 — Print / PDF export via browser print (P0)

**What:** Wire the Printer icon in `SOPPageShell` to `window.print()`. Add a `@media print` stylesheet that expands all step cards, hides navigation elements, applies print-safe typography, and adds a header with the SOP title and generation date.

**Why P0:** PDF is the universal format for distributable work instructions. Every reference tool supports PDF. A manager, auditor, or trainer who receives a Ledgerium-generated SOP currently has no way to share it with anyone who does not have a Ledgerium account. The Markdown export is a workaround that requires technical knowledge to render. Print-to-PDF requires no backend work and no new dependencies. It is the single highest-leverage distribution improvement.

**Capture boundary:** Not applicable — no screenshots in the current PDF. The PDF will contain the text, structured layout, and confidence indicators, but no per-step visual evidence. This is honest and accurate for the current state. The export button copy "Print / Export as PDF" should set expectations correctly.

**Evidence:** Scribe's PDF export is its most-referenced feature in user reviews (G2, Capterra). SweetProcess shows "Export to PDF" as a first-class action on every procedure. Document360 generates PDF from its publishing layer.

---

### Move 2 — Evidence snippet per step from already-stored signals (P0)

**What:** Render a provenance line inside each expanded step card showing the page title, application name, and target label derived from `CanonicalEventInput.page_context` via the existing `sourceEventId` linkage. No extension changes. No new capture. No screenshots.

The display in `ExecutionStepCard` expanded body:

> Observed in **Salesforce · Opportunities**
> Action: Click "Save Opportunity"
> Route: /opportunities/:id

This requires adding `pageTitle`, `applicationLabel`, `routeTemplate`, and `targetLabel` from the first instruction's source event to `SOPViewInstruction` in `sopViewModel.ts`, and rendering them as a small provenance row in `ExecutionStepCard`.

**Why P0:** Without visible provenance, the Ledgerium SOP is indistinguishable from a manually authored SOP. The evidence moat is invisible. Every step claiming "observed from real behavior" is unverifiable by the reader. This is the minimum viable expression of the evidence-linked positioning. It costs nothing computationally (the data is already in the model) and requires no extension changes.

**Capture boundary:** This uses only data already stored in `CanonicalEventInput`. It does not add screenshot capture to the extension. The evidence snippet is a text description, not a visual thumbnail.

**Evidence:** `SOP_DISPLAY_REVIEW.md` section 2 identifies this as Ledgerium's moat. `PM_SOP_STRATEGY.md` states: "Making [evidence] visible is the single highest-leverage credibility move." The existing `SOP_DISPLAY_REVIEW.md` improvement 1 (P0) independently confirms this priority.

---

### Move 3 — Run-count and generation date in the SOP header (P0)

**What:** Add two fields to `SOPHeader`: (a) "Based on N recording(s)" where N is the workflow run count, and (b) "Generated [date]" formatted from `metadata.createdAt`. When N=1, add "— review before distributing" inline. Both fields belong in the header row alongside the existing version chip.

**Why P0:** A single-recording SOP should not be distributed without that disclosure. Presenting a one-recording SOP as if it represents a validated procedure violates the audit-honesty principle documented in `SOP_DISPLAY_REVIEW.md` section 3.1. The disclosure is also a trust signal: "Based on 12 recordings" is a stronger credibility claim than an unexplained "84% confidence" percentage.

**Capture boundary:** Not applicable. This is a metadata display change using data already in `workflowRecord` (passed to `SOPPageShell` and available in `buildSOPViewModel`).

**Evidence:** SweetProcess shows "Last edited [date]" prominently. Document360 shows article version and publication date on every page. The confidence percentage already displayed in the Ledgerium SOP header is meaningless without the run count that contextualizes it.

---

### Move 4 — SOP-only public share link (P0)

**What:** Add a "Share SOP" option to `SOPPageShell` that generates a share URL deep-linking to the SOP tab: `/share/{token}?view=sop`. The share token mechanism already exists in `page.tsx`. The query parameter selects the default active tab on the shared view.

**Why P0:** The SOP is the most shareable artifact Ledgerium produces. A manager who wants to share an operating procedure with their team, or a trainer who wants to include it in an onboarding pack, needs a link that goes directly to the SOP — not to the full workflow detail view with the process map, report tab, and raw JSON evidence. The current Share button shares everything. Sharing everything is inappropriate for operators who should not see the process analytics or the raw event data.

**Capture boundary:** Not applicable.

**Evidence:** Scribe's shareable link points to the guide only, not to any analytics or source data. Tango's share URL is the guide only. SweetProcess's published procedure URL goes to the procedure only. None of these tools expose their analytics to the procedure reader.

---

### Move 5 — Actor / role per step rendered in the SOP body (P1)

**What:** Add "Performed by: [actor]" as a labeled row inside each expanded `ExecutionStepCard`. The `SOPViewStep.actor` field is populated by `buildSOPViewModel` from the inferred roles. It is never rendered in the web UI or in the Operator Markdown template's step cards (the Enterprise template does render `Actor:` per step).

**Why P1:** Role per step is a basic requirement of any distributable work instruction. A procedure that does not tell the reader who does each step cannot be used for role assignment, delegation, or compliance auditing. SweetProcess makes "Who does this" a mandatory field per step. Trainual organizes all content by role first. The data is already in the model — the gap is display-only.

**Capture boundary:** Not applicable.

**Evidence:** `SOP_DISPLAY_REVIEW.md` section 1, row "Role / actor per step": "Weak — `SOPViewStep.actor` and `SOPViewStep.hasSensitiveData` exist... However, no actor label appears in any rendered step card in any view mode."

---

### Move 6 — Scope statement rendered in the Quick Start card (P1)

**What:** Add a "Scope" row to `QuickStartSection` in `SOPExecutionMode`, between "When To Use" and "Before You Begin". The text comes from `viewModel.metadata.scope`, which is populated by `generateScope(activityName, allSystems, roles)` in the engine. This field exists in the data model and in `SOPMetadata` but has no display slot in any view mode.

**Why P1:** The scope statement defines who this SOP applies to, which systems it covers, and what is out of scope. Without it, an operator reading the SOP cannot tell whether it applies to their role or their system configuration. `SOP_DISPLAY_REVIEW.md` section 3.5 identifies this as a gap and section 1 rates it "Missing (data exists, not rendered)." The Enterprise Markdown template does render `## Scope` — the web UI should match it.

**Capture boundary:** Not applicable.

---

### Move 7 — Version date and freshness display in header and all export formats (P1)

**What:** (a) Render `metadata.createdAt` as a formatted date in `SOPHeader` alongside the version chip. (b) Add an optional "Last reviewed" date field to the SOP model (stored at the workflow record level) that updates when a team member confirms the SOP is current. (c) Update the Operator and Decision Markdown templates to include "Generated on [date]" in the metadata strip at the top of the document, matching the Enterprise template's `renderEnterpriseMetadataTable()` output.

**Why P1:** A document without a date cannot be evaluated for freshness. "Is this SOP current?" is the first question any new reader asks. `SOP_DISPLAY_REVIEW.md` section 1, row "Version / date": "Weak — `metadata.version` shows 'v{version}' in the header. The version is always '2.0'... `metadata.createdAt` exists in the type but is not rendered."

**Capture boundary:** Not applicable.

**Evidence:** SweetProcess shows "Last edited" prominently. Document360 shows article version date. Confluence shows "Last edited by [user] [date]" on every page. All three treat the generation/edit date as required document metadata, not optional.

---

### Move 8 — "Ask This Process" panel replaced with honest coming-soon tile (P1)

**What:** In `SOPIntelligenceMode`, replace the disabled input field and greyed-out prompt buttons with a static informational tile: icon (Brain or MessageSquare), heading "AI Q&A for this process", body "Ask questions about any step, decision, or edge case — coming in an upcoming release." No interactive elements.

**Why P1:** The current panel looks like a broken feature: an input box with `cursor-not-allowed`, prompt suggestion buttons that do nothing, and a "Beta" label. A user encountering this assumes Ledgerium's AI assistant is temporarily down, not that it has not been built yet. This is an audit-honesty issue. `SOP_DISPLAY_REVIEW.md` section 3.4 flags it explicitly. The correct pattern — used in PresetChipRail for locked features — is a static tile with "Coming in an upcoming release" verbatim.

**Capture boundary:** Not applicable.

**Evidence:** `SOP_DISPLAY_REVIEW.md` section 4 (Improvement 8) and `PM_SOP_STRATEGY.md` section 1 both identify this as a honesty gap.

---

### Move 9 — Step-level inputs displayed in expanded step card (P1)

**What:** In `ExecutionStepCard` expanded body, add an "Inputs needed" row when `step.inputs` is non-empty, rendering the inputs as small chips. The `SOPViewStep.inputs` field is populated from `SOPStep.inputs` (derived from data entry events and sensitive field labels) but has no display slot in any view mode.

**Why P1:** "What do I need to have in hand before starting this step?" is a standard operator question. Data entry steps often require specific account IDs, form values, or credentials that must be sourced from another system. Displaying these as explicit input requirements reduces the chance of the operator stalling mid-procedure.

**Capture boundary:** Not applicable.

---

### Move 10 — Confidence chip with inline definition, and scope statement in Markdown exports (P2)

**What:** (a) Add a tooltip or `aria-describedby` to the confidence chip in `SOPHeader` that shows `metadata.confidenceLabel` on hover (e.g., "Well-defined steps — derived from consistent segmentation across observed events"). (b) Add the scope statement to the Operator and Decision Markdown templates, matching the Enterprise template's existing `## Scope` section.

**Why P2:** The confidence percentage displayed in the header is meaningless to a reader who does not know what it measures. `SOP_DISPLAY_REVIEW.md` section 3.2 flags this as an honesty gap. The tooltip is a minimal change (no layout impact) that makes the metric self-documenting. The scope statement in Markdown exports addresses the gap identified in section 3.5 of the same review — the scope is generated by the engine, included in the data model, rendered in the Enterprise Markdown template, but absent from the Operator and Decision templates that most users will receive.

**Capture boundary:** Not applicable.

---

## Summary table

| # | Move | Priority | Extension change? | What it closes |
|---|---|---|---|---|
| 1 | Print / PDF via browser print | P0 | No | Closes distribution gap vs. Scribe, SweetProcess, Document360 |
| 2 | Evidence snippet per step from stored signals | P0 | No | Makes evidence moat visible; differentiates from manually authored SOPs |
| 3 | Run count + generation date in header | P0 | No | Closes audit-honesty gap; contextualizes confidence score |
| 4 | SOP-only public share link | P0 | No | Closes distribution gap; enables sharing with non-Ledgerium users |
| 5 | Actor / role per step in expanded card | P1 | No | Closes basic work-instruction completeness gap |
| 6 | Scope statement in Quick Start card | P1 | No | Renders data that already exists in the model |
| 7 | Version date in header and all Markdown exports | P1 | No | Closes freshness/versioning gap vs. SweetProcess, Document360 |
| 8 | "Ask This Process" → honest coming-soon tile | P1 | No | Closes audit-honesty gap; removes appearance of broken feature |
| 9 | Step-level inputs in expanded card | P1 | No | Renders data that already exists in the model |
| 10 | Confidence tooltip + scope in Markdown exports | P2 | No | Honesty polish; Markdown export completeness |

**Deferred — requires Extension Reliability Invariant gating:**
- Per-step screenshot capture via `chrome.tabs.captureVisibleTab()`: requires explicit CEO approval, new extension permissions, storage architecture, and passing the real-extension validation gate before any implementation work begins. This is the right long-term move to match Scribe/Tango parity on visual evidence. It is not a near-term item.

---

## Open product gap flagged (not promoted to backlog)

No move on this list addresses the absence of human editing on generated steps. All five reference tools (Scribe, Tango, SweetProcess, Document360, Confluence) support step editing after generation or authoring. The current Ledgerium SOP is read-only. When a user rates the SOP as "Major rework" via the `SOPUsefulnessSurvey`, they have no in-product path to correct a wrong step label, delete an irrelevant step, or add a step the engine missed. This is the most common reason SOP auto-generation tools lose adoption: operators trust the tool on first use and distrust it permanently when one generated step is wrong and there is no correction path. This gap is outside the scope of this documentation benchmark review and is flagged for the coordinator.

---

*All findings in this document are based on direct reading of the shipped source files listed in the scope header. No speculative capabilities have been attributed. Competitive claims cite public documentation and shipping features of the named tools as of 2026-06-15.*
