# Ledgerium AI — Foundation Overview

## Purpose

This document defines the foundational principles, philosophy, and non-negotiable constraints that govern Ledgerium AI.

It is the highest-level framing for:
- what we are building
- why it exists
- how it must behave
- what it must never become

All product, engineering, and design decisions must align with this document.

---

## Scope

This document covers:
- product philosophy
- core problem framing
- system principles
- privacy and trust posture
- definition of workflows and processes
- system boundaries

This document does NOT define:
- implementation details
- UI specifics
- code architecture

---

## Source of Truth Level

**Foundational (Highest Authority)**

If any lower-level document conflicts with this document, this document wins.

---

## Core Thesis

> Companies do not understand how work actually happens.

What organizations *think* their processes are:
- documented SOPs
- slide decks
- workshop outputs

What actually happens:
- fragmented steps across tools
- undocumented workarounds
- repeated manual effort
- inconsistent execution across users

This gap is the root cause of:
- failed automation
- failed AI adoption
- operational inefficiency
- poor visibility into execution

---

## Product Definition

Ledgerium AI is a:

> **Privacy-first, evidence-based process intelligence platform that records real workflows and deterministically generates process maps, SOPs, and insights.**

Key characteristics:
- captures **real user behavior**
- transforms behavior into **structured events**
- reconstructs workflows **deterministically (not generatively guessed)**
- produces:
  - SOPs
  - process maps
  - process metrics
  - workflow intelligence

---

## What Ledgerium Is NOT

Ledgerium is NOT:
- a screen recorder
- a session replay tool
- a keystroke logger
- an employee surveillance system
- a consulting workflow tool
- a diagramming tool based on user input

Ledgerium replaces:
- workshops
- interviews
- guesswork
- documentation theater

With:
> **direct observation of real execution**

---

## Core Principles

### 1. Evidence Over Opinion

All outputs must be derived from observed behavior, not assumptions.

No:
- inferred processes without evidence
- invented steps
- speculative workflows

---

### 2. Deterministic Over Generative

Given the same input, the system should produce the same output.

No:
- hallucinated steps
- inconsistent SOP generation
- probabilistic interpretations of workflows

---

### 3. Privacy First by Design

The system must minimize data collection while maximizing usefulness.

Non-negotiable:
- no content capture
- no typed text storage
- no sensitive data storage
- no hidden recording

Only capture:
- actions
- structure
- transitions
- timing

---

### 4. Transparency Builds Trust

Users must understand:
- what is being captured
- what is NOT being captured
- how data is used

System must:
- show recording state clearly
- display captured events in real time
- allow export and inspection

---

### 5. Minimum Viable Data

Capture the **least amount of data required** to reconstruct workflows.

This is a core design constraint, not an optimization.

---

### 6. Cross-System Reality

Workflows span:
- multiple applications
- multiple tabs
- multiple systems

The system must:
- track transitions across tools
- not assume single-system workflows

---

### 7. Process as a First-Class Object

The system must elevate processes into structured entities:
- ProcessRun (what happened)
- ProcessDefinition (what the process is)

Processes must be:
- composable
- comparable
- measurable

---

## Definition of a Workflow

A workflow is:

> A sequence of user actions across one or more systems that produces a meaningful outcome.

A valid workflow must include:
- a starting condition
- a sequence of steps
- a resulting state change or outcome

---

## Definition of a Step

A step is:

> A user action or system transition that contributes to progress in a workflow.

Examples:
- clicking “Create Opportunity”
- submitting a form
- navigating to a new page
- confirming a modal

Not steps:
- typing text
- passive scrolling
- idle time without context

---

## Definition of State Change

A state change is:

> A verifiable outcome that results from an action.

Examples:
- record created
- status updated
- modal confirmed
- page transitioned

Without state change, actions are incomplete.

---

## System Architecture (Conceptual)

Ledgerium consists of three core layers:

### 1. Capture Layer (Recorder)

Captures structured user behavior:
- navigation
- actions
- context
- timing

Outputs:
- structured event stream (JSON)

---

### 2. Deterministic Engine

Transforms event streams into:
- steps
- workflows
- process definitions

Applies:
- segmentation rules
- grouping logic
- normalization

---

### 3. Output Layer

Generates:
- SOPs
- process maps
- metrics
- insights

Outputs must be:
- consistent
- human-readable
- traceable to source events

---

## Data Philosophy

The system stores:

- structured events
- metadata about actions
- timing information
- sanitized context

The system does NOT store:
- user-generated content
- sensitive field values
- raw screen data

---

## Privacy Contract (Summary)

The system must NEVER:
- record typed input values
- record passwords
- capture clipboard contents
- capture full documents, emails, or chats
- store raw screen recordings

The system must ALWAYS:
- sanitize URLs
- redact sensitive patterns
- provide visibility into captured data

---

## Trust Model

Trust is a core product feature.

Trust is achieved by:
- minimizing data capture
- making capture visible
- enabling user control
- avoiding ambiguity

If users feel monitored, the product has failed.

---

## Key Differentiation

Most tools:
- capture everything (screen recording)
- rely on AI to interpret loosely

Ledgerium:
- captures only structured signals
- uses deterministic logic to reconstruct workflows

This enables:
- higher trust
- higher accuracy
- reproducibility

---

## System Boundaries

Ledgerium focuses on:
- workflow capture
- process reconstruction
- process intelligence

Ledgerium does NOT:
- automate tasks directly (initially)
- execute workflows
- modify user systems

---

## Future Direction

The long-term evolution:

1. Capture → workflows  
2. Workflows → process definitions  
3. Process definitions → metrics  
4. Metrics → optimization  
5. Optimization → automation  
6. Automation → AI agents  

Ledgerium becomes the foundation layer for:
> **AI operating on real workflows instead of assumptions**

---

## Non-Negotiable Constraints

- No content capture
- No violation of privacy contract
- No deviation from schema without doc update
- No generative guessing of workflows
- No hidden system behavior

---

## Dependencies

This document governs and informs:

- event-capture-spec.md
- privacy-rules.md
- event-schema.md
- deterministic-process-engine.md
- process-definition-spec.md

---

## Change Log

### v1.0 — Initial Foundation
- Defined product philosophy
- Established core principles
- Defined workflow, step, and state change
- Established privacy-first constraints
- Defined system layers
