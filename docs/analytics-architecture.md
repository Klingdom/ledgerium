# Ledgerium AI — Process Analytics & Metrics Architecture

## Executive Summary

Ledgerium has a mature single-run analysis engine and portfolio-level intelligence layer. The gaps are in: (1) normative scoring against target SOPs, (2) trend/time-evolution tracking, (3) cognitive load and coordination metrics, and (4) predictive capabilities.

## Current State (Already Built)

### Single-Run Analysis (process-engine)
- Workflow interpretation: complexity, friction, linearity, manual intensity scores (0-100)
- Process type classification (8 types)
- Decision, rework, friction detection with evidence
- Phase identification
- 5 insight categories with severity and evidence

### Portfolio Intelligence (intelligence-engine)
- Process metrics: volume, timing (mean/median/p90), completion rate
- Timestudy: per-step duration statistics
- Variance: duration CV, step count CV, sequence stability
- Variants: detection, standard path, similarity scoring
- Bottlenecks: high-duration step identification
- Drift: structural, timing, exception rate change detection
- Standardization score (0-100) with 4 factors
- SOP alignment and documentation drift
- Outlier run detection
- Recommended canonical path

### Per-Workflow Enrichment (web app API)
- 10 computed scores per workflow
- Health status classification
- AI opportunity score (0-100)
- Process type, complexity, SOP readiness

## Gap Analysis

### Missing Metrics (Priority Order)

1. **Cognitive Load Score** — HIGH IMPACT
   - Decision density × system switches × field entry count
   - Reveals where AI assistance has highest ROI

2. **Coordination Friction Score** — HIGH IMPACT
   - System handoff count × avg time between system switches
   - Identifies orchestration automation candidates

3. **Process Maturity Score** — MEDIUM IMPACT
   - Composite: standardization + documentation + confidence + frequency
   - Executive-facing north star metric

4. **Trend Intelligence** — HIGH IMPACT
   - Week-over-week delta for key metrics
   - Requires storing historical snapshots

5. **Conformance Score** — MEDIUM IMPACT
   - How well does a run match the recommended SOP?
   - Builds on existing SOP alignment engine

6. **Step-Level AI Suitability** — HIGH IMPACT
   - Per-step: is this data entry (automate), decision (augment), or coordination (orchestrate)?
   - Powers the AI opportunities panel

## Composite Scores Framework

### 1. Workflow Health Score (0-100)
Already exists as enum. Numeric version:
- Base: confidence × 40
- Bonus: no stale (+15), no high variation (+15), SOP ready (+15), docs complete (+15)

### 2. Process Maturity Score (0-100) — NEW
- Standardization (30%): from standardization score
- Documentation (25%): from documentation completeness + SOP alignment
- Confidence (20%): from average confidence
- Frequency (15%): log(runCount) normalized
- Stability (10%): from sequence stability

### 3. Cognitive Burden Score (0-100) — NEW
- Decision density (30%): decisions per step ratio
- System switches (25%): switches per step ratio
- Field entry burden (25%): data_entry + fill_and_submit step ratio
- Friction points (20%): from friction score

### 4. AI Opportunity Score (0-100)
Already built. Enhancement:
- Add per-step breakdown: automate vs augment vs orchestrate

## Metrics-to-Actions Framework

| Metric | Action When High | Action When Low |
|--------|-----------------|-----------------|
| Complexity | Simplify, break into sub-processes | Maintain, document |
| Friction | Reduce handoffs, improve UI | Benchmark as best practice |
| Rework rate | Fix validation, improve training | Standardize as-is |
| AI Opportunity | Evaluate automation ROI | Document for training |
| Standardization | Good — maintain | Investigate variants, align |
| Documentation drift | Update SOP | Maintain alignment |
| Cognitive burden | AI augmentation, simplify decisions | Maintain |

## Implementation Roadmap

### Phase 1 — Immediate (this session)
- Cognitive load score computation
- Process maturity score computation
- Step-level AI suitability classification
- Surface new scores in dashboard and workflow detail

### Phase 2 — Next Sprint
- Trend tracking (store weekly metric snapshots)
- Conformance scoring (run vs recommended SOP)
- Coordination friction score
- Historical comparison views

### Phase 3 — Future
- Predictive duration estimation
- Simulation engine (what-if analysis)
- Automated recommendations engine
- Agent integration hooks
