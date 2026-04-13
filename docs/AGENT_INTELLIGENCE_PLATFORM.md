# Ledgerium AI -- Workflow-to-Agent Intelligence Platform

**Version:** 1.0.0
**Status:** Architecture Specification (Pre-Build)
**Date:** 2026-04-12
**Author:** System Architect Agent
**Depends on:** ARCHITECTURE.md, intelligence-engine, process-engine, schema-events

---

## A. Executive Build Strategy

### Vision

Transform recorded workflow data into AI-ready operational intelligence: semantic task models, reusable skills, tool mappings, agent designs, and implementation artifacts. Every output traces to observed evidence. Every inference is classified as deterministic or heuristic with confidence scoring.

### Goals

1. Convert low-level UI events into intent-level semantic task representations
2. Extract reusable skill primitives and tool mappings from workflow libraries
3. Classify every step and workflow by automation type with evidence
4. Compose proposed AI agents from skill + tool primitives
5. Produce implementation-ready artifacts per workflow (scorecards, integration maps, ROI, risk, roadmaps)
6. Build a cross-workflow skill library with deduplication and versioning

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Semantic task extraction accuracy | >= 80% verb/object correct (human review) | Sample 50 steps, compare to human label |
| Automation classification agreement | >= 75% match with expert review | Blind comparison on 20 workflows |
| Skill deduplication precision | >= 90% (no false merges) | Human audit of merged skills |
| Agent design completeness | All required fields populated | Schema validation pass rate |
| End-to-end latency (single workflow) | < 5 seconds | Timer from ProcessOutput to all artifacts |
| Confidence calibration | Predicted confidence within 10% of actual accuracy | Calibration curve analysis |

### What Exists vs. What Is New

| Layer | Status | Notes |
|-------|--------|-------|
| Capture -> CanonicalEvent | EXISTS | Chrome extension, immutable |
| Segmentation -> DerivedStep | EXISTS | Batch + streaming, deterministic |
| Process Engine -> ProcessOutput | EXISTS | ProcessRun, ProcessDefinition, ProcessMap, SOP |
| Intelligence Engine -> PortfolioIntelligence | EXISTS | Metrics, variants, bottlenecks, drift |
| Process Grouping (families, components, fingerprints) | EXISTS | Scoring engine, automation scorer |
| Semantic Task Model | NEW | StepDefinition + SOPInstruction -> SemanticTask |
| Skill Extraction | NEW | Cross-workflow skill library |
| Tool Mapping | NEW | UI actions -> API/system tool registry |
| AI Opportunity Detection | NEW | Per-step automation classification |
| Agent Composition | NEW | Skills + tools -> AgentDesign |
| Integration Detection | NEW | Cross-system data flow identification |
| Risk Assessment | NEW | Per-agent/automation risk evaluation |
| Artifact Generation | NEW | Implementation-ready output documents |

### Build Phases

| Phase | Name | Deliverable | Dependency |
|-------|------|-------------|------------|
| P1 | Semantic Foundation | SemanticTask extraction from ProcessOutput | Existing process-engine |
| P2 | Opportunity Scoring | AutomationOpportunity per step and workflow | P1 + existing automationScorer |
| P3 | Skill + Tool Extraction | Skill library, Tool registry | P1 |
| P4 | Agent Composition | AgentDesign from skills + tools + workflow structure | P2 + P3 |
| P5 | Integration + Risk | IntegrationOpportunity, RiskAssessment | P1 + P2 |
| P6 | Artifact Generation | All ImplementationArtifact types | P2 + P4 + P5 |
| P7 | Cross-Workflow Intelligence | Deduplicated skill library, cross-workflow patterns | P3 + P6 |

---

## B. Program Workstreams

### Workstream 1: Semantic Task Model (P1)

**Objective:** Convert StepDefinition + SOPInstruction[] into SemanticTask[] that capture business intent.

**Dependencies:** process-engine ProcessOutput (exists)
**Duration estimate:** 1 week
**Critical path:** Yes -- all downstream workstreams depend on this

### Workstream 2: AI Opportunity Detection (P2)

**Objective:** Classify every step and workflow by automation type with confidence and evidence.

**Dependencies:** WS1 (SemanticTask), existing automationScorer
**Duration estimate:** 1 week

### Workstream 3: Skill + Tool Extraction (P3)

**Objective:** Extract reusable Skill primitives and map to Tool definitions.

**Dependencies:** WS1 (SemanticTask)
**Duration estimate:** 1.5 weeks

### Workstream 4: Agent Composition (P4)

**Objective:** Compose AgentDesign proposals from skills, tools, and workflow structure.

**Dependencies:** WS2, WS3
**Duration estimate:** 1 week

### Workstream 5: Integration + Risk Detection (P5)

**Objective:** Identify cross-system integration points and assess risk.

**Dependencies:** WS1, WS2
**Duration estimate:** 1 week

### Workstream 6: Artifact Generation (P6)

**Objective:** Produce all ImplementationArtifact types from upstream outputs.

**Dependencies:** WS2, WS4, WS5
**Duration estimate:** 1 week

### Workstream 7: Cross-Workflow Intelligence (P7)

**Objective:** Deduplicate skills, build versioned skill library, detect cross-workflow patterns.

**Dependencies:** WS3, WS6
**Duration estimate:** 1.5 weeks

### Dependency Graph

```
WS1 (Semantic Task)
 |-- WS2 (Opportunity Scoring)
 |    |-- WS4 (Agent Composition) [also needs WS3]
 |    |-- WS5 (Integration + Risk)
 |         |-- WS6 (Artifact Generation) [also needs WS4]
 |-- WS3 (Skill + Tool Extraction)
 |    |-- WS4 (Agent Composition)
 |    |-- WS7 (Cross-Workflow Intelligence) [also needs WS6]
```

### Critical Path

WS1 -> WS2 -> WS4 -> WS6 (longest sequential chain: ~4 weeks)

WS3 and WS5 can run in parallel with WS2.

---

## C. Shared Data Contracts

All new types extend the existing system. They use existing IDs (workflowId, stepId, event_id) as foreign references. All include confidence scores and evidence traceability.

### C.1 SemanticTask

Intent-level representation of a workflow step. Bridges "Click Submit button on Invoice page" to "Submit invoice for approval in NetSuite".

| Field | Type | Description |
|-------|------|-------------|
| taskId | string (uuid) | Unique identifier |
| sourceStepId | string | References StepDefinition.stepId |
| sourceWorkflowId | string | References Workflow.id |
| intent | string | Human-readable intent statement (e.g. "Submit invoice for approval") |
| verb | string | Canonical verb from VERB_MAP (e.g. "submit") |
| object | string | Canonical object (e.g. "invoice") |
| qualifier | string or null | Additional context (e.g. "for approval", "csv format") |
| system | string or null | Canonical system name (e.g. "netsuite") |
| domain | string or null | Business domain (e.g. "accounts_payable") |
| inputArtifacts | string[] | Required inputs (e.g. ["invoice_data", "vendor_record"]) |
| outputArtifacts | string[] | Produced outputs (e.g. ["submitted_invoice", "confirmation_number"]) |
| preconditions | string[] | What must be true before this task (e.g. ["invoice_form_open"]) |
| postconditions | string[] | What is true after this task (e.g. ["invoice_pending_approval"]) |
| estimatedDurationMs | number or null | From source step duration |
| automationClassification | AutomationType | Classification result |
| confidence | number | 0-1 confidence in the semantic interpretation |
| evidenceEventIds | string[] | Source canonical event IDs from StepDefinition.sourceEventIds |
| inferenceMethod | "deterministic" or "heuristic" or "llm_inferred" | How this task was derived |
| modelVersion | string | Version of the semantic extraction model |
| createdAt | string (ISO 8601) | Timestamp |

**AutomationType enum:** `full_automation | human_in_loop | ai_assisted | manual_only`

### C.2 Skill

Reusable task primitive extracted from workflows. Skills are deduplicated across workflows.

