# Human Display Review — Process Maps and SOP
**Ledgerium AI** · Date: 2026-06-12 · Author: UX Designer · Status: Define-phase. Read-only on product code.

Upstream artifacts read: all four canvas components, all node/edge components, ShapeResolver, viewModel adapter, variantFlowModel, all SOP-view components, WorkflowModeSwitcher, WorkflowPageShell, WorkflowLegend, the existing finalize-plan artifacts (PM_FINAL_PLAN, ARCH_FINAL_PLAN, UX_FINAL_PLAN, PROCESS_MAPPING_MASTER_PLAN), and the live screenshots at `workflow-process-map.png`, `workflow-swimlane-view.png`, `workflow-variants-map.png`, `workflow-sop-tab.png`.

---

## 1. Expert Critique: Process-Map Modes for Human Comprehension

### 1.1 Flow Intelligence Map (flow mode)

**What is shipped and working**

The Visio P0 pass has done real work. Nodes have sharp 3px corners (not app-card roundness), a left-rail 4px color accent, correct ordinal badges, and weight-600 step labels. The phase-group overlay appears with faint colored bands. The `getSmoothStepPath` with `borderRadius: 0` produces orthogonal right-angle elbows. The ShapeResolver honesty chokepoint prevents fabricated diamonds. The screenshots confirm these are rendered in the product.

**Layout and reading direction**

The flow is rendered top-to-bottom with nodes positioned by their `position.x / position.y` values, which come from the engine. The screenshot shows correct vertical flow: Start → step 1 → step 2 → step 3 → step 4 → (End, out of frame). This is the correct reading direction for a process flow. The Gestalt principle of continuation (viewers follow implied lines) is served by the vertical column.

**Critical gap: the column is too narrow for the canvas width.** In the screenshot, a 280px-wide node column occupies roughly the center third of a 1280px canvas. Seventy percent of the canvas is empty grid. This is a Gestalt proximity failure: the nodes appear to float unmoored in space. A first-time viewer's eye is drawn to the white expanse, not the process. The phase-group band on the left appears disconnected from the nodes because the band's left edge is far to the left of the node column. The horizontal phase label "CONCUR — SUBMIT EXPENSE REPORT" is rendered in the phase overlay but the nodes live 200px to the right of that label — the label-to-content spatial relationship is broken.

The cause: the engine positions nodes with `position.x` values from its own coordinate space, and the `PhaseGroupOverlay` places itself at `node.position.x - PHASE_PADDING`. If the engine emits nodes at x=560 and the canvas is 1280px wide, the visual result is a central column with a phase band that also floats centrally, in the center-left of the canvas. There is no mechanism to scale or horizontally distribute the content to fill the canvas.

**Reading-order secondarity notation gap.** Visio and every world-class process tool use the white space around the flow as secondary notation — phase band colors fill the background across the full canvas width, creating visible zone boundaries. The current phase overlay is a narrow fixed-width rectangle that is narrower than the canvas. A viewer cannot glance at color zones to understand "the green zone is form submission; the purple zone is data entry." The background is uniform white in all zones.

**Edge label readability.** Edge labels ("Page navigation," "Form submitted," "Application switch") appear as small 10px chips mid-edge. The V-P2-12 offset of `-12px` is implemented. However, the chip text is ambiguous as navigation: "Page navigation" as an edge label describes a technical browser event, not a human-readable transition. A non-technical viewer reads "Navigate to next step" and understands the handoff. "Page navigation" reads as a browser UI concept. This is a copy issue, not a layout issue, but it is the primary readable text at first glance on many edges.

**The legend is hidden by default.** `DEFAULT_TOOLBAR.showLegend: false` is set in `WorkflowPageShell.tsx` line 76. The UX_FINAL_PLAN called for `showLegend: true` as the default. This means every user who opens the page sees an unlabeled diagram with no shape vocabulary key. For a non-expert, the category-color rail and the ordinal badge are uninterpretable without the legend. This is a P0 gap.

**Phase group band opacity.** The phase group overlay uses `background: \`${group.color}06\`` — 6 hex = ~2.4% opacity. This is functionally invisible at the font sizes and viewing distances typical for a laptop screen. The `UX_FINAL_PLAN §2.3` calls for lane tints at 5% opacity (the swimlane bands use `${lane.color}05`). In practice, 2–6% tint on white renders as near-white in a screenshot and is invisible on any display with slight color deviation. The phase band only shows its color through the header dot and label text — the spatial zone itself communicates nothing.

**Handle visibility.** Task nodes have three visible connection handles (top, bottom, right, left) with white fill and accent-color 2px ring borders, always visible at 10×10px. These are React Flow connectors. In a read-only, non-draggable, non-connectable canvas they should not be visible — they signal editable interactive state that does not exist. They add visual noise at every node.

