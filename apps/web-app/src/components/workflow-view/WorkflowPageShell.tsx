'use client';

/**
 * WorkflowPageShell — Top-level container for the diagram-first workflow
 * visualization. Manages view mode, toolbar state, inspector selection,
 * and delegates rendering to the active mode's canvas component.
 *
 * This is the shared framework that all three visualization modes use.
 * The actual canvas rendering (React Flow) is plugged in via the
 * `canvasSlot` prop — each mode provides its own canvas component.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { WorkflowHeader } from './WorkflowHeader';
import { WorkflowModeSwitcher } from './WorkflowModeSwitcher';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowInspectorPanel } from './WorkflowInspectorPanel';
import { WorkflowInsightsStrip } from './WorkflowInsightsStrip';
import { WorkflowLegend } from './WorkflowLegend';
import { WorkflowEmptyState, WorkflowErrorState, WorkflowSkeleton } from './WorkflowEmptyState';
import { WorkflowFlowCanvas } from './WorkflowCanvas';
import type { CanvasControls } from './WorkflowCanvas';
import { WorkflowVariantsMap } from './WorkflowVariantsMap';
import { WorkflowSystemsMap } from './WorkflowSystemsMap';
import { useWorkflowViewModel } from './hooks/useWorkflowViewModel';
import { LAYOUT } from './constants';
import type {
  WorkflowViewMode,
  InspectorSelection,
  ToolbarState,
  NodeInspectorData,
  EdgeInspectorData,
  SystemInspectorData,
} from './types';

// ─── Props ─────────────────────────────���────────────────────────────────���────

interface Props {
  /** Raw process output from the engine (the process_output artifact). */
  processOutput: any;
  /** Process map artifact (may overlap with processOutput.processMap). */
  processMap: any;
  /** SOP artifact for inspector procedure display. */
  sopArtifact: any;
  /** Workflow record from the database (for title, confidence, etc.). */
  workflowRecord?: {
    id: string;
    title: string;
    confidence: number | null;
    createdAt: string;
    status: string;
  };
  /** Whether data is still loading. */
  isLoading?: boolean;
  /** Error message if data failed to load. */
  error?: string | null;
}

// ─── Default toolbar state ────────────────────────────���──────────────────────