| Field | Type | Description |
|-------|------|-------------|
| skillId | string (uuid) | Unique identifier |
| name | string | Human-readable name (e.g. "Extract data from email") |
| description | string | What this skill does |
| canonicalVerb | string | Primary verb (e.g. "extract") |
| canonicalObject | string | Primary object (e.g. "data") |
| system | string or null | Primary system where this skill operates |
| skillType | SkillType | Classification |
| inputSchema | Record<string, string> | Expected inputs (field name -> type description) |
| outputSchema | Record<string, string> | Produced outputs (field name -> type description) |
| preconditions | string[] | Required state before execution |
| postconditions | string[] | Guaranteed state after execution |
| estimatedDurationMs | number or null | Median duration across occurrences |
| automationScore | number | 0-100, from weighted scoring model |
| humanReviewRequired | boolean | Whether human must review output |
| occurrenceCount | number | How many times observed across all workflows |
| sourceWorkflowIds | string[] | Workflows where this skill was observed |
| sourceTaskIds | string[] | SemanticTask IDs this skill was extracted from |
| confidence | number | 0-1 confidence in skill definition accuracy |
| inferenceMethod | "deterministic" or "heuristic" | How the skill was identified |
| modelVersion | string | Extraction model version |
| version | number | Skill definition version (increments on updates) |
| createdAt | string (ISO 8601) | Timestamp |
| updatedAt | string (ISO 8601) | Timestamp |

**SkillType enum:** `data_extraction | data_entry | navigation | verification | communication | file_operation | decision | integration | monitoring`

### C.3 Tool

External system/API action mapped from observed UI interactions.

| Field | Type | Description |
|-------|------|-------------|
| toolId | string (uuid) | Unique identifier |
| name | string | Human-readable name (e.g. "Salesforce API: Create Record") |
| system | string | Target system (e.g. "salesforce") |
| apiEndpoint | string or null | Known API endpoint if mappable |
| method | string or null | HTTP method or action type |
| capability | string | What this tool does (e.g. "create_record") |
| inputSchema | Record<string, string> | Required inputs |
| outputSchema | Record<string, string> | Expected outputs |
| authRequirement | "oauth2" or "api_key" or "session" or "none" or "unknown" | Auth type |
| rateLimit | string or null | Known rate limit (e.g. "100/min") |
| reliability | number | 0-1 estimated reliability |
| costPerCall | number or null | Estimated cost per API call (USD) |
| sourceSkillIds | string[] | Skills that map to this tool |
| mappingConfidence | number | 0-1 confidence in the UI-to-API mapping |
| mappingMethod | "deterministic" or "heuristic" or "llm_inferred" | How mapping was derived |
| modelVersion | string | Mapping model version |
| createdAt | string (ISO 8601) | Timestamp |
| updatedAt | string (ISO 8601) | Timestamp |

### C.4 AgentDesign

Proposed autonomous agent composed of skills and tools.

| Field | Type | Description |
|-------|------|-------------|
| agentId | string (uuid) | Unique identifier |
| name | string | Agent name (e.g. "Invoice Processing Agent") |
| description | string | What this agent does end-to-end |
| objective | string | Business objective this agent fulfills |
| triggerCondition | string | What starts this agent (e.g. "New invoice email received") |
| skills | AgentSkillRef[] | Ordered list of skills with execution metadata |
| tools | AgentToolRef[] | Tools this agent needs access to |
| orchestrationLogic | "sequential" or "parallel" or "conditional" or "loop" | Primary execution pattern |
| decisionPoints | DecisionPoint[] | Points where logic branches |
| humanCheckpoints | HumanCheckpoint[] | Points requiring human review |
| inputArtifacts | string[] | Required inputs to start |
| outputArtifacts | string[] | Produced outputs on completion |
| estimatedRuntimeMs | number or null | Expected total runtime |
| autonomyLevel | "full" or "supervised" or "assisted" | Level of human oversight needed |
| riskLevel | "critical" or "high" or "medium" or "low" | Overall risk assessment |
| sourceWorkflowIds | string[] | Workflows this agent was derived from |
| confidence | number | 0-1 confidence in agent design viability |
| modelVersion | string | Composition model version |
| createdAt | string (ISO 8601) | Timestamp |
| updatedAt | string (ISO 8601) | Timestamp |

**AgentSkillRef:**

| Field | Type | Description |
|-------|------|-------------|
| skillId | string | References Skill.skillId |
| executionOrder | number | Position in agent workflow |
| isOptional | boolean | Whether this skill can be skipped |
| condition | string or null | Condition for execution (null = always) |
| retryPolicy | RetryPolicy or null | Retry behavior on failure |

**AgentToolRef:**

| Field | Type | Description |
|-------|------|-------------|
| toolId | string | References Tool.toolId |
| requiredForSkills | string[] | Which skills need this tool |
| accessLevel | "read" or "write" or "admin" | Required permission level |

**DecisionPoint:**

| Field | Type | Description |
|-------|------|-------------|
| afterSkillId | string | Skill after which decision occurs |
| condition | string | Human-readable condition |
| trueBranch | string | Skill ID for true path |
| falseBranch | string | Skill ID for false path |
| decisionType | "data_driven" or "human_judgment" or "rule_based" | Classification |

**HumanCheckpoint:**

| Field | Type | Description |
|-------|------|-------------|
| afterSkillId | string | Skill after which checkpoint occurs |
| reason | string | Why human review is needed |
| expectedDurationMs | number | Estimated review time |
| autoApproveCondition | string or null | Condition for auto-approval |

**RetryPolicy:**

| Field | Type | Description |
|-------|------|-------------|
| maxRetries | number | Maximum retry attempts |
| backoffMs | number | Delay between retries |
| failureAction | "skip" or "halt" or "escalate" | What to do on final failure |

### C.5 AutomationOpportunity

Per-step or per-workflow automation classification with evidence.

| Field | Type | Description |
|-------|------|-------------|
| opportunityId | string (uuid) | Unique identifier |
| scope | "step" or "workflow" or "cross_workflow" | Scope of this opportunity |
| targetId | string | StepDefinition.stepId, Workflow.id, or ProcessFamily.id |
| targetLabel | string | Human-readable label for the target |
| automationType | AutomationType | Classification result |
| currentDurationMs | number or null | Current human time spent |
| estimatedSavingsMs | number or null | Estimated time saved |
| savingsPct | number or null | Percentage savings (0-100) |
| annualizedSavingsHours | number or null | Projected annual savings assuming observed frequency |
| confidence | number | 0-1 classification confidence |
| confidenceBand | "verified" or "high_confidence" or "moderate_confidence" or "low_confidence" or "possible_match" | Band label |
| factorBreakdown | AutomationFactorBreakdown | Per-factor scoring detail |
| riskFactors | string[] | Identified risks (e.g. "high exception rate", "data sensitivity") |
| prerequisites | string[] | What must be in place before automating |
| evidenceRunIds | string[] | Workflow run IDs providing evidence |
| inferenceMethod | "deterministic" or "heuristic" | How classification was derived |
| scoringConfigVersion | string | Version of scoring weights used |
| createdAt | string (ISO 8601) | Timestamp |

**AutomationFactorBreakdown:**

| Field | Type | Description |
|-------|------|-------------|
| repeatFrequency | number | 0-100 contribution |
| manualClickDensity | number | 0-100 contribution |
| determinism | number | 0-100 contribution |
| reuseAcrossFamilies | number | 0-100 contribution |
| timeCost | number | 0-100 contribution |
| delayConcentration | number | 0-100 contribution |
| pathStability | number | 0-100 contribution |
| exceptionRatePenalty | number | 0-100 penalty |
| ambiguityPenalty | number | 0-100 penalty |
| compositeScore | number | 0-100 final score |

### C.6 IntegrationOpportunity

System integration point identified from workflow observation.

| Field | Type | Description |
|-------|------|-------------|
| integrationId | string (uuid) | Unique identifier |
| sourceSystem | string | System data comes from |
| targetSystem | string | System data goes to |
| dataFlow | string | Description of what data moves (e.g. "customer_record") |
| triggerEvent | string | What triggers this data movement |
| frequency | "per_workflow_run" or "periodic" or "on_demand" | How often this integration fires |
| currentMethod | "manual_copy" or "export_import" or "no_integration" or "existing_api" | How it works today |
| proposedMethod | "api" or "webhook" or "rpa" or "manual" | Recommended integration method |
| implementationComplexity | "low" or "medium" or "high" | Estimated implementation effort |
| impactedWorkflowIds | string[] | Workflows that use this integration |
| evidenceStepIds | string[] | Steps where this integration was observed |
| confidence | number | 0-1 confidence in detection accuracy |
| inferenceMethod | "deterministic" or "heuristic" | How detected |
| createdAt | string (ISO 8601) | Timestamp |

