# Ledgerium SOP Design System

**Status:** Specification
**Version:** 1.0
**Governs:** all three SOP templates, all export formats (Markdown, web, PDF, DOCX)

---

## 1. Purpose

A unified design language so the three Ledgerium SOP templates feel like one
product family. Every template shares the same typographic spine, the same
trust signals, and the same confidence vocabulary. What differs is **voice,
density, and emphasis** — not the design primitives.

This system is what lets a frontline operator hand an Enterprise SOP to their
CEO without explanation, and lets a compliance officer trust an Operator SOP
for audit because both cite the same evidence.

---

## 2. Design goals

| Goal | What it means in practice |
|------|---------------------------|
| **Glanceable** | Purpose, scope, next action visible in under 15 seconds |
| **Trusted** | Every claim traceable to a `source_event_id` |
| **Calm** | Low visual noise; content earns its visual weight |
| **Executable** | Readers can act from the SOP alone — no extra docs needed |
| **Durable** | Reads well in Markdown, PDF, DOCX, and the web app |
| **Honest** | Confidence is visible; uncertainty is labeled, not hidden |

---

## 3. Shared anatomy (all three templates)

Every rendered SOP uses this top-to-bottom spine. Templates differ in what
they emphasize, not in what they include at the top.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TITLE                          ← H1, single line          │
│ 2. ONE-LINE PURPOSE               ← what this helps you do   │
│ 3. METADATA STRIP                 ← trust at a glance        │
│ 4. QUALITY / CONFIDENCE BADGE     ← visible, not buried      │
├─────────────────────────────────────────────────────────────┤
│ 5. "WHEN TO USE" / TRIGGER                                  │
│ 6. "WHAT YOU NEED" / PREREQUISITES                          │
│ 7. SYSTEMS INVOLVED                                         │
├─────────────────────────────────────────────────────────────┤
│ 8. THE PROCEDURE                  ← the content that matters │
├─────────────────────────────────────────────────────────────┤
│ 9. VERIFICATION / COMPLETION                                │
│ 10. THINGS TO WATCH FOR           ← risks / common mistakes │
│ 11. EVIDENCE & SOURCE                                       │
└─────────────────────────────────────────────────────────────┘
```

The first four rows ("above the fold") deliver the glance test. A busy reader
should already know **what the SOP is for, who it's for, and whether to trust it**
without scrolling.

---

## 4. Typography hierarchy

Markdown primitives that the web renderer and PDF exporter map to named styles.
All three templates use the same scale.

| Role | Markdown | Web CSS target | PDF |
|------|----------|----------------|-----|
| Document title | `# Title` | `.sop-title` — 32px, 700, -0.02em tracking | 22pt serif |
| Section heading | `## Heading` | `.sop-section` — 20px, 600 | 14pt |
| Step title | `### Step 3: Verb phrase` | `.sop-step-title` — 16px, 600 | 12pt bold |
| Step body | body paragraph | `.sop-step-body` — 15px, 400, 1.55 line height | 11pt |
| Metadata strip | italic paragraph | `.sop-meta` — 13px, 500, muted | 10pt |
| Callouts | `> **Label:** …` | `.sop-callout` — padded block | boxed |
| Evidence refs | `[evidence: event_id=…]` | `.sop-evidence` — 12px, monospace, low-contrast | 9pt mono |

Rules:
- **One H1 per document.** Never two.
- **Skip no levels.** H1 → H2 → H3 only. No H4+ in any of the three templates.
- **No ALL CAPS** except for severity tokens (`HIGH`, `MEDIUM`, `LOW`).
- **No emoji decoration** except the semantic tokens defined in §6.

---

## 5. Color semantics (render-layer)

Markdown is color-agnostic, but the web and PDF renderers map semantic tokens
to the following palette. This matches `CATEGORY_CONFIG` in
`packages/process-engine/src/types.ts` so UI and document stay consistent.

| Token | Use | Hex | Where it appears |
|-------|-----|-----|------------------|
| `action` | A step the user performs | `#2563eb` (blue-600) | Step headings, action icons |
| `verify` | A verification / check | `#16a34a` (green-600) | Completion checks, ✓ marks |
| `caution` | Non-blocking caution | `#d97706` (amber-600) | Cautions within steps |
| `risk` | Blocking risk or error | `#dc2626` (red-600) | Risks, error handling |
| `decision` | Branch point | `#7c3aed` (violet-600) | Decision callouts |
| `system` | System / automated action | `#475569` (slate-600) | System events, waits |
| `evidence` | Source event reference | `#64748b` (slate-500) | Footnotes, inline refs |
| `sensitive` | Sensitive / redacted data | `#be185d` (pink-700) | Sensitive field markers |

