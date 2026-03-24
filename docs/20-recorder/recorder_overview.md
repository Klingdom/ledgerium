# Ledgerium AI — Recorder Overview

## Purpose

This document defines the Universal Recorder, the entry point of the Ledgerium AI system.

It explains:
- what the recorder is
- what it captures
- how it behaves
- how it enforces privacy
- how it produces structured workflow data

The recorder is the **source of truth for all downstream outputs**.

---

## Scope

This document covers:
- recorder definition and responsibilities
- capture model and event categories
- recording lifecycle
- privacy model and constraints
- system boundaries
- high-level architecture

This document does NOT define:
- detailed event schema (see event-schema.md)
- exact capture rules (see event-capture-spec.md)
- UI pixel-level design (see ui-ux-spec.md)

---

## Source of Truth Level

**Recorder-Level Authority**

Subordinate to:
- foundation_overview.md
- trust-and-privacy-contract.md

Authoritative over:
- event capture implementation
- extension behavior
- recording lifecycle logic

---

## Definition

The Universal Recorder is:

> A privacy-first browser-based capture system that records structured user behavior across applications and transforms it into deterministic workflow data.

It captures:
- actions
- context
- transitions
- timing

It does NOT capture:
- content
- user data
- screen recordings

---

## Role in the System

The recorder is the **first and most critical layer** of Ledgerium.

It feeds:
- deterministic process engine
- SOP generation
- process maps
- process intelligence

If the recorder is wrong:
→ everything downstream is wrong

---

## Core Responsibilities

### 1. Capture Real User Behavior

Record what users actually do:
- clicks
- navigation
- system transitions

Not what they say they do.

---

### 2. Produce Structured Events

Convert behavior into:
- normalized
- consistent
- privacy-safe events

---

### 3. Preserve Context Without Content

Capture:
- where actions occur
- what systems are involved

Without capturing:
- sensitive data
- user-generated content

---

### 4. Enable Deterministic Reconstruction

Events must support:
- step generation
- workflow segmentation
- process definition

---

### 5. Maintain User Trust

Recorder must:
- be visible
- be understandable
- be controllable

---

## Core Capture Model

The recorder captures **six categories of behavior**.

---

### 1. Navigation Events

Capture:
- URL changes
- route changes (SPA)
- tab switches
- window focus/blur
- page visibility

Purpose:
- define workflow phases
- detect cross-system transitions

---

### 2. User Action Events

Capture:
- clicks
- form submissions (event only)
- key intent signals (Enter, Escape)
- menu selections

Do NOT capture:
- typed text
- keystroke sequences

Purpose:
- define workflow steps

---

### 3. UI Interaction Metadata

Capture:
- element type
- semantic label (safe)
- role (button, input, etc.)
- selector fingerprint

Purpose:
- enable human-readable steps
- support deterministic mapping

---

### 4. State Change Events

Capture:
- page transitions
- modal open/close
- success/failure indicators
- object creation/update (metadata only)
- error states

Purpose:
- validate outcomes
- distinguish intent vs result

---

### 5. Timing and Sequence

Capture:
- timestamps
- time between events
- idle periods
- repeated actions

Purpose:
- expose inefficiencies
- identify loops and delays

---

### 6. Session Metadata

Capture:
- session ID
- application/domain
- sanitized page context
- environment (if known)

Purpose:
- contextualize workflows

---

## Recording Lifecycle

### 1. Idle State

Recorder is inactive.

No data is captured.

---

### 2. Recording Started

User explicitly clicks “Start Recording”.

System:
- initializes session
- generates session ID
- begins event capture

---

### 3. Active Recording

System:
- captures events in real time
- displays events in UI
- structures data continuously

---

### 4. Paused (Optional)

User pauses recording.

System:
- stops capture
- preserves session state

---

### 5. Recording Stopped

User clicks “Stop Recording”.

System:
- finalizes event stream
- prepares output

---

### 6. Output Generated

System produces:
- session JSON
- structured event stream

Downstream systems generate:
- SOPs
- process maps

---

## Privacy Model

Privacy is enforced at the recorder level.

---

### Non-Negotiable Rules

The recorder must NEVER capture:

- typed input values
- passwords
- clipboard data
- email bodies
- document content
- chat messages
- screenshots or video

---

### Allowed Data

The recorder captures:

- actions (click, submit)
- structure (button, form)
- context (page, app)
- transitions (navigation, state change)
- timing

---

### Sanitization

All captured data must be sanitized:

- remove query parameters from URLs
- normalize IDs (e.g., /user/123 → /user/:id)
- filter sensitive labels
- truncate long text

---

### Redaction

System must:
- detect sensitive patterns
- remove or mask risky data
- support domain exclusions

---

## Trust and Transparency

The recorder must:

### 1. Show Recording State

- clear visual indicator
- always visible when active

---

### 2. Show Captured Data

- live event stream
- human-readable format

---

### 3. Allow User Control

- start/stop recording
- pause
- export data

---

### 4. Avoid Hidden Behavior

No:
- background recording without consent
- hidden data collection

---

## Output

The recorder produces:

### 1. Event Stream

Structured sequence of events:
- normalized
- timestamped
- privacy-safe

---

### 2. Session JSON

Complete representation of:
- session metadata
- event sequence

---

### Output Characteristics

Must be:
- deterministic
- complete enough for reconstruction
- free of sensitive data

---

## System Boundaries

The recorder:

### Does

- capture behavior
- structure events
- provide session output

---

### Does NOT

- generate SOPs
- create process maps
- perform analytics
- store long-term data (by default)

---

## Architecture (Conceptual)

### Components

1. Content Script
- captures browser events
- extracts metadata

2. Background / Service Worker
- manages session state
- coordinates messaging

3. Side Panel UI
- displays event stream
- controls recording

4. Event Pipeline
- normalization
- sanitization
- sequencing

---

## Design Constraints

- must not degrade browser performance
- must work across modern web apps
- must handle SPAs
- must be resilient to DOM changes
- must minimize data payload size

---

## Key Risks

### 1. Over-Capture

Risk:
- capturing too much data
- violating privacy

Mitigation:
- strict rules
- sanitization layer

---

### 2. Under-Capture

Risk:
- missing critical steps
- incomplete workflows

Mitigation:
- focus on intent + state change

---

### 3. Ambiguous Labels

Risk:
- unclear step descriptions

Mitigation:
- semantic extraction rules
- fallback labeling

---

### 4. Performance Impact

Risk:
- slowing down browser

Mitigation:
- lightweight listeners
- event filtering

---

## Success Criteria

The recorder is successful if:

- workflows can be reconstructed deterministically
- SOPs can be generated accurately
- no sensitive data is captured
- users trust the system
- performance impact is negligible

---

## Dependencies

This document informs:
- event-capture-spec.md
- event-schema.md
- session-lifecycle-spec.md
- UI/UX specifications

Depends on:
- foundation_overview.md
- trust-and-privacy-contract.md

---

## Change Log

### v1.0 — Initial Recorder Definition
- defined capture model
- defined lifecycle
- established privacy constraints
- defined system role