### C.7 RiskAssessment

Per-agent or per-automation risk evaluation.

| Field | Type | Description |
|-------|------|-------------|
| riskId | string (uuid) | Unique identifier |
| targetType | "agent" or "automation" or "integration" | What is being assessed |
| targetId | string | ID of the assessed entity |
| riskCategory | RiskCategory | Classification |
| severity | "critical" or "high" or "medium" or "low" | Impact severity |
| likelihood | number | 0-1 probability of occurrence |
| impactScore | number | 0-100 composite impact score |
| description | string | Human-readable risk description |
| mitigation | string | Recommended mitigation strategy |
| residualRisk | "high" or "medium" or "low" | Risk level after mitigation |
| evidenceRunIds | string[] | Supporting workflow run IDs |
| inferenceMethod | "deterministic" or "heuristic" | How assessed |
| assessmentVersion | string | Risk model version |
| createdAt | string (ISO 8601) | Timestamp |

**RiskCategory enum:** `data_sensitivity | compliance | reliability | complexity | dependency | error_rate | performance`

### C.8 ImplementationArtifact

Generated output document.

| Field | Type | Description |
|-------|------|-------------|
| artifactId | string (uuid) | Unique identifier |
| artifactType | ArtifactType | Type of artifact |
| workflowId | string or null | Source workflow (null for cross-workflow artifacts) |
| agentId | string or null | Source agent design (null for non-agent artifacts) |
| title | string | Human-readable title |
| content | object | Structured JSON content (shape varies by artifactType) |
| summary | string | One-paragraph summary |
| generatedAt | string (ISO 8601) | Generation timestamp |
| generatorVersion | string | Version of the generator that produced this |
| sourceDataVersion | string | Hash of input data used for generation |
| createdAt | string (ISO 8601) | Timestamp |

**ArtifactType enum:** `agent_spec | automation_scorecard | integration_map | roi_report | risk_report | implementation_plan | skill_library_export`

---

## D. Sub-Agent Delegation Plan

### D.1 Semantic Interpretation Agent

**Objective:** Convert each StepDefinition + its SOPInstruction[] into a SemanticTask that captures business intent.

**Scope:** Owns the SemanticTask extraction pipeline. Does not own skill deduplication or automation scoring.

**Inputs:**
- ProcessOutput (ProcessDefinition.stepDefinitions[], SOP.steps[].instructions[])
- StepFingerprint[] (from existing stepFingerprinter -- verb, object, system, qualifier)
- CanonicalEventInput[] (for event-level evidence)

**Outputs:**
- SemanticTask[] (one per StepDefinition)

**Dependencies:** process-engine, intelligence-engine stepFingerprinter

**Quality bar:**
- Every SemanticTask has non-null verb and object (or confidence < 0.5 if unparseable)
- Every SemanticTask.evidenceEventIds is a subset of its source step's sourceEventIds
- Intent string is human-readable and does not contain raw selectors or DOM elements
- No PII or sensitive field values in any SemanticTask field
- inferenceMethod is correctly set: "deterministic" for rule-parsed, "heuristic" for pattern-matched

**Failure modes to avoid:**
- Generating intent strings that are just the raw step title with minor rewording
- Setting confidence to 1.0 when verb or object was inferred from fallback rules
- Including DOM selectors or CSS classes in intent, inputArtifacts, or outputArtifacts

### D.2 Skill Extraction Agent

**Objective:** Extract reusable Skill primitives from SemanticTask[] across multiple workflows.

**Scope:** Owns skill identification, initial deduplication within a single extraction run, skill type classification. Does not own cross-workflow library management (WS7).

**Inputs:**
- SemanticTask[] (from D.1, across multiple workflows)
- CanonicalComponent[] (from existing componentDetector -- for alignment)

**Outputs:**
- Skill[] with sourceTaskIds and sourceWorkflowIds populated

**Dependencies:** D.1 (SemanticTask), existing componentDetector

**Quality bar:**
- No two Skills in a single extraction run share identical (canonicalVerb, canonicalObject, system) unless they have materially different inputSchema/outputSchema
- Every Skill has occurrenceCount >= 1
- Skill.automationScore uses the existing weighted scoring model
- skillType is assigned based on deterministic rules from verb and category mapping

**Failure modes to avoid:**
- Creating one Skill per SemanticTask (no deduplication)
- Merging semantically different skills because they share a verb (e.g., "submit invoice" and "submit support ticket")
- Losing traceability: every Skill must trace back to specific SemanticTask IDs

### D.3 Tool Mapping Agent

**Objective:** Map Skills to external system Tool definitions using system and action detection.

**Scope:** Owns the Tool registry and UI-to-API mapping logic.

**Inputs:**
- Skill[] (from D.2)
- SYSTEM_MAP (from existing stepFingerprinter -- known system canonical names)

**Outputs:**
- Tool[] with sourceSkillIds populated

**Dependencies:** D.2 (Skill)

**Quality bar:**
- Every Tool has a non-empty system field matching a canonical system name
- mappingMethod is "deterministic" for known system/action combinations, "heuristic" for pattern-inferred
- Tools for the same system + capability are deduplicated
- No fabricated API endpoints -- apiEndpoint is null unless deterministically known from a curated registry

**Failure modes to avoid:**
- Inventing API endpoints that do not exist
- Creating tools with mappingConfidence > 0.8 when the mapping is actually heuristic
- Mapping UI-only actions (scroll, expand panel) as API tools

### D.4 Opportunity Scoring Agent

**Objective:** Classify AutomationOpportunity for every step and every workflow.

**Scope:** Owns the enhanced classification model that extends the existing automationScorer with per-step automation type assignment.

**Inputs:**
- SemanticTask[] (from D.1)
- Existing AutomationFactors + AutomationScoreResult (from automationScorer)
- ProcessOutput (step categories, durations, event counts)

**Outputs:**
- AutomationOpportunity[] (one per step, one per workflow aggregate)

**Dependencies:** D.1 (SemanticTask), existing automationScorer

**Quality bar:**
- Every step has exactly one AutomationOpportunity
- Every workflow has exactly one aggregate AutomationOpportunity
- automationType classification uses the following deterministic rules:

**Automation Type Classification Rules:**

| Condition | Classification |
|-----------|---------------|
| automationScore >= 70 AND determinism >= 0.8 AND exceptionRate < 0.1 | full_automation |
| automationScore >= 45 AND determinism >= 0.5 | human_in_loop |
| automationScore >= 20 AND determinism >= 0.3 | ai_assisted |
| automationScore < 20 OR exceptionRate > 0.5 OR ambiguityLevel > 0.7 | manual_only |

**Scoring Weights (extends existing automationWeights):**

```
opportunityScoringWeights: {
  // Inherited from automationWeights (same values)
  repeatFrequency: 0.18,
  manualClickDensity: 0.14,
  determinism: 0.16,
  reuseAcrossFamilies: 0.10,
  timeCost: 0.14,
  delayConcentration: 0.08,
  pathStability: 0.10,
  exceptionRatePenalty: 0.05,
  ambiguityPenalty: 0.05
}
```

These weights are identical to the existing `automationWeights` in `scoringConfig.ts`. The new layer reuses the existing scorer and adds the type classification on top.

**Failure modes to avoid:**
- Classifying error_handling steps as full_automation
- Reporting annualizedSavingsHours without specifying the frequency assumption
- Ignoring existing automationScorer results (must compose with, not replace)

### D.5 Agent Builder Agent

**Objective:** Compose AgentDesign proposals from Skills, Tools, and workflow structure.

**Scope:** Owns the agent composition logic, orchestration pattern detection, decision point extraction, and human checkpoint placement.

**Inputs:**
- Skill[] (from D.2)
- Tool[] (from D.3)
- AutomationOpportunity[] (from D.4)
- ProcessMap (nodes, edges, phases -- for workflow structure)
- SOP (steps, decision points -- for flow logic)

**Outputs:**
- AgentDesign[] (one per analyzable workflow, potentially cross-workflow agents)

**Dependencies:** D.2, D.3, D.4

**Quality bar:**
- Every AgentDesign references only Skills and Tools that exist in the extraction output
- orchestrationLogic is determined from ProcessMap edge structure:
  - All edges sequential with no branches -> "sequential"
  - Multiple edges from same node -> "conditional"
  - Repeated edge to same node -> "loop"
  - Independent skill sets -> "parallel"
