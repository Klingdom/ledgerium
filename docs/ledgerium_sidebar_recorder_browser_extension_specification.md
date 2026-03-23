# Ledgerium AI Sidebar Recorder Browser Extension Specification

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, security, implementation partners, QA, and stakeholders  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`, `ledgerium_technical_architecture_and_roadmap.md`, `ledgerium_core_data_model.md`

---

## 1. Purpose of this document

This document defines the canonical specification for the Ledgerium AI browser extension and sidebar recorder experience. It is intended to become the GitHub source of truth for how the recorder should behave, what it should capture, how it should present information to users, and how it should interact with the broader Ledgerium AI system.

The recorder is not a cosmetic shell. It is the front door to the product. It is the place where Ledgerium AI either earns or loses user trust.

The recorder must therefore satisfy five simultaneous goals:

1. **Make capture simple enough for everyday use.**
2. **Make capture trustworthy enough for enterprise and regulated environments.**
3. **Make captured behavior inspectable in real time.**
4. **Produce deterministic, structured evidence for downstream process intelligence.**
5. **Avoid surveillance patterns, ambiguity, and hidden system behavior.**

This specification covers:

- product role and design intent
- extension architecture
- sidebar UX and interaction model
- capture scope and event taxonomy
- real-time derived step behavior
- privacy, consent, and redaction requirements
- storage and export behavior
- non-functional requirements
- implementation guidance for MVP and near-term roadmap

---

## 2. Executive summary

Ledgerium AI should ship first as a **browser extension with a persistent side-panel recorder** that allows a user to explicitly start and stop a workflow recording session while staying inside their normal browser-based work.

The extension must:

- present a calm, enterprise-trust interface
- make recorder status unmistakable
- capture a bounded, policy-aware stream of browser and user interaction events
- normalize those events into a deterministic event model
- derive a live step feed in the sidebar
- preserve evidence for later process-map and SOP generation
- support pause, resume, review, export, and clear session controls

The sidebar should feel like a **guided process observer** rather than an intrusive monitoring tool. It should provide useful structure while showing its work.

The MVP recorder is optimized for browser-based workflows. It is not required to solve every desktop or native-application capture problem on day one.

---

## 3. Product role of the recorder

### 3.1 Why the recorder exists

Ledgerium AI turns real work into trusted process intelligence. The recorder exists because every downstream artifact depends on upstream evidence quality.

Without a disciplined recorder, the platform becomes just another guessing engine. With a disciplined recorder, the platform can generate auditable outputs that developers, operators, and leaders trust.

### 3.2 What the recorder is

The recorder is:

- a **user-initiated workflow evidence capture layer**
- a **sidebar UI for live session visibility**
- a **policy-aware event collection mechanism**
- a **real-time feed of structured workflow understanding**
- a **launch point for review and export**

### 3.3 What the recorder is not

The recorder is not:

- spyware
- a hidden background tracker
- a stealth employee monitoring tool
- a generic screen recorder by default
- an autonomous BPM engine by itself
- an LLM summarizer pretending to know what happened

### 3.4 Recorder success criteria

The recorder succeeds when a user can say:

- I knew exactly when recording was on.
- I could see what the system was recognizing.
- I could pause when needed.
- I understood what would and would not be captured.
- I could inspect the session before relying on outputs.
- The resulting JSON felt grounded in what I actually did.

---

## 4. Design principles

### 4.1 Trust before cleverness

The interface should favor clarity over flash. The recorder must never feel sneaky, deceptive, or theatrically “AI.”

### 4.2 Explicit user control

Recording should begin only through clear user intent. Stop, pause, resume, discard, and export actions must remain obvious and easy.

### 4.3 Evidence visible in motion

The sidebar should show live progress and derived step formation so users understand how the system is interpreting their actions.

### 4.4 Deterministic backbone

Core recorder behavior should be rule-driven:

- event detection
- event normalization
- capture eligibility filtering
- session framing
- early step boundary detection

### 4.5 Progressive disclosure

Users should not be overwhelmed, but deeper evidence should be inspectable when needed.

### 4.6 Privacy by architecture

Sensitive capture should be minimized before storage. Redaction and allow/deny rules should act as first-class system behavior, not as an afterthought.

### 4.7 Calm persistence

The recorder should remain visually stable during sessions. Avoid twitchy UI, excessive animations, and noisy feedback.

---

## 5. User experience goals

The sidebar recorder experience should optimize for the following outcomes.

### 5.1 Fast start

A user should be able to open the extension, understand its state, and start recording within seconds.

### 5.2 Ongoing confidence

During recording, the user should always know:

- whether recording is active
- whether the recorder is paused
- whether the current page or app is in scope
- how many steps or actions have been recognized
- whether sensitive capture is being filtered

### 5.3 Lightweight companionship

The recorder should feel present but non-disruptive. It should support work without becoming the center of attention.

### 5.4 High-confidence stop and review

At the end of a session, the user should feel that they can review the evidence, not just trust a black-box output.

### 5.5 Export readiness

The recorder should make it easy to produce structured outputs for process maps, SOP generation, and future submission flows.

---

## 6. Primary user jobs

### 6.1 Individual operator

- Record how I do a task.
- Avoid manual documentation.
- Create something reusable for others.
- Check that the system understood my work.

### 6.2 Team lead or manager

- Ask a team member to record a process.
- Review evidence-linked steps.
- Turn captured work into standardized SOPs.

### 6.3 Process improvement or transformation lead

- Capture real current-state behavior.
- Compare different runs later.
- Build automation-ready definitions from observed work.

### 6.4 Developer or implementation partner

- Depend on stable recorder contracts.
- Consume deterministic event and step output.
- Extend the product without breaking trust or provenance.

---

## 7. MVP product boundaries

### 7.1 In scope for MVP

The MVP recorder must support:

- Chromium-based browser extension packaging
- side panel UI
- explicit start/stop recording
- pause/resume
- session timer and state display
- browser-page context capture
- deterministic event collection for common browser interactions
- normalization of raw events into canonical event structures
- live derived step feed in sidebar
- in-session and post-session review of recognized steps
- JSON export
- clear discard/reset flow
- privacy controls sufficient for safe pilot use

### 7.2 Out of scope for MVP

The MVP recorder does not need to fully support:

- native desktop application capture
- full computer vision-based interpretation
- audio transcription as a required capture mode
- always-on organizational monitoring
- passive recording without user initiation
- fully collaborative shared live sessions
- multi-user co-recording inside a single session
- deep admin governance consoles
- auto-submission to a persistent cloud backend as a requirement

### 7.3 Near-term post-MVP extensions

Near-term expansion may include:

- Firefox support
- desktop helper or native app companion
- screenshot-on-demand evidence support
- richer field classification and semantic event labeling
- policy packs for enterprise environments
- session sync and cloud review
- variant comparison across multiple runs

---

## 8. System context and architecture

## 8.1 High-level recorder architecture

```text
User
  ↓
