# Research — Best-in-Class Process Mining Standards for Clustering + Variant Analysis

**Date:** 2026-06-10 · **Author:** competitive-researcher (multi-agent board) · **Type:** Define-phase research brief.

Feeds the PRD/architecture/algorithms for Ledgerium's clustering + process-variation feature. Everything below is filtered through Ledgerium's hard constraint: **deterministic, reproducible, evidence-linked** outputs.

## 1. Canonical model + formats (decision)

```
Normalized step events
  → Internal: Directly-Follows Graph (DFG) for fast variant computation
  → Discovery: Inductive Miner (infrequent) → Process Tree → Petri net → BPMN 2.0
  → Interchange/export: XES (IEEE 1849-2023); OCEL 2.0 JSON later
  → User display: DFG with frequency overlays + BPMN 2.0 for discovered models
```
- **XES (IEEE 1849-2023)** — ADOPT as interchange. One recording session = one XES *trace*; steps = events. Universal tool support (Celonis, Apromore, pm4py, ProM).
- **OCEL 2.0** — CONSIDER (v2 export) for future multi-object/multi-role workflows. Premature for MVP (Ledgerium runs are single-actor, one-trace-per-run).
- **DFG** — ADOPT as the primary *user-facing* visualization (fast, deterministic, readable by non-experts; concurrency limitation rarely fires on sequential browser recordings).
- **BPMN 2.0** — long-term export/display for discovered models + SOPs. **Petri nets / Process Trees** = internal representation only (never shown to users).

## 2. Discovery algorithms (adopt / avoid)

| Algorithm | Verdict | Why |
|---|---|---|
| **Inductive Miner – infrequent (IMf)** | **ADOPT (primary)** | Deterministic, **sound** (no deadlocks, every trace replayable), process-tree → BPMN. Pin noise threshold (default **0.20**) + record it per model. |
| **Split Miner 2.0** | **ADOPT (BPMN export)** | Deterministic, best simplicity/accuracy/speed BPMN; open-source (Apromore). Use when output must be clean BPMN (SOP export). |
| Heuristics Miner | CONSIDER (fallback) | Robust to noise but **no soundness guarantee**; fixed/documented params only. |
| Fuzzy Miner | AVOID | Stochastic aggregation breaks evidence traceability. |
| Alpha Miner | AVOID | Cannot handle real-world noise; superseded. |

## 3. Variant analysis — competitive landscape

Across **all** leaders a *variant* = a **unique ordered activity sequence**; two traces share a variant iff their sequences are byte-identical. Distributions follow a **power law** (~80% of cases in <20% of variants).

| Capability | Celonis | Signavio | Apromore | UiPath | Power Automate |
|---|---|---|---|---|---|
| Variant = unique sequence | ✓ | ✓ | ✓ | ✓ | ✓ |
| Frequency (Pareto) view | ✓ | ✓ | ✓ | ✓ | ✓ |
| Happy/standard-path isolation | ✓ (algorithmic) | ✓ | ✓ | ✓ | ✓ |
| Complexity slider (spaghetti→clean) | ✓ | ✓ | ✓ | ✓ (variants slider) | ✓ |
| Log-to-log comparison | limited | limited | ✓ (Multi-Perspective Comparator) | ✓ (Compare Mode) | ✓ |
| Conformance vs reference model | ✓ | ✓ (separate widget) | ✓ | ✓ | ✓ |
| BPMN discovery output | limited | ✓ | ✓ (Split Miner) | ✓ | ✓ |

- **Celonis** — Variant Explorer (top-9 variant columns by frequency; case count + % + avg throughput; map synchronized with selection). Standard path in primary color, branches fade by frequency.
- **Apromore** — *log-to-log* variant comparison: per-group DFGs overlaid with color-coded differences (A-only / B-only / both) + simultaneous log animation. Closest analog to what Ledgerium should build.
- **UiPath** — variants slider strips rare branches (the "spaghetti→clean" metaphor).
- **Scribe / Tango** — documentation tools with **NO variant analysis** → Ledgerium's direct differentiation: "how many ways is this process run, and where do people deviate?"
- **Soroco + Apromore partnership (2024)** — real-behavior capture + process mining = **Ledgerium's exact positioning**; the key competitive watch.

