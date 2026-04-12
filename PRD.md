# Ledgerium AI — Product Requirements Document

**Version:** 1.0
**Phase:** Phase 1 MVP (Beta)
**Date:** 2026-04-12
**Status:** Active — governs all Phase 1 build and release decisions

---

## 1. Product Overview

Ledgerium AI is a deterministic, evidence-linked process documentation platform. It captures real browser workflow activity via a Chrome extension, transforms that activity through a layered pipeline, and produces workflow steps, process maps, and SOPs that trace back to source events.

**What it is not:** a screen recorder, a surveillance tool, an AI summarizer, or a generic workflow dashboard.

**Core value proposition:** Every output is grounded in observed evidence, not AI inference or user memory. The same recorded inputs always produce identical outputs.

---

## 2. Target Users

### Primary ICP — Phase 1 Beta

**Operations team leads** at companies with 10–200 employees who:
- Maintain SOPs for browser-based internal tools (CRMs, ERPs, internal portals)
- Currently document processes manually (Word, Notion, Confluence, screenshots)
- Are responsible for onboarding, training, or compliance documentation
- Experience the gap between the written SOP and how work actually happens

**Characteristics:** Team size 5–50, non-technical, use Chrome for daily work, have budget authority or can influence a purchase under $100/month.

### Secondary ICP — Phase 2+

Compliance analysts in regulated industries (finance, healthcare, insurance) who need auditable, evidence-linked process records. This ICP is deferred until the core loop is validated with the primary ICP.

### What We Are Not Targeting in Phase 1

- Engineering teams or developers building automation
- Enterprise accounts requiring SSO, admin controls, or custom contracts
- Teams primarily using non-Chrome browsers
- Organizations needing AI-generated SOP content

---

## 3. Problem Statement

### The Pain

Operations team leads spend significant time writing and maintaining SOPs for browser-based workflows. The documented process rarely matches what the team actually does. When they try to close this gap, they have two options:

1. **Watch someone do the work** — time-intensive, does not scale, produces a subjective record
2. **Ask the worker to self-document** — produces a clean, idealized version that omits real complexity

The result is documentation that fails on first contact with reality: missing steps, wrong step order, outdated UI references, and no way to know when the process has drifted.

### Why Now

- Browser-based SaaS tools dominate enterprise workflows; most knowledge work happens in Chrome
- Existing tools (Scribe, Tango) take screenshots and produce click-through guides — they show what the screen looked like, not what the process means
- Teams are being asked to prepare workflows for AI agent automation — they need current-state baselines, not idealized SOPs

### Evidence of the Problem

The core problem statement used in messaging — "Your SOP says 5 steps. Your team takes 17" — tested as immediately resonant with operations personas. Assessment scored problem articulation at 4/5 across independent reviewers (CURRENT_STATE_SYNTHESIS.md).

---

## 4. Solution

Ledgerium installs as a Chrome extension. The user names a workflow, presses Start, performs the workflow in any browser tab, then presses Stop. The system produces:

1. **Workflow steps** — meaningful actions derived from observed events, not screenshots
2. **Process map** — a visual flowchart of the observed path with transition labels
3. **SOP** — numbered instructions built from the dominant observed path
4. **Session bundle** — exportable JSON with SHA-256 integrity hashes linking every output to source events

Every output carries evidence references. Every redaction is logged. Every derived step shows its boundary reason and confidence score. The same recorded input always produces the same output.

---

## 5. Core Features — Phase 1 MVP

These are the only features in scope for Phase 1. Each must be complete, tested, and functional before beta launch.

### F1: Recording Lifecycle

The extension records a complete browser workflow across any number of Chrome tabs.

**Must-have behavior:**
- User enters an activity name and clicks Start
- Sidebar shows "initializing" state within 1 second of Start click
- Recording is active across all open tabs
- User can Pause (no events captured) and Resume
- User clicks Stop to end recording
- Discard requires explicit confirmation before clearing session

**Acceptance criteria:**
- Recording starts, runs, and stops without silent failure on any path
- Pause interval is tracked in session metadata; paused time is excluded from workflow duration
- A recording that fails to stop must surface a visible error — no silent partial output
- Password fields are never included in any captured event (verified by policy log inspection)

### F2: Live Step Feed

During recording, the sidebar shows a real-time list of derived workflow steps.

**Must-have behavior:**
- Provisional step is visually distinct from finalized steps
- Provisional step updates in real time as events accumulate
- Finalized steps are immutable — they do not change after boundary fires
- Step cards show: title, page context, step type icon, confidence score, event count

**Acceptance criteria:**
- Provisional step transitions to finalized within 500ms of a boundary event
- Streaming segmentation output matches batch segmentation output for the same event sequence
- Step feed is scrollable without interrupting the recording

### F3: Session Bundle Export

After stopping, the system produces a verifiable five-file session bundle.

**Must-have files:**
- `session.json` — metadata, timestamps, pause intervals, schema and rule versions
- `normalized_events.json` — complete canonical event log
- `derived_steps.json` — finalized steps with evidence refs and boundary reasons
- `policy_log.json` — every redaction and capture_blocked event
- `manifest.json` — SHA-256 hashes of all files