const DEFAULT_TOOLBAR: ToolbarState = {
  showLabels: true,
  showMetrics: true,
  showInsights: true,
  showMinimap: false,
  showLegend: false,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkflowPageShell({
  processOutput,
  processMap: processMapProp,
  sopArtifact,
  workflowRecord,
  isLoading,
  error,
}: Props) {
  // ── State ──────────────────────��───────────────────────────��────────────

  const [mode, setMode] = useState<WorkflowViewMode>('flow');
  const [toolbar, setToolbar] = useState<ToolbarState>(DEFAULT_TOOLBAR);
  const [selection, setSelection] = useState<InspectorSelection>({ type: 'none', id: null });

  // ── View model ──────────────────────────────────────────────────────────

  // Merge process map from processOutput if not provided separately
  const mergedOutput = useMemo(() => {
    if (!processOutput) return null;
    return {
      processRun: processOutput.processRun,
      processDefinition: processOutput.processDefinition,
      processMap: processOutput.processMap ?? processMapProp,
      sop: processOutput.sop ?? sopArtifact,
    };
  }, [processOutput, processMapProp, sopArtifact]);

  const viewModel = useWorkflowViewModel(mergedOutput, workflowRecord);

  // ── Inspector data resolution (from normalized graph) ──────────────────
  // Uses the normalized ViewNode/ViewEdge/ViewPhase objects — no raw engine
  // types leak into the inspector components.

  const nodeData = useMemo((): NodeInspectorData | null => {
    if (selection.type !== 'node' || !selection.id || !viewModel) return null;
    const viewNode = viewModel.graph.nodes.find(n => n.id === selection.id);
    if (!viewNode) return null;

    // Build a StepDefinition-shaped object from the normalized ViewNode
    // so the inspector component can render without raw engine imports.
    const stepDef = {
      ordinal: viewNode.ordinal,
      stepId: viewNode.stepId,
      title: viewNode.label,
      category: viewNode.category as any,
      categoryLabel: viewNode.categoryLabel,
      categoryColor: viewNode.accentColor,
      categoryBg: viewNode.bgColor,
      operationalDefinition: viewNode.operationalDefinition,
      purpose: '',
      systems: viewNode.systems,
      domains: [],
      inputs: [],
      outputs: [],
      completionCondition: '',
      confidence: viewNode.confidence,
      durationMs: viewNode.durationMs,
      durationLabel: viewNode.durationLabel,
      eventCount: viewNode.eventCount,
      hasSensitiveEvents: viewNode.hasSensitiveData,
      sourceEventIds: [],
    };

    // Build SOP step-shaped object from ViewNode's SOP data
    const sopStep = viewNode.procedure ? {
      stepId: viewNode.stepId,
      detail: viewNode.procedure,
      expectedOutcome: viewNode.expectedOutcome,
      warnings: viewNode.warnings,
    } : undefined;

    // Build ProcessMapNode-shaped object for the inspector
    const node = {
      id: viewNode.id,
      stepId: viewNode.stepId,
      ordinal: viewNode.ordinal,
      title: viewNode.label,
      nodeType: viewNode.nodeType as any,
      category: viewNode.category as any,
      categoryLabel: viewNode.categoryLabel,
      categoryColor: viewNode.accentColor,
      categoryBg: viewNode.bgColor,
      position: viewNode.position,
      metadata: {
        systems: viewNode.systems,
        durationLabel: viewNode.durationLabel,
        eventCount: viewNode.eventCount,
        humanEventCount: viewNode.humanEventCount,
        eventTypeSummary: {},
      },
    };

    return {
      stepDef: stepDef as any,
      sopStep: sopStep as any,
      node: node as any,
      eventCount: viewNode.eventCount,
      humanEventCount: viewNode.humanEventCount,
      frictionIndicators: viewNode.frictionIndicators as any[],
    };
  }, [selection, viewModel]);

  const edgeData = useMemo((): EdgeInspectorData | null => {
    if (selection.type !== 'edge' || !selection.id || !viewModel) return null;
    const viewEdge = viewModel.graph.edges.find(e => e.id === selection.id);
    if (!viewEdge) return null;
    const sourceNode = viewModel.graph.nodes.find(n => n.id === viewEdge.sourceId);
    const targetNode = viewModel.graph.nodes.find(n => n.id === viewEdge.targetId);
    if (!sourceNode || !targetNode) return null;

    // Build ProcessMapEdge/Node shapes for the inspector
    return {
      edge: { id: viewEdge.id, source: viewEdge.sourceId, target: viewEdge.targetId, type: viewEdge.type as any, boundaryLabel: viewEdge.label } as any,
      sourceNode: { id: sourceNode.id, title: sourceNode.label, ordinal: sourceNode.ordinal } as any,
      targetNode: { id: targetNode.id, title: targetNode.label, ordinal: targetNode.ordinal } as any,
    };
  }, [selection, viewModel]);

  const systemData = useMemo((): SystemInspectorData | null => {
    if (selection.type !== 'system' || !selection.id || !viewModel) return null;
    const system = viewModel.graph.systems.find(s => s.id === selection.id);
    if (!system) return null;
    const phase = viewModel.graph.phases.find(p => p.system.toLowerCase().replace(/[^a-z0-9]+/g, '_') === selection.id);

    return {
      system: system.label,
      phase: phase ? { id: phase.id, name: phase.label, system: phase.system, stepNodeIds: phase.nodeIds } as any : { id: system.id, name: system.label, system: system.label, stepNodeIds: system.nodeIds } as any,
      stepCount: system.stepCount,
      totalDurationMs: system.totalDurationMs,
      nodeIds: system.nodeIds,
    };
  }, [selection, viewModel]);

  // ── Handlers ───────────────────────────────────���────────────────────────

  const handleToggle = useCallback((key: keyof ToolbarState) => {
    setToolbar(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectNode = useCallback((id: string | null) => {
    setSelection(id ? { type: 'node', id } : { type: 'none', id: null });
  }, []);

  const handleClose = useCallback(() => {
    setSelection({ type: 'none', id: null });
  }, []);

  // Canvas controls — connected to React Flow instance via onCanvasReady callback
  const canvasControlsRef = useRef<CanvasControls | null>(null);

  const handleCanvasReady = useCallback((controls: CanvasControls) => {
    canvasControlsRef.current = controls;
  }, []);

  const handleZoomIn = useCallback(() => canvasControlsRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => canvasControlsRef.current?.zoomOut(), []);
  const handleFitView = useCallback(() => canvasControlsRef.current?.fitView(), []);
  const handleResetView = useCallback(() => canvasControlsRef.current?.resetView(), []);

  // ── Loading state ───────────────────────────────────────────────────────

  if (isLoading) {
    return <WorkflowSkeleton />;
  }

  // ── Error state ──────────────��────────────────────────────────��─────────

  if (error) {
    return <WorkflowErrorState message={error} />;
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!viewModel) {
    return <WorkflowEmptyState />;
  }

  // ── Render ──────────────────────────────��────────────────────────���──────

  const inspectorOpen = selection.type !== 'none' && selection.id !== null;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Metadata header ────────────────��───────────────────────────── */}
      <WorkflowHeader metadata={viewModel.metadata} />

      {/* ── Mode switcher + Toolbar row ────────────────────────���───────── */}
      <div className="flex items-center justify-between px-ds-5 py-ds-1.5 border-b border-gray-100">
        <WorkflowModeSwitcher activeMode={mode} onModeChange={setMode} />
        <WorkflowToolbar
          toolbar={toolbar}
          onToggle={handleToggle}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onResetView={handleResetView}
        />
      </div>

      {/* ── Canvas + Inspector area ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas area — flex-1 shrinks when inspector opens */}
        <div className="flex-1 relative bg-gray-50/30 min-w-0">
          {/* Flow Intelligence Map */}
          {mode === 'flow' && (
            <WorkflowFlowCanvas
              graph={viewModel.graph}
              toolbar={toolbar}
              selectedNodeId={selection.type === 'node' ? selection.id : null}
              onSelectNode={handleSelectNode}
              onCanvasReady={handleCanvasReady}
            />
          )}

          {/* Process Variants Map */}
          {mode === 'variants' && (
            <WorkflowVariantsMap
              graph={viewModel.graph}
              intelligence={processOutput?.intelligence ?? processOutput?.processDefinition?.intelligence}
              onSelectNode={handleSelectNode}
            />
          )}

          {/* System Interaction Map */}
          {mode === 'systems' && (
            <WorkflowSystemsMap
              graph={viewModel.graph}
              onSelectNode={handleSelectNode}
            />
          )}

          {/* Legend overlay */}
          <WorkflowLegend
            visible={toolbar.showLegend}
            onClose={() => handleToggle('showLegend')}
          />
        </div>

        {/* Inspector panel — slides in from right, overlays on narrow screens */}
        <div
          className={`flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden ${
            inspectorOpen ? 'w-[360px] lg:relative absolute right-0 top-0 bottom-0 z-10' : 'w-0'
          }`}
        >
          {inspectorOpen && (
            <div className="w-[360px] h-full">
              <WorkflowInspectorPanel
                selection={selection}
                nodeData={nodeData}
                edgeData={edgeData}
                systemData={systemData}
                onClose={handleClose}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Insights strip ─────────────────────────────────────────────── */}
      <WorkflowInsightsStrip
        insights={viewModel.insights}
        visible={toolbar.showInsights}
      />
    </div>
  );
}
