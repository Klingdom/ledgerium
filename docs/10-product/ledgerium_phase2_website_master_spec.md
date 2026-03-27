# Ledgerium AI — Phase 2 Website Master Specification

## Status
Canonical draft  
Phase: 2 — Make It Useful (Single → Repeatable)

## Purpose

This document defines the Phase 2 website for Ledgerium AI.

The website is the next major product surface after the browser extension. Its role is to turn Ledgerium from a session-based recording tool into a subscription-based workflow workspace that users return to repeatedly.

The browser extension remains focused on **capture**.  
The website becomes the home for **organization, retrieval, reporting, and repeat use**.

---

# 1. Product Intent

## Core Goal

Turn Ledgerium from:
- a useful recording tool

into:
- a subscription product people use repeatedly to store, organize, review, search, and share workflow intelligence

## Phase 2 Outcome

A user can:
1. record a workflow in the browser extension
2. export or sync session JSON
3. upload the JSON into the Ledgerium website
4. have the website ingest and process the JSON
5. save it as a durable workflow asset
6. search and revisit it later
7. export or share polished outputs
8. subscribe for premium capabilities

## Strategic Product Split

### Browser Extension
Responsible for:
- recording browser activity
- generating session JSON
- showing immediate workflow/SOP/report previews
- exporting raw and enriched outputs
- optionally syncing data to web app later

### Website
Responsible for:
- ingesting recorder outputs
- validating and storing uploads
- creating workflow records
- managing workflow library
- supporting search, filtering, and history
- improving report usability
- enabling sharing/export
- supporting subscriptions and future collaboration

---

# 2. Phase 2 Scope

Phase 2 website scope focuses on five product outcomes:

1. **Workflow library**
2. **Search and filtering**
3. **History improvements**
4. **Easy sharing/export**
5. **Better report usability**

These are the features that create stickiness.

---

# 3. Primary User Jobs

## Job 1 — Save Work
"I want the workflows I record to become reusable assets, not one-off outputs."

## Job 2 — Find Work
"I want to quickly find a workflow I recorded last week, or all workflows involving a specific tool."

## Job 3 — Review Work
"I want to open a workflow and immediately understand what happened, how long it took, what tools were used, and what the SOP is."

## Job 4 — Share Work
"I want to send a clean workflow report or SOP to a teammate or stakeholder."

## Job 5 — Build a Reusable Library
"I want my captured workflows to accumulate into a library of operational knowledge."

---

# 4. Product Principles

## 4.1 Trust First
Everything in the web app must preserve the same trust model as the extension:
- evidence-backed
- deterministic
- privacy-safe
- inspectable

## 4.2 Workflow First
The website should use workflow terminology consistently:
- workflow
- workflow steps
- workflow report
- workflow library

Avoid “process map” as primary language. If needed, use “workflow diagram.”

## 4.3 Canonical JSON In, Structured Assets Out
The website should ingest structured recorder JSON and transform it into durable workflow assets.

## 4.4 The Website Is a Workspace, Not Just Storage
The goal is not to archive files.  
The goal is to make workflow knowledge useful.

## 4.5 Phase 2 Is About Repeat Use
Every design decision should support:
- returning users
- saved assets
- easy retrieval
- easy reuse

---

# 5. Website Information Architecture

## 5.1 Public Marketing Site
Public-facing pages:

- Home
- Product
- How It Works
- Pricing
- Trust & Privacy
- Demo
- Login
- Sign Up

## 5.2 Authenticated App
Application pages:

- Dashboard
- Workflows
- Upload
- Reports
- Account
- Billing

---

# 6. MVP Website Features

## 6.1 Authentication

### Required
- Sign up
- Log in
- Log out
- Password reset or magic link
- Account settings

### Requirements
- secure auth flow
- support subscription-gated access
- minimal friction for trial users

---

## 6.2 Subscription and Billing

### Product Model
The website is subscription-based because it unlocks all Phase 2 features.

### Initial Plans

#### Free / Trial
- limited uploads
- limited workflow history
- basic workflow and SOP viewing
- limited exports or limited report downloads

#### Pro
- unlimited uploads
- full workflow library
- search and filtering
- premium workflow reports
- persistent history
- improved sharing/export

#### Team (later)
- shared library
- collaboration
- comments
- ownership
- multi-user aggregation

### Billing Requirements
- checkout flow
- subscription status tracking
- billing portal
- plan-based feature gating

---

## 6.3 JSON Upload and Ingestion

### Goal
Allow users to bring recorder output into the website.

### Supported Inputs
At minimum:
- raw session JSON
- enriched JSON if supported

Future:
- direct sync from extension
- batch uploads
- zipped session bundles

### Upload UX
Users can:
- drag and drop a file
- use file picker upload

### Ingestion Flow
1. User uploads JSON
2. Website validates schema
3. Original upload is stored
4. Deterministic pipeline runs
5. Workflow record is created
6. Generated assets are attached
7. Workflow appears in library

