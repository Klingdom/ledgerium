# Ledgerium AI Core Data Model

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, analytics, security, implementation partners, and stakeholders  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`, `ledgerium_technical_architecture_and_roadmap.md`

---

## 1. Purpose of this document

This document defines the canonical core data model for Ledgerium AI. It is the source of truth for how workflow evidence, derived process structure, review actions, and reusable process knowledge should be represented across the platform.

Ledgerium AI is a **trust-first, deterministic, evidence-linked process intelligence platform**. The data model must reflect that identity. It cannot be a loose collection of ad hoc JSON blobs. It must preserve provenance, support inspectable transformations, and allow the system to distinguish between:

- what was directly observed
- what was normalized
- what was deterministically derived
- what was user-edited or user-confirmed
- what was AI-assisted

This document exists to stabilize the contracts that matter most early in the life of the product.

---

## 2. Core design goals

The Ledgerium AI data model must satisfy eight non-negotiable goals.

### 2.1 Provenance
Every meaningful downstream object should be traceable to upstream evidence.

### 2.2 Deterministic derivation
The system must preserve enough information to explain why a step, activity, SOP section, or process definition was created.

### 2.3 Versionability
Schemas, rules, renderers, and process definitions must evolve without corrupting older records.

### 2.4 Portability
Exports should be usable outside Ledgerium AI by developers, analysts, and future automation systems.

### 2.5 Separation of truth layers
The model must not blur raw evidence, normalized evidence, derived structure, human edits, and AI-generated polish.

### 2.6 Privacy and minimization
The model should store only what is needed to reproduce trusted process knowledge and governance behavior.

### 2.7 Reusability
A single captured run should be able to contribute to reusable process definitions, variants, metrics, and portfolio-level process intelligence.

### 2.8 Extensibility
The MVP model should support later expansion to collaboration, governance, multi-run comparison, desktop capture, and AI-fluid workflows.

---

## 3. Conceptual model at a glance

Ledgerium AI turns observed workflow evidence into reusable process knowledge through a staged data model.

```text
Raw captured events
        ↓
Normalized events
        ↓
ProcessRun
        ↓
Derived steps / activities / artifacts
        ↓
ProcessDefinition + variants + metrics
        ↓
Portfolio knowledge + governance + reuse
```

At a conceptual level, the most important top-level entities are:

1. **CaptureSession** — a user-initiated recording context.
2. **RawEvent** — low-level event as seen by the recorder.
3. **NormalizedEvent** — cleaned and versioned event record.
4. **ProcessRun** — one analyzed execution instance.
5. **RunStep** — a step derived within a run.
6. **RunActivity** — a higher-order grouping of related steps.
7. **EvidenceReference** — provenance object linking outputs back to source evidence.
8. **ProcessDefinition** — reusable process knowledge abstracted from one or more runs.
9. **ProcessVariant** — meaningful alternate path or pattern.
10. **ProcessPortfolioItem** — grouping construct for related process definitions.
11. **ReviewDecision** — human validation or correction action.
12. **DerivedArtifact** — generated outputs such as SOPs, maps, summaries, and exports.

---

## 4. Modeling principles

### 4.1 Separate execution from definition
A **ProcessRun** represents one concrete execution instance. A **ProcessDefinition** represents reusable knowledge derived from one or more runs.

Do not collapse these into one object.

### 4.2 Preserve lineage
Every derived object should carry lineage metadata identifying:

- parent object IDs
- derivation rule version
- input evidence IDs
- generation timestamp
- actor type (`system`, `user`, `ai`)

### 4.3 Use stable identifiers
IDs should be immutable, globally unique, and safe for distributed systems.

Recommended convention:

- ULID or UUIDv7 for primary identifiers
- human-readable slugs only as secondary labels

### 4.4 Prefer append over destructive mutation
Evidence should be immutable. Corrections should usually create new versions or review records rather than overwrite source truth.

### 4.5 Represent confidence explicitly
Where the system performs segmentation, grouping, naming, or classification, it should preserve confidence and rationale metadata.

### 4.6 Make optionality intentional
Optional fields should exist only where variability is real. The core schema should remain disciplined.

---

## 5. Top-level domain model

## 5.1 Entity overview

```text
Workspace
 ├── User
 ├── CaptureSession
 │    ├── RawEvent[]
 │    ├── NormalizedEvent[]
 │    └── ProcessRun
 │         ├── RunStep[]
 │         ├── RunActivity[]
 │         ├── EvidenceReference[]
 │         ├── ReviewDecision[]
 │         └── DerivedArtifact[]
 ├── ProcessDefinition[]
 │    ├── ProcessVariant[]
 │    ├── DefinitionStep[]
 │    ├── DefinitionActivity[]
 │    └── DerivedArtifact[]
 └── ProcessPortfolioItem[]