## 4. Trace clustering — "same/similar process" grouping

Must run **before** variant analysis (clustering defines the population a variant distribution describes).

**Similarity measures** (all deterministic except embeddings):
- **Normalized Levenshtein / LCS** on activity sequences — ADOPT (tolerant of insert/delete noise; LCS already in Ledgerium's `variantAnalyzer`).
- **n-gram / bag-of-activities + cosine**, **transition-profile (Markov) distance** — CONSIDER (supplements; Markov needs longer traces).
- **Alignment cost (conformance-based)** — semantically meaningful but needs a reference model first.
- **Neural embeddings (trace2vec/act2vec)** — **AVOID**: non-deterministic training → violates Ledgerium's determinism invariant.

**Clustering algorithm:** **DBSCAN** (no preset K, isolates noise/outlier recordings explicitly) or **single-link/connected-components agglomeration** (order-invariant, incremental). HAC dendrogram = CONSIDER for exploration.

**Scale:** **MinHash + LSH** banding for near-duplicate candidate generation → O(n) instead of O(n²); exact similarity only on candidates. Deterministic with fixed/stored hash functions.

**Threshold guidance (Jaccard / similarity):** ≥0.85 near-identical (same variant) · 0.60–0.85 same process, different variant · <0.60 different process. Store every threshold as **versioned config** with the model artifact.

## 5. Conformance + diverge→reconverge

- **Alignment-based conformance (A\*)** — ADOPT (state-of-the-art; deterministic; per-trace synchronous / log-move / model-move with cost). **Token replay** = AVOID (superseded; token-flooding correctness failures). Browser traces (5–50 steps) → standard A* is fast.
- **Diverge/reconverge points** — use **three in combination**: (1) **LCS backbone** = standard path, no reference model needed; (2) **DFG out-degree>1 = split / in-degree>1 = join**, frequency-filtered; (3) **alignment deviation rate** per step once a reference model is confirmed. All deterministic from the log.

## 6. "Variant DNA" visualization (recommended)

1. **Variant frequency bar** (Pareto-sorted): width = case count, color intensity = avg duration; an 80%-cumulative line splits primary paths from the long tail.
2. **Sequence DNA strip**: each variant = a row of colored activity blocks aligned on the LCS backbone, so diverge/reconverge appear as misalignments.
3. **Diverge/reconverge annotations** on the DFG/BPMN: split/join nodes with per-branch % of cases.
4. **Deviation-rate heatmap** on the standard path — % of runs deviating at each step (investigation hotspots).
All computable deterministically from the event log, no black-box inference — preserving the evidence-linked moat.

## 7. Prioritized adoption

**ADOPT (MVP / near-term):** XES interchange · DFG display · IMf (0.20) · Split Miner 2.0 (BPMN) · normalized-Levenshtein/LCS + DBSCAN/connected-components · MinHash+LSH · LCS backbone for standard path · DFG split/join diverge-reconverge · alignment-based conformance · Variant Frequency (Pareto) bar · Sequence DNA strip.
**CONSIDER (post-MVP):** OCEL 2.0 export · transition/Markov distance · HAC dendrogram · Split Miner OR-gates · mutual-fingerprint statistical comparison · REACH/ConLES (only if traces grow >50 steps).
**AVOID:** neural-embedding clustering · Fuzzy Miner · Alpha Miner · token replay (primary) · OCED (unstable) · any abstraction that discards source-event identity (breaks the evidence moat).

## 8. Governance — versioned parameters (determinism invariant)

Store with every model/cluster artifact: `cluster_similarity_threshold` (0.70) · `cluster_dbscan_epsilon` (0.30) · `cluster_dbscan_min_samples` (2) · `discovery_algorithm` (imf|split_miner) · `discovery_noise_threshold` (0.20) · `dfg_min_edge_frequency_pct` (0.05) · `ALGORITHM_VERSION` hash. A changed hash = re-derive.

---
*Full citations (Celonis/Signavio/Apromore/UiPath/Power Automate docs, van der Aalst DFG limitations, Split Miner, MinHash+LSH, alignment-based conformance, mutual fingerprints, trace clustering surveys) retained in the agent transcript. Sources are public product docs + peer-reviewed process-mining literature.*