Browser UI + side panel
  ↓
Extension runtime
  ├─ side panel application
  ├─ background/service worker
  ├─ content scripts
  └─ storage adapters
  ↓
Capture pipeline
  ├─ event listeners
  ├─ page/app context collector
  ├─ policy filter + redaction layer
  ├─ normalization layer
  └─ live derivation layer
  ↓
Session artifacts
  ├─ raw events
  ├─ normalized events
  ├─ live run steps
  └─ exportable session bundle
```

## 8.2 Extension modules

The extension should be organized around the following modules.

### 8.2.1 Side panel application
Responsible for:

- UI rendering
- session controls
- live step feed
- review display
- export actions
- privacy/status messaging

### 8.2.2 Background service worker
Responsible for:

- session orchestration
- extension state coordination
- tab lifecycle handling
- messaging between content scripts and sidebar
- persistence coordination

### 8.2.3 Content scripts
Responsible for:

- page-level event capture
- DOM and interaction context extraction
- field sensitivity classification hooks
- page/app identification

### 8.2.4 Capture core
Responsible for:

- event intake
- event filtering
- normalization
- deduplication
- temporal buffering
- derivation trigger events

### 8.2.5 Storage adapters
Responsible for:

- ephemeral in-memory session buffering
- local persisted draft session state
- export package creation
- future sync mode compatibility

---

## 9. Runtime states

The extension must use a clear state machine. Hidden ambiguous states are not acceptable.

### 9.1 Primary recorder states

1. **idle** — extension available, not recording
2. **arming** — user initiated start, recorder preparing listeners and policy state
3. **recording** — actively collecting in-scope events
4. **paused** — session open but capture suspended
5. **stopping** — capture ending, final derivation and packaging in progress
6. **review_ready** — session completed and review/export available
7. **error** — recoverable or non-recoverable fault state

### 9.2 Required state transitions

- `idle -> arming -> recording`
- `recording -> paused -> recording`
- `recording -> stopping -> review_ready`
- `paused -> stopping -> review_ready`
- any state may go to `error` with visible explanation
- `review_ready -> idle` after discard, clear, or new session start

### 9.3 State invariants

- In `recording`, visible UI must indicate recording unmistakably.
- In `paused`, no new in-scope capture events should be committed except state and control actions.
- In `stopping`, user input should not create new workflow events for the session.
- In `review_ready`, the session must be internally consistent enough for export.

---

## 10. Sidebar UX specification

## 10.1 Visual tone

The sidebar must convey:

- enterprise trust
- clarity
- simplicity
- technical credibility
- absence of gimmicks

Recommended design characteristics:

- dark or neutral modern theme compatible with product brand
- strong hierarchy with restrained color usage
- rounded panels/cards where useful, but not playful consumer styling
- minimal motion
- clear labels over icon-only ambiguity

## 10.2 Layout zones

The sidebar should contain these primary zones.

### 10.2.1 Header zone

Should include:

- Ledgerium AI logo / wordmark lockup
- current recorder state
- concise trust/status line

Examples:

- `Ready to record`
- `Recording in this browser tab`
- `Paused — capture is temporarily off`

### 10.2.2 Session control zone

Primary controls:

- Start recording
- Pause
- Resume
- Stop recording
- Discard session

Secondary controls:

- View capture rules
- Privacy/help affordance
- Settings entry point

### 10.2.3 Session status zone

Should display:

- elapsed time
- event count or recognized action count
- recognized step count
- current page/app label
- pause indicator if active

### 10.2.4 Live process feed zone

This is the core area of the sidebar during recording.

Should show:

- recently recognized steps
- currently forming step/activity
- confidence or quality indicator where appropriate
- evidence snippets or anchors when expanded

### 10.2.5 Review / output zone

Available after stop, and optionally partially during recording.

Should allow:

- step review
- session summary
- export JSON
- send to downstream process map / SOP generation flow later

### 10.2.6 Footer zone

Should contain small but visible:

- privacy notice entry point
- version/build reference in settings or footer menu
- support / documentation links in future builds

---

## 11. Key sidebar screens

## 11.1 Idle screen

Purpose: orient the user before recording.

Must show:

- what the recorder does in one sentence
- clear start action
- current scope statement
- privacy/trust microcopy

Recommended core message:

> Record real workflow steps in this browser so Ledgerium AI can build evidence-linked process outputs.

Idle screen elements:

- primary CTA: `Start recording`
- helper text: what will be captured
- helper text: what will not be captured or how sensitive info is handled
- optional recent session access in later versions

## 11.2 Recording screen

Purpose: support active work with confidence.

Must show:

- active recording badge
- elapsed timer
- page/app label
- live feed of recognized steps
- pause and stop controls

The recording screen should prioritize **legibility over density**.

## 11.3 Paused screen or paused treatment

Purpose: reassure the user that collection is suspended.

Must show:

- large paused state indicator
- reminder that no workflow actions are being recorded
- easy resume and stop options

## 11.4 Stopping/finalizing screen

Purpose: communicate deterministic packaging rather than mysterious AI work.

Acceptable microcopy examples:

- `Finalizing your session`
- `Structuring captured events into reviewable steps`
- `Preparing exportable session data`

Avoid hype-heavy copy like “thinking,” “analyzing everything,” or magical claims.

## 11.5 Review-ready screen

Purpose: let the user inspect and trust the session.

Must show:

- session summary
- list of recognized steps
- total capture duration
- export action
- discard/reset action
- next-step actions if available in product shell

---

## 12. Control behavior specification

## 12.1 Start recording

When the user clicks Start:

1. validate extension permissions and current tab eligibility
2. load policy rules and redaction configuration
3. establish session ID and timestamps
4. activate content script listeners as needed
5. set visible state to `arming`, then `recording`
6. begin session timer
7. create initial session envelope in memory/local storage

Acceptance criteria:

- start action acknowledged immediately
- user sees visible state change within one second under normal conditions
- if recording cannot start, error reason is shown plainly

## 12.2 Pause

When the user clicks Pause:

- commit a pause marker to the session timeline
- stop capture listeners from generating recordable workflow events
- maintain UI state and session identity
- show strong paused state treatment

Acceptance criteria:

- events created during pause are not merged into workflow evidence
- pause/resume intervals remain visible in session metadata

## 12.3 Resume

When the user clicks Resume:

- commit resume marker
- restart in-scope listeners
- continue same session unless explicit split-session rules apply in future

## 12.4 Stop recording

When the user clicks Stop:

- stop new workflow event intake
- finalize pending buffers
- run deterministic end-of-session derivation
- create review-ready artifact bundle
- transition to `review_ready`

Acceptance criteria:

- stop should not silently discard buffered events
- final review should be available without requiring network connectivity in MVP local-first mode

## 12.5 Discard session

When the user discards:

- require confirmation
- delete local session buffers and artifacts unless export already occurred and user explicitly preserves them
- return UI to `idle`

---

## 13. Capture scope specification

## 13.1 Principle of scoped capture

The recorder should capture only what is needed to reconstruct process behavior with trust.

The system should prefer:

- structural interaction signals
n- page/app context
- timestamps
- sequence order

The system should be cautious with:

- freeform sensitive text
- hidden fields
- secrets and credentials
- personal data that is not needed for process understanding

## 13.2 Browser environment scope

MVP target environment:

- Chromium-based browsers
- primary support for Chrome and Edge class environments
- side panel-capable extension platform

## 13.3 Eligible pages

By default, the extension should capture only on pages where:

- the extension has permission
- the user has initiated a session
- the page is not explicitly blocked by browser rules or Ledgerium policy

## 13.4 Page categories

The recorder should classify pages into categories such as:

- standard web app page
- document-like page
- browser settings / protected page
- authentication page
- sensitive form page
- unsupported page

This classification should influence capture rules.

---

## 14. Event taxonomy

The recorder should separate **raw observed events** from **canonical normalized events**.

## 14.1 MVP raw event classes

Representative raw classes may include:

- tab activated
- URL changed
- page loaded
- SPA route changed
- click
- double click
- keydown
- input changed
- form submitted
- element focused
- element blurred
- scroll threshold reached
- file picker opened
- file selected metadata event
- copy or paste event metadata where policy allows
- pause/resume control events

## 14.2 Canonical normalized event types

The normalized model should provide stable types such as:

- `navigation.open_page`
- `navigation.route_change`
- `interaction.click`
- `interaction.select`
- `interaction.input_change`
- `interaction.submit`
- `interaction.upload_file`
- `interaction.download_file`
- `workflow.wait`
- `session.started`
- `session.paused`
- `session.resumed`
- `session.stopped`
- `system.redaction_applied`
- `system.capture_blocked`

## 14.3 Canonical event payload expectations

Each normalized event should capture, where applicable:

- event ID
- session ID
- timestamp
- event type
- tab/window context
- URL/domain or redacted page identity
- page title or redacted label
- application/page fingerprint
- target element role/type
- target label text when policy-safe
- field classification
- value metadata or redacted token
- actor source (`user`, `system`)
- capture policy outcome

## 14.4 Required discipline

The recorder must never confuse raw event data with already-interpreted business semantics. “User clicked submit button” is a recorder event. “User approved invoice” is a later derived interpretation and must be represented separately.

---

## 15. Event capture rules

## 15.1 Navigation events

Must capture:

- significant page load/open transitions
- meaningful route changes in single-page applications
- tab activation changes if relevant to session continuity

Should avoid over-capturing:

- hash changes that do not alter user workflow meaning
- ephemeral telemetry URLs or noise routes

## 15.2 Click events

Should capture clicks only when they are workflow-significant or plausibly contribute to step formation.

At minimum, the normalization layer should record:

- element role
- element label or nearby label when safe
- section/container hints
- page identity

## 15.3 Input changes

Should capture structure first, content second.

Preferred patterns:

- record that a field of type `search`, `text`, `dropdown`, `date`, or `checkbox` changed
- record field label and classification if safe
- store redacted or tokenized values for sensitive classes

## 15.4 Form submission

Form submission is usually highly meaningful and should receive special treatment. It often marks a probable step boundary or major sub-step completion.

## 15.5 Scroll behavior

Scrolling should generally be low priority and heavily filtered. Scroll should only become a meaningful event when it indicates a likely transition in task behavior, such as navigating a long document or evidence review panel.

## 15.6 Copy/paste behavior

Copy/paste capture should be optional and policy-sensitive. Even when enabled, the recorder should prefer metadata about the action rather than clipboard contents.

## 15.7 Keyboard capture

Full keystroke logging should not be an MVP default and should be avoided in ordinary operation. Instead, use keyboard events only where necessary to support structural understanding, such as form submission or shortcut-triggered actions.

---

## 16. Sensitive data handling and redaction

## 16.1 Non-negotiable principle

The recorder must minimize sensitive content capture before persistence whenever reasonably possible.

## 16.2 Sensitive classes

The recorder should support field/page sensitivity classes such as:

- password or secret
- token or API key
- payment information
- personal health information
- government ID
- employee ID / HR sensitive data
- legal privileged content
- personal contact data
- custom enterprise-defined sensitive categories

## 16.3 Required behaviors for sensitive classes

Depending on policy, the recorder should:

- block capture entirely
- capture structural metadata only
- replace values with redacted placeholders
- capture class labels without content
- log that redaction occurred

Example:

- allowed: `Edited field [Employee First Name]` with value redacted or omitted
- not allowed by default: raw personal data preserved in session artifact unless policy explicitly permits

## 16.4 Authentication surfaces

Pages or fields involved in login, password reset, MFA, or token handling should receive strongest protection. Default behavior should be to block or heavily redact credential-related capture.

## 16.5 Redaction transparency

Users should be able to see that redaction happened. The system should not silently pretend sensitive content was preserved when it was intentionally withheld.

---

## 17. Page and application identity model

To support process understanding without excessive dependence on fragile DOM details, the recorder should maintain a stable page/app identity abstraction.

Each meaningful page context should aim to derive:

- application label
- domain or tenant-safe identifier
- route or route template if possible
- page title or semantic label
- section or module label when available

Example conceptual page identity:

```json
{
  "application_label": "Workday",
  "domain": "example.workday.com",
  "route_template": "/inbox/task/:id",
  "page_label": "Candidate Review Task",
  "module_label": "Inbox"
}
```

This identity should support stable step naming and future process clustering.

---

## 18. Live derivation and step feed behavior

## 18.1 Why live derivation matters

The sidebar should not wait until the end of a session to show value. During recording, it should construct a cautious, evolving live feed of recognized steps.

This increases trust by making the system legible while work is happening.

## 18.2 Live step feed rules

The live feed should:

- group recent low-level events into provisional user-meaningful steps
- show the current forming step separately from completed steps where useful
- avoid overclaiming business meaning
- prefer stable action-oriented phrasing

Example step labels:

- `Opened candidate review task`
- `Updated status field`
- `Submitted approval form`
- `Downloaded report`

## 18.3 Provisional vs finalized steps

The UI may distinguish between:

- **forming / provisional step**
- **finalized recognized step**

A step becomes finalized when boundary conditions are met, such as:

- submission event
- navigation transition
- inactivity threshold
- transition to a distinct task cluster

## 18.4 Boundary triggers

Common step boundary triggers should include:

- form submit
- route/page change
- explicit major button action
- inactivity threshold exceeded
- user pause/stop

## 18.5 User trust requirement

The live feed must never present speculative narratives as fact. Confidence should be conservative.

---

## 19. Evidence drawer and inspection behavior

The sidebar should support an evidence inspection layer, whether in MVP or as a near-term enhancement.

Users should be able to inspect a recognized step and see, at minimum:

- contributing normalized events
- timestamps
- page/app context
- any redaction markers
- derivation rationale or boundary reason where available

This inspection layer is important for both users and developers debugging trust issues.

---

## 20. Session artifact specification

At minimum, the completed session should produce a structured artifact bundle containing:

- session metadata
- recorder configuration snapshot
- raw event log or filtered raw subset as policy allows
- normalized event log
- derived steps
- derived activities if available
- redaction / policy application log
- build and schema version metadata
- export manifest

Conceptually:

```text
Session Bundle
 ├── session.json
 ├── normalized_events.json
 ├── derived_steps.json
 ├── policy_log.json
 └── manifest.json
