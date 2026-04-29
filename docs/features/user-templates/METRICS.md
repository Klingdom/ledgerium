# User-Uploaded Templates — METRICS.md

**Feature:** Custom Template Upload
**Status:** Draft — awaiting feature launch
**Date:** 2026-04-18
**Version:** 1.0
**Upstream artifacts:** PRD.md (user-templates), METRICS.md, EVENT_TRACKING_PLAN.md, DASHBOARD_SPEC.md

---

## 1. North-Star Question

Does giving Growth-tier workspaces a custom template reduce the manual post-processing step enough that more of them reach a shared SOP without reformatting?

---

## 2. KPIs

**KPI-T1: Template Adoption Rate**

```
Template Adoption Rate =
  COUNT(DISTINCT workspace_id WHERE template_activated_ever = true)
  / COUNT(DISTINCT workspace_id WHERE plan IN ['growth', 'enterprise'])
```

Source events: `template_saved` (with `is_active = true`), enriched with workspace plan.
Reported: Weekly rolling. Target: 25% within 90 days of launch.

---

**KPI-T2: Upload-to-Activation Rate**

```
Upload-to-Activation Rate =
  COUNT(DISTINCT workspace_id WHERE template_saved WITH is_active = true WITHIN 30 days of first template_upload_completed)
  / COUNT(DISTINCT workspace_id WHERE template_upload_completed fired at least once)
```

Source events: `template_upload_completed`, `template_saved`.
Reported: Weekly. Target: >= 70%.
Why it matters: A template uploaded but never activated signals that the schema authoring experience is too difficult or the preview is not convincing. This is the leading indicator of the schema UX problem identified in the PRD.

---

**KPI-T3: Template Apply Rate**

```
Template Apply Rate =
  COUNT(template_render_succeeded WHERE template_type = 'custom')
  / COUNT(template_render_succeeded WHERE workspace has active custom template of same type)
```

Source events: `template_render_succeeded` with `template_source` property.
Reported: Daily. Target: >= 85% for workspaces with an active custom template.
Why it matters: A low apply rate means fallback is triggering frequently — the template is active but not actually being used. Cross-reference with `template_render_failed` to distinguish fallback from true failure.

---

**KPI-T4: Template Render Success Rate**

```
Template Render Success Rate =
  COUNT(template_render_succeeded)
  / (COUNT(template_render_succeeded) + COUNT(template_render_failed))
```

Source events: `template_render_succeeded`, `template_render_failed`.
Reported: Daily — guardrail. Alert threshold: < 85% in any 24-hour window.
Why it matters: This is the reliability floor for the feature. A render failure means the user's recording produced no usable custom output. Below 85% this is a silent product failure for every affected recording.

---

**KPI-T5: Time-to-First-Custom-Render**

```
Time-to-First-Custom-Render = MEDIAN(
  timestamp(template_render_succeeded WHERE template_source = 'custom', first per workspace)
  - timestamp(template_upload_completed, first per workspace)
) in seconds
```

Source events: `template_upload_completed`, `template_render_succeeded`.
Reported: Weekly. Target: p50 < 30 minutes (most users should see a custom render within the same session as their upload).
Why it matters: A long median time indicates users are uploading templates but not completing a new recording to test them. This is an activation friction signal, not a pipeline latency signal.

---

## 3. Event Schema

All events follow the existing `snake_case` convention in `EVENT_TRACKING_PLAN.md`. Trigger location and privacy class align with the existing taxonomy. All IDs are opaque strings. No PII in properties.

---

