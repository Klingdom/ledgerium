# Ledgerium SOP Quality Rubric

**Status:** Specification
**Version:** 1.0
**Governs:** automated scoring of rendered SOPs, manual QA review

---

## 1. Purpose

Define a 0–100 weighted scoring system that an engineer, a QA reviewer, or an
automated linter can apply to any rendered SOP. The rubric is the criterion by
which Ledgerium decides whether an SOP is ready to ship.

It is prescriptive: the rubric encodes what "best-in-class" means so the team
doesn't argue about it after the fact.

---

## 2. Scoring overview

The total score is 100 points, distributed across 12 weighted categories.
Each category is scored 0, 1, 2, or 3 and then multiplied by its weight.

```
total_score = Σ (category_score_0_to_3 × category_weight)
```

Thresholds:

| Score | Label | Ship? |
|-------|-------|-------|
| 0–59 | **Inadequate** | No — reject and regenerate |
| 60–74 | **Minimum acceptable** | Only for internal use; not customer-facing |
| 75–89 | **Production-ready** | Ship as default output |
| 90–100 | **Best-in-class** | Featured in marketing; reference example |

An SOP can be production-ready overall but still fail an individual category.
Any category scored 0 is a **hard reject** regardless of overall score.

---

## 3. The twelve scoring categories

| # | Category | Weight | Max points |
|---|----------|:-----:|:---------:|
| 1 | Purpose clarity | 8 | 24 |
| 2 | Scope clarity | 5 | 15 |
| 3 | Role clarity | 5 | 15 |
| 4 | Procedural clarity | 12 | 36 |
| 5 | Actionability | 10 | 30 |
| 6 | Process completeness | 10 | 30 |
| 7 | Decision logic clarity | 8 | 24 |
| 8 | Usability / scannability | 10 | 30 |
| 9 | Evidence / traceability | 12 | 36 |
| 10 | Governance / document control | 6 | 18 |
| 11 | Training readiness | 7 | 21 |
| 12 | AI / machine usability | 7 | 21 |

Weights sum to 100. Each category scored 0–3 means a max total of 300 points
of "raw" score, which normalizes to 100.

Implementation note: the normalized score is `raw_total × 100 / 300`.

---

## 4. Category definitions

### 4.1 Purpose clarity (weight 8)

**Definition:** the reader can articulate, in one sentence, why this SOP exists.

**Why it matters:** an SOP without clear purpose becomes a file nobody opens.

**Scoring:**
- **0** — No purpose section, or purpose is boilerplate ("This SOP describes…").
- **1** — Purpose present but generic; doesn't identify the specific workflow.
- **2** — Purpose is specific to the workflow but uses technical framing.
- **3** — Purpose is specific, business-meaningful, and reads in under 12 seconds.

**Low example:** "This SOP describes the procedure for uploading workflow files."

**Medium example:** "Upload and process a workflow JSON in Ledgerium AI."

**High example:** "Turn a recorded workflow into a shareable SOP and process
map, so the team has a single source of truth for how the work actually happens."

---

### 4.2 Scope clarity (weight 5)

**Definition:** the reader knows exactly which workflows, systems, and
actors are covered — and which are excluded.

**Why it matters:** scope creep is the silent killer of SOP usefulness.

**Scoring:**
- **0** — No scope statement.
- **1** — Scope present but only lists systems; no mention of actors or boundaries.
- **2** — Scope covers systems and actors but not what's excluded.
- **3** — Scope covers covered systems, actors, workflow boundaries, and explicit exclusions.

---

### 4.3 Role clarity (weight 5)

**Definition:** every step identifies who performs it, using a role name
that maps to an org role or a persona.

**Scoring:**
- **0** — No actor/role information on steps.
- **1** — Global "Operator" role only; no step-level attribution.
- **2** — Role appears at document level and occasionally at step level.
- **3** — Every step has an actor; handoffs between actors are explicit.

---

### 4.4 Procedural clarity (weight 12)

**Definition:** each step is a single, unambiguous action expressed in
imperative voice with observable outcomes.

**Why it matters:** this is the SOP's job.

**Scoring:**
- **0** — Steps are nominalized ("Clicking the button"), ambiguous, or compound.
- **1** — Most steps are imperative but 20%+ contain recorder artifacts or multi-action lines.
- **2** — All steps are imperative; each has expected outcomes; rare ambiguity.
- **3** — All steps are imperative, atomic, with observable outcomes and optional cautions. No recorder artifacts anywhere.

