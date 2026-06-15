# R-D Copy Pack — Stakeholder Export + Positioning Polish
**Ledgerium AI · Growth Strategist · 2026-06-14**
**Surface:** `WorkflowReportPage.tsx` + `workflows/[id]/page.tsx`
**Scope:** R-D deliverables — Print/Save-as-PDF export, evidence-linked header badge, metadata footer, report title framing, micro-copy improvements, honesty guardrails.

---

## 1. "Evidence-linked" header badge

### Badge label (short; rendered as an inline chip beside the report title)

```
Evidence-linked
```

Rationale: two words, noun-adjective, category-establishing. Mirrors the competitive positioning ("Evidence-linked AI recommendations" per AI Vision Review moat M1). No verb, no claim — it names the report's provenance property, not a promise.

### Hover / tooltip text (appears on pointer-over of the badge chip)

```
Every figure on this report is computed from your recorded runs — observed behavior only. Nothing is modeled, inferred, or estimated from external benchmarks.
```

Rationale: three clauses do three jobs. Clause 1 anchors to "your" data (personal relevance). Clause 2 states the positive ("observed behavior only"). Clause 3 closes the implied question ("does this include AI estimates?") with an explicit no. Stays under 200 characters for comfortable tooltip rendering.

**Alternate (tighter, 140 chars):**

```
Every figure traces to recorded events. No benchmarks, no estimates — only what was observed in your runs.
```

Recommendation: use the alternate for tooltip character-count constraints; use the full version for a hover card / popover.

---

## 2. Export buttons

### Primary export button (Print / Save as PDF)

**Button label:**

```
Save as PDF
```

**Helper text shown beneath or beside the button (optional; renders when the Report tab is active):**

```
Stakeholder-ready — verdict, scorecard, and key findings on one page.
```

Rationale: "Stakeholder-ready" does the positioning work without being a claim. The parenthetical tells the recipient what they are getting in a single glance. "Stakeholder-ready" is also the exact language the competitive benchmark cites (PDF = stakeholder lingua franca).

**Tooltip / aria-label for the button:**

```
Save this report as a PDF — includes verdict, scorecard, and evidence footer
```

### Secondary export: relabelling the existing raw-JSON button

Current label: `JSON` (with FileJson icon)

**New label:**

```
Download data (JSON)
```

**Tooltip / aria-label:**

```
Download the raw recorded-event data for this workflow as JSON
```

Rationale: "Download data (JSON)" is honest about what it is — raw data, not a report. The parenthetical keeps the format visible for technical recipients without making it the primary label. This removes the ambiguity between the two export actions (one is a formatted document, one is raw data).

---

## 3. Print / PDF metadata footer

The footer prints at the bottom of every PDF page. It must do three things: identify the source of truth, bound the analysis period, and pre-empt the single most common stakeholder objection ("how was this calculated?").

### Multi-run variant (N >= 2 recorded runs)

```
Generated from [N] recorded runs · [earliest date] – [latest date] · Ledgerium AI
All figures derived from observed behavior — no benchmarks, no modeled estimations.
```

Example with real values:

```
Generated from 16 recorded runs · 14 Mar 2026 – 10 Jun 2026 · Ledgerium AI
All figures derived from observed behavior — no benchmarks, no modeled estimations.
```

### Single-run variant (N = 1 recorded run)

```
Generated from 1 recorded run · [date] · Ledgerium AI
All figures reflect a single observed session — record again to enable cross-run analysis.
```

Rationale for the single-run variant: the honesty invariant is absolute. A single-run report cannot make cross-run claims (CV, variants, sequence stability). The footer signals this proactively so no stakeholder is misled by figures that appear definitive but rest on N=1. This also gently drives the activation CTA ("record again") without turning the footer into marketing copy.

### On the second page (if the PDF spans two pages)

```
Ledgerium AI · Process Intelligence Report · [Workflow title] · [date] · Page [N] of [N]
Figures are deterministic — the same recorded runs always produce the same output.
```

Rationale: the second page needs document identity (workflow name + date). The second line answers a stakeholder question that often arises after sharing: "can I reproduce this?" Yes, deterministically.

---

## 4. Report title framing

### Page-level h1 (the single h1 owner is `page.tsx`)

The current page title is the workflow name only. For the Report tab, the h1 should frame the document type:

```
Process Intelligence Report
```

Sub-label directly below (smaller text, not a heading):

```
[Workflow title]
```