**`template_upload_started`**
- Trigger: User selects a file in the template upload UI and the upload POST begins
- Location: Client-side, on file selection confirm
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | Opaque workspace ID |
  | `template_type` | string | `"sop"` or `"process_map"` |
  | `file_size_kb` | integer | Rounded to nearest KB |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_upload_completed`**
- Trigger: Upload POST returns 200 and the template record is persisted
- Location: Server-side, after DB write
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_id` | string | Opaque template record ID |
  | `template_type` | string | `"sop"` or `"process_map"` |
  | `file_size_kb` | integer | |
  | `field_count` | integer | Number of field mappings declared |
  | `is_first_template_for_workspace` | boolean | |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_upload_failed`**
- Trigger: Upload POST returns non-200 or schema validation rejects the file
- Location: Server-side, in validation or error handler
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_type` | string | |
  | `file_size_kb` | integer | |
  | `reason_code` | string | `"schema_invalid"` / `"missing_required_field"` / `"invalid_process_output_path"` / `"file_too_large"` / `"server_error"` |
  | `failing_field` | string | Field name if `reason_code` is field-level; empty string otherwise |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_edit_opened`**
- Trigger: User opens an existing template for review or replacement (navigates to its detail/edit view)
- Location: Client-side, on component mount of template detail page
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `is_active` | boolean | Whether template is currently active |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_preview_rendered`**
- Trigger: User requests a preview render of an uploaded template against a sample or selected workflow
- Location: Server-side, when preview render completes
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `preview_source` | string | `"sample_workflow"` or `"selected_workflow"` |
  | `render_duration_ms` | integer | |
  | `succeeded` | boolean | |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_saved`**
- Trigger: User saves/activates a template (status set to active or inactive)
- Location: Server-side, on PATCH to template status
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `is_active` | boolean | True if being activated, false if deactivated |
  | `previously_active_template_displaced` | boolean | True if another custom template was deactivated by this action |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_deleted`**
- Trigger: User confirms deletion of a template
- Location: Server-side, on DELETE
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `was_active` | boolean | Whether the deleted template was active |
  | `days_since_upload` | integer | |
  | `apply_count` | integer | Number of times it was applied before deletion |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_applied_to_workflow`**
- Trigger: The render pipeline selects a custom template to apply to a new recording (before rendering begins)
- Location: Server-side, in render dispatch
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `workflow_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_render_succeeded`**
- Trigger: Custom template render pipeline completes and artifact is stored
- Location: Server-side, after artifact write
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `workflow_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `template_source` | string | `"custom"` or `"system_fallback"` |
  | `render_duration_ms` | integer | |
  | `artifact_type` | string | `"template_sop_custom"` / `"template_process_map_custom"` / system artifact type if fallback |

- Sampling: 100%
- Privacy class: Non-PII

---

**`template_render_failed`**
- Trigger: Custom template render throws an unhandled error or required `ProcessOutput` fields are absent and fallback is triggered
- Location: Server-side, in render error handler
- Payload:

  | Property | Type | Notes |
  |---|---|---|
  | `workspace_id` | string | |
  | `workflow_id` | string | |
  | `template_id` | string | |
  | `template_type` | string | |
  | `reason_code` | string | `"missing_process_output_field"` / `"schema_mismatch"` / `"render_error"` / `"timeout"` |
  | `missing_field` | string | Field name if `reason_code = "missing_process_output_field"`; empty string otherwise |
  | `fell_back_to_system` | boolean | True if system template was used as fallback |

- Sampling: 100%
- Privacy class: Non-PII

---

## 4. Funnel Definition

**Template Activation Funnel** — from feature discovery to first successful custom render.

| Step | Name | Event or condition |
|---|---|---|
| 1 | Feature discovered | `upgrade_prompt_viewed` where `feature = "custom_templates"` OR direct navigation to Templates settings page (`page_viewed` where `path = "/settings/templates"`) |
| 2 | Upload started | `template_upload_started` |
| 3 | Upload completed | `template_upload_completed` |
| 4 | Template activated | `template_saved` where `is_active = true` |
| 5 | First custom render | `template_render_succeeded` where `template_source = "custom"` (first per workspace) |

Conversion window: 7 days from step 1.
Measure step-to-step drop-off. The highest-value optimization target is the step with the largest absolute drop.

The funnel answers: where between "user discovers templates" and "first recording renders in their format" do workspaces drop out?

---

## 5. Dashboard Additions

These panels extend the existing admin dashboard described in `DASHBOARD_SPEC.md`. Add them to Dashboard 2 (Product Engagement) as a collapsible "Custom Templates" section. All panels are admin-only.

