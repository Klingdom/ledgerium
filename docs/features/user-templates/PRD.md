# PRD: User-Uploaded Workflow and SOP Templates

**Feature:** Custom Template Upload  
**Author:** PM Agent  
**Date:** 2026-04-18  
**Status:** Draft — awaiting architect + UX review

---

## 1. Problem & Opportunity

Ledgerium ships six hardcoded templates (three SOP: `operator_centric`, `enterprise`, `decision_based`; three process map: `swimlane`, `bpmn_informed`, `sipoc_high_level`) as TypeScript renderers. These cover generic use cases well but do not accommodate the structural conventions teams already follow — ISO-formatted SOPs, company-branded process maps, compliance-specific layouts, or outputs that match an organization's internal documentation standard. When the rendered output does not match what a team expects, they either reformat manually (wasted effort) or do not use the output (zero value). The gap between "what Ledgerium renders" and "what teams actually file" is the conversion loss this feature addresses.

---

## 2. Primary Personas

**Primary — Process Documentation Lead (Operations or Quality)**  
Mid-market or enterprise organization (50–500 employees). Owns the internal SOP library. Already has a company-approved template format. Currently exports Ledgerium output, reformats it in Word or Notion, then files it. Pain: every recording creates manual reformatting work. Buying context: will advocate for Growth or enterprise tier if the output requires zero post-processing.

**Secondary — Compliance Officer / Quality Manager**  
Regulated industry (healthcare ops, fintech, manufacturing). Needs outputs that match a specific control-framework layout (e.g., ISO 9001, SOC 2 narrative structure). Will not use a tool that does not produce compliant-looking documents without manual intervention.

---

## 3. MVP Scope (P0)

The following is the minimum set that earns its keep. Every item maps to the core user job: upload a template once, have every future recording render in that format automatically.

**P0.1 — Template schema definition**  
A published, versioned JSON schema (`UserTemplateSchema v1`) that defines how a user declares field mappings from `ProcessOutput` to their output layout. Mappings must be structural only — allowed sources are named fields from the canonical `ProcessOutput` type (steps, phases, systems, roles, friction points, decisions, quality indicators, etc.). No computed logic, no conditionals, no scripting. Each field maps to a `ProcessOutput` path or is declared as a static string.

**P0.2 — Template upload and validation**  
Users upload a JSON file conforming to `UserTemplateSchema v1`. The system validates the schema on upload and rejects invalid files with a specific error message identifying the failing field. A valid template is stored and associated with the user's workspace.

**P0.3 — Template type declaration**  
Each uploaded template declares itself as type `sop` or `process_map`. This determines which render slot it occupies. A workspace may have at most one active custom template per type.

**P0.4 — Automatic application to new recordings**  
When a custom template of a given type is active, every new recording for that workspace renders using the custom template instead of the system-selected default. The system-selected `ProcessMapTemplateType` or `SOPTemplateType` is bypassed. Existing recordings are not retroactively re-rendered.

**P0.5 — Custom template artifact type**  
Custom-rendered artifacts are stored with `artifactType = template_sop_custom` or `template_process_map_custom`. This keeps custom outputs distinguishable from system template outputs in queries and exports.

**P0.6 — Fallback behavior**  
If a custom template cannot be applied (e.g., a required `ProcessOutput` field is absent for a given recording), the system falls back to the auto-selected system template and logs the fallback event with the reason. The user is notified in the workflow detail view.

**P0.7 — Template management UI (list, activate, deactivate, delete)**  
A settings page listing uploaded templates with their type, upload date, status (active/inactive), and a delete action. One active template per type. Deactivating returns rendering to system defaults.

---

## 4. Stretch Scope (P1 / Post-MVP)

The following are explicitly deferred. Do not design for them in the MVP build.

- **Re-render existing recordings** with a newly uploaded template on demand
- **Multiple active templates per type** with per-recording selection
- **Template versioning** — tracking which template version produced which artifact
- **Shared org-level templates** across team members (P0 is workspace-scoped only)
- **Template export/download** — allow users to download the JSON of any template they uploaded
- **Template marketplace** — shared community templates
- **Per-phase or per-section field-level overrides** within a recording view
- **Markdown or HTML output format customization** beyond field mapping

---

## 5. Explicit Non-Goals

- **No LLM in the render path.** Template rendering must remain a pure deterministic structural mapping. No generated text, no AI-suggested field values.
- **No WYSIWYG visual editor.** Template authoring is a JSON file upload. A guided schema editor is P1 at earliest.
- **No scripting or conditional logic in templates.** If a user wants to conditionally include a section, the MVP answer is "not supported."
- **No changes to the six existing system templates.** This feature adds a new render path; it does not modify existing renderers.
- **No retroactive re-render on upload.** Only recordings created after template activation are affected.
- **No cross-workspace template sharing in MVP.** Each workspace manages its own templates independently.

---

## 6. User Stories and Acceptance Criteria

**Story 1 — Upload a valid custom SOP template**

Given I am on the workspace Templates settings page and I have a JSON file conforming to `UserTemplateSchema v1`,  
When I upload the file and select type "SOP",  
Then the template appears in the templates list with status "inactive", upload date, and file name, and no error is shown.

**Story 2 — Upload an invalid template file**

Given I upload a JSON file that is missing a required field or references a `ProcessOutput` path that does not exist in the schema,  
When the upload completes validation,  
Then the upload is rejected, the file is not stored, and the error message identifies the specific field or path that failed validation.

