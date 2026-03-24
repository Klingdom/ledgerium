# Ledgerium AI — Deterministic Process Engine

## Purpose

This document defines the Deterministic Process Engine (DPE), the system responsible for transforming recorded event streams into structured workflows, process definitions, SOPs, and process maps.

It ensures that:
- workflows are reconstructed from evidence
- outputs are consistent and repeatable
- no generative guessing is used

---

## Scope

This document covers:
- transformation of events into steps
- workflow segmentation
- process definition generation
- deterministic rules and constraints
- normalization logic

This document does NOT cover:
- event capture (see event-capture-spec.md)
- UI rendering (see output rendering docs)
- analytics (see process-intelligence-layer-spec.md)

---

## Source of Truth Level

**Engine-Level Authority (High)**

Subordinate to:
- foundation_overview.md
- trust-and-privacy-contract.md
- event-schema.md

Authoritative over:
- SOP generation
- process map generation
- workflow reconstruction logic

---

## Definition

The Deterministic Process Engine is:

> A rule-based system that transforms structured event streams into reproducible workflows and process definitions without relying on probabilistic inference.

---

## Core Principle

> Same input → same output

Given identical event data, the engine must always produce identical:
- steps
- workflows
- process definitions

No randomness. No interpretation drift.

---

## Inputs

### Primary Input

- Event Stream (from recorder)

Each event includes:
- timestamp
- event type
- context
- target metadata
- outcome (if available)

---

### Secondary Inputs (Optional)

- configuration rules
- segmentation thresholds
- labeling heuristics

---

## Outputs

### 1. ProcessRun

Represents:
> A single observed execution of a workflow

Includes:
- ordered steps
- timing
- transitions

---

### 2. ProcessDefinition

Represents:
> The generalized version of a workflow

Includes:
- canonical steps
- normalized structure
- repeatable sequence

---

### 3. SOP

Human-readable instructions derived from ProcessDefinition.

---

### 4. Process Map

Graph representation:
- nodes = steps
- edges = transitions

---

## Transformation Pipeline

The engine operates in stages:

---

### Stage 1: Event Normalization

Input:
- raw event stream

Process:
- deduplicate events
- filter noise
- normalize structure
- apply sanitization

Output:
- normalized event stream

---

### Stage 2: Step Extraction

Goal:
Convert events into meaningful steps.

Rules:
- group related micro-events
- ignore non-meaningful events
- collapse redundant actions

Example:
- click → modal open → confirm
→ becomes one step: "Confirm action"

---

### Stage 3: Step Classification

Each step is classified as:

- Navigation
- Action
- Confirmation
- System Transition
- Error / Recovery

---

### Stage 4: Workflow Segmentation

Goal:
Split event stream into logical workflows.

Segmentation signals:
- long idle gaps
- major navigation changes
- domain/app switches
- explicit start/stop signals

---

### Stage 5: State Transition Mapping

Each step must map to:

- pre-state
- action
- post-state

If no state change is detected:
→ step may be flagged as incomplete or noise

---

### Stage 6: Step Labeling

Generate human-readable labels using:

Priority:
1. semantic UI label
2. action type
3. fallback template

Examples:
- "Click Create Opportunity"
- "Submit Form"
- "Navigate to Dashboard"

Constraints:
- no sensitive data
- no long text
- no user content

---

### Stage 7: ProcessRun Construction

Create ordered sequence:
- steps
- timestamps
- transitions

---

### Stage 8: ProcessDefinition Generation

Generalize ProcessRun into:

- canonical steps
- normalized sequence
- reusable definition

---

## Deterministic Rules

### R-DPE-001: No Generative Inference

The engine must NOT:
- guess missing steps
- invent actions
- hallucinate workflows

---

### R-DPE-002: Evidence-Based Only

Every step must map to:
- one or more recorded events

---

### R-DPE-003: Stable Ordering

Steps must be ordered strictly by:
- timestamp
- sequence index

---

### R-DPE-004: Idempotent Processing

Running the engine multiple times on the same data must yield identical results.

---

### R-DPE-005: Noise Filtering

System must remove:
- duplicate clicks
- rapid repeated events
- non-interactive DOM events

---

### R-DPE-006: Step Consolidation

Related events must be grouped into single steps when:
- they represent one logical action
- they occur within a short time window

---

### R-DPE-007: No Content Dependency

Step generation must not rely on:
- user-entered text
- document content

---

## Step Model

Each step includes:

- step_id
- step_type
- label
- source events
- timestamp range
- duration
- outcome (if known)

---

## Segmentation Rules

### Trigger Conditions

A new workflow begins when:

- recording starts
- long idle period exceeds threshold
- major application switch
- explicit user signal (future)

---

### Thresholds (Configurable)

- idle threshold (e.g., 60–120 seconds)
- domain switch sensitivity
- step grouping window

---

## Labeling System

### Requirements

- short
- action-oriented
- human-readable
- privacy-safe

---

### Fallback Strategy

If label cannot be determined:

- use generic templates:
  - "Click button"
  - "Submit form"
  - "Navigate page"

---

## Error Handling

### Missing State Change

If action has no observable outcome:

- mark as:
  - "unknown outcome"
  - or "no state change"

---

### Conflicting Signals

If multiple outcomes detected:

- prioritize:
  - explicit success indicators
  - then UI transitions

---

## Process Map Generation (Conceptual)

Nodes:
- steps

Edges:
- transitions between steps

Attributes:
- frequency
- timing
- sequence

---

## Constraints

- no probabilistic modeling
- no LLM dependency for core logic
- no hidden inference
- must be explainable

---

## Explainability Requirement

For every output, the system must be able to answer:

- which events produced this step?
- why was this step grouped?
- why was this workflow segmented here?

---

## Performance Considerations

- must handle long sessions
- must process efficiently
- must support incremental processing (future)

---

## Key Risks

### Over-Segmentation

Too many workflows created.

Mitigation:
- refine thresholds

---

### Under-Segmentation

Workflows merged incorrectly.

Mitigation:
- better boundary detection

---

### Ambiguous Steps

Unclear labels.

Mitigation:
- improved labeling rules

---

## Success Criteria

The engine is successful if:

- workflows are reproducible
- SOPs are accurate
- steps align with real behavior
- no hallucination occurs
- outputs are consistent across runs

---

## Dependencies

Depends on:
- event-schema.md
- event-capture-spec.md

Informs:
- SOP generation
- process map generation
- process intelligence layer

---

## Future Enhancements

- variant detection across runs
- best-path identification
- anomaly detection
- performance benchmarking

---

## Change Log

### v1.0 — Initial Definition
- defined deterministic processing model
- established transformation pipeline
- defined rules and constraints
