# Ledgerium AI — UI/UX Visualization Specification (Canonical)

## Status
CANONICAL — UI/UX VISUALIZATION SPEC

---

# 1. Purpose

This document defines how Ledgerium AI visualizes recorded workflows across all user and developer experiences.

The goal is to create a trust-first, evidence-backed visualization system that transforms raw event data into:
- clear workflows
- actionable steps
- process maps
- SOP-ready structures
- inspectable evidence

---

# 2. Core Visualization Philosophy

Ledgerium UI must follow:

1. Progressive disclosure (simple → detailed → raw)
2. Evidence-first transparency
3. Human-readable before technical
4. Deterministic consistency
5. Minimal cognitive load

---

# 3. Visualization Layers (Canonical Model)

## Layer 1 — Process Summary (Executive View)
- Node-based process map
- Shows major stages only

## Layer 2 — Workflow Steps (Primary View)
- Sequential step cards
- Human-readable actions

## Layer 3 — Evidence (Developer/Trust View)
- Raw normalized events
- Fully inspectable

---

# 4. Primary UI Components

## 4.1 Process Map

- Node-edge diagram
- Nodes = steps or stages
- Edges = transitions

Node fields:
- title
- node type
- duration
- confidence

Node types:
- action
- navigation
- decision
- system
- start/end

---

## 4.2 Workflow Step List

Vertical card list.

Each card:
- step number
- title
- app/context badge
- duration
- confidence
- expand toggle

---

## 4.3 Step Detail Drawer

Opens on click.

Includes:
- event list
- timestamps
- selectors
- labels
- context (URL, page)
- SOP candidate
- process map hints

---

## 4.4 Event Debug Table

Columns:
- timestamp
- type
- selector
- label
- context
- step id
- confidence

Supports filtering and sorting.

---

# 5. Timeline View

Horizontal timeline showing:
- app transitions
- navigation points
- idle gaps

---

# 6. Step Rules

## Titles
Action-based and deterministic:
- Click [Button]
- Enter [Field]
- Select [Option]
- Upload File
- Submit Form

## Boundaries
New step when:
- navigation
- submit
- modal open/close
- idle threshold
- context change

---

# 7. Visual System

Colors:
- action: primary
- navigation: blue
- decision: orange
- system: gray
- error: red

Confidence:
- high: green
- medium: yellow
- low: red

---

# 8. Interaction Model

- expand/collapse steps
- hover highlights related elements
- click opens detail drawer

---

# 9. Recorder Sidebar

While recording:
- live events
- active step

After recording:
- step list
- event inspection
- export options

---

# 10. Export Requirements

Support:
- JSON
- SOP
- process map
- step summary

---

# 11. Trust Requirements

UI must show:
- captured events
- filtered events
- grouping logic
- confidence

---

# 12. Error Handling Visualization

Show:
- low confidence
- missing selectors
- grouping issues
- dropped events

---

# 13. Future Extensions

- multi-session comparison
- process portfolio
- variance detection

---

# FINAL NOTE

This visualization layer is the interface to trust.

Users must be able to:
- understand workflows
- inspect evidence
- trust outputs