**Story 3 — Activate a custom template**

Given I have an uploaded custom SOP template with status "inactive",  
When I activate it,  
Then its status changes to "active", any previously active custom SOP template becomes "inactive", and a confirmation message is displayed.

**Story 4 — New recording renders using the active custom template**

Given a custom SOP template is active in my workspace,  
When a new recording completes processing,  
Then the rendered SOP artifact has `artifactType = template_sop_custom` and its fields map to the values declared in my template definition, traceable to `ProcessOutput` source fields.

**Story 5 — Fallback on missing ProcessOutput fields**

Given a custom process map template requires a `ProcessOutput` field that is absent for a specific recording (e.g., no phases detected),  
When the rendering pipeline attempts to apply the custom template,  
Then the system falls back to the auto-selected system template, stores the artifact with the system `artifactType`, and the workflow detail view shows a notice: "Custom template could not be applied: [reason]. System template used."

**Story 6 — Deactivate a custom template**

Given a custom SOP template is active,  
When I deactivate it,  
Then its status changes to "inactive", subsequent new recordings render using the system-selected default template, and previously rendered custom artifacts are not changed.

---

## 7. Success Metrics

**Primary metric — Post-processing reduction**  
Baseline: unknown (no current measurement). Target instrument: post-recording survey ("Did you reformat this output before filing it? Y/N") introduced at launch.  
Target: 40% reduction in "Yes" responses within 60 days of feature availability among Growth/enterprise users who have an active custom template.

**Secondary metric — Template activation rate**  
Baseline: 0 (feature does not exist).  
Target: 25% of eligible workspaces (Growth tier and above) have at least one active custom template within 90 days of launch.

**Leading indicator — Upload-to-activation rate**  
A template that is uploaded but never activated signals that the schema or upload experience is too difficult.  
Target: upload-to-activation rate >= 70% within the first 30 days.

**Guard metric — Fallback rate**  
If the fallback rate (recordings that could not apply a custom template) exceeds 15% across all recordings for workspaces with active custom templates, the schema or documentation is insufficient. This triggers a schema UX review before further rollout.

---

## 8. Plan-Tier Placement

**Recommendation: Growth tier and above.**

Rationale: Custom templates are an organizational capability, not a personal productivity feature. The value compounds across a team using a shared template standard. The Growth tier is the first tier with `sharedLibrary`, `teamWorkspace`, and `priorityExports` — all of which indicate organizational-scale usage patterns. Placing custom templates at Growth also creates a meaningful upgrade signal for `team` tier users who are already invested in the platform and want to eliminate manual reformatting.

A new `FeatureKey` of `customTemplates` should be added to `plans.ts` and enabled at `growth` and `enterprise`.

`starter` and `team` users see the feature as locked with an upgrade prompt. Do not offer a limited version (e.g., one template on starter) — partial access adds gating complexity without meaningful conversion signal.

---

## 9. Open Questions

1. **Schema complexity ceiling.** How expressive should `UserTemplateSchema v1` be? At minimum: field label overrides, field inclusion/exclusion, section reordering. But should it support custom section headers, static text blocks, or footer/header strings? This affects schema design substantially and must be resolved with the architect before API spec work begins.

2. **Validation surface.** Should template validation happen only at upload time, or also at render time (in case `ProcessOutput` schema evolves after a template was uploaded)? A strict upload-only validation approach risks silent partial renders if the engine schema changes. Dual validation adds pipeline complexity. The architect must decide.

3. **Template storage model.** Templates are user-authored JSON files. Are they stored as database rows (parsed, normalized), raw blob files (S3/MinIO), or both? This affects the traceability model and how the render pipeline loads them. Must be resolved before backend spec.

4. **ProcessOutput schema publication.** Users need to know what fields are available to map. Does a formal, human-readable schema reference exist that can be linked from the upload UI? If not, one must be produced as a dependency. The `ProcessOutput` type in `packages/process-engine/src/types.ts` is the source of truth but is not currently user-facing documentation.

5. **Audit and traceability.** For regulated users (the compliance persona), which template version produced which artifact matters for audit trails. Should `WorkflowArtifact` rows store a reference to the template ID and a hash of the template JSON at render time? This is a data model question that must be resolved before schema migration work.

---

## 10. Dependencies

The following must exist or be completed before build begins.

| Dependency | Owner | Status |
|---|---|---|
| `ProcessOutput` type fully stable (no breaking schema changes in flight) | process-engine team | Verify before spec |
| `UserTemplateSchema v1` defined and published as a JSON Schema document | architect | Not started |
| `customTemplates` FeatureKey added to `plans.ts` and gated at `growth`/`enterprise` | backend engineer | Not started |
| `WorkflowArtifact` table supports `template_sop_custom` and `template_process_map_custom` as valid `artifactType` values | backend engineer | Not started |
| Human-readable `ProcessOutput` field reference published for template authors | PM + docs | Not started |
| `ARCHITECTURE.md` for this feature produced by system-architect | architect | Not started |
| `API_SPEC.md` for template upload, activation, and render endpoints | architect | Not started |
| Feature flag `customTemplates` instrumented in analytics pipeline | analytics | Not started |

**Build cannot start until:** `UserTemplateSchema v1`, `ARCHITECTURE.md`, and `API_SPEC.md` are complete and reviewed.
