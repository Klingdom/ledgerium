# SOP System — Collaboration Requests

**From:** SOP-Expert
**To:** Coordinator
**Status:** Prioritized handoff list
**Purpose:** identify work that belongs to other specialist agents so the
coordinator can orchestrate it in parallel or sequence with the backend
implementation in `IMPLEMENTATION_NOTES.md`.

---

## How to read this

Each request includes:
- **Owner** — which specialist role should handle it
- **Priority** — P0 (blocker for launch), P1 (required for best-in-class),
  P2 (enhances quality), P3 (future)
- **Depends on** — upstream artifact prerequisites
- **Success criteria** — how we know it's done
- **Estimated size** — rough scoping signal

I have deliberately not spawned subagents myself — that is the coordinator's
call. All items below are scoped so a specialist can pick them up with the
existing artifacts as input.

---

## P0 — Blockers for shipping this uplift

### CR-1 · Backend-engineer · Implement `sopValidator.ts` + schema uplift

**Owner:** backend-engineer
**Depends on:** `docs/sop/SCHEMA.md`, `docs/sop/TRANSFORMATION_RULES.md`, `docs/sop/IMPLEMENTATION_NOTES.md`
**Scope:**
- Add the additive schema fields per `SCHEMA.md` §3–§6.
- Implement `validateRenderedSOP()` per `IMPLEMENTATION_NOTES.md` §3 Gap 8.
- Restructure `markdownRenderer.ts` so the metadata strip and confidence badge
  are above the fold in all three templates.
- Add per-step `evidenceEvents` and confidence glyphs.
- Add the Markdown-level helpers (`renderMetadataStrip`, `renderConfidenceBadge`,
  `stepConfidenceGlyph`, `formatEvidenceRow`).
- Ensure every rendered example in `docs/sop/examples/` can be reproduced from
  `docs/sop/examples/source_recording.json` by the updated pipeline.
**Success criteria:**
- `pnpm typecheck` and `pnpm test --filter process-engine` pass.
- A new regression test round-trips `source_recording.json` through the pipeline
  and asserts byte-equivalence (modulo timestamps) to the three example files.
- The validator rejects recordings containing banned strings.
**Estimated size:** 120–150 LOC + 60 LOC of tests. One engineer-week.

### CR-2 · QA-engineer · Build the automated rubric scoring harness

**Owner:** qa-engineer
**Depends on:** `docs/sop/QUALITY_RUBRIC.md`
**Scope:**
- Translate the 8 auto-scorable categories from `QUALITY_RUBRIC.md` §5 into a
  programmatic linter.
- Output a machine-readable rubric report (JSON) with per-category scores.
- Integrate into CI: every rendered SOP in a PR is scored; PRs that drop below
  75 (production-ready) on the default sample set fail the check.
- Build a negative-sample library: at least 10 hand-crafted recordings that
  should be rejected, and at least 10 that should score ≥ 90.
**Success criteria:**
- Linter reports a score for any `RenderedSOP` in <200 ms.
- Sample recordings demonstrate automated gating is calibrated: no false
  positives in the golden-90 set, no false negatives in the rejection set.
**Estimated size:** 300 LOC + negative-sample library. Two engineer-weeks.

---

## P1 — Required to hit "best-in-class" in marketing

### CR-3 · UX-designer · Web-view mockups for the three SOP templates

**Owner:** ux-designer
**Depends on:** `docs/sop/DESIGN_SYSTEM.md`, all three `docs/sop/examples/*.md`
**Scope:**
- Produce Figma mockups (light + dark) for:
  - Operator-Centric SOP web view — 1 full-page mock + 1 mobile mock
  - Enterprise SOP web view — 1 full-page mock, with compliance sidebar (version history, approvals)
  - Decision-Based SOP web view — 1 full-page mock with collapsible branches
- For each, mark the design tokens used from `DESIGN_SYSTEM.md` §5 (color semantics).
- Demonstrate the quality badge (high / medium / low) states.
- Demonstrate the low-confidence-step state (the `⚠` glyph).
**Success criteria:**
- Mockups survive the glance test (§6 of `QUALITY_RUBRIC.md`) with real
  product copy from `docs/sop/examples/`.
- Mockups include accessibility annotations (color contrast, keyboard focus).
**Estimated size:** 3–5 days of design work.

### CR-4 · Frontend-engineer · Build the React SOP viewer component family

**Owner:** frontend-engineer
**Depends on:** CR-3 (mockups), `docs/sop/DESIGN_SYSTEM.md`, `docs/sop/SCHEMA.md`
**Scope:**
- React component library implementing the three SOP template views, consuming
  the structured JSON envelope in `SCHEMA.md`.
- Shared components: `<MetadataStrip>`, `<ConfidenceBadge>`, `<StepBlock>`,
  `<EvidenceRow>`, `<BranchBlock>`.
- Interactive evidence references that open the session timeline on click.
- Collapsible branches in the Decision-Based view.
- Keyboard navigation between sections.
- Copy-to-clipboard for any section heading.
**Success criteria:**
- All three templates render the example SOPs pixel-accurately to the CR-3
  mockups.
- Accessibility audit passes (WCAG AA minimum).
- Performance: first contentful paint under 500 ms for a 12-step SOP.
**Estimated size:** One engineer-week plus design-QA.