- humanCheckpoints are placed at every step classified as human_in_loop or manual_only
- autonomyLevel is derived from the proportion of full_automation steps:
  - >= 80% full_automation -> "full"
  - >= 50% full_automation -> "supervised"
  - < 50% full_automation -> "assisted"
- riskLevel is the maximum severity from associated RiskAssessments

**Failure modes to avoid:**
- Proposing fully autonomous agents for workflows with manual_only steps
- Missing decision points that are present in the ProcessMap
- Creating agents with no human checkpoints for workflows touching sensitive data

### D.6 Integration Detection Agent

**Objective:** Identify cross-system data flow integration points from workflow observations.

**Scope:** Owns IntegrationOpportunity detection. Uses system transitions in ProcessMap and page_context changes.

**Inputs:**
- SemanticTask[] (from D.1)
- ProcessMap (nodes with system metadata, edges)
- StepDefinition[] (systems[], domains[])

**Outputs:**
- IntegrationOpportunity[] (one per detected cross-system data flow)

**Dependencies:** D.1 (SemanticTask)

**Quality bar:**
- An IntegrationOpportunity is only created when a step's output is consumed as a subsequent step's input AND the two steps operate in different systems
- currentMethod is inferred deterministically:
  - If sequential steps in different systems with no API event types -> "manual_copy"
  - If file_action step between systems -> "export_import"
  - If same-system steps -> no IntegrationOpportunity created
- implementationComplexity is rule-based:
  - Both systems in SYSTEM_MAP with known APIs -> "low"
  - One system known, one unknown -> "medium"
  - Both systems unknown or custom -> "high"

**Failure modes to avoid:**
- Detecting integration between steps in the same system (tab switches are not integrations)
- Creating IntegrationOpportunity for every system transition (only data-carrying transitions)
- Reporting "api" as proposedMethod for systems with no known public API

### D.7 Risk Assessment Agent

**Objective:** Evaluate risk for each proposed automation, agent, and integration.

**Scope:** Owns RiskAssessment production. Does not own risk mitigation implementation.

**Inputs:**
- AgentDesign[] (from D.5)
- AutomationOpportunity[] (from D.4)
- IntegrationOpportunity[] (from D.6)
- ProcessOutput (hasSensitiveEvents, error step counts)
- Policy engine sensitivity classes (from existing policy-engine)

**Outputs:**
- RiskAssessment[] (one or more per agent, automation, and integration)

**Dependencies:** D.4, D.5, D.6

**Quality bar:**
- Every AgentDesign has at least one RiskAssessment
- Every AutomationOpportunity with automationType "full_automation" has at least one RiskAssessment
- Risk scoring uses the following deterministic rules:

**Risk Scoring Rules:**

| Risk Category | Detection Rule | Severity Assignment |
|--------------|----------------|---------------------|
| data_sensitivity | Any step with hasSensitiveEvents=true or sensitivity_class in [password, payment, pii, health, government_id] | critical if password/payment/government_id; high if pii/health; medium otherwise |
| compliance | System in regulated_systems list OR domain contains compliance keywords | high if regulated system; medium otherwise |
| reliability | exceptionRate > 0.3 OR pathStability < 0.5 | high if exceptionRate > 0.5; medium if > 0.3 |
| complexity | stepCount > 20 OR systemCount > 3 OR decisionPointCount > 3 | high if all three; medium if two; low if one |
| dependency | toolCount > 5 OR external system dependency on unavailable APIs | high if API unavailable; medium if > 5 tools |
| error_rate | Error step frequency from ProcessRun.errorStepCount / stepCount | Proportional to error rate |

**Failure modes to avoid:**
- Assigning "low" risk to workflows touching sensitive data
- Not creating risk assessments for cross-system integrations
- Using vague mitigation strings like "be careful" -- mitigations must be actionable

### D.8 Artifact Generator Agent

**Objective:** Produce all ImplementationArtifact types from upstream analysis outputs.

**Scope:** Owns rendering of structured artifacts. Does not own the analysis logic.

**Inputs:**
- All upstream outputs: SemanticTask[], Skill[], Tool[], AgentDesign[], AutomationOpportunity[], IntegrationOpportunity[], RiskAssessment[]

**Outputs:**
- ImplementationArtifact[] with the following types:

| Artifact Type | Content Structure |
|--------------|-------------------|
| agent_spec | AgentDesign + skill details + tool details + orchestration diagram data |
| automation_scorecard | Per-step AutomationOpportunity[] + aggregate scores + factor breakdowns |
| integration_map | IntegrationOpportunity[] + system graph + data flow summary |
| roi_report | Time savings, error reduction, cost estimates, payback period |
| risk_report | RiskAssessment[] + severity distribution + top mitigations |
| implementation_plan | Ordered phases, dependencies, effort estimates, definition of done per phase |

**Dependencies:** D.4, D.5, D.6, D.7

**Quality bar:**
- Every artifact passes JSON schema validation for its type
- No raw user data, sensitive field values, or PII in any artifact
- Every artifact includes a summary field (one paragraph)
- sourceDataVersion is a deterministic hash of the input data

**Failure modes to avoid:**
- Generating empty or near-empty artifacts
- Including raw event data or DOM content in artifacts
- Producing ROI estimates without documenting the assumptions

### D.9 Cross-Workflow Intelligence Agent

**Objective:** Deduplicate skills across workflows, build a versioned skill library, and detect cross-workflow patterns.

**Scope:** Owns the global skill library, cross-workflow skill matching, and skill versioning.

**Inputs:**
- Skill[] from multiple workflow analyses (from D.2)
- Existing CanonicalComponent[] (from componentDetector)
- ProcessFamily[] (from existing grouping)

**Outputs:**
- Deduplicated Skill[] (global library with version numbers)
- Cross-workflow pattern report (which skills appear most, which are unique)

**Dependencies:** D.2 (Skill), D.8 (for complete context)

**Quality bar:**
- Two Skills are merged only if: same canonicalVerb, same canonicalObject, same system (or both null), and inputSchema/outputSchema overlap > 80%
- Merged skills increment the version number
- occurrenceCount and sourceWorkflowIds are correctly aggregated
- Skills from existing CanonicalComponents are aligned (a CanonicalComponent maps to one Skill)

**Skill Deduplication Scoring:**

```
skillDeduplicationWeights: {
  verbMatch: 0.25,
  objectMatch: 0.25,
  systemMatch: 0.20,
  inputSchemaOverlap: 0.15,
  outputSchemaOverlap: 0.15
}
threshold: 0.85  // merge if score >= 0.85
```

**Failure modes to avoid:**
- Merging skills that happen to share a verb but have different business meanings
- Creating a skill library where most skills have occurrenceCount=1 (indicates poor dedup)
- Losing provenance: merged skills must retain all sourceWorkflowIds

---

## E. Section-by-Section Build Plan

### E.1 Semantic Task Model (WS1)

**Implementation phases:**

1. Define SemanticTask Zod schema in a new `packages/agent-intelligence-engine/src/types.ts`
2. Implement `interpretStep()`: StepDefinition + SOPInstruction[] + StepFingerprint -> SemanticTask
3. Implement `interpretWorkflow()`: ProcessOutput -> SemanticTask[]
4. Add intent generation rules (verb + object + qualifier + system -> intent string)
5. Add input/output artifact inference from SOPInstruction event types and step I/O
6. Add precondition/postcondition inference from step sequence position

**Input contracts:**
- ProcessOutput (from process-engine processSession)
- StepFingerprint[] (from intelligence-engine fingerprintWorkflowSteps)

**Output contracts:**
- SemanticTask[] (one per StepDefinition, validated by Zod schema)

**Integration points:**
- Consumes ProcessOutput.processDefinition.stepDefinitions
- Consumes ProcessOutput.sop.steps[].instructions
- Reuses stepFingerprinter verb/object/system parsing (import, do not duplicate)

