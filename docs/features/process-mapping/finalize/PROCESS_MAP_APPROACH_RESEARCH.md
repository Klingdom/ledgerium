# Process-Map Approach — Research & World-Class Polish

**Ledgerium AI** · Date: 2026-06-13 · Author: Process-Mapping Research Authority (Define-phase; no product code)
**Status:** Research + opinionated recommendation. Builds on — does not duplicate — `PROCESS_MAPPING_MASTER_PLAN.md`, `ARCH_FINAL_PLAN.md`, and `HUMAN_DISPLAY_REVIEW_UX.md`.

> Charter: review Ledgerium's process-map **approach** against what process-mining-visualization research and the
> best tools (Celonis, Disco/Fluxicon, Apromore, UiPath, BPMN guidance, academic graph-drawing + flowchart-comprehension
> work) say makes a map maximally comprehensible to humans — and recommend the polish that takes it to world-class,
> inside the HARD constraints: **deterministic** (byte-reproducible, hydration-safe) and **honest** (observed-only).

---

## 0. Executive opinion (read this first)

Ledgerium's *foundations* are already in the top decile: a single deterministic render pipeline, an honesty chokepoint
that no competitor enforces, and a Visio-grade shape vocabulary. The finalized plan's next two moves — **deterministic
ELK layered layout + orthogonal routing**, and the **cycle-time histogram + evidence-rendered BPMN** views — are exactly
the right calls and are confirmed by the research below. **Do not change that plan. Sharpen it.**

The research is unambiguous on one point the current plan under-weights: **layout correctness is necessary but not
sufficient for human comprehension.** Tools that win on comprehension (Celonis, Disco) layer four *perceptual* aids on top
of a good layout — **happy-path emphasis, edge-thickness = frequency, a frequency-simplification slider, and
overview+detail (minimap / single-case replay)**. These are comparatively cheap, they ride entirely on already-observed
data (so they pass the honesty filter trivially), and they are deterministic by construction. They are the difference
between "a correct diagram" and "a diagram a non-expert reads in 60 seconds."

The single highest-leverage strategic insight: Ledgerium's two unfair advantages — **determinism** and **evidence-linking**
— are also *comprehension* advantages that the literature explicitly prizes (mental-map stability; a citation, not a
calculation). No competitor can match them. **Make them visible, and Ledgerium is demonstrably better than Visio, Scribe,
and Celonis for human understanding** (§4).

---

## 1. What the research + best tools say makes a process map maximally comprehensible

Organized as the comprehension stack — from skeleton (layout) up to interaction (disclosure). Each item cites sources and
states the *mechanism* (why it helps a human), because the mechanism is what tells us how to apply it honestly + deterministically.

### 1.1 Layered (Sugiyama) layout + crossing minimization — the skeleton

The dominant algorithm for drawing directed process graphs is the **Sugiyama framework**: five phases — cycle removal,
layer assignment, crossing minimization, coordinate assignment, edge routing. Crossing minimization is the comprehension-
critical phase, classically solved by an iterative **layer-by-layer sweep** (barycenter/median heuristic with a fixed layer
informing a free layer, optionally a transpose step) [Disy; Wikipedia "Layered graph drawing"; Eclipse ELK].

**Mechanism (why humans care):** edge crossings are the single largest source of extraneous cognitive load in node-link
diagrams — every crossing forces the reader to disambiguate "which line is which." Minimizing crossings and assigning nodes
to clean layers turns "trace this tangle" into "read these columns." This is *the* reason ELK `layered` (a faithful Sugiyama
implementation) is the correct engine, and it is why the current `i*300` / vertical-stack adapters under-perform: they impose
no layer discipline and do nothing to minimize crossings.