**Confidence**: The `WorkflowTaskNode` renders a `ConfidenceDot` (1.5px circle) in the right-side icon group — but this is only in the SOP view. In the map node itself, the confidence metadata only appears in the Inspector Panel, not on the node face. This is correct for map density. However the `isLowConfidence` orange dot (line 175 of `WorkflowTaskNode.tsx`) is a 6px circle that is visually identical in size and position to the handle dots. A viewer cannot distinguish "this is a connection handle" from "this is a low confidence signal."

### 1.2 Swimlane / Cross-Functional Map

**What is shipped and working**

The swimlane canvas correctly organizes steps into horizontal bands by system, with a `SwimlaneLaneHeader` pinned to the left and `SwimlaneLaneBand` alternating backgrounds. The `HandoffEdge` uses a rounded smoothstep path (borderRadius: 16) with a violet "Handoff" badge. The single-system graceful-fallback is well-designed with clear text guidance.

**Screenshot analysis.** The swimlane screenshot shows two lanes (Salesforce, Google Sheets) with three steps each, displayed horizontally left-to-right across the lanes. The Start node sits above both lanes and flows down into the first Salesforce node. This left-to-right reading order within lanes is correct for cross-functional flowchart conventions (Rummler-Brache swimlane standard, Visio cross-functional template). The lane headers render cleanly.

**Critical gap: edge routing direction ambiguity in cross-lane transitions.** The violet "Page navigation" edge from Salesforce step 3 to Google Sheets step 4 routes as a smoothstep curve with borderRadius: 16 (rounded). The handoff badge sits at the geometric midpoint. However, in the screenshot the cross-lane connector curves back upward and to the right before descending into the Google Sheets lane. This creates an arc that, at first glance, appears to re-enter the Salesforce row — it does not read as a clean downward handoff. BPMN and Visio cross-functional standards use strict orthogonal routing for lane crossings: one segment goes straight down to the lane boundary, then a 90-degree turn to the target node. The `borderRadius: 16` on `HandoffEdge` is the wrong choice — it should use `borderRadius: 0` for lane-crossing edges, same as intra-lane edges. This is the most significant visual comprehension problem in the swimlane view.

**Lane width.** Each lane has a fixed-width header (from `SwimlaneLaneHeader`) but the lane band extends `width: Math.max(lane.bounds.width, 5000)`. This means the band theoretically extends 5000px but the node positions cluster near the center. The result is the same spatial disconnection observed in flow mode — the content column is a narrow zone inside a very wide band. The Gestalt principle of enclosure (common region) requires that the lane band tightly surrounds its contents, not leaves large empty horizontal space.

**Lane labels.** The lane header shows system name, step count, and total duration. This is the right content. However, `SwimlaneLaneHeader` (not read in detail) attaches as a React Flow laneHeader node, which pans and zooms with the canvas. When zoomed out enough that all lanes fit on screen, the header is visible. When zoomed in, the header may scroll off-screen to the left, leaving the lane unlabeled. World-class swimlane tools pin the lane header as a fixed left overlay independent of pan — see Visio and Lucidchart which keep lane labels visible at all zoom levels and pan positions.

**The `HandoffEdge` missing arrowhead marker.** The `HandoffEdgeComponent` renders a `BaseEdge` with no `markerEnd` prop (unlike `WorkflowEdgeComponent` which uses `markerEnd={url(#${markerId})}`). Cross-lane handoff edges are therefore arrow-free — they show the violet line and the Handoff badge but no arrowhead. This is a visual ambiguity: without an arrowhead, the direction of the handoff is conveyed only by edge topology, which requires the viewer to mentally trace the path.

### 1.3 Process Variants Map

**What is shipped and working**

The variants map has three sub-views: Map, DNA, and List. The List view is the most comprehensible — path cards with role-colored labels (Standard/Fastest/Longest/Exception Heavy) and a step sequence table with ordinal chips and divergence markers. The "Compare vs Standard" button and the comparison card are well-designed. The honesty mechanism is correct: the `SinglePathView` correctly differentiates "single recording" from "consistent multi-run" with distinct blue/green banners.

**Map sub-view (variant flow canvas).** When variant flow data exists, the Map view renders the full `WorkflowFlowCanvas` with decision diamonds at divergence points. The always-visible legend bar at the top (standard path solid line / variant path dashed amber / branch point diamond) is an excellent pattern — it answers "what am I looking at" immediately. This is the best-executed legend in the product.

**DNA strip.** The `VariantDnaStrip` renders compact colored pip sequences. This is a pattern used by process-mining tools (Celonis variant explorer) but requires familiarity with the encoding. It is appropriate as a secondary analytical view but would be opaque to a non-expert without in-view labeling.

**Critical gap: the story-map fallback node design.** When `variantFlowModel` is unavailable, the `WorkflowVariantStoryMap` renders `StoryNodeComponent` — tiny category-label-only boxes (no ordinal, no step title) 96-140px wide, connected by smoothstep edges. The nodes show only the category label ("NAVIGATION," "FORM SUBMIT") with no step title text. A viewer cannot answer "what step diverges here?" — they only know the category. This is a data-availability issue, but the UX should surface whatever text is available rather than showing bare category labels. The variant story map fallback is significantly less useful than the List view for any workflow with more than 3 variants.