Rationale: separating the document type from the workflow name makes the report scannable as a document category, which matters when stakeholders receive multiple PDFs. It mirrors the competitive benchmark ("Process Intelligence Report: [Workflow]" cited in COMPETITIVE_REPORT_BENCHMARK.md item 10).

**Full combined heading treatment (when rendered as a single block):**

```
Process Intelligence Report
[Workflow title]
```

### Report sub-header (rendered directly below the title, above the Verdict card)

**Multi-run:**

```
Based on [N] recorded runs · Evidence-linked · [date range]
```

Example:

```
Based on 16 recorded runs · Evidence-linked · Mar – Jun 2026
```

**Single-run:**

```
Based on 1 recorded run · Evidence-linked · [date]
```

Example:

```
Based on 1 recorded run · Evidence-linked · 10 Jun 2026
```

Rationale: the sub-header gives any reader who skips the footer an immediate sense of the evidence basis. "Evidence-linked" in the sub-header and the badge reinforce each other without being redundant — the badge names the property, the sub-header contextualizes it with the run count.

---

## 5. Micro-copy improvements on the report body

These five changes reinforce the evidence-linked/deterministic differentiator without requiring new data or new sections. All are drop-in replacements for existing strings.

### 5a. Verdict section label

**Current:**

```
Verdict
```

**Replace with:**

```
Observed verdict
```

Rationale: adds one word that preempts the natural reader question "whose verdict?" The answer is: the recorded runs. The word "observed" links the verdict to the evidence-linked badge above it. Do not use "AI verdict" — the verdict is template-based (deterministic), not LLM-generated, and the honesty invariant prohibits implying otherwise.

### 5b. Consistency gauge / CV interpretation footnote

The current CV interpretation reads, e.g.: `low variance · CV ≥ 0.50 = high variance`

**Replace footnote with:**

```
Based on observed run-to-run variation — not a defined target or benchmark.
```

Rationale: this single line does the work that the competitive benchmark recommends ("Consistency-score gauge — 'based on observed behavior, not a defined target'"). It closes the question every process owner has when they see a consistency score: "consistent compared to what?" The answer is: compared to your own runs, not an external standard.

### 5c. Automation opportunities confidence note

**Current:**

```
Estimates based on [N] recorded run[s] · [confidence label]
```

**Replace with:**

```
Potential estimated from [N] recorded run[s] · [confidence label] — figures improve as more runs are recorded.
```

Rationale: adds the improvement dynamic without changing the honesty posture. The word "potential" replaces the implicit certainty of "estimates" without weakening the signal. "Figures improve as more runs are recorded" is both honest and an activation nudge.

### 5d. "No inefficiencies detected" (multi-run empty state)

**Current:**

```
This workflow appears well-structured across the recorded runs.
```

**Replace with:**

```
No inefficiencies detected across [N] recorded runs. Record additional runs to extend the baseline.
```

Rationale: adds the run count so the claim is bounded ("across N runs, not all possible runs"). "Extend the baseline" replaces "compare runs" — more precise about what recording achieves. This is the only context where a positive claim is defensible, and bounding it to N makes it honest.

### 5e. Screen footer (the existing `<footer>` in WorkflowReportPage)

**Current:**

```
Generated from observed workflow behavior · Evidence-backed · Ledgerium AI
```

**Replace with:**

```
Generated from [N] recorded run[s] · All figures derived from observed behavior · Ledgerium AI
```

Rationale: the run count is available in `leadFigures.runCount` and makes the claim concrete. "Evidence-backed" is slightly marketing-adjacent — "All figures derived from observed behavior" is the precise claim that matches the PDF footer and reinforces consistency across surfaces.

---

## 6. What NOT to say — honesty guardrails for this surface

These are explicit prohibitions. Any copy that uses these phrases or patterns violates the Ledgerium honesty invariant and must be edited before shipping.

### 6a. Do not use "AI-generated" to describe the verdict or scorecard

The verdict is built by `buildReportVerdict()`, a deterministic template function. The scorecard is built by `buildScorecard()`. Neither is LLM-generated. Calling them "AI-generated" would misrepresent the product architecture and create an expectation that cannot be substantiated. If the summary is ever upgraded to an LLM output, a separate disclosure is required at that point.

Prohibited: `"AI-generated summary"`, `"AI verdict"`, `"generated by AI"` on any card, badge, or footer that is actually template-rendered.

### 6b. Do not guarantee outcomes or project savings as facts