```

A single consolidated JSON export is acceptable in MVP if it preserves clear top-level separation.

---

## 21. Storage model for MVP

## 21.1 Local-first expectation

The MVP recorder should work in a local-first mode. A user should be able to record, review, and export without requiring always-on backend infrastructure.

## 21.2 Local storage responsibilities

Local storage should be used for:

- active session continuity
- crash recovery of incomplete sessions where feasible
- user preferences
- recent non-sensitive extension state

## 21.3 Storage safety principles

- do not leave unnecessary sensitive artifacts unprotected in local storage
- avoid permanent retention by default unless user explicitly saves or exports
- separate active session buffers from user settings

## 21.4 Future storage compatibility

The extension should be written so that future sync or upload flows can attach without rewriting the core recorder contracts.

---

## 22. Export behavior

## 22.1 MVP export requirements

The recorder must support export of a structured JSON artifact suitable for:

- process map generation
- SOP generation
- developer analysis
- manual submission workflows

## 22.2 Export naming

Exports should use stable, machine-safe naming such as:

`ledgerium-session-YYYYMMDD-HHMMSS.json`

## 22.3 Export metadata

Every export should include:

- schema version
- recorder build version
- export timestamp
- session ID
- policy mode
- redaction mode summary

## 22.4 Export integrity

The export pipeline should fail visibly if the session is malformed rather than quietly emitting corrupt or partial artifacts without notice.

---

## 23. Permissions and browser capabilities

The extension will likely require permissions such as:

- active tab or tabs access
- scripting/content script permissions
- storage
- side panel
- optional host permissions for eligible domains

The principle should be **minimal permissions necessary for explicit functionality**.

Permission requests should be explainable in product terms.

---

## 24. Error handling and recoverability

## 24.1 Error principles

Errors should be:

- visible
- understandable
- recoverable where possible
- non-destructive to valid session data

## 24.2 Common error cases

The recorder should gracefully handle:

- side panel initialization failure
- lost content script connection
- tab navigation to unsupported page
- permission denied
- local storage write failure
- session finalization failure
- schema validation failure

## 24.3 User-facing error copy

Error messages should explain what happened in plain language and tell the user whether their session can be recovered.

Examples:

- `Recording stopped because this page cannot be accessed by the extension.`
- `We could not finalize your session bundle. Your captured steps are still available for recovery.`

---

## 25. Performance requirements

The recorder must be lightweight enough that users can work normally while recording.

### 25.1 MVP targets

Recommended MVP targets:

- side panel state transition after start: under 1 second in typical conditions
- UI interaction latency: near-instant for local controls
- low CPU overhead during ordinary browsing workflows
- low memory growth during long sessions through streaming/buffering discipline

### 25.2 Long-session behavior

The recorder should handle meaningful sessions, including longer sessions, without severe degradation. Buffering strategies should avoid unbounded UI memory accumulation.

### 25.3 Backpressure strategy

For long sessions:

- persist finalized chunks when appropriate
- keep recent live events in memory
- retain summaries for UI while full event detail may be stored in structured buffers

---

## 26. Security requirements

The extension should be treated as security-sensitive software because it touches user workflows and may encounter sensitive enterprise contexts.

Required security practices include:

- minimal permissions
- strict message validation between extension components
- schema validation on event intake
- no arbitrary code execution
- no insecure remote code loading
- least-privilege access patterns
- explicit allow/deny controls for capture on domains or patterns

Any future cloud sync must also preserve strong encryption and trust boundaries.

---

## 27. Accessibility requirements

The sidebar recorder should be usable by a broad range of users.

At minimum, MVP should support:

- keyboard navigation
- screen-reader-friendly labeling
- sufficient contrast
- non-color-only status indicators
- focus visibility for controls

Recorder state should be understandable without relying solely on color.

---

## 28. Analytics and telemetry principles

Product telemetry about extension health may be useful, but it must never undermine the trust promise.

Telemetry should distinguish between:

- product health telemetry
- user workflow evidence

These are not the same thing and should not be mixed casually.

Health telemetry may include:

- extension start success/failure
- session finalization success/failure
- feature usage counts
- crash or error classes

Workflow evidence belongs to user session artifacts and must follow workflow privacy rules.

---

## 29. Suggested codebase structure

A practical repository structure for the recorder may look like:

```text
/apps
  /extension
    /src
      /background
      /content
      /sidepanel
      /shared
      /assets
