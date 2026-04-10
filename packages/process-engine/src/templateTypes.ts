/**
 * Template type definitions for the Ledgerium process map and SOP template system.
 *
 * The template layer sits on top of the existing ProcessOutput data model.
 * It does not replace the core builders — it provides multiple presentation
 * views of the same underlying process intelligence.
 *
 * Architecture:
 *   ProcessEngineInput → processSession() → ProcessOutput
 *   ProcessOutput → templateSelector → TemplateSelection
 *   ProcessOutput + TemplateSelection → renderer → RenderedArtifact
 */

import type {
  FrictionIndicator,
} from './types.js';

// ─── Template type enums ─────────────────────────────────────────────────────

export type ProcessMapTemplateType =
  | 'swimlane'
  | 'bpmn_informed'
  | 'sipoc_high_level';

export type SOPTemplateType =
  | 'operator_centric'
  | 'enterprise'
  | 'decision_based';

// ─── Template selection result ───────────────────────────────────────────────

export interface TemplateSelection {
  processMap: {
    template: ProcessMapTemplateType;
    rationale: string;
  };
  sop: {
    template: SOPTemplateType;
    rationale: string;
  };
}

// ─── Rendered process map artifacts ──────────────────────────────────────────

/**
 * Swimlane process map — lanes by system/role, ordered steps with handoffs.
 */
export interface SwimlaneProcessMap {
  templateType: 'swimlane';
  title: string;
  objective: string;
  trigger: string;
  outcome: string;
  durationLabel: string;
  lanes: SwimlaneMapLane[];
  steps: SwimlaneMapStep[];
  decisions: SwimlaneMapDecision[];
  handoffs: SwimlaneMapHandoff[];
  frictionAnnotations: FrictionIndicator[];
  metadata: {
    systems: string[];
    roles: string[];
    stepCount: number;
    phaseCount: number;
    confidence: number;
  };
}

export interface SwimlaneMapLane {
  id: string;
  label: string;
  system: string;
  stepCount: number;
}

export interface SwimlaneMapStep {
  ordinal: number;
  title: string;
  laneId: string;
  category: string;
  categoryLabel: string;
  durationLabel: string;
  dominantAction: string;
  isExceptionPath: boolean;
  pageContext: string;
}

export interface SwimlaneMapDecision {
  afterStepOrdinal: number;
  label: string;
  laneId: string;
  yesPath: string;
  noPath: string;
}

export interface SwimlaneMapHandoff {
  fromStepOrdinal: number;
  toStepOrdinal: number;
  fromLane: string;
  toLane: string;
  label: string;
}

/**
 * BPMN-informed process map — richer notation for technical workflows.
 */
export interface BPMNProcessMap {
  templateType: 'bpmn_informed';
  processId: string;
  processName: string;
  startEvent: BPMNEvent;
  endEvent: BPMNEvent;
  tasks: BPMNTask[];
  gateways: BPMNGateway[];
  sequenceFlows: BPMNSequenceFlow[];
  pools: BPMNPool[];
  systemInteractions: BPMNSystemInteraction[];
  exceptionFlows: BPMNExceptionFlow[];
  metadata: {
    systems: string[];
    eventCount: number;
    hasParallelPaths: boolean;
    hasRetries: boolean;
    hasSystemEvents: boolean;
  };
}

export interface BPMNEvent {
  id: string;
  label: string;
  type: 'start' | 'end' | 'intermediate';
  trigger?: string;
}

export interface BPMNTask {
  id: string;
  ordinal: number;
  label: string;
  type: 'user' | 'system' | 'manual';
  poolId: string;
  durationLabel: string;
  inputs: string[];
  outputs: string[];
}

export interface BPMNGateway {
  id: string;
  type: 'exclusive' | 'parallel' | 'inclusive';
  label: string;
  afterTaskId: string;
  conditions: Array<{ label: string; targetTaskId: string }>;
}

export interface BPMNSequenceFlow {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  isDefault: boolean;
}

export interface BPMNPool {
  id: string;
  label: string;
  system: string;
  taskIds: string[];
}