Templates differ in dominant hue:
- **Operator-Centric** leads with `action` blue and `verify` green — optimistic, doable.
- **Enterprise** leads with `system` slate and `evidence` — controlled, formal.
- **Decision-Based** leads with `decision` violet — branch-forward.

---

## 6. Semantic tokens (emoji, used sparingly)

These tokens appear inline. They are the **only** emoji allowed in rendered
SOPs. They map to the color tokens above and to ARIA roles in the web renderer.

| Token | Glyph | Meaning | When it appears |
|-------|-------|---------|-----------------|
| Action | *(none — rely on numbering)* | A step the user performs | Every procedure step |
| Verify | `✓` | Confirmation / passes check | Completion criteria, expected outcomes |
| Caution | `⚠` | Watch out, but not blocking | Cautions inside a step |
| Risk / error | `✕` | Blocking failure or error path | Error handling, failed verification |
| Decision | `◆` | Branch point | Decision callouts |
| System | `⟳` | System-driven wait or automation | Loading steps, system responses |
| Evidence | `◦` | Source event reference | Inline evidence footnotes |
| Sensitive | `🔒` | Sensitive / redacted field | Sensitive-data warnings |

Rules:
- Never decorative. Every token carries information.
- One token per line maximum (except evidence refs, which may appear in groups).
- The web renderer replaces these with inline SVG icons; Markdown keeps them as
  UTF-8 for portability.

---

## 7. Trust signals (make evidence visible)

This is the single most important section in this design system. Ledgerium's
differentiator is traceability. The SOP must **wear its evidence on its sleeve**.

### 7.1 The evidence reference

Every step in every template ends with an evidence reference row. Three formats:

- **Inline (Operator):** `◦ Evidence: 3 events · [session: abc123 · ev_04, ev_05, ev_06]`
- **Block (Enterprise):** a dedicated "Evidence" key below the step
- **Footnote (Decision):** `[evidence: ev_04]` after each action line

All three formats cite `event_id` substrings. The web renderer makes these
clickable (opens the timeline at that event). The PDF renderer keeps them
visible as opaque IDs so an auditor can re-query the system.

### 7.2 The metadata strip

Every SOP shows a single-line metadata strip under the title. Example:

```
Ledgerium SOP · v2.0 · 12 steps · 3 systems · 87% confidence · Generated 2026-04-17
```

Mandatory fields: version, step count, system count, confidence percentage,
generation date. Optional fields: owner, source session ID, last review date.

### 7.3 The confidence badge

Visible. Not buried. One of three states:

| Badge | Range | Rendered form |
|-------|-------|---------------|
| **High confidence** | avg ≥ 0.85 AND 0 low-confidence steps | `✓ High confidence · fully evidence-linked` |
| **Medium confidence** | avg 0.70–0.85 OR 1–2 low-confidence steps | `⚠ Medium confidence · review steps X, Y before sharing` |
| **Low confidence** | avg < 0.70 OR ≥3 low-confidence steps | `✕ Low confidence · manual review required` |

The badge is **required above the fold** in all three templates. Ledgerium
does not ship SOPs that hide their uncertainty.

### 7.4 The source note

Every SOP ends with a one-line source note:

```
Derived from session abc123 by Ledgerium process-engine v1.2.0 on 2026-04-17.
All 12 steps are evidence-linked. Open timeline: https://app.ledgerium.ai/s/abc123
```

This is the paper trail. It is how an auditor, a CEO, or a rehabber of a broken
SOP gets back to the raw truth.

---

## 8. Confidence visualization

Confidence is a property of **each step** (`SOPStep.confidence: number`) and of
the overall SOP (`QualityIndicators.averageConfidence`). Both must be visible.

### 8.1 Per-step indicator

Attached to each step title as a small, calm glyph. Never blocks the text.

