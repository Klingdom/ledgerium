'use client';

import { X, Clock, Layers, Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import type {
  InspectorSelection,
  NodeInspectorData,
  EdgeInspectorData,
  SystemInspectorData,
  FrictionIndicator,
  StepDefinition,
  SOPStep,
  ProcessMapNode,
  ProcessMapEdge,
} from './types';
import { CATEGORY_STYLES, FRICTION_COLORS, confidenceColor } from './constants';
import { formatDuration } from '@/lib/format';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  selection: InspectorSelection;
  nodeData: NodeInspectorData | null;
  edgeData: EdgeInspectorData | null;
  systemData: SystemInspectorData | null;
  onClose: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowInspectorPanel({
  selection,
  nodeData,
  edgeData,
  systemData,
  onClose,
}: Props) {
  if (selection.type === 'none' || selection.id === null) {
    return <InspectorEmpty />;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface-elevated)] border-l border-[var(--border-default)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
        <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
          {selection.type === 'node' ? 'Step Detail' :
           selection.type === 'edge' ? 'Connection Detail' :
           selection.type === 'system' ? 'System Detail' :
           'Path Detail'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--content-tertiary)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selection.type === 'node' && nodeData && (
          <NodeInspector data={nodeData} />
        )}
        {selection.type === 'edge' && edgeData && (
          <EdgeInspector data={edgeData} />
        )}
        {selection.type === 'system' && systemData && (
          <SystemInspector data={systemData} />
        )}
        {!nodeData && !edgeData && !systemData && (
          <div className="p-4 text-ds-xs text-[var(--content-tertiary)] text-center mt-8">
            No data available for this selection.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function InspectorEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[var(--surface-elevated)] border-l border-[var(--border-default)] text-center px-6">
      <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center mb-3">
        <Layers className="h-5 w-5 text-[var(--content-tertiary)]" />
      </div>
      <p className="text-ds-xs font-medium text-[var(--content-secondary)] mb-1">Select a step to inspect</p>
      <p className="text-[10px] text-[var(--content-tertiary)] max-w-[200px]">
        Click any node on the canvas to view its details, events, and procedure.
      </p>
    </div>
  );
}

// ─── Node inspector ──────────────────────────────────────────────────────────

function NodeInspector({ data }: { data: NodeInspectorData }) {
  const { stepDef, sopStep, node, eventCount, humanEventCount, frictionIndicators } = data;
  const catStyle = CATEGORY_STYLES[stepDef.category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
  const confColors = confidenceColor(stepDef.confidence);

  return (
    <div className="p-4 space-y-4">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
          style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.color}30` }}
        >
          {stepDef.ordinal}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ds-sm font-semibold text-[var(--content-primary)] leading-tight">{stepDef.title}</p>
          <span
            className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: catStyle.color, background: `${catStyle.color}12` }}
          >
            {catStyle.label}
          </span>
        </div>
      </div>

      {/* Operational definition */}
      {stepDef.operationalDefinition && (
        <InspectorSection title="What This Step Does">
          <p className="text-ds-xs text-[var(--content-secondary)] leading-relaxed bg-[var(--surface-secondary)] rounded-lg p-3 border border-[var(--border-subtle)]">
            {stepDef.operationalDefinition}
          </p>
        </InspectorSection>
      )}

      {/* SOP Procedure */}
      {sopStep && sopStep.detail.trim().length > 0 && (
        <InspectorSection title="Procedure">
          <div className="bg-[var(--surface-secondary)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {sopStep.detail.split('\n').filter(Boolean).map((line, i, arr) => (
              <div
                key={i}
                className={`flex gap-2.5 px-3 py-2 text-ds-xs ${i < arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
              >
                <span className="text-[10px] font-bold text-[var(--content-tertiary)] min-w-[14px] tabular-nums">{i + 1}</span>
                <span className="text-[var(--content-primary)]">{line}</span>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}

      {/* Expected outcome */}
      {sopStep?.expectedOutcome && (
        <InspectorSection title="Expected Outcome">
          <p className="text-ds-xs text-[var(--content-secondary)]">{sopStep.expectedOutcome}</p>
        </InspectorSection>
      )}

      {/* Metrics */}
      <InspectorSection title="Metrics">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Duration" value={stepDef.durationLabel} />
          <MetricCard label="Events" value={`${eventCount} (${humanEventCount} user)`} />
          <MetricCard label="Confidence" value={`${Math.round(stepDef.confidence * 100)}%`} />
          {stepDef.systems.length > 0 && (
            <MetricCard label="System" value={stepDef.systems.join(', ')} />
          )}
        </div>
      </InspectorSection>

      {/* Confidence bar */}
      <InspectorSection title="Confidence">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round(stepDef.confidence * 100)}%`, background: confColors.text }}
            />
          </div>
          <span className="text-[11px] font-semibold min-w-[32px] text-right" style={{ color: confColors.text }}>
            {Math.round(stepDef.confidence * 100)}%
          </span>
        </div>
      </InspectorSection>

      {/* Friction indicators */}
      {frictionIndicators.length > 0 && (
        <InspectorSection title="Friction Points">
          <div className="space-y-1.5">
            {frictionIndicators.map((f, i) => {
              const fc = FRICTION_COLORS[f.severity] ?? FRICTION_COLORS['low']!;
              if (!fc) return null;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg text-ds-xs"
                  style={{ background: fc.bg, border: `1px solid ${fc.border}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: fc.dot }} />
                  <span style={{ color: fc.text }}>{f.label}</span>
                </div>
              );
            })}
          </div>
        </InspectorSection>
      )}

      {/* Warnings */}
      {sopStep && sopStep.warnings.length > 0 && (
        <InspectorSection title="Privacy Notes">
          {sopStep.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-ds-xs text-amber-800 mb-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>{w}</span>
            </div>
          ))}
        </InspectorSection>
      )}
    </div>
  );
}

// ─── Edge inspector ──────────────────────────────────────────────────────────

function EdgeInspector({ data }: { data: EdgeInspectorData }) {
  const { edge, sourceNode, targetNode } = data;
  return (
    <div className="p-4 space-y-4">
      <InspectorSection title="Connection">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ds-xs">
            <span className="font-medium text-[var(--content-primary)]">{sourceNode.title}</span>
            <span className="text-[var(--content-tertiary)]">→</span>
            <span className="font-medium text-[var(--content-primary)]">{targetNode.title}</span>
          </div>
          {edge.boundaryLabel && (
            <p className="text-[10px] text-[var(--content-secondary)] bg-[var(--surface-secondary)] rounded px-2 py-1">
              Transition: {edge.boundaryLabel}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              edge.type === 'exception' ? 'text-red-700 bg-red-50' : 'text-[var(--content-secondary)] bg-[var(--surface-secondary)]'
            }`}>
              {edge.type}
            </span>
          </div>
        </div>
      </InspectorSection>
    </div>
  );
}

// ─── System inspector ────────────────────────────────────────────────────────

function SystemInspector({ data }: { data: SystemInspectorData }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{data.system}</p>
        <p className="text-[10px] text-[var(--content-secondary)] mt-0.5">{data.phase.name}</p>
      </div>

      <InspectorSection title="Activity">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Steps" value={String(data.stepCount)} />
          <MetricCard label="Duration" value={formatDuration(data.totalDurationMs)} />
        </div>
      </InspectorSection>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-secondary)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]">
      <p className="text-[9px] text-[var(--content-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-ds-xs font-semibold text-[var(--content-primary)] mt-0.5">{value}</p>
    </div>
  );
}