**Ledgerium fit:** the finalized plan already specifies ELK `layered` + `NETWORK_SIMPLEX` layering + `LAYER_SWEEP` crossing
minimization under a frozen option set, with the proven Plan-B layered arithmetic as the deterministic sync fallback. This is
correct and matches the research. (Sources: [Disy — Sugiyama method](https://blog.disy.net/sugiyama-method/); [Wikipedia — Layered graph drawing](https://en.wikipedia.org/wiki/Layered_graph_drawing); [Eclipse ELK — Layered overview](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html).)

### 1.2 Orthogonal routing + consistent reading direction — the grammar

Process-modeling guidance and the comprehension literature converge on two structural rules:

- **One consistent flow direction** with minimal back-edges. Mendling, Reijers & van der Aalst's **Seven Process Modeling
  Guidelines (7PMG)** — the most-cited empirical guidance for understandable process models — explicitly favor *structuredness*,
  *minimizing crossing/back-edges*, and a layout that the eye can follow without backtracking, because these correlate with
  lower error rates and higher understanding scores in controlled studies [7PMG, Mendling et al. 2010].
- **Orthogonal (Manhattan) routing** for the edges themselves. Right-angle elbows read as "tracks/rails"; the eye follows a
  horizontal-then-vertical path far more reliably than an arbitrary spline. This is why BPMN tools, Visio cross-functional
  templates, and Celonis all route orthogonally.

**Mechanism:** Moody's **Physics of Notation** (the standard framework for cognitively-effective visual notation) names
*perceptual discriminability* and *complexity management* as primary levers — orthogonal routing maximizes discriminability of
individual edges, and a consistent direction is a form of complexity management (one mental model, not per-edge). It also names
*cognitive fit*: the notation must match the reader's task — for "follow the process," a left-to-right rail is the fit [Moody 2009, Physics of Notation].

**Ledgerium fit:** the plan already commits to `edgeRouting=ORTHOGONAL` and a single direction (**RIGHT** for all flow-like
modes). The research supports RIGHT: horizontal reading is the convention for Visio cross-functional and BPMN, and a single
direction removes per-mode router special-casing. **One caution (confirmed by the UX review):** the swimlane `HandoffEdge`
currently uses `borderRadius: 16` (rounded) and lacks an arrowhead — this *violates* the orthogonal-grammar rule precisely
where it matters most (lane crossings). Fixing it to `borderRadius: 0` + arrowhead is not polish, it is grammar repair.
(Sources: [7PMG — Mendling/Reijers/van der Aalst](https://dl.acm.org/doi/10.1016/j.infsof.2009.08.004); [Malinova & Mendling — diagram understanding](https://research.wu.ac.at/ws/files/16999517/15_15262_TR_MalinovaMendling.pdf).)

### 1.3 Decision-point clarity — the honesty/comprehension intersection

7PMG and BPMN guidance both stress that **gateways/decisions must be explicit, sparse, and unambiguous** — a decision symbol
that fires where there is no real branch is worse than no symbol, because it teaches the reader to distrust the notation
(semiotic-clarity violation in Moody's terms: one symbol, one meaning). The corollary best practice in process *mining* is the
opposite of hand-drawn modeling: **render a decision only where the data actually diverged**, and label it with **observed
frequency**, never an invented condition.

**Mechanism:** a diamond is a high-salience symbol (Moody: *visual expressiveness*). Spending that salience on a real branch
makes the branch pop; spending it on a fabricated branch is extraneous load *and* erodes trust.

**Ledgerium fit — this is Ledgerium's signature strength.** The honesty chokepoint (`decisionProvenance ∈ {observed-divergence,
observed-validation}`; `inferred → process box`; frequency-only labels) is a *direct implementation* of the research best
practice, and it is stronger than what any benchmarked tool enforces at the render layer. **No change needed — protect it.**

### 1.4 Happy-path emphasis — the comprehension accelerant

Celonis defines the **happy path** as "the path with the most frequent starting activity and the most frequent ending
activity… the way we would expect the process to look and the most common variant," and visually emphasizes it. Disco's
**map metaphor** uses *coloring of activities and coloring + thickness of paths* so the dominant flow is the first thing the
eye lands on [Celonis Process Explorer; Fluxicon Disco].

**Mechanism:** this is *progressive disclosure* applied to a static frame and Gestalt *figure/ground* — give the reader the
80% case as a bold, continuous spine and let the exceptions recede. Eye-tracking and cognitive-load work show readers anchor
on the most salient continuous path first, then explore deviations; a map that pre-computes that anchor is read faster.

**Ledgerium fit — partial.** The variant view has a "standard path solid / variant dashed" legend (the UX review correctly
calls it the best legend in the product), but the *flow* mode and the forthcoming BPMN mode do not yet emphasize the modal
path. This is a top-tier gap (§3). (Sources: [Celonis — Process Explorer vs Variant Explorer](https://www.celonis.com/blog/celonis-ems-process-explorer-and-variant-explore-whats-the-difference); [Fluxicon Disco](https://fluxicon.com/disco/).)

### 1.5 Frequency encoding + variant/frequency simplification slider — managing complexity

Two of the most universal process-mining affordances:

- **Edge thickness = frequency.** Celonis: "edges can be configured to adapt their thickness according to the number of cases
  passing through them — highly frequented edges will be thicker." Disco encodes frequency in path thickness + color. This is
  *dual coding* (Moody): the same datum (frequency) is encoded both as a number on the edge and as a pre-attentive thickness,
  so the reader sees the shape of the process before reading a single label.
- **The simplification slider.** Disco ships **Activities** and **Paths** sliders (pull Activities down to see only the modal
  variant's spine; raise Paths to reveal rare arcs); Apromore ships **nodes** and **arcs** frequency sliders (defaults 100% /
  10%) plus an infrequent-behavior filter; Celonis Variant Explorer exposes Less/More/Reset coverage controls [Disco; Apromore;
  Celonis].

**Mechanism:** real processes are spaghetti at 100% coverage. The slider lets a human *choose their cognitive load* — start at
the happy path, add complexity on demand. This is the single most important interaction in production process mining, and it is
why mining tools out-comprehend hand-drawn Visio on real data: Visio shows everything always.

**Ledgerium fit — missing (slider) / partial (thickness).** The master plan lists a "frequency-threshold slider" at P2 and
"frequency focus" for large graphs, but neither edge-thickness-by-frequency nor a working slider is shipped. Because Ledgerium
captures per-edge run counts (the variant model already carries `N runs · X%` labels), both are **free of the honesty risk** —
they encode *observed* counts only. (Sources: [Fluxicon Disco](https://fluxicon.com/disco/); [Apromore — Discover model](https://documentation.apromore.org/discovery/discovermodel.html); [Celonis Process Explorer](https://help.celonis.com/cpm47/en/process-explorer).)

### 1.6 Overview + detail: minimap, and single-case animation/replay — orientation

- **Minimap / overview.** Standard in every node-link tool for graphs that exceed the viewport; it preserves orientation
  ("where am I in the whole?") during zoom/pan. The master plan already has a minimap toggle.
- **Single-case animation / replay.** Disco's signature: "fluid animation of any process map with timestamp information…
  playback controls… case replay." A token animates along the path of a single case through the discovered map.

**Mechanism:** *overview+detail* (Shneiderman) reduces disorientation cost; *animation of a single case* converts an abstract
aggregate graph into a concrete narrative ("watch one expense report flow") — the most powerful onboarding aid in process
mining, because it answers "what does one run actually do?" without abandoning the aggregate frame. It is also the natural home
for Ledgerium's evidence-linking: each animated step *is* a cited event.

**Ledgerium fit — minimap partial, animation absent.** Animation is the highest-ceiling differentiator available (§4) and it
fits the deterministic/honest constraints exactly: replaying an *observed* single trace is honesty by definition, and the
animation path is a pure function of the observed order (deterministic). (Sources: [Fluxicon Disco](https://fluxicon.com/disco/); [Fluxicon — Process Mining Book tutorial](https://fluxicon.com/book/read/tutorial/).)

### 1.7 Layout stability / mental-map preservation — the determinism dividend

A distinct research thread — **mental-map preservation** — finds that when a graph changes (filter applied, slider moved, new
runs added), keeping node positions as stable as possible improves user orientation and task performance: "the placement of
existing nodes and edges should change as little as possible when a change is made." Results are *mixed but net-positive*
(Purchase et al. found benefits for several tasks; some studies found smaller effects), and the most recent process-mining
result — **"Mental Maps in Process Mining: Does Stabilizing DFGs Improve Process Analysis Performance?"** — directly studies
stabilizing directly-follows graphs as a user moves the abstraction slider [Springer 2025; Archambault & Purchase; Bridgeman/Tamassia].

**Mechanism:** every re-layout forces the reader to rebuild their spatial memory from scratch. Stable layouts let the reader
*keep* their mental map across interactions, so a filter feels like "fading detail in/out" rather than "a new diagram."

**Ledgerium fit — this is a latent superpower.** Ledgerium's hard determinism constraint *already guarantees* byte-identical
layout for fixed input. The missing move is to make stability hold *across the frequency slider* (§3.2): when the user simplifies,
surviving nodes must not jump. Done right, Ledgerium gets the mental-map benefit *for free* from a constraint it already has —
something tools with randomized/force-directed layouts cannot offer. (Sources: ["Mental Maps in Process Mining" — Springer](https://link.springer.com/chapter/10.1007/978-3-032-02867-9_31); [Mental Map Preservation Helps User Orientation in Dynamic Graphs](https://link.springer.com/chapter/10.1007/978-3-642-36763-2_42).)

### 1.8 Progressive disclosure + secondary notation — the polish layer

Moody's *complexity management* and the 7PMG *decomposition* guideline both endorse **progressive disclosure**: show structure
first, detail on demand (expand a node, open an inspector, drill into a sub-process). And **secondary notation** — layout zones,
background tints, whitespace, color bands that carry meaning *beyond* the formal symbols — is a documented comprehension aid:
Celonis/Signavio/Lucidchart use 8–15% background tints to communicate zones at a glance.

**Ledgerium fit — partial.** Inspector-panel drill exists; SOP expand/collapse exists. But the phase-band secondary notation is
shipped at ~2.4% opacity (invisible) and clipped to the node bounding box rather than the zone — the UX review flags both. Fix
is cheap and high-impact.

---

## 2. Scoring Ledgerium's CURRENT approach against the world-class bar

Scale: **A** = world-class / research-aligned; **B** = solid, gap remains; **C** = present but materially behind; **D** = missing.
"Post-Visio-P0 + honesty chokepoint" baseline.

| # | Comprehension lever (research) | World-class exemplar | Ledgerium today | Score | Gap |
|---|---|---|---|---|---|
| 1.1 | Layered/Sugiyama + crossing min | ELK/Celonis/Signavio | ELK `layered` **planned**, not shipped; today vertical-stack/`i*300` | **C→A on plan** | Ship ELK (already P1) |
| 1.2 | Orthogonal routing + 1 direction | Visio/BPMN | Flow elbows shipped; swimlane handoff rounded + no arrowhead | **B** | HandoffEdge grammar repair (P0) |
| 1.3 | Decision-point honesty | (none enforce it) | **Chokepoint enforced** — best in class | **A** | Protect, don't touch |
| 1.4 | Happy-path emphasis | Celonis/Disco | Variant legend only; flow/BPMN not emphasized | **C** | Add modal-path emphasis (§3.1) |
| 1.5a | Edge thickness = frequency | Celonis/Disco | Frequency in labels, not thickness | **C** | Thickness scale (§3.3) |
| 1.5b | Frequency-simplification slider | Disco/Apromore/Celonis | Listed P2, not shipped | **D** | Slider (§3.2) — top gap |
| 1.6a | Minimap / overview | all tools | Toggle exists | **B** | Default-on for large graphs |
| 1.6b | Single-case animation/replay | Disco (signature) | Absent | **D** | Differentiator (§4) |
| 1.7 | Layout stability / mental map | (hard for force layouts) | **Determinism guarantees it** for fixed input | **A‑latent** | Extend across slider (§3.2) |
| 1.8a | Secondary notation (zones) | Celonis/Signavio | Phase band ~2.4% + clipped | **C** | Opacity + full-width (cheap) |
| 1.8b | Progressive disclosure | Moody/7PMG | Inspector + SOP expand exists | **B** | Keep; wire to map (UX review) |
| — | Evidence-linking | (none) | **Cite-not-calculate** end to end | **A** | Make visible (§4) |
| — | Determinism / reproducibility | (none) | **Byte-identical, hydration-safe** | **A** | Make visible (§4) |

**Verdict.** Ledgerium is **A on the two things nobody else has** (honesty, evidence/determinism) and **A-on-plan for the
skeleton** (ELK). It is **C/D on the perceptual + interaction comprehension layer** — happy-path emphasis, frequency thickness,
the simplification slider, and single-case animation. That layer is where the comprehension wins live, it is cheap, and it is
honesty-safe (all observed counts). **This is the gap the polish should close.**

---

## 3. The polish that most raises human comprehension (confirm/refine the plan + fill the gaps)

The plan's **ELK layered + orthogonal** core is **confirmed** — it is the correct skeleton and every source backs it. Below,
each addition states *why it helps a human* and *how it stays deterministic + honest*. Ordered by comprehension-per-effort.

### 3.1 Happy-path (modal-path) emphasis — `[CONFIRM + extend to all modes]`
**What:** in flow + BPMN modes, render the most-frequent end-to-end path as a **bold, high-contrast spine** (thicker stroke,
fuller-opacity nodes); render non-modal steps/edges at reduced visual weight. Reuse the variant view's proven "standard path
solid / variant dashed" treatment, generalized to the shared pipeline.
**Why it helps humans:** Gestalt figure/ground + progressive disclosure — the reader lands on the 80% case in <1s, then
explores deviations. Directly mirrors Celonis happy-path and Disco's map metaphor (§1.4).
**Honest + deterministic:** the modal path is computed from observed run counts (the variant model already identifies the
standard path); emphasis is a styling function of observed frequency — no fabrication, pure function of input.

### 3.2 Frequency-simplification slider WITH mental-map stability — `[ADD — top gap]`
**What:** a single **coverage slider** (Disco/Apromore pattern) that progressively hides the lowest-frequency edges/nodes:
100% = every observed path; lower = converge toward the happy-path spine. Pair it with **stable positions** — surviving nodes
keep their ELK coordinates as detail fades (do not re-run layout to refit).
**Why it helps humans:** lets the reader *choose their cognitive load* (§1.5) — the single most important interaction in
production process mining — and the stability turns it into "fading detail in/out," capturing the mental-map benefit (§1.7) that
randomized-layout tools cannot.
**Honest + deterministic:** filtering by observed frequency never fabricates — it *hides* observed data and must label that it
is doing so ("showing paths ≥ N runs / X% of traces"). Determinism is preserved two ways: (a) the filter predicate is a pure
function of observed counts; (b) **pre-compute the full-coverage ELK layout once and filter the rendered subset from it** — so
positions are byte-identical at every slider stop and never depend on an async re-layout. This is the honesty-safe, hydration-safe
way to ship the slider, and it is *better* than Disco (whose force-influenced layouts shift on filter).
**Caveat to honor:** when the slider hides paths, the run-count/percentage chip must reflect "of shown" vs "of all" explicitly,
or it silently lies. Make the denominator visible.

### 3.3 Edge-thickness = frequency (dual coding) — `[ADD]`
**What:** scale edge stroke width to observed traversal count, on a **fixed, quantized scale** (e.g. 3 buckets: hairline /
medium / bold) rather than a continuous px-per-run ratio.
**Why it helps humans:** pre-attentive — the shape of the dominant flow is visible before any label is read (§1.5). Pairs with
3.1 (the happy path is the thickest spine by construction).
**Honest + deterministic:** thickness encodes the observed count already shown in the label (dual coding, not new information).
**Quantize** the scale (buckets, not raw px) so it is byte-identical across machines and immune to floating-point/font drift —
this is the determinism-safe way to ship thickness.

### 3.4 Secondary-notation zones at meaningful opacity — `[REFINE — cheap]`
**What:** raise phase/lane band opacity from ~2.4% to ~8–12% and extend the band to span the content zone's full width (not the
clipped node bounding box). (UX review POLISH-04.)
**Why it helps humans:** zone identity through background color is documented secondary notation (§1.8); at 2.4% it communicates
nothing. Celonis/Signavio/Lucidchart use 8–15%.
**Honest + deterministic:** purely visual; zone boundaries derive from observed phase/system grouping; fixed tints are
deterministic.

### 3.5 Reading-direction consistency + orthogonal grammar repair — `[CONFIRM RIGHT + fix handoff]`
**What:** keep the plan's **RIGHT** for all flow-like modes; fix `HandoffEdge` to `borderRadius: 0` + arrowhead so lane
crossings obey the same orthogonal grammar as intra-lane edges (UX review POLISH-02). Pin swimlane lane headers fixed-left so
the reader never loses lane orientation on pan/zoom (POLISH-03).
**Why it helps humans:** one direction = one mental model (§1.2, 7PMG); an un-arrowed rounded handoff is the single worst
comprehension defect in the current swimlane view (it reads as looping back). Fixed lane labels preserve orientation (overview).
**Honest + deterministic:** routing/direction are layout-only; no data implications.

### 3.6 Single-case animation / replay — `[ADD — highest ceiling; see §4]`
**What:** a "Play a run" control that animates a token along the observed path of one selected trace through the aggregate map,
with each step linking to its source event.
**Why it helps humans:** converts an abstract aggregate into a concrete narrative — Disco's most-loved feature (§1.6) — and is
the natural stage for Ledgerium's evidence-linking.
**Honest + deterministic:** replaying an *observed* single trace is honesty by definition; the animation path is a pure function
of the observed event order (deterministic; the animation *timeline* is presentation, not layout, so it cannot break
hydration — gate it client-only like ELK).

### 3.7 Minimap default-on for large graphs + zoom-adaptive labels — `[REFINE]`
**What:** auto-show the minimap above a node threshold; hide labels below ~0.5 zoom (plan E-P2-1). Overview+detail (§1.6).
**Honest + deterministic:** view-only.

> **What NOT to add (the literature warns against it):** force-directed / "organic" layouts (destroy mental-map stability and
> determinism); fabricated gateway conditions (semiotic-clarity + honesty violation); animated *layout* transitions that move
> nodes (re-layout = mental-map reset). Ledgerium's constraints already forbid these — the research confirms forbidding them is
> *correct*, not merely safe.

---

## 4. The 1–2 moves that make Ledgerium demonstrably BETTER than Visio / Scribe / Celonis for human understanding

Visio is hand-drawn (no evidence, no analytics). Scribe Optimize is the positional threat (browser capture, BPMN export) but
its maps are **AI summaries**, not deterministic-from-evidence. Celonis out-analyzes everyone but requires ERP event-log
connectors and **cannot capture browser behavior**, and its layouts shift under filtering. Two moves exploit the seam none of
them occupy:

### MOVE 1 — Evidence-linked, single-case replay ("watch one real run, every step is a citation")
Combine **single-case animation (§3.6)** with **evidence-linking** so that playing a run animates a token through the map *and*
each step is click-through to its captured source event. This is a category-first capability:
- **vs Visio:** Visio has no runs to replay — it's a drawing.
- **vs Scribe:** Scribe's maps are AI-generated summaries; an animated step there is a *guess*, not a cited event. Ledgerium's
  is a *citation*.
- **vs Celonis:** Disco/Celonis can animate cases, but the animated step traces to an ERP event-log row, not to the actual
  captured *browser action* with its DOM/page evidence — and Celonis cannot capture browser work at all.
**Why it wins comprehension:** answers "what does one real run actually do?" as a narrative while keeping the aggregate frame —
the most effective onboarding aid in process mining — and makes Ledgerium's deterministic, evidence-first identity *visible* at
the exact moment of understanding. **Fits constraints perfectly:** observed-only by definition; deterministic path; client-only
animation.

### MOVE 2 — Stable mental map under interaction ("the map never re-draws on you")
Make the **frequency slider (§3.2)** and incremental run-additions **layout-stable**: nodes never jump; detail fades in/out on a
fixed coordinate frame, derived from the byte-identical ELK layout.
- **vs Celonis/Disco:** their force-influenced layouts re-flow when you filter or add data — the reader's mental map resets each
  time (the exact failure mode the mental-map research documents).
- **vs Visio/Scribe:** no equivalent — Visio is static-manual; Scribe re-summarizes.
**Why it wins comprehension:** the mental-map literature (§1.7) shows stability improves orientation + task performance;
Ledgerium's determinism constraint *uniquely* delivers it for free. This converts a compliance/reproducibility property into a
**comprehension** advantage no competitor can copy without abandoning their layout engine.

> **Positioning line for the UI:** *"Generated from evidence, not drawn. Every step is a citation. The map never re-draws on you."*
> The first clause beats Visio; the second beats Scribe; the third beats Celonis. All three are *true by construction* and now
> *visible*.

---

## 5. Prioritized recommendations — folded into the `finalize/` plan

Mapped onto the existing P0→P2 spine (`ARCH_FINAL_PLAN §5`, `MASTER_PLAN §6`). **Net-new vs plan** is flagged; everything else
**confirms** an existing plan item with a research citation. Every item is observed-only + deterministic + hydration-safe.

### P0 — grammar + honesty (ship before any demo)
1. **CONFIRM** honesty chokepoint + ShapeResolver routing (`inferred → process`). *(plan P0-1/P0-2; research §1.3 — this is the
   single strongest differentiator; protect it.)*
2. **CONFIRM** lift deterministic layered fallback + orthogonal Manhattan routing to all modes (sync). *(plan P0-3/P0-4; §1.1–1.2.)*
3. **NET-NEW (grammar repair):** `HandoffEdge` → `borderRadius: 0` + arrowhead; fixed-left swimlane lane header. *(UX POLISH-02/03;
   §3.5 — highest comprehension-per-line in the product.)*
4. **CONFIRM/APPLY:** legend on by default; ZoomControls + ProvenanceBanner. *(UX POLISH-01; plan E-P0-2/3/4 — secondary
   notation + provenance honesty.)*

### P1 — Visio parity + the perceptual comprehension layer (the gap)
5. **CONFIRM** ELK `layered` + `edgeRouting=ORTHOGONAL`, client-only with sync fallback, frozen option set. *(plan P1-1..P1-5;
   §1.1 — the skeleton; the hydration-safe pattern is correct as written.)*
6. **NET-NEW:** **happy-path / modal-path emphasis** in flow + BPMN (generalize the variant treatment). *(§3.1; §1.4.)*
7. **NET-NEW:** **edge-thickness = frequency**, quantized buckets. *(§3.3; §1.5 — dual coding; determinism via quantization.)*
8. **REFINE:** phase/lane zones at ~8–12% opacity, full-zone-width. *(UX POLISH-04; §3.4.)*
9. **CONFIRM** the two new views: **Cycle-Time Histogram** + **evidence-rendered BPMN 2.0** (frequency-only gateway labels). *(plan
   P1; benchmark §3 — table-stakes statistical lens + enterprise-standard notation; both honesty-safe.)*

### P2 — interaction comprehension + differentiators
10. **NET-NEW (elevate from "P2 slider"):** **frequency-simplification slider with mental-map stability** — pre-compute full-coverage
    layout, filter the rendered subset, surface "of shown vs of all" denominators. *(§3.2; §1.5/1.7 — the top missing interaction;
    MOVE 2.)*
11. **NET-NEW:** **single-case animation/replay with evidence-linked steps.** *(§3.6; §1.6 — MOVE 1; the highest-ceiling
    differentiator; client-only, observed-only.)*
12. **REFINE:** minimap default-on above a node threshold; zoom-adaptive label hiding. *(plan E-P2-1; §3.7.)*
13. **CONFIRM** export/print (A4 landscape, white bg, 2× PNG) for every mode incl. the histogram + BPMN + BPMN 2.0 XML export. *(plan
    P2; benchmark §3B — Scribe parity.)*

### Sequencing note (honors the operating model)
This is a **Mode 1 iteration series**, not a Mode-5 batch — each item is independently shippable behind a named test
(`ARCH_FINAL_PLAN §5`). The perceptual layer (6–8) should ship *with or immediately after* ELK (5), because ELK without
happy-path emphasis + frequency encoding is a correct skeleton without the muscles that make it readable — the research is clear
that the skeleton alone leaves comprehension on the table. The two differentiators (10–11) are the **highest-ceiling** items and
the strategic priority once parity is reached, because they convert Ledgerium's existing constraints (determinism, evidence) into
*visible comprehension advantages* no competitor can copy.

---

## 6. One-paragraph bottom line for the CEO

Ledgerium's process-map foundations are already research-grade: the honesty chokepoint implements the exact decision-point
discipline the literature prescribes (and that no competitor enforces), and the determinism constraint silently delivers the
mental-map stability that dynamic-graph research prizes. The finalized ELK-layered + orthogonal + histogram + BPMN plan is
**correct — confirm it.** The gap is the *perceptual + interaction* comprehension layer that mining tools win on: **happy-path
emphasis, edge-thickness-by-frequency, a frequency-simplification slider, and single-case replay.** All four ride on
already-observed data (honesty-safe) and on the fixed ELK layout (determinism-safe). Ship them, and Ledgerium clears the
world-class bar. Then make two moves nobody else can match — **evidence-linked single-case replay** and a **map that never
re-draws on you** — and Ledgerium is demonstrably better than Visio, Scribe, and Celonis for human understanding, *by
construction*.

---

## Sources

**Layered/Sugiyama layout + crossing minimization**
- Disy — The Sugiyama Method (Layered Graph Drawing): https://blog.disy.net/sugiyama-method/
- Wikipedia — Layered graph drawing: https://en.wikipedia.org/wiki/Layered_graph_drawing
- Eclipse ELK — Layered (overview): https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html
- Preserving Order during Crossing Minimization in Sugiyama Layouts (IVAPP 2022): https://rtsys.informatik.uni-kiel.de/~biblio/downloads/papers/ivapp22.pdf

**Process-modeling comprehension guidance**
- Mendling, Reijers & van der Aalst — Seven Process Modeling Guidelines (7PMG), Information & Software Technology 52(2), 2010: https://dl.acm.org/doi/10.1016/j.infsof.2009.08.004
- Moody — The Physics of Notations (cognitively effective visual notation): referenced via Malinova & Mendling, Cognitive Diagram Understanding: https://research.wu.ac.at/ws/files/16999517/15_15262_TR_MalinovaMendling.pdf

**Process-mining tools (frequency, happy path, sliders, animation)**
- Celonis — Process Explorer: https://help.celonis.com/cpm47/en/process-explorer
- Celonis — Process Explorer vs Variant Explorer (happy path): https://www.celonis.com/blog/celonis-ems-process-explorer-and-variant-explore-whats-the-difference
- Fluxicon Disco (map metaphor, sliders, animation/replay): https://fluxicon.com/disco/
- Fluxicon — Process Mining Book, Hands-on Tutorial: https://fluxicon.com/book/read/tutorial/
- Apromore — Discover model (nodes/arcs frequency sliders, infrequent-behavior filter): https://documentation.apromore.org/discovery/discovermodel.html

**Layout stability / mental-map preservation**
- Mental Maps in Process Mining: Does Stabilizing DFGs Improve Process Analysis Performance? (Springer, 2025): https://link.springer.com/chapter/10.1007/978-3-032-02867-9_31
- Mental Map Preservation Helps User Orientation in Dynamic Graphs (Springer): https://link.springer.com/chapter/10.1007/978-3-642-36763-2_42
- Preserving the Mental Map using Foresighted Layout: https://www.researchgate.net/publication/2565942_Preserving_the_Mental_Map_using_Foresighted_Layout

**Competitive context** (from `finalize/COMPETITIVE_BENCHMARK.md`)
- Scribe Optimize (browser capture + BPMN export); UiPath Process Mining; SAP Signavio — see benchmark doc for full list.