**Automated check:** scan for banned strings from `TRANSFORMATION_RULES.md` §5.1.
Any hit caps this category at 0.

---

### 4.5 Actionability (weight 10)

**Definition:** a qualified reader can complete the workflow by following the
SOP alone, without consulting the source recording, the UI, or SMEs.

**Scoring:**
- **0** — The SOP references UI elements by technical name only; reader must have the UI open.
- **1** — The SOP is readable but key actions require UI familiarity not documented.
- **2** — A trained user can follow the SOP; a new user needs the UI open.
- **3** — A new user can follow the SOP with the UI open; a trained user can execute purely from memory cues.

---

### 4.6 Process completeness (weight 10)

**Definition:** the SOP covers the happy path and at least the most common
exception paths, with no silent gaps.

**Scoring:**
- **0** — Happy path only, with visible missing steps (e.g., a form submission with no confirmation check).
- **1** — Happy path only, clean, but no exception coverage.
- **2** — Happy path plus 1–2 common exceptions.
- **3** — Happy path plus every exception observed in the source recording, plus escalation.

---

### 4.7 Decision logic clarity (weight 8)

**Definition:** every branch point has an explicit question, an enumerated set
of conditions, and a defined next step per condition.

**Scoring:**
- **0** — Decision points are implicit or missing.
- **1** — Decision points present but conditions are ambiguous ("if it fails").
- **2** — Decision points are explicit with clear conditions, but outcomes are sometimes underspecified.
- **3** — Every decision point is a labeled question with exhaustive options mapped to specific next steps.

---

### 4.8 Usability / scannability (weight 10)

**Definition:** a reader can extract the key question ("what do I do now?")
in under 15 seconds. The SOP respects the typography, hierarchy, and component
rules in `DESIGN_SYSTEM.md`.

**Scoring:**
- **0** — No hierarchy; wall of text; inconsistent formatting.
- **1** — Hierarchy present but inconsistent; readers must hunt for actions.
- **2** — Clean hierarchy; most sections scannable; minor formatting inconsistencies.
- **3** — Glance-test passed; every section respects DESIGN_SYSTEM; trust signals visible above the fold.

**Automated check:** the renderer emits a machine-readable structure; assert
that the metadata strip, confidence badge, and first procedure step appear
within the top 20 rendered lines.

---

### 4.9 Evidence / traceability (weight 12)

**Definition:** every claim in the SOP traces back to a source `event_id`.
This is Ledgerium's defining property.

**Scoring:**
- **0** — No evidence references anywhere.
- **1** — Document-level source note only; no per-step evidence.
- **2** — Per-step evidence present but inconsistent; some steps missing refs.
- **3** — Per-step evidence on every step; evidence manifest present; evidence refs survive in all export formats.

**Automated check:** validator §8.3 in `SCHEMA.md`. Any step with no evidence
caps this category at 0 — **hard reject**.

---

### 4.10 Governance / document control (weight 6)

**Definition:** the SOP carries metadata needed for versioning, review
cadence, and audit.

**Scoring:**
- **0** — No metadata visible.
- **1** — Version number only.
- **2** — Version, generation timestamp, source session.
- **3** — Full metadata strip per DESIGN_SYSTEM §9.1, including engine version
  and (for Enterprise) review cadence and next review date.

---

### 4.11 Training readiness (weight 7)

**Definition:** a new hire can be onboarded from this SOP alone.

**Scoring:**
- **0** — Assumes deep product knowledge; jargon-heavy.
- **1** — Accessible to experienced users but not newcomers.
- **2** — Accessible to newcomers with some hand-holding.
- **3** — A new hire can complete the workflow from this SOP with no SME support. Includes "before you begin," "common mistakes," "tips."

---

### 4.12 AI / machine usability (weight 7)

**Definition:** an LLM or automation agent can reliably consume the SOP as
structured data for automation or retraining.

**Scoring:**
- **0** — Rendered only as prose; no structure.
- **1** — Structured JSON exists but fields don't match this spec.
- **2** — Structured JSON matches the spec; evidence IDs present; machine-addressable.
- **3** — Structured JSON matches the spec, includes `evidenceManifest`, every
  instruction has `sourceEventId`, and an agent can recover source events without
  traversing the full session.

---

## 5. Automated vs. manual scoring

