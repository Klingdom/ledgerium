# Ledgerium AI — Product Overview

## Purpose

This document defines the Ledgerium AI product in concrete terms:
- what it does
- who it is for
- how it works end-to-end
- what value it delivers

It translates the foundation into an actionable product definition.

---

## Scope

This document covers:
- product definition
- target users and personas
- core use cases
- product capabilities
- end-to-end workflow
- value proposition
- product tiers and packaging

This document does NOT define:
- detailed engineering implementation
- low-level UI specifications
- schema definitions

---

## Source of Truth Level

**Product-Level Authority**

Subordinate to:
- foundation_overview.md
- trust-and-privacy-contract.md

Authoritative over:
- feature specs
- UI flows
- marketing positioning

---

## Product Definition

Ledgerium AI is a:

> **Privacy-first workflow capture and process intelligence platform that records real user behavior and deterministically generates SOPs, process maps, and operational insights.**

It replaces:
- interviews
- workshops
- guesswork

With:
> **direct observation of how work actually happens**

---

## Core Product Loop

The product is built around a simple loop:

1. Record real workflow activity  
2. Structure behavior into events  
3. Transform events into workflows  
4. Generate outputs (SOPs, maps, insights)  
5. Analyze and improve processes  

This loop is the foundation of all product functionality.

---

## Target Users

### 1. Operators (Primary User)

Examples:
- sales reps
- customer success managers
- operations analysts
- support agents

Needs:
- document how work is done
- reduce manual documentation effort
- create SOPs quickly

Behavior:
- performs workflows daily
- closest to real process execution

---

### 2. Managers (Secondary User)

Examples:
- sales managers
- operations leaders
- CX leaders

Needs:
- understand how work is actually performed
- identify inefficiencies
- standardize processes

---

### 3. Executives (Tertiary User)

Examples:
- COO
- Head of Operations
- VP Sales

Needs:
- visibility into process execution
- confidence in operational consistency
- foundation for automation and AI

---

## Core Use Cases

### Use Case 1: SOP Generation

User records a workflow:
- closing a deal
- onboarding a customer
- processing a ticket

System generates:
- step-by-step SOP
- structured workflow definition

---

### Use Case 2: Process Mapping

From recorded sessions:
- system creates process maps
- identifies steps and transitions
- shows cross-system flow

---

### Use Case 3: Workflow Discovery

Organizations discover:
- undocumented steps
- hidden dependencies
- tool switching patterns

---

### Use Case 4: Process Optimization

System identifies:
- repeated actions
- bottlenecks
- inefficiencies
- rework loops

---

### Use Case 5: Standardization

Compare:
- how different users perform the same workflow

Output:
- best-practice process definition

---

## Core Product Components

### 1. Universal Recorder (Browser Extension)

Captures:
- navigation events
- user actions
- UI interactions
- state changes
- timing

Key characteristics:
- privacy-first
- no content capture
- real-time event visibility

Output:
- structured session JSON

---

### 2. Event Processing Layer

Transforms:
- raw captured events
→ normalized event stream

Applies:
- sanitization
- deduplication
- normalization

---

### 3. Deterministic Process Engine

Transforms:
- event stream
→ workflows and steps

Produces:
- ProcessRun (what happened)
- ProcessDefinition (what the process is)

Applies:
- segmentation rules
- grouping logic
- step classification

---

### 4. Output Generation Layer

Generates:

#### SOPs
- step-by-step instructions
- human-readable
- structured

#### Process Maps
- visual representation
- sequence of steps
- system transitions

#### Metrics
- time per step
- frequency
- bottlenecks

---

### 5. Process Intelligence Layer (Post-MVP)

Adds:
- aggregation across users
- variant detection
- performance comparison
- drift detection

---

## End-to-End Product Flow

### Step 1: Start Recording

User:
- opens browser extension
- clicks “Start Recording”

System:
- begins capturing events
- displays live event stream

---

### Step 2: Perform Workflow

User:
- completes real task

System captures:
- actions
- navigation
- state changes
- timing

---

### Step 3: Stop Recording

User:
- clicks “Stop Recording”

System:
- finalizes session
- prepares structured output

---

### Step 4: Generate Outputs

System produces:
- SOP
- process map
- session JSON

---

### Step 5: Review and Export

User can:
- inspect captured steps
- export JSON
- use SOPs internally

---

## Key Value Propositions

### 1. No More Guesswork

Instead of:
- interviews
- workshops
- assumptions

Users get:
- real execution data

---

### 2. Instant SOP Creation

From:
- hours/days of work

To:
- minutes

---

### 3. Privacy-First by Design

Unlike competitors:
- no screen recording
- no sensitive data capture

---

### 4. Deterministic Outputs

Outputs are:
- consistent
- repeatable
- traceable

---

### 5. Cross-System Visibility

Captures workflows across:
- multiple tools
- multiple tabs
- real environments

---

## Product Tiers

### Free Tier

Capabilities:
- record sessions
- export JSON
- limited SOP generation

Purpose:
- onboarding
- individual users
- proof of value

---

### Pro Tier

Capabilities:
- unlimited recordings
- full SOP generation
- process maps
- basic metrics

Target:
- individuals and small teams

---

### Enterprise Tier

Capabilities:
- multi-user aggregation
- process portfolio
- governance
- security controls
- advanced analytics

Target:
- large organizations

---

## Competitive Positioning

### Traditional Approach

- consultants
- workshops
- documentation exercises

Problems:
- slow
- expensive
- inaccurate

---

### Existing Tools

#### Screen Recording Tools
- capture everything
- low structure
- privacy concerns

#### Process Mining Tools
- rely on system logs
- miss user behavior
- limited context

---

### Ledgerium Advantage

- captures real user workflows
- structured event model
- deterministic outputs
- privacy-first

---

## Product Constraints

Non-negotiable:

- no content capture
- no hidden recording
- no violation of privacy contract
- no generative guessing of workflows
- no schema drift without doc update

---

## Success Metrics

### User-Level

- time to first SOP
- number of recordings
- repeat usage

---

### Product-Level

- SOP accuracy
- workflow completeness
- event capture fidelity

---

### Business-Level

- conversion to paid plans
- enterprise adoption
- retention

---

## Dependencies

This document depends on:
- foundation_overview.md
- trust-and-privacy-contract.md

This document informs:
- event-capture-spec.md
- UI/UX specifications
- pricing page
- marketing messaging

---

## Future Expansion

Planned evolution:

- AI-assisted process optimization
- automated workflow recommendations
- integration with automation tools
- agent-driven execution

---

## Change Log

### v1.0 — Initial Product Definition
- defined users and use cases
- defined core components
- defined product loop
- established pricing tiers
- aligned with foundation principles