**Database migration:**
```prisma
model SemanticTask {
  id                      String   @id @default(uuid())
  sourceStepId            String   @map("source_step_id")
  sourceWorkflowId        String   @map("source_workflow_id")
  intent                  String
  verb                    String
  object                  String
  qualifier               String?
  system                  String?
  domain                  String?
  inputArtifactsJson      String?  @map("input_artifacts_json")
  outputArtifactsJson     String?  @map("output_artifacts_json")
  preconditionsJson       String?  @map("preconditions_json")
  postconditionsJson      String?  @map("postconditions_json")
  estimatedDurationMs     Int?     @map("estimated_duration_ms")
  automationClassification String  @map("automation_classification")
  confidence              Float
  evidenceEventIdsJson    String   @map("evidence_event_ids_json")
  inferenceMethod         String   @map("inference_method")
  modelVersion            String   @map("model_version")
  createdAt               DateTime @default(now()) @map("created_at")

  workflow Workflow @relation(fields: [sourceWorkflowId], references: [id], onDelete: Cascade)

  @@index([sourceWorkflowId])
  @@index([sourceStepId])
  @@index([verb, object])
  @@map("semantic_tasks")
}
```

**API endpoints:**
- `GET /api/workflows/[id]/semantic-tasks` -- retrieve semantic tasks for a workflow
- `PATCH /api/semantic-tasks/[id]` -- human correction of a semantic task

**Test strategy:**
- Unit tests: 10+ step title -> SemanticTask conversions with known expected output
- Property tests: every SemanticTask.evidenceEventIds is subset of source step's sourceEventIds
- Golden file: fixed ProcessOutput fixture -> deterministic SemanticTask[] output

### E.2 Opportunity Scoring (WS2)

**Implementation phases:**

1. Extend existing automationScorer with per-step automation type classification
2. Implement `classifyStepOpportunity()`: SemanticTask + AutomationFactors -> AutomationOpportunity
3. Implement `classifyWorkflowOpportunity()`: SemanticTask[] + ProcessMetrics -> AutomationOpportunity
4. Add annualized savings calculation based on observed workflow frequency

**Input contracts:**
- SemanticTask[] (from E.1)
- AutomationFactors (from existing deriveAutomationFactors)
- ProcessMetrics (from existing intelligence engine)

**Output contracts:**
- AutomationOpportunity[] (validated by Zod schema)

**Integration points:**
- Imports and calls existing `scoreAutomationOpportunity()` from automationScorer
- Imports existing `deriveAutomationFactors()` for factor computation
- Adds type classification layer on top of existing 0-100 score

**Database migration:**
```prisma
model AutomationOpportunity {
  id                     String   @id @default(uuid())
  scope                  String   // step, workflow, cross_workflow
  targetId               String   @map("target_id")
  targetLabel            String   @map("target_label")
  automationType         String   @map("automation_type")
  currentDurationMs      Int?     @map("current_duration_ms")
  estimatedSavingsMs     Int?     @map("estimated_savings_ms")
  savingsPct             Float?   @map("savings_pct")
  annualizedSavingsHours Float?   @map("annualized_savings_hours")
  confidence             Float
  confidenceBand         String   @map("confidence_band")
  factorBreakdownJson    String   @map("factor_breakdown_json")
  riskFactorsJson        String?  @map("risk_factors_json")
  prerequisitesJson      String?  @map("prerequisites_json")
  evidenceRunIdsJson     String?  @map("evidence_run_ids_json")
  inferenceMethod        String   @map("inference_method")
  scoringConfigVersion   String   @map("scoring_config_version")
  createdAt              DateTime @default(now()) @map("created_at")

  @@index([targetId])
  @@index([automationType])
  @@index([scope])
  @@map("automation_opportunities")
}
```

**API endpoints:**
- `GET /api/workflows/[id]/automation-opportunities` -- per-workflow opportunities
- `GET /api/automation-opportunities/summary` -- aggregate across all workflows

**Test strategy:**
- Unit tests: verify classification rules produce correct automationType for boundary conditions
- Integration tests: existing automationScorer output + type classification = consistent results
- Verify: error_handling steps never classified as full_automation

### E.3 Skill + Tool Extraction (WS3)

**Implementation phases:**

1. Implement `extractSkills()`: SemanticTask[] -> Skill[] with initial deduplication
2. Implement skill type classification rules (verb + category -> skillType)
3. Implement `mapTools()`: Skill[] -> Tool[] using system detection
4. Build curated tool registry for top 20 systems (Gmail API, Salesforce API, etc.)
5. Implement deduplication scoring for skills within a single extraction run

**Skill Type Classification Rules (deterministic):**

| Verb Category | SkillType |
|--------------|-----------|
| extract, read, search, filter, lookup | data_extraction |
| enter, fill, create, update, edit | data_entry |
| navigate, open, browse | navigation |
| verify, check, confirm, review, approve | verification |
| send, email, message, notify, forward, reply | communication |
| upload, download, attach, export, import, save | file_operation |
| select, choose, decide | decision |
| submit, configure, enable, toggle | integration |
| wait, monitor | monitoring |

**Tool Registry Structure (curated, deterministic):**

| System | Known API Capabilities |
|--------|----------------------|
| gmail | send_email, read_email, search_email, create_draft, add_label |
| google_sheets | read_sheet, write_cell, append_row, create_sheet |
| salesforce | create_record, update_record, query, search |
| slack | send_message, read_channel, create_channel |
| jira | create_issue, update_issue, search, transition |
| hubspot | create_contact, update_deal, search, create_task |

For systems not in the curated registry: toolId is created with mappingMethod="heuristic" and apiEndpoint=null.

**Input contracts:**
- SemanticTask[] (from E.1)
- CanonicalComponent[] (from existing componentDetector, for alignment)

**Output contracts:**
- Skill[] (validated by Zod schema)
- Tool[] (validated by Zod schema)

**Database migrations:**
```prisma
model Skill {
  id                    String   @id @default(uuid())
  name                  String
  description           String
  canonicalVerb         String   @map("canonical_verb")
  canonicalObject       String   @map("canonical_object")
  system                String?
  skillType             String   @map("skill_type")
  inputSchemaJson       String?  @map("input_schema_json")
  outputSchemaJson      String?  @map("output_schema_json")
  preconditionsJson     String?  @map("preconditions_json")
  postconditionsJson    String?  @map("postconditions_json")
  estimatedDurationMs   Int?     @map("estimated_duration_ms")
  automationScore       Float    @map("automation_score")
  humanReviewRequired   Boolean  @default(false) @map("human_review_required")
  occurrenceCount       Int      @default(1) @map("occurrence_count")
  sourceWorkflowIdsJson String   @map("source_workflow_ids_json")
  sourceTaskIdsJson     String   @map("source_task_ids_json")
  confidence            Float
  inferenceMethod       String   @map("inference_method")
  modelVersion          String   @map("model_version")
  version               Int      @default(1)
  userId                String   @map("user_id")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, canonicalVerb, canonicalObject, system])
  @@index([userId])
  @@index([skillType])
  @@map("skills")
}

model Tool {
  id                    String   @id @default(uuid())
  name                  String
  system                String
  apiEndpoint           String?  @map("api_endpoint")
  method                String?
  capability            String
  inputSchemaJson       String?  @map("input_schema_json")
  outputSchemaJson      String?  @map("output_schema_json")
  authRequirement       String   @map("auth_requirement")
  rateLimit             String?  @map("rate_limit")
  reliability           Float    @default(0.8)
  costPerCall           Float?   @map("cost_per_call")
  sourceSkillIdsJson    String   @map("source_skill_ids_json")
  mappingConfidence     Float    @map("mapping_confidence")
  mappingMethod         String   @map("mapping_method")
  modelVersion          String   @map("model_version")
  userId                String   @map("user_id")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, system, capability])
  @@index([userId])
  @@index([system])
  @@map("tools")
}
```

**API endpoints:**
- `GET /api/skills` -- list skills in user's library
- `GET /api/skills/[id]` -- skill detail
- `PATCH /api/skills/[id]` -- human correction
- `GET /api/tools` -- list tools
- `GET /api/tools/[id]` -- tool detail

**Test strategy:**
- Unit tests: known SemanticTask[] -> expected Skill[] extraction
- Deduplication tests: two semantically identical tasks produce one Skill with occurrenceCount=2
- Tool mapping tests: known systems map to curated tools; unknown systems produce heuristic mappings
- No-fabrication test: no Tool has non-null apiEndpoint unless system is in curated registry

### E.4 Agent Composition (WS4)

**Implementation phases:**

1. Implement orchestration pattern detection from ProcessMap topology
2. Implement decision point extraction from ProcessMap branching edges + SOP.steps decision flags
3. Implement human checkpoint placement based on automation classification
4. Implement `composeAgent()`: Skill[] + Tool[] + workflow structure -> AgentDesign
5. Implement autonomy level derivation

