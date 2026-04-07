# Template System Architecture

## Overview

The Ledgerium template system provides six rendering views of process intelligence:
three process map templates and three SOP templates. Each template consumes the
same `ProcessOutput` data model and produces a strongly-typed, presentation-ready
artifact that can be rendered to Markdown, HTML, or React components.

## Architecture

```
ProcessEngineInput
    ↓
processSession() → ProcessOutput
    ↓
selectTemplates(output, overrides?) → TemplateSelection
    ↓                                      ↓
renderProcessMap(output, template)    renderSOP(output, template)
    ↓                                      ↓
RenderedProcessMap                    RenderedSOP
    ↓                                      ↓
renderProcessMapMarkdown()            renderSOPMarkdown()
    ↓                                      ↓
Markdown string                       Markdown string
```

Shortcut API: `renderTemplates(output, overrides?)` → `RenderedArtifacts`

## Template Types

### Process Map Templates

| Template | ID | Best For | Default? |
|----------|-----|---------|----------|
| Cross-Functional Swimlane | `swimlane` | Multi-system workflows with handoffs | Yes (4+ steps) |
| BPMN-Informed | `bpmn_informed` | Complex branching, retries, system interactions | When branching ≥ 30% |
| SIPOC + High-Level | `sipoc_high_level` | Executive summaries, short workflows | When ≤ 3 steps |

### SOP Templates

| Template | ID | Best For | Default? |
|----------|-----|---------|----------|
| Operator-Centric | `operator_centric` | Frontline execution, training | Yes |
| Enterprise | `enterprise` | Formal governance, multi-system | When 3+ systems or 8+ steps across 2+ systems |
| Decision-Based | `decision_based` | Triage, branch-heavy workflows | When branching ≥ 30% |

## Selection Rules

### Process Map Selection

1. **SIPOC** if `stepCount ≤ 3` — too few steps for detailed map
2. **BPMN-Informed** if `branchingRatio ≥ 0.3` or `(decisionNodes ≥ 2 AND exceptionNodes ≥ 2)` or `(hasSystemEvents AND branchingRatio ≥ 0.2)`
3. **Swimlane** — default for everything else

### SOP Selection

1. **Decision-Based** if `branchRatio ≥ 0.3` or `(decisionSteps ≥ 2 AND errorSteps ≥ 2)` or `(hasCommonIssues AND branchRatio ≥ 0.2)`
2. **Enterprise** if `systemCount ≥ 3` or `(stepCount ≥ 8 AND systemCount ≥ 2)` or `(stepCount ≥ 10 AND hasFriction)`
3. **Operator-Centric** — default for everything else

### Manual Override

```typescript
const artifacts = renderTemplates(output, {
  processMap: 'bpmn_informed',
  sop: 'enterprise',
});
```

Partial overrides are supported — unspecified templates use auto-selection.

## File Structure

```
packages/process-engine/src/
├── templateTypes.ts              # Type definitions for all 6 templates
├── templateSelector.ts           # Deterministic selection rules
├── templates/
│   ├── index.ts                  # Public API: renderTemplates, renderArtifactsToMarkdown
│   ├── processMapTemplates.ts    # 3 process map renderers
│   ├── sopTemplates.ts           # 3 SOP renderers
│   ├── renderHelpers.ts          # Shared utilities
│   ├── markdownRenderer.ts       # Markdown export for all 6 templates
│   └── templates.test.ts         # 30 tests
```

## Rendered Artifact Types

### SwimlaneProcessMap
- `lanes[]` — system/role ownership lanes
- `steps[]` — ordered steps with lane assignment
- `decisions[]` — decision diamonds with yes/no paths
- `handoffs[]` — cross-lane transitions
- `frictionAnnotations[]` — observed pain points

### BPMNProcessMap
- `pools[]` — BPMN pools by system
- `tasks[]` — typed as user/system/manual
- `gateways[]` — exclusive/parallel gateways with conditions
- `sequenceFlows[]` — edges with labels
- `systemInteractions[]` — send/receive/service markers
- `exceptionFlows[]` — error handling paths

### SIPOCProcessMap
- `suppliers[]`, `inputs[]`, `processStages[]`, `outputs[]`, `customers[]`
- `boundaries` — start/end
- `riskHighlights[]` — key risks
- `metrics` — stepCount, systemCount, duration, confidence

### OperatorSOP
- `whatThisIsFor`, `whenToUseIt` — context
- `beforeYouBegin[]` — prerequisites
- `steps[]` — action/detail/expectedResult/caution per step
- `commonMistakes[]`, `tips[]` — practical guidance
- `completionCheck[]` — verification

### EnterpriseSOP
- `rolesAndResponsibilities[]` — formal role table
- `procedure[]` — steps with actor/system/inputs/outputs/verification
- `decisionPoints[]` — formal decision table
- `controls[]`, `risks[]` — governance
- `revisionMetadata` — audit trail

### DecisionSOP
- `initialAssessment` — what to check first
- `branches[]` — condition → actions → outcome
- `escalationRules[]`, `exceptionHandling[]`
- `documentationRequirements[]`

## Shared Helpers

| Helper | Purpose |
|--------|---------|
| `conciseStepLabel()` | Clean, length-limited step titles |
| `buildLanes()` | Phase → lane conversion |
| `detectHandoffs()` | Cross-lane transition detection |
| `clusterIntoStages()` | Phase → SIPOC stage clustering |
| `inferSuppliers()` / `inferCustomers()` | SIPOC derivation |
| `primaryInstruction()` | Extract actionable instruction from SOP step |
| `deriveCommonMistakes()` / `deriveTips()` | Practical guidance from friction patterns |
| `mdHeading()`, `mdTable()`, etc. | Markdown primitives |

## Extension Points

1. **New templates**: Add type to union, implement renderer, add to dispatcher switch
2. **New export formats**: Implement alongside `markdownRenderer.ts` (e.g., `htmlRenderer.ts`, `pdfRenderer.ts`)
3. **UI integration**: Consume `RenderedProcessMap` / `RenderedSOP` types directly in React components
4. **Selection tuning**: Adjust thresholds in `templateSelector.ts`
5. **Custom helpers**: Add to `renderHelpers.ts` for reuse across templates