### Ingestion Requirements
- validate schema version
- reject clearly invalid files
- preserve original raw file
- log validation result
- avoid silent failures

---

## 6.4 Workflow Library

### Goal
The website homepage for logged-in users should function as a reusable workflow library.

### Core User Actions
- view saved workflows
- open a workflow
- rename a workflow
- delete a workflow
- sort workflows
- filter workflows
- search workflows

### Workflow Card / Row Must Show
- workflow title
- created date
- updated date
- tools used
- duration
- step count
- phase count
- status
- confidence indicator if available

### Library UX Requirements
- easy to scan
- not cluttered
- fast to navigate
- useful with both small and large collections

---

## 6.5 Workflow Detail Page

Each saved workflow should have a detail page or detail surface.

### Required Tabs / Sections
- Workflow
- SOP
- Report
- JSON / Evidence

### Workflow View
Must show:
- workflow diagram or ordered workflow steps
- phases
- metrics
- tool badges
- confidence information

### SOP View
Must show:
- title
- overview
- phase-based instructions
- evidence linkage

### Report View
Must show:
- executive summary
- workflow overview
- metrics
- SOP
- appendix

### JSON / Evidence View
Must show:
- raw or structured data view
- evidence linkage
- developer/debug utility

---

## 6.6 Search and Filtering

### Search
At minimum:
- workflow title
- application/tool names
- tags later if added

### Filters
At minimum:
- date
- tools used
- duration range
- step count
- status

### Future Filters
- phase count
- confidence range
- uploader
- team ownership

### Search UX Requirements
- instant or fast response
- clear empty states
- clear reset behavior

---

## 6.7 History Improvements

The website replaces the extension’s limited “last 25” history model with persistent account-based history.

### Required Improvements
- durable storage
- sortable timeline
- persistent workflow list
- ability to revisit any prior uploaded workflow
- improved metadata

### History View Must Support
- newest first by default
- open workflow
- download source JSON
- delete workflow
- filter/sort results

---

## 6.8 Easy Sharing and Export

### Required
Users should be able to export:
- workflow report
- workflow JSON
- SOP-oriented output

### Export UX
- predictable file naming
- clean download behavior
- obvious action buttons
- no confusing duplication

### Future Sharing
- shareable links
- public/private report views
- stakeholder-friendly view mode

---

## 6.9 Better Report Usability

The website report experience must be better than the extension’s lightweight review/export flow.

### Improve
- executive summary clarity
- typography
- readability
- report navigation
- print/download experience
- consistency with workflow and SOP data

### Report Must Be
- concise
- readable
- structured
- shareable
- evidence-backed

---

# 7. Functional Flows

## 7.1 Main Phase 2 Flow

```text
Recorder session complete
→ user exports or syncs session JSON
→ website ingests file
→ schema validated
→ deterministic pipeline processes file
→ workflow record created
→ workflow appears in library
→ user opens workflow detail page
→ user reviews workflow / SOP / report
→ user exports or shares outputs
```

## 7.2 Trial User Flow
```text
Visit website
→ sign up
→ start trial
→ upload first JSON
→ see first workflow appear in library
→ open workflow detail page
→ understand value immediately
```

## 7.3 Repeat User Flow
```text
Log in
→ open workflow library
→ search/filter for needed workflow
→ open detail view
→ review report or SOP
→ export/share
```

---

# 8. Data Model

## 8.1 User
Fields:
- user_id
- email
- name
- created_at
- plan
- subscription_status

## 8.2 Upload
Fields:
- upload_id
- user_id
- file_name
- uploaded_at
- source_type
- schema_version
- validation_status
- raw_json_location
- upload_error if any

## 8.3 Workflow
Fields:
- workflow_id
- user_id
- title
- description (optional)
- created_at
- updated_at
- tools_used
- duration_ms
- step_count
- phase_count
- confidence
- source_upload_id
- status

## 8.4 Workflow Artifact
Fields:
- artifact_id
- workflow_id
- artifact_type
- schema_version
- content_json_location or content_payload
- content_html_location if applicable
- created_at

Artifact types may include:
- workflow
- sop
- report
- events
- evidence
- manifest

## 8.5 Subscription
Fields:
- subscription_id
- user_id
- provider
- provider_customer_id
- provider_subscription_id
- plan
- status
- renewal_date

---

# 9. Canonical Artifact Strategy

## Source of Truth
The canonical ingested source is the recorder JSON upload.

## Canonical Derived Assets
The website should generate and store structured assets such as:
- workflow model
- SOP model
- workflow_report.json
- report HTML if generated
- metadata summary
- manifest/evidence links

## Guiding Rule
Do not let the web app become a file bucket.
It should transform files into durable, structured product objects.

---

# 10. Subscription Strategy

## Free / Trial
Purpose:
- let users experience the workflow value quickly

Capabilities:
- limited uploads
- limited library size
- basic workflow and SOP views
- limited report export

## Pro
Purpose:
- convert users who want durable value