**Input contracts:**
- Skill[] (from E.3)
- Tool[] (from E.3)
- AutomationOpportunity[] (from E.2)
- ProcessMap (from ProcessOutput)
- SOP (from ProcessOutput)

**Output contracts:**
- AgentDesign[] (validated by Zod schema)

**Database migration:**
```prisma
model AgentDesign {
  id                    String   @id @default(uuid())
  name                  String
  description           String
  objective             String
  triggerCondition      String   @map("trigger_condition")
  skillRefsJson         String   @map("skill_refs_json")
  toolRefsJson          String   @map("tool_refs_json")
  orchestrationLogic    String   @map("orchestration_logic")
  decisionPointsJson    String?  @map("decision_points_json")
  humanCheckpointsJson  String?  @map("human_checkpoints_json")
  inputArtifactsJson    String?  @map("input_artifacts_json")
  outputArtifactsJson   String?  @map("output_artifacts_json")
  estimatedRuntimeMs    Int?     @map("estimated_runtime_ms")
  autonomyLevel         String   @map("autonomy_level")
  riskLevel             String   @map("risk_level")
  sourceWorkflowIdsJson String   @map("source_workflow_ids_json")
  confidence            Float
  modelVersion          String   @map("model_version")
  userId                String   @map("user_id")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([autonomyLevel])
  @@map("agent_designs")
}
```

**API endpoints:**
- `GET /api/workflows/[id]/agent-design` -- get agent design for a workflow
- `GET /api/agent-designs` -- list all agent designs
- `GET /api/agent-designs/[id]` -- agent design detail
- `PATCH /api/agent-designs/[id]` -- human correction

**Test strategy:**
- Unit tests: known ProcessMap topology -> correct orchestrationLogic
- Decision point tests: branching maps produce decision points
- Autonomy tests: verify level derivation from step classification distribution
- Constraint test: no agent has autonomyLevel="full" if any step is manual_only

### E.5 Integration + Risk Detection (WS5)

**Implementation phases:**

1. Implement cross-system transition detection from ProcessMap nodes
2. Implement data flow inference from sequential steps across systems
3. Implement current integration method inference
4. Implement risk assessment scoring rules
5. Implement risk-per-entity aggregation

**Input contracts:**
- SemanticTask[] (from E.1)
- ProcessMap, ProcessOutput (from existing)
- AgentDesign[] (from E.4, for agent risk)
- AutomationOpportunity[] (from E.2, for automation risk)
- Policy engine sensitivity metadata

**Output contracts:**
- IntegrationOpportunity[] (validated by Zod schema)
- RiskAssessment[] (validated by Zod schema)

**Database migrations:**
```prisma
model IntegrationOpportunity {
  id                        String   @id @default(uuid())
  sourceSystem              String   @map("source_system")
  targetSystem              String   @map("target_system")
  dataFlow                  String   @map("data_flow")
  triggerEvent              String   @map("trigger_event")
  frequency                 String
  currentMethod             String   @map("current_method")
  proposedMethod            String   @map("proposed_method")
  implementationComplexity  String   @map("implementation_complexity")
  impactedWorkflowIdsJson   String   @map("impacted_workflow_ids_json")
  evidenceStepIdsJson       String   @map("evidence_step_ids_json")
  confidence                Float
  inferenceMethod           String   @map("inference_method")
  userId                    String   @map("user_id")
  createdAt                 DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([sourceSystem, targetSystem])
  @@map("integration_opportunities")
}

model RiskAssessment {
  id                    String   @id @default(uuid())
  targetType            String   @map("target_type")
  targetId              String   @map("target_id")
  riskCategory          String   @map("risk_category")
  severity              String
  likelihood            Float
  impactScore           Float    @map("impact_score")
  description           String
  mitigation            String
  residualRisk          String   @map("residual_risk")
  evidenceRunIdsJson    String?  @map("evidence_run_ids_json")
  inferenceMethod       String   @map("inference_method")
  assessmentVersion     String   @map("assessment_version")
  userId                String   @map("user_id")
  createdAt             DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([targetId])
  @@index([riskCategory])
  @@index([severity])
  @@map("risk_assessments")
}
```

**API endpoints:**
- `GET /api/workflows/[id]/integrations` -- integration opportunities for a workflow
- `GET /api/workflows/[id]/risks` -- risk assessments for a workflow
- `GET /api/risk-assessments/summary` -- aggregate risk summary

**Test strategy:**
- Integration detection: two sequential steps in different systems -> one IntegrationOpportunity
- No false integrations: steps in same system -> no IntegrationOpportunity
- Risk scoring: workflow with hasSensitiveEvents=true -> data_sensitivity risk with severity >= high
- Completeness: every AgentDesign has at least one RiskAssessment

### E.6 Artifact Generation (WS6)

**Implementation phases:**

1. Define JSON content schemas for each artifact type
2. Implement `generateAutomationScorecard()` from AutomationOpportunity[]
3. Implement `generateAgentSpec()` from AgentDesign + Skill[] + Tool[]
4. Implement `generateIntegrationMap()` from IntegrationOpportunity[]
5. Implement `generateROIReport()` from AutomationOpportunity[] + frequency data
6. Implement `generateRiskReport()` from RiskAssessment[]
7. Implement `generateImplementationPlan()` from all upstream outputs

**Input contracts:** All upstream types from E.1-E.5

**Output contracts:** ImplementationArtifact[] stored as WorkflowArtifact records

**Database migration:**
No new table needed. ImplementationArtifact records are stored in the existing `WorkflowArtifact` table with new `artifact_type` values: `agent_spec`, `automation_scorecard`, `integration_map`, `roi_report`, `risk_report`, `implementation_plan`.

**API endpoints:**
- `GET /api/workflows/[id]/artifacts/[type]` -- retrieve specific artifact type
- `POST /api/workflows/[id]/generate-intelligence` -- trigger full intelligence pipeline

**Test strategy:**
- Schema validation: every generated artifact passes its type's JSON schema
- No PII test: regex scan of artifact content for email, phone, SSN patterns -> zero matches
- Completeness: generating for a valid workflow produces all 6 artifact types

### E.7 Cross-Workflow Intelligence (WS7)

**Implementation phases:**

1. Implement skill deduplication scoring using skillDeduplicationWeights
2. Implement skill merge logic with version incrementing
3. Implement cross-workflow pattern detection (most common skills, unique skills)
4. Implement skill library export artifact
5. Integrate with existing CanonicalComponent alignment

**Input contracts:**
- Skill[] from multiple workflow analyses
- CanonicalComponent[] (existing)
- ProcessFamily[] (existing)

**Output contracts:**
- Updated Skill[] (deduplicated, version incremented)
- ImplementationArtifact of type skill_library_export

**Database migration:** No new tables. Skills table already supports deduplication via unique constraint on (userId, canonicalVerb, canonicalObject, system).

**API endpoints:**
- `GET /api/skills/library` -- full deduplicated skill library
- `GET /api/skills/library/export` -- export as structured JSON
- `POST /api/skills/library/refresh` -- re-run deduplication across all workflows

**Test strategy:**
- Dedup precision: manually verified set of 20 skills -> zero false merges
- Merge correctness: merged skill has sum of occurrenceCounts and union of sourceWorkflowIds
- CanonicalComponent alignment: every CanonicalComponent maps to exactly one Skill

---

## F. Integration Plan

### Where in the Data Flow New Processing Occurs

```
[EXISTING] Upload -> Validate -> Process Engine -> ProcessOutput stored as WorkflowArtifact
                                                        |
                                                        v
[NEW] SemanticTaskExtractor -> SemanticTask[] stored in semantic_tasks table
        |
        +-> OpportunityScorerAgent -> AutomationOpportunity[] stored in automation_opportunities
        |
        +-> SkillExtractor -> Skill[] stored in skills table
        |     |
        |     +-> ToolMapper -> Tool[] stored in tools table
        |
        +-> IntegrationDetector -> IntegrationOpportunity[] stored in integration_opportunities
        |
        +-- [waits for Skill + Tool + Opportunity] -->
        |
        +-> AgentBuilder -> AgentDesign[] stored in agent_designs table
        |
        +-> RiskAssessor -> RiskAssessment[] stored in risk_assessments table
        |
        +-> ArtifactGenerator -> ImplementationArtifact[] stored in workflow_artifacts table
```