```

## 5.2 MVP-required entities

The minimum canonical MVP entities are:

- `CaptureSession`
- `RawEvent`
- `NormalizedEvent`
- `ProcessRun`
- `RunStep`
- `RunActivity`
- `EvidenceReference`
- `ProcessDefinition`
- `ProcessVariant`
- `ReviewDecision`
- `DerivedArtifact`

## 5.3 Near-term but not day-one entities

These should be modeled now conceptually, even if not fully implemented in MVP:

- `ProcessPortfolioItem`
- `RunAnnotation`
- `DefinitionVersion`
- `SimilarityLink`
- `MetricSnapshot`
- `PolicyRule`
- `RetentionRecord`
- `ExternalSystemLink`

---

## 6. Canonical metadata envelope

Every top-level persisted object should include a consistent metadata envelope.

```json
{
  "id": "01HXYZ...",
  "object_type": "process_run",
  "schema_version": "1.0.0",
  "created_at": "2026-03-23T00:00:00Z",
  "updated_at": "2026-03-23T00:00:00Z",
  "created_by": {
    "actor_type": "system",
    "actor_id": "system"
  },
  "workspace_id": "01HABC...",
  "environment": "prod",
  "status": "active",
  "lineage": {
    "parent_ids": [],
    "source_ids": [],
    "rule_versions": {},
    "generation_mode": "deterministic"
  },
  "labels": [],
  "tags": []
}
```

### Required common fields

- `id`
- `object_type`
- `schema_version`
- `created_at`
- `updated_at`
- `workspace_id`
- `status`

### Recommended common fields

- `created_by`
- `lineage`
- `labels`
- `tags`
- `retention_class`
- `privacy_classification`

---

## 7. CaptureSession model

A `CaptureSession` represents one explicit recording session initiated by a user.

It is the operational envelope around recording. A session may produce zero or one primary `ProcessRun` in MVP, though future designs may support multiple runs inside one session.

### 7.1 Purpose

A session records context such as:

- who initiated recording
- when it began and ended
- recording mode and policy state
- recorder configuration
- consent and pause intervals
- source environment information

### 7.2 Canonical shape

```json
{
  "id": "01HS001",
  "object_type": "capture_session",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "user_id": "01U001",
  "status": "completed",
  "started_at": "2026-03-23T16:00:00Z",
  "ended_at": "2026-03-23T16:24:33Z",
  "duration_ms": 1473000,
  "capture_mode": "browser_extension",
  "source_environment": {
    "browser": "chrome",
    "browser_version": "134",
    "extension_version": "0.1.0",
    "os_family": "macos"
  },
  "policy_snapshot": {
    "capture_text_allowed": true,
    "capture_sensitive_fields": false,
    "network_capture_enabled": false
  },
  "pause_intervals": [
    {
      "started_at": "2026-03-23T16:07:00Z",
      "ended_at": "2026-03-23T16:08:12Z",
      "reason": "user_pause"
    }
  ],
  "primary_run_id": "01PR001"
}
```

### 7.3 Notes

- Session truth is operational, not analytical.
- Session status should reflect recording lifecycle, not process quality.
- Session policies should be snapshotted so future policy changes do not rewrite history.

---

## 8. RawEvent model

A `RawEvent` is the closest durable representation of recorder-observed behavior.

This is not the same as a DOM dump or unrestricted telemetry stream. It is still policy-constrained capture.

### 8.1 Purpose

Raw events preserve the recorder’s original view before normalization and derivation.

### 8.2 Design requirements

- immutable after persistence
- timestamped
- ordered
- policy-aware
- minimally redacted as required
- sufficient to reproduce normalized events where possible

### 8.3 Canonical shape

```json
{
  "id": "01RE001",
  "object_type": "raw_event",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "capture_session_id": "01HS001",
  "sequence": 104,
  "occurred_at": "2026-03-23T16:02:18.223Z",
  "event_family": "ui_interaction",
  "event_type": "click",
  "source": {
    "tab_id": "tab-7",
    "window_id": "win-1",
    "frame_id": "frame-0",
    "url": "https://app.example.com/orders/12345"
  },
  "target": {
    "selector_hint": "button[data-test='submit-order']",
    "role": "button",
    "text_snippet": "Submit"
  },
  "payload": {
    "mouse_button": 0,
    "x": 824,
    "y": 612
  },
  "privacy": {
    "contains_redacted_content": false,
    "redaction_policy_version": "1.0.0"
  }
}
```

### 8.4 RawEvent event families

MVP families should include:

- `navigation`
- `ui_interaction`
- `form_interaction`
- `system_state`
- `user_control`
- `capture_lifecycle`

### 8.5 Examples of raw event types

- `page_view`
- `tab_focus`
- `click`
- `input_change`
- `select_change`
- `submit`
- `pause_recording`
- `resume_recording`
- `start_recording`
- `stop_recording`

---

## 9. NormalizedEvent model

A `NormalizedEvent` is the cleaned, standardized, versioned representation used by downstream logic.

### 9.1 Why it exists

Raw events are too recorder-specific and too noisy to serve as the primary analytical substrate.

Normalized events provide:

- stable naming
- consistent field structure
- derived context
- normalized timestamps and durations
- explicit redaction state
- cleaner target semantics

### 9.2 Canonical shape

```json
{
  "id": "01NE001",
  "object_type": "normalized_event",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "capture_session_id": "01HS001",
  "raw_event_id": "01RE001",
  "sequence": 104,
  "occurred_at": "2026-03-23T16:02:18.223Z",
  "normalized_type": "action.submit",
  "action": {
    "verb": "submit",
    "object": "order_form",
    "qualifiers": ["primary"]
  },
  "context": {
    "application": "app.example.com",
    "page_key": "order_detail",
    "page_title": "Order 12345",
    "url_path": "/orders/:id"
  },
  "target": {
    "role": "button",
    "label": "Submit",
    "semantic_key": "submit_order"
  },
  "privacy": {
    "redaction_state": "safe",
    "contains_user_content": false
  },
  "lineage": {
    "parent_ids": ["01RE001"],
    "rule_versions": {
      "normalization": "1.0.0"
    },
    "generation_mode": "deterministic"
  }
}
```

### 9.3 Normalization requirements

Normalization must:

- collapse noisy variants into stable action names
- normalize URLs into reusable route patterns where possible
- preserve source linkage back to raw events
- retain ordering
- assign semantic keys used by segmentation logic

### 9.4 Normalized event naming convention

Use a dotted hierarchy when helpful, for example:

- `navigation.page_view`
- `navigation.route_change`
- `action.click`
- `action.submit`
- `form.input_change`
- `control.pause`

---

## 10. ProcessRun model

A `ProcessRun` is the central execution object in Ledgerium AI.

It represents one analyzed instance of work derived from a capture session and its normalized evidence.

### 10.1 Why it matters

This is the bridge between evidence and reusable process intelligence.

A run should be rich enough to:

- reconstruct what happened
- show step and activity boundaries
- support review and corrections
- generate artifacts
- contribute to process definition learning

### 10.2 Canonical shape

```json
{
  "id": "01PR001",
  "object_type": "process_run",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "capture_session_id": "01HS001",
  "status": "analyzed",
  "run_name": "Create and submit customer order",
  "started_at": "2026-03-23T16:00:00Z",
  "ended_at": "2026-03-23T16:24:33Z",
  "duration_ms": 1473000,
  "source_event_count": 182,
  "normalized_event_count": 146,
  "step_count": 9,
  "activity_count": 3,
  "primary_application_keys": ["crm", "erp"],
  "segmentation_summary": {
    "segmentation_version": "1.0.0",
    "boundary_rule_version": "1.0.0",
    "confidence": 0.91,
    "manual_edits_applied": 1
  },
  "evidence_window": {
    "first_event_id": "01NE001",
    "last_event_id": "01NE146"
  },
  "definition_links": {
    "matched_process_definition_id": "01PD001",
    "match_confidence": 0.84,
    "variant_id": "01PV002"
  },
  "quality_flags": ["contains_pause_interval"],
  "lineage": {
    "parent_ids": ["01HS001"],
    "source_ids": ["01NE001", "01NE146"],
    "rule_versions": {
      "segmentation": "1.0.0",
      "activity_grouping": "1.0.0"
    },
    "generation_mode": "deterministic"
  }
}
```

### 10.3 Required fields

- identity and metadata envelope
- session linkage
- time bounds
- event counts
- segmentation version metadata
- run status

### 10.4 Recommended optional fields

- matched definition references
- quality flags
- review state summary
- privacy summary
- export summary

### 10.5 Run statuses

Recommended statuses:

- `captured`
- `normalized`
- `analyzed`
- `reviewed`
- `approved`
- `exported`
- `archived`
- `error`

---

## 11. RunStep model

A `RunStep` is the first meaningful process abstraction derived from normalized events.

### 11.1 Definition

A step is a bounded unit of user work that has a recognizable goal, context, or action outcome.

Examples:

- open customer record
- search for existing order
- update shipping fields
- submit order for approval

### 11.2 Requirements

A step must preserve:

- order in sequence
- time bounds
- source event range
- step label
- rationale for boundary placement
- evidence linkage
- confidence

### 11.3 Canonical shape

```json
{
  "id": "01RS001",
  "object_type": "run_step",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "process_run_id": "01PR001",
  "sequence": 1,
  "name": "Open customer order",
  "step_type": "navigation_and_selection",
  "started_at": "2026-03-23T16:00:14.100Z",
  "ended_at": "2026-03-23T16:01:40.200Z",
  "duration_ms": 86100,
  "source_event_ids": ["01NE001", "01NE002", "01NE003"],
  "source_event_range": {
    "start_sequence": 1,
    "end_sequence": 9
  },
  "boundary_reason": {
    "start_reason": "navigation.page_view",
    "end_reason": "action.select_customer"
  },
  "confidence": 0.93,
  "activity_id": "01RA001",
  "evidence_reference_ids": ["01ER001"],
  "manual_state": {
    "was_user_edited": false,
    "was_user_confirmed": true
  },
  "lineage": {
    "parent_ids": ["01PR001"],
    "source_ids": ["01NE001", "01NE009"],
    "rule_versions": {
      "step_segmentation": "1.0.0"
    },
    "generation_mode": "deterministic"
  }
}
```

### 11.4 Step naming

Step names should be:

- action-oriented
- concise
- grounded in evidence
- safe to present in UI and exports

Avoid vague names such as `Processing` or `User interaction` unless no stronger interpretation is justified.

---

## 12. RunActivity model

A `RunActivity` groups related steps into a higher-order phase of work.

### 12.1 Purpose

Activities support process map readability, SOP structuring, and process comparison.

### 12.2 Examples

- locate case
- update information
- submit and confirm

### 12.3 Canonical shape

```json
{
  "id": "01RA001",
  "object_type": "run_activity",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "process_run_id": "01PR001",
  "sequence": 1,
  "name": "Locate and prepare order",
  "activity_type": "preparation",
  "step_ids": ["01RS001", "01RS002", "01RS003"],
  "started_at": "2026-03-23T16:00:14.100Z",
  "ended_at": "2026-03-23T16:06:04.000Z",
  "duration_ms": 349900,
  "confidence": 0.87,
  "lineage": {
    "parent_ids": ["01PR001"],
    "source_ids": ["01RS001", "01RS003"],
    "rule_versions": {
      "activity_grouping": "1.0.0"
    },
    "generation_mode": "deterministic"
  }
}
```

### 12.4 Important rule

Activities are derived abstractions. They must never hide step-level truth.

---

## 13. EvidenceReference model

`EvidenceReference` is the critical provenance object.

### 13.1 Why it matters

Without durable evidence linkage, Ledgerium AI becomes another interpretation engine. EvidenceReference is what keeps outputs auditable.

### 13.2 Purpose

An evidence reference links a derived object to the exact evidence slice that supports it.

### 13.3 Canonical shape

```json
{
  "id": "01ER001",
  "object_type": "evidence_reference",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "owner_object_type": "run_step",
  "owner_object_id": "01RS001",
  "evidence_type": "normalized_event_range",
  "source_ids": ["01NE001", "01NE009"],
  "range": {
    "start_sequence": 1,
    "end_sequence": 9
  },
  "support_role": "primary",
  "explanation": "User navigated to the order detail page and selected the target order.",
  "lineage": {
    "generation_mode": "deterministic",
    "rule_versions": {
      "evidence_linking": "1.0.0"
    }
  }
}
```

### 13.4 Support roles

Recommended values:

- `primary`
- `secondary`
- `contextual`
- `exception`
- `user_annotation`

---

## 14. ReviewDecision model

A `ReviewDecision` captures human intervention in the truth pipeline.

### 14.1 Purpose

The model must preserve where humans corrected, confirmed, renamed, split, merged, or rejected system outputs.

### 14.2 Canonical shape

```json
{
  "id": "01RD001",
  "object_type": "review_decision",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "target_object_type": "run_step",
  "target_object_id": "01RS004",
  "decision_type": "rename",
  "decision_value": {
    "old_name": "Update details",
    "new_name": "Update shipping and billing details"
  },
  "reason": "Improves precision for SOP generation.",
  "made_by": {
    "actor_type": "user",
    "actor_id": "01U001"
  },
  "made_at": "2026-03-23T16:30:11Z"
}
```

### 14.3 Common review decision types

- `confirm`
- `rename`
- `split_step`
- `merge_steps`
- `reassign_activity`
- `mark_noise`
- `reject_definition_match`
- `approve_run`

---

## 15. DerivedArtifact model

A `DerivedArtifact` is any generated output intended for user consumption or system export.

### 15.1 Artifact examples

- SOP document
- process map JSON
- mermaid diagram
- markdown narrative
- session export bundle
- review report

### 15.2 Canonical shape

```json
{
  "id": "01DA001",
  "object_type": "derived_artifact",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "owner_object_type": "process_run",
  "owner_object_id": "01PR001",
  "artifact_type": "sop_markdown",
  "artifact_version": "1.0.0",
  "generation_mode": "deterministic_plus_ai_polish",
  "storage": {
    "storage_type": "object_store",
    "uri": "s3://ledgerium/.../artifact.md"
  },
  "source_ids": ["01PR001", "01RS001", "01RS009"],
  "rendering_context": {
    "renderer_version": "1.0.0",
    "template_version": "1.0.0",
    "ai_prompt_version": "0.1.0"
  },
  "review_status": "draft"
}
```

### 15.3 Design rule

Derived artifacts should not be the system of record for process truth. They are views or exports over the underlying canonical objects.

---

## 16. ProcessDefinition model

A `ProcessDefinition` is reusable process knowledge derived from one or more runs.

### 16.1 Purpose

It represents the stable or semi-stable shape of a process that can be reused for:

- SOP generation
- training
- process governance
- automation handoffs
- agent grounding
- comparison across runs

### 16.2 Key distinction

A run says: **what happened this time**.  
A definition says: **what this process usually is**.

### 16.3 Canonical shape

```json
{
  "id": "01PD001",
  "object_type": "process_definition",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "status": "active",
  "name": "Create and submit customer order",
  "slug": "create-submit-customer-order",
  "definition_version": "1.0.0",
  "source_run_ids": ["01PR001", "01PR010", "01PR021"],
  "canonical_step_ids": ["01DS001", "01DS002", "01DS003"],
  "canonical_activity_ids": ["01DACT001", "01DACT002"],
  "entry_conditions": [
    "User is authenticated",
    "Order request exists"
  ],
  "exit_conditions": [
    "Order submitted successfully",
    "Confirmation visible or recorded"
  ],
  "primary_systems": ["crm", "erp"],
  "definition_metrics": {
    "observed_run_count": 3,
    "median_duration_ms": 1334000,
    "step_count_mode": 9,
    "variance_score": 0.18
  },
  "governance": {
    "approved_by": "01U010",
    "approved_at": "2026-03-23T18:00:00Z",
    "approval_status": "approved"
  },
  "lineage": {
    "source_ids": ["01PR001", "01PR010", "01PR021"],
    "rule_versions": {
      "definition_builder": "1.0.0"
    },
    "generation_mode": "deterministic"
  }
}
```

### 16.4 Requirements

A definition should preserve:

- name and identity
- source run lineage
- canonical steps and activities
- conditions and context
- metrics derived from observed runs
- approval state
- version and governance metadata

---

## 17. DefinitionStep and DefinitionActivity models

These are definition-level abstractions parallel to run-level steps and activities.

### 17.1 Why separate them from run objects

Definition steps are not just copied run steps. They represent canonicalized process structure across one or more runs.

### 17.2 DefinitionStep shape

```json
{
  "id": "01DS001",
  "object_type": "definition_step",
  "schema_version": "1.0.0",
  "process_definition_id": "01PD001",
  "sequence": 1,
  "name": "Open the target customer order",
  "description": "Locate the customer and open the order record in the CRM.",
  "source_run_step_ids": ["01RS001", "01RS101", "01RS201"],
  "required": true,
  "confidence": 0.95,
  "variance_notes": [],
  "evidence_reference_ids": ["01ER501"]
}
```

### 17.3 DefinitionActivity shape

```json
{
  "id": "01DACT001",
  "object_type": "definition_activity",
  "schema_version": "1.0.0",
  "process_definition_id": "01PD001",
  "sequence": 1,
  "name": "Locate and prepare order",
  "definition_step_ids": ["01DS001", "01DS002", "01DS003"],
  "required": true,
  "confidence": 0.91
}
```

---

## 18. ProcessVariant model

A `ProcessVariant` captures a meaningful alternate path without fragmenting the canonical definition model.

### 18.1 Why variants matter

Real work often branches by system state, business rule, geography, exception handling, or operator preference.

Ledgerium AI must support variants without turning every run into a brand-new process definition.

### 18.2 Canonical shape

```json
{
  "id": "01PV002",
  "object_type": "process_variant",
  "schema_version": "1.0.0",
  "process_definition_id": "01PD001",
  "name": "Order requires manager approval",
  "trigger_conditions": [
    "Order total exceeds approval threshold"
  ],
  "source_run_ids": ["01PR021", "01PR022"],
  "variant_step_ids": ["01DS009"],
  "frequency": 0.22,
  "status": "active"
}
```

### 18.3 Variant rules

Create a variant when the alternate path is:

- repeatable
- semantically distinct
- materially relevant to execution, documentation, or automation

Do not create a variant for trivial noise.

---

## 19. ProcessPortfolioItem model

This is a critical near-term concept for Ledgerium AI.

### 19.1 Why it exists

Users will not only need one process. They will need to manage a growing library of related processes, sub-processes, variants, and revisions.

A `ProcessPortfolioItem` groups related process definitions into a portfolio structure that supports discovery, governance, and reuse.

### 19.2 Examples

- Order management
- Employee onboarding
- Refund handling
- Incident triage

### 19.3 Canonical shape

```json
{
  "id": "01PP001",
  "object_type": "process_portfolio_item",
  "schema_version": "1.0.0",
  "workspace_id": "01W001",
  "name": "Order management",
  "description": "Portfolio grouping for order creation, update, approval, and exception handling processes.",
  "process_definition_ids": ["01PD001", "01PD004", "01PD007"],
  "labels": ["sales_ops", "crm"],
  "taxonomy": {
    "domain": "operations",
    "function": "order_management",
    "criticality": "high"
  },
  "governance": {
    "owner_user_id": "01U010",
    "review_cycle_days": 90
  }
}
```

### 19.4 Why this is strategically important

This is the bridge from single-run utility to true process intelligence platform value.

---

## 20. Similarity and clustering support

The canonical model should support process similarity without forcing it into MVP UX immediately.

### 20.1 Suggested entity

`SimilarityLink`

```json
{
  "id": "01SL001",
  "object_type": "similarity_link",
  "source_object_type": "process_run",
  "source_object_id": "01PR001",
  "target_object_type": "process_definition",
  "target_object_id": "01PD001",
  "similarity_type": "definition_match",
  "score": 0.84,
  "rule_version": "1.0.0"
}
```

### 20.2 Use cases

- suggest matching definition for a new run
- deduplicate process definitions
- cluster related process families
- identify candidate variants

---

## 21. Metrics model

Metrics should not be stored only as dashboard derivatives. Some must be represented canonically.

### 21.1 Run-level metrics

Examples:

- total duration
- active duration
- pause duration
- step count
- activity count
- application transitions
- exception count

### 21.2 Definition-level metrics

Examples:

- observed run count
- median duration
- p90 duration
- step stability
- variant frequency
- review approval rate

### 21.3 Suggested metric snapshot shape

```json
{
  "id": "01MS001",
  "object_type": "metric_snapshot",
  "owner_object_type": "process_definition",
  "owner_object_id": "01PD001",
  "metric_period": "all_time",
  "metrics": {
    "observed_run_count": 27,
    "median_duration_ms": 1295000,
    "variant_count": 3,
    "step_stability_score": 0.89
  },
  "computed_at": "2026-03-23T19:00:00Z",
  "computation_version": "1.0.0"
}
```

---

## 22. Policy, privacy, and retention fields

The core data model must support governance from the start.

### 22.1 Recommended fields

Every evidence-bearing object should support:

- `privacy_classification`
- `retention_class`
- `contains_user_content`
- `contains_sensitive_content`
- `redaction_state`
- `deletion_eligibility_at`

### 22.2 Example

```json
{
  "privacy_classification": "internal_sensitive",
  "retention_class": "standard_90_day_raw",
  "contains_user_content": true,
  "contains_sensitive_content": false,
  "redaction_state": "partially_redacted",
  "deletion_eligibility_at": "2026-06-21T00:00:00Z"
}
```

### 22.3 Important rule

Retention policies should apply differently to:

- raw evidence
- normalized evidence
- derived structure
- approved process definitions
- exported artifacts

Derived definitions may live longer than raw session evidence, provided provenance and policy rules allow it.

---

## 23. Schema versioning strategy

Versioning must be explicit and boring.

### 23.1 Three layers of versioning

1. **Schema version** — shape of the object.
2. **Rule version** — deterministic logic used to produce it.
3. **Renderer / prompt version** — how user-facing artifacts were generated.

### 23.2 Example

```json
{
  "schema_version": "1.1.0",
  "lineage": {
    "rule_versions": {
      "normalization": "1.0.0",
      "step_segmentation": "1.2.0",
      "activity_grouping": "1.0.1"
    }
  },
  "rendering_context": {
    "renderer_version": "1.0.0",
    "template_version": "1.3.0",
    "ai_prompt_version": "0.4.0"
  }
}
```

### 23.3 Recommended practice

Use semantic versioning for all published schemas and rule packs.

---

## 24. Storage model recommendations

The canonical data model is logical. It does not force one storage technology. Still, some practical guidance is useful.

### 24.1 Recommended persistence split

**Relational store** for:

- sessions
- runs
- steps
- activities
- definitions
- variants
- reviews
- governance metadata

**Object store** for:

- exported artifacts
- large evidence bundles
- snapshots
- attachments

**Search index** for later phases:

- full-text search over definitions, steps, artifacts, annotations

### 24.2 JSON storage philosophy

Even when stored in relational tables, canonical JSON representations should remain first-class for export and API use.

### 24.3 Immutability guidance

- raw events: immutable
- normalized events: immutable after committed normalization pass
- run structure: versionable with review deltas
- definitions: versioned
- artifacts: immutable by artifact version

---

## 25. API contract implications

The data model should shape API design.

### 25.1 Important API resource boundaries

Recommended resources:

- `/capture-sessions`
- `/process-runs`
- `/process-runs/{id}/steps`
- `/process-runs/{id}/activities`
- `/process-runs/{id}/artifacts`
- `/process-definitions`
- `/process-definitions/{id}/variants`
- `/portfolio-items`
- `/reviews`

### 25.2 API principle

The API should expose canonical objects rather than ad hoc UI bundles whenever possible.

---

## 26. MVP data model boundaries

The MVP should fully support:

- capture session creation and closure
- raw and normalized event persistence
- single-run analysis
- run steps and activities
- evidence references
- review decisions
- process definition creation from a run
- variant association
- artifact export metadata

The MVP does **not** need to fully support yet:

- rich collaboration comments
- enterprise role inheritance
- advanced taxonomy management
- process graph analytics across hundreds of runs
- desktop agent capture
- multi-tenant data residency complexity beyond initial architecture hooks

---

## 27. Non-goals and anti-patterns

Avoid these mistakes.

### 27.1 Do not store only generated prose
If the output is only markdown or natural language, the product loses inspectability.

### 27.2 Do not merge raw and normalized evidence
They serve different purposes.

### 27.3 Do not let AI-generated names overwrite evidence lineage
AI can suggest labels; it cannot erase provenance.

### 27.4 Do not treat every run as a new definition
That creates process sprawl and destroys portfolio value.

### 27.5 Do not overfit to one UI representation
The model should survive changes in renderer, diagramming engine, and frontend layout.

---

## 28. Example end-to-end lineage

Below is the intended truth chain for a normal happy-path capture.

```text
CaptureSession HS001
  └── RawEvent RE001..RE182
        └── NormalizedEvent NE001..NE146
              └── ProcessRun PR001
                    ├── RunStep RS001..RS009
                    ├── RunActivity RA001..RA003
                    ├── EvidenceReference ER001..ER015
                    ├── ReviewDecision RD001
                    └── DerivedArtifact DA001 (SOP markdown)