Automation opportunity savings (`estimatedTimeSavingsMs`) are estimates with a confidence band. The confidence band is already shown in the UI. Do not strip the confidence qualifier in any copy.

Prohibited: `"saves [N] hours/month"` stated as fact. Required qualifier: `"~[N] estimated"` or `"potential savings of ~[N]"`.

### 6c. Do not claim cross-run conclusions from a single run

The single-run variant of every multi-run copy string must omit cross-run claims. CV, sequence stability, variant count, and consistency scores are undefined at N=1.

Prohibited on single-run: `"consistent process"`, `"stable sequence"`, `"no inefficiencies detected"` (requires N >= 2 per the existing honesty gate in `InsightsFeedSection`).

### 6d. Do not use "benchmark" or "industry standard" language

Ledgerium measures against the user's own recorded behavior, not external benchmarks. The consistency score and CV thresholds (CV >= 0.50 = high variance) are internal thresholds, not industry standards.

Prohibited: `"below industry average"`, `"benchmark performance"`, `"meets standard"`.

### 6e. Do not fabricate savings, timelines, or ROI figures

No copy on the report should include a projected ROI, payback period, or hours-per-year savings figure unless it is computed directly from `estimatedTimeSavingsMs * runFrequency` with the run frequency provided by the user. If the run frequency is unknown, do not project.

Prohibited: `"saves your team [X] hours per year"` unless a run-frequency input is present. The current automation section correctly shows `~[N] saved` per run — that is the scope.

### 6f. Do not describe figures as "real-time" unless the data is live

The report reflects processed recorded runs, not a live stream. The word "real-time" implies continuous updating.

Prohibited: `"real-time process intelligence"`, `"live insights"` in the report header or footer.

### 6g. Do not describe the PDF as "comprehensive" or "complete"

The PDF is a 2-page stakeholder layout — verdict, scorecard, key findings, and footer. It is not the full report. Describing it as "comprehensive" creates an expectation the format cannot meet.

Prohibited: `"comprehensive PDF report"`, `"complete report"`. Permitted: `"stakeholder summary"`, `"one-page overview"`, `"shareable report snapshot"`.

---

## Summary table — exact strings by location

| Location | Current string | R-D replacement |
|---|---|---|
| Header badge label | *(new)* | `Evidence-linked` |
| Header badge tooltip (full) | *(new)* | `Every figure on this report is computed from your recorded runs — observed behavior only. Nothing is modeled, inferred, or estimated from external benchmarks.` |
| Header badge tooltip (short) | *(new)* | `Every figure traces to recorded events. No benchmarks, no estimates — only what was observed in your runs.` |
| PDF export button label | `Report` (Download) | `Save as PDF` |
| PDF export button helper text | *(none)* | `Stakeholder-ready — verdict, scorecard, and key findings on one page.` |
| JSON export button label | `JSON` | `Download data (JSON)` |
| PDF footer — multi-run line 1 | *(new)* | `Generated from [N] recorded runs · [date range] · Ledgerium AI` |
| PDF footer — multi-run line 2 | *(new)* | `All figures derived from observed behavior — no benchmarks, no modeled estimations.` |
| PDF footer — single-run line 1 | *(new)* | `Generated from 1 recorded run · [date] · Ledgerium AI` |
| PDF footer — single-run line 2 | *(new)* | `All figures reflect a single observed session — record again to enable cross-run analysis.` |
| Report page h1 type label | *(workflow title only)* | `Process Intelligence Report` |
| Report sub-header — multi-run | *(none)* | `Based on [N] recorded runs · Evidence-linked · [date range]` |
| Report sub-header — single-run | *(none)* | `Based on 1 recorded run · Evidence-linked · [date]` |
| Verdict section label | `Verdict` | `Observed verdict` |
| CV interpretation footnote | `low variance · CV ≥ 0.50 = high variance` | `Based on observed run-to-run variation — not a defined target or benchmark.` |
| Automation confidence note | `Estimates based on [N] recorded run[s] · [label]` | `Potential estimated from [N] recorded run[s] · [label] — figures improve as more runs are recorded.` |
| No-inefficiencies body text | `This workflow appears well-structured across the recorded runs.` | `No inefficiencies detected across [N] recorded runs. Record additional runs to extend the baseline.` |
| Screen footer | `Generated from observed workflow behavior · Evidence-backed · Ledgerium AI` | `Generated from [N] recorded run[s] · All figures derived from observed behavior · Ledgerium AI` |
