# Session JSON Viewer Layout Spec (v1)

A read-only viewer that lets users verify what was captured.

## Core UX promise
**What you see is the captured log.**
Summaries are clearly labeled and never replace the raw data.

## Layout
- Sticky header: title + "Read-only. Time-stamped. Uninterpreted."
- Left panel: metadata + search + filters
- Right panel: Events (default) + Raw JSON toggle

## Events view
- Virtualized list
- Row columns: Time | Actor | Type | Confidence (numeric only)
- Expand row for payload snippet + evidence refs

## Raw JSON view
- Monospace block
- Copy + Download actions

