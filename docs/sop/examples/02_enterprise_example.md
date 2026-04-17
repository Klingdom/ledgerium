# Workflow Upload and Review Procedure — Ledgerium AI

| | |
|---|---|
| **SOP ID** | s_2026_04_17_abc123-sop |
| **Version** | 2.0 |
| **Status** | Generated · pending review |
| **Generated** | 2026-04-17T14:32:47Z |
| **Engine** | Ledgerium process-engine v1.2.0 |
| **Source session** | s_2026_04_17_abc123 |
| **Review cadence** | Quarterly |
| **Next review date** | 2026-07-17 |

> ✓ **High confidence** — average step confidence 0.91 across 12 steps; 0 low-confidence steps. Fully evidence-linked.

---

## Purpose

This procedure defines the controlled upload and review of a recorded workflow in Ledgerium AI. It applies when a process owner needs to produce an evidence-linked Standard Operating Procedure and process map from an observation session captured by the Ledgerium browser extension. Successful completion of this procedure yields a versioned SOP artifact, a corresponding process map, and a shareable link for downstream distribution.

## Scope

**In scope.** The procedure covers the end-to-end flow from authentication through shareable-link generation, performed entirely within the Ledgerium AI web application (`app.ledgerium.ai`), using a single human actor (the Workflow Author). It applies to recordings conforming to canonical event schema v1.0.0 and files under the 10 MB upload limit.

**Out of scope.** Recording capture performed in the Ledgerium browser extension is covered by a separate procedure. Workflow deletion, team-permissioned sharing, and enterprise-directory integrations are out of scope.

**Applicable when.** The Workflow Author has a valid Ledgerium account, has completed the extension recording, and has the exported `.json` file accessible on their workstation.

## Trigger condition

A Workflow Author has a completed recording file and requires a shareable, evidence-linked SOP and process map for organizational distribution.

## Roles and responsibilities

| Role | Responsibility |
|---|---|
| **Workflow Author** | Executes all 12 procedure steps in the Ledgerium web app. Verifies the generated SOP accurately reflects the observed workflow before publication. |
| **Process Reviewer** | *(Assigned post-generation.)* Reviews the generated SOP and process map for content accuracy. Approves the SOP for team-wide publication. |

## Prerequisites

1. Active Ledgerium AI account with sign-in credentials.
2. Workflow recording file (`.json`, schema v1.0.0) under 10 MB.
3. Modern browser with JavaScript enabled (Chrome, Firefox, Edge).
4. Optional: predetermined tag taxonomy for the workflow library.

## Inputs