**Acceptance criteria:**
- Export fails with a visible error if the session bundle is malformed — no silent partial export
- SHA-256 hashes in manifest match the actual file contents
- Password field labels and selectors are absent from all five files
- Every redaction event in `normalized_events.json` has a corresponding entry in `policy_log.json`
- Every derived step has non-null `boundary_reason`, `evidence_refs`, and `confidence`

### F4: Extension Review Screen

After stopping, the extension shows a review screen with three tabs: Map, SOP, Export.

**Map tab:** Interactive process map with nodes (step signatures) and edges (transitions). Clicking a node opens a step drawer showing operational definition, systems involved, duration, and confidence.

**SOP tab:** Numbered step-by-step procedure derived from the observed path. Each step shows expandable evidence events with redaction indicators.

**Export tab:** Session statistics and download options (Workflow Report HTML/PDF, Enriched JSON, Raw Session JSON, Full Process Map).

**Acceptance criteria:**
- Review screen is reachable within 3 seconds of Stop for a typical session (under 200 events)
- Every SOP step has at least one evidence event visible in the expandable section
- Process map renders correctly for sessions with 1–50 steps
- Workflow Report download opens an HTML report renderable as PDF via browser print
- User can complete the full record → review → export cycle in under 60 seconds after Stop

### F5: Web Platform — Workflow Storage and Viewing

The web app accepts uploaded session bundles, stores them, runs the process engine, and displays the results.

**Must-have behavior:**
- User uploads a session bundle (JSON) via drag-and-drop on `/upload`
- System validates, stores, and runs process analysis
- Dashboard lists all workflows with name, date, step count, status
- Workflow detail page shows: SOP tab, Process Map tab, Evidence tab, Report tab

**Acceptance criteria:**
- A valid session bundle uploaded via `/upload` produces a viewable workflow within 10 seconds
- An invalid bundle surfaces a visible error with a description of what failed
- Workflow detail page loads all four tabs without error for any valid workflow
- Uploaded data is user-scoped — a user cannot access another user's workflows

### F6: Authentication and Onboarding

**Must-have behavior:**
- User signs up with email and password
- Post-signup: guided path to API key generation and extension install
- Sample workflow is generated on first login to demonstrate the product before the user records anything

**Acceptance criteria:**
- Signup, login, and logout work without error
- Post-signup page links to extension install instructions
- Sample workflow is visible on the dashboard immediately after first login
- API key is copyable from the account settings page

---

## 6. Feature Inventory — Current State vs. Planned

Reflects the codebase as of 2026-04-12. Sources: ARCHITECTURE.md, CURRENT_STATE_MVP_GAPS.md, directory review.

| Feature | Status | Notes |
|---------|--------|-------|
| Chrome extension recording lifecycle | Built | Known issue: service worker termination mid-session loses event data |
| Live step feed (streaming segmentation) | Built | Streaming/batch parity requires explicit verification |
| Five-file session bundle export | Built | |
| Extension review screen (Map/SOP/Export tabs) | Built | |
| Extension-to-web upload (POST /api/upload) | Built | Auto-sync from extension is unverified; manual JSON upload is confirmed fallback |
| Web app dashboard | Built | |
| Web app workflow detail page | Built | |
| SOP generation | Built (process-engine) | Renderer exists; end-to-end functional verification required |
| Process map rendering | Built (React Flow, interactive) | Deterministic SVG renderer from project plan not implemented |
| Web app signup/login | Built | Email + password only; no OAuth |
| Sample workflow generation | Built (POST /api/sample-workflow) | |
| API key management | Built | |
| Billing infrastructure (Stripe) | Partially built | Models and UpgradeButton exist; webhook handler completeness unconfirmed |
| Team and collaboration UI | Schema built, UI partially built | Not in the Phase 1 user journey |
| Process families/groups/portfolio intelligence | Built in schema and UI | Phase 4 capability — requires large corpus; premature for beta |
| E2E tests (Playwright) | Not built | Explicit known gap per CLAUDE.md |
| Golden-file renderer regression tests | Not built | Explicit known gap per project plan |
| Chrome Web Store publishing | Unknown | Install page exists; store status unconfirmed |

---

## 7. User Stories

### US1 — First Recording

As an operations team lead, I want to record a workflow I do regularly in my browser so that I have a documented SOP I did not have to write manually.

**Acceptance criteria:**
- I can install the extension and record my first workflow without reading documentation
- Within 60 seconds of stopping the recording, I have a readable SOP with numbered steps
- Every SOP step traces to evidence events I can inspect

### US2 — SOP Export

As an operations team lead, I want to download a formatted SOP report so that I can share it with my team without additional editing.

**Acceptance criteria:**
- I can download a Workflow Report from the extension Export tab
- The report renders as a printable PDF via browser print
- The SOP section contains numbered steps, estimated duration, and the systems used

### US3 — Web Platform Workflow View

As an operations team lead, I want to see my recorded workflow in the web app so that I can access it from any device and share a link with a colleague.

**Acceptance criteria:**
- My workflow is visible in the web app dashboard after upload or sync
- I can view the SOP, process map, and evidence in the workflow detail page
- I can share the workflow via a generated share link