---

**Panel T-1: Template Adoption Funnel**

Type: Vertical step funnel
Steps: the 5-step funnel defined in section 4
Configuration:
- Conversion window: 7 days
- Breakdown by `template_type` (sop / process_map) to reveal if one type has worse drop-off
- Show both absolute counts and step-to-step rates
- Highlight step with largest absolute drop

---

**Panel T-2: Render Health**

Type: Time series (daily, last 30 days) + current-period summary tiles

Summary tiles (top row):
- Render success rate: `template_render_succeeded` / (`template_render_succeeded` + `template_render_failed`)
- Fallback rate: `template_render_failed` where `fell_back_to_system = true` / `template_applied_to_workflow`
- Most common failure reason: top `reason_code` from `template_render_failed` in period

Time series lines:
- Daily render success count (green)
- Daily render failure count (red)
- Daily fallback count (amber)

Alert threshold reference line at 85% render success rate.

---

**Panel T-3: Top Templates by Apply Count**

Type: Table, sorted by apply count descending

Columns: `template_id` (anonymized label) | `template_type` | `workspace_id` | `upload_date` | `apply_count` | `failure_count` | `failure_rate`

Show top 20 templates. Failure rate column highlights rows where `failure_rate > 15%` to surface templates that are structurally fragile against diverse `ProcessOutput` shapes.

---

## 6. Alerting Rules

| Alert | Condition | Severity | Action |
|---|---|---|---|
| Render success rate low | `template_render_succeeded` / (`template_render_succeeded` + `template_render_failed`) < 85% over any rolling 24-hour window with >= 5 render attempts | P1 | Inspect render pipeline logs; check for `ProcessOutput` schema changes |
| Upload failure spike | `template_upload_failed` count > 5 in 1 hour | P2 | Check validation service; review most common `reason_code` in the alert window |
| Fallback rate exceeded | `template_render_failed` where `fell_back_to_system = true` > 15% of `template_applied_to_workflow` events in a rolling 7-day window | P2 | Review `missing_field` distribution in `template_render_failed`; consider schema documentation update |
| Template upload zero (post-launch) | Zero `template_upload_completed` events in any 14-day window after the first 10 template uploads are observed | P3 | Check feature discoverability; review whether Growth-tier users are seeing the templates CTA |

---

## 7. Experiment Instrumentation Hook

**Hypothesis to test:** Showing an "Upload your template" CTA on the workflow detail page (inline, adjacent to the SOP output) produces higher template adoption than relying on users discovering the Templates settings page organically.

**Assignment unit:** `workspace_id`. Assign at the workspace level, not the user level. All users in a workspace see the same variant. This prevents a workspace admin seeing the CTA while their colleagues do not.

**Variants:**
- Control: No inline CTA. Templates discoverable only via Settings navigation.
- Treatment: Inline CTA on the SOP tab: "Output not matching your format? Upload your template." with a direct link to the upload flow.

**Assignment event:** On first `workflow_viewed` for each workspace after experiment start, record variant assignment. Store as a workspace-level property in PostHog: `experiment_template_cta = "control"` or `"treatment"`.

**Instrumentation required:**
- Add `experiment_variant` property (string) to `template_upload_started`, `template_upload_completed`, and `template_saved` events. Value is the assigned variant for the workspace, or `"none"` if workspace is not in the experiment.
- Add `experiment_variant` to `upgrade_prompt_viewed` where `feature = "custom_templates"`.

**Primary success metric:** KPI-T1 (Template Adoption Rate) segmented by `experiment_variant`. Measure at 30 days post-assignment.

**Guardrail metric:** `template_render_failed` rate must not differ between variants by more than 2 percentage points. A higher failure rate in the treatment group would indicate that the CTA is attracting users who upload malformed templates.

**Minimum detectable effect:** 10 percentage point lift in adoption rate (from a 25% baseline to 35%). With typical Growth-tier workspace volumes, expect to need 4–6 weeks to reach statistical significance. Do not call the experiment early.