- Recorded workflow file (`.json`, canonical event schema v1.0.0)
- Workflow name (free text, 3–80 characters)
- Zero or more tags (from the organization's tag dictionary)

## Systems and tools

- **Ledgerium AI** — web application at `https://app.ledgerium.ai`
- **Web browser** — any evergreen browser
- **Ledgerium browser extension** — *(upstream; produces the input file, not part of this procedure)*

---

## Procedure

### Step 1: Sign in to Ledgerium AI

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~8 seconds

The Workflow Author navigates to `https://app.ledgerium.ai/sign-in`, enters their registered email address and password, and submits the sign-in form. The password field is treated as sensitive and is redacted in the source evidence.

**Inputs:**
- Email address (required)
- Password (required · sensitive)

**Outputs:**
- Authenticated session

**Verification:**
- The browser navigates to `/workflows`.
- The Workflows dashboard is rendered.

**Risks:**
- Authentication failure prompts a form-level error; repeated failures may trigger account lockout per organizational policy.

◦ **Evidence:** 4 events · `ev_02, ev_03, ev_04, ev_05` · confidence 0.91

---

### Step 2: Navigate to the Workflows dashboard

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~2 seconds

The application routes the Workflow Author to the Workflows dashboard (`/workflows`). If the Workflow Author did not arrive automatically, they navigate manually via the primary left-side navigation.

**Inputs:** none
**Outputs:** Workflows dashboard loaded with library listing

**Verification:**
- The URL path is `/workflows`.
- Existing workflows render in a list or an empty state is shown.

◦ **Evidence:** 1 event · `ev_06` · confidence 0.95

---

### Step 3: Open the upload dialog

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~1 second

The Workflow Author activates the **Upload workflow** control in the dashboard header.

**Inputs:** none
**Outputs:** Upload dialog opened

**Verification:**
- A modal dialog with the title **"Upload workflow file"** is displayed.

◦ **Evidence:** 2 events · `ev_07, ev_08` · confidence 0.93

---

### Step 4: Submit the workflow file (initial attempt)

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~4 seconds

The Workflow Author selects the recorded workflow file via the **Choose file** control. The system validates the file against size and schema constraints.

**Inputs:**
- Recorded workflow file (`.json`, canonical event schema v1.0.0)

**Outputs:**
- Either: processing job identifier issued by the system
- Or: validation error displayed in the dialog

**Verification:**
- Either: an upload progress indicator begins.
- Or: an error message is displayed identifying the validation failure (observed in this recording: **"File exceeds 10 MB — please select a smaller workflow"**).

**Risks:**
- File size exceeds 10 MB → upload is rejected. See Step 4a.
- File does not conform to schema v1.0.0 → upload is rejected and an explicit schema error is displayed.

◦ **Evidence:** 2 events · `ev_09, ev_10` · confidence 0.88

---

### Step 4a: Exception recovery — resubmit with a compliant file

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~13 seconds

Invoked when Step 4 reports a validation failure. The Workflow Author obtains a compliant file (typically by re-exporting a shorter recording from the Ledgerium extension) and selects it via the same **Choose file** control.

**Inputs:**
- Compliant workflow file (`.json`, ≤ 10 MB, schema v1.0.0)

**Outputs:**
- Processing job identifier
- Route change to `/workflows/{id}`

**Verification:**
- A status toast **"Workflow uploaded — processing"** appears.
- The URL updates to `/workflows/{id}`.

◦ **Evidence:** 4 events · `ev_11, ev_12, ev_13, ev_14` · confidence 0.90

---

### Step 5: Monitor processing to completion

**Actor:** Workflow Author (observer)
**System:** Ledgerium AI
**Duration:** ~58 seconds

The system performs deterministic processing of the uploaded workflow. The Workflow Author remains on the page until processing completes.

**Inputs:** none (system-driven)
**Outputs:**
- Generated SOP artifact
- Generated process map artifact
- Updated workflow record

**Verification:**
- The processing indicator transitions to a completed state.
- The page title updates from **"Processing workflow"** to the workflow's detected or assigned name.

**Risks:**
- Processing stall exceeding 5 minutes indicates an engine or upstream error; escalate per exception handling below.

◦ **Evidence:** 1 event · `ev_15` · confidence 0.86

---

### Step 6: Review the generated SOP

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~15 seconds

The Workflow Author opens the **SOP** tab and reviews the structured procedure generated from the recording.

**Inputs:** none
**Outputs:** Visual confirmation of SOP content

**Verification:**
- A numbered SOP renders with step titles, actor attribution, and evidence references.

◦ **Evidence:** 1 event · `ev_16` · confidence 0.92

---

### Step 7: Review the generated process map

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~16 seconds

The Workflow Author opens the **Process map** tab and visually validates the map against the observed workflow.

**Inputs:** none
**Outputs:** Visual confirmation of process map fidelity

**Verification:**
- A swimlane or BPMN-informed process map renders with all recorded steps in sequence.

◦ **Evidence:** 1 event · `ev_17` · confidence 0.92

---

### Step 8: Apply a descriptive workflow name

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~6 seconds

The Workflow Author activates the **Edit name** control in the header and enters a descriptive name for organizational discoverability.

**Inputs:**
- Workflow name (3–80 characters)

**Outputs:** Renamed workflow record

**Verification:**
- The new name appears in the page header and the browser tab title.

◦ **Evidence:** 2 events · `ev_18, ev_19` · confidence 0.89

---

### Step 9: Apply organizational tags

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~7 seconds

The Workflow Author activates **Add tag** and selects one or more tags from the organization's tag dictionary.

**Inputs:**
- Tag name(s) from the organizational tag dictionary

**Outputs:** Tagged workflow record

**Verification:**
- Selected tags render as chips in the workflow header.

◦ **Evidence:** 2 events · `ev_20, ev_21` · confidence 0.87

---

### Step 10: Persist the workflow record

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~1 second

The Workflow Author activates **Save**.

**Inputs:** none
**Outputs:** Persisted workflow record with name, tags, generated SOP, and process map

**Verification:**
- A status toast **"Workflow saved"** is displayed.

◦ **Evidence:** 2 events · `ev_22, ev_23` · confidence 0.94

---

### Step 11: Generate a shareable link

**Actor:** Workflow Author
**System:** Ledgerium AI
**Duration:** ~5 seconds

The Workflow Author activates **Share**, then **Copy link** in the resulting dialog.

**Inputs:** none
**Outputs:** Shareable URL on the user's clipboard

**Verification:**
- A status toast **"Share link copied to clipboard"** is displayed.

**Risks:**
- Shared links provide read access to anyone with the URL; verify organizational sharing policy before distribution.

◦ **Evidence:** 4 events · `ev_24, ev_25, ev_26, ev_27` · confidence 0.93

---

## Decision points

| At step | Question | Option | Next action |
|---|---|---|---|
| **Step 4** | Did the file pass validation? | File accepted | Continue to Step 5 |
| | | File rejected (size or schema) | Perform Step 4a and return to Step 5 |

## Controls and checkpoints

- **Sensitive field handling.** The password entered in Step 1 is redacted at capture time (`normalization_meta.redactionApplied = true`). No sensitive value is persisted in the SOP evidence.
- **Validation checkpoint.** Step 4 is a mandatory validation checkpoint; unvalidated files never reach processing.
- **Visual review gate.** Steps 6 and 7 are mandatory reviewer gates; the Workflow Author confirms content fidelity before persisting.
- **Persistence checkpoint.** Step 10 is the commit point; the workflow record becomes retrievable in the organizational library.

## Risks and cautions

- **Unbounded file size on upload.** File sizes near the 10 MB limit may succeed on some networks and fail on others. Recommended practice: keep recordings under 5 MB where feasible.
- **Link-based sharing.** Any recipient of a share link can view the workflow. Confirm that shared workflows do not contain sensitive or regulated content prior to distribution.
- **Processing duration variability.** Median processing duration is ~60 seconds; outliers to 3 minutes have been observed. Abandoning the browser tab during processing is safe.

## Outputs

- Versioned SOP artifact (this document's generator)
- Versioned process map artifact
- Persisted workflow record in the organizational library
- Shareable URL

## Completion criteria

- ✓ The workflow is visible in the organizational library under the assigned name.
- ✓ The SOP tab displays the generated procedure with all evidence references resolving.
- ✓ The Process map tab renders the flow in sequence.
- ✓ A shareable link has been generated.

## Revision history and approvals

| Version | Date | Author | Change | Approved by |
|---|---|---|---|---|
| 2.0 | 2026-04-17 | Ledgerium process-engine v1.2.0 | Initial generation from session s_2026_04_17_abc123 | *(pending review)* |

## Evidence manifest

- **Total events:** 28
- **Session:** `s_2026_04_17_abc123`
- **Session duration:** 2 min 47 s
- **Sensitive events:** 1 (`ev_04` — password field; redacted)
- **Redacted events:** 1

| Event type | Count |
|---|---|
| interaction.click | 9 |
| interaction.input_change | 3 |
| interaction.submit | 1 |
| interaction.upload_file | 2 |
| interaction.select | 1 |
| navigation.open_page | 1 |
| navigation.route_change | 2 |
| system.modal_opened | 2 |
| system.loading_started | 1 |
| system.loading_finished | 1 |
| system.error_displayed | 1 |
| system.toast_shown | 3 |
| session.started / stopped | 2 (1 each) |

## Related documents

- *Recording Capture Procedure — Ledgerium Extension* (upstream)
- *Workflow Sharing and Access Control Policy* (if applicable to the organization)
- *Canonical Event Schema v1.0.0* — `packages/schema-events/src/canonical-event.schema.ts`

---

*Derived from session `s_2026_04_17_abc123` by Ledgerium process-engine v1.2.0 · 28 events · Open timeline: https://app.ledgerium.ai/s/s_2026_04_17_abc123*