Capabilities:
- unlimited uploads
- full library
- persistent history
- advanced search and filters
- premium report experience
- better export

## Team (Future)
Purpose:
- support broader organizational use

Capabilities:
- shared workflows
- shared libraries
- comments
- permissions
- aggregation later

---

# 11. UX Requirements

## 11.1 App Quality Bar
The web app should feel:
- clean
- fast
- professional
- trustworthy
- easy to learn

## 11.2 Dashboard / Library Requirements
Users should be able to understand:
- what exists
- what is new
- what is important
- what to do next

## 11.3 Upload Requirements
Uploading a JSON file should feel:
- simple
- safe
- guided
- understandable

## 11.4 Detail Page Requirements
A workflow detail page must answer:
- what is this workflow?
- what happened?
- how long did it take?
- what tools were used?
- what is the SOP?
- what can I export?

---

# 12. MVP UI Structure

## 12.1 Logged-In Landing Page
Primary surface: Workflow Library

Sections:
- header
- upload CTA
- recent workflows
- filters/search
- library list/grid

## 12.2 Upload Page
Sections:
- upload area
- supported file info
- validation feedback
- processing status
- success/error state

## 12.3 Workflow Detail Page
Tabs:
- Workflow
- SOP
- Report
- Evidence / JSON

## 12.4 Billing / Account
Sections:
- current plan
- renewal info
- usage summary
- billing portal access

---

# 13. Technical Architecture Recommendations

## Frontend
Recommended:
- Next.js
- TypeScript
- Tailwind CSS
- reusable component system

## Backend
Recommended:
- Next.js route handlers / server actions or separate API service
- deterministic processing service
- report generation service later if needed

## Database
Recommended:
- Postgres

## File Storage
Recommended:
- object storage for original uploads and generated artifacts

## Auth
Recommended:
- Auth.js, Clerk, or Supabase Auth

## Billing
Recommended:
- Stripe

---

# 14. Validation and Ingestion Rules

## Validation Must Check
- valid JSON
- supported schema version
- required top-level fields
- upload ownership
- deterministic pipeline compatibility

## Invalid Upload Behavior
- show clear error message
- preserve useful diagnostic information
- do not silently drop file
- do not create partial workflow without explicit handling

---

# 15. Permissions and Security

## Requirements
- authenticated access to user-owned workflows
- secure file storage
- secure subscription state handling
- privacy-safe handling of uploaded JSON
- support future role-based access

## Trust Requirements
The website must preserve Ledgerium’s trust model:
- no hidden transformation magic
- no misleading report content
- no exposure of sensitive values
- evidence and redaction should remain inspectable where appropriate

---

# 16. Reporting Requirements

## Workflow Report in Web App
The website should consume or generate canonical `workflow_report.json`.

The report view should support:
- browser viewing
- export/download
- future sharing links

## Report Experience Must Improve
Compared to the extension, the website should offer:
- better layout
- better structure
- clearer summary
- easier print/export

---

# 17. Phase 2 Non-Goals

Phase 2 should not attempt to fully solve:
- multi-user collaboration
- full organization-level workflow aggregation
- process mining at enterprise scale
- AI-generated editing or rewriting
- advanced automation recommendations
- video ingestion
- workflow merging across many sessions

These belong in later phases.

---

# 18. Success Criteria

Phase 2 is successful when a user can:

1. sign up and start a subscription or trial
2. upload recorder JSON easily
3. have the JSON validated and processed successfully
4. see the resulting workflow in a persistent library
5. search and retrieve workflows later
6. open a workflow detail page with workflow, SOP, report, and evidence
7. export/share useful outputs
8. feel that Ledgerium is now a product they return to, not just a one-time tool

---

# 19. Build Order

Recommended implementation sequence:

## Step 1
Authentication and billing shell

## Step 2
JSON upload and validation flow

## Step 3
Workflow library and persistent storage

## Step 4
Workflow detail page

## Step 5
Search and filtering

## Step 6
Report usability improvements

## Step 7
Sharing and export improvements

This order minimizes risk and creates usable product value quickly.

---

# 20. Claude Code Build Guidance

When implementing the website:
- treat the extension as the capture layer
- treat the website as the workflow workspace
- preserve deterministic behavior
- preserve trust-first UX
- do not build marketing-only surfaces first
- prioritize authenticated app value before polishing outer pages

The first usable version should let a real user:
- upload JSON
- get a saved workflow
- search for it later
- open and use it again

That is the real Phase 2 milestone.

---

# 21. Future Extensions After Phase 2

Once Phase 2 is complete, the website becomes the platform surface for:

- workflow portfolio management
- multi-session aggregation
- variance detection
- collaboration
- team permissions
- enterprise reporting
- automation readiness insights
- video ingestion
- shared operational intelligence

---

# Final Summary

Phase 2 website strategy is simple:

- **Extension = recorder**
- **Website = subscription workflow workspace**

The recorder captures work.  
The website turns recorded work into durable, searchable, reusable product value.

That is what creates stickiness.