| Confidence | Glyph | Color | Meaning |
|------------|-------|-------|---------|
| ≥ 0.85 | *(none — assumed by default)* | n/a | Confident |
| 0.70–0.85 | `·` dim dot | slate-400 | Slightly uncertain |
| < 0.70 | `⚠` muted caution | amber-600 | Flagged — review |

Rendered example:
- `### Step 4: Upload the workflow file` (confident, no glyph)
- `### Step 7: Wait for processing ·` (medium — the dot)
- `### Step 9: Review derived tags ⚠` (low — amber caution)

### 8.2 Document-level quality advisory

When `qualityIndicators.lowConfidenceStepCount > 0`, the advisory is rendered
as a callout under the metadata strip:

```
> ⚠ Heads up — 2 of 12 steps have lower label confidence (steps 7, 9).
> Review these before publishing. See Evidence section for source events.
```

This already exists in the codebase as `buildQualityAdvisory`. It must become
a **visible, above-the-fold element** in all three templates.

---

## 9. Shared components across templates

These components are reusable and must render identically across Operator,
Enterprise, and Decision SOPs.

### 9.1 Metadata block

```markdown
| | |
|---|---|
| **SOP ID** | `{sopId}` |
| **Version** | `{version}` |
| **Generated** | `{generatedAt}` (ISO 8601) |
| **Engine** | Ledgerium process-engine `{engineVersion}` |
| **Source session** | `{sessionId}` |
| **Steps** | `{stepCount}` · Systems: `{systemCount}` |
| **Confidence** | `{High | Medium | Low}` — `{averageConfidence × 100}%` |
```

Operator templates collapse this into a one-line italic strip.
Enterprise and Decision templates keep the full table.

### 9.2 Step block

Every procedure step, across all templates, has these atomic elements:

```
### Step N: {imperative verb phrase}       [confidence glyph]
{one-sentence plain-language action}

Performed in: {system}
{expanded instruction — 1-3 sentences max}

✓ Expected: {observable outcome}
⚠ Watch for: {caution if present — omit entirely if not}

◦ Evidence: {N events} · [ev_XX, ev_YY, ev_ZZ]
```

Three templates use this shape differently:
- **Operator** shows it top-to-bottom, one step per card.
- **Enterprise** tabulates it (Actor / System / Inputs / Outputs / Verification / Evidence).
- **Decision** uses it inside branch blocks, prefixed by the branch condition.

### 9.3 Callout

Four types, used consistently:

```markdown
> ✓ **Expected** — the observable result that confirms the step succeeded.
> ⚠ **Caution** — a non-blocking risk the user should know about.
> ✕ **Error** — a blocking failure; describe the recovery path.
> ◆ **Decision** — a branch point; enumerate the options.
```

### 9.4 Decision tree

Only Decision SOPs render full trees, but all three templates use the same
syntax for inline decisions within a step:

```markdown
◆ **Decision — {question}?**
- **If {condition A}** → {next step or branch}
- **If {condition B}** → {next step or branch}
- **Otherwise** → escalate per {policy}
```

### 9.5 Evidence footnote

Inline, at the end of every step across all three templates:

```
◦ Evidence: 3 events · session `{sessionId-short}` · events `ev_04, ev_05, ev_06`
```

The session ID is trimmed to 6 characters for readability. The web renderer
expands it on hover.

---

## 10. Empty, partial, and error states

A beautiful SOP is one that handles missing data gracefully. Three templates,
three states, one behavior:

### 10.1 Empty section

If a required section has no content, render a humble placeholder — never hide it.

```
## Prerequisites
_No explicit prerequisites were observed in this recording. Verify access to
the systems listed above before starting._
```

### 10.2 Partial recording

If the recording was cut short (`completionStatus: 'partial'`):

```
> ⚠ **Partial recording** — this SOP is based on a session that was stopped
> before a final completion signal was observed. Use with caution. The last
> observed step was "{last step title}" at {timestamp}.
```

### 10.3 Low-confidence step

Render the step normally, then append the confidence glyph and a line:

```
### Step 7: Wait for processing ⚠
_Confidence: 58% — the recorded event labels were ambiguous. Review the
source events before relying on this step._

◦ Evidence: 2 events · ev_17, ev_18
```

### 10.4 Sensitive data

Whenever `target_summary.isSensitive === true`:

```
Enter the value in "{field label}" 🔒
_Sensitive field — do not include the value in screenshots, exports, or
shared recordings._
```