### Trigger Mechanism

The new intelligence pipeline is triggered by:

1. **Automatic:** After successful `POST /api/workflows/[id]/analyze` (appends to existing analysis)
2. **Manual:** Via new `POST /api/workflows/[id]/generate-intelligence` endpoint
3. **Batch:** Via new `POST /api/intelligence/refresh` for re-processing all workflows

The pipeline is synchronous in the current architecture (no job queue). For workflows with > 50 steps, the endpoint returns a 202 with a job_id placeholder for future async processing.

### API Surface Additions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workflows/[id]/generate-intelligence` | POST | Trigger full intelligence pipeline |
| `/api/workflows/[id]/semantic-tasks` | GET | List semantic tasks |
| `/api/workflows/[id]/automation-opportunities` | GET | List automation opportunities |
| `/api/workflows/[id]/agent-design` | GET | Get agent design |
| `/api/workflows/[id]/integrations` | GET | List integration opportunities |
| `/api/workflows/[id]/risks` | GET | List risk assessments |
| `/api/workflows/[id]/artifacts/[type]` | GET | Get specific artifact |
| `/api/semantic-tasks/[id]` | PATCH | Human correction |
| `/api/skills` | GET | List user's skills |
| `/api/skills/[id]` | GET/PATCH | Skill detail / correction |
| `/api/tools` | GET | List tools |
| `/api/tools/[id]` | GET | Tool detail |
| `/api/agent-designs` | GET | List agent designs |
| `/api/agent-designs/[id]` | GET/PATCH | Agent design detail / correction |
| `/api/skills/library` | GET | Deduplicated skill library |
| `/api/skills/library/refresh` | POST | Re-run deduplication |
| `/api/automation-opportunities/summary` | GET | Aggregate opportunity summary |
| `/api/risk-assessments/summary` | GET | Aggregate risk summary |
| `/api/intelligence/refresh` | POST | Batch re-process all workflows |

All endpoints follow existing pattern: REST, `{ data, error, meta }` response envelope, user-scoped queries.

### Frontend Integration Points

| Page | New Components |
|------|---------------|
| Workflow Detail | New tabs: "Agent Intelligence", "Automation Opportunities", "Risk" |
| Dashboard | Aggregate intelligence metrics card, top automation opportunities |
| New Page: Skill Library | Grid of skills with filtering by type, system, automation score |
| New Page: Agent Designs | List of proposed agents with status and confidence |
| New Page: Integration Map | Visual graph of system-to-system data flows |

### Database Schema Summary

New tables (7):
- `semantic_tasks`
- `skills`
- `tools`
- `agent_designs`
- `automation_opportunities`
- `integration_opportunities`
- `risk_assessments`

Extended tables (1):
- `workflow_artifacts` -- new artifact_type values

New relations on User model:
- `skills`, `tools`, `agentDesigns`, `automationOpportunities`, `integrationOpportunities`, `riskAssessments`

New relation on Workflow model:
- `semanticTasks`

---

## G. Evaluation and QA Plan

### Acceptance Criteria Per Component

| Component | Acceptance Criteria |
|-----------|-------------------|
| SemanticTask extraction | >= 80% verb/object accuracy on 50-step sample; no PII in output; every task traces to source events |
| Automation classification | Matches expert review >= 75% on 20-workflow sample; error_handling never classified full_automation |
| Skill extraction | No false merges in 50-skill sample; every skill has occurrenceCount >= 1 |
| Tool mapping | No fabricated API endpoints; deterministic mappings for curated systems |
| Agent composition | Every agent references only existing skills/tools; orchestration logic matches map topology |
| Integration detection | No false integrations (same-system); all cross-system data flows detected |
| Risk assessment | Every agent has >= 1 risk assessment; sensitive workflows have severity >= high |
| Artifact generation | All 6 types pass JSON schema validation; no PII; every artifact has summary |
| Cross-workflow dedup | Zero false merges; correct aggregation of counts and IDs |

### Test Data Strategy

1. **Fixture workflows:** Create 5 curated ProcessOutput fixtures covering:
   - Simple single-system workflow (3 steps, Gmail only)
   - Multi-system workflow (8 steps, Gmail + Salesforce + Google Sheets)
   - Complex workflow with error handling (15 steps, branching)
   - Data-heavy workflow (10 steps, mostly data_entry and fill_and_submit)
   - Multi-workflow set with overlapping skills (3 workflows sharing common steps)

2. **Golden file tests:** Each fixture has expected output for every pipeline stage. Deterministic stages must produce byte-identical output. Heuristic stages must produce output within defined confidence bounds.

3. **Regression suite:** Run full pipeline on all fixtures after every change. Fail if any golden file mismatch on deterministic outputs.

### Confidence Calibration

For every inference that produces a confidence score:

1. Collect predictions with confidence in buckets: [0-0.2], [0.2-0.4], [0.4-0.6], [0.6-0.8], [0.8-1.0]
2. For each bucket, measure actual accuracy via human review
3. Target: predicted confidence within 10% of actual accuracy per bucket
4. If calibration fails: adjust scoring weights, re-test

Initial calibration requires human review of 50-100 items across all pipeline stages.

### Human Review Integration

Every inference type supports human correction via PATCH endpoints:
- SemanticTask: correct verb, object, intent, automationClassification
- Skill: correct name, description, skillType, merge/split
- AgentDesign: adjust autonomyLevel, add/remove humanCheckpoints
- RiskAssessment: override severity, update mitigation

Corrections are logged with:
- Original value
- Corrected value
- Correcting user ID
- Timestamp
- Reason (optional)

Corrections feed back into confidence calibration.

### Regression Against Existing Pipeline

The new intelligence layer must NOT alter any existing pipeline output:
- ProcessOutput remains identical
- PortfolioIntelligence remains identical
- Process grouping (families, components) remains identical
- AutomationScoreResult from existing scorer remains identical

Test: Run existing test suite before and after integration. Zero failures.

---

## H. Security, Governance, and Auditability

### Privacy Constraints

1. **No PII in intelligence outputs:** SemanticTask.intent, Skill.name, AgentDesign.description, and all artifact content must not contain:
   - Email addresses
   - Phone numbers
   - Social security numbers or government IDs
   - Credit card numbers
   - Personal names (from form field values)
   - Passwords or API keys

2. **Sanitization rule:** All text fields in new types are derived from step titles, categories, system names, and domain labels -- never from raw event target values or input field values. The existing policy engine already strips sensitive field values at capture time.

3. **Validation:** A PII detection regex runs on all generated text fields before storage. Any match blocks storage and logs a policy violation.

### Sensitivity Propagation

The existing policy engine classifies sensitivity at the event level. The new layer propagates sensitivity:

| Source | Propagation Rule |
|--------|-----------------|
| Event with sensitivityClass != null | SemanticTask.automationClassification capped at "human_in_loop" |
| Step with hasSensitiveEvents=true | AutomationOpportunity cannot be "full_automation" |
| Workflow touching payment/government_id systems | AgentDesign.autonomyLevel capped at "supervised" |
| Any step in regulated system | RiskAssessment with riskCategory="compliance" auto-created |

### Audit Trail

Every intelligence pipeline execution produces an audit record:

| Field | Description |
|-------|-------------|
| executionId | UUID for the pipeline run |
| workflowId | Target workflow |
| userId | User who triggered the analysis |
| startedAt | Pipeline start timestamp |
| completedAt | Pipeline completion timestamp |
| stageResults | Per-stage success/failure with counts (e.g. "semantic_tasks: 8 created") |
| modelVersions | Version strings for each stage's model/config |
| errors | Any errors or warnings during processing |

Audit records are stored in a new `intelligence_audit_log` table (append-only).

### Human Correction Audit

Every PATCH to an intelligence entity creates an entry in a `correction_log` table:

```prisma
model CorrectionLog {
  id            String   @id @default(uuid())
  entityType    String   @map("entity_type")  // semantic_task, skill, agent_design, risk_assessment
  entityId      String   @map("entity_id")
  field         String                        // which field was corrected
  originalValue String   @map("original_value")
  correctedValue String  @map("corrected_value")
  reason        String?
  correctedBy   String   @map("corrected_by")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([correctedBy])
  @@map("correction_log")
}
```

### Compliance Considerations

