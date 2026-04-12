/**
 * SOP Format View — Type Definitions
 *
 * View-layer contracts for the SOP experience. Components consume
 * these types — never raw engine types directly.
 */

import type {
  SOP,
  SOPStep,
  SOPInstruction,
  FrictionIndicator,
  QualityIndicators,
  GroupingReason,
} from '@ledgerium/process-engine';

// ─── SOP modes ───────────────────────────────────────────────────────────────

export type SOPViewMode = 'execution' | 'visual' | 'intelligence';

export const SOP_MODE_LABELS: Record<SOPViewMode, { label: string; description: string }> = {
  execution: {
    label: 'Execution SOP',
    description: 'Step-by-step instructions for frontline operators',
  },
  visual: {
    label: 'Visual Process',
    description: 'Phase-grouped view showing system context and flow',
  },
  intelligence: {
    label: 'Intelligence',
    description: 'Friction analysis, optimization, and quality insights',
  },
};

// ─── SOP metadata ────────────────────────────────────────────────────────────

export interface SOPMetadata {
  id: string;
  title: string;
  objective: string;
  purpose: string;
  scope: string;
  trigger: string;
  estimatedTime: string;
  stepCount: number;
  systems: string[];
  roles: string[];
  confidence: number | null;
  confidenceLabel: string;
  status: string;
  createdAt: string;
  frictionCount: number;
  errorStepCount: number;
  lowConfidenceStepCount: number;
  isComplete: boolean;
  version: string;
  sourceNote: string;
}

// ─── Quick start summary (execution mode) ────────────────────────────────────

export interface SOPQuickStart {
  trigger: string;
  prerequisites: string[];
  systemsNeeded: string[];
  estimatedTime: string;
  /** Contextual "when to use" phrase derived from activity name. */
  whenToUseIt: string;
  /** Whether the user can begin (all prereqs conceptually met). */
  isReady: boolean;
}

// ─── Normalized SOP step ─────────────────────────────────────────────────────

export interface SOPViewStep {
  id: string;
  ordinal: number;
  /** Humanized title — improved from raw engine label. */
  title: string;
  /** Short title for compact display (max ~40 chars). */
  shortTitle: string;
  /** Concise action summary verb phrase. */
  action: string;
  category: string;
  categoryLabel: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  system: string;
  actor: string;
  durationLabel: string;
  confidence: number;
  isLowConfidence: boolean;
  isDecisionPoint: boolean;
  decisionLabel: string;
  hasSensitiveData: boolean;
  expectedOutcome: string;
  warnings: string[];
  instructions: SOPViewInstruction[];
  /** Pre-formatted detail text (newline-separated numbered list). */
  detailText: string;
  inputs: string[];
  frictionIndicators: SOPViewFriction[];
  hasHighFriction: boolean;
  /** Phase/system group this step belongs to (for visual mode). */
  phaseId: string;
  /** Whether this step is an error-handling/recovery step. */
  isErrorHandling: boolean;
  /** Automation opportunity hint (null if not applicable). */
  automationHint: string | null;
}

export interface SOPViewInstruction {
  sequence: number;
  text: string;
  type: 'action' | 'wait' | 'verify' | 'note';
  system: string;
  isSensitive: boolean;
  targetLabel: string;
}

export interface SOPViewFriction {
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  affectedStepOrdinals: number[];
}

// ─── Phase groups (for visual mode) ──────────────────────────────────────────

export interface SOPViewPhase {
  id: string;
  label: string;
  system: string;
  stepIds: string[];
  stepCount: number;
  totalDuration: string;
  color: string;
  /** Whether this phase has any friction indicators. */
  hasFriction: boolean;
}

// ─── Workflow DNA (mini process map preview for visual mode) ──────────────────

export interface SOPWorkflowDNA {
  /** One entry per step — category + color for rendering colored dots. */
  stepDots: Array<{ ordinal: number; category: string; color: string; isDecision: boolean; isError: boolean }>;
  /** Phase break positions (ordinals where the system changes). */
  phaseBreaks: number[];
  systemCount: number;
  totalSteps: number;
}

// ─── Insight (for intelligence mode) ─────────────────────────────────────────

export type SOPInsightSeverity = 'info' | 'warning' | 'critical';

export interface SOPViewInsight {
  id: string;
  label: string;
  detail: string;
  severity: SOPInsightSeverity;
  affectedStepOrdinals: number[];
}

// ─── Recommendation (for intelligence mode) ──────────────────────────────────

export type RecommendationType = 'automation' | 'integration' | 'simplification' | 'training' | 'quality';

export interface SOPRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  detail: string;
  affectedStepOrdinals: number[];
  /** Estimated impact: 'high' | 'medium' | 'low'. */
  impact: string;
}

// ─── Decision block ──────────────────────────────────────────────────────────

export interface SOPViewDecision {
  stepOrdinal: number;
  stepId: string;
  question: string;
  options: Array<{ condition: string; action: string }>;
}

// ─── Common issue ────────────────────────────────────────────────────────────

export interface SOPViewIssue {
  title: string;
  description: string;
  affectedStepOrdinals: number[];
}

// ─── Enterprise enrichment (from enterprise template) ────────────────────────

export interface SOPEnterpriseData {
  rolesAndResponsibilities: Array<{ role: string; responsibility: string }>;
  controls: string[];
  risks: string[];
  revisionMetadata: { generatedAt: string; engineVersion: string; basedOn: string } | null;
}

// ─── Smart summary (for intelligence mode) ───────────────────────────────────

export interface SOPSmartSummary {
  /** One-sentence process overview. */
  oneLiner: string;
  /** Key stats in readable form. */
  statsSentence: string;
  /** Primary concern or highlight. */
  primaryInsight: string;
  /** System interaction summary. */
  systemSummary: string;
}

// ─── Complete view model ─────────────────────────────────────────────────────

export interface SOPViewModel {
  metadata: SOPMetadata;
  steps: SOPViewStep[];
  phases: SOPViewPhase[];
  decisions: SOPViewDecision[];
  issues: SOPViewIssue[];
  insights: SOPViewInsight[];
  recommendations: SOPRecommendation[];
  prerequisites: string[];
  completionCriteria: string[];
  tips: string[];
  commonMistakes: string[];
  qualityAdvisory: string | null;

  /** Execution mode: quick start card data. */
  quickStart: SOPQuickStart;
  /** Visual mode: mini process map preview data. */
  workflowDNA: SOPWorkflowDNA;
  /** Intelligence mode: AI-ready contextual summary. */
  smartSummary: SOPSmartSummary;
  /** Enterprise template enrichment (roles, controls, risks). */
  enterprise: SOPEnterpriseData;
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { SOP, SOPStep, SOPInstruction, FrictionIndicator, QualityIndicators, GroupingReason };