---

## 11. Voice and tone (by template)

The one-family rule: all three templates use active voice, second person
("you"), present tense, and imperative verbs for procedure steps. What differs:

| Dimension | Operator-Centric | Enterprise | Decision-Based |
|-----------|------------------|------------|----------------|
| Tone | Warm, encouraging | Precise, controlled | Confident, decisive |
| Sentence length | 8–15 words | 12–20 words | 6–12 words |
| Person | "you" always | "the operator" in roles, "you" in procedure | "you" in decisions, "the responder" in escalation |
| Contractions | Allowed ("you'll") | Avoided | Allowed |
| Examples | Frequent | Rare — only when essential | Frequent, as branch illustrations |
| Humor / warmth | Occasional | Never | Rare |

Example of the same instruction in three voices:

> **Operator:** "Upload the workflow file — drag and drop it onto the page, or click 'Choose file' to browse."
>
> **Enterprise:** "The operator uploads the workflow file via the web-app upload interface. Accepted formats: `.json` matching canonical event schema v1.0.0. The system validates the file and returns either a processing job ID or a validation error."
>
> **Decision:** "Upload the workflow file. If the file is rejected → see Branch 2 (Upload Error Recovery). If accepted → continue to Step 5."

---

## 12. Layout rules (render-layer)

Target mediums: Markdown source, web app (React), PDF export, DOCX export.

| Rule | Reason |
|------|--------|
| Maximum line length 84 characters in rendered Markdown | Readable in GitHub, terminal, and narrow PDF |
| Blank line between all headings and body | Respects Markdown semantic spacing |
| Tables must have header rows | Accessibility and export parity |
| No raw HTML in the core SOP body | PDF/DOCX exporters must stay lossless |
| Evidence refs always on their own line | Never interrupt reading flow |
| Callouts always preceded and followed by a blank line | Visual breathing room |

---

## 13. Accessibility

- **Landmarks:** every `##` heading maps to a `<section>` with an `aria-label`.
- **Color is never the only signal:** every color token has a glyph or label.
- **Evidence refs are keyboard-focusable** in the web renderer.
- **Minimum contrast:** 4.5:1 against background for body; 3:1 for headings.
- **Screen reader order:** title → metadata → confidence → when to use → prerequisites → procedure → completion.
- **Sensitive markers** are announced as "sensitive field, value redacted."

---

## 14. Export-format fidelity

The Markdown source is the canonical form. The three export formats must
preserve all trust signals. Non-negotiable elements per format:

| Element | Markdown | Web | PDF | DOCX |
|---------|:-------:|:---:|:---:|:----:|
| Title | ✓ | ✓ | ✓ | ✓ |
| Metadata strip | ✓ | ✓ | ✓ | ✓ |
| Confidence badge | ✓ | ✓ | ✓ | ✓ |
| Per-step confidence glyph | ✓ | ✓ | ✓ | ✓ |
| Evidence refs per step | ✓ | ✓ clickable | ✓ visible | ✓ visible |
| Source note | ✓ | ✓ clickable | ✓ | ✓ |
| Quality advisory callout | ✓ | ✓ | ✓ | ✓ |

A rendered SOP that is missing any of the non-negotiables is a rendering bug,
not a stylistic choice.

---

## 15. What this design system deliberately excludes

- **Dashboards and KPIs** — those belong in the web app's analytics view, not the SOP document.
- **Freeform narrative introductions** — no "This document describes…" paragraphs. The title and one-line purpose are the introduction.
- **Regulatory disclaimers not earned by the recording** — compliance theater is banned.
- **Decoration emoji** — no 🎉 🚀 ✨. Only the semantic tokens in §6.
- **Marketing copy** — Ledgerium sells the product elsewhere; the SOP sells itself by being useful.
- **Auto-generated footers on every page** — one footer, at the end, with the source note.

---

## 16. Change control

This design system is a versioned artifact. Any change to color tokens, semantic
glyphs, or the document anatomy (§3) requires:
1. A proposal in a PR against this file.
2. Updated examples in `docs/sop/examples/`.
3. Sign-off by product, design, and one engineering reviewer.

Breaking changes to the Markdown rendering contract require a major version bump
of `PROCESS_ENGINE_VERSION` in `packages/process-engine/src/types.ts`.