/packages
  /capture-core
  /event-schema
  /policy-engine
  /segmentation-engine
  /ui-contracts
  /test-fixtures
/docs
  sidebar_recorder_browser_extension_specification.md
```

This supports modularity while keeping the extension as the primary executable app.

---

## 30. Suggested internal contracts

Stable contracts should be established early for:

- extension state messages
- session lifecycle commands
- normalized event schema
- live step schema
- policy decision schema
- export manifest schema

Examples of message types:

- `START_SESSION`
- `PAUSE_SESSION`
- `RESUME_SESSION`
- `STOP_SESSION`
- `SESSION_STATE_UPDATED`
- `NORMALIZED_EVENT_ADDED`
- `LIVE_STEP_UPDATED`
- `FINALIZATION_COMPLETE`
- `FINALIZATION_FAILED`

---

## 31. QA and test strategy

The recorder requires more than unit tests. It needs trust tests.

## 31.1 Unit tests

Should cover:

- event normalization
- redaction logic
- state machine transitions
- step boundary logic used in recorder live feed
- schema validation

## 31.2 Integration tests

Should cover:

- content script to background messaging
- background to side panel updates
- permission scenarios
- route change handling in SPAs
- session finalization

## 31.3 End-to-end tests

Should cover representative workflows such as:

- record simple form submission flow
- pause and resume mid-process
- navigate across multiple pages
- stop and export clean session bundle
- record on partially unsupported site

## 31.4 Trust-focused test cases

Must include cases like:

- sensitive fields are redacted correctly
- recorder status is always visible during active recording
- paused periods do not accumulate workflow evidence
- export provenance remains intact
- unsupported pages are communicated clearly

---

## 32. MVP acceptance criteria

The MVP sidebar recorder should not be considered complete until the following are true.

### Functional

- User can open side panel and start a session.
- User can pause, resume, and stop a session.
- Recorder captures supported browser interactions into normalized events.
- Sidebar shows a live step feed that updates during recording.
- Completed session can be reviewed and exported as structured JSON.

### Trust and UX

- Recorder state is unmistakable at all times.
- Privacy/redaction behavior is enforced and visible.
- User can discard a session.
- Product language does not misrepresent inference as fact.

### Technical

- Session artifacts validate against schema.
- State machine behavior is predictable.
- Extension handles ordinary navigation without losing coherence.
- Failure modes are surfaced clearly.

---

## 33. Open design decisions to resolve during implementation

A few decisions should be resolved explicitly during build rather than left implicit.

1. Whether to support optional screenshots in MVP or defer entirely.
2. Exact domain permission strategy: broad permissions vs guided allowlisting.
3. How much raw event detail to retain in default exports.
4. Whether long text input should be tokenized, truncated, or excluded by default.
5. Whether the review-ready step list is editable in MVP or read-only with later editing support.
6. Whether route-template inference lives in content scripts or normalization layer.

These decisions should be documented in ADRs once selected.

---

## 34. Recommended roadmap for the recorder

## Phase 1 — Trustworthy MVP recorder

Deliver:

- extension shell
- side panel UI
- session controls
- normalized event pipeline
- live step feed
- JSON export
- essential privacy protections

## Phase 2 — Better evidence and review

Deliver:

- evidence drawer
- richer event semantics
- improved review mode
- configurable redaction rules
- stronger crash recovery

## Phase 3 — Process intelligence acceleration

Deliver:

- tighter handoff to process-map generation
- SOP preview from session bundle
- multi-run comparison hooks
- smarter step clustering and confidence surfacing

## Phase 4 — Enterprise and platform expansion

Deliver:

- policy packs
- sync and shared review
- audit and governance features
- desktop companion / wider capture surface

---

## 35. Canonical implementation guidance

When ambiguity arises during development, default to the following order of preference:

1. protect user trust
2. preserve evidence quality
3. keep system behavior inspectable
4. prefer deterministic logic over opaque inference
5. keep the UI calm and comprehensible
6. expand capability only when provenance remains strong

The browser extension and sidebar recorder are where Ledgerium AI becomes real. If this layer is disciplined, the rest of the platform can compound value. If this layer is weak, every downstream artifact becomes suspect.

This recorder should therefore be built as a **truthful capture instrument** first and a convenient product surface second.

---

## 36. Summary

The Ledgerium AI sidebar recorder browser extension is the canonical capture surface for the product’s initial phase. It must provide explicit, privacy-aware, user-controlled recording of browser workflows through a stable side-panel experience that shows its work in real time.

Its job is to transform user actions into trustworthy structured evidence, not to dramatize AI. The extension should make reality inspectable and portable so that later process maps, SOPs, and process intelligence outputs rest on strong foundations.