PR001 + PR010 + PR021
  └── ProcessDefinition PD001
        ├── DefinitionStep DS001..DS009
        ├── DefinitionActivity DACT001..DACT003
        ├── ProcessVariant PV002
        └── MetricSnapshot MS001
```

This must remain explainable in both data and UI.

---

## 29. Suggested canonical file and schema layout for GitHub

```text
/docs
  /data-model
    ledgerium_core_data_model.md
    schemas/
      capture_session.schema.json
      raw_event.schema.json
      normalized_event.schema.json
      process_run.schema.json
      run_step.schema.json
      run_activity.schema.json
      evidence_reference.schema.json
      review_decision.schema.json
      process_definition.schema.json
      definition_step.schema.json
      definition_activity.schema.json
      process_variant.schema.json
      process_portfolio_item.schema.json
      derived_artifact.schema.json
    examples/
      example_capture_session.json
      example_process_run.json
      example_process_definition.json
```

---

## 30. Recommended next implementation steps

1. Freeze top-level object names and ID conventions.
2. Publish JSON Schema files for MVP entities.
3. Implement lineage and rule-version fields in all pipeline stages.
4. Ensure review actions are first-class records, not UI-only mutations.
5. Add process portfolio support immediately after MVP run/definition stabilization.
6. Build artifact rendering strictly on top of canonical objects, not bespoke intermediate state.

---

## 31. Final position

The Ledgerium AI core data model is not a supporting detail. It is the product’s structural truth system.

If this model is clear, versioned, and lineage-preserving, Ledgerium AI can become a durable platform for trusted process intelligence.

If this model is weak, everything downstream becomes fragile: capture, review, SOP generation, process maps, analytics, and AI handoffs all degrade.

The correct design stance is therefore:

> **Preserve evidence. Separate truth layers. Version the derivation chain. Build reusable process knowledge on top of that foundation.**

That is the core of Ledgerium AI’s defensibility.
