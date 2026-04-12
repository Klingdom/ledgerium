/**
 * useWorkflowViewModel — Transforms raw ProcessOutput into normalized,
 * display-ready view models. This is the ONLY place raw engine data
 * is consumed — all components downstream receive typed view models.
 *
 * Returns both the shell-level metadata (for header, insights, legend)
 * and the normalized graph model (for canvas adapters).
 */

import { useMemo } from 'react';
import type {
  WorkflowMetadata,
  WorkflowInsight,
  LegendEntry,
  FrictionIndicator,
} from '../types';
import { CATEGORY_STYLES } from '../constants';
import { buildNormalizedViewModel } from '../adapters/viewModel';
import type { NormalizedViewModel } from '../adapters/viewModel';

// ─── Combined view model output ──────────────────────────────────────────────

export interface WorkflowViewModelResult {
  /** Shell-level metadata for header, KPIs, etc. */
  metadata: WorkflowMetadata;
  /** Normalized graph data for all three canvas modes. */
  graph: NormalizedViewModel;
  /** Insights for the bottom strip. */
  insights: WorkflowInsight[];
  /** Legend entries for the floating legend. */
  legendEntries: LegendEntry[];
  /** Friction indicators for overlay rendering. */
  frictionIndicators: FrictionIndicator[];
  /** Raw SOP for inspector procedure display. */
  sop: any;
}

// ─── Input shape ─────────────────────────────────────────────────────────────

interface ProcessOutputData {
  processRun?: any;
  processDefinition?: any;
  processMap?: any;
  sop?: any;
}

interface WorkflowRecord {
  id: string;
  title: string;
  confidence: number | null;
  createdAt: string;
  status: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkflowViewModel(
  processOutput: ProcessOutputData | null | undefined,
  workflowRecord?: WorkflowRecord,
): WorkflowViewModelResult | null {
  return useMemo(() => {
    if (!processOutput) return null;

    const { processRun, processDefinition, processMap, sop } = processOutput;
    if (!processRun || !processMap) return null;

    // ── Build normalized graph model ─────────────────────────────────────

    const graph = buildNormalizedViewModel(processOutput);
    if (!graph) return null;

    // ── Build shell-level metadata ───────────────────────────────────────

    const frictionIndicators: FrictionIndicator[] = processMap.frictionSummary ?? [];

    const metadata: WorkflowMetadata = {
      id: workflowRecord?.id ?? processRun.sessionId ?? '',
      title: workflowRecord?.title ?? processRun.activityName ?? '',
      objective: processDefinition?.description ?? processDefinition?.purpose ?? '',
      durationLabel: processRun.durationLabel ?? '',
      durationMs: processRun.durationMs ?? null,
      stepCount: graph.totalSteps,
      eventCount: graph.totalEvents,
      humanEventCount: processRun.humanEventCount ?? 0,
      systemEventCount: processRun.systemEventCount ?? 0,
      phaseCount: graph.phases.length,
      systems: processRun.systemsUsed ?? [],
      confidence: workflowRecord?.confidence ?? null,
      status: workflowRecord?.status ?? 'active',
      variantCount: graph.variants.length,
      totalRuns: 1,
      createdAt: workflowRecord?.createdAt ?? '',
      updatedAt: workflowRecord?.createdAt ?? '',
      frictionCount: graph.totalFriction,
      completionStatus: processRun.completionStatus ?? 'complete',
      errorStepCount: processRun.errorStepCount ?? 0,
    };

    // ── Build insights ───────────────────────────────────────────────────

    const insights: WorkflowInsight[] = frictionIndicators.map((f, i) => ({
      id: `friction-${i}`,
      label: f.label,
      severity: f.severity === 'high' ? 'critical' as const : f.severity === 'medium' ? 'warning' as const : 'info' as const,
      detail: f.label,
      affectedStepOrdinals: f.stepOrdinals,
    }));

    if (processRun.errorStepCount > 0) {
      insights.unshift({
        id: 'error-steps',
        label: `${processRun.errorStepCount} error step${processRun.errorStepCount !== 1 ? 's' : ''} detected`,
        severity: 'warning',
      });
    }

    const lowConfNodes = graph.nodes.filter(n => n.isLowConfidence && n.nodeType === 'task');
    if (lowConfNodes.length > 0) {
      insights.push({
        id: 'low-confidence',
        label: `${lowConfNodes.length} step${lowConfNodes.length !== 1 ? 's' : ''} with low confidence`,
        severity: 'info',
        affectedStepOrdinals: lowConfNodes.map(n => n.ordinal),
      });
    }

    if (graph.hasMultipleSystems && graph.totalHandoffs > 0) {
      insights.push({
        id: 'system-handoffs',
        label: `${graph.totalHandoffs} cross-system handoff${graph.totalHandoffs !== 1 ? 's' : ''}`,
        severity: 'info',
      });
    }

    // ── Build legend ─────────────────────────────────────────────────────

    const usedCategories = new Set(graph.nodes.map(n => n.category));
    const legendEntries: LegendEntry[] = [];
    for (const [key, style] of Object.entries(CATEGORY_STYLES)) {
      if (usedCategories.has(key)) {
        legendEntries.push({ color: style.color, label: style.label, shape: 'rounded-rect' });
      }
    }
    if (graph.hasDecisions) {
      legendEntries.push({ color: '#d97706', label: 'Decision Point', shape: 'diamond' });
    }
    if (graph.hasExceptions) {
      legendEntries.push({ color: '#dc2626', label: 'Exception Path', shape: 'rounded-rect' });
    }

    return {
      metadata,
      graph,
      insights,
      legendEntries,
      frictionIndicators,
      sop: sop ?? null,
    };
  }, [processOutput, workflowRecord]);
}