- Intelligence outputs are user-scoped (same as workflow data)
- No intelligence data is shared between users unless explicitly via team/share mechanisms
- Intelligence artifacts inherit the access control of their source workflow
- Deletion of a workflow cascades to all intelligence outputs (existing Prisma onDelete: Cascade pattern)

---

## I. Final Delivery Sequence

### Milestone 1: Foundation (Week 1)

**Deliverables:**
- New package: `packages/agent-intelligence-engine` with project setup, types, Zod schemas
- SemanticTask extraction engine (deterministic, rule-based)
- Unit tests with 5 fixture ProcessOutputs -> SemanticTask[]
- Database migration for semantic_tasks table
- API: `GET /api/workflows/[id]/semantic-tasks`, `PATCH /api/semantic-tasks/[id]`

**Definition of done:** All tests pass. SemanticTask extraction produces valid output for all 5 fixtures. Golden file tests in place.

**Dependencies:** None (uses existing ProcessOutput)

### Milestone 2: Opportunity Scoring (Week 2)

**Deliverables:**
- AutomationOpportunity classification engine
- Integration with existing automationScorer
- Database migration for automation_opportunities table
- API: `GET /api/workflows/[id]/automation-opportunities`
- Unit tests for classification boundary conditions

**Definition of done:** Classification rules produce correct automationType for all test cases. error_handling never classified as full_automation. Existing automationScorer tests still pass.

**Dependencies:** M1 (SemanticTask)

### Milestone 3: Skill + Tool Library (Weeks 2-3, parallel with M2)

**Deliverables:**
- Skill extraction engine with deduplication
- Tool mapping engine with curated registry for top 20 systems
- Database migrations for skills and tools tables
- API: skills and tools CRUD endpoints
- Unit tests for extraction, deduplication, and tool mapping

**Definition of done:** Skill extraction from 3-workflow overlapping set produces deduplicated library with correct occurrence counts. No fabricated API endpoints.

**Dependencies:** M1 (SemanticTask)

### Milestone 4: Agent Composition (Week 3)

**Deliverables:**
- Agent composition engine
- Orchestration pattern detection
- Decision point and human checkpoint placement
- Database migration for agent_designs table
- API: agent design endpoints

**Definition of done:** Agent designed for multi-system workflow includes correct skills, tools, decision points. Autonomy level matches step classification distribution.

**Dependencies:** M2 (Opportunities), M3 (Skills + Tools)

### Milestone 5: Integration + Risk (Week 3, parallel with M4)

**Deliverables:**
- Integration detection engine
- Risk assessment engine
- Database migrations
- API: integration and risk endpoints

**Definition of done:** Cross-system workflows produce IntegrationOpportunity. Sensitive workflows produce high-severity RiskAssessment. Every AgentDesign has >= 1 risk.

**Dependencies:** M1 (SemanticTask), M2 (Opportunities)

### Milestone 6: Artifact Generation (Week 4)

**Deliverables:**
- All 6 artifact generators
- JSON schema validation for each type
- PII detection and blocking
- Storage in existing WorkflowArtifact table
- API: artifact retrieval endpoints

**Definition of done:** Full pipeline produces all 6 artifacts for test workflows. All pass schema validation. Zero PII in output.

**Dependencies:** M2, M4, M5

### Milestone 7: Cross-Workflow Intelligence (Weeks 4-5)

**Deliverables:**
- Cross-workflow skill deduplication
- Skill library management (versioning, refresh)
- Skill library export artifact
- Integration with existing CanonicalComponent

**Definition of done:** Skill library correctly deduplicates across workflows. Zero false merges in test set. Version numbers increment on updates.

**Dependencies:** M3, M6

### Milestone 8: End-to-End Pipeline + Frontend (Week 5)

**Deliverables:**
- `POST /api/workflows/[id]/generate-intelligence` orchestrating full pipeline
- Audit logging for pipeline executions
- Correction log for human overrides
- Frontend: Agent Intelligence tab on workflow detail page
- Frontend: Automation Opportunities summary card on dashboard

**Definition of done:** Full pipeline runs end-to-end for uploaded workflow. All outputs visible in UI. Audit log records every execution.

**Dependencies:** M1-M7

### Total Estimated Effort

| Phase | Estimated Duration |
|-------|-------------------|
| M1: Foundation | 1 week |
| M2: Opportunity Scoring | 0.5 week |
| M3: Skill + Tool Library | 1.5 weeks (parallel with M2) |
| M4: Agent Composition | 1 week |
| M5: Integration + Risk | 1 week (parallel with M4) |
| M6: Artifact Generation | 1 week |
| M7: Cross-Workflow Intelligence | 1 week |
| M8: End-to-End + Frontend | 1 week |

**Total calendar time:** ~5 weeks (with parallelism)
**Total engineering effort:** ~8 weeks of work

### Open Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite performance with 7 new tables and cross-table queries | Medium | Use indexed queries; plan for PostgreSQL migration |
| Synchronous pipeline may timeout for large workflows | High | Set 50-step threshold; return 202 for larger; plan BullMQ integration |
| Verb/object parsing accuracy may be < 80% on real workflows | Medium | Human correction loop; retraining from correction data |
| Tool registry coverage gaps for uncommon systems | Low | Graceful degradation to heuristic mapping with lower confidence |
| No LLM integration yet (all deterministic/heuristic) | Low | Design allows future LLM_INFERRED method; interfaces are ready |

---

## Appendix: End-to-End Example

### Input: Invoice Processing Workflow

A 6-step workflow recorded in the browser:

| Step | Title | Category | System | Duration |
|------|-------|----------|--------|----------|
| 1 | Open email with invoice attachment | click_then_navigate | gmail | 2000ms |
| 2 | Download invoice PDF | file_action | gmail | 3000ms |
| 3 | Navigate to Accounts Payable | click_then_navigate | netsuite | 1500ms |
| 4 | Fill invoice form with vendor details | fill_and_submit | netsuite | 15000ms |
| 5 | Upload invoice PDF attachment | file_action | netsuite | 4000ms |
| 6 | Submit invoice for approval | send_action | netsuite | 1000ms |

### Pipeline Output

**SemanticTasks:**

| taskId | intent | verb | object | system | automationClassification | confidence |
|--------|--------|------|--------|--------|--------------------------|------------|
| st-1 | Open email containing invoice | open | email | gmail | full_automation | 0.85 |
| st-2 | Download invoice PDF from email | download | file | gmail | full_automation | 0.90 |
| st-3 | Navigate to accounts payable module | navigate | page | netsuite | full_automation | 0.95 |
| st-4 | Enter vendor invoice details into form | fill | invoice | netsuite | human_in_loop | 0.80 |
| st-5 | Upload invoice PDF as attachment | upload | file | netsuite | full_automation | 0.90 |
| st-6 | Submit invoice for approval | submit | invoice | netsuite | ai_assisted | 0.75 |

**Skills extracted (4 unique):**

| Skill | Type | System | Automation Score |
|-------|------|--------|-----------------|
| Open and download email attachment | file_operation | gmail | 82 |
| Navigate to application module | navigation | netsuite | 90 |
| Fill form with structured data | data_entry | netsuite | 65 |
| Upload file attachment | file_operation | netsuite | 85 |

**Tools mapped (2):**

| Tool | System | Capability | Mapping Method |
|------|--------|-----------|----------------|
| Gmail API: Get Attachment | gmail | download_attachment | deterministic |
| NetSuite API: Create Vendor Bill | netsuite | create_record | heuristic |

**Agent Design:**

- Name: Invoice Processing Agent
- Orchestration: sequential
- Autonomy: supervised (step 4 requires human review)
- Human checkpoints: after step 4 (verify vendor details before submission)
- Decision points: none (linear workflow)
- Estimated runtime: 26500ms (current) -> ~5000ms automated (81% reduction)

**Integration Opportunity:**

- Source: gmail, Target: netsuite
- Data flow: invoice PDF attachment
- Current method: manual_copy (download then upload)
- Proposed method: api (Gmail API -> NetSuite API)
- Complexity: medium

**Risk Assessment:**

- data_sensitivity: medium (financial data in invoice)
- reliability: low (deterministic linear flow)
- complexity: low (6 steps, 2 systems)

**ROI Report:**

- Current time per execution: 26.5 seconds
- Estimated automated time: 5.0 seconds (81% reduction)
- Per-execution savings: 21.5 seconds
- At 50 executions/week: 17.9 hours saved per year

---

*End of specification.*
