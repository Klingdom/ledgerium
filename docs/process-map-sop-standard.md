# Process Map & SOP Canonical Standard v2.0

## Why the old model was insufficient

The v1.x process map and SOP outputs were structurally correct but produced
machine-generated documentation that failed to build enterprise trust:

1. **Boilerplate prose** — Purpose, scope, and notes contained generic
   template text ("Standard operating procedure for performing...") that
   added no value and signaled automation.

2. **No personalization** — Outputs did not reflect the specific systems,
   roles, fields, or business objective of the observed workflow. A
   Salesforce opportunity workflow read identically to a SAP PO workflow.

3. **No friction intelligence** — Pain points (excessive navigation,
   retries, context switching, long waits) were invisible. The primary
   value proposition of observing real behavior was left on the table.

4. **No decision support** — Decision nodes existed in the type system but
   were never inferred from data. Submit-then-error patterns (the most
   common decision) were rendered as flat sequences.

5. **Noise leakage** — Every system event (loading_started, loading_finished,
   modal_opened) became a full SOP instruction, creating verbose output
   that operators would not follow.

6. **Mechanical completion criteria** — "All N steps executed in sequence"
   is not how humans verify work is done. Criteria should be outcome-based.

7. **No trigger or context** — SOPs didn't say when to use them. Process
   maps didn't show what starts or ends the process.

## Canonical Process Map Model v2.0

### Information Architecture

```
ProcessMap
├── name            — Activity name
├── objective       — Inferred business objective
├── trigger         — What starts this process
├── outcome         — What completing this process produces
├── durationLabel   — Total observed duration
├── systems[]       — All systems used
├── frictionSummary — Aggregate friction indicators
├── phases[]        — System-grouped phases with enriched labels
├── nodes[]
│   ├── start       — Trigger node (categoryLabel: "Trigger")
│   ├── task        — Standard activity step
│   ├── decision    — Inferred decision point (amber styling)
│   ├── exception   — Error/recovery step
│   └── end         — Completion node (categoryLabel: "Complete")
└── edges[]
    ├── sequence    — Normal flow
    └── exception   — Error path
```

### Key Design Decisions

**Decision inference:** When a `fill_and_submit` or `send_action` step is
immediately followed by an `error_handling` step, the submit step is
promoted to a `decision` node type. This reflects the real branching:
the submission was either accepted or rejected.

**Phase enrichment:** Phase labels incorporate business context from the
contained steps (e.g., "SAP — Data Entry & Submission" instead of just
"SAP"). This makes swimlane views immediately informative.

**Friction annotations:** Each node carries `frictionIndicators` in its
metadata when the enricher detects issues (backtracking, long waits,
excessive navigation, context switching). Renderers can display these as
inline callouts.

**Boundary labels:** Decision-to-exception edges get "Validation failed"
labels. Decision-to-task edges get "Accepted" labels. This provides
instant flow comprehension without reading step details.

### Node Naming Rules

| Category | Title Pattern | Example |
|----------|--------------|---------|
| click_then_navigate | Navigate to {destination} | Navigate to Invoice List |
| fill_and_submit | Complete {form name} | Complete Purchase Order Form |
| data_entry | Enter {field names} | Enter Customer Details |
| send_action | Submit {action target} | Submit Approval Request |
| file_action | Attach {file context} | Attach Supporting Documents |
| error_handling | Resolve {error context} | Resolve Validation Error |
| annotation | Note: {text} | Note: Verified with manager |

## Canonical SOP Model v2.0

### Section Order

| # | Section | Source | Required |
|---|---------|--------|----------|
| 1 | Title | activityName (cleaned) | Yes |
| 2 | Business Objective | Inferred from step patterns | Yes |
| 3 | Purpose | Generated from step count, systems, actions | Yes |
| 4 | Trigger | Inferred from first step and workflow pattern | Yes |
| 5 | Scope | Systems + roles + coverage | Yes |
| 6 | Prerequisites | System access + observed data fields | Yes |
| 7 | Quality Indicators | Confidence, errors, friction count | Yes |
| 8 | Procedure Steps | Step cards with instructions | Yes |
| 9 | Completion Criteria | Outcome-based, not count-based | Yes |
| 10 | Common Issues | From error_handling steps | If errors exist |
| 11 | Friction Summary | From enrichment layer | If friction exists |
| 12 | Notes | Operational observations | Yes |
| 13 | Source Attribution | Evidence linkage statement | Yes |

### Step Card Structure