### CR-5 · Backend-engineer · PDF and DOCX exporters

**Owner:** backend-engineer
**Depends on:** CR-1, `docs/sop/DESIGN_SYSTEM.md` §14
**Scope:**
- PDF: pandoc-based or headless-Chrome pipeline that consumes the structured
  JSON envelope and emits a PDF matching `DESIGN_SYSTEM.md`.
- DOCX: same, via a docx-js or pandoc pipeline.
- Evidence references remain visible and copyable in both formats.
- Export tests against the three examples.
**Success criteria:**
- Exported formats pass the §14 fidelity matrix in `DESIGN_SYSTEM.md`.
- PDF and DOCX retain the confidence badge, metadata strip, and all evidence
  rows.
**Estimated size:** One engineer-week per format.

---

## P2 — High-value quality improvements

### CR-6 · UX-writer / Technical writer · Copy review of the three template specs

**Owner:** ux-writer (or principal-content-designer)
**Depends on:** `docs/sop/templates/*.md`, `docs/sop/examples/*.md`
**Scope:**
- Voice and tone audit of all three template specs and examples.
- Ensure the one-family-three-voices differentiation in `DESIGN_SYSTEM.md` §11
  is achieved.
- Produce a voice-and-tone style guide specific to Ledgerium SOPs that
  generator prompts and renderers can reference.
**Success criteria:**
- A short `docs/sop/STYLE_GUIDE.md` that reflects the patterns in the three
  examples.
- Each example re-reads as genuinely distinct in voice.
**Estimated size:** 2–3 days.

### CR-7 · Marketing · Choose and polish the featured SOP example

**Owner:** marketing-lead
**Depends on:** all three examples, Phil's direction
**Scope:**
- Pick one of the three rendered examples as the marketing-featured SOP.
- Polish copy for the marketing website (hero region + product page).
- Coordinate with UX-designer on screenshots or embedded live preview.
- **SOP-Expert recommendation:** feature the **Operator-Centric** example first.
  Rationale: it reads most naturally as "wow, a document my team would actually
  use." Enterprise is great for a compliance-focused landing page; Decision
  is great for a post-incident retro landing page. Operator-Centric is the
  universal-first example.
**Success criteria:** the featured SOP on `ledgerium.ai` is live and scoring
≥ 90 on the rubric.
**Estimated size:** 1 week.

### CR-8 · QA-engineer · Glance-test and CEO-test review protocol

**Owner:** qa-engineer
**Depends on:** `docs/sop/QUALITY_RUBRIC.md` §6–§7
**Scope:**
- Define a structured human-review protocol for the glance test and CEO test.
- Recruit 5 internal reviewers (frontline, compliance, executive) to grade
  the three examples on the rubric.
- Feed results back into rubric calibration.
**Success criteria:**
- A reproducible review protocol document.
- A baseline score per template per audience.
**Estimated size:** 1 week including reviewer time.

---

## P3 — Future / backlog

### CR-9 · AI-features-engineer · SOP improvement assistant
Suggest improvements to rendered SOPs (missing step detector, clarity rewriter).
Post-CR-2, because the rubric must exist first.

### CR-10 · AI-features-engineer · Organization-specific style adaptation
Learn an organization's preferred SOP voice from their existing SOP library
and apply it to new outputs. Post-CR-6, because the base style guide must exist first.

### CR-11 · Backend-engineer · Approval workflow integration
Wire `EnterpriseSOP.revisionMetadata.approvers` to an actual approval system.
Requires a product decision on which system to integrate with.

### CR-12 · Internationalization-engineer · Localized SOP rendering
Localize the rendered Markdown for non-English workflows. Requires a product
decision on supported languages.

### CR-13 · Security-engineer · Sensitive-data audit
Validate that the evidence references never expose redacted values in any
export format. Audit the rendered examples in every format (MD, HTML, PDF, DOCX)
for leaks.

---

## Summary table

| ID | Owner | Priority | Depends on | Size |
|----|-------|:--------:|------------|:----:|
| CR-1 | backend-engineer | P0 | Specs in `docs/sop/` | 1 wk |
| CR-2 | qa-engineer | P0 | `QUALITY_RUBRIC.md` | 2 wks |
| CR-3 | ux-designer | P1 | `DESIGN_SYSTEM.md`, examples | 3–5 d |
| CR-4 | frontend-engineer | P1 | CR-3, `SCHEMA.md` | 1 wk |
| CR-5 | backend-engineer | P1 | CR-1 | 1 wk × 2 |
| CR-6 | ux-writer | P2 | templates/examples | 2–3 d |
| CR-7 | marketing-lead | P2 | examples | 1 wk |
| CR-8 | qa-engineer | P2 | rubric | 1 wk |
| CR-9–13 | various | P3 | — | later |

---

## Suggested sequencing

```
Week 1:  CR-1 (backend) · CR-2 (qa)        ← parallel
Week 2:  CR-3 (ux)       · CR-6 (writer)   ← parallel; unblocked by Week 1
Week 3:  CR-4 (frontend) · CR-8 (qa)       ← parallel
Week 4:  CR-5 (backend PDF/DOCX) · CR-7 (marketing)  ← parallel
Week 5+: CR-9 onward                        ← backlog prioritization by Phil
```

Total critical path: 4 weeks to shippable v1 with best-in-class output across
Markdown, web, and export formats.