**Screenshot observation.** The variants map screenshot (thumbnail view) shows the story map with small colored nodes and branching edges in a dense layout. At the thumbnail scale it is not legible, but this is a screenshot-scale artifact. The larger issue is the lack of step-title text in nodes.

**Divergence badging.** The "DIVERGES" amber badge in the List step sequence is the right pattern but it fires on `path.divergencePoints.includes(i)` which is a positional index, not an LCS-anchored comparison. A step at index 4 in a variant may be the "same" step as index 3 in the standard path if a step was inserted earlier. The code comment says "LCS-aligned divergence (not positional)" but the actual implementation at line 575 of `WorkflowVariantsMap.tsx` uses `path.divergencePoints.includes(i)` which is the positional index. If `divergencePoints` comes from the adapter pre-LCS-aligned, this is fine; if not, it may over-flag steps.

### 1.4 Systems Interaction Map

**What is shipped and working**

The systems map is a non-canvas HTML layout (not React Flow) with system cards in a flex row, handoff pill badges below, and a Handoff Timeline and Friction Analysis section. The `SingleSystemView` gracefully communicates when the map adds no value.

**Critical gap: the "network topology" is not a network diagram.** The description says "network topology" but the `SystemNetworkDiagram` is a flex-wrapped row of system cards with handoff pills floating below. There is no positioned edge between system nodes, no spatial encoding of which system connects to which, and no directional flow. A viewer sees a list of system cards and a list of transition badges — the spatial relationship between the two is completely implicit. A viewer cannot answer "does Salesforce hand off to Google Sheets or does Google Sheets hand off to Salesforce?" from the system cards plus the "Salesforce → Google Sheets" pill alone — they can read the text but there is no spatial arrow.

World-class system-interaction maps (ARIS, iGrafx, Lucidchart) render system nodes in a 2D space with directed arrows. The missing element here is: the system nodes should be positioned relative to each other with arrows connecting them representing handoffs. This could be accomplished by replacing the flex-row with an SVG or React Flow network canvas where each system is a positioned node and each handoff is a directed edge. This would be the single highest-leverage visual improvement to the systems map.

**The `HandoffTimeline` is actually the most comprehensible component in the systems map.** The numbered timeline rows (From system → To system, with step labels) are clear, scannable, and directly answer "where do handoffs happen in sequence." This is the correct cognitive frame for the systems map — it should be the primary view, not the secondary view.

**Friction Analysis signals.** The signal cards (High Context Switching, Repeated System Handoffs, Integration Opportunity) are well-designed with clear severity-colored icons. The content is honest and computed from observed data. The "Integration Opportunity" signal is always shown when `edges.length >= 2` which means it will appear on almost every multi-system workflow. This makes the signal feel generic rather than diagnostic.

---

## 2. Expert Critique: SOP Display for Human Execution

### 2.1 Execution Mode (SOPExecutionMode)

**What is good**

The Execution Mode document structure is sound: Quick Start → Procedure → Decision Points → Common Issues → Completion Checklist → Variants Summary → Intelligence → Tips → Provenance. This is close to how Scribe, Tango, and SweetProcess present procedures.

The expandable step cards with `aria-expanded` are the right pattern. The Completion Checklist with interactive checkboxes that turn green when all checked is excellent — this is the best-executed component in the SOP surface.

The "Quick Start" card (emerald gradient, prerequisites, systems, expected outcome) answers the most important operator question before they start: "what will I need and what should I see at the end?" Scribe Optimize does not do this — it goes straight to steps.

**What is missing or wrong from an execution perspective**

**Step titles are too long and not imperative-verb-led.** A world-class SOP step title begins with an imperative verb: "Open the expense report," "Select the filter," "Submit the form." The step titles come from `humanizeStepLabel()` which can produce labels like "Review line items," "Complete and submit Approve report," "Submit Notify employee." "Submit Notify employee" is not an instruction — it is a machine-interpreted label. When a user is executing step 6 out of 12 steps under time pressure, they need to scan the title alone and know what to do. The current titles are description-level, not instruction-level.

**The collapse-by-default interaction model places procedure content one click away.** All steps start collapsed — the user sees only the step title, category badge, system chip, duration, and confidence dot. The actual instructions (`detailText`) are inside the expanded state. For a user executing the procedure for the first time, every step requires a click to see what to do. Scribe and Tango display step instructions inline (no expand/collapse) because execution requires continuous visible instruction, not discovery-mode browsing.

The expand/collapse model is appropriate for the Intelligence Mode (analytical, reference-style) but is wrong for Execution Mode. Execution Mode should default to expanded inline steps (or at minimum make a subset of instruction content visible in the collapsed header row). The `detailText` rendering inside the expanded body is valuable and should be visible without a click.

**The `detailText` parsing pattern is fragile.** The code splits `detailText` on `\n`, filters empty strings, and classifies lines by prefix characters (`✓`, `→`, or digit + `.`). This means the quality of the rendered instructions depends entirely on the raw text having these exact formatting characters. If the SOP engine produces plain paragraph text without these markers, the "instructions" section renders as a single un-styled text block. The rendering cannot distinguish "step within a step" from "context note" without these synthetic prefixes.