export interface BPMNSystemInteraction {
  taskId: string;
  type: 'send' | 'receive' | 'service';
  system: string;
  description: string;
}

export interface BPMNExceptionFlow {
  sourceTaskId: string;
  errorLabel: string;
  handlingSteps: string[];
  resolution: string;
}

/**
 * SIPOC + High-Level process map — executive summary view.
 */
export interface SIPOCProcessMap {
  templateType: 'sipoc_high_level';
  processName: string;
  businessObjective: string;
  suppliers: string[];
  inputs: string[];
  processStages: SIPOCStage[];
  outputs: string[];
  customers: string[];
  boundaries: { start: string; end: string };
  keySystems: string[];
  keyRoles: string[];
  riskHighlights: string[];
  metrics: { stepCount: number; systemCount: number; estimatedDuration: string; confidence: number };
}

export interface SIPOCStage {
  ordinal: number;
  title: string;
  description: string;
  system: string;
  stepCount: number;
}

// ─── Rendered SOP artifacts ──────────────────────────────────────────────────

/**
 * Operator-centric SOP — frontline execution focus.
 */
export interface OperatorSOP {
  templateType: 'operator_centric';
  taskTitle: string;
  whatThisIsFor: string;
  whenToUseIt: string;
  beforeYouBegin: string[];
  systemsNeeded: string[];
  steps: OperatorSOPStep[];
  commonMistakes: string[];
  tips: string[];
  completionCheck: string[];
  sourceNote: string;
  /** Advisory shown when some steps have low label confidence. */
  qualityAdvisory?: string | undefined;
}

export interface OperatorSOPStep {
  number: number;
  action: string;
  detail: string;
  system: string;
  expectedResult: string;
  caution: string;
}

/**
 * Enterprise SOP — formal governance documentation.
 */
export interface EnterpriseSOP {
  templateType: 'enterprise';
  title: string;
  sopId: string;
  version: string;
  purpose: string;
  scope: string;
  trigger: string;
  rolesAndResponsibilities: Array<{ role: string; responsibility: string }>;
  prerequisites: string[];
  inputs: string[];
  systemsAndTools: string[];
  procedure: EnterpriseSOPStep[];
  decisionPoints: EnterpriseSOPDecision[];
  controls: string[];
  risks: string[];
  outputs: string[];
  completionCriteria: string[];
  sourceNote: string;
  /** Advisory shown when some steps have low label confidence. */
  qualityAdvisory?: string | undefined;
  revisionMetadata: {
    generatedAt: string;
    engineVersion: string;
    basedOn: string;
  };
}

export interface EnterpriseSOPStep {
  ordinal: number;
  title: string;
  instruction: string;
  actor: string;
  system: string;
  inputs: string[];
  outputs: string[];
  verificationPoint: string;
}

export interface EnterpriseSOPDecision {
  atStepOrdinal: number;
  question: string;
  options: Array<{ condition: string; action: string }>;
}

/**
 * Decision-based SOP — branch-heavy and triage workflows.
 */
export interface DecisionSOP {
  templateType: 'decision_based';
  title: string;
  purpose: string;
  triggerCondition: string;
  inputsNeeded: string[];
  initialAssessment: string;
  branches: DecisionSOPBranch[];
  escalationRules: string[];
  exceptionHandling: string[];
  resolutionOutcomes: string[];
  completionCriteria: string[];
  documentationRequirements: string[];
  sourceNote: string;
  /** Advisory shown when some steps have low label confidence. */
  qualityAdvisory?: string | undefined;
}

export interface DecisionSOPBranch {
  condition: string;
  actions: DecisionSOPAction[];
  outcome: string;
}

export interface DecisionSOPAction {
  ordinal: number;
  instruction: string;
  system: string;
}

// ─── Union types for renderer dispatch ───────────────────────────────────────

export type RenderedProcessMap = SwimlaneProcessMap | BPMNProcessMap | SIPOCProcessMap;
export type RenderedSOP = OperatorSOP | EnterpriseSOP | DecisionSOP;

export interface RenderedArtifacts {
  processMap: RenderedProcessMap;
  sop: RenderedSOP;
  selection: TemplateSelection;
}
