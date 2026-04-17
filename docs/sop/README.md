# Ledgerium SOP System

**Status:** Specification — implementation-ready
**Version:** 1.0
**Owner:** SOP-Expert (Documentation Architecture)
**Audience:** Product · Engineering · Design · Operations · Compliance

---

## What this is

A production specification for the three SOP templates that Ledgerium AI produces
from a workflow recording. The spec elevates the existing `OperatorSOP`,
`EnterpriseSOP`, and `DecisionSOP` TypeScript interfaces in
`packages/process-engine/src/templateTypes.ts` into a world-class documentation
system that is:

1. **Beautiful** — modern typography, scannable hierarchy, confident visual trust signals.
2. **Glanceable** — purpose, scope, and next action visible in under 15 seconds.
3. **Trust-building** — every claim is traceable to a source `event_id`.
4. **Universally loved** — the same family reads well to a frontline operator, a
   compliance officer, and a CEO.
5. **Production-ready** — an engineer can ship it this week from these specs.

This directory is the single source of truth for SOP design, schema,
transformation rules, quality scoring, and rendered examples.

---

## Why three templates, not one

One-size-fits-all SOPs fail because their readers have different jobs.
Ledgerium ships three templates in one design family. The selector in
`packages/process-engine/src/templateSelector.ts` chooses one automatically
from the observed recording; the user can override.

| Template | Audience | Voice | Primary job |
|----------|----------|-------|-------------|
| **Operator-Centric** | Frontline, new hires, trainees | Warm, direct, encouraging | Complete the task correctly, right now |
| **Enterprise** | Compliance, QA, audit, regulated teams | Precise, authoritative, versioned | Prove the process meets a standard |
| **Decision-Based** | Managers, executives, incident responders | Confident, outcome-oriented, branching | Pick the right path, fast |

All three derive from the same `ProcessOutput` and the same evidence. The
differences are in **framing, hierarchy, and tone** — not in the underlying
facts. This is Ledgerium's core promise: one recording, three trusted views.

---

## How it fits Ledgerium

```
Browser Extension
    ↓ (observed behavior)
CanonicalEvent[]                ← packages/schema-events
    ↓ (deterministic)
ProcessOutput                   ← packages/process-engine/src/processSession.ts
    ├─ ProcessRun
    ├─ ProcessDefinition
    ├─ ProcessMap
    └─ SOP (the structured core)
    ↓ (template dispatch)
RenderedSOP                     ← packages/process-engine/src/templates/sopTemplates.ts
    ├─ OperatorSOP
    ├─ EnterpriseSOP
    └─ DecisionSOP
    ↓ (presentation)
Markdown / PDF / Web / DOCX     ← packages/process-engine/src/templates/markdownRenderer.ts
```

Every arrow is deterministic. Every output traces back to `event_id`s.
This specification extends that chain without breaking it.

---

## Directory contents

| File | Purpose |
|------|---------|
| `README.md` | This file — index and system summary |
| `DESIGN_SYSTEM.md` | Unified visual and information design language across all three templates |
| `SCHEMA.md` | Canonical SOP schema aligned to existing TS types, with proposed additive fields |
| `TRANSFORMATION_RULES.md` | The `CanonicalEvent[] → SOP` pipeline, deterministic and evidence-traceable |
| `QUALITY_RUBRIC.md` | 0–100 weighted scoring system with production thresholds |
| `templates/01_operator_centric.md` | Full spec for the Frontline SOP |
| `templates/02_enterprise.md` | Full spec for the Governed SOP |
| `templates/03_decision_based.md` | Full spec for the Executive / Triage SOP |
| `examples/01_operator_centric_example.md` | Complete rendered example |
| `examples/02_enterprise_example.md` | Complete rendered example |
| `examples/03_decision_based_example.md` | Complete rendered example |
| `examples/source_recording.json` | The source `CanonicalEvent[]` recording all three examples derive from |
| `IMPLEMENTATION_NOTES.md` | What engineering needs to change, by file and function |
| `COLLABORATION_REQUESTS.md` | Prioritized handoffs to other specialist agents |

---

## Executive summary (for Phil)

- **What you get:** three elite SOP templates, one design family, all evidence-linked.
- **Quality bar:** every rendered SOP is scannable in under 15 seconds and trusted by a CEO.
- **Featured first in marketing:** the **Operator-Centric** template — it is the
  most emotionally resonant, the most universally useful, and the clearest proof
  that Ledgerium turns noisy recordings into documents people actually want to read.
- **Implementation horizon:** one engineer-week to reach production quality, given
  the existing code already handles ~70% of what these specs require.

---

## Design principles (summary)

These principles govern every decision in this directory. They derive from
Ledgerium's operating rules in `CLAUDE.md` and from EPA QA/G-6, ISO 9001, and
FDA SOP governance, modernized for a software-first platform.

1. **Reality before opinion.** The SOP describes what was observed, not what should be.
2. **Evidence before interpretation.** Every step links to `event_id`s.
3. **Determinism before abstraction.** Same recording → same SOP. Always.
4. **Human language, not recorder artifacts.** No "Click the div." Ever.
5. **Visible confidence.** Uncertainty is shown, not hidden.
6. **Traceability over convenience.** The source link is never optional.
7. **Earned sections only.** Every heading must earn its place by purpose.
8. **One family, three voices.** Shared design tokens; distinct editorial posture.

---

## How to read this directory if you have 10 minutes

1. `DESIGN_SYSTEM.md` — the shared visual and tonal spine (5 min).
2. `examples/01_operator_centric_example.md` — see the output (2 min).
3. `IMPLEMENTATION_NOTES.md` — what needs to change (3 min).

---

## How to read this directory if you have 1 hour

1. This README.
2. `DESIGN_SYSTEM.md`.
3. All three `templates/*.md` specs.
4. All three `examples/*.md`, side by side, with `examples/source_recording.json`
   open to see which `event_id`s each example cites.
5. `TRANSFORMATION_RULES.md` and `QUALITY_RUBRIC.md`.
6. `IMPLEMENTATION_NOTES.md` and `COLLABORATION_REQUESTS.md`.