### US4 — Privacy Confidence

As a team lead recording workflows on internal tools, I want to know that no sensitive data is captured so that I can use the tool on production systems without security risk.

**Acceptance criteria:**
- Password fields never appear in any SOP, process map, or exported file
- The policy log is visible in the export and shows what was redacted and why
- The SOP evidence view shows `[redacted]` markers for detected sensitive fields

---

## 8. Success Metrics

### Beta Success Thresholds (5–15 users, 2–4 week beta)

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Users completing full activation (signup → install → record → SOP view) | 5 of 15 invited | PostHog activation funnel |
| Activation rate (signup → SOP viewed) | >= 30% | PostHog funnel |
| SOP quality (usable as-is or with minor edits, per user survey) | >= 50% of respondents | Post-session survey question |
| Second recording within 7 days of first | >= 25% of activating users | PostHog retention event |
| Workflow shared with a colleague | >= 2 users | Share token use tracked in DB |

**Beta gate rule:**
- All 5 met: proceed to open beta
- 3–4 met: iterate on the failing metric, re-test
- Fewer than 3 met: stop and diagnose — ICP is wrong, output quality is insufficient, or activation has critical friction

### Leading Indicators (track from Day 1 of beta)

- Time from signup to first SOP view (target: under 10 minutes)
- Recordings per user in first 7 days
- Upload success rate (uploads that produce a viewable workflow vs. errors)
- Sessions with zero derived steps (indicates capture failure)

### Baseline

No prior beta data. All targets reflect judgment from beta launch plan. Baselines will be established from the first 2-week cohort and carried forward.

---

## 9. Non-Goals — Phase 1

The following are explicitly out of scope. Any request to build these before Phase 1 exit criteria are met must be escalated to the product owner.

1. AI-generated SOP content (Phase 5)
2. Process families, groups, component detection, portfolio analytics (Phase 4)
3. Cross-run variant detection and multi-run intelligence (Phase 2)
4. Team collaboration features beyond single-user workflow sharing (Phase 3)
5. Enterprise pricing tier delivery — "Contact Sales" conversations must not be taken
6. OAuth / Google sign-in
7. Export integrations (Notion, Confluence, PDF-direct)
8. Command center, operational signal strips, bottleneck dashboards
9. Mobile browser support
10. Non-Chrome browser support

---

## 10. Technical Constraints

Current-state facts from ARCHITECTURE.md. These constrain what can be shipped in Phase 1.

| Constraint | Implication for Phase 1 |
|------------|------------------------|
| SQLite in production | User isolation enforced at application layer only; concurrent write throughput is limited |
| No async job queue | Process analysis runs synchronously in the request handler; large bundles may time out |
| Local filesystem for uploaded files | Single-instance deployment only; no horizontal scaling |
| Service worker session persistence gap | Raw events are in-memory only; a crashed service worker mid-session loses event data — this is a known Phase 1 priority |
| No E2E tests | Recording lifecycle reliability is untested at integration level — must be addressed before beta |
| Streaming and batch segmenters are separate implementations | Parity must be tested on every change; currently discipline-enforced |
| No AI layer | All outputs are deterministic; Claude API integration is Phase 5 only |

---

## 11. Open Questions

These must be resolved before or during beta. Each is a decision gap, not a known answer.

| # | Question | Urgency | Who Resolves |
|---|----------|---------|--------------|
| 1 | Is extension-to-web auto-sync (POST /api/upload triggered from extension) functional, or is manual JSON export the only path? | Critical | Engineering |
| 2 | Is the Chrome extension published to the Web Store, or is it install-by-ZIP only for beta? | Critical | Product/Engineering |
| 3 | Are SOP generation and process map rendering verified end-to-end (upload → artifact stored → detail page renders without error)? | Critical | Engineering |
| 4 | Is the first beta ICP operations team leads (documentation wedge) or compliance analysts (evidence wedge)? | High | Product |
| 5 | What is the user-visible behavior when the service worker is terminated mid-recording? Is the partial session surfaced or silently lost? | High | Engineering |
| 6 | Are streaming and batch segmentation outputs tested for parity against the same input sequence? | High | Engineering |
| 7 | Is Stripe billing connected end-to-end (checkout → webhook → subscription status update)? If not, billing UI must be removed or clearly marked coming-soon before beta invitations go out. | Medium | Engineering |

---

## Appendix: Phase 1 Exit Criteria

Phase 1 is not complete until all of the following pass. Source: docs/project-plan.md.

- [ ] A known fixture input produces identical output to golden files across consecutive runs
- [ ] Streaming segmentation output matches batch output for the same event sequence
- [ ] All Zod schema validators have 100% test coverage
- [ ] User can complete record → review → export in under 60 seconds after Stop
- [ ] Every derived step has non-null `boundary_reason` and `evidence_refs`
- [ ] Password fields never appear in any exported artifact
- [ ] Every redaction event has a corresponding `policy_log.json` entry
- [ ] Export fails with a visible error if the session bundle is malformed
- [ ] Side panel shows arming state within 1 second of Start click