| Category | Automatable? | If yes, how |
|----------|:-----------:|------|
| Purpose clarity | Partial | Check non-empty, non-boilerplate; final score needs human judgment |
| Scope clarity | Partial | Check presence; human judges exclusions |
| Role clarity | Yes | Every step has `actor`; handoff transitions detected |
| Procedural clarity | Yes | Banned-string scan; imperative verb detection |
| Actionability | No | Human review |
| Process completeness | Partial | Detect happy-path-only via absence of error branches |
| Decision logic clarity | Yes | Every decision has question, options, actions |
| Usability / scannability | Yes | Renderer structure assertion |
| Evidence / traceability | Yes | Validator §8.3 |
| Governance / document control | Yes | Metadata strip field presence |
| Training readiness | Partial | Check for "before you begin," "common mistakes," "tips" sections |
| AI / machine usability | Yes | Schema validator + manifest presence |

Target: 8 of 12 categories fully automatable in v1.

---

## 6. The glance test (a hard gate)

Even a 100-point SOP must pass the glance test before being marked best-in-class.

A reviewer opens the SOP with a stopwatch and under 15 seconds must be able to
answer:

1. What is this SOP for? (purpose)
2. Should I use it now? (trigger / when to use)
3. Can I trust it? (confidence badge + source note)

If any of these take more than 15 seconds, the SOP drops one tier regardless
of score.

---

## 7. The CEO test

A best-in-class SOP survives handing it to the CEO without explanation.
Signals:
- No recorder artifacts anywhere.
- No technical jargon in the first 30 lines.
- Confidence is visible and honest.
- The source note tells the CEO where to verify if they want to.

Any time a CEO reads a rendered SOP and asks "what does this mean?", it
becomes a bug report on this rubric.

---

## 8. Sample scoring walkthrough

### Input
The rendered SOP at `docs/sop/examples/01_operator_centric_example.md`.

### Scores

| Category | Raw (0–3) | × Weight | Points |
|----------|:--------:|:--------:|:------:|
| Purpose clarity | 3 | 8 | 24 |
| Scope clarity | 3 | 5 | 15 |
| Role clarity | 3 | 5 | 15 |
| Procedural clarity | 3 | 12 | 36 |
| Actionability | 3 | 10 | 30 |
| Process completeness | 2 | 10 | 20 |
| Decision logic clarity | 2 | 8 | 16 |
| Usability / scannability | 3 | 10 | 30 |
| Evidence / traceability | 3 | 12 | 36 |
| Governance / document control | 3 | 6 | 18 |
| Training readiness | 3 | 7 | 21 |
| AI / machine usability | 3 | 7 | 21 |
| **Raw total** | | | **282** |
| **Normalized (×100/300)** | | | **94** |

Verdict: **Best-in-class** — ready to feature.

The two categories scoring 2 (completeness, decisions) reflect that the
Operator template intentionally downplays decision branches — it delegates
those to the Decision-Based template.

---

## 9. Using this rubric

### 9.1 At build time
Every rendered SOP runs through the automated categories. If any hit 0, the
builder emits a warning and the template selector can suggest a retry with
enriched metadata.

### 9.2 At review time
Product and QA apply the full rubric to sampled outputs weekly. Results are
logged against `METRICS.md` KPI-005 (SOP Usefulness Score).

### 9.3 At publish time
Marketing examples must score ≥ 90.
Default product output must score ≥ 75.
Anything below 60 must not render to the end user — the builder returns an
error per `SCHEMA.md` §8.2.

---

## 10. Known anti-patterns (automated detectors)

Any of these, detected in a rendered SOP, caps the score at **minimum acceptable** (74):

| Anti-pattern | Detector |
|--------------|---------|
| Recorder artifact ("Click the div") | Regex scan |
| One-step SOPs | `steps.length < 2` |
| Empty expected outcomes | `steps.filter(s => !s.expectedResult).length > 0` |
| Missing confidence badge | Renderer introspection |
| Prose-only purpose ("This SOP describes…") | Regex scan |
| Generic titles ("Workflow 1", "Untitled Process") | Title regex |
| No source note | Schema check |
| Every step same system but labelled as cross-functional | Cross-check |

---

## 11. Future enhancements

- **Reader comprehension scoring** via a future LLM grader calibrated to the rubric.
- **Readability scoring** (Flesch-Kincaid reading level; target ≤ 10 for Operator template, ≤ 13 for Enterprise).
- **A/B comparisons** against competitors' SOP outputs, automated.
- **Per-audience scoring** — the same SOP might score 90 for an operator and 70 for a CEO; both numbers shown.