**No role visibility.** The `SOPHeader` shows a `Users` icon with a count of roles but never names them. The step cards do not surface which role performs each step. In a multi-role process (e.g., "requester submits the form" then "manager approves the form"), the executor needs to know at each step whether they are the actor or the observer. SweetProcess and Trainual make role assignment visible per step with a name/avatar chip. The SOP model has `roles` in metadata but nothing propagates role assignment to the step level.

**System context is hidden on mobile.** The system chip in `ExecutionStepCard` has `hidden md:block` — it is invisible on narrow viewports. For a user following the SOP on a phone or tablet, the "what system am I in right now?" question is unanswered on any step. This is a P0 usability gap for mobile execution contexts.

**Step numbering restarts intent.** Steps are numbered by `step.ordinal` which is a global ordinal across the whole workflow, not a per-section step number. If a workflow has 12 steps across 3 systems, the ordinal is 1–12 globally. This is correct, but the `SectionLabel icon={Layers} label="Procedure" count={viewModel.steps.length}` only shows the total count, not a progress indicator. A user on step 7 of 12 has no persistent "where am I in this procedure?" signal beyond their own counting. World-class tools show "Step 7 of 12" as persistent state.

**Expected outcome is buried.** The expected outcome for each step is rendered inside the expanded body, below the instruction text, preceded by a `CheckCircle2` icon and the word "Expected:". For execution, the expected outcome is the verification signal — "did I do the step correctly?" Verification signals should be visually prominent, not rendered as a small 10px text block after the instructions.

**The Advisory Banner (quality advisory) renders before the step list.** A quality advisory (e.g., "Low confidence — 63% of steps above 0.7 threshold") appears as an amber banner between Quick Start and the step list. For an executor who has decided to run this SOP, this banner introduces doubt at the worst moment. Quality/confidence signals are useful for a manager evaluating the SOP, not for an operator about to execute it. This banner should either be in the header or suppressed in execution mode.

### 2.2 Intelligence Mode (SOPIntelligenceMode)

The Intelligence Mode is analytically rich and correctly positioned for the manager/analyst persona. The dark slate SmartHeader with the AI confidence bar is distinctive. The "Real vs Expected" table is genuinely useful for process auditors. The WorkflowDNA section is innovative.

The "Ask This Process" panel is a placeholder — the input is disabled and the prompts are non-functional. The panel takes up 320px of horizontal space on desktop. For a disabled feature, this is a significant amount of chrome. The disabled state should be a much smaller "Coming soon" indicator, not a full-width panel simulating functionality that does not exist.

### 2.3 Comparison to World-Class SOP Tools

**Scribe Optimize (direct competitor, shipped 2025-11-10, $75M Series C):**
Each step shows: screenshot thumbnail (evidence of what the UI looked like at this step), step number, instructional text derived from the action, and system URL/app name. The screenshot thumbnail is the key differentiator — it provides immediate visual context for "what does this look like on my screen." Ledgerium has `pageTitle` and `routeTemplate` but no screenshot attachment capability.

**Tango:**
Inline, no expand/collapse. Each step is a numbered card with full content visible. Step text starts with an imperative verb. "Click the [element name]" is generated directly from the UI event. Navigation transitions are shown as automatic step separators. Tango does not attempt SOP-level instructions — it stays close to the captured action.

**SweetProcess:**
Explicit "Who does this" field per procedure header and per sub-process. Version control with a visible "last updated by [person] on [date]" per step. Completion tracking per user, not per browser session. These are team-operational features that Ledgerium does not yet have.

**Trainual:**
Strong role/audience assignment. Content organized into "Topics" → "Processes" → "Steps" with a training-orientation: "Is this person new to this task? Start here." Test questions at the end of a procedure to verify understanding. The SOP doubles as training material.