```
┌─────────────────────────────────────────────┐
│ [ordinal]  Title              [category tag] │
│            Action summary                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. Click "New Opportunity"              │ │
│ │ 2. Enter value in "Amount"              │ │
│ │ 3. Submit via "Save"                    │ │
│ │ ✓ Verify confirmation message appears   │ │
│ │ → Page navigates to "Opportunity View"  │ │
│ └─────────────────────────────────────────┘ │
│ [Decision: Was the submission accepted?]     │ ← if decision point
│ [MEDIUM · 60s delay detected]                │ ← if friction
│ System: Salesforce  · 3.5s  · 90% confidence │
│ → Form submitted and confirmation received    │
│ ⚠ Contains sensitive data fields             │ ← if applicable
└─────────────────────────────────────────────┘
```

### Instruction Classification

| Event Type | Instruction Type | Rendering |
|-----------|-----------------|-----------|
| interaction.* | `action` | Numbered (1. 2. 3.) |
| navigation.open_page | `wait` | Numbered |
| system.toast_shown | `verify` | ✓ prefix |
| system.error_displayed | `verify` | ✓ prefix |
| navigation.route_change | `note` | → prefix |
| system.loading_finished | suppressed | Not rendered |
| session.* lifecycle | null | Excluded entirely |

### Tone & Voice Rules

- **Imperative voice**: "Click", "Enter", "Verify" — not "The user clicks"
- **Concise**: One clause per instruction, no padding words
- **Business language**: "Submit the invoice" not "Click the submit button"
- **No meta-commentary**: Notes describe the workflow, not the generation method
- **Sensitive fields**: Named but values never exposed; brief warning, not verbose

### Noise Suppression Rules

1. `input_change` events deduplicated per field (last edit wins)
2. `loading_finished` suppressed entirely (loading_started covers it)
3. System lifecycle events (`window_focused`, `visibility_changed`) excluded
4. Session events (`started`, `paused`, `stopped`) excluded
5. Adjacent route_change events after navigation.open_page: only the open_page kept

## JSON → Output Mapping

### Event → SOP Instruction

```
CanonicalEvent.event_type → instructionType classification
CanonicalEvent.target_summary.label → instruction text object
CanonicalEvent.page_context.pageTitle → navigation context
CanonicalEvent.target_summary.isSensitive → warning flag
```

### DerivedStep → ProcessMap Node

```
DerivedStep.title → cleanStepTitle() → node.title
DerivedStep.grouping_reason → node.category + node.nodeType
DerivedStep.confidence → metadata
DerivedStep.page_context.applicationLabel → phase assignment
DerivedStep + next step pattern → decision inference
```

### DerivedStep → SOP Step

```
DerivedStep.title → cleanStepTitle() → step.title
DerivedStep.grouping_reason → step.category + action builder
DerivedStep.source_event_ids → event lookup → instructions
DerivedStep.confidence → step.confidence
```

## Content Enrichment Pipeline

```
ProcessEngineInput
  ├── inferBusinessObjective()  → SOP.businessObjective, ProcessMap.objective
  ├── inferTrigger()           → SOP.trigger, ProcessMap.trigger
  ├── detectFriction()         → SOP.frictionSummary, node.metadata.frictionIndicators
  ├── detectDecisionPoints()   → node.nodeType='decision', step.isDecisionPoint
  ├── extractCommonIssues()    → SOP.commonIssues
  ├── inferRoles()             → SOP.roles, step.actor
  ├── computeQualityIndicators() → SOP.qualityIndicators
  ├── generatePurpose()        → SOP.purpose
  ├── generateScope()          → SOP.scope
  ├── generatePrerequisites()  → SOP.prerequisites
  ├── generateCompletionCriteria() → SOP.completionCriteria
  ├── generateNotes()          → SOP.notes
  └── enrichPhaseLabel()       → phase.name
```

## Edge Cases

| Case | Handling |
|------|----------|
| Empty steps | SOP has 0 steps, map has only start/end |
| No system detected | Falls back to "the system" in prose |
| All error steps | Friction summary shows high severity |
| Single step | Valid output; no decision inference possible |
| No page context | Step inherits current phase's system |
| Unknown grouping reason | Falls back to 'single_action' |

## Future Extension Points

1. **Multi-run aggregation**: Merge multiple recordings of the same workflow
   to compute frequency, variance, and golden-path SOP
2. **AI-enhanced titles**: Use LLM to improve step titles while preserving
   deterministic instruction content
3. **Visual branch rendering**: Render decision nodes with actual branch
   paths in React Flow instead of linear layout
4. **Screenshot integration**: Attach captured screenshots to SOP steps
5. **Export formats**: Markdown, PDF, and DOCX renderers using the
   structured SOP/ProcessMap types
6. **Variant comparison**: Side-by-side view of process variants highlighting
   differences
