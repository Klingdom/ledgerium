/**
 * Workflow Format View — Shared Type Definitions
 *
 * Provides the view-layer contracts for the diagram-first workflow
 * visualization. These types sit between the engine's ProcessOutput
 * and the React rendering layer — components never touch raw engine
 * types directly.
 */

import type {
  ProcessMap,
  ProcessMapNode,
  ProcessMapEdge,
  ProcessMapPhase,
  ProcessMapNodeType,
  GroupingReason,
  FrictionIndicator,
  ProcessRun,
  ProcessDefinition,
  SOP,
  SOPStep,
  StepDefinition,
} from '@ledgerium/process-engine';

// ─── View modes ──────────────────────────────────────────────────────────────

export type WorkflowViewMode = 'flow' | 'variants' | 'systems';

export const VIEW_MODE_LABELS: Record<WorkflowViewMode, { label: string; description: string }> = {
  flow: {
    label: 'Flow Intelligence',
    description: 'Step-by-step execution path with phases, decisions, and friction',
  },
  variants: {
    label: 'Process Variants',
    description: 'Compare execution paths and identify deviations',
  },
  systems: {
    label: 'System Interaction',
    description: 'Cross-system handoffs and integration patterns',
  },
};

// ─── Inspector selection model ───────────────────────────────────────────────

export type InspectorItemType = 'node' | 'edge' | 'path' | 'system' | 'none';

export interface InspectorSelection {
  type: InspectorItemType;
  id: string | null;
}

export interface NodeInspectorData {
  stepDef: StepDefinition;
  sopStep?: SOPStep | undefined;
  node: ProcessMapNode;
  eventCount: number;
  humanEventCount: number;
  frictionIndicators: FrictionIndicator[];
}

export interface EdgeInspectorData {
  edge: ProcessMapEdge;
  sourceNode: ProcessMapNode;
  targetNode: ProcessMapNode;
}

export interface SystemInspectorData {
  system: string;
  phase: ProcessMapPhase;
  stepCount: number;
  totalDurationMs: number;
  nodeIds: string[];
}

// ─── Metadata band ───────────────────────────────────────────────────────────

export interface WorkflowMetadata {
  id: string;
  title: string;
  objective: string;
  durationLabel: string;
  durationMs: number | null;
  stepCount: number;
  eventCount: number;
  humanEventCount: number;
  systemEventCount: number;
  phaseCount: number;
  systems: string[];
  confidence: number | null;
  status: string;
  variantCount: number;
  totalRuns: number;
  createdAt: string;
  updatedAt: string;
  frictionCount: number;
  completionStatus: string;
  errorStepCount: number;
}

// ─── Insights strip ──────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface WorkflowInsight {
  id: string;
  label: string;
  severity: InsightSeverity;
  detail?: string;
  affectedStepOrdinals?: number[];
}

// ─── Legend ───────────────────────────────────────────────────────────────────

export interface LegendEntry {
  color: string;
  label: string;
  shape?: 'circle' | 'diamond' | 'rounded-rect';
}

// ─── View model (output of useWorkflowViewModel) ────────────────────────────

export interface WorkflowViewModel {
  metadata: WorkflowMetadata;
  processMap: ProcessMap;
  processDefinition: ProcessDefinition;
  processRun: ProcessRun;
  sop: SOP;
  insights: WorkflowInsight[];
  legendEntries: LegendEntry[];
  frictionIndicators: FrictionIndicator[];
}

// ─── Toolbar state ───────────────────────────────────────────────────────────

export interface ToolbarState {
  showLabels: boolean;
  showMetrics: boolean;
  showInsights: boolean;
  showMinimap: boolean;
  showLegend: boolean;
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export type {
  ProcessMap,
  ProcessMapNode,
  ProcessMapEdge,
  ProcessMapPhase,
  ProcessMapNodeType,
  GroupingReason,
  FrictionIndicator,
  ProcessRun,
  ProcessDefinition,
  SOP,
  SOPStep,
  StepDefinition,
};