**Key differentiator gaps vs world-class:**
1. Screenshot/screen-capture evidence per step (Scribe Optimize primary differentiator)
2. Imperative-verb step titles from observed actions (Tango's core strength)
3. Persistent role assignment per step (SweetProcess, Trainual)
4. "I completed this step" vs "I'm doing this step now" execution state (none of the above fully solve this; Ledgerium's completion checklist is closer than most)
5. Step-level progress indicator during execution

---

## 3. The 8–12 Highest-Leverage Polish Moves

These are ordered by impact on human comprehension at first contact. Items already shipped (Visio P0) are noted. Items from UX_FINAL_PLAN that are specified but not yet implemented are noted as "plan-specified, not shipped."

### POLISH-01: Turn the legend on by default (P0, 1-line change)
**File:** `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx` line 76
**Change:** `showLegend: false` → `showLegend: true`
**Why it matters:** Without the legend, every new viewer faces an unlabeled diagram. Color rails, diamond shapes, and dashed edges are unexplained. This is the highest ratio of impact to effort in the entire product. The UX_FINAL_PLAN §1.5 specified this change. It has not been applied.
**Not yet shipped.**

### POLISH-02: Fix the HandoffEdge to use borderRadius: 0 and add an arrowhead (P0)
**File:** `apps/web-app/src/components/workflow-view/edges/HandoffEdge.tsx` lines 22–31 and BaseEdge
**Change:** `borderRadius: 16` → `borderRadius: 0` in `getSmoothStepPath`. Add `markerEnd={\`url(#arrow-handoff)\`}` to `BaseEdge`. The `arrow-handoff` marker is already defined in `WorkflowSwimlaneCanvas.tsx` SVG defs (line 153). It just needs to be wired to the edge.
**Why it matters:** Cross-lane handoff edges currently arc in a way that visually appears to loop back into the source lane (see swimlane screenshot). Orthogonal routing and an arrowhead restore the directional clarity that is the entire purpose of the swimlane view. Fixing the arrowhead also eliminates the ambiguity of which end of the edge is the target.
**Not yet shipped.**

### POLISH-03: Make lane header fixed-left during horizontal pan (P0)
**File:** `apps/web-app/src/components/workflow-view/WorkflowSwimlaneCanvas.tsx`
**Change:** `LaneHeaderNode` is currently a React Flow node that pans and zooms with the canvas. Convert the lane header to a fixed absolute overlay positioned to the left of the canvas region (not a React Flow node), similar to how a swimlane header works in Visio. The `SwimlaneHeaderOverlay` pattern is already specified in UX_FINAL_PLAN §1.2 as a component slot. When the canvas pans horizontally, the left header column stays fixed.
**Why it matters:** When a user zooms in to read node labels, the lane headers disappear off the left edge of the screen. The viewer no longer knows which lane they are in. This is a fundamental orientation failure for a swimlane view.
**Plan-specified, not shipped.**

### POLISH-04: Phase band fills the full canvas width with meaningful opacity (P1)
**File:** `apps/web-app/src/components/workflow-view/WorkflowCanvas.tsx` — `PhaseGroupOverlay` component
**Change:** Replace `${group.color}06` (2.4% opacity) with `${group.color}12` (about 7%). Also change the group bounds calculation in `flowAdapter.ts` so the phase group extends the full canvas width (`width: Math.max(node positions extent + 2×padding, canvas width)`) rather than being clipped to the node bounding box.
**Why it matters:** Phase bands at 2.4% opacity are invisible — they provide no visual zoning. The secondary notation of layout (zone identity through background color) only works when the tint is visible. Celonis, Signavio, and Lucidchart all use 8–15% opacity for zone backgrounds. The band must also span the width of the content column to create enclosure (Gestalt proximity/common region).
**Not yet shipped.**

### POLISH-05: Hide handle dots on read-only canvases (P0)
**Files:** `WorkflowTaskNode.tsx`, `WorkflowDecisionNode.tsx`, `WorkflowTerminalNode.tsx`
**Change:** Apply `style={{ opacity: 0, pointerEvents: 'none' }}` to all `<Handle>` components, or pass `connectOnClick={false}` and set visibility to hidden. Alternatively, use a CSS rule: `.workflow-flow-canvas .react-flow__handle { display: none; }` in `globals.css`.
**Why it matters:** Visible connection handles on a read-only non-draggable canvas signal editable state that does not exist. They add visual noise and are visually similar to the `isLowConfidence` dot, creating ambiguity. They are also confusing to non-technical viewers who may attempt to click and drag them.
**Not yet shipped.**

### POLISH-06: SOP step titles must begin with an imperative verb (P0, copy change)
**File:** `apps/web-app/src/components/shared/humanize.ts` (or wherever `humanizeStepLabel` is implemented) — and the SOP view model adapter `sopViewModel.ts`
**Change:** In the SOP view model, post-process `step.title` to ensure it begins with an imperative verb. If the title starts with a gerund ("Reviewing," "Opening") or a noun ("Expense report"), prepend the dominant action verb from `node.dominantAction`. If `dominantAction` is "click," "navigate," "fill," or "submit," the step title should be "Navigate to [pageTitle]," "Fill in [label]," "Submit [form name]." The `humanizeStepLabel` function already has context available (`category`, `dominantAction`, `pageTitle`, `routeTemplate`) to do this. Applying the same transformation at SOP-title level ensures operators receive actionable instruction.
**Why it matters:** Execution SOP titles are the primary scannability signal. "Submit Notify employee" does not tell an operator what to do. "Submit the notification email" does.
**Not yet shipped.**

### POLISH-07: Execution Mode steps default to showing instruction content without a click (P1)
**File:** `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` — `ExecutionStepCard` component
**Change:** For Execution Mode, reveal the first 2 lines of `detailText` in the collapsed state, below the step title. If `detailText` is null or short, the collapsed card already shows sufficient context. If `detailText` is multi-line, show the first line with a faint "More →" hint. The expand behavior can remain for full disclosure, but execution steps should be partially visible by default. Alternatively: add a prop or mode to `ExecutionStepCard` that forces the body open by default.
**Why it matters:** A user executing a step needs to see what to do. Currently, seeing the instruction requires a click for every step. This doubles the interaction cost of executing a 10-step procedure.
**Not yet shipped.**

### POLISH-08: Add a step progress indicator during execution (P1)
**File:** `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx`
**Change:** Add a left-column step index rail — a vertical strip of numbered dots/circles, one per step, that highlights the "current" step as the user works through the procedure. This is a standard SOP/workflow execution pattern (SweetProcess, GitBook runbooks, Scribe step indicators). It can be implemented as a sticky left sidebar showing step ordinals 1–N with the currently-expanded step highlighted. The `expandedSteps` Set is already available in state — the most-recently-expanded step can serve as the "current" step indicator.
**Why it matters:** The screenshot of the SOP tab shows a left rail with step number circles (1, 2, 3, 4, 5, 6 visible). These circles exist but their state is static — they do not communicate progress. Activating them as progress indicators with a "current step" highlight would cost minimal engineering and deliver a significant execution UX improvement.
**Partially shipped (circles exist), progress state not wired.**

### POLISH-09: Surface step system context on mobile (P0 for mobile users)
**File:** `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` — `ExecutionStepCard`, line 290
**Change:** Remove `hidden md:block` from the system chip. The system chip is 9px text and occupies ~60–80px. On narrow viewports it should render below the step title, not be hidden. Alternatively, show the system as a small colored pill (same as the `systems-needed` chips in `QuickStartSection`) that is always visible.
**Why it matters:** An operator executing a procedure needs to know which application to be in at each step. Hiding this on mobile removes the most important orientation signal for mobile users. This is a rule, not an opinion — every world-class SOP tool surfaces the "system/app" context per step in their mobile views.
**Not yet shipped.**

### POLISH-10: Add a visible step count progress strip above the procedure section (P1)
**File:** `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` — above the step map section
**Change:** Replace `<SectionLabel icon={Layers} label="Procedure" count={viewModel.steps.length} />` with a row that shows `"Step — of N"` as a mini progress bar, updating as the user expands steps. This requires tracking the ordinal of the most-recently-expanded step and displaying it as a fraction.
**Why it matters:** A user 7 steps into a 12-step procedure has no ambient signal of where they are. Completion rate (how far through the procedure the user gets before abandoning) is a key metric in the PRD §4 measurement plan. A progress indicator directly drives this metric.
**Not yet shipped.**

### POLISH-11: Systems map primary view must be a directed network diagram, not a flex card list (P1)
**File:** `apps/web-app/src/components/workflow-view/WorkflowSystemsMap.tsx` — `SystemNetworkDiagram` component
**Change:** Replace the `flex items-start justify-center gap-4 flex-wrap` card layout with a React Flow canvas where each system is a positioned node and each handoff is a directed edge with arrowhead. The existing `ViewSystem` and `ViewSystemEdge` data model supports this directly. Use the existing `WorkflowFlowCanvas` infrastructure — this is a 4–6 node graph at most, trivial to lay out.
**Why it matters:** The current systems map does not spatially encode "which system connects to which." The `HandoffTimeline` below it is more comprehensible, which is backwards — the network diagram should be the most comprehensible component. Celonis and Signavio both render system-topology as a positioned node-link graph with directed arrows. Without spatial encoding, the "system network diagram" is just a list of cards with labels, which any table would communicate more efficiently.
**Not yet shipped.**

### POLISH-12: Add a per-step "View on map" link from the SOP to the Flow Intelligence map (P1, addresses map-SOP linkage)
**File:** `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` — in each `ExecutionStepCard` expanded body
**Change:** Add a small "View on map →" link below the expected outcome block. When clicked, it switches the active tab to the Workflow tab and selects the corresponding node in the canvas (`onSelectNode(node.id)`). The `step.id` maps to a node ID in the view model, so the link can be implemented as a callback prop from the parent shell.
**Why it matters:** This closes the most important UX gap between the two surfaces (see §4 below). An operator reading a step who needs visual spatial context can go directly to the map node. Currently, SOP and map are completely disconnected — switching tabs resets selection state.
**Not yet shipped.**

---

## 4. How Maps and SOP Should Relate: One Truth, Two Views

The SOP and the process map are two presentations of the same underlying data model (`NormalizedViewModel`). They share `stepId` as the stable identifier across both surfaces. This identity relationship is the foundation for cross-surface navigation.

### The mental model to design for

A process map answers "what is the shape and sequence of the process?" — spatial, analytical, overview-first. A SOP answers "how do I execute this step right now?" — linear, instructional, step-focused. They are complementary, not redundant. The world-class pattern (used by SAP Signavio, Celonis, and Bizagi) is to make the two views synchronize:

- Clicking a step on the map opens its SOP detail inline (or in a panel)
- Clicking a step in the SOP highlights it on the map
- The "you are here" state is shared

### Current state

At present, the two views are completely disconnected. The Workflow tab and the SOP tab are separate routes under the same workflow page. Switching between them resets all selection state. The only structural link is that both consume the same `processOutput` artifact. There is no navigation link from the SOP to the map or from the map to the SOP.

The inspector panel in the map (`WorkflowInspectorPanel`) shows the step's `procedure` text (from `ViewNode.procedure`, which is `ss.detail` from the SOP step). This is the only surface where map-SOP data merges — inside an existing panel that most users will not open.

### The linkage and navigation to offer

**Level 1 — In-panel SOP text (already exists, improve quality)**
The `WorkflowInspectorPanel` shows the procedure text. This surface should show the full SOP step content, not just raw `detail` text. It should render the same `ExecutionStepCard` expanded-body content that the SOP tab shows. This makes clicking a map node feel like "opening the SOP for this step" without leaving the map.

**Level 2 — "View on map" from SOP step (POLISH-12, defined above)**
Each SOP step card should have a "View on map →" link that switches to the Workflow tab with the corresponding node pre-selected and centered in the canvas. This requires: (a) a tab-switch callback exposed from the parent page shell, (b) the `nodeId` available in the `SOPViewStep` type (it already has `stepId` which maps to `ViewNode.id`), and (c) calling `onSelectNode(nodeId)` after tab switch.

**Level 3 — Split view (P2, future)**
A split-pane layout where the map occupies the top 60% of the screen and the SOP occupies the bottom 40%, with selection synchronized. Clicking a node on the map scrolls the SOP to that step. This is the pattern used by Scribe Optimize's "Document Workflow" mode — side-by-side diagram and procedure. This is a larger feature and belongs in the Phase 2 roadmap.

**Level 4 — "Follow me" execution mode (P2, future)**
When a user marks a step as "done" in the SOP checklist, the map highlights the next step. This is the interactive training scenario where the map functions as a progress tracker. Requires the SOP checklist state to emit events that the map consumes.

### The minimum viable linkage to ship now

1. `WorkflowInspectorPanel` renders the full SOP step content (procedure, warnings, expected outcome, decision block) when a node is selected — not just raw `procedure` text
2. `ExecutionStepCard` in the SOP has a "View on map →" link per step (POLISH-12)
3. The Workflow tab and SOP tab share URL-addressable state: `?tab=workflow&node=step-id-3` opens the map with step 3 selected; `?tab=sop&step=3` opens the SOP scrolled to step 3

These three changes make the two views feel like the same document rather than two separate tools.

---

## 5. Prioritized P0–P2 Punch-List

### Relationship to the existing finalize/ plan

The `UX_FINAL_PLAN.md` (dated 2026-06-12) and `PROCESS_MAPPING_MASTER_PLAN.md` define the primary architectural changes: 6-mode switcher, ELK layout, BPMN mode, Timeline mode, export/print, ProvenanceBanner, ZoomControls overlay, legend-always-on. Those items are not re-argued here — they are correct and should proceed. This punch-list identifies items that are NOT covered by the existing plan or are specified in the plan but not yet shipped.

The ELK layered-layout P1 (from ARCH_FINAL_PLAN) will directly improve flow mode by producing well-distributed node positions that fill the canvas width and use consistent column spacing. Items below that the ELK layout addresses are noted with `[ELK covers]`.

---

### P0 — Must ship before any demo or external sharing

| ID | Item | Component | Status vs existing plan |
|---|---|---|---|
| H-P0-1 | Turn legend on by default (`showLegend: true`) | `WorkflowPageShell.tsx` line 76 | Plan-specified (UX_FINAL_PLAN §1.5). Not applied. 1-line change. |
| H-P0-2 | `HandoffEdge` uses `borderRadius: 0` and adds `markerEnd` arrowhead | `HandoffEdge.tsx` | Not in any existing plan. Net-new. |
| H-P0-3 | Hide React Flow connection handles on read-only canvases | All node components + CSS | Not in any existing plan. Net-new. |
| H-P0-4 | System chip visible on mobile in SOP step cards | `SOPExecutionMode.tsx` line 290 | Not in any existing plan. Net-new. |
| H-P0-5 | Reveal first 2 lines of `detailText` in collapsed SOP step header | `SOPExecutionMode.tsx` | Not in any existing plan. Net-new. |
| All V-P0-* | Visio shape vocabulary already shipped | Per VISIO_VISUAL_SPEC | Already shipped. Preserve. |
| E-P0-3 | Legend always-on default | `WorkflowPageShell.tsx` | Plan-specified. Repeat from H-P0-1. |
| E-P0-4 | ProvenanceBanner for single-run maps | New component | Plan-specified. Not shipped. |
| E-P0-2 | ZoomControls always-visible on canvas | React Flow `<Controls>` | Plan-specified. Not shipped. |

---

### P1 — Professional, world-class environment

| ID | Item | Component | ELK covers? | Status vs existing plan |
|---|---|---|---|---|
| H-P1-1 | Fixed-left lane header overlay in swimlane mode | `WorkflowSwimlaneCanvas.tsx` + overlay | No | Plan-specified (UX_FINAL_PLAN §1.2 `SwimlaneHeaderOverlay`). Not shipped. |
| H-P1-2 | Phase band full-canvas-width at 12% opacity | `flowAdapter.ts` + `PhaseGroupOverlay` | Partially — ELK improves distribution but not phase band width | Net-new. |
| H-P1-3 | Systems map replaced with directed React Flow network graph | `WorkflowSystemsMap.tsx` — `SystemNetworkDiagram` | No | Net-new. Significant work. |
| H-P1-4 | SOP step titles in imperative-verb form | `humanize.ts` or `sopViewModel.ts` | No | Net-new. Requires copy-logic change. |
| H-P1-5 | Step progress indicator in SOP execution (left ordinal rail, current step highlighted) | `SOPExecutionMode.tsx` | No | Net-new. |
| H-P1-6 | `WorkflowInspectorPanel` renders full SOP step content (not just raw procedure text) | `WorkflowInspectorPanel.tsx` | No | Not in plan. Map-SOP linkage Level 1. |
| H-P1-7 | "View on map" link per SOP step | `SOPExecutionMode.tsx` | No | Not in plan. Map-SOP linkage Level 2. |
| E-P1-1 | Per-mode loading/error/unprocessed/forbidden states | Per-mode canvas components | No | Plan-specified. Not shipped for all modes. |
| E-P1-7 | BPMN mode — basic layout and shapes | New `WorkflowBPMNCanvas` | ELK provides L-R layout | Plan-specified. Not shipped. |
| All V-P1-* | Swimlane lane overlay, title bar, etc. | Per VISIO_VISUAL_SPEC | Partial | Plan-specified. Partially shipped. |

---

### P2 — Completeness, edge cases, and future-proofing

| ID | Item | Component | Notes |
|---|---|---|---|
| H-P2-1 | URL-addressable node selection (`?tab=workflow&node=id`) | Page-level routing | Map-SOP linkage Level 3 enabler. |
| H-P2-2 | Story-map fallback nodes show step title text (not category-label only) | `WorkflowVariantStoryMap.tsx` `StoryNodeComponent` | Currently shows only category label when `variantFlowModel` unavailable. |
| H-P2-3 | Step-level "I completed this step" → map node highlights next step | SOP checklist + map canvas | Map-SOP linkage Level 4. Phase 2. |
| H-P2-4 | Decision node `observed-validation` pill badge ("1 run") | `WorkflowDecisionNode.tsx` | Specified in UX_FINAL_PLAN §5.2 and in code comment; pill rendered at line 143–160 of `WorkflowDecisionNode.tsx`. Verify it renders in the canvas (the "observed in 1 run" pill is implemented but not confirmed in screenshots). |
| H-P2-5 | Frequency legend section only when `isMultiRun=true` | `WorkflowLegend.tsx` | Plan-specified UX_FINAL_PLAN §5.4. Legend not mode-aware yet. |
| H-P2-6 | Advisory banner moved to header / suppressed in execution mode | `SOPExecutionMode.tsx` | Net-new. Reduces doubt at execution start. |
| H-P2-7 | `detailText` structured rendering independent of `\n` and `✓`/`→` prefixes | `SOPExecutionMode.tsx` content renderer | Net-new. Robustness improvement. |
| H-P2-8 | Variants DNA strip labeled for non-expert readers | `VariantDnaStrip.tsx` | A one-line legend below the strip explaining the encoding. |
| E-P2-1 | Zoom-adaptive label hiding below 0.5 zoom | All canvases | Plan-specified. Not shipped. |
| E-P1-8 | Timeline mode — proportional bars | New `WorkflowTimelineCanvas` | Plan-specified (Timeline) or Histogram depending on DECISION D-1 outcome. |

---

## 6. Assumptions

1. The `ViewNode.stepId` → `SOPViewStep.id` identity relationship is stable and available at the page-shell level. If not, map-SOP linking requires an adapter step.

2. The `detailText` in `SOPViewStep` is produced by the SOP engine and may contain structured formatting (`\n`, `✓`, `→`) or plain prose. The rendering in `ExecutionStepCard` is fragile if prose is delivered; the structured rendering should be treated as an enhancement, not a requirement, and fall back gracefully to paragraph rendering.

3. POLISH-03 (fixed lane header) requires the `SwimlaneHeaderOverlay` component concept from UX_FINAL_PLAN §1.2. This is not currently implemented — it is a new component that replaces the `LaneHeaderNode` React Flow node approach.

4. POLISH-11 (systems network diagram) requires the `buildSystemData` adapter to emit `position` fields on system nodes suitable for React Flow placement. The current `systemAdapter.ts` may not produce layout positions — it may need a simple layout calculation (horizontal row or circular placement) added.

5. H-P1-4 (imperative step titles) requires that `humanizeStepLabel` or `sopViewModel.ts` have access to the `dominantAction` field. This field exists on `ViewNode` but the SOP adapter path (`sopViewModel.ts`) may not pipe it through. Verify the data is available before implementation.
